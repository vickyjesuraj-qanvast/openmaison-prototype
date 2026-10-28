'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { useCopy } from '@/components/om/use-copy'
import { useSnackbar } from '@/components/om/snackbar'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { MSG } from '@/lib/forms'
import { digitsOnly, isSgPhone, phoneDigits } from '@/lib/format'
import { recordComparisonSent } from '@/app/quote-x-ray/actions'
import { MessageField, RecipientFields, SendFields } from '@/components/contracts/editor/dialogs'

/**
 * Quote X-Ray › Send to client (REG-529; the 1.0 dialog on the Dialog shell): the WhatsApp draft, editable, with its reset and the count
 * under it; Copy and the WhatsApp send in the footer. The m 600.
 * (REG-640, parity Q-16) What went out is kept: Copy and the send stamp the reading with the text as it stood, the dialog opens on that
 * text next time (Reset message brings the screen's draft back), and the lead's Activity says so.
 * (UX audit 2026-09-30, C12) One WhatsApp dialog, one behaviour: the contract's Send dialog's recipient — the client's name over the +65
 * number, the lead's to start — so Send on WhatsApp (the calm UI build 2026-10-27, W-058: one verb for the WhatsApp send) opens that client's chat (a valid SG number, REG-547, as the contract's send needs);
 * the greeting follows the name while the message is the draft; the subtitle says what the button does; after the send the host's
 * snackbar offers "Add a follow-up".
 */
export function SendDialog({ open, onClose, comparisonId, draft, sent, defaults, onSent }: {
  open: boolean; onClose: () => void; comparisonId: string
  /** The screen's draft, greeting this name. */
  draft: (name: string) => string
  sent: { at: number; text: string } | null
  /** The lead's client and number, when the reading has a lead. */
  defaults: { name: string; phone: string | null }
  /** `via` what it went; `name` who it went to. */
  onSent: (o: { via: 'whatsapp' | 'copy'; name: string }) => void
}) {
  const snackbar = useSnackbar()
  const phone0 = phoneDigits(defaults.phone).slice(-8)
  const [name, setName] = useState(defaults.name)
  const [phone, setPhone] = useState(phone0)
  const [text, setText] = useState(sent?.text || draft(defaults.name))
  const [touched, setTouched] = useState(false)
  /* (sweep S3) what the dialog opened on — closing with the message changed asks before the edits go */
  const [start, setStart] = useState(sent?.text || draft(defaults.name))
  const [asking, setAsking] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { const t = sent?.text || draft(defaults.name); setName(defaults.name); setPhone(phone0); setText(t); setStart(t); setTouched(false); setAsking(false) }
  }
  const { copied, copy } = useCopy(text, { done: 'Message copied', failed: 'Couldn’t copy the message — please try again' })
  const phoneOk = isSgPhone(digitsOnly(phone))
  const nameOk = name.trim().length > 0
  /* (sweep S3) the send is kept only once it happened — a failed copy keeps nothing — and a failed keep says so */
  const keep = (via: 'whatsapp' | 'copy') => { const t = text, who = name.trim(); void recordComparisonSent(comparisonId, t, via).then(() => { setStart(t); onSent({ via, name: who }) }, () => snackbar({ message: 'Couldn’t keep what was sent — please try again' })) }
  const send = () => {
    setTouched(true)
    if (!nameOk || !phoneOk) return
    window.open(`https://wa.me/65${digitsOnly(phone)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')   // on the press, before the round trip
    keep('whatsapp'); onClose()
  }
  const tryClose = () => { if (text !== start) setAsking(true); else onClose() }
  return (
    <>
      <Dialog open={open} onClose={tryClose} title="Send to client" size="modal" width={600}
              subtitle="Check who it goes to and edit the message so it sounds like you. Send on WhatsApp opens your chat with them, the message ready to send."
              footer={<>
                <Button appearance="outlined" variant="secondary" iconStart={<Icon name="content_copy" size={20} />} onPress={() => { void copy().then((ok) => { if (ok) keep('copy') }) }}>{copied ? 'Copied' : 'Copy message'}</Button>
                <Button iconStart={<Icon name="chat" size={20} />} isDisabled={!nameOk} onPress={send}>Send on WhatsApp</Button>
              </>}>
        <SendFields>
          <RecipientFields name={name} phone={phone} phoneLabel="Client phone" onName={(v) => { setName(v); setText((t) => (t === draft(name) ? draft(v) : t)) }} onPhone={setPhone}
                           nameError={touched && !nameOk ? 'Enter the client’s name' : undefined} phoneError={touched && !phoneOk ? MSG.phone : undefined} />
          <MessageField value={text} onChange={setText} onReset={() => setText(draft(name))} canReset={text !== draft(name)} names={[name]} />
        </SendFields>
      </Dialog>
      <ConfirmDialog open={asking} nested title="Discard your changes?" message="The message goes back to what it was when you opened it." confirmLabel="Discard" cancelLabel="Keep editing"
                     onCancel={() => setAsking(false)} onConfirm={() => { setAsking(false); onClose() }} />
    </>
  )
}
