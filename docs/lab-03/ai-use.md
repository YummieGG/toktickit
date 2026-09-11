# Lab 3 — AI Use and Reflection

**LLM/agent used:** OpenAI Codex coding agent (GPT-5-based), with a requested Luna xhigh implementation pass.

## Key prompts used

| # | Prompt used | Result / use of the result |
|---|---|---|
| 1 | Read `labsheet/md/Lab_03_labsheet.md` and `PlanLab/PLAN.md`, then prepare for the next instruction. | Established the Lab 3 requirements, engineering constraints, and implementation boundary. |
| 2 | Compare GitHub Issues #38–#44 with `PlanLab/PLAN.md` in detail; use subagents if useful. | Built traceability between the issue sequence, the plan, and the Lab 3 delivery scope. |
| 3 | Issue #1 is already implemented; determine whether work can continue with Issue #39 using the Lab 3 labsheet. | Confirmed that the existing work could be treated as a dependency and that Issue #39 should continue from the documented baseline. |
| 4 | Review the local TokTickIT code against Issue #39 from fixed point `lab3-staging`; prepare review-ready changes, with no PR or merge. | Compared standards and acceptance criteria, identified missing auth/test evidence, and recorded the review boundary. |
| 5 | Read `issue-39-code-review.md`, `PlanLab/PLAN.md`, `specification.md`, `api-spec.md`, and `ui-spec.md`; fix the findings and use Luna at xhigh, without pushing or merging. | Implemented/remediated the User/session/login-attempt foundation, password handling, auth API/UI behavior, migration safeguards, and focused tests while keeping later-issue work separate. |
| 6 | Teach how to test all work for Issue #39 step by step, including the expected results, and write it as Markdown in `docs/lab-03`. | Produced the testing guides covering unit/API/UI tests, build/lint, migration, seed idempotency, concurrency, cleanup, canonical email, and collision protection. |
| 7 | Validate the real test outputs and troubleshoot PostgreSQL, Docker, Prisma Studio, login, hash comparison, migration paths, and shell commands; update the guide when a command is wrong. | Verified passing test/build results, corrected documentation mistakes such as the missing `FROM "User"`, wrong migration names, missing `updatedAt`, and incorrect database targets. |

## Reflection

AI accelerated the review, implementation, and test-documentation work by turning the Lab plan and issue criteria into executable steps. Iterative human verification was essential: real command output exposed documentation and environment mistakes that unit tests alone did not catch. The final scope still requires human judgment, especially for deferred Admin reset/deactivation work and any push or merge decision.
