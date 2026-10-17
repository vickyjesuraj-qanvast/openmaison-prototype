'use client'

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject, type SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import { Button, TextArea } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import { useDialogFocus } from '@/components/om/surface'
import { useMediaQuery } from '@/lib/breakpoint'
import { PIN_CHARS } from '@/lib/visualizer/policy'
import type { Pin } from '@/lib/visualizer/queries'
import { useEdgeFade } from './dialogs/use-edge-fade'
import styles from './pin-card.module.css'

const when = (ms: number, now: number) => {
  const m = Math.round((now - ms) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

const noop = () => () => {}
/** True once the page runs in the browser — the floating card portals to <body>, which the server has not got. */
const useClient = () => useSyncExternalStore(noop, () => true, () => false)
/** The cards leave their photo's DOM (a portal, or the phone's sheet) but React still bubbles their events through it — the photo must
 *  not read a press, a double-click or a Ctrl-wheel inside a card as its own (a new pin, a fit, a zoom). */
const stop = (e: SyntheticEvent) => e.stopPropagation()
const stops = { onPointerDown: stop, onDoubleClick: stop, onWheel: stop, onClick: stop }

const M = 8, GAP = 20
/** (wave E · E3 · phone-8) A phone held sideways has no room beside a pin for a 280px card — it would sit on the very spot being pinned
    and clip its own field — so the cards take the phone's bottom sheet there too, with the spot on a small copy of the picture. */
const SIDEWAYS = '(max-width: 1024px) and (orientation: landscape) and (max-height: 500px)'
const usePinSheet = () => { const phone = useSheetLayout(), sideways = useMediaQuery(SIDEWAYS); return phone || sideways }
/** (files-11) A pin's author the client's page names by role — "You" on their own sheet, "Your client" on a personal link — so it wears no
    " · Client" tag after it. */
const byRole = (name: string) => /^(you|(your )?client)$/i.test(name.trim())
const PHOTO = '[data-testid="viz-frame"]'
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Places a floating card beside its pin, in screen space: right of the pin when it fits, else left; its top near the pin's, pulled up to
 * stay inside the bounds — the nearest `[data-pin-bounds]` (the editor's stage) or the window (the client link). It follows the pin
 * through zoom, pan and scroll (one rect read a frame, a DOM write only when it moved). When the pin leaves the bounds the thread closes
 * (the house rule for anchored popovers) and a new pin's box hides until its pin is back, so a half-written note is never lost.
 */
function useFloat(anchor: RefObject<HTMLElement | null>, card: RefObject<HTMLDivElement | null>, on: boolean, onLeave?: () => void) {
  const leave = useRef(onLeave)
  useEffect(() => { leave.current = onLeave })
  useLayoutEffect(() => {
    if (!on) return
    let raf = 0, last = ''
    const tick = () => {
      const a = anchor.current, c = card.current
      if (a && c) {
        const p = a.getBoundingClientRect()
        const px = p.left + p.width / 2, py = p.top + p.height / 2
        const host = a.closest('[data-pin-bounds]')
        const b = host ? host.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
        const inside = px >= b.left && px <= b.right && py >= b.top && py <= b.bottom
        if (!inside && leave.current) { leave.current(); return }
        const w = c.offsetWidth
        let left = px + GAP
        if (left + w > b.right - M) left = px - GAP - w
        left = clamp(left, b.left + M, Math.max(b.left + M, b.right - M - w))
        /* (verify round 1) a card over the canvas bar ends above it — the bar's tools stay in reach — and rises above the pin to fit */
        const bar = host?.querySelector('[data-viz-canvasbar]')?.getBoundingClientRect()
        /* (the bar stood on end beside the photo — a short, wide stage — is a column, not a floor) */
        const floor = bar && bar.height && bar.width > bar.height && left < bar.right && left + w > bar.left ? Math.min(b.bottom, bar.top) : b.bottom
        const maxH = Math.max(160, floor - b.top - 2 * M)
        const h = Math.min(c.offsetHeight, maxH)
        const top = clamp(py - 18, b.top + M, Math.max(b.top + M, floor - M - h))
        const key = `${Math.round(left)}|${Math.round(top)}|${Math.round(maxH)}|${inside}`
        if (key !== last) {
          last = key
          c.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
          c.style.maxHeight = `${Math.round(maxH)}px`
          c.style.visibility = inside ? '' : 'hidden'
        }
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [on, anchor, card])
}

/** (verify round 1) The spot a pin marks, on a small copy of the picture — a phone's sheet covers the photo, so the sheet shows it. */
function PinSpot({ image, x, y, n, role }: { image: string; x: number; y: number; n: number | null; role: string }) {
  return (
    <span className={styles.spot} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" />
      <span className={styles.spotPin} data-role={role} style={{ left: `${x * 100}%`, top: `${y * 100}%` }}>{n ?? <Icon name="push_pin" size={12} fill />}</span>
    </span>
  )
}

/** Both boxes: no resize grip (DescribeBox's rule), Esc closes from inside the text box (react-aria keeps the key from the card).
 *  (REG-729) Every multi-line field carries its label — the reply box and the phone's note box drew only a placeholder. */
function NoteBox({ label, placeholder, value, onChange, onSubmit, onEscape, autoFocus }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; onSubmit: () => void; onEscape: () => void; autoFocus?: boolean
}) {
  return (
    <TextArea label={label} placeholder={placeholder} value={value} autoFocus={autoFocus} onChange={(v: string) => onChange(v.slice(0, PIN_CHARS))}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Escape') { e.preventDefault(); onEscape(); return }
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmit() }
              }} />
  )
}

/** The desktop / tablet card: portalled to <body> so no photo frame clips it, placed by useFloat. Focus moves in when it opens (onto the
 *  card, or the note box that asks for it) and goes back to what opened it on Close, Esc, Cancel or Save — no trap, the photo stays
 *  reachable (F162). The phone's Sheet does the same on its own. */
function FloatCard({ anchor, label, testId, onEscape, onLeave, fallback, children }: {
  anchor: RefObject<HTMLElement | null>; label: string; testId: string; onEscape: () => void; onLeave?: () => void
  /** (F162) Where focus goes on close when what opened the card has gone (a removed pin, a draft's own box) — the pin, else the pin tool. */
  fallback?: () => HTMLElement | null
  children: ReactNode
}) {
  const card = useRef<HTMLDivElement>(null)
  /* (F162) what held focus as the card opened — read before the note box's autofocus takes it, so Cancel and Esc give it back */
  const [opener] = useState<Element | null>(() => document.activeElement)
  const back = useRef({ opener, fallback })
  useEffect(() => { back.current = { opener, fallback } })
  useFloat(anchor, card, true, onLeave)
  useDialogFocus(true, card, { trap: false })
  useEffect(() => () => {
    const a = document.activeElement
    /* (tablet-1) useDialogFocus hands focus back to what held it as the card opened; when that was the photo itself (a thread opened
       straight after its pin was made, from the new pin's box), the pin's own marker is the better place — the thread belongs to it */
    const onPhoto = !!a && a instanceof HTMLElement && a.matches(PHOTO)
    if (a && a !== document.body && !onPhoto) return   // focus already went somewhere on purpose (the studio's own press)
    const { opener: o, fallback: f } = back.current
    const live = o instanceof HTMLElement && o.isConnected && o !== document.body ? o : null
    const target = (live && !live.matches(PHOTO) ? live : null) ?? f?.() ?? live ?? document.querySelector<HTMLElement>('[data-testid="viz-pin-toggle"]')
    if (target && target !== a) target.focus({ preventScroll: true })
  }, [])
  return createPortal(
    <div ref={card} className={styles.card} data-card="" role="dialog" aria-label={label} data-testid={testId} {...stops}
         onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onEscape() } }}>
      {children}
    </div>,
    document.body,
  )
}

