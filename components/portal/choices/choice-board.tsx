'use client'

import { useRef, useState, type CSSProperties } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { clientDay, waLink } from '@/lib/portal/model'
import { CLIENT_NOTE_MAX, clientPriceNotice, clientPriceText, neededDay, normPrice } from '@/lib/projects/choices-model'
import type { PortalChoice, PortalChoiceOption } from '@/lib/projects/choices'
import { CHOICE_ANSWERS, DECLINE_NOTE_MAX, answerAsk, answerLine, answerNeedsWhy, type ChoiceAnswer } from '@/lib/projects/decline'
import styles from './choices.module.css'

/** (fix-F, F-03) Who made a client's pick, as the reader hears it. */
const pickerOf = (c: { mine?: boolean; person?: string | null }) => (c.mine === false && c.person ? c.person : 'You')

/** The option's picture: the photo, else its colour, else a plain well with the palette glyph. */
function Pic({ o }: { o: Pick<PortalChoiceOption, 'src' | 'hex'> }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (o.src) return <span className={styles.pic}><img src={o.src} alt="" /></span>
  if (o.hex) return <span className={styles.pic} data-hex="" style={{ '--swatch': o.hex } as CSSProperties} />
  return <span className={styles.pic}><Icon name="palette" size={32} weight={300} /></span>
}

/**
 * (Projects round 8) One choice as the client sees it — on their portal's Choices, and in the studio's "As the client sees it". The title,
 * the room and the day it is needed by, the studio's line; the options large (one under the other on a phone, the picture full width), each
 * with its name, its line and what it does to the price ("Adds S$1,200" · "Saves S$300" · "Included in your quote"). A tap picks one (the
 * studio's colour rings it and ticks it); one that changes the price says so in a line; a note; **Confirm {option}**. Once chosen: the pick
 * stays ringed, the others dim, and the line says who chose it and when — to change it, the client messages their designer (1.0 let no
 * one change an answer and hid the card, I-263 · I-285). `mode`: 'client' saves; 'preview' (a studio's look at the portal) and 'studio'
 * (the studio's own preview) let the options be tapped and save nothing.
 */
