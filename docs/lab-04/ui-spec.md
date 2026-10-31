# Lab 4 UI Specification — Actions, Dashboards, and Workflow

## Issue #56 delivery boundary

This issue delivers the pre-implementation UI contract and evidence structure. It defines role navigation, the screen authorization matrix, the screen state matrix, dashboard layouts, Actions Taken interaction modes, resolution workflow feedback, and responsive/accessibility requirements. The implementation of these UI components and screens belongs to subsequent Lab 4 issues (Issues #58, #59, #60, and #61) after this contract is reviewed and merged into `lab4-staging`.

## 1. Shared visual and interaction rules

Keep the Lab 2 and Lab 3 Zen Green tokens: primary `#006B3C`, secondary `#0B7A46`, pale green `#EAF6EF`, page background `#F5F7F6`, white surface, dark green text, and red `#C62828` errors. Preserve existing buttons, badges, cards, table/card layouts, focus indicators, and form field styling.

- Every input, select, and textarea has an explicit label, a stable accessible name, and `aria-required` when required.
- Validation errors appear directly below the invalid control, associated programmatically, and are not conveyed by color alone.
- Buttons are at least 44 px high on mobile. Saving controls disable duplicate submission and display a busy spinner plus text.
- User-provided Action descriptions, results, follow-up notes, attachment notes, and cancel reasons are rendered as plain text preserving line breaks with `white-space: pre-wrap`; never render user text as HTML.
- Ticket status, Action status, Requested Priority, IT Priority, and role use text badges with sufficient contrast, not color-only indicators.
- No viewport has horizontal page overflow (`document.scrollWidth <= innerWidth`), clipped text, or overlapping controls at 1280 px, 768 px, or 375 px.
- Recoverable request errors preserve draft content; conflict errors (`409 CONFLICT`) show explicit reload and reconcile guidance without silently discarding user input.

## 2. Authenticated shell

The header displays TokTickIT, current user name/email and role, Change Password, and Logout. Navigation and default home routes are role-aware:

| Role | Visible navigation | Home route |
|---|---|---|
| Requester | Dashboard, My Tickets, Create Ticket | `/dashboard` |
| IT Staff | Dashboard, Staff Queue, Actions Taken | `/staff/dashboard` |
| Administrator | Dashboard, Staff Queue, Actions Taken, User Management | `/staff/dashboard` |

The client bootstraps session state via `/api/auth/me` on refresh. Unauthenticated users redirect to Login; `mustChangePassword` users are routed to Change Password; unauthorized direct route access displays a safe 403 screen with a permitted navigation link.

### 2.1 Screen authorization matrix

This table defines the screen and route authorization contract. Backend endpoint authorization remains authoritative; client route guards provide navigation safety only. `Own` means the authenticated Requester owns the referenced Ticket.

| Screen / route | Requester | IT Staff | Administrator | Unauthenticated or wrong-role behavior |
|---|---|---|---|---|
| Login (`/login`) | Redirect to Shell | Redirect to Shell | Redirect to Shell | Accessible; form displays |
| Change Password (`/change-password`) | Own session / edit | Own session / edit | Own session / edit | Unauthenticated → Login; blocked until change succeeds |
| Requester Dashboard (`/dashboard`) | Own metrics and lists | 403 | 403 | Unauthenticated → Login; wrong role → safe 403 |
| Staff Dashboard (`/staff/dashboard`) | 403 | Own operational metrics | Own operational metrics | Unauthenticated → Login; wrong role → safe 403 |
| Staff Actions Taken (`/staff/actions-taken`) | 403 | Current user assigned actions | Current user assigned actions | Unauthenticated → Login; wrong role → safe 403 |
| Create Ticket (`/tickets/new`) | Own / edit | 403 | 403 | Unauthenticated → Login; wrong role → safe 403 |
| My Tickets (`/tickets`) | Own / read and query | 403 | 403 | Unauthenticated → Login; wrong role → safe 403 |
| Requester Ticket Detail (`/tickets/:id`) | Own / read ticket & actions | 403 | 403 | Unauthenticated → Login; non-owner or wrong role → safe 404/403 |
| Staff Queue (`/staff/tickets`) | 403 | All / read and open detail | All / read-only queue | Unauthenticated → Login; wrong role → safe 403 |
| Staff Ticket Detail (`/staff/tickets/:id`) | 403 | All / edit workflow & actions | All / read-only ticket, editable actions | Unauthenticated → Login; wrong role → safe 403 |
| User Management (`/admin/users`) | 403 | 403 | Full scoped operations | Unauthenticated → Login; wrong role → safe 403 |

The Administrator action mutation exception does not render Ticket owner, IT Priority, formal status, Public Comment, Internal Note, or attachment upload/download controls.

## 3. Screen state matrix

| Screen | Initial/loading | Valid/normal | Empty/no-results | Validation | Saving/success | Failure/forbidden |
|---|---|---|---|---|---|---|
| Requester Dashboard | Skeleton cards & lists | 4 metric cards, 3 preview lists (max 5) | Zero counts (`0`), empty list message | N/A | Refresh on focus/click | Retryable error banner; never display false 0 on failure |
| Staff Dashboard | Skeleton cards & lists | 7 metric cards, 3 preview lists (max 5) | Zero groups shown (`0`), empty list message | N/A | Refresh on focus/click | Safe retry banner; wrong role shows safe 403 |
| Actions Taken Drill-down | Spinner | Paginated action list with filter summary | “No actions found matching filters” | Invalid query reset | Page change / filter update | Safe retry; invalid query reset |
| Requester Ticket Detail | Spinner | Detail, read-only Actions Taken, comments | “No actions taken yet” message | N/A | Toast on advisory click | Safe 404 for unowned; safe 403 for wrong role |
| Staff Ticket Detail (Actions Taken) | Spinner | Detail, interactive Actions Taken section | “No actions taken yet” with create button | Field-level error below control; focus invalid | Busy button, success notice, refresh parent | `409 CONFLICT` preserves draft with reload prompt; safe 400/403 |
| Ticket Workflow Controls | Current status badge | Allowed transition buttons/dropdown | N/A | Blocked resolution reasons listed | Saving indicator; updated status badge | Safe resolution error banner; `409` reload prompt |

## 4. Requester Dashboard

Route `/dashboard`. Backend calculates all metrics for the session user in the Bangkok 7-day calendar window:

- **Open Tickets:** count of owned Tickets with status `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`. Drill down navigates to My Tickets filtered by this status set.
- **Waiting for You:** count of owned Tickets with status `WAITING_FOR_REQUESTER`. Drill down navigates to My Tickets with this status.
- **Recently Updated:** count of owned Tickets updated within the 7-day window. Drill down passes captured date range.
- **Recently Resolved:** count of owned Tickets with status `RESOLVED`/`CLOSED` and `resolvedAt` within the 7-day window. Drill down passes captured resolved date range and status set.
- **Preview lists:** Recent Tickets, Attention Tickets, and Resolved Tickets (bounded to 5 items each, stable sort order). Each row opens Requester Ticket Detail.

Count values use `0` when empty; failed requests display an error banner with retry instead of a misleading zero.

## 5. Staff and Administrator Dashboard

Route `/staff/dashboard`. Staff and Administrator share one operational dashboard layout. “My” always refers to the authenticated user:

- **Unassigned Tickets:** active-work Tickets with `ownerId = null`. Drill down opens Staff Queue with unassigned filter.
- **My Tickets:** active-work Tickets where `ownerId` is the current user. Drill down opens Staff Queue with owner filter.
- **Tickets by Status:** group counts for all eight statuses including zero counts. Each status links to Staff Queue filtered by that status.
- **Active Tickets by IT Priority:** group counts for `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` active-work Tickets including zero counts. Links to Staff Queue with priority filter.
- **My Actions Taken:** count of non-terminal `PENDING`/`IN_PROGRESS` actions where `assigneeId` is the current user. Links to Actions Taken drill-down page.
- **Recent Tickets & Urgent Tickets:** bounded preview lists (max 5 each) linking to Ticket Detail. Urgent Tickets sort by priority descending then update time descending.
- **My Actions:** bounded preview list (max 5) of current user assigned actions linking to Ticket Detail with action in context.

## 6. Actions Taken Section

Embedded on Ticket Detail below the summary header:

### 6.1 Placement and list

Staff and Administrators see an interactive management section; Requesters see a clean read-only view. Each action item displays:
- Date and time rendered in `Asia/Bangkok` from server `createdAt`.
- Action Description and Result.
- Performed by (name and role, server-determined).
- Assignee (name, role, active indicator) and Action Status badge.
- Follow-Up Required indicator and Follow-up Note when present.
- Attachment Notes (plain-text reference to existing Ticket attachments).
- Cancel Reason when cancelled.
- Edit, assign, and status buttons when permissions and lifecycle permit.
- Stable display ordering by `createdAt asc, id asc`; editing does not reorder items.

### 6.2 Create mode

Staff/Admin open the Create Action form on an active writable Ticket:
- **Description:** required textarea (1–2,000 characters).
- **Assignee:** selectable dropdown of active Staff/Admin users, defaulting to the current user.
- **Follow-Up Required:** checkbox; toggling on makes **Follow-up Note** required.
- **Attachment Notes:** optional plain-text textarea.
- **Result:** optional at creation.
- Submits `expectedTicketVersion` and client `Idempotency-Key`. Submit button is disabled while saving. On retry after failure/timeout, the same key is reused.

### 6.3 View/edit mode

Editing allows updating description, result, follow-up fields, and attachment notes on non-terminal actions (`PENDING`, `IN_PROGRESS`, `COMPLETED`). Performed-by and creation date remain read-only. Completed actions retain required result validity. Cancelled actions are strictly read-only.

### 6.4 Assignment and status controls

- **Assignment:** allows reassigning to an active Staff or Administrator.
- **Status transitions:**
  - `PENDING` → Start (`IN_PROGRESS`), Complete (`COMPLETED`), Cancel (`CANCELLED`).
  - `IN_PROGRESS` → Complete (`COMPLETED`), Cancel (`CANCELLED`).
  - `COMPLETED` and `CANCELLED` are terminal states.
- Complete requires a non-empty Result. Cancel prompts for a required Cancel Reason (1–2,000 characters).

## 7. Ticket Workflow and Resolution UI

- IT Staff workflow controls show only valid next transitions according to the 8-state matrix.
- `CANCELLED`, `RESOLVED`, `CLOSED`, and `REOPENED` require explicit modal confirmation.
- Attempting to resolve a Ticket that does not meet the resolution gate displays an explicit error banner stating the blocking condition (e.g. no completed action, active action present, or unresolved follow-up).
- Ticket cancellation modal informs the user that active child actions will be atomically cancelled.
- Reopen modal informs the user that past action history is retained and resolution timestamps are cleared.
- Stale update conflicts (`409 CONFLICT`) retain user draft and offer reload/reconcile controls.

## 8. Actions Taken Drill-down

Route `/staff/actions-taken`. Dedicated page for inspecting assigned actions:
- URL search parameters maintain state: `?assignee=me&statuses=PENDING,IN_PROGRESS&page=1&pageSize=10`.
- Supports pagination (5, 10, 20 items per page) and stable sorting (`createdAt desc, id desc`).
- Displays active filter summary chip with clear/reset action.
- Table / card rows show action description, status, assignee, Ticket Number, Ticket summary, and current Ticket status. Clicking a row navigates to Ticket Detail with the action in context.

## 9. Responsive and accessibility checklist

- Verify layouts at 1280 px desktop, 768 px tablet, and 375 px mobile; `scrollWidth <= innerWidth` across all screens.
- Desktop and tablet use structured tables; mobile renders stacked cards with full-width buttons (>= 44 px touch targets).
- Maintain explicit form labels, programmatic error associations (`aria-describedby`), logical heading order, and visible keyboard focus rings.
- Dynamic updates and loading/saving feedback use `aria-live` regions or accessible busy states.
- Status, priority, role, and action badges use text and icons alongside color to convey state.
- Screen contrast meets WCAG AA 4.5:1 for all Zen Green text and badge tokens.
- Screenshots are captured under `artifacts/lab-04/screenshots/` for requester dashboard, staff dashboard, actions taken, ticket workflow, and regression.
