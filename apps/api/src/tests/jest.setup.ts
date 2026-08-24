import 'dotenv/config';

import { prisma } from '../lib/prisma';
import { cleanDatabase } from './testUtils';

// These tests run against a real Postgres database (the DATABASE_URL in
// apps/api/.env), not a mock — see FinPilot Phase 1's testing strategy:
// transfer/locking correctness can only be proven against a real DB.
// Every test starts from an empty database.
//
// KNOWN LIMITATION: this truncates every table in whatever database
// DATABASE_URL points to before each test. It targets your local dev
// database by default. If you want to keep dev data around between test
// runs, point DATABASE_URL at a separate database before running `npm test`.
beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
