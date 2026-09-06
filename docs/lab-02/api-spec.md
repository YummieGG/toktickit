# Lab 2 REST API Contract

## Base URL
`http://localhost:3000/api`

## Common Error Response Shape
```json
{
  "error": "Human-readable message",
  "details": [
    {
      "field": "summary",
      "message": "Summary is required"
    }
  ]
}
```

## HTTP Status Code Reference
| Status | Usage |
|--------|-------|
| 200 | Successful retrieval or update |
| 201 | Resource created successfully |
| 400 | Invalid input / validation failure |
| 403 | Ownership check failed |
| 404 | Resource not found |
| 500 | Unexpected server error |

## Endpoints

### GET /api/categories
**Purpose**: Returns all active categories ordered by name
**Auth**: None
**Request**: No parameters, query, or body.
**Response**: 200 OK
```json
{
  "data": [
    {
      "id": 1,
      "name": "Software"
    }
  ]
}
```
**Validation**: None
**Errors**: 
- `500`: `{ "error": "Internal server error" }`

### GET /api/related-systems
**Purpose**: Returns all active related systems ordered by name
**Auth**: None
**Request**: No parameters, query, or body.
**Response**: 200 OK
```json
{
  "data": [
    {
      "id": 1,
      "name": "Corporate Laptop"
    }
  ]
}
```
**Validation**: None
**Errors**: 
- `500`: `{ "error": "Internal server error" }`

### GET /api/requesters
**Purpose**: Returns all active development requesters ordered by name
**Auth**: None
**Request**: No parameters, query, or body.
**Response**: 200 OK
```json
{
  "data": [
    {
      "id": 1,
      "name": "Somchai",
      "email": "somchai@example.com"
    }
  ]
}
```
**Validation**: None
**Errors**: 
- `500`: `{ "error": "Internal server error" }`

### POST /api/tickets
**Purpose**: Create a new ticket for the selected requester with optional file attachments
**Auth**: Requires requesterId param in body / form data
**Request**: 
- Content-Type: `application/json` or `multipart/form-data`
- Body (`application/json`):
```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 3,
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery only lasts 2 hours...",
  "requestedPriority": "MEDIUM"
}
```
- Form Data (`multipart/form-data`):
  - `requesterId`: integer or string
  - `categoryId`: integer or string
  - `relatedSystemId`: optional integer or string
  - `summary`: string
  - `description`: string
  - `requestedPriority`: string (LOW, MEDIUM, HIGH, CRITICAL)
  - `attachments`: optional file(s) (up to 5 files, <= 5MB each, JPG/PNG/WEBP/PDF)
