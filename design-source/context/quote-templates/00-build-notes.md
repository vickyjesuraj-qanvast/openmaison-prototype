# Quote templates — build notes (2026-09-17, REG-484…493)

No Figma mock. The UI reference is the owner's Claude Design artifact (https://claude.ai/artifact/TSs6D9DXSsPR9ceemM8bDZ), screens **5a–5d and 6a–6d only**, corrected per the approved proposal v3 (https://claude.ai/artifact/USdFqJr3Yck1ynFoaJrVb1): no settings navigation, no review step, no authored Pages tab, the inspector shows five quick controls then More options. Everything is built on the house DS (`--om-*` tokens, `components/om/*`, `@/components/ds`).

## What a template is

`lib/templates/model.ts` — `TemplateDesign { page, brand, blocks }` + `TemplateDefaults`.

- **Page**: A4 or Letter, margins in mm, a watermark.
- **Brand overrides**: only what differs from the studio's kit (`settings` key `brand`, `lib/templates/brand.ts`): logo · dark logo · stamp · badges · six named colours · four type roles.
- **Canvases** (header · footer · cover): a height in mm, a repeat rule (every page · first page · after the first), elements placed in mm — text, image, details rows, rule, box, signature columns, badges, page number. The cover is its own page; the header and footer never draw on it.
- **Flow blocks**: quote details, title & intro, the items table, totals, payment schedule, T&Cs, notes, signature, text, image, divider, spacer, page break, badges. Singletons (items, totals, payments, terms, notes, cover, header, footer) exist once.
- **Fields** (`lib/templates/fields.ts`): `{client_name}`, `{quote_number}`, `{studio_uen}`, `{page}` / `{pages}` … resolved from the quote, the lead, the brand kit's details and the member.

## How it renders

`components/templates/render/` — one renderer for every surface (gallery card, Create Quote tile, editor canvas, Preview, printed PDF).

1. `slices.tsx` turns the flow blocks into slices (a table row, a paragraph, a totals block …) with packing hints: `breakBefore`, `keepWithNext`, `groupKey`, `tableId` / `isHead`, `amountMinor`.
2. `document.tsx` measures every slice once in a hidden box the width of the page body (re-measured when the flow blocks, brand, page, view or data change — never for a canvas drag), then packs pages: body height = page − margins − header (if it shows on that page) − footer; the table head repeats on continuation pages; `keepGroups` moves a section that would split; `fillPage` adds empty rows to the foot; `pageTotals` reserves a row and sums the page's lines; `{page}` / `{pages}` resolve per page. The last page carries "Powered by OpenMaison" when the client view keeps it.
3. `canvas.tsx` draws a canvas's elements; with `interactive` they select, drag (pointer capture, 0.5 mm steps), resize and edit text in place.

Print: `@page { size: <paper>; margin: 0 }`, one page per sheet, the chrome hidden (`quote-preview.module.css`).

## The editor

`components/templates/editor/template-editor.tsx` — state in `editor-state.ts` (`useHistory`: past / present / future over `{ design, defaults }`; a transient set for a drag in progress, a coalesced set for typing). Autosave writes the draft 900 ms after the last change; Publish flushes it first. Selection = `{ blockId, elementId? }`; Delete removes it; Esc clears it; ⌘Z / ⇧⌘Z / ⌘Y.

- **Structure**: page setup · outline (cover and header pinned, the flow in a motion `Reorder.Group`, the footer pinned, "Page n" markers from `onPaginated`) · Add block.
- **Brand**: the kit's values, overrides marked, Reset to brand.
- **Defaults**: payment preset · T&Cs / notes templates · validity · GST · client signature · intro.
- **Inspector**: `inspector.tsx` per block kind; `inspector-controls.tsx` = Field · Seg (DS SegmentedButton) · Sel / Num / Txt (house TextField, an Insert field menu) · Sw (DS Switch sm) · ColorPick (the six named colours + custom) · StyleEditor (role · font · size · weight · B/I/U/Aa · align · colour) · Group (More options).
- **Preview with**: the sample quote (`lib/templates/data.ts SAMPLE_DATA`), an empty quote, or any recent quote (`loadQuoteDocData`).
- **Reference** (REG-491): the uploaded file in the right pane; an image can lie under the first page.
- Tablets: the panes as drawers. Phones: view only.

