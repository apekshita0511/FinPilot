/**
 * Seeds one demo user with a few accounts, transactions and budgets so the
 * app has something to show on first run.
 *
 * DESTRUCTIVE: clears all tables first. Local dev / demo only.
 * Login: demo@finpilot.app  /  password123
 */
import { PrismaClient } from '@prisma/client';

import { hashPassword } from '../src/lib/password';
import { DEFAULT_CATEGORIES } from '../src/lib/defaultCategories';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Clearing existing data…');
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE budgets, transactions, categories, accounts, users RESTART IDENTITY CASCADE;',
  );

  const user = await prisma.user.create({
    data: {
      email: 'demo@finpilot.app',
      name: 'Demo User',
      passwordHash: await hashPassword('password123'),
      categories: { create: DEFAULT_CATEGORIES },
    },
    include: { categories: true },
  });

  const categoryId = (name: string) => user.categories.find((c) => c.name === name)!.id;

  const [checking, cash] = await Promise.all([
    prisma.account.create({
      data: { userId: user.id, name: 'HDFC Savings', accountType: 'BANK', openingBalance: 40000 },
    }),
    prisma.account.create({
      data: { userId: user.id, name: 'Cash Wallet', accountType: 'CASH', openingBalance: 3000 },
    }),
  ]);

  await prisma.transaction.createMany({
    data: [
      { userId: user.id, accountId: checking.id, categoryId: categoryId('Salary'), type: 'INCOME', amount: 85000, description: 'Monthly salary', transactionDate: daysAgo(28) },
      { userId: user.id, accountId: checking.id, categoryId: categoryId('Rent'), type: 'EXPENSE', amount: 22000, description: 'Flat rent', transactionDate: daysAgo(26) },
      { userId: user.id, accountId: checking.id, categoryId: categoryId('Utilities'), type: 'EXPENSE', amount: 1450, description: 'Electricity bill', transactionDate: daysAgo(24) },
      { userId: user.id, accountId: checking.id, categoryId: categoryId('Food'), type: 'EXPENSE', amount: 640, description: 'Swiggy', transactionDate: daysAgo(20) },
      { userId: user.id, accountId: cash.id, categoryId: categoryId('Food'), type: 'EXPENSE', amount: 250, description: 'Local grocery', transactionDate: daysAgo(18) },
      { userId: user.id, accountId: checking.id, categoryId: categoryId('Shopping'), type: 'EXPENSE', amount: 2999, description: 'Amazon order', transactionDate: daysAgo(15) },
      { userId: user.id, accountId: checking.id, categoryId: categoryId('Travel'), type: 'EXPENSE', amount: 480, description: 'Uber', transactionDate: daysAgo(12) },
      { userId: user.id, accountId: checking.id, categoryId: categoryId('Entertainment'), type: 'EXPENSE', amount: 649, description: 'Netflix', transactionDate: daysAgo(10) },
      { userId: user.id, accountId: checking.id, categoryId: categoryId('Other Income'), type: 'INCOME', amount: 4000, description: 'Freelance payment', transactionDate: daysAgo(8) },
      { userId: user.id, accountId: cash.id, categoryId: categoryId('Food'), type: 'EXPENSE', amount: 320, description: 'Coffee', transactionDate: daysAgo(5) },
      { userId: user.id, accountId: checking.id, categoryId: categoryId('Food'), type: 'EXPENSE', amount: 720, description: 'Zomato', transactionDate: daysAgo(3) },
      { userId: user.id, accountId: checking.id, categoryId: categoryId('Utilities'), type: 'EXPENSE', amount: 599, description: 'Internet bill', transactionDate: daysAgo(2) },
    ],
  });

  const now = new Date();
  await prisma.budget.createMany({
    data: [
      { userId: user.id, categoryId: categoryId('Food'), year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, limitAmount: 6000 },
      { userId: user.id, categoryId: categoryId('Shopping'), year: now.getUTCFullYear(), month: now.getUTCMonth() + 1, limitAmount: 5000 },
    ],
  });

  console.log('Seed complete. Login with demo@finpilot.app / password123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
