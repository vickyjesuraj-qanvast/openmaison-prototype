'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { leaveThen } from '@/components/company/leave-guard'
import { openTopUp, refreshCredits } from '@/components/credits/credits-client'
import { waLink } from '@/lib/portal/model'
import type { InboxDo, InboxRow, InboxRun } from '@/lib/dashboard/inbox'
import type { AfterCall } from '@/components/dashboard/after-call'
import { approveProjectUpdate } from '@/app/projects/updates-actions'
import { answerMoreTime, approveMilestoneDone, undoMarkDone, undoMoreTimeAnswer } from '@/app/projects/schedule-actions'
import { answerExpense, approveBill, undoBillApproval, undoExpenseAnswer } from '@/app/finance/cost-actions'
import { confirmPayment, remindInvoice, undoConfirmPayment } from '@/app/projects/payment-actions'
import { approveQuote } from '@/app/quotes/actions'
import { approvePriceBookItem } from '@/app/company/price-book-actions'
import { renewSigningLink } from '@/app/contracts/actions'
import { retryXero } from '@/app/finance/xero-actions'
import { setMonthlyAmount } from '@/app/credits/actions'
import { bringBack, setAside } from '@/app/dashboard/inbox-actions'
import { recordQuoteReminder, undoQuoteReminder } from '@/lib/maison-ai/remind-actions'   // (closing pass) the one record a quote's reminder keeps
import { unsentWords } from '@/lib/notifications/held'

type Snack = Parameters<ReturnType<typeof useSnackbar>>[0]
/** What an answer the server gives looks like: a refusal is `{ error }` (the house rule), anything else lands. */
const refused = (r: unknown): string | null => (r && typeof r === 'object' && 'error' in r && typeof (r as { error: unknown }).error === 'string' ? (r as { error: string }).error : null)

/**
 * (the Dashboard redesigned, 2026-10-26 — P-04 · Q-05 · lane D2) What Needs you's verbs do. Every one runs the module's OWN server action with
 * the module's own sentence and Undo (the project Overview's `useNeedActions` and Finance › To do are the references), optimistic the house
 * way (REG-656): the row leaves at once, comes back if the server refuses, and the snackbar names what failed. A WhatsApp opens on the press,
 * before any round trip (REG-534). A call or a WhatsApp to a lead is remembered (`remember` — the Dashboard's one after-call piece,
 * components/dashboard/after-call.tsx, Your day's too), so *Log the call* is offered when you come back to the page.
 * Nothing is counted in the browser: the ring re-reads the records once the page reads itself again.
 */
