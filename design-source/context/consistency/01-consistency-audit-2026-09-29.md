# Consistency audit and programme — 2026-09-29

The owner, 2026-09-29: *"I noticed there are inconsistency in the modal headers, there are modals with bottom border and there are
without. Not just the modal window, there are a lot of inconsistency across the components. Can you please fix all of this once for
all and I don't want this to happen in the future. How can we avoid all the inconsistency for the future developments? … when the
team take this repo and integrate it breaks."*

## Why the app drifted

One cause behind every finding: **copies.** A surface that needed a house piece's look copied its stylesheet (or drew its own) instead
of using one shared component, and each copy then changed on its own. The Insights table lost its head padding that way (REG-723); the
modal heads split into five shapes that way (below). Rules written in documents did not stop it, because nothing failed when a rule
was broken.

So the fix has two halves, and both apply to the team's integration work as much as to the prototype:

1. **One component per family.** Each family (overlays, tables, menus, buttons and chips, page structure) is consolidated into one
   house piece; the copies are deleted. A thing that exists once cannot drift.
2. **Checks that fail.** The house rules are code: `npm run design:lint` (static, the ratchet) and `npm run design:anatomy` (measured
   in a browser) run in CI on every push and pull request (REG-726), and Vicky's review is required on every change by CODEOWNERS
   once branch protection is on.

## Method

Four read-only audits, one per family, 2026-09-29: overlays · menus and popovers · buttons, chips, tags and links · page structure
(tables, headers, toolbars, tabs, cards, empty states, fields). Each listed every implementation with its measures as coded, the
variants with counts, the canonical anatomy (from DESIGN.md, the register or the mocks; else the majority) and each deviation with
file:line. Their findings are summarised per round below.

## Round 1 — overlays (REG-725, built 2026-09-29)

**Found.** 93 house `Dialog` sites in five head shapes — `modal` 64 with the rule (48) · `modal` without it (the templates modals, 2)
· `form` 72 with no rules and an 84 foot (30) · `compact` 64 with a 16px title and no rule (12, plus ConfirmDialog's 40) · `standard`
57 with a border (1) — 15 Drawers with a 65 head (border outside) and a rounded close, and 17 hand-rolled overlays with their own
heads (65 with a border), hand-rolled closes (four hover styles), no elevation on 14 of them and a z of 100 against the dialog's 110.
Two delete-confirm shells answered the same question with "No / Yes" and "Cancel / Delete", a 14px and a 12px message.

**The owner's call.** One head and one foot for every dialog, confirm and sheet, with the divider **always** (of: always · only while
scrolling · never).

**Built.** `SurfaceHead` · `SurfaceFoot` · `FootStart` · `surfaceClasses` in `components/om/dialog.tsx`: head 64 (p20/24), 20/24 bold
title, bare 24 outlined close, the rule inside the head's edge always; body p24; foot 68 (p16/24, gap 12) right-aligned with its top
rule always and its shadow only while the body scrolls. Every `Dialog` size, `ConfirmDialog`, the `Drawer` and the hand-rolled
overlays render them. The six Lead Details delete dialogs are `ConfirmDialog`s ("Cancel · Delete", "Cancel · Move to Trash"); every
confirm's message is 14/20 in the text's ink. Every centred alert keeps 24px phone margins.

