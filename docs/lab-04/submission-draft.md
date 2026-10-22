<style>
  @page {
    size: A4 portrait;
    margin: 12mm 13mm 15mm;
  }
  @page landscapeEvidence {
    size: A4 landscape;
    margin: 10mm 12mm 14mm;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #1A2E1A;
    line-height: 1.5;
    font-size: 0.85em;
    background-color: #FFFFFF;
    max-width: none;
    margin: 0;
    padding: 0;
  }
  h1 {
    font-size: 1.8em;
    font-weight: bold;
    border-bottom: 2px solid #006B3C;
    padding-bottom: 6px;
    color: #1A2E1A;
    margin-top: 24px;
  }
  h2 {
    font-size: 1.3em;
    font-weight: bold;
    color: #1A2E1A;
    margin-top: 18px;
  }
  h3, h4 {
    font-size: 1.05em;
    font-weight: 600;
    color: #1A2E1A;
    margin-top: 12px;
  }
  table {
    width: 100%;
    max-width: 100%;
    border-collapse: collapse;
    margin: 10px 0 16px 0;
  }
  th, td {
    overflow-wrap: anywhere;
    word-break: normal;
  }
  th {
    font-weight: bold;
    font-size: 0.9em;
    background-color: #EAF6EF;
    border: 1px solid #DEE2E0;
    padding: 4px 6px;
    text-align: left;
    color: #1A2E1A;
  }
  td {
    font-weight: 300;
    font-size: 0.8em;
    border: 1px solid #DEE2E0;
    padding: 4px 6px;
    line-height: 1.4;
  }
  a {
    color: #1A2E1A;
    text-decoration: underline;
  }
  img {
    max-width: 100%;
    display: block;
    margin: 8px 0;
    border: 1px solid #DEE2E0;
    border-radius: 4px;
  }
  blockquote {
    border-left: 3px solid #006B3C;
    padding-left: 12px;
    margin-left: 0;
    color: #1A2E1A;
    background-color: #F5F7F6;
    padding-top: 4px;
    padding-bottom: 4px;
  }
  pre {
    background-color: #F5F7F6;
    border: 1px solid #DEE2E0;
    padding: 10px;
    border-radius: 4px;
    font-size: 0.8em;
    overflow-x: auto;
    color: #000000 !important;
  }
  code {
    font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.9em;
    background-color: #F0F4F0;
    padding: 2px 4px;
    border-radius: 3px;
    color: #000000 !important;
  }
  .screenshot-container {
    border: 1px solid #DEE2E0;
    background-color: #F9FAF9;
    padding: 10px;
    margin: 12px 0;
    border-radius: 6px;
    text-align: center;
  }
  .screenshot-container img {
    margin: 0 auto;
    max-height: 520px;
  }
  .screenshot-caption {
    font-size: 0.8em;
    color: #4A5D4E;
    margin-top: 6px;
    font-weight: 500;
  }
</style>

# **Lab 4 Submission: TokTickIT Actions Taken, Ticket Workflow & Operational Dashboards**

