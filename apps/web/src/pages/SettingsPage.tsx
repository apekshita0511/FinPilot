import { useState, type FormEvent } from 'react';

import * as categoriesApi from '../api/categories';
import { ApiClientError } from '../api/client';
import { PageHeader } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import { FormError } from '../components/ui/FormError';
import { ErrorState, LoadingState } from '../components/ui/StateViews';
import { useAuth } from '../context/AuthContext';
import { useApiData } from '../hooks/useApiData';
import { formatDate } from '../lib/format';
import type { CategoryType } from '../types';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { user } = useAuth();
  const categories = useApiData(() => categoriesApi.listCategories(), []);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CategoryType>('EXPENSE');
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await categoriesApi.createCategory({ name: newName, type: newType });
      setNewName('');
      categories.refetch();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Unable to create category.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    setRowError(null);
    try {
      await categoriesApi.deleteCategory(id);
      categories.refetch();
    } catch (err) {
      setRowError(err instanceof ApiClientError ? err.message : 'Unable to delete category.');
    }
  }

  const incomeCategories = categories.data?.categories.filter((c) => c.type === 'INCOME') ?? [];
  const expenseCategories = categories.data?.categories.filter((c) => c.type === 'EXPENSE') ?? [];

  return (
    <div>
      <PageHeader title="Settings" />

      <div className={styles.grid}>
        <Card>
          <CardHeader title="Profile" />
          <div className={styles.profileRow}>
            <span className={styles.profileLabel}>Name</span>
            <span>{user?.name}</span>
          </div>
          <div className={styles.profileRow}>
            <span className={styles.profileLabel}>Email</span>
            <span>{user?.email}</span>
          </div>
          <div className={styles.profileRow}>
            <span className={styles.profileLabel}>Member since</span>
            <span>{user ? formatDate(user.createdAt) : ''}</span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Categories" />

          {categories.loading && <LoadingState />}
          {categories.error && <ErrorState message={categories.error} onRetry={categories.refetch} />}
          {rowError && <ErrorState message={rowError} />}

          {categories.data && (
            <>
              <div className={styles.categorySection}>
                <div className={styles.sectionTitle}>Income</div>
                <div className={styles.categoryList}>
                  {incomeCategories.map((c) => (
                    <span className={styles.categoryChip} key={c.id}>
                      {c.name}
                      <button
                        type="button"
                        className={styles.chipDelete}
                        aria-label={`Delete ${c.name}`}
                        onClick={() => handleDelete(c.id, c.name)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.categorySection}>
                <div className={styles.sectionTitle}>Expense</div>
                <div className={styles.categoryList}>
                  {expenseCategories.map((c) => (
                    <span className={styles.categoryChip} key={c.id}>
                      {c.name}
                      <button
                        type="button"
                        className={styles.chipDelete}
                        aria-label={`Delete ${c.name}`}
                        onClick={() => handleDelete(c.id, c.name)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          <form className={styles.addForm} onSubmit={handleAdd}>
            <div style={{ flex: 1 }}>
              <Input label="New category" required value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <Select label="Type" value={newType} onChange={(e) => setNewType(e.target.value as CategoryType)}>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </Select>
            <Button type="submit" disabled={submitting}>
              Add
            </Button>
          </form>
          <FormError message={formError} />
        </Card>
      </div>
    </div>
  );
}
