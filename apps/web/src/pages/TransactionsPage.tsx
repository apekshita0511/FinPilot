import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import * as accountsApi from '../api/accounts';
import * as categoriesApi from '../api/categories';
import * as transactionsApi from '../api/transactions';
import { ApiClientError } from '../api/client';
import { PageHeader } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { TransactionFormModal } from '../components/transactions/TransactionFormModal';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { useApiData } from '../hooks/useApiData';
import type { Transaction, TransactionType } from '../types';
import styles from './TransactionsPage.module.css';

export function TransactionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<TransactionType | ''>('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const accounts = useApiData(() => accountsApi.listAccounts(), []);
  const categories = useApiData(() => categoriesApi.listCategories(), []);

  const txns = useApiData(
    () =>
      transactionsApi.listTransactions({
        page,
        pageSize: 25,
        accountId: accountId || undefined,
        categoryId: categoryId || undefined,
        type: type || undefined,
        search: search || undefined,
        sort: 'date_desc',
      }),
    [page, accountId, categoryId, type, search],
  );

  async function handleDelete(t: Transaction) {
    if (!window.confirm(`Delete "${t.description}"? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      await transactionsApi.deleteTransaction(t.id);
      txns.refetch();
    } catch (err) {
      setDeleteError(err instanceof ApiClientError ? err.message : 'Unable to delete transaction.');
    }
  }

  const accountList = accounts.data?.accounts.filter((a) => a.isActive) ?? [];
  const categoryList = categories.data?.categories ?? [];

  return (
    <div>
      <PageHeader
        title="Transactions"
        action={
          <Button onClick={() => setShowForm(true)} disabled={accountList.length === 0}>
            New transaction
          </Button>
        }
      />

      <div className={styles.filters}>
        <div className={styles.filterField}>
          <Select
            label="Account"
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All accounts</option>
            {accountList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className={styles.filterField}>
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {categoryList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className={styles.filterField}>
          <Select
            label="Type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as TransactionType | '');
              setPage(1);
            }}
          >
            <option value="">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </Select>
        </div>
        <div className={styles.searchField}>
          <Input
            label="Search"
            placeholder="Search description…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {deleteError && <ErrorState message={deleteError} />}
      {txns.loading && <LoadingState label="Loading transactions…" />}
      {txns.error && <ErrorState message={txns.error} onRetry={txns.refetch} />}
      {txns.data && txns.data.data.length === 0 && (
        <EmptyState
          title="No transactions found"
          message={
            accountId || categoryId || type || search
              ? 'Try adjusting your filters.'
              : accountList.length === 0
                ? 'Create an account before adding a transaction.'
                : 'Add your first transaction to get started.'
          }
          action={
            accountList.length === 0 ? (
              <Button onClick={() => navigate('/accounts')}>Create an account</Button>
            ) : (
              <Button onClick={() => setShowForm(true)}>New transaction</Button>
            )
          }
        />
      )}
      {txns.data && txns.data.data.length > 0 && (
        <>
          <TransactionTable transactions={txns.data.data} showAccount onEdit={setEditing} onDelete={handleDelete} />
          <Pagination pagination={txns.data.pagination} onPageChange={setPage} />
        </>
      )}

      {showForm && (
        <TransactionFormModal
          accounts={accountList}
          categories={categoryList}
          onClose={() => setShowForm(false)}
          onSaved={txns.refetch}
        />
      )}
      {editing && (
        <TransactionFormModal
          accounts={accountList}
          categories={categoryList}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={txns.refetch}
        />
      )}
    </div>
  );
}
