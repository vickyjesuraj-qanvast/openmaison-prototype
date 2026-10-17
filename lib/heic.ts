'use client'

/**
 * (pending modules S20 — card held:ai-visualizer, "HEIC photos — partial (only where the browser opens them) · revisit: the iPhone default; a
 * small converter (1.0: normalize-image.ts)") A picture picked from a phone, made one the browser can draw. iPhones save HEIC by default;
 * Safari draws it, Chrome, Firefox and Edge can't — so the photo used to be refused there. 1.0's `normalizeImageFile` did the job with
 * `heic-to` (libheif, WebAssembly): the same converter, pinned (1.5.2), loaded only when a HEIC actually lands (about 3 MB, never on a page
 * that doesn't need it). The order, cheapest first:
 *   1. not a HEIC (its type, its name, or — when the device gave neither — its file header): the file as it is;
 *   2. a browser that draws HEIC itself (Safari, iOS): the file as it is — the house's own redraw turns it into a JPEG;
 *   3. the converter: a JPEG at 0.92, named `<name>.jpg`;
 *   4. none of them can (no WebAssembly, a file that won't decode): an honest refusal, in the words the editor already said.
 * Client-only. Every reader that redraws a picture as a JPEG (`readFileAsDataUrl`) takes the file this hands back — one pipeline for every
 * format, the JPEG's own.
 */

const HEIC_TYPE = /^image\/hei[cf](?:-sequence)?$/i
const HEIC_NAME = /\.hei[cf]$/i
/** The ISO-BMFF brands a HEIC / HEIF still photo carries in its `ftyp` box (1.0's `isHeic` reads the same four bytes). */
const BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'])

/** The words for a browser that can't open the photo at all — the AI Visualizer's own, since REG-684. */
export const HEIC_NO = 'This browser can’t open HEIC photos — save it as a JPG and try again'
/** A HEIC the converter couldn't read (a damaged file, a format it doesn't know). */
export const HEIC_BAD = 'Couldn’t open this HEIC photo — save it as a JPG and try again'

/** A HEIC by what the device says about it: its type or its name. */
export const looksHeic = (f: { type: string; name: string }) => HEIC_TYPE.test(f.type) || HEIC_NAME.test(f.name)

/** A HEIC by its first bytes — for a file handed over with no type (a drag from some apps, a download without an extension). */
export async function sniffHeic(f: Blob): Promise<boolean> {
  const b = new Uint8Array(await f.slice(0, 12).arrayBuffer())
  if (b.length < 12) return false
  const text = (from: number, to: number) => String.fromCharCode(...b.slice(from, to))
  return text(4, 8) === 'ftyp' && BRANDS.has(text(8, 12).replace(/\0/g, ' ').trim())
}

/** Whether this browser draws the photo itself (Safari does) — never throws. */
async function drawsItself(f: Blob): Promise<boolean> {
  if (typeof createImageBitmap !== 'function') return false
  try { const bmp = await createImageBitmap(f); bmp.close(); return true } catch { return false }
}

export type Normalized = { file: File; converted: boolean } | { error: string }

/**
 * The picked file as one the house's redraw can read: unchanged unless it is a HEIC this browser can't draw, then a JPEG; `{ error }` (the
 * words to say) when it can't be opened here. A file that isn't a HEIC goes on as it is — the redraw answers for it (a file with no type
 * that isn't a picture is refused there, never passed off as one).
 */
export async function normalizePicture(f: File): Promise<Normalized> {
  const untyped = !f.type || f.type === 'application/octet-stream'
  const heic = looksHeic(f) || (untyped && (await sniffHeic(f).catch(() => false)))
  if (!heic) return { file: f, converted: false }
  const typed = HEIC_TYPE.test(f.type) ? f : new File([f], f.name, { type: 'image/heic', lastModified: f.lastModified })
  if (await drawsItself(typed)) return { file: typed, converted: false }
  if (typeof WebAssembly === 'undefined' || typeof Worker === 'undefined') return { error: HEIC_NO }
  try {
    const { heicTo } = await import('heic-to')
    const jpeg = await heicTo({ blob: typed, type: 'image/jpeg', quality: 0.92 })
    const stem = (f.name || 'photo').replace(HEIC_NAME, '') || 'photo'
    return { file: new File([jpeg], `${stem}.jpg`, { type: 'image/jpeg', lastModified: f.lastModified }), converted: true }
  } catch {
    return { error: HEIC_BAD }
  }
}
