'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { DropdownItem, DropdownLabel, MENU_WIDTH } from '@/components/leads/dropdown'
import { AskMenu } from '@/components/projects/threads/ask-menu'
import { displayDate, displayDateTime } from '@/lib/format'
import { COMMENT_MAX, LAYERS, PHOTOS_MAX, SIDE_LABEL, TOOL_ICON, layerOf, type MarkView, type Side } from '@/lib/projects/floor-plan-model'
import styles from './floor-plan.module.css'

/**
 * (gaps build G, G-Q8 · G-Q9 · G-Q10) A mark in the rail — closed, one line of what it is, who drew it, its words and its thread's count (1.0
 * F-205); opened, its conversation (1.0 F-206): each line with its side (Studio · Client), up to five photos per comment, Enter sends;
 * Resolve / Reopen for either side; Delete for its author (with Undo); for the studio, its layer, *Make a task* and *Raise a variation order*
 * — each a link once made. Both sides draw it; `studio` decides the studio's own rows.
 * (simplify S-22) The studio's Reply · Make a task · Raise a variation order sit on the one ⋮ every client ask carries (AskMenu — messages and
 * tickets have it too); the rows keep their test ids (plan-mark-task · plan-mark-vo).
 */
export type MarkActions = {
  onOpen: (id: string | null) => void
  onStatus: (m: MarkView) => void
  onDelete: (m: MarkView) => void
  onComment: (m: MarkView, body: string, photos: File[]) => Promise<boolean>
  onTask?: (m: MarkView) => void
  onVariation?: (m: MarkView) => void
  onLayer?: (m: MarkView, layer: string) => void
  onPhoto?: (src: string, name: string) => void
}

