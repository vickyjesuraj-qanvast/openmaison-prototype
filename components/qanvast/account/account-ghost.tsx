'use client'

import { usePathname } from 'next/navigation'
import pageStyles from '@/app/leads/leads.module.css'
import plan from '@/components/company/plan/plan.module.css'
import tile from '@/components/om/stat-tile.module.css'
import chart from '@/components/market-insights/chart.module.css'
import { StatTiles } from '@/components/om/stat-tile'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { GhostChips, GhostHead, GhostTable, GhostTabs, Line, Para, Slot, Words, cycle, type Col, type PhoneRows } from '@/components/shell/ghost-kit'
import { QANVAST_TAB_ITEMS } from '@/components/qanvast/qanvast-tabs'
import empty from '@/components/om/empty-state.module.css'
import { useSeedFlag, useViewerShape } from '@/lib/ghost-shape'
import { GATE_WORDS } from '@/lib/qanvast-account/policy'
import { CREDIT_VIEWS, REVIEW_VIEWS, W, type CreditViewKey, type ReviewViewKey } from './words'
import styles from './account.module.css'

/**
 * (REG-708; pending modules S41b-5) Qanvast Ops › Lead credits' and Reviews' ghosts — ONE per view, drawn by the route's loading.tsx (the view
 * read from the address) and by the page's PageReveal alike: the header (Reviews' Request reviews), the tab strip, the views' chips and the
 * view's tools, then the view's own layout on its own classes, its fixed words as the page says them (./words.ts).
 */
export function CreditsGhost({ view }: { view: CreditViewKey }) {
  const owner = useViewerShape('role.owner')   // anyone else meets the tab's gate
  return (
    <GhostSheet label="Loading lead credits" l1>
      <GhostHead title={120} />
      <GhostTabs labels={QANVAST_TAB_ITEMS.map((t) => t.label)} active={QANVAST_TAB_ITEMS.findIndex((t) => t.label === 'Lead credits')} />   {/* (S43E, F3-03 W3-04) the open tab’s place, so the strip never jumps sideways at the hand-over (S42 A-10’s rule, here too) */}
      <div className={pageStyles.content}>
        {owner ? <>
        <div className={styles.bar}>
          <div className={styles.views}><GhostChips labels={CREDIT_VIEWS.map((v) => v.label)} rail /></div>
          {view === 'transactions' ? <div className={styles.tools}><Slot kind="btn" w={160} /></div> : null}
        </div>
        {view === 'overview' ? <CreditsOverviewGhost /> : view === 'transactions' ? (
          <div className={styles.statement}><TableSection title={W.statement('October 2026')} titleBar help={W.statementHelp} rows={8} phone={{ card: 132, lines: 4 }} cols={[
            { basis: 120, grow: 120, head: 32, cell: (r) => (r === 0 || r > 5 ? null : 64) },
            { basis: 320, grow: 420, head: 72, cell: (r) => (r === 0 || r > 5 ? 220 : [72, cycle([180, 210, 160], r)]) },
            { basis: 112, grow: 112, head: 40, cell: (r) => (r > 0 && r < 7 ? 32 : null) },
            { basis: 112, grow: 112, head: 40, cell: (r) => (r === 1 || r === 6 ? 40 : null) },
            { basis: 120, grow: 120, head: 52, cell: 40 },
          ]} /></div>
        ) : (
          <TableSection title={W.contracts} help={W.contractsHelp} rows={1} phone={{ card: 200, lines: 5 }} cols={[
            { basis: 128, grow: 128, head: 52, cell: 48 },
            { basis: 120, grow: 120, head: 48, cell: 64 },
            { basis: 120, grow: 120, head: 28, cell: 52 },
            { basis: 176, grow: 176, head: 48, cell: [40, 60] },
            { basis: 168, grow: 168, head: 88, cell: 90 },
            { basis: 280, grow: 280, head: 56, cell: [150, 196] },
          ]} />
        )}
        </> : <GateGhost words={GATE_WORDS.credits} />}
      </div>
    </GhostSheet>
  )
}

