import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import { isUniqueViolation } from '../lib/prismaErrors';
import { recordAudit } from './audit.service';
import type { CreateAccountInput, UpdateAccountInput } from '../validation/account.validation';

export async function listAccounts(userId: string) {
  return prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getAccount(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }
  return account;
}

export async function createAccount(userId: string, input: CreateAccountInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          userId,
          name: input.name,
          accountType: input.accountType,
          currency: input.currency,
          openingBalance: input.openingBalance,
          currentBalance: input.openingBalance,
        },
      });

      await recordAudit(tx, {
        userId,
        action: 'ACCOUNT_CREATED',
        entityType: 'Account',
        entityId: account.id,
        metadata: { name: account.name, accountType: account.accountType, openingBalance: input.openingBalance },
      });

      return account;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, 'An account with this name already exists');
    }
    throw err;
  }
}

export async function updateAccount(userId: string, accountId: string, input: UpdateAccountInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.account.findFirst({ where: { id: accountId, userId } });
      if (!existing) {
        throw new ApiError(404, 'Account not found');
      }

      const account = await tx.account.update({
        where: { id: accountId },
        data: input,
      });

      await recordAudit(tx, {
        userId,
        action: 'ACCOUNT_UPDATED',
        entityType: 'Account',
        entityId: account.id,
        metadata: { before: existing, changes: input },
      });

      return account;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, 'An account with this name already exists');
    }
    throw err;
  }
}

// "Delete" is a soft archive — hard-deleting an account would orphan the
// transaction history that references it (see FinPilot Phase 1 design).
export async function archiveAccount(userId: string, accountId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.account.findFirst({ where: { id: accountId, userId } });
    if (!existing) {
      throw new ApiError(404, 'Account not found');
    }

    const account = await tx.account.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    await recordAudit(tx, {
      userId,
      action: 'ACCOUNT_ARCHIVED',
      entityType: 'Account',
      entityId: account.id,
    });

    return account;
  });
}
