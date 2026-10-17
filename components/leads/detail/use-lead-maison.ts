'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { withFrom } from '@/lib/nav'
import { displayDate, displayDue, moneyCard, parseInputDateTime } from '@/lib/format'
import { firstName, waLink } from '@/lib/portal/model'
import { STAGE_LABEL, isProjectStage } from '@/lib/projects/model'
import { briefBudget } from '@/lib/leads/briefs'
import { DRAFTS, type DraftLead } from '@/lib/maison-ai/drafts'
import { reviewAsk } from '@/lib/maison-ai/review-ask'   // (pending modules S14)
import type { MaisonAnswer, MaisonProposal, MaisonRow, MaisonSuggestion } from '@/lib/maison-ai'
import type { LeadRow } from '@/lib/leads/queries'
import type { ParkedStep } from '@/lib/leads/detail'
import type { Member, Quote } from '@/lib/db/schema'
import { setFollowUp } from '@/app/leads/actions'
import { pastQuotes, quoteTrims, similarProjects } from '@/app/leads/maison-actions'
import { ON_DESK } from '@/lib/settings/roles'   // (S44O — C6)
import { lateMilestones, nextStepTask } from '@/app/projects/maison-actions'

/**
 * (parity P-33 · Q-02, the owner's pick 2026-10-08: "Maison AI acts on the lead side too") What the lead brief's buttons and the lead page's
 * Maison AI suggestions do — the projects' contract (`{ run | answer | propose }`, lib/maison-ai.ts, gaps build I-Q16) on the lead side, so a
 * press no longer dead-ends in "Coming soon" where the record holds the answer:
 *   · **run** — the page's own door: Set a follow-up, Ask the client, the Create Quote modal, the quote, the AI Visualizer, the project;
 *   · **answer** — from the lead's own records (its facts and gaps, its contact logs, the loss reason) or the studio's (projects and quotes on the
 *     same property type, the latest quote's lines, the project's late milestones) — each row opens its record;
 *   · **propose** — a follow-up task for the lead's members (the LEAD STAGES card's own `setFollowUp`), or a WhatsApp message drafted from the
 *     record that opens on the press (wa.me, as the info column's WhatsApp does).
 * (pending modules S10 — card held:maison-ai, "make each act or drop it") No brief button is words alone: "Attach a client review" answers with the
 * studio's own finished homes of the type (2.0 keeps no reviews — said in the answer), and the Lost brief's newsletter button became
 * "Remind me in a year" (2.0 keeps no newsletter list).
 * Every message, title and line here is invented copy in the briefs' voice (lib/leads/briefs.ts).
 */
export type LeadMaisonDoors = {
  followUp: () => void
  ask: () => void
  newQuote: () => void
  openQuote: (quoteId: string) => void
  visualizer: () => void
  openProject: () => void
  edit: () => void
  contactLog: () => void
  /** The lead's tab address (the project's tab once the lead is on its project), `?from=` kept. */
  tab: (slug: 'tasks' | 'quotes' | 'notes' | 'questionnaire' | 'activity', query?: string) => string
  /** A task this page just made, opened as MY TASKS opens one. */
  openTask: (taskId: string) => void
  /** (S42E, E-11) the met-already brief's *Log the meeting*: the lead's next stage, the held meeting as its log */
  logMeeting: () => void
}

export type LeadMaisonInput = {
  lead: LeadRow
  quote: Quote | null
  unanswered: { id: string; text: string }[]
  parked: ParkedStep | null
  project: { id: string; number: string; stage?: string; name?: string } | null
  team: Member[]
  doors: LeadMaisonDoors
  /** (S44O — call C6) the viewer is Marketing — a quote, a design or the project answers with the role's line */ desk?: boolean
}

const here = () => `${window.location.pathname}${window.location.search}`
/** A due a few days out, at 10:00 — the follow-up dialog's own morning. */
const dueIn = (days: number, months = 0) => { const d = new Date(); d.setMonth(d.getMonth() + months); d.setDate(d.getDate() + days); d.setHours(10, 0, 0, 0); return d }
/** The next working day on or after `from` (Mon–Fri). */
const workday = (from: Date) => { const d = new Date(from); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return d }

