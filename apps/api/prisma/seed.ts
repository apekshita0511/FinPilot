/**
 * Seeds realistic performance-test data — see FinPilot Phase 9 design.
 *
 * Deliberately NOT thousands of shallow users: 50 users total, with one
 * "heavy" user carrying 50,000 transactions so Phase 9's performance work
 * measures a realistic single-user query pattern (paginating/filtering one
 * person's transaction history) rather than a shallow multi-tenant spread.
 *
 * DESTRUCTIVE: truncates all application tables before seeding, so this is
 * safe to re-run but will wipe whatever is currently in the target
 * database. Intended for local dev / a disposable performance-test DB —
 * never point this at anything you want to keep.
 *
 * All seeded users share the password "password123" (documented here, not
 * hidden) so anyone can log in and explore.
 */
import { PrismaClient, Prisma } from '@prisma/client';

import { hashPassword } from '../src/lib/password';
import { DEFAULT_CATEGORIES } from '../src/lib/defaultCategories';

const prisma = new PrismaClient();

const BATCH_SIZE = 4000;
const SEED_PASSWORD = 'password123';

interface Merchant {
  desc: string;
  min: number;
  max: number;
}

// Everyday-frequency amounts — these are drawn tens of thousands of times
// for the heavy user, so even "small" per-transaction amounts add up fast.
// Big-ticket items (flights, large hauls) are intentionally rare (see
// BIG_TICKET below), not baseline, matching how real spending is actually
// distributed: many small transactions, occasional large ones.
const MERCHANTS: Record<string, Merchant[]> = {
  Food: [
    { desc: 'Swiggy', min: 100, max: 350 },
    { desc: 'Zomato', min: 100, max: 350 },
    { desc: 'Local Grocery Store', min: 150, max: 900 },
    { desc: 'Starbucks', min: 150, max: 350 },
    { desc: "McDonald's", min: 120, max: 300 },
    { desc: 'Big Bazaar', min: 300, max: 1500 },
  ],
  Travel: [
    { desc: 'Uber', min: 60, max: 300 },
    { desc: 'Ola', min: 60, max: 300 },
    { desc: 'Petrol Pump', min: 300, max: 1200 },
    { desc: 'IRCTC Train Booking', min: 300, max: 1200 },
  ],
  Shopping: [
    { desc: 'Amazon', min: 150, max: 1200 },
    { desc: 'Flipkart', min: 150, max: 1200 },
    { desc: 'Myntra', min: 150, max: 900 },
  ],
  Rent: [{ desc: 'Monthly Rent', min: 8000, max: 25000 }],
  Utilities: [
    { desc: 'Electricity Bill', min: 500, max: 2500 },
    { desc: 'Water Bill', min: 150, max: 600 },
    { desc: 'Internet Bill', min: 600, max: 1500 },
    { desc: 'Mobile Recharge', min: 150, max: 600 },
  ],
  Education: [
    { desc: 'Online Course Fee', min: 800, max: 4000 },
    { desc: 'Book Purchase', min: 150, max: 1000 },
  ],
  Entertainment: [
    { desc: 'Netflix', min: 199, max: 649 },
    { desc: 'Spotify', min: 119, max: 389 },
    { desc: 'Movie Tickets', min: 150, max: 600 },
    { desc: 'BookMyShow', min: 150, max: 800 },
  ],
  Other: [{ desc: 'Miscellaneous Expense', min: 50, max: 400 }],
  BigTicket: [
    { desc: 'IndiGo Flight', min: 3000, max: 9000 },
    { desc: 'Amazon (Large Order)', min: 3000, max: 8000 },
  ],
  Salary: [{ desc: 'Monthly Salary', min: 30000, max: 120000 }],
  'Other Income': [
    { desc: 'Freelance Payment', min: 1500, max: 15000 },
    { desc: 'Interest Credited', min: 100, max: 1500 },
    { desc: 'Refund', min: 150, max: 1500 },
  ],
};

