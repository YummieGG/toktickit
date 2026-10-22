# Lab 4 AI Use Log

**Sprint:** Lab 4 (Issues #56–#63, PRs #65–#71)  
**Author:** Worawut Sereethai ([@YummieGG](https://github.com/YummieGG))  
**Peer Reviewer:** Chanon Lhumsa-ard ([@Snnn3](https://github.com/Snnn3))  

## LLM Used
- **Claude 3.7 Sonnet** (Anthropic)
- **GPT-4o** (OpenAI)
- **Gemini 1.5 Pro / Flash** (Google)

## Key Prompts

| # | Prompt Summary | Purpose | Outcome |
|---|---------------|---------|---------|
| 1 | Decompose Sprint 4 requirements into 4 core contract documents | Establish unambiguous engineering specification before implementation | Authored `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` with 21 agreed design decisions and 100% AC traceability |
| 2 | Design Actions Taken data models, migrations, and idempotent seed | Create database schema with data integrity and legacy preservation | Created `ActionTaken`, `ActionEvent`, and `ActionCreationRequest` models with PostgreSQL CHECK constraints and non-destructive migrations |
| 3 | Build Actions Taken API with RBAC, actor derive, and idempotency | Implement secure REST endpoints for action management | Built endpoints with IT Staff/Admin permissions, server-derived performer identity, UUID idempotency replays, and optimistic concurrency |
| 4 | Implement Actions Taken UI with cardinality handling and draft preservation | Provide interactive action management in Ticket Detail | Created `ActionsTakenPanel` handling 0, 1, and many actions, status badges, follow-up flags, and draft retention on 409 conflict |
| 5 | Enforce 8-state ticket workflow and atomic resolution gate | Restrict ticket status transitions and enforce resolution requirements | Built state machine with in-DOM confirmation dialogs, resolution gate predicate, and atomic child action cancellation |
| 6 | Implement Requester and Staff operational dashboards | Provide role-specific operational metrics and drill-downs | Implemented 7-day Bangkok rolling window metric cards, bounded preview lists, and synchronized query-param drill-down links |
| 7 | Create Playwright visual QA suite across 3 viewports | Verify responsive layouts and accessibility compliance | Automated capture of 31 screenshot artifacts across 1280px, 768px, and 375px viewports verifying `scrollWidth <= innerWidth` |
| 8 | Address peer review feedback from @Snnn3 on PRs #68, #69, and #70 | Resolve implementation gaps and improve code quality | Replaced window.confirm with accessible focus-trapped modal, fixed live E2E selectors, added desktop navbar flex-wrap, and bound error banners |
| 9 | Harden concurrency test isolation and PostgreSQL transaction races | Prevent test flakiness and verify real database isolation | Built PG-01 competing resolve vs action test, added Prisma mock transaction isolation, and eliminated port collisions |
| 10 | Verify staged integration and prepare submission documentation | Ensure all feature increments integrate cleanly without regression | Executed full test suites (430 server, 159 client, 32 E2E green), verified build/lint, and prepared 9-part submission draft |

## My Reflection

Developing Lab 4 with AI assistance under a Specification-Driven Development (Spec DD) and Test-Driven Development (TDD) workflow significantly accelerated development speed and code quality, while highlighting crucial areas where human critical thinking and peer review remain indispensable.

### What Worked Well with AI:
1. **Contract-Driven Boilerplate & Test Scaffolding**: Providing clear, pre-negotiated specifications (`specification.md`, `api-spec.md`) allowed AI coding agents to generate extensive test suites and data models that cleanly adhered to agreed contracts with minimal deviation.
2. **State Machine & Predicate Logic**: Implementing the 8-state ticket transition matrix and the 3-condition resolution gate (`hasActiveActions`, `hasCompletedWithResult`, `hasUnresolvedFollowUp`) was smooth and error-free when structured as pure functions with strict type definitions.
3. **Responsive UI & Design Tokens**: AI effectively applied Zen Green design system tokens and generated responsive Bootstrap layouts that adapted between desktop tables and mobile stacked cards.

### Where AI Needed Human Correction & Peer Review:
1. **Real Browser Accessibility & Modals**: The initial AI implementation used `window.confirm()`, which was inaccessible and violated UI specifications. When converted to an in-DOM modal, human review and peer feedback from `@Snnn3` were required to properly trap keyboard focus, handle Escape key dismissal, and preserve draft state during API error recovery.
2. **Test Environment Isolation & Concurrency**: In parallel test execution, AI-generated mocks bled transaction state into unrelated regression test suites. Manual intervention was necessary to isolate Prisma mocks with `mockImplementationOnce` and guard server port listening during Vitest runs.
3. **Subtle Timezone & Rolling Window Edge Cases**: Calculating the 7-day rolling window required careful alignment between UTC database timestamps and `Asia/Bangkok` calendar days to prevent day-rollback bugs on the dashboard UI.

In conclusion, AI serves as a powerful accelerator for structured engineering tasks, but the developer must maintain ownership of architecture, environment quirks, and rigorous verification through peer code reviews.
