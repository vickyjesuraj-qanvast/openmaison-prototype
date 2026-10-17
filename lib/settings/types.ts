import type { PreparedByMode } from '@/lib/templates/model'
/**
 * Stage movement — studio-level policy set under Settings › Leads (user brief 2026-08-29).
 *   linear   one stage at a time: changing stage opens the Move stage window for the next stage only;
 *            completed stages stay editable, later stages are locked until the current one is done.
 *   flexible leads move instantly to any stage (Undo in the snackbar); details are optional and can be
 *            recorded later from the lead's journey. Won still opens its step — it creates the project.
 * On Hold / Lost keep their compact dialogs in both modes.
 */
export const STAGE_MOVEMENTS = ['linear', 'flexible'] as const
export type StageMovement = (typeof STAGE_MOVEMENTS)[number]
export const DEFAULT_STAGE_MOVEMENT: StageMovement = 'linear'

export const STAGE_MOVEMENT_OPTIONS: { key: StageMovement; title: string; help: string }[] = [
  { key: 'linear', title: 'Linear', help: 'Stages are completed one at a time. Changing a lead’s stage opens the Move stage window and asks for that stage’s details before it moves on.' },
  { key: 'flexible', title: 'Flexible', help: 'Leads move instantly to any stage, with no details asked up front. Stage details can be added later from the lead’s journey.' },
]

export function parseStageMovement(v: unknown): StageMovement {
  return v === 'flexible' ? 'flexible' : 'linear'
}

/**
 * (pending modules S05 — card held:leads, "Edit the lead funnel (Manage Stages)"; 1.0's Accounts › Pipeline Stages, funnel-editor.tsx) What a
 * stage asks for, the studio's to set — 1.0's per-status flags in 2.0's shape. The stages themselves stay the one journey every screen, the
 * client's portal, Activity and Reports read (New · Contacted · Met · Quote Sent · Won · On Hold · Lost — REG-111's rules on top); what
 * moving into a step requires is where studios differ:
 *   contactNextStep  1.0's "Follow-up required": moving to Contacted asks for the next call or meeting's date (off by default — REG-319
 *                    made it optional; a client who said no needs none)
 *   wonContract      1.0's "Contract required": the Won step asks for the client's signed contract (on by default — the mock's step);
 *                    off, a studio whose signed quote is the agreement wins the lead on the quote alone
 */
export type LeadStageRules = { contactNextStep: boolean; wonContract: boolean }
export const DEFAULT_LEAD_STAGE_RULES: LeadStageRules = { contactNextStep: false, wonContract: true }
export function parseLeadStageRules(v: unknown): LeadStageRules {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<LeadStageRules>
  return { contactNextStep: o.contactNextStep === true, wonContract: o.wonContract !== false }
}

/**
 * Quote approval — studio-level policy set under Settings › Leads (user brief 2026-08-30).
 * Studios differ on whether a quote is reviewed inside the studio before it reaches the client, so the quote's
 * lifecycle is not one fixed list: the two approval statuses exist only where approval is required.
 *   required      Draft → Sent for Approval → Approved → Sent to Client → Signed
 *   not-required  Draft → Sent to Client → Signed
 * `required` is the default because it is the studio the mocks were drawn for (the Overview widget's Draft ·
 * Sent · Approved track, 858:25057, and the five-status row menu 910:36404).
 */
export const QUOTE_APPROVALS = ['required', 'not-required'] as const
export type QuoteApproval = (typeof QUOTE_APPROVALS)[number]
export const DEFAULT_QUOTE_APPROVAL: QuoteApproval = 'required'

export const QUOTE_APPROVAL_OPTIONS: { key: QuoteApproval; title: string; help: string }[] = [
  { key: 'required', title: 'Required', help: 'Quotes are reviewed inside the studio before they reach the client. A quote runs Draft → Sent for Approval → Approved → Sent to Client → Signed.' },
  { key: 'not-required', title: 'Not required', help: 'Designers send quotes straight to the client. A quote runs Draft → Sent to Client → Signed.' },
]

export function parseQuoteApproval(v: unknown): QuoteApproval {
  return v === 'not-required' ? 'not-required' : 'required'
}

