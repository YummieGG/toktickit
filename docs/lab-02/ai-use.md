# Lab 2 AI Use Log

## LLM Used
- **Google Gemini (Antigravity Agent)** — Gemini 3.1 Pro High, Gemini 3.7 Flash

## Key Prompts

| # | Prompt Summary | Purpose | Outcome |
|---|---------------|---------|---------|
| 1 | Read Lab 02 PDF and summarize requirements, tech stack, and constraints | Understand lab requirements before planning | Comprehensive summary of deliverables, tech stack, and constraints |
| 2 | Create implementation plan for Lab 2 | Plan development phases and file structure | 8-phase plan covering docs → DB → API → UI → tests |
| 3 | Write specification.md with FR, BR, AC, and DoD | Spec-Driven Development — engineering spec before code | Complete engineering specification with numbered requirements |
| 4 | Write api-spec.md and ui-spec.md with Zen Green design tokens | Define REST API contracts and UI specification | Detailed REST contracts, color tokens, component states, and 19-item UI checklist |
| 5 | Write tests.md with planned test matrix and AC traceability | Test-Driven Development — plan test suite before code | Test plan mapping ACs to API, UI, and E2E test files |
| 6 | Provide step-by-step guide to verify database increment and seed idempotency | Verify schema migrations and seed idempotency | Step-by-step instructions verifying Prisma migrations and idempotent seeds |
| 7 | Implement Requester Context fullstack slice (API, Context, AppShell, Selector) | Simulated multi-user context and requester switching | Server route `GET /api/requesters`, `RequesterContext`, AppShell, and `RequesterSelect` screen |
| 8 | Implement Create Ticket fullstack slice with reusable UI components and validations | Ticket submission, TK-XXXX generation, and client/server validation | `POST /api/tickets`, sequence generator, reusable Zen Green components, and validation rules |
| 9 | Diagnose and fix Vite bundling error (`SyntaxError: Importing binding name 'Requester' is not found`) | Troubleshoot frontend module bundling error | Converted to `import { type Requester }` to ensure clean TypeScript/Vite builds |
| 10 | Implement testing and release criteria for Issue #18 | Complete test suite, responsive checks, and release verification | Added E2E flow, expanded enum/boundary tests, server build config, and updated traceability |

## My Reflection

Using AI with clear specifications helped speed up writing code and tests significantly. When given detailed requirements and test cases upfront, the AI could generate the fullstack features and components accurately.

However, human review was still essential. The peer review with `@Snnn3` helped catch edge cases that the AI initially missed—such as database concurrency issues during ticket generation. Giving clear feedback allowed the AI to quickly fix these problems. Overall, AI works great as a pair programming assistant, but the developer must always review and verify the final code.
