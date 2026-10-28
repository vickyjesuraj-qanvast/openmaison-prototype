/**
 * (simplify S-15 — P3 §6.7 · F1 §6.8, his "build everything" 2026-10-09) Settings › Finance › **Document numbers**: the four money documents
 * the studio numbers — Invoices INV · Receipts RCT · Credit notes CN · Purchase orders PO — on one card with ONE Save, where four numbering
 * blocks with four Saves sat on three cards (Invoices, Client payments and Credit notes on Settings › Projects, Costs on Settings › Finance).
 * Each keeps the settings key it was saved under (`invoice_numbering` · `receipt_numbering` · `credit_note_rules.numbering` ·
 * `cost_rules.numbering`), and an issuing entity's own invoice prefix (`invoice_numbering_entities`, gaps build B item 12) rides under
 * Invoices from a second entity on. Pure and client-safe: the card (app/settings/document-numbers.tsx) and the server action
 * (app/settings/document-numbers-actions.ts) read the same words and the same rule.
 */
import { formatProjectNumber, nextProjectSeq, type ProjectNumbering } from '@/lib/projects/model'

export const DOC_KINDS = ['invoice', 'receipt', 'credit', 'po'] as const
export type DocKind = (typeof DOC_KINDS)[number]

/** One document's row: its name, the noun the snackbar says, its icon, when it takes its number (the year in it is that moment's — the
    words each block's year switch said), and its example's test id (kept from the card each came from, so the probes still find them). */
export const DOCS: readonly { key: DocKind; label: string; noun: string; icon: string; when: string; testId: string }[] = [
  { key: 'invoice', label: 'Invoices', noun: 'invoice', icon: 'receipt_long', when: 'Numbered when it is sent', testId: 'invoice-number-example' },
  { key: 'receipt', label: 'Receipts', noun: 'receipt', icon: 'payments', when: 'Numbered when the payment is confirmed', testId: 'receipt-number-example' },
  { key: 'credit', label: 'Credit notes', noun: 'credit note', icon: 'request_quote', when: 'Numbered when it is issued', testId: 'cn-number-example' },
  { key: 'po', label: 'Purchase orders', noun: 'PO', icon: 'local_shipping', when: 'Numbered when it is made', testId: 'po-number-example' },
]

/** The four patterns, and each issuing entity's own invoice prefix ('' = the studio's) — present only while the studio has two or more. */
export type DocumentNumbering = Record<DocKind, ProjectNumbering>
export type DocumentNumbersInput = DocumentNumbering & { entities?: Record<string, string>; /** (parity map, UC-058) the Tickets row */ ticket?: ProjectNumbering }
/** What the card shows: the patterns, every number already given per document (the next never goes below the highest), the entities.
    (parity map, UC-058) `ticket` — the Tickets row's pattern and the numbers given; absent, the card reads it itself. */
export type DocumentNumbersData = { numbering: DocumentNumbering; numbers: Record<DocKind, string[]>; entities: { id: string; name: string; prefix: string }[]; ticket?: TicketNumbersData }

/* ── (parity map 2026-10-10 — UC-058 · FR-084) Tickets, the fifth row: 1.0 set the ticket prefix with the others (Accounts › Document
   Numbering). Not a money document, so it rides beside the four (its own settings key, `ticket_numbering`); its year restarts the count each
   year, as today's T-{YYYY}-{nnn} — the default, so a studio that never opens it numbers as it always did. ── */
export type TicketNumbersData = { numbering: ProjectNumbering; numbers: string[] }
/* (the calm UI build 2026-10-27, T-01) a client's ticket is an *issue* on screen — the row's words; its key, settings and test id stay */
export const TICKET_DOC = { label: 'Issues', noun: 'issue', icon: 'handyman', when: 'Numbered when it is reported or raised', testId: 'ticket-number-example' } as const

export const DOCUMENT_NUMBERS_RULE = 'Only Owners and Admins change how documents are numbered'

/** The number a document takes next under this pattern, never below the highest already given under its prefix. */
export const nextDocNumber = (n: ProjectNumbering, numbers: string[], at: Date) => formatProjectNumber(n, nextProjectSeq(numbers, n), at)

/** A prefix as it is kept: letters and digits, up to 8, in capitals (every numbering card's rule). */
export const cleanPrefix = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)

/** (invented copy) Two documents numbered under one prefix read alike on paper — each takes its own; an entity's prefix is neither another
    document's nor another entity's. Null when every prefix is its own. */
export function prefixClash(n: DocumentNumbering, entities: { name: string; prefix: string }[] = [], extra: { label: string; prefix: string }[] = []): string | null {
  const seen = new Map<string, string>()
  for (const d of [...DOCS.map((x) => ({ label: x.label, prefix: n[x.key].prefix })), ...extra]) {   // (parity map, UC-058) the Tickets row too
    const p = d.prefix
    const was = seen.get(p)
    if (was) return `${was} and ${d.label} share the prefix ${p} — give each its own`
    seen.set(p, d.label)
  }
  for (const e of entities) {
    const p = cleanPrefix(e.prefix)
    if (!p) continue
    if (p === n.invoice.prefix) return `${p} is the studio’s own invoice prefix — give ${e.name} another`
    const was = seen.get(p)
    if (was) return `${was} and ${e.name} share the prefix ${p} — give each its own`
    seen.set(p, e.name)
  }
  return null
}
