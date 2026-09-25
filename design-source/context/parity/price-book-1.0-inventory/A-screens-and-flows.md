# OpenMaison 1.0 — Price book inventory · Slice A: screens and flows

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469` (checked with `git rev-parse`; the working tree differs from it only in `package-lock.json`). Paths relative to that repo. Line numbers as read on 2026-09-25. Nothing was run.

Conventions: every row has **Where** (paths:lines), **Does** (behaviour, who may, with the rules as sub-bullets), **Data** (tables / fields / routes touched) and **Words** (UI copy verbatim in italics, `{x}` = an interpolated value, `{s}` = a plural "s"). Features, logic and data — not styling. Behaviour an earlier audit already records is cited, not repeated: "quote-editor A-nn / B-nn" = `../quote-editor-1.0-inventory/`, "templates C-nn" = `../quote-templates-1.0-inventory/C-content-templates-rules-text.md`, "accounts A-nn / C-nn" = `../accounts-setup-1.0-inventory/`. Where this slice is deeper than those rows it says so and adds what they miss. "Hand-off" = owned by another reader of this five-reader audit (the data model and every route's checks in depth, the AI parser / matcher / drift / embedding engines, 2.0 today) and only named here. "Trusted" = a member whose `studio_members.tags` literally contain `owner` or `admin`; "editor" = a member who passes `pricebook.edit`.

Abbreviations: `PBM` = `src/components/accounts/price-book-manager.tsx` (the whole price-book workspace); `PBE` = `src/components/accounts/price-book-item-editor.tsx` (the item side panel, also the quote-line panel); `TABS` = `src/components/price-book/tabs.tsx`; `PEND` = `src/components/price-book/pending-tab.tsx`; `DRIFT` = `src/components/price-book/drift-tab.tsx`; `CHIP` = `src/components/price-book/drift-chip.tsx`; `PDS` = `src/components/accounts/price-drift-summary.tsx`; `HIST` = `src/components/accounts/price-book-history-drawer.tsx`; `CSVD` = `src/components/accounts/price-book-csv-dialog.tsx`; `VMD` = `src/components/accounts/vendor-markup-dialog.tsx`; `NIS` = `src/components/leads/new-items-suggestion-modal.tsx`; `BPB` = `src/components/leads/browse-price-book-modal.tsx`; `PBC` = `src/components/leads/price-book-combobox.tsx`; `PBMOD` = `src/components/leads/price-book-modal.tsx`; `PBQ` = `src/lib/queries/price-book.ts`; `SCQ` = `src/lib/queries/studio-config.ts`; `PBS` = `src/lib/queries/price-book-suggestions.ts`; `PBR` = `src/app/api/studio-config/price-book/route.ts` (GET list, POST add); `PBRID` = `src/app/api/studio-config/price-book/[id]/route.ts` (PATCH); `ACC` = `src/app/(main)/accounts/page.tsx`; `QDD` = `src/components/leads/quote-digitizer-dialog.tsx` (the 1.0 quote editor); `TASKS` = `src/app/(main)/tasks/page.tsx`; `AC` = `src/lib/access-control.ts`.

## Vocabulary (where each word is defined)

- **Price book / catalogue** — `studio_price_book`, one row per item (`src/types/app.ts:3862-3906`, transformer `src/lib/transformers.ts:978-1040`). The Accounts tab id is `catalogue`, the label *"Price Book"* (`ACC:100`). Not to be confused with Accounts › Projects › *"Material Catalog"* (`ACC:121`, `src/components/accounts/material-catalog-manager.tsx`), a separate library of client-selection options that no quote reads (quote-editor B-57).
- **Item Name / Description** — `name` is the headline (*"Item Name"*, required in the editor); `description` is specs (*"Description (optional, specs)"*, `TEXT NOT NULL`, legacy rows carry the title here). Every list shows `name || description` (`PBE:113-119`).
- **Item ID / SKU** — `item_id`, `PB-NNN`, generated server-side, read-only in the editor (quote-editor B-66).
- **Sell Price / Unit Cost / Markup %** — `unit_price`, `cost_price`, `markup_percent` (dollars, dollars per unit, percent). Markup is markup-of-cost; the editor's green/amber/red chip is *margin*-of-sell (A-21; quote-editor B-07).
- **Cost type** — `cost_type`: *Combined* (default) · *Material* · *Labor* · *Subcontractor* (`PBE:57-62`); free text at the database (no CHECK constraint, `supabase/migrations/20260416000001_price_book_v3.sql:36-38`).
- **Waste factor** — `waste_percent`, applied to quantity on a quote (quote-editor B-05).
- **Vendors** — `vendor_ids[]` (ordered; the first is the *primary*, the PO pre-fill vendor) mirrored into `vendor_id` (quote-editor B-67).
- **Tier** — a `price_book_pricing_tiers` row: quantity bracket with its own sell and cost (quote-editor B-93).
- **Active / Archived** — `is_active`; archiving hides an item from quotes; the list has an *Active* / *Archived* view (A-08).
- **Approval status** — `approval_status` ∈ `approved` (column default) · `pending` · `rejected` (`scripts/migrations/114_price_book_approval.sql:11-12`). Pending rows stay usable in quotes; rejected rows are archived (A-27…A-35).
- **Trusted / editor** — see Conventions. The two are different gates: `pricebook.edit` lets a member write at all; the literal tag decides whether the write lands approved or pending (A-04, A-27).
- **Market rate / benchmark** — a global `platform_market_rates` row per country (`rate_min`, `rate_typical`, `rate_max`); **drift** = an active item's sell price more than 15 % below `rate_min` or above `rate_max` (A-36).
- **Suggestion** — a `price_book_suggestions` row: a quote line the matcher could not link, offered for promotion into the book (A-50; quote-editor B-84).
- **Price book approvers** — `studios.settings.workflow.approvers.priceBookApproval[]`, set on Accounts › Workflow › *Workflow Rules* (A-34).

---

## Ways in

### A-01 · Accounts › Quotes & Pricing › *Price Book*
- **Where:** `ACC:93-107` (menu), `ACC:1143-1146` (mount), `ACC:218-251` (initial tab, `setActiveTab` → `history.replaceState`), `ACC:612-615` (page header); `src/components/layout/topbar.tsx:493-511` (the only menu route into `/accounts`); accounts A-01…A-04, C-01, C-30.
- **Does:**
  - The sidebar group *Quotes & Pricing* lists *Price Book* sixth (after *Quote Rules*, before *Quote Approval Rules*). Clicking it swaps the right-hand card to `<PriceBookManager>` and rewrites the URL to `/accounts?tab=catalogue` (any other query parameter, including `?pb=`, is dropped).
  - The pane has **no title or description of its own** — unlike most Accounts tabs, which open with an `<h2>` and a sentence (e.g. `ACC:1153-1158`); it starts straight with the read-only banner (if any) and the four tabs (`ACC:1144-1146`). The only heading on screen is the page's *"Accounts Setup"*.
  - Who gets there: the profile menu's *"Accounts Setup"* item is **owner-only** (`topbar.tsx:503`); admins, designers and accounting members reach `/accounts` only by a typed URL or an in-app link (A-02); the route guard admits all four tags (accounts A-02). The desktop rail, the phone bottom nav, the Tools grid and global search have no price-book entry (grep of `src/components/layout/*`).
  - Inside Accounts, the sidebar's *"Search settings..."* box finds it by label (typing *price*) (accounts A-03).
  - A studio with the `accounts` platform page switched off sees *"Coming Soon"* instead (accounts A-02).
- **Data:** —
- **Words:** menu *"Quotes & Pricing"* › *"Price Book"*; page *"Accounts Setup"* · *"Configure your studio's lead pipeline, AI rules, and workspace settings."*; profile menu *"Accounts Setup"*.

### A-02 · Deep links and pointers from elsewhere
- **Where:** `TASKS:503-515`; `src/app/api/cron/price-drift/route.ts:106-121`; `src/app/api/price-book/notify-pending/route.ts:79-94`; `src/app/api/price-book/[id]/approve/route.ts:97-111`; `src/app/api/price-book/[id]/reject/route.ts:101-116`; `src/app/api/price-book/suggestions/bulk/route.ts:258-273`; `QDD:10268-10288`; `src/components/projects/financial-summary-card.tsx:94-147, 483`; `src/components/leads/quote-margin-panel.tsx:60-83, 236-270`; `PBM:498-518`; `src/components/layout/notification-drawer.tsx:105-110`.
- **Does:** every link that points at the price book, and where it really lands:
  - Tasks inbox, a pending *Price Book Item* approval → *"Open in Price Book"* → `/accounts?tab=catalogue&pb=pending` (the Pending tab). Correct.
  - Monthly drift notification → `/accounts?tab=catalogue&pb=drift` (the Drift tab). Correct.
  - *Pending approval* notification (from an add, an edit or a promoted suggestion) → `/tasks`, **not** the Pending tab — although `PBM:1066-1071` says the Pending tab is "deep-linkable from the price_book.item_pending_approval notification".
  - *Approved* / *Rejected* notifications to the submitter → `/accounts`, which opens on **Team Members** (the default tab, `ACC:224`), not the price book and not the Archived view the rejection email points to.
  - The quote editor's toast after the suggestions modal is closed with suggestions left: *"… view in Accounts → Price Book"* — text only, no link; a designer has no menu route there (A-01).
  - Project › finance card › *Expected Profit* tile, when the approved quote has lines without cost: *"Open Price Book"* → `router.push("/finance/price-book")` — **a route that does not exist** (no `src/app/(main)/finance/price-book`, no redirect in `next.config.ts` or `src/proxy.ts`), so it lands on the not-found page. With no quote lines the same button reads *"Upload quote"* and goes to `/finance/operations`.
  - The quote editor's *Margin analysis* panel names the place in text only: *"Set up your Price Book at Accounts → Quotes & Pricing"*, and *"cost not found in your price book"* for uncosted lines.
  - *"Manage →"* on the Items stats line goes the other way: it opens `/accounts?tab=quote-categories` in a **new browser tab** (editors only, A-07).
  - A link followed while the Accounts page is already mounted does not switch panes: the Accounts tab and the price-book sub-tab are read once, into state, when the page mounts (`ACC:224-241` `useState(initialTab)`, no effect on `searchParams`; `TABS:97-105` via `useState(() => readInitialPriceBookTab("items"))` at `PBM:90`) — inferred from the code, not run.
- **Data:** `notifications.action_url`; `tasks`.
- **Words:** *"Open in Price Book"*; toast *"1 suggestion left for your price book — view in Accounts → Price Book"* / *"{n} suggestions left for your price book — view in Accounts → Price Book"*; project tile *"Expected Profit"*, *"— needs cost data"* / *"— no quote yet"*, *"Open Price Book"* / *"Upload quote"*, tooltip *"Where does cost data come from? The Price Book stores your vendor and labour costs per item. When a quote line is linked to a Price Book item, its cost auto-fills. Manually-added lines with no Price Book reference have no cost on file and won't contribute to expected profit until you fill the cost in."*; margin panel *"Add cost prices to your line items to see your margin."*, *"How to set this up"*, *"Set up your Price Book at Accounts → Quotes & Pricing"*, *"{n} item{s} — cost not found in your price book; margin excludes them"*, tooltip *"Cost not found in your price book"*.

### A-03 · The *Price Book* modal inside the quote (and variation-order) editor
- **Where:** `PBMOD:1-47`; `QDD:1128` (`canEditPriceBook`), `QDD:6684-6695` (header icon), `QDD:10247-10253` (mount); VO host `src/components/finance/vo-editor/vo-editor-host.tsx:1-24`; quote-editor B-78.
- **Does:**
  - A book icon in the editor header opens the **same** `PriceBookManager` in a 96 vw × 90 vh dialog, all four tabs included. Shown only when the member passes `pricebook.edit`, only once the editor is past its entry chooser (`editorActive`), and **hidden below the `md` breakpoint** (`hidden md:inline-flex`), so there is no way into it on a phone. The VO editor is the same component in variation mode, so a VO carries the same icon.
  - Edits change the book, not the quote's existing lines (they hold copied figures, quote-editor A-61); new picks see the change through the shared `["price-book", studioId]` cache. The dialog's description promises more than that.
  - Side effect: switching sub-tabs inside the modal writes `?pb=` into the **lead page's** URL (`TABS:111-116` rewrites `window.location`), and opening the modal on a URL that happens to carry `?pb=` opens that sub-tab.
- **Data:** as A-06.
- **Words:** icon title *"Open price book"*; dialog *"Price Book"* · *"Edit prices, categories, and vendor mappings. Changes apply to this quote immediately."*

### A-04 · Who may view and edit, and what each gate actually covers
- **Where:** `PBM:57-61`; `AC:205-216, 250-296, 344-345`; `src/app/api/studio-config/role-permissions/route.ts:16-56`; `PBR:156-166`; `PBRID:68-78`; `src/app/api/price-book/[id]/route.ts:42-55`; `.../approve/route.ts:29-39`; `.../reject/route.ts:39-48`; accounts A-43, A-45, A-46, A-51…A-53.
- **Does:**
  - `pricebook.edit` is resolved from the `studio_roles` row whose slug is the member's first tag in `owner → admin → accounting → id` order; a missing key falls back to the tag rules (owner and admin yes, accounting and designer no), an explicit `false` denies. **Member overrides are not applied** here, in the browser or on the server (accounts A-52). `pricebook.view` is read by nothing: every member who reaches `/accounts` sees the whole book, costs included.
  - In most studios the rows that decide it are the locked system roles (accounts A-45), so in practice: **owners and admins edit; designers and accounting members are read-only.** A designer or accounting member can be an editor only where the studio's role rows are editable (editor-seeded studios, accounts A-43) or were changed in the database — then their writes land *pending* (A-27).
  - What the read-only view hides: the *Import CSV* and *Vendor markup config* icons, *Add Item*, the toolbar's *Seed from {cc}*, *Manage →*, the kebab's *Archive / Restore* and *Delete permanently*, the Imports tab's *Import items* card.
  - What it **does not** hide (each then fails, or not, on the server): the row click and *Edit item* (the editor opens fully editable; Save answers 403 → *"Failed to save item"*); *View history*; the row checkboxes and the whole bulk bar — *Archive*, *Restore*, *Move to category…* (per-item 403s); **drag-reorder, which the server does not check at all** and which re-files items across categories (A-15); the empty-state *"Seed {n} items from {cc} market rates"* button (`PBM:676-680`, no `canEditPriceBook`; POST answers 403); *Export CSV*; *"Review {n} new items"* and its modal, **which writes to the book without any edit check** (A-50); the Pending tab's *Approve* / *Reject* (server: owner/admin tag); the Drift tab's *Suggest* (opens the editor; Save 403s); tier saves and vendor markup are ungated on the server but only reachable through gated UI.
  - Server gates by action: add / edit → `pricebook.edit`; delete, approve, reject → the literal owner/admin tag; reorder, vendor markup, tiers, image upload, export, AI parse, suggestion add / dismiss → session only.
- **Data:** `studio_roles.permissions.actions.pricebook.{view,edit}`, `studio_members.tags`.
- **Words:** banner *"Read-only — only owners/admins can edit the price book."* (`PBM:466-470`, `role="alert"`, shown above the tab strip on every tab); server 403 *"You don't have permission to edit the price book."*

### A-05 · The workspace shell: four tabs, badges, `?pb=`
- **Where:** `TABS:18-116`; `PBM:88-96, 460-477`; `PBQ:29-69`.
- **Does:**
  - Tabs *Items* · *Pending* · *Drift* · *Imports* (`role="tablist"`). *Pending* and *Drift* carry a count badge, hidden at 0 (an `alwaysShowBadge` option exists, unused).
  - The active tab is mirrored into `?pb=` with `history.replaceState` (so Back leaves the page), read once on mount; an unknown value falls back to *Items*.
  - Pending badge = rows with `approval_status = 'pending'`, **archived ones included** (same set the Pending tab lists). Drift badge = active items with a price whose **`description`** matches a benchmark — the Items list and the Drift tab match on `name || description`, so the badge can disagree with both (A-36).
  - Nothing else on the page is tab-aware: the item editor, history drawer and dialogs are shared across tabs; a row selection made on *Items* survives a trip to another tab (A-14).
- **Data:** reads the cached book (`["price-book", studioId]`) and market rates; no extra fetch.
- **Words:** *"Items"*, *"Pending"*, *"Drift"*, *"Imports"*; aria *"Price Book sections"*.

---

## Items tab — the list

### A-06 · What the list loads
- **Where:** `PBM:54-96`; `SCQ:224-234` (`usePriceBook`, 30 s stale), `SCQ:157-167` (categories), `SCQ:404-417` (market rates, 5 min stale); `PBR:54-136`; `PBS:117-135` (all pending suggestions).
- **Does:**
  - One GET returns **every** row of the studio — active, archived, pending and rejected — paged server-side in 1,000-row chunks, ordered `order_index ASC NULLS LAST, created_at DESC`, with the category name, the creator's name, vendor names (by 200-id chunks) and tiers (sorted by min qty) joined. There is no client pagination or virtualisation: every visible row is rendered (only the >200-item auto-collapse, A-09, limits first paint).
  - Also loaded: the active Quote Categories, the country's market rates (`country` = the session's studio country, `SG` when unset), the current member's role permissions, vendors, and all *pending* suggestions of the studio.
  - **A failed load looks like an empty book**: the manager reads only `data` and `isLoading` (`PBM:55`), so an error renders *"No items in your price book yet"* and — for an editor, when benchmarks exist — the *Seed* buttons, which would add the whole benchmark list on top of the real (unloaded) book.
- **Data:** `studio_price_book` (+ `studio_quote_categories(name)`, `profiles.full_name` via `created_by`, `vendors.name`, `price_book_pricing_tiers`), `platform_market_rates`, `price_book_suggestions`.
- **Words:** loading = a spinner only.

### A-07 · Stats line and drift pill
- **Where:** `PBM:486-540`.
- **Does:** above the toolbar: *"{n} active"* (active rows, pending included) · *"{n} archived"* (only when > 0) · *"{n} categories"* (the studio's **active Quote Categories**, not the categories items use — `PBM:385-396`) · *"Manage →"* (editors only; new browser tab to Quote Categories) · *"{n} {cc} benchmarks"* (market-rate rows for the country, when any) · on the right a drift pill *"{n} priced outside market range"* (when any item drifts) that toggles a drift-only filter and shows an × while on.
- **Data:** —
- **Words:** *"{n} active"*, *"{n} archived"*, *"{n} categories"*, *"Manage →"* (title *"Open category management in the Quote Categories tab (new tab)"*), *"{n} {cc} benchmarks"*, *"{n} priced outside market range"* (title *"Show only items priced outside market range"* / *"Show all items"*).

### A-08 · Toolbar: search, category, Active / Archived, actions
- **Where:** `PBM:229-244` (filter), `PBM:543-642` (toolbar), `PBM:646-653` (drift summary card).
- **Does:**
  - **Search** — case-insensitive substring over `name`, `description` and the category name only: not the SKU (although the SKU is printed on the row), vendor, tags, notes or subcategory.
  - **Category** — a searchable select of *"All Categories"* plus the active Quote Categories A–Z; matches the item's category **name**. Items filed under an inactive (renamed or deleted) category keep grouping under the old name but cannot be picked here (reachable only through search).
  - **Active / Archived** — one button whose label is the view being shown (*"Active"* → click → *"Archived"*); the two views are exclusive. Archived shows every inactive row, so rejected items live there too.
  - Right-hand cluster: icon buttons *Import CSV* (editors), *Export CSV* (everyone), *Vendor markup config* (editors); *"Review {n} new item{s}"* when the studio has pending suggestions (everyone); *"Add Item"* (editors); *"Seed from {cc}"* (editors, only while the book has **no rows at all**, archived included, and benchmarks exist).
  - Under the toolbar, when benchmarks and items exist, the collapsible drift summary card (A-37).
  - Nothing is remembered: search, category, view, sort and collapse reset when the pane is left.
- **Data:** client-side over the loaded rows.
- **Words:** placeholder *"Search items..."*; *"All Categories"*; *"Active"* / *"Archived"* (title *"Show archived items"* / *"Show active items"*); titles *"Import CSV"*, *"Export CSV"*, *"Vendor markup config"*; *"Review {n} new item{s}"* (title *"Review items detected from quotes that aren't in your price book yet"*); *"Add Item"*; *"Seed from {cc}"*.

### A-09 · Grouping and category headers
- **Where:** `PBM:176-203` (collapse), `PBM:280-297` (grouping), `PBM:742-769` (header row).
- **Does:**
  - Rows are grouped by category **name**, groups sorted A–Z (`localeCompare`), so *"Uncategorised"* (items with no category) sorts alphabetically among the others. The studio's own category order (Quote Categories) is ignored (accounts C-09).
  - With no search, no category filter, no drift filter and the Active view, every active Quote Category is pre-seeded so empty categories show as empty headers; any filter (or the Archived view) drops empty headers.
  - Header: chevron, the name in capitals, the group's row count, and *"avg {cs}{x}"* = mean sell price of the group's **visible** rows, rows without a price counted as 0.
  - Click toggles collapse. On the first load with rows, every category with more than 200 rows starts collapsed ("El Arte @ 6.3k+ items"); a search, category or drift filter overrides collapse, the Archived toggle and sorting do not.
- **Data:** —
- **Words:** *"avg {cs}{x}"*; *"Uncategorised"*.

### A-10 · A row: columns and content
- **Where:** `PBM:688-740` (header), `PBM:771-951` (row), `CHIP:35-63`.
- **Does:** columns — select box · drag grip · *#* · *Description* · *Unit* · *Vendor* · *Cost* · *Markup* · *Notes* · *Sell Price* · kebab.
  - *Description* cell (a button that opens the editor, A-19): an image thumbnail when set; the name, then *"· {SKU}"*, then a *Pending* or *Rejected* chip (this line exists only when the item has a name — a nameless row shows just the chip, never its SKU); the description with *"Spec ↗"* (opens the spec link in a new tab without opening the editor); a meta line with the cost type when not *combined* (raw value — an imported *"Labour"* prints as is), *"+{w}% waste"* when > 0, and *"· {creator}"*.
  - *Unit* (`—` when empty); *Vendor* = first vendor name plus *"+{n}"*, all names in the title; *Cost* (`—` when null); *Markup* = the **stored** `markup_percent` + `%` — not derived from sell and cost, so it can disagree with them (A-21, A-48) — green ≥ 20, amber ≥ 10, else grey; *Notes* truncated to 180 px; *Sell Price* with the drift chip before it (A-37).
  - Not shown anywhere in the list: subcategory, tags, tiers, `source`, who / when approved, `updated_at`.
  - Money formatting uses the country's locale with two decimals; the currency symbol is only on the group average.
- **Data:** the row fields above.
- **Words:** headers *"#"*, *"Description"*, *"Unit"*, *"Vendor"*, *"Cost"*, *"Markup"*, *"Notes"*, *"Sell Price"*; chips *"Pending"* (title *"Pending approval by an admin or owner"*), *"Rejected"* (title *"Rejected — restore via the Archived view"*); *"Spec ↗"* (title *"Open spec sheet"*); *"+{w}% waste"*; *"· {creator}"* (title *"Added by {creator}"*); *"+{n}"*; *"—"*.

### A-11 · Row numbers
- **Where:** `PBM:299-310, 779, 811-813`.
- **Does:** *#* is the row's position in the filtered, sorted **flat** list, which follows the stored order (`order_index`, then newest first) — while the table displays rows **grouped by category A–Z**. Unless the stored order already runs category by category in A–Z order, the numbers down the screen are not consecutive (the first visible row can read #57). The in-code comment claims the serial "should always start at 1 for the first visible row".
- **Data:** —
- **Words:** *"#"*.

### A-12 · Sorting
- **Where:** `PBM:142-166, 246-278`.
- **Does:** *Description* (by `name || description`, case-folded), *Cost*, *Markup*, *Sell Price* headers cycle ascending → descending → off; blanks sort as 0. The sort runs on each **contiguous run** of same-category rows in the stored order, then rows are grouped; when a category's rows are not contiguous in the stored order (after drags across categories or imports), a group shows two or more separately sorted runs. Sorting never expands a collapsed group and is not saved. Drag stays live while sorted and drops against the stored order, not the sorted view (A-15).
- **Data:** —
- **Words:** titles *"Sort by description"*, *"Sort by cost"*, *"Sort by markup"*, *"Sort by sell price"*.

### A-13 · Empty and loading states
- **Where:** `PBM:660-686`.
- **Does:** one message by precedence — Archived view: *"No archived items"*; drift filter on: *"No items priced outside market range with the current filter"*; search or category set: *"No items match the current filter"*; else *"No items in your price book yet"*. Under it: *"Seed {n} items from {cc} market rates"* when the book has no rows and benchmarks exist (**shown to read-only members too**), and *"Clear filters"* (clears search, category and the drift filter — not the Archived view) when a filter is on. An empty book without benchmarks offers nothing but the toolbar's *Add Item* (editors).
- **Data:** —
- **Words:** as quoted.

### A-14 · Selection and the bulk bar
- **Where:** `PBM:167-175, 312-383, 690-700, 792-800, 1030-1062`; `PBRID:80-101, 160-183`.
- **Does:**
  - A checkbox per row and a header box that selects or clears **all visible** rows (indeterminate when some are selected) — "visible" meaning every row passing the filters, **including rows folded inside collapsed categories**, so *Select all* then *Archive* can archive rows nobody saw (large categories start collapsed, A-09). Selection is kept in the manager and is **not cleared** when the search, category, drift filter, Active/Archived view or tab changes, so the bar's count and its actions include rows no longer on screen. Available to every member (A-04).
  - The bar slides up at the bottom while anything is selected: *"{n} selected"*, *"Clear"*, then *Archive* (Active view) or *Restore* (Archived view), and *"Move to category…"* (the active Quote Categories A–Z; no *Uncategorised* choice).
  - *Archive* asks a native `window.confirm`; *Restore* does not. Each id is PATCHed on its own (`is_active`) with `Promise.allSettled`; the bar reports failures as a count and always clears the selection. Restore sent to a row that is already active writes an empty *Updated* history row (the server diff finds nothing, but still inserts).
  - *Move to category…* PATCHes `category_id` per item with `Promise.all`: one failure toasts *"Failed to move items"* while the others may have saved; the selection is cleared only on full success. Each moved item gets a history row. For an untrusted editor a move is a real edit: every moved **approved** item flips to *pending* with its own re-approval task and notification (A-27).
- **Data:** `studio_price_book.is_active` / `category_id`; `price_book_history`; `tasks`.
- **Words:** *"{n} selected"*, *"Clear"*, *"Archive"*, *"Restore"*, *"Move to category…"*; confirm *"Archive {n} item{s}? Archived items are hidden from quotes but kept in history."*; toasts *"Archived {n} item{s}"* / *"Restored {n} item{s}"*, *"{f} of {n} archive operations failed"* / *"{f} of {n} restore operations failed"*, *"Moved {n} item{s} to {category}"*, *"Category "{x}" not found"*, *"Failed to move items"*; header title *"Select all visible"*.

### A-15 · Drag to reorder (and to re-file)
- **Where:** `PBM:97-141, 783-809`; `SCQ:257-271`; `src/app/api/studio-config/price-book/reorder/route.ts:13-43`; accounts C-30; quote-editor B-64.
- **Does:**
  - Every row is an HTML5 `draggable` (the grip is decoration, at 30 % opacity until hover); dropping row A on row B places A **immediately before B in the stored order of the whole book** (archived rows included) and rewrites `order_index = 0…n` for **every row** — one UPDATE per row in a single request. A top border marks the drop target; there is no optimistic move (the list redraws after the refetch).
  - Dropping on a row of another category also sets A's `category_id` to B's (including *none* when B is uncategorised — the only way in the UI to take an item out of every category, since neither the editor's category picker nor *Move to category…* can clear it, A-20).
  - The route checks only the session: a read-only member's drop saves the new order **and** the re-filing. No history row, no approval flip, no permission error. Allowed while searching, sorted, in the Archived view or collapsed; the stored order it rewrites is not the one on screen when sorted.
  - Only the Items list reads `order_index`; quotes, Browse and the typeahead ignore it.
  - Touch: HTML5 drag events do not fire on touch screens and there is no touch handler, so phones and tablets cannot reorder (inferred; no touch code in `PBM`).
- **Data:** `studio_price_book.order_index`, `category_id`.
- **Words:** toast *"Could not save new order"*.

### A-16 · The row kebab
- **Where:** `PBM:952-1017`.
- **Does:** always visible (a Phase 2 change so touch users can reach actions). Items: *"Edit item"* and *"View history"* for everyone; *"Archive"* / *"Restore"* and, under a divider, *"Delete permanently"* for editors. No *Duplicate* (there is no duplicate action anywhere; the closest thing is saving a picked quote line as a new variant, A-53), no *Move*, no approval actions.
- **Data:** —
- **Words:** aria / title *"More actions"*; *"Edit item"*, *"View history"*, *"Archive"*, *"Restore"*, *"Delete permanently"*.

### A-17 · Archive and restore one item
- **Where:** `PBM:434-456`; `PBRID:80-88, 160-183`.
- **Does:**
  - *Archive* asks a native confirm, then PATCHes `is_active = false` with the previous price / cost / markup / active values; *Restore* PATCHes `true` without asking. History: *Archived* / *Restored*.
  - An `is_active`-only change never touches approval: an untrusted editor archives and restores approved items with no review; a *pending* item archived stays pending (and on the Pending tab); a *rejected* item restored becomes active **still marked Rejected** — usable in quotes, with the *Rejected* chip on the list and *"Library item rejected"* on every quote line linked to it (A-35).
  - Archived items leave every quote picker (typeahead, Browse, auto-match; they filter on `is_active`), but not the Quote Rules picker (A-55).
- **Data:** `studio_price_book.is_active`, `updated_at`; `price_book_history`.
- **Words:** confirm *"Archive "{x}"? It will be hidden from new quotes but kept in history."* (`{x}` = name, else description); toasts *"Item archived"*, *"Item restored"*, *"Failed to update item"*.

### A-18 · Delete permanently
- **Where:** `PBM:73, 1003-1015, 1268-1291`; `SCQ:312-328`; `src/app/api/price-book/[id]/route.ts:28-90`; quote-editor B-63.
- **Does:**
  - Editors see the item; the dialog is a destructive confirm naming the item. The server then requires the literal owner or admin **tag** (an editor by role only gets the 403, whose text the toast shows), looks the item up in the studio (404 otherwise) and deletes the row; history and tiers cascade.
  - Quote lines keep their copied figures and a dangling `price_book_item_id` (their approval chip disappears); suggestions keep a dangling `added_to_price_book_id`; package items keep their own snapshot (templates C-31).
  - **Open approval tasks for the item are left open**: approving one from the Tasks inbox afterwards answers 404 *"Item not found"*.
  - No undo, no trash, no record of who deleted what.
- **Data:** `studio_price_book` (delete) → `price_book_history`, `price_book_pricing_tiers` (cascade).
- **Words:** title *"Delete this price book item?"*; body *"“{x}” will be permanently removed, along with its history and pricing tiers. Existing quotes that referenced it keep their cached price (the link just disappears). This can't be undone — use Archive if you might want it back."*; button *"Delete permanently"*; toasts *"Deleted “{x}”"*, server *"Only admins or owners can delete price book items. Use Archive instead."*, *"Item not found"*, fallback *"Failed to delete"*.

---

## The item editor (price-book mode)

### A-19 · Opening, closing, header
- **Where:** `PBE:66-140, 667-698`; `PBM:427-432, 815-818, 968-975, 1234-1251`.
- **Does:**
  - One side panel (right, `max-w-lg`, full width on a phone) serves *Add Item* (no item), a row click / *Edit item* (the row), the Pending tab's *Open in editor* and the Drift tab's *Suggest* (a copy of the row with a new sell price, A-38). The same component in `mode="quote-line-item"` is the quote editor's line panel (quote-editor A-67); this slice covers price-book mode.
  - It opens for **every member**; there is no read-only mode (A-04).
  - Closing: × , *Cancel* or a click on the dimmed backdrop — all discard edits **without asking**; there is no Escape handler and no unsaved-changes guard.
  - Header: *"Add Price Book Item"* / *"Edit Price Book Item"*; subtitle = the name being typed, else the saved name, else *"New item"*; *"Added by {creator}"* when known.
- **Data:** —
- **Words:** *"Add Price Book Item"*, *"Edit Price Book Item"*, *"New item"*, *"Added by {name}"*.

### A-20 · Name, SKU, description, category, subcategory
- **Where:** `PBE:46-53, 170-220, 336-341, 426-461, 700-872`; `src/components/ui/searchable-select.tsx:1-60, 170-215`; accounts C-08.
- **Does:**
  - *Item Name* — plain input, the only required field (Save disabled while blank; toast if forced). Trimmed on save; stored as `name`.
  - *Item ID / SKU* — read-only, disabled, shows the stored SKU or *"Auto-generated on save"*; the server assigns `PB-NNN` (quote-editor B-66). No way to type one's own SKU in this panel (the suggestions modal can, A-50).
  - *Description (optional, specs)* — a plain two-row textarea (the quote-line panel's is rich text); stored as typed, `""` when empty.
  - *Category* — a searchable picker of the studio's active Quote Categories plus any of 19 built-in names the studio lacks, marked *"Will be created on save"*; on save a built-in name is resolved through `POST /api/quotes/categories/resolve`, which creates or revives that Quote Category (accounts C-08). If the resolve fails, the item is saved **uncategorised with no message** (`PBE:457-460`). The picker has no clear option (`SearchableSelect` never emits `""`), so once set a category can only be changed, not removed (A-15 is the only way out). An item filed under an inactive category opens with an empty-looking picker (its id matches no option) and keeps that category if left alone.
  - *Subcategory (optional)* — free text, `null` when empty; shown and searched by Browse, carried to quotes per the studio flag (quote-editor B-88).
- **Data:** `name`, `item_id`, `description`, `category_id`, `subcategory`; `studio_quote_categories` (resolve).
- **Words:** *"Item Name *"*, placeholder *"e.g., Supply & install kitchen carpentry"*; *"Item ID / SKU"*, *"Auto-generated on save"* (title *"Auto-generated sequentially per studio (PB-001, PB-002, …)"*); *"Description (optional, specs)"*, placeholder *"Optional specs (e.g., 25mm quartz countertop, matte finish)"*, helper *"Renders smaller + indented below the item name on PDFs and client surfaces."*; *"Category"*, *"Select category..."*, *"{name} — Will be created on save"*; *"Subcategory (optional)"*, placeholder *"e.g., Kitchen, Master Bedroom — leave empty for none"*; toast *"Item name is required"*, Save title *"Item name is required"*.

### A-21 · The pricing block
- **Where:** `PBE:202-204, 346-392, 874-933`; `src/lib/quote-cost-margin.ts:81-84`; quote-editor B-07, B-96.
- **Does:**
  - Three number inputs in one row (also on a phone): *Sell Price ({cs})*, *Unit Cost ({cs})*, *Markup %*. Cost anchors, markup dials, sell follows: editing Sell or Cost re-derives Markup (`(sell − cost) / cost`, 1 dp) only when cost > 0; editing Markup sets Sell = `cost × (1 + markup / 100)` (2 dp), markup clamped to −100…10,000.
  - **Typing a markup on an item without a cost sets the sell price to 0** (`costPrice >= 0` → `0 × …`), which then saves as *no price* — the yellow hint *"Enter a sell price — cost and markup are derived from it."* appears only afterwards. With cost 0, editing Sell leaves a stale Markup in place.
  - A chip under the inputs shows margin-of-sell, `(sell − cost) / sell`, green ≥ 20 %, amber ≥ 10 %, red below, with the per-unit profit.
  - Zeros are dropped on save: a 0 sell, 0 cost or 0 markup is stored as `NULL` (add: `|| undefined`, edit: `|| null`), so the panel cannot record a real zero cost, while CSV imports store 0 (A-44). The input shows blank for 0.
  - The tooltips describe the retired "sell holds" model and contradict the behaviour (quote-editor B-96). The row's *Markup* column shows the stored value, so any writer that stores a markup without re-pricing (vendor markup, seed, *Suggest*) shows a number the sell and cost don't imply (A-38, A-40, A-48).
  - A markup of 1,000 % or more passes the clamp but not the `NUMERIC(5,2)` column — the save fails as *"Failed to save item"* (inferred from the migration; quote-editor Uncertain).
- **Data:** `unit_price`, `cost_price`, `markup_percent`.
- **Words:** *"Pricing"* · *"Cost and markup follow each other"*; *"Sell Price ({cs})"* (title *"The client-facing price. Editing cost or markup never changes it."*), *"Unit Cost ({cs})"* (title *"Editing cost re-derives Markup. Sell price holds."*), *"Markup %"* (title *"Editing markup re-derives Unit Cost. Sell price holds."*); *"Margin: {m}% ({cs}{x} per unit)"*; *"Enter a sell price — cost and markup are derived from it."*

### A-22 · Unit, cost type, waste factor
- **Where:** `PBE:935-983`.
- **Does:** *Unit* — free text, *"lot"* when the item has none (`PBE:205`), so a unit-less item opens reading *lot* and **saves *lot*** on any edit (the quote grid's unit list is built from these values, A-54); *Cost Type* — *Combined* / *Material* / *Labor* / *Subcontractor*, *Combined* when none (an imported non-matching value such as *"Labour"* shows as a blank select and is re-sent as is unless changed); *Waste Factor (%)* — number with `min 0 · max 50 · step 0.5` as HTML hints only (not enforced), a line under it previewing the multiplier.
- **Data:** `unit`, `cost_type`, `waste_percent`.
- **Words:** *"Unit"* (placeholder *"sqft, ft, lot, pc..."*), *"Cost Type"*, *"Combined"*, *"Material"*, *"Labor"*, *"Subcontractor"*, *"Waste Factor (%)"* (tooltip *"Adds a buffer to ordered quantities to account for cuts, breakages, and overage. e.g., 10% waste on 100 sqft = 110 sqft ordered."*), *"Effective qty = qty x {f} in quotes"* / *"No waste factor applied"*.

### A-23 · Vendors on an item
- **Where:** `PBE:223-236, 985-1080`; `src/components/finance/vendor-picker.tsx:149-173, 216-228`; `src/lib/vendors/dedupe.ts:14-42`; quote-editor B-67.
- **Does:**
  - *Vendor / Supplier* — the shared vendor picker over active vendors of any kind (name + trade), a bottom sheet below `lg`; it can create a vendor inline (kind *supplier*) when the member holds `vendors.create`, de-duplicating by normalised name. An × clears it.
  - Extra vendors: chips under the picker (× to remove, unknown ids shown as the first 8 characters) and a *"+ Add another vendor"* select of **active** vendors not already chosen.
  - Saved as `vendor_ids = [primary, …extras]` (de-duplicated, order kept) and `vendor_id = vendor_ids[0]`. Clearing the primary while extras remain promotes the first extra on save. Order matters: the first vendor is the PO pre-fill vendor and the one *Vendor markup* matches (A-48).
  - Vendors carry no per-vendor price or cost on the item: variants priced by vendor are separate items with the same name (the typeahead groups them, quote-editor B-76).
- **Data:** `vendor_id`, `vendor_ids`; `vendors` (read, create).
- **Words:** *"Vendor / Supplier"*, placeholder *"No vendor linked"*, *"Clear vendor"*, aria *"Remove {vendor}"*, *"+ Add another vendor"*, *"— pick to add —"*, option *"{name} ({trade})"*.

### A-24 · Volume pricing tiers
- **Where:** `PBE:241-243, 535-540, 1239-1306`; `SCQ:349-363`; `src/app/api/studio-config/pricing-tiers/route.ts:15-52`; quote-editor B-93, B-94.
- **Does:**
  - A small table: *Min Qty*, *Max Qty* (blank = no limit), *Sell*, *Cost*, bin per row; *"Add Tier"* appends a row starting at the previous max (else previous min + 10, else 0), priced at the current sell and cost.
  - No validation of order, gaps or overlaps; no preview of which tier a quantity hits.
  - **Tiers typed while adding a new item are shown but never saved** — only an edit saves them, after the item PATCH, as delete-all-then-insert; a failure is only logged (the toast still says *"Item saved"*). The tier route has no permission check.
  - Tiers are read only by the quote grid when a linked line's quantity changes (quote-editor B-94); not by the typeahead, Browse, packages or exports.
- **Data:** `price_book_pricing_tiers (min_qty, max_qty, unit_price, cost_price)`.
- **Words:** *"Volume Pricing Tiers"*, *"Add Tier"*, *"No tiers — base price applies to all quantities"*, *"Min Qty"*, *"Max Qty"*, *"No limit"*, *"Sell ({cs})"*, *"Cost ({cs})"*.

### A-25 · Spec link, tags, notes, image
- **Where:** `PBE:237-240, 254-269, 394-422, 1308-1395`; `src/app/api/price-book/upload-image/route.ts:10-88`.
- **Does:**
  - *Spec Sheet / Product Link* — validated on blur (must parse as a URL with `http:` or `https:`); an error blocks Save; a valid link gets an *Open link* button.
  - *Tags* — one comma-separated text box, split and trimmed on save. Stored and exported, **read nowhere else**: not shown on the list, not searchable, not used by any picker (grep).
  - *Notes* — internal free text; shown truncated in the list's *Notes* column (≥ `xl` only), copied onto a quote line by the typeahead (not by Browse).
  - *Item Image* — upload only when editing a saved item (*"Save the item first to upload an image."* on add). The file goes straight to the public `price-book-images` bucket and the route **writes `image_url` on the item immediately** — Cancel does not undo it, no history row, no approval flip, session-only check. Server limits: ≤ 5 MB, JPEG / PNG / WebP / GIF (the picker accepts any `image/*`); every failure shows the generic *"Failed to upload image"*. Removing the image (bin on the thumbnail) only clears the form and is saved with *Save Changes*; the stored file is never deleted.
- **Data:** `spec_url`, `tags`, `notes`, `image_url`; storage `price-book-images/{studioId}/{itemId}-{ts}.{ext}`.
- **Words:** *"Spec Sheet / Product Link"*, placeholder *"https://..."*, title *"Open link"*, errors *"URL must start with http:// or https://"*, *"Enter a valid URL (e.g. https://example.com/spec.pdf)"*, Save title *"Fix the spec URL before saving"*; *"Tags"*, placeholder *"kitchen, premium, imported..."*, *"Comma-separated"*; *"Notes"*, placeholder *"Internal notes about this item..."*; *"Item Image"*, *"Upload"* / *"Change"*, *"JPEG, PNG, WebP. Max 5MB."*; toasts *"Image uploaded"*, *"Failed to upload image"*.

### A-26 · Saving an item
- **Where:** `PBE:428-547, 1398-1449`; `SCQ:236-250, 275-303`; `PBR:145-285`; `PBRID:52-201`; quote-editor B-60, B-61, B-65, B-66, B-70, B-85.
- **Does:**
  - Save (*"Add Item"* / *"Save Changes"*) is disabled while a save is in flight, the spec link is invalid or the name is blank. On success the panel closes. Those are the only checks: a negative sell, cost or waste, a cost above the sell price (the margin chip just turns red), a waste over 50 %, a duplicate name or a unit left as *lot* all save.
  - **Add** → `POST /api/studio-config/price-book` with one item: description, category, subcategory, sell / cost / markup (zeros dropped), unit, `source "manual"`, tags, cost type, waste, vendors, notes, spec link, name, SKU (blank → generated). No image, no tiers. The server checks `pricebook.edit`, sets approved or pending by the trust rule, assigns `PB-NNN`, raises the approval task and notification for a pending add (A-28) and schedules the description embedding.
  - **Edit** → `PATCH …/{id}` with **every** field (so a notes-only edit re-sends prices, vendors and the description) plus the previous sell / cost / markup / active values; then the tier PUT (A-24). The server checks `pricebook.edit`, runs the approval machine (A-27), writes a history row (A-41), re-embeds the description, and records a crowd price signal when a sell price and description are sent (quote-editor B-70).
  - If the insert or update fails with a message naming a newer column (cost type, waste, vendor, image, spec, subcategory, approval fields) or code 42703, the server retries with the base columns only and reports success: the item is then saved **without** those fields, and an add also without the approval fields, so it lands *approved* by the column default even for an untrusted editor (`PBR:213-220`, `PBRID:108-114`). A foreign-key error on a stale `vendor_id` reads like one of these (its message contains `vendor_id`).
  - Errors are generic: *"Failed to add item"* / *"Failed to save item"* (the 403 text is not shown).
- **Data:** `studio_price_book`, `price_book_pricing_tiers`, `price_book_history`, `tasks`, `notifications`, `crowd_rate_signals`, `studio_price_book.embedding`.
- **Words:** *"Add Item"* / *"Save Changes"*, *"Cancel"*; toasts *"Item added to price book"*, *"Failed to add item"*, *"Item saved"*, *"Failed to save item"*.

---

## Approval (pending → approved / rejected)

### A-27 · Who submits, and which writes wait for approval
- **Where:** `PBR:26-30, 168-174`; `PBRID:80-101`; `src/app/api/price-book/suggestions/bulk/route.ts:65-74, 200-203`; quote-editor B-61; accounts A-43, A-45.
- **Does:**
  - Trust is the literal tag, not the permission: a trusted member's add lands `approved` (`approved_by` / `approved_at` = them); anyone else's lands `pending`. No setting turns the review on or off, exempts a member, or sends an owner's own changes for review; the Workflow card only picks who is told (A-34).
  - Who can produce a pending item in practice: (1) **any member through the suggestions modal**, whose route checks only the session (A-50) — the main source, since it opens by itself after a parse or an AI draft in the quote editor and after a Meeting Co-pilot brief; (2) a designer or accounting member whose role row grants `pricebook.edit` (possible only where role rows are editable, A-04) — through *Add Item*, an import, a seed, *"Also save to price book"* (A-53), any edit, *Suggest* or *Move to category…*.
  - Edits run a state machine (`PBRID:80-101`): an `is_active`-only change never touches approval; a trusted edit of a **pending** item approves it and closes its tasks (A-32); an untrusted edit of an item that is **not** pending (approved or rejected) flips it to `pending` with a *"Re-approve…"* task and notification; an untrusted edit of an already pending item changes nothing else; a trusted edit of an approved or rejected item leaves the status alone.
  - Nothing on screen warns an untrusted editor that Save sends the item for review; the toast is the ordinary *"Item saved"* / *"Item added to price book"*, and the row simply shows *Pending* after the refetch.
  - A pending item is **live**: it stays in the Items list (with its chip), in every quote picker, auto-match and the AI drafter's semantic search, and its price is quotable before anyone approves it; the email to the approver says so (A-28).
- **Data:** `studio_price_book.approval_status · approved_by · approved_at`.
- **Words:** chip *"Pending"*.

### A-28 · What a submission raises: the task and the notification
- **Where:** `PBR:32-46, 227-256`; `PBRID:32-39, 128-148`; `src/app/api/price-book/notify-pending/route.ts:17-101`; `src/app/api/price-book/suggestions/bulk/route.ts:116-148, 230-277`; `src/lib/notifications/events.ts:630-661`; `src/lib/notifications/templates/base/pricing.ts:10-43`; `src/lib/notifications/dispatch.ts:395-470`; `src/lib/notifications/resolve-recipients.ts:365-490`; `src/lib/notifications/preferences.ts:87-104`; `scripts/migrations/112_seed_pricing_preferences.sql:12-26`.
- **Does:**
  - **One task per pending item** (an import of 200 rows by an untrusted editor raises 200): type `PriceBookItemApproval`, status *Not Started*, planned today (server UTC date), `approval_status pending`, `related_entity_id` = the item. Assignee: from an add or an edit, the **first owner, else the first admin** — the configured price-book approver is ignored, the member list is read with no order and **no active filter** (a removed owner can be picked); from a promoted suggestion, the configured approver first, then owner, then admin.
  - **One notification per item**, `price_book.item_pending_approval` (action `created` or `edited`), sent through an internal call that forwards the member's cookie. Fixed recipient = the first configured price-book approver, else the first owner, else the first admin — **merged with every member holding a role listed in the studio's *Pricing* notification preferences** (owner + admin where migration 112 seeded the rows; owners where no row exists). The route comments assume the fixed recipient replaces that fan-out; dispatch never reads the catalogue's `defaultRecipientRoles`. Configured approvers after the first get nothing extra.
  - Link: `/tasks` (A-02). In-app title *"Price Book Item Pending Approval: Price Book: {item}"*, body *"Price Book: {item}"*. The email names the member, the item, the category and says the item is already usable.
  - The notifications' recipient preferences, channels, dedupe window and WhatsApp fallback are hand-off (notifications).
- **Data:** `tasks`, `notifications` (+ email), `studios.settings.workflow.approvers.priceBookApproval`, `notification_preferences (category 'pricing')`.
- **Words:** task titles *"Approve price book item: {item}"* / *"Re-approve price book item: {item}"* (`{item}` = name, else description, else *"price book item"*); email heading *"Price Book Item Pending Approval"*, *"{member} has {added|edited} {item} in the price book and needs your review."*, *"Category: {category}"*, *"The item is already usable in quotes. This is a confirmation so you can review when convenient."*

### A-29 · The Pending tab
- **Where:** `PBM:1066-1087`; `PEND:44-284`.
- **Does:**
  - Heading and one card listing every `pending` item, **archived ones included**: an icon, the name (else description, a button that opens the editor), *"{category} · {submitter} · {date}"* (date as day + short month in the browser's locale), a *"Similar to: {x}"* warning, the sell price (browser-locale grouping) and *"Cost {cs}{x}"* when the cost is above 0. The markup the header comment promises is not shown. For an item sent back for review by an edit, the card still names the item's **creator and creation date**, not who edited it or what changed — there is no before / after on this screen (the history drawer holds it, A-41).
  - *"Similar to"*: the first active, non-pending item whose name-or-description, lower-cased with non-alphanumerics collapsed to spaces, equals the pending one's or is a prefix of it (or vice versa); skipped when the pending label is under 3 characters — but not when the *other* label is short, so an existing item called e.g. *"TV"* matches every pending *"TV …"*.
  - Row actions for **every member** (no permission check on screen): *Reject* opens a small popover that requires a comment (Enter submits; *Confirm reject* disabled while blank); *Approve*; a kebab with *Open in editor*. The row's buttons are disabled while its request runs; errors show the server's message (a designer gets *"Only admins or owners can approve price book items"*). After either action the price book and tasks caches refresh.
  - Empty: *"Nothing to review"*.
- **Data:** reads the cached book; writes through A-30 / A-31.
- **Words:** *"Pending approval"* · *"Items submitted by team members that need your review before they show up in the Items library."* (they already show up there, A-27); *"Nothing to review"* · *"New items submitted by team members will show up here."*; *"{n} pending item{s}"* (*"item"* / *"items"*), *"Approve or reject to clear the queue."*; *"Uncategorised"*, *"Unknown submitter"*; *"Similar to: {x}"*; *"Cost {cs}{x}"*; *"Reject"*, *"Why are you rejecting this?"*, *"The submitter will see this comment in their notification so they know what to fix."*, placeholder *"e.g., Price is below our floor for this category"*, *"Cancel"*, *"Confirm reject"*; *"Approve"*; *"More actions"*, *"Open in editor"*; toasts *"Approved "{x}""*, *"Rejected "{x}""*, *"Reject comment is required so the submitter knows what to change"*, fallbacks *"Approve failed ({status})"* / *"Reject failed ({status})"*, *"Failed to approve"*, *"Failed to reject"*.

### A-30 · Approve
- **Where:** `src/app/api/price-book/[id]/approve/route.ts:15-119`; `PEND:88-107`; `TASKS:743-766`.
- **Does:** owner / admin **tag** only (403 otherwise), item must be in the studio (404). An item already `approved` returns OK with `alreadyApproved` and the screen still toasts *Approved*. Otherwise it sets `approved`, `approved_by`, `approved_at` **and `is_active = true`** — approving an item that was archived while pending (or was rejected) puts it back into every quote picker. Closes every pending `PriceBookItemApproval` task for the item (*Completed*, approved). Notifies the creator (unless they approved it themselves) with `price_book.item_approved`, link `/accounts` — merged with the Pricing role recipients as in A-28, so owners and admins also receive a *"Your Price Book Item Was Approved"* notice. No history row.
- **Data:** `studio_price_book.approval_status · approved_by · approved_at · is_active · updated_at`; `tasks.status · approval_status`; `notifications`.
- **Words:** in-app title *"Your Price Book Item Was Approved: Price Book: {item}"*; email *"{approver} approved {item}."*; 403 *"Only admins or owners can approve price book items"*; 404 *"Item not found"*.

### A-31 · Reject
- **Where:** `src/app/api/price-book/[id]/reject/route.ts:19-124`; `PEND:109-136`; `TASKS:768-800`.
- **Does:** a non-empty trimmed comment is required (400 *"comment is required"*), then owner / admin tag, then the studio match. Any status can be rejected. Sets `rejected`, `approved_by` / `approved_at` = the rejecter, **`is_active = false`**; closes pending tasks with the comment; notifies the creator with `price_book.item_rejected`, link `/accounts` (Team Members). **The comment reaches the submitter by email only**: the in-app body is the default *"Price Book: {item}"* (`dispatch.ts:466-468`), so the Pending tab's promise that "the submitter will see this comment in their notification" holds for the email, not the bell. No history row.
- **Data:** as A-30, plus `tasks.approval_comment`.
- **Words:** in-app title *"Your Price Book Item Was Rejected: Price Book: {item}"*; email *"{approver} rejected {item} and archived it."*, the quoted comment, *"You can edit and re-submit the item from the archived view."*; 403 *"Only admins or owners can reject price book items"*.

### A-32 · Approving by editing
- **Where:** `PBRID:92-96, 149-158`; `PEND:168-172, 266-273`.
- **Does:** a trusted member who opens a pending item (row click or *Open in editor*) and saves **any** change approves it on the side: `approved_by` / `approved_at` set, pending tasks closed. Unlike *Approve* it does **not** re-activate an archived item and does **not** notify the submitter. Nothing on screen says the save approved it.
- **Data:** as A-30 without `is_active` and notifications.
- **Words:** —

### A-33 · The Tasks inbox as an approval surface
- **Where:** `TASKS:38-49, 216, 450-551, 713-848, 1127-1139`.
- **Does:** price-book approval tasks carry the type label *"Price Book Item"* and, while pending, an approval strip with *"Open in Price Book"* (→ `?tab=catalogue&pb=pending`), *Approve* and *Reject*. *Approve* calls the approve route (not the generic task approval). *Reject* first reveals a *"Reason for rejection..."* input with *Send* (Enter sends), then calls the reject route. Selecting several pending price-book tasks adds *"Approve {n} item{s}"* to the selection bar (approves in parallel; a mixed result is a warning). The buttons show for whoever sees the task; the server enforces the tag (a designer set as approver gets the 403).
- **Data:** `tasks`; the approve / reject routes.
- **Words:** *"Price Book Item"*, *"Open in Price Book"*, *"Approve"*, *"Reject"*, placeholder *"Reason for rejection..."*, *"Send"*, bulk *"Approve {n} item{s}"* (title *"Approve selected price book items"*); toasts *"Item approved"*, *"Approve failed"*, *"Item rejected and archived"*, *"Reject failed"*, *"Approved {n} item{s}"*, *"Failed to approve {n} item{s}"*, *"Approved {s}, {f} failed"*.

### A-34 · *Price book approvers* (Accounts › Workflow › Workflow Rules)
- **Where:** `ACC:1699-1731`; `src/components/accounts/workflow-approver-selector.tsx:17-80`; `src/app/api/studio-config/workflow/route.ts:77-89`.
- **Does:**
  - A member picker listing **every** member with their tags; owners appear pre-ticked and locked; the trigger reads *"All owners (default)"* until someone is added. Saving is immediate on each toggle (deep-merged into `studios.settings.workflow.approvers.priceBookApproval`).
  - What reads it: only the **first** id, only for the pending notification (A-28) and for the task of a promoted suggestion. Add / edit tasks ignore it; nobody else on the list is notified or assigned; and a non-owner / non-admin on the list **cannot approve** (every approve / reject route checks the tag). The copy promises shared load and owners always in the loop.
- **Data:** `studios.settings.workflow.approvers.priceBookApproval[]`.
- **Words:** *"Price book approvers"* · *"Who reviews new price book items submitted by team members? Owners are always in the loop; add extra members to share the load."*; label *"Approvers (owners are always included; add extra members to route this approval to)"*; *"All owners (default)"* / *"{n} approver{s}"*; toast *"Price book approvers saved"*.

### A-35 · After a rejection
- **Where:** `PBM:834-845`; `PBRID:97-100`; `src/components/leads/quote-row.tsx:249-258, 560-582`; quote-editor B-80.
- **Does:** the rejected item is archived, so it shows only in the *Archived* view with a red *Rejected* chip. The email's path back — *edit and re-submit from the archived view* — works for an untrusted editor: their save flips it to `pending` (still archived), and an approval re-activates it (A-30). For everyone else: *Restore* makes it active but **still rejected** (A-17); a trusted edit leaves it rejected; only the approve route clears it, and nothing offers it — the rejection closed the item's tasks and the Pending tab lists only pending rows. So in a studio where every editor is trusted (the default, A-04) nothing on screen can ever clear *Rejected*; the item is either archived or active-and-flagged. Quote lines already linked keep their figures and show *"Library item rejected"*; lines linked to a pending item show *"Pending approval"*. Saving a quote is never blocked by either.
- **Data:** `studio_price_book.approval_status`, `is_active`.
- **Words:** chip *"Rejected"* (title *"Rejected — restore via the Archived view"*); quote line chips *"Pending approval"* (title *"Linked price-book item is awaiting approval (submitted by {name})"*) and *"Library item rejected"* (title *"The linked price-book item was rejected — its prices may be stale. Re-pick from the library."*).

---

## Market rates and drift

### A-36 · Benchmarks and how the screens match against them
- **Where:** `PBM:40-44, 62-63, 204-227`; `PBQ:44-69`; `PDS:40-68`; `DRIFT:57-94`; `src/lib/price-book-matcher.ts:237-260`; `src/app/api/studio-config/platform-market-rates/route.ts:16-51`; quote-editor B-69, B-81.
- **Does:**
  - Benchmarks are the global `platform_market_rates` rows of the session's country (default `SG`), read-only to studios: no screen creates, edits or hides one (seeded by migration, topped up by the crowd cron, quote-editor B-69, B-70).
  - An item is compared when it is active and has a sell price above 0 (pending items included). Its text is matched to the best benchmark by synonym-expanded word overlap, accepted at ≥ 0.3; the comparison ignores **units** (a per-*lot* price can be measured against a per-*sqft* benchmark) and ignores the item's category.
  - Drift: below when sell < `rate_min × 0.85` (percent from `rate_min`), above when sell > `rate_max × 1.15` (percent from `rate_max`), rounded to a whole percent.
  - Four places compute it separately with two inputs: the Items list chips / pill and the Drift tab use `name || description`; the Drift-tab badge (`PBQ:56`), the summary card (`PDS:49`) and the monthly job use `description` only — so the tab badge, the card, the pill and the Drift tab can show different counts for the same book.
- **Data:** `platform_market_rates (country_code, category, item_description, unit, rate_min, rate_typical, rate_max, year, source)`.
- **Words:** —

### A-37 · Drift on the Items tab: chip, pill, summary card
- **Where:** `CHIP:35-63`; `PBM:525-539, 937-951`; `PDS:32-133`.
- **Does:**
  - A chip before the sell price: red *"−{p}%"* below range, blue *"+{p}%"* above; its tooltip gives the range.
  - The stats line's pill filters the list to drifted rows (A-07).
  - Under the toolbar, a collapsed amber card *"{n} items priced outside market range"*; expanded, the top five by percent (below and above mixed, percents from different anchors) with the item's **description** (not its name), *"Your price … · Market …"*, a badge (plain hyphen for below) and an arrow; clicking one opens the editor **without** a suggested price; more than five adds *"+{n} more items"*. The card hides when nothing drifts.
- **Data:** —
- **Words:** chip *"−{p}%"* / *"+{p}%"*, title *"Below market range {cs}{min}–{cs}{max}"* / *"Above market range {cs}{min}–{cs}{max}"*; card *"{n} item{s} priced outside market range"*, *"These items are >15% above or below {cc} market rate benchmarks"*, *"Your price: {cs}{x} · Market: {cs}{min}–{cs}{max}"*, *"-{p}%"* / *"+{p}%"*, *"+{n} more items"*.

### A-38 · The Drift tab and *Suggest*
- **Where:** `PBM:1089-1118`; `DRIFT:46-235`.
- **Does:**
  - Heading, then one card: *"{n} items drifted from {cc} market range"*, a *By drift* / *A-Z* toggle (by drift = largest whole-percent first, below and above mixed), and rows *Item* (name or description; category and range underneath) · *Current* · *Market median* · *Drift* chip · *Action*.
  - *"Market median"* is the midpoint `(rate_min + rate_max) / 2`, not the benchmark's `rate_typical`.
  - *Suggest* (every member, no permission check) opens the item editor on a **copy** of the row whose sell price is the midpoint and toasts it. Only the sell price is changed: cost and the stored markup are left as they were, so Saving without touching them stores a markup the new price no longer implies (A-21). Saving goes through the normal edit (approval, history, 403 for read-only members). There is no bulk *Suggest*, no *Ignore / accept this price*, no per-item threshold.
  - Empty states: no benchmarks for the country; nothing drifted.
- **Data:** edit as A-26.
- **Words:** *"Drift watch"* · *"Items priced more than ±15 % outside the {cc} market range. Use Suggest to bring pricing back in sync."*; *"No market rates available"* · *"Drift detection needs platform market rates for your region ({cc}). Check back later or contact support."*; *"All prices in range"* · *"Every active item is priced within ±15% of its {cc} market range."*; *"{n} item{s} drifted from {cc} market range"* (*"item"* / *"items"*); *"By drift"* (title *"Sort by largest drift first"*), *"A-Z"* (title *"Sort alphabetically"*); headers *"Item"*, *"Current"*, *"Market median"*, *"Drift"*, *"Action"*; *"{category} · range {cs}{min}–{cs}{max}"*; phone labels *"Current:"*, *"Median:"*; *"Suggest"* (title *"Open the editor with {cs}{x} pre-filled as the new sell price"*); toast *"Pre-filled {cs}{x} — review and save in the editor."*

### A-39 · The monthly drift notification
- **Where:** `src/app/api/cron/price-drift/route.ts:12-134`; `vercel.json:41-43`; `src/lib/notifications/events.ts:619-628`; `src/lib/notifications/templates/base/pricing.ts:44-53`; `src/lib/notifications/templates/whatsapp.ts:57`; quote-editor B-69.
- **Does:** on the 1st of every month at 10:00 UTC, for each studio with active priced items and benchmarks for its country, counts drifted items (description only) and dispatches one `price_book.drift_detected` with a fresh entity id each run, linking to the Drift tab. Recipients: the studio's *Pricing* notification roles (no fixed recipient). It carries only the count — no item names — and fires every month for the same unresolved drift; nothing records that a drift was reviewed.
- **Data:** `notifications`.
- **Words:** in-app title *"Price Book Drift Detected: {n} Price Book Items Need Review"*, body *"{n} Price Book Items Need Review"*; email *"{n} price book item{s} drifted from market rates."*; WhatsApp *"Price book drift detected ({n} items). Review: {link}"*.

### A-40 · Seed from market rates (and what a new studio starts with)
- **Where:** `PBM:402-425, 632-641, 676-680`; quote-editor B-71, D-14; `scripts/seed/seed-default-pricebook.mjs:1-25`.
- **Does:**
  - Offered only while the book has **no rows at all** (archived included) and benchmarks exist: the toolbar's *"Seed from {cc}"* (editors) and the empty state's *"Seed {n} items from {cc} market rates"* (everyone; the POST 403s for read-only members). One click, no confirmation, no preview: one item per benchmark — description = the benchmark text (no *name*, so rows are legacy-shaped), category by exact name match (else none), sell = `rate_typical`, else the midpoint, unit (else *sqft*), cost = `rate_min`, markup = `(typical − min) / typical` (a margin figure stored as markup), `source "market_seed"`. Normal add rules apply (approval, SKU, embeddings).
  - A new studio otherwise starts **empty**. The platform's default SG catalogue (195 rows, 16 categories, `source 'platform-default'`) is loaded only by an operator script run by hand; nothing in the app offers it.
- **Data:** `studio_price_book` (insert).
- **Words:** *"Seed from {cc}"*, *"Seed {n} items from {cc} market rates"*; toasts *"Seeded {n} items from {cc} market rates"*, *"No market rates available for your region"*, *"Failed to seed market rates"*.

---

## History

### A-41 · The *Price History* drawer
- **Where:** `PBM:976-983, 1226-1232`; `HIST:1-182`; `SCQ:332-345`; `src/app/api/studio-config/price-book-history/route.ts:35-65`; `PBRID:160-183`; quote-editor B-65.
- **Does:**
  - Opened from the kebab's *View history* by **every member**; a right-hand drawer with the item's label, a timeline of up to the 50 newest entries (no paging): a type badge, date and time in the country's locale, *"by {name}"*, then change lines.
  - What is recorded: only the PATCH route writes rows — editor saves, single and bulk archive / restore, bulk *Move to category…*. Not recorded: adds (the *Created* type is never written — the empty state says history *"begins when an item is first edited"*), imports, seeds, suggestion adds, drag re-order and re-filing, vendor markup, tier changes, image uploads, approve, reject, the approval flips an edit causes, delete.
  - What is shown: *Sell* / *Cost* / *Markup* lines only when both the before and after values exist and differ — so setting a first price or clearing one leaves no visible line. Every other field the editor sends is compared with a *previous values* payload that carries only price, cost, markup and active, so **every save lists every other field as changed from "—"**, under the raw column name title-cased by CSS: name, description, unit, category and vendors as raw ids (*"Category Id: — → {uuid}"*, *"Vendor Ids: — → {uuid},{uuid}"*), tags, cost type, waste, spec link, image, notes, SKU, subcategory. Archive and restore entries add *"Is Active: true → false"* (or the reverse). A no-op restore writes an empty *Updated* entry (A-14).
  - The list is cached for 30 s and not refreshed by a save, so reopening an item's history right after editing it can omit the new entry (inferred from the cache settings).
- **Data:** `price_book_history (change_type, field_changes, unit/cost/markup before-after, changed_by → profiles.full_name)`.
- **Words:** *"Price History"*; *"No changes recorded yet"* · *"History begins when an item is first edited"*; badges *"Created"*, *"Updated"*, *"Archived"*, *"Restored"*; *"by {name}"*; *"Sell:"*, *"Cost:"*, *"Markup:"* (`{cs}{before} → {cs}{after}`, markup with `%`); *"{field}: {old} → {new}"*.

---

## Imports and exports

### A-42 · The Imports tab
- **Where:** `PBM:1120-1165`; `ACC:607`.
- **Does:** two cards — *Import items* (editors; opens the import dialog, A-43) and *Export items* (everyone; A-47). There is no import history, no undo of an import and no record of which rows came from which file (the row's `source` says only *csv_import* / *ai_parse*); a `studios.settings.catalogue_files` list is read by the Accounts page into an unused variable. The code comment calls the tab a "Phase 1 placeholder" with history "later".
- **Data:** —
- **Words:** *"Imports & exports"* · *"Bring items into the price book from a CSV, PDF, or image — or export a copy for back-office use."*; *"Import items"* · *"Upload a CSV, PDF, or image. The parser auto-detects vendors and de-duplicates."*; *"Export items"* · *"Download every active item as a CSV. Useful for back-office reconciliation."*

### A-43 · The import dialog: choosing a source
- **Where:** `CSVD:82-116, 195-219, 291-400`; `PBM:1167-1170`; quote-editor B-72.
- **Does:**
  - *Import CSV* (toolbar) and *Import items* (Imports tab) open the same dialog. Source step: a drop zone / file picker (`.csv .pdf .png .jpg .jpeg .webp .xlsx .xls .txt`), two explainer tiles, and *"Or paste rows from an email / Slack"*, which switches to a text box with *Back* and *Parse with AI*.
  - Routing by file extension: `.csv` → parsed in the browser (A-44); the other listed types and pasted text → the AI parse (A-45); anything else → an error toast. Only the first dropped file is used.
  - Closing: × and *Cancel* reset the dialog; **a click on the backdrop closes it without resetting**, so reopening lands on the same step with the same file or result (even on the finished *"Import Complete"* screen).
  - The subtitle names CSV, PDF, PNG / JPG and `.xlsx`; WebP, `.xls` and `.txt` are also accepted.
- **Data:** —
- **Words:** *"Import Price Book"*; *"Drop a file or click to browse"* · *"CSV, PDF, image (PNG/JPG), Excel (.xlsx)"*; *"CSV — fast path"* · *"Parsed locally. No AI cost. Pick column mapping next."*; *"PDF / Image / Excel — AI parse"* · *"Extracts rows, maps categories, flags duplicates."*; *"Or paste rows from an email / Slack"*; *"Paste rows from an email, Slack, or supplier doc. AI will structure them."*, *"Back"*, placeholder *"e.g. / Hacking floor tiles — $4.50/sqft / Lay homogeneous tiles 60x60 — $6.50/sqft (cost: $4.20) / ..."* (three lines), *"Parse with AI"*; toast *"Unsupported file type. Use CSV, PDF, image, Excel, or text."*

### A-44 · CSV: mapping and preview
- **Where:** `CSVD:17-27, 120-162, 223-242, 403-438, 487-553, 577-592`; `src/__tests__/unit-cost-label.test.ts:25-80`.
- **Does:**
  - The file needs a header row and at least one data row; blank rows are dropped. The mapping step lists nine fields — *Description* (required), *Category*, *Sell Price*, *Unit Cost*, *Unit*, *Markup %*, *Cost Type*, *Waste %*, *Notes* — each a select of the file's headers or *— Skip —*. *Preview* stays disabled until *Description* is mapped. There is no *Name*, *SKU*, *Subcategory*, *Vendor*, *Tags*, *Spec link* or *Active* field.
  - Auto-mapping: for each field in that order, the **first header, left to right,** whose lower-cased text passes the field's test — Description: contains *desc*, *item* or *name*; Category: *categ*, *section*, *type* or *trade*; Sell Price: *sell*+*price*, *unit price* or *rate*; Unit Cost: *cost*; Unit: exactly *unit* or *uom*, or contains *measure*; Markup %: *markup* or *margin*; Cost Type: *cost type*, *labour* or *labor*; Waste %: *waste*; Notes: *note* or *remark*. One header can feed several fields (a *"Cost Type"* column left of *"Category"* is picked as the category; *"Labour Cost"* feeds both Unit Cost and Cost Type), and a *Margin* column is taken as markup.
  - Values: text trimmed; numbers keep only digits, `.` and `-` (`12,500.50` → `12500.5`, `$4.50/sqft` → `4.5`, junk → 0); category default *"General"*, unit default *"lot"*; a blank sell price imports as **0**, not blank; cost type is kept as typed (*"Labour"* is stored as is). Rows without a description are dropped silently (the map step's *"{n} rows detected"* counts them, the preview does not).
  - Preview: the first 100 rows (*Description*, *Category*, *Sell*, *Unit Cost*, *Unit*), no checkboxes (a CSV row cannot be excluded), **no duplicate check** against the book or within the file; *"{n} items ready to import"*; *Back* returns to mapping, *Change file* to the source step.
- **Data:** —
- **Words:** *"{file} — {n} rows detected"*, *"Change file"*, *"Map your CSV columns to price book fields:"*, *"Description *"*, *"Category"*, *"Sell Price"*, *"Unit Cost"*, *"Unit"*, *"Markup %"*, *"Cost Type"*, *"Waste %"*, *"Notes"*, *"— Skip —"*, *"Cancel"*, *"Preview"*; *"{n} items ready to import"*, *"Showing first 100 of {n} items"*; toasts *"CSV must have at least a header row and one data row"*, *"Failed to parse CSV file"*, *"No valid items to import"*.

### A-45 · PDF, image, Excel or pasted text: the AI path
- **Where:** `CSVD:164-191, 392-400, 441-553`; `src/app/api/price-book/parse/route.ts:1-332`; `src/lib/price-book-parser.ts`; quote-editor B-73.
- **Does:**
  - A spinner step while the server parses (≤ 10 MB file or pasted text; model and post-processing in quote-editor B-73; session check only). Errors return to the source step with the message in a red box and a toast.
  - Preview adds, above the same table: *"AI extracted {raw} rows → {final} valid items"* (+ the vendor name); a yellow note when rows look like duplicates of existing items; a blue note when the text says prices include or exclude GST (**information only** — prices are imported as extracted, nothing converts them); *"New categories will be created: …"* (never true: the import only maps onto existing categories; and the parse route reads a category table no migration in the repo creates, so on databases without it the line never appears — quote-editor B-73, B-101); a note that the vendor will be linked to every row.
  - Each of the first 100 rows has an include checkbox, all ticked — duplicates (*"· dupe"*, tooltip *"Similar to: {x}"*) and low-confidence rows (*"· verify"*, confidence < 0.7) included; rows past 100 cannot be seen or excluded and are always imported. Nothing on a row can be edited.
  - **Back** from an AI preview returns to the source step but keeps the AI result: choosing a CSV next goes through mapping and then previews — and imports — **the earlier AI rows** (`CSVD:246-260, 293, 588`: `finalItems` and the badges key off the stale `aiResult`; only *Change file*, × or *Cancel* clear it).
- **Data:** `POST /api/price-book/parse` response.
- **Words:** *"Reading the document with AI…"*, *"Extracting rows · mapping categories · detecting GST · checking for duplicates"*, *"This usually takes 15–30 seconds."*; *"AI extracted {raw} rows → {final} valid items"*, *"· {vendor}"*; *"{n} row{s} look like duplicates of items already in your price book. Untick them below to skip."*; *"Prices appear to be {inclusive|exclusive} of GST based on the document text. Confirm before importing."*; *"New categories will be created: {list}"*; *"Vendor {x} will be linked to every imported row. Created automatically if it doesn't already exist."*; aria *"Include this row"*; *"· dupe"*, *"· verify"*; server errors as in quote-editor B-73.

### A-46 · What an import writes
- **Where:** `CSVD:262-280, 557-573`; `PBM:1171-1224`; `src/lib/vendors/dedupe.ts:14-42`; `PBR:145-285`.
- **Does:**
  - AI path with a vendor name: matched to an **active** vendor by normalised name (case, spacing, Unicode form, zero-width characters), else created as a *supplier*; if creation fails, a warning toast and the rows import without a vendor. The CSV path never links a vendor.
  - Then **one request with every row** (not one per row): the insert is a single statement, so one bad row (e.g. a markup of 1,000 % or more) fails the whole import with *"Import failed"*, and the column fallback in A-26 can silently strip cost type, waste and vendors from every row.
  - Per row: `description` = the text, **no name** (imported items are legacy-shaped: the headline sits in *Description*), category by case-insensitive match to an active Quote Category — unknown names (including the default *"General"*) are dropped, not created — sell, cost, unit, markup, cost type, waste, `source "csv_import" | "ai_parse"`, vendor. **Notes are dropped** although they can be mapped; no subcategory, tags, SKU or spec link. Server rules as for any add: `pricebook.edit`, approval by trust (an untrusted importer raises one task and one notification per row, A-28), `PB-NNN` per row in file order, embeddings.
  - No de-duplication on write: re-importing a file, or an export (A-47), adds every row again.
  - Done step: *"Import Complete"*, *"{n} items added to your price book"* and *Close*; the list refreshes.
- **Data:** `vendors` (create), `studio_price_book` (insert), `tasks`, `notifications`.
- **Words:** *"Import {n} Items"*, *"Importing {n} items…"*, *"Import Complete"*, *"{n} items added to your price book"*, *"Close"*; toasts *"Imported {n} items to price book"*, *"Import failed"*, warning *"Imported items without vendor attribution"* (description = the error, else *"Could not create vendor"*).

### A-47 · Export CSV
- **Where:** `PBM:598-604, 1150-1162`; `src/app/api/price-book/export/route.ts:6-73`; quote-editor B-75.
- **Does:**
  - Toolbar *Export CSV* and the Imports tab's *Export items* (every member) open `/api/price-book/export` in a new browser tab, which downloads `price-book-export.csv` (session check only; an error shows raw JSON in that tab).
  - Every row of the studio — **archived and rejected included** (the card says *"every active item"*) — newest first, columns *Description, Category, Sell Price, Unit Cost, Unit, Markup %, Cost Type, Waste %, Vendor, Tags, Notes, Active* (*Yes* / *No*). *Description* is the `description` column: for items with a proper name the headline is **missing** from the file (there is no *Name* column); no SKU, subcategory, tiers, second vendors (only the first, via `vendor_id`), spec link, image, approval status or source. Text cells starting `= + - @`, tab or CR get a leading `'`.
  - Round trip: the headers auto-map back in the CSV importer except *Vendor*, *Tags* and *Active* (and the re-mapped *Notes* are then dropped, A-46), so re-importing an export duplicates every row, brings archived rows back as active and loses vendors, tags and notes.
- **Data:** `studio_price_book` (+ category and vendor names).
- **Words:** *"Export CSV"*, *"Export items"*, filename *"price-book-export.csv"*.

### A-48 · *Apply Vendor Default Markup*
- **Where:** `PBM:605-616, 1253-1258`; `VMD:22-127`; `SCQ:367-383`; `src/app/api/studio-config/price-book/vendor-markup/route.ts:13-38`; `src/components/finance/vendor-detail-drawer.tsx:178-211, 373-396`; quote-editor B-68.
- **Does:**
  - Toolbar icon *Vendor markup config* (editors). A dialog with the vendor picker (active vendors, no create), a *Markup Percentage* box (default 20; `min 0 · max 100` as hints only) and, when the vendor has a stored default markup, *"Use vendor default ({n}%)"* — that default is set in Finance › Vendors › the vendor drawer (*"Default markup %"*, 0–1000).
  - Preview sentence; *"Apply to {n} Items"* is disabled with no vendor or no linked items. `{n}` counts active items whose **first** vendor is the chosen one; extra vendors on an item do not count. A markup of 0 or less makes *Apply* do nothing, silently.
  - Apply writes the markup onto those items and nothing else — **sell prices and costs are untouched**, so each item's stored markup stops matching its price (the list's *Markup* column shows the new number, A-10); no history, no approval flip for an untrusted editor, and the route checks only the session.
  - The dialog keeps the last vendor and percentage between openings.
- **Data:** `studio_price_book.markup_percent`, `updated_at` (where `vendor_id` = the vendor and `is_active`); `vendors.default_markup_percent` (read).
- **Words:** *"Apply Vendor Default Markup"* (sr-only *"Bulk-apply a default markup percentage to all price book items linked to a specific vendor"*), *"Vendor"*, *"Select a vendor..."*, *"Markup Percentage"*, *"%"*, *"Use vendor default ({n}%)"*, *"This will update {n} active price book items linked to {vendor} to {m}% markup."*, *"Cancel"*, *"Apply to {n} Items"*; toasts *"Applied {m}% markup to {n} items from {vendor}"*, *"Failed to apply markup"*.

### A-49 · The second importer, on Quote Categories
- **Where:** `ACC:1749-1784`; `src/components/leads/csv-import-dialog.tsx`; `e2e/uat/17-csv-import.spec.ts:49-75`; accounts C-10; quote-editor B-74.
- **Does:** Accounts › *Quote Categories* carries an older *"Import Price Book from CSV"* shown to **every role**; it stores prices ×100 (cents into a dollars column), drops category, cost and quantity, and leaves names empty (accounts C-10). It is the importer the UAT script *17 — CSV Import* exercises, not the price book's own.
- **Data:** `studio_price_book` (insert).
- **Words:** accounts C-10, quote-editor B-74.

### A-50 · New-item suggestions: *"Review {n} new items"*
- **Where:** `PBM:86-87, 619-630, 1260-1266`; `NIS:1-327`; `PBS:65-135`; `src/app/api/price-book/suggestions/bulk/route.ts:43-323`; `src/app/api/price-book/suggestions/pending/route.ts:20-68`; `QDD:882-913, 10266-10290`; `src/components/copilot/meeting-brief.tsx:396-420, 976-982`; quote-editor B-84, A-110.
- **Does:**
  - Where suggestions come from: after a quote parse, an AI drafting turn or a Co-pilot brief, the scan links lines it can match and files the rest as *pending* suggestions (quote-editor B-84); a modal opens right there, for whoever is working, and *"Review later"* leaves them pending.
  - On the Items toolbar, *"Review {n} new item{s}"* (every member) opens the same modal over **all** pending suggestions of the studio, newest first, from every quote — not tied to any quote.
  - The modal: one card per suggestion, all ticked, with *"From quote: {line text}"* and editable *Item Name*, *SKU / Item ID* (blank = auto), *Category* (active categories; once picked it cannot be set back to none), *Unit Cost* and *Sell Price* (per unit when known). *"Add {n} to price book"* and *"Dismiss {n}"* act on the ticked cards; *"Review later"* closes.
  - Add writes items **with no `pricebook.edit` check** — the one way a designer or accounting member writes to the book from the UI. Each lands approved or pending by the trust rule (pending → a task for the configured approver, then owner, then admin, and a notification, A-28), `source "manual"`, generated SKU unless typed (a typed SKU already in use fails that card with the database message), name / description / category / unit / sell / cost only (no cost type, waste, vendor or markup), **no embedding**; the source quote line is linked to the new item. Dismiss marks the suggestion dismissed (by whom is stored) — there is no view of dismissed suggestions and no way back.
  - A failed card keeps the modal open when nothing succeeded; a partial success closes it with a warning. The modal's *bypass* button (*"Submit quote anyway"* in its comments) is wired to no caller.
- **Data:** `price_book_suggestions (status, dismissed_by, added_to_price_book_id)`, `studio_price_book`, `quote_line_items.price_book_item_id`, `tasks`, `notifications`.
- **Words:** *"Review {n} new item{s}"* (title *"Review items detected from quotes that aren't in your price book yet"*); *"New items found — add to your price book?"* · *"We found {n} item{s} on this quote that aren't in your catalogue yet. Review, edit, and add the ones you want to keep."* (said also when opened from the price book, where they come from many quotes); *"{c} of {n} selected"*; *"From quote: {text}"*; *"Item Name"* (placeholder *"e.g., 5mm Vinyl Flooring"*), *"SKU / Item ID"* (placeholder *"Auto"*), *"Category"* (placeholder *"Uncategorised"*), *"Unit Cost / {unit}"* (placeholder *"Optional"*), *"Sell Price / {unit}"*; *"Add {n} to price book"*, *"Dismiss {n}"*, *"Review later"*; toasts *"Added {n} item{s} to your price book"*, *"Couldn't add to price book: {reason}"*, *"Added {s}, {f} failed — {reason}"*, *"Dismissed {n} item{s}"*, *"Failed to add items"*, *"Failed to dismiss"*.

---

## How quotes use the price book (cited; what the earlier rows miss is added)

### A-51 · Picking one item while writing a line: the *Item Name* typeahead
- **Where:** `PBC:1-371`; `PBE:147-151, 700-777`; `src/components/leads/quote-source-badge.tsx:40-68`; quote-editor B-76, A-98, B-97.
- **Does:** as quote-editor B-76 / A-98 (after 2 characters, up to 8 active rows — **pending included** — matching name, description, category name or SKU; same-name rows grouped as vendor variants, cheapest first; a pick copies name, SKU, description, unit, sell, cost, the **stored** markup, cost type, waste, primary vendor, image, spec link, notes and category, links the line and stamps the snapshot time). Not in those rows:
  - The typeahead exists **only in the quote-line panel**; in price-book mode *Item Name* is a plain input, so nothing warns an editor who is adding a near-duplicate.
  - It does not search subcategory, vendor or tags, and it shows no *Pending* marker — only the row, once saved, carries *"Pending approval"* (A-54).
  - It prints the book's cost (*"cost: {cs}{x}"*) and market range to whoever is writing the quote.
  - A picked line keeps `source "manual"` (`PBE:650`), so it carries the *Manual* badge, not the *PB* badge, although it is linked (only Browse sets *PB*).
- **Data:** `studio_price_book` (read); quote line fields in quote-editor A-61.
- **Words:** quote-editor B-76.

### A-52 · Adding many items: *Browse price book*
- **Where:** `BPB:1-453`; `src/lib/leads/pricebook-search.ts`; `QDD:8523-8536, 10255-10264`; `src/components/leads/focused-grid/focused-grid-overlay.tsx:130-133`; `src/components/quote-templates/template-editor.tsx:404-436`; quote-editor B-77, A-97, B-88.
- **Does:** as quote-editor B-77 / A-97 (active rows, pending included; every word must fuzzily match name, description, category or subcategory; a vendor filter and a per-item vendor choice; each pick becomes a new line at qty 1 with copied figures, the stored markup, `source "price_book"`, one undo step). Not in those rows:
  - Reached from the editor toolbar's *Browse* (icon only below `sm`) and the focused-grid overlay; hidden on a read-only quote; **not** available in the package editor (templates C-16).
  - The SKU is neither shown nor searched; there is no *Pending* marker; prices use the browser's locale with 0–2 decimals.
  - Lines are appended in the **book's stored order**, not the order the boxes were ticked; groups are A–Z with *Uncategorised* last (the Items tab sorts it alphabetically).
  - No quantity, tier or sell-price override at pick time; subcategory carried per the studio flag (quote-editor B-88).
- **Data:** as quote-editor B-77.
- **Words:** quote-editor B-77.

### A-53 · *"Also save to price book"* from a new quote line
- **Where:** `PBE:170-180, 206-212, 289-300, 336-341, 549-600, 831-837, 1398-1426`; `QDD:9950-9969`; quote-editor B-79, A-68.
- **Does:** as quote-editor B-79 / A-68 (a footer checkbox on the *add* panel only, unticked by default, locked while the line is an untouched pick; when ticked the book row is POSTed first and the line adopts its SKU and id; any failure still saves the line). Not in those rows:
  - **The book row is filed under the wrong category when the category is changed in the panel.** In quote mode the category picker writes a *name* (`categoryName`), while the book insert sends `categoryId`, which is set once — from the category the panel was opened with — and never follows the picker (`PBE:173-178, 206, 336-341, 576`). A line opened from *"+ Item"* under *Carpentry* and moved to *Electrical* lands in the book under *Carpentry*; a line opened with no category lands uncategorised whatever is picked.
  - Not carried to the book: subcategory, tags.
  - A member without `pricebook.edit` sees only *"Saved to quote, but price-book sync failed"* (the 403 reason is not shown); an untrusted editor's row lands pending with its task (A-27).
  - This is the only "duplicate" gesture that exists: pick an item, change its name or SKU, tick the box — a new book row (*"save it as a new variant"*).
- **Data:** `studio_price_book` (insert), then the line's `item_id`, `price_book_item_id`.
- **Words:** *"Also save to price book"*, title *"This item is already in the price book — change the item name or ID to save it as a new variant."*; toasts *"Saved to price book"*, *"Saved to quote, but price-book sync failed"*.

### A-54 · Quote lines that point at the book
- **Where:** `src/components/leads/quote-row.tsx:249-258, 556-582`; `src/lib/queries/pricebook-units.ts:31-58`; `src/components/leads/focused-grid/line-items-grid.tsx:118`; `QDD:3320-3340, 3570-3595`; `src/components/leads/quote-source-badge.tsx:40-68`; quote-editor A-38, A-61, A-108, A-110, A-119, B-80, B-82, B-83, B-87, B-94.
- **Does:** the line side is covered by those rows. What the price book contributes, in one place:
  - *Pending approval* / *Library item rejected* chips on linked lines (quote-editor B-80), read from the cached book.
  - The grid's *Unit* suggestions = the units of **every** book row — archived and rejected included — plus the quote's own (quote-editor A-38).
  - Auto-match after a parse and at every save links unlinked lines to **active** rows, pending included, filling cost, waste, cost type and vendor — never the sell price (quote-editor A-108, B-82, B-83).
  - The *PB* source badge (*"Linked to price book"*) appears only on lines added through Browse; lines linked by the typeahead, auto-match, a suggestion or a package keep their earlier badge.
  - Linked lines are snapshots: a later price-book edit reaches **no** existing quote line, package or quote rule. The snapshot time is written and never read, so nothing says a line's price has since changed in the book (quote-editor B-87). The only live link is the tier re-price when a linked line's quantity changes (quote-editor B-94, A-119).
- **Data:** `quote_line_items.price_book_item_id · price_snapshot_at · source`.
- **Words:** *"Pending approval"*, *"Library item rejected"*, badge *"PB"* / *"Linked to price book"*.

### A-55 · Packages, Quote Rules and *Starter Quote*
- **Where:** `src/lib/leads/map-package-items.ts:21-60`; `src/components/quote-templates/template-editor.tsx:404-436`; `src/app/(main)/accounts/quote-rules-tab.tsx:49-60, 80-91, 117-120, 225-275`; `src/lib/quote-rule-engine.ts:12, 55`; templates C-02, C-08, C-13, C-16, C-17, C-31, C-45; accounts C-25, C-29.
- **Does:**
  - **Packages** hold their own copy of each item — sell, cost, markup, `priceBookItemId`, vendor — written when the package is saved (templates C-02, C-13); applying one copies that snapshot, so packages go stale as the book changes (templates C-08, accounts C-25). Inside the package editor the only book lookup is the row pencil's line panel with its typeahead (templates C-16); the package grid renders the same rows, so linked items show the same approval chips (`src/components/leads/focused-grid/line-items-grid.tsx:660-679`, `use-package-grid-context.ts:142`).
  - **Quote Rules**' *"Pick from price book"* (templates C-45): a small search over **`description` and category only — not the name**, so items whose headline is only in *name* are found by category alone; the first 40 hits; **archived, rejected and pending rows all listed**; price printed with a hard-coded *"$"*. A pick stores `priceBookId`, `name || description`, category and the sell price **in cents at pick time**. *Starter Quote* then adds those snapshot prices and links the lines (accounts C-29); a later price-book change never reaches a rule.
- **Data:** `studio_assemblies.items`, `quote_generation_rules.line_items` (hand-off).
- **Words:** *"Pick from price book"*, *"Linked"* / *"Price Book"*, *"Search price book…"*, *"No items found"*, *"${x}"*.

### A-56 · The AI drafter, the quote chat and the Co-pilot
- **Where:** `QDD:7993, 9282`; `src/components/leads/quote-empty-state.tsx:319-321, 357-359`; `src/components/leads/quote-chat-panel.tsx:438, 606, 828-843`; `src/data/copilot-checklists.ts:86-90`; `src/components/copilot/panels/recommended-addons-panel.tsx:15-72`; `src/components/copilot/copilot-session.tsx:937-939`; quote-editor A-113, B-85, B-86; templates C-35.
- **Does:** the AI drafter searches the book by meaning first (active, non-rejected rows with an embedding; quote-editor B-85, B-86). The entry screen and the chat header state the book's size — `{n}` counts **every** row, archived and rejected included (`priceBookItems.length`), while the search sees only active, non-rejected rows. Chat results tag each match *Price book* / *Market rate* / *Web* / *Unresolved*. The Meeting Co-pilot's *Recommended Add-ons* option promises suggestions *"from your Price Book"*, but its panel only asks the Co-pilot a free question; no Co-pilot route reads the book (grep of `src/app/api/copilot`).
- **Data:** `studio_price_book.embedding` (hand-off).
- **Words:** *"Describe the scope — we draft a categorized quote from your {n}-item price book"* / *"Describe the scope — we draft from market rates; add a price book to improve accuracy"*; *"Grounded in your {n}-item price book. We search it, pull real unit prices, and build a categorized quote."* / *"We'll estimate from market rates. Add items to your price book to improve future drafts."*; chat *"Grounded in {n} price book item{s} · {t} template{s}"*; *"Type a brief below. I'll pull matching items from your price book, suggest quantities, and set margins."*; Co-pilot *"Recommended Add-ons"* · *"Scope completion suggestions from your Price Book to increase project value"*.

### A-57 · The vendor directory around the book
- **Where:** `src/components/finance/vendor-detail-drawer.tsx:178-211, 373-396`; `src/components/finance/vendor-merge-dialog.tsx:85-91`; `AC:276-296`; quote-editor B-67, B-68.
- **Does:** a vendor's *"Default markup %"* is kept on its Finance › Vendors drawer (0–1000) and read only by the price book's *Use vendor default* link (A-48). Merging two vendors re-points the book's vendor links and counts them in the merge preview (quote-editor B-67). Designers cannot open the vendor directory but can create vendors inline, including from the item editor's picker (A-23). The directory lists no price-book items per vendor. Purchase orders pre-fill vendors from the quote lines (which copied them from the book), never from the book itself (`src/components/finance/CreatePODialog.tsx:327-346`; finance hand-off).
- **Data:** `vendors.default_markup_percent`; `studio_price_book.vendor_id · vendor_ids`.
- **Words:** *"Default markup %"*, *"Default markup must be a number between 0 and 1000"*; merge counts *"{n} price book item{s}"*.

---

## Phone and tablet

### A-58 · What changes by screen width
- **Where:** `ACC:616-618`; `TABS:51`; `PBM:467, 544, 704-738, 797-811, 955, 1134`; `DRIFT:164-203`; `PBE:672-673, 884`; `src/components/finance/vendor-picker.tsx:86-125`; `HIST:52-53`; `CSVD:298, 331`; `QDD:6690-6691, 8527-8535`; accounts A-01, A-03.
- **Does:** no price-book screen has a phone layout of its own; it is the desktop page, narrowed.
  - **Getting there:** no rail, bottom-nav or search entry (A-01); the Accounts sidebar stacks above the content card below `md`; the quote editor's *Open price book* icon is hidden below `md` (A-03).
  - **Items:** the toolbar wraps; the table stays a table — *Markup* hidden below `sm` (640 px), *Unit* and *Vendor* below `lg` (1024 px), *Notes* below `xl` (1280 px); the kebab is always visible so edit / archive work by touch (a Phase 2 change); the grip shows but drag does not work on touch (A-15); the bulk bar wraps.
  - **Drift:** rows become single-column cards with *"Current:"* / *"Median:"* labels and no header row below `sm`. **Imports:** the two cards stack.
  - **Item editor and history:** right-hand panels at full width on a phone; the price / cost / markup row stays three columns; the vendor picker opens as a bottom sheet below `lg`.
  - **Import dialog:** capped at 85 % of the height; the source step's two explainer tiles stay side by side.
  - **In a quote:** *Browse* becomes icon-only below `sm`; its modal is 96 vw × 80 vh.
- **Data:** —
- **Words:** —

---

## Docs, copy and tests against the code

### A-59 · The 1.0 user stories against the screens
- **Where:** `docs/user-stories/accounts-setup.md:87-100, 235-257`; `docs/user-stories/quotes-module.md:206-222`; `docs/user-stories/tasks.md:98`.
- **Does:** where the stories and the code disagree (code wins):
  - *"a Description cell (… meta tags for cost type, waste %, vendor, creator)"* → vendor has its own column (`PBM:863-865`).
  - *"Export downloads every active item"* → every row, archived and rejected included (A-47).
  - Vendor markup *"a Vendor dropdown (options show each vendor's stored default markup)"* → options show name and trade; the default appears as a link after choosing (A-48).
  - *"… creates it as pending … it stays invisible in the live catalogue … until Owner/Admin approves it"* → pending items are listed and usable in quotes (A-27).
  - *"suggested and none-tier matches wait for … the Auto-Match Review panel"* → the panel has no opener (quote-editor B-83).
  - *"Every edit records a change-history row with a field-level before/after diff"* → partial and noisy (A-41).
  - *"Interior Designer and Accounting never see the Import CSV control"* → the Quote Categories importer shows to every role (A-49).
  - *"Owner/Admin typing a new item's name in the price-book editor sees a live typeahead"* → only the quote-line panel has it (A-51).
  - The mapping list names *"Cost Price"* → the field is *"Unit Cost"* (A-44).
  - *"Any role with `pricebook.view` … reviews … suggestions and bulk-promotes"* → nothing checks `pricebook.view`; the add route checks only the session (A-50).
  - *"the Pending tab … is where owners/approvers review"* → a configured approver who is not an owner or admin cannot approve (A-34).
  - tasks.md *"Price Book Item → 'Open in Price Book' (jumps to the pending queue …)"* → matches the code.
- **Data:** —
- **Words:** as quoted.

### A-60 · The PRD and in-code claims against the code
- **Where:** `docs/prd/05-price-book.md:44-72`; `PBM:299-305, 1066-1071`; `PEND:10-13, 19-22`; `DRIFT:6-8`; `CHIP:2-4`; `PBE:147-151, 874-877`; `src/app/api/price-book/notify-pending/route.ts:52-59`; `src/app/api/price-book/suggestions/bulk/route.ts:254-257`; `ACC:1700-1712`; quote-editor B-95…B-104.
- **Does:**
  - PRD 05 (*Launched*): *"explicit pricing calculation"* → the calc-direction toggle was removed (`PBE:874-877`); *"a competitor benchmark per line item"* → stored, not surfaced (quote-editor A-65); *"designers are read-only unless granted `pricebook.edit`"* → except the suggestions modal (A-50); *"mobile actions"* → the kebab, yes; drag, no (A-15); *"Concurrent edits → time-of-check/time-of-use race handled in the backend"* → only approve / reject / delete match id and studio in one read; the `PB-NNN` sequence still races (quote-editor B-66).
  - Comments: the Pending tab is *"deep-linkable from the price_book.item_pending_approval notification"* (that notification links `/tasks`, A-02); the Pending tab shows *"the proposed sell price, cost, markup"* (no markup, A-29) and defers the quote-row warning to *"Phase 6"* (built, A-54); row numbers *"always start at 1 for the first visible row"* (A-11); the Drift tab's *"Use market median"* action (the button says *Suggest* and the figure is the range midpoint, A-38); the drift chip *"used by … the Quote Digitizer insights overlay"* (no such use — grep); the editor says the price-book query is *"gated"* in price-book mode (`usePriceBook(undefined)` falls back to the session studio and fetches anyway); *"Without `fixedRecipientIds` the dispatch fans out to every owner+admin via `defaultRecipientRoles`"* (dispatch never reads that field; role recipients come from the Pricing preferences and are merged in, A-28); the approvers card's *"Owners are always in the loop; add extra members to share the load"* (A-34).
  - Copy: the Imports card's *"The parser auto-detects vendors and de-duplicates"* and *"Download every active item"*, the preview's *"New categories will be created"* (quote-editor B-101, A-45, A-47); the Co-pilot's *"from your Price Book"* (A-56); the quote modal's *"Changes apply to this quote immediately"* (A-03); the editor's pricing tooltips (quote-editor B-96).
- **Data:** —
- **Words:** as quoted.

### A-61 · Tests covering the price-book screens
- **Where:** `src/__tests__/customization-p2.test.ts:188-215`; `src/__tests__/unit-cost-label.test.ts:25-80`; `src/__tests__/h2-multi-vendor.test.ts`; `src/__tests__/h2-per-line-vendor-pick.test.ts`; `src/__tests__/vendor-picker-adoption.test.tsx`; `src/__tests__/price-book-combobox.test.tsx`; `src/__tests__/browse-price-book-vendor.test.tsx`; `src/__tests__/pricebook-search.test.tsx`; `src/__tests__/price-book-subcategory.test.tsx`; `src/__tests__/price-book-parser.test.ts`; `src/__tests__/price-book-embedding-fanout.test.ts`; `src/__tests__/price-book-suggestions-scoped-api.test.ts`; `e2e/uat/17-csv-import.spec.ts`; `e2e/quote-subcat-pricebook.spec.ts`; `e2e/accounts-exhaustive-walk.spec.ts:30`.
- **Does:** the gates are pinned only by **source-text** assertions (the add and update routes call `resolveCanPerformAction(…"pricebook","edit")`; the manager mentions `canEditPriceBook` near *Add*; the quote editor hides the book icon). Rendered tests exist for Browse (vendor pick and filter, search, subcategory), the typeahead, the parser (51 cases), the import header names round-tripping *Unit Cost*, embeddings on add, and the suggestions API's auth and tenant scope. **Nothing renders the manager, the Pending or Drift tabs, the item editor in price-book mode, the history drawer, the import dialog or the vendor-markup dialog.** The UAT script *17 — CSV Import* drives the older Quote Categories importer (A-49); the accounts walk only opens the tab. None was run for this inventory.
- **Data:** —
- **Words:** —

---

## Uncertain / not verified

- **Notification recipients.** A-28, A-30, A-31 and A-39 read the recipients as "fixed id(s) merged with the members holding the roles in the studio's *Pricing* preference rows" from `dispatch.ts` / `resolve-recipients.ts` / `preferences.ts`. Which studios have those rows (migration 112 seeded owner + admin for studios that existed then; later studios fall back to owners), and whether Settings › Notifications lets a studio change them, was not traced — hand-off (notifications).
- **Deep links while the Accounts page is mounted** (A-02) — inferred from the page initialising its tab and the price-book sub-tab into state once; not run.
- **Drag on touch screens** (A-15) — inferred from the HTML5-only drag code; not tried on a device.
- **Stale history after a save** (A-41) — inferred from the 30 s cache and the missing invalidation; not reproduced.
- **Markup ≥ 1,000 %** (A-21, A-46) — the `NUMERIC(5,2)` limit comes from the migrations; live column types were not inspected.
- **Column fallback on insert / update** (A-26, A-46) — the retry-without-columns path is read from the routes; which errors trigger it on a current database (e.g. a stale `vendor_id` foreign key) was not reproduced.
- **`studio_price_book.subcategory`** — written by the editor and the add route; its migration ("215") is not in the repo (quote-editor Uncertain). If a database lacks the column, every add and edit takes the fallback path of A-26.
- **Member order** — "first owner / first admin" in A-28 is whatever order the unordered `studio_members` select returns; whether it is stable was not checked.
- **Tier route scope** — `PUT /api/studio-config/pricing-tiers` deletes by item id through the scoped client without checking the item's studio; whether row-level security stops a cross-studio id was not checked — hand-off (routes).
- **WhatsApp for the approval events** — only the drift event has a WhatsApp template; how the fallback line renders for the three approval events, when a studio turns WhatsApp on for Pricing, was not traced.
- **Tasks visibility** — which members see another member's *Price Book Item* task (the *My* / *Team* tabs) was not traced; A-33 describes the row's actions for whoever sees it.
- **`vendors.create` defaults** — who may create a vendor inline from the item editor (A-23) follows the vendors permission, not traced here — hand-off.
- **Pending suggestions volume** — whether studios accumulate large suggestion backlogs (the modal renders every pending one at once) is a data question, not checked.
