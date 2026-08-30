'use client'

import type { LeadFile } from '@/lib/db/schema'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useComingSoon } from '@/components/om/snackbar'
import { Card, CardEmpty } from './card'
import styles from './files-card.module.css'

/** How many tiles the row shows before the "+n" overflow tile (858:24943: folder + two files + "+10"). */
const MAX_TILES = 3

/**
 * FILES card (858:24943 "FILES · 13" · 858:24125 "FILES · 2" · 858:24296 empty).
 * Folders first, then files, at most three 92×92 tiles; the rest collapse into a "+n" tile that opens the Files tab.
 * Spec: design-source/context/lead-overview/04-cards-stages-files-activity.txt (+ 05 for the empty state).
 */
export function FilesCard({ files, onOpenTab, onCreateFolder, onUpload }: {
  files: LeadFile[]
  onOpenTab: () => void
  onCreateFolder: () => void
  onUpload: () => void
}) {
  const comingSoon = useComingSoon()
  const ordered = [...files.filter((f) => f.kind === 'folder'), ...files.filter((f) => f.kind !== 'folder')]
  const shown = ordered.slice(0, MAX_TILES)
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
          <div className={styles.tiles}>
            {shown.map((file) => (
              /* Tiles are inert in the mock (no tab designed yet) — every inert affordance answers "Coming soon". */
              <button key={file.id} type="button" className={styles.tile} onClick={comingSoon} aria-label={file.name}>
                {file.kind === 'folder' || !file.thumb ? (
                  <span className={styles.thumbBox}>
                    {file.kind === 'folder' ? <Icon name="folder" size={24} className={styles.folderIcon} /> : null}
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.thumb} alt="" className={styles.thumb} width={84} height={64} />
                )}
                <span className={styles.caption}>
                  {file.kind !== 'folder' ? <Icon name="image" size={12} className={styles.fileIcon} /> : null}
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
