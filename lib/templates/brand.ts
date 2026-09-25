/**
 * The studio's brand kit (REG-487): settings key `brand` — logo, stamp, badges, the named colours, the type roles and the
 * company details every template prints. Company › Templates › Brand kit edits the kit and Company › Profile the details (REG-554); a template carries overrides (`design.brand`) with
 * "Reset to brand". Client-safe; the row is read by lib/templates/queries.ts and seeded by scripts/repair-demo-data.ts R31.
 */
import { COLOR_KEYS, DEFAULT_BRAND, EMPTY_ENTITY, FONT_ROLES, SOCIAL_KEYS, type BrandKit, type ColorKey, type FontRole, type FontSpec, type IssuingEntity, type SocialLinks, type StudioDetails } from './model'
import { DEMO_STUDIO } from './data'

export const BRAND_KEY = 'brand'
export type BrandSetting = { kit: BrandKit; details: StudioDetails }
export const DEFAULT_BRAND_SETTING: BrandSetting = { kit: DEFAULT_BRAND, details: DEMO_STUDIO }

const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d)
const strOrNull = (v: unknown, d: string | null) => (v === null ? null : typeof v === 'string' ? v : d)

export function parseBrandSetting(v: unknown): BrandSetting {
  const r = (v ?? {}) as { kit?: Partial<Record<keyof BrandKit, unknown>>; details?: Partial<Record<keyof StudioDetails, unknown>> }
  const k = r.kit ?? {}
  const colors = { ...DEFAULT_BRAND.colors }
  const c = (k.colors ?? {}) as Partial<Record<ColorKey, unknown>>
  for (const key of COLOR_KEYS) if (typeof c[key] === 'string' && /^#[0-9a-f]{6}$/i.test(c[key] as string)) colors[key] = c[key] as string
  const fonts = { ...DEFAULT_BRAND.fonts }
  const f = (k.fonts ?? {}) as Partial<Record<FontRole, Partial<FontSpec>>>
  for (const role of FONT_ROLES) {
    const s = f[role]
    if (!s) continue
    fonts[role] = {
      family: typeof s.family === 'string' && s.family ? s.family : fonts[role].family,
      size: typeof s.size === 'number' && s.size > 0 ? s.size : fonts[role].size,
      weight: s.weight === 400 || s.weight === 600 || s.weight === 700 ? s.weight : fonts[role].weight,
      ...(s.italic ? { italic: true } : {}),
    }
  }
  const d = r.details ?? {}
  const name = str(d.name, DEMO_STUDIO.name)
  // (REG-562) The entities: the studio itself always first, its name following the company name; the rest as saved.
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'entity'
  const ent = (v: unknown, fallbackName: string, i: number): IssuingEntity => { const e = (v ?? {}) as Partial<Record<keyof IssuingEntity, unknown>>; const nm = str(e.name, fallbackName) || fallbackName; return {
    id: i === 0 ? 'studio' : str(e.id, '').slice(0, 64) || `entity-${slug(nm)}`, ...(i > 0 && e.retired === true ? { retired: true } : {}),   // (REG-647, settings parity Q-10)
    name: nm, bankName: str(e.bankName, ''), accountName: str(e.accountName, ''), accountNo: str(e.accountNo, ''), payNow: str(e.payNow, ''), payNowQr: strOrNull(e.payNowQr, null), gstRegistered: e.gstRegistered !== false,
    swift: str(e.swift, ''), logo: strOrNull(e.logo, null), address: str(e.address, ''), uen: str(e.uen, ''), gstReg: str(e.gstReg, '') } }   // (REG-618) SWIFT and the entity's own letterhead
  const rawSocials = (d.socials ?? {}) as Record<string, unknown>
  const socials: SocialLinks = {}
  for (const k of SOCIAL_KEYS) { const v = rawSocials[k]; if (typeof v === 'string' && v.trim()) socials[k] = v.trim() }
  const rawEntities = Array.isArray(d.entities) ? (d.entities as unknown[]) : []
  const entities = rawEntities.length ? rawEntities.slice(0, 6).map((e, i) => ent(e, i === 0 ? name : 'Entity', i)) : [EMPTY_ENTITY(name)]
  entities[0] = { ...entities[0]!, name }
  return {
    kit: {
      logo: strOrNull(k.logo, DEFAULT_BRAND.logo), logoDark: strOrNull(k.logoDark, DEFAULT_BRAND.logoDark), stamp: strOrNull(k.stamp, DEFAULT_BRAND.stamp),
      badges: Array.isArray(k.badges) ? (k.badges as unknown[]).filter((b): b is string => typeof b === 'string') : DEFAULT_BRAND.badges,
      colors, fonts,
    },
    details: {
      name, address: str(d.address, DEMO_STUDIO.address), phone: str(d.phone, DEMO_STUDIO.phone), fax: str(d.fax, DEMO_STUDIO.fax),
      email: str(d.email, DEMO_STUDIO.email), website: str(d.website, DEMO_STUDIO.website), uen: str(d.uen, DEMO_STUDIO.uen), gstReg: str(d.gstReg, DEMO_STUDIO.gstReg), licence: str(d.licence, DEMO_STUDIO.licence),
      tagline: str(d.tagline, ''), social: str(d.social, ''), socials, entities,
    },
  }
}
