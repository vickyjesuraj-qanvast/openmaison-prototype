/**
 * (Projects round 4a — Q-14 · Q-37…Q-50, the Client Portal Proposal https://claude.ai/artifact/CjJ1PknxFKrk1deXrBAdbr) The client portal,
 * part one: pure and client-safe — the portal's address rules, Live / Paused, a client's access state, the portal's tabs, the What needs you
 * item, the WhatsApp drafts and who may change what. The server half is lib/portal/queries.ts · session.ts · home.ts.
 *
 * REGISTRIES the later rounds append to (never reorder):
 *   · `PORTAL_TABS`    — the client's tabs. Home and Files here; r4b Schedule · Updates, r6 Money, r8 Choices insert theirs in the order
 *                        Home · Schedule · Updates · Money · Choices · Files. A tab not built is not listed (never a coming-soon tab).
 *   · `NeedKind`       — what can wait on the client (lib/portal/needs.ts holds the producers): r4b a stage to confirm, r6 a payment,
 *                        r8 a choice.
 *   · `ACCESS_SECTIONS` (lib/portal/needs.ts) — the Client access panel's "What {client} can see" rows.
 */
import { runsStudio } from '@/lib/leads/assign-policy'

/* ── The portal's set-up (settings key `portal`) ─────────────────────────────────────────────────────────────────────────── */
export const PORTAL_KEY = 'portal'
export type PortalSettings = {
  /** Paused: every client page says so under the studio's name and every client request is refused — the four links of today
      (confirm a quote · sign · renders · a shared file) keep working (Q-50). */
  paused: boolean
  pausedAt: number | null
  pausedBy: string | null
  /** When someone first opened the portal as a test client — the Getting it live checklist's fourth step. */
  testedAt: number | null
}
export const DEFAULT_PORTAL: PortalSettings = { paused: false, pausedAt: null, pausedBy: null, testedAt: null }
export function parsePortalSettings(v: unknown): PortalSettings {
  const r = (v ?? {}) as Partial<Record<keyof PortalSettings, unknown>>
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null)
  return { paused: r.paused === true, pausedAt: num(r.pausedAt), pausedBy: typeof r.pausedBy === 'string' ? r.pausedBy : null, testedAt: num(r.testedAt) }
}

/* ── The address ──────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export const portalPath = (slug: string, sub = '') => `/my/${slug}${sub ? `/${sub}` : ''}`
export const SLUG_MIN = 3
export const SLUG_MAX = 40
/** Words an address may not be: the app's own routes and words a client could mistake for OpenMaison's. */
export const RESERVED_SLUGS = ['admin', 'api', 'app', 'login', 'logout', 'my', 'new', 'openmaison', 'maison', 'portal', 'preview', 'settings', 'sign', 'confirm', 'renders', 'files', 'help', 'support', 'www', 'pay', 'test', 'demo', 'studio', 'company', 'leads', 'projects', 'quotes', 'contracts'] as const
const SUFFIX = /[\s,]+(pte\.?\s*ltd\.?|private limited|sdn\.?\s*bhd\.?|llp|ltd\.?|inc\.?|co\.?)$/i

/** An address made from the studio's name — "Demo Studio Pte Ltd" → "demo-studio" (the company suffix goes, as the portal's header drops it). */
export function slugFromName(name: string): string {
  const base = name.replace(SUFFIX, '').trim() || name
  return cleanSlug(base) || 'studio'
}
/** What an address field keeps of what was typed: lower case, a–z, 0–9 and single hyphens, no hyphen at either end. */
export function cleanSlug(raw: string): string {
  return raw.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, SLUG_MAX).replace(/-+$/g, '')
}
/** Why an address can't be had, or null. `taken` answers for an address another studio holds, or one this studio gave up and still
    redirects (it is never handed out again; this studio may take its own old one back). */
export function slugProblem(slug: string, o: { taken: boolean }): string | null {
  if (slug.length < SLUG_MIN) return `Use at least ${SLUG_MIN} letters or numbers`
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) return 'That word is kept for OpenMaison — try another'
  if (o.taken) return 'That address is taken — try another'
  return null
}

