'use client'

import { GhostHead, Line, Words, phoneOnly } from '@/components/shell/ghost-kit'
import { AiBriefGhost } from '@/components/leads/detail/ai-brief'
import { CardGhost } from '@/components/projects/overview/overview-ghost'
import { StatTiles } from '@/components/om/stat-tile'
import { useSeedFlag, useViewerShape } from '@/lib/ghost-shape'
import { COMING_UP_SHOWN_PHONE, NEEDS_SHOWN, NEEDS_SHOWN_PHONE, tileLabelsFor } from '@/lib/dashboard/model'
import pageStyles from '@/app/leads/leads.module.css'
import card from '@/components/leads/detail/card.module.css'
import overview from '@/components/projects/project-overview.module.css'
import tile from '@/components/om/stat-tile.module.css'
import styles from './dashboard.module.css'

/** (pending modules S45A) A tile's ghost by its caption: the figure's width, its help's line width, and how many lines the help takes at a desk
    (the glance stack's two-up tiles, ~228 wide) and on a phone (two-up, ~170) — a row is as tall as its taller tile, so the ghost's rows land
    where the page's do. */
const TILE_GHOST: Record<string, { v: number; w: number; desk: number; phone: number }> = {
  Leads: { v: 32, w: 148, desk: 2, phone: 3 }, 'My leads': { v: 32, w: 148, desk: 2, phone: 3 },
  Sales: { v: 120, w: 180, desk: 2, phone: 3 }, 'Response time': { v: 48, w: 180, desk: 2, phone: 4 },
  'Open projects': { v: 24, w: 120, desk: 1, phone: 1 }, 'My projects': { v: 24, w: 120, desk: 1, phone: 1 },
  Contractors: { v: 16, w: 184, desk: 2, phone: 4 },   // (pending modules S45B) "free this week · 1 over capacity · 1 starting with no contractor"
  Messages: { v: 24, w: 176, desk: 2, phone: 2 }, 'Owed to you': { v: 112, w: 180, desk: 2, phone: 3 }, 'You owe': { v: 112, w: 180, desk: 2, phone: 3 },
  'Profit this month': { v: 104, w: 200, desk: 1, phone: 1 },
}
function TileHelp({ w, desk, phone }: { w: number; desk: number; phone: number }) {
  const widths = [w, Math.round(w * 0.82), Math.round(w * 0.9), Math.round(w * 0.5)]
  return (
    <span style={{ display: 'flex', flexDirection: 'column' }}>
      {widths.slice(0, Math.max(desk, phone)).map((x, i) => <Line key={i} w={x} lh={16} h={10} className={i >= desk ? phoneOnly : undefined} />)}
    </span>
  )
}

/**
 * (pending modules S22 · REG-708) The Dashboard's ghost — drawn by `app/dashboard/loading.tsx` and handed to the page's `PageReveal`, the same
 * one in both: the L1 header, the brief with its Ask box, then the two stacks on the page's own classes — act (Needs you · MY TASKS · Coming
 * up), glance (Where it stands' tiles · Workload · Site updates · From Market Insights) — each card in its own words. Which cards it draws is
 * the viewer's (the app shell's seed, lib/ghost-shapes.server.ts: `role.runs` · `role.accounting` · `dashboard.team` · `dashboard.updates` ·
 * `market-insights`), never remembered per browser — View as changes it.
 */
export function DashboardGhost() {
  const runs = useSeedFlag('role.runs', false)
  const accounting = useViewerShape('role.accounting')
  const desk = useViewerShape('role.marketing')   // (S44O — call C6) Marketing's: the Leads tile alone, no article
  const team = useSeedFlag('dashboard.team', false)
  const updates = useSeedFlag('dashboard.updates', false)
  const mine = useSeedFlag('dashboard.mytasks', true)   // (S42 audit A-06 · A-16) rows, or the one quiet row
  const quiet = useSeedFlag('dashboard.quiet', false)   // (S42 audit A-16) a studio with nothing in it yet: Needs you's one row
  const noArticles = useSeedFlag('market-insights', true)
  const article = !accounting && !desk && !noArticles
  const costs = useSeedFlag('role.costs', true)   // (pending modules S41b-1) no Profit tile for a member who doesn't see costs
  const tiles = tileLabelsFor(accounting ? 'Accounting' : desk ? 'Marketing' : runs ? 'Owner' : team ? 'Manager' : 'Designer', costs)
  return (
    <div className={pageStyles.body} aria-hidden>
      <GhostHead title={120} />
      <div className={styles.content}>
        <AiBriefGhost more={false} ask />
        <div className={`${overview.grid} ${styles.grid}`}>
          <div className={`${overview.column} ${overview.act} ${styles.col}`}>
            <span data-card="needs"><CardGhost title="Needs you" rows={accounting || quiet ? 1 : NEEDS_SHOWN} phone={quiet ? 1 : NEEDS_SHOWN_PHONE} two /></span>   {/* the card's own fold — six rows, four on a phone (Accounting's is To do's one) */}
            <span data-card="my-work">{mine ? <CardGhost title="MY TASKS" rows={3} /> : <CardGhost title="MY TASKS" rows={1} two />}</span>
            <span data-card="coming-up"><CardGhost title="Coming up" rows={accounting || desk ? 1 : 4} phone={desk ? 1 : COMING_UP_SHOWN_PHONE} two /></span>   {/* (S44O — C6) Marketing's has no project or meeting ahead: its one quiet row */}
          </div>
          <div className={`${overview.column} ${overview.glance} ${styles.col}`}>
            <span data-card="stands">
              <section className={card.card}>
                <div className={card.head}><div className={card.headText}><Words className={card.title}>Where it stands</Words></div></div>
                <div className={styles.tiles}>
                  <StatTiles className={styles.standTiles}>
                    {tiles.map((l) => (
                      <div key={l} className={tile.tile}>
                        <Words className={tile.label}>{l}</Words>
                        {/* each tile's figure and help by its own caption (S45A put Sales and Response time after Leads) */}
                        <Line w={TILE_GHOST[l]?.v ?? 40} lh={24} h={20} />
                        <TileHelp w={TILE_GHOST[l]?.w ?? 140} desk={TILE_GHOST[l]?.desk ?? 1} phone={TILE_GHOST[l]?.phone ?? 2} />
                      </div>
                    ))}
                  </StatTiles>
                </div>
              </section>
            </span>
            {team ? <span data-card="team"><CardGhost title="Workload" rows={4} two /></span> : null}
            {updates ? <span data-card="updates"><CardGhost title="Site updates" rows={3} two /></span> : null}
            {article ? <span data-card="article"><CardGhost title="From Market Insights" rows={1} two /></span> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
