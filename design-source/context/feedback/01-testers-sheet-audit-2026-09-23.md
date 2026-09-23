# Testers' feedback sheet — audit against the 2.0 prototype (2026-09-23)

Source: the owner's Google Sheet, tab `gid=434902554` (215 rows, columns A–K). Brief: read columns B (Observation type), C (Observation), D (Detailed explanation) and E (OM Feature); report what 2.0 already has and what still needs building for **Leads, the quote editor, the quote template builder and Quote X-Ray**, without closing any current function; list the questions that need a decision before building. Ignored on the owner's word: Workspace, Homeowner portal, Analytics, Projects, AI visualizer and Try AI visualizer (24 rows).

## 1. What the sheet holds

| | |
|---|---|
| Rows in scope | **191** of 215 — Quotes 147 + Quote 17 (the editor and its templates), Leads 14, Quote X-ray 2, Packages 5, Price book 1, Accounts setup 2, Leads/Quote 1, unlabelled 2 |
| Observation type (B) | UX/UI 82 · Bug 50 · Don't know 37 · Feature request 34 · Question 9 · Others 2 |
| Severity (F), where given | Blocker 25 · Critical 17 · High 5 · Low 9 · Unsure 4 (155 rows carry none) |
| Studios | Todz'terior 44 · IdesignerLab 27 · Dyel Design 20 · Mavid 22 · Quad R 1 · General / blank 100 |
| 1.0 resolution (I) | 50 rows — "Fixed & live", "Fixed", "Built, switched off", "Not supported right now", "Not fixed" |

Every row was mapped to its 2.0 touchpoint and given one verdict:

- **Built** — 2.0 already does it (often differently from 1.0, and usually better).
- **Partly** — the need is covered in part; the missing piece is named.
- **Not built** — a real gap in 2.0.
- **1.0-only** — a bug or artefact of the 1.0 code (AI parsing, import ingestion, a broken control) with no 2.0 equivalent to fix; noted for the platform team.

Rough tally across the 191 rows: **Built ≈ 100 · Partly ≈ 35 · Not built ≈ 40 · 1.0-only ≈ 16** (a few rows sit in two themes).

Note: the earlier feedback round in the register (REG-543…553, Oliva / Swati / Dane) came from the owner's other tab; none of this tab's rows were handled there, and nothing here was changed yet.

## 2. Leads (rows 23–28, 41, 122, 123, 172, 173, 181–183, 210)

| Rows | What the testers said | 2.0 today | Verdict |
|---|---|---|---|
| 23 | Journey mode makes kanban cards and the tray information-heavy | The listing's cards and Lead Details follow the mocks (compact cards, tabs); the Overview's Lead Stages card is the "journey" | Built — worth a design pass on the kanban card's density with the owner, no build |
| 24 | On Hold with a date: is there a reminder? | On Hold captures "Follow up on" (1 / 3 / 6 months · Custom, REG-453) but **nothing raises a task or reminder** | **Not built** → Q1 |
| 25, 26 | Unassigning a lead: card and tray disagree; sometimes impossible | One record drives every surface; past New the Assign popover refuses an empty selection (a lead needs an owner) | Built, by rule |
| 27, 28 | Budget and other lead fields not editable | Overview › Edit opens the lead form with every field | Built |
| 41 | A lead that became a project vanishes from Leads | Won leads stay in the list under Won; Convert to Project keeps the lead | Built |
| 122 | Project budget adds every quote up | The Won step picks the signed quote; one quote becomes the budget | Built |
| 123 | Changing a lead's status after Signed / Won | 2.0 never moves backwards: completed stages open read-only with Edit; Won creates the project | Partly → Q2 |
| 172 | Signing sits under Leads, sharing and downloading under Quotes | The quote editor's kebab holds Preview · PDF · Print · Send; contracts sign from the Contracts tab and the studio list | Built, consolidated |
| 173 | Revising a quote after approval errors out | Duplicate and Edit (REG-539) is the revision path; there is no "Revise → v2 supersedes v1" flow and Version History still answers coming soon | Partly → Q3 |
| 181–183 | Auto Fill reads the wrong date / year / time from a chat screenshot | Auto Fill in 2.0 is scripted (no real parsing) | 1.0-only — note the rule for the platform: no date in the image → the upload's date and time; no year → the current year |
| 210 | "Won" missing from the close reasons | Won is a stage in 2.0; Lost carries the reasons | Built |

