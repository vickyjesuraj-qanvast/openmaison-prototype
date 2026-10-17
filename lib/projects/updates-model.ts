/**
 * (REG-948…, Projects round 3 — Updates) A project's updates to its client: the words, the states and the rules, pure and client-safe.
 * The report's Updates row: "A tab of posts with a composer that really uploads. States: Draft, In review, Published, Sent back (with its
 * reason and Resubmit). Edit and unpublish at any time". Q-17: review is on by default; an Owner's or an Admin's post publishes at once; a
 * switch in Settings › Projects. 1.0's faults this answers (inventory D-101…D-123): videos and documents now upload, a sent-back update
 * says why and resubmits, every update edits, and a withdrawn one can be published again.
 *
 * Server reads: lib/projects/updates.ts · actions: app/projects/updates-actions.ts · the tab: components/projects/updates/.
 */
import { runsStudio } from '@/lib/leads/assign-policy'

export const UPDATE_STATUSES = ['draft', 'in_review', 'published', 'sent_back', 'withdrawn'] as const
export type UpdateStatus = (typeof UPDATE_STATUSES)[number]
export const isUpdateStatus = (v: unknown): v is UpdateStatus => typeof v === 'string' && (UPDATE_STATUSES as readonly string[]).includes(v)
export const UPDATE_STATUS_LABEL: Record<UpdateStatus, string> = { draft: 'Draft', in_review: 'In review', published: 'Published', sent_back: 'Sent back', withdrawn: 'Withdrawn' }
/** The DS Tag's colour for each state — the stage tag's grammar (green runs, yellow waits, red needs you, grey is off the client's view). */
export const UPDATE_STATUS_TONE: Record<UpdateStatus, 'green' | 'yellow' | 'red' | 'default'> = { published: 'green', in_review: 'yellow', sent_back: 'red', draft: 'default', withdrawn: 'default' }

/* ── The review rule (Settings › Projects) ─────────────────────────────────────────────────────────────────────────────────────── */

export const UPDATE_REVIEW_KEY = 'project_update_review'
/** On unless the studio switched it off (Q-17). */
export const parseUpdateReview = (v: unknown): boolean => {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return v } })() : v
  if (raw && typeof raw === 'object' && 'on' in raw) return (raw as { on: unknown }).on !== false
  return raw !== false && raw !== 'false'
}
/** (gaps build D, item 10 — 1.0 D-76) The members named as reviewers beside the Owners and Admins (the same setting, `{ on, reviewers }`). */
export const parseUpdateReviewers = (v: unknown): string[] => {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  const list = raw && typeof raw === 'object' ? (raw as { reviewers?: unknown }).reviewers : null
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []
}
/** Who reviews: the studio's Owners and Admins — (gaps build D, item 10) and the members named in Settings › Projects (`who`). */
export const mayReviewUpdate = (role: string | null | undefined, who?: { id: string; reviewers?: readonly string[] | null } | null) => runsStudio(role) || (!!who && !!who.reviewers?.includes(who.id))
/** An Owner's, an Admin's or a named reviewer's post — or anyone's while review is off — reaches the client at once; anyone else's waits In review. */
export const publishesAtOnce = (reviewOn: boolean, role: string | null | undefined, who?: { id: string; reviewers?: readonly string[] | null } | null) => !reviewOn || mayReviewUpdate(role, who)
export const REVIEW_RULE = 'Only an Owner, an Admin or a named reviewer reviews an update'
export const SETTINGS_RULE = 'Only Owners and Admins change the project settings'

/** Withdraw takes a published update off the client's view — until the client has opened it (the portal stamps `clientOpenedAt`). */
export function withdrawBlock(u: { status: UpdateStatus; clientOpenedAt: number | null; publishedAt: number | null }): string | null {
  if (u.status !== 'published') return 'Only a published update can be withdrawn'
  if (u.clientOpenedAt && (!u.publishedAt || u.clientOpenedAt >= u.publishedAt)) return 'The client has already seen it'
  return null
}
/** Delete keeps to what the client can't see: a published update is withdrawn first. */
export function deleteBlock(u: { status: UpdateStatus }): string | null {
  return u.status === 'published' ? 'Withdraw it first — the client can see it' : null
}

