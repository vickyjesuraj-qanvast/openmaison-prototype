/*
 * (REG-609, parity D-39 · Q-44) The Return Lead wizard's seven reasons with the fields each one asks for, and Qanvast's
 * return rules — 1.0's catalogue (`RETURN_LEAD_REASONS`, `getReturnEligibility`) verbatim, on 2.0's components.
 * Pure and client-safe: the wizard, the details modal and Qanvast Ops import it.
 */

export type ReturnField = 'subReasons' | 'outreach' | 'attempts' | 'search' | 'project' | 'wrongField' | 'attachments' | 'comments'
export type ReturnReason = { key: string; label: string; help?: string; fields: readonly ReturnField[]; commentsRequired?: boolean }

export const RETURN_REASONS: readonly ReturnReason[] = [
  { key: 'junk', label: 'Lead is junk/spam', help: 'The lead information appears to be fake, spam, or test data.', fields: ['attachments', 'comments'] },
  { key: 'duplicate', label: 'Duplicate lead', fields: ['search', 'attachments', 'comments'] },
  { key: 'existing-client', label: 'Lead already a client', fields: ['project', 'attachments', 'comments'] },
  { key: 'refused-meet', label: 'Lead refused to meet up', fields: ['subReasons', 'outreach', 'attempts', 'attachments', 'comments'] },
  { key: 'not-contactable', label: 'Lead not contactable', fields: ['outreach', 'attempts', 'attachments', 'comments'] },
  { key: 'wrong-info', label: 'Wrong contact info', fields: ['wrongField', 'attachments', 'comments'] },
  { key: 'others', label: 'Others', fields: ['attachments', 'comments'], commentsRequired: true },
]
export const REASON_LABELS: readonly string[] = RETURN_REASONS.map((r) => r.label)
export const reasonByLabel = (label: string): ReturnReason | null => RETURN_REASONS.find((r) => r.label === label) ?? null
export const asks = (reason: ReturnReason | null, f: ReturnField): boolean => !!reason && reason.fields.includes(f)

/** "Lead refused to meet up" › Select specific reason(s). */
export const REFUSED_SUB_REASONS = ['Not responding after multiple attempts', 'Changed mind about renovation', 'Went with another studio/competitor', 'Budget constraints changed', 'Others'] as const
/** "Wrong contact info" › What's incorrect? */
export const WRONG_FIELDS = ['Phone number is invalid', 'Email is incorrect', 'Name does not match', 'Address is wrong'] as const

/** The stored JSON list, read back defensively (a seeded row may carry none). */
export function parseSubReasons(v: string | null | undefined): string[] {
  if (!v) return []
  try { const a: unknown = JSON.parse(v); return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [] } catch { return [] }
}

/**
 * Qanvast's return rules as 1.0's helper states them: a return opens 7 days after the lead arrived, closes after 30, and a
 * lead is returned at most twice (Qanvast Ops' cap). DISPLAY ONLY (the owner's Q-44 call): the wizard and Qanvast Ops show
 * where a lead stands, nothing is blocked — and the numbers await Qanvast's confirmation.
 */
export const RETURN_RULES = { waitDays: 7, windowDays: 30, maxReturns: 2 } as const
export type ReturnWindow = { state: 'waiting' | 'open' | 'expired' | 'capped'; /** 1.0's sentence */ text: string; /** the table's short form */ short: string; used: number; days: number }
export function returnWindow(createdAt: Date, used: number, now: number): ReturnWindow {
  const days = Math.max(0, Math.floor((now - createdAt.getTime()) / 86_400_000))
  const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`
  if (used >= RETURN_RULES.maxReturns) return { state: 'capped', text: `Return limit reached (${used} of ${RETURN_RULES.maxReturns})`, short: `${used} of ${RETURN_RULES.maxReturns} used`, used, days }
  if (days < RETURN_RULES.waitDays) { const left = RETURN_RULES.waitDays - days; return { state: 'waiting', text: `Return available after ${plural(left)}`, short: `Opens in ${plural(left)}`, used, days } }
  if (days > RETURN_RULES.windowDays) return { state: 'expired', text: `Return period expired (${RETURN_RULES.windowDays} days)`, short: `Expired (${RETURN_RULES.windowDays} days)`, used, days }
  const left = RETURN_RULES.windowDays - days
  return { state: 'open', text: `${plural(left)} left to return`, short: `${plural(left)} left`, used, days }
}
/** The rules in one line, for a tooltip. */
export const RETURN_RULES_TEXT = `Qanvast's rules: a return opens ${RETURN_RULES.waitDays} days after the lead arrives, closes after ${RETURN_RULES.windowDays}, and a lead is returned at most ${RETURN_RULES.maxReturns} times. Numbers to be confirmed by Qanvast.`
