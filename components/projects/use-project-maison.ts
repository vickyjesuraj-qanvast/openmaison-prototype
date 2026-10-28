'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { withFrom } from '@/lib/nav'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { dayLabel, plural } from '@/lib/projects/schedule-model'
import { suggestionLabel, type MaisonAnswer, type MaisonProposal, type MaisonSuggestion } from '@/lib/maison-ai'
import { addNextStepTask, complianceToDo, draftWeekUpdate, lateMilestones, nextStepTask, teamNames } from '@/app/projects/maison-actions'
import { saveProjectUpdate } from '@/app/projects/updates-actions'
import { BRIEF_ACTIONS, projectBriefs, type ProjectBriefFacts } from '@/lib/projects/briefs'
import { closingLines } from '@/lib/projects/handover-model'
import type { Brief } from '@/lib/leads/briefs'
import type { ProjectDetail, StatusItem } from '@/lib/projects/queries'
import type { SetupAction } from '@/lib/projects/getting-started'
import { headerLabel, type NeedRow } from '@/lib/projects/needs-you'   // (simplify S-01 · S-02)
import { reviewAsk } from '@/lib/maison-ai/review-ask'   // (pending modules S14)

const here = () => `${window.location.pathname}${window.location.search}`
const dayOfIso = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86_400_000)

/** (parity P-02) The brief's facts from the Overview's own records — nothing fetched for them. */
export function briefFactsOf(d: ProjectDetail): ProjectBriefFacts {
  const { project: p, lead } = d
  return {
    stage: p.stage, hold: p.hold ?? null, client: lead.name.split(/\s+/)[0] ?? lead.name, direct: lead.direct,
    setup: d.setup.map((s) => ({ key: s.key, label: s.label, help: s.help, done: s.done })),
    attention: d.attentionItems, waiting: d.waitingItems,
    schedule: d.schedule ? { done: d.schedule.facts.progress.done, total: d.schedule.facts.progress.total, next: d.schedule.next[0] ?? null } : null,
    closing: d.closing ?? null, wonAt: d.wonAt.getTime(), completedAt: p.completedAt?.getTime() ?? null, now: d.now,
    /* (simplify S-01) the brief acts on the top Needs you row and tells the week: what runs now, and the client's wait */
    top: d.needs?.[0] ? headerLabel(d.needs[0], firstOf(lead.name)) : null,
    running: (() => {
      const m = d.schedule?.running[0] ?? d.schedule?.next.find((x) => x.status === 'blocked')
      if (!m) return null
      /* (the calm UI build 2026-10-27, 3-30) an ask for more time on it, waiting on this viewer — the brief says who asks to finish when */
      const ask = d.needs?.find((r) => r.kind === 'approve-more-time' && r.ask?.milestoneId === m.id)?.ask
      return { title: m.title, end: m.end, ask: ask?.asked !== undefined ? { by: ask.who, to: ask.asked } : null }
    })(),
    wait: d.schedule?.facts.waiting?.onClient ? { title: d.schedule.facts.waiting.title, days: d.schedule.facts.waiting.days, note: d.schedule.facts.waiting.note } : null,
  }
}
const firstOf = (name: string) => name.split(/\s+/)[0] ?? name

/** What the page hands the suggestions that open its own dialogs: Getting started's rows, and a Project stages row with no address. */
export type ProjectMaisonDoors = {
  onSetup?: (run: SetupAction) => void
  onRunItem?: (run: NonNullable<StatusItem['run']>) => void
  /** (simplify S-01) a Needs you row with no address — the page's own runner (the Overview's); without one, the row opens where it lives */
  onNeed?: (row: NeedRow) => void
}

/** (parity P-02 · Q-02) The suggestions the FAB lists, every suggestion a brief's button can name, and the briefs themselves.
    (simplify Q-09) `draftWeek` — the weekly update's Draft it: the week's draft saved (a draft, never sent) and opened in Updates. */
export type ProjectMaison = { suggestions: MaisonSuggestion[]; resolve: (label: string) => MaisonSuggestion | undefined; briefs: Brief[]; draftWeek: () => Promise<boolean> }

