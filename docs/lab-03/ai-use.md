# Lab 3 AI Use Log

## LLM Used
- **Gemini Flash 3.8**
- **GPT Luna 5.6**

## Key Prompts

| # | Prompt Summary | Purpose | Outcome |
|---|---------------|---------|---------|
| 1 | Decompose Sprint 3 requirements into 4 contract documents | Establish engineering specification before coding | Created `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` with full traceability |
| 2 | Create User and UserSession models with scrypt hashing and cookie sessions | Build database models and authentication foundation | Added Prisma migrations, scrypt password hashing, and secure `tt_session` cookie handling |
| 3 | Implement login rate limiting by email and IP with a 15-minute cooldown | Protect against brute-force and credential stuffing | Implemented 5-attempt limit and uniform safe error messages |
| 4 | Remove requester selector and enforce session-based ticket ownership | Eliminate client-side user spoofing | Scoped queries to authenticated user and added fail-closed checks |
| 5 | Implement 8-state ticket lifecycle and concurrency conflict handling | Build IT Staff ticket workflow and status transitions | Created state machine with confirmation dialogs and 409 conflict detection |
| 6 | Implement Administrator user management and safety rules | Build admin UI and protect critical accounts | Added user CRUD, password reset, last-admin guard, and ticket unassignment |
| 7 | Update database seed script to keep legacy Lab 2 ticket timestamps | Preserve original data during password backfill | Seed runs safely multiple times without altering existing ticket dates |
| 8 | Adjust priority badge colors to pass WCAG AA contrast requirements | Ensure accessible colors for Medium and High badges | Set distinct colors (`#7A4B00` Medium, `#8A2E00` High) meeting 4.5:1 contrast |
| 9 | Fix Windows test runner errors with `process.execPath` and Playwright `env` | Ensure cross-platform compatibility on Windows | Replaced POSIX shell commands with platform-independent settings |
| 10 | Create live Playwright test for browser, server, and PostgreSQL integration | Test the complete system with a real database | Verified real login, password change, CSRF protection, and session logout |

## My Reflection

Using AI with a clear engineering contract made developing Lab 3 much faster and easier. Having `specification.md` and `tests.md` ready before coding helped the AI generate database schemas, API routes, and React components with fewer mistakes.

However, human oversight and peer review with `@Snnn3` were still very important. The AI struggled with real environment issues, such as Windows shell errors (`.bin/tsx`), badge color contrast, and test race conditions. By testing everything locally and reviewing the code carefully, I was able to guide the AI to fix these issues. AI is a great coding assistant, but the developer must always verify the actual results.
