import { signingPdfFile } from '@/lib/contracts/queries'
import { sendStored, storedBytes, storedThumb } from '@/lib/leads/file-store'
import { downloadName } from '@/lib/leads/file-model'

/**
 * (pending modules S03 — 1.0 served a signing document's PDF to the client through a signed URL) An uploaded contract's PDF, through its
 * signing link: the client reads the very file they sign. Only while the link opens — out for signature, or signed (the copy stays theirs);
 * a Draft, a stopped, expired or deleted link sends nothing. `?thumb=1` sends the picture of its first page; `?download=1` hands it over.
 * No session: the token is the permission, as on every client link.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const f = await signingPdfFile(id)
  if (!f) return new Response('Not found', { status: 404 })
  const q = new URL(req.url).searchParams
  const thumb = q.get('thumb') === '1'
  const sent = sendStored(thumb ? await storedThumb(f.fileId) : await storedBytes(f.fileId), req, { name: downloadName(f.name, 'application/pdf'), cache: 'private, no-store', download: q.get('download') === '1' })
  return sent ?? new Response('Not found', { status: 404 })
}
