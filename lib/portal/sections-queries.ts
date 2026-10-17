import 'server-only'   // libSQL never reaches the browser: every client import of this module is `import type`
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { ALL_ON, SECTIONS_KEY, WELCOME_KEY, cleanWelcome, parseSections, type PortalSections } from './sections'
import { LINKS_KEY, NO_FOOT_LINKS, parseFootLinks, type FootLinks } from './links'

/*
 * (Projects round 9 — Q-44 · Q-45) The portal's sections and welcome line, stored in `settings` under their own keys (`portal_sections`,
 * `portal_welcome`) beside round 4a's `portal`. Read by `fetchPortalLook` (every client page wears them) and by Company › Client portal;
 * written by app/portal/sections-actions.ts (Owners and Admins, `mayRunPortal`).
 */

async function readKey(key: string): Promise<unknown> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1)
  if (!row) return undefined
  try { return JSON.parse(row.value) } catch { return undefined }
}
async function writeKey(key: string, v: unknown): Promise<void> {
  const value = JSON.stringify(v)
  const updatedAt = new Date()
  await db.insert(settings).values({ key, value, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } })
}

export async function fetchPortalSections(): Promise<PortalSections> {
  const v = await readKey(SECTIONS_KEY)
  return v === undefined ? ALL_ON : parseSections(v)
}
export const savePortalSections = (s: PortalSections) => writeKey(SECTIONS_KEY, s)

/** The studio's own line, or null — the sign-in page then keeps its own heading ("Your renovation with {studio}"). */
export async function fetchPortalWelcome(): Promise<string | null> {
  const v = (await readKey(WELCOME_KEY)) as { line?: unknown } | undefined
  const line = typeof v?.line === 'string' ? cleanWelcome(v.line) : ''
  return line || null
}
export const savePortalWelcome = (line: string | null) => writeKey(WELCOME_KEY, { line: line ? cleanWelcome(line) : null })

/** (pending modules S13) The links at the foot of every portal page — the studio's privacy notice, terms and contact page — each kept only
    while it is a web address (`parseFootLinks`); none set = no foot. */
export async function fetchPortalLinks(): Promise<FootLinks> {
  const v = await readKey(LINKS_KEY)
  return v === undefined ? NO_FOOT_LINKS : parseFootLinks(v)
}
export const savePortalLinks = (l: FootLinks) => writeKey(LINKS_KEY, parseFootLinks(l))
