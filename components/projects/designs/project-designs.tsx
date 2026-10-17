'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { useSheetLayout } from '@/components/om/sheet'
import { Card, CardRule } from '@/components/leads/detail/card'
import { PhotoViewer } from '@/components/portal/project/photo-viewer'
import { ClientAccessPanel } from '@/components/portal/client-access-panel'
import { useRememberShape } from '@/lib/ghost-shape'
import { SECTION_OFF_STATE } from '@/lib/portal/sections'
import { displayDate } from '@/lib/format'
import { withFrom } from '@/lib/nav'
import type { DesignShare, DesignsReach, ProjectDesignsData } from '@/lib/projects/designs'
import { useProjectContext } from '../project-context'
import styles from './designs.module.css'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const day = (ms: number) => displayDate(new Date(ms))
const opened = (n: number) => (n === 1 ? 'Opened once' : n === 2 ? 'Opened twice' : `Opened ${n} times`)

/**
 * (simplify S-03 — Design › Designs, the owner's "build everything" 2026-10-09) The renders and 3D layouts the client sees, from the studio's
 * side: each renders link still on the client's page (who shared it and when, whether its link to mark what they like is still open, the
 * client's favourite, how often they opened it), every 3D layout of the project (shared or not, opened, changes not shared yet), and the
 * renders filed in Files (the Overview's old "Latest renders"). Doors: the AI Visualizer and the 3D Space Planner — the page's own (the
 * Create strip's), so a design opens as it does from there and Back returns here. A first run is the house empty state with both ways in
 * (REG-735); the toolbar then steps back to the view switch.
 * (simplify round 2 — the owner's "fix all the pending things" 2026-10-09) When the client can't see Designs on their page, the view says so in
 * one line under its toolbar, with its door: Company › Client portal switched Designs off for every client (the Invite to Portal panel's own
 * "Off for every client"), the client holds no access (Invite to Portal — the panel, here), or the portal is paused.
 */
