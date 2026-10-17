'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Button, Link } from '@/components/ds'
import NextLink from 'next/link'
import { Drawer, DrawerRule } from '@/components/om/drawer'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { removeCrew, setCrewChecked, undoCrew, updateCrew } from '@/app/projects/contractor-actions'
import { waLink } from '@/lib/portal/model'
import { withFrom } from '@/lib/nav'
import { dayOf } from '@/lib/projects/schedule-model'
import type { CrewBoardData } from '@/lib/projects/contractors'
import { crewWords, jobOf, sameTrade, shortVendor, staffedTrades, startWords, unstaffedOf, windowWords, type CrewJob, type Unstaffed } from '@/lib/projects/contractors-model'
import { AssignDialog, type AssignTarget } from './assign-dialog'
import { CrewList, type CrewAct } from './crew-list'
import styles from './crew.module.css'
import panel from '@/components/projects/schedule/schedule.module.css'

/**
 * (S45B · H-UHD-2) What a crew row's ⋮ does — the same on the project's Schedule and on the Workload view: Planned · On site · Done, Leader
 * checked, Edit (the Assign dialog on the row), Message on WhatsApp (opened on the press), Take off the project. Each answers its sentence with
 * an Undo (the server reads what to put back from the change's own line); a refusal says its rule. The Assign dialog lives here too.
 */
export function useCrewActions(board: CrewBoardData | null | undefined, o: { nested?: boolean } = {}) {
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [target, setTarget] = useState<AssignTarget | null>(null)
  const phoneOf = (id: string) => board?.contractors.find((c) => c.id === id)?.phone ?? null
  const undoable = (sentence: string, eventId: string | null, back: string) =>
    snackbar({ message: sentence, ...(eventId ? { actionLabel: 'Undo', onAction: () => { void run('undo it', () => undoCrew(eventId), back) } } : {}) })
  const act = async (j: CrewJob, a: CrewAct) => {
    const name = shortVendor(j.vendorName)
    if (a.kind === 'edit') { setTarget({ edit: j }); return }
    if (a.kind === 'message') {
      const phone = phoneOf(j.vendorId)
      if (!phone) return
      const text = `Hi — about ${j.site?.visible ? j.site.name : 'our project'}: ${j.trade}${j.milestone ? ` on ${j.milestone.title}` : ''}, ${windowWords(j)}.`
      window.open(waLink(phone, text), '_blank', 'noopener')   // (house rule) WhatsApp opens on the press
      return
    }
    try {
      if (a.kind === 'status') {
        const r = await updateCrew(j.id, { status: a.status })
        if ('error' in r) { snackbar({ message: couldnt('change the contractor', refusalOf(r.error)) }); return }
        undoable(r.sentence, r.eventId, `${name} is ${j.state === 'on_site' ? 'on site' : j.state} again`)
      } else if (a.kind === 'check') {
        const r = await setCrewChecked(j.id, a.on)
        if ('error' in r) { snackbar({ message: couldnt(a.on ? 'mark it checked' : 'take the check off', refusalOf(r.error)) }); return }
        undoable(r.sentence, r.eventId, a.on ? 'The check is taken off' : 'The check is back')
      } else if (a.kind === 'remove') {
        const r = await removeCrew(j.id)
        if ('error' in r) { snackbar({ message: couldnt('take the contractor off', refusalOf(r.error)) }); return }
        undoable(r.sentence, r.eventId, `${name} is back on the project`)
      }
    } catch (e) { snackbar({ message: couldnt('change the contractor', refusalOf(e)) }) }
  }
  const dialog = board ? (
    <AssignDialog target={target} board={board} nested={o.nested} onClose={() => setTarget(null)}
                  onDone={(sentence, eventId) => { const was = target; setTarget(null); undoable(sentence, eventId, was?.edit ? 'Put back as it was' : 'Taken off again') }} />
  ) : null
  return { act, assign: setTarget, phoneOf, dialog, assigning: !!target }
}

/**
 * (S45B · H-UHD-2 — 1.0's per-project Contractors card and the Gantt panel's chips, in 2.0's shape) A project's contractors, on its Schedule:
 * the row line of each milestone names its crew (or the gap), the milestone's panel lists them with Add a contractor, and the toolbar's
 * Contractors opens every one of them — by trade, the gaps first, the ones on dates of their own too. Shown only when it applies: a studio
 * with no contractor and a project with none see nothing new.
 */
