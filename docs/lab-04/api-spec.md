# Lab 4 REST API Contract

**Base URL:** `http://localhost:3000/api`
**Authentication:** server-side opaque session in the `tt_session` HttpOnly cookie

## 1. Common response and security contract

All successful JSON responses use a `data` member. A single-resource response uses `{ "data": <object> }`; a collection response uses `{ "data": [<object>], "pagination": <pagination-metadata> }`. Successful actions with no body use `204`. Errors always use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request is invalid",
    "fields": { "description": "Action description is required" }
  }
}
```

`fields` is optional. The legacy `details` array is preserved where the existing validation helper emits it for Lab 3 compatibility. Never return password hashes, session tokens, Internal Notes to Requesters, stack traces, database internals, creation keys, or creation fingerprints.

### Issue #56 delivery boundary

This issue defines the API contract, request/response wire formats, security guards, concurrency rules, and status codes for Lab 4. The implementation of these endpoints belongs to subsequent issues (Issue #57 for Actions Taken, Issue #59 for Ticket workflow and resolution, and Issue #60 for dashboards and drill-down extensions). Issue #56 does not implement endpoint routes or claim passing test results.

The following names are response-shape aliases used by the endpoint sections:

- `UserSummary`: `{ id, name, role }`.
- `AssigneeSummary`: `{ id, name, role, isActive: boolean }`.
- `ActionProjection`: `{ id, ticketId, description, result: string | null, status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED", performedBy: UserSummary, assignee: AssigneeSummary | null, followUpRequired: boolean, followUpNote: string | null, attachmentNotes: string | null, cancelReason: string | null, createdAt: string, updatedAt: string, version: number }`.
- `StaffActionRow`: `ActionProjection` plus `{ ticket: { id: number, ticketNumber: string, summary: string, currentStatus: TicketStatus } }`.
- `TicketDashboardRow`: `{ id, ticketNumber, summary, currentStatus, itPriority, updatedAt, resolvedAt: string | null }`.
- `ActionMutationResponse`: `{ data: { action: ActionProjection, ticketVersion: number } }`.
- `ActionListResponse`: `{ data: ActionProjection[], ticketVersion: number, pagination: QueuePagination }`.
- `QueuePagination`: `{ page: number, pageSize: 5 | 10 | 20, totalItems: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean }`.
- `RequesterDashboardResponse`: `{ metrics: { openTickets: number, waitingForYou: number, recentlyUpdated: number, recentlyResolved: number }, recentTickets: TicketDashboardRow[], attentionTickets: TicketDashboardRow[], resolvedTickets: TicketDashboardRow[], generatedAt: string, timezone: "Asia/Bangkok", window: { from: string, to: string }, listLimit: 5 }`.
- `StaffDashboardResponse`: `{ metrics: { unassignedTickets: number, myTickets: number, myActionsTaken: number, ticketsByStatus: Record<TicketStatus, number>, activeTicketsByItPriority: Record<RequestedPriority, number> }, recentTickets: TicketDashboardRow[], urgentTickets: TicketDashboardRow[], myActions: StaffActionRow[], generatedAt: string, timezone: "Asia/Bangkok", window: { from: string, to: string }, listLimit: 5 }`.

Pagination uses offset semantics: `page` default 1, `pageSize` 5, 10, or 20 (default 10). Out-of-range pages return `200` with an empty collection. Secondary tie-breaker sort is always `id desc` (or `id asc` for Action list).

| Status | Meaning |
|---:|---|
| 200 | Successful read, update, or idempotent replay |
| 201 | Resource created |
| 204 | Successful action with no response body |
| 400 | Validation error, invalid transition, or resolution blocked |
| 401 | Missing, expired, revoked, or invalid session |
| 403 | Authenticated role or CSRF Origin is not allowed |
| 404 | Resource not found or not owned by Requester |
| 409 | Version conflict, transaction serialization failure, or idempotency conflict |
| 500 | Safe unexpected server error |

State-changing requests require a trusted `Origin` header matching the application origin, returning `403 CSRF_ORIGIN_INVALID` on mismatch.

Mutating Ticket and Action endpoints execute inside a Prisma Serializable transaction. The transaction verifies session, role, parent Ticket status, action lifecycle, assignee eligibility, and expected versions (`expectedTicketVersion`, `expectedActionVersion`). If a version mismatch occurs or Prisma throws a serialization conflict (`P2034`), the server returns `409 CONFLICT` and rolls back all writes. Any successful action mutation (create, edit, assign, status change) increments `action.version`, increments parent `ticket.version`, and refreshes parent `ticket.updatedAt` atomically within the transaction to ensure Recently Updated metrics and queue activity remain authoritative.

## 1.1 Endpoint authorization matrix

This table defines the method and path-level authorization contract. `Own` means the authenticated Requester owns the Ticket; `All` means all tickets accessible in Staff scope; `Read` means no mutation; `Write` includes the permitted mutation. Unauthenticated requests receive `401`. Wrong roles receive `403`. Cross-requester access returns safe `404`.

| Method and path | Requester | IT Staff | Administrator |
|---|---|---|---|
| `GET /api/tickets/:ticketId/actions-taken` | Own/read | All/read | All/read |
| `POST /api/tickets/:ticketId/actions-taken` | 403 | All/write | All/write |
| `PATCH /api/tickets/:ticketId/actions-taken/:actionId` | 403 | All/write | All/write |
| `PATCH /api/tickets/:ticketId/actions-taken/:actionId/assignee` | 403 | All/write | All/write |
| `PATCH /api/tickets/:ticketId/actions-taken/:actionId/status` | 403 | All/write | All/write |
| `PATCH /api/tickets/:id/status` | 403 | All/write | 403 |
| `PATCH /api/tickets/:id/owner` | 403 | All/write | 403 |
| `PATCH /api/tickets/:id/it-priority` | 403 | All/write | 403 |
| `GET /api/dashboards/requester` | Own session | 403 | 403 |
| `GET /api/dashboards/staff` | 403 | All/read | All/read |
| `GET /api/staff/actions-taken` | 403 | Current user | Current user |
| `POST /api/tickets/:ticketId/comments` | Own/write | All/write | 403 |
| `POST /api/tickets/:ticketId/internal-notes` | 403 | All/write | 403 |
| `GET /api/attachments/:id/download` | Own/read file | All/read file | 403 |
| `GET /api/admin/users` | 403 | 403 | Read |

## 2. Actions Taken API

### `GET /api/tickets/:ticketId/actions-taken`

Requester (owned Ticket), IT Staff, and Administrator. Query: `page` (default 1), `pageSize` (5, 10, 20; default 10). Ordering is strictly `createdAt asc, id asc`.

Returns `200` with `ActionListResponse`: `{ "data": ActionProjection[], "ticketVersion": number, "pagination": QueuePagination }`. Cross-requester unowned ticket access returns safe `404`.

### `POST /api/tickets/:ticketId/actions-taken`

IT Staff and Administrator only. Header: `Idempotency-Key` (ASCII `[A-Za-z0-9_-]` between 8 and 128 characters).

Body:
```json
{
  "description": "Inspected network switch and replaced patch cable",
  "result": null,
  "assigneeId": 12,
  "followUpRequired": true,
  "followUpNote": "Verify link status after 24 hours",
  "attachmentNotes": "Refer to attachment port-photo.png",
  "expectedTicketVersion": 3
}
```

Validation:
- `description`: required, 1–2,000 characters after trim.
- `assigneeId`: optional; defaults to authenticated user ID. Must be an active `IT_STAFF` or `ADMINISTRATOR`; invalid returns `400 ASSIGNEE_INELIGIBLE`.
- `followUpRequired`: boolean (default false). When true, `followUpNote` is required (1–2,000 chars); failure returns `400 FOLLOW_UP_NOTE_REQUIRED`.
- `attachmentNotes`: optional, max 2,000 chars plain text.
- `expectedTicketVersion`: required positive integer; stale version returns `409 CONFLICT`.
- Parent Ticket must be in an active status (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`). Terminal parents return `400 ACTION_PARENT_READ_ONLY`.

Success returns `201` with `ActionMutationResponse` (`{ "data": { "action": ActionProjection, "ticketVersion": number } }`). An exact replay of the same `Idempotency-Key` and payload returns `200` with the original action; a matching key with a different payload returns `409 IDEMPOTENCY_CONFLICT`.

### `PATCH /api/tickets/:ticketId/actions-taken/:actionId`

IT Staff and Administrator only. Body must include at least one editable field and both versions:
```json
{
  "description": "Updated action description",
  "result": "Resolved switch issue",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": null,
  "expectedTicketVersion": 4,
  "expectedActionVersion": 1
}
```

Verifies nested `action.ticketId === :ticketId`. Completed actions cannot update result to null or empty. Cancelled actions are strictly read-only (`400 ACTION_CANCELLED_READ_ONLY`). Stale `expectedTicketVersion` or `expectedActionVersion` returns `409 CONFLICT`.

Success returns `200` with `ActionMutationResponse`.

### `PATCH /api/tickets/:ticketId/actions-taken/:actionId/assignee`

IT Staff and Administrator only. Reassigns the action:
```json
{
  "assigneeId": 14,
  "expectedTicketVersion": 4,
  "expectedActionVersion": 1
}
```

`assigneeId` must belong to an active IT Staff or Administrator. Invalid/inactive users return `400 ASSIGNEE_INELIGIBLE`. Terminal parents return `400 ACTION_PARENT_READ_ONLY`.

Success appends an `ASSIGNED` event and returns `200` with `ActionMutationResponse`.

### `PATCH /api/tickets/:ticketId/actions-taken/:actionId/status`

IT Staff and Administrator only. Body:
```json
{
  "status": "COMPLETED",
  "cancelReason": null,
  "expectedTicketVersion": 4,
  "expectedActionVersion": 1
}
```

Status lifecycle transitions:
- `PENDING` → `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `IN_PROGRESS` → `COMPLETED`, `CANCELLED`
- `COMPLETED` and `CANCELLED` are terminal; further transition returns `400 INVALID_ACTION_TRANSITION`.

Transition to `COMPLETED` requires a non-empty `result` and valid follow-up fields. Transition to `CANCELLED` requires `cancelReason` (1–2,000 characters). Success appends `STARTED`, `COMPLETED`, or `CANCELLED` event, increments versions, and returns `200` with `ActionMutationResponse`.

## 3. Ticket workflow and resolution API

### `PATCH /api/tickets/:id/status`

IT Staff only. Body:
```json
{
  "status": "RESOLVED",
  "confirmed": true,
  "expectedTicketVersion": 5
}
```

Enforces the 8-state status machine:
- `NEW` → `OPEN`, `CANCELLED`
- `OPEN` → `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`
- `IN_PROGRESS` → `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
- `WAITING_FOR_REQUESTER` → `IN_PROGRESS`, `CANCELLED`
- `RESOLVED` → `CLOSED`, `REOPENED`
- `CLOSED` → `REOPENED`
- `REOPENED` → `IN_PROGRESS`, `CANCELLED`
- `CANCELLED` → `REOPENED`

Resolution gate: when transitioning to `RESOLVED`, the transaction verifies:
1. At least one `COMPLETED` action exists with a non-empty `result`.
2. No `PENDING` or `IN_PROGRESS` action exists.
3. No non-cancelled action has `followUpRequired=true`.

Failure returns `400 TICKET_RESOLUTION_BLOCKED` with safe reason details and no database modification. Transitioning to `RESOLVED` sets `resolvedAt` to server instant; `CLOSED` preserves it; `REOPENED` clears `resolvedAt` and `problemAppearsResolvedAt`.

Cancelling a Ticket (`CANCELLED`) atomically sets all active child actions (`PENDING`, `IN_PROGRESS`) to `CANCELLED` with reason “Ticket cancelled by IT Staff” and appends `CANCELLED` events.

Success returns `200` with `{ "data": TicketDetail }`.

### `PATCH /api/tickets/:id/owner` and `PATCH /api/tickets/:id/it-priority`

IT Staff only. Bodies require `expectedTicketVersion` alongside target value. Real mutations increment `Ticket.version` and `updatedAt`. Stale versions return `409 CONFLICT`.

## 4. Role dashboards API

### `GET /api/dashboards/requester`

Requester only. Operates on authenticated session user in a Repeatable Read transaction. Calculates the 7-day calendar window in `Asia/Bangkok` (from 00:00:00 six calendar days ago through current server time).

Returns `200` with `RequesterDashboardResponse`:
- `openTickets`: owned Tickets with active-work status (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`).
- `waitingForYou`: owned Tickets with status `WAITING_FOR_REQUESTER`.
- `recentlyUpdated`: owned Tickets updated in the 7-day window.
- `recentlyResolved`: owned Tickets with status `RESOLVED`/`CLOSED` and `resolvedAt` in the window.
- `recentTickets`, `attentionTickets`, `resolvedTickets`: bounded arrays (max 5 rows).

### `GET /api/dashboards/staff`

IT Staff and Administrator only. Computes operational metrics from accessible ticket scope:
- `unassignedTickets`: active-work Tickets with `ownerId = null`.
- `myTickets`: active-work Tickets owned by current user.
- `myActionsTaken`: non-terminal (`PENDING`, `IN_PROGRESS`) actions assigned to current user.
- `ticketsByStatus`: group counts across all 8 statuses (including 0).
- `activeTicketsByItPriority`: group counts across 4 priorities for active-work Tickets (including 0).
- `recentTickets`, `urgentTickets`, `myActions`: bounded arrays (max 5 rows).

Returns `200` with `StaffDashboardResponse`.

### `GET /api/staff/actions-taken`

IT Staff and Administrator only. Current-user action drill-down query:
`/api/staff/actions-taken?assignee=me&statuses=PENDING,IN_PROGRESS&page=1&pageSize=10`

`assignee` must be `me` (other values return `400 INVALID_QUERY`). `statuses` is a comma-separated enum set. Sort order is `createdAt desc, id desc`. Returns `200` with `{ "data": StaffActionRow[], "pagination": QueuePagination }`.

## 5. Drill-down query extensions

### Requester `GET /api/tickets`

Extended with query parameters:
- `statuses`: comma-separated `TicketStatus` enum set (cannot combine with `status`).
- `updatedFrom` and `updatedTo`: ISO 8601 timestamps with timezone.
- `resolvedFrom` and `resolvedTo`: ISO 8601 timestamps with timezone.
- `sortBy`: supports `updatedAt` or `resolvedAt` (nulls last).

### Staff `GET /api/staff/tickets`

Extended with query parameters:
- `statuses`: comma-separated `TicketStatus` enum set.
- `itPriorities`: comma-separated `RequestedPriority` enum set.
- `updatedFrom` and `updatedTo`: ISO 8601 timestamps with timezone.
- `resolvedFrom` and `resolvedTo`: ISO 8601 timestamps with timezone.

Dashboards pass captured window timestamps to ensure count and drill-down parity.

## 6. Inherited APIs and health smoke

Public health and root endpoints (`GET /health`, `GET /`) retain existing contracts and receive regression smoke tests. Inherited authentication (`/api/auth/*`), categories, related systems, comments, internal notes, attachments, and Administrator user management preserve their Lab 3 contracts.
