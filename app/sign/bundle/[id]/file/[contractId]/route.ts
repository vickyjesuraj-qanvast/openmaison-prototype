import { bundlePdfFile } from '@/lib/contracts/queries'
import { sendStored, storedBytes, storedThumb } from '@/lib/leads/file-store'
import { downloadName } from '@/lib/leads/file-model'

/** (pending modules S03) A document of a set sent together — its PDF through the set's own link, on the single link's rules (`/sign/<token>/file`). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; contractId: string }> }) {
  const { id, contractId } = await params
  const f = await bundlePdfFile(id, contractId)
  if (!f) return new Response('Not found', { status: 404 })
  const q = new URL(req.url).searchParams
  const thumb = q.get('thumb') === '1'
  const sent = sendStored(thumb ? await storedThumb(f.fileId) : await storedBytes(f.fileId), req, { name: downloadName(f.name, 'application/pdf'), cache: 'private, no-store', download: q.get('download') === '1' })
  return sent ?? new Response('Not found', { status: 404 })
}