## 3. Quote editor — the Items table and its lines

| Rows | What the testers said | 2.0 today | Verdict |
|---|---|---|---|
| 2, 89, 152, 213 | Colour a whole line, a price, a sub-section name; highlight a product | Text styles are per template (rows, header, section labels …); **no per-line or per-section colour** | **Not built** → Q4 |
| 4, 5, 133 | Bullet points and line breaks in descriptions print on one line | Descriptions print every line; the template's Descriptions option offers Hidden · First line · Every line · As bullets | Built |
| 134, 132, 151, 191, 211 | A · B · C and 1 · 2 · 3 lists, bold, underline, colour inside a description; formatting for long section descriptions (a wall of text) | Descriptions and section notes are plain text with line breaks | **Not built** → Q4 |
| 9 | A sub-line with a price but no line number | Item numbers are a template setting for every line; no per-line "no number" | Not built → Q5 |
| 10, 125 | "Save to price book" is on by default | Lines are never auto-saved; "Save to My Items" is an explicit row action | Built |
| 11 | "per" printed with no quantity | Unit is free text; nothing is invented | Built (1.0 bug) |
| 12 | A category without lines does not print or show in tabs | Groups show in the editor; empty groups never print (REG-497) | Built, by design |
| 13 | One vocabulary: category / sub-category vs section / sub-section | Editor says Group; templates say Section, Trade, Room | Partly → Q6 |
| 14, 19 | Lump-sum pricing per category; error copy | Items block: "Lump sum per section" prints one amount per section | Built (template-level) |
| 15, 16, 108 | Add category / add item feel different; "Add" only makes a new category | Create Group in the toolbar, Add Item row, the Create ▾ strip (My Items · Templates · AI); groups come from View by Trade / Room / Section | Built |
| 17, 29, 111, 167, 175–180 | Packages: shown to studios that have none, unclear icon, no feedback on add, no totals, geo field, sub-section bug, no cost price | **2.0 has no Packages at all** | **Not built** → Q7 |
| 18, 126, 141, 142 | FOC / Included / On behalf / KIV lines flagged "need pricing"; labels not intuitive; FOC becomes $0 on reopen | The template's "Zero amounts" prints FOC · Inclusive · 0.00 · Blank for every zero row; no per-line label, no nag | Partly → Q8 |
| 21, 190 | "Inclusive" per line, not per category; an inclusive line with a price should count in totals but not print | Optional (REG-492) keeps a line out of totals; the opposite (counted, not printed) does not exist | **Not built** → Q8 |
| 20 | More than one quote per lead | The Quotes tab creates any number | Built |
| 30 | A blank quote should be tabular; sections before lines | The Excel-benchmark grid (REG-475…477) and starter sections from the template (REG-497) | Built |
| 31 | The standard template should inspire | Three house styles rebuilt from real quotes (Letter · Scope · Form) plus the studio's own | Built |
| 32, 33, 63, 88 | Switching creation mode, browser Back, landing on the wrong tab, discard flow | Change template in General Info; Back honours where you came from (REG-465); the editor opens on General Info with Items open | Built |
| 42–46, 49 | Draft with AI: tiny prompt box, unformatted prompt, duplicated prompt, wrong sizes | Maison AI in 2.0 is scripted; the editor's AI sheet answers coming soon | 1.0-only → Q9 |
| 47 | The payment schedule takes a whole panel | A collapsible section in the editor's order | Built |
| 50 | "Locked fields" reads as locked for me | Template elements lock with a labelled toggle | Built (copy check) |
| 56, 58, 189, 138 | Pencil-to-edit, renaming a category moves it, all-caps entry | Inline editing keeps the row where it is; case as typed; the template's "Aa" prints uppercase | Built |
| 57, 99, 139, 193, 215, 216 | Sub-sections: drag a line into one, add one, number them, delete one and keep its lines | Groups are one level (4 → 4.1); the print's second level comes from Then by Room / Trade; **deleting a group deletes its lines** | Partly → Q10 |
| 60, 145 | Drag and drop copies or does nothing | The grid drags rows and groups; drag-fill copies on purpose (REG-477) | Built |
| 64–66 | Progress and layout preferences lost | Autosave on every change; section order and collapse persist per quote | Built |
| 77 | Any unit can be typed, not obvious | Unit is a free-text cell | Built (a placeholder "e.g. sqft, lot" would help) |
| 81, 84, 114, 115, 116, 166 | Column widths, an unnamed description column, order of columns | Template columns: on / off · printed heading · width in mm · alignment; the editor's Column settings reorder the working columns; **the print order cannot be changed** | Partly → Q12 |
| 90, 110, 131, 144, 157 | Numbering: 1 › 1.1 › a b c, modes hard to understand, editor and preview differ, two blocks with their own sequences, no space after the number | Item numbers: Restart per section · Restart per room · Run through · None with plain names; the editor regroups the way the template prints (REG-497 asks); a space follows the number | Partly → Q11 |
| 127 | Discounts with their own words ("Discount as goodwill", "Voucher $500"), several at once | Line discounts plus one additional discount whose label is editable in the Totals block | Partly → Q13 |
| 128, 143 | Margin ignores the cost of FOC lines | Cost sums every counted line at qty × cost regardless of its price, so FOC lines count | Built |
| 129, 130 | Quote numbers must follow the studio's convention (Q-TT-SW-202403-026); contract numbers | Quotes are OM-10001…; contracts carry no number | **Not built** → Q14 |
| 135 | Total pages typed by hand | The page-number element prints "n of N" | Built |
| 137 | "Unsaved changes" on an untouched quote | "Saved just now" stamp; no warning bar | Built |
| 146 | Add-on cost for a customisation on the same line | No sub-lines or options | Not built → Q15 |
| 147, 144 | A two-part quote (package with its own subtotal and promo discount, then additional works) | Sections with sub-totals exist; a bundle price / bundle discount does not | Not built → Q7 |
| 148, 149, 194 | Import artefacts: footer notes as lines, hidden rows, bullet numbers in item names | Recreate from my current quote is a curated match, not ingestion | 1.0-only |
| 150 | Up to four photos on one line | The editor keeps a photo and a count; print shows one | Partly → Q16 |
| 153 | Commercial clients need different fields | Property types include Commercial — Office / Retail; the fields are the same | Partly → Q17 |
| 154 | Price book edit drawer sized wrong | My Items is a house drawer | Built |
| 156 | NRIC printed as 4 digits + letter | NRIC is free text and prints as typed | Not built → Q18 |
| 174 | Quote categories cannot be edited in Account setup | Trades are free text on each line; there is no managed list | Not built → Q19 |
| 192 | A section total that reads "Approximate" | Section sub-totals print the sum | Not built → Q21 |
| 212, 214 | Currency sign left, amount right; "Subtotal" → "Total" | "$ (spaced)" currency option; every Totals line label is editable | Built |
| 36 (X-Ray) | The coverage matrix misleads when line names differ (three carpentry lines vs one) | X-Ray matches by what the words say and marks lines matched · only in yours · only in theirs · unpriced | Partly → Q22 |

