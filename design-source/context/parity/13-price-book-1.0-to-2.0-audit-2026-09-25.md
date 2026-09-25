# The price book — 1.0 → 2.0 parity audit (2026-09-25)

**Written for:** the owner, to mark row by row; and the 1.0 developers, as the migration map for a studio's price book.

**The brief** (owner, 2026-09-24, night — the parity programme's seventh module, after Leads, quote templates, the quote editor, contracts, Quote X-Ray and Accounts Setup): "deep audit benchmark of pricebook in 1.0 which is the pricebook in 2.0 as well and build this as well … You take a call and go with your recommendations." Every new call in §6 is therefore set *As recommended* (§9) and built in the rounds of §7. **Calls already made** stand and are listed in §6.2 — among them the three the quote editor audit held for this one: price tiers, item approval and price history, now answered here.

## 0.1 Sources

- **1.0** = `qanvast-id-tool` at `67f42e469`. Five readers read the code, the migrations and the docs whole; their inventories are banked beside this file under `price-book-1.0-inventory/`: **A** the screens and flows (A-01…A-61) · **B** the rules and the engine (B-01…B-80) · **C** everything around it — routes and their checks, roles, notifications, platform data, AI, docs (C-01…C-75) · **D** the data model and the port plan · **E** 2.0 today (E-1…E-83).
- **2.0** = `openmaison-prototype` on `main` plus the uncommitted rounds REG-616…648.

## 0.2 Scope rules

- **In scope:** the studio's own book — its items, their money and fields, who may change them, approval and history, imports and exports, the list, how a quote takes from it and gives back to it, and My Sections as far as the book holds them.
- **Done already (cited, not re-audited):** Company › Price book itself (REG-594), Export My Items (REG-627), the Vendor/Sub column (REG-623), saved sections with property type and tags (REG-619), trades and their notes (REG-561, REG-617, REG-647).
- **Not for a prototype:** 1.0's platform market rates, drift against them, seeding from them, crowd price signals, the model-read imports of PDFs and images, suggestions after a parse or a draft, embeddings and semantic search — listed as *Platform* with the stand-in 2.0 keeps.

## 0.3 Status legend

| Status | Meaning |
|---|---|
| **Built** | 2.0 has it, in its own shape. |
| **Partial** | 2.0 has part of it; the gap is named. |
| **Missing** | 1.0 has it, 2.0 has nothing; a proposal follows. |
| **Mismatch** | both have it and they disagree; a question decides (all collected in §2). |
| **Settled** | an earlier audit's call covers it (§6.2). |
| **Platform** | live infrastructure; 2.0 keeps a stand-in or nothing. |
| **Dead** | 1.0 saves or shows it and nothing reads it; not ported. |
| **2.0 only** | no 1.0 counterpart; kept and listed so the devs know it is new. |

## 0.4 How to mark

Answer in the decisions doc — a call per question — or write **go** · **hold** · **no** in the *Mark* column here. Rows marked go are built in the rounds of §7, each logged in `REGISTER.md` as `user-directed` with "1.0 · <inventory row>" as the source, verified on :3011 and banked under `design-source/verify/price-book-parity/`.

Reading order: **§1 Definitions** first — 1.0's book holds prices as **sell · cost · markup %** with the cost anchoring, 2.0's as **cost + markup in dollars**; 1.0's **approval never holds a price back** (a pending item is quotable everywhere, B-24, B-27); and **1.0's "drift" is the book against platform market rates**, never a quote against the book (B-45).

## 1. Definitions — the same thing under two names

| # | Concept | 1.0 | 2.0 | Verdict · question |
|---|---|---|---|---|
| DEF-01 | **Where the book lives** | Accounts › Quotes & Pricing › *Price Book*: tabs Items · Pending · Drift · Imports (A-01, A-05); the quote's *Price Book* modal, typeahead and Browse (A-03, A-51, A-52). | Company › Price book: My Items · My Sections (E-1…E-3); the quote's Add Item popover (E-17, E-18). | **Built** — 2.0's shape. |
| DEF-02 | **An item** | A name (required), SKU `PB-NNN`, specs, category + subcategory, sell · cost · markup %, unit, cost type, waste %, several vendors, tiers, spec link, tags, notes, image, active / archived, an approval status (A-20…A-25, B-01). | A name, description, kind (design · fee · labour · delivery · purchase), unit, cost and markup in S$, category (free text), one vendor, a photo nobody sees, soft delete (E-32, E-45). | **Partial.** **Q-08** what an item carries. |
| DEF-03 | **The money** | Sell, cost and markup % in dollars (`NUMERIC`); cost anchors, markup dials, sell follows — but four writers store a markup the row's own figures don't imply (B-02, B-03). | Cost and markup in cents; the unit price is their sum (E-32). | **Built** — one truth in 2.0; its boxes must take cents (**Q-01**). |
| DEF-04 | **A category** | A Quote Category id — the studio's trades list (B-70). | Free text that drifts from Settings' trades (E-66). | **Mismatch.** **Q-07** the trades. |
| DEF-05 | **A vendor** | Vendor records shared with Finance, several per item, the first the one that counts (A-23, A-57). | A vendor name per item; the same product from two vendors is two items (E-11, E-50). | **Built** — 2.0's rule (REG-594). |
| DEF-06 | **Approval** | A non-owner / non-admin add or edit lands *pending* — and is live in every picker at once; the queue approves or rejects (archives) (A-27…A-35, B-22…B-33). | None (E-47). | **Missing.** **Q-04** proposals. |
| DEF-07 | **History** | `price_book_history`: edits only, every field logged as changed "from —", nothing for adds, imports, approvals or deletes; a delete wipes it (A-41, B-34…B-36, C-47). | None (E-49). | **Missing.** **Q-05**. |
| DEF-08 | **A saved group of lines** | Packages (`studio_assemblies`) and quote rules, each with its own snapshot of prices (A-55, B-74). | My Sections (E-13…E-16, E-24). | **Settled** (templates TC-01; quote rules held, templates Q-07). |
| DEF-09 | **A line from the book** | A copy with a loose link; the snapshot time is written and read nowhere; later book edits reach no line (A-54, B-69, B-72). | A copy with a link (`price_book_item_id`) (E-20, E-21, E-34). | **Settled** (price snapshots dead, quote editor QP-15). |
| DEF-10 | **Drift** | The book against platform market rates: ±15 % outside a benchmark's range, five copies of the rule, benchmarks unreadable to studios since 2026-07-22 (A-36…A-39, B-38…B-42, C-23). | None (E-51). | **Platform** (**Q-16**). |

## 2. Mismatches — both have it, they disagree

| # | Topic | 1.0 | 2.0 | Question |
|---|---|---|---|---|
| MM-01 | Who may change the book | Owners and admins edit; approve, reject and delete by tag; a dozen routes check only the session (C-33…C-40) | nobody is refused anything (E-40, E-62) | Q-03 |
| MM-02 | A category | the studio's Quote Categories | free text | Q-07 |
| MM-03 | Money boxes | number inputs with decimals | the whole-dollar filter: "2.80" saves S$280 (E-60) | Q-01 |
| MM-04 | Rounding a price | none on the book | Settings' step rounds a per-sqft rate to S$0 (E-61) | Q-02 |
| MM-05 | An import | CSV mapped in the browser; PDFs, images and sheets read by a model; one request, all or nothing; no de-duplication (A-43…A-46, B-46…B-54) | pasted rows only, no de-duplication, a silent 500 cap (E-72) | Q-13 |
| MM-06 | Saving from a quote | *Also save to price book* on a new line (A-53) | *Save to Your Library* on any line, a new item each press (E-78) | Q-09 |

## 3. Feature matrix

Columns: the 1.0 feature (inventory rows) · what 1.0 does · what 2.0 has (inventory rows) · status · proposal or question · mark.

### 3.1 The page and the list

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| PL-01 | The workspace (A-01, A-05) | Accounts' Price Book tab: Items · Pending · Drift · Imports, `?pb=`. | Company › Price book: My Items · My Sections (E-1, E-2). | Built | Proposals get a view (**Q-04**). | |
| PL-02 | What loads (A-06) | Every row, archived included, 1,000 per page; a failed load reads as an empty book. | Every live item (E-3). | Built | | |
| PL-03 | Stats line (A-07) | Counts, drift pill. | Kind segments with counts (E-5). | Built | | |
| PL-04 | Search and filters (A-08) | Search, category, Active / Archived. | Search over name, description, category, vendor, kind; kind segments (E-5). | Partial | **Q-15** category and vendor filters. | |
| PL-05 | Grouping (A-09) | By category, collapsible. | None (E-80). | Missing | **Q-15** (a filter, not groups). | |
| PL-06 | Sorting (A-12) | By column. | Heads answer *Coming soon* (E-80). | Missing | **Q-15**. | |
| PL-07 | Selection and bulk (A-14) | Archive, restore, move to category. | None (E-80). | Missing | **Q-15**. | |
| PL-08 | Drag to reorder and re-file (A-15, B-19) | Server checks nothing; a drop re-files the category. | None. | Missing | No — the book sorts; a category is set, not dropped (**Q-15**). | |
| PL-09 | Archive / restore / delete (A-17, A-18) | Archive; delete permanently by tag, history wiped. | Soft delete, Deleted Items, delete forever while in use (E-7, E-8, E-75). | Partial | **Q-11**. | |
| PL-10 | Phone (A-58) | Drag desktop-only; no way in from a quote on a phone. | The galleries at 390 (E-42, E-43). | Built | | |

### 3.2 An item

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| IT-01 | Name, SKU, description (A-20) | Name required; SKU `PB-NNN` generated, collides under concurrent adds (C-27); plain description. | Name, description (E-6). | Partial | SKU: no. The formatted description: **Q-08**. | |
| IT-02 | Category, subcategory (A-20, B-70) | A Quote Category; subcategory free text. | Free text (E-66). | Mismatch | **Q-07**; subcategory no (accounts Q-18). | |
| IT-03 | Money (A-21, B-01…B-04) | Sell · cost · markup %; zeros saved as none; markup ≥ 1,000 % overflows. | Cost + markup S$, the unit price shown (E-6). | Built | **Q-01** cents. | |
| IT-04 | Unit, cost type, waste (A-22, B-05, B-08) | Unit (default *lot*), cost type, waste % for ordering. | Unit, kind (E-6). | Built | Waste: no (purchase orders are Finance's). | |
| IT-05 | Vendors (A-23, B-71) | Several; the first counts. | One name (E-11). | Built | 2.0's rule stands. | |
| IT-06 | Tiers (A-24, B-09…B-12) | Min / max quantity bands; unsaved on add; read only when a linked line's quantity changes. | None (E-58). | Missing | **Q-06** no. | |
| IT-07 | Spec link, tags, notes, image (A-25) | A validated link; tags read nowhere; internal notes; an image saved on upload even if cancelled. | A photo kept but never shown (E-77). | Partial | **Q-08** link and photo; tags and notes no. | |
| IT-08 | Saving (A-26) | Any member opens the editor; Save 403s for read-only members. | Anyone saves (E-40). | Mismatch | **Q-03**. | |

### 3.3 Approval and history

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| AH-01 | Who is trusted (A-27, B-22, C-35) | The literal owner / admin tag; everyone else's writes wait. | — | Missing | **Q-04**. | |
| AH-02 | A pending item (B-24, B-27) | Live in every picker and auto-match; an untrusted edit's price is live at once. | — | Missing | **Q-04**: only its proposer uses it until approved. | |
| AH-03 | The Pending tab, approve, reject (A-29…A-31) | Approve re-activates; reject archives and does not roll a price back; the comment reaches email only. | — | Missing | **Q-04**. | |
| AH-04 | Approving by editing (A-32) | A trusted save approves silently. | — | Missing | **Q-04**: approval is a deliberate press. | |
| AH-05 | Tasks and notifications (A-28, A-33, C-43…C-45) | One task and one notice per item; the first owner, not the configured approver. | — | Missing | **Q-04**: the bell, with the note. | |
| AH-06 | *Price book approvers* (A-34, B-30, C-41) | Only the first id is read. | — | Dead | **Q-04**: Owners and Admins approve (the studio's approvers). | |
| AH-07 | History (A-41, B-34…B-37, C-47) | Edits only; every field "from —"; nothing for adds, imports, approvals, deletes. | — | Missing | **Q-05**. | |

### 3.4 Imports and exports

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| IE-01 | Sources (A-43, B-46) | CSV in the browser; PDF, image, Excel, text through a model. | Pasted rows (E-9). | Partial | **Q-13** CSV / XLSX / XLS files; the model path is the platform's (**Q-16**). | |
| IE-02 | Mapping (A-44, B-47) | Nine fields, the first fitting header wins; no Name. | Columns mapped, Kind not offered, fields offered then dropped (E-72). | Partial | **Q-13**. | |
| IE-03 | Numbers (B-48) | Non-digits deleted: `$4.50/m2` → 4.502, `N/A` → 0. | The grid's paste parser (E-9). | Built | | |
| IE-04 | Duplicates, updates (B-54) | None; a re-import doubles the book. | None (E-72). | Missing | **Q-13** match by name and vendor. | |
| IE-05 | The write (B-53) | One request; one bad row fails all; unknown categories dropped though promised. | Row by row, 500 silently (E-72). | Partial | **Q-13**; categories **Q-07**. | |
| IE-06 | Export (A-47, B-57) | Every row, archived included; no Name column; no round trip. | Every live item; Kind lost on the way back; under New ▾ (E-10, E-73). | Partial | **Q-14**. | |
| IE-07 | Vendor default markup (A-48, B-03) | Stores a markup without re-pricing. | None (E-50). | Missing | **Q-15** bulk *Set markup*, re-pricing. | |
| IE-08 | The Quote Categories importer (A-49, B-55) | Prices ×100. | Company › Price book's import. | Built | | |

### 3.5 The book inside a quote

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QU-01 | Typeahead and Browse (A-51, A-52, B-59, B-60) | Up to 8 on typing; Browse with a vendor filter; pending included. | The Add Item popover: the first 8, no scroll or "more" (E-17, E-74). | Partial | **Q-12**. | |
| QU-02 | What a pick copies (B-69) | Name, SKU, description, unit, sell, cost, stored markup, cost type, waste, vendor, image, link, notes, category. | Name, description, unit, cost, markup (rounded), kind, category, vendor, photo (E-20). | Built | Link and formatted description with **Q-08**. | |
| QU-03 | A pick's stamp (—) | — | A pick stamps the item "edited" (E-63). | 2.0 only | **Q-17** fix. | |
| QU-04 | Saving a line to the book (A-53, B-73) | On a new line; files under the wrong category when changed. | Any line, a new item each press (E-22, E-78). | Mismatch | **Q-09**. | |
| QU-05 | Rounding on the way in (—) | — | Rounds unit rates (E-25, E-61). | 2.0 only | **Q-02**. | |
| QU-06 | GST on the way in (B-06) | No currency, no GST on the book. | The studio's rate for a new line; sections keep theirs (E-26, E-69). | Partial | **Q-10**. | |
| QU-07 | Sections from the book (A-55) | Packages with snapshots. | My Sections: hidden and optional lines, one-line print, rebate lost on the way (E-24, E-67, E-68). | Partial | **Q-10**. | |
| QU-08 | Auto-match, suggestions, semantic search (A-50, B-61…B-67) | Model-read and matched. | — | Platform | **Q-16**. | |

### 3.6 Around the book

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| AR-01 | Routes' checks (C-03…C-22) | Add / edit by permission; approve, reject, delete by tag; reorder, vendor markup, tiers, images, two imports, suggestions by session only. | 17 actions, no check (E-40). | Mismatch | **Q-03**. | |
| AR-02 | Page access (C-37, C-38) | Four tags reach Accounts; the book-only filter lost in May. | Every member (E-1). | Built | Every member reads; **Q-03** who changes. | |
| AR-03 | Notifications (C-43…C-46) | Pending, approved, rejected, drift. | — | Missing | **Q-04** proposal events; drift the platform's. | |
| AR-04 | Market rates, drift, seeding, crowd signals (A-36…A-40, B-38…B-44, C-50…C-52) | Platform tables and jobs. | — | Platform | **Q-16**. | |
| AR-05 | The AI around the book (B-75…B-77, C-55…C-59) | Parse, drafter, chat index, embeddings. | — | Platform | **Q-16**. | |
| AR-06 | Who may do what (—) | — | Settings › Studio's table has no book row (E-62). | 2.0 only | **Q-03**. | |

### 3.7 Touchpoints (other audits)

| ID | Touchpoint | Where it goes |
|---|---|---|
| PZ-01 | Purchase orders, waste factors, Finance's vendors, costs by vendor | Finance |
| PZ-02 | Quote rules and Starter Quote | Held (templates Q-07) |
| PZ-03 | Price snapshots on quote lines | Dead (quote editor QP-15) |
| PZ-04 | The UI sweep's backlog (U-01, U-03…U-11) | The UI consistency sweep (next module) |

## 4. Data model — the port plan

The column-level work is inventory **D** (`price-book-1.0-inventory/D-data-model.md`): 1.0's stores with every writer and its checks (D-01…D-20, W1…W15), the JSON shapes, the derived values, 2.0's stores (D-40…D-48), the diff and the port plan (D-170…D-248). The headline, with this audit's calls folded in:

- **The money comes from the two prices, never from `markup_percent`** (D-152…D-155): 1.0's stored markup meant margin before 2026-09-16, a margin again when seeded, a percent that moved nothing when set by vendor; a row lands `cost_minor = cost × 100` and `markup_minor = (sell − cost) × 100`. A row missing its cost lands with the whole price as cost and is listed; a row missing its sell (CSV imports store 0) is listed for the owner before it lands. The × 100 rows from the Quote Categories importer are shown first (D-237).
- **One 1.0 item with several vendors becomes one 2.0 item per vendor** (D-219), and a quote line re-links to the row of its own vendor (D-223).
- **What the calls add** (§6): `price_book_items.status` (`live` · `proposed`) · `created_by` · `updated_by` · `reviewed_by` · `reviewed_at` · `review_note` for proposals (Q-04; D-172's columns, the record quotes and templates already keep); a `price_book_changes` table for history (Q-05; D-171's shape — real changes only, who, when, before → after); `link` and `description_html` on items (Q-08; D-182); a saved section's lines keep `priceBookItemId`, `optional`, visibility and one-line print (Q-10; D-190). Not added: a SKU, tags, notes, waste, tiers, several vendors, an import log (D-170, D-175, D-180, D-181, D-183, D-184).
- **What does not port** (D-200…D-213): embeddings, suggestions, market rates, crowd signals, the approval tasks and notices (delivery records), 1.0's history rows (they log every field as changed "from —"; only the price figures are reliable, D-20 — ported as one *Imported* change per item), tiers.
- **The landing order** (D-215…D-224): after the Accounts Setup port (members, the trades) — vendor names, category names (outside the trades → added to them, Q-07), items, photos, sections, quote lines.
- **Checks after a port** (D-230…D-239): counts, `cost + markup = unit price × 100` for every row with both figures, no negative cost, every link on an item row naming an item and on a group row a section, every category a trade. **Never run `db:repair` or `db:baseline` on a ported studio** — R23, R29 and R38 match the demo's names (D-238).

## 5. Logic to carry over verbatim (for the devs, independent of UI)

1. **The unit price is cost + markup**, one truth (2.0). A 1.0 row lands `cost_minor = cost × 100`, `markup_minor = (sell − cost) × 100` — the stored markup % is ignored where it disagrees with sell and cost (B-03).
2. **A price is never rounded below its cost, nor to zero** (the opposite of E-61).
3. **An item is approved by a press, never by an edit**, and a proposal is usable by its proposer from the start — work never waits (1.0's intent, A-27; its leaks closed).
4. **Every change to an item's money, unit, name, category, vendor or kind is kept with who and when**, from its creation; an import and a delete are changes too.
5. **A category is one of the studio's trades.**
6. **An item or a section a quote came from is never deleted for good** while that quote lives.

## 6. Questions before anything is built

### 6.1 New calls

The owner delegated every call on 2026-09-24 (§9). Each still carries its recommendation, so it can be overridden in the decisions doc.

| # | Question | Recommendation | Rows |
|---|---|---|---|
| Q-01 | Money boxes take cents: the item dialog's Cost and Markup, the section editor's prices and quantities, and Settings' GST rate take a decimal point — "2.80" is S$2.80, "1,500" is S$1,500. | Yes — a house money mode on the field, the grid's rules. | MM-03 · IT-03 |
| Q-02 | The rounding step rounds a price only when the price is at least the step and never below the item's cost (it rounds up instead); a rate per area or length — sqft, sqm, ft run, m run — stays as typed; the Add Item popover shows the price the line will get. | Yes. | MM-04 · QU-05 |
| Q-03 | Owners and Admins change the book — add, edit, delete, import, bulk changes — on the page and on the server; every member reads it and uses it on quotes; a Designer proposes (Q-04); the menus say why; *Who may do what* lists the book's actions. | Yes. | MM-01 · IT-08 · AR-01 · AR-06 |
| Q-04 | A Designer's new item — from My Items or *Save to My Items* on a quote — is *Proposed*: at once on their own quotes (work never waits), marked Proposed, offered to no one else; an Owner or Admin approves it (it joins the book) or sends it back with a note (it leaves the book; lines already on quotes keep their figures); the proposer hears the answer in the bell with the note. A Designer doesn't change an approved item — a quote line's price is theirs to change. | Yes — 1.0's queue without its leaks (the held quote editor Q-20). | DEF-06 · AH-01…AH-06 · AR-03 |
| Q-05 | Price history: every change to an item's price, unit, name, category, vendor or kind — who, when, before → after — and its creation, import, approval, send-back, delete and restore; shown as the item's *History*. | Yes (the held quote editor Q-21). | DEF-07 · AH-07 |
| Q-06 | Volume price tiers? | No — 1.0's tiers are not saved on add, not checked, and reach a quote only when a linked line's quantity is edited; a studio prices a quantity break on the line or as its own item (the held quote editor Q-19). | IT-06 |
| Q-07 | An item's category is one of the studio's trades: the dialog picks from Settings' list (an Owner or Admin can add one there); an import's unknown category joins the trades and the preview says so; a renamed trade carries items whatever the case, and My Sections' lines. | Yes. | DEF-04 · MM-02 · IT-02 |
| Q-08 | What an item carries: add a product link (1.0's spec link, the quote's Website Link) and show, replace and remove its photo; keep a formatted description. Not ported: SKU, tags, internal notes, waste factor, several vendors, sub-categories. | Yes. | DEF-02 · IT-01 · IT-07 · QU-02 |
| Q-09 | A line and its item: *Save to My Items* on a line that came from an item offers *Update the item from this line* (to Owners and Admins; a Designer's proposes); nothing is duplicated silently; a line from My Items says so in its menu; Undo on the snackbar. | Yes. | MM-06 · QU-04 |
| Q-10 | Saved sections keep what makes them safe: hidden and optional lines, one-line print, the sub-total label, highlight, numbering off, rebate, photo and item links travel with a section; the editor edits the formatted note that prints; inserted lines take the studio's GST rate; *New section* writes on Save; the editor adds sub-sections and shows each line's unit. | Yes. | QU-06 · QU-07 |
| Q-11 | Deletes: an item or section a live quote came from can't be deleted forever (restore it instead, the libraries' rule); a deleted entry can't be picked from a page opened before the delete; counts leave deleted ones out; the Deleted sheet speaks of items and sections. | Yes. | PL-09 |
| Q-12 | The Add Item popover lists every item (a scroll and a count), finds by category, kind and vendor, walks My Sections with the arrow keys, and a pick lands where the row asked. | Yes. | QU-01 |
| Q-13 | Imports read a CSV, XLSX or XLS file as well as pasted rows; Kind is a mapping; each row is matched to an existing item by name and vendor — *Update the price* · *Add as new* · *Skip*, shown on the preview; duplicates inside the file are flagged; the 500-row limit is said up front; unknown categories join the trades. | Yes — reading PDFs and images is the platform's (Q-16). | MM-05 · IE-01…IE-05 |
| Q-14 | Export: every item or the ones shown; Kind comes back on import; *Export* sits in the page's kebab. | Yes. | IE-06 |
| Q-15 | The list: sortable heads; filters by category and vendor; selection with a bulk bar — *Set category*, *Set vendor*, *Set markup* (a % of cost, re-pricing the items — 1.0's vendor markup without its bug) and *Delete*. No drag. | Yes. | PL-04…PL-08 · IE-07 |
| Q-16 | Market rates, drift against them, seeding from them, crowd signals, model-read imports, suggestions after a parse, embeddings and semantic search? | No — the platform's (1.0's benchmark reads have failed since 2026-07-22, C-23). | DEF-10 · QU-08 · AR-04 · AR-05 |
| Q-17 | The demo's book tells the truth: a pick no longer stamps an item "edited"; the two tile items priced per square foot like the book's other floors; OM-10001 loses a probe's leftovers. | Yes. | QU-03 |
| Q-18 | Small truths: one name for the book from a quote (*My Items*, *My Sections*); zero use said one way; the section editor reads *New section* when new; the Deleted sheet's words; one glyph per meaning; stale docs corrected. | Yes. | — |

### 6.2 Settled earlier (stand as answered)

| Topic | Call | Where |
|---|---|---|
| Company › Price book, My Items and My Sections | Built | REG-594 |
| Export My Items | Built | quote editor Q-18 (REG-627) |
| The Vendor/Sub column | Built | quote editor (REG-623) |
| Packages → My Sections, with property type and tags | Built | templates TC-01, Q-27 (REG-619) |
| Quote rules and Starter Quote | Hold | templates Q-07 |
| Price snapshots on quote lines | Dead | quote editor QP-15 |
| Approval thresholds, a margin floor | No | quote editor Q-24 |
| Sub-categories under a trade | No | accounts Q-18 |
| The Quote Categories CSV importer | Built as Company › Price book's import | accounts QP-02 |

## 7. Build rounds

Nothing existing is removed. Each round ends with tsc + eslint, a Playwright probe at 1440 (+ 390 / 768 touch where the round touches them, and the 320 overflow gate), banked screenshots, register rows, repair rules and the baseline when data changes.

| Round | Builds | Questions | Size |
|---|---|---|---|
| **1 · Numbers you can trust** | Money boxes with cents; the rounding rule; categories as the trades; the demo's book | Q-01 · Q-02 · Q-07 · Q-17 | M |
| **2 · Who may change the book** | The gate; proposals with approve / send back and the bell; price history; authorship on every row; *Who may do what* | Q-03 · Q-04 · Q-05 | L |
| **3 · Items and sections that carry everything** | Link and photo; a line and its item; sections that keep their lines; deletes in use; the popover | Q-08…Q-12 | L |
| **4 · Imports, exports and the list** | File imports with update-in-place; export; sort, filters, bulk; the small truths | Q-13 · Q-14 · Q-15 · Q-18 | L |
| **5 · Data** | The devs' map for a studio's price book | — | S |

## 8. Coverage, and what was not verified

**Rows:** 10 definitions · 6 mismatches · 43 matrix rows (+ 4 touchpoints) · 18 new questions + 9 settled. Inventories: A 61 rows · B 80 · C 75 · D (the data model and port plan) · E 83. The live app on :3001 was not browsed; every 1.0 row rests on the code, and each reader's *Uncertain* list stands.

### 8.1 Found in 1.0 on the way (for the 1.0 developers)

From the code reading; not reproduced on a running 1.0.

1. **The book's market-rate benchmarks read as empty since 2026-07-22** — migration 264 made `platform_market_rates` readable by the service role only; the book still reads it as the studio, so the Drift tab, drift chips and *Seed* go dark while the monthly job keeps mailing drift counts that link to the empty tab (C-23, C-52).
2. **Approval never holds a price back** — a pending item is offered and priced in every picker, auto-match and AI search; an untrusted edit's new price is live at once; a rejection archives the item and does not roll the price back (B-24, B-27).
3. **About a dozen price-book routes check only the session** — drag reorder (which re-files categories), vendor markup, tiers, image upload, two import routes with no caller (their items land approved), suggestion adds, category upserts (C-08…C-10, C-16, C-19, C-22, C-24).
4. **The approver setting barely works** — only its first member is read, the task goes to the first owner (possibly a removed one), and a configured approver without the owner or admin tag can't approve (A-34, B-30, C-41).
5. **History logs every field on every save as changed "from —", in raw ids**, and records nothing for adds, imports, approvals or deletes; a delete wipes it (A-41, B-34, C-47).
6. **Typing a markup on an item without a cost sets its sell price to 0**, which saves as no price; a zero cost can't be saved (A-21, B-02).
7. **Vendor markup, drift *Suggest*, imports and *Seed* store markups the row's own sell and cost don't imply**; *Seed* stores a margin as markup (B-03, A-40, A-48).
8. **Tiers typed while adding an item are never saved**; the tier route has no check (A-24, B-10).
9. **Imports are lossy and all or nothing** — one request, one bad row fails every row; name, SKU and notes never imported; unknown categories dropped though the preview promises to create them; no de-duplication; only the first 100 rows can be unticked; *Back* from an AI preview then a CSV imports the old AI rows (A-44…A-46, B-48…B-54).
10. **Export includes archived and rejected rows and has no Name column**; re-importing it doubles the book and revives archived rows (A-47, B-57).
11. **Items with only a name are invisible to every automatic engine** — the matcher, the cost match, the scan, embeddings, drift and export read the description alone (B-62).
12. **Only the list pages through results**; export, scans, auto-match, the drift job and the SKU counter stop at 1,000 rows — Dyel has 1,609 items, El Arte 6,338 (C-26); the `PB-NNN` counter can collide (C-27).
13. **The AI parse reads a table no migration creates**, and without a model key returns seven sample rows as a real result (C-18).
14. ***Also save to price book* files the item under the category the panel opened with**, not the one picked (A-53).
15. **Expected Profit's *Open Price Book* goes to `/finance/price-book`, which doesn't exist** (A-02).
16. **Crowd signals copy a studio's cost prices into a platform-wide table**, and need five studios to aggregate (C-51).
17. **The price-book email template inserts item names and rejection comments unescaped**, and is the only one without studio branding (C-45).
18. **The page's book-only filter for non-owners was lost in a merge on 2026-05-15** (C-37).

### 8.2 Found in 2.0 on the way (fixed in the rounds)

1. Money boxes drop the decimal point and cut at the thousands comma; the GST rate took no decimal (E-60) — round 1 (the GST box fixed already).
2. The rounding step rounds per-unit rates to S$0 or below cost (E-61) — round 1.
3. Categories drift from the trades (E-66) — round 1.
4. A pick stamps the item "edited" (E-63); the tiles at S$1,100 a square foot (E-64); probe leftovers on OM-10001 (E-65) — round 1.
5. No role gate anywhere in the book (E-40, E-62) — round 2.
6. No author on any row; no history; no approval (E-79) — round 2.
7. Items keep a photo the book never shows; no link or formatted description (E-77) — round 3.
8. *Save to Your Library* duplicates (E-78) — round 3.
9. Saved sections lose hidden and optional lines, one-line print, rebates; a formatted note outlives an edit; lines keep an old GST rate; *New section* writes before the dialog; the editor can't add a sub-section (E-67…E-71) — round 3.
10. Deleted entries: deleted forever while in use, still pickable, still counted; the Deleted sheet speaks of templates (E-75, E-76) — round 3.
11. The popover shows eight items and misses categories (E-74) — round 3.
12. Import: paste only, no Kind, fields dropped, a silent 500 cap, no duplicate check (E-72) — round 4.
13. Export: all items whatever the view, Kind lost, under New ▾ (E-73) — round 4.
14. Sort heads answer *Coming soon*; no selection, bulk action or filters (E-80) — round 4.
15. Copy slips, house pieces, stale docs (E-81…E-83) — round 4.

## 9. The owner's answers

**The owner's instruction, 2026-09-24 (night):** "You take a call and go with your recommendations and build everything as i'm going to sleep now." Every one of the 18 new calls is **As recommended**, set on that instruction; the decisions doc shows each with its dropdown so the owner can override any of them. The nine settled calls stand as answered in their audits.

## 10. Build log

Rounds follow §7. The decisions doc's section H carries each round's status.

- **2026-09-25** — audit written (REG-649); the 18 new calls set *As recommended* on the owner's instruction (REG-650).
- **2026-09-25** — **R1** numbers you can trust built and verified (REG-651, `verify-pb-r1.cjs` 18/18; repair R56 on local.db after a backup).
- **2026-09-25** — **R2** who may change the book built and verified (REG-652, `verify-pb-r2.cjs` 41/41; migration 0050 and repair R57 on local.db after a backup — the running :3000 reads the new columns).
- **2026-09-25** — **R3** items and sections that carry everything built and verified (REG-653, `verify-pb-r3.cjs` 30/30; migration 0051 on local.db after a backup).
- **2026-09-25** — **R4** imports, exports and the list built and verified (REG-654, `verify-pb-r4.cjs` 32/32). One deviation from Q-13: the old binary `.xls` is refused with the leads import's words — the house reader takes CSV and XLSX.
- **2026-09-25** — **R5** the devs' map (`14-price-book-migration-map-2026-09-25.md`), the baseline rebuilt, CLAUDE.md's bullet (REG-655). The full banked suite: 21 probes, 591 checks green. **Price book parity done.**

## Appendix — the inventories

`price-book-1.0-inventory/` — **A** the screens and flows (A-01…A-61) · **B** the rules and the engine (B-01…B-80) · **C** around the price book (C-01…C-75) · **D** the data model and the port plan · **E** 2.0 today (E-1…E-83). The folder's README says who read what.
