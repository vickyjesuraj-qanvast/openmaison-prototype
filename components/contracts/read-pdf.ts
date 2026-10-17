import { pdfFirstPage, readAsDataUrl } from '@/components/leads/files/file-pictures'
import { PDF_DIDNT_READ, pdfFileProblem, pdfNameOf, type PickedPdf } from '@/lib/contracts/pdf'

/**
 * (pending modules S03) A picked PDF as a contract keeps it — its bytes and the picture of its first page (Files' own way, gaps build E):
 * checked before it is read (a PDF, up to 8 MB), then read. Every place a contract takes a PDF reads it here: Import from File, Mark as
 * signed, the Won step's upload, a standard document for the library. Answers the rule when it refuses.
 */
export async function readPickedPdf(file: File): Promise<PickedPdf | { error: string }> {
  const why = pdfFileProblem(file); if (why) return { error: why }
  const raw = await readAsDataUrl(file).catch(() => null)
  if (!raw || !/^data:[^,]*;base64,/.test(raw)) return { error: PDF_DIDNT_READ }
  const data = raw.replace(/^data:[^,]*;base64,/, 'data:application/pdf;base64,')
  const thumb = await pdfFirstPage(file).catch(() => null)
  return { name: pdfNameOf(file.name), data, thumb }
}
export const isPdfRefusal = (r: PickedPdf | { error: string }): r is { error: string } => 'error' in r
