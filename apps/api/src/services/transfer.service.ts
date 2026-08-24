import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import { recordAudit } from './audit.service';
import type { CreateTransferInput } from '../validation/transfer.validation';

/**
 * NAIVE, INTENTIONALLY UNSAFE first pass — see FinPilot Phase 5 design.
 *
 * This reads each account's balance, checks it in application code, and
 * writes back a balance computed from that (by-then possibly stale) read.
 * There is no row lock between the read and the write, so two concurrent
 * transfers debiting the same account can both read the pre-transfer
 * balance, both pass the sufficient-funds check, and both write — losing
 * one of the two debits. This is the classic "lost update" race condition.
 *
 * `concurrentTransfer.test.ts` proves this fails before the fix lands in
 * the next commit ("feat: make transfers atomic"), which replaces the body
 * of this function with a locked version built on `balanceService`.
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

  // Unlocked read — a concurrent request can read the same value before
  // either one writes.
  if (source.currentBalance.lessThan(input.amount)) {
    throw new ApiError(409, 'Insufficient balance');
  }

  return prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.create({
      data: {
        userId,
        sourceAccountId: input.sourceAccountId,
        destinationAccountId: input.destinationAccountId,
        amount: input.amount,
        description: input.description,
      },
    });

    const now = new Date();

    await tx.transaction.create({
      data: {
        userId,
        accountId: input.sourceAccountId,
        type: 'TRANSFER_OUT',
        amount: input.amount,
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
        amount: input.amount,
        description: input.description ?? `Transfer from ${source.name}`,
        transactionDate: now,
        source: 'MANUAL',
        transferId: transfer.id,
      },
    });

    // Computed from the stale reads above, not from a locked re-read —
    // this is the bug.
    await tx.account.update({
      where: { id: source.id },
      data: { currentBalance: source.currentBalance.minus(input.amount) },
    });
    await tx.account.update({
      where: { id: destination.id },
      data: { currentBalance: destination.currentBalance.plus(input.amount) },
    });

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
