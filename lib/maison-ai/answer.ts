'use server'

import { meetingsAnswer, nextMeetingAnswer } from './answers/meetings'   // (pending modules S23)
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadTasks, leads, projectMilestones, projectSelections, projects, quotes, stageLogs } from '@/lib/db/schema'
import { fetchStageMovement } from '@/lib/settings/queries'   // (S42 B-11)
import { isActiveStage, isCompletedFor, stageIntent } from '@/lib/leads/stage-policy'
import type { Stage } from '@/lib/leads/enums'
import { canOpenLead, fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { titleCaseName } from '@/lib/format'
import { moveStageHref } from '@/lib/leads/move-link'
import { seesMoney } from '@/lib/projects/policy'
import { milestonesOf } from '@/lib/projects/schedule'
import { STATUS_LABEL, dayLabel, dayOf, isLate, lateBy, plural, predsOf, rangeLabel, type Milestone } from '@/lib/projects/schedule-model'
import { moneyInputOf } from '@/lib/projects/money-queries'
import { moneyOf } from '@/lib/projects/money'
import { money2 } from '@/lib/quotes/math'
import { COMPLIANCE_PHASES, KIND_LABEL, categoryLabel, complianceKindOf, itemsFor, phaseLabel, phaseOfStage, type ComplianceKind } from '@/lib/compliance/model'
import { answersOf, complianceCountsOf, fetchRegistrations } from '@/lib/compliance/queries'
import { STUDIO_ACTIONS } from '@/lib/compliance/studio-actions'
import type { MaisonAnswer, MaisonRow } from '@/lib/maison-ai'
import { NOT_YOURS, go, reportAnswer, row, seenProjects, type Ctx } from './answers/common'
import { LEAD_FIELD_WORDS, askChips, cleanQuestion, fieldOf, leadParams, matchQuestion, startParams, stepOf, type AskParams, type IntentId } from './intents'
import { isAccounting, isMarketing, seesBooks } from '@/lib/settings/roles'
import { PROFIT_HIDDEN, seesCost, seesProfit } from '@/lib/settings/cost-visibility'   // (pending modules S41b-1)
import { recordAsked } from './history-store'
import { ON_DESK, ON_LEADS } from './answers/common'
import { aboutAnswer, approvalsAnswer, siteUpdateAnswer, attachAnswer, writingAnswer, designsWaitingAnswer, draftAnswer, fullyNamed, helpAnswer, layoutsOpenedAnswer, leadsAttentionAnswer, memberRoleAnswer, membersNamed, myTasksAnswer, overviewAnswer, peopleNamed, quotesAnswer, remindAnswer, rendersByLeadAnswer, rendersPickedAnswer, taskDoneAnswer, teamAnswer } from './answers/work'
import { ageingAnswer, cashflowAnswer, creditNotesAnswer, creditsAnswer, expensesAnswer, moneyNewAnswer, planAnswer, pnlAnswer, recordPaymentAnswer, repeatsAnswer, statementAnswer, stopRepeatAnswer } from './answers/money'
import { issuesAnswer, portalOpenedAnswer, portalSeesAnswer, portalSignInAnswer, studiosPortalAnswer } from './answers/clients'
import { listingAnswer, setupAnswer } from './answers/setup'
import { qanvastCreditsAnswer, qanvastReviewsAnswer } from './answers/qanvast'   // (pending modules S41b-5)
import { missedAnswer } from './answers/notices'   // (pending modules S18)
import type { MoveStep } from '@/lib/leads/move-link'

/*
 * (parity map 2026-10-10 — TD-107 · SC-060 · FB-118 · PR-059) Maison AI's **Ask** box, answered from the studio's records by rule (the intents
 * in ./intents.ts — no model, no credits; a stand-in for 1.0's mAIson bot). Every read follows Who sees leads (`visibleLeadIds` · `canOpenLead`);
 * the studio's books — who owes, GST, margins, vendor spend, commission — are Owners' and Admins' (Company › Reports › Finance's own rule,
 * `fetchBooks`), read through the same `buildReport` the reports draw, so an answer and its report never disagree; a member asking who owes is
 * answered for the projects whose money they see. Every row opens where the thing is fixed, with the way back (`?from=`); a report answer
 * carries one button to its report. Nothing is written.
 */

type AskInput = { question: string; path?: string | null; projectId?: string | null; milestoneId?: string | null
  /** (pending modules S10) false — a page's own words asked for it (a suggestion), not the member's question: not kept in Recent */ record?: boolean }

/* ── the schedule ───────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

async function lateAnswer(c: Ctx, p: AskParams): Promise<MaisonAnswer> {
  const list = await seenProjects(c, { running: true, only: p.here || c.projectId ? c.projectId : null })
  const ms = await milestonesOf(list.map((x) => x.p.id))
  const late = list.flatMap((x) => (ms.get(x.p.id) ?? []).filter((m) => isLate(m, c.today)).map((m) => ({ x, m, days: lateBy(m, c.today) }))).sort((a, b) => b.days - a.days)
  const one = !!c.projectId
  if (!late.length) return { title: 'Nothing is overdue', text: one ? 'Every milestone on this project is on time or done.' : 'Every running milestone you see is on time or done.' }
  return { title: `${plural(late.length, 'milestone')} overdue`, text: 'Open one to move its dates, mark it done or ask for more time.',
    rows: late.slice(0, 12).map(({ x, m, days }) => row(c, m.id, one ? m.title : `${m.title} · ${x.p.name}`, `Ended ${dayLabel(m.end)} · ${plural(days, 'day')} late`, `/projects/${x.p.id}/schedule?open=${encodeURIComponent(m.id)}`)) }
}

async function nextAnswer(c: Ctx, p: AskParams): Promise<MaisonAnswer> {
  const list = await seenProjects(c, { running: true, only: p.here || c.projectId ? c.projectId : null })
  const ms = await milestonesOf(list.map((x) => x.p.id))
  const soon = list.flatMap((x) => (ms.get(x.p.id) ?? []).filter((m) => m.status === 'not_started' && m.start >= c.today && m.start <= c.today + 7).map((m) => ({ x, m })))
    .sort((a, b) => a.m.start - b.m.start)
  const one = !!c.projectId
  if (!soon.length) {
    const running = list.flatMap((x) => (ms.get(x.p.id) ?? []).filter((m) => m.status === 'in_progress').map((m) => ({ x, m })))
    return { title: 'Nothing starts in the next 7 days', text: running.length ? 'What is under way now:' : 'No milestone is under way either.',
      rows: running.slice(0, 8).map(({ x, m }) => row(c, m.id, one ? m.title : `${m.title} · ${x.p.name}`, `Under way · until ${dayLabel(m.end)}`, `/projects/${x.p.id}/schedule?open=${encodeURIComponent(m.id)}`)) }
  }
  return { title: `${plural(soon.length, 'milestone')} start${soon.length === 1 ? 's' : ''} in the next 7 days`, text: 'The people, the materials and the site ready before each one.',
    rows: soon.slice(0, 12).map(({ x, m }) => row(c, m.id, one ? m.title : `${m.title} · ${x.p.name}`, `Starts ${dayLabel(m.start)} · ${rangeLabel(m.start, m.end)}`, `/projects/${x.p.id}/schedule?open=${encodeURIComponent(m.id)}`)) }
}

/** (SC-060 — 1.0's "Help me with the {milestone} milestone… what should I be paying attention to?") One milestone: when, what it waits on, its
    payment (for whoever sees the project's money), its tasks. */
async function milestoneAnswer(c: Ctx, milestoneId: string): Promise<MaisonAnswer> {
  const [mr] = await db.select({ projectId: projectMilestones.projectId }).from(projectMilestones).where(and(eq(projectMilestones.id, milestoneId), isNull(projectMilestones.deletedAt))).limit(1)
  const [x] = mr ? await seenProjects(c, { only: mr.projectId }) : []
  if (!x) return { title: 'That milestone isn’t there any more', text: 'It may have been deleted from the schedule.' }
  const list = (await milestonesOf([x.p.id])).get(x.p.id) ?? []
  const m = list.find((y) => y.id === milestoneId)
  if (!m) return { title: 'That milestone isn’t there any more', text: 'It may have been deleted from the schedule.' }
  const base = `/projects/${x.p.id}`
  const client = x.client.split(' ')[0] ?? x.client
  const when = m.status === 'done' ? `Done${m.doneAt ? ` on ${dayLabel(m.doneAt)}` : ''}`
    : isLate(m, c.today) ? `${STATUS_LABEL[m.status]} · ended ${dayLabel(m.end)}, ${plural(lateBy(m, c.today), 'day')} late`
    : m.start > c.today ? `Starts ${dayLabel(m.start)}, in ${plural(m.start - c.today, 'day')}` : `${STATUS_LABEL[m.status]} · until ${dayLabel(m.end)}`
  const rows: MaisonRow[] = []
  /* what it waits on: the milestones before it that aren't done, the wait set on it, the client's choices tied to it */
  for (const pr of predsOf(m)) {
    const before = list.find((y) => y.id === pr.id)
    if (before && before.status !== 'done') rows.push(row(c, `after:${before.id}`, `Waits on ${before.title}`, `${STATUS_LABEL[before.status]} · until ${dayLabel(before.end)}`, `${base}/schedule?open=${encodeURIComponent(before.id)}`))
  }
  if (m.waiting) rows.push(row(c, 'waiting', `Waiting on ${m.waiting.on === 'client' ? client : m.waiting.name ?? (m.waiting.on === 'supplier' ? 'a supplier' : 'a member')}`, [m.waiting.note, m.waiting.until ? `until ${dayLabel(m.waiting.until)}` : null].filter(Boolean).join(' · ') || undefined, `${base}/schedule?open=${encodeURIComponent(m.id)}`))
  const choices = await db.select({ id: projectSelections.id, title: projectSelections.title, status: projectSelections.status }).from(projectSelections)
    .where(and(eq(projectSelections.projectId, x.p.id), eq(projectSelections.milestoneId, m.id), isNull(projectSelections.deletedAt)))
  for (const s of choices.filter((y) => y.status !== 'chosen')) rows.push(row(c, `choice:${s.id}`, `${client}’s choice: ${s.title}`, s.status === 'draft' ? 'Not shared yet' : s.status === 'declined' ? `${client} said no — add other options` : 'Waiting for their pick', `${base}/choices?open=${encodeURIComponent(s.id)}`))
  /* its payment */
  if (seesMoney(c.viewer, x.team)) {
    const money = moneyOf(await moneyInputOf(x.p), c.now)
    const st = money.stages.find((s) => s.milestone?.id === m.id)
    if (st) {
      const inv = st.invoice
      rows.push(row(c, `stage:${st.ref}`, `The ${st.name} payment · ${money2(st.nominalMinor)}`, inv ? `${inv.number ?? 'Invoice'} · ${inv.state === 'paid' ? 'paid' : inv.state === 'overdue' ? `overdue · ${money2(inv.balanceMinor)} owed` : inv.state === 'sent' || inv.state === 'part_paid' ? `sent · ${money2(inv.balanceMinor)} owed` : inv.state === 'draft' || inv.state === 'ready' ? `due when it is ${st.milestone?.due === 'start' ? 'begun' : 'done'} — not sent yet` : inv.state.replace(/_/g, ' ')}` : `Due when it is ${st.milestone?.due === 'start' ? 'begun' : 'done'}`,
        `${base}/money${inv ? `?open=${encodeURIComponent(inv.id)}` : ''}`))
    }
  }
  /* its tasks */
  const tasks = await db.select({ id: leadTasks.id, title: leadTasks.title, done: leadTasks.done, dueAt: leadTasks.dueAt }).from(leadTasks).where(and(eq(leadTasks.leadId, x.p.leadId), eq(leadTasks.milestoneId, m.id)))
  const open = tasks.filter((t) => !t.done).sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
  for (const t of open.slice(0, 5)) rows.push(row(c, `task:${t.id}`, `Task: ${t.title}`, t.dueAt ? `${dayOf(t.dueAt) < c.today ? 'Overdue · was due' : 'Due'} ${dayLabel(dayOf(t.dueAt))}` : 'No due date', `${base}/tasks?open=${encodeURIComponent(t.id)}`))
  const taskLine = tasks.length ? ` ${tasks.length - open.length} of ${plural(tasks.length, 'task')} done.` : ' No tasks inside it yet.'
  return { title: m.title, text: `${when}.${taskLine}${rows.length ? '' : ' Nothing waits on it.'}`, rows,
    link: { label: 'Open it on the Schedule', href: go(c, `${base}/schedule?open=${encodeURIComponent(m.id)}`) } }
}

/** A milestone on the page's project named in the question ("tell me about carpentry") — the longest title word that appears. */
async function milestoneNamed(c: Ctx, question: string): Promise<string | null> {
  if (!c.projectId) return null
  const list: Milestone[] = (await milestonesOf([c.projectId])).get(c.projectId) ?? []
  const q = question.toLowerCase()
  const hit = list.map((m) => ({ m, w: m.title.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 5 && !['check', 'works', 'stage'].includes(w)) }))
    .find(({ w }) => w.some((x) => q.includes(x)))
  return hit?.m.id ?? null
}

