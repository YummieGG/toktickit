# TokTickIT - IT Service Desk

TokTickIT is an IT service desk management system designed for logging, tracking, and resolving IT service requests.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, React Router 7, Bootstrap 5
- **Backend**: Node.js, Express 5, TypeScript, TSX
- **Database & ORM**: PostgreSQL 15, Prisma ORM 7 (with `@prisma/adapter-pg`)
- **Testing**: Vitest, Supertest, React Testing Library, Playwright

---

## Prerequisites

Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (version 18 or higher, recommended 20+)
- [Docker](https://www.docker.com/) & Docker Compose
- [npm](https://www.npmjs.com/) (bundled with Node.js)

---

## Quick Start / Setup Guide

Follow these steps in order after cloning the repository.

### 1. Clone the Repository

```bash
git clone https://github.com/YummieGG/toktickit.git
cd toktickit
```

---

### 2. Start PostgreSQL Database (Docker)

Start the PostgreSQL database container in the background:

```bash
docker compose up -d
```

> **Note:** If you previously started a Postgres container with different credentials, reset the volume:
> ```bash
> docker compose down -v
> docker compose up -d
> ```

---

### 3. Server Setup (Backend)

Open a new terminal and navigate to the `server` directory:

```bash
cd server

# 1. Install dependencies
npm install

# 2. Copy the environment variables template
cp .env.example .env

# 3. Set SEED_INITIAL_PASSWORD and AUTH_IP_PEPPER in .env to your own
#    local secret values. Do not use or commit shared/example credentials.

# 4. Apply database migrations and seed initial data
npx prisma migrate dev

# 5. Verify the seed is idempotent (safe to run more than once)
npx prisma db seed
npx prisma db seed

# 6. Start the backend development server
npm run dev
```

The backend server will run at `http://localhost:3000`.

The local seed creates deterministic Requester, IT Staff, and Administrator
accounts. Their initial password is the value you set in the uncommitted
`server/.env` as `SEED_INITIAL_PASSWORD`; the repository intentionally does
not publish a usable credential. The seeded sign-in emails are:

- Requesters: `somchai.p@toktickit.local`, `suda.s@toktickit.local`,
  `anan.s@toktickit.local`, `kanda.m@toktickit.local`, and inactive
  `wichai.r@toktickit.local`.
- IT Staff: `narin.staff@toktickit.local`, `pimchanok.staff@toktickit.local`,
  `chaiwat.staff@toktickit.local`, and inactive `somsak.staff@toktickit.local`.
- Administrator: `araya.admin@toktickit.local`.

---

### 4. Client Setup (Frontend)

Open another terminal and navigate to the `client` directory:

```bash
cd client

# 1. Install dependencies
npm install

# 2. Start the frontend development server
npm run dev
```

The frontend will run at `http://localhost:5173` (or the port indicated in your terminal).

---

### 5. E2E Setup (Playwright)

From the repository root, install the E2E dependencies and Chromium once:

```bash
cd e2e
npm install
npx playwright install chromium
```

The default E2E suite uses deterministic API fixtures and starts the Vite client automatically. It covers the complete requester flow and responsive evidence at 1280px, 768px, and 375px:

```bash
cd e2e
npm test
```

The live integration suite starts both the backend and frontend and requires a
freshly migrated and seeded disposable PostgreSQL database. Set the following
values locally before running it:

- `SEED_INITIAL_PASSWORD`
- `E2E_TEST_PASSWORD`
- `AUTH_IP_PEPPER`

Follow the exact clean-setup commands in
[`docs/lab-03/tests.md`](docs/lab-03/tests.md) before running:

```bash
cd e2e
npm run test:live
```

These values are local-only and must not be committed or published.

---

## Running Automated Tests

### Backend Tests (Server)
Tests covering API endpoints, health check, master data, ticket generation, and concurrency safety:

```bash
cd server
npm test
```

To run a specific test file:
```bash
npx vitest run tests/lab-02/tickets.api.test.ts
```

To run the Administrator and clean migration/seed PostgreSQL integration checks, use an isolated
PostgreSQL database and provide its connection string explicitly. The example below creates and
removes a disposable database through the repository's Compose service:
```bash
docker compose up -d db
export TEST_DATABASE_NAME="toktickit_admin_test_local"
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/${TEST_DATABASE_NAME}?schema=public"
docker compose exec -T db psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS \"${TEST_DATABASE_NAME}\" WITH (FORCE)"
docker compose exec -T db psql -U postgres -d postgres -c "CREATE DATABASE \"${TEST_DATABASE_NAME}\""
cd server
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test:integration
cd ..
docker compose exec -T db psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS \"${TEST_DATABASE_NAME}\" WITH (FORCE)"
```
The integration suite creates uniquely named records and removes them during
cleanup. It verifies real transaction rollback, owner unassignment, session
revocation, role/origin guards, and concurrent last-Administrator protection.

### Frontend Tests (Client)
Tests covering UI components, loading states, forms, and validation:

```bash
cd client
npm test
```

To run a specific test file:
```bash
npx vitest run tests/lab-02/CreateTicket.test.tsx
```

To run the production build checks:
```bash
cd server && npm run build
cd ../client && npm run build
cd ../e2e && npm test
```

---

## Database Management & Useful Commands

| Command | Working Directory | Description |
| :--- | :--- | :--- |
| `docker compose up -d` | root | Start Postgres container |
| `docker compose down` | root | Stop Postgres container |
| `docker compose down -v` | root | Stop container and clear persistent data |
| `npx prisma studio` | `server/` | Open visual database viewer at `http://localhost:5555` |
| `npx prisma db seed` | `server/` | Manually re-run the seed script |
| `npx prisma migrate reset` | `server/` | Reset database schema and re-run all migrations + seed |

---

## Troubleshooting

### 1. Port 5432 Already in Use
If you already have a local PostgreSQL instance running on port `5432`, modify the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432" # Maps host port 5433 to container port 5432
```
And update `server/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/toktickit_db?schema=public"
```

### 2. Authentication Failed (`P1000`)
If you get `Authentication failed against database server`, your Docker volume likely cached previous credentials. Run:
```bash
docker compose down -v
docker compose up -d
```
Then rerun `npx prisma migrate dev` in the `server` directory.

### 3. Missing Prisma Client (`Cannot find module '../../generated/prisma'`)
Regenerate the Prisma Client by running:
```bash
cd server
npx prisma generate
```
