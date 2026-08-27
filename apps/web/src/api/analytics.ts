import { apiFetch } from './client';
import type { AnalyticsSummary, CategorySpending } from '../types';

export function getSummary(query: { year?: number; month?: number } = {}) {
  return apiFetch<AnalyticsSummary>('/analytics/summary', { query });
}

export function getSpendingByCategory(query: { year?: number; month?: number } = {}) {
  return apiFetch<{ year: number; month: number; categories: CategorySpending[] }>('/analytics/spending-by-category', {
    query,
  });
}
