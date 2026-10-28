'use client'

import { useRouter } from 'next/navigation'
import { activityGlyph } from '@/lib/leads/activity-glyph'   // (Activity by date, 2026-10-24) the card's rows lead with the tab's own glyph
import { useState } from 'react'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { Icon } from '@/components/om/icon'
import { Card } from '@/components/leads/detail/card'
import { ActivityCard } from '@/components/leads/detail/activity-card'
import { AiBrief } from '@/components/leads/detail/ai-brief'   // (parity P-02)
import { MyWorkCard } from '@/components/leads/detail/my-work-card'   // (parity P-04) the lead's own card
import { AskClientDialog, askedLine } from '@/components/leads/questionnaire/ask-client-dialog'
import { useRun } from '@/components/leads/tasks/use-run'
import { completeTask } from '@/app/leads/actions'
import { askClientQuestions } from '@/app/leads/questions-actions'
import { askClient } from '@/app/leads/portal-actions'
import { calendarDaysBetween, moneyCard } from '@/lib/format'
import { withFrom } from '@/lib/nav'
import type { ProjectDetail, StatusItem } from '@/lib/projects/queries'
import type { SetupAction } from '@/lib/projects/getting-started'
import { headerLabel } from '@/lib/projects/needs-you'
import { closingLines } from '@/lib/projects/handover-model'   // (gaps build, package A — 4)
import type { ProjectMaison } from './use-project-maison'
import { NeedsCard, type NeedHandlers } from './overview/needs-card'
import { WithClientCard } from './overview/with-client-card'
import { ComingUpCard } from './overview/coming-up-card'
import { ProgressCard } from './overview/progress-card'
import { MoneyCard } from './overview/money-card'
import { DocumentsCard } from './overview/documents-card'   // (Contracts on the move, C4 — P-11 · C-23) ≤1024 only
import { projectDocumentRows } from './overview/documents'
import { Row } from './overview/row'
import { useNeedActions } from './overview/use-need-actions'
import { NeedAnswerDialogs } from './overview/answer-dialogs'
import styles from './project-overview.module.css'

/** (parity P-05 · A-07) The step a Project stages row presses into — the frame's own flows (the header's Stage ▾ menu runs the same). */
export type ProjectStep = 'start' | 'handover' | 'reopen' | 'resume'

/**
 * (REG-930) A project's Overview — the lead Overview's card grammar (858:24888, the LEAD STAGES row inside the cards); (parity P-01 · P-02 ·
 * P-04 · P-05, 2026-10-08) the lead's own pieces: the MAISON AI BRIEF on top, MY TASKS, the info column on the page's left (the frame).
 *
 * (simplify S-01 · S-02 · S-05 · S-09 · S-20 · Q-03 · Q-08 · Q-09 · Q-14, the owner's "build everything" 2026-10-09 — revises P-04's cards) The page
 * answers *What needs me → What's next → Where does it stand*, in two columns:
 *   ACT    — **Needs you** (one ranked list, each row with its one button, Needs your OK first; its top row is the header's filled button;
 *            Before work starts while set up) · MY TASKS (the lead's card; a completed project's only while tasks are open) · **With {client}**
 *            · **Coming up** (this week and next);
 *   GLANCE — **Progress** (the stages, the schedule's bar, the dates, the hold) · **Money** (contract · collected · outstanding · profit when it is
 *            graded, the next money step; a completed project's closing summary in its place) · Recent activity (3 rows).
 * Key documents became Project info rows in the info column; the Files and Questionnaire cards live in Files & notes and Client (the
 * Questionnaire's open questions are a With {client} line); the Schedule and Latest updates cards folded into Progress, Coming up and With
 * {client}. Every row opens where its fact is fixed (A-10).
 */
