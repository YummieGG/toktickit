# Lab 3 UI Specification — Zen Green Role-Aware Portal

## 1. Shared visual and interaction rules

Keep the Lab 2 Zen Green tokens: primary `#006B3C`, secondary `#0B7A46`, pale green `#EAF6EF`, page background `#F5F7F6`, white surface, dark green text, and red `#C62828` errors. Preserve the existing labels, button hierarchy, required-field asterisks, inline validation placement, focus ring, and attachment rules.

- Every input/select/textarea has an explicit label and `aria-required` when required.
- Validation text appears directly below the invalid control and is not communicated by color alone.
- Buttons are at least 44 px high on mobile. Busy buttons disable duplicate submissions and show a spinner plus text.
- Plain-text comments/notes preserve line breaks with `white-space: pre-wrap`; never render user text as HTML.
- Status, role, and priority use text badges with sufficient contrast, not color-only indicators.
- No viewport has horizontal page overflow, clipped text, or overlapping controls.

## 2. Authenticated shell

The header shows TokTickIT, the current user's name/email and role, Change Password, and Logout. Navigation is role-aware:

| Role | Visible navigation |
|---|---|
| Requester | My Tickets, Create Ticket |
| IT Staff | Staff Queue |
| Administrator | User Management, read-only Ticket Queue |

The client bootstraps `/api/auth/me` on refresh. Unauthenticated users go to Login; `mustChangePassword` users go to Change Password; forbidden routes show a safe 403 page and a route-appropriate navigation link.

### 2.1 Screen authorization matrix

This is the canonical screen/route authorization contract. Backend endpoint
authorization remains authoritative; a route guard only controls navigation and
must never be treated as a security control. `Own` means the authenticated
Requester owns the referenced Ticket. A `mustChangePassword` user may access
only Change Password and Logout until the change succeeds.

| Screen / route | Requester | IT Staff | Administrator | Unauthenticated or wrong-role behavior |
|---|---|---|---|---|
| Login (`/login`) | Public auth form | Public auth form | Public auth form | Unauthenticated users may access; an already authenticated user is redirected to Shell |
| Change Password (`/change-password`) | Own session / edit | Own session / edit | Own session / edit | Unauthenticated → Login; other protected screens are blocked while `mustChangePassword=true` |
| Shell / bootstrap (`/app`) | Own session / Requester navigation | Own session / Staff navigation | Own session / Admin navigation | Unauthenticated → Login; invalid/expired session → safe Login notice |
| Create Ticket (`/tickets/new`) | Own / edit | 403 | 403 | Unauthenticated → Login; wrong role → safe 403 |
| My Tickets (`/tickets`) | Own / read and query | 403 | 403 | Unauthenticated → Login; wrong role → safe 403 |
| Requester Ticket Detail (`/tickets/:id`) | Own / read with permitted attachment, comment, and resolution actions | 403 on Requester route | 403 on Requester route | Unauthenticated → Login; non-owner or wrong role → safe 404/403 per API contract |
| Staff Queue (`/staff/tickets`) | 403 | All / read and open detail | All / read-only | Unauthenticated → Login; wrong role → safe 403 |
| Staff Ticket Detail (`/staff/tickets/:id`) | 403 | All / edit owner, IT Priority, status, comments, and notes | All / read-only; no Staff mutation or attachment download controls | Unauthenticated → Login; wrong role → safe 403 |
| User Management (`/admin/users`) | 403 | 403 | Own session / edit scoped user fields | Unauthenticated → Login; wrong role → safe 403 |

The UI must not render unauthorized navigation destinations or mutation
controls, but direct navigation must still reach the safe forbidden/not-found
state and the corresponding API request must be rejected by the backend.

## 3. Screen state matrix

