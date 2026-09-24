# OpenMaison 1.0 — Quote template module inventory · Slice B: Canva mode — blocks, slots, reference templates, the per-quote layout editor and the renderers

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-24.

Conventions: *Words* are quoted verbatim from code. "Hand-off" = owned by another reader (A document template editor / C content templates / D data) and only named here.

**Vocabulary**

- **block** — one typed unit of a quote document (`QuoteCanvaBlock { id, type, props }`), registered once through `registerBlockSchema` (`src/lib/quote-canva/block-schema.ts:443`); its one `render(props, ctx)` is used by the editor canvas and by the server HTML alike.
- **slot** — a block's position inside a zone; the editor calls a block-in-place a slot (`src/lib/quote-canva/slot-actions.ts`).
- **zone** — `BlockCategory` = `"header" | "body" | "footer"`; `allowedZones` on a schema says where a block may live (`block-schema.ts:413`).
- **knob** — one editable prop, addressed by a dot-path (`KnobPath`) with a `KnobSchema` kind (`block-schema.ts:298`, `342`). Reader A owns the catalogue and editing rules; this slice records what each knob does at render.
- **overridability** — `template.overridability[path] === true` lets a per-quote value replace the template's (`block-schema.ts:559` body field; `resolve-props.ts:48`).
- **override** — a per-quote knob value: `canvaOverrides[blockId][knobPath]` (`BlockOverridesByQuote`, `block-schema.ts:531`).
- **reference template** — one of three hard-coded starter bodies `TEMPLATE_DYEL` / `TEMPLATE_IDL` / `TEMPLATE_FLO` (`src/lib/quote-canva/reference-templates.ts:49, 264, 502`).
- **body** — `QuoteCanvaTemplateBody { schemaVersion: 2, blocks, globalStyles, pageRules, overridability }` (`block-schema.ts:559`).
- **page rules** — paper size, margins, background, watermark, page indicator, letterhead inset, running header / footer ids (`PageRules`, `block-schema.ts:534`).
- **layout version** — there is none for a quote's layout: the persisted body is overwritten in place (see B-08). Document template versions are a hand-off (A / D).
- **render hash** — `hashQuoteRenderInputs` over every render-affecting input; the share link's ETag and "Quote updated" signal (`src/lib/quote-canva/quote-render-hash.ts:97`).
- **canonical PDF** — the one stored object `shared-quotes/{studioId}/{quoteId}.pdf`, written by the digitizer and served by every reader (`src/lib/quote-canva/shared-quote-pdf.ts:24-26`).
- **share token** — `quotes.preview_token`, the secret in `/quote/[token]`; a per-token HMAC cookie `quote_view_session_<first 16 chars>` marks an OTP-verified visitor (`src/app/api/quote/[token]/route.ts:8`).
- **signature slot** — an invisible PDF Link annotation `om-sigslot:prepared_by` / `om-sigslot:client` that the overlay finds to stamp a signature image (`src/lib/quote-canva/overlay-signature.ts:12, 63`).

---

## Layout model & versions

### B-01 · Block registry and the block record
- Where: `src/lib/quote-canva/block-schema.ts:413-470` (`QuoteBlockSchema`, `registerBlockSchema`, `getBlockSchema`, `allowedZonesOf` at 433-436); `src/components/leads/quote-canva/blocks/index.ts` (the 23 registrations, imported for their side effect by every renderer and the editor: `import "@/components/leads/quote-canva/blocks"`).
- Entry: none directly — the module registry is populated at import.
- Does: a schema declares `type`, `displayName`, `category` (its default zone), `icon`, `defaultProps`, `render`, `propPanelSchema` (groups of `KnobDef`), and the capability flags `allowedZones`, `singleton`, `allowedInPricingTableGap`, `getContentSummary`, `actions { duplicate, delete, confirmDelete }`, `isFlowOnly`, `isPaged`. Registering the same `type` twice replaces the earlier entry (module-level `Map`).
- Rules: `allowedZonesOf(schema) = schema.allowedZones ?? [schema.category]`; `getBlockSchema(type)` returns `undefined` for an unknown type, and the editor then shows a red notice (B-49) while the renderer skips the block (B-67).
- Data: none persisted; the block record persisted inside a body is `{ id: string, type: string, props: Record<string, unknown> }`.
- States: unknown type → *"Block type `<type>` has no registered schema."* in the property panel.
- Words: as above.
- Reachable: yes (foundation of every surface below).

### B-02 · Knob schema kinds and knob definitions
- Where: `block-schema.ts:298-365` (`KnobSchema`, `KnobDef`, `visibleWhen` at 363), `getKnobValue` 473, `setKnobValue` 486.
- Entry: property panel (B-49); reader A owns the catalogue.
- Does: kinds are `text`, `textarea`, `richText`, `number` (`min` / `max` / `step`), `boolean`, `color`, `select` (`options[{value,label}]`), `image` (`assetType` `"logo" | "badge" | "signature" | "document_image"`), `hidden`, and `array` (an `itemSchema` of fields; a primitive array uses the single field key `"$value"`). A `KnobDef` = `{ path, schema, overridableByDefault, group?: "Group/Cluster", visibleWhen?(props) }`.
- Rules: `visibleWhen` is panel-only and must never change a render (the tests `quote-canva-block-capabilities` assert render output is independent of it). `getKnobValue` walks the dot-path and returns `undefined` when a segment is missing; `setKnobValue` returns a new props object (immutable) and creates intermediate objects. A `$`-prefixed key is humanised without the `$` (`humanizeKey`, `PropertyPanel.tsx:1118-1126`).
- Data: props JSON only.
- States: —
- Words: knob labels are per block (B-13…B-36).
- Reachable: yes.

### B-03 · The template body and page rules
- Where: `block-schema.ts:534-565` (`PageRules`, `QuoteCanvaTemplateBody`); `reference-templates.ts` `A4_PAGE_RULES` (margin 18 mm on every side); `render-to-html.tsx:117` (`pageSize` override).
- Entry: the Document panel (B-50) edits `pageRules`; `globalStyles` is the legacy Phase-18 theme/layout object (hand-off A) that canva blocks read for fonts and the date format.
- Does: `PageRules { paperSize: "A4" | "Letter"; margin { top, right, bottom, left } (mm); background? { color?, imageUrl?, opacity? }; watermark? { text, opacity, rotation }; pageIndicator? { placement: "top-right" | "bottom-center" | "hidden"; format }; headerTopInsetMm?; runningHeader? { blockId, fromPage }; runningFooter? { blockId, fromPage } }`.
- Rules: `schemaVersion` is always `2`; `isCanvaBody` (B-06) is the guard every loader uses. `overridability` is a flat `Record<KnobPath, boolean>` shared by every block (a path, not a block+path) — the reference templates ship `{ text: true, body: true, "plainText.body": true }`.
- Data: stored whole as JSON in `leads.quote_metadata.canvaBlocks` (per quote) and `studio_document_templates.body_json` (studio default; hand-off D).
- States: —
- Words: —
- Reachable: yes.

### B-04 · Props resolution: defaults → template → per-quote override
- Where: `src/lib/quote-canva/resolve-props.ts:37-80` (`effectiveBlockProps`, `resolveBlockProps`); consumed by `QuoteBlock.tsx` (canvas + HTML) and `PropertyPanelHost` (`CanvaEditor.tsx:1139`).
- Entry: every render.
- Does: `effectiveBlockProps(block)` = deep-merge of the schema's `defaultProps` under `block.props`. `resolveBlockProps(block, template, overrides)` then applies `overrides[block.id][path]` for each path **only where** `template.overridability[path] === true`.
- Rules: arrays replace wholesale (no element merge); an override on a non-overridable path is silently ignored; missing schema → `block.props` as-is. The property panel resolves the same chain so the panel value equals the canvas value (the comment at `CanvaEditor.tsx:1100-1103` records the earlier bug where it did not).
- Data: `canvaOverrides` JSON (B-07).
- States: —
- Words: —
- Reachable: yes.

### B-05 · Body resolution ladder (`resolveCanvaBody`)
- Where: `src/lib/quote-canva/compose-quote-body.ts:198-263` (`ResolveCanvaBodySources`, `resolveCanvaBody`); `strictCanvaBody` input at 66 / 313.
- Entry: every server render, the signing preview, the digitizer's hydration (B-07).
- Does: in order — (1) the quote's persisted `quote_metadata.canvaBlocks` when `isCanvaBody`; (2) when `strict` → `null`; else (3) `migrateSectionsToCanvaBody(quotes.doc_sections)` when sections exist; (4) the studio's default `studio_document_templates` row (type `quote_pdf`, `is_default`) `body_json` when it is a canva body; (5) `TEMPLATE_DYEL`.
- Rules: returns `null` whenever the `canva_editor` feature is off (the caller then takes the legacy `@react-pdf` path, B-79 PATH 2). Server renders, the bake and signing pass `strictCanvaBody: true` (`render-quote-pdf-server.ts:733`, `sign/[token]/preview-pdf/route.ts:542`) so a quote with no persisted body never prints a guessed default — the 2026-07-31 "blue design" regression guard in the file's comments.
- Data: reads `leads.quote_metadata.canvaBlocks`, `quotes.doc_sections`, `studio_document_templates.body_json`, `studios.settings.features.canva_editor`.
- States: `null` → legacy renderer.
- Words: —
- Reachable: yes.

### B-06 · Legacy sections → canva body migration
- Where: `src/lib/quote-canva/migrate.ts:51-57` (`COLLAPSE_TO_FIRST`), `63` (`collapseDuplicateBlocks`), `126` (`migrateSectionsToCanvaBody`), `359` (`isCanvaBody`).
- Entry: rung 3 of B-05; the digitizer on open when `canvaBlocks` is empty.
- Does: maps each legacy `doc_sections` entry to a block; then safety nets add what a document must have — a header of four blocks (logo · doc-title · meta-kv · header-divider), one `pricing-table`, a `footer-band` carrying `{studio_name}`, a `gst-line`.
- Rules: `COLLAPSE_TO_FIRST = { pricing-table, logo, doc-title, meta-kv, header-divider }` — only the first occurrence of these types survives; any schema-`singleton` type collapses too (`migrate.ts:77-80`). `isCanvaBody(x)` = object with `schemaVersion === 2` and an array `blocks`.
- Data: `quotes.doc_sections` in, body JSON out (not persisted until the editor writes).
- States: no sections → the four-block header + pricing table + footer + gst (the "Minimal starter").
- Words: —
- Reachable: yes.

