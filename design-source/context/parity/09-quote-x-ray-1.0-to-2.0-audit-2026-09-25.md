# Quote X-Ray — 1.0 → 2.0 parity audit (2026-09-25)

**Written for:** the owner, to mark row by row; and the 1.0 developers, as the migration map for Quote X-Ray.

**The brief** (owner, 2026-09-24, night — the parity programme's fifth module, after Leads, quote templates, the quote editor and contracts): "Post doing all the contracts template and contracts editor start with x-ray, same here as well, you take a call i will go with your recommendations but make sure everything in intact with 2.0 experience … do it step by step and everything audit carefully and build in 2.0 experience only." Every call in §6 is therefore set *As recommended* (§9) and built in the rounds of §7. The owner's own X-Ray answers of 2026-09-18 (REG-529: a curated engine, not a model · two files in Upload mode · the 1.0 send dialog · a hard delete · "{Lead} · vs {Studio}" · minimal progress) stand; nothing here reverses them.

## 0.1 Sources

- **1.0** = `qanvast-id-tool` at `67f42e469`. Five readers read the code, the migrations and the docs whole; their inventories are banked beside this file under `quote-x-ray-1.0-inventory/` and are the references cited in the rows: **A** the flow and the screens (A-01…A-97) · **B** the engine (B-01…B-121) · **C** everything around it — routes, roles, sharing, outcomes, brand dossiers, docs (C-01…C-89) · **D** the data model and the port plan (D-01…D-236) · **E** what 2.0 has today (E-1…E-113).
- **2.0** = `openmaison-prototype` on `main` (8733d6d) plus the uncommitted rounds REG-616…635 (quote templates, the quote editor, contracts). X-Ray itself is as committed in `7f2ce14` (REG-529…531, 536).

## 0.2 Scope rules

- **In scope:** everything a studio does to compare its quote with another studio's — the ways in, the setup, reading the other quote, the engine (matching, the real difference, the points), the key points on brands and materials, the record, sending to the client, history, delete, who may, and the data behind it.
- **Done already (cited, not re-audited):** Upload a quote in the Create Quote window (quote editor audit, REG-627), which shares X-Ray's reader; the WhatsApp hand-off rule (contracts, REG-534).
- **Later modules (their own audits):** Maison AI (1.0 mAIson's quote benchmarker), Meetings (1.0 Meeting Copilot's competitor analyser), the homeowner portal, Finance (the PO compare).
- **Not for a prototype:** a model reading PDFs and photos, web brand research, market rate tables, per-studio AI cost and limits — listed as *Platform* with the stand-in 2.0 keeps.

## 0.3 Status legend

| Status | Meaning |
|---|---|
| **Built** | 2.0 has it, in its own shape. |
| **Partial** | 2.0 has part of it; the gap is named. |
| **Missing** | 1.0 has it, 2.0 has nothing; a proposal follows. |
| **Mismatch** | both have it and they disagree; a question decides (all collected in §2). |
| **Later** | another module's internals. |
| **Platform** | live infrastructure; 2.0 keeps a stand-in. |
| **Dead** | code no 1.0 user can reach; not ported unless asked. |
| **2.0 only** | no 1.0 counterpart; kept and listed so the devs know it is new. |

## 0.4 How to mark

Answer in the decisions doc — a call per question — or write **go** · **hold** · **no** in the *Mark* column here. Rows marked go are built in the rounds of §7, each logged in `REGISTER.md` as `user-directed` with "1.0 · <inventory row>" as the source, verified on :3011 and banked under `design-source/verify/x-ray-parity/`.

Reading order: **§1 Definitions** first — 1.0 has **two generations** of X-Ray, and only the second (the *verdict*, since 2026-08-14) is still reachable; every later row compares 2.0 with that one.

## 1. Definitions — the same thing under two names

| # | Concept | 1.0 | 2.0 | Verdict · question |
|---|---|---|---|---|
| DEF-01 | **What a comparison is** | A `quote_xrays` row. Since 2026-08-14 a *verdict*: your quote against one other studio's → a real-gap headline, at most three points and a WhatsApp draft. The four older objectives (Gap Finder · Sales Justifier · Market Intel · Package Ladder) and the combined run still answer the API, open only by `?xrayId=` (A-30, B-01, C-01, D-02). | A `quote_comparisons` row — one reading of two quotes, kept whole (E-62, D-40). | **Built** — 1.0's verdict is 2.0's comparison. **Q-01** leaves the retired objectives behind. |
| DEF-02 | **Reading the other quote** | A model reads a PDF's text layer (≤ 40 pages) or the whole scan as an image; CSV; an XLSX's first sheet. With no key every file becomes the same sample quote (B-10…B-16, A-26). | The file's **name** matched against the three reference quotes the owner shared; anything else is "one we couldn't read" (E-25). | **Platform** for PDFs and photos. **Q-10** reads spreadsheets for real, as Upload a quote does. |
| DEF-03 | **Your side** | The lead's chosen quote (else primary, else newest); omission lines out; FOC / Inclusive markers kept; its money is the **grand total** — GST in, discount off — beside line totals that have neither (B-18…B-20, B-37). | The chosen quote's items that are not Declined, in insertion order; the sum of line totals before discounts and GST; lines that print a word counted at full price (E-27, E-90, E-91, E-104). | **Mismatch.** **Q-02**. |
| DEF-04 | **A match** | Same canonical trade (16 Singapore trade tokens) and a word overlap ≥ 0.6 of the smaller set, greedy; then a model groups leftover lines of one trade (B-23…B-33). | ≥ 2 shared words and ≥ 0.5 of the shorter list, 39 stop words, strongest pairs first, one-to-one, across trades; no plurals (E-29). | **Partial.** **Q-03** · **Q-04** · **Q-14**. |
| DEF-05 | **The real difference** | raw gap − the work they leave out (at our prices) + the work we leave out (at theirs); negative = ours less like-for-like (B-36). | (yours − yours-only) − (theirs − theirs-only) (E-31, D-41). | **Built** — the same arithmetic, the same sign (§5.1). |
| DEF-06 | **A point** | A code-built fact from seven sources, ranked by weight; a model picks ≤ 3 and phrases them; the evidence is copied from the fact; a lone medium-confidence point is dropped (B-38…B-47). | A templated sentence from three sources (two missing lines, one low price, the unpriced count), an evidence line, sometimes a question (E-33). | **Partial.** **Q-05**. |
| DEF-07 | **Key points (brands)** | A model lists the brands per line; each brand is researched on the web and cached for every studio for 90 days (B-76…B-86, C-59…C-70). | Nine curated notes matched by pattern on both sides (E-35, E-36). | **Platform** stand-in kept. **Q-09** fixes what the notes say. |
| DEF-08 | **The client's message** | A draft of ≤ 1,200 characters that never names the other studio; opener · points · the like-for-like line · closer; not kept; WhatsApp's own picker (A-39, A-40, B-50). | A draft naming the other studio in every point; opener · points · sign-off; not kept; the lead's chat (E-37, E-52…E-55). | **Partial.** **Q-07** · **Q-08** · **Q-16**. |
| DEF-09 | **History** | The studio's five newest verdicts; "+n older" can't be opened (A-54, A-55). | The studio's 20 newest; the lead's page filters them in the browser (E-56, E-58). | **Partial.** **Q-13** · **Q-19**. |
| DEF-10 | **A reading over time** | A snapshot; only the legacy views' un-merge edits the stored matrix, and the stored numbers never follow (C-42, B-34). | A snapshot; nothing says when the quote moved on (E-40, E-92). | **Partial.** **Q-14** · **Q-15**. |

## 2. Mismatches — both have it, they disagree

| # | Topic | 1.0 | 2.0 | Question |
|---|---|---|---|---|
| MM-01 | Your total | the grand total, GST in, beside line totals without it | line totals before discounts and GST, not said anywhere | Q-02 |
| MM-02 | A line that prints FOC / Inclusive | covered, its money as the parser read it | counted at full price as priced work | Q-02 |
| MM-03 | "Below market" | a platform rate band (with false positives, §8.1) | under 60 % of **our** price, labelled market | Q-04 · Q-06 |
| MM-04 | Naming the other studio to the client | never in the draft (the prompt's rule) | in every point and the draft | Q-07 |
| MM-05 | Brands with nothing to raise | "We also checked … — users report no real problems." | "… — both quotes name it", printed for brands only theirs names | Q-09 |
| MM-06 | Whose WhatsApp chat | WhatsApp's picker, never the lead's number (deliberate) | the lead's number | Q-16 |
| MM-07 | Upload mode and the lead | a lead picked earlier silently binds the run | on a lead's page the run drops the lead | Q-11 |
| MM-08 | Whose comparisons you see | studio-wide, whatever the designer's leads | studio-wide, though every other 2.0 surface applies Who sees leads (REG-603) | Q-19 |
| MM-09 | When the lead goes | `lead_id` set null; archived leads unguarded | a deleted lead's comparisons stay live; Delete forever leaves them | Q-21 |

## 3. Feature matrix

Columns: the 1.0 feature (inventory row) · what 1.0 does · what 2.0 has (inventory row) · status · proposal or question · mark.

### 3.1 Ways in, the page and the way back

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| XE-01 | Tools entry (A-01, A-04, C-23) | The desktop sidebar's Tools group only; not the topbar grid, not the phone nav. | The rail's Tools tile and the phone dock's Tools sheet (E-2). | Built | 2.0 fuller. | |
| XE-02 | "Beat this quote" in the lead drawer (A-02, C-48) | A link with `?leadId=`, shown when the drawer's quote has lines or the lead signed; the only way in on a phone. | The lead's Quote X-Ray quick link, desktop and tablet (E-3). | Partial | The phone lead page has none (E-81): **Q-12**. | |
| XE-03 | From a quote (A-04) | No X-Ray action on a quote. | The quote editor's kebab, *Compare with another quote* (E-4). | 2.0 only | **Q-12** adds it to the quote rows of the Quotes tab and Tools › Quotes. | |
| XE-04 | Deep links (A-03) | `?leadId=` and `?xrayId=`; a run never writes its id, so a reload lands on a blank setup. | Every reading has its own address; `?lead=`, `?quote=`, `?from=` (E-1). | Built | 2.0 fuller. | |
| XE-05 | The page's frame (A-06) | A sticky header; no ghost; no breadcrumb. | L1 from Tools, L2 under a lead (E-9, E-10); the ghosts are the Leads listing's and Lead Details' (E-8, E-105). | Partial | Own ghosts (§8.2). | |
| XE-06 | The way back (A-07, A-31) | Every way back wipes the setup, the lead included. | `?from=` Back, but Recent, New comparison and Activity drop the lead's scope; the crumb never names the lead (E-84, E-85). | Partial | **Q-12**. | |
| XE-07 | Gates (A-05, C-19…C-22) | Owners, admins and designers open the page; nothing inside is role-gated; the APIs check the session only. | No gate (E-72). | Partial | **Q-19** · **Q-20**. | |
| XE-08 | Phone and tablet (A-92) | No entry below 1024 but the drawer link; one ≤ 672 column. | The dock's Tools; the record's column; the items as cards (E-78…E-83). | Built | The lead page's way in (**Q-12**); the FAB clearance (§8.2). | |

### 3.2 The setup

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| XS-01 | The explainer (A-08) | A card, dismissed for good per browser. | The intro card, dismissed per browser (E-11). | Built | Its copy follows Q-05 and Q-06. | |
| XS-02 | Two starts (A-09) | *For a lead* · *Upload 2 quotes*. | *For a lead* · *Upload two quotes* (E-12). | Built | | |
| XS-03 | The lead picker (A-10, C-49) | Searchable; the viewer's own leads; closed leads out. | Every live lead of the studio; no search; picked back by its label, so two leads with one name resolve to the first (E-13). | Partial | **Q-11** (finds as you type; picked by id) · **Q-19** (the viewer's leads). | |
| XS-04 | The lead's quotes (A-11…A-13) | Primary first; one quote → a "Defending" chip; several → radio cards, no default. | Every live quote as a choice card, newest first; no preselect; an empty quote accepted (E-15). | Partial | **Q-11**. | |
| XS-05 | No quote on the lead (A-14, C-50) | Upload your quote instead, still on the lead; the bounce sticks to every later lead (§8.1). | "create one first" → the Quotes tab, not the Create Quote window (E-16). | Partial | **Q-11**. | |
| XS-06 | Upload mode and the lead (A-17, C-51) | A lead picked earlier silently binds the run. | On a lead's page the run is stored without the lead (E-86). | Mismatch | **Q-11**. | |
| XS-07 | The dropzone (A-18, A-25, C-28) | Click or drop; PDF, PNG, JPG, CSV, XLSX; 10 MB; the drop skips the filter. | The Move stage dropzone; any drop taken; the stock thumbnail and a PDF glyph for every file; no size check (E-18, E-109). | Partial | **Q-10**. | |
| XS-08 | Compare and its hint (A-19) | Enabled once both sides are in; a hint names the missing piece. | Same (E-20). | Built | | |
| XS-09 | Progress (A-28) | A timed bar and four stages; "30–60 seconds". | A timed card, four steps, ~3 s (E-21). | Built | The owner's call (2026-09-18). | |
| XS-10 | Errors (A-23, A-24) | Toasts naming the side and the file. | An unreadable file under its dropzone; a snackbar otherwise (E-22). | Built | **Q-10** says it on pick. | |

### 3.3 Reading the files

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| XR-01 | Reading a PDF or a photo (A-22, B-10…B-16) | A model reads the text layer or the scan. | The name matched against the three reference quotes (E-25). | Platform | Stand-in kept. | |
| XR-02 | Spreadsheets (A-22, B-11) | XLSX's first sheet as CSV, then the model; CSV as text. | Promised by the dropzone, never read (E-96). | Missing | **Q-10** — Upload a quote's `readRows` (REG-627). | |
| XR-03 | Names misread (—) | — | Substrings: "floor plan.pdf" reads as Flo Design, "information.pdf" as Cove (E-95). | 2.0 only | §8.2 — whole words. | |
| XR-04 | Sizes and types (A-18, A-25) | 10 MB advertised; a 4.5 MB platform ceiling below it (§8.1). | None (E-109). | Missing | **Q-10**. | |
| XR-05 | The other studio's name (A-20, B-21) | The letterhead's vendor, else "The other quote". | The reference's studio; a sheet has none (E-24). | Built | A sheet is "The other studio" unless its file name says (**Q-10**). | |
| XR-06 | Currency (A-29, B-22) | A keyword sniff; another currency is refused. | S$ only (D-43). | Platform | **Q-23**. | |

### 3.4 The engine — your side, matching and the numbers

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| XM-01 | Your quote from the lead (A-15, B-18…B-20) | Chosen, else primary, else newest; omission lines out; FOC / Inclusive kept. | The chosen quote's items not Declined; insertion order; lines that print a word at full price; a declined section's lines kept (E-27, E-91, E-104). | Mismatch | **Q-02**. | |
| XM-02 | The totals' basis (B-20, B-37) | Grand totals against line sums — mixed (§8.1). | Line sums on both sides, never said (E-31, E-90). | Partial | **Q-02**. | |
| XM-03 | Trades (B-23…B-25) | 16 trade tokens gate every match; a room heading never meets a trade heading. | No gate; trade and room carried (E-29). | Built | 2.0's own; the trade breaks ties (**Q-03**). | |
| XM-04 | Word matching (B-26, B-27, B-29) | Overlap of the smaller set; no stems; "wall tiles" joins "floor tiles". | Two shared words, stop words, one-to-one; "cabinet" ≠ "cabinets" (E-29, E-98). | Partial | **Q-03**. | |
| XM-05 | The model's merge pass (B-30…B-33) | Groups leftover lines of one trade; off above 80; chained merges drop a line (§8.1). | — (a curated engine, the owner's call) | Platform | **Q-03** (synonyms) and **Q-14** (corrections) stand in. | |
| XM-06 | One line against several (B-29) | Never: per-room lines against one lump sum leave rows "missing". | Never (E-111). | Missing | **Q-03**. | |
| XM-07 | Un-merge (A-69, B-34, C-13) | Legacy views only; the stored numbers never follow. | — | Missing | **Q-14**. | |
| XM-08 | The real difference (B-36) | raw − theirs missing + ours missing. | The same (E-31). | Built | §5.1. | |
| XM-09 | Lines with no price (A-35, B-36) | One-sided and unpriced: counted, never valued, never named. | "No price given" rows, counted and listed (E-30). | Built | **Q-02** adds your own words. | |
| XM-10 | Quantities and rates (B-65) | Totals compared, never rates. | Carried, never compared (E-39, E-111). | Missing | **Q-04**. | |
| XM-11 | Signs and zeros (A-33, B-49) | "0.00 lower"; "and covers more" unchecked. | "S$ -0.00", "S$ 0.00 more"; the table and the tile use opposite signs (E-93, E-94). | Partial | §8.2. | |

