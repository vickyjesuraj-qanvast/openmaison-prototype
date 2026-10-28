# B5-F — Company › Finance (the calm UI build, 2026-10-27)

Sub-lane F of B5. Files touched (all mine by the split): `lib/finance/{sections,todo,queries,books,profit}.ts` ·
`components/finance/{cost-tables,finance-workspace,finance-ghost,finance.module.css,project-costs,vendor-panel}.tsx|css` ·
`components/finance/todo/{todo-workspace.tsx,todo.module.css}` · `components/finance/money-in/{money-in-workspace,money-in-ghost}.tsx` ·
`components/finance/books/{commissions-view,project-profit,books-ghost}.tsx` · NEW `components/finance/finance-cards.tsx` + `finance-cards.module.css`.
Untouched on purpose: `components/finance/finance-settings.tsx` (Settings › Finance's module — its "Money in / Money out" group labels are B5-S's
call, see Requests), the four settings components, `books/reports-view.tsx`, `lib/finance/reports.ts`.
Checks: `tsc` clean on my files · `eslint components/finance app/finance app/company/finance lib/finance app/po` clean · `design:lint` nothing new ·
guard: none of my handles gone (the only 3 "gone" at the time were B5-R's in-progress report files) · 26 new handles.

## 1 · Built

- **5-06** (Finance + project-profit words) — tabs Needs your attention · Client payments · Costs (`lib/finance/sections.ts`, the one display map; keys,
  `/todo` · `/money-in` · `/money-out` · `?kind=` unchanged); Client payments' column **Owed → To collect** and its help "… to collect on n invoices";
  Vendors' **Owed → To pay** (+ the vendor panel's figure); Costs' help "… to pay" (was "still to pay"); Money in kind **Payments → Client payments**;
  Costs kind **Paid → Payments made**; Commission's **Payments → Commission paid**; the project Profit tile's **Cash so far → Cash in hand** with
  "Collected S$x − paid out S$y" in its tooltip. Reports' words are B5-R's.
- **5-08** — To do (now *Needs your attention*) is ONE list grouped by its section heads; no tables, no column settings. Each row is the house Row
  (`components/projects/overview/row.tsx`, the project's / Dashboard's Needs you): kind icon (approvals tinted), title in on-surface ink opening the
  record, ONE caption line that wraps (what it is · sub · project · Issued by · asked by + day / due words (red only ours-and-late) / when · amount
  sub · why — the old "What to know"), amount (`moneyCard`), ONE text verb, ⋮. Chips without counts (All · Approvals · To pay · To collect · Waiting
  on others); heads keep their count. Recently: no CAPS tag — "Invoice · HDB 5-Room — Aisha Rahman · Yesterday". A row titled by its client drops
  the client's name from the project ("Executive Condo", T-04). Empty → "You’re all caught up". Verb slot 104 wide so amounts stand in one column.
- **5-10** — phones (≤767, the house `MOBILE`) get designed cards on the Leads card model (`finance-cards.tsx`, composing `lead-cards.module.css`'s
  list + card): name (tap = open, the cell's testid) + amount · facts line (project's client · due, red when late) · status chip + words · one text
  verb + ⋮ at the LEFT (the Maison AI button floats right). Used by POs · Supplier bills · Expenses · Payments made · Vendors and all four Client
  payments kinds. To do's rows re-flow as cards on a phone (icon steps aside, verb + ⋮ on the next line at the left). The Status pill keeps its name
  on a phone ("Status: All ▾", the `short` dropped). Commission keeps the house CreditsTable cards on a phone (not redrawn — see ▲).
- **5-11** — Client payments' *Next step* names a real step only, for whoever runs the books: **Send** (a ready Draft → the project's Money `&send=1`),
  **Confirm** (a payment to confirm → `&do=confirm`), **Remind** (an invoice past its day → `&do=remind`) — doors to the Money tab's own steps, which
  keep their checks (`project-money.tsx` readArrival). The record number in on-surface ink; help "Sent invoices and Drafts ready to send." with the
  milestone rule behind *How this works* (house Tooltip on a text link). Same for the other three kinds.
