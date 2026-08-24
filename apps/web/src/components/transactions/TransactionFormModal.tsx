import { useState, type FormEvent } from 'react';

import * as transactionsApi from '../../api/transactions';
import { ApiClientError } from '../../api/client';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { FormError } from '../ui/FormError';
import { Modal, ModalActions } from '../ui/Modal';
import type { Account, Category, Transaction } from '../../types';
import formStyles from '../ui/Form.module.css';

interface TransactionFormModalProps {
  accounts: Account[];
  categories: Category[];
  defaultAccountId?: string;
  editing?: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionFormModal({
  accounts,
  categories,
  defaultAccountId,
  editing,
  onClose,
  onSaved,
}: TransactionFormModalProps) {
  const [accountId, setAccountId] = useState(editing?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? '');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>((editing?.type as 'INCOME' | 'EXPENSE') ?? 'EXPENSE');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '');
  const [amount, setAmount] = useState(editing?.amount ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [transactionDate, setTransactionDate] = useState(editing?.transactionDate.slice(0, 10) ?? todayIso());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const categoriesForType = categories.filter((c) => c.type === type);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (editing) {
        await transactionsApi.updateTransaction(editing.id, {
          categoryId: categoryId || null,
          type,
          amount: Number(amount),
          description,
          transactionDate,
        });
      } else {
        await transactionsApi.createTransaction({
          accountId,
          categoryId: categoryId || undefined,
          type,
          amount: Number(amount),
          description,
          transactionDate,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to save transaction.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={editing ? 'Edit transaction' : 'New transaction'} onClose={onClose}>
      <form className={formStyles.form} onSubmit={onSubmit}>
        {!editing && (
          <Select label="Account" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        )}
        <Select
          label="Type"
          value={type}
          onChange={(e) => {
            setType(e.target.value as 'INCOME' | 'EXPENSE');
            setCategoryId('');
          }}
        >
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
        </Select>
        <Select label="Category (optional)" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Uncategorized</option>
          {categoriesForType.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input label="Amount (₹)" type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input
          label="Description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Swiggy"
        />
        <Input
          label="Date"
          type="date"
          required
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
        />
        <FormError message={error} />
        <ModalActions>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add transaction'}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