/**
 * (gaps build I, I-Q16 · I-Q17) Maison AI on a project's page — suggestions that do things through the project's own actions and rules:
 * **What is overdue** (an answer; each row opens the milestone's panel), **Add a task for the next step** (a proposal → the Tasks tab's action for
 * the team; the snackbar opens it), **Draft an update about this week** (a proposal → the Updates tab's Save draft — a draft, never sent; Open), **What
 * compliance is still to do** (an answer; each row opens the item), and on the Schedule **Draft a schedule from the quote** (the Start card
 * or the Rebuild dialog on Maison AI's way) and **Tell {client} about the new dates** (Share changes). Nothing metered (Q-30).
 *
 * (parity P-02 · Q-02, the owner's pick 2026-10-08) The Overview's MAISON AI BRIEF (lib/projects/briefs.ts) runs through this same contract: its
 * two buttons are suggestions here — the three it adds answer from the page's own records, as the Project stages card reads them: **What is
 * still to set up?** (Getting started's open items, each running its own button), **What needs attention?** (the card's red rows and what waits
 * on the client, each opening where it is fixed), **Summarise the project** (a completed project's closing summary). The FAB lists the primary
 * brief's two first, then the rest. (parity P-34) "overdue" for a milestone past its day now; "n days late" stays as a date's measure.
 */
