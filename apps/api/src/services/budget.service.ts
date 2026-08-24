import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import { isUniqueViolation } from '../lib/prismaErrors';
import { recordAudit } from './audit.service';
import type { CreateBudgetInput, ListBudgetsQuery, UpdateBudgetInput } from '../validation/budget.validation';

function monthRange(year: number, month: number) {
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 1)),
  };
}

// Spending is always derived from the transaction ledger at query time,
// never stored on the Budget row (see FinPilot Phase 1 design) — a budget
// view is a low-frequency read, so the aggregate cost here is not the hot
// path the transaction-listing indexes were built for.
async function computeSpent(userId: string, categoryId: string, year: number, month: number) {
  const { from, to } = monthRange(year, month);
  const result = await prisma.transaction.aggregate({
    where: { userId, categoryId, type: 'EXPENSE', transactionDate: { gte: from, lt: to } },
    _sum: { amount: true },
  });
  return result._sum.amount ?? new Prisma.Decimal(0);
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
    budgets.map(async (budget) => {
      const spent = await computeSpent(userId, budget.categoryId, budget.year, budget.month);
      return withStatus(budget, spent);
    }),
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
    return await prisma.$transaction(async (tx) => {
      const budget = await tx.budget.create({
        data: {
          userId,
          categoryId: input.categoryId,
          year: input.year,
          month: input.month,
          limitAmount: input.limitAmount,
        },
      });

      await recordAudit(tx, {
        userId,
        action: 'BUDGET_CREATED',
        entityType: 'Budget',
        entityId: budget.id,
        metadata: { categoryId: input.categoryId, year: input.year, month: input.month, limitAmount: input.limitAmount },
      });

      return budget;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, 'A budget already exists for this category and month');
    }
    throw err;
  }
}

export async function updateBudget(userId: string, budgetId: string, input: UpdateBudgetInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.budget.findFirst({ where: { id: budgetId, userId } });
    if (!existing) {
      throw new ApiError(404, 'Budget not found');
    }

    const budget = await tx.budget.update({
      where: { id: budgetId },
      data: { limitAmount: input.limitAmount },
    });

    await recordAudit(tx, {
      userId,
      action: 'BUDGET_UPDATED',
      entityType: 'Budget',
      entityId: budget.id,
      metadata: { before: { limitAmount: existing.limitAmount }, after: { limitAmount: input.limitAmount } },
    });

    return budget;
  });
}

export async function deleteBudget(userId: string, budgetId: string) {
  const existing = await prisma.budget.findFirst({ where: { id: budgetId, userId } });
  if (!existing) {
    throw new ApiError(404, 'Budget not found');
  }
  await prisma.budget.delete({ where: { id: budgetId } });
}
