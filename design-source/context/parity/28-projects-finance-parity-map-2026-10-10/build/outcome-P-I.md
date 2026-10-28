# Outcome — P-I · the Accounting role (parity map build, 2026-10-10)

Built as brief-P-I.md describes, after the nine packages merged. `npx tsc --noEmit -p .` is clean (only `.next/` type stubs for the renamed
`app/qanvast-ops/page` complain — not source); `npx eslint` is clean on every file below; `npm run design:lint` passes ("nothing new breaks a
house rule"). No build, no server, no browser, no `local.db`. Register rows staged in `reg-P-I.md` (REG-P-I.1…12 — P-I.1 reverses REG-1310).
The probe is `design-source/verify/parity-map-build/verify-pm-i.cjs` (written, not run). **It needs the repair block below in the scratch DB.**

## The design in one place — `lib/settings/roles.ts` (NEW, pure, no imports)

| Predicate | Who | What it gates |
|---|---|---|
| `runsStudio` | Owner · Admin (unchanged; `lib/leads/assign-policy.ts` now re-exports it from here) | approvals, what was agreed, commission rates, every Settings rule |
| `seesBooks` | Owner · Admin · **Accounting** | every project's money, profit and margin, cost figures, bank details, all commission, the finance reports |
| `runsMoney` | Owner · Admin · **Accounting** | recording, confirming, reversing, paying, sending, correcting — never approving |
| `isAccounting` · `onLeads` · `opensWorkspace` | | Accounting is on no lead or project; opens the books only |
| `opensPath(role, path)` · `opensProjectView(role, slug)` · `ACCOUNTING_HOME` | | the one list the shell's gate, the rail, ⌘K and the project strip read |

`worksOn` (lib/projects/policy.ts) returns false for Accounting even if a stale assignment names them, so nothing that follows a project's team
reaches them; `seesMoney = seesBooks || worksOn`.

## Rules changed — before → after (the four existing roles are unchanged in every row)

| Rule (function · file) | Before | After |
|---|---|---|
| See a lead / project for the doors they have (`canSeeLead` · `visibleLeadIds` · `canOpenLead`) | O · A, else Who sees leads | **O · A · Accounting** (the pages still gate Accounting off the pipeline) |
| A project's money (`seesMoney`), the listing's money (`seesStudioMoney`) | team, O · A | + Accounting |
| Prepare / send an invoice (`preparesInvoices`) | team (incl. O · A) | + Accounting — theirs waits while Invoices need approval (`sendsAtOnce` unchanged) |
| Void an invoice (`voidsInvoices`) | O · A | + Accounting |
| Approve an invoice, mark a VO approved, revise an approved VO | O · A | unchanged |
| Record a client payment (`recordsPayments`) · reverse one (`reversesPayments`) · confirm / not received (`confirmsPayments`) | team / O · A / confirmer + O · A | + Accounting each |
| Cost figures (`seesCostFigures`) · bank details (`seesBank`) | O · A | + Accounting |
| Pay out (`paysOut`) · change / merge a vendor (`changesVendor`) · change someone else's bill or expense (cost-actions) | O · A | + Accounting (an Owner's or Admin's edit of a sent-back expense still approves it; Accounting's never does) |
| Record a bill (`recordsBill`): project · overhead | team · O · A | + Accounting both |
| Log an expense on a project (`logsExpense`) · a claim for someone (cost-actions) | team · O · A | + Accounting (theirs wait — `expenseWaits` unchanged) |
| Raise a PO (`preparesPo`) · approve a PO (`approvesPo`) · approve an expense | team · O · A | unchanged — Accounting raises none, approves none |
| A PO made elsewhere, a PO's delivery, removing a made-elsewhere record (NEW `recordsPo`) | the PO's preparers | + Accounting (`PO_RECORD_RULE`) |
| Credit notes — issue, void, refund (books-actions) · their paper's controls (`credit-paper` `manages`) | O · A | + Accounting |
| Commission: see everyone's (`fetchCommissions`) · pay (books-actions) | O · A | + Accounting |
| Commission: rates, shares, project rules, answer asks | O · A | unchanged (`BooksViewer.sets`, `readProjectCommission` reads every rate for Accounting but edits stay `runs`) |
| Xero (xero-actions `runner`) | O · A | + Accounting |
| The studio's books (`fetchBooks`), project profit (`fetchProjectBooks`), closing numbers, Money in, Money out › Paid, overhead records & files | O · A | + Accounting |
| A project's payment split (Money) | team | the editor reads `CHANGE_RULE` for Accounting (`splitFor` in money-queries); `setProjectSplit` already asks `mayChangeProject` |
| New project (`mayCreateProject`) | every member | everyone but Accounting |
| Pickers (`pickable`, `assignableIds`) | active members | active members not in Accounting |
| Settings rules (`canManage`) | O · A | unchanged — Accounting reads Settings, opens it on Finance |