/** The lead page's Maison AI: `resolve(label)` answers each brief action's words with what the press does. */
/** (S44O — call C6) The brief's buttons whose door is a quote, a design or a project — never Marketing's. */
const DESK_LABELS = ['Open project', 'Start quote from package', 'Suggest a package', 'Prepare a revised quote', 'Offer a revised package', 'Share moodboard',
  'Compare to past quotes', 'List optional trims', 'Summarise the project', 'Pick a portfolio match', 'Share a recent project', 'Attach a client review']
export function useLeadMaison(o: LeadMaisonInput): (label: string) => MaisonSuggestion {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { lead, quote, unanswered, parked, project, team, doors, desk = false } = o
  return useCallback((label: string): MaisonSuggestion => {
    const first = firstName(lead.name)
    const me = team.find((m) => m.isYou)?.name.split(' ')[0] ?? null
    const pt = lead.propertyType
    const lastMeet = lead.stageData.meetings?.at(-1)
    const dl: DraftLead = { name: lead.name, propertyType: pt, stage: lead.stage, quoteNumber: quote?.number ?? null,
      meeting: lastMeet ? { at: lastMeet.when ? parseInputDateTime(lastMeet.when) : null, where: lastMeet.where ?? null } : null }
    const members = lead.assignees.length ? lead.assignees.map((m) => (m.isYou ? 'You' : m.name)).join(', ') : 'You'   // setFollowUp: the lead's members, else you

    /* ── propose: a follow-up task for the lead's members (setFollowUp — the LEAD STAGES card's own action) ── */
    const task = (title: string, due: () => Date, why: string): MaisonSuggestion => ({ label, propose: async (): Promise<MaisonProposal> => {
      const at = due()
      return {
        title, text: why, confirm: 'Add the task',
        lines: [`For ${members}`, `Due ${displayDue(at)}`],
        run: async () => {
          try {
            const id = await setFollowUp(lead.id, { title, dueAt: at.toISOString() })
            snackbar({ key: 'maison-task', message: `Task added — ${title}`, actionLabel: 'Open', onAction: () => doors.openTask(id) })   // the project's words (use-project-maison.ts)
            router.refresh()
            return true
          } catch (e) { snackbar({ message: couldnt('add the task', refusalOf(e)) }); return false }
        },
      }
    } })
    /* ── propose: a WhatsApp message drafted from the record — it opens on the press, the studio sends it ── */
    const whatsapp = (message: () => string): MaisonSuggestion => ({ label, propose: async (): Promise<MaisonProposal> => {
      const text = message()
      return {
        title: `WhatsApp ${first}`, text: `“${text}”`, confirm: 'Open WhatsApp',
        lines: ['It opens in WhatsApp with this message — change anything before you send it.'],
        run: async () => { window.open(waLink(lead.phone, text), '_blank', 'noopener'); return true },
      }
    } })
    const run = (fn: () => void): MaisonSuggestion => ({ label, run: fn })
    const answer = (a: () => MaisonAnswer | Promise<MaisonAnswer>): MaisonSuggestion => ({ label, answer: async () => a() })

    /* ── answer: what the record still lacks — the call script (New) and the scope risks (Met) ── */
    const gaps = (): MaisonRow[] => {
      const edit = { run: doors.edit }
      const rows: MaisonRow[] = []
      if (lead.budgetMinor <= 0) rows.push({ id: 'budget', label: 'Ask for a budget range', meta: 'Budget not stated', ...edit })
      else rows.push({ id: 'budget', label: `Confirm the ${briefBudget(lead.budgetMinor)} budget`, meta: 'Budget on record', ...edit })
      if (lead.keyCollection !== 'Collected') rows.push({ id: 'keys', label: 'Ask when the keys are collected', meta: `Key collection: ${lead.keyCollection ?? '--'}`, ...edit })
      if (lead.areaSqft == null) rows.push({ id: 'area', label: 'Ask for the floor area', meta: 'Area size not recorded', ...edit })
      if (!lead.condition) rows.push({ id: 'condition', label: 'Ask about the condition of the home', meta: 'Condition not recorded', ...edit })
      if (!lead.style) rows.push({ id: 'style', label: 'Ask which style they like', meta: 'Style not recorded', ...edit })
      for (const q of unanswered.slice(0, 3)) rows.push({ id: `q-${q.id}`, label: q.text, meta: 'Unanswered · Questionnaire', href: doors.tab('questionnaire') })
      return rows
    }

    /* (S44O — call C6, her UAT ask 2026-10-15) Marketing's lead page: a quote, a design or the project is the designer's — the button answers
       with the role's line in the card, never a door to a gate */
    if (desk && DESK_LABELS.includes(label)) return { label, answer: { title: 'The lead’s designer takes this one', text: ON_DESK } }
    switch (label) {
      /* runs — the page's own doors */
      case 'Open project': return run(doors.openProject)
      case 'Log the meeting': return run(doors.logMeeting)   // (S42E, E-11)
      case 'Set a follow-up reminder':
      case 'Set follow-up reminder': return run(doors.followUp)
      case 'Send questionnaire': return run(doors.ask)
      case 'Start quote from package':
      case 'Suggest a package': return run(doors.newQuote)
      case 'Prepare a revised quote':
      case 'Offer a revised package': return run(quote ? () => doors.openQuote(quote.id) : doors.newQuote)
      case 'Share moodboard': return run(doors.visualizer)

      /* proposals — a task */
      case 'Auto-schedule first meet': return task(`Book the first meet with ${first}`, () => dueIn(1), `A task to agree the first meeting with ${first} — it shows as the lead’s next follow-up.`)
      case 'Plan site visit': return task(`Site visit — ${lead.propertyAddress ?? pt}`, () => workday(dueIn(3)), `A task to visit the ${pt} with ${first}${lead.propertyAddress ? ` at ${lead.propertyAddress}` : ''}.`)
      case 'Schedule check-in': return task(`Check in with ${first}`, () => workday(dueIn(3)), `A task to check in with ${first} while the quote is prepared.`)
      case 'Schedule a call': return task(`Call ${first} about ${quote?.number ?? 'the quote'}`, () => workday(dueIn(1)), `A task to call ${first} and ask what would make the quote a yes.`)
      case 'Set a 6-month revisit': return task(`Revisit ${first}`, () => dueIn(0, 6), `A task six months from now to see whether ${first}’s plans have changed.`)
      case 'Remind me in a year': return task(`Check in with ${first}`, () => dueIn(0, 12), `A task a year from now to say hello — lost leads who part on good terms come back or refer friends.`)   // (pending modules S10) *(invented copy)*
      case 'Create project checklist': return task(`Prepare the project handover for ${first}`, () => workday(dueIn(2)), 'A task to confirm the milestone schedule and the site start date with the project team.')

      /* proposals — a WhatsApp message (pending modules S10: the words live in lib/maison-ai/drafts.ts — the Ask box drafts the same ones) */
      case 'Draft intro WhatsApp': return whatsapp(() => DRAFTS.intro(dl, me))
      case 'Draft follow-up WhatsApp': return whatsapp(() => DRAFTS.followUp(dl))
      case 'Propose meeting slots': return whatsapp(() => {
        const a = workday(dueIn(1)), b = workday(new Date(a.getTime() + 86_400_000))
        return DRAFTS.meetingSlots(dl, a, b)
      })
      case 'Send prep checklist': return whatsapp(() => DRAFTS.prepChecklist(dl))
      case 'Draft meeting recap': return whatsapp(() => DRAFTS.meetingRecap(dl))
      case 'Draft check-in message': return whatsapp(() => DRAFTS.checkIn(dl))
      case 'Offer a site walk-through': return whatsapp(() => DRAFTS.walkThrough(dl))
      case 'Draft kickoff message': return whatsapp(() => DRAFTS.kickoff(dl))
      /* (pending modules S14) with the studio's review link — or, with none, where to add it (lib/maison-ai/review-ask.ts) */
      case 'Ask for a review': return { label, propose: () => reviewAsk({ lead: dl, phone: lead.phone, first, done: false, here: here() }) }
      case 'Send referral offer': return whatsapp(() => DRAFTS.referral(dl))
      case 'Send a thank-you note': return whatsapp(() => DRAFTS.thankYou(dl))

      /* answers — from the lead's own records */
      case 'Build a call script': return answer(() => {
        const rows = gaps()
        return { title: `A call script for ${first}`, text: `From ${first}’s record — what to confirm, then what is still missing. Open one to fill it in.`, rows }
      })
      case 'Flag scope risks': return answer(() => {
        const rows = gaps().filter((r) => r.id !== 'budget' || lead.budgetMinor <= 0)
        return rows.length
          ? { title: rows.length === 1 ? '1 thing to check before the quote' : `${rows.length} things to check before the quote`, text: 'What the record doesn’t say yet — each can change the scope. Open one to fill it in.', rows }
          : { title: 'Nothing stands out', text: `${first}’s record has the budget, the keys, the area, the condition and the style, and every question is answered.` }
      })
      case 'Summarise call remarks': return answer(() => {
        const logs = (lead.stageData.logs ?? []).filter((l) => l.outcome || l.notes).slice(-4).reverse()
        if (!logs.length) return { title: 'No contact logged yet', text: `Log a call or a message with ${first} and its remarks show here.`, rows: [{ id: 'log', label: 'Log a contact', run: doors.contactLog }] }
        return {
          title: logs.length === 1 ? 'The last contact' : `The last ${logs.length} contacts`,
          text: 'Their outcome and remarks, newest first. Open one in Notes & Logs.',
          rows: logs.map((l, i) => {
            const at = l.when ? parseInputDateTime(l.when) : null
            return { id: `log-${i}`, label: [l.channel, l.outcome].filter(Boolean).join(' · ') || 'Contact', meta: [at ? displayDate(at) : null, l.notes || 'No remarks'].filter(Boolean).join(' — '), href: doors.tab('notes') }
          }),
        }
      })
      case 'Log loss reason': return answer(() => (parked?.stage === 'Lost' && parked.reason
        ? { title: 'Why it was lost', text: [parked.reason, parked.detail].filter(Boolean).join(' · '), rows: [{ id: 'activity', label: 'Open the activity', href: doors.tab('activity') }] }
        : { title: 'No reason recorded', text: 'The lead was marked lost without a reason on record.' }))

      /* answers — from the studio's records */
      /* (pending modules S10) a review: 2.0 keeps none — a finished home of the same type of the studio's own makes the same case */
      case 'Attach a client review': return answer(async () => {
        const r = await similarProjects(lead.id)
        if ('error' in r) return { title: 'Nothing to show', text: r.error }
        const done = r.rows.filter((p) => p.stage === 'completed')
        const list = done.length ? done : r.rows
        return list.length
          ? { title: `Your own ${r.propertyType} homes`, text: `OpenMaison keeps no client reviews yet — a ${r.propertyType} you finished makes the same case. Open one to pick its photos for ${first}.`,
              rows: list.map((p) => ({ id: p.id, label: p.name, meta: [p.number, isProjectStage(p.stage) ? STAGE_LABEL[p.stage] : null].filter(Boolean).join(' · '), href: withFrom(`/projects/${p.id}/updates`, here()) })) }
          : { title: 'No client reviews on record', text: `OpenMaison keeps no client reviews yet, and the studio has no ${r.propertyType} project to show. Once one is finished, it shows here.` }
      })
      case 'Pick a portfolio match':
      case 'Share a recent project': return answer(async () => {
        const r = await similarProjects(lead.id)
        if ('error' in r) return { title: 'Nothing to show', text: r.error }
        return r.rows.length
          ? { title: r.rows.length === 1 ? `1 ${r.propertyType} project` : `${r.rows.length} ${r.propertyType} projects`, text: 'Your studio’s own, finished ones first — open one to pick what to show.',
              rows: r.rows.map((p) => ({ id: p.id, label: p.name, meta: [p.number, isProjectStage(p.stage) ? STAGE_LABEL[p.stage] : null].filter(Boolean).join(' · '), href: withFrom(`/projects/${p.id}`, here()) })) }
          : { title: `No ${r.propertyType} projects yet`, text: 'Once a lead of this property type is won, its project shows here.' }
      })
      case 'Compare to past quotes': return answer(async () => {
        const r = await pastQuotes(lead.id)
        if ('error' in r) return { title: 'Nothing to show', text: r.error }
        if (!r.rows.length || r.medianMinor === null) return { title: `No past ${r.propertyType} quotes`, text: 'Quotes sent to clients on other leads of this property type show here.' }
        return {
          title: `${r.propertyType} quotes run about ${moneyCard(r.medianMinor)}`,
          text: `The middle of ${r.count === 1 ? '1 quote' : `${r.count} quotes`} sent to clients${lead.budgetMinor > 0 ? ` — this lead’s budget is ${moneyCard(lead.budgetMinor)}` : ''}. The newest:`,
          rows: r.rows.map((q) => ({ id: q.id, label: `${q.number} · ${q.client}`, meta: `${moneyCard(q.amountMinor)} · ${q.status}`, href: withFrom(`/quotes/${q.id}`, here()) })),
        }
      })
      case 'List optional trims': return answer(async () => {
        const r = await quoteTrims(lead.id)
        if ('error' in r) return { title: 'Nothing to show', text: r.error }
        if (!r.quote) return { title: 'No quote yet', text: `Create a quote for ${first} and its largest lines show here.`, rows: [{ id: 'new', label: 'Create a quote', run: doors.newQuote }] }
        const open = withFrom(`/quotes/${r.quote.id}`, here())
        const rows: MaisonRow[] = [
          ...r.largest.map((l) => ({ id: l.id, label: l.name, meta: `${moneyCard(l.amountMinor)} · one of the largest lines`, href: open })),
          ...r.optional.map((l) => ({ id: l.id, label: l.name, meta: `${moneyCard(l.amountMinor)} · already optional`, href: open })),
        ]
        return rows.length
          ? { title: `Where ${r.quote.number} could give`, text: 'Its largest lines, and the ones already marked optional — open the quote to trim or mark one.', rows }
          : { title: `${r.quote.number} has no priced lines yet`, rows: [{ id: 'open', label: `Open ${r.quote.number}`, href: open }] }
      })
      case 'Summarise the project': return answer(async () => {
        if (!project) return { title: 'No project yet', text: 'The project is made at the Won step.' }
        const [late, next] = await Promise.all([lateMilestones(project.id), nextStepTask(project.id)])
        const lateRows = 'error' in late ? [] : late.rows
        const stage = project.stage && isProjectStage(project.stage) ? STAGE_LABEL[project.stage] : null
        const base = `/projects/${project.id}`
        return {
          title: [project.number, stage].filter(Boolean).join(' · '),
          text: [lateRows.length ? `${lateRows.length === 1 ? '1 milestone is' : `${lateRows.length} milestones are`} running late.` : 'Nothing is running late.', 'error' in next ? null : `Next: ${next.title} — ${next.why}`].filter(Boolean).join(' '),
          rows: [
            ...lateRows.slice(0, 3).map((m) => ({ id: m.milestoneId, label: m.title, meta: `${m.days === 1 ? '1 day' : `${m.days} days`} late`, href: withFrom(`${base}/schedule?open=${encodeURIComponent(m.milestoneId)}`, here()) })),
            { id: 'project', label: `Open ${project.number}`, run: doors.openProject },
          ],
        }
      })
      default: return label   // nothing on record behind it — its words, and the house "Coming soon"
    }
  }, [lead, quote, unanswered, parked, project, team, doors, desk, router, snackbar])
}
