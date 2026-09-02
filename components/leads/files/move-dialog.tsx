'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { modalPanel, overlayFade } from '@/lib/motion'
import { childrenOf, descendantIds, folderPath, isFolder, type FileRow } from '@/lib/leads/file-model'
import styles from './move-dialog.module.css'

/**
 * Move dialog (931:39219 frame 100 · 101 inside a folder 931:39285 · 106 New Folder 931:39335 · 107 "Move 2 items") —
 * ModalComponent 600×600, r12. Spec: design-source/context/lead-files/04-dialogs-move-deleted.txt.
 * Shell (overlay, panel, Escape / scrim close, scroll lock, footer) copied from the tasks filters modal
 * (components/leads/tasks/tasks-filters-modal.tsx, the 600×600 twin).
 *
 * Head 122: title row ("Move “<name>”" / "Move n items" 20/Bold + close 24) over the location row
 * ("Current location: " 14/Regular + chip: folder 24 secondary + name 14/Semi Bold, stroke #cccccc r4).
 * Body: browsing starts at the root — folder rows 40 (folder 24 · name · keyboard_arrow_right 24/Light; hover fill #f2f2f2
 * + a 24px "Move" primary filled button before the chevron), file rows 36 (thumb 24×18 + name, listed for orientation
 * only). Inside a folder the folder head replaces the crumb: arrow_back 24/Light · "All Files / " 12 secondary ·
 * folder name 20/Bold, then that folder's rows. Footer 68: New Folder (primary outlined, leading create_new_folder 20)
 * left · Cancel · Move right; New Folder swaps the footer for Cancel · Create and shows the inline "Create Folder"
 * heading + Name field under the list.
 *
 * Decisions the mock leaves open (all in the build plan): the chip reads "All Files" at the root; Move is enabled only
 * when the browsed folder differs from where the items sit (frame 100: disabled at the root with root items; frame 101:
 * enabled inside a folder) — so the root becomes a destination when the items are inside a folder; the items being
 * moved and their descendants never appear in the list (a folder can't move into itself); the row-hover "Move" is
 * withheld on the folder the items already sit in; a folder deeper than one level spells the crumb out
 * ("All Files / Kitchen / "); Create Folder drills into the folder it just made.
 */
