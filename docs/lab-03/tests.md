# Lab 3 Test Plan and Traceability

This is the pre-implementation test contract for Issue 1. Feature issues may add focused tests, but the final repository must keep the paths and coverage below (or document an equivalent path). No test may be skipped, disabled, focused-only, flaky, or a placeholder at completion.

## 1. Test strategy

- **Server unit:** Vitest for password policy/hash, email canonicalization, login-attempt windows, status transitions, authorization decisions, and queue query parsing.
- **Server API/integration:** Supertest against PostgreSQL test data and mocked filesystem boundaries, covering migration/seed, authentication, ownership, role guards, workflow, comments/notes, resolution, and Administrator safety.
- **Client UI:** Vitest + React Testing Library for screen state matrices, form validation, route guards, response rendering, and accessibility labels.
- **E2E:** Playwright Chromium for login/change-password, Requester regression, Staff workflow, Administrator management, cross-role denial, and responsive screenshots.
- **Security/regression:** Explicit direct-API, session, CSRF-Origin, requesterId-tampering, cross-owner, Internal Note leakage, and Lab 2 data-preservation cases.

## 2. Required repository paths

### Server

- `server/tests/lab-03/auth.api.test.ts`
- `server/tests/lab-03/authorization.api.test.ts`
- `server/tests/lab-03/staff-queue.api.test.ts`
- `server/tests/lab-03/staff-ticket-detail.api.test.ts`
- `server/tests/lab-03/comments-notes.api.test.ts`
- `server/tests/lab-03/users-admin.api.test.ts`
- Additional unit suites may live beside the relevant server module.

### Client

- `client/tests/lab-03/Login.test.tsx`
- `client/tests/lab-03/ChangePassword.test.tsx`
- `client/tests/lab-03/StaffTicketQueue.test.tsx`
- `client/tests/lab-03/StaffTicketDetail.test.tsx`
- `client/tests/lab-03/UserManagement.test.tsx`
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

| AC | Planned evidence |
|---|---|
| AC-01 | Migration integration tests; Lab 2 API regression suites |
| AC-02 | Seed integration/idempotency tests and database count assertions |
| AC-03 | `auth.api.test.ts`, Login UI tests, `authentication.spec.ts` |
| AC-04 | Auth API and Change Password UI/E2E tests |
| AC-05 | Password policy/hash unit tests; auth API secret-redaction assertions |
| AC-06 | Existing Lab 2 tests plus `authorization.api.test.ts`, requester E2E |
| AC-07 | Resolution API/UI tests and Staff/Admin detail assertions |
| AC-08 | `staff-queue.api.test.ts`, `StaffTicketQueue.test.tsx`, staff E2E/responsive screenshots |
| AC-09 | `staff-ticket-detail.api.test.ts`, `StaffTicketDetail.test.tsx`, staff E2E |
| AC-10 | `comments-notes.api.test.ts`, detail UI tests, requester leakage E2E |
| AC-11 | `users-admin.api.test.ts`, `UserManagement.test.tsx`, `user-administration.spec.ts` |
| AC-12 | Authorization API tests, route-guard UI tests, cross-role E2E |
| AC-13 | All server/client/E2E commands and final test-result table in this file |
| AC-14 | Playwright 1280/768/375 checks, accessibility assertions, and screenshot paths above |

## 4. Minimum case matrix

### Authentication and security

- Valid active login; invalid password; unknown email; inactive account; five failures/cooldown boundary; cooldown expiry; logout; expired/revoked session; refresh bootstrap; mandatory password change; invalid password; secret redaction; invalid Origin; safe 401/403/404.
- Multiple sessions; current-session logout only; password change/reset/deactivation revokes all sessions; role/email changes are transactional.

### Authorization and Requester regression

- Requester cannot supply another `requesterId`, read another ticket, download/remove another attachment, view Internal Notes, or call Staff/Admin mutations.
- IT Staff can read queue/detail and write allowed workflow/comments/notes but cannot manage users.
- Administrator can read tickets/comments/notes/resolution but receives 403 for Staff mutations.
- Existing Lab 2 create/list/detail/attachment tests pass with session identity.

### Workflow and collaboration

- Every allowed and disallowed edge in the eight-state matrix; confirmation-required statuses; Reopened clearing resolution; owner active-role validation and unassignment transaction; separate Requested/IT Priority; append-only comments/notes; whitespace/length/newline rules; escaped rendering.

### Administrator safety

- Create/edit/search/role filter/activate/deactivate/initial reset; duplicate email; invalid role; self-deactivation; last active Administrator; reset forces next password change; owner role/deactivation unassigns tickets.

### UI and responsive behavior

- Initial/loading/validation/saving/success/failure/forbidden/not-found/empty/no-results states for every screen in [`ui-spec.md`](./ui-spec.md).
- Explicit labels and keyboard focus; contrast and non-color indicators; mobile target size; no clipping or horizontal overflow at all required viewports.

## 5. Test reporting contract

Final `tests.md` must record command, date/environment, test-file count, total/passed/failed/skipped counts, migration/seed result, build/lint result, screenshot evidence, and known limitations. Results must be copied from actual clean-setup output; never claim a pass without running the command.
