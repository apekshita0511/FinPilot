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

function typeLabel(t: Transaction): { label: string; sign: 'income' | 'expense' } {
  switch (t.type) {
    case 'INCOME':
      return { label: 'Income', sign: 'income' };
    case 'EXPENSE':
      return { label: 'Expense', sign: 'expense' };
    case 'TRANSFER_IN':
      return { label: 'Transfer in', sign: 'income' };
    case 'TRANSFER_OUT':
      return { label: 'Transfer out', sign: 'expense' };
  }
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
            const { label, sign } = typeLabel(t);
            const isTransfer = t.type === 'TRANSFER_IN' || t.type === 'TRANSFER_OUT';
            return (
              <tr key={t.id}>
                <td>
                  <div className={styles.description}>{t.description}</div>
                  {t.source === 'IMPORT' && <div className={styles.sub}>Imported</div>}
                </td>
                <td>
                  {t.category ? (
                    <Badge variant={t.category.type === 'INCOME' ? 'income' : 'default'}>{t.category.name}</Badge>
                  ) : isTransfer ? (
                    <Badge>{label}</Badge>
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
                  {!isTransfer && (
                    <>
                      <Button variant="ghost" size="small" onClick={() => onEdit(t)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="small" onClick={() => onDelete(t)}>
                        Delete
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
