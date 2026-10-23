import { STAGES, type Stage } from '@/lib/leads/enums'
import type { LeadRow } from '@/lib/leads/queries'
import type { StageMovement } from '@/lib/settings/types'
import { carriesLeadTab } from '@/lib/projects/tabs'   // (one-home N-10)
import { isMarketing } from '@/lib/settings/roles'   // (S44O — call C6)

/**
 * Stage movement policy (Settings › Leads, REG-111 … REG-132) as pure helpers, shared by the listing and the
 * Lead Details pages so both surfaces gate stages identically (checklist › Parity sweep).
 */
export type ActiveStage = (typeof STAGES)[number]
export const isActiveStage = (s: string): s is ActiveStage => (STAGES as readonly string[]).includes(s)

/** Where a lead's journey continues from — On Hold / Lost leads resume at the stage they left. */
export const journeyIdx = (lead: Pick<LeadRow, 'stage' | 'resumeStage'>) =>
  STAGES.indexOf((isActiveStage(lead.stage) ? lead.stage : lead.resumeStage ?? '') as ActiveStage)

/**
 * (fix-E, A-01) A lead whose project is live stays Won: parking or losing the work is the project's business (Complete handover, Delete
 * project), not the lead's — On Hold and Lost said "Moved to Lost" while the project ran on. One sentence for the stage menu's row, the
 * kanban's spring-back, the Move stage window and the server (`moveStage` · `quickMoveStage` · `returnLead`); it opens with a capital so a
 * refusal reads back through `refusalOf`.
 */
export const projectHoldsWon = (number: string) => `Has project ${number} — it stays Won`
/** (fix-E, A-09 · Q-27) The same lead's Delete: refused in the row before the press, as the server refuses it. */
export const projectHoldsDelete = (number: string) => `Has project ${number} — delete the project first`
/** The stage a lead with a live project may still be given: Won (a parked lead's way back), or a stage it passed (opened read-only). */
export function projectHold(lead: { project?: { number: string } | null }, stage: string): string | null {
  if (!lead.project) return null
  return stage === 'On Hold' || stage === 'Lost' ? projectHoldsWon(lead.project.number) : null
}

/** (S44O — call C6, his UAT ask 2026-10-15) Quote Sent and Won go with a quote — its amount, the signed one, the payment split — which
    Marketing never reads: the lead's designer moves it there. One sentence for the stage menu's row, the kanban's spring-back, the LEAD STAGES
    rows and the server (`moveStage` · `quickMoveStage` · `updateStageDetails`). *(invented copy)* */
export const MARKETING_STAGE_RULE = 'Quote Sent and Won go with a quote — the lead’s designer moves it there'
export const roleStageBlock = (role: string | null | undefined, stage: string): string | null =>
  isMarketing(role) && (stage === 'Quote Sent' || stage === 'Won') ? MARKETING_STAGE_RULE : null

/** Why `stage` can't be chosen for `lead` right now (null = allowed). Doubles as the tooltip / snackbar copy. (S44O — C6) `role`: the member
    choosing — Marketing never moves a lead into Quote Sent or Won. */
