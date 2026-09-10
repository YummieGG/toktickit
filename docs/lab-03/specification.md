# Lab 3 Sprint Engineering Specification

**Status:** Engineering contract for implementation (Issue 1)
**Baseline:** Lab 2 requester ticketing MVP
**Source of truth:** This document, [`api-spec.md`](./api-spec.md), [`ui-spec.md`](./ui-spec.md), and [`tests.md`](./tests.md)

### Issue #39 implementation boundary

Issue #39 delivers only the authentication foundation: the `User`, session,
and login-attempt data model; non-destructive migration; transactional
password backfill; idempotent local seed; password policy and scrypt helpers;
the four `/api/auth` endpoints; and the Login and Change Password screens.
The requester identity migration, removal of the Lab 2 selector, authenticated
application shell, backend authorization of existing ticket/attachment routes,
and role-specific workflows remain owned by the subsequent Lab 3 issues. The
legacy Lab 2 route behavior therefore remains contract-compatible in this
issue so that its existing regression tests continue to provide a stable
baseline.

## 1. Sprint Goal

Replace the Lab 2 development requester selector with authenticated users and deliver a role-aware IT support workflow. Requesters retain the Lab 2 ticket and attachment experience, IT Staff can process tickets collaboratively, and Administrators can manage user accounts with safe, read-only ticket oversight.

## 2. Stakeholder Request

The stakeholder asks us to replace the temporary Development Requester selector with secure login and role-based access. Requesters keep the Lab 2 ticket capability; IT Staff process the support queue and ticket details; Administrators manage user accounts while remaining read-only on ticket data.

### Roles

| Role | Purpose | Ticket access | User-management access |
|---|---|---|---|
| Requester | Create and follow up on personal support requests | Own tickets, attachments, public comments, and the “Problem Appears Resolved” indication | None |
| IT Staff | Operate the support queue and resolve tickets | Queue and detail for all tickets; owner, IT priority, status, public comments, and internal notes | None |
| Administrator | Maintain accounts and audit ticket information | Read-only queue/detail, attachment metadata, comments, notes, and resolution indication | Full scoped user management |

Administrator is not implicitly an IT Staff operator. The authorization matrix in Appendix A is the binding rule for every screen and endpoint.

## 3. Scope

### Included

- User schema, non-destructive migration from `RequesterUser`, idempotent seed, password hashing, and session authentication.
- Login, logout, current-user bootstrap, mandatory first-login password change, and login-attempt throttling.
- Backend authorization and ownership enforcement; no client-supplied `requesterId` trust.
- Regression of Lab 2 Create Ticket, My Tickets, Ticket Detail, and attachments for the authenticated Requester.
- IT Staff queue/detail workflow: search, filters, sorting, pagination, owner, IT Priority, status, public comments, internal notes, and attachment continuity.
- Administrator user list/create/edit/activate/deactivate/initial-password reset.
- “Problem Appears Resolved” Requester indication, visible to Staff/Admin without changing formal status.
- Unit, API, UI, security, migration, responsive/accessibility, and E2E verification.

### Out of scope

Self-registration, password recovery email/MFA/SSO, account deletion, bulk import/export, multiple roles per user, Actions Taken, SLA/escalation/notifications, dashboards/KPIs, and production infrastructure.

## 4. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | The system authenticates users with email and password and creates an expiring server-side session. |
| FR-02 | Login, logout, current-user, and mandatory change-password endpoints follow [`api-spec.md`](./api-spec.md). |
| FR-03 | Inactive users, invalid credentials, invalid sessions, and expired sessions receive safe errors without account enumeration. |
| FR-04 | A user with `mustChangePassword=true` can only reach Change Password until it succeeds. |
| FR-05 | Every protected request is authorized by the authenticated role and resource ownership on the backend. |
| FR-06 | Requesters can create, list, view, and attach/remove/download only their own tickets and can add public comments. |
| FR-07 | Lab 2 requester behavior remains available without a development requester selector or client `requesterId` context. |
| FR-08 | Requesters can submit the idempotent “Problem Appears Resolved” indication for an owned ticket. |
| FR-09 | IT Staff can search/filter/sort/page the full ticket queue and open a detail view. |
| FR-10 | IT Staff can claim/reassign owners, update IT Priority, and perform only valid status transitions. |
| FR-11 | Public Comments are visible to Requester, IT Staff, and Administrator; Internal Notes are visible only to IT Staff and Administrator. |
| FR-12 | Comments and notes are append-only; author and timestamp always come from the authenticated server context. |
| FR-13 | Administrator can list/search/filter, create, edit, activate/deactivate users, and set an initial password. |
| FR-14 | Administrator ticket access is read-only and never grants Staff mutations. |
| FR-15 | All screens expose loading, empty/no-results, validation, success, forbidden, not-found, conflict, and safe API-failure states where applicable. |
| FR-16 | The UI is responsive and keyboard/accessibility compliant at 1280 px, 768 px, and 375 px. |

