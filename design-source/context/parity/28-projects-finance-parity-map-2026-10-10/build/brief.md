# The parity-map build — shared brief for every package (2026-10-10)

Repo: /Users/vicky/Documents/GitHub/openmaison-prototype (Next 16 App Router, React 19, TS strict + noUncheckedIndexedAccess, Drizzle + libSQL,
CSS modules on `--om-*` tokens). The owner (Vicky, the product designer) read the 1.0 → 2.0 map of Projects & Finance (1,094 rows,
https://claude.ai/artifact/J1zvjyePHCQsg5xuNYvfLr; rows in `design-source/context/parity/28-projects-finance-parity-map-2026-10-10/rows/*.json`)
and said: **"let's build everything that's in 1.0 to 2.0 without losing anything. Make sure you think better when adding the missing items in 2.0
keeping the best user experience, cognitive load, and intuitiveness."** Nine packages build it at the same time in the same tree; you build ONE.
A tenth (the Accounting role) runs after you, alone.

## Read first
1. Your package's section below, then the map rows it names (`rows/<area>.json` — `what` is 1.0, `v1_code` its files in
   `/Users/vicky/Documents/GitHub/qanvast-id-tool`, `v2`/`v2_code` where 2.0 is today, `how` the gap). Open 1.0's code for each item: build the
   job 1.0 did, in 2.0's shape — never 1.0's screens.
2. `CLAUDE.md` › How we work + Stack & conventions + the Map entries "Projects …", "One home per thing", "Lead ↔ Project parity",
   "Projects & Finance, simplified"; `DESIGN-PRINCIPLES.md`; `design-source/context/page-checklist.md`; the REG rows named in comments near what
   you change (`design-source/REGISTER.md`); `design-source/context/simplify-projects-finance/README.md` (the shape every page now has).

## How to add a missing thing (her ask: best UX, least cognitive load, intuitive) — apply to every item
1. **Its one home is where people already look.** A new capability joins an existing surface (a Needs you / To do row, the record's own panel or
   ⋮, the list that already holds its kind, a Settings card that already holds its rule). No new page when a view or a row does; no new rail item.
   A thing that has a home elsewhere gets a door with `?from=`, never a copy.
2. **It shows only when it applies.** An issuing-entity filter only when the studio has two or more entities; per-stage commission behind its own
   choice; a fixed-fee row only when Settings allows it; the composer's extras behind one "+"; a warning only when its condition is true.
3. **One button per row**, the filled one = the next step. Red only for "late, and ours to fix" (S-05); a vendor's or a client's lateness is neutral.
4. **Defaults need no set-up**: everything works on the demo data as it is, a studio that never opens the new setting loses nothing.
5. **The house pieces and the house words**: `components/om/*` (Chips, ChipRail, StatTile(s), Dialog / ConfirmDialog / Drawer + SurfaceHead /
   SurfaceFoot, PortalMenu + DropdownItem, TextField incl. `numeric`, DateField, EmptyState, ScopePill, Tooltip, the snackbar with Undo), the
   listing's table model, `CostPanel`, the lead's own components given a prop, the ghost kit. Every loader and reveal draws the page as it now looks
   (REG-708). ≤767: menus / popovers / panels / form modals are bottom sheets. Every remove answers with one sentence + Undo; a refused action
   answers `{ error: <rule> }` and says why in the row; an optimistic write puts the value back when refused; a dialog closes only once its save
   lands; WhatsApp opens on the press; long strings travel inside one object argument; `data-kb` on what a key presses.
6. **AI stays honest.** Nothing here calls a model. Where 1.0 "asked the AI", 2.0 answers from the records by rule (as *Drafted by Maison AI*
   schedules do) — no credits; mark it a stand-in in your outcome file. Anything a real service would do (reading a scanned PDF, a bank feed, an
   email leaving the machine) is a stand-in on the house delivery layer / an honest "We'll set it up" ask, never a fake success.

## Already done for you (don't redo; nobody else edits these)
- **Migration `drizzle/0085_parity_map.sql`** is written and applied (schema in `lib/db/schema.ts`; **nobody touches `lib/db/schema.ts` or
  `drizzle/`**): `quotes.timeline_days` · `quote_payments.fixed_minor` · `purchase_orders.bill_to · delivered_at · delivered_by · external ·
  external_ref · external_file_id` · `expenses.issuing_entity` · `commission_rules.stages_json` · `project_milestones.resume_on` ·
  `schedule_template_items.description · color · follows_json` · `project_messages.channel ('client'|'team') · attachments · meta` ·
  `notification_outbox.attempts · next_try_at` · `projects.floor_plan_asked_at · floor_plan_asked_by` · `space_layouts.is_template` · NEW tables
  `lead_messages` · `conversation_prefs` · `space_layout_versions` (all in `BASELINE_TABLES`).
