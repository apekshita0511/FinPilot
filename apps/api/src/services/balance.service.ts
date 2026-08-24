import { Prisma } from '@prisma/client';

import { ApiError } from '../middleware/errorHandler';

type Db = Prisma.TransactionClient;

/**
 * Locks a single account row for the duration of the enclosing DB
 * transaction (Postgres `SELECT ... FOR UPDATE`). Must only be called
 * inside `prisma.$transaction(...)` — the lock is released on commit/rollback.
 */
export async function lockAccount(tx: Db, accountId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; current_balance: Prisma.Decimal }>>`
    SELECT id, current_balance FROM accounts WHERE id = ${accountId} FOR UPDATE
  `;
  return rows[0];
}

/**
 * The single place in the codebase that mutates Account.currentBalance.
 * Locks the account row first so concurrent adjustments to the same
 * account (two transfers, an edit racing a transfer, etc.) serialize
 * instead of racing on a stale read.
 */
export async function adjustAccountBalance(tx: Db, accountId: string, delta: Prisma.Decimal.Value) {
  const locked = await lockAccount(tx, accountId);

  if (!locked) {
    throw new ApiError(404, 'Account not found');
  }

  const newBalance = new Prisma.Decimal(locked.current_balance).plus(delta);

  await tx.account.update({
    where: { id: accountId },
    data: { currentBalance: newBalance },
  });

  return newBalance;
}
