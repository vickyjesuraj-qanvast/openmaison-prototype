import 'server-only'
import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leadTasks, leads, members, projects, quotes, renderConsultationRequests, renderShareLinks, spaceLayoutShares, spaceLayouts, taskAssignees, visualizerDesigns } from '@/lib/db/schema'
import { withYou } from '@/lib/db/session'
import { visibleLeadIds } from '@/lib/leads/visibility'
import { displayDayMonth, displayDue, isDueToday, isOverdue, startOfDay, titleCaseName } from '@/lib/format'
import { isOverdueLead } from '@/lib/leads/filters'
import { STAGE_LABEL, isProjectStage } from '@/lib/projects/model'
import type { MaisonAnswer, MaisonRow } from '@/lib/maison-ai'
import { stageDraft } from '../drafts'
import { defaultDue, readWhen, reminderTitle } from '../when'
import type { AskParams } from '../intents'
import { ON_LEADS, askRow, go, phoneWords, plural, row, type Ctx } from './common'

/*
 * (pending modules S10 — cards studio:maison-assistant · api:maison-bot-assistant · held:maison-ai) The Ask box's answers about the studio's
 * work, by rule from the records — 1.0's mAIson `get_tasks_summary` · `list_leads` · `get_lead_details` · `get_quote_analysis` ·
 * `get_team_members` · `get_studio_overview` · `create_task` · `update_task` · `draft_client_message`, without a model. Every read follows
 * Who sees leads (`visibleLeadIds`); Accounting is on no lead (lib/settings/roles.ts). A change is never made here: `remind` · `task_done` ·
 * `draft_message` return a `plan` the sheet shows with one confirm, and the house action does it (components/shell/maison-plans.ts).
 * Every row opens where the thing is, with the way back. *(invented copy: every title and line here)*
 */

const DAY = 86_400_000
const norm = (q: string) => ` ${q.toLowerCase().replace(/[’']s\b/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `

/* ── who the question names ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type Named = { id: string; name: string; stage: string; phone: string; propertyType: string; direct: boolean; createdAt: Date
  project: { id: string; number: string; name: string; stage: string } | null
  /** (S42 D-01) how the question names them: 3 the full name, 2 every word of it, 1 the first name only */ score: 1 | 2 | 3 }

/** The live leads — and the projects' clients — this viewer sees whose name the question gives: the full name first, then every word of it,
    then a first name of three letters or more. Accounting sees none (S42 D-04: `anyRole` asks only whether the words name a client, so the
    box can say why it won't answer). */
export async function peopleNamed(c: Ctx, question: string, o: { anyRole?: boolean } = {}): Promise<Named[]> {
  if (c.acct && !o.anyRole) return []
  const visible = await visibleLeadIds(c.viewer)
  const rows = (await db.select({ id: leads.id, name: leads.name, stage: leads.stage, phone: leads.phone, propertyType: leads.propertyType, direct: leads.direct, createdAt: leads.createdAt }).from(leads).where(isNull(leads.deletedAt)))
    .filter((l) => !visible || visible.has(l.id))
  const q = norm(question)
  const score = (name: string) => {
    const w = name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
    if (!w.length) return 0
    if (q.includes(` ${w.join(' ')} `)) return 3
    if (w.length > 1 && w.every((x) => q.includes(` ${x} `))) return 2
    return w[0]!.length >= 3 && q.includes(` ${w[0]} `) ? 1 : 0
  }
  const scored = rows.map((l) => ({ l, s: score(l.name) })).filter((x) => x.s > 0)
  const top = Math.max(0, ...scored.map((x) => x.s))
  const hits = scored.filter((x) => x.s === top).map((x) => x.l).slice(0, 6)
  const ps = hits.length ? await db.select({ id: projects.id, leadId: projects.leadId, number: projects.number, name: projects.name, stage: projects.stage }).from(projects).where(and(inArray(projects.leadId, hits.map((h) => h.id)), isNull(projects.deletedAt))) : []
  return hits.map((l) => { const p = ps.find((x) => x.leadId === l.id); return { ...l, name: titleCaseName(l.name), project: p ? { id: p.id, number: p.number, name: p.name, stage: p.stage } : null, score: top as 1 | 2 | 3 } })
}
/** (S42 D-01) Whether the question gives this whole name, word for word ("Priya Tan" — not only "Priya"). */
export const fullyNamed = (question: string, name: string) => { const w = name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean); return w.length > 0 && norm(question).includes(` ${w.join(' ')} `) }
/** Active members the question names — a full name, or a first name. */
export async function membersNamed(question: string) {
  const team = await db.select({ id: members.id, name: members.name, role: members.role, capacity: members.projectCapacity }).from(members).where(eq(members.isActive, true)).then(withYou)   // (pending modules S43A) "you" = this browser's member
  const q = norm(question)
  const full = team.filter((m) => fullyNamed(question, m.name))
  if (full.length) return full
  return team.filter((m) => { const f = m.name.toLowerCase().split(/\s+/)[0] ?? ''; return f.length >= 3 && q.includes(` ${f} `) })
}
const leadHref = (n: Named) => (n.project ? `/projects/${n.project.id}` : `/leads/${n.id}`)
const whereWords = (n: Named) => (n.project ? `${n.project.number} · ${isProjectStage(n.project.stage) ? STAGE_LABEL[n.project.stage] : n.project.stage}` : n.stage)

/* ── my tasks (1.0's get_tasks_summary) ─────────────────────────────────────────────────────────────────────────────────────────── */

async function myOpenTasks(c: Ctx) {
  const rows = await db.select({ id: leadTasks.id, title: leadTasks.title, dueAt: leadTasks.dueAt, leadId: leadTasks.leadId, lead: leads.name, leadDeleted: leads.deletedAt })
    .from(leadTasks).innerJoin(taskAssignees, eq(taskAssignees.taskId, leadTasks.id)).leftJoin(leads, eq(leads.id, leadTasks.leadId))
    .where(and(eq(taskAssignees.memberId, c.viewer.id), eq(leadTasks.done, false)))
  const visible = c.acct ? new Set<string>() : await visibleLeadIds(c.viewer)
  return rows.filter((t) => !t.leadId || (!t.leadDeleted && (!visible || visible.has(t.leadId)))).map((t) => ({ ...t, lead: t.lead ? titleCaseName(t.lead) : null }))
}
const dueMeta = (d: Date | null, now: number) => { if (!d) return 'No due date'; if (isOverdue(d, now)) return `Overdue · was due ${displayDue(d)}`; const time = displayDue(d).split(' · ')[1]; return isDueToday(d, now) ? `Due today${time ? ` · ${time}` : ''}` : `Due ${displayDue(d)}` }

