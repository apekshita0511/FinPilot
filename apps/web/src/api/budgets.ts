import { apiFetch } from './client';
import type { Budget } from '../types';

export function listBudgets(filters: { year?: number; month?: number } = {}) {
  return apiFetch<{ budgets: Budget[] }>('/budgets', { query: filters });
}

export function createBudget(input: { categoryId: string; year: number; month: number; limitAmount: number }) {
  return apiFetch<{ budget: Budget }>('/budgets', { method: 'POST', body: input });
}

export function updateBudget(id: string, input: { limitAmount: number }) {
  return apiFetch<{ budget: Budget }>(`/budgets/${id}`, { method: 'PATCH', body: input });
}

export function deleteBudget(id: string) {
  return apiFetch<void>(`/budgets/${id}`, { method: 'DELETE' });
}
