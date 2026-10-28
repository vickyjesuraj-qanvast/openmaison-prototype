'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Switch, TextArea } from '@/components/ds'
import { MOBILE } from '@/lib/breakpoint'
import { Dialog } from '@/components/om/dialog'
import { MSG } from '@/lib/forms'
import { copyText } from '@/lib/clipboard'
import { DateField } from '@/components/om/date-field'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useCopy } from '@/components/om/use-copy'
import { useSnackbar } from '@/components/om/snackbar'
import { useSheetLayout } from '@/components/om/sheet'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { Dropdown, MENU_WIDTH } from '@/components/leads/dropdown'
import { Dropzone, FieldError, FileTile, useUploadSim } from '@/components/leads/move-stage/fields'
import { isPdfRefusal, readPickedPdf } from '@/components/contracts/read-pdf'
import type { PickedPdf } from '@/lib/contracts/pdf'
import { WritingHelp } from '@/components/writing/writing-help'
import { htmlToText, textToHtml } from '@/lib/writing/html'
import { digitsOnly, inputDate, isSgPhone, parseInputDate, phoneTyped } from '@/lib/format'
import styles from './contract-editor.module.css'
import { useSignCodeDemo } from '@/components/contracts/use-sign-code-demo'   // (S42 B-03)
import { SIGN_SEND_LINE, signCodeLine } from '@/lib/contracts/model'
import { Tooltip } from '@/components/om/tooltip'

/* The contract editor's dialogs (REG-534): Send for signature (1.0's WhatsApp link, on our m 600 Dialog) · Mark as
   signed · Edit recipient · Save as template — and the Automation popover. */

/** Send: the signing card's fields (client name · phone for the code) over the message the link travels in. Send via
 *  WhatsApp opens the chat with the message and marks the contract Sent to Client; Copy link copies the signing page. */
