import { apiFetch } from './client';
import type { Transfer } from '../types';

export function listTransfers() {
  return apiFetch<{ transfers: Transfer[] }>('/transfers');
}

export function createTransfer(input: {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  description?: string;
}) {
  return apiFetch<{ transfer: Transfer }>('/transfers', { method: 'POST', body: input });
}
