import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import * as accountsApi from '../api/accounts';
import * as categoriesApi from '../api/categories';
import * as transactionsApi from '../api/transactions';
import { ApiClientError } from '../api/client';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import formStyles from '../components/ui/Form.module.css';
import { FormError } from '../components/ui/FormError';
import { Modal, ModalActions } from '../components/ui/Modal';
import { Money } from '../components/ui/Money';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { TransactionFormModal } from '../components/transactions/TransactionFormModal';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { useApiData } from '../hooks/useApiData';
import type { Account, AccountType, Transaction } from '../types';
import styles from './AccountDetailPage.module.css';

const ACCOUNT_TYPES: AccountType[] = ['BANK', 'CASH', 'CREDIT_CARD', 'INVESTMENT', 'OTHER'];

function EditAccountModal({ account, onClose, onSaved }: { account: Account; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(account.name);
  const [accountType, setAccountType] = useState<AccountType>(account.accountType);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await accountsApi.updateAccount(account.id, { name, accountType });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to update account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit account" onClose={onClose}>
      <form className={formStyles.form} onSubmit={onSubmit}>
        <Input label="Account name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Select label="Account type" value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace('_', ' ')}
            </option>
          ))}
        </Select>
        <FormError message={error} />
        <ModalActions>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showEdit, setShowEdit] = useState(false);
  const [showNewTxn, setShowNewTxn] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const account = useApiData(() => accountsApi.getAccount(id!), [id]);
  const categories = useApiData(() => categoriesApi.listCategories(), []);
  const txns = useApiData(
    () => transactionsApi.listTransactions({ accountId: id, pageSize: 50, sort: 'date_desc' }),
    [id],
  );

  async function handleArchive() {
    if (!window.confirm('Archive this account? It will be hidden from active views but its history is kept.')) return;
    setActionError(null);
    try {
      await accountsApi.archiveAccount(id!);
      account.refetch();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Unable to archive account.');
    }
  }

  async function handleDeleteTxn(t: Transaction) {
    if (!window.confirm(`Delete "${t.description}"? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await transactionsApi.deleteTransaction(t.id);
      txns.refetch();
      account.refetch();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Unable to delete transaction.');
    }
  }

  if (account.loading) return <LoadingState label="Loading account…" />;
  if (account.error) return <ErrorState message={account.error} onRetry={account.refetch} />;
  if (!account.data) return null;

  const acc = account.data.account;

  return (
    <div>
      <Link to="/accounts" className={styles.backLink}>
        ← Accounts
      </Link>

      <div className={styles.header}>
        <div>
          <h1>
            {acc.name} {!acc.isActive && <Badge variant="warning">Archived</Badge>}
          </h1>
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Type</span>
              <span className={styles.metaValue}>{acc.accountType.replace('_', ' ')}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Current balance</span>
              <Money value={acc.balance} className={styles.metaValue} />
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setShowEdit(true)}>
            Edit
          </Button>
          {acc.isActive && (
            <Button variant="danger" onClick={handleArchive}>
              Archive
            </Button>
          )}
          <Button onClick={() => setShowNewTxn(true)} disabled={!acc.isActive}>
            New transaction
          </Button>
        </div>
      </div>

      {actionError && <ErrorState message={actionError} />}

      {txns.loading && <LoadingState label="Loading transactions…" />}
      {txns.error && <ErrorState message={txns.error} onRetry={txns.refetch} />}
      {txns.data && txns.data.data.length === 0 && (
        <EmptyState title="No transactions yet" message="Transactions on this account will appear here." />
      )}
      {txns.data && txns.data.data.length > 0 && (
        <TransactionTable transactions={txns.data.data} onEdit={setEditingTxn} onDelete={handleDeleteTxn} />
      )}

      {showEdit && (
        <EditAccountModal
          account={acc}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            account.refetch();
          }}
        />
      )}
      {showNewTxn && (
        <TransactionFormModal
          accounts={[acc]}
          categories={categories.data?.categories ?? []}
          defaultAccountId={acc.id}
          onClose={() => setShowNewTxn(false)}
          onSaved={() => {
            txns.refetch();
            account.refetch();
          }}
        />
      )}
      {editingTxn && (
        <TransactionFormModal
          accounts={[acc]}
          categories={categories.data?.categories ?? []}
          editing={editingTxn}
          onClose={() => setEditingTxn(null)}
          onSaved={() => {
            txns.refetch();
            account.refetch();
          }}
        />
      )}
    </div>
  );
}
