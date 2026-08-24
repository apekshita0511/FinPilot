import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import * as accountsApi from '../api/accounts';
import * as transfersApi from '../api/transfers';
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
      await accountsApi.createAccount({
        name,
        accountType,
        currency: 'INR',
        openingBalance: Number(openingBalance),
      });
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

function TransferModal({
  accounts,
  onClose,
  onCreated,
}: {
  accounts: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id ?? '');
  const [destinationAccountId, setDestinationAccountId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (sourceAccountId === destinationAccountId) {
      setError('Source and destination accounts must be different.');
      return;
    }

    setSubmitting(true);
    try {
      await transfersApi.createTransfer({
        sourceAccountId,
        destinationAccountId,
        amount: Number(amount),
        description: description || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to complete transfer.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Transfer between accounts" onClose={onClose}>
      <form className={formStyles.form} onSubmit={onSubmit}>
        <Select label="From" value={sourceAccountId} onChange={(e) => setSourceAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select label="To" value={destinationAccountId} onChange={(e) => setDestinationAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Input label="Amount (₹)" type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Monthly investment"
        />
        <FormError message={error} />
        <ModalActions>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Transferring…' : 'Transfer'}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

export function AccountsPage() {
  const { data, loading, error, refetch } = useApiData(() => accountsApi.listAccounts(), []);
  const [showNew, setShowNew] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const accounts = data?.accounts ?? [];
  const activeAccounts = accounts.filter((a) => a.isActive);

  return (
    <div>
      <PageHeader
        title="Accounts"
        action={
          <div className={styles.toolbar}>
            {activeAccounts.length >= 2 && (
              <Button variant="secondary" onClick={() => setShowTransfer(true)}>
                Transfer
              </Button>
            )}
            <Button onClick={() => setShowNew(true)}>New account</Button>
          </div>
        }
      />

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
              <Money value={a.currentBalance} className={styles.accountBalance} />
            </Link>
          ))}
        </div>
      )}

      {showNew && <NewAccountModal onClose={() => setShowNew(false)} onCreated={refetch} />}
      {showTransfer && (
        <TransferModal accounts={activeAccounts} onClose={() => setShowTransfer(false)} onCreated={refetch} />
      )}
    </div>
  );
}
