/*
 * (the Dashboard redesigned, 2026-10-26 — his marks on https://claude.ai/artifact/5d1yTNS7mtU47teLjeP2WY: P-02 · P-11 · Q-06 · Q-07 · P-14's
 * clock) The page's frame, pure and client-safe: which cards a role's page holds and in what order, the member's own page (the cards they hid,
 * an Owner's or Admin's Studio / Mine), and the greeting by the studio's clock. The contract between the build's lanes:
 * design-source/context/dashboard-redesign-2026-10-26/brief.md.
 */
import { isAccounting, isMarketing, runsStudio } from '@/lib/settings/roles'

/** The page's cards. `pulse` = the strip of figures under the greeting; `needs` = Needs you; the rest the cards of the grid. */
export const DASH_CARDS = ['pulse', 'needs', 'day', 'pipeline', 'projects', 'team', 'site'] as const
export type DashCardKey = (typeof DASH_CARDS)[number]
/** The cards a member may hide for themselves (his Q-06) — Needs you is the page's reason and never hides. */
export const HIDEABLE: readonly DashCardKey[] = ['pulse', 'day', 'pipeline', 'projects', 'team', 'site']

export type DashScope = 'studio' | 'mine'
/** (the calm UI build 2026-10-27 — the audit's 1-16) The scope's words: "Whole studio" · "Just me" (was "Studio" · "Mine" — "Studio" also named
    the tasks on no lead and the all-hands chat). The keys and `?scope=mine` stay. */
export const SCOPE_WORD: Record<DashScope, string> = { studio: 'Whole studio', mine: 'Just me' }
/** A member's own page, kept on their record (`members.dashboard_prefs`). */
export type DashPrefs = { hidden: DashCardKey[]; scope: DashScope | null }
export const EMPTY_PREFS: DashPrefs = { hidden: [], scope: null }

export function parsePrefs(raw: string | null): DashPrefs {
  if (!raw) return EMPTY_PREFS
  try {
    const v = JSON.parse(raw) as Partial<DashPrefs>
    const hidden = Array.isArray(v.hidden) ? v.hidden.filter((k): k is DashCardKey => (HIDEABLE as readonly string[]).includes(k)) : []
    const scope = v.scope === 'studio' || v.scope === 'mine' ? v.scope : null
    return { hidden: [...new Set(hidden)], scope }
  } catch { return EMPTY_PREFS }
}

/** Who has the Studio / Mine switch (his Q-07): the studio's runners — every other role's page is already their own reach. */
export const switchesScope = (role: string | null | undefined) => runsStudio(role)
/** The page's scope: the address's `?scope=`, else the member's remembered one, else Studio. Only a runner reads Mine. */
export function scopeFor(role: string | null | undefined, param: string | null, prefs: DashPrefs): DashScope {
  if (!switchesScope(role)) return 'studio'
  if (param === 'mine' || param === 'studio') return param
  return prefs.scope ?? 'studio'
}

/** The cards a role's page holds, in reading order (his P-11 · the Roles table on the review page). Accounting's page is its money (Q-08). */
export function cardsFor(role: string | null | undefined): DashCardKey[] {
  if (isAccounting(role)) return ['pulse', 'needs', 'day']
  if (isMarketing(role)) return ['pulse', 'needs', 'day', 'pipeline']
  if (runsStudio(role) || role === 'Manager') return ['pulse', 'needs', 'day', 'pipeline', 'projects', 'team', 'site']
  return ['pulse', 'needs', 'day', 'projects', 'site']   // a Designer: their own leads and projects
}

/** The studio's clock (P-14: the greeting read the server's, so a server on UTC said "Good morning" at 3 PM in Singapore). */
export const STUDIO_TZ = 'Asia/Singapore'
export function studioHour(now: number, tz = STUDIO_TZ): number {
  const h = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(new Date(now))
  return Number(h) % 24
}
/** "Good morning" · "Good afternoon" · "Good evening" — 1.0's greeting (chat-first-home.tsx `getGreeting`), by the studio's clock. */
export const greetingAt = (now: number, tz = STUDIO_TZ) => { const h = studioHour(now, tz); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

/** Each card's name as the page says it — its head, its ⋮ › Hide this card's snackbar, the page's Show hidden cards (Q-06). Invented copy
    beside the drawing's heads (Pulse has no head; it is named for the menu alone). (the calm pass 2026-10-26 — the Claude Design option he took)
    Team is "Team load", the option's own head: what the card shows is each member's load against what they can carry. */
export const CARD_LABEL: Record<DashCardKey, string> = { pulse: 'Key numbers', needs: 'Needs your attention', day: 'Your day', pipeline: 'Pipeline', projects: 'Projects', team: 'Team workload', site: 'Site photos' }
/* (the calm UI build 2026-10-27 — the audit's T-01 · 1-02 · 1-17 · 1-33 · 1-35) "Needs your attention" (was "Needs you"), "Key numbers" (was
   "Pulse" — the strip's name in the page's ⋮), "Team workload" (was "Team load"), "Site photos" (was "On site"). The keys stay. */

/** "Monday 26 October" — the day by the studio's clock. */
export const studioDate = (now: number, tz = STUDIO_TZ) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }).format(new Date(now)).replace(',', '')

/** (the calm pass 2026-10-26) What needs you, as the greeting's line says it in ink (invented copy): "51 things need you" · "1 thing needs you" ·
    "Nothing waits on you" (the project card's words). */
export const needWords = (n: number): string => (n ? `${n} ${n === 1 ? 'needs' : 'need'} your attention` : 'You’re all caught up')
/* (the calm UI build 2026-10-27 — the audit's T-01 · 1-02) one vocabulary: "n need your attention" in a sentence, "You’re all caught up" when
   nothing waits (was "51 things need you" · "Nothing waits on you"). The greeting no longer says it (1-18) — the card's head carries the count. */

/**
 * (P-02; the calm pass 2026-10-26 — his "too busy … simplify" and the Claude Design option he took) The greeting's line as one sentence
 * (invented copy): the day and what is new since the mark — "Monday 26 October · 4 new since Friday". (the calm UI build 2026-10-27 — the
 * audit's 1-18, T-04 say each thing once) The count of what needs you left the line: it was said three times (the line, the card's head, its
 * Show all) — it lives once, in the card's head. The page draws it in parts (components/dashboard/frame/greeting.tsx: the news as the line's
 * one link, which this browser's pressed news leaves out); this is its plain form for whatever reads the page's words without it.
 */
export function greetingLine(o: { now: number; needs: number; fresh: number; sinceWords: string | null; tz?: string; tied?: number }): string {
  const when = o.sinceWords ?? ''
  const tail = o.fresh > 0 && when ? ` · ${o.fresh} new ${when}` : ''
  return `${studioDate(o.now, o.tz)}${tail}`
}
