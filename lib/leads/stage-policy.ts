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
  /** A parked lead resuming: the "Resume at X?" confirm, then a quick move — or, `step` (UX audit 2026-09-30, L1), the Move stage
      window at that stage: a resume into a Quote Sent or Won the lead never reached runs that step's checks and fields. */
  | { kind: 'confirm-resume'; stage: Stage; step: boolean }
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
    return parkedBlock ? { kind: 'blocked', message: parkedBlock } : { kind: 'confirm-resume', stage, step: resumeNeedsStep(lead, stage) }
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

/**
 * (UX audit 2026-09-30, L1 — supersedes the silent half of REG-132) Parking was a way round every mandatory field: an On Hold lead
 * that had only reached Met resumed straight at Won, with no Won step, no signed quote and no project. Resuming anywhere stays
 * (REG-132), but a resume into Quote Sent or Won that the lead never reached opens that step in the Move stage window after the
 * "Resume at X?" confirm. Resuming at the stage it left — or any stage it already passed — stays a quick resume.
 */
export function resumeNeedsStep(lead: Pick<LeadRow, 'stage' | 'resumeStage'>, stage: Stage): boolean {
  if (stage !== 'Quote Sent' && stage !== 'Won') return false
  return STAGES.indexOf(stage) > journeyIdx(lead)
}

/** The stage an active lead moves into next (null at Won, or for a parked lead — it resumes instead). */
export function nextStageOf(lead: Pick<LeadRow, 'stage' | 'resumeStage'>): ActiveStage | null {
  if (!isActiveStage(lead.stage)) return null
  return STAGES[journeyIdx(lead) + 1] ?? null
}

/** Where a parked lead picks up again when nothing else is chosen: the stage it left, else New. */
export const resumeStageOf = (lead: Pick<LeadRow, 'resumeStage'>): ActiveStage => lead.resumeStage && isActiveStage(lead.resumeStage) ? lead.resumeStage : 'New'

/**
 * (UX audit 2026-09-30, L1 · L6 — extends REG-469) Why Convert to Project cannot open the Won step for this lead right now; null when
 * it may. A parked lead resumes first — Convert stays locked while it is On Hold or Lost. In Linear movement the reason names the
 * whole path left ("Complete Met and Quote Sent first"), where `blockedReason` names only the next stage the pill is gated on.
 */
export function convertBlock(lead: Pick<LeadRow, 'stage' | 'resumeStage' | 'assignees'>, mode: StageMovement): string | null {
  if (lead.stage === 'Won') return null
  if (!isActiveStage(lead.stage)) return `Resume at ${resumeStageOf(lead)} first`
  const base = blockedReason(lead, 'Won', mode)
  if (!base || !base.startsWith('Complete ')) return base
  const left = STAGES.slice(journeyIdx(lead) + 1, STAGES.indexOf('Won'))
  if (left.length < 2) return base
  return `Complete ${left.slice(0, -1).join(', ')} and ${left[left.length - 1]} first`
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
  { label: 'Notes & Logs', slug: 'notes' },   // (REG-550) the tab names the logs it holds (tester feedback 2026-09-15)
  /* (REG-552, owner 2026-09-23) Meetings is hidden until its mocks land — its slug 404s and the Meeting quick link is gone too.
     Restore: `{ label: 'Meetings', slug: 'meetings' }` here and the link in components/leads/detail/quick-links.tsx. */
  { label: 'Questionnaire', slug: 'questionnaire' },
  { label: 'Activity', slug: 'activity' },
] as const
export type DetailTabSlug = (typeof DETAIL_TABS)[number]['slug']
export const detailHref = (leadId: string, slug: DetailTabSlug = '') => (slug ? `/leads/${leadId}/${slug}` : `/leads/${leadId}`)
