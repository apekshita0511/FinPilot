import request from 'supertest';

import { createAccount, registerUser } from './testUtils';

async function getCategoryByName(agent: ReturnType<typeof request.agent>, name: string) {
  const res = await agent.get('/api/categories');
  return res.body.categories.find((c: { name: string }) => c.name === name);
}

describe('budgets', () => {
  it('creates a budget for an expense category', async () => {
    const { agent } = await registerUser();
    const food = await getCategoryByName(agent, 'Food');

    const res = await agent.post('/api/budgets').send({
      categoryId: food.id,
      year: 2026,
      month: 8,
      limitAmount: 15000,
    });

    expect(res.status).toBe(201);
    expect(res.body.budget.limitAmount).toBe('15000');
  });

  it('rejects a budget for an income category', async () => {
    const { agent } = await registerUser();
    const salary = await getCategoryByName(agent, 'Salary');

    const res = await agent.post('/api/budgets').send({
      categoryId: salary.id,
      year: 2026,
      month: 8,
      limitAmount: 15000,
    });

    expect(res.status).toBe(422);
  });

  it('rejects a duplicate budget for the same category and month', async () => {
    const { agent } = await registerUser();
    const food = await getCategoryByName(agent, 'Food');

    await agent.post('/api/budgets').send({ categoryId: food.id, year: 2026, month: 8, limitAmount: 15000 });
    const res = await agent.post('/api/budgets').send({ categoryId: food.id, year: 2026, month: 8, limitAmount: 20000 });

    expect(res.status).toBe(409);
  });

  it('computes spent, remaining, and percentUsed from real transactions', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 100000 });
    const food = await getCategoryByName(agent, 'Food');

    await agent.post('/api/budgets').send({ categoryId: food.id, year: 2026, month: 8, limitAmount: 15000 });

    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 4500,
      description: 'Groceries',
      transactionDate: '2026-08-05',
    });
    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 3000,
      description: 'Dining out',
      transactionDate: '2026-08-15',
    });
    // Outside the budget's month — must not count.
    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 9999,
      description: 'September groceries',
      transactionDate: '2026-09-01',
    });

    const res = await agent.get('/api/budgets?year=2026&month=8');
    const budget = res.body.budgets[0];

    expect(budget.spent).toBe('7500');
    expect(budget.remaining).toBe('7500');
    expect(budget.percentUsed).toBe(50);
  });

  it('excludes income transactions from spend calculation', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 100000 });
    const salary = await getCategoryByName(agent, 'Salary');
    const food = await getCategoryByName(agent, 'Food');

    await agent.post('/api/budgets').send({ categoryId: food.id, year: 2026, month: 8, limitAmount: 15000 });

    // An INCOME transaction categorized as Salary should never affect a
    // Food budget, but this also guards against a regression where the
    // aggregate forgot to filter type = EXPENSE.
    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: salary.id,
      type: 'INCOME',
      amount: 50000,
      description: 'Salary',
      transactionDate: '2026-08-01',
    });

    const res = await agent.get('/api/budgets?year=2026&month=8');
    expect(res.body.budgets[0].spent).toBe('0');
  });

  it('updates the limit amount', async () => {
    const { agent } = await registerUser();
    const food = await getCategoryByName(agent, 'Food');
    const createRes = await agent.post('/api/budgets').send({ categoryId: food.id, year: 2026, month: 8, limitAmount: 15000 });

    const res = await agent.patch(`/api/budgets/${createRes.body.budget.id}`).send({ limitAmount: 20000 });
    expect(res.status).toBe(200);
    expect(res.body.budget.limitAmount).toBe('20000');
  });

  it('deletes a budget', async () => {
    const { agent } = await registerUser();
    const food = await getCategoryByName(agent, 'Food');
    const createRes = await agent.post('/api/budgets').send({ categoryId: food.id, year: 2026, month: 8, limitAmount: 15000 });

    const res = await agent.delete(`/api/budgets/${createRes.body.budget.id}`);
    expect(res.status).toBe(204);
  });

  it("enforces user isolation on budgets", async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    const aliceFood = await getCategoryByName(alice, 'Food');
    const createRes = await alice
      .post('/api/budgets')
      .send({ categoryId: aliceFood.id, year: 2026, month: 8, limitAmount: 15000 });

    const getRes = await bob.get(`/api/budgets/${createRes.body.budget.id}`);
    expect(getRes.status).toBe(404);

    const listRes = await bob.get('/api/budgets');
    expect(listRes.body.budgets).toHaveLength(0);
  });
});
