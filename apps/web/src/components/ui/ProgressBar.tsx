import styles from './ProgressBar.module.css';

export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const fillClass = percent >= 100 ? styles.fillDanger : percent >= 80 ? styles.fillWarning : styles.fill;
  return (
    <div className={styles.track} role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
      <div className={fillClass} style={{ width: `${clamped}%` }} />
    </div>
  );
}
