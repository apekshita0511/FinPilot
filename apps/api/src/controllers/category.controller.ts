import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import * as categoryService from '../services/category.service';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validation/category.validation';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const categories = await categoryService.listCategories(req.userId);
  res.json({ categories });
});

export const create = asyncHandler(async (req: Request<unknown, unknown, CreateCategoryInput>, res: Response) => {
  const category = await categoryService.createCategory(req.userId, req.body);
  res.status(201).json({ category });
});

export const update = asyncHandler(async (req: Request<Record<string, string>, unknown, UpdateCategoryInput>, res: Response) => {
  const category = await categoryService.updateCategory(req.userId, req.params.id as string, req.body);
  res.json({ category });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await categoryService.deleteCategory(req.userId, req.params.id as string);
  res.status(204).send();
});