- **Bell events** (`lib/notifications/model.ts`: key, label, defaults, templates — emit them with the house `notify(...)`):
  `schedule_shared` · `invoice_sent` · `invoice_reminded` · `po_delivery_late` · `invite_requested` · `message_failed` · `send_held` · `team_message`.
- **Client messages** (`lib/portal/client-messages.ts`, sent with `tellClient` from `lib/portal/client-messages-send.ts`): `client_signed` ·
  `client_questions` · `client_floor_plan` (field `{plan}`) · `client_floor_plan_ask`.
- **Regions** to edit inside (Edit only — never Write a shared file): `lib/leads/activity.ts` (`/* region P-x */` … `/* end P-x */`; new
  `lead_events` kinds are `parity_<pkg>_…`), `lib/projects/needs-you.ts` HEADER (`region parity-map header words`), `lib/projects/money-needs.ts`
  (`region P-A` · `region P-B`; the kind `cost-po-late` is already in `MONEY_NEED_KINDS`), `components/projects/money/needs-list.tsx` (`region P-B`).

## The packages — what to build and how it should land

### P-A · Money in (map rows MI-*, FB-012 · FB-013 · FB-016, UC-098)
- **MI-104 An approved variation order can't be deleted.** `deleteQuotes` (app/leads/quotes-actions.ts) refuses a `kind = 'variation'` whose
  client approval counts (approved / signed) with `{ error: 'An approved variation order stays on the contract — revise it to change it' }`;
  the VO's ⋮ Delete (quote editor, Money's VO row) reads the rule in the row (meta) instead of offering it. Drafts / declined still delete with Undo.
- **MI-021 A fixed-fee first stage on a quote's Payment Schedule.** Only when Settings › Finance › Invoices "May open with a fixed fee" is on: the
  quote editor's FIRST payment row gets a `%  ·  S$` switch (house Chips, small) and a money field (`quote_payments.fixed_minor`); the other rows
  split what is left by their %. The project's stages, invoices and the "out of step" maths read it (one set of numbers, `lib/projects/money.ts`).
- **MI-031 Lines on a stage invoice.** The stage invoice's Description dialog gains "Itemise this invoice": a lines grid (description · qty · unit
  · amount, Enter adds a row — the one-off invoice's own grid component) that must add up to the stage's share ("S$x left to itemise" until it
  does; Save waits for it). The paper prints the lines under the stage line. `project_invoices.lines_json` holds them.
- **MI-035 Fill an invoice from a PDF.** The one-off invoice dialog gets a quiet "Fill from a PDF" link (the bill dialog's reader: text PDFs read
  in the browser, `lib/pdf-text.ts` + the bill reader's parser) that fills lines, due day and note, marking the filled fields until edited, as the
  bill dialog does. Scanned files say plainly "This file has no text to read — type the lines in".
- **MI-068 After the third reminder.** The overdue row (money-needs region P-A) reads "reminded 3× · last 6 Oct — call {client}" and gains a
  secondary **Call {client}** (`tel:` shown, the number copyable); at the third reminder Owners and Admins hear `invoice_reminded` once. No fake
  ticket (2.0's tickets are the client's).
- **UC-098** emit `invoice_sent` (Owners and Admins, never the sender) wherever an invoice goes to the client.
- **FB-013 · FB-016 · FB-012 Money in, studio-wide** — Company › Finance gets **Money in**, the twin of Money out (same list model, same kind
  switch): **Invoices** (every invoice: number, project, status incl. Awaiting approval / Sent back, total, paid, owed, due day; Status pill, search,
  Export) · **Payments** (every client payment with its receipt number and its state, View receipt) · **Variation orders** (every VO, status,
  amount, Open) · **Credit notes**. Rows open the project's Money with `?open=` + `?from=`. Order of Finance tabs: To do · Money in · Money out ·
  Vendors · Commission · Xero (members see what they see today + Money in for the projects they see). Ghost in step. Entity filter: see P-B.
- Files: `components/projects/money/**` except `invoice-paper-settings.tsx` and `payments-settings.tsx` (P-D) · `lib/projects/{money,money-queries,
  money-visibility,invoices,invoices-kinds,invoices-model,payments,payments-model,payments-portal,payments-public}.ts` · `lib/projects/money-needs.ts`
  (outside region P-B) · `app/projects/{money,payment}-actions.ts` · `app/leads/quotes-actions.ts` (the delete rule only) ·
  `components/quotes/editor/payments/**` + `lib/quotes/payments.ts` (+ its actions file) · NEW `components/finance/money-in/**` · NEW
  `lib/finance/money-in.ts` · `lib/finance/sections.ts` · `app/company/finance/[tab]/page.tsx` (+ loading) the Money in branch ·
  `app/(editor)/projects/[id]/{invoices,receipts}/**` (the lines on the paper; the paper's look is P-D's).

### P-B · Money out (MO-*, FB-009, FB-031, FB-105's lists, FB-097)
- **MO-011 "Invoice to" on a PO** — the PO dialog's More details gains **Invoice to** (prefilled with the issuing entity's address, editable;
  `purchase_orders.bill_to`); the paper and the vendor's page print it.
