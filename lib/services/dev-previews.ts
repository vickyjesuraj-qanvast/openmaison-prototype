/*
 * (pending modules S34 · S41) The developers' own pages — a sent email's page (/api/dev/email-preview) and 1.0's AI sandboxes as a bench
 * (/dev/ai-bench). No studio menu, the rail, Tools, ⌘K or a phone's More links either. Open while developing (`next dev`); a production build
 * answers 404 unless the server is started with OPENMAISON_DEV_PREVIEWS=1 (1.0's dev previews were the same: there for the developers, never
 * for a studio). Read at request time — never at build time.
 */
export function devPreviewsOpen(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.OPENMAISON_DEV_PREVIEWS === '1'
}
