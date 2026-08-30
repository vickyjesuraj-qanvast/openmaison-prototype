import { Bone, GhostSheet } from './skeleton'
import styles from './detail-skeleton.module.css'

/* Deterministic "text" widths so rows read as real data, not a grid. */
const ROW_W = [168, 132, 190, 150, 176, 140]

/**
 * Ghost for Lead Details (858-24770): header bones, tab bones, then the Overview's info column + two card columns —
 * or, `wide`, the tab frame the table tabs share (902-26362 …): no info column, a toolbar row and 56 / 48 table bones
 * between the tabs and the quick-links strip (REG-74: the skeleton mirrors the screen's own layout).
 */
export function DetailSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <GhostSheet label="Loading lead">
      <div className={styles.header}>
        <Bone w={24} h={24} r={4} />
        <div className={styles.titleCol}>
          <Bone w={44} h={12} />
          <div className={styles.titleRow}>
            <Bone w={148} h={24} />
            <Bone w={80} h={20} r={4} />
            <Bone w={71} h={20} r={4} />
            <Bone w={94} h={20} r={4} />
          </div>
        </div>
        <div className={styles.actions}>
          <Bone w={134} h={36} r={4} />
          <Bone w={180} h={36} r={4} />
          <Bone w={36} h={36} r={4} />
        </div>
      </div>
      <div className={styles.tabs}>
        {[65, 48, 50, 68, 48, 48, 64, 96, 53].map((w, i) => <Bone key={i} w={w} h={20} />)}
      </div>
      <div className={styles.row}>
        {wide ? null : (
          <div className={styles.info}>
            <Bone w={200} h={32} />
            <Bone w={120} h={20} />
            <Bone w={150} h={20} />
            <Bone w={220} h={20} />
            <div className={styles.rule} />
            <Bone w={110} h={20} />
            <Bone w={280} h={20} />
            <Bone w={280} h={20} />
            <div className={styles.rule} />
            <Bone w={80} h={20} />
            {[0, 1, 2, 3].map((i) => <Bone key={i} w={280} h={20} />)}
          </div>
        )}
        <div className={styles.centre}>
          {wide ? (
            <>
              <div className={styles.toolbar}>
                <Bone w={132} h={36} r={4} />
                <div className={styles.toolbarRight}>
                  <Bone w={110} h={36} r={4} />
                  <Bone w={36} h={36} r={4} />
                  <Bone w={36} h={36} r={4} />
                </div>
              </div>
              <div className={styles.tableWrap}>
                <div className={styles.headRow}>
                  <span className={styles.col} style={{ flex: '1 0 240px' }}><Bone w={36} h={12} /></span>
                  <span className={styles.col} style={{ flex: '0 0 140px' }}><Bone w={48} h={12} /></span>
                  <span className={styles.col} style={{ flex: '0 0 160px' }}><Bone w={64} h={12} /></span>
                  <span className={styles.col} style={{ flex: '0 0 160px' }}><Bone w={56} h={12} /></span>
                  <span className={styles.col} style={{ flex: '0 0 120px' }}><Bone w={40} h={12} /></span>
                </div>
                {ROW_W.map((w, i) => (
                  <div key={i} className={styles.tableRow}>
                    <span className={styles.col} style={{ flex: '1 0 240px' }}><Bone w={w} h={14} /></span>
                    <span className={styles.col} style={{ flex: '0 0 140px' }}><Bone w={64} h={20} r={4} /></span>
                    <span className={styles.col} style={{ flex: '0 0 160px' }}><Bone w={88} h={14} /></span>
                    <span className={styles.col} style={{ flex: '0 0 160px' }}><Bone w={72} h={14} /></span>
                    <span className={styles.col} style={{ flex: '0 0 120px' }}><Bone w={24} h={24} r={4} /></span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <Bone w="100%" h={176} r={8} />
              <div className={styles.grid}>
                <div className={styles.col}><Bone w="100%" h={240} r={8} /><Bone w="100%" h={168} r={8} /><Bone w="100%" h={204} r={8} /></div>
                <div className={styles.col}><Bone w="100%" h={408} r={8} /><Bone w="100%" h={148} r={8} /><Bone w="100%" h={136} r={8} /></div>
              </div>
            </>
          )}
        </div>
        <div className={styles.tools}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w={24} h={24} r={4} />)}
        </div>
      </div>
    </GhostSheet>
  )
}
