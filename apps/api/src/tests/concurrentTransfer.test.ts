import { createAccount, registerUser } from './testUtils';

/**
 * FinPilot's core concurrency proof (see Phase 1 design doc + Phase 5 build).
 *
 * Setup: one account with a ₹10,000 balance. Two requests arrive at
 * approximately the same instant, each attempting to transfer ₹8,000 out
 * of it. Only one can legitimately succeed — the account cannot cover both.
 *
 * Against the naive implementation (services/transfer.service.ts as of the
 * "test: reproduce concurrent transfer race" commit), this test FAILS: both
 * requests read the pre-transfer balance before either writes, both pass
 * the sufficient-funds check, and both commit — a classic lost update.
 * The final balance is wrong and/or both transfers "succeed" when only one
 * should have.
 *
 * After the "feat: make transfers atomic" commit (SELECT ... FOR UPDATE
 * locking), this exact test passes: exactly one request succeeds, the
 * other is rejected with 409, and the final balance is exactly ₹2,000 —
 * never negative, never double-debited.
 */
describe('concurrent transfers (lost-update race condition)', () => {
  it('only allows one of two simultaneous ₹8,000 transfers from a ₹10,000 balance to succeed', async () => {
    const { agent } = await registerUser();
    const source = await createAccount(agent, { name: 'HDFC Savings', openingBalance: 10000 });
    const destination = await createAccount(agent, { name: 'Investment Account', openingBalance: 0 });

    const attemptTransfer = () =>
      agent.post('/api/transfers').send({
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
        amount: 8000,
      });

    // Fired concurrently, not sequentially — both requests are in flight
    // against the database at the same time.
    const [resultA, resultB] = await Promise.all([attemptTransfer(), attemptTransfer()]);

    const statuses = [resultA.status, resultB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const successCount = [resultA, resultB].filter((r) => r.status === 201).length;
    expect(successCount).toBe(1);

    const accountRes = await agent.get(`/api/accounts/${source.id}`);
    expect(accountRes.body.account.currentBalance).toBe('2000');

    const destinationRes = await agent.get(`/api/accounts/${destination.id}`);
    expect(destinationRes.body.account.currentBalance).toBe('8000');

    // The ledger must agree with the balance: exactly one TRANSFER_OUT row.
    const transactionsRes = await agent.get(`/api/transactions?accountId=${source.id}&type=TRANSFER_OUT`);
    expect(transactionsRes.body.data).toHaveLength(1);
  });
});
