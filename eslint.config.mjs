import next from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    // public/pdfjs/ is pdf.js's own worker bundle and vendor/ the design system's build output — both generated, never edited here
    ignores: ['.next/**', 'node_modules/**', 'drizzle/**', 'next-env.d.ts', 'design-source/**', 'public/pdfjs/**', 'vendor/**'],
  },
  ...next,
  ...nextTypescript,
  // Must come last: switches off stylistic rules that would fight Prettier.
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      /**
       * @openmaison/react ships no 'use client' directives, so importing it
       * into a Server Component fails at runtime. Everything must go through
       * the client barrier in components/ds.
       */
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@openmaison/react',
              message:
                "Import design system components from '@/components/ds' instead — it is the 'use client' barrier.",
            },
          ],
        },
      ],
    },
  },
  {
    // The barrier itself is the one place allowed to import the library.
    files: ['components/ds/index.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
]

export default eslintConfig
