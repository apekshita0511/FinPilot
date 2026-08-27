import type { AccountType, CategoryType, TransactionType } from '@finpilot/shared';

export type { AccountType, CategoryType, TransactionType };

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  accountType: AccountType;
  openingBalance: string;
  /** Derived by the API: openingBalance + income - expenses. */
  balance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: string;
  description: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  category?: Category | null;
  account?: { id: string; name: string };
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  year: number;
  month: number;
  limitAmount: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  spent: string;
  remaining: string;
  percentUsed: number;
}

export interface AnalyticsSummary {
  year: number;
  month: number;
  totalBalance: string;
  income: string;
  expenses: string;
  netCashFlow: string;
}

export interface CategorySpending {
  categoryId: string | null;
  categoryName: string;
  total: string;
}
