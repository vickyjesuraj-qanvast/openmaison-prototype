'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Chips } from '@/components/om/chips'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { DesignerCard } from '@/components/portfolio/designer-card'
import { bookHangoutChat, readyAtTable, recordHangoutView } from '@/app/hangout/actions'
import { AREAS, BUDGET_BANDS, EMPTY_HOMEOWNER, HOME_STATUSES, KEY_TIMES, STYLES, keyLabel, type HomeownerPrefs } from '@/lib/hangouts/model'
import { PROPERTY_TYPES } from '@/lib/leads/enums'
import { isSgMobile, phoneDigits, phoneTyped } from '@/lib/format'
import { MSG } from '@/lib/forms'
import type { HangoutOwnPage, HangoutPublicPage, PublicStudio } from '@/lib/hangouts/queries'
import { AGAIN_LINE, MOBILE_HELP, READY, bookFine, cancelledLine, closedText, closedTitle, consentLine, messageLine, notesLine, ownChatTitle, ownFine, ownStatus, ownTitle, pageTitle, reviewsLine, tablesFact } from './public-words'
import sign from '@/components/contracts/sign/signing-page.module.css'
import styles from './public.module.css'

export type Open = Extract<HangoutPublicPage, { state: 'open' | 'closed' | 'ended' }>
export type Own = Extract<HangoutOwnPage, { state: 'ok' }>