### 3.5 Say this

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| XP-01 | The fact pool (B-38) | Seven sources, capped, weighted; ≤ 3 chosen. | Three sources (E-33). | Partial | **Q-05**. | |
| XP-02 | Work they leave out (B-39) | Ours, valued at our line. | The two biggest (E-33). | Built | Its words (**Q-07**). | |
| XP-03 | Below market (B-40, B-55…B-63) | Their rate ≥ 20 % under a platform band. | Their line under 60 % of ours, labelled market (E-33, E-99). | Mismatch | **Q-04** · **Q-06**. | |
| XP-04 | The same item for less in ours (B-41, B-65) | A shared line where ours is lower by ≥ 2 %. | — | Missing | **Q-05**. | |
| XP-05 | Their arithmetic (B-42, B-64) | Stated total ≠ rate × quantity. | — | Platform | Needs a document's stated totals; not in a stand-in reading. | |
| XP-06 | Materials (B-43, B-68…B-75) | Sixteen curated weaknesses, context gates, the glass-house rule, every one a question. | — | Missing | **Q-05** (§5.4). | |
| XP-07 | Brands as points (B-44, B-45) | Your named brand; their different brand. | Never (E-33). | Missing | **Q-05**. | |
| XP-08 | A lone question-only point (B-47) | Dropped. | — | Missing | **Q-05**. | |
| XP-09 | Say it as a question (A-37) | A chip on medium points. | A toggle on two kinds, screen only (E-34, E-97). | Partial | **Q-08**. | |
| XP-10 | No point (A-38) | "No single line stood out — lean on the numbers above …" | "The two quotes line up — nothing to flag." (E-43). | Built | | |
| XP-11 | Names in the sentences (B-51, E-100) | The fallback names the competitor against its own rule. | Every sentence names the other studio; "tV console", "kDK" (E-33, E-100). | Mismatch | **Q-07**. | |

