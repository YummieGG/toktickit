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
