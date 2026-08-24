import { useRef, useState } from 'react';

import * as accountsApi from '../api/accounts';
import * as importsApi from '../api/imports';
import { ApiClientError } from '../api/client';
import { PageHeader } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Select } from '../components/ui/Field';
import { FormError } from '../components/ui/FormError';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { useApiData } from '../hooks/useApiData';
import { formatDate } from '../lib/format';
import type { ImportResult } from '../types';
import styles from './ImportPage.module.css';

export function ImportPage() {
  const accounts = useApiData(() => accountsApi.listAccounts(), []);
  const activeAccounts = accounts.data?.accounts.filter((a) => a.isActive) ?? [];

  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const history = useApiData(() => importsApi.listImports(), [result]);

  const effectiveAccountId = accountId || activeAccounts[0]?.id || '';

  async function handleUpload() {
    if (!file || !effectiveAccountId) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await importsApi.importCsv(effectiveAccountId, file);
      setResult(res);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to import CSV file.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Import transactions" />

      <Card className={styles.uploadCard}>
        <CardHeader title="Upload a CSV file" />
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Columns: <code>Date, Description, Amount, Type</code> (Type is INCOME or EXPENSE). Optional:{' '}
          <code>Category</code>, <code>Reference</code>.
        </p>

        {accounts.loading && <LoadingState />}
        {activeAccounts.length > 0 && (
          <Select label="Import into account" value={effectiveAccountId} onChange={(e) => setAccountId(e.target.value)}>
            {activeAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        )}
        {!accounts.loading && activeAccounts.length === 0 && (
          <EmptyState title="No accounts yet" message="Create an account before importing transactions." />
        )}

        <label className={styles.dropzone} htmlFor="csv-file-input">
          {file ? <span className={styles.fileName}>{file.name}</span> : 'Click to choose a .csv file'}
        </label>
        <input
          id="csv-file-input"
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <FormError message={error} />

        <Button onClick={handleUpload} disabled={!file || !effectiveAccountId || uploading}>
          {uploading ? 'Importing…' : 'Import'}
        </Button>
      </Card>

      {result && (
        <Card className={styles.uploadCard} style={{ maxWidth: 640 }}>
          <CardHeader title="Import summary" />
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>{result.totalRows}</div>
              <div className={styles.summaryLabel}>Total rows</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue} style={{ color: 'var(--income)' }}>
                {result.importedRows}
              </div>
              <div className={styles.summaryLabel}>Imported</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue} style={{ color: 'var(--warning)' }}>
                {result.duplicateRows}
              </div>
              <div className={styles.summaryLabel}>Duplicates</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue} style={{ color: 'var(--danger)' }}>
                {result.failedRows}
              </div>
              <div className={styles.summaryLabel}>Failed</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className={styles.errorList}>
              {result.errors.map((e, i) => (
                <div className={styles.errorRow} key={i}>
                  Row {e.row}: {e.error}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader title="Import history" />
        {history.loading && <LoadingState />}
        {history.error && <ErrorState message={history.error} onRetry={history.refetch} />}
        {history.data && history.data.importBatches.length === 0 && (
          <EmptyState title="No imports yet" message="Your CSV import history will appear here." />
        )}
        {history.data && history.data.importBatches.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Account</th>
                  <th>Date</th>
                  <th>Imported</th>
                  <th>Duplicates</th>
                  <th>Failed</th>
                </tr>
              </thead>
              <tbody>
                {history.data.importBatches.map((b) => (
                  <tr key={b.id}>
                    <td>{b.filename}</td>
                    <td>{b.account?.name}</td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td>{b.importedRows}</td>
                    <td>{b.duplicateRows}</td>
                    <td>{b.failedRows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
