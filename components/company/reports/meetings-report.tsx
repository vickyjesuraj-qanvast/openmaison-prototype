'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChipRail } from '@/components/om/chip-rail'
import { Chips } from '@/components/om/chips'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { MetaChip } from '@/components/om/meta-chip'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ScopePill } from '@/components/om/scope-pill'
import { PortalMenu } from '@/components/om/portal-menu'
import { useSnackbar } from '@/components/om/snackbar'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns, type TableColumn, type TableColumnDef } from '@/components/om/table-columns'
import { Button } from '@/components/ds'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { ExportDialog } from '@/components/leads/export-dialog'
import { Card, CardRule } from '@/components/leads/detail/card'
import { Row } from '@/components/projects/overview/row'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { withFrom } from '@/lib/nav'
import { setFlagPref } from '@/lib/prefs'
import { displayDate } from '@/lib/format'
import { BLANK } from '@/lib/leads/row-text'
import { buildTable, downloadBlob, type ExportFormat } from '@/lib/leads/export'
import { tierOf } from '@/lib/meetings/model'
import { kindLabel } from '@/lib/meetings/objections'
import {
  CHECK_TITLE, COACHING_EMPTY, COACHING_TITLE, DEFAULT_RANGE, FOOT_NOTE, MEMBERS_EMPTY, MEMBERS_HELP, OBJECTIONS_EMPTY, OBJECTIONS_HELP, OBJECTIONS_TITLE,
  OBJECTION_TILE_LABELS, OUTCOMES, OUTCOME_LABEL, RANGES, SHAPE, TIER_WORDS, checkWaitLine, meetingsReport, meetingsSheet, pctText, rangeLabel, scoreText, tileFigures,
  type MeetingsRange, type MeetingsReport as Report, type MemberMeetings, type ObjectionFact, type Outcome,
} from '@/lib/meetings/report-model'
import type { MeetingReportsData } from '@/lib/meetings/reports'
import ov from '@/components/projects/project-overview.module.css'
import { ReportTable } from './report-table'
import styles from './meetings-report.module.css'

/*
 * (pending modules S23 — card studio:meetings-copilot: "for Owners and Admins Analytics with coaching and an Objections report"; his "build all
 * of them" 2026-10-11) Company › Reports › Meetings — 1.0's Meeting Insights › Analytics and its Objections report, one Reports tab, built the
 * way Leads (components/leads/insights/insights-view.tsx) and Projects (components/projects/insights/project-insights-view.tsx) are: the
 * house ranges, the house tile row, By team member on the listing's table model with Column settings, Export; then Coaching and the Deal
 * score check on the Overview's card rows (LEAD STAGES' grammar, components/projects/overview/row.tsx), and Objections — its own tiles, a kind
 * filter (the house chips) and an outcome pill, the table. Every number derives per range in the browser (lib/meetings/report-model.ts).
 * Owners and Admins; anyone else meets the gate. No mock — every word on it is invented copy unless it names 1.0's (pending modules S23)
 * (invented copy).
 */
/** Where this page lives — what a link from it carries as `from`. */
const HERE = '/company/reports/meetings'
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const joinAnd = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const OUTCOME_COLOR: Record<Outcome, 'green' | 'default' | 'yellow'> = { ahead: 'green', lost: 'default', open: 'yellow' }

/* (pending modules S23) (invented copy) the two tables' heads — each floor holds its label with the listing's 16 + 24 of padding (REG-723) */
const MEMBER_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'member', label: 'Member', track: 'minmax(220px, 220fr)', locked: true },
  { key: 'meetings', label: 'Meetings', track: 'minmax(112px, 112fr)' },
  { key: 'ahead', label: 'Went ahead', track: 'minmax(136px, 136fr)' },
  { key: 'score', label: 'Average score', track: 'minmax(152px, 152fr)' },
  { key: 'checklist', label: 'Checklist covered', track: 'minmax(176px, 176fr)' },
  { key: 'tips', label: 'Tips acted on', track: 'minmax(152px, 152fr)' },
]
const OBJECTION_COLUMN_DEFS: readonly TableColumnDef[] = [
  { key: 'lead', label: 'Lead', track: 'minmax(200px, 200fr)', locked: true },
  { key: 'date', label: 'Date', track: 'minmax(120px, 120fr)' },
  { key: 'member', label: 'Member', track: 'minmax(180px, 180fr)' },
  { key: 'kind', label: 'Kind', track: 'minmax(184px, 184fr)' },
  { key: 'said', label: 'What they said', track: 'minmax(280px, 280fr)' },
  { key: 'competitor', label: 'Competitor', track: 'minmax(152px, 152fr)' },
  { key: 'answer', label: 'Your answer', track: 'minmax(280px, 280fr)' },
  { key: 'outcome', label: 'Outcome', track: 'minmax(168px, 168fr)' },
]
const MEMBERS_TABLE = 'meeting-report-members'
const OBJECTIONS_TABLE = 'meeting-report-objections'

