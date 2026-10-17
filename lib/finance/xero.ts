/**
 * (gaps build F2 — the books, F2-Q13; 1.0 `src/lib/accounting/**`) Xero, simulated — pure and client-safe. 1.0 pushed the studio's money into
 * Xero (push only: sales and purchases out, nothing in) through OAuth, a durable queue and a cron. The prototype keeps the studio's side of it —
 * the connection and its organisation per issuing entity, the accounts and tax mapping (auto-map by rate, then sales / purchase side, then
 * name — 1.0's rule), what is due to push, what was pushed and every push in a log — and simulates Xero itself the way Integrations' Gmail
 * does. The developers plug the real API into the same records (`xero_links` · `xero_sync_log`, settings `xero`).
 *
 * 1.0's rules carried: **unapproved money is never pushed** (a pending expense, a client's proof not counted, a Draft invoice); a credit note
 * and a payment land in their invoice's organisation; the tax rate is the record's own, never today's; a record pushed again UPDATES (never a
 * second copy); a failed push keeps its reason and waits for Retry.
 */
export const XERO_KEY = 'xero'

/* ── Xero's side (a Singapore organisation's default chart, simulated) ──────────────────────────────────────────────────────────── */

export type XeroAccount = { code: string; name: string; type: 'revenue' | 'direct_costs' | 'expense' | 'bank' }
export const XERO_ACCOUNTS: XeroAccount[] = [
  { code: '200', name: 'Sales', type: 'revenue' },
  { code: '260', name: 'Other Revenue', type: 'revenue' },
  { code: '310', name: 'Cost of Goods Sold', type: 'direct_costs' },
  { code: '320', name: 'Subcontractors', type: 'direct_costs' },
  { code: '400', name: 'Advertising', type: 'expense' },
  { code: '420', name: 'Entertainment', type: 'expense' },
  { code: '425', name: 'Freight & Courier', type: 'expense' },
  { code: '429', name: 'General Expenses', type: 'expense' },
  { code: '445', name: 'Light, Power, Heating', type: 'expense' },
  { code: '449', name: 'Motor Vehicle Expenses', type: 'expense' },
  { code: '453', name: 'Office Expenses', type: 'expense' },
  { code: '473', name: 'Repairs and Maintenance', type: 'expense' },
  { code: '477', name: 'Wages and Salaries', type: 'expense' },
  { code: '485', name: 'Subscriptions', type: 'expense' },
  { code: '090', name: 'Business Bank Account', type: 'bank' },
]
export type XeroTax = { code: string; name: string; rate: number; side: 'sales' | 'purchase' }
export const XERO_TAXES: XeroTax[] = [
  { code: 'SR', name: 'Standard-Rated Supplies 9%', rate: 9, side: 'sales' },
  { code: 'ZR', name: 'Zero-Rated Supplies', rate: 0, side: 'sales' },
  { code: 'ES', name: 'Exempt Supplies', rate: 0, side: 'sales' },
  { code: 'TX', name: 'Standard-Rated Purchases 9%', rate: 9, side: 'purchase' },
  { code: 'NR', name: 'Purchases from non-GST-registered suppliers', rate: 0, side: 'purchase' },
]
export const accountWords = (code: string | null | undefined) => { const a = XERO_ACCOUNTS.find((x) => x.code === code); return a ? `${a.code} · ${a.name}` : 'Not mapped' }
export const taxWords = (code: string | null | undefined) => XERO_TAXES.find((x) => x.code === code)?.name ?? 'Not mapped'

/* ── The studio's side: what maps to what ───────────────────────────────────────────────────────────────────────────────────────── */

/** The studio's money that lands on an account. The expense categories are F1's fixed list (F1-Q11) — (pending modules S06) the studio's own
    list now: `accountKeysFor(categories)` gives one row per category it keeps, and a row for anything else (an expense under a category the
    studio has since removed). `ACCOUNT_KEYS` is the list a studio starts with. */
