import { useState, type FormEvent } from 'react';

import * as budgetsApi from '../api/budgets';
import * as categoriesApi from '../api/categories';
import { ApiClientError } from '../api/client';
import { PageHeader } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import formStyles from '../components/ui/Form.module.css';
import { FormError } from '../components/ui/FormError';
import { Modal, ModalActions } from '../components/ui/Modal';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { useApiData } from '../hooks/useApiData';
import { formatMoney, monthName } from '../lib/format';
import type { Budget } from '../types';
import styles from './BudgetsPage.module.css';

function NewBudgetModal({
  year,
  month,
  categories,
  onClose,
  onCreated,
}: {
  year: number;
  month: number;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [limitAmount, setLimitAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await budgetsApi.createBudget({ categoryId, year, month, limitAmount: Number(limitAmount) });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create budget.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`New budget · ${monthName(month)} ${year}`} onClose={onClose}>
      <form className={formStyles.form} onSubmit={onSubmit}>
        <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input
          label="Monthly limit (₹)"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={limitAmount}
          onChange={(e) => setLimitAmount(e.target.value)}
        />
        <FormError message={error} />
        <ModalActions>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create budget'}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function EditBudgetModal({ budget, onClose, onSaved }: { budget: Budget; onClose: () => void; onSaved: () => void }) {
  const [limitAmount, setLimitAmount] = useState(budget.limitAmount);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await budgetsApi.updateBudget(budget.id, { limitAmount: Number(limitAmount) });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to update budget.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit budget · ${budget.category?.name}`} onClose={onClose}>
      <form className={formStyles.form} onSubmit={onSubmit}>
        <Input
          label="Monthly limit (₹)"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={limitAmount}
          onChange={(e) => setLimitAmount(e.target.value)}
        />
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

export function BudgetsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const budgets = useApiData(() => budgetsApi.listBudgets({ year, month }), [year, month]);
  const categories = useApiData(() => categoriesApi.listCategories(), []);

  const expenseCategories = categories.data?.categories.filter((c) => c.type === 'EXPENSE') ?? [];
  const budgetedCategoryIds = new Set((budgets.data?.budgets ?? []).map((b) => b.categoryId));
  const availableCategories = expenseCategories.filter((c) => !budgetedCategoryIds.has(c.id));

  async function handleDelete(budget: Budget) {
    if (!window.confirm(`Delete the ${budget.category?.name} budget for ${monthName(month)} ${year}?`)) return;
    setActionError(null);
    try {
      await budgetsApi.deleteBudget(budget.id);
      budgets.refetch();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Unable to delete budget.');
    }
  }

  return (
    <div>
      <PageHeader
        title="Budgets"
        action={
          <Button onClick={() => setShowNew(true)} disabled={availableCategories.length === 0}>
            New budget
          </Button>
        }
      />

      <div className={styles.monthPicker}>
        <Select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {monthName(m)}
            </option>
          ))}
        </Select>
        <Select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>

      {actionError && <ErrorState message={actionError} />}
      {budgets.loading && <LoadingState label="Loading budgets…" />}
      {budgets.error && <ErrorState message={budgets.error} onRetry={budgets.refetch} />}
      {budgets.data && budgets.data.budgets.length === 0 && (
        <EmptyState
          title="No budgets for this month"
          message="Set a monthly spending limit for a category to track it here."
          action={
            <Button onClick={() => setShowNew(true)} disabled={availableCategories.length === 0}>
              New budget
            </Button>
          }
        />
      )}
      {budgets.data && budgets.data.budgets.length > 0 && (
        <div className={styles.list}>
          {budgets.data.budgets.map((b) => (
            <div className={styles.budgetCard} key={b.id}>
              <div className={styles.budgetHeader}>
                <span className={styles.budgetName}>{b.category?.name}</span>
                <div className={styles.budgetActions}>
                  <Button variant="ghost" size="small" onClick={() => setEditing(b)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="small" onClick={() => handleDelete(b)}>
                    Delete
                  </Button>
                </div>
              </div>
              <ProgressBar percent={b.percentUsed} />
              <div className={styles.budgetFooter}>
                <span className={styles.budgetAmounts}>
                  {formatMoney(b.spent)} of {formatMoney(b.limitAmount)}
                </span>
                <span className={styles.percent}>{b.percentUsed}% used</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewBudgetModal
          year={year}
          month={month}
          categories={availableCategories}
          onClose={() => setShowNew(false)}
          onCreated={budgets.refetch}
        />
      )}
      {editing && <EditBudgetModal budget={editing} onClose={() => setEditing(null)} onSaved={budgets.refetch} />}
    </div>
  );
}
