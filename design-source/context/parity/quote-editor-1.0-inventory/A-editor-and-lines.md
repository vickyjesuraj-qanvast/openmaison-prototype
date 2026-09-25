# OpenMaison 1.0 — Quote editor inventory · Slice A: the editor surface and its lines

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-24.

Conventions: *Words* are quoted verbatim from code. "Hand-off" = owned by another reader (B money / C lifecycle / D data) or the templates audit, and only named here. `QDD` = `src/components/leads/quote-digitizer-dialog.tsx` (10,830 lines, the editor). Citations of the templates inventories read "templates A-nn / B-nn / C-nn / D-nn" (`../quote-templates-1.0-inventory/`); citations of the Leads inventories read "leads B-nn" (`../leads-1.0-inventory/B-detail.md`).

## Vocabulary (where each word is defined)

- **Quote** — a `quotes` row (the container): `label`, `quote_number` (`QT-###` / `VO-###`), `status`, `is_primary`, `quote_type` ∈ `standard · variation · ai_generated` (`src/types/app.ts:854-899`, templates D-08). A lead can hold several.
- **Primary quote** — the lead's `is_primary` quote; `leads.quote_status` is a trigger-maintained mirror of its status (`docs/rules/leads.md:369-383`). The Tools page always opens the primary; the lead drawer opens any.
- **Quote Editor / Quote Digitizer / Quote Designer** — one component, three names. The dialog header says *"Quote Editor"* (or *"Variation Order"*); the nav item and page key say *"Quote Digitizer"* (`tools/quote-digitizer`); code comments call the canva-mode editor the *"Quote Designer"*. "Digitizer" in the narrow sense = upload a quote → AI parse → lines.
- **Line item / line / row** — a `quote_line_items` row, React type `QuoteLineItem` (`src/types/app.ts:776-851`; DB columns templates D-10).
- **Section / category** — the free-text `category` string on a line. Sections are derived from the lines (a section exists iff a line carries it) except session-only empty sections added in the editor. The studio catalogue is `studio_quote_categories` (templates C-30, D-18).
- **Sub-section / subcategory** — the free-text `subcategory` string on a line; a per-quote list of *declared* names lives in `leads.quote_metadata.subsectionOrder` (`src/lib/quote-canva/hierarchy/subsection-actions.ts:1-35`).
- **Hierarchy** — the section structure: today the lead-level `leads.quote_metadata` keys `categoryOrder`, `sectionDescriptions`, `subsectionDescriptions` (`"Cat|Sub"`), `subsectionOrder`, `subsectionTotalLabels`; the older `leads.quote_hierarchy_metadata` JSONB (`QuoteHierarchy`, `src/lib/quote-canva/hierarchy/types.ts:11-28`) is legacy and ignored by the editor (`quote-hierarchy-editor.tsx:1-31`).
- **Price type** — `QuotePriceType` ∈ `amount · foc · kiv · inclusive · by_client · lump_sum · content_block`; grid labels `PRICE_TYPE_LABELS` = `""`, *"FOC"*, *"KIV"*, *"Incl."*, *"By Client"*, *"L/S"*, `""` (`src/components/leads/quote-digitizer-cell.tsx:19-23`).
- **Amount marker** — `amountMarker`: a short free label (≤ 24 chars) printed in the AMOUNT cell instead of money; the line leaves the totals but its cost still counts toward margin. Legacy codes `inclusive` → *"Inclusive"*, `foc` → *"F.O.C."* (`src/lib/quote-amount-marker.ts`, migrations 180 → 298).
- **Optional line** — `isOptional` (*"Client can toggle on signing page"*).
- **Omission** — `isOmission` on a variation-order line: a scope cut that credits the contract (`src/lib/finance/vo-omission.ts`).
- **VO / variation order** — a `quotes` row with `quote_type = 'variation'`, edited in the same component with `quoteType="variation"`.
- **Ref / ref override** — the `#` column value: computed per numbering mode, or the line's `refOverride` (migration 200); a single space = *blank ref*.
- **Content block** — legacy `priceType = 'content_block'` row holding rich text; migrated on open into the layout's inline inserts (`QDD:1241-1253`).
- **Source** — provenance on a line: `manual · ai_drafted · ai_estimated · template · parsed · price_book · market_rate · web_estimated · needs_pricing` (migration 290).
- **Panel grid / focused grid** — the default Items-tab table and the full-screen dense Excel-like overlay; both render one `LineItemsGrid` from one context (`src/components/leads/focused-grid/`).
- **trackEdit** — the editor's undoable write wrapper (`QDD:853-864`).
- **Package / Quote Template / Design Template** — see templates C vocabulary; Package = add to a quote, Quote Template = start a quote, Design Template = the look (`docs/rules/quote-terminology.md`).

---

## Entry and frame

### A-01 · Every place that opens the editor
- Where: hosts of `QuoteDigitizerDialog` — `src/components/leads/lead-detail-drawer.tsx:2722-3245`; `src/app/(main)/tools/quote-digitizer/page.tsx:470-530`; `src/components/copilot/meeting-brief.tsx:844-960`; `src/components/finance/quotes-table.tsx:492-560`; `src/components/finance/vo-editor/vo-editor-host.tsx:260-330`.
- Entry: (1) lead drawer — Quotes section / quote summary card / *"New Quote"* / *"Add Quote"* / journey step action *"Open Quote Digitizer"* (`lead-detail-drawer.tsx:1836`, `2182`, `2561`; leads B-58, B-59); (2) Tools › *"Quote Digitizer"* (A-02); (3) deep links `/leads?openLead=X&quoteId=Y` and `&openQuote=true` from Tasks › *"Review Quote"* (`src/app/(main)/tasks/page.tsx:309, 466-476`) and the project draft-setup wizard's quote step (`src/components/projects/draft-setup-wizard.tsx:246`) (A-03); (4) meeting co-pilot brief card *"Create draft quote"* → *"Create"* / *"Draft {n} · Reopen"* (A-120); (5) Finance › Operations and a project's Quotes table (existing quotes; variation orders are rerouted to the VO editor, `quotes-table.tsx:467-490`); (6) the VO editor host (Projects / Variation Orders section) in variation mode.
- Does: every host passes the lead/quote identity, status, initial items, the per-quote layout JSON (`doc_sections`, `payment_schedule`, `parsed_doc_metadata.__layout`), and save callbacks (`onAutoSaveDraft`, `onSaveDraft`, `onAutoSaveLayout`, `onDocumentParsed`, `onSubmitForReview`, `onApproveQuote`, `onRejectQuote`, `onQuoteDeleted`).
- Rules: the drawer mounts the dialog only when the studio's page key `tools/quote-digitizer` is enabled; other buttons route through `guardedToolOpen` (leads B-05). The VO host, the quotes tables and the meeting brief mount it without that gate.
- Data: props `QuoteDigitizerDialogProps` (`QDD:353-495`).
- States: quotes table shows *"Loading quote…"* until items resolve, so the dialog never mounts with `items=[]` mid-fetch (`quotes-table.tsx:448-463`).
- Words: as above.
- Reachable: yes (all six).

