import request from 'supertest';

import { createAccount, registerUser } from './testUtils';

async function getCategoryByName(agent: ReturnType<typeof request.agent>, name: string) {
  const res = await agent.get('/api/categories');
  return res.body.categories.find((c: { name: string }) => c.name === name);
}

describe('analytics', () => {
  it('computes summary: total balance, income, expenses, net cash flow', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 10000 });
    await createAccount(agent, { name: 'Cash', openingBalance: 500 }); // contributes to totalBalance below
    const salary = await getCategoryByName(agent, 'Salary');
    const food = await getCategoryByName(agent, 'Food');

    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: salary.id,
      type: 'INCOME',
      amount: 72000,
      description: 'Salary',
      transactionDate: '2026-08-01',
    });
    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 48300,
      description: 'Groceries',
      transactionDate: '2026-08-10',
    });
    // Different month — must not count toward August.
    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 9999,
      description: 'September spend',
      transactionDate: '2026-09-01',
    });

    const res = await agent.get('/api/analytics/summary?year=2026&month=8');

    expect(res.body.income).toBe('72000');
    expect(res.body.expenses).toBe('48300');
    expect(res.body.netCashFlow).toBe('23700');
    // Balance is a running total across ALL transactions ever, not scoped
    // to the queried month — so the September expense counts here too:
    // 10000 + 500 + 72000 - 48300 - 9999
    expect(res.body.totalBalance).toBe('24201');
  });

  it('excludes transfers from income/expense totals', async () => {
    const { agent } = await registerUser();
    const source = await createAccount(agent, { openingBalance: 10000 });
    const destination = await createAccount(agent, { name: 'Investment' });

    await agent.post('/api/transfers').send({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: 3000,
    });

    const res = await agent.get(`/api/analytics/summary?year=${new Date().getUTCFullYear()}&month=${new Date().getUTCMonth() + 1}`);
    expect(res.body.income).toBe('0');
    expect(res.body.expenses).toBe('0');
  });

  it('groups spending by category correctly, including uncategorized', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 100000 });
    const food = await getCategoryByName(agent, 'Food');
    const travel = await getCategoryByName(agent, 'Travel');

    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 3000,
      description: 'Groceries',
      transactionDate: '2026-08-05',
    });
    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 1500,
      description: 'Dining',
      transactionDate: '2026-08-12',
    });
    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: travel.id,
      type: 'EXPENSE',
      amount: 2000,
      description: 'Flight',
      transactionDate: '2026-08-15',
    });
    await agent.post('/api/transactions').send({
      accountId: account.id,
      type: 'EXPENSE',
      amount: 500,
      description: 'No category',
      transactionDate: '2026-08-20',
    });

    const res = await agent.get('/api/analytics/spending-by-category?year=2026&month=8');
    const byName = new Map(res.body.categories.map((c: { categoryName: string; total: string }) => [c.categoryName, c.total]));

    expect(byName.get('Food')).toBe('4500');
    expect(byName.get('Travel')).toBe('2000');
    expect(byName.get('Uncategorized')).toBe('500');
    // Sorted descending by total.
    expect(res.body.categories[0].categoryName).toBe('Food');
  });

  it('computes a monthly trend, filling months with no activity as zero', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 100000 });
    const salary = await getCategoryByName(agent, 'Salary');

    const now = new Date();
    const currentMonthIso = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;

    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: salary.id,
      type: 'INCOME',
      amount: 5000,
      description: 'Income this month',
      transactionDate: currentMonthIso,
    });

    const res = await agent.get('/api/analytics/monthly-trend?months=3');
    expect(res.body.trend).toHaveLength(3);

    const currentMonthEntry = res.body.trend[res.body.trend.length - 1];
    expect(currentMonthEntry.income).toBe('5000');

    const twoMonthsAgo = res.body.trend[0];
    expect(twoMonthsAgo.income).toBe('0');
    expect(twoMonthsAgo.expenses).toBe('0');
  });

  it('returns budget utilization matching the budgets endpoint', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 100000 });
    const food = await getCategoryByName(agent, 'Food');

    await agent.post('/api/budgets').send({ categoryId: food.id, year: 2026, month: 8, limitAmount: 10000 });
    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 2500,
      description: 'Groceries',
      transactionDate: '2026-08-05',
    });

    const res = await agent.get('/api/analytics/budget-utilization?year=2026&month=8');
    expect(res.body.budgets).toHaveLength(1);
    expect(res.body.budgets[0].spent).toBe('2500');
    expect(res.body.budgets[0].percentUsed).toBe(25);
  });

  it('only reflects the requesting user\'s own data', async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    const aliceAccount = await createAccount(alice, { openingBalance: 10000 });
    const aliceFood = await getCategoryByName(alice, 'Food');
    await alice.post('/api/transactions').send({
      accountId: aliceAccount.id,
      categoryId: aliceFood.id,
      type: 'EXPENSE',
      amount: 999,
      description: "Alice's spend",
      transactionDate: '2026-08-01',
    });

    const bobRes = await bob.get('/api/analytics/summary?year=2026&month=8');
    expect(bobRes.body.expenses).toBe('0');
    expect(bobRes.body.totalBalance).toBe('0');
  });
});
