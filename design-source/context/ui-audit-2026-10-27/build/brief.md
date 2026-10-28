# The calm UI build — the lanes' contract (2026-10-27)

**His word:** "there is a lot to go through manually — I want to go ahead with your recommendations, but now that we have everything from
1.0 to 2.0 and my team started to implement the changes we did, I want to make sure no feature or functionality is lost — this is just the
visual and UX improvements." So: build the audit's recommendations (`../README.md`, the review page https://claude.ai/artifact/NEw4ESHdVR2GmCwk2dPTKQ,
every theme and finding as proposed, every word as proposed) **as a visual, wording and UX pass that keeps every feature.**

Paths below: `RL` = `/Users/vicky/Documents/GitHub/openmaison-prototype/.claude/calm-build` (git-ignored; it moved here from the scratchpad after the 27 Oct reboot wiped `/private/tmp`),
`MAIN` = `/Users/vicky/Documents/GitHub/openmaison-prototype` (read-only for you — the owner's live tree; never edit it, never run anything
in it that writes).

## 0 · Set up (first thing)

You are in your own git worktree, which already carries the "WIP base" commit (main's uncommitted state — your starting point; every
change you make is measured from it). Run `bash $RL/setup-lane.sh <your lane>` from the worktree root: it checks that commit, clones
node_modules if missing, copies `.env.local`, gives you a scratch DB `$RL/<lane>/lane.db`, a build DB `$RL/<lane>/build.db`, the probe DBs in
`$RL/<lane>/run/` and the guard's before-snapshot `$RL/<lane>/guard-before.json`. Never commit anything after the WIP base; never push;
never touch `MAIN`.

**The machine has 18 GB and rebooted once with six lanes building at once (27 Oct 17:38).** So every heavy step goes through the limiter,
which waits for a free slot: `bash $RL/heavy.sh build <cmd…>` for a `next build` (2 at a time across all lanes) and
`bash $RL/heavy.sh probes <cmd…>` for a `run.cjs` probe run (3 at a time). Run them in the background (they can wait) and keep ONE
`next start` of your own at a time. Don't build after every edit — batch your changes, then build.

