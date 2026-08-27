import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Money } from '../ui/Money';
import { formatDate } from '../../lib/format';
import type { Transaction } from '../../types';
import styles from './TransactionTable.module.css';

interface TransactionTableProps {
  transactions: Transaction[];
  showAccount?: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionTable({ transactions, showAccount, onEdit, onDelete }: TransactionTableProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Description</th>
            <th>Category</th>
            {showAccount && <th>Account</th>}
            <th>Date</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const sign = t.type === 'INCOME' ? 'income' : 'expense';
            return (
              <tr key={t.id}>
                <td>
                  <div className={styles.description}>{t.description}</div>
                </td>
                <td>
                  {t.category ? (
                    <Badge variant={t.category.type === 'INCOME' ? 'income' : 'default'}>{t.category.name}</Badge>
                  ) : (
                    <span className={styles.sub}>Uncategorized</span>
                  )}
                </td>
                {showAccount && <td>{t.account?.name}</td>}
                <td>{formatDate(t.transactionDate)}</td>
                <td className={styles.amountCell}>
                  <Money value={t.amount} sign={sign} />
                </td>
                <td className={styles.actionsCell}>
                  <Button variant="ghost" size="small" onClick={() => onEdit(t)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="small" onClick={() => onDelete(t)}>
                    Delete
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
