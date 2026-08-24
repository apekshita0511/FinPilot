import { createAccount, registerUser } from './testUtils';

describe('cross-user authorization', () => {
  it("prevents a user from reading another user's account", async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    const account = await createAccount(alice);

    const res = await bob.get(`/api/accounts/${account.id}`);
    expect(res.status).toBe(404);
  });

  it("prevents a user from updating another user's account", async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    const account = await createAccount(alice);

    const res = await bob.patch(`/api/accounts/${account.id}`).send({ name: 'Hijacked' });
    expect(res.status).toBe(404);
  });

  it("prevents a user from deleting another user's account", async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    const account = await createAccount(alice);

    const res = await bob.delete(`/api/accounts/${account.id}`);
    expect(res.status).toBe(404);
  });

  it("prevents a user from reading another user's transaction, and only lists their own", async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    const aliceAccount = await createAccount(alice);
    const categories = (await alice.get('/api/categories')).body.categories;
    const foodCategory = categories.find((c: { name: string }) => c.name === 'Food');

    const txnRes = await alice.post('/api/transactions').send({
      accountId: aliceAccount.id,
      categoryId: foodCategory.id,
      type: 'EXPENSE',
      amount: 500,
      description: 'Lunch',
      transactionDate: '2026-08-01',
    });
    const transactionId = txnRes.body.transaction.id;

    const getRes = await bob.get(`/api/transactions/${transactionId}`);
    expect(getRes.status).toBe(404);

    const listRes = await bob.get('/api/transactions');
    expect(listRes.body.data).toHaveLength(0);
  });

  it("prevents creating a transaction against another user's account", async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    const aliceAccount = await createAccount(alice);

    const res = await bob.post('/api/transactions').send({
      accountId: aliceAccount.id,
      type: 'EXPENSE',
      amount: 500,
      description: 'Should fail',
      transactionDate: '2026-08-01',
    });

    expect(res.status).toBe(404);
  });

  it("prevents a user from seeing another user's categories", async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    await alice.post('/api/categories').send({ name: "Alice's Custom Category", type: 'EXPENSE' });

    const res = await bob.get('/api/categories');
    const names = res.body.categories.map((c: { name: string }) => c.name);
    expect(names).not.toContain("Alice's Custom Category");
  });
});