export function ProjectDesigns({ data, views }: { data: ProjectDesignsData; /** the Design group's view switch, in the title's place */ views?: ReactNode }) {
  const { shares, layouts, saved, project } = data
  const { openVisualizer, openPlanner, href } = useProjectContext()
  const router = useRouter()
  const phone = useSheetLayout()
  const [viewing, setViewing] = useState<{ s: DesignShare; i: number } | null>(null)
  const [inviting, setInviting] = useState(false)
  const here = () => `${window.location.pathname}${window.location.search}`
  const client = project.client
  const first = shares.length === 0 && layouts.length === 0 && saved.length === 0
  useRememberShape(`lead.${project.id}.designs`, first)   // (REG-817) the view's ghost opens on the shape it last had
  useRememberShape(`lead.${project.id}.designs.reach`, !!data.reach)   // …and with the reach line when it had one (designs-ghost.tsx)
  const openDesign = (designId: string) => router.push(withFrom(`/visualizer/${designId}`, here()))
  const openLayout = (id: string) => router.push(withFrom(`/planner/${id}`, here()))

  const tools = phone ? (
    <>
      <Tooltip label="AI Visualizer"><IconButton icon="wand_shine" label="AI Visualizer" onClick={openVisualizer} data-testid="designs-visualizer" /></Tooltip>
      <Tooltip label="3D Space Planner"><IconButton icon="space_dashboard" label="3D Space Planner" onClick={openPlanner} data-testid="designs-planner" /></Tooltip>
    </>
  ) : (
    <>
      <Button variant="secondary" appearance="outlined" iconStart={<Icon name="wand_shine" size={20} />} onPress={openVisualizer} data-testid="designs-visualizer">AI Visualizer</Button>
      <Button variant="secondary" appearance="outlined" iconStart={<Icon name="space_dashboard" size={20} />} onPress={openPlanner} data-testid="designs-planner">3D Space Planner</Button>
    </>
  )

  return (
    <div className={styles.tab} data-testid="project-designs">
      <div className={styles.bar}>
        {views ?? null}
        {first ? null : <div className={styles.actions}>{tools}</div>}
      </div>
      {data.reach ? <ReachLine reach={data.reach} client={client} onInvite={() => setInviting(true)} portalHref={withFrom('/company/portal', `/projects/${project.id}/designs`)} /> : null}
      {first ? (
        <EmptyState icon="wand_shine" title="No designs yet" testId="designs-empty"
                    help={`The renders you share from the AI Visualizer and the 3D layouts you share from the 3D Space Planner show here — what ${client} sees under Designs on their page, and whether they opened it.`}
                    primary={{ label: 'Open the AI Visualizer', icon: 'wand_shine', onPress: openVisualizer, testId: 'designs-empty-visualizer' }}
                    secondary={{ label: 'Plan the space in 3D', icon: 'space_dashboard', onPress: openPlanner, testId: 'designs-empty-planner' }} />
      ) : (
        <>
          {shares.length ? (
            <Card title="Renders" meta={`· ${plural(shares.length, 'set')} shared with ${client}`} testId="designs-renders"
                  onOpen={data.designId ? () => openDesign(data.designId!) : openVisualizer} openLabel="Open in the AI Visualizer">
              {shares.map((s, n) => (
                <div key={s.id}>
                  {n > 0 ? <CardRule /> : null}
                  <section className={styles.share} aria-label={`Shared ${day(s.sharedAt)}`} data-testid="designs-share">
                    <div className={styles.shareHead}>
                      <div className={styles.shareText}>
                        <span className={styles.shareName}>{`${plural(s.versions.length, 'design')} of ${s.rooms === 1 ? s.versions[0]!.room : plural(s.rooms, 'room')}`}</span>
                        <span className={styles.shareLine}>
                          {[`Shared ${day(s.sharedAt)}${s.sender ? ` by ${s.sender}` : ''}`,
                            s.open ? `the link is open until ${day(s.expiresAt)}` : `the link to mark them has closed — they stay on ${client}’s page`,
                            s.views ? `${opened(s.views)}${s.lastViewedAt ? `, last ${day(s.lastViewedAt)}` : ''}` : `${client} hasn’t opened it yet`].join(' · ')}
                        </span>
                      </div>
                    </div>
                    {s.message ? <p className={styles.message}>{`“${s.message}”`}</p> : null}
                    <div className={styles.tiles}>
                      {s.versions.map((v, i) => (
                        <button key={v.key} type="button" className={styles.tile} onClick={() => setViewing({ s, i })} aria-label={`${v.room} · ${v.label}`} data-testid="designs-version">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <span className={styles.tileImg}><img src={v.imageUrl} alt="" loading="lazy" /></span>
                          <span className={styles.tileName}>{v.room}</span>
                          <span className={styles.tileSub}>{v.label}</span>
                          {v.favourite ? <span className={styles.tileChip}><MetaChip color="green">{`${client}’s favourite`}</MetaChip></span> : null}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              ))}
            </Card>
          ) : null}
          {layouts.length ? (
            <Card title="3D layouts" meta={`· ${plural(layouts.filter((l) => l.share).length, 'layout')} shared`} testId="designs-layouts" onOpen={openPlanner} openLabel="Open the project’s layouts">
              <ul className={styles.list}>
                {layouts.map((l) => (
                  <li key={l.id}>
                    <button type="button" className={styles.row} onClick={() => openLayout(l.id)} data-testid="designs-layout">
                      <span className={styles.glyph}><Icon name="view_in_ar" size={20} weight={300} /></span>
                      <span className={styles.text}>
                        <span className={styles.name}>{l.name}</span>
                        <span className={styles.sub}>{[plural(l.rooms, 'room'),
                          l.share ? `Shared ${day(l.share.sharedAt)}${l.share.sender ? ` by ${l.share.sender}` : ''}` : `Edited ${day(l.updatedAt)}`,
                          l.share ? (l.share.firstViewedAt ? `${client} opened it ${day(l.share.lastViewedAt ?? l.share.firstViewedAt)}` : `${client} hasn’t opened it yet`) : null].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className={styles.chips}>
                        {!l.share ? <MetaChip>Not shared</MetaChip> : l.share.changes ? <MetaChip color="yellow">Changes not shared</MetaChip> : <MetaChip color="green">Shared</MetaChip>}
                      </span>
                      <Icon name="chevron_right" size={20} weight={300} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {saved.length ? (
            <Card title="Saved to Files" meta={`· ${saved.length}`} testId="designs-saved" onOpen={() => router.push(href('files'))} openLabel="Open Files">
              <div className={styles.saved}>
                {saved.map((r) => (
                  <Link key={r.id} href={href(`files/${r.id}`)} className={styles.savedThumb} aria-label={r.name} title={r.name} data-testid="designs-saved-render">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.thumb ? <img src={r.thumb} alt="" /> : <Icon name="image" size={20} weight={300} />}
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      )}
      <PhotoViewer open={!!viewing} title={viewing ? `Shared ${day(viewing.s.sharedAt)}` : ''}
                   photos={viewing ? viewing.s.versions.map((v) => ({ id: v.key, src: v.imageUrl, name: `${v.room} · ${v.label}` })) : []} index={viewing?.i ?? 0}
                   onIndex={(i) => setViewing((x) => (x ? { ...x, i } : x))} onClose={() => setViewing(null)} />
      <ClientAccessPanel open={inviting} leadId={project.leadId} project onClose={() => { setInviting(false); router.refresh() }} />
    </div>
  )
}

/** (simplify round 2) The one line that says the client can't see these, and its door — the Client access panel's words (Projects round 9's
    "Off for every client", fix-G's paused note, REG-1050's "sees it once invited to the portal"). Words invented: *Open Client portal*. */
function ReachLine({ reach, client, onInvite, portalHref }: { reach: NonNullable<DesignsReach>; client: string; onInvite: () => void; portalHref: string }) {
  const line = reach.why === 'off' ? `Designs · ${SECTION_OFF_STATE} — ${client} doesn’t see these on their page.`
    : reach.why === 'withdrawn' ? `${client}’s access to their page is withdrawn — they see nothing of the designs.`
    : reach.why === 'none' ? `${client} sees these once invited to the portal.`
    : `The portal is paused — ${client} sees a notice until it’s live again.`
  const invite = reach.why === 'none' || reach.why === 'withdrawn'
  return (
    <div className={styles.reach} role="note" data-testid="designs-reach" data-why={reach.why}>
      <Icon name={reach.why === 'off' ? 'visibility_off' : reach.why === 'paused' ? 'schedule' : 'person_add'} size={20} weight={300} />
      <span className={styles.reachText}>{line}</span>
      {/* the door: the house text link (REG-729) — the Invite to Portal panel for whoever may invite them, else Company › Client portal */}
      {invite ? (reach.mayInvite ? <button type="button" className={styles.reachLink} onClick={onInvite} data-testid="designs-reach-invite">Invite to Portal</button> : null)
        : <Link href={portalHref} className={styles.reachLink} data-testid="designs-reach-portal">Open Client portal</Link>}
    </div>
  )
}
