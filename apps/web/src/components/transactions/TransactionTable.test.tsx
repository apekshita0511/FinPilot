import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TransactionTable } from './TransactionTable';
import type { Transaction } from '../../types';

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'txn-1',
    userId: 'user-1',
    accountId: 'account-1',
    categoryId: null,
    type: 'EXPENSE',
    amount: '540',
    description: 'Swiggy',
    transactionDate: '2026-08-03',
    source: 'MANUAL',
    externalReference: null,
    fingerprint: null,
    transferId: null,
    importBatchId: null,
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('TransactionTable', () => {
  it('renders a manual transaction with Edit and Delete actions', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const txn = makeTransaction({});

    render(<TransactionTable transactions={[txn]} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByText('Swiggy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('calls onEdit with the transaction when Edit is clicked', async () => {
    const onEdit = jest.fn();
    const txn = makeTransaction({});
    const user = userEvent.setup();

    render(<TransactionTable transactions={[txn]} onEdit={onEdit} onDelete={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(onEdit).toHaveBeenCalledWith(txn);
  });

  /**
   * The backend rejects direct edit/delete of transfer-generated rows
   * (409 Conflict) — the frontend shouldn't offer buttons that are
   * guaranteed to fail. This is the UI-side half of that guarantee.
   */
  it.each(['TRANSFER_IN', 'TRANSFER_OUT'] as const)(
    'hides Edit and Delete for %s transactions',
    (type) => {
      const txn = makeTransaction({ type, transferId: 'transfer-1' });
      render(<TransactionTable transactions={[txn]} onEdit={jest.fn()} onDelete={jest.fn()} />);

      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    },
  );

  it('shows an "Uncategorized" label when categoryId is null on a non-transfer transaction', () => {
    const txn = makeTransaction({ categoryId: null, category: null });
    render(<TransactionTable transactions={[txn]} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });
});
