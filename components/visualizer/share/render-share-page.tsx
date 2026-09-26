'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button, TextArea } from '@/components/ds'
import { CompareSlider } from '@/components/om/compare-slider'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { TextField } from '@/components/om/text-field'
import { useSheetLayout } from '@/components/om/sheet'
import { useMediaQuery } from '@/lib/breakpoint'
import { displayDate, isSgPhone, phoneDigits, phoneLocal, phoneTyped } from '@/lib/format'
import type { Pin, PublicShare } from '@/lib/visualizer/queries'
import { DraftPin, PinThread } from '@/components/visualizer/editor/pin-card'
import { askCallBack, clientPin, clientReply, leaveNote, pickFavourite, stampShareView } from '@/app/renders/actions'
import { clientRoomNames, roomsInSentence } from '@/lib/visualizer/outputs'
import styles from './render-share-page.module.css'

type V = PublicShare['versions'][number]
/** What an answer the server refused carries (app/renders/actions.ts): the link closed, or the design / pin left it since the page loaded. */
type Refusal = { error: string; closed?: 'stopped' | 'expired'; gone?: true }
type Refused = (r: Refusal) => void

/**
 * (round 1) A refused answer: a closed link reloads the page into its notice, a design or pin that left the link reloads the page without
 * it — and the snackbar says so in the sender's name, as the page does ("ask Dane"), never "your designer". (wave E, E10) The name as the
 * studio keeps it — "Hui Min", never cut to its first word.
 */
function useRefused(sender: string): Refused {
  const router = useRouter()
  const snack = useSnackbar()
  return useCallback((r: Refusal) => {
    if (r.closed || r.gone) router.refresh()
    const message = r.closed === 'expired' ? `This link has ended — ask ${sender} for a new one.`
      : r.closed ? `This link is no longer active — ask ${sender} for an updated one.` : r.error
    snack({ message })
  }, [router, snack, sender])
}

/** (round 1) The notes' times in the pins' words ("just now", "19 min ago", "yesterday") — one time style on a card. */
function said(ms: number, now: number) {
  const m = Math.round((now - ms) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : d < 7 ? `${d} days ago` : displayDate(new Date(ms))
}

/**
 * (round 1) While a pin's sheet is open on a phone, the snackbars rest above it — the house offset (`--bottom-dock`, REG-302) is the
 * sheet's height while it shows, and given back when it closes — so a "Thanks" never covers the sheet's Cancel, Pin it or Reply.
 */
function useSnackAboveSheet(open: boolean) {
  useEffect(() => {
    if (!open) return
    const css = document.documentElement.style
    let raf = 0, ro: ResizeObserver | null = null
    const write = (el: HTMLElement) => css.setProperty('--bottom-dock', `${Math.max(0, Math.round(el.offsetHeight + 8 - 16))}px`)
    const find = () => {
      const el = document.querySelector<HTMLElement>('[data-testid="viz-pin-draft"], [data-testid="viz-pin-thread"]')?.closest<HTMLElement>('[aria-modal="true"]')
      if (!el) { raf = requestAnimationFrame(find); return }
      write(el)
      ro = new ResizeObserver(() => write(el)); ro.observe(el)
    }
    raf = requestAnimationFrame(find)
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); css.removeProperty('--bottom-dock') }
  }, [open])
}

/**
 * The client's link (REG-676, Q-14 · Q-15 · Q-16; 1.0's `/renders/[token]` homeowner page, A E-04…E-20, on 2.0's signing-page frame):
 * the studio's letterhead, the note it came with, then each design as the studio made it — before and after, what changed — with
 * *I like this one*, a note, and pins on the picture; at the foot, *Ask for a call back*. Everything the client says lands on the lead.
 */
