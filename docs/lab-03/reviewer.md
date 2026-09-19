# Lab 3 Peer Review Record

## Author
- **Name**: Worawut Sereethai
- **Student ID**: 67070501040
- **GitHub**: [@YummieGG](https://github.com/YummieGG)

## Peer Reviewer
- **Name**: Chanon Lhumsa-ard
- **Student ID**: 67070501059
- **GitHub**: [@Snnn3](https://github.com/Snnn3)

---

## Pull Requests Authored (All Merged into `lab3-staging`)

| PR # | Title | Branch | Status | Reviewer | Verdict |
|:---|:---|:---|:---|:---|:---|
| [#45](https://github.com/YummieGG/toktickit/pull/45) | Lab3 1 engineering contract and remove unrelated PR-24 files | `lab3-1-engineering-contract` | Merged | [@Snnn3](https://github.com/Snnn3) | Approved |
| [#46](https://github.com/YummieGG/toktickit/pull/46) | feat(auth): implement authentication foundation, security controls, and safe session handling | `lab3-2-auth-foundation` | Merged | [@Snnn3](https://github.com/Snnn3) | Approved |
| [#47](https://github.com/YummieGG/toktickit/pull/47) | feat(authz): implement authorization, app shell, and requester regression (#40) | `lab3-3-authorization-requester` | Merged | [@Snnn3](https://github.com/Snnn3) | Approved |
| [#48](https://github.com/YummieGG/toktickit/pull/48) | feat(staff): implement ticket queue and workflow | `lab3-4-staff-ticket-workflow` | Merged | [@Snnn3](https://github.com/Snnn3) | Approved |
| [#49](https://github.com/YummieGG/toktickit/pull/49) | feat(admin): add scoped Administrator user management | `lab3-5-admin-user-management` | Merged | [@Snnn3](https://github.com/Snnn3) | Approved |
| [#50](https://github.com/YummieGG/toktickit/pull/50) | test(lab-03): complete Issue 43 QA verification and test suite | `lab3-6-verification-qa` | Merged | [@Snnn3](https://github.com/Snnn3) | Changes Requested → Approved |
| [#53](https://github.com/YummieGG/toktickit/pull/53) | test(lab-03): complete staged integration verification evidence | `lab3-7-integration-submission` | Merged | [@Snnn3](https://github.com/Snnn3) | Changes Requested → Approved |

---

## Detailed Peer Review Records & Responses

### PR #45: Lab 3-1 Engineering Contract Baseline

- **Target PR**: [YummieGG/toktickit#45](https://github.com/YummieGG/toktickit/pull/45) (Closes [#38](https://github.com/YummieGG/toktickit/issues/38))
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Merge Commit**: `d6e262a`

#### Reviewer Feedback (@Snnn3)
> **Verdict: Approved**
> Comprehensive review against the CPE 334 Lab 3 handout. All four engineering contract documents (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) are complete and consistent. Security controls, business rules (BR-01 to BR-21), status transition matrix, and test traceability table (AC-01 to AC-14) meet all Lab 3 Spec DD and Test DD criteria.

#### Author Response (@YummieGG)
> Thanks you kub. Baseline established for subsequent implementation issues.

---

### PR #46: Lab 3-2 Authentication Foundation & Session Handling

- **Target PR**: [YummieGG/toktickit#46](https://github.com/YummieGG/toktickit/pull/46) (Closes [#39](https://github.com/YummieGG/toktickit/issues/39))
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Merge Commit**: `cd9dbcf`

#### Reviewer Feedback (@Snnn3)
> **Verdict: Approved**
> Outstanding work on this PR, @YummieGG! The authentication foundation and security hardening are thoroughly designed and meet all requirements from the Lab 3 handout and our engineering contract.

#### Author Response (@YummieGG)
> Thanks youuuuu. Password hashing with Argon2id, opaque server-side session token hashing, `tt_session` HttpOnly/SameSite cookie, normalized email + IP rate limiting, mandatory password change gating, and safe error codes are fully in place.

---

### PR #47: Lab 3-3 Authorization, App Shell & Requester Regression

- **Target PR**: [YummieGG/toktickit#47](https://github.com/YummieGG/toktickit/pull/47) (Closes [#40](https://github.com/YummieGG/toktickit/issues/40))
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Merge Commit**: `393a551`

#### Reviewer Feedback (@Snnn3)
> **Verdict: Approved**
> Great job on this PR! The transition from the development requester selector to authentic session-based identity and RBAC is clean, secure, and fully compliant with the Lab 3 handout.
> - **Session Identity Enforcement**: Successfully removed `RequesterSelect` and client `requesterId` context; ownership is strictly derived from authenticated session.
> - **Fail-Closed & Anti-Enumeration Security**: Queries use fail-closed scoping (`{ id: -1 }`), and cross-tenant resource reads return safe `404 Not Found` without information leakage.
> - **Comments & Resolution Indication**: `PublicComment` persistence and idempotent `problem-appears-resolved` timestamps work as specified.
> - **Attachment Policies**: Scoped download access enforced (`403` for Administrator).
> - **Verification**: Server Tests: 130/130 passed, Client Tests: 76/76 passed, Build & Lint clean.

#### Author Response (@YummieGG)
> ty kub. Extracted `contexts/auth.ts` to clear Oxlint fast-refresh warnings, removed obsolete delegates, and verified full Lab 2 Requester regression.

---

### PR #48: Lab 3-4 IT Staff Ticket Queue & Workflow

- **Target PR**: [YummieGG/toktickit#48](https://github.com/YummieGG/toktickit/pull/48) (Closes [#41](https://github.com/YummieGG/toktickit/issues/41))
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Merge Commit**: `a739818`

#### Reviewer Feedback (@Snnn3)
> **Verdict: Approved**
> - Complete 8-state ticket lifecycle with confirmation prompts and `409 Conflict` concurrency protection.
> - Multi-criteria staff queue search, filtering, and deterministic pagination.
> - Independent IT Priority triage and active owner assignment.
> - Role-scoped Internal Notes (zero leakage to Requesters) and read-only Admin policy.
> - Responsive Zen Green UI (desktop table + mobile cards).
> - Verification: Server 255/255 passed | Client 87/87 passed | Lint: 0 warnings/errors | Builds: Clean.

#### Author Response (@YummieGG)
> thank you. Concurrency conflict detection via `updatedAt` and optimistic locking ensures staff members do not overwrite simultaneous changes.

---

### PR #49: Lab 3-5 Administrator Scoped User Management

- **Target PR**: [YummieGG/toktickit#49](https://github.com/YummieGG/toktickit/pull/49) (Closes [#42](https://github.com/YummieGG/toktickit/issues/42))
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Merge Commit**: `4b63897`

#### Reviewer Feedback (@Snnn3)
> **Verdict: Approved**
> Great work implementing Issue #42! Role authorization, account safety rules (BR-10, BR-11), transactional ticket unassignment, and password/session revocation are solidly handled and well-tested.

#### Author Response (@YummieGG)
> thanks very you much. Enforced critical safety invariants: preventing self-deactivation, preventing removing or deactivating the last active Administrator, transactional unassignment of claimed tickets upon Staff deactivation, and immediate session revocation upon role/status changes.

---

### PR #50: Lab 3-6 Full Verification, Security & Visual QA

- **Target PR**: [YummieGG/toktickit#50](https://github.com/YummieGG/toktickit/pull/50) (Closes [#43](https://github.com/YummieGG/toktickit/issues/43))
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Merge Commit**: `0ea1f8f`

#### Initial Review Feedback (@Snnn3)
> **Verdict: Changes Requested**
> 1. **Windows Spawning Bug**: `execFile(resolve(process.cwd(), 'node_modules/.bin/tsx'), ...)` in `migration-seed.integration.test.ts` fails on Windows with `ENOENT`. Use `process.execPath` with `tsx/dist/cli.mjs`.
> 2. **Badge Contrast & Visual Distinction**: Setting both `MEDIUM` and `HIGH` badge text to `#8A2E00` removes visual distinction. Use distinct accessible colors meeting WCAG AA (≥ 4.5:1).
> 3. **Missing Multi-Viewport Auth Evidence**: Extend multi-viewport E2E checks in `authentication.spec.ts` (1280, 768, 375 px) and capture screenshots for `/login` and `/change-password`.
> 4. **Documentation Conventions**: Align Table 3.1 in `tests.md` with the documented `Verified (2026-09-16)` status and record explicit test-file counts.

#### Author Response & Remediation (@YummieGG)
> Addressed all four points in commits `8265b42` and `f8c0132`:
> 1. Replaced shell wrapper with `process.execPath` and resolved path to `tsx/dist/cli.mjs` for cross-platform Windows compatibility.
> 2. Configured `#7A4B00` (Amber) for `MEDIUM` priority and `#8A2E00` (Orange) for `HIGH` priority, satisfying WCAG AA while providing distinct colors.
> 3. Added responsive viewport tests (1280px, 768px, 375px) across `/login` and `/change-password`, refreshing screenshots in `artifacts/lab-03/screenshots/authentication/`.
> 4. Aligned test reporting conventions in `tests.md` and added legacy timestamp preservation in `seed.ts`.

#### Re-Review Outcome (@Snnn3)
> **Verdict: Approved**
> All findings resolved cleanly. Clean test results across 22 server files (266 passed), 13 client files (98 passed), 2 integration files (8 passed), and 3 Playwright files (19 passed).

---

### PR #53: Lab 3-7 Staged Integration Verification Evidence

- **Target PR**: [YummieGG/toktickit#53](https://github.com/YummieGG/toktickit/pull/53) (Closes [#44](https://github.com/YummieGG/toktickit/issues/44))
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Merge Commit**: `bf5a97f`

#### Initial Review Feedback (@Snnn3)
> **Verdict: Changes Requested**
> 1. **Cross-Platform Windows Failure in `webServer.command`**: `e2e/playwright.live.config.ts` uses inline POSIX assignments (`APP_ORIGIN=... PORT=3000`) which fail on Windows `cmd.exe`. Use Playwright's `env` configuration object.
> 2. **Verification Report Alignment**: Section 7 in `tests.md` claimed the live E2E exercised cross-owner access and note leakage, which are authoritatively tested in server API suites rather than the single live E2E test.
> 3. **Missing Reporting Contract Sections**: Section 7 omitted the mandatory `### Known limitations` section and explicit link to `visual-checklist.md`.
> 4. **Code Smell**: Message chains in `e2e/lab-03/live-integration.spec.ts` assertions (`(await mutation.json()).error.code`).

#### Author Response & Remediation (@YummieGG)
> Addressed all findings across 3 clean, isolated commits:
> 1. `1ef538b`: Moved environment variables to Playwright's `webServer.env` object and added `--port 5173 --strictPort` to the Vite command.
> 2. `27d7c44`: Extracted response bodies into typed local variables in `live-integration.spec.ts` to eliminate chained await calls.
> 3. `6761100`: Aligned Section 7 claims with actual live test boundaries, added `### Screenshot evidence` link to `visual-checklist.md`, added `### Known limitations`, and unified Docker commands to `docker compose exec -T db`.

#### Re-Review Outcome (@Snnn3)
> **Verdict: Approved**
> All core verification criteria for Issue #44 verified green:
> - Server unit/API tests: 22 files, 266 passed
> - Client tests: 13 files, 98 passed
> - Mocked E2E tests: 3 files, 19 passed
> - Live integration E2E: 1 file, 1 passed
> - Production builds and lint: Passed cleanly
> - Cross-platform Playwright configuration verified
> Ready to merge into `lab3-staging`!
