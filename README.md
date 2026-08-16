# TokTickIT - IT Service Desk

## Project Setup Instructions

1. Clone the repository.
2. Run `npm install` in both the `client/` and `server/` directories.
3. Copy `.env.example` to `.env` in the `server/` directory and update your PostgreSQL `DATABASE_URL`.
4. Run `npx prisma migrate dev` in the `server/` directory to setup the database.
5. Run `npm run dev` in both `client/` and `server/` to start the development servers.
