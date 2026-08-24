import { createHash } from 'crypto';

import { parse } from 'csv-parse/sync';

export interface ParsedCsvRow {
  rowNumber: number; // 1-indexed, counting the header as row 0 (so row 1 = first data row)
  transactionDate: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  externalReference?: string;
  categoryName?: string;
}

export interface CsvRowError {
  row: number;
  error: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Column names are matched case-insensitively; only Date/Description/
 * Amount/Type are required. Category and Reference are optional
 * enrichments — see importService for how they're used.
 */
function normalizeHeaders(record: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    normalized[key.trim().toLowerCase()] = value;
  }
  return normalized;
}

function validateRow(rowNumber: number, raw: Record<string, string>): ParsedCsvRow | CsvRowError {
  const record = normalizeHeaders(raw);

  const date = (record.date ?? '').trim();
  const description = (record.description ?? '').trim();
  const amountRaw = (record.amount ?? '').trim();
  const type = (record.type ?? '').trim().toUpperCase();
  const reference = (record.reference ?? '').trim();
  const category = (record.category ?? '').trim();

  if (!DATE_PATTERN.test(date)) {
    return { row: rowNumber, error: `Invalid date "${date}" — expected YYYY-MM-DD` };
  }

  if (!description) {
    return { row: rowNumber, error: 'Description is required' };
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { row: rowNumber, error: `Invalid amount "${amountRaw}" — must be a positive number` };
  }

  if (type !== 'INCOME' && type !== 'EXPENSE') {
    return { row: rowNumber, error: `Invalid type "${type}" — must be INCOME or EXPENSE` };
  }

  return {
    rowNumber,
    transactionDate: date,
    description,
    amount,
    type,
    ...(reference && { externalReference: reference }),
    ...(category && { categoryName: category }),
  };
}

export function parseAndValidateCsv(buffer: Buffer): {
  validRows: ParsedCsvRow[];
  errors: CsvRowError[];
  totalRows: number;
} {
  let records: Record<string, string>[];
  try {
    records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    throw new Error(`Could not parse CSV file: ${err instanceof Error ? err.message : 'unknown error'}`);
  }

  const validRows: ParsedCsvRow[] = [];
  const errors: CsvRowError[] = [];

  records.forEach((record, index) => {
    const rowNumber = index + 1;
    const result = validateRow(rowNumber, record);
    if ('error' in result) {
      errors.push(result);
    } else {
      validRows.push(result);
    }
  });

  return { validRows, errors, totalRows: records.length };
}

/**
 * Deterministic fingerprint for duplicate detection when no bank-provided
 * reference is available. Amount is normalized to a fixed 2-decimal string
 * and description is lowercased/trimmed so equivalent rows ("540" vs
 * "540.00", "Swiggy" vs " swiggy ") hash identically.
 */
export function computeFingerprint(
  accountId: string,
  transactionDate: string,
  amount: number,
  description: string,
  type: string,
): string {
  const raw = `${accountId}|${transactionDate}|${amount.toFixed(2)}|${description.trim().toLowerCase()}|${type}`;
  return createHash('sha256').update(raw).digest('hex');
}