### 3.6 Key points — brands

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| XK-01 | Brand reading (B-76) | A model lists brands per line, never checked. | The curated notes' patterns (E-35, E-36). | Platform | Stand-in kept. | |
| XK-02 | Brand research (A-42, B-81…B-86, C-59…C-70) | A web scan per brand, a platform cache, an admin page, an hourly sweep, a kill switch. | Nine curated notes (E-35). | Platform | **Q-23**. | |
| XK-03 | Your advantage (A-43, B-78) | A brand only yours names; "the other quote doesn't say what brand". | The same sentence, never checked against their trade (E-36). | Partial | **Q-09**. | |
| XK-04 | Issues in their quote (A-44, B-85) | A finding per negative claim, its impact and a question. | A risk card per note with an impact (E-44). | Built | | |
| XK-05 | Checked, nothing found (A-45) | "We also checked … — users report no real problems." | "… — both quotes name it", for brands only theirs names (E-88). | Mismatch | **Q-09**. | |
| XK-06 | Sources (A-43, A-44) | Links to the cited pages. | Domains in the link colour with an open glyph that open nothing (E-44, E-99). | Mismatch | **Q-09**. | |
| XK-07 | Brands in Upload mode (—) | Both sides read. | Your file's brand column dropped (E-89). | 2.0 only | **Q-09**. | |

