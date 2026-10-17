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
| [#65](https://github.com/YummieGG/toktickit/pull/65) | Lab 4-1: Define Sprint 4 Engineering Contract and Traceability | `lab4-1-engineering-contract` | `da2426b` (Initial) | Open | [@Snnn3](https://github.com/Snnn3) |
| [#66](https://github.com/YummieGG/toktickit/pull/66) | Lab 4-2: Actions Taken data model, migration, seed, and API foundation | `lab4-2-actions-foundation` | `87acf65` (Initial) | Merged | [@Snnn3](https://github.com/Snnn3) |
| [#67](https://github.com/YummieGG/toktickit/pull/67) | Lab 4-3: Actions Taken UI section and role access controls | `lab4-3-actions-ui` | `07a215d` (Initial) | Open | [@Snnn3](https://github.com/Snnn3) |
| [#68](https://github.com/YummieGG/toktickit/pull/68) | Lab 4-4: Enforce Ticket Workflow and Resolution Gate | `lab4-4-ticket-workflow` | `f3f2c1e` (Initial) | Changes Requested | [@Snnn3](https://github.com/Snnn3) |
| Pending | Lab 4-5: Requester and Staff operational dashboards | `lab4-5-dashboards` | Planned | Planned | [@Snnn3](https://github.com/Snnn3) |
| Pending | Lab 4-6: Cross-cutting verification, QA test suite, and visual evidence | `lab4-6-verification-qa` | Planned | Planned | [@Snnn3](https://github.com/Snnn3) |
| Pending | Lab 4-7: Staged integration and clean verification | `lab4-7-staging-integration` | Planned | Planned | [@Snnn3](https://github.com/Snnn3) |
| Pending | Lab 4-8: Final documentation, reviewer logs, AI log, and submission packaging | `lab4-8-documentation` | Planned | Planned | [@Snnn3](https://github.com/Snnn3) |
| Pending | Lab 4-9: Release verification against final main, evidence check, and tag | `lab4-9-release-verification` | Planned | Planned | [@Snnn3](https://github.com/Snnn3) |

---

## Pull Requests Reviewed

> *Note on Partner Implementation Records:* The entries below record peer review performed on partner repository (Snnn3/TokTickIT). Partner uses `409 STALE_WRITE` and `resolutionSummary` in their codebase; TokTickIT contract standardizes on `409 CONFLICT` and completion predicate per `api-spec.md` and `specification.md`.

| PR # | Title | Author | Status | Key Comments |
|:---|:---|:---|:---|:---|
| [#63](https://github.com/Snnn3/TokTickIT/pull/63) | docs(lab4): add engineering contract for Issue #54 | [@Snnn3](https://github.com/Snnn3) | Merged | Verified 6 companion documents, 8-state lifecycle, 13-row auth matrix, 1:N Action Taken model, optimistic concurrency via 409 STALE_WRITE, and 23 ACs mapped to 89 test pairs. Approved. |
| [#64](https://github.com/Snnn3/TokTickIT/pull/64) | feat(lab4-2): add Actions Taken data foundation | [@Snnn3](https://github.com/Snnn3) | Merged | Verified Prisma schema, PostgreSQL CHECK constraints, ON DELETE RESTRICT FKs, legacy data preservation via capture.ts, and 8 idempotent seed fixtures across all 4 action statuses. Approved. |
| [#65](https://github.com/Snnn3/TokTickIT/pull/65) | feat(lab4-3): add Actions Taken API and authorization | [@Snnn3](https://github.com/Snnn3) | Merged | Caught unit test isolation regression in `users-admin.api.test.ts` where unstubbed `prisma.actionTaken.findMany` threw 500 without database. Requested changes; approved on Round 2 after test stubbing. |
| [#66](https://github.com/Snnn3/TokTickIT/pull/66) | feat(lab4): enforce ticket workflow resolution gate | [@Snnn3](https://github.com/Snnn3) | Merged | Verified 8-state ticket transitions (16 valid, 48 forbidden), completed-action and resolution-summary resolution gate, advisory signal status neutrality, and 409 STALE_WRITE conflict recovery. Approved. |

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

## Review Comments Received & Responses

### PR #65: Lab 4-1: Define Sprint 4 Engineering Contract and Traceability
- **Target PR**: [#65](https://github.com/YummieGG/toktickit/pull/65) (`lab4-1-engineering-contract` → `lab4-staging`)
- **Base Commit**: `a295882` (Lab 3 main baseline)
- **Initial Contract Commit**: `da2426b`
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Status**: Open
- **Reviewer comment received (@Snnn3)**:
  > Awaiting peer review on the Lab 4 engineering contract package.
- **How I responded (@YummieGG)**:
  > Ready for review.

---

### PR #68: Lab 4-4: Enforce Ticket Workflow and Resolution Gate
- **Target PR**: [#68](https://github.com/YummieGG/toktickit/pull/68) (`lab4-4-ticket-workflow` → `lab4-staging`)
- **Base Commit**: `774490a` (Merged PR #67)
- **Initial Implementation Commit**: `f3f2c1e`
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Status**: Changes Requested → Addressed
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
  > All test suites (server: 394/394, client: 137/137, Playwright E2E: 24/24) pass cleanly with 0 regressions. Ready for re-review.