/* ── compliance (TD-107) ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

async function rulesAnswer(c: Ctx, p: AskParams): Promise<MaisonAnswer> {
  let kind: ComplianceKind | null = p.kind ?? null
  if (!kind && c.projectId) { const [x] = await seenProjects(c, { only: c.projectId }); kind = complianceKindOf(x?.propertyType) }
  if (!kind) return { title: 'Which kind of home?', text: 'The rules differ for an HDB flat, a condo and a landed home.', chips: ['The rules for an HDB flat', 'The rules for a condo', 'The rules for a landed home'] }
  const all = itemsFor(kind).filter((i) => (!p.phase || i.phase === p.phase) && (!p.topic || i.category === p.topic))
  const items = [...all].sort((a, b) => (a.level === b.level ? 0 : a.level === 'mandatory' ? -1 : 1))
  const home = kind === 'hdb' ? 'an HDB flat' : kind === 'condo' ? 'a condo' : 'a landed home'
  const where = [p.topic ? categoryLabel(p.topic).toLowerCase() : null, p.phase ? `the ${phaseLabel(p.phase)} phase` : null].filter(Boolean).join(' in ')
  if (!items.length) return { title: `No rule on ${where || 'that'} for ${home}`, text: 'The checklist has nothing under those words — every rule is on the Navigator.', link: { label: `Open the rules for ${home}`, href: go(c, `/compliance?tab=rules&kind=${kind}`) } }
  return { title: `${plural(items.length, 'rule')} for ${home}${where ? ` · ${where}` : ''}`, text: `${items.filter((i) => i.level === 'mandatory').length} mandatory — each with its steps and the official source on the Navigator.`,
    rows: items.slice(0, 8).map((i) => row(c, i.id, i.title, `${i.authority} · ${phaseLabel(i.phase)}${i.level === 'mandatory' ? ' · mandatory' : ''}`, c.projectId && (!p.kind || p.kind === kind) && (p.here || !p.kind) ? `/projects/${c.projectId}/compliance?item=${encodeURIComponent(i.id)}` : `/compliance?tab=rules&kind=${kind}`)),
    link: { label: `Open the rules for ${home}`, href: go(c, `/compliance?tab=rules&kind=${kind}`) } }
}

async function projectComplianceAnswer(c: Ctx): Promise<MaisonAnswer> {
  if (!c.projectId) {
    const list = await seenProjects(c, { running: true })
    const counts = await complianceCountsOf(list.map((x) => ({ id: x.p.id, stage: x.p.stage, propertyType: x.propertyType })))
    const open = list.filter((x) => (counts.get(x.p.id) ?? 0) > 0)
    return open.length ? { title: `${plural(open.length, 'project')} with compliance to do`, text: 'Mandatory items still open in the phase each project is in.', rows: open.map((x) => row(c, x.p.id, x.p.name, `${x.p.number} · ${plural(counts.get(x.p.id) ?? 0, 'item')} to do`, `/projects/${x.p.id}/compliance`)) }
      : { title: 'Nothing mandatory is open', text: 'Every running project’s mandatory items for its phase are answered.' }
  }
  const [x] = await seenProjects(c, { only: c.projectId })
  if (!x) return { title: 'Nothing to show', text: 'This project is not there any more.' }
  const kind = complianceKindOf(x.propertyType)
  if (!kind) return { title: 'No checklist for this home', text: `The checklist covers HDB flats, condos and landed homes — ${x.propertyType || 'this property'} has none.` }
  const answers = (await answersOf([x.p.id])).get(x.p.id) ?? {}
  const phase = phaseOfStage(x.p.stage)
  const order = [phase, ...COMPLIANCE_PHASES.map((q) => q.key).filter((k) => k !== phase)]
  const open = itemsFor(kind).filter((i) => i.level === 'mandatory' && !answers[i.id]).sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase))
  const now = open.filter((i) => i.phase === phase).length
  if (!open.length) return { title: 'Nothing mandatory to do', text: `Every mandatory item for ${KIND_LABEL[kind].toLowerCase() === 'hdb flat' ? 'an HDB flat' : `a ${KIND_LABEL[kind].toLowerCase()}`} is answered.` }
  return { title: `${plural(open.length, 'mandatory item')} still to do`, text: `${now} in the ${phaseLabel(phase)} phase, the one the project is in — open one for what to do and the official source.`,
    rows: open.slice(0, 10).map((i) => row(c, i.id, i.title, `${phaseLabel(i.phase)} · ${i.authority}`, `/projects/${x.p.id}/compliance?item=${encodeURIComponent(i.id)}`)),
    link: { label: 'Open Compliance', href: go(c, `/projects/${x.p.id}/compliance`) } }
}

async function studioComplianceAnswer(c: Ctx): Promise<MaisonAnswer> {
  const states = await fetchRegistrations()
  const open = STUDIO_ACTIONS.filter((a) => !states[a.id]?.done)
  const done = STUDIO_ACTIONS.length - open.length
  return { title: open.length ? `${plural(open.length, 'registration')} still to do` : 'Every registration is done', text: `${done} of ${STUDIO_ACTIONS.length} done, as recorded on Company › Profile.`,
    rows: (open.length ? open : STUDIO_ACTIONS).map((a) => row(c, a.id, a.title, states[a.id]?.done ? `Done · ${new Date(states[a.id]!.at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}` : `To do · ${a.organisation}`, `/compliance#${a.id}`)),
    link: { label: 'Open the Compliance Navigator', href: go(c, '/compliance') } }
}

/* ── the books (FB-118) — reportAnswer lives in ./answers/common.ts ── */

