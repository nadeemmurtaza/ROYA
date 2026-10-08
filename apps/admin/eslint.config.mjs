import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  // next/core-web-vitals carries only a handful of jsx-a11y rules; the
  // recommended set is the rest, and the cheapest large accessibility win
  // available: the alternative is hand-written aria with nothing checking it.
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'plugin:jsx-a11y/recommended'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // A label that wraps its control and a few spans of text is still a
      // labelled control; the default only looks two elements deep.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    },
  },
];