## 4. Quote template builder (layout)

| Rows | What the testers said | 2.0 today | Verdict |
|---|---|---|---|
| 34 | Editing through a template is dense and daunting | The second pass (REG-542): plain words, 36px targets, captioned options, Undo, a first-visit hint | Built |
| 51, 170, 171, 62 | Logo only by URL; linking images fails; logo not centred | Brand kit uploads; every image block and element takes a file; elements place in mm | Built |
| 52, 109, 112, 113, 117 | Title formatting on toggles, defaults hard to change, inconsistent formatting, "Typography" sets only size, related controls split | One style editor everywhere (text style · font · size · weight · emphasis · align · colour), captioned More options | Built |
| 53, 54, 55, 118, 124, 73 | Text in the header, two blocks side by side, moving a divider, blocks landing at random, page number in the footer, quote number and a line in the footer | Header, footer and cover are canvases: text · image · details · rule · box · signature · badges · page number placed and dragged in mm; Add block lands after the selection | Built |
| 61, 82 | Studio name stale in the footer; {date} shortcuts unknowable | Fields resolve live; Insert field lists them by plain name | Built |
| 67, 169 | Two-column detail rows confusing to reorder | Details block: Left column and Right column as separate lists; rows can be removed but **not reordered** | Partly (small) |
| 68, 74, 78, 163 | Intro and signature split over pages; space to sign; the gap before the signature | Keep with the next block · Start on a new page · Space before / after; the signature element's height | Built |
| 69, 72 | A second owner's particulars and two owner names | One client per lead; the Signature block draws up to four columns but has no second-owner data | **Not built** → Q25 |
| 70 | Project ref, not the quote number | Project Ref # in General Info prints through {project_ref} | Built |
| 71, 101 | Bank details (bank code, branch code, account name); PayNow QR, two companies | No bank fields; a QR can be placed as an uploaded image, but not per issuing entity | **Not built** → Q24 |
| 75, 80 | Qty 0 cannot be removed; "0" prints after choosing to hide it | Columns switch off; Zero amounts → Blank | Built |
| 79, 136, 161 | Designer name, phone and email in the signature | Fields: Prepared by · phone · role; **no email** | Partly → build (small) |
| 83, 85 | Undo changes the preview only; version numbers | One undo history across panes and page; template versions with History and roll back | Built |
| 86, 87 | IC number and property type in the details rows | Fields include NRIC and property type | Built |
| 92 | Category subtotal below the lines | Sub-total per section prints after its rows | Built |
| 93, 94, 95 | Social links, tagline, email and phone in the footer | Company details carry phone, email, website; the footer takes any typed text; **no tagline or social fields** | Partly → Q23 |
| 96, 97, 98, 100, 162 | Footer that will not fit, signature overflowing, a band bleeding off the page, the logo's top margin, no page margin | mm placement, a background band with the canvas's own height, page margins in Page setup | Built |
| 102, 103, 104, 106, 120 | Design fee first then a split; no total under the terms; milestone text bold; reordering milestones; two lines of terms under the schedule | Free milestone rows with drag reorder; text styles; Terms / Notes / Text blocks anywhere; **no switch to hide the schedule's total** | Partly → build (small) |
| 105, 155 | $ rather than S$ | Currency: S$ · $ (spaced) · figures only | Built |
| 107 | Role-based layout access would block designers | Owners / Admins publish; Designers edit and submit for approval (REG-501) | Built |
| 119 | An unsaved-changes dialog after Save as template | Autosave; no dialog | Built |
| 140 | "16 sections · 107 items" vs "14 blocks · 107 items" | One set of facts in every picker | Built |
| 158 | Footer notes on some pages only | Header / footer show on Every page · First page only · After the first | Partly (no page list) |
| 159 | Trust markers in the header | Badges in the brand kit and a badges element | Built |
| 160 | Table headers must repeat on every page | The paginator repeats the head on every page | Built |
| 164, 165, 168 | Switching templates gives no feedback, no visuals, studio templates last | The picker draws every template's real pages, studio templates first, "Template changed" snackbar, Apply defaults on a draft (REG-539) | Built |

