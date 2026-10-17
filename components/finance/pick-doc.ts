'use client'

import { uploadablePicture } from '@/components/leads/files/upload-picture'
import { pdfFirstPage } from '@/components/leads/files/file-pictures'
import { pdfLines } from '@/lib/pdf-text'
import { readBill, EMPTY_READ, type BillRead } from '@/lib/finance/bill-reader'

/*
 * (gaps build F1 — F1-Q10 · Q11 · Q14) A cost record's file, read in the browser and carried inside the action's one object argument (the house
 * rule for a long string): a picture sized to land (every upload's way), a PDF whole with its first page drawn (E's `pdfFirstPage`). Up to 8 MB.
 */
export type PickedFile = { name: string; dataUrl: string; thumb: string | null; image: boolean }
const MAX = 8 * 1024 * 1024
const asDataUrl = (file: Blob) => new Promise<string | null>((resolve) => { const r = new FileReader(); r.onload = () => resolve(typeof r.result === 'string' ? r.result : null); r.onerror = () => resolve(null); r.readAsDataURL(file) })

/** Null when it can't be read, with why (`why`). */
export async function readDoc(file: File): Promise<{ doc: PickedFile } | { why: string }> {
  if (file.size > MAX) return { why: `${file.name} is over 8 MB — a smaller file fits` }
  if (file.type.startsWith('image/')) {
    const img = await uploadablePicture(file)
    return img ? { doc: { name: file.name, dataUrl: img, thumb: img, image: true } } : { why: `${file.name} didn’t read — try another picture` }
  }
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return { why: `${file.name} isn’t a picture or a PDF` }
  const [url, thumb] = await Promise.all([asDataUrl(file), pdfFirstPage(await file.arrayBuffer())])
  if (!url) return { why: `${file.name} didn’t read — pick it again` }
  return { doc: { name: file.name, dataUrl: url.replace(/^data:[^;]*;/, 'data:application/pdf;'), thumb, image: false } }
}

/** (F1-Q10) A bill's PDF read for its fields — its own text through pdf.js, then the curated reader; a photo has no text and reads nothing. */
export async function readBillFile(file: File, vendors: { id: string; name: string; uen: string | null }[]): Promise<BillRead> {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return EMPTY_READ
  try { return readBill(await pdfLines(await file.arrayBuffer()), vendors) } catch { return EMPTY_READ }
}
