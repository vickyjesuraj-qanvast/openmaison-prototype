# S06 · Finance leftovers — outcome (2026-10-11)

Card: `held:finance` (Finance) + the steps' notes after S01…S05. 1.0 read: `src/components/finance/ExpenseDialog.tsx` (the *Recurring expense*
tick — `expenses.is_recurring`, only an icon in `ExpenseList.tsx`; nothing ever logged the next one), `src/app/(main)/accounts/page.tsx`
`ExpenseCategoriesEditor` + `src/app/api/finance/records/expense-categories/route.ts` (add · remove · the Overhead / Project mark; "Past expenses
tagged with it keep the tag; new expenses can no longer pick it"), `src/lib/accounting/auto-map.ts` · `mapping-candidates.ts` (categories → Xero
accounts), `src/lib/access-control.ts` (`accounting`: finance + expense actions, `managePOs: admin || accounting`, `approveExpenses: owner ||
accounting`), `src/components/finance/{InvoiceDetail,PODetail,ExpenseList}.tsx` (1.0's approvers included Accounting).
Register rows: `steps/reg-S06.md` (REG-S06.1…14). Probe: `design-source/verify/pending-modules/verify-pm2-s06.cjs` (**83 / 83**); shots
banked in `design-source/verify/pending-modules/pm2-s06/`.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| Real Xero (OAuth, an organisation per entity, mapping, queue with retries, five-minute sync, expiry alert) | **Stand-in kept** — the developers' lane (F2-Q13); Finance › Xero stays simulated. Its mapping now has a row per category the studio keeps (below) | — |
| Zoho Books / QuickBooks | **Kept** — Coming soon in Integrations (1.0 showed them as coming soon too) | — |
| AI reading of supplier bills and invoice scans | **Stand-in kept** — text PDFs by rule (F1-Q10); the model is the developers' | — |
| **Recurring expenses** — dropped, revisit | **Built** — Repeats on the expense (week · month · 3 months · year); the rule on the series' first expense; the next one logged by rule, lazily on read (idempotent, never twice — unique (series, day) + compare-and-set, one-statement writes retried on a lock, one run per server at a time); each logged one a full record with its Activity line and, when it waits, the approvers' bell; the row / panel / Costs say it; Stop repeating with Undo; a change of rhythm; removing the first one stops it (said, Undo); a handover stops a project's repeats (said on Activity) | `lib/finance/repeats.ts` (new, pure), `lib/finance/repeats-server.ts` (new, `raiseDueRepeats`), `lib/db/schema.ts` + `drizzle/0090_finance_s06.sql`, `lib/finance/{model,costs,queries,todo-server,xero-server}.ts`, `app/finance/cost-actions.ts` (`saveExpense` `repeat`, `applyRepeat`, `stopExpenseRepeat` · `undoStopExpenseRepeat`, `removeExpense` `stopsRepeat`), `components/finance/{expense-dialog,use-costs,cost-tables,project-costs}.tsx`, `lib/projects/events.ts` (`project_expense_repeat`), `lib/leads/activity.ts` |
| **Expense categories the studio edits** — dropped, revisit (Reports group by category) | **Built** — Settings › Finance › Money out › Expense categories (Trades card grammar): add · rename (expenses + Xero account follow) · move · remove with Undo (expenses keep it); the dialog and the server read the studio's list; Reports group by it; Xero's mapping a row per category, a new one mapped at once while connected | `lib/finance/expense-categories.ts` (new, pure), `components/finance/expense-categories-settings.tsx` (new), `components/finance/finance-settings.tsx`, `app/settings/{page,settings-view}.tsx`, `lib/finance/queries.ts` (`fetchExpenseCategories` · `expenseCategoryCounts`), `app/finance/cost-actions.ts` (`setExpenseCategories` · `renameExpenseCategory`), `lib/finance/xero.ts` (`accountKeysFor` · `hintedAccount`, `ACCOUNT_KEYS` unchanged for the eleven), `lib/finance/xero-server.ts` (`fetchAccountKeys`), `app/finance/xero-actions.ts`, `components/finance/books/accounting-view.tsx` |
| Expense verification track, vendor kind and default markup, several profit readings, an AI PO-vs-quote compare, commission at creation | **Kept** (package calls, the card says keep) — the books, Reports and the project's commission dialog do their jobs | — |
| **The PO paper's acceptance block off by default** (REG-1580, flagged) | **Built as recommended — on by default**, as 1.0 printed it; a studio that switched it off keeps it off | `lib/finance/rules.ts` (`DEFAULT_PO_PAPER`, `parsePoPaper`), `components/finance/po-paper-settings.tsx` |
| **Accounting leftovers** (approving · raising POs · read-only Files · Settings limited to Finance; P-I questions 2·3·5·6) | **Approvals kept with Owners and Admins** (his "go ahead" of 2026-10-10 answered P-I Q1 — the build README records it; segregation of duties). **Built:** Accounting raises POs (theirs over the limit wait) · a project's Files read-only (server refusals + no write control + its ghost) · Settings is Finance alone (no strip, only links they open) · the quote Preview read-only for them · To do's send step reads *Submit for approval* for them. **Kept:** the info column beside Money (Q2 — Money's head names the project, its rows the client and the contract), Xero's Disconnect on Integrations (Q7), a lead task given to them (Q8) | `lib/finance/rules.ts` (`preparesPo` · `recordsPo` · `PO_RULE`), `lib/settings/permissions.ts` (po-prepare · po-send · files-change), `components/finance/use-costs.tsx`, `app/leads/files-actions.ts` (`readsOnly`), `lib/leads/files.ts` (`readOnly`), `components/leads/files/{lead-files,files-toolbar,files-grid,files-table,files-empty,file-viewer,file-comments-panel}.tsx`, `components/leads/detail/tab-ghosts.tsx`, `app/settings/{page,settings-view,settings-ghost}.tsx`, `components/projects/money/invoice-settings.tsx`, `components/quotes/preview/quote-preview.tsx`, `app/(editor)/quotes/[quoteId]/preview/page.tsx`, `lib/finance/{todo,todo-server}.ts`, `components/finance/todo/todo-workspace.tsx` |
| **'Where costs go' has no DS category palette** (REG-1577, flagged) | **Built as recommended** — a house categorical palette from the DS's own ramps, validated (dataviz six checks: all pass on white), four hues + Other's grey, never red | `components/om/category-palette.module.css` (new), `lib/chart-palette.ts` (new), `components/finance/where-costs-go.tsx` (+ css) |
| Margin alerts across projects, the One-Click Profit card, a revenue KPI | **Held** (N-02, his call) — Reports has the numbers | — |
| Bank feed / matching transfers | **Stand-in kept** — developers and OpenMaison ops | — |
| DuitNow, multi-currency, the FX job | **Held** (DEF-30) — S33's | — |
| (found) the first build of the lazy raise in a transaction: SQLITE_BUSY / "cannot commit — SQL statements in progress" when the rail's count and the page read at once | **Fixed** before handing back — no transaction; the day's insert (unique) first, then the compare-and-set; every write retried on a lock; one run per server | `lib/finance/repeats-server.ts` |
| (found) a rhythm set on a logged expense whose first one was removed would have pointed at the removed one | **Fixed** — refused with the reason ("Its first expense was removed — bring it back to repeat it again, or log a new one that repeats") | `app/finance/cost-actions.ts` |

## Files
New: `lib/finance/{repeats,repeats-server,expense-categories}.ts`, `lib/chart-palette.ts`, `components/finance/expense-categories-settings.tsx`,
`components/om/category-palette.module.css`, `drizzle/0090_finance_s06.sql` (+ meta), the probe and `pm2-s06/`. Changed: the table's last
column; also `lib/db/schema.ts`, `scripts/repair-demo-data.ts` (R108 + three checks). For CLAUDE.md's Map (the orchestrator's): a repeating
expense = `expenses.repeat_*` + `lib/finance/repeats.ts` (pure: `repeatDay` · `repeatAfter` · `firstRepeat`) + `raiseDueRepeats` (called by
`loadCostRecords`, `countFinanceToApprove`, `xeroItems` — the seam a real scheduler would call); `ExpenseView.series`; the studio's categories =
settings key `expense_categories` (`fetchExpenseCategories`, `accountKeysFor` for Xero); the house chart palette = `category-palette.module.css`
+ `lib/chart-palette.ts`; Accounting reads Files (`LeadFilesData.readOnly` · `FileViewData.readOnly`, `readsOnly` in files-actions), Settings
`onlyBooks`, Preview `readOnly`, To do `sendsNow`.

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
- **Recurring expenses inside Money out's expenses** (his steps line): a field on the expense, never a page or a rail item; the rule on the first
  expense; logged lazily on read like the credits month (no scheduler in a prototype); the first logged day is after the later of the
  expense's day and today (no surprise past days); a logged one copies the latest before it (so a price change carries on) but never receipts;
  it waits or counts by its maker's own rule.
- **1.0's Overhead / Project mark on a category is not carried** — a 2.0 expense says that itself (Project, or the studio's overhead); the
  mark only labelled 1.0's picker.
