import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import * as transferService from '../services/transfer.service';
import type { CreateTransferInput } from '../validation/transfer.validation';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const transfers = await transferService.listTransfers(req.userId);
  res.json({ transfers });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const transfer = await transferService.getTransfer(req.userId, req.params.id as string);
  res.json({ transfer });
});

export const create = asyncHandler(async (req: Request<unknown, unknown, CreateTransferInput>, res: Response) => {
  const transfer = await transferService.createTransfer(req.userId, req.body);
  res.status(201).json({ transfer });
});
