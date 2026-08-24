import request from 'supertest';

import { createAccount, registerUser } from './testUtils';

async function getCategoryByName(agent: ReturnType<typeof request.agent>, name: string) {
  const res = await agent.get('/api/categories');
  return res.body.categories.find((c: { name: string }) => c.name === name);
}

function csvBuffer(content: string) {
  return Buffer.from(content, 'utf-8');
}

describe('CSV import', () => {
  it('imports valid rows and updates the account balance', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent, { openingBalance: 10000 });

    const csv = [
      'Date,Description,Amount,Type',
      '2026-08-01,Salary,72000,INCOME',
      '2026-08-02,Amazon,2499,EXPENSE',
      '2026-08-03,Swiggy,540,EXPENSE',
    ].join('\n');

    const res = await agent
      .post('/api/imports/transactions')
      .field('accountId', account.id)
      .attach('file', csvBuffer(csv), 'transactions.csv');

    expect(res.status).toBe(201);
    expect(res.body.totalRows).toBe(3);
    expect(res.body.importedRows).toBe(3);
    expect(res.body.duplicateRows).toBe(0);
    expect(res.body.failedRows).toBe(0);
    expect(res.body.errors).toHaveLength(0);

    const accountRes = await agent.get(`/api/accounts/${account.id}`);
    // 10000 + 72000 - 2499 - 540
    expect(accountRes.body.account.currentBalance).toBe('78961');

    const txnsRes = await agent.get('/api/transactions?sort=date_asc');
    expect(txnsRes.body.data).toHaveLength(3);
    expect(txnsRes.body.data.every((t: { source: string }) => t.source === 'IMPORT')).toBe(true);
  });

  it('reports malformed rows without importing them', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent);

    const csv = [
      'Date,Description,Amount,Type',
      '2026-08-01,Good Row,100,EXPENSE',
      'not-a-date,Bad Date,100,EXPENSE',
      '2026-08-02,No Description,,EXPENSE',
      '2026-08-03,Bad Amount,not-a-number,EXPENSE',
      '2026-08-04,Bad Type,100,SIDEWAYS',
      '2026-08-05,Negative Amount,-50,EXPENSE',
    ].join('\n');

    const res = await agent
      .post('/api/imports/transactions')
      .field('accountId', account.id)
      .attach('file', csvBuffer(csv), 'transactions.csv');

    expect(res.status).toBe(201);
    expect(res.body.totalRows).toBe(6);
    expect(res.body.importedRows).toBe(1);
    expect(res.body.failedRows).toBe(5);
    expect(res.body.errors).toHaveLength(5);
    expect(res.body.errors[0]).toMatchObject({ row: 2 });
  });

  it('detects an exact duplicate on re-import (same file imported twice)', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent);

    const csv = ['Date,Description,Amount,Type', '2026-08-01,Swiggy,540,EXPENSE'].join('\n');

    const first = await agent
      .post('/api/imports/transactions')
      .field('accountId', account.id)
      .attach('file', csvBuffer(csv), 'transactions.csv');
    expect(first.body.importedRows).toBe(1);
    expect(first.body.duplicateRows).toBe(0);

    const second = await agent
      .post('/api/imports/transactions')
      .field('accountId', account.id)
      .attach('file', csvBuffer(csv), 'transactions.csv');
    expect(second.body.importedRows).toBe(0);
    expect(second.body.duplicateRows).toBe(1);

    // The account balance must reflect the transaction only once.
    const txnsRes = await agent.get('/api/transactions');
    expect(txnsRes.body.data).toHaveLength(1);
  });

  it('deduplicates identical rows within a single file', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent);

    const csv = [
      'Date,Description,Amount,Type',
      '2026-08-01,Swiggy,540,EXPENSE',
      '2026-08-01,Swiggy,540,EXPENSE',
    ].join('\n');

    const res = await agent
      .post('/api/imports/transactions')
      .field('accountId', account.id)
      .attach('file', csvBuffer(csv), 'transactions.csv');

    expect(res.body.totalRows).toBe(2);
    expect(res.body.importedRows).toBe(1);
    expect(res.body.duplicateRows).toBe(1);
  });

  it('does not treat two genuinely different same-day same-amount rows as duplicates when they have distinct references', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent);

    const csv = [
      'Date,Description,Amount,Type,Reference',
      '2026-08-01,Coffee,100,EXPENSE,REF001',
      '2026-08-01,Coffee,100,EXPENSE,REF002',
    ].join('\n');

    const res = await agent
      .post('/api/imports/transactions')
      .field('accountId', account.id)
      .attach('file', csvBuffer(csv), 'transactions.csv');

    expect(res.body.importedRows).toBe(2);
    expect(res.body.duplicateRows).toBe(0);
  });

  it('resolves an optional Category column against the user\'s own categories', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent);
    const food = await getCategoryByName(agent, 'Food');

    const csv = ['Date,Description,Amount,Type,Category', '2026-08-01,Swiggy,540,EXPENSE,Food'].join('\n');

    await agent
      .post('/api/imports/transactions')
      .field('accountId', account.id)
      .attach('file', csvBuffer(csv), 'transactions.csv');

    const txnsRes = await agent.get('/api/transactions');
    expect(txnsRes.body.data[0].categoryId).toBe(food.id);
  });

  it('rejects import against a nonexistent or unowned account', async () => {
    const { agent } = await registerUser();
    const csv = ['Date,Description,Amount,Type', '2026-08-01,Swiggy,540,EXPENSE'].join('\n');

    const res = await agent
      .post('/api/imports/transactions')
      .field('accountId', '00000000-0000-0000-0000-000000000000')
      .attach('file', csvBuffer(csv), 'transactions.csv');

    expect(res.status).toBe(404);
  });

  it('rejects a non-csv file', async () => {
    const { agent } = await registerUser();
    const account = await createAccount(agent);

    const res = await agent
      .post('/api/imports/transactions')
      .field('accountId', account.id)
      .attach('file', Buffer.from('not a csv'), 'transactions.txt');

    expect(res.status).toBe(422);
  });

  it('lists import history and enforces ownership on individual batches', async () => {
    const { agent: alice } = await registerUser({ email: 'alice@example.com' });
    const { agent: bob } = await registerUser({ email: 'bob@example.com' });

    const account = await createAccount(alice);
    const csv = ['Date,Description,Amount,Type', '2026-08-01,Swiggy,540,EXPENSE'].join('\n');

    const importRes = await alice
      .post('/api/imports/transactions')
      .field('accountId', account.id)
      .attach('file', csvBuffer(csv), 'transactions.csv');

    const aliceListRes = await alice.get('/api/imports');
    expect(aliceListRes.body.importBatches).toHaveLength(1);

    const bobListRes = await bob.get('/api/imports');
    expect(bobListRes.body.importBatches).toHaveLength(0);

    const bobGetRes = await bob.get(`/api/imports/${importRes.body.importBatch.id}`);
    expect(bobGetRes.status).toBe(404);
  });
});
