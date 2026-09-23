# Studio tech requests — the quotes, templates, signing and price-book rows, from 2.0's point of view (2026-09-23)

Source: the owner's Google Sheet `1nRylNpelEd8eo5gYXgE7YMI7kzL03qQm7OERjhw8I_k`, tab `gid=1489139182` ("Tech Feature Request": Studio · status · request · Status · Category · Priority · Blocker · Owner · ETA · Media), 111 rows, read as CSV on 2026-09-23. Brief: identify the quotes and template rows, propose the fix from the 2.0 side, and say how each is built in our workflow. Nothing is built from this document yet.

**In scope (44 rows):** 2, 6, 7, 11, 12, 14, 15, 19, 23, 26, 30, 31, 32, 34, 38, 39, 44, 45, 52, 55, 57, 63, 64, 65, 67, 70, 74, 75, 79, 81–85, 87, 90–100, 102–106, 108–112.
**Out of scope (left to their modules):** Finance and payments (3, 16, 22), Projects and the homeowner portal (4, 5, 21, 36, 37, 49, 53, 59, 80), Leads and notifications (8, 9, 10, 25, 28, 62, 68, 71–73, 88, 101), integrations and AI (13, 17, 18, 20, 24, 29, 33, 46, 47, 48, 50, 51, 54), analytics (35, 66, 89), account set-up and onboarding (27, 40–43, 56, 58, 60, 61, 69, 76–78, 86, 107).

Verdicts: **Built** (2.0 does it, often differently from 1.0) · **Partly** (the need is covered in part; the missing piece is named) · **Not built** · **Ops / platform** (done by hand in the editor, or the 1.0 platform's job — no 2.0 UI).

## 1. Row by row

### A · The quote's lines

| Row | Studio · priority | Request | 2.0 today | Verdict → proposal |
|---|---|---|---|---|
| 2 | Most studios | Sheet-style line entry, the drawer only for full specs | The Items table is a keyboard grid (REG-475): type across cells, Tab / Enter walk the row and column; a rich description opens in its dialog (REG-557) | **Built** |
| 64 | LA Design | Undo a deleted line | Delete carries Undo; ⌘Z replays the lines (REG-475) | **Built** |
| 82 | Mavid | Bulk delete lines | The bulk bar's Delete | **Built** |
| 87 | Mavid | Bulk move lines | Bulk Section, Move to section, and a drag into a section (REG-571) | **Built** |
| 91 | Dyel | Keep the order lines were added in; never auto-sort | Positions are the order; sort by head was removed (REG-483) | **Built** |
| 92 · 93 · 99 | Dyel | Cost, markup and selling price editable per line, kept in step | Cost · Markup · Unit Price columns; Unit Price = Cost + Markup, editing one moves the other (REG-417) | **Built** |
| 95 | Dyel | A line from the price book keeps its selling price, cost and margin | My Items store cost and markup; a line opens with them (REG-415) | **Built** |
| 45 · 55 | Cloud Creation · lowest | Every selling price a multiple of S$5, no decimals | Round Prices rounds the whole quote to a step of 1 · 5 · 10 · 50 · 100 (REG-479) — a pass, not a rule | **Partly → P8** a studio rule that rounds on entry |
| 31 | Urban Home · blocker | Tiling as one selling line to the client, three sub-lines with their own cost and margin inside | Sections and sub-sections with per-line cost and margin exist (REG-558); a section prints its lines, never as one line | **Partly → P2** "Print as one line" on a section |
| 83 | Dyel | Lump-sum quoting | The client view can hide qty and unit price (REG-490); nothing prints one figure for a section or the whole quote | **Partly → P2** |
| 7 | Mavid · P4, in progress | Rebates reflected in the true margin, hidden from sales / IDs | The owner's margin strip is owners-only; no rebate anywhere | **Not built → P13** (the quote's side only; Finance keeps its own) |

### B · Sending, confirming, signing

