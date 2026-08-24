import { createAccount, registerUser } from './testUtils';

describe('transfers', () => {
  it('creates both sides of the ledger correctly and updates both balances', async () => {
    const { agent } = await registerUser();
    const source = await createAccount(agent, { name: 'HDFC Savings', openingBalance: 10000 });
    const destination = await createAccount(agent, { name: 'Investment', openingBalance: 500 });

    const res = await agent.post('/api/transfers').send({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: 3000,
      description: 'Monthly investment',
    });

    expect(res.status).toBe(201);
    const transferId = res.body.transfer.id;

    const sourceRes = await agent.get(`/api/accounts/${source.id}`);
    const destRes = await agent.get(`/api/accounts/${destination.id}`);
    expect(sourceRes.body.account.currentBalance).toBe('7000');
    expect(destRes.body.account.currentBalance).toBe('3500');

    const txns = await agent.get('/api/transactions?sort=date_desc&pageSize=10');
    const debit = txns.body.data.find((t: { type: string }) => t.type === 'TRANSFER_OUT');
    const credit = txns.body.data.find((t: { type: string }) => t.type === 'TRANSFER_IN');

    expect(debit).toBeDefined();
    expect(credit).toBeDefined();
    expect(debit.transferId).toBe(transferId);
    expect(credit.transferId).toBe(transferId);
    expect(debit.amount).toBe('3000');
    expect(credit.amount).toBe('3000');
    expect(debit.accountId).toBe(source.id);
    expect(credit.accountId).toBe(destination.id);
  });

  it('rejects a transfer that exceeds the source balance', async () => {
    const { agent } = await registerUser();
    const source = await createAccount(agent, { openingBalance: 100 });
    const destination = await createAccount(agent, { name: 'Dest' });

    const res = await agent.post('/api/transfers').send({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: 500,
    });

    expect(res.status).toBe(409);
  });

  it('leaves no trace when a transfer is rejected (rollback)', async () => {
    const { agent } = await registerUser();
    const source = await createAccount(agent, { openingBalance: 100 });
    const destination = await createAccount(agent, { name: 'Dest', openingBalance: 0 });

    await agent.post('/api/transfers').send({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: 500,
    });

    const sourceRes = await agent.get(`/api/accounts/${source.id}`);
    const destRes = await agent.get(`/api/accounts/${destination.id}`);
    expect(sourceRes.body.account.currentBalance).toBe('100');
    expect(destRes.body.account.currentBalance).toBe('0');

    const transfersRes = await agent.get('/api/transfers');
    expect(transfersRes.body.transfers).toHaveLength(0);

    const txnsRes = await agent.get('/api/transactions');
    expect(txnsRes.body.data).toHaveLength(0);
  });

  it('rejects a transfer where source and destination are the same account', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 1000 });

    const res = await agent.post('/api/transfers').send({
      sourceAccountId: account.id,
      destinationAccountId: account.id,
      amount: 100,
    });

    expect(res.status).toBe(422);
  });

  it("rejects a transfer out of another user's account", async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    const aliceAccount = await createAccount(alice, { openingBalance: 1000 });
    const bobAccount = await createAccount(bob, { name: 'Bob Account' });

    const res = await bob.post('/api/transfers').send({
      sourceAccountId: aliceAccount.id,
      destinationAccountId: bobAccount.id,
      amount: 100,
    });

    expect(res.status).toBe(404);
  });

  it("rejects a transfer into another user's account", async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    const aliceAccount = await createAccount(alice, { openingBalance: 1000 });
    const bobAccount = await createAccount(bob, { name: 'Bob Account' });

    const res = await alice.post('/api/transfers').send({
      sourceAccountId: aliceAccount.id,
      destinationAccountId: bobAccount.id,
      amount: 100,
    });

    expect(res.status).toBe(404);
  });

  it('refuses to delete or edit a transfer-generated transaction directly', async () => {
    const { agent } = await registerUser();
    const source = await createAccount(agent, { openingBalance: 1000 });
    const destination = await createAccount(agent, { name: 'Dest' });

    await agent.post('/api/transfers').send({
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      amount: 100,
    });

    const txnsRes = await agent.get('/api/transactions');
    const transferTxn = txnsRes.body.data[0];

    const deleteRes = await agent.delete(`/api/transactions/${transferTxn.id}`);
    expect(deleteRes.status).toBe(409);

    const updateRes = await agent.patch(`/api/transactions/${transferTxn.id}`).send({ amount: 50 });
    expect(updateRes.status).toBe(409);
  });

  it("does not list another user's transfers, and enforces ownership on GET /transfers/:id", async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    const aliceSource = await createAccount(alice, { openingBalance: 1000 });
    const aliceDest = await createAccount(alice, { name: 'Alice Dest' });

    const createRes = await alice.post('/api/transfers').send({
      sourceAccountId: aliceSource.id,
      destinationAccountId: aliceDest.id,
      amount: 100,
    });

    const bobListRes = await bob.get('/api/transfers');
    expect(bobListRes.body.transfers).toHaveLength(0);

    const bobGetRes = await bob.get(`/api/transfers/${createRes.body.transfer.id}`);
    expect(bobGetRes.status).toBe(404);
  });
});
