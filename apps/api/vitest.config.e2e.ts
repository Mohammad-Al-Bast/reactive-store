import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Every file shares one database, so run them one at a time: counts, rate
    // limits and the alert outbox would otherwise interfere across files.
    fileParallelism: false,
    // No background alert sender unless a test turns it on; tests call processDue().
    env: { NOTIFICATIONS_WORKER: 'off' },
  },
});
