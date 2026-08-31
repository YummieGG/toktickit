# Lab 2 Test Plan and Results

## 1. Test Strategy

Describe the testing approach:
- **Unit Tests (Server)**: Vitest + Supertest — test each API endpoint with mocked Prisma client
- **Unit Tests (Client)**: Vitest + React Testing Library + jsdom — test each component in isolation with mocked API
- **E2E Tests**: Playwright — full user flow from requester selection through ticket management
- **Responsive Tests**: Playwright screenshots at desktop (1280px), tablet (768px), mobile (375px)
- **Visual Inspection**: Manual checklist against ui-spec.md

Test files locations:
- `server/tests/lab-02/*.api.test.ts`
- `client/tests/lab-02/*.test.tsx`
- `e2e/lab-02/*.spec.ts`

Test commands:
```bash
cd server && npm test
cd client && npm test
npx playwright test e2e/lab-02/
```

## 2. Planned Tests

| Test ID | Category | Description | File | AC Ref |
|---------|----------|-------------|------|--------|
| API-01 | Server API | POST /api/tickets with valid data returns 201 and ticket with generated number | toktickit/server/tests/lab-02/create-ticket.api.test.ts | AC-04 |
| API-02 | Server API | POST /api/tickets with missing summary returns 400 with field error | toktickit/server/tests/lab-02/create-ticket.api.test.ts | AC-05 |
| API-03 | Server API | POST /api/tickets with missing description returns 400 | toktickit/server/tests/lab-02/create-ticket.api.test.ts | AC-05 |
| API-04 | Server API | POST /api/tickets with missing categoryId returns 400 | toktickit/server/tests/lab-02/create-ticket.api.test.ts | AC-05 |
| API-05 | Server API | POST /api/tickets with missing requestedPriority returns 400 | toktickit/server/tests/lab-02/create-ticket.api.test.ts | AC-05 |
| API-06 | Server API | POST /api/tickets with invalid requesterId returns 400 | toktickit/server/tests/lab-02/create-ticket.api.test.ts | AC-05 |
| API-07 | Server API | POST /api/tickets with inactive requesterId returns 400 | toktickit/server/tests/lab-02/create-ticket.api.test.ts | AC-05 |
| API-08 | Server API | POST /api/tickets with invalid categoryId returns 400 | toktickit/server/tests/lab-02/create-ticket.api.test.ts | AC-05 |
| API-09 | Server API | POST /api/tickets with summary too short (<5 chars) returns 400 | toktickit/server/tests/lab-02/create-ticket.api.test.ts | AC-05 |
| API-10 | Server API | POST /api/tickets with summary too long (>200 chars) returns 400 | toktickit/server/tests/lab-02/create-ticket.api.test.ts | AC-05 |
| API-11 | Server API | POST /api/tickets with description too short returns 400 | toktickit/server/tests/lab-02/create-ticket.api.test.ts | AC-05 |
| API-12 | Server API | POST /api/tickets trims whitespace from summary and description | toktickit/server/tests/lab-02/create-ticket.api.test.ts | BR-14,BR-15 |
| API-13 | Server API | POST /api/tickets with optional relatedSystemId creates ticket | toktickit/server/tests/lab-02/create-ticket.api.test.ts | FR-08 |
| API-14 | Server API | POST /api/tickets without relatedSystemId creates ticket with null | toktickit/server/tests/lab-02/create-ticket.api.test.ts | BR-25 |
| API-15 | Server API | GET /api/tickets with requesterId returns only that requester's tickets | toktickit/server/tests/lab-02/my-tickets.api.test.ts | AC-07 |
| API-16 | Server API | GET /api/tickets without requesterId returns 400 | toktickit/server/tests/lab-02/my-tickets.api.test.ts | AC-08 |
| API-17 | Server API | GET /api/tickets with search term filters results | toktickit/server/tests/lab-02/my-tickets.api.test.ts | AC-09 |
| API-18 | Server API | GET /api/tickets with category filter returns filtered results | toktickit/server/tests/lab-02/my-tickets.api.test.ts | AC-10 |
| API-19 | Server API | GET /api/tickets with status filter returns filtered results | toktickit/server/tests/lab-02/my-tickets.api.test.ts | AC-10 |
| API-20 | Server API | GET /api/tickets with priority filter returns filtered results | toktickit/server/tests/lab-02/my-tickets.api.test.ts | AC-10 |
| API-21 | Server API | GET /api/tickets default sort is ticketDate desc | toktickit/server/tests/lab-02/my-tickets.api.test.ts | BR-16 |
| API-22 | Server API | GET /api/tickets with sortBy=ticketNumber&sortOrder=asc sorts correctly | toktickit/server/tests/lab-02/my-tickets.api.test.ts | AC-11 |
| API-23 | Server API | GET /api/tickets pagination returns correct page and metadata | toktickit/server/tests/lab-02/my-tickets.api.test.ts | AC-12 |
| API-24 | Server API | GET /api/tickets with no results returns empty array with pagination | toktickit/server/tests/lab-02/my-tickets.api.test.ts | AC-23 |
| API-25 | Server API | GET /api/tickets with invalid page returns 400 | toktickit/server/tests/lab-02/my-tickets.api.test.ts | BR-17 |
| API-26 | Server API | GET /api/tickets with invalid pageSize returns 400 | toktickit/server/tests/lab-02/my-tickets.api.test.ts | BR-18 |
| API-27 | Server API | GET /api/tickets/:id with valid owner returns full ticket detail | toktickit/server/tests/lab-02/ticket-detail.api.test.ts | AC-13 |
| API-28 | Server API | GET /api/tickets/:id without requesterId returns 400 | toktickit/server/tests/lab-02/ticket-detail.api.test.ts | AC-08 |
| API-29 | Server API | GET /api/tickets/:id with wrong requesterId returns 403 | toktickit/server/tests/lab-02/ticket-detail.api.test.ts | AC-08 |
| API-30 | Server API | GET /api/tickets/:id with non-existent id returns 404 | toktickit/server/tests/lab-02/ticket-detail.api.test.ts | AC-08 |
| API-31 | Server API | GET /api/tickets/:id includes attachments array | toktickit/server/tests/lab-02/ticket-detail.api.test.ts | AC-21 |
| API-32 | Server API | POST /api/tickets/:id/attachments with valid file returns 201 | toktickit/server/tests/lab-02/attachments.api.test.ts | AC-14 |
| API-33 | Server API | POST /api/tickets/:id/attachments with invalid file type returns 400 | toktickit/server/tests/lab-02/attachments.api.test.ts | AC-15 |
| API-34 | Server API | POST /api/tickets/:id/attachments with file > 5MB returns 400 | toktickit/server/tests/lab-02/attachments.api.test.ts | AC-16 |
| API-35 | Server API | POST /api/tickets/:id/attachments when 5 active exist returns 400 | toktickit/server/tests/lab-02/attachments.api.test.ts | AC-17 |
| API-36 | Server API | POST /api/tickets/:id/attachments with unowned ticket returns 403 | toktickit/server/tests/lab-02/attachments.api.test.ts | AC-08 |
| API-37 | Server API | GET /api/attachments/:id/download for active file returns file | toktickit/server/tests/lab-02/attachments.api.test.ts | AC-18 |
| API-38 | Server API | GET /api/attachments/:id/download for removed file returns 400 | toktickit/server/tests/lab-02/attachments.api.test.ts | AC-20 |
| API-39 | Server API | PATCH /api/attachments/:id/remove with reason returns 200 | toktickit/server/tests/lab-02/attachments.api.test.ts | AC-19 |
| API-40 | Server API | PATCH /api/attachments/:id/remove without reason returns 400 | toktickit/server/tests/lab-02/attachments.api.test.ts | AC-19 |
| API-41 | Server API | PATCH /api/attachments/:id/remove already removed returns 400 | toktickit/server/tests/lab-02/attachments.api.test.ts | BR-11 |
| API-42 | Server API | GET /api/categories returns active categories | toktickit/server/tests/lab-02/attachments.api.test.ts | FR-07 |
| API-43 | Server API | GET /api/related-systems returns active related systems | toktickit/server/tests/lab-02/attachments.api.test.ts | FR-08 |
| API-44 | Server API | GET /api/requesters returns active requesters only | toktickit/server/tests/lab-02/attachments.api.test.ts | FR-02,BR-04 |
| UI-01 | Client UI | Renders Create Ticket form with all required fields | toktickit/client/tests/lab-02/CreateTicket.test.tsx | AC-03 |
| UI-02 | Client UI | Shows required asterisks on mandatory fields | toktickit/client/tests/lab-02/CreateTicket.test.tsx | FR-13 |
| UI-03 | Client UI | Loads categories from API into dropdown | toktickit/client/tests/lab-02/CreateTicket.test.tsx | FR-07 |
| UI-04 | Client UI | Loads related systems from API into dropdown | toktickit/client/tests/lab-02/CreateTicket.test.tsx | FR-08 |
| UI-05 | Client UI | Shows validation errors on empty submit | toktickit/client/tests/lab-02/CreateTicket.test.tsx | AC-05 |
| UI-06 | Client UI | Disables submit button during submission | toktickit/client/tests/lab-02/CreateTicket.test.tsx | BR-19 |
| UI-07 | Client UI | Shows success message with ticket number after creation | toktickit/client/tests/lab-02/CreateTicket.test.tsx | AC-04 |
| UI-08 | Client UI | Preserves form data on API error | toktickit/client/tests/lab-02/CreateTicket.test.tsx | BR-20 |
| UI-09 | Client UI | Shows API error message | toktickit/client/tests/lab-02/CreateTicket.test.tsx | AC-21 |
| UI-10 | Client UI | Validates attachment file type client-side | toktickit/client/tests/lab-02/CreateTicket.test.tsx | AC-15 |
| UI-11 | Client UI | Validates attachment file size client-side | toktickit/client/tests/lab-02/CreateTicket.test.tsx | AC-16 |
| UI-12 | Client UI | Renders ticket list for selected requester | toktickit/client/tests/lab-02/MyTickets.test.tsx | AC-06,AC-07 |
| UI-13 | Client UI | Shows empty state when no tickets exist | toktickit/client/tests/lab-02/MyTickets.test.tsx | AC-22 |
| UI-14 | Client UI | Shows no-results state for empty search | toktickit/client/tests/lab-02/MyTickets.test.tsx | AC-23 |
| UI-15 | Client UI | Renders search input | toktickit/client/tests/lab-02/MyTickets.test.tsx | AC-09 |
| UI-16 | Client UI | Renders filter dropdowns | toktickit/client/tests/lab-02/MyTickets.test.tsx | AC-10 |
| UI-17 | Client UI | Renders pagination controls | toktickit/client/tests/lab-02/MyTickets.test.tsx | AC-12 |
| UI-18 | Client UI | Shows loading state | toktickit/client/tests/lab-02/MyTickets.test.tsx | AC-21 |
| UI-19 | Client UI | Shows error state with retry | toktickit/client/tests/lab-02/MyTickets.test.tsx | AC-21 |
| UI-20 | Client UI | Renders ticket info as read-only | toktickit/client/tests/lab-02/RequesterTicketDetail.test.tsx | AC-13 |
| UI-21 | Client UI | Shows attachment list | toktickit/client/tests/lab-02/RequesterTicketDetail.test.tsx | AC-21 |
| UI-22 | Client UI | Shows download button for active attachments | toktickit/client/tests/lab-02/RequesterTicketDetail.test.tsx | AC-18 |
| UI-23 | Client UI | Shows remove button for active attachments | toktickit/client/tests/lab-02/RequesterTicketDetail.test.tsx | AC-19 |
| UI-24 | Client UI | Shows removed attachment metadata without actions | toktickit/client/tests/lab-02/RequesterTicketDetail.test.tsx | AC-20 |
| UI-25 | Client UI | Shows error state for unauthorized access | toktickit/client/tests/lab-02/RequesterTicketDetail.test.tsx | AC-08 |
| UI-26 | Client UI | Renders add attachment button when < 5 active | toktickit/client/tests/lab-02/AttachmentSection.test.tsx | AC-14 |
| UI-27 | Client UI | Disables add when 5 active attachments | toktickit/client/tests/lab-02/AttachmentSection.test.tsx | AC-17 |
| UI-28 | Client UI | Shows confirmation dialog with reason on remove | toktickit/client/tests/lab-02/AttachmentSection.test.tsx | AC-19 |
| UI-29 | Client UI | Shows removed badge on soft-removed attachments | toktickit/client/tests/lab-02/AttachmentSection.test.tsx | AC-20 |
| E2E-01 | E2E | Select requester → navigate to My Tickets | toktickit/e2e/lab-02/requester-ticket-flow.spec.ts | AC-01,AC-02 |
| E2E-02 | E2E | Create ticket with valid data → see ticket number | toktickit/e2e/lab-02/requester-ticket-flow.spec.ts | AC-04 |
| E2E-03 | E2E | View created ticket in My Tickets list | toktickit/e2e/lab-02/requester-ticket-flow.spec.ts | AC-06 |
| E2E-04 | E2E | Open ticket detail → see read-only info | toktickit/e2e/lab-02/requester-ticket-flow.spec.ts | AC-13 |
| E2E-05 | E2E | Add attachment to ticket → see in list | toktickit/e2e/lab-02/requester-ticket-flow.spec.ts | AC-14 |
| E2E-06 | E2E | Download attachment | toktickit/e2e/lab-02/requester-ticket-flow.spec.ts | AC-18 |
| E2E-07 | E2E | Remove attachment with reason → see removed state | toktickit/e2e/lab-02/requester-ticket-flow.spec.ts | AC-19 |
| E2E-08 | E2E | Switch requester → previous tickets not visible | toktickit/e2e/lab-02/requester-ticket-flow.spec.ts | AC-07 |
| E2E-09 | E2E | Responsive screenshots at desktop, tablet, mobile | toktickit/e2e/lab-02/requester-ticket-flow.spec.ts | AC-24 |

