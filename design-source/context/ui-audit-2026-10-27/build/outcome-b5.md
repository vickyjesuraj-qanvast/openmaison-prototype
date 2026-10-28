# Lane B5 — Company · Settings · Finance · Reports · Plan & AI credits (the calm UI build, 2026-10-27)

Worktree `agent-ae551ce0cf50702c0`, on its WIP base `cba6547e`; nothing committed after it. Built in four disjoint file sets in the one worktree:
**B5 main** (Company: Members, Profile, public profile, Integrations, Client portal set-up, Questionnaire, the Company panel; Settings › Finance's
frame), **B5-S** (Settings), **B5-F** (Company › Finance), **B5-R** (Company › Reports, Plan & AI credits). Each part's full record is in
`parts/{M,S,F,R}.md` (+ `parts/*-reg.md`); this file is the lane's summary in the brief's §5 order. Shots: `shots/{M,S,F,R}-*-{before,after}-*.png`.

Checks: `npx tsc --noEmit -p .` clean · `npx eslint` on every B5 folder clean (2 warnings, both B4's templates file) · `npm run design:lint` nothing new
(every rule at or under its baseline) · the guard: zero gone (below) · every changed screen looked at 1440 · 1280 · 1024 touch · 768 touch · 390
touch · 320 — no page scrolls sideways.


## 1 · Built (per finding — the detail is in the part named)

| Finding | Result | Part |
|---|---|---|
| 1-15 · 5-40 Company panel help lines | Built — rows are their names (help = tooltip + ⌘K's sub line), one sentence-case heading, groups Studio · Money & reports | M |
| 1-29 Your profile (my `member-words.ts`) | Not here — the line is rendered by B1's page; Request | M |
| 4-06 Payment / Project schedules (my `sections.ts`) | Built for my files (tab, crumb, help); the editors' words are B4's | M |
| 4-39 My Items → Items (my `sections.ts`, `folder-libraries.ts`) | Built for my files (tabs, kinds, crumb); the rest B4's | M |
| 5-01 Members rows (the owner's example) | Built — one row + ⋮ + the member drawer | M |
| 5-02 Members rules paragraph | Built — two doors under the list | M |
| 5-03 Members system words | Built | M |
| 5-04 Who may do what matrix | Built — one row + drawer (one role at a time, All roles kept) | S |
| 5-05 232 message previews | Built — Edit wording per event (drawer) | S |
| 5-06 money words | Built — Finance, project Profit tile, Reports (§2 words) | F · R |
| 5-07 two Profits | Built as words (Expected profit / margin, basis named, rules in tooltips); one GST basis not done (money maths) ▲ | R |
| 5-08 To do → Needs your attention | Built — one list of house rows, one text verb + ⋮ | F |
| 5-10 Finance on a phone | Built — Finance cards on the Leads card model (Commission keeps table cards ▲) | F |
| 5-11 "Open" in Next step | Built | F |
| 5-12 one row grammar | Built | F |
| 5-14 Integrations buttons / status words | Built — no filled button, Connected / Not connected | M |
| 5-15 Webhooks for developers | Built — Other forms…, Make a link, For your developer | M |
| 5-17 Settings signposts | Built — one help line, Related line at the end | S |
| 5-18 saving | Built — "Save" everywhere in B5, Undo on every save-as-you-go, Profile one header pair per tab (B3's two labels: Request) | S · M |
| 5-19 period control | Built — one pill on every report; each report keeps its own options ▲ | R |
| 5-20 report chips | Built — Report pill at every width | R |
| 5-21 Sales | Built — folds, one Going quiet with a switch, How these are counted | R |
| 5-23 card heads | Built — Client portal (PortalCard), Reports › Meetings, Settings sub-groups | M · R · S |
| 5-24 CAPS tags | Built — Members, Finance Recently, Integrations, Vendors, public profile / designer card; Questionnaire's type chip is B1's DefinitionTable → Request | M · F |
| 5-25 truncation | Built | F |
| 5-26 one Project cell | Built in Finance; Reports › Profitability's single-string cell not changed (it is also Export's column) | F |
| 5-27 Finance toolbars | Built | F |
| 5-28 chip = title, Stuck | Built (§2: Payments made, Costs) | F · S |
| 5-29 create buttons | Built — Members, Questionnaire (New question in the header); Materials is B4's LibraryGallery → Request | M |
| 5-30 Questionnaire rows | Words built; the row's tools / type chip are B1's house DefinitionTable → Request | M |
| 5-31 Lead preferences dialog | Built | M |
| 5-32 Lead management words | Built | S |
| 5-33 Projects approvals | Built (B3's pointer lines: Request) | S |
| 5-34 Settings › Finance | Built — one-sentence helps, How numbers work, Printed papers by chip (B3's "Trust the client’s proof": Request) | S · M |
| 5-35 Profile helpers | Built | M |
| 5-36 Profile tabs | Built — Details · Bank & entities · Registrations · About page | M |
| 5-37 Client portal set-up | Built — Set up, outlined See it as, PDPA said once; the Clients card kept ▲ | M |
| 5-38 Usage By member | Built | R |
| 5-39 Commission | Built | F |
| 5-41 member / client words | Built in B5's files; libs' words → Requests | M · R |
| 5-43 Vendors | Built | F |
| 5-45 Meeting Copilot spelling | Built in Settings; the report model's words → Request (B2) | S |
| 5-46 Members layout | Built (the one-row model) | M |
| 5-49 date formats | Built in To do; Plan / Health / Portal dates come from B1's / B3's helpers (unchanged) | F |
| 5-51 public profile words | Built | M |
| 5-52 Settings ↔ Company | Kept by the contract (two places); the doors built (Related lines, Members' two links); no Settings group in the panel (T-14) | S · M |
| 6-20 All designs (my `folder-libraries.ts`) | Built for my file (crumb top "Designs"); the gallery is B6's | M |
| touches 1-02 · 1-03 · 1-13 | Built in my files (the panel's "n approvals", grey; the groups) | M |
| touches 3-02 · 3-03 · 3-16 · 5-13 | Built in my files | F |
| touches 5-09 · 5-22 | Built in my files; the libs' words → Requests (B1 · B2) | R |
| touch 5-16 | Built — Demo chips (Integrations, Listed on Qanvast), billing's "(demo)" and Dodo line | M · R |
| touch 5-42 | Not here — the chip's words are B3's `accessChip` → Request | M |
| touch 5-44 | Built ("Prepared by", Signing links); units' case not done (stored words, B4) | S |
| touch 4-35 | Not here — B4's brand kit; its ghost in my file follows at landing → Request | M |

Count: **48 findings** — 42 built (5 of them with a part held for another lane's file), 2 built as words with one part ▲ (5-07, 5-19), 1 kept by the contract
(5-52), 3 not in my files (1-29 → B1, and the not-mine halves noted); **13 touches** — 10 done in my files, 3 requests (4-35, 5-42, and 5-44's units).

## 2 · The ledger (every moved action — what · was · now)

The full tables: `parts/M.md` §2 (Company), `parts/S.md` §2 (Settings), `parts/F.md` §2 (Finance), `parts/R.md` §2 (Reports, Plan). The moves a developer
meets first:

| What | Was | Now |
|---|---|---|
| Members: Edit details · Public profile · Copy invitation link · Cancel invitation · Deactivate | buttons on the row | the row's ⋮ (`member-more`; each keeps its testid) |
| Members: Reports to · Open to new leads · Lead preferences · Max projects · PayNow · a Manager's team · signature state · portal state | the row and its second line | the member's drawer (`member-open` → `member-drawer`) |
| Members: the rules paragraph | the card head | "What can each role do?" · "Who sees which leads" under the list |
| Profile: its six cards | one page | four tabs (`?tab=`); #card addresses open their tab |
| Profile: About page's Discard · Save (`about-save`) | the card | the page header on the About page tab |
| Integrations: stand-in sentences (`int-simulated-*`, `qanvast-simulated`) | lines | a Demo chip, the sentence its tooltip / name |
| Integrations: a link's Try it · Regenerate · Revoke | buttons | the link's ⋮ |
| Settings › Roles & access: Who may do what (every `may-*`) | on the page | "See the list" → drawer |
| Settings › Notifications: each message's wording (`message-*`) | 232 previews on the page | its event row's "Edit wording" → drawer |
| Settings: Kept in Company · Your profile · pointer paragraphs | under each module's title | one Related line at the module's end |
| Finance › Needs your attention: five tables | tables | one list of rows; every column's fact on the row's line |
| Client payments: Open · View receipt (`money-in-open`, `money-in-view-receipt`) | buttons | the row's ⋮ |
| Commission: a project's Pay · a request's Decline | buttons | the row's ⋮ |
| Reports: report chips · range chips · Finance's period select | chips / select | "Report: … ▾" · "Period: … ▾" pills (same testids); captions → the pill's tooltip |
| Reports: foot notes | paragraphs | "How these are counted" |
| Sales: no-win sources · Over time's table · the second Going quiet table | on the page | under their fold / the By member switch |
| Studio health: 11 of 15 tiles | on the page | under "Show all figures" |
| Usage: members with no AI and no limit · each limit's select (`member-amount`) | rows · a select | under one fold · the row's ⋮ |

## 3 · Words

Applied: **B5 main 52 · B5-S 31 · B5-F 28 · B5-R 30 — 141 rows** across the lane's 138 word rows (some rows touch two parts; every row on B5's files is
applied or explained). Not applied, with the reason: W-449 · W-527 · W-541 (B1's files), W-264 · W-617 · W-054's Workload half (B3's), W-649 · W-144's
report-model half · W-409's tile (B2's), W-032 · W-075 tiles (B1's model), W-645 · W-437 · W-236's crew half (B3 renders them), units' case (B4) — all in
§7; W-533 kept by §2 (Issues on screen); W-039 / W-305 / W-074 · W-088 written as §2 says (Costs, Payments made, "n approvals"), not as the row proposed.


## 4 · The guard

`node design-source/verify/ui-audit-build/guard.mjs snap . $RL/B5/guard-after.json` (taken after the last edit: 173 pages · 1064 server actions
called · 3804 control handles · 120 keys), then `diff guard-before.json guard-after.json`:

```
✓ pages: none gone
✓ server actions a screen calls: none gone
✓ control handles (data-testid · data-kb): none gone
✓ keyboard shortcuts: none gone
  new handles: 41
```

Zero gone. (One handle, `member-your-profile`, had briefly gone because it was written as an expression; it is a literal again on its own branch.)


## 5 · Probes (`design-source/verify/regression/run.cjs 3451 …` on a fresh base copy each, through `heavy.sh probes`)

The last run of each id. Run 3 (build 3) ran all 19; build 4 changed only the CreditsTable phone label (REG-B5.M14), so its users in this list
(cr-r1 · r3 · r4 · r5, rwd-w4) ran again on it with the three ids that had failed. Build 5 changed only the Listed on Qanvast Demo chip's class,
so pm2-s37 ran again on it. Summaries: `$RL/B5/run/summary-run3.txt` · `summary-run4.txt` · `summary.txt` (run 5).

| Probe | Result | Restated (each line marked `(the calm UI build 2026-10-27, a deliberate change)`) |
|---|---|---|
| st-r1 | 58 / 0 | Who may do what is the Roles & access drawer (open it, All roles); Profile's entities on `?tab=entities`; "Save changes" → "Save" |
| st-r2 | 30 / 0 | the drawer before each `may-*` row; Settings words (Related line, one help line) |
| st-r3 | 30 / 0 | Stop offering (was Retire), Related line, the moved pointers |
| cr-r1 | 59 / 0 | — |
| cr-r3 | 40 / 0 | — |
| cr-r4 | 41 / 0 | Usage: a member's limit in the row's ⋮, members with no AI under their fold |
| cr-r5 | 16 / 0 | — |
| fixes720 | 38 / 0 | — |
| insights-head | 16 / 0 | — |
| pm2-s09 | 78 / **1** | Members' Copy link / Cancel invitation / Deactivate in the row's ⋮ (`inMenu`), the roles drawer. **The one failure isn't B5's:** "Join lands her on Finance (her home)" — `homeOfRole` (lib/settings/roles.ts:59) returns `/dashboard` for every role since the Dashboard redesign (his Q-08, "Accounting's front door: the Dashboard"), already in the WIP base; `git diff HEAD -- lib/settings/roles.ts` is empty. Run 3's six other failures (rows read before the refresh landed, on a machine running four probe lanes) passed on the rerun with no change. |
| pm2-s17 | 130 / 0 | Questionnaire's *New question*; ghost words |
| pm2-s31 | 103 / **2** | **Not B5's:** "Studios · demo only: the demo's, then the one started here" (the studio rows' sub-line comes back null) and "switching wrote nothing to the demo (members)" — View as' studio switch (`components/shell/view-as-popover.tsx`, `lib/studios`, `app/view-as-actions.ts`); `git diff --stat HEAD -- components/shell lib/dashboard components/dashboard lib/studios app/view-as-actions.ts lib/settings/roles.ts` is empty, the same two failed in runs 2 and 3. |
| pm2-s37 | 84 / 0 | the Demo chip (`/^Demo$/i`, its sentence in the name); Profile tabs (Registrations, back to it after the UEN on Details); one Save; Integrations' two status words (Not connected) |
| pm2-s39 | 175 / 0 | *Show all figures* before the tiles; the report's words (members not active, AI uses, By member); the Export sheet's words |
| pm2-s41b1 | 110 / 0 | the roles drawer read, then closed (its switches sit under it); the Report pill's menu (`reportsIn`); To collect |
| pm2-s44r | 82 / 0 | Needs your attention is one list of rows (`[data-todo]`); "Bill EL-2207 from Bright Spark Electrical approved — it can be paid" |
| pm2-s45a | 158 / 0 | Sales' folds, the Report pill, By member |
| ux-p6 | 57 / 0 | Reports to in the member's drawer (the snackbar step opens it); the drawer closed before Add member (Esc, else its Close); the signature state in the drawer |
| rwd-w4 | 38 / 0 | one selector |

Found and fixed by the probes on the way (all in B5's files): the Reports › Finance ghost now draws each report's own tables (To collect / To pay
open on By how late — six rows, no help line) and its tiles' line counts; Reports › Leads' / Meetings' Export ghost is 100 wide like the button;
the Listed on Qanvast Demo chip reused the card's `.demo` class and drew a dashed rule and 12 px above itself (renamed `.demoChip`); Profile's
listing card stays mounted across tabs, so its *Add your UEN* door keeps the application's words.

**Tally: 19 probes · 1,343 checks passed · 3 failed, none caused by B5** (pm2-s09 · 1, pm2-s31 · 2 — the proof is in their rows). 16 of 19 are green.


## 6 · Measures (the audit's `measure.cjs`; before = `lanes/lane-5-pages.md`, after = the lane's dev server on the lane's demo copy)

**Company and Settings (B5 main · B5-S)** — words · controls · purple text · filled · caps · cut · page height, at 1440 unless named:

| Screen | Before | After |
|---|---|---|
| /company/members | 404 · 61 · 28 · 1 · 6 · 3 · 1,406 | **102 · 30 · 2 · 1 · 0 · 0 · 1,024** |
| /company/members @390 touch | 121 · 11 · 4 · 1 · 2 · 0 · 4,588 | **54 · 16 · 0 · 1 · 0 · 0 · 1,619** |
| /company/profile (Details, the longest tab) | 134 · 18 · 1 · 1 · 0 · 0 · 3,743 | 104 · 22 · 2 · 1 (Save) · 0 · 0 · 1,166 |
| /company/members/sarah/profile | 139 · 12 · 1 · 1 · 0 · 0 · 1,684 | 126 · 12 · 1 · 1 (Save) · 0 · 0 · 1,680 |
| /company/integrations | 309 · 8 · 4 · 1 · 5 · 0 · 2,199 | 236 · 10 · 6 · 0 · 7 · 0 · 2,027 |
| /company/questionnaire | 180 · 78 · 0 · 1 · 14 · 0 · 1,063 | 169 · 79 · 2 · 1 (New question) · 14 · 0 · 1,059 |
| /company/portal | 276 · 22 · 9 · 1 · 11 · 0 · 1,966 | 256 · 22 · 9 · 0 · 7 · 0 · 1,982 |
| /company/portal/clients | 179 · 20 · 1 · 0 · 14 · 1 · 1,024 | 180 · 20 · 1 · 0 · 14 · 1 · 1,024 |
| /company/materials | 74 · 19 · 1 · 0 · 1 · 0 · 1,024 | unchanged (B4's gallery — Request) |
| /settings?section=studio (Roles & access) | 267 · 17 · 9 · 0 · 2 · 0 · 8,123 | **235 · 16 · 3 · 0 · 2 · 0 · 1,265** |
| /settings?section=leads | 288 · 22 · 18 · 0 · 4 · 0 · 2,518 | 319 · 18 · 9 · 0 · 3 · 0 · 2,403 |
| /settings?section=leads @390 touch | 165 · 14 · 11 · 0 · 0 · 0 · 4,161 | 135 · 11 · 4 · 0 · 0 · 0 · 4,018 |
| /settings?section=meetings | 217 · 17 · 3 · 0 · 2 · 0 · 5,770 | 250 · 19 · 1 · 0 · 2 · 0 · 5,775 |
| /settings?section=projects | 398 · 20 · 13 · 0 · 3 · 0 · 3,269 | 320 · 18 · 3 · 0 · 3 · 0 · 3,120 |
| /settings?section=quotes | 242 · 16 · 10 · 0 · 0 · 0 · 3,746 | 253 · 13 · 4 · 0 · 0 · 0 · 3,675 |
| /settings?section=finance | 262 · 34 · 11 · 1 · 3 · 0 · 5,189 | 208 · 32 · 4 · 1 (Save) · 2 · 0 · 4,604 |
| /settings?section=notifications | 313 · 39 · 4 · 0 · 5 · 0 · 26,324 | **333 · 57 · 15 · 0 · 5 · 0 · 12,387** |

Why some figures rose: Integrations' and the portal's "caps" are the house MetaChip's capitals (the new *Demo* chips; status words); Questionnaire's 79
controls are the house DefinitionTable's row tools (B1's — Request); Notifications' controls and purple are the new *Edit wording* text buttons, one
per event (the 232 previews and their 232 links left the page — half the height); Settings › Leads' and Meetings' words are the Related line and the
one-sentence helps that replaced the signposts above the cards (the signposts' purple went 18 → 9).

**Company › Finance (B5-F)** — words · controls · purple · filled · caps · cut · height:

| Screen | Before → after |
|---|---|
| Needs your attention (was To do) | 295 → 320 · 43 → 44 · 20 → 16 · 1 → 1 (New ▾) · 12 → 0 · 15 → 0 · 2,371 → 2,217 |
| Needs your attention @390 | 112 → 131 · 22 → 22 · 8 → 5 · 0 → 0 · 0 → 0 · 2 → 0 · 5,072 → 4,190 |
| Client payments › Invoices | 340 → 288 · 37 → 41 · 24 → 6 · 0 → 0 · 27 → 27 · 14 → 0 · 1,308 → 1,347 |
| Client payments › Client payments | 353 → 273 · 36 → 34 · 22 → 4 · 0 → 0 · 39 → 33 · 20 → 0 · 1,180 → 1,336 |
| Costs › Purchase orders | 316 → 309 · 38 → 35 · 16 → 6 · 1 → 1 · 16 → 15 · 20 → 0 · 1,024 → 1,177 |
| Costs › Supplier bills | 191 → 198 · 31 → 31 · 12 → 6 · 1 → 1 · 14 → 14 · 7 → 0 · 1,024 → 1,024 |
| Costs › Payments made | 181 → 188 · 21 → 21 · 2 → 2 · 1 → 1 · 10 → 10 · 6 → 0 · 1,024 → 1,024 |
| Costs @390 | 77 → 92 · 17 → 19 · 5 → 3 · 0 → 0 · 1 → 2 · 0 → 0 · 3,050 → 2,786 |
| Vendors | 263 → 213 · 36 → 34 · 13 → 2 · 1 → 1 · 18 → 6 · 1 → 0 · 1,180 → 1,180 |
| Commission | 299 → 274 · 24 → 23 · 10 → 8 · 0 → 0 · 17 → 17 · 1 → 0 · 1,592 → 1,599 |

(Caps left are status tags and the house table heads; words grew on Needs your attention because the reasons show whole instead of "…".)

**Company › Reports, Plan & AI credits (B5-R)** — words · controls · purple · filled · caps · height:

| Screen | Before | After |
|---|---|---|
| /company/reports/leads | 200 · 13 · 1 · 0 · 16 · 1,157 | 169 · 10 · 3 · 0 · 16 · 1,109 |
| /company/reports/leads?report=sales | 209 · 14 · 1 · 0 · 17 · 4,816 | 198 · 10 · 1 · 0 · 17 · 3,354 |
| /company/reports/meetings | 269 · 18 · 1 · 0 · 24 · 1,445 | 246 · 15 · 1 · 0 · 22 · 1,449 |
| /company/reports/finance | 147 · 19 · 1 · 0 · 7 · 1,944 | 138 · 10 · 1 · 0 · 10 · 1,888 |
| /company/reports/health | 174 · 19 · 1 · 0 · 15 · 2,178 | 145 · 14 · 3 · 0 · 11 · 1,650 |
| /company/plan | 192 · 15 · 1 · 0 · 9 · 1,809 | 167 · 11 · 3 · 0 · 12 · 1,421 |
| /company/plan/billing | 221 · 12 · 2 · 1 · 12 · 1,045 | 201 · 12 · 2 · 1 · 12 · 1,045 |

(The extra purple on Reports are the fold buttons — "How these are counted", "Show all figures" — the house text buttons.)

Shots: `$RL/B5/shots/{M,S,F,R}-*-{before,after}-*.png` (1440 · 1024 touch · 768 touch · 390 touch · 320; ghosts; open menus and drawers).


## 7 · Requests (exact changes in files B5 doesn't own)

**Must land WITH this lane** (else a figure goes missing):
- **B1 · `lib/maison-ai/answers/dock.ts:46`** `flow.tiles.find((t) => t.label === 'Money in')` → `'Collected'`; **`lib/maison-ai/answers/work.ts:403`**
  `r.tiles.find((t) => t.label === 'Owed to you')` → `'To collect'` — they look Reports › Finance's tiles up by label (B5-R renamed them, §2).

**B1 (shell, house pieces, ⌘K, libs no lane owns)**
- `lib/global-search/model.ts` — keep the old words findable: Finance rows += "to do", "money in", "money out", "paid", "payments out", "stuck",
  "to approve"; `finance-reports` += "owed to you you owe commissions"; `finance-profitability` += "expected profit expected margin"; `usage` += "monthly
  amount monthly limit cap"; the Settings card "Who may do what" → title **What each role can do** (keep "who may do what" in its words); "What waits for
  an Owner or an Admin" → **Approvals** (keep the old words); "Message wording" → keep its words (its home is each event's *Edit wording*); the Templates
  row "Schedules" → **Project schedules** (keep "schedules"); the Price book's "My Items / My Sections" words kept. The Profile rows (`#details`,
  `#entities`, `#registrations`, `#qanvast`, `#reviews`) still land — the page opens the card's tab.
- `components/om/definition-list.tsx` (5-30, shared with Settings › Custom fields): a row = drag handle · name (press = Edit) · the type as secondary
  sentence-case text (not a MetaChip) · Required · Active · ⋮ (Edit · Move up · Move down · Delete — keep `bank-question-handle`, the rows' testids and
  the Delete “…” accessible names); `DefinitionDialog`'s new-item title "Add {noun}" → **"New {noun}"** (5-29: the page's button now reads New question).
- `lib/studio-health/model.ts` (5-22): GROUPS 'Your team' → 'Members'; tiles 'AI runs' → 'AI uses', 'Hangout chats' → 'Qanvast Hangout chats',
  'Tickets resolved' / 'Tickets raised' → 'Issues resolved' / 'Issues raised'; `${n} did nothing` → `${n} not active in this period`; the trend series and
  `trendSubtitle` 'AI runs' → 'AI uses'; `healthSheet` 'By team member' → 'By member'.
- `lib/format.ts` `durationWords` (5-09): "30m" → "30 min", "26.3h" → "26 hours".
- "monthly amount" → "monthly limit": `lib/notifications/model.ts:85-87, 337` · `lib/dashboard/inbox-queries.ts:436, 439` ·
  `lib/maison-ai/answers/money.ts:205` · `app/credits/actions.ts:96, 313`; `lib/dashboard/pulse.ts:79-80` 'Owed to you' → 'To collect', 'You owe' → 'To pay'.
- `lib/notifications/model.ts` untouched-lead help → "Nobody contacted it within the time set under Lead management › Untouched leads."
- The Dashboard's chip "To approve" → **Approvals** (§2; dash-d2 / d5 read it).
- `lib/qanvast-listing/model.ts` (W-527 · W-541 · 5-41): `LISTING_WORDS.helpNot` / `helpListed` "Homeowners …" → "Clients …"; `LISTING_WORDS.outside` →
  "You were listed on Qanvast before OpenMaison. Update your listing to bring it in."
- Your profile (1-29 · W-449): stop rendering `detailsHelp` (lib/company/member-words.ts) under *Your details* — B5 keeps the function until it is unused.
- `components/shell/tools-popover.tsx` — its "TOOLS" caps eyebrow → the Company panel's sentence-case title, so the rail's two panels match (W-147).
- (consistency, optional) the studio block's / Dashboard's "closed to new leads" → "not taking new leads", Members' words now.

**B2**
- `lib/leads/tat.ts` (5-09): leg labels 'Time to assign' · 'Time to first contact' · 'First contact to Won'; `MEDIANS_NOTE` → "Each time is the usual one —
  the middle lead’s, so one slow lead doesn’t skew it."; `insightsSheet` 'Leads awaiting assignment' → 'Leads waiting for a member', 'Assigned, no outreach
  logged yet' / 'Awaiting outreach' → 'Not contacted yet', 'By team member' → 'By member', heads → 'Time to first contact' · 'First contact to Won'.
- `lib/leads/sales.ts` SECTIONS: `members.title` → 'By member'; `quietMembers.title` → 'Going quiet, by member'.
- `lib/meetings/report-model.ts`: 'Went ahead' → 'Won after'; 'Tips acted on' → 'Tips used'; `CHECK_TITLE` → 'Is the deal score right?'; L167 evidence →
  `` `${m.name} ${pctText(m.aheadShare)} · studio ${pctText(studioShare)}` `` (W-649); `meetingsSheet` heads likewise; "with the co-pilot on" → "with Copilot on" (W-144).

**B3** — B3 has landed; its outcome (§1: 5-18 · 5-33 · 5-34 · 5-42 · 3-15 · 3-16 · 5-09 · 3-02) reports every row below as done except, as far as
it says, the `&do=approve` key in `project-money.tsx` and W-617's "By team member → By member" on Projects › Insights — check those two at landing.
- `components/projects/money/invoice-settings.tsx:99` "Save invoice rules" → "Save"; `invoice-paper-settings.tsx:151` "Save the paper" → "Save" (5-18 · W-017).
- `components/projects/money/payments-settings.tsx:62` "Trust the client’s proof" → "Count a client’s proof of payment before you check it" (5-34).
- `components/projects/ending/handover-setting.tsx:40` → "Handover needs approval" (W-041); `:47` and `components/projects/schedule/schedule-settings.tsx:111`
  pointers → "Switched under Approvals, above." (keep `handover-review-pointer`, `schedule-approvals-pointer`).
- `components/projects/contractors/crew-list.tsx:50` "Leader checked by" → "Checked by" (W-236).
- `lib/projects/handover-model.ts:422` (+ `lib/projects/handover.ts:168`): carry `ClosingNumbers.belowPlan` and use `tone: 'alert'` only when it is true (3-16);
  never print "Expected 0%".
- `components/projects/money/project-money.tsx:151` keys `&do=approve` on the label "Approve and send" — key on `next.testId === 'po-next-approve'` (or
  `act === 'send'`) before any rename of that verb.
- `components/projects/insights/project-insights-view.tsx` + ghost: the same bar as Reports' other tabs (`PickPill`, `HowCounted` from
  `components/company/reports/report-pill.tsx`, `ins.pickBar`); 'Start → Completed' → 'Project length'; 'Collection days' → 'Days to get paid'; 'By team
  member' → 'By member' (W-617).
- `lib/portal/model.ts` `accessChip` (5-42): the chip says the state only — "Opened" (green) · "Invited" (yellow) · "Not invited" — the date stays in Last
  opened (Company › Client portal's two views read it).
- `lib/portal/sections.ts` (W-264): the "Money" section → "Payments" (with the project tab's rename).
- `components/projects/workload/workload-view.tsx:120` "Projects at once" → "Max projects" (W-054; Members says it now).

**B4**
- `components/company/templates/library-gallery.tsx:622` — `newAction`'s button filled (drop `variant="primary" appearance="outlined"`): Materials' **New
  material** becomes its page's one filled create, as every other Company page's (5-29).
- `BrandKitGhost` / `TemplateLibraryGhost` / `PriceBookGhost` live in `components/company/company-ghosts.tsx` (B5's file): whatever B4 drops from the brand kit
  page (4-35: the intro, the card helpers, the preview note) or the price book's heads must be mirrored there — the coordinator applies it at landing.
- The Price book's tabs now read **Items · Sections** from `lib/company/sections.ts` (4-39); B4's own words for them (row menus "Save to Price book", "From
  the Price book · …") and B4's probes that read "My Items" follow.
- `lib/quotes/items-model.ts` `UNITS` (5-44): one case for the default units' spelling — stored words, B4's call.

**Probes other lanes run that B5's changes reach** (the exact lines are in `parts/S.md` §4, `parts/F.md` §4, `parts/R.md` §4):
- Roles & access' table is a drawer — open it first (`studio-roles-open`, then the "All roles" chip): st-r1/r2 (done here), pm2-s14 :139–143 · :246,
  pm2-s01 :249, pm2-s06 :373, pm2-s44o :199, pm-i :200, pb-r2 :179–185, pj-r5 :373, pj-r6 :341, pj-r7 :83 · :86, pj-fix-E :250, ks :96–97, KE :144–155,
  dane P2b :71–93 · :288, pm2-s08 :311 (ghost words "What each role can do").
- Settings words / doors: pm2-s46c :123–146, pm2-s14 :102 · :148 · :154, pm2-s06 :242 · :327, ks :47 · :69, dane P2b :120 · :125, sw-r4 :101 (Edit wording).
- Finance: pm-a :66 · :81 · :84 · :87–89, pm-i :97 · :197, pj-gap-f2 :175 · :178.
- Reports: pm-c :127, verify-reports :53 · :62, pm2-s42c :193, pj-gap-i :124 (after R-B3-1).
- Company: pb-r2 :41 · :75 ("1 proposed" → "1 approval" in the panel); pm2-s34 :297–306 (`int-simulated-*` read the chip's `aria-label`, its text is
  "Demo"; "Generate webhook URL" → "Make a link", :227); pm2-s44o :245 ("Simulate an enquiry arriving" → "Try it"); pm2-s01 / s14 / s27 / s30 / s43e,
  pj-gap-h, r2e, dane P3, sw-r4 — any press of a Members row's pencil, Preferences, Public profile, PayNow, Projects at once, Deactivate or invitation
  buttons now opens the row's ⋮ (`member-more`) or the member's drawer (`member-open`) first (same testids); any `/company/profile` step on entities,
  registrations, the listing or About adds `?tab=entities|registrations|about`; "Save changes" on Profile / a public profile → "Save".

**B3's asks of B5 (its outcome §7), answered:**
- Finance's tabs "Client payments" · "Costs", Costs' "Payments made" — **done** (B5-F; `lib/finance/sections.ts`, the Payments made chip and list).
- `project-profit.tsx` "Cash so far" → "Cash in hand ({sum})" with "Collected … − paid out …" in its tooltip — **done** (B5-F).
- `credits-table.tsx`: on a phone the *Next step* column (a row's verb and ⋮) names nothing — the card's foot — **done** (REG-B5.M14; keyed on the
  head, not the `next` key, because Contractors' "Next on site" is a column of facts keyed `next`).
- `todo-workspace.tsx`: a PO waiting for approval reads "Approve" + ⋮ (Approve and send · Send back · Open, the PO's own menu) — **done** (B5-F, 5-13).
- Members "Projects at once" → "Max projects" — **done** (REG-B5.M1; the drawer's field, its snackbar "… takes up to n projects").
- `lib/settings/permissions.ts` "Leader checked" — **done** as the action's row "Mark a contractor’s work checked" (B5-S).
- `lib/finance/profit.ts` the margin warning in the plan's words, none when the expected margin is ≤ 0, `belowPlan` for the tone — **done** (B5-F).
- Document numbers' "Tickets" → "Issues" — **done** (B5-S; the row's numbers still print T-2026-005).
- Settings' "What waits for an Owner or an Admin" → *Approvals* (5-33) — **done** (B5-S, REG-B5.S7).
- `lib/finance/todo.ts` / `use-costs.tsx` "Bill EL-2207 from Bright Spark Electrical" — **done** (REG-B5.M14; pm2-s44r:119 restated).
- The portal set-up's Clients card caption `agoText` — **not done**: B3 offered it "if the time is wanted there"; the card keeps the state only, as
  B3's chip now does, and the time stays on Clients' Last opened.


## 8 · ▲ For Vicky

**Company (B5 main)**
1. **Members (your example), as built:** the name opens the member's drawer (no separate Open button); the Role select is the row's only inline
   control; ⋮ = Edit details · Public profile · Copy invitation link · Cancel invitation · Deactivate (red; a refusal stays in the menu, greyed, with
   its rule as the row's second line). Reports to, Open to new leads, Lead preferences, Max projects, PayNow and a Manager's team live in the drawer.
   The Add member snackbar's *Set who they report to* opens the drawer with Reports to open. A second line shows only for what is off the usual.
2. **Profile is four tabs** (Details · Bank & entities · Registrations · About page). *Listed on Qanvast* sits on Registrations; its *Add your UEN*
   opens Details on the UEN field (the listing card stays mounted, so a half-written application survives) — the way back is the Registrations tab,
   not an automatic return.
3. **Stand-ins say "Demo"** as a quiet chip (Integrations, Listed on Qanvast) with the old sentence as its tooltip and name. The house chip prints
   capitals, so the page's caps count rose 5 → 7.
4. **Client portal › Set up keeps its Clients card** (5-37 proposed dropping it): another lane's probe (pj-r4a) reads its handles and the guard
   forbids losing them. It shows up to four clients and opens the Clients tab.
5. **Questionnaire still has ~79 controls**: the rows' ↑ ↓ ✎ 🗑 and the caps type chip are the house DefinitionTable (B1's, shared with Settings ›
   Custom fields) — the exact change is in §7.
6. **The Company panel's help lines are tooltips now** (and ⌘K's sub-lines). On a phone, where there is no hover, the panel is names only.
7. **Notifications** went 26,324 → 12,387 px. Each event now has *Edit wording*, which adds 57 controls and 15 purple text buttons. Folding the
   ~105 event rows by area would be the next step (see B5-S below).

**Settings (B5-S)**
8. The roles list opens on **Designer** (the role owners ask about most) and keeps an **All roles** chip (the six side by side) — the audit proposed
   one role at a time only.
9. **A Settings choice now answers with Undo everywhere** (5-18's one rule).
10. Sources and reasons say **"Stop offering"** instead of "Retire". Company › Profile's issuing entities still say "Retire".
11. **The Related line is plain text links**, "Related:" first. The H2 that repeated the tab is visually hidden and still read by screen readers.
12. **"Leads now" → "Leads"**; Document numbers' Tickets row reads **Issues** (§2), and its numbers still print T-2026-005.

**Company › Finance (B5-F)**
13. **Money on Needs your attention rows is `moneyCard`** ("S$ 5,530"), the way the Dashboard says it. The registers (Client payments, Costs,
    Vendors, Commission) keep cents, because they list documents.
14. **"Approve" on To do / project rows vs "Approve and send"** on the PO list and the PO's panel: the project Money tab's `&do=approve` landing
    reads that label (B3's code). One word everywhere needs that key moved to the testid first.
15. **Client payments' Send / Confirm / Remind show only for whoever runs the books** (Owners, Admins, Accounting). A Designer would only meet a
    refusal there. The record and the ⋮ still open the project for everyone.
16. **Commission's "To pay"** for whoever pays; a member's own "My commission" keeps "Owed", because the money is owed to them.
17. **Commission on a phone** keeps the house CreditsTable cards. Its grouped member / project rows need their own card design, which was not drawn.
18. **To do's per-group Column settings went with the tables** (none had a testid); every fact a column held is on the row's line.
19. **Vendors' "All" chip** shows only while some vendor is inactive (otherwise it equals Active).

**Company › Reports, Plan & AI credits (B5-R)**
20. **One period list (5-19):** one control and one look everywhere, but each report keeps its own options. Leads, Meetings and Studio health count
    rolling ranges; Finance counts calendar periods. A shared list needs new maths in four reports.
21. **One basis for profit (5-07):** Profitability is now "Expected profit · On signed contracts, with GST" and "Expected margin", named apart
    from Profit and loss's before-GST "Profit". Moving it before GST would change the project Payments tab's own figure (money maths), so it is not done.
22. **The Finance Report menu has ten rows** (T-14 says under ten). Each row is a report; grouping them (Money · Costs · Statement) is possible.
23. **Studio health opens on four tiles** (the audit's pick); "Show all figures" is not remembered between visits.
24. **Sales › Over time** folds its table under the chart instead of dropping it, because the table has conversion and won value.
25. Usage keeps its short "This month ▾" on a phone; the Reports pills keep "Period:" on a phone.

**Register:** Numbered REG-3259…3302 (see build/reg-map.json) — Company (M) 3259–3272 · Settings (S) 3273–3282 · Finance (F) 3283–3290 · Reports, Plan (R) 3291–3302.