### 3.7 The record

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| XC-01 | Which view a row gets (A-30) | Loading · not found · a verdict · a legacy frame. | One record page; a gone id 404s (E-1, E-40). | Built | | |
| XC-02 | The caption and the one-liner (A-32, A-33) | Both sides named; an AI line or three templated ones. | The same caption; four templated headlines (E-32, E-42). | Built | Zero cases (§8.2). | |
| XC-03 | Three tiles (A-34) | Compact amounts; the difference green when ours is less. | Its own tile, primary always (E-42, E-106). | Partial | `StatTile` (§8.2); **Q-02**'s basis line. | |
| XC-04 | On paper (A-35) | The on-paper line. | The footnote (E-32). | Built | | |
| XC-05 | The item list (A-46…A-49) | A disclosure: two gap lists and a variance table with AI chips; their-only rows dropped from the table. | The listing-model table, every row, a status band, Column settings (E-45…E-49). | Built | 2.0 fuller; three pins (§8.2). | |
| XC-06 | Fix in Quote Digitizer (A-50, C-53) | Lands on an empty picker. | No way to the quote (E-51). | Missing | **Q-17**. | |
| XC-07 | Who ran it (A-31) | Nothing shown. | Loaded, not shown (E-51, E-108). | Partial | **Q-17**. | |
| XC-08 | A reading goes stale (C-42) | A snapshot, no warning, no re-run. | The same (E-92). | Missing | **Q-15**. | |
| XC-09 | Print and PDF (A-52, A-53, C-39) | A verdict prints blank; no PDF. | None (E-51). | Built | **Q-24**. | |

### 3.8 Sending to the client

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| XW-01 | The dialog (A-39) | Editable, Reset to draft, a count, Copy, Open WhatsApp. | The same on the house Dialog (E-52). | Built | | |
| XW-02 | What the draft says (B-47, B-50) | Opener · points · the like-for-like line · closer; never the other studio. | Opener · points · sign-off; names the other studio (E-37). | Partial | **Q-07** · **Q-08**. | |
| XW-03 | Whose chat (A-40) | WhatsApp's picker. | The lead's number (`65` + digits), else the picker (E-54). | Mismatch | **Q-16**. | |
| XW-04 | Edits kept (A-39) | Never. | Never (E-52). | Missing | **Q-16**. | |
| XW-05 | A trace of the send (A-40, C-38) | Nothing. | Nothing (E-55). | Missing | **Q-16**. | |

### 3.9 History, delete and who may

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| XH-01 | Recent comparisons (A-54…A-56) | The five newest; "+n older" can't be opened. | The 20 newest; the lead's page filters them (E-56…E-59, E-87). | Partial | **Q-13**. | |
| XH-02 | A row (A-55) | "vs {competitor}" and a date. | "{Lead} · vs {Studio}", the date, the quote (E-57). | Built | The owner's naming (2026-09-18). | |
| XH-03 | Delete (A-57, C-40) | A browser confirm; hard; anyone; no trace. | The house confirm; hard; anyone; no trace (E-60, E-103). | Partial | **Q-20**. | |
| XH-04 | Whose comparisons (A-59, C-18) | Studio-wide. | Studio-wide (E-73, E-102). | Mismatch | **Q-19**. | |
| XH-05 | A lead's history, search (A-58, C-52) | None. | The lead's page lists its own; no search (E-58, E-61). | Partial | **Q-13**. | |
| XH-06 | The lead goes (C-40, C-54) | `lead_id` set null; archived leads unguarded. | A deleted lead's comparisons stay live (E-110). | Mismatch | **Q-21**. | |
| XH-07 | The quote goes (—) | — | Comparisons stay; the repair check calls a soft-deleted quote gone (E-69, D-43). | Partial | **Q-21**. | |
| XH-08 | The lead's Activity (C-72) | Nothing. | A row per run; nothing for a delete or a send (E-75, E-76). | Partial | **Q-16** · **Q-20**. | |
| XH-09 | Notifications (C-71) | None. | None (E-77). | Built | None in either; kept. | |
| XH-10 | The run's checks (C-17, B-113) | `lead_id` written unchecked; any quote status. | No check that the quote is live or on the lead (E-101). | Partial | **Q-19**. | |

