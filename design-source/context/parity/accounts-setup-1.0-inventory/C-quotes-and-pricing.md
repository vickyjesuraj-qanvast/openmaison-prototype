# OpenMaison 1.0 — Accounts Setup inventory · Slice C: Quotes & Pricing

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-25. 2.0 names appear only for orientation (hand-off E).

Conventions: *Words* are quoted verbatim from code; `{x}` marks an interpolated value. "Hand-off A / B / D / E" = Studio (A), Lead Management (B), the data model, migrations and route permission checks in depth (D), 2.0 today (E) — named, not inventoried. Behaviour an earlier audit already records is cited, not repeated: "templates A-nn … D-nn" = `../quote-templates-1.0-inventory/`, "quote-editor A-nn … D-nn" = `../quote-editor-1.0-inventory/`, "contracts A-nn / B-nn" = `../contracts-1.0-inventory/`. This slice records what the Accounts screens themselves show, save and enforce, and whether anything downstream reads what they save. Abbreviations: `ACC` = `src/app/(main)/accounts/page.tsx`; `DTT` = `src/app/(main)/accounts/document-templates-tab.tsx`; `SDT` = `src/app/(main)/accounts/signing-documents-tab.tsx`; `QTT` = `src/app/(main)/accounts/quote-templates-tab.tsx`; `QRT` = `src/app/(main)/accounts/quote-rules-tab.tsx`; `QCE` = `src/components/accounts/quote-categories-editor.tsx`; `PBM` = `src/components/accounts/price-book-manager.tsx`; `IPE` = `src/components/settings/invoice-po-template-editor.tsx`; `BDV` = `src/components/finance/BrandedDocumentView.tsx`; `QDD` = `src/components/leads/quote-digitizer-dialog.tsx` (the 1.0 quote editor); `RS` = `src/app/api/quotes/request-signature/route.ts`; `TR` = `src/lib/transformers.ts`; `SSR` = `src/app/api/identity/studio-settings/route.ts`; `AC` = `src/lib/access-control.ts`.

## Vocabulary (where each word is defined)

- **Accounts Setup / Accounts** — the page `/accounts` (`ACC:1946-1952`), header *"Accounts Setup"* (`ACC:615`); one right-hand pane chosen by `?tab=<item id>`.
- **Quotes & Pricing** — the sidebar group `ACC:94-107`: `quote-categories` *"Quote Categories"*, `document-templates` *"Document Templates"*, `signing-documents` *"Signing Documents"*, `quote-templates` *"Packages"*, `quote-rules` *"Quote Rules"*, `catalogue` *"Price Book"*, `approval` *"Quote Approval Rules"*, `quote-sharing` *"Quote Sharing"*.
- **Quote category / trade / section** — a `studio_quote_categories` row: name, order, sub-category list, description (migrations 090 · 172 · 174). On a quote the same word is the line's free-text `category`, which becomes a section (quote-editor A-71). 2.0 calls the studio list "Trades" (Settings › Quotes).
- **Subcategory / sub-section** — one label in a category's `subcategories[]`; on a quote, the line's free-text `subcategory` (quote-editor A-78…A-82).
- **Category description** — `studio_quote_categories.description`, a studio default printed under a section heading; a quote's own scope note wins (quote-editor A-77).
- **Document template** — a `studio_document_templates` row; `type` ∈ `quote_pdf · tnc · contract · invoice · po · vo · signing_flow · timeline · portal` (templates A-76). Six types have a tab here (C-12).
- **Studio-wide row / entity override** — `company_id` null vs. the id of a legal entity (`studio_companies`, hand-off A).
- **Default** — `is_default = true`; at most one per (studio, entity, type) (templates A-76).
- **Signing document (library)** — a `studio_signing_documents` row (contracts B-02). A different shelf from the `tnc` / `contract` document templates, reached by a different route (C-22).
- **Package** — a `studio_assemblies` row: a named bundle of lines for one section (templates C-01). Closest 2.0 word: "My Sections" (Company › Price book).
- **Quote rule (quote generation rule)** — a `quote_generation_rules` row: project types → lines to append (templates C-43), applied by the editor's *"Starter Quote"* button (C-29).
- **Price book / catalogue** — `studio_price_book` (quote-editor B-58). 2.0: Company › Price book › My Items.
- **Quote approval rules** — `studios.settings.quote_approval`, what C-35 saves. Not the approval that runs: that is Workflow Rules' `quoteApprovalRequired` + approver list (quote-editor C-17, D-07).
- **Quote sharing settings** — six top-level `studios.settings` keys: `quoteSharingMethod`, `quoteLinkExpiryDays`, `quoteShare_showOptionalToggles`, `quoteShare_showPaymentSchedule`, `quoteShare_showVariations`, `quoteShare_showPoweredBy`.
- **Settings bag** — `studios.settings` JSONB. Written by `PATCH /api/identity/studio-settings` (shallow merge, `SSR:49-142`); read by the screens through `transformStudioSettings` (`TR:1473-1596`), which passes named keys only (C-04).
- **`pricebook.edit` / `pricebook.view`** — role action slugs (`AC:216, 344-345`); only `edit` is ever checked (C-02).
- **Starter Quote** — the quote editor's button that appends the lines of every matching quote rule (C-29).

---

## The group and its page

