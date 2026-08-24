import { z } from 'zod';

export const createTransferSchema = z.object({
  sourceAccountId: z.string().uuid(),
  destinationAccountId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  description: z.string().trim().min(1).max(200).optional(),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
