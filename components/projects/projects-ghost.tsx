'use client'

import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { GhostHead, GhostTable, Line, Slot, Words } from '@/components/shell/ghost-kit'
import { FirstRunCardGhost } from '@/components/company/templates/library-gallery.skeleton'
import { useFirstRunShape } from '@/lib/ghost-shape'
import { useSearchParams } from 'next/navigation'
import { useFlagPref } from '@/lib/prefs'
import { WorkloadGhost } from './workload/workload-ghost'   // (gaps build I)
import { ContractorsGhost } from './contractors/contractors-ghost'   // (S45B)
import { BY_SITE_KEY, CONTRACTORS_OF_KEY } from './contractors/keys'
import pageStyles from '@/app/leads/leads.module.css'
import sk from '@/components/shell/skeleton.module.css'
import tile from '@/components/om/stat-tile.module.css'
import { StatTiles } from '@/components/om/stat-tile'
import toolbar from './projects-toolbar.module.css'
import cardStyles from './project-cards.module.css'
import styles from './projects-workspace.module.css'

/** The tiles the listing always shows, in their own words (the fifth, the total, is the Owners' and Admins'). */
export const TILE_LABELS = ['In progress', 'Needs your attention', 'Waiting on client', 'Completing this month'] as const   // (the calm UI build 2026-10-27, T-01)

/** The phone cards' name bones — the listing ghost's widths, cycled. */
const CARD_NAME_W = [176, 152, 196, 164]

/**
 * (REG-708 · REG-929) The Projects listing's ghost — the page's own layout: the L1 header with New project, Insights and ⋮, the tiles in their
 * own words, the toolbar (the scope pill · search · Filters · Column settings · the view toggle), the table on the listing's model — or, on a
 * phone, the cards it turns into; on a first run, the bare title and the start card (REG-817). The route's `loading.tsx` and the page's
 * PageReveal draw this one.
 * (parity P-26, B-17) The phone ghost is the page's: the listing's grey canvas (the Leads ghost's `cardsCanvas`), the white tiles on it, and
 * the cards in the project card's own classes (white, level-1, the lead card's rows) instead of the kit's bordered rows; the toolbar draws the
 * search glyph, Filters and the view toggle. (parity P-21) Insights after New project for whoever runs the reports — Tickets went into ⋮;
 * (parity P-22) the selection track as the page's, so the names land at 52; (parity P-17) the Members column the lead's.
 */
