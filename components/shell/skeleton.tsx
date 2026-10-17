'use client'

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './skeleton.module.css'
import emptyCard from '@/components/om/empty-card.module.css'

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

/**
 * (wave E, gallery-5) `l1` marks a level-1 page's ghost as the page's header does (`data-om-l1-header`, REG-362): the ≤767 top bar and the
 * bottom dock read that marker, so a soft navigation's `loading.tsx` kept neither for ~300ms and the page then dropped 60px when it came.
 * A level-2 ghost (a lead, an editor, Insights) leaves it off — those pages have neither.
 */
export function GhostSheet({ children, label = 'Loading', l1 = false }: { children: ReactNode; label?: string; l1?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    // Before paint, so the loading.tsx → page swap keeps the sweep in phase.
    if (ghostClock.shownAt === null) ghostClock.shownAt = performance.now()
    ref.current?.style.setProperty('--sweep-delay', `-${Math.round(performance.now() % SWEEP_MS)}ms`)
  }, [])
  return (
    <div ref={ref} className={`${pageStyles.body} ${styles.sheet}`} role="status" aria-label={label} aria-busy data-om-l1-header={l1 || undefined}>
      {children}
    </div>
  )
}

export function Bone({ w, h = 16, r, className, style }: { w: number | string; h?: number; r?: number | string; className?: string; style?: CSSProperties }) {
  return <span className={className ? `${styles.bone} ${className}` : styles.bone} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden />
}

/* Deterministic "text" widths so rows read as real data, not a grid. Eight of each — the mock's rows; longer
   sheets cycle through them (SHEET_ROWS below). */
const NAME_W = [128, 96, 148, 112, 136, 104, 120, 156]
const STAGE_W = [32, 32, 32, 32, 70, 70, 70, 34]
const TASK_W = [180, 140, 210, 160, 190, 120, 170, 200]
const SRC_W = [72, 56, 84, 64, 76, 60, 80, 68]
const TYPE_W = [92, 70, 104, 84, 96, 74, 100, 88]
const FILE_W = [168, 132, 190, 150, 176, 140]
const ERR_W = [72, 210, 72, 168, 72, 240]

/*
 * (REG-708) The sheet's rows and cards are fixed counts — enough to run past the fold on any screen, as the real listing does (36 leads in the
 * base state). They used to be counted from the viewport through a store whose server snapshot was the mock's eight: a load streamed eight
 * rows and hydration grew them to twelve — the ghost changed shape under the eye. The notes below are the geometry that count was built on.
 *
 * How many table rows the sheet has room for. The mock draws eight because eight is what fits its frame — the real
 * listing renders every lead (36 in the base state), so the bones should reach the fold at any viewport height.
 * The first row starts TABLE_TOP down and the table ends --fab-clearance above the bottom, so at the demo's 1024
 * that is 12 rows of 64 — the last one running under the fold exactly as the real table does. Read through a store,
 * not a lazy initialiser: `loading.tsx` is server-rendered, and the server snapshot (the mock's eight) keeps
 * hydration honest (quick-links.tsx does the same).
 *
 * TABLE_TOP is the desktop stack — 8 page pad + 68 header + 24 content pad + 36 toolbar + 24 gap + 1 border + 56 head —
 * and it serves 768–1024 too (nothing wraps there, and the rail stays collapsed). ≤767 the table block is hidden
 * (REG-309: the ghost is the mock's cards there, CARDS_TOP below), so the table count is never seen at that width.
 *
 * The cards (REG-309, 1082:23305): the first card starts CARDS_TOP down — the 60px bar (--app-mobile-bar-height,
 * safe-area inset aside) + a 60 header (12 + 36 + 12: the title and the three 36 squares share one row,
 * page-header.module.css) + 16 content pad + 36 toolbar + 16 gap = 188 — and each card is CARD_H = 199 (16 + 24 head +
 * 12 + 20 info + 12 + 38 task box + 12 + 1 rule + 12 + 36 foot + 16, lead-cards.module.css) with 16 between; the page's
 * bottom clearance is 150 there (globals.css). At 390×844 that is three cards, so MIN_CARDS = 4 keeps the last one
 * running under the fold as the real column does; the server snapshot draws that floor.
 */
/** 20 rows of 64 from TABLE_TOP (217) run past a 1440-tall screen; 6 cards of 199 + 16 from CARDS_TOP (188) past a tall phone. */
const SHEET_ROWS = 20
const SHEET_CARDS = 6