/** The studio itself (settings key `studio`, seeded by repair R23): what the quote's Issuing Entity and GST line read. */
export type Studio = {
  name: string; gstRegistered: boolean; /** The studio's line, as the quote's "[Studio Phone Number]" token prints it (REG-420); '' until set. */ phone: string
  /** (REG-645, settings parity Q-05) The GST rate a new line starts with (Settings › Quotes & pricing › GST); 9 until set. */
  gstPct: number
}
export const DEFAULT_GST_PCT = 9
export const DEFAULT_STUDIO: Studio = { name: 'Demo Studio Pte Ltd', gstRegistered: true, phone: '', gstPct: DEFAULT_GST_PCT }
/** A GST rate as the studio may set it: 0–30 %, one decimal. */
export const cleanGstPct = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 30 ? Math.round(v * 10) / 10 : DEFAULT_GST_PCT)
export function parseStudio(v: unknown): Studio {
  const r = (v ?? {}) as Partial<Record<keyof Studio, unknown>>
  return { name: typeof r.name === 'string' && r.name.trim() ? r.name : DEFAULT_STUDIO.name, gstRegistered: r.gstRegistered !== false, phone: typeof r.phone === 'string' ? r.phone.trim() : '', gstPct: cleanGstPct(r.gstPct) }
}
/** (REG-645, settings parity Q-15) The studio's name as a sentence says it — "Demo Studio", not "Demo Studio Pte Ltd". */
export const shortStudioName = (name: string) => name.replace(/[\s,]+(pte\.?\s*ltd\.?|private limited|llp|ltd\.?)$/i, '').trim() || name

/**
 * Template approval — studio-level policy (owner 2026-09-18, REG-501): whether a Designer's template needs an Owner's or
 * Admin's approval before it publishes. Owners and Admins always publish directly.
 *   required      Draft → Awaiting approval → Published (Approve and publish · Request changes)
 *   not-required  every member publishes
 */
export const TEMPLATE_APPROVALS = ['required', 'not-required'] as const
export type TemplateApproval = (typeof TEMPLATE_APPROVALS)[number]
export const DEFAULT_TEMPLATE_APPROVAL: TemplateApproval = 'required'
export const TEMPLATE_APPROVAL_OPTIONS: { key: TemplateApproval; title: string; help: string }[] = [
  { key: 'required', title: 'Required', help: 'A designer submits a template for approval; an Owner or Admin approves and publishes it, or requests changes. Owners and Admins publish directly.' },
  { key: 'not-required', title: 'Not required', help: 'Every member publishes templates for the whole studio.' },
]
export function parseTemplateApproval(v: unknown): TemplateApproval {
  return v === 'not-required' ? 'not-required' : 'required'
}

/**
 * (REG-561) Quote numbers — the studio's own pattern (Settings › Quotes; the testers' "our numbering convention"): a prefix, then
 * the designer's initials and the year-month when switched on, then the running number. New quotes follow it; the numbers
 * already given stay. Unset (`next` 0, the default prefix, nothing switched on) = the seed's "OM-" + the highest existing + 1.
 */
/** (REG-586) A second sequence for commercial work — its own prefix and running number; the family comes from the lead's property type. */
export type CommercialSequence = { on: boolean; prefix: string; next: number }
export type Numbering = { prefix: string; initials: boolean; yearMonth: boolean; next: number; digits: number; commercial: CommercialSequence }
export const DEFAULT_NUMBERING: Numbering = { prefix: 'OM', initials: false, yearMonth: false, next: 0, digits: 0, commercial: { on: false, prefix: 'COM', next: 0 } }
const cleanPrefix = (v: unknown, fallback: string) => { const p = typeof v === 'string' ? v.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() : fallback; return p || fallback }
const cleanNext = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0)
export function parseNumbering(v: unknown): Numbering {
  const r = (v ?? {}) as Partial<Record<keyof Numbering, unknown>>
  const c = (r.commercial ?? {}) as Partial<Record<keyof CommercialSequence, unknown>>
  return {
    prefix: cleanPrefix(r.prefix, DEFAULT_NUMBERING.prefix), initials: r.initials === true, yearMonth: r.yearMonth === true,
    next: cleanNext(r.next),
    digits: typeof r.digits === 'number' && Number.isFinite(r.digits) ? Math.min(6, Math.max(0, Math.floor(r.digits))) : 0,
    commercial: { on: c.on === true, prefix: cleanPrefix(c.prefix, DEFAULT_NUMBERING.commercial.prefix), next: cleanNext(c.next) },
  }
}
/** True while the studio has not set a pattern of its own — the legacy "OM-10001" numbering applies. */
export const isDefaultNumbering = (n: Numbering) => n.prefix === DEFAULT_NUMBERING.prefix && !n.initials && !n.yearMonth && n.next === 0 && n.digits === 0 && !n.commercial.on
/** "DT" from "Dane Tan" — the designer's initials the pattern prints. */
export const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase()).join('').slice(0, 3)
/**
 * (REG-645, settings parity Q-15) The next quote's running number, from every number already given — the quote-creation action and
 * Settings' example read the same rule. Unset pattern: "OM-" + the highest number after "OM-" + 1 (OM-10001 on an empty studio).
 * A pattern: the setting's `next`, never below the highest already given under that prefix.
 */