export function SendContractDialog({ open, onClose, defaults, link, draft, onSend, onCopy, notes, extra, busy = false, title = 'Send for signature', subtitle, subtitleShort, copyDone = 'Signing link copied', phoneLabel = 'Client phone (for the code)', nameLabel, messageLabel, onMarkSigned, sendLabel = 'Send on WhatsApp' }: {
  open: boolean; onClose: () => void
  defaults: { name: string; phone: string }
  /** The address the message carries — Copy link and the link row show it. (REG-1076) Absent when there is none to give: a project's invoice
      to a client who does not hold the portal (the WhatsApp draft leaves it out too) — the foot is Send alone. */
  link?: string
  draft: (name: string) => string
  onSend: (o: { name: string; phone: string; message: string }) => void | Promise<void>
  /** (REG-631, contracts parity Q-07) Copying the link shares it: the host marks a Draft Sent to Client. (UX audit C8) Called once the
      link is on the clipboard — a failed copy leaves the contract a Draft; resolves true when the server has it (the host says so). */
  onCopy?: () => boolean | Promise<boolean>
  /** (REG-634, contracts parity Q-22) What is worth knowing before it goes (the readiness list's warnings). */
  notes?: string[]
  /** (REG-587) The quote's Send for confirmation reuses this dialog with its own words. (UX audit C5) So does Send a reminder. */
  title?: string; subtitle?: string; copyDone?: string; phoneLabel?: string; sendLabel?: string
  /** (contracts on the move 2026-10-22, B-17) ≤1024 the head's line is this one sentence and the full `subtitle` waits under "How signing works",
      a fold at the body's top — the four-line 12px subtitle and the extra rows pushed the contract sheet's foot over "Mark as signed" (it is in
      ⋮ there). Only a host that passes it gets the fold: the quote's Send for confirmation keeps its one short subtitle and fits as K5 left it. */
  subtitleShort?: string
  /** (simplify S-10 · F1 §6.9.1) Who it goes to, when it is not a client — a PO's send says "Vendor’s name" and "Message to the vendor". */
  nameLabel?: string; messageLabel?: string
  /** (UX audit C9) "Signed in person? Mark as signed" as the body's last line — the dialog closes and Mark as signed opens. */
  onMarkSigned?: () => void
  /** (UX audit Q11) A host's own control above the link — the quote's "Follow up in 3 days ▾". */
  extra?: ReactNode
  /** (fix-D, D-09) The host's send is on its way: the primary rests, so a second press never opens WhatsApp twice. */
  busy?: boolean
}) {
  const [name, setName] = useState(defaults.name)
  const [phone, setPhone] = useState(defaults.phone)
  const [text, setText] = useState(() => draft(defaults.name))
  /* (S42 B-03) the signing dialog's own words say how the client confirms it's them — while the SMS stand-in answers, that no text goes */
  const codeDemo = useSignCodeDemo(subtitle === undefined)
  const [touched, setTouched] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setName(defaults.name); setPhone(defaults.phone); setText(draft(defaults.name)); setTouched(false) } }
  const { copied, copy } = useCopy(link ?? '', { done: copyDone })
  const snackbar = useSnackbar()
  const [sharedAt, setSharedAt] = useState(0)   // a Draft's copy that shared it reads "Copied" too (REG-283)
  /* (UX audit C8) A Draft: the copy first, and it is marked Sent only once the link is on the clipboard — never over a copy that failed. */
  const copyLink = () => {
    if (!link) return
    if (!onCopy) { void copy(); return }
    const write = copyText(link)
    /* a host that only answers (nothing to share — the quote's confirmation link once sent) leaves the words to the dialog; one that shares says its own */
    void write.then(() => { const r = onCopy(); if (r instanceof Promise) return r; if (r) snackbar({ message: copyDone }); return r }, () => { snackbar({ message: 'Couldn’t copy the link — nothing was sent' }); return false })
      .then((ok) => { if (ok) { const at = Date.now(); setSharedAt(at); setTimeout(() => setSharedAt((x) => (x === at ? 0 : x)), 2000) } })
  }
  const phoneOk = isSgPhone(digitsOnly(phone))   // (REG-547)
  const nameOk = name.trim().length > 0
  const err = touched && !phoneOk ? MSG.phone : undefined   // (sweep S2 #25) the house words
  /* (B-17) the touch widths: one line in the head, the rest one tap further. (The calm UI build 2026-10-27, 4-20 · W-448 · T-05) At every width
     now: the head says one line — the signing one by default, "Your client signs on their phone; a one-time code confirms it’s them." — and
     the rest (the demo note, the link's window) waits under "How signing works": the fold on touch, the house Tooltip on the desk. A host
     that passes only `subtitle` (the quote's Send for confirmation) keeps its one line in the head as before. */
  const touch = useMediaQuery(TABLET_DOWN)
  const [howOpen, setHowOpen] = useState(false)
  const signing = subtitle === undefined
  const fullSubtitle = subtitle ?? `Your client reviews and signs in their browser. ${signCodeLine(codeDemo)}`
  const short = subtitleShort ?? (signing ? SIGN_SEND_LINE : undefined)
  const folded = short !== undefined && short !== fullSubtitle
  return (
    <Dialog open={open} onClose={onClose} title={title} size="modal" width={600}
            subtitle={folded ? short : fullSubtitle}
            footer={<>
              {link ? <Button appearance="outlined" variant="secondary" iconStart={<Icon name="content_copy" size={20} />} onPress={copyLink}>{copied || sharedAt ? 'Copied' : 'Copy link'}</Button> : null}
              <Button iconStart={<Icon name="chat" size={20} />} isDisabled={!nameOk || busy} onPress={() => { if (busy) return; setTouched(true); if (!phoneOk || !nameOk) return; void onSend({ name: name.trim(), phone: digitsOnly(phone), message: text }) }}>{sendLabel}</Button>
            </>}>
      <div className={styles.sendFields}>
        {folded && touch ? (
          <div className={styles.howFold} data-open={howOpen || undefined} data-testid="send-how">
            <button type="button" className={styles.howHead} aria-expanded={howOpen} onClick={() => setHowOpen((o) => !o)}><span>How signing works</span><Icon name="expand_more" size={24} /></button>
            {howOpen ? <p className={styles.howBody}>{fullSubtitle}</p> : null}
          </div>
        ) : folded ? (
          /* (4-20) the desk: the same words, one hover or focus away — never a vanishing snackbar, never three lines in the 64 head */
          <span className={styles.howTip} data-testid="send-how">
            <Tooltip label={fullSubtitle}><Button appearance="text" iconStart={<Icon name="help" size={18} />}>How signing works</Button></Tooltip>
          </span>
        ) : null}
        {notes?.length ? (
          <div className={styles.sendNotes} role="note" data-testid="send-notes">
            <span className={styles.sendNotesHead}><Icon name="info" size={18} />Before it goes</span>
            <ul>{notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        ) : null}
        <RecipientFields name={name} phone={phone} phoneLabel={phoneLabel} nameLabel={nameLabel} onName={(v) => { setName(v); setText((t) => (t === draft(name) ? draft(v) : t)) }} onPhone={setPhone}
                         nameError={touched && !nameOk ? `Enter the ${nameLabel ? nameLabel.replace(/’s name$/, '').toLowerCase() : 'client'}’s name` : undefined} phoneError={err} />
        <MessageField value={text} onChange={setText} onReset={() => setText(draft(name))} canReset={text !== draft(name)} label={messageLabel} names={[name]} />
        {extra}
        {/* (4-20 · T-04) the link row only when the message doesn't already carry the link — the foot's Copy link copies it either way */}
        {link && !text.includes(link) ? <div className={styles.linkRow}><Icon name="link" size={18} /><code>{link}</code></div> : null}
        {/* (UX audit C9) the other way a contract comes back signed — the body's last line: the foot's Copy link and Send via WhatsApp leave
            no room for it at 600 without crowding them */}
        {/* (contracts on the move, B-17) …and not on a phone, where it is the ⋮'s row and sat under the pinned foot */}
        {onMarkSigned ? <span className={styles.markSigned} data-phone-hidden="" data-testid="send-mark-signed"><span className={styles.footNote}>Signed in person?</span><Button appearance="text" onPress={onMarkSigned}>Mark as signed</Button></span> : null}
      </div>
    </Dialog>
  )
}