### 3.10 What 1.0 retired

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| XL-01 | Four objectives and the combined run (A-61…A-83, B-03…B-05, B-87…B-99) | Reachable only by `?xrayId=` since 2026-08-14. | — | Dead | **Q-01**. | |
| XL-02 | The public share page (A-84…A-89, C-31…C-37) | Legacy rows only, 24 h; the API returns the whole row (§8.1). | — | Dead | **Q-01** · **Q-24**. | |
| XL-03 | PDF download (A-83, B-104, B-105) | Legacy rows only; S$ for every currency. | — | Dead | **Q-24**. | |
| XL-04 | Win / loss (A-90, B-111, C-44, C-45) | Built 2026-07-27, removed 2026-08-14; the columns remain. | — | Dead | **Q-22**. | |
| XL-05 | Status, attach a lead (A-91, C-12, C-41, C-47) | Routes with no caller. | — | Dead | | |

### 3.11 The platform's

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| XF-01 | Market rates (B-54…B-61) | 111 seeded bands (SG 32), crowd rates. | — | Platform | **Q-23**. | |
| XF-02 | Brand dossiers, the admin page, the sweep, the kill switch (C-59…C-70) | Platform-wide. | — | Platform | **Q-23**. | |
| XF-03 | Market observations (B-101, C-75) | Both quotes' lines copied into a cross-studio table nothing reads. | — | Platform | Not ported (§8.1). | |
| XF-04 | Telemetry, cost and limits (A-93, B-102, B-112, C-25…C-27, C-73, C-74) | One success event; no cost per studio; no limits. | — | Platform | | |
| XF-05 | No key (A-26, B-06, C-29) | Fixtures saved as real runs. | The curated readings are the product (D-233). | Platform | | |

### 3.12 Touchpoints (other audits)

| ID | Touchpoint | Where it goes |
|---|---|---|
| XZ-01 | The lead's Lost reason asks for the competitor without the lead's X-Ray, which holds it (C-46) | **Q-18** — here |
| XZ-02 | Meeting Copilot's competitor-quote analyser (A-96, C-76) | Meetings (held, REG-552) |
| XZ-03 | mAIson's quote benchmarker (C-77) | Maison AI |
| XZ-04 | The PO's quote compare (C-78) | Finance |
| XZ-05 | The homeowner portal (C-79) | The portal |
| XZ-06 | Upload a quote reads the same references (REG-627) | Shares **Q-10**'s reader and §8.2's whole-word names |

## 4. Data model — the port plan

The column-level work is inventory **D** (`quote-x-ray-1.0-inventory/D-data-model.md`): the table map and column diffs (§4), the statuses and units (§4.3, §4.4), the port plan D-170…D-236. The headline:

| 1.0 | 2.0 | Verdict |
|---|---|---|
| `quote_xrays` verdict rows | `quote_comparisons` — one row per reading | A verdict lands as one row, never re-run (D-170, D-210…D-225). |
| legacy and combined rows | — | Not ported; counted per lead in the port log (D-190). |
| `inputs` (both parsed quotes) | `quote_comparisons.inputs_json` — both sides' lines as read | Round 1 (D-175). The competitor's homeowner name and signatory are not carried. |
| `match_result` | the rows inside `result_json`, and `overrides_json` for a studio's corrections | 2.0 has no model match (D-176 not needed); round 3 adds the corrections. |
| `ai_synthesis` (verdict) | `result_json` — figures, headline, points, message | D-214…D-217; the point kinds widened (D-178); `engine` says which engine wrote it (D-177). |
| `brand_ammo` | `result_json.brands` | Clean brands land as tone `checked` (D-180); sources stay domains (D-181 not needed). |
| `share_*`, `status`, `outcome*` | — | Not ported (D-194, D-195). |
| `brand_dossiers`, `market_quote_observations`, `platform_market_rates`, the kill switch, `usage_events` | — | The platform's (D-196…D-201). |

## 5. Logic to carry over verbatim (for the devs, independent of UI)

1. **The real difference** — B-36: `realGap = rawGap − missing + ownMissing` is 2.0's `(yours − yoursOnly) − (theirs − theirsOnly)`; negative = ours less like-for-like; on paper = −raw. 2.0 keeps both sides on one basis — line totals before discounts and GST — and says so.
2. **Covered, not valued** — B-36: a line present on both sides is covered whatever its price type; a one-sided line with no price is counted, never valued.
3. **The fact pool** — B-38…B-45: work they leave out weighs its value; the same item for less weighs the saving; a low rate weighs the gap at their quantity; a material weighs max(line total, S$1,000); your named brand S$600; their brand S$250; the three heaviest are said; a lone question-only point is not said (B-47).
4. **The material table** — B-68…B-75, `material-facts.ts`: the sixteen weaknesses with their aliases, requirements, wet-area / heat-area gates, better alternatives and questions, and the glass-house rule (never when your quote uses the same material). 2.0 carries two fixes: a worktop needs a worktop word (a bare "top" beside "cabinet" is a cabinet), and the glass-house test reads the same use in your quote (§8.1).
5. **The client never reads the other studio's name** — the verdict prompt's rule (B-46); 1.0's own fallback broke it (B-51).
6. **Parity tolerance** — B-65: two prices within 2 % are the same price.

## 6. Questions before anything is built

The owner delegated every call on 2026-09-24 (§9). Each still carries its recommendation, so it can be overridden in the decisions doc.

