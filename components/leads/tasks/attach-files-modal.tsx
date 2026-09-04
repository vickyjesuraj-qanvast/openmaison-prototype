'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Checkbox, SearchBar } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useOverflow } from '@/components/om/use-overflow'
import { IconButton } from '@/components/om/icon-button'
import { SegmentedIconToggle } from '@/components/om/segmented'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { modalPanel, overlayFade, snackbarRise } from '@/lib/motion'
import { displayDate, startOfDay } from '@/lib/format'
import { filterByQuery } from '@/lib/search'
import type { LeadFile } from '@/lib/db/schema'
import styles from './attach-files-modal.module.css'

/* Group headers read "Friday, 17 Jul ’26" — lib/format only has the short weekday (displayDateLong: "Fri, …"), so the long
   weekday is spelled out here. */
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dayLabel = (d: Date) => `${DAYS_LONG[d.getDay()]}, ${displayDate(d)}`

/** How long the simulated upload takes before the toast row shows the green check. */
const UPLOAD_MS = 1400

type Toast = { name: string; pdf: boolean; state: 'uploading' | 'done' | 'failed' }

/**
 * Attach files modal (902:28220 frame 57 · 56 one file + uploading toast 902:28261 · 58 · 64 empty): 1200×928 xl modal
 * (the import wizard's shell), dropzone on top, then "Your files" — folders, then one group per calendar day of tiles.
 * Spec: design-source/context/lead-tasks/04-comments-attach.txt.
 *
 * Selection: tiles toggle ids; a group's header checkbox selects / clears the group. Files already attached to the task
 * open pre-checked; the footer count and `onAttach` carry only the NEW picks (attached − already attached) so the parent's
 * "{n} files attached" stays honest. Any picked / dropped file (REG-149) → the upload toast ("Uploading…" 1.4 s → done)
 * and the file is listed under today's group with the mock's thumbnail (local id — the parent owns the real upload).
 * The toast's "Failed" + refresh row exists behind data-state="failed" for completeness; nothing in the demo triggers it.
 */
