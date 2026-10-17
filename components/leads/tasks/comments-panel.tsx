'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { relativeTime } from '@/lib/format'
import { CommentComposer } from './comment-composer'
import type { Member } from '@/lib/db/schema'
import type { TaskRow } from '@/lib/leads/tasks'
import { avatarSrc } from '@/lib/company/member-photo'
import styles from './comments-panel.module.css'

/**
 * Comments panel (902:28619 frame 73 · kebab 74 · edit 75): the Task drawer with a "Task / " crumb, the thread in the body
 * and the composer in a 112px footer. Spec: design-source/context/lead-tasks/04-comments-attach.txt.
 * Every comment carries the kebab (the mock shows it on both); "Edit" is offered only on my own comments, "Delete" on all.
 */
export function CommentsPanel({
  task, me, now, onBack, onClose, onAdd, onEdit, onDelete,
}: {
  task: TaskRow
  me: Member
  now: number
  onBack: () => void
  onClose: () => void
  onAdd: (body: string) => void
  onEdit: (id: string, body: string) => void
  onDelete: (id: string) => void
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null)
  /* (REG-728) One menu at a time, through the body portal, anchored to the pressed kebab. */
  const kebab = useRef<HTMLElement | null>(null)
  const menuComment = menuFor ? task.comments.find((c) => c.id === menuFor) ?? null : null
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)
  const count = task.comments.length

  const saveEdit = () => {
    if (!editing) return
    const body = editing.body.trim()
    if (body) onEdit(editing.id, body)
    setEditing(null)
  }

  return (
    <Drawer
      open
      crumb="Task / "
      title="Comments"
      onBack={onBack}
      onClose={onClose}
      label="Comments"
      footer={
        /* Footer (V g12 p16/24): composer H g12 → my avatar 36 + column V g8 (field · caption + Submit row 36). (UX audit 2026-09-30, T8) the
           field is multi-line — Enter posts, Shift+Enter breaks the line — and the file viewer's comments share this composer. */
        <CommentComposer me={me} onSubmit={onAdd} />
      }
    >
      <div className={styles.thread}>
        <span className={styles.count}>{count === 1 ? '1 Comment' : `${count} Comments`}</span>
        {task.comments.map((c) => {
          const mine = c.author?.id === me.id
          const isEditing = editing?.id === c.id
          return (
            <div key={c.id} className={styles.comment}>
              <CommentAvatar member={c.author} />
              <div className={styles.textCol}>
                <div className={styles.meta}>
                  <span className={styles.author}>{mine ? 'You' : c.author?.name ?? 'Member'}</span>
                  <span className={styles.time}>{relativeTime(c.createdAt, new Date(now))}</span>
                  <div className={styles.kebabWrap}>
                    {/* (REG-729) The house kebab in a head: IconButton 24 bare, a 24 glyph (it was a 20 box) */}
                    <Tooltip label="Comment actions" disabled={menuFor === c.id}>
                      <IconButton icon="more_horiz" label="Comment actions" size={24} variant="bare" iconSize={24} className={styles.kebabBtn}
                                  aria-haspopup="menu" aria-expanded={menuFor === c.id}
                                  onClick={(e) => { kebab.current = e.currentTarget; setMenuFor((m) => (m === c.id ? null : c.id)) }} />
                    </Tooltip>
                  </div>
                </div>
                {isEditing && editing ? (
                  /* Edit state (frame 75): the text becomes a 36px active field, then Cancel · Save right-aligned, 8 apart, in a 24px row. */
                  <div className={styles.editBlock}>
                    <TextField
                      className={styles.field}
                      label=""
                      value={editing.body}
                      autoFocus
                      onChange={(v) => setEditing((e) => (e ? { ...e, body: v } : e))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
                        if (e.key === 'Escape') { e.preventDefault(); setEditing(null) }
                      }}
                    />
                    <div className={styles.editRow}>
                      <Button size="sm" variant="secondary" appearance="outlined" onPress={() => setEditing(null)}>Cancel</Button>
                      <Button size="sm" onPress={saveEdit}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <p className={styles.body}>{c.body}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <PortalMenu open={!!menuComment} anchor={kebab} onClose={() => setMenuFor(null)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle="Comment">
        {menuComment && menuComment.author?.id === me.id ? (
          <DropdownItem onSelect={() => { setMenuFor(null); setEditing({ id: menuComment.id, body: menuComment.body }) }}>Edit</DropdownItem>
        ) : null}
        <DropdownItem tone="danger" onSelect={() => { const c = menuComment; setMenuFor(null); if (c) onDelete(c.id) }}>Delete</DropdownItem>
      </PortalMenu>
    </Drawer>
  )
}

/**
 * 36px avatar ("Avatar Generic 36 r4": photo for members whose colour is 'photo', otherwise the initial 14/Medium on the
 * member's tint). components/om/avatar only ships 24 and 40, so this is that component's markup + CSS at 36 (cannot edit om/*).
 */
export function CommentAvatar({ member }: { member: Member | null }) {
  const name = member?.name ?? ''
  const src = avatarSrc(member?.color)   // (pending modules S01) the member's own photo, or the demo's portrait
  if (src) {
    return (
      <span className={styles.avatar} aria-hidden title={name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.avatarPhoto} src={src} alt="" />
      </span>
    )
  }
  return (
    <span className={styles.avatar} style={member ? { background: member.color } : undefined} aria-hidden title={name}>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
