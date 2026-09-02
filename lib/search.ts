/**
 * One search rule for every list in the app (REG-274, user 2026-09-01: "in the lead listing search i should be
 * able to search by mobile number as well and similarly look at the other pages").
 *
 * Two failures this replaces, both found by testing the listing's own box:
 *   · phone matching was gated on `qDigits.length >= 3`, so typing "98" — the start of five real numbers —
 *     matched NOTHING and the list emptied. A prefix of a phone number is the most natural way to search one.
 *   · only name / source / property type were matched, so a lead could not be found by its email, address,
 *     assignee or stage even though every one of those is on screen.
 *
 * The rule: a row matches when the query appears in ANY of the text it shows. Numbers are compared digits-only
 * on both sides, so "9812 0443", "+65 9812 0443" and "98120443" all find the same lead. Every list passes the
 * fields the reader can actually see in it — matching on something invisible reads as a bug.
 */

/** Text fields to match; null / undefined are skipped so callers can pass optional columns directly. */
export type Searchable = (string | null | undefined)[]

const digits = (s: string) => s.replace(/\D/g, '')

/**
 * @param query      what the user typed (raw; trimmed and lowercased here)
 * @param fields     every piece of text the row shows
 * @param phones     phone-like values, matched digits-to-digits at any length (a prefix counts)
 */
export function matchesQuery(query: string, fields: Searchable, phones: Searchable = []): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (fields.some((f) => f && f.toLowerCase().includes(q))) return true
  // A number typed with spaces, dashes or a country code still matches the stored digits — but only when the
  // query actually carries a digit, so a plain word never falls through to the phone columns.
  const qd = digits(q)
  return qd.length > 0 && phones.some((p) => p && digits(p).includes(qd))
}

/** Convenience for the common `list.filter(...)` shape. */
export const filterByQuery = <T,>(rows: T[], query: string, pick: (row: T) => { fields: Searchable; phones?: Searchable }): T[] => {
  if (!query.trim()) return rows
  return rows.filter((row) => { const { fields, phones } = pick(row); return matchesQuery(query, fields, phones) })
}
