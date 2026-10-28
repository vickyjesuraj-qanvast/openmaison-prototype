/**
 * (The calm UI build 2026-10-27, the UI audit's T-01 · 4-04) One status set on screen, sentence case, everywhere a quote's state is shown:
 * Draft · Waiting for approval · Approved · With client · Confirmed · Signed. DISPLAY ONLY — the stored value (`QUOTE_STATUSES` in
 * lib/leads/quote-filters.ts), every filter, URL, query param, server action and rule keep the stored words ("Sent for Approval",
 * "Sent to Client"). Pure and client-safe. A variation order's state keeps the Money tab's words (`variationLabel`, lib/projects/money.ts).
 */
import type { QuoteStatus } from '@/lib/leads/quote-filters'

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  Draft: 'Draft',
  'Sent for Approval': 'Waiting for approval',
  Approved: 'Approved',
  'Sent to Client': 'With client',
  Confirmed: 'Confirmed',
  Signed: 'Signed',
}

/** The word a studio reads for a stored quote status; an unknown value shows as stored. */
export function quoteStatusLabel(status: string): string {
  return (QUOTE_STATUS_LABEL as Record<string, string>)[status] ?? status
}

/** (The calm UI build 2026-10-27, T-01 · W-428) The Quotes lists' to-do chips on screen — "2 approvals" (the approvals' one word), "With client · 3"
    (the status's word), "Expiring this week · 1". Display only: the chips' keys and what each counts stay `QUOTE_TODOS`' (lib/leads/quote-filters.ts). */
export const QUOTE_TODO_LABEL: Record<'approval' | 'waiting' | 'expiring', (n: number) => string> = {
  approval: (n) => `${n} ${n === 1 ? 'approval' : 'approvals'}`,
  waiting: (n) => `With client · ${n}`,
  expiring: (n) => `Expiring this week · ${n}`,
}