export function blockedReason(lead: Pick<LeadRow, 'stage' | 'resumeStage' | 'assignees'> & { project?: LeadRow['project'] }, stage: Stage, mode: StageMovement, role?: string | null): string | null {
  const byRole = roleStageBlock(role, stage)   // (S44O — C6)
  if (byRole) return byRole
  const held = projectHold(lead, stage)   // (fix-E, A-01)
  if (held) return held
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
  lead: Pick<LeadRow, 'stage' | 'resumeStage' | 'assignees'> & { project?: LeadRow['project'] },
  stage: Stage,
  mode: StageMovement,
  /** (S44O — C6) the member choosing — Marketing's Quote Sent and Won are refused, even a completed one's read-only step (its quote) */ role?: string | null,
): StageIntent {
  if (lead.stage === stage) return { kind: 'none' }
  const byRole = roleStageBlock(role, stage)
  if (byRole) return { kind: 'blocked', message: byRole }
  const held = projectHold(lead, stage)   // (fix-E, A-01) before On Hold / Lost open their dialogs
  if (held) return { kind: 'blocked', message: held }
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
  /* (REG-2640, the Leads audit's B-01 — a bug fix) Nothing moves past New without an owner (REG-130) — the stage menu greyed the move,
     but the header's "Move to Contacted" opened the Contacted step, let the whole first log be typed, and lost it when the server
     refused. Every forward move now asks the same rule first; the lead page's refusal carries Assign as its way on. */
  if (stage !== 'New' && lead.assignees.length === 0) return { kind: 'blocked', message: 'Assign a member first' }
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

/**
 * (S42E — call E·3 · E-11, as recommended) Where a meeting held with a lead takes it next, by the studio's own stage rule: **Met** when the rule
 * lets the lead reach it now (Flexible, or a lead already in Contacted) — the meeting becomes the Met log; **Contacted** for a lead still in New
 * under Linear (one stage at a time) — the meeting becomes its first contact log, Met comes next; null once the lead is at Met or past it,
 * lost or on a project. The Hangout chat's End offers it, the lead's brief does, and (S42G) so does every meeting door — the meeting's page,
 * its snackbars after End and after a write-up (lib/meetings/next-step.ts).
 * (S42G) A lead **on hold** that the rule lets resume at Met (it has a member) answers Met too: the press lands on the house's "Resume at Met?"
 * confirm, then the Met step with the meeting as its log — never a refusal. A lost lead answers null: Met lies past where it stopped, and the rule
 * refuses it ("Resume at … first").
 */
export function heldMeetingStep(lead: Pick<LeadRow, 'stage' | 'resumeStage' | 'assignees'> & { project?: LeadRow['project'] }, mode: StageMovement): 'Contacted' | 'Met' | null {
  if (lead.project || lead.stage === 'Lost') return null
  if (!isActiveStage(lead.stage) && lead.stage !== 'On Hold') return null
  if (journeyIdx(lead) >= STAGES.indexOf('Met')) return null
  const intent = stageIntent(lead, 'Met', mode)
  if (intent.kind === 'wizard' || intent.kind === 'quick' || intent.kind === 'confirm-resume') return 'Met'
  return nextStageOf(lead) === 'Contacted' ? 'Contacted' : null
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

/**
 * (S44Z — S44O's ghost note) Whether the lead page's header carries its one filled button for this member — the Overview's rule (UX audit
 * 2026-09-30, L6): Move to {next} until Won is in reach, Resume at {stage} while parked, then Convert to Project · Open project. (S44O — call
 * C6) Marketing's is the move while it is theirs (Contacted, Met, a resume short of Quote Sent); past that the lead is the designer's — no
 * filled button. One rule for the page (app/leads/[id]/overview.tsx) and its loaders' seed (lib/ghost-shapes.server.ts), so the ghost a first
 * visit draws is the header the page shows (REG-708).
 */
export function headHasPrimary(lead: Pick<LeadRow, 'stage' | 'resumeStage' | 'assignees'>, mode: StageMovement, role: string | null | undefined): boolean {
  if (!isMarketing(role)) return true
  const next = nextStageOf(lead)
  const kind = lead.stage === 'Won' ? 'won' : !convertBlock(lead, mode) ? 'convert' : !isActiveStage(lead.stage) ? 'resume' : next ? 'next' : 'locked'
  return (kind === 'next' && !!next && !roleStageBlock(role, next)) || (kind === 'resume' && !roleStageBlock(role, resumeStageOf(lead)))
}

/** A stage the lead has already passed (never a drop target — REG-132). */
/**
 * Return Lead (931:49039) is offered to Qanvast-sourced leads only (REG-139) and not while a return is processing or already
 * approved — a rejected one may be returned again. Shared by the overview kebab, the listing row / kanban menus and `returnLead`.
 */
export const canReturnLead = (lead: { source: string; returnStatus: string | null | undefined; /** (fix-E, A-01) a return moves the lead to Lost — a lead whose project is live stays Won */ project?: { number: string } | null }) =>
  lead.source === 'Qanvast' && lead.returnStatus !== 'processing' && lead.returnStatus !== 'approved' && !lead.project

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
  /* (pending modules S23 — his "build all of them" 2026-10-11 lifted REG-552's hold for this card) Meetings, where the mock drew it (858:24784),
     with the Meeting quick link: a lead's meetings, its co-pilot and the briefs (components/meetings/lead-meetings.tsx). */
  { label: 'Meetings', slug: 'meetings' },
  { label: 'Questionnaire', slug: 'questionnaire' },
  { label: 'Activity', slug: 'activity' },
] as const
export type DetailTabSlug = (typeof DETAIL_TABS)[number]['slug']
/** (one-home N-10, the owner 2026-10-08: "let the lead data till won be in the leads and after it's won rest is all under projects") The
    strip a lead shows: once it has a live project, the sales record — Overview · Quotes · Contracts; the tabs the project carries on (Tasks ·
    Files · Notes & Logs · Questionnaire · Activity, lib/projects/tabs.ts) are the project's alone, and their addresses redirect there. A lead
    whose project was deleted keeps every tab. */
export const leadTabs = (onProject: boolean): readonly (typeof DETAIL_TABS)[number][] => (onProject ? DETAIL_TABS.filter((t) => !carriesLeadTab(t.slug)) : DETAIL_TABS)
/** (parity P-06 · Q-01, the owner's pick 2026-10-08) A count on a lead tab says what waits on you there — the project strip's rule (REG-1182):
    Tasks = open tasks, Quotes = quotes waiting for approval, Questionnaire = unanswered questions (`LeadDetail.tabCounts`, lib/leads/detail.ts). */
export type LeadTabCounts = Partial<Record<'tasks' | 'quotes' | 'questionnaire' | 'meetings', number>>   // (pending modules S23) Meetings = briefs to save + notes to write up
/** The strip as the house `Tabs` draws it: each tab's label, slug and its count (none, or 0, draws the tab as before). */
export const leadTabItems = (onProject: boolean, counts: LeadTabCounts = {}) =>
  leadTabs(onProject).map((t) => ({ label: t.label, slug: t.slug, count: t.slug === 'tasks' || t.slug === 'quotes' || t.slug === 'questionnaire' || t.slug === 'meetings' ? counts[t.slug] ?? 0 : 0 }))
export const detailHref = (leadId: string, slug: DetailTabSlug = '') => (slug ? `/leads/${leadId}/${slug}` : `/leads/${leadId}`)
