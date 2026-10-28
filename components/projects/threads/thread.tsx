'use client'

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownDivider, DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { photoOf } from '@/components/projects/floor-plan/plan-picture'
import { relativeTime } from '@/lib/format'
import { EMOJI, MESSAGE_FILES_MAX, MESSAGE_FILE_ACCEPT, VOICE_MAX_MS, clockWords, sizeWords, type MessageFile, type MessageShare } from '@/lib/projects/messages-model'
import type { ContactCard } from '@/lib/projects/conversations'
import type { Landed } from './send-file'
import styles from './thread.module.css'

/**
 * (gaps build H — H-Q6 · H-Q12) One conversation's lines, for a ticket and for a project's Messages, on both sides: the house comment thread
 * (avatar · name · time · the words) with the photos under the words, the New rule where this reader's unread start, state lines ("Germaine
 * marked it resolved"), "You" for one's own lines and Remove on them (the caller's Undo). The composer: the DS TextArea, photos (shrunk in
 * the browser to 1600 px, as the floor plan's), Send — Enter sends, Shift+Enter breaks the line.
 * (simplify S-22) The other side's lines carry the caller's `ask` — the studio's ⋮ Reply · Make a task · Raise a variation order (AskMenu) on
 * a client's message; one's own keep Remove, on the same ⋮ (the house kebab, never "…" — the parity build's one ⋮ grammar).
 * (parity map 2026-10-10 — UC-066 · UC-067 · UC-068 · UC-069) A line also carries files (a document that opens, a video and a voice note that
 * play in place), the site's place or a person's card; a search marks its matches (`highlight`); `after` puts something under a line — the
 * suggested replies. The composer's one "+" opens Photo · File · Voice note · The site's location · A contact (`attach`, each only when the
 * caller offers it — a ticket keeps its photo button), and the emoji button sits in the box (`emoji`). Tickets pass none of them.
 */
export type ThreadItem = {
  id: string; authorKind: 'client' | 'studio'; authorId: string | null; authorName: string; body: string; photos: { id: string; src: string }[]; at: number
  removed?: boolean; internal?: boolean; event?: string | null; color?: string | null
  /** (parity map, UC-066) files beyond photos */ files?: MessageFile[]
  /** (parity map, UC-067) the site's place, a person's card */ share?: MessageShare | null
  /** (parity map, UC-064) written on the lead's conversation before the project */ fromLead?: boolean
}

