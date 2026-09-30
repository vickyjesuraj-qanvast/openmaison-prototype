import { Bone, GhostSheet } from './skeleton'
import { tabGhost } from '@/components/leads/detail/tab-ghosts'
import { TabGhostFor } from '@/components/leads/detail/tab-ghost-for'
import { DETAIL_TABS } from '@/lib/leads/stage-policy'
import { tabBones } from '@/lib/company/sections'
import styles from './detail-skeleton.module.css'

/* Deterministic "text" widths so rows read as real data, not a grid. */
const ROW_W = [168, 132, 190, 150, 176, 140]

/**
 * Ghost for Lead Details (858-24770): header bones, tab bones, then the Overview's info column + two card columns —
 * or, `wide`, the tab frame (902-26362 …): no info column, and (REG-708) the tab's OWN body between the tabs and the quick-links strip —
 * its toolbar and its table, grid, list or cards (components/leads/detail/tab-ghosts.tsx) — so each tab lands in place (REG-74).
 * `tab` is the tab's slug; the route's `[tab]/loading.tsx` reads it from the address (detail-tab-skeleton.tsx).
 */
export function DetailSkeleton({ wide = false, tab }: { wide?: boolean; tab?: string }) {
  /* (UX audit build) a list tab draws its remembered shape — its first run (the empty card) or its list */
  const body = wide ? (tabGhost(tab) ? <TabGhostFor tab={tab} /> : null) : null
  return (
    <GhostSheet label="Loading lead">
      <div className={styles.header}>
        <Bone w={24} h={24} r={4} />
        <div className={styles.titleCol}>
          <Bone w={44} h={12} />
          <div className={styles.titleRow}>
            <Bone w={148} h={24} />
            {/* The meta chips are their own header slot and take their own line at ≤767 (REG-269); `display: contents`
                keeps them inline with the title at desktop, so the banked 1440 render is unchanged. */}
            <span className={styles.chips}>
              <Bone w={80} h={20} r={4} />
              <Bone w={71} h={20} r={4} />
              <Bone w={94} h={20} r={4} />
            </span>
          </div>
        </div>
        {/* (REG-708) ≤767 the kebab keeps the title's line and Convert to Project fills the second row — the header's phone rule (REG-359) */}
        <span className={styles.kebabPhone}><Bone w={36} h={36} r={4} /></span>
        <div className={styles.actions}>
          <Bone w={134} h={36} r={4} />
          {/* (UX audit 2026-09-30, L6) Convert to Project outlined with its lock while Won is out of reach, then the one filled primary —
              "Move to Met" … — the header most leads show; up to 1024 the row is the pill and the primary (overview.module.css .convertLocked) */}
          <span className={styles.convertLocked}><Bone w={178} h={36} r={4} /></span>
          <span className={styles.convert}><Bone w="100%" h={36} r={4} /></span>
          <span className={styles.kebabDesk}><Bone w={36} h={36} r={4} /></span>
        </div>
      </div>
      <div className={styles.tabs}>
        {/* (REG-708) one bone per tab the strip shows (DETAIL_TABS — Meetings is hidden, REG-552), as wide as its label reads; it drew nine */}
        {tabBones(DETAIL_TABS.map((t) => t.label)).map((w, i) => <Bone key={i} w={w} h={20} />)}
      </div>
      <div className={styles.row}>
        {wide ? null : (
          <div className={styles.info}>
            <Bone w={200} h={32} />
            <Bone w={120} h={20} />
            {/* (REG-708) ≤767 the column is the identity block (REG-304): the name, the phone, View Client Info across — the rest is desk-only */}
            <span className={styles.infoPhone}><Bone w="100%" h={36} r={4} /></span>
            <span className={styles.infoRest}>
            <Bone w={150} h={20} />
            <Bone w={220} h={20} />
            <div className={styles.rule} />
            <Bone w={110} h={20} />
            <Bone w={280} h={20} />
            <Bone w={280} h={20} />
            <div className={styles.rule} />
            <Bone w={80} h={20} />
            {[0, 1, 2, 3].map((i) => <Bone key={i} w={280} h={20} />)}
            </span>
          </div>
        )}
        <div className={styles.centre}>
          {body ?? (wide ? (
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
          ))}
        </div>
        <div className={styles.tools}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Bone key={i} w={24} h={24} r={4} />)}
        </div>
      </div>
    </GhostSheet>
  )
}
