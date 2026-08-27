import { apiFetch } from './client';
import type { Account, AccountType } from '../types';

export function listAccounts() {
  return apiFetch<{ accounts: Account[] }>('/accounts');
}

export function getAccount(id: string) {
  return apiFetch<{ account: Account }>(`/accounts/${id}`);
}

export function createAccount(input: { name: string; accountType: AccountType; openingBalance: number }) {
  return apiFetch<{ account: Account }>('/accounts', { method: 'POST', body: input });
}

export function updateAccount(id: string, input: Partial<{ name: string; accountType: AccountType; isActive: boolean }>) {
  return apiFetch<{ account: Account }>(`/accounts/${id}`, { method: 'PATCH', body: input });
}

export function archiveAccount(id: string) {
  return apiFetch<{ account: Account }>(`/accounts/${id}`, { method: 'DELETE' });
}
