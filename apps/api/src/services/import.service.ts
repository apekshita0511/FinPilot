import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';
import { computeFingerprint, parseAndValidateCsv, type CsvRowError, type ParsedCsvRow } from '../lib/csvImport';
import { adjustAccountBalance } from './balance.service';
import { recordAudit } from './audit.service';

const INSERT_CHUNK_SIZE = 500;

interface RowToInsert extends ParsedCsvRow {
  categoryId: string | null;
  fingerprint: string | null;
}

export async function importTransactionsFromCsv(
  userId: string,
  accountId: string,
  filename: string,
  fileBuffer: Buffer,
) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }

  const { validRows, errors, totalRows } = parseAndValidateCsv(fileBuffer);

  // Resolve optional Category column against the user's own categories
  // (case-insensitive name match, must match the row's INCOME/EXPENSE
  // type). Unmatched or absent category names are left uncategorized
  // rather than treated as a row failure — it's an enrichment, not a
  // required field for this CSV format.
  const categories = await prisma.category.findMany({ where: { userId } });
  const categoryLookup = new Map(categories.map((c) => [`${c.name.toLowerCase()}|${c.type}`, c.id]));

  const rowsWithCategory = validRows.map((row) => ({
    ...row,
    categoryId: row.categoryName ? (categoryLookup.get(`${row.categoryName.toLowerCase()}|${row.type}`) ?? null) : null,
  }));

  // Two-layer duplicate detection (see FinPilot Phase 1 design): prefer a
  // bank-provided reference when the CSV has one, fall back to a content
  // fingerprint otherwise. Checked against both what's already persisted
  // for this account AND against earlier rows in this same file, so a CSV
  // containing the same row twice doesn't import it twice either.
  const referenceValues = rowsWithCategory.filter((r) => r.externalReference).map((r) => r.externalReference!);
  const withFingerprint = rowsWithCategory
    .filter((r) => !r.externalReference)
    .map((r) => ({ ...r, fingerprint: computeFingerprint(accountId, r.transactionDate, r.amount, r.description, r.type) }));
  const fingerprintValues = withFingerprint.map((r) => r.fingerprint);

  const [existingByReference, existingByFingerprint] = await Promise.all([
    referenceValues.length
      ? prisma.transaction.findMany({
          where: { accountId, externalReference: { in: referenceValues } },
          select: { externalReference: true },
        })
      : Promise.resolve([]),
    fingerprintValues.length
      ? prisma.transaction.findMany({
          where: { accountId, fingerprint: { in: fingerprintValues } },
          select: { fingerprint: true },
        })
      : Promise.resolve([]),
  ]);

  const seenReferences = new Set(existingByReference.map((r) => r.externalReference!));
  const seenFingerprints = new Set(existingByFingerprint.map((r) => r.fingerprint!));

  const toInsert: RowToInsert[] = [];
  let duplicateRows = 0;

  for (const row of rowsWithCategory) {
    if (row.externalReference) {
      if (seenReferences.has(row.externalReference)) {
        duplicateRows++;
        continue;
      }
      seenReferences.add(row.externalReference); // catches duplicates within the same file
      toInsert.push({ ...row, fingerprint: null });
    } else {
      const fingerprint = computeFingerprint(accountId, row.transactionDate, row.amount, row.description, row.type);
      if (seenFingerprints.has(fingerprint)) {
        duplicateRows++;
        continue;
      }
      seenFingerprints.add(fingerprint);
      toInsert.push({ ...row, fingerprint });
    }
  }

  const netDelta = toInsert.reduce(
    (sum, row) => (row.type === 'INCOME' ? sum.plus(row.amount) : sum.minus(row.amount)),
    new Prisma.Decimal(0),
  );

  const importBatch = await prisma.$transaction(async (tx) => {
    const batch = await tx.importBatch.create({
      data: {
        userId,
        accountId,
        filename,
        totalRows,
        importedRows: toInsert.length,
        duplicateRows,
        failedRows: errors.length,
        status: 'COMPLETED',
      },
    });

    for (let i = 0; i < toInsert.length; i += INSERT_CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + INSERT_CHUNK_SIZE);
      await tx.transaction.createMany({
        data: chunk.map((row) => ({
          userId,
          accountId,
          categoryId: row.categoryId,
          type: row.type,
          amount: row.amount,
          description: row.description,
          transactionDate: new Date(row.transactionDate),
          source: 'IMPORT',
          externalReference: row.externalReference,
          fingerprint: row.fingerprint,
          importBatchId: batch.id,
        })),
      });
    }

    if (!netDelta.isZero()) {
      await adjustAccountBalance(tx, accountId, netDelta);
    }

    await recordAudit(tx, {
      userId,
      action: 'CSV_IMPORTED',
      entityType: 'ImportBatch',
      entityId: batch.id,
      metadata: { accountId, filename, totalRows, imported: toInsert.length, duplicates: duplicateRows, failed: errors.length },
    });

    return batch;
  });

  return {
    importBatch,
    totalRows,
    importedRows: toInsert.length,
    duplicateRows,
    failedRows: errors.length,
    errors,
  };
}

export async function listImportBatches(userId: string) {
  return prisma.importBatch.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { account: { select: { id: true, name: true } } },
  });
}

export async function getImportBatch(userId: string, importBatchId: string) {
  const batch = await prisma.importBatch.findFirst({
    where: { id: importBatchId, userId },
    include: { account: { select: { id: true, name: true } } },
  });
  if (!batch) {
    throw new ApiError(404, 'Import batch not found');
  }
  return batch;
}

export type { CsvRowError };
