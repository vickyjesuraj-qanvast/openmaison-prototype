/**
 * (gaps build F1 — F-01 · F1-Q1) Finance's pages: Finance lands on the first, each is a tab on Company's frame (CompanyShell).
 * (REG-1360, owner 2026-10-08) Finance is a Company section — Company › Operations › Finance, at `/company/finance/<tab>`; the rail's own
 * Finance item is gone. The old `/finance/<tab>` addresses redirect (app/finance), and `/finance/doc/<id>` still serves a cost's file.
 * Client-safe. `runners` = a tab only Owners and Admins see.
 *
 * (simplify S-10 · S-11, his "build everything" 2026-10-09) Eight tabs by record type become five by job: **To do** (where Finance lands, for
 * everyone — what the money needs from you, the action on each row) · **Money out** (Purchase orders · Bills · Expenses · Paid behind one kind
 * switch — today's tables unchanged) · **Vendors** · **Commission** (a member's own: *My commission*) · **Xero** (the Accounting tab renamed — its
 * address keeps working). Members see four: no Xero. The old tabs' addresses each have their own redirect route (app/company/finance/<old>/),
 * so they answer 307 and land on To do or Money out `?kind=`, their query kept.
 * (parity map 2026-10-10, FB-013 · FB-016 · FB-012) **Money in** joins after To do — Money out's twin, so 1.0's studio-wide registers of
 * invoices, receipts and variation orders have one home: To do · Money in · Money out · Vendors · Commission · Xero.
 */
/** (REG-1360) Where Finance's pages live. */
export const FINANCE_BASE = '/company/finance'

export type FinanceTab = { key: string; label: string; href: string; icon: string; help: string; runners?: boolean
  /** (simplify S-11) What a member reads on the tab when it is theirs only — "My commission". */ memberLabel?: string }

export const FINANCE_TABS: FinanceTab[] = [
  /* (simplify S-10) the landing: To approve · To pay · To collect · Stuck — a member's own drafts, sent back, vendors' answers and claims */
  /* (the calm UI build 2026-10-27, T-01 — 1-02 · 5-06 · W-047) the tabs say what they hold in the app's one vocabulary: **Needs your attention** (was To
     do), **Client payments** (was Money in), **Costs** (was Money out). The words only — every key, address (`/todo` · `/money-in` · `/money-out`),
     `?kind=` and count stays; ⌘K keeps finding the old names. */
  { key: 'todo', label: 'Needs your attention', href: '/company/finance/todo', icon: 'task', help: 'What the money needs from you — approve, pay, collect' },
  /* (parity map, FB-013 · FB-016 · FB-012 — 1.0's Finance › Operations registers) Money out's twin: every invoice, client payment, variation order and
     credit note across the projects, one list with a kind switch (`?kind=`); a row opens its project's Money on it. A member sees the projects
     whose money they see. */
  { key: 'money-in', label: 'Client payments', href: '/company/finance/money-in', icon: 'payments', help: 'Invoices, client payments, variation orders and credit notes across the projects' },
  /* (simplify S-11) Purchase orders · Bills · Expenses · Payments out became one tab with a kind switch (`?kind=`) */
  { key: 'money-out', label: 'Costs', href: '/company/finance/money-out', icon: 'local_shipping', help: 'Purchase orders, bills, expenses and what was paid' },
  { key: 'vendors', label: 'Vendors', href: '/company/finance/vendors', icon: 'storefront', help: 'The studio’s sub-contractors and suppliers' },
  /* (gaps build F2 — F2-Q1) commission (everyone: a member sees their own) · (simplify S-11) "Commission"; a member's tab says "My commission" */
  { key: 'commissions', label: 'Commission', memberLabel: 'My commission', href: '/company/finance/commissions', icon: 'workspace_premium', help: 'What each member earns, is paid and is owed' },
  /* (REG-1361) Reports moved to Company › Reports › Finance — one home for every report; /company/finance/reports redirects there
     (simplify S-11) Accounting is named for what it is — Xero; its address stays /company/finance/accounting */
  { key: 'accounting', label: 'Xero', href: '/company/finance/accounting', icon: 'account_balance', help: 'The books pushed to Xero — mapping, pushes and the sync log', runners: true },
]
/** (gaps build F2) The books' tabs — drawn by the books workspace, not the money-out lists. (simplify S-10) the Overview became To do. */
/** (S43D, F2-01) The ghosts' key for whether Commission opens with its asks band (lib/ghost-shapes.server.ts seeds it, the page remembers it):
    the studio's *Asks for another rate* (whoever sees the books) or a member's own *Your asks*. */
export const commissionAsksShape = (runs: boolean): string => (runs ? 'finance.commissions.asks' : 'finance.commissions.my-asks')
export const BOOKS_TABS = ['commissions', 'accounting']

