import { normalizePicture } from '@/lib/heic'
import { readAsDataUrl } from '@/components/leads/files/file-pictures'
import { tooBigLine } from '@/lib/leads/file-model'
import type { PickedPdf } from '@/lib/contracts/pdf'
import { NOT_A_CONTRACT_FILE, NOT_A_PHOTO, PHOTO_DIDNT_READ, PHOTO_READ_MAX, isPdfFile, isPictureFile, pictureNameOf } from '@/lib/contracts/picture'
import { isPdfRefusal, readPickedPdf } from './read-pdf'

/** What a kept photo may weigh as it travels — Files' own cap for a picture (components/leads/files/upload-picture.ts `PICTURE_CAP`): about 6 MB
    of JPEG, with room left in a request's 12 MB for the rest of the move. */
const PHOTO_CAP = 8_000_000

/** The picture redrawn as a JPEG no wider or taller than `max`, over white (a transparent PNG never turns black) — null when it can't be drawn. */
const drawJpeg = (url: string, max: number, quality = 0.86): Promise<string | null> => new Promise((resolve) => {
  const img = new Image()
  img.onload = () => {
    const scale = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale)); c.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale))
    const ctx = c.getContext('2d')
    if (!ctx) { resolve(null); return }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0, c.width, c.height)
    resolve(c.toDataURL('image/jpeg', quality))
  }
  img.onerror = () => resolve(null)
  img.src = url
})

/**
 * (Contracts on the move, C4 — P-12, Q-04 as picked) A photo of the signed paper, read the way a contract keeps it: a phone's HEIC turned into a
 * JPEG first (1.0's converter, lib/heic.ts — Chrome can't draw one), then redrawn as a JPEG no larger than 2000px (a page stays legible; a 48 MP
 * photo never rides a 12 MB request), smaller again while it is over Files' picture cap, plus a 480px picture of it for the file's row and the
 * contract's card (`/files/thumb`). Answers `PickedPdf`'s shape — the move's payload and `createContractDoc`'s upload carry it unchanged — or
 * the rule that refused it. `name` is what the copy is kept as (its extension follows what it holds).
 */
export async function readPickedPicture(file: File, name: string = file.name): Promise<PickedPdf | { error: string }> {
  if (!isPictureFile(file)) return { error: NOT_A_PHOTO }
  if (file.size > PHOTO_READ_MAX) return { error: tooBigLine(file.name) }
  const n = await normalizePicture(file).catch(() => ({ error: PHOTO_DIDNT_READ }))
  if ('error' in n) return { error: n.error }
  const url = await readAsDataUrl(n.file).catch(() => null)
  if (!url) return { error: PHOTO_DIDNT_READ }
  let data: string | null = null
  for (const max of [2000, 1600, 1200]) {
    const jpeg = await drawJpeg(url, max)
    if (!jpeg || !/^data:image\/jpeg;base64,/.test(jpeg)) return { error: PHOTO_DIDNT_READ }
    if (jpeg.length <= PHOTO_CAP) { data = jpeg; break }
  }
  if (!data) return { error: tooBigLine(file.name) }
  const thumb = await drawJpeg(url, 480, 0.8)
  return { name: pictureNameOf(name, data), data, thumb: thumb && /^data:image\/jpeg;base64,/.test(thumb) ? thumb : null }
}

/** A file picked where a contract takes either: a picture is read as the signed photo, anything else as the PDF (whose rule refuses a non-PDF). */
export async function readPickedContractFile(file: File, pictureName?: string): Promise<PickedPdf | { error: string }> {
  if (isPictureFile(file)) return readPickedPicture(file, pictureName ?? file.name)
  if (!isPdfFile(file)) return { error: NOT_A_CONTRACT_FILE }
  return readPickedPdf(file)
}
export const isPickRefusal = (r: PickedPdf | { error: string }): r is { error: string } => isPdfRefusal(r)