export function ChoiceBoard({ choice, mode, contact, clientName, onConfirm, onAnswer, now }: {
  choice: Omit<PortalChoice, 'homeId'>
  mode: 'client' | 'preview' | 'studio'
  /** "Message {designer} on WhatsApp" under a chosen one — (fix-F, F-13) no mobile, no link. */
  contact?: { name: string | null; phone: string | null; label?: string | null } | null
  clientName?: string
  onConfirm?: (optionId: string, note: string) => Promise<boolean>
  /** (gaps build D, item 2 — M-07) *None of these work*: the client's no, with their reason — resolves true once it landed */
  onAnswer?: (kind: ChoiceAnswer, note: string) => Promise<boolean>
  /** (fix-F, F-29) today, for the client's one way to say a day */
  now?: number
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  /* (fix-F, F-25) on a phone the options are large and Confirm sits under them all — a pick brings it into reach */
  const foot = useRef<HTMLDivElement>(null)
  const pickOne = (id: string) => {
    setPicked(id)
    /* after the pick has drawn (its price line may grow the foot): the foot's end above the phone's bar */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = foot.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const dock = document.querySelector<HTMLElement>('[data-testid="portal-dock"]')?.getBoundingClientRect().height ?? 0
      if (r.bottom > window.innerHeight - dock - 16 || r.top < 0) el.scrollIntoView({ block: 'end', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }))
  }
  const day = (ms: number) => clientDay(ms, now ?? ms)
  const chosen = choice.status === 'chosen' && choice.chosen ? choice.options.find((o) => o.id === choice.chosen!.optionId) ?? null : null
  const pick = choice.options.find((o) => o.id === picked) ?? null
  const waiting = choice.status === 'shared'
  const declined = choice.status === 'declined'
  /* (gaps build D, item 2) None of these work — the answer and its reason, in a form sheet that closes only once the answer lands */
  const [noOpen, setNoOpen] = useState(false)
  const [noKind, setNoKind] = useState<ChoiceAnswer>('other_options')
  const [noNote, setNoNote] = useState('')
  const [noTried, setNoTried] = useState(false)
  const sendNo = async () => {
    if (!noNote.trim()) { setNoTried(true); return }
    if (busy || mode !== 'client' || !onAnswer) return
    setBusy(true)
    try { if (await onAnswer(noKind, noNote.trim())) setNoOpen(false) } finally { setBusy(false) }
  }
  const gstPct = choice.gstPct ?? 0   // (REG-1068) what the contract moves by, GST included when the studio charges it
  const notice = pick ? clientPriceNotice(pick.name, pick.priceMinor, gstPct) : null
  const confirm = async () => {
    if (!pick || busy || mode !== 'client' || !onConfirm) return
    setBusy(true)
    try { await onConfirm(pick.id, note) } finally { setBusy(false) }
  }
  const meta = [choice.room, waiting && choice.neededBy ? `Needed by ${neededDay(choice.neededBy)}` : null, choice.milestone].filter(Boolean).join(' · ')
  return (
    <section className={styles.choice} id={`choice-${choice.id}`} data-choice-id={choice.id} data-status={choice.status} aria-label={choice.title} data-testid="portal-choice">
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <h3 className={styles.h3}>{choice.title}</h3>
          {waiting ? <MetaChip color="yellow">Waiting for you</MetaChip> : declined ? <MetaChip color="blue">With your designer</MetaChip> : <MetaChip color="green">Chosen</MetaChip>}
        </div>
        {meta ? <p className={styles.line}>{meta}</p> : null}
        {choice.note ? <p className={styles.note}>{choice.note}</p> : null}
      </div>
      <div className={styles.opts} role="radiogroup" aria-label={choice.title}>
        {choice.options.map((o) => {
          const on = waiting ? o.id === picked : declined ? false : o.id === chosen?.id
          const none = normPrice(o.priceMinor) == null
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on} className={styles.opt} data-picked={on || undefined} data-dim={(!waiting && !on) || declined ? '' : undefined}
                    disabled={!waiting} onClick={() => pickOne(o.id)} data-testid="portal-choice-option" data-option-id={o.id}>
              <Pic o={o} />
              {on ? <span className={styles.tick} aria-hidden><Icon name="check" size={18} /></span> : null}
              <span className={styles.optText}>
                <span className={styles.optName}>{o.name}</span>
                {o.description ? <span className={styles.optDesc}>{o.description}</span> : null}
                <span className={styles.optPrice} data-none={none || undefined}>{clientPriceText(o.priceMinor, gstPct)}</span>
              </span>
            </button>
          )
        })}
      </div>
      {waiting ? (
        <div ref={foot} className={styles.foot} data-slot="choice-foot">
          {notice ? <p className={styles.notice} data-testid="portal-choice-notice">{notice}</p> : null}
          <TextField label="A note for your designer" value={note} onChange={setNote} maxLength={CLIENT_NOTE_MAX} disabled={mode !== 'client'} helper="Optional — anything they should know" />
          <div className={styles.confirm}>
            <Button onPress={() => { void confirm() }} isDisabled={!pick || busy || mode !== 'client'} data-testid="portal-choice-confirm">
              {busy ? 'Saving…' : pick ? `Confirm ${pick.name}` : 'Choose one above'}
            </Button>
          </div>
          {/* (gaps build D, item 2 — M-07; 1.0's Reject · Request changes) a client who likes none of them says so, with why */}
          <p className={styles.line}>
            {'Not keen on any of these? '}
            <button type="button" className={styles.textLink} onClick={() => { setNoKind('other_options'); setNoNote(''); setNoTried(false); setNoOpen(true) }} disabled={mode === 'studio'} data-testid="portal-choice-none">None of these work</button>
          </p>
          {mode === 'preview' ? <p className={styles.line}>A preview — your choice isn’t saved.</p> : mode === 'studio' ? <p className={styles.line}>The client taps an option, adds a note if they like, and confirms — or says none of these work.</p> : null}
        </div>
      ) : declined && choice.answer ? (
        <div className={styles.foot} data-testid="portal-choice-declined">
          <p className={styles.chosenLine}>
            <span className={styles.chosenGlyph}><Icon name="chat" size={20} /></span>
            {answerLine(choice.answer.kind, choice.answer.mine || !choice.answer.person ? 'You' : choice.answer.person, day(choice.answer.at))}
          </p>
          {choice.answer.note ? <p className={styles.line}>{`“${choice.answer.note}”`}</p> : null}
          <p className={styles.line}>{choice.answer.kind === 'reject' ? 'Your designer has your answer and will be in touch.' : 'Your designer will come back to you with other options.'}</p>
        </div>
      ) : choice.chosen ? (
        <div className={styles.foot}>
          <p className={styles.chosenLine} data-testid="portal-choice-chosen">
            <span className={styles.chosenGlyph}><Icon name="check_circle" size={20} /></span>
            {/* (fix-F, F-03) someone else from the household's pick under their own name — "You" only for the reader's */}
            {choice.chosen.by === 'client' ? `${pickerOf(choice.chosen)} chose ${chosen?.name ?? 'an option'} on ${day(choice.chosen.at)}` : `Chosen with ${choice.chosen.member ?? 'your designer'} on ${day(choice.chosen.at)} — ${chosen?.name ?? 'an option'}`}
          </p>
          {choice.chosen.note ? <p className={styles.line}>{`${choice.chosen.by === 'client' && choice.chosen.mine === false && choice.chosen.person ? `${choice.chosen.person}’s` : 'Your'} note: “${choice.chosen.note}”`}</p> : null}
          {contact?.phone ? (
            <p className={styles.line}>
              {'To change it, '}
              <a className={styles.link} href={waLink(contact.phone, `Hi${contact.name ? ` ${contact.name}` : ''}, it’s ${clientName ?? 'me'}. About ${choice.title.toLowerCase()} — `)} target="_blank" rel="noreferrer">
                {contact.name ? `message ${contact.name} on WhatsApp` : contact.label ? `${contact.label.charAt(0).toLowerCase()}${contact.label.slice(1)}` : 'message your designer on WhatsApp'}
              </a>.
            </p>
          ) : contact ? <p className={styles.line}>To change it, ask your designer.</p> : null}
          {/* (gaps build D, item 7) the pick's receipt, printable — in Files › Documents too */}
          {choice.receiptHref ? <p className={styles.line}><a className={styles.link} href={choice.receiptHref} data-testid="portal-choice-receipt">See your selection receipt</a></p> : null}
        </div>
      ) : null}
      <Dialog open={noOpen} onClose={() => { if (!busy) setNoOpen(false) }} title="None of these work?" size="form" width={400} closeOnScrim={false}
              subtitle={`Tell your designer about ${choice.title.toLowerCase()}. They see your answer straight away.`}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setNoOpen(false)} isDisabled={busy}>Cancel</Button><Button onPress={() => { void sendNo() }} isDisabled={busy || mode !== 'client'} data-testid="portal-choice-none-send">{busy ? 'Sending…' : 'Send'}</Button></>}>
        <div className={styles.noFields}>
          <Chips label="Your answer" options={CHOICE_ANSWERS.map((a) => ({ value: a.key, label: a.label }))} value={noKind} onChange={(v) => setNoKind(v as ChoiceAnswer)} testId="portal-choice-none-kind" />
          <p className={styles.line}>{CHOICE_ANSWERS.find((a) => a.key === noKind)?.help}.</p>
          <TextArea label={answerAsk(noKind)} value={noNote} onChange={(v: string) => setNoNote(v)} maxLength={DECLINE_NOTE_MAX}
                    isInvalid={noTried && !noNote.trim()} errorMessage={noTried && !noNote.trim() ? answerNeedsWhy(noKind) : undefined} data-testid="portal-choice-none-note" />
          {mode === 'preview' ? <p className={styles.line}>A preview — your answer isn’t saved.</p> : null}
        </div>
      </Dialog>
    </section>
  )
}
