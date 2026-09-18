import { Bone, GhostSheet } from '@/components/shell/skeleton'
import styles from './editor-skeleton.module.css'

/**
 * Ghost for the quote editor (1260:31139): the 76px header (back · crumb + title + three chips · Send · Preview · three
 * icon squares), the tab strip, then the General Info card with its eight field bones and the Items card's head, beside
 * the collapsed Create strip — the editor's own layout, never the lead frame (page-checklist › Load & refresh).
 */
export function EditorSkeleton() {
  return (
    <GhostSheet label="Loading quote">
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.titleCol}>
            <Bone w={180} h={12} />
            <div className={styles.titleRow}>
              <Bone w={148} h={24} />
              <span className={styles.chips}>
                <Bone w={70} h={20} r={4} />
                <Bone w={72} h={20} r={4} />
                <Bone w={52} h={20} r={4} />
              </span>
              <Bone w={112} h={16} />
            </div>
          </div>
          <div className={styles.actions}>
            <Bone w={67} h={36} r={4} />
            <Bone w={87} h={36} r={4} />
            <Bone w={36} h={36} r={4} />
            <Bone w={36} h={36} r={4} />
            <Bone w={36} h={36} r={4} />
          </div>
        </div>
        <div className={styles.tabs}>
          {[82, 62, 128, 34, 156, 118, 68, 54].map((w, i) => <Bone key={i} w={w} h={20} />)}
        </div>
        <div className={styles.body}>
          <div className={styles.main}>
            <div className={styles.card} data-open>
              <div className={styles.cardHead}>
                <Bone w={112} h={24} />
                <Bone w={84} h={36} r={4} />
              </div>
              <div className={styles.grid}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w="100%" h={48} r={4} />)}
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <Bone w={90} h={24} />
                <Bone w={420} h={36} r={4} />
              </div>
            </div>
          </div>
          <div className={styles.strip}>
            <Bone w={20} h={20} r={4} />
            {[0, 1, 2, 3].map((i) => <Bone key={i} w={24} h={24} r={4} />)}
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
