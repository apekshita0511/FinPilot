import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import * as accountsApi from '../api/accounts';
import { ApiClientError } from '../api/client';
import { PageHeader } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { FormError } from '../components/ui/FormError';
import { Modal, ModalActions } from '../components/ui/Modal';
import { Money } from '../components/ui/Money';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import formStyles from '../components/ui/Form.module.css';
import { useApiData } from '../hooks/useApiData';
import type { AccountType } from '../types';
import styles from './AccountsPage.module.css';

const ACCOUNT_TYPES: AccountType[] = ['BANK', 'CASH', 'CREDIT_CARD', 'INVESTMENT', 'OTHER'];

function NewAccountModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('BANK');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await accountsApi.createAccount({ name, accountType, openingBalance: Number(openingBalance) });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New account" onClose={onClose}>
      <form className={formStyles.form} onSubmit={onSubmit}>
        <Input label="Account name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Savings" />
        <Select label="Account type" value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace('_', ' ')}
            </option>
          ))}
        </Select>
        <Input
          label="Opening balance (₹)"
          type="number"
          step="0.01"
          required
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
        />
        <FormError message={error} />
        <ModalActions>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

export function AccountsPage() {
  const { data, loading, error, refetch } = useApiData(() => accountsApi.listAccounts(), []);
  const [showNew, setShowNew] = useState(false);

  const accounts = data?.accounts ?? [];

  return (
    <div>
      <PageHeader title="Accounts" action={<Button onClick={() => setShowNew(true)}>New account</Button>} />

      {loading && <LoadingState label="Loading accounts…" />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && accounts.length === 0 && (
        <EmptyState
          title="No accounts yet"
          message="Add your first account — a bank account, cash, credit card, or investment account — to start tracking transactions."
          action={<Button onClick={() => setShowNew(true)}>New account</Button>}
        />
      )}

      {!loading && !error && accounts.length > 0 && (
        <div className={styles.grid}>
          {accounts.map((a) => (
            <Link key={a.id} to={`/accounts/${a.id}`} className={styles.accountCard}>
              <div className={styles.accountHeader}>
                <span className={styles.accountName}>{a.name}</span>
                {!a.isActive && <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Archived</span>}
              </div>
              <div className={styles.accountType}>{a.accountType.replace('_', ' ')}</div>
              <Money value={a.balance} className={styles.accountBalance} />
            </Link>
          ))}
        </div>
      )}

      {showNew && <NewAccountModal onClose={() => setShowNew(false)} onCreated={refetch} />}
    </div>
  );
}
