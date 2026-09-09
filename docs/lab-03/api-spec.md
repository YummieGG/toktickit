# Lab 3 REST API Contract

**Base URL:** `http://localhost:3000/api`  
**Authentication:** server-side opaque session in the `tt_session` HttpOnly cookie

## 1. Common response and security contract

Successful responses use either `{ "data": ... }` or `{ "data": [...], "pagination": ... }`. Errors always use:

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

## 2. Authentication

### `POST /api/auth/login`

Body: `{ "email": string, "password": string }`. Email is canonicalized. On success returns the safe current-user projection and sets `tt_session` for eight hours. Invalid credentials, inactive users, and an unknown email return the same `401 INVALID_CREDENTIALS` shape; a cooldown returns `429 LOGIN_COOLDOWN` with `retryAfterSeconds`.

### `POST /api/auth/logout`

Requires a valid session. Revokes only the current session and returns `204`.

### `GET /api/auth/me`

Requires a valid session. Returns `{ id, name, email, role, isActive, mustChangePassword }`; never returns secrets. A valid user with `mustChangePassword=true` still receives `200` so the client can route to Change Password.

### `POST /api/auth/change-password`

Requires a valid session. Body: `{ "currentPassword": string, "newPassword": string }`. Enforces the shared password policy, updates the scrypt hash, clears `mustChangePassword`, and revokes all other sessions. Returns `200` with the safe user projection. Errors: `400 INVALID_PASSWORD` or `401 CURRENT_PASSWORD_INVALID`.

## 3. Reference data

### `GET /api/categories` and `GET /api/related-systems`

Require an authenticated session for application use. Return active records ordered by name. Response: `{ "data": [{ "id": number, "name": string }] }`.

## 4. Requester ticket and attachment API

### `POST /api/tickets`

Requester only. Accepts the Lab 2 JSON or multipart fields (`categoryId`, optional `relatedSystemId`, `summary`, `description`, `requestedPriority`, and optional attachments). The server takes `requesterId` from the session and ignores/rejects a client value. Returns `201` with the created ticket, `currentStatus: "NEW"`, and attachment metadata.

### `GET /api/tickets`

Requester only; always scopes to the session user. Query: `search`, `category`, `status`, `priority`, `sortBy`, `sortOrder`, `page`, `pageSize` (5, 10, or 20; default 10). Search is case-insensitive partial matching over ticket number, summary, and description. Default sort is ticket date descending. Empty results return `200` with an empty `data` array and pagination metadata.

### `GET /api/tickets/:id`

Requester only and ownership-scoped. Returns full detail, active/removed attachment metadata, public comments authored by any role, and `problemAppearsResolvedAt`. An unowned ticket returns safe `404`.

### `POST /api/tickets/:ticketId/attachments`, `GET /api/attachments/:id/download`, `PATCH /api/attachments/:id/remove`

Requester owner only and preserve Lab 2 file rules (JPG/JPEG/PNG/WEBP/PDF, 5 MB each, five active attachments, soft remove with reason). Download is blocked for removed files.

### `GET /api/tickets/:ticketId/comments` and `POST /api/tickets/:ticketId/comments`

Public Comments are visible to the ticket Requester, IT Staff, and Administrator. `POST` accepts `{ "content": string }`; trim, require 1–2,000 characters, normalize newlines, and assign author/created time on the server. Client author/timestamp fields are not accepted. Returns `201`.

### `POST /api/tickets/:id/problem-appears-resolved`

Requester owner only. No body required. Sets `problemAppearsResolvedAt` to the server time if null and returns `200` with the ticket indication. Repeating the action is `200` and leaves the original timestamp unchanged. There is no requester undo and no formal status change.

## 5. IT Staff queue and workflow API

### `GET /api/staff/tickets`

IT Staff can read the full queue; Administrator can read it read-only. Query:

- `search`: case-insensitive partial match on ticket number, summary, description, requester name/email.
- `status`, `requestedPriority`, `itPriority`, `category`, `ownerId` (including `unassigned`).
- `sortBy`: ticket date, last updated, ticket number, status, requested priority, IT priority, or owner. Default `updatedAt desc`.
- `page` (default 1) and `pageSize` (5, 10, or 20).

Response includes ticket number/date, summary, category, both priorities, status, owner, requester, resolution indication, and `pagination`. Invalid query returns `400 INVALID_QUERY`; no matches return `200` with an empty list.

### `GET /api/tickets/:id`

IT Staff receives the Staff detail projection for any ticket. Administrator receives the same data without mutation affordances. The projection includes attachments, public comments, internal notes (Staff/Admin only), owner, priorities, status, and resolution indication.

### `PATCH /api/tickets/:id/owner`

IT Staff only. Body `{ "ownerId": number | null }`; null means unassigned. The target must be an active IT Staff or Administrator. Administrator receives `403` for this mutation.

### `PATCH /api/tickets/:id/it-priority`

IT Staff only. Body `{ "itPriority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }`. This never changes the Requester Requested Priority.

### `PATCH /api/tickets/:id/status`

IT Staff only. Body `{ "status": "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED", "confirmed": boolean }`. Confirmation is required for Cancelled, Resolved, Closed, and Reopened. Invalid transitions return `400 INVALID_STATUS_TRANSITION`; Reopened clears `problemAppearsResolvedAt`.

### `GET/POST /api/tickets/:ticketId/internal-notes`

IT Staff can read/write; Administrator can read only; Requester receives `403`. `POST` has the same plain-text validation and server attribution as Public Comments.

## 6. Administrator user management API

### `GET /api/admin/users`

Administrator only. Query `search` (name/email partial match) and optional `role`. Returns safe user projections and active state. Advanced multi-column filtering/pagination is out of scope.

### `POST /api/admin/users`

Administrator only. Body `{ "name": string, "email": string, "role": "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR", "isActive": boolean, "initialPassword": string }`. Enforces canonical unique email and shared password policy. Never returns the password.

### `PATCH /api/admin/users/:id`

Administrator only. Body may update `name`, `email`, `role`, and `isActive`. Duplicate email, invalid role, self-deactivation, and removing the last active Administrator return `409`/`400` safety errors. Owner changes unassign tickets transactionally.

### `POST /api/admin/users/:id/initial-password`

Administrator only. Body `{ "initialPassword": string }`. Hashes the value and sets `mustChangePassword=true`; revokes all existing sessions. Returns `204`.
