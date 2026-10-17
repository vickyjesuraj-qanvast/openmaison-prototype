'use client'

import { useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Dialog, FootStart } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { digitsOnly, displayDate, phoneLocal, phoneTyped } from '@/lib/format'
import { OUTSIDE_ICON, OUTSIDE_KINDS, OUTSIDE_LABEL, OUTSIDE_NAME_MAX, outsideErrors, outsideKey, outsideLine, type Outside, type OutsideKind } from '@/lib/leads/outside'
import styles from './outside-person.module.css'

/**
 * (gaps build, package C — M-03) Someone outside the studio on a task — the pieces every surface draws them with: the badge that stands beside
 * the members' avatars (their kind's glyph where a member has an initial; the name in the tooltip), the form (s 400: kind, name, mobile — a
 * Singapore mobile, grouped as typed, since WhatsApp needs one; the people already on other tasks offered first), and the task panel's
 * section (the person, *Send on WhatsApp*, when it last went, Edit · Remove).
 * (parity map, TD-019 — 1.0's "Request invite") The form's last line, unticked: **Ask an Owner to add them to the studio** — the Owners get a
 * task "Add {name} to the studio" with the number, and the bell's `invite_requested` opens Company › Members' Add member filled in. Shown
 * only while the person is new to the task (an edit of the same person never asks twice; the server skips an ask already open).
 */
export function OutsideBadge({ o, size = 24 }: { o: Pick<Outside, 'name' | 'kind' | 'phone'>; size?: 24 | 36 }) {
  return (
    <Tooltip label={outsideLine(o)}>
      <span className={styles.badge} data-size={size} role="img" aria-label={`${o.name}, ${OUTSIDE_LABEL[o.kind].toLowerCase()} — outside the studio`} data-testid="outside-badge">
        <Icon name={OUTSIDE_ICON[o.kind]} size={size === 36 ? 20 : 16} weight={300} />
      </span>
    </Tooltip>
  )
}

/** The people already on the studio's tasks, newest first, once each — the form offers them before a name is typed. */
export function recentOutside(tasks: { externalName?: string | null; externalPhone?: string | null; externalKind?: string | null; updatedAt?: Date | null; createdAt: Date }[]): Pick<Outside, 'name' | 'phone' | 'kind'>[] {
  const out: Pick<Outside, 'name' | 'phone' | 'kind'>[] = []
  const seen = new Set<string>()
  for (const t of [...tasks].sort((a, b) => (b.updatedAt ?? b.createdAt).getTime() - (a.updatedAt ?? a.createdAt).getTime())) {
    const name = (t.externalName ?? '').trim()
    if (!name) continue
    const o = { name, phone: t.externalPhone || null, kind: (t.externalKind === 'supplier' ? 'supplier' : 'subcontractor') as OutsideKind }
    const k = outsideKey(o)
    if (seen.has(k)) continue
    seen.add(k); out.push(o)
  }
  return out.slice(0, 6)
}

