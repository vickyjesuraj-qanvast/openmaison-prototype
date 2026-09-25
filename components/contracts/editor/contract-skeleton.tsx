import { Bone, GhostSheet } from '@/components/shell/skeleton'
import styles from './contract-skeleton.module.css'

/**
 * (sweep S2 #22) The contract pages' own ghosts — the quote editor's was drawn for them before. `editor`: the 76 header, the meta row,
 * the formatting bar and the paper; `preview`: the bar and the paper; `sign`: the signing page's letterhead bar, the paper and its card.
 */
export function ContractSkeleton({ kind = 'editor' }: { kind?: 'editor' | 'preview' | 'sign' }) {
  const paper = (
    <div className={styles.paper}>
      <div className={styles.letterhead}><Bone w={120} h={28} r={4} /><span className={styles.lines}><Bone w={180} h={12} /><Bone w={140} h={12} /></span></div>
      <Bone w="55%" h={24} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w={i % 3 === 2 ? '70%' : '100%'} h={14} />)}
    </div>
  )
  return (
    <GhostSheet label={kind === 'sign' ? 'Loading the agreement' : 'Loading contract'}>
      <div className={styles.page} data-kind={kind}>
        {kind === 'sign' ? (
          <div className={styles.signTop}><Bone w={160} h={24} /><Bone w={120} h={28} r={14} /></div>
        ) : (
          <div className={styles.header}>
            <Bone w={36} h={36} r={4} />
            <div className={styles.titleCol}><Bone w={200} h={12} /><div className={styles.titleRow}><Bone w={220} h={24} /><Bone w={64} h={20} r={4} /></div></div>
            <div className={styles.actions}>{kind === 'editor' ? <><Bone w={96} h={36} r={4} /><Bone w={84} h={36} r={4} /><Bone w={36} h={36} r={4} /><Bone w={36} h={36} r={4} /></> : <><Bone w={120} h={36} r={4} /><Bone w={96} h={36} r={4} /></>}</div>
          </div>
        )}
        {kind === 'editor' ? (
          <>
            <div className={styles.meta}><Bone w={240} h={28} /><span className={styles.metaEnd}><Bone w={160} h={36} r={4} /><Bone w={140} h={36} r={4} /></span></div>
            <div className={styles.bar}>{[56, 96, 120, 60, 88, 36].map((w, i) => <Bone key={i} w={w} h={24} r={4} />)}<span className={styles.barEnd}><Bone w={110} h={28} r={4} /></span></div>
          </>
        ) : null}
        <div className={styles.stage}>
          {paper}
          {kind === 'sign' ? <div className={styles.card}><Bone w={120} h={12} /><Bone w="80%" h={24} /><Bone w="100%" h={48} r={4} /><Bone w={120} h={36} r={4} /></div> : null}
        </div>
      </div>
    </GhostSheet>
  )
}