export async function myTasksAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  const all = await myOpenTasks(c)
  const s = question.toLowerCase()
  const end = startOfDay(new Date(c.now)) + DAY
  const week = startOfDay(new Date(c.now)) + 8 * DAY
  const only = /\b(overdue|late)\b/.test(s) ? 'overdue' : /\btoday\b/.test(s) ? 'today' : /\b(this week|week)\b/.test(s) ? 'week' : /\btomorrow\b/.test(s) ? 'tomorrow' : 'soon'
  const keep = (t: (typeof all)[number]) => {
    const d = t.dueAt?.getTime() ?? null
    if (only === 'overdue') return isOverdue(t.dueAt, c.now)
    if (only === 'today') return d !== null && d < end
    if (only === 'tomorrow') return d !== null && d >= end && d < end + DAY
    return d !== null && d < week
  }
  const list = all.filter(keep).sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
  const late = all.filter((t) => isOverdue(t.dueAt, c.now)).length
  const words = { overdue: 'overdue', today: 'to do today', tomorrow: 'for tomorrow', week: 'this week', soon: 'this week' }[only]
  const link = { label: 'Open My Tasks', href: go(c, only === 'overdue' || (late && only !== 'tomorrow') ? '/tasks?scope=mine&due=overdue' : '/tasks?scope=mine') }
  if (!list.length) return { title: `Nothing ${words}`, text: all.length ? `You have ${plural(all.length, 'open task')}${late && only !== 'overdue' ? ` — ${late} overdue` : ''}, none ${only === 'overdue' ? 'late' : only === 'today' ? 'due today' : `due ${words.replace('for ', '')}`}.` : 'You have no open tasks.', link }
  return { title: `${plural(list.length, 'task')} ${words}`, text: `${only === 'overdue' ? 'The oldest first' : 'The overdue first, then by their due day'} — open one to do it or move its day.${all.length > list.length ? ` ${all.length - list.length} more later.` : ''}`,
    rows: list.slice(0, 10).map((t) => row(c, t.id, t.lead ? `${t.title} · ${t.lead}` : t.title, dueMeta(t.dueAt, c.now), `/tasks?open=${encodeURIComponent(t.id)}`)), link }
}

/** (1.0's update_task) "Mark the call Olivia task done" — the asker's open task whose words the question holds, proposed; several → which one. */
export async function taskDoneAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  const all = await myOpenTasks(c)
  const STOP = new Set(['the', 'task', 'mark', 'tick', 'done', 'complete', 'completed', 'finished', 'set', 'check', 'as', 'my', 'to', 'for', 'with', 'a', 'an', 'i', 'have', 'ive', 'it'])
  const qw = norm(question).trim().split(' ').filter((w) => w.length >= 3 && !STOP.has(w))
  const scored = all.map((t) => { const tw = norm(`${t.title} ${t.lead ?? ''}`); return { t, s: qw.filter((w) => tw.includes(` ${w} `) || tw.includes(` ${w}s `)).length } }).filter((x) => x.s > 0)
  const top = Math.max(0, ...scored.map((x) => x.s))
  const hits = scored.filter((x) => x.s === top).map((x) => x.t)
  if (hits.length === 1) {
    const t = hits[0]!
    return { title: `Mark “${t.title}” done`, text: 'It is ticked done on the task list — Undo puts it back.',
      plan: { title: `Mark “${t.title}” done`, text: 'It is ticked done on the task list — Undo puts it back.', lines: [t.lead ? `On ${t.lead}` : 'A studio task', dueMeta(t.dueAt, c.now)], confirm: 'Mark it done', do: { kind: 'task_done', taskId: t.id, title: t.title } } }
  }
  if (hits.length > 1) return { title: `${hits.length} of your tasks match`, text: 'Which one?', rows: hits.slice(0, 6).map((t) => askRow(t.id, t.title, t.lead ?? dueMeta(t.dueAt, c.now), `Mark the task “${t.title}” done`)) }
  const soon = all.filter((t) => t.dueAt).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime()).slice(0, 5)
  return { title: 'No open task of yours matches', text: soon.length ? 'Your next ones — pick one to mark it done:' : 'You have no open tasks.', rows: soon.map((t) => askRow(t.id, t.title, dueMeta(t.dueAt, c.now), `Mark the task “${t.title}” done`)) }
}

/** (1.0's create_task) "Remind me to call Mrs Tan tomorrow at 3pm" — a task proposed with its day, for the asker, on the lead it names; "set a
    follow-up with Olivia on Friday" — the lead's follow-up, for its members (the LEAD STAGES card's own rule). */
export async function remindAnswer(c: Ctx, question: string, p: AskParams): Promise<MaisonAnswer> {
  const when = readWhen(question, new Date(c.now))
  const at = when.at ?? defaultDue(new Date(c.now))
  if (at.getTime() < c.now - 60_000) return { title: 'That time has passed', text: `${displayDue(at)} is already behind us — name a day ahead, like “tomorrow at 10am”.` }
  const named = await peopleNamed(c, question)
  if (named.length > 1) return { title: `${named.length} clients with that name`, text: 'Which one is it for?', rows: named.map((n) => askRow(n.id, n.name, whereWords(n), `${question} — ${n.name}`)) }
  const lead = named[0] ?? null
  const first = lead ? lead.name.split(' ')[0] ?? lead.name : null
  let title = reminderTitle(question, [...when.spans, ...(lead ? [] : [])]) ?? (first ? `Follow up with ${first}` : 'Follow up')
  if (/^Follow up$/i.test(title) && first) title = `Follow up with ${first}`
  const followUp = !!(p.followUp && lead)
  const team = followUp && lead ? await db.select({ id: members.id, name: members.name }).from(leadAssignees).innerJoin(members, eq(members.id, leadAssignees.memberId)).where(eq(leadAssignees.leadId, lead.id)).then(withYou) : []
  const forWho = followUp ? (team.length ? team.map((m) => (m.isYou ? 'You' : m.name)).join(', ') : 'You') : 'You'
  const lines = [`For ${forWho}`, `Due ${displayDue(at)}`, lead ? `On ${lead.name}’s ${lead.project ? `project, ${lead.project.number}` : 'lead'}` : 'A studio task — on no lead']
  return { title, text: followUp ? `A follow-up on ${lead!.name} for its members — it shows as the lead’s next follow-up.` : 'A task for you — it shows on My Tasks and rings the bell when it is due.',
    plan: { title, text: followUp ? `A follow-up on ${lead!.name} for its members — it shows as the lead’s next follow-up.` : 'A task for you — it shows on My Tasks and rings the bell when it is due.', lines, confirm: 'Add the task',
      do: { kind: 'task', title, dueAt: at.toISOString(), leadId: lead?.id ?? null, memberIds: followUp ? [] : [c.viewer.id], followUp } } }
}

/** (1.0's draft_client_message · "Draft Follow-up") A WhatsApp drafted from the lead's record for where it stands — opened in WhatsApp on the
    press, the studio sends it. No name → the newest leads to pick from. */
