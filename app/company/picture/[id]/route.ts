import { sendStored } from '@/lib/leads/file-store'
import { studioPictureData } from '@/lib/portal/about'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in

/** (gaps build H, H-Q21 · H-Q22) A studio picture on the studio's own pages — an About photo or a member's portrait (Company › Profile, Members). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { id } = await params
  return sendStored(await studioPictureData(id), req, { name: `${id}.jpg`, cache: 'private, max-age=300' }) ?? new Response('Not found', { status: 404 })
}
