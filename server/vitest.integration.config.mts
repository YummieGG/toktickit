import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/lab-03/*.integration.test.ts'],
    fileParallelism: false,
  },
});
