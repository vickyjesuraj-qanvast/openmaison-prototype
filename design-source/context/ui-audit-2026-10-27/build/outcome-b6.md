# B6 · the tools and the website — outcome (the calm UI build, 2026-10-27)

Worktree `.claude/worktrees/agent-a29297a8ca383cf95`, from its WIP base `ba5918ea`. Built in four parts that ran side by side in the one worktree, each
on its own files: Marketplace + Market Insights, the AI Visualizer, Quote X-Ray (three forks of this lane), and Compliance · the 3D Space Planner ·
Floorplan to 3D Isometric · the website's trial (the lane itself). The checks below (tsc, eslint, design:lint, the guard, the production build,
the probes, the measures and the width gate) were run on all of it together, last on the final build. 86 files changed, all under B6's prefixes
(checked against `ownership.json`), plus one new file (`components/marketplace/source-info.tsx`) and 24 restated probe files under `design-source/verify`.

## 1 · Built

| Finding | What was done |
|---|---|
| **6-01** Marketplace home | Brands \| Deals are the house `Tabs` (no counts), sticky under the header, `?view=` kept (a plain press switches in place, a modified click opens a tab). The nine category chips are ONE `ScopePill` "Category: All ▾" (`PortalMenu` of `menuitemradio` rows, no counts; the applied dot off All; the short form ≤1024). One control row: Category · search · Sort. The card: ONE badge on the photo — "n deals" (one deal opens it, several open the brand page); one meta line — its categories, or "✓ In your vendors"; no Featured (the brand page keeps it; featured still sorts first), no review count (the brand page says it), no drawn monogram (a real feed logo still draws); the ⋮ keeps Open · WhatsApp · Add to my vendors. Banner 120 tall (112 on a phone), pagers and "1 / 3" kept. The foot line → an info glyph beside the title (its tooltip; a press says it in the snackbar). |
| **6-02** Compliance cards | "2 of 5 done · Recorded in Company › Profile" replaces the intro (the legal name and UEN still show inside each card's steps). Each card: sentence-case title + its line, the whole head a button that opens the steps (chevron at its end, turned while open; no "Show the steps"), the status chip + who · when, the about's first sentence (the rest opens with the steps), the note when there is one (its own Edit stays), and ONE verb — the official portal, outlined ("Open HDB portal" …). A ⋮ (`PortalMenu`, Owners and Admins) holds **Record as done** (help "In Company › Profile"; "Open the record" once done) and **Add a note**. No agency tag. |
| **6-03** X-Ray summary | No eyebrow (the crumb names the lead; "OM-10008" is the link in the Yours tile's help, its tooltip the job's name). One-line headline built from the reading's numbers at display time — old readings read the new way, nothing stored changed ("Flo Design looks S$ 31,407 cheaper. Like-for-like, yours is S$ 20,963 more."; cheaper · more · same handled). Tiles Yours · {studio} · Like-for-like difference in whole dollars (`moneyCard`), no K, no cents, no legal name; the footnote behind a "How we counted" info button on the difference tile (its words in place on a press, every width). |
| **6-04** Visualizer editor | Generate is the one filled button; Share with client outlined at every width. One instruction at rest: the hint bar until Got it. "Missed one?…" moved into the + and pencil tooltips. The line under Generate shows only while Generate is refused (it already did). "Makes 1 version · Fast · price · n left after · Change" moved behind a tune button beside Generate (its tooltip, and the head of the switches once open; the can't-afford warning stays in view). "click" on a desk, "tap" on touch. |
| **6-05** X-Ray item table | No left status bar, no legend; the Status chip names the side; a no-price line says "No price" once, in their cell; an empty Difference is blank (the phone card drops the line); a missing side reads "—"; names wrap to two lines; the header's "24 ITEMS COMPARED" chip gone (the card head says it). The chip keeps the DS Tag's capitals — it is a status (T-06). |
| **6-07** Versions | "Version(s)" everywhere in the app for a picture Generate makes (cards, list column, delete lines, Deleted sheet, Maison AI, share, Present, the strip, pins, the trial's editor and its allowance line). Kept: the verb "render", the Files folder's stored name "Renders", download file names, the website's marketing copy. |
| **6-09** X-Ray soft delete | **Not done** — needs `quote_comparisons.deleted_at`, a soft `deleteComparison` + restore / forever actions, a read filter and an Activity rule: schema and behaviour, outside the contract. Today's ConfirmDialog delete stays (now from the row's ⋮). See ▲. |
| **6-10** how-it-works boxes | Visualizer: one line "Turn a room photo into a finished design." + "How it works" (the three steps in the house Drawer); the first run keeps its welcome. X-Ray: one line "Compare a quote with another studio’s, item by item." + "How it works" (a Drawer with the three points); the box only while the studio has no comparison yet; "Always check the numbers…" beside Compare. Floorplan to 3D: **kept** — the coordinator scoped it to today's leftovers, and today's 1.0 audit (REG-3070…3074) settled that landing as 1.0's. |
| **6-11** brand page | On a phone the header's button reads "WhatsApp" / "Email" ("WhatsApp Oak & Linen" ran off a 390 screen; the brand stays in its accessible name). No "· n" on Deals / Products / Questions; "Not in your vendors yet" gone (the header's Add to my vendors says it); demo links keep their labels and say once "Links open on the live app"; the brand's own deal cards drop the brand line; product rows' verb a text button "+ Add" (aria-label "Add {product} to the Price book", testid kept); deal titles wrap at every width. |
| **6-12** Market Insights | "Sample" once a page (the list's note and the article's note stay; no "· Sample" eyebrows); categories a "Category: All ▾" scope pill without counts, sentence-case labels ("Case studies", "Industry news" — keys and `?category=` unchanged); tags drawn one way (the article's); the foot line → an info glyph beside the title (kept — the byline shows only on the featured card and the article, ▲). |
| **6-13** Rules by home | No "Rules for an HDB flat" head (the picked chip names the home; the search moved onto the chip row); count "38 rules — 34 you must follow. Each project ticks its own."; no one-column "Rule" head; sentence-case group names in the shared checklist data (the project's Compliance tab follows). The red MANDATORY chip and the "Details" word live in B3's shared row `components/projects/compliance/item-row.tsx` — **B3 landed them in main** (the row opens from its title and says "Required"). |
| **6-14** X-Ray fields | No capitals captions over Lead and the two drop boxes; the box reads "Their quote"; the scoped lead block is a labelled group with its property type as plain text. Mirrored on the website's trial (`components/trial/trial-xray.tsx`). |
| **6-15** Recent rows | The row opens the comparison; the trash and chevron → a ⋮ with **Open the quote** (when that quote is on the page) · **Delete** (refused in the row with the who-may-delete rule; same ConfirmDialog). |
| **6-16** Planner | Rooms card "Floor plan underneath" over the plan's name; "Line up the floor plan"; "Set its size…" (its dialog "Set its size"); **Remove floor plan** in the card's own ⋮. Top bar: Share outlined at every width (never a filled state), "Shared 17 Oct ’26" quietly beside it once shared (desk widths); the identity chip gone — whose it is ("P-2026-002 · Benjamin Han", "Studio’s own") rides the title's tooltip; a template keeps its "Template" chip (a state: it never shares). |
| **6-17** Visualizer Tools tab | "Whole room" (key, testid, address unchanged); sub "Empty or furnish the whole room, or draw a surface the photo missed"; group "What Generate does"; "Only what I picked"; no "By hand" head. |
| **6-18** Visualizer ⋮ | One name, "Before and after" (the stage bar's button and the ready snackbar's action). The version ON SCREEN's ⋮ drops Download and Share (the canvas bar's download and the top bar's Share are in view at every width); every other version's ⋮ keeps both. |
| **6-19** send verbs | X-Ray "Send on WhatsApp" (Copy message outlined); Visualizer share "Share n version(s)" then "Send on WhatsApp" / "Copy message"; Planner share "Send on WhatsApp" filled (outlined while Share changes is the job), Copy link outlined; brand page "WhatsApp {brand}" (and "Email {brand}"); the deal dialog keeps "Get deal on WhatsApp" until an ask (W-204). |
| **6-21** cut facts | Visualizer card: name · "3 rooms · 5 versions" · "Edited 12 Sep ’26 by Michelle" (rooms stay searchable; the edited line wraps on a phone's narrow card instead of cutting). Planner card: "5 rooms · 101 m²" + "Benjamin Han · edited 17 Oct ’26" (or "Studio’s own" / "Template"), wrapping on a phone (who edited it is the list's Updated by column, its pieces the list's Furniture column; the project number → a new "Project no." column; ".0" dropped on the card). A deal card's "You asked …" line wraps too. X-Ray recents "OM-10001 · 1 Oct ’26" (the job name still searchable). Deal titles wrap. |
| **6-22** Floorplan leftovers | Done: **Download** filled, **Try another take** outlined (testid `fp3d-regenerate` kept; the mismatch note says "another take"). Under a sample's view "Sample plan — ready-made views"; its wait "A sample plan’s views are ready-made — a moment." The landing's prototype line → the header's info glyph beside Beta (same words; the held line after a studio's own upload stays). Stage heads bold sentence case ("What you’ll get", "Your plan, straightened", "We found", "Style", "Your 3D floor plan", "Switch style"). We found as one sentence that adds up — `roomSummary` names a room outside 1.0's groups ("Corridor"), so 10 named + 1 = "11 rooms in total". Steps "Pick Dollhouse or Top-down". Title kept "Floorplan to 3D Isometric" (by the contract); Beta beside the title needs the house header (Request 2). |
| **6-23** talking points | "What to tell the client": each point's sentence alone, its evidence behind "Why"; ONE "Say it as a question" in the card head for every point that has one (the draft still follows); "Brands worth a word": strongest first, no Impact chips, sources behind "Sources". |
| **6-24** deal dialog | "Runs 7 Oct – 11 Dec ’26" once; the chip only in a deal's last week or once ended; after an ask the button is outlined "Ask again on WhatsApp" (and by email / on their page). |
| **6-25** Add to Price book | Button "Add" ("Propose it" stays for a Designer); "{brand} becomes its vendor and joins your vendors."; helper "Your trades, from Settings". |
| **6-27** view controls | Marketplace views = Tabs; Marketplace and Market Insights categories = scope pills; the planner's and the Visualizer's material categories = a scope pill too (the shared picker). X-Ray setup and the planner's Top · 3D · Walk stay segmented. |
| **6-30** planner New ▾ | "From a ready-made flat…" (one picker: **Flats** — the project's traces, the Singapore flats, Blank, Trace a floor-plan photo — · **Furnished examples** · **My templates**, the DS segmented control the Price book dialog uses; a tab's first entry is picked when the tab changes), "Trace a floor-plan photo…", "For a project…", divider, "Blank". The first run's buttons follow ("From a ready-made flat"). |
| **6-31** planner Finishes | The rooms in one place: in 3D or Walk beside the stage, the stage's room strip picks the room the panel paints (and flies to it) and the panel's room chips step back; in Top, and in a sheet that covers the stage, the panel keeps its chips. The material categories are "Category: All ▾" (the shared Visualizer picker). **"Your studio" head kept** — it names the studio's own materials apart from the catalogue's; a mark on each swatch would be new UI (▲). |
| **6-32** names on cards | "Studio’s own" for Personal (the Visualizer's `kind-label.ts` is the one word; the planner reads it; stored kinds and pill keys stay `personal`); cards lead with the client's name; the lead's stage and the project number leave the design / layout cards (the list views' columns keep them). |
| **6-33** Present | "Living room — V3"; one list "In V3" with a New mark on what changed from its parent. |
| **6-34** Market Insights | The featured card's hole closed (the excerpt under the title; its ghost follows — the title one line at a desk, two ≤1024, the tags at their own sizes). The article's crumb-only header is **not done** — `PageHeaderL2` can't draw it (Request 3). |
| **6-35** Visualizer words | Panel "Surfaces"; click / tap; "Kevin likes Contemporary — Modern is the closest look." (from the data); the card tag "Closest look"; Lighting "Preview on the photo — Generate keeps it". |
| touch **6-06** | In my files: the planner's photo start is "Trace a floor-plan photo" everywhere it is drawn (New ▾, the New layout card, Maison AI, the iso line, the photo dialog's title) and its picture is "3D floor plan" (the ⋮ row, the dialog, Make the 3D floor plan, the saved file's name); View ▾ "3D at an angle". The doors in other lanes' files are Request 4. |
| touch **6-08** | X-Ray header chips → a plain meta line; Impact chips gone; the Visualizer's and the Planner's identity chips → the title's tooltip; Market Insights' capital tags → the article's tags; the deal dialog's date chip → its run line; Compliance's agency tag gone; Floorplan's and the planner photo dialog's We found → a plain sentence; the Visualizer's "DESCRIBE A CHANGE" caption → its field's label in sentence case. Featured (brand page) and Beta stay — statuses. |
| touch **6-20** | Visualizer list: Rooms 120 · Versions 140 tracks (the column key stays `renders` so saved layouts survive). The titles ("All designs" / "5 layouts") and the folder row's lone checkbox are `LibraryGallery` / `folder-libraries.ts` (B5) — Request 5. |
| touch **6-28** | X-Ray phone card ⋮ in the house grey (order-proof `.actions .kebab.kebab`); Visualizer: under `(hover: none)` the ⋮ only on the version on screen. The FAB part is B1's. |
| ghosts (REG-708) | Every changed page's ghost follows it, checked element by element against the page (the s24 / s25 way) at 1440 and 390: the Marketplace (cards keep room for two lines of name and of meta on a phone, so the grid's rows are even — page and ghost), the brand page (the demo links' one line, the phone's wrapped words, and the Questions card it never drew), Market Insights, X-Ray, the Visualizer, Compliance, Floorplan to 3D. |
| **6-26** · **6-29** | Not in this lane's list (B1's). In my files: the website's trial X-Ray mirrors the app's words (6-14); the site's module names live in `lib/site/*` (B1's) — nothing to change in `components/site` · `app/site`. |

