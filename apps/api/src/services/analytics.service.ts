import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { monthRange, resolveMonth } from '../lib/dateRange';
import { listBudgets } from './budget.service';
import type { MonthlyTrendQuery, MonthQuery } from '../validation/analytics.validation';

const ZERO = new Prisma.Decimal(0);

export async function getSummary(userId: string, query: MonthQuery) {
  const { year, month } = resolveMonth(query);
  const { from, to } = monthRange(year, month);

  const [balanceResult, incomeResult, expenseResult] = await Promise.all([
    prisma.account.aggregate({ where: { userId }, _sum: { currentBalance: true } }),
    prisma.transaction.aggregate({
      where: { userId, type: 'INCOME', transactionDate: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE', transactionDate: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
  ]);

  const totalBalance = balanceResult._sum.currentBalance ?? ZERO;
  const income = incomeResult._sum.amount ?? ZERO;
  const expenses = expenseResult._sum.amount ?? ZERO;

  return {
    year,
    month,
    totalBalance,
    income,
    expenses,
    netCashFlow: income.minus(expenses),
  };
}

export async function getSpendingByCategory(userId: string, query: MonthQuery) {
  const { year, month } = resolveMonth(query);
  const { from, to } = monthRange(year, month);

  const grouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { userId, type: 'EXPENSE', transactionDate: { gte: from, lt: to } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const categoryIds = grouped.map((g) => g.categoryId).filter((id): id is string => id !== null);
  const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return {
    year,
    month,
    categories: grouped.map((g) => ({
      categoryId: g.categoryId,
      categoryName: g.categoryId ? (categoryById.get(g.categoryId)?.name ?? 'Unknown') : 'Uncategorized',
      color: g.categoryId ? (categoryById.get(g.categoryId)?.color ?? null) : null,
      total: g._sum.amount ?? ZERO,
    })),
  };
}

interface MonthlyTrendRow {
  year: number;
  month: number;
  income: Prisma.Decimal;
  expenses: Prisma.Decimal;
}

export async function getMonthlyTrend(userId: string, query: MonthlyTrendQuery) {
  const now = new Date();
  // First day of the month `months - 1` months ago, so the range includes
  // the current month plus the preceding (months - 1) months.
  const startOfRange = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (query.months - 1), 1));

  const rows = await prisma.$queryRaw<MonthlyTrendRow[]>`
    SELECT
      EXTRACT(YEAR FROM transaction_date)::int AS year,
      EXTRACT(MONTH FROM transaction_date)::int AS month,
      COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0) AS income,
      COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) AS expenses
    FROM transactions
    WHERE user_id = ${userId}
      AND type IN ('INCOME', 'EXPENSE')
      AND transaction_date >= ${startOfRange}
    GROUP BY year, month
    ORDER BY year, month
  `;

  const byKey = new Map(rows.map((r) => [`${r.year}-${r.month}`, r]));

  // The query only produces rows for months that had at least one
  // transaction — fill in the requested range so months with zero activity
  // still appear (a real cash-flow chart shouldn't silently skip them).
  const trend = [];
  for (let i = query.months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const row = byKey.get(`${year}-${month}`);
    const income = row ? new Prisma.Decimal(row.income) : ZERO;
    const expenses = row ? new Prisma.Decimal(row.expenses) : ZERO;
    trend.push({ year, month, income, expenses, netCashFlow: income.minus(expenses) });
  }

  return { trend };
}

export async function getBudgetUtilization(userId: string, query: MonthQuery) {
  const { year, month } = resolveMonth(query);
  const budgets = await listBudgets(userId, { year, month });
  return { year, month, budgets };
}
