/**
 * (REG-917, the report's principle 3) The project page says what to do next: ONE filled action in the header, following the stage. A
 * REGISTRY read in order — the first entry that applies is the header's primary; every other action lives in the kebab. Round 1:
 * Setting up → Start the project (asks for the start date, moves to In progress). Round 2 adds "Set up the schedule" for an In progress
 * project with no schedule, round 3 "Post an update", round 7 "Complete handover" — each an entry here and a `run` the page maps to its
 * dialog (`components/projects/project-frame.tsx`). Pure and client-safe.
 *
 * (simplify S-02 · Q-03, the owner's "build everything" 2026-10-09 — revises this registry's order) The header's filled action is now the TOP
 * ROW of Needs you (lib/projects/needs-you.ts `primaryOf`): approvals and money no longer hide behind Share changes. This registry is the
 * fallback when nothing waits on the viewer — so REG-917's one filled action stays (In progress with nothing waiting → Post an update).
 */
import type { ProjectStage } from './model'

export type NextFacts = { stage: ProjectStage; mayChange: boolean
  /** (Projects round 2) the schedule's milestones, and what the client would read differently than at the last share */
  milestones?: number; unshared?: number
  /** (fix-B, B-17) whether the schedule was ever shared */
  shared?: boolean
  /** (Projects round 7) the handover: the work is near its end, or a handover waits for review; `reviews` = this viewer approves it */
  handover?: 'near' | 'requested' | null; reviews?: boolean
  /** (gaps build, package A — M-01) the project is on hold */
  onHold?: boolean
  /** (gaps build B, item 5) the oldest payment stage's invoice ready to send (its milestone done) — `sends`: this viewer sends at once, else submits */
  readyInvoice?: { id: string; stage: string; sends: boolean } | null }
export type PrimaryRun = 'start'
  | 'schedule' | 'share'   // (Projects round 2)
  | 'update'   // (REG-957) round 3: Post an update
  | 'handover' | 'review'   // (Projects round 7) Complete handover · Review the handover
  | 'resume'   // (gaps build, package A — M-01) a project on hold
  | 'invoice'   // (gaps build B, item 5) Send the {stage} invoice — Money, with the invoice open
  /* (simplify S-02 — the build's contract B) the page's own dialogs a Needs you row opens: Invite to Portal, Assign, the Contract step, the value,
     the dates */
  | 'invite' | 'assign' | 'contract' | 'value' | 'dates:start' | 'dates:end'
/** (simplify S-02) The header's one filled action — since 2026-10-09 the top Needs you row's (lib/projects/needs-you.ts `primaryOf`), this
    registry only when nothing waits. It runs one of the page's flows (`run`) or opens an address (`href`, contract C's deep links). */
export type PrimaryAction = { key: string; label: string; run?: PrimaryRun
  /** (gaps build B) what the action is about — the invoice to send */ target?: string
  /** (simplify S-02) where it opens — a row with an address (Reply → Messages, Review → the update, Pay → Money) */ href?: string }

export const PRIMARY_ACTIONS: { when: (f: NextFacts) => boolean; action: PrimaryAction
  /** (gaps build B) a label and a target read from the facts ("Send the Mid-Project invoice") */ labelOf?: (f: NextFacts) => string; targetOf?: (f: NextFacts) => string | undefined }[] = [
  { when: (f) => f.stage === 'setting_up', action: { key: 'start', label: 'Start the project', run: 'start' } },
  /* (Projects round 7) a handover waiting for review is an Owner's or an Admin's first thing to do on the project — before the schedule's steps */
  { when: (f) => f.stage === 'in_progress' && f.handover === 'requested' && !!f.reviews, action: { key: 'review-handover', label: 'Review the handover', run: 'review' } },
  /* (Projects round 2) a running project with no schedule sets one up; once something the client can see has moved, Share changes */
  { when: (f) => f.stage === 'in_progress' && f.milestones === 0, action: { key: 'schedule', label: 'Set up the schedule', run: 'schedule' } },
  /* (fix-B, B-17) until the first share the header says what the dialog does: Share the schedule */
  { when: (f) => f.stage === 'in_progress' && (f.unshared ?? 0) > 0 && f.shared === false, action: { key: 'share', label: 'Share the schedule', run: 'share' } },
  { when: (f) => f.stage === 'in_progress' && (f.unshared ?? 0) > 0, action: { key: 'share', label: 'Share changes', run: 'share' } },
  /* (Projects round 7, Q-24) The stage's one filled action once the work is near its end: Complete handover; while one waits for review, an
     Owner's or an Admin's is Review the handover (whoever asked reads the bar and posts updates meanwhile). */
  { when: (f) => f.stage === 'in_progress' && f.handover === 'near', action: { key: 'handover', label: 'Complete handover', run: 'handover' } },
  /* (REG-957, round 3) While the work runs, the page's next step is telling the client — LAST in the list: round 2's schedule entries
     (Set up the schedule, Share changes) come before it whenever they apply. */
  { when: (f) => f.stage === 'in_progress', action: { key: 'update', label: 'Post an update', run: 'update' } },
]

/* (gaps build, package A — M-01) A project on hold has one thing to do next: Resume — before every other entry (put first at load, so the
   list above keeps its own order). */
PRIMARY_ACTIONS.unshift({ when: (f) => !!f.onHold && f.stage !== 'completed', action: { key: 'resume', label: 'Resume', run: 'resume' } })

export function primaryAction(f: NextFacts): PrimaryAction | null {
  const hit = PRIMARY_ACTIONS.find((p) => p.when(f))
  if (!hit) return null
  const target = hit.targetOf?.(f)
  return { ...hit.action, ...(hit.labelOf ? { label: hit.labelOf(f) } : {}), ...(target ? { target } : {}) }   // (gaps build B)
}

/* (gaps build B, item 5 — 1.0's "Complete & bill", G-255 · G-273) The moment a payment stage's milestone is done, the project's one filled action
   is its invoice — before Share changes (marking a milestone done always leaves a change to share, which would otherwise hide the invoice for
   good), the handover and Post an update; after a review waiting and Set up the schedule. Inserted, never reordered: the registry's own order
   stands. */
PRIMARY_ACTIONS.splice(Math.max(0, PRIMARY_ACTIONS.findIndex((p) => p.action.key === 'share')), 0, {
  when: (f) => f.stage === 'in_progress' && !!f.readyInvoice,
  action: { key: 'invoice', label: 'Send the invoice', run: 'invoice' },
  labelOf: (f) => `${f.readyInvoice?.sends === false ? 'Submit' : 'Send'} the ${f.readyInvoice?.stage ?? ''} invoice`,
  targetOf: (f) => f.readyInvoice?.id,
})
