'use client'

import { useLayoutEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './skeleton.module.css'

/**
 * Ghost loader — shown on every load / refresh of every page (user rule,
 * 2026-08-27). Each route ships a skeleton that mirrors its own layout so the
 * crossfade in `PageReveal` lands content exactly where the bones were.
 * One highlight sweeps the whole sheet (not per-bone shimmer); its phase is
 * pinned to a global clock so the `loading.tsx` → page swap doesn't jump.
 */
export const SWEEP_MS = 1800

/** Set on the first ghost mount of a load; consumed (read + cleared) by `PageReveal` on mount for its minimum hold. */
export const ghostClock = { shownAt: null as number | null }

export function GhostSheet({ children, label = 'Loading' }: { children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    // Before paint, so the loading.tsx → page swap keeps the sweep in phase.
    if (ghostClock.shownAt === null) ghostClock.shownAt = performance.now()
    ref.current?.style.setProperty('--sweep-delay', `-${Math.round(performance.now() % SWEEP_MS)}ms`)
  }, [])
  return (
    <div ref={ref} className={`${pageStyles.body} ${styles.sheet}`} role="status" aria-label={label} aria-busy>
      {children}
    </div>
  )
}

export function Bone({ w, h = 16, r, className, style }: { w: number | string; h?: number; r?: number | string; className?: string; style?: CSSProperties }) {
  return <span className={className ? `${styles.bone} ${className}` : styles.bone} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden />
}

/* Deterministic "text" widths so rows read as real data, not a grid. Eight of each — the mock's rows; longer
   sheets cycle through them (see `useRowCount`). */
const NAME_W = [128, 96, 148, 112, 136, 104, 120, 156]
const STAGE_W = [32, 32, 32, 32, 70, 70, 70, 34]
const TASK_W = [180, 140, 210, 160, 190, 120, 170, 200]
const SRC_W = [72, 56, 84, 64, 76, 60, 80, 68]
const TYPE_W = [92, 70, 104, 84, 96, 74, 100, 88]
const FILE_W = [168, 132, 190, 150, 176, 140]
const ERR_W = [72, 210, 72, 168, 72, 240]

/*
 * How many table rows the sheet has room for. The mock draws eight because eight is what fits its frame — the real
 * listing renders every lead (36 in the base state), so the bones should reach the fold at any viewport height.
 * The first row starts 217px down (8 page pad + 68 header + 24 content pad + 36 toolbar + 24 gap + 1 border + 56 head)
 * and the table ends --fab-clearance above the bottom, so at the demo's 1024 that is 12 rows of 64 — the last one
 * running under the fold exactly as the real table does. Read through a store, not a lazy initialiser: `loading.tsx`
 * is server-rendered, and the server snapshot (the mock's eight) keeps hydration honest (quick-links.tsx does the same).
 */
const ROW_H = 64
const TABLE_TOP = 217
const FAB_CLEARANCE = 88
const MOCK_ROWS = 8
const subscribeViewport = (cb: () => void) => {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}
const viewportRows = () => Math.max(1, Math.ceil((window.innerHeight - TABLE_TOP - FAB_CLEARANCE) / ROW_H))
const mockRows = () => MOCK_ROWS
const useRowCount = () => useSyncExternalStore(subscribeViewport, viewportRows, mockRows)

