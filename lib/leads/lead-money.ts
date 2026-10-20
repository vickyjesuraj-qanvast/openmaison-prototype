import type { WizardData } from './stage-data'

/**
 * (S44O — call C6 · UAT row 313, as recommended — his UAT ask 2026-10-15) A lead's records as a member who never reads a quote's money sees
 * them — Marketing: the Move stage window's Quote Sent and Won steps keep their picks and files, never the quote's amount, the signed one or the
 * payment split. The listing and the lead page hand these to the browser, so the figures never leave the server. Pure.
 */
export function withoutQuoteMoney(d: Partial<WizardData>): Partial<WizardData> {
  const { quoteAmount: _a, wonQuoteAmount: _b, milestones: _m, ...rest } = d
  void _a; void _b; void _m
  return rest
}
