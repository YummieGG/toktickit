# Lab 3 Test Plan and Traceability

## Issue #39 focused verification boundary

The focused implementation for Issue #39 is limited to password policy and
hashing, auth session/cooldown APIs, migration/seed behavior, and Login/
Change Password UI behavior. The remaining planned Lab 3 tests below stay
`Pending` until their owning issues implement authorization, requester
migration, staff workflow, or administrator management; they are not evidence
that those later features are complete.

The Issue #39 migration/seed test path currently verifies the SQL/source
contract without claiming a PostgreSQL integration run. A clean-database
migration and seed run still requires the local PostgreSQL service and must be
recorded separately when that environment is available.

This is the pre-implementation test contract for Issue 1. Feature issues may add focused tests, but the final repository must keep the paths and coverage below (or document an equivalent path). No test may be skipped, disabled, focused-only, flaky, or a placeholder at completion.

## 1. Test strategy

- **Server unit:** Vitest for password policy/hash, email canonicalization, login-attempt windows, status transitions, authorization decisions, and queue query parsing.
- **Server API/integration:** Supertest against PostgreSQL test data and mocked filesystem boundaries, covering migration/seed, authentication, ownership, role guards, workflow, comments/notes, resolution, and Administrator safety.
- **Client UI:** Vitest + React Testing Library for screen state matrices, form validation, route guards, response rendering, and accessibility labels.
- **UI style/visual:** `visual-style.test.tsx` checks Zen Green tokens, shared component styling, readable editable/read-only states, contrast, focus indicators, and mobile control sizing.
- **E2E:** Playwright Chromium for login/change-password, Requester regression, Staff workflow, Administrator management, cross-role denial, and responsive screenshots.
- **Security/regression:** Explicit direct-API, session, CSRF-Origin, requesterId-tampering, cross-owner, Internal Note leakage, and Lab 2 data-preservation cases.

