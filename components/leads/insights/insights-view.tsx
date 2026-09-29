'use client'

import { useMemo, useRef, useState } from 'react'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { PageReveal } from '@/components/shell/page-reveal'
import { InsightsGhost } from './insights-ghost'
import { ChipRail } from '@/components/om/chip-rail'
import { MetaChip } from '@/components/om/meta-chip'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { ColumnResizer, useColumnWidths } from '@/components/om/column-resize'
import { gridTemplateFor, useColumnLayout, useTableColumns, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { useColumnDrag } from '@/components/om/column-drag'
import { Chips } from '@/components/om/chips'
import { StatTile } from '@/components/om/stat-tile'
import { useMaisonAi } from '@/lib/maison-ai'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { LEGS, RANGES, formatTat, insightsReport, tatGrade, type MemberRow, type Range } from '@/lib/leads/tat'
import type { InsightsData } from '@/lib/leads/insights'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './insights-view.module.css'

/*
 * (REG-611, parity Q-24 · R-01) Leads › Insights — 1.0's Performance view, no mock: built on 2.0's own pieces as the owner asked
 * (the L2 header, the Filters modal's chips, the X-Ray's tiles, the DS MetaChip, the listing's table model with Column settings).
 * Every number is derived per range in the browser from the facts the loader hands over (lib/leads/tat.ts). Owners and Admins;
 * anyone else meets the gate.
 */
const AI_SUGGESTIONS = ['Who is slowest to make first contact?', 'Which leads are still unassigned?', 'Summarise this month’s turnaround']
const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`

const MEMBER_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'member', label: 'Member', track: 'minmax(220px, 220fr)', locked: true },
  { key: 'leads', label: 'Leads', track: 'minmax(96px, 96fr)' },
  { key: 'outreach', label: 'Assign → First outreach', track: 'minmax(220px, 220fr)' },
  { key: 'won', label: 'First outreach → Won', track: 'minmax(200px, 200fr)' },
  { key: 'wonCount', label: 'Won', track: 'minmax(88px, 88fr)' },
  { key: 'awaiting', label: 'Awaiting outreach', track: 'minmax(180px, 180fr)' },   /* (REG-723) each floor holds its label with the listing's 16 + 24 of padding */
]

export function InsightsView({ data, from }: { data: InsightsData | null; from?: string }) {
  const [range, setRange] = useState<Range>(30)
  const report = useMemo(() => (data ? insightsReport(data.facts, data.team, data.now, range) : null), [data, range])
  const mobile = useMediaQuery(MOBILE)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const columnPrefs = useTableColumns('insights-members', MEMBER_COLUMN_DEFS, mobile)
  useMaisonAi(AI_SUGGESTIONS)

  return (
    <PageReveal skeleton={<InsightsGhost />}>
      <div className={pageStyles.body}>
        <PageHeaderL2 backHref={from ?? '/leads'} crumb="Leads" title="Insights" />
        <div className={pageStyles.content}>
          {!data || !report ? (
            /* The gate (Q-41: Insights are Owners' and Admins'). Invented copy. */
            <div className={styles.gate} data-testid="insights-gate">
              <Icon name="lock" size={32} weight={300} />
              <span className={styles.gateTitle}>Insights are for Owners and Admins</span>
              <span className={styles.gateBody}>Ask your studio’s owner for the turnaround numbers.</span>
            </div>
          ) : (
            <>
              <div className={styles.bar}>
                <ChipRail label="Range">
                  {/* (REG-614) The house chips (components/om/chips) — a radio group, as the Move stage window's ChoiceChips. */}
                  <Chips label="Range" options={RANGES.map((r) => ({ value: r.key === null ? 'all' : String(r.key), label: r.label }))} value={range === null ? 'all' : String(range)} onChange={(v) => setRange(v === 'all' ? null : (Number(v) as Range))} />
                </ChipRail>
                <span className={styles.caption} data-testid="insights-range">Filtering on lead created date · {plural(report.inRange, 'lead')} in range</span>
              </div>

              {/* The three legs: the median as the headline (robust to outliers), avg · count under it, the change vs the prior window. */}
              <div className={styles.tiles} data-testid="insights-tiles">
                {LEGS.map(({ key, label }) => {
                  const s = report.legs[key]
                  const grade = key === 'outreach' ? tatGrade(s.median) : null
                  return (
                    <StatTile key={key} testId={`tile-${key}`} label={label} value={formatTat(s.median)} grade={grade ?? undefined} help={s.count ? `median · avg ${formatTat(s.mean)} · ${plural(s.count, 'lead')}` : 'No completed legs in this range'}>
                      {s.delta !== null ? (
                        <span className={styles.tileDelta}>
                          {/* A DECREASE is improving (1.0). */}
                          <MetaChip color={s.delta < 0 ? 'green' : 'red'} icon={s.delta < 0 ? 'arrow_downward' : 'arrow_upward'}>{`${Math.abs(s.delta)}% vs prior · ${s.delta < 0 ? 'improving' : 'slower'}`}</MetaChip>
                        </span>
                      ) : null}
                    </StatTile>
                  )
                })}
              </div>

              {report.awaitingAssignment > 0 || report.awaitingOutreach > 0 ? (
                <div className={styles.awaiting} data-testid="insights-awaiting">
                  {report.awaitingAssignment > 0 ? <MetaChip color="yellow" icon="person_add">{`${plural(report.awaitingAssignment, 'lead')} awaiting assignment`}</MetaChip> : null}
                  {report.awaitingOutreach > 0 ? <MetaChip color="yellow" icon="schedule">{`${report.awaitingOutreach} assigned, no outreach logged yet`}</MetaChip> : null}
                </div>
              ) : null}

              <section className={styles.section} aria-label="By team member">
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.sectionTitle}>By team member</span>
                    <span className={styles.sectionHelp}>Outreach & conversion attributed to whoever logged the first outreach</span>
                  </div>
                  {mobile ? null : (
                    <Tooltip label="Column settings">
                      <IconButton icon="tune" label="Column settings" onClick={() => setColumnsOpen(true)} />
                    </Tooltip>
                  )}
                </div>
                {report.members.length === 0 ? (
                  <p className={styles.empty}>No leads in this range.</p>
                ) : (
                  <MembersTable rows={report.members} columns={columnPrefs.columns} onReorder={columnPrefs.reorder} />
                )}
              </section>
              <p className={styles.foot}>Medians shown as headline (robust to outliers). Leads with no outreach yet are excluded from elapsed-time math and counted in “Awaiting outreach”.</p>
            </>
          )}
        </div>
      </div>
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
    </PageReveal>
  )
}

/** The By team member table — the Qanvast Ops table's structure (frozen Member, resizable and draggable heads, Column settings). */
function MembersTable({ rows, columns, onReorder }: { rows: MemberRow[]; columns: readonly TableColumn[]; onReorder: (keys: string[]) => void }) {
  const colWidths = useColumnWidths('insights-members')
  const tracks = gridTemplateFor(columns, colWidths)
  const headRow = useRef<HTMLDivElement>(null)
  const L0 = useColumnLayout(columns, headRow)
  const D = useColumnDrag(columns, onReorder)
  const L = { ...L0, style: (key: string) => ({ ...L0.style(key), ...D.style(key) }) }   /* (REG-614) every cell rides the drag's transform, so the whole column travels — the Items grid's rule (REG-572) */
  /* (REG-727) On a phone each row is a card and every line after the member names itself with its column's head ("Won · 3"). */
  const labelOf = (key: string) => { const c = columns.find((x) => x.key === key); return c && !c.locked ? c.label : undefined }
  const cell = (key: string, node: React.ReactNode) => (
    <div key={key} className={`${styles.cell} ${L.pinned(key) ? styles.pin : ''}`} role="cell" data-col={key} data-label={labelOf(key)} data-pin-edge={L.edge(key) || undefined} style={L.style(key)}>{node}</div>
  )
  const render = (r: MemberRow, key: string) => {
    switch (key) {
      case 'member': return cell(key, <span className={styles.memberCell}><Avatar name={r.name} color={r.color} size={36} tooltip={false} /><span className={styles.memberText}><span className={styles.memberName}>{r.name}</span><span className={styles.memberRole}>{r.role}</span></span></span>)
      case 'leads': return cell(key, <span className={styles.num}>{r.leads}</span>)
      case 'outreach': return cell(key, <span className={styles.stat}><span className={styles.statValue} data-grade={tatGrade(r.outreachMedian) ?? undefined}>{formatTat(r.outreachMedian)}</span><span className={styles.statHelp}>{r.outreachCount ? `med · avg ${formatTat(r.outreachMean)}` : 'no outreach yet'}</span></span>)
      case 'won': return cell(key, <span className={styles.stat}><span className={styles.statValue}>{formatTat(r.wonMedian)}</span><span className={styles.statHelp}>med</span></span>)
      case 'wonCount': return cell(key, <span className={styles.num}>{r.won}</span>)
      case 'awaiting': return cell(key, r.awaitingOutreach > 0 ? <MetaChip color="yellow">{String(r.awaitingOutreach)}</MetaChip> : <span className={styles.num}>—</span>)
      default: return cell(key, null)
    }
  }
  return (
    <div className={styles.card} role="table" data-drag-root="" aria-label="By team member" data-testid="insights-members" data-cols="insights-members" style={{ '--tracks': tracks } as React.CSSProperties}
         onScroll={(e) => e.currentTarget.toggleAttribute('data-scrolled', e.currentTarget.scrollLeft > 0)}>
      <div ref={headRow} className={styles.head} role="row">
        {columns.map((c) => (
          <div key={c.key} className={`${styles.hCell} ${c.pinned ? styles.pin : ''}`} role="columnheader" data-col={c.key} data-pin-edge={L.edge(c.key) || undefined} style={L.style(c.key)} {...D.head(c.key)}>
            <span className={styles.hLabel}>{c.label}</span>
            <ColumnResizer table="insights-members" column={c.key} label={c.label} min={c.key === 'member' ? 160 : 72} />
          </div>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.id} className={styles.row} role="row" data-testid="insights-member-row">
          {columns.map((c) => render(r, c.key))}
        </div>
      ))}
    </div>
  )
}
