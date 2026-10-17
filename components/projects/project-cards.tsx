'use client'

import { useRef, useState } from 'react'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { highlightMatch } from '@/components/leads/highlight'
import { highlightPhone } from '@/components/leads/highlight'
import { displayDate, phoneDisplay, phoneLocal, relativeTime } from '@/lib/format'
import type { ProjectRow } from '@/lib/projects/model'
import { MembersCell, StageTag, holdWords } from './project-columns'
import { PROJECT_MENU_WIDTH, ProjectMenuItems, type ProjectMenuAction } from './project-menu'
import { holdSummary } from '@/lib/projects/hold'   // (gaps build, package A — M-01)
import { subLine } from './projects-table'
import styles from './project-cards.module.css'
import lead from '@/components/leads/lead-cards.module.css'   // (parity P-23) the lead card's tel line and its foot's links, composed

/**
 * (REG-924, REG-377) The listing at ≤767: a table of records is cards — the Leads listing's card (1082:25585, lead-cards.module.css): the
 * name and its age with the chevron (the whole row opens the project), the client · property line, the stage and the dates, then the team
 * and the row's menu. A reason it needs attention reads in the red under the facts.
 * (parity P-23, B-07) The lead card's grammar: the corner is the record's age (Q-09 — the lead card's "1d ago"), the client · property line
 * leads with the client's phone as the lead card's `tel` link (UX audit L11), and the foot's members assign from the card (P-17).
 */
export function ProjectCards({ rows, query, now, onOpen, onMenu, onAssign, reason }: { rows: ProjectRow[]; query: string; now: number; onOpen: (r: ProjectRow) => void; onMenu: (r: ProjectRow, a: ProjectMenuAction) => void; /** (parity P-17) the foot's person_add / Assign */ onAssign?: (r: ProjectRow, anchor: HTMLElement) => void; /** (fix-E, E-21) a scope's own reason line */ reason?: (r: ProjectRow) => string | null }) {
  const q = query.trim()
  const hit = (t: string) => (q ? highlightMatch(t, q) : t)
  return (
    <div className={styles.list} data-kb-list="project">
      {rows.map((r) => (
        <article key={r.id} className={styles.card} data-kb-row data-kb-id={r.id}>
          <div className={styles.identity}>
            <button type="button" className={styles.head} onClick={() => onOpen(r)} data-kb-open>
              <span className={styles.name}>{hit(r.name)}</span>
              {/* (parity P-23, Q-09) the corner is the record's age, as the lead card's */}
              <span className={styles.meta}><span data-testid="card-age">{relativeTime(r.createdAt, new Date(now))}</span><Icon name="keyboard_arrow_right" size={20} weight={300} /></span>
            </button>
            <p className={styles.info}>
              {/* (parity P-23) the client's number dials, as the lead card's first fact (UX audit L11) */}
              {r.phone ? <><span className={lead.telWrap}><a className={lead.tel} href={`tel:${phoneDisplay(r.phone).replace(/\s/g, '')}`} aria-label={`Call ${r.client}, ${phoneLocal(r.phone)}`} data-testid="card-tel">{q ? highlightPhone(phoneLocal(r.phone), q) : phoneLocal(r.phone)}</a></span><span className={styles.dot} aria-hidden>·</span></> : null}
              <span>{hit(subLine(r))}</span>   {/* (fix-A, A-31) what the name doesn't say */}
            </p>
          </div>
          <p className={styles.info}>
            <span>{r.number}</span>
            <span className={styles.dot} aria-hidden>·</span>
            <span>{r.startDate ? `${r.startDate.getTime() <= now ? 'Started' : 'Starts'} ${displayDate(r.startDate)}` : 'No start date'}</span>   {/* (fix-A, A-30) tense by the date */}
            {r.targetEndDate ? <><span className={styles.dot} aria-hidden>·</span><span>Ends {displayDate(r.targetEndDate)}</span></> : null}
            {r.hold ? <><span className={styles.dot} aria-hidden>·</span><span data-testid="card-hold">{holdWords(r.hold)}</span></> : null}{/* (gaps build, package A — M-01) */}
          </p>
          {((w) => (w ? <p className={styles.why} data-testid="card-attention">{w}</p> : null))(reason ? reason(r) : r.attention.join(' · ') || null)}
          <hr className={styles.rule} />
          <div className={styles.foot}>
            <div className={styles.members}><MembersCell row={r} onAssign={onAssign ? (el) => onAssign(r, el) : undefined} card /></div>   {/* (parity P-17) the lead card's foot */}
            <StageTag stage={r.stage} hold={r.hold} now={now} />
            <CardMenu row={r} onPick={(a) => onMenu(r, a)} now={now} />
          </div>
        </article>
      ))}
    </div>
  )
}

function CardMenu({ row, onPick, now }: { row: ProjectRow; onPick: (a: ProjectMenuAction) => void; now: number }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  return (
    <span ref={anchor} className={styles.menuWrap}>
      <IconButton icon="more_vert" label={`More actions for ${row.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={PROJECT_MENU_WIDTH} role="menu" sheetTitle={row.name}>   {/* (parity P-11) the project menu's one width, K-A2's */}
        <ProjectMenuItems project={{ direct: row.direct, quoteId: row.quoteId, contractId: row.contractId, stage: row.stage, hold: row.hold ? holdSummary(row.hold, now) : null }} ends={row.ends} canRename={row.ends?.mayHandover ?? true} edit onPick={(a) => { setOpen(false); onPick(a) }} />
      </PortalMenu>
    </span>
  )
}
