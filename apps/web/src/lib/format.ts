const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function formatMoney(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return currencyFormatter.format(num);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

export function monthNameShort(month: number): string {
  return monthName(month).slice(0, 3);
}