Your work list is `$RL/work-<lane>.json`: `findings` (yours — the audit's finding with its `proposal`, `now`, `why`, `code` and its theme),
`touches` (another lane's finding that cites one of your files — do the part in your files), `words` (every proposed wording change whose
`where` names your files — `now`, `proposed[0]` is the proposal, `files`). The themes and their rules are in `MAIN/design-source/context/
ui-audit-2026-10-27/themes.json`; the shots in `…/ui-audit-2026-10-27/shots/<finding id>.jpg`. Read `MAIN/DESIGN-PRINCIPLES.md`, `CLAUDE.md`
(*Map*, *How we work*) and `design-source/context/page-checklist.md` in your worktree first.

## 1 · Nothing is lost — the hard rules

1. **Move, never remove.** A control, tab, link, menu row, field, column, filter, view, shortcut, page or piece of information that exists
   today must still be reachable after your change — usually one press away (the row's ⋮, a "More" fold, a drawer, a "How this works"
   link, a tooltip). Folding a long list behind "Show all n" is fine; dropping rows is not. **Hiding text that repeats the same fact
   elsewhere on the same screen is fine** (T-04) — say where it still shows in your ledger.
2. **No behaviour change.** Don't touch server actions' logic, `lib/**` rules, the schema, migrations, repairs, the baseline, permissions,
   who-may-do-what, the stage policy, money maths, or any stored value. **Display words only**: where a stored value / enum is shown
   (a quote status, a stage, a kind), map it to its new label in ONE display map beside its enum (e.g. `statusLabel()`); the stored value,
   filters, URLs and query params stay exactly as they are. Exceptions the audit asks for and he approved: the two one-press actions get a
   confirm step (B3: confirming a client's payment from Needs you / Money; B4: "Sent it another way") — the same action after a confirm.
3. **Keep every handle.** Every `data-testid`, `data-kb`, `data-kb-*`, `aria-label` a probe or the key layer uses stays on the element that
   does the same job — when a button moves into a ⋮, its testid moves onto the menu row. Never rename a testid.
4. **Keep every address and every key.** Routes, `?from=`, `?open=`, tab slugs, shortcut ids and keys don't change. A tab or page renamed on
   screen keeps its slug (`/projects/[id]/money` stays even though it reads *Payments*). ⌘K keeps finding the old words (add the old name
   to the row's search words — `lib/global-search/model.ts` is B1's; ask B1 through your outcome's requests).
5. **The guard must pass.** Before you finish: `node design-source/verify/ui-audit-build/guard.mjs snap . $RL/<lane>/guard-after.json` then
   `node design-source/verify/ui-audit-build/guard.mjs diff $RL/<lane>/guard-before.json $RL/<lane>/guard-after.json` — **zero** pages,
   server-action call sites, handles or keys gone. (A handle that only moved to another file is not "gone"; if the diff lists one, you lost it.)
6. **Keep the ledger.** In your outcome, every action you moved: *what · where it was · where it is now*. The developers implementing 2.0
   read this — it is how they know nothing was lost.

## 2 · The decisions (the audit's recommendations, settled — apply exactly)

**One vocabulary (T-01) — on screen only:**

| Concept | Write | Instead of |
|---|---|---|
| what needs the member | **Needs your attention** (heading); "n need your attention" in a sentence | Needs you · things need you · To do (Finance's landing tab) · Needs my review · Waiting on you · Needs attention (Projects scope pill → **Needs your attention** too) |
| approvals | **Approvals** (group, tab, chip, badge: "4 approvals"); a row's state **Waiting for your approval** | To approve · Needs your OK · Your OK · awaiting · proposed · Sent for approval |
| a project's money tab | **Payments** (tab + its page title + the portal's tab); its regions **Client payments** (was Billing) · **Costs** · **Variation orders** (was Changes to the contract) | Money · Billing |
| Finance's two money lists | **Client payments** (was Money in) · **Costs** (was Money out); inside Costs the studio's own payments list is **Payments made** (was Paid) | Money in · Money out · Paid |
| money a client still owes | **To collect** (client papers keep the client's words: *Balance due*, *Paid so far*) | Outstanding · Owed to you · Owed · Still owed · Balance |
| money the studio still owes | **To pay** | You owe · Owed |
| money received | **Collected** | Received (tiles) · Money in (figures) |
| tickets | **Issues** on screen — "New issue", "Issues · n" (route `/tickets`, slugs, testids and ⌘K's old words stay); *Escalate* → **Flag to the Owner** | Tickets · Escalations |
| the studio's people | **Members** ("Owner" only for the role) | Team · People · Collaborators · team member |
| the customer | **Client** | Homeowner |
| a line's grouping | **Trade** | Category (quotes, price book) |
| stages | **Stage** only for a lead's or a project's stage; a payment part is a **payment** ("Payments · 4"); the portal's milestones are **milestones** | Payment stages · "2 of 7 stages done" |
| quote states (display) | Draft · Waiting for approval · Approved · With client · Confirmed · Signed; contract: Draft · Waiting for signature · Signed | Sent for Approval · Sent to Client · Awaiting approval … |
| validity | **Valid until** | Valid till · Expiry · Validity … |
| a quote's lines | **items** ("16 items") | lines |
| Visualizer pictures | **Versions** | renders (in the app) |
| a lead nobody opened | **Not opened** (scope row "Not opened yet"; the stage stays New) | Unseen · new |
| the reports button | **Reports** | Insights (button / door) |
| Meeting Copilot | spelled **Meeting Copilot** | co-pilot · Co-Pilot · Copilot alone |
| Company › Templates schedules | **Payment schedules** · **Project schedules** | Schedules |
| create | **New {thing}** in sentence case — New lead, New task, New quote, New issue, New project, New contract, New file | Add Lead · Create Quote · Create New Task · Add Task ▾ |

**Kept as they are (not in scope — the owner's earlier calls or 1.0's names):** "Qanvast Ops" (REG-77, his rename) and its Studios tab;
Quotes and Contracts inside Tools (REG-422); the rail's and the phone dock's order (the mocks); the tools' product names (Quote X-Ray, AI
Visualizer, Floorplan to 3D Isometric — 1.0's locked name —, 3D Space Planner, Market Insights, Compliance Navigator, Meeting Copilot);
no module moves home; Settings and Company stay two places; no tool merges. Where a finding proposes one of these, do only its wording /
noise part and note "kept by the contract" in your outcome.

**The house rules (T-02 … T-17) — apply in your area:**
- **T-02 one verb on a row:** at most ONE visible action per row (the DS secondary text button — the house Row / To do / Needs you look);
  every other action goes into the row's ⋮ (`PortalMenu` + `DropdownItem`, keeping each testid); no "Open" beside a ⋮ when the row opens;
  hover tools never cover the row's own cells.
- **T-03 one filled button per screen** — the screen's one job; never a state; never a move the page refuses (show the reason instead).
- **T-04 say each thing once** on a screen.
- **T-05 explanations off the page:** a screen says what it is in one line; longer help goes behind a "How this works" text link (the house
  `HelpLink` where there is one, else a `Tooltip`), a tool's how-it-works shows on first visit only; no prototype / demo talk on a studio
  screen (the prototype notes that matter go behind a "?" tooltip).
- **T-06 capitals only for a status** (Draft, Sent, Overdue…): a date, a type, a count, a name, a topic is sentence-case secondary text,
  not a `MetaChip`/`Tag`; one card-head style (bold sentence case).
- **T-07 counts only where they help a decision**, written "Label · n" (a tab's house count stays); a red badge = overdue and yours only.
- **T-08 empty means quiet:** an empty value shows nothing (leave the row out); a table cell that needs a stand-in shows "—".
- **T-09 plain words:** every title, label and status reads as a sentence a studio owner would say; no field codes, medians, internal names.
- **T-10 one look per control:** house `Tabs` to switch a view, the scope pill + Filters to narrow a list, one create button (New … ▾)
  in the tab toolbar / page header, autosave or one Save on settings pages, one card head, one Preview bar.
- **T-11 one format:** dates `displayDate` / the house's own helpers ("24 Oct ’26", today / yesterday where the house already says it),
  the house clock "2:00 PM", money `moneyCard` ("S$ 13,370") on cards, rows and tiles — documents keep cents ("S$13,370.04").
- **T-12 never cut the fact that matters** (wrap to a second line instead); **T-13 sentence case everywhere**; **T-14 long pages fold**
  (summary + first rows, "Show all n" or a drawer; menus under ten rows — group the rest under a "More ›" row); **T-15 phones get designed
  cards** (the Leads card model); **T-17 one number for one fact**; **T-18 defects: fix**.
- Use house pieces only (`components/om/*`, `@/components/ds`, the listing's table model, `PortalMenu`, `Chips`, `Tabs`, `EmptyState`,
  `Tooltip`, `ConfirmDialog`/`Dialog`/`Drawer`, `HelpLink`). Tokens only. Every CSS override order-proof (a doubled class against a house
  class, one more step against a house class-and-attribute rule — `design-source/context/responsive.md` › Load order). Every width:
  check 1440 · 1280 · 1024 touch · 768 touch · 390 touch · 320.

## 3 · Who owns which files (`$RL/ownership.json` — first match wins)

- **B1 shell & house & your day:** `components/shell/` `components/om/` `components/ds/` `components/dashboard/` `app/dashboard/` `lib/dashboard/`
  `components/maison-ai/` `lib/maison-ai/` `components/tasks/` `app/tasks/` `components/profile/` `app/profile/` `components/auth/` `app/sign-in/`
  `lib/format.ts` `lib/forms.ts` `lib/keys/` `lib/global-search/` `lib/notifications/` `app/notifications/` `components/writing/` — and any file
  no other lane owns.
- **B2 leads:** `components/leads/` (but not `quotes/` · `contracts/` · `insights/`) `app/leads/` `lib/leads/` `components/meetings/` `app/meetings/`
  `app/meeting/` `lib/meetings/` `components/qanvast/` `app/qanvast-ops/` `components/hangouts/` `app/hangout/`. **Shared with projects:** the
  info column, the Tasks / Files / Notes / Activity tab components — they serve both; word them for both.
- **B3 projects & portal & issues & messages:** `components/projects/` (incl. `tickets/`, `messages/`, `threads/`) `app/projects/` `app/(editor)/projects/`
  `lib/projects/` `components/portal/` `app/my/` `lib/portal/` `app/portal/` `app/invoice/` `app/receipt/` `app/tickets/` `app/chat/`.
- **B4 quotes, contracts, templates, price book, client signing pages:** `components/leads/quotes/` `components/leads/contracts/` `components/quotes/`
  `app/quotes/` `app/(editor)/quotes/` `lib/quotes/` `components/contracts/` `app/contracts/` `app/(editor)/contracts/` `lib/contracts/`
  `components/templates/` `app/(editor)/templates/` `lib/templates/` `components/company/templates/` `app/company/templates/`
  `components/company/price-book/` `app/company/price-book/` `lib/company/{price-book,…-templates,contract,template}*` `app/sign/` `app/confirm/` `app/quote/`.
- **B5 company, settings, finance, reports, plan & credits:** `components/company/` (but not templates / price-book) `app/company/` `lib/company/`
  `app/settings/` `lib/settings/` `components/finance/` `app/finance/` `lib/finance/` `components/credits/` `lib/credits/` `components/portfolio/`
  `components/leads/insights/` `app/po/`.
- **B6 tools & website:** `components/{marketplace,market-insights,visualizer,xray,floorplan-3d,planner,compliance,site,trial,dev}/` and their `app/`
  and `lib/` folders, `app/renders/` `app/space/`.

**Only edit files you own.** If a fix needs another lane's file (a shared house piece, a word in another module), write it under
*Requests* in your outcome with the exact change; I land it. If two lanes write the same word differently, §2 wins.

## 4 · Checking your work

- `npx tsc --noEmit -p .` and `npx eslint <your folders>` clean; `npm run design:lint` nothing new (never raise the baseline).
- A production build in your worktree: `DATABASE_URL=file:$RL/<lane>/build.db bash $RL/heavy.sh build npx next build`, then
  `DATABASE_URL=file:$RL/<lane>/lane.db npx next start -p <your check port>`. **Ports: B1 3410 · B2 3420 · B3 3430 · B4 3440 · B5 3450 ·
  B6 3460** (probes: the next one — 3411 · 3421 …). Never touch 3000 / 3001 / 3011. Stop your servers by port only
  (`lsof -ti tcp:<port> -sTCP:LISTEN | xargs kill`).
- Look at every screen you changed (Playwright; the audit's `measure.cjs` is at `MAIN/design-source/context/ui-audit-2026-10-27/measure.cjs`
  — re-measure your area's main screens and report before → after words · controls · purple actions · filled buttons · capitals).
- **The probes for your area** (`design-source/verify/regression/`): `RUN_DIR=$RL/<lane>/run bash $RL/heavy.sh probes node
  design-source/verify/regression/run.cjs <your probe port> <ids…>` (a few ids per call) then read each `$RL/<lane>/run/lanes/<id>/probe.log`. Your ids are listed in your prompt. **Restate** a text
  assertion your new words break (match the new words; mark it `(the calm UI build 2026-10-27, a deliberate change)`); **never weaken a
  functional assertion**; a probe that clicked a moved button now opens the ⋮ first. Run the list until green or every failure is
  explained (a failure you didn't cause — say so with its proof).
- Shots of before → after at 1440 and 390 for your main screens into `$RL/<lane>/shots/`.

## 5 · What you hand back

`$RL/<lane>/outcome.md`:
1. **Built** — per finding id: what you did (or "kept by the contract", or "not done — why").
2. **The ledger** — every moved action: what · was · now (the developers' list).
3. **Words** — the words rows applied (count) and any you didn't (why).
4. **The guard** — the diff's output (must be zero gone).
5. **Probes** — id · result · what you restated.
6. **Measures** — before → after for the main screens.
7. **Requests** — exact changes needed in files you don't own.
8. **▲ For Vicky** — any call you had to make that he might not expect.

`$RL/<lane>/reg.md` — your register rows, staged as `| REG-<lane>.n | Area | **What** — why (the audit's finding id) | user-directed |`
(I number them at landing). Don't edit `design-source/REGISTER.md`, `CLAUDE.md` or memory.

Your final message: built / not built counts, the guard's result, the probes' tally, the requests, and the ▲ calls.