## 5. Quote X-Ray, price book, settings

| Rows | What the testers said | 2.0 today | Verdict |
|---|---|---|---|
| 36 | Coverage matrix misleading when names differ | See §3 last row | Partly → Q22 |
| 185 | "Unable to save quote comparison" for one studio | 2.0 saves every comparison as a record | 1.0-only |
| 154 | Price book drawer | My Items drawer | Built |
| 174 | Cannot edit quote categories | No managed trade list | Not built → Q19 |
| 184 | Journey-mode customisations lost | Settings › Leads persists | 1.0-only |
| 186 | Other documents for signing; how signing works | Contracts sign through a WhatsApp link and `/sign/[id]` (REG-534); nothing else signs | Partly → Q20 |

## 6. What needs building in 2.0 (proposed, no current function removed)

Ordered by the sheet's own weight (blockers and criticals first, then how many studios asked).

1. **Per-line "Print as"** — Price · FOC · Inclusive · KIV · Packaged · On behalf · custom words, each with its own "counts in the totals" rule. Touchpoints: the Items table's price cell and row menu, the bulk bar, the Items block's Zero amounts (stays as the default), the preview and client view, X-Ray's unpriced status, Activity. Rows 18 · 21 · 126 · 141 · 142 · 190.
2. **Description and section-note formatting** — bullets (• / A B C / 1 2 3), bold, underline, colour; the same editor for a section's description. Touchpoints: the description cell, the group row's description, the template's Descriptions option, print. Rows 4 · 5 · 132 · 133 · 134 · 151 · 191 · 211.
3. **Line and section highlight** — a colour from the kit's six on a line or a section (whole line incl. price), printed and shown in the grid. Rows 2 · 89 · 152 · 213.
4. **Packages / bundles** — saved sets of lines with a bundle price or discount and their own numbering, added to a quote as one part with its own subtotal. Rows 17 · 29 · 108 · 111 · 144 · 147 · 164 · 167 · 175–180. (Q7 first — this is the largest item.)
5. **Studio numbering** — a pattern for quote and contract numbers (prefix · designer initials · YYYYMM · sequence) in Settings › Quotes; contracts get a number. Rows 129 · 130.
6. **Numbering schemes** — add "1 › 1.1 › a b c" and a per-line "no number"; keep today's four. Rows 9 · 90 · 110 · 144.
7. **On Hold follow-up** — the "Follow up on" date raises a task on the lead, kept in step like a quote's due date (REG-470), shown on the Overview. Row 24.
8. **Company details** — bank account (bank, branch code, account number, account name) and a PayNow QR **per issuing entity**, a tagline, social links, and a designer email field ({prepared_by_email}). Rows 71 · 93 · 94 · 95 · 101 · 136 · 161 · 79.
9. **Sub-sections** — a group inside a group in the editor, with numbering to match; deleting a group moves its lines up instead of removing them (with Undo). Rows 57 · 99 · 139 · 193 · 215 · 216.
10. **Several named discounts** — "Discount as goodwill", "Voucher $500" as their own totals lines. Row 127.
11. **Quote revisions** — Revise makes v2 that supersedes v1 on the lead while the sent copy stays; Version History lists them. Rows 173 · 85.
12. **Payment schedule** — a switch to hide the schedule's total line. Row 103.
13. **Print column order** — reorder the Items block's columns in the template. Rows 166 · 81 · 114.
14. **Co-owner on the lead** — second name and NRIC with {client2_name} / {client2_nric} fields for details, header and signature. Rows 69 · 72.
15. **Add-on options on a line** — a priced option under a line (curved design +$…), counted in the line. Row 146.
16. **NRIC masking** — print as 4 digits + letter when the studio asks. Row 156.
17. **Photos in print** — more than one photo per line, small, when the template allows. Row 150.
18. **X-Ray rollup** — compare by trade and room totals first, then lines; show "same trade, different lines" instead of a false gap. Row 36.
19. **Trades list** — a managed list of trades / categories in Settings › Quotes (rename, reorder, retire) that the editor's Trade column and View by use. Row 174.
20. **Section total label** — an override such as "Approximate" on a section's sub-total. Row 192.
21. Smaller: reorder the Details block's rows (67, 169); footer content on chosen pages (158); a unit placeholder (77); one word set for Group / Section / Category (13).