| Row | Studio · priority | Request | 2.0 today | Verdict → proposal |
|---|---|---|---|---|
| 6 | Mavid · **P1** | Send for the client's confirmation first; add the T&Cs and send for signature after | Send moves Draft → Approved → Sent to Client (REG-404); the contract is made from a quote with the studio's T&Cs and signed by WhatsApp link (REG-534); there is no client-side "Confirm" without a signature | **Partly → P4** a confirmation step before the T&Cs |
| 52 | LA Design | No login to sign | The signing page needs no login; the NRIC is optional and kept masked (REG-563) | **Built** |
| 103 | Dyel | Real OTPs for clients | The prototype has no OTP step | **Platform** |
| 57 | Cove | The designer's signature imprinted on the quote | Draw / Type in the Signature section; the template's Signature block prints it (REG-421) | **Built** |
| 85 | Anchor | A signature field at the bottom of the quote | The Signature block, placed where the template wants it | **Built** |
| 102 | Dyel | WhatsApp opens when sending for signing | The signing link opens in WhatsApp on the press (REG-534) | **Built** |
| 111 | Mavid | Documents to sign after the quote is signed (HDB permits) | Contracts › New contract › Import from file, sent for signature at any time (REG-534) | **Built** |
| 63 | H Design | Multi-document signing | One link signs one document; several documents mean several links | **Partly → Q6** a signing bundle, if wanted |
| 38 | Mavid · on hold | Two owners' details on the quote | One client (the lead) and one NRIC on General Info; "Mr & Mrs Tan" is one name | **Not built → P5** a second client, if wanted |

### C · Revisions after approval

| Row | Studio · priority | Request | 2.0 today | Verdict → proposal |
|---|---|---|---|---|
| 30 | Urban Home · blocker | Revise the same quotation after approval — v1, v2 …; removed items struck through in red, added items marked new | Revise keeps v1 and starts v2 under the same number; Version History opens a kept version read-only (REG-564). The print shows no changes | **Partly → P1** the changes on the print |
| 112 | IDL | Update quotes after signing, sign again | Revise after Signed → v2 (Draft) → send → sign; v1 stays in Version History with its status | **Built** (+ P1 for the changes) |

### D · Numbering, entities, approvals, locks

| Row | Studio · priority | Request | 2.0 today | Verdict → proposal |
|---|---|---|---|---|
| 32 | Urban Home · blocker | Their own quotation number sequence | Settings › Quotes › Numbering: prefix · initials · year-month · next number · digits (REG-561) | **Built** |
| 12 | Next Phase · P2, in progress | Serial numbers for commercial and residential | One sequence per studio | **Partly → P3** two sequences |
| 26 | Dyel | Four business entities, one GST-registered | Issuing entities with bank + PayNow (REG-562); GST registration is studio-wide, not per entity | **Partly → P14** GST per entity |
| 11 | H Design · P2 | Backup approver | Owners and Admins approve; nobody else can (REG-501) | **Not built → P7** |
| 81 | Mavid | Lock the payment schedule (the owner fixes it; IDs cannot change it) | Every member edits the schedule; the Payments library holds the splits (REG-538) | **Not built → P6** |

### E · Templates and the printed document

| Row | Studio · priority | Request | 2.0 today | Verdict → proposal |
|---|---|---|---|---|
| 15 · 79 · 104–106 | Todz'terior, Mavid, Zemu, Spaces, Style ID | Replicate / create the studio's quote template | Company › Templates › Quotes: the three house styles, Recreate from my current quote, the template editor (REG-485…493, 569) | **Built** — an ops task done in the editor, no code |
| 44 | Mavid | One page to see and edit published templates | The Quotes gallery + its editor (REG-500) | **Built** |
| 94 · 96 | Dyel | Their own layout, spacing and typography; a full-width footer | The template editor's Page tab, header / footer canvases, Table look, Text styles (REG-569) | **Built** |
| 65 · 74 | Mavid, Hi Reno | Payment QR and bank details in the footer; logo; bank details | The Bank details block with the entity's PayNow QR (REG-562 · 563); the brand kit (REG-554) | **Built** |
| 67 | Mavid | Remove "Remarks (if any)" from every template | Any block is removed in the editor, with Undo (REG-542) | **Built** |
| 90 | Cove | The payment schedule on the quote document | The Payments block (REG-418, layouts table · list · cards) | **Built** |
| 98 | Dyel | No room sub-categories when adding from the price book | The template's grouping decides what prints; View by: None in the editor (REG-497) | **Built** |
| 97 | Dyel | The day name in the date — "Sunday, 7 February 2026" | The date field prints "17 Sep ’26" only | **Not built → P9** a date format choice |
| 100 | Dyel | Tighter rows, less space between the subject line and the table | Table look sets bands, headings, shading; row spacing is fixed; blank-space blocks set the gaps | **Partly → P10** row spacing |

### F · The price book

