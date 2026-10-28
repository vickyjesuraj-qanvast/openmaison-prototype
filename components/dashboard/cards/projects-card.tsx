'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tooltip } from '@/components/om/tooltip'
import { useSheetLayout } from '@/components/om/sheet'
import { PROJECTS_SHOWN, PROJECTS_SHOWN_PHONE, projectsHead, type ProjectsData } from '@/lib/dashboard/cards'
import { HEALTH_WORD } from '@/lib/dashboard/health'
import { CardFrame } from './card-frame'
import styles from './cards.module.css'

/**
 * (the Dashboard redesigned, 2026-10-26 — his marks P-08 · Q-10; lane D3) **Projects** — "Which project needs attention?": one line per open
 * project this member sees, worst first — its health by rule (lib/dashboard/health.ts: late · at risk · on track, or on hold · setting up), its
 * why in words, its progress (done of all milestones, the listing's own) and the next fact. A line opens the project.
 *
 * (the calm pass, 2026-10-26 — the Claude Design option with his corrections, brief-calm.md § 1 · § 2.2 · § 2.3; lane C3) Each project two
 * lines and a bar: the project's name (its full words, cut with an ellipsis and said in full on hover) with its state word at the right — **Late**
 * in red (ours and late, S-05), At risk in amber, the rest in the secondary ink —, a thin full-width progress bar, then "62% · AquaFlow’s bill
 * 14 days overdue". The head's one fact is the old Open projects tile: "4 running · 2 late", a door to the listing.
 */
export function ProjectsCard({ data }: { data: ProjectsData | null }) {
  const phone = useSheetLayout()
  const [more, setMore] = useState(false)
  if (!data) return null
  const cap = phone ? PROJECTS_SHOWN_PHONE : PROJECTS_SHOWN
  const shown = more ? data.lines : data.lines.slice(0, cap)
  const hidden = data.lines.length - shown.length
  return (
    <CardFrame card="projects" title="Projects" testId="projects"
               legend={<Link href={data.href} className={styles.headLink} data-testid="projects-running">{projectsHead(data)}</Link>}>
      <div className={styles.lines}>
        {shown.map((l) => (
          <Link key={l.id} href={l.href} className={styles.projectRow} data-testid="project-line" data-health={l.health}
                aria-label={`${l.name} — ${HEALTH_WORD[l.health]}${l.healthWhy ? `: ${l.healthWhy}` : ''} · ${l.progressWords}`}>
            <span className={styles.projectTop}>
              <Tooltip label={l.name} whenCut><span className={styles.projectName}>{l.name}</span></Tooltip>
              <span className={styles.projectState} data-health={l.health} data-testid="project-state">{l.state}</span>
            </span>
            <span className={styles.progress} data-testid="project-progress" data-health={l.health} aria-hidden>
              <span className={styles.progressFill} style={{ width: `${l.progress}%` }} />
            </span>
            <Tooltip label={l.captionFull} whenCut>
              <span className={styles.projectLine} data-testid="project-why">{l.caption}</span>
            </Tooltip>
          </Link>
        ))}
      </div>
      {hidden > 0 || more ? (
        <button type="button" className={styles.moreLink} onClick={() => setMore((m) => !m)} data-testid="projects-more" aria-expanded={more}>
          {more ? 'Show less' : `Show ${hidden} more`}
        </button>
      ) : null}
    </CardFrame>
  )
}
