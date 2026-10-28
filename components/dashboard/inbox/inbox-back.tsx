'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { NoteDialog } from '@/components/templates/editor/review-bar'
import { NeedAnswerDialogs } from '@/components/projects/overview/answer-dialogs'
import type { NeedRow } from '@/lib/projects/needs-you'
import type { InboxBack } from '@/lib/dashboard/inbox'
import { answerExpense, undoExpenseAnswer } from '@/app/finance/cost-actions'
import { requestQuoteChanges } from '@/app/quotes/actions'
import { sendBackPriceBookItem } from '@/app/company/price-book-actions'

/**
 * (the Dashboard redesigned, 2026-10-26 — P-05 · lane D2) **Send back / Decline from Needs you** — the tabs' OWN dialogs, imported, never
 * copied: an update's, a Done ask's and the ask for more time's are the project Overview's (`NeedAnswerDialogs` — the Updates tab's note dialog,
 * the Schedule panel's `AskDialog`, their sentences and Undo); an expense's, a quote's and a Price book proposal's are the house `NoteDialog`
 * in the words the Money tab, the quote editor and the Price book use (the bell's and To do's sentences). A dialog closes only once its answer
 * lands; a refusal says why and keeps it open. `onDone` tells the inbox the answer landed (the pane moves on).
 */
export function InboxBackDialogs({ back, onClose, onDone }: { back: InboxBack | null; onClose: () => void; onDone: () => void }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [busy, setBusy] = useState(false)
  const project = back && (back.kind === 'update' || back.kind === 'done' || back.kind === 'more-time') ? back : null
  /* the Overview's dialogs read a Needs you row: the inline kind, the record and the ask's words */
  const need: NeedRow | null = project ? {
    key: `back:${project.ref}`, kind: project.kind, group: 'ok', tab: project.kind === 'update' ? 'updates' : 'schedule', tone: 'approve', title: project.title, ref: project.ref,
    action: { label: project.label }, inline: project.kind === 'update' ? 'approve-update' : project.kind === 'done' ? 'approve-done' : 'approve-more-time',
    ask: { who: project.who, title: project.title, ...(project.end !== undefined ? { end: project.end } : {}) },
  } : null
  /* NeedAnswerDialogs calls onClose on a landing and on a cancel alike: the page reads itself again on a landing, and the inbox follows its rows */
  const note = back && (back.kind === 'expense' || back.kind === 'quote' || back.kind === 'price-book') ? back : null
  const send = async (text: string) => {
    if (!note || busy) return
    setBusy(true)
    try {
      if (note.kind === 'expense') {
        const r = await answerExpense(note.ref, { approve: false, note: text })
        if ('error' in r) { snackbar({ message: couldnt('send it back', refusalOf(r.error)) }); return }
        snackbar({ message: `${note.title} sent back with your note`, actionLabel: 'Undo', onAction: () => { void undoExpenseAnswer(r.undo).then((y) => { snackbar({ message: 'error' in y ? couldnt('undo it', refusalOf(y.error)) : 'It waits for approval again' }); router.refresh() }) } })
      } else if (note.kind === 'quote') {
        const r = await requestQuoteChanges(note.ref, text)
        if ('error' in r) { snackbar({ message: couldnt('send the quote back', refusalOf(r.error)) }); return }
        snackbar({ message: `Sent back to ${note.who ?? 'the sender'} with your note` })
      } else {
        const r = await sendBackPriceBookItem(note.ref, text)
        if (r && 'error' in r) { snackbar({ message: couldnt('send the item back', refusalOf(r.error)) }); return }
        snackbar({ message: `${note.title} sent back to ${note.who ?? 'its proposer'}` })
      }
      onDone()
      router.refresh()
    } catch (e) {
      snackbar({ message: couldnt(note.kind === 'quote' ? 'send the quote back' : note.kind === 'expense' ? 'send it back' : 'send the item back', refusalOf(e)) })
    } finally { setBusy(false) }
  }
  const help = !note ? '' : note.kind === 'quote' ? `Goes back to ${note.who ?? 'whoever sent it'} at the top of the quote; the quote returns to Draft.`
    : note.kind === 'price-book' ? `Goes to ${note.who ?? 'whoever proposed it'} in the bell. The item leaves My Items; lines already on their quotes keep their figures.`
    : `${note.who ?? 'Whoever logged it'} reads your note and can change it — it waits for approval again.`
  return (
    <>
      <NeedAnswerDialogs row={need} clientFirst={project?.client ?? ''} onClose={onClose} />
      <NoteDialog open={!!note} title={note?.kind === 'quote' ? 'Request changes' : 'Send back'} label="What should change?" help={help} action="Send back" busy={busy} required maxLength={300}
                  onClose={onClose} onSubmit={(t) => { void send(t) }} />
    </>
  )
}
