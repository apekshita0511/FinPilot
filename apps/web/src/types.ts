import type { AccountType, CategoryType, TransactionType, TransactionSource } from '@finpilot/shared';

export type { AccountType, CategoryType, TransactionType, TransactionSource };

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
  currency: string;
  openingBalance: string;
  currentBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  color: string | null;
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
  source: TransactionSource;
  externalReference: string | null;
  fingerprint: string | null;
  transferId: string | null;
  importBatchId: string | null;
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

export interface Transfer {
  id: string;
  userId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  description: string | null;
  createdAt: string;
  sourceAccount?: { id: string; name: string };
  destinationAccount?: { id: string; name: string };
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

export interface ImportBatch {
  id: string;
  userId: string;
  accountId: string;
  filename: string;
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  failedRows: number;
  status: 'COMPLETED' | 'FAILED';
  createdAt: string;
  account?: { id: string; name: string };
}

export interface CsvRowError {
  row: number;
  error: string;
}

export interface ImportResult {
  importBatch: ImportBatch;
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  failedRows: number;
  errors: CsvRowError[];
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
  color: string | null;
  total: string;
}

export interface MonthlyTrendPoint {
  year: number;
  month: number;
  income: string;
  expenses: string;
  netCashFlow: string;
}