**Response**: 201 Created
```json
{
  "data": {
    "id": 1,
    "ticketNumber": "TK-0001",
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery only lasts 2 hours...",
    "requestedPriority": "MEDIUM",
    "currentStatus": "NEW",
    "ticketDate": "2026-08-31T08:00:00.000Z",
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 3, "name": "Corporate Laptop" },
    "requester": { "id": 1, "name": "Somchai" },
    "attachments": [
      {
        "id": 1,
        "originalName": "battery-drain.png",
        "storedName": "a8f3b201-d703-4567-89ab-cdef01234567.png",
        "mimeType": "image/png",
        "sizeBytes": 1048576,
        "isRemoved": false,
        "createdAt": "2026-08-31T08:00:00.000Z"
      }
    ],
    "createdAt": "2026-08-31T08:00:00.000Z",
    "updatedAt": "2026-08-31T08:00:00.000Z"
  }
}
```
**Validation**:
- `requesterId`: required, must exist, must be active (BR-05)
- `categoryId`: required, must exist, must be active (BR-24)
- `relatedSystemId`: optional, if provided must exist and be active (BR-25)
- `summary`: required, string, trimmed, 5-200 chars after trim (BR-14)
- `description`: required, string, trimmed, 10-2000 chars after trim (BR-15)
- `requestedPriority`: required, must be one of LOW, MEDIUM, HIGH, CRITICAL
- `attachments`: optional, max 5 files per ticket (BR-10), each file <= 5MB (BR-09), allowed types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf` (BR-08)
**Errors**: 
- `400`: validation failures with field-level details `{ error: "Validation failed", details: [{ field: string, message: string }] }`
- `500`: unexpected server error

### GET /api/tickets
**Purpose**: List the selected requester's tickets with search, filter, sort, pagination
**Auth**: Requires requesterId query
**Request**: 
- Query Parameters:
  - `requesterId` (required): integer, must be active requester
  - `search` (optional): string, searches ticketNumber, summary, description (case-insensitive, partial match)
  - `category` (optional): integer categoryId to filter by
  - `status` (optional): string TicketStatus enum value
  - `priority` (optional): string RequestedPriority enum value
  - `sortBy` (optional): one of "ticketDate", "ticketNumber", "summary", "requestedPriority", "currentStatus". Default: "ticketDate"
  - `sortOrder` (optional): "asc" or "desc". Default: "desc"
  - `page` (optional): integer >= 1. Default: 1
  - `pageSize` (optional): one of 5, 10, 20. Default: 10
**Response**: 200 OK
```json
{
  "data": [
    {
      "id": 1,
      "ticketNumber": "TK-0001",
      "summary": "Laptop battery drains quickly",
      "requestedPriority": "MEDIUM",
      "currentStatus": "NEW",
      "ticketDate": "2026-08-31T08:00:00.000Z",
      "category": { "id": 2, "name": "Hardware" },
      "updatedAt": "2026-08-31T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 25,
    "totalPages": 3
  }
}
```
**Validation**: 
- `requesterId` must be active requester
- Enum/type/range validation on other parameters
**Errors**: 
- `400`: invalid requesterId, invalid query params
- `500`: unexpected server error

### GET /api/tickets/:id
**Purpose**: Get one ticket with full detail (owned by requester)
**Auth**: Requires requesterId query
**Request**: 
- Path Parameters: `id` (integer)
- Query Parameters: `requesterId` (required) for ownership check
**Response**: 200 OK
```json
{
  "data": {
    "id": 1,
    "ticketNumber": "TK-0001",
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery only lasts 2 hours...",
    "requestedPriority": "MEDIUM",
    "currentStatus": "NEW",
    "ticketDate": "2026-08-31T08:00:00.000Z",
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 3, "name": "Corporate Laptop" },
    "requester": { "id": 1, "name": "Somchai" },
    "attachments": [
      {
        "id": 1,
        "originalName": "screenshot.png",
        "mimeType": "image/png",
        "sizeBytes": 204800,
        "isRemoved": false,
        "removalReason": null,
        "removedAt": null,
        "createdAt": "2026-08-31T08:00:00.000Z"
      }
    ],
    "createdAt": "2026-08-31T08:00:00.000Z",
    "updatedAt": "2026-08-31T08:00:00.000Z"
  }
}
```
**Validation**: `requesterId` must be provided
**Errors**: 
- `400`: missing requesterId
- `403`: ticket does not belong to requester
- `404`: ticket not found
- `500`: unexpected server error

### POST /api/tickets/:ticketId/attachments
**Purpose**: Upload a file attachment to a ticket
**Auth**: Requires requesterId in body or query
**Request**: 
- Path Parameters: `ticketId` (integer)
- Content-Type: `multipart/form-data`
- Fields: `requesterId` (integer or string), `file` (the uploaded file)
**Response**: 201 Created
```json
{
  "data": {
    "id": 1,
    "originalName": "screenshot.png",
    "storedName": "abc123-uuid.png",
    "mimeType": "image/png",
    "sizeBytes": 204800,
    "isRemoved": false,
    "createdAt": "2026-08-31T08:00:00.000Z",
    "ticketId": 1
  }
}
```
**Validation**:
- Ticket must exist and belong to requesterId
- File type must be: image/jpeg, image/png, image/webp, application/pdf
- File size must be <= 5MB (5,242,880 bytes)
- Ticket must have < 5 active (non-removed) attachments
- File storage: Save to `uploads/` directory with UUID-based stored name
**Errors**: 
- `400`: invalid file type, file too large, max attachments reached, missing file
- `403`: ticket not owned by requester
- `404`: ticket not found
- `500`: unexpected server error

### GET /api/attachments/:id
**Purpose**: Get attachment metadata
**Auth**: Requires requesterId query
**Request**: 
- Path Parameters: `id` (integer)
- Query Parameters: `requesterId` for ownership check (via ticket ownership)
**Response**: 200 OK
```json
{
  "data": {
    "id": 1,
    "originalName": "screenshot.png",
    "storedName": "abc123-uuid.png",
    "mimeType": "image/png",
    "sizeBytes": 204800,
    "isRemoved": false,
    "createdAt": "2026-08-31T08:00:00.000Z",
    "ticketId": 1
  }
}
```
**Validation**: None beyond ownership
**Errors**: 
- `403`: attachment's ticket not owned by requester
- `404`: attachment not found
- `500`: unexpected server error

### GET /api/attachments/:id/download
**Purpose**: Download the actual file
**Auth**: Requires requesterId query
**Request**: 
- Path Parameters: `id` (integer)
- Query Parameters: `requesterId` for ownership check
**Response**: 200 OK
- File stream with correct Content-Type and Content-Disposition headers
**Validation**: attachment must not be removed (`isRemoved === false`)
**Errors**: 
- `400`: attachment has been removed
- `403`: not owned
- `404`: not found
- `500`: unexpected server error

### PATCH /api/attachments/:id/remove
**Purpose**: Soft-remove an attachment
**Auth**: Requires requesterId in body
**Request**: 
- Path Parameters: `id` (integer)
- Body (`application/json`)
```json
{
  "requesterId": 1,
  "removalReason": "Uploaded wrong file"
}
```
**Response**: 200 OK
```json
{
  "data": {
    "id": 1,
    "originalName": "screenshot.png",
    "isRemoved": true,
    "removalReason": "Uploaded wrong file",
    "removedAt": "2026-08-31T09:00:00.000Z"
  }
}
```
**Validation**:
- requesterId required, must own the ticket
- removalReason required, non-empty string, trimmed, 3-500 chars
- Attachment must not already be removed
**Errors**: 
- `400`: missing reason, already removed
- `403`: not owned
- `404`: not found
- `500`: unexpected server error
