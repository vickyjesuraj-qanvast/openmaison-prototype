import 'server-only'
import { asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members, quoteTemplates, studioFonts } from '@/lib/db/schema'
import type { BrandKit, FontFace } from '@/lib/templates/model'
import { FONT_ROLE_LABEL, FONT_ROLES } from '@/lib/templates/model'

/**
 * (pending modules S11 — card held:quote-templates; 1.0's `studio_assets` type `font`) The studio's own fonts as the app reads them: the faces
 * every document prints through (read in with the kit by `fetchBrand`), and the Brand kit's list — each file with who added it and where its
 * family is named (the kit's roles, the quote templates), so a removal says what it touches.
 */

const asFace = (r: { id: string; family: string; weight: number; italic: boolean; format: string }): FontFace => ({
  id: r.id, family: r.family, weight: r.weight === 700 ? 700 : r.weight === 600 ? 600 : 400, italic: !!r.italic,
  format: r.format === 'woff' || r.format === 'truetype' || r.format === 'opentype' ? r.format : 'woff2',
})

/** The live faces, oldest first — what `fetchBrand` hands every renderer. */
export async function fetchFontFaces(): Promise<FontFace[]> {
  const rows = await db.select({ id: studioFonts.id, family: studioFonts.family, weight: studioFonts.weight, italic: studioFonts.italic, format: studioFonts.format })
    .from(studioFonts).where(isNull(studioFonts.deletedAt)).orderBy(asc(studioFonts.createdAt))
  return rows.map(asFace)
}

export type StudioFontRow = FontFace & { fileName: string; size: number; createdAt: number; by: { name: string; color: string } | null }
export type StudioFontsData = { fonts: StudioFontRow[]; /** family (lower case) → where it is named: "the kit's Heading", "Letter", … */ uses: Record<string, string[]> }

/** Where a family is named: the kit's roles, then each live quote template whose published design or draft sets text in it. */
function usesOf(families: string[], kit: BrandKit, templates: { name: string; design: string | null; draft: string | null }[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const fam of families) {
    const key = fam.toLowerCase()
    const named = new RegExp(`"(?:family|font)":"${fam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i')
    const roles = FONT_ROLES.filter((r) => kit.fonts[r].family.toLowerCase() === key).map((r) => `the kit’s ${FONT_ROLE_LABEL[r]}`)
    const tpls = templates.filter((t) => named.test(t.design ?? '') || named.test(t.draft ?? '')).map((t) => t.name)
    out[key] = [...roles, ...tpls]
  }
  return out
}

/** The Brand kit's list of the studio's own fonts, with where each family is named. */
export async function fetchStudioFonts(kit: BrandKit): Promise<StudioFontsData> {
  const [rows, team, templates] = await Promise.all([
    db.select({ id: studioFonts.id, family: studioFonts.family, weight: studioFonts.weight, italic: studioFonts.italic, format: studioFonts.format, fileName: studioFonts.fileName, size: studioFonts.size, createdAt: studioFonts.createdAt, createdBy: studioFonts.createdBy })
      .from(studioFonts).where(isNull(studioFonts.deletedAt)).orderBy(asc(studioFonts.createdAt)),
    db.select({ id: members.id, name: members.name, color: members.color }).from(members),
    db.select({ name: quoteTemplates.name, design: quoteTemplates.designJson, draft: quoteTemplates.draftJson }).from(quoteTemplates).where(isNull(quoteTemplates.deletedAt)),
  ])
  const fonts = rows.map((r) => { const m = r.createdBy ? team.find((x) => x.id === r.createdBy) : null; return { ...asFace(r), fileName: r.fileName, size: r.size, createdAt: r.createdAt.getTime(), by: m ? { name: m.name, color: m.color } : null } })
  return { fonts, uses: usesOf([...new Set(fonts.map((f) => f.family))], kit, templates) }
}

/** One stored file, for /files/font/<id>: a removed font is not served (its documents print the stack's next face). */
export async function fontFile(id: string): Promise<{ data: string; fileName: string } | null> {
  const [r] = await db.select({ data: studioFonts.data, fileName: studioFonts.fileName, deletedAt: studioFonts.deletedAt }).from(studioFonts).where(eq(studioFonts.id, id)).limit(1)
  return r && !r.deletedAt ? { data: r.data, fileName: r.fileName } : null
}
