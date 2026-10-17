# Package F2 — money out: the books · outcomes (gaps build, Phase B, 2026-10-07)

Brief: `scratchpad/build2/brief-f2.md` · the read and the calls: `f2-read.md` (F2-Q1…Q16, as recommended on the owner's instruction of 2026-10-07).
Port 3127 · repair R84 · probe `design-source/verify/projects/verify-pj-gap-f2.cjs` · register rows `reg-f2.md`.

Running file (protocol §5). Status words: **Built (code)** = written, tsc clean · **Verified** = the probe passed on it at 1440 and 390.

| # | Item (brief) | Outcome | What / where |
|---|---|---|---|
| 1 | Profit and margin per project (Owners / Admins) | Verified | `lib/finance/profit.ts` (`profitOf`, tiers, early estimate, cash so far); Money tab `components/finance/books/project-profit.tsx` in `ProjectCosts`' `books` slot; listing Margin column (off at first) `project-columns.tsx` + `profitsFor`; Overview Profit row; Pipeline. Server: `fetchProjectBooks` / `fetchBooks` hand figures to Owners and Admins only. |
| 2 | Commission (rules, accrual, splits, Commissions list, change requests, payouts) | Verified | `lib/finance/commission.ts` (`commissionsOf` worked out, versions, shares); actions in `app/finance/books-actions.ts`; Finance › Commissions `commissions-view.tsx` + `commission-dialogs.tsx`; Settings › Finance › Commission `books-settings.tsx`; tables commission_rules · _shares · _requests · _payouts; bell asked / answered / paid; Activity paid / reversed (member-own filter). |
| 3 | Credit notes (against an invoice, the to-credit band, the client sees it) | Verified | `credit_notes`; `credit-model.ts` · `credit-records.ts` · `credit-paper.ts`; `moneyOf` counts them (balance, Credited, to credit, refund due); Money tab `credit-notes.tsx` (invoice ⋮, the band filled in, Void, Record the refund, the to-refund band); paper page + Files entry; portal Money lines + page + client bell; Settings › Finance › Credit notes numbering. |
| 4 | Studio Finance pages (Overview: working capital, money to verify, stuck; Pipeline) | Verified | `overview-view.tsx`, `pipeline-view.tsx` on `BooksWorkspace`; tabs first for Owners and Admins; ghosts `books-ghost.tsx`. |
| 5 | Reports (P&L, AR / AP aging, profitability, cash flow, vendor spend, commissions, client statement; export) | Verified | `lib/finance/reports.ts` (`buildReport`, `reportSheet`); `reports-view.tsx` with the house ExportDialog (CSV · XLS · XLSX · PDF), the period, the statement's project; address-kept choice. |
| 6 | Xero (connect, organisation, mapping, push, sync log — simulated) | Verified | `lib/finance/xero.ts` · `xero-server.ts` (`pushToXero`, `autoPushXero`, derived bell row); `app/finance/xero-actions.ts`; `accounting-view.tsx`; Integrations' Xero row → Accounting. |
| 7 | Insights (rule-based, no metered press) | Verified | `insightsOf` (nine rules, worst first, five shown) on the Money tab and Finance › Overview. |
| 8 | Accounting role (F-16) | Not built — by call F2-Q14 | Held as F-16 held it: Owners and Admins run money; a bookkeeper works in Xero and from the exports. |

## Progress log
- Sync done; base tree `pkg-f2/base-tree.txt` = 661d13de74a6b85c745bd7602ef9a99aed100065. node_modules cloned; scratch DB `pkg-f2/test.db` from base.db.
- Step 1 read written (`f2-read.md`, calls F2-Q1…Q16).
- 2026-10-08 (resumed by a fresh agent): what exists from the first agent — schema (lib/db/schema.ts +157, both baseline lists),
  `drizzle/0077_giant_zarda.sql`, the library layer `lib/finance/{books,commission,credit-model,credit-records,profit,reports,xero,xero-server}.ts`,
  edits to `lib/projects/money{,-queries,-visibility}.ts`, `lib/notifications/{model,queries}.ts`, `lib/leads/{activity,events}.ts`,
  `lib/projects/events.ts`. No actions, pages, UI, repair rule, probe or register rows yet. Next: type-check, then actions → UI per item.
- 2026-10-08: tsc clean on the first agent's lib. Written: `app/finance/books-actions.ts` (credit notes issue / undo / void / refund + numbering;
  commission rules · shares · payouts · reverse · asks · answers), `app/finance/xero-actions.ts` (connect · organisation · mapping · auto-map ·
  auto · sync · retry · disconnect), `autoPushXero`, `creditOfFile`; event kinds `project_commission_paid|reversed` (+ Activity branch, member-own
  filter); Finance tabs Overview · Pipeline (first, runners) · Commissions · Reports · Accounting (`lib/finance/sections.ts`, `financeHome(runs)`),
  the route `app/finance/[tab]/page.tsx` → `BooksWorkspace` (next), `/finance` lands per role.
- 2026-10-08: the books UI written, tsc clean — `components/finance/books/` (`books-workspace.tsx`, `overview-view.tsx`, `pipeline-view.tsx`,
  `commissions-view.tsx` + `commission-dialogs.tsx`, `reports-view.tsx` (house Export), `accounting-view.tsx` (Xero), `books-ghost.tsx` hooked in
  `finance-ghost.tsx`, `books.module.css` composing money / finance / integrations styles). Next: the project Money tab (profit, insights, credit
  notes, the to-credit band), the credit-note paper + portal + Files, Settings cards, listing Margin, Overview Profit line, search, R84, probe.
