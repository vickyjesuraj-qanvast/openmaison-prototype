'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { LeadFile } from '@/lib/db/schema'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Card, CardEmpty } from './card'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import styles from './files-card.module.css'

/*
 * How many tiles fit in one row, and how wide each one is.
 * The mock (858:24943, a 430px card) draws four slots — folder + two files + "+10" — at 92px, and 858:25922
 * (396px, quick links expanded) draws the same four shrunk to 83. So the mock's own tile is a 92px box that
 * shares the row and shrinks as the row tightens; 92 and 83 are two samples of one behaviour, not two sizes.
 * The card is responsive: with the info column collapsed it is far wider than either mock. So the row picks
 * the slot count whose resulting shared width lands closest to the mock's 92, and the tiles then divide the
 * row exactly — no trailing dead space (user 2026-08-30). At 390px of row (the 430 mock) that is 4 × 91.5;
 * at 356px (the 396 mock) it is 4 × 83. Both mocks fall out of the same arithmetic.
 */
const TILE = 92        // the mock's tile
const GAP = 8          // --om-spacing-2, the mock's gap
const DEFAULT_SLOTS = 4   // the mock's row: the first paint, and wherever the width cannot be measured
const MOBILE_SLOTS = 4    // (REG-269) ≤767 the same four cells, laid 2-up by the stylesheet

/** The slot count whose evenly-shared tile width sits closest to the mock's 92. */
function slotsFor(width: number) {
  if (width <= 0) return DEFAULT_SLOTS
  const shared = (n: number) => (width - (n - 1) * GAP) / n
  const lo = Math.max(1, Math.floor((width + GAP) / (TILE + GAP)))
  return Math.abs(shared(lo) - TILE) <= Math.abs(shared(lo + 1) - TILE) ? lo : lo + 1
}

/**
 * FILES card (858:24943 "FILES · 13" · 858:24125 "FILES · 2" · 858:24296 empty).
 * Folders first, then files, as many tiles as the measured row fits; the rest collapse into a "+n" tile that opens the Files tab.
 * Spec: design-source/context/lead-overview/04-cards-stages-files-activity.txt (+ 05 for the empty state).
 */
export function FilesCard({ files, onOpenTab, onOpenFile, onCreateFolder, onUpload }: {
  files: LeadFile[]
  onOpenTab: () => void
  onOpenFile: (file: LeadFile) => void
  onCreateFolder: () => void
  onUpload: () => void
}) {
  const row = useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = useState(DEFAULT_SLOTS)
  useEffect(() => {
    const el = row.current
    if (!el || typeof ResizeObserver === 'undefined') return
    // Measured in the observer callback, never in render — the row re-slots as the card grows or the info column collapses.
    const ro = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width ?? 0
      if (w > 0) setMeasured(slotsFor(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* (REG-269) Mobile keeps the mock's OWN four cells and lets the stylesheet lay them 2-up (files-card.module.css),
     instead of shrinking the row until three stamps share it: same composition as 858:24943, wrapped. The count
     has to be decided here because it is what fixes how many tiles exist before the "+n" takes the last cell.
     `MOBILE_SLOTS` and `DEFAULT_SLOTS` are the same 4, so the server markup and the phone's first client render
     agree — nothing re-slots after hydration. */
  const narrow = useMediaQuery(MOBILE)
  const slots = narrow ? MOBILE_SLOTS : measured

  const ordered = [...files.filter((f) => f.kind === 'folder'), ...files.filter((f) => f.kind !== 'folder')]
  // Everything fits, or the last slot becomes the "+n" tile.
  const shown = ordered.length <= slots ? ordered : ordered.slice(0, Math.max(1, slots - 1))
  const rest = ordered.length - shown.length

  return (
    <Card
      title="Files"
      headGap={12}
      meta={files.length > 0 ? <span className={styles.count}><span>·</span><span>{files.length}</span></span> : undefined}
      onOpen={onOpenTab}
      openLabel="Open files"
      testId="files"
    >
      {files.length === 0 ? (
        <CardEmpty
          illustration="/figma-assets/empty-files.svg"
          width={140}
          height={120}
          title="Add your first files"
          body="Create folders and upload files from your local."
          gap={16}
          actions={
            <>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="create_new_folder" size={20} />} onPress={onCreateFolder}>
                Create Folder
              </Button>
              <Button iconStart={<Icon name="upload" size={20} />} onPress={onUpload}>
                Upload Files
              </Button>
            </>
          }
        />
      ) : (
        <div className={styles.body}>
          {/* --slots divides the row: exactly `slots` tiles fill it edge to edge, fewer keep the mock's size
              and leave the row short rather than stretching a lone file across the whole card. */}
          <div className={styles.tiles} ref={row} style={{ '--slots': slots } as CSSProperties}>
            {shown.map((file) => (
              /* A tile opens its own record — the folder in the Files tab, the file in its viewer (both arrived with REG-181).
                 The mock predates them, so the tiles answered "Coming soon" while the arrow and the "+n" tile beside them opened the same files. */
              <button key={file.id} type="button" className={styles.tile} onClick={() => onOpenFile(file)} aria-label={file.name}>
                {file.kind === 'folder' || !file.thumb ? (
                  <span className={styles.thumbBox}>
                    {file.kind === 'folder' ? <Icon name="folder" size={24} className={styles.folderIcon} /> : null}
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.thumb} alt="" className={styles.thumb} width={84} height={64} />
                )}
                <span className={styles.caption}>
                  {/* The glyph follows the record, as the Files tab's own kindIcon does — the mock had one image, so
                      "image" was written in; an uploaded PDF then wore a photo's glyph. */}
                  {file.kind !== 'folder' ? <Icon name={file.kind === 'pdf' || file.mime === 'application/pdf' ? 'picture_as_pdf' : 'image'} size={12} className={styles.fileIcon} /> : null}
                  <span className={styles.name}>{file.name}</span>
                </span>
              </button>
            ))}
            {rest > 0 ? (
              <button type="button" className={styles.more} onClick={onOpenTab} aria-label={`${rest} more files`}>
                <span className={styles.moreInner}>+{rest}</span>
              </button>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  )
}