/**
 * Leads listing (779:19690 table variant): header · toolbar · table with the default columns — and, ≤767, the mock's
 * cards (1082:23305, REG-309). Both blocks ship and skeleton.module.css picks one by breakpoint: `loading.tsx` is
 * server-rendered, so no JS can know the width when the bones first paint, and a ghost that fades into a
 * differently-shaped page is the REG-74 failure. ≥768 nothing here differs from the table-only ghost.
 */
/** (UX audit build · REG-729's empty card) A list's empty card as a ghost, on the card's own classes: the art, the title, the line, the buttons
    — what the lead tabs, Tools › Quotes · Contracts, the Tasks page and the listing open on while they hold nothing (REG-737). */
export function EmptyCardGhost({ art = [180, 137], buttons = [132, 150], lines = 1 }: { art?: [number, number]; buttons?: number[]; lines?: number }) {
  return (
    <div className={emptyCard.card} aria-hidden>
      <div className={emptyCard.inner}>
        <Bone w={art[0]} h={art[1]} r={8} />
        <div className={emptyCard.texts}><Bone w={200} h={20} />{Array.from({ length: lines }, (_, i) => <Bone key={i} w={i ? 220 : 320} h={12} style={{ maxWidth: '80vw' }} />)}</div>
        <div className={emptyCard.buttons}>{buttons.map((w, i) => <Bone key={i} w={w} h={36} r="var(--om-radius-1)" />)}</div>
      </div>
    </div>
  )
}

/** (UX audit build · REG-737) The listing with no lead yet: Insights and ⋮ in the header (Add Lead steps back), "All Leads" alone in the
    toolbar, and the empty card with Import from File · Create New Lead. */
function LeadsFirstSkeleton({ label }: { label: string }) {
  return (
    <GhostSheet label={label} l1>
      <div className={`${styles.header} ${styles.headerPlate}`}>
        <Bone w={72} h={28} />
        <div className={`${styles.headerActions} ${styles.notMobile}`}><Bone w={126} h={36} r="var(--om-radius-1)" /><Bone w={36} h={36} r="var(--om-radius-1)" /></div>
        <div className={`${styles.headerActions} ${styles.mobileOnly}`}><Bone w={36} h={36} r="var(--om-radius-1)" /><Bone w={36} h={36} r="var(--om-radius-1)" /></div>
      </div>
      <div className={pageStyles.content}>
        <div className={styles.toolbar}><Bone w={96} h={20} /></div>
        <EmptyCardGhost buttons={[150, 170]} />
      </div>
    </GhostSheet>
  )
}