| Screen | Initial/loading | Valid/normal | Empty/no-results | Validation | Saving/success | Failure/forbidden |
|---|---|---|---|---|---|---|
| Login | Empty fields; submit enabled | Email/password fields | N/A | Inline email/password messages | Busy submit; route to shell or Change Password | Generic invalid-credentials/cooldown banner; preserve fields; retry |
| Change Password | Password guidance visible | Current/new/confirm fields | N/A | Shared complexity and mismatch messages | Busy submit; success notice then Login for a new session | Safe current-password/API error; preserve non-secret field state appropriately |
| Shell/bootstrap | App spinner | Role-specific nav and identity | N/A | N/A | Logout busy state | Session expiry redirects to Login with safe notice |
| Requester Create Ticket | Lab 2 form with active references | Editable fields and attachments | Reference-data empty state | Inline field/file errors | Busy submit; Ticket Number confirmation | Top safe API error; preserve form |
| Requester My Tickets | Spinner then list/table | Lab 2 columns, search/filter/sort/page | Friendly “No Tickets Submitted Yet” | Invalid query reset/message | Refresh after actions | Retryable API error; ownership-safe 404 |
| Requester Ticket Detail | Spinner | Read-only ticket, attachments, public comments, resolution action | No comments/attachments message | Upload/comment/resolution errors inline | Busy action; success toast/banner | Safe 404/403/API failure |
| Staff Queue | Spinner | Search/filter/sort/pagination table or cards | “No tickets match” with clear filters | Invalid query message | Refresh after mutation | Retry, forbidden, and safe server error |
| Staff Ticket Detail | Spinner | Editable owner/IT priority/status, comments, notes; read-only base fields | No comments/notes/attachments message | Field-level and transition confirmation errors | Saving indicator and success feedback | Conflict/not-found/forbidden/API failure |
| User Management | Spinner | User list with search/role filter and create/edit panel | “No users found” | Duplicate email/role/password/safety errors | Busy save/reset; success feedback | Admin-only 403 and retryable API failure |

## 4. Login and Change Password

Login contains labeled email and password fields, a primary “Sign in” button, disabled/busy state, generic failure text, and cooldown retry guidance without revealing account existence. Change Password displays the 12–128 character rule and the three-of-four character-class rule; password values are never echoed in errors or logs.

## 5. Requester screens

Create Ticket, My Tickets, Ticket Detail, and attachment UI retain Lab 2 behavior and Zen Green styling. Remove the Development Requester selector and Change Requester action. Ticket Detail adds a clearly labeled “Problem Appears Resolved” action for the owner; after success it displays the server timestamp and disables repeat submission. A Requester cannot see owner controls, IT Priority, formal status controls, Internal Notes, or Administrator navigation.

## 6. Staff Queue

Desktop (>=992 px) uses a readable table with Ticket Number, Ticket Date, Summary, Category, Requested Priority, IT Priority, Status, Owner, Requester, and Last Updated. Tablet uses a responsive table; mobile (<768 px) uses stacked cards with the same information and a clear open-detail action. Search and filters expose status, both priorities, category, owner/unassigned; sortable headings or a mobile sort selector show the current direction. Loading, empty, no-results, forbidden, retry, and API failure states are explicit.

## 7. Staff Ticket Detail

The header shows Ticket Number, Ticket Date, Requester, status, both priorities, owner, and resolution indication. Base ticket fields and attachments remain readable; IT Staff can download active attachments, while Administrator sees attachment metadata only. Workflow controls are grouped separately. Owner assignment, IT Priority, and status controls show current values, allowed options, saving feedback, and required confirmation for Cancelled/Resolved/Closed/Reopened. Public Comments and Internal Notes use separate headings, composers, and visually distinct panels. Internal Notes are never rendered in Requester views.

## 8. Administrator User Management

Use one minimalist responsive screen: search, optional role filter, a list of Name/Email/Role/Status/Edit, and a create/edit panel. Edit supports name, email, role, active state, and “Set Initial Password”. Show explicit warnings for self-deactivation and last-active-Administrator protection. Do not display password values or Staff mutation controls. Non-Administrators receive a safe forbidden page and cannot call the API successfully.

## 9. Responsive and accessibility checklist

- Test at 1280 px, 768 px, and 375 px; `scrollWidth <= innerWidth` everywhere.
- Stack forms and use full-width controls on mobile; switch wide tables to cards instead of forcing horizontal scrolling.
- Maintain explicit labels, logical heading order, keyboard focus, visible focus ring, `aria-live` for asynchronous status, and descriptive icon labels.
- Keep status/role/priority text visible with contrast; use icons or text alongside color for warnings and success.
- Capture screenshots under `artifacts/lab-03/screenshots/` for authentication, requester, staff queue/detail, and user-management initial, success, error, and responsive states.
