/**
 * (UX audit 2026-09-30 — the hand-off pattern, findings Q1 · C1 · L2) A link that opens a lead's Move stage window at one step with its
 * document already picked. A document that changes state offers its lead's next stage right there — a sent or confirmed quote, a signed
 * contract, a saved contact log — and this is where the offer leads:
 *   /leads/<id>?move=quote-sent&quote=<quoteId>   ·   /leads/<id>?move=won&contract=<contractId>   ·   /leads/<id>?move=contacted&log=<noteId>
 * The Overview opens the window once on arrival, then drops the parameters (router.replace).
 */
export type MoveStep = 'contacted' | 'met' | 'quote-sent' | 'won' | /** (pending modules S05) Maison AI's "put … on hold" / "mark … as lost": the two dialogs */ 'on-hold' | 'lost'
export const MOVE_STEPS: readonly MoveStep[] = ['contacted', 'met', 'quote-sent', 'won', 'on-hold', 'lost']

export function moveStageHref(leadId: string, step: MoveStep, pick: { quote?: string; contract?: string; log?: string; /** (pending modules S23) a held meeting, as the Met step's log */ meeting?: string
  /** (S42E, call E·3) the Lost dialog's reason, picked when the studio's list has it (a dropped Hangout chat's reason) */ reason?: string } = {}): string {
  const q = new URLSearchParams({ move: step })
  if (pick.quote) q.set('quote', pick.quote)
  if (pick.contract) q.set('contract', pick.contract)
  if (pick.log) q.set('log', pick.log)
  if (pick.meeting) q.set('meeting', pick.meeting)
  if (pick.reason) q.set('reason', pick.reason)
  return `/leads/${leadId}?${q.toString()}`
}

/** Read the parameters back (the Overview's side). */
export function readMoveParams(params: URLSearchParams): { step: MoveStep; quote: string | null; contract: string | null; log: string | null; meeting: string | null; reason: string | null } | null {
  const step = params.get('move')
  if (!step || !(MOVE_STEPS as readonly string[]).includes(step)) return null
  return { step: step as MoveStep, quote: params.get('quote'), contract: params.get('contract'), log: params.get('log'), meeting: params.get('meeting'), reason: params.get('reason') }
}
