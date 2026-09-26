'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { eq, inArray, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, priceBookItems, studioMaterials } from '@/lib/db/schema'
import { actingMember } from '@/lib/contracts/automation'
import { fetchViewer } from '@/lib/leads/visibility'
import { CATALOGUE_CATEGORY_LIST } from '@/lib/visualizer/catalogue'
import { MATERIAL_PURGE_RULE, materialChangeBlock, materialPurgeRule, materialRestoreRule, MATERIALS_DELETE_RULE, MATERIALS_RESTORE_RULE } from '@/lib/visualizer/policy'

/*
 * Company › Materials (REG-677, Q-18) — the studio's own swatches: 1.0's `studio_materials` library, which every member could add to from
 * the editor and nobody could manage anywhere (D, E). Any member adds (1.0); whoever added one, an Owner or an Admin changes or deletes
 * it; deletes are soft with Undo and the Deleted sheet. A material can name the Price book item it is quoted as (Add to quote, Q-17).
 * (wave E, E5) Every change stamps `updated_by` beside `updated_at` (Save in the dialog, Rename), so the card's "edited … by" names whoever
 * changed it last; a restore keeps both (F125); a new one has none — the card then names whoever added it.
 */

type Err = { error: string }
/** (verify round 1, F129) A many-at-once restore or delete the rule refused in part says how many stayed and why; a refusal of every one
    is an `Err`, never a bare "done". */
type Kept = { kept: number; reason: string | null }
const makerName = async (id: string | null) => (id ? (await db.select({ name: members.name }).from(members).where(eq(members.id, id)))[0]?.name ?? null : null)
export type MaterialInput = { name: string; category: string; hex: string; finish?: string; imageUrl?: string | null; description?: string | null; priceBookItemId?: string | null; folderId?: string | null }
const FINISHES = ['matte', 'gloss', 'satin', 'textured', 'natural']
const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const image = (v: unknown): string | null => { const s = String(v ?? ''); return (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 4_000_000) || /^\/visualizer\/demo\/[a-z0-9-]+\.jpg$/.test(s) ? s : null }   // an upload, or a demo swatch (R61)
function valid(m: MaterialInput): Omit<MaterialInput, 'imageUrl'> & { imageUrl: string | null } | Err {
  const name = clean(m.name, 60); if (!name) return { error: 'Give the material a name.' }
  const category = (CATALOGUE_CATEGORY_LIST as readonly string[]).includes(m.category) && !m.category.startsWith('Gush') ? m.category : 'Paints'
  const hex = /^#[0-9A-Fa-f]{6}$/.test(m.hex) ? m.hex.toUpperCase() : null; if (!hex) return { error: 'Pick the material’s colour.' }
  if (m.imageUrl && !image(m.imageUrl)) return { error: 'We can read JPG, PNG and WebP swatches up to 3 MB.' }
  return { name, category, hex, finish: FINISHES.includes(m.finish ?? '') ? m.finish : 'matte', imageUrl: m.imageUrl ? image(m.imageUrl) : null, description: clean(m.description, 240) || null, priceBookItemId: m.priceBookItemId ?? null, folderId: m.folderId ?? null }
}
const touch = () => { revalidatePath('/company/materials'); revalidatePath('/visualizer', 'layout') }

