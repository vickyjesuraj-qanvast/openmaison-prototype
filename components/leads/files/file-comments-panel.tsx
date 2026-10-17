'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { SurfaceFoot, SurfaceHead } from '@/components/om/dialog'
import { useOverflow } from '@/components/om/use-overflow'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { relativeTime } from '@/lib/format'
import { CommentComposer } from '@/components/leads/tasks/comment-composer'
import type { Member } from '@/lib/db/schema'
import type { FileViewData } from '@/lib/leads/files'
import { avatarSrc } from '@/lib/company/member-photo'
import styles from './file-comments-panel.module.css'

/**
 * Viewer › Comments panel (frame 93, 931:39891): embedded in the page's 400px column (not the fixed Drawer) —
 * head 64 "Comments" + close (931:39921), body p24 (931:39928; empty state = illustration 180 + texts), footer 88 with the
 * composer (931:39946: Avatar 36 + Text Field 36 "Chat with your team here" + "Clients can’t see these comments").
 * The thread with comments is not mocked here: the rows (count line, kebab Edit / Delete, inline edit) are copied from
 * the Tasks comments panel, components/leads/tasks/comments-panel.tsx (902:28619). Spec: design-source/context/lead-files/03-viewer-panels.txt.
 */
export function FileCommentsPanel({
  comments, me, now, onAdd, onEdit, onDelete, onClose, readOnly = false,
}: {
  comments: FileViewData['comments']
  me: Member
  now: number
  onAdd: (body: string) => void
  onEdit: (id: string, body: string) => void
  onDelete: (id: string) => void
  /** (pending modules S06) the viewer reads only (Accounting): the thread, with no composer and no comment menu */
  readOnly?: boolean
  onClose: () => void
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null)
  /* (REG-728) One menu at a time, through the body portal, anchored to the pressed kebab. */
  const kebab = useRef<HTMLElement | null>(null)
  const menuComment = menuFor ? comments.find((c) => c.id === menuFor) ?? null : null
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)
  const [scrollRef, bodyScrolls] = useOverflow()   // (REG-725) the composer's shadow only while the thread scrolls under it
  const count = comments.length

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
                      {readOnly ? null : <div className={styles.kebabWrap}>
                        {/* (REG-729) The house kebab in a head: IconButton 24 bare, a 24 glyph (it was a 20 box) */}
                        <Tooltip label="Comment actions" disabled={menuFor === c.id}>
                          <IconButton icon="more_horiz" label="Comment actions" size={24} variant="bare" iconSize={24} className={styles.kebabBtn}
                                      aria-haspopup="menu" aria-expanded={menuFor === c.id}
                                      onClick={(e) => { kebab.current = e.currentTarget; setMenuFor((m) => (m === c.id ? null : c.id)) }} />
                        </Tooltip>
                      </div>}
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
      <PortalMenu open={!!menuComment} anchor={kebab} onClose={() => setMenuFor(null)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle="Comment">
        {menuComment && menuComment.author?.id === me.id ? (
          <DropdownItem onSelect={() => { setMenuFor(null); setEditing({ id: menuComment.id, body: menuComment.body }) }}>Edit</DropdownItem>
        ) : null}
        <DropdownItem tone="danger" onSelect={() => { const c = menuComment; setMenuFor(null); if (c) onDelete(c.id) }}>Delete</DropdownItem>
      </PortalMenu>

      {/* Footer (931:39946), p16/24, top rule. (UX audit 2026-09-30, T8) The mock's one-line field with no Submit is the task panel's composer
          now (components/leads/tasks/comment-composer.tsx): multi-line, Enter posts, Shift+Enter breaks the line, Submit beside the caption. */}
      {readOnly ? null : <SurfaceFoot shadow={bodyScrolls} className={styles.footer}>
        <CommentComposer me={me} onSubmit={onAdd} />
      </SurfaceFoot>}
    </div>
  )
}

/**
 * "Avatar Generic 36" (931:39946: 36×36, fill #387e47 = the member's tint, r4). components/om/avatar only ships 24 and 40,
 * so this is that component's markup + CSS at 36 — the same copy the Tasks comments panel carries.
 */
function CommentAvatar({ member }: { member: Member | null }) {
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
