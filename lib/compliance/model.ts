/**
 * (gaps build I, I-Q8 · I-Q9 · I-Q10 · I-Q11) The rules that read Singapore's compliance checklist (`./sg-checklist.ts`) — pure and client-safe.
 *
 * A project's list is picked by its property kind, from 2.0's fixed property types (never 1.0's free-text guess, F-285): an HDB or BTO flat →
 * HDB; an executive condo, a condo or a penthouse → Condo; a landed home → Landed. Commercial and Others have no list. Each item is To do,
 * Done or Not needed; the tab opens on the project's own phase (Setting up → Design, In progress → Execution, Completed → Handover) and every
 * phase stays one press away (F-302: 1.0's mapping showed every phase at once on a live project).
 */
import { COMPLIANCE_CATEGORIES, SG_COMPLIANCE, type ComplianceItem, type ComplianceKind, type CompliancePhase } from './sg-checklist'

export type { ComplianceItem, ComplianceKind, CompliancePhase } from './sg-checklist'

export const KIND_LABEL: Record<ComplianceKind, string> = { hdb: 'HDB flat', condo: 'Condo', landed: 'Landed home' }
export const COMPLIANCE_PHASES: readonly { key: CompliancePhase; label: string; help: string }[] = [
  { key: 'design', label: 'Design', help: 'Permits, approvals and who to engage — before works start' },
  { key: 'execution', label: 'Execution', help: 'While the works run on site' },
  { key: 'handover', label: 'Handover', help: 'Checks, certificates and records at the end' },
]
export const phaseLabel = (p: CompliancePhase) => COMPLIANCE_PHASES.find((x) => x.key === p)?.label ?? p
export const isCompliancePhase = (v: unknown): v is CompliancePhase => typeof v === 'string' && COMPLIANCE_PHASES.some((p) => p.key === v)

/** The kind of home a property type is, for the checklist — null when no list covers it (commercial, others). */
export function complianceKindOf(propertyType: string | null | undefined): ComplianceKind | null {
  const p = (propertyType ?? '').trim().toLowerCase()
  if (p.startsWith('hdb') || p.startsWith('bto')) return 'hdb'
  if (p.includes('condo') || p.startsWith('penthouse')) return 'condo'
  if (p.startsWith('landed')) return 'landed'
  return null
}

/** The phase a project is in: its stage, read as the checklist's. */
export const phaseOfStage = (stage: string): CompliancePhase => (stage === 'completed' ? 'handover' : stage === 'in_progress' ? 'execution' : 'design')

/** The items for a kind of home, in the list's order. */
export const itemsFor = (kind: ComplianceKind | null): ComplianceItem[] => (kind ? SG_COMPLIANCE.filter((i) => i.kinds.includes(kind)) : [])
export const itemById = (id: string): ComplianceItem | null => SG_COMPLIANCE.find((i) => i.id === id) ?? null

/** (I-Q11, F-299) A new project's starter tasks: the items the list flags for a task, for its kind of home, in order — ten at most. */
export const STARTER_MAX = 10
export const starterItems = (kind: ComplianceKind | null): ComplianceItem[] => itemsFor(kind).filter((i) => i.task).slice(0, STARTER_MAX)

export const COMPLIANCE_STATES = ['todo', 'done', 'not_needed'] as const
export type ComplianceState = (typeof COMPLIANCE_STATES)[number]
export const isComplianceState = (v: unknown): v is ComplianceState => typeof v === 'string' && (COMPLIANCE_STATES as readonly string[]).includes(v)
export const STATE_LABEL: Record<ComplianceState, string> = { todo: 'To do', done: 'Done', not_needed: 'Not needed' }

/** One item's answer as a page shows it. */
export type ComplianceAnswer = { state: Exclude<ComplianceState, 'todo'>; by: string | null; at: number }
/** The starter task tied to an item. */
export type ComplianceTask = { id: string; done: boolean }

export const categoryLabel = (key: string) => COMPLIANCE_CATEGORIES[key]?.label ?? key

/** A phase's items grouped by category, in the list's order. */
export function groupByCategory(items: ComplianceItem[]): { key: string; label: string; help: string; items: ComplianceItem[] }[] {
  const out: { key: string; label: string; help: string; items: ComplianceItem[] }[] = []
  for (const i of items) {
    let g = out.find((x) => x.key === i.category)
    if (!g) { g = { key: i.category, label: categoryLabel(i.category), help: COMPLIANCE_CATEGORIES[i.category]?.help ?? '', items: [] }; out.push(g) }
    g.items.push(i)
  }
  return out
}

/** A phase's tally — what the chips, the progress line and the tab's count read. Done and Not needed both count as answered. */
export function tallyOf(items: ComplianceItem[], answers: Record<string, ComplianceAnswer | undefined>) {
  const answered = items.filter((i) => answers[i.id]).length
  const mandatoryOpen = items.filter((i) => i.level === 'mandatory' && !answers[i.id]).length
  return { total: items.length, answered, open: items.length - answered, mandatoryOpen, done: items.filter((i) => answers[i.id]?.state === 'done').length }
}

/** The words a change says, as the snackbar and Activity read them. */
export const stateSentence = (title: string, s: ComplianceState) => (s === 'done' ? `“${title}” marked done` : s === 'not_needed' ? `“${title}” marked not needed` : `“${title}” is to do again`)