export async function createStudioMaterial(input: MaterialInput): Promise<{ id: string } | Err> {
  const v = valid(input); if ('error' in v) return v
  if (v.priceBookItemId) { const [p] = await db.select({ id: priceBookItems.id }).from(priceBookItems).where(eq(priceBookItems.id, v.priceBookItemId)); if (!p) v.priceBookItemId = null }
  const id = randomUUID(), at = new Date(), me = await actingMember()
  await db.insert(studioMaterials).values({ id, name: v.name, category: v.category, imageUrl: v.imageUrl, hex: v.hex, finish: v.finish ?? 'matte', description: v.description ?? null, folderId: v.folderId ?? null, priceBookItemId: v.priceBookItemId ?? null, uploadedBy: me, isActive: true, createdAt: at, updatedAt: at })
  touch(); return { id }
}
async function mine(id: string) {
  const [m] = await db.select().from(studioMaterials).where(eq(studioMaterials.id, id)); if (!m) return null
  const block = materialChangeBlock(await fetchViewer(), m.uploadedBy, await makerName(m.uploadedBy))
  return { m, block }
}
export async function updateStudioMaterial(id: string, input: MaterialInput): Promise<{ ok: true } | Err> {
  const got = await mine(id); if (!got) return { error: 'That material is gone.' }
  if (got.block) return { error: got.block }
  const v = valid({ ...input, imageUrl: input.imageUrl === undefined ? got.m.imageUrl : input.imageUrl }); if ('error' in v) return v
  await db.update(studioMaterials).set({ name: v.name, category: v.category, hex: v.hex, finish: v.finish ?? 'matte', imageUrl: v.imageUrl, description: v.description ?? null, priceBookItemId: v.priceBookItemId ?? null, updatedAt: new Date(), updatedBy: await actingMember() }).where(eq(studioMaterials.id, id))
  touch(); return { ok: true }
}
export async function renameStudioMaterial(id: string, name: string): Promise<{ ok: true } | Err> {
  const got = await mine(id); if (!got) return { error: 'That material is gone.' }
  if (got.block) return { error: got.block }
  const n = clean(name, 60); if (!n) return { error: 'Give the material a name.' }
  if (n === got.m.name) return { ok: true }   // (wave E, E5) the same name is no change — the card keeps its "edited … by"
  await db.update(studioMaterials).set({ name: n, updatedAt: new Date(), updatedBy: await actingMember() }).where(eq(studioMaterials.id, id))
  touch(); return { ok: true }
}
export async function duplicateStudioMaterial(id: string): Promise<{ id: string } | Err> {
  const [m] = await db.select().from(studioMaterials).where(eq(studioMaterials.id, id)); if (!m) return { error: 'That material is gone.' }
  return createStudioMaterial({ name: `${m.name.slice(0, 60 - ' (copy)'.length).trimEnd()} (copy)`, category: m.category, hex: m.hex, finish: m.finish, imageUrl: m.imageUrl, description: m.description, priceBookItemId: m.priceBookItemId, folderId: m.folderId })
}
export async function deleteStudioMaterials(ids: string[]): Promise<{ deleted: number } & Kept | Err> {
  const all = [...new Set(ids)]
  let n = 0, kept = 0, one: string | null = null
  for (const id of all) {
    const got = await mine(id); if (!got) continue
    if (got.block) { kept++; one = got.block; continue }
    await db.update(studioMaterials).set({ deletedAt: new Date(), isActive: false }).where(eq(studioMaterials.id, id)); n++
  }
  /* a refusal reads as the rule itself, so the page's "Couldn’t delete the materials — only whoever added a material…" says it once */
  if (!n && kept) return { error: all.length === 1 && one ? one : MATERIALS_DELETE_RULE }
  touch(); return { deleted: n, kept, reason: kept ? MATERIALS_DELETE_RULE : null }
}
/** Restore (the snackbar's Undo, the Deleted sheet) — (audit 2026-09-26, F129 · F204) the delete's own rule on the server too, and (F125) the
    material back where it was: its `updatedAt` untouched, so it keeps its place and its "edited" line. */
export async function restoreStudioMaterials(ids: string[]): Promise<{ restored: number } & Kept | Err> {
  const viewer = await fetchViewer(), all = [...new Set(ids)]
  const rows = all.length ? await db.select().from(studioMaterials).where(inArray(studioMaterials.id, all)) : []
  if (all.length === 1 && !rows[0]) return { error: 'That material is gone.' }
  const deleted = rows.filter((m) => m.deletedAt)
  const ok = deleted.filter((m) => !materialChangeBlock(viewer, m.uploadedBy)).map((m) => m.id)
  const kept = deleted.length - ok.length
  if (!ok.length && kept) {
    const only = all.length === 1 ? deleted[0] : undefined
    return { error: only ? materialRestoreRule(await makerName(only.uploadedBy)) : MATERIALS_RESTORE_RULE }
  }
  if (ok.length) await db.update(studioMaterials).set({ deletedAt: null, isActive: true }).where(inArray(studioMaterials.id, ok))
  touch(); return { restored: ok.length, kept, reason: kept ? MATERIALS_RESTORE_RULE : null }
}
/** Delete forever — (verify round 1, F129) what the rule keeps is counted, with why; a refusal of every one is the answer. */
export async function deleteStudioMaterialsForever(ids: string[]): Promise<{ deleted: number } & Kept | Err> {
  const viewer = await fetchViewer(), all = [...new Set(ids)]
  const rows = all.length ? await db.select().from(studioMaterials).where(inArray(studioMaterials.id, all)) : []
  if (all.length === 1 && !rows[0]) return { error: 'That material is gone.' }
  const deleted = rows.filter((m) => m.deletedAt)
  const ok = deleted.filter((m) => !materialChangeBlock(viewer, m.uploadedBy)).map((m) => m.id)
  const kept = deleted.length - ok.length
  if (!ok.length && kept) return { error: all.length === 1 && deleted[0] ? materialPurgeRule(await makerName(deleted[0].uploadedBy)) : MATERIAL_PURGE_RULE }
  if (ok.length) await db.delete(studioMaterials).where(inArray(studioMaterials.id, ok))
  touch(); return { deleted: ok.length, kept, reason: kept ? MATERIAL_PURGE_RULE : null }
}
/** Empty Trash — (verify round 1, F129) never "Trash emptied" when the rule kept everything: that is an `Err`; a partial one says how
    many stayed. */
export async function emptyMaterialTrash(): Promise<{ deleted: number } & Kept | Err> {
  const rows = await db.select({ id: studioMaterials.id }).from(studioMaterials).where(isNotNull(studioMaterials.deletedAt))
  if (!rows.length) return { deleted: 0, kept: 0, reason: null }
  const r = await deleteStudioMaterialsForever(rows.map((x) => x.id))
  if ('error' in r) return { error: MATERIAL_PURGE_RULE }   // the one deleted material someone else added: the rule, not "this material"'s
  return r
}
