'use client'

import { useRef, useState } from 'react'
import { Button, Switch, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { DateField } from '@/components/om/date-field'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useCopy } from '@/components/om/use-copy'
import { Dropdown } from '@/components/leads/dropdown'
import { Dropzone, FileTile, useUploadSim } from '@/components/leads/move-stage/fields'
import { digitsOnly, inputDate, parseInputDate, phoneTyped } from '@/lib/format'
import styles from './contract-editor.module.css'

/* The contract editor's dialogs (REG-534): Send for digital signature (1.0's WhatsApp link, on our m 600 Dialog) · Mark as
   signed · Edit recipient · Save as template — and the Automation popover. */

/** Send: the signing card's fields (client name · phone for the code) over the message the link travels in. Send via
 *  WhatsApp opens the chat with the message and marks the contract Sent to Client; Copy link copies the signing page. */
export function SendContractDialog({ open, onClose, defaults, link, draft, onSend }: {
  open: boolean; onClose: () => void
  defaults: { name: string; phone: string }
  link: string
  draft: (name: string) => string
  onSend: (o: { name: string; phone: string; message: string }) => void | Promise<void>
}) {
  const [name, setName] = useState(defaults.name)
  const [phone, setPhone] = useState(defaults.phone)
  const [text, setText] = useState(() => draft(defaults.name))
  const [touched, setTouched] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setName(defaults.name); setPhone(defaults.phone); setText(draft(defaults.name)); setTouched(false) } }
  const { copied, copy } = useCopy(link, { done: 'Signing link copied' })
  const phoneOk = digitsOnly(phone).length === 8
  const nameOk = name.trim().length > 0
  const err = touched && !phoneOk ? 'Enter the 8-digit mobile number' : undefined
  return (
    <Dialog open={open} onClose={onClose} title="Send for digital signature" size="modal" width={600}
            subtitle="Your client reviews and signs in their browser. A one-time code on their phone confirms it’s them."
            footer={<>
              <Button appearance="outlined" variant="secondary" iconStart={<Icon name="content_copy" size={20} />} onPress={() => { void copy() }}>{copied ? 'Copied' : 'Copy link'}</Button>
              <Button iconStart={<Icon name="chat" size={20} />} isDisabled={!nameOk} onPress={() => { setTouched(true); if (!phoneOk || !nameOk) return; void onSend({ name: name.trim(), phone: digitsOnly(phone), message: text }) }}>Send via WhatsApp</Button>
            </>}>
      <div className={styles.sendFields}>
        <TextField label="Client name" required value={name} onChange={(v) => { setName(v); setText((t) => (t === draft(name) ? draft(v) : t)) }} error={touched && !nameOk ? 'Enter the client’s name' : undefined} />
        <div className={styles.phoneRow}>
          <span className={styles.phoneCode}><TextField label="Code" value="+65" mode="select" options={['+65']} disabled /></span>
          <span className={styles.phoneNum}><TextField label="Client phone (for the code)" required type="tel" inputMode="numeric" value={phoneTyped(phone)} onChange={(v) => setPhone(digitsOnly(v).slice(0, 8))} error={err} maxLength={9} /></span>
        </div>
        <div className={styles.sendBox}>
          <TextArea aria-label="Message to the client" value={text} onChange={(v: string) => setText(v)} />
        </div>
        <div className={styles.sendUnder}>
          <Button appearance="text" iconStart={<Icon name="restart_alt" size={18} />} onPress={() => setText(draft(name))} isDisabled={text === draft(name)}>Reset to draft</Button>
          <span>{text.length} characters</span>
        </div>
        <div className={styles.linkRow}><Icon name="link" size={18} /><code>{link}</code></div>
      </div>
    </Dialog>
  )
}

