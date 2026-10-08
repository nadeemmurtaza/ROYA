import path from 'node:path';
import { defineConfig } from 'vitest/config';

/** Pure-logic specs only: nothing here renders a component. The browser flows are `e2e/`. */
export default defineConfig({
  test: { environment: 'node', globals: true, include: ['src/**/*.spec.ts'] },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
});