/* ── (fix-C, C-01) A change to a published update, held for review ─────────────────────────────────────────────────────────── */

/**
 * An edit to what the client already reads never takes it away: under the review rule the published words stay on the portal (with their
 * date, their "Seen by") and the change waits beside them — the template rule (REG-501: a published template keeps printing while its change
 * waits). Approve swaps the words in and keeps the publish date; Send back keeps the change with its reason for the author to fix.
 */
export type UpdatePendingRecord = {
  title: string
  body: string | null
  milestoneId: string | null
  fileIds: string[]
  /** Who made the change, and when (ms). */
  by: string
  at: number
  /** A Send back's reason — set, the change waits on its author, not on review. */
  note?: string | null
  reviewedBy?: string | null
  reviewedAt?: number | null
}
export function parsePending(v: unknown): UpdatePendingRecord | null {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.title !== 'string' || typeof r.by !== 'string' || typeof r.at !== 'number') return null
  return {
    title: r.title, body: typeof r.body === 'string' ? r.body : null, milestoneId: typeof r.milestoneId === 'string' ? r.milestoneId : null,
    fileIds: Array.isArray(r.fileIds) ? r.fileIds.filter((x): x is string => typeof x === 'string') : [], by: r.by, at: r.at,
    note: typeof r.note === 'string' && r.note ? r.note : null, reviewedBy: typeof r.reviewedBy === 'string' ? r.reviewedBy : null,
    reviewedAt: typeof r.reviewedAt === 'number' ? r.reviewedAt : null,
  }
}
/** A held change waits for review (not sent back). */
export const pendingWaits = (p: UpdatePendingRecord | null | undefined) => !!p && !p.note
/** The change as the feed shows it beside the published words. */
export type UpdatePendingView = {
  title: string
  html: string
  milestoneId: string | null
  milestoneName: string | null
  media: UpdateMedia[]
  by: UpdatePerson
  at: number
  /** Sent back with a reason — the author's to fix. */
  sentBack: { by: UpdatePerson; at: number | null; note: string } | null
}
/** (C-22) The client opened this version: their open is at or after its publish and after its last edit. */
export const seenSince = (u: { clientOpenedAt: number | null; publishedAt: number | null; editedAt: number | null }) =>
  !!u.clientOpenedAt && (!u.publishedAt || u.clientOpenedAt >= u.publishedAt) && (!u.editedAt || u.clientOpenedAt >= u.editedAt)

/* ── What an update carries ────────────────────────────────────────────────────────────────────────────────────────────────── */

export const TITLE_MAX = 120
/** The body as the editor's HTML — a few paragraphs; a save past it is refused, never cut. */
export const BODY_HTML_MAX = 20_000
export const MEDIA_MAX = 12
/** A video's or a document's own bytes travel in the action's one object under the 12 MB body (next.config.ts): 6 MB of file. */
export const FILE_BYTES_MAX = 6 * 1024 * 1024
/** What the composer's picker and its drop take: pictures, videos, PDFs and Office documents (1.0's three kinds, D-40). */
export const MEDIA_ACCEPT = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx'
export const SITE_UPDATES_FOLDER = 'Site updates'

export type MediaKind = 'photo' | 'video' | 'doc'
export function mediaKindOf(name: string, mime: string | null | undefined): MediaKind | null {
  const m = (mime ?? '').toLowerCase()
  if (m.startsWith('image/')) return 'photo'
  if (m.startsWith('video/')) return 'video'
  if (m === 'application/pdf' || /\.(pdf|docx?|xlsx?)$/i.test(name)) return 'doc'
  if (/\.(jpe?g|png|webp|gif|heic)$/i.test(name)) return 'photo'
  if (/\.(mp4|mov|m4v|webm)$/i.test(name)) return 'video'
  return null
}

export type UpdateMedia = {
  fileId: string
  name: string
  kind: MediaKind
  /** A picture's address (the file's thumb) · a video's poster frame · null for a document. */
  thumb: string | null
  /** The file's own bytes — a video plays from it, a document opens from it; null when only a picture was kept. */
  src: string | null
  mime: string | null
  sizeBytes: number | null
}
export type UpdatePerson = { id: string; name: string; color: string } | null

