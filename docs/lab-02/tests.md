# Lab 2 Test Plan and Results

## 1. Test strategy

- **Server unit/API:** Vitest + Supertest with mocked Prisma and filesystem boundaries.
- **Client UI:** Vitest + React Testing Library + jsdom with mocked HTTP responses.
- **E2E:** Playwright Chromium against the Vite UI flow with deterministic API fixtures.
- **Responsive/accessibility:** Playwright checks at 1280 px, 768 px, and 375 px for overflow, labels, keyboard focus, and mobile touch targets.
- **Visual evidence:** Playwright writes screenshots to the exact paths in `docs/lab-02/ui-spec.md`.

All test files are under `server/tests/lab-01`, `server/tests/lab-02`, `client/tests/lab-02`, and `e2e/lab-02`. There are no skipped, disabled, focused-only, todo, or placeholder tests.

## 2. Executed test matrix

| Matrix ID | Actual file | Evidence covered |
|---|---|---|
| S-01 | `server/tests/lab-01/health.test.ts` | Health endpoint contract |
| S-02 | `server/tests/lab-01/API-02.test.ts`, `server/tests/lab-02/categories.api.test.ts` | Active category filtering, response projection, and database failure |
| S-03 | `server/tests/lab-02/related-systems.api.test.ts` | Active related-system filtering, response projection, and database failure |
| S-04 | `server/tests/lab-02/requesters.api.test.ts` | Active requester filtering, alphabetical order, and database failure |
| S-05 | `server/tests/lab-02/ticket-number.unit.test.ts` | Advisory lock, zero-padding, monotonic generation, and values above 9999 |
| S-06 | `server/tests/lab-02/tickets.api.test.ts` | Create validation, all priority enums, boundaries, trimming, FK/activity checks, multipart type/size/count limits, rollback, and transaction retry |
| S-07 | `server/tests/lab-02/my-tickets.api.test.ts` | Ownership scoping, search, category/status/priority filters, sorting, invalid/valid query parameters, default/permitted pagination, and empty results |
| S-08 | `server/tests/lab-02/ticket-detail.api.test.ts` | Owned detail, optional related system, complete attachment metadata, not-found, invalid input, failure, and non-owner denial |
| S-09 | `server/tests/lab-02/attachments.api.test.ts` | Owned/non-owned upload, metadata, download, removal; MIME/size/count limits; exact removal boundaries; repeat removal; missing files; and post-removal download blocking |
| C-01 | `client/tests/lab-02/RequesterSelect.test.tsx` | Requester loading, selection, navigation, and failure |
| C-02 | `client/tests/lab-02/CreateTicket.test.tsx` | Form fields, validation, trimming, master-data loading, file validation, submission busy/success/failure, and data preservation |
| C-03 | `client/tests/lab-02/MyTickets.test.tsx` | Search, all filters, sorting, pagination, clear filters, empty/no-results, retry, and requester switching |
| C-04 | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Read-only detail, loading/failure/unauthorized states, upload/download/remove, all attachment states, and retry |
| C-05 | `client/tests/lab-02/Alert.test.tsx`, `Button.test.tsx`, `Badge.test.tsx` | Shared alert, button busy-state, priority/status badge, color, and accessibility behavior |
| E-01 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Selection → create → list/detail → attachment upload/download/remove → requester isolation |
| E-02 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Failed create preserves form values and renders a safe error |
| E-03 | `e2e/lab-02/requester-ticket-flow.spec.ts` | Desktop/tablet/mobile overflow, 44 px controls, explicit labels, and keyboard focus |

## 3. Acceptance-criterion traceability

| AC | Evidence | Result |
|---|---|---|
| AC-01 | S-04, C-01, E-01 | Verified |
| AC-02 | C-01, E-01 | Verified |
| AC-03 | S-02, S-03, C-02, E-01 | Verified |
| AC-04 | S-06, C-02, E-01 | Verified |
| AC-05 | S-06, C-02, E-01 | Verified |
| AC-06 | S-07, C-03, E-01 | Verified |
| AC-07 | S-07, S-08, S-09, C-03, E-01 | Verified |
| AC-08 | S-07, S-08, S-09, C-04, E-01 | Verified |
| AC-09 | S-07, C-03, E-01 | Verified |
| AC-10 | S-07, C-03 | Verified |
| AC-11 | S-07, C-03 | Verified |
| AC-12 | S-07, C-03 | Verified |
| AC-13 | S-08, C-04, E-01 | Verified |
| AC-14 | S-09, C-04, E-01 | Verified |
| AC-15 | S-06, S-09, C-02, C-04 | Verified |
| AC-16 | S-06, S-09, C-02, C-04 | Verified |
| AC-17 | S-06, S-09, C-04 | Verified |
| AC-18 | S-09, C-04, E-01 | Verified |
| AC-19 | S-09, C-04, E-01 | Verified |
| AC-20 | S-09, C-04, E-01 | Verified |
| AC-21 | S-06, S-08, C-02, C-03, C-04, E-02 | Verified |
| AC-22 | S-07, C-03, E-01 | Verified |
| AC-23 | S-07, C-03, E-01 | Verified |
| AC-24 | E-03 and screenshots | Verified |

