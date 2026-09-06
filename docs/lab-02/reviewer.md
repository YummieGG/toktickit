# Lab 2 Peer Review Record

## Author
- **Name**: Worawut Sereethai
- **Student ID**: 67070501040
- **GitHub**: @YummieGG

## Peer Reviewer
- **Name**: CHANON LHUMSA-ARD
- **Student ID**: 67070501059
- **GitHub**: @Snnn3

## Pull Requests Authored

| PR # | Title | Branch | Status | Reviewer |
|------|-------|--------|--------|----------|
| [#19](https://github.com/YummieGG/toktickit/pull/19) | docs: Lab 2 Engineering Specification and Test Plan | `docs/lab2-specification` | Merged | @Snnn3 |
| [#20](https://github.com/YummieGG/toktickit/pull/20) | feat: implement database schema, migration, and seed data for Lab 2 | `feature/lab2-database` | Merged | @Snnn3 |
| [#21](https://github.com/YummieGG/toktickit/pull/21) | feat: implement requester context selection | `feature/lab2-3-requester-context` | Merged | @Snnn3 |
| [#22](https://github.com/YummieGG/toktickit/pull/22) | feat: implement create ticket form with validation and reusable ui | `feature/lab2-4-ticket-creation` | Merged | @Snnn3 |
| [#23](https://github.com/YummieGG/toktickit/pull/23) | feat(tickets): implement My Tickets paginated list API and responsive UI | `feature/lab2-5-my-tickets` | Merged | @Snnn3 |

## Pull Requests Reviewed

| PR # | Title | Author | Status | Key Comments |
|------|-------|--------|--------|--------------|
| [#25](https://github.com/Snnn3/TokTickIT/pull/25) | Lab2-1: Sprint engineering contract | @Snnn3 | Merged | Good job. The specifications are extremely clear and detailed, especially the expansion of the Business Rules covering all edge cases. The API and UI specs perfectly align with the Lab 02 requirements. Approved! |
| [#26](https://github.com/Snnn3/TokTickIT/pull/26) | Lab2-2: Prisma data increment and idempotent seed | @Snnn3 | Merged | LGTM! The code perfectly matches the spec and there are no outstanding issues. Passed. I will merge this PR right away. |
| [#27](https://github.com/Snnn3/TokTickIT/pull/27) | Lab2-3: Requester context, selection screen, and active requesters API (#24) | @Snnn3 | Merged | The implementation for the Development Requester selection screen and its context looks good! I've reviewed the code and everything meets the specifications. Outstanding job! Approved. |
| [#28](https://github.com/Snnn3/TokTickIT/pull/28) | Lab2-4: Create Ticket multipart API, validations, and Zen Green form (#18) | @Snnn3 | Merged | Great job! The implementation of ticket_number_seq within a database transaction is a very solid approach. The file upload validation rules (size, count, MIME types) and the UI states align perfectly with our specifications. Test coverage is also spot on. Looks great to me, Approved! |
| [#29](https://github.com/Snnn3/TokTickIT/pull/29) | Lab2-5: implement My Tickets list, filters, search, and pagination (#19) | @Snnn3 | Merged | Great job on this one! The API query validation is solid, and the 300ms debounce on the search input is a great UX touch. I also love how you separated the Empty state from the No-results state perfectly. Approved! |
| [#30](https://github.com/Snnn3/TokTickIT/pull/30) | Lab2-6: implement Ticket Detail and Attachment lifecycle (#20) | @Snnn3 | Merged | The read-only Ticket Detail layout perfectly adheres to the Zen Green design system and spec. The attachment lifecycle is robust, cleanly handling all 5 row states along with the soft-removal modal dialog. API security scoping, error handling, and status codes (403, 409, 410) are spot on. |
| [#31](https://github.com/Snnn3/TokTickIT/pull/31) | Lab2-7: Playwright E2E Flow and Responsive Visual Evidence (#21) | @Snnn3 | Merged | Excellent work! The Playwright E2E suite (E-01, E-02, R-01 & E-03) runs cleanly and covers the happy path, multi-requester isolation, and attachment lifecycles thoroughly. Responsive layouts and visual evidence screenshots are complete across all 3 viewports with zero horizontal scrolling. |

## Review Comments Given

### PR #25: Lab2-1: Sprint engineering contract
- **Target PR**: [Snnn3/TokTickIT#25](https://github.com/Snnn3/TokTickIT/pull/25)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My comment (@YummieGG)**:
  > Good job. The specifications are extremely clear and detailed, especially the expansion of the Business Rules covering all edge cases. The API and UI specs perfectly align with the Lab 02 requirements. Approved!
- **Partner's response (@Snnn3)**:
  > Thank you for the review and approval! Glad the expanded business rules and API/UI specs look clear and aligned with the Lab 02 criteria.

### PR #26: Lab2-2: Prisma data increment and idempotent seed
- **Target PR**: [Snnn3/TokTickIT#26](https://github.com/Snnn3/TokTickIT/pull/26)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My comment (@YummieGG)**:
  > LGTM! The code perfectly matches the spec and there are no outstanding issues. Passed. I will merge this PR right away.
- **Partner's response (@Snnn3)**:
  > Thank you! Really appreciate the review.

### PR #27: Lab2-3: Requester context, selection screen, and active requesters API (#24)
- **Target PR**: [Snnn3/TokTickIT#27](https://github.com/Snnn3/TokTickIT/pull/27)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My comment (@YummieGG)**:
  > The implementation for the Development Requester selection screen and its context looks good!  
  > I've reviewed the code and everything meets the specifications. Outstanding job! Approved.
- **Partner's response (@Snnn3)**:
  > Thank you for approved my PR.

### PR #28: Lab2-4: Create Ticket multipart API, validations, and Zen Green form (#18)
- **Target PR**: [Snnn3/TokTickIT#28](https://github.com/Snnn3/TokTickIT/pull/28)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My comment (@YummieGG)**:
  > Great job! The implementation of ticket_number_seq within a database transaction is a very solid approach. The file upload validation rules (size, count, MIME types) and the UI states align perfectly with our specifications. Test coverage is also spot on. Looks great to me, Approved!

### PR #29: Lab2-5: implement My Tickets list, filters, search, and pagination (#19)
- **Target PR**: [Snnn3/TokTickIT#29](https://github.com/Snnn3/TokTickIT/pull/29)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My comment (@YummieGG)**:
  > Great job on this one! The API query validation is solid, and the 300ms debounce on the search input is a great UX touch. I also love how you separated the Empty state from the No-results state perfectly. Approved!
- **Partner's response (@Snnn3)**:
  > Thank you for aproving and merging my PR.

### PR #30: Lab2-6: implement Ticket Detail and Attachment lifecycle (#20)
- **Target PR**: [Snnn3/TokTickIT#30](https://github.com/Snnn3/TokTickIT/pull/30)
- **Author**: @Snnn3
- **Verdict**: Approved (Changes Requested initially, then Approved)
- **My initial comment (@YummieGG - Changes Requested)**:
  > Great work! The Ticket Detail and Attachment lifecycle fully match the specs, and all tests pass cleanly.
  > 
  > Action required before merge: Please fix the TypeScript build errors (`npm --prefix server run build`):
  > - `server/src/utils/attachment.ts`: update `parsePositiveIntParam` parameter to `string | string[] | undefined` for Express 5.
  > - `server/src/routes/tickets.ts`: resolve type inference for `ticket.requester` and `ticket.attachments` from `getOwnedTicket`.
  > 
  > Once resolved, I'll approve right away!
- **Partner's response (@Snnn3)**:
  > Thanks for catching this! I have resolved both TypeScript build issues:
  > - `server/src/utils/attachment.ts`: Updated `parsePositiveIntParam` parameter signature to `string | string[] | undefined` to strictly conform with Express 5 routing params.
  > - `server/src/routes/tickets.ts`: Updated `getOwnedTicket` to properly infer and return `Prisma.TicketGetPayload<T>`, ensuring `ticket.requester` and `ticket.attachments` are fully typed without inference errors.
  > 
  > Verified with `npm --prefix server run build` (`tsc`) and `npm test` — both pass with zero errors. Ready for your re-review and approval!
- **My final comment (@YummieGG - Approved)**:
  > Great work on Issue #20!
  > 
  > The read-only Ticket Detail layout perfectly adheres to the Zen Green design system and spec.  
  > The attachment lifecycle is robust, cleanly handling all 5 row states along with the soft-removal modal dialog.  
  > API security scoping, error handling, and status codes (403, 409, 410) are spot on.  
  > Verified that the TypeScript build fix (`ac06054`) resolved all compiler errors, and all 76 test cases (server & client) pass cleanly.
- **Partner's response (@Snnn3)**:
  > Thank you for the thorough review and approval! Really appreciate you spotting the TypeScript build issue earlier and verifying the test suite.

### PR #31: Lab2-7: Playwright E2E Flow and Responsive Visual Evidence (#21)
- **Target PR**: [Snnn3/TokTickIT#31](https://github.com/Snnn3/TokTickIT/pull/31)
- **Author**: @Snnn3
- **Verdict**: Approved
- **My comment (@YummieGG)**:
  > Excellent work!
  > 
  > The Playwright E2E suite (E-01, E-02, R-01 & E-03) runs cleanly and covers the happy path, multi-requester isolation, and attachment lifecycles thoroughly.  
  > Responsive layouts and visual evidence screenshots are complete across all 3 viewports with zero horizontal scrolling.  
  > Great refactoring on `server/src/utils/ownership.ts` for clean, DRY authorization handling.  
  > Verified that TypeScript builds, linter, unit/API tests (76 passed), and E2E tests all pass 100%.  
  > Verdict: Approved! LGTM
- **Partner's response (@Snnn3)**:
  > Thanks for merging and review.

## Review Comments Received & Responses

## Issue #18 Review Status

- **Author:** @YummieGG
- **Branch:** `feature/lab2-8-testing-and-release`
- **Status:** Implementation complete locally; PR link, peer-review comments, and response will be recorded after the branch is intentionally staged and published.
- **Verification evidence:** See [`tests.md`](tests.md) for the executed matrix, AC/FR/BR traceability, test totals, migration/seed checks, and screenshot paths.

### PR #19: docs: Lab 2 Engineering Specification and Test Plan
- **Reviewer comment received (@Snnn3):**
  > Great job! The specifications and test plans are complete and fully aligned with the Lab 02 labsheet:
  > 
  > Spec & API: Covers all FRs, BRs, data models, and REST contracts.  
  > UI Spec: Follows Zen Green tokens and the 19 Appendix C checklist items.  
  > Test Plan: 82 planned tests with complete AC traceability.

- **How I responded (@YummieGG):**
  > Thanks.  

### PR #20: feat: implement database schema, migration, and seed data for Lab 2
- **Reviewer comment received (@Snnn3):**
  > The Prisma schema, migrations, and seed script perfectly fulfill:
  > - All models, relationships, indexes, and enums match `specification.md` and Section 5 of the labsheet.
  > - Seed data includes 4 categories, 6 systems, 4 active + 1 inactive requesters.

- **How I responded (@YummieGG):**
  > Thank you very much  

### PR #21: feat: implement requester context selection
- **Reviewer comment received (@Snnn3):**
  > Great job! The Development Requester Selection and App Shell:
  > - `GET /api/requesters` returns active requesters sorted alphabetically.
  > - Session persists in `sessionStorage` and clears properly on "Change Requester".
  > - UI adheres to Zen Green `#006B3C` styling and includes the mandatory test-mode warning banner.
  > - Both server API tests and client component tests pass.  
  > LGTM!.

- **How I responded (@YummieGG):**
  > Thanks Bro.  

### PR #22: feat: implement create ticket form with validation and reusable ui
- **Reviewer comment received (Iteration 1 by @Snnn3):**
  > Blocking Issues (Must Fix):
  > 1. Foreign Key Existence & isActive Validation (BR-05, BR-24, BR-25): Check requesterId, categoryId, relatedSystemId existence and isActive flag; return 400 with details instead of 500.
  > 2. Race Hazard in Ticket Number Generation (BR-01): Wrap in atomic transaction with PostgreSQL advisory locking.
  > 3. API Response Contract Mismatch (POST /api/tickets): Expand related objects (category, relatedSystem, requester).
  > 4. Hardcoded API Origin (localhost:3000): Use relative endpoints.
  > 5. Zen Green focus rings and token badges, submission busy state, create another action, optional select clearing, and responsive desktop breakpoint.

- **How I responded (@YummieGG):**
  > Addressed all blocking issues and spec alignments:
  > - Added foreign key existence & isActive validation returning 400 with field details.
  > - Wrapped ticket number generation and creation in prisma.$transaction with pg_advisory_xact_lock.
  > - Returned expanded category, relatedSystem, and requester objects in 201 response.
  > - Switched to relative API endpoints with Vite proxy.
  > - Updated Zen Green token palette for badges, focus rings, disabled busy state, and Create Another Ticket action.

- **Reviewer comment received (Iteration 2 by @Snnn3):**
  > Critical Issues to Fix:
  > 1. Advisory Lock Error Swallowing (server/src/lib/ticket-number.ts): Remove blanket try/catch around $executeRaw and use named constant TICKET_NUMBER_ADVISORY_LOCK_ID = 888334.
  > 2. Missing Loading State on Master Data Fetch (client/src/pages/CreateTicket.tsx): Add isLoading state while fetching reference data.
  > 3. Tablet Layout Regression (client/src/pages/CreateTicket.tsx): Restore col-12 col-md-6 for tablet viewports.

- **How I responded (@YummieGG):**
  > Resolved all 3 critical points:
  > - Removed try/catch so database errors bubble up properly; defined TICKET_NUMBER_ADVISORY_LOCK_ID = 888334; mocked $executeRaw in tests.
  > - Added isLoadingData state displaying centered spinner with "Loading..." per ui-spec.md §7.2.
  > - Restored col-12 col-md-6 for two-column layout on tablet and desktop.

- **Reviewer comment received (Iteration 3 by @Snnn3):**
  > Contract Over-Exposure (GET /api/related-systems): api-spec.md specifies returning only { id, name } under data.

- **How I responded (@YummieGG):**
  > Updated routes and tests to select only id and name for categories and related systems.

- **Reviewer comment received (Iteration 4 by @Snnn3):**
  > Critical — Spec Failure: Ticket Number Generation & Concurrency:
  > 1. Race Condition & Collision Risk: Query highest ticketNumber (orderBy ticketNumber: 'desc') instead of id: 'desc'.
  > 2. Unhandled Unique Violation: Catch Prisma P2002 error in transaction and retry up to 3 times to ensure valid submission never returns 500.
  > 3. Unsafe Type Bypassing: Type dbClient strictly as Prisma.TransactionClient.

- **How I responded (@YummieGG):**
  > - Typed dbClient strictly as Prisma.TransactionClient in generateTicketNumber.
  > - Ordered by ticketNumber: 'desc' to prevent sequence collisions from id drift or deletions.
  > - Implemented 3-attempt retry loop on P2002 unique constraint violations in POST /api/tickets.
  > - Added dedicated unit test suite for ticket-number generation (ticket-number.unit.test.ts).
  > - Implemented full multipart/form-data support for optional file attachments (max 5 files, <= 5MB, JPG/PNG/WEBP/PDF) with atomic attachment database persistence and file storage in uploads/ with UUID stored names.
  > - Completed responsive attachment selection UI in CreateTicket.tsx with instant client-side validation, error presentation, file removal, busy state, and data preservation.

- **Reviewer comment received (Iteration 5 - Approval by @Snnn3):**
  > ### PR Review: Approved!
  > Great work!!
  > All the critical items from the previous review iterations have been successfully resolved:
  > - **Concurrency & Ticket Generation (BR-01)**: Advisory transaction lock (`pg_advisory_xact_lock`) and the 3-attempt `P2002` retry loop are properly implemented.
  > - **Foreign Key & `isActive` Validation (BR-05, BR-24, BR-25)**: Accurately validates `requesterId`, `categoryId`, and optional `relatedSystemId`, returning client-friendly `400` errors with field details.
  > - **API Contract Alignment**: `POST /api/tickets` 201 response includes expanded `category`, `relatedSystem`, `requester`, and `attachments`.
  > - **Multipart Attachments**: Proper limits (max 5 files, 5MB, allowed formats) and atomic storage handling.
  > - **Zen Green UI**: Reusable components, focus rings, disabled busy state, and responsive layout meet the specification.
  > - **Test Suite**: All 30 server tests and 27 client tests pass without errors.
  > LGTM!

### PR #23: feat(tickets): implement My Tickets paginated list API and responsive UI
- **Target PR**: [YummieGG/toktickit#23](https://github.com/YummieGG/toktickit/pull/23)
- **Author**: @YummieGG
- **Reviewer**: @Snnn3
- **Branch**: `feature/lab2-5-my-tickets`
- **Status**: Merged

- **Reviewer comment received (Iteration 1 - Changes Requested by @Snnn3):**
  > ## Pull Request Review: Critical Issues & Required Changes
  > 
  > Thank you for putting together the ticket listing UI and responsive cards/table layout! However, before this PR can be approved and merged into `lab2-staging`, there are a few critical issues that need to be addressed:
  > 
  > ---
  > 
  > ### 1. Missing Backend Implementation & API Test Suite (Critical / Blocker)
  > - **Problem**: The PR title and description state that `GET /api/tickets` and the API test suite (`server/tests/lab-02/my-tickets.api.test.ts` covering **API-15 through API-26**) are included in this PR. However, inspecting `git diff origin/lab2-staging...HEAD` shows **0 backend files changed**—only client files are in this branch.
  > - **Spec Reference**: 
  >   - Issue #15 Acceptance Criteria: *"`GET /api/tickets` requires a valid active requesterId and returns only tickets owned by that requester."*
  >   - `docs/lab-02/tests.md`: Tests `API-15` through `API-26`.
  > - **Action Needed**: Ensure that the server route implementation and the `my-tickets.api.test.ts` suite are committed and pushed to `feature/lab2-5-my-tickets`.
  > 
  > ---
  > 
  > ### 2. `Clear Filters` Resets User-Selected `pageSize`
  > - **Location**: `client/src/pages/MyTickets.tsx` (lines 217–220)
  > - **Problem**: In `clearFilters()`, the state is reset using `DEFAULT_FILTERS`, which resets `pageSize` back to `10`:
  >   ```tsx
  >   const clearFilters = () => {
  >     setFilters(DEFAULT_FILTERS);
  >   };
  >   ```

- **How I responded (@YummieGG):**
  > Thank you for the review! Both critical issues have been addressed in commit `24f2915`:
  > 
  > 1. **Backend Implementation & API Test Suite Added**:
  >    - Committed `GET /api/tickets` in `server/src/routes/tickets.ts` featuring full query validation, ownership scoping, case-insensitive partial search, filtering, sorting, and pagination metadata.
  >    - Committed `server/tests/lab-02/my-tickets.api.test.ts` covering test cases API-15 through API-26 (all 17 tests pass).
  > 
  > 2. **Preserved `pageSize` on Clear Filters**:
  >    - Updated `clearFilters()` in `client/src/pages/MyTickets.tsx` to retain the user's selected `pageSize` instead of resetting it back to 10.
  >    - Added a corresponding behavior unit test in `client/tests/lab-02/MyTickets.test.tsx` verifying that `pageSize` remains preserved after clicking "Clear Filters".
  > 
  > **Verification Summary:**
  > - Client unit tests: 42/42 passing
  > - Server unit/API tests: 47/47 passing
  > - Client production build (`tsc -b && vite build`): Succeeded with zero errors
  > 
  > All changes are pushed to `feature/lab2-5-my-tickets`. Ready for re-review!

- **Reviewer comment received (Iteration 2 - Approval by @Snnn3):**
  > ## Pull Request Review: Approved
  > Thank you for addressing the critical review items in commit `24f2915`! The implementation of **Lab 2-5 (Issue #15)** is solid and meets all key requirements:
  > ---
  > ### Key Verification Highlights:
  > - **Backend Implementation (`GET /api/tickets`)**:
  >   - Ownership isolation properly scopes queries to the active `requesterId`.
  >   - Case-insensitive search across `ticketNumber`, `summary`, and `description`.
  >   - Robust query validation covering pagination limits (`5`, `10`, `20`), enum filters, and sort options returning expected `400` error payloads.
  >   - Complete API test suite passing 17/17 tests (`API-15` through `API-26`).
  > - **Responsive Frontend (`MyTickets.tsx`)**:
  >   - Desktop data table (`≥ 768px`) and mobile stacked cards (`< 768px`) render cleanly with zero horizontal overflow.
  >   - Clear visual distinction between the 0-ticket Empty State and the No-Results Filter State.
  >   - Loading indicators, decoupled error alerts with retry action, and development requester context switching all function smoothly.
  > - **Automated Tests & Build**:
  >   - Client component & unit tests: 42/42 passing.
  >   - Server API & unit tests: 47/47 passing.
  >   - Production TypeScript build (`tsc -b && vite build`): Succeeded with zero errors.
  > ---
  > LGTM! Approved!