/** The client links' letterhead bar: the studio's mark and name — never the platform's. */
function Letterhead({ studio }: { studio: PublicStudio }) {
  return (
    <header className={sign.top}>
      <span className={sign.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {studio.logo ? <img className={sign.logo} src={studio.logo} alt="" /> : null}
        <span className={sign.studio}>{studio.name}</span>
      </span>
    </header>
  )
}
const message = (studio: PublicStudio, text: string) => { if (studio.whatsapp) window.open(`https://wa.me/65${studio.whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener') }

/** When · where · tables — the meeting link's facts. */
function EventFacts({ e }: { e: Open['event'] | Own['event'] & { tablesLine?: string | null } }) {
  return (
    <ul className={styles.facts}>
      <li className={styles.fact}><span className={styles.factIcon}><Icon name="event" size={20} /></span><span className={styles.factText}><span>{e.daysLine}</span><span className={styles.factSub}>{e.hoursLine}</span></span></li>
      <li className={styles.fact}><span className={styles.factIcon}><Icon name="directions" size={20} /></span><span className={styles.factText}>
        <a className={styles.placeLink} href={e.mapsHref} target="_blank" rel="noopener noreferrer"><span className={styles.placeWords}>{e.venue}</span><span className={styles.placeGlyph}><Icon name="open_in_new" size={16} /></span></a>
        {e.address ? <span className={styles.factSub}>{e.address}</span> : null}
      </span></li>
      {'tablesLine' in e && e.tablesLine ? <li className={styles.fact}><span className={styles.factIcon}><Icon name="table_restaurant" size={20} /></span><span className={styles.factText}>{tablesFact(e.tablesLine)}</span></li> : null}
    </ul>
  )
}

/**
 * (pending modules S27 — public:hangouts: 1.0's /hangouts/[eventId], the homeowner's page, built as the STUDIO's page — her prompt: "the public
 * page carries the studio's brand, never OpenMaison's, and nothing pretends a homeowner network exists") The studio's page for a Qanvast
 * Hangout, as a homeowner opens it from the studio's WhatsApp or its table's sign: the studio's letterhead; the event — when, where, which
 * tables; **Book a chat** — their name and mobile, when they'll come (the shifts the studio's people are there), their home (1.0's
 * preferences: the home, new or resale, budget, keys, area, styles) and their say-so to be contacted — one filled button; then **who
 * they'll meet**, each designer's public card with their work. A booking is the studio's lead (source Hangout) and opens their own page.
 * 1.0's SMS sign-in is not here: the booking's own link is the key (sign-in is the developers', S30). *(invented copy: every line)*
 */
export function HangoutPublic({ data }: { data: Open }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [f, setF] = useState({ name: '', phone: '', email: '', shiftId: data.shifts.length === 1 ? data.shifts[0]!.id : '', prefs: { ...EMPTY_HOMEOWNER } as HomeownerPrefs, consent: false })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const errors = {
    name: f.name.trim() ? null : 'Tell us your name',
    phone: !f.phone ? 'Enter your mobile number' : !isSgMobile(phoneDigits(f.phone)) ? 'Enter a Singapore mobile number — 8 or 9 first' : null,
    email: f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) ? MSG.email : null,
    shift: f.shiftId ? null : 'Pick when you’ll come',
    type: f.prefs.propertyType ? null : 'Tell us about your home',
    consent: f.consent ? null : `Tick the box to let ${data.studio.name} contact you`,
  }
  const P = (patch: Partial<HomeownerPrefs>) => setF({ ...f, prefs: { ...f.prefs, ...patch } })
  const book = async () => {
    if (busy) return
    if (Object.values(errors).some(Boolean)) { setTried(true); return }
    setBusy(true)
    try {
      const r = await bookHangoutChat(data.token, { name: f.name, phone: f.phone, email: f.email, shiftId: f.shiftId, prefs: f.prefs, consent: f.consent })
      if ('error' in r) { snackbar({ message: couldnt('book the chat', refusalOf(r.error)) }); return }
      router.push(r.again ? `${r.path}?again=1` : r.path)
    } catch { snackbar({ message: couldnt('book the chat') }) } finally { setBusy(false) }
  }
  return (
    <div className={`${sign.page} ${styles.root}`} data-testid="hangout-public" data-state={data.state}>
      <Letterhead studio={data.studio} />
      <main className={styles.body}>
        <div className={styles.column}>
          <section className={styles.card} aria-labelledby="hangout-heading" data-testid="hangout-public-event">
            <span className={sign.eyebrow}>{data.event.name}</span>
            <h1 id="hangout-heading" className={sign.cardTitle}>{pageTitle(data.studio)}</h1>
            {data.event.description ? <p className={styles.text}>{data.event.description}</p> : null}
            <EventFacts e={data.event} />
          </section>

          {data.state === 'open' ? (
            <section className={styles.card} aria-labelledby="hangout-book" data-testid="hangout-book">
              <h2 id="hangout-book" className={styles.sectionTitle}>Book a chat</h2>
              <p className={styles.fine}>{bookFine(data.studio)}</p>
              <div className={styles.form}>
                <TextField label="Your name" required value={f.name} maxLength={80} onChange={(v) => setF({ ...f, name: v })} error={tried ? errors.name ?? undefined : undefined} />
                <TextField label="Mobile" required value={phoneTyped(f.phone)} numeric="digits" maxLength={9} inputMode="tel" onChange={(v) => setF({ ...f, phone: phoneDigits(v) })} error={tried ? errors.phone ?? undefined : undefined} helper={MOBILE_HELP} />
                <TextField label="Email (optional)" value={f.email} maxLength={120} type="email" onChange={(v) => setF({ ...f, email: v })} error={tried ? errors.email ?? undefined : undefined} />
                <div className={styles.ask}>
                  <span className={styles.askLabel}>When you’ll come</span>
                  <Chips label="When you’ll come" testId="book-shift" value={f.shiftId || null} onChange={(v) => setF({ ...f, shiftId: v })} options={data.shifts.map((s) => ({ value: s.id, label: s.line }))} />
                  {tried && errors.shift ? <span className={styles.error} role="alert">{errors.shift}</span> : null}
                </div>
                <TextField label="Your home" required mode="select" searchable options={[...PROPERTY_TYPES]} value={f.prefs.propertyType ?? ''} onChange={(v) => P({ propertyType: v })} error={tried ? errors.type ?? undefined : undefined} />
                <div className={styles.ask}><span className={styles.askLabel}>New, resale or already renovated?</span><Chips label="New, resale or already renovated?" value={f.prefs.status} onChange={(v) => P({ status: v })} options={[...HOME_STATUSES]} /></div>
                <div className={styles.ask}><span className={styles.askLabel}>Your budget</span><Chips label="Your budget" testId="book-budget" value={f.prefs.budget} onChange={(v) => P({ budget: v })} options={BUDGET_BANDS.map((b) => ({ value: b.key, label: b.label }))} /></div>
                <div className={styles.ask}><span className={styles.askLabel}>Your keys</span><Chips label="Your keys" value={f.prefs.keys} onChange={(v) => P({ keys: v })} options={KEY_TIMES.map((k) => ({ value: k, label: keyLabel(k) }))} /></div>
                <div className={styles.ask}><span className={styles.askLabel}>Where it is</span><Chips label="Where it is" value={f.prefs.area} onChange={(v) => P({ area: v })} options={[...AREAS]} /></div>
                <div className={styles.ask}><span className={styles.askLabel}>Styles you like (optional)</span><Chips multiple label="Styles you like" value={f.prefs.styles} onChange={(v) => P({ styles: v.slice(0, 6) })} options={[...STYLES]} /></div>
                <label className={styles.consent} data-testid="book-consent">
                  <Checkbox isSelected={f.consent} onChange={(on: boolean) => setF({ ...f, consent: on })} aria-label={consentLine(data.studio)} />
                  <span>{consentLine(data.studio)}</span>
                </label>
                {tried && errors.consent ? <span className={styles.error} role="alert">{errors.consent}</span> : null}
                <div className={styles.actions}><Button onPress={() => { void book() }} isDisabled={busy} data-testid="book-submit">{busy ? 'Booking…' : 'Book my chat'}</Button></div>
              </div>
            </section>
          ) : (
            <section className={styles.card} data-testid="hangout-closed">
              <h2 className={styles.sectionTitle}>{closedTitle(data)}</h2>
              <p className={styles.text}>{closedText(data)}</p>
              {data.studio.whatsapp ? <span className={styles.contact}><Button appearance="text" iconStart={<Icon name="chat" size={20} />} onPress={() => message(data.studio, `Hi ${data.studio.name}, I saw you at ${data.event.name} and would like to talk about my home.`)}>{messageLine(data.studio)}</Button></span> : null}
            </section>
          )}

          {data.designers.length ? (
            <section className={styles.card} aria-labelledby="hangout-who" data-testid="hangout-designers">
              <h2 id="hangout-who" className={styles.sectionTitle}>Who you’ll meet</h2>
              <div className={styles.designers}>{data.designers.map((d) => <DesignerCard key={d.id} card={d} when={d.when} />)}</div>
              {data.studio.reviewLink || data.studio.whatsapp ? (
                <div className={styles.links}>
                  {data.studio.reviewLink ? <a className={styles.reviews} href={data.studio.reviewLink} target="_blank" rel="noopener noreferrer">{reviewsLine(data.studio)}<Icon name="open_in_new" size={16} /></a> : null}
                  {data.studio.whatsapp && data.state === 'open' ? <Button appearance="text" iconStart={<Icon name="chat" size={20} />} onPress={() => message(data.studio, `Hi ${data.studio.name}, I have a question about ${data.event.name}.`)}>{messageLine(data.studio)}</Button> : null}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </main>
    </div>
  )
}

/**
 * (pending modules S27) A homeowner's own page on the studio's Hangout page — 1.0's meetings step: their chat(s) with the studio — who, when,
 * which table — "I'm at the table" on the day (1.0's "I'm Ready", which starts the chat), the designer's card; once the chat is over, what
 * comes next (by rule from its outcome, never a model's words) and the notes the studio shared (the meeting's own client link). 1.0's
 * voucher progress (Qanvast's rewards across studios, paused in 1.0) is not the studio's to show. *(invented copy: every line)*
 */
export function HangoutOwnView({ data, again }: { data: Own; again: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [busy, setBusy] = useState<string | null>(null)
  useEffect(() => { void recordHangoutView(data.token, data.reg).catch(() => {}) }, [data.token, data.reg])
  const ready = async (id: string) => {
    setBusy(id)
    try {
      const r = await readyAtTable(data.token, data.reg, id)
      if ('error' in r) { snackbar({ message: couldnt('start the chat', refusalOf(r.error)) }); router.refresh(); return }
      router.refresh()
    } catch { snackbar({ message: couldnt('start the chat') }) } finally { setBusy(null) }
  }
  return (
    <div className={`${sign.page} ${styles.root}`} data-testid="hangout-own">
      <Letterhead studio={data.studio} />
      <main className={styles.body}>
        <div className={styles.column}>
          <section className={styles.card} aria-labelledby="own-heading">
            <span className={sign.eyebrow}>{data.event.name}</span>
            <h1 id="own-heading" className={sign.cardTitle}>{ownTitle(data, again)}</h1>
            {again ? <p className={styles.text}>{AGAIN_LINE}</p> : null}
            <EventFacts e={data.event} />
          </section>
          {data.meetings.length ? data.meetings.map((m) => (
            <section key={m.id} className={styles.card} data-testid="own-chat" data-status={m.status}>
              <div className={styles.chat}>
                <h2 className={styles.sectionTitle}>{ownChatTitle(m, data)}</h2>
                <p className={styles.status} data-done={m.status === 'completed' || undefined} data-testid="own-status">
                  <span className={styles.statusIcon}><Icon name={m.status === 'completed' ? 'check_circle' : m.status === 'in-progress' ? 'chat' : 'schedule'} size={20} /></span>
                  <span>{ownStatus(m, data)}</span>
                </p>
                {m.canStart ? (
                  <div className={styles.actions}>
                    <Button onPress={() => { void ready(m.id) }} isDisabled={busy === m.id} data-testid="own-ready">{busy === m.id ? 'Starting…' : READY}</Button>
                  </div>
                ) : ownFine(m, data) ? <p className={styles.fine}>{ownFine(m, data)}</p> : null}
                {m.notesHref ? <a className={styles.reviews} href={m.notesHref} data-testid="own-notes">{notesLine(m)}<Icon name="arrow_forward" size={16} /></a> : null}
                {m.designer ? <DesignerCard card={m.designer} compact={m.status === 'completed'} testId="own-designer" /> : null}
              </div>
            </section>
          )) : (
            <section className={styles.card}><p className={styles.text}>{cancelledLine(data)}</p></section>
          )}
          {data.studio.whatsapp ? <span className={styles.contact}><Button appearance="text" iconStart={<Icon name="chat" size={20} />} onPress={() => message(data.studio, `Hi ${data.studio.name}, it’s ${data.client} — about my chat at ${data.event.name}.`)} data-testid="own-message">{messageLine(data.studio)}</Button></span> : null}
        </div>
      </main>
    </div>
  )
}
