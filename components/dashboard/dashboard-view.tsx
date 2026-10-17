'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeader } from '@/components/shell/page-header'
import { Card, CardRule } from '@/components/leads/detail/card'
import { AiBrief } from '@/components/leads/detail/ai-brief'
import { MyWorkCard } from '@/components/leads/detail/my-work-card'
import { Row } from '@/components/projects/overview/row'
import { needIcon } from '@/components/projects/overview/needs-card'
import { ComingUpCard } from '@/components/projects/overview/coming-up-card'
import { StatTile, StatTiles } from '@/components/om/stat-tile'
import { TextField } from '@/components/om/text-field'
import { IconButton } from '@/components/om/icon-button'
import { useSheetLayout } from '@/components/om/sheet'
import { useSnackbar } from '@/components/om/snackbar'
import { useRun } from '@/components/leads/tasks/use-run'
import { leaveThen } from '@/components/company/leave-guard'
import { setTasksDone, undoTasksDone } from '@/app/leads/tasks-actions'
import { askMaisonAi, useMaisonAi } from '@/lib/maison-ai'
import { MAX_QUESTION } from '@/lib/maison-ai/intents'
import { withFrom } from '@/lib/nav'
import { COMING_SHOWN, DASHBOARD, NEEDS_SHOWN, NEEDS_SHOWN_PHONE, TEAM_SHOWN, type DashRow, type DashboardData } from '@/lib/dashboard/model'
import { DashboardGhost } from './dashboard-ghost'
import pageStyles from '@/app/leads/leads.module.css'
import overview from '@/components/projects/project-overview.module.css'
import styles from './dashboard.module.css'

/**
 * (pending modules S22 — cards studio:dashboard · held:dashboard · api:industry-news · public:industry-news-feed) **The Dashboard** — 1.0's
 * front door in 2.0's shape, no mock: the house pieces the lead and project Overviews are made of (the MAISON AI BRIEF, the card grid's two
 * stacks weighted act : glance, LEAD STAGES rows, MY TASKS, Coming up, the house number tiles). It answers **What needs me** (Needs you, then
 * My tasks) → **What's next** (Coming up) → **Where it stands** (the tiles, the team's load, the latest site updates, one article), and
 * every row and tile is a door into the thing's one home with the way back here. The brief holds 1.0's greeting and the assistant's box — the
 * FAB sheet's own Ask, here on the page (S10): a question opens the sheet with it asked, and lands in its Recent.
 */
export function DashboardView({ data }: { data: DashboardData }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const phone = useSheetLayout()
  const go = (href: string) => { if (href.startsWith('tel:')) { window.location.assign(href); return } leaveThen(() => router.push(href)) }
  /* the page's questions for the FAB sheet: the brief's two, then the rest — each asked of the records (lib/maison-ai/answer.ts) */
  useMaisonAi(data.asks)
  const ask = (text: string) => askMaisonAi({ text })

  /* MY TASKS: ticking a task done says so with Undo — the Tasks tab's own words (lead-tasks.tsx `setDone`) */
  const complete = async (taskId: string) => {
    let res: Awaited<ReturnType<typeof setTasksDone>> = { changed: [], eventIds: [], stamps: [] }
    const ok = await run('complete the task', async () => { res = await setTasksDone([taskId], true) }, undefined, { guard: `done:${taskId}` })
    if (!ok) return
    if (!res.changed.length) { snackbar({ message: 'The task is already completed' }); router.refresh(); return }
    const back = res
    snackbar({ message: 'Task completed', actionLabel: 'Undo', onAction: () => { void run('reopen the task', () => undoTasksDone({ taskIds: back.changed, done: true, eventIds: back.eventIds, stamps: back.stamps }), 'Task reopened', { refresh: true }) } })
    router.refresh()
  }

  return (
    <PageReveal skeleton={<DashboardGhost />}>
      <div className={pageStyles.body} data-testid="dashboard">
        <PageHeader title="Dashboard" />
        <div className={styles.content}>
          <AiBrief stage="dashboard" briefs={[data.brief]} onAction={ask} actions={(label) => ({ label, run: () => ask(label) })} ask={<AskBox />} />
          <div className={`${overview.grid} ${styles.grid}`}>
            <div className={`${overview.column} ${overview.act} ${styles.col}`}>
              <NeedsCard rows={data.needs} phone={phone} go={go} />
              <div data-card="my-work">
                <MyWorkCard tasks={data.tasks} now={data.now} whereOf={(t) => data.where[t.id] ?? null}
                            onCreate={() => go('/tasks?add=1')}
                            onComplete={(t) => { void complete(t.id) }}
                            onOpenTask={(t) => go(`/tasks?open=${encodeURIComponent(t.id)}`)}
                            onOpenTab={() => go('/tasks?scope=mine')}
                            quietEmpty={(
                              <div className={overview.body}>
                                <div className={overview.group}>
                                  <Row two icon="task" name="Nothing on your list" caption="Tasks given to you land here"
                                       actions={[{ label: 'Add a task', onPress: () => go('/tasks?add=1'), testId: 'my-work-add' }]} testId="my-work-quiet" />
                                </div>
                              </div>
                            )} />
              </div>
              <ComingUpCard items={data.coming} link={(to) => to} desk={COMING_SHOWN} empty="Nothing coming up this week or next" two />
            </div>
            <div className={`${overview.column} ${overview.glance} ${styles.col}`}>
              <div data-card="stands">
                <Card title="Where it stands" headGap={8} testId="stands">
                  <div className={styles.tiles}>
                    <StatTiles testId="stands-tiles" className={styles.standTiles}>
                      {data.tiles.map((t) => <StatTile key={t.key} label={t.label} value={t.value} help={t.help} grade={t.grade} testId={`tile-${t.key}`} press={{ href: t.href, label: t.aria }} />)}
                    </StatTiles>
                  </div>
                </Card>
              </div>
              {data.team?.length ? <TeamCard rows={data.team} go={go} /> : null}   {/* (S42 audit A-07) shown only when it has a line to draw */}
              {data.updates?.length ? (
                <div data-card="updates">
                  <Card title="Site updates" headGap={8} testId="site-updates">
                    <div className={overview.body}>
                      <div className={overview.group}>
                        {data.updates.map((u) => <Row key={u.key} two icon={u.icon} name={u.title} caption={u.caption} href={u.href} testId="site-update-row" />)}
                      </div>
                    </div>
                  </Card>
                </div>
              ) : null}
              {data.article ? (
                <div data-card="article">
                  <Card title="From Market Insights" headGap={8} onOpen={() => go(withFrom('/market-insights', DASHBOARD))} openLabel="Open Market Insights" testId="insights-card">
                    <div className={overview.body}>
                      <div className={overview.group}>
                        <Row two icon="trending_up" name={data.article.title} caption={data.article.caption} href={data.article.href} testId="insights-row" />
                      </div>
                    </div>
                  </Card>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </PageReveal>
  )
}

/** The page's Ask box — the FAB sheet's own (components/shell/maison-ai.tsx `askBox`): the same field, its words and its limit. A question
    opens the sheet with it asked; the answer is read from the records and the question lands in Recent. */
function AskBox() {
  const [question, setQuestion] = useState('')
  const send = () => {
    const q = question.replace(/\s+/g, ' ').trim()
    if (!q) return
    askMaisonAi({ text: q })
    setQuestion('')
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); send() }} noValidate data-testid="dashboard-ask">
      <TextField label="Ask Maison AI" value={question} onChange={setQuestion} maxLength={MAX_QUESTION} autoComplete="off" helper="Answers from your records"
                 trailing={<IconButton icon="send" label="Ask" variant="bare" onClick={send} disabled={!question.trim()} data-testid="dashboard-ask-send" />} />
    </form>
  )
}