| Row | Studio · priority | Request | 2.0 today | Verdict → proposal |
|---|---|---|---|---|
| 14 · 75 | Todz'terior, IDL · P1/P2 | Add their price list | Lines paste from a spreadsheet into a quote (REG-476); My Items grows one line at a time (Save to My Items); "View Price Book" still answers coming soon | **Partly → P11** |
| 84 | Dyel | Browse lines from her master Excel | Paste into the quote works; no import into My Items | **Partly → P11** |
| 70 | Cove | Several packages in one quote | My Sections insert as many times as needed (REG-566) | **Built** |
| 39 · 108 | Mavid | Editing a package: lines not editable, adding a section wipes the old one | 1.0 bugs; in 2.0 a package is a saved section, which cannot be edited after saving — only re-saved from a quote | **1.0-only bug; the gap → P11** (edit a saved section) |
| 109 · 110 | Mavid, IDL | Vendors on products; search by vendor; the same product from several vendors | The column catalogue has Vendor/Sub but no line or price-book item carries a vendor | **Not built → P11** |

### G · Mobile, export, offline

| Row | Studio · priority | Request | 2.0 today | Verdict → proposal |
|---|---|---|---|---|
| 23 | LA Design · owner: Vicky | Edit a quote on a phone | The editor works at 390 with an interim table (nothing frozen, REG-417); the phone layout for lines waits on the owner's call | **Partly → P12** |
| 34 | Urban Home | Excel export of quotations | Export As: CSV · XLS · XLSX · PDF (REG-478) | **Built** |
| 19 | Gentlemen's Crafts · P4 | Offline editing | Not a prototype concern | **Platform** |

## 2. The builds, in the order the sheet's priorities suggest

Each one follows the house workflow: propose → the owner's go → build on `components/om/*` → a REG entry (what · why · source) → a Playwright probe on :3011 over the test DB at 1440 / 768 touch / 390 touch → screenshots banked under `design-source/verify/` → `npm run db:repair` + `db:baseline` when data changes.