export function useProjectCrew({ board, projectId, mayChange, here, nested = false }: { board: CrewBoardData | null | undefined; projectId: string; mayChange: boolean; here: string; /** a panel of the host's is open under the dialog */ nested?: boolean }) {
  const [open, setOpen] = useState(false)
  const actions = useCrewActions(board, { nested: open || nested })
  const today = board ? dayOf(new Date(board.now)) : 0
  const { mine, gaps, has, staffed } = useMemo(() => {
    if (!board) return { mine: [] as CrewJob[], gaps: [] as Unstaffed[], has: false, staffed: [] as string[] }
    const sitesById = new Map(board.sites.map((s) => [s.id, s]))
    const jobs = board.crew.map((r) => jobOf(r, sitesById, today))
    const live = board.contractors.filter((c) => c.isActive)
    const staffed = staffedTrades(live, board.trades)
    const site = sitesById.get(projectId)
    const gaps = site ? unstaffedOf([site], jobs, staffed, today) : []
    const mine = jobs.filter((j) => j.projectId === projectId).sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
    return { mine, gaps, has: live.length > 0 || mine.length > 0, staffed }
  }, [board, projectId, today])
  const live = mine.filter((j) => j.state !== 'done')
  const mayCheck = !!board?.viewer.checks

  /** The schedule row's line: who is on it, or the gap — null when neither. */
  const lineFor = (milestoneId: string): { text: string; warn: boolean } | null => {
    const on = mine.filter((j) => j.milestoneId === milestoneId)
    const words = crewWords(on.filter((j) => j.state !== 'done').length ? on.filter((j) => j.state !== 'done') : on)
    if (words) return { text: words, warn: false }
    const gap = gaps.find((g) => g.milestone.id === milestoneId)
    return gap ? { text: `No ${gap.trade} contractor yet`, warn: true } : null
  }

  const gapRow = (g: Unstaffed) => (
    <div key={g.key} className={styles.gap} data-testid="crew-gap">
      <Icon name="person_add" size={20} weight={300} className={styles.gapIcon} />
      <span className={styles.gapText}>{`No ${g.trade} contractor on ${g.milestone.title} — it ${startWords(g, today)}`}</span>
      {mayChange ? <Link variant="primary" onPress={() => actions.assign({ projectId, milestoneId: g.milestone.id, trade: g.trade })} data-testid="crew-gap-add">Add one</Link> : null}
    </div>
  )

  /** The milestone panel's section: its crew, its gaps, Add a contractor. Nothing when the studio keeps no contractors and it has none. */
  const section = (milestoneId: string): ReactNode => {
    const on = mine.filter((j) => j.milestoneId === milestoneId)
    const holes = gaps.filter((g) => g.milestone.id === milestoneId)
    if (!has && !on.length) return null
    return (
      <>
        <DrawerRule />
        <section className={panel.section} aria-label="Contractors" data-testid="panel-crew">
          <div className={panel.sectionHead}><h3 className={panel.sectionTitle}>Contractors</h3><span className={panel.sectionMeta}>{on.length ? `${on.length} on it` : 'None yet'}</span></div>
          {holes.length ? <div className={styles.gaps}>{holes.map(gapRow)}</div> : null}
          {on.length ? <CrewList jobs={on} mayChange={mayChange} mayCheck={mayCheck} phoneOf={actions.phoneOf} onAct={(j, a) => { void actions.act(j, a) }} showMilestone={false} /> : null}
          {mayChange && !holes.length ? <span><Link variant="primary" onPress={() => actions.assign({ projectId, milestoneId })} data-testid="panel-crew-add">Add a contractor</Link></span> : null}
        </section>
      </>
    )
  }

  const groups = staffed.concat(mine.map((j) => j.trade)).filter((t, i, a) => a.findIndex((x) => sameTrade(x, t)) === i)
    .map((t) => ({ trade: t, jobs: mine.filter((j) => sameTrade(j.trade, t)) })).filter((g) => g.jobs.length)
  const node = (
    <>
      <Drawer open={open} title="Contractors" width="wide" onClose={() => setOpen(false)} label="Contractors on this project"
              footer={mayChange ? <Button onPress={() => actions.assign({ projectId })} data-testid="crew-panel-add">Add a contractor</Button> : undefined}>
        <div className={styles.panel} data-testid="crew-panel">
          <p className={styles.lede}>Who works on site, and when. On a milestone, their dates are the milestone’s — when the schedule moves, they move with it.</p>
          {gaps.length ? <div className={styles.gaps}>{gaps.map(gapRow)}</div> : null}
          {groups.map((g) => (
            <div key={g.trade} className={styles.group}>
              <h3 className={styles.groupTitle}>{g.trade}</h3>
              <CrewList jobs={g.jobs} mayChange={mayChange} mayCheck={mayCheck} phoneOf={actions.phoneOf} onAct={(j, a) => { void actions.act(j, a) }} showTrade={false} />
            </div>
          ))}
          {mine.length || gaps.length ? null : board && !board.contractors.some((c) => c.isActive)
            ? <p className={styles.lede} data-testid="crew-none">No vendor is marked as working on site yet. <NextLink className={panel.textLink} href={withFrom('/company/finance/vendors', here)}>Mark them in Finance › Vendors</NextLink> — then put them on this project’s milestones.</p>
            : <p className={styles.lede} data-testid="crew-none">No contractors on this project yet — put one on a milestone, or on dates of their own.</p>}
        </div>
      </Drawer>
      {actions.dialog}
    </>
  )
  return { has, count: live.length, total: mine.length, gaps: gaps.length, open: () => setOpen(true), assign: actions.assign, lineFor, section, node }
}