### C-01 · The Quotes & Pricing group in the sidebar
- Where: `ACC:94-107` (menu), `:200-215` (`RETIRED_TAB_ALIASES`), `:222-251` (initial tab, group-label resolution, `setActiveTab` → `history.replaceState`), `:618-684` (sidebar, search, expand).
- Entry: `/accounts` → sidebar group *"Quotes & Pricing"*; or a typed `/accounts?tab=<id>`.
- Does: lists the eight items in the order above; a click swaps the right pane and rewrites the URL to `/accounts?tab=<id>` without navigating. The group auto-expands while one of its items is active; the sidebar search filters items by label and expands every group.
- Rules: `?tab=quotes-&-pricing` (the group label) resolves to its first child, *Quote Categories* (`:234-238`); `?tab=assemblies` (the retired *"Work Packages"*, removed 2026-08-19 as a second, lossier editor over the same packages) redirects to `quote-templates` (`:201-215`; templates C-21). Any other unknown id — e.g. `quote-doc-template`, still walked by `e2e/accounts-exhaustive-walk.spec.ts:27` — renders an empty pane. The item labelled *"Packages"* keeps the id `quote-templates` and the comment *"Quote Templates"* (`:1381`) — the naming drift templates C-21 and C-42 describe. Switching tabs drops other query parameters (the price book's `?pb=`). *Document Templates* is a full-screen overlay whose Back lands on *Lead Categories*, not back in this group (templates A-01).
- Data: —
- States: —
- Words: group *"Quotes & Pricing"*; items as listed; page *"Accounts Setup"* · *"Configure your studio's lead pipeline, AI rules, and workspace settings."*; search *"Search settings..."*.
- Reachable: yes.

### C-02 · Who reaches the group, and what the server checks
- Where: `AC:123-126` (`accounts: ["owner", "admin", "id", "accounting"]`), `:216`, `:344-345`; `ACC:636-639` (the only in-page filter); `src/lib/api-auth.ts` (`requireSession`); the routes named in each row below.
- Entry: every item of the group.
- Does: every member tagged owner, admin, id (designer) or accounting — or holding a custom role whose page map allows `accounts` (hand-off D) — sees all eight items and can use every control on them except the price book's edit controls.
- Rules:
  - The sidebar filters only `ownerOnly` items, and the only one is *Studio Health* (Studio group). The comment at `AC:123-125` (*"ID + accounting can land on /accounts to view the price book read-only (page filters tabs to viewable subset). Roles editor and most other tabs remain owner-only via in-page menu filtering."*) and the file headers *"Owner-only surface"* (`QTT:6`) and *"Owner-only."* (`QRT:6`) describe gates that do not exist.
  - Server side, the Quote Categories PUT and sub-category POST, every document-template route (`/api/document-templates/*`, `/api/studio-config/doc-templates`), the signing-library routes (contracts B-01), the package routes (`/api/quotes/assemblies`), the quote-rule routes and `PATCH /api/identity/studio-settings` (Quote Approval Rules, Quote Sharing) check **only** that a session exists and force `studio_id` from it. The group's one role check is `pricebook.edit` on the price book's add and edit routes (quote-editor B-61), plus literal owner / admin tags on delete, approve and reject (quote-editor B-62, B-63); its reorder, tiers, vendor-markup and export routes are session-only (quote-editor B-64, B-68, B-75).
  - `pricebook.view` is defined (`AC:216`; default id · admin · accounting, `:344`) and checked nowhere (grep finds no `resolveCanPerformAction(…, "pricebook", "view")`).
  - Net effect: a designer or a bookkeeper can rename or delete the studio's trades, rewrite the default T&C and contract, delete packages, change quote rules and overwrite the approval and sharing settings — yet cannot add one price-book item (C-30).
- Data: `studio_members.tags`, `studio_roles.permissions` (hand-off D).
- States: —
- Words: —
- Reachable: yes. Hand-off D for page maps, RLS and the route matrix.

### C-03 · How the group's screens save
- Where: `ACC:166-189` (`SaveButton`), `:434-437` (`showSaved`), `:610-611` (`isSaving`); `QCE:106-140`; `DTT:268-311`; `IPE:217-263`; `QTT:65-71`; `QRT:92-111, 368-378`; `ACC:489-518, 1461-1604`.
- Entry: —
- Does: four save patterns:
  1. **Whole list, one button** — Quote Categories (C-07); the Quote PDF template set (C-14).
  2. **One record, one button** — invoice / PO / VO templates (C-15), T&C and contract templates (C-17), signing documents (contracts B-05…B-07), packages (templates C-16), quote rules (C-28), price-book items (quote-editor B-60).
  3. **Immediately on click** — every Quote Sharing control (C-38…C-40), Quote PDF *Set as default* (C-14), package *Delete* (C-24), T&C / contract / invoice *Set as default*.
  4. **One form into the settings bag** — Quote Approval Rules (C-35).
- Rules: no screen in the group guards unsaved edits — changing tab, the Document Templates *Back*, or an entity-scope switch drops them silently (templates A-15 for Quote PDF; the category editor and the template panels likewise have no prompt). The page's shared `isSaving` is true while **any** of its settings, lead-category, field or stage mutations runs, so *"Save Approval Rules"* can read *"Saving..."* during another tab's save (`:610-611`). *"Unsaved changes"* appears only where a caller passes `dirty`; no tab in this group does.
- Data: —
- States: *"Saving..."*; *"Saved!"* for 2.5 s.
- Words: *"Save"*, *"Saving..."*, *"Saved!"*.
- Reachable: yes.

### C-04 · What a tab can read back from the settings bag
- Where: `TR:1473-1596` (`transformStudioSettings`); `SSR:24-47` (GET returns it), `:49-142` (PATCH); `src/lib/queries/studio.ts:7-26` (`useStudioSettings`); `ACC:396-414, 1484, 1531, 1575, 3613-3620`.
- Entry: Quote Approval Rules, Quote Sharing (and, outside the group, Finance › Document Numbering).
- Does: settings-bag screens read `studioSettings.settings.<key>` from `GET /api/identity/studio-settings`, whose body is `transformStudioSettings(row)`: an object literal of named keys with no spread — `aiAssignmentPrompt`, `quoteApproval`, `chatIdentity`, `catalogueFiles`, `quoteTemplates`, `reviewRequestLink`, `branding`, `clientPortal`, `bankDetails`, `poSettings`, `invoiceApproval`, `proactiveAlerts`, `paymentDetails`, `paymentApproval`, `features` (four flags), `portal`, `workflow`.
- Rules: `quoteApproval` is carried, so Quote Approval Rules re-opens on what was saved (`ACC:402-409`). **None of the six Quote Sharing keys is carried**, so that tab can never show a saved choice (C-41). `numbering` is not carried either, so Document Numbering always re-opens on *INV* / *PO* / *T* (C-42). Writes land in the raw bag with mixed conventions: camelCase `quoteSharingMethod`, snake_case `quote_approval`. The PATCH merges shallowly, any key, any role (C-02); it re-reads and re-writes the whole bag, so two near-simultaneous saves can overwrite each other (hand-off D).
- Data: `studios.settings`.
- States: —
- Words: —
- Reachable: yes.

### C-05 · What a new studio starts with
- Where: `scripts/migrations/090_studio_customization_engine.sql:330-339`; `118_seed_default_document_templates.sql` (templates A-77); `168_seed_invoice_po_default_templates.sql:23-89`; `170_seed_vo_default_templates.sql:26-49`; `062_seed_chart_of_accounts.sql:87-95` (quote-editor D-16); `src/app/api/admin/studios/route.ts:99-243`; `src/lib/studio-default-taxonomies.ts:3-8, 31-56`.
- Entry: —
- Does: every seed behind this group ran once, over the studios that existed at the time (`INSERT … SELECT … FROM studios`): 15 categories (090), *"Default Quote PDF"* / *"Default Terms & Conditions"* / *"Default Contract"* / *"Default Signing Flow"* / *"Default Payment Portal"* (118), *"Default Invoice"* / *"Default PO"* (168), *"Default VO"* (170), *"Standard 4-Stage"* payment schedule (062). A studio created later through `POST /api/admin/studios` gets its owner membership and `seedDefaultStudioTaxonomies` (lead sources, project types, escalation categories) — **no** categories, document templates or payment schedule.
- Rules: what such a studio sees, and what stands in:
  - Quote Categories: an empty list; the quote editor falls back to 19 hard-coded names and the price-book editor offers them as *"Will be created on save"* (C-11).
  - Quote PDF: the synthetic, never-saved *"Default"* (templates A-68).
  - T&C / Contract: *"No templates yet."*; nothing is appended at signing (C-18).
  - Invoice / PO / VO: *"No templates yet."*; the finance renderer's built-in layout (C-16).
  - Payment schedule: the editor's 10 / 30 / 30 / 30 (quote-editor C-94).
- Data: —
- States: —
- Words: the seeded names above.
- Reachable: n/a. Hand-off D (seeds, provisioning), A (studio creation).

---

## Quote Categories

### C-06 · The screen
- Where: `ACC:1749-1781`; `QCE:27-263`; `src/lib/queries/studio-config.ts:157-177`.
- Entry: *Quotes & Pricing* › *Quote Categories* (`/accounts?tab=quote-categories`); the price book's *"Manage →"* opens it in a new browser tab (shown only with price-book edit rights, `PBM:497-517`).
- Does: one card per active category in list order: drag grip, the name as an inline text field, a trash icon (on hover), a *"Description"* textarea and a *"Subcategories"* chip row ending in a *"+ Add subcategory"* input. Below: an add row (Enter or the plus button) and *"Save"*; under the editor, *"Import Price Book from CSV"* (C-10).
- Rules:
  - Add refuses a name already in the list, case-insensitively (*"Already exists"*). Delete asks `Delete "{name}"?` and only removes the card locally; drag re-orders locally; nothing reaches the server until *Save*, and leaving the tab discards it.
  - Sub-category chips: Enter or blur adds a trimmed label, case-insensitive duplicates skipped without a message; × removes.
  - The list re-syncs from the server whenever it is not dirty (`QCE:36-42`).
  - Save refuses empty names (*"Categories can't have empty names"*) and case-insensitive duplicates (`Duplicate name: "{name}"`), then sends the whole list (C-07).
  - There is no minimum or maximum, no colour, no per-trade markup, GST or unit, no archive or restore view, and no indication of how many quotes or price-book items use a category.
- Data: `GET /api/studio-config/quote-categories` (active rows, `order_index` then `name`, cached 30 s).
- States: *"Saving..."*; *"Saved!"* for 2 s.
- Words: title *"Quote Categories"*; *"Customize the categories used in your quote line items, the description printed under each one on your quotes, and the subcategories that group rows under each category in your generated PDFs."*; placeholder *"New category (e.g. Waterproofing)"*; *"Description"* with placeholder *"Printed under this category on every quote — e.g. To supply labour to run wiring for the following items"*; *"Subcategories"*, *"+ Add subcategory"*, aria `Remove {sub}`; title *"Delete"*; toasts *"Quote Categories saved"*, *"Failed to save"*. Also templates C-30.
- Reachable: yes.

### C-07 · What Save does on the server
- Where: `src/app/api/studio-config/quote-categories/route.ts:55-93` (PUT), `:25-53` (GET); `QCE:106-140`; test `src/__tests__/quote-category-description.test.tsx`; quote-editor B-89.
- Entry: C-06 *"Save"*.
- Does: sets **every** category row of the studio `is_active = false`, then upserts each posted category, one request per row, on `(studio_id, name)` with `order_index` = its list position, `is_active = true`, `subcategories` and `description` (the client always sends the description — omitting it once blanked every category's printed text, `QCE:124-128`).
- Rules:
  - A rename is a new name: it inserts a new row (new id), or revives an inactive row of that name and overwrites its sub-categories and description with the posted ones; the old row stays inactive. Price-book items keep pointing at the old row by `category_id` and keep showing its name; quote lines keep their text (quote-editor B-89, B-91).
  - A delete is a deactivation; re-adding the name later revives the same row.
  - Not transactional: the deactivation runs first and every upsert separately, so a failure part-way (500) leaves every later category inactive until the list is saved again.
  - Session only — any role (C-02); no record of who changed the trades or when.
- Data: `studio_quote_categories (id, studio_id → studios CASCADE, name, order_index INT DEFAULT 0, is_active DEFAULT true, subcategories TEXT[] NOT NULL DEFAULT '{}', description TEXT NULL)`, UNIQUE `(studio_id, name)` (`090:58-65`, `172:9-10`, `174:8-9`); in the lock list of `226_lock_tenant_tables.sql:56` (hand-off D).
- States: —
- Words: —
- Reachable: yes.

### C-08 · The catalogue's other writers
- Where: `src/app/api/quotes/categories/route.ts:17-50` (the quote editor's *"Add category"*, quote-editor A-73); `src/app/api/quotes/categories/resolve/route.ts:20-54` and `src/components/accounts/price-book-item-editor.tsx:46-53, 440-462, 839-851` (price-book editor); `src/app/api/studio-config/quote-categories/subcategory/route.ts:15-81` (quote-editor A-76, A-78, B-92); `src/app/api/price-book/import/route.ts:50-80`, `src/app/api/quotes/import/route.ts:44-67` (no caller); templates C-14 (dead package RPC).
- Entry: the quote editor's *"Add category"* with *"Also save to price book"* ticked; the price-book item editor's category picker; sub-section adds and renames in the quote editor.
- Does: each upserts one name on `(studio_id, name)` with `is_active = true` and **no** `order_index`, or appends one sub-category label.
- Rules:
  - A category created from the quote editor or the price-book editor takes the column default `order_index = 0`. The list is ordered `order_index, name`, so the new trade sorts among the first positions (alphabetically against any other 0) and every quote that follows the studio order gets a new section order. A revived row keeps its old `order_index`.
  - The price-book editor always offers any of its 19 built-in names that are not active (*"Will be created on save"*), so a trade the studio deleted on this screen returns the first time someone files a price-book item under it.
  - The sub-category route skips exact (case-sensitive) duplicates; this screen skips case-insensitive ones — *Kitchen* and *kitchen* can both be appended from the quote editor.
  - `/api/price-book/import` and `/api/quotes/import` also create categories (`order_index` = row count + i), with the service-role client and no `pricebook.edit` check; nothing in the app calls either.
- Data: `studio_quote_categories`.
- States: —
- Words: *"Will be created on save"*; quote editor words in quote-editor A-73.
- Reachable: yes (the two import routes: API only).

### C-09 · Where each category field is read
- Where: `QDD:1102, 1338-1356` (picker), `:1359-1367` (order), `:1981-1987` (descriptions), `:5942-5970` (sub-bucket order), `:6004-6011`; `src/lib/quote-editor/category-order.ts`; `src/lib/quote-canva/render-quote-pdf-server.ts:582-599`; `src/components/quote-templates/use-package-grid-context.ts:256`; `PBM:56, 280-297`; `src/app/api/price-book/parse/route.ts:184`; quote-editor A-71, A-72, A-77, A-82, B-90, B-91.
- Entry: —
- Does:
  - **Name** — the quote editor's category picker (the active list plus names already on the lines; with no active category, 19 built-in names, C-11); the price book's grouping, filter and item editor; the package grid (templates C-17).
  - **Order** — the default section order of every quote without its own saved order (quote-editor A-72, B-90). The price book ignores it: its groups are sorted A–Z (`PBM:280-297`).
  - **Description** — printed under the section heading unless the quote has a scope note for that section (quote-editor A-77; templates B-64).
  - **Subcategories** — only the order of sub-groups inside a section in the editor grid (untagged first, then the list's order, then the rest A–Z) and the package grid's choices; the per-line quick-pick that would offer them is never rendered (quote-editor A-82).
- Rules:
  - The editor reads **active** rows only, but the server PDF render reads **every** row of the studio, inactive included, for both descriptions and section order (`render-quote-pdf-server.ts:585-592`: no `is_active` filter, beside a comment saying it must resolve "identically" to the client). After a rename or delete, a quote whose lines still carry the old name prints that section with its old description and at its old position on the server-rendered PDF, while the editor shows no description and appends the section after the listed trades.
  - No renderer reads the sub-category list: PDFs group lines by each line's own `subcategory` text in declared or first-appearance order (quote-editor A-79, A-81). The screen's line that sub-categories "group rows under each category in your generated PDFs" holds only for lines that carry those exact words.
  - The AI price-book import maps categories against `studio_price_book_categories`, a table no migration creates, so it never sees this list (quote-editor B-73).
- Data: `studio_quote_categories`; `quote_line_items.category`, `.subcategory`; `leads.quote_metadata.categoryOrder`, `.sectionDescriptions`.
- States: —
- Words: —
- Reachable: yes.

### C-10 · "Import Price Book from CSV" on this screen
- Where: `ACC:1759-1779`; `src/components/leads/csv-import-dialog.tsx:11-17, 56-70, 91-105`; `src/lib/queries/studio-config.ts:236-250`; `src/app/api/studio-config/price-book/route.ts:155-166`; quote-editor B-74.
- Entry: the outline button under the category editor.
- Does: opens the leads module's older CSV importer (map *Description* (required), *Category*, *Unit Price*, *Unit*, *Quantity*; preview of three rows) and posts the rows to the price book.
- Rules: the page sends only `description`, `unitPrice: Math.round(unitPrice × 100)`, `unit` and `source: "csv_import"`. The price book stores currency units, so every price lands 100 × too high (12.50 → 1,250.00); the mapped category and quantity are dropped, so items arrive uncategorised; names are empty. The button shows to every role, but the POST requires `pricebook.edit` (403 *"You don't have permission to edit the price book."*), so a designer reaches the dialog's failure step; an editor without the owner / admin tag creates *pending* items (quote-editor B-61). The price book's own importer (quote-editor B-72) does the same job properly.
- Data: `studio_price_book`.
- States: the dialog's steps (quote-editor B-74).
- Words: *"Import Price Book from CSV"*; dialog words in quote-editor B-74.
- Reachable: yes.

### C-11 · Built-in trade names and fallback names
- Where: `QDD:200-205`; `src/components/accounts/price-book-item-editor.tsx:46-53`; `scripts/migrations/090_studio_customization_engine.sql:330-339`; `scripts/seed/catalogue-sg-default.mjs:17-34` (quote-editor D-14); `QDD:4086`; `src/lib/leads/map-package-items.ts` (templates C-02); quote-editor B-91.
- Entry: —
- Does: lists every set of trade names the code carries apart from the studio's own list.
- Rules:
  1. The quote editor's fallback, 19 names — *Preliminaries, Demolition, Masonry, Plumbing, Electrical, Partition & Ceiling, Plastering, Painting, Flooring, Carpentry, Countertop, Glass & Mirror, Doors, Aluminium, Decking, Design, Materials, Cleaning, Others* — used only while the studio has **no** active category. Deleting every trade on this screen does not empty the editor's picker; it swaps the studio's list for this one.
  2. The same 19 in the price-book item editor, offered whenever missing (C-08).
  3. Migration 090's 15, seeded once (no *Preliminaries*, *Partition & Ceiling*, *Countertop*, *Aluminium*; *Glass* rather than *Glass & Mirror*).
  4. The platform price-book seed's 16 (no *Design*, *Materials*, *Others*).
  5. Fallbacks when a line or item has no category: *"Others"* (quote editor, Starter Quote, packages, margin roll-ups), *"General"* (both CSV importers, the AI parse), *"Uncategorised"* (price-book lists).
- Data: —
- States: —
- Words: as listed.
- Reachable: yes.

---

## Document Templates

### C-12 · The overlay and its six document kinds
- Where: `ACC:1370-1376`; `DTT:51-201`; templates A-01…A-04.
- Entry: *Quotes & Pricing* › *Document Templates* (`/accounts?tab=document-templates`).
- Does: a full-screen overlay (templates A-01) with an intro, an entity-scope select (C-13) and six tabs, landing on *Quote PDF*:

  | Tab | `type` | Editor | Saves through | Read by |
  |---|---|---|---|---|
  | *Quote PDF* | `quote_pdf` | the sections-and-knobs editor (templates A-08…A-67) | the whole set, `PUT /api/studio-config/doc-templates` | the quote editor's first-open layout and start-screen gallery (templates A-88, A-95); server render fallbacks (templates A-91); the lead drawer's total rule (templates A-94) |
  | *Invoice* · *Purchase Order* · *Variation Order* | `invoice` · `po` · `vo` | `InvoicePOTemplateEditor` (C-15) | one row, `/api/document-templates/records` | finance full-screen previews and the homeowner portal's invoice (C-16) |
  | *Terms & Conditions* · *Contract* | `tnc` · `contract` | `RichTextTemplatesPanel` (C-17) | one row, `/api/document-templates/records` | the signing link's auto-compose path, the contract flow, the legacy section editor (C-18) |

- Rules: `signing_flow`, `portal` and `timeline` rows share the table without a tab here (timeline has its own Accounts tab; `signing_flow` is never read, contracts B-24). The file header still calls the whole thing a *"Terms & Contracts tab"* (`DTT:3-12`).
- Data: `studio_document_templates` (templates A-76; hand-off D).
- States: the overlay renders nothing on its first paint (templates A-01).
- Words: *"Back to Accounts"*, *"Document Templates"*, *"Author the documents your customers see — quote PDFs, invoices, purchase orders, terms, and contracts. Save per-entity overrides for studios that bill from multiple legal entities."*; tabs *"Quote PDF"*, *"Invoice"*, *"Purchase Order"*, *"Variation Order"*, *"Terms & Conditions"*, *"Contract"*.
- Reachable: yes.

### C-13 · Per-entity copies — which kinds honour the entity scope
- Where: `DTT:55-64, 113-141, 162, 165-175, 177-193, 207-221`; `src/app/api/studio-config/doc-templates/route.ts:44-66, 104-157`; `src/app/api/document-templates/default/route.ts:36-76`; `src/app/api/document-templates/set-default/route.ts:35-50`; `IPE:149-201`; templates A-02, A-93.
- Entry: the *"Editing templates for"* select, shown only with two or more active legal entities.
- Does: `null` = the studio-wide rows; an entity id = that entity's overrides.
- Rules:
  - **Quote PDF** — the scope change re-mounts the editor, dropping unsaved edits. In an entity scope the list shows the studio-wide templates merged by name with the entity's own (the entity's win). The first *Save Templates* or *Set as default* there inserts **every** inherited studio-wide (legacy-shaped) template as a new entity row, because the PUT only updates rows already in that scope (`route.ts:107-157`); from then on the entity holds copies that no longer follow studio-wide edits. No quote render reads an entity row (templates A-91, A-93), so per-entity Quote PDF overrides are authored but inert.
  - **Invoice / PO / VO** — the only kinds resolved per entity when printed: entity default, else studio-wide default, else the renderer's built-in layout (`default/route.ts:36-76`, C-16). An entity with no override pre-loads the studio default's body (*"No override yet…"*); *"Reset to studio default"* reloads it into the draft.
  - **T&C / Contract** — the panel ignores the scope: it lists every row of the type (studio-wide and any entity rows), creates studio-wide rows, and its *Set as default* clears the default of every entity's row of that type too (no `companyId` sent, `set-default/route.ts:42-45`). The signing path reads the default with no entity filter (C-18). The intro's "per-entity overrides" does not apply to these two tabs.
- Data: `studio_document_templates.company_id` (→ `studio_companies` ON DELETE CASCADE, templates A-76).
- States: —
- Words: *"Editing templates for"*, *"All entities (studio default)"*, *"(Default)"*, *"All entities (default)"*, *"Changes save as overrides for this entity only. Falls back to the studio default when no override exists."*, *"Studio-wide template every entity inherits from."*
- Reachable: yes (studios with two or more active entities).

### C-14 · Quote PDF — what the screen does at the studio level
- Where: `src/components/accounts/quote-document-template-editor/index.tsx:143-231, 630-640, 1185-1190`; `src/app/api/studio-config/doc-templates/route.ts:28-175`; templates A-08…A-16 (list and save), A-17…A-67 (every knob), A-68…A-70 (API), A-97 (roles).
- Entry: the first tab of C-12.
- Does: the legacy sections-and-knobs template editor — list, add, rename, delete, set default, the Document Layout card, the five-tab knob editor, assets, sections and live preview — inventoried knob by knob in templates A.
- Rules: the ones a rebuild must decide —
  - Only legacy bodies (a `sections` array) are listed; templates saved from the Quote Designer's canva mode are hidden (templates A-14). *Save Templates* and *Set as default* both PUT the full visible list, and the route soft-deletes every active row of that scope missing from it (`route.ts:159-169`) — so **any save here in the studio-wide scope deactivates every canva template the studio saved in the Quote Designer** (those are studio-wide `quote_pdf` rows, `QDD:4994-5018`).
  - *Set as default* sends the whole local list at once, committing every other unsaved edit on the page with it (`index.tsx:215-226`).
  - The first template added becomes the default; deleting the default promotes the first remaining one (templates A-09, A-11).
  - No dirty tracking, discard, draft or version history; a saved template is live for every new quote at once (templates A-15, A-97).
  - The seeded *"Default Quote PDF"* has no body and lists as *0 sections* (templates A-77).
- Data: `studio_document_templates` `type = 'quote_pdf'`, `body_json`.
- States: templates A-13, A-15.
- Words: templates A-08…A-16.
- Reachable: yes.

### C-15 · Invoice, PO and VO templates — the editor
- Where: `DTT:165-175, 207-221`; `IPE:1-548` (`normaliseBody` `:93-113`, preview sample `:118-147`, first-load effect `:184-201`, handlers `:203-269`, list `:272-313`, rich-text blocks `:381-401`, *Display* card `:403-479`, preview `:515-548`); migrations `168`, `170`; tests `src/__tests__/phase2a-vo-templates.test.ts`, `invoice-po-editor-init-effect.test.ts`.
- Entry: the *Invoice*, *Purchase Order* and *Variation Order* tabs.
- Does: a template list (star = default) and an editor: *Template name*; *Header note*, *Terms & Conditions*, *Footer note* (each the shared rich-text editor, merge-field palette on); a *Display* card with *Accent color (override)* (free-text hex) and switches — Invoice: *Show bank details*, *Show amount paid*, *Show balance due*; PO: *Show bank details*, *Show acceptance terms*; VO: *Show acceptance terms*; an *Edit* / *Preview* switch that runs the real finance renderer on a made-up document (INV-0001 / PO-0001 / VO-0001, S$ figures, the studio's branding and bank details).
- Rules:
  - A body missing a key reads as: bank details on for invoices only, amount paid and balance due on, advance payment on for POs (no control exists for it), acceptance terms on for POs and VOs (`IPE:93-113`). The seeds wrote studio-wide defaults *"Default Invoice"*, *"Default PO"*, *"Default VO"* with every block empty.
  - Save: `POST` (new) or `PATCH`, with `bodyJson` and `companyId` = the scope; `isDefault` keeps the row's flag, or is `true` when the scope had no template (`IPE:217-237`). The name is required (Save disabled). *Set as default* clears only that scope's other default. *Delete* (non-default rows only) soft-deletes after a browser confirm; the server refuses the default (409).
  - **"+" (New template) only works on an empty list.** It clears the selection, and the first-load effect immediately re-selects the default and reloads its body whenever the scope holds any template (`IPE:184-201, 210-215`). With the seeds in place, a second invoice, PO or VO template cannot be started here.
  - The merge-field palette is offered in every block, but the finance renderer inserts the stored HTML as-is (`BDV:335-339, 528-533, 569-573`) — no `{{token}}` is ever replaced in these documents (C-16).
- Data: `studio_document_templates` `type ∈ invoice · po · vo`; `body_json` = `InvoicePOTemplateBody` (`src/types/app.ts:1813-1829`).
- States: *"Loading…"*; empty *"No templates yet. Click + to create one."*, or for an entity without an override *"No override yet. Currently using studio default — edit below and save to customise for this entity."*; *"Saving…"*.
- Words: *"Templates"*, title *"New template"*, *"Template name"*, placeholder `e.g. Standard {Invoice | Purchase Order | Variation Order}`, draft names `New {type} template` and `{type} — entity override`, *"Reset to studio default"* (title *"Discard local edits, load the studio-wide default"*), *"Delete"*, *"Set as default"*, *"Save"*, *"Edit"*, *"Preview"*; block help *"Appears between the recipient block and the line items. Use it for a per-document greeting, scope statement, or project reference."*, *"Appears below the totals as a labelled block. Use it for payment terms, scope exclusions, or limited-warranty text."*, *"Appears above the "Generated by" attribution. Good for thank-you messages or company-wide disclosures."*; *"Display"* · *"Fine-tune which sections appear on the rendered document."*; *"Accent color (override)"* · *"Leave blank to inherit the entity / studio branding color."*; switch help per `IPE:434-476` (e.g. *"Hidden automatically when the invoice is paid in full."*); confirm *"Delete this template? This cannot be undone."*; toasts *"Template saved"*, *"Save failed"*, *"Default template updated"*, *"Could not change default"*, *"Template deleted"*, *"Delete failed"*, *"Loaded studio default — click Save to apply to this entity"*.
- Reachable: yes.

### C-16 · Invoice, PO and VO templates — where they print
- Where: `src/app/(main)/finance/invoices/[id]/preview/page.tsx:57-65`; `src/app/(main)/finance/pos/[id]/preview/page.tsx:39-45`; `src/app/(main)/finance/vos/[id]/preview/page.tsx:56-63`; `src/app/api/homeowner/projects/[id]/invoices/[invoiceId]/route.ts:136-162`; `src/components/homeowner/portal-invoice-view.tsx:118-141`; `BDV:236-243, 335-339, 507-523, 528-539, 569-573`; `src/components/finance/InvoiceQuickView.tsx`.
- Entry: Finance › an invoice, PO or VO › full-screen preview; the homeowner portal's invoice page.
- Does: resolves the default template for the document's entity (entity → studio-wide → none) and hands its `body_json` to the finance renderer, which draws the header note above the lines, a *"Terms & Conditions"* block and the footer note below the totals, the accent colour, and the amount-paid / balance-due / bank-details switches.
- Rules:
  - *Show bank details* works on invoices only — the renderer draws bank details only for `type === "invoice"` (`BDV:539`), so the PO switch does nothing.
  - *Show acceptance terms* (PO, VO) and the PO's advance-payment flag are saved and read by nothing (grep: the type and the editor only).
  - *Show balance due*'s help promises the row is hidden when the invoice is paid in full; the renderer shows *"Balance Due"* whenever anything was paid and the switch is on, a zero balance in green (`BDV:507-523`).
  - Merge fields print literally (C-15).
  - The finance quick-view modal renders without the template.
  - Finance itself is outside this slice; recorded so the reach of an Accounts template is known.
- Data: `studio_document_templates.body_json` (`invoice · po · vo`).
- States: —
- Words: *"Terms & Conditions"*, *"Amount Paid"*, *"Balance Due"*.
- Reachable: yes.

### C-17 · Terms & Conditions and Contract templates — the panel
- Where: `DTT:177-193, 232-451`; `src/lib/queries/document-templates.ts:55-77, 142-219`; `src/app/api/document-templates/records/route.ts:24-119`, `records/[id]/route.ts:17-121`, `set-default/route.ts:19-67`; templates C-48, C-52, A-71…A-74.
- Entry: the *Terms & Conditions* and *Contract* tabs.
- Does: a list (star = default; default first, then A–Z) and an editor: *Template name*; the rich-text editor with its six-token palette; an *Edit* / *Preview* toggle whose preview fills sample values (*John Tan*, *Arthaus Studio*, *S$45,800*, *123 Bukit Timah Rd, #08-12*, *15 May 2026*, today's date); *Delete* and *Set as default* on non-default rows; *Save*.
- Rules:
  - First load selects the default. **"+" (New template) does not work while any template exists**: it clears the selection and the load effect at once re-selects the default (`DTT:245-252, 261-266`) — the same defect as C-15. A seeded studio cannot start a second T&C here; extra contract templates arrive only through the contract flow's *Save as template* (templates C-54).
  - A template written while the list is empty is saved **not** default (`isDefault: selected?.isDefault ?? false`, `DTT:277`), so it reaches no client until *Set as default* is pressed (C-18) — unlike C-15, where the first template becomes the default.
  - Save posts `bodyHtml`, `variables: {}`, `config: {}`, `bodyReactComponent: null` and no `companyId` — wiping the seeded `variables` map (nothing reads it) and never moving a row between entities. A duplicate name fails on the table's unique index and the raw database message becomes the toast.
  - *Set as default* sends no `companyId`, so the server first clears the default of every row of the type — studio-wide and every entity's — then promotes the pick (`set-default/route.ts:42-45`).
  - *Delete* soft-deletes after a browser confirm; the server refuses the default (409 *"Cannot delete the default template. Set a different template as default first."*).
- Data: `studio_document_templates` `type ∈ tnc · contract`, `body_html`.
- States: *"Loading…"*; *"No templates yet. Click + to create one."*; *"Saving…"*.
- Words: tab copy *"The terms a client agrees to when signing. Use the merge fields to drop in client name, quote total, and other dynamic values — they're replaced when the client opens the signing link."* and *"The signed contract document. Merge fields are filled in automatically when you generate a signing link for a client."*; *"Templates"*, title *"New template"*, draft names *"New Terms & Conditions"* / *"New Contract"*, *"Template name"*, placeholder `e.g. Standard {title}`, *"Preview"* / *"Edit"*, *"Preview shows what the client sees with sample values filled in."*, *"Delete"*, *"Set as default"*, *"Save"*; confirm *"Delete this template? This cannot be undone."*; toasts *"Template saved"*, *"Save failed"*, *"Default template updated"*, *"Could not change default"*, *"Template deleted"*, *"Delete failed"*.
- Reachable: yes.

### C-18 · Where the default T&C and contract actually reach a client
- Where: `RS:485-510` (reads, merge values), `:532-564` (picker path), `:565-630` (auto-compose); `src/components/leads/quote-document-editor.tsx:4388-4391, 4933-4958`; contracts B-13, B-21, B-22, B-23; templates C-53, C-54.
- Entry: sending a quote for signature; the contract flow; the legacy quote section editor.
- Does: three routes:
  1. **Signing link, auto-compose** — the quote, then the studio's default active `tnc` (titled with the template's name; the client must scroll to its end and tick *"I have read and accept the Terms & Conditions."*), then the composed or default `contract` (carries the signature). Merge values: `client_name` (as typed in the send form), `studio_name`, `quote_total`, and `current_date` = `start_date` = today as `YYYY-MM-DD`; every other token becomes empty.
  2. **Contract flow › Compose** — lists the contract templates read-only, resolves variables server-side from the lead, its approved quote and entity (templates C-54; contracts A).
  3. **Legacy section editor** — *"Insert default T&C"* copies the default T&C's HTML, tokens unreplaced, into a quote's *terms_conditions* section (whether the PDF's own `{token}` pass later fills some of them is Uncertain 15).
- Rules:
  - The everyday *"Send for digital signature"* always posts the picker's document list, which is never empty (the quote is in it), so the server takes the picker path and attaches **neither** default; auto-compose runs only on *"Regenerate link"* (contracts B-21, B-23). The tab copy's claim that these are the terms "a client agrees to when signing" is true only after a regenerate.
  - The Accounts preview promises values signing does not fill: *Project address* prints empty, *Start date* prints today's ISO date, and the seeded contract's `{{company_registration}}` / `{{company_address}}` print empty on the signing path (contracts B-13) while the Compose path resolves them.
  - The signing read filters `is_default` and `is_active` but not the entity, via `maybeSingle()` (`RS:485-502`).
- Data: `quote_signature_requests.documents` (hand-off D).
- States: —
- Words: *"Insert default T&C"* (title *"Replace the current T&C body with the studio's default copy."*); placeholder *"Click 'Insert default T&C' to use your studio's default copy, or type your own."*
- Reachable: yes (auto-compose: *Regenerate link* only).

---

## Signing Documents

### C-19 · The library screen
- Where: `ACC:1378-1379`; `SDT:591-815` (list `:772-783`, row `:543-587`); `src/app/api/signing-documents/route.ts:6-113`; `src/app/api/signing-documents/upload/route.ts:11-67`; `src/lib/queries/signing-documents.ts:45-173`; contracts B-01…B-04, B-10, B-11.
- Entry: *Quotes & Pricing* › *Signing Documents*.
- Does: the studio's shelf of reusable PDFs and rich-text documents that the signing send form can add to a request: a list (newest first; title, *PDF* / *Rich text*, *Scroll* / *Accept* badges when on, edit, delete), *"Add document"* › *"Upload PDF"* · *"Create document"*, and a *"Viewing documents for"* select when the studio has two or more active entities.
- Rules: all four roles, session-only routes (C-02). No search, ordering, default set, "required" flag, usage count, version or author (contracts B-03, B-09). An entity view lists that entity's rows plus the studio-wide ones; a row never shows which entity it belongs to (contracts B-04).
- Data: `studio_signing_documents` (contracts B-02; hand-off D); bucket `signing-documents`, created by hand per environment (contracts B-12).
- States: contracts B-03 (three skeleton rows, error card, empty card).
- Words: *"Signing Documents"* · *"Build a library of reusable signing documents — PDFs and rich-text — that can be assembled into multi-document signing flows for your clients."*; the rest in contracts B-03, B-04.
- Reachable: yes.

### C-20 · Adding a document — upload or write
- Where: `SDT:250-533`; contracts B-05, B-06.
- Entry: *"Add document"* › *"Upload PDF"* or *"Create document"*.
- Does: *Upload PDF* stores a PDF (≤ 5 MB, checked in the browser and again on the server) with a title pre-filled from the file name; *Create document* saves a title, a rich-text body and two gate switches.
- Rules: the two paths default the gates oppositely. An upload takes the table defaults — scroll on, accept on, *"I have read and agree to this document"* — and its dialog has no gate controls; a written document starts with both switches **off** and the label *"I have read and agree to the above document."*. The same library therefore holds documents with opposite behaviour depending on how they were added.
- Data: `POST /api/signing-documents/upload` (multipart), `POST /api/signing-documents` (rich text only).
- States: *"Uploading…"*, *"Creating…"*.
- Words: contracts B-05, B-06.
- Reachable: yes.

### C-21 · Editing, deleting, and the entity a document belongs to
- Where: `SDT:116-239, 617-626`; `src/app/api/signing-documents/route.ts:56-113`; contracts B-04, B-07, B-08.
- Entry: a row's pencil or bin.
- Does: edit changes title, gates and label (and the body of a rich-text document); delete soft-deletes (`is_active = false`).
- Rules: an uploaded PDF can never be replaced; a document's entity cannot change after creation (PATCH ignores `companyId`); delete says *"cannot be undone"* yet only hides the row, with no restore view and no check for pending requests that use it. Edits never reach requests already sent — each request copied the document when it was picked (contracts B-17, B-22).
- Data: `studio_signing_documents`.
- States: *"Saving…"*.
- Words: contracts B-07, B-08.
- Reachable: yes.

### C-22 · What the library feeds — and the second shelf beside it
- Where: `src/components/leads/signing/signing-document-picker.tsx` (contracts B-15…B-20); `RS:532-564`; contracts B-09, B-13, B-22, B-23.
- Entry: the lead's Contract & Signing send form › *"From library"*.
- Does: nothing in the library is pre-selected for any send; a document reaches a client only when someone adds it to that send's list. The server copies what the browser sends; rich-text documents get the five merge values, PDFs are untouched.
- Rules: the library and the T&C / Contract document templates (C-17) are two shelves for the same kind of text, reached by opposite routes — the library only through the picker, the default T&C only through auto-compose on *Regenerate link* (C-18). A studio that keeps its terms as a library document must add them by hand to every send; one that keeps them as the default T&C template gets them only on a regenerated link. Every PDF uploaded from the send form joins the library permanently (contracts B-18).
- Data: `quote_signature_requests.documents`.
- States: —
- Words: *"From library"*.
- Reachable: yes.

---

## Packages

### C-23 · The Packages screen
- Where: `ACC:1381-1382`; `QTT:26-196`; `src/lib/queries/studio-quote-templates.ts:70-104, 435-483`; `src/app/api/quotes/assemblies/route.ts:30-99, 101-184, 186-236`; templates C-19…C-21; test `src/__tests__/accounts-quote-templates-tab.test.tsx`.
- Entry: *Quotes & Pricing* › *Packages* (`?tab=quote-templates`; `?tab=assemblies` redirects, C-01).
- Does: two sections — *"My packages"*: one card per studio package (name, description, region and property-type badges, *"Edit"*, *"Delete"*) and *"New package"*; *"Platform packages"*: `is_system` rows with a *"Platform"* badge and *"Duplicate to my studio"*.
- Rules: a card shows neither the package's section (category), its item count nor its total — the quote editor's picker does (templates C-06); no search, filter, sort (newest update first) or usage count; open to every role (C-02). The list call sends `studioId` from the browser and the route puts it into its `studio_id.eq.{id},is_system.eq.true` filter in place of the session's (`route.ts:67-78`), leaving the scoped client's RLS as the only fence (hand-off D). Whether platform rows can appear at all is open (templates C-20, C-22).
- Data: `studio_assemblies` (templates C-01).
- States: *"Loading…"*; *"No packages yet"* + *"Build a package from scratch here, or open the Quote Designer and choose Save as package from the Add menu."* + *"Create your first package"*; *"No platform packages yet."*
- Words: *"My packages"* · *"Re-usable starter packages built by your studio. Apply them to any lead from the Quote Designer."*; *"Platform packages"* · *"Qanvast-curated starter packages. Duplicate one to your studio, then customise it freely."*; toasts *"Package deleted"*, *"Failed to delete package"*, *"Package duplicated to your studio"*, *"Failed to duplicate package"*.
- Reachable: yes.

### C-24 · New, edit, delete, duplicate
- Where: `QTT:65-71, 83-86, 181-193`; `src/app/api/quotes/assemblies/route.ts:221-236`; templates C-16, C-17, C-18, C-19, C-20, C-23.
- Entry: the card buttons and *"New package"*.
- Does: *New package* and *Edit* open the package editor (templates C-16: name, description, free-text region *"SG / MY / AE / IN"*, free-text property type, tags, the quote grid limited to what a package can store); *Delete* hard-deletes at once; *Duplicate to my studio* copies a platform row as `{name} (Copy)`.
- Rules: *Delete* has no confirm, no undo and no usage check; the DELETE route does not check `is_system` (the browser hook refuses platform rows; RLS is the backstop). Region and property type are typed freely here but act as exact-match filters in the quote editor's picker — a package tagged *HDB 3-Room* is hidden on every lead of another type, and a typo hides it everywhere (templates C-05). The `quote_template_edit` permission seeded for packages is read by nothing (templates C-23).
- Data: `studio_assemblies`.
- States: *"Loading package…"*, *"Saving…"* (templates C-16).
- Words: templates C-16, C-19, C-20.
- Reachable: yes.

### C-25 · What a package does downstream
- Where: templates C-05…C-11, C-24; quote-editor A-99.
- Entry: the quote editor's "+ Add" › *"Add package"*, or *"Start from a package"* on an empty quote.
- Does: the picker lists studio and platform packages filtered to the lead's region and property type (or rows with neither); applying **appends** the package's lines to the open quote as one undo step.
- Rules: refused on a submitted, approved, sent or signed quote; no de-duplication; each line keeps its own category, else takes the package's, else *"Others"*; sub-categories ride along only while the studio flag *"Carry price-book subcategories onto quotes"* is on (quote-editor B-88); `last_used_at` is never bumped on this path, so nothing ranks packages by use (templates C-24).
- Data: `studio_assemblies` → `quote_line_items` (through the editor's autosave).
- States: —
- Words: templates C-06, C-08, C-09.
- Reachable: yes.

---

## Quote Rules

### C-26 · The rules list
- Where: `ACC:1387-1388`; `QRT:347-533`; `src/lib/queries/quote-generation-rules.ts`; `src/app/api/quote-generation-rules/records/route.ts:56-80`; templates C-45.
- Entry: *Quotes & Pricing* › *Quote Rules*.
- Does: a header, *"Add Rule"*, and one card per active rule: name, description, up to three project-type badges plus `+{n}`, or *"Any type"*; `{n} item(s)`; the card expands to its numbered lines (`description`, category, `qty {n} · ${price}`); pencil and bin.
- Rules: the list is in creation order (`created_at` ascending), which is also the precedence when two rules add the same line (templates C-44) — there is no way to reorder, pause (every save writes `isActive: true`) or duplicate a rule. Prices print with a hard-coded `$`.
- Data: `quote_generation_rules` (templates C-43).
- States: *"Loading rules…"*; *"No rules yet"* · *"Create a rule to auto-fill quotes based on project type."* · *"Create your first rule"*.
- Words: *"Quote Generation Rules"*; *"Define rules that auto-populate the Quote Digitizer with default line items when a lead matches a specific project type. Click Generate Starter Quote inside the digitizer to apply them."* (the button is labelled *"Starter Quote"*); *"Add Rule"*, *"Any type"*, *"Line Items"*, titles *"Edit"*, *"Delete"*.
- Reachable: yes.

### C-27 · The rule dialog
- Where: `QRT:49-345`; `src/data/lead-bucket-config.ts:294-301`; `src/components/leads/lead-detail-drawer.tsx:635, 2751`; templates C-43, C-45.
- Entry: *"Add Rule"*, a card's pencil.
- Does: *Rule Name* (required), *Description*, *"Triggers when project type is…"* chips (none = any), and *"Line Items to Insert"* rows — *Description*, a *"Price Book"* picker (search box, first 40 matches), *Category* (free text), *Default Qty* (step 0.5), *"Unit Price ($)"* (optional, stored in cents).
- Rules:
  - The chips are six hard-coded project types (`PROJECT_TYPES`: *Renovation-Full Home*, *New-Full Home*, *Renovation-Partial*, *New-Partial*, *Commercial*, *Others*), while a lead's project type comes from the studio's own Accounts › Projects › *Project Types* list (`useTaxonomies(…, "project_type")`, drawer `:635`). A studio that renamed or added project types cannot target them, and rules on the six names never fire on leads typed with the new ones.
  - The price-book picker lists every item — archived, pending and rejected included — and searches description and category but not the item's name, although it displays `name || description`. A pick keeps the book item's id, `name || description` as the line text, its category and its price; unit, cost, markup and the name / description split are dropped.
  - *Category* is free text, not the Quote Categories list; `defaultMarginBps`, `notes` and `requiredScopeItems` have no control (the last is always sent `[]`: *"scope-based matching reserved for v2"*).
  - Validation: a name, and a description on every line; a rule with no lines saves.
- Data: `quote_generation_rules.project_types`, `line_items` (`{ price_book_id?, description, category?, default_qty, default_unit_price_cents? }`).
- States: *"Saving…"*.
- Words: *"New Quote Generation Rule"* / *"Edit Rule"*, *"Define when this rule fires and which line items to insert into the quote."*, *"Rule Name"* (placeholder *"e.g. 4-Room HDB — Living Room package"*), *"Description"* *"(optional)"* (*"Short note about when to use this rule"*), *"Triggers when project type is…"* *"(leave empty to match any)"*, `Selected: {types}`, *"Line Items to Insert"*, *"Add Item"*, *"No items yet. Click "Add Item" to start."*, title *"Pick from price book"*, *"Price Book"* / *"Linked"*, *"Search price book…"*, *"No items found"*, *"Category"* (*"e.g. Carpentry"*), *"Default Qty"*, *"Unit Price ($)"* (*"Optional"*), *"Cancel"*, *"Create Rule"* / *"Update Rule"*; toasts *"Rule name is required."*, *"All line items must have a description."*, *"Rule created."*, *"Rule updated."*, *"Couldn't save rule. Try again."*
- Reachable: yes.

### C-28 · Saving, deleting, and who may
- Where: `QRT:92-111, 368-378`; `src/app/api/quote-generation-rules/records/route.ts:81-112`, `records/[id]/route.ts:17-79`; `src/lib/queries/quote-generation-rules.ts:1-12`; templates C-47.
- Entry: the dialog's save; a card's bin.
- Does: creates or updates through the scoped routes; delete sets `is_active = false` after `confirm('Delete rule "{name}"?')`.
- Rules: no restore. Session only — any role creates, edits and deletes rules (the hooks' header: *"All mutations are owner-only; callers are responsible for gating the UI"*; this tab gates nothing), yet only an **owner** sees the *Starter Quote* button that applies them (C-29).
- Data: `quote_generation_rules.is_active`.
- States: —
- Words: *"Rule deleted."*, *"Couldn't delete rule."*
- Reachable: yes.

### C-29 · What a rule does — "Starter Quote"
- Where: `QDD:1401-1402, 4064-4098, 8493-8505`; `src/lib/quote-rule-engine.ts:29-63`; templates C-44, C-46; quote-editor A-100, B-82.
- Entry: the quote editor's toolbar *"Starter Quote"* — shown to owners only, on an editable quote, when the studio has at least one active rule.
- Does: matches the rules against the lead's project type (scope items always empty) and **appends** every matched line (unit *"lot"*, category else *"Others"*, marked as template-sourced), as one undo step.
- Rules: no de-duplication against lines already on the quote — pressing twice doubles them. A line linked to a book item gets no cost (the save's cost auto-match skips linked lines, quote-editor B-82), so its margin is unknown. Rules with required scope items could never fire (and none can be written, C-27). The toasts send the user to *"Accounts → Quote Generation Rules"*; the menu item is *"Quote Rules"*.
- Data: reads only.
- States: —
- Words: *"Starter Quote"* (title *"Auto-populate line items from quote generation rules"*); toasts in templates C-46.
- Reachable: owners only.

---

## Price Book (the Accounts screen only — the price book's own behaviour is the next audit's)

### C-30 · The Price Book tab and its permissions
- Where: `ACC:1143-1146`; `PBM:54-96, 462-477, 486-517, 578-640, 783-807, 960-1010`; `src/components/price-book/tabs.tsx`; `src/app/api/studio-config/price-book/reorder/route.ts:13-43`; quote-editor B-57, B-63, B-64.
- Entry: *Quotes & Pricing* › *Price Book* (`/accounts?tab=catalogue`; sub-tab `?pb=items | pending | drift | imports`, so notifications can deep-link).
- Does: four sub-tabs — *Items*, *Pending* (count badge), *Drift* (count badge), *Imports* — under a read-only banner for members without `pricebook.edit`.
- Rules:
  - `pricebook.edit` (default owner · admin; role grants and member overrides win) hides *Import CSV*, *Vendor markup config*, *Add Item*, *Seed from {country}*, the Imports tab's *Import items* card and the row menu's *Archive* / *Delete permanently*.
  - It does not hide *Export CSV*, the row click and *Edit item* (the editor opens; its save answers 403), *View history*, the selection bulk bar (per-item 403s), *"Review {n} new items"*, or the drag handles.
  - Drag is a real hole: every row is draggable and the reorder route checks only the session, so a read-only member's drop saves a new order **and**, when dropped on another category's row, re-files the item into that category (`reorder/route.ts:26-31`) — with no price-history entry (quote-editor B-65).
  - *"Manage →"* to Quote Categories needs edit rights, though the Quote Categories screen itself is open to every role (C-02, C-06).
- Data: `studio_price_book` (quote-editor B-58).
- States: *"Read-only — only owners/admins can edit the price book."*
- Words: *"Items"*, *"Pending"*, *"Drift"*, *"Imports"*; aria *"Price Book sections"* (quote-editor B-57).
- Reachable: yes.

### C-31 · Items list and toolbar
- Where: `PBM:142-310, 486-640, 646-1027`; `src/app/api/studio-config/price-book/route.ts:54-136`; quote-editor B-59, B-63, B-64, B-69, B-71, B-84.
- Entry: the *Items* sub-tab.
- Does: stats line (*"{n} active"*, *"{n} archived"*, *"{n} categories"*, *"Manage →"*, *"{n} {cc} benchmarks"*, drift pill); search, *"All Categories"*, *Active* / *Archived*; toolbar icons *Import CSV*, *Export CSV*, *Vendor markup config*; *"Review {n} new items"*; *"Add Item"*; *"Seed from {country}"* on an empty book with market rates; items grouped under category headers A–Z with count and average price; per-row menu; bulk bar (*Archive* / *Restore*, *"Move to category…"*).
- Rules: all as quote-editor B-59 (list, grouping, sort within a group), B-63 (archive and delete), B-64 (drag and move), B-69 (drift), B-71 (seed), B-84 (suggestions). The category filter offers only active Quote Categories; items filed under an inactive (renamed or deleted) category still group under its old name (C-07).
- Data: `GET /api/studio-config/price-book` (every row, archived included, 1000-row pages).
- States: quote-editor B-59.
- Words: quote-editor B-59.
- Reachable: yes.

### C-32 · Adding and editing an item
- Where: `src/components/accounts/price-book-item-editor.tsx`; `src/app/api/studio-config/price-book/route.ts:145-256`, `[id]/route.ts:52-158`; quote-editor B-60, B-61, B-66, B-67, B-93.
- Entry: *"Add Item"*, a row click, *Edit item*, Drift *"Suggest"*, Pending *"Open in editor"*.
- Does: the side-panel item editor (quote-editor B-60): name, SKU (`PB-NNN`, read-only), description, category (the studio's plus the 19 built-in names, C-08), sub-category, the cost / markup / sell triangle, unit, cost type, waste %, vendors, volume tiers, spec link, tags, notes, image.
- Rules: a member with `pricebook.edit` but without the literal owner / admin tag creates or edits *pending* items and raises an approval task (quote-editor B-61). Picking a built-in name the studio does not have creates (or revives) that Quote Category (C-08).
- Data: `studio_price_book`, `price_book_pricing_tiers`, `price_book_history`, `tasks` (quote-editor B-58, B-61, B-65, B-93).
- States: quote-editor B-60.
- Words: quote-editor B-60.
- Reachable: yes.

### C-33 · Import, export, vendor markup, seed
- Where: `PBM:1126-1224, 1254-1260`; `src/components/accounts/price-book-csv-dialog.tsx`; `src/app/api/price-book/parse/route.ts`; `src/app/api/price-book/export/route.ts`; `src/components/accounts/vendor-markup-dialog.tsx`; `src/app/api/studio-config/price-book/vendor-markup/route.ts:13-38`; quote-editor B-68, B-71…B-75.
- Entry: the toolbar icons; the *Imports* sub-tab's two cards.
- Does: *Import items* — CSV parsed in the browser or AI parse of PDF / image / Excel / pasted text, then one POST per row (quote-editor B-72, B-73); *Export items* — `price-book-export.csv` of every row, archived included, despite the card's *"every active item"* (quote-editor B-75); *Vendor markup config* — one markup % onto every active item whose **primary** vendor matches, sell price untouched (quote-editor B-68); *Seed* (quote-editor B-71).
- Rules: the vendor-markup and export routes check only the session (edit rights are a UI gate); the import's category step maps only onto existing active categories and drops unknown ones (quote-editor B-72) while the AI parse never sees the studio's list at all (C-09). The Quote Categories screen carries a second, older importer (C-10).
- Data: `studio_price_book`, `vendors.default_markup_percent`.
- States: quote-editor B-72.
- Words: *"Imports & exports"* · *"Bring items into the price book from a CSV, PDF, or image — or export a copy for back-office use."*; *"Import items"* · *"Upload a CSV, PDF, or image. The parser auto-detects vendors and de-duplicates."*; *"Export items"* · *"Download every active item as a CSV. Useful for back-office reconciliation."*; the rest in quote-editor B-68, B-72.
- Reachable: yes.

### C-34 · Pending, Drift and History
- Where: `PBM:1072-1124, 1227-1235`; `src/components/price-book/pending-tab.tsx`; `src/components/price-book/drift-tab.tsx`; `src/components/accounts/price-book-history-drawer.tsx`; quote-editor B-62, B-65, B-69.
- Entry: the *Pending* and *Drift* sub-tabs; a row's *View history*.
- Does: the approval queue for items from untrusted editors (approve / reject with a required comment; owner / admin tags only); items priced more than ±15 % outside the region's market range with a *"Suggest"* pre-fill; an item's change log (latest 50).
- Rules: quote-editor B-62, B-65, B-69 — hand-off to the price book audit.
- Data: `studio_price_book.approval_status`, `platform_market_rates`, `price_book_history`.
- States: *"Nothing to review"*, *"All prices in range"*, *"No changes recorded yet"*.
- Words: quote-editor B-62, B-65, B-69.
- Reachable: yes.

---

## Quote Approval Rules

### C-35 · The form
- Where: `ACC:322-329` (defaults), `:396-414` (load once), `:489-518` (save), `:1153-1265` (form); `src/types/app.ts:610-616`; `TR:1484-1490`; quote-editor B-55, C-29.
- Entry: *Quotes & Pricing* › *Quote Approval Rules* (`?tab=approval`).
- Does: two number inputs — *"Auto-approve quotes below ($)"* (default 50000) and *"Require approval above ($)"* (default 100000); *"Default Approver Role"* — a select of the studio's assignable roles by **name** (value = the role's name), or, when the studio has no roles, *"Finance"*, *"Admin"*, *"Senior ID"*, *"Studio Owner"*; *"Rejection Reasons"* — chips (defaults *"Margin too low"*, *"Client credit risk"*, *"Resource unavailable"*, *"Scope unclear"*) with × and an inline *"New reason…"* input (Enter or *"Add"*); *"Save Approval Rules"*.
- Rules: both thresholds ≥ 0 and auto-approve ≤ require-approval (toasts below); a reason already in the list (case-insensitive) is refused. The numbers are currency-less under a hard-coded *"($)"* (the multi-country notes flag that 100,000 AED and 100,000 EGP read the same, `docs/features/multi-country/README.md:416`). `notify_on_rejection` is saved (default true) with no control. A saved role name that later disappears from the role list stays in state and is re-saved, though the select shows another option. The form loads once per page visit (`ACC:396-414`).
- Data: `studios.settings.quote_approval = { auto_approve_below, require_approval_above, approver_role, notify_on_rejection, rejection_reasons[] }` (quote-editor D-07).
- States: *"Saving..."*, *"Saved!"*.
- Words: *"Quote Approval Rules"* · *"Set thresholds for auto-approval and required sign-offs."*; *"Quotes under this amount are auto-approved."*; *"Quotes above this need explicit sign-off."*; *"Pulled from your Roles & Permissions setup."* (the link opens that tab); title *"Remove reason"*; toasts *"Thresholds must be zero or positive"*, *"Auto-approve threshold must be lower than the review-required threshold"*, *"That reason already exists"*, *"Approval rules saved"*, *"Failed to save approval rules"*.
- Reachable: yes.

### C-36 · What is saved, and what reads it
- Where: grep for `quote_approval`, `quoteApproval`, `auto_approve_below`, `rejection_reasons`, `approver_role` over `src/` (only `ACC`, `TR:1484-1490` and the two type files); quote-editor B-55, C-29, D-07; `docs/prd.md:472-478, 993-995`.
- Entry: —
- Does: nothing outside this form reads the object.
- Rules: no amount auto-approves or forces review; the role never routes an approval; the reasons are never offered when a quote is rejected (the reject box is free text, quote-editor C-25); there is no margin floor or discount cap anywhere (quote-editor C-29). The screen's help text — *"Quotes under this amount are auto-approved."* — describes behaviour that does not exist. The PRD marks the feature ✅ while noting that approval is task-based instead, and names the key `settings.quoteApproval` (the page writes `quote_approval`). The Flo seeds write yet another shape, `{enabled, required_roles[]}` (quote-editor D-07).
- Data: `studios.settings.quote_approval`.
- States: —
- Words: —
- Reachable: the form yes; its effect none.

### C-37 · The approval that runs is configured elsewhere
- Where: `ACC:1610-1705` (Workflow › *Workflow Rules*); `src/components/accounts/workflow-approver-selector.tsx`; `AC:441-517`; quote-editor C-03, C-17, C-18, C-31.
- Entry: Accounts › Workflow › *Workflow Rules* › *"Quote approval required"* (outside this group).
- Does: the live rule: approval on (default) → a non-approver's submit lands *submitted* with a QuoteApproval task; approvers = owners plus the members picked in that toggle's approver list; approval off → submit approves at once (quote-editor C-03, C-17).
- Rules: two screens in two groups talk about quote approval and only the Workflow one works; neither has an amount threshold. The role permissions *Submit for review* / *Approve quote* are computed in the editor and not used (quote-editor C-31). The approver gates disagree across surfaces (quote-editor C-18).
- Data: `studios.settings.workflow.quoteApprovalRequired`, `.approvers.quoteApproval` (quote-editor D-07).
- States: —
- Words: *"Quote approval required"* · *"Require owner sign-off before quotes are sent to clients"* (quote-editor C-17).
- Reachable: yes.

---

## Quote Sharing

### C-38 · Sharing Methods
- Where: `ACC:1451-1519`; quote-editor C-57, C-58, C-60; templates A-07, B-94.
- Entry: *Quotes & Pricing* › *Quote Sharing* (`?tab=quote-sharing`).
- Does: three radio cards; a click saves `quoteSharingMethod` at once (`both` · `standalone` · `portal`).
- Rules: shown selection = saved value else `both` — but the saved value never reaches the screen (C-41), so *Both Methods* always shows selected. Nothing else reads the key: the quote editor's Share menu always offers both *"Copy preview link"* and *"Send to homeowner portal"* (quote-editor C-57, C-58). The TypeScript type says `"link" | "pdf" | "both"` (`src/types/app.ts:624-625`), not what the screen writes. Buttons are disabled while any settings save runs.
- Data: `studios.settings.quoteSharingMethod`.
- States: —
- Words: *"Quote Sharing"* · *"Configure how quotes are shared with homeowners."*; *"Sharing Methods"* · *"Choose which sharing options your team sees when sharing quotes with homeowners."*; *"Both Methods (Recommended)"* · *"Team can choose between standalone link or homeowner portal link when sharing. Best for flexibility."*; *"Standalone Link Only"* · *"Only show the quick shareable link option. Best for studios that don't use the homeowner portal."*; *"Homeowner Portal Only"* · *"Only show the portal link option. Best for studios that want all clients using the portal."*; toasts *"Sharing preference updated"*, *"Failed to save sharing preference"*.
- Reachable: the screen yes; its effect none.

### C-39 · Standalone Link Expiry
- Where: `ACC:1523-1558`; `RS:358`; `src/types/app.ts:626-627`; quote-editor C-73, D-21; contracts C-72.
- Entry: the same screen.
- Does: five chips — *7*, *14*, *30*, *60*, *90 days*; a click saves `quoteLinkExpiryDays`.
- Rules: shown selection = saved value else 30 — always 30 in practice (C-41). Nothing reads the key: standalone preview links never expire, and signing links always expire 7 days after creation (`RS:358`; quote-editor C-73, D-21 — which corrects templates D-14). The type's comment calls it the number of days "a quote signing link remains valid (default: 30)".
- Data: `studios.settings.quoteLinkExpiryDays`.
- States: —
- Words: *"Standalone Link Expiry"* · *"How long standalone quote links remain active before expiring."*; `{n} days`; toasts `Link expiry set to {n} days`, *"Failed to save link expiry"*.
- Reachable: the screen yes; its effect none.

### C-40 · Standalone Link Features
- Where: `ACC:1562-1604`; quote-editor C-77; templates B-94, B-101.
- Entry: the same screen.
- Does: four switches, each saved on click as a top-level key `quoteShare_<key>` = the opposite of what is shown: *Show optional item toggles*, *Show payment schedule*, *Show quote variations*, *Show "Powered by OpenMaison"*.
- Rules: a switch reads on unless the saved value is exactly `false` — and the saved value never reaches the screen (C-41), so every switch always shows **on** and every click writes `false`; a studio can switch a feature off in the database but never back on. Nothing reads the keys: the signing page shows optional add-ons whenever optional lines exist (quote-editor C-77), no quote surface prints a "Powered by" line (templates B-101), and no share surface has variation tabs (templates B-94).
- Data: `studios.settings.quoteShare_showOptionalToggles`, `quoteShare_showPaymentSchedule`, `quoteShare_showVariations`, `quoteShare_showPoweredBy`.
- States: switches disabled while any settings save runs.
- Words: *"Standalone Link Features"* · *"Control what homeowners can see and do on the standalone quote page."*; *"Show optional item toggles"* · *"Homeowners can toggle optional add-ons on/off"*; *"Show payment schedule"* · *"Display the payment milestone breakdown"*; *"Show quote variations"* · *"If multiple packages exist, show tabs to compare"*; *"Show "Powered by OpenMaison""* · *"Display the platform attribution in the footer"*; toasts *"Updated"*, *"Failed to save"*.
- Reachable: the screen yes; its effect none.

### C-41 · Why the screen cannot show what it saved
- Where: `ACC:1484, 1531, 1574-1575`; `TR:1473-1596`; `SSR:24-47`; C-04.
- Entry: —
- Does: the screen reads `studioSettings.settings.quoteSharingMethod`, `.quoteLinkExpiryDays` and `.quoteShare_*` from `transformStudioSettings`, which carries none of them (no spread, C-04).
- Rules: after any click the toast confirms the save, the refetch returns the same defaults, and the screen snaps back to *Both Methods* / *30 days* / all switches on. Together with C-38…C-40 the whole tab is write-only: six values saved, none shown back, none read. No test covers it (C-51).
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Quote settings the group does not hold

### C-42 · Quote numbering
- Where: `ACC:3608-3700` (Finance › *Document Numbering*); `src/app/api/quotes/records/route.ts:32-51`; `src/lib/numbering.ts:18-36`; `src/app/studio-setup/page.tsx:154-156, 363`; quote-editor C-50, D-17.
- Entry: Accounts › Finance › *Document Numbering* (outside this group).
- Does: nothing for quotes. Quote numbers are `QT-###` (variations `VO-###`): the studio's highest suffix + 1, padded to three digits, fixed prefix, not configurable (quote-editor C-50). The Finance screen edits invoice, PO and ticket prefixes only.
- Rules: that screen reads `settings.numbering`, which the settings transformer does not carry (C-04), so it always opens on *INV* / *PO* / *T* and its Save writes the three fields as shown — prefixes chosen in Studio Setup are overwritten the first time someone saves there without retyping them. Validation: all three required, ≤ 8 characters, no whitespace, `/`, `\` or `#`. (2.0 has a quote numbering pattern in Settings › Quotes; hand-off E.)
- Data: `quotes.quote_number` UNIQUE per studio; `studios.settings.numbering { invoicePrefix, poPrefix, ticketPrefix }`, `studio_companies.numbering` (quote-editor D-17).
- States: *"Saving..."*, *"Saved!"*.
- Words: *"Document Numbering"* · *"Customize the prefix used for invoices, purchase orders, and tickets."*; *"Invoice Prefix"*, *"PO Prefix"*, *"Ticket Prefix"*, `Preview: {prefix}-0001`, `Preview: {prefix}-2026-000001`, *"Changes apply to new documents only."*; toasts *"All three prefixes are required"*, *"Prefixes must be 8 characters or fewer"*, *"Prefixes can't contain whitespace or slash characters"*, *"Document numbering saved"*, *"Failed to save document numbering"*.
- Reachable: yes (outside the group; quote numbers: not configurable).

### C-43 · Quote validity
- Where: `src/components/leads/drawer-sections/document-info-section.tsx:21-75`; `src/app/api/leads/mutations/[id]/route.ts:60`; quote-editor A-22, C-51.
- Entry: the lead drawer's Document Info; the quote editor's Document info panel.
- Does: one hand-typed *"Quote Valid Until"* date per lead, printed wherever a template asks for it.
- Rules: no studio default validity (no validity-days setting anywhere, grep); every quote of a lead shares the date; nothing expires a quote (quote-editor C-51).
- Data: `leads.quote_valid_until`.
- States: —
- Words: *"Quote Valid Until"*.
- Reachable: yes (not in Accounts).

### C-44 · GST, currency and the issuing entity
- Where: `src/lib/region-config.ts:131-557`; `src/app/(main)/accounts/legal-entities-tab.tsx:189-212`; `src/components/accounts/branding-editor.tsx:336-352`; quote-editor B-34…B-42.
- Entry: Accounts › Studio › *Legal Entities* (hand-off A); Accounts › Branding & Comms › *Studio Branding*; the quote editor's tax switch.
- Does: rate, tax name and currency come from the lead's country (SG 9 % GST, MY 6 % SST, AE 5 % VAT, IN 18 % GST with slabs, EG 14 % VAT); the issuing entity's GST registration sets each quote's default; each lead has an on/off tax switch; Studio Branding holds a currency-symbol override for quote PDFs.
- Rules: no GST, tax or currency control sits in Quotes & Pricing. The entity's tax-rate override is stored and not used on quotes, and per-line rates are overwritten by the quote rate (quote-editor B-37, B-40).
- Data: `studios.country_code`, `leads.country_code`, `studio_companies.gst_registered · tax_rate`, `leads.quote_metadata.gstEnabled`, `studios.settings.branding.currencySymbolOverride`.
- States: —
- Words: *"Currency Symbol on Quotes"* (quote-editor B-42).
- Reachable: yes (outside the group).

### C-45 · Rounding
- Where: `src/lib/quote-round-off.ts`; `src/components/leads/round-off-dialog.tsx`; `src/lib/quote-pdf-layout.ts:244-248`; quote-editor B-43…B-46; templates A-40.
- Entry: the quote editor's *"Round prices"*.
- Does: a per-quote action that rounds unit prices to a step (1, 5, 10, 50, 100; nearest, up or down) as one undo step.
- Rules: no studio rounding rule exists; the grand-total *"Round Off"* knob lives in the template model with no control (templates A-40, quote-editor B-46). (2.0 has a studio rounding setting; hand-off E.)
- Data: `quote_line_items.unit_price`.
- States: —
- Words: quote-editor B-45.
- Reachable: yes (not in Accounts).

### C-46 · Deposit and payment-schedule defaults
- Where: `ACC:128, 1406` (Finance › *Payment Schedules*); `src/components/finance/PaymentScheduleEditor.tsx:1-426`; `src/app/api/finance/records/payment-schedule-templates/route.ts:26-124`; quote-editor C-94, C-95, C-101, C-102, D-16.
- Entry: Accounts › Finance › *Payment Schedules* (outside this group).
- Does: reusable percentage schedules; a new quote starts from the first default template by creation, else the editor's 10 / 30 / 30 / 30.
- Rules: there is no deposit setting in Quotes & Pricing. Several templates can be default at once (the first created wins); the screen is read-only without `payment_schedule.override`, the API is not; four different built-in defaults coexist, and `settings.defaultPaymentSchedule` is a second, dead store (quote-editor C-94, D-16); fixed-amount rows sit behind an API-only flag (quote-editor C-102).
- Data: `payment_schedule_templates`.
- States: quote-editor C-101.
- Words: quote-editor C-101.
- Reachable: yes (outside the group).

### C-47 · Terms and notes defaults
- Where: C-15, C-17, C-18, C-19…C-22; templates C-51; quote-editor D-20.
- Entry: —
- Does: default terms text can live in five places: the default T&C document template (C-17), the signing library (C-19), a text block inside a quote template (templates B), the legacy section editor's *"Insert default T&C"* (C-18), and the invoice / PO / VO *"Terms & Conditions"* block (C-15).
- Rules: none of the five feeds another; which one a client sees depends on the route (C-18, C-22). There is no quote-level notes default — `quotes.notes` has no editor writer (quote-editor D-20).
- Data: as cited.
- States: —
- Words: —
- Reachable: yes.

### C-48 · Markup defaults, discount limits and margin floors
- Where: `src/components/finance/vendor-detail-drawer.tsx:89, 211`; `src/components/accounts/vendor-markup-dialog.tsx`; `PBM:402-425`; quote-editor B-28…B-32, B-47, B-48, B-68, B-71, C-29.
- Entry: —
- Does: a markup default exists only per vendor (`vendors.default_markup_percent`, set in the Finance vendor drawer) and is applied only by the price book's *Vendor markup config* (C-33); *Seed from {country}* uses 20 % when a rate has no typical price (quote-editor B-71); a price-book item's markup is copied onto a line when the item is picked.
- Rules: no studio-wide default markup; no cap on line or document discounts (quote-editor B-28…B-32); no margin floor or below-cost block — only an on-screen warning (quote-editor B-48, C-29); the approval thresholds that might have served as a limit are unread (C-36). Markups ≥ 1000 % pass the UI and fail the database column (quote-editor B-47).
- Data: `vendors.default_markup_percent`, `studio_price_book.markup_percent`.
- States: —
- Words: —
- Reachable: n/a.

### C-49 · Quote switches kept under Workflow, Feature Flags and Branding
- Where: `ACC:1610-1705`; `src/app/(main)/accounts/feature-flags-tab.tsx:87-89, 101-103, 118-120`; `src/app/api/studio-config/features/route.ts`; `RS:286-306`; `src/lib/quote-prepared-by.ts`; quote-editor B-42, B-88, C-17, C-63, C-79, C-102; templates A-90.
- Entry: Accounts › Workflow › *Workflow Rules* and *Feature Flags*; Branding & Comms › *Studio Branding*.
- Does: the quote-affecting switches outside this group:
  - *Workflow Rules*: *"Quote approval required"* + its approver list (C-37).
  - *Feature Flags*: *"Lock quote sharing until approved"* (quote-editor C-63), *"CaseTrust signing step (Singapore only)"* (quote-editor C-79), *"Carry price-book subcategories onto quotes"* (quote-editor B-88).
  - No toggle anywhere (API or data only): `features.canva_editor` (default on, templates A-90), `features.fee_first_milestones` (default off, quote-editor C-102), `branding.quotePreparedByMode` (`team_list · studio_only · first_assignee`, read when a signing link is created, `RS:299-306`).
  - *Studio Branding*: the quote currency-symbol override (quote-editor B-42).
- Rules: a rebuilt Quotes & Pricing area would gather settings from three other groups; every one of them is a session-only write (C-02, hand-off D).
- Data: `studios.settings.workflow`, `.features`, `.branding`.
- States: —
- Words: as cited.
- Reachable: yes.

---

## Docs, tests and dead parts

### C-50 · Docs and in-code copy against the code
- Where: `docs/user-stories/accounts-setup.md:7, 15, 95, 256`; `docs/prd.md:472-478, 993-995`; `AC:123-125`; `QTT:6`; `QRT:6`; `src/lib/queries/quote-generation-rules.ts:4-6`; `DTT:3-12`; `src/types/app.ts:624-627`.
- Entry: —
- Does: lists where the words disagree with the code (code wins):
  - *"an owner or admin defines everything"* (user stories `:7`) — every role can (C-02); the same for the "owner-only" headers and comments (C-02, C-28).
  - The group is listed with *"Work Packages"* (`:15`) — retired 2026-08-19 (C-01).
  - *"Export downloads every active item"* (`:95`) — archived items too (C-33).
  - *"Any role with `pricebook.view` (all four qualify)"* (`:256`) — the permission is never checked (C-02).
  - PRD B.7.6 marks Quote Approval Rules ✅ under key `settings.quoteApproval` — the thresholds do nothing and the key is `quote_approval` (C-36).
  - `DTT`'s header calls a six-kind overlay the *"Terms & Contracts tab"* (C-12).
  - On-screen promises the code does not keep: sub-categories group PDF rows (C-09); the T&C is what a client agrees to when signing (C-18); quotes under a threshold auto-approve (C-36); every Quote Sharing promise (C-38…C-40); invoice balance auto-hides when paid (C-16); PO bank details and acceptance terms switches (C-16).
  - Types: `quoteSharingMethod?: "link" | "pdf" | "both"` and *"days a quote signing link remains valid (default: 30)"* (C-38, C-39).
- Rules: —
- Data: —
- States: —
- Words: as quoted.
- Reachable: —

### C-51 · Tests covering the group
- Where: `src/__tests__/quote-category-description.test.tsx`; `accounts-quote-templates-tab.test.tsx`; `document-templates-scoped-api.test.ts`; `phase2a-vo-templates.test.ts`; `phase2b-quote-pdf-templates.test.ts`; `phase3-template-unification.test.ts`; `invoice-po-editor-init-effect.test.ts`; `signing-documents-library.test.ts`; `nf17-quote-gen-rules.test.ts`; `quote-generation-rules-scoped-api.test.ts`; `price-book-parser.test.ts`; `e2e/accounts-exhaustive-walk.spec.ts:25-33`, `e2e/accounts-role-based-walk.spec.ts:23`, `e2e/document-templates-overlay.spec.ts`.
- Entry: —
- Does: pins that a category save keeps descriptions (and sends null when cleared); the Packages tab's two sections, delete, duplicate and empty state; the document-template routes' session and studio rules; migrations and editor source text for VO / invoice / PO templates (regex tests on files, not behaviour); the quote-rule engine and routes; the AI parse; the library transformer. The two e2e walks only check that each tab renders without a crash.
- Rules: nothing tests the category PUT's deactivate-then-upsert, the T&C / invoice panels' *New* / *Save* / *Set as default*, the Quote Approval Rules or Quote Sharing tabs, the rule dialog, or the price book's gates. The e2e tab lists are stale: they walk `quote-doc-template` (*"Document Template"*, now an empty pane), label `document-templates` *"Document Library"* and `quote-templates` *"Quote Templates"*, keep `assemblies` (*"Work Packages"*), and skip `signing-documents`.
- Data: —
- States: —
- Words: —
- Reachable: —

### C-52 · Retired and dead pieces in the group
- Where: as cited per item.
- Entry: —
- Does: collects what is saved, routed or seeded but never used:
  - Settings saved and read by nothing: `settings.quote_approval` (C-36); the six Quote Sharing keys (C-38…C-41); `showAcceptanceTerms`, `showAdvancePayment` (C-16); `studio_document_templates.variables` (C-17).
  - Permissions defined and never checked: `pricebook.view` (C-02); `quote_template_edit` (C-24; templates C-23).
  - Routes with no caller: `/api/price-book/import`, `/api/quotes/import` (C-08); the package apply RPC routes and hooks (templates C-14, C-15).
  - Seeded and never read: the *"Default Signing Flow"* row (contracts B-24).
  - Code aimed at nothing: the AI parse's `studio_price_book_categories` (C-09); the per-line sub-category quick-pick (quote-editor A-82); packages' `last_used_at` (C-25); rules' `requiredScopeItems`, `defaultMarginBps`, `notes` (C-27).
  - Retired: *"Work Packages"* (`?tab=assemblies` → Packages, C-01); the `quote-doc-template` tab id (C-51).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: dead.

---

## Uncertain / not verified

1. **The "New template" bounce** (C-15, C-17): read from the order of the click handler and the first-load effect; not clicked in a browser. A brief flash of the new draft before the default returns is expected; that the default wins was not observed.
2. **A canva default and the Quote PDF save** (C-14): if a studio's default `quote_pdf` row is a canva body, *Save Templates* / *Set as default* post another `isDefault: true` row before soft-deleting the canva one; the partial unique index on defaults (templates A-76, no `is_active` predicate) should then reject the write (*"Could not save default — try the Save button"* / *"Failed to save document templates"*). Not executed; whether any live studio has a canva default was not checked.
3. **Merge fields printing literally on invoices / POs / VOs** (C-15, C-16): read from the renderer (no substitution) and the chip's stored HTML (`<span data-variable="x">{{x}}</span>`, templates C-49); no document was rendered.
4. **Server-built finance documents** (C-16): only the preview pages, the portal invoice route and the quick view were traced (grep for `templateBody`); a server PDF or e-mail path for invoices / POs that ignores the templates may exist (Finance audit).
5. **Two T&C or contract defaults** (C-13, C-18): the signing read uses `maybeSingle()` with no entity filter, so a studio-wide default plus an entity default would error and drop the document. Accounts cannot create entity T&C / contract rows; whether any exist (imports, SQL, older builds) was not checked (hand-off D).
6. **Quote Sharing and Document Numbering always showing defaults** (C-41, C-42): read from `transformStudioSettings` and the GET route; not observed in a browser; no other hydration path was found by grep.
7. **The category save's partial failure** (C-07): read from the loop; not provoked.
8. **`pricebook.view` never checked** (C-02): grep over `src/`; a role's page map could still hide `/accounts` entirely (hand-off D).
9. **The packages list's `studioId` parameter** (C-23): whether RLS on `studio_assemblies` confines rows regardless of the filter, and whether platform rows are visible at all (templates C-20, C-22) — hand-off D.
10. **Server PDFs reading inactive categories** (C-09): whether a given client-facing PDF comes from that server path or from the editor's stored canonical PDF is templates B-79 / B-81's question.
11. **Tenant seed scripts** (`scripts/tenants/…`, `scripts/seed/…`) may seed categories, templates or approval shapes for single studios (quote-editor D-07 notes Flo's `quote_approval` shape); only the numbered migrations and the admin creation route were read for C-05.
12. **Duplicate `order_index` values in live data** (C-07, C-08): the GET route's comment says one studio had three categories at 0; live data was not queried.
13. **The drag re-file hole** (C-30): read from the route and the row markup; not exercised with a read-only account.
14. **An approver role name no longer in the list** (C-35): how the browser's `<select>` displays an unmatched value was not observed.
15. **"Insert default T&C" tokens at print** (C-18): the Quote PDF's `{token}` pass accepts `{{x}}` and fills known names such as `client_name`, `studio_name`, `quote_total`, but leaves unknown ones like `current_date` in brackets (templates C-50); whether that pass runs over a legacy *terms_conditions* section was not traced.