- **MO-027** the vendor's page `/po/[token]` gets **Download CSV** beside Download PDF (the house export).
- **MO-038 A PO made elsewhere** — Money out's New ▾ › **Record a PO made elsewhere**: vendor, reference, amount (GST in or out), date, the file;
  it becomes a PO marked *Recorded* (`external`), counts in costs, takes bills and payments like any PO, never goes to the vendor's link.
- **MO-058** the expense dialog's **Issued by** select — only with 2+ issuing entities (defaults to the project's) — `expenses.issuing_entity`.
- **MO-074** the vendor's panel lists **Expenses** naming the vendor, beside POs · Bills · Paid.
- **MO-079 · FB-105 (lists)** one **Issued by** scope pill on Money in, Money out and To do — only with 2+ entities — and an entity chip on each
  row then. Put the shared helper in NEW `lib/finance/entity-scope.ts` (`entityOptions(entities)`, `matchesEntity(row, key)`); P-A and P-C read it.
- **MO-084 · FB-009 Recent money, studio-wide** — Company › Finance › To do ends with a quiet **Recently** list (the ten latest money events —
  invoices sent, payments, POs, bills, expenses, VOs, credit notes — chipped by kind, each opening its record), collapsed to five with "Show more".
- **MO-087 · FB-031 Where costs go, on the project** — Project › Money › Costs opens with one stacked bar + legend by category (POs, bills,
  expenses committed), for those who see costs; nothing when there are no costs.
- **MO-094 · PR-089 A late delivery** — a PO gets **Mark delivered** (its ⋮ and panel; `delivered_at`); past its expected day and not delivered
  → a neutral Needs you row (`cost-po-late`: "{PO} delivery is n days late", **Mark delivered** · **Message {vendor}** on WhatsApp) and the derived
  bell `po_delivery_late` (lib/finance/bell.ts, like bills). The Overview's Needs you shows it through money-needs.
- **MO-009 A PO line's milestone** — a line's ⋮ **Link to a milestone** (the field exists); the milestone panel's costs read it later (no new
  screen).
- **FB-097 The PO's wording** — Settings › Finance › Costs gains **The purchase order paper**: a header note, terms, an acceptance block for the
  vendor (on / off), show the bank (off by default); the PO paper and the vendor's page print them.
- Files: `components/finance/**` except `books/**` and `money-in/**` · `lib/finance/{costs,queries,rules,model,bell,todo,todo-server,cost-*}.ts` ·
  NEW `lib/finance/entity-scope.ts` · `app/finance/**` · `app/po/**` · `app/company/finance/[tab]/page.tsx` the To do / Money out / Vendors branches ·
  `lib/projects/money-needs.ts` region P-B · `components/projects/money/needs-list.tsx` region P-B · `components/finance/project-costs.tsx`.

### P-C · Books, reports & commission (FB-*, PR-122's numbers)
- **FB-065 GST** — Company › Reports › Finance gets **GST**: for a quarter (the house period select; quarters by default): GST on invoices issued
  (output) and on bills and expenses (input), net to pay, by issuing entity when 2+; each figure opens its list; Export. The "Tax report dropped"
  call REG-1307 is reversed here — log it.
- **FB-075** Cash flow gets **Same month last year** and the change, as a column (no new chart).
- **FB-076 Expenses** — a Reports › Finance view: by category (count, total, GST, reimbursed, share) with three tiles Total · GST paid ·
  Reimbursements.
