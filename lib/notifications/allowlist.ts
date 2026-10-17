/*
 * (pending modules S34 — the steps' note after S18: "1.0's recipient allow-list for non-production deployments are yours"; 1.0's
 * src/lib/notifications/recipient-allowlist.ts, its env name and format kept so the port is mechanical) Who a deployment may really send to.
 *
 * A staging or demo deployment that holds a real provider's key must not message real studios' members and clients. `NOTIFY_ALLOWLIST`
 * bounds it: when set, ONLY the listed email addresses and mobile numbers get a real send — every other message is written to the outbox
 * as `blocked` (never sent, never tried again), Sent messages saying why. Unset or empty = no limit (production's normal). The prototype's
 * outbox stand-in sends nothing to anyone, so the list only ever acts once a real adapter is plugged in (lib/notifications/delivery.ts).
 * Format (1.0's): comma-, semicolon- or newline-separated, e.g. `NOTIFY_ALLOWLIST="ops@studio.sg,+6591234567"`. Pure.
 */

export const ALLOWLIST_ENV = 'NOTIFY_ALLOWLIST'
/** On a blocked row's `error`, so it is findable (1.0's words). */
export const ALLOWLIST_BLOCK_REASON = 'recipient not in NOTIFY_ALLOWLIST'
/** Two numbers match on their last eight digits at least — a short fragment never matches half the list (1.0's rule). */
const MIN_PHONE_DIGITS = 8

export type Allowlist = { active: boolean; emails: Set<string>; phones: string[] }

export function parseAllowlist(raw: string | null | undefined): Allowlist {
  const entries = (raw ?? '').split(/[,;\n]+/).map((e) => e.trim()).filter(Boolean)
  const emails = new Set<string>()
  const phones: string[] = []
  for (const e of entries) {
    if (e.includes('@')) emails.add(e.toLowerCase())
    else { const d = e.replace(/\D+/g, ''); if (d.length >= MIN_PHONE_DIGITS) phones.push(d) }
  }
  return { active: emails.size + phones.length > 0, emails, phones }
}

/** Whether `address` (an email, or a number as the outbox writes it) may get a real send under `list`. */
export function allowedBy(list: Allowlist, address: string): boolean {
  if (!list.active) return true
  if (address.includes('@')) return list.emails.has(address.trim().toLowerCase())
  const d = address.replace(/\D+/g, '')
  return d.length >= MIN_PHONE_DIGITS && list.phones.some((p) => p.endsWith(d) || d.endsWith(p))
}
