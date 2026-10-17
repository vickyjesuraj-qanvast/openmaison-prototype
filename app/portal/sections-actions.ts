'use server'

import { revalidatePath } from 'next/cache'
import { fetchViewer } from '@/lib/leads/visibility'
import { PORTAL_SETUP_RULE, mayRunPortal } from '@/lib/portal/model'
import { currentPortalSlug } from '@/lib/portal/queries'
import { WELCOME_MAX, cleanWelcome, defaultWelcome, isSectionKey, type PortalSections } from '@/lib/portal/sections'
import { fetchPortalLinks, fetchPortalSections, fetchPortalWelcome, savePortalLinks, savePortalSections, savePortalWelcome } from '@/lib/portal/sections-queries'
import { FOOT_LINKS, footLinkProblem, parseFootLinks, type FootLinks } from '@/lib/portal/links'
import { fetchBrand } from '@/lib/templates/queries'
import { shortStudioName } from '@/lib/settings/types'

/*
 * (Projects round 9 — Q-44 · Q-45 · Q-49) Company › Client portal › Set-up: What clients can see (the six sections) and the welcome line —
 * (pending modules S13) and the privacy notice, terms and contact page linked at the foot of every page.
 * Owners and Admins change them (`mayRunPortal`, checked here); everyone else reads. A refusal answers `{ error: <the rule> }`.
 */

type Refusal = { error: string }
async function forSetup(): Promise<Refusal | null> {
  const viewer = await fetchViewer()
  return mayRunPortal(viewer.role) ? null : { error: PORTAL_SETUP_RULE }
}
const touch = async () => { revalidatePath('/company/portal', 'layout'); revalidatePath(`/my/${await currentPortalSlug()}`, 'layout') }

/** One section on or off for every client. Answers every section as it now stands. */
export async function setPortalSection(key: string, on: boolean): Promise<Refusal | { sections: PortalSections }> {
  const refused = await forSetup()
  if (refused) return refused
  if (!isSectionKey(String(key))) return { error: 'There is no such part of the portal' }
  const sections = { ...(await fetchPortalSections()), [key]: on === true }
  await savePortalSections(sections)
  await touch()
  return { sections }
}

/** The welcome line — plain text, up to WELCOME_MAX characters; empty, or the sign-in page's own words, keeps none. Answers the one before
    it, for Undo. */
export async function setPortalWelcome(input: { line: string }): Promise<Refusal | { line: string | null; previous: string | null }> {
  const refused = await forSetup()
  if (refused) return refused
  const raw = typeof input?.line === 'string' ? input.line : ''
  if (raw.replace(/\s+/g, ' ').trim().length > WELCOME_MAX) return { error: `Keep the welcome line to ${WELCOME_MAX} characters` }
  const brand = await fetchBrand()
  const typed = cleanWelcome(raw)
  const line = typed && typed !== defaultWelcome(shortStudioName(brand.details.name)) ? typed : null
  const previous = await fetchPortalWelcome()
  await savePortalWelcome(line)
  await touch()
  return { line, previous }
}

/**
 * (pending modules S13 — card held:client-portal; 1.0's Footer Links) The studio's privacy notice, terms and contact page, linked at the foot of
 * every portal page and the sign-in page. Each is a web address on the studio's own site, or empty (shown nowhere). A typed value that is not a
 * web address is refused with the field's name — nothing is saved. Answers the links as saved and the ones before them, for Undo.
 */
export async function setPortalLinks(input: Partial<Record<keyof FootLinks, string | null>>): Promise<Refusal | { links: FootLinks; previous: FootLinks }> {
  const refused = await forSetup()
  if (refused) return refused
  for (const d of FOOT_LINKS) {
    const raw = typeof input?.[d.key] === 'string' ? (input[d.key] as string) : ''
    const problem = raw.trim() ? footLinkProblem(raw) : null
    if (problem) return { error: `${d.field}: ${problem.charAt(0).toLowerCase()}${problem.slice(1)}` }
  }
  const links = parseFootLinks({ privacy: input?.privacy ?? null, terms: input?.terms ?? null, contact: input?.contact ?? null })
  const previous = await fetchPortalLinks()
  await savePortalLinks(links)
  await touch()
  return { links, previous }
}
