# Lab 3 Sprint Engineering Specification

**Status:** Engineering contract for implementation (Issue 1)  
**Baseline:** Lab 2 requester ticketing MVP  
**Source of truth:** This document, [`api-spec.md`](./api-spec.md), [`ui-spec.md`](./ui-spec.md), and [`tests.md`](./tests.md)

## 1. Sprint goal

Replace the Lab 2 development requester selector with authenticated users and deliver a role-aware IT support workflow. Requesters retain the Lab 2 ticket and attachment experience, IT Staff can process tickets collaboratively, and Administrators can manage user accounts with safe, read-only ticket oversight.

## 2. Stakeholders and roles

| Role | Purpose | Ticket access | User-management access |
|---|---|---|---|
| Requester | Create and follow up on personal support requests | Own tickets, attachments, public comments, and the “Problem Appears Resolved” indication | None |
| IT Staff | Operate the support queue and resolve tickets | Queue and detail for all tickets; owner, IT priority, status, public comments, and internal notes | None |
| Administrator | Maintain accounts and audit ticket information | Read-only queue/detail, attachments, comments, notes, and resolution indication | Full scoped user management |

Administrator is not implicitly an IT Staff operator. The authorization matrix below is the binding rule for every screen and endpoint.

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

## 4. Functional requirements

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

## 5. Business rules

### Authentication and account rules

- **BR-01:** Email is trimmed, lower-cased, and unique in the database. Names are trimmed; the canonical email is returned consistently.
- **BR-02:** Passwords are 12–128 characters, contain at least three of uppercase/lowercase/digit/special, and contain no whitespace/control character. The rule is shared by login, first change, and Administrator reset.
- **BR-03:** Passwords use Node `crypto.scrypt` with `N=32768`, `r=8`, `p=1`, a random 16-byte salt, a 32-byte derived key, an encoded stored value, asynchronous execution, and constant-time comparison.
- **BR-04:** A session uses an opaque random token stored only as a hash server-side and is sent as `tt_session` with `HttpOnly`, `SameSite=Lax`, `Secure` in production, and an eight-hour expiry. It is never stored in localStorage.
- **BR-05:** Login attempts are keyed by normalized email plus a privacy-preserving HMAC of client IP. Five failures in 15 minutes start a 15-minute cooldown. Invalid credentials and inactive accounts use the same safe response.
- **BR-06:** Logout invalidates only the current session. Password change, Administrator reset, and deactivation revoke all sessions for that user.
- **BR-07:** An authenticated user is identified only by the session. The client cannot select or override a requester identity.

### Data and migration rules

- **BR-08:** `RequesterUser` evolves to `User`; existing IDs, ticket ownership, attachments, reference data, and timestamps are preserved. Existing users become active/inactive Requesters according to the existing value.
- **BR-09:** Seed is idempotent. Local development uses `SEED_INITIAL_PASSWORD` from an uncommitted `.env`; it is hashed before insertion, never returned, logged, emailed, or committed. Existing password hashes are not overwritten.
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

## 6. Authorization matrix

| Resource/operation | Requester | IT Staff | Administrator | Unauthenticated |
|---|---:|---:|---:|---:|
| Public health/root, login | Read | Read | Read | Read |
| Logout, current user, change password | Own session | Own session | Own session | 401 |
| Categories/related systems | Read | Read | Read | 401 for app use |
| Create/list/detail own tickets | Own only | 403 | Read-only all | 401 |
| Own attachments/comments/resolution | Own only | 403 for Requester mutation | Read-only all | 401 |
| Staff queue/detail | 403 | Read/write per workflow | Read-only | 401 |
| Owner, IT Priority, formal status | 403 | Allowed by workflow | 403 | 401 |
| Public Comments | Own ticket | All tickets | Read all | 401 |
| Internal Notes | 403 | Read/write all | Read all | 401 |
| User Management | 403 | 403 | Full scoped operations | 401 |

For a protected resource owned by another Requester, the API returns a safe `404` rather than confirming that the resource exists. A valid session with the wrong role receives `403`; no session receives `401`. UI guards improve navigation only; backend checks are authoritative.

## 7. Data model changes

- Rename/evolve `RequesterUser` to `User`; add `role`, `isActive`, `passwordHash`, `mustChangePassword`, `createdAt`, and `updatedAt`.
- Add `UserSession` (token hash, user, expiry, created/revoked timestamps) and `LoginAttempt` (normalized email, HMAC IP key, failure count/window/cooldown).
- Extend `Ticket` with optional `ownerId`, `itPriority`, workflow fields required by the Staff detail, and nullable `problemAppearsResolvedAt`.
- Add `PublicComment` and `InternalNote` with ticket, author, plain-text content, and server timestamps.
- Preserve all Lab 2 Category, RelatedSystem, Ticket, and Attachment records and relations.

## 8. API and UI contracts

The exact REST paths, payloads, error contract, status codes, query rules, and authentication behavior are in [`api-spec.md`](./api-spec.md). Screen state, responsive layout, Zen Green tokens, and accessibility behavior are in [`ui-spec.md`](./ui-spec.md). Every acceptance criterion is mapped to a planned test path in [`tests.md`](./tests.md).

## 9. Acceptance criteria

- **AC-01:** Clean migration preserves Lab 2 tickets, attachments, categories, related systems, IDs, and requester ownership.
- **AC-02:** Idempotent seed creates the required active/inactive Requesters, IT Staff, and Administrator without duplicate rows or plaintext credentials.
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

## 10. Definition of done

The four contract documents agree; every protected operation has a role rule; every AC has a planned test; implementation issues reference this contract; tests report real pass/fail/skip totals; evidence paths are recorded for the submission PDF; and the student reviews and approves AI-assisted changes.

## 11. Issue 1 review notes

An AI pre-implementation consistency review on 2026-09-10 checked that the role matrix, status matrix, session/password decisions, queue query rules, resolution indication, API paths, UI state matrix, and planned test paths use the same terminology and error behavior. No unresolved contradiction was found. Issue 7 owns the later human peer review in `docs/lab-03/reviewer.md` and the AI-use record in `docs/lab-03/ai-use.md`; those files are intentionally created during release integration after implementation evidence exists.

## 12. Traceability by GitHub issue

| Issue | Branch | Responsibility |
|---|---|---|
| Lab 3-1 | `lab3-1-engineering-contract` | This contract and traceability documents |
| Lab 3-2 | `lab3-2-auth-foundation` | User schema, migration, seed, password, session, login |
| Lab 3-3 | `lab3-3-authorization-requester` | Backend guards, shell, authenticated Requester regression, resolution action |
| Lab 3-4 | `lab3-4-staff-ticket-workflow` | Queue, Staff detail, owner/priority/status, comments/notes |
| Lab 3-5 | `lab3-5-admin-user-management` | Administrator user management and safety rules |
| Lab 3-6 | `lab3-6-verification-qa` | Cross-cutting tests, security, migration, visual and accessibility evidence |
| Lab 3-7 | `lab3-7-integration-submission` | Review, staged integration, final documentation, and PDF submission |

## 13. AI coding-agent rules

Read all four Lab 3 contract documents before editing code. Work only within the assigned issue and branch, call out any ambiguity before inventing behavior, preserve existing user changes, report changed files/commands/AC/test evidence, and never report completion while required tests are missing, skipped, focused-only, flaky, or unverified. The student must inspect migrations, dependencies, failure cases, and final diffs before approval.