export function AttachFilesModal({
  open, files, attached, onClose, onAttach, onUploadPicked,
}: {
  open: boolean
  files: LeadFile[]
  attached: string[]
  onClose: () => void
  onAttach: (fileIds: string[]) => void
  onUploadPicked: (file?: File) => void
}) {
  useScrollLock(open)
  const comingSoon = useComingSoon()
  const [selected, setSelected] = useState<Set<string>>(() => new Set(attached))
  const [query, setQuery] = useState('')
  const [uploaded, setUploaded] = useState<LeadFile[]>([])
  const [toast, setToast] = useState<Toast | null>(null)
  const [toastCollapsed, setToastCollapsed] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /* (REG-287) `aria-modal` promised assistive tech the page behind is inert, but the panel only locked scrolling:
     Tab from the last control walked straight back out. The app's surface policy does all three (components/om/surface.ts,
     as in components/om/dialog.tsx): Esc closes the TOPMOST surface only (the date picker / a portal menu above wins
     first), focus moves onto the panel on open — unless a field inside already autofocused — Tab cycles inside it, and
     focus returns to the opener on close. */
  const panel = useRef<HTMLDivElement>(null)
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)

  // Fresh state per opening (render-phase adjust): selection = what the task already has.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setSelected(new Set(attached)); setQuery(''); setUploaded([]); setToast(null); setToastCollapsed(false) }
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const all = [...uploaded, ...files]
  /* Search matches everything a tile shows (REG-274): the file name, the kind caption under it ("pdf" / "image"),
     and the day heading the tile sits under, formatted by this modal's own `dayLabel` ("Friday, 17 Jul ’26") so a
     search for a day keeps that whole group. Folders carry neither a kind caption nor a day heading — they render
     under "Folders" — so they match on their name alone. Name-only was the previous rule. */
  const shown = filterByQuery(all, query, (f) => ({
    fields: f.kind === 'folder' ? [f.name] : [f.name, f.kind, dayLabel(f.createdAt)],
  }))
  const folders = shown.filter((f) => f.kind === 'folder')
  const items = shown.filter((f) => f.kind !== 'folder')
  // One group per calendar day, newest day first (the spec shows a single day; the order is the library's — recent on top).
  const groups = [...items]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .reduce<{ day: number; label: string; files: LeadFile[] }[]>((acc, f) => {
      const day = startOfDay(f.createdAt)
      const g = acc.find((x) => x.day === day)
      if (g) g.files.push(f); else acc.push({ day, label: dayLabel(f.createdAt), files: [f] })
      return acc
    }, [])

  const attachedSet = new Set(attached)
  const picks = [...selected].filter((id) => !attachedSet.has(id))
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleGroup = (ids: string[], on: boolean) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n })

  const pick = (file?: File) => {
    onUploadPicked(file)
    const name = file?.name ?? 'filename.jpg'   // the mock's row name when nothing real was picked (drop of a non-file)
    const pdf = /\.pdf$/i.test(name)            // one reading of the kind for both the toast row and the file it lands
    if (timer.current) clearTimeout(timer.current)
    setToast({ name, pdf, state: 'uploading' })
    setToastCollapsed(false)
    timer.current = setTimeout(() => {
      setToast((t) => (t ? { ...t, state: 'done' } : t))
      // The uploaded file joins the library under today — the mock's thumbnail stands in for the real bytes (REG-149).
      // The kind follows the picked name, though: the dropzone advertises PDFs, and a PDF captioned with a photo of a
      // floor plan reads as a bug. A null thumb takes the row's existing surface-variant + glyph branch. Same
      // derivation as components/leads/return/return-lead-wizard.tsx, so the two surfaces agree about one pick.
      const at = new Date()
      setUploaded((u) => [{ id: `local-${at.getTime()}`, leadId: files[0]?.leadId ?? '', kind: pdf ? 'pdf' : 'image', name, thumb: pdf ? null : '/figma-assets/file-thumb-1.png', createdAt: at, parentId: null, ownerId: null, sizeBytes: 728064, mime: pdf ? 'application/pdf' : 'image/jpeg', updatedAt: at, deletedAt: null }, ...u])
    }, UPLOAD_MS)
  }

  const count = picks.length
  const attachLabel = count === 0 ? 'Attach Files' : count === 1 ? 'Attach 1 File' : `Attach ${count} Files`
  // The head counts the toast's rows, not the in-flight flag: the toast stays up after the row's green check (only ✕
  // removes it), and a count keyed off 'uploading' turned that frame into "Uploading 0 files". One row per toast —
  // the Dropzone takes one file — so this reads "Uploading 1 file" throughout, as 902:28261 and the sibling toasts do.
  const uploadingCount = toast ? 1 : 0

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          {/* (REG-287) tabIndex={-1} so the panel can hold focus; `outline: none` matches every other panel that takes
              focus on open (components/om/dialog.module.css, move-stage/wizard.module.css) — inline because this
              surface's stylesheet is outside this pass. The ring belongs to the panel's own controls. */}
          <motion.div ref={panel} className={styles.panel} style={{ outline: 'none' }} variants={modalPanel}
                      role="dialog" aria-modal aria-label="Attach files" tabIndex={-1}>
            {/* Heading 64 (p20/24): title 20/Bold · bare 24px close · 1px rule — the modal header standard (779:26016). */}
            <div className={styles.heading}>
              <span className={styles.title}>Attach files</span>
              <Tooltip label="Close">
                <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                  <Icon name="close" size={24} family="outlined" />
                </button>
              </Tooltip>
            </div>

            <div ref={scrollRef} className={styles.body}>
              {/* Upload block (V g12): title 16/Semi Bold + dropzone 140 (p40, 2px dashed #cccccc on surface-bg). */}
              <div className={styles.uploadBlock}>
                <span className={styles.blockTitle}>Upload from your local files</span>
                <div className={styles.dropWrap}>
                  <Dropzone
                    title={<>Drop your file or <b>browse</b></>}
                    helper="Supports: JPEG, PNG, PDF"
                    accept="image/*,.pdf"
                    onPick={pick}
                  />
                </div>
              </div>

              <div className={styles.rule} />

              {/* "Your files" block (V g16): bar (title · search 240 · File Type chip · sort · grid/list) then the groups (V g40). */}
              <div className={styles.filesBlock}>
                <div className={styles.bar}>
                  <span className={styles.blockTitle}>Your files</span>
                  <SearchBar
                    className={styles.search}
                    appearance="outlined"
                    placeholder="Search"
                    aria-label="Search files"
                    value={query}
                    onChange={setQuery}
                  />
                  {/* File Type filter chip 93×36 — the listing toolbar's chip (components/leads/toolbar.module.css); inert. */}
                  <button type="button" className={styles.chip} onClick={comingSoon}>
                    <span>File Type</span>
                    <span className={styles.chipChevron}><Icon name="keyboard_arrow_down" size={20} /></span>
                  </button>
                  <Tooltip label="Sort">
                    <IconButton icon="swap_vert" label="Sort" onClick={comingSoon} />
                  </Tooltip>
                  <SegmentedIconToggle
                    label="View"
                    value="grid"
                    options={[{ value: 'grid', icon: 'grid_view', label: 'Grid view' }, { value: 'list', icon: 'view_list', label: 'List view' }]}
                    onChange={(v) => { if (v !== 'grid') comingSoon() }}
                  />
                </div>

                {all.length === 0 ? (
                  /* Empty state (frame 64): illustration 140×120, "No files yet" 20/600, "Uploaded files will appear here." 14/400. */
                  <div className={styles.empty}>
                    <div className={styles.emptyInner}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/figma-assets/empty-files.svg" width={140} height={120} alt="" className={styles.emptyArt} />
                      <div className={styles.emptyText}>
                        <p className={styles.emptyTitle}>No files yet</p>
                        <p className={styles.emptyBody}>Uploaded files will appear here.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.groups}>
                    {folders.length > 0 ? (
                      /* Folders (frames 56/58): header row + 276-wide folder cards; folders are inert in this flow. */
                      <div className={styles.group}>
                        <div className={styles.groupHead}>
                          <Checkbox isSelected={false} onChange={comingSoon} aria-label="Select all folders" />
                          <span className={styles.groupTitle}>Folders</span>
                        </div>
                        <div className={styles.row}>
                          {folders.map((f) => (
                            <div key={f.id} className={styles.folder}>
                              <Icon name="folder" size={24} className={styles.folderIcon} />
                              <span className={styles.folderName}>{f.name}</span>
                              <Tooltip label="Folder actions">
                                <button type="button" className={styles.folderKebab} aria-label={`${f.name} actions`} onClick={comingSoon}>
                                  <Icon name="more_vert" size={24} weight={300} />
                                </button>
                              </Tooltip>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {groups.map((g) => {
                      const ids = g.files.map((f) => f.id)
                      const on = ids.filter((id) => selected.has(id)).length
                      return (
                        <div key={g.day} className={styles.group}>
                          <div className={styles.groupHead}>
                            <Checkbox
                              isSelected={on === ids.length}
                              isIndeterminate={on > 0 && on < ids.length}
                              onChange={(next) => toggleGroup(ids, next)}
                              aria-label={`Select all files from ${g.label}`}
                            />
                            <span className={styles.groupTitle}>{g.label}</span>
                          </div>
                          <div className={styles.row}>
                            {g.files.map((f) => {
                              const isOn = selected.has(f.id)
                              return (
                                <div key={f.id} className={styles.tile} data-selected={isOn || undefined} onClick={() => toggle(f.id)}>
                                  {f.thumb ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={f.thumb} alt="" className={styles.tileImg} />
                                  ) : (
                                    /* No thumbnail (a PDF): the overview file tile's surface-variant box with the kind's glyph. */
                                    <span className={styles.tileBox}><Icon name={f.kind === 'pdf' ? 'picture_as_pdf' : 'image'} size={24} className={styles.tileBoxIcon} /></span>
                                  )}
                                  <div className={styles.caption} onClick={(e) => e.stopPropagation()}>
                                    <Checkbox isSelected={isOn} onChange={() => toggle(f.id)} aria-label={`Select ${f.name}`} />
                                    <span className={styles.tileName} onClick={() => toggle(f.id)}>{f.name}</span>
                                    <span className={styles.kind}>
                                      <Icon name={f.kind === 'pdf' ? 'picture_as_pdf' : 'image'} size={12} className={styles.kindIcon} />
                                      {f.kind}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer 68 (p16/24, top rule): Cancel (secondary outlined) · Attach n File(s) (primary; "Attach Files" disabled at 0). */}
            <div className={styles.footer} data-shadow={bodyScrolls || undefined}>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button isDisabled={count === 0} onPress={() => onAttach(picks)}>{attachLabel}</Button>
            </div>

            {/* Uploading toast (902:28261): 360×200 bottom-right of the modal (right 16, bottom 76), dark 56px head, 64px rows. */}
            <AnimatePresence>
              {toast ? (
                <motion.div className={styles.toast} data-collapsed={toastCollapsed || undefined} role="status" aria-live="polite"
                            variants={snackbarRise} initial="initial" animate="animate" exit="exit">
                  <div className={styles.toastHead}>
                    <span className={styles.toastTitle}>{uploadingCount === 1 ? 'Uploading 1 file' : `Uploading ${uploadingCount} files`}</span>
                    <Tooltip label={toastCollapsed ? 'Expand' : 'Collapse'} side="top">
                      <button type="button" className={styles.toastBtn} aria-label={toastCollapsed ? 'Expand' : 'Collapse'} aria-expanded={!toastCollapsed}
                              onClick={() => setToastCollapsed((c) => !c)}>
                        <Icon name={toastCollapsed ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={24} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Dismiss" side="top">
                      <button type="button" className={styles.toastBtn} aria-label="Dismiss upload status" onClick={() => setToast(null)}>
                        <Icon name="close" size={24} />
                      </button>
                    </Tooltip>
                  </div>
                  {toastCollapsed ? null : (
                    <div className={styles.toastRow} data-state={toast.state}>
                      {toast.pdf ? (
                        /* A PDF takes the tiles' surface-variant box + glyph at the thumb's 40×40: the mock's photograph
                           beside "Quotation.pdf" drew the same pick two ways at once (the tile below already got it right). */
                        <span className={styles.toastThumb} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--om-color-surface-variant)' }}>
                          <Icon name="picture_as_pdf" size={24} className={styles.tileBoxIcon} />
                        </span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src="/figma-assets/file-thumb-1.png" alt="" className={styles.toastThumb} width={40} height={40} />
                      )}
                      <span className={styles.toastFile}>{toast.name}</span>
                      {toast.state === 'uploading' ? (
                        <>
                          <span className={styles.toastStatus}>Uploading...</span>
                          <span className={`${styles.toastIcon} ${styles.spin}`}><Icon name="progress_activity" size={20} /></span>
                        </>
                      ) : toast.state === 'failed' ? (
                        <>
                          <span className={styles.toastFailed}>Failed</span>
                          <Tooltip label="Retry upload" side="top">
                            <button type="button" className={styles.toastRetry} aria-label="Retry upload" onClick={comingSoon}>
                              <Icon name="refresh" size={20} />
                            </button>
                          </Tooltip>
                        </>
                      ) : (
                        <span className={styles.toastIcon}><Icon name="check_circle" size={20} fill /></span>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