## 2 · The ledger — every moved action (what · was · now)

Nothing was removed: every control below is one press away from where it was. Handles in `code` stayed on the element doing the job.

| What | Was | Now |
|---|---|---|
| **Marketplace** — Brands / Deals switch | Chips with counts in the toolbar (`market-views`) | the house Tabs strip under the header (`market-views` on its host); `?view=` unchanged |
| Marketplace category filter | a chip rail with counts (`market-categories`) | one scope pill "Category: All ▾" + its menu (`market-categories` on the pill's anchor) |
| A brand's Featured | a filled badge on its card's photo (`brand-featured`) | the brand page's header chip (`brand-featured`); featured still sorts first |
| A brand's first deal | a ribbon with the deal's title on the card's photo | the photo's "n deals" badge (`brand-deal`): one deal opens it, several open the brand page; every deal's words in the Deals view and on the brand page |
| A brand's review count | the card's foot | the brand page's About ("128 reviews on Qanvast") |
| "Brands and deals come from Qanvast’s partners…" | a line under the list | the header's info glyph (`market-source`): tooltip, and the snackbar on a press |
| "Articles come from OpenMaison’s editors." | a line under the Insights list | the header's info glyph (`insights-source`) |
| Market Insights category filter | chips with counts (`insights-categories`) | one scope pill + menu (`insights-categories`) |
| "Not in your vendors yet" (brand page) | the About card | said by the header's Add to my vendors (`brand-not-vendor` wraps it) |
| "A demo address — …" | on every demo link row | once under Web links (`brand-links-demo`) |
| A deal's end-date chip | the dialog's head | the run line "Runs …"; the chip only in a deal's last week |
| Add to Price book (product rows) | an outlined button per row | a text "+ Add" per row (`product-add`), named "Add {product} to the Price book" |
| **AI Visualizer** — Versions & Quality ("Change") | a link under Generate | the tune button beside Generate (`viz-options-toggle` on it); its line heads the open switches (`viz-options`) |
| "Makes … · n AI credits · n left after" | a line at rest under Generate | the tune button's tooltip + the head of its switches |
| "Missed one? Draw it on the photo, or add it by name…" | the Surfaces panel's foot | the + tooltip ("Add a surface the photo missed…") and the pencil's ("Missed one? Draw it on the photo") |
| The home's three how-it-works steps | a purple card above the gallery | "How it works" (`viz-how`) → the house Drawer (`viz-how-steps`) |
| Download / Share in the ⋮ of the version on screen | its ⋮ | the canvas bar's download and the top bar's Share (`viz-share`), in view at every width; any other version's ⋮ unchanged |
| A design card's lead stage / project number | the card's meta | the list view's Kind column ("Lead · Met", "Project · P-…") |
| The editor's kind chip ("LEAD · MET", "PROJECT · P-…") | beside the design's name | the name's tooltip |
| Present's "Everything in V3" | a second list | one list "In V3", what changed marked New |
| A non-selected phone thumb's ⋮ (touch) | on every thumb | appears on the version once it is on screen (a tap on the thumb) |
| **Quote X-Ray** — Recent row Delete | a trash icon at rest ("Delete {label}") | the row's ⋮ ("More options for {label}") › Delete; refused, the rule is its help line; the same ConfirmDialog |
| Recent row "Open the quote" | — (the row was the link) | a row in that ⋮ (new door; the row still opens the comparison) |
| "Say it as a question" | a button under each point | one toggle in the card head, for every point with a question |
| A point's evidence | always shown under it | behind its "Why" (`xray-why`) |
| A brand's "Sources · …" | always shown | behind its "Sources" (`xray-sources`) |
| The summary's footnote | always shown | behind "How we counted" (`xray-counted` → `xray-counted-words`) |
| The setup's intro box | shown until dismissed | first run only; otherwise "How it works" (`xray-how`) → a Drawer (`xray-how-drawer`) with the same points |
| "Always check the numbers…" | the intro box | beside Compare once ready, and in the drawer |
| The eyebrow (studio · quote · job · vs …) | above the headline | the lead in the crumb; the quote's number + its link in the Yours tile's help; the job's name as that link's tooltip |
| Header chips (date · n items compared · sent) | three capitals chips | a plain meta line (date · Sent …); the count in Item by item's head |
| The legend and the row's status bar | on the table | dropped — the Status chip says the side, in the same colours |
| **Compliance Navigator** — Record in Company › Profile | an outlined/text button on each card (`navigator-record`) | the card's ⋮ (`navigator-menu`) › Record as done, help "In Company › Profile" (`navigator-record` on the row's label); every member also has "Recorded in Company › Profile" under the tabs |
| Add a note | a text link on each card (`navigator-note-add`) | the card's ⋮ › Add a note (`navigator-note-add`); a note's own Edit stays beside it |
| Show the steps / Hide the steps | a text link on each card (`navigator-steps-toggle`) | the card's whole head is the toggle (`navigator-steps-toggle`), its chevron at the end |
| The about's later sentences | always on the card | inside the opened steps |
| "The steps carry {name} and UEN …" | the intro | the steps themselves (they print the name and UEN) |
| The agency tag (HDB · CASETRUST …) | the card's head | gone as a tag — the title names the agency; the organisation stays in Maison AI's rows |
| Rules by home's "Rules for an HDB flat" head + search | a toolbar above the chips | the kind-of-home chip names it; the search moved onto that chip row |
| The rule list's "Rule" column head | a head row per group | dropped — a one-column list |
| **3D Space Planner** — From an example… | a New ▾ row | New ▾ › From a ready-made flat… › Furnished examples (a tab; the first run's example tiles and Maison AI's example stay) |
| From a template or a flat… / From a flat template… | a New ▾ row; My templates above the flats in the dialog | New ▾ › From a ready-made flat… — Flats · Furnished examples · My templates tabs (`planner-new-tabs`; `planner-my-templates` on its tab) |
| From a floor-plan photo… | a New ▾ row | the same row, "Trace a floor-plan photo…"; also the Flats tab's card |
| A layout card's project number | the card's meta | the list view's new "Project no." column; still searchable |
| A layout card's "n pieces" and "… by {member}" | the card's foot | the list view's Furniture and Updated by columns (the card's foot is whose · edited when) |
| Remove the floor plan underneath ("Take it away") | a text link in the Rooms card | the card's ⋮ (`planner-underlay-menu`) › Remove floor plan (`planner-underlay-remove`) |
| Whose the layout is (P-… · client / Lead / Personal) | a chip beside the title | the title's tooltip (a template keeps its chip) |
| The finishes' room chips (3D · Walk, beside the stage) | the Finishes panel | the stage's room strip, which now also picks the panel's room (`planner-room-chips`); the panel keeps them in Top and in a sheet |
| The material categories (planner + Visualizer) | ten chips | "Category: All ▾" + its menu |
| **Floorplan to 3D Isometric** — the prototype's note before an upload | a line under the drop box (`fp3d-prototype-hint`) | the header's info glyph beside Beta (`fp3d-prototype-hint`), same words |
| Regenerate (Done) | the filled button | "Try another take", outlined (`fp3d-regenerate`); Download is the filled one |
| **Website trial X-Ray** — the "THEIR QUOTE" caption | over the box | the box's own title "Their quote" |