/** Mark as signed: the date it was signed and, optionally, the signed copy (a PDF) — the Contracts tab's Signed Copy column. */
export function MarkSignedDialog({ open, onClose, today, onSave }: { open: boolean; onClose: () => void; today: Date; onSave: (o: { signedOn: number; fileName: string | null }) => void | Promise<void> }) {
  const [date, setDate] = useState(inputDate(today))
  const [file, setFile] = useState<string | null>(null)
  const { uploading, start } = useUploadSim()
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setDate(inputDate(today)); setFile(null) } }
  const d = parseInputDate(date)
  return (
    <Dialog open={open} onClose={onClose} title="Mark as signed" size="form" width={600}
            subtitle="Signed on paper or elsewhere? Record when, and attach the signed copy if you have it."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!d} onPress={() => { if (d) void onSave({ signedOn: d.getTime(), fileName: file }) }}>Mark as signed</Button></>}>
      <div className={styles.signedFields}>
        <DateField label="Signed on" value={date} onChange={setDate} today={today} required />
        {file ? <FileTile name={file} onDelete={() => setFile(null)} /> : (
          <Dropzone variant="compact" title={uploading ? 'Uploading…' : 'Attach the signed copy (optional)'} helper="PDF" accept="application/pdf" uploading={uploading}
                    onPick={(f) => { const name = f?.name ?? 'Signed contract.pdf'; start(() => setFile(name)) }} />
        )}
      </div>
    </Dialog>
  )
}

/** Edit recipient (the reference's Edit Client, cut to what a contract needs): who signs and the number the code goes to. */
export function RecipientDialog({ open, onClose, name, phone, onSave }: { open: boolean; onClose: () => void; name: string; phone: string; onSave: (o: { name: string; phone: string }) => void | Promise<void> }) {
  const [n, setN] = useState(name)
  const [p, setP] = useState(phone)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setN(name); setP(phone) } }
  const ok = n.trim().length > 0 && digitsOnly(p).length === 8
  return (
    <Dialog open={open} onClose={onClose} title="Edit recipient" size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!ok} onPress={() => { void onSave({ name: n.trim(), phone: digitsOnly(p) }) }}>Save</Button></>}>
      <div className={styles.sendFields}>
        <TextField label="Full name" required value={n} onChange={setN} autoFocus />
        <TextField label="Mobile number" required type="tel" inputMode="numeric" value={phoneTyped(p)} onChange={(v) => setP(digitsOnly(v).slice(0, 8))} maxLength={9} helper="+65 · the one-time code is sent here" />
      </div>
    </Dialog>
  )
}

/** Save as template: the document goes to Company › Templates › Contracts under this name. */
export function SaveTemplateDialog({ open, onClose, defaultName, busy, onSave }: { open: boolean; onClose: () => void; defaultName: string; busy?: boolean; onSave: (name: string) => void | Promise<void> }) {
  const [name, setName] = useState(defaultName)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) setName(defaultName) }
  return (
    <Dialog open={open} onClose={onClose} title="Save as template" size="form" width={400}
            subtitle="The document, with its Smart Text chips, joins your contract templates."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!name.trim() || busy} onPress={() => { void onSave(name.trim()) }}>{busy ? 'Saving…' : 'Save template'}</Button></>}>
      <TextField label="Template name" required value={name} onChange={setName} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { e.preventDefault(); void onSave(name.trim()) } }} />
    </Dialog>
  )
}

/** Automation (the reference's ⚡ popover): two switches stored on the contract — reminders, thank-you. Emails are not sent by the prototype. */
export function AutomationPopover({ open, onClose, reminders, thankYou, onChange }: { open: boolean; onClose: () => void; reminders: boolean; thankYou: boolean; onChange: (patch: { reminders?: boolean; thankYou?: boolean }) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <Dropdown open={open} onClose={onClose} align="right" width={340} sheetTitle="Automation">
      <div ref={ref} data-testid="automation">
        <div className={styles.autoHead}>Automation</div>
        <div className={styles.autoRow}>
          <span className={styles.autoText}><span className={styles.autoLabel}>Client reminders</span><span className={styles.autoHelp}>Remind the client on WhatsApp to review the contract</span></span>
          <Switch size="sm" isSelected={reminders} onChange={(v: boolean) => onChange({ reminders: v })} aria-label="Client reminders" />
        </div>
        <div className={styles.autoRow}>
          <span className={styles.autoText}><span className={styles.autoLabel}>Thank-you message</span><span className={styles.autoHelp}>Send a thank-you once the contract is signed</span></span>
          <Switch size="sm" isSelected={thankYou} onChange={(v: boolean) => onChange({ thankYou: v })} aria-label="Thank-you message" />
        </div>
      </div>
    </Dropdown>
  )
}