export function MarkCard({ m, name, open, studio, mayAct, money, busy, actions }: {
  m: MarkView; name: string; open: boolean; studio: boolean
  /** may comment, resolve, delete their own — false on a completed project and in a studio's preview */
  mayAct: boolean
  /** may raise a variation order (sees the project's money) */
  money?: boolean
  busy?: boolean
  actions: MarkActions
}) {
  const [body, setBody] = useState('')
  const [queued, setQueued] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [layerOpen, setLayerOpen] = useState(false)
  const layerRef = useRef<HTMLSpanElement>(null)
  const pick = useRef<HTMLInputElement>(null)
  const replyBox = useRef<HTMLDivElement>(null)
  const focusReply = () => { const f = replyBox.current?.querySelector<HTMLElement>('textarea, input:not([type="file"])'); f?.scrollIntoView({ block: 'nearest' }); f?.focus() }
  const words = m.shape.text ?? null
  const send = async () => {
    if (sending || (!body.trim() && !queued.length)) return
    setSending(true)
    const ok = await actions.onComment(m, body.trim(), queued)
    setSending(false)
    if (ok) { setBody(''); setQueued([]) }
  }
  const sideChip = (s: Side) => <MetaChip color={s === 'client' ? 'red' : 'blue'}>{SIDE_LABEL[s]}</MetaChip>
  return (
    <article className={styles.mark} data-open={open || undefined} data-testid="plan-mark" data-mark-id={m.id} data-kb-row="" data-kb-id={m.id}>
      <button type="button" className={styles.markHead} onClick={() => actions.onOpen(open ? null : m.id)} aria-expanded={open} data-kb-open="">
        <span className={styles.markGlyph} data-side={m.side}><Icon name={TOOL_ICON[m.tool]} size={18} /></span>
        <span className={styles.markText}>
          <span className={styles.markName}>{name}{m.status === 'resolved' ? <MetaChip color="green">Resolved</MetaChip> : null}</span>
          <span className={styles.markLine}>{[m.author, studio && m.layer !== 'general' ? layerOf(m.layer).label : null, displayDate(new Date(m.at))].filter(Boolean).join(' · ')}</span>
          {words && !open ? <span className={styles.markWords}>{`“${words}”`}</span> : null}
        </span>
        <span className={styles.markCount}>{m.comments.length ? <><Icon name="comment" size={16} />{m.comments.length}</> : null}{m.photos.length ? <><Icon name="photo_camera" size={16} />{m.photos.length}</> : null}</span>
      </button>
      {open ? (
        <div className={styles.markBody}>
          <div className={styles.markMeta}>
            {sideChip(m.side)}
            {studio && m.layer === 'studio_only' ? <MetaChip icon="visibility_off">Studio only</MetaChip> : null}
            {studio && actions.onLayer && mayAct ? (
              <span ref={layerRef} className={styles.anchor}>
                <Button variant="secondary" appearance="text" size="sm" onPress={() => setLayerOpen((o) => !o)} aria-haspopup="menu" aria-expanded={layerOpen} data-testid="plan-mark-layer">{`Layer: ${layerOf(m.layer).label}`}</Button>
                <PortalMenu open={layerOpen} anchor={layerRef} onClose={() => setLayerOpen(false)} width={MENU_WIDTH.detail} role="menu" sheetTitle="Move to a layer">
                  <DropdownLabel>Move to a layer</DropdownLabel>
                  {LAYERS.map((l) => {
                    const refused = m.side === 'client' && l.studioOnly
                    return <DropdownItem key={l.key} role="menuitemradio" checked={m.layer === l.key} disabled={refused} title={refused ? 'A client’s mark stays where they can see it' : undefined}
                                         help={!refused && l.studioOnly ? 'The client never sees these' : undefined} onSelect={() => { setLayerOpen(false); actions.onLayer?.(m, l.key) }}>{l.label}</DropdownItem>
                  })}
                </PortalMenu>
              </span>
            ) : null}
          </div>
          {words ? <p className={styles.markQuote}>{`“${words}”`}</p> : null}
          {m.photos.length ? (
            <div className={styles.photos}>
              {m.photos.map((p, i) => (
                <button key={p.id} type="button" className={styles.photo} onClick={() => actions.onPhoto?.(p.src, `${name} · photo ${i + 1}`)} aria-label={`Open photo ${i + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt="" loading="lazy" />
                </button>
              ))}
              {m.shape.takenOn ? <span className={styles.markLine}>{`On site · ${displayDate(new Date(`${m.shape.takenOn}T12:00:00`))}`}</span> : null}
            </div>
          ) : null}
          {m.comments.length ? (
            <ol className={styles.thread} aria-label="Conversation">
              {m.comments.map((c) => (
                <li key={c.id} className={styles.comment} data-side={c.side}>
                  <span className={styles.commentHead}>{sideChip(c.side)}<span className={styles.commentWho}>{c.author}</span><span className={styles.markLine}>{displayDateTime(new Date(c.at))}</span></span>
                  {c.body ? <p className={styles.commentBody}>{c.body}</p> : null}
                  {c.photos.length ? (
                    <span className={styles.photos}>
                      {c.photos.map((p, i) => (
                        <button key={p.id} type="button" className={styles.photo} onClick={() => actions.onPhoto?.(p.src, `${c.author} · photo ${i + 1}`)} aria-label={`Open photo ${i + 1}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.src} alt="" loading="lazy" />
                        </button>
                      ))}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
          {mayAct ? (
            <div ref={replyBox} className={styles.reply}>
              <TextField label={queued.length ? 'Add a note (optional)' : 'Add a comment'} value={body} onChange={setBody} maxLength={COMMENT_MAX} multiline={2}
                         onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }} />
              {queued.length ? (
                <div className={styles.queued}>
                  {queued.map((f, i) => <MetaChip key={`${f.name}-${i}`} icon="image">{f.name}</MetaChip>)}
                  <Button variant="secondary" appearance="text" size="sm" onPress={() => setQueued([])}>Remove photos</Button>
                </div>
              ) : null}
              <div className={styles.replyFoot}>
                <input ref={pick} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden
                       onChange={(e) => { const files = [...(e.target.files ?? [])]; e.target.value = ''; setQueued((q) => [...q, ...files].slice(0, PHOTOS_MAX)) }} />
                <Tooltip label={queued.length >= PHOTOS_MAX ? `Up to ${PHOTOS_MAX} photos` : 'Add a photo — show what you mean'}>
                  <IconButton icon="photo_camera" label="Add a photo" variant="bare" disabled={queued.length >= PHOTOS_MAX} onClick={() => pick.current?.click()} data-testid="plan-comment-photo" />
                </Tooltip>
                <Button variant="primary" size="sm" onPress={() => void send()} isDisabled={sending || (!body.trim() && !queued.length)} data-testid="plan-comment-send">Send</Button>
              </div>
            </div>
          ) : null}
          {mayAct || m.task || m.variation ? (
            <div className={styles.markActions}>
              {mayAct ? <Button variant="secondary" appearance="outlined" size="sm" iconStart={<Icon name={m.status === 'resolved' ? 'undo' : 'check_circle'} size={18} />} onPress={() => actions.onStatus(m)} isDisabled={busy} data-testid="plan-mark-status">{m.status === 'resolved' ? 'Reopen' : 'Mark resolved'}</Button> : null}
              {mayAct && m.mine ? <Button variant="secondary" appearance="text" size="sm" iconStart={<Icon name="delete" size={18} />} onPress={() => actions.onDelete(m)} isDisabled={busy} data-testid="plan-mark-delete">Delete</Button> : null}
              {studio ? (
                <AskMenu label={name} busy={busy} money={mayAct && !!money} testId="plan-mark-asks" ids={{ reply: 'plan-mark-reply', task: 'plan-mark-task', vo: 'plan-mark-vo' }}
                         links={{ task: m.task ? { id: m.task.id, title: m.task.title, done: m.task.done } : null, vo: m.variation ? { id: m.variation.id, number: m.variation.number, status: m.variation.status } : null }}
                         onReply={mayAct ? focusReply : undefined}
                         onTask={actions.onTask && (mayAct || m.task) ? () => actions.onTask?.(m) : undefined}
                         onVariation={actions.onVariation && (m.variation || mayAct) ? () => actions.onVariation?.(m) : undefined} />
              ) : null}
            </div>
          ) : null}
          {studio && (m.task || m.variation) ? (
            <p className={styles.markLine}>{[m.task ? `Task: ${m.task.title}${m.task.done ? ' (done)' : ''}` : null, m.variation ? `Variation order ${m.variation.number} · ${m.variation.status}` : null].filter(Boolean).join(' · ')}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