export function MoveDialog({
  open, items, files, currentFolder, onMove, onCreateFolder, onClose,
}: {
  open: boolean
  /** The files / folders being moved. */
  items: FileRow[]
  /** Every untrashed file / folder of the lead (the browse tree). */
  files: FileRow[]
  /** Where the items sit now (null = the root "All Files"). */
  currentFolder: FileRow | null
  onMove: (parentId: string | null) => void
  /** Creates the folder inside `parentId` and resolves with its id. */
  onCreateFolder: (name: string, parentId: string | null) => Promise<string>
  onClose: () => void
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const snackbar = useSnackbar()
  const [folderId, setFolderId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  /* (REG-287) `aria-modal` promises the page behind is inert, so the panel owes the WAI-ARIA dialog contract:
     focus moves in on open, Tab cycles inside it, and focus returns to the opener on close. Esc rides the shared
     layer policy (components/om/surface.ts) instead of the hand-rolled `!e.defaultPrevented` window listener this
     replaces. The Create Folder field's own autoFocus is untouched: it mounts on a later render, long after the
     focus effect has run, and the effect never steals focus that is already inside the panel. */
  const panel = useRef<HTMLDivElement>(null)
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)

  // Render-phase adjust: every opening browses from the root with no Create Folder form.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setFolderId(null); setCreating(false); setNewName(''); setBusy(false) }
  }

  // The moved items and everything inside a moved folder stay out of the browse list.
  const hidden = useMemo(() => {
    const set = new Set<string>()
    for (const it of items) { set.add(it.id); if (isFolder(it)) descendantIds(files, it.id).forEach((id) => set.add(id)) }
    return set
  }, [items, files])

  const rows = childrenOf(files, folderId).filter((f) => !hidden.has(f.id))
  const folders = rows.filter(isFolder)
  const plain = rows.filter((f) => !isFolder(f))
  const here = folderId ? files.find((f) => f.id === folderId) ?? null : null
  const path = folderPath(files, folderId)
  const crumb = `${['All Files', ...path.slice(0, -1).map((f) => f.name)].join(' / ')} / `
  const currentParent = currentFolder?.id ?? null
  const canMove = folderId !== currentParent

  const first = items[0]
  const title = items.length === 1 && first ? `Move “${first.name}”` : `Move ${items.length} items`
  const trimmed = newName.trim()

  const create = async () => {
    if (!trimmed || busy) return
    setBusy(true)
    try {
      const id = await onCreateFolder(trimmed, folderId)
      setFolderId(id)   // frame 106 → the new folder opens as the destination
      setCreating(false)
      setNewName('')
    } catch {
      snackbar({ message: 'Couldn’t create the folder — please try again' })   // the tab's `fail` wording; the form stays open
    } finally { setBusy(false) }
  }
  const cancelCreate = () => { setCreating(false); setNewName('') }
  const drill = (f: FileRow) => { setFolderId(f.id); cancelCreate() }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          {/* (REG-287) tabIndex={-1} so the panel can hold focus; `outline: none` matches every other panel that takes
              focus on open (components/om/dialog.module.css, move-stage/wizard.module.css) — inline because this
              surface's stylesheet is outside this pass. The ring belongs to the panel's own controls. */}
          <motion.div ref={panel} className={styles.panel} style={{ outline: 'none' }} variants={modalPanel}
                      role="dialog" aria-modal aria-label={title} tabIndex={-1}>
            <div className={styles.heading}>
              <div className={styles.titleRow}>
                <span className={styles.title}>{title}</span>
                <Tooltip label="Close">
                  <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                    <Icon name="close" size={24} family="outlined" />
                  </button>
                </Tooltip>
              </div>
              <div className={styles.location}>
                <span>Current location: </span>
                <span className={styles.chip}>
                  <Icon name="folder" size={24} className={styles.chipIcon} />
                  <span className={styles.chipName}>{currentFolder ? currentFolder.name : 'All Files'}</span>
                </span>
              </div>
            </div>

            <div className={styles.body}>
              {here ? (
                <div className={styles.folderHead}>
                  <Tooltip label="Back">
                    <button type="button" className={styles.back} aria-label="Back" onClick={() => { setFolderId(here.parentId ?? null); cancelCreate() }}>
                      <Icon name="arrow_back" size={24} weight={300} />
                    </button>
                  </Tooltip>
                  <span className={styles.folderText}>
                    <span className={styles.crumb}>{crumb}</span>
                    <span className={styles.folderTitle}>{here.name}</span>
                  </span>
                </div>
              ) : null}

              <div className={styles.list} role="list" aria-label={here ? here.name : 'All Files'}>
                {folders.map((f) => (
                  <div key={f.id} className={styles.folderRow} role="listitem" tabIndex={0}
                       onClick={() => drill(f)}
                       onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drill(f) } }}>
                    <Icon name="folder" size={24} className={styles.rowIcon} />
                    <span className={styles.rowName}>{f.name}</span>
                    {f.id !== currentParent ? (
                      /* 931:39249 hover: "Move" Buttons Primary Height=24 Filled (DS `size="sm"` = 24) — pressing it moves here. */
                      <span className={styles.rowMove} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <Button size="sm" onPress={() => onMove(f.id)}>Move</Button>
                      </span>
                    ) : null}
                    <Icon name="keyboard_arrow_right" size={24} weight={300} className={styles.rowIcon} />
                  </div>
                ))}
                {plain.map((f) => (
                  <div key={f.id} className={styles.fileRow} role="listitem">
                    {f.thumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={f.thumb} alt="" className={styles.thumb} width={24} height={18} />
                    ) : (
                      <span className={styles.thumb} />
                    )}
                    <span className={styles.rowName}>{f.name}</span>
                  </div>
                ))}
              </div>

              {creating ? (
                /* 931:39335 (frame 106): "Create Folder" 20/Bold + Text Field 48 "Name" under the list. */
                <div className={styles.create}>
                  <span className={styles.createTitle}>Create Folder</span>
                  <TextField label="Name" value={newName} onChange={setNewName} autoFocus
                             onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void create() } }} />
                </div>
              ) : null}
            </div>

            <div className={styles.footer}>
              {creating ? null : (
                <Button variant="primary" appearance="outlined" iconStart={<Icon name="create_new_folder" size={20} />}
                        onPress={() => setCreating(true)}>
                  New Folder
                </Button>
              )}
              <span className={styles.footerRight}>
                {creating ? (
                  <>
                    <Button variant="secondary" appearance="outlined" onPress={cancelCreate}>Cancel</Button>
                    <Button onPress={() => { void create() }} isDisabled={!trimmed || busy}>Create</Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                    <Button onPress={() => onMove(folderId)} isDisabled={!canMove}>Move</Button>
                  </>
                )}
              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
