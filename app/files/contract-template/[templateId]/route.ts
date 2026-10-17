import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractTemplateFiles, contractTemplates } from '@/lib/db/schema'
import { sendStored } from '@/lib/leads/file-store'
import { downloadName } from '@/lib/leads/file-model'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in
import { refusesPath } from '@/lib/leads/visibility'

/**
 * (pending modules S03) A standard PDF of the studio's library — the gallery's thumbnail (`?thumb=1`, its first page), the template editor's
 * viewer, `?download=1` its download. The studio's own: a client reads the lead's copy through the signing link, never this address.
 * PRODUCTION: like /files/raw, this needs an authenticated studio session.
 */
export async function GET(req: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { templateId } = await params
  if (await refusesPath(`/templates/contracts/${templateId}`)) return new Response('Not found', { status: 404 })   // (S44Z) the template library's file answers as its pages do: not Marketing's, not Accounting's
  const [r] = await db.select({ name: contractTemplates.fileName, title: contractTemplates.title, data: contractTemplateFiles.data, thumb: contractTemplateFiles.thumb })
    .from(contractTemplates).innerJoin(contractTemplateFiles, eq(contractTemplateFiles.templateId, contractTemplates.id)).where(eq(contractTemplates.id, templateId)).limit(1)
  if (!r) return new Response('Not found', { status: 404 })
  const q = new URL(req.url).searchParams
  const sent = sendStored(q.get('thumb') === '1' ? r.thumb : r.data, req, { name: downloadName(r.name ?? r.title, 'application/pdf'), cache: 'private, no-cache', download: q.get('download') === '1' })
  return sent ?? new Response('Not found', { status: 404 })
}
