import type { ReactNode } from 'react';

import styles from './AuthLayout.module.css';

export function AuthLayout({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>FP</span>
          FinPilot
        </div>
        <p className={styles.subtitle}>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
