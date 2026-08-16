# Lab 1 — AI Use and Reflection

**LLM/agent used:** Antigravity coding agent (Gemini 3.5 Flash) via Google Cloud Platform

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Plan Lab 1 from PDF | Used the plan to guide the workflow and break down issues. |
| 2 | Setup Foundation (Issue 1) | Found missing items (tests/lab-01/, DATABASE_URL, Bootstrap) which needed correction. |
| 3 | Fix Prisma Configuration | Applied the fix to schema.prisma for correct datasource URL. |
| 4 | Complete Missing Requirements | Re-prompted AI to fix App.tsx and create tests/lab-01/.gitkeep. |
| 5 | Verify PostgreSQL & Prisma Setup | Verified database connectivity was working as expected. |
| 6 | Plan Issue 2 | Used the structured implementation plan for the health check API. |
| 7 | Check AI Understanding of API | Clarified endpoint requirements and error messages from the lab sheet. |
| 8 | Execute the Plan for Issue 2 | Kept the generated code which correctly updated index.ts and App.tsx. |
| 9 | Automated Code Review | Verified that all acceptance criteria for Issue 2 were 100% met. |

## Reflection
Being specific about the lab criteria and verifying the AI's understanding made the prompts much better. However, I had to correct the agent during the initial project setup when it missed creating the `tests/lab-01/` folder, setting the `DATABASE_URL`, and applying the required Bootstrap UI.