- **FB-077** Profitability's grouping gains **Budget range** and the type rows show **average days** (no satisfaction — 2.0 never collects it; say so).
- **FB-004 Net position** — Reports › Finance's money-owed view opens with three tiles Owed to you · You owe · **Net** (entity-scoped with 2+).
- **FB-105 (reports)** the Issued by scope on every Finance report, only with 2+ entities (`lib/finance/entity-scope.ts`, P-B's).
- **FB-042 · FB-043 A project's commission** — one dialog, NEW `components/finance/books/project-commission-dialog.tsx` (exported
  `ProjectCommissionDialog` + an `openProjectCommission(projectId)` the frame can call): **Studio rule** (default, its rate shown) · **A rate for this
  project** (Owners and Admins) · **No commission** · and, under "Pay on chosen payment stages", ticks per stage with an optional rate each
  (`commission_rules.stages_json`). A Designer sees the rule and **Ask for a different rate** (today's ask). P-E puts the door in the project's ⋮;
  Settings › Finance › Commission keeps its list.
- **FB-055** NEW `lib/finance/commission-close.ts` `afterProjectCompleted(projectId, actorId)`: when the studio pays no commission by default and
  the project has no rule, each Owner gets a task "Set commission for {project}" opening the dialog. **Write this file first** (P-E calls it).
- **FB-057** commission rule changes and asks get Activity lines (region P-C; `parity_c_commission_*` events).
- **FB-072** Reports › Commission by project: **Expected** (rule × contract) · Earned · **Variance**. **FB-073** a **Changes** list under it: every
  ask and every rule change (date, who, project, from → to, status, who answered, note) from `commission_requests` + `commission_rules` history.
- **PR-122 · PR-123's numbers**: export from NEW `lib/finance/closing-numbers.ts` `closingNumbers(projectId)` → `{ costsMinor, marginPct,
  expectedMarginPct } | null` (Owners and Admins only, `profitGrade`'s rule) for P-E's handover sheet.
- Files: `components/finance/books/**` · `lib/finance/{reports,commission,books,profit,credit-*,report-memory,xero*}.ts` + the two NEW files ·
  `app/company/reports/**` (the Finance tab body) · `app/finance/*commission*` actions · `components/company/reports/**` the Finance tab only.

### P-D · Documents, entities & paying (MI-065 · FB-101 · FB-102, FB-103, CP-089, FB-112)
- **MI-065 · FB-101 · FB-102 The invoice paper** — Settings › Finance › Invoice paper gains an **Accent colour** (the brand's by default; an
  entity may override it), an **Acceptance block** (on / off, its words), and a **live preview** beside the form (the real paper component on a
  sample invoice, updating as you type; on a phone, a Preview button opens it in a sheet). The paper reads them.
- **FB-103 An issuing entity's details** — Company › Profile › Issuing entities gains Contact email · Phone · Website · Tagline · Accent colour ·
  Footer text · **Bank branch code**, behind "More details" on each entity; the invoice / receipt / PO / credit-note papers print them where 1.0
  did. Country and currency stay Singapore and S$ (DEF-30) — say so in the outcome.
- **CP-089** the client's pay box shows the **branch code** and **SWIFT** when set, each with Copy.
- **FB-112 How clients pay** — Settings › Finance › Client payments gains switches per method (Bank transfer · PayNow · Cheque · Cash; at least
  one on) that the record-payment dialog and the client's pay box offer (export `liveMethods(rules)` from NEW `lib/projects/payment-methods.ts`;
  P-A reads it in the record dialog — say so in Needs from others), and **Match bank transfers automatically**: an honest ask ("Ask OpenMaison
  to set it up" → a recorded request, shown as "Asked on 10 Oct — we'll be in touch"; a stand-in).
- Files: `components/projects/money/{invoice-paper-settings,payments-settings}.tsx` · `lib/projects/invoices-paper.ts` · NEW
  `lib/projects/payment-methods.ts` · the papers' look (`app/(editor)/projects/[id]/{invoices,receipts}/**` styling + header/footer, coordinate
  with P-A who adds stage-invoice lines — each in its own region of the paper component) · `components/finance/books/credit-note-paper.tsx`
  header/footer only · `components/company/profile-view.tsx` (+ css) · `lib/templates/model.ts` `IssuingEntity` (additive fields) ·
  `lib/company/entities.ts` · `components/portal/money/pay-box.tsx`.

### P-E · The record, the schedule & the handover (PR-*, SC-*, TD-022 · TD-023 · SC-056)
- **PR-058 Duplicate a project** — the project's ⋮ › **Duplicate project…**: For the same client · another client (the house lead picker) · a new
  client (name + phone); ☑ Copy the schedule (re-dated from a start date you pick) · ☑ Copy the signed quote as a new draft. It lands on the new
  project, Setting up, with "Project P-… created" + Undo.
- **PR-121 · MO-101** the Hand over checklist gains **Vendors are paid** (deferrable, like the others): "{n} POs or bills still owed — S$x" with
  **Open Costs**.
- **PR-122 · PR-123** for Owners and Admins, the Hand over sheet and the Closing summary show **Costs** and **Margin** (`closingNumbers`, P-C), and
  a quiet strip when the margin is more than 25 points off the expected: "Margin 12% — 31 points under the expected 43%".
- **SC-016** Save as a template keeps each milestone's description, colour and its links (by position); a template's items edit them
  (Company › Templates › Schedules); a schedule made from it gets them.
- **SC-084 · UC-084** a share sent directly raises `schedule_shared` (Owners, Admins and the project's members — not the sharer).
- **SC-094 A variation order's extra days** — the VO's General info gains **Adds days to the schedule** (`quotes.timeline_days`, VOs only); the
  Schedule toolbar shows "+n days from changes" when approved VOs add days; and when a VO with days is approved, a Needs you row "VO-3 adds 3 days
  — move what follows?" with **Move the schedule** (today's move-carries-what-follows, from the milestone you pick, default the running one) ·
  Not now. The VO paper and the client's VO card print "Adds n days".
- **CP-064 (studio side)** a Blocked milestone's dialog gains an optional **Expected to resume** day (`project_milestones.resume_on`); the snapshot
  carries it for the portal (P-F draws it).
- **SC-056 · TD-023 · TD-022 Suggested tasks** — NEW `lib/projects/task-suggestions.ts` (pure, by rule: a milestone's words and its trade → a
  short list, from a table you write grounded in 1.0's prompts and Singapore renovation practice; never a model): the milestone panel's
  **Suggest tasks** opens a tick list (Add ticked); the project's Tasks toolbar add menu gets **Suggest tasks from the quote** (the signed quote's
  sections → tasks). Ticked tasks are ordinary tasks. Mark them a rule-based stand-in.
- **FB-055** call `afterProjectCompleted(projectId, actorId)` from `@/lib/finance/commission-close` when a handover completes.
- **The door to commission**: the project ⋮ gets **Commission…** (Owners, Admins, and the project's members) opening P-C's `ProjectCommissionDialog`.
- Files: `components/projects/schedule/**` · `app/projects/schedule-actions.ts` · `lib/projects/schedule*.ts` · `components/projects/ending/**` ·
  `app/projects/ending-actions.ts` · `lib/projects/{handover,handover-model,hold,create}.ts` · `app/projects/actions.ts` ·
  `components/projects/project-menu.tsx` · `components/projects/project-record-dialogs.tsx` · `components/projects/project-dialogs.tsx` · NEW
  `lib/projects/task-suggestions.ts` · `components/quotes/editor/general-info.tsx` (the VO's days field only) · `lib/projects/needs-you.ts` (the
  VO-days row + region header words) · the Tasks toolbar's add menu in `components/leads/tasks/` (that one entry) · `app/company/schedule-templates-actions.ts`
  + the schedule-template editor · the VO paper's "Adds n days" line.

### P-F · The client's portal & Qanvast Ops (CP-*, SC-087's portal side)
- **CP-062 · SC-087** the client's Schedule gets house Chips **All · Payments · Under way · Paused · Coming up** with counts (only when there are
  more than five stages), and the rail shows **invoices sent** and **Project started** beside the stages.
- **CP-064** a paused stage reads "Paused — {their words} · Resuming around {day}" (or "Resume day passed") from P-E's `resume_on`.
- **CP-072** the client can mark their own pins **Resolved** / reopen them and **Remove** their own pin (Undo), on the renders link and the
  portal's Designs.
- **CP-099** the client's Files groups what the studio shared by kind (Contracts · Quotes · Variation orders · Designs · Floor plans · Site photos ·
  Other), headings only for the kinds present; each tile keeps its day.
- **CP-110 Ask the client — the bug** — the Ask the client dialog copies the studio's **real** portal address (`currentPortalSlug`, the project's
  or lead's page), "Send via WhatsApp" opens wa.me with a drafted line to the client's phone on the press **and** records the ask; the client gets
  a portal bell row and `client_questions` (email by default). The snackbar says what happened ("Asked {client} — the questions are on their page").
- **CP-118 · FR-095** `client_signed` after a client signs an agreement, a quote or a bundle online (and when the studio marks one signed);
  `client_questions` with the ask above. (Floor-plan ones are P-H's.)
- **CP-127** Company › Client portal's address card gets **Copy** and **Open**, and **See the live portal** (a test client's view).
- **CP-148 · CP-149 · UC-082's operator pause** — Qanvast Ops gets **Studios**: the studio's row with **Portal On / Off** (Off closes every portal
  page with a calm "This page is closed for now — contact {studio}"; the studio's Company › Client portal says "Closed by OpenMaison"), **Pause the
  studio's messages** (the delivery layer holds every message while on — P-G reads `settings.platform.messagesPaused`), and usage for the last 30
  days: portal sign-ins, issues reported, messages, choices made. Store in settings key `platform`; export its read from NEW `lib/platform.ts`.
- Files: `components/portal/**` except `money/pay-box.tsx` (P-D) and `threads/portal-messages.tsx` (P-G) · `app/my/**` except the messages page
  (P-G) · `lib/portal/**` except `client-messages.ts` / `client-messages-send.ts` (done) · `app/portal/**` except `messages-actions.ts` (P-G) ·
  `app/renders/**` + `components/visualizer/client/**` (the pins only) · `components/leads/questionnaire/ask-client-dialog.tsx` ·
  `app/leads/questions-actions.ts` + `app/leads/portal-actions.ts` (the ask) · `app/contracts/actions.ts` + `app/sign/**` + `lib/quotes/sign.ts`
  (the signed message only) · `components/company/portal/**` + `app/company/portal/**` · `app/qanvast-ops/**` + `components/qanvast/**` · NEW `lib/platform.ts`.

### P-G · Conversations, tickets, sending & search (UC-*, FR-084's tickets, FR-115, TD-122)
- **UC-064 A team chat and a lead's conversation** — a project's Messages gets a second conversation, **Team** (house Chips Client · Team in the
  title line; `channel = 'team'`; the client never sees it; `team_message` to the project's members). A lead invited to the portal can write from
  their lead page and the studio answers in **/chat** (the Messages hub lists lead conversations with a Lead chip; `lead_messages`); once Won, the
  project's Client conversation shows the lead's messages first. No groups beyond the household (the household is the group) — say so.
