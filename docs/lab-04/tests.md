# Lab 4 Test Plan and Traceability

## Issue #56 focused verification boundary

This file establishes the pre-implementation test contract for Issue #56. All planned Lab 4 test rows remain `Planned` until their owning implementation issues build the corresponding features; they are not evidence that later features or tests have run. No test is marked Pass, Verified, skipped, or disabled prematurely.

## 1. Test strategy

- **Server unit:** Vitest for Action input validation, text normalization, assignee eligibility, Action/Ticket transition matrices, resolution gate predicates, Bangkok date window boundaries, and dashboard calculation formulas.
- **Server API:** Supertest against mock and test database boundaries covering role authorization, parent/action relations, Idempotency-Key replay, expected version checks, safe error codes, and dashboard outputs.
- **PostgreSQL integration:** Supertest with isolated PostgreSQL databases verifying real Prisma migrations, seed idempotency, Serializable concurrency conflicts, account cleanup triggers, and competing resolution/action mutations.
- **Client UI:** Vitest + React Testing Library for role navigation, Actions Taken interactive modes (create, view, edit, assign, status), dashboard card/list rendering, query parameter state, and safe error feedback.
- **UI style/visual:** `visual-style.test.tsx` verifying Zen Green tokens, contrast, text wrapping, focus indicators, and touch targets across 1280 px, 768 px, and 375 px viewports.
- **E2E UI fixtures:** Playwright fixture tests verifying deterministic browser flows, role navigation, and responsive layouts.
- **E2E live integration:** Playwright live tests against real server, Vite client, and seeded PostgreSQL verifying full browser-to-database action creation, resolution gate, and dashboard drill-downs.
- **Security/concurrency/regression:** Direct-API attacks, forged actors, cross-owner data isolation, stale write races, idempotent request replays, and full regression of Lab 1–3 functionality.

