import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import * as analyticsService from '../services/analytics.service';
import type { MonthQuery } from '../validation/analytics.validation';

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const result = await analyticsService.getSummary(req.userId, req.query as unknown as MonthQuery);
  res.json(result);
});

export const spendingByCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await analyticsService.getSpendingByCategory(req.userId, req.query as unknown as MonthQuery);
  res.json(result);
});