/** (REG-1361) Company › Reports › Meetings — this body inside the Reports frame (components/company/reports/reports-workspace.tsx). */
export function MeetingsReport({ data, initialRange = DEFAULT_RANGE }: { data: MeetingReportsData | null; /** (pending modules S39) the address's `?range=` */ initialRange?: MeetingsRange }) {
  const [range, setRange] = useState<MeetingsRange>(initialRange)   // (parity P-31 · Q-16) the house reports open on 90 days — (pending modules S39) or on the address's range
  const report = useMemo(() => (data ? meetingsReport(data.facts, data.objections, data.team, data.now, range) : null), [data, range])
  const mobile = useMediaQuery(MOBILE)
  const [columnsFor, setColumnsFor] = useState<'members' | 'objections' | null>(null)
  const [exporting, setExporting] = useState(false)
  const snackbar = useSnackbar()
  const memberCols = useTableColumns(MEMBERS_TABLE, MEMBER_COLUMN_DEFS, mobile)
  const objectionCols = useTableColumns(OBJECTIONS_TABLE, OBJECTION_COLUMN_DEFS, mobile)
  const team = useMemo(() => new Map((data?.team ?? []).map((p) => [p.id, p])), [data])
  const nameOf = (id: string | null) => (id ? team.get(id)?.name ?? BLANK : BLANK)

  /* Maison AI answers from the report on screen — the other reports' contract (lib/maison-ai.ts); nothing metered (Q-30). (invented copy) */
  const ai = useMemo<MaisonSuggestion[]>(() => {
    if (!report) return []
    const span = rangeLabel(range).toLowerCase()
    const most = report.objections.kinds[0]?.count ?? 0
    return [
      { label: 'Who could use some coaching?', answer: {
        title: report.coaching.length ? `${plural(new Set(report.coaching.map((c) => c.memberId)).size, 'person', 'people')} to coach` : 'Nothing to coach in this range',
        text: report.coaching.length ? `From the meetings held, ${span}.` : 'Every member is near the studio’s figures — change the range to look further back.',
        rows: report.coaching.map((c) => ({ id: c.key, label: `${c.name} — ${c.text}`, meta: c.evidence })) } },
      { label: 'Which objections come up most?', answer: {
        title: report.objections.total ? `${report.objections.top!.label} comes up most` : 'No objections recorded in this range',
        text: report.objections.total ? `${plural(report.objections.total, 'objection')} in the meetings held, ${span}.` : undefined,
        rows: report.objections.kinds.map((k) => ({ id: k.kind, label: k.label, meta: plural(k.count, 'time'), share: most ? k.count / most : 0 })) } },
      { label: 'Summarise the meetings', answer: {
        title: `Meetings · ${span}`,
        rows: tileFigures(report).map((t) => ({ id: t.label, label: t.label, meta: `${t.value} · ${t.help}` })) } },
    ]
  }, [report, range])
  useMaisonAi(ai)
  /* (REG-708 · REG-817) the ghost's blocks, next time: what the page drew on the range it opens on */
  useEffect(() => {
    if (!report || range !== DEFAULT_RANGE) return
    setFlagPref(SHAPE.members, report.members.length > 0); setFlagPref(SHAPE.coaching, report.coaching.length > 0)
    setFlagPref(SHAPE.check, report.check !== null); setFlagPref(SHAPE.objections, report.objections.total > 0)
  }, [report, range])

  /* (parity Q-20) the house Export — the page's numbers as one sheet */
  const download = (format: ExportFormat) => {
    if (!report) return ''
    const sheet = meetingsSheet(report, nameOf)
    const name = `meetings-report-${rangeLabel(range).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${format.toLowerCase()}`
    return downloadBlob(buildTable(`Meetings report — ${rangeLabel(range)}`, sheet.head, sheet.body, format), name)
  }

  if (!data || !report) {
    return (
      /* (pending modules S23) The gate — 1.0's Analytics and Objections report were the Owners' and Admins'. (invented copy) the tab's own word */
      <div className={styles.gate} data-testid="meeting-report-gate">
        <Icon name="lock" size={32} weight={300} />
        <span className={styles.gateTitle}>Meeting reports are for Owners and Admins</span>
        <span className={styles.gateBody}>Ask your studio’s owner for them.</span>
      </div>
    )
  }
  const tiles = tileFigures(report)
  const columns = columnsFor === 'objections' ? objectionCols : memberCols
  return (
    <div data-testid="meeting-report">
      <div className={styles.bar}>
        <ChipRail label="Range">
          <Chips label="Range" testId="meeting-report-range" options={RANGES.map((r) => ({ value: r.key === null ? 'all' : String(r.key), label: r.label }))} value={range === null ? 'all' : String(range)} onChange={(v) => setRange(v === 'all' ? null : (Number(v) as MeetingsRange))} />
        </ChipRail>
        <span className={styles.barEnd}>
          {/* the house reports' grammar — what the range filters on, then the count in range (invented copy) */}
          <span className={styles.caption} data-testid="meeting-report-caption">{`Filtering on meeting date · ${plural(report.held, 'meeting')} held in range`}</span>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => setExporting(true)} data-testid="meeting-report-export">Export</Button>
        </span>
      </div>

      <StatTiles className={styles.tiles} testId="meeting-report-tiles">
        {tiles.map((t, i) => <StatTile key={t.label} testId={`meeting-tile-${['held', 'ahead', 'score', 'length', 'tips'][i]}`} label={t.label} value={t.value} help={t.help} />)}
      </StatTiles>

      <section className={styles.section} aria-label="By team member">
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionTitle}>By team member</span>
            <span className={styles.sectionHelp}>{MEMBERS_HELP}</span>
          </div>
          {mobile ? null : (
            <Tooltip label="Column settings">
              <IconButton icon="tune" label="Column settings" onClick={() => setColumnsFor('members')} />
            </Tooltip>
          )}
        </div>
        {report.members.length === 0 ? (
          <p className={styles.empty} data-testid="meeting-members-empty">{MEMBERS_EMPTY}</p>
        ) : (
          <ReportTable css={styles} table={MEMBERS_TABLE} label="By team member" testId="meeting-report-members" rowTestId="meeting-member-row" rows={report.members}
                       columns={memberCols.columns} onReorder={memberCols.reorder} render={(r, key) => memberCell(r, key)} />
        )}
      </section>

      {/* Cards side by side are stacks (page checklist) — one column below 1025 */}
      <div className={`${styles.cards} ${styles.block}`}>
        <div className={styles.stack}><CoachingCard report={report} /></div>
        <div className={styles.stack}><CheckCard report={report} /></div>
      </div>

      <ObjectionsSection report={report} nameOf={nameOf} team={team} columns={objectionCols.columns} onReorder={objectionCols.reorder}
                         onColumns={mobile ? undefined : () => setColumnsFor('objections')} />

      <p className={styles.foot}>{FOOT_NOTE}</p>

      <ColumnSettingsDrawer open={columnsFor !== null} onClose={() => setColumnsFor(null)} pinning={{ max: 3 }} columns={columns.all} onSave={columns.save} onReset={columns.reset} />
      <ExportDialog open={exporting} title="Export Meetings report" onClose={() => setExporting(false)} download={(format) => download(format)}
                    onDone={(name, format) => snackbar({ message: `Exported Meetings report as ${format} · ${name}` })} />
    </div>
  )
}

