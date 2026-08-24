import request from 'supertest';

import { createAccount, registerUser } from './testUtils';

async function getCategoryByName(agent: ReturnType<typeof request.agent>, name: string) {
  const res = await agent.get('/api/categories');
  return res.body.categories.find((c: { name: string }) => c.name === name);
}

describe('transactions', () => {
  it('creates an expense and decreases the account balance', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 10000 });
    const food = await getCategoryByName(agent, 'Food');

    const res = await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 540,
      description: 'Swiggy',
      transactionDate: '2026-08-03',
    });
    expect(res.status).toBe(201);

    const accountRes = await agent.get(`/api/accounts/${account.id}`);
    expect(accountRes.body.account.currentBalance).toBe('9460');
  });

  it('creates income and expense transactions with correct net balance', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 10000 });
    const food = await getCategoryByName(agent, 'Food');
    const salary = await getCategoryByName(agent, 'Salary');

    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 540,
      description: 'Swiggy',
      transactionDate: '2026-08-03',
    });
    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: salary.id,
      type: 'INCOME',
      amount: 72000,
      description: 'Salary',
      transactionDate: '2026-08-01',
    });

    const accountRes = await agent.get(`/api/accounts/${account.id}`);
    // 10000 - 540 + 72000
    expect(accountRes.body.account.currentBalance).toBe('81460');
  });

  it('rejects a zero or negative amount', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent);

    const res = await agent.post('/api/transactions').send({
      accountId: account.id,
      type: 'EXPENSE',
      amount: -50,
      description: 'Invalid',
      transactionDate: '2026-08-01',
    });
    expect(res.status).toBe(422);
  });

  it('rejects a nonexistent account', async () => {
    const { agent } = await registerUser();
    const res = await agent.post('/api/transactions').send({
      accountId: '00000000-0000-0000-0000-000000000000',
      type: 'EXPENSE',
      amount: 50,
      description: 'No account',
      transactionDate: '2026-08-01',
    });
    expect(res.status).toBe(404);
  });

  it('rejects a category whose type does not match the transaction type', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent);
    const salary = await getCategoryByName(agent, 'Salary'); // INCOME category

    const res = await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: salary.id,
      type: 'EXPENSE',
      amount: 100,
      description: 'Mismatched category',
      transactionDate: '2026-08-01',
    });
    expect(res.status).toBe(422);
  });

  it('adjusts the balance by the delta when a transaction amount is edited', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 10000 });
    const food = await getCategoryByName(agent, 'Food');

    const createRes = await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 540,
      description: 'Swiggy',
      transactionDate: '2026-08-03',
    });
    const transactionId = createRes.body.transaction.id;

    await agent.patch(`/api/transactions/${transactionId}`).send({ amount: 800 });

    const accountRes = await agent.get(`/api/accounts/${account.id}`);
    expect(accountRes.body.account.currentBalance).toBe('9200'); // 10000 - 800
  });

  it('reverses the balance effect when a transaction is deleted', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 10000 });
    const food = await getCategoryByName(agent, 'Food');

    const createRes = await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 540,
      description: 'Swiggy',
      transactionDate: '2026-08-03',
    });
    const transactionId = createRes.body.transaction.id;

    const deleteRes = await agent.delete(`/api/transactions/${transactionId}`);
    expect(deleteRes.status).toBe(204);

    const accountRes = await agent.get(`/api/accounts/${account.id}`);
    expect(accountRes.body.account.currentBalance).toBe('10000');
  });

  it('paginates results correctly', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent);
    const food = await getCategoryByName(agent, 'Food');

    for (let i = 0; i < 3; i++) {
      await agent.post('/api/transactions').send({
        accountId: account.id,
        categoryId: food.id,
        type: 'EXPENSE',
        amount: 100 + i,
        description: `txn ${i}`,
        transactionDate: '2026-08-01',
      });
    }

    const res = await agent.get('/api/transactions?pageSize=2&page=1');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
  });

  it('filters by type', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent);
    const food = await getCategoryByName(agent, 'Food');
    const salary = await getCategoryByName(agent, 'Salary');

    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 100,
      description: 'expense',
      transactionDate: '2026-08-01',
    });
    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: salary.id,
      type: 'INCOME',
      amount: 5000,
      description: 'income',
      transactionDate: '2026-08-01',
    });

    const res = await agent.get('/api/transactions?type=INCOME');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].type).toBe('INCOME');
  });
});
