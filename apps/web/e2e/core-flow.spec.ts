import { expect, test } from '@playwright/test';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/**
 * The end-to-end spine of the app: register -> create two accounts ->
 * record a transaction -> transfer between the accounts -> confirm the
 * dashboard reflects both, correctly, with real numbers.
 */
test('register, add a transaction, transfer between accounts, and see it on the dashboard', async ({ page }) => {
  const email = uniqueEmail('e2e-core');

  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E Test User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  // Two accounts, needed for the transfer step.
  await page.goto('/accounts');
  await page.getByRole('button', { name: 'New account' }).click();
  await page.getByLabel('Account name').fill('HDFC Savings');
  await page.getByLabel('Opening balance').fill('10000');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('HDFC Savings')).toBeVisible();

  await page.getByRole('button', { name: 'New account' }).click();
  await page.getByLabel('Account name').fill('Investment Account');
  await page.getByLabel('Opening balance').fill('0');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Investment Account')).toBeVisible();

  // A transaction on the primary account.
  await page.goto('/transactions');
  await page.getByRole('button', { name: 'New transaction' }).click();
  await page.getByLabel('Amount (₹)').fill('540');
  await page.getByLabel('Description').fill('Swiggy');
  await page.getByRole('button', { name: 'Add transaction' }).click();
  await expect(page.getByText('Swiggy')).toBeVisible();
  await expect(page.getByText('−₹540.00')).toBeVisible();

  // Transfer 3,000 from HDFC Savings to Investment Account.
  await page.goto('/accounts');
  await page.getByRole('button', { name: 'Transfer' }).click();
  await page.getByLabel('Amount (₹)').fill('3000');
  await page.getByRole('dialog').getByRole('button', { name: 'Transfer' }).click();

  await expect(page.getByText('₹6,460.00')).toBeVisible(); // 10000 - 540 - 3000
  await expect(page.getByText('₹3,000.00')).toBeVisible();

  // Dashboard should reflect both the transaction and the transfer's
  // effect on total balance, without counting the transfer as an expense.
  await page.goto('/dashboard');
  await expect(page.getByText('₹9,460.00')).toBeVisible(); // total balance: 6460 + 3000
  await expect(page.getByText('Swiggy')).toBeVisible();
});