- **UC-066 · UC-067 More than photos** — the composer's one **+** opens: Photo · File (PDF, doc, sheet, video up to 25 MB, filed in Files ›
  Messages) · Voice note (record in the browser, kept as a file, played in the line) · The site's location (the project's address as a map link,
  not the device's) · A contact (a member or a vendor as a card with Call / WhatsApp) — and an emoji button in the box. Same on the portal for the
  client (Photo · File · Voice note · emoji).
- **UC-068 Suggested replies** — under the client's newest unanswered message, up to two chips drawn by rule from its words (a table you write:
  "when can you come" → "Let me check the schedule and get back to you today." …); a tap fills the box, never sends. A stand-in — say so.
- **UC-069 Search in a conversation** — a search field in the conversation's head: matches highlighted, ↑ ↓ to walk them; ⌘K's Messages scope
  finds a message and opens the conversation at it.
- **UC-070 Pin · Mute · Copy link** — a conversation's ⋮ (in /chat and the project's Messages): Pin to top, Mute (no bell for it — server-side,
  `conversation_prefs`), Copy link.
- **UC-047 Ticket filters** — Tickets gets Filters (Priority · Status · Looks after) on the house filter pattern, applied live.
- **UC-058 · FR-084 The ticket number** — Settings › Finance › Document numbers gains a **Tickets** row (a pattern like the others, default
  `T-{YYYY}-{nnn}` — today's numbers unchanged).
- **UC-082 Sending safeguards** — the delivery layer holds everything while `platform.messagesPaused` (P-F's switch) and holds a single action
  that would message more than 25 people at once as `send_held` for the Owner (Settings › Notifications › Sent messages lists it with Send / Drop).
  The prototype's outbox is already silent; say so.
- **UC-083 Retry** — a failed message is tried again up to three times (`attempts`, `next_try_at`, on the same sweep that releases held
  messages); Sent messages shows "Trying again (2 of 3)" and **Try again now**; after the third, `message_failed` to Owners and Admins.
- **FR-115** ⌘K finds a member's projects by the member's name.
- **TD-122 Send a render to Messages** — the AI Visualizer's full view, on a design linked to a project, gets **Send to Messages** (Client or
  Team, a line of text, the render attached), opening the conversation after.
- Files: `components/projects/messages/**` · `components/projects/threads/**` · `components/projects/tickets/**` · `components/portal/threads/portal-messages.tsx`
  + the portal's messages page · `app/projects/{messages,tickets}-actions.ts` · `app/portal/messages-actions.ts` · `lib/projects/{messages,tickets,
  tickets-model,thread-photos}.ts` · NEW `lib/projects/{suggested-replies,conversations}.ts` · `app/chat/**` · `lib/notifications/{delivery,emit}.ts` ·
  `app/settings/sent-messages.tsx` · `app/settings/document-numbers.tsx` + `lib/settings/document-numbers.ts` (the Tickets row) · `lib/global-search/**`
  + `components/shell/global-search.tsx` · `components/visualizer/editor/**` (the Send to Messages press only) · the lead page's portal message
  entry (one link in the lead's Overview "With client" area or quick links — the smallest door).

### P-H · Tasks, design, compliance & Maison AI (TD-*, PR-059, SC-060, TD-107, FB-118)
- **TD-019** the outside-person form gets ☐ **Ask an Owner to add them to the studio**: a task for the Owners "Add {name} to the studio" (with the
  phone), `invite_requested`, and Company › Members opens its Add dialog filled from `?add=` when the task is opened.
- **TD-027** the rail's Tasks add row offers projects made with New project (their lead is `direct`) under a **Projects** group in the picker.
- **TD-044** a selection receipt for the client's **no** and **asked for other options** too (the receipt says which).
- **TD-049 · UC-094 · TD-067 · UC-113 Floor plans and the client** — the Floor plan's first run, for a client on the portal, offers **Ask
  {client} for their floor plan** (`projects.floor_plan_asked_at`, `client_floor_plan_ask`, and a "Send your floor plan" row in the client's What
  needs you until a plan arrives); a plan the studio adds sends `client_floor_plan` (email by default; one per plan).
- **TD-110 A registration's notes** — the Compliance Navigator's studio steps (registrations) get a **Notes** field each (kept in the studio's
  compliance record).
- **Maison AI answers questions** (TD-107 · SC-060 · FB-118 · PR-059) — the Maison AI sheet gets one **Ask** box (house TextField) answering
  from the records by rule (NEW `lib/maison-ai/answer.ts`, intents with the words they match and the facts they read): compliance (the rules for
  a home type, what is open on this project), money (who owes, GST this quarter, margins, vendor spend, commission), the schedule (what is late,
  what's next), and **about one milestone** (the milestone panel's "Ask Maison AI about this" opens the sheet with it asked: what's due, what it
  waits on, its payment, its tasks). When nothing matches it says what it can answer, with chips. **Start a project** (PR-059): on the Projects
  listing a suggestion "Start a project for {Won lead without one}" / "Start a new project" opens New project prefilled. A rule-based stand-in —
  say so in the outcome and on nothing the user reads beyond the sheet's own "Answers from your records" line.
- Files: `components/leads/tasks/outside-person.tsx` · `app/leads/tasks-actions.ts` (the invite task only) · `components/tasks/**` +
  `lib/leads/tasks.ts` (the picker only) · `components/company/members-view.tsx` (the `?add=` landing only) · `components/projects/choices/**` +
  `lib/projects/choice-receipt.ts` + `components/projects/choices/selection-receipt.tsx` · `components/projects/floor-plan/**` +
  `app/projects/floor-plan-actions.ts` + `lib/projects/floor-plan.ts` + the client's floor-plan ask row in `lib/portal/needs*` (that row only) ·
  `components/compliance/**` + `lib/compliance/**` · `components/shell/maison-ai.tsx` + `lib/maison-ai.ts` + NEW `lib/maison-ai/**` ·
  `app/projects/maison-actions.ts` + `components/projects/use-project-maison.ts` · the milestone panel's one "Ask Maison AI about this" entry
  (coordinate: it lives in P-E's `components/projects/schedule/**` — put it under Needs from others, the orchestrator wires it) · the Projects
  listing's Maison AI suggestions.

### P-J · The 3-D Space Planner (TD-073 · TD-075 · TD-076 · TD-081 · TD-087…TD-092 · TD-098)
- **TD-081** the editor's view controls gain **Ruler** (click two points → the distance, Escape clears), **Furniture** on / off and **Dimensions**
  on / off — one View ▾ menu, not more toolbar buttons.
- **TD-075 Levels** — a layout can hold more than one level: a level switcher in the editor (Level 1 · + Add a level), each level its own plan in
  the PlanDoc; the client's link shows the levels as chips.
- **TD-076 My templates** — a layout's ⋮ **Save as a template** (`is_template`): the planner's New ▾ lists **My templates** above the six flats.
- **TD-073 Examples** — the planner home shows **Start from an example**: furnished examples made from the six flats (by rule), opening as a copy.
- **TD-087 Versions** — each share keeps a version and **Save a version** keeps one by hand (`space_layout_versions`); a Versions drawer lists them
  with **Bring back** (a new save; Undo).
- **TD-088 Arrange** — a room's ⋮ **Arrange the furniture** re-runs the "furnished" rule for that room (Undo).
- **TD-089 Render** — **Render in AI Visualizer** turns the current 3-D view into a picture and opens a new Visualizer design for the project's lead
  with it as the room photo (the Visualizer's own price applies when generating there).
- **TD-090 Describe a piece** — the add-furniture panel's search takes a description ("a 3-seater sofa in grey") and picks the closest catalogue
  piece by rule. A stand-in.
- **TD-091 Elevations** — pick a wall → its elevation (the pieces against it, to scale, with heights) in a panel; Download PNG.
- **TD-092 Present** — **Present** walks the rooms full-screen (the camera moves room to room; ← → and Escape).
- **TD-098 Isometric** — an **Isometric** view preset; the Tools tile "Floorplan to 3D Isometric" opens the planner in it (no longer Coming soon).
- Files: `components/planner/**` · `lib/planner/**` · `app/(editor)/planner/**` · `app/planner/**` · `app/space/**` · the planner's actions ·
  `components/shell/tools-popover.tsx` (the one tile).

## Rules for every package
- **Edit only your files** (above). Others edit the same tree right now. Re-read a file right before each edit; in a shared file stay inside your
  region; never `Write` over a file you didn't create. Anything you need elsewhere goes under "Needs from others" in your outcome file (exact file,
  what, why) — the orchestrator wires it.
- **No `next build`, no servers, no browser. Never write `local.db`** (no scripts against it). Check with `npx tsc --noEmit -p .` and `npx eslint
  <your files>`; errors in files you don't own are someone else's work in progress. Run `npm run design:lint` at the end; never raise its baseline.
- **Nothing is lost.** Every capability, rule, approval, refusal, Undo, `data-testid`, `?open=` target and address keeps working. Keep existing
  test ids; add test ids to new pieces. Comments cite the map row id in the surrounding style: `/* (parity map, MO-094) … */`.
- **Probes**: grep `design-source/verify/**/*.cjs` for every string, test id, address and layout your change alters; update those assertions with
  `(parity map, a deliberate change of this rule)`. Write ONE new probe for your package, not run: `design-source/verify/parity-map-build/verify-pm-<pkg>.cjs`
  — same shape as `design-source/verify/projects/verify-pj-gap-*.cjs` (args `<scratch.db> [shotDir]`, env `BASE`, sqlite3 with `-cmd ".timeout 30000"`,
  refuses `local.db`, puts back what it changes, asserts rules not counts from another round, takes shots at 1440 and 390).
- **Demo data**: if your feature needs records to show (e.g. a VO with days, a late delivery, a lead's message), write an idempotent repair block
  as text in your outcome file (the orchestrator inserts it into `scripts/repair-demo-data.ts` and re-takes the baseline). Don't edit the script.
- **Register**: stage rows in `design-source/context/parity/28-projects-finance-parity-map-2026-10-10/build/reg-<PKG>.md` as
  `| REG-<PKG>.1 | Area | **What** — why (her "build everything that's in 1.0" 2026-10-10; map row ids) … *(invented copy: …)* | user-directed |`.
  Don't edit `design-source/REGISTER.md` or `CLAUDE.md`.
- **Outcome**: `…/build/outcome-<PKG>.md` — per map row: what changed (files), what to check in the browser (pages, roles — Dane the Owner,
  Germaine / Michelle Designers, Hui Min an Admin; View as switches; 1440 / 768 / 390), probes changed, Needs from others, repair text, stand-ins,
  and anything not finished and why. Final message: a 10-line summary + the outcome path. If you run long, finish cleanly: write the outcome for
  what is done rather than leaving a half-edited file.

## Demo records (P-2026-002 Benjamin Han is the busiest)
Benjamin: In progress; milestones Hacking & demolition (done) · Masonry & tiling (done) · Electrical & plumbing (done) · Carpentry fabrication (in
progress) · Painting · Cleaning & touch-up · Handover & defect check. INV-2026-006 Mid-Project overdue (reminded 2×); PO-2026-008 to Stone & Tile
waiting; AquaFlow bill AF-7781 overdue; Germaine's Grab claim; VO "Kitchen countertop" priced pick. Others: P-2026-001 Ryan (In progress; a payment
to confirm) · P-2026-003 Aisha (On hold) · P-2026-004 Marcus Teo (Setting up, direct) · P-2025-001 Shalini Menon (Completed) · P-2026-005 Tan Wei
Ling (Deleted). The scratch DB with this data and migration 0085 applied: `/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/e5dd05f7-6d12-4054-b5ca-a720d5c0629b/scratchpad/pbuild/src.db` (read it with sqlite3 for ids; never write it).
