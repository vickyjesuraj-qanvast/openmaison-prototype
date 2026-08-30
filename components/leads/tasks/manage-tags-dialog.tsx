'use client'

import { Fragment, useState } from 'react'
import { Dialog } from '@/components/leads/move-stage/dialogs'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import type { Tag } from '@/lib/db/schema'
import styles from './manage-tags-dialog.module.css'

/**
 * Manage Tags (902:27709): a 400×600 modal (the shared Dialog at `size="modal"` — the 64px head p20/24 + rule of the
 * modal header standard 779:26016) listing every tag — name · delete · edit per row, rules between rows; edit turns the
 * row into a 284 text field with done (save) / close (cancel) icon buttons. No footer; ✕ / Esc close.
 * `onCreate` is part of the build-plan contract but the mock has no "new tag" affordance, so nothing here calls it —
 * new tags come from the Add Tag field's "hit enter to add". Spec: design-source/context/lead-tasks/03-panel-tags.txt.
 */
export function ManageTagsDialog({
  open, tags, onClose, onRename, onDelete,
}: {
  open: boolean
  tags: Tag[]
  onClose: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  /** Contract prop — unused: the dialog (902:27709) has no create affordance. */
  onCreate: (name: string) => void
}) {
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  // Never carry an edit across openings — render-phase adjust pattern.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) setEditing(null)
  }

  const save = () => {
    if (!editing) return
    const name = editing.name.trim()
    if (!name) return   // a tag keeps a name — an emptied field does not save
    const current = tags.find((t) => t.id === editing.id)
    if (current && name !== current.name) onRename(editing.id, name)
    setEditing(null)
  }
  const cancel = () => setEditing(null)

  return (
    <div className={styles.host}>
      <Dialog open={open} onClose={onClose} title="Manage Tags" width={400} size="modal" footer={null}>
        {tags.map((t, i) => (
          <Fragment key={t.id}>
            {i > 0 ? <div className={styles.rule} /> : null}
            {editing?.id === t.id ? (
              <div className={styles.editRow}>
                <TextField className={styles.editField} label="" value={editing.name} autoFocus
                           onChange={(v) => setEditing({ id: t.id, name: v })}
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') { e.preventDefault(); save() }
                             else if (e.key === 'Escape') { e.preventDefault(); cancel() }   // consumed: the dialog stays open
                           }} />
                <div className={styles.editActions}>
                  <Tooltip label="Save">
                    <IconButton icon="done" label={`Save ${t.name}`} size={24} variant="primary" className={styles.doneBtn} onClick={save} />
                  </Tooltip>
                  <Tooltip label="Cancel">
                    <IconButton icon="close" label="Cancel" size={24} onClick={cancel} />
                  </Tooltip>
                </div>
              </div>
            ) : (
              <div className={styles.row}>
                <span className={styles.name}>{t.name}</span>
                <Tooltip label="Delete tag">
                  <button type="button" className={styles.iconBtn} aria-label={`Delete ${t.name}`} onClick={() => onDelete(t.id)}>
                    <Icon name="delete" size={20} weight={300} />
                  </button>
                </Tooltip>
                <Tooltip label="Rename tag">
                  <button type="button" className={styles.iconBtn} aria-label={`Rename ${t.name}`} onClick={() => setEditing({ id: t.id, name: t.name })}>
                    <Icon name="edit" size={20} weight={300} />
                  </button>
                </Tooltip>
              </div>
            )}
          </Fragment>
        ))}
      </Dialog>
    </div>
  )
}