export type AccountKey = { key: string; label: string; side: 'sales' | 'purchase' | 'bank'; hint: string[] }
const BASE_KEYS: AccountKey[] = [
  { key: 'sales', label: 'Invoices — payment stages and variation orders', side: 'sales', hint: ['200'] },
  { key: 'one_off', label: 'One-off invoices', side: 'sales', hint: ['260', '200'] },
  { key: 'pos', label: 'Purchase orders and supplier bills', side: 'purchase', hint: ['320', '310'] },
]
const BANK_KEY: AccountKey = { key: 'bank', label: 'Payments in and out', side: 'bank', hint: ['090'] }
/** Each starting category's account, as 1.0's auto-map guessed it; any other category starts at General Expenses. */
const EXPENSE_HINTS: Record<string, string[]> = {
  Materials: ['310'], 'Site supplies': ['310'], Transport: ['449', '425'], Labour: ['320'], Equipment: ['473'], Meals: ['420'], Office: ['453'],
  Software: ['485'], Marketing: ['400'], Utilities: ['445'], Other: ['429'],
}
export const EXPENSE_FALLBACK_KEY = 'exp:Other'
export function accountKeysFor(categories: readonly string[]): AccountKey[] {
  const own = categories.filter((c) => c.toLowerCase() !== 'other').map((c): AccountKey => ({ key: `exp:${c}`, label: `Expenses — ${c}`, side: 'purchase', hint: EXPENSE_HINTS[c] ?? ['429'] }))
  const other: AccountKey = { key: EXPENSE_FALLBACK_KEY, label: categories.some((c) => c.toLowerCase() === 'other') ? 'Expenses — Other' : 'Expenses — a category no longer listed', side: 'purchase', hint: ['429'] }   // invented copy (pending modules S06)
  return [...BASE_KEYS, ...own, other, BANK_KEY]
}
export const ACCOUNT_KEYS: AccountKey[] = accountKeysFor(['Materials', 'Site supplies', 'Transport', 'Labour', 'Equipment', 'Meals', 'Office', 'Software', 'Marketing', 'Utilities', 'Other'])
export const TAX_KEYS: { key: string; label: string; side: 'sales' | 'purchase'; rate: 'gst' | 'none' }[] = [
  { key: 'sales_gst', label: 'Sales with GST', side: 'sales', rate: 'gst' },
  { key: 'sales_none', label: 'Sales without GST', side: 'sales', rate: 'none' },
  { key: 'purchase_gst', label: 'Purchases with GST', side: 'purchase', rate: 'gst' },
  { key: 'purchase_none', label: 'Purchases without GST', side: 'purchase', rate: 'none' },
]
/** The account row an expense lands on: its category's, else the one for anything else. */
export const expenseAccountKey = (category: string, keys: readonly AccountKey[] = ACCOUNT_KEYS) => (keys.some((k) => k.key === `exp:${category}`) ? `exp:${category}` : EXPENSE_FALLBACK_KEY)

export type XeroOrg = { entity: string; name: string }
export type XeroSettings = {
  connected: boolean
  connectedAt: number | null
  connectedBy: string | null
  /** One Xero organisation per issuing entity (1.0: one connection per legal entity); `entity` is the entity's name ('' = the studio's own). */
  organisations: XeroOrg[]
  /** Push after each money step (the switch); off → only Sync now. */
  auto: boolean
  accounts: Record<string, string | null>
  taxes: Record<string, string | null>
  lastSyncAt: number | null
}
export const DEFAULT_XERO: XeroSettings = { connected: false, connectedAt: null, connectedBy: null, organisations: [], auto: false, accounts: {}, taxes: {}, lastSyncAt: null }
/** (one-home N-09) The connection as Company › Integrations' Xero card reads it — whether it is on, since when, by whom (a name) and the last
    sync. Connect and Disconnect live there; Finance › Accounting keeps the organisations, the mapping, the pushes and the sync log. */
export type XeroStatus = { connected: boolean; connectedAt: number | null; by: string | null; lastSyncAt: number | null }
export function parseXero(v: unknown): XeroSettings {
  const r = (v ?? {}) as Partial<XeroSettings>
  const rec = (x: unknown): Record<string, string | null> => (x && typeof x === 'object' ? Object.fromEntries(Object.entries(x as Record<string, unknown>).map(([k, c]) => [k, typeof c === 'string' ? c : null])) : {})
  return {
    connected: r.connected === true, connectedAt: typeof r.connectedAt === 'number' ? r.connectedAt : null, connectedBy: typeof r.connectedBy === 'string' ? r.connectedBy : null,
    organisations: Array.isArray(r.organisations) ? r.organisations.filter((o): o is XeroOrg => !!o && typeof o.name === 'string').map((o) => ({ entity: typeof o.entity === 'string' ? o.entity : '', name: o.name })) : [],
    auto: r.auto === true, accounts: rec(r.accounts), taxes: rec(r.taxes), lastSyncAt: typeof r.lastSyncAt === 'number' ? r.lastSyncAt : null,
  }
}