/**
 * NEEDS YOU — the project Overview's card (components/projects/overview/needs-card.tsx) over the studio: one row per place that waits on you,
 * its words opening the place and its one text button the step; *Needs your OK* first, then Q-03's order; six rows (four on a phone) before
 * "Show n more". Nothing waiting: "Nothing waits on you" (the project card's words).
 */
function NeedsCard({ rows, phone, go }: { rows: DashRow[]; phone: boolean; go: (href: string) => void }) {
  const [more, setMore] = useState(false)
  const shown = more ? rows : rows.slice(0, phone ? NEEDS_SHOWN_PHONE : NEEDS_SHOWN)
  const hidden = rows.length - shown.length
  const okCount = rows.filter((r) => r.ok).length
  const firstOk = shown.findIndex((r) => r.ok)
  const lastOk = shown.length - 1 - [...shown].reverse().findIndex((r) => r.ok)
  return (
    <div data-card="needs">
      <Card title="Needs you" headGap={8} meta={rows.length ? `· ${rows.length}` : undefined} testId="needs">
        <div className={overview.body}>
          {!rows.length ? <p className={overview.line} data-testid="needs-empty">Nothing waits on you</p> : (
            <div className={overview.group}>
              {shown.map((r, i) => (
                <Fragment key={r.key}>
                  {i === firstOk ? <div className={overview.groupLabel} data-tone="approve" data-testid="needs-ok"><span className={overview.groupText}><span>Needs your OK</span><span>·</span><span>{okCount}</span></span></div> : null}
                  <Row two icon={r.need ? needIcon(r.need.kind, r.need.tab) : r.icon} name={r.title} caption={r.caption}
                       state={r.tone === 'late' ? 'alert' : undefined} tone={r.tone === 'approve' ? 'approve' : undefined}
                       href={r.open} actions={[{ label: r.action.label, onPress: () => go(r.action.href), testId: 'need-action' }]} testId={`need-${r.kind.replace(/[^a-z0-9-]/gi, '-')}`} />
                  {i === lastOk && firstOk >= 0 && i < shown.length - 1 ? <CardRule inset={0} /> : null}
                </Fragment>
              ))}
              {hidden > 0 || more ? (
                <Row icon={more ? 'keyboard_arrow_up' : 'expand_more'} name={more ? 'Show less' : `Show ${hidden} more`} onPress={() => setMore((m) => !m)} testId="needs-more" toggle />
              ) : null}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

/** WORKLOAD — Projects › Workload's lines (projects against each one's capacity) with each member's open leads; ↗ the Workload view. */
function TeamCard({ rows, go }: { rows: NonNullable<DashboardData['team']>; go: (href: string) => void }) {
  const [more, setMore] = useState(false)
  const shown = more ? rows : rows.slice(0, TEAM_SHOWN)
  const hidden = rows.length - shown.length
  const href = '/projects?view=workload'
  return (
    <div data-card="team">
      <Card title="Workload" headGap={8} onOpen={() => go(href)} openLabel="Open Workload" testId="team">
        <div className={overview.body}>
          <div className={overview.group}>
            {shown.map((r) => <Row key={r.key} two icon={r.key === 'nobody' ? 'person_add' : 'person'} name={r.name} caption={r.caption} meta={r.meta} href={href} testId="team-row" />)}
            {hidden > 0 || more ? <Row icon={more ? 'keyboard_arrow_up' : 'expand_more'} name={more ? 'Show less' : `Show ${hidden} more`} onPress={() => setMore((m) => !m)} testId="team-more" toggle /> : null}
          </div>
        </div>
      </Card>
    </div>
  )
}
