# Lab 3 — AI Use and Reflection

**LLM/agent used:** OpenAI Codex coding agent (GPT-5-based)

## Selected key prompts (6–10)

| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Read `PlanLab/PLAN.md` and the related Lab 3 specifications | Used the plan and specifications to identify the required implementation boundary. |
| 2 | Read and implement GitHub Issue #39 without changing the issue or creating a PR | Used the issue acceptance criteria to guide the User schema, migration, seed, and authentication foundation. |
| 3 | Add and commit the implementation without pushing | Reviewed the resulting commits and recorded the commit names for the repository owner. |
| 4 | Cancel the commits and reset when the implementation exceeded Issue #39 scope | Reset to the engineering-contract baseline before reimplementing only the Issue #39 scope. |
| 5 | Compare the local code with every Issue #39 acceptance criterion | Used the review to identify missing PostgreSQL integration evidence, test boundaries, and deferred follow-up work. |
| 6 | Fix incomplete or missing Lab 3 specifications | Updated the specification, API, UI, and test documents to distinguish Issue #39 from later Lab 3 issues. |
| 7 | Implement the authentication foundation and focused tests | Added the User/session/login-attempt schema, migration, seed/backfill, password hashing, auth APIs, Login UI, Change Password UI, and tests. |
| 8 | Verify the implementation with tests, builds, Prisma checks, and lint | Used the results as evidence while explicitly recording that the configured PostgreSQL integration could not be executed. |
| 9 | Review the code against the Issue #39 criteria and document the review | Added the reviewer record and listed the remaining findings without claiming full completion. |

## Reflection

Using the issue acceptance criteria together with the Lab 3 specifications helped keep the implementation focused on the authentication foundation. Resetting the earlier commits was necessary after the review identified work belonging to later issues. The most important limitation was the unavailable PostgreSQL credentials, so the migration and seed were verified through source-level checks and automated tests but not through a clean database execution. Human review is still required before committing or integrating the changes.
