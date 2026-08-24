import request from 'supertest';

import { createApp } from '../app';
import { prisma } from '../lib/prisma';

export const app = createApp();

export async function cleanDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE audit_entries, import_batches, budgets, transfers, transactions, categories, accounts, users RESTART IDENTITY CASCADE;',
  );
}

export async function registerUser(
  overrides: Partial<{ email: string; password: string; name: string }> = {},
) {
  const email = overrides.email ?? `user-${Math.random().toString(36).slice(2)}@example.com`;
  const password = overrides.password ?? 'password123';
  const name = overrides.name ?? 'Test User';

  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ email, password, name });

  return { agent, user: res.body.user as { id: string; email: string; name: string } };
}

export async function createAccount(
  agent: ReturnType<typeof request.agent>,
  overrides: Partial<{ name: string; accountType: string; currency: string; openingBalance: number }> = {},
) {
  const res = await agent.post('/api/accounts').send({
    name: overrides.name ?? 'HDFC Savings',
    accountType: overrides.accountType ?? 'BANK',
    currency: overrides.currency ?? 'INR',
    openingBalance: overrides.openingBalance ?? 10000,
  });
  return res.body.account;
}