/** A By team member cell. */
function memberCell(r: MemberMeetings, key: string): ReactNode {
  switch (key) {
    case 'member': return <span className={styles.memberCell}><Avatar name={r.name} color={r.color} size={36} tooltip={false} /><span className={styles.memberText}><span className={styles.memberName}>{r.name}</span><span className={styles.memberRole}>{r.role}</span></span></span>
    case 'meetings': return <span className={styles.num}>{r.meetings}</span>
    case 'ahead': return <span className={styles.stat}><span className={styles.statValue}>{pctText(r.aheadShare)}</span><span className={styles.statHelp}>{`${r.ahead} of ${r.meetings}`}</span></span>
    /* the house cell: the figure, its line under it; an empty figure is the house "--" with no line under it (parity P-35 · C-11) */
    case 'score': return <span className={styles.stat}><span className={styles.statValue}>{scoreText(r.score)}</span>{r.score !== null ? <span className={styles.statHelp}>{`${tierOf(r.score)} · ${plural(r.scored, 'meeting')}`}</span> : null}</span>
    case 'checklist': return <span className={styles.num}>{pctText(r.checklist)}</span>
    case 'tips': return <span className={styles.stat}><span className={styles.statValue}>{pctText(r.tipsShare)}</span>{r.tipsSeen ? <span className={styles.statHelp}>{`${r.tipsActed} of ${plural(r.tipsSeen, 'tip')}`}</span> : null}</span>
    default: return null
  }
}

