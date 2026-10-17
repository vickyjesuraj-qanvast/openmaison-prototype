import { readFileAsDataUrl } from '@/lib/templates/files'
import { looksHeic, normalizePicture } from '@/lib/heic'
import { uploadFileRecord } from '@/app/leads/files-actions'
import { FILE_UPLOAD_MAX, fileKindOf, tooBigLine } from '@/lib/leads/file-model'
import { pdfFirstPage, readAsDataUrl, videoFirstFrame } from './file-pictures'
import type { UploadAnswer } from '@/components/leads/tasks/attach-files-modal'

/**
 * (audit 2026-09-26, F205 — the Files half) The picture an upload carries, sized to land. A server action's body stops at 12 MB
 * (next.config.ts) and `uploadFile` keeps a picture under that, but `readFileAsDataUrl` hands a JPEG / PNG / WebP under 2000px back
 * untouched — so a 9.9 MB PNG became a 13 MB request, the server answered 500 and nothing was made. A picture whose address runs past
 * the cap is redrawn as a JPEG over white (a transparent PNG keeps a white ground, never black), smaller each try, as the AI
 * Visualizer's room photos are. Null when the file can't be drawn: the upload then keeps its stand-in, as before.
 * (wave E, files-1 · files-4 · files-18) The cap only holds because the picture travels INSIDE uploadFile's object argument: as a bare
 * fourth argument React's action decoder counted its length against a 1,000,000 limit, so every picture over ~730 KB failed with a 500
 * ("Maximum array nesting exceeded") whatever this cap said. Keep any long string an action takes inside an object.
 */
export const PICTURE_CAP = 8_000_000   // characters of data URL ≈ 6 MB of picture, with room left in the 12 MB body

const redraw = (url: string, max: number): Promise<string | null> => new Promise((resolve) => {
  const img = new Image()
  img.onload = () => {
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale))
    const ctx = c.getContext('2d')
    if (!ctx) { resolve(null); return }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0, c.width, c.height)
    resolve(c.toDataURL('image/jpeg', 0.86))
  }
  img.onerror = () => resolve(null)
  img.src = url
})

export async function uploadablePicture(file: File): Promise<string | null> {
  const url = await readFileAsDataUrl(file, 2000, { web: true }).catch(() => null)
  if (!url || url.length <= PICTURE_CAP) return url
  for (const max of [2000, 1600, 1200]) {
    const jpeg = await redraw(url, max)
    if (jpeg && jpeg.length <= PICTURE_CAP) return jpeg
  }
  return null
}

/** (pending modules S20) The picture of a HEIC the browser can't draw: 1.0's converter, then a JPEG small enough to be kept as its picture
    (`uploadFile` keeps a drawn picture under 800,000 characters) — null when it can't be read. */
async function heicThumb(file: File): Promise<string | null> {
  const n = await normalizePicture(file)
  if ('error' in n || !n.converted) return null
  const url = await readAsDataUrl(n.file).catch(() => null)
  if (!url) return null
  for (const max of [1600, 1200, 900]) { const jpeg = await redraw(url, max); if (jpeg && jpeg.length < 790_000) return jpeg }
  return null
}

/** (audit 2026-09-26, round 3) A picture redrawn as a JPEG (too big, or a GIF / BMP) lands under a .jpg name — its Information, Download and the
    grid's Download then agree ("sofa.png" held JPEG bytes and downloaded as "sofa.png.jpg"). */
export const landedName = (name: string, img: string | null) =>
  img?.startsWith('data:image/jpeg') && !/\.jpe?g$/i.test(name) ? `${name.replace(/\.[a-z0-9]{2,5}$/i, '')}.jpg` : name

/**
 * (UX audit 2026-09-30, T1) One upload path for every place a lead's file is picked — the Files tab, and the Attach files modal of a task or a
 * note: the picture sized to land, the name it lands under, then the Files tab's own upload (REG-684), answering the real row (or the rule
 * that refused it). The picture rides inside the action's one object argument (F205).
 * (gaps build E, item 1) Every file, not only a picture: a PDF, a Word, Excel or PowerPoint file, a drawing, a video goes up with its own bytes
 * (up to 8 MB — refused at once past it, before anything is read) and the picture drawn of it — a PDF's first page, a video's first frame. A
 * picture the browser can't redraw (a HEIC on Chrome) goes up as it is, its own bytes kept, instead of the stand-in it used to become.
 */
export async function uploadPicked(leadId: string | null, file: File, parentId: string | null = null): Promise<UploadAnswer> {
  if (!leadId) return { error: 'A studio task has no lead’s Files to keep the upload in' }
  const img = file.type.startsWith('image/') || looksHeic(file) ? await uploadablePicture(file) : null
  /* (pending modules S20 — the AI Visualizer's HEIC line, "the iPhone default") a HEIC this browser can't draw keeps its own bytes, as before,
     and now wears the picture 1.0's converter draws of it — so it shows in Files and opens in the AI Visualizer like any photo */
  if (img && looksHeic(file) && !/^data:image\/(?:jpeg|png|webp|gif)/.test(img)) return uploadFileRecord(leadId, { parentId, name: file.name, data: img, thumb: await heicThumb(file) })
  if (img) return uploadFileRecord(leadId, { parentId, name: landedName(file.name, img), data: img })
  if (file.size > FILE_UPLOAD_MAX) return { error: tooBigLine(file.name) }
  const raw = await readAsDataUrl(file).catch(() => null)
  if (!raw) return { error: 'This file didn’t read — pick it again' }
  const data = raw.replace(/^data:;base64,/, 'data:application/octet-stream;base64,')
  const kind = fileKindOf(file.name, file.type)
  const thumb = kind === 'pdf' ? await pdfFirstPage(file) : kind === 'video' ? await videoFirstFrame(file) : null
  return uploadFileRecord(leadId, { parentId, name: file.name, data, thumb })
}