/* ── A client's access ────────────────────────────────────────────────────────────────────────────────────────────────────── */
export type AccessState = 'none' | 'invited' | 'opened' | 'withdrawn'
export type AccessStamps = { invitedAt: number | null; openedAt: number | null; lastOpenedAt: number | null; withdrawnAt: number | null }
export function accessState(s: AccessStamps | null): AccessState {
  if (!s) return 'none'
  if (s.withdrawnAt) return 'withdrawn'
  if (s.openedAt) return 'opened'
  return s.invitedAt ? 'invited' : 'none'
}
/** The chip: board 9's colours — "Opened" green · "Invited" yellow · "Not invited" grey · "Withdrawn" red. (the calm UI build 2026-10-27, 5-42 ·
    T-04) The chip says the state only: when it was opened, invited or withdrawn is said once, in the row's own line (the Client access panel's
    caption, `accessWhen`) or its Last opened / Invited columns (Company › Client portal › Clients) — never twice on one row. */
export const ACCESS_LABEL: Record<AccessState, string> = { opened: 'Opened', invited: 'Invited', none: 'Not invited', withdrawn: 'Withdrawn' }
export function accessChip(s: AccessStamps | null, _now: number): { label: string; tone: 'green' | 'yellow' | 'default' | 'red'; state: AccessState } {
  const state = accessState(s)
  const tone = state === 'opened' ? 'green' : state === 'invited' ? 'yellow' : state === 'withdrawn' ? 'red' : 'default'
  return { state, tone, label: ACCESS_LABEL[state] }
}
/** (the calm UI build 2026-10-27, 5-42) The when that left the chip, for a row's own line: "opened 2 hours ago" · "withdrawn 3 Oct"; null when
    there is none to say (not invited, invited — the invite's day is the line's own "Sent 8 Aug"). */
