/**
 * (S42 B·4 · E-05 · D-08 · D·2) THE one reader behind every Upload a quote — Create Quote, a variation order from a contractor's quote, the
 * schedule's uploaded quote and the website's free trial — run in the browser the moment a file is picked; nothing leaves it while it reads.
 * A spreadsheet is read for real (XLSX · CSV); a PDF from its own words, by rule (S21's `readQuoteText`), and one of the reference quotes
 * only when its words are that quote (`referenceInText`) — a file's NAME is never read; a photo or a PDF of pictures has no words, and says
 * so. Whatever a door charges for the read (5 AI credits in the studio, a trial read on the website), it gives back when nothing reads.
 */
import { parseXlsx } from '@/lib/xlsx'
import { parseCsv } from '@/lib/csv'
import { currencySign, readQuoteText } from './pdf-quote'
import { referenceInText } from '@/lib/xray/reference'
import { readSheet, referenceRead, textRead, type UploadRead } from './upload'

export async function readQuoteUpload(file: File): Promise<UploadRead> {
  try {
    if (/\.(csv|xlsx)$/i.test(file.name)) {
      const d = readSheet(/\.csv$/i.test(file.name) ? parseCsv(await file.text()) : await parseXlsx(await file.arrayBuffer()), file.name)
      return d.currency && d.currency !== 'SGD' ? { ok: false, reason: 'currency', currency: currencySign(d.currency) } : d.read
    }
    if (/\.(png|jpe?g|webp|heic|heif)$/i.test(file.name) || file.type.startsWith('image/')) return { ok: false, reason: 'scan' }
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return { ok: false, reason: 'unreadable' }   // an old .xls, a Word file…
    const { pdfLines } = await import('@/lib/pdf-text')
    const words = await pdfLines(await file.arrayBuffer())
    if (!words.some((l) => /[a-z]{3}/i.test(l))) return { ok: false, reason: 'scan' }   // a scan saved as a PDF: pictures of pages, no words
    const ref = referenceInText(words)
    return ref ? referenceRead(ref) : textRead(readQuoteText(words), file.name)
  } catch {
    return { ok: false, reason: 'unreadable' }   // a PDF that won't open, a sheet that isn't one
  }
}