### A-02 · Tools › Quote Digitizer page
- Where: `src/app/(main)/tools/quote-digitizer/page.tsx:1-532`; nav `src/components/layout/app-sidebar.tsx:20, 380-400`, `topbar.tsx:24`, `bottom-nav.tsx:35`; access `src/lib/access-control.ts:94`.
- Entry: sidebar Tools › *"Quote Digitizer"*; studio-setup checklist link (`src/app/studio-setup/page.tsx:713`).
- Does: header *"Quote Editor"* / *"Upload contractor quotes and digitize them with AI. Edit, review, and send to clients."*; *"Select a Lead"* (searchable, leads whose bucket ≠ `CLOSED`, sublabel `{type} · {currency}{budget}`), *"Select a Project"* (active projects, filtered to the lead's; auto-picked when exactly one), *"Reset"*, and the open button whose label is *"Open Quote Editor"* / *"Loading…"* / *"View Quote"* (lead mirror approved or submitted) / *"Revise Quote"* (rejected) / *"Edit Quote"* (draft). A context card shows the lead or project.
- Rules: always opens the lead's **primary** quote (`primaryQuoteId` = `is_primary` else first). The project picker is display-only — no `projectId` reaches the dialog. Approve / Reject callbacks are passed only for owners (`userIsOwner`), while the footer's *"Approve"* label follows the resolved approver flag. Submit / approve / reject hard-fail without a primary quote (*"Couldn't submit — no quote selected. Open the lead drawer to manage quotes."*), but the line-items save itself mints a primary quote server-side when none exists (A-15).
- Data: `useQuotesForLead`, `useQuoteLineItems(leadId, primaryQuoteId)`; saves via `useSaveQuoteLineItems` + lead mirror `quoteStatus: "draft"` on every save (`page.tsx:106-122`).
- States: empty *"Select a lead above to start digitizing a quote"* / *"You can also access the Quote Digitizer directly from the lead drawer"*; project picker placeholder *"No projects linked to this lead"* / helper *"No projects are linked to this lead yet"*.
- Words: as above; toasts `{label} approved`, `{label} submitted for review`, *"Quote approved"*, `Failed to submit quote: {msg}`.
- Reachable: yes, roles `owner · admin · id` (not Accounting), when the studio has the page enabled.

### A-03 · Deep links and URL sync
- Where: `lead-detail-drawer.tsx:695-790`; hand-off leads B-04 (full row).
- Entry: `?openLead=X&quoteId=Y` (bookmarkable), `?openLead=X&openQuote=true` (opens the primary, else first quote).
- Does: adopts the quote id and opens the editor; mirrors the open quote back into the URL while open and strips it only after the dialog has been seen open.
- Rules: Tasks › *"Review Quote"* passes `quoteId` only when the task's `relatedEntityId` is a quote id (legacy tasks carry the lead id).
- Data: URL only.
- States: —
- Words: *"Review Quote"* (tasks page).
- Reachable: yes.

### A-04 · The dialog frame
- Where: `QDD:6528-6580` (Dialog + DialogContent), `6581-6887` (header), `QDD:2656-2660` (FAB).
- Entry: any A-01 path.
- Does: a full-viewport dialog (`w-screen h-dvh`) with a header row, optional status banners, a body (left sidebar · centre pane · right drawer) and a footer inside the centre pane. While open it broadcasts `maison-fab-visibility` so the mAIson FAB hides.
- Rules: Escape and pointer-down-outside are both no-ops (`onEscapeKeyDown` / `onPointerDownOutside` call `preventDefault`) — the only exits are the header ✕ and footer *"Cancel"* (A-11). Editor chrome (price book, save-as-template, AI, version, share, undo/redo, discard, Ask AI, footer) is hidden while the entry chooser owns the centre pane (`editorActive = items.length > 0 || itemsSource !== "none" || userChoseBlank`, `QDD:1689`).
- Data: —
- States: `sr-only` description *"Digitize and manage quote line items"*.
- Words: title *"Quote Editor"* / *"Variation Order"* + `— {leadName}`.
- Reachable: yes.

### A-05 · Header identity: quote name, number, status, save chip
- Where: `QDD:1064-1097` (`commitHeaderRename`), `QDD:6596-6680`.
- Entry: header.
- Does: shows the active quote's `label` as a button (*"Rename this quote"*) → inline input (max 60 chars; Enter commits, Escape cancels, blur commits); shows `quoteNumber`; a status badge for every status except `none` / `draft` (labels from `getQuoteStatusLabel`, leads B-58); a save chip *"Saving…"* · *"Saved"* (3 s) · *"Save failed"* (title = error) · *"Unsaved"*. Footer: *"Last saved just now"* / *"1 min ago"* / `{n} mins ago`.
- Rules: rename refuses a label already used by another quote on the lead, case-insensitive; blank or unchanged = no-op. Label shown only when a `quoteId` resolves to a row.
- Data: `PATCH` via `useUpdateQuote({ quoteId, updates: { label } })` → `quotes.label`.
- States: input disabled while the mutation is pending.
- Words: `A quote named "{x}" already exists on this lead` · `Renamed to "{x}"` · *"Failed to rename quote"*.
- Reachable: yes.

### A-06 · Opening: which items load, hydration and the entry gate
- Where: `QDD:2680-2811` (open-transition effect), `2787-2806` (late arrival), `7896-7993` (shimmer, scanning, entry, recovery), `4718-4761` (`resetQuoteContext`).
- Entry: dialog open.
- Does: on the open transition only, seeds `items` from `initialItems`, clears chat + undo, restores doc-level AI insights and payment milestones from the persisted parsed doc; a 250 ms hydration shimmer covers a warm cache; a late-arriving items fetch fills an untouched, empty editor once. The centre pane then shows, in priority: a skeleton (while hydrating, while the host says items are loading, or while templates are unfetched) → the scanning card → the entry screen (hand-off templates C-35) → the editor.
- Rules: entry screen only when `!isScanning && items.length === 0 && itemsSource === "none" && !chatPanelOpen && !hydrating && !initialItemsLoading && docTemplatesFetched && !userChoseBlank && !isVariation` (a VO never sees it). If the quote is `approved / submitted / sent_for_signature / client_signed` but has no items, a recovery card replaces the entry screen. `resetQuoteContext` (upload, blank, new template, discard) clears items, sections, empty categories, milestones, chat, undo and bumps the generation fence `parseVersionRef`.
- Data: localStorage `quote_source_q_{quoteId}` (else `quote_source_{leadId}`) caches `{ file, doc }` of the last parse without `lineItems` (`QDD:513-536`); DB fallback `quotes.parsed_doc_metadata` / legacy `leads.quote_data`.
- States: recovery card *"Line items couldn't be loaded"* / *"This quote is {status} but no line items are showing here. The signed snapshot is still safe — only the editable copy is missing. Try reloading; if it persists, open the signed PDF from the lead drawer."* / *"Reload"* / *"Close digitizer"*.
- Words: as above.
- Reachable: yes.

### A-07 · Entry screen — the non-template ways in (touchpoint)
- Where: `src/components/leads/quote-empty-state.tsx:33-735`; mount `QDD:7989-8019`. Hand-off templates C-35 (the screen, its zones and template cards), C-36 (apply + Undo), C-40 (*"New design template"*).
- Entry: A-06 gate.
- Does: (line-side parts only) *"Blank Quote"* (*"Start from an empty table — add rows, pick a package, or browse items from your price book"*, *"Start blank →"*) → `resetQuoteContext()` then editor on Items; *"Upload a quote"* (*"PDF · XLS · JPG"*) → the hidden file input (A-102); *"Draft with AI"* (Beta) / cold-start *"AI Quote Drafter"* hero → a composer (Enter sends, Shift+Enter newline, auto-grow to ~6 lines, *"Draft"*), *"Try"* example chips that send immediately, grounding line *"Grounded in your {n}-item price book"* / *"No price book yet — drafts use market-rate estimates"* → opens the chat (A-111).
- Rules: example prompts come from `regionConfig.exampleQuotePrompts`, else `DEFAULT_EXAMPLES` (*"4-room BTO, Scandi, full reno, 65k"*, *"Condo reno with new kitchen"*, *"Carpentry only — kitchen + master wardrobe"*). Every action fires a `trackClientEvent` (`quote_entry_blank_started`, `quote_entry_upload_clicked`, `quote_entry_ai_opened`, `quote_entry_ai_drafted`, `quote_entry_search_zero_match`, `quote_entry_template_applied`).
- Data: —
- States: —
- Words: placeholder `e.g. {first example}… (Shift+Enter for newline)`.
- Reachable: yes.

### A-08 · One dialog per quote: the remount key and the lazy quote mint
- Where: `lead-detail-drawer.tsx:313-320, 447-495` (`ensureActiveQuoteId`), `2722-2738`; tools page `page.tsx:43-50, 460-475`; test `quote-digitizer-remount-key.test.ts`.
- Entry: open / switch quote.
- Does: the dialog is keyed by a quote id **captured at open** (`dialogQuoteKey`), so switching to another quote remounts it fresh, while a mid-session lazy mint does not. On the first save of a quote-less lead, the drawer adopts the lead's existing quote (fresh read `GET /api/quotes/records?leadId=`) or creates one (`isPrimary` only when the lead has none).
- Rules: the key resyncs on close. The first line save promotes `leads.quote_status` from `none` to `draft`; later saves never touch the mirror (so editing a non-primary draft can't downgrade an approved primary).
- Data: `quotes` (create via `useCreateQuote`).
- States: —
- Words: *"Couldn't submit — quote create failed. Try again or refresh."*.
- Reachable: yes.

### A-09 · Line-items autosave
- Where: `QDD:2327-2403` (debounced autosave), `803-825` (`reconcileInsertedIds`), `2276-2322` (dirty safety net), `2261-2263`.
- Entry: any edit.
- Does: 2 s after the last change, sends the whole items array plus `{ effectiveTaxRate }` to the host's `onAutoSaveDraft` (else `onSaveDraft`) → `POST /api/quotes/line-items` (A-15). The response's `insertedIds` map rewrites temp ids to DB ids in state and in the parse ref. If the user typed during the save (content signature without ids differs), the editor stays dirty and saves again.
- Rules: skipped when closed, read-only, not dirty, the AI agent is running, no save callback, or **`items.length === 0`**. A save scheduled before an Undo/discard no-ops at fire time (generation fence). A second safety net flips `isDirty` whenever an items signature (id + money fields) changes outside `trackEdit`. Browser `beforeunload` prompt while dirty.
- Data: see A-15.
- States: chip *"Saving…"* → *"Saved"* (3 s) → idle; *"Unsaved"*; *"Save failed"*.
- Words: toast *"Autosave failed — click Save Draft to retry."* (there is no Save Draft button in the footer — see A-129).
- Reachable: yes.

### A-10 · The other saves (layout, ref, design, money toggles)
- Where: `QDD:2515-2562` (layout, 2 s), `2570-2593` (ref override, 700 ms), `5020-5068` (canva body, 800 ms), `5075-5110` (canva overrides, 800 ms), `2010-2046` (GST / document discount, immediate).
- Entry: edits outside the lines.
- Does: layout → host `onAutoSaveLayout` → `quotes.doc_sections`, `quotes.payment_schedule`, `quotes.parsed_doc_metadata.__layout{globalStyles, brandColor, logoUrl}`; project-ref override → `quotes.parsed_doc_metadata.refNumberOverride` (single-key server merge); canva body / overrides → `leads.quote_metadata.canvaBlocks` / `canvaOverrides`; GST toggle and document discount → `leads.quote_metadata.gstEnabled` / `docDiscount`.
- Rules: everything under `leads.quote_metadata` is per **lead**, shared by every quote on that lead (A-121). The column is replaced whole on every write: the canva writes spread a fresh copy of the lead (`currentLeadRef`), the GST / discount writes the render-time copy. Hand-off templates B-42 (canva persistence), B money (GST / discount), C (payment schedule).
- Data: as above.
- States: —
- Words: *"Couldn't save quote changes — please retry"* (drawer layout save).
- Reachable: yes.

### A-11 · Close, the close prompt, and Discard / Keep
- Where: `src/lib/quote-editor/close-confirm.ts:1-92`; `QDD:6530-6555` (programmatic close), `6880-6886` (✕), `9298-9301` (*"Cancel"*), `10291-10364` (prompt); tests `idl-uat-a2-close-confirm.test.ts`, `quote-digitizer-finalized-close.test.ts`, `quote-digitizer-discard-race.test.ts`.
- Entry: header ✕ (title *"Close"*), footer *"Cancel"*.
- Does: asks first when `shouldConfirmQuoteClose` — not finalized **and** (dirty **or** (an autosave landed this session **and** items remain)). Prompt title/body/button follow `quoteCloseConfirmCopy`: dirty → *"Save before closing?"* / *"You have unsaved changes in this quote. Save as draft to come back to it later, or discard to throw them away."* / *"Save as Draft"*; saved → *"Keep this quote?"* / *"This quote is already saved as a draft on the lead — closing will leave it there. Keep it to come back later, or discard to remove it and its line items."* / *"Keep draft"*. Buttons *"Keep editing"*, *"Discard"* (A-12 delete path), and the keep button (only when items exist) → explicit save (A-13) then close only if it landed.
- Rules: finalized = `approved · sent_for_signature · client_signed` → closes silently, never offers Discard. A programmatic close while dirty first waits (*"Waiting for save to finish…"*), then flushes an autosave and closes, else falls back to the prompt. The Discard close is fenced: if a template was applied while the delete was in flight, the dialog stays open.
- Data: —
- States: —
- Words: as above.
- Reachable: yes.

### A-12 · Discard the quote (header trash) and remove the uploaded document
- Where: `QDD:4783-4889` (`handleRemoveDocument`), `6837-6851` (trash), `10420-10466` (confirms); tests `quote-discard-deletes-before-saving.test.ts`, `quote-discard-footer-trash.test.ts`.
- Entry: header trash (title *"Discard all line items and start over"*, shown when not read-only and there are items or a scanned file); sidebar document card trash (title *"Remove document"*).
- Does: **Discard** → confirm *"Discard this quote?"* / `This permanently deletes this quote and all {n} line item{s}[, along with the uploaded document]. Saved versions are kept in version history. This can't be undone.` / *"Discard"* → waits for any in-flight items save, deletes the `quotes` row (line items cascade), tells the host (`onQuoteDeleted`), toasts *"Quote discarded"* and closes. **Remove document** → confirm *"Remove uploaded document?"* / *"This will remove the uploaded document and all parsed line items. Any edits you have made will be lost."* / *"Remove"* → resets the editor and saves an **empty** items array (quote row kept) → *"Document removed"*.
- Rules: finalized quotes are refused before anything is touched (*"This quote is approved and locked. Revise it to make changes — it can't be discarded from here."*). A quote with a signing request is not deleted (`SIGNATURE_EXISTS` → *"This quote has already been signed by the client and can't be discarded."*); other failures → *"Failed to discard quote — please retry"*; the quote survives intact either way. No `quoteId` yet → nothing to delete, no save (an empty save would mint a quote). Both paths clear the localStorage parse cache and chat.
- Data: `DELETE /api/quotes/records/[id]` (409 `QUOTE_APPROVED` on approved/sent standard quotes — hand-off C).
- States: trash disabled while the AI agent runs.
- Words: as above; *"Couldn't clear the document — please retry"*.
- Reachable: yes.

### A-13 · Explicit "Save as Draft" and why an emptied quote can't be saved
- Where: `QDD:4220-4262` (`handleSaveDraft`), `10340-10362`.
- Entry: only the close prompt's *"Save as Draft"* / *"Keep draft"* button; there is no standalone save button.
- Does: saves items through `onSaveDraft` (host toast *"Quote saved as draft"*), re-persists the edited payment schedule into the parsed doc, and writes an explicit version snapshot (`createVersionMutation`, `isExplicit: true`, with `quoteMetadataSnapshot`) — hand-off C for versions.
- Rules: every save path requires `items.length > 0` (autosave A-09, pre-close flush, this button). Deleting every row therefore can't be persisted except by Discard (deletes the quote) or Remove document (saves `[]`). On a bounced save (e.g. 409 `QUOTE_LOCKED` → host toast) the dialog stays open and dirty.
- Data: `quote_versions` (hand-off C, templates D-07).
- States: —
- Words: *"Failed to save quote draft"*, *"This quote is locked. Revise the quote first to make edits."*, *"Still loading your session — please try again in a moment."* (drawer, `lead-detail-drawer.tsx:2880-2905`).
- Reachable: yes.

### A-14 · "You have unsaved changes" strip
- Where: `QDD:8712-8765`.
- Entry: Items tab, when not read-only, dirty, and no save in flight/just landed.
- Does: *"You have unsaved changes"* *"— autosaving as you edit. Use Save Draft below if you want to commit now."* with *"Save now"* → immediate autosave call.
- Rules: —
- Data: as A-09.
- States: —
- Words: as above.
- Reachable: yes.

### A-15 · Server save of the lines — `POST /api/quotes/line-items`
- Where: `src/app/api/quotes/line-items/route.ts:1-748`; client `useSaveQuoteLineItems` (`src/lib/queries/leads.ts:941-1040`); tests `quote-digitizer-save.test.ts`, `quote-line-items-highlight-column-tolerance.test.ts`.
- Entry: every save path.
- Does: (1) resolves the quote: a supplied `quoteId` must be a live quote on the lead, else the lead's primary, else **mints** a primary *"Quote"* `QT-###` (5 retries on number collisions); (2) lock check; (3) price-book cost auto-match for lines that are `amount`, priced > 0, without cost or price-book link — only `high` tier matches fill `costPrice`, `priceBookItemId`, `wastePercent`, `costType`, `vendorId`, `priceSnapshotAt`; (4) upsert-by-id diff: rows missing from the payload are deleted (chunks of 100), rows whose id is an existing DB uuid are upserted (chunks of 100), the rest inserted (chunks of 1000) and their new ids returned as `insertedIds`; (5) rolls the quote totals up onto `quotes` (hand-off B).
- Rules: locked statuses `approved · client_signed · sent_for_signature` → 409 `QUOTE_LOCKED`, `Cannot edit a quote that is {status} — revise it first` / `… — it is signed — raise a variation order for changes` (note: `submitted` is **not** locked server-side; the UI makes it read-only). Per row: `description_html` sanitised and the plain `description` shadow derived from it; `qty` 0 or blank stored as **1**; `unit` blank stored as *"set"*; `sort_order` = array index; comments taken from the payload when it is an array, else preserved from the DB; `amount_marker` normalised; `ref_override` whitespace-only stored as `" "`; `highlight_color` sanitised and omitted when empty (retry without the column where migration 297 is missing); line tax re-normalised to the entity rate for `amount`/`lump_sum`.
- Data: `quotes`, `quote_line_items`, `studio_price_book`; body `{ leadId, quoteId?, effectiveTaxRate?, items: SaveItem[] }` → `{ insertedIds, quoteId }`.
- States: 401 `AUTH_NOT_READY…` when the session has no studio; 500 on write errors.
- Words: as above.
- Reachable: yes.

### A-16 · Reading the lines — `GET /api/quotes/line-items`, count, raw insert
- Where: `src/app/api/quotes/line-items/route.ts:46-160`; `count/route.ts`; `raw-insert/route.ts`.
- Entry: `useQuoteLineItems(leadId, quoteId, allowOrphanFallback)` in every host; count from the VO host's auto-prune; raw insert from the (dead) AI-tier split (A-116).
- Does: lists a quote's lines ordered `sort_order, id`, paging past PostgREST's 1,000-row cap; with `allowOrphanFallback` (drawer, primary quote only) falls back to legacy lead-level rows whose `quote_id IS NULL`; joins the creator's `full_name` as `createdByName` (plain select fallback when the join fails). `count` returns `{ count }` for a quote; `raw-insert` inserts pre-shaped rows with `studio_id` stamped from the session and **skips** the totals roll-up.
- Rules: scoped client (`scopedSupabase`) for all three.
- Data: `quote_line_items`.
- States: 400 `leadId or quoteId required`, `quoteId required`, `rows required`.
- Words: —
- Reachable: GET + count yes; raw-insert only from dead code.

### A-17 · Left sidebar (source document, summary, schedule, margin)
- Where: `QDD:7078-7785`.
- Entry: shown only when the quote has items or a scanned file; toggle *"Hide sidebar"* / *"Show sidebar"*; open by default on ≥1024 px, an overlay on smaller screens.
- Does: top buttons *"Upload Quote"* and *"From Template"* (opens *"Saved Design Templates"*, templates C-37); replace confirm (A-102); *"Quote Rejected"* banner with the rejection comment; scanning state *"Scanning document..."* / *"Extracting line items with AI"*; parse error + *"Try Again"*; collapsible *"Source document"* card (A-105); *"Summary"* card (hand-off B: subtotal, *"Apply additional discount"*, GST toggle, *"Total"*); *"Restore Parsed Items ({n})"* after a template replaced parsed lines (A-105); *"Payment schedule"* (hand-off C); margin panel (hand-off B); *"Analyzing line items..."*.
- Rules: *"Upload Quote"* / *"From Template"* disabled when read-only (*"This quote is locked — uploads are disabled"*, *"… templates are disabled"*). Payment schedule hidden for variation orders.
- Data: —
- States: as above.
- Words: as above.
- Reachable: yes.

### A-18 · Header tools (inventory, with hand-offs)
- Where: `QDD:6683-6887`.
- Entry: header, when `editorActive`.
- Does: *"Open price book"* (needs `pricebook.edit`; hand-off B); *"Save as template"* bookmark (items > 0, not read-only, not VO; templates C-38); AI insights toggle with a count badge (*"Show AI insights"* / *"Hide AI insights"*, not VO; A-109); *"Version history"* with `v{n}` badge (not VO; hand-off C); Share menu *"Copy preview link"* / *"Send to homeowner portal"* / *"Re-sync PDF"* (enabled only for approved onward; *"Quote must be approved before it can be shared"*, *"Wait for the upload to finish before sharing"*; hand-off C / templates B-89); Undo / Redo (A-91); Discard (A-12); *"Ask AI"* (A-111); ✕ (A-11).
- Rules: price book, bookmark, version and share are `md+` only (hidden on phones). Undo/Redo `sm+`.
- Data: —
- States: —
- Words: as above.
- Reachable: yes.

### A-19 · Split view, live preview and pop-out (touchpoint)
- Where: `QDD:8028-8047` (PanelGroup), `9044-9196` (preview panel), `1601-1680` (pop-out); hand-off templates B-56.
- Entry: Items tab.
- Does: editor | preview split, default 65/35, min 25/20, ratio remembered (`autoSaveId="quote-digitizer-split"`), stacked vertically below 1024 px; *"Hide preview"* / *"Show preview"* collapses the preview to a rail *"Preview"*; the Layout tab offers *"Preview PDF"* (pop-out window `/leads/{leadId}/quote-preview-popout`). The preview stays mounted and pauses while the focused grid is open (*"Preview paused while editing in the focused grid"*).
- Rules: pop-out blocked → *"Couldn't open the preview window. Check your popup blocker."*; *"Preview opened in new window"* / *"Bring preview back"*.
- Data: —
- States: —
- Words: as above.
- Reachable: yes.

---

## Tabs and read-only rules

### A-20 · Items / Layout tab strip
- Where: `QDD:7786-7859`; test `quote-digitizer-layout-tab-strip.test.ts`.
- Entry: centre pane, whenever the editor (not the entry chooser) owns it, or in VO mode.
- Does: two tabs — *"Items"* (title *"Line items, pricing, discounts"*, count of lines excluding legacy `content_block` rows) and *"Layout"* (title *"Cover page, intro text, terms, signature"*, count of legacy doc sections when > 0). On Items the strip carries *"Show preview"* / *"Hide preview"*; on Layout *"Preview PDF"* (title *"Open PDF preview in a separate window"*).
- Rules: the strip uses exactly the split view's gate (`editorActive || isVariation`) so a tab switch can never make it disappear. Applying any template lands on Items (templates C-36).
- Data: —
- States: —
- Words: as above.
- Reachable: yes.

### A-21 · Layout tab and the Layout-side pieces in this slice (touchpoint)
- Where: `QDD:8067-8330`; `src/components/leads/quote-slash-menu.tsx`; `src/components/leads/quote-editor/free-block.tsx`; `src/components/leads/quote-editor/zone-overlay/*`; `src/lib/quote-editor/cross-context-drag.ts`. Hand-off templates B-41…B-57 (canva editor), templates A (legacy knobs), templates B-81 (legacy renderer).
- Entry: *"Layout"* tab.
- Does: canva studios (feature `canvaEditor`) get `CanvaEditorHost`; others get the legacy `QuoteDocumentEditor`. Pieces listed in this slice all live in the legacy editor: a `/` slash menu in rich-text sections (*"Format"*: *"Heading 1"*, *"Heading 2"*, *"Heading 3"*, *"Bullet list"*, *"Numbered list"*, *"Quote"*, *"Paragraph"*; *"Variables"*: *"Client Name"*, *"Studio Name"*, *"Date"*, *"Ref Number"*, *"Project Title"*, *"Total"*, *"Registration"*, *"Page #"*, *"Total Pages"*; ↑/↓/Enter/Escape; *"No matches"*); `FreeBlock` — drag/resize/rotate for free-positioned sections (1 % grid snap, 1.5 % edge snap, 5 px drag threshold, lock, delete); `ZoneOverlay` — click-zones over a rendered PDF page, dormant because the editor never passes `pdfPreviewProps`; `cross-context-drag` — converts doc sections ↔ pricing-table inline inserts (`rich_text`, `two_column`, `callout`, `image`, `divider`, `spacer`).
- Rules: a category renamed in the legacy editor (`onCategoryRename`) rewrites the lines' `category` directly (`setItems`, not undoable) and re-keys gap blocks.
- Data: `quotes.doc_sections` (legacy), `leads.quote_metadata.canvaBlocks` (canva).
- States: canva body not ready → *"Preparing Quote Designer preview…"* (preview pane).
- Words: as above.
- Reachable: slash menu and FreeBlock yes (canva-off studios); ZoneOverlay no (dormant).

### A-22 · Document info panel (IC · Customer ID · Valid until · Project Ref)
- Where: `src/components/leads/quote-canva/document-info-layout-panel.tsx`; mount `QDD:8048-8065`; hand-off leads B-30 for the three lead fields.
- Entry: top of the Layout tab (collapsible; collapsed state in localStorage `quote-digitizer:document-info-collapsed`).
- Does: *"IC / NRIC"* (*"e.g. S1234567A"*), *"Customer ID"* (*"Studio's own reference"*), *"Quote Valid Until"* (date) — debounced 700 ms writes to the **lead** (flushed on unmount); *"Project Ref (overrides quote #)"* (*"e.g. MS-RES-2026-001"*) — per **quote**, `quotes.parsed_doc_metadata.refNumberOverride` (A-10), which then prints instead of the `QT-###` number wherever the header prints a reference.
- Rules: Project Ref is editable only once a quote id exists.
- Data: `leads.ic_number`, `leads.customer_id`, `leads.quote_valid_until`; `quotes.parsed_doc_metadata.refNumberOverride`.
- States: —
- Words: as above.
- Reachable: yes.

### A-23 · Which statuses make the editor read-only, and the banners
- Where: `QDD:2261-2266` (`isReadOnly`, `isPaymentScheduleReadOnly`), `6941-7035` (banners), `8717-8738` (signing drift); server `line-items/route.ts:333-356`; test `quote-digitizer-save.test.ts` ("D5").
- Entry: automatic from the quote's own status (the lead drawer passes the per-quote status, falling back to the lead mirror only before a quote exists).
- Does: read-only for `submitted · approved · sent_for_signature · client_signed`; editable for `none · draft · rejected`. Banners: submitted — *"Awaiting your approval"* (approver) / *"Awaiting owner approval"* + *" — review the line items and decide."* with inline *"Reject"* (reason *"Rejection reason…"*) / *"Approve"* (hand-off C); approved — *"Approved — read-only. Future edits create a new version."*; sent_for_signature — *"Out for signature — read-only until the client responds. Revise the quote to edit it."*; client_signed — *"Signed by the client — read-only. Raise a variation order for changes."*; rejected — sidebar *"Quote Rejected"* + the rejection comment; approved/sent with a `pending`/`viewed` signing request — *"A signing link is in flight (sent {date})"* *"— the client sees the version that was approved at link time. Re-approve and re-send to push any edits."* (hand-off C).
- Rules: the server's lock set omits `submitted` — a direct save to a submitted quote is accepted. The payment schedule is additionally read-only for members without `payment_schedule.override` (hand-off C).
- Data: `quotes.status`; `quote_signature_requests.status`.
- States: —
- Words: as above.
- Reachable: yes.

### A-24 · What read-only switches off
- Where: `QDD` gates on `isReadOnly`; `src/components/leads/quote-row.tsx`, `focused-grid/*`, `quote-digitizer-cell.tsx:204-222`.
- Entry: A-23 statuses.
- Does: cells render as text and a click toasts *"Quote is locked — revise the quote to make changes"*; no drag grip or checkbox column; `#` plain text; row actions reduce to Comments (view only); Qty / Unit columns collapse when every row has qty 1 / fewer than two units; section headers lose drag, rename, add and delete; category footers and empty-section placeholders disappear; the toolbar's Starter Quote, Browse, Add ▾, Round prices and Sections disappear; bulk bar hidden; AI suggestion chips hidden in rows; header trash and bookmark hidden; sidebar *"Upload Quote"* / *"From Template"* disabled; the layout and ref autosaves skip; comments show *"Locked — quote {status}. Revise the quote to reopen for edits."* with no form; the focused grid refuses paste / fill / drag with the same toast.
- Rules: a manual *"Re-analyze with AI"* still writes AI suggestions through the autosave callback on a read-only quote (the server then refuses approved / sent / signed).
- Data: —
- States: —
- Words: as above.
- Reachable: yes.

### A-25 · Variation-order mode
- Where: every `isVariation` gate in `QDD` (lines 638, 6700, 6716, 6739, 6761, 6897, 7610, 7968, 8511, 8881, 9964, 10812); host `vo-editor-host.tsx`.
- Entry: the VO editor host (Projects › variation orders), `quoteType="variation"`.
- Does: hides the entry chooser (straight into the grid), *"Save as template"*, AI insights, version history, Share, the payment-schedule card and its submit guard; shows the VO strip (A-26), *"Omit from contract"* (when the signed contract has lines), the per-line *"Omission (credit)"* switch in the line panel, bulk *"Omit"* / *"Restore"*, credit styling on omission rows, and negative money when omissions outweigh additions (*"Omission · credit"* badge in the Summary card). Header reads *"Variation Order"*.
- Rules: not gated off in VO mode — the Add ▾ menu including *"Add package"* / *"Save as package"*, *"Starter Quote"*, the empty-quote package CTA and *"Ask AI"* (templates C-11 reads the package entries as hidden; the code has no such gate). Approval routing for VOs (owner/admin only) is hand-off C.
- Data: `quotes.quote_type = 'variation'`; `quote_line_items.is_omission`.
- States: —
- Words: as above.
- Reachable: yes.

### A-26 · VO context strip
- Where: `QDD:630-684` (state, grouping, debounce), `6890-6935` (strip).
- Entry: VO mode.
- Does: *"Variation Order"* eyebrow; live *"Net change: {signed amount}"* and *"Revised: {amount}"* (hand-off B); two inputs *"VO title (e.g. Kitchen extension)"* and *"Reason for variation (e.g. Client added 2 wardrobes on 5 May)"* saved 600 ms after typing stops.
- Rules: saves only when a value differs from what the dialog opened with; the host writes `quotes.label` and `quotes.notes` (the derived omission flag it is also handed is ignored; the line save derives `quotes.is_omission` from the total sign).
- Data: `quotes.label`, `quotes.notes`, `quotes.is_omission`.
- States: —
- Words: as above.
- Reachable: yes.

### A-27 · Footer actions (touchpoint)
- Where: `QDD:9294-9500`; hand-off C (submit / approve / reject), templates B-78…B-82 (PDF).
- Entry: centre pane, when `editorActive`.
- Does: left — *"Cancel"* (A-11) and *"Last saved …"*; right, editable quote — *"Download PDF"* (items > 0) and *"Submit for Review"* or *"Approve"* (label follows the resolved approver flag); read-only quote — *"Download PDF"*, plus *"Reject"* / *"Approve"* on a submitted quote for approvers.
- Rules: Download disabled while generating or when the studio switch `lockQuoteActionsUntilApproved` (default off) is on and the quote is not yet approved (*"Quote must be approved before it can be shared"*). Submit disabled with no items, an invalid payment schedule, or a submit in flight.
- Data: —
- States: *"Generating…"*, *"Submitting…"*.
- Words: as above.
- Reachable: yes.

---

## The grid: columns

### A-28 · One grid, two surfaces
- Where: `src/components/leads/focused-grid/line-items-grid.tsx:94-796`; context `QDD:6108-6223` (`gridCtx`); panel mount `QDD:8836-8861`; overlay `focused-grid-overlay.tsx`; row builder `src/lib/leads/build-grid-render-entries.ts`; test `build-grid-render-entries.test.ts`.
- Entry: Items tab (panel); *"Expand to focused grid"* (overlay, A-86).
- Does: both surfaces render the same `LineItemsGrid` from one context, so columns, collapse state, sort, search and row selection are shared. Row order per section: section header → lines with no subsection → subsections in the editor's order (empty ones included) → subsections seen only on lines → section footer. A collapsed section emits header + footer only.
- Rules: sections iterate in the resolved section order (A-72), which appends any section found on a line; only a line with a blank section is left out (see Uncertain). The same grid also hosts the package editor with some cells disabled (templates C-17).
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-29 · Column set, order and defaults
- Where: `focused-grid/grid-rows.tsx:16-32` (`OPTIONAL_COLUMNS`); header `line-items-grid.tsx:348-535`.
- Entry: Items tab.
- Does: order — [drag grip] [select] (edit only) · `#` · *"Description"* · *"Category"* · *"Unit Price"* · *"Discount"* · *"Qty"* · *"Unit"* · `{GST name}` · *"Unit Cost"* · *"Markup %"* · *"Notes"* · *"SKU"* · `Total ({currency})` · actions. Always on: `#`, Description (min 220 px, takes the remaining width), Unit Price, Qty, Unit, Total. Optional with defaults: Category off, Discount on, GST/Tax on, Unit Cost on, Markup % on, Notes off, SKU / Ref off.
- Rules: header tooltips — GST `{name} {rate}%`; Unit Cost *"Vendor/contractor cost for ONE unit — not the line total. The line's cost is this × quantity."*; Markup % *"Markup % on unit cost. Type 30 for a 30% markup — unit price becomes cost × 1.30. Editing it sets the unit price."*; Notes *"Internal notes (not shown on PDF)"*; SKU *"SKU or reference number"*. The Category cell is read-only text.
- Data: —
- States: —
- Words: as above.
- Reachable: yes.

### A-30 · Show / hide columns, remembered per browser
- Where: `focused-grid/columns-popover.tsx`; mobile popover `QDD:8462-8488`; `src/lib/quote-column-prefs.ts`; `QDD:1220-1255`; test `quote-column-prefs.test.ts`.
- Entry: last header cell (`sm+`, title *"Toggle columns"*), the Line Items header on phones, and the focused-grid toolbar.
- Does: checkbox list headed *"Columns"* with the optional columns' labels *"Category"*, *"Discount"*, *"GST/Tax"*, *"Unit Cost"*, *"Markup %"*, *"Notes"*, *"SKU / Ref"* (a *"Custom"* group never appears — nothing can create one).
- Rules: stored in localStorage `quote-digitizer:columns` as a sparse map of deliberate choices (`visible = override ?? default`), so later-added columns arrive on their own default; corrupt payloads are cleared; hydrated after mount; one setting for every quote and both grid views.
- Data: browser only.
- States: —
- Words: as above.
- Reachable: yes.

### A-31 · "Shown on client PDF" signage per column
- Where: `focused-grid/column-visibility-icon.tsx`; test `quote-cluster-b.test.ts`.
- Entry: every column header.
- Does: an eye / eye-off icon with tooltip *"Shown on client PDF"* or *"Internal only — not shown on client PDF"*.
- Rules: hard-coded — client-facing: description, category, unitPrice, discount, qty, unit, gst, total; internal: costPrice, marginPercent, notes, sku, comments, aiSuggestion; unknown keys default to internal. No studio override.
- Data: —
- States: —
- Words: as above.
- Reachable: yes.

### A-32 · The `#` column: refs, numbering modes, ref override
- Where: `quote-row.tsx:375-417`; `QDD:5981-6007` (mode + refs + letters); `src/lib/quote-canva/pricing/numbering.ts`; legacy `src/lib/quote-numbering.ts`; test `quote-numbering.test.ts`. Printed numbering: templates B-65.
- Entry: Items tab.
- Does: shows each line's ref; in edit mode the cell is an input whose placeholder is the computed ref. Typing a value overrides it; clearing restores auto-numbering; a single space means *blank ref* (empty cell, no number consumed). Enter commits, Escape reverts. Section headers always print `{letter}. {section}`.
- Rules: the grid follows the active canva template's pricing-table `numbering.mode`, else `continuous-letter-number`. Modes: `continuous-letter-number` (A1, A2 …, letters A…Z, AA…), `per-section-1n`, `per-subsection-1n`, `hierarchical-1.2a` (section.subsection + item letter, e.g. `1.2a`), `section-letter-item-number`, `section-letter-subsection-1n`, `none`. Lump-sum rows get no ref and consume no counter; an overridden row consumes no counter. Refs are computed over the grid's current sorted and filtered rows (A-45, A-46).
- Data: `quote_line_items.ref_override` (text; whitespace-only stored as `" "`).
- States: read-only → plain text.
- Words: titles *"Custom ref — clear to restore auto-number"* / *"Auto-numbered — type to override, or a single space for no number"*; aria `Reference number for line item, leave blank for auto-number {ref}`.
- Reachable: yes.

### A-33 · Description column: name, description, badges
- Where: `quote-row.tsx:418-613`.
- Entry: Items tab.
- Does: edit mode — a meta line (source badge A-64 + `itemId` in caps), the **name** as an inline cell, and the **description** as a plain textarea *"Description…"* seeded from `description` (else the tag-stripped `descriptionHtml`); thumbnail when the line has an image (opens it in a new tab); *"Spec ↗"* link; AI suggestion chip (A-109). Read-only — the name (or *"(no item name)"*), then the rich `descriptionHtml` sanitised, else the plain description when it differs from the name.
- Rules: an inline description edit writes `description` and **clears `descriptionHtml`** (rich formatting is dropped); a focus + blur with no change writes nothing. Rich editing lives only in the line panel (A-67). The focused grid's *"Descriptions"* toggle hides the description line without deleting it. Library chips: *"Pending approval"* (linked price-book row awaiting approval; title `Linked price-book item is awaiting approval (submitted by {name})`) and *"Library item rejected"* (title *"The linked price-book item was rejected — its prices may be stale. Re-pick from the library."*).
- Data: `name`, `description`, `description_html`, `image_url`, `spec_url`, `item_id`, `source`, `ai_suggestion`, `price_book_item_id`.
- States: —
- Words: as above.
- Reachable: yes.

### A-34 · How an editable cell behaves
- Where: `src/components/leads/quote-digitizer-cell.tsx:66-292` (`SpreadsheetCell`); test `quote-digitizer-row.test.tsx`.
- Entry: name, Unit Price, Qty, Unit Cost, Markup % cells.
- Does: keeps a local draft while focused (incoming prop changes don't overwrite typing); commits 250 ms after the last keystroke and on blur; click selects the contents; Enter commits and moves to the same column one row down; Tab / Shift+Tab move to the next / previous cell; Escape reverts the draft.
- Rules: number cells coerce blank to 0 and junk to 0 (no clamping); a *nullable* cell (Unit Cost) commits `null` for blank but a real 0 when 0 is typed. Only a changed value is committed.
- Data: —
- States: read-only renders text: unit price and total with the currency symbol, cost with separators and no symbol.
- Words: *"Quote is locked — revise the quote to make changes"*.
- Reachable: yes.

### A-35 · Unit Price cell
- Where: `quote-row.tsx:623-642`; `quote-digitizer-cell.tsx:111-130`; `QDD:3429-3494` (`updateItem`). Price maths: hand-off B (`src/lib/quote-cost-margin.ts`).
- Entry: Items tab.
- Does: numeric cell. For a line whose price type is not `amount` / `lump_sum`, the cell shows *"0.00"* plus the type label (e.g. *"KIV"*) and a click turns it into an input (*"Click to enter a price"*).
- Rules: a typed price holds cost, re-reads markup and resets the line's price type to `amount` — pricing a KIV / FOC row converts it, and a lump-sum row whose price or markup is edited here also becomes an ordinary `amount` row. Sortable.
- Data: `unit_price`, `price_type`, `margin_percent`.
- States: —
- Words: as above.
- Reachable: yes.

### A-36 · Discount cell (touchpoint)
- Where: `quote-row.tsx:645-671`; drawer `src/components/leads/discount-edit-drawer.tsx` via `line-items-grid.tsx:126-133, 778-795`. Hand-off B.
- Entry: Discount column (on by default).
- Does: shows *"+ Add"*, `{v}%` or `{currency}{v}`; a click opens the line-discount drawer (type, value, label); the save is one undo step *"Edit discount"*.
- Rules: the drawer closes by itself if its line is deleted.
- Data: `discount_type`, `discount_value`, `discount_label`.
- States: read-only → text.
- Words: title `{label} — click to edit` / *"Edit discount"*.
- Reachable: yes.

### A-37 · Qty cell and drag-to-fill
- Where: `quote-row.tsx:672-718`; `line-items-grid.tsx:137-230` (`startQtyDragFill`).
- Entry: Qty column (always shown while editing).
- Does: numeric cell; a fill handle appears on row hover — drag it down and every row passed takes the source quantity (preview highlight while dragging), committed on release as one undo step `Fill Qty {q} into {n} row{s}`; Escape cancels.
- Rules: fill runs downward only, skips legacy content-block rows, and follows the **stored** line order (see Uncertain); a quantity change on a price-book line with volume tiers re-resolves unit price and cost (A-119). The server stores a quantity of 0 as 1 (A-15). Read-only hides the column when every line has qty 1.
- Data: `qty`.
- States: —
- Words: aria `Drag to fill quantity {q} down`; title `Drag down to fill Qty {q}`.
- Reachable: yes.

### A-38 · Unit cell
- Where: `quote-row.tsx:719-745`; `src/components/leads/unit-combobox.tsx`; `src/lib/queries/pricebook-units.ts`; test `quote-cluster-b.test.ts`.
- Entry: Unit column.
- Does: an editable combobox listing the union of units in the studio's price book and in the current quote (trimmed, de-duplicated case-insensitively, first spelling kept, sorted); typing filters by substring; a new unit is accepted for this line only (never written to the price book).
- Rules: Enter or Tab commits the typed value, Escape reverts; placeholder *"set"*. Read-only hides the column when fewer than two distinct units exist.
- Data: `unit`.
- States: —
- Words: aria `Unit for row {n}`.
- Reachable: yes.

### A-39 · GST / tax column
- Where: `quote-row.tsx:747-753`. Hand-off B (tax maths, entity GST, per-quote toggle).
- Entry: GST column (on by default).
- Does: read-only `{rate}%` of the line's own `taxRate`, else the region rate, or *"—"* at 0.
- Rules: the per-line rate is set in the line panel (A-62).
- Data: `tax_rate`.
- States: —
- Words: header label is the region's tax name (GST / SST / VAT).
- Reachable: yes.

### A-40 · Unit Cost cell
- Where: `quote-row.tsx:755-776`; `QDD:3465-3468`. Hand-off B for the cost / markup / price triangle.
- Entry: Unit Cost column (on by default).
- Does: nullable numeric cell — blank means *no cost* (`null`), 0 is a real zero cost.
- Rules: editing cost never moves the unit price or the quote total; it re-reads the markup.
- Data: `cost_price`.
- States: read-only → separators, no currency symbol.
- Words: —
- Reachable: yes.

### A-41 · Markup % cell
- Where: `quote-row.tsx:777-899`; `src/lib/quote-line-total-cost.ts`; tests `quote-digitizer-row.test.tsx`, `quote-row-margin-cell.test.ts`. Hand-off B for the maths.
- Entry: Markup % column (on by default).
- Does: *"—"* for non-`amount`/`lump_sum` lines; *"no cost"* when the line has no cost; otherwise an editable cell seeded with the markup derived from cost and price, coloured green ≥ 20, amber ≥ 10, red below. Typing a markup reprices the line (price = cost × (1 + markup)). When the cost looks like a line total typed into the per-unit column, a warning button offers to divide it.
- Rules: the stored `margin_percent` is not displayed verbatim (older rows hold margin-of-revenue); the derived value is. Sortable.
- Data: `margin_percent`, `cost_price`, `unit_price`.
- States: read-only → coloured text.
- Words: titles *"No markup for this price type"* / *"Set a unit price to see markup"* / *"Add a cost price to see markup"* / `Markup = (unit price − {cost}) / {cost} × 100. Editing it sets the unit price. Cost is per {unit}.`; fix button `This looks like the cost of all {qty} {unit}, not one. Click to set {x} per {unit} — margin becomes {y}%.`.
- Reachable: yes.

### A-42 · Notes, SKU and custom columns
- Where: `quote-row.tsx:901-924`; `QDD:1277-1281` (`customColumns`).
- Entry: optional columns *"Notes"*, *"SKU / Ref"*.
- Does: Notes shows the line's internal `notes` as read-only text (edited in the line panel). SKU reads a `sku` key that `QuoteLineItem` does not have (the SKU lives in `itemId`), so the column always renders blank. Custom columns: state is a fixed empty list and the *"+ Add custom column"* entry point was removed.
- Rules: —
- Data: `notes`, `item_id`.
- States: —
- Words: —
- Reachable: Notes yes; SKU renders blank; custom columns no (dead).

### A-43 · Total cell
- Where: `quote-row.tsx:926-965`. Hand-off B for `computeLineTotals`.
- Entry: Total column (always).
- Does: prints, in priority: the amount-marker label (A-54); the price-type label for non-`amount`/`lump_sum` lines; an *"Enter total"* badge when the line total is 0; else the line total (2 dp, locale), prefixed *"−"* and red for omission lines.
- Rules: tooltip explains the maths line by line: `= Unit Price ({p}) × Qty ({q})`, `− Discount ({v}%)` / `− Discount ({currency}{v})`, `+ {GST} ({rate}%)`; marker lines say *"Marked as no-charge — excluded from totals (its cost still counts toward margin). Edit the item to change."*.
- Data: `total` (recomputed on display).
- States: —
- Words: *"Enter total"* (title *"This row has no price — enter a total before saving."*).
- Reachable: yes.

### A-44 · Row action strip
- Where: `quote-row.tsx:966-1052`.
- Entry: last cell of each line.
- Does: *"Comments"* (count badge; opens the comments drawer on this line, A-63 — shown whenever a lead id exists, read-only included), then while editable: *"Highlight row"* (A-57), *"Edit item"* (opens the line panel, A-67), *"Duplicate row"* (A-69), *"Delete row"* (A-70).
- Rules: a package host omits Highlight, and for platform packages the Edit pencil too (templates C-17).
- Data: —
- States: icons fade until row hover unless the line has comments / a highlight.
- Words: as above.
- Reachable: yes.

### A-45 · Sorting by column header
- Where: `QDD:1260-1275` (`handleSort`), `5802-5870` (`sortedFilteredItems`), `6012-6020` (icons).
- Entry: clickable headers *"Category"* (when shown), *"Unit Price"*, *"Qty"*, *"Markup %"*, `Total ({currency})`.
- Does: click cycles ascending → descending → off; sorts lines within each contiguous section run; sorting by Category reorders whole sections alphabetically with *"Others"* always last.
- Rules: view-only — the stored line order does not change, nothing is saved, nothing is undoable; refs are recomputed over the sorted view (A-32). An `index` sort exists in code but no header offers it; Description is not sortable.
- Data: —
- States: icon faded when inactive, primary colour up/down when active.
- Words: titles *"Sort by category"*, *"Sort by unit price"*, *"Sort by quantity"*, *"Sort by markup"*, *"Sort by total"*.
- Reachable: yes.

### A-46 · Search (and the removed section filter)
- Where: `QDD:8403-8453`, `5785-5799` (`filteredItems`).
- Entry: *"Search"* button in the *"Line Items"* header.
- Does: expands an input *"Search items..."* (150 ms debounce); matches name, description, `itemId`, category (case-insensitive) and the unit-price digits; ✕ clears; closing the search clears the query. The header counter shows `{shown}/{total}` while filtered.
- Rules: the old *filter by section* popover was removed; its state stays at `"all"` so only the search filters. Refs renumber over the filtered view (A-32).
- Data: —
- States: A-49.
- Words: as above.
- Reachable: yes.

### A-47 · Section chip bar, collapse and expand
- Where: `QDD:8625-8710` (chip bar), `6436-6466` (active sections), `6468-6508` (scroll-spy), `6031-6043` (collapse/expand all); `grid-rows.tsx:134-190` (header chevron).
- Entry: shown when more than one section has lines.
- Does: one chip per section `{section} {count}` (title `Jump to {section}`) — a click scrolls the section header under the sticky table head; the active chip follows the scroll. A toggle at the end collapses or expands every section (*"Collapse all stages"* / *"Expand all stages"*). Each section header also collapses by chevron or name click (double-click renames, A-74).
- Rules: collapse state is per session only; collapsed sections keep their header, subtotal and footer.
- Data: —
- States: —
- Words: as above; header title *"Click to collapse, double-click to rename"*.
- Reachable: yes.

### A-48 · Summary strip under the grid (count, unpriced navigator)
- Where: `QDD:6245-6430` (`gridFooter`), `2161-2194` (`zeroPriceItemIds`, `jumpToZeroPriceRow`). Hand-off B for the money figures and the issuing entity (also leads B-64); hand-off C for the schedule chip.
- Entry: below the grid (and in the focused grid's footer), when the quote has lines.
- Does: `{n} items`, plus an info dot when some lines carry non-monetary price types (tooltip `{x} of {n} rows have no monetary value`, one line per type `· {count} × {label}`, *"These rows are visible in the list but don't contribute to the subtotal."*); a *"{n} need pricing"* chip (phones: *"unpriced"*) with ↑/↓ buttons that cycle through unpriced lines, scroll to each and flash it.
- Rules: *need pricing* counts `amount` / `lump_sum` lines with a zero line total and no amount marker.
- Data: —
- States: —
- Words: aria *"Why does this count differ from the total?"*, *"Previous unpriced row"*, *"Next unpriced row"*; titles *"Jump to previous unpriced row"* / *"Jump to next unpriced row"*.
- Reachable: yes.

### A-49 · Empty and no-match states
- Where: `QDD:8836-8861`; `line-items-grid.tsx:537-560`; `focused-grid-overlay.tsx:900-915`.
- Entry: Items tab.
- Does: no lines → *"No line items yet"* / *"Upload a quote document or add items manually"*; search excludes all → *"No matching items"* / *"Try adjusting your search or filter"* / *"Clear filters"*, and inside the table `0 of {n} match · “{q}”` / *"Clear filter"*; focused grid with no lines → *"No line items yet"* / *"Add your first item"*.
- Rules: —
- Data: —
- States: as above.
- Words: as above.
- Reachable: yes.

---

## Lines: fields and kinds

### A-50 · What a line holds
- Where: `src/types/app.ts:776-851` (`QuoteLineItem`); DB columns and migrations: templates D-10.
- Entry: n/a (data).
- Does: identity `id`, `quoteId`; text `name` (headline), `description` (plain specs), `descriptionHtml` (rich specs); structure `category`, `subcategory`, `refOverride`; money `unitPrice`, `qty`, `unit`, `total`, `priceType`, `amountMarker`, `discountType` / `discountValue` / `discountAmount` / `discountLabel`, `taxRate` / `taxInclusive` / `taxAmount`, `costPrice`, `marginPercent` (holds markup), `wastePercent`, `costType`; flags `isOptional`, `isOmission`; catalogue `priceBookItemId`, `priceSnapshotAt`, `vendorId`, `vendorIds`, `itemId` (SKU); extras `imageUrl`, `specUrl`, `notes`, `highlightColor`, `packageTier`, `competitorBenchmarkCents`, `competitorSource`; provenance `source`, `aiSuggestion`, `parseConfidence`; collaboration `comments`; audit `createdBy` (immutable), `createdByName` (joined).
- Rules: money and flag semantics are hand-off B; persistence rules A-15.
- Data: `quote_line_items`.
- States: —
- Words: —
- Reachable: yes.

### A-51 · Name vs description, and rich descriptions
- Where: `docs/rules/quote-terminology.md` §"Item text is two fields"; panel `price-book-item-editor.tsx:190-200, 797-835`; `src/lib/sanitize-line-item-html.ts`; `quote-row.tsx:31-39, 459-500`; test `quote-content-block-xss.test.ts`.
- Entry: grid (plain) and line panel (rich).
- Does: `name` is the bold headline printed on the quote; `description` is the smaller specs text beneath it. The panel edits a rich description (bold, italic, underline, strike, H2/H3, bullet and numbered lists, highlight marks, text colour) → stored as sanitised `descriptionHtml` with a plain-text shadow in `description` (list items become `• ` lines).
- Rules: stored HTML allows only `p br ul ol li strong em b i u s h2 h3 mark span`, with `data-color` on `mark` / `span` validated against the palettes; everything else is dropped. Renderers hide a description identical to the name. Parsed and AI lines copy the same text into both fields; Browse-price-book lines take `name = pb.name || pb.description` and leave `description` empty when the book row had no separate name.
- Data: `name`, `description`, `description_html`.
- States: —
- Words: panel labels *"Item Name"* (required), *"Description"* *"(optional, specs)"*, hint *"Renders smaller + indented below the item name on PDFs and client surfaces."*.
- Reachable: yes.

### A-52 · Price types
- Where: `src/types/app.ts:753`; labels `quote-digitizer-cell.tsx:19-23`; panel options `price-book-item-editor.tsx:97-102`. Totals effects: hand-off B.
- Entry: line panel *"Price type"*; parsing (A-104); AI chat.
- Does: `amount` (normal), `lump_sum` (*"L/S"*), `kiv` (*"KIV"*, keep in view), `by_client` (*"By Client"*), `foc` (*"FOC"*), `inclusive` (*"Incl."*), `content_block` (legacy). Non-amount / non-lump lines show their label in Unit Price and Total and drop out of the subtotal; `kiv` / `by_client` rows render dimmed.
- Rules: the panel offers only *"Amount"*, *"Lump sum"*, *"KIV (keep in view)"*, *"By client"* — FOC / Inclusive are expressed as amount markers now (A-54), though parsed and AI lines can still carry `foc` / `inclusive` (such a line opened in the panel has no matching option). Typing a unit price or markup in the grid turns any line into `amount` (A-35).
- Data: `price_type` (default `amount`).
- States: —
- Words: as above.
- Reachable: yes.

### A-53 · Category lump sum
- Where: `grid-rows.tsx:208-230` (Banknote button); `QDD:6180-6190` (`openCategoryLumpSum`); numbering `numbering.ts:84-90`.
- Entry: section header, hover button (always visible once the section has a lump-sum line).
- Does: opens the section's existing `lump_sum` line in the panel, or a new one pre-set to price type `lump_sum`, name *"Lum Sum"*, qty 1, unit *"lot"* — one amount priced for the whole section while its other lines stay unpriced (the PDF prints it as a `Lum Sum {amount}` section footer per `grid-types.ts:143-147`; pricing table: templates B-18).
- Rules: lump-sum lines get no ref and consume no counter (A-32).
- Data: a normal line with `price_type = 'lump_sum'`.
- States: —
- Words: titles `Price {section} as one lump sum (items stay unpriced)` / `Edit {section}'s lump sum`.
- Reachable: yes.

### A-54 · Amount markers (F.O.C., Packaged, TBQ …)
- Where: `src/lib/quote-amount-marker.ts`; `src/lib/quote-canva/pricing/studio-marker-vocabulary.ts`; panel `price-book-item-editor.tsx:155-164, 1186-1222`; test `quote-amount-marker.test.ts`. Totals: hand-off B; package carry: templates C-02.
- Entry: line panel *"Amount display"*.
- Does: *"Normal amount"* or a label from the studio's vocabulary — the union of every pricing-table block's `nonNumeric.allowedValues` across the studio's design templates — plus the legacy *"Inclusive"* / *"F.O.C."*. The AMOUNT cell prints the label; the line leaves subtotal / discount / GST / total, but its cost still counts toward margin.
- Rules: markers are trimmed, capped at 24 characters, blank = none (never an empty string); de-duplicated case-insensitively (studio list first); a stored label no longer in the vocabulary stays selectable; legacy codes print their labels, studio labels print exactly as typed.
- Data: `amount_marker` (text, CHECK non-blank ≤ 24).
- States: hint `Prints “{label}” instead of an amount. Excluded from the quote total; its cost still counts toward margin.`.
- Words: as above.
- Reachable: yes.

### A-55 · Optional lines
- Where: panel `price-book-item-editor.tsx:1172-1186`; row style `quote-row.tsx:343`; totals rule `QDD:2868-2885`. Print: templates B-99; totals: hand-off B.
- Entry: line panel *"Optional"*.
- Does: marks the line as optional (*"Client can toggle on signing page"*); the row gets a dashed left edge.
- Rules: whether optional lines leave the totals follows the layout's Optional Works setting (`optionalWorksSection.enabled && !includeInTotal`) — hand-off B / templates A-39.
- Data: `is_optional`.
- States: —
- Words: as above.
- Reachable: yes.

### A-56 · Omission lines (variation orders)
- Where: panel `price-book-item-editor.tsx:1208-1221`; `src/lib/finance/vo-omission.ts`; `src/components/finance/vo-editor/contract-omit-picker.tsx`; `QDD:8511-8522, 8881-8898, 10812-10828`. Money: hand-off B; VO lifecycle: hand-off C.
- Entry: VO mode only — the panel's *"Omission (credit)"* switch (*"Scope cut — credits contract"*); bulk *"Omit"* / *"Restore"*; *"Omit from contract"* (title *"Omit items from the signed contract"*).
- Does: the picker lists the signed contract's lines grouped by section with a search (*"Search contract items…"*); picked lines become new editable omission lines (fresh id, `isOmission: true`, name / description / section / subsection / qty / unit / price / price type / discount / tax / waste / marker copied, `source: "manual"`) appended as one undo step *"Omit from contract"*. Omission rows render with a red edge and a negative total.
- Rules: a contract line already omitted in this VO (same name + description + section + unit price, case-insensitive) is greyed and marked *"Omitted"*; the panel forces `isOmission: false` on non-VO quotes.
- Data: `is_omission`.
- States: *"No matching contract items."*.
- Words: title *"Omit from contract"*; description *"Pick the contract items being removed. Each becomes an editable credit on this variation."*; buttons *"Cancel"*, `Add {n} omission{s}`.
- Reachable: yes (VO mode).

### A-57 · Row highlight colour and text marks
- Where: `src/components/leads/quote-canva/row-highlight-picker.tsx`; `src/lib/quote-canva/highlight-palette.ts:34-66`; `src/lib/quote-canva/line-highlight.ts`; `quote-row.tsx:325-337, 998-1008`; server `line-items/route.ts:498, 583-597`. Printing and the text-level pickers: templates B-53.
- Entry: row action *"Highlight row"*.
- Does: popover *"Highlight row"* with seven swatches — *"Yellow"*, *"Pink"*, *"Green"*, *"Blue"*, *"Brand blue"*, *"Orange"*, *"Gray"* — a custom hex field (placeholder *"#1E5AA8"*) and *"Clear row highlight"*. The whole row takes the colour with a readable foreground; badges keep their own colours. Inside a rich description the panel's editor also offers text highlight (`<mark data-color>`) and text colour (`<span data-color>`).
- Rules: clicking the active swatch clears it; values persist as a palette name or a normalised `#rrggbb`; the server sanitises before writing (the value ends up in CSS). A package cannot store it (templates C-17). Saving the line through the panel drops it (A-68).
- Data: `quote_line_items.highlight_color` (migration 297).
- States: —
- Words: trigger title *"Highlight row"* / `Row highlight: {label}`; aria *"Pick a custom highlight colour"*, *"Custom highlight hex"*.
- Reachable: yes.

### A-58 · Line image
- Where: `quote-row.tsx:418-436`; panel `price-book-item-editor.tsx:394-424, 1357-1395`. Upload route: A-118.
- Entry: line panel *"Item Image"* → *"Upload"* / *"Change"*; grid thumbnail.
- Does: attaches one image per line; the grid shows a 3:2 thumbnail that opens the image in a new tab; the panel shows a preview with a remove button.
- Rules: removing only clears the URL (the stored file stays). Printing depends on the template's image switch (templates D-10 `style.showItemImages`).
- Data: `image_url`.
- States: uploading spinner; toasts *"Image uploaded"*, *"Failed to upload image"*.
- Words: hint *"JPEG, PNG, WebP. Max 5MB."*.
- Reachable: yes.

### A-59 · Spec link and internal notes
- Where: `quote-row.tsx:585-596, 901-907`; panel `price-book-item-editor.tsx:252-266, 1312-1356`.
- Entry: line panel *"Spec Sheet / Product Link"*, *"Notes"*.
- Does: a product / spec URL (grid shows *"Spec ↗"*; panel offers *"Open link"*); free-text internal notes (*"Internal notes about this item..."*), shown read-only in the optional Notes column.
- Rules: the URL is validated on blur — *"URL must start with http:// or https://"* / *"Enter a valid URL (e.g. https://example.com/spec.pdf)"* — and Save is disabled while invalid (*"Fix the spec URL before saving"*). Notes never print.
- Data: `spec_url`, `notes`.
- States: —
- Words: as above.
- Reachable: yes.

### A-60 · Vendor for this line
- Where: panel `price-book-item-editor.tsx:223-235, 314-334, 995-1036`; Browse `browse-price-book-modal.tsx:86-95, 236-243`.
- Entry: line panel *"Vendor for this purchase"*; Browse price book row picker.
- Does: picks one vendor for the line (*"No vendor linked"*, clear ✕ *"Clear vendor"*). When the line is linked to a price-book item with a vendor pool, choices are restricted to that pool and creating a vendor is disabled; a stale vendor no longer in the pool is cleared.
- Rules: Browse price book assigns the row's chosen vendor, else the active vendor filter, else the item's first vendor. The line stores `vendorId` plus `vendorIds = [vendorId]`. Feeds purchase-order vendor matching (Finance, outside this slice).
- Data: `vendor_id`.
- States: —
- Words: `{n} vendors available in the price book — pick the one this line buys from.`.
- Reachable: yes.

### A-61 · Price-book link on a line
- Where: `QDD:3310-3330` (post-parse auto-match), `line-items/route.ts:358-400` (save-time auto-match); panel `price-book-item-editor.tsx:300-310, 712-770`; `quote-row.tsx:249-256`. Price book itself: hand-off B.
- Entry: set by the panel's name picker (A-98), Browse (A-97), packages (templates C-02), AI chat (`price_book_item_id`), background auto-match (A-108).
- Does: the line keeps `priceBookItemId` and `priceSnapshotAt` (time the price was copied) plus copied cost, waste, cost type and vendor. The line's own name / price are a snapshot — later price-book edits don't flow in, except the volume-tier re-price on a quantity change (A-119).
- Rules: the grid shows *"Pending approval"* / *"Library item rejected"* when the linked book row is pending or rejected (A-33).
- Data: `price_book_item_id`, `price_snapshot_at`, `cost_price`, `waste_percent`, `cost_type`, `vendor_id`.
- States: —
- Words: —
- Reachable: yes.

### A-62 · Per-line tax fields (touchpoint)
- Where: panel `price-book-item-editor.tsx:1103-1147`; `src/lib/quote-calc.ts:290-301` (`normalizeLineItemTaxRates`); server `line-items/route.ts:444-497`. Hand-off B.
- Entry: line panel.
- Does: `{GST} rate` — a select (*"Default ({x}%)"*, *"Exempt"*, the region's slabs) where the region has slabs, else a checkbox `Apply {GST} ({x}%)`; *"Tax inclusive?"* / *"Price includes tax"*.
- Rules: for `amount` / `lump_sum` lines the quote's effective rate (entity GST registration + per-quote toggle) replaces the line's own rate in the totals and on every save, so a per-line choice there does not survive (hand-off B for the maths).
- Data: `tax_rate`, `tax_inclusive`, `tax_amount`.
- States: —
- Words: as above.
- Reachable: yes.

### A-63 · Comments on a line
- Where: `QDD:3811-3904` (add / reply / edit / delete handlers), `9619-9880` (drawer); `quote-row.tsx:970-996` (button); hooks `useAddQuoteLineComment`, `useReplyToQuoteLineComment`, `useEditQuoteLineComment`, `useDeleteQuoteLineComment` (`src/lib/queries/leads.ts`); API `src/app/api/leads/[id]/quote-line-items/[itemId]/comments/route.ts` — hand-off leads B-61 for the server rules; test `line-item-comments.test.ts`.
- Entry: the row's *"Comments"* icon (count badge); the drawer shares the right-hand slot with AI Insights.
- Does: drawer *"Comments"* with the total count. List view — every line that has comments: its name, SKU, section · total, a `{comments}+{replies}` count and the last comment `{author}: {text}`; hovering a card scrolls the table to that line and rings it; a click opens the thread view. Thread view — *"All comments"* back link, the line's name and section · total, each comment with author and relative time (*"just now"*, `{n}m ago`, `{n}h ago`, `{n}d ago`) and a ⋮ menu *"Reply"* (anyone) / *"Edit"* / *"Delete"* (own comment only); replies with ⋮ *"Edit"* / *"Delete"* (own reply only); reply box *"Reply..."*; composer *"Add a comment..."* / *"Add another comment..."* (Enter sends, Escape leaves the thread).
- Rules: comments save at once through their own API (not the line autosave) and the line save keeps them (A-15). Max 4,000 characters (`{n} characters remaining` once fewer than 200 remain). On a read-only quote the thread shows but no form or menu, with *"Locked — quote {status}. Revise the quote to reopen for edits."* (the server itself blocks only `approved`, leads B-61). The UI offers delete only to the author (the server also lets an owner delete). A comment is addressed by the line's DB id (see Uncertain).
- Data: `quote_line_items.comments` JSONB `LineComment[]` `{ id, authorId, authorName, authorRole, text, createdAt, replies[] }`.
- States: *"No comments yet"* / *"Click a row's comment icon to start"*; *"No comments on this item yet"*.
- Words: toasts *"Failed to add comment"*, *"Failed to add reply"*, *"Failed to edit comment"*, *"Failed to delete comment"*.
- Reachable: yes.

### A-64 · Provenance (source) and its badge
- Where: `src/components/leads/quote-source-badge.tsx`; union `src/types/app.ts:802`; CHECK migration 290; test `quote-agent-source-contract.test.ts`.
- Entry: shown on each editable line's meta line.
- Does: pills — `parsed` / `ai_drafted` / `ai_estimated` → *"AI"* (titles *"AI-extracted from document"*, *"AI-drafted from brief"*, *"AI-estimated price"*); `price_book` → *"PB"* (*"Linked to price book"*); `template` → *"Template"* (*"From template"*); `manual` → *"Manual"* (*"Manual entry"*); `market_rate`, `web_estimated`, `needs_pricing` show no pill.
- Rules: set per path — panel add `manual`, upload `parsed`, Starter Quote and clean-template items `template`, Browse `price_book`, package lines none (no badge), AI chat one of `ai_drafted · ai_estimated · template · price_book · market_rate · web_estimated · needs_pricing`; editing in the panel keeps the existing source; background auto-match does not change it.
- Data: `source`.
- States: —
- Words: as above.
- Reachable: yes.

### A-65 · Package tier, competitor benchmark and parse confidence (stored, not surfaced)
- Where: panel `price-book-item-editor.tsx:104-109, 1222-1235`; `src/types/app.ts:808, 822-833`; `line-items/route.ts:563, 573-574`; `src/app/quote-preview/[token]/page.tsx:134-136`.
- Entry: the line panel's *"Package tier"* (not VO: *"None"*, *"Essential"*, *"Premium"*, *"Luxury"*); no editor entry for the other two.
- Does: `packageTier` is stored on the line; `competitorBenchmarkCents` / `competitorSource` are saved when present and read only by the public live-preview page for an aggregate "below benchmark" callout; `parseConfidence` is typed with a documented amber *verify price* indicator.
- Rules: nothing reads the package tier (the AI-tier feature that wrote it is disabled, A-116) and packages strip it (templates C-02). No editor control writes the benchmark, and the line panel's save drops it (A-68). `parseConfidence` is never filled (the parser's per-line `confidence` is discarded, A-104) and never rendered. Competitor comparison lives in the separate Quote X-Ray tool (lead drawer *"Beat this quote"*, leads B-59).
- Data: `package_tier`, `competitor_benchmark_cents`, `competitor_source`.
- States: —
- Words: as above.
- Reachable: package-tier control yes (no effect); benchmark storage yes; confidence no (dead).

### A-66 · Legacy content-block lines
- Where: `quote-row.tsx:265-304`; `QDD:1241-1253`; `src/lib/transformers.ts` (`migrateContentBlocksToInlineInserts`); test `quote-content-block-xss.test.ts`. Inline inserts: templates.
- Entry: old quotes whose lines carry `price_type = 'content_block'`.
- Does: such a line renders as a full-width *"Content Block"* rich-text row with a remove button; but as soon as such lines are present (e.g. on open) the editor moves every content block into the pricing section's inline inserts and removes it from the lines (toast `{n} content block{s} moved into the document editor`).
- Rules: content blocks are excluded from the Items count, AI analysis, qty fill and clean templates; their HTML is sanitised (scripts, `javascript:` URLs and event handlers stripped). Removing one is not undoable.
- Data: `quote_line_items.description_html` → `quotes.doc_sections[].inlineInserts`.
- States: —
- Words: title *"Remove content block"*.
- Reachable: migration yes; the row itself only transiently.

### A-67 · The line panel (add / edit a line)
- Where: `src/components/accounts/price-book-item-editor.tsx:66-1453` in `mode="quote-line-item"`; mount `QDD:9952-9972`.
- Entry: every *"Add item"* path (A-96) and the row pencil *"Edit item"*.
- Does: slide-over titled *"Add Quote Line Item"* / *"Edit Quote Line Item"* (subtitle = name or *"New item"*; `Added by {name}`). Fields in order: *"Item Name"* * (price-book search, A-98; hint `Type 2+ chars to search the price book ({n} items)`); *"Item ID / SKU"* (read-only, *"Auto-generated on save"*, title *"Auto-generated sequentially per studio (PB-001, PB-002, …)"*); *"Description"* (rich, placeholder *"Optional specs (e.g., 25mm quartz countertop, matte finish, soft-close hinges)"*); *"Category"* (searchable, *"Select category..."*); *"Subcategory (optional)"* (free text, *"e.g., Kitchen, Master Bedroom — leave empty for none"*); *"Pricing"* — *"Sell Price ({currency})"*, *"Unit Cost ({currency})"*, *"Markup %"*, margin chip `Margin: {x}% ({currency}{y} per unit)` (hand-off B); *"Unit"* (*"sqft, ft, lot, pc..."*); *"Cost Type"* (*"Combined"*, *"Material"*, *"Labor"*, *"Subcontractor"*); *"Waste Factor (%)"* (0–50, step 0.5; `Effective qty = qty x {f} in quotes` / *"No waste factor applied"*); *"Vendor for this purchase"* (A-60); *"Quantity"*; *"Price type"* (A-52); tax (A-62); *"Discount type"* / *"Discount value"* (hand-off B); *"Optional"* (A-55); *"Amount display"* (A-54); VO *"Omission (credit)"* (A-56) or *"Package tier"* (A-65); *"Spec Sheet / Product Link"*, *"Notes"* (A-59); *"Item Image"* (A-58). Footer: *"Also save to price book"* (add only), *"Cancel"*, *"Add Item"* / *"Save Changes"*.
- Rules: see A-68.
- Data: builds a full `QuoteLineItem` handed back to the editor.
- States: Save disabled while pending, with an invalid spec URL, or with no name.
- Words: as above.
- Reachable: yes.

### A-68 · What the panel's save does
- Where: `price-book-item-editor.tsx:426-436, 549-666`; `QDD:1485-1537` (`findInsertIndex`, `handleSaveItemFromEditor`).
- Entry: panel *"Add Item"* / *"Save Changes"*.
- Does: requires a name (*"Item name is required"*). Section = the picked name (else the seed). With *"Also save to price book"* ticked (add only; **unticked by default**), inserts a price-book row first and adopts its generated SKU and id (*"Saved to price book"* / *"Saved to quote, but price-book sync failed"*). The editor then: on edit, replaces the line in place (a changed section moves it to the end of the new section / subsection); on add, inserts it after the last line of the same section + subsection, else after the section's last line, else at the end; flashes the row.
- Rules: the saved line is rebuilt from the form, so fields the panel doesn't carry are **reset**: `refOverride`, `highlightColor`, `discountLabel`, `competitorBenchmarkCents`, `competitorSource`. `isOmission` is forced off outside VOs; `source` is kept (new lines `manual`); `total` = price × qty until recomputed. A stale temp id is mapped to its DB id so an edit never duplicates a just-saved line. The price-book checkbox is disabled after picking a book item until the name or SKU changes (title *"This item is already in the price book — change the item name or ID to save it as a new variant."*). Panel adds and edits are **not** on the undo stack.
- Data: `studio_price_book` (optional insert); local items → autosave.
- States: —
- Words: *"Failed to save item"*.
- Reachable: yes.

### A-69 · Duplicate a line
- Where: `quote-row.tsx:1024-1040`.
- Entry: row action *"Duplicate row"*.
- Does: inserts a copy with a new id, no creator and no comments right after the original.
- Rules: everything else is copied (ref override, highlight, image, price-book link, marker, flags). Not undoable. The insert position uses the row's on-screen index, which can differ from its stored position when sections are reordered (the copy still groups under the same section).
- Data: local items → autosave.
- States: —
- Words: aria *"Duplicate row"*.
- Reachable: yes.

### A-70 · Delete a line, delete a section
- Where: `QDD:3519-3526` (`deleteItem`), `3596-3615` (`deleteSection`), `3617-3622`, `10224-10245` (confirm).
- Entry: row *"Delete row"*; section header trash *"Delete {section} section"*; empty section *"Remove {section} from this quote"*.
- Does: row → confirm *"Delete Row"* / *"Are you sure you want to delete this row? This action cannot be undone."* / *"Delete"* → removed (undo step *"Delete row"*). Section → confirm *"Delete Section"* / `Are you sure you want to delete the "{section}" section and all its items? This action cannot be undone.` (+ ` This category also has {n} layout block{s} attached (text, image, etc.) — deleting the category will also delete {them|it}.`) → every line of that section, all subsections included, removed (undo step *"Delete section"*). An empty session section is removed without a prompt.
- Rules: both are undoable despite the copy. A section emptied by a delete loses its attached layout blocks (A-84). Deleting the line open in the comments drawer closes that thread.
- Data: local items → autosave (DB rows deleted by the diff, A-15).
- States: —
- Words: as above.
- Reachable: yes.

---

## Sections and sub-sections

### A-71 · The section list and name canonicalisation
- Where: `QDD:200-205` (`DEFAULT_CATEGORIES`), `1296-1392` (`CATEGORIES`, `categoryCanonicalize`); test `category-order-parity.test.ts:103-125`. Catalogue: templates C-30.
- Entry: Category picker in the panel, bulk *"Move to..."*, *"Add category"* suggestions.
- Does: section names = the studio catalogue (ordered), else a fixed list of 19 — *"Preliminaries"*, *"Demolition"*, *"Masonry"*, *"Plumbing"*, *"Electrical"*, *"Partition & Ceiling"*, *"Plastering"*, *"Painting"*, *"Flooring"*, *"Carpentry"*, *"Countertop"*, *"Glass & Mirror"*, *"Doors"*, *"Aluminium"*, *"Decking"*, *"Design"*, *"Materials"*, *"Cleaning"*, *"Others"* — plus names found on the lines and names added this session, de-duplicated on trimmed lower case.
- Rules: the grid groups lines whose section differs only by case / spaces under one canonical name (display only, lines unchanged). Known gap, left open by decision (2026-08-31): the PDF renderer and the Sections panel don't canonicalise, so `Carpentry` and `CARPENTRY ` print as two sections — pinned by `it.fails` tests.
- Data: `studio_quote_categories.name`, `quote_line_items.category`.
- States: —
- Words: as above.
- Reachable: yes.

### A-72 · Section order
- Where: `src/lib/quote-editor/category-order.ts`; `QDD:2831-2866` (`itemsForDisplay`), `5883-5896`; tests `category-order.test.ts`, `category-order-parity.test.ts`.
- Entry: automatic; changed by the Sections panel drag (A-75) and grid section drag (A-94).
- Does: order = the quote's saved `categoryOrder` if any, else the studio catalogue order, else first appearance on the lines; saved names without lines are skipped; sections found on lines but missing from the list are appended in first-appearance order. The same rule drives the grid, the Sections panel, the preview and the PDF (the editor physically reorders lines before rendering).
- Rules: the saved order lives in `leads.quote_metadata.categoryOrder` — one order per **lead**, shared by all its quotes (A-121). *"Others"* is pinned last only when sorting the grid by Category.
- Data: `leads.quote_metadata.categoryOrder`, `studio_quote_categories.order_index`.
- States: —
- Words: —
- Reachable: yes.

### A-73 · Add a category (line-side behaviour)
- Where: `QDD:1432-1476`, `10585-10634`; route `src/app/api/quotes/categories/route.ts`. Hand-off templates C-30 for the catalogue and its toasts.
- Entry: Add ▾ *"Add category"*.
- Does: dialog *"Add Category"* / *"Create a new category. Once added, items can be assigned to it from the editor."*, *"Category Name"* (*"e.g., Waterproofing"*, suggestions from the section list), checkbox *"Also save to price book — makes this category available across all quotes and the catalog editor."* (default on → upsert into `studio_quote_categories`), *"Cancel"* / *"Add Category"*. The new section appears in the grid as an empty header with *"Empty — add the first item"* and a footer.
- Rules: typing an existing name shows `“{name}” already exists — items can be assigned to it without adding a duplicate.`. The empty section is session-only — it survives on the quote only once a line is filed under it (even when it was saved to the catalogue).
- Data: `POST /api/quotes/categories { name }` → upsert on `(studio_id, name)`, `is_active = true`.
- States: —
- Words: as above.
- Reachable: yes.

### A-74 · Rename a section from the grid
- Where: `grid-rows.tsx:37-250` (`CategoryHeaderRow`); `QDD:3924-3981` (`renameCategory`); `src/lib/quote-canva/hierarchy/category-rename.ts`; test `idl-uat-r3-category-rename.test.ts`.
- Entry: section header pencil (*"Rename category"*), double-click on the name, or click on an empty section's name (*"Click to rename"*).
- Does: inline input (Enter / blur commit, Escape cancel; keeps the typed case even though headers display in capitals) → renames the section on this quote's lines (undo step `Rename category "{old}" → "{new}"`), carries the session lists and collapse state, re-keys attached layout blocks (A-84), and re-keys the lead's metadata: order position kept, description moved (the target's wins on a merge), `Cat|Sub` descriptions and total labels re-prefixed, declared subsections merged.
- Rules: renaming onto an existing section asks first — `A section named "{new}" already exists.` / `Renaming "{old}" to it will merge both sections — their items and any layout content attached between sections. Merge them?`. Blank or unchanged = no-op. Only the open quote's lines change (other quotes on the lead keep the old name while the shared metadata is re-keyed).
- Data: `quote_line_items.category` (via autosave); `leads.quote_metadata`.
- States: —
- Words: as above.
- Reachable: yes.

### A-75 · The Sections & subsections panel
- Where: `src/components/leads/quote-canva/hierarchy/quote-hierarchy-editor.tsx:1-624`, `section-row.tsx`, `subsection-row.tsx`; mount `QDD:8785-8829`; tests `quote-hierarchy-editor.test.tsx`, `quote-hierarchy-reseed-clobber.test.tsx`, `quote-hierarchy-digitizer-mount.test.tsx`.
- Entry: toolbar *"Sections"* (title *"Sections & subsections — reorder, rename, describe"*; aria *"Open sections & subsections editor"*), editable quotes only → right-side sheet *"Sections & subsections"*.
- Does: lists the sections derived from the lines (+ declared subsections) in the resolved order; each section can be dragged (pointer after 4 px, touch after 200 ms, keyboard), renamed (A-76), given a scope note (A-77), and holds its subsections (rename, scope note, total label, delete, drag within the section) plus *"Add subsection"* (A-79).
- Rules: no add / delete of **sections** here — *"Sections appear here based on your line items. Add an item with a category to create a section."*; metadata edits save 700 ms after the last change through one accumulator so quick successive edits don't overwrite each other, and an items refetch never wipes an edit still in flight. Disabled when the lead's mirror status is `approved` or `client_signed`.
- Data: `leads.quote_metadata` (`categoryOrder`, `sectionDescriptions`, `subsectionDescriptions`, `subsectionOrder`, `subsectionTotalLabels`).
- States: —
- Words: as above.
- Reachable: yes.

### A-76 · Rename a section or subsection from the panel
- Where: `quote-hierarchy-editor.tsx:394-513`; `src/app/api/quotes/hierarchy/route.ts`; RPC `scripts/migrations/183_quote_hierarchy_metadata.sql:73-126`; hook `useRenameInHierarchy` (`src/lib/queries/leads.ts:1810-1839`).
- Entry: click a section / subsection name in the panel.
- Does: validates (*"Name cannot be empty"*, *"A section with that name already exists"*, *"A subsection with that name already exists"*), shows the new name at once, then `POST /api/quotes/hierarchy { leadId, newHierarchy, cascadeUpdates }` → RPC `reparent_quote_hierarchy` rewrites `quote_line_items.category` (or `.subcategory` within its section) for **every line of every quote on the lead** with that name, and rewrites the legacy hierarchy column; then re-keys the lead metadata and re-keys attached layout blocks. A subsection rename also appends the new name to the studio catalogue for that section.
- Rules: the RPC has no status check (locked quotes' lines are renamed too). The route checks lead ownership with the scoped client and runs the RPC with the service role. On failure the name reverts and *"Couldn't rename — try again"*. The editor's own in-memory lines are not refreshed by this path (see Uncertain).
- Data: `quote_line_items.category / subcategory`, `leads.quote_hierarchy_metadata`, `leads.quote_metadata`, `studio_quote_categories.subcategories`.
- States: —
- Words: as above.
- Reachable: yes.

### A-77 · Scope notes (section and subsection descriptions)
- Where: `src/components/leads/quote-canva/hierarchy/inline-description-editor.tsx`; `src/lib/quote-canva/hierarchy/description-html.ts`, `description-clamp.ts`; `quote-hierarchy-editor.tsx:251-296`; test `quote-hierarchy-description-editor.test.tsx`. Printing: templates B-18.
- Entry: panel placeholder *"+ Add scope note (optional, visible to client)"* under each section / subsection.
- Does: opens the same rich editor as line descriptions with *"Save"* / *"Cancel"*; also saves when focus leaves the whole editor (toolbar clicks don't count). A section note overrides the studio's default description for that section (templates C-30); a subsection note is keyed `"{section}|{subsection}"`.
- Rules: a blank note deletes the key. Legacy plain notes render as paragraphs (blank line → new paragraph, newline → line break) with no list guessing. Long notes collapse in the panel to 3 lines / 220 characters with *"… Show more"* / *"Show less"* (display only). Notes are edited only in the panel; the grid does not show them.
- Data: `leads.quote_metadata.sectionDescriptions`, `.subsectionDescriptions`.
- States: disabled → read-only text.
- Words: as above.
- Reachable: yes.

### A-78 · Subsections inside the grid
- Where: `grid-rows.tsx:254-427` (`SubcategoryHeaderRow`), `429-493` (`CategoryFooterRow`); `QDD:3983-4065`.
- Entry: Items grid.
- Does: a subsection header row — *"↳"*, name, `{n} item(s)`, *"empty"* hint, subtotal (hand-off B), pencil rename, *"Add item"* chip (panel pre-filled with section + subsection; title `Add item under {section} → {subsection}`), remove (`Remove subcategory {name}`), drag grip (`Drag to reorder {name} within {section}`). Each section ends with a footer: *"Subcategory"* → inline input `New subcategory under {section}…` (Enter / blur add, Escape cancel) and *"Item"*.
- Rules: rename retags this quote's lines (undo step `Rename subcategory "{old}" → "{new}"`); remove untags them (they fall back under the section header; undo step `Remove subcategory "{name}"`); add creates an empty subsection for this session and appends the name to the studio catalogue. None of these three write the quote's declared list or re-key subsection notes / total labels (compare A-76, A-79).
- Data: `quote_line_items.subcategory`; `studio_quote_categories.subcategories`.
- States: —
- Words: as above; aria `Add item under {section} > {subsection}`.
- Reachable: yes.

### A-79 · Declared (empty) subsections
- Where: `src/lib/quote-canva/hierarchy/subsection-actions.ts`; `quote-hierarchy-editor.tsx:298-381`; grid merge `QDD:1694-1760`; tests `quote-hierarchy-add-subsection.test.tsx`, `quote-hierarchy-subsection-actions.test.ts`.
- Entry: panel *"Add subsection"*; subsection delete ✕ (*"Delete subsection"*).
- Does: adds a subsection named *"New subsection"* (then *"New subsection 2"*, …) to the section's declared list and shows it at once; it can be renamed straight away. Declared names show first, in declared order, then names found only on lines; the grid merges declared names into its own list so the band appears there too.
- Rules: names compare trimmed and case-insensitively (first spelling wins); a duplicate explicit name is refused. Delete removes only the declaration and is refused while lines still carry the name — `"{name}" still has line items` / `Move or recategorise its {n} item{s} in the Items tab first — deleting the subsection here would leave the band in place.`. A declared subsection with no lines never prints.
- Data: `leads.quote_metadata.subsectionOrder` `{ [section]: string[] }`.
- States: —
- Words: as above.
- Reachable: yes.

### A-80 · Subsection total label
- Where: `subsection-row.tsx:112-122`; `quote-hierarchy-editor.tsx:380-391`. Printing: templates B-18.
- Entry: panel, under each subsection: *"+ Show a word instead of the amount (e.g. Approximate)"*.
- Does: stores a word printed instead of that subsection's rolled-up amount.
- Rules: display only — the lines keep their prices and the totals don't move; blank clears the key. Re-keyed on a section rename, not on a grid subsection rename.
- Data: `leads.quote_metadata.subsectionTotalLabels["{section}|{subsection}"]`.
- States: —
- Words: as above.
- Reachable: yes.

### A-81 · Subsection order
- Where: panel `quote-hierarchy-editor.tsx:516-566`, `section-row.tsx:14-35`; grid `QDD:3659-3702` (`handleSubcategoryDrop`), `1315-1336` (seed); test `idl-c5-subsection-reorder.test.ts`.
- Entry: drag a subsection in the panel or in the grid.
- Does: panel — reorders within its own section only (a drop over another section is refused) and saves the whole visible list, line-derived names included, as that section's declared order. Grid — reorders the session list only (same section only), which is what the grid displays.
- Rules: the grid's subsection order starts as first appearance on the lines, plus declared names appended; a grid drag is not saved and is lost on reopen.
- Data: `leads.quote_metadata.subsectionOrder` (panel only).
- States: —
- Words: —
- Reachable: yes.

### A-82 · Subsection names on the line and the studio catalogue
- Where: `quote-row.tsx:139-209` (`SubcategoryCombobox`, unused); `src/lib/queries/studio-config.ts:184-218`; Browse `browse-price-book-modal.tsx:220-224`.
- Entry: line panel *"Subcategory (optional)"*; subsection *"Add item"*; drags; Browse; packages.
- Does: a line's subsection is free text set in the panel, by adding under a subsection, by dragging onto a subsection header or row, or copied from a price-book item or a package (parsing leaves it empty).
- Rules: `studio_quote_categories.subcategories[]` gains names from the grid's *"Subcategory"* add (`POST /api/studio-config/quote-categories/subcategory { categoryName, subcategoryName }`) and from panel subsection renames (`{ categoryId, subcategoryName }`), both idempotent. Studio switch `priceBookSubcategoryInQuote` (default on) decides whether Browse and packages carry the book item's subcategory (`docs/rules/leads.md` §priceBookSubcategoryInQuote). A per-line subsection combobox with catalogue quick-picks (*"+ Subcategory"*) exists in code but is never rendered.
- Data: `quote_line_items.subcategory`; `studio_quote_categories.subcategories`.
- States: —
- Words: panel placeholder *"e.g., Kitchen, Master Bedroom — leave empty for none"*.
- Reachable: yes (combobox: no, dead).

### A-83 · The legacy hierarchy column
- Where: `scripts/migrations/183_quote_hierarchy_metadata.sql`, `189_quote_metadata_hierarchy_backfill.sql`; `src/lib/quote-canva/hierarchy/resolve-hierarchy.ts:1-11`; test `quote-hierarchy-legacy-compat.test.ts`.
- Entry: n/a.
- Does: `leads.quote_hierarchy_metadata` (`{ sections: [{ id, categoryName, description, orderIndex, subsections: [...] }] }`) was the first-class hierarchy (plan 2026-06-03); the 2026-06-04 audit made sections derive from lines and moved order / descriptions into `quote_metadata` (migration 189 backfilled). The editor still passes the column as an ignored prop; each panel rename still rewrites it; the RPC also knows a `reparent_subcategory` cascade that no UI sends.
- Rules: *Save as package*'s section picker still reads the legacy list (templates C-12).
- Data: as above.
- States: —
- Words: —
- Reachable: read path fallback only.

### A-84 · Layout blocks attached between sections (touchpoint)
- Where: `QDD:3489-3517` (`cascadeEmptiedGapCategories`), `3596-3615`, `3957-3966`, `8795-8805`; `src/lib/quote-canva/inter-section-actions.ts`. Hand-off templates B-11.
- Entry: automatic on section rename / delete / emptying.
- Does: canva blocks placed between pricing-table sections are keyed by section **name**: every rename path re-keys them; deleting a section asks first and deletes them; a section emptied by a row delete, bulk delete or bulk move loses them with a toast.
- Rules: sections added empty this session are exempt from the emptying cascade.
- Data: `leads.quote_metadata.canvaBlocks` (pricing-table `props.interSectionBlocks`).
- States: —
- Words: `Removed {n} layout block{s} attached to the now-empty section "{name}"` / `…sections`.
- Reachable: yes (canva studios).

---

## Editing: keyboard, selection, bulk, copy / paste, undo, drag

### A-85 · Keyboard in the panel grid
- Where: `quote-digitizer-cell.tsx:17-30, 246-289`; `quote-row.tsx` (`col` props).
- Entry: a focused cell.
- Does: Enter commits and moves down one row in the same column; Tab / Shift+Tab commit and move to the next / previous cell; Escape reverts. Only these cells take part: name (`data-col 0`), Unit Price (3), Qty (4), Unit Cost (6), Markup % (7) — Unit is a combobox and Discount a button.
- Rules: Tab moves to `data-col + 1` and wraps to the next row's name after column 6 (see Uncertain for the gaps). Undo / redo keys are global (A-91). No keyboard shortcut adds a line.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-86 · The focused grid
- Where: `src/components/leads/focused-grid/focused-grid-overlay.tsx:1-929`; trigger `QDD:8455-8462`; mount `QDD:9027-9033`; test `focused-grid-overlay.test.tsx`.
- Entry: *"Expand to focused grid"* in the *"Line Items"* header.
- Does: a full-pane dense, spreadsheet-styled version of the grid with gridlines and compact rows. Toolbar: *"Line Items · {n}"*, *"Add item"* (panel with no section preset), *"Browse"*, *"Add package"*, Columns, one collapse / expand-all toggle (*"Collapse all sections"* / *"Expand all sections"*), *"Descriptions"* (hide / show description lines), *"Round prices"* (hand-off B), *"Collapse"* (title *"Collapse (Esc)"*). Footer = the same summary strip (A-48). The PDF preview pauses meanwhile.
- Rules: desktop only — drag grips resize columns (min 60 px; widths remembered in localStorage `focusedGrid.colWidths`, saved 300 ms after resizing and immediately on release). Touch devices lose range selection, the fill handle and resizing but keep tap-to-edit, collapse, columns and descriptions. Escape first clears the cell selection, then closes (never while a cell is being edited); focus returns to the trigger.
- Data: —
- States: empty *"No line items yet"* / *"Add your first item"*.
- Words: as above.
- Reachable: yes.

### A-87 · Cell selection and keyboard in the focused grid
- Where: `focused-grid-overlay.tsx:149-392`; `use-grid-selection.ts`; `grid-coords.ts`; `grid-columns.ts:12-22`; tests `focused-grid-coords.test.ts`, `focused-grid-columns.test.ts`.
- Entry: focused grid.
- Does: the six range columns — in index order *Unit Price, Discount, Qty, Unit, Markup %, Unit Cost* — are selectable. Click = active cell; Shift+click extends; arrows move; Shift+arrows extend; Cmd/Ctrl+↑/↓ jump to the first / last line of the section; Cmd/Ctrl+←/→ jump to the first / last column; Home / End go to the row's first / last column; Tab / Shift+Tab move right / left; Enter or F2 edits the active cell; typing a character starts editing with that character.
- Rules: no mouse-drag marquee (row dragging owns that gesture); keys are ignored while an input has focus. The index order puts Markup % before Unit Cost although Unit Cost is left of Markup % on screen.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-88 · Copy and paste (incl. from Excel)
- Where: `focused-grid-overlay.tsx:394-498`; `grid-clipboard.ts`; `grid-write.ts`; tests `focused-grid-clipboard.test.ts`, `focused-grid-write.test.ts`, `focused-grid-overlay.test.tsx`.
- Entry: focused grid, Cmd/Ctrl+C and Cmd/Ctrl+V.
- Does: copy puts the selection (or active cell) on the clipboard as tab-separated text; paste reads tab-separated text (trailing CR / blank line tolerated) from the active cell down and right, writing each cell through the same pricing rules as typing (cost, then price, then markup; qty re-resolves volume tiers; discount / qty recompute totals) as one undo step *"Paste cells"*.
- Rules: paste columns follow the index order of A-87; values beyond the last column are dropped; rows beyond the last line are dropped (`Pasted into {x} row(s); {y} didn't fit`); numbers lose thousands commas, blank → 0 (Unit Cost blank → `null`), junk → 0, text trimmed. Paste refuses when a target column is hidden (*"That column isn't shown — show it from the Columns menu to paste there"*); copy masks hidden columns as empty and refuses a range that is all hidden (*"That column isn't shown — nothing to copy there"*). Pasting into Markup % warns *"Markup pasted — unit prices were recalculated"* / *"Quote totals changed. Undo (Cmd+Z) reverts the whole paste."*. Paste can't create lines or write name, description or section. Touch: single row. Locked → *"Quote is locked — revise the quote to make changes"*.
- Data: local items → autosave.
- States: —
- Words: as above.
- Reachable: yes (focused grid only; the panel grid has no multi-cell copy/paste).

### A-89 · Fill down and the fill handle
- Where: `focused-grid-overlay.tsx:259-298` (fill down), `500-604` (fill handle); `grid-fill.ts`; test `focused-grid-fill.test.ts`.
- Entry: focused grid — Cmd/Ctrl+D; the square handle at the selection's bottom-right (desktop).
- Does: Cmd/Ctrl+D copies the top row of the selection into the rows below it (undo step *"Fill down"*). Dragging the handle down extends each selected column: two or more numbers with a constant step continue the series, anything else repeats the last value (undo step *"Fill series"*).
- Rules: both refuse when a column in play is hidden (*"That column isn't shown — show it from the Columns menu to fill it"*) or the quote is locked; a single-row selection is a no-op for Cmd/Ctrl+D. Qty drag-fill (A-37) exists in both grids.
- Data: local items → autosave.
- States: —
- Words: title *"Drag to fill"*.
- Reachable: yes.

### A-90 · Row selection and the bulk bar
- Where: `line-items-grid.tsx:354-372`; `quote-row.tsx:363-370`; `QDD:8865-8920`.
- Entry: row checkboxes and the header *"Select all"* (editable quotes).
- Does: bar `{n} selected` with *"Delete"* (undo `Delete {n} row{s}`), VO-only *"Omit"* / *"Restore"* (undo `Omit {n} row{s}` / `Restore {n} row{s}`), *"Move to..."* (section list; undo `Move to {section}`) and *"Clear"*.
- Rules: *"Select all"* takes the lines matching the current search. *"Move to..."* changes the section only (the subsection is kept). Delete and move trigger the emptied-section layout cascade (A-84). The bar is hidden when read-only.
- Data: local items → autosave.
- States: —
- Words: as above.
- Reachable: yes.

### A-91 · Undo and redo
- Where: `src/hooks/useUndoRedo.ts`; `QDD:826-864` (`trackEdit`), `915-967` (AI turns), `6818-6836` (buttons); `src/lib/quote-agent/patches.ts`; test `quote-agent.test.ts`.
- Entry: header ↶ / ↷ (`sm+`), Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z outside inputs.
- Does: a 50-step stack of line-array snapshots; button titles `Undo: {label} (⌘Z)` / `Redo: {label} (⌘⇧Z)` (else *"Undo (⌘Z)"* / *"Redo (⌘⇧Z)"*). A whole AI chat turn is one step labelled with its tool labels (else *"AI action"*).
- Rules: tracked — every grid cell edit (`Edit {field}`), row / section delete, row reorder, grid section and subsection renames, subsection remove, packages, Starter Quote, round-off, Browse, bulk actions, omit from contract, margin-panel cost fix, paste, fill down, fill series, qty fill, discount drawer, drop on a subsection header. Not tracked — panel add / edit, duplicate, grid section drag, row dropped on a section header, content-block removal, version restore, parsing, template apply (which has its own *"Undo"* toast, templates C-36). Undo covers lines only — not section order, notes, layout, schedule, GST or discount. Cleared on open, close and every reset; disabled while the AI agent runs.
- Data: memory only.
- States: buttons disabled when the stack is empty.
- Words: as above.
- Reachable: yes.

### A-92 · Dragging a line
- Where: `src/lib/quote-reorder.ts`; panel `QDD:3621-3657`; focused `focused-grid-overlay.tsx:606-680`; test `quote-reorder.test.ts`.
- Entry: panel — drag the row (grip shows on hover); focused — drag the grip (always visible, touch supported, guide line).
- Does: drops above or below the target row by the pointer's position against the row's midpoint; the moved line adopts the target's section and subsection; one undo step *"Reorder row"*.
- Rules: dropping where it already is returns the same array (no undo entry); the exact midpoint counts as *before*; a zero-height row counts as *before*.
- Data: local items (array order becomes `sort_order` on save).
- States: dragged row dims; target row shows a top or bottom edge.
- Words: title *"Drag to reorder"* (focused grip).
- Reachable: yes.

### A-93 · Dropping a line onto a section or subsection header
- Where: `QDD:3783-3800` (row → section); `line-items-grid.tsx:625-655` (row → subsection).
- Entry: panel grid, dragging a line onto a header row.
- Does: onto a section header → the line moves to the top of that section (section changed, subsection kept; not undoable). Onto a subsection header → the line is re-filed under that section + subsection (undo `Move row to {section} → {subsection}`).
- Rules: panel grid only (the focused grid drags between rows only).
- Data: local items → autosave.
- States: target header highlights.
- Words: —
- Reachable: yes.

### A-94 · Dragging a section in the grid
- Where: `grid-rows.tsx:104-118`; `QDD:3711-3781` (`handleSectionDrop`).
- Entry: grip on a section header (`Reorder section {name}`, title `Drag to reorder {name}`).
- Does: dropping on another section: when both have lines, reorders the lines by section and saves the new order as the lead's `categoryOrder`; when either is an empty session section, reorders the session list only.
- Rules: not undoable. The Sections panel drag (A-75) is the other way to reorder.
- Data: `leads.quote_metadata.categoryOrder`.
- States: target header shows a top edge; source dims.
- Words: as above.
- Reachable: yes.

### A-95 · Where new lines land, and the highlights
- Where: `QDD:1485-1537`, `4122-4143`, `751-796`; `quote-row.tsx:343`.
- Entry: any add.
- Does: panel adds use the section / subsection bucket rule (A-68); Browse, packages, Starter Quote, omissions and AI appends go to the end of the array (the display then groups them by section order). A new or edited line flashes for 1.5 s; lines appended by the AI play a 1 s entry animation and the first one scrolls into view. Adding under a collapsed section expands it.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Getting lines in

### A-96 · Adding a line by hand
- Where: `QDD:3906-3918` (`addItemToCategory`, `addItem`), `4054-4065`, `8537-8586` (Add ▾); `grid-rows.tsx:208-248, 429-493`; `focused-grid-overlay.tsx:126-131, 820-829, 900-915`.
- Entry: Add ▾ (title *"Add an item or a new category"*) → *"Add item"*; section header ➕ (`Add row to {section}`); section footer *"Item"* (`Add an item to {section}`); subsection *"Add item"*; focused toolbar *"Add item"* (*"Add a line item"*) and *"Add your first item"*.
- Does: every path opens the line panel (A-67) — there is no blank inline row. Defaults: section = the one clicked (Add ▾ uses *"Others"*; the focused toolbar presets none), subsection when added under one, price type `amount`, qty 1, unit *"lot"*, source `manual`.
- Rules: the panel needs a name to save. Add ▾ also holds *"Add category"* (A-73), *"Add package"* / *"Save as package"* (A-123 / templates C-11). An older *"Create Custom Section"* dialog, an `addSection` helper and a Quick Add popover remain in code with no trigger.
- Data: —
- States: hidden when read-only.
- Words: as above.
- Reachable: yes (the three leftovers: no).

### A-97 · Browse the price book (multi-select)
- Where: `src/components/leads/browse-price-book-modal.tsx`; mount `QDD:10255-10265`; toolbar `QDD:8524-8536`. The book itself: hand-off B.
- Entry: toolbar *"Browse"* (title *"Add items from your price book"*); focused toolbar *"Browse"*.
- Does: dialog *"Browse price book"* — search *"Search by name or category..."* (every word must match name, description, category or subcategory), vendor filter *"All vendors"*, multi-select, a vendor picker per item with several vendors, footer `Add {n} item{s}` / *"No items selected"*. Each pick becomes a line: name `pb.name || pb.description`, description `pb.description` only when the book row has a separate name, section `pb.categoryName || "Others"`, subsection per the carry switch (A-82), unit price, qty 1, unit (else *"lot"*), markup, cost, waste, cost type, vendor (A-60), `priceBookItemId`, snapshot time, image, spec link, `source: "price_book"`, totals computed.
- Rules: inactive book rows are excluded; the picks are appended as one undo step *"Add from price book"*.
- Data: `studio_price_book` (read); local lines.
- States: *"No price-book items yet."*, `No items match “{q}”.`.
- Words: as above.
- Reachable: yes (hidden when read-only).

### A-98 · Picking a price-book item inside the line panel
- Where: `src/components/leads/price-book-combobox.tsx:60-80`; `price-book-item-editor.tsx:712-777`.
- Entry: the panel's *"Item Name"* field.
- Does: after 2 typed characters, suggests up to 8 active book items whose name, description, category or SKU contains the text, grouped by name. Picking one fills name (`pb.name || pb.description`), SKU, description (only when the book row has a name), unit, sell price, cost, markup, cost type, waste, vendor, image, spec link, notes and section, and links the line (`priceBookItemId`, snapshot time).
- Rules: the code comment says only empty fields are filled, but every field the book row has a value for overwrites the form (`pb.x ?? current`). The subsection is left alone. Picking locks *"Also save to price book"* (A-68).
- Data: `studio_price_book` (read).
- States: —
- Words: hint `Type 2+ chars to search the price book ({n} items)`.
- Reachable: yes.

### A-99 · Packages into a quote (touchpoint)
- Where: `QDD:1802-1856`; picker mount `QDD:10636-10652`. Hand-off templates C-06 (picker), C-08 (single apply), C-09 (several at once), C-10 (empty-quote CTA), C-11 (Add ▾ entries), C-12 (save as package).
- Entry: Add ▾ *"Add package"* (*"Apply a saved package to this quote"*); focused toolbar *"Add package"* (*"Apply a saved package"*); empty-quote CTA *"Start from a package"* / *"Pick a package"*.
- Does: (line side) the package's items are appended to the open quote as one undo step (*"Add package"* / *"Add packages"*), each keeping its own section; they carry no `source` (no badge) and a fresh id (templates C-02 for the field mapping).
- Rules: refused on `submitted · approved · sent_for_signature · client_signed` (*"This quote is locked — can't add a package."*); no de-duplication; subsections carried per the switch (A-82).
- Data: `studio_assemblies` (read).
- States: —
- Words: see templates C-08 / C-09.
- Reachable: yes.

### A-100 · Starter Quote from generation rules (touchpoint)
- Where: `QDD:4067-4098`, `8494-8505`. Hand-off templates C-43…C-47 (rules), C-46 (this button).
- Entry: toolbar *"Starter Quote"* (owners, when the studio has active rules).
- Does: (line side) appends the matching rules' lines (`source: "template"`, section else *"Others"*, unit *"lot"*) as one undo step *"Generate Starter Quote"*.
- Rules: matches on the lead's project type only; no de-duplication.
- Data: `quote_generation_rules` (read).
- States: —
- Words: see templates C-46.
- Reachable: yes (owners).

### A-101 · Quote and design templates as a source of lines (touchpoint)
- Where: `QDD:4276-4400` (`applyDocumentTemplate`), `4402-4505`, `2468-2507` (default layout seeding), `9973-10222` (modal). Hand-off templates C-35…C-41, templates A-88, templates B-52.
- Entry: entry screen cards; sidebar *"From Template"* → *"Saved Design Templates"*; Layout tab design-template picker.
- Does: (line side) applying a Quote Template **replaces** the open quote's lines with the template's items (never merges; `source` as saved, clean templates at $0); applying a design-only template leaves the lines alone; the Layout tab's picker never touches lines. On first open the studio's default template seeds only the legacy layout, never lines.
- Rules: applying over AI-parsed lines (legacy-layout studios) stashes them for *"Restore Parsed Items"* (A-105); the canva path does not stash.
- Data: `studio_document_templates.body_json.items`.
- States: —
- Words: see templates C-36, C-37.
- Reachable: yes.

### A-102 · Upload an existing quote (the digitizer)
- Where: `QDD:3000-3423` (`triggerUpload`, `processFile`, `handleFileUpload`, `handleDrop`), `7063-7070` (file input), `7115-7154`, `7922-7938`.
- Entry: entry screen *"Upload a quote"*; sidebar *"Upload Quote"*; *"Try Again"* after an error.
- Does: file input accepts `.pdf, .png, .jpg, .jpeg, .csv, .xlsx`. With lines already present, the sidebar asks *"Replace {n} items?"* / *"Uploading a new document will overwrite all current line items."* / *"Cancel"* / *"Yes, replace"*. The editor then resets completely (lines, layout, schedule, chat, undo) and sends the file to parsing (A-103) and layout extraction (A-106) in parallel; the parsed lines replace everything (A-104), then the post-parse pipeline runs (A-107).
- Rules: files over 10 MB are refused client-side (*"File too large. Maximum size is 10MB."*). A drop handler exists but is attached to nothing — there is no drag-and-drop upload. Disabled when read-only.
- Data: —
- States: sidebar *"Scanning document..."* / *"Extracting line items with AI"*; centre *"Reading your quote…"* / *"Extracting line items, prices, payment milestones, and document layout. Large multi-page PDFs can take 30–60 seconds."*; error chip + *"Try Again"*.
- Words: toast `Couldn't parse document: {msg}`.
- Reachable: yes (drag-and-drop: no).

### A-103 · `POST /api/quotes/parse`
- Where: `src/app/api/quotes/parse/route.ts:1-344`.
- Entry: A-102.
- Does: multipart `file` → one Gemini 2.5 Flash call via OpenRouter in JSON mode (60 s timeout). PDF / PNG / JPG go in as images; CSV as text; XLSX's first sheet converted to CSV text. Up to two calls: a truncated answer retries with a bigger token budget (32,768 → 65,536), an unparseable one retries fresh. The prompt: section headings are categories, not lines; skip subtotal and total rows; price types `amount · foc · kiv · inclusive · by_client · lump_sum` (FOC → 0, KIV → null, inclusive → 0, by client → null, L/S without price → null); never infer prices, missing price → `null` + `kiv`, total only when both numbers are visible, per-line `confidence` 0–1 (below 0.4 → price null); default qty 1, unit *"lot"*; header fields vendor, date, issued by, client name, subtotal, discount, grand total; a payment schedule when printed.
- Rules: session required (401 *"Not authenticated"*); region from `?countryCode=` (the lead's) else the studio's; 413 over 10 MB; 415 *"Unsupported file type. Upload a PDF, image, CSV or Excel file."*; 422 / 500 *"Could not parse document. Try again or add items manually."*. `DRY_RUN` or a missing API key returns a fixed 14-line sample (*"Home Create Pte Ltd"*). Usage events `feature_opened` / `feature_succeeded` / `feature_failed` (`quote_digitizer`).
- Data: returns `ParsedQuoteDocument` `{ vendor, date, issuedBy, clientName, refNumber, description, subTotal, discount, grandTotal, lineItems[{ section, itemNumber, description, priceType, unitPrice, qty, unit, total, confidence }], paymentSchedule[] }`.
- States: —
- Words: as above.
- Reachable: yes.

### A-104 · From parsed rows to lines
- Where: `src/lib/quote-utils.ts:1-83` (`sectionToCategory`, `mapParsedItem`); test `quote-utils.test.ts`.
- Entry: after A-103.
- Does: each parsed row becomes a line with the parsed text as **both** name and description, section from the heading, unit price (`null` → 0), qty (else 1), unit, total (parsed total else price × qty), the parsed price type, `source: "parsed"`.
- Rules: the heading maps by keywords (English plus Arabic / Malay / Chinese) — hack / dismantle / demolish → *"Demolition"*; mason / waterproof / screed → *"Masonry"*; plumb → *"Plumbing"*; electric → *"Electrical"*; partition / plaster / ceiling → *"Plastering"*; paint or the letters `cat` (Malay) → *"Painting"*; carpent / cabinet / wardrobe → *"Carpentry"*; design / consult / management → *"Design"*; counter / stone / material → *"Materials"*; vinyl / floor / decking → *"Flooring"*; tile / tiling → *"Tiling"*; glass → *"Glass"*; door → *"Doors"*; clean → *"Cleaning"*; else the heading title-cased; blank → *"Others"*. The editor does not pass the studio's own categories, so the catalogue-matching branch is unused. The parser's `confidence` is dropped. Subsections are never set.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-105 · The source document card, totals check and restore
- Where: `QDD:7195-7262`, `7424-7445`, `7596-7602`, `4568-4581`; persistence `lead-detail-drawer.tsx:2831-2845`.
- Entry: left sidebar after an upload.
- Does: a collapsible *"Source document"* card — *"Quotation"*, the vendor, `Client: {name}`, *"NRIC: —"*, *"Mobile: —"*, *"Email: —"* (always dashes), `Ref:`, `Date:`, `Issue by:`, the description, the file name and `Scanned · {n} items` / `Auto-saved as draft · {n} items`, a remove button (A-12). The Summary card warns when the lines' subtotal differs from the document's stated subtotal (or grand total + discount) by more than 1: `Items sum to {x}, but the document claimed {y}` + *"Accept items"* (overwrites the document's figures with the lines'). *"Restore Parsed Items ({n})"* brings back parsed lines stashed by a template apply (A-101).
- Rules: the parsed document (minus lines, plus `_extractedSections`, `_extractedGlobalStyles`, `_docInsights`, `paymentSchedule`) is saved on the quote only when the parse produced at least one line; the browser keeps a copy; *"(restored)"* labels a browser-cache restore with no file name.
- Data: `quotes.parsed_doc_metadata` (else legacy `leads.quote_data`); localStorage `quote_source_q_{quoteId}`.
- States: —
- Words: as above.
- Reachable: yes.

### A-106 · Layout extraction alongside the parse (touchpoint)
- Where: `src/app/api/quotes/extract-layout/route.ts`; `QDD:3055-3120`; `src/lib/quote-layout-redact.ts`. Hand-off templates B-06 (legacy sections → canva).
- Entry: every upload.
- Does: a second Gemini call reads the document's visual structure (sections `cover · header · footer · rich_text · two_column · pricing_table · payment_terms · bullet_list · image · signature_block · terms_conditions · spacer`, colours, header layout). The client swaps any source-vendor name, address, phone or *issued by* for `{{studio_*}}` placeholders and drops numbered item narratives already present as lines; the result becomes the quote's legacy layout sections.
- Rules: failure (or a CSV / XLSX file, 415) is ignored — lines still load. PDF / image only, 10 MB, session required.
- Data: `quotes.doc_sections`, `quotes.parsed_doc_metadata._extractedSections`.
- States: —
- Words: —
- Reachable: yes.

### A-107 · What happens right after a parse
- Where: `QDD:3128-3408`; tests `quote-digitizer-discard-race.test.ts`.
- Entry: after A-104.
- Does: (1) saves the parsed lines at once (save #1) and starts a price-book suggestion scan on the inserted ids (A-110); (2) replaces the payment schedule with the parsed one only if the current one is untouched, else keeps it and says so (hand-off C); (3) runs AI insights (A-109) and background auto-match (A-108), each chained **after** save #1 and each re-saving the enriched lines.
- Rules: every step checks the generation fence — a discard, a new upload or a template apply makes stale results no-ops. Failures surface as toasts, the lines stay.
- Data: A-15.
- States: —
- Words: *"Couldn't auto-save the parsed quote. Your items are still here — use Save Draft before closing."*; *"Couldn't save price-book matches — your edits stayed local. Try Save Draft manually."*; *"Couldn't auto-match price book in background. Use the Auto-Match button when you're ready."*; *"Parsed quote includes its own payment schedule — your edited schedule was preserved. Open the schedule editor to compare if you want to use the parsed values."*.
- Reachable: yes.

### A-108 · Price-book auto-match
- Where: `src/app/api/quotes/auto-match/route.ts`; `src/lib/price-book-matcher.ts:160-235`; `QDD:3271-3354` (background), `3528-3594` (manual, unreachable); `src/components/leads/auto-match-review-panel.tsx`.
- Entry: automatic after a parse; automatic at every save (A-15).
- Does: for each line, finds the best active price-book item: score = 0.70 × similarity of synonym-expanded description words + 0.15 × section match + 0.15 × unit match; tiers `high` ≥ 0.75, `suggested` ≥ 0.50, `none` below; a price more than 15 % off the book price is flagged. Only `high` matches are applied automatically — link, cost, waste, cost type, vendor, snapshot time (source unchanged).
- Rules: a manual *"Auto-Match PB"* button used to open a review panel (accept per match, which also set markup from the book and `source: "price_book"`, toast `Linked {n} item{s} to price book`); the button was removed, so the panel is unreachable.
- Data: `POST /api/quotes/auto-match { items: [{ description, category, unit, unitPrice }] }` → `{ matches: [{ parsedItemIndex, matchedItemId, confidence, tier, priceDiscrepancy, priceDiffPercent, pbUnitPrice, pbCostPrice, pbWastePercent, pbCostType, pbVendorId }] }`.
- States: —
- Words: —
- Reachable: background yes; manual panel no.

### A-109 · AI insights on lines
- Where: `src/app/api/quotes/insights/route.ts`; `QDD:319-351` (badge), `2604-2678` (manual run), `9538-9618` (drawer); `quote-row.tsx:597-612`.
- Entry: automatic after each upload; header sparkle → drawer *"AI Insights"* → *"Re-analyze with AI"* / *"Run Analysis"* (not in VO mode).
- Does: sends the lines (description, section, price, qty, unit, price type, markup) with the lead name and region; Gemini returns up to 8 suggestions, priority under-quote > thin margin > missing > upsell, never *too expensive*. Types and labels: `underquote` *"Under-quoted"*, `margin_warning` *"Thin Margin"* (only when margins exist), `upsell` *"Upsell"*, `missing` *"Missing"*, `client_mismatch` *"Client Mismatch"* (document-level, only with a lead name). Line suggestions attach to the line (chip under its description in edit mode); document-level ones list first in the drawer.
- Rules: only `amount` lines priced above 0 are analysed; market rates come from `platform_market_rates` for the region, else built-in SG / MY / AE / IN tables; the server drops invalid indexes / types and any under-quote whose price is at or above the low end of the range it cites. A re-run overwrites a line's suggestion but never clears one from a line that gets none. Failures show as a document-level item `Analysis failed: {msg}` / `AI insights unavailable: {msg}` under the *"Client Mismatch"* label.
- Data: `quote_line_items.ai_suggestion {type, message}`; `quotes.parsed_doc_metadata._docInsights`.
- States: *"Analyzing line items..."*; empty *"No AI insights yet"* / *"Analyze your line items against market benchmarks"*.
- Words: as above.
- Reachable: yes.

### A-110 · New lines → price-book suggestions
- Where: `src/components/leads/new-items-suggestion-modal.tsx`; `src/lib/queries/price-book-suggestions.ts:15-80`; `QDD:891-913`, `10267-10289`. Price book: hand-off B.
- Entry: after save #1 of an upload, after each AI chat turn, after the meeting brief creates a quote.
- Does: `POST /api/price-book/suggestions/scan { source, quoteLineItemIds }` silently links confident matches and returns the rest as pending suggestions → modal *"New items found — add to your price book?"* / `We found {n} item{s} on this quote that aren't in your catalogue yet. Review, edit, and add the ones you want to keep.`. Per row: include checkbox, `From quote: {description}`, *"Item Name"* (*"e.g., 5mm Vinyl Flooring"*), *"SKU / Item ID"* (*"Auto"*), *"Category"* (*"Uncategorised"*), `Unit Cost / {unit}` (*"Optional"*), `Sell Price / {unit}`; `{x} of {n} selected`; `Add {n} to price book`, `Dismiss {n}`, *"Review later"*.
- Rules: scan failures are silent. Closing with suggestions left → `{n} suggestions left for your price book — view in Accounts → Price Book`. Sources `pdf_parse · ai_generation · copilot · submit_review · manual`.
- Data: price-book suggestion tables (hand-off B/D).
- States: —
- Words: toasts `Added {n} item{s} to your price book`, `Couldn't add to price book: {reason}`, `Added {x}, {y} failed — {reason}`, `Dismissed {n} item{s}`.
- Reachable: yes.

### A-111 · Chat to quote: where it opens and how it looks
- Where: `src/components/leads/quote-chat-panel.tsx`; `QDD:9255-9292` (single mount), `6852-6878` (*"Ask AI"*), `7998-8001`; tests `quote-chat-panel-*.test.tsx`.
- Entry: header *"Ask AI"* (title *"Ask AI to draft or edit the quote"*); entry screen *"Draft with AI"* / cold-start hero (the brief is sent straight away).
- Does: two modes — *hero* (takes over the pane on an empty quote: *"AI Quote Drafter"*, `Grounded in {n} price book item{s}` · `{n} template{s}`, *"Ready when you are"*, *"Describe the project and I'll draft the quote."*, *"Type a brief below. I'll pull matching items from your price book, suggest quantities, and set margins."*) and *sidepanel* (a 380 px panel *"Ask AI"* docked above the footer). Tool calls show as cards with live status (*"Reading the brief…"*, the tool's label, *"Writing it up…"*) and price-source badges *"Price book"*, *"Market rate"*, *"Web"*, *"Unresolved"*. Patches stream into the grid as they arrive; a strip *"AI is drafting"* runs across the dialog.
- Rules: the mode flips to sidepanel only at the end of a turn that left lines. While the agent runs, undo / redo, discard and the *"Ask AI"* toggle are disabled and autosave waits; the turn then saves once. The button is not hidden on read-only quotes (see Uncertain). The sidepanel's *"Try"* chips (*"Use our HDB 4-room template"*, *"Bump all carpentry margins to 40%"*, *"Show me the totals"*) are not clickable. The hero's template count is the studio's design-template count, while the agent's template tool reads a different table (A-113).
- Data: —
- States: input placeholders *"Refine, edit, or ask a question… (Shift+Enter for newline)"* / *"AI is drafting — click Stop to cancel"* / *"Ask the AI… (Shift+Enter for newline)"* / *"Drafting…"*; *"Stop"*, *"Send"*; Escape closes the hero when idle (*"Close chat (Esc)"*).
- Words: errors *"Please sign in again."* (401), *"Slow down — try again in a moment."* (429), *"Lead not found."* (404), *"Something went wrong."*, *"Connection lost. Please try again."*; `AI tried to add items but all {n} were skipped. Expand the tool card above to see why.`; *"Couldn't save the AI draft. Click Save Draft before closing."*.
- Reachable: yes.

### A-112 · Chat to quote: the API and the agent loop
- Where: `src/app/api/quotes/chat/route.ts`; `src/lib/quote-agent/loop.ts`, `system-prompt.ts`, `types.ts`; tests `quote-chat.test.ts`, `quote-agent-guardrails.test.ts`.
- Entry: every chat message.
- Does: `POST /api/quotes/chat { leadId, message, conversationId, history, currentDraft }` → server-sent events `thinking`, `tool_start`, `tool_result` (may carry a draft patch `append · replace · update_many · delete_many`), `text_done`, `error`, `done`. The system prompt carries the studio name and country, the lead's name / property type / area / budget, the current draft, the studio's legacy `quote_templates` list, and a price-book index (per category: count + 3 sample descriptions). The loop runs Gemini 2.5 Flash with tools: at most 6 iterations and 20 tool calls per turn, 30 s per tool, independent calls in parallel, an identical repeated *mutating* call skipped, tool results truncated to 1,000 characters per string.
- Rules: session cookie (401); rate limit 10 requests / 60 s per IP (429 *"Rate limit exceeded. Try again shortly."*); the lead must belong to the studio (404 *"Lead not found"*); history trimmed to the last 40 messages; `DRY_RUN` → *"[DRY_RUN] AI call skipped."*; no API key → *"AI is not configured."*; a crash → *"Something went wrong. Please try again."*. If a drafting turn narrates without adding lines, one guardrail retry runs, then the fallback (A-114); iterations exhausted with nothing drafted → fallback; otherwise *"I've done as much as I can in one go. Let me know what you'd like to adjust next."*.
- Data: reads `leads`, `studios`, `quote_templates`, `studio_price_book` (service-role client with explicit studio checks).
- States: —
- Words: as above.
- Reachable: yes.

### A-113 · Chat tools and how prices are found
- Where: `src/lib/quote-agent/tools.ts`, `executors.ts`, `web-search.ts`, `web-search-cache.ts`, `price-book-embeddings.ts`; `scripts/quote-agent/backfill-price-book-embeddings.mjs`, `backfill-progress.mjs`; tests `quote-agent*.test.ts`.
- Entry: the agent loop.
- Does: tools — *"Adding line items…"* `add_line_items`, *"Updating line items…"* `update_line_items`, *"Removing line items…"* `delete_line_items`, *"Adjusting global margin…"* `set_global_margin` (all lines or one section), *"Summarizing quote…"* `summarize_quote`, *"Inspecting draft items…"* `list_line_items`, *"Searching price book…"* `search_pricebook` (always offered), *"Applying template…"* `apply_quote_template` (only when the studio has legacy `quote_templates` rows; empty draft → replace, otherwise asks replace or merge; merge skips same description + section). `search_pricebook` resolves each query through: the studio price book by meaning (embedding + `match_price_book_items`, cosine distance ≤ 0.35) → `platform_market_rates` for the studio's country (no section filter; rows with no rate ignored; typical rate else derived from min / max) → a live web search (≤ 5 per call, cached, the extracted price must carry a unit, citation kept) → *unresolved*.
- Rules: line schema — description ≤ 500, section ≤ 100, qty 0–10,000, unit ≤ 50, unit price 0–10,000,000 or null, markup −50…100, price type `amount · foc · kiv · inclusive · by_client · lump_sum`, source one of `ai_drafted · ai_estimated · template · price_book · market_rate · web_estimated · needs_pricing`. On add, a model price on a price-book line is replaced by the real book price; anything unresolved is added at 0 with `needs_pricing` — the agent never guesses a rate. Chat lines copy their text into both name and description, default to a 30 % markup when the model gives none, and drop to `ai_estimated` when no cost was found. The country always comes from the session, never from the model. Tool names / keys in other casings are normalised. Embeddings are back-filled by a maintenance script.
- Data: `studio_price_book` (+ embeddings), `platform_market_rates`, web-search cache, `quote_templates`.
- States: —
- Words: as above.
- Reachable: yes (template tool only for studios with legacy rows).

### A-114 · Chat fallback draft
- Where: `src/lib/quote-agent/fallback.ts`; `loop.ts:311-380`; tests `quote-agent-fallback.test.ts`, `quote-agent-guardrails.test.ts`.
- Entry: a drafting turn that would otherwise end with an empty quote.
- Does: with ≥ 10 active price-book items, drafts up to 3 book items per book category (book name and price); otherwise a fixed ~27-line renovation skeleton (Preliminaries, Demolition, Masonry, Plumbing, Electrical, Partition & Ceiling, Painting, Flooring, Carpentry, Countertop, Glass & Mirror, Doors …) at price 0, qty 1, unit *"lot"*, `source: "needs_pricing"`. Shown as a *"Generating fallback draft…"* tool card.
- Rules: never a hard-coded price. Message `I ran into a drafting loop — generated a {n}-item baseline {propertyType} scope so you're not stuck.` followed by one of three pricing notes (all blank: *"**The prices are blank on purpose** — I won't guess a rate I can't source. …"*; some blank; all from the book).
- Data: `studio_price_book` (read).
- States: —
- Words: as above.
- Reachable: yes.

### A-115 · Chat history, turn undo and saving
- Where: `quote-chat-panel.tsx:188-245`; `QDD:743-800` (`applyAgentPatch`), `915-967` (`onAgentTurnEnd`), `2696-2780` (open / close wipes).
- Entry: every turn.
- Does: each patch applies to the grid as it arrives (new lines animate and scroll into view); the turn's patches become one undo step; at the turn's end the draft is saved once and a price-book suggestion scan runs (`ai_generation`).
- Rules: the panel keeps the last 50 messages per lead in localStorage `quote-chat-{leadId}` (versioned), but the editor deletes that key and remounts the panel on every open and every close — history lasts only while the editor stays open. The end-of-turn save is skipped on `submitted` / `approved` quotes and refused by the server on `sent_for_signature` / `client_signed`.
- Data: localStorage; lines via A-15.
- States: —
- Words: —
- Reachable: yes.

### A-116 · AI tier "packages" — Essential / Premium / Luxury (dead)
- Where: `QDD:9412-9458` (button behind `false &&`), `8923-9021` (viewer apply); `src/components/leads/quote-package-viewer.tsx`; `src/app/api/quotes/generate-packages/route.ts`. Hand-off templates C-29, D-06.
- Entry: none — *"Generate Variations"* is compiled out.
- Does: (for the record) with ≥ 4 lines, generated three upgraded tiers (targeting the lead's budget) saved to `quote_packages`; the viewer (*"Apply {n} to Quote"*) replaced **all** lines with one chosen tier (tier text as both name and description), or created one new quote per chosen tier (label = tier name, cheapest = primary) with its lines via `raw-insert` (no totals roll-up), toasting `Created {n} independent quote variation{s}. Open the lead's Quotes panel to view & approve each tier separately.`.
- Rules: server checks lead ownership and not-archived.
- Data: `quote_packages`, `quote_line_items.package_tier`.
- States: —
- Words: title *"AI generates 3 quote variations (Essential/Premium/Luxury) by upgrading materials and finishes. Requires 4+ line items."*.
- Reachable: no.

### A-117 · `POST /api/quotes/import` (dead)
- Where: `src/app/api/quotes/import/route.ts`.
- Entry: none — no caller in `src`.
- Does: bulk-inserts price-book rows from parsed CSV data (`{ description, category, unitPrice?, unit? }[]`), creating missing categories; `source: "csv_import"`.
- Rules: session cookie; service-role client with an explicit studio id (not the scoped client).
- Data: `studio_price_book`, `studio_quote_categories`.
- States: 400 *"No items provided"*; 500 *"Failed to import items"*.
- Words: —
- Reachable: no.

### A-118 · Line image upload route
- Where: `src/app/api/quotes/upload-image/route.ts`.
- Entry: the line panel's *"Upload"* (A-58).
- Does: multipart `file` + `leadId` → checks the lead belongs to the session's studio → stores the file in bucket `quote-images` at `{studioId}/{leadId}/{uuid}.{ext}` → returns a **public** URL.
- Rules: ≤ 5 MB; JPEG / PNG / WebP / GIF (the panel hint omits GIF); works for unsaved lines (checked by lead, not line). Service-role client.
- Data: storage `quote-images`; returns `{ imageUrl }`.
- States: 400 *"No file provided"*, *"No leadId provided"*, *"File too large (max 5MB)"*, *"Invalid file type. Allowed: JPEG, PNG, WebP, GIF"*; 404 *"Lead not found"*; 500 *"Failed to upload image"* / *"Upload failed"*.
- Words: as above.
- Reachable: yes.

### A-119 · Volume price tiers on a linked line (touchpoint)
- Where: `QDD:3433-3448` (`updateItem`), `grid-write.ts:59-72`; `src/app/api/studio-config/pricing-tiers/route.ts`. Tiers themselves: hand-off B.
- Entry: changing the quantity of a line linked to a price-book item that has volume tiers.
- Does: typing, pasting or filling a new quantity re-resolves the unit price (and cost, when the tier has one) from the tier that quantity falls in, then re-reads the markup.
- Rules: the Qty drag-fill handle (A-37) writes the quantity only — no tier re-price and no totals recompute on that path. Tiers are edited only in the price book (`PUT /api/studio-config/pricing-tiers { itemId, tiers[{ minQty, maxQty, unitPrice, costPrice }] }` replaces the set); the line panel has no tier editor. Despite its name, this route has nothing to do with the AI tier packages (A-116); its caller is the price-book item editor (`useSavePricingTiers`, `src/lib/queries/studio-config.ts:357`), reachable from Accounts › Price Book.
- Data: `price_book_pricing_tiers` (read).
- States: —
- Words: —
- Reachable: yes.

### A-120 · Lines from a meeting (co-pilot brief)
- Where: `src/components/copilot/meeting-brief.tsx:193-260, 380-410, 600-640, 844-960`; `src/lib/queries/copilot.ts:540` (`/api/copilot/records/create-quote`).
- Entry: meeting brief card *"Create draft quote"* (`{n} shadow item{s} · {amount} → Quote Designer`) → *"Create"*; afterwards `Draft {number} · Reopen`.
- Does: creates a quote on the lead from the meeting's captured "shadow items", scans its new lines for price-book suggestions (`copilot`), and opens the editor on that quote with the created lines until the live query returns.
- Rules: disabled for demo sessions (*"Demo session"*) and when nothing was captured (*"No shadow items to draft"*); bumps the lead mirror to `draft` only when it was `none`.
- Data: hand-off co-pilot audit for the creation route.
- States: —
- Words: as above.
- Reachable: yes (co-pilot enabled studios).

---

## Multiple quotes and packages per lead

### A-121 · One editor per quote — and what the quotes of a lead share
- Where: `lead-detail-drawer.tsx:311-330, 2722-2800`; `QDD:1064-1070`, `1716-1746`, `1955-2046`, `5020-5068`; leads B-59 (the drawer's quote list: *"Add Quote"* with *"Option A…Z"*, rename, clone, set primary, delete).
- Entry: the drawer's quote list; the Tools page (primary only).
- Does: the editor edits exactly one quote. **Per quote:** label, number, status, lines, the parsed source document, the legacy layout (`doc_sections`, `__layout`), the payment schedule, the project-ref override. **Per lead, shared by every quote of the lead:** section order, section / subsection notes, declared subsections, subsection total labels, the canva design and its overrides, the GST toggle, the document discount, layout overrides, the issuing entity (`leads.company_id`), IC / customer id / valid-until, the chat history and the version history (A-124).
- Rules: switching quotes remounts the editor (A-08); the browser's parse cache is per quote with a legacy per-lead fallback. A section rename from the Sections panel renames lines on every quote of the lead (A-76); a rename in the grid renames only the open quote's lines (A-74).
- Data: `quotes`, `quote_line_items.quote_id`, `leads.quote_metadata`.
- States: —
- Words: —
- Reachable: yes.

### A-122 · In-editor comparison of uploaded quotes (dead)
- Where: `QDD:4641-4715` (`handleAddCompareQuote`, `handleSwitchQuoteTab`, `handlePostParseForCompare`), `7861-7894` (tabs), `8337-8394` (table).
- Entry: none — the tab strip renders only when a compare list exists, and the list is filled only by the strip's own *"Add Quote"* or by a post-parse hook nobody calls.
- Does: (for the record) tabs per uploaded vendor quote (named by vendor or `Quote {n}`), *"Add Quote"* (stores the current lines and opens the file picker), *"Compare"* → *"Quote Comparison"*: a section × quote table of `amount` sums plus *"Grand Total"*.
- Rules: in-memory only.
- Data: —
- States: —
- Words: as above.
- Reachable: no.

### A-123 · Packages and the package editor (touchpoint)
- Where: templates C-06…C-12 (picker, apply one or several, save as package), C-16 / C-17 (package editor on this grid, `unstorableCells`).
- Entry: A-99.
- Does: several packages can be added to one quote in one step (templates C-09); every package adds to the **open** quote only. The package editor in Accounts renders this same grid with the cells a package can't store hidden (ref override, highlight, and — for platform packages — the line panel).
- Rules: see templates C-17.
- Data: `studio_assemblies`.
- States: —
- Words: —
- Reachable: yes.

### A-124 · Version history from the editor (touchpoint)
- Where: `QDD:6739-6756`, `9938-9950`, `4234-4247`; `src/components/leads/quote-version-drawer.tsx`; `src/app/api/quotes/versions/route.ts`; hook `useQuoteVersions(leadId)` (`src/lib/queries/leads.ts:1257-1290`). Hand-off C (versions, compare, restore semantics).
- Entry: header *"Version history"* (badge `v{n}`; not VO; `md+`).
- Does: opens the version drawer; restoring a version replaces the editor's lines with the snapshot (not undoable) and marks the quote dirty so the autosave writes it.
- Rules: versions are listed and created **per lead** (no quote id is sent), so a lead with several quotes shares one history. The editor writes a version only from the close prompt's *"Save as Draft"* / *"Keep draft"* (explicit, bypassing the 30 s throttle); nothing else in `src` creates one. A restore on a read-only quote changes the screen but is not saved.
- Data: `quote_versions` (templates D-07).
- States: —
- Words: title `Version history (v{n})`.
- Reachable: yes.

---

## Docs vs code discrepancies

### A-125 · `docs/rules/leads.md` vs the editor
- Where: `docs/rules/leads.md:347-357` (§ Quote Digitizer Dialog), `466-487` (§ Line-Item Comments), `380-381`, `838-846`, `941-944`.
- Entry: n/a (documentation and code review).
- Does: the doc describes a *"Two-panel dialog (max-w-5xl, 85vh)"* with a 40 % left upload / insights pane and a 60 % table of *"Description, Category, Unit Price, Qty, Unit, Total, Margin %, AI badge"*, AI suggestion names *"Under-quoted"* / *"Upsell opportunity"* / *"Missing item"*, a footer *"Total, Save as Draft, Submit for Review, Export & Send"*, and two access points. Code: a full-screen dialog (340 px sidebar · Items / Layout tabs with a live preview split · right drawer), the column set of A-29 (*"Markup %"*, Category optional and off, no AI column — chips under the description), labels *"Under-quoted"*, *"Thin Margin"*, *"Upsell"*, *"Missing"*, *"Client Mismatch"*, a footer *"Cancel"* · *"Download PDF"* · *"Submit for Review"* / *"Approve"* (no *Save as Draft*, no *Export & Send*), and six ways in (A-01).
- Rules: comments — the doc locks comments only for `approved`; the UI hides the comment form for every read-only status. *"the `/tools/quote-digitizer` page hard-fails without a primary quote (it never mints)"* — its submit / approve / reject do, but its autosave mints a primary quote server-side (A-15). *"The per-row pencil still opens the panel for … pricing tiers"* — the line panel has no tier editor (A-119). *"Column visibility persists per user"* — per browser (A-30).
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### A-126 · Feature spec and TODO (`docs/features/quote-digitiser/`, 2026-02) vs code
- Where: `spec.md:1-434`, `TODO.md:1-103`.
- Entry: n/a (documentation and code review).
- Does: the spec is from before the build and mostly superseded: parsing with *"Claude Vision API"* / `ANTHROPIC_API_KEY` / `maxTokens: 4000` (code: Gemini 2.5 Flash via OpenRouter, 32k → 65k tokens, retries, A-103); a *"Save as Draft"* / *"Submit for Review"* flow (no Save as Draft button); an error shape `{ error, code: "PARSE_FAILED" }` (no `code`); a section map with *"Decking"* → Decking and *"Glass"* → Glass (code: decking → *"Flooring"*, glass → *"Glass"*, plus *"Tiling"*, A-104); *"Phase 4 — Quote Templates (done)"* with a `quote_templates` table, dialog tabs *"Upload a Quote"* / *"From Template"*, a footer *"Save as Template"* that strips prices and a template section on the Tools page (none of this is current — templates C-28, C-35…C-40); a document preview in the left panel (now a metadata card only, A-105).
- Rules: TODO marks *"Drag-and-drop upload"* done (the handler is not wired, A-102) and lists *"Section re-ordering via drag handle"* as won't-do (it exists, A-94, A-75); *"Margin % editing — MarginCell"* is now the *Markup %* cell (A-41).
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### A-127 · Training script (`docs/demos/QUOTE-DIGITIZER-TRAINING-SCRIPT.md`) vs code
- Where: `QUOTE-DIGITIZER-TRAINING-SCRIPT.md:15-120`.
- Entry: n/a (documentation and code review).
- Does: Module 1 names drawer buttons *"Add Quote, Open Quote, Compare Quotes"* — only *"Add Quote"* exists (leads B-59). Module 2 lists four starts *"Upload"*, *"Describe"*, *"Pick a package"*, *"Blank"* and drags a PDF onto the Upload card — the entry screen offers the template shelf, Blank, Upload and Draft with AI (packages appear only inside a blank quote) and has no drag-and-drop. Module 3 says the left side *"kept the original"* — it shows parsed header facts only. Module 4 promises a per-row category and subcategory and an *optional* checkbox — the category column is optional and read-only, subsections are set in the panel or by headers, *Optional* lives only in the line panel. Module 5 *"click and drag to select a range"* — focused grid only, Shift+click / Shift+arrows, no drag marquee (A-87). Module 6 *"+ Add from Price Book"* — the button is *"Browse"*; *"set a margin percentage"* — the dial is *Markup %*.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### A-128 · Plans and specs vs code
- Where: `docs/superpowers/plans/2026-04-21-quote-digitizer-hardening.md`, `2026-05-08-quote-line-item-display-consistency.md`, `2026-05-22-quote-editor-fixes.md`, `2026-06-03-quote-hierarchy-section-subsection-plan.md`, `2026-04-19-chat-to-quote.md`, `2026-07-03-quote-entry-open-shelf.md` (+ report `docs/reports/2026-07-04-quote-entry-open-shelf-report.md`), `2026-07-07-quote-entry-card-actions.md`, `2026-08-06-quote-digitizer-inline-editing-round-off.md` + `docs/superpowers/specs/2026-08-06-quote-digitizer-inline-editing-round-off-design.md`; `docs/openmaison-v1-feature-requirements.csv:14-17, 51`.
- Entry: n/a (documentation and code review).
- Does: hardening — *DOMPurify* became `sanitize-html`; the upsert-by-id save *"behind a feature flag"* is unconditional; *"auto-hide columns with no useful data"* survives only for Qty / Unit on read-only quotes. Display consistency — the `name · ITEMID` pattern shows the SKU on a meta line, and the SKU column reads a missing key (A-42). Editor fixes — *per-quote* metadata landed on the **lead** (templates D-09). Hierarchy (2026-06-03) — first-class `quote_hierarchy_metadata`, cross-parent drag and plain-text notes were superseded a day later: sections derive from lines, subsections sort within their section only, notes are rich text (A-83). Inline editing spec — D5 *"Cost Price column stays hidden by default"* reversed (visible by default); §1.1's `dense` prop is `focusedGridActive`. Chat plan — the *Layout C* empty state gave way to the Open Shelf; *5–7 tools* became 6–8; the `source` union grew from 5 to 9 values. Open Shelf report — *"Click = instant apply"* was changed on 2026-07-07 to preview-on-click (templates C-35).
- Rules: CSV row 14 says a *"Previous Quote"* start doesn't exist anywhere — the drawer does offer *Clone* for a quote on the same lead (leads B-59). Row 15 says the chat's deterministic fallback runs with no API key and uses a *region-scaled* baseline — with no key the chat answers *"AI is not configured."*, and the skeleton carries no prices (A-114). Row 51 calls the VO editor slimmed of templates — the Add ▾ package entries and Starter Quote still show in VO mode (A-25).
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### A-129 · Copy and code comments that contradict the code
- Where: as listed.
- Entry: n/a (documentation and code review).
- Does: *"Use Save Draft below…"*, *"click Save Draft to retry"*, *"use Save Draft before closing"*, *"Try Save Draft manually"* — there is no Save Draft button, only the close prompt's (A-13). *"Use the Auto-Match button when you're ready."* — removed (A-108). *"This action cannot be undone."* on row / section delete — both are undoable (A-70). Discard's *"Saved versions are kept in version history."* — versions exist only if the close prompt's save was used (A-124). Line panel *"Cost and markup follow each other"*, Sell Price title *"The client-facing price. Editing cost or markup never changes it."*, Markup title *"Editing markup re-derives Unit Cost. Sell price holds."* — the code's markup edit recomputes the sell price from cost (`price-book-item-editor.tsx:375-383`; hand-off B). Price-book pick comment *"We only overwrite empty/zero fields"* — it overwrites whenever the book has a value (A-98). `subsection-row.tsx` *"Subsections are not sortable anywhere today"* — they are (A-81). `QuoteSourceBadge` documents 6 sources of 9. `skipStartChooser` and `isQuoteApprover` props are documented and passed but never read. `parseConfidence`'s amber indicator is documented, never built. Add Category's *"Also save to price book"* writes the category catalogue, not the price book. A save-dialog comment points at a *"More-Vertical menu"* that does not exist. The chat hero's template count counts design templates; the agent's template tool reads the legacy table (A-111, A-113).
- Rules: code wins in every case above.
- Data: —
- States: —
- Words: —
- Reachable: n/a.

### A-130 · Dead or unreachable code in this slice
- Where: as listed.
- Entry: n/a (documentation and code review).
- Does: in-editor quote comparison (A-122); manual *Auto-Match PB* + review panel (A-108); AI tier packages, their viewer and the `raw-insert` caller (A-116); `/api/quotes/import` (A-117); *"Create Custom Section"* dialog, `addSection`, Quick Add popover state (A-96); the section filter popover (state only, A-46); the drag-and-drop upload handler (A-102); the per-line `SubcategoryCombobox` (A-82); `SpreadsheetCell`'s inline rich-description branch (the row renders a textarea instead); custom columns (A-42); `canSubmitQuote`, `canApproveQuote`, `effectivePerms` (computed, unused); `showSavedBadge` (set, never rendered); props `skipStartChooser`, `isQuoteApprover`; `parseConfidence`; `ZoneOverlay` (dormant, A-21); the RPC cascade type `reparent_subcategory` (A-83).
- Rules: the legacy `quote_templates` table is dead as a UI surface (templates C-28) but still read by the chat agent (A-113).
- Data: —
- States: —
- Words: —
- Reachable: no.

### A-131 · Tests that pin this slice
- Where: `src/__tests__/`.
- Entry: n/a (documentation and code review).
- Does: frame and saving — `idl-uat-a2-close-confirm`, `quote-digitizer-finalized-close`, `quote-digitizer-discard-race`, `quote-discard-deletes-before-saving`, `quote-discard-footer-trash`, `quote-digitizer-remount-key`, `quote-url-mirror-race`, `quote-digitizer-save`, `quote-metadata-fresh-merge-base`, `quote-digitizer-layout-tab-strip`, `quote-digitizer-memoization`; grid and cells — `quote-digitizer-row`, `quote-row-margin-cell`, `quote-cluster-b`, `quote-column-prefs`, `build-grid-render-entries`, `focused-grid-{overlay,write,clipboard,fill,columns,coords}`, `quote-reorder`, `quote-numbering`, `quote-amount-marker`, `quote-content-block-xss`, `quote-line-item-highlight`, `quote-line-highlight*`, `quote-row-highlight-badge-contrast`, `line-item-comments`; sections — `category-order`, `category-order-parity` (incl. the `it.fails` known gap), `idl-uat-r3-category-rename`, `idl-c5-subsection-reorder`, `quote-hierarchy-*`, `quotes-hierarchy-scoped-api`; line panel — `h2-per-line-vendor-pick`, `h2-multi-vendor`, `vendor-picker-adoption`, `unit-cost-label`; getting lines in — `quote-utils`, `quote-chat`, `quote-chat-panel-{mount-stability,persistence,status}`, `quote-agent*` (patches, registry, guardrails, fallback, source contract, search cascade, price verification, web search, embeddings, row animation), `quote-template-entry-points`, `quote-empty-state-actions`, `quote-entry-cards`, `audit-fix-a11-generate-packages-tenant-check`.
- Rules: a grep of `src/__tests__` found no test that drives a Sections-panel rename against the open editor's lines, the panel grid's Tab order (`focusCell` / `EDITABLE_COLS`), or the fields the line panel's save drops.
- Data: —
- States: —
- Words: —
- Reachable: n/a.

---

## Uncertain / not verified

- **Sections-panel rename vs the open editor (A-76).** The RPC renames the lines in the database, but the editor re-seeds its in-memory lines only on open (or when empty), so after a panel rename the grid still holds the old section name — and the next autosave (upsert by id) would write the old name back. Inferred from `QDD:2696-2806` and the absence of any line update in `onSectionRenamed`; not run in a browser.
- **Lines with a blank section (A-28, A-96).** `resolveCategoryOrder` skips empty names, so a line saved without a section (e.g. from the focused grid's *"Add item"* when no category is picked in the panel) would not render in the grid while still counting in totals. Inferred; the server stores `category: null` for blank.
- **`#` values out of on-screen order (A-32).** Refs are computed over a list ordered by the studio catalogue's subsection order, while the grid displays subsections in first-appearance / declared order; when those orders differ, the numbers on screen may read out of sequence. Inferred from `QDD:5942-5979` vs `build-grid-render-entries.ts`.
- **Qty drag-fill and Duplicate positions (A-37, A-69).** Both use positions in the stored line array (fill range from `ctx.items`; duplicate spliced at the row's on-screen index), which differ from the on-screen order whenever the section order differs from the array order. Effect not observed.
- **Panel-grid Tab order (A-85).** Inputs carry `data-col` 0, 3, 4, 6, 7; Tab targets `col + 1`, so Tab from the name (→ 1) or from Qty (→ 5) finds no input and focus does not move; `data-row` is the on-screen index. Read from code only.
- **Redo shortcut (A-91).** The hook checks `e.key === "z"` together with Shift; most browsers report `"Z"` when Shift is held, so Cmd/Ctrl+Shift+Z may never fire (the ↷ button works). Not tested.
- **Undo and ids / comments (A-91).** Undo restores whole-array snapshots — ids and comment arrays included. After an autosave has swapped temp ids for DB ids, an undo can bring temp ids back (the next save deletes and re-inserts those rows), and because the save takes each line's comments from the payload, an undo could overwrite comments added after the snapshot. Inferred from `trackEdit` + `toDbRow`; not exercised.
- **Ask AI on read-only quotes (A-111, A-115).** The *"Ask AI"* button has no read-only gate; on `submitted` / `approved` quotes a turn changes the grid locally and is not saved, on `sent_for_signature` / `client_signed` the save is refused (409). Inferred.
- **Grid removal of a declared subsection (A-78, A-79).** Removing a subsection in the grid drops it from the session list, but the lead's `subsectionOrder` still declares it, and the grid re-merges declared names whenever that metadata object changes — so it may reappear later in the session or on reopen. Inferred.
- **Comments on unsaved lines.** The comment API addresses a line by its DB id; a line still carrying a temp id (before the first autosave) presumably can't take a comment until saved. Route read via leads B-61 only.
- **Feature-flag defaults.** `canvaEditor` (default on) is taken from templates C-36; `lockQuoteActionsUntilApproved` defaults off (`?? false`); `priceBookSubcategoryInQuote` defaults on; whether the `tools/quote-digitizer` page key is on by default for a new studio depends on platform config not read here.
- **Server routes on the service role.** `/api/quotes/parse`, `auto-match`, `insights`, `upload-image`, `chat`, `import` use the session cookie plus a service-role client with explicit studio filters rather than `scopedSupabase`; tenant safety there rests on those filters. Read, not probed.
- **Read only as touchpoints.** The lead drawer's submit / approve / reject / revise orchestration (`lead-detail-drawer.tsx:2900-3245`), the VO host's approval routing, the discount drawer, margin panel, round-off dialog, price-book modal, issuing-entity switch (leads B-64), payment schedule, version drawer, share menu, canva Layout tab and the legacy `quote-document-editor.tsx` (≈ 7,700 lines, sampled only for the slash menu, FreeBlock, ZoneOverlay and cross-context drag) were not inventoried in depth — hand-offs B, C and templates.
- **Plans read for goals and decisions, not line by line.** The eight plan files in the brief (≈ 13,000 lines) were read for their goals, task lists and locked decisions and compared with the code; individual code snippets inside them were not checked.
- **The SKU column (A-42)** reads `item.sku`; the transformer never sets that key (it maps `item_id` → `itemId`), so the column should always be blank — confirmed by reading `src/lib/transformers.ts:858-919`, not on screen.
