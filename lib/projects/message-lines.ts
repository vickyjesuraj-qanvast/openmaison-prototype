import 'server-only'
import type { ProjectMessage, LeadMessage } from '@/lib/db/schema'
import { rawAddress } from '@/lib/leads/file-store'
import { placeHref, type MessageFile, type MessageFileKind, type MessageShare } from './messages-model'

/*
 * (gaps build H · parity map UC-064…UC-067) One line of a conversation as both sides draw it, and how a stored message's attachments read —
 * moved out of lib/projects/messages.ts (pending modules S26) so the members' conversations (lib/projects/studio-chats.ts) draw their lines
 * the same way without reading messages.ts, which reads them. messages.ts re-exports all of it, so its callers are unchanged.
 */

export type ChatLine = { id: string; authorKind: 'client' | 'studio'; authorId: string | null; authorName: string; body: string; photos: { id: string; src: string }[]; at: number; removed: boolean
  /** a member's avatar tint (the client's side has none) */ color: string | null
  /** (parity map, UC-066) the files beyond photos — a document, a video, a voice note */ files: MessageFile[]
  /** (parity map, UC-067) the site's place or a person's card */ share: MessageShare | null
  /** (parity map, UC-064) written on the lead's conversation before Won — the project's client conversation reads them first; (S26) the
      project's Team conversation reads its lead's Team lines first the same way */ fromLead?: boolean
  /** (pending modules S26) a group's own line ("Dane added Hui Min") — `body` holds its words as this reader reads them */ event?: string | null }

/** A message's row as the tables keep it — the project's (photos in their own column, the share in `meta`), a lead's and (S26) a members'
    conversation's (everything in `attachments`: `{ fileId, kind, … }` for a file or a photo, `{ share }` for a place or a contact). */
export type AnyMessage = Pick<ProjectMessage, 'id' | 'authorKind' | 'authorId' | 'authorName' | 'body' | 'createdAt' | 'deletedAt'> & { photos?: unknown; attachments?: unknown; meta?: unknown }
const FILE_KINDS: readonly MessageFileKind[] = ['file', 'video', 'voice']
export function attachmentsOf(v: unknown): { photos: string[]; files: Omit<MessageFile, 'src'>[]; share: MessageShare | null } {
  const out = { photos: [] as string[], files: [] as Omit<MessageFile, 'src'>[], share: null as MessageShare | null }
  if (!Array.isArray(v)) return out
  for (const x of v as unknown[]) {
    if (!x || typeof x !== 'object') continue
    const r = x as Record<string, unknown>
    if (r.share && typeof r.share === 'object') { out.share = shareOf(r.share); continue }
    if (typeof r.fileId !== 'string') continue
    if (r.kind === 'photo') { out.photos.push(r.fileId); continue }
    const kind = FILE_KINDS.includes(r.kind as MessageFileKind) ? (r.kind as MessageFileKind) : 'file'
    out.files.push({ id: r.fileId, kind, name: typeof r.name === 'string' ? r.name : 'File', size: typeof r.size === 'number' ? r.size : 0, mime: typeof r.mime === 'string' ? r.mime : '', durationMs: typeof r.durationMs === 'number' ? r.durationMs : null })
  }
  return out
}
export function shareOf(v: unknown): MessageShare | null {
  if (!v || typeof v !== 'object') return null
  const r = v as Record<string, unknown>
  if (r.kind === 'place' && typeof r.label === 'string' && r.label) return { kind: 'place', label: r.label, href: placeHref(r.label) }
  if (r.kind === 'contact' && typeof r.name === 'string' && r.name) return { kind: 'contact', name: r.name, role: typeof r.role === 'string' ? r.role : '', phone: typeof r.phone === 'string' && r.phone ? r.phone : null }
  return null
}
/** Every file id a message holds (its photos and its files) — the portal's file rule and Files' own reads. */
export function messageFileIds(m: { photos?: unknown; attachments?: unknown }): string[] {
  const photos = Array.isArray(m.photos) ? (m.photos as unknown[]).filter((x): x is string => typeof x === 'string') : []
  const a = attachmentsOf(m.attachments)
  return [...photos, ...a.photos, ...a.files.map((f) => f.id)]
}

export function lineOf(m: AnyMessage | ProjectMessage | LeadMessage, src: (id: string) => string, tint: Map<string, string>, o: { fileSrc?: (id: string) => string; fromLead?: boolean } = {}): ChatLine {
  const removed = !!m.deletedAt
  const a = attachmentsOf('attachments' in m ? m.attachments : null)
  const own = 'photos' in m && Array.isArray(m.photos) ? (m.photos as unknown[]).filter((x): x is string => typeof x === 'string') : []
  const photos = removed ? [] : [...own, ...a.photos].map((id) => ({ id, src: src(id) }))
  const fileSrc = o.fileSrc ?? rawAddress
  const files = removed ? [] : a.files.map((f) => ({ ...f, src: fileSrc(f.id) }))
  const share = removed ? null : shareOf('meta' in m ? m.meta : null) ?? a.share
  return { id: m.id, authorKind: m.authorKind === 'client' ? 'client' : 'studio', authorId: m.authorId, authorName: m.authorName, body: removed ? '' : m.body, photos, at: m.createdAt.getTime(), removed,
    color: m.authorKind === 'studio' && m.authorId ? tint.get(m.authorId) ?? null : null, files, share, ...(o.fromLead ? { fromLead: true } : {}) }
}
