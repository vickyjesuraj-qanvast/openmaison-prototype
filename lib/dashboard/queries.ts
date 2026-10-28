import 'server-only'
import { seesProfit } from '@/lib/settings/cost-visibility'
import { dashboardContext } from './context'
import { HIDEABLE, cardsFor, greetingAt, greetingLine, switchesScope } from './frame'
import { shapeFor, type DashboardData } from './model'
import { fetchSince } from './since-queries'
import { fetchPulse } from './pulse-queries'
import { fetchInbox } from './inbox-queries'
import { fetchDay, fetchPipeline, fetchProjectsHealth, fetchSite, fetchTeam } from './cards-queries'
import { fetchDock } from './dock-queries'

export { myOpenTasks } from './tasks-queries'   // (S42 audit A-16) the app shell's ghost seed reads it from here

/*
 * (the Dashboard redesigned, 2026-10-26 — lane D1 owns this file) **The page as the signed-in member reads it**: the context (every module's
 * records, each read once — lib/dashboard/context.ts), then each part through its own reader, side by side; a card this role's page doesn't
 * hold, or the member hid, is never read (P-14: the page reads only what it shows). Nothing is written here — the visit's mark moves from the
 * page once it has drawn (app/dashboard/frame-actions.ts `markDashboardVisit`).
 */
export async function fetchDashboard(scopeParam?: string | null): Promise<DashboardData> {
  const ctx = await dashboardContext(scopeParam)
  const all = cardsFor(ctx.role)
  const hidden = ctx.prefs.hidden.filter((k) => all.includes(k) && HIDEABLE.includes(k))
  const cards = all.filter((k) => !hidden.includes(k))
  const has = (k: (typeof cards)[number]) => cards.includes(k)
  const [since, pulse, needs, day, pipeline, projects, team, site, dock] = await Promise.all([
    fetchSince(ctx).catch(() => null),
    has('pulse') ? fetchPulse(ctx).catch(() => null) : null,
    fetchInbox(ctx).catch(() => ({ rows: [], cleared: 0, groups: [{ key: 'all' as const, label: 'All', count: 0 }], snoozed: 0 })),
    has('day') ? fetchDay(ctx).catch(() => null) : null,
    has('pipeline') ? fetchPipeline(ctx).catch(() => null) : null,
    has('projects') ? fetchProjectsHealth(ctx).catch(() => null) : null,
    has('team') ? fetchTeam(ctx).catch(() => null) : null,
    has('site') ? fetchSite(ctx).catch(() => null) : null,
    fetchDock(ctx).catch(() => ({ chips: [], contexts: [], asks: [] })),
  ])
  /* (P-02) "15 things need you, 3 of them since Friday": the fresh Since chips that stand for a row still in Needs you */
  const keys = needs.rows.map((r) => r.key)
  const tied = (since?.chips ?? []).filter((c) => c.fresh && c.rowKey && keys.some((k) => k === c.rowKey || k.includes(c.rowKey!))).length
  return {
    viewer: { id: ctx.viewer.id, first: ctx.first, role: ctx.role }, now: ctx.now, today: ctx.today,
    scope: ctx.scope, canSwitchScope: switchesScope(ctx.role), cards, hidden,
    greeting: { title: `${greetingAt(ctx.now)}, ${ctx.first}`, line: greetingLine({ now: ctx.now, needs: needs.rows.length, tied, fresh: since?.fresh ?? 0, sinceWords: since?.sinceWords ?? null }) },
    since, pulse, needs, day, pipeline, projects, team, site, dock,
    shape: shapeFor(ctx.role, { updates: !!site, article: false, costs: seesProfit(ctx.viewer) }),
  }
}
