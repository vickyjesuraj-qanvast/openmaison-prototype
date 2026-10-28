# Package K-D1 — the Leads listing: outcome (2026-10-08)

Fixes: **P-18** · **P-19** (+ Q-08) · **P-20 lead side** (+ Q-07) · **P-25 lead side** · **P-26 lead side**. Register rows staged in
`reg-KD1.md` (REG-KD1.1…6). No schema, no demo-data change, no repair block. `npx tsc` clean on every file below (the remaining errors in
the tree are other packages' work in progress); `npx eslint` clean on them; `npm run design:lint` ✓ (no count raised).

## Files

| file | what |
|---|---|
| `lib/leads/listing-url.ts` (new, pure) | `readListing(params, isSortKey)` · `writeListing(state, base)` · `stageSlug` · `LISTING_KEYS` — the address shape below |
| `app/leads/workspace.tsx` | the view read once from `useSearchParams()` (lazy initialisers), written back 150 ms after a change with `history.replaceState(null, …)`; the head sort held here (`sort` / `setSort`, the Filters Oldest/Newest rule moved into `setFilters`); `here()`; `openLead` (table · kanban · cards); every way out carries `withFrom(…, here())`; the bulk bar's Export + `exportPicked` → `ExportDialog selected` |
| `components/leads/table.tsx` | `export type LeadSort` · `isSortableColumn`; `sort` / `onSortChange` props (held sort; the table keeps its own when they are absent). Nothing else touched |
| `lib/leads/view-pref.ts` | `rememberView` passes `null` as the history state (bug: the router never learnt `?view=` and a refresh wrote the old address back) |
| `components/leads/toolbar.tsx` + `.module.css` | the house `ToolbarSearch` in a `.searchSlot` (display: contents); ≤767 the glyph before Filters, the pill steps aside while the box is open; 768–1024 the 280 box stays (Q-08); REG-307's 44 box on touch kept; the old `.searchWrap` / `.search` rules and the `useSearchTarget` copy gone |
| `components/leads/stage-filter-dropdown.tsx` | group label "To do", sheet title "Lead status" |
| `components/shell/skeleton.tsx` (LeadsSkeleton only) + `skeleton.module.css` (new `.selCol` · `.selSlot`, used by the Leads ghost only) | check slots in head and rows (name at 52 / 40 on a touch tablet), the `tune` slot, the phone row's search glyph |
| `components/leads/kanban/skeleton.tsx` | the `tune` slot in the board ghost's toolbar |
| `design-source/verify/ux-build-2026-09-30/P2/verify-p2.cjs` | lines 29 · 35 · 246 — "To do" / "Lead status" (see Probes) |

## P-18 (B-01) — the view in the address, every lead opened with the way back

The address (defaults are left out; keys the listing doesn't own — `view`, anything else — stay where they are):

```
/leads?scope=contacted&q=Farah&quick=overdue&type=Condo&type=HDB+5-Room&source=Instagram&member=dane&date=custom&start=1%2F9%2F2026&end=30%2F9%2F2026&sort=oldest&col=created&dir=desc
```

`scope` = a stage slug (`new` · `contacted` · `met` · `quote-sent` · `won` · `on-hold` · `lost`) or `mine` · `overdue` · `unassigned` · `unseen`;
the custom period is `start` / `end` (never `from`, which is the way back); several values are repeated keys (a source may hold a comma);
an unknown value reads as the default; a `member` no longer on the team is dropped on read.

Why on the client and through `history.replaceState(null, …)` rather than Projects' `router.replace`: the page is `force-dynamic` and every
`router.replace` re-runs it (every lead, every keystroke); the native call is Next's documented way to change the address without a
request, and `null` (not the entry's own state) is what makes the router take the new address in — handed `history.state`, Next treats the
call as its own and its next refresh writes the old address back (that was `rememberView`'s bug, fixed). Reading with `useSearchParams()`
covers the browser's Back button too (it restores the address, not the server's props).

**Check in the browser** (Dane · Owner; then View as a Designer — the same):
- 1440: scope *Contacted*, search "Farah", Filters › Property type *Condo*, the Created head twice (desc) → the address reads
  `/leads?scope=contacted&q=Farah&type=Condo&col=created&dir=desc`; open Farah → the lead's address carries `from=%2Fleads%3Fscope%3D…`;
  Back → the listing exactly as it was (pill "Contacted (n)", "Farah" in the box, Filters (1), the head's ↓). The browser's own Back too.
- Reload that address → the same view. Paste `/leads?scope=overdue` → "Overdue follow-ups (n)" with the applied dot.
- Filters › Sort *Oldest* → the Created head shows ↑ and the address carries `sort=oldest&col=created&dir=asc`; *Newest* clears both.
- Kanban (`?view=kanban`): scope + search, open a card's name → Back lands on the board as it was; move a stage (a refresh) → `view=kanban`
  and the scope stay in the address.
- 390: the cards open with `from`; Back → the pill's scope and the query come back (the box opens with its query).
- The Tasks popover's task → the lead's Tasks with `?open=…&from=…`; ⋮ › Leads Settings and the Insights button → Back to the listing as it was;
  a row ⋮'s *Open project* and the Won snackbar's *View* → the project's Back returns to it.

## P-19 (B-08) · Q-08 — the house ToolbarSearch

- 390 (touch): one row — pill · search glyph · Filters; the glyph opens the box in the row and the pill steps aside while it is open;
  emptied and left, it folds back; "/" opens it. "View all" still folds when the pill's words leave it no room (g-viewall 390).
- 768 touch and 1024 mouse: the 280 box in the row, no glyph (Q-08, Leads' way); on a touch pointer it stands 44 (REG-307 kept).
- 1440: unchanged (the 280 box; "/" chip; the placeholder "Search name, phone, email…").

The 768 rule is this row's own override of the house fold (`toolbar.module.css` `.searchSlot` at 768–1024: the slot's child without the
field steps out, the field keeps 280). **Better done once**: a `fold?: 'tablet' | 'phone'` choice on `ToolbarSearch` (default `'tablet'`, the
tabs' REG-384; `'phone'` keeps the box from 768 up) — both listings need it for Q-08 (see Needs from others).

## P-20 (B-02 · B-03) lead side · Q-07

- The pill's menu at 1440: All Leads · Mine · **TO DO** (Overdue follow-ups · Unassigned · Unseen) · ● ACTIVE … · ● INACTIVE … · Manage Stages.
- 390: the sheet's title reads **Lead status**.
- The pill keeps counting the rows the list shows (`filtered.length`, unchanged).

## P-25 (B-16) lead side

- 1440 table: tick two rows → the bar reads Assign · **Export** · Delete (Delete for Owners / Admins); Export opens *Export Leads* on
  **Selected leads (2)** (package K-D2's third set); Export writes those two; the snackbar "Exported 2 leads as CSV · …".
- ⋮ › Export all as… still opens on *All leads*, with no Selected set.

## P-26 (B-17) lead side

- Throttle the network and load `/leads` at 1440: the ghost's head and rows carry the check box 16 in, the name bones start at 52, and the
  toolbar has the `tune` slot, so the search bone sits over the real field — the crossfade lands in place. 768 touch: names at 40.
- `/leads?view=kanban`: the board ghost's toolbar has the `tune` slot.
- 390: the ghost's toolbar row is pill · two squares (search glyph, Filters).
- Ghost probes `design-source/verify/ghosts/verify-ghosts-{same,film}.cjs` already cover `/leads` and `?view=kanban` (pixel compare) — no
  assertion changed.

## Probes changed (not run)

`design-source/verify/ux-build-2026-09-30/P2/verify-p2.cjs`, each marked "(parity P-20, Q-07 — a deliberate change of this rule)":
- l.29 the step's log line "the To do group in the scope pill";
- l.35 `the menu has a To do group` (exact "To do", and no "Needs attention");
- l.246 `the phone sheet "Lead status" carries the To do group`.

Checked and left: `uat-dane-2026-10-01/P5a` (g-viewall 1440 / 390 — pill and Filters still one row; the box's label "Search leads" kept),
`keyboard/verify-kb-r1` (lead URL regexes are unanchored; Esc back compares the pathname), `reports-in-company…/verify-reports` (`from=%2Fleads`
still matches), `first-run…` (the input `Search leads` is still rendered once), `ai-credits/verify-cr-r1` (`/leads` with the default view).
New probe assertions for P-18 were not written (no runs this round) — the checks above are the script for them.

## Needs from others

1. **K-D2 — `ExportDialog selected`**: landed in the tree (`selected?: R[]`, "Selected leads (n)", opens on it); the listing passes
   `selected={exportPicked ?? undefined}` and clears it on close. Nothing more needed unless the prop's name changes.
2. **The P-16 package (the lead's Back and crumb)**: every lead opened from the listing now carries `from=/leads…`; until P-16's "the crumb never
   repeats Leads" lands, `fromLabel('/leads?…')` makes the lead's crumb "Leads / Leads". Back already goes to the listing as it was
   (`backHref={origin}`).
3. **K-D2 / the orchestrator — `ToolbarSearch` `fold`**: Q-08 asks both listings to keep the 280 box at 768. Suggested once, in
   `components/om/toolbar-search.tsx` + `.module.css`: a `fold?: 'tablet' | 'phone'` prop written as `data-fold` on the glyph and the wrap,
   with `@media (min-width: 768px) and (max-width: 1024px) { .btn.btn[data-fold='phone'] { display: none } .wrap[data-fold='phone'] { display:
   inline-flex; flex: none } .wrap[data-fold='phone'] .field { width: 280px } }`. With it, Leads passes `fold="phone"` and the `.searchSlot`
   768 block in `components/leads/toolbar.module.css` goes.
4. **For Vicky (no change made)**: Leads' box stands 44 on a touch pointer (REG-307); Projects' and the tab toolbars' house box stays 36 —
   one rule for both listings may be wanted.
5. **K-C (P-28)**: the phone card ghost's info bone is 264 wide for "… · 5d in Met"; if "5 days in Quote Sent" wraps the card's line at 390,
   the card ghost (`components/shell/skeleton.tsx`, `.cardInfo`) needs its second line — tell K-D1's owner (the orchestrator) after K-C lands.

## Repair text

None.
