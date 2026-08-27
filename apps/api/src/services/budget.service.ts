import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import { isUniqueViolation } from '../lib/prismaErrors';
import { monthRange } from '../lib/dateRange';
import type { CreateBudgetInput, ListBudgetsQuery, UpdateBudgetInput } from '../validation/budget.validation';

const ZERO = new Prisma.Decimal(0);

// Spending is summed from the transaction ledger every time a budget is
// read, never stored on the budget row.
async function computeSpent(userId: string, categoryId: string, year: number, month: number) {
  const { from, to } = monthRange(year, month);
  const result = await prisma.transaction.aggregate({
    where: { userId, categoryId, type: 'EXPENSE', transactionDate: { gte: from, lt: to } },
    _sum: { amount: true },
  });
  return result._sum.amount ?? ZERO;
}

function withStatus<T extends { limitAmount: Prisma.Decimal }>(budget: T, spent: Prisma.Decimal) {
  const remaining = budget.limitAmount.minus(spent);
  const percentUsed = Number(spent.dividedBy(budget.limitAmount).times(100).toFixed(1));
  return { ...budget, spent, remaining, percentUsed };
}

export async function listBudgets(userId: string, query: ListBudgetsQuery) {
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      ...(query.year !== undefined && { year: query.year }),
      ...(query.month !== undefined && { month: query.month }),
    },
    include: { category: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  return Promise.all(
    budgets.map(async (budget) => withStatus(budget, await computeSpent(userId, budget.categoryId, budget.year, budget.month))),
  );
}

export async function getBudget(userId: string, budgetId: string) {
  const budget = await prisma.budget.findFirst({ where: { id: budgetId, userId }, include: { category: true } });
  if (!budget) {
    throw new ApiError(404, 'Budget not found');
  }
  const spent = await computeSpent(userId, budget.categoryId, budget.year, budget.month);
  return withStatus(budget, spent);
}

export async function createBudget(userId: string, input: CreateBudgetInput) {
  const category = await prisma.category.findFirst({ where: { id: input.categoryId, userId } });
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }
  if (category.type !== 'EXPENSE') {
    throw new ApiError(422, 'Budgets can only be created for expense categories');
  }

  try {
    return await prisma.budget.create({
      data: {
        userId,
        categoryId: input.categoryId,
        year: input.year,
        month: input.month,
        limitAmount: input.limitAmount,
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, 'A budget already exists for this category and month');
    }
    throw err;
  }
}

export async function updateBudget(userId: string, budgetId: string, input: UpdateBudgetInput) {
  const existing = await prisma.budget.findFirst({ where: { id: budgetId, userId } });
  if (!existing) {
    throw new ApiError(404, 'Budget not found');
  }

  return prisma.budget.update({
    where: { id: budgetId },
    data: { limitAmount: input.limitAmount },
  });
}

export async function deleteBudget(userId: string, budgetId: string) {
  const existing = await prisma.budget.findFirst({ where: { id: budgetId, userId } });
  if (!existing) {
    throw new ApiError(404, 'Budget not found');
  }
  await prisma.budget.delete({ where: { id: budgetId } });
}
