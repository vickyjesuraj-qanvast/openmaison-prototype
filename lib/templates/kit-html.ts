/**
 * (S44T — call C2's print side, UAT rows 326 · 327 · 298 · 307; her UAT ask 2026-10-15, as recommended) A line's words may carry the brand
 * kit's colours — never a free hex (REG-556's kit-only rule; 1.0 made the same call, 4dd60bc56). The editor marks a coloured run as
 * `<span data-kit="accent">…</span>` (a kit colour's key, kept by the house allowlist, `lib/contracts/sanitize.ts`), so the words follow the
 * kit when the studio changes its Accent. The print resolves each mark to the kit's colour here, and an underline or a strike drawn round a
 * coloured run takes the run's colour (298: "a coloured description's underline stays black") — the mark moves outside the decoration.
 * Pure: no DOM, the server and the browser alike.
 */
import { isColorKey, type BrandKit } from './model'
import { NAME_TEXT_COLORS } from '@/lib/quotes/items-model'

const KIT_SPAN = /<span\b([^>]*?)\bdata-kit="([a-z]+)"([^>]*)>/gi
/** `<u><span data-kit="k">words</span></u>` → `<span data-kit="k"><u>words</u></span>` (and `<s>` · `<strike>`): the decoration then draws in the run's colour. */
const DECORATED = /<(u|s|strike)>(\s*)(<span\b[^>]*\bdata-kit="[a-z]+"[^>]*>)((?:(?!<\/?span\b)[\s\S])*?)<\/span>(\s*)<\/\1>/gi

/** The words with every kit mark coloured as the kit says; a mark naming no kit colour prints in the text's own colour. */
export function kitHtml(html: string, brand: Pick<BrandKit, 'colors'>): string {
  if (!html || !html.includes('data-kit')) return html
  let out = html
  for (let i = 0; i < 3; i++) {   // nested decorations (an underline in a strike) unwrap one level a pass
    const next = out.replace(DECORATED, (_m, tag: string, a: string, open: string, words: string, b: string) => `${a}${open}<${tag}>${words}</${tag}></span>${b}`)
    if (next === out) break
    out = next
  }
  return out.replace(KIT_SPAN, (m, before: string, key: string, after: string) => {
    if (!isColorKey(key)) return m
    const rest = `${before} ${after}`.replace(/\sstyle="[^"]*"/i, '').trim()
    return `<span${rest ? ` ${rest}` : ''} data-kit="${key}" style="color: ${brand.colors[key]}">`
  })
}

/** (S44I — call C2; moved here by S44G — NB-08, so the template editor's Text block offers the same four) The brand kit's text colours, as the
    editor's colour tool offers them (never the two fills). */
export function kitTextColors(brandColors: Record<string, string> | undefined): { key: string; label: string; value: string }[] {
  if (!brandColors) return []
  return NAME_TEXT_COLORS.filter((k) => brandColors[k]).map((k) => ({ key: k, label: KIT_TEXT_LABEL[k], value: brandColors[k]! }))
}
const KIT_TEXT_LABEL: Record<(typeof NAME_TEXT_COLORS)[number], string> = { ink: 'Ink', accent: 'Accent', red: 'Red', grey: 'Grey' }
