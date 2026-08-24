import { z } from 'zod';

const manualTransactionTypeEnum = z.enum(['INCOME', 'EXPENSE']);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)');

export const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  type: manualTransactionTypeEnum,
  amount: z.coerce.number().positive(),
  description: z.string().trim().min(1).max(200),
  transactionDate: dateOnly,
});

export const updateTransactionSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  type: manualTransactionTypeEnum.optional(),
  amount: z.coerce.number().positive().optional(),
  description: z.string().trim().min(1).max(200).optional(),
  transactionDate: dateOnly.optional(),
});

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT']).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  sort: z.enum(['date_asc', 'date_desc', 'amount_asc', 'amount_desc']).default('date_desc'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