export function accessWhen(s: AccessStamps | null, now: number): string | null {
  const state = accessState(s)
  if (state === 'opened') return `opened ${agoText(s!.lastOpenedAt ?? s!.openedAt!, now)}`
  if (state === 'withdrawn') return `withdrawn ${shortDay(s!.withdrawnAt!)}`
  return null
}
/** The order the Clients tab sorts by state: who opened it, who was invited, who was not, who was withdrawn. */
export const ACCESS_ORDER: Record<AccessState, number> = { opened: 0, invited: 1, none: 2, withdrawn: 3 }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "8 Aug" — a recent date in a line of words (board 8's "Invited 8 Aug"). */
export const shortDay = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS[d.getMonth()]}` }
/** "just now" · "5 minutes ago" · "2 hours ago" · "yesterday" · "3 days ago" · "8 Aug" — how long ago, as people say it. */
export function agoText(at: number, now: number): string {
  const s = Math.max(0, (now - at) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  return shortDay(at)
}

/** The first word of a name — "Hello Benjamin". */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name
/** (REG-1054) The name a page greets someone from a client's household by: the name as entered minus the family name they share with the
    client — so a two-part given name stays whole ("Mei Ling Han" beside Benjamin Han → "Mei Ling", "Tan Hui Min" beside Tan Wei Ling →
    "Hui Min"). The client themselves, or nobody to go by, keep the first word (`firstName`). */
export const givenName = (name: string, client?: string | null): string => {
  const words = name.trim().split(/\s+/)
  const kin = (client ?? '').trim().split(/\s+/)
  if (!client || words.length < 2 || name.trim().toLowerCase() === client.trim().toLowerCase()) return firstName(name)
  const same = (a: string | undefined, b: string | undefined) => !!a && !!b && a.toLowerCase() === b.toLowerCase()
  if (same(words[words.length - 1], kin[kin.length - 1])) return words.slice(0, -1).join(' ')
  if (same(words[0], kin[0])) return words.slice(1).join(' ')
  return firstName(name)
}

/* ── Who may do what (checked on the server; Settings › Studio › Who may do what lists both) ─────────────────────────────────── */
/** (Q-49) The portal's set-up: its address and Live / Paused. Everyone else reads Company › Client portal. */
export const PORTAL_SETUP_RULE = 'Only Owners and Admins change the client portal'
export const mayRunPortal = (role: string) => runsStudio(role)
/** Inviting a client, resending, withdrawing and seeing the portal as them: whoever works on the lead — its members, their Manager, Owners
    and Admins (the project's rule, lib/projects/policy.ts `worksOn`). */
export const PORTAL_ACCESS_RULE = 'Only the client’s team, Owners and Admins invite a client or withdraw their access'

/* ── The client's tabs (one list, absent until built) ─────────────────────────────────────────────────────────────────────── */
export type PortalTab = { key: string; label: string; icon: string; /** the path after /my/<slug>; '' = Home */ path: string }
export const PORTAL_TABS: readonly PortalTab[] = [
  { key: 'home', label: 'Home', icon: 'home', path: '' },
  /* (r4b) the project's schedule as last shared, and its published updates (boards 2 · 3) */
  { key: 'schedule', label: 'Schedule', icon: 'calendar_month', path: 'schedule' },
  /* (the calm UI build 2026-10-27, 3-37) Updates wear a page's glyph — the bubble is Messages' alone */
  { key: 'updates', label: 'Updates', icon: 'article', path: 'updates' },
  /* (Projects round 6) Money — board 4: what's due and how to pay, I have paid, the receipts. (the calm UI build 2026-10-27, 3-02 · T-01) it reads
     "Payments", as the studio's project tab does; its key, section and address stay `money` */
  { key: 'money', label: 'Payments', icon: 'payments', path: 'money' },
  { key: 'choices', label: 'Choices', icon: 'palette', path: 'choices' },   // (Projects round 8)
  { key: 'designs', label: 'Designs', icon: 'wand_shine', path: 'designs' },   // (Projects round 9) the rooms shared from the Visualizer
  { key: 'floor-plan', label: 'Floor plan', icon: 'space_dashboard', path: 'floor-plan' },   // (gaps build G, G-Q1) marked up together — its own switch
  /* (gaps build H, H-Q11 · H-Q2 · H-Q20) the conversation with the team, the issues the client reports, the studio's About page — each behind its
     own section switch; About shows only when there is something on it (`fetchPortalLook`'s hidden list carries it while it is empty). Before
     Files, which ends More (REG-1050), as the Floor plan went in */
  { key: 'messages', label: 'Messages', icon: 'comment', path: 'messages' },
  { key: 'issues', label: 'Issues', icon: 'handyman', path: 'issues' },
  { key: 'about', label: 'About', icon: 'info', path: 'about' },
  { key: 'files', label: 'Files', icon: 'folder', path: 'files' },
]
export const portalTabHref = (slug: string, t: PortalTab) => portalPath(slug, t.path)
/** (REG-1050, the consistency walk) The phone's bar is the studio's own dock (MobileChrome, REG-298/300): four tabs and More — Home ·
    Schedule · Updates · Payments in the bar, the rest (Choices · Designs · Files) in More's sheet. A section that is off leaves either list; More
    goes when nothing is left in it. (the calm UI build 2026-10-27, 3-36) At a desk the header draws the same five — the four and a More ▾ menu
    of the same rest. */
export const PORTAL_BAR_KEYS: readonly string[] = ['home', 'schedule', 'updates', 'money']
export const portalBar = <T extends PortalTab>(tabs: readonly T[]) => ({
  bar: tabs.filter((t) => PORTAL_BAR_KEYS.includes(t.key)),
  more: tabs.filter((t) => !PORTAL_BAR_KEYS.includes(t.key)),
})

/* ── What needs the client ────────────────────────────────────────────────────────────────────────────────────────────────── */
/** Round 4a's kinds; r4b adds 'stage', r6 'payment', r8 'choice' (with their producers in lib/portal/needs.ts). */
export type NeedKind = 'quote' | 'contract' | 'bundle' | 'questions' | 'renders' | 'file' | 'floor_plan'   // (parity map, TD-049) the studio asked for their floor plan
  | 'choice'   // (Projects round 8) a choice shared with the client
  | 'stage'   // (r4b) a finished stage the studio asked the client to confirm
  | 'payment'   // (Projects round 6) an invoice sent and not paid
export type NeedItem = {
  /** Unique on the page — `<kind>:<record id>`. */
  key: string
  kind: NeedKind
  /** The home (lead link) it belongs to. */
  homeId: string
  icon: string
  title: string
  line: string
  /** The button's words on a desk (board 7): "Look and confirm" · "Sign" · "Answer" · "Look" · "Open". */
  action: string
  /** Where the press goes for the client — today's page for it (Q-40). */
  href: string
  /** Where it goes in a studio preview: the studio's own read of the same record, so opening it records nothing as the client's
      (the signing link stamps "Viewed", the renders link counts views). null = the client's own address is safe to open. */
  previewHref: string | null
  /** When the studio asked — "Sent 3 Oct", and the Client access panel's "Waiting on" line. */
  since: number
}

/* ── The WhatsApp drafts (opened on the press, as the signing link's; the platform's own send is the developers', Q-41) ─────────── */
/** Invite / Resend — board 8's "Send the link on WhatsApp". Never "OpenMaison" in it: the portal wears the studio's name alone. */
export function inviteMessage(o: { client: string; studio: string; url: string; again?: boolean }): string {
  return o.again
    ? `Hi ${firstName(o.client)}, here is the link to your page with ${o.studio} again: ${o.url}\n\nSign in with this number. What needs you is at the top.`
    : `Hi ${firstName(o.client)}, ${o.studio} has set up a page for your renovation: ${o.url}\n\nSign in with this number — we send a 6-digit code to it. What needs you is at the top; your files and the steps ahead are there too.`
}
/** Remind — one line per thing waiting, with the address of that thing (fix-G, G-27: the item itself, its words as the client reads them). */
export function remindMessage(o: { client: string; studio: string; what: string; url: string }): string {
  return `Hi ${firstName(o.client)}, a reminder from ${o.studio}. ${o.what}. It’s waiting on your page: ${o.url}`
}
export const waLink = (phone: string, text: string) => `https://wa.me/65${phone.replace(/\D/g, '').slice(-8)}?text=${encodeURIComponent(text)}`