/** The tab's gate (AccountFrame's EmptyState) — the lock's well, its title and sentence as the page says them, its one button. */
function GateGhost({ words }: { words: { title: string; help: string } }) {
  return (
    <section className={empty.empty}>
      <span className={empty.glyph} />
      <Words as="h3" className={empty.title}>{words.title}</Words>
      <Words as="p" className={empty.help}>{words.help}</Words>
      <div className={empty.actions}><Bone w={168} h={36} r="var(--om-radius-1)" /></div>
    </section>
  )
}

/** The loader: the view from the address — /qanvast-ops/credits[/transactions|/contracts]. */
export function CreditsLoader() {
  const seg = usePathname()?.split('/')[3]
  return <CreditsGhost view={seg === 'transactions' || seg === 'contracts' ? seg : 'overview'} />
}

function TableSection({ title, titleBar, help, rows, cols, phone }: { title: string; titleBar?: boolean; help: string; rows: number; cols: Col[]; phone: PhoneRows }) {
  return (
    <section className={plan.section}>
      <div className={plan.sectionHead}>
        <div className={plan.sectionTitles}>{titleBar ? <Line w={210} lh={24} h={16} /> : <Words as="h2" className={plan.sectionTitle}>{title}</Words>}<Words className={plan.sectionHelp}>{help}</Words></div>
        <div className={plan.sectionTools}><Slot kind="icon" desk /></div>
      </div>
      <GhostTable cols={cols} rows={rows} head={56} row={64} phone={phone} />
    </section>
  )
}

/** A number tile as the page draws it: its caption and its help line in the page's own words (so they wrap where the page's wrap), the figure a bone. */
type GT = { label: string; value?: number; help?: string }
const ghostTiles = (list: GT[]) => list.map((t, i) => (
  <div key={i} className={tile.tile}>
    <Words className={tile.label}>{t.label}</Words>
    <Line w={t.value ?? 48} lh={24} h={18} />
    {t.help ? <Words className={tile.help}>{t.help}</Words> : null}
  </div>
))

function CreditsOverviewGhost() {
  const standIn = useSeedFlag('qanvast.standIn', true)   // (S42E, E-07) the footnote the page says
  return (
    <>
      <StatTiles>{ghostTiles([{ label: W.left, value: 64, help: W.topUp }, { label: W.usedIn('October'), value: 16, help: '0 leads from Qanvast this month' }, { label: W.onTheWay, value: 40, help: 'Farah Isa — Qanvast approved the return and credits it once processed' }])}</StatTiles>
      <section className={styles.section}>
        <div className={styles.sectionHead}><div className={styles.sectionTitles}><Words as="h2" className={styles.sectionTitle}>{W.byMonth}</Words><Words as="p" className={styles.sectionHelp}>{W.byMonthHelp}</Words></div></div>
        <div className={styles.charts}>
          {[W.leadsChart, W.creditsChart].map((t) => (
            <div key={t} className={chart.chart}>
              <div className={chart.head}><Words className={chart.title}>{t}</Words><Line w={170} lh={16} h={10} /></div>
              <div className={chart.cols}>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={chart.col}><div className={chart.colBars} /><span className={chart.colLabel}><Line w={24} lh={20} h={10} /></span></div>)}</div>
              <div className={chart.foot}><span /><Slot kind="btn" w={150} /></div>
            </div>
          ))}
        </div>
      </section>
      <TableSection title={W.monthByMonth} help="Newest first" rows={6} phone={{ card: 132, lines: 4 }} cols={[
        { basis: 160, grow: 160, head: 40, cell: 96 },
        { basis: 152, grow: 152, head: 100, cell: 12 },
        { basis: 160, grow: 160, head: 100, cell: 64 },
        { basis: 144, grow: 144, head: 88, cell: 36 },
        { basis: 120, grow: 120, head: 60, cell: 12 },
      ]} />
      <section className={styles.section}>
        <div className={styles.sectionHead}><div className={styles.sectionTitles}><Words as="h2" className={styles.sectionTitle}>{W.closures}</Words></div></div>
        <StatTiles>{ghostTiles([{ label: 'Contracts approved', value: 16, help: 'From 7 Qanvast leads' }, { label: 'Conversion rate', value: 32, help: 'Contracts approved of the leads received' }, { label: 'Value of contracts', value: 44, help: 'What those contracts are worth' }])}</StatTiles>
        <Words as="p" className={styles.foot}>{standIn ? W.closuresFootSimulated : W.closuresFoot}</Words>
      </section>
    </>
  )
}

