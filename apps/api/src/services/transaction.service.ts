import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import { adjustAccountBalance } from './balance.service';
import { recordAudit } from './audit.service';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from '../validation/transaction.validation';

const SORT_MAP: Record<ListTransactionsQuery['sort'], Prisma.TransactionOrderByWithRelationInput[]> = {
  date_desc: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
  date_asc: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
  amount_desc: [{ amount: 'desc' }],
  amount_asc: [{ amount: 'asc' }],
};

// Direction is expressed via `type`, never the sign of the stored amount.
function signedDelta(type: 'INCOME' | 'EXPENSE', amount: Prisma.Decimal.Value): Prisma.Decimal {
  const decimalAmount = new Prisma.Decimal(amount);
  return type === 'INCOME' ? decimalAmount : decimalAmount.negated();
}

export async function listTransactions(userId: string, query: ListTransactionsQuery) {
  const where: Prisma.TransactionWhereInput = {
    userId,
    ...(query.accountId && { accountId: query.accountId }),
    ...(query.categoryId && { categoryId: query.categoryId }),
    ...(query.type && { type: query.type }),
    ...(query.search && { description: { contains: query.search, mode: 'insensitive' } }),
  };

  if (query.from || query.to) {
    where.transactionDate = {
      ...(query.from && { gte: new Date(query.from) }),
      ...(query.to && { lte: new Date(query.to) }),
    };
  }

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    where.amount = {
      ...(query.minAmount !== undefined && { gte: query.minAmount }),
      ...(query.maxAmount !== undefined && { lte: query.maxAmount }),
    };
  }

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: SORT_MAP[query.sort],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { category: true, account: { select: { id: true, name: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function getTransaction(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    include: { category: true, account: { select: { id: true, name: true } } },
  });
  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }
  return transaction;
}

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  const account = await prisma.account.findFirst({ where: { id: input.accountId, userId } });
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }

  if (input.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: input.categoryId, userId } });
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
    if (category.type !== input.type) {
      throw new ApiError(422, `Category "${category.name}" is a ${category.type} category and cannot be used on a ${input.type} transaction`);
    }
  }

  return prisma.$transaction(async (tx) => {
    await adjustAccountBalance(tx, input.accountId, signedDelta(input.type, input.amount));

    const transaction = await tx.transaction.create({
      data: {
        userId,
        accountId: input.accountId,
        categoryId: input.categoryId,
        type: input.type,
        amount: input.amount,
        description: input.description,
        transactionDate: new Date(input.transactionDate),
        source: 'MANUAL',
      },
    });

    await recordAudit(tx, {
      userId,
      action: 'TRANSACTION_CREATED',
      entityType: 'Transaction',
      entityId: transaction.id,
      metadata: { accountId: input.accountId, type: input.type, amount: input.amount },
    });

    return transaction;
  });
}

export async function updateTransaction(userId: string, transactionId: string, input: UpdateTransactionInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({ where: { id: transactionId, userId } });
    if (!existing) {
      throw new ApiError(404, 'Transaction not found');
    }
    if (existing.type === 'TRANSFER_IN' || existing.type === 'TRANSFER_OUT') {
      throw new ApiError(409, 'Transfer-generated transactions cannot be edited directly');
    }

    const newType = input.type ?? (existing.type as 'INCOME' | 'EXPENSE');
    const newAmount = input.amount ?? existing.amount;

    if (input.categoryId) {
      const category = await tx.category.findFirst({ where: { id: input.categoryId, userId } });
      if (!category) {
        throw new ApiError(404, 'Category not found');
      }
      if (category.type !== newType) {
        throw new ApiError(422, `Category "${category.name}" is a ${category.type} category and cannot be used on a ${newType} transaction`);
      }
    }

    const oldDelta = signedDelta(existing.type as 'INCOME' | 'EXPENSE', existing.amount);
    const newDelta = signedDelta(newType, newAmount);
    const netDelta = newDelta.minus(oldDelta);

    if (!netDelta.isZero()) {
      await adjustAccountBalance(tx, existing.accountId, netDelta);
    }

    const transaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.transactionDate !== undefined && { transactionDate: new Date(input.transactionDate) }),
      },
    });

    await recordAudit(tx, {
      userId,
      action: 'TRANSACTION_UPDATED',
      entityType: 'Transaction',
      entityId: transaction.id,
      metadata: { before: { type: existing.type, amount: existing.amount }, changes: input },
    });

    return transaction;
  });
}

export async function deleteTransaction(userId: string, transactionId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({ where: { id: transactionId, userId } });
    if (!existing) {
      throw new ApiError(404, 'Transaction not found');
    }
    if (existing.type === 'TRANSFER_IN' || existing.type === 'TRANSFER_OUT') {
      throw new ApiError(409, 'Transfer-generated transactions cannot be deleted directly');
    }

    const reversal = signedDelta(existing.type as 'INCOME' | 'EXPENSE', existing.amount).negated();
    await adjustAccountBalance(tx, existing.accountId, reversal);

    await tx.transaction.delete({ where: { id: transactionId } });

    await recordAudit(tx, {
      userId,
      action: 'TRANSACTION_DELETED',
      entityType: 'Transaction',
      entityId: transactionId,
      metadata: { accountId: existing.accountId, type: existing.type, amount: existing.amount },
    });
  });
}
