/**
 * (S44R — UAT row 358, call C7, as recommended — his UAT ask 2026-10-15) Settings › Projects › *When a project starts*: which signature moves a
 * lead to Won (and Won makes the project — REG-911). Pure and client-safe; the server reads it through `lib/projects/start-rule-server.ts`.
 *
 * - **The quote is signed** (the default — today's): the studio moves the lead to Won once its quote is signed; the Won step asks for the
 *   signed quote and, by default, the signed contract (REG-911 · pending modules S05).
 * - **The agreement is signed**: when the client signs an agreement (a letter of appointment) — online, in a set, or marked signed by the
 *   studio — the lead moves to Won by itself THROUGH the Won step's own rules (`lib/leads/won-on-signing.ts`): the agreement and the quote it
 *   signs fill the step, the stage movement rule and "a lead needs a member" still hold, and the project is made with its stage invoices
 *   drafted — the deposit first. A lead the Won step can't take yet stays where it is, and the bell says why.
 *
 * This PARTLY REVERSES "signing the quote starts the project" (REG-911's Won on the signed quote): with the second answer the agreement's
 * signature starts it, not a press after the quote's.
 */
export const PROJECT_START_KEY = 'project_start'
export type ProjectStartsWhen = 'quote' | 'agreement'
export type ProjectStartRule = { startsWhen: ProjectStartsWhen }
export const DEFAULT_PROJECT_START: ProjectStartRule = { startsWhen: 'quote' }
export const parseProjectStart = (v: unknown): ProjectStartRule => ({ startsWhen: v && typeof v === 'object' && (v as { startsWhen?: unknown }).startsWhen === 'agreement' ? 'agreement' : 'quote' })

/** The card's words (invented copy, S44R). */
export const PROJECT_START_WORDS = {
  title: 'When a project starts',
  help: 'Won makes the project. Pick the signature that moves a lead to Won.',
  label: 'A project starts when',
  options: [
    { value: 'quote' as const, label: 'The quote is signed', help: 'You move the lead to Won once its quote is signed — the Won step asks for the signed quote and the signed contract.' },
    { value: 'agreement' as const, label: 'The agreement is signed', help: 'When the client signs an agreement — a letter of appointment — the lead moves to Won by itself: the agreement and the quote it signs fill the Won step, and the project is made with its deposit invoice drafted. A lead the Won step can’t take yet stays where it is, and the bell says why.' },
  ],
  saved: (w: ProjectStartsWhen) => (w === 'agreement' ? 'A project now starts when the client signs the agreement' : 'A project now starts when you move a lead with a signed quote to Won'),
} as const