/** Leads listing (779:19690 table variant): header · toolbar · table with the default columns. */
export function LeadsSkeleton() {
  const rows = useRowCount()
  return (
    <GhostSheet label="Loading leads">
      <div className={styles.header}>
        <Bone w={72} h={28} />
        <div className={styles.headerActions}>
          <Bone w={116} h={36} r="var(--om-radius-1)" />
          <Bone w={126} h={36} r="var(--om-radius-1)" />
          <Bone w={36} h={36} r="var(--om-radius-1)" />
        </div>
      </div>
      <div className={pageStyles.content}>
        <div className={styles.toolbar}>
          <Bone w={132} h={36} r="var(--om-radius-1)" />
          <div className={styles.toolbarRight}>
            <Bone w={280} h={36} r="var(--om-radius-1)" />
            <Bone w={36} h={36} r="var(--om-radius-1)" />
            <Bone w={72} h={36} r="var(--om-radius-1)" />
          </div>
        </div>
        <div className={styles.tableWrap}>
          <div className={styles.tableInner} style={{ minWidth: 1410 }}>
          <div className={styles.headRow}>
            <span className={styles.col} style={{ flex: '240 0 240px' }}><Bone w={72} h={12} /></span>
            <span className={styles.col} style={{ flex: '146 0 146px' }}><Bone w={40} h={12} /></span>
            <span className={styles.col} style={{ flex: '321 0 321px' }}><Bone w={40} h={12} /></span>
            <span className={styles.col} style={{ flex: '160 0 160px' }}><Bone w={64} h={12} /></span>
            <span className={styles.col} style={{ flex: '132 0 132px' }}><Bone w={48} h={12} /></span>
            <span className={styles.col} style={{ flex: '138 0 138px' }}><Bone w={72} h={12} /></span>
            <span className={styles.col} style={{ flex: '158 0 158px' }}><Bone w={88} h={12} /></span>
            <span className={styles.col} style={{ flex: '115 0 115px' }}><Bone w={56} h={12} /></span>
          </div>
          {Array.from({ length: rows }, (_, i) => {
            const j = i % NAME_W.length   /* the mock's eight bone widths, cycled, so a taller sheet still reads as data */
            return (
            <div key={i} className={styles.row}>
              <span className={`${styles.col} ${styles.nameCol}`} style={{ flex: '240 0 240px' }}>
                <Bone w={NAME_W[j] ?? 128} h={14} /><Bone w={72} h={10} />
              </span>
              <span className={styles.col} style={{ flex: '146 0 146px' }}><Bone w={STAGE_W[j] ?? 48} h={14} /><Bone w={14} h={14} r={7} /></span>
              <span className={styles.col} style={{ flex: '321 0 321px' }}><Bone w={TASK_W[j] ?? 160} h={14} /></span>
              <span className={styles.col} style={{ flex: '160 0 160px' }}>
                <span className={styles.avatars}><Bone w={24} h={24} r="50%" /><Bone w={24} h={24} r="50%" /></span>
              </span>
              <span className={styles.col} style={{ flex: '132 0 132px' }}><Bone w={SRC_W[j] ?? 64} h={14} /></span>
              <span className={styles.col} style={{ flex: '138 0 138px' }}><Bone w={64} h={14} /></span>
              <span className={styles.col} style={{ flex: '158 0 158px' }}><Bone w={TYPE_W[j] ?? 88} h={14} /></span>
              <span className={styles.col} style={{ flex: '115 0 115px' }}><Bone w={76} h={14} /></span>
            </div>
            )
          })}
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}

/* Qanvast Ops › Leads bones — the Status column shows one or two 20px tags (931:49232 rows: Contacted · Return Processing · Approved + Refund …). */
const QV_NAME_W = [88, 76, 72, 100, 76, 92, 80]
const QV_TAG_W = [[74], [118], [112, 118], [62], [62], [50], [118]]

/**
 * Qanvast Ops › Leads (931:49232, spec design-source/context/lead-return/02-qanvast-ops.txt): header (title · Insights 110 ·
 * Add Lead 121 · kebab 36) · the 44px tab row (Leads · Credits · Reviews · Hangouts) · toolbar (pill 151 · Request Leads 133 ·
 * filter 36 · kebab 36) · table head 56 / rows 64 on the page's own tracks — the five data columns share the slack in the
 * mock's 240 · 132 · 138 · 158 · 115 proportions and Status holds its 369 (qanvast-leads.module.css .card), so the
 * PageReveal crossfade lands in place (design-source/context/page-checklist.md). Text bones are sized to the mock's runs.
 */
export function QanvastSkeleton() {
  return (
    <GhostSheet label="Loading Qanvast leads">
      <div className={styles.header}>
        <Bone w={120} h={28} />
        <div className={styles.headerActions}>
          <Bone w={110} h={36} r="var(--om-radius-1)" />
          <Bone w={121} h={36} r="var(--om-radius-1)" />
          <Bone w={36} h={36} r="var(--om-radius-1)" />
        </div>
      </div>
      <div className={styles.tabs}>
        {[41, 49, 54, 65].map((w, i) => <Bone key={i} w={w} h={20} />)}
      </div>
      <div className={pageStyles.content}>
        <div className={styles.toolbar}>
          <Bone w={151} h={36} r="var(--om-radius-1)" />
          <div className={styles.toolbarRight}>
            <Bone w={133} h={36} r="var(--om-radius-1)" />
            <Bone w={36} h={36} r="var(--om-radius-1)" />
            <Bone w={36} h={36} r="var(--om-radius-1)" />
          </div>
        </div>
        <div className={styles.tableWrap}>
          <div className={styles.headRow}>
            <span className={styles.col} style={{ flex: '240 0 240px' }}><Bone w={36} h={12} /></span>
            <span className={styles.col} style={{ flex: '132 0 132px' }}><Bone w={40} h={12} /></span>
            <span className={styles.col} style={{ flex: '138 0 138px' }}><Bone w={64} h={12} /></span>
            <span className={styles.col} style={{ flex: '158 0 158px' }}><Bone w={72} h={12} /></span>
            <span className={styles.col} style={{ flex: '115 0 115px' }}><Bone w={48} h={12} /></span>
            <span className={styles.col} style={{ flex: '1 0 369px' }}><Bone w={40} h={12} /></span>
          </div>
          {QV_NAME_W.map((w, i) => (
            <div key={i} className={styles.row}>
              <span className={`${styles.col} ${styles.nameCol}`} style={{ flex: '240 0 240px' }}>
                <Bone w={w} h={14} /><Bone w={64} h={10} />
              </span>
              <span className={styles.col} style={{ flex: '132 0 132px' }}><Bone w={28} h={14} /></span>
              <span className={styles.col} style={{ flex: '138 0 138px' }}><Bone w={48} h={14} /></span>
              <span className={styles.col} style={{ flex: '158 0 158px' }}><Bone w={76} h={14} /></span>
              <span className={styles.col} style={{ flex: '115 0 115px' }}><Bone w={64} h={14} /></span>
              <span className={styles.col} style={{ flex: '1 0 369px', gap: 'var(--om-spacing-2)' }}>
                {(QV_TAG_W[i] ?? [74]).map((tw, j) => <Bone key={j} w={tw} h={20} r="var(--om-radius-1)" />)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </GhostSheet>
  )
}

/** Lead Import History (779:20147): back + crumb/title, two buttons, section toolbar, 44px rows. */
export function ImportsSkeleton() {
  return (
    <GhostSheet label="Loading import history">
      <div className={styles.header}>
        <Bone w={24} h={24} r={12} />
        <span className={styles.titleBlock}><Bone w={48} h={10} /><Bone w={196} h={22} /></span>
        <div className={styles.headerActions}>
          <Bone w={188} h={36} r="var(--om-radius-1)" />
          <Bone w={104} h={36} r="var(--om-radius-1)" />
        </div>
      </div>
      <div className={pageStyles.content}>
        <div className={styles.toolbar}>
          <Bone w={164} h={20} />
          <div className={styles.toolbarRight}>
            <Bone w={280} h={36} r="var(--om-radius-1)" />
            <Bone w={36} h={36} r="var(--om-radius-1)" />
            
          </div>
        </div>
        <div className={styles.tableWrap}>
          <div className={styles.tableInner} style={{ minWidth: 1316 }}>
          <div className={styles.headRow}>
            <span className={styles.col} style={{ flex: '141 0 141px' }}><Bone w={40} h={12} /></span>
            <span className={styles.col} style={{ flex: '285 0 285px' }}><Bone w={64} h={12} /></span>
            <span className={styles.col} style={{ flex: '118 0 118px' }}><Bone w={64} h={12} /></span>
            <span className={styles.col} style={{ flex: '142 0 142px' }}><Bone w={88} h={12} /></span>
            <span className={styles.col} style={{ flex: '396 0 396px' }}><Bone w={72} h={12} /></span>
            <span className={styles.col} style={{ flex: '234 0 234px' }}><Bone w={56} h={12} /></span>
          </div>
          {FILE_W.map((w, i) => (
            <div key={i} className={`${styles.row} ${styles.rowShort}`}>
              <span className={styles.col} style={{ flex: '141 0 141px' }}><Bone w={80} h={14} /></span>
              <span className={styles.col} style={{ flex: '285 0 285px' }}><Bone w={w} h={14} /></span>
              <span className={styles.col} style={{ flex: '118 0 118px' }}><Bone w={24} h={14} /></span>
              <span className={styles.col} style={{ flex: '142 0 142px' }}><Bone w={24} h={14} /></span>
              <span className={styles.col} style={{ flex: '396 0 396px' }}><Bone w={ERR_W[i] ?? 72} h={14} /></span>
              <span className={styles.col} style={{ flex: '234 0 234px' }}><Bone w={i % 2 ? 160 : 12} h={14} /></span>
            </div>
          ))}
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}

/** Settings (Account setup): header · section rail · one setting card with two option rows. */
export function SettingsSkeleton() {
  return (
    <GhostSheet label="Loading settings">
      <div className={styles.header}>
        <Bone w={96} h={28} />
      </div>
      <div className={styles.settingsRow}>
        <div className={styles.settingsNav}>
          {[64, 72, 68, 80, 74].map((w, i) => (
            <span key={i} className={styles.settingsNavItem}><Bone w={20} h={20} r={4} /><Bone w={w} h={14} /></span>
          ))}
        </div>
        <div className={styles.settingsPanel}>
          <div className={styles.settingsHead}><Bone w={64} h={20} /><Bone w={420} h={14} /></div>
          <div className={styles.settingsCard}>
            <div className={styles.settingsHead}><Bone w={128} h={16} /><Bone w={360} h={12} /></div>
            <Bone w="100%" h={72} r="var(--om-radius-1)" />
            <Bone w="100%" h={72} r="var(--om-radius-1)" />
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
