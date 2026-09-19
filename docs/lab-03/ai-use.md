# Lab 3 — AI Use and Reflection

**LLMs/Agents Used:**
- Google DeepMind Antigravity Coding Agent (Gemini 2.5 Pro)
- OpenAI Codex / GPT-4o & GPT-5-based coding assistants

---

## Key Prompts Used

| # | Prompt Used | Result / Practical Engineering Outcome |
|---|---|---|
| 1 | *Read `labsheet/md/Lab_03_labsheet.md` and decompose the Sprint 3 requirements into four synchronized engineering contract documents (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) before any implementation.* | Established the authoritative single source of truth: 21 business rules (BR-01 to BR-21), 14 acceptance criteria (AC-01 to AC-14), explicit status transition table, and complete test traceability. |
| 2 | *Implement the User and UserSession schema in Prisma, using Argon2id for password hashing and opaque cryptographically secure random session tokens stored as SHA-256 hashes in PostgreSQL.* | Created the database migration, `UserSession` model, session middleware, and `tt_session` HttpOnly / SameSite=Lax cookie authentication mechanism. |
| 3 | *Design a rate limiter for login attempts combining normalized email and client IP with a sliding 15-minute cooldown window, ensuring no account existence leakage.* | Implemented `LoginAttempt` tracking with safe unified error messages (`INVALID_CREDENTIALS`), preventing brute-force and credential stuffing attacks without user enumeration. |
| 4 | *Refactor the application shell and ticketing endpoints to eliminate the development `RequesterSelect` and client `requesterId` injection, enforcing ownership strictly from the authenticated session.* | Enforced backend fail-closed authorization scoping (`{ id: -1 }`), returning `404 Not Found` for cross-tenant access and preventing tampering vectors. |
| 5 | *Implement the 8-state IT Staff ticket lifecycle with role-scoped transition validation, confirmation dialogs, and optimistic concurrency locking using `updatedAt`.* | Built the state transition machine with `409 CONFLICT` handling, ensuring simultaneous staff updates cannot overwrite each other silently. |
| 6 | *Implement Administrator user management with critical safety rules: prevent self-deactivation, prevent deactivating the last active Admin, and transactionally unassign tickets when staff are deactivated.* | Implemented transactional safety invariants in `server/src/routes/admin/users.ts` with comprehensive unit and database integration tests. |
| 7 | *Update `server/prisma/seed.ts` and migration tests to ensure legacy Lab 2 tickets preserve their original `updatedAt` and `createdAt` timestamps when backfilling user passwords.* | Prevented unintended timestamp mutation during database backfill and ensured strict seed idempotency across multiple runs. |
| 8 | *Adjust priority badge colors so that Medium (Amber) and High (Orange) both exceed WCAG AA 4.5:1 text contrast while preserving distinct visual identification.* | Selected `#7A4B00` on amber background and `#8A2E00` on orange background, verified via automated color-contrast unit tests. |
| 9 | *Diagnose and fix cross-platform test failures on Windows environments where `.bin/tsx` and inline POSIX environment variables fail.* | Refactored seed test spawning to use `process.execPath` with direct module path, and moved Playwright web server variables into the cross-platform `webServer.env` configuration. |
| 10 | *Build a live Playwright integration test that exercises the real browser-to-server-to-PostgreSQL path for password change, queue access, CSRF Origin rejection, and session logout.* | Created `e2e/lab-03/live-integration.spec.ts` and `playwright.live.config.ts`, providing end-to-end verification against a real PostgreSQL container. |

---

## My Reflection

### 1. The Role of the AI Specification Agent
Using an AI specification agent before coding was critical to managing the complexity of Sprint 3. Rather than diving into immediate code implementation, the agent helped structure the extensive requirements of the Lab 3 handout into four clear, cohesive documents:
- Functional Requirements and Business Rules in `specification.md`
- Typed HTTP schemas and error codes in `api-spec.md`
- Responsive state matrices and accessibility criteria in `ui-spec.md`
- Test cases mapped 1-to-1 to Acceptance Criteria in `tests.md`

Having this contract in place beforehand acted as an authoritative guardrail. When coding agents proposed architectural shortcuts (such as client-side role checks or loose error shapes), the engineering contract served as an objective reference to reject non-compliant solutions.

### 2. The Role of the AI Coding Agent
The AI coding agent proved highly effective at:
- Generating boilerplate data models and Prisma migration files.
- Implementing repetitive test suites across permutations of roles and permissions.
- Producing responsive UI components in React adhering to the Zen Green color design system.
- Refactoring code smells, such as extracting long chained promises into typed variables.

### 3. Student Review, Oversight, and Corrections
A central takeaway from this sprint is that **AI coding agents require continuous human technical oversight**. Without careful validation, agents make subtle assumptions that fail in real-world or cross-platform environments:
1. **Cross-Platform Portability:** During verification, the agent generated shell commands using POSIX-only syntax (e.g. `APP_ORIGIN=... PORT=3000 npm run dev` and `.bin/tsx`). On Windows workstations (`cmd.exe`), these commands failed immediately with `ENOENT`. I caught these issues during local reproduction, investigated the root causes, and instructed the agent to use Playwright's native `env` config and `process.execPath`.
2. **Accessible Visual Design:** When addressing color contrast, the agent initially set both Medium and High priority badges to the identical text color `#8A2E00`. While this passed contrast checkers, it destroyed the visual distinction between Medium and High tickets. I corrected this by researching accessible color pairs and selecting `#7A4B00` for Medium and `#8A2E00` for High.
3. **Accuracy in Reporting & Verification Claims:** In the initial draft of the integration test report, the agent claimed that the live E2E test exercised cross-tenant boundaries and note leakage. I reviewed the actual code of `live-integration.spec.ts` and noted that those boundaries were authoritatively verified in the server API integration suites, not in that specific E2E test. I directed the documentation to be corrected to reflect exactly what each test executes.
4. **Security Guard Verification:** I manually verified that all backend security controls (Argon2id password hashing, server-side session revocation, CSRF origin verification, and SQL transaction rollbacks) were enforced at the API layer and could not be bypassed by directly crafting HTTP requests.

### 4. Conclusion
AI tools significantly accelerate software development, but software quality, security, and cross-platform reliability remain the direct responsibility of the engineer. The disciplined workflow of Spec-Driven Development, peer code reviews, and automated verification suites provided the necessary structure to harness AI effectively without compromising engineering standards.
