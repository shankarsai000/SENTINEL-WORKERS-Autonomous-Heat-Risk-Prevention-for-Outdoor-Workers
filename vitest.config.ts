import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 90000,
    hookTimeout: 30000,
  },
});
