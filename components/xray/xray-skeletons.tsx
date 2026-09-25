import { Bone, GhostSheet } from '@/components/shell/skeleton'
import shell from '@/components/shell/skeleton.module.css'
import detail from '@/components/shell/detail-skeleton.module.css'
import styles from './xray-skeletons.module.css'

/**
 * Quote X-Ray's own ghosts (REG-639, parity §8.2 — the checklist's rule that a ghost mirrors its screen; X-Ray borrowed the
 * Leads listing's and Lead Details'). The setup: the header, the intro card, the setup card beside Recent comparisons. The
 * record: the L2 header, then the centred reading column — summary with its three tiles, Say this, key points, the table.
 */
export function XraySetupSkeleton({ scoped = false, intro = true }: { scoped?: boolean; /** (sweep S3) the intro card was dismissed — its bone isn't drawn either */ intro?: boolean }) {
  return (
    <GhostSheet label="Loading Quote X-Ray">
      {scoped ? (
        <div className={detail.header}>
          <Bone w={24} h={24} r={4} />
          <div className={detail.titleCol}><Bone w={120} h={12} /><Bone w={132} h={24} /></div>
        </div>
      ) : (
        <div className={shell.header}><Bone w={132} h={28} /></div>
      )}
      <div className={styles.content}>
        {intro ? <div className={styles.intro}><Bone w="62%" h={18} /><Bone w="48%" h={14} /><Bone w="52%" h={14} /><Bone w="44%" h={14} /></div> : null}
        <div className={styles.columns}>
          <div className={styles.card}>
            <Bone w={296} h={40} r="var(--om-radius-full)" />
            <div className={styles.grid}>
              <div className={styles.side}><Bone w={40} h={12} /><Bone w="100%" h={48} r={4} /><Bone w="70%" h={16} /><Bone w="100%" h={64} r={8} /><Bone w="100%" h={64} r={8} /></div>
              <div className={styles.side}><Bone w={160} h={12} /><Bone w="100%" h={148} r={8} /></div>
            </div>
            <div className={styles.foot}><Bone w={180} h={14} /><Bone w={96} h={40} r={4} /></div>
          </div>
          <div className={styles.recents}>
            <div className={styles.recentsHead}><Bone w={148} h={12} /></div>
            {[196, 164, 212, 180].map((w, i) => <div key={i} className={styles.recent}><Bone w={w} h={16} /><Bone w={Math.round(w * 0.6)} h={12} /></div>)}
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}

export function XrayRecordSkeleton() {
  return (
    <GhostSheet label="Loading comparison">
      <div className={detail.header}>
        <Bone w={24} h={24} r={4} />
        <div className={detail.titleCol}>
          <Bone w={96} h={12} />
          <div className={detail.titleRow}><Bone w={220} h={24} /><Bone w={80} h={20} r={4} /><Bone w={120} h={20} r={4} /></div>
        </div>
        <div className={detail.actions}><Bone w={176} h={40} r={4} /></div>
      </div>
      <div className={styles.column}>
        <div className={styles.card}>
          <Bone w="58%" h={14} /><Bone w="86%" h={24} /><Bone w="64%" h={24} />
          <div className={styles.tiles}>{[0, 1, 2].map((i) => <Bone key={i} w="100%" h={88} r={8} />)}</div>
          <Bone w="92%" h={14} />
        </div>
        <div className={styles.card}>
          <div className={styles.cardHead}><Bone w={96} h={20} /><Bone w={152} h={40} r={4} /></div>
          {[0, 1, 2].map((i) => <div key={i} className={styles.point}><Bone w={24} h={24} r="var(--om-radius-full)" /><div className={styles.pointBody}><Bone w="94%" h={16} /><Bone w="72%" h={16} /><Bone w="84%" h={12} /></div></div>)}
        </div>
        <div className={styles.card}><Bone w={200} h={20} /><Bone w="100%" h={96} r={8} /><Bone w="100%" h={96} r={8} /></div>
        <div className={styles.card}><Bone w={160} h={20} />{[0, 1, 2, 3, 4, 5].map((i) => <Bone key={i} w="100%" h={44} r={4} />)}</div>
      </div>
    </GhostSheet>
  )
}
