/**
 * The studio's brand kit (REG-487): settings key `brand` — logo, stamp, badges, the named colours, the type roles and the
 * company details every template prints. Company › Profile edits it; a template carries overrides (`design.brand`) with
 * "Reset to brand". Client-safe; the row is read by lib/templates/queries.ts and seeded by scripts/repair-demo-data.ts R31.
 */
import { COLOR_KEYS, DEFAULT_BRAND, FONT_ROLES, type BrandKit, type ColorKey, type FontRole, type FontSpec, type StudioDetails } from './model'
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
  return {
    kit: {
      logo: strOrNull(k.logo, DEFAULT_BRAND.logo), logoDark: strOrNull(k.logoDark, DEFAULT_BRAND.logoDark), stamp: strOrNull(k.stamp, DEFAULT_BRAND.stamp),
      badges: Array.isArray(k.badges) ? (k.badges as unknown[]).filter((b): b is string => typeof b === 'string') : DEFAULT_BRAND.badges,
      colors, fonts,
    },
    details: {
      name: str(d.name, DEMO_STUDIO.name), address: str(d.address, DEMO_STUDIO.address), phone: str(d.phone, DEMO_STUDIO.phone), fax: str(d.fax, DEMO_STUDIO.fax),
      email: str(d.email, DEMO_STUDIO.email), website: str(d.website, DEMO_STUDIO.website), uen: str(d.uen, DEMO_STUDIO.uen), gstReg: str(d.gstReg, DEMO_STUDIO.gstReg), licence: str(d.licence, DEMO_STUDIO.licence),
    },
  }
}
