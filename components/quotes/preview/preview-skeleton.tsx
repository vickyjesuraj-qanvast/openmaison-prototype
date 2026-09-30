import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Line, Slot } from '@/components/shell/ghost-kit'
import qp from './quote-preview.module.css'
import styles from './preview-skeleton.module.css'

/**
 * (sweep S1 #27) Ghost for Preview: its own 76px bar (back · crumb + title + three chips · Internal copy · four buttons) over
 * the surface-bg canvas with one A4 sheet centred (UX audit Q2: the last button is the quote's Send ▾) — the page's own layout, not the editor's (page-checklist › Load & refresh).
 * (REG-708) The bar, body, column and stage are the page's own classes, so the bar wraps as the page's does on a phone (three rows
 * of controls under the title); the sheet is the document's A4 (794 wide), fitted to the stage where it is narrower.
 */
export function PreviewSkeleton() {
  return (
    <GhostSheet label="Loading preview">
      <div className={styles.page}>
        <header className={qp.bar}>
          <Slot kind="icon" />
          <div className={qp.titleBlock}>
            <span className={qp.crumb}><Line w={150} lh={16} h={10} /></span>
            <div className={qp.titleRow}>
              <Line w={78} lh={24} h={20} />
              <span className={qp.chips}><Slot kind="chip" w={150} /><Slot kind="chip" w={52} /><Slot kind="chip" w={52} /></span>
            </div>
          </div>
          <div className={qp.actions}>
            <span className={qp.internal}><Slot kind="switch" /><Line w={80} lh={20} h={12} /></span>
            <Slot kind="btn" w={202} />
            <Slot kind="btn" w={119} />
            <Slot kind="btn" w={155} />
            <Slot kind="btn" w={91} />   {/* (UX audit Q2) the quote's Send ▾ — Mark as sent is its last row now */}
          </div>
        </header>
        <div className={qp.body}>
          <div className={qp.column}>
            <div className={qp.stage}>
              <div className={styles.sheet}>
                <div className={styles.letterhead}>
                  <Bone w={120} h={32} r={4} />
                  <span className={styles.lines}><Bone w={160} h={12} /><Bone w={120} h={12} /></span>
                </div>
                <Bone w="45%" h={20} />
                {[0, 1, 2, 3, 4, 5, 6].map((i) => <Bone key={i} w="100%" h={14} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
