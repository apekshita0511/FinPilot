import { apiFetch } from './client';
import type { AnalyticsSummary, Budget, CategorySpending, MonthlyTrendPoint } from '../types';

export function getSummary(query: { year?: number; month?: number } = {}) {
  return apiFetch<AnalyticsSummary>('/analytics/summary', { query });
}

export function getSpendingByCategory(query: { year?: number; month?: number } = {}) {
  return apiFetch<{ year: number; month: number; categories: CategorySpending[] }>('/analytics/spending-by-category', {
    query,
  });
}

export function getMonthlyTrend(query: { months?: number } = {}) {
  return apiFetch<{ trend: MonthlyTrendPoint[] }>('/analytics/monthly-trend', { query });
}

export function getBudgetUtilization(query: { year?: number; month?: number } = {}) {
  return apiFetch<{ year: number; month: number; budgets: Budget[] }>('/analytics/budget-utilization', { query });
}
