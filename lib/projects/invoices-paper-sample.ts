/**
 * (parity map, MI-065 · FB-102 — 1.0's `mockSampleForPreview` in the Document Templates editor) The sample invoice Settings › Finance ›
 * Invoice paper previews the paper on, pure and client-safe: the studio's real letterhead, the issuing entity's real bank and PayNow, and a
 * plainly-sample invoice (a Mid-project stage of a sample contract, part paid, so the Paid and balance due switch shows what it does). Every
 * word on it that is not the studio's own reads as a sample — the preview's own label says so — so it is never taken for a real invoice.
 */
import type { InvoiceView } from './money'
import type { InvoicePaperData } from '@/components/projects/money/invoice-paper'
import { paperExtrasOf, type InvoicePaperLayout, type PaperLetterhead } from './invoices-paper'
import type { IssuingEntity } from '@/lib/templates/model'

/** What the preview reads from the studio (the server's `invoicePaperSample`). */
export type PaperSampleBrand = {
  studio: { name: string; address: string; phone: string; email: string; website: string; tagline: string; uen: string; gstReg: string; gstRegistered: boolean }
  brandLogo: string | null
  /** the brand kit's accent — what the paper takes when neither it nor its entity has a colour of its own */ brandAccent: string | null
  /** the live issuing entities, the studio's own first */ entities: IssuingEntity[]
  /** the studio's GST rate in percent (0 = not registered) */ gstRate: number
  /** the ways the studio takes money today (Client payments) */ methods: string[]
}

const DAY = 86_400_000
/** The letterhead `letterheadOf` gives a document raised under this entity (the studio's own for the first, the entity's own letterhead for
    another — its name, logo, address, numbers; the studio's address when it has none). Kept in step with lib/projects/money-queries.ts. */
export function sampleLetterhead(b: PaperSampleBrand, entity: IssuingEntity | null): PaperLetterhead {
  const own = !entity || entity.id === b.entities[0]?.id
  const studioEntity = b.entities[0] ?? null
  const extras = paperExtrasOf(entity, b.studio, studioEntity, b.brandAccent)
  return own || !entity
    ? { name: b.studio.name, address: b.studio.address, uen: b.studio.uen, gstReg: !b.studio.gstRegistered || (entity && !entity.gstRegistered) ? '' : b.studio.gstReg, logo: b.brandLogo, extras }
    : { name: entity.name || b.studio.name, address: entity.address || b.studio.address, uen: entity.uen, gstReg: entity.gstRegistered ? entity.gstReg : '', logo: entity.logo ?? b.brandLogo, extras }
}

/** The sample invoice on this paper, under this entity, as of `now`. */
export function sampleInvoice(b: PaperSampleBrand, entity: IssuingEntity | null, layout: InvoicePaperLayout, now: number): InvoicePaperData {
  const rate = entity && !entity.gstRegistered ? 0 : b.gstRate
  const contract = 8_000_000, amount = Math.round(contract * 0.3), gst = rate ? Math.round((amount * rate) / (100 + rate)) : 0, paid = 1_000_000
  const sentAt = now - 3 * DAY, dueAt = now + 11 * DAY
  const invoice = {
    id: 'sample', stageRef: 'split:sample', stageName: 'Mid-project', pct: 30, position: 2, number: 'INV-0000', status: 'sent', amountMinor: amount, gstMinor: gst,
    issuingEntity: entity?.name ?? null, varianceReason: null, editedBy: null, editedAt: null, submittedBy: null, submittedAt: null, reviewNote: null, reviewedBy: null,
    reviewedAt: null, sentBy: null, sentAt, dueAt, voidReason: null, voidedBy: null, voidedAt: null, replacesId: null, createdAt: sentAt, kind: 'stage',
    state: 'part_paid', paidMinor: paid, balanceMinor: amount - paid, subtotalMinor: amount - gst, expectedMinor: null, differsMinor: 0, milestone: null, toConfirmMinor: 0,
    overdueMinor: 0, paidOn: null, uncheckedMinor: 0, basis: { contractMinor: contract, baseMinor: contract, variationsMinor: 0, issued: true }, outside: false,
    label: 'INV-0000', readySince: null, adjustedFrom: null,
  } as InvoiceView
  return {
    invoice, money: { contractMinor: contract, baseMinor: contract, variationsMinor: 0, gstRate: rate, source: 'quote' },
    letterhead: sampleLetterhead(b, entity), entity, studioPhone: b.studio.phone, studioEmail: b.studio.email,
    client: { name: 'Sample Client', phone: '' }, property: 'The client’s address', project: { name: 'Sample project', number: 'P-0000' }, quoteNumber: null,
    draftDue: dueAt, now, layout, methods: b.methods,
  }
}
