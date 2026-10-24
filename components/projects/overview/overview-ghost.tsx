'use client'

import { Bone } from '@/components/shell/skeleton'
import { RecentActivityGhost } from '@/components/shell/detail-skeleton'   // (Activity by date, 2026-10-24) the card's glyphs
import { Line, Words, deskOnly } from '@/components/shell/ghost-kit'
import { AiBriefGhost } from '@/components/leads/detail/ai-brief'
import card from '@/components/leads/detail/card.module.css'
import overview from '../project-overview.module.css'
import { DocumentsGhost } from './documents-card'   // (Contracts on the move, C4 — P-11 · C-23)

/** One Overview card's ghost: its head in its own words, then `rows` of the LEAD STAGES row (`two`: the Needs you row's two lines). */
export function CardGhost({ title, rows, two, fold = 0, phone }: { title: string; rows: number; two?: boolean; /** (simplify round 3) the first rows fold on a phone (Progress's stage rows), a rule under them */ fold?: number
  /** (pending modules S22) the rows a phone draws — a card that shows fewer there before its "Show n more" (the Dashboard's Needs you, four) */
  phone?: number }) {
  const row = (i: number) => (
            <div key={i} className={phone !== undefined && i >= phone ? `${overview.row} ${deskOnly}` : overview.row} data-static="" data-two={two || undefined}>
              <Bone w={20} h={20} r="50%" />
              <span className={overview.label}>
                {two
                  ? <span className={overview.two}><Line w={[168, 136, 184, 120, 152][i % 5]!} lh={20} h={12} /><Line w={[212, 176, 196, 160, 188][i % 5]!} lh={16} h={10} /></span>
                  : <><Line w={[112, 96, 128, 88, 104][i % 5]!} lh={20} h={12} /><Line w={56} lh={16} h={10} /></>}
              </span>
              {two ? <Line w={56} lh={20} h={12} /> : null}
            </div>
  )
  const all = Array.from({ length: rows }, (_, i) => i)
  return (
    <section className={card.card}>
      <div className={card.head}><div className={card.headText}><Words className={card.title}>{title}</Words></div></div>
      <div className={overview.body}>
        {fold > 0 ? <><div className={overview.fold} data-phone-fold=""><div className={overview.group}>{all.slice(0, fold).map(row)}</div></div><div className={card.rule} /></> : null}
        <div className={overview.group}>{all.slice(fold).map(row)}</div>
      </div>
    </section>
  )
}

/** What the Overview draws, for its ghost (REG-708 · fix-A A-22): set up or running, a schedule, money, a closing summary. */
export type OverviewGhostShape = { setup: boolean; schedule: boolean; money: boolean; closing?: boolean; briefMore?: boolean
  /** (Contracts on the move, C4 — P-11 · C-23) the Documents card (≤1024 only) — drawn unless the project has no document at all */ documents?: boolean }

/**
 * (simplify S-01 · REG-708) The Overview body's ghost, drawn from its own layout: the brief (one card — no Show more), then the two columns,
 * act (Needs you — or Before work starts while set up — · My tasks · With {client} · Coming up) and glance (Progress · Money, or the closing
 * summary · Recent activity), each card on its own classes and in its own words; on a phone the cards take the page's order
 * (project-overview.module.css). The page's loader and its reveal draw this same ghost (components/projects/project-ghost.tsx).
 */
export function OverviewGhost({ shape: s }: { shape: OverviewGhostShape }) {
  return (
    <>
      <AiBriefGhost more={false} />
      <div className={overview.grid}>
        <div className={`${overview.column} ${overview.act}`}>
          <span data-card="needs"><CardGhost title={s.setup ? 'Before work starts' : 'Needs you'} rows={s.setup ? 3 : 4} two /></span>
          <span data-card="my-work"><CardGhost title="MY TASKS" rows={3} /></span>
          <span data-card="with-client"><CardGhost title="With the client" rows={s.setup ? 1 : 3} two /></span>
          {s.schedule && !s.setup && !s.closing ? <span data-card="coming-up"><CardGhost title="Coming up" rows={3} /></span> : null}
        </div>
        <div className={`${overview.column} ${overview.glance}`}>
          <span data-card="progress"><CardGhost title="Progress" rows={s.setup ? 3 : 6} fold={s.setup ? 0 : 3} /></span>
          {s.documents !== false ? <DocumentsGhost /> : null}
          {s.closing ? <span data-card="closing-summary"><CardGhost title="Closing summary" rows={5} /></span>
            : s.money ? <span data-card="money"><CardGhost title="Money" rows={4} /></span> : null}
          <span data-card="recent-activity" className={overview.activityFold} data-folded=""><RecentActivityGhost rows={3} /></span>
        </div>
      </div>
    </>
  )
}