export function useProjectMaison(o: { projectId: string; name: string; client: string; tab: string; stage: string; mayChange: boolean; hasSchedule: boolean
  /** (parity P-02) The page's records — the briefs and the answers that read them. */
  d?: ProjectDetail
  doors?: ProjectMaisonDoors }): ProjectMaison {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const { projectId, client, tab, stage, mayChange, hasSchedule, d, doors } = o
  /* (the calm UI build 2026-10-27, 3-01 · 3-09) a phone's header draws no filled button on the Overview — the brief leads with its step there */
  const phone = useMediaQuery(MOBILE)
  return useMemo(() => {
    const base = `/projects/${projectId}`
    /* (parity P-34) a milestone past its day now is overdue — the Project stages card's word */
    const late: MaisonSuggestion = { label: BRIEF_ACTIONS.overdue, answer: async (): Promise<MaisonAnswer> => {
      const r = await lateMilestones(projectId)
      if ('error' in r) return { title: 'Nothing to show', text: r.error }
      return r.rows.length
        ? { title: `${plural(r.rows.length, 'milestone')} overdue`, text: 'Open one to move its dates, mark it done or ask for more time.',
            rows: r.rows.map((x) => ({ id: x.milestoneId, label: x.title, meta: `Ended ${dayLabel(x.end)} · ${plural(x.days, 'day')} late`, href: withFrom(`${base}/schedule?open=${encodeURIComponent(x.milestoneId)}`, here()) })) }
        : { title: 'Nothing is overdue', text: hasSchedule ? 'Every milestone is on time or done.' : 'This project has no schedule yet.' }
    } }
    const task: MaisonSuggestion = { label: BRIEF_ACTIONS.task, propose: async (): Promise<MaisonProposal | MaisonAnswer> => {
      const [r, team] = await Promise.all([nextStepTask(projectId), teamNames(projectId)])
      if ('error' in r) return { title: 'Couldn’t look at the schedule', text: r.error }
      if (!r.mayAdd) return { title: r.title, text: `${r.why} Only the project’s members, their Managers, Owners and Admins add its tasks.` }
      if (!r.due && !hasSchedule) return { title: 'Set up the schedule first', text: r.why, rows: [{ id: 'schedule', label: 'Open the Schedule', href: withFrom(`${base}/schedule`, here()) }] }
      return {
        title: r.title, text: r.why, confirm: 'Add the task',
        lines: [`For ${team.length ? team.join(', ') : 'the project’s members'}`, r.due ? `Due ${dayLabel(dayOfIso(r.due))}` : 'No due date'],
        run: async () => {
          let made: { id: string; leadId: string } | null = null
          const ok = await run('add the task', async () => { const x = await addNextStepTask(projectId, { title: r.title, due: r.due }); if ('error' in x) return x; made = x; return null })
          const m = made as { id: string; leadId: string } | null
          if (ok && m) {
            snackbar({ key: 'maison-task', message: `Task added — ${r.title}`, actionLabel: 'Open', onAction: () => router.push(withFrom(`${base}/tasks?open=${encodeURIComponent(m.id)}`, here())) })
            router.refresh()
          }
          return ok
        },
      }
    } }
    const update: MaisonSuggestion = { label: BRIEF_ACTIONS.update, propose: async (): Promise<MaisonProposal | MaisonAnswer> => {
      const r = await draftWeekUpdate(projectId)
      if ('error' in r) return { title: 'Couldn’t look at the schedule', text: r.error }
      if (!mayChange) return { title: r.title, text: 'Only the project’s members, their Managers, Owners and Admins write its updates.' }
      return {
        title: r.title, text: `A draft for ${client} — it stays a draft until you send it, and the review rule applies as usual.`, lines: r.lines, confirm: 'Save the draft',
        run: async () => {
          try {
            const x = await saveProjectUpdate(projectId, { title: r.title, html: r.html, milestoneId: r.milestoneId, fileIds: [], intent: 'draft' })
            if ('error' in x) { snackbar({ message: couldnt('save the draft', refusalOf(x.error)) }); return false }
            snackbar({ key: 'maison-update', message: 'Draft update saved — it isn’t sent', actionLabel: 'Open', onAction: () => router.push(withFrom(`${base}/updates?draft=${encodeURIComponent(x.id)}`, here())) })
            router.refresh()
            return true
          } catch (e) { snackbar({ message: couldnt('save the draft', refusalOf(e)) }); return false }
        },
      }
    } }
    const compliance: MaisonSuggestion = { label: BRIEF_ACTIONS.compliance, answer: async (): Promise<MaisonAnswer> => {
      const r = await complianceToDo(projectId)
      if ('error' in r) return { title: 'Nothing to show', text: r.error }
      return r.rows.length
        ? { title: `${plural(r.rows.length, 'mandatory item')} to do`, text: `In the ${r.phase} phase — open one for what to do and the official source.`, rows: r.rows.map((x) => ({ id: x.id, label: x.title, meta: x.authority, href: withFrom(`${base}/compliance?item=${encodeURIComponent(x.id)}`, here()) })) }
        : { title: 'Nothing mandatory to do', text: `Every mandatory item in the ${r.phase} phase is answered.` }
    } }

    /* ── (parity P-02) the brief's own answers, from the page's records — invented copy in the briefs' voice ── */
    const setup: MaisonSuggestion = { label: BRIEF_ACTIONS.setup, answer: (): Promise<MaisonAnswer> => {
      const open = (d?.setup ?? []).filter((s) => !s.done)
      const canRun = (r: SetupAction) => mayChange && (r !== 'assign' || (d?.assignable.length ?? 0) > 0)
      return Promise.resolve(open.length
        ? { title: `${plural(open.length, 'thing')} to set up`, text: 'Getting started, in its own order — open one to do it now.',
            rows: open.map((s) => ({ id: s.key, label: s.label, meta: s.help, run: canRun(s.action.run) && doors?.onSetup ? () => doors.onSetup!(s.action.run) : undefined })) }
        : { title: 'Everything is set up', text: stage === 'setting_up' ? 'Start the project when the work begins.' : 'Getting started is done.' })
    } }
    const itemRow = (x: StatusItem) => ({ id: x.key, label: x.text, meta: x.caption,
      href: x.href ? (x.href.startsWith('/projects/') ? withFrom(x.href, here()) : x.href) : undefined,
      run: !x.href && x.run && doors?.onRunItem ? () => doors.onRunItem!(x.run!) : undefined })
    /* (simplify S-01) one list: the answer IS Needs you — each row opening where it is fixed — then what waits on the client */
    const needRow = (r: NeedRow) => ({ id: r.key, label: r.title, meta: r.meta,
      href: r.action.href ? (r.action.href.startsWith('/projects/') ? withFrom(r.action.href, here()) : r.action.href) : doors?.onNeed ? undefined : withFrom(base, here()),
      run: !r.action.href && doors?.onNeed ? () => doors.onNeed!(r) : undefined })
    const attention: MaisonSuggestion = { label: BRIEF_ACTIONS.attention, answer: (): Promise<MaisonAnswer> => {
      const needs = d?.needs ?? []
      const waits = d?.waitingItems ?? []
      const rows = [...needs.map(needRow), ...waits.map(itemRow)]
      return Promise.resolve(rows.length
        /* (the calm UI build 2026-10-27, T-01) "n need your attention"; empty: "You’re all caught up" */
        ? { title: needs.length ? `${plural(needs.length, 'thing')} need${needs.length === 1 ? 's' : ''} your attention` : `Waiting on ${client}`,
            text: `${needs.length ? 'Each opens where it is fixed' : 'You’re all caught up'}${waits.length ? `; ${plural(waits.length, 'thing')} wait${waits.length === 1 ? 's' : ''} on ${client}` : ''}.`, rows }
        : { title: 'You’re all caught up', text: `Nothing waits on ${client} either.` })
    } }
    /* (simplify S-01 · S-02) the brief's first button: the top Needs you row — what the header's filled button does (the same row, S-02) */
    const topRow = d?.needs?.[0] ?? null
    const top: MaisonSuggestion | null = topRow ? { label: headerLabel(topRow, client), run: () => {
      if (topRow.action.href) { router.push(topRow.action.href.startsWith('/projects/') ? withFrom(topRow.action.href, here()) : topRow.action.href); return }
      if (doors?.onNeed) { doors.onNeed(topRow); return }
      document.querySelector<HTMLElement>('[data-testid="project-primary"] button')?.click()   // the header's button runs the same row
    } } : null
    /* (simplify Q-09) Draft it: the week's draft from the records (no credits), saved as a draft — never sent — and opened in Updates */
    const draftWeek = async (): Promise<boolean> => {
      try {
        const r = await draftWeekUpdate(projectId)
        if ('error' in r) { snackbar({ message: couldnt('draft the update', refusalOf(r.error)) }); return false }
        const x = await saveProjectUpdate(projectId, { title: r.title, html: r.html, milestoneId: r.milestoneId, fileIds: [], intent: 'draft' })
        if ('error' in x) { snackbar({ message: couldnt('save the draft', refusalOf(x.error)) }); return false }
        snackbar({ key: 'maison-update', message: 'Draft update saved — it isn’t sent' })
        router.push(withFrom(`${base}/updates?draft=${encodeURIComponent(x.id)}`, here()))
        return true
      } catch (e) { snackbar({ message: couldnt('draft the update', refusalOf(e)) }); return false }
    }
    const summary: MaisonSuggestion = { label: BRIEF_ACTIONS.summary, answer: (): Promise<MaisonAnswer> => {
      const lines = d?.closing ? closingLines(d.closing) : []
      const money = new Set(['contract', 'collected', 'refund', 'credit', 'variations'])
      return Promise.resolve(lines.length
        ? { title: `${d!.project.number} · the closing summary`, text: 'Contract against collected, the days against the plan, and what was deferred.',
            rows: lines.map((l) => ({ id: l.key, label: l.key.startsWith('deferred-') ? `Deferred: ${l.value}` : l.label, meta: l.key.startsWith('deferred-') ? l.caption : [l.value, l.caption].filter(Boolean).join(' · '),
              href: d!.money && money.has(l.key) ? withFrom(`${base}/money`, here()) : undefined })) }
        : { title: 'Nothing to summarise yet', text: 'The closing summary is written when the project is completed.' })
    } }

    /* (pending modules S14) Ask for a review — a completed project's client, with the studio's review link (lib/maison-ai/review-ask.ts) */
    const review: MaisonSuggestion | null = d && stage === 'completed' ? { label: BRIEF_ACTIONS.review, propose: () => reviewAsk({
      lead: { name: d.lead.name, propertyType: d.lead.propertyType, stage: 'Won', onProject: true }, phone: d.lead.phone, first: client, done: true, here: here() }) } : null
    const briefs = d ? projectBriefs({ ...briefFactsOf(d), topHere: phone }) : []
    const pool: MaisonSuggestion[] = [...(top ? [top] : []), late, task, update, compliance, setup, attention, summary, ...(review ? [review] : [])]
    const resolve = (label: string) => pool.find((s) => suggestionLabel(s) === label)
    let suggestions: MaisonSuggestion[]
    if (tab === 'schedule') suggestions = [
      late,
      ...(mayChange && stage !== 'completed' ? [{ label: 'Draft a schedule from the quote', run: () => router.push(`${base}/schedule?draft=ai`) } as MaisonSuggestion] : []),
      ...(hasSchedule ? [{ label: `Tell ${client} about the new dates`, run: () => router.push(`${base}/schedule?share=1`) } as MaisonSuggestion] : []),
    ]
    else {
      /* (parity P-02 · Q-02) the primary brief's two buttons first — the FAB's own — then the page's others */
      const first = (briefs[0]?.actions ?? []).map(resolve).filter((s): s is MaisonSuggestion => !!s)
      /* (simplify S-01) on the other tabs "What needs attention?" lists Needs you — the Overview already shows it */
      const rest = stage === 'completed' ? [late, compliance, ...(review ? [review] : [])] : [late, task, update, compliance, ...(tab ? [attention] : [])]
      suggestions = [...first, ...rest.filter((s) => !first.includes(s))]
    }
    return { suggestions, resolve: (label: string) => suggestions.find((s) => suggestionLabel(s) === label) ?? resolve(label), briefs, draftWeek }
  }, [projectId, client, tab, stage, mayChange, hasSchedule, d, doors, router, snackbar, run, phone])
}