## 3 · Words — 74 of the 79 rows applied (2 of them in part), 5 not

**Applied (72 in full):** W-020 · W-023 · W-027 · W-029 · W-056 · W-058 · W-061 · W-066 · W-080 · W-081 · W-086 · W-090 · W-094 (the one-line
option: "Links open on the live app") · W-105 · W-110 · W-111 (the scope pill) · W-114 (moved to the info glyph, not removed — the byline shows
only on the featured card and the article) · W-125 · W-126 · W-130 · W-133 · W-137 (kept, as proposed) · W-139 · W-148 · W-149 · W-160 · W-186 ·
W-195 · W-204 · W-214 · W-220 · W-224 · W-225 · W-229 · W-235 · W-243 · W-248 · W-263 · W-266 · W-280 · W-288 · W-289 · W-293 (moved behind the
header's info glyph, T-05) · W-294 · W-337 (+ "Open the record" once done) · W-338 · W-340 · W-345 · W-349 · W-354 · W-367 · W-369 · W-373 ·
W-394 · W-396 · W-402 · W-404 (+ "Recorded in Company › Profile", the door every member keeps) · W-412 · W-413 · W-415 · W-417 · W-425 (where the
crumb names the lead) · W-435 · W-440 · W-451 · W-454 · W-457 · W-463 · W-493 · W-495 · W-532 · W-587.

**In part (2):** W-085 — the header reads "29 Sep ’26 · Sent 12 Oct ’26"; the item count lives once, in Item by item's head (6-05's say-it-once).
W-256 — "No price", said once in their cell; the Status chip keeps the DS Tag's capitals (a status, T-06; Request 15).