/* ── Sign-in ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export const CODE_LENGTH = 6
/** How long a client stays signed in on one device (1.0's 30 days). A studio preview lasts an hour. */
export const SESSION_DAYS = 30
export const PREVIEW_MINUTES = 60
export const PORTAL_COOKIE = 'om_portal'

/* ── A studio's preview rides in its own address (fix-G, G-03) ───────────────────────────────────────────────────────────── */
/** `/my/<slug>~<preview id>/…` — the preview's id after the studio's address, so every link inside it stays in that preview (the pages
    build their links from the address they were opened on) and two previews in two tabs never trade places. `~` never appears in an
    address (`cleanSlug` keeps a–z, 0–9 and hyphens). */
export const PREVIEW_MARK = '~'
export const previewSlug = (slug: string, id: string) => `${slug}${PREVIEW_MARK}${id}`
/** The address and the preview it names: null for a client's own visit, '' for a preview id that can't be one (it opens nothing). */
export function splitPortalSlug(raw: string): { slug: string; preview: string | null } {
  const decoded = (() => { try { return decodeURIComponent(raw) } catch { return raw } })()
  const at = decoded.indexOf(PREVIEW_MARK)
  if (at < 0) return { slug: decoded, preview: null }
  const id = decoded.slice(at + 1)
  return { slug: decoded.slice(0, at), preview: /^[a-z0-9]{8,40}$/.test(id) ? id : '' }
}
/** Each preview's own cookie — its name carries the preview's id, so one preview never answers for another. */
export const previewCookie = (id: string) => `om_pv_${id}`
/** "the number ending 4567" — the code step names the number without showing it whole. */
export const phoneEnding = (digits: string) => digits.replace(/\D/g, '').slice(-4)

/* ── (fix-F) One way to say a day, a stage and a way back in ─────────────────────────────────────────────────────────────────── */
/** (F-29) The client's one way to say a day: "6 Oct" — with the year only when it isn't this year ("11 Dec 2025"). */
export function clientDay(ms: number, now: number): string {
  const d = new Date(ms)
  return d.getFullYear() === new Date(now).getFullYear() ? shortDay(ms) : `${shortDay(ms)} ${d.getFullYear()}`
}
/** (F-32) A payment stage's name as the client reads it — one case, the studio's template words sentence-cased: "Mid-Project" → "Mid-project".
    A word in capitals (GST, VO) keeps them. */
export const clientStageName = (name: string) => name.trim().split(/\s+/).map((w, i) => (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w) ? w : i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join(' ')
/** (F-19) The refusal a request gets once the session is gone (lib/portal/session.ts `portalActor`) — the page then offers Sign in. */
export const SIGNED_OUT = 'Sign in again to carry on'
/** (F-20) The page to come back to after signing in — a path on this portal's address only (never another site, never the sign-in page). */
export function safeNext(slug: string, next: string | null | undefined): string | null {
  const base = portalPath(slug)
  if (!next || typeof next !== 'string' || next.length > 300) return null
  if (!(next === base || next.startsWith(`${base}/`) || next.startsWith(`${base}?`) || next.startsWith(`${base}#`))) return null
  if (/\/\/|\\|[\u0000-\u001f]/.test(next) || next.startsWith(`${base}/login`)) return null
  return next
}
/** The sign-in page, carrying `?next=` when there is somewhere other than Home to come back to. */
export const loginPath = (slug: string, next?: string | null) => {
  const n = safeNext(slug, next ?? null)
  return `${portalPath(slug, 'login')}${n && n !== portalPath(slug) ? `?next=${encodeURIComponent(n)}` : ''}`
}

/** (Projects r4a → pending modules S02) Show to client's sentence: a render from the AI Visualizer lands on the client's Designs too (1.0 H-82),
    and says so; Stop showing takes it off both. */
export const shownLine = (name: string, on: boolean, designs = 0) => (on ? `${name} is shown to the client${designs ? ' — it’s on their Designs too' : ''}` : `${name} is no longer shown to the client`)
