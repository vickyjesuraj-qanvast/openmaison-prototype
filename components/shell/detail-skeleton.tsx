'use client'

import { Bone, GhostSheet } from './skeleton'
import { GhostTable, GhostTabs, GhostToolbar, Line, Slot, Words, cycle } from './ghost-kit'
import { leadTabs } from '@/lib/leads/stage-policy'
import { tabGhost } from '@/components/leads/detail/tab-ghosts'
import { TabGhostFor, useLeadShape, type LeadGhostShape } from '@/components/leads/detail/tab-ghost-for'
import { AiBriefGhost } from '@/components/leads/detail/ai-brief'
import { quickLinkCount } from '@/components/leads/detail/quick-links'   // (S44O — C6)
import { useViewerShape } from '@/lib/ghost-shape'
import { MARKETING, opensPath } from '@/lib/settings/roles'
import styles from './detail-skeleton.module.css'
import hdr from './page-header-l2.module.css'
import ov from '@/app/leads/[id]/overview.module.css'
import card from '@/components/leads/detail/card.module.css'
import ic from '@/components/leads/detail/info-column.module.css'
import mw from '@/components/leads/detail/my-work-card.module.css'
import qc from '@/components/leads/detail/quote-card.module.css'
import qn from '@/components/leads/detail/questionnaire-card.module.css'
import sc from '@/components/leads/detail/stages-card.module.css'
import fc from '@/components/leads/detail/files-card.module.css'
import ac from '@/components/leads/detail/activity-card.module.css'
import tl from '@/components/om/timeline.module.css'   // (activity by date 2026-10-24) the card's type glyph

/*
 * Ghost for Lead Details (858-24770). (REG-708 · parity P-07, the owner's pick 2026-10-08: one ghost family) The page's own layout drawn on the
 * ghost kit (components/shell/ghost-kit.tsx), each piece on the live piece's own classes so the reveal lands every word where its bone was, at
 * every width: the L2 header (page-header-l2.module.css — the crumb, the name, the chips, Stage ▾ · the locked Convert · the primary, ⋮ on the
 * title's line on a phone), the tab strip, then the Overview's info column (info-column.module.css), the brief and the cards in their own words
 * (each card's stylesheet) — or, `wide`, the tab's OWN body (components/leads/detail/tab-ghosts.tsx) — and the Create strip.
 * It replaced solid grey blocks for the brief and every card (A-12). A Won lead on its project draws the short strip, its two header actions and
 * the Overview without MY TASKS · FILES · QUESTIONNAIRE (P-04). `tab` is the tab's slug; `[tab]/loading.tsx` reads it from the address
 * (detail-tab-skeleton.tsx). `tabs` and `shape` come from the page's reveal; a loader draws what this browser saw last on the lead.
 */
export function DetailSkeleton({ wide = false, tab, tabs, shape }: { wide?: boolean; tab?: string; tabs?: readonly string[]; shape?: LeadGhostShape }) {
  const s = useLeadShape(shape)
  /* (S44O — call C6) Marketing's lead page: the strip without Quotes · Contracts · Meetings, no QUOTES card, the Create strip's three */
  const desk = useViewerShape('role.marketing')
  const strip = leadTabs(s.onProject).filter((t) => !desk || opensPath(MARKETING, t.slug ? `/leads/_/${t.slug}` : '/leads/_'))
  /* (UX audit build) a list tab draws its remembered shape — its first run (the empty card) or its list */
  const body = wide ? (tabGhost(tab) ? <TabGhostFor tab={tab} /> : null) : null
  return (
    <GhostSheet label="Loading lead">
      <LeadHeadGhost shape={s} />
      {/* (REG-708) one bone per tab the strip shows (DETAIL_TABS — Meetings is hidden, REG-552), as wide as its label reads; (one-home N-10)
          three once the lead's other tabs live on its project */}
      {/* (S43E, F3-03 W3-04) the open tab’s place, so the strip never jumps sideways at the hand-over (S42 A-10’s rule, here too) */}
      <GhostTabs labels={tabs ?? strip.map((t) => t.label)} active={Math.max(0, strip.findIndex((t) => t.slug === (tab === 'overview' ? '' : tab ?? '')))} />
      <div className={ov.row} aria-hidden>
        {wide ? null : <InfoColumnGhost />}
        <div className={ov.centre} data-tab={tab || 'overview'}>
          {body ?? (wide ? (
            <>
              <GhostToolbar start={132} end={[110, 'icon', 'icon']} />
              <GhostTable rows={6} head={48} row={56} cols={[
                { basis: 240, grow: 1, head: 36, cell: (r) => cycle([168, 132, 190, 150, 176, 140], r) },
                { basis: 140, head: 48, cell: { slot: 'chip', w: 64 } },
                { basis: 160, head: 64, cell: 88 },
                { basis: 160, head: 56, cell: 72 },
                { basis: 120, head: 40, cell: { slot: 'avatar' } },
              ]} />
            </>
          ) : <OverviewGhost onProject={s.onProject} quotes={!desk} />)}
        </div>
        <QuickLinksGhost count={quickLinkCount(desk ? 'desk' : 'lead')} />
      </div>
    </GhostSheet>
  )
}