/* ── Reviews ── */

export function ReviewsGhost({ view }: { view: ReviewViewKey }) {
  const owner = useViewerShape('role.runs')   // (S42E, call E·2) an Owner or an Admin reads Reviews; anyone else meets the tab's gate
  return (
    <GhostSheet label="Loading reviews" l1>
      <GhostHead title={120} actions={owner ? [163] : []} />
      <GhostTabs labels={QANVAST_TAB_ITEMS.map((t) => t.label)} active={QANVAST_TAB_ITEMS.findIndex((t) => t.label === 'Reviews')} />
      <div className={pageStyles.content}>
        {owner ? <>
        <div className={styles.bar}>
          <div className={styles.views}><GhostChips labels={REVIEW_VIEWS.map((v) => v.label)} widths={[104]} rail /></div>
        </div>
        {view === 'reviews' ? <ReviewsListGhost /> : view === 'ranking' ? <RankingGhost /> : <FeedbackGhost />}
        </> : <GateGhost words={GATE_WORDS.reviews} />}
      </div>
    </GhostSheet>
  )
}

/** The loader: the view from the address — /qanvast-ops/reviews[/ranking|/feedback]. */
export function ReviewsLoader() {
  const seg = usePathname()?.split('/')[3]
  return <ReviewsGhost view={seg === 'ranking' || seg === 'feedback' ? seg : 'reviews'} />
}

function ReviewsListGhost() {
  return (
    <div className={styles.columns}>
      <div className={styles.list}>
        <div className={styles.filters}>
          <div className={styles.filterRail}><GhostChips widths={[48, 176, 82]} rail /></div>
          <div className={styles.filterTools}><Slot kind="btn" w={120} /><Slot kind="btn" w={140} /></div>
        </div>
        {[0, 1, 2].map((i) => (
          <section key={i} className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitles}><Line w={88} lh={16} h={12} /><Line w={cycle([240, 200, 260], i)} lh={24} h={16} /></div>
                {i === 0 ? <span className={styles.press}><Slot kind="btn" w={72} /></span> : null}
              </div>
              <Para lines={i === 1 ? 3 : 2} lh={20} h={12} />
              {i === 1 ? <div className={styles.photos}>{[0, 1, 2].map((j) => <Bone key={j} w={64} h={48} r={4} />)}</div> : null}
              <Line w="72%" lh={16} h={10} />
              {i > 0 ? <div className={styles.reply}><Line w={96} lh={16} h={10} /><Line w="80%" lh={20} h={12} /></div> : null}
            </div>
          </section>
        ))}
      </div>
      <aside className={styles.side}>
        <section className={styles.overview}>
          <div className={styles.overviewHead}><Words className={styles.overviewTitle}>{W.overview}</Words></div>
          <div className={styles.overviewBody}>
            <div className={styles.figures}>
              <div className={styles.figure}><Line w={20} lh={32} h={24} /><Words className={styles.figureLabel}>Reviews</Words></div>
              <div className={styles.figure}><Line w={64} lh={32} h={24} /><Words className={styles.figureLabel}>Average rating</Words></div>
            </div>
            <div className={styles.spread}>{[0, 1, 2, 3, 4].map((i) => <Line key={i} w="100%" lh={16} h={8} />)}</div>
            <div className={styles.sideLinks}><Words className={styles.link}>{W.seeAll}</Words><Words className={styles.textButton}>{W.askHomeowners}</Words></div>
          </div>
        </section>
      </aside>
    </div>
  )
}

