import { useState } from 'react';

import * as analyticsApi from '../api/analytics';
import { PageHeader } from '../components/layout/AppShell';
import { CategoryBarList } from '../components/ui/CategoryBarList';
import { Card, CardHeader } from '../components/ui/Card';
import { Select } from '../components/ui/Field';
import { Money } from '../components/ui/Money';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StateViews';
import { StatCard, StatGrid } from '../components/ui/StatCard';
import { TrendChart } from '../components/ui/TrendChart';
import { useApiData } from '../hooks/useApiData';
import { monthName } from '../lib/format';

export function AnalyticsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const summary = useApiData(() => analyticsApi.getSummary({ year, month }), [year, month]);
  const spending = useApiData(() => analyticsApi.getSpendingByCategory({ year, month }), [year, month]);
  const trend = useApiData(() => analyticsApi.getMonthlyTrend({ months: 6 }), []);

  return (
    <div>
      <PageHeader title="Analytics" />

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
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

      {summary.loading && <LoadingState />}
      {summary.error && <ErrorState message={summary.error} onRetry={summary.refetch} />}
      {summary.data && (
        <StatGrid>
          <StatCard label="Total balance" value={<Money value={summary.data.totalBalance} />} />
          <StatCard label="Income" value={<Money value={summary.data.income} sign="income" />} />
          <StatCard label="Expenses" value={<Money value={summary.data.expenses} sign="expense" />} />
          <StatCard
            label="Net cash flow"
            value={
              <Money value={summary.data.netCashFlow} sign={Number(summary.data.netCashFlow) >= 0 ? 'income' : 'expense'} signed />
            }
          />
        </StatGrid>
      )}

      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Cash flow · last 6 months" />
        {trend.loading && <LoadingState />}
        {trend.error && <ErrorState message={trend.error} onRetry={trend.refetch} />}
        {trend.data && <TrendChart trend={trend.data.trend} />}
      </Card>

      <Card>
        <CardHeader title={`Spending by category · ${monthName(month)} ${year}`} />
        {spending.loading && <LoadingState />}
        {spending.error && <ErrorState message={spending.error} onRetry={spending.refetch} />}
        {spending.data && spending.data.categories.length === 0 && (
          <EmptyState title="No spending this month" message="Recorded expenses will be broken down here by category." />
        )}
        {spending.data && spending.data.categories.length > 0 && (
          <CategoryBarList categories={spending.data.categories} />
        )}
      </Card>
    </div>
  );
}
