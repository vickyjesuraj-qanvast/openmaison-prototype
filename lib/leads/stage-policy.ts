import { STAGES, type Stage } from '@/lib/leads/enums'
import type { LeadRow } from '@/lib/leads/queries'
import type { StageMovement } from '@/lib/settings/types'

/**
 * Stage movement policy (Settings › Leads, REG-111 … REG-132) as pure helpers, shared by the listing and the
 * Lead Details pages so both surfaces gate stages identically (checklist › Parity sweep).
 */
export type ActiveStage = (typeof STAGES)[number]
export const isActiveStage = (s: string): s is ActiveStage => (STAGES as readonly string[]).includes(s)

/** Where a lead's journey continues from — On Hold / Lost leads resume at the stage they left. */
export const journeyIdx = (lead: Pick<LeadRow, 'stage' | 'resumeStage'>) =>
  STAGES.indexOf((isActiveStage(lead.stage) ? lead.stage : lead.resumeStage ?? '') as ActiveStage)

/** Why `stage` can't be chosen for `lead` right now (null = allowed). Doubles as the tooltip / snackbar copy. */
export function blockedReason(lead: Pick<LeadRow, 'stage' | 'resumeStage' | 'assignees'>, stage: Stage, mode: StageMovement): string | null {
  // New is not complete without an owner: nothing moves past New until at least one member is assigned (REG-130), in both policies.
  if (isActiveStage(stage) && stage !== 'New' && lead.assignees.length === 0) return 'Assign a member first'
  // A LOST lead cannot jump to a stage it never reached: it is over, and the way back is to resume where it stopped
  // (user 2026-08-31 — "once the lead is lost then why we need to enable the not completed milestones"). On Hold is a
  // pause, not an end, so it keeps resuming anywhere. Stages the lead did reach stay open, which is the way back.
  if (lead.stage === 'Lost' && isActiveStage(stage) && STAGES.indexOf(stage) > journeyIdx(lead)) {
    const resumeAt = STAGES[journeyIdx(lead)]
    return resumeAt ? `Resume at ${resumeAt} first` : 'This lead is lost'
  }
  if (!isActiveStage(lead.stage)) return null   // a parked lead may resume at any stage (with a confirm)
  if (mode !== 'linear' || !isActiveStage(stage)) return null
  const from = journeyIdx(lead)
  if (STAGES.indexOf(stage) <= from + 1) return null
  return `Complete ${STAGES[from + 1]} first`
}

/* ── The stage-movement dispatch, once (REG-286) ───────────────────────────────────────────────────────────
   `requestStageChange` used to be written twice — once in app/leads/workspace.tsx (listing table + kanban) and
   once in app/leads/[id]/overview.tsx (Lead Details pill / stages card / quick links) — and the copies had
   already drifted (the audit found the Details copy dropping a failed flexible move on the floor: no snackbar,
   no change). The BRANCH SET is the product rule (REG-111 … REG-132), so it lives here as one pure decision and
   each surface only maps the intent onto its own dialogs, snackbar and (on the listing) the held kanban drop.
   Order matters and is the register's: already there → On Hold → Lost → parked resume → completed stage →
   linear gate → Won → flexible quick move. */
export type StageIntent =
  /** The lead is already in that stage — nothing to do. */
  | { kind: 'none' }
  /** On Hold / Lost keep their compact dialogs (REG-111). */
  | { kind: 'hold' }
  | { kind: 'lost' }
  /** The gate refuses this stage; `message` is the snackbar copy (same string the dropdown shows as a tooltip). */
  | { kind: 'blocked'; message: string }
  /** A parked lead resuming: the "Resume at X?" confirm, then a quick move. */
  | { kind: 'confirm-resume'; stage: Stage }
  /** The Move stage window: the next stage in linear, Won always (it creates the project), a completed stage read-only. */
  | { kind: 'wizard'; stage: Stage }
  /** Flexible: move now, Undo in the snackbar. */
  | { kind: 'quick'; stage: Stage }

/** What choosing `stage` for `lead` means right now. Pure — the caller owns the dialogs and the snackbar. */
export function stageIntent(
  lead: Pick<LeadRow, 'stage' | 'resumeStage' | 'assignees'>,
  stage: Stage,
  mode: StageMovement,
): StageIntent {
  if (lead.stage === stage) return { kind: 'none' }
  if (stage === 'On Hold') return { kind: 'hold' }
  if (stage === 'Lost') return { kind: 'lost' }
  const from = journeyIdx(lead), to = STAGES.indexOf(stage as ActiveStage)
  // A parked lead (On Hold / Lost) resuming really changes where it is — one confirm, any stage the gate allows.
  // That gate is what keeps a Lost lead's un-reached stages shut (REG-225); active leads keep their path below.
  if (!isActiveStage(lead.stage)) {
    const parkedBlock = blockedReason(lead, stage, mode)
    return parkedBlock ? { kind: 'blocked', message: parkedBlock } : { kind: 'confirm-resume', stage }
  }
  // A completed stage is never "moved back to" (user 2026-08-29): it opens for viewing in the window, Edit lives inside.
  if (to <= from) return { kind: 'wizard', stage }
  if (mode === 'linear') {
    if (to === from + 1) return { kind: 'wizard', stage }
    return { kind: 'blocked', message: blockedReason(lead, stage, mode) ?? `Complete ${STAGES[from + 1]} first` }
  }
  if (stage === 'Won') return { kind: 'wizard', stage }
  return { kind: 'quick', stage }
}

/** A stage the lead has already passed (never a drop target — REG-132). */
/**
 * Return Lead (931:49039) is offered to Qanvast-sourced leads only (REG-139) and not while a return is processing or already
 * approved — a rejected one may be returned again. Shared by the overview kebab, the listing row / kanban menus and `returnLead`.
 */
export const canReturnLead = (lead: { source: string; returnStatus: string | null | undefined }) =>
  lead.source === 'Qanvast' && lead.returnStatus !== 'processing' && lead.returnStatus !== 'approved'

export const isCompletedFor = (lead: Pick<LeadRow, 'stage' | 'resumeStage'>, stage: Stage) =>
  isActiveStage(lead.stage) && isActiveStage(stage) && STAGES.indexOf(stage) <= journeyIdx(lead)

/** Lead Details tabs (858:24784) — Overview is the lead's home; the rest arrive with their own mocks. */
export const DETAIL_TABS = [
  { label: 'Overview', slug: '' },
  { label: 'Tasks', slug: 'tasks' },
  { label: 'Quotes', slug: 'quotes' },
  { label: 'Contracts', slug: 'contracts' },
  { label: 'Files', slug: 'files' },
  { label: 'Notes', slug: 'notes' },
  { label: 'Meetings', slug: 'meetings' },
  { label: 'Questionnaire', slug: 'questionnaire' },
  { label: 'Activity', slug: 'activity' },
] as const
export type DetailTabSlug = (typeof DETAIL_TABS)[number]['slug']
export const detailHref = (leadId: string, slug: DetailTabSlug = '') => (slug ? `/leads/${leadId}/${slug}` : `/leads/${leadId}`)