## 4. Functional/business-rule traceability

| Requirements | Evidence |
|---|---|
| FR-01, FR-02, FR-03 | S-04, C-01, E-01 |
| FR-04, FR-05, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11, FR-12, FR-13, FR-14 | S-02, S-03, S-05, S-06, C-02, E-01 |
| FR-15, FR-16, FR-17, FR-18, FR-19 | S-07, C-03, E-01, E-03 |
| FR-20, FR-21, FR-22, FR-23, FR-24, FR-25 | S-08, S-09, C-04, E-01 |
| BR-01, BR-02, BR-03, BR-04, BR-05 | S-04, S-05, S-06, C-01, E-01 |
| BR-06, BR-07 | S-07, S-08, S-09, C-03, C-04, E-01 |
| BR-08, BR-09, BR-10, BR-11, BR-12, BR-13 | S-06, S-09, C-02, C-04, E-01 |
| BR-14, BR-15, BR-16, BR-17, BR-18 | S-06, S-07, C-02, C-03 |
| BR-19, BR-20, BR-21, BR-22, BR-23, BR-24, BR-25 | S-06, S-07, C-02, C-03, E-02 |

## 5. Responsive and visual evidence

The E-03 test verifies `scrollWidth <= innerWidth` at all required viewports, explicit labels for every visible form control, keyboard focus visibility, and at least 44 px mobile controls. The following required screenshot paths are generated by E-01–E-03:

```text
artifacts/lab-02/screenshots/create-ticket/desktop-initial.png
artifacts/lab-02/screenshots/create-ticket/desktop-validation-error.png
artifacts/lab-02/screenshots/create-ticket/desktop-submitting.png
artifacts/lab-02/screenshots/create-ticket/desktop-success.png
artifacts/lab-02/screenshots/create-ticket/desktop-api-error.png
artifacts/lab-02/screenshots/create-ticket/tablet-layout.png
artifacts/lab-02/screenshots/create-ticket/mobile-layout.png
artifacts/lab-02/screenshots/my-tickets/desktop-list.png
artifacts/lab-02/screenshots/my-tickets/desktop-search-results.png
artifacts/lab-02/screenshots/my-tickets/desktop-empty.png
artifacts/lab-02/screenshots/my-tickets/desktop-no-results.png
artifacts/lab-02/screenshots/my-tickets/tablet-layout.png
artifacts/lab-02/screenshots/my-tickets/mobile-cards.png
artifacts/lab-02/screenshots/ticket-detail/desktop-detail.png
artifacts/lab-02/screenshots/ticket-detail/desktop-attachments.png
artifacts/lab-02/screenshots/ticket-detail/desktop-removed-attachment.png
artifacts/lab-02/screenshots/ticket-detail/tablet-layout.png
artifacts/lab-02/screenshots/ticket-detail/mobile-layout.png
```

## 6. Commands and final results

Environment: Windows, Node.js 24.14.0, PostgreSQL 15 in Docker, Playwright Chromium, run on 2026-09-06 (Asia/Bangkok).

```bash
cd server && npm test
cd server && npm run build
cd client && npm test
cd client && npm run build
cd client && npm run lint
cd e2e && npm test
```

| Suite | Test files | Total | Passed | Failed | Skipped |
|---|---:|---:|---:|---:|---:|
| Server API/unit | 10 | 111 | 111 | 0 | 0 |
| Client UI/component | 7 | 59 | 59 | 0 | 0 |
| Playwright E2E | 1 | 3 | 3 | 0 | 0 |
| **Total** | **18** | **173** | **173** | **0** | **0** |

Additional release checks: `npm run build` passes for server and client; `npx prisma migrate deploy` applies successfully; running `npx prisma db seed` twice produces the same five requesters, four categories, and six related systems without duplicate reference records; and `rg` confirms no skipped/focused/todo tests. The E2E API layer uses deterministic fixtures so it is repeatable without mutating a shared database.

## 7. Known limitations

- Authentication, roles, and IT Staff workflows are intentionally deferred to Lab 3 per the specification.
- The E2E suite validates the complete requester UI flow with API fixtures; server behavior is separately covered by the Supertest contract suites.