async function owedAnswer(c: Ctx, p: AskParams): Promise<MaisonAnswer> {
  if (c.books && !(p.here && c.projectId)) return reportAnswer(c, 'ar', 'all', { title: 'Who owes the studio', table: 'invoices', label: ['client', 'invoice'], meta: ['amount', 'late'], rows: 8 })
  /* a member — or a question about this project — reads the projects whose money they see */
  const list = (await seenProjects(c, { only: p.here || c.projectId ? c.projectId : null })).filter((x) => seesMoney(c.viewer, x.team))
  if (!list.length) return { title: 'No money you can see', text: 'A project’s Money is for its members, their Managers, Owners and Admins.' }
  const owed = (await Promise.all(list.map(async (x) => ({ x, m: moneyOf(await moneyInputOf(x.p), c.now) }))))
    .flatMap(({ x, m }) => m.invoices.filter((i) => i.balanceMinor > 0 && (i.state === 'sent' || i.state === 'overdue' || i.state === 'part_paid')).map((i) => ({ x, i })))
    .sort((a, b) => (b.i.state === 'overdue' ? 1 : 0) - (a.i.state === 'overdue' ? 1 : 0) || b.i.balanceMinor - a.i.balanceMinor)
  if (!owed.length) return { title: 'Nothing is owed', text: list.length === 1 ? 'Every sent invoice on this project is paid.' : 'Every sent invoice on the projects you see is paid.' }
  const total = owed.reduce((s, y) => s + y.i.balanceMinor, 0)
  return { title: `${money2(total)} owed`, text: `${plural(owed.length, 'invoice')} not paid in full${owed.some((y) => y.i.state === 'overdue') ? ' — the overdue first' : ''}.`,
    rows: owed.slice(0, 10).map(({ x, i }) => row(c, i.id, `${x.client} · ${i.number ?? i.stageName}`, `${money2(i.balanceMinor)} owed${i.state === 'overdue' ? ' · overdue' : ''}`, `/projects/${x.p.id}/money?open=${encodeURIComponent(i.id)}`)) }
}

