import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import { adjustAccountBalance, lockAccount } from './balance.service';
import { recordAudit } from './audit.service';
import type { CreateTransferInput } from '../validation/transfer.validation';

/**
 * See FinPilot Phase 5 design + `concurrentTransfer.test.ts`.
 *
 * The naive version of this function (see the "test: reproduce concurrent
 * transfer race" commit) read each account's balance, checked it in
 * application code, and wrote back a balance computed from that read —
 * with no lock between the read and the write. Two concurrent transfers
 * could both read the pre-transfer balance, both pass the sufficient-funds
 * check, and both commit: a lost update.
 *
 * This version fixes it with pessimistic row locking: `SELECT ... FOR
 * UPDATE` on both accounts, in a fixed order, before anything is read or
 * written. A second concurrent transfer against the same account simply
 * blocks at the lock until the first transaction commits or rolls back —
 * by the time it acquires the lock and re-reads the balance, it sees the
 * first transfer's effect and correctly fails the funds check if it can no
 * longer be satisfied.
 */
export async function createTransfer(userId: string, input: CreateTransferInput) {
  if (input.sourceAccountId === input.destinationAccountId) {
    throw new ApiError(422, 'Source and destination accounts must be different');
  }

  const source = await prisma.account.findFirst({ where: { id: input.sourceAccountId, userId } });
  if (!source) {
    throw new ApiError(404, 'Source account not found');
  }

  const destination = await prisma.account.findFirst({ where: { id: input.destinationAccountId, userId } });
  if (!destination) {
    throw new ApiError(404, 'Destination account not found');
  }

  const amount = new Prisma.Decimal(input.amount);

  return prisma.$transaction(async (tx) => {
    // Lock both account rows in a fixed order (ascending id), regardless
    // of which is source and which is destination. Without this, a
    // concurrent transfer in the opposite direction (B -> A while this one
    // does A -> B) could deadlock: each transaction would hold one lock
    // and wait forever for the other.
    const [firstId, secondId] = [input.sourceAccountId, input.destinationAccountId].sort();
    await lockAccount(tx, firstId);
    await lockAccount(tx, secondId);

    // Re-read the now-locked balance. Any other transaction that touched
    // this row has already committed or rolled back by the time our lock
    // was granted, so this reflects reality, not a stale snapshot.
    const lockedSource = await tx.account.findUniqueOrThrow({ where: { id: input.sourceAccountId } });
    if (lockedSource.currentBalance.lessThan(amount)) {
      throw new ApiError(409, 'Insufficient balance');
    }

    const transfer = await tx.transfer.create({
      data: {
        userId,
        sourceAccountId: input.sourceAccountId,
        destinationAccountId: input.destinationAccountId,
        amount,
        description: input.description,
      },
    });

    const now = new Date();

    await tx.transaction.create({
      data: {
        userId,
        accountId: input.sourceAccountId,
        type: 'TRANSFER_OUT',
        amount,
        description: input.description ?? `Transfer to ${destination.name}`,
        transactionDate: now,
        source: 'MANUAL',
        transferId: transfer.id,
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        accountId: input.destinationAccountId,
        type: 'TRANSFER_IN',
        amount,
        description: input.description ?? `Transfer from ${source.name}`,
        transactionDate: now,
        source: 'MANUAL',
        transferId: transfer.id,
      },
    });

    // Rows are already locked above; these just compute and write the new
    // balances relative to the locked (accurate) values.
    await adjustAccountBalance(tx, input.sourceAccountId, amount.negated());
    await adjustAccountBalance(tx, input.destinationAccountId, amount);

    await recordAudit(tx, {
      userId,
      action: 'TRANSFER_CREATED',
      entityType: 'Transfer',
      entityId: transfer.id,
      metadata: { sourceAccountId: source.id, destinationAccountId: destination.id, amount: input.amount },
    });

    return transfer;
  });
}

export async function listTransfers(userId: string) {
  return prisma.transfer.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      sourceAccount: { select: { id: true, name: true } },
      destinationAccount: { select: { id: true, name: true } },
    },
  });
}

export async function getTransfer(userId: string, transferId: string) {
  const transfer = await prisma.transfer.findFirst({
    where: { id: transferId, userId },
    include: {
      sourceAccount: { select: { id: true, name: true } },
      destinationAccount: { select: { id: true, name: true } },
    },
  });
  if (!transfer) {
    throw new ApiError(404, 'Transfer not found');
  }
  return transfer;
}
