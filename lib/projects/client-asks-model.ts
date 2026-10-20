/**
 * (simplify S-22, his "build everything" 2026-10-09) The client asks — pure and client-safe. Every client message, ticket and floor-plan mark
 * carries the same three actions (components/projects/threads/ask-menu.tsx): Reply · Make a task · Raise a variation order. The task's title
 * and the variation order's first line take the client's words; the task's description says where they came from ("From Benjamin’s message,
 * 7 Oct"), and the ask keeps its task and order — one each: a second press opens the one already made. The server half is
 * lib/projects/client-asks.ts; a floor-plan mark keeps its own columns (`floor_plan_marks.task_id · variation_id`).
 */
import { displayDate } from '@/lib/format'

/** Where a client's ask came from — a message in Messages, or a ticket. */
export type AskSource = 'message' | 'ticket'
/** What an ask has led to so far: its task and its variation order, each while it is still there. */
export type AskLinks = { task: { id: string; title: string; done: boolean } | null; vo: { id: string; number: string; status: string } | null }
export const NO_ASK: AskLinks = { task: null, vo: null }

/** A task's title (the house 120) and a variation order's line name (the editor's 120); its title (80, the floor plan's). */
export const ASK_TITLE_MAX = 120
export const ASK_VO_TITLE_MAX = 80

/** The client's words as one line, cut at a word when long — a task's title, a variation order's first line. */
export function askTitle(words: string, max = ASK_TITLE_MAX): string {
  const one = words.replace(/\s+/g, ' ').trim()
  if (one.length <= max) return one
  const cut = one.slice(0, max - 1)
  const at = cut.lastIndexOf(' ')
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).trimEnd()}…`
}

/** "From Benjamin’s message, 7 Oct ’26" · "From Benjamin’s ticket T-2026-004, 7 Oct ’26" — the link back, in the task's words. (invented copy) */
export function askSourceLine(o: { source: AskSource; client: string; at: number; number?: string | null }): string {
  const who = o.client.split(/\s+/)[0] || o.client
  return `From ${who}’s ${o.source === 'ticket' ? `ticket${o.number ? ` ${o.number}` : ''}` : 'message'}, ${displayDate(new Date(o.at))}`
}

/** The task's description: where it came from, then the client's words as they wrote them. */
export const askDescription = (line: string, words: string) => `${line}:\n“${words.trim()}”`

/** When the client wrote only photos — the task still says what to do. (invented copy) */
export const askFallbackTitle = (client: string, source: AskSource) => `Follow up ${client.split(/\s+/)[0] || client}’s ${source === 'ticket' ? 'ticket' : 'message'}`
