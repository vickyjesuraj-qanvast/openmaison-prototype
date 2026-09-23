# Templates audit — every kind, every touchpoint (2026-09-23)

Owner's brief: "audit very carefully and report with all the bugs, fixes, flows, touchpoints, ingresses, storage, UI and UX issues" between the template editors and the quote / task / contract editors. Method: three code sweeps over `components/company`, `components/quotes/editor`, `components/leads/tasks`, `components/contracts`, `lib/templates`, `lib/quotes`, `app/company`, `app/quotes`, `app/leads/*-actions.ts`; then every flow exercised live on a production build (:3011, test DB). Nothing was changed.

## 1. Storage map — where each template kind lives today

| Kind | Table | Created from | Listed in | Consumed by |
|---|---|---|---|---|
| Quote (design + defaults) | `quote_templates` (+ `quote_template_versions`) | Company › Templates › Quotes (New template ▾), quote editor kebab / Template card "Save as template" | Quotes gallery (grid + list), the picker (Create Quote modal, editor Change, Preview chip) | `createQuote` (design pin, terms/notes ids, payment preset, validity, GST, signature, starter groups) |
| Contract (document) | `contract_templates` | Company › Templates › Contracts (New template ▾), contract editor kebab "Save as Template" | Contracts gallery (grid + list), the tab's From Template picker | `createContractDoc({templateId})` |
| Terms / Notes text | `quote_text_templates` (kind terms · notes) | Quote editor › section › My Templates › Create New | **only** that modal, and the quote template editor's Defaults selects | `createQuote` resolves the default ids into `termsHtml` / `notesHtml`; the modal's Add appends text |
| Task checklist | `task_templates` + `template_tasks` | Tasks tab: row kebab, task panel kebab, bulk bar, toolbar "Save all as Template" | **only** the "Use Template" chooser | `applyTemplate` (title, kind, description — never members, tags or due) |
| Payment split | none — `PRESETS` hardcoded in `lib/quotes/payments.ts` | — | the Payment Schedule presets ▾, the Defaults pane select | `presetRows(key)`; `'custom'` falls back to 10/30/30/30 |

Company › Templates has five tabs; two (Quotes, Contracts) are galleries with their own New template ▾ in the page header; three (Tasks, T&Cs, Payments) render the static "Coming soon" page with a single "Open Quote templates" button. There is no Notes tab (REG-508).

## 2. Bugs (confirmed live unless marked code)

