import type { ReactNode } from 'react';

import styles from './StatCard.module.css';

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
    </div>
  );
}
