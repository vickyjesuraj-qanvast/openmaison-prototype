'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { SurfaceFoot, SurfaceHead } from '@/components/om/dialog'
import { useOverflow } from '@/components/om/use-overflow'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { relativeTime } from '@/lib/format'
import type { Member } from '@/lib/db/schema'
import type { FileViewData } from '@/lib/leads/files'
import styles from './file-comments-panel.module.css'

/**
 * Viewer › Comments panel (frame 93, 931:39891): embedded in the page's 400px column (not the fixed Drawer) —
 * head 64 "Comments" + close (931:39921), body p24 (931:39928; empty state = illustration 180 + texts), footer 88 with the
 * composer (931:39946: Avatar 36 + Text Field 36 "Chat with your team here" + "Clients can’t see these comments").
 * The thread with comments is not mocked here: the rows (count line, kebab Edit / Delete, inline edit) are copied from
 * the Tasks comments panel, components/leads/tasks/comments-panel.tsx (902:28619). Spec: design-source/context/lead-files/03-viewer-panels.txt.
 */
export function FileCommentsPanel({
  comments, me, now, onAdd, onEdit, onDelete, onClose,
}: {
  comments: FileViewData['comments']
  me: Member
  now: number
  onAdd: (body: string) => void
  onEdit: (id: string, body: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState('')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)
  const [scrollRef, bodyScrolls] = useOverflow()   // (REG-725) the composer's shadow only while the thread scrolls under it
  const count = comments.length

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
    <div className={styles.panel}>
      {/* Panel head (931:39921) 64, H g16 p20/24, bottom rule: "Comments" 20/Bold + close 24 secondary.
          (REG-725) the house head and foot (components/om/dialog.tsx): the rule inside the 64, the outlined bare close; the composer
          rides in the house foot — its top rule always, its shadow only while the thread scrolls. */}
      <SurfaceHead title="Comments" onClose={onClose} className={styles.head} />

      <div ref={scrollRef} className={styles.body}>
        {count === 0 ? (
          /* Empty state (931:39928): undraw_empty-mailbox 180×180 → 24 → texts V g12 */
          <div className={styles.empty}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.art} src="/figma-assets/empty-comments.svg" alt="" width={180} height={180} />
            <div className={styles.texts}>
              <p className={styles.emptyTitle}>Add your first comment</p>
              <p className={styles.emptyBody}>Your comments will show up here.</p>
            </div>
          </div>
        ) : (
          <div className={styles.thread}>
            <span className={styles.count}>{count === 1 ? '1 Comment' : `${count} Comments`}</span>
            {comments.map((c) => {
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
                            <span className={styles.danger}>Delete</span>
                          </DropdownItem>
                        </Dropdown>
                      </div>
                    </div>
                    {isEditing && editing ? (
                      /* Edit state (tasks frame 75): the text becomes a 36px active field, then Cancel · Save right-aligned. */
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
                      <p className={styles.commentBody}>{c.body}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer (931:39946) 400×88, V g12 p16/24, top rule: Avatar 36 + [V g8] field 36 + caption 12. Enter posts (no Submit button in this mock). */}
      <SurfaceFoot shadow={bodyScrolls} className={styles.footer}>
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
            <span className={styles.privacy}>Clients can’t see these comments</span>
          </div>
        </div>
      </SurfaceFoot>
    </div>
  )
}

/**
 * "Avatar Generic 36" (931:39946: 36×36, fill #387e47 = the member's tint, r4). components/om/avatar only ships 24 and 40,
 * so this is that component's markup + CSS at 36 — the same copy the Tasks comments panel carries.
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
