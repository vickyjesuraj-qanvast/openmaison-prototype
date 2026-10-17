'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { CLIENT_NOTE_MAX, STUDIO_NOTE_DEFAULT, contractLine, priceText, voPickBlock, voPickLine, type ChoiceView } from '@/lib/projects/choices-model'
import { OptionSquare } from './choice-card'
import styles from './choices.module.css'

/**
 * (Projects round 8) Choose with the client — a pick made off the portal, on a call or on site — or change a pick until the work it belongs to
 * starts. The options as the source list's rows (the house square, one press picks), the current pick marked; a note that reads "Chosen with
 * the client on a call" until it is changed (the brief's words); what the pick does to the contract. The dialog closes once the save lands.
 * (fix-C, C-23) A real radio group: the current pick ticked from the start ("The pick now"), one Tab stop, the arrows move the pick.
 * (fix-C, C-02) The pick's variation order is named: a Draft follows the new pick (or goes, when the new pick changes nothing); one past Draft
 * holds the pick, and the dialog says why before anyone presses Save.
 */
export function ChooseDialog({ open, choice, clientFirst, gstPct, busy, onClose, onSave }: {
  open: boolean
  choice: ChoiceView | null
  clientFirst: string
  /** (REG-1068) The GST a pick's variation order adds — the line says what the contract moves by. */
  gstPct: number
  busy: boolean
  onClose: () => void
  onSave: (optionId: string, note: string) => void
}) {
  const [optionId, setOptionId] = useState<string | null>(null)
  const [note, setNote] = useState(STUDIO_NOTE_DEFAULT)
  const [seen, setSeen] = useState<string | null>(null)
  const key = open ? choice?.id ?? null : null
  if (key !== seen) { setSeen(key); if (key) { setOptionId(choice?.chosen?.optionId ?? null); setNote(STUDIO_NOTE_DEFAULT) } }
  const current = choice?.chosen?.optionId ?? null
  const pick = choice?.options.find((o) => o.id === optionId) ?? null
  const changing = choice?.status === 'chosen'
  const carries = choice?.options.find((o) => o.id === current)?.name ?? null
  const voWhy = changing ? voPickBlock(choice?.variation ?? null, clientFirst) : null
  const voLine = changing && pick && pick.id !== current ? voPickLine(choice?.variation ?? null, carries, pick.priceMinor) : null
  const ready = !!pick && pick.id !== current && !busy && !voWhy
  /* the radio group's keys: ↑ ↓ (and ← →) move the pick and the focus, Home / End go to the ends — one Tab stop for the group */
  const list = useRef<HTMLDivElement>(null)
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const opts = choice?.options ?? []
    if (!opts.length) return
    const at = Math.max(0, opts.findIndex((o) => o.id === optionId))
    const to = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? (at + 1) % opts.length : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? (at - 1 + opts.length) % opts.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? opts.length - 1 : -1
    if (to < 0) return
    e.preventDefault()
    const next = opts[to]!
    setOptionId(next.id)
    list.current?.querySelector<HTMLElement>(`[data-option-id="${CSS.escape(next.id)}"]`)?.focus()
  }
  const focusable = optionId ?? choice?.options[0]?.id ?? null
  return (
    <Dialog open={open} onClose={onClose} closeOnScrim={false} size="form" width={600} title={changing ? 'Change the pick' : `Choose with ${clientFirst}`}
            subtitle={changing ? `${choice?.milestone ? `Until ${choice.milestone.title} starts.` : 'Until the project is complete.'} Tell ${clientFirst} — the portal shows the new pick.` : `A pick made with ${clientFirst} off the portal — on a call, on site. It reads as theirs.`}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
              <Button onPress={() => { if (pick) onSave(pick.id, note) }} isDisabled={!ready} data-testid="choose-save">{busy ? 'Saving…' : 'Save the pick'}</Button>
            </>}>
      {choice ? (
        <div className={styles.fields} data-testid="choose-dialog">
          <div ref={list} className={styles.sourceList} role="radiogroup" aria-label={choice.title} onKeyDown={onKey}>
            {choice.options.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={o.id === optionId} tabIndex={o.id === focusable ? 0 : -1} className={styles.sourceRow}
                      onClick={() => setOptionId(o.id)} data-testid="choose-option" data-option-id={o.id} data-current={o.id === current || undefined}>
                <OptionSquare o={o} className={styles.sourceThumb} />
                <span className={styles.sourceText}>
                  <span className={styles.sourceName}>{o.name}</span>
                  <span className={styles.sourceLine}>{o.id === current ? `The pick now · ${priceText(o.priceMinor, gstPct)}` : priceText(o.priceMinor, gstPct)}</span>
                </span>
                <Icon name={o.id === optionId ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} weight={300} />
              </button>
            ))}
          </div>
          <TextField label="How it was chosen" value={note} onChange={setNote} maxLength={CLIENT_NOTE_MAX} helper="The team reads it on the choice and in Activity" />
          {pick ? <p className={styles.help} data-testid="choose-contract">{contractLine(pick.priceMinor, gstPct) ?? 'No change to the price'}</p> : null}   {/* (fix-C, C-23) the card's spelling */}
          {voWhy ? <p className={styles.help} role="alert" data-testid="choose-vo">{voWhy}</p> : voLine ? <p className={styles.help} data-testid="choose-vo">{voLine}</p> : null}
        </div>
      ) : null}
    </Dialog>
  )
}
