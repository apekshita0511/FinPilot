# FinPilot

A personal finance and cash-flow management platform. Users manage multiple financial accounts, record income/expenses, transfer money between their own accounts, categorize transactions, set monthly budgets, and import transactions from CSV files.

This is **not** a banking application — it does not connect to real bank accounts and does not process real payments. Users enter transactions manually or import CSV exports from their financial institution.

## Status

Project scaffolding only. No application features are implemented yet — see [Roadmap](#roadmap) and the phase-by-phase build log for what's coming.

## Tech Stack

- **Frontend**: React, Vite, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT (httpOnly cookies), bcrypt password hashing
- **Testing**: Jest, Supertest, React Testing Library, Playwright
- **Local dev**: Docker Compose

## Architecture

```
React/Vite  →  REST API (Express)  →  Service layer  →  Prisma  →  PostgreSQL
```

A modular monolith — no microservices. See `apps/api/src` for the routes → controllers → services layering.

## Repository Structure

```
finpilot/
├── apps/
│   ├── web/        React + Vite + TypeScript frontend
│   └── api/         Express + TypeScript backend
├── packages/
│   └── shared/       Shared TypeScript types used by both apps
├── docker-compose.yml
└── package.json      npm workspaces root
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

## Environment Variables

Two separate `.env` files, neither committed:

- **Root `.env`** (used by `docker-compose.yml`): `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
- **`apps/api/.env`** (used when running the API outside Docker): `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `WEB_ORIGIN`.

See `.env.example` and `apps/api/.env.example` for the full list and format. Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Roadmap

Out of scope for v1, tracked here rather than implemented:

- Financial goals and savings targets
- Recurring transactions and scheduled transaction generation
- Additional financial reporting
