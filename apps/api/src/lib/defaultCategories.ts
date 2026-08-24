import type { CategoryType } from '@prisma/client';

export const DEFAULT_CATEGORIES: Array<{ name: string; type: CategoryType }> = [
  { name: 'Salary', type: 'INCOME' },
  { name: 'Other Income', type: 'INCOME' },
  { name: 'Food', type: 'EXPENSE' },
  { name: 'Travel', type: 'EXPENSE' },
  { name: 'Shopping', type: 'EXPENSE' },
  { name: 'Rent', type: 'EXPENSE' },
  { name: 'Utilities', type: 'EXPENSE' },
  { name: 'Education', type: 'EXPENSE' },
  { name: 'Entertainment', type: 'EXPENSE' },
  { name: 'Other', type: 'EXPENSE' },
];
