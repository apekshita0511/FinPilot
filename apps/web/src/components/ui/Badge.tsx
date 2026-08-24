import type { ReactNode } from 'react';

import styles from './Badge.module.css';

export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode;
  variant?: 'default' | 'income' | 'expense' | 'warning' | 'danger';
}) {
  return <span className={[styles.badge, styles[variant]].filter(Boolean).join(' ')}>{children}</span>;
}