- **5-12** — one grammar on every Finance list: name in ink (primary on the row's hover, `fin.ink` — unlayered over the house text link's layer),
  at most ONE text verb, the ⋮ always (Client payments got one). Commission: the member's row carries **Pay S$667.41**; a project's row only its ⋮
  (**Pay this project** first, testid `commission-pay` kept); a rate request's row ONE verb **Answer** (the approve dialog — testid
  `commission-approve` kept) with **Decline** in its ⋮ (testid `commission-decline`).
- **5-13** (touch, To do side) — a PO waiting for approval reads **Approve** on its To do row (same press: the send dialog). The record's own label
  stays "Approve and send" because `components/projects/money/project-money.tsx:151` (B3) matches `next.label === 'Approve and send'` for `&do=approve`.
- **5-25** — the facts wrap instead of "…" (`fin.wrapLine`, doubled over `money.sub`/`money.text`); Finance tables' rows grow from a 64 floor
  (`fin.grows` — `[role=row] + [role=row]`, never the head); the Bills PO column floor 150 ("PO-2026-001" whole); the Project cell starts with the client.
- **5-26** — one `ProjectCell` (`cost-tables.tsx`): client on line 1, "P-2025-001 · BTO 4-Room" on line 2 (a project named otherwise keeps its whole
  name) — Client payments, Costs (all four kinds), Commission (asks · lines · paid). `CostProject.client` and `CommissionsData.projects[].client`
  added (display only, from the lead's name). Reports' Profitability is B5-R's.
- **5-27** — one toolbar order (search · kind chips · Status pill · Issued by · end: Export / New ▾); Vendors' chips without counts; Inactive and All
  offered only while a vendor is inactive (All = Active then — nothing lost); the Status column only on Inactive / All.
- **5-28** — chip = title: Supplier bills · Payments made; Stuck → Waiting on others. (Settings' "Costs"/"Set under" words: B5-S.)
- **5-39** — Commission help one sentence + *How this works* (the rate precedence) + the Settings › Finance link kept; the signed-in member is
  "Dane (you)"; "Rate requests"; "Waiting for your answer" for whoever answers (a member's own ask still "Waiting for an answer"); "Commission paid",
  its help dropped (W-099); "To pay" for the still-owed column and tile for whoever pays (a member's own list keeps "Owed").
- **5-43** — Vendors: head **Purchase orders**; caption "Plumbing · Contractor" (code and on-site words stay on the vendor's panel "On site" line);
  GST "Charges GST" / "—"; the Status column off while the chips narrow to active; "—" for empty cells.
- **5-49** — To do: "Asked by Germaine 18 Oct" (year only when not this year, `listDay`), Recently "Today · Yesterday · n days ago" then the day
  (`recentWhen`, lib/finance/todo.ts — local; never "1d ago").
- **3-02** (touch) — the tab names in `lib/finance/sections.ts` (Client payments / Costs).
- **3-03** (touch) — `project-profit.tsx` Cash in hand (+ tooltip sum); `lib/finance/todo.ts` "to collect on".
- **3-16** (touch) — `lib/finance/profit.ts` `closingNumbersOf`: the strip reads "Margin 79% — the quote planned 24%", raised only when the quote
  planned a margin above 0; new field `belowPlan` (true/false when raised, else null) for the warning tone (B3 request). Maths unchanged.
- **W-644** — project Costs (the project's Money tab): help "Purchase orders, bills and the team’s expenses." + the PO-limit rule behind *How this
  works*; names in ink, facts wrap, "—".
- **T-08** — every "--"/"- -" I touched in Finance's lists is "—".
- **B3 confirm step (§1.2)** — To do's **Confirm** and **Check** on a client's payment open a house `ConfirmDialog` ("Confirm Ryan’s payment?" ·
  "S$13,370.04 — INV-2026-002 · Ryan says they paid. Confirm it once you see it in the studio’s account." · Cancel / Confirm); Confirm runs the same
  `confirmPayment` with its Undo snackbar.

## 2 · The ledger (moved, nothing removed)

| What | Was | Now |
|---|---|---|
| To do's five tables (Column settings per group, `finance-todo-*` column prefs) | a CreditsTable per group | one list of rows per group; every column's fact on the row's line; the tune/Column settings button has no table to set (no testid); old `om.columns.finance-todo-*` prefs simply unused |
| To do "What to know" column | its own truncated cell | the end of the row's line, in full |
| To do Issued by column (2+ entities) | a column | a fact on the row's line |
| To do Project / Asked by / Due / When / For / Invoice columns | cells | the row's line |
| To do chip counts | "All · 18", "To approve · 4" … | the section heads ("4 waiting for your approval · S$ 11,672"), the tab's count |
| To do Recently kind tag | CAPS MetaChip | words on the row's second line |
| To do verbs | "Review on Money" · "Remind on WhatsApp" · "Pay {first}" · "Approve and send" | "Review" · "Remind" (WhatsApp glyph) · "Pay" · "Approve" — same presses, same testids |
| To do Confirm / Check (client payment) | one press | the same press after a ConfirmDialog |
| Client payments "Open" (every kind) — testid `money-in-open` | a visible text button in Next step | the row's ⋮ › "Open on the project’s Money" (same testid on the menu row); the record number still opens it |
| Client payments "View receipt" — testid `money-in-view-receipt` | a visible text button | the row's ⋮ › "View receipt" (same testid); the receipt number still opens it |
| Commission project row "Pay" — testid `commission-pay` | a visible text button | the row's ⋮ › "Pay this project" (same testid) |
| Commission rate request "Decline" | a visible text button | the row's ⋮ › "Decline" (testid `commission-decline`) |
| Commission rate request "Approve" — testid `commission-approve` | text "Approve" | text "Answer" (same dialog, same testid) |
| Commission member "Pay {name} S$x" — `commission-pay-member` | "Pay Germaine S$667.41" / "Pay yourself …" | "Pay S$667.41" |
| Vendors Status column | always | on Inactive / All (every vendor on Active/Contractors is active); Merged/Inactive tags still on those lists and on phone cards |
| Vendors chips "Inactive · 0", "All · 12" | always | only while a vendor is inactive (All = Active otherwise) |
| Vendor code + "works on site" in the row caption | the row | the vendor's panel "On site" line (already there) |
| Finance lists' Status pill on a phone | "All ▾" | "Status: All ▾" |
| Money-in rule help, Commission rate precedence, project Costs' PO rule | the help paragraph | *How this works* (house Tooltip) on the same line |
| Commission "Payments" help "A reversed payment stays…" | section help | a reversed payment's own row says "Reversed — …" (unchanged) |
| Finance lists on a phone (≤767) | the house CreditsTable cards (label rows) | Finance cards (`data-card`), each keeping its row's `data-po` / `data-bill` / `data-expense` / `data-payout` / `data-vendor` / `data-row` / `data-status` / `data-project` / `data-focus` and the cells' testids |

## 3 · Words

Applied (28): W-035 (both "Supplier bills" — §2) · W-047 (Client payments / Costs) · W-099 · W-118 · W-132 · W-177 · W-216 · W-251 · W-277 ·
W-302 · W-303 · W-305 (§2: "Payments made", not "Payments out") · W-309 · W-310 · W-316 · W-317 · W-387 · W-434 · W-445 · W-460 · W-518 · W-531 ·
W-543 ("Repeats every month" — from the repeat's own words, so "Repeats every 3 months" where it is) · W-584 (To do "Pay"; Commission "Pay S$x"
per 5-12) · W-603 · W-641 (for the answerer only) · W-644 · and §2's "Approvals" for To approve.
Not applied here: W-039 (Settings › Finance card — B5-S's file; note §2 makes Finance's list "Costs", so the card's "Costs" now matches) ·
W-052 / W-070 / W-146 / W-252 / W-322 / W-323 / W-386 / W-554 (lib/finance/reports.ts — B5-R) · finance-settings.tsx's "Money in / Money out"
group labels (B5-S, Requests).

## 4 · Probe restatements (I edited no probe; exact changes for whoever runs them)

My lane's ids:
- `pm2-s44r` (B5's): lines 95 · 98 · 102 · 104 · 117 · 126 · 128 use `getByTestId('todo-…').getByRole('row')` — To do has no table rows now →
  restate to `.locator('[data-todo]')` (e.g. `p.getByTestId('todo-approve').locator('[data-todo]').filter({ hasText: 'EL-2207' })`). The texts
  ("EL-2207"), the buttons ('Approve', no Approve/Pay for Priya) and `todo-waiting` / `todo-pay` hold. Line 96's message "To do › To approve" —
  words only.
- `pm2-s17` (B5's): the Finance blocks (`finance.toolbar` · `finance.phoneTools` · `plan.sectionHead`, max 1) are kept — To do's sections still
  use `plan.section`/`plan.sectionHead`; the phone pill's ghost slot widened to the named pill (127).
- `rwd-w4` (B5's): line 117 `getByRole('button', { name: 'Change it' })` on To do at 768 still exists (the Waiting on others row's verb). 390
  `finance-reports-door` unchanged. Sideways: none at 320/390/768/1024 (checked).
- `pm2-s31` · `pm2-s09` · `pm2-s41b1` · `ux-p6`: no Finance assertion my change touches (s31's empty To do now says "You’re all caught up").

Other probes that read Finance (other lanes / unlisted — for the coordinator):
- `parity-map-build/verify-pm-a.cjs` 66 (tabs "To do · Money in · Money out" → "Needs your attention · Client payments · Costs"), 81
  (`inv006.locator('[data-testid="money-in-open"]')` → open the row's ⋮ `getByRole('button', { name: /^More for/ })` first, then
  `[data-testid="money-in-open"]` in the menu), 84 (`/Payments/` on the selected kind → `/Client payments/`), 87–89 (`money-in-view-receipt` is in a
  confirmed payment row's ⋮ — open it first).
- `parity-map-build/verify-pm-i.cjs` 97 · 197 (tab list words → the new three).
- `projects/verify-pj-gap-f2.cjs` 175 (`/Pay Michelle/` → `/Pay S\$/` on the member row), 178 (`line.getByTestId('commission-pay')` → open the
  line's ⋮ first). 169 (`commission-approve`) holds — it opens the same approve dialog.
- `projects/verify-pj-gap-f1.cjs` 300 ("Paid to" head) holds at a desk.
- `pending-modules/verify-pm2-s45b.cjs` 79 (`/^Contractors/` radio) holds — the chip reads "Contractors" now (no count).
- `dashboard-2026-10-26/verify-dash-d5.cjs` 157 (`[data-testid="todo-approve"] [data-todo="billok-…"]`) holds.
- `pending-modules/verify-pm2-s06.cjs` 179 (`[data-todo]`) holds.
- Anything matching To do's group titles "To approve"/"Stuck" or the page title "To do · Finance" → "Approvals" / "Waiting on others" /
  "Needs your attention · Finance".

## 5 · Requests (files I don't own)

- **B5-S** — `components/finance/finance-settings.tsx` (in my folder, but it is Settings › Finance's module, so I left it): its `Group` labels
  "Money in" / "Money out" → **Client payments** / **Costs** (§2), and whatever 5-23 / 5-34 decide for those caps group labels. Testids
  `finance-money-in` / `finance-money-out` must stay (verify-ks reads them).
- **B3** — `lib/projects/handover-model.ts:422` (and `lib/projects/handover.ts:168`, which copies the closing fields): carry the new
  `ClosingNumbers.belowPlan` and wear `tone: 'alert'` only when `belowPlan === true` (3-16: "warning tone only when the margin is BELOW plan"); the
  fallback caption "Expected n%" should not print "Expected 0%". Also `components/projects/money/project-money.tsx:151` keys `&do=approve` on the
  label "Approve and send" — if the project side renames its verb to "Approve", key on `next.testId === 'po-next-approve'` (or `act === 'send'`)
  instead. The project Money tab's Costs list (my `project-costs.tsx`) now draws names in ink and wraps its facts — it follows the Finance grammar.
- **B1** — ⌘K (`lib/global-search/model.ts`): add the old words to the Finance rows — "To do", "Money in", "Money out", "Paid", "Payments out",
  "Stuck", "To approve" — so a 1.0/2.0 user still finds Needs your attention · Client payments · Costs · Payments made · Waiting on others ·
  Approvals. The Dashboard's chip "To approve" (B1) → "Approvals" per §2 (dash-d2/d5 probes read it).
- **B5 main** — the Company panel's Finance badge ("4 to approve" → §2 "4 approvals") is `components/company/company-popover.tsx`.
- **B5-R** — Profitability's Project cell (5-26) can use `ProjectCell` / `projectLines` from `components/finance/cost-tables.tsx`.

## 6 · Measures (1440 unless named; before = the audit's lane-5 measures)

| Screen | words | controls | purple text | filled | caps | cut | height |
|---|---|---|---|---|---|---|---|
| Needs your attention (To do) | 295 → 320 | 43 → 44 | 20 → 16 | 1 → 1 (New ▾) | 12 → 0 | 15 → 0 | 2371 → 2217 |
| To do @390 | 112 → 131 | 22 → 22 | 8 → 5 | 0 → 0 | 0 → 0 | 2 → 0 | 5072 → 4190 |
| Client payments › Invoices | 340 → 288 | 37 → 41 | 24 → 6 | 0 → 0 | 27 → 27 | 14 → 0 | 1308 → 1347 |
| Client payments › Client payments | 353 → 273 | 36 → 34 | 22 → 4 | 0 → 0 | 39 → 33 | 20 → 0 | 1180 → 1336 |
| Costs › Purchase orders | 316 → 309 | 38 → 35 | 16 → 6 | 1 → 1 | 16 → 15 | 20 → 0 | 1024 → 1177 |
| Costs › Supplier bills | 191 → 198 | 31 → 31 | 12 → 6 | 1 → 1 | 14 → 14 | 7 → 0 | 1024 → 1024 |
| Costs › Payments made | 181 → 188 | 21 → 21 | 2 → 2 | 1 → 1 | 10 → 10 | 6 → 0 | 1024 → 1024 |
| Costs @390 | 77 → 92 | 17 → 19 | 5 → 3 | 0 → 0 | 1 → 2 | 0 → 0 | 3050 → 2786 |
| Vendors | 263 → 213 | 36 → 34 | 13 → 2 | 1 → 1 | 18 → 6 | 1 → 0 | 1180 → 1180 |
| Commission | 299 → 274 | 24 → 23 | 10 → 8 | 0 → 0 | 17 → 17 | 1 → 0 | 1592 → 1599 |

Caps left are the status tags and the table heads
(the house head style). Words grew on To do because the reasons now show whole instead of "…".
Shots: `/Users/vicky/Documents/GitHub/openmaison-prototype/.claude/calm-build/B5/shots/F-*-{before,after}-*.png` (todo 1440/1024/768/390/320,
in-invoices/payments/vos/credits 1440, in-invoices 390, out-po/bills/expenses/paid 1440, out-po 390, vendors 1440/390, commission 1440/390, xero).

## 7 · ▲ For Vicky

1. **Money on Needs your attention rows is `moneyCard` ("S$ 5,530")** — T-11 says rows and tiles; the Dashboard's Needs you says the same figure that
   way (T-17). The registers (Client payments, Costs, Vendors, Commission) keep cents — they list documents. The confirm dialog says the exact sum.
2. **To do's "Approve" vs Costs' "Approve and send"** — To do reads "Approve" (5-13), the PO list and the PO's panel still read "Approve and send":
   the project Money tab's `&do=approve` landing reads that label (B3's code). One word everywhere needs B3 to key on the testid first.
3. **Client payments' Send / Confirm / Remind show only for whoever runs the books** (Owners, Admins, Accounting) — they are doors to the project's
   Money step, and a Designer would only meet a refusal there; the record number and the ⋮ still open the project for everyone.
4. **Commission's "To pay"** — §2's "money the studio still owes" applied to the commission owed column and tile for whoever pays; a member's own
   "My commission" keeps "Owed" (it is owed to them).
5. **Commission on a phone** keeps the house CreditsTable cards (label lines) — its grouped member/project rows need their own card design; not redrawn.
6. **To do's per-group Column settings went with the tables** (no handle had a testid) — every fact a column held is on the row's line.
7. **Vendors' "All" chip** is offered only while some vendor is inactive (it equals Active otherwise).
