# PR #50 Review Response

PR: [#50](https://github.com/YummieGG/toktickit/pull/50)
Issue: [#43](https://github.com/YummieGG/toktickit/issues/43)

Thank you for the review. I independently checked each finding against the
Issue #43 acceptance criteria, the Lab 3 specification documents, and the
Security Guard requirements. All four findings were valid defects or evidence
gaps, and they have now been addressed.

## 1. Windows migration/seed runner

Fixed `server/tests/lab-03/migration-seed.integration.test.ts` so the test
invokes Node directly with `node_modules/tsx/dist/cli.mjs` instead of passing
the POSIX `.bin/tsx` launcher to `execFile`. This keeps the clean migration and
seed evidence runnable on Windows as required by the verification contract.

## 2. Badge contrast and Lab 2 baseline

The MEDIUM priority badge now uses `#7A4B00` and HIGH uses `#8A2E00`, keeping
the priority styles visually distinct while meeting the 4.5:1 contrast target.
The shared Lab 2 UI specification and badge test were updated to describe and
verify the accessible colors. Lab 2 tests remain green.

This is a presentation/accessibility fix only; it does not change any
authentication, authorization, ownership, or other Security Guard behavior.

## 3. Authentication responsive and failure-state evidence

Added Playwright coverage for Login and Change Password at 1280 px, 768 px,
and 375 px. The checks cover horizontal overflow, explicit labels, visible
keyboard focus, and 44 px mobile targets. Added screenshots for:

- Login at all required viewports
- Change Password at all required viewports
- Invalid-credentials feedback
- Login cooldown feedback

The paths are documented in `docs/lab-03/visual-checklist.md`.

## 4. Verification report conventions

Updated the final status column in `docs/lab-03/tests.md` to use the documented
`Verified (2026-09-16)` convention and recorded the E2E file count alongside
the result: 3 files, 19 passed, 0 failed, and 0 skipped.

## Verification result

- Server tests: 22 files, 266 passed, 0 failed, 0 skipped
- Client tests: 13 files, 98 passed, 0 failed, 0 skipped
- PostgreSQL integration tests: 2 files, 8 passed, 0 failed, 0 skipped
- Playwright Lab 3 E2E: 3 files, 19 passed, 0 failed, 0 skipped
- Server build passed
- Client build passed
- Client lint passed
- No focused-only or skipped tests found

The backend Security Guards remain authoritative and unchanged. Existing
direct-API, role-bypass, ownership-bypass, `requesterId` tampering, CSRF Origin,
session revocation, and Internal Note leakage coverage continues to pass.

Please re-review the updated changes.
