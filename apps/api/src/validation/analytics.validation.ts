import { z } from 'zod';

export const monthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type MonthQuery = z.infer<typeof monthQuerySchema>;