export function LeadsSkeleton({ label = 'Loading leads', l1 = true, first = false }: { label?: string; /** (wave E, gallery-5) the listing, Tasks, Tools › Quotes and Contracts are level-1; Insights (level 2) passes false */ l1?: boolean
  /** (UX audit build) the listing's first run — no lead yet */
  first?: boolean } = {}) {
  if (first) return <LeadsFirstSkeleton label={label} />   /* (sweep S2 #22) Tools › Quotes and Contracts draw this list too — the ghost names what is loading */
  const rows = SHEET_ROWS
  const cards = SHEET_CARDS
  return (
    <GhostSheet label={label} l1={l1}>
      <div className={`${styles.header} ${styles.headerPlate}`}>
        <Bone w={72} h={28} />
        {/* ≥768 the mock's Add Lead · Insights · kebab; ≤767 the three 36 squares of 1082:25131 (workspace.tsx). */}
        <div className={`${styles.headerActions} ${styles.notMobile}`}>
          <Bone w={116} h={36} r="var(--om-radius-1)" />
          <Bone w={126} h={36} r="var(--om-radius-1)" />
          <Bone w={36} h={36} r="var(--om-radius-1)" />
        </div>
        <div className={`${styles.headerActions} ${styles.mobileOnly}`}>
          <Bone w={36} h={36} r="var(--om-radius-1)" />
          <Bone w={36} h={36} r="var(--om-radius-1)" />
          <Bone w={36} h={36} r="var(--om-radius-1)" />
        </div>
      </div>
      <div className={`${pageStyles.content} ${styles.cardsCanvas}`}>
        {/* (parity P-26, B-17) the page's row: the pill · the 280 search · Filters · Column settings (`tune`, it was missing — the search bone
            sat 48 right of the field) · the view toggle */}
        <div className={`${styles.toolbar} ${styles.notMobile}`}>
          <Bone w={132} h={36} r="var(--om-radius-1)" />
          <div className={styles.toolbarRight}>
            <Bone w={280} h={36} r="var(--om-radius-1)" />
            <Bone w={36} h={36} r="var(--om-radius-1)" />
            <Bone w={36} h={36} r="var(--om-radius-1)" />
            <Bone w={72} h={36} r="var(--om-radius-1)" />
          </div>
        </div>
        {/* ≤767 the toolbar is the pill, the search glyph and the filter glyph (1082:25269, toolbar.module.css — (parity P-19) the house
            ToolbarSearch's glyph before Filters). */}
        <div className={`${styles.toolbar} ${styles.mobileOnly}`}>
          <Bone w={132} h={36} r="var(--om-radius-1)" />
          <Bone w={36} h={36} r="var(--om-radius-1)" />
          <Bone w={36} h={36} r="var(--om-radius-1)" />
        </div>
        <div className={`${styles.tableWrap} ${styles.notMobile}`}>
          {/* data-min carries the desktop track width (a media query cannot reach an inline style); ≤1024 the
              tracks hold and the wrap scrolls, exactly as the real table does (REG-269). */}
          <div className={styles.tableInner} data-min="1410">
          <div className={styles.headRow}>
            {/* Lead Name is the listing's frozen column (table.module.css .pin) — the ghost freezes it too ≤1024. (parity P-26, B-17) It holds
                the select-all box 16 in and the label at 52, as the page's head does (REG-610 · REG-614). */}
            <span className={`${styles.col} ${styles.pinCol} ${styles.selCol}`} style={{ flex: '240 0 240px' }}><Bone w={18} h={18} className={styles.selSlot} /><Bone w={72} h={12} /></span>
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
              <span className={`${styles.col} ${styles.nameCol} ${styles.pinCol} ${styles.selCol}`} style={{ flex: '240 0 240px' }}>
                <Bone w={18} h={18} className={styles.selSlot} />   {/* (parity P-26) each row's box; the name lands at 52 */}
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
        {/* ≤767 the listing is the mock's cards (1082:23305 → "Card / Desktop / Leads" 1082:25585, lead-cards.tsx): p16
            gap12 r8 level-1 on the surface/bg canvas — head (name · age), the info line, the task box, a rule, then members
            (avatar + the 24px person_add) and the stage button. The rows hold the real rows' heights (24 · 20 · 38 · 1 · 36)
            so each card is the real 199 and the crossfade lands card over card. Names cycle the table's eight widths. */}
        <div className={`${styles.cards} ${styles.mobileOnly}`}>
          {Array.from({ length: cards }, (_, i) => (
            <div key={i} className={styles.card}>
              <div className={styles.cardHead}><Bone w={NAME_W[i % NAME_W.length] ?? 128} h={16} /><Bone w={40} h={12} /></div>
              <div className={styles.cardInfo}><Bone w={264} h={14} /></div>   {/* (UX audit L3) the line ends on "· 5d in Met" now */}
              <Bone w="100%" h={38} r="var(--om-radius-1)" />
              <Bone w="100%" h={1} r={0} />
              <div className={styles.cardFoot}>
                <span className={styles.cardMembers}><Bone w={24} h={24} r="50%" /><Bone w={24} h={24} r="var(--om-radius-1)" /></span>
                <Bone w={90} h={36} r="var(--om-radius-1)" />
              </div>
            </div>
          ))}
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
    <GhostSheet label="Loading Qanvast leads" l1>
      <div className={styles.header}>
        <Bone w={120} h={28} />
        <div className={styles.headerActions}>
          <Bone w={110} h={36} r="var(--om-radius-1)" />
          <Bone w={121} h={36} r="var(--om-radius-1)" />
          <Bone w={36} h={36} r="var(--om-radius-1)" />
        </div>
      </div>
      <div className={styles.tabs}>
        {[41, 56, 82, 54, 65].map((w, i) => <Bone key={i} w={w} h={20} />)}   {/* (one-home N-05) "Lead credits" · (parity map, CP-148) Studios after Leads */}
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
            <Bone w={280} h={36} r="var(--om-radius-1)" className={styles.searchGrow} />
            {/* (pending modules S05) no Filters button — the page has none */}
          </div>
        </div>
        <div className={styles.tableWrap}>
          <div className={styles.tableInner} data-min="1316">
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

