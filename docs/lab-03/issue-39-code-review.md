# Issue #39 Code Review and Agent Remediation Brief

## Review metadata

- Repository: `YummieGG/toktickit`
- Branch: `lab3-2-auth-foundation`
- Fixed point: `lab3-staging`
- Reviewed commit: `2040fcb064c66ca3fe1fe8692a561b163dfb2f3b` (`feat(auth): implement issue #39 foundation`)
- Review date: 2026-09-10
- Scope: Git diff `lab3-staging...HEAD`, compared with GitHub Issue #39 and the Lab 3 contract in `docs/lab-03/`

## Verdict

Issue #39 is **partially implemented and is not ready to be marked complete**. The main auth foundation exists: the `User`/session/login-attempt schema, scrypt hashing, cookie session, login/logout/me/change-password endpoints, seed users, and focused tests are present. However, several acceptance criteria are only partial, and the current implementation has security/correctness gaps around concurrent login throttling, canonical-email invariants, first-login enforcement, password-change invariants, and test coverage.

The review intentionally does **not** require Issue #40+ work such as removing the legacy requester selector, implementing the full role matrix, or building Staff/Admin workflows.

## Evidence already verified

- Server tests: `13` files, `121` tests passed.
- Server build: passed.
- Client tests: `9` files, `64` tests passed.
- Client build: passed.
- Client lint: exit `0`; only existing `react(only-export-components)` warnings were reported.
- `git diff --check lab3-staging...HEAD`: clean.
- A clean PostgreSQL migration/seed run was **not verified** because Docker could not start the compose database: the existing stopped container already owns `/toktickit-postgres`. Do not claim clean-DB verification until it has actually been run.

## Standards

No hard documented-standard breach was found. `README.md` documents setup/testing behavior rather than detailed coding conventions, and the client README only describes optional Oxlint configuration.

Maintainability smells found:

- **Duplicated Code:** client password-policy logic is duplicated in `client/src/pages/Login.tsx:13-20` and `client/src/pages/ChangePassword.tsx:7-14`. Extract shared client constants/validation.
- **Duplicated Code:** the Prisma user selection is repeated in `server/src/routes/auth.ts:63-73` and `server/src/routes/auth.ts:130-140`. Extract one shared selection object/helper.
- **Possible Middle Man / Speculative Generality:** `server/src/lib/user-delegate.ts:13-21` mostly forwards between `prisma.user` and the obsolete `requesterUser` path. Remove it after old mocks/tests no longer need compatibility, or document why it must remain temporarily.

These are quality findings, not reasons to expand Issue #39 into later workflow features.

## Spec

The spec review found these partial criteria:

- **AC-04 partial:** the migration normalizes existing emails, but the exact unique index alone still permits future mixed-case/whitespace variants unless every writer canonicalizes them. Evidence: `server/prisma/migrations/20260910000000_lab3_auth_foundation/migration.sql:34-44`, `server/prisma/schema.prisma:27-34`.
- **AC-08 incorrect under concurrency:** failed-login state is read, computed, and upserted in separate operations, so concurrent failures can overwrite one another and fail to trigger the fifth-attempt cooldown. Evidence: `server/src/lib/auth.ts:148-175`.
- **AC-09 partial:** logout and password change revoke sessions, but password-reset/deactivation revocation is not present. Those actions are owned by the later Admin issue, so do not implement the complete Admin workflow in this branch; keep the dependency explicit.
- **AC-11 partial:** a normal login only displays `Signed in successfully`; it does not navigate to the application shell. Only the mandatory-password-change path navigates. Evidence: `client/src/pages/Login.tsx:51-55` and `docs/lab-03/ui-spec.md:61-64`.
- **AC-12 partial:** tests do not cover expired/revoked sessions, multiple-session behavior where logout revokes only the current session, or a real PostgreSQL migration/seed run. Evidence: `server/tests/lab-03/auth.api.test.ts:117-160`, `server/tests/lab-03/migration-seed.api.test.ts:10-28`, and `docs/lab-03/tests.md:12-15`.

No material runtime scope creep was found. The legacy requester selector and later role/workflow features remain deferred as documented.

## Required remediation findings

### R1 — High — make login throttling concurrency-safe

`recordFailedLogin()` performs a non-atomic read/compute/upsert sequence. Parallel invalid logins for the same normalized email and HMAC IP can lose increments, so the required “5 failures in 15 minutes causes a 15-minute cooldown” rule is not reliable.

Files: `server/src/lib/auth.ts:148-175`.

Fix the persistence operation using a PostgreSQL-safe transaction/row lock or an equivalent atomic upsert strategy. Preserve the existing privacy properties: normalized email, HMAC IP, no raw IP persistence, and indistinguishable invalid/inactive-account responses. Add an API test that exercises concurrent failures and verifies the fifth failure activates the cooldown.

### R2 — High — enforce the canonical-email invariant

The migration lowercases/trims existing rows and then creates an exact unique index. That does not itself prevent a later writer from inserting a noncanonical value. Also, if legacy data contains two values that canonicalize to the same email, the bulk update can fail before the new invariant is established.

Files: `server/prisma/migrations/20260910000000_lab3_auth_foundation/migration.sql:34-44`, `server/prisma/schema.prisma:27-34`, `server/src/lib/auth.ts:17-22`.

