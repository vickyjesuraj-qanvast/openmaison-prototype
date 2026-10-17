'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { ACTIONS_TRAIL, gridTemplateFor, useColumnLayout, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { useColumnDrag } from '@/components/om/column-drag'
import { useOverflowX } from '@/components/om/use-overflow-x'
import { Avatar } from '@/components/om/avatar'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { displayDue } from '@/lib/format'
import { standingOf, tierOf } from '@/lib/meetings/model'
import type { MeetingRow, TeamMember } from '@/lib/meetings/queries'
import styles from './meetings-table.module.css'

/** What a row's ⋮ does. */
export type MeetingRowAction = 'open' | 'start' | 'edit' | 'invite' | 'write' | 'cancel' | 'delete'

/**
 * (pending modules S23) A meetings list on the listing's model (REG-430, the table core components/om/table-core.module.css): the meeting
 * frozen first and opening the meeting, the lead (Tools › Meeting Copilot only), when, where, who from the studio, where it stands and the
 * deal score; Open + ⋮ parked at the visible edge; Column settings (REG-454), head drag (REG-462), resizable heads (REG-427); the phone's cards
 * (REG-377). No mock draws it — the Contracts tab's twin (components/leads/contracts/contracts-table.tsx). *(invented copy: the column names
 * and the rows' second lines)*
 */
export const MEETING_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'title', label: 'Meeting', track: 'minmax(300px, 1fr)', locked: true },
  { key: 'lead', label: 'Lead', track: '180px' },
  { key: 'when', label: 'When', track: '220px' },
  { key: 'where', label: 'Where', track: '180px' },
  { key: 'people', label: 'People', track: '120px' },
  { key: 'status', label: 'Status', track: '168px' },
  { key: 'score', label: 'Deal score', track: '128px' },
]
export const meetingColumnDefs = (withLead: boolean) => MEETING_COLUMN_DEFS.filter((d) => d.key !== 'lead' || withLead)
const COL_CLASS: Record<string, string | undefined> = { title: styles.colTitle, lead: styles.colLead, when: styles.colWhen, where: styles.colWhere, people: styles.colPeople, status: styles.colStatus, score: styles.colScore }

/** The row's second line: how the meeting was recorded. */
export function sourceLine(r: Pick<MeetingRow, 'fromLog' | 'source' | 'status' | 'notes'>): string | null {
  if (r.fromLog) return 'Logged at Met'
  if (r.status === 'planned' || r.status === 'cancelled') return null
  if (r.status === 'live') return 'On now, with the co-pilot'
  return r.source === 'live' ? 'With the co-pilot' : r.source === 'recording' ? 'From a recording' : r.notes ? 'Written up from notes' : null
}
/** Under the status: what waits, or how the client answered. */
export function waitsLine(r: MeetingRow, now: number): { text: string; late: boolean } | null {
  const s = standingOf({ ...r, startsAt: r.startsAt }, now)
  if (s.waits === 'save') return { text: 'Brief to save', late: false }
  if (s.waits === 'write') return { text: 'Its planned time has passed', late: false }
  if (r.status === 'planned' && r.clientAnswer === 'yes') return { text: 'Client is coming', late: false }
  if (r.status === 'planned' && r.clientAnswer === 'no') return { text: 'The time doesn’t suit', late: true }
  if (r.status === 'held' && r.sharedAt) return { text: 'Notes shared', late: false }
  return null
}