/** Coaching — 1.0's coaching suggestions as the Overview card's rows: the member, what to do, the evidence. */
function CoachingCard({ report }: { report: Report }) {
  return (
    <Card title={COACHING_TITLE} testId="meeting-coaching">
      <div className={ov.body}>
        {report.coaching.length ? (
          <div className={ov.group}>
            {report.coaching.map((c) => (
              <Row key={c.key} icon={c.kind === 'ask' ? 'quiz' : 'lightbulb'} name={c.name} caption={c.text} meta={c.evidence} two wrap testId="meeting-coaching-row" />
            ))}
          </div>
        ) : (
          <p className={ov.line} data-testid="meeting-coaching-empty">{COACHING_EMPTY}</p>
        )}
      </div>
    </Card>
  )
}

/** Deal score check — 1.0's calibration: did the meetings turn out as their scores said, overall and by tier. */
function CheckCard({ report }: { report: Report }) {
  const c = report.check
  const settings = withFrom('/settings?section=meetings', HERE)
  return (
    <Card title={CHECK_TITLE} testId="meeting-score-check">
      <div className={ov.body}>
        {c ? (
          <>
            <div className={ov.group}>
              {/* (pending modules S23) (invented copy) the verdict — 1.0's "Score predictions are well-calibrated / need improvement" in plain words */}
              {c.good
                ? <Row icon="check_circle" state="done" name="Scores match what happened" caption="Most meetings turned out as their deal score said" meta={`${pctText(c.share)} · ${c.matched} of ${c.meetings}`} two wrap testId="meeting-score-verdict" />
                : <Row icon="tune" name="Scores don’t match what happened yet" href={settings} two wrap testId="meeting-score-verdict"
                       caption={`Check the weights in Settings › Meetings${c.weights.length ? ` — try more on ${joinAnd(c.weights.map((w) => w.label))}` : ''}`}
                       meta={`${pctText(c.share)} · ${c.matched} of ${c.meetings}`} />}
            </div>
            <CardRule inset={0} />
            <div className={ov.group}>
              {c.tiers.map((t) => (
                <Row key={t.tier} icon={t.share >= 0.6 ? 'check_circle' : 'radio_button_unchecked'} state={t.share >= 0.6 ? 'done' : undefined} name={t.tier}
                     caption={`${TIER_WORDS[t.tier].band} · ${TIER_WORDS[t.tier].expects}`} meta={`${t.matched} of ${t.meetings} · ${pctText(t.share)}`} two wrap testId="meeting-score-tier" />
              ))}
            </div>
          </>
        ) : <p className={ov.line} data-testid="meeting-score-wait">{checkWaitLine(report.scoredForCheck)}</p>}
      </div>
    </Card>
  )
}

