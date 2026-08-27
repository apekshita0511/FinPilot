import { Prisma, type Account } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import { isUniqueViolation } from '../lib/prismaErrors';
import type { CreateAccountInput, UpdateAccountInput } from '../validation/account.validation';

const ZERO = new Prisma.Decimal(0);

type AccountRow = Account;

/**
 * Account balance is not stored — it is always derived from the ledger:
 * opening balance + every INCOME - every EXPENSE. `withBalance` sums the
 * transactions for one account; `withBalances` does it for a whole list in
 * a single grouped query.
 */
async function withBalances(userId: string, accounts: AccountRow[]) {
  if (accounts.length === 0) return [];

  const grouped = await prisma.transaction.groupBy({
    by: ['accountId', 'type'],
    where: { userId, accountId: { in: accounts.map((a) => a.id) } },
    _sum: { amount: true },
  });

  const deltaByAccount = new Map<string, Prisma.Decimal>();
  for (const g of grouped) {
    const amount = g._sum.amount ?? ZERO;
    const signed = g.type === 'INCOME' ? amount : amount.negated();
    deltaByAccount.set(g.accountId, (deltaByAccount.get(g.accountId) ?? ZERO).plus(signed));
  }

  return accounts.map((a) => ({
    ...a,
    balance: a.openingBalance.plus(deltaByAccount.get(a.id) ?? ZERO),
  }));
}

async function withBalance(userId: string, account: AccountRow) {
  const [withBal] = await withBalances(userId, [account]);
  return withBal;
}

export async function listAccounts(userId: string) {
  const accounts = await prisma.account.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  return withBalances(userId, accounts);
}

export async function getAccount(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }
  return withBalance(userId, account);
}

export async function createAccount(userId: string, input: CreateAccountInput) {
  try {
    const account = await prisma.account.create({
      data: {
        userId,
        name: input.name,
        accountType: input.accountType,
        openingBalance: input.openingBalance,
      },
    });
    // No transactions yet, so the balance is just the opening balance.
    return { ...account, balance: account.openingBalance };
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, 'An account with this name already exists');
    }
    throw err;
  }
}

export async function updateAccount(userId: string, accountId: string, input: UpdateAccountInput) {
  const existing = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!existing) {
    throw new ApiError(404, 'Account not found');
  }

  try {
    const account = await prisma.account.update({ where: { id: accountId }, data: input });
    return withBalance(userId, account);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, 'An account with this name already exists');
    }
    throw err;
  }
}

// "Delete" is a soft archive — hard-deleting an account would take its whole
// transaction history with it.
export async function archiveAccount(userId: string, accountId: string) {
  const existing = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!existing) {
    throw new ApiError(404, 'Account not found');
  }

  const account = await prisma.account.update({ where: { id: accountId }, data: { isActive: false } });
  return withBalance(userId, account);
}
