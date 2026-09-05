# TokTickIT - IT Service Desk

TokTickIT is an IT service desk management system designed for logging, tracking, and resolving IT service requests.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, React Router 7, Bootstrap 5
- **Backend**: Node.js, Express 5, TypeScript, TSX
- **Database & ORM**: PostgreSQL 15, Prisma ORM 7 (with `@prisma/adapter-pg`)
- **Testing**: Vitest, Supertest, React Testing Library

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

# 3. Apply database migrations and seed initial data
npx prisma migrate dev

# 4. Start the backend development server
npm run dev
```

The backend server will run at `http://localhost:3000`.

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
