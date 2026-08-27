import { apiFetch } from './client';
import type { Category, CategoryType } from '../types';

export function listCategories() {
  return apiFetch<{ categories: Category[] }>('/categories');
}

export function createCategory(input: { name: string; type: CategoryType }) {
  return apiFetch<{ category: Category }>('/categories', { method: 'POST', body: input });
}

export function updateCategory(id: string, input: { name: string }) {
  return apiFetch<{ category: Category }>(`/categories/${id}`, { method: 'PATCH', body: input });
}

export function deleteCategory(id: string) {
  return apiFetch<void>(`/categories/${id}`, { method: 'DELETE' });
}