/** The L2 header on its own classes: back · the crumb over the name and its four chips · Stage ▾, the locked Convert (≥1025, while Won is out of
    reach) and the one filled primary · ⋮ — on a phone the name and ⋮ share the first line and the pill and the primary fill the second (REG-359). */
function LeadHeadGhost({ shape }: { shape: LeadGhostShape }) {
  return (
    <div className={`${hdr.header} ${styles.head}`}>
      <span className={hdr.back}><Bone w={24} h={24} r={4} /></span>
      <div className={hdr.titleBlock}>
        <span className={hdr.crumb}><Line w={44} lh={16} h={10} /></span>
        <div className={hdr.titleRow}>
          <span className={hdr.title}><Line w={148} lh={24} h={20} /></span>
          <span className={hdr.chips}>{[80, 71, 94, 80].map((w, i) => <Slot key={i} kind="chip" w={w} />)}</span>
        </div>
      </div>
      <div className={hdr.actions}>
        <span className={`${ov.anchor} ${ov.stageAction}`}><Slot kind="btn" w={134} /></span>
        {/* (UX audit 2026-09-30, L6) Convert to Project outlined with its lock — up to 1024 the row is the pill and the primary (overview.module.css) */}
        {shape.locked && !shape.onProject ? <span className={`${ov.anchor} ${ov.convertLocked}`}><Slot kind="btn" w={178} /></span> : null}
        {/* the one filled primary — "Move to Met" … Convert to Project, or a Won lead's Open project; it fills the phone's second line */}
        {shape.noPrimary ? null : <span className={`${ov.anchor} ${ov.convertAction}`}><Slot kind="btn" w={shape.onProject ? 124 : 140} fill /></span>}   {/* (S44O — C6) Marketing's lead past Met has none */}
      </div>
      <div className={hdr.titleActions}><Slot kind="icon" /></div>
    </div>
  )
}

/** One KV row of the info column: the key's words as a line in its 120 track, the value beside it. */
const KV = ({ k, v }: { k: number; v: number | string }) => (
  <>
    <span className={ic.key}><Line w={k} lh={20} h={12} /></span>
    <span className={ic.value}><Line w={v} lh={20} h={12} /></span>
  </>
)
/** A section of the info column: its glyph, its title, its chevron, then its rows. Titles are lines, not words: the column's sections are named
    by the record that carries it (a lead's, a project's — P-01). */
function SectionGhost({ title, rows }: { title: number; rows: [number, number | string][] }) {
  return (
    <div className={ic.section}>
      <div className={ic.sectionHead}>
        <Bone w={20} h={20} r={4} />
        <span className={ic.sectionTitle}><Line w={title} lh={20} h={12} /></span>
        <Bone w={20} h={20} r={4} />
      </div>
      <div className={ic.kv}>{rows.map(([k, v], i) => <KV key={i} k={k} v={v} />)}</div>
    </div>
  )
}

/**
 * (parity P-07) The info column on its own classes (info-column.module.css): the identity block — the name with the pencil and the fold, the
 * phone with Copy and WhatsApp, the email with Copy, the address with Directions — then the sections, rules between; on a phone the identity
 * block and View Client Info (REG-366). `sections` = each section's title width and rows (key and value widths); the lead's by default.
 */