Everything marked Built stays as it is; nothing above replaces a current control.

## 7. Questions before building

**Round 1 = the quote editor and the template builder only** (owner 2026-09-23: "hold back the other module changes … focus on the quotes and template builder first"). Asked now: Q3–Q16, Q18, Q19, Q21, Q23, Q24. Held for a later round: Q1 and Q2 (Leads), Q17 (the lead form), Q20 (contracts), Q22 (X-Ray), Q25 (a co-owner on the lead — needed by templates later, but the data lives on the lead).

1. **On Hold reminder (24)** — raise a follow-up task on the lead at the "Follow up on" date, the way a quote's due date does (REG-470)? Should it also appear in the Tasks rail with an overdue badge?
2. **Undoing Won / Lost (123)** — 2.0 never moves backwards by design. Allow "Reopen" from Won or Lost (the project stays; the lead returns to its last active stage) or keep the rule?
3. **Quote revisions (173, 85)** — when a sent or approved quote changes, should Revise create v2 that supersedes v1 on the lead (v1 kept read-only, sent copy unchanged), with Version History in the kebab? Or is Duplicate and Edit enough for the prototype?
4. **Per-line colour (2, 89, 151, 152, 213)** — one colour for the whole line (name, description, price) chosen from the kit's six, or free colour per word inside descriptions? I propose whole-line plus bold / underline / bullets inside descriptions, and no free colours.
5. **Lines without a number (9)** — a per-line "no number" mark (for ": Lighting points × 01" sub-lines), or should such sub-lines become add-on options (see 15)?
6. **Vocabulary (13)** — the editor says Group; the templates say Section (with Trade and Room as the ways to group). Settle on **Section** everywhere?
7. **Packages (17, 29, 108, 111, 144, 147, 164, 167, 175–180)** — do we bring packages into 2.0? If yes: as "Bundles" under My Items (a saved set of lines with a bundle price or discount, added as one section with its own subtotal and numbering), visible only to studios that have made one. This is the biggest item in the sheet.
8. **Print as (18, 21, 126, 141, 142, 190)** — which labels do we ship: FOC · Inclusive · KIV · Packaged · On behalf · custom? And the rule for each: FOC and On behalf = not counted; Inclusive = counted but printed as the word; KIV = not counted, flagged in the summary?
9. **Draft with AI (42–46, 49)** — build a scripted flow for demos (a full-height prompt, a formatted echo of the prompt, lines that land in the table), or leave the AI sheet at coming soon?
10. **Sub-sections (57, 99, 139, 193, 215, 216)** — allow a group inside a group in the editor (with 1 › 1.1 › 1.1.1 numbering) instead of the attribute-based second level (Then by Room)? And when a group is deleted, move its lines to the parent instead of removing them?
11. **Numbering scheme (90, 110, 144)** — add "1 › 1.1 › a b c" as a fifth mode? Any other studio scheme we know of?
12. **Column order (166, 81, 114)** — reorder the printed columns in the template (drag in the Columns list)?
13. **Named discounts (127)** — several additional discounts, each with its own words and % or amount? Or one discount whose label can be edited (today)?
14. **Numbering convention (129, 130)** — a studio pattern in Settings › Quotes with parts (prefix, designer initials, year-month, sequence) and a preview, applied to new quotes and contracts; existing OM-numbers stay. Should contracts share the sequence or have their own?
15. **Add-on options (146)** — a priced option under a line, counted in the line's total and printed indented? Or is a separate line acceptable?
16. **Photos (150)** — print up to four small photos per line, or one photo plus "+3"?
17. **Commercial clients (153)** — which fields differ: company name, UEN, contact person, no NRIC? Add them to the lead form when the property type is Commercial?
18. **NRIC masking (156)** — print "••••567A" always, or a switch in Company details?
19. **Trades list (174)** — a managed list in Settings › Quotes (rename, reorder, retire) that the Trade column and View by use, with today's free text kept as "Other"?
20. **Signing other documents (186)** — beyond contracts, should the signing link work for a quote (approve and sign) too?
21. **"Approximate" section totals (192)** — a label override on a section's sub-total, or a "Print as" label at the section level (same feature as 8)?
22. **X-Ray matching (36)** — compare trade and room totals first (a rollup), then lines within a trade, and show "same trade, different lines" as one row instead of two gaps?
23. **Tagline and social links (93, 94)** — fields in Company details with matching {studio_tagline} / {studio_social} fields, or keep them as typed footer text?
24. **Bank details and PayNow (71, 101)** — fields per issuing entity (the quote editor already picks the entity), with a "Bank details" block for templates and the QR as an image element bound to the entity?
25. **Co-owner (69, 72)** — a second client (name, NRIC, phone) on the lead, printed through {client2_*} fields and offered as a signature column?

