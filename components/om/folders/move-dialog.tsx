'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useOverflow } from '@/components/om/use-overflow'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { modalPanel, overlayFade } from '@/lib/motion'
import { folderNameProblem, foldersIn, foldersUnder, trailTo, type FolderNode } from '@/lib/folders'
import styles from './move-dialog.module.css'

/** Something listed for orientation under the folders (the Files tab's files, a library's templates) — never a destination. */
export type MoveEntry = { id: string; name: string; parentId: string | null; thumb?: string | null
  /** (audit 2026-09-26, F127) A colour-only entry (a material with no photo): its swatch fills the thumb. */
  swatch?: string | null }

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
 *
 * (REG-664) One dialog for the Files tab and every library that files its entries: it knows folders and what to list under them, not
 * lead files. The top is named by the caller ("All Files" · "Quotes" · "My Items"); a new folder's name is checked as it is everywhere
 * (required · 60 characters · not a sibling's name), the message under the field after the first Create; a viewer who may not make
 * folders gets no New Folder.
 */
export function MoveDialog({
  open, title, root, folders, entries = [], moving, current, onMove, onCreateFolder, onClose, note,
}: {
  open: boolean
  /** Move “<name>” · Move n items */
  title: string
  /** The top's name. */
  root: string
  /** Every live folder of the place (the browse tree). */
  folders: FolderNode[]
  /** Listed under the folders for orientation. */
  entries?: MoveEntry[]
  /** The ids being moved — folders among them, and everything inside those, never appear as a destination. */
  moving: string[]
  /** Where the items sit now (null = the top). */
  current: string | null
  onMove: (parentId: string | null) => void
  /** Creates the folder inside `parentId` and resolves with its id; omitted = no New Folder. */
  onCreateFolder?: (name: string, parentId: string | null) => Promise<string>
  onClose: () => void
  /** (audit 2026-09-26, critic 14) What of the picked stays where it is, and why — said before the move, under the location row. */
  note?: string | null
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const snackbar = useSnackbar()
  const [folderId, setFolderId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [tried, setTried] = useState(false)
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
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)

  // Render-phase adjust: every opening browses from the root with no Create Folder form.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setFolderId(null); setCreating(false); setNewName(''); setTried(false); setBusy(false) }
  }

  // The moved items and everything inside a moved folder stay out of the browse list.
  const hidden = useMemo(() => {
    const set = new Set<string>(moving)
    for (const id of moving) if (folders.some((f) => f.id === id)) foldersUnder(folders, id).forEach((d) => set.add(d))
    return set
  }, [moving, folders])

  const shownFolders = foldersIn(folders, folderId).filter((f) => !hidden.has(f.id))
  const plain = entries.filter((e) => (e.parentId ?? null) === folderId && !hidden.has(e.id))
  const here = folderId ? folders.find((f) => f.id === folderId) ?? null : null
  const path = trailTo(folders, folderId)
  const crumb = `${[root, ...path.slice(0, -1).map((f) => f.name)].join(' / ')} / `
  const currentFolder = current ? folders.find((f) => f.id === current) ?? null : null
  const currentParent = currentFolder?.id ?? null
  const canMove = folderId !== currentParent

  const trimmed = newName.trim()
  const problem = folderNameProblem(newName, foldersIn(folders, folderId))

  const create = async () => {
    setTried(true)
    if (problem || busy || !onCreateFolder) return
    setBusy(true)
    try {
      const id = await onCreateFolder(trimmed, folderId)
      setFolderId(id)   // frame 106 → the new folder opens as the destination
      setCreating(false)
      setNewName(''); setTried(false)
    } catch (e) {
      /* the tab's `fail` wording; the form stays open. (wave E, E7) a refusal's rule (thrown by the host) says why instead of "please try again" */
      snackbar({ message: couldnt('create the folder', refusalOf(e)) })
    } finally { setBusy(false) }
  }
  const cancelCreate = () => { setCreating(false); setNewName(''); setTried(false) }
  const drill = (f: FolderNode) => { setFolderId(f.id); cancelCreate() }

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
                  <span className={styles.chipName}>{currentFolder ? currentFolder.name : root}</span>
                </span>
              </div>
              {note ? <p className={styles.note} role="note"><Icon name="info" size={16} weight={300} />{note}</p> : null}
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

              <div ref={scrollRef} className={styles.list} role="list" aria-label={here ? here.name : root}>
                {shownFolders.map((f) => (
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
                      <span className={styles.thumb} style={f.swatch ? { background: f.swatch, boxShadow: 'inset 0 0 0 1px var(--om-color-overlay-20p)' } : undefined} />
                    )}
                    <span className={styles.rowName}>{f.name}</span>
                  </div>
                ))}
              </div>

              {creating ? (
                /* 931:39335 (frame 106): "Create Folder" 20/Bold + Text Field 48 "Name" under the list. */
                <div className={styles.create}>
                  <span className={styles.createTitle}>Create Folder</span>
                  <TextField label="Name" required value={newName} onChange={setNewName} autoFocus maxLength={80}
                             error={tried && problem ? problem : undefined}
                             onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void create() } }} />
                </div>
              ) : null}
            </div>

            <div className={styles.footer} data-shadow={bodyScrolls || undefined}>
              {creating || !onCreateFolder ? null : (
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
