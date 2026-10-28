/**
 * (The calm UI build 2026-10-27, the UI audit's T-01 · 4-04) A contract's states on screen: Draft · Waiting for signature · Signed.
 * DISPLAY ONLY — the stored value (`CONTRACT_STATUSES` in lib/leads/contract-filters.ts: "Sent to Client"), filters, URLs, actions and rules
 * keep the stored words. Pure and client-safe.
 */
import type { ContractStatus } from '@/lib/leads/contract-filters'

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  Draft: 'Draft',
  'Sent to Client': 'Waiting for signature',
  Signed: 'Signed',
}

/** The word a studio reads for a stored contract status; an unknown value shows as stored. */
export function contractStatusLabel(status: string): string {
  return (CONTRACT_STATUS_LABEL as Record<string, string>)[status] ?? status
}
