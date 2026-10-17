'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { UpdateSendBackDialog } from '@/components/projects/updates/update-send-back'
import { AskDialog } from '@/components/projects/schedule/milestone-panel'
import { sendBackProjectUpdate } from '@/app/projects/updates-actions'
import { answerMoreTime, sendBackMilestoneDone, undoMilestoneStatus, undoMoreTimeAnswer } from '@/app/projects/schedule-actions'
import { dayLabel } from '@/lib/projects/schedule-model'
import type { NeedRow } from '@/lib/projects/needs-you'

/**
 * (simplify round 2, S-20 · P2 §6.7 — the owner's "fix all the pending things" 2026-10-09) **Send back / Decline in place** on the Overview's
 * Needs your OK rows: the tabs' OWN dialogs, imported, never copied — an update's is the Updates tab's note dialog (`UpdateSendBackDialog`), a
 * Done ask's and the ask for more time's are the Schedule panel's `AskDialog` with its words — and each answers with the tab's sentence and
 * Undo (an update's send back has none on the tab either). A dialog closes only once its answer lands; a refusal says why and keeps it open.
 */
export function NeedAnswerDialogs({ row, clientFirst, onClose }: { row: NeedRow | null; clientFirst: string; onClose: () => void }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [busy, setBusy] = useState(false)
  const id = row?.ref ?? null
  const title = row?.ask?.title ?? ''
  const who = row?.ask?.who ?? null

  /* an update: the Updates tab's Send back — its help, its sentence */
  const update = row?.inline === 'approve-update' && id ? { id, by: who } : null
  const sendUpdate = (uid: string, note: string, sentence: string) => {
    if (busy) return
    setBusy(true)
    void run('send the update back', () => sendBackProjectUpdate(uid, { note }), sentence, { refresh: true }).then((ok) => { setBusy(false); if (ok) onClose() })
  }

  /* a Done ask: the Schedule's Send back — it stays as it is, not done; whoever marked it done reads the note (Undo, as the tab) */
  const sendDone = async (note: string): Promise<boolean> => {
    if (!id) return false
    try {
      const r = await sendBackMilestoneDone(id, { note })
      if ('error' in r) { snackbar({ message: couldnt(`send ${title} back`, refusalOf(r.error)) }); return false }
      snackbar({ message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo the send-back', () => undoMilestoneStatus(r.undo), undefined, { refresh: true }) } })
      router.refresh()
      return true
    } catch { snackbar({ message: couldnt(`send ${title} back`) }); return false }
  }

  /* more time: the Schedule's Decline — it keeps its day; whoever asked reads the note (Undo, as the tab) */
  const decline = async (note: string): Promise<boolean> => {
    if (!id) return false
    try {
      const r = await answerMoreTime(id, { approve: false, note, draftUpdate: false })
      if ('error' in r) { snackbar({ message: couldnt('decline more time', refusalOf(r.error)) }); return false }
      snackbar({ key: 'schedule-move', message: r.sentence, actionLabel: 'Undo', onAction: () => { void run('undo the answer', () => undoMoreTimeAnswer(r.undo), 'The ask waits again', { refresh: true }) } })
      router.refresh()
      return true
    } catch { snackbar({ message: couldnt('answer the ask') }); return false }
  }

  return (
    <>
      <UpdateSendBackDialog target={update} clientFirst={clientFirst} busy={busy} onClose={onClose} onSend={sendUpdate} />
      <AskDialog open={row?.inline === 'approve-done'} title={`Send ${title} back?`} action="Send back" onClose={onClose} testId="send-back-dialog"
                 lede="It stays as it is, not done. Whoever marked it done reads your note." note={{ label: 'What is still to do', required: true, max: 300 }}
                 onSubmit={async (v) => sendDone(v.note)} />
      <AskDialog open={row?.inline === 'approve-more-time'} title={`Decline more time on ${title}?`} action="Decline" onClose={onClose} testId="decline-more-dialog"
                 lede={row?.ask?.end !== undefined ? `It keeps ending ${dayLabel(row.ask.end)}.${who ? ` ${who.split(' ')[0]} reads your note.` : ''}` : ''}
                 note={{ label: 'A note (optional)', required: false, max: 300 }}
                 onSubmit={async (v) => decline(v.note)} />
    </>
  )
}