export function MeetingsTable({ rows, team, columns, onReorder, onOpen, onAction, now, leadHref, mayChange, canDelete }: {
  rows: MeetingRow[]
  team: TeamMember[]
  columns: readonly TableColumn[]
  onReorder: (keys: string[]) => void
  onOpen: (r: MeetingRow) => void
  onAction: (r: MeetingRow, a: MeetingRowAction) => void
  /** The host's clock (never Date.now() in render). */
  now: number
  /** Tools › Meeting Copilot: the lead's Meetings tab, with the way back. */
  leadHref?: (r: MeetingRow) => string
  mayChange: boolean
  canDelete: (r: MeetingRow) => string | null
}) {
  const [menu, setMenu] = useState<string | null>(null)
  const widths = useColumnWidths('meetings')
  const tracks = gridTemplateFor(columns, widths, undefined, ACTIONS_TRAIL.pair)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)
  const L = { ...L0, style: (k: string) => ({ ...L0.style(k), ...D.style(k) }) }   /* (REG-614) the whole column travels */
  const [frame, overflowing] = useOverflowX()
  const memberOf = (id: string) => team.find((t) => t.id === id)
  const has = (k: string) => columns.some((c) => c.key === k)
  const cell = (k: string) => `${styles.cell} ${COL_CLASS[k] ?? ''} ${L.pinned(k) ? styles.pin : ''}`
  return (
    <div ref={frame} className={styles.card} role="table" aria-label="Meetings" data-drag-root="" data-kb-list="meeting" data-cols="meetings" data-overflow={overflowing || undefined} data-lead={has('lead') || undefined}
         style={{ '--tracks': tracks } as React.CSSProperties} onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)} data-testid="meetings-table">
      <div ref={headRow} className={styles.head} role="row">
        {columns.map((c) => (
          <div key={c.key} className={`${styles.hCell} ${COL_CLASS[c.key] ?? ''} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}>
            <span className={styles.hLabel}>{c.label}</span>
            <ColumnResizer table="meetings" column={c.key} label={c.label} min={c.key === 'title' ? 160 : 80} />
          </div>
        ))}
      </div>
      {rows.map((r) => {
        const s = standingOf(r, now)
        const waits = waitsLine(r, now)
        const people = r.memberIds.map(memberOf).filter((m): m is TeamMember => !!m)
        const second = sourceLine(r)
        const open = menu === r.id
        const noDelete = r.fromLog ? 'a Met log — edit it in the Move stage window' : canDelete(r)
        return (
          <MeetingRowView key={r.id} r={r} open={open} onToggle={() => setMenu((m) => (m === r.id ? null : r.id))} onClose={() => setMenu(null)}
            pick={(a) => { setMenu(null); onAction(r, a) }} mayChange={mayChange} noDelete={noDelete} planned={s.word === 'Upcoming'} due={s.word === 'To write up'}>
            <div className={cell('title')} role="cell" data-col="title" data-pin-edge={L.edge('title') || undefined} style={L.style('title')}>
              <span className={styles.titleStack}>
                <button type="button" className={styles.title} onClick={() => onOpen(r)} data-kb-open data-testid="meeting-title">{r.title}</button>
                {second ? <span className={styles.sub}>{second}</span> : null}
              </span>
            </div>
            {has('lead') ? (
              <div className={cell('lead')} role="cell" data-col="lead" data-pin-edge={L.edge('lead') || undefined} style={L.style('lead')}>
                {leadHref ? <Link href={leadHref(r)} className={styles.leadLink}>{r.leadName}</Link> : <span>{r.leadName}</span>}
              </div>
            ) : null}
            <div className={cell('when')} role="cell" data-col="when" data-pin-edge={L.edge('when') || undefined} style={L.style('when')}>
              <span className={styles.oneLine} data-testid="meeting-when">{r.startsAt ? displayDue(new Date(r.startsAt)) : '--'}</span>
            </div>
            <div className={cell('where')} role="cell" data-col="where" data-pin-edge={L.edge('where') || undefined} style={L.style('where')}>
              <span className={styles.titleStack}>
                <span className={styles.oneLine}>{r.whereKind}</span>
                {r.place ? <Tooltip label={r.place} whenCut><span className={`${styles.sub} ${styles.oneLine}`}>{r.place}</span></Tooltip> : null}
              </span>
            </div>
            <div className={cell('people')} role="cell" data-col="people" data-pin-edge={L.edge('people') || undefined} style={L.style('people')}>
              {people.length ? <span className={styles.people}>{people.slice(0, 2).map((m) => <Avatar key={m.id} name={m.name} color={m.color} size={24} />)}{people.length > 2 ? <span className={styles.plus}>+{people.length - 2}</span> : null}</span> : <span className={styles.muted}>--</span>}
            </div>
            <div className={cell('status')} role="cell" data-col="status" data-pin-edge={L.edge('status') || undefined} style={L.style('status')} data-sub={waits ? '' : undefined}>
              <span className={styles.titleStack}>
                <span className={styles.oneLine} data-testid="meeting-status">{s.word}</span>
                {waits ? <span className={styles.waits} data-late={waits.late || undefined} data-testid="meeting-waits">{waits.text}</span> : null}
              </span>
            </div>
            <div className={cell('score')} role="cell" data-col="score" data-pin-edge={L.edge('score') || undefined} style={L.style('score')}>
              {r.score !== null && r.score > 0 ? <span className={styles.oneLine} data-testid="meeting-score">{r.score} · {tierOf(r.score)}</span> : <span className={styles.muted}>--</span>}
            </div>
          </MeetingRowView>
        )
      })}
    </div>
  )
}

function MeetingRowView({ r, open, onToggle, onClose, pick, mayChange, noDelete, planned, due, children }: {
  r: MeetingRow; open: boolean; onToggle: () => void; onClose: () => void; pick: (a: MeetingRowAction) => void
  mayChange: boolean; noDelete: string | null; planned: boolean; due: boolean; children: React.ReactNode
}) {
  const kebab = useRef<HTMLSpanElement>(null)
  const live = r.status === 'live'
  return (
    <div className={styles.row} role="row" data-kb-row data-kb-id={r.id} data-testid="meeting-row" data-status={r.status}>
      {children}
      <span className={styles.actions} data-open={open || undefined}>
        <span className={styles.actionsInner}>
          <span className={styles.float}>
            <Button variant="primary" appearance="outlined" onPress={() => pick('open')}>{live ? 'Rejoin' : 'Open'}</Button>
          </span>
          <span className={styles.menuWrap} ref={kebab}>
            <span className={styles.float}>
              <Tooltip label="More actions" disabled={open}>
                <IconButton icon="more_vert" label={`More actions for ${r.title}`} variant="primary" aria-haspopup="menu" aria-expanded={open} onClick={onToggle} />
              </Tooltip>
            </span>
            <PortalMenu open={open} anchor={kebab} onClose={onClose} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={r.title}>
              <DropdownItem onSelect={() => pick('open')}>{live ? 'Rejoin the meeting' : r.status === 'held' ? 'Open the brief' : 'Open'}</DropdownItem>
              {mayChange && planned ? <DropdownItem onSelect={() => pick('start')}>Start the meeting</DropdownItem> : null}
              {mayChange && (planned || due) ? <DropdownItem onSelect={() => pick('edit')}>Change the plan</DropdownItem> : null}
              {mayChange && planned ? <DropdownItem onSelect={() => pick('invite')}>Send the invitation</DropdownItem> : null}
              {mayChange && (due || (r.fromLog && !r.notes) || (r.fromLog && r.notes)) ? <DropdownItem onSelect={() => pick('write')}>Write it up</DropdownItem> : null}
              {mayChange && r.status === 'planned' ? <DropdownItem onSelect={() => pick('cancel')}>Cancel the meeting</DropdownItem> : null}
              {mayChange ? <DropdownItem tone="danger" disabled={!!noDelete || live} title={live ? 'end it first' : noDelete ?? undefined} onSelect={() => pick('delete')}>Delete</DropdownItem> : null}
            </PortalMenu>
          </span>
        </span>
      </span>
    </div>
  )
}
