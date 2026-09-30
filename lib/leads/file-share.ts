import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

/*
 * (UX audit 2026-09-30, T9) A lead's file shared with the client — a read-only link that opens without signing in, modelled on the renders
 * link but with no table of its own: the address carries the file's id and the app's signature of it (HMAC-SHA256 under AUTH_SECRET), so
 * nobody can make one for a file they were not given. The link lives as long as the file does: a file moved to the trash, or a lead
 * deleted, stops answering (app/f/[token]/route.ts).
 */

const secret = () => process.env.AUTH_SECRET || null
const sign = (fileId: string, key: string) => createHmac('sha256', key).update(`file:${fileId}`).digest('base64url').slice(0, 32)

/** The share path of a file — `/f/<id>.<signature>` — or null when the app has no secret to sign with. */
export function fileSharePath(fileId: string): string | null {
  const key = secret()
  return key ? `/f/${fileId}.${sign(fileId, key)}` : null
}

/** The file id a share token stands for, or null when the signature is not the app's. */
export function readShareToken(token: string): string | null {
  const key = secret()
  const dot = token.lastIndexOf('.')
  if (!key || dot <= 0) return null
  const id = token.slice(0, dot), given = Buffer.from(token.slice(dot + 1))
  const want = Buffer.from(sign(id, key))
  return given.length === want.length && timingSafeEqual(given, want) ? id : null
}
