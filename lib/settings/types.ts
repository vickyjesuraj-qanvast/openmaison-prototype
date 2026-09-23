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
export type Studio = { name: string; gstRegistered: boolean; /** The studio's line, as the quote's "[Studio Phone Number]" token prints it (REG-420); '' until set. */ phone: string }
export const DEFAULT_STUDIO: Studio = { name: 'Demo Studio Pte Ltd', gstRegistered: true, phone: '' }
export function parseStudio(v: unknown): Studio {
  const r = (v ?? {}) as Partial<Record<keyof Studio, unknown>>
  return { name: typeof r.name === 'string' && r.name.trim() ? r.name : DEFAULT_STUDIO.name, gstRegistered: r.gstRegistered !== false, phone: typeof r.phone === 'string' ? r.phone.trim() : '' }
}

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

/**
 * (REG-584 · REG-589 · REG-590) The studio's rules for quotes (Settings › Quotes): selling prices rounded to a step as they are
 * entered, the payment schedule kept to Owners and Admins, and a backup approver who may approve quotes and templates beside them.
 */
export type RoundStep = 0 | 1 | 5 | 10
export const ROUND_STEP_OPTIONS: { key: RoundStep; label: string }[] = [{ key: 0, label: 'Not rounded' }, { key: 1, label: 'The nearest S$1' }, { key: 5, label: 'The nearest S$5' }, { key: 10, label: 'The nearest S$10' }]
export type QuoteRules = { roundStep: RoundStep; paymentLock: boolean; backupApproverId: string | null }
export const DEFAULT_QUOTE_RULES: QuoteRules = { roundStep: 0, paymentLock: false, backupApproverId: null }
export function parseQuoteRules(v: unknown): QuoteRules {
  const r = (v ?? {}) as Partial<Record<keyof QuoteRules, unknown>>
  return { roundStep: r.roundStep === 1 || r.roundStep === 5 || r.roundStep === 10 ? r.roundStep : 0, paymentLock: r.paymentLock === true, backupApproverId: typeof r.backupApproverId === 'string' && r.backupApproverId ? r.backupApproverId : null }
}
/** The markup that puts a line's selling price on the studio's step (S$) — the cost never moves, the markup absorbs it, never below −cost. */
export function roundToStep(costMinor: number, markupMinor: number, step: RoundStep): number {
  if (!step) return markupMinor
  const s = step * 100
  const rounded = Math.round((costMinor + markupMinor) / s) * s
  return Math.max(-costMinor, rounded - costMinor)
}