## 8. Action lists by module (owner 2026-09-23: "group the gaps, tasks, findings … so it will be easy for me to decide")

Each item has an id to answer by. Round 1 = Q and T lists; L and X wait.

### Quotes — the quote editor
Already covered: the grid (REG-475…477), many quotes per lead, explicit Save to My Items, inline edit, drag and drop, autosave, Change template + Apply defaults, origin-aware Back, "$ (spaced)", editable Totals labels, FOC cost in the margin, sub-total after the rows, lump sum per section, free payment rows with drag reorder, the My Items drawer, free-text units, empty sections never print.

- **Q-1 Print-as labels per line** — FOC · Inclusive · KIV · Packaged · On behalf · custom, each with a counts-in-totals rule (rows 18, 21, 126, 141, 142, 190). Decide: the six labels and the rules (FOC / On behalf not counted; Inclusive counted, prints the word; KIV not counted, flagged).
- **Q-2 Line and section colour** — one of the kit's six colours on a whole line or a section, in the grid and in print (2, 89, 152, 213). Decide: whole line only, no free colours.
- **Q-3 Description formatting** — bullets (• / A B C / 1 2 3), bold, underline in a line's and a section's description (4, 5, 132, 133, 134, 151, 191, 211).
- **Q-4 Sub-sections** — a section inside a section, numbered 1 › 1.1 › 1.1.1; deleting a section moves its lines to the parent with Undo (57, 99, 139, 193, 215, 216). Decide: both halves.
- **Q-5 Add-on options** — a priced option under a line, counted in the line, printed indented (146). Decide: build, or a separate line is enough.
- **Q-6 No-number lines** — a per-line "no number" mark (9). Decide: build, or fold into Q-5.
- **Q-7 Named discounts** — several additional discounts with their own words and % / amount (127). Decide: several, or one editable label as today.
- **Q-8 Photos** — up to four small photos per printed line, or one plus "+3" (150).
- **Q-9 Packages / bundles** — a saved set of lines with a bundle price or discount, added as one section with its own subtotal and numbering, only for studios that made one (17, 29, 108, 111, 144, 147, 164, 167, 175–180). Decide: this round or later. The largest item.
- **Q-10 Numbering scheme** — "1 › 1.1 › a b c" as a fifth mode (90, 110, 144).
- **Q-11 Quote number convention** — a studio pattern (prefix · designer initials · YYYYMM · sequence) in Settings › Quotes, applied to new quotes; existing numbers stay (129, 130).
- **Q-12 One word** — Group becomes Section in the grid to match the templates (13).
- **Q-13 Revisions** — Revise makes v2 superseding v1 on the lead, the sent copy stays, Version History lists them (85, 173). Decide: build, or Duplicate and Edit is enough.
- **Q-14 Draft with AI** — a scripted demo flow: full-height prompt, formatted echo, lines land in the grid (42–46, 49). Decide: build or leave coming soon.
- **Q-15 Trades list** — a managed list in Settings › Quotes that the Trade column and View by use; free text kept as Other (174).
- **Q-16 Unit hint** — a placeholder ("e.g. sqft, lot, no.") in the Unit cell (77). Small.

