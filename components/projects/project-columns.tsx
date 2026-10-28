'use client'

import type { ReactNode } from 'react'
import { Tag } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import type { TableColumnDef } from '@/components/om/table-columns'
import type { StatementSpec } from '@/lib/leads/export'
import { IconButton } from '@/components/om/icon-button'
import { displayDate, displayDateLong, displayDateTime, moneyCard, relativeTime } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { holdSummary } from '@/lib/projects/hold'   // (gaps build, package A — M-01)
import { marginCell } from '@/lib/finance/profit'   // (gaps build F2)
import { PROJECT_STAGES, STAGE_LABEL, STAGE_TONE, type ProjectRow } from '@/lib/projects/model'
import styles from './projects-table.module.css'
import lead from '@/components/leads/table.module.css'   // (parity P-17) the Leads listing's Members cell — its own classes, never copied
import leadCard from '@/components/leads/lead-cards.module.css'   // …and the lead card's foot (parity P-23)
import { NextMilestoneCell, ProgressCell, nextMilestoneText, progressText } from './schedule/schedule-cells'

/**
 * (REG-924) The Projects listing's columns — ONE registry the table, Column settings, the phone cards' facts, sorting and the export read.
 * Round 1: Project · Number · Stage · Members (parity P-17; was Team) · Contract value (Owners and Admins, Q-06) · Started · Target end · Last activity. Rounds 2–6 add
 * Next milestone, Progress, Last update and Collected by adding an entry here (and the field its loader fills on `ProjectRow`); nothing
 * else in the table changes. `money` columns are dropped for a viewer who may not see the studio's money (`seesStudioMoney`).
 */
export type ProjectColumn = TableColumnDef & {
  /** The cell's content, inside the house cell. `onAssign` (parity P-17): the Members cell's person_add / Assign, anchored on the press. */
  cell: (r: ProjectRow, ctx: { now: number; onAssign?: (r: ProjectRow, anchor: HTMLElement) => void }) => ReactNode
  /** Orders the list when its head is pressed; none = the head is a plain label (REG-468). */
  sort?: (a: ProjectRow, b: ProjectRow) => number
  /** The cell as text, for the export. */
  text: (r: ProjectRow) => string
  money?: boolean
}

const dateCell = (d: Date | null) => (d ? <Tooltip label={displayDateTime(d)}><span>{displayDate(d)}</span></Tooltip> : <span className={styles.none}>—</span>)
const byDate = (k: 'startDate' | 'targetEndDate' | 'lastActivity' | 'createdAt') => (a: ProjectRow, b: ProjectRow) => (a[k]?.getTime() ?? Infinity) - (b[k]?.getTime() ?? Infinity)

export function StageTag({ stage, hold, now }: { stage: ProjectRow['stage']; /** (gaps build, package A — M-01) the mark beside the stage */ hold?: ProjectRow['hold']; now?: number }) {
  const tone = STAGE_TONE[stage]
  const tag = tone === 'default' ? <Tag appearance="outlined">{STAGE_LABEL[stage]}</Tag> : <Tag appearance="outlined" color={tone}>{STAGE_LABEL[stage]}</Tag>
  if (!hold) return tag
  return (
    <span className={styles.stageHold} data-testid="stage-hold">
      {tag}
      <Tooltip label={holdSummary(hold, now ?? hold.since)}><span className={styles.holdMark} role="img" aria-label="On hold"><Icon name="pending" size={20} weight={300} /></span></Tooltip>
    </span>
  )
}
/** (gaps build, package A — M-01) The row's words for a hold — the Leads listing's "On hold till: …" (REG-329's place: the row's second line).
    (parity P-14, B-11) Its words to the letter: the colon and the day ("On hold till: Sat, 24 Oct ’26", Dane UAT 5.13). */
export const holdWords = (hold: NonNullable<ProjectRow['hold']>) => (hold.until ? `On hold till: ${displayDateLong(new Date(hold.until))}` : 'On hold')

/**
 * (parity P-17, B-05 · REG-290) The project's people are its lead's members, and the cell is the Leads listing's Members cell
 * (components/leads/table.tsx `assignees`): two avatars, the bordered "+n" box, the 24 person_add that opens the Assign popover on the row —
 * or, with nobody on it, the "Assign" link. `card`: the lead card's foot (components/leads/lead-cards.tsx) — the same pieces in the card's
 * classes, its "Assign" the card's link. `onAssign` absent: the avatars alone (a read-only place).
 */
