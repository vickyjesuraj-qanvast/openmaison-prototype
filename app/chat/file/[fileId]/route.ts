import { and, eq, isNull, like } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversationFiles, conversationMessages } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { opensWorkspace } from '@/lib/settings/roles'
import { sendStored } from '@/lib/leads/file-store'
import { chatPeople, chatRow } from '@/lib/projects/studio-chats'
import { STUDIO_CACHE } from '@/lib/visualizer/picture-store'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in

/**
 * (pending modules S26 — card studio:team-chats, "attachments other than photos") A photo or a file sent in a conversation among the studio's
 * members — to the people in it alone (never to anyone else in the studio, never to a client), while a line of it still carries it (or it is
 * the sender's own, on its way). `?download=1` hands it over under its own name, as Files' raw route does. PRODUCTION: like /files/raw, the
 * route needs an authenticated session before the conversation's people are asked.
 */
export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { fileId } = await params
  const [f] = await db.select().from(conversationFiles).where(eq(conversationFiles.id, fileId)).limit(1)
  const viewer = await fetchViewer()
  if (!f || !opensWorkspace(viewer.role)) return new Response('Not found', { status: 404 })
  const row = await chatRow(f.conversationId)
  if (!row || !(await chatPeople(row)).some((p) => p.id === viewer.id)) return new Response('Not found', { status: 404 })
  const [on] = await db.select({ id: conversationMessages.id }).from(conversationMessages)
    .where(and(eq(conversationMessages.conversationId, f.conversationId), isNull(conversationMessages.deletedAt), like(conversationMessages.attachments, `%"fileId":"${fileId}"%`))).limit(1)
  if (!on && f.createdBy !== viewer.id) return new Response('Not found', { status: 404 })
  const download = new URL(req.url).searchParams.get('download') === '1'
  return sendStored(f.data, req, { name: f.name, cache: STUDIO_CACHE, download }) ?? new Response('Not found', { status: 404 })
}