Make the invariant explicit and testable. Prefer a database-enforced canonical check plus application canonicalization, or a canonical unique index that is compatible with the Prisma model. Handle/report canonical collisions deterministically instead of silently merging users. Add migration/API tests for whitespace, case variants, and collision behavior. Do not destroy or merge existing Ticket ownership.

### R3 — High — complete first-login and normal-login routing behavior

Normal login succeeds but leaves the user on Login with only a success message. Mandatory-password-change behavior is currently mostly client-side; a direct visit/API call can bypass the intended UI gate.

Files: `client/src/pages/Login.tsx:51-55`, `client/src/contexts/AuthContext.tsx:61-100`, `server/src/middleware/auth.ts`, `docs/lab-03/ui-spec.md:45-64`.

After a successful ordinary login, navigate to the existing shell/root route. For a user with `mustChangePassword`, keep the dedicated change-password route and prevent normal application access until the password is changed. Add the smallest server/client guard needed for this Issue #39 contract; do not remove the requester selector or implement the full Issue #40 role authorization matrix.

### R4 — High — enforce password-change invariants on the API

The client checks confirmation, but the API currently accepts only `newPassword` and does not enforce confirmation server-side. The implementation also does not reject reuse of the current password, while `PASSWORD-01` requires no reuse.

Files: `server/src/routes/auth.ts:114-167`, `client/src/contexts/AuthContext.tsx:132-147`, `client/src/pages/ChangePassword.tsx`.

Add the required confirmation field to the API contract and validate it server-side. Verify the new password is different from the current password. Keep the existing 12–128 length, 3-of-4 class, whitespace/control-character, async scrypt, and constant-time verification requirements. Update API/UI tests and `docs/lab-03/api-spec.md` together.

### R5 — Medium — expand security/session tests

Add tests for:

1. expired session and revoked session returning the safe unauthenticated response;
2. two simultaneous sessions where logout revokes only the current session;
3. password change revoking all sessions and requiring a fresh login;
4. inactive users and unknown users producing the same externally observable login failure;
5. cooldown expiry and concurrent failed attempts;
6. first-login routing and direct access to the normal shell while `mustChangePassword` is true;
7. no password hash, raw session token, raw IP, or initial plaintext password appearing in response/log output.

If PostgreSQL is unavailable, leave the test marked as unverified rather than replacing it with source-text assertions and claiming database coverage.

### R6 — Medium — remove unsafe secret fallback and add bounded cleanup

`server/src/lib/auth.ts:47-54` falls back to a hard-coded IP-HMAC secret outside production. Require an explicitly configured secret for any deployment-like environment; keep a test-only value in the test setup if needed. Do not print secrets. Add bounded cleanup for expired/revoked sessions and stale login-attempt records if that is part of the existing contract, without making cleanup block login.

## Plan-level follow-ups — do not silently pull into this Issue #39 fix

These items are relevant to the wider Lab 3 plan but belong to later issue boundaries unless the issue owner explicitly changes scope:

- Admin password reset and deactivation, including revoking all sessions: Issue #42.
- Requester/Staff/Admin backend authorization and removal of the legacy selector: Issue #40.
- Ticket status transitions, Staff queue/detail, comments, notes, attachments, and resolution timestamp: Issue #41.
- Full verification evidence and rendered submission artifacts: Issues #43-#44.
- The current seed creates reference data and users but no realistic Ticket/comment/note fixtures. Either add those under the issue that owns deterministic demo fixtures, or document the exact owner; do not mark the wider Lab 3 seed requirement complete by implication.

## Instructions for the fixing agent

1. Read this file, `docs/lab-03/specification.md`, `docs/lab-03/api-spec.md`, `docs/lab-03/ui-spec.md`, `docs/lab-03/tests.md`, and GitHub Issue #39 before editing.
2. Work only on the Issue #39 auth-foundation boundary. Do not implement Issue #40+ workflows or role authorization.
3. Fix R1–R4 first, then add the R5 tests and address R6 where it does not conflict with the repository’s local-test setup.
4. Preserve Lab 2 Ticket, Attachment, Category, and RelatedSystem IDs and ownership during migration. Never reset, truncate, or merge production-like data to make tests pass.
5. Update the API/UI contract docs whenever a request/response or navigation behavior changes. Keep deferred ownership explicit.
6. Run and record:

   ```bash
   cd toktickit/server && npm test && npm run build
   cd ../client && npm test && npm run build && npm run lint
   git diff --check lab3-staging...HEAD
   ```

7. Run the real migration and idempotent seed against a disposable PostgreSQL database when available. Record the command, schema result, row counts, and the second seed run. Do not claim this verification if Docker/database setup is blocked.
8. Before handoff, report changed files, tests run, known limitations, and confirm that no PR was opened and no merge was performed.

## Completion checklist

- [ ] R1 concurrency-safe throttling implemented and tested.
- [ ] R2 canonical-email invariant and collision behavior implemented and tested.
- [ ] R3 ordinary-login navigation and mandatory-change gate verified.
- [ ] R4 server-side password confirmation and no-reuse implemented and tested.
- [ ] R5 session/security boundary tests added.
- [ ] R6 secret fallback/cleanup reviewed without leaking sensitive data.
- [ ] Contract docs match the implementation.
- [ ] Server/client tests and builds pass.
- [ ] Real PostgreSQL migration/seed verification is recorded, or explicitly marked blocked.
- [ ] No Issue #40+ implementation was pulled into this branch.
