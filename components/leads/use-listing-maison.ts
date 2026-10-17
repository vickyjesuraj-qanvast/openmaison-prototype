'use client'

import { useMemo } from 'react'
import { withFrom } from '@/lib/nav'
import { displayDate, displayDue, isOverdue } from '@/lib/format'
import { waLink } from '@/lib/portal/model'
import { DRAFTS } from '@/lib/maison-ai/drafts'
import type { MaisonAnswer, MaisonProposal, MaisonSuggestion } from '@/lib/maison-ai'
import type { LeadRow } from '@/lib/leads/queries'
import type { Member } from '@/lib/db/schema'

/**
 * (pending modules S05 — card held:leads, "Maison AI … acting on a lead") The listing's three suggestions act, from the listing's own rows (the
 * leads this member sees): the newest lead's intro on WhatsApp — drafted, opened on the press, the studio sends it (the lead page's own words,
 * lib/maison-ai/drafts.ts) —; this week's new leads; the leads to follow up today (a task due today or late, a New lead nobody has contacted).
 * Each row opens its lead with the way back. Nothing is metered. *(invented copy: the answers' titles and lines)*
 * (pending modules S10 — card held:maison-ai, "words-only suggestions … Qanvast Ops") One builder for the Leads listing and Qanvast Ops › Leads,
 * which had kept the same three as words.
 */
export function useListingMaison(o: { rows: LeadRow[]; newest: LeadRow | null; team: Member[] }): MaisonSuggestion[] {
  const { rows, newest, team } = o
  return useMemo((): MaisonSuggestion[] => {
    const me = team.find((m) => m.isYou)?.name.split(' ')[0] ?? null
    const open = (r: LeadRow) => withFrom(`/leads/${r.id}`, `${window.location.pathname}${window.location.search}`)
    const intro: MaisonSuggestion = newest
      ? { label: `Draft intro WhatsApp for ${newest.name}`, propose: async (): Promise<MaisonProposal> => {
          const first = newest.name.trim().split(/\s+/)[0] ?? newest.name
          const text = DRAFTS.intro({ name: newest.name, propertyType: newest.propertyType, stage: newest.stage }, me)
          return { title: `WhatsApp ${first}`, text: `“${text}”`, confirm: 'Open WhatsApp', lines: ['It opens in WhatsApp with this message — change anything before you send it.'],
                   run: async () => { window.open(waLink(newest.phone, text), '_blank', 'noopener'); return true } }
        } }
      : { label: 'Draft an intro WhatsApp', answer: { title: 'No lead to write to yet', text: 'Once a lead comes in, Maison AI drafts its first WhatsApp here.' } }
    const week: MaisonSuggestion = { label: 'Summarise this week’s new leads', answer: async (): Promise<MaisonAnswer> => {
      const since = Date.now() - 7 * 86_400_000
      const fresh = rows.filter((r) => r.createdAt.getTime() >= since).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      if (!fresh.length) return { title: 'No new leads this week', text: 'Leads that came in over the last 7 days show here.' }
      const unassigned = fresh.filter((r) => !r.assignees.length).length
      return { title: fresh.length === 1 ? '1 new lead this week' : `${fresh.length} new leads this week`,
               text: `The last 7 days, newest first${unassigned ? ` — ${unassigned === 1 ? '1 has' : `${unassigned} have`} no member yet` : ''}.`,
               rows: fresh.slice(0, 12).map((r) => ({ id: r.id, label: r.name, meta: [r.source, r.propertyType, r.stage, r.assignees.length ? r.assignees.map((m) => m.name).join(', ') : 'No member yet'].join(' · '), href: open(r) })) }
    } }
    const today: MaisonSuggestion = { label: 'Which leads need follow-up today?', answer: async (): Promise<MaisonAnswer> => {
      const end = new Date(); end.setHours(23, 59, 59, 999)
      const due = rows.flatMap((r) => { const t = r.tasks.filter((x) => !x.done && x.dueAt && x.dueAt.getTime() <= end.getTime()).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())[0]; return t ? [{ r, t }] : [] })
        .sort((a, b) => a.t.dueAt!.getTime() - b.t.dueAt!.getTime())
      const untouched = rows.filter((r) => r.stage === 'New' && !r.lastContact && !due.some((d) => d.r.id === r.id))
      if (!due.length && !untouched.length) return { title: 'Nobody needs a follow-up today', text: 'No task is due today or late, and every New lead has been contacted.' }
      return { title: `${due.length + untouched.length} ${due.length + untouched.length === 1 ? 'lead' : 'leads'} to follow up today`,
               text: 'The tasks due today or late first, then the New leads nobody has contacted yet.',
               rows: [
                 ...due.slice(0, 10).map(({ r, t }) => ({ id: `due-${r.id}`, label: r.name, meta: `${t.title} · ${isOverdue(t.dueAt, Date.now()) ? 'late' : 'due'} ${displayDue(t.dueAt!)}`, href: open(r) })),
                 ...untouched.slice(0, 10).map((r) => ({ id: `new-${r.id}`, label: r.name, meta: `New · no contact yet · came in ${displayDate(r.createdAt)}`, href: open(r) })),
               ] }
    } }
    return [intro, week, today]
  }, [newest, rows, team])
}