/**
 * A pin's thread (REG-675, Q-15; 1.0's annotation popover, A D-08…D-12): who pinned it and when, the note, the replies, a reply box;
 * Resolve / Reopen; Remove for the studio's own pins (with Undo). The client's pins wear blue — they came from the shared link.
 * Beside its pin above the photo on a desk or a tablet; the house bottom sheet on a phone (REG-353), the pin staying lit on the photo.
 */
export function PinThread({ pin, index, now, onReply, onStatus, onDelete, onClose, image, own = false }: {
  pin: Pin; index: number; now: number
  /** (verify round 1) The picture the pin is on — a phone's sheet covers the photo, so its head shows the spot on a small copy. */
  image?: string | null
  onReply: (body: string) => Promise<boolean>
  /** The studio resolves and reopens — (parity map, CP-072) and the client, on their own pins (`own`). */
  onStatus?: (s: 'open' | 'resolved') => void
  onDelete: (() => void) | null
  onClose: () => void
  /** (parity map, CP-072) The client's page: the pin is the reader's own — their reply is theirs (never "the client sees it"), Remove says so. */
  own?: boolean
}) {
  const client = useClient()
  const sheet = usePinSheet()
  const anchor = useRef<HTMLSpanElement>(null)
  /* (round 3) in a short sheet the thread scrolls above the reply box — the scroller (the sheet's body) fades at an edge with more beyond it */
  const threadBody = useRef<HTMLDivElement>(null)
  const sheetScroll = useRef<HTMLElement | null>(null)
  useEffect(() => { sheetScroll.current = threadBody.current?.parentElement ?? null })
  useEdgeFade(sheetScroll, sheet && client, `${pin.id}|${pin.comments.length}`)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => { if (!text.trim() || busy) return; setBusy(true); const ok = await onReply(text.trim()); setBusy(false); if (ok) setText('') }
  const resolved = pin.status === 'resolved'
  /* a client pin says so — unless its author's name already does (a personal link's pin is "Your client") */
  const meta = `${pin.authorRole === 'client' && !byRole(pin.authorName) ? 'Client · ' : ''}${when(pin.createdAt, now)}`
  const spot = image ? <PinSpot image={image} x={pin.x} y={pin.y} n={index + 1} role={pin.authorRole} /> : null
  /* (D1) the client's link shows the threads the client started, with the studio's replies in them — so in the studio's view (it resolves,
     the client's page doesn't) a reply on a client's pin says it goes to the client; the team's own pins never leave the studio */
  const toClient = !!onStatus && !own && pin.authorRole === 'client'
  const actions = (
    <>
      {onStatus ? <Tooltip label={resolved ? 'Reopen' : own ? 'Mark resolved' : 'Resolve'}><IconButton icon={resolved ? 'undo' : 'check_circle'} label={resolved ? 'Reopen the pin' : own ? 'Mark the pin resolved' : 'Resolve the pin'} size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => onStatus(resolved ? 'open' : 'resolved')} data-testid={own ? 'pin-own-status' : undefined} /></Tooltip> : null}
      {onDelete ? <Tooltip label={own ? 'Remove your pin' : 'Remove the pin'}><IconButton icon="delete" label={own ? 'Remove your pin' : 'Remove the pin'} size={36} variant="bare" iconSize={20} iconWeight={300} onClick={onDelete} data-testid={own ? 'pin-own-remove' : undefined} /></Tooltip> : null}
    </>
  )
  const thread = (
    <>
      <p className={styles.text}>{pin.body}</p>
      {pin.comments.map((c) => (
        <div key={c.id} className={styles.reply}><span className={styles.replyWho}><b>{c.authorName}</b>{c.authorRole === 'client' && !byRole(c.authorName) ? ' · Client' : ''} · {when(c.createdAt, now)}</span><span>{c.body}</span></div>
      ))}
      {resolved ? <span className={styles.resolved}><Icon name="check_circle" size={16} weight={300} /> Resolved</span> : null}
    </>
  )
  const replyBox = (
    <>
      <NoteBox label="Reply" placeholder={toClient ? 'Reply — the client sees it' : 'Reply…'} value={text} onChange={setText} onSubmit={() => { void send() }} onEscape={onClose} />
      <span className={styles.actions}><Button isDisabled={!text.trim() || busy} onPress={() => { void send() }}>{busy ? 'Sending…' : 'Reply'}</Button></span>
    </>
  )
  return (
    <>
      <span ref={anchor} className={styles.anchor} style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }} aria-hidden />
      {!client ? null : sheet ? (
        <span className={styles.contents} {...stops}>
          <Sheet open onClose={onClose} title={pin.authorName} subtitle={`Pin ${index + 1} · ${meta}`} headActions={onStatus || onDelete ? actions : undefined}
                 footer={<div className={styles.sheetFoot}>{replyBox}</div>} bodyClassName={styles.fadeBody}>
            <div ref={threadBody} className={styles.sheetBody} data-card="" data-thread="" data-testid="viz-pin-thread">{spot}<div className={styles.sheetThread}>{thread}</div></div>
          </Sheet>
        </span>
      ) : (
        <FloatCard anchor={anchor} label={`Pin ${index + 1}`} testId="viz-pin-thread" onEscape={onClose} onLeave={onClose}
                   fallback={() => document.querySelector<HTMLElement>(`[data-pin-id="${pin.id}"]`)}>
          <div className={styles.head}>
            <span className={styles.num} data-role={pin.authorRole} data-resolved={resolved || undefined}>{index + 1}</span>
            <span className={styles.who}><b>{pin.authorName}</b><span>{meta}</span></span>
            {actions}
            <Tooltip label="Close"><IconButton icon="close" label="Close the pin" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={onClose} /></Tooltip>
          </div>
          <div className={styles.body}>{thread}</div>
          <div className={styles.foot}>{replyBox}</div>
        </FloatCard>
      )}
    </>
  )
}

