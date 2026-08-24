import { formatMoney } from '../../lib/format';
import type { CategorySpending } from '../../types';
import styles from './CategoryBarList.module.css';

export function CategoryBarList({ categories }: { categories: CategorySpending[] }) {
  const max = Math.max(...categories.map((c) => Number(c.total)), 1);

  return (
    <div className={styles.list}>
      {categories.map((c) => (
        <div className={styles.row} key={c.categoryId ?? 'uncategorized'}>
          <span className={styles.name}>{c.categoryName}</span>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${(Number(c.total) / max) * 100}%` }} />
          </div>
          <span className={styles.total}>{formatMoney(c.total)}</span>
        </div>
      ))}
    </div>
  );
}
