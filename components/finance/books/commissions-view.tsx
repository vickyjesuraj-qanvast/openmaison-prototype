'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { StatTile } from '@/components/om/stat-tile'
import { useSnackbar } from '@/components/om/snackbar'
import { CreditsTable } from '@/components/company/plan/credits-table'
import { NoteDialog } from '@/components/templates/editor/review-bar'
import { GHOST_MIN_MS } from '@/components/shell/page-reveal'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import type { TableColumnDef } from '@/components/om/table-columns'
import { money2 } from '@/lib/quotes/math'
import { displayDate } from '@/lib/format'
import { methodLabel } from '@/lib/finance/model'
import { SCOPE_LABEL, owedOldestFirst, pctWords, ruleWords, type CommissionAsk, type CommissionLine, type CommissionPayoutRecord } from '@/lib/finance/commission'
import type { CommissionsData } from '@/lib/finance/books'
import {
  answerCommissionAsk, askCommissionRate, payCommission, payMemberCommission, removeCommissionRule, reverseCommissionPayout, setCommissionRule, setCommissionShares,
  undoCommissionPayout, undoCommissionRule, undoCommissionShares, undoMemberCommission, undoReverseCommissionPayout, withdrawCommissionAsk,
} from '@/app/finance/books-actions'
import { RowMenu, tagOf, type RowAction } from '../cost-tables'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { PayCommissionDialog, PayMemberDialog, RuleDialog, SharesDialog, type PayMemberTarget, type PayTarget } from './commission-dialogs'
import { ProjectCommissionDialog, openProjectCommission } from './project-commission-dialog'
import b from './books.module.css'
import { WAITING_WHY } from '@/lib/finance/todo'   // (parity map, MO-098) the words a row reads where an Owner's or an Admin's button would be
import { useRememberShape } from '@/lib/ghost-shape'   // (S43D, F2-01)
import { commissionAsksShape } from '@/lib/finance/sections'

/**
 * (gaps build F2 — F2-Q4…Q8, 1.0 G-318 · G-492) Finance › Commissions. Owners and Admins: the studio's totals, the members' asks for another rate
 * (Approve — perhaps at another rate — or Decline), what each member earned, was paid and is owed, each project's lines (Pay · the shares · a rate on
 * that project) and the payments (Reverse). A member: their own — their rate on each project, earned, paid, owed, their asks and their payments —
 * never another member's, never a project's profit. Every figure is `commissionsOf`'s, worked out on the server.
 * (simplify S-12 · S-13, her "build everything" 2026-10-09 — F1 §6.5) Four stacked tables became one: the tiles say their period (All time — the
 * word Reports uses — and Owed as it stands today); the asks show only while one is open (an answered ask folds into its line's rate, the row's
 * history); and **one table grouped by member** — a member's row (earned · paid · owed, **Pay {member} S$x**, which pays their owed lines oldest
 * first, one payment per project) opens to their project rows with today's columns and ⋮ (Pay on a line, their rate on it, the shares). The
 * payments stay below (Reverse). A member reads *My commission*: their tiles, their projects, their open asks, what was paid to them.
 */