| # | Build | Rows | Size |
|---|---|---|---|
| **P1** | **Changes on a revision's print.** `lib/quotes/diff.ts` compares the kept version's snapshot (`quote_versions`) with the current lines by id: removed · added · changed (qty, unit price, name). The renderer's slices print a removed line where it was, struck through in red, an added line with a "New" mark, a changed amount with the old figure struck beside it. Preview › What your client sees gains "Show changes from v1" (on for a revision; a per-quote client-view key); Version History reads "3 added · 1 removed · 2 changed". No new tables. Probe: revise OM-10008, remove one line and add one, preview both switch states. | 30, 112 | M |
| **P2** | **A section prints as one line.** Section row menu › "Print as one line": `quote_items.print_as = 'rollup'` on a group (the grid shows a tag "Prints as one line"); the renderer prints the section as a single line with its sum and skips its lines; the studio keeps every line's cost and margin inside. The Preview's client view gains "Amounts: per line · per section · total only" (`ClientView.amounts`): per section rolls every top-level section up; total only prints no line amounts, the totals card alone — the lump sum. Repair rule for the seeded quotes untouched. | 31, 83 | S–M |
| **P3** | **Two number sequences.** Settings › Quotes › Numbering: "Separate sequences for residential and commercial" — a second prefix and next number (`Numbering.commercial`); `nextNumber()` picks the sequence by the lead's property type (Commercial vs the residential families in `lib/quotes/refs.ts`); Project Ref # already carries the family. | 12 | S |
| **P4** | **Send for confirmation, then the T&Cs.** The editor's Send becomes a menu: "Send for confirmation" and "Send for signature". Confirmation = a client link (`/confirm/[quoteId]`, the signing page's shell without the signature fields: the quote's pages, a Confirm button, the name typed) → `confirmQuoteOnline` sets a new status **Confirmed** (`quotes.status` + `confirmed_at`, between Sent to Client and Signed; `quoteStatuses` lists it; the tab's status menu and pill follow), the lead's Activity gets its line, the WhatsApp draft carries the link (as REG-534's). After Confirmed the header offers "Add the T&Cs and send for signature", which opens the existing contract-from-quote picker (the studio's T&Cs template) and then the signing link. Repair rule + Activity branch. | 6 | M |
| **P5** | **A second client on the quote** (if wanted). General Info › "Add a second client" (name · NRIC); `quotes.client2_name` / `client2_nric`; fields `{client_2_name}` · `{client_2_nric}` for the Details block; the Signature block's client column lists both names; the signing page's name field accepts either. | 38 | S–M |
| **P6** | **Lock the payment schedule.** Settings › Quotes › "Payment schedule: Owners and Admins only" (settings key). Designers see the Payments card read-only — the presets ▾ disabled, no inline edit, no drag, a line "Set by the studio" — and Apply defaults skips it for them. | 81 | S |
| **P7** | **Backup approver.** Settings › Quotes › Approvals › "Backup approver" (a member picker; settings key `quoteBackupApprover`); the approval checks (`sendQuote`'s Approved step, the template review bar) accept the owner, admins or that member; the review bar names them. | 11 | S |
| **P8** | **Round on entry.** Settings › Quotes › "Round selling prices to the nearest S$ 1 · 5 · 10" — the Items grid rounds a unit price on commit (the markup absorbs it, as Round Prices does); the dialog stays for a whole-quote pass. | 45, 55 | S |
| **P9** | **Date formats.** The date field's inspector (and Page setup's default) offers "17 Sep ’26 · 17 September 2026 · Sunday, 17 September 2026" (`displayDateLong` exists); `lib/templates/fields.ts` formats `{date}` and `{valid_until}` by it. | 97 | S |
| **P10** | **Row spacing.** Table look gains "Rows: compact · normal · roomy" (`ItemsBlock.rowSpacing`) — cell padding and line height in the renderer; the sample thumbnails follow. | 100 | S |
| **P11** | **Company › Price book.** A Company section (REG-484's shell, `lib/company/sections.ts`): **My Items** on the listing's table model (name · description · kind · unit · cost · markup · unit price · category · **vendor** · used by), inline edit, Save to My Items from the grid as today, **Import from a spreadsheet** (the paste-mapping dialog of REG-476 writing to `price_book_items`), Vendor as a new column (`price_book_items.vendor`, migration) that the Add Item popover shows ("· by Hafary") and filters by — the same product from two vendors is two entries; **My Sections** as a gallery whose cards open a small editor (rename, reorder, remove a line, delete / restore) so a package can be maintained without re-saving it from a quote. "View Price Book" in the Add Item row opens the page. Repair rule for the seeded book; the Activity feed unchanged. | 14, 75, 84, 39, 108, 109, 110 | L |
| **P12** | **A phone layout for the lines** (owner: Vicky). The Items table at ≤767 as the card of REG-377 (thumb · name · status · qty × unit price · total · kebab), a tap opening a bottom sheet with the line's fields, the toolbar as one row (REG-354); the drag handle down the card's left edge (REG-571 works with a finger). Needs the owner's phone mock or canvas frames first (REG-417 left it for exactly this). | 23 | M |
| **P13** | **Rebate, owners only.** A Rebate column on the lines (`quote_items.rebate_minor`) that only Owners see (the column catalogue and the export hide it for others); the owner's margin strip counts it; nothing prints. Finance's rebate ledger stays Finance's. | 7 | S–M |
| **P14** | **GST per entity.** `IssuingEntity.gstRegistered` (Company › Profile), picking a non-registered entity switches the quote's GST off with a snackbar, the Bank details block prints the GST reg only when registered. | 26 | S |

Not proposed: 19 (offline), 103 (OTPs) — platform; 15 · 79 · 104–106 — ops in the editor.

## 3. Questions before building

1. **P4:** a new **Confirmed** status, or should the client's confirmation reuse Approved? (Approved is the studio's own approval today, REG-404 / 501.)
2. **P1:** show the changes on every revision's print by default, or off until switched on?
3. **P11:** the whole Price book page now, or first only Import + Vendor into the existing Add Item popover (a third of the work)?
4. **P12:** the phone layout waits on your mock or canvas frames — do you want it drawn first?
5. **P5:** the second client is "on hold" in the sheet — build or leave?
6. **P16 (row 63):** several documents under one signing link, or are separate links enough?

## 4. Recommendations (2026-09-23), and the parity rule

The owner's rule for all of it: built from the 2.0 experience, and nothing 1.0 already gives a studio may be lost. Every build below is additive — a new status, switch, column or page beside what exists; nothing is removed or re-shaped — and each ships with the existing suites rerun (round 1 · template editor · template defaults · Items UX · smoke).

**Parity first.** Nine rows are marked "Done - Deployed" in 1.0 and are only partly in 2.0 today, so they are not optional: lump sum (83 → P2), the payment lock (81 → P6), day-of-week dates (97 → P9), row spacing (100 → P10), package editing and vendors (108 · 109 → P11), multi-document signing (63 → P16 below). They go first. The Urban Home and Mavid blockers (P1 · P3 · P4) follow, then the new asks (P7 · P8 · P13 · P14 · P5), then the phone layout once drawn (P12).

1. **P4 — a new status, Confirmed.** Approved is the studio's own approval (Settings › Quotes: Required puts Sent for Approval → Approved before the client sees anything). Reusing it would tangle the two. Confirmed sits between Sent to Client and Signed, appears only once a confirmation link is used, and every existing path and status stays as it is.
2. **P1 — on by default for a revision.** A revised quote showing what changed is what Urban Home expects and what the client needs to read; a studio that wants a clean v2 turns "Show changes from v1" off on that quote. v1 prints unchanged; the internal copy always shows the changes.
3. **P11 — the whole Price book page, in two steps of one build.** Step one: the My Items table with Import from a spreadsheet and Vendor (what Todz'terior, IDL, Dyel and Mavid asked for); step two: saved sections that can be edited. Every piece reuses a house part (the listing's table model, the paste-mapping dialog, the library gallery), and the Add Item popover stays exactly as it is. "View Price Book" stops answering coming soon.
4. **P12 — draw it first.** The lines' phone card is a layout decision (which fields on the card, what the sheet holds), and the mock wins. I draft the frames in the mobile canvas's style from REG-377's card; the owner corrects; the build follows the same day. The desktop table is untouched.
5. **P5 — build the second client.** Small, additive (two optional fields that print only when filled), and co-owned HDB flats make two signatories the common case; the sheet's "on hold" was 1.0's capacity, not a product no.
6. **P16 — build the signing bundle.** 1.0 has multi-document signing live (row 63), so 2.0 must have it: on the Contracts tab, tick several documents › "Send together" → one WhatsApp link; the signing page shows the documents in order, one signature covers them, each document keeps its own signed copy. Separate links keep working. Size M.

Answered this way, the fourteen become fifteen builds in three groups: parity (P2 · P6 · P9 · P10 · P11 · P16), blockers (P1 · P3 · P4), new (P5 · P7 · P8 · P13 · P14), then P12 once drawn.

## 5. Built (2026-09-23 → 24)

The owner's go on 2026-09-23: "go ahead and fix all of them without any bugs". Every build is additive, on the house parts, with its REG entry, its probe and the older suites rerun.

| # | Build | REG | Probe |
|---|---|---|---|
| P1 | Changes on a revision's print — `lib/quotes/diff.ts`, "Show changes from version n−1" (on by default), struck / New / old-figure marks, Version History's counts | REG-595 | `verify-studio-requests-2.cjs` A |
| P2 | A section prints as one line (+ the client view's Amounts: every line · sections · total only) | REG-585 | `verify-studio-requests-1.cjs` 4 · 5 |
| P3 | Two number sequences (COM-…) | REG-586 | `verify-studio-requests-1.cjs` 3 |
| P4 | Send for confirmation → `/confirm/[quoteId]` → **Confirmed** → Send for signature | REG-587 | `verify-studio-requests-2.cjs` D |
| P5 | A second client on the quote | REG-588 | `verify-studio-requests-2.cjs` B |
| P6 | The payment lock | REG-589 | `verify-studio-requests-1.cjs` 7 |
| P7 | A backup approver | REG-590 | `verify-studio-requests-1.cjs` 7 |
| P8 | Round on entry | REG-584 | `verify-studio-requests-1.cjs` 2 |
| P9 | Dates print as the template says | REG-592 | `verify-studio-requests-1.cjs` 6 |
| P10 | Row spacing — already built (REG-575's Rows: compact · normal · roomy) | — | `verify-items-ux.cjs` |
| P11 | Company › Price book — My Items (New · Edit · Import from a spreadsheet · vendors · Deleted Items) · My Sections (Edit) · View Price Book · the popover's vendor | REG-594 | `verify-price-book.cjs` |
| P12 | The Items table on a phone — cards + a sheet per line | REG-597 | `verify-items-phone.cjs` |
| P13 | Rebate, owners only | REG-596 | `verify-studio-requests-2.cjs` C |
| P14 | GST per entity | REG-593 | `verify-studio-requests-1.cjs` 8 |
| P16 | Several documents under one signing link — Send together, `/sign/bundle/[id]` | REG-591 | `verify-studio-requests-2.cjs` E |

Open with the owner: P12's card and sheet are built from REG-377's card (the mock wins — a redraw in the mobile canvas is followed the same day); the confirmation page's and the drafts' copy is invented (REG-587 · 591) and reads as a proposal.