**Not applied (5):** W-018 — "Floorplan to 3D Isometric" kept, 1.0's name, by the contract. W-456 — needs 6-09's soft delete (schema).
W-466 — the planner gallery's "5 layouts" title is `LibraryGallery`'s (Request 8). W-512 · W-544 — the rule row's "Details" word and its
"MANDATORY" chip live in B3's shared `item-row.tsx`: B3 landed them in main (the row opens from its title; "Required").

## 4 · The guard

`node design-source/verify/ui-audit-build/guard.mjs diff $RL/B6/guard-before.json $RL/B6/guard-after.json` (after every edit, before the build):

```
✓ pages: none gone
✓ server actions a screen calls: none gone
✓ control handles (data-testid · data-kb): none gone
✓ keyboard shortcuts: none gone
  new handles: 21
```

173 pages · 1064 server-action call sites · 3784 handles (3763 before + 21 new) · 120 keys. A button that moved into a ⋮ keeps its testid on the
menu row's label (`navigator-record`, `navigator-note-add`, `planner-underlay-remove`) or on the new host (`market-views`, `market-categories`,
`insights-categories`, `viz-options-toggle`). `npx tsc --noEmit -p .` clean; `npx eslint` on every B6 folder clean; `npm run design:lint` —
"nothing new breaks a house rule" (no baseline touched).