The endpoint authorization matrix in [`api-spec.md`](./api-spec.md#11-endpoint-authorization-matrix) and screen matrix in [`ui-spec.md`](./ui-spec.md#21-screen-authorization-matrix) are canonical.

## 2. Required repository paths

### Server

- `server/tests/lab-04/business-rules.unit.test.ts`
- `server/tests/lab-04/actions-taken.api.test.ts`
- `server/tests/lab-04/ticket-workflow.api.test.ts`
- `server/tests/lab-04/requester-dashboard.api.test.ts`
- `server/tests/lab-04/staff-dashboard.api.test.ts`
- `server/tests/lab-04/action-concurrency.integration.test.ts`
- `server/tests/lab-04/migration-seed.integration.test.ts`
- `server/tests/lab-04/dashboard-performance.integration.test.ts`

### Client

- `client/tests/lab-04/ActionsTaken.test.tsx`
- `client/tests/lab-04/TicketWorkflow.test.tsx`
- `client/tests/lab-04/RequesterDashboard.test.tsx`
- `client/tests/lab-04/StaffDashboard.test.tsx`
- `client/tests/lab-04/DashboardDrilldown.test.tsx`
- `client/tests/lab-04/visual-style.test.tsx`

### E2E and evidence

- `e2e/lab-04/actions-taken-flow.spec.ts`
- `e2e/lab-04/ticket-resolution.spec.ts`
- `e2e/lab-04/dashboards.spec.ts`
- `e2e/lab-04/actions-taken-flow.live.spec.ts`
- `e2e/lab-04/ticket-resolution.live.spec.ts`
- `e2e/lab-04/dashboards.live.spec.ts`
- `artifacts/lab-04/screenshots/requester-dashboard/`
- `artifacts/lab-04/screenshots/staff-dashboard/`
- `artifacts/lab-04/screenshots/actions-taken/`
- `artifacts/lab-04/screenshots/ticket-workflow/`
- `artifacts/lab-04/screenshots/regression/`

### Lab 3 regression paths that must remain

- Server: `server/tests/lab-03/auth.api.test.ts`, `authorization.api.test.ts`, `staff-queue.api.test.ts`, `staff-ticket-detail.api.test.ts`, `comments-notes.api.test.ts`, `users-admin.api.test.ts`, `migration-seed.integration.test.ts`, `users-admin.integration.test.ts`.
- Client: `client/tests/lab-03/Login.test.tsx`, `ChangePassword.test.tsx`, `RouteGuards.test.tsx`, `StaffTicketQueue.test.tsx`, `StaffTicketDetail.test.tsx`, `UserManagement.test.tsx`, `visual-style.test.tsx`.
- E2E: `e2e/lab-03/authentication.spec.ts`, `staff-ticket-flow.spec.ts`, `user-administration.spec.ts`, `live-integration.spec.ts`.

## 3. Acceptance-criterion traceability

### 3.1 Mandatory planned test matrix

This matrix maps every acceptance criterion and functional requirement to an automated test file. `Planned` indicates the test scenario and expected result are defined prior to implementation.

| Test ID | Type | Requirement / FR-BR-AC | What it tests | Expected result | Automated test file | Final |
|---|---|---|---|---|---|---|
| CONTRACT-01 | Contract | FR-04-01, AC-01, AC-03 | Mutual consistency of all 4 contract documents and decisions | No contradiction; all 21 decisions resolved; READY-04 gate complete | `docs/lab-04/*.md review checklist` | Planned |
| CONTRACT-02 | Contract | AC-02, CONCURRENCY-01 | Enumerate all write endpoints against backend authorization, guard order, and concurrency rules | All write endpoints enforce session, role, parent access, expected versions, and serializable transactions | `docs/lab-04/api-spec.md`, `tests.md` | Planned |
| UNIT-01 | Unit | FR-04-06, BR-05, BR-06, BR-07, AC-04 | Description/result/follow-up validation, text normalization, assignee eligibility | Valid inputs normalize; missing note or invalid assignee returns field error | `server/tests/lab-04/business-rules.unit.test.ts` | Planned |
| UNIT-02 | Unit | FR-04-08, BR-08, BR-13, BR-14, AC-06 | Action lifecycle transitions and Ticket resolution predicate | Transitions match matrices; gate blocks resolve without completed action | `server/tests/lab-04/business-rules.unit.test.ts` | Planned |
| UNIT-03 | Unit | FR-04-12, FR-04-13, DATE-01, AC-07, AC-08 | Bangkok 7-day calendar window calculation and metrics grouping | Window boundaries inclusive; zero count groups preserved correctly | `server/tests/lab-04/business-rules.unit.test.ts` | Planned |
| API-01 | API | FR-04-03, FR-04-04, BR-03, BR-04, AC-04, AC-05 | Action list and create with server actor, timestamps, and versions | Action created with server actor/time; Requester denied create; 201/200 replay | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-02 | API | FR-04-05, BR-08, BR-09, BR-10, AC-04 | Action edit, reassignment, and status changes with versions | Allowed transitions succeed; terminal states restricted; stable list order | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-03 | API | AUTHZ-04, BR-03, BR-20, AC-05, AC-10 | Requester cross-owner access, Admin ticket mutation restrictions | Safe 404 for unowned ticket; Admin denied ticket mutations; note isolation | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-04 | API | FR-04-08, FR-04-09, BR-13, BR-14, BR-16, AC-06 | 8-state ticket transitions, resolution gate, and atomic child cancel | Gate blocks invalid resolve; cancel atomically cancels active children | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-05 | API | FR-04-12, FR-04-14, DASHBOARD-01, AC-07 | Requester dashboard metrics and drill-down parity | Session-owned metrics only; Bangkok window; drill-down filter parity | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-06 | API | FR-04-13, FR-04-14, AC-08 | Staff dashboard metrics, zero groups, and current-user actions | Authoritative counts; zero groups included; my actions scoped to user | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| PG-01 | PG Integration | CONCURRENCY-01, IDEMPOTENCY-01, ELIGIBILITY-04, AC-11 | Competing resolve vs action writes, stale versions, same-key race | Serializable conflict rolls back; one action created; deactivation unassigns | `server/tests/lab-04/action-concurrency.integration.test.ts` | Planned |
| PG-02 | PG Integration | MIGRATION-04, SEED-04, AC-09 | Non-destructive migration on Lab 3 snapshot and repeatable seed | Lab 1–3 data, ownership, and credentials preserved; no duplicate seed rows | `server/tests/lab-04/migration-seed.integration.test.ts` | Planned |
| PERF-01 | Performance | TEST-04, AC-13 | Benchmark 1,000 Tickets / 5,000 actions dataset | Response body <= 64 KiB; warm p95 response <= 1,000 ms | `server/tests/lab-04/dashboard-performance.integration.test.ts` | Planned |
| UI-01 | UI | FR-04-03, FR-04-04, UI-04, AC-04, AC-05 | Actions Taken UI section: create, view, edit, assignment, status | Role controls match matrix; form validation; draft preserved on conflict | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-02 | UI | FR-04-08, BR-13, AC-06 | Ticket workflow UI and resolution feedback | Allowed transitions shown; confirmation modals; blocked resolve feedback | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-03 | UI | FR-04-12, FR-04-13, AC-07, AC-08 | Requester and Staff dashboard rendering and card drill-down links | Metric values displayed; zero states handled; links pass filter query params | `client/tests/lab-04/RequesterDashboard.test.tsx`, `StaffDashboard.test.tsx` | Planned |
| UI-04 | UI | FR-04-14, UI-04, AC-04, AC-08 | Actions Taken drill-down page with URL query state | Query params update list; pagination works; row opens ticket detail | `client/tests/lab-04/DashboardDrilldown.test.tsx` | Planned |
| UI-05 | UI Style | FR-04-16, AC-12 | Zen Green tokens, contrast, text wrapping, and responsive viewports | 1280, 768, 375 px pass without clipping, overlap, or page overflow | `client/tests/lab-04/visual-style.test.tsx` | Planned |
| E2E-01 | E2E | AC-04, AC-05, AC-11 | Actions Taken lifecycle flow: create, edit, assign, status | Multiple actions created by different staff; requester sees read-only | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-06 | Full ticket resolution lifecycle from advisory to close and reopen | Advisory indication → action completed → resolve succeeded → closed/reopen | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-03 | E2E | AC-07, AC-08, AC-10 | Requester and Staff dashboard browser flows and navigation | Card drill-down to queue/detail; home redirect; regression flows verified | `e2e/lab-04/dashboards.spec.ts` | Planned |
| LIVE-01 | Live E2E | AUTHZ-04, AC-04, AC-06, AC-11 | Browser to real API to PostgreSQL action and workflow flow | Real DB transactions enforce resolution gate, version check, and idempotency | `e2e/lab-04/actions-taken-flow.live.spec.ts`, `ticket-resolution.live.spec.ts` | Planned |
| LIVE-02 | Live E2E | AC-07, AC-08, AC-10 | Browser to real API to PostgreSQL dashboard flow | Real backend counts match dashboard cards; drill-down filters match rows | `e2e/lab-04/dashboards.live.spec.ts` | Planned |
| REG-01 | Regression | FR-04-17, AC-10 | Full regression of Lab 1–3 auth, tickets, queue, comments, notes | Existing test suites continue to pass green without regression | Existing server, client, and e2e test paths | Planned |

## 4. Write API security and concurrency checklist

| Endpoint | Session/password gate | Role | Parent/ownership | Origin | Version/transaction | Idempotency |
|---|---|---|---|---|---|---|
| `POST /api/tickets/:ticketId/actions-taken` | Yes | IT Staff / Admin | Active accessible ticket | Required | `expectedTicketVersion`; Serializable | Required |
| `PATCH /api/tickets/:ticketId/actions-taken/:actionId` | Yes | IT Staff / Admin | Nested ticket match; active ticket | Required | Both versions; Serializable | N/A |
| `PATCH /api/tickets/:ticketId/actions-taken/:actionId/assignee` | Yes | IT Staff / Admin | Nested ticket match; active ticket | Required | Both versions; Serializable | N/A |
| `PATCH /api/tickets/:ticketId/actions-taken/:actionId/status` | Yes | IT Staff / Admin | Nested ticket match; active ticket | Required | Both versions; Serializable | N/A |
| `PATCH /api/tickets/:id/status` | Yes | IT Staff only | Accessible ticket; status matrix | Required | `expectedTicketVersion`; Serializable | N/A |
| `PATCH /api/tickets/:id/owner` | Yes | IT Staff only | Accessible ticket | Required | `expectedTicketVersion`; Serializable | N/A |
| `PATCH /api/tickets/:id/it-priority` | Yes | IT Staff only | Accessible ticket | Required | `expectedTicketVersion`; Serializable | N/A |
| `POST /api/tickets` | Yes | Requester | Own / valid category | Required | Lab 2/3 validation; no version required | N/A |
| `POST /api/tickets/:ticketId/comments` | Yes | Requester / Staff | Own ticket (Requester) or all tickets (Staff) | Required | Append-only; no version required | N/A |
| `POST /api/tickets/:ticketId/internal-notes` | Yes | IT Staff only | Accessible ticket | Required | Append-only; no version required | N/A |
| `POST /api/tickets/:id/problem-appears-resolved` | Yes | Requester | Own ticket | Required | Idempotent timestamp update; no expected version | N/A |
| `POST /api/admin/users` | Yes | Admin only | Scoped user | Required | User creation; unique email | N/A |
| `PATCH /api/admin/users/:id` | Yes | Admin only | Scoped user | Required | Serializable safety transaction | N/A |
| `POST /api/admin/users/:id/initial-password` | Yes | Admin only | Scoped user | Required | Scrypt hash & session revocation | N/A |

## 5. Dashboard parity and verification rules

- Fixture expectations are calculated independently using authoritative SQL/Prisma queries against known test records.
- Date window assertions check exact inclusive start (00:00:00 six calendar days ago) and upper bound (`generatedAt`) in `Asia/Bangkok`.
- Legacy `resolvedAt = null` records are asserted to be excluded from `recentlyResolved`.
- Drill-down queries reuse the captured dashboard window and status/priority parameters to verify count parity.
- Response size must remain <= 64 KiB without sending complete collections to the client.

## 6. Planned commands and status policy

Commands executed during implementation and verification:

```bash
cd server && npm test
cd server && npm run build
cd server && npm run test:integration
cd client && npm test
cd client && npm run build
cd client && npm run lint
cd e2e && npm test
cd e2e && npm run test:live
git diff --check
```

Status vocabulary:
- **Planned:** test scenario, path, and assertions defined before coding.
- **Verified:** command executed successfully in required environment with logs retained.
- **Failed:** command failed and requires defect resolution.
- **Not applicable:** excluded with approved written rationale.

## 7. READY-04 handoff checklist

- [ ] All four core contract documents (`specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`) are complete and consistent.
- [ ] Every AC-01 through AC-13 has a Test ID, scenario, expected result, and planned file path.
- [ ] Every write API enforces session, role, parent access, Origin, versions, and Serializable transactions.
- [ ] Actions Taken lifecycle, assignment rules, resolution gate, and atomic cancellation are explicit.
- [ ] Dashboards formulas, Bangkok 7-day window, zero states, bounds, and drill-down parity are explicit.
- [ ] Migration and seed strategy preserve existing data, credentials, and timestamps.
- [ ] Contract review and commit trace are recorded before Issue #57 implementation begins.
