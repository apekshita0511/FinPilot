import { expect, test } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

const CSV_CONTENT = [
  'Date,Description,Amount,Type',
  '2026-08-01,Salary,72000,INCOME',
  '2026-08-02,Amazon,2499,EXPENSE',
  '2026-08-03,Swiggy,540,EXPENSE',
].join('\n');

test('imports a CSV once, then detects the same file as fully duplicate on re-import', async ({ page }) => {
  const email = uniqueEmail('e2e-csv');
  const dir = mkdtempSync(join(tmpdir(), 'finpilot-e2e-'));
  const csvPath = join(dir, 'transactions.csv');
  writeFileSync(csvPath, CSV_CONTENT);

  await page.goto('/register');
  await page.getByLabel('Name').fill('E2E CSV User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/accounts');
  await page.getByRole('button', { name: 'New account' }).click();
  await page.getByLabel('Account name').fill('HDFC Savings');
  await page.getByLabel('Opening balance').fill('10000');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('HDFC Savings')).toBeVisible();

  await page.goto('/import');
  await page.locator('#csv-file-input').setInputFiles(csvPath);
  await page.getByRole('button', { name: 'Import' }).click();

  // Scoped to the summary card specifically — "Imported"/"Duplicates" also
  // appear as column headers in the import-history table further down the
  // page, so an unscoped text match is ambiguous.
  const summaryCard = page.getByRole('heading', { name: 'Import summary' }).locator('../..');
  await expect(summaryCard.getByText('Total rows').locator('..')).toContainText('3');
  await expect(summaryCard.getByText('Imported', { exact: true }).locator('..')).toContainText('3');
  await expect(summaryCard.getByText('Duplicates').locator('..')).toContainText('0');

  // 10000 + 72000 - 2499 - 540
  await page.goto('/accounts');
  await expect(page.getByText('₹78,961.00')).toBeVisible();

  // Re-importing the identical file must not create duplicate transactions
  // or move the balance again.
  await page.goto('/import');
  await page.locator('#csv-file-input').setInputFiles(csvPath);
  await page.getByRole('button', { name: 'Import' }).click();

  await expect(summaryCard.getByText('Imported', { exact: true }).locator('..')).toContainText('0');
  await expect(summaryCard.getByText('Duplicates').locator('..')).toContainText('3');

  await page.goto('/accounts');
  await expect(page.getByText('₹78,961.00')).toBeVisible();

  await page.goto('/transactions');
  await expect(page.getByText('Swiggy')).toHaveCount(1);
});