## 5 · Probes

`RUN_DIR=$RL/B6/run bash $RL/heavy.sh probes node design-source/verify/regression/run.cjs 3461 <ids…>` on this lane's production build.
Every restated line is marked `(the calm UI build 2026-10-27, a deliberate change)` with its finding; no functional assertion was weakened —
where a control moved, the probe now opens the ⋮ / presses the info button first and asserts the same thing.

**The lane's twelve:**

| Probe | Result | Restated |
|---|---|---|
| fp3d | **98 / 98**, and again on the last build | the prototype's note is the header glyph's tooltip (its aria-label + tooltip words); the wait says "ready-made"; "Sample plan — ready-made views"; the iso line "3D at an angle — "; `fp3d-pure.mts` — the HDB 4-Room's summary names its Corridor |
| pm2-s35 | **137 / 137** | — |
| rwd-w5 | **74 / 74** | — |
| rooms-menu | **10 / 10** | — |
| viz-sheets | **14 / 14** | — |
| viz-client | **30 / 30** | — |
| viz-studio | **37 / 37**, and again on the last build | the "Makes 1 version · Fast" line is read after opening the tune button |
| xr-r1 | **29 / 29** (28 / 29 first — the sentence locator met the new row wrapper; restated) | How we counted pressed before reading the footnote (whole dollars "S$ 68,176"); the points' Why pressed before "the evidence names Flo"; the head's one "Say it as a question" (and that a point now reads as its question); Sources pressed before reading them; an empty Difference is blank; the sentence locator skips its new row wrapper |
| xr-r2 | **31 / 31** | "items read"; the heading "Yours vs Acme Interiors" (or the lead's name where the crumb doesn't carry it) with Vivien Lee in the header; "no items to compare" |
| xr-r3 | **28 / 28** | "Send on WhatsApp" |
| xr-r4 | **16 / 16** | a Recent row's Delete is its ⋮'s row — refused for Sarah (aria-disabled), allowed for an Owner |
| ux-p7 | **89 / 89** on the rerun (the first run's one fail was the filled-Share check, restated before the rerun) | "Before and after" (was Compare) on the ready snackbar; the fresh version on screen leaves Share to the top bar's Share (in view, enabled); Share is outlined, not the primary fill (the one fail of the first run, restated before the rerun) |

**Beyond the list — registered probes this lane's words reach** (restated where they broke, and run on the last build):

| Probe | Result | Restated |
|---|---|---|
| ghosts-same | **76 / 76**, and again after the last ghost fixes | — (the ghosts follow the pages: the Marketplace / brand / Insights / X-Ray / Visualizer ghosts were redrawn) |
| ghosts-same-390 | **76 / 76**, and again after the last ghost fixes | — |
| ux-p5 | **59 / 59** | X-Ray's send: "Send on WhatsApp" (subtitle and button) |
| sw-r3 | **13 / 13** | "No price" (was "no price given") |
| cr-r3 | **40 / 40** | the Visualizer's price line read after the tune button |
| dane-p4 | **37 / 37** (36 / 37 first — restated, rerun) | "the left status bar stays" → no left bar (6-05 reverses UAT 7.04); a no-price row's chip wears its words' colour |
| pm2-s46b | **80 / 80** (79 / 80 first — restated, rerun) | "Studio’s own" in the Kind pill; the editor's "Project · P-…" in the name's tooltip; the number in the list view's Kind column; the card says "Project" |
| pm-h | **28 / 29** — the one ✗ is the harness, not this lane: its section 5 stats `path.join(__dirname, '..', '..', '..', 'public', …)`, which from the copy run.cjs makes in `RUN_DIR` points at `$RL/B6/public/…` (ENOENT) — the stop is before the Navigator's section 6. Run from the repo by hand: **50 / 50** (the Navigator's note through the card's ⋮ included) | Add a note through the card's ⋮; a Designer has no ⋮ |

**Restated, not in the regression set** (not run — they're not registered): `parity-map-build/verify-pm-j.cjs` (New ▾ › From a ready-made flat… and
its tabs), `projects/verify-pj-gap-j.cjs` (the same row), `projects/verify-pj-gap-i.cjs` (Record as done through the card's ⋮),
`pending-modules/verify-pm2-s42d.cjs` ("Floor plan underneath" over its name), `pending-modules/verify-pm2-s41b3.cjs` ("8 items", "23 items").
**This lane's module probes outside the regression set** — `pending-modules/verify-pm2-s24.cjs` (Marketplace) and `verify-pm2-s25.cjs` (Market
Insights) restated for the Tabs, the category scope pill (its rows, no counts), the deals' count badge, Featured on the brand page, "Ask again on
WhatsApp" after an ask, the demo-links line, the Add dialog's words, the "· Sample"-free eyebrows and the source glyph — and run by hand on a copy
of base.db (they aren't in `probes.cjs`): **pm2-s24 132 / 132** (its ghost-vs-page checks found the brand page's ghost off by the vendor
line, the demo links' rows and the Questions card it never drew, and the phone cards' uneven rows — fixed, see ▲13), **pm2-s25 98 / 98**.
**Also restated and run by hand** (this lane's, not in `probes.cjs`): **pm2-s36 110 / 110** (the trial's "free versions"), **pm2-s21 41 / 41**
("items read"; a point's evidence behind Why; one "Say it as a question"), **pm2-s28 96 / 97** (the planner's "Trace a floor-plan photo", "Set its
size…", "3D floor plan…", whose it is in the name's tooltip, From a ready-made flat… — every one of its assertions has passed; its last two runs
each missed one different check on a cold server's first open — the photo dialog on arrival, then ⌘K's Create rows, B1's — and passed it in the
other run).

## 6 · Measures — before → after (the audit's `measure.cjs`, the first screen of `main`)

Before = the audit's lane-6 table (`ui-audit-2026-10-27/lanes/lane-6-pages.md`, the same measure); after = this build on `lane.db`. Words ·
controls · purple text actions · filled buttons · capitals · cut strings. Shots: `$RL/B6/shots/after-<screen>-{1440,390}{,-full}.png` (the
befores are `ui-audit-2026-10-27/shots/6-*.jpg`), and the moments `after-planner-new-{menu,flats,examples,templates}`, `after-planner-
{underlay-menu,title-tooltip,share-dialog}`, `after-compliance-{menu,open}`, `after-fp3d-{confirm,done}`.

| Screen | Width | Words | Controls | Purple | Filled | Capitals | Cut |
|---|---|---|---|---|---|---|---|
| /marketplace | 1440 | 236 → **130** | 44 → **40** | 0 → 1 (the info glyph) | 0 → 0 | 0 → 0 | 7 → **0** |
| /marketplace | 390 | 123 → **89** | 27 → 28 | 0 → 1 | 0 → 0 | 0 → 0 | 0 → 0 |
| /marketplace?view=deals | 1440 | 199 → 196 | 17 → 18 | 0 → 1 | 0 → 0 | 10 → **0** | 0 → 0 |
| /marketplace/mkb-4101 | 1440 | 147 → **138** | 14 → 14 | 0 → 0 | 1 → 1 (WhatsApp Oak & Linen) | 8 → **6** (Featured + the house card heads) | 0 → 0 |
| /marketplace/mkb-4101 | 390 | 66 → 63 | 11 → 11 | 0 → 0 | 1 → 1 | 4 → **2** | 0 → **0** |
| /market-insights | 1440 | 314 → **291** | 12 → **9** | 2 → 2 | 0 → 0 | 9 → **0** | 0 → 0 |
| /market-insights/mi-demo-budget-benchmark | 1440 | 170 → 168 | 2 → 2 | 0 → 0 | 0 → 0 | 1 → **0** | 0 → 0 |
| /visualizer | 1440 | 130 → **46** | 14 → 14 | 5 → **3** | 0 → 0 | 0 → 0 | 1 → **0** |
| /visualizer | 390 | 60 → **39** | 11 → 11 | 1 → 2 | 0 → 0 | 0 → 0 | 1 → **0** |
| /visualizer/b46000d1… | 1440 | 197 → **173** | 52 → 52 | 6 → **5** | 2 + markers → **1** + markers (Generate) | 3 → **1** ("Versions") | 1 → 1 (a version's descriptor in the strip) |
| /visualizer/b46000d1… | 390 | 104 → 103 | 43 → **41** | 5 → 5 | 2 + markers → **1** + markers | 1 → 1 | 3 → 3 (the strip's descriptors) |
| /quote-x-ray | 1440 | 170 → **79** | 12 → 12 | 3 → **1** | 1 (disabled) → 1 (disabled) | 3 → **0** | 3 → **0** |
| /quote-x-ray | 390 | 116 → **74** | 5 → 12 (the form is in the first screen now) | 3 → **1** | 0 → 1 (Compare, disabled) | 2 → **0** | 0 → 0 |
| /quote-x-ray/7be8b2da… | 1440 | 402 → **300** | 8 → 15 (Why · Sources · How we counted) | 6 → 6 | 1 → 1 (Send to client) | 6 → **3** (the tiles' captions, `StatTile`) | 0 → 0 |
| /quote-x-ray/7be8b2da… | 390 | 136 → **125** | 5 → 9 | 2 → 5 | 1 → 1 | 3 → 3 | 0 → 0 |
| /floorplan-3d | 1440 | 157 → **136** | 2 → 3 (the info glyph) | 4 → 4 | 0 → 0 | 2 → **1** (Beta) | 0 → 0 |
| /floorplan-3d (done) | 1440 | — | — | — | 1 = **Download** (was Regenerate) | 3 → **1** (Beta) | 0 |
| /planner | 1440 | 132 → **105** | 16 → 16 | 2 → 2 | 0 → 0 | 0 → 0 | 4 → **0** |
| /planner | 390 | — → 83 | — → 14 | 1 | 0 | 0 | — → **0** |
| /planner/4a0a2cd8… | 1440 | 182 → **176** | 31 → 31 | 5 → **4** | 1 → **0** (Share outlined) | 1 → **0** | 1 → **0** |
| /compliance | 1440 | 239 → **186** | 12 → 14 (a ⋮ a card, a toggle a head) | 16 → **2** | 0 → 0 | 6 → **4** (Done / To do — statuses) | 0 → 0 |
| /compliance?tab=rules | 1440 | 137 → 154 (more rows in the first screen) | 17 → 18 | 15 → 17 (each row's "Details" — B3's row; landed in main as a title toggle) | 0 → 0 | 10 → 8 (MANDATORY — B3's row; "Required" in main) | 0 → 0 |
| /site/try | 1440 | 107 → 107 | 6 → 6 | 3 → 3 | 1 → 1 | 2 → 2 | 0 → 0 |

No page errors, no sideways scroll at 1440 or 390 on any of them.

## 7 · Requests — exact changes in files this lane doesn't own

1. **B3 · `components/projects/compliance/item-row.tsx`** (6-13 · W-544 · W-512) — **landed by B3 in main** (its own 6-13 row): the shared row
   opens from its title (no "Details" word) and says "Required". The Navigator's Rules by home reads it as it is — nothing more asked. (This
   lane's worktree predates it, so its shots and measures still show the old row: MANDATORY · Details.)
2. **B3 · `components/projects/compliance/compliance-ghost.tsx:27`** — the ghost's group heads: `'Permits & Approvals'` → `'Permits and approvals'`,
   `'Professional Engagement'` → `'Professionals to engage'` (the checklist's labels are sentence case now, `lib/compliance/sg-checklist.ts`).
3. **B1 · `components/shell/page-header-l2.tsx`** (6-34) — an optional crumb-only form (`title?: string`; with none, the crumbs without a trailing
   slash and no h1 row). Then `components/market-insights/article-page.tsx` drops `title={a.title}` and its `<p className={styles.headline}>`
   becomes the page's `<h1>`; `article-ghost.tsx`'s `GhostHead2` takes no title.
4. **B1 · `components/shell/page-header.tsx`** (6-22 · W-125) — an `after?: ReactNode` slot drawn right after the h1, so a status beside the title
   (Floorplan to 3D's Beta, and its info glyph) and the Marketplace / Market Insights info glyphs sit by the title, not at the header's far right.
   Then: `components/floorplan-3d/floorplan-tool.tsx` passes `after={…BetaTag + SourceInfo…}` in place of `actions`, and the two feeds likewise.
5. **B1 · promote `components/marketplace/source-info.tsx`** (`SourceInfo`: an info glyph whose words are its tooltip and, on a press, the house
   snackbar) to `components/om/info-tip.tsx` — the Marketplace, Market Insights and Floorplan to 3D use it now; one house piece.
6. **B1 · ⌘K and the Tools popover** (6-06 · W-020) — `lib/global-search/model.ts:433` "Make a 3D picture" → **"Trace a floor-plan photo"**
   (sub "3D Space Planner · start a layout over a floor-plan photo"), keeping "make a 3d picture" in its words; the Tools tile keeps
   "Floorplan to 3D Isometric" (1.0's name, by the contract).
7. **B2 · `components/leads/files/*`** (6-06) — a floor plan file's ⋮ row "Make a 3D picture" → **"Trace a floor-plan photo"** (it opens the
   planner's same dialog, now titled so). **B3 · the project's Floor plan ⋮** — the same row, the same words.
8. **B5 · `lib/company/folder-libraries.ts`** (6-20) — `LIBRARY_ROOT.visualizer` `'All designs'` → `'Designs'`; and `LibraryGallery`'s gallery
   title for a library with no folders — the planner's "5 layouts" → **"Layouts"** (W-466), the count staying in the Kind pill's menu. Then
   `design-source/verify/ai-visualizer/verify-viz-studio.cjs:21` reads "Designs".
9. **B5 · `components/company/templates/library-gallery.tsx`** (6-20) — the Folders row's lone select-all checkbox goes; selection shows on hover /
   press as the cards' does.
10. **B1 · `lib/trial/policy.ts`** (T-01 · 6-14) — `XRAY_WORDS.fromRead` "(8 lines)" → "(8 items)", so it reads as the note beside it now does.
11. **B1 · `lib/maison-ai/answers/work.ts`** (6-07, from the Visualizer fork) — render(s) → version(s) in the three Visualizer answers
    (`rendersPickedAnswer`, `designsWaitingAnswer`, `rendersByLeadAnswer`): "No client picked a version in the last 7 days", "n versions picked…",
    "When a client taps the heart on a version you sent…", "Every live link has a pick…", "No lead has a version yet", "…once its first version is
    made", "n leads with versions", "The most versions first".
12. **B1 · `lib/notifications/model.ts`** (6-07) — `render_feedback`: label "A client responds to shared versions", help "…on the versions link",
    both templates "…the versions you shared…".
13. **B1 · `lib/global-search/model.ts`** (6-07) — the AI Visualizer's row: add "version versions" to its words.
14. **B2 · `lib/leads/activity.ts`** (6-07; lines ≈348–371, 994–1001, 1133) — the Visualizer's Activity lines render(s) → version(s): "opened the
    shared versions", "The versions’ link was stopped.", "a version" / "the versions", "asked for a call back about the versions", "…the versions
    saved to Files stay", "the versions’ link", "for versions from the AI Visualizer". `verify-viz-client.cjs:56–59` then reads them.
15. **B1 · `components/om/meta-chip.tsx`** (6-05 · W-256) — only if Vicky wants sentence-case status chips: a sentence-case option; the DS Tag
    always uppercases, so X-Ray's Status chips keep capitals (a status — T-06 allows it).
16. **B1 · `components/om/stat-tile.tsx`** (T-06) — its labels draw as uppercase captions ("LIKE-FOR-LIKE DIFFERENCE"); a sentence-case option if
    the house wants tile labels as card heads.
17. **B4 and every lane with a WhatsApp send** (W-058 · 6-19) — "Send via WhatsApp" → **"Send on WhatsApp"** (contracts' Send for signature, a
    reminder, Send together, the quotes' send, the project money sends, meetings), the subtitle's "Send via WhatsApp opens your chat" with it;
    `design-source/verify/ux-build-2026-09-30/P5/verify-p5.cjs:131 · 175` then read the new words. **B4** — Create Quote › Upload a quote's
    "N lines read" → "N items read" (X-Ray's shared file tile says items now).

## 8 · ▲ For Vicky

1. **6-09 X-Ray's delete is still permanent.** A soft delete with Undo and Deleted comparisons needs a migration (`quote_comparisons.deleted_at`),
   a soft `deleteComparison` + `restoreComparison` / `deleteComparisonForever`, a read filter in `lib/xray/queries.ts`, the sheet in the page's ⋮
   and an Activity rule — schema and behaviour, outside this pass. Today's ConfirmDialog stays (now from the row's ⋮).
2. **Floorplan to 3D's prototype line went behind the header's info glyph** (beside Beta) — today's 1.0 audit (REG-3070…3074) had put it under
   the drop box on purpose ("never a surprise after it"); the audit's T-05 says prototype talk goes behind a "?". Its words are unchanged and the
   held line after a studio's own upload stays. The tool's How it works / What you'll get landing is **kept as today's audit left it** (6-10's
   one-line pattern was not applied there — the coordinator scoped Floorplan to today's leftovers).
3. **We found reads as one sentence** in Floorplan and the planner's photo dialog (T-06 / 6-08), not 1.0's chip row; `roomSummary` now names a
   room outside 1.0's groups ("Corridor", "Foyer") so the total adds up.
4. **The planner's photo start keeps its own path** ("Trace a floor-plan photo", its picture "3D floor plan") instead of becoming a door to
   Floorplan to 3D — the prompt's choice; the doors in ⌘K, Files and the project's Floor plan are requests 6–7.
5. **The New layout dialog's tabs** — My templates is its own tab now (it used to sit above the flats in the one list): a studio with templates
   opens on Flats and presses My templates. Say if templates should lead.
6. **The planner's list gained a "Project no." column** — the number left the cards (6-32 asked for it "only on hover / in the list view's column").
7. **The material picker's categories are a scope pill in the AI Visualizer too** (it is one shared picker), kept where the chips were — just
   above the catalogue they narrow — not next to the search: a pill by the search would read as narrowing Suggested, Recent and Your studio too.
   **"Your studio" head kept** (6-31 asked to drop it for a mark on each swatch — new UI, and it is what tells the studio's own materials apart).
8. **The planner's Finishes rooms**: beside the stage in 3D / Walk, the panel's room chips step back and the stage's "Go to a room" strip now
   also picks the room the panel paints; in a sheet (≤1024) the panel keeps its chips (the sheet covers the strip).
9. **Compliance**: the agency tag is gone from the card head (the title names the agency); for a done step the ⋮ row reads "Open the record"
   (invented copy — "Record as done" would be wrong once done). Designers get no ⋮ (nothing in it is theirs); everyone keeps "Recorded in
   Company › Profile" under the tabs. The steps' titles are sentence case at their one source, so Company › Profile's registrations list follows.
10. **Marketplace** (the fork): the "n deals" badge opens the brand page when there are several (it always opened the first deal); monogram
    logos are hidden on the card and the brand page's About (the storefront glyph shows there); demo links keep their rows with one line "Links
    open on the live app"; Email names the brand like WhatsApp; the source lines are an info glyph whose press says the words in the snackbar
    (a finger has no hover) — W-114 asked to drop Insights' line; it moved instead, because its byline shows only on the featured card and the
    article. Reverses S24's chips with counts, S25's "· Sample" eyebrows and S42E's E-10 phone rule.
11. **AI Visualizer** (the fork): UX audit V4's "Share with the client…" first row on a fresh version's ⋮ is gone while that version is on screen
    (the top bar's Share is the one door; the "Share V4 with Kevin?" snackbar stays); the home intro has no Dismiss any more (one line); "only the
    selected version's ⋮" applies on every touch screen, not phones only; on touch the editor no longer shows the project's number (it's in the
    name's tooltip); the ready snackbar's "Before and after" is longer than "Compare"; the dock tab "Whole room" wraps at 320; the trial's editor
    says versions while its landing (marketing copy) says renders.
12. **Quote X-Ray** (the fork): the row's left status bar went — reverses Dane UAT 7.04 (its probe restated); a no-price line's chip names its
    side, so an unpriced line only they have reads a red "Only in theirs"; the intro box's rule is "no comparison yet" (there was no first-visit
    store) — in a fresh browser on a studio with none, the ghost draws no box once; "Yours vs Flo Design" only where the crumb names the lead; the
    status chips keep the DS Tag's capitals (a status); "How we counted" prints the quote's total in whole dollars ("S$ 68,176", was cents).
13. **Found and fixed on the way (this lane's own):** the fork's "WhatsApp {brand}" ran off a 390 screen beside Add to my vendors — on a phone it
    reads "WhatsApp" / "Email" (the brand is the title above; the accessible name keeps it); the Marketplace's phone cards now all keep room for
    two lines of name and of meta (one meta line made a row's height follow its name, and the page jumped under its ghost); the brand page's
    ghost never drew the Questions card (a phone's Contact landed 250px off) — it does now. With "Not in your vendors yet" gone, the About card's vendor line is held
    empty for a brand not in the vendors (`StateSpace`), so adding it fills the line instead of pushing every card below — and the ghost is one
    height for both. The Visualizer's "Describe a change" caption is its
    field's sentence-case label (T-06), the rail's "Whole room" tab keeps one line at a desk, and the planner's and Visualizer's card feet wrap on
    a narrow card instead of cutting (T-12).
14. **The limiter starves a lane that waits** — `heavy.sh` asks for a slot every 5 s, and lanes that run one probe per call take a freed slot
    within milliseconds; this lane's queued run waited 45 minutes. Its last rounds used the same lock directories, asked every 0.3 s
    (`scratchpad/slot.sh`, still at most three probe runs machine-wide). Worth the same change in `heavy.sh` for everyone.

**Register:** Numbered REG-3303…3333 (see build/reg-map.json).
