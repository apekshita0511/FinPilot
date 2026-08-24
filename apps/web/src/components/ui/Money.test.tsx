import { render, screen } from '@testing-library/react';

import { Money } from './Money';

describe('Money', () => {
  it('formats a plain positive value with no sign prefix by default', () => {
    render(<Money value="540" />);
    expect(screen.getByText('₹540.00')).toBeInTheDocument();
  });

  it('adds a manual "+" prefix for income-signed values (backend sends amount as always-positive)', () => {
    render(<Money value="72000" sign="income" />);
    expect(screen.getByText('+₹72,000.00')).toBeInTheDocument();
  });

  it('adds a manual "-" prefix for expense-signed values', () => {
    render(<Money value="540" sign="expense" />);
    expect(screen.getByText('−₹540.00')).toBeInTheDocument();
  });

  /**
   * Regression test for a real bug found during Phase 8's live browser
   * verification: netCashFlow comes back from the backend already signed
   * (e.g. "-540"). Passing sign="expense" without `signed` used to add a
   * second manual "-" on top of the value's own embedded minus, rendering
   * "--₹540.00" on the dashboard.
   */
  it('does not double up the minus sign for an already-negative signed value', () => {
    render(<Money value="-540" sign="expense" signed />);
    const text = screen.getByText('-₹540.00');
    expect(text).toBeInTheDocument();
    expect(text.textContent).not.toContain('--');
  });

  it('does not add a redundant "+" for an already-positive signed value', () => {
    render(<Money value="23700" sign="income" signed />);
    expect(screen.getByText('₹23,700.00')).toBeInTheDocument();
  });
});
