import { createAccount, registerUser } from './testUtils';

describe('categories', () => {
  it('creates a custom category', async () => {
    const { agent } = await registerUser();
    const res = await agent.post('/api/categories').send({ name: 'Gifts', type: 'EXPENSE' });
    expect(res.status).toBe(201);
    expect(res.body.category.name).toBe('Gifts');
  });

  it('rejects a duplicate category name for the same user', async () => {
    const { agent } = await registerUser();
    await agent.post('/api/categories').send({ name: 'Gifts', type: 'EXPENSE' });
    const res = await agent.post('/api/categories').send({ name: 'Gifts', type: 'EXPENSE' });
    expect(res.status).toBe(409);
  });

  it('deletes an unused category', async () => {
    const { agent } = await registerUser();
    const createRes = await agent.post('/api/categories').send({ name: 'Gifts', type: 'EXPENSE' });
    const res = await agent.delete(`/api/categories/${createRes.body.category.id}`);
    expect(res.status).toBe(204);
  });

  it('refuses to delete a category referenced by a transaction', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent);
    const categories = (await agent.get('/api/categories')).body.categories;
    const food = categories.find((c: { name: string }) => c.name === 'Food');

    await agent.post('/api/transactions').send({
      accountId: account.id,
      categoryId: food.id,
      type: 'EXPENSE',
      amount: 100,
      description: 'txn',
      transactionDate: '2026-08-01',
    });

    const res = await agent.delete(`/api/categories/${food.id}`);
    expect(res.status).toBe(409);
  });
});