export async function draftAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'Not for Accounting', text: ON_LEADS }
  const named = await peopleNamed(c, question)
  if (!named.length) {
    const visible = await visibleLeadIds(c.viewer)
    const recent = (await db.select({ id: leads.id, name: leads.name, stage: leads.stage }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.direct, false))).orderBy(desc(leads.createdAt)).limit(30))
      .filter((l) => !visible || visible.has(l.id)).slice(0, 5)
    return { title: 'Who is it for?', text: recent.length ? 'Name the client — or pick one of the newest leads:' : 'Name the client — like “Draft a follow-up for Olivia Martinez”.',
      rows: recent.map((l) => askRow(l.id, titleCaseName(l.name), l.stage, `Draft a follow-up for ${titleCaseName(l.name)}`)) }
  }
  if (named.length > 1) return { title: `${named.length} clients with that name`, text: 'Which one?', rows: named.map((n) => askRow(n.id, n.name, whereWords(n), `Draft a follow-up for ${n.name}`)) }
  const n = named[0]!
  const [q] = await db.select({ number: quotes.number }).from(quotes).where(and(eq(quotes.leadId, n.id), eq(quotes.kind, 'quote'), isNull(quotes.deletedAt))).orderBy(desc(quotes.createdAt)).limit(1)
  const [me] = await db.select({ name: members.name }).from(members).where(eq(members.id, c.viewer.id)).limit(1)
  const d = stageDraft({ name: n.name, propertyType: n.propertyType, stage: n.stage, quoteNumber: q?.number ?? null, onProject: !!n.project && n.project.stage !== 'completed' }, me?.name.split(' ')[0] ?? null)
  const first = n.name.split(' ')[0] ?? n.name
  if (!n.phone.replace(/\D/g, '')) return { title: `No number for ${first}`, text: `${n.name}’s record has no mobile number — add one on the lead first.`, rows: [row(c, n.id, `Open ${n.name}`, whereWords(n), leadHref(n))] }
  return { title: `WhatsApp ${first}`, text: `“${d.text}”`,
    plan: { title: `WhatsApp ${first}`, text: `“${d.text}”`, lines: [`${d.what.charAt(0).toUpperCase()}${d.what.slice(1)} for ${n.name} · ${phoneWords(n.phone)}`, 'It opens in WhatsApp with this message — change anything before you send it.'], confirm: 'Open WhatsApp',
      do: { kind: 'whatsapp', phone: n.phone, text: d.text } } }
}

/* ── leads (1.0's list_leads · get_lead_details) ───────────────────────────────────────────────────────────────────────────────── */

export async function leadsAttentionAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'Not for Accounting', text: ON_LEADS }
  const { fetchLeadRows } = await import('@/lib/leads/queries')
  const visible = await visibleLeadIds(c.viewer)
  /* (S42 D-11) a won lead with a live project has handed over (REG-1360's one home): its tasks are the project's, never a lead's follow-up */
  const rows = (await fetchLeadRows()).rows.filter((r) => !r.direct && !r.project && (!visible || visible.has(r.id)))
  const s = question.toLowerCase()
  const open = (id: string) => `/leads/${id}`
  /* "new leads this week" — the week's leads, newest first */
  if (/\bnew\b/.test(s) && /\b(this week|7 days|week|today)\b/.test(s)) {
    const since = /\btoday\b/.test(s) ? startOfDay(new Date(c.now)) : c.now - 7 * DAY
    const fresh = rows.filter((r) => r.createdAt.getTime() >= since).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const none = fresh.filter((r) => !r.assignees.length).length
    /* (S42 D-14) the window is the last 7 days, not the calendar week — said so */
    if (!fresh.length) return { title: /\btoday\b/.test(s) ? 'No new leads today' : 'No new leads in the last 7 days', text: 'Leads that came in show here, newest first.', link: { label: 'Open Leads', href: go(c, '/leads') } }
    return { title: `${plural(fresh.length, 'new lead')} ${/\btoday\b/.test(s) ? 'today' : 'in the last 7 days'}`, text: `Newest first${none ? ` — ${none === 1 ? '1 has' : `${none} have`} no member yet` : ''}.`,
      rows: fresh.slice(0, 10).map((r) => row(c, r.id, r.name, [r.source, r.propertyType, r.stage, r.assignees.length ? r.assignees.map((m) => m.name).join(', ') : 'No member yet'].join(' · '), open(r.id))),
      link: { label: 'Open Leads', href: go(c, '/leads') } }
  }
  const out: { r: (typeof rows)[number]; why: string; rank: number }[] = []
  const end = startOfDay(new Date(c.now)) + DAY
  for (const r of rows) {
    if (r.stage === 'Lost') continue
    const late = r.tasks.filter((t) => !t.done && isOverdue(t.dueAt, c.now)).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())[0]
    const today = r.tasks.filter((t) => !t.done && t.dueAt && t.dueAt.getTime() < end && !isOverdue(t.dueAt, c.now))[0]
    if (late && isOverdueLead(r, c.now)) out.push({ r, why: `Overdue follow-up · ${late.title}, due ${displayDayMonth(late.dueAt!)}`, rank: 0 })
    else if (today && r.stage !== 'On Hold') out.push({ r, why: `Due today · ${today.title}`, rank: 1 })
    else if (r.stage === 'New' && !r.lastContact) out.push({ r, why: `New · no contact yet · came in ${displayDayMonth(r.createdAt)}`, rank: 2 })
    else if (!r.assignees.length && r.stage !== 'Won') out.push({ r, why: `${r.stage} · no member yet`, rank: 3 })
  }
  out.sort((a, b) => a.rank - b.rank || a.r.createdAt.getTime() - b.r.createdAt.getTime())
  const late = out.filter((x) => x.rank === 0).length
  if (!out.length) return { title: 'No lead needs you right now', text: 'No follow-up is late or due today, every New lead has been contacted and every lead has a member.', link: { label: 'Open Leads', href: go(c, '/leads') } }
  return { title: `${plural(out.length, 'lead')} need${out.length === 1 ? 's' : ''} attention`, text: 'Late follow-ups first, then today’s, the New leads nobody has contacted and the ones with no member.',
    rows: out.slice(0, 10).map((x) => row(c, x.r.id, x.r.name, x.why, open(x.r.id))),
    link: { label: late ? 'Open the overdue follow-ups' : 'Open Leads', href: go(c, late ? '/leads?scope=overdue' : '/leads') } }
}

