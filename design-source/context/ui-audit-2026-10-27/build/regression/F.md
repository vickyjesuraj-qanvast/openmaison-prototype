# Triage F — the calm UI build's closing regression (2026-10-28)

**Area:** the rest of B1 (the shell, the rail, ⌘K, the house pieces except the timeline, Your profile, sign-in, View as) and B6's tools and
website. **Probes:** ux-p4 · ux-p6 · ux-p7 · pm2-s46a · pm2-s46b · pm2-s46c · pm2-s01 · pm2-s31 · pm2-s30 · rwd-w6 · pm2-s35.
**Run dir:** `/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/fix-F`
(port 3482, the 01:28 build, a fresh copy of `base.db` per probe). The "WIP base" for "was it this build?" is commit `17135077`, which is main's
state before the calm build. `git diff 17135077 -- <file>` shows what the calm build changed.

## 1 · Every failing check

24 checks were red in the closing regression. Every restatement in a probe is marked `(the calm UI build 2026-10-27, a deliberate change)`.
Every source fix is marked `(calm-build regression fix F)`.

| probe | check | class | what I did | result |
|---|---|---|---|---|
| ux-p4 | Q4 the rail's Tools item counts it | Stale (B1 1-03 · 1-04, on purpose) | The rail's Tools has no count now. The same rule is now read where the count went. The rail's Tools is a plain "Tools" with no badge. The Dashboard's Needs your attention holds the row "OM-10001 is waiting for your approval", with Approve, on the card or in its See all drawer. The existing next check still reads the Tools panel's Quotes tile count. **▲ below.** | green (57/57) |
| ux-p6 | S5 menuitemradio "Almost out" | Stale (B1 1-40, the Demo fold) | The probe opens the studio block's Demo fold before pressing the plan's row. | green |
| ux-p6 | S12 the to-do chip stays | Stale (T-01) | Templates › Quotes' chip reads "1 approval" (was "1 awaiting approval"). The probe matches `/^\d+ approvals?$/`. | green (57/57) |
| ux-p7 | V8 threw (`notices h3`) | Stale (B1 1-20) | The bell now draws its notices first with no head, and what is due folds into one line at the end ("Due · n · k late"). The probe asserts that order. It asserts the fold's count equals the due rows, and that its late count equals the late rows. It opens the fold before reading the due rows' meta and before counting the rows that remain after Mark all as read. | green |
| ux-p7 | V9 New task lands on Tasks with a new task begun | **Defect** | ⌘K's Create › New task presses the Tasks page's New task ▾ and then the row named by `pick`. `pick` still said "Create New Task", but B2 renamed that row "Blank task" (2-13). So ⌘K opened the menu and began no task. Fix: `pick: 'Blank task'` in `lib/global-search/model.ts`. The probe is unchanged. | **needs rebuild** |
| ux-p7 | S3 "paynow" … opens it | Stale (B5 5-36) | Profile is four tabs now: `#entities` opens its tab first, so the address is `/company/profile?tab=entities#entities`. The probe expects that exact address, and the card is still in view. | green (88/89; the 1 left is V9) |
| pm2-s46a | pure · "approvals" → the Dashboard first (L-2) | **Defect** | B5 retitled the Settings › Projects card "Approvals" (5-33), and its ⌘K row followed. So an exact title match outranked the Dashboard, where approvals gather (S46A's L-2). This matters more now that the Tasks page's pointer is gone (1-03). Fix in `lib/global-search/model.ts`: a page row gets an optional `answers` list. A query that is exactly one of those words ranks the row one above a row titled with the query. The Dashboard answers `approvals`. The Settings card is still found, second. | green (the pure probe runs the source: 185/185). The app's ⌘K order needs a rebuild. |
| pm2-s46a | the pure probe ran: 184 checks … none failing | Cascade (of the row above) | — | green |
| pm2-s46a | …the drop box … 5 AI credits | Stale (B4's words) | The box and the row's chip both say "Spreadsheet or PDF · 5 credits". The same rule is restated on those words. | green |
| pm2-s46a | three ways in | Stale (T-13) | "From scratch · From a template · Upload a quote" | green (118/118) |
| pm2-s46b | the Leads and Projects listings' Insights door, after New Meeting | Stale (B2 1-30 · 2-47) | The door is now the toolbar ⋮'s first row "Reports" (`open-insights`). The probe opens the ⋮, reads "Reports" and presses it, and the rest runs as before: Reports › Meetings, `from`, Back. The loader's header now draws New meeting alone (1). Germaine's ⋮ is opened and read: it has Meeting settings and no Reports. | green |
| pm2-s46b | threw: locator.click | Cascade | — | green (80/80) |
| pm2-s46c | the phone's dock: the same count, words and landing | Stale (B1 1-04). B1's own restatement was off: the dock link carries an `aria-label` only while it has a count, so the attribute read null. | Restated to read the dock link's accessible name, "Leads" exactly, with href `/leads` and no mark drawn (`__dockBadge` / `__dockDot` / `__dockQuiet`). | green (99/99) |
| pm2-s01 | the probe broke at `member-your-profile` | Stale (B5 5-01) | The pencil, Public profile and the refused "Edit details" now sit in the row's ⋮ (`member-more`), and each keeps its handle on its menu row. Added the local helpers `memberMenu` / `memberItem` and restated sections 6, 7, 8 and 10 on them. The Admin's refused pencil is now read as the greyed row with its reason as the row's help line. "A Designer: no pencil on anyone else's row" now opens every other row's ⋮. | 80/81. The 1 left is a newly revealed **Defect** (R1, below). |
| pm2-s30 | the probe stopped (Deactivate) | Stale (B5 5-01) | Germaine's row ⋮ › Deactivate | green (109/109) |
| pm2-s31 | switching wrote nothing to the demo (members) | **Pre-existing** | I added a diagnostic naming the moved columns. The only one is **`dane.dashboard_seen_at`**. The switch lands on `/`, which is the Dashboard, and the Dashboard stamps the member's own visit (`markDashboardVisit`). That stamp came with the Dashboard redesign, before the calm build: `app/dashboard/frame-actions.ts` and `lib/dashboard/since.ts` are byte-identical to `17135077`. B5's run on the WIP base failed identically. The calm build changed nothing in `lib/studios` but the block's fallback line, and nothing in `app/view-as-actions.ts` or `lib/db/session.ts`. The view-as popover lost only the Open to new leads row and gained the Demo fold. **The switch itself writes nothing; the write is the visit after it.** Left. Suggested restatement for the orchestrator or Vicky: exclude the member's own Dashboard visit stamp (`dashboard_seen_at` / `dashboard_since_at`) from the hash. | left (pre-existing) |
| pm2-s31 | signed out of the new studio: the demo's line names its Owner | Stale (B1 1-46) | The two demo lines are now one box: "Demo: any 6 digits work — try 9111 2233". The hint is still the open studio's own Owner's contact (Lim Wei Ming's mobile, never Dane's), so the probe asserts the hint and the box's exact words. | green |
| pm2-s31 | the phone's You sheet carries the Studios group | Stale. B1's `openDemo` looked for `[role=dialog][aria-label=You]`, but the house Sheet here is `role="menu"`. | Added `[role="menu"][aria-label="You"]` to the helper. | green (104/105; the 1 left is the pre-existing row) |
| pm2-s35 | the hub's eight modules in 2.0's names | Stale (6-29 · W-028) | "Finance" (was Finance & Margins), the app's own name | green |
| pm2-s35 | Platform ▾: three pillars, eight modules | Stale (6-29 · W-026) | The pillars are exactly Clients & Projects · Finance · Design (was Design Meetings), with eight module links. | green (137/137) |
| rwd-w6 | 844 × 390 · Create New Lead rises as the phone's bottom sheet | Stale (B2 2-13 · 2-33) | Pressed through New lead ▾ › Type in a lead | green (56–390) |
| rwd-w6 | 390 · W4-18 a name link on /company/finance/money-out | Stale (B5 5-10 · T-15): on a phone Costs is cards | Restated on the card's name (`finance-cards-module__name`), the same record and the same press. This revealed a **Defect**: the card name's press isn't its own 21 px below (`down: false`) because the sub line under it (a PO's title) takes the touch. The name isn't positioned, unlike `money.module.css`'s W4-18 fix. **Request to E** below. | left until E's fix and the rebuild |
| rwd-w6 | the review banner rests off the home indicator | Stale (B2 2-16: the docked bar is gone) | The queue's way in is now the scope pill's "Needs your attention › To review · n" row (`leads-review-open`), in the bottom sheet a sideways phone takes. The same rule is read there. | green (b 120) |
| rwd-w6 | 768 · a Money Needs-you row's words hold their 260 basis (W3-18) | Stale (B3 3-05 · 3-07: the house Row) | The words are now read on the Row's two-line block (`project-overview-module__two`) | green [358, 321, 387] (67/68) |

**Counts:** Stale 19 · Cascade 2 · Defect 2 (plus 2 that the restatements revealed) · Pre-existing 1.

## 2 · The coordinator's requests (from E and D), done

| id | what | result |
|---|---|---|
| R1 (E) | `components/profile/your-profile-ghost.tsx`: the consent row reads `{CONSENT_LABEL}` / `{CONSENT_HELP}` from `@/lib/quotes/signature`, as the page does. The ghost still drew the old two-line sentence, and its signature card stood 32 px taller at 390. | needs rebuild. This fixes pm2-s01's "390: the ghost's cards sit where the page's do", which my run showed (ghost 951 / 1105 / 1567 · page 919 / 1073 / 1535), and pm2-s17's three `/profile` checks. |
| R3 (E) | `components/marketplace/add-product-dialog.tsx`: "Trade" / "No trade", as the Price book's dialogs say (§2, 4-01). Display only: `NO_CATEGORY` is a sentinel compared in this file alone and sent as `category: null`. Nothing stores or compares "No category". | needs rebuild (pm2-s43e) |
| E's note on 1-29 | Your profile's "Your name and photo show wherever you appear in the studio — … and in the messages clients read" (`detailsHelp`) had gone entirely. It says that **clients see your name and photo**, which nothing else on the page says (the Public profile row is a door, not that sentence, and Accounting has no such row). **Chosen:** it went back behind the house `InfoTip` beside Your details' role chip, in each role's own words (label "Where your name and photo show", `profile-details-help`). The ghost draws its 36 slot (`Slot kind="icon"`). | needs rebuild. Check pm2-s17 and pm2-s01's `/profile` ghost rows. ▲ |
| D 1 (S42 B-20) | `lib/writing/propose.ts` `doneWords(a, label, blank, title = false)`; `components/writing/writing-help.tsx` passes `titled = !(part && part.key !== 'whole') && (kind === 'terms' \|\| kind === 'notes')`. A titled block is now named as a title: "Added to Additional notes" (W-200's sentence-case titles had turned it into "Added to the additional notes"). Pure check: Description → "Added to the description", "Terms & Conditions" unchanged. | needs rebuild (pm2-s42b B-20) |
| D 2 | `lib/ghost-shapes.server.ts`: the seed `'lib.price-book-items.todo'` (a proposed, live item this viewer sees, by `itemVisible`) for a browser's first Price book loader. `price-book-ghost.tsx` reads it. | needs rebuild |

## 3 · Defects (for Vicky)

1. **⌘K's Create › New task began no task.** It opened the Tasks page's New task ▾ and stopped: the row it presses had been renamed "Blank task" (B2's 2-13) while ⌘K still looked for "Create New Task". Fixed in `lib/global-search/model.ts`.
2. **⌘K's "approvals" no longer led to the Dashboard.** Settings' card was retitled "Approvals" (5-33), and that exact title outranked the Dashboard, the one home of approvals (1-03, S46A's L-2). Fixed with a small `answers` rule in `lib/global-search/model.ts`: the Dashboard first, the Settings card second.
3. **Your profile's ghost drew the old consent sentence** (R1), so at 390 the page's cards jumped up 32 px as it landed. Fixed in the ghost.
4. **Finance's Costs cards on a phone:** a card name's 44 px press is taken over below by its sub line (a PO's title), so a finger just under the name misses it. This is the W4-18 rule the desk's name links keep. It is in B5's file: request to E below.
5. (E's) The Marketplace's add-to-Price-book dialog still said "Category" (R3). (D's) The "Add what's missing" snackbar lost its section's title (B-20). Both are fixed above.

## 4 · Requests for other areas

- **E (B5's files):** in `components/finance/finance-cards.module.css`, add `position: relative;` to `.name`. A positioned element paints above the in-flow sub line that its `margin: -10px 0` press reaches over, which is exactly what `money.module.css`'s W4-18 `.nameLink { position: relative }` does. Nothing moves: the box keeps its padding and margin. rwd-w6 "390 · W4-18 money-out" asserts it after a rebuild.
- **C (B3's files), optional, same as R3:** `components/projects/choices/save-option-dialog.tsx:17` + `:101` still read "No category" / `label="Category"` for the same Price book field. §2 says **Trade** / "No trade". It is display only there too: the sentinel is sent as `category: null`.

## 5 · ▲ For Vicky

1. **The rail's Tools no longer counts the quotes waiting for your approval** (the UX audit's Q4 count). B1 removed it on purpose (1-03 one home for approvals · 1-04 no mark on Tools). B1's ▲ list names the Leads and Tasks doors but not this one. The count is still reachable in two places: the Tools panel's Quotes tile, now grey ("1 waiting for your approval"), and the Dashboard's Needs your attention row "OM-… is waiting for your approval", with Approve. ux-p4 now asserts both.
2. **Your profile › Your details has an info tip** (ⓘ) beside the role chip, holding the sentence the calm build had dropped: "Your name and photo show wherever you appear in the studio — … and in the messages clients read." It is the only place the page says clients see your photo. Under T-05 it goes behind a tip, not away. If you'd rather drop it, remove one `InfoTip` and the ghost's `Slot kind="icon"`.
3. **⌘K gained a tiny ranking rule (`answers`)** so that "approvals" opens the Dashboard first even though a Settings card is titled "Approvals". Today only the Dashboard uses it, with that one word.
4. **pm2-s31 "switching wrote nothing"** stays red, and the calm build didn't cause it. Landing on the Dashboard after a switch stamps Dane's own `dashboard_seen_at`, which is the Dashboard redesign's visit mark. Decide whether that visit counts as "the demo written" (if not, the probe should leave that column out).

## 6 · Staged register rows

| REG-F.1 | ⌘K › Create › New task begins a task again: it presses the Tasks page's New task ▾ › "Blank task" (was looking for "Create New Task") | B2's 2-13 renamed the row and ⌘K's `pick` kept the old name, so the menu opened and nothing began | bug fix |
| REG-F.2 | ⌘K "approvals" opens the Dashboard first, above Settings › Projects' "Approvals" card (a page's `answers` word ranks it one above a row titled with it) | S46A's L-2 and 1-03 (one home for approvals). B5's 5-33 title outranked it | bug fix |
| REG-F.3 | Your profile's ghost draws the signature consent row in the page's words (`CONSENT_LABEL` · `CONSENT_HELP`) | 1-29 shortened the page's helper, not the ghost's. At 390 the cards jumped 32 px as the page landed (pm2-s01 · pm2-s17) | bug fix |
| REG-F.4 | Marketplace › Add to Price book: "Trade" / "No trade" (was Category / No category) | §2 Trade (4-01), as the Price book's own dialogs. Display only | bug fix |
| REG-F.5 | Your profile › Your details: where your name and photo show (clients included), behind the house info tip beside the role chip, in each role's words. The ghost draws its slot | T-05: an explanation goes off the page, never away. 1-29 had dropped it entirely | bug fix |
| REG-F.6 | "Add what's missing" names a titled block by its title: "Added to Additional notes" | S42 B-20. W-200's sentence-case titles had made it "Added to the additional notes" | bug fix |
| REG-F.7 | Price book › My Items' first loader draws the to-do chip as the page's reveal does (the seed `lib.price-book-items.todo`) | the ghost and the page drew different things on a browser's first visit (D) | bug fix |

## 7 · Checks

- `npx tsc --noEmit -p .`: clean.
- `npx eslint` on every source file I touched (`lib/global-search/model.ts`, `lib/writing/propose.ts`, `components/writing/writing-help.tsx`, `lib/ghost-shapes.server.ts`, `components/profile/your-profile-view.tsx`, `components/profile/your-profile-ghost.tsx`, `components/marketplace/add-product-dialog.tsx`): clean.
- `npm run design:lint`: nothing new breaks a house rule (the baseline was not touched).
- `node --check` passes on all 11 probes I edited.
- The guard (`guard-before.json` → `fix-F/guard.json`): pages · server actions · handles · keys, **none gone** on all four lines (143 new handles).
- The pure ⌘K probe (`pm2-s46a-pure.mts`): 185 / 185.
