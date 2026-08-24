import { apiFetch } from './client';
import type { User } from '../types';

export function register(input: { email: string; password: string; name: string }) {
  return apiFetch<{ user: User }>('/auth/register', { method: 'POST', body: input });
}

export function login(input: { email: string; password: string }) {
  return apiFetch<{ user: User }>('/auth/login', { method: 'POST', body: input });
}

export function logout() {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}

export function me() {
  return apiFetch<{ user: User }>('/auth/me');
}
