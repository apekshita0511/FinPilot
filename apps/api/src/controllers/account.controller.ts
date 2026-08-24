import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import * as accountService from '../services/account.service';
import type { CreateAccountInput, UpdateAccountInput } from '../validation/account.validation';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const accounts = await accountService.listAccounts(req.userId);
  res.json({ accounts });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const account = await accountService.getAccount(req.userId, req.params.id as string);
  res.json({ account });
});

export const create = asyncHandler(async (req: Request<unknown, unknown, CreateAccountInput>, res: Response) => {
  const account = await accountService.createAccount(req.userId, req.body);
  res.status(201).json({ account });
});

export const update = asyncHandler(async (req: Request<Record<string, string>, unknown, UpdateAccountInput>, res: Response) => {
  const account = await accountService.updateAccount(req.userId, req.params.id as string, req.body);
  res.json({ account });
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  const account = await accountService.archiveAccount(req.userId, req.params.id as string);
  res.json({ account });
});
