import { answerOf, type ChoiceAnswer } from './decline'

/**
 * (gaps build D, item 7 — 1.0 F-129 · F-163 · I-287) A selection receipt's facts as its paper reads them — pure and client-safe (the studio's
 * page, the portal's page and the printed PDF draw the one paper, components/projects/choices/selection-receipt.tsx).
 * (parity map 2026-10-10, TD-044 — 1.0's receipt for every answered selection: approved, rejected or change requested) The client's **no** gets
 * its receipt too: `answer` says which — turned down, or asked for other options — `pick` then holds who answered, when and their reason, and
 * no option is ticked. The fingerprint takes the answer in, so the receipt of a no can never read as a pick's.
 */
export type SelectionReceiptData = {
  letterhead: { name: string; address: string; uen: string; gstReg: string; logo: string | null }
  studioPhone: string
  studioEmail: string
  client: string
  property: string | null
  project: { name: string; number: string }
  choice: { id: string; title: string; room: string | null }
  /** Every option put to the client, in the studio's order — its price against the quote (cents, before GST; null = no change). */
  options: { id: string; name: string; description: string | null; vendor: string | null; priceMinor: number | null; picked: boolean }[]
  /** Who chose — the client on their portal (their name), or the studio with them (the member) — when, and the client's note. */
  pick: { by: 'client' | 'studio'; person: string | null; at: number; note: string | null }
  /** The GST a pick's change adds (0 = none) — the price lines say what the contract moves by. */
  gstPct: number
  /** SHA-256 over what the receipt says (hex). */
  hash: string
  /** (parity map, TD-044) the client said no instead of picking — which answer; null (or absent) for a pick */
  answer?: ChoiceAnswer | null
}

/** The fingerprint as it prints: the first 32 hex characters in groups of four ("3f2a 91c0 …"). */
export const fingerprintText = (hash: string) => (hash.slice(0, 32).match(/.{1,4}/g) ?? []).join(' ')
/** "Chosen by Aisha Rahman on her portal" · "Chosen with Aisha Rahman by Germaine Tan" — the receipt's line. */
export const pickedLine = (d: Pick<SelectionReceiptData, 'pick' | 'client' | 'answer'>) =>
  d.answer ? `${d.answer === 'reject' ? 'Turned down' : 'Other options asked for'} by ${d.pick.person ?? d.client} on the client portal`   // (parity map, TD-044) (invented copy)
    : d.pick.by === 'client' ? `Chosen by ${d.pick.person ?? d.client} on the client portal` : `Chosen with ${d.client}${d.pick.person ? ` by ${d.pick.person}` : ''}`
/** (parity map, TD-044) The receipt's state as its chip and its block read: "Chosen" · "Turned down" · "Other options asked". */
export const receiptStateLabel = (d: Pick<SelectionReceiptData, 'answer'>) => (d.answer ? answerOf(d.answer).chip : 'Chosen')

/**
 * What the fingerprint is taken over (SHA-256 of this text): the choice, every option put to the client (its id, name, vendor and price) and
 * the pick (which option, client or studio, when, the client's note) — the record, never its presentation (names, a logo, the GST rate), so a
 * copy can be checked against the choice as it was decided. One function for the app and the demo's repair, so both write the same print.
 */
export function receiptHashSource(c: { id: string; title: string; room: string | null }, options: { id: string; name: string; vendor: string | null; priceMinor: number | null }[], pick: { optionId: string; by: 'client' | 'studio'; at: number; note: string | null }, answer?: ChoiceAnswer | null): string {
  return JSON.stringify({ v: 1, choice: { id: c.id, title: c.title, room: c.room }, options: options.map((o) => ({ id: o.id, name: o.name, vendor: o.vendor ?? null, price: o.priceMinor ?? null })), pick: { option: pick.optionId, by: pick.by, at: pick.at, note: pick.note ?? null },
    /* (parity map, TD-044) a no's receipt names the answer — a pick's source is unchanged, so every filed fingerprint still checks */
    ...(answer ? { answer } : {}) })
}
