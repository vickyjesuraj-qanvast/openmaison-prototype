# OpenMaison 1.0 — Quote template module inventory · Slice A: the document template editor, knobs, theme presets, defaults and resolution

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-24.

Conventions: *Words* are quoted verbatim from code. "Hand-off" = owned by another reader (B canva engine / C content templates / D data) and only named here.

**Vocabulary**

- **Document template (quote_pdf)** — a row of `studio_document_templates` with `type = 'quote_pdf'`; its `body_json` is the whole `QuoteDocumentTemplate` object (`src/types/app.ts:1245`): `{ id, name, isDefault, sections[], globalStyles, items?, brandColor?, logoUrl?, mode?, savedAt?, lastUsedAt? }`. Two body shapes coexist: **legacy** (`sections` array — the shape this editor edits) and **canva** (`schemaVersion: 2` + `blocks` — the Quote Designer's block tree, hand-off B). `isCanvaBody()` (`src/lib/quote-canva/migrate.ts:359`) = `schemaVersion === 2 && Array.isArray(blocks)`.
- **Design Template / Quote Template / Package** — the locked three-concept taxonomy (`docs/rules/quote-terminology.md`): Design Template = a quote_pdf body **without** `items` (the look); Quote Template = the same row type **with** an `items` array (a starter quote); Package = `studio_assemblies` (hand-off C). The UI labels are admittedly mislabeled (see A-109).
- **globalStyles** — `QuoteDocumentTemplate.globalStyles` (`src/types/app.ts:1256…1341`): document-level settings. The editor writes `logoStyle`, `includeCoverPage`, `documentTitle`, `header.{left,center,right,heightPt}`, `footer.{…}`, `layout` (Phase 18 structural knobs) and `theme` (Phase 18b visual knobs).
- **Layout knob** — a leaf of `QuotePdfLayout` (`src/lib/quote-pdf-layout.ts`), 5 groups `header · sections · totals · blocks · footer` + root `pageMargin`. Stored sparsely under `globalStyles.layout`, resolved by `mergeLayout(template, quoteOverride)` over `DEFAULT_LAYOUT`.
- **Theme knob** — a leaf of `QuotePdfTheme` (`src/lib/quote-pdf-theme.ts`), 5 groups `colors · typography · spacing · elementStyle · features`. Stored sparsely under `globalStyles.theme`, resolved by `mergeTheme(template, quoteOverride)` over `DEFAULT_THEME`.
- **Theme preset** — a row of `studio_quote_theme_presets` `{ id, studio_id, name, description, theme, layout, preview_url, is_system }`. 4 system rows (`studio_id IS NULL`) + at most one custom slot per studio (`id = custom-${studioId}`). Applied by deep-merging `theme` + `layout` into the template's `globalStyles`.
- **Default** — `is_default = true`, at most one per `(studio_id, COALESCE(company_id, zero-uuid), type)` (partial unique index `idx_doc_templates_one_default`, migration 166).
- **Entity scope / company_id** — `studio_document_templates.company_id`; `NULL` = studio-wide row, a uuid = an override for that legal entity (`studio_companies`). The editor's "Editing templates for" dropdown sets it.
- **Section** — `QuoteDocSection` (`src/types/app.ts:1025`): `{ id, type, title, content, showPageBreakBefore?, orderIndex, backgroundColor?, paddingTop?, paddingBottom? }`; 14 `QuoteDocSectionType` values exist in the type, the editor exposes 6.
- **Block / slot / knob (canva)** — the Quote Designer's per-block property schema (`KnobDef` in `src/lib/quote-canva/block-schema.ts:342`); `knob-groups / -visibility / -search / -diff / -pairing` are the pure helpers behind its property panel. Per-block catalogue = hand-off B; the helpers' rules are inventoried here (A-102…A-108).
- **Timeline / tnc / contract / signing_flow / portal / invoice / po / vo** — the other `DocumentTemplateType`s sharing the table (`src/types/app.ts:1788`); hand-offs (C for tnc/contract rich text; Contracts audit for signing; Finance for invoice/po/vo).
- **Synthetic default** — `DEFAULT_DOC_TEMPLATE` (`id: "default"`, name *Default*, 2 sections) returned by `GET /api/studio-config/doc-templates` when a studio has no rows; never persisted, filtered out of the editor and the entry gallery.

---

## Hosting page & entry points

### A-01 · Accounts › Document Templates (fullscreen overlay)
- Where: `src/app/(main)/accounts/page.tsx:96` (menu item), `:1374-1376` (render); `src/app/(main)/accounts/document-templates-tab.tsx:51-201` (`DocumentTemplatesTab`)
- Entry: Accounts Setup page (`/accounts`), left sidebar group *Quotes & Pricing* → item *Document Templates*; direct URL `/accounts?tab=document-templates` (`page.tsx:224` reads `?tab=`). A `?tab=` naming a group label (e.g. `?tab=quotes-&-pricing`) resolves to the group's first child (`:232-238`).
- Does: renders as a `position: fixed` overlay portaled to `document.body` (z-[60]) with a sticky top bar: *Back to Accounts* button (only when `onBack` is passed — the page passes `() => setActiveTab("categories")`, so Back lands on **Lead Categories**, not the previous tab) and the title *Document Templates*. Below: intro copy, an optional entity-scope dropdown (A-02), and a 6-tab strip (A-03). Landing tab is *Quote PDF* (`<Tabs defaultValue="quote_pdf">`).
- Rules: `portalReady` state flips in an effect, so the overlay renders nothing on the first paint. No unsaved-changes guard on Back.
- Words: *Back to Accounts* · *Document Templates* · *Author the documents your customers see — quote PDFs, invoices, purchase orders, terms, and contracts. Save per-entity overrides for studios that bill from multiple legal entities.*
- Reachable: yes (menu + URL). e2e `e2e/document-templates-overlay.spec.ts` drives it via `/accounts?tab=document-templates`.

### A-02 · Entity scope dropdown ("Editing templates for")
- Where: `document-templates-tab.tsx:55-64, 113-141`; consumers `:162` (Quote PDF), `:166-174` (Invoice/PO/VO)
- Entry: shown only when the studio has **≥ 2 active** legal entities (`useStudioCompanies` filtered `isActive`).
- Does: `entityScope: string | null`; `null` = studio-wide. The Quote PDF editor is re-mounted on every scope change (`key={entityScope ?? "__studio__"}`), which resets all its local (unsaved) state.
- Rules: the trigger shows a lock icon for studio-wide and a building icon for an entity. Helper text depends on scope.
- Data: passes `companyId` to `useQuoteDocumentTemplates(studioId, companyId)` and to the save (A-69).
- Words: label *Editing templates for*; options *All entities (studio default)*, then each entity `name` with suffix *(Default)* for `isDefault`; trigger text *All entities (default)* / entity name / *Entity*; hints *Changes save as overrides for this entity only. Falls back to the studio default when no override exists.* / *Studio-wide template every entity inherits from.*
- Reachable: yes (multi-entity studios only).

### A-03 · Document kinds hosted by the overlay
- Where: `document-templates-tab.tsx:144-194`
- Does: six tabs, values/labels: `quote_pdf` *Quote PDF* (this slice — `QuoteDocumentTemplateEditor`), `invoice` *Invoice*, `po` *Purchase Order*, `vo` *Variation Order* (`ScopedInvoicePOPanel` → `InvoicePOTemplateEditor`, structured `body_json`; **hand-off Finance**), `tnc` *Terms & Conditions*, `contract` *Contract* (`RichTextTemplatesPanel`, Tiptap `body_html` with merge fields; **hand-off C** for the rich-text editor, Contracts audit for the signing use).
- Rules: all six exist and are live in 1.0. The `DocumentTemplateType` union also carries `signing_flow`, `timeline`, `portal` — those have no tab here (timeline is edited under Accounts › *Timeline Templates*; signing_flow/portal are seeded rows only, see A-77).
- Words (tnc/contract panels): *Templates*, *New template*, *Loading…*, *No templates yet. Click + to create one.*, *Template name*, placeholder *e.g. Standard {title}*, *Preview* / *Edit*, *Preview shows what the client sees with sample values filled in.*, *Delete*, *Set as default*, *Save* / *Saving…*, confirm *Delete this template? This cannot be undone.*, toasts *Template saved* / *Default template updated* / *Could not change default* / *Template deleted*.
- Reachable: yes.

### A-04 · Access, roles and permissions
- Where: `src/lib/access-control.ts:126` (`accounts: ["owner", "admin", "id", "accounting"]`); `page.tsx:637` (menu filter `if ("ownerOnly" in i && i.ownerOnly && !isOwner(...)) return false`; only *Studio Health* carries `ownerOnly: true`, `:80`); API routes `requireSession` only (A-68…A-74, A-80).
- Rules: **every studio role** (owner, admin, id, accounting) can open `/accounts` and the *Document Templates* item is not owner-gated; no `resolveCanPerformAction` check anywhere in the editor or its routes; every write route checks only that a session exists and forces `studio_id` from the session. The comment at `access-control.ts:123-125` (*"most other tabs remain owner-only via in-page menu filtering"*), `docs/rules/leads.md:527` (*"Template editor (owner-only)"*) and requirements CSV row 17 (*"owner-only by UI convention (not enforced server-side)"*) all claim owner-only — the code has **no** such gate (see A-109).
- Reachable: yes, all roles.

### A-05 · Tools › Quote Template Sandbox
- Where: `src/app/(main)/tools/quote-template-sandbox/page.tsx` (296 lines); breadcrumb label only at `src/components/ui/breadcrumb.tsx:31`
- Entry: URL `/tools/quote-template-sandbox` only — no nav tile, no menu item (grep finds no link). Owner-only: non-owners are `router.replace("/tools")`-ed.
- Does: a developer proving-ground, not a product surface: a BlockNote editor panel, a *PDF render* panel calling `/api/quote-pdf/render` with hello-world HTML, and a `CanvaEditorPanel` mounting the canva `CanvaEditor` with `DEFAULT_LAYOUT` / `DEFAULT_THEME`. Banner explains Paged.js is deferred.
- Words: title *Quote Template Sandbox*, sub *Quote Designer sandbox — validates Playwright, Paged.js, BlockNote in this environment. Not for production use.*
- Reachable: URL only, owner tag; effectively dead for studios.

### A-06 · Neighbouring Accounts tabs (touchpoints only)
- Where: `page.tsx:94-107` (*Quotes & Pricing* group), `:78` (*Legal Entities*), `:140` (*Accreditations*)
- Does: *Quote Categories* (`quote-categories`), *Document Templates* (A-01), *Signing Documents* (`signing-documents`, `SigningDocumentsTab` — the reusable PDF / rich-text signing library with per-document scroll / accept gates; **Contracts audit**), *Packages* (`quote-templates`, `studio_assemblies`; **hand-off C**), *Quote Rules* (**C**), *Price Book* (`catalogue`), *Quote Approval Rules* (`approval`), *Quote Sharing* (A-07). Retired alias `assemblies → quote-templates` (`RETIRED_TAB_ALIASES`, `:213`). *Legal Entities* → A-98, *Accreditations* → A-99.
- Reachable: yes.

### A-07 · Quote Sharing settings (what the client-facing share shows)
- Where: `page.tsx:1452-1606`
- Entry: Accounts › *Quotes & Pricing* › *Quote Sharing* (`/accounts?tab=quote-sharing`).
- Does: three studio-wide settings, each saved immediately on click via `updateSettingsMutation` into `studios.settings`: (1) `quoteSharingMethod` ∈ `both` (default) · `standalone` · `portal`; (2) `quoteLinkExpiryDays` ∈ 7 · 14 · 30 (default) · 60 · 90; (3) four booleans `quoteShare_showOptionalToggles`, `quoteShare_showPaymentSchedule`, `quoteShare_showVariations`, `quoteShare_showPoweredBy` — each **default true** (`!== false`).
- Rules: no role gate beyond the page. The share pipeline that reads these keys = **hand-off B**.
- Words: *Quote Sharing* · *Configure how quotes are shared with homeowners.* · *Sharing Methods* · *Choose which sharing options your team sees when sharing quotes with homeowners.* · *Both Methods (Recommended)* / *Team can choose between standalone link or homeowner portal link when sharing. Best for flexibility.* · *Standalone Link Only* / *Only show the quick shareable link option. Best for studios that don't use the homeowner portal.* · *Homeowner Portal Only* / *Only show the portal link option. Best for studios that want all clients using the portal.* · *Standalone Link Expiry* · *How long standalone quote links remain active before expiring.* · *{n} days* · *Standalone Link Features* · *Control what homeowners can see and do on the standalone quote page.* · *Show optional item toggles* / *Homeowners can toggle optional add-ons on/off* · *Show payment schedule* / *Display the payment milestone breakdown* · *Show quote variations* / *If multiple packages exist, show tabs to compare* · *Show "Powered by OpenMaison"* / *Display the platform attribution in the footer* · toasts *Sharing preference updated*, *Link expiry set to {n} days*, *Updated*, errors *Failed to save sharing preference* / *Failed to save link expiry* / *Failed to save*.
- Reachable: yes.

---

## Template list & CRUD (Quote PDF editor)

### A-08 · The template list
- Where: `src/components/accounts/quote-document-template-editor/index.tsx:688-750`
- Does: one row per legacy template: name, *{n} sections* count, a *Default* badge (star) on the default, and two hover-only actions on non-default rows — *Set as default* (star, `title="Set as default"`) and delete (trash). Clicking a row selects it and opens the editor surface below.
- Rules: rows come from `localTemplates` (local copy); the list order is the API order (default first, then name A→Z, A-68).
- Words: heading *Quote Document Template*, sub *Customize the sections that appear in your quote PDF — cover page, scope of work, terms, and more.*, badge *Default*.
- Reachable: yes.

### A-09 · Add a template
- Where: `index.tsx:183-198, 738-749`
- Does: name input + *Add* button (Enter also adds). Creates a local template `{ id: crypto.randomUUID(), name, isDefault: localTemplates.length === 0, sections: [pricing_table "Quotation", payment_terms "Payment Schedule"] }`, clears the input and selects it.
- Rules: `Add` disabled until the trimmed name is non-empty. **The first template ever added becomes default automatically**; later ones are non-default. Nothing is persisted until *Save Templates* (A-15). No duplicate-name check in this editor (the DB unique index `(studio_id, company, type, name)` will reject a duplicate at save → *Failed to save document templates*).
- Words: placeholder *Template name...*, button *Add*.
- Reachable: yes.

### A-10 · Select / rename a template
- Where: `index.tsx:179, 758-767`
- Does: `selected = localTemplates.find(t => t.id === selectedId)`; the editor surface renders only with a selection. *Template Name* input edits `name` live (local).
- Words: label *Template Name*.
- Reachable: yes.

### A-11 · Delete a template (local)
- Where: `index.tsx:200-213`
- Does: `window.confirm` → removes from `localTemplates`; if the deleted one was default and rows remain, `next[0].isDefault = true` (first remaining row promoted). Deselects if it was selected. Persisted only on Save (the PUT soft-deletes rows missing from the set, A-69).
- Words: *Delete document template "{name}"?* + when default: * It's currently the default — another template will be promoted.*
- Reachable: yes.

### A-12 · Set as default (auto-saves)
- Where: `index.tsx:215-226`
- Does: marks the chosen row `isDefault: true`, every other row `false`, then **immediately** PUTs the whole set (A-69) — unlike every other edit, which waits for Save.
- Words: toast *Default set to "{name}"* / fallback *"selected template"*; error toast *Could not save default — try the Save button*.
- Reachable: yes.

### A-13 · Empty state
- Where: `index.tsx:730-736`
- Words: *No document templates yet.* / *Create a template to customize your quote PDF layout.*
- Rules: shown when `localTemplates.length === 0` — i.e. also for a studio whose only rows are canva bodies (A-14), because those are filtered out.
- Reachable: yes.

### A-14 · Which rows the editor shows (legacy-only filter)
- Where: `index.tsx:161-177`
- Rules: on first non-empty load (`inited` latch) the editor keeps only rows with `t.id !== "default"` (the synthetic row, A-68) **and** `Array.isArray(t.sections)`. Canva rows (`schemaVersion: 2`, `blocks`) are excluded — comment: editing one here *"would crash on `t.sections.*` and, on save, graft a stray `sections` field onto the canva body"*; *"Canva templates are managed in the canva editor's own picker"* (hand-off B). Because the save is a **full-set replace** (A-69), the excluded canva rows are **not in the PUT payload and are soft-deleted on Save** — see A-109/Uncertain.
- Data: `useQuoteDocumentTemplates(studioId, companyId)`; `studioId = user?.studioId || DEMO_STUDIO_ID`.
- Reachable: yes.

### A-15 · Save Templates / dirty / discard
- Where: `index.tsx:630-640, 1185-1190`
- Does: *Save Templates* PUTs `localTemplates` for the current `companyId`; success flips the button to *Saved* (check icon) for 2.5 s and toasts. While pending the button reads *Saving...* and is disabled.
- Rules: **no dirty tracking, no discard/cancel, no unsaved-changes prompt** (Back to Accounts and the entity-scope remount drop local edits silently). Save button is always enabled (even with zero templates → PUT `[]` soft-deletes every row in scope).
- Words: *Save Templates* · *Saving...* · *Saved* · toast *Document templates saved* · error *Failed to save document templates*.
- States: pending / saved flash; no loading skeleton (the list simply appears when data arrives).
- Reachable: yes.

### A-16 · Load-once and re-sync rules
- Where: `index.tsx:161-177`
- Rules: `localTemplates` is seeded once (`inited`), when the query first returns a non-empty array; later refetches (e.g. after the auto-save of A-12 invalidates `["quote-doc-templates", studioId]`) do **not** overwrite local state. A studio with zero rows sees the synthetic *Default* → filtered → empty list; `inited` still flips (array non-empty).
- Reachable: n/a (behaviour).

---

## Document Layout card (legacy `globalStyles` knobs, above the tabs)

### A-17 · Logo style
- Where: `index.tsx:779-798`
- Does: select writing `globalStyles.logoStyle`. Options: `square` *Square (compact)* · `masthead` *Masthead (wide wordmark)*. Default (undefined) reads as `square`.
- Rules: renderer: square = 42×42 logo; masthead = full-width band, height from `layout.header.logoSize` (A-27). Hand-off B for rendering.
- Words: *Logo style* · *How the studio logo renders in the page header.* · card title *Document Layout* · *Page-wide settings — logo treatment, cover page, header / footer bands.*
- Reachable: yes.

### A-18 · Include cover page
- Where: `index.tsx:799-808`
- Does: switch on `globalStyles.includeCoverPage`; checked when `!== false` (default on).
- Rules: when off the renderer skips any `cover` section (`quote-pdf.tsx:4739-4742`).
- Words: *Include cover page* · *When off, the rendered PDF skips any cover section.*
- Reachable: yes.

### A-19 · Document title (top-right)
- Where: `index.tsx:809-824`
- Does: text input on `globalStyles.documentTitle`; empty string is stored as `null`.
- Rules: renderer: `undefined` → *QUOTATION*; `null`/`""` → title block hidden (`quote-pdf.tsx:2293`). Note the editor cannot produce `undefined` once touched — clearing yields `null` = hidden, which contradicts the hint's second sentence (see A-109).
- Words: *Document title (top-right)* · *Empty hides the block. Leave blank to fall back to QUOTATION.* · placeholder *QUOTATION*.
- Reachable: yes.

### A-20 · Header / footer band height (pt) — number inputs
- Where: `index.tsx:825-862`
- Does: two `type="number"` inputs (`min 0`, `step 1`, placeholder *80*) writing `globalStyles.header.heightPt` / `footer.heightPt`; empty → `undefined`.
- Rules: the renderer adds `heightPt + 12` to page padding when set, else 28 when `header.enabled`, else 0 (`quote-pdf.tsx:4191-4192`). The same two knobs are also exposed as sliders on the Theme tab (A-56) — two controls, one value.
- Words: *Header band height (pt)* · *Footer band height (pt)*.
- Reachable: yes.

### A-21 · Header / footer template slots (left · center · right)
- Where: `index.tsx:863-905` (`appendBandToken` `:544-564`); token button `src/components/leads/insert-variable-button.tsx`
- Does: for each band (*header template*, *footer template*) three text inputs (`left`, `center`, `right`) on `globalStyles.header.*` / `footer.*`; each row has an *+ Insert variable* popover that **appends** `{token}` to the slot's current text (not at the caret).
- Rules: tokens are resolved with `TEMPLATE_EDITOR_SAMPLE_TOKENS` (`index.tsx:64-85`, e.g. *Demo Studio Pte Ltd*, *Mrs Tan Mei Ling*, *Q-2026-DEMO*) purely for preview in the popover. The popover's categories: *CLIENT* (client_name/phone/email/address), *THIS QUOTE* (quote_number, quote_date, quote_total, project_title, project_ref, date *Today's date*), *STUDIO* (studio_name/phone/email/website/address, company_registration), *DESIGNER (PREPARED BY)* (prepared_by, prepared_by_phone, prepared_by_email) — `logo`, `page_number`, `total_pages`, `client_ic`, `customer_id`, `quote_valid_until`, the five `studio_*` socials are **not** offered here although `substituteTokens` accepts them (A-101).
- Words: labels *header template* / *footer template* (CSS-capitalised), slot captions *left* / *center* / *right*, placeholder *{band} {slot} (e.g. {studio_name})*.
- Reachable: yes.

