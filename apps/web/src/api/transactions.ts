import { apiFetch } from './client';
import type { Pagination, Transaction, TransactionType } from '../types';

export interface TransactionFilters {
  [key: string]: unknown;
  page?: number;
  pageSize?: number;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
  search?: string;
  sort?: 'date_asc' | 'date_desc';
}

export function listTransactions(filters: TransactionFilters = {}) {
  return apiFetch<{ data: Transaction[]; pagination: Pagination }>('/transactions', { query: filters });
}

export function createTransaction(input: {
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
}) {
  return apiFetch<{ transaction: Transaction }>('/transactions', { method: 'POST', body: input });
}

export function updateTransaction(
  id: string,
  input: Partial<{
    categoryId: string | null;
    type: TransactionType;
    amount: number;
    description: string;
    transactionDate: string;
  }>,
) {
  return apiFetch<{ transaction: Transaction }>(`/transactions/${id}`, { method: 'PATCH', body: input });
}

export function deleteTransaction(id: string) {
  return apiFetch<void>(`/transactions/${id}`, { method: 'DELETE' });
}
