/**
 * (verify round 1, F129 · F204 · wave E, E7) How a Company library's page reads an action's answer. An action that refuses answers
 * `{ error: <the studio's rule> }` rather than throwing (a production server action's own throw arrives redacted), so every caller settles
 * the answer: a refusal becomes `Refused` with the rule, for "Couldn’t … — only Dane, an Owner or an Admin …" instead of "please try again".
 */
import { refusalOf } from '@/components/leads/tasks/use-run'

/** (verify round 1, F129 · F204) The server's own refusal — its words are the studio's ("Only Dane, an Owner or an Admin…"), so the snackbar
    says them after "Couldn’t …" instead of "please try again". A caller whose action answers `{ error }` throws this (or returns the answer,
    which `settle` reads the same way); any other failure keeps the house line. */
export class Refused extends Error {}
/** (audit 2026-09-26, F129) An action that answers `{ error }` refused — treat it as a failure, so the gallery says "Couldn’t …" rather than
    the success line (every library: a refusal used to read as done). The answer comes back for the success line to read (a count). */
export async function settle(r: unknown): Promise<unknown> {
  const v = await r
  if (v && typeof v === 'object' && 'error' in v && (v as { error?: unknown }).error) throw new Refused(String((v as { error: unknown }).error))
  return v
}
/** (wave E, E7) What a create / duplicate answered — its new id (a string, or `{ id }`) — or, when it refused with `{ error }`, that rule
    thrown as Refused (the caller's catch says it: `reasonOf`). An answer with neither throws a code, which reads as "please try again". */
export async function newIdOf(r: unknown): Promise<string> {
  const v = await settle(r)
  if (typeof v === 'string' && v) return v
  if (v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string') return (v as { id: string }).id
  throw new Error('no-id')
}
/** (wave E, E7) The words a caught failure carries for "Couldn’t … — {reason}": a refusal's rule as the server said it, a readable thrown
    rule, or null (the house "please try again"). */
export const reasonOf = (e: unknown): string | null => (e instanceof Refused ? e.message : refusalOf(e))
