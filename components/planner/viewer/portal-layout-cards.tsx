'use client'

import { MetaChip } from '@/components/om/meta-chip'
import { hrefFor } from '@/components/portal/portal-home'
import { clientDay, portalPath } from '@/lib/portal/model'
import type { PortalData } from '@/lib/portal/home'
import type { PortalLayout } from '@/lib/planner/queries'
import { areaText, totalArea } from '@/lib/planner/model'
import { PlanDrawing } from '../plan-drawing'
import portal from '@/components/portal/portal.module.css'
import styles from './portal-layout-cards.module.css'

/**
 * (gaps build J, J-Q16) The portal's Designs › 3D layouts: each layout the studio shares from the 3D Space Planner, as the Designs tab's
 * tiles — its top view, its name, who shared it and when, *New* until it is opened. A tile opens the layout inside the portal; in a
 * studio's preview it opens the studio's own layout (a preview never counts as the client's open).
 */
export function PortalLayoutCards({ data, layouts }: { data: PortalData; layouts: PortalLayout[] }) {
  return (
    <div className={portal.section} data-testid="portal-layouts">
      <h2 className={portal.h2}>3D layouts</h2>
      <section className={portal.card} aria-label="3D layouts">
        <p className={styles.lede}>{`Walk through your home as ${data.look.studio} plans it — turn it, walk inside, look at each room.`}</p>
        <div className={portal.tiles}>
          {layouts.map((l) => (
            <a key={l.id} className={portal.tile} {...hrefFor(data.visitor.preview, { href: portalPath(data.slug, `layout/${encodeURIComponent(l.id)}`), previewHref: `/planner/${l.layoutId}` })} data-testid="portal-layout">
              <span className={styles.art}><PlanDrawing plan={l.plan} library={l.library} labels="none" unit={14} decorative /></span>
              <span className={portal.tileText}>
                <span className={portal.tileName} title={l.name}>{l.name}</span>
                <span className={styles.foot}>
                  <span className={portal.rowLine}>{[areaText(totalArea(l.plan))   /* (parity map, TD-075) every level */, `Shared ${clientDay(l.updatedAt, data.now)}`, l.sender ? `by ${l.sender}` : null].filter(Boolean).join(' · ')}</span>
                  {!l.seen ? <MetaChip color="green">New</MetaChip> : null}
                </span>
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