/** (UX audit V1) One of the client's notes on a version, with the studio's replies to it. */
export type ClientNote = { id: string; who: string; body: string; at: number; replies: { id: string; who: string; body: string; at: number }[] }

/**
 * (UX audit V1) From the client: the notes the client left on a version, readable where the studio works — the pin card's look (a card at the
 * photo's top corner on a desk or a tablet, the house bottom sheet on a phone), oldest first, each with the studio's replies, and a reply box
 * that answers the latest one on the renders link (the client reads it there). Opened by the version tile's notes badge, the version's ⋯ and
 * the bell's `?note=` link.
 */
export function ClientNotes({ version, notes, now, client, onReply, onClose }: {
  /** "V2 · Walls, Floor" — the version the notes are on */
  version: string
  notes: ClientNote[]
  now: number
  /** who the reply reaches, by name ("Kevin") — "the client" when the design has no lead */
  client: string
  onReply: (body: string) => Promise<boolean>
  onClose: () => void
}) {
  const ready = useClient()
  const sheet = usePinSheet()
  const anchor = useRef<HTMLSpanElement>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => { if (!text.trim() || busy) return; setBusy(true); const ok = await onReply(text.trim()); setBusy(false); if (ok) setText('') }
  const meta = `${version} · ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`
  const list = notes.map((n) => (
    <div key={n.id} className={styles.noteItem} data-testid="viz-client-note">
      <span className={styles.replyWho}><b>{n.who}</b>{byRole(n.who) ? '' : ' · Client'} · {when(n.at, now)}</span>
      <p className={styles.text}>{n.body}</p>
      {n.replies.map((r) => <div key={r.id} className={styles.reply} data-testid="viz-client-note-reply"><span className={styles.replyWho}><b>{r.who}</b> · {when(r.at, now)}</span><span>{r.body}</span></div>)}
    </div>
  ))
  const replyBox = (
    <>
      <NoteBox label="Reply" placeholder={`Reply — ${client} sees it on the renders link`} value={text} onChange={setText} onSubmit={() => { void send() }} onEscape={onClose} />
      <span className={styles.actions}><Button isDisabled={!text.trim() || busy} onPress={() => { void send() }} data-testid="viz-client-note-send">{busy ? 'Sending…' : 'Reply'}</Button></span>
    </>
  )
  return (
    <>
      <span ref={anchor} className={styles.anchor} style={{ left: '100%', top: '0%' }} aria-hidden />
      {!ready ? null : sheet ? (
        <span className={styles.contents} {...stops}>
          <Sheet open onClose={onClose} title="From the client" subtitle={meta} footer={<div className={styles.sheetFoot}>{replyBox}</div>} bodyClassName={styles.fadeBody}>
            <div className={styles.sheetBody} data-card="" data-testid="viz-client-notes"><div className={styles.sheetThread}>{list}</div></div>
          </Sheet>
        </span>
      ) : (
        <FloatCard anchor={anchor} label="From the client" testId="viz-client-notes" onEscape={onClose} fallback={() => document.querySelector<HTMLElement>('[data-viz-strip] [data-on] [data-notes]')}>
          <div className={styles.head}>
            <span className={styles.num} data-role="client"><Icon name="comment" size={14} fill /></span>
            <span className={styles.who}><b>From the client</b><span>{meta}</span></span>
            <Tooltip label="Close"><IconButton icon="close" label="Close the client’s notes" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={onClose} /></Tooltip>
          </div>
          <div className={styles.body}>{list}</div>
          <div className={styles.foot}>{replyBox}</div>
        </FloatCard>
      )}
    </>
  )
}