export function ProjectOverview({ d, href, onSetup, onOpenTab, onVisualizer, onHold, onResume, onStep, onRunItem, maison }: {
  d: ProjectDetail
  /** The page's own link builder — keeps `?from=` (REG-465). */
  href: (slug: string, query?: string) => string
  /** (fix-A, A-11) The pressed element rides along — the Assign popover anchors to the row that asked for it. */
  onSetup: (run: SetupAction | 'invite', el?: HTMLElement) => void
  onOpenTab: (slug: string) => void
  /** (fix-A, the 1.0 parity gap "Photo Renders") the project's lead's AI Visualizer design — opened, or made on first open. */
  onVisualizer: () => void
  /** (gaps build, package A — M-01) Change the hold · Resume. */
  onHold?: () => void
  onResume?: () => void
  /** (parity P-05 · A-07) A Progress stage row: the step it presses into — Start the project · Complete handover (or Review the handover) ·
   *  Reopen · Resume — the frame's own flows. */
  onStep?: (step: ProjectStep) => void
  /** (parity P-02) A waiting line with no address — one of the page's dialogs (Invite · the target end · the AI Visualizer · the hold). */
  onRunItem?: (run: NonNullable<StatusItem['run']>) => void
  /** (parity P-02 · Q-02) The page's Maison AI suggestions (components/projects/use-project-maison.ts) — the brief's buttons resolve through it. */
  maison?: ProjectMaison
}) {
  const { project: p, lead, now } = d
  const rec = d.record
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run } = useRun()
  const [askOpen, setAskOpen] = useState(false)   // (parity P-04) the Questionnaire's Ask Client — the lead Overview's dialog
  const first = lead.name.split(/\s+/)[0] ?? lead.name
  const here = href('')
  const link = (to: string) => (to.includes('from=') ? to : withFrom(to, here))
  const need = useNeedActions({ d, href, onSetup, onStep, onResume, onHold })
  const h: NeedHandlers = { act: need.act, approve: (r) => { void need.approve(r) }, sendBack: need.sendBack, busy: need.busy, link }
  const hold = p.hold ?? null

  /* (fix-A, A-10 · C-17) a waiting line opens where it is fixed — an address, or one of the page's dialogs */
  const pressOf = (x: StatusItem): (() => void) | undefined => {
    if (x.href) { const to = x.href; return () => router.push(to.startsWith('/projects/') ? link(to) : to) }
    if (x.run && onRunItem) { const r = x.run; return () => onRunItem(r) }
    if (x.run === 'invite' || x.run === 'dates:end') { const r = x.run; return () => onSetup(r) }
    if (x.run === 'visualizer') return onVisualizer
    if (x.run === 'hold') return onHold
    return undefined
  }

  /* (simplify S-01 · S-02) the brief's first button acts on the top Needs you row — the header's own action */
  const top = d.needs[0] ?? null
  const topLabel = top ? headerLabel(top, first) : null
  const briefActions = (label: string) => (top && label === topLabel ? { label, run: () => need.act(top.action, undefined, top) } : maison?.resolve(label))

  const settingUp = p.stage === 'setting_up'
  const completed = p.stage === 'completed'
  const setupDays = settingUp ? Math.max(0, calendarDaysBetween(p.createdAt.getTime(), now)) : null

  /* (gaps build, package A — 4; 1.0 D-271) A completed project's closing summary — (simplify S-01) it takes the Money card's place, so contract,
     collected and the variation orders are said once */
  const closingRows = d.closing ? closingLines(d.closing, moneyCard) : []   // (parity Q-03) a card's sums
  const closing = closingRows.length ? (
    <div data-card="closing-summary">
      <Card title="Closing summary" headGap={8} testId="closing-summary" onOpen={d.money ? () => onOpenTab('money') : undefined} openLabel="Open payments">
        <div className={styles.body}>
          <div className={styles.group}>
            {closingRows.map((l) => (
              <Row key={l.key} two /* (the calm UI build 2026-10-27, 3-16 · T-12) a caption wraps, never cut */ icon={l.key.startsWith('deferred-') ? 'pending' : l.key === 'days' ? 'event' : l.key === 'late' ? 'flag' : l.key === 'variations' ? 'request_quote' : l.key === 'refund' || l.key === 'credit' ? 'undo' : l.key === 'collected' ? 'account_balance' : 'payments'}
                   state={l.tone === 'alert' ? 'alert' : undefined} name={l.key.startsWith('deferred-') ? `Deferred: ${l.value}` : l.label} caption={l.caption}
                   meta={l.key.startsWith('deferred-') ? undefined : l.value} onPress={d.money && (l.key === 'contract' || l.key === 'collected' || l.key === 'refund' || l.key === 'credit' || l.key === 'variations') ? () => onOpenTab('money') : undefined}
                   testId={`closing-${l.key}`} />
            ))}
          </div>
        </div>
      </Card>
    </div>
  ) : null

  /* (parity P-04 · A-06) the lead Overview's MY TASKS — (simplify S-01) a completed project's only while tasks are open: no Create New Task on a
     finished job */
  const openTasks = rec.lead.tasks.some((t) => !t.done)
  const myWork = !completed || openTasks ? (
    <div data-card="my-work">
      <MyWorkCard tasks={rec.lead.tasks} now={now}
                  onCreate={() => router.push(href('tasks', 'new=1'))}   /* the Tasks tab, its add row open — the Create strip's Task */
                  onComplete={(task) => { void run('complete the task', () => completeTask(task.id), undefined, { refresh: true }) }}
                  onOpenTask={(task) => router.push(href('tasks', `open=${encodeURIComponent(task.id)}`))}
                  onOpenTab={() => onOpenTab('tasks')} />
    </div>
  ) : null

  const showComingUp = p.stage === 'in_progress' && !hold
  /* (simplify round 3, the owner's "you decide" 2026-10-10) On a phone Recent activity is one row you open — the Activity tab says it in full;
     the toggle shows only at ≤767 (project-overview.module.css), so the desk's card is unchanged */
  const [activityOpen, setActivityOpen] = useState(false)
  const activityToggle = d.activity.length ? (
    <button type="button" className={styles.foldToggle} aria-expanded={activityOpen} onClick={() => setActivityOpen((o) => !o)} data-testid="recent-activity-toggle">
      {activityOpen ? 'Hide' : 'Show'}<Icon name={activityOpen ? 'keyboard_arrow_up' : 'expand_more'} size={20} />
    </button>
  ) : null

  return (
    <>
      {/* (parity P-02 · simplify S-01) the MAISON AI BRIEF: this week's movement and the next decision; its first button acts on the top row */}
      {maison?.briefs.length ? (
        <AiBrief stage={`${p.stage}${hold ? ':hold' : ''}`} briefs={maison.briefs} actions={briefActions} onAction={() => comingSoon()}
                 lead={{ source: rec.lead.source, propertyType: rec.lead.propertyType, budgetMinor: rec.lead.budgetMinor, keyCollection: rec.lead.keyCollection }} />
      ) : null}
      <div className={styles.grid} data-testid="project-overview">
        <div className={`${styles.column} ${styles.act}`}>
          <NeedsCard rows={d.needs} hold={hold} settingUp={settingUp} setupDays={setupDays} h={h} />
          {myWork}
          <WithClientCard d={d} onInvite={() => onSetup('invite')} onAsk={() => setAskOpen(true)} onPost={() => router.push(href('updates', 'compose=1'))}
                          onOpenTab={onOpenTab} onOpenItem={pressOf} link={link} inviteInNeeds={d.needs.some((r) => r.kind === 'setup-portal')} />
          {showComingUp ? <ComingUpCard items={d.comingUp} link={link} onOpen={() => onOpenTab('schedule')} /> : null}
        </div>
        <div className={`${styles.column} ${styles.glance}`}>
          <ProgressCard d={d} onStep={onStep} onSetup={onSetup} onOpenSchedule={() => onOpenTab('schedule')} />
          {/* (Contracts on the move, C4 — P-11 · C-23) the signed quote and the contract where a designer on site looks — drawn ≤1024 only (the desk's
              info column carries them as Project info rows) */}
          <DocumentsCard rows={projectDocumentRows(d, { from: here, fileHref: (id) => href(`files/${id}`) })} />
          {completed && closing ? closing : <MoneyCard d={d} h={h} onOpenMoney={() => onOpenTab('money')} stageHref={(id) => href('money', id ? `open=${encodeURIComponent(id)}` : undefined)} onChangeValue={() => onSetup('value')} />}
          <div data-card="recent-activity" className={styles.activityFold} data-folded={activityOpen ? undefined : ''}><ActivityCard items={d.activity.slice(0, 3).map((e) => ({ at: e.at, text: e.text, icon: activityGlyph(e) }))} now={now} onOpenTab={() => onOpenTab('activity')} headExtra={activityToggle} /></div>
        </div>
      </div>
      {/* (simplify round 2, S-20 · P2 §6.7) Send back / Decline answered in place — the tabs' own dialogs */}
      <NeedAnswerDialogs row={need.answering} clientFirst={first} onClose={need.closeAnswer} />
      <AskClientDialog open={askOpen} leadName={lead.name} questions={rec.unanswered} onClose={() => setAskOpen(false)}
        onSend={(ids) => {   /* the lead Overview's own sends and sentences (REG-609 · gaps build D, item 9) */
          setAskOpen(false)
          void (async () => {
            try {
              if (ids?.length) { const r = await askClientQuestions(lead.id, ids); if (typeof r !== 'number') { snackbar({ message: `Couldn’t ask ${lead.name} — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }); return } snackbar({ message: askedLine(lead.name, r) })   /* (parity map, CP-110) where the questions are now */ }
              else { const r = await askClient(lead.id); if (r && 'error' in r) { snackbar({ message: `Couldn’t ask ${lead.name} — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }); return } snackbar({ message: `Notification sent to ${lead.name}` }) }
              router.refresh()
            } catch { snackbar({ message: 'Couldn’t record the ask — please try again' }) }
          })()
        }} />
    </>
  )
}
