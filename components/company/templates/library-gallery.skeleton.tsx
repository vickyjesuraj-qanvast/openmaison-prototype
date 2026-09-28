import type { CSSProperties } from 'react'
import { Bone } from '@/components/shell/skeleton'
import folderStyles from '@/components/om/folders/folder-card.module.css'
import gallery from './quote-templates-gallery.module.css'
import styles from './library-gallery.module.css'

/** A bone whose box the stylesheet sizes per width (the pill is 114 × 36 at a desk, 72 × 44 on a touch tablet or a phone). */
const Box = ({ cls }: { cls: string }) => <span className={`${styles.gBox} ${cls}`}><Bone w="100%" style={{ height: '100%' }} /></span>

/**
 * (REG-708) The Folders group's ghost on the house folder card's own classes (components/om/folders/folder-card): the group's head (the
 * select-all box and "Folders" — `check`), then the folder cards on the host's track (`min`: the galleries' 248, the Files tab's 299).
 */
export function GhostFolderGroup({ count, min, check = false }: { count: number; /** the host's track; none = the card's own (299, 220 narrow) */ min?: number; check?: boolean }) {
  return (
    <div className={folderStyles.group}>
      <div className={folderStyles.groupHead}>{check ? <><Bone w={18} h={18} style={{ margin: 3 }} /><Bone w={50} h={14} /></> : <Bone w={64} h={16} className={styles.gLine} />}</div>
      <div className={folderStyles.row} style={min ? ({ '--folder-min': `${min}px`, '--folder-min-narrow': `${min}px` } as CSSProperties) : undefined}>
        {Array.from({ length: Math.min(count, 12) }, (_, i) => (
          <div key={i} className={`${folderStyles.folder} ${styles.gFolder}`}><span className={styles.gPick}><Bone w={24} h={24} /></span><Bone w={24} h={24} /><span className={styles.gFolderText}><Bone w="60%" h={14} /><Bone w="36%" h={10} /></span></div>
        ))}
      </div>
    </div>
  )
}

/**
 * (verify round 1, F166 · the Materials ghost) The house library gallery's ghost body — its toolbar, its Folders row and its cards — drawn on
 * the gallery's OWN classes (the toolbar, the folder group and row, the card grid, the 220 / 160 thumb band, the card body), so at every width
 * the bones stand where the page lands: two cards a row at 390, one at 320, the kebab-free body a phone gets. The host draws its header (and
 * an intro) around it; `loading.tsx` and the page's PageReveal draw the same thing.
 */
export function LibraryGalleryGhost({ pill = false, filters = false, newFolder = true, folders = 0, cards = 8, footLines = 1 }: {
  /** A scope pill leads the tools (the AI Visualizer's Kind). */
  pill?: boolean
  /** The Filters button (a library with facets). */
  filters?: boolean
  newFolder?: boolean
  /** How many folder cards the open level shows (0 = no Folders row). */
  folders?: number
  cards?: number
  /** (audit 2026-09-26) Lines in the card's foot — Materials says where it is quoted and who edited it on two. */
  footLines?: 1 | 2
}) {
  return (
    <>
      <div className={`${gallery.toolbar} ${styles.bar}`} aria-hidden>
        <div className={styles.where}><h2 className={styles.here}><Bone w={104} h={20} className={styles.gLine} /></h2></div>
        {/* (wave E, gallery-9) the bar's two groups, as the page draws them — on a phone the pill at the left, the tools at the right, New
            Folder inside New ▾ */}
        <div className={`${gallery.toolbarEnd} ${styles.end}`}>
          {pill ? <div className={styles.scopes}><Box cls={styles.gPill!} /></div> : null}
          <div className={styles.tools}>
            {newFolder ? <span className={styles.folderSlot}><Box cls={styles.gIcon!} /></span> : null}
            <Box cls={styles.gNew!} />
            <Box cls={styles.gSearch!} />
            {filters ? <Box cls={styles.gIcon!} /> : null}
            <Box cls={styles.gView!} />
            <Box cls={styles.gIcon!} />
          </div>
        </div>
      </div>
      <div className={styles.gridStack} aria-hidden>
        {folders > 0 ? <GhostFolderGroup count={folders} min={248} /> : null}
        {cards > 0 ? (
          <div className={`${gallery.grid} ${styles.cards}`}>
            {Array.from({ length: cards }, (_, i) => (
              <div key={i} className={gallery.card}>
                <span className={`${gallery.thumb} ${styles.gThumb}`} />
                <span className={`${gallery.body} ${styles.cardBody}`}>
                  <span className={gallery.nameRow}><Bone w={['72%', '56%', '64%', '48%'][i % 4]!} h={14} /></span>
                  <span className={gallery.meta}><Bone w={['52%', '64%', '44%', '58%'][i % 4]!} h={12} className={styles.gLine} /></span>
                </span>
                <span className={gallery.usage}><Bone w={['66%', '50%', '60%', '46%'][i % 4]!} h={12} className={styles.gLine} />{footLines === 2 ? <Bone w={['48%', '58%', '42%', '54%'][i % 4]!} h={12} className={`${styles.gLine} ${styles.gFoot2}`} /> : null}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}