export function RenderSharePage({ data }: { data: PublicShare }) {
  const snack = useSnackbar()
  const [fav, setFav] = useState(data.favourite)
  const first = data.lead?.name.split(' ')[0] ?? null
  /* (F102 · F103) the client's words: rooms without "sketch", in the design's order, joined as a sentence ("living room, bedroom and kitchen");
     (round 1) the editor's "2" goes when the link has one room of that name, and the headline says the rooms as the WhatsApp preview does */
  const rooms = [...new Set(data.versions.map((v) => v.clientRoom))]
  const words = clientRoomNames(rooms)
  /* (wave E, E10) the member as the studio names them — members are kept by the name the studio uses ("Dane", "Hui Min"), so the whole
     name, never its first word ("Hui will call you back") */
  const sender = data.sender?.trim() || data.studio.name
  const refused = useRefused(sender)
  /* (wave E, desktop-12) a mouse clicks, a finger taps — the editor's words */
  const tap = useMediaQuery('(hover: none)') ? 'Tap' : 'Click'
  useSeenOnce(data.token)
  useFreshOnReturn()
  const like = async (key: string) => {
    if (key === fav) return   // (F163) already the favourite — nothing to send again
    const was = fav
    setFav(key)
    const r: { ok: true } | Refusal = await pickFavourite(data.token, key).catch(() => ({ error: 'Couldn’t save that — please try again' }))
    if ('error' in r) { setFav(was); refused(r); return }
    snack({ message: `Thanks — ${sender} will see it’s your favourite` })
  }
  return (
    <div className={styles.page} data-testid="render-share">
      <Letterhead data={data} />
      <main className={styles.body}>
        <section className={styles.intro}>
          <span className={styles.eyebrow}>{first ? `For ${first}` : 'Design ideas'}</span>
          <h1 className={styles.title}>{data.versions.length === 1 ? 'A design idea' : `${data.versions.length} design ideas`} for your {roomsInSentence(rooms.map((r) => words.get(r) ?? r))}</h1>
          {data.message ? <blockquote className={styles.message}><p>{data.message}</p><cite>{data.sender ?? data.studio.name}, {data.studio.name}</cite></blockquote>
            : data.sender ? <p className={styles.byline} data-testid="render-share-sender">From {data.sender}, {data.studio.name}</p> : null}
          <p className={styles.how}><Icon name="star" size={18} weight={300} /><span>{tap} <b>I like this one</b> on your favourite, pin a note on anything you’d change, or ask {sender} to call you.</span></p>
          {data.gone ? <p className={styles.gone} role="note">{data.gone === 1 ? 'One design' : `${data.gone} designs`} {sender} shared earlier {data.gone === 1 ? 'is' : 'are'} no longer on this link.</p> : null}
        </section>
        {rooms.map((room) => (
          <section key={room} className={styles.room} aria-label={words.get(room) ?? room}>
            {rooms.length > 1 ? <h2 className={styles.roomName}>{words.get(room) ?? room}</h2> : null}
            {data.versions.filter((v) => v.clientRoom === room).map((v) => (
              <VersionCard key={v.key} v={v} token={data.token} favourite={fav === v.key} onLike={() => { void like(v.key) }} sender={sender} tap={tap} refused={refused}
                           pins={data.pins.filter((p) => p.key === v.key).map(asTheClient)} notes={data.notes.filter((n) => n.versionKey === v.key)} now={data.now} />
            ))}
          </section>
        ))}
        <CallBack data={data} sender={sender} refused={refused} />
        <footer className={styles.foot}>
          <span>{data.studio.name}</span>
          {data.studio.phone ? <a href={`tel:+65${phoneDigits(data.studio.phone)}`}>{`+65 ${phoneLocal(data.studio.phone)}`}</a> : null}
          {data.studio.email ? <a href={`mailto:${data.studio.email}`}>{data.studio.email}</a> : null}
          <span>This link is open until {displayDate(new Date(data.expiresAt))}</span>
        </footer>
      </main>
    </div>
  )
}

/**
 * (F094 · F199) The client opened the link — counted once per visit, from the browser: never while the page renders (every answer the
 * client gives re-renders it), once per tab (a reload is the same visit), and once under StrictMode's double mount. Storage that throws
 * (a private window) still counts the visit once. (round 1) The studio's own look — *Open the link* in Share with client, which adds
 * `?preview=1` — is not the client opening it, and never counts.
 */
function useSeenOnce(token: string) {
  const stamped = useRef(false)
  useEffect(() => {
    if (stamped.current) return
    stamped.current = true
    if (new URLSearchParams(window.location.search).get('preview') === '1') return
    const key = `om.renders.seen.${token}`
    try { if (window.sessionStorage.getItem(key)) return; window.sessionStorage.setItem(key, '1') } catch { /* no storage — count this visit */ }
    void stampShareView(token).catch(() => undefined)
  }, [token])
}

