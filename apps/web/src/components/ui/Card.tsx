import type { CSSProperties, ReactNode } from 'react';

import styles from './Card.module.css';

export function Card({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className={styles.cardHeader}>
      <h3 className={styles.cardTitle}>{title}</h3>
      {action}
    </div>
  );
}
