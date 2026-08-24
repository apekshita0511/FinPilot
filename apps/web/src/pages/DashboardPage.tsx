import { Link } from 'react-router-dom';

import * as analyticsApi from '../api/analytics';
import * as transactionsApi from '../api/transactions';
import { PageHeader } from '../components/layout/AppShell';
import { CategoryBarList } from '../components/ui/CategoryBarList';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { Money } from '../components/ui/Money';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatCard, StatGrid } from '../components/ui/StatCard';
import { useApiData } from '../hooks/useApiData';
import { formatDate, monthName } from '../lib/format';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const summary = useApiData(() => analyticsApi.getSummary({ year, month }), [year, month]);
  const spending = useApiData(() => analyticsApi.getSpendingByCategory({ year, month }), [year, month]);
  const budgets = useApiData(() => analyticsApi.getBudgetUtilization({ year, month }), [year, month]);
  const recentTxns = useApiData(() => transactionsApi.listTransactions({ pageSize: 6, sort: 'date_desc' }), []);

  return (
    <div>
      <PageHeader title="Dashboard" />

      {summary.loading && <LoadingState label="Loading your summary…" />}
      {summary.error && <ErrorState message={summary.error} onRetry={summary.refetch} />}
      {summary.data && (
        <StatGrid>
          <StatCard label="Total balance" value={<Money value={summary.data.totalBalance} />} />
          <StatCard
            label={`Income · ${monthName(month)}`}
            value={<Money value={summary.data.income} sign="income" />}
          />
          <StatCard
            label={`Expenses · ${monthName(month)}`}
            value={<Money value={summary.data.expenses} sign="expense" />}
          />
          <StatCard
            label="Net cash flow"
            value={
              <Money value={summary.data.netCashFlow} sign={Number(summary.data.netCashFlow) >= 0 ? 'income' : 'expense'} signed />
            }
          />
        </StatGrid>
      )}

      <div className={styles.columns}>
        <div className={styles.stack}>
          <Card>
            <CardHeader title="Spending by category" />
            {spending.loading && <LoadingState />}
            {spending.error && <ErrorState message={spending.error} onRetry={spending.refetch} />}
            {spending.data && spending.data.categories.length === 0 && (
              <EmptyState title="No spending yet" message="Expenses you record this month will show up here." />
            )}
            {spending.data && spending.data.categories.length > 0 && (
              <CategoryBarList categories={spending.data.categories} />
            )}
          </Card>

          <Card>
            <CardHeader title="Recent transactions" action={<Link to="/transactions">View all</Link>} />
            {recentTxns.loading && <LoadingState />}
            {recentTxns.error && <ErrorState message={recentTxns.error} onRetry={recentTxns.refetch} />}
            {recentTxns.data && recentTxns.data.data.length === 0 && (
              <EmptyState
                title="No transactions yet"
                message="Add your first transaction to see it here."
                action={
                  <Link to="/transactions">
                    <span style={{ color: 'var(--brand)', fontSize: '0.875rem' }}>Add a transaction →</span>
                  </Link>
                }
              />
            )}
            {recentTxns.data && recentTxns.data.data.length > 0 && (
              <div>
                {recentTxns.data.data.map((t) => (
                  <div className={styles.txnRow} key={t.id}>
                    <div className={styles.txnMeta}>
                      <span className={styles.txnDescription}>{t.description}</span>
                      <span className={styles.txnSub}>
                        {formatDate(t.transactionDate)} · {t.account?.name}
                      </span>
                    </div>
                    <Money
                      value={t.amount}
                      sign={t.type === 'INCOME' || t.type === 'TRANSFER_IN' ? 'income' : 'expense'}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title={`Budgets · ${monthName(month)}`} action={<Link to="/budgets">Manage</Link>} />
          {budgets.loading && <LoadingState />}
          {budgets.error && <ErrorState message={budgets.error} onRetry={budgets.refetch} />}
          {budgets.data && budgets.data.budgets.length === 0 && (
            <EmptyState title="No budgets set" message="Create a monthly budget to track spending against a limit." />
          )}
          {budgets.data && budgets.data.budgets.length > 0 && (
            <div>
              {budgets.data.budgets.map((b) => (
                <div className={styles.budgetRow} key={b.id}>
                  <div className={styles.budgetHeader}>
                    <span className={styles.budgetName}>{b.category?.name}</span>
                    <span className={styles.budgetAmounts}>
                      {b.spent !== undefined ? new Intl.NumberFormat('en-IN').format(Number(b.spent)) : 0} /{' '}
                      {new Intl.NumberFormat('en-IN').format(Number(b.limitAmount))}
                    </span>
                  </div>
                  <ProgressBar percent={b.percentUsed} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
