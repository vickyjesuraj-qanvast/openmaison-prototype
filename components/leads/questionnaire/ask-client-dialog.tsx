'use client'

import { Button } from '@/components/ds'
import { useSnackbar } from '@/components/om/snackbar'
import { Dialog } from '@/components/leads/move-stage/dialogs'
import styles from './ask-client-dialog.module.css'

/**
 * Lead Details › Questionnaire › "Ask the client" (frame 177, 931:46853 — ModalComponent 931:46937, 400×302 r12;
 * spec design-source/context/lead-questionnaire/01-listing-empty-dialog.txt "Ask the client"):
 * the 64px modal heading ("Ask the client" 20/Bold + close 24, bottom rule) = the shared `Dialog` at `size="modal"`
 * (move-stage/dialogs.tsx — the Notes tab's Auto Fill / Add tasks shell, 779:26016), body V g24 p24:
 * helper 14/Semi Bold ink (352 wide, 2 lines) · portal box 352×58 ("Portal link" 14/Semi Bold + the link 12/Regular
 * secondary ellipsis + "Copy" primary outlined 68×36); footer 68 (p16/24, top rule + the modal footer shadow, added from
 * the .host wrapper — the shell draws only the rule): "Cancel" secondary outlined · "Send Notification" primary filled.
 * Copy → clipboard + snackbar "Link copied" (REG-188); Send → `onSend` (the caller shows "Notification sent to <lead>").
 * The same dialog opens from the Overview QUESTIONNAIRE card's "Ask Client" link and from the tab's toolbar button.
 */
/** The mock's placeholder portal URL (931:46937) — no portal exists in the prototype. */
export const PORTAL_LINK = 'http://openmaison.ai/my/portalexample/login'

export function AskClientDialog({ open, leadName, onClose, onSend }: {
  open: boolean
  leadName: string
  onClose: () => void
  onSend: () => void
}) {
  const snackbar = useSnackbar()
  const copy = () => {
    // The Quotes / Contracts row menus' "Copy link" (lead-quotes.tsx) — same call, same two outcomes.
    void navigator.clipboard?.writeText(PORTAL_LINK).then(
      () => snackbar({ message: 'Link copied' }),
      () => snackbar({ message: 'Couldn’t copy the link — please try again' }),
    )
  }
  return (
    <div className={styles.host}>
      <Dialog
        open={open} onClose={onClose} title="Ask the client" width={400} size="modal"
        footer={<>
          <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
          <Button onPress={onSend}>Send Notification</Button>
        </>}
      >
        <p className={styles.helper}>We’ll notify “{leadName}” in their portal and they can answer your questions there.</p>
        <div className={styles.portal} data-testid="portal-link">
          <div className={styles.portalText}>
            <span className={styles.portalLabel}>Portal link</span>
            <span className={styles.portalUrl} title={PORTAL_LINK}>{PORTAL_LINK}</span>
          </div>
          <Button variant="primary" appearance="outlined" onPress={copy}>Copy</Button>
        </div>
      </Dialog>
    </div>
  )
}
