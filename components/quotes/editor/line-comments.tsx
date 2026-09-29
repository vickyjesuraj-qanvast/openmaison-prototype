'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { CommentAvatar } from '@/components/leads/tasks/comments-panel'
import { relativeTime } from '@/lib/format'
import type { Member, QuoteItemComment } from '@/lib/db/schema'
import styles from '@/components/leads/tasks/comments-panel.module.css'
import own from './line-comments.module.css'

/**
 * (REG-627, quote editor parity Q-30) Comments on the quote's lines — the Tasks comments panel (902:28619) for a line: the drawer, the
 * thread, the composer in the footer, "Clients can’t see these comments". Opened on a line (its ⋯ › Comment, or the count beside its
 * name) it is that line's thread, with "All comments" as the way back; from the header's Comments it lists every line that has a thread,
 * and the composer asks which line. Edit on one's own comments, Delete on all — the Tasks rule.
 */
export function LineCommentsDrawer({ open, lines, comments, focus, me, members, now, onFocus, onClose, onAdd, onEdit, onDelete }: {
  open: boolean
  lines: { id: string; name: string }[]
  comments: QuoteItemComment[]
  /** The line whose thread is open; null = every thread. */
  focus: string | null
  me: Member | null
  members: Member[]
  now: number
  onFocus: (itemId: string | null) => void
  onClose: () => void
  onAdd: (itemId: string, body: string) => void
  onEdit: (id: string, body: string) => void
  onDelete: (id: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [target, setTarget] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)
  const live = new Set(lines.map((l) => l.id))
  const nameOf = (id: string) => lines.find((l) => l.id === id)?.name || 'Item'
  const shown = comments.filter((c) => live.has(c.itemId) && (!focus || c.itemId === focus))
  const threads = focus ? [focus] : [...new Set(shown.map((c) => c.itemId))]
  const postTo = focus ?? target ?? threads[0] ?? lines[0]?.id ?? null
  const submit = () => { const body = draft.trim(); if (!body || !postTo) return; onAdd(postTo, body); setDraft('') }
  const saveEdit = () => { if (!editing) return; const body = editing.body.trim(); if (body) onEdit(editing.id, body); setEditing(null) }
  const author = (id: string) => members.find((m) => m.id === id) ?? null

  return !open ? null : (
    <Drawer open crumb={focus ? 'Comments / ' : undefined} onBack={focus ? () => onFocus(null) : undefined} title={focus ? nameOf(focus) : 'Comments'} label={focus ? `Comments on ${nameOf(focus)}` : 'Comments'} onClose={onClose}
            footer={
              <div className={styles.composer} data-testid="line-comment-composer">
                <CommentAvatar member={me} />
                <div className={styles.composerCol}>
                  {!focus && lines.length ? (
                    <TextField label="Comment on" mode="select" size="s" options={lines.map((l) => l.name || 'Item')} value={postTo ? nameOf(postTo) : ''}
                               onChange={(v) => setTarget(lines.find((l) => (l.name || 'Item') === v)?.id ?? null)} />
                  ) : null}
                  <TextField className={styles.field} label="Chat with your team here" placeholder="Chat with your team here" value={draft} onChange={setDraft}
                             onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }} />
                  <div className={styles.composerRow}>
                    <span className={styles.privacy}>Clients can’t see these comments</span>
                    <Button onPress={submit} isDisabled={!draft.trim() || !postTo}>Submit</Button>
                  </div>
                </div>
              </div>
            }>
      <div className={styles.thread} data-testid="line-comments">
        <span className={styles.count}>{shown.length === 1 ? '1 Comment' : `${shown.length} Comments`}{focus ? '' : threads.length ? ` · ${threads.length} ${threads.length === 1 ? 'line' : 'lines'}` : ''}</span>
        {!shown.length ? <p className={own.empty}>{focus ? 'No comments on this line yet. Ask your team about it below.' : 'No comments on this quote’s lines yet. Comment on a line from its ⋯ menu, or pick one below.'}</p> : null}
        {threads.map((itemId) => (
          <section key={itemId} className={own.group} aria-label={`Comments on ${nameOf(itemId)}`}>
            {focus ? null : (
              <button type="button" className={own.lineHead} onClick={() => onFocus(itemId)}>
                <Icon name="comment" size={16} weight={300} /><span className={own.lineName}>{nameOf(itemId)}</span><Icon name="chevron_right" size={18} />
              </button>
            )}
            {shown.filter((c) => c.itemId === itemId).map((c) => {
              const mine = c.authorId === me?.id
              const a = author(c.authorId)
              const isEditing = editing?.id === c.id
              return (
                <div key={c.id} className={styles.comment} data-testid="line-comment">
                  <CommentAvatar member={a} />
                  <div className={styles.textCol}>
                    <div className={styles.meta}>
                      <span className={styles.author}>{mine ? 'You' : a?.name ?? 'Member'}</span>
                      <span className={styles.time}>{relativeTime(c.createdAt, new Date(now))}</span>
                      <CommentMenu open={menuFor === c.id} mine={mine} onToggle={() => setMenuFor((m) => (m === c.id ? null : c.id))} onClose={() => setMenuFor(null)}
                                   onEdit={() => { setMenuFor(null); setEditing({ id: c.id, body: c.body }) }} onDelete={() => { setMenuFor(null); onDelete(c.id) }} />
                    </div>
                    {isEditing && editing ? (
                      <div className={styles.editBlock}>
                        <TextField className={styles.field} label="" value={editing.body} autoFocus onChange={(v) => setEditing((e) => (e ? { ...e, body: v } : e))}
                                   onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } if (e.key === 'Escape') { e.preventDefault(); setEditing(null) } }} />
                        <div className={styles.editRow}>
                          <Button size="sm" variant="secondary" appearance="outlined" onPress={() => setEditing(null)}>Cancel</Button>
                          <Button size="sm" onPress={saveEdit}>Save</Button>
                        </div>
                      </div>
                    ) : <p className={styles.body}>{c.body}</p>}
                  </div>
                </div>
              )
            })}
          </section>
        ))}
      </div>
    </Drawer>
  )
}

/** (REG-728) A comment's kebab: its menu opens through the body portal (PortalMenu), as every row menu does — the inline one sat inside
 *  the drawer's scroller. The trigger stays the Tasks thread's; Delete is the house row's danger tone (the same red). */
function CommentMenu({ open, mine, onToggle, onClose, onEdit, onDelete }: { open: boolean; mine: boolean; onToggle: () => void; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const anchor = useRef<HTMLDivElement>(null)
  return (
    <div ref={anchor} className={styles.kebabWrap}>
      <Tooltip label="Comment actions" disabled={open}>
        <button type="button" className={styles.kebab} aria-label="Comment actions" aria-haspopup="menu" aria-expanded={open} onClick={onToggle}>
          <Icon name="more_horiz" size={20} />
        </button>
      </Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={onClose} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle="Comment">
        {mine ? <DropdownItem onSelect={onEdit}>Edit</DropdownItem> : null}
        <DropdownItem tone="danger" onSelect={onDelete}>Delete</DropdownItem>
      </PortalMenu>
    </div>
  )
}
