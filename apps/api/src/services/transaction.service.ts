import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from '../validation/transaction.validation';

const SORT_MAP: Record<ListTransactionsQuery['sort'], Prisma.TransactionOrderByWithRelationInput[]> = {
  date_desc: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
  date_asc: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
};

async function assertAccountOwned(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }
}

async function assertCategoryValid(userId: string, categoryId: string, type: 'INCOME' | 'EXPENSE') {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }
  if (category.type !== type) {
    throw new ApiError(
      422,
      `Category "${category.name}" is a ${category.type} category and cannot be used on a ${type} transaction`,
    );
  }
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
  await assertAccountOwned(userId, input.accountId);
  if (input.categoryId) {
    await assertCategoryValid(userId, input.categoryId, input.type);
  }

  return prisma.transaction.create({
    data: {
      userId,
      accountId: input.accountId,
      categoryId: input.categoryId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      transactionDate: new Date(input.transactionDate),
    },
  });
}

export async function updateTransaction(userId: string, transactionId: string, input: UpdateTransactionInput) {
  const existing = await prisma.transaction.findFirst({ where: { id: transactionId, userId } });
  if (!existing) {
    throw new ApiError(404, 'Transaction not found');
  }

  const newType = input.type ?? existing.type;
  if (input.categoryId) {
    await assertCategoryValid(userId, input.categoryId, newType);
  }

  return prisma.transaction.update({
    where: { id: transactionId },
    data: {
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.transactionDate !== undefined && { transactionDate: new Date(input.transactionDate) }),
    },
  });
}

export async function deleteTransaction(userId: string, transactionId: string) {
  const existing = await prisma.transaction.findFirst({ where: { id: transactionId, userId } });
  if (!existing) {
    throw new ApiError(404, 'Transaction not found');
  }
  await prisma.transaction.delete({ where: { id: transactionId } });
}
