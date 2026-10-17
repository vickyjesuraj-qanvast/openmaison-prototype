/**
 * Preview › readiness (REG-490): what the quote still needs before it prints well through its template. Every check reads
 * the document's data and the template's blocks — no check is invented for a block the template does not print.
 */
import type { TemplateDesign } from './model'
import type { ClientView } from './client-view'
import { docEntity, docTotals, type DocData } from './data'
import { sumPct } from '@/lib/quotes/payments'

export type ReadinessSection = 'general' | 'items' | 'payments' | 'terms' | 'notes' | 'signature' | 'bank'
/** `href` — (UX audit S1) the page that fixes it lives outside the quote (Company › Profile for the bank details). */
export type ReadinessIssue = { key: string; label: string; detail: string; section: ReadinessSection; blocking: boolean; href?: string }
export type Readiness = { issues: ReadinessIssue[]; ready: boolean }

export function readiness(d: DocData, design: TemplateDesign, view: ClientView): Readiness {
  const issues: ReadinessIssue[] = []
  /* (fix-D, D-08 · G-12) "before you send" has nothing to say once the client has confirmed or signed */
  if (d.quote.status === 'Confirmed' || d.quote.status === 'Signed') return { issues, ready: true }
  const variation = d.quote.kind === 'variation'
  const has = (kind: string) => design.blocks.some((b) => b.kind === kind && !b.hidden)
  const t = docTotals(d)
  const pays = d.payments.filter((p) => p.change !== 'removed')   // (S44F — NB-02) a revision's struck milestones and lines are marks, not the quote
  if (!d.items.some((i) => i.kind === 'item' && !i.optional && i.status !== 'Declined' && i.change !== 'removed')) issues.push({ key: 'items', label: 'No items to price', detail: 'The quote has no line items yet — the table prints empty.', section: 'items', blocking: true })
  else if (d.quote.kind === 'variation' ? t.totalMinor === 0 : t.totalMinor <= 0) issues.push({ key: 'total', label: 'The total is S$0', detail: 'Every line is free or the discount clears the total.', section: 'items', blocking: false })
  if (!d.client.name.trim()) issues.push({ key: 'client', label: 'No client name', detail: 'The lead has no name to address the quote to.', section: 'general', blocking: true })
  if (!d.quote.validUntil) issues.push({ key: 'valid', label: 'No valid-until date', detail: `General Info › ${variation ? 'Valid until' : 'Quote Valid Until'} is empty.`, section: 'general', blocking: false })
  if (!d.preparedBy.name) issues.push({ key: 'prepared', label: 'Nobody is named as Prepared by', detail: 'General Info › Prepared by is empty.', section: 'general', blocking: false })
  if (!d.quote.siteAddress.trim() && design.blocks.some((b) => JSON.stringify(b).includes('{site_address}'))) issues.push({ key: 'address', label: 'No site address', detail: 'The template prints the site address and the quote has none.', section: 'general', blocking: false })
  if (has('payments') && view.paymentSchedule && d.quote.kind !== 'variation') {   /* (Projects round 5) a variation order has no schedule of its own */
    if (!pays.length) issues.push({ key: 'payments', label: 'No payment schedule', detail: 'The template prints a schedule and the quote has none.', section: 'payments', blocking: false })
    else if (Math.abs(sumPct(pays) - 100) > 0.01) issues.push({ key: 'payments-sum', label: 'Payment schedule doesn’t add up to 100%', detail: `The milestones add up to ${sumPct(pays)}%.`, section: 'payments', blocking: true })
  }
  /* (fix-D, D-24) a variation order carries the contract's terms — its own T&Cs and notes are not asked for */
  if (!variation && has('terms') && view.terms && !d.quote.termsHtml.replace(/<[^>]*>|&nbsp;/g, '').trim()) issues.push({ key: 'terms', label: 'Terms and Conditions are empty', detail: 'The template prints them; add a template or write them in the editor.', section: 'terms', blocking: false })
  if (!variation && has('notes') && view.notes && !d.quote.notesHtml.replace(/<[^>]*>|&nbsp;/g, '').trim()) issues.push({ key: 'notes', label: 'Additional Notes are empty', detail: 'The template prints a notes block; it will be left out.', section: 'notes', blocking: false })
  /* (UX audit S1) The template prints a Bank details block and the issuing entity has none: the block prints nothing for the client, so say
     it here, with the way to Company › Profile where the entity's bank details are kept. */
  const entity = docEntity(d)
  if (has('bank') && entity && !(entity.bankName || entity.accountName || entity.accountNo || entity.swift || entity.payNow || entity.payNowQr)) issues.push({ key: 'bank', label: `No bank details for ${entity.name || d.studio.name}`, detail: 'The template prints a Bank details block; it is left out until they are added in Company › Profile.', section: 'bank', blocking: false, href: '/company/profile' })
  const printsSignature = view.signature && (has('signature') || design.blocks.some((b) => (b.kind === 'header' || b.kind === 'footer') && !b.hidden && b.elements.some((e) => e.kind === 'signature' && e.columns.some((c) => c.image === 'member'))))
  if (printsSignature && !d.memberSignature) issues.push({ key: 'signature', label: 'Your signature isn’t set up', detail: 'The template prints your signature; set it up in the quote’s Signature section.', section: 'signature', blocking: false })
  return { issues, ready: !issues.some((i) => i.blocking) }
}
