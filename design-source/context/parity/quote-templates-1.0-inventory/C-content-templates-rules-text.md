# OpenMaison 1.0 — Quote template module inventory · Slice C: content templates, generation rules, rich-text templates with variables, admin templates, touchpoints

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-24.

Conventions: *Words* are quoted verbatim from code. "Hand-off" = owned by another reader (A document template editor / B canva engine / D data) or a later audit, and only named here.

## Vocabulary (where each word is defined)

- **Quote Template** — a `studio_document_templates` row, `type='quote_pdf'`, whose `body_json` carries an `items` array: a full starter quote (look + T&Cs + a filled pricing table). Locked in `docs/rules/quote-terminology.md:19-39` ("*Quote Template = start a quote*"). The code and UI still call this surface "design template" (the rule file calls that a known wart, lines 51-75).
- **Design Template** — the same row type **without** `items`: the look only. Hand-off A.
- **Package** — a `studio_assemblies` row: a bundle of line items added to a quote mid-edit ("*Package = add to a quote*", `quote-terminology.md:21`). React type `StudioQuoteTemplate` (`src/types/app.ts:3994`); hooks in `src/lib/queries/studio-quote-templates.ts`. Studio copy never says "template" for it (rule 1, `quote-terminology.md:80`).
- **Package scope** — `studio_assemblies.scope` ∈ `'category'` (one section's bundle) | `'project'` (whole-quote skeleton with `hierarchy`). Since migration 270 only `'category'` exists in data and UI.
- **Platform package / platform template** — `is_system = TRUE`, `studio_id IS NULL`, Qanvast-authored; CHECK `studio_assemblies_system_studio_consistency` (migration 184:24-27).
- **Package item** — `AssemblyItem` (`src/types/app.ts:3951-3973`): `priceBookItemId`, `name`, `description`, `category`, `subcategory`, `unitPrice`, `costPrice`, `marginPercent`, `qty`, `unit`, `isOptional`, `amount_marker`, `vendorId`, `vendorIds`.
- **Section / category · sub-section / subcategory** — a quote line's `category` string is its section; `subcategory` its sub-section. First-class structure lives in `leads.quote_hierarchy_metadata` JSONB (`QuoteHierarchy` = `{ sections: [{ id, categoryName, description, orderIndex, subsections: [{ id, subcategoryName, description, orderIndex }] }] }`, `src/lib/quote-canva/hierarchy/types.ts:11-28`). The studio's catalogue of categories is `studio_quote_categories` (name · subcategories[] · description · orderIndex).
- **Quote generation rule** — a `quote_generation_rules` row (migration 132): trigger conditions (`project_types[]`, `required_scope_items[]`) + an ordered `line_items` JSONB to insert; evaluated by `evaluateRules` (`src/lib/quote-rule-engine.ts`).
- **Variable / token** — `{{snake_case}}` merge field in a rich-text template (T&C, contract, invoice/PO/VO text, notifications), substituted by `substituteVariables` / `substituteDocumentVariables` (`src/lib/notifications/templates/substitute.ts`). The Quote PDF body uses a **separate** single-curly `{token}` dictionary (`src/lib/quote-pdf-tokens.ts`), which also accepts `{{token}}`.
- **Sample data** — `DEFAULT_SAMPLE_VALUES` (`src/components/templates/template-sample-data.ts:65-77`) for `{{token}}` chips; per-region `sampleClient` (`src/lib/region-config.ts:210,287,363,448`) for the Quote PDF `{token}` preview.
- **Legacy quote template** — the `quote_templates` table (`DbQuoteTemplate`, `src/types/database.ts:741-754`): items-only, no prices in the type; "System 1", no UI writer today.
- **AI tier "packages"** — `/api/quotes/generate-packages` → `quote_packages` rows named *Essential* / *Premium* / *Luxury*; a different concept from Package, and switched off (`false &&`, `quote-digitizer-dialog.tsx:9418`).
- **"Packaged" marker** — an `amount_marker` word printed instead of a price (`src/lib/quote-canva/pricing/studio-marker-vocabulary.ts:6-7`); not a Package.

---

## A. Packages (`studio_assemblies`) — the line-item content template

### C-01 · A Package: what a row holds
- Where: `src/types/database.ts:2532-2547` (`DbStudioQuoteTemplate`), `src/types/app.ts:3992-4028`, `scripts/migrations/184_studio_quote_templates_extension.sql:14-36`, `198_assemblies_last_used_at.sql:15-18`.
- Entry: n/a (data).
- Does: one row = `id`, `studio_id` (NULL for platform), `name`, `description`, `category` (the section a `'category'` package fills — "*only meaningful when scope = 'category'*", app.ts:3999), `items` JSONB (`AssemblyItem[]`), `hierarchy` JSONB (`QuoteHierarchy | null`; "*populated for scope='project'; null for category*", app.ts:4001), `tags text[]`, `scope`, `is_system`, `region_code` (`'SG' | 'MY' | 'AE' | 'IN' | NULL`), `property_type` (free text, e.g. `'HDB 3-Room'`), `created_by`, `created_at`, `updated_at`, `last_used_at`.
- Rules: CHECK `scope IN ('category','project')`; CHECK `(studio_id IS NULL AND is_system) OR (studio_id IS NOT NULL AND NOT is_system)`; indexes on `(studio_id, scope)`, `(region_code, scope) WHERE is_system`, trigram on `name`, `(studio_id, last_used_at DESC NULLS LAST)`.
- Data: table `studio_assemblies`. Card projection `CARD_COLUMNS` (`src/app/api/quotes/assemblies/route.ts:25-26`) omits `hierarchy` but ships `items` so the picker can count items and total without a second fetch (transformers.ts:3311-3318). Hand-off D for the schema itself.
- States: —
- Words: —
- Reachable: yes (through every row below).

### C-02 · Package item field set — what a package can store vs a quote line
- Where: `src/lib/leads/map-package-items.ts:21-66` (`mapPackageItemsToLineItems`), `:78-101` (`mapLineItemsToPackageItems`); `src/components/quote-templates/use-package-grid-context.ts:55-71`; tests `src/__tests__/package-item-round-trip.test.ts`, `map-package-items.test.ts`, `dyel-package-carry-forward.test.ts`.
- Entry: every apply / save / edit path.
- Does: JSONB → editor line: `category` = item's own category, else the row's `category`, else `"Others"`; `subcategory` carried only when `carrySubcategory` (default true); `name`; `description` (`""` when missing); `unitPrice` (`Number(...) || 0`); `qty` (`|| 1`); `unit` (`"lot"` when missing); `total = unitPrice*qty`; `isOptional`; `costPrice`/`marginPercent` coerced — **absent stays absent, never 0** ("*a fabricated 0 cost renders as a 100% margin on a client-facing quote*", :5-7); `priceBookItemId`, `vendorId`, `vendorIds`; `amountMarker` ← `amount_marker`; `priceType: "amount"`; a fresh `crypto.randomUUID()` id. Editor line → JSONB projects **explicitly** to ~15 keys so "*a quote-only field (discount, tax, quoteId) can never leak into studio_assemblies.items*" (:71-76).
- Rules: a package **cannot store** discount, GST/tax, notes, SKU, `refOverride`, `highlightColor`, `priceType` (lump-sum), `wastePercent`, `imageUrl`, `descriptionHtml`, `specUrl`, `packageTier` — the grid hides those cells (`PACKAGE_COLUMNS = ["category","costPrice","marginPercent"]`, :58; `UNSTORABLE_CELLS_BASE`, :68-71). Test: "*drops quote-only fields that a package cannot store*"; "*still carries no GST and no discount — those reset by design*".
- Data: `studio_assemblies.items[]` keys as in the vocabulary. Migration lineage of what `create_template_from_quote` writes: 185 = 8 keys (no `name`/cost/margin), 302 adds `name`, `costPrice`, `marginPercent`, 305 adds `priceType`, `priceBookItemId`, `vendorId` and orders by `sort_order, id` (see C-13).
- States: —
- Words: —
- Reachable: yes.

### C-03 · Scope: category-wise only (project scope retired)
- Where: `scripts/migrations/270_split_project_packages_into_category.sql:1-50`; `docs/superpowers/plans/2026-07-24-packages-category-wise-only.md:5-7`; `src/components/quote-templates/quote-template-entry-points.tsx:6-7` ("*Packages are category-wise bundles only — there is no whole-quote 'project' package*").
- Entry: n/a.
- Does: migration 270 fanned every `scope='project'` row into one `scope='category'` row per distinct item category (`name || ' - ' || category`, items grouped in original order, blank category → `'Others'`, `hierarchy` left NULL, `tags`/`created_by` copied, `last_used_at` NULL) and deleted all project rows. The picker is always mounted with `scope="category"` (`quote-digitizer-dialog.tsx:10644`); Save as package always sends `scope: "category"` (`save-as-template-modal.tsx:60`); Accounts "New package" creates `scope="category"` (`quote-templates-tab.tsx:190`); TemplateEditor defaults `scope = "category"` (:81).
- Rules: the `'project'` enum value, the `hierarchy` column and `apply_project_template` remain in schema/RPC but nothing in the UI creates or applies a project package (see C-15).
- Data: as above.
- States: —
- Words: —
- Reachable: category = yes; project = dead (data deleted, no UI).

### C-04 · Sources: studio-authored vs platform-baseline
- Where: `src/lib/queries/studio-quote-templates.ts:10-14`; `src/app/api/quotes/assemblies/route.ts:75-78, 160-179`; `src/components/quote-templates/template-picker.tsx:92-102`.
- Entry: picker, Accounts › Packages, `/admin/templates`.
- Does: the list route returns the union `studio_id = <session studio> OR is_system = true`, ordered `updated_at desc`; the picker re-sorts "*Studio-owned cards sort first, then platform, then most-recently updated*" (:92). Writes through the studio route always stamp `studio_id = session.studioId` and `is_system = false` (route:15-16, 164-174).
- Rules: studios never author platform rows through the studio route; the platform editor (`mode="platform"`) reuses the same `create`/`PATCH` route, so a "new platform template" created there is stamped with the admin's session studio and `is_system=false` — see Uncertain.
- Data: `studio_assemblies.is_system`, `studio_id`.
- States: —
- Words: picker badge *"Platform"* only on `is_system` rows ("*a 'Studio' badge on every studio-owned package is pure noise*", picker:193-194).
- Reachable: studio rows yes; platform rows — see Uncertain (RLS policy `studio_id = jwt.studio_id` on the scoped client would hide `studio_id IS NULL` rows).

### C-05 · Picker filters: region · property type · category · search
- Where: `src/app/api/quotes/assemblies/route.ts:68-88`; `src/lib/queries/studio-quote-templates.ts:70-104`; `src/components/quote-templates/template-picker.tsx:75-90`; `quote-digitizer-dialog.tsx:10642-10652`; test `template-picker.test.tsx:158-211, 254`.
- Entry: the picker is opened with the lead's `countryCode` as `regionCode` and the lead's `type` as `propertyType`.
- Does: server filters: `scope` exact; `regionCode` → `region_code.eq.X OR region_code.is.null`; `propertyType` → `property_type.eq.X OR property_type.is.null`; `category` exact (`eq`); `search` → escaped `ILIKE '%term%'` on `name` (`\ % _` escaped, route:84). The picker debounces search 200 ms (picker:75-81, "*typing 'kitchen' would issue 7 network requests*"). Query cached 5 min (`staleTime`, hooks:102).
- Rules: a package saved with `property_type='HDB 3-Room'` is hidden on a lead whose `type` differs; a package with NULL region/property matches every lead (the seeds deliberately leave both NULL "*so no picker filter can hide them*", `scripts/seed-elarte-quote-templates.sql:11-12`). `category` pre-fill applies only when the caller passes one; the digitizer passes none.
- Data: GET `/api/quotes/assemblies?studioId&scope&regionCode&propertyType&category&search` → `{ templates: StudioQuoteTemplateCard[] }`.
- States: loading *"Loading…"* (role=status).
- Words: placeholder *"Search packages…"*.
- Reachable: yes.

### C-06 · The package picker ("Pick a package")
- Where: `src/components/quote-templates/template-picker.tsx:40-287`; mounted `quote-digitizer-dialog.tsx:10636-10653`; tests `template-picker.test.tsx`.
- Entry: Quote Designer → "+ Add" menu → *"Add package"* (C-11); the empty-quote CTA *"Pick a package"* (C-10).
- Does: two panes — searchable card list (left: name, `Platform` badge, "*{n} item · {total}*" when total > 0 formatted in the **package's** region currency, description) and a live preview (right, C-07). Auto-selects the top card so the preview is never empty (derived, :104-111). `multiple` mode (opt-in, on in the digitizer) turns cards into checkboxes kept in click order (:70-73). Footer: *"New package"* (opens `TemplateEditor` in create mode pre-filled with the lead's region/property; the created package is auto-selected, :271-284) · *"Cancel"* · *"Use this package"* (single) or *"Add {n} package"/"Add {n} packages"* (multi, disabled at 0).
- Rules: card click in `multiple` toggles the checkbox **and** moves the preview (:168). Title is unified regardless of scope (test :211).
- Data: C-05 list + `GET /api/quotes/assemblies?id=` (full row) for the preview.
- States: loading *"Loading…"*; empty *"No packages yet"* + *"Build a reusable bundle of line items you can drop into any quote."* + *"Create your first package"*; zero search matches *"No matches"* + *"Try a different search term, or clear the filter."*; no selection *"Select a package to preview"* + *"Pick a package from the list to see its items and totals."*.
- Words: title *"Pick a package"*; description *"Apply a saved package to add its line items to this quote."*.
- Reachable: yes.

### C-07 · Package preview pane
- Where: `src/components/quote-templates/template-preview-pane.tsx:32-163`; test `template-preview-pane.test.tsx`.
- Entry: right pane of the picker; bottom-left "*Preview*" card of the editor (live against unsaved edits, editor:220-250).
- Does: header = name · scope badge (`template.scope` verbatim, i.e. *"category"*) · description · *"{n} items · Typical total: {total}"*. Sections come from `hierarchy.sections`; when there are none, one section titled `template.category ?? "Items"` lists everything. Items grouped by `category::subcategory`; each subsection shows the first 5 (`{name || description}` · `{qty}× {unit}`) then *"+ {N} more"*.
- Rules: total = Σ `unitPrice × qty` over **all** items — ignores `isOptional` and `amount_marker` (FOC lines count); currency from `template.regionCode ?? "SG"`, "*NOT the calling studio's country*" (:12-15).
- Data: full `StudioQuoteTemplate`.
- States: —
- Words: as above.
- Reachable: yes.

### C-08 · Apply a package to a quote (single)
- Where: `src/components/leads/quote-digitizer-dialog.tsx:229-236` (`fetchPackageItems`), `:1802-1819` (`handleApplyPackage`), `:1191` (`carryPriceBookSubcategory`); `src/app/api/quotes/assemblies/route.ts:39-51` (`raw=1`).
- Entry: picker → *"Use this package"*.
- Does: fetches the row raw (`GET /api/quotes/assemblies?id=…&raw=1` → `{ package: { category, items } }`), maps with `mapPackageItemsToLineItems(null, items, carrySubcategory)` (C-02), then **appends** to the editor's local items in one `trackEdit("Add package", prev => [...prev, ...mapped])` (one undo step); sets `itemsSource = "template"`, `userChoseBlank = true`, closes the picker. Persistence is the editor's normal autosave ("*like a manual add*", :10639-10640) — the RPC path is **not** used (C-14).
- Rules: refused when `quoteStatus ∈ {submitted, approved, sent_for_signature, client_signed}`; no de-duplication against existing lines ("*Append semantics unchanged … No dedup*", plan 2026-07-28:16); items keep their own category, so a package lands in that section (or *Others*); `subcategory` dropped when studio feature `priceBookSubcategoryInQuote` is false (default true; `docs/rules/leads.md:915-923`, DEFAULT_FEATURES `studio-config.ts:687`); `last_used_at` is **not** bumped on this path (the bump lives in the unused RPC hooks).
- Data: reads `studio_assemblies.category, items`; writes nothing directly (autosave → `quote_line_items`).
- States: —
- Words: *"This quote is locked — can't add a package."* · *"This package has no items"* · *"Added {n} item from package"* / *"Added {n} items from package"* · *"Couldn't add package. Try again or contact support."*.
- Reachable: yes.

### C-09 · Apply several packages at once
- Where: `quote-digitizer-dialog.tsx:1823-1856` (`handleApplyPackages`); plan `docs/superpowers/plans/2026-07-28-multiple-packages-per-quote.md`.
- Entry: picker in `multiple` mode → *"Add N packages"*.
- Does: fetches all selected in parallel (`Promise.allSettled`), concatenates in selection order, one `trackEdit("Add packages", …)` = one undo step + one autosave commit.
- Rules: same lock check; picker stays open only on a total failure ("*something to retry, nothing added*"); closes when anything was added or when nothing failed.
- Data: as C-08.
- States: —
- Words: *"This quote is locked — can't add packages."* · *"Added {k} package(s) ({n} item(s))"* · *"{m} package(s) had no items"* · *"{f} package(s) couldn't be added"*.
- Reachable: yes.

### C-10 · Empty-quote CTA "Start from a package"
- Where: `src/components/quote-templates/quote-template-entry-points.tsx:25-40`; mount `quote-digitizer-dialog.tsx:8776-8783`; tests `quote-template-entry-points.test.tsx`, `quote-template-entry-point-placement.test.ts`.
- Entry: Quote Designer items pane when the quote has no items and no hierarchy sections (`hasContent = items.length > 0 || quoteHierarchy.sections.length > 0`).
- Does: renders *"Start from a package"* + button *"Pick a package"* → opens the shared picker (C-06). Renders nothing once the quote has content.
- Rules: hidden when the lead's quote is `approved` or `client_signed`; holds no picker/mutation/scope of its own.
- Data: —
- States: —
- Words: as above.
- Reachable: yes.

### C-11 · "+ Add" menu: Add package · Save as package
- Where: `quote-digitizer-dialog.tsx:8548-8586` (menu), `:1417-1424` (state).
- Entry: Quote Designer toolbar "+ Add" popover (always-visible toolbar; the placement test pins that it sits before the chip bar).
- Does: items *"Add item"* · *"Add category"* · divider · *"Add package"* (title *"Apply a saved package to this quote"*) → picker; *"Save as package"* → `SaveAsTemplateModal` (C-12).
- Rules: *"Save as package"* disabled while `items.length === 0` (title *"Add at least one item before saving as a package"*; enabled title *"Save the current items as a re-usable package"*). Both entries are hidden in variation-order mode along with the header bookmark (the header comment at :6697-6699 explains a VO is "*a one-off delta*").
- Data: —
- States: disabled as above.
- Words: as above.
- Reachable: yes.

### C-12 · Save the current quote's section as a package
- Where: `src/components/quote-templates/save-as-template-modal.tsx:37-154`; mount `quote-digitizer-dialog.tsx:10660-10670`; hook `useSaveQuoteAsTemplate` (`studio-quote-templates.ts:298-336`); route `src/app/api/quotes/templates/create-from-quote/route.ts`; test `save-as-template-modal.test.tsx`.
- Entry: "+ Add" → *"Save as package"*.
- Does: form = *Name* (placeholder *"e.g. Arthaus HDB 3-Room skeleton"*), *Description* (*"Optional — what's this template for?"*), *Section* select (*"Pick a section…"* + the lead's hierarchy sections by `categoryName`), read-only *Region* / *Property type* from the lead (`countryCode`, `type`; *"—"* when null). Submit → POST `{ leadId, scope: "category", name, description, categoryName, regionCode, propertyType }` → RPC `create_template_from_quote` → new id; the digitizer toasts *"Package saved"* and closes.
- Rules: Save enabled only when name is non-empty **and** a section is picked; a lead with no hierarchy sections offers nothing to pick; no scope toggle (test *"no scope toggle is rendered"*); the RPC snapshots **every** `quote_line_items` row of the lead with `category = categoryName` — across all of the lead's quotes (no quote id filter) and with no lock check; region/property are the lead's, not editable here.
- Data: see C-13.
- States: *"Saving…"* while pending.
- Words: title *"Save as package"*; buttons *"Cancel"* / *"Save package"*.
- Reachable: yes.

### C-13 · RPC `create_template_from_quote` — what is carried, what is stripped
- Where: `scripts/migrations/185_quote_template_rpcs.sql:166-222` (original), `302_package_carry_forward_cost_margin.sql:29-90`, `305_package_items_pricebook_vendor.sql:44-150` (current body); route `src/app/api/quotes/templates/create-from-quote/route.ts:24-80`; tests `migration-305-package-item-keys.test.ts`.
- Entry: C-12 and the seed scripts (C-27).
- Does: validates `p_scope IN ('project','category')` else `EX_INVALID_SCOPE`; loads the lead (`EX_LEAD_NOT_FOUND`); aggregates line items into JSONB objects with keys `category, subcategory, name, description, unitPrice, qty, unit, isOptional, amount_marker, priceType, [components — Staging only], costPrice, marginPercent, priceBookItemId, vendorId`, `ORDER BY sort_order, id`; filter `p_scope = 'project' OR category = p_category_name`; `hierarchy` = the lead's `quote_hierarchy_metadata` for project, NULL for category; inserts with `studio_id = lead.studio_id`, `is_system = FALSE`, `region_code`/`property_type` as passed; returns the new UUID.
- Rules: stripped by construction — discounts, tax, notes, SKU/spec, images, waste, `packageTier`, `sort_order` (order is baked into array order). `vendorIds` is never read ("*that column is studio_price_book's, not quote_line_items'*"). Migration 305 explains the fleet had three RPC lineages and "*prod is one of these four*" 8-key tenants — so on an unmigrated database saving a package loses `name`, cost and margin (305:24-33). Security: the RPC is `SECURITY DEFINER`; anon EXECUTE revoked (231); the route first reads the lead under the scoped client and 404s (*"Lead not found"*) when RLS hides it; 400 *"leadId, scope and name required"*.
- Data: `quote_line_items` → `studio_assemblies`.
- States: —
- Words: —
- Reachable: yes (through C-12).

### C-14 · RPC `apply_category_template` (server-side merge) — present, no UI caller
- Where: `scripts/migrations/185:62-161`, `191_template_rpcs_write_quote_metadata.sql`, `192_template_rpcs_set_quote_id.sql`, `204_template_rpcs_accept_quote_id.sql:150-300`; route `src/app/api/quotes/templates/apply-category/route.ts`; hook `useApplyCategoryTemplate` (`studio-quote-templates.ts:182-291`); tests `studio-quote-templates-hooks.test.tsx:140-300`.
- Entry: none found — `grep` shows the hook is imported only by its own tests; the digitizer applies packages client-side (C-08).
- Does (for the record): locks the lead; `EX_FORBIDDEN` when `lead.studio_id ≠ caller`; `EX_QUOTE_LOCKED` when `quote_status IN ('client_signed','sent_for_signature')`; loads the package `WHERE scope='category' AND (studio_id = lead.studio_id OR is_system)` else `EX_TEMPLATE_NOT_FOUND`; finds the target section by `p_target_section_id` or by `categoryName = template.category`, else **appends a new section**; creates missing subsections for every distinct item `subcategory`; writes `quote_hierarchy_metadata` and (191) `quote_metadata.categoryOrder` (+ `sectionDescriptions` only if the lead has none for that category); (192) resolves or **auto-creates** the lead's primary `quotes` row (label `'Quote'`, `QT-NNN`, `quote_type 'standard'`, `status 'draft'`, `is_primary`); (204) accepts `p_quote_id` and raises `EX_QUOTE_NOT_FOUND` when it is not the lead's; inserts `quote_line_items` with `category = template.category` (the package's category overrides each item's), `subcategory`, `description`, `unit_price`, `qty`, `unit`, `is_optional`, `amount_marker` — **not** `name`, cost, margin, price-book link. The hook then bumps `last_used_at` and back-fills new subcategories into `studio_quote_categories` (fire-and-forget).
- Rules: route forces `p_caller_studio_id = session.studioId` ("*never trust a client-supplied value*"); 400 *"leadId and templateId required"*.
- Data: `studio_assemblies` → `leads.quote_hierarchy_metadata`, `leads.quote_metadata`, `quotes`, `quote_line_items`.
- States: —
- Words: —
- Reachable: no (dead in UI; route + hook + RPC live).

### C-15 · RPC `apply_project_template` — dead
- Where: `scripts/migrations/185:9-57` → `204:33-148`; route `src/app/api/quotes/templates/apply-project/route.ts`; hook `useApplyProjectTemplate` (`studio-quote-templates.ts:129-169`); perf test `quote-templates-perf.test.ts:84` ("*applies a 100-item project template under wall-clock budget*").
- Entry: none (no UI caller; no `scope='project'` rows after migration 270).
- Does (for the record): requires an **empty** quote (`EX_NOT_EMPTY` when the lead has hierarchy sections or any line item); replaces `quote_hierarchy_metadata` with the template's `hierarchy`; writes `quote_metadata.categoryOrder/sectionDescriptions/subsectionDescriptions` from it (191); inserts every item; same lock / tenant / quote-id rules as C-14.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: no.

### C-16 · Package editor (`TemplateEditor`)
- Where: `src/components/quote-templates/template-editor.tsx:76-376` (+ `PackageItemsPane` :393-524, `PackageEmptyState` :534-583); tests `template-editor.test.tsx`, `package-editor-*.test.tsx`.
- Entry: Accounts › Packages *"Edit"* / *"New package"*; picker *"New package"* / *"Create your first package"*; `/admin/templates` *"Edit"* / *"+ New platform template"*.
- Does: modal with a left metadata rail — *Name*, *Description* (3 rows), *Region* (placeholder *"SG / MY / AE / IN"*, free text), *Property type* (*"HDB 3-Room"*), *Tags* (*"Comma-separated, e.g. starter, premium"*; split on commas, trimmed) and a live read-only *"Preview"* (C-07) — and a right pane hosting the Quote Designer's own `LineItemsGrid` in `mode="panel"` through `usePackageGridContext` (C-17). Save = one PATCH (edit) or one create; `hierarchy` is fetched, held and re-saved but has no editing UI (:19-22).
- Rules: nothing autosaves; closing (overlay, Escape, Cancel) with unsaved edits asks *"Discard your unsaved changes to this package?"*; `canSave` = name non-empty and, when creating, ≥1 item; Save's grey-out reason is shown in the footer: *"Give the package a name to save it."* / *"Add at least one line item to save this package."*, else *"Unsaved changes"*; a failed save keeps the modal open and toasts the error; region/property are stored trimmed or NULL. Per-row pencil opens `PriceBookItemEditor mode="quote-line-item"` — the only price-book lookup here; the pick is round-tripped through the package mappers so "*what renders is exactly what a package save will keep*" (:481-507). The bulk *Browse price book* modal is deliberately not wired (:406-409). A brand-new / emptied package shows *"This package has no items yet"* · *"Add a category to start filing line items under it."* with a category input (datalist of studio categories, placeholder *"Category, e.g. Carpentry"*) and *"Add category"*.
- Data: `GET /api/quotes/assemblies?id=` · `PATCH ?id=` `{ name, description, regionCode, propertyType, tags, hierarchy, items }` · `POST { op: "create", scope, name, description, category, items, hierarchy, regionCode, propertyType, tags }`.
- States: *"Loading package…"* until the fetched items seed the grid; *"Saving…"*.
- Words: titles *"Edit platform template"* (platform mode, also when creating) / *"New package"* / *"Edit package"*; buttons *"Cancel"*, *"Save package"* (create) / *"Save changes"*; toasts *"Package created"*, *"Package saved"*, *"Couldn't save package — {message}"*, *"Couldn't save package. Your changes are still here — try again."*.
- Reachable: yes.

### C-17 · Package grid rules (`usePackageGridContext`)
- Where: `src/components/quote-templates/use-package-grid-context.ts:121-900`; tests `package-grid-context.test.tsx`, `package-grid-no-dead-controls.test.tsx`, `package-editor-decimal-price.test.tsx`.
- Entry: inside C-16.
- Does: adapts `AssemblyItem[]` ↔ `QuoteLineItem[]` for the shared grid. One write path (`commit`) pushes every edit out as package items; re-seeds only when `packageId` changes.
- Rules: visible optional columns clamped to `category`, `costPrice`, `marginPercent` (a Notes/Discount/GST tick is refused, :209-217); `refOverride`, `highlightColor` cells never render; the row pencil hides when there is no owning studio (admin platform mode); cost/markup edits use the quote editor's helpers (`applyCostPriceEdit`, `applyMarkupPercentEdit`, `applyUnitPriceEdit`) so "*the two cannot drift*"; qty edit recomputes `total`; tax rate 0, no lead, no comments/AI/undo stack; sorting re-orders **within** a section, sorting by Category re-orders sections with *"Others"* pinned last; categories = studio's active `studio_quote_categories` ∪ categories used by the package ∪ session-added; category canonicalised case/whitespace-insensitively; subcategory rows added in the editor are session-local ("*A package edit should not rewrite studio config behind the user's back*", :525-527) and become real only once an item is filed under them; removing a subcategory row untags its items; a row dropped on another section header re-files it at the top of that section and clears its subcategory; section order = item order (no separate metadata); new rows are `name: "New item"`, `qty 1`, `unit "lot"`, `unitPrice 0`, no cost; lettering (A1, B1 …) counts only categories present in the package; delete row / delete section act immediately (no confirm dialog); known defect pinned by test: a half-typed decimal or a comma left in a price cell commits `0` on blur.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### C-18 · Create a package from scratch
- Where: `quote-templates-tab.tsx:83-86, 184-192`; `template-picker.tsx:158-161, 245-247, 271-284`; hook `useCreateQuoteTemplate` (`studio-quote-templates.ts:345-387`); route `POST /api/quotes/assemblies` `op: "create"` (:160-179).
- Entry: Accounts › Packages *"New package"* / *"Create your first package"*; picker *"New package"* / *"Create your first package"*.
- Does: opens C-16 in `creating` mode; from the picker the new package inherits the lead's region/property/category defaults and is selected on return.
- Rules: `scope` defaults to `category`; `is_system` forced false; `studio_id` from the session; needs name + ≥1 item.
- Data: as C-16.
- States: —
- Words: as C-16.
- Reachable: yes.

### C-19 · Edit / delete a studio package (Accounts › Packages)
- Where: `src/app/(main)/accounts/quote-templates-tab.tsx:26-196`; hook `useDeleteQuoteTemplate` (`studio-quote-templates.ts:435-455`); `DELETE /api/quotes/assemblies?id=`; test `accounts-quote-templates-tab.test.tsx`.
- Entry: `/accounts?tab=quote-templates` (menu *Quotes & Pricing › Packages*).
- Does: cards under *"My packages"* show name, description, region + property badges, *"Edit"* (→ C-16) and *"Delete"* (immediate hard delete — no confirm).
- Rules: delete refuses platform rows client-side (*"Cannot delete platform template from studio context"*); RLS scopes the row delete; no soft delete / archive / restore; no usage check.
- Data: `DELETE /api/quotes/assemblies?id=`.
- States: *"Loading…"*; empty *"No packages yet"* + *"Build a package from scratch here, or open the Quote Designer and choose **Save as package** from the Add menu."* + *"Create your first package"*.
- Words: section copy *"Re-usable starter packages built by your studio. Apply them to any lead from the Quote Designer."*; toasts *"Package deleted"* / *"Failed to delete package"*.
- Reachable: yes.

### C-20 · Duplicate a platform package into the studio
- Where: `quote-templates-tab.tsx:140-179`; hook `useDuplicatePlatformTemplate` (:461-483); route `POST /api/quotes/assemblies` `op: "duplicate"` (:135-158).
- Entry: Accounts › Packages › *"Platform packages"* card → *"Duplicate to my studio"*.
- Does: server reads the source `WHERE id AND is_system = true` (`name, description, category, items, hierarchy, scope, region_code, property_type, tags`), inserts a copy with `studio_id = session`, `is_system = false`, `name = "{name} (Copy)"`.
- Rules: only platform rows can be duplicated; studio rows have no duplicate action; `last_used_at`/`created_by` not copied.
- Data: as above.
- States: empty *"No platform packages yet."*.
- Words: *"Platform packages"* · *"Qanvast-curated starter packages. Duplicate one to your studio, then customise it freely."* · badge *"Platform"* · toasts *"Package duplicated to your studio"* / *"Failed to duplicate package"*.
- Reachable: the action yes; whether platform rows ever appear — see Uncertain.

### C-21 · Accounts › Packages tab placement and history
- Where: `src/app/(main)/accounts/page.tsx:93-107` (menu), `:200-215` (`RETIRED_TAB_ALIASES`), `:1382`; `docs/rules/quote-terminology.md:96-115`; test `package-editor-invariants.test.tsx:36-55`.
- Entry: `/accounts?tab=quote-templates`; old `?tab=assemblies` redirects here.
- Does: the tab is the single studio editor over `studio_assemblies`. History: a second editor "Work Packages" (`assembly-builder.tsx`, `/api/studio-config/assemblies`, tab id `assemblies`, shipped 2026-04-16) was retired 2026-08-19 because it "*knew nothing about `hierarchy`*", "*never set `scope`*", "*hid platform packages by filtering on studio_id*" and "*wrote price-book picks with the item name folded into `description` so applied line items came out with no headline*" (page.tsx:203-212). Tests pin "*has exactly one items editor over studio_assemblies*" and "*has no second API route over studio_assemblies*".
- Rules: the menu item carries no `ownerOnly` flag (only *Studio Health* does, :80); the file header claims "*Owner-only surface*" (`quote-templates-tab.tsx:6`) but no gate exists in the tab.
- Data: —
- States: —
- Words: menu label *"Packages"*.
- Reachable: yes.

### C-22 · `/admin/templates` — platform package CRUD
- Where: `src/app/admin/templates/page.tsx:25-87`; nav `src/app/admin/layout.tsx:36` (`pageKey: "templates"`, filter :159-162); test `admin-templates-page.test.tsx`.
- Entry: platform admin portal (separate `qanvast_admin_session`, `docs/rules/architecture.md:180`) → nav *"Templates"*; `super_admin` sees every page, other admin roles need `"templates"` in `allowedPages`.
- Does: lists `is_system` rows from the same studio route using a sentinel `studioId = "00000000-0000-0000-0000-000000000000"`; each card shows name, description, `scope` badge, region/property badges, *"Edit"*; *"+ New platform template"* opens C-16 in `mode="platform"` (`creating` without a `studioId`).
- Rules: no per-studio filter; no delete on this page; the editor in platform mode has `effectiveStudioId = ""` so price book / categories come from the caller's own studio (known gap, `use-package-grid-context.ts:132-141`) and the row pencil is hidden.
- Data: same `/api/quotes/assemblies` routes; create in platform mode posts `op: "create"` which stamps `studio_id = session.studioId`, `is_system = false` — i.e. the code path cannot produce a platform row (see Uncertain).
- States: empty *"No platform templates yet."*.
- Words: title *"Platform quote templates"*; button *"+ New platform template"*.
- Reachable: page yes (behind admin role/page permission); working data path — see Uncertain (studio-session guard + RLS on NULL `studio_id`).

### C-23 · Who may do what (permissions)
- Where: `scripts/migrations/185:231-247` (`quote_template_edit` slug seeded into `studio_roles.permissions.actions`: owner/admin `true`, id/accounting `false`); `grep quote_template_edit src` → 0 hits; `docs/openmaison-v1-feature-requirements.csv:14`.
- Entry: —
- Does: the slug exists in data only; no code reads it. Package CRUD is gated only by session + RLS (any studio member who can open Accounts). Applying / saving packages inside the Quote Designer follows the Designer's own access (CSV row 14: quote creation "*gated to owner/admin/id only, not Accounting*"). `Generate Starter Quote` is owner-only in UI (C-50). Quote rules mutations: "*All mutations are owner-only; callers are responsible for gating the UI*" (`quote-generation-rules.ts:4-6`) — the tab itself has no gate.
- Rules: as above.
- Data: `studio_roles.permissions`.
- States: —
- Words: —
- Reachable: n/a.

### C-24 · "Recently used" — `last_used_at`
- Where: `scripts/migrations/197_template_last_used_at.sql`, `198_assemblies_last_used_at.sql`; `bumpAssemblyLastUsed` (`studio-quote-templates.ts:54-68`), `POST /api/quotes/assemblies` `op: "bump-last-used"` (route:123-133); `bumpDocumentTemplateLastUsed` (`studio-config.ts:562-570`, `POST /api/studio-config/doc-templates/bump`).
- Entry: after an apply.
- Does: `studio_document_templates.last_used_at` is bumped by `applyDocumentTemplate` (both canva and legacy paths, `quote-digitizer-dialog.tsx:4328, 4394`) and drives the entry-screen order (C-36). `studio_assemblies.last_used_at` is bumped only by the RPC hooks (C-14/15), which have no UI caller — so for packages the column is "*harmless extra data collection*" (hooks:43-46) and nothing surfaces it.
- Rules: bumps are non-fatal (always 200; errors only logged).
- Data: two nullable `timestamptz` columns.
- States: —
- Words: —
- Reachable: documents yes; packages effectively no.

### C-25 · Item text is two fields: `name` (headline) and `description` (spec)
- Where: `docs/rules/quote-terminology.md:117-123`; `scripts/migrations/280_assembly_item_name_backfill.sql`; test `package-editor-invariants.test.tsx:10-22`, `migration-280-assembly-name-backfill.test.ts`.
- Entry: n/a.
- Does: "*`name` is the headline the pricing table prints; `description` is the spec text beneath it. Packages saved from a quote store them equal, and the renderer hides a description matching its headline*". Migration 280 copied `description` into a missing/blank `name` (never clearing `description`, never touching an existing name, skipping items with no description), idempotent, order-preserving.
- Rules: an editor exposing one field would "*silently split them apart and make the quote print stale text*".
- Data: `studio_assemblies.items[].name / .description`.
- States: —
- Words: —
- Reachable: yes.

### C-26 · Migration lineage of the Package model (hand-off D, listed for the behaviour each changed)
- Where: `scripts/migrations/184, 185, 191, 192, 197, 198, 204, 223, 226, 231, 270, 280, 302, 305`.
- Entry: —
- Does: 184 columns + Arthaus backfill (row `a1100000-…-0301` promoted to a project skeleton with a derived hierarchy); 185 three RPCs + permission slug; 191 RPCs also write `quote_metadata` (categoryOrder, sectionDescriptions, subsectionDescriptions); 192 RPCs stamp `quote_id` (auto-create a primary quote when none); 197/198 `last_used_at`; 204 RPCs accept `p_quote_id`; 223/226 RLS locks (`studio_id = jwt.studio_id`); 231 revoke anon EXECUTE on the RPCs; 270 project → category split; 280 name backfill; 302 save carries `name`, `costPrice`, `marginPercent`; 305 save carries `priceType`, `priceBookItemId`, `vendorId` (+ `components` where the column exists), ordered by `sort_order, id`.
- Rules: 302 is "*NOT BACKFILLABLE. Packages saved before this migration never captured a cost at all … Dyel has 45 such packages*" (302:18-20).
- Data: as above.
- States: —
- Words: —
- Reachable: —

### C-27 · Seeded content templates
- Where: `scripts/seed-elarte-quote-templates.sql`, `scripts/seed-staging-quote-templates.sql`, `scripts/seed-arthaus-hdb-3room-quote-template.sql`, `scripts/dump-ref-templates.ts`.
- Entry: operator scripts (`node scripts/run-sql.js …`), idempotent.
- Does: El Arte (studio `4630305b-…`) — three packages built **from the studio's own lead "Sarah Chen"** via `create_template_from_quote` ("*no invented content*"): project *"Full Home Renovation (Starter)"* and category *"Carpentry Package"* (`'Carpentry'`), *"Demolition & Hacking Package"* (`'Demolition'`), region/property NULL, guarded by `NOT EXISTS (studio_id, name)`. Staging Arthaus — three category packages from lead "Test Oli17": *"Carpentry Package"*, *"Demolition & Hacking Package"*, *"Plumbing Package"*. Arthaus *"HDB 3-Room Renovation"* — a `studio_document_templates` `quote_pdf` row (`b2200000-…-0302`, `is_default false`, `mode 'full'`, `sections []`) carrying 40 hand-written line items across Preliminaries · Demolition · Masonry · Tiling · Carpentry · Electrical · Plumbing · False Ceiling · Painting · Aircon · Cleaning (e.g. `{"id":"hdb3r-15","name":"Kitchen carpentry","description":"Top + bottom cabinets, 3.6m run, laminate finish, soft-close hinges","category":"Carpentry","unitPrice":4800,"qty":1,"unit":"set","total":4800}`), `ON CONFLICT (id) DO UPDATE`. `dump-ref-templates.ts` writes the 3 canva `REFERENCE_TEMPLATES` to `/tmp/ref-templates.json` (hand-off B).
- Rules: the El Arte project package would have been split by migration 270 if that ran after the seed.
- Data: as above.
- States: —
- Words: descriptions e.g. *"Kitchen cabinets, wardrobes and feature carpentry. Insert into any quote and tweak per unit."*.
- Reachable: data only.

### C-28 · Legacy `quote_templates` table ("System 1")
- Where: `src/app/api/quotes/templates/route.ts` (GET/POST/DELETE), hooks `useQuoteTemplates` / `useSaveQuoteTemplate` / `useDeleteQuoteTemplate` (`src/lib/queries/leads.ts:1197-1250`), types `DbQuoteTemplate` / `QuoteTemplate` (`database.ts:741-754`, `app.ts:926-946`), `transformQuoteTemplate` (`transformers.ts:1393-1411`); readers `src/lib/quote-agent/executors.ts:393-410` (`applyQuoteTemplate` tool, `mode: "replace" | "merge"`), `src/app/api/quotes/chat/route.ts:53`; `studios.settings.quoteTemplates` (`app.ts:689`).
- Entry: no UI writer — "*The previous System 1 path … is no longer invoked from the UI; that code remains in place for backward read-compat of legacy data only*" (`quote-digitizer-dialog.tsx:4588-4590`); the Saved Templates modal no longer lists these rows because they "*lacked prices, sections, and brand state*" (:10008-10011).
- Does: a row = `name` + `line_items[{ description, category, qty, unit, price_type, unit_price, cost_price }]`, `created_by`. POST maps `unit || "set"`, `price_type || "amount"`; GET returns `[]` when the table is missing. The mAIson quote agent can still apply one (`template_id`, replace|merge) and the chat context lists them.
- Rules: `studio_id` from session; delete scoped by studio.
- Data: `quote_templates`.
- States: —
- Words: —
- Reachable: API yes; UI no; agent tool — Later audit (AI).

### C-29 · AI tier "packages" — a different concept, switched off
- Where: `src/app/api/quotes/generate-packages/route.ts:17-33, 76-139, 290`; `quote-digitizer-dialog.tsx:9415-9450`; `QuoteLineItem.packageTier` (line-items route `:180, 562`).
- Entry: none — the toolbar button is behind `false &&` (:9418) "*the team wants to re-enable the AI variations flow later*".
- Does (for the record): given ≥4 items, Gemini proposes three tiers *"Essential"*, *"Premium"*, *"Luxury"* by upgrading materials (`upgraded`, `upgradeReason`), capped near a `targetBudget`; writes `quote_packages`; the UI selected the middle tier by default. `DRY_RUN` mock in the route.
- Rules: lead ownership + not archived checks.
- Data: `quote_packages`, `quote_line_items.package_tier`.
- States: —
- Words: toast *"Generated {n} package tiers (Essential, Premium, Luxury)"*; title *"AI generates 3 quote variations (Essential/Premium/Luxury) by upgrading materials and finishes. Requires 4+ line items."*.
- Reachable: no (disabled).

### C-30 · Quote Categories — the catalogue every package and quote files into
- Where: `src/components/accounts/quote-categories-editor.tsx:10-263`; `src/app/(main)/accounts/page.tsx:1749-1760`; route `src/app/api/quotes/categories/route.ts` (POST upsert on `(studio_id, name)`, `POST ?op=resolve` names → `{id, name, subcategories}`, `PATCH ?id=` set `subcategories[]`); digitizer *Add category* dialog `quote-digitizer-dialog.tsx:1432-1473`.
- Entry: `/accounts?tab=quote-categories` (*Quotes & Pricing › Quote Categories*); Quote Designer "+ Add" → *"Add category"*.
- Does: a category = `name`, `orderIndex` (drag to reorder), `subcategories[]` (*"+ Add subcategory"*), `description` (*"Printed under this category on every quote — e.g. To supply labour to run wiring for the following items"*) — a per-category default text that prints under the heading on every quote (template-like default). Saved as a whole list. In the Designer, *Add Category* has a *save to price book* toggle: on → upsert to `studio_quote_categories` (*"Category "{name}" added"*), off → *"Category "{name}" added (this quote only)"*.
- Rules: names must be unique (*"Already exists"*, *"Duplicate name: "{name}""*) and non-empty (*"Categories can't have empty names"*); delete confirms *"Delete "{name}"?"*; subcategory duplicates ignored case-insensitively. Packages use the catalogue for the section combobox and canonical casing (C-17) but a package can hold a category the studio never configured ("*renders items whose category the studio has not configured*"). The RPC apply path (dead) would back-fill package subcategories into the catalogue.
- Data: `studio_quote_categories (id, studio_id, name, order_index, subcategories, description, is_active)`.
- States: —
- Words: tab copy *"Customize the categories used in your quote line items, the description printed under each one on your quotes, and the subcategories that group rows under each category in your generated PDFs."*; placeholder *"New category (e.g. Waterproofing)"*; toasts *"{title} saved"*, *"Failed to save"*, *"Category added locally, but couldn't save to price book"*, *"Failed to add category"*.
- Reachable: yes.

### C-31 · Price Book — touchpoint
- Where: `src/app/(main)/accounts/page.tsx:1144-1146` (`PriceBookManager`, tab `catalogue`); `src/components/accounts/price-book-item-editor.tsx` (used by C-16 in `mode="quote-line-item"`); `studio_price_book` (`vendor_ids`, migration 135).
- Entry: `/accounts?tab=catalogue` (*Price Book*).
- Does: the studio's item catalogue (name, description, category, subcategory, unit price, cost, vendors, tiers). Feeds packages: a package item keeps `priceBookItemId` as "*the source of truth*" plus a vendor snapshot "*so a package still names its supplier after the price-book row is deleted*" (305:9-11). Not a template in the module's sense. Hand-off: Quotes audit (price book).
- Rules / Data / States / Words: —
- Reachable: yes.

### C-32 · Quote Approval Rules — touchpoint
- Where: `src/app/(main)/accounts/page.tsx:1153-1162` (*"Quote Approval Rules"* · *"Set thresholds for auto-approval and required sign-offs."*), tab `approval`.
- Does: thresholds, not templates. Hand-off: Quotes audit.
- Reachable: yes.

### C-33 · Quote Template Sandbox — developer tool
- Where: `src/app/(main)/tools/quote-template-sandbox/page.tsx:3-60`.
- Entry: route `/tools/quote-template-sandbox`; owner-only (`isOwner`, else redirect to `/tools`); no nav registration found by grep.
- Does: proves BlockNote, the PDF render pipeline and the `CanvaEditor` work in the environment — *"Quote Designer sandbox — validates Playwright, Paged.js, BlockNote in this environment. Not for production use."*. No templates are created or applied. Hand-off A/B for the canva panel.
- Reachable: yes by URL, owners only.

---

## B. Quote Templates — `studio_document_templates` (`quote_pdf`) rows that carry items; the "start a quote" paths

### C-34 · A Quote Template: what a row holds
- Where: `src/types/app.ts:1245-1262` (`QuoteDocumentTemplate`), `:1790-1807` (`StudioDocumentTemplate`), `:1788` (`DocumentTemplateType = 'quote_pdf' | 'tnc' | 'contract' | 'signing_flow' | 'timeline' | 'portal' | 'invoice' | 'po' | 'vo'`); `src/app/api/studio-config/doc-templates/route.ts:18-26, 55-66`; `quote-digitizer-dialog.tsx:4613-4624` (the saved shape).
- Entry: n/a (data).
- Does: `body_json` holds the whole `QuoteDocumentTemplate`: `id`, `name`, `isDefault`, `sections[]` (legacy section layout) **or** a canva block tree (`schemaVersion`, `blocks` — hand-off B), `globalStyles` (hand-off A), `items: QuoteLineItem[]`, `brandColor`, `logoUrl`, `mode: "full" | "structure"`, `savedAt`. The row also carries `is_default`, `is_active`, `company_id` (NULL = studio-wide; set = per-issuing-entity override), `last_used_at`, `variables`, `config`. The reader spreads `body_json` and overrides `id/name/isDefault/lastUsedAt` from the row; entity rows win over studio-wide rows with the same name (route:57-65).
- Rules: "*has `items` → Quote Template; no `items` → Design Template*" (`quote-terminology.md:37-39`). A studio with zero rows gets one synthetic row `DEFAULT_DOC_TEMPLATE` (`id: "default"`, `name: "Default"`, sections *pricing_table* "Quotation" + *payment_terms* "Payment Schedule") which the entry screen excludes from `savedCount` (`quote-entry-cards.ts:8-10, 35`); studios not yet migrated by 167 read `studios.settings.quoteDocumentTemplates`.
- Data: table `studio_document_templates` (UNIQUE `(studio_id, type, name)` with `company_id` folded in by 166; partial unique on `is_default`), hand-off D.
- States: —
- Words: —
- Reachable: yes.

### C-35 · Entry screen ("Open Shelf") — the four ways to start a quote
- Where: `src/components/leads/quote-empty-state.tsx:33-438`; helpers `src/lib/quote-entry-cards.ts`; mount `quote-digitizer-dialog.tsx:7989-8017`; tests `quote-empty-state-actions.test.tsx`, `quote-entry-cards.test.ts`, `quote-entry-tracking.test.ts`.
- Entry: Quote Designer opened on a lead with an empty quote (`!userChoseBlank && items.length === 0`).
- Does: **warm** (`savedCount > 0`): *"Start a quote for {leadName}"*; Zone B eyebrow *"From a design template · {n} saved"* with *"View all"* (→ C-37 modal) and *"New design template"* (→ C-40); a snap carousel of up to 6 cards (`GALLERY_CAP`), a search box only at ≥7 saved (`SEARCH_MIN_SAVED`, placeholder *"Search saved quotes…"*); Zone C *"Start from scratch"* → *"Blank Quote"* / *"Start from an empty table — add rows, pick a package, or browse items from your price book"* / *"Start blank →"*; Zone D *"More ways to start"* → *"Upload a quote"* (*"PDF · XLS · JPG"*, *"Digitize an existing quote — we scan it into editable line items"*) and *"Draft with AI"* (Beta; *"Describe the scope — we draft a categorized quote from your {n}-item price book"* / *"…we draft from market rates; add a price book to improve accuracy"*). **Cold** (`savedCount = 0`): the AI drafter hero (*"AI Quote Drafter"*, *"Describe the scope for {leadName} and we'll draft it."*), Blank, Upload, and *"No saved quote skeletons yet — save one from any quote to reuse it here in one click."* *"Start one now →"*.
- Rules: cards sorted default first → `lastUsedAt` desc (nulls last) → name asc (`compareCards`); a card's meta = *"{sectionCount} sections · {itemCount} items · used {relative}"* where `sectionCount` = distinct non-blank item categories, or *"Design only · Not used yet"* when `hasItems` is false; the synthetic `default` row never shows; search matches name case-insensitively; zero match shows *"No saved quotes match "{q}""* + *"Draft "{q}" with AI"*; card body / Enter / Space → **preview** (not apply); *"Use This →"* (aria *"Use this design template — "{name}""*) → apply (C-36); every action fires a `quote_digitizer` analytics event (`quote_entry_template_applied` with `position`, `viaSearch`, etc.).
- Data: `useQuoteDocumentTemplates(studioId)` (studio-wide list; the digitizer passes no `companyId`, test `phase2b-quote-pdf-templates.test.ts:128`).
- States: as above.
- Words: as above; menu per card: *"Rename"*, *"Duplicate"*, *"Set as default"* (hidden on the default), *"Delete"*.
- Reachable: yes.

### C-36 · One-click apply from the entry screen (+ Undo) — `applyDocumentTemplate` rules
- Where: `quote-digitizer-dialog.tsx:4276-4397` (`applyDocumentTemplate`), `:4402-4505` (`handleApplyTemplateFromEntry`), `:10194-10203` (modal *"Use This Template"*).
- Entry: card *"Use This →"*; modal *"Use This Template"*.
- Does: snapshots the editor state, applies, then toasts *"Applied "{name}""* with an *Undo* action that restores the snapshot (and fences in-flight canva/items autosaves). `applyDocumentTemplate`: **canva body** (studio feature `canvaEditor`, default true) → loads the block tree into the canva editor; `setItems(tpl.items)` **only when** the body carries a non-empty `items` array (a design-only body leaves the studio's items alone); marks the quote dirty; lands on the *Items* tab ("*Picking a template is the START of a quote*", :4316-4322). **Legacy sections body** → stashes any parsed-from-upload items for *Restore*, keeps the cover first (template cover wins; else the existing cover is kept), applies `globalStyles`, `brandColor`, `logoUrl`; items overwrite when `mode === "structure"` **or** the template has ≥1 item ("*avoids wiping the studio's existing items with an empty snapshot*", :4361-4373). Both paths set `userChoseBlank`, close the panel and bump `last_used_at`.
- Rules: apply never merges items — it **replaces** the local items array; no lock check on this path (the entry screen only renders while the quote is empty); a missing template → *"That saved quote couldn't be loaded — try Browse all."*.
- Data: `POST /api/studio-config/doc-templates/bump`; items persist through the editor autosave.
- States: —
- Words: `Loaded template "{name}"` (direct apply, suppressed on the Undo path) · `Applied "{name}"` · *"Undo"*.
- Reachable: yes.

### C-37 · "Saved Design Templates" modal (View all / Preview)
- Where: `quote-digitizer-dialog.tsx:9975-10230`, `TemplateActionsMenu` + `RenameTemplateDialog` shared from `quote-empty-state.tsx:550-635`.
- Entry: entry screen *"View all"*, card body click, card *"Preview"*; header bookmark in the editor (indirectly).
- Does: left list of every `quote_pdf` row (count badge) with *Default* / *FULL* / *CLEAN* badges and meta *"{n} block(s)"* (canva) or *"{n} section(s)"* + *"· {n} item(s)"*; per-row ⋮ menu (C-39) except on the synthetic `default` row; right pane previews the layout (canva block tree or legacy sections) with badges and *"Use This Template"* (routes through C-36 so it gets the same Undo); for `structure` rows a hint *"Layout + brand restored. Prices will start at $0 — fill in for this lead."*.
- Rules: the legacy `quote_templates` rows are no longer listed (C-28).
- Data: `docTemplates`.
- States: empty *"No templates yet"* · *'Click "New template" on the start screen, or use the bookmark button in the editor header once your quote has items'*.
- Words: title *"Saved Design Templates"*.
- Reachable: yes.

### C-38 · Save the current quote as a template (header bookmark / authoring banner)
- Where: `quote-digitizer-dialog.tsx:6697-6713` (bookmark), `:7040-7067` (banner), `:10700-10810` (dialog), `:4591-4640` (`persistDocumentTemplate`); scrub helpers `src/lib/transformers.ts:1216-1250, 1285-1320`.
- Entry: header bookmark button (title *"Save as template"*, shown when `items.length > 0`, not read-only, not a variation order); the authoring banner's *"Save as template"* (C-40).
- Does: dialog *"Save as template"* — name (placeholder *"e.g. Standard residential renovation"*), two radio cards: **full** *"Save with all customizations"* / *"Full snapshot — items, prices, layout, cover, rich-text content, brand. Best for similar projects you want to start as a near-copy."* and **structure** *"Save as a clean template"* / *"Keep layout, cover template, brand, page setup, section structure. Clear prices, descriptions, rich-text, cover text, image URLs. Best for new projects starting f…"* (line truncated in my read), a set-as-default checkbox, *"Cancel"* / *"Save template"* (Enter also saves). Builds a `QuoteDocumentTemplate` `{ id: uuid, name, isDefault, sections, globalStyles, items, brandColor, logoUrl, mode, savedAt }` and PUTs the **full set** (setting default clears every other row's flag).
- Rules: `structure` scrubs items to `description: "Item"`, `unitPrice 0`, `total 0`, `marginPercent 0`, discounts none, `costPrice null`, `packageTier null`, `priceBookItemId null`, `source "template"`, `wastePercent 0`, keeping `category`, `qty`, `unit`, `priceType`, tax flags, `isOptional` and dropping `content_block` rows; sections keep type/style/structure but lose text, images, comments, cover text (cover template + slot geometry kept). Name required (*"Please give the template a name"*); no studio → *"Cannot save template: no studio context"*. Saving in the legacy-sections shape even for canva studios — the canva "Save as my template" is a separate path (`handleSaveCanvaAsTemplate`, :4999-5018, `useSaveDocumentTemplate` with `bodyJson = body`, `isDefault false`; hand-off A).
- Data: `PUT /api/studio-config/doc-templates { templates, companyId: null }` — inserts new ids, updates existing, **soft-deletes** (`is_active = false`) rows missing from the set (route:94-170).
- States: spinner while saving.
- Words: toasts `Template "{name}" saved` (+ *" (default)"*), *"Couldn't save template. Please try again."*.
- Reachable: yes.

### C-39 · Card actions: rename · duplicate · set default · delete
- Where: `src/lib/quote-template-actions.ts:20-92`; handlers `quote-digitizer-dialog.tsx:4510-4556`; dialogs `quote-empty-state.tsx:420-435, 595-635`; test `quote-template-actions.test.ts`.
- Entry: ⋮ menu on entry cards and on modal rows.
- Does: pure list transforms then one full-set PUT (C-38). Rename trims, refuses collisions case-insensitively (dialog *"Rename design template"*, error *"A design template with this name already exists."*, Save disabled when unchanged/empty/colliding). Duplicate = `structuredClone` with a new id, name suffixed *"{name} (copy)"*, *"(copy) 2"*, …, `isDefault false`, `lastUsedAt null`. Set default makes exactly one default. Delete removes the row; if it was the default and rows remain, the **first remaining** becomes default.
- Rules: confirm `Delete "{name}"?` with *"This permanently removes the saved design template. Quotes already created from it are not affected."* plus, for a default with siblings, *" It was your default — the next design template becomes the new default."*; the persisted delete is a soft delete (`is_active=false`) though the copy says "permanently".
- Data: as C-38.
- States: —
- Words: toasts *"Template renamed"*, *"Template deleted"*, `Duplicated as "{copyName}"`, *"Default template updated"*, and *"Couldn't rename/delete/duplicate template. Please try again."* / *"Couldn't update default. Please try again."*.
- Reachable: yes.

### C-40 · "New design template" — author a template from a blank quote
- Where: `quote-digitizer-dialog.tsx:4558-4566`, `:7040-7067`.
- Entry: entry screen *"New design template"* / cold-start *"Start one now →"*.
- Does: resets the quote context, enters the editor on *Items* as a blank quote and shows a dismissible banner *"Building a reusable template — add sections and items, then save it to your shelf."* with *"Save as template"* (→ C-38, `mode` defaults to *full*); the banner disappears after a save or on *Dismiss template hint*.
- Rules: identical to *Blank Quote* apart from the banner.
- Data: —
- States: —
- Words: as above.
- Reachable: yes.

### C-41 · Design Template picker in the canva Layout tab strips items
- Where: `src/components/leads/quote-canva/CanvaEditor.tsx:544-660` (inner `TemplatePicker`), test `design-template-picker-items.test.ts`.
- Entry: Layout tab → design-template button (hand-off A for the surface).
- Does: lists every `quote_pdf` row; an item-carrying row is labelled *"Quote template · {n} item(s) — only its design is applied here"*, others *"Studio default"* / *"Saved design template"*; on apply the `items` key is discarded (`const { items: _discardedItems, ...designOnly }`) so the header promise *"Pick a layout to start from. Items stay; only the design changes."* holds; a second click on the highlighted row confirms replacement.
- Rules: recorded here because it is the one place the items array of a Quote Template is deliberately **not** applied.
- Data: `useDocumentTemplates(studioId, "quote_pdf")`.
- Reachable: yes (canva studios).

### C-42 · The terminology mislabel (code wart, documented)
- Where: `docs/rules/quote-terminology.md:51-75`; tests `quote-empty-state-actions.test.tsx:58-67`.
- Does: the entry screen (*"From a design template"*, *"New design template"*, *"Rename design template"*) and the *"Saved Design Templates"* modal seed full item sets and are therefore Quote Templates by the locked taxonomy; the relabel to "Quote Template" was "*approved-but-unshipped*" — tests match the shipped copy and are expected to fail when the relabel lands.
- Reachable: n/a.

---

## C. Quote generation rules

### C-43 · A rule: definition and fields
- Where: `scripts/migrations/132_quote_generation_rules.sql:3-20`; `src/types/database.ts:2432-2454`; `src/types/app.ts:1941-1965`; `transformQuoteGenerationRule` (`transformers.ts:3103-3125`).
- Does: `quote_generation_rules (id, studio_id, name, description, project_types text[] — "*empty array = matches any*", required_scope_items text[] — "*rule fires when ALL of these are in the lead/quote's scope*", line_items jsonb — ordered `{ price_book_id?, description, category?, default_qty, default_unit_price_cents?, default_margin_bps?, notes? }`, is_active, created_at, updated_at, created_by)`; partial index on `(studio_id) WHERE is_active`.
- Rules: money in **cents**, margin in **basis points** at rest; camelCase on the wire (`priceBookId`, `defaultQty`, `defaultUnitPriceCents`, `defaultMarginBps`).
- Reachable: yes.

### C-44 · Rule engine — when a rule fires, precedence
- Where: `src/lib/quote-rule-engine.ts:29-63`; tests `nf17-quote-gen-rules.test.ts:115-220`.
- Does: `evaluateRules(rules, { projectType, scopeItems })`: skip inactive; match when `projectTypes` is empty **or** includes `context.projectType` (a `null` projectType matches only empty-list rules), **and** every `requiredScopeItems` entry is in `scopeItems` (empty list = no constraint); concatenate matched rules' `lineItems` in rule order (rules arrive ordered `created_at asc`); de-duplicate by `priceBookId ?? description`, first occurrence wins.
- Rules: pure; no per-rule priority field — order = creation order.
- Reachable: yes.

### C-45 · Accounts › Quote Rules tab — CRUD
- Where: `src/app/(main)/accounts/quote-rules-tab.tsx:49-533`; hooks `src/lib/queries/quote-generation-rules.ts`.
- Entry: `/accounts?tab=quote-rules` (*Quotes & Pricing › Quote Rules*).
- Does: header *"Quote Generation Rules"* — *"Define rules that auto-populate the Quote Digitizer with default line items when a lead matches a specific project type. Click **Generate Starter Quote** inside the digitizer to apply them."*; *"Add Rule"*; rows show name, description, up to 3 project-type badges (+N) or *"Any type"*, *"{n} item(s)"*, expand to a numbered *"Line Items"* list (`qty {n} · ${price}`), pencil → edit, trash → delete. Dialog (*"New Quote Generation Rule"* / *"Edit Rule"*; *"Define when this rule fires and which line items to insert into the quote."*): Name (*"e.g. 4-Room HDB — Living Room package"*), Description (*"Short note about when to use this rule"*), *"Triggers when project type is…"* chips from `PROJECT_TYPES` (multi-select, *"Selected: …"*), *"Line Items to Insert"* + *"Add Item"* rows (Description, *"Pick from price book"* → search *"Search price book…"* over description/category, first 40, *"No items found"*; category *"e.g. Carpentry"*; qty step 0.5; unit price *"Optional"* in dollars → cents).
- Rules: name required (*"Rule name is required."*); every line needs a description (*"All line items must have a description."*); picking a price-book item fills `priceBookId`, `description = pb.name || pb.description`, `category = pb.categoryName`, `defaultUnitPriceCents = round(unitPrice*100)`; `requiredScopeItems` is always sent `[]` — "*scope-based matching reserved for v2*" (:105); saves as `isActive: true`; delete is a **soft delete** (`is_active=false`) after `confirm('Delete rule "{name}"?')`; the list shows only active rules.
- Data: `GET/POST /api/quote-generation-rules/records`, `PATCH/DELETE /api/quote-generation-rules/records/[id]`.
- States: *"Loading rules…"*; empty *"Create a rule to auto-fill quotes based on project type."* + *"Create your first rule"*; *"No items yet. Click "Add Item" to start."*.
- Words: buttons *"Cancel"*, *"Create Rule"* / *"Update Rule"*; toasts *"Rule created."*, *"Rule updated."*, *"Couldn't save rule. Try again."*, *"Rule deleted."*, *"Couldn't delete rule."*.
- Reachable: yes.

### C-46 · "Starter Quote" in the Quote Designer
- Where: `quote-digitizer-dialog.tsx:1401-1402, 4064-4098, 8493-8505`.
- Entry: toolbar button *"Starter Quote"* (title *"Auto-populate line items from quote generation rules"*), shown only when `userIsOwner && quoteGenRules.length > 0` and not read-only.
- Does: evaluates the studio's active rules with `projectType` = the lead's project type and `scopeItems: []` ("*scopeItems blocked: dialog receives only leadId + projectType*", :4074-4076), maps each matched line to a `QuoteLineItem` (`unitPrice = cents/100`, `qty = defaultQty`, `unit "lot"`, `total`, `marginPercent = bps/100` when set, `priceBookItemId`, `category ?? "Others"`, `source "template"`, `priceType "amount"`) and **appends** them in one `trackEdit("Generate Starter Quote", …)` — "*does NOT replace existing items*".
- Rules: `notes`, `defaultMarginBps` only when present; no dedup against existing quote lines; scope-item rules can never match here (so a rule with any `requiredScopeItems` never fires).
- Data: reads only.
- States: —
- Words: *"No active quote generation rules found. Add rules in Accounts → Quote Generation Rules."* · *"No rules matched this project type. Check your rules in Accounts → Quote Generation Rules."* · *"{n} item(s) added from quote generation rules."*.
- Reachable: yes (owners with ≥1 rule).

### C-47 · Rules API — tenant and validation rules
- Where: `src/app/api/quote-generation-rules/records/route.ts`, `records/[id]/route.ts`; test `quote-generation-rules-scoped-api.test.ts`.
- Does: all routes `requireSession` (401) and use `scopedSupabase(session.studioId)`; POST/PATCH 400 *"Rule name is required"* when `name` blank; POST stamps `studio_id` from the session and ignores any body value; GET lists `is_active = true` ordered `created_at asc`; PATCH 404 *"Not found"* when RLS hides the row; DELETE flips `is_active=false`. `buildRulePayload` maps camelCase → snake_case and sets `updated_at`.
- Reachable: yes.

---

## D. Rich-text templates with variables

### C-48 · `RichTextTemplateEditor` — the shared merge-field editor
- Where: `src/components/templates/RichTextTemplateEditor.tsx:38-309`; tests `rich-text-template-editor.test.tsx`, `phase3-token-ux.test.ts`.
- Entry: every host in C-51.
- Does: TipTap editor (StarterKit + `VariableNode` + `StyledHighlight` + `TextColorMark` + optional `PreserveInlineStyle`). Toolbar: Undo, Redo, Bold, Italic, Heading 2, Heading 3, Bullet list, Ordered list, Horizontal rule, highlight picker, text colour picker; with the palette on, a *"Show tokens"* / *"Showing tokens"* toggle (titles *"Click to reveal {{variable_name}} syntax"* / *"Click to show resolved sample values"*) and an *"Insert:"* row of one button per `PALETTE_TOKENS` entry (label from `TOKEN_LABELS`, title `Insert {{token}} — resolves to "{sample}" at render time`).
- Rules: `onChange` is **debounced 250 ms** by default (`propagationMode "debounced"`, `debounceMs`), flushed on blur, cancelled on unmount; `"live"` mode pushes every keystroke; `autoFocus` places the caret at the end; `sampleValues` overrides `DEFAULT_SAMPLE_VALUES`; `preserveInlineStyles` (off by default) keeps authored `style=""` on paragraph/heading/hr/blockquote/list nodes — on only for the Quote Designer's rich-text knobs because elsewhere "*content is routinely pasted from Word and the web*" (`preserve-inline-style.ts:25-31`); known gap: `<table>` markup is flattened (no table extension). Legacy raw `{{x}}` literals are wrapped into chips on load (`wrapLiteralsAsVariableSpans`).
- Data: HTML string in / out.
- States: —
- Words: as above.
- Reachable: yes.

### C-49 · Variable chip storage format and substitution grammar
- Where: `src/components/templates/variable-node.tsx:105-212`; `src/lib/notifications/templates/substitute.ts:18-79`; test `document-template-substitution.test.ts`.
- Does: a chip serialises to `<span data-variable="X">{{X}}</span>` so the stored HTML still contains the literal `{{X}}`; `substituteVariables` replaces `/\{\{([a-z_]+)\}\}/g` from a map, **unknown or null → empty string**; `substituteDocumentVariables(html, vars, countryCode)` first injects `current_date` formatted `day numeric, month long, year numeric` in `en-SG` (`MY → en-MY`, `AE → en-AE`, `IN → en-IN`, else `en-SG`), caller value overrides; `validateRequiredVariables(html, required)` returns the required names whose `{{name}}` literal is missing.
- Rules: allowlist `[a-z_]+` — uppercase or digits in a name are never substituted (test *"ignores uppercase variable names"*); the chip shows the sample value, or `TOKEN_LABELS[name]`, or a title-cased fallback, so it "*never reads as empty*"; Delete removes the whole chip; inserting adds a trailing space.
- Data: —
- Reachable: yes.

### C-50 · Complete variable list — `{{token}}` (document templates) and `{token}` (Quote PDF body)
- Where: `template-sample-data.ts:25-77`; `contract-flow-dialog.tsx:401-459`; `src/app/api/contracts/render-pdf/route.ts:114-124`; `quote-pdf-tokens.ts:11-60, 100-111`; `preview-tokens.ts:60-121`; `region-config.ts:210-451`.

| Name | Family | Resolves to (live) | Sample value |
|---|---|---|---|
| `client_name` | palette | lead name (contract form: `recipientName` else lead name) | *"John Tan"* |
| `studio_name` | palette | `studios.name` | *"Arthaus Studio"* |
| `quote_total` | palette | primary / picked approved quote `total_cents` formatted with region symbol, 2 dp; else *"[Quote total — pending pricing]"* | *"S$45,800"* |
| `project_address` | palette | **never resolved** — always *"[Project address — fill in on the editor or set on lead]"* ("*Lead doesn't carry a free-text address yet*") | *"123 Bukit Timah Rd, #08-12"* |
| `start_date` | palette | `leads.key_collection_date`, else *"[Start date — set on lead]"* | *"15 May 2026"* |
| `current_date` | palette | today (ISO `YYYY-MM-DD` in the contract flow; long locale date via `substituteDocumentVariables`) | today, `en-SG` long form |
| `company_name` | auto-resolved (issuing entity) | `studio_companies.name` of the lead's entity, else studio name, else *"[Issuing entity]"* | *"Arthaus Studio Pte Ltd"* |
| `company_registration` | auto-resolved | entity `registration_number`, else *"[Entity registration number — set in Accounts]"* | *"201234567K"* |
| `company_gst_number` | auto-resolved | entity `gst_registration_number`, else *"[Entity GST number — set in Accounts]"* | *"201234567K"* |
| `company_country` | auto-resolved | entity `country_code`, else the studio's | *"Singapore"* |
| `company_address` | auto-resolved | entity `address`, else *"[Entity address — set in Accounts]"* | *"1 Raffles Place, Singapore 048616"* |
| `unsubscribe_url` | email wrapper only | notification unsubscribe link | — |
| **Quote PDF `{token}`** (`KNOWN_TOKENS`): `studio_name`, `studio_phone`, `studio_email`, `studio_website`, `studio_address`, `studio_instagram`, `studio_facebook`, `studio_linkedin`, `studio_whatsapp`, `studio_tiktok`, `company_registration`, `client_name`, `client_phone`, `client_email`, `client_address`, `client_ic`, `customer_id`, `project_title`, `project_ref`, `quote_number`, `quote_date`, `quote_total`, `quote_valid_until`, `prepared_by`, `prepared_by_phone`, `prepared_by_email`, `page_number`, `total_pages`, `date`, `logo` | Phase 18 | studio / lead / quote fields (`bodyTokens` in the renderer; `resolvePreviewTokens` live mode uses `lead.name/phone/email/address/projectTitle/projectRef/quoteNumber`, `quote_total` = formatted 0 in live mode) | template mode: region `sampleClient` — SG *"John Tan"* `+65 9000 0000` *"12 Bukit Timah Road, #15-08, Singapore 250012"*; MY *"Ahmad Rahman"*; AE *"Sara Al-Maktoum"*; IN *"Priya Sharma"*; `project_title` *"Sample Project — Living Room Renovation"*, `project_ref` *"P-2026-0001"*, `quote_number` *"Q-2026-0001"*, `quote_total` = 50 000 in region currency, `prepared_by` = studio name |

- Rules: `substituteTokens` normalises `{{x}}` → `{x}`; **known** tokens substitute to `""` when missing, **unknown** tokens pass through with brackets "*so studios can diagnose template typos*" — the opposite of the `{{}}` family, where unknown → empty. `company_*` are excluded from the manual insert palette "*because they auto-populate from the issuing legal entity at render time*" but still substitute when present. The `InsertVariableButton` groups Quote PDF tokens as *CLIENT* / *THIS QUOTE* / *STUDIO* / *DESIGNER (PREPARED BY)* and omits `logo`, `page_number`, `total_pages`, `client_ic`, `customer_id`, `quote_valid_until`, social handles.
- Reachable: yes.

### C-51 · Every host of the rich-text template editor
- Where: grep of `RichTextTemplateEditor` (11 hosts).

| Host | What it edits | Palette | `preserveInlineStyles` | Variables resolve at |
|---|---|---|---|---|
| `src/app/(main)/accounts/document-templates-tab.tsx:441` | T&C and Contract document templates (C-52) | on | off | signing (C-53), contract PDF (C-54); preview with `DEFAULT_SAMPLE_VALUES` |
| `src/components/settings/invoice-po-template-editor.tsx:498` | Invoice / PO / VO header, footer, terms blocks (`body_json`) | on | off | finance renderers — hand-off Finance |
| `src/components/leads/contract-flow-dialog.tsx:1665` | the composed contract paper for one lead | on | off | preview (`previewVars`) + `/api/contracts/render-pdf`, `send-to-client` |
| `src/app/(main)/accounts/signing-documents-tab.tsx:169, 314` | a `rich_text` signing-library document | on (default) | off | see Uncertain (no substitution site found) |
| `src/components/leads/signing/signing-document-picker.tsx:318` | ad-hoc signing document (*"Save to my library for reuse"*, *"Add to signing"*) | on (default) | off | see Uncertain |
| `src/components/leads/quote-row.tsx:283`, `quote-digitizer-cell.tsx:196` | a line item's rich description | **off** | off | n/a |
| `src/components/leads/quote-canva/PropertyPanel.tsx:777` | a canva text knob | **off** | on (the Quote Designer knobs) | Quote PDF `{token}` family — hand-off A |
| `src/components/leads/quote-canva/hierarchy/inline-description-editor.tsx:106` | a section / subsection description | **off** | off | n/a |
| `src/components/accounts/price-book-item-editor.tsx:800` | a price-book item's `descriptionHtml` | **off** | off | n/a |

- Rules: notes, payment terms and quote T&Cs inside the quote itself are **not** rich-text templates — the quote's payment schedule is a milestone list (C-56) and the quote's T&C prints from the `tnc` document template at signing (C-53) or from canva text blocks (hand-off A). Email/WhatsApp notification templates use `substituteVariables` with their own per-event variable sets (C-61) and a different editor (`notification-template-editor`, not this component).
- Reachable: yes.

### C-52 · Accounts › Document Templates — T&C and Contract templates
- Where: `src/app/(main)/accounts/document-templates-tab.tsx:3-12, 51-60, 146-190, 226-450`; hooks `src/lib/queries/document-templates.ts:55-219`; routes `src/app/api/document-templates/records`, `records/[id]`, `set-default`, `default`; seeds `scripts/migrations/118_seed_default_document_templates.sql:22-36`.
- Entry: `/accounts?tab=document-templates` → tabs *"Quote PDF"* (hand-off A) · *"Invoice"* · *"Purchase Order"* · *"Variation Order"* (hand-off Finance) · *"Terms & Conditions"* · *"Contract"*.
- Does: per type: a list of templates (one *"(Default)"*), create / select, edit name + body in C-48, *Preview* toggle rendering `substituteDocumentVariables(draftHtml, DEFAULT_SAMPLE_VALUES)`, *"Set as default"* (hidden on the default), delete, *"Save"* / *"Saving…"*. An entity dropdown (hidden on single-entity studios) switches between the studio-wide row (`company_id NULL`) and a per-entity override.
- Rules: header doc: "*Templates support rich text and merge fields (client name, quote total, etc.) which are filled in at signing time.*"; save disabled without a name; delete of the default is refused server-side (409, hook comment :188); `useResolvedDefaultDocumentTemplate` = entity default → studio-wide default; `useDocumentTemplates(companyId)` tri-state: `null` = studio-wide only, uuid = that entity only, omitted = all. Seeded defaults (118): *"Default Terms & Conditions"* (`is_default`, body begins *"<h2>Terms & Conditions</h2><p>This agreement is between {{studio_name}} and {{client_name}}, dated {{current_date}}.</p><p>By signing, the client agrees to the project scope and amount of {{quote_total}}.</p>…"*, `variables {client_name, studio_name, quote_total, current_date}`) and *"Default Contract"* (*"<h2>Renovation Contract</h2><p>This Contract ("Agreement") is entered into on {{current_date}} between:</p><p><strong>Studio:</strong> {{studio_name}}<br/><strong>Registration:</strong> {{company_registration}}…"*, `variables` add `start_date`, `company_registration`, `company_address`); a `signing_flow` default with `config {"docOrder":["quote","tnc","contract"]}`.
- Data: `studio_document_templates` rows `type='tnc'|'contract'` with `body_html`, `variables` (a `{name: true}` map), `company_id`.
- States: —
- Words: as above.
- Reachable: yes.

### C-53 · T&C and contract at signing time
- Where: `src/app/api/quotes/request-signature/route.ts:478-600`.
- Entry: sending a quote for signature.
- Does: loads the studio's default active `tnc` and `contract` rows (`is_default`, `is_active`, studio-wide), substitutes `templateVars` into `body_html` and appends them after the quote as signing documents: T&C = `render: "html"`, `requires_scroll: true`, `requires_accept: true`, `accept_label: "I have read and accept the Terms & Conditions."`, `requires_signature: false`; the signature lands on the **last** document ("*so contract gets it when present, otherwise tnc, else quote*").
- Rules: a template without `body_html` is skipped; title falls back to *"Terms & Conditions"*. Hand-off Contracts audit for the carousel itself.
- Reachable: yes.

### C-54 · Contract flow — compose from a template with live variables
- Where: `src/components/leads/contract-flow-dialog.tsx:401-475, 1630-1700`; `src/app/api/contracts/render-pdf/route.ts:99-124`; test `contract-template-flow.test.ts`.
- Entry: lead → Contract flow → *Compose* path (the picker of contract templates is read-only there — "*Manage-templates-in-Accounts link points at the deep-link*").
- Does: split-pane editor (C-48) + preview substituting `previewVars`; a *Variables* popover *"What each token resolves to"* listing the 11 `{{}}` names with resolved values (missing ones in `[brackets]`); footer *Download* (PDF via `renderContractPdfBuffer`, variables rebuilt **server-side** from the lead, its approved quote and issuing entity), *Send* (disabled without a lead email), ⋮ *Save as template* (name defaults to *"{base} (custom)"* or *"Custom Contract"*, saved as a new `contract` document template); send-for-signature passes `contractBodyHtml` so the composed paper becomes the signing contract "*alongside the default T&C*".
- Rules: *"Nothing to save — open a template and make edits first"*; *"Studio not loaded — please try again"*.
- Reachable: yes. Hand-off Contracts audit for the rest of the dialog.

### C-55 · Signing Documents library — host only
- Where: `src/app/(main)/accounts/signing-documents-tab.tsx:146-190, 300-330`; `src/components/leads/signing/signing-document-picker.tsx:301-334`; table `studio_signing_documents` (`kind`, `title`, `file_path`, `body_html`, `requires_scroll`, migration 242).
- Does: *"Edit signing document"* / *"Create signing document"* — Title (*"e.g. Service Agreement"*, *"e.g. Scope of Work"*), rich-text *Content* for `rich_text` kind, *"Require client to scroll"* (*"Client must reach the bottom of the document before they can sign."*), picker toggle *"Save to my library for reuse"*, *"Add to signing"*. Hand-off Contracts audit.
- Reachable: yes.

### C-56 · Quote payment-schedule defaults (template-driven) — touchpoint
- Where: `quote-digitizer-dialog.tsx:215-225` (`DEFAULT_PAYMENT_MILESTONES`), `:1130-1165`; `usePaymentScheduleTemplates` (`src/lib/queries/finance.ts:317`, `GET /api/finance/records/payment-schedule-templates`); Accounts tab `payment-schedules`.
- Does: a new quote's schedule = the studio's `is_default` row of `payment_schedule_templates` (stages `name`, `percent`, `trigger`), else the hard-coded *Deposit 10% "Upon signing" · Commencement 30% "Works commence" · Mid-Project 30% "50% completion" · Completion 30% "Handover"*; a saved custom schedule always wins for display; the `payment_schedule.override` permission gates **editing only**; the legacy 10/30/30/30 stamp counts as "unset". Milestones can be `percent` or `fixed` (`amountCents`, feature `feeFirstMilestones`).
- Rules: CSV row 35: Payment Schedule templates show "*a read-only banner to non-owners, but this is NOT server-enforced*". Hand-off Finance audit.
- Reachable: yes.

---

## E. Admin templates

### C-57 · What the platform admin can do with templates
- Where: C-22 plus `src/__tests__/admin-templates-page.test.tsx:77-132`.
- Does: only the **Package** kind has an admin surface: list `is_system` packages, *"+ New platform template"*, *"Edit"* (metadata + items on the grid). There is no admin surface for Quote/Design Templates, T&C/contract templates, generation rules, or per-country seeding; per-country reach is expressed on the row itself (`region_code`, `property_type`) and studios pull platform rows through the same picker filters (C-05) or copy them (C-20). Tests pin: only `is_system` rows listed; empty state *"No platform templates yet."*; Edit opens *"Edit platform template"*; New opens the editor in creating mode (title still *"Edit platform template"* — "*mode='platform' wins*").
- Rules: see C-22 and Uncertain for whether the data path works.
- Reachable: page yes.

---

## F. Touchpoints (named, not inventoried)

### C-58 · Project templates — `project_templates`
- Where: `src/app/api/project-templates/records/route.ts`, `records/[id]/route.ts`; hooks `src/lib/queries/project-templates.ts:32-110` (`useProjectTemplates`, `useSaveProjectTemplate`, `useUpdateProjectTemplate`, `useDeleteProjectTemplate`).
- Does: `{ name, description, projectType, propertyType, templateData: ProjectTemplateData }`; studio-scoped CRUD (`name` required). A template in the same sense (studio-authored, reusable) but for projects. Hand-off Projects audit.

### C-59 · Milestone templates — `/accounts/milestone-templates`
- Where: `src/app/(main)/accounts/milestone-templates/page.tsx:20-60`; `src/lib/milestone-templates.ts` (`captureMilestonesIntoTemplate`, `applyTemplate`, `summariseTemplate`); hooks `src/lib/queries/milestone-templates.ts`.
- Does: *"Milestone Templates"* — *"Reusable timeline shapes you can apply when creating new projects."*; rename + delete here, capture/apply elsewhere. Hand-off Projects audit.

### C-60 · Timeline templates — `studio_document_templates` `type='timeline'`
- Where: `src/lib/queries/document-templates.ts:221-240` (`useTimelineTemplates`), Accounts tab `timeline-templates`; test `timeline-templates.test.ts`.
- Does: one template per project type (`name = projectType`), falls back to the static `TIMELINE_TEMPLATES`; consumed by the Gantt. Hand-off Projects audit.

### C-61 · Notification templates — email + WhatsApp
- Where: `src/lib/notifications/templates/{substitute,render,whatsapp,format-assignees}.ts`, `base/*.ts`; table `notification_templates`; `EVENT_CATALOG` (`src/lib/notifications/events`).
- Does: per-event `{{var}}` templates (studio override → React Email base), sanitised with `sanitize-html` (allowed tags/attrs include `span[data-variable]`), WhatsApp one-liners (e.g. `'quote.signature_requested': "Hi {{client_name}}, please review and sign the quote from {{studio_name}}: {{action_url}}"`), `SAMPLE_DATA` per event, required-variable validation. Same grammar as C-49, different variable sets. Hand-off Notifications audit.

### C-62 · Cover-page templates
- Where: `src/components/leads/cover-editor/templates/index.ts:43-57`; `CoverTemplateId = 'editorial' | 'magazine_split' | 'minimal' | 'bold_statement' | 'studio_letterhead'`.
- Does: data-only slot/background presets for the quote cover; "template" = design preset, not content. Hand-off A/B.

### C-63 · Floor-plan templates
- Where: `src/data/floor-plan-templates/{index,my-templates,ae-templates,in-templates}.ts` + `floor-plan-templates-base`.
- Does: region-aware housing geometry presets for the 3-D Space Planner (CSV row 23). Not a quote template. Hand-off Tools.

### C-64 · Invoice / PO / VO document templates
- Where: `src/components/settings/invoice-po-template-editor.tsx`; migrations 159, 162, 166-170; tests `phase2a-vo-templates.test.ts`, `phase3-template-unification.test.ts`.
- Does: `body_json` blocks (header, footer, terms, toggles such as `showBankDetails`, `showAcceptanceTerms`) per type, per entity, with `{{}}` chips. Hand-off Finance audit.

### C-65 · `signing_flow` and `portal` document types
- Where: `DocumentTemplateType`; migration 118:39-50.
- Does: config-only rows (`docOrder`). Hand-off Contracts / Portal audits.

### C-66 · Quote source picker (Projects)
- Where: `src/components/projects/quote-source-picker-dialog.tsx:21-36`; test `quote-source-picker-dialog.test.tsx`.
- Does: picks the line items that seed a project's AI generation — *"This project's quote"* snapshot first, else the lead's live quote (*"Lead's quote"*), *"Checking for a linked quote…"* while loading, *"Couldn't load this lead's quote"* + *Retry* on error, *"No quote on file"* only when truly empty, *"Upload a new quote"*. Not a template. Hand-off Projects audit.

### C-67 · Canva reference templates
- Where: `src/lib/quote-canva/reference-templates.ts`; `scripts/dump-ref-templates.ts`.
- Does: three built-in canva bodies (the Dyel letter etc.) used as house styles; the dump script exports them for seeding a fork. Hand-off B.

### C-68 · Feature-requirements CSV rows touching this slice
- Where: `docs/openmaison-v1-feature-requirements.csv:14, 17, 23, 35, 51`.
- Does: row 14 *"4 Ways to create quotes (Blank, Template, AI Prompt, Upload, Previous Quote)"* — *"Tech-Reviewed / P0 / Done"* — "*Can start a quote Blank, from a saved Package, from an AI Prompt (grounded in the studio's price book or market-rate fallback), or by Upload (PDF/image/CSV/XLSX up to 10MB, AI-parsed) - gated to owner/admin/id only, not Accounting.*" (the CSV says "saved Package" where the entry screen actually offers saved Quote/Design Templates plus the *Blank Quote* copy's "pick a package"); row 17 *"Formatting Features"* — the Design Template editor is "*owner-only by UI convention (not enforced server-side)*" (hand-off A); row 35 payment-milestone templates (C-56); row 23 Space Planner templates (C-63); row 51 VO (C-64).

### C-69 · Decision history (plans and rule files this slice is built from)
- Where: `docs/superpowers/plans/2026-06-03-quote-templates-plug-and-play-plan.md` (two scopes, platform + studio, three RPCs, picker with preview, `TemplateEditor` in two modes, `/admin/templates`, `quote_template_edit` slug, 100-item apply perf budget, `resolvePreviewTokens` + region sample clients); `2026-06-03-quote-hierarchy-section-subsection-plan.md` (sections/subsections as first-class JSONB on the lead — the `hierarchy` a project package snapshots); `2026-07-24-packages-category-wise-only.md` (project scope retired, migration 270, unified *"Pick a package"* copy, save-as category-only, CTA simplified, scope badge dropped); `2026-07-28-multiple-packages-per-quote.md` (opt-in multi-select, batch apply as one undo, mapper extracted — "*No DB, no migration*"); `2026-09-11-package-editor-quote-grid.md` (package editor on `LineItemsGrid`, `AssemblyItem` widened, item's own category beats the row's, migration 305, `TemplateItemsEditor` retired, unstorable controls hidden); `docs/rules/quote-terminology.md` (three-concept lock 2026-07-23; one Package surface 2026-08-19).
- Rules: where a plan and the code disagree, the code above is what was recorded (e.g. the plan's `apply_*` RPC picker flow vs the shipped client-side append; the plan's "Insert template" / "Pick a template" toolbar vs the shipped *"Add package"* menu item).

---

## Uncertain / not verified

- **Platform packages under RLS.** Migrations 223/226 lock `studio_assemblies` with `USING (studio_id = (auth.jwt()->>'studio_id')::uuid)` and every read goes through `scopedSupabase`; a platform row has `studio_id IS NULL`, which never satisfies that predicate. I found no policy clause for `is_system`. Inferred: the *"Platform packages"* section (C-20) and the picker's platform rows are empty on a hardened database. Not run against a live DB.
- **`/admin/templates` data path.** The page calls `/api/quotes/assemblies`, which requires a studio session (`requireSession`), while the admin portal uses a separate `qanvast_admin_session` cookie; and the *create* op stamps `studio_id = session.studioId`, `is_system = false`, so *"+ New platform template"* cannot produce an `is_system` row through this code. Inferred from code only.
- **Save-as-template dialog copy.** The second radio card's subtitle was truncated in my read after *"…Best for new projects starting f"* (`quote-digitizer-dialog.tsx:10740`); the set-default checkbox label (:10775-10782) was filtered out with the markup — both need a direct look.
- **Signing-library documents and variables.** The signing-documents tab and picker mount the editor with the palette on, but I found no substitution site for those bodies (grep `substituteDocumentVariables(` hits only the Document Templates preview); whether `{{tokens}}` in a library document resolve at signing is unverified.
- **Accounts page access.** I did not read `docs/rules/architecture.md`'s route matrix for `/accounts`; the Packages / Quote Rules / Document Templates tabs carry no gate of their own, so who can reach them depends on that matrix.
- **`create_template_from_quote` per environment.** Which RPC body (185 / 302 / 305 lineage) each environment actually runs is stated in migration 305's survey (`docs/rules/create-template-from-quote-fleet-survey-2026-09-15.md`, not read); prod was on the 8-key body as of 2026-09-15.
- **`useApplyCategoryTemplate` / `useApplyProjectTemplate`.** Marked dead from a caller grep over `src` (only their own tests import them); a dynamic import or an out-of-`src` caller would not have been seen.
- **Quote source picker** is in this slice's file list but is a Projects component; recorded as a touchpoint only.
- **Region / property filter effect on real data.** Whether the lead's `type` values (e.g. *"HDB 3-Room"*) share the vocabulary of `property_type` written by Save-as-package (the lead's `type`) is by construction the same field, but platform seeds hand-type the string; mismatches would hide rows silently.
