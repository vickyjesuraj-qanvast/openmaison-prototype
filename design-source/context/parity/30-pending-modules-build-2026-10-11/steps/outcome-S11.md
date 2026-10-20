# S11 · Quote templates leftovers — outcome (2026-10-12)

Card: `held:quote-templates` (Quote templates and Company › Templates; recommendation *build*, effort S). 1.0 read:
`src/components/accounts/quote-document-template-editor/tabs/theme-tab.tsx` (the font select: Helvetica · Times Roman · Courier, "Google Fonts and
custom font upload are planned follow-ups"), `src/lib/quote-canva/render-to-html.tsx` (`DOCUMENT_FONT_STACKS` — + Georgia · Inter · Outfit; Tinos
inlined for serif), `src/components/leads/cover-editor/templates/{index,editorial,magazine-split,minimal,bold-statement,studio-letterhead}.ts`
(the five cover presets as slot data), `src/lib/studio-branding.ts` `resolveIssuingLetterhead` + `src/lib/entity-branding.ts`
`resolveDocumentBranding` + `src/__tests__/entity-letterhead-follows-issuer.test.ts` (an entity's name, address, UEN, logo, colour, tagline,
contacts and footer text, each falling back to the studio's; the UEN never borrowed), the inventories `quote-templates-1.0-inventory/A-52 · A-62 ·
B-70 · D-15 · D-157` (`studio_assets` type `font`, 2 MB). Register rows: `steps/reg-S11.md` (REG-S11.1…7 = REG-1794…1800). Probe:
`design-source/verify/pending-modules/verify-pm2-s11.cjs` (**62 / 62**, twice back to back on one server; a full `.dump` before and after each
run is identical); shots banked in `design-source/verify/pending-modules/pm2-s11/`.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| The Outfit font and fonts a studio uploads — "revisit before porting 1.0 designs: they will print in a fallback" | **Built.** *Outfit* joins the curated list (1.0's sixth document font). The web faces are **self-hosted** (latin subsets, OFL; Montserrat · Lato · Outfit · Playfair Display · Fraunces, + Carlito / Caladea, Calibri's and Cambria's metric twins) so a template prints in the face it names on every computer; Inter is the app's own. The document re-measures when a font finishes loading; the preview's auto-print waits for the fonts. **Uploads:** Brand kit › Fonts › *Your own fonts* — Upload a font (a font file by its bytes, 2 MB, a name that isn't a curated face, weight + italic, the licence tick, a sample in the file itself; closes once kept), the family in every font list, printed through `/files/font/<id>`, Used in, Remove with Undo; Owners / Admins | `public/fonts/doc/*` · `app/globals.css` · `lib/templates/model.ts` (`FONT_FAMILIES` · `fontStack` · `FontFace` · `fontChoices` · `fontOptions` · `faceAlias` · `fontFaceCss`) · `lib/templates/fonts.ts` · `lib/company/studio-fonts.ts` · `app/company/font-actions.ts` · `app/files/font/[fontId]/route.ts` · `components/templates/render/studio-font-faces.tsx` · `components/company/templates/brand-fonts.tsx` (+ css) · `brand-kit-view.tsx` · `brand-pane.tsx` · `inspector-controls.tsx` · `document.tsx` · `quote-preview.tsx`; table `studio_fonts` (0095) |
| An issuing entity's tagline, accent colour, contacts and footer on its quotes | **Built** — a quote under another entity prints its phone, email, website, tagline (each else the studio's) and, through the new field `{studio_footer}` *Footer line*, its footer line (else the studio's own entity's); its accent takes the kit's Accent unless the template sets its own; the studio's own quotes keep the kit's. Profile's More details say quotes print them too | `lib/templates/data.ts` (`DocLetterhead` · `docLetterhead`) · `lib/templates/fields.ts` · `components/templates/render/document.tsx` · `canvas.tsx` (Social links' website) · `components/company/profile-view.tsx` |
| Recreate a template from an uploaded quote — stand-in (three curated PDFs) · developers' lane | **Built by rule (no model)** — a PDF is read for its own words in the browser: paper, the table's columns in its words and order, trade / area grouping, validity, the grand total's words, the house style's marking phrases; the reasons are only what it found; the new template (and the editor's Match) takes it. A photo or a picture-only PDF is matched by its name and says so. No credits (1.0 had no such reader). **The seam for a developer's model: `readLayout(lines…)`** — feed it a picture's OCR lines | `lib/templates/recreate.ts` (`readLayout` · `applyReading` · `parseReading`) · `lib/templates/read-quote-file.ts` · `lib/pdf-text.ts` (`pdfReading`) · `components/company/templates/recreate-dialog.tsx` · `quote-templates-gallery.tsx` · `template-editor.tsx` · `app/company/templates-actions.ts` |
| 1.0's five cover-page presets | **Built** — Editorial · Magazine split · Minimal · Bold statement · Studio letterhead under the cover's More options › Start the cover from a look; one undo step, "Cover changed to …" with Undo (one line at a time); the photo place is an empty Picture that says so and prints nothing | `lib/templates/covers.ts` · `components/templates/editor/inspector.tsx` (`CoverLooks`, `ImageSource`) · `template-editor.tsx` (`applyCoverLook`) · `inspector.module.css` |
| Header / footer on chosen pages only | **Kept** (the card's call — 1.0 had the same three choices: every page · first only · after the first) | — |
| Template comments | **Kept** (held, no button — REG-485, his call) | — |
| A fixed-amount row in a Payments template | **Kept** (the fee lives on the quote, REG-1563) | — |
| Maison AI in the template, Tasks, T&Cs, Payments and Schedules editors opens an empty sheet | **Done in S10** (REG-1787 — each editor's own suggestions on the shared sheet); checked again here | — |
| Invoice and PO paper live in Settings › Finance, not Templates — revisit against the one-home rule | **Kept in Settings › Finance, with a door** (as recommended — one home beside the paper's numbers, rules and live preview; K2a's call stands) — the Brand kit's *Invoices, receipts and purchase orders* door lands on Invoice paper with `?from=` and Back | `brand-kit-view.tsx` |

**Found and fixed on the way (bugs):** (1) the editor's *Upload my existing quote to match* kept the file with `setTemplateSource(id, file)` — a bare
string a server action refuses past 1,000,000 characters (a PDF over ~700 KB: "The reference couldn’t be kept"); it rides inside one object now.
(2) The Match replaced the whole design with no Undo — it offers one. (3) Card links to a card taller than the screen landed centred, its title
behind the sticky header and tab strip; there were two copies of the landing (`useHashLanding` and the search's `landOn`) — one now
(`bringCardIntoView`), which lands a tall card with its title in view. (4) The curated web faces printed in fallbacks on any computer without them
installed (Fraunces → Georgia on the demo's Showflat Presentation).

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
- **Should the invoice / PO paper move into Company › Templates?** No — one home stays Settings › Finance (its numbers, money rules and live preview;
  his K2a call); Templates gets the door. Open for Vicky if he'd rather a Templates tab.
- **Fonts:** the curated list stays his list (2026-09-17) + Outfit; uploads come in with a licence tick (an honest stand-in — nothing verifies a
  licence; the record keeps who ticked).
- **An entity's accent** applies to its quotes where the template uses the kit's Accent; a template's own Accent wins (1.0's explicit theme colours
  did); the studio's own entity keeps the kit (its Profile accent is the money papers', as before).
- **Recreate:** words by rule now, pictures by name, no credits; the model is the developers' (`readLayout`).
- **Covers:** in 2.0's shape (the kit's roles and colours, a Picture for the photo), never 1.0's slot editor; inside More options (the editor's rule).

## What to check in the browser (Dane · Owner unless said)
- Company › Templates › Brand kit (1440): scroll to Fonts › Your own fonts → Upload a font → a `.woff2` (try a `.txt` renamed first; then untick the
  licence; then a curated name like "Inter") → Upload → the row, the snackbar; pick it for Heading → "Aa" in it → Save changes → Used in "The kit’s
  Heading"; Remove → the sentence + Undo. **Germaine (View as)**: the list, no Upload / Remove. 390 / 320: the list as stacked rows, the dialog as
  a bottom sheet.
- Company › Profile → add a second issuing entity with More details (tagline, phone, website, accent, footer) → open a Draft quote, Issuing Entity
  = it → Preview: the footer's phone and website are the entity's. Template editor (Default Quote PDF) → Preview with that quote → a footer text ›
  Insert a field › Footer line; Items table › Section headings › Accent band = the entity's colour; Preview with Sample quote = the kit's.
- Template editor › Showflat Presentation → Page › Cover → More options → the five looks → Minimal → Undo; Editorial → the cover's list says
  "no picture chosen yet" → Preview: nothing prints in the photo place. Headings in Fraunces.
- Templates › Quotes › New ▾ › Upload my existing quote → `public/uat-files/cove-interior-quotation.pdf` (Good match, A4, Item · Qty · Unit ·
  Amount S$, grouped by trade then room, grand total "Total") → Open in the editor; a photo (`kitchen-moodboard.jpg`) → "· by its name"; the
  editor's ⋮ › Upload another existing quote with a large PDF → kept, Undo offered.
- Brand kit → *Invoices, receipts and purchase orders* → Settings › Finance, the Invoice paper card's title in view → Back → Brand kit.

## Probes run (production build, :3160, scratch copies of the repaired base)
- `verify-pm2-s11.cjs` **62 / 62** (twice; DB dump identical).
- Regression harness: `tpl-parity` 20/20 · `folders-galleries` 44/44 · `search` 27/27 · `ghosts-same` 51/51 · `ghosts-same-390` 51/51 · `ghosts-strips`
  (pictures; the Brand kit ghost unchanged — the new parts sit below the fold) · `ghosts-measure` (Δ 0) · `first-run-full` 6/6 · `qe-r1…r5`
  34 · 33 · 21 · 14 · 21 · `ct-r1` 36/36 · `ux-p7` 94/94 · `st-r1` 57/57.
- Directly: `verify-pm-d.cjs` 33/33 · `verify-pm2-s01` 79/79 · `s02` 105/105 · `s03` 79/79 · `s04` 82/82 · `s05` 113/113 · `s10` 107/107.
- `npm run design:anatomy` — 1578 measures hold. `tsc`, `eslint app components lib` (0 errors; the 16 warnings are older files'), `design:lint`
  (nothing new) clean.
- The template editor probes the prompt named (`verify-template-editor.cjs`, `verify-tpl-audit.cjs`, `verify-templates.cjs`,
  `verify-template-defaults.cjs`, `verify-templates-libraries.cjs`) are **not in the repo** (never banked — the Map's names; none under
  `design-source/verify/` nor the scratchpads); the template areas they covered are covered by `tpl-parity`, `folders-galleries`, `pm2-s10` and this
  step's probe.

## Migration, repair
- Migration **0095** (`studio_fonts`, additive); the table is in `BASELINE_TABLES` and the snapshot's `TABLES` (the fixture has none → empty on
  Reset). **No repair block** — nothing visible needs seeding (the demo works as it is; a studio that never uploads loses nothing); **R114 is still
  free** for the next step.

## For the next steps
- **S12 (Price book):** nothing shared changed. **S20 / S29:** `lib/templates/recreate.ts` `readLayout` is the lines-in seam a model's reading can
  feed. **S14 (Settings and Company):** the Brand kit now hosts the studio's fonts (`studio_fonts`, Owners / Admins); a card taller than the screen
  lands with its title in view (`bringCardIntoView`) — use it for any new card link. **S31 (a new studio):** a new studio starts with no fonts of its
  own. **Any renderer:** a document's text measures again when a font loads (`TemplateDocument` `fontsTick`); a page that prints on arrival should
  wait for `document.fonts.ready` as the preview does now.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for any of the five; each lives inside a surface he approved (the Brand kit's Fonts
   card, the cover's More options, the Recreate dialog, Profile's More details, the door card Profile already uses); every new word is flagged
   invented copy in `reg-S11.md`; the one look that changes on its own (Fraunces in Showflat Presentation) is flagged for him.
2. **One system, no one-offs** — the card table (REG-727), the house Dialog / bottom sheet, `TextField`, DS `Switch` sm and `Checkbox`, the snackbar
   with Undo and `key`, `Tooltip whenCut`, the door card (`kitLink`), `PortalMenu` field menu; one font list function for every box; one card landing
   for both hash handlers (a copy removed).
3. **Plain words for studio people** — "Your own fonts", "Upload a font", "The studio has the licence to use this font…", "Cover changed to Minimal",
   "no picture chosen yet", "Its table’s columns — … — become the template’s, in its words", "A photo or scan has no words to read here …".
4. **Nothing is lost** — every 1.0 job on the card mapped above; Remove is soft with Undo; a family no longer offered still reads in its box and
   says where it was used; the editor's Match and a cover look both undo; nothing kept by 1.0 is dropped (Outfit, the five covers, the entity's
   look, the font asset type).
5. **Say why** — the upload's five refusals in the dialog (not a font, too big, no name, a curated name, no licence); the remove sentence names what
   prints in a standard font; a photo's match says it was by name; a PDF with nothing to match says so; Designers simply have no Upload / Remove.
6. **Back returns where you came from** — the paper door carries `?from=` and Back lands on the Brand kit; nothing else navigates.
7. **Every screen is whole** — the fonts list's empty line ("None yet."), the dialog's sample and errors, the empty photo place in the editor (and
   nothing in print), the Recreate reading state; no new page, so no new ghost — the Brand kit's ghost still matches its top (ghosts-strips).
8. **Every width is designed** — 1440 · 1024 (inspector drawer) · 768 (mouse and touch) · 390 · 320 checked (sideways scroll 0 against
   `screen.width`); the fonts table stacks on a phone; the dialog is a bottom sheet.
9. **Tables follow the leads listing** — the fonts list is a card table (the short-list type, REG-727), not a listing; no listing added.
10. **Motion with purpose** — none added (the snackbar's and the sheet's own; the landing scroll respects reduced motion).
11. **Honest data** — no seeded fonts or entities (the probe adds and removes its own); the licence tick is said to be a tick, not a check; the
    reading reports only what it found; Recreate makes no claim of AI; demo data unchanged (no repair).
12. **Reach for everyone** — every new control is a labelled button / field / checkbox with a 36–44 target; the cover looks are buttons with full
    names ("Use the Minimal cover — Understated, typographic"); the table has `role` rows and heads; cut names say themselves on hover; Escape
    closes the dialog; keyboard Undo (⌘Z) walks the cover looks back.
- **How to add a missing thing** — one home each (fonts in the Brand kit beside the roles that use them; covers in the cover's More options; the
  entity's look in the renderer, no new setting; the paper keeps its home with a door); shown only when it applies (Your own fonts' table only with
  fonts, Upload / Remove only for Owners / Admins, cover looks only on a cover, "· by its name" only for a photo); one filled button per dialog
  (Upload, Open in the editor); defaults need no set-up (nothing to configure; existing templates print as before, the curated faces now in their
  own files).