## 3. Acceptance-Criterion Traceability

| AC | Description | Test IDs | Status |
|-----|-------------|----------|--------|
| AC-01 | Setup Requester Selector | E2E-01 | Planned |
| AC-02 | Persist Requester Session | E2E-01 | Planned |
| AC-03 | Create Ticket Form Layout | UI-01 | Planned |
| AC-04 | Create Ticket Success | API-01, UI-07, E2E-02 | Planned |
| AC-05 | Create Ticket Validation | API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, API-10, API-11, UI-05 | Planned |
| AC-06 | My Tickets View Layout | UI-12, E2E-03 | Planned |
| AC-07 | My Tickets Data Scope | API-15, UI-12, E2E-08 | Planned |
| AC-08 | Unauthorized Access Prevention | API-16, API-28, API-29, API-30, API-36, UI-25 | Planned |
| AC-09 | My Tickets Search | API-17, UI-15 | Planned |
| AC-10 | My Tickets Filters | API-18, API-19, API-20, UI-16 | Planned |
| AC-11 | My Tickets Sorting | API-22 | Planned |
| AC-12 | My Tickets Pagination | API-23, UI-17 | Planned |
| AC-13 | Requester Ticket Detail Info | API-27, UI-20, E2E-04 | Planned |
| AC-14 | Add Attachment | API-32, UI-26, E2E-05 | Planned |
| AC-15 | Attachment Type Validation | API-33, UI-10 | Planned |
| AC-16 | Attachment Size Validation | API-34, UI-11 | Planned |
| AC-17 | Max Active Attachments Limit | API-35, UI-27 | Planned |
| AC-18 | Download Active Attachment | API-37, UI-22, E2E-06 | Planned |
| AC-19 | Remove Attachment | API-39, API-40, UI-23, UI-28, E2E-07 | Planned |
| AC-20 | View Removed Attachments | API-38, UI-24, UI-29 | Planned |
| AC-21 | Display Loading and Error States | API-31, UI-09, UI-18, UI-19, UI-21 | Planned |
| AC-22 | Empty Tickets State | UI-13 | Planned |
| AC-23 | No Search Results State | API-24, UI-14 | Planned |
| AC-24 | Responsive Support Requirements | E2E-09 | Planned |

## 4. Responsive and Visual Checklist
- [ ] Desktop (1280px): multi-column layout, table for tickets
- [ ] Tablet (768px): two-column where practical
- [ ] Mobile (375px): single column, cards for tickets
- [ ] No clipping or overlap at any viewport
- [ ] No horizontal scrolling
- [ ] Priority badges colored correctly
- [ ] Status badges styled correctly
- [ ] Validation messages appear below fields
- [ ] Read-only fields distinct from editable
- [ ] Button hierarchy consistent
- [ ] Attachments section usable at all sizes

## 5. Test Commands
```bash
# Server API tests
cd server && npm test

# Client UI tests
cd client && npm test

# E2E tests
npx playwright test e2e/lab-02/

# All tests
cd server && npm test && cd ../client && npm test
```

## 6. Final Results
*To be updated after implementation*

| Suite | Total | Pass | Fail | Skip |
|-------|-------|------|------|------|
| Server API | - | - | - | 0 |
| Client UI | - | - | - | 0 |
| E2E | - | - | - | 0 |

## 7. Known Limitations or Deferred Tests
- Authentication tests deferred to Lab 3
- IT Staff workflow tests not applicable to Lab 2
- Ticket status transition tests not applicable (only NEW status in Lab 2)