The endpoint authorization matrix in [`api-spec.md`](./api-spec.md#11-endpoint-authorization-matrix) is the canonical source for API authorization tests, and the screen authorization matrix in [`ui-spec.md`](./ui-spec.md#21-screen-authorization-matrix) is the canonical source for route-guard tests. Each endpoint and screen row must have an allowed-role case and a wrong-role/unauthenticated case where applicable.

## 2. Required repository paths

The baseline audit is evidence-based: Lab 2 Issues #11–#18, `origin/main@3f548ff`, `docs/lab-02/{specification,api-spec,ui-spec,tests}.md`, the existing Prisma schema/routes, and the existing Lab 2 test directories are the sources for regression cases. The migration suite must assert that this baseline data and behavior remain intact after authentication is introduced.

### Server

- `server/tests/lab-03/auth.api.test.ts`
- `server/tests/lab-03/migration-seed.api.test.ts`
- `server/tests/lab-03/authorization.api.test.ts`
- `server/tests/lab-03/staff-queue.api.test.ts`
- `server/tests/lab-03/staff-ticket-detail.api.test.ts`
- `server/tests/lab-03/comments-notes.api.test.ts`
- `server/tests/lab-03/users-admin.api.test.ts`
- `server/tests/lab-03/password-policy.unit.test.ts`
- `server/tests/lab-03/status-transition.unit.test.ts`
- `server/tests/lab-03/queue-query.unit.test.ts`

### Client

- `client/tests/lab-03/Login.test.tsx`
- `client/tests/lab-03/ChangePassword.test.tsx`
- `client/tests/lab-03/RouteGuards.test.tsx`
- `client/tests/lab-03/StaffTicketQueue.test.tsx`
- `client/tests/lab-03/StaffTicketDetail.test.tsx`
- `client/tests/lab-03/UserManagement.test.tsx`
- `client/tests/lab-03/visual-style.test.tsx`
- Existing Lab 2 component tests remain green and are extended for authenticated Requester behavior.

### E2E and evidence

- `e2e/lab-03/authentication.spec.ts`
- `e2e/lab-03/staff-ticket-flow.spec.ts`
- `e2e/lab-03/user-administration.spec.ts`
- `artifacts/lab-03/screenshots/authentication/`
- `artifacts/lab-03/screenshots/requester/`
- `artifacts/lab-03/screenshots/staff-queue/`
- `artifacts/lab-03/screenshots/staff-ticket-detail/`
- `artifacts/lab-03/screenshots/user-management/`

## 3. Acceptance-criterion traceability

Every AC is linked both to planned evidence and to the implementation issue(s)
that own the behavior. Issue #43 owns cross-cutting verification; Issue #44
owns final integration and submission evidence.

### 3.1 Mandatory planned test matrix

This matrix is the Test DD table required by the Lab sheet and `PlanLab/PLAN.md`.
It is a plan created before implementation; every `Final` value remains
`Pending` until the named test is run from a clean setup and the real result is
recorded. Requirement cells map the test to the relevant FR, BR, and AC IDs.

| Test ID | Type | Requirement / FR-BR-AC | What it tests | Expected result | Automated test file | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | FR-01, FR-03, BR-02, BR-03, AC-03, AC-05 | Password policy, scrypt parameters, encoded hash, constant-time comparison | Valid policy/hash cases pass; invalid policy is rejected; plaintext is never returned | `server/tests/lab-03/password-policy.unit.test.ts` | Pending |
| UNIT-02 | Unit | FR-10, BR-13, AC-09 | Every allowed and disallowed status-transition edge | Allowed edges pass; invalid edges return the contract error | `server/tests/lab-03/status-transition.unit.test.ts` | Pending |
| UNIT-03 | Unit | FR-09, BR-21, AC-08 | Queue query parsing, defaults, page sizes, and deterministic secondary sort | Valid queries normalize correctly; invalid values are rejected | `server/tests/lab-03/queue-query.unit.test.ts` | Pending |
| API-01 | API | FR-01, FR-02, BR-01, BR-04, AC-03 | Valid login with active credentials | `200`; `{ data: UserProjection }`; eight-hour HttpOnly `tt_session` cookie | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-02 | API | FR-03, BR-05, AC-03 | Invalid credentials, unknown email, inactive account, and cooldown | Same safe `401 INVALID_CREDENTIALS`; cooldown returns `429 LOGIN_COOLDOWN` without enumeration | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-03 | API | FR-04, BR-06, AC-04, AC-05 | Mandatory password change and session revocation | Valid change clears `mustChangePassword`, updates the hash, revokes all sessions, and requires sign-in again | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-04 | API | FR-02, BR-04, BR-06, AC-03 | Logout, expired session, and revoked-session behavior | Logout revokes only the current session; revoked/expired sessions receive safe `401` | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-05 | API | FR-05, FR-07, BR-07, AC-06, AC-12 | Requester identity tampering and cross-owner access | Session identity controls scope; tampered `requesterId` cannot cross owners; safe `404`/`403` is returned | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| API-06 | API | FR-06, FR-14, BR-17, AC-06, AC-09, AC-12 | Attachment metadata, download, soft removal, and role continuity | Ownership and role rules match the matrix; Admin metadata-only policy is enforced; removed files are not downloadable | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| API-07 | API | FR-11, FR-12, BR-15, AC-09, AC-10 | Public Comments/Internal Notes visibility, validation, and attribution | Correct roles can read/write; content is append-only, validated, server-attributed, and never leaks notes | `server/tests/lab-03/comments-notes.api.test.ts` | Pending |
| API-08 | API | FR-08, BR-16, AC-07 | “Problem Appears Resolved” ownership, idempotency, visibility, and reset | Owner receives `200` with a stable timestamp; Staff/Admin can read it; Reopened clears it | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pending |
| API-09 | API | FR-09, BR-21, AC-08 | Queue search, filters, sorting, pagination, empty/no-results, and invalid queries | `200` collection uses the complete pagination metadata; invalid queries return `400 INVALID_QUERY` | `server/tests/lab-03/staff-queue.api.test.ts` | Pending |
| API-10 | API | FR-10, BR-13, BR-14, BR-19, BR-20, AC-09 | Owner assignment, IT Priority, and status workflow | Only permitted Staff mutations succeed; owner eligibility, priority separation, confirmations, and transitions are enforced | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pending |
| API-11 | API | FR-13, FR-14, BR-10, BR-11, BR-18, AC-11, AC-12 | Administrator user creation/edit/activation and safety rules | Duplicate email, invalid role, self-deactivation, and last-Admin removal are blocked; Admin Ticket access remains read-only | `server/tests/lab-03/users-admin.api.test.ts` | Pending |
| API-12 | API / Migration | FR-07, BR-08, BR-09, AC-01, AC-02, AC-04 | Schema migration, legacy Requester password backfill, seed counts, and idempotency | Lab 2 ownership/IDs are preserved; `SEED_INITIAL_PASSWORD` is hashed; backfill is idempotent and fails safely when invalid | `server/tests/lab-03/migration-seed.api.test.ts` | Pending |
| SEC-01 | Security | FR-03, FR-05, BR-04, BR-05, BR-07, AC-03, AC-06, AC-12 | Direct API role bypass, CSRF Origin, session/token exposure, and requesterId tampering | Unauthorized requests receive safe `401`/`403`/`404`; no secrets, tokens, or cross-owner data are exposed | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| UI-01 | UI | FR-01, FR-03, FR-15, AC-03 | Login form validation, busy, cooldown, and safe failure states | Busy state prevents duplicate submit; errors do not reveal account existence; fields are preserved appropriately | `client/tests/lab-03/Login.test.tsx` | Pending |
| UI-02 | UI | FR-04, BR-02, AC-04, AC-05 | Change Password validation and mandatory routing | Complexity/confirmation rules are shown; normal screens remain blocked until success | `client/tests/lab-03/ChangePassword.test.tsx` | Pending |
| UI-03 | UI / Authorization | FR-05, FR-14, FR-16, AC-12, AC-14 | Screen authorization matrix, route guards, and role navigation | Allowed routes render; wrong roles receive safe 403; unauthenticated users redirect to Login; Admin ticket screens are read-only | `client/tests/lab-03/RouteGuards.test.tsx` | Pending |
| UI-04 | UI / Regression | FR-06, FR-07, FR-08, AC-06, AC-07 | Authenticated Requester Create Ticket, My Tickets, Detail, attachments, comments, and resolution | Lab 2 behavior remains functional under session identity; ownership and resolution states render correctly | `client/tests/lab-02/CreateTicket.test.tsx`, `client/tests/lab-02/MyTickets.test.tsx`, `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Pending |
| UI-05 | UI | FR-09, FR-15, FR-16, AC-08 | Staff Queue table/cards, query controls, pagination, and feedback states | Desktop/tablet/mobile representations are readable; loading, empty, no-results, retry, and failure states work | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pending |
| UI-06 | UI | FR-10, FR-11, FR-12, FR-14, FR-15, AC-09, AC-10, AC-12 | Staff Detail workflow controls, comments/notes separation, and confirmations | IT Staff sees permitted editors; Admin sees read-only detail; confirmation and safe error states are clear | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pending |
| UI-07 | UI | FR-13, FR-14, FR-15, AC-11, AC-12 | Administrator User Management modes and safety feedback | User list, search, create/edit/reset, validation, success, forbidden, and safe failure states render correctly | `client/tests/lab-03/UserManagement.test.tsx` | Pending |
| UI-08 | UI Style / Accessibility | FR-16, AC-14 | Zen Green tokens, contrast, labels, focus, 44 px targets, and overflow | Required viewports pass with no clipping/overflow and accessible controls | `client/tests/lab-03/visual-style.test.tsx` | Pending |
| E2E-01 | E2E | FR-01, FR-02, FR-03, FR-04, AC-03, AC-04 | Login, first-login change, refresh bootstrap, and logout | Session is established safely; normal app is blocked until password change; logout removes access | `e2e/lab-03/authentication.spec.ts` | Pending |
| E2E-02 | E2E / Regression | FR-06, FR-07, FR-08, AC-06, AC-07 | Requester regression, comments, attachments, and resolution indication | Authenticated Requester can complete Lab 2 flow and cannot access another owner’s data | `e2e/lab-03/authentication.spec.ts` | Pending |
| E2E-03 | E2E | FR-09, FR-10, FR-11, FR-12, FR-14, AC-08, AC-09, AC-10, AC-12 | Staff queue-to-detail triage and lifecycle | Staff can search, assign, update priority/status, comment/note; Admin remains read-only | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pending |
| E2E-04 | E2E | FR-13, FR-14, AC-11, AC-12 | Admin user management and cross-role route isolation | Scoped Admin operations work; Requester/Staff routes and APIs are blocked | `e2e/lab-03/user-administration.spec.ts` | Pending |
| E2E-05 | E2E / Responsive | FR-15, FR-16, AC-08, AC-09, AC-11, AC-14 | Responsive screenshots and accessibility checks at 1280/768/375 px | No clipping, overflow, inaccessible controls, or sub-44 px mobile targets; evidence is stored at required paths | `e2e/lab-03/authentication.spec.ts`, `e2e/lab-03/staff-ticket-flow.spec.ts`, `e2e/lab-03/user-administration.spec.ts` | Pending |

### 3.2 Acceptance-criterion descriptions and traceability

Each acceptance criterion is written as an observable Given/When/Then statement
and linked to its planned evidence and owning implementation issue(s).

| ID | Acceptance criterion | Planned evidence | Implementation issue(s) |
|---|---|---|---|
| AC-01 | Given a clean Lab 2 database, when migration runs, then Ticket, Attachment, Category, Related System IDs, and requester ownership remain unchanged. | `migration-seed.api.test.ts` verifies schema migration, legacy-user mapping, ownership preservation, and password backfill; Lab 2 API regression suites | [#39](https://github.com/YummieGG/toktickit/issues/39), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-02 | Given an empty or already-seeded database, when seed runs repeatedly, then the required account/data counts exist without duplicates or plaintext credentials. | `migration-seed.api.test.ts` verifies seed counts, idempotency, non-overwrite behavior, and secret handling | [#39](https://github.com/YummieGG/toktickit/issues/39), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-03 | Given an active user or an invalid/inactive/cooldown case, when login or logout is attempted, then access and session invalidation follow the safe authentication contract. | `auth.api.test.ts`, Login UI tests, `authentication.spec.ts` | [#39](https://github.com/YummieGG/toktickit/issues/39), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-04 | Given a user with `mustChangePassword=true`, when login succeeds, then normal screens remain blocked until a valid password change succeeds. | Auth API and Change Password UI/E2E tests | [#39](https://github.com/YummieGG/toktickit/issues/39), [#40](https://github.com/YummieGG/toktickit/issues/40) |
| AC-05 | Given valid and invalid password inputs, when policy and hashing are applied, then BR-02/BR-03 are enforced and no hash or secret reaches the client. | Password policy/hash unit tests; auth API secret-redaction assertions | [#39](https://github.com/YummieGG/toktickit/issues/39), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-06 | Given an authenticated Requester, when Lab 2 Ticket/Attachment operations are used, then only the session owner’s data is accessible and client `requesterId` values cannot change scope. | Existing Lab 2 tests plus `authorization.api.test.ts`, requester E2E | [#40](https://github.com/YummieGG/toktickit/issues/40), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-07 | Given an owned Ticket, when “Problem Appears Resolved” is submitted or the Ticket is Reopened, then the indication is idempotent, visible to Staff/Admin, and cleared on Reopened. | Resolution API/UI tests and Staff/Admin detail assertions | [#40](https://github.com/YummieGG/toktickit/issues/40), [#41](https://github.com/YummieGG/toktickit/issues/41), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-08 | Given a Staff Queue query, when search, filters, sorting, pagination, or empty/no-results cases occur, then API and responsive UI behavior match the queue contract. | `staff-queue.api.test.ts`, `StaffTicketQueue.test.tsx`, staff E2E/responsive screenshots | [#41](https://github.com/YummieGG/toktickit/issues/41), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-09 | Given an IT Staff user and a Ticket, when permitted detail operations are performed, then owner, IT Priority, status, comments, notes, attachments, confirmations, and safe errors follow the workflow contract. | `staff-ticket-detail.api.test.ts`, `StaffTicketDetail.test.tsx`, staff E2E | [#41](https://github.com/YummieGG/toktickit/issues/41), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-10 | Given Public Comments and Internal Notes, when roles read or create entries, then visibility, append-only behavior, validation, server attribution, and leakage protection are enforced. | `comments-notes.api.test.ts`, detail UI tests, requester leakage E2E | [#41](https://github.com/YummieGG/toktickit/issues/41), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-11 | Given an Administrator using User Management, when users are listed, created, edited, activated/deactivated, or reset, then scoped operations and all account-safety rules are enforced. | `users-admin.api.test.ts`, `UserManagement.test.tsx`, `user-administration.spec.ts` | [#42](https://github.com/YummieGG/toktickit/issues/42), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-12 | Given any role or unauthenticated client, when a protected screen or endpoint is accessed directly, then unauthorized access is blocked and Administrator Ticket access remains read-only. | Authorization API tests, route-guard UI tests, cross-role E2E | [#40](https://github.com/YummieGG/toktickit/issues/40), [#41](https://github.com/YummieGG/toktickit/issues/41), [#42](https://github.com/YummieGG/toktickit/issues/42), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-13 | Given the final repository, when required server/client/E2E suites run from a clean setup, then every AC has real evidence with no skipped, disabled, focused-only, flaky, or placeholder tests. | All server/client/E2E commands and final test-result table in this file | [#43](https://github.com/YummieGG/toktickit/issues/43), [#44](https://github.com/YummieGG/toktickit/issues/44) |
| AC-14 | Given the required 1280 px, 768 px, and 375 px viewports, when Lab 3 screens render and receive keyboard input, then there is no clipping/overflow and controls remain accessible. | `visual-style.test.tsx`, Playwright 1280/768/375 checks, accessibility assertions, and screenshot paths above | [#40](https://github.com/YummieGG/toktickit/issues/40), [#41](https://github.com/YummieGG/toktickit/issues/41), [#42](https://github.com/YummieGG/toktickit/issues/42), [#43](https://github.com/YummieGG/toktickit/issues/43) |

## 4. Minimum case matrix

### Authentication and security

- Valid active login; invalid password; unknown email; inactive account; five failures/cooldown boundary; cooldown expiry; logout; expired/revoked session; refresh bootstrap; mandatory password change; invalid password; secret redaction; invalid Origin; safe 401/403/404.
- Multiple sessions; current-session logout only; password change/reset/deactivation revokes all sessions; role/email changes are transactional.

### Migration and seed

- Start from a Lab 2 database containing Requester rows without password hashes; run the schema migration and application backfill with `SEED_INITIAL_PASSWORD`, then assert IDs, ticket/attachment ownership, active state, scrypt-formatted hashes, and `mustChangePassword=true` for backfilled users.
- Authenticate an active migrated Requester with the environment password, require Change Password, and verify the new password clears `mustChangePassword`; an inactive migrated Requester remains blocked with the safe inactive-account response.
- Rerun migration/backfill and seed to prove idempotency: no duplicate users/reference data are created, and existing non-null password hashes are unchanged.
- Run with a missing or policy-invalid `SEED_INITIAL_PASSWORD` and assert the operation fails before committing user changes; logs, responses, and persisted data contain no plaintext password.

### Authorization and Requester regression

- Requester cannot supply another `requesterId`, read another ticket, download/remove another attachment, view Internal Notes, or call Staff/Admin mutations. IT Staff can read/download permitted attachments; Administrator can read metadata but cannot download or mutate attachments.
- Attachment metadata has a dedicated authorization case for `GET /api/attachments/:id`: verify the safe metadata projection for the Requester owner, IT Staff, and Administrator; safe `404` for a different Requester owner; metadata remains readable after soft removal; and no file bytes or unrelated fields are returned.
- IT Staff can read queue/detail and write allowed workflow/comments/notes but cannot manage users.
- Administrator can read tickets/comments/notes/resolution but receives 403 for Staff mutations.
- Every screen/route in the UI authorization matrix has a role-allowed route-guard case, a wrong-role safe 403 case, and an unauthenticated redirect case; `mustChangePassword` users are blocked from normal screens until Change Password succeeds.
- Existing Lab 2 create/list/detail/attachment tests pass with session identity.

### Queue query and pagination

- Requester My Tickets and the Staff Queue default to `page=1` and `pageSize=10`, accept only page sizes 5/10/20, and reject non-integer or less-than-one page values with `400 INVALID_QUERY`.
- Collection responses expose `page`, `pageSize`, `totalItems`, `totalPages`, `hasNextPage`, and `hasPreviousPage`; zero records produce `totalPages=0` and both navigation flags false.
- A page beyond `totalPages` returns `200` with an empty `data` array and the requested page in the metadata.
- Every sort applies `id desc` as a deterministic secondary key so adjacent pages do not duplicate or skip records when sort values tie.

### Workflow and collaboration

- Every allowed and disallowed edge in the eight-state matrix; confirmation-required statuses; Reopened clearing resolution; owner active-role validation and unassignment transaction; separate Requested/IT Priority; append-only comments/notes; whitespace/length/newline rules; escaped rendering.

### Administrator safety

- Create/edit/search/role filter/activate/deactivate/initial reset; duplicate email; invalid role; self-deactivation; last active Administrator; reset forces next password change; owner role/deactivation unassigns tickets.

### UI and responsive behavior

- Initial/loading/validation/saving/success/failure/forbidden/not-found/empty/no-results states for every screen in [`ui-spec.md`](./ui-spec.md).
- Explicit labels and keyboard focus; contrast and non-color indicators; mobile target size; no clipping or horizontal overflow at all required viewports.

## 5. Test reporting contract

Final `tests.md` must record command, date/environment, test-file count, total/passed/failed/skipped counts, migration/seed result, build/lint result, screenshot evidence, and known limitations. Results must be copied from actual clean-setup output; never claim a pass without running the command.