/** A new pin's note (1.0's add-pin box): tap the photo, write it, Pin it. The dot stays on the photo; the box floats beside it (a sheet on a phone). */
/* (D1) the studio's own pins stay off the client's link — the draft says who sees it; the client's page passes its own hint */
export function DraftPin({ x, y, onSave, onCancel, label = 'Pin a note here', hint = 'Only your team sees it', image }: {
  x: number; y: number; onSave: (body: string) => Promise<boolean>; onCancel: () => void; label?: string; hint?: string
  /** (verify round 1) The picture — on a phone the sheet shows where the note goes on a small copy of it. */
  image?: string | null
}) {
  const client = useClient()
  const sheet = usePinSheet()
  const anchor = useRef<HTMLSpanElement>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => { if (!text.trim() || busy) return; setBusy(true); const ok = await onSave(text.trim()); setBusy(false); if (ok) setText('') }
  const foot = (
    <>
      <span className={styles.count}>{text.length ? `${text.length} / ${PIN_CHARS.toLocaleString('en-SG')}` : hint}</span>
      <span className={styles.actions}>
        <Button appearance="outlined" variant="secondary" onPress={onCancel}>Cancel</Button>
        <Button isDisabled={!text.trim() || busy} onPress={() => { void save() }} data-testid="viz-pin-save">{busy ? 'Pinning…' : 'Pin it'}</Button>
      </span>
    </>
  )
  return (
    <>
      <span ref={anchor} className={styles.draftDot} style={{ left: `${x * 100}%`, top: `${y * 100}%` }} aria-hidden><Icon name="push_pin" size={14} fill /></span>
      {!client ? null : sheet ? (
        <span className={styles.contents} {...stops}>
          <Sheet open onClose={onCancel} title={label} footer={<div className={styles.sheetFoot}>{foot}</div>}>
            <div className={styles.sheetBody} data-card="" data-draft="" data-testid="viz-pin-draft">
              {image ? <PinSpot image={image} x={x} y={y} n={null} role="studio" /> : null}
              <NoteBox label={label} placeholder="e.g. Can this wall go a shade warmer?" value={text} onChange={setText} onSubmit={() => { void save() }} onEscape={onCancel} autoFocus />
            </div>
          </Sheet>
        </span>
      ) : (
        <FloatCard anchor={anchor} label="New pin" testId="viz-pin-draft" onEscape={onCancel}>
          <div className={styles.body}>
            <NoteBox label={label} placeholder="e.g. Can this wall go a shade warmer?" value={text} onChange={setText} onSubmit={() => { void save() }} onEscape={onCancel} autoFocus />
          </div>
          <div className={styles.foot}>{foot}</div>
        </FloatCard>
      )}
    </>
  )
}