/**
 * (critic §24) The studio's replies reach the client without a reload: coming back to the tab (from WhatsApp, say) reads the link again —
 * new replies on the pins, a stopped link's notice. At most every 20 s; what the client is typing stays (a refresh keeps the page's state).
 */
function useFreshOnReturn() {
  const router = useRouter()
  const last = useRef(0)
  useEffect(() => {
    const again = () => {
      if (document.visibilityState !== 'visible') return
      const t = Date.now()
      if (t - last.current < 20_000) return
      last.current = t
      router.refresh()
    }
    last.current = Date.now()
    window.addEventListener('focus', again)
    document.addEventListener('visibilitychange', again)
    return () => { window.removeEventListener('focus', again); document.removeEventListener('visibilitychange', again) }
  }, [router])
}

export function Letterhead({ data, state }: { data: Pick<PublicShare, 'studio' | 'expiresAt'>; state?: 'open' | 'closed' }) {
  return (
    <header className={styles.top}>
      <span className={styles.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {data.studio.logo ? <img className={styles.logo} src={data.studio.logo} alt="" /> : null}
        <span className={styles.studio}>{data.studio.name}</span>
      </span>
      {state !== 'closed' ? <span className={styles.open}><Icon name="schedule" size={16} weight={300} />Open until {displayDate(new Date(data.expiresAt))}</span> : null}
    </header>
  )
}

/** (audit 2026-09-26, files-11) On the client's own page their pins and replies are theirs: "You", not the lead's name with a "Client" tag
    (the server keeps the lead's name for the studio's view; D1 means every thread here was started by the client). */
const asTheClient = (p: Pin): Pin => ({
  ...p,
  authorName: p.authorRole === 'client' ? 'You' : p.authorName,
  comments: p.comments.map((c) => (c.authorRole === 'client' ? { ...c, authorName: 'You' } : c)),
})

function VersionCard({ v, token, favourite, onLike, pins, notes, now, sender, tap, refused }: { v: V; token: string; favourite: boolean; onLike: () => void; pins: Pin[]; notes: PublicShare['notes']; now: number; sender: string; tap: 'Tap' | 'Click'; refused: Refused }) {
  const snack = useSnackbar()
  const sheet = useSheetLayout()
  const [compare, setCompare] = useState(false)
  const [pinning, setPinning] = useState(false)
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [writing, setWriting] = useState(false)
  const [busy, setBusy] = useState(false)
  const at = (e: RPointerEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) } }
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    /* a pin card that opens as a sheet on a phone is portalled out of the photo, but React still bubbles its presses here — only the picture places a pin */
    if (!pinning || !e.currentTarget.contains(e.target as Node) || (e.target as HTMLElement).closest('button, [data-card], textarea')) return
    e.preventDefault(); setActive(null); setDraft(at(e))
  }
  const savePin = async (body: string) => {
    if (!draft) return false
    const r: { id: string } | Refusal = await clientPin(token, v.key, draft.x, draft.y, body).catch(() => ({ error: 'Couldn’t pin it — please try again' }))
    if ('error' in r) { refused(r); return false }
    /* (F094) the action's own revalidation brings the pin back — no second render. (round 1) On a phone the sheet closes on the new pin —
       its thread would only repeat what the client just wrote, over the photo; a press on the pin opens it. */
    setDraft(null); setPinning(false); setActive(sheet ? null : r.id)
    snack({ message: `Pinned — ${sender} will see it` })
    return true
  }
  const sendNote = async () => {
    if (!note.trim() || busy) return
    setBusy(true)
    const r: { ok: true } | Refusal = await leaveNote(token, v.key, note).catch(() => ({ error: 'Couldn’t send the note — please try again' }))
    setBusy(false)
    if ('error' in r) { refused(r); return }
    setNote(''); setWriting(false)
    snack({ message: `Sent — ${sender} will see it` })
  }
  const activePin = active ? pins.find((p) => p.id === active) ?? null : null
  useSnackAboveSheet(sheet && !compare && (!!draft || !!activePin))
  const tools = 3 + (v.beforeUrl ? 1 : 0)
  /* (F103) the client's words — "Design 2 · Golden Hour" — never the studio's strip shorthand ("Walls, Floor +1") */
  const [lead, ...rest] = v.clientLabel.split(' · ')
  const tail = rest.join(' · ')
  return (
    <article className={styles.card} data-favourite={favourite || undefined} data-testid="render-share-version">
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}><b>{lead}</b>{tail ? ` · ${tail}` : ''}</span>
        {favourite ? <span className={styles.favBadge}><Icon name="star" size={16} fill />Your favourite</span> : null}
      </div>
      <div className={styles.media} data-pinning={pinning || undefined} onPointerDown={onDown}>
        {compare && v.beforeUrl ? <CompareSlider className={styles.fill} before={v.beforeUrl} after={v.imageUrl} beforeLabel="Before" afterLabel="After" />
          // eslint-disable-next-line @next/next/no-img-element
          : <img className={styles.photo} src={v.imageUrl} alt={`${v.clientRoom} · ${v.clientLabel}`} draggable={false} />}
        {!compare ? pins.map((p, i) => (
          <button key={p.id} type="button" className={styles.pin} data-role={p.authorRole} data-resolved={p.status === 'resolved' || undefined} data-active={active === p.id || undefined}
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} aria-label={`Pin ${i + 1}: ${p.body}`} onClick={(e) => { e.stopPropagation(); setDraft(null); setActive((a) => (a === p.id ? null : p.id)) }}>{i + 1}</button>
        )) : null}
        {/* (round 1) on a phone the sheet covers the photo, so it shows the spot on a small copy of the picture — the editor's sheet does the same */}
        {!compare && activePin ? <PinThread pin={activePin} index={pins.indexOf(activePin)} now={now} image={v.imageUrl} onDelete={null} onClose={() => setActive(null)}
                                            onReply={async (b) => { const r: { ok: true } | Refusal = await clientReply(token, activePin.id, b).catch(() => ({ error: 'Couldn’t send the reply — please try again' })); if ('error' in r) { refused(r); return false } return true }} /> : null}
        {!compare && draft ? <DraftPin x={draft.x} y={draft.y} image={v.imageUrl} onSave={savePin} onCancel={() => setDraft(null)} label="What would you change here?" hint={`${sender} sees it straight away`} /> : null}
        {pinning && !draft ? <span className={styles.pinHint} role="status"><Icon name="push_pin" size={16} weight={300} />{tap} the picture where you’d like a change</span> : null}
      </div>
      <div className={styles.tools} data-n={tools}>
        <Button appearance={favourite ? 'filled' : 'outlined'} variant={favourite ? 'primary' : 'secondary'} iconStart={<Icon name="star" size={20} fill={favourite} weight={300} />} onPress={onLike} aria-pressed={favourite} data-testid="render-share-like">{favourite ? 'Your favourite' : 'I like this one'}</Button>
        {v.beforeUrl ? <Button appearance="outlined" variant="secondary" iconStart={<Icon name="compare" size={20} weight={300} />} onPress={() => { setCompare((c) => !c); setPinning(false); setDraft(null) }}>{compare ? 'Show the design' : 'Before and after'}</Button> : null}
        <Button appearance="text" iconStart={<Icon name="push_pin" size={20} weight={300} />} onPress={() => { setPinning((p) => !p); setCompare(false); setDraft(null); setActive(null) }} data-testid="render-share-pin">{pinning ? 'Stop pinning' : 'Pin a note'}</Button>
        <Button appearance="text" iconStart={<Icon name="comment" size={20} weight={300} />} onPress={() => setWriting((w) => !w)}>Leave a note</Button>
      </div>
      {v.materials.length ? (
        <div className={styles.lines} aria-label="What changed">
          {v.materials.map((m, i) => <div key={i} className={styles.line}><span>{m.label}</span><span>{m.material}</span></div>)}
        </div>
      ) : null}
      {notes.length ? (
        <div className={styles.notes}>
          {notes.map((n) => <div key={n.id} className={styles.said}><span className={styles.saidWho}>You · {said(n.createdAt, now)}</span>{n.message}</div>)}
        </div>
      ) : null}
      {writing ? (
        <div className={styles.write}>
          <TextArea label="Your note" placeholder="e.g. Love the floor — could the walls be a little warmer?" value={note} onChange={(x: string) => setNote(x)} autoFocus />
          <span className={styles.writeActions}><Button appearance="outlined" variant="secondary" onPress={() => { setWriting(false); setNote('') }}>Cancel</Button><Button isDisabled={!note.trim() || busy} onPress={() => { void sendNote() }} data-testid="render-share-send-note">{busy ? 'Sending…' : 'Send'}</Button></span>
        </div>
      ) : null}
    </article>
  )
}

