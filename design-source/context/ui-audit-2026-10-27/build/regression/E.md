# Triage E — B5's area (company, settings, finance, reports, credits, po)

Run dir `/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/fix-E`
(port 3490, fresh `base.db` per probe, the 01:28 build). Probes: st-r1 · st-r3 · dane-p2b · sw-r4 · pm2-s43e · pm2-s17 · pm2-s44o · pj-gap-f2.

## Results on the current build (no rebuild)

| Probe | Before | Now | Note |
|---|---|---|---|
| st-r1 | 57 / 1 | **58 / 0** | |
| st-r3 | 29 / 1 | **30 / 0** | |
| dane-p2b | 53 / 3 | **56 / 0** | |
| sw-r4 | 26 / 4 | **35 / 0** | (the members step now runs to its end: +5 checks) |
| pj-gap-f2 | 82 / 2 | **84 / 0** | |
| pm2-s44o | 55 / 1 | **56 / 0** | run with `OPENMAISON_DEV_PREVIEWS=1 BENCH=on` |
| pm2-s43e | 2 / 2 (stopped at step 1) | **47 / 1** | the one left is a Defect in F's file (request R3) |
| pm2-s17 | 123 / 7 | not re-run (no probe edit) | 3 fixed in my source → needs rebuild (simulated green); 4 are other areas' (requests R1, R2) |

## Every failing check

