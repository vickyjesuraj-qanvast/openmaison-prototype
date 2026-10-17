/**
 * (Projects round 5 — F-05 · F-13 · F-14 · F-15 · F-17 · F-18) Invoices' rules and words, pure and client-safe: Settings › Projects ›
 * Invoices (approval, payment terms, the number pattern), who may send, void and mark a variation order approved, and the WhatsApp
 * draft. The server actions (app/projects/money-actions.ts) and the screens read the same functions, so a refusal reads the same on both.
 */
import { runsStudio } from '@/lib/leads/assign-policy'
import { runsMoney } from '@/lib/settings/roles'
import { formatProjectNumber, nextProjectSeq, type ProjectNumbering } from './model'
import { worksOn } from './policy'

/* ── Settings › Projects › Invoices ───────────────────────────────────────────────────────────────────────────────────────────── */

export const INVOICE_RULES_KEY = 'project_invoices'
export const INVOICE_NUMBERING_KEY = 'invoice_numbering'
/** (F-05 · F-14) Invoices need approval (on by default — 1.0's screens assumed it on), and the days a client has to pay (default 7). */
export type InvoiceRules = { approval: boolean; termsDays: number
  /** (gaps build B, item 13 — 1.0's `feeFirstMilestones`, off by default) a project's own split may open with a fixed-amount stage ("Design fees S$3,000") */
  feeFirst?: boolean
  /** (S44O — UAT row 360, Spaces; her UAT ask 2026-10-15) how an approved variation order is billed: `spread` — its money joins the unsent stage
      invoices, as always — or `own` — its own invoice at once, a Draft for its whole amount, the stages keeping their shares (Money's *Bill VO-n
      on its own*, done for every order). Spread by default. */
  voBilling?: VoBilling }
export type VoBilling = 'spread' | 'own'
export const VO_BILLINGS: readonly VoBilling[] = ['spread', 'own']
export const isVoBilling = (v: unknown): v is VoBilling => v === 'spread' || v === 'own'
export const DEFAULT_INVOICE_RULES: InvoiceRules = { approval: true, termsDays: 7, feeFirst: false, voBilling: 'spread' }
export const TERMS_MAX = 90
export function parseInvoiceRules(v: unknown): InvoiceRules {
  const r = (v ?? {}) as Partial<Record<keyof InvoiceRules, unknown>>
  const days = typeof r.termsDays === 'number' && Number.isFinite(r.termsDays) ? Math.round(r.termsDays) : DEFAULT_INVOICE_RULES.termsDays
  return { approval: r.approval === undefined ? DEFAULT_INVOICE_RULES.approval : r.approval === true, termsDays: Math.min(TERMS_MAX, Math.max(0, days)), feeFirst: r.feeFirst === true, voBilling: isVoBilling(r.voBilling) ? r.voBilling : 'spread' }
}
/** (F-13) `INV-{YYYY}-{seq}` — the project numbers' model (Settings › Projects, REG-921) under its own key. */
export const DEFAULT_INVOICE_NUMBERING: ProjectNumbering = { prefix: 'INV', year: true, next: 0, digits: 3 }
export function parseInvoiceNumbering(v: unknown): ProjectNumbering {
  const r = (v ?? {}) as Partial<Record<keyof ProjectNumbering, unknown>>
  const prefix = typeof r.prefix === 'string' ? r.prefix.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() : ''
  return {
    prefix: prefix || DEFAULT_INVOICE_NUMBERING.prefix,
    year: r.year === undefined ? DEFAULT_INVOICE_NUMBERING.year : r.year === true,
    next: typeof r.next === 'number' && Number.isFinite(r.next) && r.next > 0 ? Math.floor(r.next) : 0,
    digits: typeof r.digits === 'number' && Number.isFinite(r.digits) ? Math.min(6, Math.max(0, Math.floor(r.digits))) : DEFAULT_INVOICE_NUMBERING.digits,
  }
}
/** The number the next invoice takes, never below the highest already given under the prefix. */
export const nextInvoiceNumber = (n: ProjectNumbering, numbers: string[], at: Date) => formatProjectNumber(n, nextProjectSeq(numbers, n), at)

/** (F-14) Due = the day it is sent + the payment terms, as a calendar day (local midnight). */
export function dueFrom(sentAt: Date, termsDays: number): Date {
  return new Date(sentAt.getFullYear(), sentAt.getMonth(), sentAt.getDate() + termsDays)
}