/** (1.0's auto-map) Accounts by the studio's own hints, else by type; taxes by rate first, then side — never a sales code on a purchase. */
export function autoMap(gstRate: number, keys: readonly AccountKey[] = ACCOUNT_KEYS): Pick<XeroSettings, 'accounts' | 'taxes'> {
  const accounts: Record<string, string | null> = {}
  for (const k of keys) accounts[k.key] = k.hint.find((c) => XERO_ACCOUNTS.some((a) => a.code === c)) ?? null
  const taxes: Record<string, string | null> = {}
  for (const k of TAX_KEYS) {
    const rate = k.rate === 'gst' ? gstRate : 0
    const byRate = XERO_TAXES.filter((t) => t.rate === rate)
    taxes[k.key] = (byRate.find((t) => t.side === k.side) ?? null)?.code ?? null
  }
  return { accounts, taxes }
}
/** What still has no mapping (the page says so; a push that needs it fails with it). */
export const unmapped = (s: Pick<XeroSettings, 'accounts' | 'taxes'>, keys: readonly AccountKey[] = ACCOUNT_KEYS) => [
  ...keys.filter((k) => !s.accounts[k.key]).map((k) => k.label),
  ...TAX_KEYS.filter((k) => !s.taxes[k.key]).map((k) => k.label),
]

/* ── What is due to push ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type XeroKind = 'client' | 'vendor' | 'invoice' | 'credit_note' | 'payment' | 'bill' | 'expense' | 'payout'
export const XERO_KIND_LABEL: Record<XeroKind, string> = {
  client: 'Client contact', vendor: 'Vendor contact', invoice: 'Invoice', credit_note: 'Credit note', payment: 'Client payment', bill: 'Supplier bill', expense: 'Expense', payout: 'Payment out',
}
/** A record ready for Xero: its words, its amount, what it needs mapped, and a fingerprint (a change pushes it again). */
export type XeroItem = { kind: XeroKind; id: string; label: string; amountMinor: number | null; organisation: string; needs: { accounts: string[]; taxes: string[] }; hash: string; remoteHint: string }
export type XeroLinkRecord = { recordKind: string; recordId: string; status: 'synced' | 'failed'; hash: string | null; remoteId: string | null; error: string | null; attempts: number; pushedAt: number | null }

/** What a push makes of an item: created (first time), updated (it changed), failed (a mapping is missing), or nothing (already there). */
export function pushOutcome(item: XeroItem, link: XeroLinkRecord | undefined, s: Pick<XeroSettings, 'accounts' | 'taxes'>, keys: readonly AccountKey[] = ACCOUNT_KEYS): { outcome: 'created' | 'updated' | 'failed' | 'skip'; message: string | null } {
  if (link && link.status === 'synced' && link.hash === item.hash) return { outcome: 'skip', message: null }
  const miss = [...item.needs.accounts.filter((k) => !s.accounts[k]).map((k) => keys.find((x) => x.key === k)?.label ?? k), ...item.needs.taxes.filter((k) => !s.taxes[k]).map((k) => TAX_KEYS.find((x) => x.key === k)?.label ?? k)]
  if (miss.length) return { outcome: 'failed', message: `Map “${miss[0]}” to a Xero ${item.needs.accounts.some((k) => !s.accounts[k]) ? 'account' : 'tax rate'} first` }
  return { outcome: link && link.remoteId ? 'updated' : 'created', message: null }
}
/** A short, stable fingerprint of what matters about a record (a change in it pushes again). */
export function hashOf(parts: (string | number | null | undefined)[]): string {
  const s = parts.map((p) => (p === null || p === undefined ? '' : String(p))).join('|')
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0).toString(36)
}
export const XERO_RULE = 'Only an Owner, an Admin or Accounting connects Xero and pushes the books'   // (parity map, FB-114 — a deliberate change of this rule)

/** (pending modules S06) A category's starting account — its row's hint as Xero's chart has it — for a category added or renamed while Xero is
    connected, so its expenses never fail on a row nobody mapped. */
export const hintedAccount = (key: AccountKey) => key.hint.find((c) => XERO_ACCOUNTS.some((a) => a.code === c)) ?? null
