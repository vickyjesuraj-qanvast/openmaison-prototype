'use client'

import { useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { useCopy } from '@/components/om/use-copy'
import { useSnackbar } from '@/components/om/snackbar'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { isSgPhone, phoneDigits } from '@/lib/format'
import { recordComparisonSent } from '@/app/quote-x-ray/actions'
import styles from './send-dialog.module.css'

/**
 * Quote X-Ray › Send to client (REG-529; the 1.0 dialog on the Dialog shell): the WhatsApp draft, editable, with Reset to
 * draft and the count under it; Copy, and Open WhatsApp — the lead's number when there is one — in the footer. The m 600.
 * (REG-640, parity Q-16) What went out is kept: Copy and Open WhatsApp stamp the reading with the text as it stood, the dialog
 * opens on that text next time (Reset to draft brings the screen's draft back), and the lead's Activity says so. WhatsApp
 * opens the lead's chat only when the lead's number is a valid SG number (REG-547), else WhatsApp's own picker.
 */
export function SendDialog({ open, onClose, comparisonId, draft, sent, phone, onSent }: {
  open: boolean; onClose: () => void; comparisonId: string; draft: string
  sent: { at: number; text: string } | null; phone: string | null; onSent: () => void
}) {
  const snackbar = useSnackbar()
  const [text, setText] = useState(sent?.text || draft)
  /* (sweep S3) what the dialog opened on — closing with the message changed asks before the edits go */
  const [start, setStart] = useState(sent?.text || draft)
  const [asking, setAsking] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setText(sent?.text || draft); setStart(sent?.text || draft); setAsking(false) } }
  const { copied, copy } = useCopy(text, { done: 'Message copied', failed: 'Couldn’t copy the message — please try again' })
  const digits = phoneDigits(phone).slice(-8)
  const wa = `https://wa.me/${isSgPhone(digits) ? `65${digits}` : ''}?text=${encodeURIComponent(text)}`
  /* (sweep S3) the send is kept only once it happened — a failed copy keeps nothing — and a failed keep says so */
  const keep = (via: 'whatsapp' | 'copy') => { const t = text; void recordComparisonSent(comparisonId, t, via).then(() => { setStart(t); onSent() }, () => snackbar({ message: 'Couldn’t keep what was sent — please try again' })) }
  const tryClose = () => { if (text !== start) setAsking(true); else onClose() }
  return (
    <>
      <Dialog open={open} onClose={tryClose} title="Send to client" size="modal" width={600}
              subtitle="Edit the message so it sounds like you, then copy it into your WhatsApp chat with the client."
              footer={<>
                <Button appearance="outlined" variant="secondary" iconStart={<Icon name="content_copy" size={20} />} onPress={() => { void copy().then((ok) => { if (ok) keep('copy') }) }}>{copied ? 'Copied' : 'Copy'}</Button>
                <Button iconStart={<Icon name="chat" size={20} />} onPress={() => { window.open(wa, '_blank', 'noopener'); keep('whatsapp'); onClose() }}>Open WhatsApp</Button>
              </>}>
        <div className={styles.box}>
          <TextArea aria-label="Message to the client" value={text} onChange={(v: string) => setText(v)} />
        </div>
        <div className={styles.under}>
          <Button appearance="text" iconStart={<Icon name="restart_alt" size={18} />} onPress={() => setText(draft)} isDisabled={text === draft}>Reset to draft</Button>
          <span className={styles.count}>{text.length} characters</span>
        </div>
      </Dialog>
      <ConfirmDialog open={asking} nested title="Discard your changes?" message="The message goes back to what it was when you opened it." confirmLabel="Discard" cancelLabel="Keep editing"
                     onCancel={() => setAsking(false)} onConfirm={() => { setAsking(false); onClose() }} />
    </>
  )
}
