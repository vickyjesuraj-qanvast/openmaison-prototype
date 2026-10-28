'use client'

import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { PageReveal } from '@/components/shell/page-reveal'
import { shortDay } from '@/lib/portal/model'
import type { PortalData } from '@/lib/portal/home'
import { DOCUMENT_GROUPS } from '@/lib/portal/documents'
import { sharedFileGroups } from '@/lib/portal/file-kinds'
import { PortalFrame } from './portal-frame'
import { hrefFor } from './portal-home'
import { PortalFilesGhost } from './portal-ghosts'
import styles from './portal.module.css'

/**
 * (Projects round 4a) The portal's Files: the client's documents — each quote and agreement the studio sent, opened on today's link (Q-40) —
 * and the files the studio marked Shown to client, and nothing else (the team's own files never reach the page). One block per home when
 * the client has more than one.
 * (gaps build D, item 8 — 1.0 I-321…I-325) The documents grouped by kind under the card's subheads: Quotes · Contract · Variation orders ·
 * Payment receipts · Selection receipts (a group with nothing in it is not drawn); the files shown come after, as before.
 */
export function PortalFilesView({ data }: { data: PortalData }) {
  const { homes, visitor } = data
  const empty = homes.every((h) => !h.documents.length && !h.files.length)
  return (
    <PageReveal skeleton={<PortalFilesGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="files" visitor={visitor} paused={data.paused} needs={data.needs}>
        <div className={styles.hello}>
          {/* (fix-F, F-30 · F-31) the tab's own word; no lede over an empty page */}
          <h1 className={styles.h1}>Files</h1>
          {empty ? null : <p className={styles.lede}>{`What ${data.look.studio} has shared with you.`}</p>}
        </div>
        {empty ? (
          <EmptyState icon="folder" tone="plain" title="Nothing shared yet" help="Your quote, your contract and the files your designer shares with you will be here." testId="portal-files-empty" />
        ) : homes.map((h) => (h.documents.length || h.files.length ? (
          <div key={h.id} className={styles.section}>
            {homes.length > 1 ? <h2 className={styles.h2}>{h.place ? `Your home at ${h.place}` : h.title}</h2> : null}
            {h.documents.length ? (
              <section className={styles.card} aria-label="Documents" data-testid="portal-documents">
                <div className={styles.cardPad}><h2 className={styles.h3}>Documents</h2></div>
                {DOCUMENT_GROUPS.map((g) => {
                  const list = h.documents.filter((d) => (d.group ?? 'quotes') === g.key)
                  return list.length ? (
                    <div key={g.key} role="group" aria-label={g.label} data-testid="portal-documents-group" data-group={g.key}>
                      <h3 className={styles.docGroup}>{g.label}</h3>
                      {list.map((d) => (
                        /* a receipt opens in the portal; a quote or an agreement on today's link, in a new tab (F-24) — (the calm UI build 2026-10-27,
                           3-50 · T-02) the whole row opens, its chevron says so: no "Open" on every row */
                        <a key={d.key} className={`${styles.row} ${styles.rowLink}`} data-testid="portal-document" {...hrefFor(visitor.preview, d.group === 'receipts' || d.group === 'selections' ? { href: d.href, previewHref: null } : d)}>
                          <span className={styles.rowLead}>
                            <span className={styles.rowGlyph}><Icon name={d.icon} size={20} weight={300} /></span>
                            <span className={styles.rowText}><span className={styles.rowTitle}>{d.title}</span><span className={styles.rowLine}>{d.line}</span></span>
                          </span>
                          <span className={styles.rowChevron} aria-hidden><Icon name="chevron_right" size={20} /></span>
                        </a>
                      ))}
                    </div>
                  ) : null
                })}
              </section>
            ) : null}
            {h.files.length ? (
              <section className={styles.card} aria-label="Shared files" data-testid="portal-shared-files">
                <div className={styles.cardPad}><h2 className={styles.h3}>{`From ${data.look.studio}`}</h2></div>
                {/* (parity map, CP-099 — 1.0's Documents) what the studio shared, by kind — a heading only for the kinds present, none when
                    everything is Other; each tile keeps the day it was shared */}
                {sharedFileGroups(h.files).map((g, _i, all) => (
                  <div key={g.key} role="group" aria-label={g.label} data-testid="portal-shared-group" data-group={g.key}>
                    {all.length > 1 || g.key !== 'other' ? <h3 className={styles.docGroup}>{g.label}</h3> : null}
                    <div className={styles.tiles}>
                      {g.files.map((f) => {
                        const body = (
                          <>
                            {f.thumb && f.kind === 'image' ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img className={styles.tileImg} src={f.href ?? f.thumb} alt="" />
                            ) : <span className={styles.tileBox}><Icon name={f.kind === 'pdf' ? 'picture_as_pdf' : 'description'} size={32} weight={300} /></span>}
                            <span className={styles.tileText}><span className={styles.tileName} title={f.name}>{f.name}</span><span className={styles.rowLine}>{`Shared ${shortDay(f.shownAt)}`}</span></span>
                          </>
                        )
                        return f.href
                          ? <a key={f.id} className={styles.tile} href={f.href} target="_blank" rel="noreferrer" data-testid="portal-file">{body}</a>
                          : <span key={f.id} className={styles.tile} data-testid="portal-file">{body}</span>
                      })}
                    </div>
                  </div>
                ))}
              </section>
            ) : null}
          </div>
        ) : null))}
      </PortalFrame>
    </PageReveal>
  )
}