### B-07 · Where a quote's layout lives and how it loads
- Where: `src/types/app.ts:42-127` (`QuoteMetadata`: `gstEnabled`, `docDiscount`, `layoutOverrides`, `categoryOrder`, `sectionDescriptions`, `subsectionDescriptions`, `subsectionTotalLabels`, `subsectionOrder`, `themeOverrides`, `canvaBlocks`, `canvaOverrides`); `src/types/database.ts:64-77` (same on the DB row); digitizer hydration `quote-digitizer-dialog.tsx:4290` (`if (studioFeatures?.canvaEditor && isCanvaBody(asCanvaCandidate(tpl)))`), snapshot restore 4466-4467, writes 5057 (`canvaBlocks: canvaTemplate`) and 5106 (`canvaOverrides: canvaOverrides`).
- Entry: opening the digitizer for a lead; every edit in the Layout tab.
- Does: the digitizer hydrates `canvaTemplate` from `leads.quote_metadata.canvaBlocks` (else B-06), holds `canvaOverrides` beside it, and writes both back (debounced) through the lead mutation PATCH with the rest of `quote_metadata` spread through.
- Rules: `canvaBlocks` lives on the **lead**, not the quote (`leads.quote_metadata`, migration `171_lead_quote_metadata.sql` per the type's doc comment) — every quote of a lead shares one layout. Writers spread the previous object so unrelated keys survive. `layoutOverrides` is Phase 18's legacy per-quote knob map and is written `null` by the canva path (`CanvaEditorHost.tsx:232`).
- Data: `leads.quote_metadata` JSONB. Column names and migrations are hand-off D.
- States: `null` / undefined = "no Quote Designer edits yet".
- Words: —
- Reachable: yes.

### B-08 · Layout versions — none
- Where: `docs/superpowers/plans/HANDOFF-2026-06-02-canva-mode.md` (P5.7 `studio_document_templates_history` listed as planned); no table, migration or route for it exists; `CanvaEditorHost.tsx` keeps an in-memory undo history only (B-48).
- Entry: —
- Does: a quote's body is overwritten in place; the only recovery paths are Undo within the session (B-47 / B-48), "Apply a design template" (B-52), or the per-knob Reset (B-49).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: no (dead / never built).

---

## Slots

### B-09 · Zones and where a block may live
- Where: `block-schema.ts:413-436`; `slot-actions.ts:153` (`isAllowedInZone`); `SlotTree.tsx:134-138` (zone labels), `189-205` (drop gating).
- Entry: slot tree drag, insert.
- Does: three zones `header` · `body` · `footer`. The renderer groups blocks by their schema `category` (not by position) — `SlotTree.tsx:253-255` notes a block whose category is `body` "naturally lands in the body zone".
- Rules: allowed zones per block are in B-13…B-36; a drop onto a zone header (`zone:<id>`) or onto a slot in another zone is refused when `isAllowedInZone` is false; within-zone reorder always works.
- Data: block order in `blocks[]`.
- States: —
- Words: *"Header"*, *"Body"*, *"Footer"*.
- Reachable: yes.

### B-10 · Slot actions (duplicate · delete · restore · move · insert)
- Where: `src/lib/quote-canva/slot-actions.ts:43` (`duplicateSlotInDoc`), `95` (`deleteSlotInDoc`), `112` (`restoreSlotInDoc`), `123` (`moveSlotInDoc`), `141` (`insertSlotAt`), `162` (`findSlotWithSchema`).
- Entry: the block's hover toolbar and the slot tree (B-43 / B-44).
- Does: pure transforms on a body. Duplicate copies the block with a fresh id directly after the source; delete removes and returns `{ doc, removed, index }` for restore; restore re-inserts at the recorded index (clamped); move reorders within `blocks[]`; insert places after a given block id or at the end.
- Rules: duplicate is refused for a `singleton` schema and when `actions.duplicate === false`; delete is refused when `actions.delete === false`; `confirmDelete(block)` may demand a confirm (the pricing table asks, see B-18).
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-11 · Inter-section gaps (blocks between pricing-table sections)
- Where: `src/lib/quote-canva/inter-section-actions.ts:48-460` (`findBlockAnywhere`, `updateBlockAnywhere`, `deleteBlockAnywhere`, `moveBlockToGap`, `moveBlockOutOfGap`, `reorderWithinGap`, `renameGapCategory`, `deleteGapCategory`, `parseGapDroppableId`, `resolveInterSectionDrop`, `applyInterSectionDrop`, `renameGapCategoryAllTables`, `deleteGapCategoryAllTables`); `GAP_DROPPABLE_PREFIX = "pricing-table-gap-"`; gap id `${pricingTableId}::${category}`.
- Entry: dragging a block onto the gap under a section band in the canvas / slot tree.
- Does: a pricing table's props carry `interSectionBlocks: Record<category, QuoteCanvaBlock[]>`; a block dropped into a gap leaves `blocks[]` and lives inside the table's props, rendered after that section's rows. Renaming or deleting a category (line-item side) renames / deletes its gap across every table.
- Rules: a block is allowed in a gap only when its schema does not set `allowedInPricingTableGap: false` (cover-page, pricing-table, payment-milestones refuse); `findBlockAnywhere` searches top-level and every gap so selection and knob edits work in both places.
- Data: `pricing-table.props.interSectionBlocks`.
- States: —
- Words: —
- Reachable: yes (the drop targets exist in `CanvaCanvas`).

### B-12 · Singletons and duplicate collapse
- Where: `block-schema.ts:419`; `migrate.ts:63-90`; per-block flags in B-13…B-36.
- Entry: load (B-06), insert (B-45).
- Does: a `singleton` type may appear once per document; the insert picker hides it once present; loading collapses extra copies to the first.
- Rules: singletons = bank-details, cover-page, footer-band, gst-line, page-indicator, payment-milestones, paynow-qr, running-header, signature-footer. Non-singleton but collapsed on load = pricing-table, logo, doc-title, meta-kv, header-divider (`COLLAPSE_TO_FIRST`).
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## Blocks (one row each)

### B-13 · `logo`
- Where: `src/components/leads/quote-canva/blocks/logo.tsx:326-370` (registration), DEFAULTS at 105.
- Entry: header of every reference template; insertable? no — not in `INSERTABLES` (B-45); present through templates / migration.
- Does: prints the studio or issuing entity's logo in one of three `variant`s — `"standalone"` (image + optional tagline), `"stack"` (image beside company name / registration / address, each toggled by `stack.companyName` / `registration` / `address`), `"wordmark"` (text wordmark `wordmark.text`, tagline, optional right-aligned registration `regNumberRight` with `regNumberPrefix` default `"Co. Reg. No: "`).
- Rules: `imageUrl: null` → the letterhead's logo from the resolved branding (B-62); `useBrandingTagline` swaps `tagline` for the branding tagline (`resolveFooterTagline`, `footer/branding-fallbacks.ts:233`); `widthPt` default 80; `alignment` `left`; `repeatOnEveryPage` (default false) puts the block into the letterhead band that prints on every page (B-68) and stamps `data-repeats-on-every-page` on the element.
- Data: `ctx.studioBranding.logoUrl / companyName / companyRegistration / companyAddress`.
- States: no logo and `standalone` → renders nothing visible (empty box in the editor).
- Words: knob *"Repeat on every page"* — *"Print this logo as a letterhead at the top of every page."*; group *"Logo"*.
- Allowed zones: `["header", "footer"]`; singleton no (collapsed on load, B-12); prints on every page when `repeatOnEveryPage`.
- Reachable: yes.

### B-14 · `doc-title`
- Where: `blocks/doc-title.tsx:105-135`, DEFAULTS 40.
- Entry: templates / migration (not insertable).
- Does: the document heading. Props `text` (default `"Quotation"`, tokens substituted), `alignment`, `bold` true, `underline` true, `italic` false, `case: "as-is" | "UPPER" | "Title"`, `sizePt` 16, `color`, `fontFamily` default `"Helvetica, Arial, sans-serif"`, `marginTopPt` / `marginBottomPt` 12, `repeatOnEveryPage` false.
- Rules: `fontFamily` `""` inherits the template's; `case` applied after token substitution.
- Data: tokens (B-60).
- States: empty text → empty heading.
- Words: *"Document Title"*; knob *"Repeat on every page"* — *"Print this block as part of the letterhead at the top of every page."*
- Allowed zones: `["header", "body"]`; singleton no (collapsed on load); prints on every page when flagged.
- Reachable: yes.

### B-15 · `intro-text`
- Where: `blocks/intro-text.tsx:79-120`, DEFAULTS 49; CSS scope `.quote-canva-block--intro-text` in `src/lib/quote-canva/rich-text-content-css.ts`.
- Entry: insertable as *"Text"* (B-45).
- Does: rich-text prose. `body` HTML (default `"<p>We are pleased to submit the following quotation for your kind consideration.</p>"`), `alignment`, `sizePt` 10, `color`, `fontFamily`, `lineHeight` 1.5, margins 12, `repeatOnEveryPage`, `keepOnOnePage`, `keepWithNext`.
- Rules: tokens substituted in the HTML; the HTML is sanitised through the studio allow-list (`src/lib/sanitize-line-item-html.ts`); paragraph / `<hr>` / list spacing are declared explicitly (`p { margin-block: 1em }`, hr `margin-block: 0.5em`, `border-style: inset`, `list-style: disc outside`) so the in-app canvas matches the print (test `quote-canva-intro-text-and-pagination`). `keepWithNext` binds the block to the next in one `quote-keep-together` wrapper; `keepOnOnePage` wraps it alone (B-74).
- Data: —
- States: —
- Words: *"Intro Text"*; picker *"Text"* — *"Rich text — intro, scope notes, closing remarks"*.
- Allowed zones: `["body"]`; singleton no; every page when flagged.
- Reachable: yes.

### B-16 · `divider`
- Where: `blocks/divider.tsx:43-70`, DEFAULTS at ~30.
- Entry: insertable *"Divider"*.
- Does: a horizontal rule. `style: "solid" | "dashed" | "dotted"` (default solid), `color` `#CCCCCC`, `weightPt` 1, `spacingPt` 8 (above and below).
- Rules: none.
- Data: —
- States: —
- Words: *"Divider"* — *"Horizontal rule between sections"*.
- Allowed zones: `["body", "header", "footer"]`; singleton no; not repeating.
- Reachable: yes.

### B-17 · `spacer`
- Where: `blocks/spacer.tsx:34-60`.
- Entry: insertable *"Spacer"*.
- Does: vertical whitespace `heightPt` (default 20); `pageBreakBefore` (default false) forces a page break before it.
- Rules: —
- Data: —
- States: —
- Words: *"Spacer"* — *"Vertical whitespace — optional page break"*.
- Allowed zones: `["body", "header", "footer"]`; singleton no.
- Reachable: yes.

### B-18 · `pricing-table`
- Where: `blocks/pricing-table.tsx` (2138 lines): `PRICING_TABLE_DEFAULTS` ~510, `renderItemRow`, `renderTotalsRows`, `sectionMarkerFor` / `parseSectionOverrides` / `resolveSectionMarkers`, the header row `data-repeat-header` at 873, `PROP_PANEL` tabs at 1834-2110, registration 2114-2138; helpers in `src/lib/quote-canva/pricing/*` (`numbering.ts`, `section-styles.ts`, `parts.ts`, `non-numeric.ts`, `optional-rendering.ts`, `group-subtotal.ts`, `studio-marker-vocabulary.ts`, `subsection-total-label.ts`) and `src/lib/quote-canva/hierarchy/*`.
- Entry: every template; not insertable (a document has one; the load collapses extras).
- Does: prints the line items grouped by `category` → `subcategory` with section bands, optional per-section descriptions, item rows (number · description (+ `renderItemDescription`, B-36) · qty · unit · rate · optional price · amount), per-section subtotals, and the totals block (subtotal · document discount · tax · grand total). Variation-order quotes render omission lanes (negative lines) and a contract-before / after reconciliation.
- Rules (the ones that change what prints):
  - Columns toggled individually (tab *"Columns"*); header labels per column (tab *"Headers"*: `headers.ref / description / qty / unit / unitPrice / optionalPrice / total`, `case`, `bandEnabled`, `bandColor`, `bandTextColor`); `headers.repeatOnEveryPage` (overridable by default) reprints the header row on continuation pages through the repeat-header script (B-76).
  - Numbering (tab *"Numbering"*): modes `"continuous-letter-number"`, `"per-section-1n"`, `"per-subsection-1n"`, `"hierarchical-1.2a"`, `"section-letter-item-number"`, `"section-letter-subsection-1n"`, `"none"`; *"Pin section numbers"* keeps a section's number across reorders.
  - Sections (tab *"Sections"*): band style, per-section marker overrides (`sectionMarkerFor` reads the studio marker vocabulary), section descriptions from `ctx.categoryDescriptions` / `sectionDescriptions`, subsection total label override (`subsectionTotalLabels`, display only — items keep their prices and totals are unchanged).
  - Optional items (tab *"Optional"*): an `isOptional` line prints its price in the optional column (or as a marker) and is **excluded from every total**; VO omissions print with a sign and reduce totals.
  - Non-numeric amounts: `amountMarker` (e.g. "TBC", "FOC") prints in place of a number and contributes 0.
  - GST (tab *"GST"*: *"GST"* / *"Inclusive"*): tax line label = `ctx.taxLabel`; inclusive mode shows tax as included.
  - Totals (tab *"Totals"*): labels for subtotal / discount / tax / grand total, group subtotals (`group-subtotal.ts`).
  - Row highlight: `quote_line_items.highlight_color` (migration 297) paints the row; text is white when `relativeLuminance < 0.45` (`line-highlight.ts:97 readableForeground`, `HIGHLIGHT_FG_DARK "#1A1A1A"` / `HIGHLIGHT_FG_LIGHT "#FFFFFF"`).
  - Never prints cost or markup — the `RenderContext.items` shape has no cost field (B-98).
- Data: `ctx.items` (`QuoteLineItem[]` from `rawRowsToLineItems`, B-79), `ctx.currencySymbol`, `ctx.taxRate`, `ctx.taxLabel`, `ctx.docDiscount`, `ctx.categoryOrder` / `subsectionOrder` / `sectionDescriptions` / `subsectionDescriptions` / `subsectionTotalLabels`, `ctx.variationContext`.
- States: no items → the table prints only the header and zero totals (the share PDF refuses to render at all with 409, B-92).
- Words: `getContentSummary: "the priced line items table"` (used in the delete confirm); knob *"Repeat header row on every page"* — *"Reprints the column headers (No / Description / AMOUNT …) at the top of each page the table continues onto."*; groups *"Rows"*, *"Sections"*, *"Table & columns"* (cluster *"Header row"*), *"Totals"*.
- Allowed zones: `["body"]`; singleton no (collapsed on load); `allowedInPricingTableGap: false`; only the header row repeats.
- Reachable: yes. Line-item content, pricing and packages are the later Quotes audit — touchpoint only.

### B-19 · `subtitle-band`
- Where: `blocks/subtitle-band.tsx:88-120`, DEFAULTS ~70.
- Entry: insertable *"Subtitle band"*.
- Does: a full-width tinted band of text. `text` (tokens), `backgroundColor` `#E3F2FD`, `textColor` `#C8232C`, `fontSizePt` 11, `fontWeight` `"700"`, `italic`, `uppercase` true, `paddingYPt` 6, `alignment` center, `widthMode: "content-width" | "full-bleed"`, margins 4 / 8.
- Rules: empty `text` renders nothing.
- Data: tokens.
- Words: *"Subtitle band"* — *"Full-width tinted band (e.g. '(VERSION 3)')"*.
- Allowed zones: `["header", "body"]`; singleton no.
- Reachable: yes.

### B-20 · `meta-kv`
- Where: `blocks/meta-kv.tsx:218-260`, DEFAULTS 84; value sources `src/lib/quote-canva/header/value-source.ts:14-59`; rows editor `components/leads/quote-canva/meta-kv-rows-editor.tsx`; layout panel `document-info-layout-panel.tsx`.
- Entry: templates / migration (not insertable).
- Does: the header's key-value rows (Date · Attn · Phone · Ref by default). Props `layout: "stacked-tab" | "two-col" | "balanced"`, `emptyRow: "show-empty-label" | "hide-row" | "show-dash"`, `labelWidthPt` 70, `labelColor`, `valueColor`, `fontSizePt` 9.5, `rowGapPt` 2, `labelGapPt`, `balancedGapPt` 24, `repeatOnEveryPage`, `rows[{ id, label, valueSource, visible, custom? }]`, `dateFormat: "inherit" | QuoteDateFormat`.
- Rules: `valueSource` ∈ `client.name`, `client.phone`, `client.email`, `client.address`, `client.ic`, `client.customerId`, `lead.propertyType`, `studio.name`, `studio.address`, `studio.registration`, `quote.refNumber`, `quote.date`, `quote.preparedBy`, `quote.validUntil`, or a custom literal (tokens substituted). `quote.date` re-formats through `formatQuoteDate` only when `ctx.quoteDateISO` is present; `dateFormat: "inherit"` follows `globalStyles.dateFormat` (B-66). `getContentSummary` lists the visible labels.
- Data: `RenderContext` client / studio / quote fields (B-58).
- States: an empty value follows `emptyRow`.
- Words: *"Meta key-value"*; knob *"Repeat on every page"* (group *"Layout"*).
- Allowed zones: `["header", "body"]`; singleton no (collapsed on load); every page when flagged.
- Reachable: yes.

### B-21 · `page-indicator`
- Where: `blocks/page-indicator.tsx:84-115`, DEFAULTS ~30; CSS `src/lib/quote-canva/page-counter-css.ts:62-160`.
- Entry: templates (IDL / FLO); not insertable.
- Does: "Page n of m". `placement: "top-right" | "bottom-center" | "hidden"`, `format` default `"Page {n} of {m}"`, `fontSizePt` 9, `color` `#666666`, `italic`, `skipFirstPage` false.
- Rules: the editor shows `format` with `{n}` / `{m}` → `"1"` (`resolvePreviewLabel`); the print emits an `@page` margin-box `content: counter(page)` / `counter(pages)` from `formatToContentValue` (B-75). `skipFirstPage` is **not consumed** by `page-counter-css.ts` (see B-108).
- Data: —
- Words: *"Page indicator"*.
- Allowed zones: `["header", "footer"]`; singleton yes; prints on every page by nature (a margin box).
- Reachable: yes.

### B-22 · `header-divider`
- Where: `blocks/header-divider.tsx:62-90`, DEFAULTS 35.
- Entry: templates / migration.
- Does: the rule under the letterhead. `style`, `color` `""`, `weightPt` 0.75, margins 6 / 8, `useBrandAccent` true, `repeatOnEveryPage`.
- Rules: `useBrandAccent` or empty `color` → `ctx.brandColor`.
- Words: *"Header divider"*; knob *"Repeat on every page"* — *"Print this rule as part of the letterhead at the top of every page."*
- Allowed zones: `["header"]`; singleton no (collapsed on load); every page when flagged.
- Reachable: yes.

### B-23 · `running-header`
- Where: `blocks/running-header.tsx:89-120`, DEFAULTS ~40 (`resolveRunningHeader` exported).
- Entry: templates; not insertable.
- Does: a small line at the top of continuation pages. `content` default `"{studio_name} — Page {n}"`, `position: "top-left" | "top-center" | "top-right"`, `fontSizePt` 8.5, `color` `#888888`, `italic`, `bold`, `fromPage` 2, `underline`, `bottomRule`, `bottomRuleColor`.
- Rules: tokens substituted; `{n}` becomes the CSS page counter in print. `fromPage` is **not consumed** by the renderer (B-108) — the band prints wherever the repetition partition places it.
- Words: *"Running header"*.
- Allowed zones: `["header"]`; singleton yes.
- Reachable: yes.

### B-24 · `footer-band`
- Where: `blocks/footer-band.tsx:608-700`, DEFAULTS 201; social entries `src/lib/quote-canva/footer/footer-band-social.ts:58`; safety `footer/layout-safety.ts` (`clampWidthPt`, `SHRINKABLE_FLEX_CHILD`); fixes `FIXES-REPORT-IDL-FOOTER-ROUND2.md`.
- Entry: every template's footer; not insertable.
- Does: the page-bottom band in one of three `mode`s — `"plain-text"` (`plainText.body` tokens + `links[]` with `linkColor` `#5500FF` / `linkUnderline`, an optional `lineRule` with colour / weight / gap / `lineRuleHug` / `lineRuleWidth: "full" | "content"`), `"accreditation"` (`accreditation.badges[]`, `heightPt` 32, `gapPt` 12, caption), `"multicol"` (`multicol.columns[]` each with its own body / alignment, `gapPt` 16). Shared: `fontFamily`, `widthMode: "content-width" | "full-bleed"`, `backgroundColor`, `paddingYPt` 8, `paddingXPt`, `marginTopPt` 12, `repeatOnEveryPage`.
- Rules: `{studio_name}` etc. through tokens; social entries in the band come from branding when asked (`resolveFooterBandSocialEntries`); widths clamp to the page so a long entry shrinks instead of overflowing (round-2 fixes). When `repeatOnEveryPage` the band is lifted into the `@page` bottom margin and the margin is measured for it (B-73); the accreditation and multicol modes count as "heavy" (36 mm reserve vs 28 mm).
- Data: `ctx.studioBranding`, `ctx.studioName`, socials.
- Words: *"Footer band"*; knob *"Repeat on every page"* — *"Pin this footer band to the bottom of every page."* (group *"Band"*).
- Allowed zones: `["footer"]`; singleton yes; every page when flagged.
- Reachable: yes.

### B-25 · `social-row`
- Where: `blocks/social-row.tsx:196-240`, DEFAULTS ~150 (`SOCIAL_BRAND_COLORS`); `footer/social-icons.ts` (`SocialIconKind`, `getSocialIconSvg`, `buildSocialHref`), `footer/branding-fallbacks.ts` (`BRANDING_SOCIAL_KEYS`, `humanizeSocialValue`, `displaySocialValue`, `contactEntriesFromBranding`, `socialEntriesFromBranding`, `resolveSocialRowEntries`).
- Entry: templates; not insertable.
- Does: a row of social / contact icons with values. `layout: "horizontal" | "vertical"`, `iconStyle: "outline" | "filled" | "brand"`, `iconSizePt` 11, `iconColor`, `textColor`, `fontSizePt` 9, `gapPt` 8, `showLabel`, `alignment`, `entries[{ kind, value, label? }]`, `useBrandingLinks`, `useBrandingContacts`, `valueDisplay: "full" | "handle"`.
- Rules: explicit `entries` win; `useBrandingLinks` appends the branding's `socialLinks` (instagram, facebook, linkedin, whatsapp, tiktok, website…), `useBrandingContacts` appends phone / email / address; `"handle"` shows `@name` from a URL (`humanizeSocialValue`); `buildSocialHref` exists but no caller outside tests uses it (links are not clickable in print). `getContentSummary` lists the kinds.
- Words: *"Social row"*.
- Allowed zones: `["footer", "header"]`; singleton no.
- Reachable: yes.

### B-26 · `accreditation-strip`
- Where: `blocks/accreditation-strip.tsx:234-280`, DEFAULTS ~200 (`__splitIntoRows` exported for tests).
- Entry: insertable *"Accreditation badges"*.
- Does: a row (or rows) of trust badges. `source: "studio-curated" | "custom"`, `badges[{ id, imageUrl, alt }]`, `rows: "1" | "2" | "auto"`, `heightPt` 28, `gapPt` 12, `alignment` center, `caption` + size / colour / italic, margins 6.
- Rules: `"studio-curated"` reads the studio's uploaded badge assets (`studio_assets` type `badge`) plus platform ones; `"custom"` uses `badges[]`; badges split evenly across rows.
- Data: `ctx.studioBranding.accreditations` / studio assets.
- States: no badges → nothing.
- Words: *"Accreditation strip"*; picker *"Accreditation badges"* — *"Row of trust badges — your uploads from Branding & Comms plus any platform ones you've …"*.
- Allowed zones: `["footer", "body", "header"]`; singleton no.
- Reachable: yes.

### B-27 · `bank-details`
- Where: `blocks/bank-details.tsx:186-230`, DEFAULTS ~150; resolver `src/lib/quote-canva/resolve-entity-paynow-qr.ts` (`resolveIssuingBankDetails` per the round-3 report).
- Entry: DYEL template footer; not insertable.
- Does: bank transfer instructions. `title` `"Bank Transfer"`, `titleUppercase`, `autoTitleSG` true, body size / colour, `alignment`, `showTopRule` + colour, `showBankName` / `showAccountHolder` / `showAccountNumber` / `showSwiftCode`, labels `bankLabel` `""`, `holderLabel` `"A/C Name:"`, `accountLabel` `"A/C No:"`, `swiftLabel` `"SWIFT:"`, margins, `paddingTopPt` 12, `extraRows[{ label, value }]`.
- Rules: values come from the **issuing entity's** `bank_details` blob whole when the entity has one, else the studio's (`FIXES-REPORT-IDL-PAYNOW-ROUND3.md` "Known residual": an entity with only an account number prints no bank name — intentional). `autoTitleSG` swaps the title for the SG wording when `countryCode === "SG"`.
- Data: `ctx.studioBranding.bankDetails { bankName, accountHolder, accountNumber, swiftCode }`.
- States: no bank details → nothing.
- Words: *"Bank details"*.
- Allowed zones: `["footer"]`; singleton yes.
- Reachable: yes.

### B-28 · `paynow-qr`
- Where: `blocks/paynow-qr.tsx:101-130`, DEFAULTS ~80; resolver `resolve-entity-paynow-qr.ts:107` (`selectDefaultEntity`), `168` (`resolveIssuingCompanyId`), `189` (`resolveQuoteEntityBranding`).
- Entry: templates; not insertable.
- Does: a PayNow QR image with a label. `imageUrl` `""`, `label` `"Scan to PayNow"`, `sizePt` 70, `labelSizePt` 7.5, `labelColor`, `alignment` center, margins 8.
- Rules: empty `imageUrl` → `ctx.paynowQrUrl` resolved from the issuing entity: `leads.company_id` (or the signature request's frozen `company_id`) → else `selectDefaultEntity(rows)` = `is_default` active → first active (rows ordered `is_default desc, name asc`) → null; never an inactive entity. The same ladder serves the digitizer, the server render, `request-signature` and `sign/[token]` (round 3).
- Data: `studio_companies.paynow_qr_url`, `is_default`, `is_active`.
- States: no QR → nothing.
- Words: *"PayNow QR"*.
- Allowed zones: `["footer"]`; singleton yes.
- Reachable: yes.

### B-29 · `gst-line`
- Where: `blocks/gst-line.tsx:83-110`, DEFAULTS 41 (`resolveGstLine` exported).
- Entry: templates / migration safety net.
- Does: the tax registration line. `template` `"GST Reg. No: {value}"`, `autoTemplate` true, `fontSizePt` 8, `color` `#888888`, `italic`, `alignment`, margins 4 / 0, `repeatOnEveryPage` false.
- Rules: `autoTemplate` picks the region's wording (`ctx.countryCode`: SG "GST", MY "SST", AE "TRN", IN "GSTIN"); `{value}` = the issuing entity's registration; prints nothing when the entity is not GST-registered or the number is empty. The `repeatOnEveryPage` knob was removed from the panel but the prop is still honoured by the partition (B-68, B-108).
- Data: `ctx.gstRegistrationNumber` / entity `gst_registered`.
- Words: *"Tax Reg. line"*.
- Allowed zones: `["footer", "body"]`; singleton yes.
- Reachable: yes.

### B-30 · `signature-footer`
- Where: `blocks/signature-footer.tsx:387-440`, DEFAULTS 82; columns `src/lib/quote-canva/signature-footer-columns.ts`; fallback design `docs/superpowers/specs/2026-07-28-quote-signature-footer-fallback-design.md`.
- Entry: DYEL template; insertable *"Signature footer"*.
- Does: two or three signing columns. `layout: "two-col" | "three-col"`, `lineWidthPt` 180, `lineWeightPt` 0.5, `lineColor`, `headingGapPt` 6, `bodyGapPt` 2, margins 20 / 8, `keepOnOnePage`, `keepWithNext`, sizes 9, colours, `repeatOnEveryPage`, `leftColumn { id "left", heading "Prepared by", body ["{prepared_by}", "{studio_name}"], alignment }`, `rightColumn { id "right", heading "Accepted by", body ["{client_name}", "{client_phone}"] }` (+ `middleColumn` for three).
- Rules: each column renders an invisible link anchor `om-sigslot:prepared_by` / `om-sigslot:client` inside its signing box — the PDF overlay's target (B-83). A body line that resolves to `""` is dropped. When a document has **no** signature footer at all, the renderer appends a fallback one with id `__fallback-signature-footer` so signing always has slots (B-69). `keepOnOnePage` / `keepWithNext` as in B-15.
- Data: tokens.
- Words: *"Signature footer"*; picker — *"2 or 3 column signature block with rule + name/title"*; knob *"Repeat on every page"* — *"Print the signing columns at the bottom of every page (above the footer band)."* (group *"Layout"*).
- Allowed zones: `["footer"]`; singleton yes; every page when flagged (adds 18 mm to the bottom reserve).
- Reachable: yes.

### B-31 · `subject-line`
- Where: `blocks/subject-line.tsx:69-100`, DEFAULTS ~50.
- Entry: insertable *"Subject line"*.
- Does: a bold underlined statement. `text` default `"CONTRACT FOR RENOVATION AND CARPENTRY WORKS AT THE ABOVE PREMISES"`, `bold` true, `underline` true, `italic`, `uppercase` false, `sizePt` 11, `color`, `alignment`, margins 12 / 8, `fontFamily`.
- Rules: tokens substituted.
- Words: *"Subject line"* — *"Bold + underlined statement — e.g. contract header"*.
- Allowed zones: `["body", "header"]`; singleton no.
- Reachable: yes.

### B-32 · `image`
- Where: `blocks/image.tsx:86-120`, DEFAULTS 38.
- Entry: insertable *"Image"*.
- Does: an inline picture. `imageUrl` null, `alt`, `alignment`, `sizing: "fixed-width" | "fixed-height" | "natural"`, `widthPt` 200, `heightPt` 120, margins 8, `rounded`, `repeatOnEveryPage` (prop kept; knob removed from the panel — B-108).
- Rules: picked from `studio_assets` (type `document_image`) through the asset picker (B-55) or a pasted URL; the render route fetches remote assets with an 8 s timeout and a 6 MB cap (B-78).
- States: no URL → placeholder in the editor, nothing in print.
- Words: *"Image"* — *"Inline image — pick from your studio_assets uploads"*.
- Allowed zones: `["body", "header", "footer"]`; singleton no.
- Reachable: yes.

### B-33 · `cover-page`
- Where: `blocks/cover-page.tsx:261-300`, DEFAULTS ~200.
- Entry: insertable *"Cover page"*.
- Does: a full-page hero. `kicker` `"QUOTATION"`, `title` `"Renovation Proposal"`, `subtitle` `"Prepared for {client_name}"`, `alignment`, sizes 32 / 14 / 10, colours, `backgroundImageUrl`, `backgroundColor`, `backgroundDim` 0.35, `accentStrip: "none" | "top" | "bottom" | "left"` (default bottom), `accentColor` `""` (→ brand colour), `accentWidthPt` 4, rows `showClientRow` true / `showProjectRow` false / `showDateRow` true / `showPreparedByRow` true with labels `"Client"`, `"Project"`, `"Date"`, `"Prepared by"`, `kvSizePt` 10 + colours, `footerCaption` + colour / size, `pageBreakAfter` true.
- Rules: tokens in kicker / title / subtitle / caption; the date row uses `formatQuoteDate`; `pageBreakAfter` emits a forced break so the letterhead starts on page 2.
- Words: *"Cover page"* — *"Full-page hero — kicker, title, subtitle, client KV, optional background"*.
- Allowed zones: `["header", "body"]`; singleton yes; `allowedInPricingTableGap: false`.
- Reachable: yes.

### B-34 · `page-break`
- Where: `blocks/page-break.ts:25-50`; render `render-to-html.tsx:301-310`, CSS 574-583.
- Entry: not in `INSERTABLES`; inserted by the spacer's page-break drag / palette paths noted at `slot-actions.ts:139` (see Uncertain).
- Does: a zero-height marker `<div class="quote-page-break" data-block-id=…>` with `break-before: page`.
- Rules: terminates a keep-together run on both sides (B-74); has no knobs.
- Words: *"Page break"*.
- Allowed zones: `["body"]`; singleton no.
- Reachable: yes in render; insertion path uncertain.

### B-35 · `payment-milestones`
- Where: `blocks/payment-milestones.tsx:1-60` (rules), DEFAULTS 138-168, registration 531-600; amounts from `src/lib/finance/milestone-schedule.ts` (`computeMilestoneAmounts`, `toMilestoneAmount`, `formatPercentDisplay`, `FEE_FIRST_MILESTONES_ENABLED`).
- Entry: insertable *"Payment milestones"*.
- Does: the milestone table after the totals. `layout: "list" | "table"`, `title` `"Payment Milestones"`, `estCostsLabel` `"Est Costs"`, `percentLabel` `"Payment %"` (table only), `fixedLabel` `""` (e.g. "Design Fees" — replaces the percent for a fixed row), `borderColor`, `totalLabel` `"Total Quoted Sum"`, `showAmounts` true, `showOrdinal` true (`1st / 2nd …`; `prefixStyle` alternative), sizes 9.5, colours, `showRules`, `rowGapPt` 6, margins 16 / 8, `footnote` + size / colour / gap, `showTotal` true, `rowTemplate` `""` (tokens `{name} {percent} {trigger} {amount}`).
- Rules: a `type: "fixed"` row keeps its `amountCents`; the `percent` rows split what is left of the grand total, the last percent row absorbing the rounding remainder; the % column shows each row's effective share. The grand total is the pricing table's subtotal + tax. Percent display honours the `fee_first_milestones` kill switch (`ctx.feeFirstMilestonesEnabled ?? FEE_FIRST_MILESTONES_ENABLED`) — amounts never change with the flag. No milestones → renders nothing.
- Data: `ctx.paymentMilestones[{ id, name, type, percent, amountCents, trigger }]` (B-63).
- Words: *"Payment Milestones"*; knobs *"Layout"* (*"List (flowing rows)"* / *"Table (bordered grid)"*), *"Title"*, *"Amount column header"*, *"Percent column header (table layout)"*, *"Fixed-milestone label"* (placeholder *"e.g. Design Fees"*), *"Border color (table layout)"*, *"Total row label"*, *"Show amount column"* — *"Per-milestone amount — a fixed row's declared amount, or its share of the grand total"*, *"Prefix rows with 1st / 2nd …"*.
- Allowed zones: `["body", "footer"]`; singleton yes; `allowedInPricingTableGap: false`; `actions { duplicate: false, delete: true }`.
- Reachable: yes.

### B-36 · `item-description` (helper, not a block)
- Where: `blocks/item-description.tsx:41-80` (`ITEM_DESCRIPTION_CLASS = "quote-canva-item-description"`, `renderItemDescription`).
- Entry: called by the pricing table for every row.
- Does: prints a line's `descriptionHtml` when present (sanitised), else its plain `description`; the scope `.quote-canva-item-description p { margin-block: 0 }` keeps formatted descriptions from growing blank lines (the inverse of intro-text).
- Rules: `<mark data-color>` (highlight palette `yellow · pink · green · blue · brandBlue · orange · gray`, print hexes e.g. yellow `#FFEEC2`, orange `#FEE0BC`) and `<span data-color>` (text colours `red · orange · green · blue · purple · gray · black`, e.g. orange `#B35309`, purple `#6B3FA0`) are the only styling marks allowed through (`styled-highlight.ts`, `text-color-mark.ts`).
- Data: `quote_line_items.description_html`.
- Words: —
- Reachable: yes.

---

## Reference templates

### B-37 · `TEMPLATE_DYEL` — "Minimal"
- Where: `src/lib/quote-canva/reference-templates.ts:49-262`; headers at 166.
- Entry: rung 5 of the body ladder (B-05); "Apply a design template" (B-52); the sandbox.
- Does: the text-heavy starter — header logo (standalone) · doc-title · meta-kv (`stacked-tab`) · header-divider; body intro-text · pricing-table · signature-footer (two-col); footer footer-band (plain text) · bank-details · gst-line.
- Rules: pricing headers `ref "#"`, `description "Description"`, `qty "Qty"`, `unit "Unit"`, `unitPrice "Rate"`, `optionalPrice "Optional"`, `total "Amount"`, `case "as-is"`, `bandEnabled false`, `bandColor "#F5F5F5"`, `bandTextColor "#1A1A1A"`; `A4_PAGE_RULES` margin 18 mm all sides; `overridability { text: true, body: true, "plainText.body": true }`.
- Data: hard-coded; never persisted until applied to a quote / saved as a studio template (hand-off A).
- Words: `name: "Minimal"`, `description: "Text-heavy starter. Plain bold section headers, stacked-tab KV header, two-column signature footer. Best for contract-style quotes."`
- Reachable: yes.

### B-38 · `TEMPLATE_IDL` — "Centered Premium"
- Where: `reference-templates.ts:264-500`; headers at 370.
- Entry: as B-37.
- Does: centred logo · subtitle band · 7-column pricing table with the optional column · hierarchical `1.2a` numbering · page-indicator · full-bleed accent footer-band · paynow-qr · gst-line.
- Rules: headers `ref "No"`, `description "Description"`, `qty "Quantity"`, `unit "Unit"`, `unitPrice "Unit Price"`, `optionalPrice "Optional Price"`, `total "Total"`, `case "as-is"`, `bandEnabled true`, `bandColor "#FFF8E1"`; numbering `hierarchical-1.2a`.
- Words: `name: "Centered Premium"`, `description: "Centered logo + subtitle band, 7-column pricing table with optional column, hierarchical 1.2a numbering, full-bleed accent footer."`
- Reachable: yes.

### B-39 · `TEMPLATE_FLO` — "Branded"
- Where: `reference-templates.ts:502-677`; headers at 595.
- Entry: as B-37.
- Does: top-left wordmark logo with tagline · decorative section markers · italic warnings (intro-text) · accreditation-strip footer · running header.
- Rules: headers `ref "No."`, `description "SCOPE OF WORK"`, `qty "Qty"`, `unit "UNIT"`, `unitPrice "Rate"`, `optionalPrice "Optional"`, `total "AMOUNT"`, `case "UPPER"`, `bandEnabled true`, `bandColor "#E5EEF7"`.
- Words: `name: "Branded"`, `description: "Top-left logo with wordmark + tagline, decorative markers on section bands, italic warnings, accreditation strip footer."`
- Reachable: yes.

### B-40 · The reference list and how a template is applied
- Where: `reference-templates.ts:679-700` (`REFERENCE_TEMPLATES[{ id, name, description, body }]`); `CanvaEditor.tsx:544-684` (`TemplatePicker`), 685-792 (`SaveAsTemplateButton`).
- Entry: the Layout tab's toolbar *"Apply a design template"* (title at 645: *"Apply a design template — swaps the layout, colors, and blocks. Items are not changed."*).
- Does: lists the three reference bodies plus the studio's own `studio_document_templates` (hand-off A); applying replaces the quote's `canvaBlocks` whole and clears `canvaOverrides`; the previous body goes onto the undo stack. Save as template posts the current body as a new studio template (hand-off A for the dialog and the row).
- Rules: applying never touches line items.
- Data: `leads.quote_metadata.canvaBlocks`, `studio_document_templates`.
- States: —
- Words: as above.
- Reachable: yes.

---

## The per-quote editor

### B-41 · Entry — the digitizer's Layout tab
- Where: `src/components/leads/quote-digitizer-dialog.tsx:85` (import), 4290 (hydration gate), 5322 / 5522 (render gates `studioFeatures?.canvaEditor && canvaTemplate && isCanvaBody(canvaTemplate)`); `src/app/api/studio-config/features/route.ts` (`canva_editor` default true).
- Entry: Lead → quote digitizer dialog → tab *"Layout"* (`editorTab === "layout"`). Any studio member who can open the digitizer.
- Does: mounts `CanvaEditorHost` with the lead's body, the overrides, the studio fonts and assets, and the live `RenderContext` (`buildCanvaCtx`, B-59).
- Rules: hidden when `studios.settings.features.canva_editor === false` (the whole tab); the legacy `lead-detail-drawer.tsx:570` browser share appears only in that case.
- Data: —
- States: —
- Words: —
- Reachable: yes (behind flag `canva_editor`, default on).

### B-42 · `CanvaEditorHost` — state, dirty flag, persistence
- Where: `src/components/leads/quote-canva/CanvaEditorHost.tsx` (13: "state only — persistence to `lead.quote_metadata.canvaBlocks` ships" through the digitizer; 201-233 the composed context with `layoutOverrides: null`, `canvaOverrides: overrides`); digitizer writes 5057 / 5106; snapshot restore 4466-4467.
- Entry: B-41.
- Does: owns the working body + overrides, the selection, the delete history and the undo / redo stacks; every change calls `onDirty` and the digitizer debounces a PATCH of `quote_metadata` (`canvaBlocks`, `canvaOverrides`) through the lead mutation route; the Preview / Download PDF actions read the same lifted state (4892).
- Rules: per-quote mode (`perQuoteMode`) writes knob edits as **overrides** when the path is overridable, else into the block props; template mode (studio editor, hand-off A) writes props. Closing the dialog with unsaved edits is guarded by the digitizer's dirty flag (5031).
- Data: `leads.quote_metadata`.
- States: `saveState` chip — saving / saved / error (the digitizer derives it, 980).
- Words: —
- Reachable: yes.

### B-43 · Canvas, selection and the block toolbar
- Where: `CanvaEditor.tsx:793` (`CanvaCanvas`), `QuoteBlock.tsx` (the dispatcher that resolves props then calls `schema.render`), `useCanvaSelection.ts`.
- Entry: click a block on the canvas or in the slot tree.
- Does: renders every block through the same `render(props, ctx)` the PDF uses, inside a page-shaped frame; the selected block gets an outline and a hover toolbar (move up / down, duplicate, delete); click-away deselects; `Escape` deselects.
- Rules: the canvas is WYSIWYG by construction — no editor-only markup changes the block's own output except `data-block-id` and selection classes; `ctx.isReadOnly` disables the toolbar.
- Data: —
- States: empty body → an empty page.
- Words: —
- Reachable: yes.

### B-44 · Slot tree
- Where: `SlotTree.tsx:153` (`SlotTree`), 162 (`SlotTreeV4`, an alternate cross-zone variant), 134-138 (zones), 189-205 (drop rules); `slot/*` (row, zone header).
- Entry: the left rail of the Layout tab.
- Does: lists every block grouped by zone with its display name and `getContentSummary`; drag to reorder within a zone; selecting a row selects the block.
- Rules: cross-zone drops are refused unless `isAllowedInZone` (B-09); a gap block shows under its pricing table.
- Data: —
- States: —
- Words: *"Header"*, *"Body"*, *"Footer"*.
- Reachable: `SlotTree` yes; `SlotTreeV4` and the `InsertPalette` under `slot/*` have no importer besides their own files — dead.

### B-45 · Insert a block
- Where: `BlockInsertPicker.tsx:41-60` (`INSERTABLES`), 71 (`BlockInsertPicker`, label default `"Add block"`); `CanvaEditor.tsx:85-88` (`onInsertBlock(type, afterBlockId)`), 309-310; `insertSlotAt` (B-10).
- Entry: toolbar *"Add block"*.
- Does: inserts after the selected block (or at the end) one of: `cover-page`, `intro-text` (*"Text"*), `subject-line`, `subtitle-band`, `signature-footer`, `payment-milestones`, `accreditation-strip` (*"Accreditation badges"*), `divider`, `spacer`, `image`. A new block takes the schema defaults.
- Rules: singleton types already present are hidden / disabled; the insert is pushed onto the undo stack; the new block is selected.
- Data: —
- Words: the picker descriptions in B-13…B-35.
- Reachable: yes.

### B-46 · Move / reorder
- Where: `moveSlotInDoc` (B-10); toolbar arrows on the block; slot-tree drag (B-44); inter-section drops (B-11).
- Entry: as above.
- Does: reorders within `blocks[]`; a drop onto a gap moves the block into a pricing table's `interSectionBlocks`; a drop out of a gap restores it to the top level.
- Rules: zone rules (B-09); position in `blocks[]` does not change a block's zone.
- Reachable: yes.

### B-47 · Delete with undo
- Where: `src/components/leads/quote-canva/use-delete-history.ts:16` (`MAX_ENTRIES = 5`), 37 (`useDeleteHistory`); `CanvaEditor.tsx:104` (`onDeleteBlock`).
- Entry: the block toolbar's delete; the slot-tree row's delete.
- Does: removes the block (or the gap block) and shows a toast with Undo; Undo restores at the recorded index.
- Rules: at most 5 undoable deletes are kept (older entries fall off); a schema with `confirmDelete(block) === true` asks first, naming `getContentSummary` (the pricing table: *"the priced line items table"*); `actions.delete === false` hides the control.
- Words: —
- Reachable: yes.

### B-48 · Undo / Redo
- Where: `CanvaEditor.tsx:118-124` (`canUndo`, `canRedo`, `onUndo`, `onRedo`), 315-337 (toolbar).
- Entry: toolbar buttons; keyboard `⌘Z` / `⇧⌘Z` (the titles say so; the host binds them).
- Does: the host keeps a history of body + overrides snapshots; undo / redo swap the whole document state.
- Rules: buttons are disabled at the stack ends.
- Words: `aria-label="Undo"` title *"Undo (⌘Z)"*; `aria-label="Redo"` title *"Redo (⇧⌘Z)"*.
- Reachable: yes.

### B-49 · Property panel
- Where: `PropertyPanel.tsx` (groups by `group` "Group/Cluster", `KnobRow` with lock + reset, `KnobInput` dispatcher, `ArrayKnob` + `ArrayItemRow` 1000-1076, `ArrayItemField` 1080-1116, `mintDefaultForItem` 1132-1159, `zeroForKnob` 1161-1178, `ImageKnobControl` 1182-1233, `applyKnobChange` 1237); `CanvaEditor.tsx:1075-1155` (`PropertyPanelHost`).
- Entry: select a block.
- Does: shows the block's `displayName` and `type`, then its knobs grouped; edits call `onKnobChange(blockId, path, value)`; the lock toggles `overridability[path]` (template mode); Reset (`onKnobReset`) and group Reset (`onKnobResetPaths` — all modified paths in one call) drop overrides in per-quote mode; `focusKnob` (from the knob search) expands the group, scrolls and flashes the row.
- Rules: array knobs add a row minted from each field's `default` or a zero value (`""` / `min ?? 0` / `false` / first option); an `id` field gets `item-<random>`; a `visible` field with no explicit default is set `true`; rows reorder by dnd-kit and delete with *"Delete row"*. Image knobs open the asset picker (B-55) filtered by `assetType`; the button is disabled without a studio (*"Studio context unavailable"*). `fontFamily` selects list the studio's uploaded fonts (`studioFonts`). `visibleWhen` hides rows only.
- Data: —
- States: no schema → *"Block type … has no registered schema."*; no selection → the Document panel (B-50).
- Words: *"Delete row"*, *"Change image"* / *"Pick image"*, *"Pick an image from your studio assets"*, placeholder *"https://…"*.
- Reachable: yes.

### B-50 · Document panel (page rules)
- Where: `CanvaEditor.tsx:912-1071` (`DocumentPanel`; `patch(pageRules)` → `onPageRulesChange`).
- Entry: the property panel with nothing selected.
- Does: edits `pageRules` — paper size, the four margins (mm), *"Space above the letterhead (mm)"* (`headerTopInsetMm`, 0-80, default 0), *"Page background"* (colour + hex), *"Watermark"* text with opacity (0-1, default 0.08, rotation default -30).
- Rules: `headerTopInsetMm` is separate from `margin.top` on purpose — with a repeating letterhead the top margin is computed from the measured band, so only the inset moves the logo down (comment at 976-986; the knob was previously unreachable). Empty watermark text hides it. Read-only view disables every field.
- Data: `pageRules` in the body.
- Words: *"Space above the letterhead (mm)"*, *"Pushes the logo band down from the page edge. Use this rather than the top margin when the letterhead repeats on every page."*, *"Page background"*, *"Watermark"*, placeholder *"e.g. DRAFT (empty to hide)"*, *"Opacity"*, *"Document settings are read-only in this view."*
- Reachable: yes.

### B-51 · Knob search
- Where: `knob-search-box.tsx:16-70` (`KnobSearchBox`).
- Entry: the search box above the slot tree.
- Does: matches block names and knob labels across the document; picking a result selects the block and passes `focusKnob` to the panel (B-49).
- Rules: per-quote mode searches only overridable knobs.
- Words: placeholder *"Search blocks & settings"*; empty *"No matches in this document."*
- Reachable: yes.

### B-52 · Template picker and Save as template (touchpoint)
- Where: `CanvaEditor.tsx:544` (`TemplatePicker`), 685 (`SaveAsTemplateButton`).
- Entry: the Layout toolbar.
- Does: B-40. The studio template list, its rows and the editor that opens from them are hand-off A.
- Reachable: yes.

### B-53 · Row highlight, text highlight and text colour pickers
- Where: `row-highlight-picker.tsx`, `highlight-picker.tsx`, `text-color-picker.tsx`; `src/lib/quote-canva/highlight-palette.ts:25-78` (`HIGHLIGHT_PALETTE`, `HIGHLIGHT_COLORS`, `SESSION_STORAGE_LAST_USED_KEY = "quote-highlight-last-used"`), `line-highlight.ts:61-215` (`normalizeHexColor`, `relativeLuminance`, `readableForeground`, `resolveLineHighlight`, `rowHighlightStyle`, `sanitizeHighlightColorInput`), `text-color-palette.ts:27-60`.
- Entry: the line-item editor's row menu and the description rich-text toolbar (the digitizer — touchpoint for the Quotes audit).
- Does: a row highlight writes `quote_line_items.highlight_color` (hex); the printed row takes that background with a luminance-picked foreground. Text highlight wraps the selection in `<mark data-color="…">`; text colour in `<span data-color="…">`; both survive the sanitiser and print with the palette's `pdf` hex.
- Rules: only palette names are accepted for marks; any hex is accepted for a row (`sanitizeHighlightColorInput`); last-used highlight is remembered per session.
- Data: `quote_line_items.highlight_color`, `description_html`.
- Reachable: yes.

### B-54 · Meta-kv rows editor and the Document-info layout panel
- Where: `meta-kv-rows-editor.tsx`, `document-info-layout-panel.tsx`.
- Entry: the meta-kv block's property panel (special-cased by `blockType === "meta-kv"` in `KnobInput`).
- Does: rows with label · value source (the list in B-20) · visible toggle · drag order · custom literal; the layout panel switches `layout` and `labelWidthPt` with a preview.
- Reachable: yes.

### B-55 · Asset picker
- Where: `asset-picker-dialog.tsx` (`AssetPickerDialog { studioId, assetType, currentUrl, onPick }`).
- Entry: image knobs (B-49), the logo / cover / badge / PayNow blocks.
- Does: lists `studio_assets` of the given `assetType`; picking writes the public URL; clearing writes `null`.
- Rules: the upload itself lives in Accounts › Branding (hand-off A).
- Reachable: yes.

### B-56 · Live PDF preview and the pop-out window
- Where: `CanvaPDFPreview.tsx:49` (`DEBOUNCE_MS = 800`), 133-137 (POST `/api/quote-pdf/render` `{ html, format: "A4" }`); digitizer 1606 (`window.open('/leads/${leadId}/quote-preview-popout?quoteId=…&channel=quote-preview-${leadId}-${quoteId}')`); `src/app/(main)/leads/[leadId]/quote-preview-popout/page.tsx:1-147`.
- Entry: the digitizer's Preview pane; its "pop out" button.
- Does: every change re-renders the HTML client-side and posts it to the render route after 800 ms of quiet; the returned PDF shows in an iframe. The pop-out is a read-only window that receives the same PDF `Blob` over a `BroadcastChannel`, replays the latest on open (`request-state`), zooms 50-200 % in steps of 10, and revokes old object URLs.
- Rules: a 3 s connect timeout without an `alive` ack shows the cross-origin fallback; the pop-out sits under `(main)` so it needs the studio session.
- States: *"Waiting for source window…"* → *"Rendering…"* / *"Waiting for the quote digitizer to send its first render…"*; fallback *"Preview popout couldn't connect"* — *"The preview window can't receive data across different origins (e.g. staging vs production URL). Close this window and use the inline preview in the quote digitizer instead."*
- Words: *"Quote preview"*, *"Zoom out"*, *"Zoom in"*.
- Reachable: yes.

### B-57 · Quote Template Sandbox
- Where: `src/app/(main)/tools/quote-template-sandbox/page.tsx:1-260` (owner gate 35-44 via `isOwner(user.tags)` → else `router.replace("/tools")`); breadcrumb label only at `src/components/ui/breadcrumb.tsx:31`.
- Entry: by URL `/tools/quote-template-sandbox` only — no link from the Tools page or anywhere else; **owner role** only.
- Does: three panels — a BlockNote demo, a hello-world POST to `/api/quote-pdf/render`, and a `CanvaEditor` on a hard-coded `INITIAL_TEMPLATE` (logo · doc-title · meta-kv · header-divider · intro-text · pricing-table · bank-details · gst-line) with a fixed `RenderContext` (three demo items, "Sharon Loh", "Arthaus Studio", S$, GST 9 %). Nothing is persisted.
- Rules: —
- Words: *"Quote Template Sandbox"* — *"Quote Designer sandbox — validates Playwright, Paged.js, BlockNote in this environment. Not for production use."*; banner *"Paged.js deferred to P3."*
- Reachable: yes by URL, owner only; effectively a developer page.

---

## Resolution of data into blocks

### B-58 · `RenderContext`
- Where: `block-schema.ts:42-296`.
- Entry: built once per render (B-59).
- Does: everything a block may read — `items`, `paymentMilestones`, `currencySymbol`, `taxRate`, `taxLabel`, `clientName` / `clientPhone` / `clientEmail` / `clientAddress` / `clientIc` / `customerId`, `propertyType`, `countryCode`, `layout` + `theme` (legacy Phase-18 objects, hand-off A), `brandColor`, `studioBranding { logoUrl, companyName, companyAddress, companyRegistration, bankDetails, tagline?, socialLinks?, accreditations? }`, `categoryDescriptions`, `studioName`, `preparedBy` (+ phone / email), `quoteRefNumber`, `quoteDateISO`, `quoteValidUntil`, `projectTitle`, `paynowQrUrl`, `gstRegistrationNumber`, `docDiscount`, `categoryOrder`, `subsectionOrder`, `sectionDescriptions`, `subsectionDescriptions`, `subsectionTotalLabels`, `variationContext`, `feeFirstMilestonesEnabled`, `isReadOnly`, `renderChild(block)`.
- Rules: no cost, markup or internal note field exists on `items` (B-98).
- Reachable: yes.

### B-59 · The unified composer
- Where: `compose-quote-body.ts:48-66` (`ComposeCanvaQuoteInputs`), 265 (`orderItems`), 304 (`composeCanvaQuoteBody(inputs, makeChildRenderer)`); plan `docs/superpowers/plans/2026-07-29-unified-canva-composer.md`; design `docs/superpowers/specs/2026-07-29-server-modern-canva-render-design.md`.
- Entry: the four render sites — the digitizer (`buildCanvaCtx`), `renderQuoteCanvaPdfBuffer` PATH 1, `/api/sign/[token]/preview-pdf`, `CanvaEditorHost`.
- Does: resolves the body (B-05) and builds one `RenderContext` from the same inputs so every surface prints the same bytes.
- Rules: `taxLabel = \`${region.tax.name} ${(rate*100).toFixed(0)}%\``; `currencySymbol` from the region; GST on/off = `quote_metadata.gstEnabled` ?? the issuing entity's `gst_registered`; items ordered by `categoryOrder` then `subsectionOrder` then `sort_order`.
- Data: region config (SG / MY / AE / IN).
- Reachable: yes.

### B-60 · Tokens
- Where: `src/lib/quote-pdf-tokens.ts:63` (`QUOTE_TOKEN_PALETTE`), 100-116 (`KNOWN_TOKENS`), 121 (`substituteTokens`); `src/lib/quote-canva/tokens.ts:19` (`tokenValuesFromCtx`), 72 (`tokenize`).
- Entry: every text-bearing knob.
- Does: `{token}` and `{{token}}` both substitute. Known tokens: `studio_name`, `studio_phone`, `studio_email`, `studio_website`, `studio_address`, `company_registration`, `studio_instagram`, `studio_facebook`, `studio_linkedin`, `studio_whatsapp`, `studio_tiktok`, `client_name`, `client_phone`, `client_email`, `client_address`, `client_ic`, `customer_id`, `project_title`, `project_ref`, `quote_number`, `quote_date`, `quote_total`, `quote_valid_until`, `prepared_by`, `prepared_by_phone`, `prepared_by_email`, `page_number`, `total_pages`, `date`, `logo`.
- Rules: a known token with no value becomes `""`; an unknown token passes through untouched. `studio_website` falls back to the humanised `socialLinks.website`; `quote_number` and `project_ref` both read `quoteRefNumber`; `page_number` / `total_pages` are `"1"` in the editor and CSS counters in print (B-75). The palette labels (*"Studio name"* … *"Client IC / NRIC"*, *"Customer ID"*, *"Prepared-by phone"*, *"Current date"*) drive the Insert-variable menu (hand-off A).
- Reachable: yes.

### B-61 · Meta-kv value sources
- Where: `header/value-source.ts:14-59` (`resolveValueSource(source, ctx, quote)`).
- Does: B-20's list; every value is trimmed; a missing field is `""`.
- Reachable: yes.

### B-62 · Issuing entity, letterhead, bank and PayNow
- Where: `resolve-entity-paynow-qr.ts:107` (`selectDefaultEntity`), 168 (`resolveIssuingCompanyId`), 189 (`resolveQuoteEntityBranding`); `src/lib/studio-branding.ts` (`resolveIssuingLetterhead`), `src/lib/entity-branding.ts` (`resolveDocumentBranding`); round-3 report `FIXES-REPORT-IDL-PAYNOW-ROUND3.md` (R3-1…R3-3).
- Entry: every render.
- Does: the issuing legal entity (`studio_companies`) chosen by `leads.company_id` (or the signature request's frozen `company_id`) else the default ladder (B-28) supplies the letterhead name / registration / address / logo, the bank block and the PayNow QR; the studio's own values fill only what the entity lacks (letterhead) — the bank blob is taken whole.
- Rules: writers of `company_id` (`PATCH /api/leads/mutations/[id]`, `migrate-entity`, `signature-requests migrate-company`) verify the entity belongs to the studio (400 *"Unknown legal entity for this studio"*); an explicit stamp always wins over the ladder.
- Data: `studio_companies` (`is_default`, `is_active`, `bank_details`, `paynow_qr_url`, `gst_registered`), `leads.company_id`, `quote_signature_requests.company_id`.
- Reachable: yes.

### B-63 · Payment milestones resolution
- Where: `render-quote-pdf-server.ts:139-162` (`PLATFORM_DEFAULT_PAYMENT_MILESTONES`), 164 (`paymentScheduleSnapshotToMilestones`), 545 (`fromTemplate.length > 0 ? fromTemplate : PLATFORM_DEFAULT…`); test `quote-pdf-payment-milestone-filter-consistency`.
- Does: the quote's `payment_schedule` snapshot when present → else the studio's milestone template → else the platform default: *Deposit* 10 % "Upon signing", *Commencement* 30 % "Works commence", *Mid-Project* 30 % "50% completion", *Completion* 30 % "Handover".
- Rules: the same resolved list feeds PATH 1 and PATH 2 (B-79) and the share-link state; a fixed row keeps its amount (B-35).
- Data: `quotes.payment_schedule`, the studio milestone template (hand-off C).
- Reachable: yes.

### B-64 · Items, ordering and descriptions
- Where: `render-quote-pdf-server.ts:98` (`rawRowsToLineItems`), `compose-quote-body.ts:265` (`orderItems`); `QuoteMetadata` fields (B-07).
- Does: DB rows → `QuoteLineItem { id, name, description, descriptionHtml, category, subcategory, qty, unit, unitPrice, total, priceType, isOptional, isOmission, amountMarker, taxRate, taxInclusive, discountType, discountValue, sortOrder, highlightColor }`; totals recomputed from `unitPrice × qty` with per-line tax / discount.
- Rules: `categoryOrder` orders bands (unknown categories appended; empty ones skipped); `subsectionOrder` declares subsection names that render even without items; `sectionDescriptions[category]` beats the studio default `studio_quote_categories.description`; `subsectionDescriptions["Category|Sub"]`.
- Reachable: yes. Line-item content is the Quotes audit.

### B-65 · Numbering and section markers
- Where: `pricing/numbering.ts:26-52`, `pricing/section-styles.ts`, `pricing/studio-marker-vocabulary.ts`, `pricing/parts.ts`, `pricing/non-numeric.ts`, `pricing/optional-rendering.ts`, `pricing/group-subtotal.ts`, `pricing/subsection-total-label.ts`; `hierarchy/*`.
- Does: the seven modes (B-18); markers per section (bullet / letter / roman / custom glyph) from the studio vocabulary with per-section overrides; `parts.ts` splits a description into title / detail; `non-numeric.ts` prints `amountMarker`; `optional-rendering.ts` decides the optional column vs marker; `group-subtotal.ts` sums a band excluding optional and marker lines.
- Reachable: yes.

### B-66 · Dates, currency, tax label, region
- Where: `src/lib/quote-canva/quote-date-format.ts:27-100` (`QuoteDateFormat = "short" | "long-weekday"`, default `"short"`, `formatQuoteDate`, re-format of display strings); region config in `src/lib/region` (SG / MY / AE / IN).
- Does: `short` = `{ day: "numeric", month: "short", year: "numeric" }`; `long-weekday` adds the weekday and the long month; the format comes from `globalStyles.dateFormat` (hand-off A) unless a meta-kv row overrides it. Currency symbol and tax name / rate come from the region; the rate is `region.tax.rate` unless the quote or entity turns GST off.
- Rules: the same function is used at every site ("ONE place, on purpose").
- Reachable: yes.

---

## HTML render

### B-67 · `renderCanvaBodyToHtml` — the print document
- Where: `src/lib/quote-canva/render-to-html.tsx:132-659` (signature at 132-137; `options.pageSize` 116-120); `src/components/leads/quote-canva/QuoteBlock.tsx:41-97`. Five callers: `quote-digitizer-dialog.tsx:5323` (`generateQuotePdfBlob`) and `:5523` (Download), `quote-canva/CanvaPDFPreview.tsx:92` (preview pane), `render-quote-pdf-server.ts:833` (server PATH 1), `src/app/api/sign/[token]/preview-pdf/route.ts:640` (signing preview).
- Entry: every canva PDF — preview pane, Download PDF, the Submit / Approve freeze, *Send to homeowner portal*, *Re-sync PDF*, server renders, the signing page's PDF. The editor canvas does **not** use it; it mounts `QuoteBlock` per block (`CanvaEditor.tsx:865-880`).
- Does: returns one HTML string — `<!DOCTYPE html>`, `<meta charset>`, the side-margin meta tag (B-73), `<title>Quote</title>`, one `<style>` (fonts B-70, reset, rich-text CSS B-71, `@page` B-73 / B-75, page decoration, break rules B-74), then `<body>` = `div.canva-repeating-header` (letterhead band, B-68) → `div.canva-repeating-footer` (footer band) → `div.canva-print-root` holding the watermark div, `div.canva-first-page-only-header`, the in-flow body and `div.canva-first-page-only-footer` (:446-658). Each block is rendered on its own with `renderToStaticMarkup(<QuoteBlock/>)` from `react-dom/server.browser`, so the same module runs in the browser and on the server (:15-22); `QuoteBlock` resolves props (defaults → template → overridable per-quote overrides, B-04) and calls the schema's `render(props, ctx)`.
- Rules:
  - `block.hidden === true` never prints (:235; `QuoteBlock.tsx:42`).
  - `page-break` is special-cased before dispatch → `<div class="quote-page-break" data-block-id>` (:307-309).
  - A block whose `render` throws, or whose type has no registered schema, prints `QuoteBlock`'s diagnostic box — inline Helvetica 11 px text (its Tailwind classes have no stylesheet in the print document): *"Block render failed"*, the block id · type, and the message; for an unknown type *`No schema registered for block type "<type>". Register the block via registerBlockSchema() at module import time.`* (`QuoteBlock.tsx:44-51, 60-71, 75-97`). Only a throw inside `renderToStaticMarkup` itself yields an empty `<div data-block-id data-block-error="1">` (:314-327). An unknown or broken block therefore does not vanish from the client PDF (B-01 says the renderer skips it).
  - Blocks receive a local ctx copy with `emitSignatureSlotMarkers: true` (:298) — every document from this function carries the invisible signature markers (B-83).
  - The first and last `<p>` inside any `.quote-canva-block` lose their outer margin (:472-473), so the block's margin knobs govern outer spacing.
  - Body defaults: colour `#1A1A1A`, line-height 1.4, `print-color-adjust: exact` (:491-498).
  - `resolveQuoteHierarchy({ hierarchy: undefined, items: [] })` is called and discarded — a no-op kept for tests (:138-152).
- Data: `QuoteCanvaTemplateBody`, `RenderContext`, `BlockOverridesByQuote`.
- States: unknown / broken block → diagnostic text in the PDF; deep render throw → empty div.
- Words: *"Quote"* (document `<title>`); the diagnostic texts above.
- Reachable: yes (five call sites).

### B-68 · Repetition partition — the letterhead band and the footer band
- Where: `render-to-html.tsx:40-69` (`resolveRepetition`), 213-263 (partition), 385-393, 644-656; flags in `src/lib/quote-canva/reference-templates.ts:72, 99, 107, 134, 146, 158, 211, 238, 257` (Minimal), 471, 490 (Centered Premium), 644, 661 (Branded).
- Entry: every render (B-67).
- Does: walks `blocks[]` in order and puts each visible block in one of five lists: in-flow body, first-page-only header, first-page-only footer, repeating header (the letterhead band), repeating footer (the footer band). A block that resolves to `every-page` joins a band: `footer-band` / `gst-line` always the footer band; any other type the **header** band when it sits before the first visible `pricing-table`, else the **footer** band (:232, 251-256). The bands become Paged.js running elements printed in the page margins (B-77).
- Rules:
  - Mode is read from the block's **stored** props (`b.props`) — not the effective props and not per-quote overrides (:236, 247): a string `repetition` (`never | first-page-only | every-page`) wins; else a boolean `repeatOnEveryPage` (true → every page, false → first page only); else the type default — `footer-band` and `gst-line` default to **every page**, every other type to first page only (:242-246).
  - `never` removes only band types; other types ignore it (:249).
  - A `footer-band` / `gst-line` resolved to first page only is moved to the **end of the document** (`div.canva-first-page-only-footer` after the body, :655), wherever it sits in `blocks[]`; other first-page-only blocks flow in place.
  - With no visible pricing table, every repeat-flagged non-band block goes to the **footer** band (:254 needs `tableIndex >= 0`).
  - The `header-band` branches and the `repetition` prop are read here but no `header-band` block is registered (`blocks/index.ts:7-35`) and no block exposes a `repetition` knob — dead in practice (B-108).
  - Band blocks get no keep-together wrapper (:386-389).
  - Reference templates: Minimal repeats logo, doc-title, meta-kv and its first two intro-texts + subject-line (the letterhead) and signature-footer, footer-band, gst-line (the footer band); Centered Premium repeats only its footer-band — its gst-line is `false`, so it prints once at the end; Branded repeats footer-band and gst-line.
- Data: block props.
- Words: the per-block *"Repeat on every page"* knobs (B-13…B-30).
- Reachable: yes.

### B-69 · Fallback signing footer
- Where: `render-to-html.tsx:265-288`; `src/lib/quote-canva/signature-footer-columns.ts:138-153` (`shouldInjectSigningFooter`), 117-124 (`needsFallbackSignatureFooter` — exported, no production caller); defaults `blocks/signature-footer.tsx:67-95`.
- Entry: any render through B-67 whose body has no visible `signature-footer`.
- Does: appends a `signature-footer` with id `__fallback-signature-footer` and the schema's default props as the **last in-flow block**, so the PDF has a signing area and the `om-sigslot` markers before anyone signs (the 2026-08-05 "bug 2" fix).
- Rules: fires whenever `emitSignatureSlotMarkers` is true, which on this path is always; a body with a visible signature footer is unchanged. The editor canvas never gets it, so every canva PDF (preview pane, downloads, the stored canonical, server renders) shows a signing footer the canvas does not. Missing schema → logged, skipped.
- Data: —
- States: —
- Words: default columns *"Prepared by"* (`{prepared_by}`, `{studio_name}`) and *"Accepted by"* (`{client_name}`, `{client_phone}`).
- Reachable: yes (every footer-less canva body).

### B-70 · Fonts
- Where: `render-to-html.tsx:76-92` (`DOCUMENT_FONT_STACKS`), 94-114 (`serifFontFaceRules`), 176-191, 453-459; `src/lib/quote-canva/tinos-font.ts:1-10`; fonts wait `src/app/api/quote-pdf/render/route.ts:644-647`; editor ctx `quote-canva/CanvaEditorHost.tsx:276-279`; panel options `quote-canva/PropertyPanel.tsx:852-853`; server font read `render-quote-pdf-server.ts:671-677`.
- Entry: the template's `globalStyles.font.family` (hand-off A) and blocks' own `fontFamily` knobs.
- Does: `body { font-family }` from the family key — `Helvetica` (default and fallback), `Times-Roman`, `Courier`, `Georgia`, `Inter`, `Outfit`; blocks without a font prop inherit it. For `Times-Roman` the document inlines four Tinos faces (regular, bold, italic, bold-italic; latin subset; base64 woff2; Apache-2.0, "metrically identical to Times New Roman") as `@font-face` rules under the family name `"Times New Roman"`, because serverless Chromium has no Microsoft fonts. Active studio font assets (`studio_assets` type `font`) become `@font-face` rules with the asset URL offered as woff2 / woff / opentype / truetype and `font-display: swap`; a block picks one by name.
- Rules: Tinos only for serif templates. The print route waits for `document.fonts.ready` for at most 3 s; font downloads pass the resource guard (8 s, 6 MB — B-78). The digitizer's canva editor builds its ctx with `studioFonts: []`, so uploaded fonts neither paint on the canvas nor appear in its font selects (they would read *"<name> (uploaded)"*), yet a stored body that names one prints it. Band heights are measured in Helvetica 9 pt (B-73).
- Data: `studio_assets`; `globalStyles.font.family`.
- States: —
- Words: —
- Reachable: yes.

### B-71 · Rich-text content CSS
- Where: `src/lib/quote-canva/rich-text-content-css.ts:58-201`; injected into the print `<style>` (`render-to-html.tsx:503`) and into the editor canvas (`CanvaEditor.tsx:864`).
- Entry: every render.
- Does: one stylesheet string shared by print and canvas: (1) `intro-text` prose re-declares the Chromium UA defaults scoped to `.quote-canva-block--intro-text` — `p` 1em margins, h1–h6 sizes and margins, disc / decimal lists with a 40 px indent, blockquote, `hr` as a 1 px inset rule with 0.5em margins, b / i / u / s / small / sub / sup, layout tables with separate borders and 2 px spacing, inline images at natural size (:148-194); (2) pricing-table item descriptions (`.quote-canva-item-description`) — no paragraph margins, `p + p` 0.35em, tight lists, h2 / h3 at body size (:107-125); (3) highlight marks `mark[data-color=<name>]` in the palette's print hex with a readable foreground, blank / unknown → transparent (:76-88); (4) text colours `span[data-color=<name>]` in the palette's print hex, blank → inherit (:139-146).
- Rules: the prose rules exist so the canvas (Tailwind Preflight) matches the print, which was kept byte-identical. Only `intro-text` gets the prose rules; marks and colours are unscoped.
- Data: `HIGHLIGHT_COLORS` / `TEXT_COLORS` (B-36, B-53).
- States: —
- Words: —
- Reachable: yes.

### B-72 · Render hash, ETag and the PDF caches
- Where: `src/lib/quote-canva/quote-render-hash.ts:20-100`; its only builder `src/lib/quote-share-link.ts:166-204`; consumers `src/app/api/quote/[token]/pdf/route.ts:64-66, 102` and `.../status/route.ts:50-54`; print-route cache `src/app/api/quote-pdf/render/route.ts:40-70, 293-297, 815-820`; `src/lib/quote-canva/render-quote-to-pdf-buffer.ts:39-152`.
- Entry: the share-link PDF fetch and status poll (B-92); every POST to the print route.
- Does: `hashQuoteRenderInputs` = SHA-256 hex of a key-sorted canonical JSON (`undefined` → `null`, functions → `null`) over: items (`id, description, descriptionHtml, category, subcategory, unitPrice, qty, unit, isOptional, amountMarker`), `quote_hierarchy_metadata`, `layoutOverrides`, `themeOverrides`, `gstEnabled`, `docDiscount`, client info (name, phone, email, ic_number, customer_id, property_address, quote_valid_until), `projectTitle` (= the lead's name), quote number, `quoteDate` (`parsed_doc_metadata.date`), the default **and** active `quote_pdf` template's `globalStyles.layout` / `.theme`, `settings.branding` with its bank details / accreditations / company address / registration, `settings.payment_details`, `quotes.payment_schedule`, computed totals (subtotal, tax, grand total), `preparedBy` (`parsed_doc_metadata.issuedBy`), tax rate. It is the share PDF's `ETag` and the poll's `stateHash`.
- Rules:
  - Not hashed: the canva body (`quote_metadata.canvaBlocks`) and `canvaOverrides`, `categoryOrder`, section / subsection descriptions and total labels, a line's name, photo, highlight colour and per-line tax / discount fields (except through totals), the issuing entity (`leads.company_id` and its letterhead, QR, bank), the designer signature, uploaded fonts / badges, the render date. A layout-only edit keeps the same ETag: a viewer already holding the PDF gets `304` on refresh and no update banner (B-92).
  - Print-route cache: in memory per warm instance, 16 PDFs, key SHA-1 of `format + " " + html`, least-recently-used, successful renders only; responses still say `Cache-Control: no-store`.
  - `render-quote-to-pdf-buffer.ts` (a 100-entry LRU keyed by this hash around `@react-pdf` `QuotePDFDocument`) has no production caller — only `src/__tests__/quote-share-link-perf-budget.test.ts` imports it (B-111).
- Data: as listed.
- States: —
- Words: —
- Reachable: the hash yes (share routes only); `render-quote-to-pdf-buffer.ts` no.

---

## Pagination

### B-73 · Page size and margins
- Where: `render-to-html.tsx:71-74` (`DEFAULT_MARGINS` 16 mm), 154-175, 391-416, 450, 487-490, 512-514, 537-548; `src/lib/quote-canva/shared-render-primitives/page-break-helpers.ts:84-119, 163-174`; `src/lib/quote-pdf-layout.ts:396-422` (`DEFAULT_LAYOUT.header`); `src/lib/quote-canva/page-side-margins.ts:30-66`; print route `route.ts:657-706`; `src/lib/quote-canva/measure-letterhead-script.ts:28-44`; Document panel `CanvaEditor.tsx:948-1010`.
- Entry: `pageRules` from the Document panel (B-50); repeat flags (B-68).
- Does: the document states a static `@page { size; margin }` — size = `options.pageSize ?? pageRules.paperSize ?? "A4"`; top = `margin.top` + (letterhead band present ? `estimateHeaderHeightMm(DEFAULT_LAYOUT.header)` — the legacy header estimate, 31 mm for its small-logo single-band default : 0); left / right as set; bottom = `margin.bottom` + 8 (counter room) + (footer band present ? 36 when any repeating `footer-band` has `mode: "multicol-band"`, else 28 : 0) + 18 more when a `signature-footer` repeats. When a band repeats and the Paged.js pass runs (B-77), the route appends a later `@page` that **replaces** these: top = letterhead ? clamp(ceil(measured band mm) + 8, 22, 110) : **18**; bottom = footer band ? clamp(ceil(measured) + 8, 22, 110) : **18**; left / right from `<meta name="canva-page-side-margins" content="<left>,<right>">`, which the renderer writes (absent, malformed or negative → 18 mm each). Then the letterhead script appends `@page { margin-top: <ceil(px × 25.4 / 96) + 2> mm }` measured on the band itself (skipped when 0 or over 200 mm), overriding the probe's top.
- Rules:
  - No `pageRules.margin` → 16 mm each side; the reference templates set 18 mm (`A4_PAGE_RULES`).
  - Probe: each band's inner HTML in a hidden `display: flow-root` div `210 − left − right` mm wide (the A4 width, also for Letter), `font: 9pt Helvetica, Arial, sans-serif`, colour `#333`.
  - In the Paged.js pass the template's top margin is ignored whenever a letterhead repeats, and an edge **without** a band prints at a fixed 18 mm — a template with only a repeating footer band prints an 18 mm top margin whatever `margin.top` says, though the panel promises *"Applied to both the editor canvas and the printed PDF."*
  - Only `multicol-band` counts as a heavy footer (`render-to-html.tsx:400-403`); B-24 also calls the accreditation mode heavy, but in code it gets the 28 mm reserve.
  - `headerTopInsetMm` prints as a spacer div inside the letterhead band, clamped to (0, 40] mm (:162-175); the panel accepts 0–80 (B-108).
  - Full-bleed blocks escape the page by CSS vars `--canva-page-inset-left/right` set from the side margins at `:root` and on `.canva-print-root` (print) and in px on the canvas (1 px = 1 pt).
- Data: `pageRules.paperSize`, `margin`, `headerTopInsetMm`.
- States: —
- Words: *"Margins (mm)"*, *"Applied to both the editor canvas and the printed PDF."*, *"Space above the letterhead (mm)"* (B-50).
- Reachable: yes.

### B-74 · Page breaks and keep-together
- Where: `render-to-html.tsx:300-309, 333-383, 574-612`; `blocks/spacer.tsx:24-27, 57`; `blocks/cover-page.tsx:129-132, 339`; knobs `blocks/intro-text.tsx:103-104`, `blocks/signature-footer.tsx:424-425`.
- Entry: the spacer's *"Page break before"*, the cover's *"Force page break after cover"*, the intro-text and signature-footer keep knobs, stored `page-break` blocks.
- Does: forced breaks — a `page-break` block prints a zero-height div with `break-after: page` (:577-583; B-34 says break-before); spacer `pageBreakBefore` → inline `break-before: page`; cover-page `pageBreakAfter` (default true) → `break-after: page`. Keep rules — a block with `keepOnOnePage: true`, or a run of blocks each flagged `keepWithNext: true` plus the block after the run, is wrapped in `div.quote-keep-together { break-inside: avoid }`, a box-less wrapper so margins still collapse. Pricing table — each row `[data-row-id]` has `break-inside: avoid` (a line never splits); each section's first child (the band) `break-after: avoid` (stays with its first row); whole sections may split across pages.
- Rules: keep flags are read from the stored props of **any** block type, though only intro-text and signature-footer expose the knobs; a `page-break` ends a keep run on both sides; a group taller than the printable area still splits; bands (B-68) never get keep wrappers. When a block cannot fit beside a tall letterhead, Paged.js can hang — the 25 s timeout sends the render to the in-flow fallback (B-77).
- Data: block props.
- States: —
- Words: *"Page break before"* — *"Forces the next content onto a new page"*; *"Force page break after cover"* — *"Quote body starts on page 2 of the printed PDF"*; *"Keep on one page"* — *"Never split this text across a page break."* / *"Never split the signing columns across a page break."*; *"Keep with next block"* — *"Print on the same page as the block below — e.g. keep closing notes with the signature area."* / *"Print on the same page as the block below — e.g. a second signing row."*
- Reachable: yes (the page-break block's insertion: B-113).

### B-75 · Page numbers
- Where: `src/lib/quote-canva/page-counter-css.ts:27-162`; `render-to-html.tsx:418-440, 531, 613-617`; `blocks/page-indicator.tsx:29-120`; reference placements `reference-templates.ts:81, 495`; `src/lib/quote-canva/tokens.ts:64-67`; `blocks/running-header.tsx:53-59, 61-87`; `blocks/signature-footer.tsx:306-316, 361-371`; legacy `src/components/leads/quote-pdf.tsx:4010-4040`.
- Entry: the `page-indicator` block (singleton, not insertable) or its absence.
- Does: the only live counter is an `@page` margin box. No page-indicator block → `@bottom-center { content: "Page " counter(page) " of " counter(pages) }`, 9 pt `#666666` in the document font — **only when no footer band repeats**; with a repeating footer band nothing is printed. With the block: `placement` picks the box (`top-right` default, `bottom-center`, `top-left`; `hidden` → none); when a running band owns that edge the counter moves to a corner box (top edge → `top-left-corner` / `top-right-corner`, top-center → `top-right-corner`; bottom-left → `bottom-left-corner`, bottom-center / bottom-right → `bottom-right-corner`) so it never squeezes the band; corner boxes get `white-space: nowrap`. `format`: `{n}` → `counter(page)`, `{m}` → `counter(pages)`, the rest quoted and escaped, empty → `""`. Size default 9 pt; colour only when it matches `#` + 3–8 hex digits, else `#666666`; italic. The block's own in-flow label (the format with 1 / 1) is `display: none` under `@media print`.
- Rules:
  - Reference templates: Minimal — top-right `{n} of {m}`, 9 pt `#888888`, moved to the top-right corner by its repeating letterhead; Centered Premium — bottom-center `{n} of {m}`, 8 pt italic, moved to the bottom-right corner by its repeating footer band; Branded has no page-indicator and a repeating footer band, so it prints **no** page number (B-21 lists the block for Centered Premium and Branded).
  - `skipFirstPage` (*"Skip cover / first page"*) is not read (B-108).
  - Tokens `{page_number}` / `{total_pages}` resolve to "1" at render and print "1" on every page (`tokens.ts:64-67`); `running-header` swaps `{n}` / `{m}` for "1" and prints once, in flow — no stylesheet targets it (B-23 and B-60 say the counter resolves in print). No reference template contains a `running-header` block.
  - The three-column `signature-footer` centre column prints the literal *"Page 1 of 1"* (`signature-footer.tsx:306-316`) — in the PDF too.
  - The box router supports six plain boxes plus four corners; the knob offers four placements.
  - Legacy `@react-pdf`: `globalStyles.pageNumber { enabled, position, format }` → fixed 8 pt `#999` text `page_n_of_total` ("N of M"), `page_n` ("Page N") or "N"; skipped when the footer text already uses `{page_number}` / `{total_pages}`. The jsPDF renderer prints no page numbers (B-81).
- Data: page-indicator props.
- States: —
- Words: *"Placement"* (*"Top right"*, *"Bottom center"*, *"Top left"*, *"Hidden"*), *"Format"* (placeholder *"Page {n} of {m}"*), *"Font size"*, *"Color"*, *"Italic"*, *"Skip cover / first page"*; default counter *"Page N of M"*.
- Reachable: yes.

### B-76 · Repeating the pricing-table header row
- Where: `src/lib/quote-canva/repeat-table-header-script.ts:1-73`; attribute `blocks/pricing-table.tsx:873`; injection `src/app/api/quote-pdf/render/route.ts:727-735`.
- Entry: the pricing-table knob *"Repeat header row on every page"* (`headers.repeatOnEveryPage`, overridable by default — B-18).
- Does: a Paged.js handler registered after the polyfill and before `preview()`: it first snapshots `[data-repeat-header="true"] .quote-canva-table-header`; on every `afterPageLayout` it prepends a clone (marked `data-repeated-header`) to each flagged table fragment on the page that has no header yet and holds at least one row or section.
- Rules: it runs only inside the Paged.js pass, and that pass runs only when a letterhead or footer band repeats (B-77) — a document with no repeating band never repeats the header row, knob on or not. The snapshot is taken from the first flagged table. Errors are logged (`console.warn`) and never fail the PDF; no `window.Paged.registerHandlers` → no-op.
- Data: —
- States: —
- Words: B-18.
- Reachable: yes (opt-in).

### B-77 · The Paged.js pass and what repeats on every page
- Where: `src/app/api/quote-pdf/render/route.ts:384-430` (band extraction, in-flow fallback), 597-610, 615-774 (`renderOnce`), 776-813; `render-to-html.tsx:515-530, 549-573, 618-638`; polyfill `node_modules/pagedjs/dist/paged.polyfill.min.js` (`pagedjs` ^0.4.3, `package.json:112`); legacy defaults `src/lib/quote-pdf-layout.ts:432, 519`.
- Entry: a document containing `div.canva-repeating-header` and/or `div.canva-repeating-footer`.
- Does: in order — `setContent` of the full HTML, where the bands are `position: running(canvaHeader | canvaFooter)` elements printed by `@top-center { content: element(canvaHeader); vertical-align: top }` / `@bottom-center { content: element(canvaFooter); vertical-align: bottom }`, each `width: 100%` on the page background colour; wait for fonts (≤ 3 s); shrink images (B-78); measure bands and set margins (B-73); `PagedConfig = { auto: false }`; inject the letterhead measure script, the Paged.js polyfill and the header-row handler (B-76); run `PagedPolyfill.preview()` with a 25 s in-page timeout; `page.pdf({ format, printBackground: true, preferCSSPageSize: true })`. Any failure disposes the browser and prints the **in-flow fallback**: band wrappers stripped, their inner HTML placed once — letterhead at the top of `<body>` (12 pt gap below), footer at the end (12 pt gap above) — under the static `@page` margins, which still reserve the band estimates; a second failure retries once more. So the PDF always prints, sometimes with the letterhead and footer once instead of on every page.
- Rules:
  - Repeats on every page (canva): the letterhead band and the footer band (B-68); the page-number box (B-75); the table header row when opted in (B-76); the background image and the watermark, both `position: fixed` (B-117). Nothing else repeats — not a `running-header` block (B-75), not the fallback signing footer (B-69).
  - No band → no Paged.js: a plain `page.pdf()` with the static `@page`.
  - Legacy `@react-pdf`: header band on page 1 only and footer band on every page by default, via `<View fixed>`.
- Data: —
- States: —
- Words: —
- Reachable: yes.

---

## PDF render

### B-78 · `/api/quote-pdf/render` — the Chromium print route
- Where: `src/app/api/quote-pdf/render/route.ts:1-869`; versions `package.json:73` (`@sparticuz/chromium-min` 148.0.0), 116 (`playwright-core` 1.60.0).
- Entry: `POST { html, format? }` from the digitizer (studio cookie `qanvast_session`) or a server self-call with header `x-internal-render-secret` = `CRON_SECRET` (:255-274).
- Does: prints any HTML to a PDF — `200 application/pdf`, `Content-Disposition: inline; filename="quote.pdf"`, `Cache-Control: no-store`. Steps: the cache (B-72); `QUOTE_PDF_DRY_RUN=true` → a zero-page stub PDF; Chromium = `@sparticuz/chromium-min` v148 pack (arm64 or x64, or `CHROMIUM_BINARY_URL`) on Vercel / Lambda, local Chrome elsewhere (`CHROME_EXECUTABLE_PATH` override); one render at a time per warm instance (promise chain); a fragment without `<!DOCTYPE` / `<html>` is wrapped with `@page { size; margin: 0 }` and Helvetica; every remote `<img src="http(s)://…">` is fetched server-side and inlined as a data URI (8 s, ≤ 6 MB; failures keep the URL) so it paints in every Paged.js margin clone; `setContent` waits for `load` (20 s, best-effort); after fonts, each `<img>` longer than 600 px on its long side is redrawn to 600 px through a canvas; then the Paged.js pass or a plain `page.pdf` (B-77).
- Rules: a resource guard on every request — only `http(s)` and `data:` URLs pass (file:, chrome:, blob: are aborted — an SSRF guard); network fetches time out at 8 s with no retry; images, fonts and media over 6 MB (by `content-length`) are aborted — a dead asset prints broken, never fails the PDF. With no bands, a browser-dead error (closed target, protocol error, `page.pdf:` failure) is retried once on a fresh browser and any other error returns 500; with bands, any failure degrades to the in-flow fallback (B-77). The browser is disposed after **every** render; on Linux `/tmp` core dumps and profile folders are swept. `maxDuration` 60 s, Node runtime.
- Data: —
- States: 401 *"Not authenticated"*; 400 *"Body must be JSON"* / *"Missing 'html' field"*; 500 `{ error: <message> }` or *"Render failed"*.
- Words: —
- Reachable: yes (every canva PDF).

### B-79 · `renderQuoteCanvaPdfBuffer` — server render, PATH 1 / PATH 2
- Where: `src/lib/quote-canva/render-quote-pdf-server.ts:183-973`; `rawRowsToLineItems` 96-133; `src/lib/quote-pdf-render-helper.ts:56-72`.
- Entry: the server callers in B-81 / B-82 (send for signature, the OTP share PDF, downloads, self-heals, VO approval, the executed-contract fallback, the portal engagement document).
- Does: returns a PDF buffer or `null` (no items, no lead, render failure — never throws). Reads the studio (country, features, branding, currency-symbol override), the lead (client fields, `quote_metadata`, `company_id`), the issuing entity (letterhead, QR, bank — B-62) and, when `quoteId` is passed, the quote row (`payment_schedule`, `parsed_doc_metadata` date / issuedBy / refNumberOverride / clientName / `__layout` brand colour + logo, `prepared_by_signature`, `doc_sections`, `quote_type`), the author's phone and email, the schedule fallback (B-63), the VO context, category descriptions and order, the default template body, badges, fonts, accreditations and the designer signature (private `member-signatures` bucket). Composes `(template, ctx)` with `composeCanvaQuoteBody` in **strict** mode (B-80). PATH 1 (a template resolved): `renderCanvaBodyToHtml` → POST `${INTERNAL_RENDER_ORIGIN || origin}/api/quote-pdf/render` with `x-internal-render-secret` and `ngrok-skip-browser-warning`; a non-PDF response → `null`. PATH 2 (no template): `QuotePDFDocument` (`@react-pdf`) in the lambda with the studio's active `quote_pdf` template (default first) only when its `body_json` has a `sections` array — a canva-body default has none, so PATH 2 prints the renderer's built-in default layout.
- Rules:
  - Date: the stored `parsed_doc_metadata.date`, else the **render date** — a later re-render prints a later date. Prepared-by: `parsed_doc_metadata.issuedBy`; the digitizer's own renders use the signed-in user's name (`quote-digitizer-dialog.tsx:5234`).
  - Quote number: `refNumberOverride` → the caller's number → `quotes.quote_number` → parsed `refNumber`.
  - GST row off when `quote_metadata.gstEnabled === false`; document discount only when `value > 0`.
  - The item mapper keeps `costPrice`, `wastePercent`, `notes`, `highlightColor`, `isOmission` (:98-133): cost reaches the render input; no block prints it (B-98).
  - VO quotes print the VO document on both paths (PATH 2 default title *"VARIATION ORDER"*).
  - `signedSignature` stamps the client column (PATH 1) or `ClientSignatureExecution` (PATH 2) — B-86.
- Data: as listed.
- States: `null` → callers show their own error or fallback.
- Words: *"VARIATION ORDER"*.
- Reachable: yes.

### B-80 · Strict mode (`strictCanvaBody`)
- Where: `src/lib/quote-canva/compose-quote-body.ts:59-66, 198-247`; passed at `render-quote-pdf-server.ts:733` and `sign/[token]/preview-pdf/route.ts:542`; `apply-on-approval.ts:114-120`; digitizer hydration `quote-digitizer-dialog.tsx:4955-4990`.
- Entry: every server render and the signing preview's on-demand render.
- Does: with `strict: true` the body ladder (B-05) stops after rung 1 — only a valid persisted `quote_metadata.canvaBlocks` renders canva; otherwise `template: null` and the caller prints legacy (PATH 2 on the server, the bare jsPDF document on the signing preview — B-81). The digitizer and editor walk the whole ladder (migrated `doc_sections` → studio default → `TEMPLATE_DYEL`).
- Rules: added against the 2026-07-31 regression in which server renders guessed a default design and overwrote the studio's canonical. Consequence: a quote whose lead has no persisted body shows the canva design in the digitizer (and in the canonical when the digitizer wrote it) but prints legacy from every server path that renders instead of serving the canonical — the OTP share PDF (B-92), self-heals (B-82), the bake's self-heal (B-85), the signing preview's fallback. The digitizer persists the ladder's result on first open only for rung 3 (studio default; `quote-digitizer-dialog.tsx:4969-4990`, A-90); rungs 2 and 4 stay unpersisted until an edit.
- Data: `leads.quote_metadata.canvaBlocks`.
- States: —
- Words: —
- Reachable: yes.

### B-81 · Legacy renderers, and which renderer prints each surface
- Where: `src/components/leads/quote-pdf.tsx` (`QuotePDFDocument` 4408…, `ClientSignatureExecution` 4383-4406, Optional Works 3176-3200 / 4441-4456); `src/lib/quote-pdf.ts:1-194` (jsPDF `renderQuotePdf`); digitizer `quote-digitizer-dialog.tsx:1188-1195, 5316-5420, 5483-5652, 9336-9341, 9467-9472`; `src/lib/quote-canva/share-legacy-quote-pdf-client.ts:81-174` + `lead-detail-drawer.tsx:557-614`; `src/app/api/quotes/[id]/download/route.ts:1-176`; `src/app/api/leads/[id]/quote/download/route.ts:1-162`; `src/app/api/sign/[token]/preview-pdf/route.ts:184-713`.
- Entry: per surface below.
- Does: three renderers print quotes — (1) canva HTML → Chromium (B-67 / B-78); (2) `QuotePDFDocument` (`@react-pdf`, the document-template sections engine; its layout knobs are hand-off A); (3) `renderQuotePdf` (jsPDF, a bare line list, `mode: "draft" | "signed"`). Surface → renderer:
  - Digitizer *Download PDF* while the quote is not yet approved: canva flag on with the hydrated canva body (the client ladder always yields one) → (1) in the browser, and the bytes are stored as the canonical; flag off → (2) in the browser, **not** stored.
  - Digitizer *Download PDF* for `approved`, `sent_for_signature`, `client_signed`: the canonical via `/api/leads/<lead>/quote/download?source=draft:<quote>` (self-heal render when missing — B-82); on failure the client render (without the baked designer signature).
  - Submit for review / Approve (freeze), *Send to homeowner portal*, *Re-sync PDF*: `generateQuotePdfBlob` → (1) or (2), posted to the canonical.
  - Lead drawer, canva flag **off** only, on signing-link create / regenerate: (2) in the browser → share-to-portal (records the portal share, notifies the homeowner).
  - Server `renderQuoteCanvaPdfBuffer`: (1) when strict finds a persisted body, else (2) (B-79 / B-80).
  - Signing page PDF (`/api/sign/<token>/preview-pdf`): the canonical first (single mode); else (1) strict from the frozen snapshot; else (3) `draft` / `signed`.
  - `/api/quotes/<id>/download`: the canonical → a server render (`?fresh=1` renders without storing; otherwise self-heal and store) → (3) when the quote has no lead or no items or the render fails (`signed` when the status is `client_signed`).
- Rules:
  - (2) handles optional lines by `layout.totals.optionalWorksSection` (B-99), page numbers by `globalStyles.pageNumber` (B-75), header band page 1 / footer every page by default (B-77), and appends `ClientSignatureExecution` to an executed contract whose template has no `signature_block` section (B-86).
  - (3) prints the studio name, *"Signed quote"* / *"Quote (draft)"*, *"Client: <name>"*, *"Signed: <date time>"* or *"Generated: <date time>"*, *"Document hash: <hash>"*, a *"Description"* / *"Qty"* / *"Unit price"* / *"Total"* table (description, qty, unit price, line total only), *"Total"* = the sum of every row's `total` (optional rows included; omission rows subtracted on `/api/quotes/<id>/download`), then the signature block or the draft note and watermark (B-102); A4, 15 mm margins, Helvetica, no letterhead, no page numbers.
  - The digitizer's two legacy branches pass no `bankDetails` (`quote-digitizer-dialog.tsx:5345-5354, 5561-5570`) while the legacy share client and PATH 2 do — the same quote's bank block differs by surface (B-110).
  - Comments describe `@react-pdf` in the lambda as intermittent (`render-quote-pdf-server.ts:870-877`; the share client's header).
- Data: —
- States: *"Generating…"*; toast *"Failed to generate PDF"*.
- Words: *"Download PDF"* (*"Download"* hidden on small screens); file name *"Quotation - <lead name>.pdf"* (the legacy branch adds *" (<vendor>)"*); tooltip *"Quote must be approved before it can be shared"* when the studio feature `lock_quote_actions_until_approved` (default off) is on and the quote is not approved.
- Reachable: yes.

### B-82 · The canonical PDF object — writers, readers, lock, invalidation
- Where: `src/lib/quote-canva/shared-quote-pdf.ts:24-104`; `src/lib/quote-canva/serve-shared-quote-pdf.ts:45-84`; `src/app/api/quotes/share-to-portal/route.ts:15-145`; digitizer `quote-digitizer-dialog.tsx:5429-5481, 5659-5746, 9505, 10510, 10532`; `src/app/api/quotes/request-signature/route.ts:884-975`; `src/app/api/quotes/[id]/transition/route.ts:255, 280-326, 376-416`; `src/lib/quote-signatures/apply-on-approval.ts:108-223`; `src/app/api/homeowner/engagement/[linkId]/document/route.ts:150-259`; `scripts/migrations/233_privatize_sensitive_buckets.sql:19-22`.
- Entry: the writers and readers below.
- Does: one stored PDF per quote — bucket `shared-quotes`, object `{studioId}/{quoteId}.pdf`. Writers: the digitizer's canva Download (pre-approval), the freeze after Submit for review and Approve, *Send to homeowner portal* and *Re-sync PDF* (all `POST /api/quotes/share-to-portal`, `storeOnly` for the silent ones); the lead drawer's legacy share (flag off); send-for-signature when no object exists or on *regenerate*; the VO approval re-render; the designer-signature bake (overlay, overwrite); the self-heal renders in `resolveSharedQuotePdf` (downloads, bake) and in the portal engagement route. Readers: the signing page (public URL + `?v=<updated_at>`), the signing PDF route (bytes), `/api/quotes/<id>/download`, `/api/leads/<lead>/quote/download?source=draft:`, the homeowner portal's quote list and engagement document, the executed-contract overlay (B-86), the bake (B-85).
- Rules:
  - Public: the bucket is created `public: true` and migration 233 keeps `shared-quotes` public — the object URL (studio id + quote id) opens with no token, session or OTP.
  - Lock: once `quotes.prepared_by_signature` is set, share-to-portal ignores posted bytes and returns the existing URL, `storeOnly` included — *Re-sync PDF* on a baked quote reports success without changing the file.
  - Invalidation: a transition to `draft` (revise) or `rejected` deletes the object, drops `portalSharedQuotes[quoteId]` and clears `prepared_by_signature`.
  - The OTP share link does not serve it; it renders live (B-92).
  - The engagement self-heal render passes no `quoteId` (no quote-row schedule, number, stored date, prepared-by, VO context or designer signature) and reads items without `highlight_color` / `is_omission`, then stores the result as the canonical.
  - Existence checks run one `storage.list({ search, limit: 1 })` per quote (no folder paging).
- Data: storage object; `leads.quote_metadata.portalSharedQuotes`; `quotes.prepared_by_signature`.
- States: —
- Words: *"Re-sync PDF"* / *"Syncing…"*, title *"Push the current design to the homeowner portal & signing page without re-sending"*, *"Quote PDF synced — the homeowner portal & signing page now show this version"*, *"Couldn't sync the quote PDF — please try again"*; *"Send to homeowner portal"* / *"Sharing…"*, *"Save the quote first to share it"*, *"Add line items before sharing"*, *"Add the client's phone number first — they sign in to the portal with it"*, *"Quote shared — now visible in <name|the client>'s portal"*, *"Quote shared to <name|the client>'s portal (itemized view — PDF preview couldn't be generated)"*, *"Failed to share to the homeowner portal"*.
- Reachable: yes. The portal screens are hand-off (portal audit).

---

## Signed PDF

### B-83 · Signature slot markers and the pdf-lib overlay
- Where: `src/lib/quote-canva/overlay-signature.ts:1-260`; marker markup `blocks/signature-footer.tsx:204-228`; slot assignment `signature-footer-columns.ts:101-110`; `pdf-lib` ^1.17.1 (`package.json:114`).
- Entry: the designer bake (B-85) and the executed contract (B-86).
- Does: on the HTML / PDF path each signing column's first child is an empty `<a href="om-sigslot:prepared_by|client" aria-hidden>` block, as wide as the signature rule and `34pt` tall (the space above the rule). Chromium's `page.pdf()` turns each into a Link annotation with its after-pagination `/Rect`. `overlaySignatureOnCanvaPdf(pdfBytes, { slot, imageBytes, imageFormat })` loads the PDF, finds every Link annotation on every page whose action is `/S /URI /URI (om-sigslot:<slot>)`, embeds the PNG / JPG, draws it scaled to fit the rect inset 4 pt on each side and centred, removes the stamped annotations and saves.
- Rules: no marker for the slot → the input bytes, unchanged (pre-marker canonicals, `@react-pdf` and jsPDF documents); image fails to embed → unchanged; a marker that fails to draw stays; save failure → the original bytes; an unreadable PDF throws to the caller. Every occurrence is stamped (a repeating signing footer carries one marker per page). The editor canvas never emits markers. `findSlotRects(doc, slot)` returns page index + raw rect.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### B-84 · Which footer column carries which signature
- Where: `src/lib/quote-canva/signature-footer-columns.ts:12-110`; render `blocks/signature-footer.tsx:229-305, 321-375, 413`.
- Entry: every `signature-footer` render with a signature in ctx, and every marker emission.
- Does: a column is the **client** column when its heading or body lines contain `{client_name}`, `{client_phone}`, `{client_email}` or `{client_address}`; the **designer** column when they contain `{prepared_by}`; otherwise by convention — client right, designer left. If both want the same column, the explicitly tokened signature keeps it and the other moves across (the client wins an untokened tie). Markers mirror this assignment assuming both signatures exist. A captured signature prints as a 34 pt image sitting on the rule (`alt` *"Signature"*); under the labels a caption *"Signed by <name>"* (client) or *"Prepared by <name>"* (designer) · date.
- Rules: the caption date uses `toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })` — the rendering machine's locale; the three-column layout's centre column is always the page placeholder (no marker, no signature — B-75); `lineWidthPt` 80–360 pt, clamped to the column.
- Data: `ctx.signedSignature`, `ctx.preparedBySignature`.
- States: —
- Words: *"Signature"*, *"Signed by <name>"*, *"Prepared by <name>"*, *"Signed"*, *"Prepared"*.
- Reachable: yes.

### B-85 · Designer "prepared by" signature bake at finalize
- Where: `src/lib/quote-signatures/apply-on-approval.ts:12-227`; `src/lib/quote-signatures/resolve-signer.ts:3-8`; `prepared-by-signature.ts:5-29`; triggers `src/app/api/quotes/[id]/transition/route.ts:271-278`, `src/app/api/quotes/records/[id]/route.ts:153-160`, `src/app/api/tasks/records/[id]/approve/route.ts:111-118`, `src/app/api/quotes/request-signature/route.ts:884-892`; lock `share-to-portal/route.ts:56-78`; reset `transition/route.ts:255`; render use `render-quote-pdf-server.ts:698-721`.
- Entry: a quote moving to `submitted` or `approved` (transition, record PATCH, task approval) and send-for-signature (non-VO quotes).
- Does: once per quote — skips when `prepared_by_signature` is set; signer = `submitted_by ?? created_by`; needs that member's active `member_signatures` row with `auto_apply`; downloads the image from the private `member-signatures` bucket and hashes it (SHA-256); loads the canonical, or self-heals it via `resolveSharedQuotePdf`; requires a `prepared_by` marker (else stops without writing); writes `{ memberUserId, storagePath, sha256, signerName (profile full name), role (member title ?? specialty), appliedAt, appliedByUserId }` to `quotes.prepared_by_signature` **first** (this switches on the canonical lock), then overlays the image at the marker and upserts the canonical.
- Rules: never throws; JPG when the storage path ends `.jpg` / `.jpeg`, else PNG. A quote whose server self-heal prints legacy (strict, B-80) has no marker → never baked. Revise or reject clears the snapshot, so the next finalize bakes again. Later server renders of a baked canva quote also paint the signature through the ctx. The self-heal's item select omits `highlight_color` and `is_omission` (:15-16).
- Data: `quotes.prepared_by_signature`, `member_signatures`, `studio_members.title` / `specialty`, `profiles.full_name`.
- States: —
- Words: —
- Reachable: yes (studios whose members have an active auto-apply signature).

### B-86 · Executed contract PDF at client signing
- Where: `src/lib/quote-canva/signed-quote-pdf.ts:1-251`; caller `src/app/api/sign/[token]/submit/route.ts:616-651`; legacy stamp `src/components/leads/quote-pdf.tsx:4375-4406`.
- Entry: the client submits a signature on `/sign/<token>` (signing flow — hand-off).
- Does: `renderAndStoreSignedQuotePdf` — for `signing_mode === "single"` with a decodable signature (`data:image/png|jpeg;base64,…`) it downloads the canonical, checks for a `client` marker and overlays the signature (no re-render); otherwise it renders through `renderQuoteCanvaPdfBuffer` from the request's frozen `quote_snapshot` items and frozen `payment_schedule` with `signedSignature { dataUrl, signerName (typed name ?? client_name), signedAt }`. Stores bucket `signed-quotes`, object `{signatureRequestId}.pdf` (upsert) and writes the bucket's public-URL form to `quote_signature_requests.signed_pdf_url`. `getOrRenderSignedQuotePdfBuffer` serves the stored object, else renders and stores (backfill).
- Rules: bundle / variations signings never take the overlay path (B-114). The overlay copy is whatever the canonical showed, so the client's optional-item choices on the signing page are not reflected (B-99). PATH 2 appends `ClientSignatureExecution` when the template has no `signature_block` section. Never throws; `null` when nothing renders.
- Data: `quote_signature_requests.quote_snapshot`, `payment_schedule`, `signature_data`, `signed_at`, `signed_pdf_url`.
- States: —
- Words (legacy stamp): *"Signed by <name|Client> · <date>"*, *"Company Representative & Date"*.
- Reachable: yes.

### B-87 · Signed-PDF downloads and bucket access
- Where: `src/app/api/quotes/signed-quote/[id]/route.ts:8-54`; `src/app/api/sign/[token]/download/route.ts:1-88`; `src/app/api/leads/[id]/quote/download/route.ts:71-87`; `src/lib/storage-sign.ts:76-78`; `src/lib/signing/build-signed-packet.ts:1-13, 294, 397-410`; `scripts/migrations/233_privatize_sensitive_buckets.sql:27-32`, `234_rollback_209_233_tenant_locks.sql:36-39`.
- Entry: the studio's "signed" download source, the `quote.signed_by_client` email link, the client's signed download.
- Does: `GET /api/quotes/signed-quote/<id>` (studio) — session required, RLS-scoped read of `signed_pdf_url`, then a 302 to a freshly signed storage URL (default 1 h). `GET /api/sign/<token>/download` (client) — only for `signed` requests with `signer_phone` set (OTP proof); streams the stored (or backfilled) executed PDF as the attachment `signed-quote-<client name, spaces → _, lower-case>.pdf`. The lead download `source=signed:<id>` 302s to the client route. The signed packet merges an audit certificate and each signing document into `signed-quotes/{id}-packet.pdf`, reusing the same executed PDF.
- Rules: migration 233 made `signed-quotes` private (the raw public URL 404s); 234 is an emergency rollback that makes it public again — which applies to a given database is not visible in code (B-115).
- Data: `quote_signature_requests.signed_pdf_url`, `signed_packet_path`.
- States: *"Signed quote not found"* (404), *"Could not sign the document"* (500), *"Quote not yet signed"* (409), *"Verify your phone to download the signed quote."* (403), *"Failed to generate PDF"* (502 / 500).
- Words: —
- Reachable: yes.

---

## Share link, preview token & OTP

### B-88 · The share token and its mint routes
- Where: `quotes.preview_token`, `preview_token_created_at` (hand-off D, D-65 / D-139) and `preview_view_count` (`scripts/migrations/187_quote_preview_view_count.sql:9-10`); `src/app/api/quotes/preview/route.ts:6-56`; `src/app/api/quotes/share-link/route.ts:7-83`; `src/app/api/quotes/[id]/share-link/route.ts:26-159`; hooks `src/lib/queries/quote-share-link.ts:1-42`; public routing `src/proxy.ts:221, 322`.
- Entry: the digitizer's *"Copy preview link"* — the only live UI caller (B-89).
- Does: one token per quote opens **two** public surfaces, both looked up by `preview_token`: `/quote/<token>` (OTP-gated live PDF — B-90…B-92) and `/quote-preview/<token>` (no OTP, live HTML — B-93). Mint routes — all need a studio session, scope the quote by `studio_id` and reuse an existing token: `POST /api/quotes/preview { quoteId }` (token = two UUIDs concatenated, the second without dashes); `POST /api/quotes/share-link { quoteId }` (legacy, no caller; 48-hex token; returns `shareUrl` = `<base>/quote-preview/<token>`); `POST /api/quotes/<id>/share-link { regenerate? }` (48-hex token; `regenerate: true` mints a new one, resets `preview_view_count` to 0 and the old URL 404s).
- Rules: no expiry — `preview_token_created_at` is written, never read; the only revocation is rotation, which has no mounted UI (`useRegenerateShareToken` is used only by the unmounted popover). A revise-to-draft leaves the token alive (B-93).
- Data: `quotes.preview_token`, `preview_token_created_at`, `preview_view_count`.
- States: 401 *"Unauthorized"* / *"Not authenticated"*; 400 *"quoteId required"* / *"quoteId is required"* / *"Quote id is required"* / *"Invalid request body"*; 404 *"Quote not found"*; 500 *"Failed to create preview link"* / *"Failed to create share link"* / *"Couldn't generate link"* / *"Internal error"*.
- Words: —
- Reachable: `/api/quotes/preview` yes; the other two by API only.

### B-89 · Studio entry points — the Share menu and the unmounted "Share Live Link" popover
- Where: digitizer share menu `quote-digitizer-dialog.tsx:6753-6817`, handler 1548-1578; `src/components/leads/quote-canva/share-live-link-popover.tsx:1-153`.
- Entry: the share icon in the digitizer header — desktop widths only (`hidden md:inline-flex`), shown for a saved quote that is not a variation order.
- Does: a popover with *"Copy preview link"* (mints / reuses the token through `/api/quotes/preview` and copies `<origin>/quote-preview/<token>` — the no-OTP page), *"Send to homeowner portal"* and *"Re-sync PDF"* (B-82). The *"Share Live Link"* popover written for `/quote/<token>` (generate, copy, WhatsApp / email, stats, regenerate) is imported nowhere: no live UI builds a `/quote/<token>` URL, though the copied token opens that page too.
- Rules: enabled only for `approved`, `sent_for_signature`, `client_signed` and not while an uploaded PDF is being parsed; the button's title says why. A clipboard failure shows the URL in the toast instead.
- Data: —
- States: —
- Words: menu — title *"Share quote"*, disabled reasons *"Wait for the upload to finish before sharing"* / *"Quote must be approved before it can be shared"*, items *"Copy preview link"*, *"Send to homeowner portal"*, *"Re-sync PDF"*; toasts *"Save the quote first to share a live preview"*, *"Live preview link copied"*, *"Live preview: <url>"*, *"Failed to create preview link"*. Unmounted popover — *"Share Live Link"*, *"Generate a live link for this quote. Anyone with the link + an OTP can view the latest version of the PDF."*, *"Generate live link"* / *"Generating…"*, *"Live link"*, *"Copied!"*, *"Share via WhatsApp"*, *"Send via email"*, *"Anyone with the link + SMS OTP can view. Session lasts 30 days per visitor."*, *"Created <today|1d ago|Nd ago> · <n> views"*, *"Regenerate link"* / *"Regenerating…"*, confirm *"Anyone using the old link will lose access. Continue?"*, message *"Hi <name|there>, here's the latest quote for your renovation:\n<link>\n\nYou'll need an OTP code via SMS to view — sent when you open the link."*, email subject *"Your renovation quote"*.
- Reachable: the menu yes; the popover no.

### B-90 · `/quote/[token]` page and metadata route
- Where: `src/app/quote/[token]/page.tsx:1-117`; `src/app/api/quote/[token]/route.ts:1-76`; public in `src/proxy.ts:221`.
- Entry: a `/quote/<token>` URL, typed or pasted (B-89).
- Does: the client page resolves the token, calls `GET /api/quote/<token>` → `{ valid, revoked, hasSession, studioName, quoteTitle, countryCode }`, then shows the OTP form under the studio name and quote title (B-91) or the PDF viewer (B-92). `quoteTitle` = `quotes.label` ?? `quote_number` ?? *"Quote"*; `studioName` falls back to *"Studio"*; `countryCode` to `SG` (it drives phone validation).
- Rules: a 404 clears the per-token cookie in the browser and shows the revoked state; quotes of any status are served.
- Data: `quotes.label`, `quote_number`, `studios.name`, `country_code`.
- States: *"Loading…"*; *"Something went wrong"* — *"Couldn't load this link. Try refreshing the page."*; *"Link unavailable"* — *"This link has been revoked. Contact the studio for an updated link."*
- Words: as above.
- Reachable: by URL.

### B-91 · OTP gate — request, verify, session cookie, rate limits
- Where: `src/app/quote/[token]/otp-form.tsx:1-144`; `src/app/api/quote/[token]/request-otp/route.ts:1-94`; `.../verify-otp/route.ts:1-119`; `src/lib/session.ts:242-299`; `src/lib/rate-limit.ts:8-37`; `src/lib/twilio.ts:11-18, 37-51, 153-158`.
- Entry: `/quote/<token>` without a valid cookie.
- Does: step 1 — the visitor enters **any** phone (checked against the studio region's format, never against the lead's phone) → Twilio Verify SMS; step 2 — a 6-digit code → an HttpOnly, SameSite=Lax cookie `quote_view_session_<first 16 characters of the token without dashes>` = base64 of `{ token, phone (E.164), verifiedAt }` + an HMAC-SHA256, max-age 30 days, `Secure` in production.
- Rules: rate limits are in memory per server instance, bucket = `quote-otp-req:` or `quote-otp-verify:` + `<token>:<e164>` + the client IP, 5 per 15 minutes; every verify attempt counts, not only failures. The server checks the HMAC and that the cookie's token equals the URL's; it never checks `verifiedAt`, so expiry is the browser dropping the cookie. A failed SMS still answers success (`smsFailed: true`) and the form moves to the code step. The shared Twilio helper's bypasses apply: `PHONE_OTP_BYPASS`, test numbers `+65 91234001–91234040` (no SMS), and a platform bypass code from Admin Settings that verifies any phone.
- Data: cookie; Twilio Verify.
- States: client — *"Please enter a valid phone number"* (+ *" — <reason>"*), *"Couldn't send OTP — try again."*, *"OTP must be 6 digits."*, *"Invalid OTP — try again."*, *"Couldn't verify OTP — try again."*; server — *"Phone number is required"*, *"Link not found"*, *"Invalid phone number"* (+ *": <reason>"*), *"Too many OTP requests. Please wait 15 minutes and try again."*, *"Phone and OTP are required"*, *"Invalid phone"* (+ *": <reason>"*), *"Too many failed attempts. Wait 15 minutes and request a new OTP."*, *"Invalid OTP. Please try again."*
- Words: *"Enter your phone number to receive an OTP"*, placeholder *"e.g. <region placeholder|91234567>"*, *"Send OTP"* / *"Sending…"*, *"Enter the 6-digit code we sent to <phone>"*, *"Back"*, *"Verify"* / *"Verifying…"*.
- Reachable: by URL.

### B-92 · `/api/quote/[token]/pdf`, the status poll and the viewer
- Where: `src/app/api/quote/[token]/pdf/route.ts:1-109`; `.../status/route.ts:1-59`; `src/lib/quote-share-link.ts:63-226`; `src/app/quote/[token]/pdf-viewer.tsx:1-128`.
- Entry: the viewer after OTP.
- Does: the PDF route checks the cookie → `fetchQuoteShareState` (quote by token; live `quote_line_items` — a primary quote without rows of its own falls back to the lead's rows with no `quote_id`; schedule; lead meta; studio; default template layout / theme; the render hash) → `304` when `If-None-Match` equals the hash → `409` without a lead or items → **renders live** with `renderQuoteCanvaPdfBuffer` (strict; not the canonical object) → bumps `preview_view_count` (fire-and-forget) → `200`, `inline; filename="<quote_number|label|quote>.pdf"` (non-word runs → `-`, ≤ 80 chars), `Cache-Control: private, max-age=60`, `ETag: <hash>`. The status route returns `{ stateHash, updatedAt, totalCents }` (grand total including optional lines). The viewer shows the PDF on a canvas, *"Download"* saves `<quoteTitle>.pdf`, the status poll runs every 30 s (skipped while the tab is hidden) and shows the update banner when the hash changes; *"Refresh"* refetches with `If-None-Match`.
- Rules: a quote whose lead has no persisted canva body prints the legacy `@react-pdf` design here while the digitizer and the canonical show the canva design (B-80); layout-only edits don't change the hash (B-72); with no stored date every fetch prints that day's date (B-79); no status filter; a baked canva quote shows the designer signature (PATH 1 ctx).
- Data: as B-72.
- States: 401 *"Unauthorized"*, 404 *"Not found"*, 409 *"Quote has no items to render."*, 500 *"Couldn't render PDF — contact the studio."* / *"Internal error"*; viewer *"Couldn't load the PDF. Please refresh."*
- Words: *"Quote updated. Refresh to see the latest version."*, *"Refresh"*, *"Download"*.
- Reachable: by URL.

### B-93 · `/quote-preview/[token]` — public live preview, no OTP
- Where: `src/app/quote-preview/[token]/page.tsx:1-282`; `src/app/api/quote-preview/[token]/route.ts:1-82`; public in `src/proxy.ts:322`; `src/lib/transformers.ts:858-918`.
- Entry: the link from *"Copy preview link"* (B-89).
- Does: an HTML page — not the designed PDF — that fetches `GET /api/quote-preview/<token>` every 5 s and shows: studio name, `quotes.label` or *"Quote"*, *"For <lead name>"*, a *"Live preview"* pill; a benchmark callout when lines carry `competitor_benchmark_cents`; a *"Description"* / *"Qty"* / *"Total"* table grouped by category (blank → *"Other"*), each row with photo, name (when it differs from the description), description, *"<qty> <unit>"* + *" · Optional"*, and the stored line total — or the upper-cased price type when it is not `amount`; a totals card from the stored `quotes.subtotal_cents`, `discount_cents`, `tax_cents`, `total_cents` (Discount and Tax only when above 0); footer *"Last updated <time> • refreshes every 5s"*.
- Rules: no session, no OTP, no expiry; statuses `rejected`, `cancelled`, `archived` → 410; tokens under 16 characters → 400; lines only by `quote_id` (no fallback to lead-level rows). The JSON carries every line through `transformQuoteLineItem` — including cost price, margin %, notes, comments, AI suggestion, vendor, waste %, cost type, creator and competitor fields — plus `quotes.notes`, `doc_sections` and `payment_schedule` (B-98). A quote revised back to `draft` keeps serving its live, unapproved edits.
- Data: as above.
- States: *"Preview unavailable"* with *"This preview is no longer available."* (410), *"Preview not found. The link may have been revoked."* (404) or *"Failed to load preview."*; *"No line items yet."*; *"Loading…"*; API *"Invalid token"*, *"Lookup failed"*, *"Not found"*, *"Quote no longer available"*.
- Words: callout *"This quotation is <pct>% below the <source|market> benchmark — saving you approximately <amount>."* (hidden when the studio total isn't below the benchmark or the saving rounds to 0 %); totals *"Subtotal"*, *"Discount"*, *"Tax"*, *"Total"*.
- Reachable: yes.

### B-94 · Accounts › Quote Sharing — stored, never read
- Where: `src/app/(main)/accounts/page.tsx:105` (menu item), 1451-1607 (tab); type `src/types/app.ts:624-627`.
- Entry: Accounts › Quotes & Pricing › *Quote Sharing*.
- Does: writes to `studios.settings`: `quoteSharingMethod` (`both` default, `standalone`, `portal`), `quoteLinkExpiryDays` (7 / 14 / 30 / 60 / 90, default 30) and four booleans — `quoteShare_showOptionalToggles`, `quoteShare_showPaymentSchedule`, `quoteShare_showVariations`, `quoteShare_showPoweredBy` (on unless `false`).
- Rules: no code outside this tab reads any of the six keys (repository-wide search), so none changes what a client sees: the digitizer always offers both *"Copy preview link"* and *"Send to homeowner portal"*; standalone links never expire (B-88) and signing links expire after a fixed 7 days (`request-signature/route.ts:358`); the signing page's optional add-ons show whenever optional lines exist (B-99); no quote surface prints a "Powered by" line (B-101); no share surface has variation tabs. The type says `quoteSharingMethod?: "link" | "pdf" | "both"` while the tab writes `both | standalone | portal`, and documents `quoteLinkExpiryDays` as the signing link's validity.
- Data: `studios.settings.*` above.
- States: toasts *"Sharing preference updated"*, *"Failed to save sharing preference"*, *"Link expiry set to <n> days"*, *"Failed to save link expiry"*, *"Updated"*, *"Failed to save"*.
- Words: *"Quote Sharing"* — *"Configure how quotes are shared with homeowners."*; *"Sharing Methods"* — *"Choose which sharing options your team sees when sharing quotes with homeowners."*; *"Both Methods (Recommended)"* — *"Team can choose between standalone link or homeowner portal link when sharing. Best for flexibility."*; *"Standalone Link Only"* — *"Only show the quick shareable link option. Best for studios that don't use the homeowner portal."*; *"Homeowner Portal Only"* — *"Only show the portal link option. Best for studios that want all clients using the portal."*; *"Standalone Link Expiry"* — *"How long standalone quote links remain active before expiring."* (*"<n> days"*); *"Standalone Link Features"* — *"Control what homeowners can see and do on the standalone quote page."*: *"Show optional item toggles"* — *"Homeowners can toggle optional add-ons on/off"*; *"Show payment schedule"* — *"Display the payment milestone breakdown"*; *"Show quote variations"* — *"If multiple packages exist, show tabs to compare"*; *"Show "Powered by OpenMaison""* — *"Display the platform attribution in the footer"*.
- Reachable: the tab yes; its effect none.

### B-95 · Preview pop-out — not a share surface
- Where: `src/app/(main)/leads/[leadId]/quote-preview-popout/page.tsx:1-147`; opener `quote-digitizer-dialog.tsx:1601-1611`.
- Entry: B-56.
- Does: B-56. It sits under `(main)` (studio session), receives the digitizer's rendered PDF `Blob` over a same-origin `BroadcastChannel` named `quote-preview-<leadId>-<quoteId>` and carries no token — a client cannot open or be sent it.
- Reachable: yes (studio only).

### B-96 · Share-link audit trail and view counter
- Where: `src/app/api/quotes/[id]/share-link/route.ts:111-116, 145-152`; `src/app/api/quotes/share-link/route.ts:66-72`; `src/app/api/quote/[token]/request-otp/route.ts:78-87`; `.../verify-otp/route.ts:79-100`; counter `.../pdf/route.ts:88-95`; test contract `src/__tests__/quote-share-link-audit-log.test.ts:1-28`.
- Entry: —
- Does: the "audit log" is structured `console.info` lines only — no table: token minted (quote, studio, user, regenerate, had-existing, 8-character token prefix), existing token returned, OTP sent (8-character prefix, last 4 phone digits, IP, `smsFailed`), OTP verification failed, session granted (+ `verifiedAt`). The legacy `/api/quotes/share-link` logs the full token. `preview_view_count` rises by a read-then-write on each `200` PDF response (not on `304`); only the unmounted popover would show it.
- Data: server logs; `quotes.preview_view_count`.
- States: —
- Words: log keys *"[quotes/share-link POST] token minted"*, *"[quotes/share-link POST] returning existing token"*, *"[quote/request-otp] otp sent"*, *"[quote/verify-otp] otp verification failed"*, *"[quote/verify-otp] session granted"*.
- Reachable: yes (server side).

---

## Client-visible vs internal

### B-97 · What never reaches the page — and what reaches it by accident
- Where: `render-to-html.tsx:234-235, 307-327, 613-617`; `QuoteBlock.tsx:42-97`; `src/lib/quote-canva/block-schema.ts:509-523`; `CanvaEditor.tsx:865-880`.
- Entry: every canva render.
- Does: never printed — blocks with `hidden: true`; editor chrome (selection outlines, hover toolbars, slot tree, lock toggles); page-break markers (zero height); the page-indicator's preview label (`@media print`); the blocks' free-positioning fields (`freePositioned`, `fpX` …), declared on the block type and read by no canva code. Printed by accident — a block of an unregistered type or with a throwing `render` prints the diagnostic box and its texts (B-67).
- Rules: the canva pricing table has no line-level "hide on PDF" flag; a line prints unless the table's own display rules replace its amount (non-numeric markers, zero-amount display — B-18).
- Reachable: yes.

### B-98 · Cost, markup, margin, internal notes and other internal fields
- Where: `render-quote-pdf-server.ts:98-133`; `block-schema.ts:42-45` (`items: QuoteLineItem[]`); `blocks/pricing-table.tsx:1415, 1482-1484, 1531-1542, 2002-2009, 2039-2040`; `src/lib/quote-canva/pricing/optional-rendering.ts:39-78`; `src/components/leads/focused-grid/line-items-grid.tsx:489-490`; `src/app/api/quote-preview/[token]/route.ts:49-81` with `src/lib/transformers.ts:858-918`; `src/components/leads/discount-edit-drawer.tsx:24`; `src/app/api/sign/[token]/preview-pdf/route.ts:22-26, 178-182`.
- Entry: every render and the public preview JSON.
- Does: on the canva PDF the pricing table reads a line's `id`, `name`, `description` / `descriptionHtml`, `category`, `subcategory`, `qty`, `unit`, `unitPrice`, `total`, `priceType`, `amountMarker`, `isOptional`, `isOmission`, `imageUrl`, `highlightColor` — plus `notes` for optional lines (below). `RenderContext.items` is the full `QuoteLineItem`, and the server mapper carries `costPrice`, `wastePercent` and `notes` into it, so cost reaches the renderer (B-58 says there is no cost field) — but no block paints cost, markup / margin %, waste, vendor, cost type, comments or AI suggestions. Item photos print as thumbnails beside the description when *"Show item photos"* is on (default on, 18 pt).
- Rules:
  - Line notes: the Items grid's *"Notes"* column header carries the tooltip *"Internal notes (not shown on PDF)"*, yet the pricing table prints them on optional lines when *"Show reason notes"* is on with *"Reason source"* = *"Item notes field"* — as *"(<label> : <notes>)"*, label default *"Reason"*. Off in the block defaults, Minimal and Branded; **on** in the Centered Premium starter (`reference-templates.ts:386`, `fieldSource: "notes"`), so a quote on that starter prints the notes of its optional lines.
  - The public `/api/quote-preview/<token>` JSON returns every line's cost price, margin %, notes, comments, AI suggestion, vendor, waste %, cost type, creator and competitor benchmark, plus `quotes.notes` — without sign-in (B-93); the page itself shows only the aggregate benchmark callout.
  - A line's discount label: the drawer's comment says it *"surfaces on the PDF when set"*, but no renderer reads it (canva prints part-level labels; legacy prints the % or amount in its Discount column).
  - Client PII (phone, email, address, IC, customer id) prints wherever a meta-kv row or token asks; the signing PDF route treats that PDF as PII (OTP gate — *"Verify your phone before viewing the quote PDF."*) while the same bytes sit at the public canonical URL (B-82).
- Data: `quote_line_items.*`, `quotes.notes`.
- States: —
- Words: *"Internal notes (not shown on PDF)"*; knobs *"Show reason notes"*, *"Reason label"* (placeholder *"Reason"*), *"Reason color"*, *"Italic reason text"*, *"Reason source"* (*"Item notes field"*, *"Description suffix 'Reason: …'"*) — *"Where the reason text comes from: the item's Notes field, or text appended after its description."*; *"Show item photos"* — *"Paints the photo attached to a line item (Items tab → item → upload) as a thumbnail beside its description. Rows with no photo are unaffected."*
- Reachable: yes.

### B-99 · Optional lines on print and on client surfaces
- Where: `blocks/pricing-table.tsx:691-697, 784-803, 1790-1794, 1810-1814, 1995-2001`; `src/lib/quote-canva/pricing/optional-rendering.ts:39-58`; `src/lib/quote-canva/pricing/group-subtotal.ts:44-61`; `src/lib/quote-calc.ts:309-420`; `reference-templates.ts:180-185, 381-382, 612-613`; legacy `quote-pdf.tsx:3176-3200, 4441-4456, 3545-3549`; jsPDF totals `src/app/api/quotes/[id]/download/route.ts:156-160`; signing page `src/app/sign/[token]/page.tsx:422-423, 994-1016, 1068-1095`.
- Entry: lines with `is_optional`.
- Does: the canva table's `optional.mode` — `inline-with-tint` (block default; Minimal and Branded): optional rows print in the main amount column on a tinted row (`#F4F8FE`), by block default with a red amount (`#D32F2F`) and an *"OPT"* badge (Minimal and Branded print the amount in `#1A1A1A` and hide the badge), and they are **included** in section subtotals, Subtotal, GST and Grand Total (`computeQuoteTotals` sums every line; only its `requiredTotal` leaves optional lines out); `separate-column` (Centered Premium: tint `#E3F2FD`, red amount, badge, reason notes on): the price prints in the Optional Price column, the main cell stays empty, the line is left out of section subtotals and the main totals, and an *"Optional Works"* row with the pre-tax optional subtotal prints after the Grand Total. B-18's "excluded from every total" holds only for `separate-column`.
- Rules: legacy `@react-pdf` — `layout.totals.optionalWorksSection { enabled, includeInTotal }`: enabled and not included → optional lines leave the main table and totals for an Optional Works block (pre-tax subtotal); otherwise they stay in the table and the totals; *"OPT"* badge. jsPDF — listed and summed into *"Total"*. `/quote-preview` — listed with *" · Optional"*; totals from stored `quotes.*_cents`. Share status `totalCents` — the grand total including optional lines. Signing page (single mode) — when optional lines exist it adds *"Optional Add-ons"* with accept / decline toggles and its own running total (required + accepted optional lines), sent as `clientSelections.optionalItemsAccepted`; the designed PDF shown above it, in `inline-with-tint` mode, already counts every optional line in its Grand Total, and the executed PDF (the canonical plus a stamp) does not reflect the choices (B-86). The Accounts toggle *"Show optional item toggles"* is unread (B-94).
- Data: `quote_line_items.is_optional`; `quote_signature_requests.client_selections`.
- States: —
- Words: *"Rendering mode"* (*"Separate Optional Price column"*, *"Inline with row tint"*) — *"Separate column prices optional items in their own column. Inline with tint keeps them in the main column on a tinted row."*; *"Row tint (inline mode)"*, *"Total color"*, *"Show OPT badge"*; *"Subtotal"*, *"Grand Total"*, *"Optional Works"*, *"OPT"*; signing page *"Optional Add-ons"*, *"Toggle items you would like to include"*, *"<n> of <m> accepted"*.
- Reachable: yes.

### B-100 · Highlights on print
- Where: `blocks/pricing-table.tsx:1405-1406`; `src/lib/quote-canva/line-highlight.ts:61-215`; `rich-text-content-css.ts:76-88, 139-146`; legacy `quote-pdf.tsx:3496, 3510, 3528-3536`; item selects `apply-on-approval.ts:15-16`, `src/app/api/leads/[id]/quote/download/route.ts:34-35`, `src/app/api/homeowner/engagement/[linkId]/document/route.ts:174-178`, `src/app/api/quotes/request-signature/route.ts:848-852`; mapper `src/app/api/sign/[token]/preview-pdf/route.ts:69-133`.
- Entry: `quote_line_items.highlight_color`; `<mark data-color>` / `<span data-color>` in descriptions and prose.
- Does: a row highlight paints the whole row on the canva PDF with a luminance-picked foreground (B-18, B-53) and on the legacy PDF (the foreground is also threaded into rich descriptions); marks and text colours print in the palette's print hex (B-71). jsPDF and `/quote-preview` print no highlights.
- Rules: highlights are lost wherever items are read without `highlight_color` — the bake's and the lead download's self-heals, the portal engagement self-heal, send-for-signature's render (all store the result as the canonical), and the signing PDF's on-demand mapper. Reads that `select("*")` keep them: the share link, `/api/quotes/<id>/download`, the VO approval re-render, the signing snapshot.
- Data: `quote_line_items.highlight_color`, `description_html`.
- States: —
- Words: —
- Reachable: yes.

### B-101 · "Powered by" line
- Where: repository search for "Powered by" — `src/app/renders/[token]/page.tsx:267`, `src/app/pay/[token]/page.tsx:970`, `src/app/po/[token]/page.tsx:476`, `src/app/floor-plan/view/[token]/page.tsx:280-282`, `src/app/copilot/share/[shareId]/page.tsx:72, 87, 193`, `src/components/homeowner/layouts/premium-layout.tsx:108`; toggle `accounts/page.tsx:1572-1575`.
- Entry: —
- Does: no quote surface prints a platform attribution — not the canva, legacy or jsPDF PDFs, `/quote/<token>`, `/quote-preview/<token>` or the signing page. The Accounts toggle *"Show "Powered by OpenMaison""* (default on) is read nowhere. The homeowner portal's premium layout prints *"Powered by OpenMaison"* in its footer unconditionally (portal, hand-off); other public pages (renders, pay, PO, floor plan, copilot share) carry their own lines.
- Reachable: absent on quote surfaces.

### B-102 · Status and draft marking on printed quotes
- Where: `render-to-html.tsx:561-573, 652`; `src/lib/quote-pdf.ts:56, 61-70, 127-191`; `src/app/api/quote-preview/[token]/route.ts:6, 31-33`; `src/app/api/sign/[token]/preview-pdf/route.ts:164-169`.
- Entry: —
- Does: the canva and legacy PDFs carry no status marking — a draft prints like an approved quote unless the template sets watermark text (Document panel, B-50: 96 pt, weight 900, black at the chosen opacity, rotated, centred, `position: fixed`). The jsPDF renderer marks drafts with *"Quote (draft)"*, *"Generated: <date time>"*, *"This is a draft quote — it has not yet been signed by the homeowner. Issue via the in-app signing flow to obtain a legally executed copy."* and a diagonal 72 pt light-grey *"DRAFT — NOT YET SIGNED"* on every page; signed mode prints *"Signed quote"*, *"Signed: <date time>"*, *"Document hash: <hash>"*, *"Signed by:"*, the signature image, the client name and *"This document is a system-generated copy of the signed quote. The original signature was captured digitally and the document hash above can be used to verify integrity."*
- Rules: `/quote/<token>` serves any status; `/quote-preview/<token>` refuses only `rejected`, `cancelled`, `archived`; the signing PDF route refuses `cancelled` / `expired` requests and a passed `expires_at` (*"Quote is <status>"*, *"Quote expired"*).
- Reachable: yes.

---

## Docs vs code discrepancies

### B-103 · Spec 2026-06-01 "Quote Editor — Canva-mode (click-to-edit + drag-anywhere)" vs code
- Where: `docs/superpowers/specs/2026-06-01-quote-editor-canva-mode-design.md`; code `src/components/leads/quote-document-editor.tsx:82-84, 5593-5610, 6508-6570`, `src/components/leads/quote-editor/zone-overlay/{ZoneOverlay.tsx,extract-zones.ts,classify-runs.ts}`.
- Does: this spec's "Canva-mode" is not the block engine of this slice. It overlays eight click zones on the pdfjs-rendered legacy PDF and adds cross-context drag between `QuoteDocSection`s and pricing-table `InlineInsert`s — built in the legacy document editor (hand-off A). Its "PDF output is byte-identical … editor-only" refers to the legacy renderer.
- Rules: the one data item it introduced, per-quote `leads.quote_metadata.categoryOrder`, is honoured by the canva server render and PATH 2 (`render-quote-pdf-server.ts:401-411, 738, 956`).
- Reachable: legacy editor (hand-off A).

### B-104 · Spec 2026-06-02 "Canva-Mode Quote Editor" — blocks, data model, rollout vs code
- Where: `docs/superpowers/specs/2026-06-02-canva-mode-quote-editor-design.md:78-173, 207-321, 371-389`; code `blocks/index.ts:7-35`, `block-schema.ts:413-436, 531-565`, `CanvaEditorHost.tsx:201-233`, `src/app/(main)/tools/quote-template-sandbox/page.tsx`, `quote-pdf.tsx`.
- Rules (spec → code):
  - 25 block types in four categories including `decoration` → 23 registered blocks in three zones (`header | body | footer`): `salutation`, `closing-text`, `signature-block`, `callout`, `two-column`, `cover` absent; `cover-page`, `signature-footer`, `page-break`, `payment-milestones` added.
  - BlockNote as editor chrome and slot tree → BlockNote appears only in the owner-only sandbox; the slot tree is custom dnd-kit (B-44).
  - Per-quote `blockOverrides` (partial props per block), `pageRulesOverrides`, `globalStylesOverrides` renamed from `layoutOverrides` → `canvaOverrides[blockId][knobPath]` gated by `overridability[path]`; no page-rule overrides; `layoutOverrides` keeps its name (the editor ctx passes `null`; server and signing renders pass the stored value).
  - A default-overridable set (meta-kv labels, intro / subject / closing text, signature names, GST label, allowed non-numeric values, free image URL) → per-knob `overridableByDefault`; the reference templates ship `{ text, body, "plainText.body" }` (B-03).
  - `studio_document_templates_history` → not built (B-08).
  - Custom font upload deferred to V2 → uploaded fonts print (B-70).
  - P8 "`@react-pdf/renderer` code deleted, `quote-pdf.tsx` retired" → still present and used by PATH 2, the digitizer's legacy branches and the flag-off drawer share (B-81), though `canva_editor` defaults on (B-41).
  - Acceptance "zero drift between Playwright PDF and editor live preview" → canvas and print differ in places: the injected signing footer (B-69), uploaded fonts (B-70), live page numbers (B-75), repeated bands (B-77).
- Reachable: —

### B-105 · Spec 2026-06-02 — rendering and pagination vs code
- Where: same spec `:74-76, 90-120, 129-136, 248-256, 325-368, 397-411`; code B-67, B-73, B-75, B-77, B-78.
- Rules (spec → code):
  - Paged.js paginates both the browser preview and the server render ("same Paged.js → byte-identical") → the editor canvas is one long, unpaginated page; the preview pane shows the server PDF; Paged.js runs only on the server and only when a letterhead or footer band repeats.
  - `page.setContent(…, { waitUntil: 'networkidle' })` with a launch and close per render → `waitUntil: "load"` behind a resource guard, a browser disposed after every render, a serialized queue, an in-flow fallback.
  - `page-indicator` placements top-right / bottom-center / hidden → four knob placements (adds top-left), margin boxes routed to corners around bands.
  - `running-header` "repeats on pages 2+ via Paged.js `@top-center`" and `pageRules.runningHeader` / `runningFooter { blockId, fromPage }` → the block prints once, in flow, with `{n}` → "1"; the `pageRules` page-indicator / running-header / running-footer fields are typed (`block-schema.ts:540-555`) and read by no renderer.
  - "Limit Paged.js to page counters + running bands" → it also drives the table-header repeat (B-76); a 25 s timeout guards hangs.
  - Per-template PDF SHA-256 snapshot gate in CI → not verified (B-120).
- Reachable: —

### B-106 · Plan 2026-07-29 "Unified Canva Composer" vs code
- Where: `docs/superpowers/plans/2026-07-29-unified-canva-composer.md:5-7, 58-99`; code `compose-quote-body.ts`, `render-quote-pdf-server.ts:724-733`, `sign/[token]/preview-pdf/route.ts:1-35, 533-542, 687-713`, `apply-on-approval.ts:29-45`.
- Rules (plan → code):
  - Goal "so the server can render modern quotes (no `canvaBlocks`)" → reversed: server and signing renders pass `strictCanvaBody: true` and print legacy for those quotes (B-80).
  - Task 3 "bake guard uses `resolveCanvaBody`" → the bake no longer renders to stamp; it overlays onto the canonical and needs a marker (B-85).
  - Task 4 "a modern quote's View as PDF renders canva (design) not legacy when no stored object exists" → strict; the fallback is the bare jsPDF document, not even `QuotePDFDocument` (:687-713) — the route's own header comment (:12-20) still describes the full ladder.
  - "Composer is pure: no `new Date()` inside" → holds; callers pass `quoteDate` / `quoteDateISO`.
  - All render sites route through the composer → the digitizer, server PATH 1, the signing preview and `CanvaEditorHost` do; the share-link state (`quote-share-link.ts`) builds only the hash, not a ctx.
- Reachable: —

### B-107 · Plan 2026-05-25 "Quote PDF Phase 18" vs code
- Where: `docs/superpowers/plans/2026-05-25-quote-pdf-phase18.md:157-181, 272-280`; code `quote-digitizer-dialog.tsx:1587, 1975`, `quote-pdf.tsx:4434-4456`, `render-to-html.tsx:413-416`, `FIXES-REPORT-IDL-PAYNOW-ROUND3.md:242-245`.
- Rules (plan → code):
  - Section E per-quote override panel (`editorTab === "doc-layout"`, `quote-doc-layout-override-panel.tsx`, shared knob controls in `src/components/quote-pdf-layout/`) → none exists; the digitizer's tabs are `items | layout`; no writer of `quote_metadata.layoutOverrides` was found, while server, signing, share-hash and legacy renders still read a stored value.
  - Section B "legacy default path deleted" → `QuotePDFDocument` still prints the legacy paths (B-81).
  - `totals.optionalWorksSection { enabled, includeInTotal }` → in the legacy renderer (B-99); the canva table uses its own `optional.mode`.
  - Footer auto-height "Phase 19" → the canva print measures real band heights at render (B-73); the legacy footer estimate is not used on the canva path (`computePageReservations` gets footer repetition `never`).
- Reachable: —

### B-108 · Knobs and props the renderer ignores or reads differently
- Where: `blocks/page-indicator.tsx:38-49, 69, 116`; `page-counter-css.ts:122-162`; `blocks/running-header.tsx:29, 44, 70, 117`; `blocks/gst-line.tsx:29, 41`; `blocks/image.tsx:25, 38`; `render-to-html.tsx:40-69, 162-165, 237, 356-357`; `CanvaEditor.tsx:993-1003`; `blocks/signature-footer.tsx:97-120, 361-371, 382-384`; `signature-footer-columns.ts:117-124`; `block-schema.ts:514-523, 540-555`.
- Rules:
  - `page-indicator.skipFirstPage` — knob *"Skip cover / first page"*; only a `data-skip-first-page` attribute on the hidden preview div; the counter CSS never reads it, so page 1 is numbered.
  - `running-header.fromPage` — knob *"First page (1-based)"* (1–10, default 2); only a `data-from-page` attribute; the block prints once, in flow.
  - `gst-line.repeatOnEveryPage`, `image.repeatOnEveryPage` — no knob, but the partition obeys the stored prop: Minimal and Branded ship the GST line `true` (every page), Centered Premium `false` (once, at the end), and a studio cannot change it in the panel; a GST line without a boolean defaults to every page.
  - The `repetition` three-mode prop and the `header-band` type — read by the partition, produced by no block.
  - `pageRules.headerTopInsetMm` — the panel accepts 0–80 mm; print clamps to 40 mm.
  - `pageRules.pageIndicator`, `runningHeader`, `runningFooter` — typed, never read.
  - `signature-footer.centerColumn.heading` / `.body` — the centre column always renders as the page placeholder (the file's own note: "CONFIRMED DEAD").
  - Block free-positioning fields — read by no canva code.
  - `needsFallbackSignatureFooter` — exported, no caller.
  - Keep and repeat flags come from stored props, so a per-quote override of them (possible only if the studio unlocks the knob) changes neither the partition nor the keep wrappers.
- Reachable: the knobs yes; their effect no.

### B-109 · FIXES-REPORT-IDL-FOOTER-ROUND2 vs code
- Where: `FIXES-REPORT-IDL-FOOTER-ROUND2.md`; code `blocks/social-row.tsx:52, 99, 122`, `reference-templates.ts:454-460`, `CanvaEditorHost.tsx:453, 612`, `blocks/signature-footer.tsx:413`, `src/lib/quote-canva/footer/social-icons.ts:76`.
- Rules: matches code — `social-row.useBrandingLinks` defaults `false`, Centered Premium keeps `entries: []`, group Reset is one write (`handleKnobResetPaths` → `onKnobResetPaths`), `buildSocialHref` is still uncalled outside tests. Drift: the report cites the `lineWidthPt` schema at `signature-footer.tsx:377`; it is now `:413` (same `min: 80, max: 360`). Its test-state claims (e.g. `render-to-html-repetition.test.ts` "1 failure — in the baseline") are not verified (B-120).
- Reachable: —

### B-110 · FIXES-REPORT-IDL-PAYNOW-ROUND3 vs code
- Where: `FIXES-REPORT-IDL-PAYNOW-ROUND3.md`; code `src/lib/studio-branding.ts:295`, `quote-digitizer-dialog.tsx:1897, 5215, 8120, 5345-5354, 5561-5570`, `resolve-entity-paynow-qr.ts:107`.
- Rules: R3-1 (the entity's bank details beside the entity QR in the canva ctx and the `CanvaEditorHost` prop) and R3-3 (the `selectDefaultEntity` ladder) are in code as described (lines drifted: ctx bank at :5215, host prop at :8120). Its "not done" #5 still holds — the digitizer's two legacy branches pass no `bankDetails` (B-81). Its "known residual" (an entity with only an account number prints no bank name) matches the whole-blob rule (B-27). Its statement that the signing page, portal and signing PDF route serve the stored bytes first is true; the OTP share link does not (B-92).
- Reachable: —

### B-111 · Spec 2026-06-03 "Live PDF Shareable Link" vs code (not on the brief's list; the share routes cite it)
- Where: `docs/superpowers/specs/2026-06-03-live-pdf-shareable-link-design.md:35-47, 75-83, 91-129, 190-254, 262-275, 293-306`; code B-88…B-96.
- Rules (spec → code):
  - Token `crypto.randomUUID()` → 48 hex characters (`randomBytes(24)`) from the share-link routes; two UUIDs concatenated from `/api/quotes/preview`.
  - `[Share Live Link]` in the Quote Designer toolbar → the component exists, is never mounted; the live UI copies the no-OTP `/quote-preview/<token>` link instead (B-89, B-93) — the same token also opens the OTP page, so the OTP gate guards one of two doors.
  - Render via `<BrandedQuotePDF>` with a hash-keyed LRU (`render-quote-to-pdf-buffer.ts`) → every non-304 request renders live through `renderQuoteCanvaPdfBuffer`; the LRU module is unused (B-72).
  - Hash inputs `projectTitle` = `lead.project_title`, `quoteDate` = `quote.quote_date`, `milestones` = `quote.payment_milestones` → the lead name, `parsed_doc_metadata.date`, `quotes.payment_schedule`; the canva body is in neither list.
  - `useShareTokenStats()` and `src/lib/quote-view-session.ts` → absent; the session helpers live in `src/lib/session.ts`.
  - "Cookie expired (30d) → validation fails" → the server never checks `verifiedAt`; only the browser's max-age ends the session.
  - "Lead deleted → 'Quote no longer exists.'" → every 404 shows *"Link unavailable"* / *"This link has been revoked. Contact the studio for an updated link."*
  - OTP limits "5/phone/15min" (send) and "5/(phone+token)/15min" (verify) → both keyed by token + phone + IP, in memory per instance.
  - "Never auto-expires; studio revokes by rotating" → true; rotation has no mounted UI.
- Reachable: —

### B-112 · Code comments that contradict the code they sit on
- Where / Rules:
  - `render-to-html.tsx:207-208` — "`every-page` → lifted into `position: fixed`" — the bands are Paged.js running elements (:618-638).
  - `blocks/page-indicator.tsx:3-24`, `blocks/running-header.tsx:8-15` — "Pagedjs DROPPED", running header via `@top-center { content: element(running-header) }` — Paged.js runs for band documents; no stylesheet targets the running-header classes.
  - `src/app/api/quote-pdf/render/route.ts:14-16` — "Future phases (P3+) will add Paged.js … Today this is just the raw printToPDF path"; `:576-596` — bands "route through Playwright's `displayHeaderFooter` API" (corrected two lines later at :599-603) — the route runs Paged.js and never uses `displayHeaderFooter`.
  - `sign/[token]/preview-pdf/route.ts:12-20` — "even a MODERN quote with no persisted canvaBlocks renders the canva design … Only when the canva feature is OFF … legacy" — the same file passes `strictCanvaBody: true` (:542), so such quotes get the jsPDF fallback.
  - `lead-detail-drawer.tsx:558-561` — the server "falls back to the studio's default canva template, else TEMPLATE_DYEL" — the server is strict.
  - `tokens.ts:64-65` — page tokens "resolve at print time via @page rules" — they print "1".
  - `blocks/signature-footer.tsx:306-307` — "@page rules print real counter at PDF time" — the centre column prints *"Page 1 of 1"*.
  - `render-quote-pdf-server.ts:125-130` — dropping `highlight_color` "would make the highlight vanish on the SERVER render path … the studio download, and the faithful re-render" — the lead-download, bake and send-for-signature selects omit it (B-100).
  - `shared-quote-pdf.ts:5-8` — names two writers of the canonical; there are more (B-82).
  - `apply-on-approval.ts:32-33` — the overlay "works for EVERY canva quote" — only where the canonical carries a marker (B-85).
  - `discount-edit-drawer.tsx:24` — a line's discount label "surfaces on the PDF when set" — no renderer prints it (B-98).
- Reachable: —

---

## Uncertain / not verified

### B-113 · Page-break block insertion (B-34)
- Where: `SlotTree.tsx:130-132, 152-155, 162, 256-268, 305-316`; `toolbar/insert-palette.tsx:68`; `BlockInsertPicker.tsx:41-60`; `CanvaEditor.tsx:364-378, 482-495`; `migrate.ts:309-317`; `reference-templates.ts`.
- Does: the only inserter of a `page-break` block is `InsertPalette`, mounted only by `SlotTreeV4`; `CanvaEditor` passes the legacy prop shape, so `SlotTreeV4` never renders; `INSERTABLES` lacks it; migration turns a legacy `showPageBreakBefore` into a spacer's `pageBreakBefore` and creates no `page-break`; no reference template holds one. So a `page-break` prints only from bodies that already contain one — whether any stored body does cannot be told from code. The reachable forced break is the spacer's *"Page break before"* (B-74).
- Reachable: not through the live editor (static search).

### B-114 · Bundle / variations executed-contract fallback
- Where: `src/app/api/quotes/request-signature/route.ts:360-394`; `signed-quote-pdf.ts:188-218`; `render-quote-pdf-server.ts:98-133`.
- Does: bundle / variations requests store `quote_snapshot` as `{ quoteId, quoteNumber, quoteName, isPrimary, lineItems, total }[]`; their executed-contract path skips the overlay and passes `quote_snapshot` straight to `rawRowsToLineItems`, which expects line rows — each entry would become one line with no unit price (qty 1, category *"Others"*). What that prints was not exercised.
- Reachable: yes (multi-quote signings).

### B-115 · Deployment-state unknowns
- Rules: whether `signed-quotes` is private (migration 233) or public again (234) in a given database — `signed_pdf_url` stores the public-URL form either way (`signed-quote-pdf.ts:109-116`); whether `CRON_SECRET` is set (without it a server self-call to the print route carries no credential and gets 401 — `render-quote-pdf-server.ts:848`, `route.ts:265-274`); `INTERNAL_RENDER_ORIGIN`, `QUOTE_PDF_DRY_RUN`, `CHROMIUM_BINARY_URL`; the OTP bypasses (`PHONE_OTP_BYPASS`, the Admin Settings bypass code). None is visible in code.

### B-116 · Page-number boxes outside the Paged.js pass
- Rules: a document with no repeating band prints through a plain `page.pdf()`; its counter depends on Chromium 148's own `@page` margin-box support (`@bottom-center { content: counter(page) … }`), which the comments assume (*"Chromium honours these natively at PDF time"*, `render-to-html.tsx:504-506`). The same holds for the in-flow fallback. Not rendered to confirm.

### B-117 · Background image, watermark and page colour across pages
- Rules: the page background image (`.canva-print-root::before`, `position: fixed`) and the watermark (`.canva-watermark`, `position: fixed`) are expected to paint on every page; the background colour sits on `.canva-print-root` (`min-height: 100vh`) and on the band wrappers. Whether Paged.js's chunking repeats fixed elements on each page, and whether the colour fills pages after the first, was not verified.

### B-118 · Letterhead measurement width and Letter paper
- Rules: `MEASURE_LETTERHEAD_SCRIPT` measures `.canva-repeating-header` where it sits in the document before pagination (at whatever width it has then) and its rule overrides the probe's top margin; the probe assumes a 210 mm page even for Letter. The resulting top margins were not measured.

### B-119 · Self-heal item reads and variation orders
- Rules: the bake and lead-download self-heals read items without `highlight_color` and `is_omission`; the portal engagement self-heal also passes no `quoteId`. Code reading says a variation order healed there would treat every line as an addition; at approval the transition bakes first (`transition/route.ts:271-278`) and then re-renders the VO with `select("*")` (:376-416). The printed outcome was not exercised.

### B-120 · Test and CI claims
- Rules: no tests were run for this slice. Specs and reports claim per-template PDF snapshot gates (2026-06-02 spec), a failing `render-to-html-repetition.test.ts` in the round-2 baseline and a flaky `quote-share-link-perf-budget.test.ts`; test files exist for most helpers here (`page-counter-css`, `page-side-margins`, `measure-letterhead-script`, `repeat-table-header`, `render-to-html-header-inset`, `render-to-html-repetition`, `overlay-signature`, `signed-quote-overlay`, `quote-share-link-*`). Their pass / fail state is unknown.

### B-121 · Data-dependent unknowns
- Rules: how many leads carry a persisted `quote_metadata.canvaBlocks` (this decides canva vs legacy on every server path — B-80); whether stored bodies still contain `header-band` blocks, `repetition` props, `page-break` blocks or free-positioning fields; whether any row holds `quote_metadata.layoutOverrides` (no writer found — B-107). Not answerable from code.