function SectionHead({ title, help }: { title: string; help: string }) {
  return <div className={styles.sectionHead}><div className={styles.sectionTitles}><Words as="h2" className={styles.sectionTitle}>{title}</Words><Words as="p" className={styles.sectionHelp}>{help}</Words></div></div>
}

function RankingGhost() {
  return (
    <>
      <section className={styles.rankCard}>
        <span className={styles.rankRow}><Line w={64} lh={36} h={28} /><Words className={styles.muted}>Your rank</Words></span>
        <Words className={styles.muted}>{W.rankHelp('1,186')}</Words>
        <Words className={styles.link}>{`${W.rankLink} ↗`}</Words>
      </section>
      <section className={styles.section}>
        <SectionHead title={W.factors} help={W.factorsHelp} />
        <StatTiles>{ghostTiles([{ label: 'Reviews', value: 16, help: 'Written by homeowners · in 2026: 4*^' }, { label: 'Rating', value: 44, help: 'The average of those reviews · in 2026: 5.0*^' }, { label: 'Projects', value: 16, help: 'Published on Qanvast · in 2026: 5*' }, { label: 'Board pins', value: 40, help: 'Project photos homeowners saved · in 2026: 96*' }])}</StatTiles>
        <Words as="p" className={styles.foot}>* SuperTrust 2027 will be based on these numbers. Find out more</Words>
        <Words as="p" className={styles.foot}>^ This year’s reviews are counted by when the project was finished in 2026, not when the review was written.</Words>
        <div className={styles.tips}><Words className={styles.textButton}>{W.askHomeowners}</Words><Words className={styles.foot}>Publishing more of your work helps your rank — add it on Your public profile</Words></div>
      </section>
      <section className={styles.section}><SectionHead title={W.views} help={W.viewsHelp} /><StatTiles>{ghostTiles([{ label: 'Profile views', value: 40, help: 'Up 8% on last week' }, { label: 'Project views', value: 52, help: 'Down 3% on last week' }, { label: 'Review views', value: 40, help: 'Up 12% on last week' }])}</StatTiles></section>
      <section className={styles.section}>
        <SectionHead title={W.told} help={W.toldHelp} />
        <StatTiles>{ghostTiles([{ label: 'Contact rate', value: 12, help: 'Contacted within a week' }, { label: 'Meeting rate', value: 12, help: 'Met the designer' }, { label: 'Meeting experience', value: 12, help: 'How the meeting went' }])}</StatTiles>
        <p className={styles.note}><Words className={styles.noteText}>No homeowner answered Qanvast in the last 30 days — it takes 2 answers to show anything.</Words><Words className={styles.link}>See the feedback</Words></p>
      </section>
    </>
  )
}

function FeedbackGhost() {
  return (
    <>
      <div className={styles.filters}><div className={styles.filterRail}><GhostChips labels={['30 days', '60 days', '90 days']} rail /></div></div>
      <p className={styles.note}><Words className={styles.noteText}>In the last 90 days, 3 of the 7 homeowners Qanvast sent you answered its check-in. This is what they said.</Words></p>
      <div className={styles.cards}>
        {['Contact rate', 'Meeting rate', 'Meeting experience'].map((t, i) => (
          <section key={t} className={styles.fbCard}>
            <div className={styles.fbHead}><Words as="h3" className={styles.fbTitle}>{t}</Words><Line w={150} lh={16} h={10} /></div>
            <Line w={64} lh={32} h={24} />
            <Bone w="100%" h={12} r={4} />
            <div className={styles.legend}>{Array.from({ length: i === 1 ? 2 : 3 }, (_, j) => <Line key={j} w="100%" lh={20} h={12} />)}</div>
          </section>
        ))}
      </div>
    </>
  )
}
