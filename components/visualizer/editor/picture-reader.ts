import { HEIC_NO, looksHeic, normalizePicture } from '@/lib/heic'
import { readFileAsDataUrl } from '@/lib/templates/files'
import { PHOTO_ACCEPT } from '@/lib/visualizer/policy'

/*
 * (critic 19 · pending modules S20) The pictures a person hands the AI Visualizer — a room photo, a swatch, a reference, a piece's photo — in a
 * module of their own, light enough for a page to load before the editor (the website's trial reads a photo first, then loads the editor:
 * pending modules S36). JPG, PNG, WebP and HEIC — redrawn as a JPEG before anything is done with it, so a large phone photo becomes a web
 * size. HEIC on every browser: Safari draws it, elsewhere 1.0's converter turns it into a JPEG first (`normalizePicture`, lib/heic.ts). A
 * file the device gave no type is let through to be read — its own bytes say whether it is a HEIC; anything else that isn't a picture is
 * refused there.
 */
export const UPLOAD_MAX_BYTES = 40 * 1024 * 1024
export const isHeic = (f: File) => looksHeic(f)
/** (pending modules S20) A file the device handed over without a type — the reader decides what it is. */
export const untyped = (f: File) => !f.type || f.type === 'application/octet-stream'
/** What the pickers offer (REG-735 — the landing's welcome picks with it too). */
export const ROOM_ACCEPT = `${PHOTO_ACCEPT},image/heic,image/heif,.heic,.heif`

type Snack = (o: { message: string; key?: string }) => void
/** `okPhoto` says why a file can't be one (in the snackbar); `readPicture` redraws it as a JPEG at `max` px (F205) — or null, said why; past
    half a second the snackbar says a HEIC is being opened, and goes when it is. */
export function pictureReader(snack: Snack, unsnack: (key: string) => void) {
  const okPhoto = (f: File) => {
    if (!isHeic(f) && !untyped(f) && !PHOTO_ACCEPT.split(',').includes(f.type)) { snack({ message: 'We can read JPG, PNG, WebP and HEIC photos' }); return false }
    if (f.size > UPLOAD_MAX_BYTES) { snack({ message: 'That photo is over 40 MB — try a smaller one' }); return false }
    return true
  }
  const readPicture = async (f: File, max: number): Promise<string | null> => {
    const slow = isHeic(f) || untyped(f) ? setTimeout(() => snack({ key: 'viz-heic', message: 'Opening the HEIC photo…' }), 500) : null
    const n = await normalizePicture(f).finally(() => { if (slow) { clearTimeout(slow); unsnack('viz-heic') } })
    if ('error' in n) { snack({ message: n.error }); return null }
    const url = await readFileAsDataUrl(n.file, max, { jpeg: true })
    if (url.startsWith('data:image/jpeg')) return url
    snack({ message: isHeic(f) ? HEIC_NO : 'Couldn’t read that photo — please try another' })
    return null
  }
  return { okPhoto, readPicture }
}
