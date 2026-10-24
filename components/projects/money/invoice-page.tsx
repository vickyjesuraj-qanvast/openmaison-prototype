'use client'

import { useEffect, useState } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs } from '@/components/om/crumbs'
import { useProjectsCrumb } from '@/components/shell/access-gate'
import { paperBackLabel } from '@/lib/nav'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { SendContractDialog } from '@/components/contracts/editor/dialogs'
import { PageReveal } from '@/components/shell/page-reveal'
import { useRememberShape } from '@/lib/ghost-shape'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { INVOICE_STATE_LABEL, INVOICE_STATE_TONE } from '@/lib/projects/money'
import { invoiceMessage } from '@/lib/projects/invoices-model'
import { dueOf } from '@/lib/projects/invoices-kinds'
import type { InvoiceDocData } from '@/lib/projects/money-queries'
import { sendInvoice, submitInvoice } from '@/app/projects/money-actions'
import { recordPayment, undoRecordPayment } from '@/app/projects/payment-actions'   // (simplify S-08) a sent invoice's page is never a dead end
import { RecordPaymentDialog } from './payments-dialogs'
import { InvoicePaper } from './invoice-paper'
import { InvoiceGhost, invoiceGhostKeys, type InvoiceGhostShape } from './invoice-ghost'
import styles from '@/components/quotes/preview/quote-preview.module.css'
import paper from './invoice-paper.module.css'

/**
 * (Projects round 5, F-12 · F-15) An invoice's page — the quote preview's frame (its bar and stage, the contract preview's way): the crumb back
 * to the project's Money tab, the invoice's number and state, Download PDF (the browser's print of the same page) and, on a Draft, its one
 * next step (Send · Submit for approval · Approve and send — the Money tab's own). The paper is the client's copy, on the issuing entity's
 * letterhead with how to pay. `?print=1` prints.
 * (simplify S-08) Back to Money returns to the invoice's panel (`?open=`); a sent invoice with something owed offers Record a payment here too.
 */