### A-22 · `globalStyles` fields with no control in this editor
- Where: `src/types/app.ts:1256-1341`
- Rules: the type also carries `accentColor`, `fontStyle`, `headerLayout`, `paperSize` (`A4|Letter`), `margins` (preset `narrow|normal|wide` or custom TRBL), `pageBackground`, `watermark`, `font.{family,sizeScale,lineSpacing}`, `header.enabled`, `footer.enabled`, `toc`, `pageNumber`. None is editable on this page; they are written by the per-quote Layout tab's document panel (legacy `QuoteDocumentEditor`, `src/components/leads/quote-document-editor.tsx`, mounted in the digitizer at `quote-digitizer-dialog.tsx:8146` for flag-off studios) — hand-off B. Migration 178's El Arte seed sets `header.enabled: true`, `footer.enabled: true`.
- Reachable: n/a.

---

## The five-tab editor

### A-23 · Tab sidebar
- Where: `quote-document-template-editor/tab-sidebar.tsx:13-21, 35-118`; host `index.tsx:908-925`
- Does: `TabId = "header" | "sections" | "blocks" | "footer" | "theme"`; labels *Header* · *Sections, Items & Totals* · *Blocks* · *Footer* · *Theme*. Default tab `header` (state initial). `role="tablist"` `aria-orientation="vertical"` `aria-label="Quote PDF editor sections"`; roving tabindex; ArrowUp/Down wrap, Home/End, Enter/Space activate. Panel `role="tabpanel"` `id=tabpanel-{id}` `aria-labelledby=tab-{id}`.
- Rules: the active tab is not remembered across template selection (state persists across selecting another template within the session because it lives on the editor, not per template). Tests: `src/__tests__/template-editor-tabs.test.tsx`, `template-editor-knob-roundtrip.test.tsx` (knob edits survive tab switches; Sections tab does not carry column knobs; Theme tab carries them).
- Reachable: yes (only with a selected template).

### A-24 · Header › Layout
- Where: `tabs/header-tab.tsx:46-57`; type `HeaderLayout`
- Knob: select `layout.header.layout`; options `single-band` *Single band (Phase 17)* · `two-column` *Two-column (Flo style)* · `structured-keyvalue` *Structured key-value (Flo style)* · `centered-logo-stacked` *Centered logo (stacked)*; default `single-band`.
- Rules: gates A-29 (`centered-logo-stacked`) and A-30 (`structured-keyvalue`). The stacked option and the subtitle knobs were added after IdesignerLab UAT 2026-08-25 (`src/__tests__/header-tab-subtitle-band.test.tsx`).
- Words: card *Header* · *Page header band — layout variant, logo size, divider, contact block, and repetition.* · label *Layout* · `aria-label="Header layout"`.
- Reachable: yes.

### A-25 · Header › Customer info slot
- Knob: select `layout.header.contactBlockSlot`; options `none` *None (default)* · `header-right` *Header right* · `below-header` *Below header*; default `none`. (`header-tab.tsx:59-69`)
- Words: *Customer info slot* · `aria-label="Contact block slot"`.

### A-26 · Header › Registration line
- Knob: select `layout.header.regNumberPosition`; options `below-logo` *Below logo (Phase 17)* · `above-divider` *Above divider* · `hidden` *Hidden*; default `below-logo`. (`:71-81`)
- Words: *Registration line* · `aria-label="Registration number position"`.

### A-27 · Header › Logo size
- Knob: select `layout.header.logoSize`; options `small` *Small (Phase 17, 42×42)* · `medium` *Medium (64×64)* · `large` *Large (96×96)*; default `small`. (`:83-93`)
- Rules: the type also allows `{ widthPt, heightPt }` (exact size) — the select shows *Small* for any object value (`typeof … === "string" ? … : "small"`) and overwrites it on change. `resolveLogoSize` (`quote-pdf-layout.ts:672-686`): small 42×42, medium 64×64, large 96×96.
- Words: *Logo size* · `aria-label="Logo size"`.

