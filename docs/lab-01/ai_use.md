# AI Use and Reflection

I used the Antigravity coding agent through my Google Cloud Platform account. I mainly used Gemini 3.5 Flash as the LLM with a thinking level of High.

| Prompt Name | Actual Prompt Text | My Reflection |
| :--- | :--- | :--- |
| **1. Plan Lab 1** | Read Lab1_Labsheet.pdf thoroughly, summarize technology constraints and required tech stack, and break down the workflow into 4 GitHub Issues with acceptance criteria. | Worked in one shot. AI accurately parsed the PDF, summarized technology constraints, and created an implementation guide. |
| **2. Setup Foundation** | Setup React+Vite+Bootstrap client and Express+Prisma+TypeScript server for Issue 1. | AI setup the project to a certain level, but during review we found missing parts: `server/tests/lab-01/` folder was not created, `schema.prisma` lacked `DATABASE_URL`, and `App.tsx` still used default Vite code instead of Bootstrap UI. |
| **3. Fix Prisma Configuration** | Fix `schema.prisma` datasource URL and generator provider. | AI updated `schema.prisma` to include `url = env("DATABASE_URL")` and set `prisma-client-js` generator correctly. |
| **4. Complete Missing Requirements** | Fix all missing Issue 1 items based on the review feedback (App.tsx UI and tests/lab-01 directory). | Worked as requested. AI updated `App.tsx` with a clean Bootstrap layout and created `server/tests/lab-01/.gitkeep`. |
| **5. Verify PostgreSQL & Prisma Setup** | Configure Prisma schema and verify PostgreSQL database connectivity. | Worked as expected. AI initialized Prisma schema with correct DATABASE_URL environment variable. |