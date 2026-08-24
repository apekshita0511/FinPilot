import type { ReactNode } from 'react';

import { Button } from './Button';
import styles from './StateViews.module.css';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className={styles.state} role="status" aria-live="polite">
      <div className={styles.spinner} />
      <span className={styles.message}>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={styles.state} role="alert">
      <div className={styles.icon}>⚠</div>
      <div className={styles.title}>Something went wrong</div>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <Button variant="secondary" size="small" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.state}>
      <div className={styles.title}>{title}</div>
      {message && <p className={styles.message}>{message}</p>}
      {action}
    </div>
  );
}
