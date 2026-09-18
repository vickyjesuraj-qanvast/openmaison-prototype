'use client'

import { useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { useCopy } from '@/components/om/use-copy'
import styles from './send-dialog.module.css'

/**
 * Quote X-Ray › Send to client (REG-529; the 1.0 dialog on the Dialog shell): the WhatsApp draft, editable, with Reset to
 * draft and the count under it; Copy, and Open WhatsApp — the lead's number when there is one — in the footer. The m 600.
 */
export function SendDialog({ open, onClose, draft, phone }: { open: boolean; onClose: () => void; draft: string; phone: string | null }) {
  const [text, setText] = useState(draft)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setText(draft) }
  const { copied, copy } = useCopy(text, { done: 'Message copied', failed: 'Couldn’t copy the message — please try again' })
  const wa = `https://wa.me/${phone ? `65${phone.replace(/\D/g, '')}` : ''}?text=${encodeURIComponent(text)}`
  return (
    <Dialog open={open} onClose={onClose} title="Send to client" size="modal" width={600}
            subtitle="Edit the message so it sounds like you, then copy it into your WhatsApp chat with the client."
            footer={<>
              <Button appearance="outlined" variant="secondary" iconStart={<Icon name="content_copy" size={20} />} onPress={() => { void copy() }}>{copied ? 'Copied' : 'Copy'}</Button>
              <Button iconStart={<Icon name="chat" size={20} />} onPress={() => { window.open(wa, '_blank', 'noopener'); onClose() }}>Open WhatsApp</Button>
            </>}>
      <div className={styles.box}>
        <TextArea aria-label="Message to the client" value={text} onChange={(v: string) => setText(v)} />
      </div>
      <div className={styles.under}>
        <Button appearance="text" iconStart={<Icon name="restart_alt" size={18} />} onPress={() => setText(draft)} isDisabled={text === draft}>Reset to draft</Button>
        <span className={styles.count}>{text.length} characters</span>
      </div>
    </Dialog>
  )
}
