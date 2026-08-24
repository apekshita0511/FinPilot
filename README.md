# FinPilot

A personal finance and cash-flow management platform. Users manage multiple financial accounts, record income/expenses, transfer money between their own accounts, categorize transactions, set monthly budgets, import transactions from CSV files, and view spending analytics.

This is **not** a banking application — it does not connect to real bank accounts and does not process real payments. Users enter transactions manually or import CSV exports from their financial institution.

**Live**: [finpilot-web-blue.vercel.app](https://finpilot-web-blue.vercel.app)

## Status

Full-stack application, feature-complete for v1, tested against realistic data volume, and deployed to production. See [Roadmap](#roadmap) for what's intentionally out of scope.

## Features

- **Auth**: registration, login/logout, JWT sessions (httpOnly cookies), protected routes
- **Accounts**: multiple accounts per user (bank/cash/credit card/investment/other), archive instead of delete
- **Transactions**: create/edit/delete, paginated + filtered (account, category, type, date range, amount range, description search) + sortable listing
- **Transfers**: atomic money movement between a user's own accounts, with row-level locking to prevent lost updates under concurrent requests (see [Concurrency](#concurrency))
- **Categories**: user-owned, seeded with sensible defaults at registration
- **Budgets**: monthly spending limits per category, with spend/remaining/percent-used always derived live from the transaction ledger
- **CSV import**: upload a CSV, get a per-row validation report, with two-layer duplicate detection (bank reference, then a content fingerprint) so re-importing the same file doesn't double transactions
- **Analytics**: total balance, monthly income/expenses/net cash flow, spending by category, a multi-month cash-flow trend, and budget utilization — all computed by PostgreSQL queries, never by fetching everything into the browser

## Tech Stack

- **Frontend**: React, Vite, TypeScript, React Router — no UI component library, no state-management/data-fetching library (plain `useState`/`useEffect`)
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT (httpOnly cookies), bcrypt password hashing
- **Testing**: Jest + Supertest (backend), Jest + React Testing Library (frontend components), Playwright (critical end-to-end flows)
- **Local dev**: Docker Compose

## Architecture

```
React/Vite  →  REST API (Express)  →  Service layer  →  Prisma  →  PostgreSQL
```

A modular monolith — no microservices. Backend layering is `routes → controllers → services → Prisma`, with business logic and financial-consistency rules living in the service layer, never in controllers.

## Database Design

8 tables: `User`, `Account`, `Category`, `Transaction`, `Transfer`, `Budget`, `ImportBatch`, `AuditEntry`. Notable decisions:

- Money is `NUMERIC(14,2)` throughout, never floating point. Transaction amounts are always stored positive; direction comes from the `type` enum (`INCOME`/`EXPENSE`/`TRANSFER_IN`/`TRANSFER_OUT`), not the sign of the amount.
- `Account.currentBalance` is a materialized value, kept consistent because every write path that changes it (transaction create/edit/delete, transfer) is funneled through one locked, transactional function — never computed ad hoc.
- `Transaction.userId` is deliberately denormalized alongside `accountId`, so the hot-path query (a user's transactions across all their accounts) never needs to join through `Account`.
- CHECK constraints enforce `amount > 0` and `source_account_id <> destination_account_id` at the database level, not just in application code.

## Concurrency

Transfers use Postgres row-level locking (`SELECT ... FOR UPDATE`, in a fixed lock order to avoid deadlocks) so two simultaneous transfers against the same account can't both read a stale balance and both succeed. This was verified by writing a test against a **naive, unlocked** implementation first, watching it fail (two concurrent ₹8,000 transfers from a ₹10,000 balance both "succeeded"), then implementing the fix and rerunning the identical test to see it pass. Both states are preserved in git history (`test: reproduce concurrent transfer race` → `feat: make transfers atomic`).

## Repository Structure

```
finpilot/
├── apps/
│   ├── web/          React + Vite + TypeScript frontend
│   └── api/           Express + TypeScript backend
├── packages/
│   └── shared/         Shared TypeScript types used by both apps
├── docker-compose.yml
└── package.json        npm workspaces root
```

## Local Development

### Option 1 — Docker Compose (recommended)

```bash
cp .env.example .env        # fill in real values (see below)
docker compose up --build
```

This starts Postgres, the API (`http://localhost:4000`), and the web app (`http://localhost:5173`), with source directories mounted for live-reload.

### Option 2 — running apps directly on your machine

```bash
npm install                                # installs all workspaces
docker compose up -d postgres              # Postgres only
cp apps/api/.env.example apps/api/.env     # fill in real values

npm run dev:api     # http://localhost:4000
npm run dev:web     # http://localhost:5173
```

Then apply the schema and (optionally) load seed data:

```bash
cd apps/api
npx prisma migrate deploy
npx tsx prisma/seed.ts       # see "Seed Data" below — destructive, local dev only
```

## Environment Variables

Two separate `.env` files, neither committed:

- **Root `.env`** (used by `docker-compose.yml`): `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
- **`apps/api/.env`** (used when running the API outside Docker): `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `WEB_ORIGIN`.

See `.env.example` and `apps/api/.env.example` for the full list and format. Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Testing

```bash
cd apps/api && npm test          # 69 tests — Jest + Supertest against a real Postgres database
cd apps/web && npm test          # Jest + React Testing Library (component-level)
cd apps/web && npm run test:e2e  # Playwright — needs the api/web dev servers and Postgres running
```

Backend tests run against real Postgres (not mocked) — this is required to prove the transfer-locking behavior actually works, not just that the code compiles. `apps/api/src/tests/jest.setup.ts` truncates every table in whatever database `DATABASE_URL` points to before each test, so point it at a disposable database if you don't want your local dev data cleared.

Playwright covers two critical end-to-end flows: register → create accounts → add a transaction → transfer between accounts → dashboard reflects both correctly; and CSV import → re-importing the identical file is caught as 100% duplicate.

## Seed Data

`apps/api/prisma/seed.ts` generates 50 users — not a shallow multi-tenant spread, but one deliberately heavy user (50,000 transactions across a 3-year span) plus 9 medium users (1,000–5,000 transactions) and 40 light users (50–500 transactions), each with realistic merchant names, category-weighted spending, and monthly salary/rent/utility cadences. All seeded users share the password `password123`. **Destructive** — truncates all tables first; only run it against a database you don't need to keep.

```bash
cd apps/api && npx tsx prisma/seed.ts
```

## Performance Testing

Measured with `EXPLAIN ANALYZE` against the seeded 50,000-transaction heavy user (`heavy@example.com`), on a local Postgres instance — not fabricated, not estimated.

| Query | Plan | Execution time |
|---|---|---|
| Paginated transaction listing (default, date-sorted) | Index Scan Backward on `(userId, transactionDate)` | 0.34 ms |
| Filtered by category + date range | Bitmap Heap Scan on the same index | ~1–2 ms |
| Description search (`ILIKE`) | Index Scan on `(userId, transactionDate)`, filtered | 1.9 ms |
| Sort by amount — **before** adding an index | Sequential Scan across the whole table | 33.98 ms |
| Sort by amount — **after** adding `(userId, amount)` | Index Scan Backward on the new index | 1.95 ms (desc) / 0.58 ms (asc) |

The amount-sort finding is the real optimization story of this project: `EXPLAIN ANALYZE` showed sorting by amount had no supporting index and fell back to scanning the entire `transactions` table, regardless of which user was asking. Adding a `(userId, amount)` composite index turned it into a direct index scan — roughly a **17–59x measured improvement**, evidenced by before/after query plans, not asserted.

All other query shapes (default listing, category filter, spending-by-category, monthly trend) already used the indexes designed in the initial schema and needed no changes.

## Deployment

Live on Vercel:

- **Frontend**: [finpilot-web-blue.vercel.app](https://finpilot-web-blue.vercel.app) — static Vite build.
- **API**: deployed as a single Vercel serverless function (Vercel auto-detects the Express app from `apps/api/src/server.ts`/`app.ts`'s default export — no custom Lambda handler or `vercel.json` rewrites needed for the API itself).
- **Database**: Neon Postgres, provisioned through the Vercel Marketplace.

**Frontend and API are two separate Vercel projects sharing one origin**, not two independent domains — `apps/web/vercel.json` rewrites `/api/*` on the frontend's domain through to the API project. This is a deliberate architectural choice, not just a convenience: auth cookies are `SameSite=Strict`, and `*.vercel.app` is on the public suffix list, so two separate `*.vercel.app` subdomains are different *sites* for cookie purposes — the browser would silently refuse to send the auth cookie cross-domain. Routing through one origin keeps the request genuinely same-site, so the cookie security model designed in Phase 4 needed zero compromises to deploy.

Verified in production (not just locally): registration, login, account creation, transactions, transfers (including the balance math), CSV import with duplicate detection, budgets, and analytics — each checked against the live database, several through actual browser automation against the live URL, not just `curl`.

**Redeploying**: `vercel --prod` from the repository root (after `vercel link --project finpilot-web` or `finpilot-api` — each project's Root Directory is configured server-side to its `apps/*` subdirectory, so deploys must upload the full monorepo tree from root, not from within the subdirectory). Database schema changes: `prisma migrate deploy` against Neon's non-pooled connection string (`vercel env pull` for the values).

## Known Limitations

- CSV duplicate-detection fingerprint can theoretically false-positive on two genuinely different same-day, same-amount, same-description transactions with no bank reference — documented tradeoff, not a bug (see Phase 1 design notes in the build log).
- No rate limiting on `/auth/login` or `/auth/register`.
- Refresh tokens are not rotated on use.
- No cross-currency conversion for transfers between accounts of different currencies.
- Frontend has been visually verified in dark mode via automated browser screenshots; light mode and narrow mobile widths are designed for but not yet manually inspected.

## Roadmap

Out of scope for v1, tracked here rather than implemented:

- Financial goals and savings targets
- Recurring transactions and scheduled transaction generation
- Additional financial reporting
