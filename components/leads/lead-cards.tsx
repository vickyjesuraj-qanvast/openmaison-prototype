'use client'

import { useRef } from 'react'
import { Tag } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { ScopePill } from '@/components/om/scope-pill'
import { highlightMatch, highlightPhone } from '@/components/leads/highlight'
import type { LeadRow } from '@/lib/leads/queries'
import { isOverdue, phoneDisplay, phoneLocal } from '@/lib/format'
import { agoWords, budgetCard } from '@/lib/leads/row-text'
import { cardLines, parked, waHref } from './lead-card-words'
import styles from './lead-cards.module.css'

export type LeadCardsProps = {
  rows: LeadRow[]
  now: number
  query: string
  /** The lead whose stage menu is open — its button turns the chevron up. */
  openStageId: string | null
  /** (Leads on the move, P-05 · A-01) Leads nobody has opened or clicked yet — the tablet row's band and a New tag on the card. */
  unseenIds?: Set<string>
  /** First interaction with an unseen lead's card clears its mark (the table's `onRowSeen`). */
  onSeen?: (row: LeadRow) => void
  onOpen: (row: LeadRow) => void
  onStageClick: (row: LeadRow, anchor: HTMLElement) => void
  onTaskClick: (row: LeadRow, anchor: HTMLElement) => void
  onAssignClick: (row: LeadRow, anchor: HTMLElement) => void
}

/**
 * Lead Listing · mobile (1082:23305, REG-299): the table becomes a column of "Card / Desktop / Leads" (1082:25585)
 * at ≤767 — the workspace swaps this in for the table AND the kanban there. One card per lead, p16 / gap 12 /
 * r8 / level-1, four rows as mocked:
 *   head  — name heading/h4 (truncates) · age body/s · keyboard_arrow_right 20 Light — the whole row opens the lead
 *   info  — phone · S$budget · source, body/m secondary, wrapping on "·"
 *   task  — the first task in a bordered box with the Overdue tag and "+n" (the table's cell), or the "Add Task" link
 *   foot  — members left (avatars + the 24px person_add, or the "Assign" link) · the stage as an outlined button right
 * Every press hands the SAME anchors to the SAME popovers the table uses (stage menu, tasks, assign), so the stage
 * policy, Suggested tasks and the assign rules are one code path. Not mocked and therefore absent: the unseen band,
 * row selection / the bulk bar, and the row kebab (Edit / Delete / Return live on the lead's own page).
 *
 * (Leads on the move, L3 — P-05, his marks 2026-10-23: "keep the card; add Last and Next … the new mark … WhatsApp beside the number, three items on
 * the info line") The card says who to call now, in the canvas's anatomy:
 *   · a new, unseen lead wears the tablet's 4px primary band and a New tag beside its name (A-01 — supersedes REG-299's "no unseen band");
 *   · the info line is the canvas's three items again — the number (it dials) with WhatsApp beside it (A-05) · S$budget · source; the days in the
 *     stage moved to the lines below (A-04: four items wrapped after a dangling dot);
 *   · two 14 lines (lead-card-words.ts): Last — "Call · Callback requested · Mon" or "Not contacted yet" — and Next — the earliest follow-up's day
 *     and time, red once late, the task box under it naming it (A-03); a Lost card says "Lost 51 days ago · {reason}" (A-28); an On Hold card
 *     "Follow up on 12 Nov"; a parked lead's task wears no Overdue tag (A-28);
 *   · the foot leads with the stage pill, the members after it (A-02: the Maison AI button floats over the foot's right end — the pill sat
 *     there and the button took its taps; the right end now holds no control).
 */
/** (REG-729) The card's stage (1082:25603 — h36, pl16 pr12, gap 8, subheading/m, the chevron turning while its menu is open) is the house
 *  ScopePill, the anatomy it was drawn from; it hands its own box to the stage menu as the anchor, as the table's cell does. */
function StagePill({ row, open, onStageClick }: { row: LeadRow; open: boolean; onStageClick: (row: LeadRow, anchor: HTMLElement) => void }) {
  const pill = useRef<HTMLButtonElement>(null)
  return <ScopePill ref={pill} label={row.stage} open={open} onClick={() => { if (pill.current) onStageClick(row, pill.current) }} />
}