### A-28 · Header › Divider style
- Knobs (`:95-140`): **Color** — switch *accent* (`aria-label="Use accent for divider color"`): checked ⇔ `dividerStyle.color === null` (accent at 40% opacity); unchecking writes `studioPrimaryColor` and reveals a native `<input type="color">` (`aria-label="Divider color"`, fallback `#000000`). **Weight (pt)** — number `min 0 step 0.5` on `dividerStyle.weight` (NaN ignored); default `1`.
- Data: `studioPrimaryColor = studioBranding?.primaryColor ?? "#5500FF"` (A-97).
- Words: group *Divider style* · *Color* · *Defaults to your studio accent at 40% opacity.* · *accent* · *Weight (pt)*.

### A-29 · Header › Subtitle band (only for `centered-logo-stacked`)
- Where: `header-tab.tsx:142-195`; type `QuotePdfLayoutHeaderSubtitle`
- Knobs: **Text** — text on `subtitle.text` (default `""`, empty = no row; token-substituted; placeholder *VERSION 3*). **Band color** — accent switch (`bandColor === null` = accent at low alpha) + colour input when off. **Text color** — colour input on `subtitle.textColor`, default `#DB382A`.
- Visibility: rendered only when `headerLayout.layout === "centered-logo-stacked"`.
- Words: *Subtitle band* · *Banded row below the title — e.g. "VERSION 3" or "DRAFT". Empty text hides the row.* · *Text* · *Band color* · *Defaults to your studio accent at low opacity.* · *Text color*; aria-labels *Subtitle text*, *Use accent for subtitle band color*, *Subtitle band color*, *Subtitle text color*.

### A-30 · Header › Field labels (only for `structured-keyvalue`)
- Where: `header-tab.tsx:28-36, 197-215`; type `QuotePdfLayoutHeaderFieldLabels`
- Knobs: seven text inputs on `layout.header.fieldLabels.*`: `clientName` (default *Name*), `clientIc` (*IC No*), `clientAddress` (*Address*), `clientEmail` (*Email*), `clientPhone` (*Contact No*), `quoteNumber` (*Quotation No*), `quoteDate` (*Date*). The label shown left is the default value (`row.placeholder`).
- Rules: the type/defaults carry three more labels with **no control**: `customerId` (*Customer ID*), `validUntil` (*Valid Until*), `preparedBy` (*Prepared By*). Renderer skips a KV row when its value is empty.
- Visibility: `headerLayout.layout === "structured-keyvalue"`.
- Words: *Field labels* · *Customize the `Label:` prefix on each key-value row.*

### A-31 · Header › Show on (repetition)
- Where: `RepetitionSelect` `index.tsx:1426-1456`; `header-tab.tsx:217-224`
- Knob: select `layout.header.repetition`; options `first-page-only` *First page only* · `every-page` *Every page* · `never` *Never (no header)*; default `first-page-only`.
- Words: label *Show on:*; hints *Header renders on page 1 only.* / *Header repeats on every page.* / *Header is omitted entirely.*; `aria-label="Header — Show on"`. Test `src/__tests__/template-editor-repetition.test.tsx`.

### A-32 · Header knob with no control: `sectionTitle`
- Where: `quote-pdf-layout.ts:219-223, 437`
- Rules: `layout.header.sectionTitle` (banded label above the KV grid in `structured-keyvalue`, e.g. *CUSTOMER INFO*), default `""`. Not exposed anywhere in this editor.

### A-33 · Sections › Heading style
- Where: `tabs/sections-items-totals-tab.tsx:33-44`
- Knob: select `layout.sections.headingStyle`; `band-uppercase` *Band uppercase (Phase 17)* · `underlined-bold` *Underlined bold* · `italic-plain` *Italic plain* · `plain` *Plain*; default `band-uppercase`.
- Words: card *Sections* · *Heading + subsection styling, subtotal position, numbering mode.* · *Heading style*.

### A-34 · Sections › Subsection style
- Knob: select `layout.sections.subsectionStyle`; `uppercase-band` *Uppercase band (Phase 17)* · `italic-sentence-case` *Italic sentence case* · `underlined-bold` *Underlined bold* · `hidden` *Hidden*; default `uppercase-band`. (`:46-57`)

### A-35 · Sections › Subtotal position
- Knob: select `layout.sections.subtotalPosition`; `hidden` *Hidden* · `in-band-header` *In band header (Phase 17)* · `row-after-items` *Row after items* · `both` *Both*; default `in-band-header`. (`:59-70`)

### A-36 · Sections › Numbering
- Knob: select `layout.sections.numberingMode`; `continuous-letter-number` *Continuous A1, A2 (Phase 17)* · `per-section-1n` *Per section 1, 2* · `per-subsection-1n` *Per subsection 1, 2* · `none` *None (hide column)*; default `continuous-letter-number`. (`:72-83`)

### A-37 · Totals › Breakdown style
- Where: `sections-items-totals-tab.tsx:95-105`
- Knob: select `layout.totals.breakdownStyle`; `full-breakdown` *Full (Subtotal / Discount / GST / Grand Total)* · `stacked-discount` *Stacked (Total Renovation / Less Discount / Grand Total)* · `single-grand-total` *Single line (Total)*; default `full-breakdown`.
- Words: card *Totals appearance* · *Breakdown style, GST label override, and the Optional Works section.*

### A-38 · Totals › GST label override
- Knob: text `layout.totals.gstLabel`; empty → `null` (= region default label); default `null`; placeholder *auto (region default)*. (`:107-116`)

### A-39 · Totals › Optional Works section
- Knobs (`:118-148`): switch `optionalWorksSection.enabled` (default `false`); when on: text *Block title* (`title`, default *Optional Add-On Works*), switch *Include in Grand Total* (`includeInTotal`, default `false`).
- Rules: the whole `optionalWorksSection` object is rewritten on each change (wholesale-replace semantics, A-81). Also read by the lead drawer's total fallback (A-94).
- Words: *Optional Works section* · *Block title* · *Include in Grand Total*.

