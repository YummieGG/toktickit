# Lab 4 AI Use Log

**Sprint:** Lab 4 (Issues #56–#63, PRs #65–#71)  
**Author:** Worawut Sereethai ([@YummieGG](https://github.com/YummieGG))  
**Peer Reviewer:** Chanon Lhumsa-ard ([@Snnn3](https://github.com/Snnn3))  

## LLM Used
- **Gemini 3.8 Flash (High)**

## Key Prompts

| # | Prompt Summary | Purpose | Outcome |
|---|---------------|---------|---------|
| 1 | Decompose Sprint 4 requirements into 4 core contract documents | Establish engineering specifications before coding | Created `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` with full traceability |
| 2 | Design Actions Taken schema, non-destructive migration, and idempotent seed | Add database models while preserving existing data | Added `ActionTaken` and audit models with PostgreSQL constraints and repeatable seed |
| 3 | Build Actions Taken REST API with RBAC, actor derive, and idempotency | Implement secure endpoints for action management | Built endpoints with IT Staff/Admin permissions, server actor derive, and UUID idempotency replays |
| 4 | Implement Actions Taken UI with cardinality handling and draft retention | Provide action management inside Ticket Detail | Created `ActionsTakenSection` handling 0/1/many actions, status badges, and 409 conflict recovery |
| 5 | Enforce 8-state ticket workflow, resolution gate, and atomic child cancellation | Restrict status transitions and enforce resolution checks | Implemented state machine, in-DOM confirmation dialogs, and atomic child action cancellation |
| 6 | Implement Requester and Staff operational dashboards with rolling window | Provide role-specific operational metrics and drill-downs | Built 7-day Bangkok rolling window metric cards, preview lists, and drill-down links |
| 7 | Create Playwright visual QA and responsive assertions across 3 viewports | Verify mobile responsiveness and accessibility compliance | Automated 31 screenshot artifacts across 1280px, 768px, and 375px viewports with zero horizontal overflow |
| 8 | Address peer review feedback from @Snnn3 and verify staged integration | Fix implementation defects and verify clean integration | Replaced window.confirm with accessible modal, fixed live E2E selectors, and passed all test suites |

## My Reflection

Using **Gemini 3.8 Flash (High)** helped write code and tests much faster. Having clear specs beforehand made it easy for the AI to follow requirements.

However, peer review with `@Snnn3` and manual testing were still needed to fix issues in UI accessibility and test isolation. AI is great for speed, but the developer must always verify the results.
