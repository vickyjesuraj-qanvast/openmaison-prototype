import { Bone, GhostSheet } from '@/components/shell/skeleton'
import styles from './editor-skeleton.module.css'

/** Ghost for the template editor: the 56 top bar (back · name · chips · actions), the Structure pane, the page, the Inspector — its own layout, so PageReveal lands without a jump. */
export function TemplateEditorSkeleton() {
  return (
    <GhostSheet label="Loading template">
      <div className={styles.page}>
        <div className={styles.bar}>
          <Bone w={24} h={24} r={4} />
          <Bone w={160} h={16} />
          <Bone w={88} h={20} r={10} />
          <span className={styles.grow} />
          <Bone w={132} h={36} r={4} />
          <Bone w={96} h={36} r={4} />
          <Bone w={140} h={36} r={4} />
        </div>
        <div className={styles.body}>
          <div className={styles.side}>
            <div className={styles.tabs}>{[72, 48, 64].map((w, i) => <Bone key={i} w={w} h={14} />)}</div>
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={styles.row}><Bone w={20} h={20} r={4} /><Bone w={i % 2 ? 120 : 96} h={12} /></div>)}
          </div>
          <div className={styles.stage}><Bone w={640} h={880} r={2} /></div>
          <div className={styles.side}><div className={styles.tabs}><Bone w={72} h={14} /></div><Bone w="80%" h={12} /><Bone w="60%" h={12} /></div>
        </div>
      </div>
    </GhostSheet>
  )
}