// Weighted so Food dominates the everyday pool and BigTicket stays rare —
// Rent, Utilities, and Salary are generated once per month separately, not
// drawn from here (real bills don't recur at random daily frequency).
const EXPENSE_WEIGHTS: Array<[string, number]> = [
  ['Food', 34],
  ['Shopping', 18],
  ['Travel', 14],
  ['Entertainment', 20],
  ['Education', 6],
  ['Other', 6],
  ['BigTicket', 2],
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randAmount(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function weightedPick(weights: Array<[string, number]>): string {
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [name, w] of weights) {
    if (r < w) return name;
    r -= w;
  }
  return weights[weights.length - 1][0];
}

function randomDateWithinDays(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - randInt(0, days));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function monthsAgo(m: number, day: number): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - m);
  d.setUTCDate(day);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

interface TransactionRow {
  userId: string;
  accountId: string;
  categoryId: string | null;
  type: 'INCOME' | 'EXPENSE';
  amount: Prisma.Decimal.Value;
  description: string;
  transactionDate: Date;
  source: 'MANUAL';
}

function generateTransactionsForUser(params: {
  userId: string;
  accountIds: string[];
  categoryIdByName: Map<string, string>;
  totalTransactions: number;
  days: number;
}) {
  const { userId, accountIds, categoryIdByName, totalTransactions, days } = params;
  const months = Math.max(1, Math.floor(days / 30));
  const rows: TransactionRow[] = [];
  const balanceDeltas = new Map<string, number>(accountIds.map((id) => [id, 0]));
  const primaryAccount = accountIds[0];

  function addRow(accountId: string, categoryName: string, type: 'INCOME' | 'EXPENSE', merchant: Merchant, date: Date) {
    const amount = randAmount(merchant.min, merchant.max);
    rows.push({
      userId,
      accountId,
      categoryId: categoryIdByName.get(categoryName) ?? null,
      type,
      amount,
      description: merchant.desc,
      transactionDate: date,
      source: 'MANUAL',
    });
    balanceDeltas.set(accountId, (balanceDeltas.get(accountId) ?? 0) + (type === 'INCOME' ? amount : -amount));
  }

  for (let m = 0; m < months; m++) {
    addRow(primaryAccount, 'Salary', 'INCOME', pick(MERCHANTS.Salary), monthsAgo(m, randInt(1, 5)));
    if (Math.random() < 0.8) {
      addRow(primaryAccount, 'Rent', 'EXPENSE', pick(MERCHANTS.Rent), monthsAgo(m, randInt(1, 10)));
    }
    // Bills recur monthly, not at random daily frequency like everyday
    // spending — drawn here alongside Rent/Salary, not from EXPENSE_WEIGHTS.
    if (Math.random() < 0.9) {
      addRow(primaryAccount, 'Utilities', 'EXPENSE', pick(MERCHANTS.Utilities), monthsAgo(m, randInt(1, 15)));
    }
  }

  const remaining = totalTransactions - rows.length;
  for (let i = 0; i < remaining; i++) {
    const account = pick(accountIds);
    const date = randomDateWithinDays(days);
    if (Math.random() < 0.03) {
      addRow(account, 'Other Income', 'INCOME', pick(MERCHANTS['Other Income']), date);
    } else {
      const categoryName = weightedPick(EXPENSE_WEIGHTS);
      const merchant = pick(MERCHANTS[categoryName]);
      // BigTicket is a drawing pool, not a real category — file it under
      // Travel or Shopping depending on which merchant was actually drawn.
      const realCategoryName =
        categoryName === 'BigTicket' ? (merchant.desc.includes('Flight') ? 'Travel' : 'Shopping') : categoryName;
      addRow(account, realCategoryName, 'EXPENSE', merchant, date);
    }
  }

  return { rows, balanceDeltas };
}

async function insertInBatches(rows: TransactionRow[]) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await prisma.transaction.createMany({ data: rows.slice(i, i + BATCH_SIZE) });
  }
}

const ACCOUNT_NAME_POOL = ['HDFC Savings', 'ICICI Salary Account', 'Cash', 'SBI Savings', 'Credit Card', 'Investment Account'];

