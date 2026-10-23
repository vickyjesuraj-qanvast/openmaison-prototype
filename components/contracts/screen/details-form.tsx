'use client'

import { useState } from 'react'
import { TextField } from '@/components/om/text-field'
import { DateField } from '@/components/om/date-field'
import { MSG } from '@/lib/forms'
import { digitsOnly, inputDate, isSgPhone, parseInputDate, phoneTyped } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import styles from './section-screen.module.css'

export type DetailsQuote = { id: string; number: string; title: string; amountMinor: number; status: string }
export type DetailsFocus = 'title' | 'recipient' | 'date' | 'quote' | null

const NO_QUOTE = 'No quote'
const labelOf = (q: DetailsQuote) => `${q.number} · ${money2(q.amountMinor)} · ${q.status}`

/**
 * (Contracts on the move, P-02 — his "please check and built accordingly" 2026-10-22; absorbs B-01 B-02 B-11 B-16 C-22) **Details** is one form:
 * the title, the recipient and their number (the one-time code goes there), the contract date, the quote it names and who issues it — the
 * four things that change on site, each on its own line, typing at 16. Every field saves itself as the desk's meta row does (the host's
 * autosave); a number that isn't a Singapore mobile is said on the field (REG-547) and never saved. Signed, the details stay as signed.
 */
export function DetailsForm({ v, quotes, quoteGone, entities, locked, now, focus, onTitle, onRecipient, onDate, onQuote, onEntity }: {
  v: { title: string; recipientName: string; recipientPhone: string; contractDate: number; quoteId: string | null; entity: string | null }
  quotes: DetailsQuote[]
  /** (REG-632, parity Q-08) the named quote was archived or deleted — said on the field, never swapped for another */
  quoteGone: 'archived' | 'deleted' | null
  /** Company › Profile's issuing entities — the field is drawn only with two or more (REG-632, Q-10) */
  entities: string[]
  locked: boolean
  now: number
  focus: DetailsFocus
  onTitle: (title: string) => void
  /** The pair as typed; `valid` says whether the number may be saved. */
  onRecipient: (name: string, phone: string, valid: boolean) => void
  onDate: (at: number) => void
  onQuote: (id: string | null) => void
  onEntity: (name: string) => void
}) {
  const [phoneTouched, setPhoneTouched] = useState(false)
  const phoneOk = isSgPhone(v.recipientPhone)
  const quoteLabels = [...quotes.map(labelOf), NO_QUOTE]
  const named = quotes.find((q) => q.id === v.quoteId)
  return (
    <div className={styles.form} data-testid="details-form">
      {locked ? <p className={styles.note}>Signed — the title, recipient, date and quote stay as they were signed.</p> : null}
      <TextField label="Title" required value={v.title} maxLength={120} disabled={locked} autoFocus={focus === 'title'} onChange={onTitle} />
      <TextField label="Recipient" required value={v.recipientName} maxLength={80} disabled={locked} autoFocus={focus === 'recipient'} helper="Who signs it"
                 error={v.recipientName.trim() ? undefined : MSG.required} onChange={(n) => onRecipient(n, v.recipientPhone, phoneOk)} />
      <TextField label="Mobile number" required type="tel" inputMode="numeric" value={phoneTyped(v.recipientPhone)} maxLength={9} disabled={locked}
                 helper="+65 · the one-time code is sent here" error={phoneTouched && !phoneOk ? MSG.phone : undefined}
                 onBlur={() => setPhoneTouched(true)} onChange={(x) => { const d = digitsOnly(x).slice(0, 8); onRecipient(v.recipientName, d, isSgPhone(d)); if (d.length === 8) setPhoneTouched(true) }} />
      <DateField label="Contract date" value={inputDate(new Date(v.contractDate))} today={new Date(now)} required disabled={locked}
                 onChange={(s) => { const d = parseInputDate(s); if (d) onDate(d.getTime()) }} />
      {/* (REG-632, parity Q-08) the quote this contract reads — named, never swapped for another; a gone one says so */}
      <TextField label="Quote" mode="select" options={quoteLabels} value={named ? labelOf(named) : v.quoteId && quoteGone ? `${quoteGone === 'archived' ? 'An archived' : 'A deleted'} quote` : NO_QUOTE} disabled={locked}
                 helper={quoteGone ? `The quote it named was ${quoteGone} — pick the quote it should read` : 'The quote this contract reads'} error={quoteGone ? true : undefined}
                 onChange={(l) => onQuote(l === NO_QUOTE ? null : quotes.find((q) => labelOf(q) === l)?.id ?? null)} />
      {entities.length > 1 ? (
        <TextField label="Issued by" mode="select" options={entities} value={v.entity ?? entities[0] ?? ''} disabled={locked} helper="The entity on the letterhead" onChange={onEntity} />
      ) : null}
    </div>
  )
}
