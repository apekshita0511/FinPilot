import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import * as budgetService from '../services/budget.service';
import type { CreateBudgetInput, ListBudgetsQuery, UpdateBudgetInput } from '../validation/budget.validation';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const budgets = await budgetService.listBudgets(req.userId, req.query as unknown as ListBudgetsQuery);
  res.json({ budgets });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const budget = await budgetService.getBudget(req.userId, req.params.id as string);
  res.json({ budget });
});

export const create = asyncHandler(async (req: Request<unknown, unknown, CreateBudgetInput>, res: Response) => {
  const budget = await budgetService.createBudget(req.userId, req.body);
  res.status(201).json({ budget });
});

export const update = asyncHandler(
  async (req: Request<Record<string, string>, unknown, UpdateBudgetInput>, res: Response) => {
    const budget = await budgetService.updateBudget(req.userId, req.params.id as string, req.body);
    res.json({ budget });
  },
);

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await budgetService.deleteBudget(req.userId, req.params.id as string);
  res.status(204).send();
});