1. **Task templates have no home.** Every "Save as Template" writes `task_templates` (verified: "Audit task template" appears in the Use Template chooser with 5 tasks). Company › Templates › Tasks is the placeholder; "Manage Templates" in the tasks toolbar kebab and inside the chooser both answer "Coming soon" (`lead-tasks.tsx:202, 353`). Templates can never be renamed, reordered, edited or deleted; "Existing Template" only appends tasks. → The owner's "not stored under the tasks template".
2. **Terms and Notes templates have no home.** Create New in the quote editor's My Templates writes `quote_text_templates` (verified: "Audit notes template" listed in the modal and in the Defaults pane's Additional Notes select), but Company › T&Cs is the placeholder and Notes has no tab. The quote template editor's Defaults pane picks from both lists — the studio manages content it cannot see anywhere in Company. No link from the modal to Company. → The owner's "Additional notes … not represented in the templates tabs".
3. **No create CTA on Tasks / T&Cs / Payments.** New template ▾ is per gallery (Quotes creates quote templates, Contracts contract templates), not global; the three unbuilt kinds have no gallery, so no CTA. → The owner's "move the button to respective tabs" is right in spirit: each kind needs its own page + CTA.
4. **"Show in client view" on Terms / Notes is dead.** The editor switch writes `terms_visible` / `notes_visible` (verified: 1 → 0), but nothing reads them: Preview and the client view pane print from `termsHtml` and the Preview's own switches in `client_view_json`. Verified: switch off, Preview still prints the HDB terms. Two sources of truth, one inert.
5. **Defaults pane "Introduction on every quote" does nothing** — `introText` has no consumer (`grep` finds only `model.ts` and `defaults-pane.tsx`). `columns` in `TemplateDefaults` has no UI and is never applied.
6. **Custom payment split saved as a template is lost.** `saveQuoteAsTemplate` stores `paymentPreset: presetOf(rows)` which is `'custom'` for any non-preset split; the Defaults select then shows blank; the next quote silently gets 10/30/30/30 (`payments.ts:87`).
7. **Deleting a text template is a hard delete with no guard.** A quote template whose Defaults reference it keeps a dangling id: the select shows blank and new quotes get empty terms with no message (`createQuote` → null). Quote and contract templates delete softly with a Deleted sheet; text templates do not.
8. **Task template "Team Members" switch is inert.** The Save dialog offers Team Members / Task Description; `template_tasks` has no assignee, tag or due columns and `applyTemplate` never writes assignees ("the demo keeps none"). The switch promises what is never kept.
9. **Manage Templates from an editor is a dead end.** The picker passes `?from=` but no Company page reads it, and the gallery wears the L1 header with no Back. From the quote editor's Change → Manage Templates you land on the gallery with only the browser to return. Same from the contract picker's link.
10. **Changing a quote's template applies the look only.** `setQuoteTemplate` re-pins design and version; the template's Defaults (terms, notes, payment split, validity, GST, signature) are not offered. A user who "switches to the HDB template" expects its HDB terms; they never come.
11. **Save as template from a quote drops the quote's own content.** Captures design (or the Letter house style when the quote has none) + GST + signature + the preset *key*; not the quote's Terms / Notes text, items, groups or validity. The helper says so, but the picker's "Starts with" then advertises "Terms" facts that are the validity days, not terms text.
12. **"Create contract from this quote" ignores contract templates.** Always the studio agreement (`createContractDoc({leadId, fromQuoteId})`, no `templateId`, no picker), while the tab's New Contract offers From Template.
13. **Contract templates gallery gaps.** New template ▾ has no "From a contract…" though `createContractTemplate({kind:'contract'})` exists; Deleted Templates is a plain Dialog (no selection, no bulk bar) unlike the Quotes Deleted sheet; Delete Forever has no in-use guard (safe, since contracts copy the body, but a different rule from Quotes).
14. **Payments.** No way to save a custom schedule as a preset; the presets ▾ never lists "Custom" though the button reads "Custom"; Company › Payments is the placeholder; presets live in code.
15. **`createQuote` never checks the template's status.** `?new=<draftId>` (e.g. from a URL) creates a quote on an unpublished draft; `defaultPick` accepts any id.
16. **Client view pane vs Preview disagree.** The pane draws the live quote but ignores the quote's client-view overrides (no `view` prop); Preview honours them. Hide "Item photos" in Preview and the pane still shows them.
17. **`usedBy` counts wrong things.** Counts quotes on soft-deleted leads; never attributes blank quotes (templateId null) to the studio default; `fetchTemplates` comment says "archived last" but the query does not sort so; the Deleted sheet's "Deleted by" shows `updatedBy`, not who deleted.
18. **Stale copy and docblocks.** Placeholder page: "Quote templates are live today" (Contracts is live too). `company-shell.tsx` docblock still lists "All templates … Notes"; `quote-templates-gallery.tsx` docblock lists the old New template labels; `editor-header.tsx` docblock predates Compare / Create contract.
19. **Editor parity.** Quote editor kebab: Rename, Duplicate and Edit, Export, Version History, Delete and the Comments icon answer "Coming soon"; the contract editor's Duplicate and Delete are live. Create strip "Brand Catalog" coming soon; the Maison AI sheet is empty in every editor.
20. **Dead code.** `listTextTemplates`, `aiSchedule`, `listQuotePayments` have no callers; text template create/update/delete revalidate nothing (the editors are force-dynamic, so it only matters for cached lists later).

## 3. Touchpoints and ingresses — what connects, what doesn't

| From | To | State |
|---|---|---|
| Quotes tab / Tools › Quotes kebab › Manage Templates | Company › Quotes gallery | works (no Back) |
| Quote editor Change / Create strip Templates / Preview chip | picker → Manage Templates | works (no Back) |
| Quote editor kebab / Template card › Save as template | draft quote template + Open | works, partial capture (11) |
| Quote template editor from a quote (`?quote=`) | Back to {number}; Publish and update the quote | works |
| Quote editor Terms / Notes › My Templates | text templates modal | works; no way to Company |
| Quote template Defaults › Terms / Notes selects | `quote_text_templates` | works; no management surface (2, 7) |
| Tasks tab › Save as Template (4 places) | `task_templates` | works; invisible afterwards (1) |
| Tasks tab › Add Task › Use Template | chooser → apply | works; members not applied (8) |
| Tasks kebab / chooser › Manage Templates | — | Coming soon (1) |
| Contracts tab / Tools › Contracts › Manage Templates | Contracts gallery | works (no Back) |
| Contract editor › Save as Template | `contract_templates` + Open | works |
| Contract gallery › New contract from this template | lead picker → editor | works |
| Quote editor kebab › Create contract from this quote | contract editor | works, no template choice (12) |
| Payment Schedule presets ▾ | hardcoded presets | works; nothing to manage (14) |
| Company › Tasks / T&Cs / Payments tabs | placeholder | nothing (3) |

## 4. Proposed fixes, in build order

