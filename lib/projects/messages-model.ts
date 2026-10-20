/**
 * (gaps build H — H-Q11…H-Q15) A project's conversation with the client's side — pure and client-safe. The server half is
 * lib/projects/messages.ts.
 */
/** How many lines a conversation opens with — the latest (1.0 read the oldest 200, I-338); "Show earlier" loads as many again. */
export const CHAT_LOAD = 200
export const MESSAGE_MAX = 2000
export const MESSAGE_PHOTOS_MAX = 3
/** A photo as the browser shrank it, in characters of its data URL (G's cap). */
export const MESSAGE_PHOTO_DATA_MAX = 2_400_000
/** The team's bell rings at most once per conversation in this long while the client's messages wait unread (G's quiet window). */
export const CHAT_QUIET_MINUTES = 15
/** How long a removed message can be put back — its Undo (the house snackbar's). */
export const REMOVE_WORDS = 'Message removed'

/** "Germaine · Designer" — how a line names who wrote it: the client by name and Client, a member by name. */
export const whoLine = (o: { authorKind: 'client' | 'studio'; authorName: string; mine: boolean }) => (o.mine ? 'You' : o.authorName)

/** The first words of a message, for a list's second line and the bell — "Can the plumber come on…". */
export function firstWords(body: string, max = 80): string {
  const one = body.replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one
}

/* ── (parity map 2026-10-10 — his "build everything that's in 1.0", UC-064 · UC-066 · UC-067 · UC-069 · UC-070) ──────────────────────
   More than one conversation, more than photos. Pure and client-safe. */

/** (UC-064) Whose conversation: the client's side with the team (`client`, a project's — the household reads it), the team's own (`team`, a
    project's — the client never sees it), or a lead's before Won (`lead` — the lead invited to the portal writes from their page). */
/** (pending modules S26 — his "build all of them" 2026-10-11, cards studio:team-chats · api:messages-free-chats) two more, both the studio's
    alone: a lead's own Team conversation before Won (`lead-team` — its team talks it through; once Won the project's Team conversation carries
    it on, its lines first), and a conversation among the studio's members (`chat` — two members, a named group, or the studio's room every
    member reads). A client never reads either: the portal builds its own keys (`client` · `lead`) and never parses one it is sent. */
export type ConversationKind = 'client' | 'team' | 'lead' | 'lead-team' | 'chat'
/** (UC-070) A conversation's key — `conversation_prefs.conversation`, `/chat?open=`, the link Copy link makes: `project:<id>` · `team:<id>` ·
    `lead:<leadId>` · (S26) `lead-team:<leadId>` · `chat:<conversationId>` (the studio's room is `chat:studio`). A bare project id still opens
    its client conversation (the address /chat?open=<project> the bell and the tab carry). */
export const conversationKey = (kind: ConversationKind, id: string) => `${kind === 'client' ? 'project' : kind}:${id}`
export function parseConversationKey(v: string | null | undefined): { kind: ConversationKind; id: string } | null {
  const s = (v ?? '').trim()
  if (!s || s.length > 120) return null
  const m = /^(project|team|lead-team|lead|chat):(.+)$/.exec(s)
  if (!m) return /^[A-Za-z0-9_-]+$/.test(s) ? { kind: 'client', id: s } : null
  return { kind: m[1] === 'project' ? 'client' : (m[1] as Exclude<ConversationKind, 'client'>), id: m[2]! }
}
/** (S26) Whether only the studio reads a conversation of this kind (a project's or a lead's Team conversation, a members' one) — the client's
    side never sees it, its bell never rings for it, and the composer says so. */
export const studioOnly = (kind: ConversationKind) => kind === 'team' || kind === 'lead-team' || kind === 'chat'

