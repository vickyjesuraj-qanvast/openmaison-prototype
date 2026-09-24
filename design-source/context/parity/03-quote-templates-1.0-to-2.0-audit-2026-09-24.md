# Quote templates — 1.0 → 2.0 parity audit (2026-09-24)

**Written for:** the owner, to mark row by row; and the 1.0 developers, as the migration map for the quote template module.

**The brief** (owner, 2026-09-24, the parity programme's second module — REG-605 set the shape): audit and benchmark everything 1.0 does around **quote templates** — the studio's document templates and their knobs, the block layout engine and its renderers, the content templates ("Packages"), the rules and the text templates — against 2.0's quote template editor, Company › Templates and its libraries; features, functionality, logic and data; **no UI reference** (2.0 keeps its design system, layouts, transitions and components); nothing missed; every mismatch flagged; **ask before implementing**. Nothing in this document has been built. The quote editor itself, Quote X-Ray, Contracts and the other template editors follow as their own audits in this order.

## 0.1 Sources

- **1.0** = `qanvast-id-tool` at `67f42e469` on `integ/security-non-qanvast`. Five readers read the code and docs whole; their inventories are banked beside this file under `quote-templates-1.0-inventory/` and are the references cited in the rows: **A** the document template editor · knobs · theme presets · defaults · resolution · branding inputs; **B** Canva mode — blocks · slots · reference templates · the per-quote layout editor · the HTML / PDF / signed / shared renderers; **C** content templates (Packages) · generation rules · rich-text templates with variables · admin templates · touchpoints; **D** the data model (both migration sets, the JSON shapes, the column-level diff, the port plan); **E** what 2.0 has today. The live app on :3001 was **not** browsed for this module (the scripted login was not permitted in this session, §8) — every row rests on the code reading.
- **2.0** = `openmaison-prototype` at `e867c0d` (the Leads parity rounds committed).

## 0.2 Scope rules

- **In scope:** everything that decides how a quote *prints* and what a *new quote starts with* — the template's design, its defaults, its lifecycle (draft · publish · version · default · delete), the renderer's rules (pagination, what the client sees, hidden fields, amounts, dates, GST, bank / PayNow, signatures), the text and payment and task defaults, the content templates a quote can start from, and who may do what.
- **Later modules (their own audits, in the owner's order):** the quote editor's line items · pricing · packages · versions · approvals · sharing flow (Quotes); Quote X-Ray; Contracts and the signing library; the Tasks · T&Cs & Notes · Payments · Contracts template *editors* beyond what a quote template consumes. Their template-side touchpoints are listed; their internals are not.
- **Excluded by earlier decisions:** nothing yet for this module — the owner's exclusions for Leads (Journey mode · Archive) do not touch templates.
- **Not for a prototype:** real PDF generation and fonts, storage, share-link OTP delivery, crons, AI drafting. Listed as *Platform* with the stand-in 2.0 keeps.
- **Vocabulary:** 2.0's words come from its mocks and from the owner's simplicity rule for this editor (REG-542: plain words for an elderly studio owner); where 1.0's words differ the row says so and §1 decides.

## 0.3 Status legend

| Status | Meaning |
|---|---|
| **Built** | 2.0 has it, in its own shape. |
| **Partial** | 2.0 has part of it; the gap is named. |
| **Missing** | 1.0 has it, 2.0 has nothing; a proposal follows. |
| **Mismatch** | both have it and they disagree; the owner decides (all collected in §2). |
| **Later** | another module's internals. |
| **Platform** | live infrastructure; 2.0 keeps a stand-in. |
| **Dead** | code no 1.0 user can reach; not ported unless asked. |
| **2.0 only** | no 1.0 counterpart; kept and listed so the devs know it is new. |

## 0.4 How to mark

Write **go** · **hold** · **no** in the *Mark* column of any row, or answer §6 by question number. Rows marked go are built in the rounds of §7, each logged in `REGISTER.md` as `user-directed` with "1.0 · <inventory row>" as the source, verified on :3011 and banked under `design-source/verify/`.

Reading order: **§1 Definitions** first — "template" means three different things in 1.0 and one in 2.0, and every later row leans on that.

## 1. Definitions — the same thing under two names

| # | Concept | 1.0 | 2.0 | Verdict · question |
|---|---|---|---|---|
| DEF-01 | **"Template"** | Three objects. A **Design Template** = a `studio_document_templates` row of type `quote_pdf` without `items` (the look). A **Quote Template** = the same row with an `items` array (a starter quote with prices). A **Package** = a `studio_assemblies` row, a bundle of lines added mid-quote. The UI still labels item-carrying templates "design template" (A-vocab, C-vocab, C-42). | One **quote template** = a design (page · brand overrides · blocks) + New quotes defaults (split · texts · validity · GST · signs online · starter sections · working columns). Lines with prices live in **Company › Price book › My Sections** (E-11, E-63, E-105). | **Mismatch, by design.** Map: Design Template → quote template; Quote Template's `items` → a My Section per category + the template's starter sections (D-123); Package → My Section (D-58). **Q-01** keep 2.0's one-template model. |
| DEF-02 | **Two engines, three renderers** | A legacy five-tab knob editor over `globalStyles.layout / theme` (Accounts › Document Templates, A-23…58) **and** Canva mode, a block tree edited per lead (B-01…57), on by default (`canva_editor !== false`, A-90). The legacy editor hides canva rows and its full-set save soft-deletes them (A-14, A-69 — inferred). Three renderers print quotes: canva HTML → Chromium, the legacy `@react-pdf` sections engine, and a bare jsPDF line list as the last fallback; which one prints depends on the surface. Server paths are strict: a quote with no saved canva layout prints the legacy design even though its editor shows the canva one (B-80, B-81). | One editor, one model, one renderer for every surface (E-74). | **Mismatch.** Nothing to decide — the port reads both 1.0 shapes into 2.0's model (§4). Flagged so the devs know which 1.0 path, and which printed look, a studio's clients have seen. |
| DEF-03 | **Where a design is edited** | Studio level: the knob editor (legacy). Quote level: the digitizer's Layout tab edits the block tree **per lead** — every quote of a lead shares one body (`leads.quote_metadata.canvaBlocks`, B-07). | Studio level only: the template editor. A quote pins a template version and keeps client-view switches; it never stores a design (D-62). | **Mismatch.** **Q-02** per-quote design edits (1.0) vs "edit the template from the quote" (2.0). |
| DEF-04 | **Knob** | A sparse override on `DEFAULT_LAYOUT` / `DEFAULT_THEME` (legacy, about 110 leaves, A-83, A-84) or on a block's `defaultProps` (canva, 378 knobs across 23 blocks, A-102). | A block's or element's own property, edited in the inspector (five quick controls + More options, E-47…57). | **Same idea, different grain.** §3.3–§3.6 map every knob group. |
| DEF-05 | **Theme preset / house style** | Four system presets (*Minimal*, *Arthaus* — identical to Minimal, *Flo-style*, *Studio Loft*) + one custom slot per studio, **deep-merged** onto a template ("starting points, not subscriptions", A-50/51, A-78/79). Canva has three reference bodies (*Minimal* = Dyel, *Centered Premium* = IDL, *Branded* = Flo, B-37…39, C-67). | Four ready-made **designs** (Letter = Dyel, Scope = Flo, Form = Cove, Presentation), each a whole design + defaults a new template starts from (E-69…73). | **Mismatch in mechanism.** **Q-03** Save as my preset. |
| DEF-06 | **Default** | One default per (studio, legal entity, type) (A-76). Picked on first open of a quote: `isDefault` else the first row (A-88). | One default per studio; only a published template; a template-less quote prints through it (E-17). | **Mismatch on entity scope** — see DEF-07. |
| DEF-07 | **Per-entity templates** | A quote PDF template can be authored per legal entity (`company_id`) and the editor reads the overlay — but **no quote render path applies it**; the quote editor lists studio-wide rows only (A-02, A-91, A-93). | Entities live in Company › Profile; the quote's Issuing Entity picks the letterhead name, bank, PayNow and GST (E-55, E-61). No template per entity. | **Mismatch (1.0 half-built).** **Q-04** keep 2.0 (one template; the entity decides the bank, QR and GST). |
| DEF-08 | **Lifecycle** | Save = live for every new quote at once; no draft, publish, version, history or roll back (A-97, B-08). | Draft → Published vN → Default; autosaved draft; versions; roll back; sent quotes pinned; the update banner moves Drafts only (E-11…22). | **2.0 only.** Kept. |
| DEF-09 | **Who edits** | Every studio role can edit, set default, apply presets and upload assets — the docs say owner-only, the code does not gate (A-04, A-109 #1). | Owners and Admins publish; a Designer submits for approval; a backup approver (E-19, E-111). | **Mismatch — 2.0 stricter.** **Q-05** keep 2.0. |
| DEF-10 | **Delete** | Soft (`is_active = false`); the default cannot be deleted through the generic API (409), the editor instead promotes the first remaining row; no restore UI; the copy says "permanently" (A-11, A-72, C-39). | Soft with Deleted Templates: Restore · Delete forever (never while a quote prints through it) · Empty trash; the default cannot be deleted (E-7, E-20). | **Built (2.0 fuller).** |
| DEF-11 | **Tokens / fields** | `{token}` and `{{token}}`, 30 known keys, unknown ones print as typed (A-101, B-60). Rich-text documents use a separate `{{token}}` family where unknown ones print **empty** (C-49/50). | `{key}` fields in six groups with "Prints as"; unknown keys print as typed (E-67/68). | **Same rule for the quote.** Renames in §3.7 (TF rows). |
| DEF-12 | **Per-quote overrides** | `canvaOverrides[blockId][path]`, saved beside the lead's body (B-07), allowed only where the template's lock map (`overridability`) says so (B-04, A-104). The legacy `layoutOverrides` is merged at render but nothing writes it (dead, A-92). | `ClientView`: 14 switches of what the client sees, per quote, over the template's own view (E-79/81). | **Mismatch.** Part of **Q-02**. |
| DEF-13 | **Sample data in the editor** | A fixed sample (*Demo Studio Pte Ltd*, *Mrs Tan Mei Ling*, `#5500FF`) — not the studio's own brand (A-67). | The sample quote drawn with the studio's own kit, an empty quote, or any of the 12 latest real quotes (E-31). | **Built (2.0 fuller).** |
| DEF-14 | **Starter content** | A Quote Template's full `items` (with prices); "clean" mode scrubs prices and names to *Item* (C-38); generation rules add lines by project type (C-43…46). | Starter **sections** (empty groups) in New quotes; priced lines come from My Sections (E-65, E-105). | **Mismatch.** **Q-06**, **Q-07**. |
| DEF-15 | **Section / trade** | A quote line's `category` string, with a studio catalogue (`studio_quote_categories`: name · sub-categories · **a description printed under the heading on every quote**) (C-30). | Trades (Settings › Quotes) + the quote's own group rows; a section note per quote (E-108, E-51). | **Partial.** **Q-08** a default note per trade. |
| DEF-16 | **Client-facing share settings** | Accounts › Quote Sharing saves a link method, a link expiry (7–90 days) and four switches — optional toggles, payment schedule, variations, "Powered by OpenMaison" (A-07). **No code reads any of the six**: share links never expire, signing links expire after a fixed 7 days, and no quote surface prints "Powered by" (B-94, B-101). | Per quote, over the template's base: the client view's payment schedule and "Powered by" rows (E-79…81); the last page carries "Powered by OpenMaison" unless the client view turns it off (E-75). | **Dead in 1.0.** Nothing to port; the link settings belong to the Quotes audit. **Q-09**. |

## 2. Mismatches — both have it, they disagree

| # | Topic | 1.0 | 2.0 | Question |
|---|---|---|---|---|
| MM-01 | Where a design lives | per lead (all quotes share) | per template version, pinned per quote | Q-02 |
| MM-02 | Edit a quote's look | the Layout tab, saved per lead | Edit template from the quote; Change template | Q-02 |
| MM-03 | Presets | sparse deep-merge + one custom slot | whole designs + Duplicate / Save as template | Q-03 |
| MM-04 | Entity templates | authored, never applied | none; entity brand on the quote | Q-04 |
| MM-05 | Roles | everyone | Owner / Admin publish, Designer submits | Q-05 |
| MM-06 | Starter lines | template carries priced items | starter sections + My Sections | Q-06 |
| MM-07 | Save as template modes | *full* (everything) · *clean* (prices → 0, names → *Item*) (C-38) | carries design, texts, split, validity, optional starter sections; never lines (E-94) | Q-06 |
| MM-08 | Numbering modes | seven: continuous A1 · per section · per sub-section · hierarchical 1.2a · section-letter + item · section-letter + sub-section · none (B-18) | five: per section · per room · run through · nested 1 · 1.1 · a b c · none, with section marks A · B · C / 1 · 2 · 3 (E-47) | Q-10 |
| MM-09 | Optional lines | Two modes. *Inline with row tint* — the block default and the Minimal and Branded starters: optional rows print in the main column and **count** in the sub-totals, GST and Grand Total. *Separate Optional Price column* — the Centered Premium starter: the price sits in its own column, out of the totals, with an *Optional Works* row after the Grand Total. Legacy: an Optional Works block with an *Include in Grand Total* switch. The signing page then lets the client accept or decline each optional line with its own running total, which the designed PDF above it does not follow (A-39, B-99). | an Optional works **section** with its own title, always out of the totals (E-51) | Q-11 |
| MM-10 | Totals shapes | *Full* · *Stacked* ("Total Renovation / Less Discount / Grand Total") · *Single line*; GST label override; a Round Off row (never wired) (A-37…40) | six switchable lines each with its own words (E-53) | none — every 1.0 shape is a 2.0 setting (D-103); Round Off vs 2.0's per-line rounding **Q-12** |
| MM-11 | GST inclusive | pricing table GST tab: *GST* / *Inclusive* (B-18) | GST on / off per quote and per entity; no inclusive printing | Q-13 |
| MM-12 | Repetition | header: first page · every page · never; footer: same; any block `repeatOnEveryPage`; running header `fromPage` (A-31, A-49, B-23) | header / footer canvas: every page · first page only · every page after the first (E-40) | none — `never` = hide the canvas; `fromPage 2` = after the first (D-95) |
| MM-13 | Fonts | Legacy editor: Helvetica · Times Roman · Courier (A-52). Canva bodies accept Georgia · Inter · Outfit as well, and studio-uploaded fonts print when a stored body names one, though the editor never lists them (B-70). | 14 curated faces (E-59) | Outfit and uploaded fonts missing — Q-14 |
| MM-14 | Accreditations | a platform-curated catalogue per country, toggled per studio (A-100) | the studio's own uploaded badges in the brand kit (E-60) | Q-15 |
| MM-15 | Payment milestones | percent rows **and** fixed-amount rows (*fee-first*, flag off everywhere), ordinal 1st / 2nd, footnote, "Est Costs" label (B-35, A-45) | percent rows, letters, due dates, amounts, a Total line (E-54) | Q-16 |
| MM-16 | Signing on the PDF | invisible signature slots; the signed image is stamped onto the canonical PDF; a fallback signature footer is appended when a design has none (B-30, B-69, B-83…87) | a signature block prints the member's saved signature and the client's typed name once Signed; no fallback (E-57) | Q-17 |
| MM-17 | Unknown-token rule in documents | `{{}}` family prints nothing for an unknown token (C-49) | an unknown template field prints as typed (E-68) | none — 2.0's template fields keep typos visible (E-68); 2.0's text templates use their own bracket tokens, rewritten on port (D-167) |
| MM-18 | Watermark | text with opacity and rotation, or a logo watermark (D-92) | a word only (E-36) | Q-18 |

## 3. Feature matrix

Columns: the 1.0 feature (inventory row) · what 1.0 does · what 2.0 has (inventory row) · status · proposal or question · your mark.

### 3.1 The library and the lifecycle

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| TL-01 | Accounts › Document Templates (A-01, A-03, A-06) | A full-screen overlay with six kinds: Quote PDF · Invoice · Purchase Order · Variation Order · Terms & Conditions · Contract. Back lands on Lead Categories. | Company › Templates: Brand kit · Quotes · Contracts · Tasks · T&Cs & Notes · Payments (E-1). | Built | Invoice / PO / VO → Later (Finance). | |
| TL-02 | The template list (A-08, A-13, C-35) | Name, section count, Default badge; the entry screen sorts default → last used → name. | Gallery + list, status line, usage line, ribbons; default → updated (E-2, E-3, E-5, E-6, E-8, E-9). | Built | | |
| TL-03 | Add a template (A-09) | A name box; the first template ever becomes the default; nothing saved until *Save Templates*. | New ▾ Blank · ready-made design · upload my existing quote; a Draft opens at once (E-4, E-12). | Built | | |
| TL-04 | Save / dirty / discard (A-15, A-16) | One *Save Templates* for the whole set; no dirty tracking, no discard, no unsaved prompt; Save with an empty list deletes every row. | Autosave 900 ms, Discard the edits, never-published draft delete (E-13, E-16). | Built | 2.0 safer; no change. | |
| TL-05 | Set as default (A-12, A-71, A-74) | Auto-saves the whole set; the generic API swaps in two steps. | One default per studio, published only (E-17). | Built | | |
| TL-06 | Rename · Duplicate (A-10, A-95, C-39) | Rename refuses case-insensitive collisions; Duplicate names "{name} (copy)", "(copy) 2". | Rename dialog; Duplicate "Copy of {name}"; names made unique "{name} 2" (E-10, E-18). | Built | Words differ only. | |
| TL-07 | Delete (A-11, A-72, C-39) | Soft; the default promotes the first remaining row; no restore. | Soft + Deleted Templates + Restore + Delete forever with the quote guard (E-7, E-20). | Built | | |
| TL-08 | Last used (A-70, C-24) | `last_used_at` bumped on apply; orders the entry screen. | `last_used_at` stamped on create / set template; orders the rail and the picker (E-21, E-88). | Built | | |
| TL-09 | Versions · history · roll back (A-97, B-08) | None. | Built (E-14, E-15). | 2.0 only | | |
| TL-10 | Approval (A-04, A-97) | None; any role. | Submit · Request changes · Approve and publish (E-19). | 2.0 only | Q-05. | |
| TL-11 | Entity scope (A-02, A-73, A-93) | "Editing templates for" on multi-entity studios; saved as overrides; never applied to a quote. | — | Mismatch | Q-04. | |
| TL-12 | Legacy settings fallback (A-68, A-77) | Reads `studios.settings.quoteDocumentTemplates` when a studio has no rows; a synthetic *Default* when nothing exists. | Seeded templates (R22 · R31); a studio always has the default (E-113). | Platform | Port once (§4). | |
| TL-13 | Seeds (A-77, C-27) | *Default Quote PDF* (0 sections), El Arte's fork seed, staging Arthaus seeds. | Default Quote PDF (Letter) · 4-Room BTO (Scope) · 5-Room BTO (Form) · Showflat Presentation draft (E-113). | Built | Demo data only. | |

### 3.2 The editor frame

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| TE-01 | Five tabs (A-23) | Header · Sections, Items & Totals · Blocks · Footer · Theme, keyboard-reachable. | Page · Brand · New quotes + the inspector (E-23…26, E-28, E-30, E-35, E-37, E-58). | Built | | |
| TE-02 | Live preview (A-67, B-56) | Sample data (not the studio's brand); canva re-renders a PDF 800 ms after a change; a pop-out window. | The canvas is the page; Preview with the sample, empty or a real quote; preview mode (E-31, E-32). | Built | Pop-out window: not proposed. | |
| TE-03 | Undo (B-47, B-48) | Per session, whole-document snapshots; delete with an Undo toast. | 100 steps over design + defaults, coalesced typing, Undo on every remove (E-27, E-29). | Built | | |
| TE-04 | Knob search (A-106, B-51) | Finds blocks and knobs by name, hidden ones de-emphasised. | — | Missing | Not proposed — 2.0's inspector shows one block at a time (REG-542 simplicity rule). | |
| TE-05 | Modified dots + group reset (A-107, B-49) | A dot per changed knob, "N changed", reset a group to defaults. | Brand tab: "this template" marks + Reset to brand (E-62); blocks have no reset. | Partial | **Q-19** "Reset this block" in More options. | |
| TE-06 | Grouping, pairing, visibility rules (A-103…105, A-108: of 378 knobs, 244 live, 92 conditional, 26 flagged dead) | ≤ 4 groups per block; two-up only for short booleans / numbers; `visibleWhen` hides a knob until its switch is on. | Five quick controls + More options; controls under a switch appear with it (E-47…52). | Built | | |
| TE-07 | Lock map (A-104, B-04) | The template marks which knobs a quote may override. | — | Missing | Part of Q-02. | |
| TE-08 | Assets card (A-59…62) | Upload badges (500 KB) and designer signatures (1 MB); *Copy URL* to paste into a knob; soft delete keeps old PDFs rendering. | Brand kit: logo · stamp · badges; members' own signatures; a picture element takes an upload (E-60, E-41). | Built | No URL pasting needed. | |
| TE-09 | Quote Template Sandbox (A-05, B-57, C-33) | Owner-only developer page, URL only. | — | Dead | Not ported. | |

### 3.3 Page, header, footer and cover

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| TP-01 | Paper and margins (A-22, B-50) | A4 · Letter; margins in pt (canva in mm); *Space above the letterhead*. | A4 · Letter; margins 0–60 mm per side (E-36). | Built | Units convert (D-91). | |
| TP-02 | Page background (B-50, D-93) | A colour or an image with opacity. | A canvas background colour only. | Missing | **Q-18** with the watermark. | |
| TP-03 | Watermark (B-50, D-92) | Text, opacity 0–1 (0.08), rotation (−30°); legacy also a logo watermark. | A word (E-36). | Partial | Q-18. | |
| TP-04 | Header layouts (A-24) | Single band · Two-column · Structured key-value · Centered logo stacked. | Any of the four can be drawn on the header canvas from text, picture, details and line elements (E-40, E-41); the house styles show three of them (E-69…72). | Built | | |
| TP-05 | Customer info slot (A-25) | None · header right · below header. | A Details element on the header or a Quote details block below it (E-41, E-44). | Built | | |
| TP-06 | Registration line (A-26) | Below logo · above divider · hidden. | A text element with `{studio_uen}` placed anywhere (E-41). | Built | | |
| TP-07 | Logo size and style (A-17, A-27, B-13) | Small 42 · medium 64 · large 96 pt or exact; square vs masthead; canva variants standalone · stack · wordmark. | A picture element sized in mm; brand logo or the dark one; text elements beside it (E-41). | Built | | |
| TP-08 | Divider (A-28, B-22) | Accent at 40 % or a colour; weight; solid · dashed · dotted. | A line element or the canvas rule: thickness, colour (E-40, E-41). | Partial | Dashed / dotted missing — not proposed. | |
| TP-09 | Subtitle band (A-29, B-19) | A banded line ("VERSION 3", "DRAFT") in the header. | A text element on a box, or a text block with a tinted box (E-41, E-46). | Built | | |
| TP-10 | Field labels (A-30, B-20, B-61) | Seven editable labels (three more with no control). | Details rows with their own labels (E-41, E-44). | Built | | |
| TP-11 | Header / footer slots left · center · right (A-21) | Three token texts per band; *Insert variable* appends. | Text elements placed freely with the Insert-field menu (E-41, E-42, E-67). | Built | | |
| TP-12 | Band heights (A-20, A-56) | Header / footer height in pt, two controls for one value. | Canvas height in mm; the canvas grows with its content (E-40, E-76). | Built | | |
| TP-13 | Repetition (A-31, A-49, B-23, B-68) | First page only · every page · never; blocks flagged every page join a letterhead band or a footer band. The running header's *First page* knob is never read — it prints once, in flow (B-108). | Every page · first page only · every page after the first; hide the canvas for never (E-40). | Built | MM-12. | |
| TP-14 | Page number (B-21, B-75) | "Page {n} of {m}" top right · bottom centre · hidden, printed only through a page margin box; `skipFirstPage` is never read; the Branded starter prints no page numbers; `{page_number}` in a text prints "1" on every page (B-108, B-112). | A Page number element with `{page}` / `{pages}` resolved per page (E-41, E-68). | Built | 2.0 fuller. | |
| TP-15 | Cover page (A-18, B-33) | Include switch; kicker · title · subtitle · background image with dim · accent strip · client / project / date / prepared-by rows. | Cover canvas: box · picture · text elements; its own page (E-40, E-39). | Built | | |
| TP-16 | Social row (B-25) | Icons + handles from the studio's links, horizontal or vertical. | `{studio_social}` as text (E-61, E-67). | Partial | **Q-20** a Social links element with icons. | |
| TP-17 | Footer band modes (B-24) | Plain text with links and a rule · accreditation strip · multi-column. | Footer canvas with text, rule, badges elements (E-40, E-41). | Built | | |
| TP-18 | Table of contents (D-121) | `globalStyles.toc` in the type; no editor control. | — | Dead | Not ported. | |
| TP-19 | Document title (A-19, B-14) | "QUOTATION" at the top right; empty hides it; canva: text, case, bold / underline / italic, size. The hint says blank falls back to QUOTATION, but blank hides it. | The Title & intro block's title, or a text element on the header (E-45, E-41). | Built | | |
| TP-20 | Dates (B-66, B-20) | Short or long with the weekday, set once for the document; a details row may override. | "Dates print as": three formats for `{date}` and `{valid_until}` (E-36, E-68). | Built | | |

### 3.4 The Items table

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| TI-01 | Columns (A-55, B-18) | #, Description, Qty, Unit, Rate, Optional price, Amount; each on / off; header words; widths. | #, Item, Qty, Unit, Qty · Unit, Unit price, Discount, Total; on / off, words, width, alignment, order (E-48). | Built | Optional price column → Q-11. | |
| TI-02 | Header row (B-18) | Band on / off, colours, case, repeat on every page. | Plain · ruled · grey band · black band · none; repeats on continuation pages (E-49, E-75). | Built | | |
| TI-03 | Section headings (A-33, B-18, B-64) | Band uppercase · underlined bold · italic plain · plain; band height. | Grey · accent · black band · underlined · in the description column (E-47). | Built | | |
| TI-04 | Sub-section style (A-34) | Uppercase band · italic sentence case · underlined bold · hidden. | Sub-groups as labelled areas; text style per level (E-47, E-52). | Built | | |
| TI-05 | Numbering (A-36, B-18) | Seven modes incl. continuous "A1, A2" and "section letter + sub-section 1..n"; pin section numbers. | Five modes + section marks (E-47). | Partial | Q-10. | |
| TI-06 | Sub-totals (A-35, A-54) | Hidden · in the band header · a row after the items · both; label template with `{section_letter}`. | A sub-total row under each section with its own words `{section}` (E-50). | Partial | **Q-21** sub-total in the section band. | |
| TI-07 | Section descriptions (A-55, C-30) | A description line under each heading; per-category default text from Quote Categories. | Section notes from the quote (E-51). | Partial | Q-08. | |
| TI-08 | Descriptions (B-36, B-71) | Formatted descriptions with highlight marks and text colours. | Not printed · first line · every line · bullets; formatted HTML kept (E-49, E-77). | Built | | |
| TI-09 | Row highlight (B-53, B-100) | A hex per line; readable text colour picked by luminance. | Highlight › ink or fill per line and section (E-77). | Built | | |
| TI-10 | Amount words (B-18) | `amountMarker` ("TBC", "FOC") prints instead of a number. | Print as: FOC · Inclusive · KIV · Packaged · a custom word; zero-amount word (E-50, E-77). | Built | | |
| TI-11 | Optional lines (A-39, B-18, B-99) | Inline with a tint and counted in the totals (default), or in a separate Optional price column out of the totals; legacy Optional Works block with *Include in Grand Total*. | Optional works section, always out of the totals (E-51). | Mismatch | Q-11. | |
| TI-12 | Currency (A-55) | Symbol from region; *Currency split rendering* (symbol in its own column); `currencySymbolOverride` in branding. | S$ · "$ " · figures only (E-50). | Partial | Split rendering: **Q-22**. | |
| TI-13 | Smart unit hiding (A-55) | Hides Qty where the unit already carries it ("12 ft"). | — (the nearest is the merged Qty · Unit column, E-48). | Missing | Not proposed. | |
| TI-14 | Zebra rows · grid · density (A-53, A-56) | `rowStriping` (no control), row padding 0–16 pt, sub-section indent 0–36 pt. | Zebra · grid lines · rule under rows · compact / normal / roomy (E-49). | Built | Numeric padding / indent: not proposed. | |
| TI-15 | Continuation marker (A-55) | `continuationMarker` (no control). | — | Dead | Not ported. | |
| TI-16 | Item photos (B-98) | A thumbnail beside the description, on by default (18 pt). | Item photos (E-49). | Built | | |
| TI-17 | Lump sum / page totals / fill page (—) | — | One lump sum per section · a total for each page · fill the page (E-50, E-51). | 2.0 only | | |
| TI-18 | Variation orders (B-18) | Omission lanes and a before / after reconciliation. | — | Later | Finance. | |
| TI-19 | Inter-section blocks (B-11) | Any block dropped between two sections of the table. | Section notes; blocks sit before or after the table. | Partial | **Q-23**. | |

### 3.5 Totals, payments, bank, signature and other blocks

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| TB-01 | Totals shapes (A-37, A-38) | Full · stacked · single line; GST label override. | Six lines, each on / off with its own words; right or full width; rules (E-53). | Built | MM-10. | |
| TB-02 | Round Off row (A-40) | Knob exists, never wired. | Per-line rounding to a step (E-109). | Mismatch | Q-12. | |
| TB-03 | GST inclusive (B-18) | Prints tax as included. | — | Missing | Q-13. | |
| TB-04 | Payment milestones (A-45, B-35, B-63) | List or table; ordinal; Est Costs; footnote; Total Quoted Sum; fixed rows behind a flag. | Table · list · cards; amounts; due dates; letters; Total line; black band title (E-54). | Partial | Q-16. | |
| TB-05 | Payment terms as text (A-45) | A free-text block: numbered · bullets · paragraph · pipe table; before / after totals or footer. | The Payment schedule block from the quote's milestones; a Text block for free words (E-54, E-46). | Built | | |
| TB-06 | Bank details (A-47, B-27) | Issuing entity's bank else the studio's; labels editable; extra rows; SG auto-title; SWIFT. | The quote's issuing entity; Bank · Account name · Account number · PayNow; QR beside or below (E-55). | Partial | **Q-24** SWIFT, label words, extra rows. | |
| TB-07 | PayNow QR (A-48, B-28) | Legacy: a pasted URL + caption; canva: from the entity, else the studio. | From the entity's upload in Company › Profile (E-55, E-61). | Built | | |
| TB-08 | GST registration line (B-29) | Region wording (SG GST · MY SST · AE TRN · IN GSTIN); blank when not registered. | `{studio_gst}` prints nothing for an unregistered entity (E-68). | Built | SG only; other regions Platform. | |
| TB-09 | Signature block (A-43, B-30) | Name / role / phone / image; two or three columns; a second signatory (no control); fallback footer when absent. | Up to four columns; member signature · client · stamp · a line (E-57, E-66). | Built | Fallback → Q-17. | |
| TB-10 | Intro · remarks · closing (A-41, A-42, A-44, B-15) | Intro with title styling; remarks boxed or italic before / after totals; closing text. | Title & intro block; Text block with a box; Additional notes block (E-45, E-46, E-56). | Built | | |
| TB-11 | Subject line (B-31) | A bold underlined statement. | Title & intro's subject line (E-45). | Built | | |
| TB-12 | Terms & Conditions (A-65, C-52) | A section that pulls the studio's default T&C document. | Terms block printing the quote's own text, seeded from the template's T&C template (E-56, E-63). | Built | | |
| TB-13 | Image · spacer · divider · page break (B-16, B-17, B-32, B-34) | Sizing fixed width / height / natural, rounded corners. | Picture (width, alignment, caption) · Blank space · Line across · New page (E-46). | Built | Rounded corners: not proposed. | |
| TB-14 | Keep together (B-15) | Keep on one page; keep with next. | Keep together with what follows; keep a section on one page (E-43, E-51). | Built | | |
| TB-15 | Accreditation strip (A-46, A-100, B-26) | Platform catalogue or pasted URLs; one or two rows; caption. | Badges block / element from the kit (E-46). | Partial | Q-15; caption not proposed. | |
| TB-16 | Legacy sections list (A-63…66) | Six section presets; one pricing table and one payment section; `{{clientName}}` chips (two never resolve). | Blocks with singletons (E-38, E-39). | Built | The broken chips are not ported. | |
| TB-17 | Callout · two columns (D-113) | Info / warning / success / note callouts; two-column text with a ratio. | Text block with a tinted or outlined box (E-46). | Partial | Not proposed. | |

### 3.6 Theme and brand

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| TT-01 | Theme presets (A-50, A-78, A-80) | Four system presets, deep-merged; confirm before applying. | Four ready-made designs for a new template; Upload my existing quote to match (E-69…73, E-33, E-34). | Mismatch | Q-03. | |
| TT-02 | Save as my preset (A-51, A-79) | One custom slot per studio; saves the template's sparse overrides. | Duplicate a template; Save as template from a quote (E-18, E-94). | Mismatch | Q-03. | |
| TT-03 | Typography (A-52, A-56, A-57) | Three fonts; density ±1 pt; line spacing; body size 6–14; six per-element sizes; weight and letter spacing (no control). | Four brand roles (family · size · weight) + per-text overrides incl. line height and letter spacing; 14 faces (E-52, E-59). | Built | Q-14 for Outfit. | |
| TT-04 | Colours (A-53) | Eleven named colours + zebra; two default to the studio accent. | Six named brand colours used by name; any text a custom hex (E-59, E-52). | Built | | |
| TT-05 | Element style (A-54) | Bold / italic / uppercase / underline for section, sub-section, sub-total. | The same on every text style (E-52). | Built | | |
| TT-06 | Spacing (A-56) | Section gap, row padding, sub-section indent, band height, page margin. | Space before / after per block; density; margins (E-43, E-49). | Partial | Not proposed. | |
| TT-07 | Studio branding (A-98) | Logo, primary colour, company details, socials, bank, footer text, PayNow, currency symbol override, *prepared by* mode. | Brand kit + Company › Profile (E-59…61). | Partial | **Q-25** *Prepared by* mode; footer text is a footer element. | |
| TT-08 | Legal entities (A-99, B-62) | Per entity: logo, colour, tagline, footer text, bank, QR, UEN, GST, tax rate; registration inherits only for the default entity. | Up to six entities: name, bank, account, PayNow + QR, GST-registered (E-61). | Partial | **Q-26** per-entity logo / letterhead / UEN / address. | |
| TT-09 | A template's own brand (—) | — | Brand tab overrides with Reset to brand (E-62). | 2.0 only | | |
| TT-10 | Font upload (A-52, A-62, B-70) | A font asset type exists and prints when a stored canva body names it, but no screen uploads one and the editor never lists them. | Decided, not built (E-60). | Later | With Q-14. | |

### 3.7 Fields

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| TF-01 | Token set (A-101, B-60) | 30 keys; the insert popover offers 19. | 43 fields in six groups with "Prints as" (E-67). | Built | Renames: `client_ic` → `nric`, `client_address` → `site_address`, `company_registration` → `studio_uen`, `quote_date` → `date`, `quote_total` → `total`, `quote_valid_until` → `valid_until`, `project_title` → `quote_title`, `page_number` / `total_pages` → `page` / `pages` (D-122). | |
| TF-02 | Social tokens (A-101) | `{studio_instagram}` · facebook · linkedin · whatsapp · tiktok. | One `{studio_social}` (E-67). | Partial | With Q-20. | |
| TF-03 | `{logo}` token (A-101) | Inserts the logo inline. | A picture element (E-41). | Built | | |
| TF-04 | `{section_letter}` (A-54) | In the sub-total label. | `{section}` in the sub-total words (E-50). | Built | | |
| TF-05 | Double-curly documents (C-49, C-50) | `{{token}}` in T&C, contract, invoice texts; unknown → empty. | T&Cs & Notes templates with Insert Token, resolved on create (E-100, E-90). | Built | MM-17. | |

### 3.8 A quote and its template

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| TQ-01 | The default on first open (A-88, A-94, B-05) | Copies the default's sections / body into the quote; canva ladder: saved body → migrated sections → studio default → Dyel; server paths print a saved canva body, else the legacy design (B-80). | `createQuote` pins the chosen template's version; Blank Quote takes the default's settings (E-64, E-90). | Built | | |
| TQ-02 | Apply a template (A-89, C-36) | Replaces the look; items replaced only when the template carries them; Undo toast. | Change template → Apply defaults · Keep mine → Regroup?; lines stay (E-89, E-91, E-92). | Built | | |
| TQ-03 | Entry screen (C-35) | Four ways: saved templates · Blank · Upload a quote · Draft with AI; cap 6, search at 7. | Create Quote: Blank + three templates + View all; Upload / Maison AI coming soon (E-88, E-97). | Built | | |
| TQ-04 | Save as template from a quote (A-96, C-38) | *full* or *clean*; set as default. | Design + texts + split + validity + optional starter sections (E-94). | Mismatch | Q-06. | |
| TQ-05 | Per-quote design edits (B-41…55) | Layout tab: insert, move, delete blocks; knob overrides within the lock map, all saved with the lead (B-07). | Edit the template from the quote (origin kept, Publish and update) (E-93, E-95). | Mismatch | Q-02. | |
| TQ-06 | Published changes reach quotes (A-97) | Instantly for every new quote; open quotes keep what they opened with. | New quotes after Publish; Drafts move by the banner; sent quotes pinned (E-21). | Built | | |
| TQ-07 | Client view pane (—) | — | Live client view beside the quote editor (E-96). | 2.0 only | | |

### 3.9 Renderer, print and what the client sees

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| TR-01 | One renderer (B-43, B-59, B-67, B-78…81) | Canva: the same `render()` for canvas and server HTML → Chromium PDF; legacy `@react-pdf` for flag-off studios and strict server fallbacks; a bare jsPDF list as the last fallback. | One `TemplateDocument` everywhere (E-74). | Built | | |
| TR-02 | Canonical PDF, render hash (B-72, B-82) | One stored PDF per quote in a public bucket; a hash as ETag and "Quote updated" signal; self-heal renders when it is missing. | Print from the Preview (E-78). | Platform | | |
| TR-03 | Pagination (B-15, B-24, B-73…77) | Keep together, repeat the table's header row, letterhead and footer bands measured into the page margins, page counters. | Live pagination with the same rules (E-75, E-76). | Built | | |
| TR-04 | Cost and markup never print (B-18, B-58, B-97, B-98) | No block paints cost, markup, waste or vendor — but the Centered Premium starter prints the *internal* notes of optional lines as reasons, and the no-sign-in preview endpoint returns cost, margin and notes (see §8.1). | Never printed; Internal copy for the studio (E-83). | Built | | |
| TR-05 | Share settings (A-07, B-94) | Six settings saved, none read (DEF-16). | Client view per quote; `/confirm` link without expiry (E-79…81, E-86, E-87). | Dead | Q-09. | |
| TR-06 | Readiness (—) | — | Readiness before sending (E-82). | 2.0 only | | |
| TR-07 | A revision's changes (—) | — | Printed changes on version n (E-85). | 2.0 only | | |
| TR-08 | Amounts per line / section / total (—) | — | Built (E-84). | 2.0 only | | |
| TR-09 | Draft marking (B-102) | The designed PDFs mark nothing — a draft prints like an approved quote unless the template carries a watermark; only the jsPDF fallback prints "DRAFT — NOT YET SIGNED". | No status marking; an "Internal copy" watermark for the studio's own copy (E-83). | Built | Same rule; not proposed. | |
| TR-10 | "Powered by OpenMaison" (B-101) | Printed on no quote surface. | On the last page unless the client view turns it off (E-75, E-81). | 2.0 only | | |

### 3.10 Content templates, rules and text

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| TC-01 | Packages (C-01…21, C-25, C-26) | A named bundle of lines for one section with cost and margin; region, property type, tags; picker with filters and preview; apply appends; save a section as a package. | My Sections: saved from a quote's row menu, edited in Company › Price book, inserted whole (E-105). | Built | **Q-27** property type and tags on a section, and the picker's filters. | |
| TC-02 | Platform packages (C-04, C-22, C-57) | Qanvast-authored rows copied into a studio; the admin page likely cannot create them. | — | Platform | Not proposed. | |
| TC-03 | Quote Templates with items (C-34, C-37…41) | A starter quote with priced lines. | Starter sections + My Sections (E-65, E-105). | Mismatch | Q-06. | |
| TC-04 | Generation rules (C-43…47) | Lines added by project type; scope-item rules can never fire; owner-only *Starter Quote*. | — | Missing | Q-07. | |
| TC-05 | Rich-text templates (C-48…52) | One shared merge-field editor for T&C, contract, invoice, PO, VO texts. | T&Cs & Notes templates, contract templates, the in-house rich editor (E-98, E-100, E-102, E-104). | Built | | |
| TC-06 | Quote categories (C-30) | Catalogue with sub-categories and a printed description. | Trades (E-108). | Partial | Q-08. | |
| TC-07 | Legacy `quote_templates`, AI tier packages, apply RPCs (C-14, C-15, C-28, C-29) | No UI reaches them. | — | Dead | Not ported. | |
| TC-08 | Payment schedule defaults (C-56) | The studio's default schedule template, else 10/30/30/30. | Payments library + the template's split (E-101, E-63, E-110). | Built | | |
| TC-09 | — | — | Task templates, added to a lead in one go from the Tasks tab (E-99, E-103). | 2.0 only | | |

### 3.11 Roles

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| TG-01 | Edit / set default / delete (A-04, A-97) | Every role; server checks a session only. | Owners and Admins; Designers submit (E-19, E-106). | Mismatch | Q-05. | |
| TG-02 | Package CRUD (C-23) | A seeded permission no code reads; any member who can open Accounts. | Company › Price book (E-105). | Built | Roles for the Price book: the Quotes audit. | |
| TG-03 | Quote rules (C-47) | "Owner-only" by comment; the tab has no gate. | — | Missing | With Q-07. | |

### 3.12 Touchpoints (other audits)

| ID | Touchpoint | Where it goes |
|---|---|---|
| TX-01 | Invoice · PO · VO document templates (C-64) | Finance |
| TX-02 | Timeline, project and milestone templates (A-75, C-58…60, C-66) | Projects |
| TX-03 | Signing Documents library, `signing_flow`, the T&C carousel at signing (C-53…55, C-65) | Contracts |
| TX-04 | Share link, OTP, preview token, expiry, view count, the audit log (A-07, B-88…96, D-65) | Quotes |
| TX-05 | Notification templates (C-61) | Notifications (built in the Leads rounds) |
| TX-06 | Cover and floor-plan templates (C-62, C-63) | Tools |
| TX-07 | Price Book and Quote Approval Rules tabs (C-31, C-32) | Quotes |
| TX-08 | Quote numbering and its settings (E-107) | Quotes |
| TX-09 | Optional add-ons accepted or declined by the client on the signing page (B-99) | Quotes / Contracts |

## 4. Data model — the port plan

The column-level work is in inventory **D** (`quote-templates-1.0-inventory/D-data-model.md`): §4.1 the table map (D-50…D-70m), §4.2 the column diffs, §4.3 the JSON-shape diff (D-90…D-125), §4.4 enums and units, §5 the port plan. The headline:

| 1.0 | 2.0 | Verdict |
|---|---|---|
| `studio_document_templates` type `quote_pdf` | `quote_templates` + `quote_template_versions` | Rename + split (D-161). Each 1.0 row lands as a template **published v1** (history starts at the port), `is_default` kept, `defaults_json` filled from the studio's default split, default T&C and GST. Entity rows (`company_id`) are dropped unless Q-04 says otherwise (D-129 is the column if it does). |
| Legacy `sections` body · canva `schemaVersion 2` body | `design_json` (pages · canvases · elements · blocks) | Canva: header-zone and repeating blocks become the header canvas, footer-zone blocks the footer canvas, the rest flows in order (D-162). Legacy: mapped directly, not through 1.0's lossy migration, which drops covers, callouts, images, payment terms and signatures (D-163). The legacy knobs resolve through `mergeLayout` / `mergeTheme` first. |
| `body_json.items` (a Quote Template's lines) | `price_book_sections` + `defaults_json.starterGroups` | *full* mode: one My Section per category; *structure* mode: the categories as starter sections only (D-163). Q-06. |
| `studio_quote_theme_presets` | code (`presets.ts`); a custom preset → a Draft template at v0 | System rows are not ported (D-146); a custom row becomes a Draft template (D-164). Q-03. |
| `studio_assemblies` (Packages) | `price_book_sections` | Rename (D-165); dollars → cents; `created_by`, `category`, optional and price-book links need D-136 / D-137; property type / tags only if Q-27. |
| `quote_generation_rules` | — | Q-07. |
| `leads.quote_metadata.canvaBlocks · canvaOverrides · layoutOverrides` | `quotes.template_id · template_version · client_view_json` (E-112) | One lead at a time, on 1.0's own ladder (D-166). A lead whose saved body differs from the studio's templates either gets a template of its own that its quotes pin to, or pins the default and loses its look — Q-02. Column switches, optional works, payment schedule and signature carry into `client_view_json`; the section order, notes and sub-total words become group rows. |
| `studio_companies` · `studios.settings.branding` · `studio_assets` | `settings.brand` (kit + details + entities) · `members.signature_*` | Merge (D-68…D-70a). |
| tnc / contract rows | `quote_text_templates` · `contract_templates` | Rename. |
| Money | 1.0 dollars (items), cents (rules), basis points (margins); pt for layout | 2.0 minor units; mm for layout (× 0.3528). |

## 5. Logic to carry over verbatim (for the devs, independent of UI)

1. **Knob resolution** — default ← template ← quote override; groups shallow, a nested knob replaced whole except the deep-merged few (A-81…85; the full default tables are A-83 and A-84). The port must resolve a 1.0 template this way **before** converting it.
2. **Font sizes** — base 9 / 8 / 8.5 / 8.5 / 13 / 7 pt, compact −1, comfortable +1, per-element size wins; line height override wins over tight 1.3 / normal 1.45 / loose 1.65 (A-86).
3. **Logo sizes** — small 42, medium 64, large 96 pt (A-87).
4. **Canva body ladder** and **strict** server rendering: never print a guessed design for the canonical PDF; without a saved body, server paths print the legacy design (B-05, B-80).
5. **Legacy → canva migration** safety nets: a header of logo · title · details · divider, one pricing table, a footer with the studio name, a GST line; singletons collapse to the first (B-06, B-12).
6. **Issuing-entity ladder** — the lead's entity, else the default active entity, else the first active; never an inactive one; a registration number inherits from the studio only for the default entity (A-99, B-28, B-62).
7. **Milestone amounts** — fixed rows keep their amount; percent rows split the rest; the last percent row absorbs the rounding (B-35).
8. **Marker and optional lines** — a line printing a word in place of its amount contributes 0 (B-65); whether optional lines count depends on the table's mode — counted *inline with a tint*, left out in a *separate column* — so the port reads the mode per template before it pins a quote (B-99).
9. **Token rule** — `{{x}}` normalises to `{x}`; a known token with no value prints nothing; an unknown one prints as typed (A-101).
10. **Row highlight contrast** — white text below relative luminance 0.45 (B-18).
11. **Package mapping** — an absent cost stays absent, never 0 ("a fabricated 0 cost renders as a 100 % margin") (C-02).
12. **Generation rule order** — creation order; de-duplicate by price-book id, else description; first wins (C-44).

## 6. Questions before anything is built

Answer by number: **go** takes the recommendation, or write the alternative. Rows in §1–§3 point here.

| # | Question | Recommendation | Rows |
|---|---|---|---|
| Q-01 | Keep 2.0's one-template model (design + New quotes defaults), with priced content in My Sections? | Yes. | DEF-01 |
| Q-02 | A quote's look: keep 2.0's "edit the template from the quote" (no per-quote design, no lock map)? And on the port, does a 1.0 lead with its own edited layout get a template of its own (its quotes pin to it) or take the studio default? | Yes to 2.0's model. On the port, a template of its own, named after the lead, so a sent quote keeps printing as the client saw it (D-166). | DEF-03 · DEF-12 · MM-01/02 · TE-07 · TQ-05 |
| Q-03 | Presets: keep the four ready-made designs; a studio's saved look is a template (Duplicate / Save as template); no separate "My preset"? | Yes. | DEF-05 · MM-03 · TT-01/02 |
| Q-04 | Per-entity templates: none; the quote's issuing entity decides the bank, QR, GST (and the letterhead, if Q-26)? | Yes — 1.0 never applied them. | DEF-07 · MM-04 · TL-11 |
| Q-05 | Keep 2.0's publish rights (Owners / Admins; Designers submit)? | Yes. | DEF-09 · MM-05 · TG-01 |
| Q-06 | Starter content: a template keeps starter **sections**; a 1.0 Quote Template's lines port to My Sections (one per category); Save as template stays without lines? | Yes. Alternative: let Save as template also save the quote's sections to My Sections in one go. | DEF-14 · MM-06/07 · TQ-04 · TC-03 |
| Q-07 | Generation rules (lines by project type): build? | Hold. In 1.0 only the project-type half works and the button is owner-only; starter sections + My Sections cover the need. | TC-04 · TG-03 |
| Q-08 | A default note per trade (Settings › Quotes › Trades), printed under that section unless the quote writes its own? | Yes — 1.0's per-category description. | DEF-15 · TI-07 · TC-06 |
| Q-09 | 1.0's Quote Sharing page saves six settings that no code reads. Port nothing from it, keep 2.0's client view, and leave link expiry to the Quotes audit? | Yes. | DEF-16 · TR-05 |
| Q-10 | Numbering: add 1.0's "A1, A2" (the section's letter printed before each item number) as an Item numbers option? The other 1.0 modes already have a 2.0 match (per section, per room, nested, none). | Yes. | MM-08 · TI-05 |
| Q-11 | Optional lines: keep 2.0's rule (always out of the totals, in the Optional works section) rather than 1.0's default of counting them, and add an *Optional price* column as a print choice (the price beside the line, still out of the totals)? | Yes to both. 1.0's default counts optional lines in the Grand Total while its signing page lets the client decline them, so the PDF and the accepted total can disagree (B-99). | MM-09 · TI-01 · TI-11 |
| Q-12 | A *Round off* line in Totals (the printed total rounded, the difference shown)? | No — 1.0 never wired it; 2.0 rounds each price (REG-584). | MM-10 · TB-02 |
| Q-13 | GST inclusive printing (prices include GST; the total says "inclusive of GST")? | Hold — the three reference quotes all print GST on top of the total; ask the studios first. | MM-11 · TB-03 |
| Q-14 | Add *Outfit*, and studio-uploaded fonts? | Hold. The legacy editor offers three fonts; canva bodies accept six and uploaded ones, but the editor never lists uploads. Decide once the port shows which fonts studios' templates actually name. | MM-13 · TT-03 |
| Q-15 | Accreditations: keep the studio's uploaded badges (no platform catalogue)? | Yes. | MM-14 · TB-15 |
| Q-16 | Payment schedule: fixed-amount milestones (e.g. a design fee) beside percentages, an ordinal (1st · 2nd) option and a footnote? | Hold fixed rows (the Finance audit; 1.0 has them flagged off). Ordinal and footnote yes. | MM-15 · TB-04 |
| Q-17 | When a template has no signature block, add one at the end on a sent quote so the client can sign? | No — Client signs online is the quote's switch; the design is the studio's. | MM-16 · TB-09 |
| Q-18 | Watermark opacity and angle, and a page background colour? | Opacity yes (a slider); angle and background no. | MM-18 · TP-02/03 |
| Q-19 | "Reset this block" in each block's More options? | Yes. | TE-05 |
| Q-20 | A *Social links* element: icons + handles from Company › Profile? | Yes, small. | TP-16 · TF-02 |
| Q-21 | Sub-total position: in the section band as well as the row after? | Yes, as a Sub-total choice. | TI-06 |
| Q-22 | Currency in its own column (S$ left, figures right)? | No — S$ · "$ " · figures only covers the three reference quotes. | TI-12 |
| Q-23 | Blocks between two sections of the Items table (a note, a picture)? | No — section notes cover it. | TI-19 |
| Q-24 | Bank details: SWIFT, the label words, extra rows? | Label words and SWIFT yes; extra rows no. | TB-06 |
| Q-25 | *Prepared by* reads: the team list · the studio only · the first member? | Yes (a setting under Settings › Quotes). | TT-07 |
| Q-26 | Per-entity letterhead: logo, address, UEN on an issuing entity (the letterhead follows the quote's entity)? | Yes — 1.0 carries logo, colour, tagline, footer text and UEN per entity (A-99). | TT-08 · Q-04 |
| Q-27 | My Sections: a property type and tags, and a filter in the Add Item popover? | Yes. | TC-01 |

## 7. Proposed build rounds (after your answers)

Nothing existing is removed. Each round ends with tsc + eslint, a Playwright probe at 1440 / 768 / 390, banked screenshots, register rows, `db:repair` + `db:baseline` when data changes.

| Round | Builds | Questions it needs | Size |
|---|---|---|---|
| **1 · The Items table** | Numbering "A1, A2" (Q-10), the optional price column (Q-11), sub-total in the band (Q-21), a default note per trade (Q-08) | Q-08 · Q-10 · Q-11 · Q-21 | M |
| **2 · Blocks and brand** | Bank labels + SWIFT (Q-24), payment ordinal + footnote (Q-16), Social links element (Q-20), watermark opacity (Q-18), Reset this block (Q-19), Prepared by mode (Q-25), per-entity letterhead (Q-26) | Q-16 · Q-18 · Q-19 · Q-20 · Q-24 · Q-25 · Q-26 | M |
| **3 · Content** | My Sections property type + tags + filter (Q-27); the Save as template option that also saves sections (Q-06 alternative, if chosen) | Q-06 · Q-27 | S–M |
| **4 · Data and demo** | The port map kept current (§4 + D), the devs' hand-off for templates (as the Leads map), any demo template states the answers add | Q-01 · Q-02 · Q-03 · Q-04 | S, runs alongside |

Suggested order 1 → 2 → 3 with 4 alongside. After templates: the quote editor, Quote X-Ray, Contracts, then the other template editors — the same audit shape.

## 8. Coverage, and what was not verified

**Rows:** 16 definitions · 18 mismatches · 131 matrix rows (TL 13 · TE 9 · TP 20 · TI 19 · TB 17 · TT 10 · TF 5 · TQ 7 · TR 10 · TC 9 · TG 3 · TX 9) · 27 questions. Inventories: A 110 rows · B 121 · C 69 · D 177 ids · E 116. Every inventory row is cited above, directly or inside a cited range, except these, which this section covers: the test index A-110; C's CSV rows and decision history C-68 · C-69; B's docs-versus-code rows B-103…112 and its uncertain rows B-113…121; E's seeds, per-browser keys and probes E-114…116.

**How the 1.0 side was read:** five readers read the code and docs whole, each ending with an "uncertain" list (kept in the inventories). Readers B and D stopped on a usage limit part-way; a second reader finished each from its last row (B from B-67, D from §5), after reading the first part whole. **The live app on :3001 was not browsed** for this module — the scripted sign-in was not permitted in this session — so no row here was confirmed on screen, and the inventories' "inferred" marks stand. Nothing was submitted anywhere.

**Where the readers disagree:** D-129 proposes an entity column on `quote_templates` that "brings back 1.0's resolution". A traced every quote render path and found none that filters by entity (A-91, A-93); D cites the migration's intent (`166_doc_templates_per_entity.sql`). The audit follows A — the code — and keeps D-129 available if Q-04 is answered the other way.

### 8.1 Found in 1.0 on the way (for the 1.0 developers)

From the code reading; not reproduced on a running 1.0.

1. **Cost and margin are public.** The no-sign-in preview endpoint behind `/quote-preview/<token>` returns every line's cost price, margin %, internal notes, comments, AI suggestion and vendor. The only live share button copies that link; the OTP-gated `/quote/<token>` page's share popover is mounted nowhere (B-88, B-89, B-93, B-98).
2. **The stored PDF is public.** The canonical PDF sits in a public bucket, so its URL alone opens it, while the signing route asks for an OTP before showing the same bytes (B-82, B-98).
3. **"Internal" notes print.** Line notes carry the tooltip *"Internal notes (not shown on PDF)"*, but the Centered Premium starter prints them on optional lines as reasons (B-98).
4. **Optional lines and the total disagree.** The default designs count optional lines in the Grand Total; the signing page lets the client decline them with its own total; the executed PDF follows neither choice (B-99).
5. **Quote Sharing does nothing.** All six settings are saved and read nowhere (B-94).
6. **Saving the knob editor may delete canva designs.** It hides canva rows and saves the full set, so they are soft-deleted (A-14, A-69 — inferred).
7. **Two defaults break the server's canva lookup.** A studio default plus an entity default gives two default rows; the lookup expects one, errors, and prints with no template (A-91 — inferred).
8. **Strict server printing.** A quote with no saved canva layout looks canva in the editor but prints the legacy design from every server path; the signing page falls back to the bare jsPDF list (B-80, B-81).
9. **Page numbers.** Branded prints none; `{page_number}` in a text prints "1" on every page; the three-column signing footer prints a literal "Page 1 of 1" (B-75, B-108, B-112).
10. **Broken blocks reach the client.** An unknown or failing block prints a "Block render failed" box in the PDF (B-67, B-97).
11. **One quote, two bank blocks.** Two legacy download branches pass no bank details while the others do (B-81, B-110).
12. **Roles.** The docs say the template editor is owner-only; the code admits every role and checks only a session (A-04, A-109).
13. **Dead tokens.** The legacy section editor's `{{companyName}}` and `{{refNumber}}` chips never resolve (A-64).

### 8.2 Open points carried from the readers

- **A:** points 6 and 7 above are inferred, not executed; whether any fork turns on fixed-amount milestones (`FEE_FIRST_MILESTONES_ENABLED` is `false` in code); the test index A-110 lists what each 1.0 test pins.
- **B:** the page-break block has no inserter in the live editor (B-113); what a bundle or variation signing prints on its fallback path (B-114); deployment state — bucket privacy, `CRON_SECRET` (B-115); whether page numbers print outside the Paged.js pass (B-116); whether the background, watermark and page colour repeat on every page (B-117); the letterhead measured at A4 width on Letter paper (B-118); self-heal renders dropping highlights and variation flags (B-119); no 1.0 tests were run (B-120); **how many leads carry a saved canva layout** — it decides which look each 1.0 client actually received, and so what the port must reproduce (B-121). The spec-versus-code notes are B-103…112.
- **C:** platform packages look unreadable under 1.0's row security, and the admin page cannot create them; the Save as template dialog's second caption was cut in the read; which `create_template_from_quote` body each environment runs. C-68 lists the requirement-sheet rows, C-69 the plans this slice follows.
- **D:** which zone a canva block allowed in both header and body belongs to (D-162); whether `canvaBlocks` is ever written per quote rather than per lead; pinning a legacy-printed quote to the default template will change how it prints (D-166); the size and margin conversions are unchecked against either renderer; seed counts per environment.
- **E:** nothing was run; no probe is checked into the repo (E-116); `introText` and `approvePerLine` are unused fields; `archived` is still a tolerated status. E-114 lists the seeds and repairs, E-115 the per-browser keys.

**Not covered here:** the quote editor's lines, pricing, package tiers, versions, approvals and share flow (the next audit, the quote editor); Finance's invoice, PO and VO templates; Projects' timeline and milestone templates; the studio forks (El Arte, Arthaus, Flo) beyond their seed files.

## 9. The owner's answers

Pending — answer §6 by number (go · hold · no, or the alternative). Nothing is built before the answers.

## 10. Build log

Nothing built yet.

## Appendix — the inventories

`quote-templates-1.0-inventory/` — **A** the document template editor (A-01…110) · **B** Canva mode and the renderers (B-01…121) · **C** content templates, rules and text (C-01…69) · **D** the data model and the port plan (D-01…177) · **E** 2.0 today (E-1…116). The folder's README says who read what.
