# Test Evidence

| Test File | Tool | Test Description |
|-----------|------|------------------|
| API-01 (health.test.ts)  | Supertest | Health endpoint returns 200 and expected JSON |
| API-02    | Supertest | Categories endpoint returns the four seeded categories |
| UI-01     | Vitest | TokTickIT heading renders |
| UI-02     | Vitest | Loading state changes to category list |
| UI-03     | Vitest | API failure displays a useful error message |

## Screenshots / Terminal Output

### API-01: Health Check Endpoint Test (`server/tests/lab-01/health.test.ts`)

<pre>
stdout | tests/lab-01/health.test.ts
Server is running on port 3000

<span style="color: #2da44e;">✓ tests/lab-01/health.test.ts</span> (1 test) <span style="color: #2da44e;">10ms</span>
  <span style="color: #2da44e;">✓ GET /api/health</span> (1)
    <span style="color: #2da44e;">✓ should return 200 and health status</span> <span style="color: #2da44e;">9ms</span>

Test Files  <span style="color: #2da44e; font-weight: bold;">1 passed</span> (1)
     Tests  <span style="color: #2da44e; font-weight: bold;">1 passed</span> (1)
Start at  15:45:40
Duration  226ms (transform 33ms, setup 0ms, import 133ms, tests 10ms, environment 0ms)
</pre>