- **PO acceptance on by default** (1.0's default; "without losing anything").
- **Accounting approves nothing** (his "go ahead" 2026-10-10, P-I Q1; S04 kept quote approvals owner-only the same way) — **raises POs**
  (1.0's `managePOs`; theirs wait over the limit), **reads Files** (the card's "revisit"), **Settings is Finance alone**, **Preview
  read-only**; the info column on Money not added (Money's own head and rows carry it).
- **The palette** from the DS's own tokens, in one file, red left out — still Vicky's to replace with a DS chart palette.

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440:** Company › Finance › Money out › Expenses — *Design software subscription* twice (5 Sep · 5 Oct), "Software · Every
  month", the October one "Logged by its repeat"; open it → Repeats "Every month · next on 5 Nov ’26", *This repeat* lists both. Ryan
  D'Souza › Money › New › Expense: Repeats › Every week → "Next on {a week on}, then every week — …"; Log expense → "S$… logged — it repeats
  every week, next on …"; its row says "Every week"; ⋮ › Stop repeating → Undo; ⋮ › Edit → Repeats › Every month → "For the whole repeat —
  next on …" (once something was logged); ⋮ › Remove the expense → "— it won't repeat any more" → Undo. Settings › Finance › Money out ›
  Expense categories: add "Rent" (Log an expense offers it), press it → rename (its expenses follow), × Meals → Undo; with Xero connected
  (Finance › Xero › Connect), the mapping lists "Expenses — Rent". Settings › Finance › The purchase order paper: the acceptance block is on;
  PO-2026-003's paper prints it. Ryan's Money › Where costs go: four hues + grey, no red.
- **Michelle (Designer):** her repeating expense waits; when its day comes (time made to pass in the record) Dane and Hui Min hear "Michelle’s
  repeating expense of S$… is logged for {day}" and it is on To do.
- **Germaine (Designer):** Settings › Finance's categories read only (no Add, no ×).
- **Priya (Accounting):** Settings has no module strip, opens Finance with links Vendors · Commission only; Money out › New and Benjamin Han
  › Money › New offer *Purchase order*; Benjamin › Files: no New File / New Folder / ⋮, a press opens, ⋮ = Open · Download, list view with no
  selection column, the viewer with Download and comments to read; Benjamin's signed quote from Money → Preview with no Send / template
  change, Back → Money; To do's ready invoices read *Submit for approval*.
- **390 / 320:** Money out › Expenses (cards say "Every month"), Log an expense as a sheet with Repeats, Settings › Finance's categories card
  — no sideways scroll against `screen.width`.

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate 0090 + repair R108) with `next start -p 3160`; :3160 stopped after.
`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 17 warnings are older files') · `npm run design:lint` nothing new
· `npx next build` green.

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s06.cjs`** (this step, 11 sections) | **83 / 83** — the page error log empty; the scratch DB left as found (a full `.dump` before and after a second run: no difference) |
| `pending-modules/verify-pm2-s01…s05.cjs` | 79 / 79 · 105 / 105 · 79 / 79 · 82 / 82 · 113 / 113 |
| `parity-map-build/verify-pm-a · b · c · i` | 47 / 47 · 47 / 47 (after the deliberate change below) · 36 / 36 · 54 / 54 (after the deliberate change below) |
| `projects/verify-pj-gap-f1 · f2` | 85 / 85 · 84 / 84 |
| `simplify-projects-finance/verify-ks` · `reports-in-company-2026-10-08/verify-reports` | 29 / 29 · 41 / 41 |
| `settings-parity/verify-st-r1 · r2` (port rewritten to 3160, as the regression harness does) | 57 / 57 · 30 / 30 |
| regression harness on 3160 (a run dir made from this step's DB, never local.db): `folders-files` · `overlays` · `dane-p3` · `view-as` · `ghosts-same` 1440 · 390 · `first-run-full` · `first-run-empty` | 16 / 16 · 67 / 67 · 71 / 71 · 23 / 23 · 51 / 51 · 51 / 51 · 6 / 6 · 89 / 89 |
| `projects/verify-pj-r3 · r7` · `simplify-projects-finance/verify-r2e` · `projects/verify-pj-gap-e` (expenses, Files) | 90 / 90 · 67 / 67 · 25 / 25 · 55 / 55 |
| `npm run design:anatomy` (on the scratch `next start`) | all 1558 measures hold |

**Assertions changed as deliberate changes of their rule** (each commented `(pending modules, a deliberate change of this rule)`):
`parity-map-build/verify-pm-b.cjs` switches the PO paper's acceptance block on only if it finds it off (it is on by default now);
`parity-map-build/verify-pm-i.cjs` reads Accounting's Settings as Finance alone (no module strip).

## Migration and repair
- **Migration 0090 `finance_s06`** (additive): `expenses.repeat_every` · `repeat_next` · `repeat_of` · `repeat_stopped_at` ·
  `repeat_stopped_by`; unique index `expenses_repeat_day_idx` (repeat_of, spent_on); index `expenses_repeat_next_idx`. No new table — the
  baseline lists are unchanged.
- **Repair R108** — the design software subscription repeats every month (October's logged by its repeat, the next on 5 Nov); three checks
  in the closing list. On the demo: "1 logged by its repeat, the next on Thu Nov 05 2026"; again: "already in step"; full repair: all checks pass.
  After `npm run db:baseline` the base keeps the series; restored on a later day, the first read logs the months that came since (by rule).

## For the next steps
- **The orchestrator:** a scratch DB read on 11 Oct rolls the AI credits month (the demo's period ended 11 Oct) — the app's own lazy roll,
  not this step's (S19 holds "the demo credits month riding the demo day on restore"). The project frame's "Projects /" crumb and Back still
  lead Accounting to the house gate when a project is opened directly (P-I's); from Finance's rows `?from=` brings them back — not changed.
- **S10 (mAIson):** "what repeats" / "stop the rent" could act through the expense panel (Stop repeating) — the words-only rule stands.
- **S14 (Settings and Company):** Settings › Finance › Money out gained Expense categories (`CATEGORIES_RULE`, Owners and Admins).
- **S34 (real services):** `raiseDueRepeats(now)` is the seam a real scheduler calls (it is idempotent); Xero's mapping rows now come from
  the studio's categories (`fetchAccountKeys`).
- **Developers (1.0's port):** 1.0's `is_recurring = true` has no rhythm — port it as `repeat_every = 'month'` with `repeat_next` = the first
  monthly day after the port day; 1.0's `expense_categories` (active, in `order_index`) → settings `expense_categories` (names only — the
  Overhead mark is not carried); a category's Xero account → `xero.accounts['exp:<name>']`.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for these; built on the screens that exist (the expense dialog's fields, the
   house panel's facts and lists, the Trades card, the list-entry dialog, the Files tab's own pieces with fewer controls); every invented line in
   REG-S06.1…12; the palette is written down as Vicky's to replace.
2. **One system, no one-offs** — house pieces only (`TextField` select, `CostPanel` `lists`, `ListEntryDialog`, the Trades tokens, `PortalMenu`,
   the snackbar's Undo, the folder pieces' "no selection" mode, the ghost kit); the palette is one house file of DS tokens; `design:lint` holds.
3. **Plain words** — "Repeats · Every month", "Next on 18 Oct ’26, then every week — the same amount, category and vendor", "Logged by its
   repeat", "Stop repeating", "won’t repeat any more — what was logged stays", "Rent is now Studio rent — its expense follows".
4. **Nothing is lost** — Stop repeating, a removed first expense, a removed category: each with Undo; a removed category stays on its expenses;
   what a repeat logged stays when it stops; a rename carries the expenses and the Xero account.
5. **Say why** — the refusals in the rule's words (`REPEAT_RULE`, `CATEGORIES_RULE`, the Files reader's rule, "Its first expense was
   removed…"); a taken category name under the field; the helper says what a repeat will do before the save.
6. **Back returns where you came from** — Accounting's Preview Back returns to the Money it came from; the Settings links keep `?from=`.
7. **Every screen is whole** — no new page; the Settings ghost draws Accounting's Finance alone, the Files ghost draws Accounting's read-only bar;
   the categories card's empty / read-only looks; the Files empty state for a reader.
8. **Every width is designed** — 1440 · 1024 · 768 · 390 · 320: the dialog is a sheet on a phone with Repeats in its order, the tokens wrap,
   the expense cards carry the words; no sideways scroll against `screen.width` (probe section 11).
9. **Tables follow the leads listing** — the expense tables keep the house model (the words ride the sub-line); the Files list without a
   selection column for a reader drops its leading track (the folder pieces' rule for a viewer with nothing to do in bulk).
10. **Motion with purpose** — none added; the house dialog, sheet and snackbar timings.
11. **Honest data** — every logged expense is a record with its maker, its series, its Activity line and (when it waits) its bell; R108 backs
    the demo's October expense; the categories' counts are the records'; Xero stays an honest stand-in; nothing metered, no model.
12. **Reach for everyone** — labelled fields (Repeats, Add a category), named buttons ("Remove Meals", "Rename or move Rent"), the menus by
    keyboard, the panel's list rows with their own menu label.
- **How to add a missing thing** — one home each (the expense itself for its repeat, Settings › Finance › Money out for the categories, the
  PO paper card's default, the existing Files / Settings / Preview for Accounting); shown only when it applies (the repeat words only on a live
  repeat, Stop repeating only for its maker and the money runners, This repeat only with two or more, Accounting's controls only where they
  act); one filled button per row (unchanged); defaults that need no set-up (Doesn't repeat, the eleven categories, acceptance on as 1.0).