function CallBack({ data, sender, refused }: { data: PublicShare; sender: string; refused: Refused }) {
  const [phone, setPhone] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const [done, setDone] = useState(data.calledBack)
  /* (F099) a lead's link: the studio has the client's number, so the box is for a different one; a link with no lead needs one */
  const needsPhone = !data.hasLead
  const bad = needsPhone ? !isSgPhone(phone) : !!phone && !isSgPhone(phone)
  const send = async () => {
    setTried(true)
    if (bad) return
    setBusy(true)
    const r: { ok: true } | Refusal = await askCallBack(data.token, phone, msg).catch(() => ({ error: 'Couldn’t send that — please try again' }))
    setBusy(false)
    if ('error' in r) { refused(r); return }
    setDone(true)
  }
  if (done) return (
    <section className={styles.call} data-done="" data-testid="render-share-called">
      <span className={styles.callGlyph}><Icon name="check_circle" size={28} weight={300} /></span>
      <div><h2 className={styles.callTitle}>{sender} will call you back</h2><p className={styles.callText}>We’ve let {data.studio.name} know. You can keep picking favourites and pinning notes meanwhile.</p></div>
    </section>
  )
  return (
    <section className={styles.call} data-testid="render-share-call">
      <span className={styles.callGlyph}><Icon name="call" size={28} weight={300} /></span>
      <div className={styles.callBody}>
        <h2 className={styles.callTitle}>Want to talk it through?</h2>
        <p className={styles.callText}>{needsPhone ? `Leave your number and ${sender} will call you back.` : `${sender} will call you back on the number they have for you.`}</p>
        <div className={styles.callFields}>
          <TextField label={needsPhone ? 'Your phone number' : 'A different number (optional)'} value={phoneTyped(phone)} onChange={(x) => setPhone(phoneDigits(x).slice(0, 8))} type="tel" inputMode="tel" numeric="digits" error={tried && bad ? 'Enter a Singapore number — 8 digits starting with 6, 8 or 9' : undefined} />
          <TextArea label="Anything to mention? (optional)" value={msg} onChange={(x: string) => setMsg(x)} />
        </div>
        <span><Button isDisabled={busy} onPress={() => { void send() }} iconStart={<Icon name="call" size={20} weight={300} />} data-testid="render-share-callback">{busy ? 'Sending…' : 'Ask for a call back'}</Button></span>
      </div>
    </section>
  )
}