/** (1.0's get_lead_details) One client the question names: where they stand, the next follow-up, the latest quote and what is late. */
export async function aboutAnswer(c: Ctx, question: string, named?: Named[]): Promise<MaisonAnswer | null> {
  const hits = named ?? (await peopleNamed(c, question))
  if (!hits.length) return null
  if (hits.length > 1) return { title: `${hits.length} clients with that name`, text: 'Which one?', rows: hits.map((n) => askRow(n.id, n.name, whereWords(n), `Tell me about ${n.name}`)) }
  const n = hits[0]!
  const { fetchLeadRow } = await import('@/lib/leads/queries')
  const { row: r } = await fetchLeadRow(n.id)
  if (!r) return null
  const first = n.name.split(' ')[0] ?? n.name
  const days = Math.max(0, Math.round((startOfDay(new Date(c.now)) - startOfDay(r.stageSince)) / DAY))
  const open = r.tasks.filter((t) => !t.done).sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
  const late = open.filter((t) => isOverdue(t.dueAt, c.now))
  const [q] = await db.select({ id: quotes.id, number: quotes.number, status: quotes.status, amountMinor: quotes.amountMinor }).from(quotes).where(and(eq(quotes.leadId, n.id), eq(quotes.kind, 'quote'), isNull(quotes.deletedAt))).orderBy(desc(quotes.createdAt)).limit(1)
  const base = n.project && !c.desk ? `/projects/${n.project.id}` : `/leads/${n.id}`   // (S44O — C6) Marketing opens the lead, never its project
  const rows: MaisonRow[] = []
  if (open[0]) rows.push(row(c, `task:${open[0].id}`, `Next: ${open[0].title}`, dueMeta(open[0].dueAt, c.now), `/tasks?open=${encodeURIComponent(open[0].id)}`))
  if (late.length > 1) rows.push(row(c, 'late', `${plural(late.length, 'task')} overdue`, 'Open the tasks', `${base}/tasks`))
  if (q && !c.desk) rows.push(row(c, `quote:${q.id}`, `${q.number} · ${q.status}`, `S$${(q.amountMinor / 100).toLocaleString('en-SG', { minimumFractionDigits: 2 })}`, `/quotes/${q.id}`))   // (S44O — C6) never Marketing's
  if (r.lastContact) rows.push(row(c, 'contact', `Last contact ${displayDayMonth(r.lastContact.at)}`, [r.lastContact.channel, r.lastContact.outcome].filter(Boolean).join(' · ') || undefined, `/leads/${n.id}/notes`))
  else if (!n.project) rows.push(row(c, 'contact', 'No contact logged yet', 'Log a call or a message on Notes & Logs', `/leads/${n.id}/notes`))
  const stageLine = n.project ? `${n.project.number} · ${isProjectStage(n.project.stage) ? STAGE_LABEL[n.project.stage] : n.project.stage}` : `${r.stage} for ${days === 0 ? 'less than a day' : plural(days, 'day')}`
  return { title: n.name, text: `${stageLine} · ${r.propertyType}${r.budgetMinor > 0 ? ` · budget S$${Math.round(r.budgetMinor / 100).toLocaleString('en-SG')}` : ''}${r.assignees.length ? ` · with ${r.assignees.map((m) => (m.isYou ? 'you' : m.name)).join(', ')}` : ' · no member yet'}.`,
    rows, link: { label: n.project && !c.desk ? `Open ${first}’s project` : `Open ${first}’s lead`, href: go(c, base) } }
}

/* ── quotes (1.0's get_quote_analysis) ─────────────────────────────────────────────────────────────────────────────────────────── */