/** Objections — 1.0's Objections report: its tiles, filters by kind and by outcome, the table. */
function ObjectionsSection({ report, nameOf, team, columns, onReorder, onColumns }: {
  report: Report; nameOf: (id: string | null) => string; team: Map<string, { name: string; color: string }>
  columns: readonly TableColumn[]; onReorder: (keys: string[]) => void; onColumns?: () => void
}) {
  const o = report.objections
  const [kindPick, setKind] = useState('all')
  const [outcome, setOutcome] = useState<'all' | Outcome>('all')
  const [open, setOpen] = useState(false)
  const pill = useRef<HTMLButtonElement>(null)
  /* a kind the range no longer holds falls back to All (derived in render — no effect) */
  const kind = kindPick !== 'all' && o.kinds.some((k) => k.kind === kindPick) ? kindPick : 'all'
  const ofKind = kind === 'all' ? o.rows : o.rows.filter((r) => r.kind === kind)
  const shown = outcome === 'all' ? ofKind : ofKind.filter((r) => r.outcome === outcome)
  const meetingsWith = new Set(o.rows.map((r) => r.meetingId)).size
  const pick = (v: 'all' | Outcome) => { setOpen(false); setOutcome(v) }
  return (
    <section className={`${styles.section} ${styles.block}`} aria-label={OBJECTIONS_TITLE} data-testid="meeting-objections">
      <div className={styles.sectionHead}>
        <div>
          <span className={styles.sectionTitle}>{OBJECTIONS_TITLE}</span>
          <span className={styles.sectionHelp}>{OBJECTIONS_HELP}</span>
        </div>
        {onColumns && o.total ? (
          <Tooltip label="Column settings">
            <IconButton icon="tune" label="Column settings" onClick={onColumns} />
          </Tooltip>
        ) : null}
      </div>
      {o.total === 0 ? (
        <p className={styles.empty} data-testid="meeting-objections-empty">{OBJECTIONS_EMPTY}</p>
      ) : (
        <>
          <StatTiles testId="meeting-objection-tiles">
            {/* (pending modules S23) (invented copy) the help lines; 1.0's three tiles, "Conversion Rate" and "Converted After" made one */}
            <StatTile testId="objection-tile-total" label={OBJECTION_TILE_LABELS[0]} value={o.total} help={`In ${plural(meetingsWith, 'meeting')}`} />
            <StatTile testId="objection-tile-top" label={OBJECTION_TILE_LABELS[1]} value={o.top!.label} help={plural(o.top!.count, 'time')} />
            <StatTile testId="objection-tile-ahead" label={OBJECTION_TILE_LABELS[2]} value={pctText(o.aheadShare)} help={`${o.ahead} of ${o.total}`} />
          </StatTiles>
          <div className={styles.filters}>
            <ChipRail label="Kind">
              <Chips label="Kind" testId="meeting-objection-kinds" value={kind} onChange={setKind}
                     options={[{ value: 'all', label: `All · ${o.total}` }, ...o.kinds.map((k) => ({ value: k.kind, label: `${k.label} · ${k.count}` }))]} />
            </ChipRail>
            <span className={styles.pillWrap} data-testid="meeting-objection-outcome">
              <ScopePill ref={pill} label={`Outcome: ${outcome === 'all' ? 'All' : OUTCOME_LABEL[outcome]}`} open={open} scoped={outcome !== 'all'} onClick={() => setOpen((v) => !v)} />
            </span>
            <PortalMenu open={open} anchor={pill} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle="Outcome">
              <DropdownItem role="menuitemradio" checked={outcome === 'all'} onSelect={() => pick('all')}>{`All · ${ofKind.length}`}</DropdownItem>
              {OUTCOMES.map((k) => (
                <DropdownItem key={k} role="menuitemradio" checked={outcome === k} onSelect={() => pick(k)}>{`${OUTCOME_LABEL[k]} · ${ofKind.filter((r) => r.outcome === k).length}`}</DropdownItem>
              ))}
            </PortalMenu>
          </div>
          {shown.length ? (
            <ReportTable css={styles} table={OBJECTIONS_TABLE} label={OBJECTIONS_TITLE} testId="meeting-objections-table" rowTestId="meeting-objection-row" kbList="objections" rows={shown}
                         columns={columns} onReorder={onReorder} render={(r, key) => objectionCell(r, key, nameOf, team)} />
          ) : (
            /* a filter narrowed it to nothing — the "no matches" kind, never the first-run line (page checklist ⑥). (invented copy) */
            <p className={styles.empty} data-testid="meeting-objections-none">No objections match this kind and outcome</p>
          )}
        </>
      )}
    </section>
  )
}

/** An Objections cell. */
function objectionCell(r: ObjectionFact, key: string, nameOf: (id: string | null) => string, team: Map<string, { name: string; color: string }>): ReactNode {
  const text = (v: string | null) => (v ? <Tooltip label={v} whenCut><span className={styles.clip}>{v}</span></Tooltip> : <span className={styles.num}>{BLANK}</span>)
  switch (key) {
    /* the lead opens its Meetings tab, with the way back here (REG-465) */
    case 'lead': return <Tooltip label={r.leadName} whenCut><Link href={withFrom(`/leads/${r.leadId}/meetings`, HERE)} className={styles.leadLink} data-kb-open="">{r.leadName || BLANK}</Link></Tooltip>
    case 'date': return <span className={styles.num}>{displayDate(new Date(r.at))}</span>
    case 'member': {
      const p = r.memberId ? team.get(r.memberId) : undefined
      return p ? <span className={styles.who}><Avatar name={p.name} color={p.color} size={24} tooltip={false} /><span className={styles.clip}>{nameOf(r.memberId)}</span></span> : <span className={styles.num}>{BLANK}</span>
    }
    case 'kind': return <span className={styles.clip}>{kindLabel(r.kind)}</span>
    case 'said': return text(r.said)
    case 'competitor': return text(r.competitor)
    /* the studio's saved answer at the time (Settings › Meetings) — 1.0 never filled its column */
    case 'answer': return text(r.answer)
    case 'outcome': return <MetaChip color={OUTCOME_COLOR[r.outcome]}>{OUTCOME_LABEL[r.outcome]}</MetaChip>
    default: return null
  }
}
