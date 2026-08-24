import { apiFetch, apiUpload } from './client';
import type { ImportBatch, ImportResult } from '../types';

export function listImports() {
  return apiFetch<{ importBatches: ImportBatch[] }>('/imports');
}

export function getImport(id: string) {
  return apiFetch<{ importBatch: ImportBatch }>(`/imports/${id}`);
}

export function importCsv(accountId: string, file: File) {
  const formData = new FormData();
  formData.append('accountId', accountId);
  formData.append('file', file);
  return apiUpload<ImportResult>('/imports/transactions', formData);
}