| # | Question | Recommendation | Rows |
|---|---|---|---|
| Q-01 | Keep 2.0's one comparison — your quote against one other studio's — and leave 1.0's four retired objectives, the combined run, their PDF and their public page behind? | Yes. | DEF-01 · XL-01…XL-03 |
| Q-02 | "Yours" is what the quote counts: its subtotal as the quote editor prints it — lines that print a word (FOC · Inclusive · KIV · By client · Packaged), optional lines and a declined section's lines leave it — with your rows in the quote's own order. The summary says the basis ("line totals before discounts and GST") and shows the quote's own total beside it. A line of yours that prints a word shows its word and counts as covered, with no price. | Yes. | DEF-03 · MM-01 · MM-02 · XM-01 · XM-02 |
| Q-03 | Matching: singular and plural read alike, a short list of trade words reads alike (hack · hacking · demolish · dismantle; cabinet · cabinetry; worktop · countertop …), the trade breaks ties, and one line may stand against several on the other side — their per-room lines against your one lump sum, and the reverse. | Yes. | DEF-04 · XM-04 · XM-06 |
| Q-04 | A pair's price: when both lines give a quantity in the same unit, the rate is compared, not the lump sum, and the row shows both quantities when they differ. | Yes. | XM-10 · XP-03 |
| Q-05 | Say this uses 1.0's kinds of point: work their quote leaves out · the same item for less in ours · a rate well below ours · lines with no price · a material worth a question (1.0's sixteen, with the glass-house rule) · a brand worth a question. Ranked by 1.0's weights, at most three; a question-only point never stands alone. | Yes. | DEF-06 · XP-01 · XP-04 · XP-06…XP-08 |
| Q-06 | "Priced below market" says what it is — *Priced well below ours* — since 2.0 holds no market rates (Q-23). | Yes. | MM-03 · XP-03 |
| Q-07 | What the client reads never names the other studio (1.0's rule): Say this and the draft say "the other quote"; the evidence under each point, which only you read, keeps the name. Names keep their capitals ("KDK", "TV console") and are cut at a word. | Yes. | MM-04 · XP-11 · XW-02 |
| Q-08 | The draft follows the screen: a point switched to its question goes out as the question; a reading with no point sends the like-for-like line (1.0's) instead of an empty list. | Yes. | XP-09 · XW-02 |
| Q-09 | Key points: a brand only the other quote names, with nothing to raise, joins one line — "We also checked … in their quote — nothing to flag"; a brand both quotes name is left out (as 1.0); your advantage says what their quote names in that trade, if anything; sources read as sources, not links; Upload two quotes keeps your file's brands. | Yes. | MM-05 · XK-03 · XK-05…XK-07 |
| Q-10 | Reading the files: a spreadsheet (XLSX · CSV) is read for real, as Upload a quote reads it; a PDF or a photo stays one of the three reference quotes by name (the platform reads the rest). A file is read when it is picked — an unreadable one says so at once, a readable one shows what was read (studio · lines · total). The drop takes only the listed types, up to 10 MB. | Yes. | DEF-02 · XS-07 · XR-02 · XR-04 · XR-05 |
| Q-11 | Setup: the lead list finds as you type and picks by id; a lead with one quote preselects it; a quote with no priced lines can't be chosen; a lead with no quote offers *Create a quote* (the Create Quote window) and *Upload your quote instead*; on a lead's page *Upload two quotes* stays with the lead. | Yes. | MM-07 · XS-03…XS-06 |
| Q-12 | Ways in and back: the record's crumb names the lead; Back, *New comparison* and the Recent rows keep the lead's scope; a record opened from Activity returns to Activity; *Compare with another quote* joins the quote rows' menus in the Quotes tab and Tools › Quotes — which also gives the phone a way in from a lead. | Yes. | XE-02 · XE-03 · XE-06 |
| Q-13 | History: Recent lists every comparison you can see, newest first, with a search once the list is long; a lead's page lists all of that lead's. | Yes. | DEF-09 · XH-01 · XH-05 |
| Q-14 | Correct a match on the record: *Not the same item* splits a pair; *Same item as…* pairs a line with one of the other side's unmatched lines. The figures, the points and the draft follow at once, with Undo, and the record says it was corrected and by whom. | Yes. | DEF-10 · XM-05 · XM-07 |
| Q-15 | A reading keeps both sides' lines; when your quote changes after it, the record says so, and *Run again* makes a new reading of the quote as it is now against the same other quote (the old reading stays, its corrections carried where the lines still exist). | Yes. | DEF-10 · XC-08 |
| Q-16 | Sending is kept: the text you last sent opens next time (Reset to draft brings the draft back); the record and Recent show "Sent {date}"; the lead's Activity logs it. WhatsApp opens the lead's chat when the lead's number is a valid SG number (2.0's rule for every hand-off, REG-534), else WhatsApp's own picker. | Yes. | MM-06 · XW-03…XW-05 · XH-08 |
| Q-17 | The record names its quote (a link to the editor) and who ran it; its kebab offers *Run again*, *Open the quote* and *Delete*. | Yes. | XC-06 · XC-07 |
| Q-18 | The Lost dialog's *Competitor* starts with the other studio of the lead's latest comparison, editable. | Yes. | XZ-01 |
| Q-19 | Who sees: comparisons follow Who sees leads — a lead you can't open, its quotes and its comparisons don't show on X-Ray and its record answers as the lead does; a run checks the quote is live and belongs to the lead; a comparison with no lead is the studio's. The lead list stops carrying phone numbers to the browser. | Yes. | MM-08 · XE-07 · XH-04 · XH-10 |
| Q-20 | Delete stays permanent (the owner's call, 2026-09-18), allowed to the comparison's maker, an Owner or an Admin, and logged on the lead's Activity. | Yes. | XE-07 · XH-03 · XH-08 |
| Q-21 | A deleted lead's comparisons leave Recent and come back with the lead; *Delete forever* removes them. A deleted quote's comparisons stay and say the quote was deleted. | Yes. | MM-09 · XH-06 · XH-07 |
| Q-22 | Win / loss per comparison (1.0 built it in 2026-07 and removed it in 2026-08)? | No — the lead's Won / Lost carries the outcome, and Q-18 ties Lost to the comparison. | XL-04 |
| Q-23 | Market rates, web brand research (the dossiers, their admin page, the hourly sweep, the kill switch), the market-data feed, other currencies? | No — the platform's; 2.0 keeps the curated notes and S$. | XR-06 · XK-02 · XF-01…XF-03 |
| Q-24 | A PDF or a public link for a comparison? | No — 1.0 retired both for this flow; the client gets the message. | XC-09 · XL-02 · XL-03 |
| Q-25 | X-Ray settings (a studio's own brand notes, its reference studios)? | No — nothing in 1.0 to carry; later if the studios ask. | E-77 |

## 7. Build rounds

Nothing existing is removed. Each round ends with tsc + eslint, a Playwright probe at 1440 (+ 390 / 768 touch where the round touches them, and the 320 overflow gate), banked screenshots, register rows, repair rules and the baseline when data changes.

| Round | Builds | Questions | Size |
|---|---|---|---|
| **1 · The reading tells the truth** | Yours = the quote's count, in its order, the basis said; plurals, trade words, one line against several; rates on pairs; 1.0's kinds of point with the materials and brands; the honest label; no studio name to the client; the draft follows the screen; key points fixed; one sign, zeros, names; readings keep their lines and their engine; the demo readings refreshed and the two test readings gone | Q-01…Q-09 | L |
| **2 · Reading the files, finding the way** | Spreadsheets read for real, names by whole words, reading on pick, types and size; the setup's picks; the crumbs, Back and scope; the quote rows' menus; Recent in full with a search; the house pieces (own ghosts, `StatTile`, the editor's money, three pins, the FAB clearance, the file tile, the phone card's label) | Q-10…Q-13 | M |
| **3 · The record as a working copy** | Corrections with Undo; stale and *Run again*; sending kept and logged; the record's quote, maker and kebab; the Lost dialog's competitor | Q-14…Q-18 | L |
| **4 · Who may and what is kept** | Who sees leads on every X-Ray read and the run; the run's checks; delete by maker, Owner or Admin, logged; a deleted lead or quote; the repair check | Q-19…Q-21 | M |
| **5 · Data** | The devs' map for X-Ray | Q-01 | S |

## 8. Coverage, and what was not verified

**Rows:** 10 definitions · 9 mismatches · 87 matrix rows (+ 6 touchpoints) · 25 questions. Inventories: A 97 rows · B 121 · C 89 · D D-01…D-236 · E 113. The live app on :3001 was not browsed; every 1.0 row rests on the code, and each reader's *Uncertain* list stands.

### 8.1 Found in 1.0 on the way (for the 1.0 developers)

From the code reading; not reproduced on a running 1.0.

1. **The headline mixes bases** — our grand total (GST in, discount off) against line totals without either; a quote with no readable total counts as S$0, so the "no readable totals" error can never fire (B-20, B-28, B-37, A-24).
2. **Every amount on a result prints S$** whatever the studio's currency — the currency code goes where a country code is expected (A-51, B-104).
3. **Chained model merges drop a line** (A+B, B+C with A and C from one quote), and the merge pass switches off above 80 leftover lines (B-30, B-33).
4. **A room-organised quote never matches a trade-organised one** — the trade gate blocks every match, so the same work reads as missing on both sides (B-24, B-29).
5. **"Below market" false positives** — running and linear metres read as feet (≈ 3.3×), and generic words ("supply", "install") bind lines to unrelated rate bands (B-58, B-59, B-63).
6. **A laminate cabinet finish fires the laminate-worktop question**, and one laminate line in your quote silences their worktop and flooring questions (B-70, B-75).
7. **Brands compare by case only in the facts** ("Häfele" ≠ "Hafele") while the dossier cache folds accents; aliases are never written (B-79, B-80, C-69).
8. **A failed brand scan reads as "users report no real problems"** for 90 days (C-64).
9. **The WhatsApp draft is never checked against the points on screen**; the "no digits" guard passes on "1."; the no-key draft names the competitor (B-48, B-51).
10. **The public share route returns the whole row** — both parsed quotes with the homeowner's name, the ids, the outcome and its note; only the brand findings are stripped (C-36, A-89).
11. **No role or member scope on any route** — a designer lists, opens and deletes every run, including runs on leads hidden from them (C-18, C-40, A-59).
12. **Market observations copy both quotes' raw line text** — ours included — into a cross-studio table nothing reads; deleting a run leaves them (B-101, C-75).
13. **The "no digitized quote" bounce sticks** — after one bounce every lead asks for an upload (A-14).
14. **"Fix in Quote Digitizer" opens an empty picker** (A-50, C-53).
15. **History stops at five**; "+n older" cannot be opened (A-55, C-56).
16. **A verdict prints as a blank page** (A-52).
17. **Without an AI key every file parses to the same sample** and the rows save as real runs (A-26, B-06, C-29).
18. **The 10 MB promise sits above a ~4.5 MB request ceiling** (A-25, C-28).
19. **The admin funnel always shows zero opens** (C-74, A-93).
20. **The currency sniff reads "STORE RM" as ringgit** (A-29, B-22).
21. **The PRD and the changelog describe the May tool** — a single-quote upload and a private link (A-94, C-81…C-84); the spec the code cites is not in the repo (C-87).
22. **The PDF worker is traced into the wrong route** (C-30).

### 8.2 Found in 2.0 on the way (fixed in the rounds)

1. "Yours" is a line sum before GST beside a quote card with GST; lines that print a word count at full price (E-90, E-91) — round 1.
2. "Does not include" from a failed word match — the seeded OM-10008 reading tells the client Flo Design leaves out the kitchen cabinets it lists (E-98) — rounds 1 and 3.
3. "Both quotes name it" for a brand only their quote names — in every seeded reading (E-88) — round 1.
4. Upload two quotes loses your file's brands (E-89) — round 1.
5. The Difference column and the Real difference tile run opposite signs (E-93) — round 1.
6. "S$ -0.00", "S$ 0.00 more", a quote with no lines runs, one file compared with itself (E-94) — rounds 1 and 4.
7. Client sentences lower-case "KDK" and "TV" and cut names mid-phrase (E-100) — round 1.
8. The question forms never reach the draft; Send with nothing to say (E-97) — round 1.
9. Copy that promises what isn't done: "Priced below market", brands among the points, links that open nothing (E-99) — rounds 1 and 2.
10. Your rows don't follow the quote's order (E-104) — round 1.
11. Like-for-like is lump sum against lump sum (E-111) — round 1.
12. Two base-state readings come from a test run, one a quote compared with itself (E-112) — round 1.
13. No index on `lead_id` (E-62) — round 1.
14. Names read by substring (E-95) — round 2.
15. Spreadsheets promised, not read (E-96) — round 2.
16. The ghosts are borrowed from Leads and Lead Details (E-105) — round 2.
17. `StatTile` not used, X-Ray's own money format, two pins (E-106) — round 2.
18. The page's end sits under the dock and the FAB (E-107) — round 2.
19. The file tile's stock thumbnail and PDF glyph; any dropped type taken (E-109) — round 2.
20. The crumb never names the lead; the way back is lost (E-84, E-85) — round 2.
21. Upload two quotes on a lead's page leaves the lead (E-86) — round 2.
22. A lead's Recent is cut from the studio's 20 (E-87) — round 2.
23. The phone card doesn't label the other side's figure (E-113) — round 2.
24. The lead select picks by label (E-13); a stray `?quote=` counts as chosen (E-17); "create one" doesn't open Create Quote (E-16) — round 2.
25. A stored reading goes stale without a word (E-92) — round 3.
26. Sending leaves nothing (E-55) — round 3.
27. The record has no delete, no link to its quote, no maker (E-51, E-108) — round 3.
28. Who sees leads never reaches X-Ray; every lead's phone ships to the browser (E-73, E-102, E-108) — round 4.
29. No role rule and no trace on delete (E-72, E-103) — round 4.
30. `runComparison` checks neither the quote's state nor its lead (E-101) — round 4.
31. A deleted lead's comparisons stay live (E-110) — round 4.
32. The repair check calls a soft-deleted quote gone (D-43) — round 4.
33. No X-Ray probe is banked in the repo (E, Uncertain) — every round banks its probe.

## 9. The owner's answers

**The owner's instruction, 2026-09-24 (night):** "you take a call, I will go with your recommendations but make sure everything is intact with 2.0 experience … do it step by step and everything audit carefully and build in 2.0 experience only." Every one of the 25 calls is **As recommended**, set on that instruction; the decisions doc shows each with its dropdown so the owner can override any of them.

## 10. Build log

Rounds follow §7. The decisions doc's section H carries each round's status.

- **2026-09-25** — audit written (REG-636); the 25 calls set *As recommended* on the owner's instruction (REG-637); round 1 started.
- **Round 1 · The reading tells the truth — built and verified (REG-638).** Engine 2: Q-02 your side as the quote counts it, the basis said · Q-03 plurals, trade words, one line against several, a trade lump sum, "taking out is not putting in" · Q-04 rates on one-to-one pairs, both quantities shown · Q-05 1.0's fact pool with the sixteen materials and the brand facts · Q-06 *Priced well below ours* · Q-07 no studio name to the client · Q-08 the draft follows the screen · Q-09 key points by 1.0's rules · §8.2 gaps 1–13 (the house money formats and `StatTile` came forward from round 2). Migration `0046_xray_reading`; repair R33 (engine 2) and R54 (re-read, self-comparison removed — the base state now holds three readings). Probe `verify-xr-r1.cjs` 27/27.
- **Round 2 · Reading the files, finding the way — built and verified (REG-639).** Q-10 read on pick (sheets for real, references by whole-word names, types and 10 MB) · Q-11 the setup's picks (type-ahead in the house select, one quote chosen, empty quotes refused, Create a quote / Upload your quote instead, Upload keeps the lead) · Q-12 crumbs, Back and scope everywhere, the quote rows' *Compare with another quote* · Q-13 every comparison in Recent with a search · §8.2 gaps 14–24. Found and fixed on the way: the Quotes table's row menu was clipped by its card on a one-row table — it now opens through the portal (the Contracts twin goes to the UI sweep, U-09). Probe `verify-xr-r2.cjs` 31/31.
- **Round 3 · The record as a working copy — built and verified (REG-640).** Q-14 corrections on the row with Undo, everything following · Q-15 the stale banner and *Run again* (a new reading, corrections carried) · Q-16 the send kept, shown and logged, the lead's chat only on a valid number · Q-17 the record's quote link, maker and kebab · Q-18 the Lost dialog's competitor · §8.2 gaps 25–27. Migration `0047_xray_record`. Probe `verify-xr-r3.cjs` 28/28.
- **Round 4 · Who may and what is kept — built and verified (REG-641).** Q-19 Who sees leads on every X-Ray read, action and run; no phone numbers in the setup's payload; the run's checks and the same-quote refusal · Q-20 delete by its maker, an Owner or an Admin, logged on the lead · Q-21 a deleted lead's readings leave and come back; Delete forever takes them · §8.2 gaps 28–32. Probe `verify-xr-r4.cjs` 16/16.
- **Round 5 · Data — written (REG-642).** `10-quote-x-ray-migration-map-2026-09-25.md`. The X-Ray parity is complete (102 probe checks across four rounds); the UI sweep's backlog carries U-09 found on the way.

## Appendix — the inventories

`quote-x-ray-1.0-inventory/` — **A** the flow and the screens (A-01…A-97) · **B** the engine (B-01…B-121) · **C** everything around it (C-01…C-89) · **D** the data model and the port plan (D-01…D-236) · **E** 2.0 today (E-1…E-113). The folder's README says who read what.
