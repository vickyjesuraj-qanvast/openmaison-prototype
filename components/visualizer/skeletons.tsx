import { Bone, GhostSheet } from '@/components/shell/skeleton'
import styles from './skeletons.module.css'

/* The AI Visualizer's ghosts (REG-673). The gallery's own is `home/home-skeleton.tsx` (the landing draws it with what it knows). */

/**
 * The editor's ghost (F165): the app frame as it lands — the top bar (back · name · rooms · Add room · undo / redo · Share · ⋯), the
 * canvas (the version chip, the photo at 3:2 filling the room the chip and the zoom bar leave, the zoom bar), the versions strip (its
 * head and tiles with their names), the rail (five tabs, the panel's head and card, the foot: Describe, Generate, the two lines).
 * In the camera model (≤1024 portrait, phones): the rooms row, the smaller strip, the go bar and the dock; the bar keeps back · name ·
 * Share · ⋯. (verify round 1, fresh-tablet 16) The room chips are the house chips (r4, 32 — 44 on touch) and ≤1024 the strip's tiles are
 * its 96 × 60 whatever the layout; a phone on its side keeps the rail at 300 with the go line at its foot (the editor's SHORT_LANDSCAPE).
 * (wave E) The rail's foot folds as the page's does on short windows (tablet-10); a phone on its side is the landscape frame (E3): the 44
 * top bar, the photo filling the canvas with the bar over its foot, the slim versions row.
 */
export function VisualizerEditorSkeleton() {
  return (
    <div className={styles.frame}>
      <GhostSheet label="Loading the design">
        <div className={styles.editor} aria-hidden>
          <div className={styles.top}>
            <Bone w={24} h={24} r={4} />
            <span className={styles.topTitle}><Bone w={160} h={18} className={styles.shrink} /><Bone w={56} h={24} r={12} className={styles.wide} /></span>
            <span className={`${styles.topRooms} ${styles.wide}`}><Bone w={110} h={32} r={4} className={styles.chip} /><Bone w={96} h={32} r={4} className={styles.chip} /><Bone w={120} h={32} r={4} className={styles.chip} /><Bone w={24} h={24} r={4} /><Bone w={120} h={40} r={4} className={styles.full} /><Bone w={36} h={36} r={4} className={styles.snug} /></span>
            <span className={styles.topEnd}>
              <span className={styles.wide}><Bone w={24} h={24} r={4} /><Bone w={24} h={24} r={4} /></span>
              {/* (UX audit V4) Share is a filled "Share" where the bar is tight, as the page draws it */}
              <Bone w={169} h={40} r={4} className={styles.full} /><Bone w={96} h={40} r={4} className={styles.snugOrNarrow} /><Bone w={24} h={24} r={4} />
            </span>
          </div>
          <div className={styles.roomsRow}><Bone w={96} h={32} r={4} className={styles.chip} /><Bone w={120} h={32} r={4} className={styles.chip} /><Bone w={80} h={32} r={4} className={styles.chip} /><span className={styles.roomsEnd}><Bone w={24} h={24} r={4} /><Bone w={24} h={24} r={4} /></span></div>
          <div className={styles.main}>
            <div className={styles.col}>
              <div className={styles.stage}>
                <Bone w={150} h={28} r={14} className={styles.stageChip} />
                <div className={styles.photo} />
                <Bone w={430} h={46} r={8} className={styles.zoomBar} />
              </div>
              <div className={styles.strip}>
                <span className={styles.stripHead}><Bone w={60} h={12} /><Bone w={16} h={20} /></span>
                {[0, 1, 2, 3, 4].map((i) => <span key={i} className={styles.tile}><Bone w="100%" h={80} r={4} className={styles.tilePic} /><Bone w="70%" h={12} className={styles.tileName} /></span>)}
              </div>
            </div>
            <aside className={styles.rail}>
              <div className={styles.tabs}>{[0, 1, 2, 3, 4].map((i) => <span key={i} className={styles.tab}><Bone w={20} h={20} r={4} /><Bone w={44} h={10} /></span>)}</div>
              <div className={styles.railBody}>
                <Bone w="100%" h={36} r={4} className={styles.railDescribe} />
                <span className={styles.railHead}><Bone w={140} h={16} /><Bone w="90%" h={12} /><Bone w="60%" h={12} /></span>
                <div className={styles.railCard}>{[0, 1, 2].map((i) => <span key={i} className={styles.railRow}><Bone w={24} h={24} r={4} /><Bone w="55%" h={14} /></span>)}</div>
              </div>
              {/* the foot as the page lays it (tablet-10): Describe (its caption and box), Generate, the idle hint, the versions line — the box
                  and the hint fold on short windows as the page's do */}
              <div className={styles.railFoot}>
                <span className={styles.footDescribe}><Bone w={110} h={12} /><Bone w="100%" h={60} r={4} className={styles.footBox} /></span>
                <Bone w="100%" h={36} r={4} />
                <span className={`${styles.footLine} ${styles.footHint}`}><Bone w={200} h={12} /></span>
                <span className={`${styles.footLine} ${styles.footOpts}`}><Bone w={160} h={12} /></span>
              </div>
              <div className={styles.railGo}><span className={styles.goRow}><Bone w={36} h={36} r={4} /><Bone w="100%" h={36} r={4} className={styles.grow} /></span><span className={styles.footLine}><Bone w={220} h={12} /></span></div>
            </aside>
          </div>
          <div className={styles.goBar}><Bone w={120} h={14} /><span className={styles.goEnd}><Bone w={24} h={24} r={4} /><Bone w={120} h={40} r={4} /></span></div>
          <div className={styles.dock}>{[0, 1, 2, 3, 4].map((i) => <span key={i} className={styles.tab}><Bone w={20} h={20} r={4} /><Bone w={44} h={10} /></span>)}</div>
        </div>
      </GhostSheet>
    </div>
  )
}

/**
 * The client's link while it loads (F167): the letterhead bar (the logo, the studio, "Open until"), the greeting — eyebrow, title, the
 * designer's message, the how-to line — then the room's name and its first design card, at the page's own spacing. (REG-729) The two
 * tags' bones are r4, as the tags now are.
 */
export function RenderShareSkeleton() {
  return (
    <div className={styles.share}>
      <GhostSheet label="Loading the designs">
        <div aria-hidden>
          <div className={styles.shareTop}><span className={styles.shareBrand}><Bone w={32} h={32} r={16} /><Bone w={140} h={16} /></span><Bone w={150} h={28} r={4} className={styles.shareOpen} /></div>
          <div className={styles.shareBody}>
            <div className={styles.shareIntro}><Bone w={90} h={12} /><Bone w="70%" h={32} className={styles.shareTitle} /><Bone w="100%" h={104} r={8} /><Bone w="60%" h={16} /></div>
            <div className={styles.shareRoom}>
              <Bone w={120} h={20} className={styles.shareRoomName} />
              <div className={styles.shareCard}><span className={styles.shareCardHead}><Bone w={190} h={18} /><Bone w={80} h={28} r={4} /></span><div className={styles.sharePhoto} /><span className={styles.shareTools}><Bone w={150} h={36} r={4} /><Bone w={150} h={36} r={4} /><Bone w={120} h={36} r={4} /></span></div>
            </div>
          </div>
        </div>
      </GhostSheet>
    </div>
  )
}
