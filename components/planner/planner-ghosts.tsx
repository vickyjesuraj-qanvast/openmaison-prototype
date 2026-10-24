'use client'

import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { LibraryGalleryGhost } from '@/components/company/templates/library-gallery.skeleton'
import pageStyles from '@/app/leads/leads.module.css'
import bar from '@/components/visualizer/editor/topbar.module.css'
import rail from '@/components/visualizer/editor/rail.module.css'
import editor from './editor/editor.module.css'
import styles from './planner-ghosts.module.css'
import home from './home/planner-home.module.css'
import { Words } from '@/components/shell/ghost-kit'
import { ISO_NOTE, ISO_PHOTO_LINK, ISO_USUAL_LINK } from '@/lib/planner/copy'

/*
 * (gaps build J) The 3D Space Planner's ghosts — each drawn on its page's own classes, so the loader and PageReveal hand over without a
 * jump (REG-708): the gallery (the house library gallery's ghost under the L1 head), the editor's app frame (the bar, the rail's tabs and
 * rows, the grey stage; ≤1024 the stage and the dock), the client's viewer and the paper.
 */

export function PlannerHomeGhost({ iso = false }: { /** (parity map, TD-098) opened with ?view=iso: its line above the gallery */ iso?: boolean } = {}) {
  return (
    <GhostSheet label="Loading layouts" l1>
      <div className={styles.gHead}><Bone w={190} h={28} /></div>
      <div className={pageStyles.content} aria-hidden>
        {/* (pending modules S28) the line drawn on its own classes, its words and its two links — it wraps where the page's wraps */}
        {iso ? (
          <section className={`${home.isoNote} ${styles.isoGhost}`} aria-hidden>
            <Bone w={20} h={20} r={4} />
            <Words className={home.isoText}>{ISO_NOTE}</Words>
            <Words className={`${home.isoLink} ${styles.isoLinkBox}`}>{ISO_PHOTO_LINK}</Words>
            <Words className={`${home.isoLink} ${styles.isoLinkBox}`}>{ISO_USUAL_LINK}</Words>
          </section>
        ) : null}
        <LibraryGalleryGhost pill folders={0} cards={4} />
      </div>
    </GhostSheet>
  )
}

export function PlannerEditorGhost() {
  return (
    <div className={styles.frame}>
      <GhostSheet label="Loading the layout">
        <div className={editor.editor} aria-hidden>
          <header className={bar.bar}>
            <Bone w={24} h={24} r={4} />
            <span className={bar.titles}><Bone w={160} h={18} /><Bone w={110} h={24} r={12} className={styles.wide} /></span>
            {/* the view switch and (parity map, TD-081) the View ▾ beside it */}
            <span className={styles.middle}><Bone w={190} h={36} r={18} className={styles.wide} /><Bone w={64} h={36} r={4} className={styles.wide} /></span>
            <span className={bar.end}><span className={styles.wide}><Bone w={24} h={24} r={4} /><Bone w={24} h={24} r={4} /></span><Bone w={150} h={40} r={4} /><Bone w={24} h={24} r={4} /></span>
          </header>
          <div className={editor.body}>
            <aside className={`${editor.rail} ${styles.gRail}`}>
              <div className={`${rail.tabs} ${editor.tabs3}`}>{[0, 1, 2].map((i) => <span key={i} className={styles.tab}><Bone w={20} h={20} r={4} /><Bone w={44} h={10} /></span>)}</div>
              <div className={styles.railBody}>
                <span className={styles.head}><Bone w={80} h={18} /><Bone w="70%" h={12} /></span>
                <span className={styles.row2}><Bone w={124} h={40} r={4} /><Bone w={130} h={40} r={4} /></span>
                {[0, 1, 2, 3, 4, 5].map((i) => <Bone key={i} w="100%" h={52} r={8} />)}
              </div>
            </aside>
            <div className={editor.stage}><span className={styles.plan} /></div>
          </div>
          <div className={styles.dock}>{[0, 1, 2].map((i) => <span key={i} className={styles.tab}><Bone w={20} h={20} r={4} /><Bone w={44} h={10} /></span>)}</div>
        </div>
      </GhostSheet>
    </div>
  )
}

/** The client's 3D link and the portal's viewer: the studio's letterhead, the name, the stage. */
export function LayoutViewerGhost() {
  return (
    <GhostSheet label="Loading the layout">
      <div className={styles.viewer} aria-hidden>
        <span className={styles.vTop}><Bone w={120} h={20} /><Bone w={90} h={14} /></span>
        <span className={styles.vHead}><Bone w={220} h={24} /><Bone w={160} h={14} /></span>
        <span className={styles.vStage} />
      </div>
    </GhostSheet>
  )
}

/** The paper: two A4 sheets, landscape. */
export function LayoutPrintGhost() {
  return (
    <GhostSheet label="Loading the paper">
      <div className={styles.paperWrap} aria-hidden>
        <span className={styles.paperBar}><Bone w={24} h={24} r={4} /><Bone w={200} h={18} /><span className={styles.grow} /><Bone w={140} h={40} r={4} /></span>
        {[0, 1].map((i) => <span key={i} className={styles.paper}><Bone w="40%" h={18} /><Bone w="100%" h={360} r={4} /></span>)}
      </div>
    </GhostSheet>
  )
}