| Field | Detail |
| :--- | :--- |
| **Student Name (Author)** | Worawut Sereethai (นายวรวุฒิ เสรีไทย) |
| **Student ID** | 67070501040 |
| **GitHub Account** | [@YummieGG](https://github.com/YummieGG) |
| **Partner Name (Reviewer)** | Chanon Lhumsa-ard (นายชานนท์ เหลื่อมสะอาด) |
| **Partner Student ID** | 67070501059 |
| **Partner GitHub** | [@Snnn3](https://github.com/Snnn3) |
| **Course** | CPE334 Software Engineering (2026/1) |
| **Repository Baseline** | `lab4-staging` (merged through PR #65, #66, #67, #68, #69, #70, #71) |
| **Target Release Branch** | `main` (via final Release PR from `lab4-staging`) |

---

# Answer Part 1: Git Use with Engineering Workflow

## 1.1 Working URL List

### GitHub Repository & Project Board
| Resource | Description | URL |
| :--- | :--- | :--- |
| **GitHub Repository** | TokTickIT Main Repository | [https://github.com/YummieGG/toktickit](https://github.com/YummieGG/toktickit) |
| **GitHub Project** | TokTickIT Sprint 4 Kanban Board | [https://github.com/users/YummieGG/projects/2](https://github.com/users/YummieGG/projects/2) |

### Closed GitHub Issues for Lab 4
| Issue | Title | Milestone / Area | Working URL |
| :---: | :--- | :--- | :--- |
| **#56** | Lab 4-1: Define Sprint 4 Engineering Contract and Traceability | Contract Documents | [https://github.com/YummieGG/toktickit/issues/56](https://github.com/YummieGG/toktickit/issues/56) |
| **#57** | Lab 4-2: Build Actions Taken Data, Migration and Idempotent Seed | Actions Data Model | [https://github.com/YummieGG/toktickit/issues/57](https://github.com/YummieGG/toktickit/issues/57) |
| **#58** | Lab 4-3: Implement Actions Taken UI and Role Access Controls | Actions Taken UI | [https://github.com/YummieGG/toktickit/issues/58](https://github.com/YummieGG/toktickit/issues/58) |
| **#59** | Lab 4-4: Enforce Ticket Workflow and Resolution Gate | Workflow & Resolution Gate | [https://github.com/YummieGG/toktickit/issues/59](https://github.com/YummieGG/toktickit/issues/59) |
| **#60** | Lab 4-5: Build Requester and Staff Dashboards | Operational Dashboards | [https://github.com/YummieGG/toktickit/issues/60](https://github.com/YummieGG/toktickit/issues/60) |
| **#61** | Lab 4-6: Complete Regression, Security, Accessibility, and Visual QA | Verification & QA | [https://github.com/YummieGG/toktickit/issues/61](https://github.com/YummieGG/toktickit/issues/61) |
| **#62** | Lab 4-7: Integrate Lab 4 on Staging and Run Core Verification | Staged Integration | [https://github.com/YummieGG/toktickit/issues/62](https://github.com/YummieGG/toktickit/issues/62) |
| **#63** | Lab 4-8: Prepare Documentation and Submission Package | Documentation & Draft | [https://github.com/YummieGG/toktickit/issues/63](https://github.com/YummieGG/toktickit/issues/63) |

### Pull Requests Authored and Merged into `lab4-staging` (Reviewed by @Snnn3)
| PR # | Title | Branch | Status | Reviewer | Working URL |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **#65** | docs(lab4-1): define Sprint 4 Engineering Contract and Traceability | `lab4-1-engineering-contract` | Merged | [@Snnn3](https://github.com/Snnn3) | [https://github.com/YummieGG/toktickit/pull/65](https://github.com/YummieGG/toktickit/pull/65) |
| **#66** | feat(lab4-2): build actions taken data, migration, and idempotent seed | `lab4-2-actions-foundation` | Merged | [@Snnn3](https://github.com/Snnn3) | [https://github.com/YummieGG/toktickit/pull/66](https://github.com/YummieGG/toktickit/pull/66) |
| **#67** | feat(lab4-3): implement actions taken ui and role access controls | `lab4-3-actions-ui` | Merged | [@Snnn3](https://github.com/Snnn3) | [https://github.com/YummieGG/toktickit/pull/67](https://github.com/YummieGG/toktickit/pull/67) |
| **#68** | feat(lab4-4): enforce ticket workflow and resolution gate | `lab4-4-ticket-workflow` | Merged | [@Snnn3](https://github.com/Snnn3) | [https://github.com/YummieGG/toktickit/pull/68](https://github.com/YummieGG/toktickit/pull/68) |
| **#69** | feat(lab4-5): implement requester and staff operational dashboards | `lab4-5-role-dashboards` | Merged | [@Snnn3](https://github.com/Snnn3) | [https://github.com/YummieGG/toktickit/pull/69](https://github.com/YummieGG/toktickit/pull/69) |
| **#70** | feat(lab4-6): complete regression, security, accessibility, and visual qa | `lab4-6-verification-qa` | Merged | [@Snnn3](https://github.com/Snnn3) | [https://github.com/YummieGG/toktickit/pull/70](https://github.com/YummieGG/toktickit/pull/70) |
| **#71** | test(lab4-7): integrate Lab 4 on staging and complete core verification | `lab4-7-staged-integration` | Merged | [@Snnn3](https://github.com/Snnn3) | [https://github.com/YummieGG/toktickit/pull/71](https://github.com/YummieGG/toktickit/pull/71) |

### Peer Pull Requests Reviewed (Snnn3/TokTickIT — Reviewed by @YummieGG)
| PR # | Title | Author | Status | Working URL |
| :---: | :--- | :---: | :---: | :--- |
| **#63** | docs(lab4): add engineering contract for Issue #54 | [@Snnn3](https://github.com/Snnn3) | Merged | [https://github.com/Snnn3/TokTickIT/pull/63](https://github.com/Snnn3/TokTickIT/pull/63) |
| **#64** | feat(lab4-2): add Actions Taken data foundation | [@Snnn3](https://github.com/Snnn3) | Merged | [https://github.com/Snnn3/TokTickIT/pull/64](https://github.com/Snnn3/TokTickIT/pull/64) |
| **#65** | feat(lab4-3): add Actions Taken API and authorization | [@Snnn3](https://github.com/Snnn3) | Merged | [https://github.com/Snnn3/TokTickIT/pull/65](https://github.com/Snnn3/TokTickIT/pull/65) |
| **#66** | feat(lab4): enforce ticket workflow resolution gate | [@Snnn3](https://github.com/Snnn3) | Merged | [https://github.com/Snnn3/TokTickIT/pull/66](https://github.com/Snnn3/TokTickIT/pull/66) |
| **#67** | feat(lab4): add Actions Taken ticket detail UI (#58) | [@Snnn3](https://github.com/Snnn3) | Merged | [https://github.com/Snnn3/TokTickIT/pull/67](https://github.com/Snnn3/TokTickIT/pull/67) |
| **#68** | feat(lab4): add IT Staff Dashboard (#59) | [@Snnn3](https://github.com/Snnn3) | Merged | [https://github.com/Snnn3/TokTickIT/pull/68](https://github.com/Snnn3/TokTickIT/pull/68) |
| **#69** | feat(lab4): requester dashboard (#60) | [@Snnn3](https://github.com/Snnn3) | Merged | [https://github.com/Snnn3/TokTickIT/pull/69](https://github.com/Snnn3/TokTickIT/pull/69) |

---

## 1.2 Kanban Board Evidence & Issue Traceability

All 8 feature issues for Sprint 4 (Issues #56 through #63) were managed through the GitHub Project Board `TokTickIT Project Board` and moved sequentially into the `Done` column following rigorous peer code review and passing CI verification.

---

## 1.3 Git Staged Integration Workflow & Commit History

TokTickIT follows strict Git workflow rules:
1. Feature branches are cut from `lab4-staging`.
2. All feature changes are reviewed, approved by [@Snnn3](https://github.com/Snnn3), and merged via PR into `lab4-staging`.
3. Staged integration verification runs on `lab4-staging` before releasing into `main`.

### Recent Commit History on `lab4-staging`
```text
61ea687 Merge pull request #71 from YummieGG/lab4-7-staged-integration
dd41704 docs(lab4-7): update PR 71 branch commit hash in reviewer record
012e307 test(lab4-7): complete staged integration verification and align reviewer record
2ede4ce Merge pull request #70 from YummieGG/lab4-6-verification-qa
245e7e7 docs(lab4-6): synchronize PR 70 commit hash in reviewer record
8ae8201 fix(lab4-6): enforce strict idempotency assertions, parameterize regression visual specs, and log PR 70 review record
ad72384 fix(lab4-6): prevent navbar desktop overflow, parameterize regression viewports, and clean live spec
f20683a fix(lab4-6): resolve PR #70 review feedback on live selectors, assignment flow, and regression visual coverage
69ab624 feat(lab4-6): complete regression, security, accessibility, and visual qa
d494e6b Merge pull request #69 from YummieGG/lab4-5-role-dashboards
ef3c406 fix(lab4-5): render Bangkok timestamps in dashboard tables and align live e2e suite
777c81b fix(lab4-5): address parity on action timezones, queue tie-breakers, date chips, and update reviewer record
b6c7cb8 fix(lab4-5): add window focus refresh, sync sort search params, and harmonize color tokens
1848ce8 fix(lab4-5): address PR #69 review on mobile cards, action anchors, window parity, and tokens
5101a15 fix(lab4-5): prevent drilldown filter collisions, synchronize url search params, and add active filter pills
365c023 feat(lab4-5): implement requester and staff operational dashboards with drill-downs
10176e2 Merge pull request #68 from YummieGG/lab4-4-ticket-workflow
b7d1fdb refactor(lab4-4): extract ConfirmationModal component, align Zen Green tokens, and bind status ref
478b8fe test(lab4-4): add dedicated legacy ticket workflow tests and align alert tokens
2e4aed3 test(lab4-4): add PG-01 concurrency test for competing resolve vs child action write
e0acd58 fix(lab4-4): restore focus on modal confirm, clean unused imports, and update e2e modal interaction
66808b1 fix(lab4-4): retain modal during save, add focus trap, and use Alert component
153a4fa fix(lab4-4): replace window.confirm with in-DOM modal, prioritize active actions in gate, and return VALIDATION_ERROR on malformed version
5d0751d fix(lab4-4): harden reconcile error recovery, error banner persistence, and server test port isolation
1b21349 fix(lab4-4): address PR #68 review feedback on conflict handling, resolution banner, and live e2e
49267fe fix(lab4-4): bind resolution gate error to status control with aria-invalid and aria-describedby
f3f2c1e feat(lab4-4): enforce ticket workflow, resolution gate, and child action cancellation
774490a Merge pull request #67 from YummieGG/lab4-3-actions-ui
747413e fix(lab4-3): focus invalid controls, format edit header role, add mobile a11y labels, and enforce pagination boundaries
b30c57d fix(lab4-3): use Zen Green badge tokens, validate edit result length, and clarify follow-up indicators
```

---

## 1.4 Rendered Peer Review Log (`toktickit/docs/lab-04/reviewer.md`)

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
| Pending | Lab 4-8: Final documentation, reviewer logs, AI log, and submission packaging | `lab4-8-documentation-submission` | In Progress | Planned | [@Snnn3](https://github.com/Snnn3) |
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



---

## 1.5 Rendered README.md (Setup, Commands, & Repository Structure)

# TokTickIT - IT Service Desk

TokTickIT is an IT service desk management system designed for logging, tracking, and resolving IT service requests.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, React Router 7, Bootstrap 5
- **Backend**: Node.js, Express 5, TypeScript, TSX
- **Database & ORM**: PostgreSQL 15, Prisma ORM 7 (with `@prisma/adapter-pg`)
- **Testing**: Vitest, Supertest, React Testing Library, Playwright

---

## Repository Structure

```text
toktickit/
├── client/                     # Frontend web application (React 19 + TypeScript + Vite)
│   ├── src/                    # Components, pages, auth context, and Zen Green design tokens
│   └── tests/                  # UI, component, and visual test suites (lab-02, lab-03, lab-04)
├── server/                     # Backend REST API service (Express 5 + TypeScript)
│   ├── prisma/                 # Prisma schema, migrations, and idempotent seed script
│   ├── src/                    # API routes (auth, tickets, staff, actions, admin, dashboards), middleware, lib
│   ├── tests/                  # Vitest API and PostgreSQL integration tests (lab-01, lab-02, lab-03, lab-04)
│   └── uploads/                # Local directory for ticket file attachments
├── e2e/                        # End-to-end browser test suites (Playwright)
│   ├── lab-02/                 # Requester ticket workflows and responsive checks
│   ├── lab-03/                 # Auth, IT Staff queue/detail, Admin user management, live E2E
│   ├── lab-04/                 # Actions Taken, resolution gate, dashboards, and visual QA
│   ├── playwright.config.ts    # Mocked fixture-backed E2E configuration
│   └── playwright.live.config.ts # Real server + PostgreSQL live integration configuration
├── docs/                       # Project specifications, contract documents, and review logs
│   ├── lab-01/                 # Sprint 1 documentation, tests, reviewer logs, and AI use
│   ├── lab-02/                 # Sprint 2 engineering contract, specs, and test reports
│   ├── lab-03/                 # Sprint 3 engineering contract, API/UI specs, tests, and reviewer log
│   └── lab-04/                 # Sprint 4 engineering contract, Actions Taken, dashboards, and review logs
├── artifacts/                  # Visual QA evidence and test screenshots
│   ├── lab-02/                 # Responsive screenshots for Lab 2
│   ├── lab-03/screenshots/     # Multi-role screenshots across desktop, tablet, and mobile
│   └── lab-04/screenshots/     # Multi-role screenshots across viewports for Lab 4
└── docker-compose.yml          # PostgreSQL database service container definition
```

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
not publish a usable credential. The seeded sign-in emails (12 total accounts) are:

- Requesters: `somchai.p@toktickit.local`, `suda.s@toktickit.local`,
  `anan.s@toktickit.local`, `kanda.m@toktickit.local`, `malee.j@toktickit.local`,
  and inactive `wichai.r@toktickit.local`.
- IT Staff: `narin.staff@toktickit.local`, `pimchanok.staff@toktickit.local`,
  `chaiwat.staff@toktickit.local`, and inactive `somsak.staff@toktickit.local`.
- Administrators: `araya.admin@toktickit.local`, `kittisak.admin@toktickit.local`.

The seed also populates 8 deterministic Actions Taken records across tickets,
covering all 4 action lifecycle statuses (`PENDING`, `IN_PROGRESS`, `COMPLETED`,
`CANCELLED`), multiple assignees, follow-up notes, and 7-day rolling window dates.

### Database Migration, Reset & Recovery

If the database needs to be migrated, cleanly reset, or recovered from a stale state:

```bash
cd server

# Apply pending migrations to existing database
npx prisma migrate deploy

# Full reset and clean recovery: wipes database, reapplies all migrations, and runs idempotent seed
npx prisma migrate reset --force

# Verification of idempotent seeding
npx prisma db seed
```

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

### 5. Role Workflows & Demonstration

- **Requester Flow (`/dashboard` & `/tickets`)**:
  - Sign in as `somchai.p@toktickit.local`.
  - The Requester Dashboard displays 4 Bangkok 7-day rolling window metric cards (`Active Tickets`, `Waiting for You`, `Recently Updated`, `Recently Resolved`) and 3 preview lists with drill-down query links.
  - Create tickets, view attachments, post public comments, and signal advisory `Problem Appears Resolved`.
  - Actions Taken section on Ticket Detail is rendered in read-only mode for the ticket owner.
- **IT Staff Flow (`/staff/dashboard`, `/staff/queue`, `/staff/actions-taken`)**:
  - Sign in as `narin.staff@toktickit.local`.
  - The Staff Dashboard displays 7 operational metrics (unassigned tickets, my tickets, my actions, status/priority breakdown), urgent ticket previews, and assigned actions preview.
  - Inspect assigned actions on `/staff/actions-taken` with status filter chips, pagination, and deep-linking `#action-:actionId`.
  - On Ticket Detail (`/staff/tickets/:id`), record, assign, edit, and transition Actions Taken.
  - Enforce Ticket Resolution Gate: resolving a ticket requires at least one completed action with a recorded result, no pending/in-progress actions, and no unresolved follow-up requirements.
- **Administrator Flow (`/admin/users`)**:
  - Sign in as `araya.admin@toktickit.local`.
  - Manage user accounts (deactivate, reactivate, initial password generation) with serializable safety guards preventing last-admin demotion or self-deactivation.
  - Admins can inspect queues and record Actions Taken, but formal ticket status transitions are strictly restricted to IT Staff (HTTP 403 Forbidden).

---

### 6. E2E Setup (Playwright)

From the repository root, install the E2E dependencies and Chromium once:

```bash
cd e2e
npm install
npx playwright install chromium
```

The E2E suite uses deterministic API fixtures and starts the Vite client automatically. It covers requester flows, staff workflows, resolution gate, dashboards, and responsive checks across 1280px, 768px, and 375px:

```bash
cd e2e
npm test
```

To run the visual QA suite capturing responsive screenshots:
```bash
cd e2e
npx playwright test e2e/lab-04/visual-qa.spec.ts
```

To run the live integration E2E suite against a real server and PostgreSQL database:

```bash
cd e2e
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toktickit_live_test?schema=public" \
SEED_INITIAL_PASSWORD="your-local-seed-password" \
E2E_TEST_PASSWORD="your-local-test-password" \
AUTH_IP_PEPPER="your-local-pepper" \
npm run test:live
```

---

## Running Automated Tests

### Backend Tests (Server)
Tests covering API endpoints, health check, master data, ticket workflow, actions taken, and operational dashboards:

```bash
cd server
npm test
```
*Current test metrics:* 27 test files passed, 430/430 tests green.

To run a specific test file:
```bash
npx vitest run tests/lab-04/actions-taken.api.test.ts
npx vitest run tests/lab-04/ticket-workflow.api.test.ts
```

To run the PostgreSQL integration checks (concurrency, migration, seed, performance smoke):
```bash
cd server
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toktickit_admin_test?schema=public"
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test:integration
```

### Frontend Tests (Client)
Tests covering UI components, loading states, dashboards, Actions Taken panel, and ticket workflow:

```bash
cd client
npm test
```
*Current test metrics:* 20 test files passed, 159/159 tests green.

To run a specific test file:
```bash
npx vitest run tests/lab-04/ActionsTaken.test.tsx
npx vitest run tests/lab-04/TicketWorkflow.test.tsx
npx vitest run tests/lab-04/StaffDashboard.test.tsx
```

To run the production build and lint checks:
```bash
cd server && npm run build
cd ../client && npm run lint && npm run build
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


---

## 1.6 Rendered `.gitignore`

```text
# Dependencies
node_modules/

# Environment and local secrets
.env
.env*.local

# Production builds
dist/
build/

# Operating system
.DS_Store
Thumbs.db

# Editor & AI tool directories
.agents/
.claude/
.windsurf/
agents

# Uploads & temporary storage
uploads/
server/uploads/

# Test output & reports
e2e/test-results/
e2e/playwright-report/

# Working notes
issue-spec.md
```

---

# Answer Part 2: Spec DD (Specification-Driven Development)

## 2.1 Specification Document Reference & Working URL
The canonical specification document is located at:
- **Repository Path**: `docs/lab-04/specification.md`
- **Working URL**: [https://github.com/YummieGG/toktickit/blob/main/docs/lab-04/specification.md](https://github.com/YummieGG/toktickit/blob/main/docs/lab-04/specification.md)

## 2.2 Proof of Spec Preceding Implementation
The Git commit history conclusively demonstrates that the engineering contract was locked and merged prior to implementation:
- **Contract PR**: PR #65 (`lab4-1-engineering-contract`) merged at `40025a2` on 2026-10-10.
- **First Implementation PR**: PR #66 (`lab4-2-actions-foundation`) opened and merged at `c2c8efc` on 2026-10-14.
- All functional requirements, state machine matrices, and 21 design decisions were finalized in READY-04 review before any product code was authored.

## 2.3 Rendered `docs/lab-04/specification.md`

# Lab 4 Sprint Engineering Specification

**Status:** Engineering contract for implementation (Issue #56 / Lab 4-1)
**Baseline:** Lab 3 role-aware IT support workflow
**Source of truth:** This document, [`api-spec.md`](./api-spec.md), [`ui-spec.md`](./ui-spec.md), and [`tests.md`](./tests.md)

### Issue #56 implementation boundary

Issue #56 delivers the Lab 4 engineering contract and traceability package before feature implementation. It audits the final Lab 3 baseline, defines the new Action Taken and dashboard contracts, records authorization and concurrency guards, maps every acceptance criterion to planned tests and evidence, and prepares review/AI/visual records. Issue #56 does not implement Actions Taken, schema migrations, dashboard routes, UI screens, tests, seed changes, GitHub PRs, or release workflow. Those changes belong to subsequent Lab 4 issues after this contract has been reviewed and merged into `lab4-staging`.

## 1. Sprint Goal

Extend TokTickIT from a Lab 3 ticket workflow into a complete support lifecycle. A Ticket may contain multiple Actions Taken, each with its own assignee, state, result, follow-up state, and audit events. IT Staff and Administrators receive operational dashboards; Requesters receive an ownership-scoped dashboard. Formal Ticket status changes remain backend-controlled, and resolution requires evidence from persisted child actions.

The sprint preserves Lab 3 authentication/session behavior, ownership, attachments, Public Comments, Internal Notes, Staff Queue/Detail, Administrator User Management, error conventions, Zen Green UI, responsive behavior, and accessibility unless a delta is explicit in this contract.

## 2. Stakeholder Request

The stakeholder asks us to record multiple IT activities under one Ticket with auditable traceability. The person coordinating a Ticket is not necessarily the person performing every action. Staff need to assign, start, complete, cancel, and follow up actions; Requesters need read-only visibility of all shared actions; Administrators need the same action operations and operational dashboard access without receiving general Ticket mutation rights.

### Roles

| Role | Purpose | Ticket access | Action and dashboard access |
|---|---|---|---|
| Requester | Create and follow up on personal tickets | Own tickets, attachments, public comments, and advisory indication | Read all actions on owned tickets; own requester dashboard; no action writes |
| IT Staff | Operate queue, perform ticket workflow, and resolve tickets | Queue and detail for all tickets; owner, IT Priority, formal status, comments, notes | Create, edit, assign, start, complete, cancel actions; staff dashboard and action drill-down |
| Administrator | Maintain accounts and audit support lifecycle | Read-only queue/detail, attachment metadata, comments, notes; user management | Create, edit, assign, start, complete, cancel actions; staff dashboard and action drill-down |

Administrator is not implicitly granted general IT Staff ticket mutation rights. The authorization matrix in Appendix A is the binding rule for every screen and endpoint.

## 3. Scope

### Included

- Data model for `ActionTaken` and append-only `ActionTakenEvent`; non-destructive migration; idempotent seed.
- Actions Taken list, create, edit, assignment, and status lifecycle operations with parent/action version checks.
- Ticket resolution gate requiring completed action evidence; atomic cancellation of active child actions.
- Requester dashboard with session-owned metrics, Bangkok 7-day date window, and drill-down links.
- IT Staff and Administrator dashboard with operational metrics, zero-count groups, current-user assigned actions, and drill-down links.
- Dedicated current-user Actions Taken drill-down page with query filter state.
- Concurrency and idempotency handling using Prisma Serializable transactions, explicit versions, and persisted `Idempotency-Key`.
- Unit, API, PostgreSQL integration, component UI, E2E fixture, live E2E, responsive/accessibility, and performance verification.

### Explicit Lab 3 deltas

- **D-04-01:** Administrator may write Actions Taken and view the Staff dashboard, but remains read-only for Ticket owner, IT Priority, formal status, Public Comments, Internal Notes, and attachment downloads.
- **D-04-02:** Mutating Ticket operations (owner, IT Priority, status) and Action writes require explicit expected version fields in Serializable transactions.
- **D-04-03:** Resolution requires at least one completed action with result and no active/unresolved follow-up; Ticket cancellation atomically cancels active child actions.
- **D-04-04:** Ineligible action assignees are cleaned up to null transactionally on Administrator account deactivation or role change.
- **D-04-05:** Default home route redirects to role dashboard (`/dashboard` for Requester, `/staff/dashboard` for Staff/Admin).
- **D-04-06:** Seed preserves existing account credentials, workflow state, and timestamps, creating only deterministic Lab 4 demo bundles.

### Out of scope

SLA clocks, automated escalations, email/SMS notifications, inventory/asset management, purchasing, timesheets, electronic signatures, multi-tenancy, MFA/SSO, action-specific file uploads, hard deletes of actions or events, and a generic audit platform.

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-04-01 | The Lab 4 contract is the reviewed source of truth for new behavior and explicit Lab 3 deltas. |
| FR-04-02 | A Ticket may have zero or many Actions Taken; each action has exactly one immutable parent Ticket. |
| FR-04-03 | Staff and Administrators can list and create Actions Taken on accessible active Tickets; Requesters can read all actions on owned Tickets only. |
| FR-04-04 | An action records server-defined creation time, authenticated creator/performed-by, description, result, assignee, status, follow-up, attachment notes, and version. |
| FR-04-05 | Staff and Administrators can edit shared action fields, assign/reassign eligible users, and execute the approved action status lifecycle. |
| FR-04-06 | Action input is validated at the API boundary, including conditional follow-up note, completion result, cancel reason, assignee eligibility, unknown fields, and parent/action relation. |
| FR-04-07 | Action current state is editable where permitted, while ActionTakenEvent and existing comments/notes remain append-only evidence. |
| FR-04-08 | Ticket formal status changes follow the eight-state matrix and remain IT Staff-only; resolution is blocked unless the action gate passes. |
| FR-04-09 | Ticket cancellation, reopening, legacy Tickets, terminal parents, and requester advisory indication follow the explicit child-action behavior in this contract. |
| FR-04-10 | Action and Ticket writes use one transaction/concurrency protocol with explicit expected versions and safe conflict responses. |
| FR-04-11 | Action creation requires a persisted idempotency key and fingerprint so a retry cannot create duplicate action/event/version activity. |
| FR-04-12 | Requester dashboard metrics and lists are computed from session-owned data using the specified Bangkok date window and bounded response. |
| FR-04-13 | Staff/Administrator dashboard metrics and current-user action lists are computed from authoritative accessible data and include zero groups. |
| FR-04-14 | Dashboard cards and lists drill down to queries with the same predicates, timezone window, status/priority sets, and stable ordering. |
| FR-04-15 | Additive migration, recovery rehearsal, and idempotent seed preserve Lab 3 data and account state; legacy Tickets are not backfilled with invented actions. |
| FR-04-16 | Dashboard and Action UI uses role navigation, Zen Green components, safe feedback, keyboard operation, responsive layouts, and non-color cues. |
| FR-04-17 | Lab 3 inherited behavior and all approved deltas have regression, authorization, concurrency, migration, and UI evidence. |
| FR-04-18 | Documentation records traceability from Issue → FR/BR/AC → Test ID/path → evidence/commit/PR without unsupported Pass or approval claims. |

## 5. Business Rules

### Actions Taken rules

- **BR-01:** An Action Taken belongs to exactly one Ticket and cannot be moved to another parent.
- **BR-02:** Ticket owner coordinates the Ticket; action creator/performed-by and action assignee may be different active Staff/Admin users.
- **BR-03:** Requester reads every action on an owned Ticket but cannot write; Staff/Admin action writes require an accessible, active parent Ticket and lifecycle guards.
- **BR-04:** Performed-by, audit actor, and system timestamps come from the authenticated backend session context; client spoofing is rejected or ignored.
- **BR-05:** Description is required (1–2,000 characters); result is required for Completed; all action text is trimmed, LF-normalized plain text.
- **BR-06:** `followUpRequired=true` requires a non-empty `followUpNote`; setting the flag false does not erase historical note text.
- **BR-07:** An action assignee must be an active IT Staff or Administrator; Requester, inactive, missing, and invalid users return `ASSIGNEE_INELIGIBLE`.
- **BR-08:** Action status transitions are `PENDING` → `IN_PROGRESS`/`COMPLETED`/`CANCELLED` and `IN_PROGRESS` → `COMPLETED`/`CANCELLED`; terminal states have no next transition.
- **BR-09:** Pending and In Progress actions allow approved shared-field edits and reassignment; Completed allows approved field revision while retaining result validity; Cancelled is read-only.
- **BR-10:** Action list ordering is `createdAt asc, id asc` and edits never change `createdAt` or displayed order. Events use `createdAt asc, id asc`.
- **BR-11:** Attachment Notes are shared plain-text references to existing Ticket attachments; the Action form does not upload files or expand attachment permissions.

### Ticket workflow and resolution rules

- **BR-12:** Ticket uses exactly the eight Lab 3 statuses and formal transitions; Problem Appears Resolved remains advisory and never changes formal status.
- **BR-13:** Formal transitions are exactly:

| Current status | Permitted next statuses (IT Staff only) |
|---|---|
| New | Open, Cancelled |
| Open | In Progress, Waiting for Requester, Cancelled |
| In Progress | Waiting for Requester, Resolved, Cancelled |
| Waiting for Requester | In Progress, Cancelled |
| Resolved | Closed, Reopened |
| Closed | Reopened |
| Reopened | In Progress, Cancelled |
| Cancelled | Reopened |

Only IT Staff performs formal transitions. Administrator and Requester formal writes return `403`. Cancelled, Resolved, Closed, and Reopened require explicit confirmation.

- **BR-14:** Transition to `RESOLVED` requires at least one `COMPLETED` action with a non-empty result, no `PENDING` or `IN_PROGRESS` actions, and no non-cancelled action with `followUpRequired=true`. No-action and all-cancelled Tickets return `400 TICKET_RESOLUTION_BLOCKED`. Legacy Resolved/Closed records remain readable without invented actions or guessed timestamps.
- **BR-15:** Resolved, Closed, and Cancelled parents are read-only for user-facing action mutation. Reopen preserves action and event history and clears `resolvedAt` and `problemAppearsResolvedAt`.
- **BR-16:** Cancelling a Ticket atomically cancels active child actions with cancelReason “Ticket cancelled by IT Staff” and appends CANCELLED events; Completed/Cancelled children remain unchanged.

### Concurrency, idempotency, and dashboard rules

- **BR-17:** Mutating Ticket and Action operations check expected versions in a Serializable transaction; stale writes or transaction conflicts return `409 CONFLICT` with rollback. Any successful Action mutation (create, edit, assign, status change) increments parent Ticket `version` and refreshes parent Ticket `updatedAt` atomically.
- **BR-18:** Action creation requires `Idempotency-Key` matching persisted creator, Ticket, and normalized payload fingerprint; same key/payload replays original action with `200`, different payload returns `409 IDEMPOTENCY_CONFLICT`.
- **BR-19:** Dashboard “My” means authenticated current user; Requester ownership is session-derived; Staff scope follows approved accessible data.
- **BR-20:** All API responses use safe error codes and never reveal hidden Tickets, secrets, Internal Notes, stack traces, creation keys, or fingerprints.

## 6. UI Specification Summary

The UI preserves the Zen Green reusable component language and AppShell while introducing role dashboards, an Actions Taken section on Ticket Detail, and dedicated drill-down flows. Requesters land on `/dashboard` with owned metrics; Staff and Administrators land on `/staff/dashboard` with operational metrics. Staff/Admin Ticket Detail features an interactive Actions Taken section (list, create, edit, assign, start, complete, cancel); Requester Ticket Detail includes a read-only projection of all actions.

Screen state transitions handle loading skeletons, empty data, validation errors, forbidden states, not-found safe responses, and conflict reconciliation without silent draft loss. All layouts are verified at 1280 px, 768 px, and 375 px with keyboard and accessibility support as detailed in [`ui-spec.md`](./ui-spec.md).

## 7. Data Changes

- Add `ActionTaken` model with immutable parent `ticketId`, server `createdAt`, `updatedAt`, `performedById` creator, `assigneeId`, `status` enum (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `description`, `result`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `cancelReason`, `version`, `creationKey`, `creationFingerprint`, and `seedKey` (deterministic seed identifier for idempotent setup).
- Add `ActionTakenEvent` append-only audit model (`actionId`, `actorId`, `type`, `createdAt`, `before` JSON, `after` JSON) with event types `CREATED`, `EDITED`, `ASSIGNED`, `UNASSIGNED`, `STARTED`, `COMPLETED`, and `CANCELLED`.
- Extend `Ticket` with `version` (default/backfill 1) and nullable `resolvedAt`.
- Add composite lookup indexes: `(ticketId, createdAt, id)`, `(assigneeId, status)`, unique `(ticketId, performedById, creationKey)`, and `(actionId, createdAt, id)`.
- Data-design decisions: (1) Editable current state plus append-only events allows correction of shared text while preserving complete auditability; (2) Explicit versions in Serializable transactions prevent race conditions between resolution and action mutation; (3) Nullable `resolvedAt` avoids backfilling synthetic timestamps for legacy data.

Seed data is idempotent and creates deterministic Lab 4 fixture bundles with 0, 1, and multiple actions, varied assignees, follow-ups, and statuses, without overwriting existing user credentials, account roles, or ticket timestamps.

Migration is additive and non-destructive: existing users, sessions, tickets, attachments, comments, and internal notes are fully preserved. A backup and restore rehearsal verifies data integrity before migration is applied.

## 8. API Contract

The exact REST paths, payloads, status codes, error codes, authorization rules, and concurrency requirements are defined in [`api-spec.md`](./api-spec.md). New endpoints include action collection/mutation under `/api/tickets/:ticketId/actions-taken`, role dashboards at `/api/dashboards/requester` and `/api/dashboards/staff`, current-user action drill-down at `/api/staff/actions-taken`, and resolution extensions to `/api/tickets/:id/status`.

Appendix A provides the cross-document authorization matrix; [`api-spec.md`](./api-spec.md) is the canonical wire-level reference. Every acceptance criterion is mapped to planned automated tests in [`tests.md`](./tests.md).

## 9. Acceptance Criteria

- **AC-01:** The four core contract documents are complete, mutually consistent, and leave no key decision unresolved.
- **AC-02:** Every acceptance criterion has a planned test and every write API has backend authorization and concurrency rules.
- **AC-03:** READY-04 gate is met with no unresolved decision, and contract is reviewed and merged before Issue 2 implementation.
- **AC-04:** Staff/Admin can create, edit, assign, start, complete, and cancel actions with stable ordering, actor separation, and append-only events.
- **AC-05:** Requester reads every action on owned tickets but is safely denied action writes and cross-owner access.
- **AC-06:** Ticket resolution is blocked without valid completed actions; transitions, atomic child cancellation, reopen, and legacy behavior follow the matrix atomically.
- **AC-07:** Requester dashboard displays session-owned metrics in the Bangkok 7-day window and drill-downs maintain predicate parity.
- **AC-08:** Staff/Admin dashboard metrics, zero groups, current-user actions, and drill-down queries match authoritative backend calculations.
- **AC-09:** Additive migration preserves Lab 1–3 data; seed repeat does not duplicate rows or overwrite account/workflow state.
- **AC-10:** Regression suites pass for all inherited Lab 1–3 authentication, requester, staff, administrator, and isolation behaviors.
- **AC-11:** Concurrent writes, stale versions, duplicate clicks, and lost responses handle conflicts and idempotency safely without data loss or duplicate events.
- **AC-12:** Major screens adhere to Zen Green styling, keyboard navigation, and responsive layouts at 1280 px, 768 px, and 375 px without clipping or overflow.
- **AC-13:** Local isolated dataset performance smoke meets body size <= 64 KiB and warm p95 response <= 1,000 ms.

## 10. Definition of Done

The four contract documents agree; every write operation enforces role, parent, version, and transaction guards; every AC is mapped to planned tests; implementation issues reference this contract; all regression and new tests report real results without skips or placeholders; visual evidence is verified at three viewports; and the student reviews and approves AI-assisted deliverables before merge.

## 11. Assumptions and Decisions

- **BASELINE-04:** Baseline is final main at `a295882`; keep existing working states separate; develop on feature branches targeting `lab4-staging`.
- **AUTHZ-04:** Administrator receives Action Taken write and Staff dashboard read permissions only; Ticket owner, IT Priority, formal status, comments, notes, and attachment downloads remain restricted.
- **DATA-04:** Add `ActionTaken`, `ActionTakenEvent`, `Ticket.version`, and `Ticket.resolvedAt`; use composite indexes and unique idempotency constraints.
- **DATE-01:** Persist UTC instants; render Asia/Bangkok; dashboard 7-day window uses Bangkok calendar days inclusive.
- **VALIDATION-01:** Trim and normalize text; validate field lengths up to 2,000 characters; reject unknown fields and malformed versions.
- **ACTION-01:** Four action statuses (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`); terminal states cannot transition.
- **PARENT-04:** Active parent statuses permit action mutation; terminal parents (`RESOLVED`, `CLOSED`, `CANCELLED`) are read-only.
- **ACTOR-01:** `performedById` is authenticated creator; mutator is event actor; assignee is independent active Staff/Admin.
- **ELIGIBILITY-04:** Deactivated or role-changed assignees are cleared to null on active actions transactionally with UNASSIGNED event.
- **AUDIT-01:** Current action state is editable; `ActionTakenEvent` is append-only with before/after snapshots.
- **RESOLUTION-04:** Resolution gate requires completed action with result, no active actions, and no unresolved follow-up; legacy records remain readable.
- **CONCURRENCY-01:** Serializable transactions contain read/guard/write/event; stale versions return `409 CONFLICT`.
- **IDEMPOTENCY-01:** `POST` create requires `Idempotency-Key` and payload fingerprint; exact replay returns `200` without duplicate activity.
- **DASHBOARD-01:** Backend calculates all metrics in a Repeatable Read transaction; active-work set is `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`.
- **DRILLDOWN-04:** Drill-down queries reuse captured dashboard window and status/priority sets with stable sort order.
- **API-04:** Responses use `{ data }` envelope, pagination metadata, safe error codes, and field-level validation messages.
- **UI-04:** Reusable Zen Green components; preserve drafts on recoverable errors; route guards complement backend enforcement.
- **MIGRATION-04:** Non-destructive additive migration; rehearse backup/restore on isolated database.
- **SEED-04:** Deterministic fixture bundles; preserve edited account state, credentials, and timestamps.
- **TEST-04:** Unit, API, PostgreSQL integration, UI component, fixture E2E, live E2E, regression, and performance smoke suites.
- **READY-04:** Issue #56 contract must be reviewed and merged into `lab4-staging` before Issue #57 implementation begins.

## Appendix A. Authorization Matrix

| Resource/operation | Requester | IT Staff | Administrator | Unauthenticated |
|---|---:|---:|---:|---:|
| Public health/root, login | Read | Read | Read | Read |
| Logout, current user, change password | Own session | Own session | Own session | 401 |
| Categories/related systems | Read | Read | Read | 401 for app use |
| Requester dashboard (`/api/dashboards/requester`) | Own session | 403 | 403 | 401 |
| Staff dashboard (`/api/dashboards/staff`) | 403 | All/read | All/read | 401 |
| Staff actions drill-down (`/api/staff/actions-taken`) | 403 | Current user | Current user | 401 |
| Create ticket | Own/write | 403 | 403 | 401 |
| List own tickets | Own/read | 403 | 403 | 401 |
| Ticket detail | Own/read | All/read | All/read | 401 |
| Read Actions Taken | Own ticket | All tickets | All tickets | 401 |
| Create/edit/assign/status Action Taken | 403 | All/write | All/write | 401 |
| Ticket owner, IT Priority, formal status | 403 | Allowed by workflow | 403 | 401 |
| Submit Problem Appears Resolved | Own/write | 403 | 403 | 401 |
| Read Problem Appears Resolved | Own/read | All/read | All/read | 401 |
| Attachment metadata | Own/read | All/read | All/read | 401 |
| Attachment upload | Own/write | 403 | 403 | 401 |
| Attachment download | Own/read file | All/read file | 403 | 401 |
| Attachment soft-remove | Own/write | 403 | 403 | 401 |
| Staff queue (`/api/staff/tickets`) | 403 | All/read | All/read | 401 |
| Read Public Comments | Own ticket | All tickets | All tickets | 401 |
| Create Public Comment | Own ticket | All tickets | 403 | 401 |
| Read Internal Notes | 403 | All tickets | All tickets | 401 |
| Create Internal Note | 403 | All tickets | 403 | 401 |
| Administrator User Management | 403 | 403 | Full scoped operations | 401 |

For protected resources owned by another Requester, the API returns safe `404`. Wrong roles receive `403`; unauthenticated requests receive `401`.

## Appendix B. Lab 3 Baseline Audit

| Area | Evidence in Lab 3/main | Lab 4 consequence and risk |
|---|---|---|
| Data model | `User`, `UserSession`, `LoginAttempt`, `Ticket`, `Attachment`, `PublicComment`, `InternalNote`, `Category`, `RelatedSystem` present; no `ActionTaken`, `version`, or `resolvedAt`. | Add `ActionTaken` and `ActionTakenEvent` via additive migration; backfill `Ticket.version=1`; keep legacy `resolvedAt=null`. |
| Server API | Lab 3 routes enforce authentication, role guards, Origin check, and status concurrency. Endpoints `/actions-taken` and `/dashboards` do not exist. | Introduce action endpoints with expected version checks and Idempotency-Key; extend Ticket status mutation with resolution gate. |
| Client UI | AppShell, Login, ChangePassword, MyTickets, CreateTicket, StaffTicketQueue, StaffTicketDetail, UserManagement present. | Add Requester Dashboard, Staff Dashboard, Actions Taken section, and Actions Taken drill-down; update home redirection. |
| Tests and evidence | Lab 1–3 suites passing; integration discovery configured for Lab 3 only. | Preserve existing Lab 1–3 tests as regression; expand discovery configs to include Lab 4 suites. |
| Known limitations | Administrator is strictly read-only on all Ticket operations; resolution requires no action evidence; no dashboards. | Lab 4 grants Administrator action writes only; adds resolution gate and role dashboards without regressing Lab 3 guards. |

## Appendix C. Issue #56 Review Notes

An engineering contract consistency review verified that role matrix permissions, Action status transitions, 8-state Ticket lifecycle, resolution gate predicate, concurrency protocols, date boundary calculations, error codes, and planned test paths are aligned across all four core documents. No contradictory rule or unaddressed requirement remains.

## Appendix D. Traceability by GitHub Issue

| Issue | Branch | Responsibility |
|---|---|---|
| Lab 4-1 (#56) | `lab4-1-engineering-contract` | Engineering contract, UI/API specs, test plan, and traceability package |
| Lab 4-2 (#57) | `lab4-2-actions-foundation` | Action data model, migration, seed, API foundation, concurrency, and audit |
| Lab 4-3 (#58) | `lab4-3-actions-ui` | Actions Taken UI section, role permissions, view/edit modes, and draft recovery |
| Lab 4-4 (#59) | `lab4-4-resolution-workflow` | Resolution gate enforcement, child action cancellation, reopen, and workflow UI |
| Lab 4-5 (#60) | `lab4-5-dashboards` | Requester and Staff dashboards, metrics, drill-down queries, and navigation |
| Lab 4-6 (#61) | `lab4-6-verification-qa` | Cross-cutting tests, Lab 1–3 regression, visual/accessibility evidence |
| Lab 4-7 (#62) | `lab4-7-staging-integration` | Staged integration into `lab4-staging`, clean setup and build verification |
| Lab 4-8 (#63) | `lab4-8-documentation` | Final documentation, reviewer logs, AI log, and submission packaging |
| Lab 4-9 (#64) | `lab4-9-release-verification` | Release verification against final main, evidence check, and tag |

## Appendix E. AI Coding-Agent Rules

Read all four Lab 4 contract documents before editing code. Work only within the assigned issue and branch, maintain spec and test traceability, report changed files/commands/AC evidence, and never report completion while required tests are missing, skipped, focused-only, or unverified. The student inspects all migrations, security boundaries, and final diffs before approval.


---

# Answer Part 3: Test DD and Traceability

## 3.1 Test Plan Document Reference & Working URL
The canonical test plan and traceability matrix is located at:
- **Repository Path**: `docs/lab-04/tests.md`
- **Working URL**: [https://github.com/YummieGG/toktickit/blob/main/docs/lab-04/tests.md](https://github.com/YummieGG/toktickit/blob/main/docs/lab-04/tests.md)

## 3.2 Rendered `docs/lab-04/tests.md`

# Lab 4 Test Plan and Traceability

## Issue #56 focused verification boundary

This file establishes the test plan, traceability matrix, and verification record for Lab 4. All acceptance criteria (AC-01 through AC-13) and functional requirements are verified against executable test suites, real database transactions, and browser visual regression checks.

## 1. Test strategy

- **Server unit:** Vitest for Action input validation, text normalization, assignee eligibility, Action/Ticket transition matrices, resolution gate predicates, Bangkok date window boundaries, and dashboard calculation formulas.
- **Server API:** Supertest against mock and test database boundaries covering role authorization, parent/action relations, Idempotency-Key replay, expected version checks, safe error codes, and dashboard outputs.
- **PostgreSQL integration:** Supertest with isolated PostgreSQL databases verifying real Prisma migrations, seed idempotency, Serializable concurrency conflicts, account cleanup triggers, and competing resolution/action mutations.
- **Client UI:** Vitest + React Testing Library for role navigation, Actions Taken interactive modes (create, view, edit, assign, status), dashboard card/list rendering, query parameter state, and safe error feedback.
- **UI style/visual:** `visual-style.test.tsx` and Playwright `visual-qa.spec.ts` verifying Zen Green tokens, contrast, text wrapping, focus indicators, and touch targets across 1280 px, 768 px, and 375 px viewports.
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
- `e2e/lab-04/visual-qa.spec.ts`
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

This matrix maps every acceptance criterion and functional requirement to an automated test file. `Verified` indicates the test scenario and assertions ran successfully in the repository.

| Test ID | Type | Requirement / FR-BR-AC | What it tests | Expected result | Automated test file | Final |
|---|---|---|---|---|---|:---:|
| CONTRACT-01 | Contract | FR-04-01, AC-01, AC-03 | Mutual consistency of all 4 contract documents and decisions | No contradiction; all 21 decisions resolved; READY-04 gate complete | `docs/lab-04/*.md review checklist` | Verified |
| CONTRACT-02 | Contract | AC-02, CONCURRENCY-01 | Enumerate all write endpoints against backend authorization, guard order, and concurrency rules | All write endpoints enforce session, role, parent access, expected versions, and serializable transactions | `docs/lab-04/api-spec.md`, `tests.md` | Verified |
| UNIT-01 | Unit | FR-04-06, BR-05, BR-06, BR-07, AC-04 | Description/result/follow-up validation, text normalization, assignee eligibility | Valid inputs normalize; missing note or invalid assignee returns field error | `server/tests/lab-04/business-rules.unit.test.ts` | Verified |
| UNIT-02 | Unit | FR-04-08, BR-08, BR-13, BR-14, AC-06 | Action lifecycle transitions and Ticket resolution predicate | Transitions match matrices; gate blocks resolve without completed action | `server/tests/lab-04/business-rules.unit.test.ts` | Verified |
| UNIT-03 | Unit | FR-04-12, FR-04-13, DATE-01, AC-07, AC-08 | Bangkok 7-day calendar window calculation and metrics grouping | Window boundaries inclusive; zero count groups preserved correctly | `server/tests/lab-04/business-rules.unit.test.ts` | Verified |
| API-01 | API | FR-04-03, FR-04-04, BR-03, BR-04, AC-04, AC-05 | Action list and create with server actor, timestamps, and versions | Action created with server actor/time; Requester denied create; 201/200 replay | `server/tests/lab-04/actions-taken.api.test.ts` | Verified |
| API-02 | API | FR-04-05, BR-08, BR-09, BR-10, AC-04 | Action edit, reassignment, and status changes with versions | Allowed transitions succeed; terminal states restricted; stable list order | `server/tests/lab-04/actions-taken.api.test.ts` | Verified |
| API-03 | API | AUTHZ-04, BR-03, BR-20, AC-05, AC-10 | Requester cross-owner access, Admin ticket mutation restrictions | Safe 404 for unowned ticket; Admin denied ticket mutations; note isolation | `server/tests/lab-04/actions-taken.api.test.ts` | Verified |
| API-04 | API | FR-04-08, FR-04-09, BR-13, BR-14, BR-16, AC-06 | 8-state ticket transitions, resolution gate, and atomic child cancel | Gate blocks invalid resolve; cancel atomically cancels active children | `server/tests/lab-04/ticket-workflow.api.test.ts` | Verified |
| API-05 | API | FR-04-12, FR-04-14, DASHBOARD-01, AC-07 | Requester dashboard metrics and drill-down parity | Session-owned metrics only; Bangkok window; drill-down filter parity | `server/tests/lab-04/requester-dashboard.api.test.ts` | Verified |
| API-06 | API | FR-04-13, FR-04-14, AC-08 | Staff dashboard metrics, zero groups, and current-user actions | Authoritative counts; zero groups included; my actions scoped to user | `server/tests/lab-04/staff-dashboard.api.test.ts` | Verified |
| PG-01 | PG Integration | CONCURRENCY-01, IDEMPOTENCY-01, ELIGIBILITY-04, AC-11 | Competing resolve vs action writes, stale versions, same-key race | Serializable conflict rolls back; one action created; deactivation unassigns | `server/tests/lab-04/action-concurrency.integration.test.ts` | Verified |
| PG-02 | PG Integration | MIGRATION-04, SEED-04, AC-09 | Non-destructive migration on Lab 3 snapshot and repeatable seed | Lab 1–3 data, ownership, and credentials preserved; no duplicate seed rows | `server/tests/lab-04/migration-seed.integration.test.ts` | Verified |
| PERF-01 | Performance | TEST-04, AC-13 | Benchmark 1,000 Tickets / 5,000 actions dataset | Response body <= 64 KiB; warm p95 response <= 1,000 ms | `server/tests/lab-04/dashboard-performance.integration.test.ts` | Verified |
| UI-01 | UI | FR-04-03, FR-04-04, UI-04, AC-04, AC-05 | Actions Taken UI section: create, view, edit, assignment, status | Role controls match matrix; form validation; draft preserved on conflict | `client/tests/lab-04/ActionsTaken.test.tsx` | Verified |
| UI-02 | UI | FR-04-08, BR-13, AC-06 | Ticket workflow UI and resolution feedback | Allowed transitions shown; confirmation modals; blocked resolve feedback | `client/tests/lab-04/TicketWorkflow.test.tsx` | Verified |
| UI-03 | UI | FR-04-12, FR-04-13, AC-07, AC-08 | Requester and Staff dashboard rendering and card drill-down links | Metric values displayed; zero states handled; links pass filter query params | `client/tests/lab-04/RequesterDashboard.test.tsx`, `StaffDashboard.test.tsx` | Verified |
| UI-04 | UI | FR-04-14, UI-04, AC-04, AC-08 | Actions Taken drill-down page with URL query state | Query params update list; pagination works; row opens ticket detail | `client/tests/lab-04/DashboardDrilldown.test.tsx` | Verified |
| UI-05 | UI Style | FR-04-16, AC-12 | Zen Green tokens, contrast, text wrapping, and responsive viewports | 1280, 768, 375 px pass without clipping, overlap, or page overflow | `client/tests/lab-04/visual-style.test.tsx`, `e2e/lab-04/visual-qa.spec.ts` | Verified |
| E2E-01 | E2E | AC-04, AC-05, AC-11 | Actions Taken lifecycle flow: create, edit, assign, status | Multiple actions created by different staff; requester sees read-only | `e2e/lab-04/actions-taken-flow.spec.ts` | Verified |
| E2E-02 | E2E | AC-06 | Full ticket resolution lifecycle from advisory to close and reopen | Advisory indication → action completed → resolve succeeded → closed/reopen | `e2e/lab-04/ticket-resolution.spec.ts` | Verified |
| E2E-03 | E2E | AC-07, AC-08, AC-10 | Requester and Staff dashboard browser flows and navigation | Card drill-down to queue/detail; home redirect; regression flows verified | `e2e/lab-04/dashboards.spec.ts` | Verified |
| LIVE-01 | Live E2E | AUTHZ-04, AC-04, AC-06, AC-11 | Browser to real API to PostgreSQL action and workflow flow | Real DB transactions enforce resolution gate, version check, and idempotency | `e2e/lab-04/actions-taken-flow.live.spec.ts`, `ticket-resolution.live.spec.ts` | Verified |
| LIVE-02 | Live E2E | AC-07, AC-08, AC-10 | Browser to real API to PostgreSQL dashboard flow | Real backend counts match dashboard cards; drill-down filters match rows | `e2e/lab-04/dashboards.live.spec.ts` | Verified |
| REG-01 | Regression | FR-04-17, AC-10 | Full regression of Lab 1–3 auth, tickets, queue, comments, notes | Existing test suites continue to pass green without regression | Existing server, client, and e2e test paths | Verified |

### 3.2 Acceptance-criterion traceability breakdown

| ID | Acceptance criterion | Planned evidence | Implementation issue(s) | PDF Section |
|---|---|---|---|---|
| AC-01 | Four core contract documents are complete, mutually consistent, and explicit. | `docs/lab-04/*.md`, READY-04 gate review | [#56](https://github.com/YummieGG/toktickit/issues/56) | Part 2, Part 9 |
| AC-02 | Every write API enforces session, role, Origin, versions, and Serializable transactions. | `docs/lab-04/api-spec.md`, `tests.md` §4, CONTRACT-02 | [#56](https://github.com/YummieGG/toktickit/issues/56) | Part 2, Part 6 |
| AC-03 | No unresolved business/API decisions prior to implementation; contract reviewed and merged. | `docs/lab-04/specification.md` Appendix C, PR #65 | [#56](https://github.com/YummieGG/toktickit/issues/56) | Part 1, Part 9 |
| AC-04 | Actions Taken model, lifecycle (PENDING, IN_PROGRESS, COMPLETED, CANCELLED), validation, and events. | `business-rules.unit.test.ts`, `actions-taken.api.test.ts`, `ActionsTaken.test.tsx`, `actions-taken-flow.spec.ts` | [#57](https://github.com/YummieGG/toktickit/issues/57), [#58](https://github.com/YummieGG/toktickit/issues/58) | Part 3, Part 4, Part 7 |
| AC-05 | Actions Taken permissions: Staff/Admin create/edit/status; Requester read-only on owned tickets; safe 404 for unowned. | `actions-taken.api.test.ts`, `ActionsTaken.test.tsx`, `actions-taken-flow.spec.ts` | [#57](https://github.com/YummieGG/toktickit/issues/57), [#58](https://github.com/YummieGG/toktickit/issues/58) | Part 4, Part 7 |
| AC-06 | Resolution gate: Ticket RESOLVED requires at least 1 COMPLETED action with result; no pending/in-progress/unresolved follow-up; parent cancel atomically cancels active children. | `business-rules.unit.test.ts`, `ticket-workflow.api.test.ts`, `TicketWorkflow.test.tsx`, `ticket-resolution.spec.ts` | [#59](https://github.com/YummieGG/toktickit/issues/59) | Part 3, Part 4, Part 7 |
| AC-07 | Requester dashboard: 4 metrics, 7-day Bangkok date window, zero counts, owned recent/attention/resolved lists, bounded responses <= 64 KiB. | `business-rules.unit.test.ts`, `requester-dashboard.api.test.ts`, `RequesterDashboard.test.tsx`, `dashboards.spec.ts` | [#60](https://github.com/YummieGG/toktickit/issues/60) | Part 4, Part 5, Part 7 |
| AC-08 | Staff dashboard: 7 metrics, zero-count groups, urgent tickets, assigned actions list, and query-param drill-down parity. | `staff-dashboard.api.test.ts`, `StaffDashboard.test.tsx`, `DashboardDrilldown.test.tsx`, `dashboards.spec.ts` | [#60](https://github.com/YummieGG/toktickit/issues/60) | Part 4, Part 5, Part 7 |
| AC-09 | Non-destructive migration and idempotent seed preserving Labs 1–3 data, ownership, and credentials. | `migration-seed.integration.test.ts` | [#57](https://github.com/YummieGG/toktickit/issues/57) | Part 3 |
| AC-10 | Full regression suite: Labs 1–3 authentication, queue, details, comments, notes, and user administration continue to pass green. | REG-01, existing server/client/E2E regression suites | [#61](https://github.com/YummieGG/toktickit/issues/61) | Part 6, Part 7 |
| AC-11 | Real PostgreSQL integration and live E2E verifying Serializable conflict rollback, idempotency replay, and account deactivation unassignment. | `action-concurrency.integration.test.ts`, `actions-taken-flow.live.spec.ts`, `ticket-resolution.live.spec.ts` | [#57](https://github.com/YummieGG/toktickit/issues/57), [#61](https://github.com/YummieGG/toktickit/issues/61) | Part 6, Part 7 |
| AC-12 | Zen Green tokens, accessible badges, 44 px touch targets, and responsive 1280/768/375 px layouts with zero horizontal scroll. | `visual-style.test.tsx`, Playwright responsive assertions, visual checklist | [#58](https://github.com/YummieGG/toktickit/issues/58), [#60](https://github.com/YummieGG/toktickit/issues/60), [#61](https://github.com/YummieGG/toktickit/issues/61) | Part 5, Part 8 |
| AC-13 | Performance benchmark: 1,000 tickets / 5,000 actions dataset completes within <= 64 KiB response size and warm p95 <= 1,000 ms. | `dashboard-performance.integration.test.ts` | [#61](https://github.com/YummieGG/toktickit/issues/61) | Part 6 |

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

## 6. Execution commands and verified results

Executed staged integration verification runs on branch `lab4-7-staged-integration` (combining all merged increments PR #65–#70 on `lab4-staging`):

```bash
# Server Build & Unit / API Tests
cd server && npm run build
cd server && npm test -- --fileParallelism=false
# Output: 27 test files passed (430/430 tests passing)

# Client Build, Lint & Unit Tests
cd client && npm run build
cd client && npm run lint
cd client && npm test
# Output: 20 test files passed (159/159 tests passing), 0 lint errors/warnings

# End-to-End Fixture & Visual QA Tests
cd e2e && npm test
# Output: 13 Lab 4 tests passed, 32 total suite tests passing across viewports 1280, 768, 375 px

# Live E2E and Database Integration Suites (run against active PostgreSQL container / live environment)
cd server && npm run test:integration
cd e2e && npm run test:live
```

### Intentional Lab 3 Baseline Deltas (Approved Architectural Changes)

Per `PLAN_Lab04.md` §5.1 & Issue 6 DoD, the following behavioral updates from Lab 3 are intentional, tested, and verified:
1. **Admin Ticket Status Mutation Restrictions (AUTHZ-04, BR-12):**
   - Lab 3 permitted Administrators to mutate ticket status. In Lab 4, formal status transitions are strictly restricted to `IT_STAFF`; Administrators receive `403 FORBIDDEN` (while retaining User Management and Actions Taken authoring permissions).
2. **Optimistic Concurrency & Versioning (CONCURRENCY-01):**
   - Ticket status transitions require `expectedTicketVersion`, and Actions Taken mutations require `expectedTicketVersion` / `expectedActionVersion`. Stale writes return `409 CONFLICT` with client draft preservation rather than silent overwrite.
3. **Role-Based Operational Dashboards & Default Navigation:**
   - Requester root navigation `/` redirects to `/dashboard` (operational dashboard with 7-day Bangkok window metric cards) instead of `/tickets`.
   - IT Staff and Administrator root navigation `/` redirects to `/staff/dashboard` with operational queue breakdown and preview lists.
   - Navbar incorporates role-aware Dashboard and Actions Taken drill-down links.
4. **Resolution Gate Enforcement (BR-13, BR-14):**
   - Transition to `RESOLVED` requires at least one completed Action Taken with recorded result, no active child actions, and no unresolved follow-up; blocked attempts return `400 TICKET_RESOLUTION_BLOCKED`.

Status vocabulary:
- **Planned:** test scenario, path, and assertions defined before coding.
- **Verified:** command executed successfully in required environment with logs retained.
- **Failed:** command failed and requires defect resolution.
- **Not applicable:** excluded with approved written rationale.

## 7. READY-04 handoff checklist

- [x] All four core contract documents (`specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`) are complete and consistent.
- [x] Every AC-01 through AC-13 has a Test ID, scenario, expected result, and planned file path.
- [x] Every write API enforces session, role, parent access, Origin, versions, and Serializable transactions.
- [x] Actions Taken lifecycle, assignment rules, resolution gate, and atomic cancellation are explicit.
- [x] Dashboards formulas, Bangkok 7-day window, zero states, bounds, and drill-down parity are explicit.
- [x] Migration and seed strategy preserve existing data, credentials, and timestamps.
- [x] Contract review and commit trace are recorded before Issue #57 implementation begins.


## 3.3 Test Execution Summary & Verification Metrics

```text
================================================================================
                           LAB 4 TEST SUITE SUMMARY
================================================================================
1. SERVER SUITE (Vitest)
   Test Files : 27 passed (27)
   Tests      : 430 passed (430)
   Duration   : 6.40s
   Status     : ALL GREEN (0 failures, 0 regressions)

2. CLIENT SUITE (Vitest + React Testing Library)
   Test Files : 20 passed (20)
   Tests      : 159 passed (159)
   Duration   : 16.28s
   Status     : ALL GREEN (0 failures, 0 warnings)

3. LINTING & TYPECHECK (Oxlint + TypeScript)
   Server     : tsc -p tsconfig.build.json -> 0 errors
   Client     : tsc -b && vite build -> 0 errors
   Linter     : oxlint -> 0 warnings, 0 errors across 57 files

4. PLAYWRIGHT E2E SUITE
   Total Tests: 32 passed (32)
   Duration   : 46.1s
   Coverage   : Auth, Requester, Staff Queue/Detail, Actions Taken, Workflow,
                Dashboards, Drill-downs, and Responsive Viewports (1280, 768, 375 px)
================================================================================
```

---

# Answer Part 4: AI Use with Reflection

## 4.1 Rendered `docs/lab-04/ai-use.md`

# Lab 4 AI Use Log

**Sprint:** Lab 4 (Issues #56–#63, PRs #65–#71)  
**Author:** Worawut Sereethai ([@YummieGG](https://github.com/YummieGG))  
**Peer Reviewer:** Chanon Lhumsa-ard ([@Snnn3](https://github.com/Snnn3))  

## LLM Used
- **Gemini 3.8 Flash (High)**

## Key Prompts

| # | Prompt Summary | Purpose | Outcome |
|---|---------------|---------|---------|
| 1 | Decompose Sprint 4 requirements into 4 core contract documents | Establish engineering specifications before coding | Created `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` with full traceability |
| 2 | Design Actions Taken schema, non-destructive migration, and idempotent seed | Add database models while preserving existing data | Added `ActionTaken` and audit models with PostgreSQL constraints and repeatable seed |
| 3 | Build Actions Taken REST API with RBAC, actor derive, and idempotency | Implement secure endpoints for action management | Built endpoints with IT Staff/Admin permissions, server actor derive, and UUID idempotency replays |
| 4 | Implement Actions Taken UI with cardinality handling and draft retention | Provide action management inside Ticket Detail | Created `ActionsTakenSection` handling 0/1/many actions, status badges, and 409 conflict recovery |
| 5 | Enforce 8-state ticket workflow, resolution gate, and atomic child cancellation | Restrict status transitions and enforce resolution checks | Implemented state machine, in-DOM confirmation dialogs, and atomic child action cancellation |
| 6 | Implement Requester and Staff operational dashboards with rolling window | Provide role-specific operational metrics and drill-downs | Built 7-day Bangkok rolling window metric cards, preview lists, and drill-down links |
| 7 | Create Playwright visual QA and responsive assertions across 3 viewports | Verify mobile responsiveness and accessibility compliance | Automated 31 screenshot artifacts across 1280px, 768px, and 375px viewports with zero horizontal overflow |
| 8 | Address peer review feedback from @Snnn3 and verify staged integration | Fix implementation defects and verify clean integration | Replaced window.confirm with accessible modal, fixed live E2E selectors, and passed all test suites |

## My Reflection

Using **Gemini 3.8 Flash (High)** helped write code and tests much faster. Having clear specs beforehand made it easy for the AI to follow requirements.

However, peer review with `@Snnn3` and manual testing were still needed to fix issues in UI accessibility and test isolation. AI is great for speed, but the developer must always verify the results.


---

# Answer Part 5: Working IT Staff Dashboard UI

## 5.1 Staff Dashboard Operational Metrics
The IT Staff Dashboard (`/staff/dashboard`) provides operational visibility into tickets and assigned work:
1. **Authoritative Metric Cards**:
   - `Unassigned Tickets`: Number of active tickets with no assigned staff owner.
   - `My Tickets`: Active tickets owned by the current authenticated session user.
   - `My Actions Taken`: Actions assigned to the authenticated user in `PENDING` or `IN_PROGRESS` status.
   - `Status Breakdown`: Authoritative counts across all 8 ticket statuses (preserving zero-count groups).
   - `Priority Breakdown`: Counts across all 4 priorities (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
2. **7-Day Bangkok Rolling Window**:
   - Metric counts and preview lists apply an inclusive 7-day calendar window computed in `Asia/Bangkok` timezone without UTC day rollback.
3. **Database Query Parity**:
   - All dashboard card totals match live PostgreSQL `COUNT` queries verified via `DASHBOARD-01` and `LIVE-02`.
4. **Interactive Drill-Downs**:
   - Clicking any metric card navigates to `/staff/queue` or `/staff/actions-taken` with pre-populated URL search parameters (e.g. `?status=IN_PROGRESS&assignee=me`).

## 5.2 Staff Dashboard Visual Evidence

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/staff-dashboard/1280.png" alt="Staff Dashboard Desktop 1280px" />
  <div class="screenshot-caption">Figure 5.1: Staff Dashboard Desktop (1280px) showing 7 operational metrics, breakdown grids, and preview lists.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/staff-dashboard/768.png" alt="Staff Dashboard Tablet 768px" />
  <div class="screenshot-caption">Figure 5.2: Staff Dashboard Tablet (768px) with responsive grid reflow and touch-accessible cards.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/staff-dashboard/375.png" alt="Staff Dashboard Mobile 375px" />
  <div class="screenshot-caption">Figure 5.3: Staff Dashboard Mobile (375px) featuring single-column stacked layout (scrollWidth <= innerWidth).</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/staff-dashboard/zero-groups.png" alt="Staff Dashboard Zero Groups" />
  <div class="screenshot-caption">Figure 5.4: Staff Dashboard zero-group preservation displaying zero counts across empty priority/status groups.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/staff-dashboard/loading.png" alt="Staff Dashboard Loading" />
  <div class="screenshot-caption">Figure 5.5: Staff Dashboard accessible loading skeleton state.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/staff-dashboard/error.png" alt="Staff Dashboard Error Recovery" />
  <div class="screenshot-caption">Figure 5.6: Staff Dashboard safe failure feedback with retry controls.</div>
</div>

---

# Answer Part 6: Working Actions Taken UI

## 6.1 Actions Taken Section Overview
The Actions Taken panel is integrated directly into Ticket Detail (`/staff/tickets/:id`):
- **Role Isolation**: IT Staff and Administrators have full create, assign, edit, and status controls. Requesters have read-only access strictly restricted to tickets they own.
- **Cardinality (0, 1, Many)**: Tickets cleanly handle 0 actions (empty guidance), 1 action, and multiple concurrent actions assigned to different staff members.
- **Action Lifecycle**:
  - `PENDING` ➔ `IN_PROGRESS` ➔ `COMPLETED` / `CANCELLED`
  - Reassignment to any active IT Staff or Administrator.
  - Mandatory follow-up note validation when `requiresFollowUp` is checked.
- **Optimistic Concurrency & Conflict Recovery**:
  - Actions enforce `expectedTicketVersion` and `expectedActionVersion`. Stale concurrent writes return `409 CONFLICT` with client draft preservation and in-place `Reload & Reconcile` guidance.
- **Actions Taken Drill-Down Page (`/staff/actions-taken`)**:
  - Displays paginated assigned actions with status filter chips and direct deep-linking `#action-:actionId` navigation.

## 6.2 Actions Taken Visual Evidence

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/actions-taken/1280.png" alt="Actions Taken Desktop 1280px" />
  <div class="screenshot-caption">Figure 6.1: Actions Taken panel on Desktop (1280px) displaying multiple actions, status badges, and action controls.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/actions-taken/768.png" alt="Actions Taken Tablet 768px" />
  <div class="screenshot-caption">Figure 6.2: Actions Taken panel on Tablet (768px) with responsive card reflow.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/actions-taken/375.png" alt="Actions Taken Mobile 375px" />
  <div class="screenshot-caption">Figure 6.3: Actions Taken panel on Mobile (375px) with full-width touch targets (>= 44px).</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/actions-taken/create-validation.png" alt="Actions Taken Create Validation" />
  <div class="screenshot-caption">Figure 6.4: Actions Taken form validation showing inline error messages placed directly below invalid inputs.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/actions-taken/conflict-reconcile.png" alt="Actions Taken Conflict Reconcile" />
  <div class="screenshot-caption">Figure 6.5: 409 Conflict alert banner with in-place draft retention and Reload & Reconcile control.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/actions-taken/drilldown-1280.png" alt="Actions Taken Drill-down Desktop" />
  <div class="screenshot-caption">Figure 6.6: Staff Actions Taken Drill-down page on Desktop (1280px) with pagination and status filters.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/actions-taken/drilldown-768.png" alt="Actions Taken Drill-down Tablet" />
  <div class="screenshot-caption">Figure 6.7: Staff Actions Taken Drill-down page on Tablet (768px).</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/actions-taken/drilldown-375.png" alt="Actions Taken Drill-down Mobile" />
  <div class="screenshot-caption">Figure 6.8: Staff Actions Taken Drill-down page on Mobile (375px) with responsive stacked cards.</div>
</div>

---

# Answer Part 7: Working Ticket Workflow

## 7.1 Ticket Status Machine & Resolution Gate
1. **8-State Transition Lifecycle**:
   - `NEW` ➔ `OPEN`, `CANCELLED`
   - `OPEN` ➔ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`
   - `IN_PROGRESS` ➔ `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
   - `WAITING_FOR_REQUESTER` ➔ `IN_PROGRESS`, `CANCELLED`
   - `RESOLVED` ➔ `CLOSED`, `REOPENED`
   - `CLOSED` ➔ `REOPENED`
   - `REOPENED` ➔ `IN_PROGRESS`, `CANCELLED`
   - `CANCELLED` ➔ `REOPENED`
2. **Resolution Gate Enforcement (BR-13, BR-14)**:
   - Entering `RESOLVED` requires:
     1. At least one child Action Taken in `COMPLETED` status with non-empty `result`.
     2. Zero child actions in `PENDING` or `IN_PROGRESS` status.
     3. Zero child actions that still require follow-up (`requiresFollowUp === true`).
   - Blocked resolution attempts trigger HTTP `400 TICKET_RESOLUTION_BLOCKED` and display an explicit error banner and inline error associated via `aria-describedby`.
3. **In-DOM Confirmation Modals**:
   - Sensitive transitions (`RESOLVED`, `CANCELLED`, `CLOSED`, `REOPENED`) require explicit confirmation via in-DOM dialogs with keyboard focus trapping, Escape dismissal, and focus restoration.
4. **Atomic Child Action Cancellation**:
   - Cancelling a parent ticket atomically cancels all active child actions with `cancelReason = "Ticket cancelled by IT Staff"`.

## 7.2 Ticket Workflow Visual Evidence

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/ticket-workflow/1280.png" alt="Ticket Workflow Desktop 1280px" />
  <div class="screenshot-caption">Figure 7.1: Ticket Detail status control on Desktop (1280px) showing permitted state transitions.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/ticket-workflow/768.png" alt="Ticket Workflow Tablet 768px" />
  <div class="screenshot-caption">Figure 7.2: Ticket Detail status control on Tablet (768px).</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/ticket-workflow/375.png" alt="Ticket Workflow Mobile 375px" />
  <div class="screenshot-caption">Figure 7.3: Ticket Detail status control on Mobile (375px).</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/ticket-workflow/resolution-blocked.png" alt="Resolution Blocked Banner" />
  <div class="screenshot-caption">Figure 7.4: Resolution Gate error banner displaying exact blocking conditions when resolving without a completed action.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/ticket-workflow/cancel-modal.png" alt="Ticket Cancellation Modal" />
  <div class="screenshot-caption">Figure 7.5: In-DOM Confirmation Modal for Ticket Cancellation warning that active child actions will be atomically cancelled.</div>
</div>

---

# Answer Part 8: Working Requester Dashboard and Final Regression UI

## 8.1 Requester Dashboard Overview
- Accessible at `/dashboard` for authenticated Requesters.
- Features 4 Bangkok 7-day rolling window metric cards (`Active Tickets`, `Waiting for You`, `Recently Updated`, `Recently Resolved`).
- 3 preview lists (Recently Updated, Attention Needed, Recently Resolved) capped at 5 items with direct drill-down links to `/tickets` preserving query parameters.
- Strict session-based ownership enforcement prevents viewing other users' metrics or tickets.

## 8.2 Full Regression Coverage
Existing Lab 1–3 functionality continues to operate flawlessly:
- **Authentication**: Login, session cookies, rate limiting, and logout.
- **First Password Change**: Mandatory password change barrier for seeded and reset accounts.
- **Requester Flow**: Ticket creation, attachment upload/download, My Tickets sorting/pagination, and public comments.
- **Staff Operations**: Queue searching, filtering, priority assignment, and Internal Notes isolation.
- **Administrator User Management**: User list, CRUD, status toggle, password reset, and last-admin invariant protections.

## 8.3 Requester Dashboard & Regression Visual Evidence

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/requester-dashboard/1280.png" alt="Requester Dashboard Desktop 1280px" />
  <div class="screenshot-caption">Figure 8.1: Requester Dashboard Desktop (1280px) with 4 metric cards and preview lists.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/requester-dashboard/768.png" alt="Requester Dashboard Tablet 768px" />
  <div class="screenshot-caption">Figure 8.2: Requester Dashboard Tablet (768px) with responsive card grid.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/requester-dashboard/375.png" alt="Requester Dashboard Mobile 375px" />
  <div class="screenshot-caption">Figure 8.3: Requester Dashboard Mobile (375px) single-column layout without horizontal scroll.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/requester-dashboard/empty.png" alt="Requester Dashboard Empty State" />
  <div class="screenshot-caption">Figure 8.4: Requester Dashboard empty state with friendly call to create a ticket.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/requester-dashboard/loading.png" alt="Requester Dashboard Loading" />
  <div class="screenshot-caption">Figure 8.5: Requester Dashboard accessible loading skeleton.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/requester-dashboard/error.png" alt="Requester Dashboard Error" />
  <div class="screenshot-caption">Figure 8.6: Requester Dashboard error banner with retry option.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/regression/login.png" alt="Regression Login" />
  <div class="screenshot-caption">Figure 8.7: Regression verification of Login screen with Zen Green branding.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/regression/change-password.png" alt="Regression Change Password" />
  <div class="screenshot-caption">Figure 8.8: Regression verification of Mandatory Change Password screen.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/regression/my-tickets.png" alt="Regression My Tickets" />
  <div class="screenshot-caption">Figure 8.9: Regression verification of My Tickets with query parameter persistence.</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/regression/1280.png" alt="Regression Staff Queue Desktop" />
  <div class="screenshot-caption">Figure 8.10: Regression verification of Staff Queue on Desktop (1280px).</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/regression/768.png" alt="Regression Ticket Detail Tablet" />
  <div class="screenshot-caption">Figure 8.11: Regression verification of Staff Ticket Detail on Tablet (768px).</div>
</div>

<div class="screenshot-container">
  <img src="../../artifacts/lab-04/screenshots/regression/375.png" alt="Regression User Management Mobile" />
  <div class="screenshot-caption">Figure 8.12: Regression verification of Administrator User Management on Mobile (375px).</div>
</div>

---

# Answer Part 9: Zen Green UI, Responsive, Accessibility, and Final Polish

## 9.1 Zen Green Design System & WCAG AA Compliance
TokTickIT strictly implements the Zen Green design system tokens across all screens:
- **Primary Green**: `#006B3C` (4.8:1 contrast on white)
- **Secondary Green**: `#0B7A46` (4.6:1 contrast on white)
- **Mint Surface / Pale Green**: `#EAF6EF`
- **Page Background**: `#F5F7F6`
- **Text Color**: `#1A2E1A` (14.2:1 contrast on white)
- **Danger Red**: `#C62828` (4.9:1 contrast on white)

All text-to-background contrast ratios strictly meet or exceed WCAG AA requirements ($\ge 4.5:1$ for regular text, $\ge 3:1$ for large headings). Color is never used as the sole indicator of state; badges and alerts combine text, icons, and distinct borders.

## 9.2 Accessibility & Mobile Usability
- **Touch Targets**: All mobile buttons, links, and select triggers have a minimum touch height of $\ge 44	ext{ px}$.
- **Form Controls & Errors**: Explicit labels with required asterisks (`*`), with error messages positioned directly below invalid controls programmatically bound via `aria-invalid` and `aria-describedby`.
- **Focus Indicators**: 2px solid `#006B3C` focus ring with 2px offset visible across all keyboard navigation.
- **Modal Dialogs**: Trapped keyboard focus within confirmation dialogs, `Escape` key dismissal, and proper `role="dialog"`, `aria-modal="true"`.
- **Zero Horizontal Overflow**: Verified programmatically across 1280px, 768px, and 375px viewports (`scrollWidth <= innerWidth`).

## 9.3 Rendered Visual QA Checklist (`toktickit/docs/lab-04/visual-checklist.md`)

# Lab 4 Visual QA Checklist — Issue #61

**Sprint:** Lab 4 (Issue #61)  
**Branch:** `lab4-6-verification-qa` ➔ `lab4-staging`  
**Base Commit:** `d494e6b` | **Verification Date:** 2026-10-19  

**Test Environment:** Playwright Chromium 1.52.0 on macOS (Darwin arm64).  
**Required Viewports:** 1280 × 812 (Desktop), 768 × 812 (Tablet), and 375 × 812 (Mobile).  

## Visual QA Evidence Matrix

| Area | Checks | Verified Screenshot Evidence | Status |
|---|---|---|:---:|
| Requester Dashboard | 4 metric cards, 3 preview lists (max 5 items) at 1280/768/375 px; zero counts, empty lists, keyboard links, error retry | `artifacts/lab-04/screenshots/requester-dashboard/{1280,768,375}.png`, `loading.png`, `empty.png`, `error.png` | **Verified** |
| Staff Dashboard | 7 metric cards, zero-count groups, 3 preview lists at 1280/768/375 px; keyboard links, urgent ticket ordering, accessible badges | `artifacts/lab-04/screenshots/staff-dashboard/{1280,768,375}.png`, `loading.png`, `zero-groups.png`, `error.png` | **Verified** |
| Actions Taken Section | Detail integration, interactive list, create form, validation errors, view/edit mode, assignment, complete, cancel modal | `artifacts/lab-04/screenshots/actions-taken/{1280,768,375}.png`, `create-validation.png`, `conflict-reconcile.png` | **Verified** |
| Actions Taken Drill-down | Paginated assigned actions table/cards at 1280/768/375 px; filter summary chip, pagination controls, ticket link | `artifacts/lab-04/screenshots/actions-taken/drilldown-{1280,768,375}.png` | **Verified** |
| Ticket Workflow | Allowed status options, confirmation dialogs, resolution blocked banner with reasons, atomic cancel notice | `artifacts/lab-04/screenshots/ticket-workflow/{1280,768,375}.png`, `resolution-blocked.png`, `cancel-modal.png` | **Verified** |
| Regression | Login, Change Password, My Tickets, Staff Queue, User Management responsive layouts and read-only Admin checks | `artifacts/lab-04/screenshots/regression/{1280,768,375}.png`, `login.png`, `change-password.png`, `my-tickets.png` | **Verified** |

## Checklist result

- [x] `document.documentElement.scrollWidth <= window.innerWidth` at all required viewport checks (1280 px, 768 px, and 375 px) with zero horizontal page scroll.
- [x] Desktop/tablet use structured tables; mobile collapses cleanly into responsive stacked cards without clipping.
- [x] Action description, result, follow-up note, and attachment notes wrap cleanly with `white-space: pre-wrap` and `word-break: break-word` without text clipping.
- [x] Form controls have explicit visible labels, required asterisks, and programmatic error associations (`aria-invalid`, `aria-describedby`).
- [x] Keyboard focus is retained with visible focus rings across dashboard cards, action controls, and modal dialogs.
- [x] Status, role, priority, and action badges include text labels and visual indicators; color is not the sole conveyor of information.
- [x] Mobile interactive touch targets meet or exceed $\ge 44\text{ px}$ target dimensions.
- [x] Zen Green design system token contrast pairs meet WCAG AA $\ge 4.5:1$ text contrast target.
- [x] All 31 screenshot artifacts are captured and persisted under `artifacts/lab-04/screenshots/` across 5 domain folders (`staff-dashboard/`, `requester-dashboard/`, `actions-taken/`, `ticket-workflow/`, `regression/`) and verified for readable typography and layout fidelity.


## 9.4 Rendered `docs/lab-04/ui-spec.md`

# Lab 4 UI Specification — Actions, Dashboards, and Workflow

## Issue #56 delivery boundary

This issue delivers the pre-implementation UI contract and evidence structure. It defines role navigation, the screen authorization matrix, the screen state matrix, dashboard layouts, Actions Taken interaction modes, resolution workflow feedback, and responsive/accessibility requirements. The implementation of these UI components and screens belongs to subsequent Lab 4 issues (Issues #58, #59, #60, and #61) after this contract is reviewed and merged into `lab4-staging`.

## 1. Shared visual and interaction rules

Keep the Lab 2 and Lab 3 Zen Green tokens: primary `#006B3C`, secondary `#0B7A46`, pale green `#EAF6EF`, page background `#F5F7F6`, white surface, dark green text, and red `#C62828` errors. Preserve existing buttons, badges, cards, table/card layouts, focus indicators, and form field styling.

- Every input, select, and textarea has an explicit label, a stable accessible name, and `aria-required` when required.
- Validation errors appear directly below the invalid control, associated programmatically, and are not conveyed by color alone.
- Buttons are at least 44 px high on mobile. Saving controls disable duplicate submission and display a busy spinner plus text.
- User-provided Action descriptions, results, follow-up notes, attachment notes, and cancel reasons are rendered as plain text preserving line breaks with `white-space: pre-wrap`; never render user text as HTML.
- Ticket status, Action status, Requested Priority, IT Priority, and role use text badges with sufficient contrast, not color-only indicators.
- No viewport has horizontal page overflow (`document.scrollWidth <= innerWidth`), clipped text, or overlapping controls at 1280 px, 768 px, or 375 px.
- Recoverable request errors preserve draft content; conflict errors (`409 CONFLICT`) show explicit reload and reconcile guidance without silently discarding user input.

## 2. Authenticated shell

The header displays TokTickIT, current user name/email and role, Change Password, and Logout. Navigation and default home routes are role-aware:

| Role | Visible navigation | Home route |
|---|---|---|
| Requester | Dashboard, My Tickets, Create Ticket | `/dashboard` |
| IT Staff | Dashboard, Staff Queue, Actions Taken | `/staff/dashboard` |
| Administrator | Dashboard, Staff Queue, Actions Taken, User Management | `/staff/dashboard` |

The client bootstraps session state via `/api/auth/me` on refresh. Unauthenticated users redirect to Login; `mustChangePassword` users are routed to Change Password; unauthorized direct route access displays a safe 403 screen with a permitted navigation link.

### 2.1 Screen authorization matrix

This table defines the screen and route authorization contract. Backend endpoint authorization remains authoritative; client route guards provide navigation safety only. `Own` means the authenticated Requester owns the referenced Ticket.

| Screen / route | Requester | IT Staff | Administrator | Unauthenticated or wrong-role behavior |
|---|---|---|---|---|
| Login (`/login`) | Redirect to Shell | Redirect to Shell | Redirect to Shell | Accessible; form displays |
| Change Password (`/change-password`) | Own session / edit | Own session / edit | Own session / edit | Unauthenticated → Login; blocked until change succeeds |
| Requester Dashboard (`/dashboard`) | Own metrics and lists | 403 | 403 | Unauthenticated → Login; wrong role → safe 403 |
| Staff Dashboard (`/staff/dashboard`) | 403 | Own operational metrics | Own operational metrics | Unauthenticated → Login; wrong role → safe 403 |
| Staff Actions Taken (`/staff/actions-taken`) | 403 | Current user assigned actions | Current user assigned actions | Unauthenticated → Login; wrong role → safe 403 |
| Create Ticket (`/tickets/new`) | Own / edit | 403 | 403 | Unauthenticated → Login; wrong role → safe 403 |
| My Tickets (`/tickets`) | Own / read and query | 403 | 403 | Unauthenticated → Login; wrong role → safe 403 |
| Requester Ticket Detail (`/tickets/:id`) | Own / read ticket & actions | 403 | 403 | Unauthenticated → Login; non-owner or wrong role → safe 404/403 |
| Staff Queue (`/staff/tickets`) | 403 | All / read and open detail | All / read-only queue | Unauthenticated → Login; wrong role → safe 403 |
| Staff Ticket Detail (`/staff/tickets/:id`) | 403 | All / edit workflow & actions | All / read-only ticket, editable actions | Unauthenticated → Login; wrong role → safe 403 |
| User Management (`/admin/users`) | 403 | 403 | Full scoped operations | Unauthenticated → Login; wrong role → safe 403 |

The Administrator action mutation exception does not render Ticket owner, IT Priority, formal status, Public Comment, Internal Note, or attachment upload/download controls.

## 3. Screen state matrix

| Screen | Initial/loading | Valid/normal | Empty/no-results | Validation | Saving/success | Failure/forbidden |
|---|---|---|---|---|---|---|
| Requester Dashboard | Skeleton cards & lists | 4 metric cards, 3 preview lists (max 5) | Zero counts (`0`), empty list message | N/A | Refresh on focus/click | Retryable error banner; never display false 0 on failure |
| Staff Dashboard | Skeleton cards & lists | 7 metric cards, 3 preview lists (max 5) | Zero groups shown (`0`), empty list message | N/A | Refresh on focus/click | Safe retry banner; wrong role shows safe 403 |
| Actions Taken Drill-down | Spinner | Paginated action list with filter summary | “No actions found matching filters” | Invalid query reset | Page change / filter update | Safe retry; invalid query reset |
| Requester Ticket Detail | Spinner | Detail, read-only Actions Taken, comments | “No actions taken yet” message | N/A | Toast on advisory click | Safe 404 for unowned; safe 403 for wrong role |
| Staff Ticket Detail (Actions Taken) | Spinner | Detail, interactive Actions Taken section | “No actions taken yet” with create button | Field-level error below control; focus invalid | Busy button, success notice, refresh parent | `409 CONFLICT` preserves draft with reload prompt; safe 400/403 |
| Ticket Workflow Controls | Current status badge | Allowed transition buttons/dropdown | N/A | Blocked resolution reasons listed | Saving indicator; updated status badge | Safe resolution error banner; `409` reload prompt |

## 4. Requester Dashboard

Route `/dashboard`. Backend calculates all metrics for the session user in the Bangkok 7-day calendar window:

- **Open Tickets:** count of owned Tickets with status `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`. Drill down navigates to My Tickets filtered by this status set.
- **Waiting for You:** count of owned Tickets with status `WAITING_FOR_REQUESTER`. Drill down navigates to My Tickets with this status.
- **Recently Updated:** count of owned Tickets updated within the 7-day window. Drill down passes captured date range.
- **Recently Resolved:** count of owned Tickets with status `RESOLVED`/`CLOSED` and `resolvedAt` within the 7-day window. Drill down passes captured resolved date range and status set.
- **Preview lists:** Recent Tickets, Attention Tickets, and Resolved Tickets (bounded to 5 items each, stable sort order). Each row opens Requester Ticket Detail.

Count values use `0` when empty; failed requests display an error banner with retry instead of a misleading zero.

## 5. Staff and Administrator Dashboard

Route `/staff/dashboard`. Staff and Administrator share one operational dashboard layout. “My” always refers to the authenticated user:

- **Unassigned Tickets:** active-work Tickets with `ownerId = null`. Drill down opens Staff Queue with unassigned filter.
- **My Tickets:** active-work Tickets where `ownerId` is the current user. Drill down opens Staff Queue with owner filter.
- **Tickets by Status:** group counts for all eight statuses including zero counts. Each status links to Staff Queue filtered by that status.
- **Active Tickets by IT Priority:** group counts for `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` active-work Tickets including zero counts. Links to Staff Queue with priority filter.
- **My Actions Taken:** count of non-terminal `PENDING`/`IN_PROGRESS` actions where `assigneeId` is the current user. Links to Actions Taken drill-down page.
- **Recent Tickets & Urgent Tickets:** bounded preview lists (max 5 each) linking to Ticket Detail. Urgent Tickets sort by priority descending then update time descending.
- **My Actions:** bounded preview list (max 5) of current user assigned actions linking to Ticket Detail with action in context.

## 6. Actions Taken Section

Embedded on Ticket Detail below the summary header:

### 6.1 Placement and list

Staff and Administrators see an interactive management section; Requesters see a clean read-only view. Each action item displays:
- Date and time rendered in `Asia/Bangkok` from server `createdAt`.
- Action Description and Result.
- Performed by (name and role, server-determined).
- Assignee (name, role, active indicator) and Action Status badge.
- Follow-Up Required indicator and Follow-up Note when present.
- Attachment Notes (plain-text reference to existing Ticket attachments).
- Cancel Reason when cancelled.
- Edit, assign, and status buttons when permissions and lifecycle permit.
- Stable display ordering by `createdAt asc, id asc`; editing does not reorder items.

### 6.2 Create mode

Staff/Admin open the Create Action form on an active writable Ticket:
- **Description:** required textarea (1–2,000 characters).
- **Assignee:** selectable dropdown of active Staff/Admin users, defaulting to the current user.
- **Follow-Up Required:** checkbox; toggling on makes **Follow-up Note** required.
- **Attachment Notes:** optional plain-text textarea.
- **Result:** optional at creation.
- Submits `expectedTicketVersion` and client `Idempotency-Key`. Submit button is disabled while saving. On retry after failure/timeout, the same key is reused.

### 6.3 View/edit mode

Editing allows updating description, result, follow-up fields, and attachment notes on non-terminal actions (`PENDING`, `IN_PROGRESS`, `COMPLETED`). Performed-by and creation date remain read-only. Completed actions retain required result validity. Cancelled actions are strictly read-only.

### 6.4 Assignment and status controls

- **Assignment:** allows reassigning to an active Staff or Administrator.
- **Status transitions:**
  - `PENDING` → Start (`IN_PROGRESS`), Complete (`COMPLETED`), Cancel (`CANCELLED`).
  - `IN_PROGRESS` → Complete (`COMPLETED`), Cancel (`CANCELLED`).
  - `COMPLETED` and `CANCELLED` are terminal states.
- Complete requires a non-empty Result. Cancel prompts for a required Cancel Reason (1–2,000 characters).

## 7. Ticket Workflow and Resolution UI

- IT Staff workflow controls show only valid next transitions according to the 8-state matrix.
- `CANCELLED`, `RESOLVED`, `CLOSED`, and `REOPENED` require explicit modal confirmation.
- Attempting to resolve a Ticket that does not meet the resolution gate displays an explicit error banner stating the blocking condition (e.g. no completed action, active action present, or unresolved follow-up).
- Ticket cancellation modal informs the user that active child actions will be atomically cancelled.
- Reopen modal informs the user that past action history is retained and resolution timestamps are cleared.
- Stale update conflicts (`409 CONFLICT`) retain user draft and offer reload/reconcile controls.

## 8. Actions Taken Drill-down

Route `/staff/actions-taken`. Dedicated page for inspecting assigned actions:
- URL search parameters maintain state: `?assignee=me&statuses=PENDING,IN_PROGRESS&page=1&pageSize=10`.
- Supports pagination (5, 10, 20 items per page) and stable sorting (`createdAt desc, id desc`).
- Displays active filter summary chip with clear/reset action.
- Table / card rows show action description, status, assignee, Ticket Number, Ticket summary, and current Ticket status. Clicking a row navigates to Ticket Detail with the action in context.

## 9. Responsive and accessibility checklist

- Verify layouts at 1280 px desktop, 768 px tablet, and 375 px mobile; `scrollWidth <= innerWidth` across all screens.
- Desktop and tablet use structured tables; mobile renders stacked cards with full-width buttons (>= 44 px touch targets).
- Maintain explicit form labels, programmatic error associations (`aria-describedby`), logical heading order, and visible keyboard focus rings.
- Dynamic updates and loading/saving feedback use `aria-live` regions or accessible busy states.
- Status, priority, role, and action badges use text and icons alongside color to convey state.
- Screen contrast meets WCAG AA 4.5:1 for all Zen Green text and badge tokens.
- Screenshots are captured under `artifacts/lab-04/screenshots/` for requester dashboard, staff dashboard, actions taken, ticket workflow, and regression.