/** The tabs this viewer sees, each with the words this viewer reads. The flag is the books' (`CostViewer.runs`: Owners, Admins and — parity
    map, FB-114 — Accounting, who sees every tab, Xero included). */
export const financeTabsFor = (runsStudio: boolean) => FINANCE_TABS.filter((t) => !t.runners || runsStudio).map((t) => ({ ...t, label: !runsStudio && t.memberLabel ? t.memberLabel : t.label }))
/** (simplify S-10) Where Finance lands — To do, for everyone. */
export const financeHome = (_runsStudio = false) => { void _runsStudio; return FINANCE_TABS[0]!.href }

/* ── Money out's kinds (simplify S-11) ──────────────────────────────────────────────────────────────────────────────────────────── */

export type MoneyOutKind = 'purchase-orders' | 'bills' | 'expenses' | 'paid'
/** The kind switch: each one of today's lists, in the order money goes out. Paid (the Payments out list) is the Owners' and Admins' (F-16). */
export const MONEY_OUT_KINDS: { key: MoneyOutKind; label: string; runners?: boolean; legacy: string }[] = [
  { key: 'purchase-orders', label: 'Purchase orders', legacy: 'purchase-orders' },
  /* (the calm UI build 2026-10-27, 5-28 · W-035 · W-305) each chip says what its list is titled — "Supplier bills"; the studio's own payments list
     is "Payments made" (was Paid · Payments out). The keys and `?kind=` stay. */
  { key: 'bills', label: 'Supplier bills', legacy: 'bills' },
  { key: 'expenses', label: 'Expenses', legacy: 'expenses' },
  { key: 'paid', label: 'Payments made', runners: true, legacy: 'payments' },
]
export const isMoneyOutKind = (v: unknown): v is MoneyOutKind => MONEY_OUT_KINDS.some((k) => k.key === v)
/** The kinds this viewer switches between. */
export const moneyOutKindsFor = (runsStudio: boolean) => MONEY_OUT_KINDS.filter((k) => !k.runners || runsStudio)
/** The kind an address asks for, as this viewer may see it — Purchase orders when it asks for none, or for one they may not. */
export const moneyOutKindOf = (v: string | null | undefined, runsStudio: boolean): MoneyOutKind => {
  const k = moneyOutKindsFor(runsStudio).find((x) => x.key === v)
  return k?.key ?? 'purchase-orders'
}
/** Money out on a kind, with a record to open — `/company/finance/money-out?kind=bills&open=<id>`. */
export const moneyOutHref = (kind: MoneyOutKind, open?: string | null) => `${FINANCE_BASE}/money-out?kind=${kind}${open ? `&open=${encodeURIComponent(open)}` : ''}`
/* ── Money in's kinds (parity map, FB-013 · FB-016 · FB-012) — the twin of Money out's switch ─────────────────────────────────────────── */

export type MoneyInKind = 'invoices' | 'payments' | 'variations' | 'credits'
/** The kind switch, in the order money comes in: what was billed, what was paid, what changed the contract, what was given back. */
export const MONEY_IN_KINDS: { key: MoneyInKind; label: string }[] = [
  /* (the calm UI build 2026-10-27, W-310) "Client payments" — "Payments" also named commission paid and the studio's payments made */
  { key: 'invoices', label: 'Invoices' }, { key: 'payments', label: 'Client payments' }, { key: 'variations', label: 'Variation orders' }, { key: 'credits', label: 'Credit notes' },
]
export const isMoneyInKind = (v: unknown): v is MoneyInKind => MONEY_IN_KINDS.some((k) => k.key === v)
/** The kind an address asks for — Invoices when it asks for none. */
export const moneyInKindOf = (v: string | null | undefined): MoneyInKind => (isMoneyInKind(v) ? v : 'invoices')
/** Money in on a kind — `/company/finance/money-in?kind=payments`. */
export const moneyInHref = (kind: MoneyInKind) => `${FINANCE_BASE}/money-in${kind === 'invoices' ? '' : `?kind=${kind}`}`

/** (simplify S-10) To do, landing on a row — the bell's and the search's door for an approver. */
export const todoHref = (open?: string | null) => `${FINANCE_BASE}/todo${open ? `?open=${encodeURIComponent(open)}` : ''}`

/** (simplify S-11) The old tabs' addresses and where each lands now — their own routes (app/company/finance/<old>/page.tsx) answer 307. */
export const OLD_FINANCE_TABS: Record<string, string> = {
  overview: `${FINANCE_BASE}/todo`,
  'purchase-orders': `${FINANCE_BASE}/money-out?kind=purchase-orders`,
  bills: `${FINANCE_BASE}/money-out?kind=bills`,
  expenses: `${FINANCE_BASE}/money-out?kind=expenses`,
  payments: `${FINANCE_BASE}/money-out?kind=paid`,
}
