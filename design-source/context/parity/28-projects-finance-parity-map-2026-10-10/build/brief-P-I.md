# P-I · The Accounting role — brief (2026-10-10, runs after P-A…P-J)

Read `brief.md` in this folder first (the rules, the UX rules, the house pieces — all apply), then this. The nine packages are merged; you are the
only package running. The orchestrator may be wiring small leftovers in `lib/projects/queries.ts`, `components/templates/render/slices.tsx`,
`lib/templates/data.ts`, `components/leads/tasks/task-panel.tsx`, `app/settings/settings-ghost.tsx` and `scripts/repair-demo-data.ts` — don't edit those.

## Why
1.0 had an **Accounting** role (map rows PR-022, MI-007, MO-098, FB-114, FR-040 in `rows/*.json`): a bookkeeper who runs the studio's money and
nothing else. 2.0 held it as a package call (F-16, F2-Q14, REG-1310); the owner now asked for everything in 1.0. Read 1.0's role gates for it
(`/Users/vicky/Documents/GitHub/qanvast-id-tool` — grep `accounting`, `ACCOUNTING`, the roles and `can*` helpers, J inventory's roles rows in
`design-source/context/parity/projects-1.0-inventory/J-data-api-roles-touchpoints.md`) and build the same job in 2.0's shape.

## What the role is (the design — keep it this lean)
- **A fifth role, "Accounting"**, beside Owner · Admin · Manager · Designer: Company › Members' role select offers it (Owners and Admins set it);
  Settings › Studio › *Who may do what* gains its column, read from the enforced rules as today (`lib/settings/permissions.ts`).
- **What they see:** the bell, Search (⌘K finds only what they may open), their own Tasks, **Company › Finance** (every tab, Xero included),
  **Company › Reports › Finance** (not Leads / Projects reports), and a project's **Money** — opened from Finance's rows or a link — with the
  project's header, its info column's money-relevant rows and **Files** (to see a payment's proof, an invoice, a bill). Not the Leads pipeline,
  not a project's design, schedule, client conversations, tickets, questionnaire or notes, not the Visualizer / X-Ray / quotes editor (a VO or a
  quote opens read-only in Preview if a Money row links to it). The rail and the phone's dock show only what they can open; a project's tab strip
  shows Money (and Files) only; an address they can't open lands on the house gate ("You don't have access…"), never a crash.
- **What they do:** everything a money row offers that isn't an approval of someone's spend or a change to what was agreed — record and confirm
  client payments, mark not received, issue receipts (automatic), send reminders, issue credit notes and record refunds, record supplier bills
  and expenses, pay bills / POs / claims / commission, mark a PO delivered, record a PO made elsewhere, run Xero (connect, map, push, retry),
  export. **Not:** approve invoices / POs / expenses / handovers (Owners and Admins), change a project's contract value, payment split or a VO,
  delete a project, change Settings outside Settings › Finance (they **may** change Settings › Finance's money rules? — no: read-only, Owners and
  Admins change rules; they see them).
- **Profit and margin:** they see them (a bookkeeper's job) — wherever the rule today is "Owners and Admins", decide per rule whether it is about
  *seeing the books* (Accounting yes) or *running the studio* (Accounting no). Put that split in ONE place: add predicates to
  `lib/settings/types.ts` or a NEW `lib/settings/roles.ts` (`isAccounting(role)`, `seesBooks(role)` = Owner · Admin · Accounting,
  `runsStudio(role)` unchanged) and switch the money gates that are about seeing / recording to `seesBooks` / a new `runsMoney(role)`.
- **Their assignment:** never assignable to a lead or a project (the house pickers leave them out), never a lead's owner; they get money bell
  rows (payments to confirm, bills due, Xero failed, invoice sent) as Owners and Admins do for money; never lead / design / client-message rows.
- **View as:** a demo member **Priya Tan · Accounting** (`members` row via a repair block in your outcome, `is_active`, a phone, a colour) so the
  owner can switch to her from Demo Studio › View as.

## Files you own
`lib/settings/permissions.ts` · `lib/settings/types.ts` (role predicates) · NEW `lib/settings/roles.ts` · `lib/leads/assign-policy.ts` ·
`lib/leads/visibility.ts` · `lib/company/member-rules.ts` · `lib/company/members.ts` (`ROLES`) · `components/company/members-view.tsx` (the role
select only) · `components/shell/**` (the rail's / dock's items by role, the gate) · `lib/projects/tabs.ts` (the strip by role) ·
`app/projects/[id]/**` and `app/leads/**` page gates (only the role checks) · `lib/projects/money-visibility.ts` · `lib/finance/rules.ts` ·
`lib/projects/money-queries.ts` + `lib/finance/**` + `lib/notifications/**` + `lib/global-search/**` + `lib/company/sections.ts` (only the role
checks — a one-word change from `runsStudio` to the new predicate where the rule is about the books) · `app/settings/studio-settings.tsx` (the
column) · the server actions' role gates (`app/projects/{money,payment}-actions.ts`, `app/finance/**`, `app/company/finance/**` — only the gate
lines). Re-read before each edit; keep every other package's code as it is.

## Done means
- Dane (Owner), Hui Min (Admin), Germaine / Michelle (Designers) see and do exactly what they did before — every existing probe that asserts a
  role still holds (grep `design-source/verify/**/*.cjs` for `as('`, `is_you`, `Designer`, `Admin`, role words; change none unless the rule
  changed for that role, which it shouldn't).
- Priya sees the lean rail, lands on Company › Finance › To do, opens a project's Money from a row, records a payment, can't approve PO-2026-008
  (the row says why: "An Owner or an Admin approves purchase orders"), can't open Leads (the gate), sees Reports › Finance only.
- Register rows `reg-P-I.md`, outcome `outcome-P-I.md` (per rule changed: before → after, which roles; the repair block for Priya), a probe
  `design-source/verify/parity-map-build/verify-pm-i.cjs` (View as Priya: rail, gate, Money, a recorded payment put back, an approval refused;
  View as Dane after: unchanged). No build, no server, no `local.db`. Final message: 10 lines + the outcome path.
