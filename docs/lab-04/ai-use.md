# Lab 4 AI Use Log

## LLM Used
- **Gemini Flash 3.8**
- **GPT Luna 5.6**

## Key Prompts

| # | Prompt Summary | Purpose | Outcome |
|---|---------------|---------|---------|
| 1 | Decompose Sprint 4 requirements and labsheet into core engineering contract documents | Establish engineering specification before feature coding | Created `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` with complete traceability |
| 2 | Design ActionTaken and ActionTakenEvent models with append-only audit semantics | Establish database schema for multiple activities per ticket | Defined schema additions, indexes, foreign keys, and non-destructive migration plan |
| 3 | Define 4-state Action Taken lifecycle and validation rules | Specify operational constraints for action items | Defined transitions, mandatory descriptions, conditional follow-up notes, and completion results |
| 4 | Specify resolution gate predicate and atomic child action cancellation | Prevent premature ticket resolution and preserve data integrity | Designed business rules requiring completed actions and atomic cancellation on parent cancel |
| 5 | Design concurrency protocol using Prisma Serializable transactions and versions | Prevent race conditions and silent data overwrites | Defined `expectedTicketVersion`, `expectedActionVersion`, and 409 conflict handling |
| 6 | Specify create action idempotency with persisted key and normalized payload fingerprint | Protect against duplicate submissions on network timeouts | Defined header format, hash fingerprinting, replay 200, and mismatch 409 rules |
| 7 | Define Requester and Staff operational dashboard metrics and Bangkok 7-day calendar window | Establish authoritative backend calculation contract | Formulated exact metrics, zero-count group handling, date boundaries, and bounded responses |
| 8 | Specify URL search parameter state for Staff Actions Taken drill-down page | Enable shareable, navigable, and filterable action inspection | Designed query contract with `assignee=me`, status filters, pagination, and ticket context |
| 9 | Define role authorization matrix and strict Administrator read-only boundaries | Protect inherited Lab 3 security posture while adding action write | Restricted Administrator ticket mutations while granting action writes and staff dashboard |
| 10 | Structure comprehensive test plan mapping all ACs to unit, API, integration, and E2E suites | Ensure full test coverage and traceability before implementation | Defined 24 planned test cases covering functional, security, concurrency, and performance smoke |

## My Reflection

Applying Specification-Driven Development (Spec-DD) to Lab 4 allowed us to resolve complex domain challenges—such as separating Ticket owner from Action assignees, designing atomic resolution gates, and specifying Serializable transaction boundaries—before writing a single line of application code. Having `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` aligned with the established Lab 3 contract format provides a solid foundation for implementation.

The primary engineering challenges in this sprint are managing concurrency between ticket resolution and simultaneous action mutations, and ensuring that Administrator write privileges are strictly isolated to Actions Taken without leaking into general Ticket workflow. AI served as an effective drafting assistant to systematically enforce consistency across authorization matrices, status transitions, and test matrices. However, student verification remains essential to validate that database transactions, query plans, and visual accessibility adhere to real environment constraints.
