/**
 * Factual app config only.
 *
 * Product copy, plan catalogues and domain labels were REMOVED — they were
 * invented before the Figma mocks were available. Anything that appears on a
 * screen must come from the mocks.
 */
export const siteConfig = {
  name: 'OpenMaison',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const
