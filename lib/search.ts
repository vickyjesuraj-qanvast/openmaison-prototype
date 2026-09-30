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
 * (UX audit L11) The digit runs a query can mean in a phone column: as typed, and — when it opens with Singapore's country code, the way
 * caller ID and WhatsApp show a number ("+65 9123 4599", "65 9123 4599", "6591234599") — without it. The header comment always promised
 * "+65 9812 0443" finds "98120443"; digits-only on both sides turned it into "6598120443", which no stored number contains. A bare "65…"
 * counts as the code only when a space or dash follows it, or the run is ten digits long — "6512" typed alone is the start of a landline.
 * The last entry is the local number.
 */
export function phoneNeedles(query: string): string[] {
  const q = query.trim()
  const d = digits(q)
  if (!d) return []
  const coded = /^\+\s*65/.test(q) || /^0065/.test(q) || /^65[\s-]/.test(q) || (d.length === 10 && d.startsWith('65'))
  const local = coded ? d.replace(/^(?:00)?65/, '') : ''
  return local && local !== d ? [d, local] : [d]
}

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
  const needles = phoneNeedles(q)
  return needles.length > 0 && phones.some((p) => { const pd = p ? digits(p) : ''; return !!pd && needles.some((n) => pd.includes(n)) })
}

/** Convenience for the common `list.filter(...)` shape. */
export const filterByQuery = <T,>(rows: T[], query: string, pick: (row: T) => { fields: Searchable; phones?: Searchable }): T[] => {
  if (!query.trim()) return rows
  return rows.filter((row) => { const { fields, phones } = pick(row); return matchesQuery(query, fields, phones) })
}
