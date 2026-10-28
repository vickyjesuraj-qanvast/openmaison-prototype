'use client'

import { useEffect, useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { useCopy } from '@/components/om/use-copy'
import { Dialog } from '@/components/leads/move-stage/dialogs'
import { useOrigin } from '@/components/portal/client-access-panel'
import { readAskTarget } from '@/app/leads/questions-actions'
import { waLink } from '@/lib/portal/model'
import type { AskTarget } from '@/lib/portal/ask'
import styles from './ask-client-dialog.module.css'

/**
 * Lead Details › Questionnaire › "Ask the client" (frame 177, 931:46853 — ModalComponent 931:46937, 400×302 r12;
 * spec design-source/context/lead-questionnaire/01-listing-empty-dialog.txt "Ask the client"):
 * the 64px modal heading ("Ask the client" 20/Bold + close 24, bottom rule) = the shared `Dialog` at `size="modal"`
 * (move-stage/dialogs.tsx — the Notes tab's Auto Fill / Add tasks shell, 779:26016), body V g24 p24:
 * helper 14/Semi Bold ink (352 wide, 2 lines) · portal box 352×58 ("Portal link" 14/Semi Bold + the link 12/Regular
 * secondary ellipsis + "Copy" primary outlined 68×36); footer 68 (p16/24, top rule + the modal footer shadow, added from
 * the .host wrapper — the shell draws only the rule): "Cancel" secondary outlined · "Send via WhatsApp" primary filled (REG-288; the mock types "Send Notification").
 * Copy → clipboard + snackbar "Link copied" (REG-188); "Send via WhatsApp" → `onSend` (REG-288; the caller
 * shows the sent confirmation).
 * The same dialog opens from the Overview QUESTIONNAIRE card's "Ask Client" link and from the tab's toolbar button.
 * (UX audit 2026-09-30, T12 — extends REG-246) Given `questions` (the unanswered ones), the dialog says what it will ask: each with a tick,
 * all ticked on open; Send goes with the ticked ones (`onSend(ids)`) and waits while none is ticked. "Questions to ask" is invented copy.
 * (parity map, CP-110 — the bug: Copy gave the mock's placeholder, WhatsApp opened nothing) The box holds the studio's real address (the
 * client's questions page on their portal), Send via WhatsApp opens wa.me on the press with a drafted line to the client's mobile, then the
 * host records the ask (which tells the client: their portal's bell, `client_questions`); a send the rules refuse says why in the dialog.
 */
/* (pending modules S02) The mock's placeholder portal URL (931:46937) went with the unmounted Invite to Portal modal, its last reader — every
   link the studio sends is the studio's real address (CP-110). */

type Target = AskTarget & { block: string | null }

/** (parity map, CP-110) The snackbar after a send, for whichever page hosts the dialog: "Asked Benjamin Han — 3 questions are on their page". */
export const askedLine = (client: string, count: number, o: { invited?: boolean } = {}) =>
  `Asked ${client} — ${count === 1 ? 'the question is' : `${count} questions are`} on their page${o.invited ? ', and they’re invited to your portal' : ''}`

export function AskClientDialog({ open, leadName, onClose, onSend, questions, leadId }: {
  open: boolean
  leadName: string
  onClose: () => void
  /** The ticked question ids when the dialog lists them; nothing when it was opened without a list (the Overview's quick ask). */
  onSend: (questionIds?: string[]) => void
  /** (T12) The questions still unanswered — what the ask will cover. */
  questions?: { id: string; text: string }[]
  /** (parity map, CP-110) The lead asked — optional: without it the dialog finds the lead from its questions. */
  leadId?: string
}) {
  const origin = useOrigin()
  /* (parity map, CP-110) whom it asks and where they answer — read each time it opens: the studio's real address (their questions page, or the
     portal's address before their home exists there), their mobile for WhatsApp, and why a send can't go now (the rule, said in the dialog) */
  const [target, setTarget] = useState<Target | null>(null)
  const [readError, setReadError] = useState<string | null>(null)
  const ids = questions?.map((q) => q.id).join(',') ?? ''
  useEffect(() => {
    if (!open) return
    let live = true
    readAskTarget({ leadId: leadId ?? null, questionIds: ids ? ids.split(',') : [] }).then(
      (r) => { if (!live) return; if ('error' in r) { setTarget(null); setReadError(r.error) } else { setTarget(r); setReadError(null) } },
      () => { if (live) { setTarget(null); setReadError('Couldn’t read the client’s portal — please try again') } },
    )
    return () => { live = false }
  }, [open, leadId, ids])
  const url = target ? `${origin ?? ''}${target.address}` : ''
  // Copy confirms in the button as well as the snackbar (REG-283); the hook owns the state and its reset.
  const { copied, copy } = useCopy(url, { resetOn: open })   // resetOn: both hosts stay mounted while closed
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(questions?.map((q) => q.id)))
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setTicked(new Set(questions?.map((q) => q.id))) }   // every opening starts with them all ticked
  const toggle = (id: string, on: boolean) => setTicked((t) => { const n = new Set(t); if (on) n.add(id); else n.delete(id); return n })
  const listed = questions ?? null
  const picked = listed ? listed.filter((q) => ticked.has(q.id)).map((q) => q.id) : undefined
  const block = target?.block ?? null
  /* WhatsApp opens on the press (a window opened later is a blocked pop-up) with the drafted line — the server's checks were read on open,
     so what opens is what the ask records; then the host records it (onSend) and says so */
  const send = () => {
    if (!target || block) return
    if (target.phone) window.open(waLink(target.phone, `Hi ${target.first}, ${target.studio} has a few questions about your home — you can answer them on your page: ${url}`), '_blank', 'noopener')
    onSend(picked)
  }
  const first = target?.first ?? leadName
  return (
    <div className={styles.host}>
      <Dialog
        open={open} onClose={onClose} title="Ask the client" width={400} size="modal"
        footer={<>
          <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
          <Button onPress={send} isDisabled={(!!listed && !picked?.length) || !target || !!block} data-testid="ask-send">Send on WhatsApp</Button>   {/* REG-288 (owner): was "Send Notification" — (the calm UI build 2026-10-27, B6's request · W-058) one verb for every WhatsApp send */}
        </>}
      >
        <p className={styles.helper}>We’ll notify “{leadName}” in their portal and they can answer your questions there.</p>
        {listed && listed.length ? (
          <div className={styles.questions} data-testid="ask-questions">
            <span className={styles.questionsHead}>{`Questions to ask (${picked?.length ?? 0} of ${listed.length})`}</span>
            <div className={styles.questionList} role="group" aria-label="Questions to ask">
              {listed.map((q) => (
                <Checkbox key={q.id} isSelected={ticked.has(q.id)} onChange={(on: boolean) => toggle(q.id, on)} className={styles.question}>{q.text}</Checkbox>
              ))}
            </div>
          </div>
        ) : null}
        <div className={styles.portal} data-testid="portal-link">
          <div className={styles.portalText}>
            <span className={styles.portalLabel}>{target?.address.includes('/questions/') ? `${first}’s questions page` : 'Portal link'}</span>
            <span className={styles.portalUrl} title={url || undefined} data-testid="ask-link">{url ? url.replace(/^https?:\/\//, '') : '…'}</span>
          </div>
          <Button variant="primary" appearance="outlined" onPress={copy} isDisabled={!url}>{copied ? 'Copied' : 'Copy'}</Button>
        </div>
        {/* (parity map, CP-110) what the send will do beyond the ask, or why it can't go — the rule in the dialog, never a silent grey button */}
        {block ? <p className={styles.note} role="note" data-testid="ask-block">{block}</p>
          : readError ? <p className={styles.note} role="note" data-testid="ask-block">{readError}</p>
          : target?.state === 'invite' ? <p className={styles.note} data-testid="ask-invites">{`This also invites ${target.first} to your portal — they sign in with their phone number.`}</p>
          : null}
        {target?.stopped && !block ? <p className={styles.note} data-testid="ask-stopped">{target.stopped === 'closed' ? `OpenMaison has closed your portal for now — ${target.first} sees a notice until it’s open again.` : `Your portal is paused — ${target.first} sees a notice until it’s live again.`}</p> : null}
        {target && !target.phone && !block ? <p className={styles.note} data-testid="ask-no-phone">{`${target.first} has no mobile number on the lead — copy the link and send it your own way.`}</p> : null}
      </Dialog>
    </div>
  )
}
