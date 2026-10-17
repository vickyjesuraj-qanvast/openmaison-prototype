'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { CodeBoxes, emptyCode } from '@/components/om/code-boxes'
import { CODE_LENGTH, RESEND_S, SIGN_IN } from '@/lib/auth/model'
import portal from '@/components/portal/portal.module.css'
import styles from './your-profile.module.css'

/**
 * (pending modules S30 — S01's note: "a phone change sends no confirmation code until sign-in exists") Your profile's save, when it adds the
 * number (or the email) you sign in with: the code sent to it, typed here, before it saves — a typo would otherwise lock you out. The house
 * dialog with the house code boxes; Confirm and save is the one filled button; the stand-in says plainly that no message is sent.
 */
export function ConfirmContactDialog({ sent, demo, onClose, onConfirm, onResend }: {
  /** the send: where the code went ("the number ending 2222" · "dane.lim@demostudio.sg"), what it is, when — null = closed */
  sent: { to: string; kind: 'phone' | 'email'; at: number } | null
  demo: boolean
  onClose: () => void
  /** saves with the code; answers the refusal to show in the dialog, else null (it saved — the host closes the dialog) */
  onConfirm: (code: string) => Promise<string | null>
  /** sends a new code — the host answers with a new `sent` */
  onResend: () => Promise<void>
}) {
  const open = !!sent
  const at = sent?.at ?? 0
  const [code, setCode] = useState<string[]>(() => emptyCode(CODE_LENGTH))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [left, setLeft] = useState(RESEND_S)
  const first = useRef<HTMLInputElement | null>(null)
  /* a fresh code for each send (render-phase adjust on the send's time) */
  const [seenAt, setSeenAt] = useState(at)
  if (seenAt !== at) { setSeenAt(at); setCode(emptyCode(CODE_LENGTH)); setError(null); setLeft(RESEND_S) }
  useEffect(() => {
    if (!open || !at) return
    const tick = () => setLeft(Math.max(0, RESEND_S - Math.floor((Date.now() - at) / 1000)))
    const t = window.setInterval(tick, 1000)
    return () => window.clearInterval(t)
  }, [open, at])
  useEffect(() => { if (open) { const t = window.setTimeout(() => first.current?.focus(), 60); return () => window.clearTimeout(t) } }, [open])
  const confirm = async () => {
    if (busy) return
    const value = code.join('')
    if (value.length !== CODE_LENGTH) { setError(SIGN_IN.codeShort); return }
    setBusy(true)
    const refused = await onConfirm(value)
    setBusy(false)
    if (refused) setError(refused)
  }
  const resend = async () => { if (busy) return; setBusy(true); await onResend(); setBusy(false) }
  const what = sent?.kind === 'email' ? 'email' : 'number'
  const to = sent?.to ?? ''
  return (
    <Dialog open={open} onClose={onClose} title={`Confirm your new ${what}`} size="form" width={400} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { void confirm() }} isDisabled={busy} data-testid="confirm-contact-save">{busy ? 'Saving…' : 'Confirm and save'}</Button></>}>
      <form className={styles.confirmBody} onSubmit={(e) => { e.preventDefault(); void confirm() }} noValidate data-testid="confirm-contact">
        <p className={portal.line} data-testid="confirm-contact-sent">{`We sent a 6-digit code to ${to}. Enter it to save — you’ll sign in with this ${what} from now on.`}</p>
        <CodeBoxes value={code} onChange={(c) => { setCode(c); setError(null) }} onEnter={() => void confirm()} invalid={!!error} testId="confirm-contact-digit" firstRef={first} />
        {error ? <p className={portal.error} role="alert" data-testid="confirm-contact-error">{error}</p> : null}
        <p className={portal.line}>
          {left > 0 ? `No code yet? You can ask for a new one in ${left} ${left === 1 ? 'second' : 'seconds'}.`
            : <>No code yet? <button type="button" className={portal.link} onClick={() => void resend()} disabled={busy}>Send a new code</button></>}
        </p>
        {demo ? <p className={styles.confirmFine} data-testid="confirm-contact-demo">{SIGN_IN.demoJoin}</p> : null}
      </form>
    </Dialog>
  )
}
