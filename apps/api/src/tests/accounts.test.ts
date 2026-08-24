import { createAccount, registerUser } from './testUtils';

describe('accounts', () => {
  it('creates an account with currentBalance equal to openingBalance', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 5000 });
    expect(account.openingBalance).toBe('5000');
    expect(account.currentBalance).toBe('5000');
    expect(account.isActive).toBe(true);
  });

  it('rejects a duplicate account name for the same user', async () => {
    const { agent } = await registerUser();
    await createAccount(agent, { name: 'HDFC Savings' });
    const res = await agent
      .post('/api/accounts')
      .send({ name: 'HDFC Savings', accountType: 'BANK', currency: 'INR', openingBalance: 100 });
    expect(res.status).toBe(409);
  });

  it('rejects an invalid accountType', async () => {
    const { agent } = await registerUser();
    const res = await agent
      .post('/api/accounts')
      .send({ name: 'Bad', accountType: 'CRYPTO', currency: 'INR', openingBalance: 100 });
    expect(res.status).toBe(422);
  });

  it('lists only the current user accounts', async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    await createAccount(alice, { name: 'Alice Account' });
    await createAccount(bob, { name: 'Bob Account' });

    const res = await alice.get('/api/accounts');
    expect(res.body.accounts).toHaveLength(1);
    expect(res.body.accounts[0].name).toBe('Alice Account');
  });

  it('archives an account instead of hard-deleting it', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent);

    const res = await agent.delete(`/api/accounts/${account.id}`);
    expect(res.status).toBe(200);
    expect(res.body.account.isActive).toBe(false);

    const getRes = await agent.get(`/api/accounts/${account.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.account.currentBalance).toBe(account.currentBalance);
  });
});