export async function quotesAnswer(c: Ctx, p: AskParams, question = ''): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'Not for Accounting', text: 'Quotes are the designers’ and the approvers’ — Accounting reads a signed one from a project’s Money.' }
  const { fetchQuoteApproval, isApprover } = await import('@/lib/settings/queries')
  const visible = await visibleLeadIds(c.viewer)
  const list = (await db.select({ id: quotes.id, number: quotes.number, status: quotes.status, amountMinor: quotes.amountMinor, leadId: quotes.leadId, lead: leads.name, createdBy: quotes.createdBy, submittedBy: quotes.submittedBy,
    validUntil: quotes.validUntil, sentAt: quotes.sentAt, clientSentAt: quotes.clientSentAt, views: quotes.clientViewCount, viewedAt: quotes.clientLastViewedAt, submittedAt: quotes.submittedAt })
    .from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId))
    .where(and(eq(quotes.kind, 'quote'), isNull(quotes.deletedAt), isNull(quotes.archivedAt), isNull(leads.deletedAt))))
    .filter((q) => !visible || visible.has(q.leadId)).map((q) => ({ ...q, lead: titleCaseName(q.lead) }))
  const money = (m: number) => `S$${(m / 100).toLocaleString('en-SG', { minimumFractionDigits: 2 })}`
  const open = (id: string) => `/quotes/${id}`
  const scope = p.quoteScope ?? 'all'
  /* (1.0's "Optimize Quote" one-tap prompt) a client named: their latest quote, read as the quote editor's Maison AI reads it — below cost,
     under a 10% margin, no price yet (lib/quotes/hints.ts) — each a press away in the editor */
  const named = question ? await peopleNamed(c, question) : []
  if (named.length === 1) {
    const n = named[0]!
    const latest = list.filter((q) => q.leadId === n.id).sort((a, b) => b.number.localeCompare(a.number, undefined, { numeric: true }))[0]
    if (!latest) return { title: `No quote for ${n.name} yet`, text: 'Create one from their lead’s Quotes tab — or ask “Draft a follow-up”.', rows: [row(c, n.id, `Open ${n.name}`, whereWords(n), `/leads/${n.id}/quotes`)] }
    const { quoteHints, THIN_MARGIN_PCT } = await import('@/lib/quotes/hints')
    const { quoteItems } = await import('@/lib/db/schema')
    const h = quoteHints(await db.select().from(quoteItems).where(eq(quoteItems.quoteId, latest.id)))
    /* (pending modules S41b-1) below cost and thin margins read the lines' costs — never for a member who doesn't see them */
    const costs = c.costs !== false
    if (!costs) { h.below = []; h.thin = [] }
    const rows: MaisonRow[] = [
      ...(h.below.length ? [row(c, 'below', `${plural(h.below.length, 'line sells', 'lines sell')} below cost`, h.below.slice(0, 3).map((x) => x.name).join(' · '), open(latest.id))] : []),
      ...(h.thin.length ? [row(c, 'thin', `${plural(h.thin.length, 'line')} under a ${THIN_MARGIN_PCT}% margin`, h.thin.slice(0, 3).map((x) => x.name).join(' · '), open(latest.id))] : []),
      ...(h.unpriced.length ? [row(c, 'unpriced', `${plural(h.unpriced.length, 'line has', 'lines have')} no price yet`, h.unpriced.slice(0, 3).map((x) => x.name).join(' · '), open(latest.id))] : []),
    ]
    return { title: `${latest.number} · ${n.name}`, text: rows.length ? `${latest.status} · ${money(latest.amountMinor)}. What to look at before it goes — open the quote and its Maison AI takes you to each line.` : costs ? `${latest.status} · ${money(latest.amountMinor)}. Every priced line clears its cost and a ${THIN_MARGIN_PCT}% margin, and nothing is left unpriced.` : `${latest.status} · ${money(latest.amountMinor)}. Nothing is left unpriced.`,
      rows, link: { label: `Open ${latest.number}`, href: go(c, open(latest.id)) } }
  }
  const approver = (await fetchQuoteApproval()) === 'required' && (await isApprover(c.viewer.id, c.viewer.role))
  const waiting = list.filter((q) => q.status === 'Sent for Approval')
  const sentDay = (q: (typeof list)[number]) => q.clientSentAt ?? q.sentAt
  const unanswered = list.filter((q) => q.status === 'Sent to Client' && sentDay(q) && c.now - sentDay(q)!.getTime() >= 3 * DAY)
  const expiring = list.filter((q) => (q.status === 'Sent to Client' || q.status === 'Approved') && q.validUntil && q.validUntil.getTime() < c.now + 14 * DAY)
  if (scope === 'approval') {
    const mine = approver ? waiting : waiting.filter((q) => q.submittedBy === c.viewer.id || q.createdBy === c.viewer.id)
    if (!mine.length) return { title: approver ? 'Nothing waits for your approval' : 'None of your quotes is waiting', text: approver ? 'Every quote sent for approval is answered.' : 'A quote you send for approval shows here until an approver answers it.' }
    return { title: approver ? `${plural(mine.length, 'quote')} wait${mine.length === 1 ? 's' : ''} for your approval` : `${plural(mine.length, 'quote')} of yours waiting`, text: approver ? 'Open one to approve it or send it back with a note.' : 'An Owner, an Admin or the backup approver answers it.',
      rows: mine.map((q) => row(c, q.id, `${q.number} · ${q.lead}`, `${money(q.amountMinor)}${q.submittedAt ? ` · sent ${displayDayMonth(q.submittedAt)}` : ''}`, open(q.id))) }
  }
  if (scope === 'expiring') {
    if (!expiring.length) return { title: 'No quote runs out soon', text: 'No quote with a client has its Valid until in the next 14 days.' }
    return { title: `${plural(expiring.length, 'quote')} run${expiring.length === 1 ? 's' : ''} out soon`, text: 'Valid until in the next 14 days — or already passed. A check-in now saves a new quote later.',
      rows: expiring.sort((a, b) => a.validUntil!.getTime() - b.validUntil!.getTime()).map((q) => row(c, q.id, `${q.number} · ${q.lead}`, `${q.validUntil!.getTime() < c.now ? 'Ran out' : 'Valid until'} ${displayDayMonth(q.validUntil!)} · ${money(q.amountMinor)}`, open(q.id))) }
  }
  if (scope === 'unanswered') {
    if (!unanswered.length) return { title: 'No quote is waiting on a client', text: 'Every quote sent three days ago or more is confirmed or signed.' }
    return { title: `${plural(unanswered.length, 'quote')} waiting on the client`, text: 'Sent three days ago or more, not confirmed yet — whether they opened it, from the quote’s own link.',
      rows: unanswered.sort((a, b) => sentDay(a)!.getTime() - sentDay(b)!.getTime()).map((q) => row(c, q.id, `${q.number} · ${q.lead}`, `Sent ${displayDayMonth(sentDay(q)!)} · ${q.views ? `opened ${plural(q.views, 'time')}` : 'not opened yet'}`, open(q.id))) }
  }
  if (scope === 'drafts') {
    const drafts = list.filter((q) => q.status === 'Draft' && (q.createdBy === c.viewer.id || !visible))
    if (!drafts.length) return { title: 'No drafts', text: 'A quote you start shows here until it is sent.' }
    return { title: `${plural(drafts.length, 'draft')}`, text: 'Quotes not sent yet.', rows: drafts.slice(0, 10).map((q) => row(c, q.id, `${q.number} · ${q.lead}`, money(q.amountMinor), open(q.id))) }
  }
  const counts = (['Draft', 'Sent for Approval', 'Approved', 'Sent to Client', 'Confirmed', 'Signed'] as const).map((s) => ({ s, n: list.filter((q) => q.status === s).length })).filter((x) => x.n)
  return { title: `${plural(list.length, 'quote')}`, text: counts.map((x) => `${x.n} ${x.s}`).join(' · ') || 'No quotes yet.',
    rows: [
      ...(waiting.length ? [askRow('approval', `${plural(waiting.length, 'quote')} waiting for approval`, approver ? 'Yours to answer' : 'With the approvers', 'Quotes waiting for approval')] : []),
      ...(unanswered.length ? [askRow('unanswered', `${plural(unanswered.length, 'quote')} waiting on the client`, 'Sent 3 days ago or more', 'Which quotes are waiting on the client?')] : []),
      ...(expiring.length ? [askRow('expiring', `${plural(expiring.length, 'quote')} running out`, 'Valid until in the next 14 days', 'Which quotes expire soon?')] : []),
    ],
    link: { label: 'Open Tools › Quotes', href: go(c, '/quotes') } }
}

/* ── the team (1.0's get_team_members · update_member_tags) ───────────────────────────────────────────────────────────────────── */

export async function teamAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  const named = await membersNamed(question)
  const team = (await db.select({ id: members.id, name: members.name, role: members.role, capacity: members.projectCapacity }).from(members).where(eq(members.isActive, true)).then(withYou))
  const leadRows = await db.select({ memberId: leadAssignees.memberId, leadId: leadAssignees.leadId, name: leads.name, stage: leads.stage, direct: leads.direct }).from(leadAssignees).innerJoin(leads, eq(leads.id, leadAssignees.leadId))
    .where(and(isNull(leads.deletedAt), ne(leads.stage, 'Lost')))
  const projRows = await db.select({ leadId: projects.leadId, id: projects.id, name: projects.name, number: projects.number, stage: projects.stage }).from(projects).where(and(isNull(projects.deletedAt), ne(projects.stage, 'completed')))
  const tasks = await db.select({ memberId: taskAssignees.memberId, dueAt: leadTasks.dueAt }).from(taskAssignees).innerJoin(leadTasks, eq(leadTasks.id, taskAssignees.taskId)).where(eq(leadTasks.done, false))
  const projOf = new Map(projRows.map((p) => [p.leadId, p]))
  const facts = (id: string) => {
    const mine = leadRows.filter((l) => l.memberId === id)
    const pipeline = mine.filter((l) => !l.direct && l.stage !== 'Won' && !projOf.has(l.leadId))
    const running = mine.filter((l) => projOf.has(l.leadId)).map((l) => projOf.get(l.leadId)!)
    const t = tasks.filter((x) => x.memberId === id)
    return { pipeline, running, open: t.length, late: t.filter((x) => isOverdue(x.dueAt, c.now)).length }
  }
  const line = (m: (typeof team)[number]) => {
    const f = facts(m.id)
    if (m.role === 'Accounting') return `${plural(f.open, 'open task')}${f.late ? ` · ${f.late} overdue` : ''}`   // (S42 D-03) the callers say the role
    return [`${plural(f.pipeline.length, 'lead')}`, `${f.running.length}${m.capacity ? ` of ${m.capacity}` : ''} running ${f.running.length === 1 && !m.capacity ? 'project' : 'projects'}`, `${plural(f.open, 'open task')}${f.late ? ` · ${f.late} overdue` : ''}`].join(' · ')
  }
  const memberHref = (id: string) => `/company/members?open=${encodeURIComponent(id)}`
  if (named.length === 1) {
    const m = team.find((x) => x.id === named[0]!.id)!
    const f = facts(m.id)
    const visible = await visibleLeadIds(c.viewer)
    const seen = (leadId: string) => !c.acct && (!visible || visible.has(leadId))
    const rows: MaisonRow[] = [
      ...f.running.filter((p) => seen(p.leadId)).slice(0, 6).map((p) => row(c, `p:${p.id}`, p.name, `${p.number} · ${isProjectStage(p.stage) ? STAGE_LABEL[p.stage] : p.stage}`, `/projects/${p.id}`)),
      ...f.pipeline.filter((l) => seen(l.leadId)).slice(0, 6).map((l) => row(c, `l:${l.leadId}`, titleCaseName(l.name), l.stage, `/leads/${l.leadId}`)),
    ]
    return { title: m.isYou ? 'What you are working on' : `What ${m.name.split(' ')[0]} is working on`, text: `${m.role} · ${line(m)}.`, rows, link: { label: m.isYou ? 'Open Members' : `Open ${m.name.split(' ')[0]} on Members`, href: go(c, memberHref(m.id)) } }
  }
  return { title: `${plural(team.length, 'member')}`, text: 'Their leads in the pipeline, running projects and open tasks — open one on Members.',
    rows: team.map((m) => row(c, m.id, m.isYou ? `${m.name} (you)` : m.name, `${m.role} · ${line(m)}`, memberHref(m.id))),
    link: { label: 'Open Members', href: go(c, '/company/members') } }
}