export function LeadCards({ rows, now, query, openStageId, unseenIds, onSeen, onOpen, onStageClick, onTaskClick, onAssignClick }: LeadCardsProps) {
  return (
    <div className={styles.list}>
      {rows.map((row) => {
        const first = row.tasks[0]
        const overdue = !parked(row) && row.tasks.some((t) => isOverdue(t.dueAt, now))   // (A-28) a parked lead's follow-ups wait
        const extra = row.tasks.length - 1
        const unseen = !!unseenIds?.has(row.id)
        const wa = waHref(row.phone)
        const lines = cardLines(row, now)
        return (
          <article key={row.id} className={styles.card} data-unseen={unseen || undefined} data-lead-card={row.id}
                   onPointerDownCapture={unseen ? () => onSeen?.(row) : undefined}>
            {unseen ? <span className={styles.band} aria-hidden /> : null}
            {/* (REG-344, 1082:25586 "CellDataGroup") The name row and the info line are ONE block 4px apart, not two
                children of the card's 12px rhythm — the mock's 48-tall group above the task row. */}
            <div className={styles.identity}>
            <button type="button" className={styles.head} onClick={() => onOpen(row)}>
              <span className={styles.nameRow}>
                <span className={styles.name}>{highlightMatch(row.name, query)}</span>
                {/* (the calm UI build 2026-10-27 — 2-15, W-272) no "NEW" tag beside the New stage: the card's left band says "not opened yet", as on the desk */}
              </span>
              <span className={styles.meta}>
                {/* The mock's "1d ago": the lead's age — (the calm UI build — 2-35, W-067) named and in words, "Added 2 days ago", as the kanban's Updated */}
                <span>Added {agoWords(row.createdAt, now)}</span>
                <Icon name="keyboard_arrow_right" size={20} weight={300} />
              </span>
            </button>
            <p className={styles.info}>
              {/* (UX audit L11) On a phone the number calls: the house's copy / WhatsApp live on the lead's page, a card's number dials. */}
              <span className={styles.telWrap}>
                <a className={styles.tel} href={`tel:${phoneDisplay(row.phone).replace(/\s/g, '')}`} aria-label={`Call ${row.name}, ${phoneLocal(row.phone)}`}>{highlightPhone(phoneLocal(row.phone), query)}</a>
                {/* (A-05) WhatsApp beside the number — the identity block's glyph (858:24788), its own 44 box, wa.me on the press */}
                {wa ? (
                  <a className={styles.wa} href={wa} target="_blank" rel="noopener" aria-label={`WhatsApp ${row.name}`} data-testid="card-whatsapp">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/figma-assets/whatsapp-grey.svg" width={16} height={16} alt="" />
                  </a>
                ) : null}
              </span>
              <span className={styles.dot} aria-hidden>·</span>
              <span>{budgetCard(row.budgetMinor)}</span>   {/* (UX audit L8) no budget known reads "--", never S$0 */}
              <span className={styles.dot} aria-hidden>·</span>
              <span>{highlightMatch(row.source, query)}</span>
            </p>
            </div>
            {/* (A-03 · A-28) who to call now: Last · Next, or why and when a Lost lead was lost */}
            <dl className={styles.lines} data-testid="card-lines">
              {lines.map((l) => (
                <div key={l.label} className={styles.line} data-late={l.late || undefined} data-line={l.label.toLowerCase()}>
                  <dt className={styles.lineLabel}>{l.label}</dt>
                  <dd className={styles.lineText}>{l.text}{l.late ? <span className="visually-hidden"> — late</span> : null}</dd>
                </div>
              ))}
            </dl>
            {first ? (
              <button type="button" className={styles.taskBox} onClick={(e) => onTaskClick(row, e.currentTarget)}>
                <span className={styles.taskText}>{highlightMatch(first.title, query)}</span>
                {overdue ? <Tag color="red" appearance="outlined">Overdue</Tag> : null}
                {extra > 0 ? <Tag appearance="outlined">{`+${extra}`}</Tag> : null}
              </button>
            ) : (
              <button type="button" className={styles.link} aria-label={`Add a task for ${row.name}`}
                      onClick={(e) => onTaskClick(row, e.currentTarget)}>
                <Icon name="add" size={20} />
                Add task
              </button>
            )}
            <hr className={styles.rule} />
            <div className={styles.foot}>
              <StagePill row={row} open={row.id === openStageId} onStageClick={onStageClick} />
              <div className={styles.members}>
                {row.assignees.length === 0 ? (
                  <button type="button" className={styles.link} onClick={(e) => onAssignClick(row, e.currentTarget)}>
                    <Icon name="person_add" size={20} />
                    Assign
                  </button>
                ) : (
                  <>
                    {row.assignees.slice(0, 2).map((m) => (
                      <Avatar key={m.id} name={m.name} color={m.color} size={24} />
                    ))}
                    {row.assignees.length > 2 ? <span className={styles.plusBox}>+{row.assignees.length - 2}</span> : null}
                    <IconButton icon="person_add" label={`Assign members to ${row.name}`} size={24}
                                onClick={(e) => onAssignClick(row, e.currentTarget)} />   {/* (the calm UI build — 2-06) the grey person-plus */}
                  </>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
