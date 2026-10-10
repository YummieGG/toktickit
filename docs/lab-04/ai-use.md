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

For Lab 4, using AI helped break down the new requirements—especially the Actions Taken lifecycle, resolution gates, and role dashboards—into clear engineering contracts much faster.

Manual checking was still necessary to ensure edge cases were properly addressed, such as refreshing the parent ticket's `updatedAt` on action mutations and keeping Admin permissions correctly scoped. I will keep updating this log as we progress through Lab 4.
