# Lab 3 REST API Contract

**Base URL:** `http://localhost:3000/api`
**Authentication:** server-side opaque session in the `tt_session` HttpOnly cookie

## 1. Common response and security contract

All successful JSON responses use a `data` member. A single-resource response uses
`{ "data": <object> }`; a collection response uses
`{ "data": [<object>], "pagination": <pagination-metadata> }`. Successful actions
with no body use `204`. The binary attachment download endpoint is the only
successful response that is not JSON: it streams file bytes with the appropriate
content headers. Errors always use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request is invalid",
    "fields": { "email": "Enter a valid email address" }
  }
}
```

`fields` is optional. Never return password hashes, initial passwords, session tokens, or whether an unowned protected ticket exists.

The following names are response-shape aliases used by the endpoint sections:

- `UserProjection`: `{ id, name, email, role, isActive, mustChangePassword }` (used for the authenticated user and Administrator user-management responses).
- `UserSummary`: `{ id, name, email, role }` (used inside ticket responses; password state is not exposed there).
- `Reference`: `{ id, name }`.
- `AttachmentMetadata`: `{ id, originalName, storedName, mimeType, sizeBytes, isRemoved, createdAt, ticketId }`.
- `Comment` and `InternalNote`: `{ id, ticketId, content, author: { id, name, role }, createdAt }`.
- `TicketSummary`: `{ id, ticketNumber, ticketDate, summary, category: Reference, requestedPriority, itPriority, currentStatus, owner: UserSummary | null, requester: UserSummary, updatedAt, problemAppearsResolvedAt }`.
- `TicketDetail`: `TicketSummary` plus `{ description, relatedSystem: Reference | null, attachments: AttachmentMetadata[], comments: Comment[], internalNotes?: InternalNote[] }`.
- `QueuePagination`: `{ page: number, pageSize: 5 | 10 | 20, totalItems: number, totalPages: number, hasNextPage: boolean, hasPreviousPage: boolean }`.
- `UserList`: `UserProjection[]`.

Queue pagination uses offset semantics. `page` is a positive integer (default
`1`), and `pageSize` is one of `5`, `10`, or `20` (default `10`).
`totalPages` is `0` when `totalItems` is `0`; otherwise it is
`ceil(totalItems / pageSize)`. `hasNextPage` is true when `page < totalPages`,
and `hasPreviousPage` is true when `page > 1` and `totalItems > 0`. A page
greater than `totalPages` returns `200` with an empty `data` array and the
requested page in the metadata. Non-integer values, values below `1`, and
unsupported page sizes return `400 INVALID_QUERY`. Every sort uses `id desc`
as a deterministic secondary key after the requested sort fields.

| Status | Meaning |
|---:|---|
| 200 | Successful read or update |
| 201 | Resource created |
| 204 | Successful action with no response body |
| 400 | Validation or invalid status transition |
| 401 | Missing, expired, revoked, or invalid session |
| 403 | Authenticated role is not allowed |
| 404 | Resource is not found or is not owned by the Requester |
| 409 | Unique/conflict or last-Administrator safety violation |
| 429 | Login cooldown/rate limit |
| 500 | Safe unexpected server error |

State-changing requests must include the configured application `Origin`. A mismatched/missing Origin returns `403 CSRF_ORIGIN_INVALID`; `GET`/`HEAD` are not subject to this check. Production runs with an explicit trusted-proxy configuration; local development does not trust forwarded IP headers.

## 1.1 Endpoint authorization matrix

This table is the canonical method/path-level authorization contract. `Own` means the authenticated Requester owns the referenced Ticket; `All` means all tickets; `Read` means no mutation; `Write` includes the operation described in the endpoint section. Unauthenticated requests receive `401`. An authenticated user with the wrong role receives `403`. For Requester-owned resources, a different owner's resource returns a safe `404`.

| Method and path | Requester | IT Staff | Administrator |
|---|---|---|---|
| `POST /api/auth/login` | Public | Public | Public |
| `POST /api/auth/logout` | Own session | Own session | Own session |
| `GET /api/auth/me` | Own session | Own session | Own session |
| `POST /api/auth/change-password` | Own session | Own session | Own session |
| `GET /api/categories` | Read | Read | Read |
| `GET /api/related-systems` | Read | Read | Read |
| `POST /api/tickets` | Write | 403 | 403 |
| `GET /api/tickets` | Own | 403 | 403 |
| `GET /api/tickets/:id` | Own/read | All/read | All/read |
| `POST /api/tickets/:ticketId/attachments` | Own/write | 403 | 403 |
| `GET /api/attachments/:id` | Own/read metadata | All/read metadata | All/read metadata |
| `GET /api/attachments/:id/download` | Own/read file | All/read file | 403 |
| `PATCH /api/attachments/:id/remove` | Own/write | 403 | 403 |
| `GET /api/tickets/:ticketId/comments` | Own/read | All/read | All/read |
| `POST /api/tickets/:ticketId/comments` | Own/write | All/write | 403 |
| `POST /api/tickets/:id/problem-appears-resolved` | Own/write | 403 | 403 |
| `GET /api/staff/tickets` | 403 | All/read | All/read |
| `PATCH /api/tickets/:id/owner` | 403 | All/write | 403 |
| `PATCH /api/tickets/:id/it-priority` | 403 | All/write | 403 |
| `PATCH /api/tickets/:id/status` | 403 | All/write | 403 |
| `GET /api/tickets/:ticketId/internal-notes` | 403 | All/read | All/read |
| `POST /api/tickets/:ticketId/internal-notes` | 403 | All/write | 403 |
| `GET /api/admin/users` | 403 | 403 | Read |
| `POST /api/admin/users` | 403 | 403 | Write |
| `PATCH /api/admin/users/:id` | 403 | 403 | Write |
| `POST /api/admin/users/:id/initial-password` | 403 | 403 | Write |

## 2. Authentication

### `POST /api/auth/login`

Body: `{ "email": string, "password": string }`. Email is canonicalized. On success returns `200` with `{ "data": UserProjection }` and sets `tt_session` for eight hours. Invalid credentials, inactive users, and an unknown email return the same `401 INVALID_CREDENTIALS` shape; a cooldown returns `429 LOGIN_COOLDOWN` with `retryAfterSeconds`.

### `POST /api/auth/logout`

Requires a valid session. Revokes only the current session and returns `204`.

### `GET /api/auth/me`

Requires a valid session. Returns `200` with `{ "data": UserProjection }`; never returns secrets. A valid user with `mustChangePassword=true` still receives `200` so the client can route to Change Password.

### `POST /api/auth/change-password`

Requires a valid session. Body: `{ "currentPassword": string, "newPassword": string }`. Enforces the shared password policy, updates the scrypt hash, clears `mustChangePassword`, and revokes every existing session for that user, including the current session. Returns `200` with `{ "data": UserProjection }`; the client must sign in again to establish a new session. Errors: `400 INVALID_PASSWORD` or `401 CURRENT_PASSWORD_INVALID`.

### Legacy Requester password backfill

During the Lab 2-to-Lab 3 migration, existing Requester rows with no
`passwordHash` receive an scrypt hash derived from the application environment
variable `SEED_INITIAL_PASSWORD` and are marked `mustChangePassword=true`.
Existing non-null hashes are never overwritten. The backfill is transactional
and idempotent: a missing or invalid environment value aborts before any user
changes are committed, and no plaintext password is returned or logged.

## 3. Reference data

### `GET /api/categories` and `GET /api/related-systems`

Require an authenticated session for application use. Return active records ordered by name. Response: `{ "data": [{ "id": number, "name": string }] }`.

## 4. Requester ticket and attachment API

### `POST /api/tickets`

Requester only. Accepts the Lab 2 JSON or multipart fields (`categoryId`, optional `relatedSystemId`, `summary`, `description`, `requestedPriority`, and optional attachments). The server takes `requesterId` from the session and ignores/rejects a client value. Returns `201` with `{ "data": TicketDetail }`; the created ticket has `currentStatus: "NEW"` and includes attachment metadata.

### `GET /api/tickets`

Requester only; always scopes to the session user. Query: `search`, `category`, `status`, `priority`, `sortBy`, `sortOrder`, `page`, `pageSize` (5, 10, or 20; default 10). Search is case-insensitive partial matching over ticket number, summary, and description. Default sort is ticket date descending. The response is `200` with `{ "data": TicketSummary[], "pagination": QueuePagination }`; empty results use the same shape with an empty `data` array.

### `GET /api/tickets/:id`

Requester owner, IT Staff, and Administrator may read this endpoint according to the authorization matrix. The Requester view is ownership-scoped and returns `200` with `{ "data": TicketDetail }`, including full detail, active/removed attachment metadata, public comments authored by any role, and `problemAppearsResolvedAt`; an unowned Requester access returns safe `404`. Staff/Admin receive the Staff detail projection described below.

### Attachment operations

- `POST /api/tickets/:ticketId/attachments`: Requester owner only. Preserve Lab 2 file rules (JPG/JPEG/PNG/WEBP/PDF, 5 MB each, five active attachments). Returns `201` with `{ "data": AttachmentMetadata }`.
- `GET /api/attachments/:id`: returns metadata only after authorization. Requester owner, IT Staff, and Administrator may read metadata; cross-owner Requester access returns safe `404`. A successful response is `200` with `{ "data": { "id": number, "originalName": string, "storedName": string, "mimeType": string, "sizeBytes": number, "isRemoved": boolean, "createdAt": string, "ticketId": number } }`; it never includes file bytes, Internal Notes, or unrelated Ticket data.
- `GET /api/attachments/:id/download`: streams an active file for the Requester owner or IT Staff. Administrator receives `403`; removed files are blocked and never streamed.
- `PATCH /api/attachments/:id/remove`: Requester owner only; accepts `{ "removalReason": string }`, performs Lab 2 soft removal, and returns `204` with no body. IT Staff and Administrator cannot remove files.

### `GET /api/tickets/:ticketId/comments` and `POST /api/tickets/:ticketId/comments`

Public Comments are visible to the ticket Requester, IT Staff, and Administrator. `GET` returns `200` with `{ "data": Comment[] }`. `POST` accepts `{ "content": string }`; trim, require 1–2,000 characters, normalize newlines, and assign author/created time on the server. Client author/timestamp fields are not accepted. Returns `201` with `{ "data": Comment }`.

### `POST /api/tickets/:id/problem-appears-resolved`

Requester owner only. No body required. Sets `problemAppearsResolvedAt` to the server time if null and returns `200` with `{ "data": { "ticketId": number, "problemAppearsResolvedAt": string } }`. Repeating the action is `200` with the same original timestamp. There is no requester undo and no formal status change.

## 5. IT Staff queue and workflow API

### `GET /api/staff/tickets`

IT Staff can read the full queue; Administrator can read it read-only. Query:

- `search`: case-insensitive partial match on ticket number, summary, description, requester name/email.
- `status`, `requestedPriority`, `itPriority`, `category`, `ownerId` (including `unassigned`).
- `sortBy`: ticket date, last updated, ticket number, status, requested priority, IT priority, or owner. Default `updatedAt desc`.
- `page` (default 1) and `pageSize` (5, 10, or 20).

Response is `200` with `{ "data": TicketSummary[], "pagination": QueuePagination }` and includes ticket number/date, summary, category, both priorities, status, owner, requester, last updated, and resolution indication in each item. Invalid query returns `400 INVALID_QUERY`; no matches return `200` with the same shape and an empty `data` array.

### Staff/Admin ticket detail projection

IT Staff receives the Staff detail projection for any ticket, including attachment metadata and download actions. Administrator receives the same read-only detail but attachment metadata only; no download or mutation affordances. The projection includes attachments, public comments, internal notes (Staff/Admin only), owner, priorities, status, and resolution indication.

### `PATCH /api/tickets/:id/owner`

IT Staff only. Body `{ "ownerId": number | null }`; null means unassigned. The target must be an active IT Staff or Administrator. A successful update returns `200` with `{ "data": TicketDetail }`. Administrator receives `403` for this mutation.

### `PATCH /api/tickets/:id/it-priority`

IT Staff only. Body `{ "itPriority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }`. A successful update returns `200` with `{ "data": TicketDetail }`. This never changes the Requester Requested Priority.

### `PATCH /api/tickets/:id/status`

IT Staff only. Body `{ "status": "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED", "confirmed": boolean }`. Confirmation is required for Cancelled, Resolved, Closed, and Reopened. A successful update returns `200` with `{ "data": TicketDetail }`. Invalid transitions return `400 INVALID_STATUS_TRANSITION`; Reopened clears `problemAppearsResolvedAt`.

### `GET/POST /api/tickets/:ticketId/internal-notes`

IT Staff can read/write; Administrator can read only; Requester receives `403`. `GET` returns `200` with `{ "data": InternalNote[] }`. `POST` accepts `{ "content": string }`, has the same plain-text validation and server attribution as Public Comments, and returns `201` with `{ "data": InternalNote }`.

## 6. Administrator user management API

### `GET /api/admin/users`

Administrator only. Query `search` (name/email partial match) and optional `role`. Returns `200` with `{ "data": UserList }`; each item is a `UserProjection`. An invalid role query returns `400 INVALID_QUERY`. Advanced multi-column filtering/pagination is out of scope.

### `POST /api/admin/users`

Administrator only. Body `{ "name": string, "email": string, "role": "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR", "isActive": boolean, "initialPassword": string }`. Enforces canonical unique email and shared password policy. Returns `201` with `{ "data": UserProjection }`; never returns the password. Duplicate email returns `409 DUPLICATE_EMAIL`; invalid fields or password return `400 INVALID_USER_CREATE`.

### `PATCH /api/admin/users/:id`

Administrator only. Body may update `name`, `email`, `role`, and `isActive`. A successful update returns `200` with `{ "data": UserProjection }`. Errors are explicit: duplicate email is `409 DUPLICATE_EMAIL`, invalid role or field is `400 INVALID_USER_UPDATE`, self-deactivation is `409 SELF_DEACTIVATION`, and removing the last active Administrator is `409 LAST_ADMIN_PROTECTION`. Owner changes unassign tickets transactionally.

### `POST /api/admin/users/:id/initial-password`

Administrator only. Body `{ "initialPassword": string }`. Hashes the value and sets `mustChangePassword=true`; revokes all existing sessions. Invalid password returns `400 INVALID_PASSWORD`; success returns `204` with no body.
