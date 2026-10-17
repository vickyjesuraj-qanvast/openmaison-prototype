'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button, TextArea } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Dialog } from '@/components/om/dialog'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { useSnackbar } from '@/components/om/snackbar'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line, Slot, Words, phoneOnly } from '@/components/shell/ghost-kit'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import type { ClientMeeting, ClientNotes, ClientWhere } from '@/lib/meetings/client'
import { answerMeetingInvite, recordMeetingView } from '@/app/meeting/actions'
import { ANSWER_NOTE_MAX } from './client-notes'
import sign from '@/components/contracts/sign/signing-page.module.css'
import styles from './meeting-link-page.module.css'

/**
 * (pending modules S23 — Meetings and the Meeting Co-Pilot; her "build all of them" 2026-10-11; the held card's "the client's meeting email",
 * 1.0's unmerged Google Calendar branch's RSVP page and its 24-hour share links) The client's meeting link, as they open it from WhatsApp or the
 * studio's email: the client links' letterhead bar (the studio's name, never the platform's) and one column.
 *   Before the meeting — "Your {aim} with {studio}", the day and time, where (an address opens Google Maps, a call's link opens the call),
 *   Add to calendar ▾ (Google Calendar's own page filled in · the invite file for Apple Calendar, Outlook and the rest) and "Can you make it?":
 *   I'll be there (the one filled button) · The time doesn't suit (what suits them, optional). The answer is said back with Change.
 *   After it, shared — "Notes from our meeting": the summary, what's next, a rough guide (when ticked) and the mood boards (when ticked).
 *   After it, not shared — a thank-you and nothing else. Cancelled — who will be in touch. A closed link is the house notice (LinkGone).
 * Viewed is the page's first ask from a browser that ran it (never the server render a chat app fetches for its card). "Message …" opens
 * WhatsApp on the press. Every word is invented copy unless it is the house's (pending modules S23) (invented copy).
 */
