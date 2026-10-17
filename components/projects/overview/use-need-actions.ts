'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { withFrom } from '@/lib/nav'
import { waLink } from '@/lib/portal/model'
import { money2 } from '@/lib/quotes/math'
import { tellClientText, tellDay } from '@/lib/projects/tell-client'
import { shortTitle } from '@/lib/projects/schedule-model'
import { unsentWords } from '@/lib/notifications/held'   // (simplify round 2, R2-C) an Undo also takes back the client's email
import type { NeedAction, NeedRow } from '@/lib/projects/needs-you'
import type { ProjectDetail } from '@/lib/projects/queries'
import type { SetupAction } from '@/lib/projects/getting-started'
import { approveProjectUpdate } from '@/app/projects/updates-actions'
import { answerMoreTime, approveMilestoneDone, undoMarkDone, undoMoreTimeAnswer, type DoneTold } from '@/app/projects/schedule-actions'
import { answerExpense, approveBill, undoBillApproval, undoExpenseAnswer } from '@/app/finance/cost-actions'
import type { ProjectStep } from '../project-overview'
import { useProjectContext } from '../project-context'

/** (simplify round 2) The approvals Needs your OK answers in the row — and the second word each one offers. */
const ANSWERED_HERE: readonly NeedRow['inline'][] = ['approve-update', 'approve-done', 'approve-more-time', 'approve-po', 'approve-expense', 'approve-invoice']
/** (simplify round 2, S-20 · P2 §6.7) A Needs your OK row's way back — Send back (Decline for more time), or nothing (the handover's review
    has its own on the review). */
export const backLabelOf = (r: NeedRow): string | null => (r.inline && ANSWERED_HERE.includes(r.inline) ? (r.inline === 'approve-more-time' ? 'Decline' : 'Send back') : null)

/**
 * (simplify S-01 · S-02 · S-20) What a Needs you row's button does on the Overview: its address (contract C's deep links, the way back riding
 * along — REG-465), or one of the page's own flows (the frame's Start · Resume · Review the handover · Invite · Assign · the Contract step · the
 * value · the dates). An approval with a one-press answer approves IN THE ROW through the tab's own server action — the same sentence and Undo
 * the tab gives (the update's approval has no Undo there either: it reaches the client) — and a refusal says why; an approval that sends
 * something (a PO to its vendor, an invoice to the client) opens its send on Money, where its WhatsApp opens on the press (REG-534).
 *
 * (simplify round 2, the owner's "fix all the pending things" 2026-10-09)
 * - **Send back / Decline in place** (P2 §6.7): an update's Send back opens the Updates tab's own note dialog here, a Done ask's and the ask
 *   for more time's the Schedule's own dialogs (`answering`, drawn by `NeedAnswerDialogs`); a PO's, an expense's or an invoice's opens Money on
 *   its record with `&do=sendback` (Money's landing). Each answers with the tab's sentence and Undo.
 * - **A Done approved in the row runs the Mark done sheet's ticks** (S-18): `approveMilestoneDone` runs what rode with the ask — so its Undo is
 *   the tab's `undoMarkDone` (it takes the ticks back too, and — R2-C — the client's emails still held, "{m} is back as it was — and the message
 *   to {client} won't go"), and the tab's *Tell {client} on WhatsApp too?* follows when something went out. The Schedule tab's `approveDone`
 *   (components/projects/schedule/project-schedule.tsx) is the reference: change the two together.
 * - The weekly update's *Draft it* is an address now (`updates?draft=week`): the row, the header, the brief and Maison AI open the week's draft
 *   in the composer alike.
 */
