'use client'

import { useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { useCopy } from '@/components/om/use-copy'
import { Dialog } from '@/components/leads/move-stage/dialogs'
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
 */
/** The mock's placeholder portal URL (931:46937) — no portal exists in the prototype. */
export const PORTAL_LINK = 'http://openmaison.ai/my/portalexample/login'

export function AskClientDialog({ open, leadName, onClose, onSend, questions }: {
  open: boolean
  leadName: string
  onClose: () => void
  /** The ticked question ids when the dialog lists them; nothing when it was opened without a list (the Overview's quick ask). */
  onSend: (questionIds?: string[]) => void
  /** (T12) The questions still unanswered — what the ask will cover. */
  questions?: { id: string; text: string }[]
}) {
  // Copy confirms in the button as well as the snackbar (REG-283); the hook owns the state and its reset.
  const { copied, copy } = useCopy(PORTAL_LINK, { resetOn: open })   // resetOn: both hosts stay mounted while closed
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(questions?.map((q) => q.id)))
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setTicked(new Set(questions?.map((q) => q.id))) }   // every opening starts with them all ticked
  const toggle = (id: string, on: boolean) => setTicked((t) => { const n = new Set(t); if (on) n.add(id); else n.delete(id); return n })
  const listed = questions ?? null
  const picked = listed ? listed.filter((q) => ticked.has(q.id)).map((q) => q.id) : undefined
  return (
    <div className={styles.host}>
      <Dialog
        open={open} onClose={onClose} title="Ask the client" width={400} size="modal"
        footer={<>
          <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
          <Button onPress={() => onSend(picked)} isDisabled={!!listed && !picked?.length}>Send via WhatsApp</Button>   {/* REG-288 (owner): was "Send Notification" */}
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
            <span className={styles.portalLabel}>Portal link</span>
            <span className={styles.portalUrl} title={PORTAL_LINK}>{PORTAL_LINK}</span>
          </div>
          <Button variant="primary" appearance="outlined" onPress={copy}>{copied ? 'Copied' : 'Copy'}</Button>
        </div>
      </Dialog>
    </div>
  )
}