## 5. Business Rules

### Authentication and account rules

- **BR-01:** Email is trimmed, lower-cased, and unique in the database. Names are trimmed; the canonical email is returned consistently.
- **BR-02:** Passwords are 12–128 characters, contain at least three of uppercase/lowercase/digit/special, and contain no whitespace/control character. The rule is shared by login, first change, and Administrator reset.
- **BR-03:** Passwords use Node `crypto.scrypt` with `N=32768`, `r=8`, `p=1`, a random 16-byte salt, a 32-byte derived key, an encoded stored value, asynchronous execution, and constant-time comparison.
- **BR-04:** A session uses an opaque random token stored only as a hash server-side and is sent as `tt_session` with `HttpOnly`, `SameSite=Lax`, `Secure` in production, and an eight-hour expiry. It is never stored in localStorage.
- **BR-05:** Login attempts are keyed by normalized email plus a privacy-preserving HMAC of client IP. Five failures in 15 minutes start a 15-minute cooldown. Invalid credentials and inactive accounts use the same safe response.
- **BR-06:** Logout invalidates only the current session. Password change, Administrator reset, and deactivation revoke all sessions for that user.
- **BR-07:** An authenticated user is identified only by the session. The client cannot select or override a requester identity.

### Data and migration rules

- **BR-08:** `RequesterUser` evolves to `User`; existing IDs, ticket ownership, attachments, reference data, and timestamps are preserved. Existing users become active/inactive Requesters according to the existing value. For each migrated user whose `passwordHash` is null, an application-level backfill reads `SEED_INITIAL_PASSWORD`, validates it against BR-02, stores only its scrypt hash, and sets `mustChangePassword=true`. Existing non-null password hashes and their password-change state are preserved.
- **BR-09:** Seed and password backfill are idempotent. Local development uses `SEED_INITIAL_PASSWORD` from an uncommitted `.env`; it is hashed before insertion/backfill, never returned, logged, emailed, or committed. If the variable is missing or invalid, the operation fails before committing any user changes. Inactive migrated users remain inactive and cannot log in until reactivated.
- **BR-10:** Deactivating or changing the role of a ticket owner runs in one transaction and unassigns affected tickets (`ownerId=null`). Only active IT Staff or Administrator users can be assigned.
- **BR-11:** There must always be at least one active Administrator; an Administrator cannot deactivate themself.

### Ticket workflow rules

- **BR-12:** New tickets start in `New`. Requester-created fields and Requested Priority retain Lab 2 validation and semantics.
- **BR-13:** Formal transitions are exactly:

| From | Allowed next states |
|---|---|
| New | Open, Cancelled |
| Open | In Progress, Waiting for Requester, Cancelled |
| In Progress | Waiting for Requester, Resolved, Cancelled |
| Waiting for Requester | In Progress, Cancelled |
| Resolved | Closed, Reopened |
| Closed | Reopened |
| Reopened | In Progress, Cancelled |
| Cancelled | Reopened |

Only IT Staff performs formal transitions. Administrator is read-only; Requester cannot set a formal status. Cancelled, Resolved, Closed, and Reopened require explicit confirmation. Invalid transitions return `400 INVALID_STATUS_TRANSITION`. Reopened clears the resolution indication.

