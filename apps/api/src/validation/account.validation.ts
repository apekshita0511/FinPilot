import { z } from 'zod';

const accountTypeEnum = z.enum(['BANK', 'CASH', 'CREDIT_CARD', 'INVESTMENT', 'OTHER']);

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  accountType: accountTypeEnum,
  openingBalance: z.coerce.number().finite(),
});

export const updateAccountSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  accountType: accountTypeEnum.optional(),
  isActive: z.boolean().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
