# Quote editor — 1.0 → 2.0 parity audit (2026-09-24)

**Written for:** the owner, to mark row by row; and the 1.0 developers, as the migration map for the quote editor.

**The brief** (owner, 2026-09-24, the parity programme's third module after Leads and quote templates): audit and benchmark everything the 1.0 quote editor does — the lines and their editing, money and the price book, a quote's life from draft to signed, versions, approval, sending, the client's side and the data — against 2.0's quote editor; features, functionality, logic and data; **no UI reference** (2.0 keeps its design system, layouts, transitions and components); nothing missed; every mismatch flagged; **ask before implementing**, through a decisions doc like the Leads one. Nothing in this document has been built.

## 0.1 Sources

- **1.0** = `qanvast-id-tool` at `67f42e469` on `integ/security-non-qanvast`. Five readers read the code and docs whole; their inventories are banked beside this file under `quote-editor-1.0-inventory/` and are the references cited in the rows: **A** the editor surface and its lines · **B** money and the price book · **C** a quote's life and the client's side · **D** the data model and the port plan · **E** what 2.0 has today. Rows the quote templates audit already covered are cited as *templates A-nn … E-nn*. The live app on :3001 was not browsed; every row rests on the code reading.
- **2.0** = `openmaison-prototype` on `main` (8733d6d) plus the quote templates rounds (REG-616…620, uncommitted at the time of reading).

## 0.2 Scope rules

- **In scope:** everything a studio does inside a quote and to a quote — its lines, sections, money, the price book it draws from, its statuses, approvals, versions, how it is sent and signed, its payment schedule, the notifications and tasks it raises, who may do what, and the data behind it.
- **Done already (cited, not re-audited):** how a quote prints and what a new quote starts with — the quote templates audit (`03-…`, REG-615…620).
- **Later modules (their own audits):** Quote X-Ray; Contracts and the signing library's documents; Projects (what a signed quote creates); Finance (invoices, purchase orders, variation orders, commissions). Their quote-side touchpoints are listed; their internals are not.
- **Not for a prototype:** real AI (the Quote Digitizer's reading, chat to quote, embeddings), real sends (WhatsApp, email, SMS OTP), stored PDFs, storage, crons, auth. Listed as *Platform* with the stand-in 2.0 keeps.
- **Vocabulary:** 2.0's words come from its mocks and the owner's simplicity rules; where 1.0's words differ the row says so and §1 decides.

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

Answer in the decisions doc — a call per question and per left-out feature — or write **go** · **hold** · **no** in the *Mark* column here. Rows marked go are built in the rounds of §7, each logged in `REGISTER.md` as `user-directed` with "1.0 · <inventory row>" as the source, verified on :3011 and banked under `design-source/verify/`.

Reading order: **§1 Definitions** first — 1.0 keeps most of a quote's settings on the **lead**, 2.0 on the **quote**, and nearly every later row leans on that.

## 1. Definitions — the same thing under two names

| # | Concept | 1.0 | 2.0 | Verdict · question |
|---|---|---|---|---|
| DEF-01 | **Where a quote's settings live** | On the **lead**, shared by every quote of it: section order and notes, the GST switch, the document discount, the issuing entity, IC · customer id · valid-until, the design, the chat history and the version history (A-121, D-79, D-82). | On each **quote**: its own discount lines, GST, issuing entity, validity, header fields, section rows and version history (E-3, E-18, E-75…77). | **Mismatch.** **Q-01** keep 2.0; the port copies the lead's values onto each quote (D-101). |
| DEF-02 | **The primary quote** | One quote per lead is *primary*; the lead mirrors its status (`leads.quote_status`) through database triggers, with a 2026-09-10 incident rule that the mirror is never the source (C-10, C-11, C-43, D-78). | No primary flag and no mirror: the lead reads its quotes; the Won step names the signed one (E-114). | **Mismatch.** **Q-03** keep 2.0. |
| DEF-03 | **Statuses** | draft · submitted · approved · rejected · sent_for_signature · client_signed (+ three unused: sent · accepted · expired) (C-01, D-140…148). | Draft · Sent for Approval · Approved · Sent to Client · Confirmed · Signed; the approval pair only while approval is required (E-103). | **Mismatch.** **Q-02** keep 2.0's six; *rejected* lands as Draft with the approver's note (Q-22). |
| DEF-04 | **Approval** | A workflow toggle, an approver list, per-member overrides; an approver's own submit approves at once; a QuoteApproval task; six gates that disagree on who is an approver; money thresholds saved but never read (C-03, C-17…31, B-55). | Owners, Admins and one backup approver; Send puts a designer's quote at Sent for Approval and notifies them; approval is a status pick; no note, no record of who (E-107, templates E-106 · E-111). | **Partial.** **Q-22** Approve / Request changes with a note · **Q-23** an approver's Send approves at once · **Q-24** thresholds. |
| DEF-05 | **A version** | An autosave snapshot of the **lead's** lines, cut when "Save as Draft" closes the editor; a drawer with compare, a diff dialog and a restore that cannot complete as the migrations define it (C-32…40, D-72). | A kept copy of the **quote** cut by Revise; Version History; the kept version previews read-only; a revision prints its changes (E-100…102). | **Mismatch.** Keep 2.0's Revise. **Q-25** bring an older version back · **Q-26** compare any two. |
| DEF-06 | **Sections** | Category names on the lines, with declared sub-sections, order and notes stored on the lead; a rename from the Sections panel renames across every quote of the lead (A-71…84). | Group rows with nesting, per quote (E-36, E-37). | **Built** — 2.0 per quote. |
| DEF-07 | **What a line prints instead of a price** | Price types amount · lump sum · KIV · By client · FOC · Inclusive, plus the studio's amount markers (A-52…54, B-02, B-03). | Print as: FOC · Inclusive · KIV · On behalf · Packaged · a custom word (E-46). | **Partial.** **Q-07** add *By client*. **Q-15** a section-level lump sum. |
| DEF-08 | **Optional lines** | Counted in the default designs; the signing page lets the client accept or decline them, and the choice is never stored (B-16, C-77). | Always out of the totals (templates Q-11, REG-617). | **Settled** by the templates audit. **Q-32** let the client pick on the confirmation link. |
| DEF-09 | **Discounts** | A line discount in % or S$ with a label that never prints; **one** document discount per **lead** (B-28…33). | A line discount in %; named discounts per quote, each in % or S$ (E-22, E-75). | **Partial.** **Q-11** a flat line discount. |
| DEF-10 | **GST** | A region rate, a per-quote switch, an issuing entity, per-line rates and exemptions that the editor overwrites, tax-inclusive lines (B-34…42). | GST per quote and per issuing entity; no per-line rate, no inclusive printing (E-76, E-77). | **Partial.** **Q-12** per-line rates · tax-inclusive stays held (templates Q-13). |
| DEF-11 | **The price book** | `studio_price_book`: item approval, price history, SKU `PB-NNN`, a vendor directory with default markups, market rates, volume tiers, CSV and AI import, CSV export, suggestions from new lines (B-57…94). | Company › Price book › My Items: kind, unit, cost, markup, price, category, vendor, import from a spreadsheet, soft delete (templates E-105). | **Partial.** **Q-18…Q-21**. |
| DEF-12 | **Signing** | A signature request on the quote itself: a token link valid 7 days, OTP, optional add-ons, one signer with no ID, a bundle behind a flag; signing marks the quote *client_signed* (C-64…93). | The confirmation link (Confirmed, no signature) and a **contract** raised from the quote for signature (NRIC, a second client, a bundle); the quote moves to Signed only by hand (E-109…113). | **Mismatch.** **Q-31** a signed contract signs its quote · **Q-33** the link's token, expiry and OTP. |
| DEF-13 | **Comments** | Threads on each line, with replies, counts and a Comments drawer (A-63). | The header's Comments answers coming soon (E-6). | **Missing.** **Q-30**. |
| DEF-14 | **Getting a quote in** | The Quote Digitizer (upload a PDF · photo · CSV · XLSX, AI reading into lines) and chat to quote (A-102…115). | "Upload a quote" and "Draft with Maison AI" answer coming soon (E-2, E-72). | **Missing.** **Q-16** upload stand-in · **Q-17** the drafter. |
| DEF-15 | **Variation orders** | A VO mode on the same editor: omission lines, credits against the signed contract (A-25, A-26, C-16). | — | **Later** (Projects · Finance). **Q-05**. |
| DEF-16 | **Read-only by status** | Submitted, approved, sent for signature and signed quotes open read-only with a banner; the server locks only some of them (A-23, C-06). | Every status edits; Revise keeps what was sent (E-17). | **Mismatch.** **Q-04**. |

## 2. Mismatches — both have it, they disagree

| # | Topic | 1.0 | 2.0 | Question |
|---|---|---|---|---|
| MM-01 | Where settings live | the lead | the quote | Q-01 |
| MM-02 | Primary quote and the lead mirror | a flag + triggers | derived | Q-03 |
| MM-03 | Status set | six live + three unused, *rejected* among them | six, no Rejected | Q-02 |
| MM-04 | Editing after sending | read-only from *submitted* on | editable at every status | Q-04 |
| MM-05 | An approver's own send | approves at once | goes to Sent for Approval like anyone's | Q-23 |
| MM-06 | Rejecting | a reason on the quote + a "Revise rejected quote" task | a status pick, no note | Q-22 |
| MM-07 | Versions | per lead, autosave, compare, restore | per quote, Revise, printed changes | Q-25 · Q-26 |
| MM-08 | Section lump sum | one lump-sum line prices the section, the other lines unpriced | Print as one line folds a priced section | Q-15 |
| MM-09 | Line discount | % or S$ | % | Q-11 |
| MM-10 | Tax per line | stored, overwritten | none | Q-12 |
| MM-11 | Signing | the quote is signed | the contract is signed; the quote marked by hand | Q-31 |
| MM-12 | The client's optional picks | shown, not stored | not offered | Q-32 |
| MM-13 | Deleting a quote | hard delete from the drawer, primary moves on | soft delete, no Deleted list, no role check | Q-27 · Q-28 |
| MM-14 | Validity | one date per lead, never enforced | a date per quote, never enforced | Q-29 |
| MM-15 | The client's link | a token, 7 days, OTP | the quote id, no expiry | Q-33 |

## 3. Feature matrix

Columns: the 1.0 feature (inventory row) · what 1.0 does · what 2.0 has (inventory row) · status · proposal or question · mark.

### 3.1 The frame

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QF-01 | Where the editor opens (A-01…03) | Six entry points, Tools › Quote Digitizer, deep links synced to the URL. | Routes per quote, one Create Quote modal for every new quote (E-1…4). | Built | | |
| QF-02 | One editor per quote (A-08, A-121) | A dialog remounted per quote; the lead's quotes share their settings. | A page per quote with its own settings (E-5). | Built | Q-01. | |
| QF-03 | Autosave (A-09, A-10, A-15) | Lines autosave; layout, ref and money toggles save apart; an emptied quote can never be saved (A-13). | One autosave with a saved stamp; an empty table saves (E-7). | Built | | |
| QF-04 | Close, discard, unsaved strip (A-11, A-12, A-14) | A close prompt, Discard / Keep, a trash for the quote and the uploaded document. | Close returns where you came from; nothing waits unsaved (E-16). | Built | | |
| QF-05 | Side panels (A-17) | Source document, summary, schedule, margin beside the grid. | Section cards, the totals card, the owner's margin, the client view pane (E-13, E-73, E-80, templates E-96). | Built | | |
| QF-06 | Header and its tools (A-5, A-18, A-27) | Name, number, status, save chip; tools in the header and the footer. | The header, the status pill, Send, the kebab (E-6, E-8). | Built | | |
| QF-07 | Items / Layout tabs (A-20, A-21) | The layout edited per quote. | The template edited from the quote (templates E-95). | Built | templates Q-02. | |
| QF-08 | Document info (A-22) | IC · Customer ID · Valid until · Project ref. | General Info (E-18) + a second client (E-19). | Built | | |
| QF-09 | Read-only by status (A-23, A-24, C-06, C-15) | Four statuses lock the editor with a banner. | No status locks (E-17). | Mismatch | Q-04. | |
| QF-10 | Variation orders (A-25, A-26) | A VO mode with omissions and credits. | — | Later | Q-05. | |

### 3.2 The grid and its lines

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QL-01 | One grid, two surfaces (A-28) | A panel grid and a focused grid with different powers. | One table, cards on a phone (E-21, E-137). | Built | | |
| QL-02 | Columns (A-29, A-30, A-31) | A set with defaults, shown / hidden per browser, "shown on client PDF" signs. | The catalogue, Column settings, an eye on client columns (E-23…27, E-63). | Built | | |
| QL-03 | The `#` column (A-32) | Seven numbering modes, a typed ref override, a blank ref. | Numbering from the template, Skip the number (E-38). | Partial | Typed refs: not proposed. | |
| QL-04 | Description (A-33, A-51) | Name + description, rich text, badges. | The same, the rich editor (E-45). | Built | | |
| QL-05 | Editable cells (A-34…41, A-43) | Unit price, discount, qty with drag-fill, unit, GST, unit cost, markup, total. | The same cells, "=" sums in number boxes (E-29, E-30). | Built | | |
| QL-06 | Notes, SKU, custom columns (A-42) | Internal notes; SKU always blank; custom columns dead. | SKU in the catalogue, not drawn (E-23). | Partial | Notes → comments (Q-30); SKU not proposed. | |
| QL-07 | Spec link (A-59) | A validated URL per line, never printed. | "Website Link" in the catalogue, not drawn (E-23). | Partial | **Q-09**. | |
| QL-08 | Vendor per line (A-60) | One vendor, restricted to the linked item's pool. | "Vendor/Sub" in the catalogue, not drawn (E-23); My Items carry a vendor (templates E-105). | Partial | **Q-08**. | |
| QL-09 | Row actions, sort, search (A-44…46) | A row strip; sort by head; search. | Row controls and menu; sort held by the owner; Find (E-34, E-35, E-53, E-61). | Built | Sort stays held (REG-483). | |
| QL-10 | Section chips, summary strip (A-47, A-48, B-13) | Collapse; a count with an unpriced-rows navigator. | Collapse; the sum row (E-36, E-54). | Partial | The navigator: not proposed. | |
| QL-11 | Keyboard, selection, copy / paste, fill, undo, drag (A-85…95) | Two grids with different keys; paste only in the focused grid. | The keyboard grid, paste, copy, drag-fill, ⌘D, set value, row drag (E-31…39, E-55…58). | Built | 2.0 fuller. | |
| QL-12 | What a line holds (A-50, B-01) | Name, description, qty, unit, prices, tax, flags. | A line's record (E-21, E-22). | Built | | |
| QL-13 | Price types (A-52) | amount · lump sum · KIV · By client · FOC · Inclusive. | Print as words (E-46). | Partial | **Q-07** By client. | |
| QL-14 | Section lump sum (A-53) | A lump-sum line prices the section; its other lines stay unpriced. | Print as one line (E-48). | Mismatch | **Q-15**. | |
| QL-15 | Amount markers (A-54, B-03) | The studio's words, 24 characters. | Print as, a custom word (E-46). | Built | | |
| QL-16 | Optional lines (A-55, B-16) | Counted by default. | Out of the totals (E-50). | Built | templates Q-11. | |
| QL-17 | Omission lines (A-56, B-17) | Credits in a VO. | — | Later | Q-05. | |
| QL-18 | Highlight and text colour (A-57) | Seven swatches or a hex; text marks in descriptions. | Highlight › ink or fill; formatted descriptions (E-49, E-45). | Built | | |
| QL-19 | Line image (A-58) | One image per line. | The line's picture (E-44). | Built | | |
| QL-20 | Price-book link (A-61) | The line knows its item. | `price_book_item_id` (E-68). | Built | | |
| QL-21 | Per-line tax (A-62, B-37) | Rates and exemptions, overwritten. | — | Mismatch | **Q-12**. | |
| QL-22 | Comments on a line (A-63) | Threads with replies, own-comment edits, a count. | — (header Comments: coming soon, E-6) | Missing | **Q-30**. | |
| QL-23 | Provenance badge (A-64) | AI · PB · Template · Manual pills. | — | Missing | Not proposed. | |
| QL-24 | Package tier, benchmark, confidence (A-65) | Stored, not surfaced. | — | Dead | | |
| QL-25 | The line panel (A-67, A-68) | A side panel to add or edit a line; saving drops the highlight. | Inline editing; the phone's line sheet (E-29, E-137). | Built | | |
| QL-26 | Duplicate, delete (A-69, A-70) | Per line and per section. | Duplicate, Remove, Ungroup (E-37, E-40). | Built | | |
| QL-27 | Waste factor (B-05) | `qty × (1 + waste %)` for money; the print shows `qty`. | — | Missing | **Q-10**. | |

### 3.3 Sections

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QS-01 | The section list (A-71, A-72) | Category names canonicalised; order on the lead. | Group rows in the quote's order (E-36). | Built | | |
| QS-02 | Add and rename (A-73, A-74, A-76) | A panel rename renames across the lead with no lock. | Per quote (E-36). | Built | 2.0 safer. | |
| QS-03 | Scope notes (A-77) | Section and sub-section notes on the lead. | Section notes; a trade's note (E-45, REG-617). | Built | | |
| QS-04 | Sub-sections (A-78…81) | Declared, ordered, with total labels. | Nesting, the sub-total word (E-37, E-47). | Built | | |
| QS-05 | The studio's names (A-82, B-89…92) | A category catalogue with sub-categories and descriptions. | Trades, trade notes, rooms (REG-561, REG-617). | Built | | |
| QS-06 | Blocks between sections (A-84) | Canva blocks in the gaps. | — | Settled | templates Q-23 (no). | |
| QS-07 | Drag a section (A-94) | In the focused grid. | Row drag into and out of sections (E-39). | Built | | |

### 3.4 Money

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QM-01 | Line total (B-04) | `round2` once, at the end. | `lineTotalMinor` in cents (E-22). | Built | Units: dollars → cents (D). | |
| QM-02 | The pricing triangle (B-07, B-08, B-97) | Cost is the anchor, markup the dial; several writers put the wrong number in markup. | Cost + markup = price; the markup absorbs a typed price (E-22). | Built | | |
| QM-03 | Paste and fill reprice (B-09) | A notice after a reprice. | Paste, drag-fill, set value (E-55, E-57, E-58). | Built | | |
| QM-04 | Quote totals (B-15, B-18) | Lines → discount → GST. | The quote's formula, section sub-totals (E-36, E-74). | Built | | |
| QM-05 | Stored totals (B-19…21, B-33) | `*_cents` columns re-rolled on saves; `discount_amount` never maintained. | Derived from the lines (E-82). | Built | 2.0 has no stale total to drift. | |
| QM-06 | Line discount (B-28…30) | % or S$, a label that never prints. | % (E-22). | Partial | **Q-11**. | |
| QM-07 | Document discount (B-31, B-32) | One per lead. | Named discounts per quote (E-75). | Built | 2.0 fuller. | |
| QM-08 | GST (B-34…36, B-41) | Region rate, a per-quote switch, the entity. | GST per quote and entity (E-76, E-77). | Built | | |
| QM-09 | Tax-inclusive lines (B-38) | The price holds the tax. | — | Held | templates Q-13. | |
| QM-10 | Entity tax override (B-40) | Stored, never used. | — | Dead | | |
| QM-11 | Currency (B-42) | Region symbol, a studio override. | S$ (E-74). | Built | SG only. | |
| QM-12 | Rounding (B-43…47) | Round selling prices, a round-off knob. | Round Prices, round as entered (E-78, E-79). | Built | | |
| QM-13 | Below-cost warning (B-48) | A line selling under its cost is flagged. | — | Missing | **Q-13**. | |
| QM-14 | Margin roll-up (B-49) | Quote margin. | The owner's margin (E-80). | Built | | |
| QM-15 | Category margins (B-50, B-51) | Revenue, cost, margin, markup per category. | By category shares (E-81). | Partial | **Q-14**. | |
| QM-16 | Internal figures (B-52, B-53) | Cost columns never print; a public preview endpoint leaks cost (§8.1). | Cost and markup never print (templates E-83). | Built | | |
| QM-17 | AI money helpers (B-54) | Margin warnings, "set global margin". | — | Platform | | |
| QM-18 | Approval thresholds (B-55) | Saved, never read. | — | Dead | **Q-24**. | |
| QM-19 | Rebates (B-56) | — | Rebate, Owners only (E-64). | 2.0 only | | |

### 3.5 The price book

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QP-01 | Where it lives, who edits (B-57) | Accounts › Price Book; trust from the owner / admin tag. | Company › Price book (templates E-105). | Built | | |
| QP-02 | The item (B-58, B-60) | Name, description, unit, cost, markup, price, category, subcategory, vendors, SKU, images, spec. | Kind, name, description, unit, cost, markup, price, category, vendor (templates E-105). | Partial | SKU, spec: not proposed. | |
| QP-03 | Lists, filters, reorder (B-59, B-64) | Grouped, filtered, sorted, drag reorder. | Gallery and list, search, Deleted Items (templates E-98). | Built | Reorder: not proposed. | |
| QP-04 | Item approval (B-61, B-62) | A member without the owner tag creates pending items. | — | Missing | **Q-20**. | |
| QP-05 | Archive, restore, delete (B-63) | Soft, with permanent delete. | Soft delete, Deleted Items (templates E-105). | Built | | |
| QP-06 | Price history (B-65) | Every price edit kept. | — | Missing | **Q-21**. | |
| QP-07 | SKU `PB-NNN` (B-66) | An id per item. | — | Missing | Not proposed. | |
| QP-08 | Vendors (B-67, B-68) | A directory with default markups, bulk-applied. | A vendor name per item (templates E-105). | Partial | The directory: Finance. | |
| QP-09 | Market rates, crowd signals, seed (B-69…71) | Background rate data. | — | Platform | | |
| QP-10 | Import (B-72…74) | CSV and AI parse; a second importer stores cents as dollars (§8.1). | Import from a spreadsheet (templates E-105). | Built | AI parse: Platform. | |
| QP-11 | Export (B-75) | CSV. | — | Missing | **Q-18**. | |
| QP-12 | Pickers in the quote (B-76…78) | Typeahead, browse with multi-select, a modal. | The Add Item popover, My Items, My Sections (E-66, E-68, E-70). | Built | Multi-select: not proposed. | |
| QP-13 | Save a line to the book (B-79, B-84) | "Also save to price book"; suggestions for new lines. | Save to Your Library (E-69). | Built | | |
| QP-14 | Matching, AI search (B-81…86) | Auto-match on save, embeddings. | — | Platform | | |
| QP-15 | Price snapshots (B-87) | Written, never read. | — | Dead | | |
| QP-16 | Volume tiers (B-93, B-94, A-119) | A price per quantity band. | — | Missing | **Q-19**. | |

### 3.6 Getting lines in

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QG-01 | Add by hand (A-96) | The line panel. | The Add Item row (E-66). | Built | | |
| QG-02 | Packages (A-99, A-123) | A section's bundle of lines. | My Sections (E-70). | Built | templates TC-01. | |
| QG-03 | Starter quote (A-100) | Lines by project type, owners only. | — | Held | templates Q-07. | |
| QG-04 | Templates as a source (A-101) | A starter quote with lines. | Templates start sections; My Sections carry lines (templates E-65). | Settled | templates Q-06. | |
| QG-05 | The digitizer (A-102…108) | Upload PDF · photo · CSV · XLSX, AI reads the lines, a totals check, restore. | "Upload a quote": coming soon (E-72). | Missing | **Q-16**. | |
| QG-06 | AI insights on lines (A-109) | Hints per line. | — | Platform | | |
| QG-07 | Chat to quote (A-111…115) | An agent drafts lines from a brief. | "Draft with Maison AI": coming soon (E-72). | Missing | **Q-17**. | |
| QG-08 | AI tiers, the import route, comparison (A-116, A-117, A-122) | Built, unreachable. | — | Dead | | |
| QG-09 | Lines from a meeting (A-120) | The co-pilot's brief. | — | Later | Tools. | |

### 3.7 Many quotes per lead

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QN-01 | Create (C-41, C-42) | A container minted on first open. | The Create Quote modal (E-2, E-3). | Built | | |
| QN-02 | Primary quote (C-43, C-47) | One primary; deleting it promotes another. | — | Mismatch | Q-03. | |
| QN-03 | The quote list (C-44, C-54) | The drawer's list, studio and project lists. | The lead's Quotes tab, Tools › Quotes (E-115…122). | Built | | |
| QN-04 | Rename (C-45) | Label. | Rename Quote (E-9). | Built | | |
| QN-05 | Clone (C-46) | "Option X", lines and totals copied. | Duplicate and Edit (E-10). | Built | Fix what a copy carries (§8.2). | |
| QN-06 | Delete (C-47…49) | Hard delete; discard paths. | Soft delete and archive, no Deleted list, no role check (E-11, E-121). | Partial | **Q-27**, **Q-28**. | |
| QN-07 | Numbers (C-50) | `QT-###` / `VO-###`, max + 1. | The studio's pattern and sequences (templates E-107). | Built | 2.0 fuller. | |
| QN-08 | Validity (C-51) | One date per lead, never enforced. | Valid until per quote (E-18). | Partial | **Q-29**. | |
| QN-09 | Which quote is the contract (C-52) | The signed quote. | A contract raised from a quote (E-111). | Built | | |
| QN-10 | Readiness, insights (C-55, C-56) | A conversion card; AI insights. | Readiness before sending (templates E-82). | Built | Insights: Platform. | |

### 3.8 Statuses and approval

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QA-01 | Status vocabulary (C-01) | Six live, three unused. | Six (E-103). | Mismatch | Q-02. | |
| QA-02 | Where statuses change (C-02, C-04) | A transition route, but most changes go through a plain PATCH. | Server actions and the status menus (E-104, E-105). | Built | | |
| QA-03 | Self-approval (C-03) | An approver's submit is the approval. | Every send goes to Sent for Approval (E-106). | Mismatch | **Q-23**. | |
| QA-04 | Status history (C-05) | A write-only log. | Stamps + derived Activity (E-98, E-105). | Partial | Approval decisions logged with Q-22. | |
| QA-05 | Signing side effects (C-07, C-84) | Marks the quote and the lead signed. | Signed by hand (E-112). | Mismatch | **Q-31**. | |
| QA-06 | Revise (C-08) | Reopens an approved quote as a draft. | Revise → v n + 1 (E-100). | Built | | |
| QA-07 | The lead mirror (C-10, C-11) | Triggers keep `leads.quote_status`. | Derived (E-114). | Mismatch | Q-03. | |
| QA-08 | Approvers and overrides (C-17, C-18) | A list, overrides, gates that disagree. | One rule: Owners, Admins, the backup approver (E-107, E-133). | Built | 2.0 consistent. | |
| QA-09 | The approval task (C-19, C-20, C-23, C-24) | A QuoteApproval task; owners see it on Tasks. | A notification in the bell (E-126). | Built | | |
| QA-10 | Approve / reject in the editor (C-21, C-22, C-25) | Approve; Reject with a reason; a revision task for the lead's owner. | A status pick; no note; nothing records who (E-107). | Partial | **Q-22**. | |
| QA-11 | Finance approvals (C-28) | Approve from Finance, Accounting included. | — | Later | Finance. | |
| QA-12 | Approval rules (C-29, C-31) | Saved thresholds and permission checks never read. | — | Dead | Q-24. | |

### 3.9 Versions

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QV-01 | What a version holds (C-32, C-33) | The lead's lines, cut by Save as Draft. | The quote's fields, lines and payments, cut by Revise (E-100). | Mismatch | Keep 2.0 (Q-25 below). | |
| QV-02 | The drawer (C-34, C-35) | Versions listed, throttled. | Version History (E-101). | Built | | |
| QV-03 | Compare and diff (C-36…38) | Any two versions side by side. | A revision prints its changes against the one before (E-102). | Partial | **Q-26**. | |
| QV-04 | Restore (C-39, C-40) | An RPC that cannot complete; a second restore that does something else. | — | Missing | **Q-25**. | |

### 3.10 Sending

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QD-01 | The Share menu (C-57) | Copy preview link, portal, re-sync. | Preview's Copy link; Send ▾ (E-106, E-109). | Built | | |
| QD-02 | Homeowner portal (C-58) | Shares the PDF to the portal. | — | Later | The portal. | |
| QD-03 | Links, OTP (C-59, templates B-88…96) | A token; an OTP-gated live PDF; a no-OTP preview that leaks cost (§8.1). | The confirmation link by quote id (E-109, E-110). | Partial | **Q-33**. | |
| QD-04 | Quote Sharing settings (C-60) | Saved, never read. | — | Settled | templates Q-09. | |
| QD-05 | Downloads (C-61, C-62) | By status. | Download PDF, Print (templates E-78). | Built | | |
| QD-06 | Sharing locked until approved (C-63) | A flag. | Send follows approval (E-106). | Built | | |

### 3.11 Signing and the client

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QC-01 | The signature request (C-64…70) | Freezes the quote, the schedule and the documents. | A contract raised from the quote; the signing bundle (E-111, E-113). | Built | The Contracts audit. | |
| QC-02 | Several quotes in one signing (C-71) | Behind a flag. | Several contracts in a bundle (E-113). | Later | Contracts. | |
| QC-03 | The link's lifetime (C-73) | 7 days, fixed. | No expiry (E-110). | Partial | Q-33. | |
| QC-04 | The signing page, OTP, review (C-74…76) | Steps; OTP before the quote shows. | The confirmation page; the contract's signing page (E-110, E-111). | Partial | OTP: Platform. | |
| QC-05 | Optional add-ons (C-77) | Accept / decline shown, never stored. | — | Missing | **Q-32**. | |
| QC-06 | CaseTrust step (C-79) | — | — | Dead | | |
| QC-07 | Who signs (C-80, C-81) | One signer, no ID. | The contract: NRIC, a second client (REG-563, REG-588). | Built | 2.0 fuller. | |
| QC-08 | What signing triggers (C-84) | The quote, the lead, the stage. | The lead's Won step lists signed quotes (E-114). | Partial | Q-31. | |
| QC-09 | Done page, certificate, audit trail (C-85, C-86, C-93) | Downloads, a certificate, a trail. | "Download a copy" on the confirmation page (E-110). | Partial | Certificate and trail: Contracts / Platform. | |
| QC-10 | Resend, regenerate, cancel (C-87…90) | On the request. | On the contract (E-111). | Built | Contracts. | |
| QC-11 | Paper paths, portal signing (C-91, C-92) | Upload a signed copy; sign inside the portal. | Mark as signed (contracts). | Built | Portal: Later. | |

### 3.12 The payment schedule

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QY-01 | Milestones and defaults (C-94, C-95, C-101) | `{ name, percent, trigger }`, four defaults. | `quote_payments`, presets, the template's split (E-83, E-84). | Built | | |
| QY-02 | Editing (C-96) | In the sidebar. | The Payment Schedule section (E-86, E-87). | Built | | |
| QY-03 | Validation (C-97) | Must total 100 % before submit and approve. | Preview's readiness blocks Send; the header's Send does not (E-106, E-108). | Partial | Fixed as a gap (§8.2). | |
| QY-04 | Amounts (C-98) | Percent of the grand total; fixed rows first. | E-83. | Built | | |
| QY-05 | Lock (C-99) | A permission never read; Gantt can rewrite an approved schedule. | The payment lock, in the UI only (E-88). | Partial | Fixed on the server (§8.2). | |
| QY-06 | Frozen at signing (C-100) | Copied onto the request. | Kept with the version (E-100). | Built | | |
| QY-07 | Fixed-amount rows (C-102) | Behind flags. | — | Held | templates Q-16 (Finance). | |
| QY-08 | The project side (C-103) | The Gantt. | — | Later | Projects. | |

### 3.13 Follow-ups and notifications

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QT-01 | Follow-ups (C-104) | None for quotes. | A due date raises a follow-up task (E-125, E-127). | 2.0 only | | |
| QT-02 | Sent and signed notifications (C-105, C-106) | `quote.signature_requested`, `quote.signed_by_client`. | `quote_approval`, `quote_confirmed`, signed (E-126). | Built | | |
| QT-03 | Approval notifications (C-107) | Task notifications. | `quote_approval` to approvers (E-107). | Partial | Q-22 adds *approved* and *changes requested* to the preparer. | |
| QT-04 | Portal bells, usage events (C-109, C-110) | — | — | Later / Platform | | |

### 3.14 Roles

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QR-01 | Permission slugs (C-111, C-114) | Many slugs; member toggles read by nothing. | Roles; the approver rule; Rebate Owners-only (E-133, E-134). | Built | | |
| QR-02 | Server checks (C-112, C-116) | Session checks; approvals unchecked on the task routes. | Only Approved is checked (E-135). | Partial | Q-28 + §8.2. | |
| QR-03 | Accounting (C-115) | Approves from Finance. | — | Later | Leads Q-39. | |

### 3.15 Touchpoints (other audits)

| ID | Touchpoint | Where it goes |
|---|---|---|
| QX-01 | Quote X-Ray on a quote (E-132) | X-Ray (next after Contracts) |
| QX-02 | Contracts raised from a quote, the signing bundle, the signing library (C-72, E-111, E-113) | Contracts (next) |
| QX-03 | What a signed quote creates: a project, its Gantt, its schedule (C-84, C-103) | Projects |
| QX-04 | Invoices, purchase orders, variation orders, commissions (B-27, C-28) | Finance |
| QX-05 | The co-pilot's meeting brief (A-120) | Tools |

## 4. Data model — the port plan

The column-level work is inventory **D** (`quote-editor-1.0-inventory/D-data-model.md`): the table map D-70…D-99, the column diffs, the status mapping D-140…D-155, the enums, the port plan (§5). The headline:

| 1.0 | 2.0 | Verdict |
|---|---|---|
| `quotes` + the lead's per-quote settings in `leads.quote_metadata` | `quotes` | The lead's discount, GST, entity, validity, IC, customer id and section notes are copied onto **each** quote (D-101). The lead's mirror columns go (D-78). |
| `quote_line_items` | `quote_items` | Sections become group rows (D-104); dollars → cents; the selling price splits into cost + markup (D-71). |
| `quote_versions` (per lead) | `quote_versions` (per quote) | Each 1.0 version is attributed to the lead's primary quote (D-106). |
| `quotes.payment_schedule` (JSON) | `quote_payments` rows | Percent rows; due dates are 2.0's (D-73). |
| `quote_status_history` | stamps + derived Activity (+ the approval stamps of Q-22) | The log is not ported as a table; its last approve / reject lands on the new stamps (D-74, D-180). |
| statuses | D-140…D-148 | *rejected* → Draft with the note; *sent_for_signature* → Sent to Client; *client_signed* → Signed. |
| `studio_price_book` · `vendors` · tiers · history | `price_book_items` (vendor as text) | Tiers, history and suggestions not ported (Q-19…Q-21). |
| numbering | `settings.quote_numbering` | Written by the port so the `QT-` series continues (D-110). |
| totals | derived | 1.0's optional-counting and ON BEHALF totals differ from 2.0's; the port logs each difference (D-164, D-242). |

## 5. Logic to carry over verbatim (for the devs, independent of UI)

1. **Line money** — B-04 (one rounding at the end), waste excluded (Q-10); markers and Print-as words leave every sum while their cost still meets the margin (A-54, E-46).
2. **Quote totals** — B-15: lines → line discounts → the discounts → GST on what remains (2.0: `lib/quotes/math.ts`).
3. **Self-approval** — C-03: an approver's own send is the approval (Q-23).
4. **Milestone validation** — C-97: percent rows sum to 100 (± 0.01); fixed rows never exceed the total (held).
5. **The version diff** — C-38 (2.0's `lib/quotes/diff.ts` compares by line id: added · removed · changed on name, qty, unit price, discount).
6. **Section names** — A-71: canonicalised case-insensitively, the studio's spelling wins.
7. **Status mapping** — D-140…D-148.

## 6. Questions before anything is built

The owner delegated every call on 2026-09-24 (§9). Each still carries its recommendation, so it can be overridden in the decisions doc.

| # | Question | Recommendation | Rows |
|---|---|---|---|
| Q-01 | Keep a quote's settings on the quote (2.0), copying 1.0's per-lead values onto each quote on the port? | Yes. | DEF-01 · QF-02 |
| Q-02 | Keep 2.0's six statuses; a 1.0 *rejected* quote lands as Draft with its note? | Yes. | DEF-03 · QA-01 |
| Q-03 | No primary quote and no lead mirror — the lead reads its quotes? | Yes. | DEF-02 · QN-02 · QA-07 |
| Q-04 | Lock a quote once it leaves Draft, as 1.0 did? | No — keep 2.0's always-editable editor; a sent, confirmed or signed quote shows a banner that says what the client has and offers Revise. | DEF-16 · QF-09 |
| Q-05 | Variation orders? | Hold for Projects and Finance. | DEF-15 · QF-10 |
| Q-06 | Good / Better / Best packages (write-only in 1.0)? | No. | QG-08 |
| Q-07 | *By client* as a Print as word? | Yes. | DEF-07 · QL-13 |
| Q-08 | Draw the catalogue's *Vendor/Sub* column — the line's vendor, from My Items, editable? | Yes. | QL-08 |
| Q-09 | Draw the catalogue's *Website Link* column — a product or spec link per line, never printed? | Yes. | QL-07 |
| Q-10 | A waste % per line? | No — Rate × Qty stops matching the amount; put the waste in the quantity. | QL-27 |
| Q-11 | A flat (S$) line discount beside the %? | No — named discounts carry amounts. | QM-06 |
| Q-12 | Tax rates per line? | No — 1.0 overwrote them; GST stays per quote and entity. | QL-21 |
| Q-13 | Mark a line that sells below its cost? | Yes, for whoever sees the cost. | QM-13 |
| Q-14 | Margin per category in By category, for Owners? | Yes. | QM-15 |
| Q-15 | A section priced as one lump sum with its lines unpriced? | No — one priced line in the section does it; Print as one line folds a section. | QL-14 |
| Q-16 | *Upload a quote*: a picked PDF or photo becomes lines, matched from the reference quotes as the X-Ray and the template upload do? | Yes — a stand-in; the reading itself is the platform's. | DEF-14 · QG-05 |
| Q-17 | *Draft with Maison AI* (chat to quote)? | Hold (coming soon stays). | QG-07 |
| Q-18 | Export My Items? | Yes. | QP-11 |
| Q-19 | Volume price tiers on My Items? | Hold. | QP-16 |
| Q-20 | Price-book item approval? | Hold. | QP-04 |
| Q-21 | Price history per item? | Hold. | QP-06 |
| Q-22 | Approve · Request changes with a note, as templates do: the note goes back to the preparer at the top of the quote, both are notified and logged? | Yes. | DEF-04 · QA-10 |
| Q-23 | An approver's own Send approves at once? | Yes — as 1.0 and as template approval ("publishing is the approval"). | QA-03 |
| Q-24 | Approval thresholds (auto-approve under a total, a margin floor)? | No — 1.0 saved them and never enforced them. | QM-18 · QA-12 |
| Q-25 | Bring an older version back into a Draft quote from Version History? | Yes. | QV-04 |
| Q-26 | Compare any two versions? | No — a revision prints its changes. | QV-03 |
| Q-27 | Deleted Quotes: Restore and Delete forever from the lead's Quotes tab and Tools › Quotes? | Yes — it fills the kebab's coming-soon row. | QN-06 |
| Q-28 | Who deletes a quote: Owners, Admins and the member who created it? | Yes. | QN-06 · QR-02 |
| Q-29 | Mark a sent quote whose Valid until has passed (no block)? | Yes. | QN-08 |
| Q-30 | Comments on a line, with the header's Comments opening them? | Yes. | DEF-13 · QL-22 |
| Q-31 | A quote becomes Signed when the contract raised from it is signed? | Yes. | DEF-12 · QA-05 |
| Q-32 | On the confirmation link the client ticks the optional works they want; the studio sees each answer? | Yes. | DEF-08 · QC-05 |
| Q-33 | A token, an expiry and an OTP on the client's link? | No — the platform's; the link keeps the quote id. | QD-03 · QC-03 |

## 7. Build rounds

Nothing existing is removed. Each round ends with tsc + eslint, a Playwright probe at 1440 (+ 390 / 768 touch where the round touches them, and the 320 overflow gate), banked screenshots, register rows, `db:repair` + `db:baseline` when data changes.

| Round | Builds | Questions | Size |
|---|---|---|---|
| **1 · Lines and money** | *By client*, the Vendor/Sub and Website Link columns, the below-cost mark, margin by category; undo keeps Print-as-one-line and Rebate | Q-07 · Q-08 · Q-09 · Q-13 · Q-14 | M |
| **2 · Approval and the banner** | Approve · Request changes with a note and notifications; an approver's Send approves; the sent / confirmed / signed banner with Revise; the tables' status menu follows the approver rule; Settings › Quotes for Owners and Admins; Revise clears the confirmation; the Activity's sent line | Q-04 · Q-22 · Q-23 | M |
| **3 · Versions and the list** | Bring a version back; Deleted Quotes; who deletes; past validity; Duplicate starts clean; Who sees leads on the quote URL and Tools › Quotes; the Quotes tab's Copy link; Shared once sent | Q-25 · Q-27 · Q-28 · Q-29 | M |
| **4 · The client's side** | A signed contract signs its quote; the client's optional picks; the confirmation link only once sent; the files the studio shares; the payment lock on the server; readiness on the header's Send | Q-31 · Q-32 | M |
| **5 · Comments and getting lines in** | Comments on lines; Upload a quote; Export My Items | Q-16 · Q-18 · Q-30 | L |
| **6 · Data** | The devs' map for the quote editor | Q-01 · Q-02 · Q-03 | S |

## 8. Coverage, and what was not verified

**Rows:** 16 definitions · 15 mismatches · 181 matrix rows · 33 questions. Inventories: A 131 rows · B 104 · C 126 · D 255 ids · E 146. The live app on :3001 was not browsed; every 1.0 row rests on the code, and each reader's "Uncertain" list stands.

### 8.1 Found in 1.0 on the way (for the 1.0 developers)

From the code reading; not reproduced on a running 1.0.

1. **Most status changes skip the state machine** and write no history; the history is read by nothing (C-04, C-05).
2. **Approval checks disagree** across six gates; the task approve / reject routes check no approver on the server; Finance lets Accounting approve (C-18, C-24, C-28).
3. **Saved, never read:** the Quote Approval Rules thresholds, the member permission toggles, the payment-schedule override, Quote Sharing's six settings, `price_snapshot_at` (B-55, C-29, C-114, C-60, B-87).
4. **The server does not lock a submitted quote** — only the screen does (A-23).
5. **An emptied quote can never be saved**; the autosave error points at a "Save Draft" button that does not exist (A-13, A-129).
6. **A section rename in the Sections panel renames every quote of the lead**, with no lock (A-76).
7. **The markup field is written wrongly** by round-off, seeding, vendor bulk markup and the AI; a markup of 1,000 % or more fails the save (B-97, B-47).
8. **GST:** per-line rates are overwritten; the editor and the server disagree on the switch versus the entity; the entity's own rate is never read (B-37, B-39, B-40).
9. **One document discount per lead**, and the signing page sums it differently (B-31, B-25).
10. **The Quote Categories importer stores cents in a dollars column** — 12.50 becomes 1,250 (B-74).
11. **Versions are per lead, and the restore cannot complete** as the migrations define it (C-32, C-39).
12. **The client's optional picks are never stored**, and the executed PDF ignores them (C-77, templates B-99).
13. **Signing:** the fallback reads a `config` column no migration creates; a normal signing sends no stage-change notification; the certificate's integrity line reads wrong for multi-document signings; the email's "Review & sign" button opens the studio's lead page; the client's signed email is never sent (C-84, C-86, C-101, C-105, C-106).
14. **Price book:** tiers typed while adding an item are dropped; approval trust comes from a tag, not the permission; several routes check no permission (B-57, B-93).
15. **The SKU column is always blank** (A-42).

### 8.2 Found in 2.0 on the way (fixed in the rounds)

1. Undo writes lines back without *Print as one line* and *Rebate* (E-32) — round 1.
2. The tables' status menu offers Approved to non-approvers (the server refuses it) (E-104) — round 2.
3. Settings › Quotes carries no role check (E-135) — round 2 (Owners and Admins, as Settings › Leads).
4. Revise keeps the client's confirmation; Duplicate copies the version, the confirmation and an old template pin (E-10, E-100) — rounds 2 and 3.
5. The Activity's "sent" line reads the quote's current status (E-98) — round 2.
6. The quote editor's URL and Tools › Quotes ignore Who sees leads (E-135) — round 3.
7. The Quotes tab's Copy link adds `?open=` that nothing reads; every quote reads "Private" (E-117, E-124) — round 3.
8. A signed contract leaves its quote unsigned (E-111, E-112) — round 4 (Q-31).
9. A Draft's confirmation link can be confirmed (E-110) — round 4.
10. Files' "Show in client view" is stored and read by nothing (E-91) — round 4.
11. The payment lock holds only in the UI (E-88) — round 4.
12. The header's Send skips the readiness check Preview's Send runs (E-106) — round 4.
13. No quote-editor probe is checked into the repo (E-146) — every round banks its probe under `design-source/verify/`.

## 9. The owner's answers

**The owner's instruction, 2026-09-24 (night):** "you take a call, I will go with your recommendations but make sure everything is intact with 2.0 experience … do it step by step and everything audit carefully and build in 2.0 experience only." Every one of the 33 calls is **As recommended**, set on that instruction; the decisions doc shows each with its dropdown so the owner can override any of them.

## 10. Build log

Rounds follow §7. The decisions doc's section H carries each round's status.

- **2026-09-24** — audit written (REG-621); the 33 calls set *As recommended* on the owner's instruction (REG-622); round 1 started.
- **Round 1 · Lines and money — built and verified (REG-623).** Q-07 *By client* · Q-08 Vendor/Sub · Q-09 Website Link · Q-13 *Below cost* · Q-14 margin per category (Owners) · §8.2 gap 1 (undo). Migration `0038_quote_item_vendor_link`; repair R46. Found and fixed on the way: the Print-as Total cell clipped its figure; the phone's line sheet had no gutter. Probe `verify-qe-r1.cjs` 32/32, logic 8/8.
- **Round 2 · Approval and the banner — built and verified (REG-624).** Q-22 the approval bar (Approve · Request changes with a note, two events) · Q-23 an approver's Send approves · Q-04 the sent banner with Revise · §8.2 gaps 2–5 (tables' Approved, Settings gate on page and server, Revise and Duplicate start clean, Activity by stamp). Migration `0039_quote_approval_record`; repair R47. Probe `verify-qe-r2.cjs` 32/32. Duplicate's clean start (planned for round 3) landed here with the new stamps.
- **Round 3 · Versions and the lists — built and verified (REG-625).** Q-25 Bring back · Q-27 Deleted Quotes · Q-28 who deletes · Q-29 Expired · §8.2 gaps 6–7 (Who sees leads on the quote pages and Tools › Quotes; Shared; Copy Link) · the lists' coming-soon rows live. Repair R48. Found on the way: confirms under the Deleted sheets (fixed); the one-quote row menu under the tab strip (sweep backlog U-01). Probe `verify-qe-r3.cjs` 21/21.
- **Round 4 · The client's side — built and verified (REG-626).** Q-31 a signed contract signs its quote · Q-32 the client's optional picks · §8.2 gaps 9–12 (the link only once sent; files to the client; the payment lock on the server; readiness on the header's Send). Migration `0040_quote_signed_client_choice`; repair R49. Probe `verify-qe-r4.cjs` 14/14 (the server's payment lock is not exercised by it).
- **Round 5 · Comments and getting lines in — built and verified (REG-627).** Q-30 comments on lines · Q-16 Upload a quote (spreadsheets for real; the reference PDFs as the X-Ray reads them) · Q-18 Export My Items. Migration `0041_quote_item_comments` (added to the baseline's table lists). Probe `verify-qe-r5.cjs` 21/21.
- **Round 6 · Data — written (REG-628).** `06-quote-editor-migration-map-2026-09-24.md`. The quote editor's parity is complete; the UI sweep's backlog carries U-01, U-03, U-04 found on the way.

## Appendix — the inventories

`quote-editor-1.0-inventory/` — **A** the editor and its lines (A-01…131) · **B** money and the price book (B-01…104) · **C** a quote's life and the client's side (C-01…126) · **D** the data model and the port plan (D-01…255) · **E** 2.0 today (E-1…146). The folder's README says who read what.