export async function memberRoleAnswer(c: Ctx, question: string, p: AskParams): Promise<MaisonAnswer> {
  if (!c.runs) return { title: 'Owners and Admins only', text: 'Only an Owner or an Admin changes a member’s role — on Company › Members.' }
  const named = await membersNamed(question)
  if (!named.length) return { title: 'Whose role?', text: 'Name the member — like “Make Germaine an Admin”.', rows: [row(c, 'members', 'Open Members', undefined, '/company/members')] }
  return { title: named.length === 1 ? `Change ${named[0]!.name.split(' ')[0]}’s role${p.role ? ` to ${p.role}` : ''}` : `${named.length} members with that name`,
    text: 'Members opens on their row — pick the role there; the rules for who may do what follow it.',
    rows: named.map((m) => row(c, m.id, `${m.name} · ${m.role} now`, p.role ? `To ${p.role} — on their row` : 'On their row', `/company/members?open=${encodeURIComponent(m.id)}`)) }
}

/* ── the studio at a glance (1.0's get_studio_overview) ────────────────────────────────────────────────────────────────────────── */

export async function overviewAnswer(c: Ctx): Promise<MaisonAnswer> {
  const rows: MaisonRow[] = []
  const tasks = await myOpenTasks(c)
  const lateTasks = tasks.filter((t) => isOverdue(t.dueAt, c.now)).length
  const todayTasks = tasks.filter((t) => isDueToday(t.dueAt, c.now)).length
  if (!c.acct) {
    const { fetchLeadRows } = await import('@/lib/leads/queries')
    const visible = await visibleLeadIds(c.viewer)
    const ls = (await fetchLeadRows()).rows.filter((r) => !r.direct && (!visible || visible.has(r.id)))
    const fresh = ls.filter((r) => r.createdAt.getTime() >= c.now - 7 * DAY).length
    const overdue = ls.filter((r) => !r.project && isOverdueLead(r, c.now)).length   // (S42 D-11) a running project's tasks are counted on its own line
    rows.push(askRow('leads', `${plural(fresh, 'new lead')} in the last 7 days`, `${ls.filter((r) => !['Won', 'Lost'].includes(r.stage)).length} in the pipeline${overdue ? ` · ${overdue} with an overdue follow-up` : ''}`, 'Which leads need attention?'))
    const { countProjectsNeedingAttention } = await import('@/lib/projects/queries')
    const running = (await db.select({ leadId: projects.leadId }).from(projects).where(and(isNull(projects.deletedAt), inArray(projects.stage, ['setting_up', 'in_progress'])))).filter((p) => !visible || visible.has(p.leadId)).length
    const att = await countProjectsNeedingAttention().catch(() => 0)
    rows.push(row(c, 'projects', `${plural(running, 'running project')}`, att ? `${att} need${att === 1 ? 's' : ''} attention` : 'Nothing needs attention', att ? '/projects?scope=attention' : '/projects'))
    const { fetchQuoteApproval, isApprover } = await import('@/lib/settings/queries')
    if ((await fetchQuoteApproval()) === 'required' && (await isApprover(c.viewer.id, c.viewer.role))) {
      const [w] = await db.select({ n: sql<number>`count(*)` }).from(quotes).where(and(eq(quotes.status, 'Sent for Approval'), eq(quotes.kind, 'quote'), isNull(quotes.deletedAt), isNull(quotes.archivedAt)))
      if (Number(w?.n ?? 0)) rows.push(askRow('approve', `${plural(Number(w!.n), 'quote')} waiting for your approval`, 'Open them', 'Quotes waiting for approval'))
    }
  }
  rows.push(askRow('tasks', `${plural(tasks.length, 'open task')} of yours`, lateTasks ? `${lateTasks} overdue${todayTasks ? ` · ${todayTasks} today` : ''}` : todayTasks ? `${todayTasks} due today` : 'Nothing overdue', 'My tasks today'))
  if (c.books) {
    const { fetchBooks } = await import('@/lib/finance/books')
    const { buildReport } = await import('@/lib/finance/reports')
    const b = await fetchBooks()
    if (b) {
      const r = buildReport('ar', { projects: b.projects, overhead: b.overhead, vendors: b.vendors, people: b.people, commission: b.commission, now: b.now }, 'all')
      const owed = r.tiles.find((t) => t.label === 'Owed to you')
      if (owed) rows.push(askRow('owed', `${owed.value} owed to the studio`, owed.help, 'Who owes the studio money?'))
    }
  }
  const d = new Date(c.now)
  return { title: 'Your studio today', text: `${d.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })} — open any line for the list behind it.`, rows }
}

/* ── the tools that read files (1.0's parse_quote · detect_surfaces · generate_render · image_to_3d_floorplan · benchmark_quote) ──── */

export function attachAnswer(c: Ctx): MaisonAnswer {
  if (c.acct) return { title: 'Not for Accounting', text: ON_LEADS }
  return { title: 'These read a file for you', text: 'Maison AI doesn’t take files in this box yet — each tool below reads them, and says what a read costs before it starts.',
    rows: [
      row(c, 'xray', 'Compare a competitor’s quote', 'Quote X-Ray reads their spreadsheet or PDF beside yours — no AI credits', '/quote-x-ray'),   // (pending modules S21) what it truly reads; a photo needs the developers' reader
      row(c, 'upload', 'Turn a quote you have into a 2.0 quote', 'Tools › Quotes › Create Quote › Upload a quote', '/quotes'),
      row(c, 'render', 'Render a room from a photo', 'The AI Visualizer finds its surfaces and repaints them', '/visualizer?new=1'),
      row(c, 'plan', 'Turn a floor plan into a 3D layout', 'The 3D Space Planner, from a flat template or your plan', '/planner?new=1'),
    ] }
}