| Probe | Check | Class | What I did | Result |
|---|---|---|---|---|
| st-r1 | seven modules in the order the work runs | Stale | 1-41 (B1's request, landed by Y): the last module reads "Studio notifications"; restated to the new name, the order rule unchanged | green |
| st-r3 | and counts the required still open | Stale | T-07 "Label · n" (B2's `summary-card.tsx`): `Required still open · 1`; regex restated | green |
| dane-p2b | g-tabs the strip reads in the new order | Stale | as st-r1 | green |
| dane-p2b | g-dragorder the arrows stay for keyboard and touch | Stale | 5-30 (B1's DefinitionTable on B5's request): Move up · Move down are rows of the row's ⋮, each with the question's name. The probe opens row 0's ⋮ and asserts "Move … down" enabled and "Move … up" disabled (the old arrows' states). The keyboard / touch path to reorder is kept: not a Defect | green |
| dane-p2b | k-instagram the Social links help shows a handle | Stale | W-207: "As you want them printed, e.g. @demostudio.sg." — still the studio's handle | green |
| sw-r4 | members (Deactivate) | Stale | 5-01: Deactivate is the member row's ⋮ (`member-more`) → its menu row; the confirm, team, backup seat and Undo checks after it all pass | green |
| sw-r4 | a retired entity says so on Company › Profile | Stale | 5-36: the entities are Profile's `?tab=entities` | green |
| sw-r4 | an Owner copies the webhook URL | Stale | 5-15: "Copy link". The Designer's check beside it (never sent the token, no copy press) now refuses both names, so it still proves something | green |
| sw-r4 | Mark all as read says what stays | Stale | the bell (A's) folds its due rows under "Due · n · Show" when notices sit above; the probe counted 0 visible due rows and so expected "All caught up". Restated: open the fold first. The snackbar was right ("All read — 10 follow-ups are due and stay until done"); no source change needed, no request | green |
| pm2-s43e | Hui Min sees the Owner's Deactivate refused | Stale | 5-01: open Dane's ⋮; the "Deactivate" row is `aria-disabled` | green |
| pm2-s43e | the probe stopped (scrollIntoView) | Cascade | of the above | green |
| pm2-s43e | (was hidden) 390 tap says the reason | Stale | the refused row prints its rule as its own second line (REG-728), so a finger reads it with no snackbar; restated: the reason is in the row, and a tap on it deactivates nothing (no dialog, `is_active` still 1) | green |
| pm2-s43e | (was hidden) 1440 hover says the same | Stale | the ⋮'s greyed row says the rule | green |
| pm2-s43e | (was hidden) step 10 Add to Price book press | Stale | 6-11: the row's verb is "+ Add" (named "Add {product} to the Price book"); pressed by its kept handle `product-add` | green |
| pm2-s43e | (was hidden) Rattan Row: no guess — the studio picks | **Defect** | the probe (restated by a lane to "Trade" / "No trade") is right by §2, but the Marketplace's Add to Price book dialog still says **Category** / **No category** while the Price book's own item and bulk dialogs say Trade / No trade (4-01). The file is F's (B6) → request R3 | left — needs R3 + rebuild |
| pm2-s43e | (was hidden) step 12 · Nurul's "Your name and photo show …" | Stale | 1-29 (REG-B1.16, X confirmed "detailsHelp not rendered"): the Your details card's two-line help went. The rule (each role's own words on Your profile, never Accounting's) restated on the words the page still says per role: the Email helper ("You can sign in with it, and the studio's emails go there") and no "Shown on the papers you send" / "invoices, orders and payments" | green |
| pm2-s43e | (was hidden) step 12 · the ghost says the same words | Stale | same rule on the ghost's Email helper | green |
| pm2-s43e | (was hidden) step 12 · Accounting keeps its own words | Stale | Priya's page says "Shown on the papers you send", not Marketing's | green |
| pm2-s43e | (was hidden) step 13 · dane: Leads · Projects is offered | Stale | 1-26 (B2's `tasks-toolbar.tsx`): whose tasks rides in the scope pill's menu (`task-source`), no longer a radio segment; the probe opens "All tasks · n" and counts the Projects row (Nurul: none, Dane: one) | green |
| pm2-s44o | Nurul Huda in Marketing — "Looks after the leads" | Stale | 5-03: the row's role line went ("the Role says it"); what the role may do is one press away ("What can each role do?" → Settings › Roles & access, whose Marketing column the next check reads). Restated: her Role reads Marketing and the door is there | green |
| pj-gap-f2 | Owed to you: the aging buckets | Stale | §2: the report is "To collect" | green |
| pj-gap-f2 | the house Export downloads the report | Stale | the file takes the report's name: `to-collect.csv` | green |
| pm2-s17 | 390 co-questionnaire: rows Δy 8 / 16 / 24 | **Defect** | the house DefinitionTable changed (5-30, landed by X after B5's lane measured green): the type is a body-s line (16, was a 20 chip) and the tools are one 36 ⋮ (were four 24 icons, a line of their own on a phone). The ghost kept the old row. Fixed `QuestionnaireGhost` in `components/company/company-ghosts.tsx` (the type a 16 Line, one 36 icon Slot); the house piece unchanged | needs rebuild (simulated on this build: 0 off) |
| pm2-s17 | 1440 co-questionnaire: rows Δy -8 / -12 | **Defect** | same cause (a row 4 shorter at a desk); same fix | needs rebuild (simulated: 0 off) |
| pm2-s17 | 390 co-integrations: cards Δy 32 | **Defect** | the page's Demo chip is the house `DemoNote` (MetaChip with its 12 info glyph, 58 wide — B1's request landed after B5's lane); the ghost drew a plain GhostChip "Demo" (46), so "Website form by email · Connected · Demo" wrapped to two lines on the page and stayed one in the ghost. Added `GhostDemo` (a 58 chip Slot) in `company-ghosts.tsx`, used by Integrations' heads and the Listed on Qanvast card | needs rebuild (simulated: 0 off) |
| pm2-s17 | 390 co-pricebook: Δy 48 | **Defect, D's files** | not `company-ghosts.tsx` (its `PriceBookGhost` is unused); the live ghost is D's `PriceBookItemsGhost` → `LibraryGalleryGhost` → request R2 | left — needs R2 + rebuild |
| pm2-s17 | 390 profile: cards Δy -32 | **Defect, F's file** | `/profile` is Your profile (`components/profile/your-profile-ghost.tsx`), not Company › Profile (co-profile passes). Its ghost keeps the old consent help (3 lines at 390), the page says `CONSENT_HELP` (1 line): 48 → 16 → request R1 | left — needs R1 + rebuild (simulated: 0 off) |
| pm2-s17 | 390 profile: every ghost sentence is the page's | **Defect, F's file** | same line → R1 | left — needs R1 + rebuild |
| pm2-s17 | 1440 profile: every ghost sentence is the page's | **Defect, F's file** | same line → R1 | left — needs R1 + rebuild |

Found on the way (no failing check): **Reports › Finance's ghost** for a role kept from profit (`components/finance/books/books-ghost.tsx`)
still titled its report "Owed to you". It now reads the report's own label (`REPORTS` › `ar` → "To collect", §2). **Defect, fixed, needs rebuild.**

## Requests received (from triage B, through the coordinator) — applied

Both are for pm2-s27, which measures them at 390 after a rebuild. Both are B5's reworded lines, which the ghosts never followed (Defects, fixed, **needs rebuild**).

| Id | File | Change | Measured on the current build (the page itself) |
|---|---|---|---|
| E-1 | `components/portfolio/designer-card-ghost.tsx` | the "Known for …" line: `<span className={styles.known}><Bone w={200} h={10} /></span>` → `` <GhostLines className={`${styles.known} ${styles.ghostLines}`} lh={16} h={10} lines={['70%', ['45%', 'phone']]} /> `` (`styles.ghostLines` exists, line 51; it comes after `.known` in the file, so its flex column wins over `.known`'s block) | Sarah's and Michelle's cards: the line is 32 (two 16 lines) at 390 and 16 at 1440. The ghost now draws 2 lines on a phone and 1 at a desk |
| E-2 | `components/portfolio/public-profile-ghost.tsx` | the `styles.line` GhostLines: `lines={[640, [280, 'phone'], [200, 'phone']]}` → `lines={[640, [280, 'phone']]}` | the line is 40 (two 20 lines) at 390 and 20 at 1440 for Sarah, Michelle and James. The ghost drew 60 at 390 and now draws 40 |

Re-checked with pm2-s17: none of its routes draws these ghosts. Its `profile` route is `/profile` (Your profile, `your-profile-ghost.tsx`),
and the public profile is `/company/members/[id]/profile` (loading → `PublicProfileGhost`), which pm2-s17 does not measure. Its rows don't move.
Checks after E-1 / E-2: tsc clean, eslint clean on both files, design:lint nothing new, guard "none gone" ×4.

## Requests for other areas (exact changes)

**R1 → F** · `components/profile/your-profile-ghost.tsx` line 62, the consent row's two sentences:
```diff
- <Words className={styles.consentLabel}>Put it on the quotes and contracts I prepare</Words><Words className={profile.cardHelp}>Off, the studio signature box stays blank and you sign by hand. You can change this any time.</Words>
+ <Words className={styles.consentLabel}>{CONSENT_LABEL}</Words><Words className={profile.cardHelp}>{CONSENT_HELP}</Words>
```
plus `import { CONSENT_HELP, CONSENT_LABEL } from '@/lib/quotes/signature'` (the page's own constants, imported the same way by
`your-profile-view.tsx`; 1-29 changed `CONSENT_HELP` to "Off: you sign printed quotes by hand."). This fixes pm2-s17's three profile checks.
I simulated it on this build by swapping the ghost's sentence: 390 goes from 4 blocks off to 0, and 1440 stays at 0.

**R2 → D** · Price book › Items' ghost at 390 (`components/company/templates/library-gallery.skeleton.tsx` and its `.gPill` in
`library-gallery.module.css`, and `components/company/price-book/price-book-ghost.tsx`). Since B4's 4-24 · W-383, a phone keeps the
pill's noun ("Type: All", 117 wide; the short "All" label is gone). Price book's to-do pill ("1 approval", 62, the demo's one proposed item)
sits before it. Together they take 187, so the tools (168) wrap to a second row: the page's bar stands 84 (36 + 12 + 36). The ghost draws one
72 pill on a 36 row, so the folders and cards land 48 lower. To fix the ghost: (a) at ≤1024, draw the pill box at the long label's width
(the label as `Words` in the pill's own class, or its measured width); and (b) draw the attention pills the page has, for example from a seed
flag `lib.<tableKey>.attention` set when a `filters[].attention` count is above 0, so the tools wrap where the page's do. Check Templates and
Materials at 390 too: their pills are long now as well, and they pass today only because their bar still fits on one row.

**R3 → F** (B6's Marketplace) · `components/marketplace/add-product-dialog.tsx`: the Price book item's grouping is **Trade** on screen (§2;
the Price book's item and bulk dialogs already say "Trade" / "No trade", 4-01). Line 18 should be `const NO_CATEGORY = 'No trade'` and
line 105 `<TextField label="Trade" …>`. The stored field and the save (`category === NO_CATEGORY ? null : category`) are unchanged. After
a rebuild, pm2-s43e's "Rattan Row: no guess" goes green; the probe already expects "No trade".

No requests came to me. D's pb-r2 ("the Company panel says one is proposed") is a deliberate change in my `company-popover.tsx`: §2
Approvals, so the panel now says "1 approval" (the count is kept, `approvals(n)`, and Finance's badge keeps `company-finance-badge`).

## Defects (for Vicky)

1. **Company › Questionnaire's ghost drifted from its page** (390 and 1440): the house definitions list lost its type chip and its four row
   icons (5-30), and the ghost kept them. Fixed in `company-ghosts.tsx`.
2. **Company › Integrations' ghost drew the Demo chip 12 px too narrow** (the house DemoNote has an info glyph). At 390 the Website form
   card's title wrapped on the page but not in the ghost, so everything below it landed 32 px lower. Fixed in `company-ghosts.tsx` (also the
   Listed on Qanvast card's Demo chip).
3. **Reports › Finance's ghost said "Owed to you"** where the page says "To collect". Fixed in `books-ghost.tsx`.
4. **Your profile's ghost kept the old signature consent sentence** (F's file, R1).
5. **Price book › Items' ghost at 390 draws neither the long scope pill nor the "1 approval" pill** (D's files, R2).
6. **The Marketplace's Add to Price book dialog still says "Category" / "No category"** while the Price book says "Trade" (F's file, R3).
7. **The designer card's ghost drew "Known for …" as one line**, but at 390 the reworded line wraps to two (triage B's E-1, fixed in
   `designer-card-ghost.tsx`).
8. **The public profile's ghost drew its line as three lines at 390**, but the page's is now two (triage B's E-2, fixed in
   `public-profile-ghost.tsx`).

Worth knowing, not a Defect: on Your profile, the Your details card's sentence ("Your name and photo show wherever you appear in the
studio — on the leads you hold …", per role) is gone entirely, not moved behind a tooltip (1-29, REG-B1.16; `detailsHelp` in
`lib/company/member-words.ts` is now unused). The role's own words remain on the Email field's helper.

## Staged register rows

| REG-E.1 | Company › Questionnaire | **The loading ghost draws the questions as the page now does:** the type as a line of words and one ⋮ a row, so the rows land where the page's do at 390 and 1440 | the house list's row changed (5-30), and the ghost had kept the old one (REG-708) | bug fix |
| REG-E.2 | Company › Integrations · Profile › Listed on Qanvast | **The ghost's Demo chip is the house Demo chip's width** (58, with its info glyph), so a phone's card title wraps in the ghost where the page's does | Integrations' cards stood 32 px off at 390 (REG-708) | bug fix |
| REG-E.3 | Company › Reports › Finance | **The ghost names the report "To collect", as the page does** (for a role kept from profit) | the ghost had kept "Owed to you" (§2, REG-708) | bug fix |
| REG-E.4 | Public profile · Hangout pages | **The designer card's ghost draws "Known for …" on two lines on a phone**, as the reworded line wraps there (one at a desk) | the ghost drew one 10 px bar, so the card's rows stood off at 390 (REG-708; triage B's E-1) | bug fix |
| REG-E.5 | Company › Members › Public profile | **The ghost draws the profile's line as two lines on a phone, not three**, as the reworded line now wraps | it stood 20 px taller than the page at 390 (REG-708; triage B's E-2) | bug fix |

## Checks

- `npx tsc --noEmit -p .`: clean.
- `npx eslint components/company/company-ghosts.tsx components/finance/books/books-ghost.tsx`: clean.
- `npm run design:lint`: nothing new.
- `node --check`: passes on all 7 edited probes (st-r1, st-r3, dane-p2b P2b, sw-r4, pm2-s43e, pm2-s44o, pj-gap-f2).
- The guard: all four lines say "none gone" (173 pages · 1,064 server actions · 3,905 handles · 120 keys).
- Simulation (my investigation scripts, `sim-ghost.cjs` and `inv-ghost.cjs` in the run dir): on this build I reshaped the ghost's DOM as the
  fixed source draws it, then measured it with pm2-s17's own rule. Questionnaire at 390 / 1440 and Integrations at 390 go to 0 blocks off,
  and so does Your profile at 390 with R1.
