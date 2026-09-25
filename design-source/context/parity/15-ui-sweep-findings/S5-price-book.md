# S5 · The price book and the libraries — the audit's findings (2026-09-25)

| # | kind | where | what a person sees | fix |
|---|---|---|---|---|
| 1 | bug | item-dialog · price-book-items Approve | an Owner edits a proposal then presses Approve: the edits are thrown away | save then approve when the draft differs |
| 2 | bug | library-gallery list kebab | the list scrolls sideways at 1440 (1696px of columns); the in-cell Dropdown is clipped; a short list's menu opens upward past the card | PortalMenu |
| 3 | bug | price-book-items / sections save | the dialog closes before the server answers; a failure loses everything typed | close on success |
| 4 | bug | library-gallery segments | the last proposal answered → the Proposed segment disappears but the filter stays | reset to All |
| 5 | bug | library-gallery All count | with a facet on, "All · 12" while one row shows | All · faceted |
| 6 | bug | import-items-dialog · paste-items-dialog close | Cancel / ✕ / Esc on the mapping step go back to step 1 without the file; cancel twice | the import's own close; a Back button |
| 7 | bug | library-gallery selection | only in list view — no bulk on a phone or in grid view | checkboxes on cards |
| 8 | bug | paste-items-dialog In My Items column | last, off-screen with 7 columns at 1440 | first or sticky |
| 9 | bug | Used by cell | "Not on a quote yet" wraps and is cut | nowrap |
| 10 | drift | library-gallery selected rows | ticked rows keep a white fill (REG-449) | data-selected fill |
| 11 | bug | bulk-edit-dialog | Set vendor / category open with Apply enabled on empty — one press wipes the field; no Undo | explicit choice; Undo |
| 12 | bug | Add Item popover | Show all / At the end instead only by pointer; Tab leaves and clears the place | into the walk / keep focus |
| 13 | copy | popover place line | "Lands below …" shown over My Sections too, but a section lands after the top section | only over My Items; word the section case |
| 14 | bug | section-dialog count / save | counts unnamed lines; Save drops them silently | count named; inline error |
| 15 | drift | Filters button | no count badge (REG-69/295) | filterWrap + badge |
| 16 | drift | empty after filter/search | says "Clear the filters…" with no button | TabSearchEmpty |
| 17 | bug | company-shell ghost | loading.tsx two bones → PageReveal five | pass the skeleton |
| 18 | drift | item-dialog / section-dialog autofocus | Edit opens with the caret in the name (REG-226) | autofocus only when new |
| 19 | drift | section-dialog line tools | icon-only without Tooltip; 24px targets 2px apart overlap on touch; no Undo | Tooltip; wider gap |
| 20 | bug | read-only item / section | the formatted description shown as plain text | render the HTML read-only |
| 21 | drift | gallery toolbar at 768 | wraps into two rows (REG-384) | ≤1024 rules |
| 22 | copy | Designer's empty states | point to Import / Save to My Items they can't use | help by runsBook |
| 23 | bug | Deleted sheet · New ▾ for a Designer | bulk Restore of others' does nothing silently; New ▾ opens a menu of one disabled row | disable boxes; Tooltip on New |
| 24 | drift | validation copy | not MSG | MSG.required · MSG.url |
| 25 | bug | History load failure · markup > 1000 | "No changes kept yet." on failure; Apply greys with no message | error state; inline error |
| 26 | bug | export "What the list shows (0)" | exports a header-only file | disable at 0 |
| 27 | drift | Deleted sheet confirms | a second full scrim | nested |
| 28 | drift | Deleted sheet head | scrolls away | sticky head |
| 29 | copy | Product link / Link / Website Link; Vendor / Vendor/Sub; Unit price / Unit Price | one field, several names | book-mode labels |
| 30 | copy | BOOK_RULE · Price book · Price Book · My Items | the book named four ways | one name |
| 31 | copy | section-dialog Lines / Add a line / Item / items | four words for one thing | one word |
| 32 | copy | Filters "Clear all" | every other says "Clear All" | Clear All |
| 33 | copy | empty cells — / -- / – | three glyphs | "--" (REG-228) |
| 34 | copy | gallery failures · import helper | "Couldn’t restore" without what; "comes back as it went out" isn't true for photos | name the object; reword |
| 35 | drift | hard-coded #666666, mono 12px, 4px radii | not tokens | tokens |

## What the round did (REG-659, 2026-09-25)

Fixed: #1–#29, #31–#35, T-08; #17 came with S4's ghosts (`tabBones`). Probe `design-source/verify/ui-sweep/verify-sw-r5.cjs` 33/33, shots `s5-*`.

Left, and why:
- **#30** *View Price Book* on the Items table is the mock's words; `BOOK_RULE` says *the price book* in a sentence — the section's own name, lower-cased as prose.
- **#2 (width)** the price book's list is still wider than 1440 with every column on — the listing's model scrolls sideways with a frozen name, and Column settings hides what a studio doesn't use; the clipped menu was the bug.
