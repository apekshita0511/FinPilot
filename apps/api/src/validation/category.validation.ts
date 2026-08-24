import { z } from 'zod';

const categoryTypeEnum = z.enum(['INCOME', 'EXPENSE']);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  type: categoryTypeEnum,
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'color must be a hex code like #A1B2C3')
    .optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'color must be a hex code like #A1B2C3')
    .nullable()
    .optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