- **BR-14:** IT Priority is separate from Requester Requested Priority. Owner, IT Priority, and status changes are not allowed through Requester endpoints.
- **BR-15:** Public Comments and Internal Notes accept trimmed plain text from 1–2,000 characters. Newlines are normalized; output is escaped and rendered with preserved line breaks. Client author/timestamp fields are ignored or rejected.
- **BR-16:** `problemAppearsResolvedAt` is nullable. An owned Requester may set it once or repeat the same action idempotently; it does not change formal status and cannot be undone by the Requester. Staff/Admin can read it; Reopened clears it. No event-history feature is added.
- **BR-17:** Attachment permissions are role-scoped: the Requester owner may upload, read metadata, download, and soft-remove; IT Staff may read metadata and download; Administrator may read metadata only. Removed attachment metadata remains visible to permitted readers, while download is blocked.
- **BR-18:** Each User has exactly one permitted role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`. Multiple roles and role history are out of scope.
- **BR-19:** Each Ticket has zero or one primary owner. An owner must be an active IT Staff or Administrator; a new Ticket may remain unassigned. Deactivation or role changes that make an owner ineligible unassign the Ticket transactionally.
- **BR-20:** `IT Priority` initially copies the Requester’s `Requested Priority` at Ticket creation and is stored separately thereafter. Requester endpoints cannot change it; mutation permissions follow the approved endpoint matrix.
- **BR-21:** Ticket collections use offset pagination with `page` (default `1`) and `pageSize` (`5`, `10`, or `20`; default `10`). Responses include `page`, `pageSize`, `totalItems`, `totalPages`, `hasNextPage`, and `hasPreviousPage`; invalid values return `400 INVALID_QUERY`, and an out-of-range page returns `200` with an empty collection.

## 6. UI Specification Summary

The UI keeps the Zen Green reusable component language and provides Login, Change Password, an authenticated role-aware shell, the Lab 2 Requester screens, the IT Staff Queue and Detail screens, and Administrator User Management. Each screen defines loading, validation, success, empty/no-results, forbidden, not-found, conflict, and API-failure states. Navigation and content are role-scoped by the screen authorization matrix in [`ui-spec.md`](./ui-spec.md#21-screen-authorization-matrix), and the layout must remain usable at 1280 px, 768 px, and 375 px with keyboard and accessibility support.

The detailed screen state matrix, responsive behavior, tokens, and accessibility requirements are in [`ui-spec.md`](./ui-spec.md). This summary is the UI Specification required by the Lab sheet; the linked document is the implementation reference.

## 7. Data Changes

- Rename/evolve `RequesterUser` to `User`; add `role`, `isActive`, `passwordHash`, `mustChangePassword`, `createdAt`, and `updatedAt`.
- Add `UserSession` (unique token hash, user foreign key, expiry, created/revoked timestamps) and `LoginAttempt` (normalized email, HMAC IP key, failure count/window/cooldown) with lookup indexes for session validation and cooldown checks.
- Extend `Ticket` with optional `ownerId` foreign key, `itPriority`, workflow fields required by the Staff detail, and nullable `problemAppearsResolvedAt`; index queue filter/sort fields used by the API contract.
- Add `PublicComment` and `InternalNote` with ticket and author foreign keys, plain-text content, and server timestamps; index each by ticket and creation time.
- Preserve all Lab 2 Category, RelatedSystem, Ticket, and Attachment records and relations.

Seed data must be idempotent and include at least four active Requesters, one inactive Requester, three active IT Staff, one inactive IT Staff, one active Administrator, realistic Tickets distributed across statuses/priorities and assigned or unassigned owners, and non-sensitive Public Comments/Internal Notes.

Migration must be non-destructive, preserve existing IDs and ownership, and be safe to run more than once in development. Schema changes run first; an application-level, transactional password backfill then handles legacy users with no hash. The backfill never overwrites an existing hash, rolls back on a missing/invalid `SEED_INITIAL_PASSWORD`, and is safe to rerun. The migration and seed evidence required for these changes are defined in [`tests.md`](./tests.md).

## 8. API Contract

The exact REST paths, payloads, error contract, status codes, authentication behavior, endpoint authorization matrix, and queue query rules are in [`api-spec.md`](./api-spec.md). The endpoint matrix in Appendix A is a compact cross-document view; `api-spec.md` is the canonical implementation contract.

Every acceptance criterion is mapped to a planned test path and its owning implementation issue in [`tests.md`](./tests.md), including migration, security, authorization, and Lab 2 regression coverage.

## 9. Acceptance Criteria

- **AC-01:** Clean migration preserves Lab 2 tickets, attachments, categories, related systems, IDs, and requester ownership.
- **AC-02:** Idempotent seed creates at least four active Requesters, one inactive Requester, three active IT Staff, one inactive IT Staff, and one active Administrator, plus realistic ticket/comment/note data, without duplicate rows or plaintext credentials.
- **AC-03:** Valid active users can log in; inactive/invalid/cooldown cases are safe; logout invalidates the current session.
- **AC-04:** First-login users are blocked by Change Password until a valid password is saved.
- **AC-05:** Password validation and scrypt storage follow BR-02/BR-03; hashes and secrets never reach the client.
- **AC-06:** Requester Lab 2 flows work using session identity and cross-requester access is denied.
- **AC-07:** Requester “Problem Appears Resolved” is idempotent, visible to Staff/Admin, does not set status, and is cleared by Reopened.
- **AC-08:** Staff queue search, filters, sorting, pagination, empty/no-results, retry, and responsive representations follow the contract.
- **AC-09:** Staff detail supports allowed owner/IT Priority/status operations, comments, notes, attachments, confirmations, and safe errors.
- **AC-10:** Public Comments never leak Internal Notes; both are append-only and server-attributed.
- **AC-11:** Administrator can complete scoped user management; duplicate email, invalid role, self-deactivation, and last-active-Administrator cases are blocked.
- **AC-12:** Requester and IT Staff cannot access Administrator operations or UI routes; Administrator cannot perform Staff mutations.
- **AC-13:** Unit/API/UI/E2E/security/migration tests cover every AC with no skipped, disabled, focused-only, or placeholder tests.
- **AC-14:** Required responsive/accessibility checks pass with no clipping, overflow, inaccessible controls, or sub-44 px mobile targets.

## 10. Definition of Done

The four contract documents agree; every protected operation has a role rule; every AC has a planned test; implementation issues reference this contract; tests report real pass/fail/skip totals; evidence paths are recorded for the submission PDF; and the student reviews and approves AI-assisted changes.

## 11. Assumptions and Decisions

The following decisions close the implementation choices identified during the Issue 1 review. They are summarized here for quick reference; the detailed contracts remain authoritative.

- **Authentication/session:** Use an opaque, random, server-side session token in an `HttpOnly` `tt_session` cookie with an eight-hour expiry. Store only its hash and revoke it according to BR-06.
- **Login-attempt policy:** Key attempts by normalized email and an HMAC of client IP; five failures in 15 minutes trigger a 15-minute cooldown with a non-enumerating response.
- **Password policy:** Apply the shared 12–128 character complexity rule and asynchronous `crypto.scrypt` parameters in BR-02/BR-03.
- **Migration and seed:** Preserve Lab 2 IDs and ownership, run a non-destructive/idempotent schema migration, and run a transactional application backfill for legacy users with no hash. Source the initial password from `SEED_INITIAL_PASSWORD` in an uncommitted environment file, hash it with the shared scrypt policy, set `mustChangePassword=true` only for users receiving the backfilled password, and never overwrite an existing hash.
- **Requester identity:** Derive identity only from the authenticated session; remove the Development Requester selector and reject or ignore client-supplied `requesterId`.
- **Staff queue:** Use the API contract’s server-side search, filters, sorting, pagination, and safe empty/no-results behavior as the single query rule for the full ticket queue.
- **Queue pagination:** Use offset metadata (`page`, `pageSize`, `totalItems`, `totalPages`, `hasNextPage`, and `hasPreviousPage`), return an empty page for an out-of-range request, and apply `id desc` as the deterministic secondary sort key.
- **Status and resolution:** Implement only the BR-13 transition matrix. “Problem Appears Resolved” is an idempotent nullable timestamp, does not change formal status, and is cleared on Reopened.
- **Attachment access:** Use the selected metadata-only Administrator policy: Requester owners have full attachment operations, IT Staff can read metadata/download, and Administrators can read metadata but cannot download or mutate.
- **Role separation:** Administrators have read-only ticket oversight and never inherit IT Staff mutations; backend authorization remains authoritative over UI guards.

## Appendix A. Authorization Matrix

| Resource/operation | Requester | IT Staff | Administrator | Unauthenticated |
|---|---:|---:|---:|---:|
| Public health/root, login | Read | Read | Read | Read |
| Logout, current user, change password | Own session | Own session | Own session | 401 |
| Categories/related systems | Read | Read | Read | 401 for app use |
| Create ticket | Own/write | 403 | 403 | 401 |
| List own tickets | Own/read | 403 | 403 | 401 |
| Ticket detail | Own/read | All/read | All/read | 401 |
| Attachment metadata | Own/read | All/read | All/read | 401 |
| Attachment upload | Own/write | 403 | 403 | 401 |
| Attachment download | Own/read file | All/read file | 403 | 401 |
| Attachment soft-remove | Own/write | 403 | 403 | 401 |
| Submit Problem Appears Resolved | Own/write | 403 | 403 | 401 |
| Read Problem Appears Resolved | Own/read | All/read | All/read | 401 |
| Staff queue | 403 | All/read | All/read | 401 |
| Staff ticket detail | 403 | All/read | All/read | 401 |
| Owner, IT Priority, formal status | 403 | Allowed by workflow | 403 | 401 |
| Read Public Comments | Own ticket | All tickets | All tickets | 401 |
| Create Public Comment | Own ticket | All tickets | 403 | 401 |
| Read Internal Notes | 403 | All tickets | All tickets | 401 |
| Create Internal Note | 403 | All tickets | 403 | 401 |
| User Management | 403 | 403 | Full scoped operations | 401 |

For a protected resource owned by another Requester, the API returns a safe `404` rather than confirming that the resource exists. A valid session with the wrong role receives `403`; no session receives `401`. UI guards improve navigation only; backend checks are authoritative.

## Appendix B. Lab 2 Baseline Audit

This audit was performed against GitHub Issues [#11–#18](https://github.com/YummieGG/toktickit/issues/11), the Lab 2 documents, and `origin/main`. It records the actual baseline that the Lab 3 migration must preserve or replace.

| Area | Evidence in Lab 2/main | Lab 3 consequence and risk |
|---|---|---|
| Data model | `server/prisma/schema.prisma` defines `RequesterUser`, `Ticket.requesterId`, `Attachment`, `Category`, `RelatedSystem`, and `TicketStatus { NEW }`. | Evolve `RequesterUser` into `User` without changing IDs or Ticket/Attachment ownership; expand status/owner fields through a non-destructive PostgreSQL migration. |
| Server API | `server/src/routes/tickets.ts` and `attachments.ts` accept `requesterId` from query/body; `requesters.ts` exposes active requester selection; Lab 2 Issues #14–#17 define ticket and attachment contracts. | Replace client-supplied identity with the session while preserving validation, file limits, soft removal, safe ownership behavior, and existing route continuity. The `requesterId` trust boundary is the primary security risk. |
| Client UI | `client/src/contexts/RequesterContext.tsx`, `RequesterSelect.tsx`, `AppShell.tsx`, and requester pages use the Development Requester selector and Change Requester action. | Remove selector/context state, add auth bootstrap/role navigation, and keep Create Ticket, My Tickets, Ticket Detail, and attachment states working for the authenticated Requester. |
| Tests and evidence | Lab 2 Issues #11 and #18 document the completed suites under `server/tests/lab-01`, `server/tests/lab-02`, `client/tests/lab-02`, and `e2e/lab-02`; `docs/lab-02/tests.md` records 173 passing tests and responsive screenshots. | Keep the Lab 2 suites green as regression coverage, add the required Lab 3 paths, and do not claim migration/auth/workflow behavior without new evidence. |
| Known limitations | Lab 2 explicitly excludes authentication, passwords, sessions, roles, IT Staff workflow, comments/notes, status progression, and administration (`docs/lab-02/specification.md`, Issues #11–#18). | These are deliberate Lab 3 additions, not existing capabilities. Migration and first-login behavior must be tested from a clean database rather than relying on the old selector. |

## Appendix C. Issue 1 Review Notes

An AI pre-implementation consistency review on 2026-09-10 checked that the role matrix, status matrix, session/password decisions, queue query rules, resolution indication, API paths, UI state matrix, and planned test paths use the same terminology and error behavior. No unresolved contradiction was found. Issue 7 owns the later human peer review in `docs/lab-03/reviewer.md` and the AI-use record in `docs/lab-03/ai-use.md`; those files are intentionally created during release integration after implementation evidence exists.

## Appendix D. Traceability by GitHub Issue

| Issue | Branch | Responsibility |
|---|---|---|
| Lab 3-1 | `lab3-1-engineering-contract` | This contract and traceability documents |
| Lab 3-2 | `lab3-2-auth-foundation` | User schema, migration, seed, password, session, login |
| Lab 3-3 | `lab3-3-authorization-requester` | Backend guards, shell, authenticated Requester regression, resolution action |
| Lab 3-4 | `lab3-4-staff-ticket-workflow` | Queue, Staff detail, owner/priority/status, comments/notes |
| Lab 3-5 | `lab3-5-admin-user-management` | Administrator user management and safety rules |
| Lab 3-6 | `lab3-6-verification-qa` | Cross-cutting tests, security, migration, visual and accessibility evidence |
| Lab 3-7 | `lab3-7-integration-submission` | Review, staged integration, final documentation, and PDF submission |

## Appendix E. AI Coding-Agent Rules

Read all four Lab 3 contract documents before editing code. Work only within the assigned issue and branch, call out any ambiguity before inventing behavior, preserve existing user changes, report changed files/commands/AC/test evidence, and never report completion while required tests are missing, skipped, focused-only, flaky, or unverified. The student must inspect migrations, dependencies, failure cases, and final diffs before approval.
