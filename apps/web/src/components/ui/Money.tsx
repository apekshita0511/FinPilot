import { formatMoney } from '../../lib/format';
import styles from './Money.module.css';

interface MoneyProps {
  value: string | number;
  sign?: 'income' | 'expense' | 'neutral';
  /**
   * Set when `value` may already carry its own minus sign (e.g. a net
   * cash flow that can be negative) — skips the manual +/- prefix so it
   * doesn't double up with the sign Intl.NumberFormat renders natively.
   * Leave false for values the backend always sends as a positive
   * magnitude (transaction amounts, income/expense totals), where the
   * prefix is the only thing indicating direction.
   */
  signed?: boolean;
  className?: string;
}

export function Money({ value, sign = 'neutral', signed = false, className }: MoneyProps) {
  const prefix = signed ? '' : sign === 'income' ? '+' : sign === 'expense' ? '−' : '';
  return (
    <span className={[styles.money, styles[sign], className].filter(Boolean).join(' ')}>
      {prefix}
      {formatMoney(value)}
    </span>
  );
}
