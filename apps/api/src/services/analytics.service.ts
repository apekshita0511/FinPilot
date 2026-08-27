import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { monthRange, resolveMonth } from '../lib/dateRange';
import type { MonthQuery } from '../validation/analytics.validation';

const ZERO = new Prisma.Decimal(0);

export async function getSummary(userId: string, query: MonthQuery) {
  const { year, month } = resolveMonth(query);
  const { from, to } = monthRange(year, month);

  const [openingBalances, allIncome, allExpense, monthIncome, monthExpense] = await Promise.all([
    prisma.account.aggregate({ where: { userId }, _sum: { openingBalance: true } }),
    prisma.transaction.aggregate({ where: { userId, type: 'INCOME' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { userId, type: 'EXPENSE' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({
      where: { userId, type: 'INCOME', transactionDate: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE', transactionDate: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
  ]);

  const totalBalance = (openingBalances._sum.openingBalance ?? ZERO)
    .plus(allIncome._sum.amount ?? ZERO)
    .minus(allExpense._sum.amount ?? ZERO);

  const income = monthIncome._sum.amount ?? ZERO;
  const expenses = monthExpense._sum.amount ?? ZERO;

  return { year, month, totalBalance, income, expenses, netCashFlow: income.minus(expenses) };
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
      total: g._sum.amount ?? ZERO,
    })),
  };
}
