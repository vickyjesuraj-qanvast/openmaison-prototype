/**
 * (gaps build B, items 12 · 14 — 1.0 G-293 and Accounts › Document Templates, `7-coverage.md` A.1) The studio's own invoice paper and an
 * invoice number per issuing entity, pure and client-safe. Settings › Projects › Invoices keeps both: the paper's header and footer notes, a
 * terms block, whether the bank details and the balance due print — the studio's, and an override per issuing entity; and a number pattern per
 * entity (blank = the studio-wide one). Invoices, receipts and variation orders print the paper (`paperFor`); a send takes its entity's
 * pattern (`numberingFor`). Keyed by the entity's id (REG-647), so a rename keeps its settings.
 */
import type { ProjectNumbering } from './model'
import { parseInvoiceNumbering } from './invoices-model'
import type { IssuingEntity } from '@/lib/templates/model'

export const INVOICE_PAPER_KEY = 'invoice_paper'
export const INVOICE_NUMBERING_ENTITIES_KEY = 'invoice_numbering_entities'

/** The words and switches an invoice, a receipt and a variation order print. Blank notes print nothing. */
export type InvoicePaperLayout = {
  /** printed under the title block — a greeting, the scope */ header: string
  /** printed at the paper's end — a thank-you, a contact line */ footer: string
  /** the terms block's heading and its text (payment terms, exclusions, warranty) — blank text prints no block */ termsTitle: string; terms: string
  /** the bank details and PayNow under How to pay */ showBank: boolean
  /** the Paid and Balance due lines once something is paid */ showBalance: boolean
  /** (parity map, MI-065 · FB-101) this paper's own accent colour (#RRGGBB) — blank = the issuing entity's colour, else the brand kit's accent */
  accent: string
  /** (parity map, MI-065) an acceptance block at the end of an invoice and a variation order — its heading and words, then lines for the
      client's name, signature and date (for a client who signs on paper). Off by default. */
  acceptance: boolean; acceptanceTitle: string; acceptanceText: string
}
export const PAPER_TEXT_MAX = 600
export const PAPER_TERMS_MAX = 2000
export const ACCEPTANCE_TITLE = 'Acceptance'
export const ACCEPTANCE_TEXT = 'Accepted by the client — the amount and the terms above.'   // (parity map, MI-065) invented copy, flagged in reg-P-D.md
export const DEFAULT_PAPER: InvoicePaperLayout = { header: '', footer: '', termsTitle: 'Terms', terms: '', showBank: true, showBalance: true, accent: '', acceptance: false, acceptanceTitle: ACCEPTANCE_TITLE, acceptanceText: ACCEPTANCE_TEXT }
/** The studio's paper and the entities' own (an entity with no override prints the studio's). */
export type PaperSettings = { studio: InvoicePaperLayout; entities: Record<string, InvoicePaperLayout> }
export const DEFAULT_PAPER_SETTINGS: PaperSettings = { studio: DEFAULT_PAPER, entities: {} }

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim().slice(0, max) : '')
export function parsePaper(v: unknown): InvoicePaperLayout {
  const r = (v ?? {}) as Partial<Record<keyof InvoicePaperLayout, unknown>>
  return {
    header: text(r.header, PAPER_TEXT_MAX), footer: text(r.footer, PAPER_TEXT_MAX),
    termsTitle: text(r.termsTitle, 60) || DEFAULT_PAPER.termsTitle, terms: text(r.terms, PAPER_TERMS_MAX),
    showBank: r.showBank === undefined ? true : r.showBank === true, showBalance: r.showBalance === undefined ? true : r.showBalance === true,
    /* (parity map, MI-065 · FB-101) a paper saved before reads with no accent of its own and no acceptance block */
    accent: typeof r.accent === 'string' && /^#[0-9a-f]{6}$/i.test(r.accent.trim()) ? r.accent.trim().toUpperCase() : '',
    acceptance: r.acceptance === true, acceptanceTitle: text(r.acceptanceTitle, 60) || ACCEPTANCE_TITLE, acceptanceText: text(r.acceptanceText, PAPER_TEXT_MAX) || ACCEPTANCE_TEXT,
  }
}
export function parsePaperSettings(v: unknown): PaperSettings {
  const r = (v ?? {}) as { studio?: unknown; entities?: unknown }
  const entities: Record<string, InvoicePaperLayout> = {}
  if (r.entities && typeof r.entities === 'object' && !Array.isArray(r.entities)) {
    for (const [id, p] of Object.entries(r.entities as Record<string, unknown>).slice(0, 20)) if (id && id.length <= 80) entities[id] = parsePaper(p)
  }
  return { studio: parsePaper(r.studio), entities }
}
/** The paper an invoice prints: its entity's own, else the studio's. */
export const paperFor = (s: PaperSettings, entityId: string | null | undefined): InvoicePaperLayout => (entityId && s.entities[entityId]) || s.studio
/** Whether the paper says anything of its own (a note, a terms block or an acceptance block). */
export const paperHasWords = (p: InvoicePaperLayout) => !!(p.header || p.footer || p.terms || p.acceptance)