/**
 * (UX audit 2026-09-30, C12) Who a WhatsApp message goes to — the client's name over the +65 number — one piece for Send for digital
 * signature, Send together, Send a reminder and Quote X-Ray's Send to client, so the two kinds of WhatsApp dialog ask the same way.
 */
export function RecipientFields({ name, phone, onName, onPhone, nameError, phoneError, phoneLabel = 'Client phone (for the code)', nameLabel = 'Client name' }: {
  name: string; phone: string; onName: (v: string) => void; onPhone: (digits: string) => void
  nameError?: string; phoneError?: string; phoneLabel?: string
  /** (simplify S-10 · F1 §6.9.1) "Vendor’s name" for a PO's send */ nameLabel?: string
}) {
  return (
    <>
      <TextField label={nameLabel} required value={name} onChange={onName} error={nameError} />
      {/* (the calm UI build 2026-10-27, 4-20) the country code as the number's own prefix — the disabled "Code" box it sat in offered no choice
          (the house sign-up's +65, components/auth/studio-sign-up.tsx) */}
      <TextField label={phoneLabel} required type="tel" inputMode="numeric" value={phoneTyped(phone)} onChange={(v) => onPhone(digitsOnly(v).slice(0, 8))} error={phoneError} maxLength={9} leading={phone ? '+65' : undefined} />
    </>
  )
}
/** (UX audit C12) The message and its line under it — Reset message (it put the draft back; "Reset to draft" read like moving a contract back
    to Draft) and the count. (REG-729) The DS field with its own label and stroke. */
