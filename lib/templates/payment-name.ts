/**
 * (The calm UI build 2026-10-27, the UI audit's 4-17 · W-509) The studio default payment schedule was seeded as "Default: 10/30/30/30" — its
 * split said in its name, and again in its tags, its second row and its facts (five times on one screen). On screen it reads "10/30/30/30" with
 * the "Studio default" chip; the stored name stays as seeded (a studio that renamed it sees its own name). DISPLAY ONLY — pure, client-safe.
 */
export const SEEDED_DEFAULT_NAME = 'Default: 10/30/30/30'

/** The name a payment schedule shows: the seeded default's split alone, every other name as stored. */
export function paymentScheduleName(id: string, name: string, defaultId = 'default'): string {
  return id === defaultId && name.trim() === SEEDED_DEFAULT_NAME ? '10/30/30/30' : name
}