export function OutsideDialog({ open, value, recent, onClose, onSave, onRemove, nested = false }: {
  open: boolean
  /** The person on the task now — the form edits them; null adds one. */
  value: Pick<Outside, 'name' | 'phone' | 'kind'> | null
  recent: Pick<Outside, 'name' | 'phone' | 'kind'>[]
  onClose: () => void
  /** Resolves null once saved (the dialog closes), else the refusal to show. (parity map, TD-019) `askInvite` rides the value to the server
      action unchanged — the hosts pass the value through as it is. */
  onSave: (v: { name: string; phone: string; kind: OutsideKind; askInvite?: boolean }) => Promise<string | null>
  /** Takes them off the task (the host offers Undo). */
  onRemove?: () => void
  nested?: boolean
}) {
  const [kind, setKind] = useState<OutsideKind>('subcontractor')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [tried, setTried] = useState(false)
  const [server, setServer] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [askInvite, setAskInvite] = useState(false)   // (parity map, TD-019)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setKind(value?.kind ?? 'subcontractor'); setName(value?.name ?? ''); setPhone(value?.phone ?? ''); setTried(false); setServer(null); setAskInvite(false) }
  }
  /* (parity map, TD-019) only for someone new on the task — the same person saved again never asks twice */
  const newPerson = !value || outsideKey({ name: name.trim(), phone: phone || null }) !== outsideKey(value)
  const errors = outsideErrors({ name, phone })
  const save = async () => {
    setTried(true)
    if (errors.name || errors.phone || busy) return
    setBusy(true)
    try { const refused = await onSave({ name: name.trim(), phone, kind, ...(askInvite && newPerson ? { askInvite: true } : {}) }); setServer(refused) }
    catch { setServer('Couldn’t save — please try again') } finally { setBusy(false) }
  }
  const others = recent.filter((r) => !value || outsideKey(r) !== outsideKey(value))
  return (
    <Dialog open={open} onClose={onClose} title={value ? 'Outside person' : 'Add someone outside the studio'} width={400} size="form" closeOnScrim={false} nested={nested}
            footer={<>
              {value && onRemove ? <FootStart><Button appearance="text" onPress={onRemove} data-testid="outside-remove">Remove from the task</Button></FootStart> : null}
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button onPress={() => { void save() }} isDisabled={busy} data-testid="outside-save">{value ? 'Save' : 'Add'}</Button>
            </>}>
      <form className={styles.form} onSubmit={(e) => { e.preventDefault(); void save() }} noValidate data-testid="outside-dialog">
        <p className={styles.lede}>A subcontractor or a supplier — no sign-in. Send them the task on WhatsApp from the task.</p>
        {!value && others.length ? (
          <div className={styles.recent}>
            <span className={styles.caption}>On other tasks</span>
            <Chips label="On other tasks" value={null} options={others.map((r) => ({ value: outsideKey(r), label: r.phone ? `${r.name} · ${phoneLocal(r.phone)}` : r.name }))}
                   onChange={(k) => { const r = others.find((x) => outsideKey(x) === k); if (r) { setName(r.name); setPhone(r.phone ?? ''); setKind(r.kind) } }} />
          </div>
        ) : null}
        <Chips label="Who they are" value={kind} onChange={(v) => setKind(v === 'supplier' ? 'supplier' : 'subcontractor')} options={OUTSIDE_KINDS.map((k) => ({ value: k, label: OUTSIDE_LABEL[k] }))} />
        <TextField label="Name" value={name} onChange={(v) => { setName(v.slice(0, OUTSIDE_NAME_MAX)); setServer(null) }} maxLength={OUTSIDE_NAME_MAX} autoFocus={!value} autoComplete="off" required
                   error={tried ? errors.name : undefined} helper={kind === 'supplier' ? 'The person or the company — Hafary, Ah Seng Glass' : 'The person or the crew — Ah Seng (tiler)'} />
        <TextField label="Mobile number" value={phoneTyped(phone)} onChange={(v) => { setPhone(digitsOnly(v).slice(0, 8)); setServer(null) }} type="tel" inputMode="tel" numeric="digits" autoComplete="off" required
                   error={(tried ? errors.phone : undefined) ?? server ?? undefined} helper="WhatsApp opens on this number when you send them the task." />
        {newPerson ? (
          /* (parity map, TD-019) (invented copy) */
          <div className={styles.ask} data-testid="outside-ask-invite">
            <Checkbox isSelected={askInvite} onChange={(on: boolean) => setAskInvite(on)}>Ask an Owner to add them to the studio</Checkbox>
            <span className={styles.askHelp}>{askInvite ? `The Owners get a task to add ${name.trim() || 'them'}, with this number.` : 'For someone who should sign in and see their tasks.'}</span>
          </div>
        ) : null}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  )
}

/** The task panel's section: who is on it from outside, the send, when it last went. */
export function OutsideSection({ o, onAdd, onEdit, onSend, onRemove, testId = 'panel-outside' }: {
  o: Outside | null
  onAdd: () => void
  onEdit: () => void
  onSend: () => void
  onRemove: () => void
  testId?: string
}) {
  return (
    <section className={styles.section} aria-label="Outside the studio" data-testid={testId}>
      <h3 className={styles.title}>Outside the studio</h3>
      {o ? (
        <>
          <div className={styles.person}>
            <OutsideBadge o={o} size={36} />
            <span className={styles.text}>
              <span className={styles.name}>{o.name}</span>
              <span className={styles.meta}>{[OUTSIDE_LABEL[o.kind], o.phone ? phoneLocal(o.phone) : null].filter(Boolean).join(' · ')}</span>
              <span className={styles.meta} data-testid="outside-sent">{o.sentAt ? `Sent on WhatsApp ${displayDate(new Date(o.sentAt))}` : 'Not sent yet'}</span>
            </span>
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" appearance="outlined" iconStart={<Icon name="chat" size={20} />} onPress={onSend} isDisabled={!o.phone} data-testid="outside-send">Send on WhatsApp</Button>
            <span className={styles.links}>
              <button type="button" className={styles.link} onClick={onEdit} data-testid="outside-edit">Edit</button>
              <button type="button" className={styles.link} onClick={onRemove} data-testid="outside-take-off">Remove</button>
            </span>
          </div>
        </>
      ) : (
        <span><button type="button" className={styles.link} onClick={onAdd} data-testid="outside-add"><Icon name="add" size={20} />Add a subcontractor or supplier</button></span>
      )}
    </section>
  )
}