/* ── (S26) a conversation among the studio's members ───────────────────────────────────────────────────────────────────────────────── */
/** What kind of members' conversation: two people, a named group, the room every member of the studio reads. */
export type ChatType = 'direct' | 'group' | 'studio'
/** The studio's room — one per studio, every member who opens Messages in it (no participant rows: who is in it is who is in the studio). */
export const STUDIO_ROOM = 'studio'
export const studioRoomTitle = (studio: string) => `Everyone at ${studio}`
/** A group's name — 1.0 asked for one ("Required — enter a name to continue"). */
export const GROUP_NAME_MAX = 60
export function cleanGroupName(v: unknown): string {
  return (typeof v === 'string' ? v : '').replace(/\s+/g, ' ').trim().slice(0, GROUP_NAME_MAX)
}
/** The two members of a direct conversation as one key (sorted), so a pair has one conversation however it is started. */
export const pairKeyOf = (a: string, b: string) => [a, b].sort().join('|')
/** Messages' list filters (1.0's All · Unread; Escalations are Projects › Tickets in 2.0) — and who it is with: a client, or the team. */
export type InboxFilter = 'all' | 'unread' | 'clients' | 'team'
export const INBOX_FILTERS: { value: InboxFilter; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }, { value: 'clients', label: 'Clients' }, { value: 'team', label: 'Team' },
]
export const keepsRow = (f: InboxFilter, r: { kind: ConversationKind; unread: number }) =>
  f === 'all' ? true : f === 'unread' ? r.unread > 0 : f === 'clients' ? !studioOnly(r.kind) : studioOnly(r.kind)