/* ── (parity map, FB-103 · FB-101) What a paper's letterhead and foot print besides the name, the address and the numbers ─────────── */

/** The entity's More details as a paper prints them, already resolved: its own, else the studio's. `accent` is the entity's colour, else the
    brand kit's accent — a paper's own accent (`InvoicePaperLayout.accent`) comes before it (`paperAccent`). */
export type PaperExtras = { tagline: string; phone: string; email: string; website: string; footer: string; accent: string | null; branch: string }
/** The letterhead every money paper prints on (`letterheadOf`), with its extras once the page hands them over. */
export type PaperLetterhead = { name: string; address: string; uen: string; gstReg: string; logo: string | null; extras?: PaperExtras | null }
/**
 * An entity's extras, resolved (1.0's `resolveDocumentBranding`: the entity's own, else the studio's): the contacts and the tagline fall back
 * to the studio's (Company › Profile › Company details), the footer line and the accent to the studio's own entity's, then the accent to the
 * brand kit's. The branch code is the entity's bank's alone.
 */
export function paperExtrasOf(entity: IssuingEntity | null, studio: { phone: string; email: string; website: string; tagline: string }, studioEntity: IssuingEntity | null, brandAccent: string | null): PaperExtras {
  const e = entity ?? studioEntity
  return {
    tagline: e?.tagline || studio.tagline || '', phone: e?.phone || studio.phone || '', email: e?.email || studio.email || '', website: e?.website || studio.website || '',
    footer: e?.footer || studioEntity?.footer || '', accent: e?.accent || studioEntity?.accent || brandAccent || null, branch: e?.branch || '',
  }
}
/** The extras a letterhead carries, when the page handed them over (an older loader's letterhead has none). */
export const extrasIn = (h: object | null | undefined): PaperExtras | null => ((h as { extras?: PaperExtras | null } | null | undefined)?.extras ?? null)
/** The colour a paper's title, rule and total take: the paper's own, else the entity's / the brand's; null = the ink, as before. */
export const paperAccent = (layout: Pick<InvoicePaperLayout, 'accent'> | null | undefined, extras: PaperExtras | null | undefined): string | null => layout?.accent || extras?.accent || null
/** The letterhead's one line: the address, the contacts, the website, the registration numbers. */
export function letterheadLine(h: Pick<PaperLetterhead, 'address' | 'uen' | 'gstReg'>, extras: PaperExtras | null, fallback: { phone: string; email: string }): string {
  return [h.address, extras?.phone ?? fallback.phone, extras?.email ?? fallback.email, extras?.website ?? '', h.uen ? `UEN ${h.uen}` : '', h.gstReg ? `GST Reg ${h.gstReg}` : ''].filter(Boolean).join(' · ')
}

/* ── A number pattern per issuing entity (1.0 G-293: "the studio's — or the issuing entity's — numbering") ──────────────────────── */

/** An entity's own invoice numbers; an entity not listed takes the studio-wide pattern. */
export type EntityNumbering = Record<string, ProjectNumbering>
export function parseEntityNumbering(v: unknown): EntityNumbering {
  const out: EntityNumbering = {}
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out
  for (const [id, n] of Object.entries(v as Record<string, unknown>).slice(0, 20)) if (id && id.length <= 80 && n && typeof n === 'object') out[id] = parseInvoiceNumbering(n)
  return out
}
/** The pattern an invoice raised under this entity takes. */
export const numberingFor = (studioWide: ProjectNumbering, own: EntityNumbering, entityId: string | null | undefined): ProjectNumbering => (entityId && own[entityId]) || studioWide
