/**
 * Preview › readiness (REG-490): what the quote still needs before it prints well through its template. Every check reads
 * the document's data and the template's blocks — no check is invented for a block the template does not print.
 */
import type { TemplateDesign } from './model'
import type { ClientView } from './client-view'
import { docTotals, type DocData } from './data'
import { sumPct } from '@/lib/quotes/payments'

export type ReadinessSection = 'general' | 'items' | 'payments' | 'terms' | 'notes' | 'signature'
export type ReadinessIssue = { key: string; label: string; detail: string; section: ReadinessSection; blocking: boolean }
export type Readiness = { issues: ReadinessIssue[]; ready: boolean }

export function readiness(d: DocData, design: TemplateDesign, view: ClientView): Readiness {
  const issues: ReadinessIssue[] = []
  const has = (kind: string) => design.blocks.some((b) => b.kind === kind && !b.hidden)
  const t = docTotals(d)
  if (!d.items.some((i) => i.kind === 'item' && !i.optional && i.status !== 'Declined')) issues.push({ key: 'items', label: 'No items to price', detail: 'The quote has no line items yet — the table prints empty.', section: 'items', blocking: true })
  else if (t.totalMinor <= 0) issues.push({ key: 'total', label: 'The total is S$0', detail: 'Every line is free or the discount clears the total.', section: 'items', blocking: false })
  if (!d.client.name.trim()) issues.push({ key: 'client', label: 'No client name', detail: 'The lead has no name to address the quote to.', section: 'general', blocking: true })
  if (!d.quote.validUntil) issues.push({ key: 'valid', label: 'No valid-until date', detail: 'General Info › Quote Valid Until is empty.', section: 'general', blocking: false })
  if (!d.preparedBy.name) issues.push({ key: 'prepared', label: 'Nobody is named as Prepared by', detail: 'General Info › Prepared by is empty.', section: 'general', blocking: false })
  if (!d.quote.siteAddress.trim() && design.blocks.some((b) => JSON.stringify(b).includes('{site_address}'))) issues.push({ key: 'address', label: 'No site address', detail: 'The template prints the site address and the quote has none.', section: 'general', blocking: false })
  if (has('payments') && view.paymentSchedule) {
    if (!d.payments.length) issues.push({ key: 'payments', label: 'No payment schedule', detail: 'The template prints a schedule and the quote has none.', section: 'payments', blocking: false })
    else if (Math.abs(sumPct(d.payments) - 100) > 0.01) issues.push({ key: 'payments-sum', label: 'Payment schedule doesn’t add up to 100%', detail: `The milestones add up to ${sumPct(d.payments)}%.`, section: 'payments', blocking: true })
  }
  if (has('terms') && view.terms && !d.quote.termsHtml.replace(/<[^>]*>|&nbsp;/g, '').trim()) issues.push({ key: 'terms', label: 'Terms and Conditions are empty', detail: 'The template prints them; add a template or write them in the editor.', section: 'terms', blocking: false })
  if (has('notes') && view.notes && !d.quote.notesHtml.replace(/<[^>]*>|&nbsp;/g, '').trim()) issues.push({ key: 'notes', label: 'Additional Notes are empty', detail: 'The template prints a notes block; it will be left out.', section: 'notes', blocking: false })
  const printsSignature = view.signature && (has('signature') || design.blocks.some((b) => (b.kind === 'header' || b.kind === 'footer') && !b.hidden && b.elements.some((e) => e.kind === 'signature' && e.columns.some((c) => c.image === 'member'))))
  if (printsSignature && !d.memberSignature) issues.push({ key: 'signature', label: 'Your signature isn’t set up', detail: 'The template prints your signature; set it up in the quote’s Signature section.', section: 'signature', blocking: false })
  return { issues, ready: !issues.some((i) => i.blocking) }
}