export function MembersCell({ row, onAssign, kb = false, card = false }: { row: Pick<ProjectRow, 'name' | 'team'>; onAssign?: (anchor: HTMLElement) => void; /** the row's A key (REG-713), as the listing's cell */ kb?: boolean; card?: boolean }) {
  const team = row.team
  if (!team.length) {
    return onAssign ? (
      <button type="button" className={card ? leadCard.link : lead.assignLink} onClick={(e) => onAssign(e.currentTarget)} data-kb={kb ? 'assign' : undefined} data-testid="members-assign">
        <Icon name="person_add" size={20} />
        Assign
      </button>
    ) : <span className={styles.none}>—</span>
  }
  const add = onAssign ? <IconButton icon="person_add" label={`Assign members to ${row.name}`} size={24} variant="primary" onClick={(e) => onAssign(e.currentTarget)} /> : null
  return (
    <span className={card ? styles.cardMembers : lead.memberStack} data-kb={kb && onAssign ? 'assign' : undefined} data-testid="members-cell">
      {team.slice(0, 2).map((m) => <Avatar key={m.id} name={m.name} color={m.color} size={24} />)}
      {team.length > 2 ? <span className={card ? leadCard.plusBox : lead.plusBox}>+{team.length - 2}</span> : null}
      {add && !card ? <Tooltip label="Assign members">{add}</Tooltip> : add}
    </span>
  )
}

