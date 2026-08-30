import { Bone, GhostSheet } from '@/components/shell/skeleton'
import styles from './viewer-skeleton.module.css'

/**
 * Ghost for the file viewer (931:39831): the 56px header row (back 24 · name 148×24 · four 24 action bones) over one
 * canvas bone inside the section container's p100/120, with the 130×50 zoom bar bone at the bottom centre — the viewer's
 * own layout, not the Lead Details frame (page-checklist › Load & refresh; audit 2026-08-30, VIEWER-GHOST-MISMATCH).
 */
export function ViewerSkeleton() {
  return (
    <GhostSheet label="Loading file">
      <div className={styles.header}>
        <Bone w={24} h={24} r={4} />
        <Bone w={148} h={24} />
        <div className={styles.actions}>
          {[0, 1, 2, 3].map((i) => <Bone key={i} w={24} h={24} r={4} />)}
        </div>
      </div>
      <div className={styles.stage}>
        <div className={styles.canvas}>
          <Bone w="100%" r={2} className={styles.image} style={{ height: '100%' }} />
          <Bone w={130} h={50} r={8} className={styles.zoom} />
        </div>
      </div>
    </GhostSheet>
  )
}
