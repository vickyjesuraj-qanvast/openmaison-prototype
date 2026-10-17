/**
 * (REG-915, Q-02) The Overview's Getting started card: what a project still needs, each with its own button — the card that replaces
 * 1.0's create drawer and its Draft wizard. A REGISTRY: round 2 adds "the schedule", the portal rounds "invite the client"; each entry
 * reads its own field of `SetupFacts` (its loader fills it) and names the action its button runs (`action`, which the Overview maps to
 * a dialog or a page — `components/projects/overview/getting-started-card.tsx`). Pure and client-safe; the listing's attention reason
 * "Setting up for n days" counts the open ones.
 *
 * (simplify S-01 · S-17, the owner's "build everything" 2026-10-09) The Overview no longer draws this as its own card: its open items are
 * Needs you rows (lib/projects/needs-you.ts) — while Setting up under *Before work starts*, leaving out what the Start step asks for itself
 * (`SHEET_ITEMS`: the date, the schedule and its end, the invite); after Start, every item still open comes back as a set-up row.
 */
export type SetupFacts = {
  direct: boolean
  startDate: boolean
  targetEndDate: boolean
  team: number
  /** The contract value is known: a signed (or Won) system quote, or an agreed value. */
  value: boolean
  hasQuote: boolean
  /** (Projects r4a) The client can open the portal: invited, not withdrawn. Left out = not known (counted as open). */
  clientInvited?: boolean
  /** (Projects round 2) The schedule's milestones. */
  milestones?: number
  /** (gaps build, package A — 1.0's "Contract uploaded", B-220) The signed agreement is on the project: a contract record linked or signed on
      its client, or a file in Files › Contract. Left out = not known (counted as done, so a loader that doesn't fill it raises nothing). */
  contract?: boolean
}

/** What a button does — one key per kind of answer, so the card stays a list and the page decides how each opens. */
export type SetupAction = 'dates:start' | 'dates:end' | 'assign' | 'value' | 'quote'
  | 'invite'   // (Projects r4a) the Client access panel
  | 'schedule'   // (Projects round 2)
  | 'contract'   // (gaps build, package A) the Contract dialog: link a signed contract, or upload the signed copy to Files › Contract

export type SetupItem = {
  key: string
  label: string
  /** The line under the label while it is open. */
  help: string
  done: (f: SetupFacts) => boolean
  /** The button: its words and what it runs, while the item is open; a done item keeps a quiet "Change" where it makes sense. */
  action: (f: SetupFacts) => { label: string; run: SetupAction }
}

export const GETTING_STARTED: SetupItem[] = [
  { key: 'start', label: 'Start date', help: 'When work begins on site', done: (f) => f.startDate, action: () => ({ label: 'Set date', run: 'dates:start' }) },
  { key: 'end', label: 'Target end date', help: 'When you aim to hand over', done: (f) => f.targetEndDate, action: () => ({ label: 'Set date', run: 'dates:end' }) },
  { key: 'team', label: 'Members', help: 'Who runs the project',   /* (parity Q-05) one word for the people on a record */ done: (f) => f.team > 0, action: () => ({ label: 'Assign', run: 'assign' }) },
  {
    key: 'value', label: 'Contract value', help: 'The signed quote, or the value you agreed',
    done: (f) => f.value,
    action: (f) => (f.hasQuote && !f.direct ? { label: 'Open quote', run: 'quote' } : { label: 'Add value', run: 'value' }),
  },
  /* (Projects round 2) */
  { key: 'schedule', label: 'Schedule', help: 'The milestones from works start to handover', done: (f) => (f.milestones ?? 0) > 0, action: () => ({ label: 'Set up', run: 'schedule' }) },
  /* (Projects r4a, board 8) the client's own page — what needs them, their files, the steps before work starts */
  { key: 'portal', label: 'Invite the client', help: 'Their own page: what needs them, their files and the steps ahead', done: (f) => !!f.clientInvited, action: (f) => (f.clientInvited ? { label: 'Invite to Portal', run: 'invite' } : { label: 'Invite', run: 'invite' }) },   // (one-home N-15) the panel's one name
]

/* (gaps build, package A — 1.0's set-up card had "Contract uploaded", B-220) The signed agreement: a Won project has it from the Won step; a
   direct project links the client's signed contract or uploads the signed copy to Files › Contract. After Contract value, where 1.0 put it. */
GETTING_STARTED.splice(GETTING_STARTED.findIndex((i) => i.key === 'value') + 1, 0, {
  key: 'contract', label: 'Contract', help: 'The signed agreement — link it, or upload the signed copy',
  done: (f) => f.contract !== false, action: () => ({ label: 'Add', run: 'contract' }),
})

export type SetupRow = { key: string; label: string; help: string; done: boolean; action: { label: string; run: SetupAction } }
export function gettingStarted(f: SetupFacts): SetupRow[] {
  return GETTING_STARTED.map((i) => ({ key: i.key, label: i.label, help: i.help, done: i.done(f), action: i.action(f) }))
}
export const setupOpenCount = (f: SetupFacts): number => GETTING_STARTED.filter((i) => !i.done(f)).length