export function ProjectsGhost() {
  const first = useFirstRunShape('projects')
  /* (gaps build I, I-Q1) the List · Workload toggle (and, parity P-21, Insights — the same people) for whoever saw it last here; before
     the first visit it is drawn, as for the Owners and Admins who run the studio. `?view=workload` — or (parity P-24) the view last chosen
     here, when the address names none — draws the Workload view, as the page does. */
  const [views] = useFlagPref('om.shape.projects.views', true)
  const [insights] = useFlagPref('om.shape.projects.insights', true)   // (S45B) a Designer may have the toggle (Contractors) without Insights
  const [storedWorkload] = useFlagPref('om.projects.workload', false)
  const [storedOf] = useFlagPref(CONTRACTORS_OF_KEY, false)
  const [bySite] = useFlagPref(BY_SITE_KEY, false)
  const params = useSearchParams()
  const asked = params.get('view')
  const workload = views && (asked === 'workload' || (asked !== 'list' && storedWorkload))
  /* (S45B · H-UHD-2) Contractors: the address's `?of=`, else this browser's last choice — or the only half a Designer has */
  const contractors = workload && (!insights || params.get('of') === 'contractors' || (params.get('of') !== 'members' && storedOf))
  return (
    <GhostSheet label="Loading projects" l1>
      <GhostHead title={92} actions={first ? ['icon'] : [{ fold: 128 }, 'icon']}   /* New project · ⋮ — (the calm UI build 2026-10-27, 1-30) Reports is the ⋮'s row */ />
      <div className={`${pageStyles.content} ${sk.cardsCanvas}`} aria-hidden>
        {first ? (
          <>
            <div className={toolbar.bar}><Line w={112} lh={24} h={16} /></div>
            <FirstRunCardGhost />
          </>
        ) : (
          <>
            {/* (the calm UI build 2026-10-27, 3-38 · 3-11) the page's: five boxed cards at a desk and a tablet, none on Workload; a phone's one line */}
            {workload ? null : <p className={`${styles.phoneTiles} ${sk.mobileOnly}`}><Line w={248} lh={44} h={12} /></p>}
            {workload ? null : <StatTiles className={`${styles.tiles} ${sk.notMobile}`}>   {/* (parity P-30) the house row, as the page */}
              {TILE_LABELS.map((l, i) => (
                <div key={l} className={tile.tile} data-wrap="" data-look="card">
                  <Words className={tile.label}>{l}</Words>
                  <Line w={[18, 14, 14, 10][i]!} lh={36} h={24} />
                </div>
              ))}
              {/* the Owners' and Admins' fifth: the open projects' contract value, with its line */}
              <div className={styles.valueTile}><div className={tile.tile} data-look="card"><Words className={tile.label}>Contract value</Words><Line w={96} lh={36} h={24} /><Words className={tile.help}>Open projects</Words></div></div>
            </StatTiles>}
            <div className={toolbar.bar}>
              <span className={toolbar.left}><Slot kind="pill" w={176} /></span>
              <span className={toolbar.right}>{/* (parity Q-08) the 280 box from 768 up — 44 on a touch pointer, as the page's — the glyph on a phone */}<Slot kind="fieldS" w={280} className={sk.notMobile} /><Slot kind="icon" className={sk.mobileOnly} /><Slot kind="icon" />{workload ? null : <Slot kind="icon" desk />}{views ? <Slot kind="btn" w={82} /> : null}</span>
            </div>
            {contractors ? <ContractorsGhost chips={insights} bySite={bySite} /> : workload ? <><Slot kind="btn" w={204} /><WorkloadGhost /></> : (
              <>
                <GhostTable head={56} row={64} rows={6} className={sk.notMobile} cols={[
                  /* (parity P-22) the page's 40 track and its first column's 12 (REG-820): the kit pads 16, so the track gives the 4 back — the name lands at 52 */
                  { basis: 36, head: 18, cell: { slot: 'check' } },
                  { basis: 240, grow: 1, head: 56, cell: (r) => [[176, 152, 196, 164][r % 4]!, [212, 188, 236, 170][r % 4]!] },
                  { basis: 132, head: 52, cell: 84 },
                  { basis: 128, head: 40, cell: { slot: 'chip', w: 84 } },
                  { basis: 160, head: 56, cell: { node: <><Slot kind="avatar" /><Slot kind="avatar" /><Bone w={24} h={24} r="var(--om-radius-1)" /></> } },   // (parity P-17) Members, the lead's cell
                  { basis: 172, head: 104, cell: 72 },
                  { basis: 136, head: 64, cell: 72 },   // (parity P-22) Start date at 136
                  { basis: 136, head: 64, cell: 72 },
                  { basis: 156, head: 80, cell: 64 },
                  { basis: 220, head: 100, cell: (r) => [[140, 120, 160, 110][r % 4]!, [60, 72, 56, 64][r % 4]!] },   // (Projects round 2) Next milestone
                  { basis: 168, head: 64, cell: 96 },   // Progress
                  { basis: 144, head: 76, cell: 56 },   // (REG-956) Last update
                  { basis: 48, head: null, cell: null },
                ]} />
                {/* (parity P-26) the phone's cards, in the project card's own classes (project-cards.module.css → the lead card's): the name and
                    its age, the phone · client · property line, the number and dates, a rule, then the members, the stage tag and ⋮ */}
                <div className={`${cardStyles.list} ${sk.mobileOnly}`}>
                  {CARD_NAME_W.map((w, i) => (
                    <div key={i} className={cardStyles.card}>
                      <div className={cardStyles.identity}>
                        <div className={sk.cardHead}><Bone w={w} h={16} /><Bone w={48} h={12} /></div>
                        <div className={sk.cardInfo}><Bone w={[236, 212, 248, 224][i]!} h={14} /></div>
                      </div>
                      <div className={sk.cardInfo}><Bone w={[256, 232, 264, 240][i]!} h={14} /></div>
                      <Bone w="100%" h={1} r={0} />
                      <div className={cardStyles.foot}>
                        <span className={cardStyles.members}><Slot kind="avatar" /><Slot kind="avatar" /><Bone w={24} h={24} r="var(--om-radius-1)" /></span>
                        <Bone w={84} h={24} r="var(--om-radius-1)" />
                        <Bone w={36} h={36} r="var(--om-radius-1)" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </GhostSheet>
  )
}
