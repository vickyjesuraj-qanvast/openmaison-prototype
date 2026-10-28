'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tooltip } from '@/components/om/tooltip'
import { TEAM_SHOWN, loadOf, teamCaption, type TeamData } from '@/lib/dashboard/cards'
import { CARD_LABEL } from '@/lib/dashboard/frame'
import { CardFrame } from './card-frame'
import styles from './cards.module.css'

/**
 * (the Dashboard redesigned, 2026-10-26 — his mark P-09; lane D3) **Team** — "Who has room?": Projects › Workload's lines, each member's running
 * projects against their capacity, over capacity in amber — never red: a load, not a lateness —, their open leads, and a word when they are
 * closed to new leads; the projects with no one on them; and the contractors' line from Workload › Contractors (S45B's tile, moved here). Every
 * row opens Workload with the way back.
 *
 * (the calm pass, 2026-10-26 — the Claude Design option with his corrections, brief-calm.md § 1; lane C3) **Team load**: no avatars; each member's
 * name over their open leads, a capacity bar of one segment per project they can carry — filled for each they carry, the ones past it amber —
 * and "Full" · "2/3" · "1 over" at the right, under the head's key "projects / capacity"; the contractors' line is the card's foot, with View.
 */
export function TeamCard({ data }: { data: TeamData | null }) {
  const [more, setMore] = useState(false)
  if (!data) return null
  const shown = more ? data.lines : data.lines.slice(0, TEAM_SHOWN)
  const hidden = data.lines.length - shown.length
  return (
    /* (the calm UI build 2026-10-27 — the audit's 1-33) "Team workload" (was "Team load"); the head's "projects / capacity" key went — each row's
       figure says it in words ("2 of 3 projects"). `team-legend` stays on the card's key for a screen reader. */
    <CardFrame card="team" title={CARD_LABEL.team} testId="team-card"
               legend={data.lines.length ? <span className="visually-hidden" data-testid="team-legend">Projects each member carries, against how many they can</span> : null}>
      <div className={styles.teamList}>
        {shown.map((l) => {
          const load = loadOf(l.count, l.capacity)
          return (
            <Link key={l.id} href={l.href} className={styles.teamRow} data-over={l.over || undefined} data-full={load.full || undefined} data-testid="team-row"
                  aria-label={`${l.name}: ${load.label} · ${teamCaption(l)} — open Workload`}>
              <span className={styles.teamWho}>
                <Tooltip label={l.name} whenCut><span className={styles.teamName}>{l.name}</span></Tooltip>
                <span className={styles.teamCaption} data-testid="team-caption">{teamCaption(l)}</span>
              </span>
              <span className={styles.load} aria-hidden data-testid="team-segments">
                {load.segments.map((s, i) => <i key={i} data-s={s} />)}
              </span>
              <span className={styles.loadFigure} data-testid="team-load">{load.figure}</span>
            </Link>
          )
        })}
        {data.nobody ? (
          <Link href={data.nobody.href} className={styles.teamRow} data-nobody="" data-testid="team-nobody">
            <span className={styles.teamWho}><span className={styles.teamName}>No one yet</span><span className={styles.teamCaption}>{data.nobody.count === 1 ? '1 project with no one on its team' : `${data.nobody.count} projects with no one on their team`}</span></span>
          </Link>
        ) : null}
      </div>
      {hidden > 0 || more ? (
        <button type="button" className={styles.moreLink} onClick={() => setMore((m) => !m)} data-testid="team-more" aria-expanded={more}>
          {more ? 'Show less' : `Show ${hidden} more`}
        </button>
      ) : null}
      {data.contractors ? (
        <div className={styles.crewLine} data-testid="team-contractors-line" data-none={data.contractors.none || undefined}>
          <span className={styles.crewWords}><span className={styles.crewLabel}>Contractors:</span> {data.contractors.words}</span>
          <Link href={data.contractors.href} className={styles.textLink} data-testid="team-contractors" aria-label={data.contractors.none ? 'Mark your contractors in Finance › Vendors' : 'View the contractors on Workload'}>View</Link>
        </div>
      ) : null}
    </CardFrame>
  )
}
