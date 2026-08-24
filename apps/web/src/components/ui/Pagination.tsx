import { Button } from './Button';
import type { Pagination as PaginationType } from '../../types';
import styles from './Pagination.module.css';

export function Pagination({ pagination, onPageChange }: { pagination: PaginationType; onPageChange: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      <span>
        Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
      </span>
      <div className={styles.controls}>
        <Button
          variant="secondary"
          size="small"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="small"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
