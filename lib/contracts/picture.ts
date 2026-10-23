/**
 * (Contracts on the move, C4 — P-12 · C-25 · C-27, Q-04 as picked; his "please check and built accordingly" 2026-10-22) A PHOTO of the paper the
 * client signed on site, kept as the contract's signed copy — the Won step's "Attach client signed contract" and Import a contract on touch.
 * Client-safe, the PDF's twin (`pdf.ts`): the browser reads the photo with these words, the server checks the bytes again with the same rule.
 * The photo travels as `PickedPdf`'s shape ({ name, data, thumb }) inside one object argument (F205) — the move's payload, `createContractDoc`'s
 * `upload` — so neither path changes its type. A photo is the signed copy only: it carries no signature fields, so it never goes out for signing.
 * A server-side PDF of the photo is the developers' S34 renderer seam (Q-04) — until it lands, the picture itself is the copy.
 */
import { FILE_UPLOAD_MAX, tooBigLine } from '@/lib/leads/file-model'
import type { PickedPdf } from './pdf'

/** What a contract takes on touch: a PDF, or a picture of the signed page (a phone's HEIC is turned into a JPEG before it is read). */
export const CONTRACT_FILE_ACCEPT = 'application/pdf,.pdf,image/*,.heic,.heif'
export const PHOTO_ACCEPT = 'image/*'

export const NOT_A_CONTRACT_FILE = 'Choose a PDF or a photo of the signed page'
export const NOT_A_PHOTO = 'Choose a photo — a JPG, PNG or HEIC'
export const PHOTO_DIDNT_READ = 'This photo didn’t read — take it again'
/** (Q-04) Why a photo can't go out for signature: it is the copy the client already signed. *(invented copy)* */
export const PHOTO_SIGNED_ONLY = 'A photo is kept as the signed copy — it can’t be sent for signing'
/** (Q-04) Why a photo-signed contract has no Duplicate: its file is that signing's copy, never a new contract's paper. *(invented copy)* */
export const PHOTO_NO_COPY = 'It was signed on paper — its photo is that signing’s copy, so it can’t start a new contract'

/** A phone's photo before it is redrawn can be far over the kept 8 MB (a 48 MP JPEG, a HEIC) — read up to this, keep at most FILE_UPLOAD_MAX. */
export const PHOTO_READ_MAX = 40 * 1024 * 1024

/** A picked file that is a picture (by its type or its name — a HEIC often comes untyped). */
export const isPictureFile = (f: { name: string; type: string }) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name)
/** A picked file that is a PDF (the house rule, lib/contracts/pdf.ts). */
export const isPdfFile = (f: { name: string; type: string }) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)

/** A kept picture: a JPEG, PNG or WebP data URL — what the browser draws and every Files route sends inline. */
const PICTURE_DATA = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/
/** True when what travels is a picture, not a PDF — the one test both paths branch on. */
export const isPictureData = (data: unknown): boolean => typeof data === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(data)

const EXT_OF: Record<string, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' }
/** The name a kept picture lands under — the given name, cleaned, its own extension for what it holds (a .pdf / .heic name takes .jpg). */
export function pictureNameOf(name: string, data?: string): string {
  const kind = typeof data === 'string' ? /^data:image\/(jpeg|png|webp);/.exec(data)?.[1] ?? 'jpeg' : 'jpeg'
  const base = name.replace(/[\\/\x00-\x1f]/g, '-').trim().slice(0, 150).replace(/\.(pdf|jpe?g|png|webp|heic|heif|gif|bmp)$/i, '') || 'Signed contract'
  return `${base}.${EXT_OF[kind]}`
}
/** A file's name without its extension — the title a picked PDF or photo gives a contract. */
export const titleOfFile = (name: string) => name.replace(/\.(pdf|jpe?g|png|webp|heic|heif|gif|bmp)$/i, '')

const safeAtob = (b64: string) => { try { return atob(b64) } catch { return '' } }
/** The server's check of a picture that arrived: a JPEG / PNG / WebP data URL whose bytes are that picture, under the cap, with a name. */
export function checkPickedPicture(f: PickedPdf | null | undefined, size: (dataUrl: string) => number): string | null {
  if (!f || typeof f.data !== 'string' || typeof f.name !== 'string') return PHOTO_DIDNT_READ
  const m = PICTURE_DATA.exec(f.data)
  if (!m) return NOT_A_PHOTO
  const head = safeAtob(m[2]!.slice(0, 16))
  const real = m[1] === 'jpeg' ? head.startsWith('\xff\xd8\xff') : m[1] === 'png' ? head.startsWith('\x89PNG') : head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP'
  if (!real) return NOT_A_PHOTO   // the bytes themselves, not the name
  if (size(f.data) > FILE_UPLOAD_MAX) return tooBigLine(f.name)
  return null
}