/** A group's own line, as the people in it read it — "Dane started the group", "You added Hui Min". `me` reads as You. */
export type ChatEvent = 'created' | 'added' | 'removed' | 'left' | 'renamed'
export function chatEventWords(event: ChatEvent, meta: { by?: string | null; byId?: string | null; names?: string[]; name?: string | null }, meId: string | null): string {
  const by = meta.byId && meta.byId === meId ? 'You' : meta.by || 'Someone'
  const list = (n: string[]) => (n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}` : n[0] ?? '')
  switch (event) {
    case 'created': return meta.names?.length ? `${by} started the group with ${list(meta.names)}` : `${by} started the group`
    case 'added': return `${by} added ${list(meta.names ?? [])}`
    case 'removed': return `${by} took ${meta.name ?? 'someone'} out`
    case 'left': return `${meta.byId && meta.byId === meId ? 'You' : meta.name ?? 'Someone'} left`
    case 'renamed': return `${by} named the group “${meta.name ?? ''}”`
  }
}
/** (S26, 1.0's links in a conversation's panel) The web addresses a message's words hold — a conversation's Links. */
export const LINK_IN_TEXT = /\bhttps?:\/\/[^\s<>"'`]+[^\s<>"'`.,;:!?)\]}]/gi
export function linksIn(text: string): string[] {
  return [...new Set(text.match(LINK_IN_TEXT) ?? [])].slice(0, 20)
}
/** How a link reads in a list — its site and path, never the whole address ("maps.google.com/…"). */
export function linkLabel(href: string): string {
  try { const u = new URL(href); const path = u.pathname.replace(/\/$/, ''); return `${u.hostname.replace(/^www\./, '')}${path ? (path.length > 28 ? `${path.slice(0, 27)}…` : path) : ''}` } catch { return href }
}
/** (S26) Under one's own newest line: who has read it — "Seen by Germaine", "Seen by Germaine, Hui Min and 2 others", or (two people) "Seen".
    Read off each reader's read mark, so nothing says Seen before someone opened it (1.0 drew its two ticks on every line). */
export function seenWords(readers: readonly { name: string; at: number }[], lineAt: number, direct: boolean): string | null {
  const saw = readers.filter((r) => r.at >= lineAt).map((r) => r.name)
  if (!saw.length) return null
  if (direct) return 'Seen'
  const first = saw.slice(0, 2)
  const rest = saw.length - first.length
  return `Seen by ${rest > 0 ? `${first.join(', ')} and ${rest} ${rest === 1 ? 'other' : 'others'}` : first.length > 1 ? `${first[0]} and ${first[1]}` : first[0]}`
}
/** How far a reader has read a conversation lives in `chat_reads` under this id: the client's conversation keeps the bare project id it always
    had (so every read mark made before stays), the team's and a lead's their key. */
export const readIdOf = (kind: ConversationKind, id: string) => (kind === 'client' ? id : conversationKey(kind, id))
/** (S26) Where one's message is filed: a conversation of a lead's (its client's, its team's — before Won or after) keeps its files in the
    lead's Files › Messages; a members' conversation keeps them with the conversation, for its people alone. */
export const chatFileAddress = (fileId: string) => `/chat/file/${fileId}`

/** (UC-066) A file in a message beyond its photos — a PDF, a document, a sheet, a video, or a voice note recorded in the browser — kept as a
    file of the project in Files › Messages. `src` is the address for the side reading it. */
export type MessageFileKind = 'file' | 'video' | 'voice'
export type MessageFile = { id: string; kind: MessageFileKind; name: string; size: number; mime: string; durationMs: number | null; src: string }
/** (UC-067) What a message shares besides words: the site's place (the project's address as a map link — never the device's), or a person's
    card (a member or a vendor) with Call and WhatsApp. */
export type MessageShare =
  | { kind: 'place'; label: string; href: string }
  | { kind: 'contact'; name: string; role: string; phone: string | null }

/** 1.0's file cap in a conversation (UC-066): 25 MB — a phone's video fits. It travels in pieces under the 12 MB body (next.config.ts). */
export const MESSAGE_FILE_MAX = 25 * 1024 * 1024
/** Each piece of a file on its way, in characters of base64 — a multiple of 4, well under the action's 12 MB body. */
export const FILE_PIECE = 6_000_000
/** Up to this many files with one message (photos apart). */
export const MESSAGE_FILES_MAX = 3
/** A voice note's longest (1.0 had none; five minutes keeps a note a note). */
export const VOICE_MAX_MS = 5 * 60_000
/** What the File picker offers (UC-066): PDF, documents, sheets, video. */
export const MESSAGE_FILE_ACCEPT = 'application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,video/mp4,video/quicktime,video/webm,.mov,.mp4'
/** The kind a picked file is: a video, a voice note (an audio file), else a file. */
export function messageFileKind(mime: string, name: string): MessageFileKind {
  const t = mime.toLowerCase()
  if (t.startsWith('audio/')) return 'voice'   // first: a recorded voice note is a .webm too
  if (t.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(name)) return 'video'
  return 'file'
}
/** "2.4 MB" · "380 KB" — a file's size in a line. */
export function sizeWords(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
/** "0:42" — a voice note's length. */
export function clockWords(ms: number | null | undefined): string {
  const s = Math.max(0, Math.round((ms ?? 0) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
/** The map link a place shares — the address as Google Maps finds it (no coordinates are kept). */
export const placeHref = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
/** A message's words when it carries no words of its own — a list's second line, the bell, a client's email. */
export function messageGist(o: { body: string; photos?: number; files?: { kind: MessageFileKind }[]; share?: MessageShare | null }): string {
  if (o.body.trim()) return o.body
  const f = o.files ?? []
  if (o.share?.kind === 'place') return `The site’s location — ${o.share.label}`
  if (o.share?.kind === 'contact') return `${o.share.name}’s contact`
  if (f.some((x) => x.kind === 'voice')) return 'A voice note'
  if (f.some((x) => x.kind === 'video')) return f.length > 1 ? `${f.length} files` : 'A video'
  if (f.length) return f.length > 1 ? `${f.length} files` : 'A file'
  return o.photos && o.photos > 1 ? 'Photos' : o.photos ? 'A photo' : ''
}

/** (UC-067) The emoji button's set — 1.0's most used, in four rows (the picker inserts at the caret; nothing is sent until Send). */
export const EMOJI: readonly string[] = [
  '😀', '😊', '😂', '🙂', '😉', '😍', '🥳', '😎', '🤔', '😮', '😢', '🙏',
  '👍', '👎', '👏', '🙌', '👌', '✌️', '🤝', '💪', '👋', '🫶', '❤️', '🎉',
  '✅', '❌', '⚠️', '⭐', '🔥', '💯', '📌', '📎', '📷', '🏠', '🛠️', '🧱',
  '🪵', '🎨', '🚿', '💡', '🛋️', '🚚', '📅', '⏰', '💰', '🧾', '🔑', '✨',
]

/** (UC-069) Where a query lands in a conversation's lines — the ids of the lines whose words hold it, oldest first. */
export function findInLines(lines: readonly { id: string; body: string; removed?: boolean; files?: { name: string }[] }[], query: string): string[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return lines.filter((l) => !l.removed && (l.body.toLowerCase().includes(q) || (l.files ?? []).some((f) => f.name.toLowerCase().includes(q)))).map((l) => l.id)
}