## Per map row

### PR-022 · Accounting kept out of Projects (and the pipeline)
- **What changed:** the house gate `components/shell/access-gate.tsx` (NEW: `AccessGate`, `AccessGuard`, `ProjectViewGate`, `sectionOfPath`) —
  server-rendered first on `app/leads/(list)`, `imports`, `[id]/(overview)`, `[id]/[tab]`, `[id]/files/[fileId]` (after the project redirects, so a
  project's files still open), `imports/[id]/skipped` (404), `app/projects/(list)`, `app/projects/tickets`; the project's `(overview)` redirects
  Accounting to `money`; `[tab]` shows `ProjectViewGate` inside the frame for any view but Money and Files, before any view's records are read;
  `plan-picture` 404s for Accounting; `AccessGuard` wraps `AppShell`'s and the editor layout's children for every other address
  (`opensPath`). The project frame (`components/projects/project-frame.tsx`): strip Money · Files, no Stage, no filled button, no ⋮, no Create
  strip, no Maison AI suggestions, no E / A; `project-views.tsx` hides a one-view switch. The rail (`app-rail.tsx` `railItemOpens`), the phone
  (`mobile-nav.tsx`: dock Finance · Reports · Tasks · More, no Messages, no credits), the Company panel (`companyGroupsFor`, `CompanyPopover groups`).
- **Check:** View as Priya (Demo Studio › View as) at 1440 and 390 — rail / dock; `/leads`, `/projects`, `/quote-x-ray`, `/company/members` → the
  gate; `/projects/<Benjamin>` → Money; its Schedule → the view gate; G L / G P land on the gate.

### MI-007 · An Accounting role for money
- **What changed:** the rules table above (lib/projects/{policy,invoices-model,payments-model,payments,money-queries}.ts, app/projects/{money,payment}-actions.ts,
  lib/finance/books.ts); Money: Billing's views (`project-money.tsx` `admin = seesBooks`), no Variation order in New ▾, a VO / the quote open in
  Preview (`use-invoices.tsx`, `billing-section.tsx`, `project-money.tsx`).
- **Check:** as Priya on P-2026-002 Money: Record a payment on INV-2026-006 (confirmed at once, receipt, Undo); a Draft stage invoice → *Submit for
  approval* (approval is on); Void a sent invoice; a credit note; no *Variation order*; the VO's name opens its Preview.

### MO-098 · Accounting runs money out
- **What changed:** lib/finance/{rules,queries,todo,todo-server,bell,search,sections}.ts, app/finance/{po,cost,books,xero}-actions.ts,
  app/finance/doc/[id]/route.ts, components/finance/{use-costs,finance-workspace,project-costs}.tsx + todo/todo-workspace.tsx (`CostProject.records`,
  `todoGroupsFor`, `BOOKS_GROUPS`, `WAITING_WHY`, the Waiting for approval group), lib/projects/money-needs.ts (region P-B: a late delivery's row
  for whoever records it).
- **Check:** as Priya: To do = To pay · To collect · Stuck · Waiting for approval; PO-2026-008 under Waiting with "An Owner or an Admin approves
  purchase orders"; Money out's PO-2026-008 reads "An Owner or an Admin approves it" with no Approve; pay AquaFlow AF-7781; record a bill; New ▾
  has no Purchase order; Vendors show bank details; Mark delivered on a sent PO.

### FB-114 · Accounting role (Operations, Reports, re-sync)
- **What changed:** every Finance tab incl. Xero (CostViewer `runs = seesBooks`; xero `runner` = runsMoney); Commission (Pay on each line, the ask
  reads `WAITING_WHY.ask`, the rate menu hidden — `commissions-view.tsx`); Reports (`app/company/reports/{page,[tab]/page}.tsx`, `reportsHome(…, books)`);
  ⌘K (`lib/global-search/{model,queries}.ts`, `components/shell/global-search.tsx`: `ACCOUNTING_KINDS` · `scopesFor` · `accountingPage` ·
  `ACCOUNTING_JUMP_TO`, server-side kinds and hrefs); the bell (`lib/notifications/queries.ts` `moneyRunnerIds` · `bookkeeperIds`, derived bill / Xero
  rows `runsMoney`; payments.ts overdue and bell.ts late delivery `|| isAccounting`; model.ts Who words; money-actions `invoice_sent`,
  payment-actions `invoice_reminded` · `payment_to_confirm`, app/portal/payment-actions `payment_to_confirm`); Settings › Studio's fifth column
  (`lib/settings/permissions.ts`, `app/settings/studio-settings.tsx` + `.module.css`); Members (`members-view.tsx`, `members-actions.ts`, the ghost).
- **Check:** as Dane: Settings › Studio — Accounting · 1 column, *Pay commission* row; Company › Members — Priya "Keeps the books"; as Priya:
  Reports lands on Finance with numbers; Leads / Projects tabs keep their gates; ⌘K "Benjamin" → P-2026-002 opens on Money; Settings opens on Finance.

### FR-040 · An Accounting member sees only finance pages, landing on Finance
- **What changed:** `app/page.tsx` (front door: `ACCOUNTING_HOME` for Accounting; now dynamic), `view-as-popover.tsx` (a page they don't open →
  `router.push(ACCOUNTING_HOME)`), `app/settings/page.tsx` (Settings opens on Finance). 1.0 landed on Finance › Pipeline, gone in 2.0 (REG-1362) —
  To do is Finance's landing.
- **Check:** from `/leads` as Dane, View as Priya → `/company/finance/todo` with "Viewing as Priya Tan · Accounting".

## Roles to check in the browser
Dane (Owner), Hui Min (Admin), Germaine / Michelle (Designers), James (Manager): nothing changes but the words that now name Accounting (the
refusals above, Settings › Notifications' Who column, Members' help sentence, Who may do what's fifth column and its *Pay commission* row) and
Priya appearing where every member appears (Members, View as, task assignee pickers, AI credits' usage by member, the payment confirmer's member
list). Priya: everything above. Widths 1440 · 768 (the role table's six tracks) · 390.

## Probes changed (each marked "(parity map, FB-114 — a deliberate change of this rule)")
- `settings-parity/verify-st-r1.cjs` — seven `data-reach` arrays take Accounting's fifth value (`"no"` in each).
- `settings-parity/verify-st-r2.cjs:103` — `may-owner` + `"no"`.
- `price-book-parity/verify-pb-r2.cjs:182-184` — + `"no"` each.
- `view-as/verify-view-as.cjs:33 · 101` — the menu and the sheet list 8.
- `parity-map-build/verify-pm-a.cjs` — `invoice_reminded` goes to `dane,huimin,priya`, 3 rows.
- `uat-dane-2026-10-01/P2b/verify-p2b.cjs:181` — the added member's name read with `id <> 'priya'`.
- `projects/verify-pj-r5.cjs:281` — "Only an Owner, an Admin or Accounting voids an invoice".
- NEW `parity-map-build/verify-pm-i.cjs` (View as Priya: landing, rail, Company panel, Finance tabs, To do's Waiting row, the gate ×4, a row → Money,
  strip, Overview → Money, view gate, Files, a payment recorded + Undo, Money out's PO row, Reports, ⌘K scopes and a find, Settings on Finance, the
  phone's dock at 390; then as Dane: rail, tabs, To approve, the fifth column's reach for seven rows, Members' row, the Assign picker without Priya).
- Width risk to watch on the next run: `verify-st-r1.cjs:160-162` (Who may do what shows every column at 390 · 768 · 320) — the phone stacks;
  768 fits 150 + 5 × 72 within the card's ≈ 594.

## Repair text — insert as the next free number (R102 at the time of writing), after the last block

```ts
  /* ── R102 · a bookkeeper on the team (parity map P-I — PR-022 · MI-007 · MO-098 · FB-114 · FR-040, her "build everything that's in 1.0"
     2026-10-10) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     1.0 had an Accounting role; 2.0 has it now, and Demo Studio › View as needs someone to be one. Priya Tan keeps the studio's books: in
     Accounting, active, on no lead and no project (so not open to new leads), reporting to nobody, a work address that is the studio's
     accounts mailbox (never firstname@ — probes add a "Priya" with that one), a phone, a tint no one else wears. Written once by its fixed id;
     a studio's own edits to her stand. */
  console.log('\nR102 an Accounting member')
  {
    const domain = (DEFAULT_BRAND_SETTING.details.email.split('@')[1] ?? 'demostudio.sg').toLowerCase()
    const r = await client.execute({ sql: `INSERT OR IGNORE INTO members (id, name, role, color, is_you, manager_id, email, phone, accepting_leads, is_active) VALUES ('priya', 'Priya Tan', 'Accounting', '#2B8A8A', 0, NULL, ?, '91827364', 0, 1)`, args: [`accounts@${domain}`] })
    console.log(r.rowsAffected ? '  Priya Tan added in Accounting' : '  already there')
  }
```
and its check, beside the script's other verification queries (rows returned = a break):
```ts
    ['an Accounting member on a lead or a project (parity map P-I, R102)', `SELECT la.lead_id FROM lead_assignees la JOIN members m ON m.id = la.member_id WHERE m.role = 'Accounting'`],
```
Then `npm run db:baseline` (Dane stays `is_you`). Nothing else needs her: her bell rows are derived or arrive from now on; she is on no record.

## Needs from others (the orchestrator)
- **`app/settings/settings-ghost.tsx`** (yours this round): the ghost reads `?section=` and draws Studio when there is none; Settings now opens on
  Finance for Accounting — draw Finance's module for an Accounting viewer (it already draws five role columns from `ROLE_COLUMNS`).
- **`scripts/repair-demo-data.ts`**: the R102 block and check above; then re-take the baseline.
- **The loaders that draw a viewer's own layout**: `components/projects/project-ghost.tsx` draws seven tabs for an Accounting viewer (two show);
  Finance's To do ghost draws the runner's groups (To approve first) where Accounting's page shows To pay · To collect · Stuck · Waiting for
  approval. Both are a role key in their shape (`ProjectShape` / the To do ghost) — left for the ghost owner.
- **The register**: number REG-P-I.1…12; log REG-1310's reversal.

## Touched outside the brief's file list (role checks only, each a line or two)
`lib/leads/enums.ts` (`ROLES` lives here, not in `lib/company/members.ts`) · `lib/projects/{policy,invoices-model,payments-model,payments,money-needs}.ts`
· `lib/leads/{tasks,insights}.ts` · `lib/credits/queries.ts` (seats) · `app/page.tsx` · `app/(editor)/layout.tsx` · `app/portal/payment-actions.ts` ·
`app/company/members-actions.ts` · `app/company/reports/{page,[tab]/page}.tsx` · `app/settings/page.tsx` · `app/leads/actions.ts` ·
`app/projects/actions.ts` · `app/projects/{(list),tickets}/page.tsx` · `components/company/{company-popover,company-ghosts}.tsx` ·
`components/finance/{use-costs,finance-workspace,project-costs}.tsx` · `components/finance/todo/todo-workspace.tsx` ·
`components/finance/books/commissions-view.tsx` · `components/projects/money/{project-money,use-invoices,billing-section}.tsx` ·
`components/projects/{project-frame,project-views}.tsx`. Every other package had merged; none of these is on the orchestrator's do-not-edit list.

## Stand-ins
None — nothing here calls a model or a service.

## Not finished, and why (questions for Vicky)
1. **Approvals.** 1.0's Accounting approved invoices, POs and expenses, verified payments and approved milestone-completion steps (MI-007 · MO-098 ·
   FR-040). The brief keeps every approval with Owners and Admins: Accounting verifies (confirms) payments but approves nothing, and their own
   invoices, expenses and over-the-limit POs wait. Should Accounting approve money (one switch on Settings › Projects' approvals card)?
2. **The info column on Money.** The brief asks for the info column's money-relevant rows beside Money; the column draws on the Overview only and
   has no prop to show some sections — not built; the header names the project, Money names the client and contract.
3. **Files read-only.** Accounting opens a project's Files to see a proof, an invoice, a bill — and can upload, rename and delete there as the
   team does (the Files rule is Who sees leads). A read-only Files needs the Files tab's controls to know the role.
4. **Seats.** Accounting takes no AI seat (they have no AI tool), so the demo's plan numbers hold. If studios pay per person regardless, count them.
5. **Settings.** Accounting reads every module read-only (Settings' "every member opens it"), opening on Finance; hiding the others needs
   settings-view to take a module list.
6. **POs.** Accounting records a PO made elsewhere and a delivery but raises none (1.0's `managePOs` included accounting).
7. **Xero's Disconnect** stays on Company › Integrations, which is not Accounting's; Connect, the mapping, Sync now and Retry are theirs on Finance › Xero.
8. **A lead's task given to Priya** shows on her Tasks page; opening its lead lands on the gate (the task panel opens in place on /tasks).
9. **Quote Preview's own Edit / Send** reach the gate for Accounting (the editor is not theirs).
10. **To do's "Send"** on a ready invoice lands on Money with the invoice's panel, where Accounting's step reads *Submit for approval* while
    approval is on.

## Round 2 — the probe's first run on the merged build (2026-10-10)

The owner's "go ahead": approvals stay with Owners and Admins, and Accounting takes no AI seat — both kept as built (questions 1 and 4 above are
answered). `verify-pm-i` ran 52 passed · 2 failed on the merged build, and again 52 · 2 on my own run (port 3137, a copy of `base.db`; the server
stopped by its port). Both failures are app bugs, fixed in source — **they need the rebuild**:

1. **"the snackbar names her role"** — View as Priya from `/leads` pushes to Company › Finance, which crosses a route group's layout: the new
   `AppShell` mounts a new snackbar host and the sentence said before the push was lost. Fix (`components/shell/view-as-popover.tsx`): the
   sentence and the way back ride in the tab's session (`om.viewas.note`) and the new shell's View as says it once it mounts (the rail's and the
   phone's both look; the first takes it); a View as that stays put is unchanged.
2. **"its Schedule is gated inside the frame"** — the shell's net (`AccessGuard`) caught `/projects/{id}/schedule` before the page could draw its
   frame and `ProjectViewGate`, so the whole-page gate showed. Fix (`lib/settings/roles.ts`): `opensPath` lets a project's address and each of its
   views through — the page itself redirects the Overview to Money and gates the other views in the frame (the papers, the media route and the
   Files viewer keep their own rules; a floor plan's and a selection receipt's pages stay outside).

Also fixed while there (needs the rebuild): Priya's rail read **"Company (1 awaiting approval)"** — the studio's template awaiting approval, a
section she can't open. `railBadges` (`lib/leads/tasks.ts`) gives Accounting only their Tasks, the bell and Finance's own count.

**The ghosts, drawn for an Accounting viewer** (the role carried the contextual way: the app shell's seed gains `role.accounting`
(`lib/ghost-shapes.server.ts`), read live by NEW `useViewerShape` in `lib/ghost-shape.tsx` — never remembered per browser, since View as changes it):
- the project (`components/projects/project-ghost.tsx`): the strip **Money · Files**, no Stage, no filled button, no ⋮, no Create strip, no site
  bar; its address draws Money's ghost; a view they don't open draws the frame bare (its gate's notice).
- Finance › To do (`components/finance/finance-ghost.tsx`): **To pay · To collect · Stuck · Waiting for approval** and their chips.
- Settings (`app/settings/settings-ghost.tsx`): opens on **Finance** when the address names no module.
- Accounting's project **Files** now passes no view switch (`app/projects/[id]/[tab]/page.tsx`), so the page and its ghost both read "All Files".
Every other role's ghost is unchanged — except one correction that is everyone's: Settings › Studio's ghost role table now takes the page's five
role tracks (`own.roles`; `studio-settings.module.css` reads the head and rows structurally, so the page and the ghost share one rule). It drew
five columns of bones in four tracks once `ROLE_COLUMNS` grew.

Checks: `npx tsc --noEmit` clean, `npx eslint` clean on every file above, `npm run design:lint` passes. Expected after the rebuild: 54 · 0.

## Round 3 — two Projects probes after the rebuild (2026-10-10)

`verify-pm-i` 54/54. Two existing probes regressed:

1. **`projects/verify-pj-r5.cjs` "a Designer can't void — the row says why"** — mine. The probe already reads the rule's new words (REG-P-I.3),
   but the Money tab's Void row hard-coded the old sentence. The rule for Dane, Hui Min, Germaine and Michelle is unchanged (a Designer still
   can't void). Fix (**needs the rebuild**): the screen now says the server's words — `VOID_RULE` and `SEND_RULE` in
   `components/projects/money/use-invoices.tsx`, `REVERSE_RULE` in `payments-section.tsx`, `MONEY_RULE` as `moneyContext`'s default in
   `lib/projects/payments.ts`.
2. **`projects/verify-pj-gap-a.cjs` "Error page"** — not a role gate. The step renames `lead_file_renders` on the premise that "only the project's
   page reads it — its shell does not". P-F's CP-099 (`lib/portal/home.ts:63`, `loadHomeFacts`) now reads it whenever a file is shown to a client
   (the demo shows one), and the shell's rail count reaches it: `railBadges` → `countProjectsNeedingAttention` → `fetchProjectRows` →
   `fetchPortalFacts` (`lib/portal/waiting.ts`) → `loadHomeFacts`. So the layout fails and the root's notice shows. Checked on 3137:
   `floor_plan_comments` is read by the project's page alone — the module's own header with Back to Projects, the shell whole elsewhere. Fix for the
   orchestrator: the probe's two renames at lines 306 and 312 → `floor_plan_comments` (a probe change of its premise, not of a rule); or, app-side
   in P-F's file, skip the renders read in `loadHomeFacts` when the caller wants only the waiting facts.
