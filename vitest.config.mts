import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    // Test tích hợp cần PostgreSQL thật nên không chạy trong `pnpm test` / CI.
    // Dùng `pnpm test:int` sau khi đã dựng database.
    exclude: ['node_modules/**', 'tests/integration/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
});
