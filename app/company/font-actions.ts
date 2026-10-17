'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { studioFonts } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { fetchViewer } from '@/lib/leads/visibility'
import { refuse, type Refusal } from '@/lib/company/template-rules'
import { FONT_FAMILIES, type FontFace } from '@/lib/templates/model'
import { cleanFamily, dataUrlBytes, dataUrlHead, FONT_FAMILY_NEEDED, FONT_FAMILY_TAKEN, FONT_LICENCE_NEEDED, FONT_MAX_BYTES, FONT_NOT_A_FONT, FONT_RULE, FONT_TOO_BIG, sniffFont } from '@/lib/templates/fonts'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

/**
 * (pending modules S11 — card held:quote-templates, "fonts a studio uploads"; 1.0's studio_assets type `font`) Company › Templates › Brand kit
 * › Fonts: upload one face of a family, remove it (softly, with Undo), put it back. Owners and Admins, as the rest of the kit (BRAND_RULE);
 * a refusal answers `{ error: <the rule> }`. The file travels inside the one object argument (a long string never rides bare).
 */

const runsKit = async () => { const v = await fetchViewer(); return v.role === 'Owner' || v.role === 'Admin' }
const touch = () => { revalidatePath('/company', 'layout'); revalidatePath('/templates', 'layout'); revalidatePath('/quotes', 'layout') }

export async function uploadStudioFont(input: { family: string; weight: number; italic: boolean; fileName: string; dataUrl: string; licensed: boolean }): Promise<{ id: string; face: FontFace } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  if (!(await runsKit())) return refuse(FONT_RULE)
  if (!input.licensed) return refuse(FONT_LICENCE_NEEDED)
  const family = cleanFamily(input.family ?? '')
  if (!family) return refuse(FONT_FAMILY_NEEDED)
  /* a curated face keeps its own files: an upload under its name would print in two looks */
  if ((FONT_FAMILIES as readonly string[]).some((f) => f.toLowerCase() === family.toLowerCase())) return refuse(FONT_FAMILY_TAKEN)
  const data = typeof input.dataUrl === 'string' ? input.dataUrl : ''
  const head = dataUrlHead(data)
  const format = head ? sniffFont(head) : null
  if (!format) return refuse(FONT_NOT_A_FONT)
  const size = dataUrlBytes(data)
  if (size > FONT_MAX_BYTES) return refuse(FONT_TOO_BIG)
  const weight: FontFace['weight'] = input.weight === 700 ? 700 : input.weight === 600 ? 600 : 400
  const italic = !!input.italic
  /* the same face of the same family again replaces the one before (removed softly, so it can still come back) */
  const now = new Date()
  await db.update(studioFonts).set({ deletedAt: now, deletedBy: stampBy }).where(and(isNull(studioFonts.deletedAt), sql`lower(${studioFonts.family}) = ${family.toLowerCase()}`, eq(studioFonts.weight, weight), eq(studioFonts.italic, italic)))
  const id = `font-${randomUUID()}`
  const fileName = (input.fileName ?? '').replace(/[\\/]/g, '').slice(0, 120) || `${family}.${format === 'truetype' ? 'ttf' : format === 'opentype' ? 'otf' : format}`
  await db.insert(studioFonts).values({ id, family, weight, italic, format, fileName, size, data, licensedBy: stampBy, createdBy: stampBy, createdAt: now })
  touch()
  return { id, face: { id, family, weight, italic, format } }
}

/** Remove a font — softly: the snackbar's Undo puts it back (`restoreStudioFont`). */
export async function removeStudioFont(input: { id: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  if (!(await runsKit())) return refuse(FONT_RULE)
  const [row] = await db.select({ id: studioFonts.id, deletedAt: studioFonts.deletedAt }).from(studioFonts).where(eq(studioFonts.id, input.id)).limit(1)
  if (!row) return refuse('That font is no longer there — refresh the page.')
  if (!row.deletedAt) await db.update(studioFonts).set({ deletedAt: new Date(), deletedBy: stampBy }).where(eq(studioFonts.id, input.id))
  touch()
  return { ok: true }
}

export async function restoreStudioFont(input: { id: string }): Promise<{ ok: true } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const stampBy = await sessionMemberId()   // (pending modules S43A) who writes — this browser's member, read before any write
  if (!(await runsKit())) return refuse(FONT_RULE)
  const [row] = await db.select({ id: studioFonts.id, family: studioFonts.family, weight: studioFonts.weight, italic: studioFonts.italic }).from(studioFonts).where(eq(studioFonts.id, input.id)).limit(1)
  if (!row) return refuse('That font is no longer there — refresh the page.')
  /* one live file per face: a file uploaded for the same face since steps aside for the one coming back */
  await db.update(studioFonts).set({ deletedAt: new Date(), deletedBy: stampBy }).where(and(isNull(studioFonts.deletedAt), sql`lower(${studioFonts.family}) = ${row.family.toLowerCase()}`, eq(studioFonts.weight, row.weight), eq(studioFonts.italic, row.italic)))
  await db.update(studioFonts).set({ deletedAt: null, deletedBy: null }).where(eq(studioFonts.id, input.id))
  touch()
  return { ok: true }
}
