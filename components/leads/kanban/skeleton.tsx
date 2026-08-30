'use client'

import shell from '@/components/shell/skeleton.module.css'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { STAGES, INACTIVE_STAGES } from '@/lib/leads/enums'
import styles from './skeleton.module.css'

/* Deterministic card counts / name widths per column so the bones read as a board, not a grid. */
const CARDS: Record<string, number[]> = {
  New: [128, 96, 148], Contacted: [112, 136], Met: [104, 120, 156], 'Quote Sent': [140], Won: [96, 128],
  'On Hold': [120], Lost: [104, 88],
}
const NAME_W: Record<string, number> = { New: 30, Contacted: 68, Met: 28, 'Quote Sent': 76, Won: 30, 'On Hold': 56, Lost: 30 }

/**
 * Leads listing — kanban variant (779:19733 / 779:24866): the same header + toolbar bones as `LeadsSkeleton`, then the
 * board's rails and 320px columns (52px head, 288px card bones) so `PageReveal`'s crossfade lands columns over columns
 * (page-checklist › Load & refresh, REG-74). Picked by the workspace when the view is kanban (REG-197); `loading.tsx`
 * has no search params, so the streaming phase still shows the table ghost.
 */
export function KanbanSkeleton() {
  const bands: { tone: 'green' | 'yellow'; stages: readonly string[] }[] = [
    { tone: 'green', stages: STAGES },
    { tone: 'yellow', stages: INACTIVE_STAGES },
  ]
  return (
    <GhostSheet label="Loading leads">
      <div className={shell.header}>
        <Bone w={72} h={28} />
        <div className={shell.headerActions}>
          <Bone w={116} h={36} r="var(--om-radius-1)" />
          <Bone w={126} h={36} r="var(--om-radius-1)" />
          <Bone w={36} h={36} r="var(--om-radius-1)" />
        </div>
      </div>
      <div className={styles.content}>
        <div className={shell.toolbar}>
          <Bone w={132} h={36} r="var(--om-radius-1)" />
          <div className={shell.toolbarRight}>
            <Bone w={280} h={36} r="var(--om-radius-1)" />
            <Bone w={36} h={36} r="var(--om-radius-1)" />
            <Bone w={72} h={36} r="var(--om-radius-1)" />
          </div>
        </div>
        <div className={styles.board}>
          {bands.map((band) => (
            <div key={band.tone} className={styles.band}>
              <span className={styles.rail} data-tone={band.tone} />
              {band.stages.map((stage) => (
                <div key={stage} className={styles.column} data-tone={band.tone}>
                  <div className={styles.colHead}><Bone w={NAME_W[stage] ?? 40} h={14} /><Bone w={10} h={12} /></div>
                  <div className={styles.colBody}>
                    {(CARDS[stage] ?? []).map((w, i) => (
                      <div key={i} className={styles.card}>
                        <div className={styles.cardHead}><Bone w={w} h={16} /><Bone w={40} h={12} /></div>
                        <Bone w={196} h={12} />
                        <Bone w="100%" h={36} r="var(--om-radius-1)" />
                        <span className={styles.divider} />
                        <span className={shell.avatars}><Bone w={24} h={24} r="50%" /><Bone w={24} h={24} r="50%" /></span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </GhostSheet>
  )
}