/* ── start a project (PR-059) ─────────────────────────────────────────────────────────────────────────────────────────────────── */

async function startAnswer(c: Ctx, p: AskParams): Promise<MaisonAnswer> {
  const visible = await visibleLeadIds(c.viewer)
  /* a Won lead with no project (won before projects existed) opens its own project; a lead whose quote is confirmed or signed is one move from it */
  const won = (await db.select({ id: leads.id, name: leads.name }).from(leads).where(and(eq(leads.stage, 'Won'), eq(leads.direct, false), isNull(leads.deletedAt))))
    .filter((l) => !visible || visible.has(l.id))
  const withProject = new Set(won.length ? (await db.select({ leadId: projects.leadId }).from(projects).where(inArray(projects.leadId, won.map((l) => l.id)))).map((r) => r.leadId) : [])
  const ready = (await db.select({ leadId: quotes.leadId, name: leads.name, number: quotes.number, status: quotes.status }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
    .where(and(inArray(quotes.status, ['Confirmed', 'Signed']), eq(quotes.kind, 'quote'), isNull(quotes.deletedAt), isNull(leads.deletedAt), eq(leads.stage, 'Quote Sent'))))
    .filter((q, i, all) => (!visible || visible.has(q.leadId)) && all.findIndex((y) => y.leadId === q.leadId) === i)
  const fill = new URLSearchParams({ new: '1' })
  if (p.client) fill.set('client', p.client)
  if (p.phone) fill.set('phone', p.phone)
  if (p.propertyType) fill.set('ptype', p.propertyType)
  const named = p.client ? ` for ${p.client}` : ''
  const rows: MaisonRow[] = [
    ...won.filter((l) => !withProject.has(l.id)).map((l) => row(c, `won:${l.id}`, `Start ${titleCaseName(l.name)}’s project`, 'Won — their lead page opens the project', `/leads/${l.id}`)),
    ...ready.map((q) => row(c, `ready:${q.leadId}`, `Move ${titleCaseName(q.name)} to Won`, `${q.number} is ${q.status.toLowerCase()} — Won starts their project`, moveStageHref(q.leadId, 'won'))),
    row(c, 'new', `Start a new project${named}`, [p.propertyType, p.phone ? `${p.phone.slice(0, 4)} ${p.phone.slice(4)}` : null].filter(Boolean).join(' · ') || 'A client who came to you directly — the form opens', `/projects?${fill.toString()}`),
  ]
  return { title: p.client ? `Start a project for ${p.client}` : 'Start a project', text: 'A lead you won becomes its project; a client who came to you directly starts with New project.', rows }
}

/* ── (pending modules S05 — card held:leads, "Maison AI creates or updates a lead and moves its stage · revisit: it already does this for
   projects (REG-1645)"; 1.0's mAIson create_lead · update_lead) Add, move or change a lead: the house form or the Move stage window opens filled
   from the question — the stage rules decide there, as the pill would — and nothing is written here. ── */

const STEP_WORD: Record<MoveStep, string> = { contacted: 'Contacted', met: 'Met', 'quote-sent': 'Quote Sent', won: 'Won', 'on-hold': 'On Hold', lost: 'Lost' }

/** The live pipeline leads this viewer sees whose name the question gives: the full name first, then every word of it, then a first name. */
async function leadsNamed(c: Ctx, question: string) {
  const visible = await visibleLeadIds(c.viewer)
  const rows = (await db.select({ id: leads.id, name: leads.name, stage: leads.stage, phone: leads.phone }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.direct, false))))
    .filter((l) => !visible || visible.has(l.id))
  const q = ` ${question.toLowerCase().replace(/[’']s\b/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `
  const score = (name: string) => {
    const words = name.toLowerCase().split(/\s+/).filter(Boolean)
    if (q.includes(` ${words.join(' ')} `)) return 3
    if (words.length > 1 && words.every((w) => q.includes(` ${w} `))) return 2
    return words[0] && words[0].length >= 3 && q.includes(` ${words[0]} `) ? 1 : 0
  }
  const scored = rows.map((l) => ({ l, s: score(l.name) })).filter((x) => x.s > 0)
  const top = Math.max(0, ...scored.map((x) => x.s))
  return scored.filter((x) => x.s === top).map((x) => ({ ...x.l, name: titleCaseName(x.l.name) })).slice(0, 6)
}
const phoneWords = (p: string) => (p.length === 8 ? `${p.slice(0, 4)} ${p.slice(4)}` : p)

