import type { Metadata } from 'next'

/**
 * (pending modules S41b-2) What every client page's layout says in its metadata: no OpenMaison mark in the browser's tab and no "install
 * OpenMaison" — a client's link wears only their studio's name (S02's rule for the link cards, S03's for the papers). The studio app and the
 * website keep the mark and the manifest from the root layout (app/layout.tsx, public/manifest.json). Spread it into a layout's `metadata`.
 */
export const CLIENT_PAGE_METADATA: Pick<Metadata, 'icons' | 'manifest'> = { icons: null, manifest: null }