export function InvoicePage({ d, from, print }: { d: InvoiceDocData; from?: string; print: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const i = d.invoice
  const [sending, setSending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin))
  const tabHref = `/projects/${d.project.id}/money?open=${encodeURIComponent(i.id)}`   // (pending modules S07) the crumb's own tab, whatever the page was opened from
  const back = from ?? tabHref   // (simplify S-08) Back to Money returns to its panel
  const projectsCrumb = useProjectsCrumb()   // (pending modules S07) Finance for Accounting, who opens no Projects listing
  useEffect(() => { if (print) { const t = setTimeout(() => printPaper(), 600); return () => clearTimeout(t) } }, [print])
  /* (gaps build B, item 4) its own due day — a day picked, the handover day — else the terms */
  const due = dueOf(i, { sentAt: new Date(d.now), termsDays: d.rules.termsDays, handoverDay: d.handoverDay ?? null })
  const onReceipt = !i.dueMode && d.rules.termsDays === 0
  const link = i.shareToken ? `${origin}/invoice/${i.shareToken}` : null   // (gaps build B, item 6) its no-login link
  const copyLink = () => { if (!link) return; void navigator.clipboard?.writeText(link).then(() => snackbar({ message: `Link to ${i.label ?? 'the invoice'} copied — it opens without signing in` }), () => snackbar({ message: couldnt('copy the link') })) }
  const tone = INVOICE_STATE_TONE[i.state]
  const next = i.status !== 'draft' || d.viewer.locked || i.amountMinor <= 0 ? null   // (REG-1069) a completed project's invoices are not sent from here; (fix-D, D-09) nor a S$0 one
    : i.state === 'awaiting' ? (d.viewer.approves ? { label: 'Approve and send', run: () => setSending(true) } : null)
      : d.viewer.prepares ? (d.viewer.sendsAtOnce ? { label: 'Send', run: () => setSending(true) } : { label: 'Submit for approval', run: () => { void run('submit the invoice', () => submitInvoice(i.id), `${i.stageName} invoice submitted — an Owner or an Admin approves it`, { refresh: true }) } }) : null
  /* (simplify S-08, P3 §6.4) a sent invoice with something owed offers the same next step as its row and its panel: Record a payment */
  const owed = Math.max(0, i.balanceMinor - i.toConfirmMinor)
  const records = i.status === 'sent' && owed > 0 && !!d.payments?.viewer.records
  const [recording, setRecording] = useState(false)
  /* (fix-D, D-39 → simplify round 2, R2-A, REG-708) the bar's shape — the link icon, the next step, Record a payment — told to the reveal and
     remembered for the loader's next time, so both ghosts draw the buttons this page shows */
  const shape: InvoiceGhostShape = { copy: !!i.shareToken && i.status !== 'draft' && i.kind !== 'external', next: !!next, record: records }
  const keys = invoiceGhostKeys(i.id)
  useRememberShape(keys.copy, shape.copy); useRememberShape(keys.next, shape.next); useRememberShape(keys.record, shape.record)
  const record = (o: Parameters<Parameters<typeof RecordPaymentDialog>[0]['onSave']>[0]) => {
    setBusy(true)
    void recordPayment(i.id, { amountMinor: o.amountMinor, paidOn: o.paidOn, method: o.method, reference: o.reference, note: o.note || null, proof: o.proof ? { name: o.proof.name, dataUrl: o.proof.dataUrl } : null }).then((r) => {
      setBusy(false)
      if ('error' in r) { snackbar({ message: couldnt('record the payment', refusalOf(r.error)) }); return }
      setRecording(false)
      const state = r.state === 'paid' ? `${i.number} is paid` : `${money2(r.balanceMinor)} still owed on ${i.number}`
      const extra = r.credit ? ` — the extra ${money2(r.credit.amountMinor)} is ${d.client.name.split(/\s+/)[0]}’s credit, ${r.credit.number}` : ''   // (pending modules S07 — D-14)
      snackbar({ message: `Payment recorded — ${r.receipt ? `receipt ${r.receipt}; ` : ''}${state}${extra}`, actionLabel: 'Undo', onAction: () => { void run('take the payment back', () => undoRecordPayment(r.paymentId), 'The payment is taken back', { refresh: true }) } })
      router.refresh()
    }, () => { setBusy(false); snackbar({ message: couldnt('record the payment') }) })
  }
  /* (fix-D, D-09) what the server would refuse is said before WhatsApp opens, and a second press while the first is on its way does nothing */
  const sendBlock = i.status !== 'draft' ? 'A void invoice is not sent — its fresh Draft is' : i.amountMinor <= 0 ? 'An invoice for S$0.00 has nothing to send' : !d.viewer.sendsAtOnce ? 'Only an Owner or an Admin approves an invoice' : d.viewer.locked
  const send = async (o: { phone: string; message: string }) => {
    if (busy) return
    if (sendBlock) { snackbar({ message: couldnt('send the invoice', sendBlock) }); return }
    window.open(`https://wa.me/65${o.phone}?text=${encodeURIComponent(o.message)}`, '_blank', 'noopener')   // on the press, before the round trip (REG-534)
    setBusy(true)
    try {
      const r = await sendInvoice(i.id)
      if ('error' in r) { snackbar({ message: couldnt('send the invoice', refusalOf(r.error)) }); return }
      setSending(false)
      const renamed = d.nextInvoiceNumber && r.number !== d.nextInvoiceNumber ? ` — it went out as ${r.number}, not ${d.nextInvoiceNumber}; tell ${d.client.firstName}` : ''
      snackbar({ message: `${r.number} sent to ${d.client.firstName} — ${onReceipt ? 'due on receipt' : `due ${displayDate(new Date(r.dueAt))}`}${renamed}` })
      router.refresh()
    } catch { snackbar({ message: couldnt('send the invoice') }) } finally { setBusy(false) }
  }
  /* (gaps build B, item 6) a client without the portal gets the invoice's own link — it opens without signing in */
  const noPortal = !d.portalAccess ? [d.payTo ? `${d.client.firstName} has no portal — the message carries a link to the invoice that opens without signing in, the bank and PayNow details and the reference.` : `${d.client.firstName} has no portal — the message carries a link to the invoice that opens without signing in. The studio has no bank details yet, so add them in Company › Profile.`] : []
  const notes = [...(i.amountMinor > 0 && i.state === 'draft' && i.milestone ? [`${i.milestone.title} isn’t ${i.milestone.due === 'start' ? 'under way' : 'done'} yet`] : []), ...(i.differsMinor ? [`It differs from the schedule by ${money2(Math.abs(i.differsMinor))} — ${i.varianceReason}`] : []), ...noPortal]
  return (
    <PageReveal skeleton={<InvoiceGhost shape={shape} />}>
      <div className={styles.page} data-print={print || undefined} data-testid="invoice-page">
        <header className={styles.bar}>
          <div className={styles.titleBlock}>
            <Crumbs className={styles.crumb} items={[projectsCrumb, { label: d.project.name, href: `/projects/${d.project.id}` }, { label: 'Money', href: tabHref }]} />
            <div className={`${styles.titleRow} ${paper.headWrap}`}>
              <h1 className={styles.title}><span className={paper.nowrap}>{i.label ?? `${i.stageName} invoice`}</span></h1>
              <span className={styles.chips}>
                <MetaChip color={tone}>{INVOICE_STATE_LABEL[i.state]}</MetaChip>
                <MetaChip className={paper.chipFit}>{i.stageName} · {money2(i.amountMinor)}</MetaChip>
              </span>
            </div>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" appearance="outlined" onPress={() => router.push(back)}>{paperBackLabel(from, 'Money')}</Button>
            {link && i.status !== 'draft' && i.kind !== 'external' ? <Tooltip label="Copy the invoice link"><IconButton icon="link" label="Copy the invoice link" onClick={copyLink} data-testid="invoice-copy-link" /></Tooltip> : null}
            <Tooltip label="Download PDF"><IconButton icon="download" label="Download PDF" onClick={() => printPaper()} /></Tooltip>
            {next ? <Button variant="primary" onPress={next.run} isDisabled={busy} data-testid="invoice-page-next">{next.label}</Button> : null}
            {records ? <Button variant="primary" onPress={() => setRecording(true)} isDisabled={busy} data-testid="invoice-page-record">Record a payment</Button> : null}
          </div>
        </header>
        <div className={styles.body}>
          <div className={styles.column}>
            <div className={styles.stage}>
              <InvoicePaper d={{
                invoice: i, money: d.money!, letterhead: d.letterhead, entity: d.entity, studioPhone: d.studio.phone, studioEmail: d.studio.email,
                client: d.client, property: d.property, project: { name: d.project.name, number: d.project.number }, quoteNumber: d.quote?.number ?? null,
                draftDue: due.getTime(), now: d.now, layout: d.layout, methods: d.methods ?? null,   // (parity map, FB-112 — P-D) How to pay follows the live ways
              }} />
            </div>
          </div>
        </div>
        <RecordPaymentDialog open={recording} today={new Date(d.now)} busy={busy} methods={d.methods ?? null} client={d.client.name.split(/\s+/)[0]} invoice={records || recording ? { number: i.number, stageName: i.stageName, owedMinor: owed, sentAt: i.sentAt } : null}
                             onClose={() => setRecording(false)} onSave={record} />
        {sending ? (
          <SendContractDialog open={sending} onClose={() => setSending(false)} title={`Send the ${i.stageName} invoice`}
                              subtitle={`${money2(i.amountMinor)}, ${onReceipt ? 'due on receipt' : `due ${displayDate(due)}`}. It’s numbered${d.nextInvoiceNumber ? ` ${d.nextInvoiceNumber}` : ''} and recorded as sent, and WhatsApp opens with the message.`}
                              link={d.portalAccess ? `${origin}${d.portalUrl}` : undefined} phoneLabel="Client phone" copyDone="Portal link copied" sendLabel="Send via WhatsApp"
                              defaults={{ name: d.client.name, phone: d.client.phone }}
                              draft={(name) => invoiceMessage({ client: name, studio: d.studioName, stage: i.stageName, amount: money2(i.amountMinor), due: onReceipt ? null : displayDate(due), url: d.portalAccess ? `${origin}${d.portalUrl}` : null, number: d.nextInvoiceNumber ?? null, payTo: d.payTo ?? null, link: d.portalAccess ? null : link, oneOff: i.outside || i.kind === 'variation' })}
                              notes={notes.length ? notes : undefined} busy={busy} onSend={send} />
        ) : null}
      </div>
    </PageReveal>
  )
}