async function addLeadAnswer(c: Ctx, p: AskParams): Promise<MaisonAnswer> {
  if (isAccounting(c.viewer.role)) return { title: 'Not for Accounting', text: ON_LEADS }
  const fill = new URLSearchParams({ new: '1' })
  if (p.client) fill.set('client', p.client)
  if (p.phone) fill.set('phone', p.phone)
  if (p.propertyType) fill.set('ptype', p.propertyType)
  if (p.budget) fill.set('budget', String(p.budget))
  if (p.source) fill.set('source', p.source)
  if (p.email) fill.set('email', p.email)
  /* a number already on a lead: that lead first — the form's own duplicate check would stop at it anyway (REG-609) */
  const visible = await visibleLeadIds(c.viewer)
  const same = p.phone ? (await db.select({ id: leads.id, name: leads.name, stage: leads.stage }).from(leads).where(and(eq(leads.phone, p.phone), isNull(leads.deletedAt), eq(leads.direct, false)))).filter((l) => !visible || visible.has(l.id)) : []
  const filled = [p.propertyType, p.phone ? phoneWords(p.phone) : null, p.budget ? `S$${p.budget.toLocaleString('en-SG')}` : null, p.source, p.email].filter(Boolean).join(' · ')
  const rows: MaisonRow[] = [
    ...same.map((l) => row(c, `same:${l.id}`, `Open ${titleCaseName(l.name)}`, `This number is already a lead · ${l.stage}`, `/leads/${l.id}`)),
    row(c, 'new-lead', p.client ? `Add ${p.client} as a lead` : 'Add a new lead', filled || 'Create New Lead opens empty', `/leads?${fill.toString()}`),
  ]
  return { title: p.client ? `Add a lead for ${p.client}` : 'Add a lead', text: 'Create New Lead opens filled in from what you wrote — check it, then press Create.', rows }
}

