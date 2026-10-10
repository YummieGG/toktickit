# Lab 4 AI Use Log

## LLM Used
- **Gemini Flash 3.8**
- **GPT Luna 5.6**

## Key Prompts

| # | Prompt Summary | Purpose | Outcome |
|---|---------------|---------|---------|
| 1 | Decompose Sprint 4 requirements into core engineering contract documents | Establish engineering specification before coding | Drafted `specification.md`, `api-spec.md`, `ui-spec.md`, and `tests.md` with initial traceability |
| 2 | Align document structures and formatting with Lab 3 documentation standard | Ensure 1:1 structural consistency across contract files | Refactored all 4 contract files, reviewer log, and visual checklist to match Lab 3 structure |
| 3 | Define Action Taken lifecycle, concurrency guards, and resolution gate rules | Lock down business rules and race condition handling | Specified Serializable transactions, version checks, and atomic child cancellation |

## My Reflection

In this contract phase, AI helped draft and organize the specification documents and complex business rules much faster.

However, careful review was still needed to ensure the structure aligned with Lab 3 standards and that edge cases—such as parent ticket `updatedAt` touches and strict Admin permissions—were accurately defined. I will continue updating this log as implementation progresses.
