# Package K-R — Finance + Reports: outcome (2026-10-09)

Built on her "build everything" (S-10 · S-11 · S-12 · S-13 · S-14 (the receipt-first expense dialog) · S-16 · Q-07, and F1 §6.9's small fixes
1 · 2 · 3 (the vendor half) · 4 · 5 · 6 · 7 · 8). `npx tsc --noEmit -p .` and `npx eslint` clean on every file below; `npm run design:lint` —
nothing new breaks a house rule (baseline untouched). No build, no server, no browser, no local.db. Register rows: `reg-K-R.md` (REG-K-R.1…10).

## What changed, by item

### S-10 · Q-07 — Finance › To do (the landing, for everyone)
- **`lib/finance/todo.ts`** (new, pure, client-safe) — `todoRows(input)` builds every row from the summaries the server already has (`costsOf`
  views, `moneyOf`'s InvoiceViews, `commissionsOf` lines and asks, the failed Xero pushes): groups `approve · pay · collect · stuck` (Owners /
  Admins) and `drafts · sent_back · answered · claims` (members); `groupLine` (each head's sum), `dueWordsOf`, `TODO_GROUP` (the words),
  `TodoData` + `todoInputOf`, `toApproveCount`. No number of its own: To pay sums to `costsOf.owedMinor` + commission owed; a bill on a PO is one
  row (the PO's own row only for what is not billed yet); red only for a debt of ours past its day (S-05); To collect is neutral.
- **`lib/finance/todo-server.ts`** (new, server-only) — `fetchFinanceTodo()` = `fetchFinance()` (the viewer's money-out scope) + for Owners /
  Admins `fetchBooks()` · `fetchXero()` + the payments waiting for the confirmer (`project_payments` `to_confirm`) + each client's phone and portal
  page (the reminder); returns `{ todo, books, xero }` so Commission / Xero reuse the reads. `todoCountOf` (the strip's To do count) and
  `countFinanceToApprove()` (S-16, four SQL counts on To approve's predicates).
- **`components/finance/todo/todo-workspace.tsx`** (+ `todo.module.css`, `todo-page.tsx`) — the screen: toolbar (search · house Chips with
  counts · New ▾), the four groups as `CreditsTable`s (column sets per group: approve · pay · collect · quiet), head-line-only empty groups, the
  house EmptyState when nothing waits, TabSearchEmpty for a search that finds nothing. Actions: money out through `useCosts` (poNext/poMenu,
  billNext/billMenu, expenseNext/expenseMenu, the new `payPo` · `payBill` · `payClaim`), money in through the Money tab's own steps
  (`confirmPayment` / `undoConfirmPayment`, `markNotReceived` / `undoNotReceived`, `remindInvoice` with `reminderMessage` + `waLink` opened on the
  press), commission asks through `RuleDialog` / `NoteDialog` + `answerCommissionAsk`, a member's pay through `PayMemberDialog` +
  `payMemberCommission` (Undo), Xero through `retryXero`. Client-invoice approval and Send are doors to the project's Money (`&do=approve`,
  `&send=1` — contract C) with `?from=` To do. `?open=` marks and scrolls to the row; a cost record not listed opens its panel. Phone: search +
  "+" on one row, the chips on a ChipRail, rows as cards. Members' New ▾ puts Expense first.
- **`lib/finance/queries.ts`** — `fetchFinance` now hands `costsOf` the visible projects' quote lines (`quotePicksOf`, one read) for whoever
  sees figures, so Finance's PO panel and To do show *Against the quote* (F1 P5).
- **Bell** — `app/finance/po-actions.ts` `po_review` and `app/finance/cost-actions.ts` `expense_review` link to `/company/finance/todo?open=<id>`;
  `lib/finance/bell.ts` bill rows link there too. `lib/finance/server.ts` `financeHref(tab, open)` maps an old tab to its new home.
- **Removed**: `components/finance/books/overview-view.tsx` (Money to verify / Stuck are To do's groups; the address redirects).

### S-11 — five tabs; Money out; Xero
- **`lib/finance/sections.ts`** — `FINANCE_TABS` = To do · Money out · Vendors · Commission (`memberLabel` "My commission") · Xero (key/address
  `accounting`, runners only); `financeTabsFor(runs)` gives each viewer's labels; `financeHome()` = To do for everyone; `MONEY_OUT_KINDS`,
  `moneyOutKindOf`, `moneyOutKindsFor`, `moneyOutHref`, `todoHref`, `OLD_FINANCE_TABS`. `BOOKS_TABS` = commissions · accounting.
- **Routes** — `app/company/finance/page.tsx` → To do (query kept); new redirect routes with no loader (307):
  `app/company/finance/{overview,purchase-orders,bills,expenses,payments}/page.tsx` (payments: runners → `?kind=paid`, members → Money out).
  `app/company/finance/[tab]/page.tsx` serves todo · money-out · vendors · commissions · accounting, reads To do once per tab for the count.
- **`components/finance/finance-frame.tsx`** (new) — CompanyShell + the strip (To do's count via the house Tabs' `count`) + the header's
  *Reports ›* door (HelpLink, Owners/Admins). `components/company/company-shell.tsx`: the tabs type gains `count?` (type only).
- **`components/finance/finance-workspace.tsx`** — Money out (kind Chips riding `?kind=` via replaceState, the Status ScopePill + PortalMenu with
  counts, search, one New ▾, the kind's unchanged table inside `data-testid="finance-<old tab>"` so `finance-bills` etc. still match) and Vendors
  (as before). `?open=` / `?new=1` as before.
- **`components/finance/books/books-workspace.tsx`** — Commission and Xero on FinanceFrame.
- **`components/finance/books/accounting-view.tsx`** — before Xero is connected the card's button is *Connect Xero* calling `connectXero` in place
  (test id `xero-connect` kept); the card says the connection is kept in Company › Integrations (link) — Disconnect stays there.
- **`components/company/integrations-view.tsx`** — two words: "Finance › Xero", snackbar action "Open Xero".

### S-12 — Commission grouped by member, Pay {member}
- **`lib/finance/commission.ts`** — `owedOldestFirst(lines, memberId)` · `splitOldestFirst(lines, amount)` (pure).
- **`app/finance/books-actions.ts`** — `payMemberCommission(input)` (checks every project first, then one `commission_payouts` row per project
  oldest first, each with its Activity line and the member's bell row; Xero auto-push once) and `undoMemberCommission({ items })`.
- **`components/finance/books/commission-dialogs.tsx`** — `PayMemberDialog` (amount — all owed to start — day, how, reference, note; the
  oldest-first split listed live). `books.module.css`: `.payParts`, `.memberCell`, `.indent`, `.phoneOnly`.
- **`components/finance/books/commissions-view.tsx`** — tiles say their period; asks only while one is open (an answered ask folds into its line's
  rate cell); one grouped table (`books-commission-grouped`, test id `commission-lines` kept; member rows `data-testid="commission-member"`
  `data-member`, line rows `data-line="<project>:<member>"`, the fold `commission-member-toggle`, Pay `commission-pay-member`); members keep their
  own lines table; `?open=` lands on an ask, a line or a member.

### S-13 — Reports › Finance numbers
- **`lib/finance/reports.ts`** — You owe ages a PO with bills by its bills (each unpaid bill a row, the PO's not-billed rest as Current); Cash
  flow's next 90 days the same; Profitability counts only graded profits (`profitGrade`, contract E) in its Profit and Margin tiles, its Total and
  its by-type / by-designer rows ("--" otherwise), by-project profit "--" until graded; tiles **Margin on what was invoiced** (P&L) and **Margin on
  contracts** (Profitability); `ReportRow.toneKey` on every toned row; overhead / claim hrefs point at Money out.
- **`components/finance/books/reports-view.tsx`** — Period a `TextField mode="select"` beside Export (test id `report-period` kept on its
  wrapper); the report a select on a phone (`report-chips` kept); a tone colours only its `toneKey` cell and never a zero; the report read is
  remembered (`lib/finance/report-memory.ts`, cookie `om_reports_finance`).
- **Reports remembers its tab** — `components/company/reports/reports-workspace.tsx` writes cookie `om_reports_tab`; `app/company/reports/page.tsx`
  lands there when this viewer reads that tab (else `reportsHome` as before); `app/company/reports/[tab]/page.tsx` falls back to the remembered
  Finance report when the address has no `?report=`. The address always wins. (A cookie, not localStorage, so the server's landing can read it.)
- **Commission tiles** (Finance) say *All time* / *As it stands today* (above).

### S-14 — the receipt-first expense dialog
- **`components/finance/expense-dialog.tsx`** — the fields are named blocks; on a phone (`useSheetLayout`) the order is: *Take a photo of the
  receipt* (outlined — the footer keeps the one filled button; test id `expense-camera` kept) + thumbnails + the picker, then amount / day,
  project, what for, GST, category / vendor, who paid, note; the amount takes no autofocus on a phone. A desk is unchanged.

### S-16 — the money badge
- `lib/leads/tasks.ts` `railBadges` (the one line + the `/company` sum): `company:finance` = `countFinanceToApprove()`.
- `components/company/company-popover.tsx` `money` prop → "n to approve" on the Finance row (`data-testid="company-finance-badge"`);
  `components/shell/app-rail.tsx` and `mobile-nav.tsx` pass `badges?.['company:finance']`.

### F1 §6.9's small fixes
1. `components/contracts/editor/dialogs.tsx` — `SendContractDialog nameLabel · messageLabel`, `RecipientFields nameLabel`, `MessageField label`
   (defaults unchanged everywhere else); `use-costs.tsx` passes "Vendor’s name" · "Message to the vendor".
2. `use-costs.tsx` — *Take the submission back* only for the submitter (or a non-approver); `Next.act` / `RowAction.act` (`cost-tables.tsx`) and
   `panelMenu` keep a panel's ⋮ from repeating its primary.
3. `payout-dialog.tsx` — `PayoutTarget.bank` + the *Pay to* band with copy buttons (`payout-bank`, `payout-copy-account`, `payout-copy-paynow`);
   `use-costs.tsx` `bankOf` fills it from the vendor record (null for a viewer without bank access, and for a claim). Members' PayNow: skipped.
4. S-16 above.
5. `lib/finance/bell.ts` — `at: due` (the Due group reads it as the due day), href To do. The email's words need `lib/notifications/model.ts` (below).
6. `lib/global-search/model.ts` — `SearchPage.forMembers`, `createHits(query, { member })`; the three Finance Create rows (Log an expense first) open
   Money out on their kind with `new=1`; `components/shell/global-search.tsx` takes `member` (from `app-shell.tsx` and `app/(editor)/layout.tsx`,
   the signed-in member's role). Finance's ⌘K page rows now name Money out, "Finance · To do", "Commission", "Xero".
7. To do's columns: *Asked by* (approvals) · *Due* (pay / collect — a claimed payment shows the day the client says they paid).
8. `cost-tables.tsx` `PoTable billRef` — "Billed — see AF-7781" in the Paid cell when the PO's bill carries the overdue debt (Money out passes it).
- `lib/finance/search.ts` — an overhead bill's hit opens Money out › Bills.

### Ghosts (REG-708)
- `components/finance/finance-ghost.tsx` — To do (both toolbars, CSS picks by width; the four groups / a member's four), Money out (`?kind=` read
  from the address), Vendors; `runs` prop for the strip's labels (the route's loader draws the Owners' five — it cannot ask who is signed in).
- `components/finance/books/books-ghost.tsx` — Commission (grouped / a member's), Xero (Connect in the card), Reports (chips desk-only, a select on a
  phone, then the Period select and Export). `finance.module.css`: `.phoneBar` · `.phoneSearch` · `.phoneTools` · `.ghostDesk` · `.ghostPhone` ·
  `.kindRail` · `.kindBody` · `.payTo` · `.payLine`.

## What to check in the browser (1440 / 768 / 390)
- **Dane (Owner)** — Company › Finance lands on **To do**: To approve (PO-2026-008 · Germaine · *Over S$5,000 · Leaves 23.8% against the quote* ·
  Approve and send → the vendor dialog says *Vendor’s name* / *Message to the vendor*; Germaine's Grab claim · Approve; Michelle's ask · Answer),
  To pay (AF-7781 red *n days late*; Woodcraft's WC-2391 and PO-003's not-billed rest; Kallang KC-1009; Michelle's claim · Pay back; *Commission
  owed* per member · Pay {first}) — Pay shows *Pay to …* with the account / PayNow copies; To collect (Ryan *INV-2026-002 · Ryan says they paid* ·
  Confirm, then Undo; ⋮ Not received; Benjamin INV-2026-006 · Remind on WhatsApp — WhatsApp opens, the row says *Reminded once*; Aisha's ready
  invoice · Send → the project's Money); Stuck (Bright Spark's changes on PO-007 · Change it). Chips' counts, search, New ▾. The strip's To do
  count; *Reports ›* in the header. The Company panel's Finance row *n to approve*, the Company badge.
- **Money out** — the four kinds (`?kind=` in the address as you switch), Status pill with counts, Column settings, New ▾; the old addresses
  (`/company/finance/purchase-orders?open=…` etc.) 307 to their kind; PO-2026-005's Paid cell *Billed — see AF-7781*.
- **Commission** — tiles *All time*; Michelle's open ask; the grouped table (fold a member); *Pay Michelle S$x* → the dialog lists the projects
  oldest first; Record → Undo; a line's ⋮ as before.
- **Xero** — not connected: *Connect Xero* in the card connects in place and the mapping shows; Integrations' card says Connected by Dane, its
  link reads *Finance › Xero*.
- **Reports › Finance** — Period select; P&L *Margin on what was invoiced*; Profitability *Margin on contracts* lower than 87.7% (early / no-cost
  projects "--"); You owe overdue S$1,400; Cash flow's *Overdue now* out; only the meaningful figure coloured. Read Finance, then open
  `/company/reports` — it lands on Finance; a fresh browser lands on Leads.
- **Germaine (Designer)** — To do = Your drafts · Sent back to you · Vendors who answered · Your claims; New ▾ starts with Expense; Money out with no
  Paid; *My commission*; ⌘K with nothing typed offers Log an expense · New purchase order · Record a supplier bill; at 390 Log an expense opens on
  *Take a photo of the receipt*. **Hui Min (Admin)** — as Dane. **View as** a Manager (James) — their team's rows.
- **390 / 320** — no sideways scroll on To do, Money out, Commission, Xero; chips on a rail; rows as cards; the "+" beside the search.

## Probe assertions changed (each with its `(simplify S-xx, a deliberate change of this rule)` comment)
- `design-source/verify/projects/verify-pj-gap-f1.cjs` — Finance lands on To do; the old Purchase orders address 307s to Money out
  `?kind=purchase-orders&open=…` and lands there; *Record a bill* opens through Money out's New ▾ (×3); a Designer's `/company/finance/payments`
  lands on Money out with no Paid kind and no Xero tab.
- `design-source/verify/projects/verify-pj-gap-f2.cjs` — Finance lands on To do; To collect / To approve / To pay replace Money to verify / Stuck
  (+ the approver reads *against the quote*); Commission grouped by member with Pay Michelle, tiles *All time*, the line found by `data-line`; the tab
  named Xero and *Connect Xero* acting in place (Integrations reads it); a Designer lands on To do, her tab *My commission*; the 390 loop covers
  To do and Money out.
- Not changed, still true: `verify-reports.cjs` (a fresh context lands on Leads; a Manager whose remembered tab they cannot read lands on Projects).

## Needs from others
1. **`lib/notifications/model.ts:395` (no package; K-C may be in this file for Q-13)** — the `bill_due` email body says "Pay it from Finance ›
   Bills: {link}"; the link now opens To do's To pay row: → `'Hi {member},\n\n{vendor}’s bill for {amount} is due and not paid yet. Pay it from
   Finance › To do: {link}\n\n{studio}'` (F1 §6.9.5's second half; log under REG-K-R.9 as invented copy).
2. **K-M — `components/finance/project-costs.tsx`** — pass `billRef={(id) => s.bills.find((b) => b.id === id)?.reference}` to its `PoTable`, so the
   Money tab's PO says *Billed — see AF-7781* rather than *see its bill*. Optional (F1 §6.10): the Costs bands can be `todoRows(…)` filtered by
   `projectId` (`lib/finance/todo.ts`) — one wording on both pages.
3. **K-S — `components/finance/finance-settings.tsx:24`** — the *Kept in Company* link "Commissions" → "Commission" (the tab's new name).
4. **K-F (or the orchestrator) — `lib/leads/activity.ts:472`** — the commission line's link "See commissions" → "See commission" (optional).
5. **Orchestrator — `components/shell/maison-ai.tsx` Reset prototype to base** clears `om.*` localStorage; Reports' memory is two cookies
   (`om_reports_tab`, `om_reports_finance`, path `/company/reports`) — add `document.cookie = 'om_reports_tab=; path=/company/reports; max-age=0'`
   (and the other) to the reset if a reset should forget them (optional).
6. **Orchestrator — `scripts/repair-demo-data.ts`** the seeds that write `po_review` / `expense_review` bell rows (≈ lines 3967, 4062) use the
   project's Money; the block below moves them (or change the seeds to `/company/finance/todo?open=<id>`).
7. K-S's optional ⌘K settings cards (their outcome, item 3) are untouched here.

## Repair text (idempotent — after R91)
```ts
  /* ── R-K-R · Finance › To do (simplify S-10, her "build everything" 2026-10-09) ───────────────────────────────────────────────────────
     An approver's bell row for a PO or an expense waiting opens the To do row they act on now. A stored row keeps the address it was written
     with (the project's Money, or Finance › Expenses), so it moves. Idempotent: a row already on To do is left. */
  {
    console.log('\nR-K-R Finance › To do — the approvers’ bell rows open To do')
    const r = await client.execute(`UPDATE notifications SET href = '/company/finance/todo?open=' || substr(href, instr(href, 'open=') + 5) WHERE kind IN ('po_review', 'expense_review') AND instr(href, 'open=') > 0 AND href NOT LIKE '/company/finance/todo%'`)
    note(`${r.rowsAffected} bell row(s) moved to To do`)
  }
```
Verification query (the closing list): `['approver’s bell row not opening To do (R-K-R)', `SELECT id FROM notifications WHERE kind IN ('po_review','expense_review') AND href NOT LIKE '/company/finance/todo?open=%'`]`.
No other records move: To do, Money out, Commission and Reports read the records as they are.

## Not done, and why
- **A member's PayNow** (F1 §6.9.3's second half) — new data (`members` has no PayNow); per the brief, a claim's pay dialog shows what exists.
- **The bill_due email's words** — `lib/notifications/model.ts` is not this package's (Needs 1).
- **Approve a client invoice inside To do** — it is a door to the project's Money (`&do=approve`, K-M's contract C), as F1 §6.3 allows ("door,
  or inline later"). **Send** a ready invoice opens the Money tab's own send (`&send=1`).
- **The header's *Reports ›* link in the ghost** — the ghost head draws button bones; a text link drawn as one would flash wrong, so the ghost
  leaves it out (it appears with the page).
- `npm run design:anatomy` — needs a running server (the orchestrator's).
- `setEntityNumbering` / `setCreditRules` in `books-actions.ts` are kept (K-S's note: no screen calls them now) — harmless; drop later if wanted.
