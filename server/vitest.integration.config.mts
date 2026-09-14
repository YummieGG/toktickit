import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/lab-03/users-admin.integration.test.ts'],
    fileParallelism: false,
  },
});
