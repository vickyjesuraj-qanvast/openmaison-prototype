'use client'

import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line, Slot } from '@/components/shell/ghost-kit'
import styles from './editor-skeleton.module.css'

/**
 * Ghost for the template editor: the 56 top bar (back · name · chips · saved · the sample picker, zoom, undo · redo · history, ⋮, Preview,
 * Publish), the first-visit hint while it shows, the Page pane (its three tabs, Page setup, the blocks), the page at 95%, the Inspector —
 * its own layout, so the page lands in place. (REG-708) The editor has no PageReveal: this loader is its only ghost, so it draws the page as
 * the member will see it — the hint as they left it (`om.tpl.hint`, read in the browser as the editor reads it) and the paper at the
 * document's width at the editor's 95% (794 × 0.95), centred in the stage.
 */
export function TemplateEditorSkeleton() {
  return (
    <GhostSheet label="Loading template">
      <div className={styles.page}>
        <div className={styles.bar}>
          <Bone w={24} h={24} r={4} />
          <span className={styles.name}><Line w={144} lh={32} h={16} /></span>
          <span className={styles.chips}><Slot kind="chip" w={86} /><Slot kind="chip" w={58} /></span>   {/* the status, and (Vicky 2026-10-29: brought back) Default */}
          <span className={styles.desk}><Line w={110} lh={16} h={10} /></span>
          <span className={styles.grow} />
          <span className={styles.desk}><Slot kind="btn" w={249} /></span>
          <span className={styles.group}><Bone w={20} h={20} r={4} /><Bone w={36} h={16} /><Bone w={20} h={20} r={4} /></span>
          <span className={styles.group}>{[0, 1, 2, 3].map((i) => <Bone key={i} w={20} h={20} r={4} />)}</span>
          <span className={styles.desk}><Slot kind="btn" w={84} /></span><span className={styles.desk}><Slot kind="btn" w={98} /></span>
        </div>
        {/* a phone's note (the editor is a view there) — (the calm UI build 2026-10-27, the UI audit's 4-23) the desk's first-visit hint is gone, so
            the desk never draws the row (data-seen); the inspector's empty state says its three steps */}
        <div className={styles.hint} data-seen=""><Bone w={16} h={16} r={8} /><Line w={780} lh={20} h={12} style={{ flexShrink: 1, minWidth: 0 }} /><span className={styles.grow} /><span className={styles.desk}><Line w={36} lh={20} h={12} /></span></div>
        <div className={styles.body}>
          <div className={styles.side}>
            <div className={styles.tabs}>{[36, 40, 100].map((w, i) => <span key={i} className={styles.tab}><Bone w={w} h={14} /></span>)}</div>
            <div className={styles.setup}><Line w={96} lh={20} h={14} /><Bone w={20} h={20} r={4} /></div>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={styles.row}>
                <Bone w={20} h={20} r={4} />
                <span className={styles.rowText}><Line w={[52, 80, 110, 50, 112, 128, 48][i]!} lh={20} h={12} />{[64, 118, 0, 44, 60, 0, 56][i] ? <Line w={[64, 118, 0, 44, 60, 0, 56][i]!} lh={16} h={10} /> : null}</span>
                <Bone w={20} h={20} r={10} />
              </div>
            ))}
          </div>
          <div className={styles.stage}>
            <div className={styles.paper}>
              <div className={styles.letterhead}><Bone w={56} h={56} r={8} /><Bone w={36} h={10} /></div>
              <Bone w={90} h={14} />
              {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className={styles.kv}><Bone w={44} h={10} /><Bone w={[60, 72, 64, 230, 90, 110][i]!} h={10} /></span>)}
              <Bone w={440} h={12} style={{ marginTop: 12, maxWidth: '100%' }} />
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w="100%" h={i % 4 === 0 ? 14 : 10} />)}
            </div>
          </div>
          <div className={styles.side}>
            <div className={styles.inspectorHead}><Line w={110} lh={20} h={14} /></div>
            <div className={styles.inspectorBody}><Bone w={32} h={32} r={4} /><Line w={250} lh={20} h={12} /><Line w={60} lh={20} h={12} />{[0, 1, 2].map((i) => <span key={i} className={styles.step}><Bone w={24} h={24} r={12} /><Line w={[230, 220, 200][i]!} lh={20} h={12} /></span>)}</div>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