/**
 * A link that has ended or been stopped, or never existed: the letterhead and one notice — no pictures (1.0 showed a bare error). (F112)
 * It speaks in the sender's name, as the open page does ("ask Dane"), with the studio's number to call — (wave E, E10) the whole name
 * ("ask Hui Min at Demo Studio").
 */
export function RenderLinkClosed({ studio, state, expiresAt, sender = null }: { studio: PublicShare['studio']; state: 'expired' | 'stopped' | 'gone'; expiresAt: number | null; sender?: string | null }) {
  const who = sender?.trim() ? `${sender.trim()} at ${studio.name}` : studio.name
  return (
    <div className={styles.page} data-testid="render-share" data-state={state}>
      <Letterhead data={{ studio, expiresAt: expiresAt ?? 0 }} state="closed" />
      <div className={styles.notice} role="status" data-testid="render-share-closed">
        <span className={styles.callGlyph}><Icon name={state === 'expired' ? 'schedule' : 'lock'} size={32} weight={300} /></span>
        <h1 className={styles.noticeTitle}>{state === 'expired' ? 'This link has ended' : 'This link is no longer active'}</h1>
        <p className={styles.callText}>{state === 'expired' && expiresAt ? `It was open until ${displayDate(new Date(expiresAt))}. ` : ''}Please ask {who} for an updated link.</p>
        {studio.phone ? <a className={styles.noticeLink} href={`tel:+65${phoneDigits(studio.phone)}`}><Icon name="call" size={18} weight={300} />{`+65 ${phoneLocal(studio.phone)}`}</a> : null}
      </div>
    </div>
  )
}