export function InfoColumnGhost({ sections = LEAD_SECTIONS }: { sections?: { title: number; rows: [number, number | string][] }[] }) {
  return (
    <div className={ic.column} aria-hidden>
      <div className={ic.identity}>
        <div className={ic.nameRow}>
          <span className={ic.name}><Line w={200} lh={32} h={24} /></span>
          <span className={ic.nameActions}><Bone w={20} h={20} r={4} /><Bone w={20} h={20} r={4} /></span>
        </div>
        <div className={ic.contact}>
          <div className={ic.contactRow}><Line w={92} lh={20} h={12} /><Bone w={16} h={16} r={4} /><Bone w={16} h={16} r={4} /></div>
          <div className={ic.contactRow}><Line w={176} lh={20} h={12} /><Bone w={16} h={16} r={4} /></div>
          <div className={ic.contactRow}><Line w={220} lh={20} h={12} /><Bone w={20} h={20} r={4} /></div>
        </div>
      </div>
      {/* (REG-366) ≤767 the column is the identity block and View Client Info across — the sections are desk-only */}
      <span className={styles.infoPhone}><Slot kind="btn" w="100%" /></span>
      <span className={styles.infoRest}>
        {sections.map((sec, i) => (
          <span key={i} style={{ display: 'contents' }}>
            <div className={ic.rule} />
            <SectionGhost title={sec.title} rows={sec.rows} />
          </span>
        ))}
      </span>
    </div>
  )
}
/** The lead's sections — Collaborators (Owner · Members), Lead info, Property info, Other info — at their own row counts. */
const LEAD_SECTIONS: { title: number; rows: [number, number | string][] }[] = [
  { title: 96, rows: [[44, 60], [64, 112]] },
  { title: 64, rows: [[40, 64], [48, 72], [76, 64], [52, 80], [72, 88], [80, 56], [44, 92]] },
  { title: 92, rows: [[36, 96], [52, 64], [64, 72], [36, 80], [104, 48], [92, 72], [108, '80%']] },
  { title: 72, rows: [[56, '70%']] },
]

/** (parity P-07) The Create strip at its collapsed geometry (quick-links.module.css): the toggle, the 24×1 rule, eight glyphs 24 apart. */
export function QuickLinksGhost({ count = 8 }: { count?: number }) {
  return (
    <div className={styles.tools} aria-hidden>
      <Bone w={24} h={24} r={4} />
      <span className={styles.toolsRule} />
      <span className={styles.toolsGlyphs}>{Array.from({ length: count }, (_, i) => <Bone key={i} w={24} h={24} r={4} />)}</span>
    </div>
  )
}

/** An Overview card's head on the card's own classes: the title in its own words, a meta line, a head link, the ↗. */
/** The RECENT ACTIVITY card's ghost (858:24970): (activity by date 2026-10-24) each row led by its type glyph, as the card draws it — the
    date, the event. `rows`: the lead's four; a project's Overview shows three. */
export function RecentActivityGhost({ rows = 4 }: { rows?: number }) {
  return (
    <section className={card.card}>
      <CardHead title="Recent activity" />
      <div className={ac.body}>
        {[164, 120, 184, 140].slice(0, rows).map((w, i) => (
          <div key={i} className={ac.row}><span className={`${tl.glyph} ${ac.glyph}`}><Bone w={24} h={24} r="var(--om-radius-full)" /></span><span className={ac.main}><span className={ac.date}><Line w={96} lh={20} h={12} /></span><span className={ac.text}><Line w={w} lh={20} h={12} /></span></span></div>
        ))}
      </div>
    </section>
  )
}

function CardHead({ title, meta, metaRight, link }: { title: string; meta?: number; metaRight?: number; link?: number }) {
  return (
    <div className={card.head} style={{ gap: 8 }}>
      <div className={card.headText}>
        <Words className={card.title}>{title}</Words>
        {meta ? <span className={card.meta}><Line w={meta} lh={16} h={10} /></span> : null}
        {metaRight ? <span className={card.metaRight}><Line w={metaRight} lh={16} h={10} /></span> : null}
      </div>
      {link ? <Line w={link} lh={16} h={10} /> : null}
      <Bone w={16} h={16} r={4} />
    </div>
  )
}