/* ── Who may do what (F-05 · F-17 · F-18; *Who may do what* rows in lib/settings/permissions.ts) ──────────────────────────────── */

type Who = { id: string; role: string; teamIds: string[] }
/* (parity map, MI-007 — a deliberate change of these rules) Accounting sees every project's money, prepares its invoices and voids one; the
   approval stays an Owner's or an Admin's */
export const MONEY_RULE = 'Only the project’s team, Owners, Admins and Accounting see its money'
export const SEND_RULE = 'Only the project’s team, Owners, Admins and Accounting prepare its invoices'
export const APPROVE_RULE = 'Only an Owner or an Admin approves an invoice'
export const VOID_RULE = 'Only an Owner, an Admin or Accounting voids an invoice'
export const MARK_RULE = 'Only an Owner or an Admin records a client’s approval given outside the link'
/** (fix-D, D-01) Revising an approved variation order takes the client's approval back and moves the contract — the same people's call. */
export const REVISE_VO_RULE = 'Only an Owner or an Admin revises an approved variation order — its approval moves the contract'
export const SETTINGS_RULE = 'Only Owners and Admins change the invoice rules'

/** The project's team prepares invoices: edits a Draft, submits it, sends it when no approval is needed. (parity map, MI-007) Accounting
    prepares every project's — and theirs wait for an Owner or an Admin while Invoices need approval is on, as a Designer's do. */
export const preparesInvoices = (viewer: Who, teamIds: readonly string[]) => runsMoney(viewer.role) || worksOn(viewer, teamIds)
/** (F-05) Whether this viewer's Send goes at once: an Owner's or an Admin's always; anyone else's only while approval is off. */
export const sendsAtOnce = (role: string, rules: InvoiceRules) => runsStudio(role) || !rules.approval
export const approvesInvoices = (role: string) => runsStudio(role)
/** (F-18) Voiding a sent invoice and reversing a payment are the Owners' and Admins' — (parity map, MI-007) and Accounting's: a correction
    of the books, not an approval and not a change to what was agreed. */
export const voidsInvoices = (role: string) => runsMoney(role)
/** (F-07) The client approves a variation order on its link; recording an approval given in person or elsewhere moves the contract value,
    so it is the Owners' and Admins' (a designer sends the link instead). */
export const marksVariationApproved = (role: string) => runsStudio(role)

/* ── The client's message (F-14 · F-15: Send records Sent and drafts the WhatsApp in one press, opened on the press) ─────────────── */

/** (REG-1056) `url` only when the client holds the portal — a client never invited isn't sent to a page they can't open. (fix-D, D-10 · F-15) The
    message names the invoice's number (the one the send takes — the dialog reads it before WhatsApp opens); a client without the portal gets
    how to pay in the message itself — the bank, PayNow and the reference — since no page carries it for them. `due` null = due on receipt. */
export type PayTo = { bankName: string; accountName: string; accountNo: string; payNow: string }
export function invoiceMessage(o: { client: string; studio: string; stage: string; amount: string; due: string | null; url: string | null; number?: string | null; payTo?: PayTo | null
  /** (gaps build B, item 6) the invoice's own link — opens without signing in; a client not on the portal gets it */ link?: string | null
  /** (gaps build B) an invoice outside the stages: "for {title}" instead of "for the {stage} payment" */ oneOff?: boolean }): string {
  const first = o.client.trim().split(/\s+/)[0] ?? o.client
  const what = o.number ? `invoice ${o.number}` : 'the invoice'
  const head = `Hi ${first}, ${o.studio} has sent you ${what} for ${o.oneOff ? o.stage : `the ${o.stage.toLowerCase()} payment`}: ${o.amount}, ${o.due ? `due ${o.due}` : 'due on receipt'}.`
  if (o.url) return `${head}\n\nThe invoice and how to pay (bank transfer or PayNow) are on your page: ${o.url}`
  const link = o.link ? `\n\nYour invoice, to see and download: ${o.link}` : ''
  const p = o.payTo
  if (!p) return `${head}${link}`
  const bank = p.accountNo ? `bank transfer to ${[p.bankName, p.accountName, p.accountNo].filter(Boolean).join(', ')}` : ''
  const paynow = p.payNow ? `PayNow to ${p.payNow}` : ''
  const ways = [bank, paynow].filter(Boolean).join(', or ')
  return ways ? `${head}${link}\n\nTo pay: ${ways}. Please use ${o.number ?? 'the invoice number'} as the reference.` : `${head}${link}`
}
