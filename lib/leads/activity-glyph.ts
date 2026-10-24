/*
 * (activity by date 2026-10-24 — his "group the activities by date and add type icons for the ones we have (Tasks · Files · Notes · Stage) to
 * represent what type of activity it is") The glyph a feed line wears on the timeline's rail, in the dot's place (REG-245's dot, replaced).
 * Pure — the Activity tab (a lead's, a project's), the Overview's Recent activity card and the project's Overview read the same answer.
 *
 * The four chips' kinds wear their kind's icon, the one each kind already wears elsewhere in the app:
 *   Tasks  → task_alt       the rail's Tasks, the dock, the Task quick link, the bell's task_assigned
 *   Files  → folder         a folder card, the client portal's Files tab, the feed's own folder lines
 *   Notes  → sticky_note_2  the Note quick link and the Notes & Logs tab's Notes chip — a contact log keeps its call_log (REG-278: one entity,
 *                           one mark everywhere — the Notes & Logs tab draws a log with it, so the feed does too)
 *   Stage  → swap_horiz     every stage move's line already, and the bell's stage_changed
 * Every other line (a quote, a contract, a question, a member added, a project's schedule or money line…) wears the icon its own event carries
 * (`ActivityEvent.icon`, lib/leads/activity.ts — "the others follow the tab icons", REG-191), so no row is left a bare dot.
 */

export type GlyphKind = 'tasks' | 'files' | 'notes' | 'stage'

export const KIND_GLYPH: Readonly<Record<GlyphKind, string>> = { tasks: 'task_alt', files: 'folder', notes: 'sticky_note_2', stage: 'swap_horiz' }

/** The contact log's own mark (REG-278), kept inside the Notes kind. */
export const CONTACT_LOG_GLYPH = 'call_log'

const isKind = (g: string | null | undefined): g is GlyphKind => g === 'tasks' || g === 'files' || g === 'notes' || g === 'stage'

/** The glyph for one line: its kind's icon when it belongs to one of the four chips, else the icon its event carries. */
export function activityGlyph(e: { icon: string; group?: string | null }): string {
  if (!isKind(e.group)) return e.icon
  if (e.group === 'notes' && e.icon === CONTACT_LOG_GLYPH) return CONTACT_LOG_GLYPH
  return KIND_GLYPH[e.group]
}
