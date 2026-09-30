import type { CSSProperties } from 'react'
import { Bone } from '@/components/shell/skeleton'
import folderStyles from '@/components/om/folders/folder-card.module.css'
import gallery from './quote-templates-gallery.module.css'
import table from './templates-table.module.css'
import styles from './library-gallery.module.css'
import emptyStyles from '@/components/om/empty-state.module.css'

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
export function LibraryGalleryGhost({ pill = false, filters = false, newFolder = true, folders = 0, cards = 8, footLines = 1, newW, list, first = false }: {
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
  /** (UX audit S12) The New button's desk width when it is not New ▾ (Materials' "New material"). */
  newW?: number
  /** (UX audit S8) The list view (the listing's table model) from 768 up — its tracks, the name column's selection box, how many rows —
      while a phone keeps the cards, as the page does. */
  list?: ListGhost
  /** (UX audit build, REG-735's first run) The library holds nothing: the bar keeps the name and ⋮, the body is the start card
      (EmptyState's own classes) — what the page opens on (lib/ghost-shape.tsx says which). */
  first?: boolean
}) {
  if (first) return (
    <>
      <div className={`${gallery.toolbar} ${styles.bar}`} aria-hidden>
        <div className={styles.where}><h2 className={styles.here}><Bone w={104} h={20} className={styles.gLine} /></h2></div>
        <div className={`${gallery.toolbarEnd} ${styles.end}`}><div className={styles.tools}><Box cls={styles.gIcon!} /></div></div>
      </div>
      <FirstRunCardGhost />
    </>
  )
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
            <span className={`${styles.gBox} ${styles.gNew}`} style={newW ? ({ '--g-new': `${newW}px` } as CSSProperties) : undefined}><Bone w="100%" style={{ height: '100%' }} /></span>
            <Box cls={styles.gSearch!} />
            {filters ? <Box cls={styles.gIcon!} /> : null}
            {list ? <span className={`${styles.columnsTool} ${styles.gDeskOnly}`}><Box cls={styles.gIcon!} /></span> : null}
            <Box cls={styles.gView!} />
            <Box cls={styles.gIcon!} />
          </div>
        </div>
      </div>
      {list ? <span className={styles.gListOnly}><LibraryTableGhost {...list} folders={folders} /></span> : null}
      <div className={`${styles.gridStack}${list ? ` ${styles.gGridOnly}` : ''}`} aria-hidden>
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

/** (UX audit S8) A library's list view as a ghost: the list's own stylesheet (templates-table on the table core) — head 56, rows 60, the folder
    rows first, the name cell's selection box, glyph and name, a line per column. `tracks` are the list's default columns in order (the name's
    fluid track first); the frame is drawn as scrolled sideways, as the real one is once its columns pass the page's width. */
export type ListGhost = { tracks: string[]; rows: number; select?: boolean; cells?: (number | string)[] }
function LibraryTableGhost({ tracks, rows, select = false, cells = [], folders = 0 }: ListGhost & { folders?: number }) {
  const cols = tracks.length
  const line = (c: number, r: number) => <Bone w={cells[c] ?? cycle([56, 72, 48, 64], r + c)} h={12} />
  const name = (r: number, folder: boolean) => (
    <div className={`${table.cell} ${table.colName}`}>
      {select ? <Bone w={18} h={18} className={styles.gCheck} /> : null}
      <Bone w={36} h={36} r={4} style={{ flexShrink: 0 }} />   {/* (REG-820) the house square */}
      <Bone w={folder ? cycle([72, 88], r) : cycle(['46%', '58%', '40%', '52%', '62%', '44%'], r)} h={14} />
    </div>
  )
  return (
    <div className={table.card} data-overflow="" aria-hidden style={{ '--tracks': [...tracks, '48px'].join(' ') } as CSSProperties}>
      <div className={table.head}>
        {tracks.map((_, c) => <div key={c} className={`${table.hCell}${c === 0 ? ` ${table.colName}` : ''}`}>{c === 0 && select ? <Bone w={18} h={18} className={styles.gCheck} /> : null}<Bone w={c === 0 ? 40 : cycle([36, 44, 52, 40, 64], c)} h={10} /></div>)}
      </div>
      {Array.from({ length: folders + rows }, (_, r) => (
        <div key={r} className={table.row}>
          {name(r, r < folders)}
          {Array.from({ length: cols - 1 }, (_, c) => <div key={c} className={table.cell}>{r < folders ? (c === cols - 3 ? line(c, r) : null) : line(c, r)}</div>)}
        </div>
      ))}
    </div>
  )
}
const cycle = <T,>(list: readonly T[], i: number): T => list[i % list.length]!

/** (UX audit build) The house first-run card's ghost (components/om/empty-state): the tinted well, the title, two lines of help, two buttons. */
export function FirstRunCardGhost() {
  return (
    <div className={emptyStyles.empty} data-tone="first" aria-hidden>
      <Bone w={72} h={72} r={8} style={{ marginBottom: 8 }} />
      <Bone w={170} h={18} />
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}><Bone w={300} h={12} /><Bone w={230} h={12} /></span>
      <span className={emptyStyles.actions}><Bone w={176} h={36} r={4} /><Bone w={132} h={36} r={4} /></span>
    </div>
  )
}
