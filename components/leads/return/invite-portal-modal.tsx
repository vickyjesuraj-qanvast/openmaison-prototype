'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useComingSoon } from '@/components/om/snackbar'
import { useCopy } from '@/components/om/use-copy'
import { Dialog } from '@/components/leads/move-stage/dialogs'
import { PORTAL_LINK } from '@/components/leads/questionnaire/ask-client-dialog'
import { MSG } from '@/lib/forms'
import { digitsOnly, isSgPhone, phoneTyped } from '@/lib/format'
import styles from './invite-portal-modal.module.css'

/**
 * Invite to Portal — ModalComponent 400×585 r12 (frame 179, 931:48844; spec design-source/context/lead-return/
 * 01-wizard-details.txt "Invite to Portal"; build plan 00-build-plan.md). Every lead's kebab offers it (user 2026-08-30).
 * Shell = the shared `Dialog` at `size="modal"` (move-stage/dialogs.tsx: 64 head "Invite to Portal" 20/Bold + close,
 * body V g24 p24, footer 68 Cancel · "Send via WhatsApp"). Body: helper 14/Semi Bold · TextField "Homeowner name"
 * (prefilled) · TextField "Phone number" with the "+65 ▾" prefix + 1×20 rule + digits (the lead form's PhoneField,
 * lead-form.tsx; the chevron → coming soon) and the 12 secondary helper · rule · "Show chat history" box 352×74 with the
 * DS Switch 40×20 (sm) on by default · "Portal link" box 352×58 + Copy (the Questionnaire's Ask-the-client box:
 * clipboard + "Link copied"). Send → `onSend(phone, showHistory)`; the caller opens WhatsApp.
 */
export function InvitePortalModal({ open, lead, onClose, onSend }: {
  open: boolean
  lead: { name: string; phone: string }
  onClose: () => void
  onSend: (phone: string, showHistory: boolean) => void
}) {
  const comingSoon = useComingSoon()
  const [name, setName] = useState(lead.name)
  const [phone, setPhone] = useState(() => digitsOnly(lead.phone).slice(0, 8))
  const [showHistory, setShowHistory] = useState(true)
  const [pressed, setPressed] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)

  // Render-phase adjust: every opening starts from the lead's details with the switch On and no errors.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setName(lead.name); setPhone(digitsOnly(lead.phone).slice(0, 8)); setShowHistory(true); setPressed(false) }
  }

  // The mock shows a filled 8-digit number; the spec sets no rule, so the lead form's phone rule applies (MSG.phone,
  // shown after the first press like the wizard).
  const phoneError = isSgPhone(phone) ? undefined : MSG.phone   // (REG-547)
  const send = () => {
    if (phoneError) { setPressed(true); return }
    onSend(phone, showHistory)
  }
  // Copy confirms in the button as well as the snackbar (REG-283) — the Ask-the-client box's own hook.
  const { copied, copy } = useCopy(PORTAL_LINK, { resetOn: open })   // resetOn: both hosts stay mounted while closed

  return (
    <Dialog
      open={open} onClose={onClose} title="Invite to Portal" width={400} size="modal"
      footer={<>
        <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
        <Button onPress={send}>Send via WhatsApp</Button>
      </>}
    >
      <div className={styles.body} data-testid="invite-portal">
        <p className={styles.helper}>Invite a homeowner to track their project.</p>
        <TextField label="Homeowner name" value={name} onChange={setName} />
        <TextField
          label="Phone number" required value={phoneTyped(phone)} onChange={(v) => setPhone(v.slice(0, 8))}   /* (REG-456) shown "9123 4567", held as digits; no maxLength — the space is the 9th character */
          type="tel" inputMode="tel" numeric="digits" trailingIcon={null}
          error={pressed ? phoneError : undefined}
          helper="WhatsApp opens with a ready-to-send message containing their portal login link."
          leading={
            <span className={styles.prefix}>
              {/* "+65 ▾" is static in the mock — the country picker is not built (tooltip copy invented). */}
              <Tooltip label="Country code">
                <button type="button" className={styles.country} aria-label="Country code +65" onClick={comingSoon}>
                  +65<Icon name="keyboard_arrow_down" size={20} />
                </button>
              </Tooltip>
              <span className={styles.divider} />
            </span>
          }
        />
        <div className={styles.rule} />
        <div className={styles.box} data-testid="show-chat-history">
          <div className={styles.boxText}>
            <span className={styles.boxLabel}>Show chat history</span>
            <span className={styles.boxSub}>Homeowner can see messages from before they joined</span>
          </div>
          <Switch size="sm" isSelected={showHistory} onChange={setShowHistory} aria-label="Show chat history" />
        </div>
        <div className={styles.box} data-testid="portal-link">
          <div className={styles.boxText}>
            <span className={styles.boxLabel}>Portal link</span>
            <span className={styles.boxUrl} title={PORTAL_LINK}>{PORTAL_LINK}</span>
          </div>
          <Button variant="primary" appearance="outlined" onPress={copy}>{copied ? 'Copied' : 'Copy'}</Button>
        </div>
      </div>
    </Dialog>
  )
}
