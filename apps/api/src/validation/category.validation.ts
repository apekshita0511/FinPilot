import { z } from 'zod';

const categoryTypeEnum = z.enum(['INCOME', 'EXPENSE']);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  type: categoryTypeEnum,
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
