import 'server-only'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees } from '@/lib/db/schema'
import { startOfDay, titleCaseName } from '@/lib/format'
import { worksOn } from '@/lib/projects/policy'
import { firstOf, idsOf } from '@/lib/meetings/model'
import { waitingQuotes } from '@/lib/maison-ai/answers/dock'
import { byWait, waitsOnClient } from '@/lib/maison-ai/remind'
import { moreAsksFor } from './model'
import { Q, dockChips, dockContexts, type DockData, type DockFacts } from './dock'
import type { DashCtx } from './context'

/*
 * (the Dashboard redesigned, 2026-10-26 — his marks P-01 · Q-03 · lane D4 owns this file) The docked field's three suggestions, written by
 * rule from today's records and the role (lib/dashboard/dock.ts `dockChips`): the member's next meeting today ("Prepare me for 2 PM with
 * Kelvin"), the quote that waits longest on its client and that they may remind ("Remind Ryan about VO-2" — lib/maison-ai/remind.ts, the
 * Needs you signal's own rule), the books for whoever reads them ("How is cash this month?"), then what the role reaches for — and each card's
 * context. Studio / Mine (Q-07) holds: Mine reminds only about the member's own leads. Each question is one Maison AI answers from the records.
 */

/** "2 PM" · "2:30 PM" — on the clock every other page reads a meeting by (lib/format `displayTime`, the meeting page, Your day), so the
    suggestion and the agenda row never disagree; today is the house's today (`startOfDay`). */
const timeWords = (t: number) => {
  const d = new Date(t), h = d.getHours(), m = d.getMinutes()
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}
const studioDay = (t: number) => startOfDay(new Date(t))

export async function fetchDock(ctx: DashCtx): Promise<DockData> {
  const mine = await ctx.read.meetings()
  const ahead = mine.filter(({ m }) => m.status === 'planned' && m.startsAt.getTime() >= ctx.now - 30 * 60_000 && (idsOf(m.memberIds).includes(ctx.viewer.id) || m.createdBy === ctx.viewer.id))
    .sort((a, b) => a.m.startsAt.getTime() - b.m.startsAt.getTime())
  const today = ahead.find(({ m }) => studioDay(m.startsAt.getTime()) === studioDay(ctx.now))
  let waiting: DockFacts['waiting'] = null
  if (ctx.workspace) {
    const list = await waitingQuotes(ctx).catch(() => [])
    const team = list.length ? await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, [...new Set(list.map((q) => q.leadId))])) : []
    const teamOf = (leadId: string) => team.filter((t) => t.leadId === leadId).map((t) => t.memberId)
    const may = list.filter((q) => worksOn(ctx.viewer, teamOf(q.leadId)) && (ctx.scope !== 'mine' || teamOf(q.leadId).includes(ctx.viewer.id)) && waitsOnClient(q, ctx.now)).sort(byWait)
    const q = may[0]
    if (q) waiting = { first: firstOf(q.name), number: q.number }
  }
  const facts: DockFacts = {
    role: ctx.role, books: ctx.books, workspace: ctx.workspace, meetingAhead: ahead.length > 0, waiting,
    meetingToday: today ? { time: timeWords(today.m.startsAt.getTime()), first: firstOf(titleCaseName(today.leadName)) } : null,
  }
  const chips = dockChips(facts)
  const contexts = dockContexts(facts)
  const asks = [...new Set([...chips.map((c) => c.ask), ...contexts.flatMap((c) => c.asks), Q.missed, ...moreAsksFor(ctx.role, { setupOpen: false })])]
  return { chips, contexts, asks, tools: ctx.workspace }
}
