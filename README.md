# FinPilot

A personal finance web app. Users register, add their financial accounts, record
income and expenses, organise them into categories, set monthly budgets, and see a
dashboard of where their money is going.

It is **not** a banking app — it doesn't connect to real banks or move real money.
Everything is entered by the user.

**Live demo:** https://finpilot-web-blue.vercel.app
Login with `demo@finpilot.app` / `password123` (seeded demo account).

---

## Features

| Area | What it does |
|---|---|
| **Auth** | Register / log in / log out. JWT stored in an httpOnly cookie. Passwords hashed with bcrypt. |
| **Accounts** | Create bank / cash / credit-card / investment accounts. Each account's balance is calculated from its opening balance plus all its transactions. "Delete" archives the account so its history is kept. |
| **Categories** | User-owned income/expense categories. Ten sensible defaults are created on sign-up. A category can't be deleted while transactions or budgets still use it. |
| **Transactions** | Full CRUD. List view with filters (account, category, type, text search, date range) and pagination. |
| **Budgets** | A monthly spending limit per category. "Spent" and "remaining" are always calculated live from the transactions, never stored. |
| **Dashboard** | Total balance, this month's income / expenses / net, and spending broken down by category. |

---

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, React Router. Plain `useState`/`useEffect`
  for data fetching (one small `useApiData` hook), CSS Modules for styling.
- **Backend:** Node.js, Express, TypeScript. Layered as `routes → controllers → services → Prisma`.
- **Database:** PostgreSQL, accessed through Prisma ORM.
- **Validation:** Zod schemas on every request body and query string.
- **Auth:** `jsonwebtoken` + `bcrypt`, token in an httpOnly cookie.
- **Local dev:** Docker Compose (Postgres only).

It's an npm-workspaces monorepo:

```
finpilot/
├── apps/
│   ├── web/      React frontend
│   └── api/      Express backend
├── packages/
│   └── shared/   TypeScript types shared by both apps
└── docker-compose.yml
```

---

## Architecture

```
 Browser (React SPA)
        │  fetch('/api/...', { credentials: 'include' })
        ▼
 Express API
   requireAuth        – reads the JWT cookie, sets req.userId
   validate (Zod)     – parses the body / query, 422 on bad input
   controller         – calls one service function, formats the response
   service            – business rules, ownership checks, Prisma calls
        │
        ▼
 PostgreSQL (via Prisma)
```

Rules of the codebase:

- Controllers only deal with HTTP. All logic lives in the service layer.
- Every query is scoped to the logged-in user (`where: { id, userId }`). Asking for
  someone else's row returns **404**, so it doesn't even reveal that the row exists.
- Money is stored as `DECIMAL(14,2)` (never a float). Amounts are always positive;
  the `type` column (`INCOME` / `EXPENSE`) carries the direction.
- Account balances and budget spending are **derived**, not stored — they're always
  a `SUM` over the transactions table.

---

## Database

Five tables: `users`, `accounts`, `categories`, `transactions`, `budgets`.

- `accounts`, `categories`, `transactions`, `budgets` all belong to a `user`
  (`ON DELETE CASCADE`).
- `transactions` → `accounts` (cascade) and → `categories` (`SET NULL`, so deleting a
  category just makes its transactions uncategorised).
- `transactions` stores `user_id` directly (not only `account_id`) so "all of my
  transactions, newest first" is one indexed query with no join.
- Indexes: `(user_id, transaction_date)`, `(account_id, transaction_date)`,
  `(user_id, category_id)`, plus unique constraints on `(user_id, name)` for accounts
  and categories and `(user_id, category_id, year, month)` for budgets.
- A few `CHECK` constraints (`amount > 0`, `limit_amount > 0`, `month BETWEEN 1 AND 12`)
  are added in the migration SQL.

Schema: [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma).

---

## API

All routes are under `/api`. Everything except `/api/health` and `/api/auth/*`
requires the auth cookie.

| Method | Path | |
|---|---|---|
| POST | `/api/auth/register` | also creates the default categories |
| POST | `/api/auth/login` | |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/me` | current user |
| GET/POST | `/api/accounts` · `/api/accounts/:id` (GET/PATCH/DELETE) | DELETE = archive |
| GET/POST | `/api/categories` · `/api/categories/:id` (PATCH/DELETE) | |
| GET/POST | `/api/transactions` · `/api/transactions/:id` (GET/PATCH/DELETE) | GET list takes filter + pagination query params |
| GET/POST | `/api/budgets` · `/api/budgets/:id` (GET/PATCH/DELETE) | |
| GET | `/api/analytics/summary` · `/api/analytics/spending-by-category` | `?year&month` |

---

## Running locally

**Prerequisites:** Node 22+, Docker.

```bash
# 1. install
npm install

# 2. start Postgres
cp .env.example .env
docker compose up -d

# 3. configure the API
cp apps/api/.env.example apps/api/.env       # then set a JWT_SECRET (any 32+ char string)

# 4. create the schema + demo data
npm run db:migrate
npm run db:seed

# 5. run both apps
npm run dev:api     # http://localhost:4000
npm run dev:web     # http://localhost:5173
```

The Vite dev server proxies `/api` to `localhost:4000`.

---

## Deployment

Deployed on **Vercel** as two projects from this one repo:

- **web** — static Vite build. `apps/web/vercel.json` does two things: serve
  `index.html` for any unknown path (SPA routing), and rewrite `/api/*` to the API
  project. Routing the API through the same origin keeps the auth cookie
  `SameSite=Strict` working (two different `*.vercel.app` subdomains count as
  different sites, so the cookie wouldn't be sent otherwise).
- **api** — the Express app is exported as a default from `src/app.ts`, which Vercel
  runs as a single serverless function.
- **database** — Postgres on Neon.

---

## Notes / what I'd do next

- The JWT is a single 7-day token. A production version would use a short access
  token + refresh token, and a token denylist so logout is enforced server-side.
- No rate limiting on login/register yet.
- Transaction search uses `ILIKE '%term%'`, which can't use an index — fine at
  personal scale, but a trigram index would be the fix.
- No automated tests in this version.
