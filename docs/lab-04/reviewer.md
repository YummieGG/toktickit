# Lab 4 Peer Review Record

## Author
- **Name**: Worawut Sereethai
- **Student ID**: 67070501040
- **GitHub**: [@YummieGG](https://github.com/YummieGG)

## Peer Reviewer
- **Name**: Chanon Lhumsa-ard
- **Student ID**: 67070501059
- **GitHub**: [@Snnn3](https://github.com/Snnn3)

---

## Pull Requests Authored

| PR # | Title | Branch | Commit SHA | Status | Reviewer |
|:---|:---|:---|:---|:---|:---|
| [#65](https://github.com/YummieGG/toktickit/pull/65) | Lab 4-1: Define Sprint 4 Engineering Contract and Traceability | `lab4-1-engineering-contract` | `da2426b` (Initial) | Merged | [@Snnn3](https://github.com/Snnn3) |
| [#66](https://github.com/YummieGG/toktickit/pull/66) | Lab 4-2: Actions Taken data model, migration, seed, and API foundation | `lab4-2-actions-foundation` | `87acf65` (Initial) | Merged | [@Snnn3](https://github.com/Snnn3) |
| [#67](https://github.com/YummieGG/toktickit/pull/67) | Lab 4-3: Actions Taken UI section and role access controls | `lab4-3-actions-ui` | `07a215d` (Initial) | Merged | [@Snnn3](https://github.com/Snnn3) |
| [#68](https://github.com/YummieGG/toktickit/pull/68) | Lab 4-4: Enforce Ticket Workflow and Resolution Gate | `lab4-4-ticket-workflow` | `f3f2c1e` (Initial) | Merged | [@Snnn3](https://github.com/Snnn3) |
| [#69](https://github.com/YummieGG/toktickit/pull/69) | Lab 4-5: Requester and Staff operational dashboards | `lab4-5-role-dashboards` | `365c023` | Merged | [@Snnn3](https://github.com/Snnn3) |
| [#70](https://github.com/YummieGG/toktickit/pull/70) | Lab 4-6: Complete regression, security, accessibility, and visual QA | `lab4-6-verification-qa` | `245e7e7` | Merged | [@Snnn3](https://github.com/Snnn3) |
| [#71](https://github.com/YummieGG/toktickit/pull/71) | Lab 4-7: Staged integration and clean verification | `lab4-7-staged-integration` | `dd41704` | Merged | [@Snnn3](https://github.com/Snnn3) |

---

## Pull Requests Reviewed

> *Note on Partner Implementation Records:* The entries below record peer review performed on partner repository (Snnn3/TokTickIT). Partner uses `409 STALE_WRITE` and `resolutionSummary` in their codebase; TokTickIT contract standardizes on `409 CONFLICT` and completion predicate per `api-spec.md` and `specification.md`.

| PR # | Title | Author | Status | Key Comments |
|:---|:---|:---|:---|:---|
| [#63](https://github.com/Snnn3/TokTickIT/pull/63) | docs(lab4): add engineering contract for Issue #54 | [@Snnn3](https://github.com/Snnn3) | Merged | Verified 6 companion documents, 8-state lifecycle, 13-row auth matrix, 1:N Action Taken model, optimistic concurrency via 409 STALE_WRITE, and 23 ACs mapped to 89 test pairs. Approved. |
| [#64](https://github.com/Snnn3/TokTickIT/pull/64) | feat(lab4-2): add Actions Taken data foundation | [@Snnn3](https://github.com/Snnn3) | Merged | Verified Prisma schema, PostgreSQL CHECK constraints, ON DELETE RESTRICT FKs, legacy data preservation via capture.ts, and 8 idempotent seed fixtures across all 4 action statuses. Approved. |
| [#65](https://github.com/Snnn3/TokTickIT/pull/65) | feat(lab4-3): add Actions Taken API and authorization | [@Snnn3](https://github.com/Snnn3) | Merged | Caught unit test isolation regression in `users-admin.api.test.ts` where unstubbed `prisma.actionTaken.findMany` threw 500 without database. Requested changes; approved on Round 2 after test stubbing. |
| [#66](https://github.com/Snnn3/TokTickIT/pull/66) | feat(lab4): enforce ticket workflow resolution gate | [@Snnn3](https://github.com/Snnn3) | Merged | Verified 8-state ticket transitions (16 valid, 48 forbidden), completed-action and resolution-summary resolution gate, advisory signal status neutrality, and 409 STALE_WRITE conflict recovery. Approved. |
| [#67](https://github.com/Snnn3/TokTickIT/pull/67) | feat(lab4): add Actions Taken ticket detail UI (#58) | [@Snnn3](https://github.com/Snnn3) | Merged | Verified AC-1–AC-12, ActionsTakenPanel cardinality (0/1/many), optimistic locking via 409 STALE_WRITE with draft preservation, idempotency UUIDs, and full test suite (17/17 panel, 158/158 client). Approved. |
| [#68](https://github.com/Snnn3/TokTickIT/pull/68) | feat(lab4): add IT Staff Dashboard (#59) | [@Snnn3](https://github.com/Snnn3) | Merged | Verified AC-1–AC-10, authoritative metrics, 7-day rolling window with Bangkok formatting, stale-response protection via useRequestGeneration, and test suite (17/17 client, 15/15 server). Recommended waitFor on ExpiredSession.test.tsx. Approved. |
| [#69](https://github.com/Snnn3/TokTickIT/pull/69) | feat(lab4): requester dashboard (#60) | [@Snnn3](https://github.com/Snnn3) | Merged | Verified AC-1–AC-9, session-based ownership enforcement, 7-day UTC rolling window with Bangkok display, filter persistence in My Tickets, stale-response discarding, and test suite (7/7 component, 196/196 client, 23/23 server). Noted C4-02 test count update. Approved. |

---

## Review Comments Given

### PR #63: docs(lab4): add engineering contract for Issue #54
- **Target PR**: [Snnn3/TokTickIT#63](https://github.com/Snnn3/TokTickIT/pull/63)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My review comment (@YummieGG - Approved)**:
  > I have reviewed the Lab 4 engineering contract submitted in PR #63 against Issue #54 and the `SE+Lab+4.pdf` handout. The six companion documents are comprehensive, internally consistent, and establish a solid specification before implementation begins.
  >
  > ### Key Verifications
  > - **Contract Completeness:** All 6 required documents in `docs/lab-04/` are present with unified terminology, models, roles, and status enums.
  > - **Agreed Decisions Locked:** Correctly locks the 1:N Action Taken model, immutable `performedBy` vs. active-staff `assignee`, terminal states (`COMPLETED`/`CANCELLED`), completed-result resolution gate, advisory requester signal, 7-day rolling dashboards (UTC/Bangkok), and optimistic concurrency via `409 STALE_WRITE`.
  > - **Matrices & Security:** Complete 8-state ticket lifecycle and 13-row authorization matrix, including `403 SELF_SERVICE_FORBIDDEN` protection.
  > - **Traceability:** Verified 100% bidirectional mapping between 23 ACs (`AC-01`–`AC-23`) and 89 planned test pairs across unit, API, component, E2E, migration, and performance smoke tests.
  > - **Minor Note:** Commit `0158b6b` added `CONTEXT.md` and `skills-lock.json`; please update the PR description which still states they were left untouched.
  >
  > **Verdict: Approved (LGTM).** Ready to merge into `lab4-staging`. Please update the peer review record in `docs/lab-04/reviewer.md` accordingly.
- **Partner's response (@Snnn3)**:
  > Thank you, @YummieGG, for the thorough review and approval of PR #63. I appreciate you verifying the six Lab 4 contract documents, authorization matrix, lifecycle rules, concurrency behavior, and the 23 ACs with 89 test mappings.
  >
  > I also noted your minor comment: commit `0158b6b` added `CONTEXT.md` and `skills-lock.json`, so the PR description's "left untouched" note is outdated. PR #63 has now been merged into `lab4-staging`, completing the contract phase and unblocking implementation.

---

### PR #64: feat(lab4-2): add Actions Taken data foundation
- **Target PR**: [Snnn3/TokTickIT#64](https://github.com/Snnn3/TokTickIT/pull/64)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My review comment (@YummieGG - Approved)**:
  > I have reviewed the Actions Taken data foundation in PR #64 against Issue #55, `docs/lab-04/specification.md`, and the Lab 4 handout. The database design, migration, seed fixtures, and verification evidence are thoroughly executed and fully compliant.
  >
  > ### Key Verifications
  > - **Schema & Constraints:** `ActionTaken`, `ActionEvent`, `ActionCreationRequest`, and `Ticket` extensions (`resolvedAt`, `version`, indexes) are implemented with strict PostgreSQL CHECK constraints and `ON DELETE RESTRICT` foreign keys to preserve work history.
  > - **Legacy Preservation:** Verified via `capture.ts` and disposable PostgreSQL runs; all legacy rows, relations, and attachment MD5 checksums remain intact with zero artificial historical actions created.
  > - **Idempotent Seed:** 8 stable seed fixtures cover all 4 action statuses, 0/1/many ticket cardinalities, active-staff assignees, an admin performer, and 7-day boundary timestamps. Repeat runs keep counts stable without duplicate events, and fixture modifications correctly advance versions monotonically.
  > - **Regression Passed:** Server suite (190/190), client suite (135/135), and Playwright E2E (13/13) pass cleanly. Updating the user count assertion in `e2e/lab-03/zz-release-evidence.spec.ts` for the 12th seed user keeps the full regression suite green.
  > - **Scope Discipline:** Confined strictly to schema, migration, seed, and evidence, with no premature API or UI code.
  >
  > **Verdict: Approved (LGTM).** Ready to merge into `lab4-staging`. Please update the peer review record in `docs/lab-04/reviewer.md` accordingly.
- **Partner's response (@Snnn3)**:
  > Thanks so much for the thorough review and catch-ups on the test assertions, @YummieGG! Super helpful breakdown on the verification points.

---

### PR #65: feat(lab4-3): add Actions Taken API and authorization
- **Target PR**: [Snnn3/TokTickIT#65](https://github.com/Snnn3/TokTickIT/pull/65)
- **Author**: @Snnn3
- **Verdict**: Changes Requested (Round 1) → Approved (Round 2)
- **My review comment (@YummieGG - Changes Requested, Round 1)**:
  > Thank you for the implementation. The Actions Taken API design, auth/body precedence guards, optimistic concurrency, and audit logging align well with the specification and Issue #56. All 53 tests in `actions-taken.api.test.ts` pass cleanly.
  >
  > However, changes are required before approval due to a regression failure in existing Lab 3 unit tests and missing documentation updates:
  >
  > ### 1. [Blocker] Regression Test Failure in `users-admin.api.test.ts` (AC-10 Violation)
  > Running `npm test` in an isolated environment without a running PostgreSQL container fails 2 tests in `server/tests/lab-03/users-admin.api.test.ts`:
  > - `releases non-terminal tickets and bumps tokenVersion on deactivation`
  > - `releases non-terminal tickets and bumps tokenVersion on staff-role demotion`
  >
  > **Root Cause:**
  > In `server/src/routes/admin.ts`, deactivating or demoting an `IT_STAFF` user triggers `releasesActions = true`, invoking `tx.actionTaken.findMany(...)`. In the Lab 3 test case (`tests/lab-03/users-admin.api.test.ts:460-536`), `prisma.actionTaken.findMany` is not stubbed. In unit test isolation, Prisma attempts to connect to `localhost:5434`, throwing a `PrismaClientInitializationError` and resulting in an unexpected `500` instead of `200`.
  >
  > **Required Fix:**
  > Stub `prisma.actionTaken.findMany` in that test block:
  > ```ts
  > vi.spyOn(prisma.actionTaken, "findMany").mockResolvedValue([] as never);
  > ```
- **Partner's response (@Snnn3)**:
  > Addressed the review's test-isolation finding in commit `0f72f4c`. The Lab 3 admin deactivation/demotion regression fixture now stubs `prisma.actionTaken.findMany`, so both targeted cases pass without PostgreSQL. I also updated `docs/lab-04/reviewer.md` with the review and response.
  >
  > Verification: server build and focused check passed. The full server suite reported 244/245 passing; the remaining failure is the Lab 1 seeded-categories test, which requires PostgreSQL and fails in this environment while the database is unavailable. Ready for peer re-review.
- **My follow-up comment (@YummieGG - Approved, Round 2)**:
  > I have re-reviewed the Actions Taken API and authorization slice in PR #65 following commit `0f72f4c`. The test isolation issue has been cleanly resolved with `prisma.actionTaken.findMany` properly stubbed in the Lab 3 regression fixtures. All authorization guards, precedence rules, optimistic concurrency, and audit events meet the contract requirements.
  >
  > **Verdict: Approved (LGTM).** Ready to merge into `lab4-staging`.
- **Partner's response (@Snnn3)**:
  > Thank you, @YummieGG, for taking the time to review this PR and share your feedback. I appreciate your detailed review and help.

---

### PR #66: feat(lab4): enforce ticket workflow resolution gate
- **Target PR**: [Snnn3/TokTickIT#66](https://github.com/Snnn3/TokTickIT/pull/66)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My review comment (@YummieGG - Approved)**:
  > I have reviewed the Ticket workflow and resolution gate implementation in PR #66 against Issue #57, `docs/lab-04/specification.md`, and `docs/lab-04/api-spec.md`. The workflow rules, concurrency controls, and client integration are thoroughly implemented and fully compliant.
  >
  > ### Key Verifications
  > - **Transition Matrix & Terminal Protection (AC-1, AC-2, AC-7):** The full 8-status lifecycle is strictly enforced at the backend via `ticket-workflow.ts`. All 16 permitted transitions and 48 forbidden transitions pass verification, with terminal `CLOSED` and `CANCELLED` states fully locked against subsequent mutations.
  > - **Resolution Gate (AC-4, AC-5):** Transitioning to `RESOLVED` properly requires at least one completed Action Taken with a meaningful result (`400 ACTION_RESULT_REQUIRED`) and a valid resolution summary (`400 RESOLUTION_SUMMARY_REQUIRED`), before atomic persistence and timestamp updates.
  > - **Requester Advisory & Reopen (AC-3, AC-6):** The `appears-resolved` signal remains purely advisory and status-neutral. Reopening cleanly resets `resolutionSummary`, `resolvedAt`, and `appearsResolvedAt` to null while transitioning the ticket to `REOPENED`.
  > - **Optimistic Concurrency & UI Recovery (AC-8, AC-9):** Every workflow endpoint enforces `expectedVersion` within serializable transactions and returns `409 STALE_WRITE` on version conflicts. The client gracefully preserves draft input, fetches the latest ticket state, and displays the conflict alert banner for review.
  > - **Architecture & Test Suite (AC-10, AC-11):** Excellent refactoring to centralize workflow logic into `ticket-workflow.ts`. All 87 API tests in `ticket-workflow.api.test.ts`, all 140 client component tests, and the adapted E2E flow pass cleanly.
  >
  > *Note:* Please remember to sync the status in `docs/lab-04/tests.md` (`API4-02`) and log the entry in `docs/lab-04/reviewer.md` alongside the next integration slice.
  >
  > **Verdict: Approved (LGTM).** Ready to merge into `lab4-staging`.
- **Partner's response (@Snnn3)**:
  > Thanks @YummieGG for the thorough review and for helping get PR #66 merged! I really appreciate the detailed feedback and verification of the workflow, concurrency handling, and conflict recovery.

---

### PR #67: feat(lab4): add Actions Taken ticket detail UI (#58)
- **Target PR**: [Snnn3/TokTickIT#67](https://github.com/Snnn3/TokTickIT/pull/67)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My review comment (@YummieGG - Approved)**:
  > Thank you for implementing the Actions Taken ticket detail UI! The implementation is very well structured and handles edge cases thoroughly.
  >
  > ### Summary of Findings
  > - **Criteria Verified (AC-1 – AC-12):** All acceptance criteria are thoroughly satisfied. The `ActionsTakenPanel` properly handles cardinality (0, 1, many), action state transitions, immutable performer audit tags, follow-up note validation, and requester read-only isolation.
  > - **Concurrency & Robustness:** Optimistic locking and conflict recovery (`409 STALE_WRITE`) work cleanly with draft preservation and server reconciliation. Idempotency keys (`UUID`) are properly sent on action creation.
  > - **Verification & Test Suite:** Verified locally:
  >   - `ActionsTaken.test.tsx`: Passed (17/17 tests)
  >   - Full client test suite: Passed (158/158 tests across 19 files)
  >   - Typecheck, Vite build, and `ultracite check` linter: Passed with 0 errors.
  >
  > *(Minor Note)*: Please remember to update row `C4-01` in `docs/lab-04/tests.md` from `Planned` to `Passed (17/17)` during the final documentation sync.
  >
  > Overall solid implementation and excellent test coverage. LGTM!
- **Partner's response (@Snnn3)**:
  > Thanks @YummieGG for the thorough review and for helping get PR #67 merged. I really appreciate your careful checks of the acceptance criteria, conflict recovery, and test coverage, as well as the reminder about C4-01.

---

### PR #68: feat(lab4): add IT Staff Dashboard (#59)
- **Target PR**: [Snnn3/TokTickIT#68](https://github.com/Snnn3/TokTickIT/pull/68)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My review comment (@YummieGG - Approved)**:
  > Thank you for implementing the IT Staff Dashboard! The implementation is very thorough, clean, and handles tricky race conditions and mobile edge cases gracefully.
  >
  > ### Summary of Findings
  > - **Criteria Verified (AC-1 – AC-10):** All acceptance criteria are fully met. The dashboard provides authoritative metrics, status groupings, bounded latest-5 lists (7-day window), Asia/Bangkok time formatting, strict session-based identity, and accurate drill-down links.
  > - **Race Condition & Robustness:** Stale-response protection via `useRequestGeneration` and body parsing guardrails effectively prevent out-of-order UI overwrites during fast navigation and browser Back/Forward.
  > - **Verification & Test Suite:**
  >   - Client component tests (`StaffDashboard.test.tsx`, `StaffActionsList.test.tsx`, `ExpiredSession.test.tsx`): Passed (17/17 tests).
  >   - Server dashboard API tests: Passed (15/15 tests).
  >   - Client Vite build, Server TypeScript build, and `ultracite check` (50 modified files): Passed with 0 errors.
  >
  > *(Minor Note / Recommendation)*:
  > In `client/src/__tests__/lab-04/ExpiredSession.test.tsx` (lines 129–130), when `result` is empty, consider wrapping `expect(attempts).toBeGreaterThanOrEqual(2)` inside `await waitFor(...)` to prevent potential intermittent flakes under high CI CPU load.
  >
  > Outstanding work! LGTM
- **Partner's response (@Snnn3)**:
  > Thank you, @YummieGG, for the thoughtful review and for merging PR #68. I really appreciate you checking the acceptance criteria, race-condition handling, mobile edge cases, and verification results. Thanks for your support!

---

### PR #69: feat(lab4): requester dashboard (#60)
- **Target PR**: [Snnn3/TokTickIT#69](https://github.com/Snnn3/TokTickIT/pull/69)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My review comment (@YummieGG - Approved)**:
  > Thank you for implementing the Requester Dashboard! The ownership protection is rock-solid and the state synchronization in My Tickets works seamlessly.
  >
  > ### Summary of Findings
  > - **Criteria Verified (AC-1 – AC-9):** All acceptance criteria are thoroughly satisfied. The dashboard strictly enforces requester ownership via authenticated session, rejects unauthorized query/body overrides (`400 INVALID_QUERY / VALIDATION_ERROR`), applies the 7-day rolling window in UTC with Asia/Bangkok display, and renders bounded latest-5 lists with stable sorting.
  > - **State Persistence & Lifecycle:** Deep links, drill-downs, and My Tickets filter states are preserved cleanly across browser refresh and Back navigation. Request generation guards properly discard stale responses during rapid refreshes and StrictMode mounts.
  > - **Verification & Test Suite:** Verified locally:
  >   - Client component tests (`RequesterDashboard.test.tsx`): Passed (7/7 tests).
  >   - Full client test suite: Passed (196/196 tests across 23 files).
  >   - Server dashboard & tickets API tests: Passed (23/23 tests).
  >   - Production builds (Vite & TypeScript) and `ultracite check` (21 modified files): Passed with 0 errors.
  >
  > *(Minor Note)*: In `docs/lab-04/tests.md` row `C4-02`, consider updating the test count from 6 to 7 to reflect the new StrictMode regression test during the final documentation cleanup.
  >
  > Excellent work and clean design! LGTM
- **Partner's response (@Snnn3)**:
  > Thank you, @YummieGG, for the thorough review and for approving and merging PR #69. I really appreciate you verifying the ownership safeguards, date-window behavior, filter/navigation persistence, stale-response handling, and test coverage. Thanks also for catching the C4-02 test-count discrepancy!

---

## Review Comments Received & Responses

### PR #65: Lab 4-1: Define Sprint 4 Engineering Contract and Traceability
- **Target PR**: [#65](https://github.com/YummieGG/toktickit/pull/65) (`lab4-1-engineering-contract` → `lab4-staging`)
- **Base Commit**: `a295882` (Lab 3 main baseline)
- **Initial Contract Commit**: `da2426b` (Merged: `40025a2`)
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Status**: Merged (`40025a2`)
- **Reviewer comment received (@Snnn3 - Approved)**:
  > **Verdict: Approved (LGTM)**
  >
  > Reviewed the Lab 4 engineering contract in PR #65 against Issue #56 and the `SE+Lab+4.pdf` handout. All four core contract documents (`specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`) and supporting logs (`reviewer.md`, `ai-use.md`, `visual-checklist.md`) are complete and mutually consistent:
  > - **Specification & Workflow**: Covers all 11 sections, Lab 3 deltas, the 1:N `ActionTaken` / append-only `ActionTakenEvent` models, 4-state action lifecycle, 8-state ticket transitions, resolution gate, and atomic child cancellation.
  > - **Authorization & Concurrency**: Role matrices, Prisma Serializable transactions, `expectedTicketVersion`/`expectedActionVersion` (`409 CONFLICT`), and `Idempotency-Key` guards are clearly defined across all write APIs.
  > - **Dashboards & Traceability**: Requester and Staff/Admin dashboard metrics, 7-day `Asia/Bangkok` window, drill-down parity, and `AC-01`–`AC-13` planned test mappings are aligned and ready for implementation.
  >
  > Ready to merge into `lab4-staging`.
- **How I responded (@YummieGG)**:
  > Thank you @Snnn3 for the review and approval! All contract documents verified. Merged into `lab4-staging`.

---

### PR #66: Lab 4-2: Actions Taken data model, migration, seed, and API foundation
- **Target PR**: [#66](https://github.com/YummieGG/toktickit/pull/66) (`lab4-2-actions-foundation` → `lab4-staging`)
- **Base Commit**: `40025a2` (Merged PR #65)
- **Initial Implementation Commit**: `87acf65` (Merged: `c2c8efc`)
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Status**: Merged (`c2c8efc`)
- **Reviewer comment received (@Snnn3 - Changes Requested)**:
  > **Verdict: Changes Requested**
  >
  > Thank you for the implementation of the Actions Taken data model, migration, seed, and API foundation for Issue #57. The database schema, additive migration SQL, idempotent seed fixtures, role guards, and audit event tracking align very well with the Lab 4 engineering contract, and all existing unit and API test suites pass cleanly.
  >
  > However, please address the following boundary and concurrency issues before this PR can be approved:
  >
  > 1. **[Blocker] Uncaught `P2002` Unique Constraint on Concurrent Creation Race (BR-18, API-Spec §1)**: In `server/src/routes/actions-taken.ts` (`handleActionError`), only Prisma `P2034` (serialization conflict) is caught and mapped to `409`. If two identical `POST /api/tickets/:ticketId/actions-taken` requests with the same `Idempotency-Key` race past `tx.actionTaken.findFirst`, the second write triggers the database unique index `(ticketId, performedById, creationKey)` (`P2002`). This currently falls through to an unhandled `500 Internal Server Error`. In `handleActionError`, catch `P2002` on the creation key constraint and either fetch/replay the already-created action or return `409 CONFLICT` / `409 IDEMPOTENCY_CONFLICT`.
  > 2. **[Blocker] Boundary Validation for `assigneeId` on `POST` Creation (API-Spec §2)**: In `POST /api/tickets/:ticketId/actions-taken`, passing a non-numeric `assigneeId` (e.g. `"invalid"`) coerces to `NaN`. Calling `tx.user.findUnique({ where: { id: NaN } })` causes Prisma to throw a runtime argument error, resulting in an unexpected `500` instead of a client error. Validate that `assigneeId` is a positive safe integer before querying Prisma, returning `400 ASSIGNEE_INELIGIBLE`.
  > 3. **Missing Health/Root and 500 Test Coverage (Issue #57 Scope)**: Issue #57 scope requires covering health/root endpoints and safe error envelopes for `401/403/404/409/500`. Add test coverage in `server/tests/lab-04/` verifying `GET /health` and asserting that unexpected server errors emit the `{ error: { code: "INTERNAL_ERROR", ... } }` payload.
- **How I responded (@YummieGG)**:
  > Updated in commit `b7ef1c7`:
  > - **Idempotency Conflict Code:** Handled `P2002` race condition to return `409 IDEMPOTENCY_CONFLICT` on payload mismatch per `api-spec.md:112` and BR-18.
  > - **Assignee Validation Code:** Enforced safe integer validation on `assigneeId` upfront, returning `400 ASSIGNEE_INELIGIBLE` for invalid/ineligible assignees per `api-spec.md:106, 144`.
  > - **Test Coverage:** Added health check (`GET /api/health`) and unexpected 500 error envelope regression tests. All 24 test suites (326 unit + 14 integration) pass cleanly.
- **Reviewer comment received (@Snnn3 - Approved)**:
  > **Verdict: Approved (LGTM)**
  >
  > I have re-reviewed the Actions Taken data, migration, seed, and API foundation slice in PR #66 following commits `ec62eb7` and `b7ef1c7`. All feedback items from Round 1 have been cleanly resolved and verified:
  > 1. **Idempotency Race Handling (BR-18, API-Spec §1)**: Caught Prisma `P2002` unique constraint races on `(ticketId, performedById, creationKey)`. Identical payload replays return `200 OK` with the existing action projection, while differing fingerprints safely return `409 IDEMPOTENCY_CONFLICT`. Both race scenarios are covered by automated unit/API assertions.
  > 2. **Assignee Boundary Validation (API-Spec §2)**: `POST /api/tickets/:ticketId/actions-taken` now validates `assigneeId` format before query execution, returning `400 ASSIGNEE_INELIGIBLE` on non-integer or malformed values.
  > 3. **Health & 500 Error Envelopes (Issue #57 Scope)**: Added `API-00` suite verifying `GET /api/health` and asserting that unexpected server breakdowns emit the standard `{ error: { code: "INTERNAL_ERROR", ... } }` payload.
  > 4. **Full Test Suite Integrity**: All 326 server tests (24 files) and all 99 client tests (13 files) pass green with zero regressions.
  >
  > Zero blocking issues remain. Ready to merge into `lab4-staging`!

---

### PR #67: Lab 4-3: Actions Taken UI section and role access controls
- **Target PR**: [#67](https://github.com/YummieGG/toktickit/pull/67) (`lab4-3-actions-ui` → `lab4-staging`)
- **Base Commit**: `c2c8efc` (Merged PR #66)
- **Initial Implementation Commit**: `07a215d` (Merged: `774490a`)
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Status**: Merged (`774490a`)
- **Reviewer comment received (@Snnn3 - Changes Requested)**:
  > **Verdict: Changes Requested**
  >
  > Thank you for implementing the Actions Taken UI and role access slice for Issue #58. The component architecture, role separation (Staff/Admin interactive vs. Requester read-only), 4-state action lifecycle modals, optimistic concurrency reconciliation, and test coverage (128 client tests passing) are well put together.
  >
  > Please address the following spec and accessibility items before merging into `lab4-staging`:
  > 1. **[Missing Spec] Focus Invalid Control on Server Validation Errors (`ui-spec.md` §3 / line 59)**: In `ActionsTakenSection.tsx`, when the API rejects a creation payload with field errors (e.g., `ASSIGNEE_INELIGIBLE`), `setCreateValidationErrors` renders the message below the input, but focus is not shifted to the invalid control. Mirror client-side validation by calling `.focus()` on the invalid element when setting server validation error state.
  > 2. **[Missing Spec] Role Formatting in Edit Modal Header (`ui-spec.md` §6.1 / line 95)**: In the edit modal header, `editingAction.performedBy.role` displays raw enum text (`IT_STAFF`, `ADMINISTRATOR`) rather than human-readable text. Wrap with `ROLE_LABELS[editingAction.performedBy.role]` so it matches the table and card views.
  > 3. **[Accessibility] Missing `aria-label` on Mobile Action Buttons (`ui-spec.md` §1 & §9)**: Desktop table buttons define distinct accessible names, but mobile card buttons omit `aria-label`, causing screen readers to announce identical "Edit" or "Complete" buttons without context. Add the corresponding `aria-label={`Edit action ${act.id}`}` to mobile card buttons.
  > 4. **[Implementation Bug] Action Creation Appending Violates Pagination Boundaries (BR-10, `api-spec.md` §1)**: When a new action is created, it is appended directly to local state. If the user is on page 2 or has 20 items loaded, this appends a 21st item to the current page. Trigger a refetch of the action list or navigate to the final page on creation to preserve strict pagination and sort boundaries.
- **How I responded (@YummieGG)**:
  > Thanks @Snnn3 for the review and constructive feedback! All 4 items have been addressed in commit `747413e`:
  > 1. **Auto-focus on Server Validation Errors (`ui-spec.md §3`):** Shifted focus to the first invalid control when the API rejects form submission with field validation errors. Added unit test assertion verifying `document.activeElement` after error response.
  > 2. **Role Formatting in Edit Modal Header (`ui-spec.md §6.1`):** Wrapped `editingAction.performedBy.role` with `ROLE_LABELS` to display human-readable labels (`IT Staff`, `Administrator`) instead of raw enums.
  > 3. **Accessible Labels on Mobile Action Buttons (`ui-spec.md §1 & §9`):** Added context-aware `aria-label` attributes across all mobile card action buttons.
  > 4. **Pagination Boundary Adherence on Action Creation (`BR-10`):** Updated `handleCreateSubmit` to calculate `targetPage` and invoke `fetchActions(targetPage)`, ensuring newly created items move to the correct page without exceeding `pageSize` boundaries.
- **Reviewer comment received (@Snnn3 - Approved)**:
  > **Verdict: Approved (LGTM)**
  >
  > I have re-reviewed the Actions Taken UI and role access control implementation in PR #67 following commit `747413e`. All spec, accessibility, and pagination boundary findings from Round 1 have been completely resolved and verified:
  > 1. **Server Validation Error Focus (`ui-spec.md:59`)**: Server-returned validation errors (`body.error.fields`) now correctly move keyboard focus to the invalid control, matching the behavior of client-side validation.
  > 2. **Role Formatting in Edit Header (`ui-spec.md:95`)**: The edit modal header now renders user-friendly role labels (`(IT Staff)`, `(Administrator)`) via `ROLE_LABELS` instead of raw enum strings.
  > 3. **Mobile Accessibility (`ui-spec.md §1 & §9`)**: Mobile card buttons now provide explicit, accessible names, eliminating ambiguous repeated button names on screen readers.
  > 4. **Pagination & Boundary Integrity (BR-10, `api-spec.md §1`)**: New action creation now navigates to the target page and enforces `pageSize` bounds rather than appending items past the boundary.
  > 5. **Full Test Suite & Build Verification**: All 128 client tests (15 files) and 326 server regression tests (24 files) pass cleanly; Oxlint reported 0 errors/warnings; client TypeScript and production build succeed with zero errors.
  >
  > Zero blocking issues remain. Ready to merge into `lab4-staging`!

---

### PR #68: Lab 4-4: Enforce Ticket Workflow and Resolution Gate
- **Target PR**: [#68](https://github.com/YummieGG/toktickit/pull/68) (`lab4-4-ticket-workflow` → `lab4-staging`)
- **Base Commit**: `774490a` (Merged PR #67)
- **Initial Implementation Commit**: `f3f2c1e`
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Status**: Merged (`10176e2`)
- **Reviewer comment received (@Snnn3 - Changes Requested)**:
  > ### Missing Specifications & Implementation Defects (PR #68)
  >
  > 1. **Test Failure: 409 Conflict Handling Unmounts UI (`docs/lab-04/ui-spec.md:17`) [BLOCKER]**
  >    - **Spec**: *"Recoverable request errors preserve draft content; conflict errors (`409 CONFLICT`) show explicit reload and reconcile guidance without silently discarding user input."*
  >    - **Finding**: Running `npm test` in `client/` fails on `client/tests/lab-04/TicketWorkflow.test.tsx:288`:
  >      ```text
  >      FAIL tests/lab-04/TicketWorkflow.test.tsx > UI-02: Ticket Workflow and Resolution Feedback > handles 409 CONFLICT gracefully and displays conflict alert
  >      Error: expect(element).toBeInTheDocument()
  >      element could not be found in the document
  >      ```
  >    - **Root Cause**: In `client/src/pages/StaffTicketDetail.tsx` (line 147), handling a `409` conflict calls `setRetry(value => value + 1)`. This triggers `useEffect` (`setIsLoading(true); setTicket(null)`), which completely unmounts the ticket view and the alert banner before the test assertion can evaluate.
  >    - **Required Fix**: Avoid unmounting/full reload on 409 conflicts. Retain the current form state, display the conflict alert banner, and update ticket data in-place without clearing the view.
  >
  > 2. **Missing Reload / Reconcile Controls on 409 Conflict (`docs/lab-04/ui-spec.md:133`)**
  >    - **Spec**: *"Stale update conflicts (`409 CONFLICT`) retain user draft and offer reload/reconcile controls."*
  >    - **Finding**: `StaffTicketDetail.tsx` lacks dedicated reload/reconcile controls or guidance for stale ticket updates; triggering a retry resets the state instead of letting the user reconcile changes.
  >
  > 3. **Resolution Gate Error Banner Omitted (`docs/lab-04/ui-spec.md §7`)**
  >    - **Spec**: *"Attempting to resolve a Ticket that does not meet the resolution gate displays an explicit error banner stating the blocking condition."*
  >    - **Finding**: In `StaffTicketDetail.tsx` (lines 151–153), `mutationError` is explicitly suppressed (`null`) whenever field errors exist. When the server responds with `TICKET_RESOLUTION_BLOCKED` (`fields.resolutionGate`), the top-level error banner (`alert-danger`) is omitted, showing only the inline message below the status dropdown.
  >
  > 4. **Incomplete Live E2E Resolution Gate & Workflow Coverage (`docs/lab-04/tests.md:92` LIVE-01)**
  >    - **Spec**: *"Browser to real API to PostgreSQL action and workflow flow | Real DB transactions enforce resolution gate, version check, and idempotency"*
  >    - **Finding**: `e2e/lab-04/ticket-resolution.live.spec.ts` only executes direct API request assertions (stale version 409 and bad Origin 403). It omits testing the actual browser UI workflow, resolution gate blocking in the browser, and live DB transaction updates.
- **How I responded (@YummieGG)**:
  > Addressed all 4 review comments in `StaffTicketDetail.tsx`, `TicketWorkflow.test.tsx`, and `ticket-resolution.live.spec.ts`:
  > 1. **409 Conflict In-place State Retention:** Removed `setRetry(value => value + 1)` from 409 handling in `StaffTicketDetail.tsx`. Draft states (comments, notes, inputs) are preserved, the conflict alert is retained without unmounting or view flashing, and in-place reconciliation is enabled.
  > 2. **Explicit Reload & Reconcile Controls:** Added dedicated `Reload & Reconcile` button and draft-preservation guidance inside the conflict alert banner. Clicking it fetches the latest ticket version in-place and clears conflict state. Verified via automated test assertions in `TicketWorkflow.test.tsx`.
  > 3. **Top-Level Resolution Gate Error Banner Restored:** Removed suppression of `mutationError` on field errors in `StaffTicketDetail.tsx`. Both the top-level `.alert-danger` stating the blocking condition and the inline `#ticket-status-error` with `aria-invalid` and `aria-describedby` are now simultaneously displayed without collision.
  > 4. **Comprehensive Live E2E Workflow Coverage (LIVE-01):** Updated `e2e/lab-04/ticket-resolution.live.spec.ts` to execute end-to-end browser UI flows against live PostgreSQL: resolution gate blocking in browser UI, action recording, starting and completing with result in browser UI, successful resolution and timestamp verification, closing, reopening with timestamp resets, atomic child action cancellation on parent cancel, and API concurrency/origin security checks.
  >
  > All test suites (server: 394/394, client: 139/139, Playwright E2E: 24/24) pass cleanly with 0 regressions. Ready for re-review.
  >
  > **Iterative Code-Review Refinements (5 Rounds)**:
  > - **Round 1 (Conflict & Reconcile Resilience)**: Enhanced `refreshTicket` to return a `Promise<boolean>` and made the `Reload & Reconcile` button verify successful data retrieval before dismissing the conflict banner; if the network or server fails, the conflict notice is safely retained and an explicit retry alert is displayed. Added `.catch(() => {})` on `it-priority` mutation promise.
  > - **Round 2 (Accessibility & State Integrity)**: Set dynamic semantic ARIA role on top alert banner (`role={mutationError ? 'alert' : 'status'}`) ensuring screen readers announce error states as assertive alerts and success states politely. Removed premature clearance of validation and mutation errors at the start of `saveStatus` so that dismissing a confirmation modal leaves any existing resolution-gate or conflict banner intact.
  > - **Round 3 (Live E2E Environment Fallback)**: Added transparent fallback in `ticket-resolution.live.spec.ts` to read `SEED_INITIAL_PASSWORD` from local `server/.env` if not exported in shell environment, ensuring local runs succeed while retaining strict CI environment variable overrides.
  > - **Round 4 (Server Port Isolation)**: Guarded `app.listen` in `server/src/index.ts` behind `if (process.env.NODE_ENV !== 'test')` to prevent concurrent supertest processes from colliding on port 3000 during parallel Vitest runs.
  > - **Round 5 (Test Verification)**: Expanded `TicketWorkflow.test.tsx` with automated coverage for reconcile failure retention and error preservation upon cancelled confirmation prompts (139/139 client tests green). Full regression suites pass cleanly with 0 violations.
- **Reviewer comment received (@Snnn3 - Approved)**:
  > ### PR #68 Review: Specification Audit & Verification
  >
  > **Verdict: Approved (LGTM)** — All specification requirements for Issue #59 are fully satisfied with **0 missing requirements**.
  >
  > #### Key Verification Points:
  > 1. **In-DOM Modal Confirmation (`ui-spec.md:129-132`)**: Replaced `window.confirm()` with an accessible `ConfirmationModal` featuring focus trapping and explicit warnings for `CANCELLED`, `RESOLVED`, `CLOSED`, and `REOPENED`.
  > 2. **409 Conflict & Reconcile (`ui-spec.md:133`)**: Retains user drafts without unmounting views and provides explicit `Reload & Reconcile` controls.
  > 3. **Resolution Gate & Banner (`ui-spec.md §7`, BR-14)**: Prioritizes active action blockers and displays both the top-level error banner and inline field errors.
  > 4. **Validation (VALIDATION-01)**: Returns `VALIDATION_ERROR` (HTTP 400) for malformed versions and unknown fields.
  > 5. **Atomic Child Cancellation & Timestamps (BR-15, BR-16)**: Cancelling a ticket cancels active child actions; timestamp lifecycle (`resolvedAt`, `problemAppearsResolvedAt`) is correctly handled.
  > 6. **E2E & Concurrency Coverage (LIVE-01, PG-01)**: Full browser-to-DB journey and race condition tests pass.
  >
  > #### Test Results:
  > - **Client**: 17/17 files, 143/143 tests passed.
  > - **Server**: 25/25 files, 397/397 tests passed.
- **How I responded (@YummieGG)**:
  > Thank you @Snnn3 for the thorough review and approval! Merged into `lab4-staging` at commit `10176e2`.

---

### PR #69: Lab 4-5: Requester and Staff operational dashboards
- **Target PR**: [#69](https://github.com/YummieGG/toktickit/pull/69) (`lab4-5-role-dashboards` → `lab4-staging`)
- **Base Commit**: `10176e2` (Merged PR #68)
- **Initial Implementation Commit**: `365c023`
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Status**: Merged (`d494e6b`)
- **Reviewer comment received (@Snnn3 - Changes Requested)**:
  > ### PR #69 Review: Missing Specifications & Implementation Defects
  >
  > Verdict: Changes Requested — Core features and test suites pass, but several specification parity and responsive requirements need to be addressed:
  >
  > 1. Mobile Stacked Cards Missing (`ui-spec.md:146`): `StaffActionsTaken.tsx` only renders a desktop `<table>`, causing horizontal scrolling on 375 px mobile screens. Stacked cards with $\ge 44\text{ px}$ touch targets are required for mobile viewports.
  > 2. Action-in-Context Row Navigation (`ui-spec.md:141`): Clicking a table row in `StaffActionsTaken.tsx` does not navigate, and links from both the drill-down and dashboard preview lists do not pass the action anchor (e.g. `/staff/tickets/:ticketId#action-:actionId`).
  > 3. Requester Dashboard 7-Day Window Parity (`specification.md:72` FR-04-12): In `server/src/routes/dashboards.ts`, `recentTickets` does not filter by `updatedAt >= windowStart`. Tickets older than 7 days appear in the preview list but disappear when clicking "View all", breaking count and list parity.
  > 4. Staff Dashboard Window Timestamps (`api-spec.md:255`): The Recent Tickets "View all" link in `StaffDashboard.tsx` omits captured `updatedFrom` and `updatedTo` window query parameters.
  > 5. Urgent Tickets Sort Parity (`specification.md:74` FR-04-14): The Urgent Tickets drill-down link omits `sortBy=itPriority&sortOrder=desc`, causing the queue to default to `updatedAt desc` and reorder the preview list.
  > 6. Plain Text `pre-wrap` & Tokens (`ui-spec.md §1`): `StaffActionsTaken.tsx` lacks `white-space: pre-wrap` on user descriptions/results, collapsing line breaks. Metric cards also use `#F0F9F4` and `#DC2626` instead of official Zen Green tokens (`#EAF6EF`, `#C62828`).
- **How I responded (@YummieGG)**:
  > Addressed all 6 review comments and completed end-to-end specification parity across the full stack:
  > 1. **Mobile Stacked Cards (`ui-spec.md:146`):** Added responsive mobile card view (`d-md-none`) alongside the desktop table (`d-none d-md-table`) in `StaffActionsTaken.tsx`. Mobile cards display status badges, timestamps, performer names, action notes, and full-width touch targets ($\ge 44\text{ px}$) to eliminate horizontal scrolling on 375 px viewports.
  > 2. **Action-in-Context Row Navigation & Anchors (`ui-spec.md:141`):** Enabled click navigation on table rows with `cursor: pointer` and `onKeyDown` keyboard support (`Enter` / `Space`). Appended `#action-:actionId` anchor hashes to all action drill-down and dashboard preview links.
  > 3. **Requester Dashboard 7-Day Window Parity (FR-04-12):** Added `updatedAt: { gte: windowStart }` to `recentTickets` query in `server/src/routes/dashboards.ts`, aligning the preview list exactly with the `recentlyUpdated` metric count and the drill-down filter window.
  > 4. **Staff Dashboard Window Timestamps (`api-spec.md:255`):** Captured `data.window.from` and `data.window.to` in the Recent Tickets drill-down link in `StaffDashboard.tsx`.
  > 5. **Urgent Tickets & Attention Sort Parity (FR-04-14):** Appended `sortBy=itPriority&sortOrder=desc` to the Urgent Tickets drill-down link, added `sortBy=updatedAt&sortOrder=desc` to the Requester Attention Required drill-down link, and updated `buildStaffQueueOrderBy` in `server/src/lib/staff-queue.ts` with `{ updatedAt: 'desc' }` as secondary tie-breaker.
  > 6. **Design Tokens & Plain Text `pre-wrap` (`ui-spec.md §1`):** Applied `whiteSpace: 'pre-wrap'` and `wordBreak: 'break-word'` to all description/result/notes containers in `StaffActionsTaken.tsx`. Replaced ad-hoc hex values with canonical Zen Green tokens (`#EAF6EF` mint background, `#C62828` error red).
  > 7. **Bangkok Timezone Formatting (`ui-spec.md:93`):** Implemented `formatBangkokDateTime` and `formatBangkokDate` in `client/src/utils/date.ts` to ensure timestamps and filter badge chips render in `Asia/Bangkok` timezone without UTC day rollback.
  >
  > Full test suite verification: 430/430 server tests, 159/159 client tests, and 27/27 Playwright E2E scenarios pass green with zero regressions.
- **Reviewer comment received (@Snnn3 - Approved)**:
  > ### PR #69 Review: Approved (LGTM) 🚀
  >
  > I have reviewed the operational dashboards and drill-down implementations in PR #69 against **Issue #60**, `docs/lab-04/specification.md`, `docs/lab-04/api-spec.md`, and `docs/lab-04/ui-spec.md`. All core requirements and previous review feedback have been cleanly addressed.
  >
  > #### Key Verifications:
  > - **Requester Dashboard (`/dashboard`)**: Accurately computes owned metrics within the 7-day Bangkok calendar window, handles zero states safely, and provides bounded preview lists with parity drill-down links.
  > - **Staff & Admin Dashboard (`/staff/dashboard`)**: Full operational visibility with 7 metric cards, zero-count groups across all 8 statuses and 4 IT priorities, urgent ticket sorting, and "My Actions" previews.
  > - **Actions Taken Drill-down (`/staff/actions-taken`)**: Fully responsive with structured desktop table and mobile stacked card layouts ($\ge 44\text{ px}$ touch targets), URL search parameter synchronization, and action-in-context row navigation (`#action-:id`).
  > - **Query Filter Extensions**: `GET /api/tickets` and `GET /api/staff/tickets` successfully support comma-separated status/priority sets, ISO-8601 date ranges, and stable sorting.
  > - **Test Suites**:
  >   - **Client**: 20/20 test files passed (159/159 tests green).
  >   - **Server**: 27/27 test files passed (430/430 tests green).
  >   - **Regressions**: 0 regressions across inherited Lab 1–3 suites.
  >
  > Ready to merge into `lab4-staging`.
- **How I responded (@YummieGG)**:
  > Thank you @Snnn3 for the review and approval! All dashboard features and filter parity verified. Merged into `lab4-staging` at commit `d494e6b`.

---

### PR #70: Lab 4-6: Complete regression, security, accessibility, and visual QA
- **Target PR**: [#70](https://github.com/YummieGG/toktickit/pull/70) (`lab4-6-verification-qa` → `lab4-staging`)
- **Base Commit**: `d494e6b` (Merged PR #69)
- **Initial Implementation Commit**: `69ab624`
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Status**: Merged (`2ede4ce`)
- **Reviewer comment received (@Snnn3 - Changes Requested)**:
  > ### PR #70 Review: Missing Specifications & Implementation Defects
  >
  > Verdict: Changes Requested — Core visual artifacts and tests are committed, but several critical test-masking defects, broken selectors, and missing spec items must be resolved:
  >
  > 1. Broken Selectors & Silent Skips in Live E2E (`actions-taken-flow.live.spec.ts`) [CRITICAL]:
  >   - Line 77: Uses `#action-create-requires-follow-up`, which does not match DOM ID `#action-create-followup`. The follow-up note workflow is never actually tested.
  >   - Line 201: Uses `#actions-taken-section`, which does not match `data-testid="actions-taken-section"` in the DOM. Wrapped in `if (await actionsSection.isVisible())`, the entire Requester read-only assertion block (lines 202–209) silently skips without asserting anything.
  >   - Fix: Remove conditional `isVisible()` guards on mandatory elements and correct the selector IDs so tests fail fast if elements are missing.
  > 2. Omitted Action Assignment Flow in LIVE-01 (`tests.md:93`, `AC-04`):
  >   - The test title and contract specify verifying action assignment and reassignment, but `actions-taken-flow.live.spec.ts` never tests assigning an action to another staff member.
  > 3. Incomplete Regression Visual Screenshots (`visual-checklist.md`):
  >   - `docs/lab-04/visual-checklist.md` requires visual regression evidence across Login, Change Password, My Tickets, Staff Queue, and User Management.
  >   - `e2e/lab-04/visual-qa.spec.ts` only captures Staff Queue (1280px), Ticket Detail (768px), and User Management (375px), omitting Login, Change Password, and My Tickets.
  > 4. Inconsistent Screenshot Count in Checklist (`visual-checklist.md:38`):
  >   - Line 38 states "All 23 screenshot artifacts are captured", but 28 PNG files are committed in `artifacts/lab-04/screenshots/`. Update the checklist text to match the committed artifacts.
- **How I responded (@YummieGG)**:
  > Addressed all 4 review comments and completed two-axis code-review audit:
  > 1. **Fixed Selectors & Removed Skips (`actions-taken-flow.live.spec.ts`):** Replaced `#action-create-requires-follow-up` with `#action-create-followup`, added `#action-create-followup-note`, added `id="actions-taken-section"` to `ActionsTakenSection.tsx`, and eliminated all conditional `isVisible()` skips so assertions fail fast.
  > 2. **Action Assignment Flow (`LIVE-01`, `AC-04`):** Added reassignment flow exercising `#action-reassign-select` to assign to another staff member and asserted success toast and updated assignee badge.
  > 3. **Regression Visual Coverage (`visual-checklist.md`):** Added full screenshots for `login.png`, `change-password.png`, and `my-tickets.png`, and parameterized all 6 regression screens into a table-driven loop testing across all viewports (1280, 768, 375 px) with `scrollWidth <= innerWidth`.
  > 4. **Screenshot Count Synchronization:** Synchronized `docs/lab-04/visual-checklist.md` to state 31 screenshots, matching the exact 31 PNGs on disk.
  > 5. **Desktop Navbar Overflow:** Added `flex-wrap` in `AppShell.tsx` to eliminate horizontal scroll at 1280px for administrator navigation.
  > 6. **Strict Idempotency:** Enforced strict status 201 on create and status 200 on key replay.
  > 7. **Baseline Deltas:** Documented intentional Lab 3 baseline deltas in `docs/lab-04/tests.md` §6.
  >
  > Approved by @Snnn3 and merged into `lab4-staging` at commit `2ede4ce`.

---

### PR #71: Lab 4-7: Staged integration and clean verification
- **Target PR**: [#71](https://github.com/YummieGG/toktickit/pull/71) (`lab4-7-staged-integration` → `lab4-staging`)
- **Base Commit**: `2ede4ce` (Merged PR #70)
- **Commit SHA**: `dd41704` (Merged: `61ea687`)
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Status**: Merged (`61ea687`)
- **Reviewer comment received (@Snnn3 - Approved)**:
  > ### PR #71 Review: Approved (LGTM) 🚀
  >
  > I have reviewed the staged integration and clean verification deliverables in PR #71 against **Lab 4-7**, `docs/lab-04/specification.md`, `docs/lab-04/reviewer.md`, and `docs/lab-04/tests.md`. All previous feature increments (PR #65 through PR #70) are cleanly integrated with zero regressions.
  >
  > #### Key Verifications:
  > - **Clean Staged Integration**: Merge order from Lab 4-1 through Lab 4-6 is verified on `lab4-staging`. Client build (`npm run build`) and linting (`npm run lint`) pass with 0 errors and 0 warnings.
  > - **Full Test Suite Verification**:
  >   - **Client**: 20/20 test files passed (159/159 tests green).
  >   - **Server**: 27/27 test files passed (430/430 tests green).
  >   - **Test Isolation**: Added Prisma transaction mock isolation in `actions-taken.api.test.ts` to prevent mock state bleed.
  > - **Documentation & Traceability**:
  >   - `docs/lab-04/reviewer.md` is updated with complete peer-review logs, statuses, and commit SHAs for PRs #65–#71.
  >   - `docs/lab-04/tests.md` §6 accurately reflects the verified staged integration run.
  >   - Visual QA responsive layout verifications and 31 screenshot artifacts are confirmed.
  >
  > Ready to merge into `lab4-staging`.
- **How I responded (@YummieGG)**:
  > Thank you, @Snnn3, for the review and approval! All staged integration requirements are complete and verified. Merged into `lab4-staging`.
- **Verification & Staged Deliverables**:
  - Full dependency merge order verified: PRs #65, #66, #67, #68, #69, #70 integrated cleanly on `lab4-staging`.
  - Client Build: `npm run build` (0 errors), `npm run lint` (0 warnings, 0 errors).
  - Client Unit & Component Tests: 20 files, 159/159 passed.
  - Server Build & Tests: 27 files, 430/430 passed.
  - Playwright E2E Suite: 32/32 tests passed across Lab 1–4.
  - Visual QA Viewports: Zero horizontal scrollbar across 1280, 768, 375 px with 31 verified screenshot artifacts.