export function MessageField({ value, onChange, onReset, canReset, label = 'Message to the client', names, fold = false }: { value: string; onChange: (v: string) => void; onReset: () => void; canReset: boolean
  /** (simplify S-10 · F1 §6.9.1) "Message to the vendor" for a PO's send */ label?: string
  /** (pending modules S29) Who it goes to — the writing help writes their name their way ("harpreet" → "Harpreet") */ names?: string[]
  /** (Contracts on the move, C4 — A-15) Opt-in, a phone only: the message shows its first three lines and "Show all" until it is opened or
      pressed, so a sheet with more above it (Send together's documents) keeps its tools row in view. A tap in the box opens it whole. */
  fold?: boolean }) {
  /* (quotes on the move 2026-10-22, B-17) ≤767 the box grows with its words: a 212px message scrolled inside a 168px box inside the sheet's own
     scroll. The sheet scrolls, never a box in it. Measured here (Safari has no `field-sizing`); above 767 the DS box keeps its seven lines.
     The character count stays on wider screens: on a phone the whole message is in view, and the count's 84px beside the tools cost
     "Reset message · Write with AI" a second row — the difference between a sheet that fits a 390×844 phone and one that scrolls. */
  const grow = useRef<HTMLDivElement>(null)
  const phone = useSheetLayout()
  const [whole, setWhole] = useState(false)
  const folded = fold && phone && !whole
  useEffect(() => {
    const ta = grow.current?.querySelector('textarea')
    if (!ta || !window.matchMedia(MOBILE).matches) return
    ta.style.height = 'auto'
    /* (C4 — A-15) a folded box is held at its three lines by its own height, never a taller height under a max-height (Chrome then lays the
       text out past the box's edge) */
    const max = parseFloat(getComputedStyle(ta).maxHeight)
    ta.style.height = `${Number.isFinite(max) ? Math.min(ta.scrollHeight, max) : ta.scrollHeight}px`
  }, [value, folded])
  return (
    <>
      {fold && phone ? (
        /* (C4 — A-15) the folded message: its first three lines under a fade with "Show all" — the tools row stays one row, right under it; a
           tap into the box opens it whole too. The wrapper stays while the sheet is open, so the box keeps its focus when it opens. */
        <div className={styles.sendFoldBox} onFocus={() => { if (folded) setWhole(true) }}>
          <div ref={grow} className={styles.sendGrow}><TextArea className={`${styles.sendBox} ${folded ? styles.sendFolded : ''}`} label={label} value={value} onChange={(v: string) => onChange(v)} /></div>
          {folded ? <span className={styles.sendFoldMore}><Button appearance="text" iconStart={<Icon name="unfold_more" size={18} />} onPress={() => setWhole(true)} data-testid="message-show-all">Show all</Button></span> : null}
        </div>
      ) : <div ref={grow} className={styles.sendGrow}><TextArea className={styles.sendBox} label={label} value={value} onChange={(v: string) => onChange(v)} /></div>}
      <div className={styles.sendUnder}>
        <span className={styles.sendTools}>
          <Button appearance="text" iconStart={<Icon name="restart_alt" size={18} />} onPress={onReset} isDisabled={!canReset}>Reset message</Button>
          {/* (pending modules S29 — the writing help in the message composers) Improve · Shorten · Plain English on the message, a proposal first;
              its link, the client's name and the figures are never touched (Reset message stays the way back to the draft) */}
          <WritingHelp label={label} kind="message" nested menuAlign="left" testId="message-writing" sources={{ names: names?.filter(Boolean) }}
                       read={() => ({ html: textToHtml(value) })} apply={(h) => onChange(htmlToText(h))} />
        </span>
        {/* (the calm UI build 2026-10-27, 4-20) the count only once it matters — past 900 (WhatsApp's message runs long past there) */}
        {phone || value.length <= 900 ? null : <span>{value.length} characters</span>}
      </div>
    </>
  )
}
/** (UX audit C12) The send dialogs' body column. */
export function SendFields({ children }: { children: React.ReactNode }) {
  return <div className={styles.sendFields}>{children}</div>
}

/** Mark as signed: the date it was signed and, optionally, the signed copy (a PDF) — the Contracts tab's Signed Copy column. (pending modules
 *  S03) The copy itself is kept — in the lead's Files › Contract & VOs — and the contract opens it from then on; a file that isn't a PDF, or
 *  is over 8 MB, is refused under the box. The dialog closes once the host's save lands. */
export function MarkSignedDialog({ open, onClose, today, onSave }: { open: boolean; onClose: () => void; today: Date; onSave: (o: { signedOn: number; fileName: string | null; file: PickedPdf | null }) => void | Promise<void> }) {
  const [date, setDate] = useState(inputDate(today))
  const [file, setFile] = useState<PickedPdf | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { uploading, start } = useUploadSim()
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setDate(inputDate(today)); setFile(null); setProblem(null); setSaving(false) } }
  const d = parseInputDate(date)
  const pick = (f?: File) => { setProblem(null); if (!f) return; const read = readPickedPdf(f); start(() => { void read.then((r) => { if (isPdfRefusal(r)) setProblem(r.error); else setFile(r) }) }) }
  const save = async () => { if (!d || saving) return; setSaving(true); try { await onSave({ signedOn: d.getTime(), fileName: file?.name ?? null, file }) } finally { setSaving(false) } }
  return (
    <Dialog open={open} onClose={onClose} title="Mark as signed" size="form" width={600}
            subtitle="Signed on paper or elsewhere? Record when, and attach the signed copy if you have it."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!d || saving || uploading} onPress={() => { void save() }}>{saving ? 'Saving…' : 'Mark as signed'}</Button></>}>
      <div className={styles.signedFields}>
        <DateField label="Signed on" value={date} onChange={setDate} today={today} required />
        {file ? <FileTile name={file.name} thumb={file.thumb ?? '/figma-assets/file-pdf.svg'} onDelete={() => setFile(null)} /> : (
          <Dropzone variant="compact" title={uploading ? 'Uploading…' : 'Attach the signed copy (optional)'} helper="PDF" accept="application/pdf" uploading={uploading} onPick={pick} label="Attach the signed copy" />
        )}
        <FieldError message={problem ?? undefined} />
      </div>
    </Dialog>
  )
}

