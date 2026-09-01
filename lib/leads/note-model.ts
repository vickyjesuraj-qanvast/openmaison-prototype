import type { LeadNote } from '@/lib/db/schema'
import { MSG } from '@/lib/forms'
import { NEXT_STEP_BY_OUTCOME } from '@/lib/leads/enums'
import { formatInputDateTime, parseInputDateTime } from '@/lib/format'

/* Lead Details › Notes (931-44865) — pure model shared by the list, the editors and the actions. */

export type NoteKind = 'note' | 'contact'
export type NoteFilter = 'all' | 'note' | 'contact'

/** Editor draft — dates as the app's d/m/yyyy, h:mmAM input strings (never typed, REG-119). */
export type NoteDraft = {
  kind: NoteKind
  title: string
  body: string
  channel: string | null
  when: string
  outcome: string
  nextStepWhen: string
  nextStepMode: string
}

export const emptyDraft = (kind: NoteKind): NoteDraft => ({ kind, title: '', body: '', channel: null, when: '', outcome: '', nextStepWhen: '', nextStepMode: '' })

export const draftFrom = (n: LeadNote): NoteDraft => ({
  kind: n.kind === 'contact' ? 'contact' : 'note',
  title: n.title, body: n.body, channel: n.channel,
  when: n.contactedAt ? formatInputDateTime(n.contactedAt) : '',
  outcome: n.outcome ?? '',
  nextStepWhen: n.nextStepAt ? formatInputDateTime(n.nextStepAt) : '',
  nextStepMode: n.nextStepMode ?? '',
})

export const nextStepFor = (outcome: string): string | undefined => NEXT_STEP_BY_OUTCOME[outcome]

/** Contact-log rules = the Move stage window's Contacted log (lib/leads/stage-data.ts validateStage), minus the mandatory screenshot. */
export function validateDraft(d: NoteDraft): Record<string, string> {
  const e: Record<string, string> = {}
  if (d.kind !== 'contact') return e
  if (!d.channel) e.channel = MSG.choose
  if (!d.when) e.when = MSG.required; else if (!parseInputDateTime(d.when)) e.when = MSG.dateTime
  if (!d.outcome) e.outcome = MSG.required
  if (nextStepFor(d.outcome)) {
    if (!d.nextStepWhen) e.nextStepWhen = MSG.required; else if (!parseInputDateTime(d.nextStepWhen)) e.nextStepWhen = MSG.dateTime
    if (!d.nextStepMode) e.nextStepMode = MSG.required
  }
  return e
}

/** What the list item shows (931:44895 / 931:45526): title "New" for a blank note, "Contact log" for logs; secondary = first body line / outcome / "No notes yet". */
export function listTitle(n: Pick<LeadNote, 'kind' | 'title'>): string {
  if (n.kind === 'contact') return 'Contact log'
  return n.title.trim() || 'New'
}
export function listSecondary(n: Pick<LeadNote, 'kind' | 'body' | 'outcome'>): string {
  const first = bodyText(n.body).split('\n').map((l) => l.trim()).find(Boolean)
  if (first) return first
  if (n.kind === 'contact' && n.outcome) return n.outcome
  return 'No notes yet'
}

/* ── Rich note bodies (REG-252) ─────────────────────────────────────────────────────────────────────
   The pane toolbar formats for real, so a body saved since is the editor's HTML; a body saved before
   is plain text. `bodyHtml` is what the editor loads, `bodyText` what previews print — never parse. */
export const isHtmlBody = (body: string) => body.includes('<')
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** The rich editor's content: HTML as saved; legacy plain text escaped, its newlines as <br>. */
export const bodyHtml = (body: string) => (isHtmlBody(body) ? body : escapeHtml(body).replace(/\n/g, '<br>'))
/** The body as plain lines, for the list's secondary text and anything else that prints a body. */
export function bodyText(body: string): string {
  if (!isHtmlBody(body)) return body
  return body
    .replace(/<(?:br|\/p|\/div|\/li)[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

export const filterNotes = <T extends LeadNote>(notes: T[], f: NoteFilter): T[] => (f === 'all' ? notes : notes.filter((n) => n.kind === f))