export function MeetingLinkPage({ data }: { data: ClientMeeting }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [answer, setAnswer] = useState(data.answer)
  const [note, setNote] = useState(data.answerNote)
  const [changing, setChanging] = useState(false)
  const [busy, setBusy] = useState<'yes' | 'no' | null>(null)
  const [noOpen, setNoOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [calOpen, setCalOpen] = useState(false)
  const calAnchor = useRef<HTMLSpanElement>(null)

  /* (S04's rule) Viewed: once, from the browser — a chat app drawing the link's card runs no script */
  useEffect(() => { void recordMeetingView(data.token).catch(() => {}) }, [data.token])

  const send = async (a: 'yes' | 'no', text?: string) => {
    if (busy) return
    setBusy(a)
    try {
      const r = await answerMeetingInvite(data.token, { answer: a, note: text })
      /* a refusal is the rule changing under the client (cancelled, started, the link stopped): say it, close the form, and draw the page as it is now */
      if ('error' in r) { snackbar({ message: couldnt('send your answer', refusalOf(r.error)) }); setNoOpen(false); setChanging(false); router.refresh(); return }
      setAnswer(r.answer); setNote(r.note); setChanging(false); setNoOpen(false)
    } catch { snackbar({ message: couldnt('send your answer') }) } finally { setBusy(null) }
  }
  const message = () => { if (data.contact) window.open(`https://wa.me/${data.contact.to}?text=${encodeURIComponent(data.contact.text)}`, '_blank', 'noopener') }
  const contact = data.contact ? (
    <span className={styles.contact}>
      <Button appearance="text" iconStart={<Icon name="chat" size={20} />} onPress={message} data-testid="meeting-link-message">{`Message ${data.contact.name}`}</Button>
    </span>
  ) : null

  return (
    <div className={`${sign.page} ${styles.root}`} data-testid="meeting-link" data-state={data.state}>
      <Letterhead studio={data.studio} logo={data.logo} />
      {data.state === 'cancelled' ? (
        <main className={styles.body}>
          <div className={sign.notice} role="status" data-testid="meeting-link-cancelled">
            <span className={sign.uploadedGlyph}><Icon name="event" size={32} /></span>
            <h1 className={sign.noticeTitle}>This meeting was cancelled</h1>
            <p className={sign.uploadedHelp}>{`${data.name} will be in touch.`}</p>
          </div>
        </main>
      ) : data.state === 'held' && !data.notes ? (
        <main className={styles.body}>
          <div className={sign.notice} data-testid="meeting-link-thanks">
            <span className={sign.uploadedGlyph}><Icon name="check_circle" size={32} /></span>
            <h1 className={sign.noticeTitle}>{data.date ? `Thank you for meeting us on ${data.date}` : 'Thank you for meeting us'}</h1>
          </div>
        </main>
      ) : data.state === 'held' && data.notes ? (
        <main className={styles.body}>
          <Notes title={data.title} date={data.date} notes={data.notes} contact={contact} />
        </main>
      ) : (
        <main className={styles.body}>
          <div className={styles.column}>
            <section className={styles.card} aria-labelledby="meeting-heading" data-testid="meeting-link-invite">
              <span className={sign.eyebrow}>Meeting invitation</span>
              <h1 id="meeting-heading" className={sign.cardTitle}>{data.heading}</h1>
              <ul className={styles.facts}>
                <li className={styles.fact}><span className={styles.factIcon}><Icon name="event" size={20} /></span><span className={styles.factText} data-testid="meeting-link-when">{data.when}</span></li>
                {data.where ? <WhereFact where={data.where} /> : null}
              </ul>
              {data.calendar && answer !== 'no' ? (
                <>
                  <span ref={calAnchor} className={styles.trigger}>
                    <Button variant="secondary" appearance="outlined" iconStart={<Icon name="calendar_add_on" size={20} />}
                            iconEnd={<span className={styles.chev} data-open={calOpen || undefined}><Icon name="keyboard_arrow_down" size={20} /></span>}
                            aria-haspopup="menu" aria-expanded={calOpen} onPress={() => setCalOpen((o) => !o)} data-testid="meeting-link-calendar">Add to calendar</Button>
                  </span>
                  <PortalMenu open={calOpen} anchor={calAnchor} onClose={() => setCalOpen(false)} role="menu" width={MENU_WIDTH.detail} sheetTitle="Add to calendar">
                    <DropdownItem help="Opens Google Calendar with it filled in" onSelect={() => { setCalOpen(false); if (data.calendar) window.open(data.calendar.google, '_blank', 'noopener') }}>Google Calendar</DropdownItem>
                    <DropdownItem help="For Apple Calendar, Outlook and others" onSelect={() => { setCalOpen(false); if (data.calendar) window.location.assign(data.calendar.ics) }}>Download the invite (.ics)</DropdownItem>
                  </PortalMenu>
                </>
              ) : null}
              {data.answerable || answer ? <hr className={styles.rule} /> : null}
              {answer ? (
                <div className={styles.ask} data-testid="meeting-link-answer" data-answer={answer}>
                  <p className={styles.said} data-answer={answer}>
                    <span className={styles.saidIcon}><Icon name={answer === 'yes' ? 'check_circle' : 'schedule'} size={20} /></span>
                    <span className={styles.saidWords}>
                      {answer === 'yes' ? `You told ${data.name} you’ll be there` : `You told ${data.name} the time doesn’t suit`}
                      {data.answerable && !changing ? <>{' · '}<button type="button" className={styles.change} onClick={() => setChanging(true)} data-testid="meeting-link-change">Change</button></> : null}
                    </span>
                  </p>
                  {answer === 'no' && note ? <p className={styles.note}>{`“${note}”`}</p> : null}
                  {changing && data.answerable ? <Answers busy={busy} onYes={() => { void send('yes') }} onNo={() => { setDraft(note ?? ''); setNoOpen(true) }} onCancel={() => setChanging(false)} /> : null}
                </div>
              ) : data.answerable ? (
                <div className={styles.ask} data-testid="meeting-link-ask">
                  <h2 className={styles.askTitle}>Can you make it?</h2>
                  <Answers busy={busy} onYes={() => { void send('yes') }} onNo={() => { setDraft(''); setNoOpen(true) }} />
                </div>
              ) : null}
              {contact}
            </section>
          </div>
        </main>
      )}
      <Dialog open={noOpen} onClose={() => { if (!busy) setNoOpen(false) }} title="The time doesn’t suit" size="form" width={400} closeOnScrim={false}
              footer={<><Button variant="secondary" appearance="outlined" isDisabled={!!busy} onPress={() => setNoOpen(false)}>Cancel</Button><Button isDisabled={!!busy} onPress={() => { void send('no', draft) }} data-testid="meeting-link-no-send">{busy === 'no' ? 'Sending…' : 'Send'}</Button></>}>
        <TextArea label={`Tell ${data.name} what suits you (optional)`} value={draft} onChange={(v: string) => setDraft(v)} maxLength={ANSWER_NOTE_MAX} autoFocus data-testid="meeting-link-no-note" />
      </Dialog>
    </div>
  )
}

/** "I'll be there" (the one filled button) · "The time doesn't suit" — and, while changing an answer, Cancel. */
function Answers({ busy, onYes, onNo, onCancel }: { busy: 'yes' | 'no' | null; onYes: () => void; onNo: () => void; onCancel?: () => void }) {
  return (
    <div className={styles.actions}>
      <Button isDisabled={!!busy} onPress={onYes} data-testid="meeting-link-yes">{busy === 'yes' ? 'Sending…' : 'I’ll be there'}</Button>
      <Button variant="secondary" appearance="outlined" isDisabled={!!busy} onPress={onNo} data-testid="meeting-link-no">The time doesn’t suit</Button>
      {onCancel ? <Button variant="secondary" appearance="text" isDisabled={!!busy} onPress={onCancel}>Cancel</Button> : null}
    </div>
  )
}

/** Where: in person or at the showroom (the address opens Google Maps in a new tab) · a video call (its web link opens the call). */
function WhereFact({ where }: { where: ClientWhere }) {
  const glyph = where.kind === 'video' ? 'link' : where.kind === 'showroom' ? 'storefront' : 'directions'
  return (
    <li className={styles.fact} data-testid="meeting-link-where" data-kind={where.kind}>
      <span className={styles.factIcon}><Icon name={glyph} size={20} /></span>
      <span className={styles.factText}>
        <span>{where.label}</span>
        {where.place ? (where.href ? (
          <a className={styles.placeLink} href={where.href} target="_blank" rel="noopener noreferrer" data-testid="meeting-link-place">
            <span className={styles.placeWords}>{where.place}</span><span className={styles.placeGlyph}><Icon name="open_in_new" size={16} /></span>
          </a>
        ) : <span className={styles.factSub}>{where.place}</span>) : null}
      </span>
    </li>
  )
}

/** The notes the studio shared: the summary and what's next, then — when ticked — a rough guide and the mood boards. */
function Notes({ title, date, notes, contact }: { title: string | null; date: string | null; notes: ClientNotes; contact: ReactNode }) {
  return (
    <div className={styles.column} data-testid="meeting-link-notes">
      <section className={styles.card} aria-labelledby="meeting-notes-heading">
        {title ? <span className={sign.eyebrow}>{title}</span> : null}
        <h1 id="meeting-notes-heading" className={sign.cardTitle}>{`Notes from our meeting${date ? ` · ${date}` : ''}`}</h1>
        {notes.summary ? <p className={styles.text} data-testid="meeting-link-summary">{notes.summary}</p> : null}
        {notes.next.length ? (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>What’s next</h2>
            <ul className={styles.steps} data-testid="meeting-link-next">{notes.next.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        ) : null}
        {contact}
      </section>
      {notes.estimate ? (
        <section className={styles.card} aria-labelledby="meeting-guide-heading" data-testid="meeting-link-estimate">
          <h2 id="meeting-guide-heading" className={styles.sectionTitle}>A rough guide</h2>
          <p className={styles.range}>{notes.estimate.range}</p>
          {notes.estimate.lines.length ? <ul className={styles.works}>{notes.estimate.lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : null}
          <p className={sign.fine}>A rough guide from typical prices — your quote will follow.</p>
        </section>
      ) : null}
      {notes.boards.length ? (
        <section className={styles.card} aria-labelledby="meeting-boards-heading" data-testid="meeting-link-boards">
          <h2 id="meeting-boards-heading" className={styles.sectionTitle}>{notes.boards.length === 1 ? 'Mood board' : 'Mood boards'}</h2>
          <div className={styles.boards}>
            {notes.boards.map((b) => (
              <article key={b.name} className={styles.board} aria-label={b.name}>
                <span className={styles.boardHead} aria-hidden><span className={styles.palette}>{b.palette.map((c, i) => <span key={i} className={styles.swatch} style={{ '--swatch': c } as CSSProperties} />)}</span></span>
                <h3 className={styles.boardName}>{b.name}</h3>
                <p className={styles.boardLine}>{b.line}</p>
                {b.materials.length ? (
                  <ul className={styles.materials}>
                    {b.materials.map((m) => <li key={m.name} className={styles.material}><span className={styles.chip} style={{ '--chip': m.css } as CSSProperties} aria-hidden /><span className={styles.materialName}>{m.name}</span></li>)}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

/** The client links' letterhead bar: the studio's mark and name. */
function Letterhead({ studio, logo }: { studio: string; logo: string | null }) {
  return (
    <header className={sign.top}>
      <span className={sign.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? <img className={sign.logo} src={logo} alt="" /> : null}
        <span className={sign.studio}>{studio}</span>
      </span>
    </header>
  )
}

/**
 * (REG-708) The meeting link's ghost — `loading.tsx` streams it and the page's reveal holds it: the studio's bar, then the card the page opens
 * on. The address says nothing of the meeting's state, so the loader draws the invitation (the link's first and most-opened shape); the reveal
 * is handed the page's own record (`data`) and draws its very shape — the invitation, the notes in their words, or the notice.
 */
export function MeetingLinkGhost({ data }: { data?: ClientMeeting }) {
  const notice = data ? (data.state === 'cancelled' ? { title: 'This meeting was cancelled', help: `${data.name} will be in touch.` } : data.state === 'held' && !data.notes ? { title: data.date ? `Thank you for meeting us on ${data.date}` : 'Thank you for meeting us', help: null } : null) : null
  const notes = data?.state === 'held' ? data.notes : null
  return (
    <GhostSheet label="Loading the meeting">
      <div className={`${sign.page} ${styles.root}`}>
        <div className={sign.top}><span className={sign.brand}><Bone w={120} h={28} r={4} /></span></div>
        <div className={styles.body}>
          {notice ? (
            <div className={sign.notice}>
              <span className={sign.uploadedGlyph}><Bone w={32} h={32} r="50%" /></span>
              <Words as="h2" className={sign.noticeTitle}>{notice.title}</Words>
              {notice.help ? <Words as="p" className={sign.uploadedHelp}>{notice.help}</Words> : null}
            </div>
          ) : notes ? (
            <div className={styles.column}>
              <div className={styles.card}>
                {data?.title ? <Words className={sign.eyebrow}>{data.title}</Words> : null}
                <Words as="h2" className={sign.cardTitle}>{`Notes from our meeting${data?.date ? ` · ${data.date}` : ''}`}</Words>
                {notes.summary ? <Words as="p" className={styles.text}>{notes.summary}</Words> : null}
                {notes.next.length ? <div className={styles.section}><Words as="h2" className={styles.sectionTitle}>What’s next</Words><ul className={styles.steps}>{notes.next.map((x, i) => <li key={i}><Words>{x}</Words></li>)}</ul></div> : null}
                {data?.contact ? <span className={styles.contact}><Slot kind="btn" w={172} /></span> : null}
              </div>
            </div>
          ) : (
            <div className={styles.column}>
              <div className={styles.card}>
                <Words className={sign.eyebrow}>Meeting invitation</Words>
                {data?.heading ? <Words as="h2" className={sign.cardTitle}>{data.heading}</Words> : <span className={styles.ghostTitle}><Line w="78%" lh={24} h={16} /><Line w="44%" lh={24} h={16} className={phoneOnly} /></span>}
                <div className={styles.facts}>
                  <span className={styles.fact}><Bone w={20} h={20} r={4} /><span className={styles.factText}>{data?.when ? <Words>{data.when}</Words> : <Line w={200} lh={20} h={12} />}</span></span>
                  {!data || data.where ? <span className={styles.fact}><Bone w={20} h={20} r={4} /><span className={styles.factText}><Line w={72} lh={20} h={12} /><Line w="64%" lh={20} h={12} /></span></span> : null}
                </div>
                {!data || (data.calendar && data.answer !== 'no') ? <span className={styles.trigger}><Slot kind="btn" w={192} fill /></span> : null}
                {!data || data.answerable || data.answer ? <hr className={styles.rule} /> : null}
                {data?.answer ? <div className={styles.ask}><span className={styles.said}><Bone w={20} h={20} r="50%" /><Line w={240} lh={20} h={12} /></span></div>
                  : !data || data.answerable ? <div className={styles.ask}><Words as="h2" className={styles.askTitle}>Can you make it?</Words><div className={styles.actions}><Slot kind="btn" w={112} fill /><Slot kind="btn" w={184} fill /></div></div> : null}
                {!data || data.contact ? <span className={styles.contact}><Slot kind="btn" w={172} /></span> : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </GhostSheet>
  )
}
