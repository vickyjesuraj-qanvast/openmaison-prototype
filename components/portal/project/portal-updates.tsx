'use client'

import { useRef, useState } from 'react'
import { EmptyState } from '@/components/om/empty-state'
import { TextField } from '@/components/om/text-field'
import { Icon } from '@/components/om/icon'
import { PhotoCompare } from '@/components/projects/updates/photo-compare'
import { filterByQuery } from '@/lib/search'
import { money2 } from '@/lib/quotes/math'
import { PageReveal } from '@/components/shell/page-reveal'
import { ClientUpdateCard } from '@/components/projects/updates/client-card'
import { portalPath } from '@/lib/portal/model'
import type { PortalData } from '@/lib/portal/home'
import type { PortalUpdate, PortalUpdatesHome } from '@/lib/portal/updates'
import { ContactLine } from '../contact-line'
import { PortalFrame } from '../portal-frame'
import { PhotoViewer } from './photo-viewer'
import { PortalUpdatesGhost } from './project-ghosts'
import { useSeenUpdates } from './use-seen'
import p from '../portal.module.css'
import styles from './project.module.css'

/** The photos of an update, as the viewer walks them. */
export const photosOf = (u: PortalUpdate) => u.media.filter((m) => m.kind === 'photo' && m.thumb).map((m) => ({ id: m.fileId, src: m.thumb!, name: m.name }))

/**
 * (Projects round 4b, board 3) The portal's Updates: the project's published updates, newest first — "Fri 2 Oct · from Germaine", the stage
 * it belongs to, the words, the photos (each opens the viewer: swipe and pinch on a phone), a video that plays, a document that opens; "New"
 * on one not opened yet, and "Confirm this stage" when its stage waits on the client (board 3). An update counts as opened when its card
 * has been on screen (`useSeenUpdates`) — never in a studio's preview.
 */
export function PortalUpdatesView({ data, homes }: { data: PortalData; homes: PortalUpdatesHome[] }) {
  const { visitor } = data
  /* the stages waiting on the client — an update of one carries board 3's "Confirm this stage" */
  const asks = data.homes.flatMap((h) => h.schedule?.toConfirm.map((s) => s.id) ?? [])
  const root = useRef<HTMLDivElement>(null)
  useSeenUpdates(data.slug, root, !visitor.preview)
  const [viewing, setViewing] = useState<{ u: PortalUpdate; i: number } | null>(null)
  const [comparing, setComparing] = useState<PortalUpdate | null>(null)   // (gaps build D, item 10)
  const any = homes.some((h) => h.updates.length)
  /* (gaps build D, item 10 — 1.0 I-257) past three updates, a search: the title, the words, the stage, who wrote it */
  const total = homes.reduce((n, h) => n + h.updates.length, 0)
  const [query, setQuery] = useState('')
  const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
  const findIn = (list: PortalUpdate[]) => filterByQuery(list, query, (u) => ({ fields: [u.title, plain(u.html), u.milestone?.title ?? '', u.author ?? ''] }))
  const matches = homes.reduce((n, h) => n + findIn(h.updates).length, 0)
  return (
    <PageReveal skeleton={<PortalUpdatesGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="updates" visitor={visitor} paused={data.paused} needs={data.needs}>
        <div className={p.hello}>
          <h1 className={p.h1}>Updates</h1>
          <p className={p.lede}>{`How the work on your home is going, from ${data.look.studio}.`}</p>
        </div>
        {/* (fix-F, C's note) at a desk the feed is the page's main column with the line to the designer beside it — Schedule's and Money's
            split — not a narrow column pinned left under the bar */}
        <div className={styles.split}>
        <div ref={root} className={`${styles.main} ${styles.feed}`} data-testid="portal-updates">
          {!any ? (
            <EmptyState icon="chat" tone="plain" testId="portal-updates-empty" title="No updates yet"
                        help={`When ${data.look.studio} shares how the work is going, with photos, it shows here.`} />
          ) : (
            <>
              {total > 3 ? (
                <div className={styles.feedSearch}>
                  <TextField label="Search updates" type="search" value={query} onChange={setQuery} trailingIcon="search" />
                </div>
              ) : null}
              {query.trim() && !matches ? <p className={p.line} data-testid="portal-updates-none">{`No updates match “${query.trim()}”.`}</p> : null}
              {homes.map((h) => { const list = findIn(h.updates); return list.length ? (
            <div key={h.homeId} className={styles.feed}>
              {homes.filter((x) => x.updates.length).length > 1 ? <h2 className={styles.homeHead}>{h.title}</h2> : null}
              {list.map((u) => (
                <ClientUpdateCard key={u.id} id={u.id} wide title={u.title} html={u.html} author={u.author} at={u.at} media={u.media} milestone={u.milestone?.title ?? null}
                                  fresh={!u.opened && !u.changed} changed={u.changed} onPhoto={(i) => setViewing({ u, i })} onCompare={() => setComparing(u)}
                                  foot={<>
                                    {/* (gaps build D, item 10 — 1.0 I-260 · D-93) the invoice of the stage this update is about, one press from Money */}
                                    {u.invoice ? (
                                      <a className={styles.updateInvoice} href={`${portalPath(data.slug, 'money')}?open=${encodeURIComponent(u.invoice.id)}`} data-state={u.invoice.state} data-testid="portal-update-invoice">
                                        <Icon name="receipt_long" size={16} weight={300} />
                                        {`Invoice ${u.invoice.number} · ${u.invoice.name} · ${money2(u.invoice.amountMinor)} · ${u.invoice.state === 'paid' ? 'Paid' : u.invoice.state === 'to_confirm' ? 'Paid · being confirmed' : 'Due'}`}
                                      </a>
                                    ) : null}
                                    {u.milestone && asks.includes(u.milestone.id)
                                      ? <a className={`${p.link} ${p.rowGo}`} href={`${portalPath(data.slug, 'schedule')}#stage-${u.milestone.id}`} data-testid="portal-update-confirm">Confirm this milestone</a>
                                      : null}
                                  </>} />
              ))}
            </div>
          ) : null })}
            </>
          )}
        </div>
        <div className={styles.side}>
          <ContactLine data={data} ask="A question about the work?" about="about an update" />
        </div>
        </div>
        <PhotoCompare open={!!comparing} title={comparing?.title ?? ''} photos={comparing ? photosOf(comparing) : []} onClose={() => setComparing(null)} />
        <PhotoViewer open={!!viewing} title={viewing?.u.title ?? ''} photos={viewing ? photosOf(viewing.u) : []} index={viewing?.i ?? 0}
                     onIndex={(i) => setViewing((v) => (v ? { ...v, i } : v))} onClose={() => setViewing(null)} />
      </PortalFrame>
    </PageReveal>
  )
}
