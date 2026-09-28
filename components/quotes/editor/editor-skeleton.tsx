import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { EditorHeadGhost } from '@/components/shell/editor-head-ghost'
import styles from './editor-skeleton.module.css'

/**
 * Ghost for the quote editor (1260:31139): the 76px header (back · crumb + title + three chips · Send · Preview · three
 * icon squares), the tab strip, then the General Info card with its eight field bones and the Items card's head, beside
 * the collapsed Create strip — the editor's own layout, never the lead frame (page-checklist › Load & refresh). (REG-708) The header is
 * the editors' shared header ghost, on the header's own classes, so a phone wraps it as the real one wraps.
 */
export function EditorSkeleton() {
  return (
    <GhostSheet label="Loading quote">
      <div className={styles.page}>
        <EditorHeadGhost crumb={180} title={196} chips={[60, 62, 48, 108]} status={76} primary={54} spans={false} foldable={[36, 76, 36]} />
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