export const PROJECT_COLUMNS: ProjectColumn[] = [
  {
    key: 'project', label: 'Project', track: 'minmax(240px, 1fr)', locked: true,
    cell: () => null,   // the table draws the identity cell itself (name over client · property, the open press)
    sort: (a, b) => a.name.localeCompare(b.name), text: (r) => r.name,
  },
  { key: 'number', label: 'Number', track: '132px', cell: (r) => <span className={styles.oneLine}>{r.number}</span>, sort: (a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }), text: (r) => r.number },
  /* (gaps build, package A — M-01) "On hold" beside the stage; it sorts after the running ones of its stage, and the export says it */
  { key: 'stage', label: 'Stage', track: '128px', cell: (r, { now }) => <StageTag stage={r.stage} hold={r.hold} now={now} />, sort: (a, b) => PROJECT_STAGES.indexOf(a.stage) - PROJECT_STAGES.indexOf(b.stage) || Number(!!a.hold) - Number(!!b.hold), text: (r) => `${STAGE_LABEL[r.stage]}${r.hold ? ' · On hold' : ''}` },   // (fix-A, A-24) the journey's order
  /* (parity P-17 · P-22) "Members" (REG-290) — the key stays `team` (the address' `?team=`, saved Column settings); the lead's cell, 160 as the
     lead's column; no sort (REG-468: several people per cell — the lead's Members lost its glyph) */
  { key: 'team', label: 'Members', track: '160px', cell: (r, { onAssign }) => <MembersCell row={r} onAssign={onAssign ? (el) => onAssign(r, el) : undefined} kb />, text: (r) => r.team.map((m) => m.name).join(', ') },
  { key: 'value', label: 'Contract value', track: '172px', money: true, cell: (r) => (r.contractValueMinor ? <span className={styles.oneLine}>{moneyCard(r.contractValueMinor)}</span> : <span className={styles.none}>—</span>), sort: (a, b) => (a.contractValueMinor ?? 0) - (b.contractValueMinor ?? 0), text: (r) => (r.contractValueMinor ? (r.contractValueMinor / 100).toFixed(2) : '') },
  /* (Projects round 6, F-19) what the client has paid of it — the payments that count; Owners and Admins, as Contract value */
  { key: 'collected', label: 'Collected', track: '172px', money: true, cell: (r) => (r.collectedMinor ? <span className={styles.oneLine}>{moneyCard(r.collectedMinor)}</span> : <span className={styles.none}>—</span>), sort: (a, b) => (a.collectedMinor ?? 0) - (b.collectedMinor ?? 0), text: (r) => (r.collectedMinor ? (r.collectedMinor / 100).toFixed(2) : '') },
  /* (pending modules S45A — H-UHD-3; Urban Home Design's project summary, 1.0 4da810229 "Total Sales — Initial Amount bf GST") the sale as signed,
     before GST — the Sales report's Won value, the one rule `signedNetBy`; in Column settings, off until a studio turns it on; Owners and Admins
     (a money column). Its tooltip says what it stands on, so it never reads as Contract value less GST (which carries the variation orders). */
  { key: 'valueNet', label: 'Value before GST', track: '188px', money: true, hidden: true, cell: (r) => valueNetCell(r), sort: (a, b) => (a.signedValue?.netMinor ?? -1) - (b.signedValue?.netMinor ?? -1), text: (r) => (r.signedValue ? (r.signedValue.netMinor / 100).toFixed(2) : '') },
  /* (S45A — UHD's "Sign Date") the day the client signed — the signed quote's or the contract's signature, else the Won day; off at first */
  { key: 'signedOn', label: 'Signed on', track: '136px', hidden: true, cell: (r) => signedOnCell(r), sort: (a, b) => (a.signedOn?.at ?? Infinity) - (b.signedOn?.at ?? Infinity), text: (r) => (r.signedOn ? displayDate(new Date(r.signedOn.at)) : '') },
  /* (parity P-22, B-09) 136, Target end's track: the head holds its label and its glyph (REG-723) */
  { key: 'started', label: 'Start date', track: '136px', cell: (r) => dateCell(r.startDate), sort: byDate('startDate'), text: (r) => (r.startDate ? displayDate(r.startDate) : '') },
  { key: 'targetEnd', label: 'Target end', track: '136px', cell: (r) => dateCell(r.targetEndDate), sort: byDate('targetEndDate'), text: (r) => (r.targetEndDate ? displayDate(r.targetEndDate) : '') },
  { key: 'activity', label: 'Last activity', track: '156px', cell: (r, { now }) => <Tooltip label={displayDateTime(r.lastActivity)}><span className={styles.oneLine}>{relativeTime(r.lastActivity, new Date(now))}</span></Tooltip>, sort: byDate('lastActivity'), text: (r) => displayDateTime(r.lastActivity) },
  /* (Projects round 2) the schedule's: the next unfinished milestone with its day count (late ones first when sorted), and done of all */
  { key: 'nextMilestone', label: 'Next milestone', track: '220px', cell: (r) => <NextMilestoneCell s={r.schedule} />, sort: (a, b) => nextKey(a) - nextKey(b), text: (r) => nextMilestoneText(r.schedule) },
  { key: 'progress', label: 'Progress', track: '168px', cell: (r) => <ProgressCell s={r.schedule} />, sort: (a, b) => (a.schedule?.progress.pct ?? -1) - (b.schedule?.progress.pct ?? -1), text: (r) => progressText(r.schedule) },
  /* (REG-956, round 3) the newest update the client can see — "--" until one is published */
  /* (gaps build, package A — 8; 1.0 A-39) the project type, in Column settings — off until a studio turns it on, so the listing stays as drawn */
  /* (parity P-22, B-09) a category the Filters serve — no sort, as the lead's Property Type (REG-468) */
  { key: 'projectType', label: 'Project type', track: '200px', hidden: true, cell: (r) => (r.projectType ? <span className={styles.oneLine}>{r.projectType}</span> : <span className={styles.none}>—</span>), text: (r) => r.projectType ?? '' },
  /* (S45A — UHD's "Lead Type") the lead's source, as the Leads listing's Source column shows it (132, no sort — a category, REG-468); off at first */
  { key: 'source', label: 'Source', track: '132px', hidden: true, cell: (r) => (r.source ? <span className={styles.oneLine}>{r.source}</span> : <span className={styles.none}>—</span>), text: (r) => r.source ?? '' },
  { key: 'lastUpdate', label: 'Last update', track: '144px', cell: (r, { now }) => (r.lastUpdate ? <Tooltip label={displayDateTime(r.lastUpdate)}><span className={styles.oneLine}>{relativeTime(r.lastUpdate, new Date(now))}</span></Tooltip> : <span className={styles.none}>—</span>), sort: (a, b) => (a.lastUpdate?.getTime() ?? 0) - (b.lastUpdate?.getTime() ?? 0), text: (r) => (r.lastUpdate ? displayDateTime(r.lastUpdate) : '') },
  /* (gaps build F2 — F2-Q1 · Q2) profit's margin with its tier, in Column settings — off at first; Owners and Admins (a money column) */
  { key: 'margin', label: 'Margin', track: '176px', money: true, hidden: true, cell: (r) => marginTag(r), sort: (a, b) => marginKey(a) - marginKey(b), text: (r) => (r.profit ? marginCell(r.profit).text : '') },
]
/** (S45A) Value before GST's cell: the figure in whole dollars (Contract value's), its tooltip naming what it stands on. *(invented copy)* */
function valueNetCell(r: ProjectRow) {
  const v = r.signedValue
  if (!v) return <span className={styles.none}>—</span>
  const with_ = v.minor !== v.netMinor ? `${money2(v.minor)} with GST` : 'no GST on it'
  const label = v.from === 'quote' ? `Quote ${v.quoteNumber ?? ''} as signed: ${with_} · variation orders not included` : `The value agreed: ${with_} · variation orders not included`
  return <Tooltip label={label}><span className={styles.oneLine}>{moneyCard(v.netMinor)}</span></Tooltip>
}
/** (S45A) Signed on's cell: the day, its tooltip naming the signature (or the Won day when none is on record). *(invented copy)* */
function signedOnCell(r: ProjectRow) {
  const s = r.signedOn
  if (!s) return <span className={styles.none}>—</span>
  const at = new Date(s.at)
  const label = s.by === 'quote' ? `Quote ${s.ref ?? ''} signed · ${displayDateTime(at)}` : s.by === 'contract' ? `${s.ref ?? 'The contract'} signed · ${displayDateTime(at)}` : `Won · ${displayDateTime(at)} — no signature on record`
  return <Tooltip label={label}><span className={styles.oneLine}>{displayDate(at)}</span></Tooltip>
}
/** (gaps build F2) the margin as the Pipeline prints it — a tier's tag, else its words ("Early estimate", "No costs yet", "--") */
const marginTag = (r: ProjectRow) => { if (!r.profit) return <span className={styles.none}>—</span>; const c = marginCell(r.profit); return c.tone === 'default' ? <span className={styles.none}>{c.text}</span> : <Tag appearance="outlined" color={c.tone}>{c.text}</Tag> }
const marginKey = (r: ProjectRow) => (r.profit && r.profit.state !== 'no_contract' && r.profit.state !== 'no_costs' ? r.profit.marginPct : Infinity)
/** (Projects round 2) Days to the next milestone's end — a late one counts below zero; no schedule sorts last. */
const nextKey = (r: ProjectRow) => (r.schedule?.next ? (r.schedule.next.late ? -r.schedule.next.days : r.schedule.next.days) : Infinity)

