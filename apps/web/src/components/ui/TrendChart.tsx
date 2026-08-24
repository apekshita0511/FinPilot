import { monthNameShort } from '../../lib/format';
import type { MonthlyTrendPoint } from '../../types';
import styles from './TrendChart.module.css';

export function TrendChart({ trend }: { trend: MonthlyTrendPoint[] }) {
  const max = Math.max(...trend.flatMap((t) => [Number(t.income), Number(t.expenses)]), 1);

  return (
    <div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--income)' }} /> Income
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--expense)' }} /> Expenses
        </span>
      </div>
      <div className={styles.chart}>
        {trend.map((t) => (
          <div className={styles.column} key={`${t.year}-${t.month}`}>
            <div className={styles.bars}>
              <div
                className={`${styles.bar} ${styles.barIncome}`}
                style={{ height: `${(Number(t.income) / max) * 100}%` }}
                title={`Income: ${t.income}`}
              />
              <div
                className={`${styles.bar} ${styles.barExpense}`}
                style={{ height: `${(Number(t.expenses) / max) * 100}%` }}
                title={`Expenses: ${t.expenses}`}
              />
            </div>
            <span className={styles.monthLabel}>{monthNameShort(t.month)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
