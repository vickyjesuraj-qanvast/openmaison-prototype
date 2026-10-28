# Package K-S — Settings + the listing's review scope: outcome (2026-10-09)

Builds **S-15** (one Settings home for money rules + one Document numbers card) and **S-20**'s Settings card and listing scope (*What waits
for an Owner or an Admin*; *Needs my review* counts every kind). Register rows staged in `reg-K-S.md` (REG-K-S.1 … K-S.5). `npx tsc` clean for
every file here (the remaining errors are other packages' work in progress: `project-money.tsx`, `needs-list.tsx`, `[tab]/page.tsx`);
`npx eslint` clean on every file I touched; `npm run design:lint` — nothing new breaks a house rule (baseline untouched). No build, no server,
no DB writes. **No repair needed** — every value comes from settings keys and records that already exist.

## Files

- **New**
  - `lib/settings/document-numbers.ts` — pure: `DOC_KINDS` · `DOCS` (label, noun, icon, "Numbered when …", the example's test id) ·
    `DocumentNumbering` · `DocumentNumbersInput` · `DocumentNumbersData` · `DOCUMENT_NUMBERS_RULE` · `nextDocNumber` · `cleanPrefix` ·
    `prefixClash` (no two documents or entities share a prefix).
  - `app/settings/document-numbers-actions.ts` — `setDocumentNumbers(input)`: Owners/Admins (`{ error: DOCUMENT_NUMBERS_RULE }`), every
    pattern through its block's own parser (`parseInvoiceNumbering` · `parseReceiptNumbering` · `parseCreditRules` · `parseCostRules`), fix-D
    D-31 kept for invoices and receipts, the clash checked before anything is written, then the same keys today's blocks wrote:
    `invoice_numbering` · `receipt_numbering` · `credit_note_rules` (numbering only) · `cost_rules` (numbering only, the rest kept) · and
    `invoice_numbering_entities` only when the card sent entity prefixes (two entities or more). Revalidates `/settings`, `/projects` (layout),
    Finance (`touchCosts()`).
  - `app/settings/document-numbers.tsx` (+ `document-numbers.module.css`, tracks only) — the card.
  - `app/settings/owner-approvals.tsx` — S-20's card (`OwnerApprovals`, `OwnerApprovalsData`, a generic `RuleRow`).
  - `design-source/verify/simplify-projects-finance/verify-ks.cjs` — this package's probe (not run; see below).
- **Mine, edited**: `app/settings/projects-settings.tsx`, `app/settings/settings-view.tsx`, `app/settings/settings-ghost.tsx`,
  `components/finance/finance-settings.tsx`, `components/finance/cost-settings.tsx`, `components/finance/books/books-settings.tsx`
  (`CreditSettings` is now the info card), `components/projects/money/{invoice-settings,invoice-paper-settings,payments-settings}.tsx`,
  `lib/settings/permissions.ts` (RULE_PLACES), `lib/settings/modules.ts` (a comment), `components/projects/scopes.ts`,
  `lib/projects/queries.ts` (listing region only: three import lines after `profitsFor`, `costApprovalsBy`, `approvalsOf`, the `approvals`
  field on each row — `answersSchedule` imported **as `answersAsks`** because K-N's region imports it too).
  `app/settings/module-head.tsx` and `app/settings/actions.ts` needed no change.
- **Outside the list, small and additive (please note in the merge):**
  - `components/projects/updates/update-review-setting.tsx` (owned by no package): the Updates card became `UpdateReviewRow` (the row + its
    *Who reviews updates* dialog, now `portal`) so S-20's card composes it — no copy of its logic. It keeps `id="update-settings"` (Who may do
    what's link, fix-E E-22) and the test ids `update-review-row` · `update-reviewers` · `update-reviewers-change` · `update-reviewers-save`.
    The card wrapper `UpdateReviewSetting` is gone (its only caller was projects-settings).
  - `lib/projects/model.ts` (no package): `ProjectRow.approvals?: { more; done; share; pos; expenses } | null` — additive, optional.
  - `app/settings/settings.module.css`: three classes appended at the end (`.cardGroup` · `.cardStack` · `.groupLabel` composing
    `.reasonLabel`) for Finance's group captions.

## S-15 — One Settings home for money rules

What changed:
- **Settings › Finance** (`finance-settings.tsx`): head "Finance" (help now names money in, out and commission) · *Kept in Company:* Profile
  (opens `/company/profile#entities`) · Payment schedules · Vendors · Commissions · one line saying Profile holds how a client pays (bank,
  PayNow), the entities and the GST switch, Templates the payment schedules. Then **Document numbers**, then captions *Money in* (Invoices ·
  Invoice paper · Client payments · Credit notes) · *Money out* (Costs) · *Commission* (Commission). Groups carry test ids `finance-money-in` ·
  `finance-money-out` · `finance-commission`.
- **Invoices** keeps payment terms + *May open with a fixed fee*; approval → S-20's card (a line with the link `invoice-approval-link`);
  numbers → Document numbers. Save snackbar now "Saved — an invoice is due n days after it is sent" (it named the next number).
- **Invoice paper** unchanged but for its home; *Invoice numbers by issuing entity* (`EntityNumberingSetting`) is gone — folded into
  Document numbers under Invoices (from a second entity; `data-testid="invoice-entity-numbers"` kept on that block).
  `setEntityNumbering` in `app/projects/money-actions.ts` is now unused by the UI (K-M may keep or drop it).
- **Client payments** keeps who confirms + trust (both save as pressed); the receipt numbering block and its Save are gone.
- **Credit notes** is an info card (what a credit note is + "Credit notes are numbered under Document numbers, above.");
  `setCreditRules` is now unused by the UI.
- **Costs** keeps the two approvals, the limit and the terms; PO numbering gone (help says where). Save snackbar "Saved — new purchase
  orders follow these rules".
- **Document numbers** card: four rows (`document-numbers-invoice|receipt|credit|po`), examples keep their old test ids
  (`invoice-number-example` · `receipt-number-example` · `cn-number-example` · `po-number-example`), Save `document-numbers-save`, one leave
  guard. A shared prefix marks the fields ("Another document has this prefix") and Save waits; the server refuses it too.
- **Settings › Projects** loses the four money cards; a line under its head (`projects-money-pointer`) points to Finance.
- **Old addresses**: `settings-view.tsx` `useMovedCards` — on `?section=projects` with `#invoice-settings` · `#invoice-paper` ·
  `#payment-settings` · `#credit-settings` · `#invoice-entity-numbers` (→ `#document-numbers`) the address is replaced with
  `/settings?section=finance[&from=…]#<card>`; `useHashLanding` then lands on it.
- **Who may do what** (`permissions.ts`): `payment-confirm` → `section=finance#payment-settings` "Finance › Client payments";
  `credit-issue` → `section=finance#credit-settings` "Finance › Credit notes"; `po-send` / `expense-log` / `commission-run` unchanged.
- **Ghost** (`settings-ghost.tsx`): Finance = head (4 links + its line) · Document numbers' four rows · the *Money in* caption · Invoices.

Check in the browser (Dane = Owner; Germaine / Michelle = Designer; Hui Min = Admin):
- `/settings?section=finance` at 1440 / 768 / 390: the order above; Document numbers one line per document at 1440, three lines per document
  from 1024 down; no sideways scroll at 390. Change CN's prefix and PO's digits → one Save → both examples follow; INV as RCT's prefix → the
  field error, Save disabled. Germaine: everything read-only, no Save.
- `/settings?section=projects#invoice-paper` (and `#credit-settings`) → lands on Finance at that card; Back still names where it came from.
- `/settings?section=studio` → Who may do what: Confirm a payment → "Finance › Client payments", Issue a credit note → "Finance › Credit notes".
- The loading ghost of both modules (throttle, or `loading.tsx`): same shape as the page.

## S-20 — The Owner's OK in one place (Settings card + the listing)

What changed:
- **Settings › Projects** opens on **What waits for an Owner or an Admin** (`data-testid="owner-approvals"`, `#owner-approvals`): rows
  `update-review-row` (#update-settings, + Who reviews / Change) · `invoice-approval-row` (#invoice-approval) ·
  `schedule-rule-completionApproval` (#done-approval) · `schedule-rule-shareApproval` (#share-approval) · `handover-review-row`
  (#handover-review) · `cost-approvals-row` (#cost-approvals: state On / Off / POs only / Expenses only, link `cost-approvals-link` to
  Finance › Costs). Each switch calls the action it called before (`setUpdateReview` · `setInvoiceRules({ rules: { approval } })` ·
  `setScheduleRules` · `setHandoverReview`) with the same snackbar words, Undo as before (the invoice one without — D-19 frees the waiting
  invoices when switched off), a refusal puts it back. The Updates card is gone (its one rule is this row). Order now: approvals · Project
  numbers · Stages and handover · Schedule · Ticket categories · Workload · Compliance.
- **Who may do what**: `invoice-send` · `project-update` · `project-handover` · `project-milestone-done` · `project-schedule-share` → "Projects ›
  What waits for an Owner or an Admin", each on its row's anchor.
- **The listing's *Needs my review*** (`scopes.ts` + `queries.ts`): counts and lists every kind — updates, invoices, payments to confirm,
  handovers (as before) **+ the schedule's asks (Done to approve, more time, a share) for whoever answers them (Owners / Admins) + POs waiting
  (a submitted Draft) and expenses waiting (pending) for whoever approves them (Owners / Admins)**. `reviewCount(r)` is the test; `reviewLine`
  names each kind on the row. A Designer's scope is unchanged.
- **Ghost**: Projects = head (its two lines) · the approvals card's six rows · Project numbers.

Check in the browser:
- `/settings?section=projects` as Dane at 1440 / 768 / 390: the card first, six rows; toggle Invoices need approval (no Undo) and Handover
  (Undo); "Change" under Who reviews opens the dialog. As Germaine: read-only.
- `/projects?scope=review` as Dane: Benjamin's row names the update in review, PO-2026-008 ("1 purchase order to approve") and Germaine's
  S$38.50 claim ("1 expense to approve") if it is on his project, plus any schedule asks; the scope pill's count includes them. As Germaine:
  only what she approves (nothing of the above).

## Probe assertions changed (each with a "(simplify S-xx, a deliberate change of this rule)" comment)

- `verify-pj-r3.cjs` — Needs my review: `count() === 1` → at least one row, Benjamin's naming "update(s) to review".
- `verify-pj-r5.cjs` — Invoices + the next invoice number on `section=finance`; the approval click on `section=projects` inside `owner-approvals`.
- `verify-pj-r6.cjs` — Client payments on `section=finance`; the next receipt read from `receipt-number-example` (Document numbers).
- `verify-pj-r7.cjs` — the module's order `owner-approvals · project-numbering · handover-setting · schedule-settings`; the money and Updates
  cards absent; `handover-review-row` reads `.first()` (until K-T's change below lands there are two).
- `verify-pj-gap-b.cjs` — Invoice paper on `section=finance`; the per-entity check on Finance's Document numbers.
- `verify-pj-gap-f1.cjs` — the next PO number is on Document numbers, not inside `cost-settings`.
- `verify-pj-gap-f2.cjs` — Credit notes on Finance again (count 1), CN-2026-004 on Document numbers, none on Projects.
- Unchanged and still right: `verify-pj-gap-c.cjs` (`schedule-rule-*` `.first()` = the approvals card's row, the first in the DOM),
  `verify-pj-gap-d.cjs` (`update-reviewers*` on `section=projects`), `verify-pj-fix-E.cjs` (`#update-settings` on the update link; the
  handover row `.first()`), `verify-pj-r1.cjs`, `verify-pj-gap-h/-i`, `verify-ke.cjs` (Projects' Kept in Company), `verify-st-r1.cjs`,
  `verify-p2b.cjs`, the shot walkers.
- New: `design-source/verify/simplify-projects-finance/verify-ks.cjs <scratch.db> [shotDir] [base]` (BASE wins; default :3011) — both modules'
  order and cards, the six rows, the invoice switch's key, Document numbers' one Save (`credit_note_rules` + `cost_rules` written, the cost
  rules kept) and the clash, the old-address landing, Who may do what's places, a Designer's read-only look, Needs my review for an Owner and
  a Designer, 390 with no sideways scroll. Puts every setting back in `finally`.

## Needs from others

1. **K-T** (`components/projects/ending/handover-setting.tsx`, `components/projects/schedule/schedule-settings.tsx`) — so each switch is set in
   ONE place. Until this lands, Stages and handover and Schedule still show their own switches as well (same settings, both work):
   - `HandoverSetting({ on, canManage, rule = true }: { …; /** (simplify S-20) false on Settings › Projects: the switch sits in What waits for
     an Owner or an Admin */ rule?: boolean })` — when `rule` is false, render instead of the card table:
     `<span className={st.settingHelp} data-testid="handover-review-pointer">Whether a Designer’s or a Manager’s handover waits for an owner’s review is switched under What waits for an Owner or an Admin, above.</span>`
     (the hooks stay unconditional; the stages sentence stays).
   - `ScheduleSettings({ …, approvals = true }: { …; /** (simplify S-20) false on Settings › Projects */ approvals?: boolean })` — when false,
     the help reads "How far ahead the team hears of what is due, and where each kind of job’s schedule starts." and the "Schedule approvals"
     card table is replaced by `<span className={s.settingHelp} data-testid="schedule-approvals-pointer">Whether a milestone’s Done and schedule changes wait for an Owner or an Admin is switched under What waits for an Owner or an Admin, above.</span>`
     (alerts lead time and where a schedule starts unchanged).
   - Then in `app/settings/projects-settings.tsx` (mine — orchestrator, please): `<HandoverSetting … rule={false} />` and
     `<ScheduleSettings … approvals={false} />`. Log the two pointer lines as invented copy under REG-K-S.3.
   - If K-T adds a Q-18 "extension rule" switch to `ScheduleRules`, it belongs in the approvals card too (a `RuleRow` with
     `setScheduleRules({ <key>: v })`).
2. **K-M** — two strings that still name the old place: `app/projects/money-actions.ts` (≈ line 697) "A fixed first stage is off in Settings ›
   Projects" → "… in Settings › Finance"; `components/projects/money/payments-section.tsx` (≈ line 222) "(Settings › Projects)" → "(Settings ›
   Finance)". `setEntityNumbering` / `setCreditRules` (K-R's `books-actions.ts`) are no longer called by any screen — keep them for other
   callers or drop them.
3. **⌘K (lib/global-search/model.ts, no package)** — optional: `settingCard('finance', 'numbers', 'Document numbers', 'Finance · how
   invoices, receipts, credit notes and POs are numbered', 'document-numbers', 'invoice receipt credit note po number numbering prefix')` and
   `settingCard('projects', 'approvals', 'What waits for an Owner or an Admin', 'Projects · the approvals a project can wait for',
   'owner-approvals', 'approval approve review owner admin updates invoices done share handover')`.
4. **K-N** — nothing required. If Needs you's *Needs your OK* wants the listing's counts, `ProjectRow.approvals` is there.

## Not built here, and why

- P2 §6.7's "On the phone, the bell's approval rows carry Approve · Send back in the row" — not in this package's items (the brief's S-20 for
  K-S is the Settings card and the listing); nobody's file list names the bell.
- P3 §6.7's fee-first question (the switch inside the project's split dialog) — the dialog is K-M's; the studio switch stays on Invoices.
- F1 §6.8 suggested renaming the module "Money"; the brief keeps "Finance" (as built).
