/**
 * (UX audit 2026-09-30 — the hand-off pattern, findings Q1 · C1 · L2) A link that opens a lead's Move stage window at one step with its
 * document already picked. A document that changes state offers its lead's next stage right there — a sent or confirmed quote, a signed
 * contract, a saved contact log — and this is where the offer leads:
 *   /leads/<id>?move=quote-sent&quote=<quoteId>   ·   /leads/<id>?move=won&contract=<contractId>   ·   /leads/<id>?move=contacted&log=<noteId>
 * The Overview opens the window once on arrival, then drops the parameters (router.replace).
 */
export type MoveStep = 'contacted' | 'met' | 'quote-sent' | 'won'
export const MOVE_STEPS: readonly MoveStep[] = ['contacted', 'met', 'quote-sent', 'won']

export function moveStageHref(leadId: string, step: MoveStep, pick: { quote?: string; contract?: string; log?: string } = {}): string {
  const q = new URLSearchParams({ move: step })
  if (pick.quote) q.set('quote', pick.quote)
  if (pick.contract) q.set('contract', pick.contract)
  if (pick.log) q.set('log', pick.log)
  return `/leads/${leadId}?${q.toString()}`
}

/** Read the parameters back (the Overview's side). */
export function readMoveParams(params: URLSearchParams): { step: MoveStep; quote: string | null; contract: string | null; log: string | null } | null {
  const step = params.get('move')
  if (!step || !(MOVE_STEPS as readonly string[]).includes(step)) return null
  return { step: step as MoveStep, quote: params.get('quote'), contract: params.get('contract'), log: params.get('log') }
}