/** One update as the feed and the composer read it. Times are ms. */
export type UpdateView = {
  id: string
  title: string
  html: string
  status: UpdateStatus
  milestoneId: string | null
  milestoneName: string | null
  author: UpdatePerson
  createdAt: number
  updatedAt: number
  editedAt: number | null
  editedBy: UpdatePerson
  submittedAt: number | null
  submittedBy: UpdatePerson
  reviewedAt: number | null
  reviewedBy: UpdatePerson
  reviewNote: string | null
  publishedAt: number | null
  publishedBy: UpdatePerson
  withdrawnAt: number | null
  withdrawnBy: UpdatePerson
  clientOpenedAt: number | null
  /** (fix-F, C-07) who opened it on the portal, by their given name — the client, or someone from their household; null when unknown */
  clientOpenedBy?: string | null
  media: UpdateMedia[]
  /** (fix-C, C-01) A change to this published update waiting for review (or sent back) — the client still reads the fields above. */
  pending: UpdatePendingView | null
}

export type ProjectUpdatesData = {
  project: { id: string; name: string; number: string; stage: string; leadId: string }
  /** (fix-C, C-08) `invited`: the client holds the portal (an invite not withdrawn); `section`: the portal's Updates section is on — the words
      say what is true ("… sees it once invited to the portal"), as Choices' do. */
  client: { name: string; firstName: string; invited: boolean; section: boolean }
  updates: UpdateView[]
  /** Round 2's milestones, when the project has any — the composer's picker shows only then. (simplify S-23) `running`: under way now — the
      phone's post starts on it (its title and its milestone). */
  milestones: { id: string; name: string; running?: boolean }[]
  viewer: { id: string; name: string; role: string; mayPost: boolean; mayReview: boolean }
  reviewOn: boolean
  /** (gaps build D, item 10) the members named as reviewers beside the Owners and Admins */
  reviewers?: string[]
  now: number
}

/** Where an update sits in the feed: its publish, else its send for review, else its making. */
export const feedAt = (u: Pick<UpdateView, 'publishedAt' | 'submittedAt' | 'createdAt'>): number => u.publishedAt ?? u.submittedAt ?? u.createdAt

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** The client's date line as the portal canvas prints it: "Fri 2 Oct". */
export const clientDay = (at: number) => { const d = new Date(at); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}` }

/** The feed's filter chips — one at a time; All is every update the viewer may see. */
export type UpdateShow = 'all' | UpdateStatus
export const UPDATE_SHOW: { value: UpdateShow; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'in_review', label: 'In review' },
  { value: 'sent_back', label: 'Sent back' }, { value: 'draft', label: 'Draft' }, { value: 'withdrawn', label: 'Withdrawn' },   // (fix-C, C-28) one number with its neighbours
]

/**
 * (fix-C, C-08) Where a post goes, in words that are true for this client: the portal shows it, or not until the client is invited, or not
 * while the studio has the portal's Updates switched off (Choices' sentence, REG-1050's one word per state).
 */
export function clientReach(c: { firstName: string; invited: boolean; section: boolean }): { reaches: boolean; line: string | null } {
  if (!c.invited) return { reaches: false, line: `${c.firstName} sees it once invited to the portal.` }
  if (!c.section) return { reaches: false, line: `The portal’s Updates are switched off — ${c.firstName} doesn’t see updates there.` }
  return { reaches: true, line: null }
}

/** The words a search looks in: the title, the body's text, who posted it, its milestone and its state. */
export const updateSearchFields = (u: UpdateView): string[] => [u.title, u.html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' '), u.author?.name ?? '', u.milestoneName ?? '', UPDATE_STATUS_LABEL[u.status]]

/* ── The listing's and the Overview's facts (lib/projects/attention.ts, project-columns.tsx, scopes.ts) ─────────────────────────── */

/** Days a running project may go without a published update before it is raised (the report's "No update for 14 days", Q-07). */
export const UPDATE_GAP_DAYS = 14

/** One update as the Overview's Latest updates card lists it. */
export type LatestUpdate = { id: string; title: string; status: UpdateStatus; at: number; author: string | null; photos: number; thumb: string | null }
