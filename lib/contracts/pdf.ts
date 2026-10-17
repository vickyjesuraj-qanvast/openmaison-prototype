/**
 * (pending modules S03) A PDF a contract keeps — what the browser sends and the words its checks say. Client-safe: the browser checks a
 * picked file with these words before it reads it, the server checks the bytes again. Up to 8 MB, the Files tab's own cap (a request
 * carries the bytes as text inside its 12 MB). 1.0's signing library took PDFs only; so does every contract upload here.
 */
import { FILE_UPLOAD_MAX, tooBigLine } from '@/lib/leads/file-model'

/** The file as it travels to an action — inside one object (a long string is never a bare argument, F205). */
export type PickedPdf = { name: string; data: string; thumb?: string | null }

export const PDF_ACCEPT = '.pdf,application/pdf'
export const NOT_A_PDF = 'Choose a PDF — a contract is kept as one'
export const PDF_DIDNT_READ = 'This file didn’t read — pick it again'

/** Why a picked file can't be a contract's PDF (before it is read), else null. */
export function pdfFileProblem(f: { name: string; type: string; size: number }): string | null {
  const pdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
  if (!pdf) return NOT_A_PDF
  if (f.size > FILE_UPLOAD_MAX) return tooBigLine(f.name)
  return null
}

/** The name a kept PDF lands under — the picked file's own, cleaned, with its .pdf. */
export const pdfNameOf = (name: string) => { const n = name.replace(/[\\/\x00-\x1f]/g, '-').trim().slice(0, 160) || 'Contract.pdf'; return /\.pdf$/i.test(n) ? n : `${n}.pdf` }

const safeAtob = (b64: string) => { try { return atob(b64) } catch { return '' } }
const PDF_DATA = /^data:(application\/pdf|application\/octet-stream);base64,([A-Za-z0-9+/=]+)$/
/** The server's check of what arrived: a PDF data URL under the cap, and a name. `size` measures a data URL's bytes. */
export function checkPickedPdf(f: PickedPdf | null | undefined, size: (dataUrl: string) => number): string | null {
  if (!f || typeof f.data !== 'string' || typeof f.name !== 'string') return PDF_DIDNT_READ
  const m = PDF_DATA.exec(f.data)
  if (!m) return NOT_A_PDF
  if (!safeAtob(m[2]!.slice(0, 8)).startsWith('%PDF')) return NOT_A_PDF   // the bytes themselves, not the name
  if (size(f.data) > FILE_UPLOAD_MAX) return tooBigLine(f.name)
  return null
}

/** The signed copy a contract opens: the one attached on Mark as signed, else (an uploaded contract signed) its own PDF. */
export const signedFileOf = (c: { status: string; source: string; fileId: string | null; signedFileId: string | null }) =>
  c.signedFileId ?? (c.status === 'Signed' && c.source === 'uploaded' ? c.fileId : null)
