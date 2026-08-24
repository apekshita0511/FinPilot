import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import * as transactionService from '../services/transaction.service';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from '../validation/transaction.validation';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await transactionService.listTransactions(req.userId, req.query as unknown as ListTransactionsQuery);
  res.json(result);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await transactionService.getTransaction(req.userId, req.params.id as string);
  res.json({ transaction });
});

export const create = asyncHandler(
  async (req: Request<unknown, unknown, CreateTransactionInput>, res: Response) => {
    const transaction = await transactionService.createTransaction(req.userId, req.body);
    res.status(201).json({ transaction });
  },
);

export const update = asyncHandler(
  async (req: Request<Record<string, string>, unknown, UpdateTransactionInput>, res: Response) => {
    const transaction = await transactionService.updateTransaction(req.userId, req.params.id as string, req.body);
    res.json({ transaction });
  },
);

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await transactionService.deleteTransaction(req.userId, req.params.id as string);
  res.status(204).send();
});