export function useNeedActions(o: { d: ProjectDetail; href: (slug: string, query?: string) => string
  onSetup: (run: SetupAction | 'invite', el?: HTMLElement) => void; onStep?: (step: ProjectStep) => void; onResume?: () => void; onHold?: () => void }) {
  const { d, href, onSetup, onStep, onResume, onHold } = o
  const router = useRouter()
  const ctx = useProjectContext()   // (contract B) the frame's one door — the header's filled button runs the same
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [busy, setBusy] = useState<string | null>(null)
  /** (simplify round 2) the approval being sent back or declined here — `NeedAnswerDialogs` draws its dialog */
  const [answering, setAnswering] = useState<NeedRow | null>(null)
  const here = href('')
  const first = d.lead.name.split(/\s+/)[0] ?? d.lead.name
  /** An address opens with the way back here — unless it already names one. */
  /* (parity map, MI-068) a row's Call opens the dialler as it is — never pushed with ?from= */
  const go = (to: string) => (to.startsWith('tel:') ? window.location.assign(to) : router.push(to.includes('from=') ? to : withFrom(to, here)))

  const act = (a: NeedAction, el?: HTMLElement, row?: NeedRow) => {
    if (row?.kind === 'hold' && a === row.secondary) { onHold?.(); return }   // Change the hold
    if (a.href) { go(a.href); return }
    if (a.run && ctx.projectId) { ctx.run(a, el); return }   // the header's own handler: the row and the button never disagree (S-02)
    switch (a.run) {
      case 'start': onStep?.('start'); return
      case 'resume': onResume?.(); return
      case 'review': case 'handover': onStep?.('handover'); return   // the frame opens Review the handover when one waits for this viewer
      case 'invite': case 'assign': case 'contract': case 'value': case 'dates:start': case 'dates:end': onSetup(a.run, el); return
      case 'schedule': router.push(href('schedule')); return
      case 'share': router.push(href('schedule', 'share=1')); return
      case 'update': router.push(href('updates', 'compose=1')); return
      case 'invoice': router.push(href('money', `open=${encodeURIComponent(a.target ?? '')}&send=1`)); return
      default: return
    }
  }

  /** (S-18, the Schedule's `offerTell`) once a Done approved here sent something to the client, the WhatsApp draft one press away. */
  const offerTell = (title: string, told: DoneTold | undefined) => {
    const wc = d.withClient.portal
    const phone = wc.phone || d.lead.phone
    if (!told || !phone || !(told.shared || told.invoice || told.photos)) return
    const origin = window.location.origin
    const live = (wc.state === 'invited' || wc.state === 'opened') && !!wc.home
    const text = tellClientText('done', { client: d.lead.name, studio: wc.studio, url: live ? `${origin}${wc.home}/schedule` : null, milestone: title, confirm: told.confirm, photos: told.photos,
      invoice: told.invoice ? { stage: told.invoice.stage, amount: money2(told.invoice.amountMinor), number: told.invoice.number, due: told.invoice.dueAt ? tellDay(told.invoice.dueAt) : null, link: told.invoice.link ? `${origin}${told.invoice.link}` : null } : null })
    snackbar({ key: 'tell-client', message: `Tell ${first} on WhatsApp too?`, actionLabel: 'Open WhatsApp', onAction: () => { window.open(waLink(phone, text), '_blank', 'noopener') } })
  }

  /** The row's in-place answer — then the page reads itself again, the row gone. */
  const approve = async (row: NeedRow) => {
    if (busy) return
    const id = row.ref
    if (row.inline === 'review-handover') { onStep?.('handover'); return }
    if (!id || row.inline === 'approve-po' || row.inline === 'approve-invoice') { act(row.action, undefined, row); return }   // it sends: Money's send opens
    setBusy(row.key)
    try {
      if (row.inline === 'approve-update') {
        const reaches = d.withClient.portal.state === 'invited' || d.withClient.portal.state === 'opened'
        await run('approve the update', () => approveProjectUpdate(id), row.ask?.change ? (reaches ? `Change approved — ${first} can see the new words` : 'Change approved') : reaches ? `Approved — ${first} can see ${row.title}` : 'Approved', { refresh: true })
      } else if (row.inline === 'approve-done') {
        /* (S-18) the action the Schedule's own Approve calls: the ticks that rode with the ask run with the approval */
        const r = await approveMilestoneDone(id)
        if ('error' in r) { snackbar({ message: couldnt(`approve ${row.ask?.title ?? 'it'}`, refusalOf(r.error)) }); return }
        const title = row.ask?.title ?? row.title.replace(/ — done$/, '')
        /* the tab's Undo: the ticks and the client's held emails back with it, in the sheet's own words (R2-C), replacing the WhatsApp offer */
        snackbar({ key: 'schedule-status', message: r.sentence, actionLabel: 'Undo', onAction: () => {
          void run('undo the approval', async () => {
            const x = await undoMarkDone(r.undo)
            if (!('error' in x)) snackbar({ key: 'tell-client', message: `${shortTitle(title)} is back as it was${unsentWords(x.unsent)}` })
            return x
          }, undefined, { refresh: true })
        } })
        offerTell(title, r.told)
        router.refresh()
      } else if (row.inline === 'approve-more-time') {
        /* the panel's own default: a draft update with the new day for the client (P2 §6.7) */
        const r = await answerMoreTime(id, { approve: true, note: '', draftUpdate: true })
        if ('error' in r) { snackbar({ message: couldnt('approve more time', refusalOf(r.error)) }); return }
        snackbar({ key: 'schedule-move', message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo the answer', () => undoMoreTimeAnswer(r.undo), 'The ask waits again', { refresh: true }) } })
        router.refresh()
      } else if (row.inline === 'approve-expense') {
        const r = await answerExpense(id, { approve: true })
        if ('error' in r) { snackbar({ message: couldnt('approve the expense', refusalOf(r.error)) }); return }
        snackbar({ message: 'Expense approved', actionLabel: 'Undo', onAction: () => { void run('undo it', () => undoExpenseAnswer(r.undo), 'It waits for approval again', { refresh: true }) } })
        router.refresh()
      } else if (row.inline === 'approve-bill') {   // (S44R, C8) the bill's OK — Money's own sentence and Undo
        const r = await approveBill(id)
        if ('error' in r) { snackbar({ message: couldnt('approve the bill', refusalOf(r.error)) }); return }
        snackbar({ message: `${row.title} approved — it can be paid`, actionLabel: 'Undo', onAction: () => { void run('undo the approval', () => undoBillApproval(r.undo), `Bill ${r.reference} waits for approval again`, { refresh: true }) } })
        router.refresh()
      }
    } catch (e) {
      snackbar({ message: couldnt('approve it', refusalOf(e)) })
    } finally { setBusy(null) }
  }

  /** (simplify round 2, S-20 · P2 §6.7) Send back / Decline: the tab's own dialog here, or Money's send back on its record. */
  const sendBack = (row: NeedRow) => {
    if (busy || !row.ref) return
    if (row.inline === 'approve-po' || row.inline === 'approve-expense' || row.inline === 'approve-invoice') {
      go(`/projects/${d.project.id}/money?open=${encodeURIComponent(row.ref)}&do=sendback`)   // contract C: Money opens the record's Send back
      return
    }
    if (row.inline === 'approve-update' || row.inline === 'approve-done' || row.inline === 'approve-more-time') setAnswering(row)
  }

  return { act, approve, sendBack, answering, closeAnswer: () => setAnswering(null), busy, go }
}
