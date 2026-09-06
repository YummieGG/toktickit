# Prompt: Implement Issue #17 — Ticket Detail Attachment Lifecycle

> ใช้ข้อความด้านล่างเป็น prompt สำหรับให้ agent implement งาน **Issue #17** แทน prompt เดิมของ Issue #16
> งานต้องอยู่เฉพาะ local working tree: **ห้าม commit, push, เปิด PR หรือแก้ไข GitHub**

```text
Implement GitHub Issue #17: Ticket Detail Attachment Lifecycle in the current repository.

Read these sources of truth before editing:
- docs/lab-02/specification.md (FR-21–FR-24, BR-08–BR-13, AC-14–AC-20)
- docs/lab-02/api-spec.md (attachment endpoints)
- docs/lab-02/ui-spec.md (Ticket Detail attachment UI)
- the existing Prisma schema, Ticket Detail page, Create Ticket attachment flow, and existing tests

Scope
1. Add requester-owned attachment APIs:
   - POST /api/tickets/:ticketId/attachments
   - GET /api/attachments/:id
   - GET /api/attachments/:id/download
   - PATCH /api/attachments/:id/remove
2. Add the complete attachment lifecycle to the Requester Ticket Detail screen.
3. Preserve the existing Create Ticket attachment workflow; do not regress it.

Server requirements
- Accept exactly one multipart field named `file` for the add-attachment endpoint.
- Require a valid requesterId and verify the requester owns the ticket/attachment before every read, download, upload, or removal operation. Return 403 for an existing resource that belongs to someone else, and 404 for a missing resource.
- Permit only JPEG, PNG, WEBP, and PDF. Enforce a 5 MB maximum per file on the server, even if the client validates first.
- Enforce a maximum of 5 *active* attachments (`isRemoved === false`) per ticket. Soft-removed attachments do not count, so a replacement can be uploaded after removal.
- Store uploads with UUID-based storage names in the local uploads directory, but retain and return the original filename and attachment metadata.
- Download an active attachment with the original filename. Do not download a removed attachment; return a client error.
- Soft removal must not delete metadata or the physical file. Persist `isRemoved`, `removedAt`, and a trimmed removal reason between 3 and 500 characters. Reject an already-removed attachment.
- Keep response shapes and error conventions consistent with the existing routes. Clean up a just-written local file if metadata persistence fails.

Client requirements
- Show the ticket attachment list, including original filename, size, upload date, and state.
- Implement these states exactly:
  - Active: download and remove actions available.
  - Uploading: visible in-progress state and file picker disabled while the request is pending.
  - Invalid: show client validation errors and server HTTP 400 upload errors; provide Dismiss.
  - Removed: show historical metadata and removal reason, with no download/remove actions.
  - Unavailable: show an error state if a download target cannot be fetched.
- Validate allowed type and 5 MB maximum before upload. Keep server validation authoritative.
- When five active attachments already exist, leave the picker usable so the user can attempt selection and see a clear maximum-limit Invalid error. Do not silently disable the whole feature.
- Removal must require an explicit confirmation and a 3–500-character reason before calling the API.
- Use the existing visual components/style conventions and preserve requester isolation.

Implementation quality requirements
- Keep attachment policy constants centralized separately in server and client runtime helpers; avoid duplicating literals across route/page components.
- Add `server/uploads/` to gitignore. Do not commit uploaded files.
- Do not change unrelated behavior and do not modify GitHub state.

Tests and verification
- Add API tests for: valid upload; missing, wrong-type, oversized, and multiple files; malformed IDs; ownership; five-active limit; metadata; original-name download and bytes; missing and removed download; removal validation including 3 and 500 character boundaries; repeated removal; and soft-removal persistence.
- Add UI tests for: valid upload; Uploading state; client-invalid and server-400 Invalid + Dismiss; fifth/limit behavior; download/remove actions; confirmation + reason validation; Removed state; and Unavailable state.
- Run the repository test commands, client production build, lint, and `git diff --check`.
- Report changed files and all verification results. Mention any pre-existing warnings separately.
```

## Review fixes already reflected in this prompt

| Review finding | Required outcome in the prompt |
| --- | --- |
| The sixth-file limit could not be exercised because the picker was disabled at five active files. | Keep the picker enabled; selecting another file shows an Invalid limit message with Dismiss. |
| Server-side HTTP 400 upload failures were shown as generic errors. | Render them as the Invalid state and allow Dismiss, just like client validation failures. |
| Uploading state lacked direct test evidence. | Add a pending-upload UI test that asserts the Uploading state and disabled picker. |
| Removal reason boundary tests were incomplete. | Test valid 3-character and 500-character reasons, as well as invalid shorter/longer values. |

## Current completion checklist

- [x] Attachment APIs are requester-scoped and validate ownership.
- [x] Type, size, multipart, active-count, and removal-reason validation exist on the server.
- [x] Ticket Detail implements Active, Uploading, Invalid, Removed, and Unavailable states.
- [x] Soft removal preserves attachment history and blocks downloads.
- [x] API and UI coverage includes the review fixes above.
- [x] Local verification passed: server tests (95), client tests (57), client production build, and `git diff --check`.

The current client lint result contains one pre-existing, unrelated Fast Refresh warning in `client/src/contexts/RequesterContext.tsx`.