**Phase A — every kind gets its page, CTA and editor (the owner's three points).**
- *Tasks*: a gallery of `task_templates` (name · n tasks · kept details · created), New template ▾ (Blank · From a lead's tasks…), open → a task template editor (rename, add / remove / reorder tasks, description, the two switches made real by storing assignees / tags on `template_tasks`), soft delete + Deleted sheet; wire both Manage Templates to it.
- *T&Cs and Notes*: one page for `quote_text_templates` with a Terms / Notes segment (or restore a Notes tab — the owner's REG-508 call was made before the Defaults pane depended on notes templates), New template ▾ per kind, the modal's form as the editor page, soft delete + Deleted sheet with an in-use guard (templates referenced by quote template Defaults), a Manage Templates link inside the My Templates modal.
- *Payments*: a `payment_templates` table (name + rows), the four presets seeded as templates, "Save this split as a template" in the Payment Schedule presets ▾, the Defaults select and the presets ▾ reading the table; this also fixes the lost custom split (6).
- Retire the placeholder page; the `[kind]` route becomes each kind's gallery on the Quotes gallery's shell (REG-537 pattern).

**Phase B — the editors and Company talk both ways.**
- Company pages honour `?from=` with the L2 header and Back when arriving from an editor (as Quote X-Ray does, REG-530).
- Change template on a quote offers "Also apply its defaults" (terms, notes, payment split, validity), off by default for a quote past Draft.
- Save as template from a quote offers "Also save this quote's Terms and Notes as text templates and set them as the defaults".
- Create contract from this quote opens the contract template picker (or uses a studio default contract template).
- Contract templates: "From a contract…" in New template ▾; the shared Deleted sheet.

**Phase C — correctness.**
- One source of truth for Terms / Notes visibility: drop the editor switch or make Preview's rows read and write the same columns (4).
- Render `introText` (a block above the items) or remove the field; wire or drop `columns` (5).
- `createQuote` refuses a draft template; the picker hides drafts (15).
- Client view pane takes the quote's `view` (16).
- `usedBy` excludes quotes on deleted leads; the Deleted sheet records the deleter (17).
- Copy and docblocks (18); dead exports (20).

Verification for each phase: a probe per page on the production build, the templates suite extended, screenshots banked under `design-source/verify/`.

## 6. Status — fixed 2026-09-23 (REG-538 · REG-539 · REG-540)

| # | Finding | What shipped |
|---|---|---|
| 1 | Task templates have no home | Company › Templates › **Tasks** gallery + editor `/templates/tasks/[id]` (steps · members · tags · due days); Manage Templates from the tab and the chooser land there with `?from=` |
| 2 | Terms / Notes templates have no home | **T&Cs & Notes** gallery + editor `/templates/terms/[id]` (rich editor, Insert Token ▾); the My Templates modal's Manage Templates opens it |
| 3 | No create CTA on Tasks / T&Cs / Payments | Each tab's toolbar carries its own **New ▾** (REG-541, moved out of the L1 header on the owner's note) creating that tab's kind (Blank · From a lead's tasks… / Terms · Notes / Blank split · From the default split) |
| 4 | "Show in client view" dead | The quote's `terms_visible` / `notes_visible` drive the Preview's base view and the live pane; the Preview's rows write them back |
| 5 | Dead `introText`, `columns` without UI | The field is gone; "Items table opens with" chips set `defaults.columns` → `itemsColumns` on a new quote and on Apply defaults |
| 6 | Custom split lost as `'custom'` | Save as Template writes a payment template for an unmatched split and points the Defaults at it |
| 7 | Hard-deleted text templates | Soft delete + Deleted Templates sheet; Delete forever refuses while a quote template's Defaults reference it |
| 8 | Team Members switch inert | `template_tasks.member_ids` · `tag_ids` · `due_days`; Use Template assigns, tags and dates |
| 9 | Manage Templates dead end | Every Company page honours `?from=` (Back + crumb); every link carries it |
| 10 | Change template = look only | "Apply {template}'s defaults?" on a Draft (schedule · validity · GST · signature · Terms / Notes · columns · starter sections when empty) |
| 11 | Save as template drops content | Terms / Notes → text templates (switch), split → payment template, Defaults updated |
| 12 | Contract from quote ignores templates | The contract template picker opens first; the contract reads this quote |
| 13 | Contracts gallery gaps | On the generic gallery (REG-537 → REG-538): From a contract…, the shared Deleted sheet |
| 14 | Payments | `payment_templates` (presets as rows), gallery + editor, presets ▾ lists the library + Custom + Save this split + Manage |
| 15 | `createQuote` ignores status | Refuses unpublished / deleted templates; `setQuoteTemplate` already did |
| 16 | Pane vs Preview disagree | The pane takes the quote's client view (`view` prop) with the two switches on top |
| 17 | `usedBy` wrong | Live quotes on live leads; template-less quotes count for the default; `deleted_by` shown in the Deleted sheet |
| 18 | Stale copy | The placeholder page is gone; docblocks rewritten |
| 19 | Editor parity | Rename · Duplicate and Edit · Export · Delete live (Version History · Comments still coming soon) |
| 20 | Dead code | `listQuotePayments` removed where unused; `listTextTemplates` still feeds the modal; `aiSchedule` kept for the AI schedule (REG-436) |
