/**
 * (pending modules S11 — card held:quote-templates, "The Outfit font and fonts a studio uploads"; 1.0's `studio_assets` type `font`, 2 MB a
 * file) The rules of a studio's own fonts, pure and client-safe: what a font file is, what a family may be called, what the upload dialog
 * suggests from the file's name, and the words the Brand kit says. Server: lib/company/studio-fonts.ts; actions app/company/font-actions.ts.
 */
import type { FontFace } from './model'

/** 1.0's cap for a font asset. */
export const FONT_MAX_BYTES = 2 * 1024 * 1024
/** What the file box takes. */
export const FONT_ACCEPT = '.woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf'
export const FONT_FAMILY_MAX = 40
/** Only an Owner or an Admin changes the brand kit (BRAND_RULE) — a font is part of it. */
export const FONT_RULE = 'Only an Owner or an Admin adds or removes the studio’s fonts.'
export const FONT_NOT_A_FONT = 'That file isn’t a font — upload a WOFF2, WOFF, TTF or OTF file.'
export const FONT_TOO_BIG = 'A font file can be up to 2 MB.'
export const FONT_LICENCE_NEEDED = 'Tick that the studio may use this font in the documents it sends.'
export const FONT_FAMILY_NEEDED = 'Give the font a name.'
export const FONT_FAMILY_TAKEN = 'That name is one of the fonts already in the list — give yours another.'

const MIME: Record<FontFace['format'], string> = { woff2: 'font/woff2', woff: 'font/woff', truetype: 'font/ttf', opentype: 'font/otf' }
export const fontMime = (f: FontFace['format']) => MIME[f]

/** A font file's format from its first bytes (never its name): WOFF2 'wOF2', WOFF 'wOFF', TrueType 00 01 00 00 or 'true', OpenType 'OTTO'. */
export function sniffFont(head: Uint8Array): FontFace['format'] | null {
  if (head.length < 4) return null
  const tag = String.fromCharCode(head[0]!, head[1]!, head[2]!, head[3]!)
  if (tag === 'wOF2') return 'woff2'
  if (tag === 'wOFF') return 'woff'
  if (tag === 'OTTO') return 'opentype'
  if (tag === 'true' || (head[0] === 0 && head[1] === 1 && head[2] === 0 && head[3] === 0)) return 'truetype'
  return null
}
/** The first four bytes a base64 data URL carries (eight base64 characters hold six). */
export function dataUrlHead(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(',')
  if (!/^data:[^;,]*;base64$/.test(dataUrl.slice(0, comma))) return null
  const chunk = dataUrl.slice(comma + 1, comma + 9)
  if (chunk.length < 8 || !/^[A-Za-z0-9+/]{8}$/.test(chunk)) return null
  try {
    const bin = atob(chunk)
    return Uint8Array.from(bin.slice(0, 4), (c) => c.charCodeAt(0))
  } catch { return null }
}
/** The bytes a base64 data URL carries. */
export const dataUrlBytes = (dataUrl: string) => { const b64 = /^data:[^;,]*;base64,(.*)$/s.exec(dataUrl)?.[1] ?? ''; return Math.floor((b64.replace(/=+$/, '').length * 3) / 4) }

/** A family name as kept: letters, digits, spaces and hyphens, one space between words, at most 40 characters. */
export const cleanFamily = (s: string) => s.replace(/[^A-Za-z0-9 \-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, FONT_FAMILY_MAX).trim()

/** What the upload dialog suggests from a file's name — "BrandonGrotesque-BoldItalic.woff2" → Brandon Grotesque · Bold · italic. */
export function suggestFromFileName(fileName: string): { family: string; weight: FontFace['weight']; italic: boolean } {
  const base = fileName.replace(/\.[a-z0-9]+$/i, '')
  const [famPart = base, ...rest] = base.split(/[-_]/)
  const style = (rest.length ? rest.join(' ') : base).toLowerCase()
  const words = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2')
  const semi = /semi ?bold|demi ?bold|medium/.test(style)
  const weight: FontFace['weight'] = semi ? 600 : /black|heavy|bold/.test(style) ? 700 : 400
  const italic = /italic|oblique/.test(style)
  const family = cleanFamily(words(rest.length ? famPart : base.replace(/(regular|bold|semibold|italic|medium|light|black)+$/i, '')))
  return { family: family || cleanFamily(words(base)) || 'My font', weight, italic }
}

export const WEIGHT_WORD: Record<FontFace['weight'], string> = { 400: 'Regular', 600: 'Semibold', 700: 'Bold' }
/** "Bold italic" · "Regular". */
export const faceWords = (f: Pick<FontFace, 'weight' | 'italic'>) => `${WEIGHT_WORD[f.weight]}${f.italic ? ' italic' : ''}`