async function moveLeadAnswer(c: Ctx, question: string, p: AskParams): Promise<MaisonAnswer> {
  if (isAccounting(c.viewer.role)) return { title: 'Not for Accounting', text: ON_LEADS }
  const step = p.step ?? stepOf(question)
  if (!step) return { title: 'Which stage?', text: 'Name the stage — like “Move Olivia Martinez to Met” or “Put Arjun Mehta on hold”.' }
  const named = await leadsNamed(c, question)
  if (!named.length) return { title: 'Which lead?', text: `Name the lead as it is written — like “Move Olivia Martinez to ${STEP_WORD[step]}”.` }
  const into = STEP_WORD[step]
  /* (S42 B-11) the stage rules asked here, before the press, as the stage pill asks them (lib/leads/stage-policy.ts): a move the rules refuse is a
     row that says why — the lead opens where it is fixed — never a press that lands on a refusal; a stage the lead has passed opens nothing */
  const ids = named.map((l) => l.id)
  const [mode, links, logs, projs] = await Promise.all([
    fetchStageMovement(),
    db.select({ leadId: leadAssignees.leadId }).from(leadAssignees).where(inArray(leadAssignees.leadId, ids)),
    db.select({ leadId: stageLogs.leadId, fromStage: stageLogs.fromStage, toStage: stageLogs.toStage }).from(stageLogs).where(inArray(stageLogs.leadId, ids)).orderBy(asc(stageLogs.createdAt)),
    db.select({ leadId: projects.leadId, number: projects.number }).from(projects).where(and(inArray(projects.leadId, ids), isNull(projects.deletedAt))),
  ])
  const policyLead = (l: (typeof named)[number]) => {
    const parked = !isActiveStage(l.stage) ? logs.filter((g) => g.leadId === l.id && g.toStage === l.stage).at(-1)?.fromStage ?? null : null
    return { stage: l.stage, resumeStage: parked && isActiveStage(parked) ? parked : null, assignees: links.filter((a) => a.leadId === l.id), project: projs.find((p) => p.leadId === l.id) ?? null } as unknown as Parameters<typeof stageIntent>[0]   // the policy reads only the stage, how many members and the project's number
  }
  const verdicts = named.map((l) => { if (l.stage === into) return 'there'; const pl = policyLead(l); return stageIntent(pl, into as Stage, mode, c.viewer.role).kind === 'blocked' ? 'held' : isCompletedFor(pl, into as Stage) ? 'past' : 'moves' })
  return {
    title: named.length === 1 ? `Move ${named[0]!.name} to ${into}` : `${named.length} leads with that name`,
    /* (S42 B-11) the sentence never promises a window that won't open: when no lead may move, it says the rows say why */
    text: !verdicts.includes('moves') ? 'The stage rules hold this move for now — the row says why, and opens the lead where it is fixed.'
      : step === 'on-hold' || step === 'lost' ? `The ${into} dialog opens on the lead and asks for its reason.` : 'The Move stage window opens on that step — the stage rules decide, as the stage pill would.',
    rows: named.map((l) => {
      if (l.stage === into) return row(c, `lead:${l.id}`, `${l.name} is already ${into}`, phoneWords(l.phone), `/leads/${l.id}`)
      const pl = policyLead(l)
      const intent = stageIntent(pl, into as Stage, mode, c.viewer.role)
      if (intent.kind === 'blocked') return row(c, `held:${l.id}`, `${l.name} can’t move to ${into} yet`, intent.message, `/leads/${l.id}`)
      if (isCompletedFor(pl, into as Stage)) return row(c, `past:${l.id}`, `${l.name} is past ${into}`, `Now ${l.stage} — nothing moves backwards`, `/leads/${l.id}`)
      return row(c, `move:${l.id}`, `Move ${l.name} to ${into}`, `Now ${l.stage} · ${phoneWords(l.phone)}`, moveStageHref(l.id, step))
    }),
  }
}

async function editLeadAnswer(c: Ctx, question: string, p: AskParams): Promise<MaisonAnswer> {
  if (isAccounting(c.viewer.role)) return { title: 'Not for Accounting', text: ON_LEADS }
  const field = p.field ?? fieldOf(question)
  const named = await leadsNamed(c, question)
  const what = field ? LEAD_FIELD_WORDS[field] : 'details'
  if (!named.length) return { title: 'Which lead?', text: `Name the lead as it is written — like “Change Olivia Martinez’s ${what}”.` }
  return {
    title: named.length === 1 ? `Change ${named[0]!.name}’s ${what}` : `${named.length} leads with that name`,
    text: 'Edit Lead opens on that field — change it there, then press Save.',
    rows: named.map((l) => row(c, `edit:${l.id}`, `Edit ${l.name}’s ${what}`, `${l.stage} · ${phoneWords(l.phone)}`, `/leads/${l.id}?edit=${field ?? '1'}`)),
  }
}

/* ── the answer ───────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const MONEY: IntentId[] = ['owed', 'gst', 'margin', 'vendors', 'commission', 'pnl', 'cashflow', 'expenses', 'repeats', 'stop_repeat', 'statement']
/** (pending modules S10) The intents about the leads' and the projects' work — Accounting is on none of them (lib/settings/roles.ts `onLeads`). */
/** (S44O — call C6) What a Marketing member asks of Maison AI — the leads' own: who needs attention, a client, a lead added, moved or changed, their
    tasks, a message to draft, the team, what they missed, the rules for a home; anything else is answered with the role's line. */
const DESK_ASKS: IntentId[] = ['leads_attention', 'lead_about', 'add_lead', 'move_lead', 'edit_lead', 'my_tasks', 'task_done', 'remind', 'draft_message', 'team', 'member_role', 'missed', 'compliance_rules', 'writing', 'help']
const LEAD_WORK: IntentId[] = ['late', 'next', 'milestone', 'compliance_project', 'leads_attention', 'lead_about', 'quotes', 'draft_message', 'site_update', 'renders_picked', 'designs_waiting', 'renders_by_lead', 'layouts_opened', 'portal_opened', 'issues', 'attach', 'start_project']

/**
 * (pending modules S10) **The seam where a model plugs in.** Today a question is read by rule — the intent table in ./intents.ts picks what is
 * asked (an intent) and what it names (its params) — and every answer below is built from the records by rule. A language model (the
 * developers' — 1.0 used Gemini through OpenRouter with 66 tools) would replace THIS function only: the same question and page in, the same
 * `Match` out (an intent is a tool, its params the tool's arguments), so Who sees leads, the books' rule and the confirm before any change stay
 * where they are. Nothing is metered: 1.0 never charged for a chat question.
 */
