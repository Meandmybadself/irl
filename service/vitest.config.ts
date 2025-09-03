import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    setupFiles: ['./src/test-setup.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  }
})