## Lifecycle and the quote side

`app/company/templates-actions.ts`: create (blank · house style · from a quote · copy) → Draft; `saveTemplateDraft`; `publishTemplate({ note, setDefault, updateDrafts })` → version n+1 + a `quote_template_versions` row; `rollbackTemplate` republishes an old version as a new one; `discardTemplateDraft`; rename · default · duplicate · archive · delete.

A quote pins `template_version` when it is created or its Template is changed (`setQuoteTemplate`); a newer publish shows the editor's banner (`updateQuoteTemplateVersion`); sent quotes keep their version. The quote's client-facing switches are `client_view_json` (`saveQuoteClientView`), the difference from `clientViewFromDesign(design)`. Preview reads it all through `fetchQuotePreview`; readiness is `lib/templates/readiness.ts`.

## Seed

Repair R31: the brand kit (demo details + the reference quotes' badges), the three seeded templates published as v1 with the house styles (Default Quote PDF = Letter, 4-Room BTO = Scope, 5-Room BTO = Form), OM-10008 on 4-Room BTO v1. `npm run db:repair` then `npm run db:baseline`.

## Verification

`verify-templates.cjs` (scratchpad): the Company panel and pages, the gallery, a template from a house style, the editor (outline, page markers, inspector, undo/redo, canvas selection and drag, autosave, Brand / Defaults, Preview with a quote), publish and history, the Create Quote thumbnails, the quote's Template field, v2 + the update banner + Update, the Preview (pages, readiness, client view switches persisting, Internal copy), Profile save, Recreate from a PDF with the reference pane, tablet drawers and the phone's view-only. Banked screenshots: `design-source/verify/quote-templates/`.

## Joined to the quote editor (REG-494…497, 2026-09-18)

- `components/templates/template-picker.tsx` + `lib/templates/picker.ts` (`PickerData`, `pickerTemplates`, `startsWith`, `viewForTemplate`, `clientColumnsOf`, `cleanGroups`): the one picker. Fed by `QuoteTemplateState.picker` (quote editor), `QuotePreviewData.picker` (Preview) and the modal's rows + brand/sample.
- Create Quote modal: `mode` rail | all; View all / Preview → the picker; New template → `HouseStyleDialog` (nested, "Or recreate…") → `createTemplate` → `/templates/[id]?from=<page>&lead=<id>`.
- `lib/templates/origin.ts` `EditorOrigin`; the editor page resolves `?from ?quote ?lead` (`fetchEditorOrigin`, `fetchQuoteDocData`); `PublishDialog` `origin` → `then: 'origin' | 'stay'`; `publish()` then `setQuoteTemplate` + push `from`, or `createQuote(lead)` + push the editor.
- Quote editor: `TemplateCard` (template-bar.tsx), the picker Dialog, the regroup ConfirmDialog → `updateItemsPrefs` + `forceView` on `ItemsCard`, `ClientViewPane` (`docDataFromRecords` over the editor's live state), `clientColumns` → `ItemsTable` head eyes + the drawer's "Show only what the client sees". Loader adds `brand`, `studioDetails`, lead phone/email.
- `TemplateDefaults.starterGroups` (raw lines; `cleanGroups` at use); `createQuote` inserts the groups and sets `itemsView` from the template's Group by.
- Tools › Quotes: `?new=<templateId>` opens the modal on it; `?template=<id>` scopes the list.

## Approval (REG-501, 2026-09-18)

- Setting `template_approval` (`lib/settings/*`, Settings › Leads card). `fetchTemplateEditor` returns `approval` + `canApprove` (Owner / Admin).
- Record: `quote_templates.submitted_by / submitted_at / submit_note / review_note` (migration 0023). Awaiting = `submitted_at IS NOT NULL`; status untouched, so a published template keeps printing.
- Actions: `submitTemplate(id, note)`, `requestTemplateChanges(id, note)`, `publishTemplate` (guarded by role when required; clears the submission — publishing is the approval; the version note defaults to the submit note).
- UI: `components/templates/editor/review-bar.tsx` (`ReviewBar`, `NoteDialog`), `PublishDialog` `approve` mode, the gallery's Awaiting approval filter + ribbon, `railBadges()` `'/company'` → the rail item's badge and the panel's "n awaiting" (`countPendingTemplates`).
- Seed: repair R32 — Sarah's "Showflat Presentation" (Presentation house style, draft, submitted 2h ago). Probe: `verify-approval.cjs changes` / `approve` on a restored DB each.

## Ready-made design preview (REG-510 → REG-512, 2026-09-18)

REG-510's in-dialog pane lasted an hour: the owner could not read it. `house-style-dialog.tsx` is the xl 1200 with four cards (thumb, name, paper, blurb, **Preview**) and the name field; Preview swaps the same Dialog's content to `TemplatePreviewPages` (`components/templates/template-preview-dialog.tsx`: `TemplateDocument` at zoom = min(1, (scroller − 48) / page px) read through a ResizeObserver in a ref callback, `onPages` → the subtitle's page count) with `leading` arrow_back + `eyebrow` crumb; both states are `width={1200} height={960}` so nothing jumps. Probe: `probe-house.cjs` (16 checks: l 800, 12px one-line subtitle, four Previews, the xxl window 1344×928 at 1440, A4 at 794px, Back, selection follows, Recreate 800, Deleted Templates xl + heads + empty row, Publish 600, phone sheet).

## Dialog consistency (REG-511, 2026-09-18)

`deleted-templates-sheet.tsx` + `.module.css` are copied from `components/leads/files/deleted-files-sheet.*` with the templates' columns — keep the three deleted sheets in step. `Dialog` now wraps `subtitle` in `.subtitle` (12/16 secondary) and takes `fluid`. Widths: only 400 / 600 / 800 / 1200 (or fluid).

## List view (REG-505, 2026-09-18)

The gallery toolbar's end: search · `tune` (list only) · the Files tab's `SegmentedIconToggle` (hidden ≤767, where the cards are the one view). `useFlagPref('om.templates.list')` remembers the choice; `useTableColumns('quote-templates', TEMPLATE_COLUMN_DEFS, phone)` + `ColumnSettingsDrawer` in the gallery. `templates-table.tsx` is the Files list (`components/leads/files/files-table.tsx`) with the card's facts as columns and no selection column; `template-menu.tsx` holds the kebab's six items for both the card and the row (`onAction` in the gallery routes them). Probe: `probe-templates-table.cjs` (21 checks: toggle, heads, 56/60, Default chip, Status words, the Used by link, Column settings, the row menu, the name opens the editor, remembered on return, filter scopes the rows, phone = cards, tablet scroller + touch kebab).

## Delete (REG-502, 2026-09-18)

`quote_templates.deleted_at` (migration 0024). `deleteTemplate` (soft; refuses the default and a template awaiting approval), `restoreTemplate`, `deleteTemplateForever` (refuses while a live quote is on it). `pickerTemplates` and every published-templates query exclude deleted rows; `fetchTemplates` returns `deleted` for `DeletedTemplatesSheet` (the gallery's header kebab). `QuoteTemplateState.current.deleted` → the Template card's "Deleted · vN still prints"; the editor of a deleted template shows a Restore bar and cannot publish. Archive is gone.

## Deep audit (REG-520…526, 2026-09-18)

Four read-only reviewers (quote editor · template editor · templates surfaces · style / motion / responsive) plus a live Playwright sweep (`sweep.cjs`: console errors, missing glyphs, broken images, overflow, sticky-cell lag at 1440 / 768 touch / 390 touch / 320) — 147 findings, the confirmed ones fixed in REG-520…525, the rest logged in REG-526. Things the next edit must keep: the ≤767 card placements in the Quotes / Contracts stylesheets need `!important` (the layout hook's inline placement, REG-520); `ItemsCard` reports `onPricing` (GST → the text context) and takes `addTick` (the strip's My Items); the template editor locks while a submission waits (`awaitingLock`); `rollbackTemplate` publishes and is guarded like `publishTemplate`; the Deleted Templates sheet uses the bulk actions; the Profile's typed fields hold drafts.

## Picker head and the edge add (REG-527 / 528, 2026-09-18)

`template-picker.tsx` head: count · Manage Templates (`withFrom` to the gallery) · search · grid / list (`om.picker.list`); the list rows are `.rowTile`. The Items row's bottom-edge + (`.edgeAdd`, `--ix` from the row's pointermove) is mouse-only. Probes: `probe-picker.cjs` (9), `probe-edge-add.cjs` (6).