const ASK_DEFS: readonly TableColumnDef[] = [
  { key: 'member', label: 'Member', track: 'minmax(170px, 170fr)', locked: true },
  { key: 'project', label: 'Project', track: 'minmax(200px, 200fr)' },
  { key: 'asks', label: 'Asks for', track: 'minmax(200px, 200fr)' },
  { key: 'why', label: 'Why', track: 'minmax(240px, 240fr)' },
  { key: 'status', label: 'Status', track: 'minmax(150px, 150fr)' },
  { key: 'next', label: 'Next step', track: 'minmax(170px, 170fr)' },
]
const LINE_DEFS: readonly TableColumnDef[] = [
  { key: 'project', label: 'Project', track: 'minmax(220px, 220fr)', locked: true },
  { key: 'member', label: 'Member', track: 'minmax(160px, 160fr)' },
  { key: 'share', label: 'Share', track: 'minmax(90px, 90fr)' },
  { key: 'rate', label: 'Rate', track: 'minmax(220px, 220fr)' },
  { key: 'earned', label: 'Earned', track: 'minmax(130px, 130fr)' },
  { key: 'paid', label: 'Paid', track: 'minmax(120px, 120fr)' },
  { key: 'owed', label: 'Owed', track: 'minmax(120px, 120fr)' },
  { key: 'next', label: 'Next step', track: 'minmax(150px, 150fr)' },
]
const MY_LINE_DEFS: readonly TableColumnDef[] = LINE_DEFS.filter((d) => d.key !== 'member')
/* (simplify S-12) the grouped table: a member's row, then their projects — the first column names whichever it is */
const GROUP_DEFS: readonly TableColumnDef[] = [
  { key: 'who', label: 'Member · project', track: 'minmax(250px, 250fr)', locked: true },
  ...LINE_DEFS.filter((d) => d.key !== 'project' && d.key !== 'member').map((d) => (d.key === 'next' ? { ...d, track: 'minmax(210px, 210fr)' } : d)),
]
type GroupRow = { kind: 'member'; memberId: string; earnedMinor: number; paidMinor: number; owedMinor: number; lines: number } | { kind: 'line'; line: CommissionLine }
const PAYOUT_DEFS: readonly TableColumnDef[] = [
  { key: 'member', label: 'Paid to', track: 'minmax(170px, 170fr)', locked: true },
  { key: 'project', label: 'Project', track: 'minmax(200px, 200fr)' },
  { key: 'amount', label: 'Amount', track: 'minmax(130px, 130fr)' },
  { key: 'paidOn', label: 'Paid on', track: 'minmax(120px, 120fr)' },
  { key: 'how', label: 'How', track: 'minmax(150px, 150fr)' },
  { key: 'next', label: '', track: 'minmax(72px, 72fr)' },
]
const MY_PAYOUT_DEFS: readonly TableColumnDef[] = PAYOUT_DEFS.filter((d) => d.key !== 'member' && d.key !== 'next')
const ASK_STATUS: Record<CommissionAsk['status'], [string, 'default' | 'green' | 'yellow' | 'red']> = {
  open: ['Waiting for an answer', 'yellow'], approved: ['Approved', 'green'], declined: ['Declined', 'red'], withdrawn: ['Withdrawn', 'default'],
}
type Snack = { message: string; actionLabel?: string; onAction?: () => void }