export const projectColumns = (studioMoney: boolean, /** (pending modules S41b-1) the Margin column */ margins = studioMoney): ProjectColumn[] => PROJECT_COLUMNS.filter((c) => (!c.money || studioMoney) && (c.key !== 'margin' || margins))

/**
 * (parity P-25, B-15) Export Projects is the Leads listing's statement (REG-610): the period reads the Start date; "Everything" is what the
 * export always wrote — the project, its client, property and property type, then every column this viewer may see (money only for Owners and
 * Admins, as the registry they're handed) — and "As the list shows" the listing's visible columns in Column settings' order, the Project
 * column carrying the client · property its second line shows.
 */
export function projectStatement(registry: ProjectColumn[]): StatementSpec<ProjectRow> {
  const rest = registry.filter((c) => c.key !== 'project')
  return {
    one: 'project', many: 'projects', dateLabel: 'Start date', dateOf: (r) => r.startDate,
    columns: [
      { key: 'project', label: 'Project', value: (r) => r.name },
      { key: 'client', label: 'Client', value: (r) => r.client },
      { key: 'property', label: 'Property', value: (r) => r.property ?? '' },
      { key: 'propertyType', label: 'Property type', value: (r) => r.propertyType },   /* (gaps build, package A — 8) beside the property */
      ...rest.map((c) => ({ key: c.key, label: c.label, value: c.text })),
    ],
    listing: { project: ['project', 'client', 'property'], ...Object.fromEntries(rest.map((c) => [c.key, [c.key]])) },
    title: 'OpenMaison — Projects', file: 'openmaison-projects',   // the lead statement's file name, dated (was projects.csv)
  }
}
