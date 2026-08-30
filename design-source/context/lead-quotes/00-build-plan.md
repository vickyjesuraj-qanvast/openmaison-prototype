# Lead Details › Quotes — build plan (contract for the implementation)

Mocks: section `910-36240` (listing 910:36241 → frames 108 empty `910:36242` · 109 listing `910:36298` · filters `910:36338`; contextual menus 910:36615 → frames 199 `910:36616` · 200 `910:36681`). Specs measured from Figma: `01-listing-table.txt` · `02-rows-menus.txt` · `03-filters.txt` — **every number comes from those files; nothing is guessed**. Where the mock is silent the Tasks tab (`components/leads/tasks/*`, specs in `../lead-tasks/`) is copied and the copy is named in a comment.

## Route & data (done)
- `app/leads/[id]/[tab]/page.tsx` → `tab === 'quotes'` renders `LeadOverview` (frame, `wide`) with body = `LeadQuotes` (client). Loader `lib/leads/quotes.ts` → `fetchLeadQuotes(leadId)`: `{ quotes: Quote[]; now }` (archived / deleted rows excluded).
- Schema `quotes` (+ migration 0006): `number` "OM-10001" · `title` · `amountMinor` · `visibility` Private | Shared · `status` Draft | Sent for Approval | Approved | Sent to Client | Signed · `createdAt` · `dueAt?` · `sentAt?` · `updatedAt?` (null → show createdAt) · `approvedAt?` · `archivedAt?` · `deletedAt?`.
- Model `lib/leads/quote-filters.ts`: `QUOTE_STATUSES`, `QuoteFilters` (sort newest|oldest · date ''|today|last7|last30|custom + from/to · status[] · due all|overdue|upcoming), `EMPTY_QUOTE_FILTERS`, `activeQuoteGroups`, `activeQuoteFilterCount`, `applyQuoteFilters(quotes, f, now)`, `searchQuotes`, `isQuoteOverdue`.
- Actions `app/leads/quotes-actions.ts`: `createQuote(leadId)` (Draft titled after the lead, S$0, Private — invented, logged) · `setQuoteStatus(id, status)` (first move out of Draft stamps Sent; Approved / Signed stamp Approval Date) · `setQuoteDue(id, date|null)` · `archiveQuote(id, restore?)` · `deleteQuotes(ids)` (soft).

## Components (all under `components/leads/quotes/`)

| Component | File | Spec | Props |
|---|---|---|---|
| `QuotesTable` | `quotes-table.tsx` + `.module.css` | 01 · 02 | `{ quotes: Quote[]; now: number; selected: Set<string>; onSelect(ids: Set<string>); onStatus(quote, status: QuoteStatus); onDue(quote, anchor: HTMLElement); onView(quote); onRowMenu(quote, action: 'share'\|'copy'\|'pdf'\|'print'\|'archive'\|'delete') }` |
| `QuotesToolbar` | `quotes-toolbar.tsx` + `.module.css` | 01 · 02 | `{ query; onQuery; onNew(kind: 'blank'\|'template'\|'import'\|'ai'); onFilter(); filterCount; onMenu(action: 'templates'\|'settings'\|'deleted') }` |
| `QuotesEmpty` | `quotes-empty.tsx` + `.module.css` | 01 (empty) | `{ onFromScratch(); onFromTemplate() }` — the 1244×784 card with the centred illustration (`/figma-assets/empty-quotes.svg` at 180×176), title 20/600, body 14/400, two buttons |
| `QuotesFiltersModal` | `quotes-filters-modal.tsx` + `.module.css` | 03 | `{ open; value: QuoteFilters; onApply(v); onClose; now?: number }` — Sort (radios) · Date (Choice chips + From date / To date `DateField`s shown for Custom) · Status (One Line rows + Checkbox) · Due (radios) |
| `LeadQuotes` | `lead-quotes.tsx` + `.module.css` | — | `{ leadId: string; data: LeadQuotesData }` — the orchestrator (copy of `tasks/lead-tasks.tsx`): search, filters, selection + bulk bar (Delete only — no bulk mock; `components/leads/bulk-bar.tsx`), due DatePicker, status changes, row menu, header menu, delete confirm (`DeleteQuotesDialog` in `delete-dialog.tsx`, copy of the tasks one with "quote"), snackbars, `om:quotes:new` window event (Create quick links › Quote) |

Reuse: `Dropdown` / `DropdownItem`, `IconButton`, DS `Button` / `Checkbox` / `Radio` / `RadioGroup` / `SearchBar`, `DateField`, `DatePicker`, `Tooltip`, `useComingSoon` / `useSnackbar`, `BulkBar`, `Dialog`+`DangerButton` (move-stage/dialogs), `useSearchTarget`, `displayDate`, `money`.

## Rules
- Table (910:36322): fill #fff, inset 1px surface-variant, r8; **head 56 · rows 64**; columns **40 · 319 (fluid) · 128 · 120 · 120 · 120 · 120 · 120 · 157** (= 1244). Cells p12/24/12/16, head p16/24/16/16, selection p12/0/12/16 (head p16/0/16/16). Title column rule 1px at rest (REG-144). No bottom bar.
- Title cell = two lines: title 14/Bold (heading-h5, always — like the leads table, REG-161) + "OM-10001 · Private" 12/Regular secondary, 4 apart. Status cell = "Draft" 14/Regular + keyboard_arrow_down 20 (H g4) → Dropdown of the five statuses (current one marked, REG). Total = `S$` + `money()` ("S$70,000" — no space). Due = calendar_add_on 24 primary outlined when empty, else the date underlined (red when overdue) → picker. Created / Sent / Updated / Approval Date = `displayDate` or "-".
- Row hover (frame 200): fill #f2f2f2 + floating **View** (primary outlined 36) + kebab 36, right 24, level-1 shadow — copy `tasks-table` `.actions/.float` verbatim; "View" answers coming soon (no quote editor mock). Row kebab: Preview and Share · Copy Link · Download as PDF · Print · Archive · Delete(red) — Copy Link copies `location.origin + /leads/<id>/quotes?open=<quoteId>` → snackbar "Link copied"; Archive → snackbar "Quote archived" with Undo; Delete → confirm; the rest coming soon.
- Toolbar: "All Quotes" 16/Bold · **New Quote** (primary outlined, trailing chevron; menu 910:36664: From Blank · From Template · Import from File · Create with AI) · Search 280 · filter (badge) · kebab (910:36729: Manage Templates · Quotes Settings · Deleted Quotes → coming soon). From Blank creates the Draft; the other three answer coming soon.
- Selected row fill #eee5ff (tasks frame 192); select-all in the head; kebab flips up on the last two rows of a 3+ row table.
- Menus toggle on their own trigger (REG-153); every icon-only control has a Tooltip (REG-75); inert affordances → "Coming soon in OpenMaison 2.0".
- Copy from the mocks verbatim; sort heads inert (coming soon).