### A-40 · Totals knob with no control: `roundOff`
- Where: `quote-pdf-layout.ts:242-251, 456`
- Rules: `layout.totals.roundOff = { enabled: false, label: "Round Off" }` by default; renderer adds a rounding row when enabled. Not exposed in this editor (migration 178's comment: *"Round Off not yet wired"*).

### A-41 · Blocks › Intro block (top of body)
- Where: `tabs/blocks-tab.tsx:45-116`
- Knobs: switch `blocks.intro.enabled` (default `false`); when on: *Title* text (`title`, default `""`, placeholder *QUOTATION*), *Title alignment* select `center` *Center* · `left` *Left* (default `center`), three switches *Bold* / *Underline* / *UPPERCASE* on `titleStyle.{bold,underline,uppercase}` (defaults `true/true/true`), body textarea (`body`, default `""`, placeholder *Dear {client_name}, …*, 3 rows).
- Rules: body/title are token-substituted at render (A-101). Empty title after trim = no title block.
- Words: card *Blocks* · *Body-text blocks rendered above + below the items table.* · *Intro block (top of body)*.

### A-42 · Blocks › Remarks callout
- Knobs (`:118-160`): switch `remarks.enabled` (default `false`); *Style* select `boxed` *Boxed* · `italic-paragraph` *Italic paragraph* (default `boxed`); *Position* select `before-totals` *Before totals* · `after-totals` *After totals* (default `after-totals`); body textarea (placeholder *Remarks copy …*).
- Words: *Remarks callout*.

### A-43 · Blocks › Signature block
- Knobs (`:162-227`): switch `signatureBlock.enabled` (default `false`); *Signature image URL* (`designerImageUrl`, empty → `null`, placeholder *https://…*); *Name* (`name`, default `{prepared_by}`); *Role* (`role`, default `""`, placeholder *Designer*); *Phone* (`phone`, default `{prepared_by_phone}`); *Position* select `before-totals` · `after-totals` · `footer` *Footer area* (default `after-totals`).
- Rules: `signatureBlock.secondary` (second signatory `{ enabled, imageUrl, name, phone, role } | null`, default `null`) has **no control**. The image URL is expected to be pasted from the Assets card's *Copy URL* (A-61).
- Words: *Signature block* · *Signature image URL* · *Name* · *Role* · *Phone* · *Position*.

### A-44 · Blocks › Closing block (end of body)
- Knobs (`:229-249`): switch `closing.enabled` (default `false`); body textarea (placeholder *Thank you for considering …*).
- Words: *Closing block (end of body)*.

### A-45 · Blocks › Payment terms
- Where: `blocks-tab.tsx:251-332`; flag `src/lib/finance/milestone-schedule.ts:95` `FEE_FIRST_MILESTONES_ENABLED = false`
- Knobs: switch `paymentTerms.enabled` (default `false`); *Style* select `numbered-list` *Numbered list* · `bullet-list` *Bullet list* · `paragraph` *Paragraph* · `table` *Table (pipe-separated)* (default `numbered-list`); *Position* `before-totals` · `after-totals` · `footer` *Footer area* (default `after-totals`); body textarea 5 rows (placeholder *Stage 1: Deposit | 10%* … *Stage 4: Final touch-up | 30%*); **label style** switches *Bold* / *Underline* / *UPPERCASE* on `labelStyle` (defaults `true/false/false`).
- Visibility: the three label-style switches render **only when `feeFirstMilestonesEnabled ?? FEE_FIRST_MILESTONES_ENABLED` is true — i.e. hidden for every studio today** (the knob is read only on the fee-first render branch; `src/__tests__/blocks-tab-payment-terms-label-style-gate.test.tsx`). `labelStyle` falls back to `DEFAULT_LAYOUT` when a stored `paymentTerms` predates the knob.
- Words: *Payment terms* · *Style* · *Position*; aria-labels *Payment terms label bold/underline/uppercase*, *Payment terms body*.

### A-46 · Footer › Accreditation logo strip
- Where: `tabs/footer-tab.tsx:25-73`
- Knobs: switch `footer.logoRow.enabled` (default `false`); when on: textarea *Image URLs (one per line)* → `imageUrls: string[]` (split on newlines, trimmed, blanks dropped; default `[]`); *Height (pt)* number `min 8 max 48 step 1`, **clamped in code to 8…48** (IdesignerLab UAT 2026-08-25, `src/__tests__/footer-tab-logo-row-overflow.test.tsx`), default `24`.
- Words: card *Footer* · *Accreditation logo strip, bank details, PayNow QR, and how the footer repeats across pages.* · *Accreditation logo strip* · *Image URLs (one per line)* · placeholder *https://example.com/badge-1.png\nhttps://example.com/badge-2.png* · *Height (pt)*.

### A-47 · Footer › Bank details block
- Knob (`:75-88`): switch `footer.bankDetailsBlock.enabled` (default `false`). No content fields — content comes from studio branding `bankDetails` (A-97) / entity bank details (A-98).
- Words: *Bank details block* · *Content is sourced from Studio Branding bank details.*

### A-48 · Footer › PayNow QR code
- Knobs (`:90-123`): switch `footer.paynowQr.enabled` (default `false`); when on: *Image URL* (`imageUrl`, empty → `null`); *Caption* (`label`, default *Scan to pay via PayNow*).
- Rules: this legacy knob takes a pasted URL; the canva `paynow-qr` block instead resolves `resolvePaynowQrUrl(studioBranding, entity)` (A-98). 
- Words: *PayNow QR code* · *Image URL* · *Caption*.

### A-49 · Footer › Show on (repetition)
- Knob (`:125-132`): `layout.footer.repetition`; same options as A-31 with *Never (no footer)*; default `every-page`; hints *Footer renders on page 1 only.* / *Footer repeats on every page.* / *Footer is omitted entirely.*; `aria-label="Footer — Show on"`.

### A-50 · Theme › Apply preset
- Where: `tabs/theme-tab.tsx:61-79`; `PresetApplyDropdown` `index.tsx:1362-1422`; `applyPreset` + `deepMerge` `index.tsx:479-520`
- Does: *Choose preset* popover lists system presets (badge *System*, name + description) then, after a separator, the studio's custom preset (badge *My preset*). Pick → `window.confirm` → `applyPreset`: `globalStyles.theme = deepMerge(prevTheme, preset.theme)`, `globalStyles.layout = deepMerge(prevLayout, preset.layout)` (local only; Save persists).
- Rules: `deepMerge` recurses into plain objects; arrays and primitives in the preset **replace**; `null` in the preset writes `null` (e.g. resets an accent colour to "use accent"); `undefined` preserves the target. Paths the preset does not mention survive (*"presets are starting points, not subscriptions"*). Empty list → *No presets available.*
- Words: *Apply preset* · *Pick a starting point — the preset replaces matching theme + layout values. Customizations on untouched paths are kept.* · *Choose preset* · confirm *Apply "{name}"? This will overwrite your current theme + layout where the preset specifies values.* · toast *Applied preset "{name}"*.
- Reachable: yes. e2e `document-templates-overlay.spec.ts:166-186` checks the four system presets appear.

### A-51 · Theme › Save as my preset
- Where: `theme-tab.tsx:80-95`; `saveAsPreset` `index.tsx:522-542`; hook `src/lib/queries/quote-theme-presets.ts:77-104`
- Does: if a custom preset exists → `window.confirm` about overwriting; `window.prompt("Preset name:", default)` (default = existing custom name or `{template.name} preset`), then `window.prompt("Short description (optional):", …)`; POSTs `{ name, description, theme: globalStyles.theme ?? {}, layout: globalStyles.layout ?? {} }` (the template's **sparse** overrides, not the resolved theme). Button disabled while pending (*Saving…*).
- Rules: one custom slot per studio — always an upsert on `custom-${studioId}` (A-79). Empty name aborts silently. Saves the current template's stored deltas only; knobs left at default are not captured.
- Words: *Save as my preset* · *Save the current theme + layout as your studio's custom preset — apply it across other templates later.* · *Save as preset* / *Saving…* · confirm *This will overwrite your existing custom preset "{name}". Continue?* · toasts *Saved preset "{name}"* / *Could not save preset*.
- Reachable: yes.

### A-52 · Theme › Typography (enums)
- Where: `theme-tab.tsx:98-146`
- Knobs: **Font family** select `theme.typography.fontFamily`: `Helvetica` *Helvetica (sans-serif, default)* · `Times-Roman` *Times Roman (serif)* · `Courier` *Courier (monospace)*; default `Helvetica`. **Density** select `sizeScale`: `compact` *Compact (−1pt)* · `normal` *Normal (default)* · `comfortable` *Comfortable (+1pt)*; default `normal`. **Line spacing** select `lineSpacing`: `tight` *Tight (1.3)* · `normal` *Normal (1.45)* · `loose` *Loose (1.65)*; default `normal`.
- Rules: the type allows any string for `fontFamily` and the legacy `globalStyles.font.family` union also lists `Georgia|Inter|Outfit`; the select offers three. Footnote admits Google Fonts / uploads are not built (the spec's Q2 decision to fetch Google Fonts at runtime is **not implemented** in this editor). `lineHeightOverride` (A-56) wins over `lineSpacing` when set.
- Words: card *Typography* · *Font family* · *Density* · *Line spacing* · *Built-in fonts only — Helvetica, Times Roman, Courier. Google Fonts and custom font upload are planned follow-ups.* · card intro *Colors, fonts, spacing + element styling. Brand-accent fields fall back to your studio's primary color when set to "use accent".*

### A-53 · Theme › Color palette
- Where: `theme-tab.tsx:148-198`
- Knobs: eleven rows on `theme.colors.*`, each a native colour input; two rows (`grandTotal`, `link`) carry an *accent* switch (checked ⇔ value `null` = studio primary colour at render; unchecking writes `studioPrimaryColor`). Rows and defaults: `sectionHeading` *Section heading* (#1F1F23) · `sectionDescription` *Section description* (#666666) · `subsection` *Subsection heading* (#555555) · `subtotalRow` *Subtotal row* (#1F1F23) · `cellText` *Cell text* (#1A1A1A) · `cellSecondary` *Cell secondary* (#666666) · `unitLabel` *Unit label* (#666666) · `currencySymbol` *Currency symbol* (#1A1A1A) · `grandTotal` *Grand Total* (null) · `link` *Email + website links* (null) · `divider` *Divider lines* (#D8D8DC).
- Rules: `colors.rowAlt` (zebra background, default `#FAFAFB`) has **no control**.
- Words (descriptions): *e.g. "A. Demolition" band text* · *Italic line below each section heading (when enabled)* · *e.g. "Kitchen" subheader under a section* · *"Sub-total for D:" line* · *Item names + primary copy in the items table* · *Quantities, units, rates — less prominent text* · *e.g. "12 ft" / "sqm" in the Unit column* · *When `Currency split rendering` is on, the leading $ / RM / etc.* · *Defaults to your studio accent.* (×2) · *Hairline rules between sections and table rows.*

### A-54 · Theme › Element style
- Where: `theme-tab.tsx:200-296`
- Knobs: **Section heading** switches `elementStyle.sectionHeading.{bold,italic,uppercase,underline}` (defaults `true/false/false/false`); **Subsection** `elementStyle.subsection.{bold,italic,uppercase}` (defaults `true/false/true`); **Subtotal row** `elementStyle.subtotal.{bold,italic}` (defaults `true/false`) + text *Label template* `labelTemplate` (default *Subtotal*, placeholder *Subtotal*).
- Rules: `{section_letter}` in the label template resolves to the section letter. `sectionHeading.uppercase` default is deliberately `false` even though the default `band-uppercase` heading style implies uppercase (renderer history, `quote-pdf-theme.ts:291-297`).
- Words: *Element style* · *Section heading* · *Subsection* · *Subtotal row* · *Bold* · *Italic* · *UPPERCASE* · *Underline* · *Label template* · *Supports tokens: {section_letter} resolves to A/B/C per section.*

### A-55 · Theme › Features
- Where: `theme-tab.tsx:298-371`
- Knobs: switch `features.sectionDescriptionEnabled` (default `false`); *Item table columns* switches `features.columns.showQty` / `showUnit` / `showRate` (defaults all `true`; each write spreads the whole `columns` bag); switch `features.smartUnitHiding` (default `false`); switch `features.currencySplitRendering` (default `false`).
- Rules: `features.continuationMarker` (default `false`) and `features.rowStriping` (default `true`) have **no control**. Per-category description text lives on `studio_quote_categories.description` (Quote Categories tab) — hand-off C/B.
- Words: *Features* · *Section descriptions* / *Renders an italic 1-2 line description below each section heading. Per-category text is set in Quote Categories.* · *Item table columns* · *Show Qty column* · *Show Unit column* · *Show Rate column* · *Smart unit hiding* / *Hide Qty column on rows where the unit already encodes the quantity (e.g. "12 ft").* · *Currency split rendering* / *Render the currency symbol in its own column (e.g. S$ left, 1,440.00 right).*

### A-56 · Theme › Sizing & Density sliders
- Where: `theme-tab.tsx:373-473`; control `src/components/ui/numeric-slider.tsx`
- Knobs (label · unit · path · default · min/max/step · nullable): *Body font size* · pt · `typography.bodySize` · 10 · 6–14/0.5 · nullable (clear → `null` = derived) · *Drives cell text + all per-element sizes derived from it.* — *Line spacing* · × · `typography.lineHeightOverride` · 1.45 · 0.9–2.0/0.05 · nullable · *Numeric multiplier — overrides the Line spacing enum above when set.* — *Page horizontal margin* · pt · `layout.pageMargin` · 36 (`DEFAULT_LAYOUT.pageMargin`) · 4–96/2 · *Outer left/right padding on the content pages.* — *Section gap* · pt · `spacing.sectionGap` · 32 · 2–60/1 — *Row padding (vertical)* · pt · `spacing.rowPaddingY` · 9 · 0–16/1 · *0 = item rows touch the rule above/below.* — *Subsection indent* · pt · `spacing.subsectionIndent` · 18 · 0–36/2 · *0 = subsections align flush with parent section.* — *Section band height* · pt · `spacing.bandHeightPt` · 10 · 0–24/1 · *0 = section heading renders flat, no banded background.* — *Header band height* · pt · `globalStyles.header.heightPt` · 0 · 0–80/2 · nullable · *0 = no fixed top band. Increase to fit a multi-line header.* — *Footer band height* · pt · `globalStyles.footer.heightPt` · 0 · 0–80/2 · nullable · *0 = no fixed bottom band. Increase for a banded footer.*
- Rules: `spacing.tableHeaderRuleWeight` (default 1) has **no control**. *Body font size* duplicates A-57's *Body / cell text*; *Header/Footer band height* duplicate A-20 — same stored value, two controls.
- Words: card *Sizing & Density* · *Numeric sliders for the most-touched typography + spacing knobs. Drag for coarse, type for exact, reset to restore the default.*

### A-57 · Theme › Advanced typography (per-element sizes)
- Where: `theme-tab.tsx:475-516`
- Knobs: collapsed `<details>` with six `type="number"` inputs (`min 1 step 0.5`, placeholder *auto*, `null` when blank; only finite values > 0 are written): `sectionHeadingSize` *Section heading* · `subsectionSize` *Subsection heading* · `bodySize` *Body / cell text* · `totalsSize` *Totals rows* · `grandTotalSize` *Grand total* · `footerSize` *Footer text*; all default `null`.
- Rules: `typography.bodyWeight` (400|500|600|700, default 400) and `typography.letterSpacing` (default 0) have **no control**.
- Words: *Advanced typography* · *Per-element font sizes in points. Leave blank to derive from the Density setting above.*

### A-58 · NumericSlider control rules
- Where: `src/components/ui/numeric-slider.tsx:37-120`
- Rules: slider + number box + reset icon on one row. Number box clamps typed values to `[min, max]`; an empty box calls `onClear` when `nullable`. Reset writes `null` when `nullable && onClear`, else `defaultValue`; disabled when already at default (`title` *Already at default* / *Reset to {default}{unit}*). Displayed value falls back to `defaultValue` when `null`; placeholder shows the default when nullable.

---

## Assets card (below the tabs)

### A-59 · Accreditation badges upload
- Where: `index.tsx:932-981`; `AssetUploadRow` `:1206-1285`; hook `src/lib/queries/studio-assets.ts:99-145`
- Does: `<details>` *Accreditation badges ({count})*; pick a file (`accept="image/png,image/jpeg,image/svg+xml"`) → a *badge display name* box (pre-filled with the file stem) + *Upload* button appear → uploads to Supabase Storage bucket `studio-assets` at `{studio_id}/badge/{uuid}.{ext}` (client-side, `upsert: false`) then `POST /api/studio-assets/records { type: "badge", name, url, metadata: { orderIndex: badgeAssets.length } }`.
- Rules: size cap **500 KB**, enforced twice — in `handlePick` (*File too large ({n}KB). Max 500KB.*) and in the hook (`badge too large …`). Empty name falls back to the file stem. Submit without a file → *Pick a file first*.
- Words: card *Assets* · *Upload accreditation badges + designer signatures used by the quote PDF. Use the "Copy URL" button on each row to paste into the Footer tab (logo strip) or Blocks tab (signature block).* · hint *PNG / JPG / SVG, max 500KB* · *Upload* / *Uploading…* · toast *Uploaded "{name}"* · empty *No badges uploaded yet.*
- Reachable: yes (e2e `document-templates-overlay.spec.ts:236-278`).

### A-60 · Designer signatures upload
- Where: `index.tsx:983-1022`
- Does: as A-59 with `type: "signature"`, `accept="image/png,image/jpeg"`, cap **1 MB** (1024 KB), `metadata: { designerName: name }`.
- Words: *Designer signatures ({count})* · hint *PNG / JPG, max 1MB* · empty *No signatures uploaded yet.*
- Reachable: yes.

### A-61 · Asset row — Copy URL / Delete
- Where: `AssetListRow` `index.tsx:1292-1353`
- Does: thumbnail, name, *Copy URL* (clipboard; flips to *Copied* for 1.5 s), *Delete* (trash) → `window.confirm` → `DELETE /api/studio-assets/records/{id}` (soft-delete `is_active=false`; the Storage object is kept so existing PDFs keep rendering).
- Words: *Copy URL* / *Copied* · toast *URL copied* / *Could not copy URL* · confirm *Delete "{name}"? Existing PDFs that reference it will still display the image.* · toast *Deleted "{name}"*.
- Reachable: yes.

### A-62 · Asset storage & API rules
- Where: `src/lib/queries/studio-assets.ts:34-45`; `src/app/api/studio-assets/records/route.ts`
- Rules: `StudioAssetType = font | badge | signature | logo | document_image`; caps font 2 MB · badge 500 KB · signature 1 MB · logo 1 MB · document_image 2 MB. GET lists `is_active` rows newest first (optional `?type=`); a missing table (`42P01`) or empty error → `200 { assets: [] }` (graceful skip, e2e asserts no `[useStudioAssets]` console error). POST requires `type, name, url`; `studio_id` forced from session. Only badge + signature have upload UI here; fonts/logos are read by the canva renderer if present (hand-off B).
- Data: table `studio_assets` (migration 177) `{ id, studio_id, type, name, url, metadata, is_active, created_at, updated_at }`.

---

## Sections list (legacy section editor, below the Assets card)

### A-63 · Sections list
- Where: `index.tsx:1025-1162`
- Does: *Sections (top to bottom)* — one card per section, sorted by `orderIndex`: grip icon (decorative; **no drag**), type icon, title (falls back to the type label), type badge, ▲/▼ move (disabled at the ends), delete, chevron to expand. Expanded state is per section id (`expandedSections`), a newly added section opens expanded.
- Rules: `moveSection` swaps neighbours and renumbers `orderIndex` 0…n; `deleteSection` renumbers too. No confirm on section delete.
- Reachable: yes.

### A-64 · Section fields
- Where: `index.tsx:1068-1158`
- Does: *Section Title* text; *Section Type* select over the six `SECTION_TYPE_META` entries with description line; *Content* textarea (only when `meta.hasContent`) with per-type placeholder (cover: *Dear {{clientName}},\n\nWe are pleased to submit our proposal for {{projectTitle}}.*; bullet_list: *- First commitment…*; else *1- Section Heading\n- Bullet point…*) and five chip buttons that insert a `{{token}}` at the caret: `{{clientName}}` *Client Name* · `{{companyName}}` *Company Name* · `{{date}}` *Date* · `{{projectTitle}}` *Project Title* · `{{refNumber}}` *Reference Number*; switch *Page break before this section* (`showPageBreakBefore`).
- Rules: content is plain text with `1-`/`-` line conventions (not the Tiptap HTML the per-quote editor writes); `pricing_table` has no content box. Chip tokens `{{companyName}}` / `{{refNumber}}` are **not** in the renderer's `KNOWN_TOKENS` (A-101) — they pass through unsubstituted (see A-109).
- Words: *Section Title* (placeholder *e.g. Scope of Work*) · *Section Type* · *Content* · chip title *Insert {{token}} at cursor* · *Page break before this section*.

### A-65 · Add Section presets & uniqueness
- Where: `SECTION_PRESETS` `index.tsx:96-123`; `addSection` `:568-589`; grid `:1164-1178`
- Does: six preset buttons: *Cover Page* (cover, content *Dear {{clientName}},\n\nWe are pleased to submit our proposal for {{projectTitle}}.*) · *Scope of Work* (rich_text, a two-heading design-services list) · *Pricing Table* (pricing_table, empty) · *Payment Terms* (payment_terms, three dash lines) · *Project Commitments* (bullet_list, six dash lines) · *Terms & Conditions* (terms_conditions, empty). Appends at `orderIndex = sections.length` and expands it.
- Rules: at most **one** `pricing_table` and **one** `payment_terms` per template — toasts *Only one Pricing Table section is allowed* / *Only one Payment Terms section is allowed*. The type select (A-64) can still change an existing section into a second pricing_table (no guard there).
- Words: *Add Section*; `SECTION_TYPE_META` labels/descriptions: *Cover Page* / *Full-page cover with logo, title, and intro text* · *Rich Text* / *Free-form text section (scope, terms, etc.)* · *Pricing Table* / *Auto-generated line items and totals* · *Payment Terms* / *Payment milestones + optional notes* · *Bullet / Numbered List* / *Commitments, terms & conditions* · *Terms & Conditions* / *Pulls from the studio's default T&C template (configure in Terms & Contracts).*

### A-66 · Section type universe vs. what the editor offers
- Where: `src/types/app.ts:966-980`
- Rules: `QuoteDocSectionType` has 14 values — `cover, header, footer, rich_text, two_column, pricing_table, payment_terms, bullet_list, image, signature_block, terms_conditions, spacer, callout, divider` — plus `InlineInsert` (rich_text/image/callout/divider/spacer/two_column anchored before/after a pricing category, `:982-1023`). This editor's `SECTION_TYPE_META` covers 6; a template saved from the digitizer with other types shows them with `label = sec.type`, no icon, no content box, and no description. Hand-off B for rendering each type.

---

## Live preview pane

### A-67 · Live preview (sample data)
- Where: `src/components/accounts/quote-template-preview-pane.tsx` (`QuoteTemplatePreviewPane`), mounted `index.tsx:1180`
- Does: a sticky 440px aside rendering `<QuotePDFPreview>` (the digitizer's debounced, blob-cached @react-pdf preview — hand-off B) with `extractedDocSections={template.sections}`, `extractedGlobalStyles={template.globalStyles}`, `docTemplates=[template]` so **unsaved local edits show immediately**. Fixed sample data: 7 items across PRELIMINARIES / DEMOLITION / CARPENTRY (subcategories Bedrooms, Bathrooms) / KITCHEN incl. one `isOptional` item; four milestones 10/30/30/30 (*On signing*, *On material delivery*, *On carpentry install*, *On handover*); client *Mrs Tan Mei Ling*, *+65 9123 4567*, *meitan@example.com*, *Blk 123 Bukit Batok Ave 5, #12-34*; quote *Q-2026-DEMO*; branding *Demo Studio Pte Ltd*, `#5500FF`, *6 Sample Road #01-12, Singapore 575585*, UEN *201912345W*; user *Sarah Ang*; `regionTaxRate 0.09`, `countryCode "SG"`; `layoutOverrides null`.
- Rules: the preview uses the **sample** branding, not the studio's real logo/colour (`logoUrl: null`, `primaryColor "#5500FF"`), so accent-resolved knobs preview in purple regardless of the studio's brand. Not the file `src/components/quote-templates/template-preview-pane.tsx` (that is the Package preview, hand-off C; `src/__tests__/template-preview-pane.test.tsx` tests that one).
- Words: *Live preview* · *Updates as you edit. Sample studio + client data; your settings apply visually.*
- Reachable: yes.

---

## Data layer & API — the quote_pdf set

### A-68 · GET /api/studio-config/doc-templates (the editor's and digitizer's read)
- Where: `src/app/api/studio-config/doc-templates/route.ts:28-92`; hook `useQuoteDocumentTemplates` `src/lib/queries/studio-config.ts:543-556` (query key `["quote-doc-templates", sid, companyId ?? "studio"]`, `staleTime 30s`)
- Does: `?companyId=<uuid>` → rows with `company_id = X OR company_id IS NULL`; absent → studio-wide rows only. Filters `type='quote_pdf'`, `is_active=true`; orders `is_default desc, name asc`. Each row → `{ ...body_json, id: row.id, name: row.name, isDefault: row.is_default, lastUsedAt: row.last_used_at }` (a row with `body_json` null → `sections: []`). Rows are then **de-duplicated by `name`**, an entity row winning over a studio-wide row of the same name ("overlay"). 
- Rules: when the studio has **no** rows → legacy fallback reads `studios.settings.quoteDocumentTemplates` (JSONB array; logs *reading legacy settings.quoteDocumentTemplates — run migration 167*); when that is empty too → returns the synthetic `DEFAULT_DOC_TEMPLATE` (`id "default"`, name *Default*, `isDefault true`, sections `s-pricing` pricing_table *Quotation* + `s-payment` payment_terms *Payment Schedule*). `studio_id` from the session; `scopedSupabase`. Note the DB row's `name`/`is_default` override whatever `body_json` says.
- Reachable: API.

### A-69 · PUT /api/studio-config/doc-templates (full-set replace)
- Where: `route.ts:94-175`; hook `useSaveQuoteDocumentTemplates` `studio-config.ts:577-593`
- Does: body `{ templates: QuoteDocumentTemplate[], companyId?: string | null }`. Loads existing `quote_pdf` rows for `(studio, companyId ?? null)` (**including inactive**), then for each posted template: existing id → UPDATE, else INSERT — payload `{ studio_id: session, company_id: scope, type: 'quote_pdf', name, is_default, is_active: true, body_json: <whole template JSON>, updated_at }`. Every existing **active** row whose id is not in the posted set is soft-deleted (`is_active=false`).
- Rules: no validation of names, of "exactly one default", or that a default exists — the DB partial unique index rejects two defaults (500 → *Failed to save document templates*); zero defaults is accepted. `body_json` stores `id`, `name`, `isDefault`, `lastUsedAt` redundantly (the row columns win on read). A posted template whose `id` matches an **inactive** row re-activates it. On success invalidates `["quote-doc-templates", studioId]`, `["document-templates", studioId]`, `["studio-settings"]`.
- Reachable: API (editor Save, Set default, the digitizer's Save-as-template / card actions).

### A-70 · POST /api/studio-config/doc-templates/bump (last used)
- Where: `bump/route.ts`; `bumpDocumentTemplateLastUsed` `studio-config.ts:562-570`
- Does: `{ templateId }` → `last_used_at = now()` on that row (scoped by studio). Non-fatal (errors only logged). Called by the digitizer after any template apply (A-89); drives the entry gallery's recency order (A-95). Column from migration 197 (`idx_doc_templates_studio_type_lastused`).
- Reachable: API.

### A-71 · GET / POST /api/document-templates/records (generic, all types)
- Where: `src/app/api/document-templates/records/route.ts`; hooks `useDocumentTemplates`, `useSaveDocumentTemplate` (`src/lib/queries/document-templates.ts`)
- Does: GET `?type=` optional, `?companyId=` tri-state (`"null"` → studio-wide only; uuid → that entity only; absent → both); `is_active=true`; order `is_default desc, name asc`; returns `StudioDocumentTemplate[]` (camelCase transformer `transformStudioDocumentTemplate`, `src/lib/transformers.ts:2981`). POST requires `type` and `name` (400 *type and name are required*); writes `body_html, body_react_component, variables ({}), config ({}), is_default (false)`, plus `body_json` / `company_id` only when present in the body; `studio_id` from session.
- Rules: used by the tnc/contract panels, Invoice/PO/VO editor, timeline, the lead drawer (`useDefaultDocumentTemplate`), the digitizer's save-as-my-template for canva bodies. Tests `src/__tests__/document-templates-scoped-api.test.ts` (401 without session; client `studioId` ignored).
- Reachable: API.

### A-72 · PATCH / DELETE /api/document-templates/records/[id]
- Where: `records/[id]/route.ts`
- Does: PATCH same payload rules as POST; `studio_id` never updatable; 404 when RLS hides the row. DELETE = soft-delete (`is_active=false`), refused with **409** when the row is the default: *Cannot delete the default template. Set a different template as default first.*
- Reachable: API.

### A-73 · GET /api/document-templates/default (resolution chain)
- Where: `default/route.ts`; hooks `useDefaultDocumentTemplate(studioId, type)` (no resolve) and `useResolvedDefaultDocumentTemplate(studioId, type, companyId)` (`resolve=1`)
- Does: `?type=` required (400 *type is required*). With `resolve=1&companyId=X`: first `(company_id = X, type, is_default, is_active)`, else `(company_id IS NULL, type, is_default, is_active)`, else `{ template: null }`. Without `resolve` → studio-wide default only.
- Rules: this entity→studio→null chain is used by Invoice/PO/VO (`ScopedInvoicePOPanel`) and the lead drawer (studio-wide, A-94); the **quote PDF render paths do not call it** (A-91).
- Reachable: API.

### A-74 · POST /api/document-templates/set-default (two-step swap)
- Where: `set-default/route.ts`; hook `useSetDefaultDocumentTemplate`
- Does: `{ id, type, companyId? }` (400 *id and type are required*). Step 1 clears `is_default` for `(studio, type)` — scoped to `company_id IS NULL` when `companyId === null`, to that entity when a uuid, **to all entities** when omitted; step 2 sets `is_default=true` on `id`. Order avoids the partial unique index.
- Rules: used by the tnc/contract panels; the Quote PDF editor instead PUTs the whole set (A-12).
- Reachable: API.

### A-75 · GET /api/document-templates/timeline (touchpoint)
- Where: `timeline/route.ts` — `type='timeline'` rows shaped `{ id, name, projectType (config.projectType ?? name), milestones (config.milestones), isDefault }`; falls back to the static `TIMELINE_TEMPLATES` map when the studio has none; `?projectType=` filter falls back to all rows when nothing matches. Hand-off Projects audit.

### A-76 · Table, constraints, migrations (cite for D)
- Where: `scripts/migrations/117_studio_document_templates.sql`, `166_doc_templates_per_entity.sql`, `169_doc_templates_add_vo_type.sql`, `197_template_last_used_at.sql`; types `src/types/database.ts:2251` (`DbStudioDocumentTemplate`), `src/types/app.ts:1790`
- Data: `studio_document_templates { id uuid pk, studio_id fk studios cascade, company_id uuid null fk studio_companies cascade (166), type text CHECK in (quote_pdf, tnc, contract, signing_flow, timeline, portal, invoice, po, vo), name text, is_default bool, is_active bool, variables jsonb {}, body_html text, body_json jsonb null (166), body_react_component text, config jsonb {}, last_used_at timestamptz null (197), created_at, updated_at (trigger) }`. Indexes: unique `(studio_id, COALESCE(company_id, zero-uuid), type, name)`; partial unique `idx_doc_templates_one_default (studio_id, COALESCE(company_id,…), type) WHERE is_default`; lookup `(studio_id, company_id, type, is_active)`; `(studio_id, type, last_used_at DESC NULLS LAST)`.
- Rules: `DbStudioDocumentTemplate.type` in `database.ts` omits `'vo'` (the app-level union and the CHECK include it) — a type-only drift. `company_id ON DELETE CASCADE` — deactivating/deleting an entity drops its overrides.

### A-77 · Seeds & data moves
- Where: `118_seed_default_document_templates.sql`, `167_unify_quote_templates.sql`, `178_seed_el_arte_quote_template.sql`
- Rules: **118** inserts per studio (idempotent on `(studio_id, type, name)`) `quote_pdf` *Default Quote PDF* (`is_default`, `body_react_component 'BrandedQuotePDF'`, `config {"accentColor":"#5500FF","showCoverPage":false}`, no `body_json` → the editor shows it as *0 sections* and the digitizer/renderer treat it as "no sections"), `tnc` *Default Terms & Conditions*, `contract` *Default Contract* (HTML with `{{…}}` merge fields), `signing_flow` *Default Signing Flow* (`{"docOrder":["quote","tnc","contract"]}`), `portal` *Default Payment Portal*. Studios created after the migration are **not** auto-seeded. **167** unpacks legacy `studios.settings.quoteDocumentTemplates[]` into rows (`company_id NULL`, `is_default false`) then promotes exactly one default per scope (JSONB-flagged default first by created_at, else first row) only where the scope has none; the JSONB key is left as a read fallback (A-68). **178** is a fork-only El Arte seed (no-op elsewhere): a full legacy body with `structured-keyvalue` header labels *Attention / Mr/Ms / Address / Telephone No. / Email / QUOTE-MSQ / DATE*, `logoSize medium`, `per-section-1n`, `stacked-discount`, intro title *QUOTATION - RENOVATION WORKS FOR ABOVE MENTION PREMISES/ADDRESS.*, remarks *It's our pleasure to work with you!* before totals, footer `heightPt 60` with a centred company line.

---

## Theme presets

### A-78 · Preset table & the four system presets
- Where: `scripts/migrations/176_quote_theme_presets.sql`; DTO `src/app/api/quote-theme-presets/records/route.ts:24-33`
- Data: `studio_quote_theme_presets { id text pk, studio_id uuid null fk studios cascade, name, description, theme jsonb, layout jsonb, preview_url, is_system bool default false, created_at, updated_at }`; partial unique `idx_one_custom_preset_per_studio (studio_id) WHERE studio_id IS NOT NULL`.
- Rules (seeded, `ON CONFLICT (id) DO NOTHING`): `preset-minimal` *Minimal* — *Clean default — single-band header, monochrome, Helvetica. Phase 18 baseline.* — theme `{}`, layout `{}`. `preset-arthaus` *Arthaus* — *Arthaus Studio house style — purple accent, classic structure.* — `{}` / `{}` (identical to Minimal). `preset-flo-style` *Flo-style* — *Reference look matched to Flo Design — brand red accents, structured key:value header with IC field, italic-underlined section headings, "Sub-total for D:" stacked totals.* — theme `colors.{sectionHeading,sectionDescription,unitLabel,subtotalRow} = #C8232C`, `typography.fontFamily Times-Roman`, `elementStyle.sectionHeading {bold, italic, underline, uppercase:false}`, `subsection {bold, italic, uppercase:false}`, `subtotal {bold, italic, labelTemplate "Sub-total for {section_letter}:"}`, `features.sectionDescriptionEnabled true`; layout `header {layout structured-keyvalue, regNumberPosition above-divider}`, `sections {subtotalPosition row-after-items, headingStyle underlined-bold, subsectionStyle italic-sentence-case, numberingMode per-section-1n}`, `totals.breakdownStyle stacked-discount`. `preset-studio-loft` *Studio Loft* — *Modern minimalist — two-column header, plain (non-banded) section headings, generous spacing.* — theme `typography {sizeScale comfortable, lineSpacing loose}`, `elementStyle.sectionHeading {bold, italic:false, underline:false, uppercase:true}`; layout `header {layout two-column, logoSize medium}`, `sections {headingStyle plain, subtotalPosition row-after-items}`. `preview_url` is never set (no thumbnails).

### A-79 · Custom preset slot
- Where: `records/route.ts:87-127`; hook `useSaveCustomPreset`
- Rules: POST `{ name, description?, theme?, layout? }` → upsert `{ id: "custom-${studioId}", studio_id: session, name, description ?? "", theme ?? {}, layout ?? {}, is_system false, updated_at }`. 400 *Preset name is required*. No version history; re-saving overwrites. Deleting a custom preset is not possible from the UI or API.

### A-80 · GET /api/quote-theme-presets/records
- Where: `records/route.ts:59-85`; hook `useQuoteThemePresets(studioId)` (enabled only with a studioId; key `["quote-theme-presets", studioId]`)
- Does: `studio_id IS NULL OR studio_id = session` ordered `is_system desc, name asc` → `{ presets: [{ id, studioId, name, description, theme, layout, previewUrl, isSystem }] }`. The dropdown re-sorts: system first, custom last (A-50).

---

## Layout / theme resolution semantics

### A-81 · `mergeLayout` rules
- Where: `src/lib/quote-pdf-layout.ts:554-656`
- Rules: `effective = mergeLayout(templateLayout, quoteOverride)` over `DEFAULT_LAYOUT`. Top-level groups `header · sections · totals · blocks · footer` shallow-spread (default ← template ← override). Within a group a knob is **atomic** — a nested object (e.g. `totals.optionalWorksSection`, `blocks.remarks`, `blocks.signatureBlock`, `footer.logoRow`) is **replaced wholesale** by whichever layer supplies it, arrays included (`imageUrls` never concatenates). Exceptions deep-merged leaf-by-leaf: `header.fieldLabels`, `header.dividerStyle`, `totals.roundOff`, `blocks.intro` (+ `intro.titleStyle`), `blocks.paymentTerms` (+ `labelStyle`). `pageMargin`: override ?? template ?? default. Result is `structuredClone`d (no shared references). `effectiveQuotePdfLayout` is an alias. Note `header.subtitle` is **not** in the deep-merge list — a stored `{ text }` alone would drop `textColor`/`bandColor` (the editor always writes the full object via `updateLayoutNested`, so this only bites hand-edited JSON).

### A-82 · `mergeTheme` rules
- Where: `src/lib/quote-pdf-theme.ts:348-403`; tests `src/__tests__/quote-pdf-theme.test.ts`
- Rules: groups `colors · typography · spacing · elementStyle · features` shallow-spread; **and** the toggle bags `elementStyle.sectionHeading / subsection / subtotal` and `features.columns` are deep-merged at the leaf (a single flag override keeps its siblings). An override may set a typography size back to `null` to restore derivation. `structuredClone`d result; inputs never mutated. `effectiveQuotePdfTheme` alias.

### A-83 · `DEFAULT_LAYOUT` (every leaf)
- Where: `quote-pdf-layout.ts:396-528`
- `header`: `layout single-band` · `contactBlockSlot none` · `fieldLabels { clientName Name, clientIc IC No, clientAddress Address, clientEmail Email, clientPhone Contact No, quoteNumber Quotation No, quoteDate Date, customerId Customer ID, validUntil Valid Until, preparedBy Prepared By }` · `regNumberPosition below-logo` · `dividerStyle { color null, weight 1 }` · `logoSize small` · `subtitle { text "", bandColor null, textColor #DB382A }` · `repetition first-page-only` · `sectionTitle ""`.
- `sections`: `headingStyle band-uppercase` · `subsectionStyle uppercase-band` · `subtotalPosition in-band-header` · `numberingMode continuous-letter-number`.
- `totals`: `breakdownStyle full-breakdown` · `optionalWorksSection { enabled false, title "Optional Add-On Works", includeInTotal false }` · `gstLabel null` · `roundOff { enabled false, label "Round Off" }`.
- `blocks`: `intro { enabled false, body "", title "", titleAlign center, titleStyle { bold true, underline true, uppercase true } }` · `remarks { enabled false, body "", position after-totals, style boxed }` · `signatureBlock { enabled false, designerImageUrl null, name "{prepared_by}", phone "{prepared_by_phone}", role "", position after-totals, secondary null }` · `closing { enabled false, body "" }` · `paymentTerms { enabled false, style numbered-list, body "", position after-totals, labelStyle { bold true, underline false, uppercase false } }`.
- `footer`: `logoRow { enabled false, imageUrls [], height 24 }` · `bankDetailsBlock { enabled false }` · `paynowQr { enabled false, imageUrl null, label "Scan to pay via PayNow" }` · `repetition every-page`.
- root: `pageMargin 36` (comment: the documented 56 pt was dead code; 36 is what always rendered).

### A-84 · `DEFAULT_THEME` (every leaf)
- Where: `quote-pdf-theme.ts:247-324`
- `colors`: `sectionHeading #1F1F23` · `sectionDescription #666666` · `subsection #555555` · `subtotalRow #1F1F23` · `cellText #1A1A1A` · `cellSecondary #666666` · `unitLabel #666666` · `currencySymbol #1A1A1A` · `grandTotal null` · `link null` · `divider #D8D8DC` · `rowAlt #FAFAFB`.
- `typography`: `fontFamily Helvetica` · `sizeScale normal` · `lineSpacing normal` · `sectionHeadingSize / subsectionSize / bodySize / totalsSize / grandTotalSize / footerSize null` · `bodyWeight 400` · `letterSpacing 0` · `lineHeightOverride null`.
- `spacing`: `sectionGap 32` · `rowPaddingY 9` · `subsectionIndent 18` · `bandHeightPt 10` · `tableHeaderRuleWeight 1`.
- `elementStyle`: `sectionHeading { italic false, underline false, uppercase false, bold true }` · `subsection { italic false, bold true, uppercase true }` · `subtotal { italic false, bold true, labelTemplate "Subtotal" }`.
- `features`: `sectionDescriptionEnabled false` · `currencySplitRendering false` · `columns { showQty true, showUnit true, showRate true }` · `smartUnitHiding false` · `continuationMarker false` · `rowStriping true`.

### A-85 · Editor read/write helpers (how sparse storage is handled)
- Where: `index.tsx:233-467`
- Rules: `readLayoutGroup` = `{ ...DEFAULT_LAYOUT[group], ...stored[group] }` — a **shallow** spread at group level, so a stored nested knob (e.g. `paymentTerms` without `labelStyle`) is shown as stored (the Blocks tab guards `labelStyle` with a default fallback). `updateLayoutGroup` writes `{ ...prevGroup, ...patch }` where `prevGroup = stored ?? DEFAULT_LAYOUT[group]` — so the **first** edit of a group copies **all** the group's defaults into `globalStyles.layout[group]` (the template stops being sparse for that group from then on; later default changes no longer flow through). `updateLayoutNested` does the same one level deeper. Theme helpers (`readThemeColors/ElementStyle/Features/Typography`) merge defaults on read; `updateThemeColor/Feature/Typography/Spacing/ElementStyle` write only the touched key (theme stays sparse except `elementStyle[key]`, which is copied whole on first edit). `updateGlobalStyles` shallow-merges `header`/`footer` sub-objects and replaces every other key.

### A-86 · Font-size and line-height resolution (shared with the renderer)
- Where: `quote-pdf-theme.ts:429-489`
- Rules: base sizes at `normal`: sectionHeading 9 · subsection 8 · body 8.5 · totals 8.5 · grandTotal 13 · footer 7 pt; `compact` −1, `comfortable` +1; a non-null per-element size wins. Line height: `lineHeightOverride` wins, else `tight 1.3 / normal 1.45 / loose 1.65`.

### A-87 · Logo-size resolution
- Where: `quote-pdf-layout.ts:672-686` — `small 42×42`, `medium 64×64`, `large 96×96`, object `{ widthPt, heightPt }` as-is; masthead keeps `width: 100%` and takes only the height.

---

## Which template does a quote use (resolution)

### A-88 · The digitizer's template list and the default on first open
- Where: `src/components/leads/quote-digitizer-dialog.tsx:1114` (`useQuoteDocumentTemplates(user?.studioId)` — **no `companyId`**, so the quote editor always sees the studio-wide set, deliberately: *"Per-entity template overrides resolve at PDF-render time, not at picker-display time"*, `src/__tests__/phase2b-quote-pdf-templates.test.ts:125-135`); auto-apply effect `:2445-2494`
- Rules: "the default" everywhere in the digitizer = `docTemplates.find(t => t.isDefault) || docTemplates[0]`. On first open of a quote with no layout state (legacy path): copy the default's `sections` (re-numbered) into the live editor; seed `globalStyles` only if the user hasn't edited any yet; seed `brandColor` / `logoUrl` overrides when the template carries them and the quote has none. Skipped when `defaultTpl.id === "default"` (synthetic), when read-only, or when the default has zero sections. Items are never auto-applied. Layout edits then autosave to `quotes.doc_sections` (hand-off B).
- Reachable: yes (any quote open).

### A-89 · `applyDocumentTemplate` (explicit apply from the gallery / picker)
- Where: `quote-digitizer-dialog.tsx:4276-4397`
- Rules: **Canva body** (`studioFeatures.canvaEditor && isCanvaBody(tpl)`): set the block tree as the quote's canva template, mark dirty so it persists to `quote_metadata.canvaBlocks`; load `tpl.items` only when a non-empty array (Quote Template) ; land on the *Items* tab; toast *Loaded template "{name}"*; bump `last_used_at`. **Legacy body**: stash currently parsed items for restore; sections merged with a **cover-first invariant** (a template cover is moved to index 0; if the template has none, the quote's existing cover is kept in front); `globalStyles` replaced when present; items: overwrite when `mode === "structure"` or the template has ≥ 1 item (a `full` template with empty items leaves the quote's items alone); `brandColor` / `logoUrl` applied when defined; dismiss the entry screen; bump `last_used_at`.
- Data: `POST /api/studio-config/doc-templates/bump` (A-70).

### A-90 · The canva body ladder (feature flag on)
- Where: `src/lib/quote-canva/compose-quote-body.ts:195-221` (`resolveCanvaBody`), used by the digitizer (`quote-digitizer-dialog.tsx:4936-4992`) and the server render
- Rules: `canva_editor` studio feature defaults **on** (`raw.canva_editor !== false`, `src/app/api/studio-config/features/route.ts:76`). Ladder: (1) `quote_metadata.canvaBlocks` when a valid canva body → (2) `migrateSectionsToCanvaBody(legacy doc sections)` when non-empty → (3) the **studio default quote_pdf body** (`isDefault || first`, only when it *is* a canva body — a legacy `sections` default is skipped) → (4) `TEMPLATE_DYEL` (built-in). Returns `null` only when the flag is off (→ legacy render). Rung 3 seeds `canvaDirty` so the body is written to `quote_metadata.canvaBlocks` on first open (the quote pins the design it opened with). Server/bake pass `strict: true` = only rung 1, else `null` (never guess a design for the canonical PDF).
- Hand-off: B owns the ladder's rendering; recorded here because it is the "which template" rule for canva studios.

### A-91 · Server-side template reads (`renderQuoteCanvaPdfBuffer`)
- Where: `src/lib/quote-canva/render-quote-pdf-server.ts:641-656` (canva rung 3), `:878-897` (legacy PATH 2)
- Rules: canva rung 3 reads `studio_document_templates WHERE studio_id = X AND type = 'quote_pdf' AND is_default = true` with `.maybeSingle()` — **no `is_active` and no `company_id` filter** (a studio with a studio-wide default *and* an entity default has two `is_default` rows → `maybeSingle` errors → logged and treated as no template). Legacy PATH 2 reads `is_active = true ORDER BY is_default DESC LIMIT 1` (default, else any first active row), again with no entity filter, and uses it only when `body_json.sections` is an array. The entity used for **branding** is the lead's `company_id` (`resolveQuoteEntityBranding`, `:333`) — but the **template** is never entity-resolved on either path.
- Hand-off: B for the render; recorded as the resolution rule.

### A-92 · Per-quote overrides (three slots)
- Where: `src/types/app.ts:52` (`QuoteMetadata.layoutOverrides`), `:120` (`themeOverrides`), `:109-117` (`canvaBlocks`), `:118-128` (`canvaOverrides`)
- Rules: `layoutOverrides` (Phase 18, `QuotePdfLayoutOverride | null`) is honoured by `mergeLayout` at every legacy render site and by the lead drawer's total fallback (A-94) — but the UI that wrote it (`quote-layout-override-panel.tsx`, the *PDF Layout* third tab of the digitizer documented in `docs/rules/leads.md:528-529`) **no longer exists in the tree** (file absent; no importer) → **dead** (requirements CSV row 17 confirms: *"that panel is dead code - not mounted anywhere"*). `themeOverrides` is a type stub with **no UI** (B6 dropped 2026-05-26). `canvaOverrides` (`{ [blockId]: { [knobPath]: value } }`) is the live per-quote knob layer for canva bodies, gated by each `KnobDef.overridableByDefault` / the template's `overridability` map (A-104) — hand-off B.

### A-93 · Per-entity templates — where they do and do not apply
- Where: A-02, A-68, A-69, A-73, A-88, A-91
- Rules: entity overrides for `quote_pdf` can be **authored** (Accounts editor with an entity selected → rows with `company_id`) and are **read** by the editor (overlay by name) — but the quote editor lists studio-wide rows only, the canva ladder and both server reads ignore `company_id`, and `useResolvedDefaultDocumentTemplate` (entity → studio → null) is called only for invoice/po/vo. The Phase 2b test's claim that entity overrides *"resolve at PDF-render time"* is not backed by any quote render call (see A-109).

### A-94 · The lead drawer's use of the default template
- Where: `src/components/leads/lead-detail-drawer.tsx:382, 405-432, 599-600`
- Rules: `useDefaultDocumentTemplate(studioId, "quote_pdf")` (studio-wide default only); its `bodyJson.globalStyles.layout` is merged with `quoteMetadata.layoutOverrides` to decide whether optional items are excluded from the recomputed grand total (`totals.optionalWorksSection.enabled && !includeInTotal`), and is passed as `templateBodyJson` to the legacy client-side PDF render on signing-link creation.

### A-95 · Entry-screen gallery cards (touchpoint)
- Where: `src/lib/quote-entry-cards.ts` (`buildQuoteEntryCards`); `QuoteEntryTemplateCard` `src/types/app.ts:1226`
- Rules: cards from the same studio-wide list; sort default first, then by `lastUsedAt` desc (never-used last), synthetic `id "default"` excluded from `savedCount`; `hasItems` marks a Quote Template vs Design Template; card actions rename / delete / set-default / duplicate (`src/lib/quote-template-actions.ts`: unique-name suffix *(copy)*, *(copy) 2*…; delete promotes the first remaining row; duplicate is never default and `lastUsedAt null`; delete copy *This permanently removes the saved design template. Quotes already created from it are not affected.* + *It was your default — the next design template becomes the new default.*) all persist through the same full-set PUT (A-69). Hand-off C (entry screen / save-as-template).

### A-96 · Save as template from the digitizer (touchpoint)
- Where: `quote-digitizer-dialog.tsx:4596-4640` (legacy body), `:4994+` (canva "Save as my template")
- Rules: legacy save builds `{ id: uuid, name, isDefault: params.setDefault, sections, globalStyles, items, brandColor, logoUrl, mode: "full" | "structure", savedAt }`; `structure` scrubs sections/items (prices → 0, descriptions → *Item*); when `setDefault` every other template is flipped to `isDefault: false` in the same PUT. Toast *Template "{name}" saved* (+ *(default)*). Hand-off C.

---

## Permissions

### A-97 · Who may edit / publish / set default
- Where: A-04, A-68…A-74, A-79
- Rules: there is **no publish step** — a saved template is live for every new quote immediately (A-88 auto-apply reads the same list; existing quotes keep their own persisted layout / canva body). No draft/version/history concept on `studio_document_templates`; `updated_at` only. Any role with a session in the studio can create, edit, delete, set default, apply/save presets and upload assets; every route forces `studio_id` from the session and ignores a client-supplied studio id (`document-templates-scoped-api.test.ts`). RLS lock on `studio_document_templates` is **deferred** (route header: *"NOT locked here"*).

---

## Branding inputs the template consumes

### A-98 · Studio branding (`studios.settings.branding`)
- Where: `src/app/api/studio-config/branding/route.ts` (GET whitelist / PUT merge), type `StudioBranding` `src/types/app.ts:4156-4220`, editor `src/components/accounts/branding-editor.tsx` (Accounts › *Branding*)
- Data (fields the GET exposes): `logoUrl` (also mirrors `studios.logo_url`), `primaryColor` (default `#5500FF`), `companyName` (falls back to `studios.name`), `companyAddress`, `companyRegistration`, `companyPhone` / `companyEmail` / `companyWebsite` (alias chain from `contactPhone` / `contactEmail` / `website`), `tagline`, `missionStatement`, `socialLinks { website, instagram, facebook, linkedin, whatsapp, tiktok }`, `accreditations [{ name, imageUrl }]` (legacy free-form list), `bankDetails { bankName, accountNumber, accountHolder, swiftCode }` (falls back to legacy `settings.bank_details` snake_case), `footerText`, `emailSignature`, `paynowQrUrl` (studio-wide QR), `currencySymbolOverride` (e.g. bare `$` instead of `S$`), `quotePreparedByMode` (`team_list` default | `studio_only` | `first_assignee`). PUT merges the partial into `settings.branding` (never replaces other settings keys).
- Rules: the editor's accent-resolved knobs (`dividerStyle.color null`, `subtitle.bandColor null`, `colors.grandTotal null`, `colors.link null`) resolve to `primaryColor` at render; `studioPrimaryColor` in the editor = `useStudioBranding().primaryColor ?? "#5500FF"`. Token values `{studio_*}`, `{company_registration}` come from here (A-101). Hand-off B renders; D writes the schema.

### A-99 · Legal entities (`studio_companies`) — per-entity letterhead, bank, QR
- Where: Accounts › *Legal Entities* (`src/app/(main)/accounts/legal-entities-tab.tsx`, `/accounts?tab=legal-entities`); types `StudioCompany`, `EntityBrandingOverride`, `EntityBankDetailsOverride` (`src/types/app.ts:1890-1939`); resolvers `src/lib/studio-branding.ts` (`resolveEntityBranding`, `resolveEntityBankDetails`, `resolvePaynowQrUrl`, `resolveIssuingEntity`, `resolveIssuingBankDetails`, `resolveEntityTaxRate`, `resolveIssuingLetterhead`)
- Data: entity fields — *Legal name \** (`name`), *Registration / UEN* (`registrationNumber`), *GST / VAT registered* (`gstRegistered`) + *GST / VAT registration number*, *Country*, *Currency*, *Registered address* (`address`), branding overrides *Logo URL*, *PayNow / DuitNow QR* (upload or URL → `branding.paynowQrUrl`), *Primary colour*, *Tagline*, *Footer text (PDFs + signing page)*, bank *Bank name / Account holder / Account number / SWIFT / BIC / Branch (optional)*, contact *Contact phone / Contact email / Website*, *Tax rate (%) — overrides region default* (`taxRate`). Exactly one `isDefault` per studio; deactivate refuses the default.
- Rules: resolution = entity sparse override → `settings.branding` → `studios.name` / hard defaults. `resolveIssuingLetterhead`: name and address inherit from the studio; **registration number inherits only for the default entity** (a non-default entity with a blank UEN prints blank — never the parent's). `resolvePaynowQrUrl(studioBranding, entity)`: entity `branding.paynowQrUrl` else studio `paynowQrUrl`. The quote's entity is `leads.company_id` (issuing entity). The canva `bank-details` / `paynow-qr` / letterhead blocks read these (hand-off B); the legacy `footer.bankDetailsBlock` reads studio branding bank details (A-47). No role gate on entity management (requirements CSV row 55).

### A-100 · Accreditations (platform-curated badges)
- Where: Accounts › *Accreditations* (`src/components/settings/accreditations-tab.tsx`, `/accounts?tab=accreditations`); API `src/app/api/accreditations/route.ts` (catalogue), `studio-state/route.ts` (toggle); server read `render-quote-pdf-server.ts:679-696`
- Data: catalogue table `platform_accreditation_badges { id, slug, name, short_name, image_url, country_codes[], is_active, sort_order }` (admin-curated at `/admin/accreditations`); the studio's enabled set is `studios.settings.enabledAccreditationIds: string[]` (PATCH `{ badgeId, enabled }`).
- Rules: the tab lists active badges for the studio's `country_code` (labels *Singapore / Malaysia / United Arab Emirates / India*) with a switch each; studios cannot add badges. At render, enabled ids are re-filtered to `is_active` and to badges whose `country_codes` include the quote's country, ordered by `sort_order`; the canva *Accreditation strip* block renders them when its `source = 'studio-curated'` (default) — or, when `source = 'manual'`, its own `badges` array (pasted URLs, e.g. from A-59). The legacy `footer.logoRow.imageUrls` (A-46) is a third, URL-only path. Hand-off B for the block.
- Words: *Accreditations* · *Toggle on the badges your studio holds. They appear on your quotes via the Accreditation strip block on the PDF.* · *Loading badges…* · *No accreditation badges available for your region ({code}) yet.* · *Email support@openmaison.ai to suggest one.*

### A-101 · Token dictionary (`{token}` substitution)
- Where: `src/lib/quote-pdf-tokens.ts`
- Rules: `substituteTokens(template, values)` accepts `{token}` and `{{token}}` (double normalised to single); **known** tokens substitute (missing value → `""`); **unknown** tokens pass through with their brackets (so typos stay visible). Known set (31): `studio_name, studio_phone, studio_email, studio_website, studio_address, company_registration, studio_instagram, studio_facebook, studio_linkedin, studio_whatsapp, studio_tiktok, client_name, client_phone, client_email, client_address, client_ic, customer_id, project_title, project_ref, quote_number, quote_date, quote_total, quote_valid_until, prepared_by, prepared_by_phone, prepared_by_email, page_number, total_pages, date, logo`. `QUOTE_TOKEN_PALETTE` (29 entries, labels e.g. *Studio name*, *Client IC / NRIC*, *Quote valid until*, *Prepared-by phone*, *Current date*) is the canonical palette; the editor's popover shows a 19-token subset (A-21). `{prepared_by}` resolution follows `quotePreparedByMode` (A-98). The legacy section chips' `{{companyName}}` / `{{refNumber}}` (A-64) are **not** known tokens.
- Applies to: header/footer slots, `blocks.intro.{title,body}`, `remarks.body`, `closing.body`, `paymentTerms.body`, `signatureBlock.{name,phone,role}`, `header.subtitle.text`, section contents (renderer, hand-off B).

---

## Canva knob catalogue infrastructure (the pure helpers; per-block knobs = hand-off B)

### A-102 · `KnobDef` / `KnobSchema` — what a knob can be
- Where: `src/lib/quote-canva/block-schema.ts:298-350`
- Rules: `KnobSchema.kind` ∈ `text { label, placeholder? }` · `textarea { rows? }` · `richText` · `number { min?, max?, step?, suffix?, description?, defaultValue? }` · `boolean { description? }` · `color { allowNull? }` · `select { options [{ value, label }], description? }` · `image { assetType?: logo | badge | signature | document_image }` · `hidden` · `array { itemSchema[], addButtonLabel?, maxRows? }` (cards with drag-reorder + delete + *+ Add row*; primitive arrays via key `"$value"`; no nested arrays). `KnobDef = { path, schema, overridableByDefault, group?, visibleWhen? }`; `group` = `"Group"` or `"Group/Cluster"`; `visibleWhen(props)` is **panel-only** (never read by `render()`, spec D3). `propPanelSchema` lives in code, never in `body_json`. The audited registry = **378 knobs across 23 blocks** (pricing-table 91, cover-page 31, footer-band 27, logo 26, signature-footer 24, bank-details 21, payment-milestones 19, 16 others ≤ 12).

### A-103 · Grouping (`knob-groups.ts`)
- Where: `src/lib/quote-canva/knob-groups.ts`
- Rules: `groupKnobs(knobs) → { label, clusters [{ caption | null, knobs }], knobCount }[]`. Explicit `group` wins; else the first path segment humanised (`sections.subLine.text` → *Sections*; camel/snake/kebab → sentence case). Order = first appearance. Clusters are quiet separators, never collapsible. Hard cap **4 groups per block** (spec D4, enforced by test). `pricing-table`'s four: *Table & columns* (26) · *Sections* (20) · *Rows* (29) · *Totals* (16).

### A-104 · Visibility (`knob-visibility.ts`)
- Where: `src/lib/quote-canva/knob-visibility.ts`
- Rules: `visibleKnobs(knobs, props, { overridability, perQuoteMode })` drops `kind: "hidden"`; in per-quote mode drops knobs whose `overridability[path] !== true` (the template's lock map; default from `overridableByDefault`); then applies `visibleWhen(effectiveProps)`; a throwing predicate **fails open** (knob shown, error logged). Hidden knobs keep their stored value.

### A-105 · Pairing (`knob-pairing.ts`)
- Rules: a cluster renders 2-up only when **every** knob is `boolean` or `number`, has a label ≤ 18 chars (`PAIRABLE_LABEL_MAX`) and no `description`; otherwise all 1-up (no ragged mixes). Shipped effect: 1 of 19 pricing-table clusters pairs (spec correction 2026-08-19).

### A-106 · Search (`knob-search.ts`)
- Rules: `searchKnobs(query, template, limit = 40, { perQuoteMode })` — scoped to blocks **present in the template** (incl. pricing-table inter-section gap children via `flattenBlocks`); matches block display name, knob label, group label; rank 0 exact / 1 prefix / 2 substring, knob hits +1 so a block hit of equal quality sorts first; hidden knobs are still returned with `hidden: true` (evaluated against `effectiveBlockProps`, fail-open) so the UI can de-emphasise instead of denying the knob exists.

### A-107 · Modified diff & group reset (`knob-diff.ts`)
- Rules: `modifiedPaths(props, defaultProps, knobs)` = declared knobs whose stable-JSON value differs from the block default (drives the per-knob dot, *N changed* chips, rail badges). `resetPathsForGroup(group, modified)` returns **only modified** paths in declaration order (keeps the template sparse so blocks keep tracking future default changes); documented scope limits: a search-filtered group resets only the visible knobs, and a knob hidden by `visibleWhen` is unreachable until its gate is re-enabled.

### A-108 · Knob audit verdicts (2026-08-14)
- Where: `docs/superpowers/audits/2026-08-14-canva-knob-audit.md`; annotations `src/lib/quote-canva/audit/dead-knob-annotations.ts`
- Rules: differential-render audit of 378 knobs: **244 live**, **92 conditional** (inert until a sibling gate — that gate became the `visibleWhen`; 67 knobs hidden fleet-wide under defaults), **16 unverified** (print-time only: `repeatOnEveryPage`, `pageBreakAfter`, running headers), **26 machine-dead** of which **2 confirmed genuinely dead** and 24 false positives (compound / array / cross-block gates). Dead knobs were reported, not removed (spec D7). Per-block tables (accreditation-strip 12, bank-details 21, cover-page 31, divider 4, doc-title 12, …) = hand-off B.

---

## Docs vs code discrepancies

### A-109 · Where the docs and the code disagree (code wins)
1. **Owner-only editor** — `docs/rules/leads.md:527`, `access-control.ts:123-125` comment and requirements CSV row 17 say the template editor is owner-only; `page.tsx:637` gates only `ownerOnly` items and `document-templates` has no flag → every role reaches it; APIs check session only (A-04).
2. **Per-quote PDF Layout panel** — `leads.md:528-529, 543` document `quote-layout-override-panel.tsx` as a mounted third tab; the file does not exist in the tree; `layoutOverrides` is still merged at render but nothing writes it (A-92).
3. **"15 knobs"** — `leads.md:490-519` lists 15 structural knobs; the code has more leaves (subtitle, sectionTitle, roundOff, secondary signatory, labelStyle, repetition, pageMargin) and the editor exposes a different subset (no `sectionTitle`, `roundOff`, `secondary`, `customerId/validUntil/preparedBy` labels).
4. **`pageMargin` default** — doc/spec say 56 pt; code `DEFAULT_LAYOUT.pageMargin = 36` (A-83).
5. **Theme spec vs. shipped** — spec (`2026-05-27-quote-pdf-theme-layer-design.md`) promises Google Fonts at runtime, font upload, font preview, per-knob reset (§F4/F5/F7), preset thumbnails (`preview_url`), a proper colour picker; shipped: three built-in fonts, native `<input type="color">`, no thumbnails, per-knob reset only on the 8 sliders. `leads.md:751-757` records F4/F5/F7/F8 as deferred.
6. **Spec §F3b** says *Save as my preset* opens a small dialog and appears only after knobs were touched; code uses `window.prompt` ×2 and always shows the button (A-51).
7. **Phase 2b test comment** (*"Per-entity template overrides resolve at PDF-render time"*) — no quote render path filters by `company_id` (A-91/A-93).
8. **`documentTitle` hint** *Leave blank to fall back to QUOTATION* — clearing the box stores `null` = hidden, not the fallback (A-19).
9. **Legacy section token chips** `{{companyName}}` / `{{refNumber}}` are not in the renderer's known-token set (A-64/A-101).
10. **`docs/rules/database-auth.md:89`** still lists 6 types and the 117 unique key; code has 9 types (`invoice, po, vo`) and the company-aware unique index (A-76). `DbStudioDocumentTemplate.type` omits `'vo'`.
11. **`quote-terminology.md`** itself flags that item-carrying pickers are mislabeled *"design template"* / *"Saved Design Templates"* (should read *Quote Template*), deliberately left unfixed.
12. **Editor heading** *Quote Document Template* / intro *"Customize the sections…"* vs. the overlay's *Document Templates* and the taxonomy's *Design Template* — three names for the same object.
13. **UAT doc** `docs/uat/customization-p6-uat.md` covers only §4 (signing carousel); *"Sections §5–§7 — To be added when those sections ship"* — no UAT cases exist for the template editor. `e2e/customization-engine.spec.ts` has no template scenario; `e2e/document-templates-overlay.spec.ts` is the only e2e (overlay opens, list width, Select/Popover z-index above the overlay, Insert variable popover, four presets listed, preview pane present, font family switch to Times, badge upload adds a row, Back returns to categories).

### A-110 · Test index for this slice (what each pins)
- `src/__tests__/template-editor-tabs.test.tsx` — 5 tabs, a11y roles, roving tabindex, keyboard, `KnobRow` 192px control column (`controls/knob-row.tsx` — declared but **unused** by the tabs, which inline their own rows).
- `template-editor-knob-roundtrip.test.tsx` — Header is the landing tab; Theme carries column/smart-unit/currency knobs, Sections does not; Sections carries Breakdown style; Footer carries *Show on*.
- `template-editor-repetition.test.tsx` — the three repetition options + hints.
- `header-tab-subtitle-band.test.tsx` — stacked layout option + subtitle knobs gated on it.
- `footer-tab-logo-row-overflow.test.tsx` — logo height clamps to max; renderer `flexWrap: "wrap"`.
- `blocks-tab-payment-terms-label-style-gate.test.tsx` — label-style switches follow `FEE_FIRST_MILESTONES_ENABLED`.
- `quote-pdf-theme.test.ts` — DEFAULT_THEME leaves, merge semantics, no reference leaks.
- `document-templates.test.ts` — migrations 117/118 shape, hooks/routes, 409 on default delete, two-step set-default, timeline fallback.
- `document-templates-scoped-api.test.ts` — 401s, 400s, session-forced `studio_id`, 404 on hidden PATCH, 409 default delete.
- `phase2b-quote-pdf-templates.test.ts` — `companyId` threading, Quote PDF as first tab, key-remount on scope flip, digitizer stays studio-wide.
- `phase3-template-unification.test.ts` — migrations 166/167 (per-entity columns, unique indexes, default promotion).

---

## Uncertain / not verified
- **Save soft-deletes canva rows in scope.** Inferred from code only: the editor filters canva bodies out of `localTemplates` (A-14) and the PUT soft-deletes every active row not in the posted set (A-69). I did not run the app to confirm a canva-studio's Design Templates disappear after *Save Templates*; a guard I may have missed would be in the canva picker re-activating them, but I found none.
- **Two `is_default` rows break the server's canva rung 3.** `.maybeSingle()` with no `company_id` filter (A-91) should error when an entity default coexists with the studio default; not executed against a database.
- **`inited` latch and the auto-save of Set default.** After A-12's PUT and invalidation, the refetched list is not re-synced into local state (A-16); whether the DB order (default first) vs. local order matters to any later save is not verified.
- **Role reach.** All four roles reaching `/accounts?tab=document-templates` is read from `access-control.ts` + the menu filter; `(main)/layout.tsx`'s route guard and `useCurrentRolePermissions` were not read end-to-end, so a separate permission-matrix override for the Accounts page is possible but not seen.
- **`FEE_FIRST_MILESTONES_ENABLED`** is a constant `false` in code; whether any fork flips it (per-studio) was not checked — the label-style switches (A-45) are hidden wherever it is false.
- **The `BrandedQuotePDF` seed row (A-77).** The 118 seed's `body_react_component 'BrandedQuotePDF'` row appears in the editor as *Default Quote PDF · 0 sections*; whether prod studios still carry it (vs. 167's promoted rows) is data, not code.
- **Which knobs the canva renderer actually honours from `globalStyles`.** Legacy `globalStyles.layout/theme` are read by the legacy `quote-pdf.tsx` renderer; how much the canva engine (default-on) reads from the legacy editor's output is B's territory — for a canva studio, much of this editor may only affect the legacy fallback path. Not verified.
- **Preset thumbnails.** `preview_url` is in the table and DTO but never populated by the seed nor written by the custom save; assumed always null.
- **`KnobRow` component** (`controls/knob-row.tsx`) is imported by tests only; I did not confirm no tab uses it (grep of the five tab files shows inline rows).
- **`docs/openmaison-v1-feature-requirements.csv` row 17** counts *"15 layout knobs … 11 colors … 6 feature flags"*; the code has 11 colour rows in the UI (+ `rowAlt` hidden) and 6 feature leaves (+ 2 hidden) — I treated the row as broadly consistent but did not reconcile every count.