async function readQuestion(question: string, ctx: { projectId: string | null; milestoneId: string | null }) {
  return matchQuestion(question, ctx)
}

export async function answerQuestion(input: AskInput): Promise<MaisonAnswer & { asked: string }> {
  const question = cleanQuestion(input?.question)
  const viewer = await fetchViewer()
  const now = Date.now()
  const pathOnly = typeof input?.path === 'string' && input.path.startsWith('/') && !input.path.startsWith('//') ? input.path.slice(0, 300) : null
  const fromPath = pathOnly ? /^\/projects\/([^/?#]+)/.exec(pathOnly)?.[1] ?? null : null
  let projectId = typeof input?.projectId === 'string' ? input.projectId : fromPath && !['insights', 'tickets'].includes(fromPath) ? fromPath : null
  if (projectId) { const [p] = await db.select({ leadId: projects.leadId }).from(projects).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).limit(1); if (!p || !(await canOpenLead(viewer, p.leadId))) projectId = null }
  const acct = isAccounting(viewer.role)
  const desk = isMarketing(viewer.role)   // (S44O — call C6) the leads' own questions only
  const c: Ctx = { viewer, runs: runsStudio(viewer.role), books: seesBooks(viewer.role), costs: seesCost(viewer), profit: seesProfit(viewer), acct, desk, from: pathOnly, projectId: acct || desk ? null : projectId, milestoneId: !acct && !desk && typeof input?.milestoneId === 'string' ? input.milestoneId : null, today: dayOf(new Date(now)), now }
  const chips = askChips({ money: c.books, project: !!c.projectId, milestone: !!c.milestoneId, leads: !acct, runs: c.runs, profit: c.profit, desk })
  if (!question) return { asked: '', title: 'Ask about your records', text: 'Leads, tasks, quotes, schedules, compliance and money — answered from what the studio has recorded.', chips }
  let a: MaisonAnswer
  let unanswered = false   // (S10) a question it couldn't read stays out of Recent — asking it again would only say so again
  try {
    let m = await readQuestion(question, { projectId: c.projectId, milestoneId: c.milestoneId })
    /* a milestone the question names, on this project — unless the words ask for money, compliance or a new project */
    if (!c.milestoneId && (!m || m.id === 'late' || m.id === 'next' || m.id === 'lead_about')) { const named = await milestoneNamed(c, question); if (named) { c.milestoneId = named; m = { id: 'milestone', params: {}, score: 9 } } }
    if (m && acct && LEAD_WORK.includes(m.id)) a = { title: 'Not for Accounting', text: ON_LEADS, chips }
    else if (m && desk && !DESK_ASKS.includes(m.id)) a = { title: 'Not for Marketing', text: ON_DESK, chips }   // (S44O — C6)
    else if (m && MONEY.includes(m.id) && !c.books && m.id !== 'owed') a = { title: 'Owners, Admins and Accounting only', text: NOT_YOURS, chips: chips.filter((x) => !/owes|owe\?|GST|margin|Vendor|Commission|Cash flow|Profit and loss|repeat/i.test(x)) }
    /* (pending modules S41b-1 — 1.0: "margin-only tools refused") the books' profit and margin, for a role the Owner switched off */
    else if (m && (m.id === 'margin' || m.id === 'pnl') && !c.profit) a = { title: 'Profit and margin are hidden for your role', text: PROFIT_HIDDEN, chips }
    else if (!m || m.id === 'lead_about') {
      /* (pending modules S10) a name and nothing else — the client, or the member, it names; else honest about what it can't answer.
         (S42 D-01) a member's whole name outweighs a client who shares only its first name ("Priya Tan" is the member, not Priya Nair); a
         client and a member who both carry the whole name are offered side by side. (S42 D-04) Accounting naming a client is told why, or
         given the client's statement when they have a project (a books answer) — never "I can't answer that yet". */
      const team = await membersNamed(question)
      const people = await peopleNamed(c, question, { anyRole: acct })
      const memberScore = team.some((t) => fullyNamed(question, t.name)) ? 3 : team.length ? 1 : 0
      const clientScore = people[0]?.score ?? 0
      const cant: MaisonAnswer = { title: 'I can’t answer that yet', text: 'Maison AI answers from the studio’s own records, by rule — try one of these, or ask in other words.', chips }
      /* the better match answers; a tie on a first name goes to the client (Accounting: to the team — they are on no lead) */
      const toTeam = memberScore > clientScore || (memberScore > 0 && memberScore === clientScore && (acct || memberScore === 3))
      if (memberScore === 3 && clientScore === 3 && !acct) {
        const whole = people.filter((n) => n.score === 3), them = team.filter((t) => fullyNamed(question, t.name))
        a = { title: `${plural(whole.length + them.length, 'person', 'people')} with that name`, text: 'A client and someone on the team — open the one you mean.',
          rows: [...whole.map((n) => row(c, `client:${n.id}`, n.name, `Client · ${n.project ? n.project.number : n.stage}`, n.project ? `/projects/${n.project.id}` : `/leads/${n.id}`)),
            ...them.map((t) => row(c, `member:${t.id}`, t.name, `${t.role} · on the team`, `/company/members?open=${encodeURIComponent(t.id)}`))] }
      } else if (toTeam) a = await teamAnswer(c, question)
      else if (people.length && acct) a = people.some((n) => n.project) ? await statementAnswer(c, question) : { title: 'Not for Accounting', text: ON_LEADS, chips }
      else if (people.length) a = (await aboutAnswer(c, question, people)) ?? cant
      else { unanswered = true; a = cant }
    } else a = m.id === 'late' ? await lateAnswer(c, m.params)
      : m.id === 'next' ? await nextAnswer(c, m.params)
      : m.id === 'milestone' ? (c.milestoneId ? await milestoneAnswer(c, c.milestoneId) : await nextAnswer(c, m.params))
      : m.id === 'compliance_rules' ? await rulesAnswer(c, m.params)
      : m.id === 'compliance_project' ? await projectComplianceAnswer(c)
      : m.id === 'compliance_studio' ? await studioComplianceAnswer(c)
      : m.id === 'owed' ? (m.params.ageing && c.books ? await ageingAnswer(c) : await owedAnswer(c, m.params))
      : m.id === 'gst' ? await reportAnswer(c, 'gst', m.params.quarter === 'last' ? 'last_quarter' : 'this_quarter')
      : m.id === 'margin' ? await reportAnswer(c, 'profitability', 'all', { title: 'Margins by project, the thinnest first', table: 'projects', label: ['project'], meta: ['margin', 'profit'], rows: 6, thin: true })
      : m.id === 'vendors' ? (/\b(owe|payable)/i.test(question) ? await reportAnswer(c, 'ap', 'all', { title: 'What the studio owes', table: 'balances', label: ['who', 'record'], meta: ['amount', 'late'], rows: 8 }) : await reportAnswer(c, 'vendors', 'this_year', { table: 'vendors', rows: 6 }))
      : m.id === 'commission' ? await reportAnswer(c, 'commissions', 'this_year', { table: 'members', rows: 6 })
      : m.id === 'pnl' ? await pnlAnswer(c, question)
      : m.id === 'cashflow' ? await cashflowAnswer(c)
      : m.id === 'expenses' ? await expensesAnswer(c, question)
      : m.id === 'repeats' ? await repeatsAnswer(c)
      : m.id === 'stop_repeat' ? await stopRepeatAnswer(c, question)
      : m.id === 'statement' ? await statementAnswer(c, question)
      : m.id === 'credit_notes' ? await creditNotesAnswer(c, question)
      : m.id === 'credits' ? await creditsAnswer(c, question)
      : m.id === 'plan' ? await planAnswer(c, question)
      : m.id === 'record_payment' ? await recordPaymentAnswer(c, question, m.params)
      : m.id === 'money_new' ? await moneyNewAnswer(c, question, m.params)
      : m.id === 'add_lead' ? await addLeadAnswer(c, { ...leadParams(question), ...m.params })   // (pending modules S05)
      : m.id === 'move_lead' ? await moveLeadAnswer(c, question, m.params)
      : m.id === 'edit_lead' ? await editLeadAnswer(c, question, m.params)
      : m.id === 'next_meeting' ? await nextMeetingAnswer(c)   // (pending modules S23)
      : m.id === 'meetings' ? await meetingsAnswer(c, question)
      : m.id === 'my_tasks' ? await myTasksAnswer(c, question)
      : m.id === 'task_done' ? await taskDoneAnswer(c, question)
      : m.id === 'remind' ? await remindAnswer(c, question, m.params)
      : m.id === 'draft_message' ? await draftAnswer(c, question)
      : m.id === 'leads_attention' ? await leadsAttentionAnswer(c, question)
      : m.id === 'quotes' ? await quotesAnswer(c, m.params, question)
      : m.id === 'approvals' ? await approvalsAnswer(c)
      : m.id === 'site_update' ? await siteUpdateAnswer(c, question)
      : m.id === 'team' ? await teamAnswer(c, question)
      : m.id === 'member_role' ? await memberRoleAnswer(c, question, m.params)
      : m.id === 'overview' ? await overviewAnswer(c)
      : m.id === 'missed' ? await missedAnswer(c)
      : m.id === 'setup' ? await setupAnswer(c)
      : m.id === 'qanvast_listing' ? await listingAnswer(c)   // (pending modules S37)
      : m.id === 'qanvast_credits' ? await qanvastCreditsAnswer(c)   // (pending modules S41b-5)
      : m.id === 'qanvast_reviews' ? await qanvastReviewsAnswer(c)
      : m.id === 'attach' ? attachAnswer(c)
      : m.id === 'writing' ? writingAnswer(c)   // (pending modules S29)
      : m.id === 'help' ? await helpAnswer(c, chips)
      : m.id === 'renders_picked' ? await rendersPickedAnswer(c)
      : m.id === 'designs_waiting' ? await designsWaitingAnswer(c)
      : m.id === 'renders_by_lead' ? await rendersByLeadAnswer(c)
      : m.id === 'layouts_opened' ? await layoutsOpenedAnswer(c)
      : m.id === 'portal_signin' ? await portalSignInAnswer(c)
      : m.id === 'portal_sees' ? await portalSeesAnswer(c)
      : m.id === 'portal_opened' ? await portalOpenedAnswer(c)
      : m.id === 'issues' ? await issuesAnswer(c)
      : m.id === 'studios_portal' ? await studiosPortalAnswer(c)
      : await startAnswer(c, { ...m.params, ...startParams(question) })
  } catch {
    return { asked: question, title: 'Couldn’t look that up', text: 'Please try again in a moment.', chips }
  }
  /* (pending modules S10) the member's question joins their Recent — never a page's own words, and a failed write never costs the answer */
  if (input?.record !== false && !unanswered) await recordAsked(viewer.id, { question, title: a.title, path: pathOnly, projectId: c.projectId, milestoneId: c.milestoneId }, now).catch(() => {})
  return { asked: question, ...a }
}
