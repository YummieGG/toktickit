# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | Pass |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | Pass |
| 3 | Vitest | Heading renders | Pass |
| 4 | Vitest | Success state shows Online + category list | Pass |
| 5 | Vitest | Error state shows Offline + message | Pass |

Paste your passing terminal output / screenshot below.

### Backend API Tests (`server/tests/lab-01/`)

```text
 RUN  v4.1.10 /Users/yummiegg/Workspaces/Code/Y3/SWE_CPE334/lab1-4/toktickit/server

 ✓ tests/lab-01/API-02.test.ts (1 test) 14ms
 ✓ tests/lab-01/health.test.ts (1 test) 13ms

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  22:20:24
   Duration  331ms (transform 77ms, setup 0ms, import 330ms, tests 27ms, environment 0ms)
```

### Frontend UI Tests (`client/tests/lab-01/`)

```text
 RUN  v4.1.10 /Users/yummiegg/Workspaces/Code/Y3/SWE_CPE334/lab1-4/toktickit/client

 ✓ tests/lab-01/UI-02.test.tsx (1 test) 27ms
 ✓ tests/lab-01/UI-03.test.tsx (1 test) 29ms
 ✓ tests/lab-01/UI-01.test.tsx (1 test) 71ms

 Test Files  3 passed (3)
      Tests  3 passed (3)
   Start at  12:18:20
   Duration  954ms (transform 149ms, setup 271ms, import 229ms, tests 126ms, environment 1.80s)
```
