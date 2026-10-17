'use client'

import { ClientUpdateCard } from '@/components/projects/updates/client-card'
import { rangeLabel } from '@/lib/projects/schedule-model'
import { portalPath } from '@/lib/portal/model'
import { PAUSED_LABEL, standsLine, standsTitle, type ScheduleSummary } from '@/lib/portal/schedule-model'
import type { PortalUpdate } from '@/lib/portal/updates'
import p from '../portal.module.css'
import styles from './project.module.css'

/**
 * (Projects round 4b, boards 1 · 7) "Where the work stands" on the portal's home, from the schedule as last shared (never the live one): on a
 * phone board 1's "Carpentry is under way", a bar of one segment per stage and "3 of 7 stages done. Handover is planned for Fri 13 Nov."; at a
 * desk board 7's "3 of 7 stages done" with the Schedule link and each stage's dot and dates. (simplify S-25) A Blocked stage reads Paused here
 * too ("Electrical & plumbing is paused", its dot and segment in the paused tone) — the Schedule page's rule (`isPausedStage`).
 */
export function StandsCard({ summary, slug, place }: { summary: ScheduleSummary; slug: string; place: string | null }) {
  const s = summary
  return (
    <section className={styles.stands} aria-label="Where the work stands" data-slot="stands" data-testid="portal-stands">
      {place ? <span className={styles.eyebrow}>{place}</span> : null}
      <div className={styles.standsPhone}>
        <h2 className={p.h3}>{standsTitle(s)}</h2>
        <div className={styles.segments} aria-hidden>{s.stages.map((st) => <span key={st.id} className={styles.segment} data-s={st.state} data-paused={st.paused || undefined} />)}</div>
        <p className={p.line}>{standsLine(s)}</p>
      </div>
      <div className={styles.standsDesk}>
        <div className={styles.standsHead}>
          <h2 className={p.h3}>{`${s.done} of ${s.total} ${s.total === 1 ? 'stage' : 'stages'} done`}</h2>
          <a className={p.link} href={portalPath(slug, 'schedule')}>Schedule</a>
        </div>
        <ul className={styles.standsList}>
          {s.stages.map((st) => (
            <li key={st.id} className={styles.standsRow} data-s={st.state} data-paused={st.paused || undefined}>
              <span className={styles.standsDot} data-s={st.state} data-paused={st.paused || undefined} aria-hidden />
              <span className={styles.standsName}>{st.title}</span>
              {/* (simplify S-25) Paused, as the Schedule page's row says it — never "under way" for a Blocked stage */}
              <span className={styles.standsDates}>{rangeLabel(st.start, st.end)}{st.paused ? <> · <span className={styles.standsPaused} data-testid="portal-stands-paused">{PAUSED_LABEL}</span></> : null}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** (Boards 1 · 7) The newest published update on the home: "Latest update · Mon 28 Sep · from Germaine", All updates, the card itself. */
export function LatestUpdateCard({ update, slug, onPhoto }: { update: PortalUpdate; slug: string; onPhoto: (i: number) => void }) {
  const u = update
  return (
    <div className={styles.latest} data-slot="latest" aria-label="Latest update" data-testid="portal-latest-update">
      <ClientUpdateCard wide id={u.id} lead="Latest update" title={u.title} html={u.html} author={u.author} at={u.at} media={u.media} milestone={u.milestone?.title ?? null}
                        fresh={!u.opened && !u.changed} changed={u.changed} onPhoto={onPhoto} aside={<a className={p.link} href={portalPath(slug, 'updates')}>All updates</a>} />
    </div>
  )
}