### Quote template — the builder
Already covered: canvases with text · image · details · rule · box · signature · badges · page number in mm, uploads everywhere, live fields with Insert field, one style editor, page margins and keep-with-next, repeating table heads, page "n of N", template switching with real pages and Apply defaults, approval roles, the second-pass simplification (REG-542), "$ (spaced)", Zero amounts, sub-total placement, Descriptions modes.

- **T-1 Column order** — drag to reorder the printed columns in the Items block (81, 114, 166).
- **T-2 Payment schedule total** — a switch to hide the schedule's total line (103).
- **T-3 "Approximate" section totals** — a label override on a section's subtotal, best as Q-1's Print-as at section level (192).
- **T-4 NRIC masking** — print "••••567A"; decide: always, or a switch in Company details (156).
- **T-5 Tagline and social links** — fields in Company details with matching template fields, or typed footer text (93, 94).
- **T-6 Bank details and PayNow** — bank, branch code, account number and name plus a PayNow QR per issuing entity, and a Bank details block (71, 101).
- **T-7 Designer email** — a {prepared_by_email} field for signatures and footers (79, 136, 161). Small.
- **T-8 Details rows reorder** — move rows up and down in the Details block's two columns (67, 169). Small.
- **T-9 Footer on chosen pages** — a page list beyond first / every / after-first (158). Low.
- **T-10 Co-owner fields** — {client2_name} / {client2_nric} for details, header and a signature column; depends on L-4 (69, 72).

### Leads (held for a later round)
Already covered: every lead field editable, Won stays in Leads, the signed quote becomes the budget, the owner rule on assignment, Lost reasons, signing and sharing consolidated in the quote and contract surfaces.

- **L-1 On Hold follow-up** — the "Follow up on" date raises a task on the lead, kept in step like a quote's due date, shown on the Overview and the Tasks rail (24).
- **L-2 Reopen Won / Lost** — a way back to the last active stage (the project stays), or keep "nothing moves backwards" (123).
- **L-3 Commercial clients** — company name, UEN, contact person, no NRIC when the property type is Commercial (153).
- **L-4 Co-owner** — a second client (name, NRIC, phone) on the lead (69, 72); T-10 prints it.
- **L-5 Kanban card density** — a design pass with the owner, no build (23).
- **L-6 Auto Fill dates** — a platform rule, not a prototype change: no date in the image → the upload's date and time; no year → the current year (181–183).
- **L-7 Signing other documents** — contracts only today; a quote's own approve-and-sign link would be new (186).

