# Lab 2 AI Use Log

## LLM Used
- **Google Gemini (Antigravity Agent)** — Gemini 3.1 Pro High, Gemini 3.7 Flash

## Key Prompts

| # | Prompt Summary | Purpose | Outcome |
|---|---------------|---------|---------|
| 1 | Read Lab 02 PDF and summarize requirements, tech stack, and constraints | Understand the lab requirements before planning | Comprehensive summary of all deliverables, tech stack, and constraints |
| 2 | Create implementation plan for Lab 2 | Plan the development phases and file structure | 8-phase plan covering docs → DB → API → UI → tests |
| 3 | Write specification.md with FR, BR, AC, and DoD | Spec-Driven Development — create spec before code | Complete engineering specification with numbered requirements |
| 4 | Write api-spec.md with all endpoint contracts | Define REST API contract before implementation | Detailed API spec with request/response shapes and validation rules |
| 5 | Write ui-spec.md with Zen Green design tokens and screen layouts | Define UI specification before implementation | Complete UI spec with color tokens, component states, and restructured directly into 19 checklist items per course requirement as requested |
| 6 | Write tests.md with planned test matrix and AC traceability | Test-Driven Development — plan tests before code | Test plan with 44+ API tests, 29 UI tests, 9 E2E tests |
| 7 | Provide a step-by-step guide to verify Section 5 (Required Database Increment) | Guide testing database implementation and seed data | Step-by-step instructions on verifying the Prisma schema, migrations, seed idempotency, and Prisma Studio checks |
| 8 | Restructure implementation plan to vertical fullstack slices and implement Requester Context feature | Align development with labsheet fullstack feature approach | Modularized server routing with `GET /api/requesters`, created `RequesterContext`, AppShell with Zen Green theme, and `RequesterSelect` screen satisfying FR-01–03 and BR-03–07 |
| 9 | Implement Create Ticket fullstack feature with reusable UI components, validation, and auto-generated ticket numbers | Implement ticket creation obeying business rules and responsive design | Created `POST /api/tickets`, `GET /api/related-systems`, `TK-XXXX` generator, reusable Zen Green components (`Button`, `InputField`, `SelectField`, `TextAreaField`, `Badge`), responsive layout, duplicate submission prevention, and comprehensive unit tests |
| 10 | Diagnose and fix Vite runtime white screen error (`SyntaxError: Importing binding name 'Requester' is not found`) | Troubleshoot frontend module bundling error | Identified TypeScript interface import issue under esbuild; converted to `import { type Requester }` and cleaned up unused declarations to ensure successful builds |
| 11 | Review PR #22 comments, implement concurrency fix with retry loop and ticket-number unit tests, implement multipart/form-data with optional file attachments for POST /api/tickets, and integrate attachment UI with instant client validation | Address peer reviewer findings and complete Lab 2-4 criteria | Refactored `ticket-number.ts` with strict `Prisma.TransactionClient` typing and highest ticketNumber order, added advisory lock unit tests, implemented multer multipart upload with file constraints (<= 5 files, <= 5MB, JPG/PNG/WEBP/PDF), atomic attachment creation in PostgreSQL, and updated frontend Attachment section in `CreateTicket.tsx` with error display and state preservation |

## My Reflection

The AI accurately fulfilled all requirements, effectively adapting to vertical fullstack slices, generating clean code and tests, and quickly diagnosing runtime bundling errors with minimal human refinement.