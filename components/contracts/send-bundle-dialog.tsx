'use client'

import { useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { MessageField, RecipientFields } from './editor/dialogs'
import { useCopy } from '@/components/om/use-copy'
import { digitsOnly, isSgPhone } from '@/lib/format'
import { bundleSigningLink } from '@/lib/contracts/model'
import { SEND_BLOCK_WORDS, sendBlock } from '@/lib/contracts/readiness'
import { MSG } from '@/lib/forms'
import type { Contract } from '@/lib/db/schema'
import styles from './editor/contract-editor.module.css'
import own from './send-bundle-dialog.module.css'

/* (REG-633, E-118) The fallback is hex too — the server takes only hex and dashes, and a refused id left WhatsApp holding a dead link. */
const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''))

/**
 * (REG-591) Send together: the lead's unsigned documents under one signing link — Mavid: "send all documents at once for
 * signature". The Send for digital signature dialog (REG-534) with a checklist on top: tick two or more, the client's name and
 * number, the WhatsApp draft, the link. The bundle's id is made when the dialog opens so the link is known on the press.
 */
export function SendBundleDialog({ open, onClose, contracts, defaults, draft, onSend, onShare, quoteBlock }: {
  open: boolean; onClose: () => void
  /** The lead's documents that can still be signed (not Signed, not deleted). */
  contracts: Contract[]
  defaults: { name: string; phone: string }
  draft: (name: string, titles: string[], link: string) => string
  onSend: (o: { bundleId: string; contractIds: string[]; name: string; phone: string; message: string; link: string }) => void | Promise<void>
  /** (REG-633, parity Q-07 · E-118) Copy link shares the bundle: it is recorded (Sent to Client) without WhatsApp, so the copied link opens. */
  onShare?: (o: { bundleId: string; contractIds: string[]; name: string; phone: string }) => void | Promise<void>
  /** (UX audit C2) Why a document's named quote keeps it out (a Draft under required approval), else null. */
  quoteBlock?: (c: Contract) => string | null
}) {
  const [bundleId, setBundleId] = useState('')
  /* (sweep S2 #7) Only what can go out is ticked or tickable — an empty document, or one with nowhere to sign, says why and stays out
     (the server dropped them after WhatsApp had named them, and a set left under two threw with WhatsApp already open). */
  const blockOf = (c: Contract) => { const b = sendBlock(c); return b ? SEND_BLOCK_WORDS[b] ?? 'It can’t go out yet' : quoteBlock?.(c) ?? null }
  const sendable = contracts.filter((c) => !blockOf(c))
  /* (REG-633, parity Q-16) The order the documents are ticked is the order the client reads them. */
  const [picked, setPicked] = useState<string[]>(() => sendable.map((c) => c.id))
  const [name, setName] = useState(defaults.name)
  const [phone, setPhone] = useState(defaults.phone)
  const [text, setText] = useState<string | null>(null)   // null = follows the draft
  const [touched, setTouched] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setBundleId(makeId()); setPicked(sendable.map((c) => c.id)); setName(defaults.name); setPhone(defaults.phone); setText(null); setTouched(false) } }
  const link = bundleId ? bundleSigningLink(bundleId) : ''
  const titles = picked.map((id) => contracts.find((c) => c.id === id)?.title).filter((t): t is string => !!t)
  const auto = draft(name, titles, link)
  const message = text ?? auto
  const { copied, copy } = useCopy(link, { done: 'Signing link copied' })
  const phoneOk = isSgPhone(digitsOnly(phone))   // (REG-547)
  const nameOk = name.trim().length > 0
  const enough = picked.length >= 2
  const err = touched && !phoneOk ? MSG.phone : undefined   // (sweep S2 #25) the house words
  const toggle = (id: string, on: boolean) => setPicked((s) => (on ? (s.includes(id) ? s : [...s, id]) : s.filter((x) => x !== id)))
  const ready = nameOk && enough && phoneOk
  return (
    <Dialog open={open} onClose={onClose} title="Send together for signature" size="modal" width={600}
            subtitle="One link, every document: your client reads each one and signs once at the end. A one-time code on their phone confirms it’s them."
            footer={<>
              <Button appearance="outlined" variant="secondary" iconStart={<Icon name="content_copy" size={20} />} isDisabled={!link || !nameOk || !enough}
                      onPress={() => { setTouched(true); if (!ready) return; void copy(); void onShare?.({ bundleId, contractIds: picked, name: name.trim(), phone: digitsOnly(phone) }) }}>{copied ? 'Copied' : 'Copy link'}</Button>
              <Button iconStart={<Icon name="chat" size={20} />} isDisabled={!nameOk || !enough} onPress={() => { setTouched(true); if (!ready) return; void onSend({ bundleId, contractIds: picked, name: name.trim(), phone: digitsOnly(phone), message, link }) }}>Send via WhatsApp</Button>
            </>}>
      <div className={styles.sendFields}>
        <div className={own.list} role="group" aria-label="Documents to send">
          <span className={own.listHead}>{picked.length} of {sendable.length} {sendable.length === 1 ? 'document' : 'documents'}{enough ? ' — the client reads them in the order ticked' : ' — pick at least two'}</span>
          {contracts.map((c) => {
            const why = blockOf(c)
            return (
              <label key={c.id} className={own.row} data-blocked={why ? '' : undefined}>
                <Checkbox isSelected={picked.includes(c.id)} isDisabled={!!why} onChange={(on: boolean) => toggle(c.id, on)} aria-label={c.title} />
                <span className={own.rowTitle}>{picked.includes(c.id) ? <span className={own.rowOrder}>{picked.indexOf(c.id) + 1}</span> : null}{c.title}</span>
                <span className={own.rowMeta}>{why ?? c.status}</span>
              </label>
            )
          })}
        </div>
        {/* (UX audit C12) the Send dialog's own recipient and message pieces */}
        <RecipientFields name={name} phone={phone} onName={setName} onPhone={setPhone} nameError={touched && !nameOk ? MSG.required : undefined} phoneError={err} />
        <MessageField value={message} onChange={(v) => setText(v)} onReset={() => setText(null)} canReset={text !== null && text !== auto} />
        <div className={styles.linkRow}><Icon name="link" size={18} /><code>{link}</code></div>
      </div>
    </Dialog>
  )
}