- 2026-10-08: the project side written, tsc clean — Money tab: `ProjectProfit` (Profit · Margin · Cash so far + What the numbers say) in
  `ProjectCosts`' new `books` slot (+ `id="costs"`), `useCreditNotes` (list, Issue from the invoice ⋮ and the to-credit band filled in, Void,
  Record the refund, the to-refund band) wired into `project-money.tsx`; the paper `credit-note-paper.tsx` + studio page
  `app/(editor)/projects/[id]/credit-notes/[creditId]` + portal page `app/my/[slug]/money/credit/[creditId]` (`PortalDoc credit`), the portal
  Money stage's credit lines, the client's bell row `credit_issued`, Files › Payments entries redirect to the paper (`creditOfFile`), the
  portal's owed / paid figures count credit notes (`payments-portal.ts`, 3 lines each).
- 2026-10-08: Settings › Finance › Commission + Credit notes cards (`books-settings.tsx`, `fetchBooksSettings`), the listing's Margin column
  (off at first, money column; `profitsFor` in `lib/projects/queries.ts`), the Overview Money card's Profit row, Integrations' Xero row → Accounting,
  search (five Finance pages + credit notes by number, `lib/finance/search-books.ts`), Who may do what (six rows). tsc clean. Next: R84, build, probe.
- 2026-10-08: R84 written (+15 checks; R82's PDF check and REG-613's kind list learn the books' records) — passes on the scratch DB, idempotent
  (0 rows on the second run). Build passes; :3127 serves every page (look shots checked: Overview, Pipeline, Commissions, Money tab, the paper,
  Reports, Accounting, Settings). Fixes after the look: Margin "--" while an early estimate, "S$x credited" under the invoice's status, PayNow keeps
  its capitals in sentences (`methodInLine`), the shares dialog's honest line. Register rows `reg-f2.md` (17). Next: the probe.
- 2026-10-08: probe `design-source/verify/projects/verify-pj-gap-f2.cjs` written (10 sections, cleanup asserts the DB as it was); tsc · eslint ·
  design:lint clean; rebuilding for the probe run.
- 2026-10-08: first probe runs 71/72 then 67/72 — the probe's Xero assertion was wrong (a credit note made void before Xero ever had it is not
  pushed — the lib's rule; the probe now asserts that), and `/finance` was prerendered at build (○) so it landed by whoever was signed in at build
  time → `export const dynamic = 'force-dynamic'` (F1's landing had the same latent bug). Cosmetic: the issue dialog's invoice choice no longer
  repeats "left"; Pipeline's Collected column wider. Rebuilding for the final runs.
- 2026-10-08: CN-2026-002 moved (R84) to Benjamin's paid Commencement invoice INV-2026-004 — on INV-2026-006 it changed r6's asserted
  figures for that invoice; on a paid one it also shows the to-refund band. Scratch DB re-made from the pre-R84 copy; R84 passes, idempotent.
- **Verification (final build):** `verify-pj-gap-f2.cjs` **73/73** (1440 + 390); existing probes on fresh copies: gap-f1 81/81 (its landing
  assertion updated — F2-Q1 deliberately lands an Owner on the Overview), r6 79/79, gap-b 72/72, r5 90/90, fix-D 35/35, fix-F 44/44, r1 83/83
  (the last five run before CN-2026-002 moved; re-run after — see the hand-back). tsc · eslint · design:lint clean. Shots `design-source/verify/projects/gap-f2/`.

## Lines changed in files other packages own (minimal, for the merge)
- `lib/projects/money.ts` · `money-queries.ts` (first agent): credit notes in `moneyOf` (balance, Credited, to credit, refund due). `money-visibility.ts`:
  `project_credit_` · `project_commission_` are money kinds.
- `lib/projects/payments-portal.ts`: owed = `balanceMinor − toConfirm`, paid counts credit notes (3 + 3 lines), stages carry `credits`.
- `components/projects/money/project-money.tsx`: `books` prop, `useCreditNotes`, the band's action, the to-refund band, the Credit notes table, the
  invoice ⋮'s Issue a credit note, "S$x credited" under an invoice's status; `money-hidden-page.tsx`: kind `credit_note`.
- `components/finance/project-costs.tsx` (`books` slot, `id="costs"`), `finance-ghost.tsx` (books' shapes), `finance-settings.tsx` (two cards, the
  help line, a Commissions link), `lib/finance/sections.ts` (five tabs; `financeHome(runs)`), `app/finance/page.tsx` (force-dynamic — it was
  prerendered at build), `app/finance/[tab]/page.tsx`.
- `components/portal/money/portal-money.tsx` · `portal-doc.tsx`, `lib/portal/notifications{,-model}.ts` (the client's credit row).
- `app/projects/[id]/[tab]/page.tsx` · both file pages (credit note entries redirect), `app/settings/page.tsx` · `settings-view.tsx` (booksSettings),
  `lib/projects/queries.ts` · `model.ts` (ProjectRow.profit, detail money.profit), `components/projects/project-columns.tsx` (Margin, hidden),
  `project-overview.tsx` (Profit row), `components/company/integrations-view.tsx` (Xero row → Accounting), `lib/settings/permissions.ts` (six rows),
  `lib/global-search/{model,queries}.ts` (pages, credit notes), `lib/leads/activity.ts` (commission branch + member-own filter), events kinds.
- `scripts/repair-demo-data.ts`: R84 + 15 checks; R82's "PDF with no bytes" check learns credit notes; REG-613's kind list learns the five kinds.
- `design-source/verify/projects/verify-pj-gap-f1.cjs`: the landing assertion (Overview first since F2).
