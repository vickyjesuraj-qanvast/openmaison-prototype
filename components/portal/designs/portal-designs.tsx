'use client'

import { useState } from 'react'
import { EmptyState } from '@/components/om/empty-state'
import { MetaChip } from '@/components/om/meta-chip'
import { PageReveal } from '@/components/shell/page-reveal'
import { clientDay } from '@/lib/portal/model'
import type { PortalData } from '@/lib/portal/home'
import type { PortalDesignLink, PortalDesignsHome } from '@/lib/portal/designs'
import type { PortalLayout } from '@/lib/planner/queries'
import { PortalLayoutCards } from '@/components/planner/viewer/portal-layout-cards'
import { PortalFrame } from '../portal-frame'
import { hrefFor } from '../portal-home'
import { PortalDesignsGhost } from './designs-ghost'
import { PhotoViewer } from '../project/photo-viewer'
import styles from '../portal.module.css'
import own from './designs.module.css'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/**
 * (Projects round 9 — Q-45; board 9's "Designs · Rooms you share from the Visualizer") The portal's Designs: every set of designs the studio
 * shared from the AI Visualizer that still opens, newest first — who shared it and when, its note, a picture per design. A picture opens
 * today's designs link (`/renders/[token]`, Q-40), where the client marks what they like; in a studio's preview it opens the studio's own
 * design instead (the link counts a client's views). One block per home when the client has more than one.
 * (gaps build D, item 1 — M-06) A design shared stays here for good: once its no-login link has run its 7 days the card says when it was
 * shared (no "open until"), its pictures open in the portal's own viewer, and a line says the link to mark what you like has closed.
 */
export function PortalDesignsView({ data, homes, layouts = [] }: { data: PortalData; homes: PortalDesignsHome[]
  /** (gaps build J, J-Q16) the 3D layouts the studio shares from the 3D Space Planner — for good while shared (M-06) */ layouts?: PortalLayout[] }) {
  const { visitor } = data
  const any = homes.some((h) => h.links.length) || layouts.length > 0
  const [viewing, setViewing] = useState<{ l: PortalDesignLink; i: number } | null>(null)
  return (
    <PageReveal skeleton={<PortalDesignsGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="designs" visitor={visitor} paused={data.paused} needs={data.needs}>
        <div className={styles.hello}>
          {/* (fix-F, F-30 · F-31) the tab's own word; no lede over an empty page */}
          <h1 className={styles.h1}>Designs</h1>
          {any ? <p className={styles.lede}>{`Your rooms as ${data.look.studio} sees them. Open one to mark what you like.`}</p> : null}
        </div>
        {!any ? (
          <EmptyState icon="wand_shine" tone="plain" title="No designs yet" help="When your designer shares designs of your rooms, they will be here." testId="portal-designs-empty" />
        ) : homes.map((h) => (h.links.length ? (
          <div key={h.homeId} className={styles.section}>
            {homes.length > 1 ? <h2 className={styles.h2}>{h.title}</h2> : null}
            {h.links.map((l) => {
              const open = hrefFor(visitor.preview, { href: `/renders/${l.token}`, previewHref: `/visualizer/${l.designId}` })
              /* (gaps build D, item 1) an expired link's designs stay: each picture opens in the portal's viewer */
              const look = (i: number) => ({ href: l.versions[i]!.imageUrl, onClick: (e: { preventDefault: () => void }) => { e.preventDefault(); setViewing({ l, i }) } })
              return (
                <section key={l.token} className={styles.card} aria-label={`Designs shared ${clientDay(l.sharedAt, data.now)}`} data-testid="portal-design-link">
                  <div className={own.head}>
                    <div className={styles.rowText}>
                      <h2 className={styles.h3}>{`${plural(l.versions.length, 'design')} of ${l.rooms === 1 ? l.versions[0]!.room : plural(l.rooms, 'room')}`}</h2>
                      <span className={styles.rowLine}>{[`Shared ${clientDay(l.sharedAt, data.now)}`, l.sender ? `by ${l.sender}` : null].filter(Boolean).join(' ')}{l.open ? ` · open until ${clientDay(l.expiresAt, data.now)}` : ''}</span>
                    </div>
                    {l.open ? <a className={`${styles.link} ${styles.rowGo}`} {...open} data-testid="portal-design-open">Open</a> : null}
                  </div>
                  {l.message ? <p className={own.message}>{`“${l.message}”`}</p> : null}
                  <div className={styles.tiles}>
                    {l.versions.map((v, i) => (
                      <a key={v.key} className={styles.tile} {...(l.open ? open : look(i))} data-testid="portal-design">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className={styles.tileImg} src={v.imageUrl} alt={`${v.room} · ${v.label}`} loading="lazy" />
                        <span className={styles.tileText}>
                          <span className={styles.tileName} title={`${v.room} · ${v.label}`}>{v.room}</span>
                          <span className={own.tileFoot}><span className={styles.rowLine}>{v.label}</span>{v.favourite ? <MetaChip color="green">Your favourite</MetaChip> : null}</span>
                        </span>
                      </a>
                    ))}
                  </div>
                  {l.open ? null : <p className={own.closed} data-testid="portal-design-kept">{`The link to mark what you like has closed — your designs stay here. Ask ${l.sender ?? 'your designer'} for a new link to mark them again.`}</p>}
                </section>
              )
            })}
          </div>
        ) : null))}
        {layouts.length ? <PortalLayoutCards data={data} layouts={layouts} /> : null}
        <PhotoViewer open={!!viewing} title={viewing ? `${viewing.l.versions.length === 1 ? 'Your design' : 'Your designs'} · shared ${clientDay(viewing.l.sharedAt, data.now)}` : ''}
                     photos={viewing ? viewing.l.versions.map((v) => ({ id: v.key, src: v.imageUrl, name: `${v.room} · ${v.label}` })) : []} index={viewing?.i ?? 0}
                     onIndex={(i) => setViewing((x) => (x ? { ...x, i } : x))} onClose={() => setViewing(null)} />
      </PortalFrame>
    </PageReveal>
  )
}