const CLIENT_TINT = 'var(--om-color-on-surface-secondary)'
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** (UC-069) The words with the query marked. */
function Marked({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (q.length < 2) return <>{text}</>
  const parts = text.split(new RegExp(`(${esc(q)})`, 'gi'))
  return <>{parts.map((p, i) => (p.toLowerCase() === q.toLowerCase() ? <mark key={i} className={styles.found}>{p}</mark> : <Fragment key={i}>{p}</Fragment>))}</>
}

/** (pending modules S26 — 1.0's Links in a conversation) A web address in the words opens, in a new tab (its words marked by a search as the
    rest are). The same pattern Messages' Details reads its Links from (lib/projects/messages-model.ts `LINK_IN_TEXT`). */
const LINKS = /(\bhttps?:\/\/[^\s<>"'`]+[^\s<>"'`.,;:!?)\]}])/gi
function Words({ text, query }: { text: string; query: string }) {
  const parts = text.split(LINKS)
  if (parts.length === 1) return <Marked text={text} query={query} />
  return <>{parts.map((p, i) => (i % 2 === 1 ? <a key={i} className={styles.inlineLink} href={p} target="_blank" rel="noopener noreferrer">{p}</a> : <Marked key={i} text={p} query={query} />))}</>
}

/** (UC-066) A message's files: a voice note and a video play in place; a document opens (or downloads) under its own name. */
function LineFiles({ files }: { files: MessageFile[] }) {
  return (
    <div className={styles.files}>
      {files.map((f) => f.kind === 'voice' ? (
        <div key={f.id} className={styles.voice} data-testid="thread-voice">
          <Icon name="mic" size={18} weight={300} className={styles.fileIcon} />
          <audio controls preload="none" src={f.src} className={styles.audio} aria-label={`Voice note, ${clockWords(f.durationMs)}`} />
          {f.durationMs ? <span className={styles.fileMeta}>{clockWords(f.durationMs)}</span> : null}
        </div>
      ) : f.kind === 'video' ? (
        <div key={f.id} className={styles.video} data-testid="thread-video">
          <video controls preload="metadata" src={f.src} className={styles.videoEl} aria-label={f.name} />
          <span className={styles.fileMeta}>{f.name}{f.size ? ` · ${sizeWords(f.size)}` : ''}</span>
        </div>
      ) : (
        <a key={f.id} className={styles.file} href={f.src} target="_blank" rel="noopener noreferrer" data-testid="thread-file">
          <Icon name={f.mime === 'application/pdf' ? 'picture_as_pdf' : /sheet|excel|csv/.test(f.mime) ? 'table_chart' : 'description'} size={20} weight={300} className={styles.fileIcon} />
          <span className={styles.fileName}>{f.name}</span>
          {f.size ? <span className={styles.fileMeta}>{sizeWords(f.size)}</span> : null}
        </a>
      ))}
    </div>
  )
}

/** (UC-067) A shared place (the site's address, as a map link) or a person's card with Call and WhatsApp. */
function ShareCard({ share }: { share: MessageShare }) {
  if (share.kind === 'place') {
    return (
      <a className={styles.share} href={share.href} target="_blank" rel="noopener noreferrer" data-testid="thread-place">
        <Icon name="home" size={20} weight={300} className={styles.fileIcon} />
        <span className={styles.shareText}><span className={styles.fileName}>The site’s location</span><span className={styles.fileMeta}>{share.label}</span></span>
        <span className={styles.shareGo}>Open in Maps</span>
      </a>
    )
  }
  const digits = (share.phone ?? '').replace(/\D/g, '')
  const wa = digits ? `https://wa.me/${digits.length === 8 ? `65${digits}` : digits}` : null
  return (
    <div className={styles.share} data-testid="thread-contact">
      <Icon name="badge" size={20} weight={300} className={styles.fileIcon} />
      <span className={styles.shareText}><span className={styles.fileName}>{share.name}</span><span className={styles.fileMeta}>{[share.role, share.phone].filter(Boolean).join(' · ')}</span></span>
      {digits ? (
        <span className={styles.shareActions}>
          <a className={styles.shareGo} href={`tel:${digits}`}>Call</a>
          {wa ? <a className={styles.shareGo} href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
        </span>
      ) : null}
    </div>
  )
}

export function ThreadLines({ items, me, readAt = null, now, clientChip = false, eventText, onRemove, onPhoto, ask, highlight, after, testId }: {
  items: ThreadItem[]
  /** who reads it — their own lines say "You" and may be removed */
  me: { kind: 'client' | 'studio'; id: string }
  /** the reader's read mark before this visit — the New rule sits before the first line after it written by the other side */
  readAt?: number | null
  now: number
  /** the studio's side marks the client's lines "Client" — (the calm UI build 2026-10-27, 3-13) only where threads mix (/chat, a ticket); a
      project's client-only conversation passes false */
  clientChip?: boolean
  /** a state line's words (tickets) */
  eventText?: (item: ThreadItem) => { text: string; icon: string; tone?: 'green' } | null
  onRemove?: (item: ThreadItem) => void
  onPhoto?: (item: ThreadItem, index: number) => void
  /** (simplify S-22) the other side's line's actions — the studio's AskMenu on a client's message */
  ask?: (item: ThreadItem) => ReactNode
  /** (parity map, UC-069) a search's matches — marked, the current one ringed */
  highlight?: { query: string; ids: readonly string[]; current: string | null }
  /** (parity map, UC-068) something under a line — the suggested replies under the client's newest */
  after?: (item: ThreadItem) => ReactNode
  testId?: string
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const kebab = useRef<HTMLElement | null>(null)
  const menuItem = menuFor ? items.find((i) => i.id === menuFor) ?? null : null
  const mine = (i: ThreadItem) => i.authorKind === me.kind && i.authorId === me.id
  const newAt = readAt === null ? -1 : items.findIndex((i) => i.at > readAt && !mine(i) && !i.event)
  const found = new Set(highlight?.ids ?? [])
  /* (UC-064) where the lead's lines end and the project's begin */
  const begins = items.findIndex((i, n) => n > 0 && !i.fromLead && items[n - 1]!.fromLead)
  return (
    <div className={styles.lines} data-testid={testId}>
      {items.map((i, n) => {
        const rule = n === newAt ? <div key={`new-${i.id}`} className={styles.newRule} data-testid="thread-new" role="separator">New</div> : null
        const began = n === begins ? <div key={`began-${i.id}`} className={styles.began} role="separator" data-testid="thread-project-began">The project began — earlier messages were before it</div> : null
        if (i.event) {
          const e = eventText?.(i)
          return e ? [began, rule, (
            <div key={i.id} className={styles.event} data-tone={e.tone} data-testid="thread-event" data-event={i.event}>
              <Icon name={e.icon} size={16} weight={300} />
              <span>{e.text} · {relativeTime(new Date(i.at), new Date(now))}</span>
            </div>
          )] : null
        }
        const own = mine(i)
        const hit = found.has(i.id)
        return [began, rule, (
          <div key={i.id} className={styles.line} data-testid="thread-line" data-line-id={i.id} data-kind={i.authorKind} data-mine={own || undefined} data-internal={i.internal || undefined}
               data-found={hit || undefined} data-current={highlight?.current === i.id || undefined}>
            <Avatar name={i.authorName} color={i.authorKind === 'client' ? CLIENT_TINT : i.color ?? 'var(--om-color-primary-default)'} size={36} tooltip={false} />
            <div className={styles.col}>
              <div className={styles.meta}>
                <span className={styles.author}>{own ? 'You' : i.authorName}</span>
                {/* (the calm UI build 2026-10-27, 1-22 · 3-13 · T-06) who wrote it is sentence-case secondary words, never a caps tag (caps are for a
                    status): "Client" where threads mix, the team's own note "Note · team only" with its lock */}
                {clientChip && i.authorKind === 'client' ? <span className={styles.whoTag}>· Client</span> : null}
                {i.internal ? <span className={styles.whoTag} data-testid="thread-note-tag"><Icon name="lock" size={14} weight={300} />Note · team only</span> : null}
                <span className={styles.time}>{relativeTime(new Date(i.at), new Date(now))}</span>
                {own && onRemove && !i.removed ? (
                  <div className={styles.kebabWrap}>
                    <Tooltip label="Message actions" disabled={menuFor === i.id}>
                      <IconButton icon="more_vert" label="Message actions" size={24} variant="bare" iconSize={24} className={styles.kebabBtn}
                                  aria-haspopup="menu" aria-expanded={menuFor === i.id}
                                  onClick={(e) => { kebab.current = e.currentTarget; setMenuFor((m) => (m === i.id ? null : i.id)) }} />
                    </Tooltip>
                  </div>
                ) : !own && ask && !i.removed ? ask(i) : null}
              </div>
              {i.removed ? <p className={styles.removed}>Message removed</p> : i.body ? <p className={styles.body}><Words text={i.body} query={hit && highlight ? highlight.query : ''} /></p> : null}
              {!i.removed && i.photos.length ? (
                <div className={styles.photos}>
                  {i.photos.map((ph, k) => (
                    <button key={ph.id} type="button" className={styles.photo} aria-label={`Photo ${k + 1} of ${i.photos.length}`}
                            onClick={() => (onPhoto ? onPhoto(i, k) : window.open(ph.src, '_blank', 'noopener'))}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ph.src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              ) : null}
              {!i.removed && i.files?.length ? <LineFiles files={i.files} /> : null}
              {!i.removed && i.share ? <ShareCard share={i.share} /> : null}
              {after ? after(i) : null}
            </div>
          </div>
        )]
      })}
      <PortalMenu open={!!menuItem} anchor={kebab} onClose={() => setMenuFor(null)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle="Message">
        <DropdownItem tone="danger" onSelect={() => { const it = menuItem; setMenuFor(null); if (it) onRemove?.(it) }}>Remove</DropdownItem>
      </PortalMenu>
    </div>
  )
}

/** (parity map, UC-066 · UC-067) What the composer's "+" offers — each only when given: File (and Voice note, which files the same way) through
    `file` (the caller's piece-by-piece upload), the site's place (`place`: its address, or null when the lead has none), a person's card. */
export type ComposerAttach = {
  file?: (f: File, onProgress: (share: number) => void) => Promise<Landed | { error: string }>
  voice?: boolean
  place?: string | null
  contacts?: ContactCard[]
}
export type ComposerSend = { body: string; photos: string[]; files: { fileId: string; durationMs: number | null }[]; share: { kind: 'place' } | { kind: 'contact'; id: string } | null }
type Picked = { key: string; name: string; size: number; voice: boolean; durationMs: number | null; share: number; fileId: string | null }

/** The composer. `onSend` answers whether it landed — the words and photos clear only then (a dialog closes only once its save lands). */
export function ThreadComposer({ label, maxPhotos, onSend, hint, extra, sendLabel = 'Send', disabled = false, focusKey = 0, attach, emoji = false, fill, testId }: {
  label: string
  maxPhotos: number
  onSend: (o: ComposerSend) => Promise<boolean>
  hint?: ReactNode
  /** a control beside the photos — the ticket's To the client / Internal note chips */
  extra?: ReactNode
  sendLabel?: string
  disabled?: boolean
  /** (simplify S-22 · contract C) each new value puts the caret in the box — Reply, and Messages' `?compose=1` */
  focusKey?: number
  /** (parity map, UC-066 · UC-067) the one "+" — absent, the photo button stays as it was (a ticket's) */
  attach?: ComposerAttach
  /** (parity map, UC-067) the emoji button in the box */
  emoji?: boolean
  /** (parity map, UC-068) a suggested reply's words, put in the box — each new `n` fills it (never sends) */
  fill?: { text: string; n: number } | null
  testId?: string
}) {
  const snackbar = useSnackbar()
  const box = useRef<HTMLDivElement>(null)
  const area = () => box.current?.querySelector('textarea') ?? null
  useEffect(() => {
    if (!focusKey) return
    const t = area()
    if (!t) return
    t.scrollIntoView({ block: 'nearest' }); t.focus()
  }, [focusKey])
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [files, setFiles] = useState<Picked[]>([])
  const [share, setShare] = useState<ComposerSend['share']>(null)
  const [busy, setBusy] = useState(false)
  /* (UC-068) a suggestion fills the box — the render-phase adjust (never a set-state in an effect), the caret after it */
  const [filled, setFilled] = useState(0)
  if (fill && fill.n !== filled) { setFilled(fill.n); setBody(fill.text) }
  useEffect(() => { if (!filled) return; const t = area(); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length) } }, [filled])
  const input = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const plus = useRef<HTMLSpanElement>(null)
  const smile = useRef<HTMLSpanElement>(null)
  const [menu, setMenu] = useState<'plus' | 'contacts' | 'emoji' | null>(null)
  const uploading = files.some((f) => !f.fileId)
  const pick = async (list0: FileList | null) => {
    const list = Array.from(list0 ?? []).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    const room = maxPhotos - photos.length
    if (room <= 0) { snackbar({ message: `Add up to ${maxPhotos} photos at a time` }); return }
    const read = (await Promise.all(list.slice(0, room).map((f) => photoOf(f)))).filter((x): x is string => !!x)
    if (list.length > room) snackbar({ message: `Add up to ${maxPhotos} photos at a time — ${room} added` })
    if (read.length < Math.min(room, list.length)) snackbar({ message: 'A photo didn’t read — pick it again' })
    setPhotos((p) => [...p, ...read].slice(0, maxPhotos))
  }
  /* (UC-066) a file: it starts on its way at once, a chip shows how far; Send waits for every file to land */
  const sendFile = async (f: File, voice: { durationMs: number } | null) => {
    if (!attach?.file) return
    if (files.length >= MESSAGE_FILES_MAX) { snackbar({ message: `Add up to ${MESSAGE_FILES_MAX} files at a time` }); return }
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setFiles((x) => [...x, { key, name: f.name, size: f.size, voice: !!voice, durationMs: voice?.durationMs ?? null, share: 0, fileId: null }])
    const r = await attach.file(f, (s) => setFiles((x) => x.map((p) => (p.key === key ? { ...p, share: s } : p))))
    if ('error' in r) { setFiles((x) => x.filter((p) => p.key !== key)); snackbar({ message: r.error }); return }
    setFiles((x) => x.map((p) => (p.key === key ? { ...p, fileId: r.fileId, share: 1 } : p)))
  }
  const pickFiles = (list0: FileList | null) => { for (const f of Array.from(list0 ?? []).slice(0, MESSAGE_FILES_MAX)) void sendFile(f, null) }

  /* (UC-067) a voice note, recorded here: Stop files it (as any file) and it plays in the line; Cancel drops it */
  const [rec, setRec] = useState<{ elapsed: number } | null>(null)
  const recorder = useRef<{ r: MediaRecorder; stream: MediaStream; chunks: Blob[]; started: number; timer: number; keep: boolean } | null>(null)
  const canRecord = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  const stopRec = (keep: boolean) => {
    const cur = recorder.current
    if (!cur) return
    cur.keep = keep
    window.clearInterval(cur.timer)
    if (cur.r.state !== 'inactive') cur.r.stop()
    else cur.stream.getTracks().forEach((t) => t.stop())
  }
  const startRec = async () => {
    if (!canRecord) { snackbar({ message: 'This browser can’t record — send a file instead' }); return }
    let stream: MediaStream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch { snackbar({ message: 'The microphone is off — allow it in the browser to record a voice note' }); return }
    const r = new MediaRecorder(stream)
    const started = Date.now()
    const cur = { r, stream, chunks: [] as Blob[], started, timer: 0, keep: true }
    r.ondataavailable = (e) => { if (e.data.size) cur.chunks.push(e.data) }
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      recorder.current = null
      setRec(null)
      if (!cur.keep || !cur.chunks.length) return
      const type = cur.chunks[0]!.type || 'audio/webm'
      const durationMs = Math.min(VOICE_MAX_MS, Date.now() - started)
      const day = new Date().toISOString().slice(0, 16).replace('T', ' ').replace(':', '.')
      void sendFile(new File(cur.chunks, `Voice note ${day}.${/ogg/.test(type) ? 'ogg' : /mp4|aac/.test(type) ? 'm4a' : 'webm'}`, { type }), { durationMs })
    }
    cur.timer = window.setInterval(() => {
      const elapsed = Date.now() - started
      setRec({ elapsed })
      if (elapsed >= VOICE_MAX_MS) stopRec(true)
    }, 500)
    recorder.current = cur
    r.start()
    setRec({ elapsed: 0 })
  }
  useEffect(() => () => { const cur = recorder.current; if (cur) { window.clearInterval(cur.timer); cur.keep = false; try { cur.r.stop() } catch {} cur.stream.getTracks().forEach((t) => t.stop()) } }, [])

  /* (UC-067) an emoji goes in where the caret is */
  const insert = (e: string) => {
    const t = area()
    const at = t ? t.selectionStart ?? body.length : body.length
    const to = t ? t.selectionEnd ?? at : at
    const next = `${body.slice(0, at)}${e}${body.slice(to)}`
    setBody(next)
    window.setTimeout(() => { const x = area(); if (x) { x.focus(); x.setSelectionRange(at + e.length, at + e.length) } }, 0)
  }
  const send = async () => {
    const text = body.trim()
    if ((!text && !photos.length && !files.length && !share) || busy || disabled || uploading || rec) return
    setBusy(true)
    try {
      if (await onSend({ body: text, photos, files: files.map((f) => ({ fileId: f.fileId!, durationMs: f.durationMs })), share })) { setBody(''); setPhotos([]); setFiles([]); setShare(null) }
    } finally { setBusy(false) }
  }
  const empty = !body.trim() && !photos.length && !files.length && !share
  const contact = share?.kind === 'contact' ? attach?.contacts?.find((c) => c.id === share.id) ?? null : null
  const members = attach?.contacts?.filter((c) => c.kind === 'member') ?? []
  const vendors = attach?.contacts?.filter((c) => c.kind === 'vendor') ?? []
  return (
    <div ref={box} className={styles.composer} data-testid={testId}>
      <div className={styles.fieldWrap}>
        <TextArea label={label} value={body} onChange={setBody} className={styles.field} isDisabled={disabled}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send() } }} />
        {emoji ? (
          <span ref={smile} className={styles.emojiSlot}>
            <Tooltip label="Emoji" disabled={menu === 'emoji'}>
              <IconButton icon="mood" glyph={<span className={styles.emojiGlyph} aria-hidden>🙂</span>} label="Emoji" size={24} variant="bare" disabled={disabled}
                          aria-haspopup="menu" aria-expanded={menu === 'emoji'} onClick={() => setMenu((m) => (m === 'emoji' ? null : 'emoji'))} data-testid="thread-emoji" />
            </Tooltip>
          </span>
        ) : null}
      </div>
      {rec ? (
        <div className={styles.recording} role="status" data-testid="thread-recording">
          <span className={styles.recDot} aria-hidden />
          <span>{`Recording ${clockWords(rec.elapsed)}`}</span>
          <Button variant="secondary" appearance="outlined" onPress={() => stopRec(false)}>Cancel</Button>
          <Button onPress={() => stopRec(true)} data-testid="thread-recording-stop">Stop</Button>
        </div>
      ) : null}
      <div className={styles.row}>
        {attach ? (
          <span ref={plus} className={styles.plusSlot}>
            <Tooltip label="Add a photo, a file, a voice note…" disabled={menu === 'plus' || menu === 'contacts'}>
              <IconButton icon="add" label="Add to the message" onClick={() => setMenu((m) => (m === 'plus' ? null : 'plus'))} disabled={disabled || busy || !!rec}
                          aria-haspopup="menu" aria-expanded={menu === 'plus'} data-testid="thread-add" />
            </Tooltip>
          </span>
        ) : maxPhotos > 0 ? (
          <Tooltip label={photos.length >= maxPhotos ? `Up to ${maxPhotos} photos` : 'Add photos'}>
            <IconButton icon="add_photo_alternate" label="Add photos" onClick={() => input.current?.click()} disabled={disabled || busy || photos.length >= maxPhotos} data-testid="thread-add-photo" />
          </Tooltip>
        ) : null}
        {maxPhotos > 0 ? <input ref={input} className={styles.fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => { void pick(e.target.files); e.target.value = '' }} data-testid="thread-photo-input" /> : null}
        {attach?.file ? <input ref={fileInput} className={styles.fileInput} type="file" accept={MESSAGE_FILE_ACCEPT} multiple onChange={(e) => { pickFiles(e.target.files); e.target.value = '' }} data-testid="thread-file-input" /> : null}
        {photos.length ? (
          <div className={styles.picked}>
            {photos.map((p, i) => (
              <span key={i} className={styles.pick}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" />
                <button type="button" className={styles.unpick} aria-label={`Take photo ${i + 1} off`} onClick={() => setPhotos((x) => x.filter((_, k) => k !== i))}><Icon name="close" size={14} /></button>
              </span>
            ))}
          </div>
        ) : null}
        {files.length || share ? (
          <div className={styles.picked}>
            {files.map((f) => (
              <span key={f.key} className={styles.pickChip} data-testid="thread-picked-file">
                <Icon name={f.voice ? 'mic' : 'attach_file'} size={16} weight={300} />
                <span className={styles.pickName}>{f.voice ? `Voice note · ${clockWords(f.durationMs)}` : f.name}</span>
                <span className={styles.fileMeta}>{f.fileId ? sizeWords(f.size) : `Sending ${Math.round(f.share * 100)}%`}</span>
                {f.fileId ? <button type="button" className={styles.unpickChip} aria-label={`Take ${f.voice ? 'the voice note' : f.name} off`} onClick={() => setFiles((x) => x.filter((p) => p.key !== f.key))}><Icon name="close" size={14} /></button> : null}
              </span>
            ))}
            {share ? (
              <span className={styles.pickChip} data-testid="thread-picked-share">
                <Icon name={share.kind === 'place' ? 'home' : 'badge'} size={16} weight={300} />
                <span className={styles.pickName}>{share.kind === 'place' ? 'The site’s location' : contact?.name ?? 'A contact'}</span>
                <button type="button" className={styles.unpickChip} aria-label="Take it off" onClick={() => setShare(null)}><Icon name="close" size={14} /></button>
              </span>
            ) : null}
          </div>
        ) : null}
        {extra}
        {hint ? <span className={styles.hint}>{hint}</span> : null}
        <span className={styles.send}>
          <Button onPress={() => { void send() }} isDisabled={disabled || busy || uploading || !!rec || empty} data-testid="thread-send">{busy ? 'Sending…' : uploading ? 'Sending files…' : sendLabel}</Button>
        </span>
      </div>
      {attach ? (
        <PortalMenu open={menu === 'plus'} anchor={plus} onClose={() => setMenu(null)} align="left" width={MENU_WIDTH.wide} role="menu" sheetTitle="Add to the message">
          {maxPhotos > 0 ? <DropdownItem disabled={photos.length >= maxPhotos} title={photos.length >= maxPhotos ? `Up to ${maxPhotos} photos` : undefined} onSelect={() => { setMenu(null); input.current?.click() }}><span data-testid="thread-add-photo-row">Photo</span></DropdownItem> : null}
          {attach.file ? <DropdownItem help="PDF, a document, a sheet or a video — up to 25 MB" disabled={files.length >= MESSAGE_FILES_MAX} onSelect={() => { setMenu(null); fileInput.current?.click() }}><span data-testid="thread-add-file">File</span></DropdownItem> : null}
          {attach.file && attach.voice ? <DropdownItem disabled={!canRecord || files.length >= MESSAGE_FILES_MAX} title={!canRecord ? 'This browser can’t record' : undefined} onSelect={() => { setMenu(null); void startRec() }}><span data-testid="thread-add-voice">Voice note</span></DropdownItem> : null}
          {attach.place !== undefined || attach.contacts?.length ? <DropdownDivider /> : null}
          {attach.place !== undefined ? (
            <DropdownItem disabled={!attach.place} title={attach.place ? undefined : 'The lead has no address yet'} help={attach.place ?? undefined} onSelect={() => { setMenu(null); setShare({ kind: 'place' }) }}><span data-testid="thread-add-place">The site’s location</span></DropdownItem>
          ) : null}
          {attach.contacts?.length ? <DropdownItem help="A member or a vendor, with Call and WhatsApp" onSelect={() => setMenu('contacts')}><span data-testid="thread-add-contact">A contact</span></DropdownItem> : null}
        </PortalMenu>
      ) : null}
      {attach?.contacts?.length ? (
        <PortalMenu open={menu === 'contacts'} anchor={plus} onClose={() => setMenu(null)} align="left" width={MENU_WIDTH.detail} role="menu" sheetTitle="A contact">
          {members.length ? <DropdownLabel>Members</DropdownLabel> : null}
          {members.map((c) => <DropdownItem key={c.id} help={[c.role, c.phone].filter(Boolean).join(' · ')} onSelect={() => { setMenu(null); setShare({ kind: 'contact', id: c.id }) }}>{c.name}</DropdownItem>)}
          {vendors.length ? <DropdownLabel>Vendors</DropdownLabel> : null}
          {vendors.map((c) => <DropdownItem key={c.id} help={[c.role, c.phone].filter(Boolean).join(' · ')} onSelect={() => { setMenu(null); setShare({ kind: 'contact', id: c.id }) }}>{c.name}</DropdownItem>)}
        </PortalMenu>
      ) : null}
      {emoji ? (
        <PortalMenu open={menu === 'emoji'} anchor={smile} onClose={() => setMenu(null)} align="right" width={MENU_WIDTH.detail} role="menu" sheetTitle="Emoji">
          <div className={styles.emojiGrid} role="group" aria-label="Emoji" data-testid="thread-emoji-grid">
            {EMOJI.map((e) => <button key={e} type="button" role="menuitem" className={styles.emojiBtn} aria-label={e} onClick={() => { setMenu(null); insert(e) }}>{e}</button>)}
          </div>
        </PortalMenu>
      ) : null}
    </div>
  )
}
