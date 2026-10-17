'use client'

import { useEffect, useState } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { PageReveal } from '@/components/shell/page-reveal'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { REASON_MAX, poSheet } from '@/lib/finance/model'
import { buildTable, downloadBlob } from '@/lib/leads/export'
import type { PoDoc } from '@/lib/finance/queries'
import { answerPo } from '@/app/po/actions'
import { PoPaper } from './po-paper'
import { PoGhost } from './po-page'
import frame from '@/components/quotes/preview/quote-preview.module.css'
import paper from '@/components/projects/money/invoice-paper.module.css'
import money from '@/components/projects/money/money.module.css'
import fin from './finance.module.css'

/**
 * (gaps build F1 — F1-Q9) A purchase order as its vendor opens it from WhatsApp, without signing in (the token is the permission — the invoice
 * link's way): the studio's name over the PO's number, Download PDF, the paper, and the vendor's answer — Accept, Ask for changes, Decline (with
 * what should change, or why). One answer while the PO is with them; a cancelled or closed one says so. Phone first.
 */
export function VendorLinkPage({ token, d, state, print }: { token: string; d: PoDoc; state: 'open' | 'cancelled' | 'closed'; print: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [mode, setMode] = useState<null | 'changes' | 'declined'>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  useEffect(() => { if (print) { const t = setTimeout(() => printPaper(), 600); return () => clearTimeout(t) } }, [print])
  const po = d.po
  const answered = po.vendorAnswer
  const send = async (answer: 'accepted' | 'changes' | 'declined') => {
    if (answer !== 'accepted') { setTried(true); if (!note.trim()) return }
    setBusy(true)
    try {
      const r = await answerPo(token, { answer, note: answer === 'accepted' ? null : note })
      if ('error' in r) { snackbar({ message: couldnt('send your answer', refusalOf(r.error)) }); return }
      snackbar({ message: answer === 'accepted' ? `Thank you — ${d.studio.name} knows you accepted ${po.number}` : `Thank you — ${d.studio.name} has your note` })
      setMode(null); router.refresh()
    } catch (e) { snackbar({ message: couldnt('send your answer', refusalOf(e)) }) } finally { setBusy(false) }
  }
  const downloadCsv = () => {
    const { head, body } = poSheet(po)
    downloadBlob(buildTable(`${d.studio.name} — ${po.number}`, head, body, 'CSV'), `${po.number}.csv`)
  }
  const chip = state === 'cancelled' ? <MetaChip>Cancelled</MetaChip> : state === 'closed' ? <MetaChip color="green">Closed</MetaChip>
    : answered === 'accepted' ? <MetaChip color="green">Accepted</MetaChip> : answered === 'changes' ? <MetaChip color="yellow">Changes asked</MetaChip> : answered === 'declined' ? <MetaChip color="red">Declined</MetaChip> : <MetaChip color="blue">For you to accept</MetaChip>
  return (
    <PageReveal skeleton={<PoGhost />}>
      <div className={frame.page} data-print={print || undefined} data-testid="vendor-po-page">
        <header className={frame.bar}>
          <div className={frame.titleBlock}>
            <span className={frame.crumb}>{d.studio.name}</span>
            <div className={`${frame.titleRow} ${fin.wrapRow}`}>
              <h1 className={frame.title}>Purchase order <span className={paper.nowrap}>{po.number}</span></h1>
              <span className={frame.chips}>{chip}<MetaChip>{money2(po.totalMinor)}</MetaChip></span>
            </div>
          </div>
          <div className={frame.actions}>
            {/* (parity map, MO-027 — 1.0's Export CSV) the lines as a sheet, through the house export */}
            <Button variant="secondary" appearance="outlined" iconStart={<Icon name="csv" size={20} />} onPress={downloadCsv} data-testid="vendor-po-csv">Download CSV</Button>
            <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => printPaper()} data-testid="vendor-po-download">Download PDF</Button>
          </div>
        </header>
        <div className={frame.body}>
          <div className={frame.column}>
            {state === 'open' ? (
              <section className={fin.answer} aria-label="Your answer" data-testid="vendor-po-answer">
                {answered ? (
                  <p className={fin.note} data-tone={answered === 'declined' ? 'alert' : undefined}>
                    {answered === 'accepted' ? `You accepted ${po.number}${po.vendorAnsweredAt ? ` on ${displayDate(new Date(po.vendorAnsweredAt))}` : ''}. ${d.studio.name} pays ${po.dueOn ? `by ${displayDate(new Date(po.dueOn))}` : 'as the PO says'} — quote ${po.number} on your invoice.`
                      : answered === 'changes' ? `You asked for changes: “${po.vendorAnswerNote ?? ''}”. ${d.studio.name} will send it again.`
                        : `You declined it: “${po.vendorAnswerNote ?? ''}”.`} To change your answer, call {d.studio.name}{d.studio.phone ? ` on ${d.studio.phone}` : ''}.
                  </p>
                ) : mode ? (
                  <>
                    <TextField label={mode === 'changes' ? 'What should change?' : 'Why do you decline it?'} value={note} onChange={setNote} maxLength={REASON_MAX} multiline={3} required autoFocus
                               error={tried && !note.trim() ? (mode === 'changes' ? 'Say what should change' : 'Say why') : undefined} helper={`${d.studio.name} reads it`} />
                    <div className={fin.answerButtons}>
                      <Button variant="secondary" appearance="outlined" onPress={() => { setMode(null); setTried(false) }} isDisabled={busy}>Back</Button>
                      <Button onPress={() => { void send(mode) }} isDisabled={busy} data-testid="vendor-po-send">{busy ? 'Sending…' : mode === 'changes' ? 'Ask for changes' : 'Decline the PO'}</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className={money.story}>{d.studio.name} sends you this purchase order for {d.project.address ?? d.project.name}. Read it, then accept it — or ask for changes.</p>
                    <div className={fin.answerButtons}>
                      <Button onPress={() => { void send('accepted') }} isDisabled={busy} data-testid="vendor-po-accept">{busy ? 'Sending…' : `Accept ${po.number}`}</Button>
                      <Button variant="secondary" appearance="outlined" onPress={() => { setNote(''); setMode('changes') }} data-testid="vendor-po-changes">Ask for changes</Button>
                      <Button variant="secondary" appearance="text" onPress={() => { setNote(''); setMode('declined') }} data-testid="vendor-po-decline">Decline</Button>
                    </div>
                  </>
                )}
              </section>
            ) : (
              <p className={fin.note} data-tone={state === 'cancelled' ? 'alert' : undefined} data-testid="vendor-po-closed">
                {state === 'cancelled' ? `${d.studio.name} cancelled this purchase order: “${po.cancelReason ?? ''}”. Nothing more is needed on it.` : `This purchase order is closed — thank you.`}
              </p>
            )}
            <div className={frame.stage}><PoPaper d={d} /></div>
          </div>
        </div>
      </div>
    </PageReveal>
  )
}