### Quote X-Ray (held for a later round)
Already covered: every comparison is a saved record; lines are matched by their words and marked matched · only in yours · only in theirs · unpriced; summary, Say this, Key points, the WhatsApp draft.

- **X-1 Trade and room rollup** — compare trade and room totals before lines; show "same trade, different lines" as one row instead of two false gaps (36).
- **X-2 Print-as awareness** — FOC / Inclusive / KIV lines read as such, not as unpriced (follows Q-1).
- 1.0-only: the "Unable to save quote comparison" error (185).

## 9a. Status (2026-09-23, evening) — round 1 built

Owner's word: "Q-12: okay · T-4: masked only when customer enters it · build rest of the things." Built and logged: Q-1 + T-3 (REG-555), Q-2 (REG-556), Q-3 (REG-557), Q-4 + Q-10 + Q-6 (REG-558), Q-7 (REG-559), T-1 · T-2 · T-7 · T-8 · Q-16 (REG-560), Q-11 + Q-15 (REG-561), T-5 + T-6 (REG-562), T-4 as decided (REG-563), the data round (REG-564), Q-13 (REG-565), Q-9 first half (REG-566), Q-12 (REG-567). Held as planned: Q-5, Q-8, Q-9 second half, Q-14, T-9, T-10, every L and X item. Probe `verify-round1.cjs` (17 steps); screenshots under `design-source/verify/round1-testers/`.

## 9. Recommendation for the Q and T lists (design lead's call, 2026-09-23)

Judged on 2.0's own principles — the grid as the Excel benchmark, one renderer for grid · pane · preview · print, the brand kit as the one source of colour and type, templates that never surprise, and an editor a studio owner can use — not on the sheet's wording. Nothing here removes a function; the only rename is Q-12.

**Build in round 1**
- Q-1 Print-as labels (+ T-3 at section level) — the price cell's menu: Price · FOC · Inclusive · KIV · On behalf · Packaged · custom; each with its counting rule; the grid shows the word in the Total cell; Zero amounts stays as the fallback; Optional (REG-492) stays.
- Q-3 Description formatting — the in-house rich editor (Terms · Notes) inside the description cell and the section's description: bullets, A B C, 1 2 3, bold, underline. No colour inside text.
- Q-2 Line and section colour — "Highlight" from the kit's six colours on a whole line or section; a left band in the grid, the line's ink in print.
- Q-4 Sub-sections + Q-10 numbering + Q-6 no-number — a section inside a section (1 › 1.1 › 1.1.1 and the letters mode), deleting a section moves its lines to the parent with Undo, a per-line "no number".
- Q-7 Named discounts — the Totals card's Additional discount becomes a short list (words + % or amount), each a line in the Totals block; today's single discount is the first row.
- Q-11 Quote number convention (+ Q-15 Trades list on the same Settings › Quotes page) — pattern parts with a live example; new quotes follow, existing numbers stay.
- Q-13 Revisions — Revise on a Sent / Approved quote makes v2 under the same number, v1 read-only and linked, Version History in the kebab; it completes the header's VERSION chip.
- Q-9 first half — "Save section to My Items" and insert a saved section: bundles without a package concept.
- T-1 column order · T-2 hide the schedule's total · T-7 designer email · T-8 Details rows reorder · Q-16 unit hint.
- T-5 tagline and social fields · T-6 bank details and PayNow per issuing entity with a Bank details block · T-4 NRIC masking as a Company details switch, on by default.

**Later (round 2)**
- Q-9 second half — bundle price / discount and numbering that restarts per part.
- Q-5 add-on options under a line; Q-8 more than one photo in print; Q-14 a scripted Draft with AI; T-10 co-owner fields (with L-4).

**Not now**
- T-9 footer on chosen pages — first / every / after-first covers the cases seen; revisit on a real block.

**Needs the owner's word**
- Q-12 "Section" instead of "Group" in the grid (the mock says Group); T-4's default (masked on).

Suggested order: Q-1 · Q-3 · Q-2 · Q-4 (+Q-10, Q-6) · Q-7 · the small T items and Q-16 · Company details (T-5, T-6, T-4) · Q-11 (+Q-15) · Q-13 · Q-9 first half.