/** A LEAD STAGES row: its glyph, its name, its meta, the chevron. */
const StageRow = ({ name, meta }: { name: number; meta: number }) => (
  <span className={sc.row} data-static="">
    <Bone w={20} h={20} r="50%" />
    <span className={sc.label}><span className={sc.nameGroup}><Line w={name} lh={20} h={12} /></span><span className={sc.meta}><Line w={meta} lh={16} h={10} /></span></span>
    <Bone w={20} h={20} r={4} />
  </span>
)

/** The Overview: the brief, then the two stacks of cards — each on its own stylesheet, its title in its own words (P-07); a lead on its project
    keeps QUOTES · LEAD STAGES · RECENT ACTIVITY (P-04). ≤1024 one column; on a phone the stacks dissolve into the canvas' card order
    (overview.module.css, REG-377), as the page's do. */
function OverviewGhost({ onProject, quotes = true }: { onProject: boolean; /** (S44O — C6) the QUOTES card — never Marketing's */ quotes?: boolean }) {
  return (
    <>
      <AiBriefGhost />
      <div className={ov.grid}>
        <div className={ov.column}>
          {onProject ? null : (
            <div data-card="my-work">
              <section className={card.card}>
                <CardHead title="MY TASKS" meta={78} />
                <div className={mw.groupLabel} data-tone="red"><Line w={72} lh={20} h={12} /></div>
                <div className={mw.list}>
                  {[176, 132, 204].map((w, i) => (
                    <div key={i} className={mw.row}>
                      <Bone w={20} h={20} r="50%" />
                      <span className={mw.text}><Line w={w} lh={20} h={12} /><Line w={cycle([96, 120, 84], i)} lh={16} h={10} /></span>
                      <Bone w={20} h={20} r={4} />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
          {quotes ? <div data-card="quotes">
            <section className={card.card}>
              <CardHead title="QUOTES" />
              <div className={qc.body}>
                <div className={qc.group}>
                  <div className={qc.amountRow}>
                    <span className={qc.amountText}><Line w={120} lh={32} h={22} /><Line w={132} lh={20} h={12} /></span>
                    <Slot kind="chip" w={92} />
                  </div>
                  <div className={qc.track} />
                  <div className={qc.labels}>{[28, 60, 52, 64, 36].map((w, i) => <Line key={i} w={w} lh={16} h={10} />)}</div>
                </div>
              </div>
            </section>
          </div> : null}
          {onProject ? null : (
            <div data-card="questionnaire">
              <section className={card.card}>
                <CardHead title="QUESTIONNAIRE" link={64} />
                <div className={qn.body}>
                  <div className={qn.group}>
                    <div className={qn.row}><span className={qn.label}><Line w={172} lh={20} h={12} /></span><Line w={36} lh={20} h={12} /></div>
                    <div className={qn.track} />
                    <div className={qn.legend}><Line w={104} lh={16} h={10} /><Line w={108} lh={16} h={10} /></div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
        <div className={ov.column}>
          <div data-card="lead-stages">
            <section className={card.card}>
              <CardHead title="Lead stages" metaRight={112} />
              <div className={sc.body}>
                <div className={sc.group}>{[36, 72, 32, 76, 36].map((w, i) => <StageRow key={i} name={w} meta={48} />)}</div>
                <div className={card.rule} />
                <div className={sc.group}>{[84, 104, 100].map((w, i) => <StageRow key={i} name={w} meta={64} />)}</div>
              </div>
            </section>
          </div>
          {onProject ? null : (
            <div data-card="files">
              <section className={card.card}>
                <CardHead title="Files" meta={20} />
                <div className={fc.body}>
                  <div className={fc.tiles}>
                    {[0, 1, 2, 3].map((i) => <span key={i} className={fc.tile}><span className={fc.thumbBox} /><span className={fc.caption}><Line w="72%" lh={12} h={8} /></span></span>)}
                  </div>
                </div>
              </section>
            </div>
          )}
          <div data-card="recent-activity"><RecentActivityGhost /></div>
        </div>
      </div>
    </>
  )
}