export function defaultNextNumber(numbers: string[]): string {
  if (!numbers.length) return 'OM-10001'
  const max = numbers.reduce((m, n) => { const v = Number.parseInt(n.slice(3), 10); return Math.max(m, Number.isFinite(v) ? v : 0) }, Number.NEGATIVE_INFINITY)
  return `OM-${max + 1}`
}
export function nextSequence(numbers: string[], prefix: string, next: number): number {
  const tail = (x: string) => { const m = /(\d+)$/.exec(x); return m ? Number(m[1]) : 0 }
  const highest = numbers.filter((q) => q.startsWith(`${prefix}-`)).reduce((m, q) => Math.max(m, tail(q)), 0)
  return Math.max(next || 1, highest + 1)
}

/** The number a pattern gives: "OM-DT-202609-0012". */
export function formatQuoteNumber(n: Numbering, seq: number, o: { initials?: string; date?: Date; /** (REG-586) a commercial job takes the second sequence's prefix */ commercial?: boolean } = {}): string {
  const parts = [o.commercial && n.commercial.on ? n.commercial.prefix : n.prefix]
  if (n.initials && o.initials) parts.push(o.initials)
  if (n.yearMonth) { const d = o.date ?? new Date(); parts.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`) }
  parts.push(n.digits ? String(seq).padStart(n.digits, '0') : String(seq))
  return parts.join('-')
}

/** (REG-561) The studio's trades (Settings › Quotes): the Category column's base list and what the templates group by. Unset = the trades in use on the quotes. */
export function parseTrades(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean))].slice(0, 60) : []
}

/** (REG-617, parity Q-08) A default note per trade, keyed by the trade's name in lower case; empty notes are dropped. */
export function parseTradeNotes(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, string> = {}
  for (const [k, n] of Object.entries(v as Record<string, unknown>)) { const key = k.trim().toLowerCase(); if (key && typeof n === 'string' && n.trim()) out[key] = n.trim().slice(0, 600) }
  return out
}
export const tradeKey = (name: string) => name.trim().toLowerCase()

/**
 * (REG-584 · REG-589 · REG-590) The studio's rules for quotes (Settings › Quotes): selling prices rounded to a step as they are
 * entered, the payment schedule kept to Owners and Admins, and a backup approver who may approve quotes and templates beside them.
 */
export type RoundStep = 0 | 1 | 5 | 10
export const ROUND_STEP_OPTIONS: { key: RoundStep; label: string }[] = [{ key: 0, label: 'Not rounded' }, { key: 1, label: 'The nearest S$1' }, { key: 5, label: 'The nearest S$5' }, { key: 10, label: 'The nearest S$10' }]
export type QuoteRules = { roundStep: RoundStep; paymentLock: boolean; backupApproverId: string | null; /** (REG-618, parity Q-25) what `{prepared_by}` prints */ preparedBy: PreparedByMode
  /** (S44Q — row 357, her UAT ask 2026-10-15) the confirmation link lets the client tick the optional works they want (on — as it always has);
      off, the link lists them with their prices, read-only, and the client asks the designer to add one */
  clientPicksOptional: boolean }
/** (REG-590) Who approves a quote or publishes a template under approval: an Owner, an Admin, or the backup approver. Pure — `isApprover` and Settings' roles table read it. */
export const approves = (role: string | null | undefined, memberId: string | null | undefined, backupApproverId: string | null) =>
  role === 'Owner' || role === 'Admin' || (!!memberId && backupApproverId !== null && backupApproverId === memberId)
/** (REG-589) Who changes a quote's payment schedule: everyone, or only Owners and Admins while the studio locks it. */
export const changesPayments = (role: string | null | undefined, paymentLock: boolean) => !paymentLock || role === 'Owner' || role === 'Admin'
export const DEFAULT_QUOTE_RULES: QuoteRules = { roundStep: 0, paymentLock: false, backupApproverId: null, preparedBy: 'member', clientPicksOptional: true }
export const PREPARED_BY_OPTIONS: { key: PreparedByMode; label: string }[] = [{ key: 'member', label: 'The member who prepared the quote' }, { key: 'team', label: 'Every member on the lead' }, { key: 'studio', label: 'The studio’s name' }]
export function parseQuoteRules(v: unknown): QuoteRules {
  const r = (v ?? {}) as Partial<Record<keyof QuoteRules, unknown>>
  return { roundStep: r.roundStep === 1 || r.roundStep === 5 || r.roundStep === 10 ? r.roundStep : 0, paymentLock: r.paymentLock === true, backupApproverId: typeof r.backupApproverId === 'string' && r.backupApproverId ? r.backupApproverId : null,
    preparedBy: r.preparedBy === 'team' || r.preparedBy === 'studio' ? r.preparedBy : 'member', clientPicksOptional: r.clientPicksOptional !== false }
}
/** (REG-651, price book parity Q-02) A unit whose price is a rate per area or length — rounding it to a whole step moves every line priced by it. */
export const isRateUnit = (unit: string | null | undefined): boolean => !!unit && /\b(sq\.?\s*ft|sqft|sq\.?\s*m|sqm|m2|m²|ft\s*run|m\s*run|ft|m|metres?|meters?|feet|foot)\b/i.test(unit.trim())
/**
 * The markup that puts a line's selling price on the studio's step (S$) — the cost never moves, the markup absorbs it.
 * (REG-651, Q-02) A price under the step and a rate per area or length stay as typed (S$3.50 / sqft is not S$0 or S$5), and a
 * rounding never lands below the cost — it rounds up instead.
 */
export function roundToStep(costMinor: number, markupMinor: number, step: RoundStep, unit?: string | null): number {
  if (!step) return markupMinor
  const s = step * 100
  const price = costMinor + markupMinor
  if (price < s || isRateUnit(unit)) return markupMinor
  let rounded = Math.round(price / s) * s
  if (rounded < costMinor) rounded = Math.ceil(costMinor / s) * s
  return rounded - costMinor
}

/* ── (REG-599) Lead sources the studio edits — Settings › Leads › Lead sources ─────────────────────────
   The enum in lib/leads/enums.ts is the seed; the studio adds (TikTok), reorders and retires. A retired source keeps
   the leads it already has and leaves the pickers. */
export type LeadSourceEntry = { name: string; retired: boolean }
export const DEFAULT_LEAD_SOURCE_NAMES = ['Qanvast', 'Instagram', 'Referral', 'Walk-in', 'Facebook', 'Organic', 'Hangout', 'Website', 'Email', 'Google Ads', 'Meta Ads', 'TikTok', 'Homereno', 'Houzz', 'Renopedia', 'Others'] as const   // (REG-607) + the three portals 1.0's email ingestion reads (parity proposal J-4)
export const DEFAULT_LEAD_SOURCES: LeadSourceEntry[] = DEFAULT_LEAD_SOURCE_NAMES.map((name) => ({ name, retired: false }))
export function parseLeadSources(v: unknown): LeadSourceEntry[] {
  if (!Array.isArray(v)) return DEFAULT_LEAD_SOURCES
  const seen = new Set<string>()
  const out: LeadSourceEntry[] = []
  for (const x of v) {
    const name = typeof x === 'string' ? x.trim() : x && typeof x === 'object' && typeof (x as { name?: unknown }).name === 'string' ? (x as { name: string }).name.trim() : ''
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    out.push({ name: name.slice(0, 40), retired: !!(x && typeof x === 'object' && (x as { retired?: unknown }).retired) })
    if (out.length >= 40) break
  }
  return out.length ? out : DEFAULT_LEAD_SOURCES
}
/** The names a picker offers: every live source, plus `keep` (a lead's own retired source, so editing it never loses it). */
export function liveSourceNames(list: LeadSourceEntry[], keep?: string | null): string[] {
  const live = list.filter((s) => !s.retired).map((s) => s.name)
  return keep && !live.includes(keep) ? [keep, ...live] : live
}

/* ── (REG-601) Who sees which leads — Settings › Leads › Who sees leads ───────────────────────────── */
export type LeadVisibility = 'everyone' | 'assigned'
export const DEFAULT_LEAD_VISIBILITY: LeadVisibility = 'everyone'
export const LEAD_VISIBILITY_OPTIONS: { key: LeadVisibility; title: string; help: string }[] = [
  { key: 'everyone', title: 'Everyone sees every lead', help: 'The whole studio works from one list. Owners and Admins assign anyone; a Manager assigns within their team; a Designer keeps the leads assigned to them.' },
  { key: 'assigned', title: 'Only the leads assigned to them', help: 'Managers see their own leads and their team’s; Designers see their own. Owners and Admins still see everything.' },
]
export const parseLeadVisibility = (v: unknown): LeadVisibility => (v === 'assigned' ? 'assigned' : 'everyone')
/* (pending modules S14 — card held:settings-company, "Who sees leads … also governs projects, quotes and contracts", as recommended) The card's
   one home is Settings › Roles & access; its help names everything it decides, and every other place points there with these words.
   *(invented copy)* */
export const VISIBILITY_HREF = '/settings?section=studio#lead-visibility'
export const VISIBILITY_HELP = 'It decides who sees each lead and everything on it — its project, quotes, contracts, files and X‑Ray readings, and its row in Qanvast Ops. Owners and Admins always see every lead and assign anyone.'
export const VISIBILITY_POINTER = 'Who sees which leads — and each lead’s project, quotes and contracts — is set under'

/* ── (REG-602) Lead capture — the website's email intake and Meta Lead Ads ────────────────────────── */
export type MetaForm = { id: string; name: string; on: boolean }
/* (REG-612, parity Q-36 · I-07 · I-10) The Integrations stand-ins for 1.0's webhook endpoints and Gmail ingestion — recorded on
   the capture setting; every arrival is still a one-row import that lands in the listing (a known phone waits in Review). */
export type WebhookPlatform = 'generic' | 'google_ads' | 'meta'
export const WEBHOOK_PLATFORMS: { key: WebhookPlatform; label: string; help: string; defaultLabel: string }[] = [
  { key: 'generic', label: 'Generic webhook', help: 'A generic URL any system can POST leads to.', defaultLabel: 'Webhook' },
  { key: 'google_ads', label: 'Google Ads (Lead Form)', help: 'We generate a URL + key to paste into your Google Ads Lead Form.', defaultLabel: 'Google Ads' },
  { key: 'meta', label: 'Meta Ads (via Zapier / Make)', help: 'We generate a URL — connect Meta to it via a Zapier / Make bridge.', defaultLabel: 'Meta Ads' },
]
export type Webhook = { id: string; platform: WebhookPlatform; label: string; notes: string; token: string; key: string | null; received: number; created: number; duplicates: number; lastAt: number | null; active: boolean; createdAt: number }
export type WebhookLogEntry = { at: number; webhookId: string; outcome: 'created' | 'duplicate'; name: string }
export const EMAIL_PLATFORMS = ['@homereno.sg', '@homerenoguru.sg', '@houzz.com.sg', '@renopedia.sg', '@qanvast.com'] as const
/** The source an ingested email lands with — the platform behind the sender domain (the round-1 sources Homereno · Houzz · Renopedia). */
export const platformSource = (domain: string): string => (/homereno/i.test(domain) ? 'Homereno' : /houzz/i.test(domain) ? 'Houzz' : /renopedia/i.test(domain) ? 'Renopedia' : /qanvast/i.test(domain) ? 'Qanvast' : 'Email')
export type EmailSource = { connected: boolean; address: string; platforms: string[]; custom: string[]; lastSyncAt: number | null; stats: { found: number; created: number; duplicates: number; failed: number } }
export const DEFAULT_EMAIL_SOURCE: EmailSource = { connected: false, address: '', platforms: [...EMAIL_PLATFORMS], custom: [], lastSyncAt: null, stats: { found: 0, created: 0, duplicates: 0, failed: 0 } }
/** (pending modules S34) The address external systems POST a lead to — OpenMaison's intake host, which the deployment points at
    app/api/webhooks/leads/[token] (a real route); `NEXT_PUBLIC_INTAKE_URL` names another host. */
const INTAKE_URL = (process.env.NEXT_PUBLIC_INTAKE_URL || 'https://in.openmaison.sg').replace(/\/$/, '')
export const webhookUrl = (token: string) => `${INTAKE_URL}/api/webhooks/leads/${token}`

export type LeadCapture = {
  /** The intake address the website form emails; derived from the studio name until the studio sets its own slug. */
  emailSlug: string
  meta: { connected: boolean; page: string; forms: MetaForm[] }
  webhooks: Webhook[]
  webhookLog: WebhookLogEntry[]
  email: EmailSource
}
/** (sweep S4 #17) A webhook's token and signing key are secrets: a page for someone who may not manage them ships the capture without them. */
export const withoutSecrets = (c: LeadCapture): LeadCapture => ({ ...c, webhooks: c.webhooks.map((w) => ({ ...w, token: '', key: null })) })
export const DEFAULT_META_FORMS: MetaForm[] = [{ id: 'renovation-enquiry', name: 'Renovation enquiry', on: true }, { id: 'free-consultation', name: 'Free consultation', on: true }, { id: 'showroom-visit', name: 'Showroom visit', on: false }]
export const DEFAULT_LEAD_CAPTURE: LeadCapture = { emailSlug: '', meta: { connected: false, page: '', forms: DEFAULT_META_FORMS }, webhooks: [], webhookLog: [], email: DEFAULT_EMAIL_SOURCE }
export function parseLeadCapture(v: unknown): LeadCapture {
  const r = (v ?? {}) as Partial<{ emailSlug: unknown; meta: Partial<{ connected: unknown; page: unknown; forms: unknown }> }>
  const forms = Array.isArray(r.meta?.forms) ? r.meta!.forms.filter((f): f is MetaForm => !!f && typeof f === 'object' && typeof (f as MetaForm).id === 'string' && typeof (f as MetaForm).name === 'string').map((f) => ({ id: f.id, name: f.name.slice(0, 60), on: !!f.on })) : DEFAULT_META_FORMS
  const raw = (v ?? {}) as Partial<{ webhooks: unknown; webhookLog: unknown; email: Partial<EmailSource> & { stats?: Partial<EmailSource['stats']> } }>
  const str = (x: unknown, max: number, d = '') => (typeof x === 'string' ? x.slice(0, max) : d)
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0)
  const webhooks: Webhook[] = Array.isArray(raw.webhooks) ? raw.webhooks.filter((w): w is Webhook => !!w && typeof w === 'object' && typeof (w as Webhook).id === 'string' && typeof (w as Webhook).token === 'string').map((w) => ({
    id: w.id, platform: WEBHOOK_PLATFORMS.some((p) => p.key === w.platform) ? w.platform : 'generic', label: str(w.label, 80, 'Webhook'), notes: str(w.notes, 200), token: w.token, key: typeof w.key === 'string' ? w.key : null,
    received: num(w.received), created: num(w.created), duplicates: num(w.duplicates), lastAt: typeof w.lastAt === 'number' ? w.lastAt : null, active: w.active !== false, createdAt: num(w.createdAt),
  })) : []
  const webhookLog: WebhookLogEntry[] = Array.isArray(raw.webhookLog) ? raw.webhookLog.filter((e): e is WebhookLogEntry => !!e && typeof e === 'object' && typeof (e as WebhookLogEntry).at === 'number').map((e): WebhookLogEntry => ({ at: e.at, webhookId: str(e.webhookId, 60), outcome: e.outcome === 'duplicate' ? 'duplicate' : 'created', name: str(e.name, 80) })).slice(0, 50) : []
  const e = raw.email ?? {}
  const email: EmailSource = {
    connected: !!e.connected, address: str(e.address, 120),
    platforms: Array.isArray(e.platforms) ? e.platforms.filter((x): x is string => typeof x === 'string' && (EMAIL_PLATFORMS as readonly string[]).includes(x)) : [...EMAIL_PLATFORMS],
    custom: Array.isArray(e.custom) ? e.custom.filter((x): x is string => typeof x === 'string').map((x) => x.trim().toLowerCase().replace(/^@?/, '@').slice(0, 60)).filter((x) => x.length > 1).slice(0, 10) : [],
    lastSyncAt: typeof e.lastSyncAt === 'number' ? e.lastSyncAt : null,
    stats: { found: num(e.stats?.found), created: num(e.stats?.created), duplicates: num(e.stats?.duplicates), failed: num(e.stats?.failed) },
  }
  return { emailSlug: typeof r.emailSlug === 'string' ? r.emailSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) : '', meta: { connected: !!r.meta?.connected, page: typeof r.meta?.page === 'string' ? r.meta.page.slice(0, 80) : '', forms: forms.length ? forms : DEFAULT_META_FORMS }, webhooks, webhookLog, email }
}
/** The address the website form sends to — the studio's slug on OpenMaison's intake domain. (REG-647) The slug is kept once given. */
export const intakeSlug = (studioName: string) => studioName.toLowerCase().replace(/pte\.? ltd\.?/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
export const intakeAddress = (studioName: string, slug: string) => `leads+${slug || intakeSlug(studioName)}@in.openmaison.sg`

/* ── (REG-607, parity Q-05 · Q-07 · Q-38) The reasons a lead is parked or lost — Settings › Leads › Reasons ────────
   1.0 lets a studio rename and add its close reasons and gate one behind logged contacts; the two lists live in one
   settings row and the On Hold / Lost dialogs read them. A retired reason keeps the leads that carry it and leaves the
   pickers, as a lead source does. `minContacts` (Lost only) is a hint, not a block: the dialog says how many contacts
   are logged against how many the reason asks for. */
export type LeadReason = { name: string; retired: boolean; /** Lost reasons: the logged contacts the reason expects, 0 = none */ minContacts?: number }
export type LeadReasons = { lost: LeadReason[]; hold: LeadReason[] }
/** The two Lost reasons that ask for a detail: the competitor's name, the expected restart. Renaming them in Settings drops the detail. */
export const LOST_COMPETITOR = 'Went with another firm'
export const LOST_POSTPONED = 'Project postponed'
export const LOST_UNRESPONSIVE = 'Unresponsive'
export const DEFAULT_LOST_REASONS: LeadReason[] = [
  { name: LOST_COMPETITOR, retired: false }, { name: 'Budget mismatch', retired: false }, { name: LOST_POSTPONED, retired: false },
  { name: LOST_UNRESPONSIVE, retired: false, minContacts: 3 }, { name: 'Not a fit', retired: false }, { name: 'Cancelled by client', retired: false },
  { name: 'Property too far', retired: false }, { name: 'Others', retired: false },
]
export const DEFAULT_HOLD_REASONS: LeadReason[] = ['Client not ready', 'Budget review', 'Scope change', 'Property delay', 'Travelling', 'Others'].map((name) => ({ name, retired: false }))
export const DEFAULT_LEAD_REASONS: LeadReasons = { lost: DEFAULT_LOST_REASONS, hold: DEFAULT_HOLD_REASONS }
function parseReasonList(v: unknown, fallback: LeadReason[], withGate: boolean): LeadReason[] {
  if (!Array.isArray(v)) return fallback
  const seen = new Set<string>()
  const out: LeadReason[] = []
  for (const x of v) {
    const o = x && typeof x === 'object' ? (x as { name?: unknown; retired?: unknown; minContacts?: unknown }) : null
    const name = typeof x === 'string' ? x.trim() : typeof o?.name === 'string' ? o.name.trim() : ''
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    const entry: LeadReason = { name: name.slice(0, 40), retired: !!o?.retired }
    if (withGate && typeof o?.minContacts === 'number' && Number.isFinite(o.minContacts) && o.minContacts > 0) entry.minContacts = Math.min(20, Math.floor(o.minContacts))
    out.push(entry)
    if (out.length >= 30) break
  }
  return out.length ? out : fallback
}
export function parseLeadReasons(v: unknown): LeadReasons {
  const r = (v ?? {}) as Partial<Record<keyof LeadReasons, unknown>>
  return { lost: parseReasonList(r.lost, DEFAULT_LOST_REASONS, true), hold: parseReasonList(r.hold, DEFAULT_HOLD_REASONS, false) }
}
/** The names a dialog offers: every live reason, "Others" last; `keep` (a lead's own retired reason) stays first so an edit never loses it. */
export function liveReasonNames(list: LeadReason[], keep?: string | null): string[] {
  const live = list.filter((r) => !r.retired).map((r) => r.name)
  const ordered = [...live.filter((n) => n !== 'Others'), ...live.filter((n) => n === 'Others')]
  return keep && !ordered.includes(keep) ? [keep, ...ordered] : ordered
}
