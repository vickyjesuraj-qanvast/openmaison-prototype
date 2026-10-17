import type { PassKind } from './model'
import { costOf } from '../credits/schedule'

/*
 * (pending modules S20 — card held:ai-visualizer, "Drift guard (check and repair; Drift repair priced at 2 credits) — held as recommended
 * ('not needed') · revisit for production: a real model drifts") The render drift guard, 1.0's `src/lib/render-drift.ts` +
 * `src/lib/visualizer/drift-guard.ts` in 2.0's words. Pure and client-safe.
 *
 * 1.0's job: after a render lands, look for what is objectively WRONG with it against the photo it came from — a wall or a window that
 * moved, the camera that shifted, a door blocked, a piece floating or cutting through, the wrong size, out of reach, something kept that
 * changed (never taste: a colour, a style, a mood is the point) — and, when a fault would embarrass the studio in front of a client, spend
 * one corrective pass (1.0's port: `maxRepairAttempts = 1`), re-check it, and keep whichever reads better, so a repair never makes the
 * render worse. Every failure is non-fatal: the studio already paid for the render. A repair is its own charge — `render_repair`, 2 AI
 * credits, one per version repaired (1.0's credits line: `drift-fix` charges it under its own ref and gives it back when no picture comes).
 *
 * 2.0 has no image model (the house rule: nothing calls one), so the check is made by rule where a rule can see the fault: **the camera**.
 * A render whose lines sit zoomed or slid against the photo's (1.0's own finished kitchen look in Scandinavian is one: about 4% further
 * back) is read by its edges (`engine/drift.ts` `readFraming`), and the repair lines it up again — the corrective pass for that fault.
 * The other five kinds need eyes a rule doesn't have: they are the model's to report (`coerceDriftReport` is 1.0's reader for its JSON),
 * through the same report, the same scoring and the same words.
 */

/** 1.0's six kinds of fault. */
export type DriftCategory = 'structure' | 'opening' | 'physics' | 'scale' | 'access' | 'scope'
/** blocking — never show this to a client; warning — worth a look, not fatal. */
export type DriftSeverity = 'blocking' | 'warning'
export type DriftViolation = { category: DriftCategory; severity: DriftSeverity
  /** what is wrong — "camera", "desk" */ object: string
  /** where — "the whole picture", "left wall, in front of the door" */ location: string
  /** one sentence on it */ detail: string }
export type DriftReport = { violations: DriftViolation[]
  /** who read it: the rule (the prototype's), or the image model (the developers') */ by: 'rule' | 'model' }

export const DRIFT_CATEGORIES: DriftCategory[] = ['structure', 'opening', 'physics', 'scale', 'access', 'scope']
/** 1.0's labels ("Structure moved", "Opening blocked"…) in 2.0's plain words. */
export const DRIFT_LABEL: Record<DriftCategory, string> = {
  structure: 'The room or the camera moved',
  opening: 'A door or a walkway is blocked',
  physics: 'Something floats or cuts through',
  scale: 'Something is the wrong size',
  access: 'Something is out of reach',
  scope: 'Something you kept changed',
}
export const EMPTY_DRIFT: DriftReport = { violations: [], by: 'rule' }

/** The passes the guard checks — 1.0's guarded passes (the whole-room restyle, the style transfer, Auto furnish) and its port's edit, with
    a note (which can restyle). A relight, Empty the room and Render from sketch keep the room by their own making (a grade, the room's empty
    plate, a sketch turned into a new picture on purpose). */
export const DRIFT_GUARDED: readonly PassKind[] = ['edit', 'restyle', 'transfer', 'furnish', 'note']

/** Only a blocking fault is worth a corrective pass (1.0). */
export const blockingViolations = (r: DriftReport | null | undefined) => (r?.violations ?? []).filter((v) => v.severity === 'blocking')
export const hasBlockingDrift = (r: DriftReport | null | undefined) => blockingViolations(r).length > 0
/** Lower is better; a blocking fault weighs ten warnings, so a "fix" that trades one for three warnings still wins (1.0). */
export const driftScore = (r: DriftReport | null | undefined) => (r?.violations ?? []).reduce((n, v) => n + (v.severity === 'blocking' ? 10 : 1), 0)

/** One line for a version's note: "No faults found", "The room or the camera moved: camera", "2 faults to check". */
export function summariseDrift(r: DriftReport): string {
  const b = blockingViolations(r)
  if (!b.length) return r.violations.length ? `${r.violations.length} small ${r.violations.length === 1 ? 'thing' : 'things'} to check` : 'No faults found'
  return b.length === 1 ? `${DRIFT_LABEL[b[0]!.category]}: ${b[0]!.object}` : `${b.length} faults to check`
}

/** (the developers' seam) 1.0's reader for a model's answer — never throws; a moved building or a blocked door is always blocking. */
export function coerceDriftReport(raw: unknown): DriftReport {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const list = Array.isArray(o.violations) ? o.violations : []
  const violations = list.map((x): DriftViolation | null => {
    const e = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
    const category = typeof e.category === 'string' && (DRIFT_CATEGORIES as string[]).includes(e.category) ? (e.category as DriftCategory) : null
    const object = typeof e.object === 'string' ? e.object.trim() : '', detail = typeof e.detail === 'string' ? e.detail.trim() : ''
    if (!category || (!object && !detail)) return null
    const severity: DriftSeverity = category === 'structure' || category === 'opening' ? 'blocking' : e.severity === 'warning' ? 'warning' : 'blocking'
    return { category, severity, object, location: typeof e.location === 'string' ? e.location.trim() : '', detail }
  }).filter((v): v is DriftViolation => v !== null).slice(0, 6)
  return { violations, by: 'model' }
}

/* ── what a version says about its check (the studio's view: Present; the client's lists stay plain) ── */
/** A version the guard lined up again — kept on its `applied.repair`, with what it cost (the ledger's own charge, 0 when none was taken). */
export type DriftRepair = { words: string; credits: number }
export const REPAIRED_WORDS = 'The camera had moved from your photo — lined up again'
/** The fault stayed: the repair couldn't be paid for. */
export const UNPAID_WORDS = `The camera moved from your photo — lining it up needs ${costOf('render_repair')} AI credits`
/** The fault stayed: the repair didn't read better than the render (it is kept as it came). */
export const UNREPAIRED_WORDS = 'The camera moved from your photo — check it before you show it'

/** A repair's charge: its own ref per version (1.0's port: `viz:<room>:<run>:repair:<n>`), so a retry can't charge twice. */
export const repairRef = (jobId: string, variant: number) => `repair:${jobId}:${variant}`