/* ── (pending modules S29 — card api:ai-writing-help-quotes; 1.0's ✨ menu on the quote document's sections) the writing help ───────── */

/** Where Write with AI is, and what it does — asked in words where the page has no suggestion for it. Nothing here writes. */
export function writingAnswer(c: Ctx): MaisonAnswer {
  const how = 'Improve the writing · Shorten · Add what’s missing · Rewrite from the records · Plain English. You read the change first, word by word; nothing goes in until you press Use these words, and Undo takes it back. It works by rule from your records — no AI credits.'
  if (c.acct) return { title: 'Write with AI sits beside the words', text: `On a purchase order’s message to the vendor, press Write with AI under the message: ${how}` }
  return { title: 'Write with AI sits beside the words', text: `Open the words you want to change and press Write with AI there: ${how}`,
    rows: [
      row(c, 'quotes', 'A quote’s Terms and Notes', 'Its Write with AI button — also a line’s Description', '/quotes'),
      row(c, 'contracts', 'A contract', 'Write with AI in its formatting bar', '/contracts'),
      row(c, 'texts', 'Your T&Cs & Notes templates', 'Company › Templates › T&Cs & Notes', '/company/templates/terms'),
    ] }
}

/* ── the AI Visualizer and the Space Planner, as the client sees them ─────────────────────────────────────────────────────────── */

export async function rendersPickedAnswer(c: Ctx): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'Not for Accounting', text: ON_LEADS }
  const since = c.now - 7 * DAY
  const visible = await visibleLeadIds(c.viewer)
  const rows = (await db.select({ id: renderConsultationRequests.id, kind: renderConsultationRequests.kind, at: renderConsultationRequests.createdAt, name: renderConsultationRequests.clientName, designId: renderShareLinks.designId, leadId: renderShareLinks.leadId, design: visualizerDesigns.name })
    .from(renderConsultationRequests).innerJoin(renderShareLinks, eq(renderShareLinks.id, renderConsultationRequests.shareLinkId)).innerJoin(visualizerDesigns, eq(visualizerDesigns.id, renderShareLinks.designId))
    .where(and(eq(renderConsultationRequests.kind, 'favourite'), isNull(visualizerDesigns.deletedAt))).orderBy(desc(renderConsultationRequests.createdAt)))
    .filter((r) => !r.leadId || !visible || visible.has(r.leadId))
  const week = rows.filter((r) => r.at.getTime() >= since)
  if (!week.length) return { title: 'No client picked a render in the last 7 days',   // (S42 D-14) the last 7 days, said so text: rows.length ? 'The last ones a client hearted:' : 'When a client taps the heart on a render you sent, it shows here.',
    rows: rows.slice(0, 5).map((r) => row(c, r.id, r.design, `${r.name ? `${r.name} · ` : ''}${displayDayMonth(r.at)}`, `/visualizer/${r.designId}`)), link: { label: 'Open the AI Visualizer', href: go(c, '/visualizer') } }
  return { title: `${plural(week.length, 'render')} picked in the last 7 days`, text: 'The client’s favourites, newest first — open the design to carry one forward.',
    rows: week.slice(0, 10).map((r) => row(c, r.id, r.design, `${r.name ? `${r.name} · ` : ''}${displayDayMonth(r.at)}`, `/visualizer/${r.designId}`)) }
}

export async function designsWaitingAnswer(c: Ctx): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'Not for Accounting', text: ON_LEADS }
  const visible = await visibleLeadIds(c.viewer)
  const links = (await db.select({ id: renderShareLinks.id, designId: renderShareLinks.designId, leadId: renderShareLinks.leadId, design: visualizerDesigns.name, at: renderShareLinks.createdAt, views: renderShareLinks.viewCount, expiresAt: renderShareLinks.expiresAt })
    .from(renderShareLinks).innerJoin(visualizerDesigns, eq(visualizerDesigns.id, renderShareLinks.designId))
    .where(and(isNull(renderShareLinks.revokedAt), isNull(visualizerDesigns.deletedAt))).orderBy(desc(renderShareLinks.createdAt)))
    .filter((l) => l.expiresAt.getTime() > c.now && (!l.leadId || !visible || visible.has(l.leadId)))
  const answered = new Set(links.length ? (await db.select({ id: renderConsultationRequests.shareLinkId }).from(renderConsultationRequests).where(inArray(renderConsultationRequests.shareLinkId, links.map((l) => l.id)))).map((r) => r.id) : [])
  const waiting = links.filter((l) => !answered.has(l.id))
  if (!waiting.length) return { title: 'No design is waiting on a client', text: 'Every live render link has a pick, a note or a call back — or none is out.', link: { label: 'Open the AI Visualizer', href: go(c, '/visualizer') } }
  return { title: `${plural(waiting.length, 'design')} waiting on the client`, text: 'Sent, and no pick, note or call back yet — whether they opened it, from the link.',
    rows: waiting.slice(0, 10).map((l) => row(c, l.id, l.design, `Sent ${displayDayMonth(l.at)} · ${l.views ? `opened ${plural(l.views, 'time')}` : 'not opened yet'}`, `/visualizer/${l.designId}`)) }
}

export async function rendersByLeadAnswer(c: Ctx): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'Not for Accounting', text: ON_LEADS }
  const visible = await visibleLeadIds(c.viewer)
  const ds = (await db.select({ id: visualizerDesigns.id, leadId: visualizerDesigns.leadId, name: visualizerDesigns.name, lead: leads.name }).from(visualizerDesigns).innerJoin(leads, eq(leads.id, visualizerDesigns.leadId))
    .where(and(isNull(visualizerDesigns.deletedAt), isNull(leads.deletedAt)))).filter((d) => !visible || visible.has(d.leadId!))
  const { projectRooms, renderJobs } = await import('@/lib/db/schema')
  const counts = ds.length ? await db.select({ designId: projectRooms.designId, n: sql<number>`count(${renderJobs.id})` }).from(renderJobs).innerJoin(projectRooms, eq(projectRooms.id, renderJobs.roomId)).where(inArray(projectRooms.designId, ds.map((d) => d.id))).groupBy(projectRooms.designId) : []
  const n = new Map(counts.map((x) => [x.designId, Number(x.n)]))
  const withRenders = ds.filter((d) => (n.get(d.id) ?? 0) > 0).sort((a, b) => (n.get(b.id) ?? 0) - (n.get(a.id) ?? 0))
  if (!withRenders.length) return { title: 'No lead has a render yet', text: 'A lead’s design shows here once its first render is made.' }
  return { title: `${plural(withRenders.length, 'lead')} with renders`, text: 'The most renders first — open the design.',
    rows: withRenders.slice(0, 10).map((d) => row(c, d.id, titleCaseName(d.lead), plural(n.get(d.id) ?? 0, 'render'), `/visualizer/${d.id}`)) }
}

