'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { relativeTime } from '@/lib/format'
import type { Member } from '@/lib/db/schema'
import type { TaskRow } from '@/lib/leads/tasks'
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
  const [draft, setDraft] = useState('')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)
  const count = task.comments.length

  const submit = () => {
    const body = draft.trim()
    if (!body) return
    onAdd(body)
    setDraft('')
  }
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
        /* Footer 112 (V g12 p16/24): composer H g12 → my avatar 36 + column V g8 (field 36 · caption + Submit row 36). */
        <div className={styles.composer}>
          <CommentAvatar member={me} />
          <div className={styles.composerCol}>
            <TextField
              className={styles.field}
              label="Chat with your team here"
              placeholder="Chat with your team here"
              value={draft}
              onChange={setDraft}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            />
            <div className={styles.composerRow}>
              <span className={styles.privacy}>Clients can’t see these comments</span>
              <Button onPress={submit}>Submit</Button>
            </div>
          </div>
        </div>
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
                    <Tooltip label="Comment actions" disabled={menuFor === c.id}>
                      <button
                        type="button"
                        className={styles.kebab}
                        aria-label="Comment actions"
                        aria-haspopup="menu"
                        aria-expanded={menuFor === c.id}
                        onClick={() => setMenuFor((m) => (m === c.id ? null : c.id))}
                      >
                        <Icon name="more_horiz" size={20} />
                      </button>
                    </Tooltip>
                    <Dropdown open={menuFor === c.id} onClose={() => setMenuFor(null)} align="right" sheetTitle="Comment">
                      {mine ? (
                        <DropdownItem onSelect={() => { setMenuFor(null); setEditing({ id: c.id, body: c.body }) }}>Edit</DropdownItem>
                      ) : null}
                      <DropdownItem onSelect={() => { setMenuFor(null); onDelete(c.id) }}>
                        {/* Danger item — the same inline red the listing's row kebab uses for Delete (components/leads/table.tsx). */}
                        <span className={styles.danger}>Delete</span>
                      </DropdownItem>
                    </Dropdown>
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
    </Drawer>
  )
}

/**
 * 36px avatar ("Avatar Generic 36 r4": photo for members whose colour is 'photo', otherwise the initial 14/Medium on the
 * member's tint). components/om/avatar only ships 24 and 40, so this is that component's markup + CSS at 36 (cannot edit om/*).
 */
function CommentAvatar({ member }: { member: Member | null }) {
  const name = member?.name ?? ''
  if (member?.color === 'photo') {
    return (
      <span className={styles.avatar} aria-hidden title={name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.avatarPhoto} src="/figma-assets/avatar-user.png" alt="" />
      </span>
    )
  }
  return (
    <span className={styles.avatar} style={member ? { background: member.color } : undefined} aria-hidden title={name}>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
