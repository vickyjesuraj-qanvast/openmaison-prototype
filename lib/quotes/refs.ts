/**
 * A quote's Project Ref # and validity, derived from its records (REG-403; General Info 1273:29296 shows "HDB/20261109/001"
 * and "8/11/2026"): the property's family / the day the quote was written / its sequence among that day's quotes, and 30 days
 * of validity — the studio's own term (the seeded terms say 30 days).
 */
export const VALIDITY_DAYS = 30

export function propertyFamily(propertyType: string | null | undefined): string {
  const t = (propertyType ?? '').toLowerCase()
  if (t.startsWith('hdb')) return 'HDB'
  if (t.startsWith('bto')) return 'BTO'
  if (t.startsWith('executive condo')) return 'EC'
  if (t.startsWith('condo') || t.startsWith('penthouse')) return 'CONDO'
  if (t.startsWith('landed')) return 'LANDED'
  if (t.startsWith('commercial')) return 'COMM'
  return 'PROJ'
}

/** "HDB/20261109/001": family / yyyymmdd / a three-digit sequence for that day. */
export function projectRef(propertyType: string | null | undefined, createdAt: Date, seq: number): string {
  const y = createdAt.getFullYear(), m = String(createdAt.getMonth() + 1).padStart(2, '0'), d = String(createdAt.getDate()).padStart(2, '0')
  return `${propertyFamily(propertyType)}/${y}${m}${d}/${String(Math.max(1, seq)).padStart(3, '0')}`
}

export function validUntil(createdAt: Date): Date {
  return new Date(createdAt.getTime() + VALIDITY_DAYS * 86_400_000)
}