/** Edit recipient (the reference's Edit Client, cut to what a contract needs): who signs and the number the code goes to. */
export function RecipientDialog({ open, onClose, name, phone, onSave }: { open: boolean; onClose: () => void; name: string; phone: string; onSave: (o: { name: string; phone: string }) => void | Promise<void> }) {
  const [n, setN] = useState(name)
  const [p, setP] = useState(phone)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setN(name); setP(phone); setTried(false) } }
  /* (sweep S2 #25) Save says what is missing, on the field, after the press — it was greyed with no word; the house messages */
  const nameErr = n.trim() ? undefined : MSG.required
  const phoneErr = isSgPhone(digitsOnly(p)) ? undefined : MSG.phone   // (REG-547)
  return (
    <Dialog open={open} onClose={onClose} title="Edit recipient" size="modal" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={() => { setTried(true); if (nameErr || phoneErr) return; void onSave({ name: n.trim(), phone: digitsOnly(p) }) }}>Save</Button></>}>
      <div className={styles.sendFields}>
        <TextField label="Full name" required value={n} onChange={setN} autoFocus error={tried ? nameErr : undefined} />
        <TextField label="Mobile number" required type="tel" inputMode="numeric" value={phoneTyped(p)} onChange={(v) => setP(digitsOnly(v).slice(0, 8))} maxLength={9} helper="+65 · the one-time code is sent here" error={tried ? phoneErr : undefined} />
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
            subtitle="The document, with its fields, joins your contract templates."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!name.trim() || busy} onPress={() => { void onSave(name.trim()) }}>{busy ? 'Saving…' : 'Save template'}</Button></>}>
      <TextField label="Template name" required value={name} onChange={setName} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { e.preventDefault(); void onSave(name.trim()) } }} />
    </Dialog>
  )
}

/** Automation (the reference's ⚡ popover): two switches on the contract. (REG-634, contracts parity Q-25) Each is a task — the Leads round's
 *  follow-up model: a Follow-up three days after sending (closed once signed), and one on the signing day to thank the client. */
export function AutomationPopover({ open, onClose, reminders, thankYou, onChange }: { open: boolean; onClose: () => void; reminders: boolean; thankYou: boolean; onChange: (patch: { reminders?: boolean; thankYou?: boolean }) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  /* (REG-728) Rows with a description: 320. */
  return (
    <Dropdown open={open} onClose={onClose} align="right" width={MENU_WIDTH.detail} sheetTitle="Reminders">
      <div ref={ref} data-testid="automation">
        <div className={styles.autoHead}>Reminders</div>
        <AutomationRows reminders={reminders} thankYou={thankYou} onChange={onChange} />
      </div>
    </Dropdown>
  )
}
/** (sweep S2 #9) The header's kebab, where the actions fold on a tablet or a phone, opens the same two switches as a dialog — the popover lived
    inside the folded actions, so the kebab's Automation showed nothing. */
export function AutomationDialog({ open, onClose, reminders, thankYou, onChange }: { open: boolean; onClose: () => void; reminders: boolean; thankYou: boolean; onChange: (patch: { reminders?: boolean; thankYou?: boolean }) => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Reminders" size="modal" width={400} footer={<Button onPress={onClose}>Done</Button>}>
      <div data-testid="automation-dialog"><AutomationRows reminders={reminders} thankYou={thankYou} onChange={onChange} /></div>
    </Dialog>
  )
}
export function AutomationRows({ reminders, thankYou, onChange }: { reminders: boolean; thankYou: boolean; onChange: (patch: { reminders?: boolean; thankYou?: boolean }) => void }) {
  return (
      <>
        <div className={styles.autoRow}>
          <span className={styles.autoText}><span className={styles.autoLabel}>Remind me to follow up</span><span className={styles.autoHelp}>A follow-up task three days after sending, closed once it’s signed</span></span>
          <Switch size="sm" isSelected={reminders} onChange={(v: boolean) => onChange({ reminders: v })} aria-label="Remind me to follow up" />
        </div>
        <div className={styles.autoRow}>
          <span className={styles.autoText}><span className={styles.autoLabel}>Remind me to thank the client</span><span className={styles.autoHelp}>A task on the day it’s signed</span></span>
          <Switch size="sm" isSelected={thankYou} onChange={(v: boolean) => onChange({ thankYou: v })} aria-label="Remind me to thank the client" />
        </div>
      </>
  )
}
