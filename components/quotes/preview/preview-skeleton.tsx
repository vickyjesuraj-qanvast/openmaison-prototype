import { Bone, GhostSheet } from '@/components/shell/skeleton'
import styles from './preview-skeleton.module.css'

/**
 * (sweep S1 #27) Ghost for Preview: its own 76px bar (back · crumb + title + three chips · Internal copy · four buttons) over
 * the surface-bg canvas with one A4 sheet centred — the page's own layout, not the editor's (page-checklist › Load & refresh).
 */
export function PreviewSkeleton() {
  return (
    <GhostSheet label="Loading preview">
      <div className={styles.page}>
        <div className={styles.bar}>
          <Bone w={36} h={36} r={4} />
          <div className={styles.titleCol}>
            <Bone w={180} h={12} />
            <div className={styles.titleRow}>
              <Bone w={96} h={24} />
              <span className={styles.chips}>
                <Bone w={150} h={22} r={4} />
                <Bone w={56} h={20} r={4} />
                <Bone w={52} h={20} r={4} />
              </span>
            </div>
          </div>
          <div className={styles.actions}>
            <Bone w={120} h={20} />
            <Bone w={196} h={36} r={4} />
            <Bone w={110} h={36} r={4} />
            <Bone w={140} h={36} r={4} />
            <Bone w={116} h={36} r={4} />
          </div>
        </div>
        <div className={styles.stage}>
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
    </GhostSheet>
  )
}