async function seedUser(params: {
  email: string;
  name: string;
  accountCount: number;
  totalTransactions: number;
  days: number;
  passwordHash: string;
}) {
  const { email, name, accountCount, totalTransactions, days, passwordHash } = params;

  const user = await prisma.user.create({ data: { email, name, passwordHash } });

  const categories = await Promise.all(
    DEFAULT_CATEGORIES.map((c) => prisma.category.create({ data: { ...c, userId: user.id } })),
  );
  const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));

  const accountNames = ACCOUNT_NAME_POOL.slice(0, accountCount);
  const accounts = await Promise.all(
    accountNames.map((accName) => {
      const openingBalance = randInt(5000, 50000);
      return prisma.account.create({
        data: {
          userId: user.id,
          name: accName,
          accountType: accName === 'Cash' ? 'CASH' : accName === 'Investment Account' ? 'INVESTMENT' : 'BANK',
          currency: 'INR',
          openingBalance,
          currentBalance: openingBalance,
        },
      });
    }),
  );
  const accountIds = accounts.map((a) => a.id);

  const { rows, balanceDeltas } = generateTransactionsForUser({
    userId: user.id,
    accountIds,
    categoryIdByName,
    totalTransactions,
    days,
  });

  await insertInBatches(rows);

  for (const account of accounts) {
    const delta = balanceDeltas.get(account.id) ?? 0;
    await prisma.account.update({
      where: { id: account.id },
      data: { currentBalance: new Prisma.Decimal(account.openingBalance).plus(delta) },
    });
  }

  // A couple of budgets for the current month, on categories this user
  // actually spends in.
  const expenseCategoryNames = EXPENSE_WEIGHTS.map(([n]) => n).filter((n) => n !== 'BigTicket');
  const now = new Date();
  const budgetCategories = [...expenseCategoryNames].sort(() => Math.random() - 0.5).slice(0, 2);
  for (const categoryName of budgetCategories) {
    const categoryId = categoryIdByName.get(categoryName);
    if (!categoryId) continue;
    await prisma.budget.create({
      data: {
        userId: user.id,
        categoryId,
        year: now.getUTCFullYear(),
        month: now.getUTCMonth() + 1,
        limitAmount: randInt(5000, 20000),
      },
    });
  }

  return { email, transactionCount: rows.length };
}

async function main() {
  console.log('Truncating existing data...');
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE audit_entries, import_batches, budgets, transfers, transactions, categories, accounts, users RESTART IDENTITY CASCADE;',
  );

  const started = Date.now();
  const summary: Array<{ email: string; transactionCount: number }> = [];

  console.log('Hashing shared seed password...');
  const passwordHash = await hashPassword(SEED_PASSWORD);

  console.log('Seeding heavy user (50,000 transactions)...');
  summary.push(
    await seedUser({
      email: 'heavy@example.com',
      name: 'Heavy User',
      accountCount: 3,
      totalTransactions: 50_000,
      days: 1095,
      passwordHash,
    }),
  );

  console.log('Seeding 9 medium users (1,000-5,000 transactions each)...');
  for (let i = 2; i <= 10; i++) {
    summary.push(
      await seedUser({
        email: `user${i}@example.com`,
        name: `User ${i}`,
        accountCount: randInt(1, 2),
        totalTransactions: randInt(1000, 5000),
        days: 730,
        passwordHash,
      }),
    );
  }

  console.log('Seeding 40 light users (50-500 transactions each)...');
  for (let i = 11; i <= 50; i++) {
    summary.push(
      await seedUser({
        email: `user${i}@example.com`,
        name: `User ${i}`,
        accountCount: 1,
        totalTransactions: randInt(50, 500),
        days: 365,
        passwordHash,
      }),
    );
  }

  const totalTransactions = summary.reduce((sum, s) => sum + s.transactionCount, 0);
  const elapsedSeconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log('\nSeed complete.');
  console.log(`  Users: ${summary.length}`);
  console.log(`  Total transactions: ${totalTransactions}`);
  console.log(`  Elapsed: ${elapsedSeconds}s`);
  console.log(`  All users share the password: ${SEED_PASSWORD}`);
  console.log(`  Heavy user: heavy@example.com (${summary[0].transactionCount} transactions)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
