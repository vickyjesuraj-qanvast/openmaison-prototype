'use client'

import { useState } from 'react'
import { Button, Checkbox, TextArea } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useCopy } from '@/components/om/use-copy'
import { digitsOnly, isSgPhone, phoneTyped } from '@/lib/format'
import { bundleSigningLink } from '@/lib/contracts/model'
import type { Contract } from '@/lib/db/schema'
import styles from './editor/contract-editor.module.css'
import own from './send-bundle-dialog.module.css'

const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)

/**
 * (REG-591) Send together: the lead's unsigned documents under one signing link — Mavid: "send all documents at once for
 * signature". The Send for digital signature dialog (REG-534) with a checklist on top: tick two or more, the client's name and
 * number, the WhatsApp draft, the link. The bundle's id is made when the dialog opens so the link is known on the press.
 */
export function SendBundleDialog({ open, onClose, contracts, defaults, draft, onSend }: {
  open: boolean; onClose: () => void
  /** The lead's documents that can still be signed (not Signed, not deleted). */
  contracts: Contract[]
  defaults: { name: string; phone: string }
  draft: (name: string, titles: string[], link: string) => string
  onSend: (o: { bundleId: string; contractIds: string[]; name: string; phone: string; message: string; link: string }) => void | Promise<void>
}) {
  const [bundleId, setBundleId] = useState('')
  const [picked, setPicked] = useState<Set<string>>(() => new Set(contracts.map((c) => c.id)))
  const [name, setName] = useState(defaults.name)
  const [phone, setPhone] = useState(defaults.phone)
  const [text, setText] = useState<string | null>(null)   // null = follows the draft
  const [touched, setTouched] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setBundleId(makeId()); setPicked(new Set(contracts.map((c) => c.id))); setName(defaults.name); setPhone(defaults.phone); setText(null); setTouched(false) } }
  const link = bundleId ? bundleSigningLink(bundleId) : ''
  const titles = contracts.filter((c) => picked.has(c.id)).map((c) => c.title)
  const auto = draft(name, titles, link)
  const message = text ?? auto
  const { copied, copy } = useCopy(link, { done: 'Signing link copied' })
  const phoneOk = isSgPhone(digitsOnly(phone))   // (REG-547)
  const nameOk = name.trim().length > 0
  const enough = picked.size >= 2
  const err = touched && !phoneOk ? 'Enter a valid 8-digit mobile number' : undefined
  const toggle = (id: string, on: boolean) => setPicked((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n })
  return (
    <Dialog open={open} onClose={onClose} title="Send together for signature" size="modal" width={600}
            subtitle="One link, every document: your client reads each one and signs once at the end. A one-time code on their phone confirms it’s them."
            footer={<>
              <Button appearance="outlined" variant="secondary" iconStart={<Icon name="content_copy" size={20} />} isDisabled={!link} onPress={() => { void copy() }}>{copied ? 'Copied' : 'Copy link'}</Button>
              <Button iconStart={<Icon name="chat" size={20} />} isDisabled={!nameOk || !enough} onPress={() => { setTouched(true); if (!phoneOk || !nameOk || !enough) return; void onSend({ bundleId, contractIds: contracts.filter((c) => picked.has(c.id)).map((c) => c.id), name: name.trim(), phone: digitsOnly(phone), message, link }) }}>Send via WhatsApp</Button>
            </>}>
      <div className={styles.sendFields}>
        <div className={own.list} role="group" aria-label="Documents to send">
          <span className={own.listHead}>{picked.size} of {contracts.length} documents{enough ? '' : ' — pick at least two'}</span>
          {contracts.map((c) => (
            <label key={c.id} className={own.row}>
              <Checkbox isSelected={picked.has(c.id)} onChange={(on: boolean) => toggle(c.id, on)} aria-label={c.title} />
              <span className={own.rowTitle}>{c.title}</span>
              <span className={own.rowMeta}>{c.status}</span>
            </label>
          ))}
        </div>
        <TextField label="Client name" required value={name} onChange={setName} error={touched && !nameOk ? 'Enter the client’s name' : undefined} />
        <div className={styles.phoneRow}>
          <span className={styles.phoneCode}><TextField label="Code" value="+65" mode="select" options={['+65']} disabled /></span>
          <span className={styles.phoneNum}><TextField label="Client phone (for the code)" required type="tel" inputMode="numeric" value={phoneTyped(phone)} onChange={(v) => setPhone(digitsOnly(v).slice(0, 8))} error={err} maxLength={9} /></span>
        </div>
        <div className={styles.sendBox}>
          <TextArea aria-label="Message to the client" value={message} onChange={(v: string) => setText(v)} />
        </div>
        <div className={styles.sendUnder}>
          <Button appearance="text" iconStart={<Icon name="restart_alt" size={18} />} onPress={() => setText(null)} isDisabled={text === null || text === auto}>Reset to draft</Button>
          <span>{message.length} characters</span>
        </div>
        <div className={styles.linkRow}><Icon name="link" size={18} /><code>{link}</code></div>
      </div>
    </Dialog>
  )
}
