/**
 * (gaps build D, item 8 — 1.0 I-321…I-325) The client's documents by kind — pure and client-safe: the portal's Files card files its rows under
 * these heads, in the order a renovation meets them (the server's `PortalDocument.group`, lib/portal/home.ts).
 */
export type DocumentGroup = 'quotes' | 'agreements' | 'variations' | 'receipts' | 'selections'
export const DOCUMENT_GROUPS: readonly { key: DocumentGroup; label: string }[] = [
  /* (the calm UI build 2026-10-27, 3-50 · W-478) the agreement's head says "Contract", the studio's word for it (Files › Contract & VOs); its key stays */
  { key: 'quotes', label: 'Quotes' }, { key: 'agreements', label: 'Contract' }, { key: 'variations', label: 'Variation orders' },
  { key: 'receipts', label: 'Payment receipts' }, { key: 'selections', label: 'Selection receipts' },
]