**Left for later in this family.** The Deleted/Archived Quotes & Contracts sheets still differ in shape from the Deleted Leads /
Files / Templates trio (Empty Trash in the body, a Close foot, a fixed 640 height — REG-513 names the trio as *the* shape); drawer
widths (320 · 360 · 400 · 420); xl heights (960 · 928 · 680 · 640); the phone split of xl surfaces (sheet vs full screen); the
z-index scale (nested dialogs at 120 = the snackbar's 120).

## Round 2 — tables (to build)

**Found.** The listing (`components/leads/table.module.css`) is copied into 13 stylesheets (the lint's `copied-table`): the frozen
edge ×11, `.hCell` padding ×14, `.hSort` ×10, subgrid rows ×10, the row-action plate ×10. The drift between them: a selected row does
not change on hover (REG-449) in the listing, the libraries and the Deleted sheets; the frozen column has no 1px edge at rest in the
Deleted Files / Templates sheets and on Import History's desktop; the four Deleted/Archived Quotes & Contracts sheets use a 48 grey
head with .02em spacing and 12/16 cells; X-Ray's row actions sit 16 in, not 24; the twin Deleted sheets differ (one has a sticky head).

**Plan.** Extract the listing's table into one shared stylesheet (and a small component for the head cell and the frozen edge) that
every table imports; delete the copies; the anatomy check already measures every table head.

**Owner's calls.** (a) The Settings / Integrations *event tables* (40 grey head, .02em, 8/16 padding, no hover) have spread from lists
of switches to data tables (custom fields, entities, roles, ways in): keep them as a second table type, or move those data tables to
the listing's model? (b) Should Insights and Plan's tables become cards on a phone like the other tables?

## Round 3 — menus and popovers (to build)

**Found.** About 90 menus on the house row (36 / 44 touch, 8/12, body-m, 20 icons) — the core is consistent. The drift: 18 different
menu widths for the same kinds of menu (status 240 vs 200, row kebab 200 vs 220, folder 200 vs 224, insert field 200 · 260 · 280 ·
240→320); `DropdownItem` cannot show a selected mark on rows with rich children (Move to section, Highlight, Text style, Alignment,
Preview with, Quote, Issued by); a locked Delete still reads red (quotes); disabled reasons in native `title`s that never show on
touch (15 places); six group-title recipes; radius / elevation outliers (credits card r8, pin card r8 + L4, Maison AI sheet r12 + L4);
z-index outliers (stage menu 60, tasks popover and tag picker 70, under the Maison AI button's 90); on phones the sheet's 16px gutter
reaches direct-child rows only; the stage menu is hand-rolled (no arrow keys); four copies of the rail popover's placement; row kebabs
still on the inline dropdown in 12 places.

**Plan.** `DropdownItem` gains `meta` · `current` · `selected`; one group title and rule; a width scale (200 · 240 · 320 · the
anchor's width); every menu through `PortalMenu`; the stage menu and the rail popovers on it; disabled reasons in the row (REG-656's
rule); the sheet gutter on every row.

**Owner's calls.** (a) The menu width scale. (b) Glyph-led rows: 8px from the left (the two measured mocks) or 12 (every
DropdownItem)? (c) Should the date picker become a sheet on phones?

## Round 4 — buttons, chips, tags and links (to build)

**Found.** DS Button ≈505 uses, consistent. The drift: ≈20 hand-rolled closes (four hover styles — every one moves to the house
close in round 1); six kebab sizes; round (full-radius) icon buttons in search and the mic; five copies of the scope pill (the Tasks
copy has no applied dot, REG-295); page-local chips in three filter modals; three different "kind" chips; pill-shaped (full-radius)
tags in seven places where the DS tag is r4; five number-disc treatments; ≈50 hand-written text links, 13 underlining on hover
instead of changing colour, three `.retry` links underlined at rest; seven versions of a compact select trigger (28 · 32 · 36 tall);
the Visualizer's text buttons at weight 500 against the DS's 600.

**Plan.** The scope pill, chips, tags and link as the only implementations (`ScopePill`, `Chips`, `MetaChip`, DS `Link`); one kebab
(36 primary for parked row actions, 24 bare in heads); one compact select; tokens for the rail badge.

**Owner's calls.** (a) Which bulk bar wins (779:26316 vs 902:26567 disagree on count type, gaps and close size)? (b) The Visualizer's
500-weight text buttons — keep as the tool's own voice, or the DS's 600? (c) Pill-shaped status tags — allowed, or r4 everywhere?
(d) One house compact select for the seven triggers?

## Round 5 — page structure (to build)

**Found.** Import History hand-rolls the L2 header (always-on shadow, no stroke, no hover plate, no Esc); the tab toolbars are five
identical copies plus Activity's (which does not fold its search, REG-384); the Filters modal exists as four copies of 150–163 lines;
card titles in Company / Settings use three fonts (subheading-m · heading-h5 · heading-h4) and three inner gaps; uppercase captions
carry no spacing, .02em (47 places) or .04em (5); nine empty-state titles re-type subheading-xl by hand; three empty-state variants
plus four near-variants; a hand-rolled select in the import wizard and a hand-rolled search with no focus ring in the Filters modal;
no house multi-line field (three patterns).

**Plan.** `PageHeaderL2` for Import History; one `TabToolbar`; one Filters shell; one card title (the owner's pick); caption labels
without letter-spacing (the listing's); one `EmptyState` with its three documented variants; TextField for the import select; the DS
filled SearchBar in Filters; a house `TextArea`.

**Owner's calls.** (a) The one card-title font for Company / Settings cards. (b) Letter-spacing on uppercase captions: none (the
listing's heads) or .02em (most eyebrows)?

## Guardrails (REG-726, built 2026-09-29)

- `npm run design:lint` — `scripts/design-lint.mjs`: eight rules (a modal draws the house head and foot · a close is the house one ·
  colours, type and radii from the tokens · no design values in inline styles · the DS through `@/components/ds` · no copied table
  stylesheets), counted per file; `design-lint.baseline.json` holds today's counts and may only go down. A new violation fails CI with
  the file, the line and the house piece to use.
- `npm run design:anatomy` — `scripts/design-anatomy.mjs`: opens every page in a browser, measures every table head against the
  listing's and every dialog the page opens (its own Create and Filters, via `data-kb`) against the house head and foot, at 1440 and
  on a phone.
- CI (`.github/workflows/ci.yml`) runs both on every push and pull request, after lint and typecheck and around the build.
- CODEOWNERS already names both of Vicky's accounts on every file; **branch protection on `main` must be switched on in GitHub** for
  it to bind (Settings › Branches › `main`: require a pull request, require review from Code Owners, require the CI check).
