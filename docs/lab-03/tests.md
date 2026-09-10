# Lab 3 Test Plan and Traceability

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
- Additional unit suites may live beside the relevant server module.

### Client

- `client/tests/lab-03/Login.test.tsx`
- `client/tests/lab-03/ChangePassword.test.tsx`
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

| AC | Planned evidence | Implementation issue(s) |
|---|---|---|
| AC-01 | `migration-seed.api.test.ts` verifies schema migration, legacy-user mapping, ownership preservation, and password backfill; Lab 2 API regression suites | [#39](https://github.com/YummieGG/toktickit/issues/39), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-02 | `migration-seed.api.test.ts` verifies seed counts, idempotency, non-overwrite behavior, and secret handling | [#39](https://github.com/YummieGG/toktickit/issues/39), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-03 | `auth.api.test.ts`, Login UI tests, `authentication.spec.ts` | [#39](https://github.com/YummieGG/toktickit/issues/39), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-04 | Auth API and Change Password UI/E2E tests | [#39](https://github.com/YummieGG/toktickit/issues/39), [#40](https://github.com/YummieGG/toktickit/issues/40) |
| AC-05 | Password policy/hash unit tests; auth API secret-redaction assertions | [#39](https://github.com/YummieGG/toktickit/issues/39), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-06 | Existing Lab 2 tests plus `authorization.api.test.ts`, requester E2E | [#40](https://github.com/YummieGG/toktickit/issues/40), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-07 | Resolution API/UI tests and Staff/Admin detail assertions | [#40](https://github.com/YummieGG/toktickit/issues/40), [#41](https://github.com/YummieGG/toktickit/issues/41), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-08 | `staff-queue.api.test.ts`, `StaffTicketQueue.test.tsx`, staff E2E/responsive screenshots | [#41](https://github.com/YummieGG/toktickit/issues/41), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-09 | `staff-ticket-detail.api.test.ts`, `StaffTicketDetail.test.tsx`, staff E2E | [#41](https://github.com/YummieGG/toktickit/issues/41), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-10 | `comments-notes.api.test.ts`, detail UI tests, requester leakage E2E | [#41](https://github.com/YummieGG/toktickit/issues/41), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-11 | `users-admin.api.test.ts`, `UserManagement.test.tsx`, `user-administration.spec.ts` | [#42](https://github.com/YummieGG/toktickit/issues/42), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-12 | Authorization API tests, route-guard UI tests, cross-role E2E | [#40](https://github.com/YummieGG/toktickit/issues/40), [#41](https://github.com/YummieGG/toktickit/issues/41), [#42](https://github.com/YummieGG/toktickit/issues/42), [#43](https://github.com/YummieGG/toktickit/issues/43) |
| AC-13 | All server/client/E2E commands and final test-result table in this file | [#43](https://github.com/YummieGG/toktickit/issues/43), [#44](https://github.com/YummieGG/toktickit/issues/44) |
| AC-14 | `visual-style.test.tsx`, Playwright 1280/768/375 checks, accessibility assertions, and screenshot paths above | [#40](https://github.com/YummieGG/toktickit/issues/40), [#41](https://github.com/YummieGG/toktickit/issues/41), [#42](https://github.com/YummieGG/toktickit/issues/42), [#43](https://github.com/YummieGG/toktickit/issues/43) |

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