export function CommissionsView({ data, open }: { data: CommissionsData; open: string | null }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const runs = data.viewer.runs
  /* (parity map, MO-098 · FB-114) Accounting reads and pays everyone's commission; setting rates and answering asks stays an Owner's or an Admin's */
  const sets = data.viewer.sets
  const s = data.summary
  const [busy, setBusy] = useState<string | null>(null)
  const [paying, setPaying] = useState<PayTarget | null>(null)
  const [reversing, setReversing] = useState<CommissionPayoutRecord | null>(null)
  const [asking, setAsking] = useState<{ projectId: string; project: string } | null>(null)
  const [answering, setAnswering] = useState<CommissionAsk | null>(null)
  const [declining, setDeclining] = useState<CommissionAsk | null>(null)
  const [rating, setRating] = useState<CommissionLine | null>(null)
  const [sharing, setSharing] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [payingMember, setPayingMember] = useState<PayMemberTarget | null>(null)
  const [folded, setFolded] = useState<Set<string>>(() => new Set())
  /* `?open=` — an ask (the bell), a line `project:member` (Reports), a member (To do's Pay row): the row it names is marked and brought into view;
     an answered ask is no longer listed, so its line stands for it */
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      const ask = data.asks.find((a) => a.id === open)
      const key = ask && ask.status !== 'open' ? `${ask.projectId}:${ask.memberId}` : open
      setFocus(key)
      document.querySelector(`[data-ask="${CSS.escape(key)}"],[data-line="${CSS.escape(key)}"],[data-member="${CSS.escape(key)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, GHOST_MIN_MS + 200)
    return () => window.clearTimeout(t)
  }, [open, data.asks])
  const person = (id: string | null) => (id === data.viewer.id ? 'You' : data.people.find((m) => m.id === id)?.name ?? 'A member')
  const payNowOf = (id: string) => data.people.find((m) => m.id === id)?.paynow ?? null   // (simplify round 2) handed in only to whoever pays
  const project = (id: string) => data.projects.find((p) => p.id === id)
  const pname = (id: string) => project(id)?.name ?? 'A project'

  /** One step: the action, its sentence (and Undo), a refusal said in the house words; the page reads itself again. */
  const act = async <R extends object>(key: string, what: string, fn: () => Promise<R | { error: string }>, done: (r: R) => Snack | string, after?: () => void): Promise<boolean> => {
    setBusy(key)
    try {
      const r = await fn()
      if ('error' in r && typeof (r as { error: unknown }).error === 'string') { snackbar({ message: couldnt(what, refusalOf((r as { error: string }).error)) }); return false }
      after?.()
      const d = done(r as R)
      snackbar(typeof d === 'string' ? { message: d } : d)
      router.refresh()
      return true
    } catch (e) { snackbar({ message: couldnt(what, refusalOf(e)) }); return false } finally { setBusy(null) }
  }
  const undo = (what: string, fn: () => Promise<unknown>, back: string) => async () => {
    try { const r = await fn(); if (r && typeof r === 'object' && 'error' in r) { snackbar({ message: couldnt(what, refusalOf((r as { error: string }).error)) }); return } snackbar({ message: back }); router.refresh() }
    catch (e) { snackbar({ message: couldnt(what, refusalOf(e)) }) }
  }

  const askCell = (a: CommissionAsk, key: string): ReactNode => {
    if (key === 'member') return <span>{person(a.memberId)}</span>
    if (key === 'project') return <span className={b.stack}><span>{pname(a.projectId)}</span><span className={b.sub}>{displayDate(new Date(a.createdAt))}</span></span>
    if (key === 'asks') return <span className={b.stack}><span>{ruleWords(a)}</span>{a.status === 'approved' && (a.approvedRateBp != null || a.approvedFixedMinor != null) ? <span className={b.sub}>Approved at {ruleWords({ basis: a.basis, rateBp: a.approvedRateBp ?? a.rateBp, fixedMinor: a.approvedFixedMinor ?? a.fixedMinor })}</span> : null}</span>
    if (key === 'why') return <span className={b.stack}><span>{a.reason}</span>{a.answerNote ? <span className={b.sub}>{person(a.answeredBy)}: {a.answerNote}</span> : null}</span>
    if (key === 'status') { const [l, t] = ASK_STATUS[a.status]; return tagOf(l, t) }
    if (key === 'next') {
      if (a.status !== 'open') return null
      if (runs && !sets) return <span className={b.sub} data-testid="commission-ask-waiting">{WAITING_WHY.ask}</span>
      if (runs) return <span className={b.rowActions}><Button appearance="text" onPress={() => setDeclining(a)} isDisabled={busy === a.id}>Decline</Button><Button appearance="text" onPress={() => setAnswering(a)} isDisabled={busy === a.id} data-testid="commission-approve">Approve</Button></span>
      if (a.memberId === data.viewer.id) return <span className={b.rowActions}><Button appearance="text" onPress={() => { void act(a.id, 'take the ask back', () => withdrawCommissionAsk(a.id), () => 'Ask taken back') }} isDisabled={busy === a.id}>Take it back</Button></span>
    }
    return null
  }
  const lineCell = (l: CommissionLine, key: string): ReactNode => {
    const p = project(l.projectId)
    const myAsk = data.asks.find((a) => a.projectId === l.projectId && a.memberId === l.memberId && a.status === 'open')
    if (key === 'project') return <span className={b.stack}><span>{p?.name ?? 'A project'}</span><span className={b.sub}>{p?.number}</span></span>
    if (key === 'member') return <span>{person(l.memberId)}</span>
    if (key === 'share') return <span className={b.num}>{l.shareBp ? pctWords(l.shareBp) : '--'}</span>
    if (key === 'rate') {
      /* (simplify S-12) an answered ask folds into its line — the row's history */
      const answered = data.asks.filter((a) => a.projectId === l.projectId && a.memberId === l.memberId && (a.status === 'approved' || a.status === 'declined')).sort((x, y) => (y.answeredAt ?? 0) - (x.answeredAt ?? 0))[0]
      return (
        <span className={b.stack}><span>{l.words}</span><span className={b.sub}>{l.scope ? SCOPE_LABEL[l.scope] : 'No rule'}{l.estimate ? ' · an estimate until it completes' : ''}</span>
          {answered ? <span className={b.sub} data-testid="commission-ask-history">{`Asked for ${ruleWords(answered)} — ${answered.status === 'approved' ? 'approved' : `declined${answered.answerNote ? `: “${answered.answerNote}”` : ''}`}${answered.answeredAt ? `, ${displayDate(new Date(answered.answeredAt))}` : ''}`}</span> : null}
        </span>
      )
    }
    if (key === 'earned') return <span className={b.num}>{money2(l.earnedMinor)}</span>
    if (key === 'paid') return <span className={b.num}>{money2(l.paidMinor)}</span>
    if (key === 'owed') return <span className={b.stack}><span className={b.num}>{money2(l.owedMinor)}</span>{l.aheadMinor ? <span className={b.sub}>{money2(l.aheadMinor)} paid ahead</span> : null}</span>
    if (key === 'next') {
      if (runs) {
        const items: RowAction[] = !sets ? [] : [
          { label: 'Their rate on this project', run: () => setRating(l), help: 'Overrides the studio’s and their own, from today' },
          /* (parity map, FB-042 · FB-043) the project's own commission — the studio's rule, a rate for it (on chosen stages), or none */
          { label: 'This project’s commission', run: () => openProjectCommission(l.projectId), testId: 'commission-project-open' },
          ...(l.scope === 'member_project' && l.rule ? [{ label: 'Remove their rate on this project', run: () => { void act(`rm-${l.rule!.id}`, 'remove the rate', () => removeCommissionRule(l.rule!.id), (r) => ({ message: r.sentence, actionLabel: 'Undo', onAction: undo('put the rate back', () => undoCommissionRule(r.undo), 'The rate is back') })) }, tone: 'danger' as const }] : []),
          ...((p?.team.length ?? 0) > 1 ? [{ label: 'Change the shares', run: () => setSharing(l.projectId), help: 'How the team splits what the project earns' }] : []),
        ]
        return <span className={b.rowActions}>{l.owedMinor > 0 ? <Button appearance="text" onPress={() => setPaying({ memberId: l.memberId, member: person(l.memberId), projectId: l.projectId, project: p?.name ?? '', owedMinor: l.owedMinor, payNow: payNowOf(l.memberId) })} data-testid="commission-pay">Pay</Button> : null}{items.length ? <RowMenu label={`More for ${person(l.memberId)} on ${p?.name ?? 'the project'}`} title={p?.name ?? 'Commission'} items={items} /> : null}</span>
      }
      if (l.memberId === data.viewer.id) return <span className={b.rowActions}>{myAsk ? <span className={b.sub}>Asked {displayDate(new Date(myAsk.createdAt))}</span> : <Button appearance="text" onPress={() => setAsking({ projectId: l.projectId, project: p?.name ?? '' })} data-testid="commission-ask">Ask for another rate</Button>}</span>
    }
    return null
  }
  const payoutCell = (x: CommissionPayoutRecord, key: string): ReactNode => {
    const gone = !!x.reversedAt
    if (key === 'member') return <span>{person(x.memberId)}</span>
    if (key === 'project') return <span>{pname(x.projectId)}</span>
    if (key === 'amount') return <span className={b.stack}><span className={`${b.num}${gone ? ` ${b.void}` : ''}`}>{money2(x.amountMinor)}</span>{gone ? <span className={b.sub}>Reversed — {x.reverseReason}</span> : x.note ? <span className={b.sub}>{x.note}</span> : null}</span>
    if (key === 'paidOn') return <span className={b.num}>{displayDate(new Date(x.paidOn))}</span>
    if (key === 'how') return <span className={b.stack}><span>{methodLabel(x.method)}</span>{x.reference ? <span className={b.sub}>{x.reference}</span> : null}</span>
    if (key === 'next') return gone ? null : <span className={b.rowActions}><RowMenu label="More for this payment" title="Commission paid" items={[{ label: 'Reverse the payment', tone: 'danger', run: () => setReversing(x), help: 'It stays on the record; the commission is owed again' }]} /></span>
    return null
  }

  const openAsks = data.asks.filter((a) => a.status === 'open')
  /* (simplify S-12) the asks show only while one is open — an answered one is its line's history (the rate column) */
  const asks = openAsks
  /* (S43D, F2-01) …and the loader's ghost draws the band next time as this browser last saw it (books-ghost.tsx) */
  useRememberShape(commissionAsksShape(runs), asks.length > 0)
  const lines = s.lines.filter((l) => l.earnedMinor || l.paidMinor || l.rule)
  /* (simplify S-12) the grouped table: each member's row (their sums from `byMember`), then their lines unless folded */
  const grouped: GroupRow[] = s.byMember.filter((m) => lines.some((l) => l.memberId === m.memberId)).sort((x, y) => person(x.memberId).localeCompare(person(y.memberId)))
    .flatMap((m) => {
      const mine = lines.filter((l) => l.memberId === m.memberId)
      const head: GroupRow = { kind: 'member', memberId: m.memberId, earnedMinor: m.earnedMinor, paidMinor: m.paidMinor, owedMinor: m.owedMinor, lines: mine.length }
      return folded.has(m.memberId) ? [head] : [head, ...mine.map((line): GroupRow => ({ kind: 'line', line }))]
    })
  const payMember = (memberId: string) => setPayingMember({ memberId, member: person(memberId), payNow: payNowOf(memberId), lines: owedOldestFirst(s.lines, memberId).map((l) => ({ projectId: l.projectId, project: pname(l.projectId), owedMinor: l.owedMinor })) })
  const groupCell = (r: GroupRow, key: string): ReactNode => {
    if (r.kind === 'line') return key === 'who' ? <span className={`${b.stack} ${b.indent}`}><span>{project(r.line.projectId)?.name ?? 'A project'}</span><span className={b.sub}>{project(r.line.projectId)?.number}</span></span> : lineCell(r.line, key)
    const open = !folded.has(r.memberId)
    if (key === 'who') return (
      <span className={b.memberCell}>
        <Tooltip label={open ? 'Fold their projects' : 'Show their projects'}><IconButton icon={open ? 'keyboard_arrow_down' : 'keyboard_arrow_right'} size={24} variant="bare" label={`${open ? 'Fold' : 'Show'} ${person(r.memberId)}’s projects`} aria-expanded={open}
          onClick={() => setFolded((f) => { const n = new Set(f); if (n.has(r.memberId)) n.delete(r.memberId); else n.add(r.memberId); return n })} data-testid="commission-member-toggle" /></Tooltip>
        <span className={b.stack}><span className={b.strong}>{person(r.memberId)}</span><span className={b.sub}>{r.lines} project{r.lines === 1 ? '' : 's'}</span></span>
      </span>
    )
    if (key === 'earned') return <span className={`${b.num} ${b.strong}`}>{money2(r.earnedMinor)}</span>
    if (key === 'paid') return <span className={`${b.num} ${b.strong}`}>{money2(r.paidMinor)}</span>
    if (key === 'owed') return <span className={`${b.num} ${b.strong}`}>{money2(r.owedMinor)}</span>
    if (key === 'next') return r.owedMinor > 0 ? <span className={b.rowActions}><Button appearance="text" onPress={() => payMember(r.memberId)} data-testid="commission-pay-member">{`Pay ${r.memberId === data.viewer.id ? 'yourself' : person(r.memberId).split(' ')[0]} ${money2(r.owedMinor)}`}</Button></span> : null
    return null
  }
  const sharingP = sharing ? project(sharing) : null
  const studioRule = data.rules.find((r) => !r.memberId && !r.projectId && !r.endedAt) ?? null
  return (
    <>
      <div className={b.tiles3} data-testid="commission-tiles">
        {/* (simplify S-13 · F1 P3) each tile says its period — All time, the word Reports › Commissions uses — so the two never seem to disagree */}
        <StatTile label={runs ? 'Earned' : 'You earned'} value={money2(s.earnedMinor)} help={runs ? `All time · the studio’s rule: ${ruleWords(studioRule)}` : 'All time · on what clients paid on your projects'} testId="tile-commission-earned" />
        <StatTile label="Paid" value={money2(s.paidMinor)} help={s.paidMinor ? 'All time · recorded by an Owner, an Admin or Accounting' : 'All time · nothing paid yet'} testId="tile-commission-paid" />
        <StatTile label="Owed" value={money2(s.owedMinor)} grade={s.owedMinor ? 'warn' : undefined} help={openAsks.length ? `As it stands today · ${openAsks.length} ask${openAsks.length === 1 ? '' : 's'} for another rate` : 'As it stands today · earned and not yet paid'} testId="tile-commission-owed" />
      </div>
      {asks.length ? (
        <CreditsTable table="books-commission-asks" title={runs ? 'Asks for another rate' : 'Your asks'} testId="commission-asks" defs={ASK_DEFS} rows={asks} rowKey={(a) => a.id} cell={askCell}
                      rowAttrs={(a) => ({ 'data-ask': a.id, 'data-focus': focus === a.id ? '' : undefined })}
                      help={runs ? 'A member asks for a different rate on a project they work on. Approved, it applies to them on that project from today.' : 'What you asked for — the answer shows on the project’s rate.'}
                      empty="No asks." />
      ) : null}
      {runs ? (
        <CreditsTable table="books-commission-grouped" title="By member" testId="commission-lines" defs={GROUP_DEFS} rows={grouped} rowKey={(r) => (r.kind === 'member' ? `m:${r.memberId}` : `${r.line.projectId}:${r.line.memberId}`)} cell={groupCell}
                      rowAttrs={(r) => (r.kind === 'member'
                        ? { 'data-member': r.memberId, 'data-testid': 'commission-member', 'data-focus': focus === r.memberId ? '' : undefined }
                        : { 'data-line': `${r.line.projectId}:${r.line.memberId}`, 'data-focus': focus === `${r.line.projectId}:${r.line.memberId}` ? '' : undefined })}
                      help={<>Each member, then their projects — the share, the rate that applies (a member’s on the project, the project’s, the member’s, then the studio’s), earned before GST from the payments that count. The rules are in <Link href="/settings?section=finance#commission-settings" className={b.nameLink}>Settings › Finance</Link>.</>}
                      empty="No commission on any project yet." />
      ) : (
        <CreditsTable table="books-commission-mine" title="Your projects" testId="commission-lines" defs={MY_LINE_DEFS} rows={lines} rowKey={(l) => `${l.projectId}:${l.memberId}`} cell={lineCell}
                      rowAttrs={(l) => ({ 'data-line': `${l.projectId}:${l.memberId}`, 'data-focus': focus === `${l.projectId}:${l.memberId}` ? '' : undefined })}
                      help="Your share of each project and the rate that applies to you. A profit rate reads as a rate — the profit stays with the Owners."
                      empty="Nothing earned yet — commission comes in as your clients pay." />
      )}
      <CreditsTable table={runs ? 'books-commission-payouts' : 'books-commission-my-payouts'} title={runs ? 'Payments' : 'Paid to you'} testId="commission-payouts" defs={runs ? PAYOUT_DEFS : MY_PAYOUT_DEFS} rows={[...data.payouts].sort((x, y) => y.paidOn - x.paidOn)} rowKey={(x) => x.id} cell={payoutCell}
                    help="A reversed payment stays on the record and counts for nothing." empty="No commission paid yet." />

      {runs ? <ProjectCommissionDialog /> : null}
      <PayMemberDialog open={!!payingMember} target={payingMember} busy={busy === 'pay-member'} onClose={() => setPayingMember(null)}
                       onSave={(o) => { const t = payingMember; if (!t) return; void act('pay-member', 'record the payment', () => payMemberCommission({ memberId: t.memberId, amountMinor: o.amountMinor, paidOn: o.paidOn, method: o.method, reference: o.reference || null, note: o.note || null }),
                         (r) => ({ message: r.sentence, actionLabel: 'Undo', onAction: undo('take the payment back', () => undoMemberCommission(r.undo), 'Payment taken back') }), () => setPayingMember(null)) }} />
      <PayCommissionDialog open={!!paying} target={paying} busy={busy === 'pay'} onClose={() => setPaying(null)}
                           onSave={(o) => { const t = paying; if (!t) return; void act('pay', 'record the payment', () => payCommission({ memberId: t.memberId, projectId: t.projectId, amountMinor: o.amountMinor, paidOn: o.paidOn, method: o.method, reference: o.reference || null, note: o.note || null }),
                             (r) => ({ message: r.sentence, actionLabel: 'Undo', onAction: undo('take the payment back', () => undoCommissionPayout(r.undo), 'Payment taken back') }), () => setPaying(null)) }} />
      <NoteDialog open={!!reversing} title="Reverse the payment" label="Why is it reversed?" action="Reverse" required maxLength={300} busy={busy === 'reverse'}
                  help="It stays on the record with this reason; the commission is owed again." onClose={() => setReversing(null)}
                  onSubmit={(reason) => { const x = reversing; if (!x) return; void act('reverse', 'reverse the payment', () => reverseCommissionPayout(x.id, { reason }), (r) => ({ message: r.sentence, actionLabel: 'Undo', onAction: undo('undo it', () => undoReverseCommissionPayout(r.undo), 'The payment counts again') }), () => setReversing(null)) }} />
      <RuleDialog open={!!asking} title="Ask for another rate" subtitle={asking ? `${asking.project} — an Owner or an Admin answers it.` : undefined} initial={null} allowNone={false} ask busy={busy === 'ask'} saveLabel="Send the ask" testId="commission-ask-dialog"
                  onClose={() => setAsking(null)} onSave={(o) => { const a = asking; if (!a) return; void act('ask', 'send the ask', () => askCommissionRate({ projectId: a.projectId, basis: o.basis, rateBp: o.rateBp, fixedMinor: o.fixedMinor, reason: o.reason }), (r) => r.sentence, () => setAsking(null)) }} />
      <RuleDialog open={!!answering} title="Approve the ask" subtitle={answering ? `${person(answering.memberId)} on ${pname(answering.projectId)} — change the rate first if you like. It applies from today.` : undefined}
                  initial={answering ? { basis: answering.basis, rateBp: answering.rateBp, fixedMinor: answering.fixedMinor } : null} allowNone={false} approve busy={busy === 'answer'} saveLabel="Approve" testId="commission-answer-dialog"
                  onClose={() => setAnswering(null)} onSave={(o) => { const a = answering; if (!a) return; void act('answer', 'approve it', () => answerCommissionAsk(a.id, { approve: true, rateBp: o.rateBp, fixedMinor: o.fixedMinor, note: o.reason || null }), (r) => r.sentence, () => setAnswering(null)) }} />
      <NoteDialog open={!!declining} title="Decline the ask" label="Why not?" action="Decline" required maxLength={300} busy={busy === 'decline'}
                  help={`${declining ? person(declining.memberId) : 'They'} reads it with the answer.`} onClose={() => setDeclining(null)}
                  onSubmit={(note) => { const a = declining; if (!a) return; void act('decline', 'decline it', () => answerCommissionAsk(a.id, { approve: false, note }), (r) => r.sentence, () => setDeclining(null)) }} />
      <RuleDialog open={!!rating} title="Their rate on this project" subtitle={rating ? `${person(rating.memberId)} on ${pname(rating.projectId)} — overrides the studio’s and their own.` : undefined}
                  initial={rating?.rule && rating.rule.basis !== 'none' ? { basis: rating.rule.basis, rateBp: rating.rule.rateBp, fixedMinor: rating.rule.fixedMinor } : null} allowNone={false} busy={busy === 'rate'} saveLabel="Save the rate"
                  onClose={() => setRating(null)} onSave={(o) => { const l = rating; if (!l) return; void act('rate', 'save the rate', () => setCommissionRule({ memberId: l.memberId, projectId: l.projectId, basis: o.basis, rateBp: o.rateBp, fixedMinor: o.fixedMinor }), (r) => ({ message: r.sentence, actionLabel: 'Undo', onAction: undo('put it back', () => undoCommissionRule(r.undo), 'The rate is as it was') }), () => setRating(null)) }} />
      <SharesDialog open={!!sharingP} project={sharingP?.name ?? ''} team={sharingP?.team ?? []} busy={busy === 'shares'}
                    initial={Object.fromEntries((sharingP?.team ?? []).map((m) => [m.id, s.lines.find((l) => l.projectId === sharingP?.id && l.memberId === m.id)?.shareBp ?? 0]))}
                    onClose={() => setSharing(null)} onSave={(shares) => { const p = sharingP; if (!p) return; void act('shares', 'save the shares', () => setCommissionShares(p.id, { shares }), (r) => ({ message: r.sentence, actionLabel: 'Undo', onAction: undo('put them back', () => undoCommissionShares(r.undo), 'The shares are as they were') }), () => setSharing(null)) }} />
    </>
  )
}