export function useInboxActions(remember: (c: AfterCall) => void) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set())
  const [busy, setBusy] = useState<string | null>(null)

  const hide = useCallback((key: string) => setGone((g) => new Set(g).add(key)), [])
  const show = useCallback((key: string) => setGone((g) => { const n = new Set(g); n.delete(key); return n }), [])

  /** One server answer, the house way: the row leaves at once; refused → it comes back and the snackbar says why; landed → `then`. */
  const settleOn = useCallback(async <T,>(row: InboxRow, what: string, call: () => Promise<T>, then: (r: T) => Snack | null, o: { keep?: boolean; refresh?: boolean; after?: boolean } = {}): Promise<boolean> => {
    if (busy) return false
    setBusy(row.key)
    if (!o.keep && !o.after) hide(row.key)
    try {
      const r = await call()
      const no = refused(r)
      if (no !== null) { show(row.key); snackbar({ message: couldnt(what, refusalOf(no)) }); return false }
      const s = then(r)
      if (o.after) hide(row.key)   // from the Review pane: the record stays in front of you until its answer lands
      if (s) snackbar(s)
      if (o.refresh !== false) router.refresh()
      return true
    } catch (e) {
      show(row.key)
      snackbar({ message: couldnt(what, refusalOf(e)) })
      return false
    } finally { setBusy(null) }
  }, [busy, hide, show, snackbar, router])

  /** An Undo: the module's own, then the page reads itself again (the row back in its place). */
  const undo = useCallback((row: InboxRow, what: string, call: () => Promise<unknown>, said?: string) => () => {
    void (async () => {
      try {
        const r = await call()
        const no = refused(r)
        if (no !== null) { snackbar({ message: couldnt(what, refusalOf(no)) }); return }
        show(row.key)
        if (said) snackbar({ message: said })
        router.refresh()
      } catch (e) { snackbar({ message: couldnt(what, refusalOf(e)) }) }
    })()
  }, [snackbar, show, router])

  const run = useCallback((row: InboxRow, r: InboxRun, where: { pane?: boolean } = {}): Promise<boolean> => {
    const settle = <T,>(what: string, call: () => Promise<T>, then: (x: T) => Snack | null, o: { keep?: boolean; refresh?: boolean } = {}) =>
      settleOn(row, what, call, then, { ...o, ...(where.pane && !o.keep ? { after: true } : {}) })
    switch (r.kind) {
      case 'approve-update':
        return settle('approve the update', () => approveProjectUpdate(r.ref), () => ({ message: r.done }))   // it reaches the client: no Undo, as on the tab
      case 'approve-done':
        return settle(`approve ${r.title}`, () => approveMilestoneDone(r.ref), (x) => 'sentence' in x ? ({ key: 'schedule-status', message: x.sentence, actionLabel: 'Undo',
          onAction: undo(row, 'undo the approval', async () => { const y = await undoMarkDone(x.undo); if (!('error' in y)) snackbar({ key: 'schedule-status', message: `${r.title} is back as it was${unsentWords(y.unsent)}` }); return y }) }) : null)
      case 'approve-more-time':
        return settle('approve more time', () => answerMoreTime(r.ref, { approve: true, note: '', draftUpdate: true }), (x) => 'sentence' in x ? ({ key: 'schedule-move', message: x.sentence, actionLabel: 'Undo', onAction: undo(row, 'undo the answer', () => undoMoreTimeAnswer(x.undo), 'The ask waits again') }) : null)
      case 'approve-expense':
        return settle('approve the expense', () => answerExpense(r.ref, { approve: true }), (x) => 'undo' in x ? ({ message: 'Expense approved', actionLabel: 'Undo', onAction: undo(row, 'undo it', () => undoExpenseAnswer(x.undo), 'It waits for approval again') }) : null)
      case 'approve-bill':
        return settle('approve the bill', () => approveBill(r.ref), (x) => 'undo' in x ? ({ message: `${r.title} approved — it can be paid`, actionLabel: 'Undo', onAction: undo(row, 'undo the approval', () => undoBillApproval(x.undo), `Bill ${x.reference} waits for approval again`) }) : null)
      case 'approve-quote':
        return settle('approve the quote', () => approveQuote(r.ref), () => ({ message: r.done }))   // the editor's own: no Undo — the sender hears of it
      case 'approve-price-book':
        return settle('approve the item', async () => (await approvePriceBookItem(r.ref)) ?? { ok: true }, () => ({ message: r.done }))
      case 'confirm-payment':
        return settle('confirm the payment', () => confirmPayment(r.ref), (x) => ('receipt' in x ? { message: `${r.done}${x.receipt ? `, receipt ${x.receipt}` : ''}`, actionLabel: 'Undo', onAction: undo(row, 'take the confirmation back', () => undoConfirmPayment(r.ref), 'Back to To confirm') } : null))
      case 'remind-invoice':
        return settle('record the reminder', () => remindInvoice(r.ref), () => ({ message: r.done }))
      case 'remind-contract':
        return settle('renew the link', () => renewSigningLink(r.ref, 'whatsapp'), () => ({ message: r.done }))
      case 'remind-quote':
        return settle('keep the reminder', () => recordQuoteReminder({ quoteId: r.quoteId }), (x) => ('eventId' in x ? { message: r.done, actionLabel: 'Undo', onAction: undo(row, 'take the reminder back', () => undoQuoteReminder({ eventId: x.eventId }), 'Back in Needs you') } : null))
      case 'retry-xero':
        return settle('retry the push', async () => {
          let failed = 0
          for (const it of r.items) { const x = await retryXero({ kind: it.kind as Parameters<typeof retryXero>[0]['kind'], id: it.id }); const no = refused(x); if (no !== null) return x; failed += (x as { failed: number }).failed }
          return { failed }
        }, (x) => ({ message: (x as { failed: number }).failed ? `${(x as { failed: number }).failed === 1 ? 'It' : `${(x as { failed: number }).failed} of them`} failed again — see why on the Xero tab` : r.items.length === 1 ? 'It reached Xero' : 'They reached Xero' }))
      case 'raise-credits':
        return settle('change the monthly amount', () => setMonthlyAmount(r.memberId, r.amount), () => { void refreshCredits(); return { key: `amount-${r.memberId}`, message: r.done, actionLabel: 'Undo', onAction: undo(row, 'change it back', async () => { const y = await setMonthlyAmount(r.memberId, r.previous); void refreshCredits(); return y }) } })
      case 'top-up':
        openTopUp()
        return Promise.resolve(true)
    }
  }, [settleOn, undo, snackbar])

  /** A verb's press. `review` opens the pane (the caller's); everything else is here. */
  const press = useCallback((row: InboxRow, d: InboxDo, onReview: (row: InboxRow) => void) => {
    if (d.kind === 'review') { onReview(row); return }
    if (d.kind === 'href') { leaveThen(() => router.push(d.href)); return }
    if (d.kind === 'call') {
      if (d.leadId) remember({ leadId: d.leadId, who: d.first ?? 'them', channel: 'Call' })
      window.location.assign(d.href)
      return
    }
    if (d.kind === 'whatsapp') {
      const link = d.link ? `${window.location.origin}${d.link}` : ''
      const text = d.text.replace('{link}', link)
      const digits = d.phone.replace(/\D/g, '').slice(-8)
      window.open(text ? waLink(digits, text) : `https://wa.me/65${digits}`, '_blank', 'noopener')   // on the press, before the round trip (REG-534)
      if (d.run) { void run(row, d.run); return }
      if (d.leadId) remember({ leadId: d.leadId, who: d.first ?? 'them', channel: 'WhatsApp' })
      return
    }
    void run(row, d.run)
  }, [router, run, remember])

  /** Not today (Q-05): the row rests until tomorrow — Undo brings it back. */
  const notToday = useCallback((row: InboxRow) => {
    const key = row.snoozeKey
    if (!key) return
    void settleOn(row, 'set it aside', () => setAside({ key }), () => ({ key: 'inbox-aside', message: 'Set aside until tomorrow', actionLabel: 'Undo', onAction: undo(row, 'bring it back', () => bringBack({ key }), 'Back in Needs you') }), { refresh: false })
  }, [settleOn, undo])
  /** The set-aside list's Bring back. */
  const bringBackNow = useCallback((row: InboxRow) => {
    const key = row.snoozeKey
    if (!key) return
    void settleOn(row, 'bring it back', () => bringBack({ key }), () => { show(row.key); return { key: 'inbox-aside', message: 'Back in Needs you' } }, { keep: true, refresh: false })
  }, [settleOn, show])

  return { gone, busy, hide, show, press, run, notToday, bringBackNow }
}