export async function layoutsOpenedAnswer(c: Ctx): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'Not for Accounting', text: ON_LEADS }
  const visible = await visibleLeadIds(c.viewer)
  const shares = (await db.select({ id: spaceLayoutShares.id, layoutId: spaceLayoutShares.layoutId, leadId: spaceLayoutShares.leadId, name: spaceLayoutShares.name, views: spaceLayoutShares.viewCount, last: spaceLayoutShares.lastViewedAt, at: spaceLayoutShares.sharedAt })
    .from(spaceLayoutShares).innerJoin(spaceLayouts, eq(spaceLayouts.id, spaceLayoutShares.layoutId)).where(and(isNull(spaceLayoutShares.revokedAt), isNull(spaceLayouts.deletedAt))).orderBy(desc(spaceLayoutShares.sharedAt)))
    .filter((s) => !s.leadId || !visible || visible.has(s.leadId))
  if (!shares.length) return { title: 'No layout is shared yet', text: 'Share a layout from its editor — whether the client opened it shows here.', link: { label: 'Open the Space Planner', href: go(c, '/planner') } }
  const opened = shares.filter((s) => s.views > 0)
  return { title: opened.length ? `${plural(opened.length, 'layout')} opened by the client` : 'No client has opened a layout yet', text: `${plural(shares.length, 'layout')} shared — the opened ones first.`,
    rows: [...opened, ...shares.filter((s) => !s.views)].slice(0, 10).map((s) => row(c, s.id, s.name, s.views ? `Opened ${plural(s.views, 'time')} · last ${displayDayMonth(new Date(s.last ?? s.at))}` : `Shared ${displayDayMonth(new Date(s.at))} · not opened yet`, `/planner/${s.layoutId}`)) }
}

/* ── help ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export async function helpAnswer(c: Ctx, chips: string[]): Promise<MaisonAnswer> {
  const visible = c.acct ? null : await visibleLeadIds(c.viewer)
  const [lead] = c.acct ? [] : (await db.select({ name: leads.name, id: leads.id }).from(leads).where(and(isNull(leads.deletedAt), eq(leads.direct, false))).orderBy(desc(leads.createdAt)).limit(20)).filter((l) => !visible || visible.has(l.id))
  const name = lead ? titleCaseName(lead.name) : null
  return { title: 'What Maison AI can do', text: 'It answers from the studio’s records, and it can start a change for you — you always see the change first, and nothing happens until you press.',
    rows: [
      askRow('ex-remind', 'Remind me to call a client tomorrow at 3pm', 'Adds a task, once you confirm', 'Remind me to call the client tomorrow at 3pm'),
      ...(name ? [askRow('ex-draft', `Draft a follow-up for ${name}`, 'A WhatsApp you read before it goes', `Draft a follow-up for ${name}`)] : []),
      ...(c.acct ? [] : [askRow('ex-lead', 'Add a lead for Mrs Chua, 9123 4567', 'Opens Create New Lead filled in', 'Add a lead for Mrs Chua, 9123 4567')]),
      ...(c.books ? [askRow('ex-cash', 'Cash flow', 'What comes in and goes out, the next 90 days', 'Cash flow')] : []),
    ], chips }
}

/* ── what waits for my OK (1.0's approve_expense · review_purchase_order) and a site update (its "Site Update" prompt) ────────────── */

export async function approvalsAnswer(c: Ctx): Promise<MaisonAnswer> {
  const { fetchQuoteApproval, isApprover } = await import('@/lib/settings/queries')
  const rows: MaisonRow[] = []
  if (!c.acct && (await fetchQuoteApproval()) === 'required' && (await isApprover(c.viewer.id, c.viewer.role))) {
    const visible = await visibleLeadIds(c.viewer)
    const n = (await db.select({ leadId: quotes.leadId }).from(quotes).innerJoin(leads, eq(leads.id, quotes.leadId)).where(and(eq(quotes.status, 'Sent for Approval'), eq(quotes.kind, 'quote'), isNull(quotes.deletedAt), isNull(quotes.archivedAt), isNull(leads.deletedAt))))
      .filter((q) => !visible || visible.has(q.leadId)).length
    if (n) rows.push(askRow('quotes', `${plural(n, 'quote')} waiting for your approval`, 'Open them one by one', 'Quotes waiting for approval'))
  }
  if (c.runs) {
    const { countFinanceToApprove } = await import('@/lib/finance/todo-server')
    const n = await countFinanceToApprove().catch(() => 0)
    if (n) rows.push(row(c, 'finance', `${n} money ${n === 1 ? 'record' : 'records'} to approve`, 'POs, expenses, invoices and commission asks — Company › Finance › To do', '/company/finance'))
  }
  if (!c.runs && !rows.length) return { title: 'Nothing waits for your approval', text: 'Approvals are an Owner’s or an Admin’s — or the studio’s backup approver’s for quotes.' }
  return rows.length ? { title: 'Waiting for your OK', text: 'Each opens where it is approved — nothing is approved from here.', rows } : { title: 'Nothing waits for your approval', text: 'No quote, PO, expense, invoice or commission ask is waiting on you.' }
}

export async function siteUpdateAnswer(c: Ctx, question: string): Promise<MaisonAnswer> {
  if (c.acct) return { title: 'Not for Accounting', text: ON_LEADS }
  const named = (await peopleNamed(c, question)).filter((n) => n.project && n.project.stage !== 'completed')
  const own = c.projectId ? [{ id: c.projectId }] : []
  const pick = named.length ? named.map((n) => ({ id: n.project!.id, label: `${n.project!.name}`, meta: `${n.project!.number} · ${n.name}` })) : []
  if (!pick.length && own.length) return { title: 'An update for this project', text: 'The composer opens with this week drafted from the schedule — it stays a draft until you post it, and the review rule applies.', rows: [row(c, 'compose', 'Write the update', 'Updates', `/projects/${c.projectId}/updates?compose=1`)] }
  if (!pick.length) {
    const running = (await db.select({ id: projects.id, name: projects.name, number: projects.number, leadId: projects.leadId }).from(projects).where(and(isNull(projects.deletedAt), inArray(projects.stage, ['in_progress', 'setting_up']))))
    const visible = await visibleLeadIds(c.viewer)
    const mine = running.filter((p) => !visible || visible.has(p.leadId))
    return { title: 'Which project?', text: mine.length ? 'Pick one — its Updates composer opens.' : 'No running project you can see.', rows: mine.slice(0, 8).map((p) => row(c, p.id, p.name, p.number, `/projects/${p.id}/updates?compose=1`)) }
  }
  return { title: pick.length === 1 ? `An update for ${pick[0]!.label}` : 'Which project?', text: 'Its Updates composer opens — photos first on a phone; it stays a draft until you post it, and the review rule applies.',
    rows: pick.map((x) => row(c, x.id, `Write the update · ${x.label}`, x.meta, `/projects/${x.id}/updates?compose=1`)) }
}
