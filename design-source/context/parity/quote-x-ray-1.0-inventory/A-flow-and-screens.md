# OpenMaison 1.0 — Quote X-Ray inventory · Slice A: the flow and its screens

Source repo: `/Users/vicky/Documents/GitHub/qanvast-id-tool` (read only), `67f42e469`. Paths relative to that repo. Line numbers as read on 2026-09-25.

Conventions: *Words* are quoted verbatim from code; icon glyphs (emoji, arrows drawn as icons) are omitted from quotes; "(uppercase styling)" = the string is stored in sentence case and shown in capitals by CSS. "Hand-off B / C / D" = owned by reader B (engine), C (routes, permissions, brand dossiers, outcomes, docs) or D (data) and only named here. Abbreviations: `PAGE` = `src/app/(main)/tools/quote-xray/page.tsx`; `VU` = `src/components/quote-xray/VerdictUpload.tsx`; `VV` = `src/components/quote-xray/VerdictView.tsx`; `STC` = `src/components/quote-xray/SendToClientDialog.tsx`; `SLD` = `src/components/quote-xray/ShareLinkDialog.tsx`; `HIST` = `src/components/quote-xray/QuoteXrayHistory.tsx`; `PP` = `src/components/quote-xray/ParsingProgress.tsx`; `SH/` = `src/components/quote-xray/shared/`; `VIEWS/` = `src/components/quote-xray/views/`; `Q` = `src/lib/queries/quote-xrays.ts`; `CR` = `src/app/api/quote-xrays/create/route.ts`; `PF` = `src/lib/quote-parse/parse-file.ts`; `PUB` = `src/app/sign/quote-xray/[token]/page.tsx`; `LDD` = `src/components/leads/lead-detail-drawer.tsx`; `VER` = `src/lib/quote-xray/verdict.ts`; `RPT` = `src/lib/quote-xray/build-xray-report.ts`; `T` = `src/types/app.ts`.

## Vocabulary (where each word is defined)

- **Quote X-Ray / X-Ray / comparison** — the tool at `/tools/quote-xray`; one run = one `quote_xrays` row. The screens mostly say "comparison" (*"Recent comparisons"*, *"New comparison"*, *"Delete comparison"*) but also "X-Ray" (*"X-Ray <id> could not be loaded."*, *"Start a new X-Ray"*).
- **Verdict run** — the current flow, rebuilt 2026-08-14 (commit `d000261fa`): `objective = 'verdict'`, `ai_synthesis.kind = 'verdict'` (`T:4717-4747`). One own quote vs one other quote → a headline, ≤3 talking points, a WhatsApp draft.
- **Legacy run** — a row written by the pre-rebuild wizard: `objective` is one of the four objectives and `ai_synthesis.kind` is that objective or `combined`. Read-only now (A-61…A-89).
- **Objective** — *"Gap Finder"*, *"Sales Justifier"*, *"Market Intel"*, *"Package Ladder"* (`QuoteXrayObjective`, `T:4409-4413`); the old picker's card titles were "Find gaps", "Sell to client", "Learn from competitors", "Compare MY tiers" (UAT, A-94).
- **Combined run** — a legacy "all-4" run: `kind: 'combined'` with `primary`, `results`, `weak` (`T:4674-4680`); labelled *"Comparison <n>"*.
- **Your quote / own quote** — `inputs.quotes[0]`, role `own`: the lead's digitized quote or an uploaded file. **The other studio's quote / the other quote / competitor** — `inputs.quotes[1]`, role `competitor`, always an uploaded file (`T:4417, 4446-4452`).
- **Digitized quote** — a `quotes` row of `quote_type = 'standard'` with its `quote_line_items`, made in the Quote Digitizer (the 1.0 quote editor).
- **Defending** — the setup's word for the lead quote that will be compared (A-12).
- **Raw gap / real gap / missing scope** — the headline numbers (`VerdictSynthesis.headline`; `src/lib/quote-xray/real-gap.ts:8-18`): raw = own − other; real = raw − scope they lack (priced at your lines) + scope you lack (priced at theirs). Hand-off B.
- **Talking points / "Say this"** — `verdict.points` (≤3, `T:4703-4715`), each with **evidence** (`type`, `detail`, `cents`; types `T:4694-4701`) and a confidence (`high` / `medium`).
- **Brand ammo / "Key points you can use"** — `quote_xrays.brand_ammo` (`T:4749-4782`), web-sourced brand notes written after the response; docs and the admin page call it the "Ammo panel". Hand-off C for dossiers.
- **Recent comparisons** — the history panel on the setup screen (A-54).
- **Share link / public page** — legacy only: a 24-hour token and `/sign/quote-xray/<token>` (A-84…A-89).
- **AI-matched / Un-merge** — match rows the AI joined despite different wording; un-merge splits one back (legacy Gap Finder only, A-69).
- **Weak objective** — a legacy combined tab that did not fit the uploads (A-63).

---

## Entry points

### A-01 · The Tools entry in the desktop sidebar
- Where: `src/components/layout/app-sidebar.tsx:19-29` (item at :21); flyout filter :219, :394; expanded list :425; the sidebar exists only at ≥1024 px (`src/app/(main)/layout.tsx:180-181`, `hidden lg:flex`).
- Entry: desktop → rail → Tools → *"Quote X-Ray"*, second after *"Quote Digitizer"*.
- Does: navigates to `/tools/quote-xray` with no parameters — the setup screen (A-07).
- Rules: hidden when the platform page flag `tools/quote-xray` is off (`isPageEnabled`, on when the key is absent — `src/context/platform-config-context.tsx:46-51`); not owner-only. The crumb label *"Quote X-Ray"* (`src/components/ui/breadcrumb.tsx:30`) never shows: the page's `PrimaryPageHeader` hides the breadcrumb strip while mounted (`src/components/ui/primary-page-header.tsx:34-42`).
- Data: —
- States: —
- Words: *"Quote X-Ray"*.
- Reachable: behind flag `tools/quote-xray` (platform page visibility, default on).

### A-02 · "Beat this quote" in the lead drawer
- Where: `LDD:1902-1913` (inside `quotesInner`). Mounted in Journey mode inside the Deal card's *"Manage quote(s)"* expander (`LDD:2175-2191`; `src/components/leads/drawer-sections/quote-summary-card.tsx:233-245`; when the lead has no quote the card renders `quotesInner` directly, :78-80) and in Classic mode in the *"Quotes"* section (`LDD:2233-2241`).
- Entry: lead drawer → quotes area (Journey: first open the Deal card's *"Manage quote"* / *"Manage quotes (<n>)"*).
- Does: a plain link to `/tools/quote-xray?leadId=<lead id>`; the tool opens in *"For a lead"* with the lead preselected and its quotes resolved (A-10…A-13).
- Rules: shown only when the drawer's scoped quote has line items (`quoteLineItems?.length` — the quote last opened, else the contract quote: signed → primary, `LDD:339-352`) **or** the lead's `quoteStatus` is `client_signed` — so it also shows after the deal is signed. Not gated by the platform flag (a plain `Link`, not the digitizer's `guardedToolOpen`): with the page off it lands on the layout's *"Coming Soon"* screen (A-05). It replaced *"X-Ray this quote"* (`&objective=gap-finder`, red styling) in the rebuild. Nothing brings the user back to the lead afterwards (A-31).
- Data: `quote_line_items` (via `useQuoteLineItems`), `leads.quote_status`.
- States: —
- Words: *"Beat this quote"* (neighbour *"Download quote"* is not X-Ray).
- Reachable: yes.

### A-03 · The deep links `?leadId=` and `?xrayId=`
- Where: `PAGE:36-53`, reset `PAGE:93-105`.
- Entry: A-02 produces `?leadId=`; nothing in the app produces `?xrayId=` (grep; the pre-rebuild page also only read it).
- Does: `?leadId=` seeds the page's lead (mode stays *"For a lead"*); `?xrayId=` opens that stored run straight on the result step. Any reset `router.replace`s back to the bare path.
- Rules: finishing a run or opening a recent one never writes `?xrayId=`, so a reload or a pasted URL lands on a blank setup and browser Back leaves the tool instead of returning to setup. `?xrayId=` is the only route into legacy rows (A-61…A-89). A `?leadId=` for a lead missing from the picker's list (another designer's lead, or a CLOSED lead, A-10) leaves the picker on its placeholder while the quote check still runs for that id — the card can read *"Defending: …"* under an empty picker.
- Data: —
- States: —
- Words: —
- Reachable: `?leadId=` yes; `?xrayId=` only hand-typed.

### A-04 · Where X-Ray cannot be reached from
- Where: `src/components/layout/bottom-nav.tsx:34-41, 96` (phone Tools sheet); `src/components/layout/topbar.tsx:23-31, 152, 339-345` (the *"Tools & Apps"* grid); `src/app/(main)/tools/quote-digitizer/page.tsx`; grep of `quote-xray` / `xray` over `src/`.
- Entry: —
- Does: the phone bottom nav's Tools list and the topbar's *"Tools & Apps"* grid list Quote Digitizer, AI Visualizer, Floorplan to 3D Isometric, Market Insights, Compliance Navigator, 3-D Space Planner (+ Meeting Copilot in the topbar) — **not Quote X-Ray**. Below 1024 px (no sidebar) the only ways in are A-02 and a typed URL. The Quote Digitizer has no X-Ray action (the only link between them runs the other way, A-50). No search result, shortcut, Maison bot tool, notification, email, project page or dashboard links to it. The lead does not list its X-Rays: the records route's `?leadId=` filter has no caller (`Q:40-54` is always called without it).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### A-05 · Role and page gates as the screens see them
- Where: `src/lib/access-control.ts:95`; `src/app/(main)/layout.tsx:119-144, 187-196`.
- Entry: —
- Does: owners, admins and designers (`id`) open the page; any other role is redirected to its default route. With the platform page off, the layout shows *"Coming Soon"* in place of the page. Inside the tool nothing is role-gated — every member sees and can delete every comparison of the studio (A-57, A-59).
- Rules: the APIs check only for a session (hand-off C).
- Data: —
- States: —
- Words: *"Coming Soon"*, *"This feature is not yet available. Check back later!"*
- Reachable: yes.

### A-06 · The page shell
- Where: `PAGE:157-188, 404-410`; `src/components/ui/primary-page-header.tsx:68-96`.
- Entry: every step.
- Does: a sticky white header with title and subtitle. On the result step, once the row is loaded, its right side carries *"Download PDF"* (legacy rows only, A-83) and *"New comparison"*; a ghost *"Back to Quote X-Ray"* sits under the header on the result step. Body padding `px-4 sm:px-6 md:px-8`.
- Rules: no `loading.tsx` for the route; the `Suspense` fallback (required by `useSearchParams`) is an empty padded div. No breadcrumb (A-01).
- Data: —
- States: —
- Words: title *"Quote X-Ray"*; subtitle *"Compare your quote with any other studio's — get the real difference and what to say."*
- Reachable: yes.

---

## The setup screen

### A-07 · The step machine and what survives it
- Where: `PAGE:29, 40-53, 93-135, 190-236`.
- Entry: every visit.
- Does: four steps — `upload` (setup + Recent comparisons), `parsing` (A-28), `result` (A-30), `currency-error` (A-29). Inputs (lead, both files, chosen quote) live on the page so they survive the swap to the parsing screen and the NO_LEAD_QUOTE bounce. `resetWizard` — behind *"New comparison"*, *"Back to Quote X-Ray"*, *"Start over"*, *"Start a new X-Ray"*, *"Start a new comparison"* — clears the result, the currency error, the bounce flag, the lead, both files and the quote choice, and strips the query string.
- Rules: there is no "edit and re-run": every way back from a result wipes both files and the lead, including a lead that came from the drawer. A run is not cancelled if the user navigates elsewhere in the app; its row turns up later in Recent comparisons (Uncertain 2).
- Data: component state only.
- States: —
- Words: —
- Reachable: yes.

### A-08 · The explainer banner
- Where: `PAGE:241-295`, shown at `PAGE:192`.
- Entry: setup step.
- Does: a tinted card above the setup explaining the job; its X hides it for good in this browser (`localStorage` `qanvast_xray_banner_dismissed = "1"`).
- Rules: a failed storage read shows the banner. Not shown on the result step.
- Data: `localStorage`.
- States: —
- Words: *"Client comparing your quote with another studio's? Upload theirs — we check it against yours, item by item."*; bullets *"The real price difference — after counting the work each quote includes or leaves out (works whether theirs is cheaper or more expensive)"*, *"Up to 3 points to tell your client — missing items, materials, brands, and prices that don't add up"*, *"A WhatsApp message ready to send — edit it in your own words and go"* (the part before each dash in bold); *"Takes about a minute. AI helps write this — always check the numbers before you send anything to a client."*; close label *"Dismiss"*.
- Reachable: yes.

### A-09 · The two starts: "For a lead" / "Upload 2 quotes"
- Where: `VU:63, 100-113, 240-258`.
- Entry: setup step.
- Does: a two-segment toggle (`role="tablist"`), default *"For a lead"*. Switching clears only the chosen quote; files and the lead stay in page state (A-17).
- Rules: the file's header comment calls the modes "From a lead" / "Upload both quotes" and promises an "optional lead link" in upload mode — the labels are *"For a lead"* / *"Upload 2 quotes"* and upload mode has no lead control. Segments are ≥36 px tall (touch). Clicks are ignored while a run is pending (never visible, A-19).
- Data: —
- States: —
- Words: *"For a lead"*, *"Upload 2 quotes"*; group label (screen reader) *"How do you want to start?"*
- Reachable: yes.

### A-10 · The lead picker
- Where: `VU:119-136`; list `PAGE:89, 196-198`; `src/components/ui/searchable-select.tsx`.
- Entry: *"For a lead"*.
- Does: a searchable select of the viewer's leads (the app context's `filterLeadsForViewer` list, `src/context/app-context.tsx:123`) minus leads in the `CLOSED` bucket; each option shows the name and the property type (`formatPropertyType`; *"Unknown"* when empty); search matches both. Picking a lead clears any chosen quote and starts the quote check (A-11).
- Rules: a picked lead can be changed but not cleared (no clear control). Options show no stage, owner or quote count. `CLOSED` is hard-coded (Uncertain 13).
- Data: `leads` (app context).
- States: empty → *"No matching leads"*.
- Words: label *"Lead"* (uppercase styling); placeholder *"Pick the lead this quote belongs to"*; *"No matching leads"*; search *"Search…"*; under an empty picker *"We take your quote from the lead — you don't need to upload it."*
- Reachable: yes.

### A-11 · Checking the lead's quotes
- Where: `VU:66-74, 137-144`; `Q:82-104`; `src/app/api/quote-xrays/lead-quotes/route.ts:15-51`.
- Entry: a lead is picked in *"For a lead"*.
- Does: fetches the lead's **standard** quotes (variation orders excluded), primary first then newest; each option = id, label (label → quote number → *"Quote"*), raw status, primary flag, total, updated time. 0 → A-14, 1 → A-12, 2+ → A-13.
- Rules: every standard quote is offered whatever its status (draft, rejected…) and whether or not it has line items — an empty quote is accepted here and refused by the server (A-14). Cached 30 s.
- Data: `quotes.id, label, quote_number, status, is_primary, total_cents, updated_at, quote_type`.
- States: loading → pulsing *"Checking this lead's quotes…"*; error → red *"Couldn't check this lead's quotes — try re-selecting the lead."* (the footer then says *"Add your quote."*, A-19).
- Words: as cited.
- Reachable: yes.

### A-12 · One quote — the "Defending" chip
- Where: `VU:146-151`; submit `VU:92-96`.
- Entry: the lead has exactly one standard quote.
- Does: a green chip names the quote and its total; submit sends that quote's id so the server compares exactly what the chip showed.
- Rules: the chip formats with the studio's country (`getCountryCode()`), so its symbol is right — unlike every amount on the result (A-51). A zero total shows as 0.00.
- Data: as A-11.
- States: —
- Words: *"Defending: <label> · <total>"*.
- Reachable: yes.

### A-13 · Several quotes — "Which quote is the client comparing against?"
- Where: `VU:153-186`.
- Entry: two or more standard quotes.
- Does: radio cards: label (+ *"primary"* tag), then *"<total> · <status> · updated <date>"*. No default — the user must pick one (footer hint, A-19).
- Rules: status prints raw from the database (`draft`, `submitted`, `approved`, `rejected`, `sent_for_signature`, `client_signed`); the date uses the browser locale. The chosen quote's name never reaches the result (A-20).
- Data: as A-11.
- States: —
- Words: legend *"Which quote is the client comparing against?"*; *"primary"*; *"<total> · <status> · updated <date>"*.
- Reachable: yes.

### A-14 · No digitized quote — upload yours instead
- Where: `VU:71-74, 188-196`; `PAGE:127-129`; `CR:580-587`.
- Entry: the lead has no standard quote (known at pick time), or the server answered `NO_LEAD_QUOTE` (the quote has no line items, or only omission lines).
- Does: a yellow note and a *"Your quote"* dropzone replace the chip / picker; the run then uses the uploaded file (the lead id is still sent, so the run stays linked to the lead).
- Rules: the server bounce shows no toast — the page silently returns to setup with the note. **The bounce is sticky**: `needOwnUpload` clears only on a successful run or a reset, not when another lead is picked (`VU:74`; `PAGE:52, 93-101, 127-129`), so after one bounce every lead demands an upload. The note says "no digitized quote yet" even when the lead has quotes that are merely empty. A failed load (`LEAD_QUOTE_LOAD_FAILED`) arrives as a toast instead (A-24).
- Data: `quotes`, `quote_line_items`.
- States: —
- Words: *"This lead has no digitized quote yet — upload your quote file to compare."*
- Reachable: yes.

### A-15 · What "your quote" is when it comes from the lead
- Where: `src/lib/quote-xray/own-quote-from-lead.ts:63-161`.
- Entry: *"For a lead"* with a chip or a chosen quote.
- Does: reads the chosen quote (validated against the lead), else the primary standard quote, else the newest; takes its line items in order — falling back to the lead's legacy quote-less items when the quote has none — drops omission lines, joins each line's name and description, maps FOC / inclusive markers, uses the line's category as its section (*"General"* when empty), and takes the total from `quotes.total_cents` (else the sum of amount / lump-sum lines). No upload, no parse, no currency check.
- Rules: the legacy fallback can substitute the lead's old items under an empty non-primary quote. Matching quality and totals (GST, discounts) are hand-off B.
- Data: `quotes` (id, label, quote_number, quote_type, is_primary, status, subtotal_cents, discount_cents, total_cents), `quote_line_items`.
- States: —
- Words: —
- Reachable: yes.

### A-16 · The other studio's quote
- Where: `VU:199-212` (lead mode), `VU:217` (upload mode).
- Entry: both modes.
- Does: a tall, tinted dropzone for the other studio's file; always required (A-18).
- Rules: —
- Data: —
- States: —
- Words: column label *"The other studio's quote"* (uppercase styling); dropzone label *"The other studio's quote"*.
- Reachable: yes.

### A-17 · "Upload 2 quotes"
- Where: `VU:214-219`; submit `VU:86-98`.
- Entry: the second segment.
- Does: two dropzones side by side (stacked below 640 px): *"Your quote"* and *"The other studio's quote"*; no lead needed.
- Rules: there is no lead control here, yet the page's lead id is always sent — a lead picked earlier in *"For a lead"*, or one arriving via `?leadId=`, silently links the run (`VU:88-91`; `PAGE:107-117`). The own side is still named after the studio, not the file (A-20). A run cannot be linked to a lead afterwards (the hook exists without UI, A-91).
- Data: —
- States: —
- Words: *"Your quote"*, *"The other studio's quote"*.
- Reachable: yes.

### A-18 · The dropzone
- Where: `VU:26-27, 260-346`.
- Entry: every file slot.
- Does: click (hidden file input) or drag-and-drop one file; a picked file becomes a row with its name (full name on hover) and a remove X; the input resets so the same file can be picked again.
- Rules: picker filter `.pdf,.png,.jpg,.jpeg,.csv,.xlsx` — no `.xls`, `.heic`, `.webp` or Word files. Drag-and-drop skips the type filter (only the server refuses, after the parsing screen has appeared, A-23). Client cap 10 MB (toast). Only the first file of a multi-drop is kept.
- Data: —
- States: drag-over tint; picked row.
- Words: *"Drop a file or tap to browse · PDF, image, CSV, Excel"*; toast *'"<file name>" is over 10 MB.'*; remove label *"Remove <slot label>"*.
- Reachable: yes.

### A-19 · Submit: the hint and "Compare"
- Where: `VU:76-84, 221-234`; `PAGE:107-121`.
- Entry: the foot of the setup card.
- Does: *"Compare"* enables once the other studio's file is there and the own side is satisfied (upload mode: your file; lead mode: a lead plus the single quote, a chosen quote, or the fallback file). A grey hint names the first missing piece. Pressing it switches at once to the parsing screen.
- Rules: the page swaps to parsing before awaiting, so the card is gone while a run is pending — *"Comparing…"* and every pending-disabled state never show. After a quote-check error the hint reads *"Add your quote."* though the fix is re-picking the lead.
- Data: —
- States: disabled until complete.
- Words: *"First, pick a lead."*, *"Choose which of your quotes to compare."*, *"Add the other studio's quote."*, *"Add your quote."*; *"Compare"* / *"Comparing…"*.
- Reachable: yes.

### A-20 · What the two sides are called
- Where: `PAGE:113` (sends `compLabel: "The other quote"`); `CR:551-555, 590, 596-622`.
- Entry: every run.
- Does: the own side takes the **studio's name** (`studios.name`), else *"Our quote"*; the other side takes the vendor read from the file's letterhead, else *"The other quote"* (the server's own default *"Competitor quote"* is never used by this UI).
- Rules: the quote actually defended (e.g. "Option A") is stored only as `sourceFileName = "digitized:<quote id>"` — no screen can say which of the lead's quotes was compared. Without a letterhead vendor every screen reads *"The other quote"*, giving *"Not in The other quote's quote"* (A-47) and history rows that differ only by date (A-55). Neither name can be edited, before or after.
- Data: `quote_xrays.inputs.quotes[].label, sourceFileName`.
- States: —
- Words: *"The other quote"*, *"Our quote"*; *"Competitor quote"* (unused).
- Reachable: yes.

### A-21 · What pressing "Compare" sends
- Where: `Q:172-229`; `src/app/api/quote-xrays/parse-file/route.ts:25-64`; `CR:200-201, 542-752`.
- Entry: *"Compare"*.
- Does: the browser parses each supplied file with its own request to `/api/quote-xrays/parse-file`, in parallel (the lead path parses only the other studio's file), then posts the parsed JSON — never file bytes — with `objective: "verdict"`, the lead id, the chosen quote id and the file names to `/api/quote-xrays/create`. The server resolves your quote, checks currency, matches, builds the verdict, saves the row and returns it; brand research continues after the response (A-42). Engine hand-off B; routes hand-off C.
- Rules: parse and create each have a 120 s budget; create starts only after both parses finish.
- Data: writes `quote_xrays` (objective `verdict`, status `ready`); every run also appends anonymised `market_quote_observations` (hand-off D).
- States: A-28.
- Words: —
- Reachable: yes.

### A-22 · Which files read well
- Where: `PF:16-19, 40-47, 55-86, 87, 164-249`.
- Entry: A-21.
- Does: a PDF with a text layer (≥200 characters) is read as text, first 40 pages; scanned PDFs and PNG / JPG photos go to vision; CSV as text; XLSX as the CSV of its **first sheet only**. Same extraction prompt as the digitizer (sections; FOC / KIV / inclusive / lump-sum price types).
- Rules: a multi-sheet workbook loses every sheet after the first; a text PDF over 40 pages loses its tail. Extraction quality hand-off B.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-23 · Parse errors as the user sees them
- Where: `Q:13-25, 191-200`; `PF:165-174, 220-231, 243-249`; parse-file route `:39, 44, 60`; `PAGE:130-133`.
- Entry: a file fails to parse.
- Does: back to setup (inputs kept) with a toast of the server's message, prefixed with the side and file name.
- Rules: the messages are the digitizer parser's and tell the user to "add items manually" — X-Ray has no manual entry. A non-JSON failure (e.g. a platform 413) reads *"Request failed: <status>"*. The size text differs from the client check ("10MB" vs "10 MB").
- Data: —
- States: error toast.
- Words: prefixes *"Competitor quote (<file>): …"* / *"Your quote (<file>): …"*; *"File too large. Maximum size is 10MB."*; *"Unsupported file type. Upload a PDF, image, CSV or Excel file."*; *"This file took too long to read — it may be a large scan or photo. Try a clearer, text-based PDF, or add items manually."*; *"Could not read this document (the AI returned an unusable response). It may be a scan or photo — try a text-based PDF, or add items manually."*; *"Could not parse document. Try again or add items manually."*; *"Could not read the uploaded file."*; *"No file provided"*; *"Request failed: <status>"*; *"Not authenticated"*.
- Reachable: yes.

### A-24 · Comparison errors as the user sees them
- Where: `CR:166-190, 431-440, 556-587, 624-637, 675-715`; `PAGE:122-134`; `src/lib/quote-xray/three-way-match.ts:179-182`.
- Entry: the create call fails.
- Does: `currency_mismatch` → A-29; `NO_LEAD_QUOTE` → A-14; anything else → back to setup with a toast of the server's message (fallback *"Failed to run the comparison"*).
- Rules: `DEGENERATE_COMPARISON` is practically unreachable: match totals turn a missing grand total into 0 (`three-way-match.ts:181`), so a file with no readable total yields a run whose total is 0.00 (and a gap built on it) rather than this error — hand-off B.
- Data: —
- States: error toast.
- Words: *"Missing the competitor's quote file."*; *"Provide your own quote — link a lead with a digitized quote, or upload your quote file."*; *"Could not load this lead's quote. Try again, or upload your quote file."*; *"The comparison couldn't be completed. Please try again in a moment."*; *"Couldn't compare these quotes — one of them has no readable totals."*; *"Failed to save the comparison"*; *"Quote X-Ray failed to complete"*; *"Could not read the request. Parse your files first, then retry."*; *"Failed to run the comparison"*.
- Reachable: yes.

### A-25 · The file-size ceiling
- Where: `VU:26, 273-278`; `PF:159, 165-167`; the team's own note at `src/app/api/copilot/competitor-quote/route.ts:5-18`.
- Entry: a large file.
- Does: the dropzone and the parser both advertise and enforce 10 MB.
- Rules: each parse request carries the whole file; the code notes elsewhere that the host caps a serverless request body at about 4.5 MB (Vercel), so a 4.5–10 MB file passes the client check and then fails before the parser runs, surfacing as *"Competitor quote (<file>): Request failed: 413"* (Uncertain 1).
- Data: —
- States: —
- Words: as A-18, A-23.
- Reachable: yes.

### A-26 · Without an AI key
- Where: `PF:134-150, 176-180`; `CR:647-650`; `VER:297-319`.
- Entry: an environment without `OPENROUTER_API_KEY`.
- Does: every uploaded file "parses" as the same sample quote (vendor *"Home Create Pte Ltd"*, total 27,000); the verdict uses the deterministic fixture (fallback one-liner, points from the facts' pre-written sentences, fallback WhatsApp draft — A-33, A-39).
- Rules: in upload mode a keyless demo compares the sample against itself. Hand-off B.
- Data: —
- States: —
- Words: —
- Reachable: behind env (no key).

### A-27 · A demo competitor quote
- Where: `docs/demo/quote-xray-samples/urban-nest-competitor-quote.pdf` (+ `.html` source).
- Entry: —
- Does: a sample "Urban Nest" competitor quote kept for demos.
- Rules: not wired into any screen.
- Data: —
- States: —
- Words: —
- Reachable: —

### A-28 · The parsing screen
- Where: `PP:15-115`; used at `PAGE:221-223` (a fresh run, `fileCount` 1 or 2) and `PAGE:323-325` (loading a stored row, `fileCount` 0).
- Entry: *"Compare"*; opening any result.
- Does: an icon, a title, a time estimate, a bar with a percentage and a four-stage checklist. The bar is a time-based estimate that creeps toward 99 % (time constant 6.5 s) and never completes; stages advance at 20 / 45 / 72 %; it disappears when the result arrives.
- Rules: the stages do not follow the real requests (the code comment calls them "honest because these ARE the steps"). After a fresh run the page fetches the saved row and the screen returns as *"Loading your comparison…"* with the bar restarting at 4 %. Reopening a stored row shows the same reading / extracting stages although nothing is read. No cancel. "30–60 seconds" against budgets of up to 120 s per step.
- Data: —
- States: —
- Words: *"Comparing the two quotes…"* (every fresh run, including the one-file lead path) / *"Loading your comparison…"*; *"This usually takes 30–60 seconds. Please don't close this page."*; *"Reading your quotes"*, *"Extracting line items"*, *"Matching comparable items"*, *"Running the AI analysis"*; *"<n>%"*.
- Reachable: yes.

### A-29 · The cross-currency refusal
- Where: `src/components/quote-xray/CurrencyMismatchError.tsx:11-38`; `PAGE:124-126, 225-227`; `CR:446-467, 624-637`.
- Entry: an uploaded file mentions a currency other than the studio's.
- Does: a red panel replaces the page body; *"Start over"* resets everything, lead and both files included.
- Rules: detection is a keyword sniff over the vendor, issuer, description, file name and first eight line descriptions (`S$` / `SGD`, `RM` / `MYR` / `Ringgit`, `AED` / `Dirham`, `INR` / `Rs` / `Rupee`); the lead's digitized quote is never sniffed. A Singapore quote that writes "RM" (e.g. "STORE RM") trips it (case-sensitive `\bRM\b`) — hand-off B. EGP has no pattern. The panel's heading says "yet", the server line does not.
- Data: —
- States: error.
- Words: *"Cross-currency comparisons aren't supported yet"*; server line *"Cross-currency comparisons aren't supported. Studio currency: <code>. Detected: <codes>."*; *"All uploaded quotes must be in your studio's currency. Convert externally if needed and re-upload."*; *"Start over"*.
- Reachable: yes.

---

## The result — verdict runs (the current flow)

### A-30 · Which result view a row gets
- Where: `PAGE:312-402`; `Q:56-77`.
- Entry: `step = result` (after a run, a recent comparison, or `?xrayId=`).
- Does: loading → A-28; no row (404, another studio's id, deleted, or any fetch error) → a card; `kind: "combined"` → A-61 / A-63; `kind: "verdict"` → the verdict view (A-31…A-53); `objective: "verdict"` with no synthesis → a card; anything else → the legacy single-objective frame (A-61).
- Rules: the not-loaded card prints the raw row id. Rows are cached 60 s.
- Data: `GET /api/quote-xrays/records/<id>`.
- States: as cited.
- Words: *"X-Ray <id> could not be loaded."* + *"Start a new X-Ray"*; *"This comparison has no stored result."* + *"Start a new comparison"*.
- Reachable: yes.

### A-31 · Around the verdict: back, new, scroll, context
- Where: `PAGE:55-61, 159-188`; `VV:55`.
- Entry: a verdict result.
- Does: the page scrolls to the top when a result appears; the header offers only *"New comparison"* (no PDF, A-53); *"Back to Quote X-Ray"* does the same reset. The verdict is one centred column (max 672 px).
- Rules: the verdict shows no date, lead, creator, file names or link back to the lead, and cannot be deleted from here. Both back controls wipe the setup (A-07).
- Data: —
- States: —
- Words: *"New comparison"*, *"Back to Quote X-Ray"*.
- Reachable: yes.

### A-32 · Headline: who is compared
- Where: `VV:51-52, 57-62`.
- Entry: a verdict result.
- Does: a caption naming both sides; the parenthesis is dropped when the own label is "our quote" / "your quote".
- Rules: the studio's name stands for the quote; which lead quote was defended is not shown (A-20).
- Data: `inputs.quotes[0].label`, `headline.competitorLabel`.
- States: —
- Words: *"Comparing your quote (<own label>) with the quote from <competitor>"*.
- Reachable: yes.

### A-33 · The one-liner
- Where: `VV:63-65`; `VER:176-186, 234-236`.
- Entry: a verdict result.
- Does: one bold sentence reframing the gap — phrased by the AI from the computed numbers, or the deterministic fallback.
- Rules: fallbacks (hand-off B): raw gap ≤ 0 → *"Our quote is already <X> lower than <competitor> — and covers more."* (reads "0.00 lower" when the totals are equal, and asserts "covers more" unchecked); real gap ≤ 0 → *"<competitor> looks <X> cheaper, but once the missing scope is added back, ours is effectively the lower quote."*; otherwise *"<competitor> is <X> cheaper on paper, but <Y> of that is scope they left out — the real gap is <Z>."* Written server-side in the studio's own currency (contrast A-51).
- Data: `ai_synthesis.headline.oneLiner`.
- States: —
- Words: as cited.
- Reachable: yes.

### A-34 · Three tiles
- Where: `VV:67-86, 188-216`.
- Entry: a verdict result.
- Does: *"Yours (<own label>)"* (or *"Your quote"*), the competitor's name, and *"Real difference"*, each a compact amount (e.g. `S$38.5K`) with the exact amount in a hover / long-press `title`. The difference tile is green when you are cheaper or even like-for-like (a leading "−" when negative), brand-tinted otherwise.
- Rules: direction is carried by colour and sign only — no words. Labels truncate. A file with no readable total shows 0 (A-24).
- Data: `headline.ownTotalCents, competitorTotalCents, realGapCents`.
- States: —
- Words: *"Yours (<own label>)"*, *"Your quote"*, *"<competitor>"*, *"Real difference"*.
- Reachable: yes.

### A-35 · The "on paper" line
- Where: `VV:88-99`.
- Entry: a verdict result where either side leaves out priced scope.
- Does: one caption from paper gap to real gap.
- Rules: amounts are absolute (no direction). The unpriced count shows only when the line shows, and unpriced one-sided items are never listed by name anywhere (A-47).
- Data: `headline.rawGapCents, missingScopeValueCents, ownMissingScopeValueCents, unpricedMissingCount`.
- States: hidden when both scope values are 0.
- Words: *"On paper the difference is <X>"* + *" — but their quote leaves out <Y> of work your quote includes"* + *" (and yours leaves out <Z> of theirs)"* + *", plus <n> item(s) with no price given"* + *"."*
- Reachable: yes.

### A-36 · "Say this" — the talking points
- Where: `VV:102-129`; `T:4703-4715`; selection `VER:209-251`.
- Entry: a verdict with ≥1 point.
- Does: a card titled *"Say this"*: up to three numbered sentences in curly quotes, each with its evidence line (A-37).
- Rules: read-only — no edit, reorder, hide, copy-one or regenerate. A lone medium-confidence point is dropped server-side (then A-38 shows). Points reach the client only through the WhatsApp draft (A-39).
- Data: `ai_synthesis.points[].sayThis, evidence, confidence`.
- States: —
- Words: *"Say this"*; *"“<sentence>”"*.
- Reachable: yes.

### A-37 · Evidence labels and "say this as a question"
- Where: `VV:22-30, 116-123`; facts `VER:66-165`.
- Entry: under each point.
- Does: *"<evidence label> · <detail>"*, plus a yellow chip on medium-confidence points (market-rate and brand points in the fixture).
- Rules: the details are the engine's candidate facts in the studio's voice, e.g. *"\"<item>\" (<category>) is in our quote at <X> but does not appear in <competitor> — the client would likely pay for it later."* (hand-off B). The label *"Only in your quote"* (`unique-value`) is dead — no fact of that type is ever built (`VER:66-165`).
- Data: `evidence.type, detail`.
- States: —
- Words: *"Missing from their quote"*, *"Only in your quote"* (dead), *"Priced below market"*, *"Same item, different price"*, *"Their numbers don't add up"*, *"Material difference"*, *"Brand difference"*; chip *"say this as a question"*.
- Reachable: yes.

### A-38 · No talking points
- Where: `VV:130-137`.
- Entry: zero points.
- Does: a plain card in place of *"Say this"*.
- Rules: the WhatsApp draft then has only its opener, gap line and closer (A-39).
- Data: —
- States: empty.
- Words: *"No single line stood out — lean on the numbers above: the like-for-like gap is the story here."*
- Reachable: yes.

### A-39 · "Send comparison to client" — the draft dialog
- Where: `VV:139-148`; `STC:18-102`; drafts `VER:189-208, 238-248, 358-366`.
- Entry: the full-width primary button under the points.
- Does: a small dialog: an editable textarea seeded with the run's WhatsApp message, *"Reset to draft"*, a character count, *"Copy"* and *"Open WhatsApp"*.
- Rules: edits are never saved — the dialog re-seeds from the stored draft on every open. The stored draft is ≤1,200 characters (server cut), carries no link and never names the other studio (prompt rules); an AI draft with no digits is rebuilt deterministically. The fallback draft (keyless or no digits) is *"I had a proper look at the other quote you received. A few things you should know before comparing on price:"*, the numbered points, *"So like-for-like, the real difference between the two quotes is <real>, not <raw>."* or *"Our quote is already <X> lower for the work covered."*, and *"Happy to sit down and go through both quotes line by line whenever suits you."* (hand-off B). The counter never warns.
- Data: `ai_synthesis.whatsappMessage` (read only).
- States: *"Copy"* / *"Open WhatsApp"* disabled on an empty draft.
- Words: *"Send comparison to client"*; title *"Send to client"*; *"Edit the message so it sounds like you, then copy it into your WhatsApp chat with the client."*; *"Reset to draft"*; *"<n> characters"*; *"Copy"* / *"Copied"*; *"Open WhatsApp"*; textarea label *"Client message draft"*; close *"Close"* (screen reader).
- Reachable: yes.

### A-40 · Copy and WhatsApp mechanics
- Where: `STC:47-67`.
- Entry: the dialog's buttons.
- Does: *"Copy"* puts the trimmed draft on the clipboard (toast; the button reads *"Copied"* until the next edit); *"Open WhatsApp"* opens `https://api.whatsapp.com/send?text=<draft>` in a new tab — WhatsApp's own chat picker, no phone number.
- Rules: the lead's phone is not used even when the run came from a lead (deliberate); nothing records that a message went out; the dialog stays open after either action.
- Data: —
- States: clipboard-failure toast.
- Words: *"Message copied — paste it into WhatsApp."*; *"Couldn't copy — select the text and copy manually."*
- Reachable: yes.

### A-41 · What a verdict cannot do
- Where: `src/lib/quote-xray/shareability.ts:12-21`; `PAGE:165-170`; `Q:299-301`.
- Entry: —
- Does: a verdict has no share link, public page, PDF, email, outcome capture, lead attachment, status, rename, or delete-from-result.
- Rules: recorded product decision: "the rebuilt flow's client artifact is an editable WhatsApp message, not a portal page (product decision 2026-08)". The public changelog and PRD still promise a private link (A-94).
- Data: —
- States: —
- Words: —
- Reachable: —

### A-42 · "Key points you can use" — when it arrives
- Where: `VV:150-151, 222-225`; polling `PAGE:65-78`; enrichment `CR:738-749`; kill switch `src/lib/quote-xray/brand-dossier-service.ts:122-141` (hand-off C).
- Entry: a verdict whose quotes name brands that differ.
- Does: brand research runs after the response (up to three unseen brands scanned inline). While the run created **in this page session** is open, the page re-fetches it every 8 s until `brand_ammo` appears or 90 s pass; the card then appears between the send button and the breakdown.
- Rules: runs without differing brands still poll the full 90 s. Other rows opened from history never poll. The card hides when it has no issues, advantages or clean brands. Off when `platform_config.quote_xray_brand_ammo_enabled` is false or unreadable (on when the key is absent) and without live AI. Never on a client surface and never fed into the draft.
- Data: `quote_xrays.brand_ammo` (`T:4749-4782`).
- States: absent until written.
- Words: *"Key points you can use"* (the admin page calls it "Quote X-Ray's Ammo panel", `src/app/admin/brand-dossiers/page.tsx:60`).
- Reachable: behind flag `platform_config.quote_xray_brand_ammo_enabled` + live AI.

### A-43 · Key points: your brand advantages
- Where: `VV:234-263`.
- Entry: your quote names a brand the other does not.
- Does: a green card per brand: brand, category, a *"your advantage"* chip, one sentence, source links (domain names, new tab).
- Rules: the sentence asserts the other quote names no brand there (from brand extraction — hand-off B / C).
- Data: `brand_ammo.ownAdvantages[]`.
- States: —
- Words: *"your advantage"*; *"Your quote names <brand> — and users rate it well: <claim>"* or *"Your quote names <brand>."*, then *" The other quote doesn't say what brand the client would get."*
- Reachable: behind the flag (A-42).

### A-44 · Key points: issues in their quote
- Where: `VV:265-301`.
- Entry: brands in the other quote with sourced negatives.
- Does: a card per finding: brand, *"<category> · in their quote"*, an impact chip, the claim, an italic suggested question, and ≥2 source links.
- Rules: positive findings are filtered out here too (backstop). `notable` → high, anything else → mild.
- Data: `brand_ammo.findings[]`.
- States: —
- Words: *"<category> · in their quote"*; *"Impact: high"*, *"Impact: mild"*.
- Reachable: behind the flag.

### A-45 · Key points: brands with nothing found
- Where: `VV:303-307`.
- Entry: scanned brands without citable issues.
- Does: one reassurance line.
- Rules: —
- Data: `brand_ammo.cleanBrands`.
- States: —
- Words: *"We also checked <brands> — users report no real problems."*
- Reachable: behind the flag.

### A-46 · "See the full item-by-item comparison"
- Where: `VV:153-183`; `SH/CollapsibleDisclosure.tsx:17-42`.
- Entry: the foot of the verdict, closed by default.
- Does: one disclosure holding A-47, A-48 and A-49; the hint counts every matched row.
- Rules: the two lists are recomputed on screen from the stored match matrix with the same pure module the server used (`computeRealGap`), not read from the verdict.
- Data: `match_result`.
- States: closed.
- Words: *"See the full item-by-item comparison"*; hint *"<n> items compared"*.
- Reachable: yes.

### A-47 · "Not in <competitor>'s quote"
- Where: `VV:48, 158-165, 312-343`.
- Entry: inside the disclosure, when the other quote lacks priced items.
- Does: a green-headed list, biggest first: item, category, your line's amount.
- Rules: unpriced one-sided rows are left out (counted only in A-35). With the fallback name the heading reads *"Not in The other quote's quote"*.
- Data: `match_result.matrix`.
- States: hidden when empty.
- Words: *"Not in <competitor>'s quote"* (uppercase styling).
- Reachable: yes.

### A-48 · "Not in your quote (be ready if the client asks)"
- Where: `VV:49, 166-173`.
- Entry: inside the disclosure, when your quote lacks priced items.
- Does: a yellow-headed list: item, category, the other quote's amount.
- Rules: these rows appear nowhere else in the verdict (the table drops them, A-49).
- Data: as A-47.
- States: hidden when empty.
- Words: *"Not in your quote (be ready if the client asks)"* (uppercase styling).
- Reachable: yes.

### A-49 · The line-by-line table in a verdict
- Where: `VV:174-182`; `SH/VarianceTable.tsx:22-154`.
- Entry: inside the disclosure.
- Does: one row per item your quote has: item, an amount per quote (*"—"* when absent), the difference against the cheapest other quote, and an *"AI note"* column; AI-joined rows carry an *"AI-matched · <n>%"* chip.
- Rules: the verdict passes no notes, so every *"AI note"* cell is *"—"* (plus the link of A-50); no un-merge here (legacy Gap Finder only, A-69). The subtitle says *"Matched scope only"* but own-only rows are listed (difference *"—"*) while other-only rows are dropped. A cheaper line shows a green down arrow and an amount like `S$-1,234.00`. Scrolls sideways when narrow.
- Data: `match_result`, `inputs.quotes[].label`.
- States: empty → *"No comparable line items between your quote and the competitors."*
- Words: *"Line-by-line variance"*; *"Matched scope only. Delta vs. cheapest competitor."*; heads *"Item"*, *"<quote labels>"*, *"Δ vs cheapest"*, *"AI note"*; *"AI-matched · <n>%"* (tooltip *"Matched across quotes by AI despite different wording"*); *"0"*; *"+<X>"*.
- Reachable: yes.

### A-50 · "Fix in Quote Digitizer"
- Where: `SH/FixInDigitizerLink.tsx:7-29`; per row at `SH/VarianceTable.tsx:124`.
- Entry: every table row when the run is linked to a lead.
- Does: links to `/tools/quote-digitizer?leadId=<lead>`.
- Rules: the digitizer page never reads `leadId` (`src/app/(main)/tools/quote-digitizer/page.tsx:36` starts with no lead and has no `useSearchParams`) — the link opens an empty digitizer. Repeated on every row regardless of the row. Comment: X-Ray is read-only "by design (spec §15.3)".
- Data: `quote_xrays.lead_id`.
- States: hidden without a lead.
- Words: *"Fix in Quote Digitizer"*.
- Reachable: yes (the destination ignores it).

### A-51 · Every amount on a result reads "S$"
- Where: `VV:34-36` and every `formatCurrencyFromCents(…, xray.currencyCode)` / `formatCompactCurrency(…)` in `SH/*`, `VIEWS/*`, `PUB`, `RPT:39`; `src/lib/region-config.ts:552-557, 630-659, 680-696`.
- Entry: every amount on every result, on the public page and in the PDF.
- Does: formats with the row's currency **code** (`SGD`, `MYR`, `AED`, `INR`, `EGP`) where the formatter expects a **country** code; unknown "countries" fall back to Singapore.
- Rules: Malaysian, UAE, Indian and Egyptian studios see `S$` on every tile, list, table, PDF line and public page, while the server-written sentences (one-liner, evidence, draft) and the setup chip (A-12) use their own currency — the same card mixes `RM` and `S$`. Singapore is right by accident. `MethodologyPanel` maps the code correctly (A-79).
- Data: `quote_xrays.currency_code`.
- States: —
- Words: —
- Reachable: yes.

### A-52 · Printing a verdict
- Where: `src/app/globals.css:2661-2686`; `VV:55`.
- Entry: the browser's print (there is no button).
- Does: the global print rule hides everything except `.xray-print-area`; the verdict carries no such class, so a printed verdict is a blank page.
- Rules: the rule is not scoped to X-Ray (Uncertain 3).
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-53 · No PDF for a verdict
- Where: `PAGE:163-170`.
- Entry: —
- Does: *"Download PDF"* renders only when the row is not a verdict.
- Rules: the rebuild commit lists "PDF for new runs" among what it killed.
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Recent comparisons (history)

### A-54 · The panel and when it shows
- Where: `PAGE:80-87, 193-216`; `HIST:1-28, 92-108`.
- Entry: the setup step.
- Does: a slim card beside the setup (a third of the width at ≥1024 px; under the setup below that) listing the studio's latest verdict comparisons. While the list loads, a three-row skeleton holds the column; once loaded with no verdict rows, the column goes away and the setup takes the full width.
- Rules: a failed list looks like "no history" (the panel just does not appear). Not shown on the result step.
- Data: `GET /api/quote-xrays/records` (`Q:40-54`) — every row of the studio **with its full `inputs`, `match_result`, `ai_synthesis` and `brand_ammo`**, to draw five lines; cached 60 s.
- States: skeleton; hidden when empty.
- Words: *"Recent comparisons"* (uppercase styling).
- Reachable: yes.

### A-55 · A row
- Where: `HIST:22-28, 49-88`.
- Entry: the panel.
- Does: newest first, at most five rows: *"vs <competitor>"*, the date (browser-locale date, no time), a chevron and a trash button; under them a grey *"+<n> older"*.
- Rules: *"+<n> older"* is plain text — runs beyond the fifth cannot be opened from the UI at all (no "view all", paging or search). A row shows no lead, creator, own quote, totals or gap; runs against files without a letterhead all read *"vs The other quote"* and differ only by date.
- Data: `ai_synthesis.headline.competitorLabel`, `created_at`.
- States: —
- Words: *"vs <competitor>"*; *"+<n> older"*.
- Reachable: yes.

### A-56 · Opening a recent comparison
- Where: `HIST:54-68`; `PAGE:213-215`.
- Entry: a row.
- Does: switches the page to that result (A-30).
- Rules: the URL is not updated (A-03); the lead is not restored into the setup; no brand-research polling (A-42).
- Data: as A-30.
- States: A-28 while loading.
- Words: —
- Reachable: yes.

### A-57 · Deleting a comparison
- Where: `HIST:30-39, 69-78`; `Q:304-317`; `src/app/api/quote-xrays/[id]/route.ts:216-239`.
- Entry: a row's trash button.
- Does: a browser confirm, then a hard delete; a toast; the list refreshes.
- Rules: any member can delete any comparison of the studio — no creator or role check (hand-off C). No undo, no trash. The run's anonymised market observations stay (by design). Every trash button disables while one delete runs. Legacy rows cannot be deleted from the UI (hidden, A-60).
- Data: deletes the `quote_xrays` row.
- States: —
- Words: *"Delete this comparison from your history? This can't be undone."*; *"Comparison deleted."*; *"Couldn't delete that comparison."*; button label *"Delete comparison"*.
- Reachable: yes.

### A-58 · Not built: rename, search, filters, a lead's history
- Where: `HIST`; `Q:40-54` (the `leadId` filter is never passed).
- Entry: —
- Does: a comparison cannot be renamed, searched, filtered, grouped by lead or seen from the lead or its activity.
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### A-59 · Whose comparisons are listed
- Where: `src/app/api/quote-xrays/records/route.ts:66-91`; the picker's list `src/context/app-context.tsx:123`.
- Entry: —
- Does: the history is studio-wide: a designer sees, opens and can delete every member's comparisons, including those for leads the lead picker hides from them.
- Rules: permissions hand-off C.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-60 · Legacy rows are hidden
- Where: `HIST:3-5, 22-25`; `PAGE:83-87`.
- Entry: —
- Does: only `objective = "verdict"` rows are listed; pre-rebuild rows (single-objective and combined) are hidden "regardless of whether the environment's purge has run" and do not reserve the column.
- Rules: the rebuild commit says staging's legacy rows were purged; no purge exists in the repo (hand-off D). Hidden legacy rows open only by a typed `?xrayId=` (A-61…A-89) and cannot be deleted.
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Legacy results (rows from before 2026-08-14, read-only)

### A-61 · The legacy result frame
- Where: `PAGE:338-357, 373-401, 297-310`; `src/lib/quote-xray/combined-number.ts:6-12`; `src/lib/quote-xray/normalise-synthesis.ts:14-73`.
- Entry: `?xrayId=<legacy row>` only.
- Does: a badge and the creation date-time (browser locale), the stats bar (A-62), then the view. Single-objective rows: the objective's badge and view (A-64, A-70, A-80, A-81). Combined rows: *"Comparison <n>"* — its position among the studio's combined runs, oldest = 1 (*"Comparison"* if not found) — and the tabbed view (A-63). The synthesis is normalised so missing fields render empty rather than crash.
- Rules: no new row of these shapes can be made from the UI (the multi-objective create hook `useCreateQuoteXray`, `Q:112-163`, has no caller). A single-objective row with an unreadable synthesis shows only the badge and stats bar. The header shows *"Download PDF"* (A-83) and *"New comparison"*.
- Data: `objective`, `ai_synthesis.kind`, `created_at`.
- States: —
- Words: *"Gap Finder"*, *"Sales Justifier"*, *"Market Intel"*, *"Package Ladder"*; *"Comparison <n>"*, *"Comparison"*.
- Reachable: no (dead in the UI) — only a hand-typed `?xrayId=`.

### A-62 · The stats bar
- Where: `SH/XrayStatsBar.tsx:15-125`; `src/lib/quote-xray/xray-stats.ts:28-74`.
- Entry: legacy results only (verdicts do not show it).
- Does: a summary line; one chip per quote (role dot, *"Your quote"* / *"Competitor"*, label, total, item count); four metrics: rows compared, rows in ≥2 quotes, rows in one quote, max − min total.
- Rules: totals come from the match totals, else the parsed grand total; *"—"* when unknown. Pure code, no AI.
- Data: `inputs`, `match_result`.
- States: hidden with no quotes.
- Words: *"Scan complete"* + *" — <n> line item(s) compared across <m> quote(s)."*; *"Your quote"*, *"Competitor"*; *"<n> item(s)"*; *"Compared"*, *"Shared"*, *"Unique to one"*, *"Total spread"* (uppercase styling).
- Reachable: no (dead in the UI).

### A-63 · Combined runs: tabs and the weak-tab caveat
- Where: `VIEWS/CombinedResultView.tsx:21-109`.
- Entry: a combined legacy row.
- Does: a tab strip (*"Gap Finder"*, *"Sales Justifier"*, *"Market Intel"*, *"Package Ladder"*) opening on the stored primary; a yellow dot marks a tab that did not fit the uploads and a caveat explains it; a tab with no result shows a dash and a message.
- Rules: the caveats say "mark which upload is yours on the entry screen" — the entry screen has had no role marking since the rebuild. The tab strip is left out of print.
- Data: `ai_synthesis.primary, results, weak`.
- States: no-result tab message.
- Words: dot label *"May not fit your uploads"*; *"This analysis may not fit what you uploaded."* + *"It compares your quote against a competitor's — mark which upload is yours on the entry screen."* / *"It benchmarks across 2 or more competitor quotes."* / *"It ladders 2 or more versions of your own quote (e.g. Essential / Premium / Luxury)."*; *"We couldn't generate this analysis for the uploaded quotes. Try the other tabs."*
- Reachable: no (dead in the UI).

### A-64 · Gap Finder: the answer card
- Where: `VIEWS/GapFinderView.tsx:23-111`; `src/lib/quote-xray/scope-gaps.ts:42-97`.
- Entry: a Gap Finder row or tab.
- Does: either a green "no gaps" message, or a red headline counting what your quote misses, the top three items (*"Show <n> more"* / *"Show fewer"*) and a flip-side line.
- Rules: gaps are recomputed from the matrix, so they follow un-merges (A-69); a red exclamation glyph leads each item.
- Data: `match_result`, `inputs.quotes[].label`.
- States: —
- Words: *"No gaps — your quote covers everything the other quote does."*; *"You even include <n> thing(s) they don't."*; *"Your quote is missing <n> thing(s) the other quote covers"* + *" — biggest first."*; *"The other quote includes <item> (~<X>) — yours doesn't."*; *"Show <n> more"*, *"Show fewer"*; *"On the flip side, you include <n> thing(s) they don't — see the full breakdown below."*
- Reachable: no (dead in the UI).

### A-65 · Gap Finder: the full breakdown
- Where: `VIEWS/GapFinderView.tsx:113-167`.
- Entry: the disclosure under the answer card (closed).
- Does: *"What to do before your next call"* (the AI brief, numbered), the scope-gap panel (A-66), three risk cards (A-67), the coverage matrix (A-68) and the variance table with the AI's notes and un-merge (A-49, A-69).
- Rules: its own disclosure code (the shared `CollapsibleDisclosure` copies it).
- Data: `ai_synthesis.brief, risk, coverage, notes`.
- States: the brief hides when empty.
- Words: *"Full breakdown — what to do, your strengths, pricing & line-by-line"*; *"What to do before your next call"*.
- Reachable: no (dead in the UI).

### A-66 · The scope-gaps panel
- Where: `SH/ScopeGapPanel.tsx:18-127`; `SH/CollapsibleSection.tsx:22-84`.
- Entry: A-65.
- Does: an open collapsible section with two columns — competitor-only and own-only items — each grouped by category (collapsible groups with counts) with amounts; competitor items say which quotes include them.
- Rules: the subtitle becomes an AI-match transparency note when any row was joined by AI.
- Data: `match_result`.
- States: *"No scope gaps — every item appears in both quotes."*; per-column empties.
- Words: *"Scope gaps"*; *"<n> item(s) matched despite different wording — not counted as gaps."* / *"Items in one quote but not the other, grouped by category."*; *"Only in the competitor's quote"* *"(<n>)"*, *"Scope you may have missed."*, *"Nothing the competitor covers that you don't."*; *"Only in your quote"*, *"What only you include — highlight this."*, *"No items unique to your quote."*
- Reachable: no (dead in the UI).

### A-67 · Risk cards
- Where: `VIEWS/GapFinderView.tsx:148-153, 172-198`.
- Entry: A-65.
- Does: three cards, each a count and an impact amount.
- Rules: stored AI counts, not recomputed after an un-merge — they can disagree with A-64 / A-66.
- Data: `ai_synthesis.risk`.
- States: —
- Words: *"Missing scope"*, *"Over-priced lines"*, *"Under-priced lines"* (uppercase styling); *"<X> impact"*.
- Reachable: no (dead in the UI).

### A-68 · The coverage matrix
- Where: `SH/CoverageMatrix.tsx:13-71`.
- Entry: A-65.
- Does: categories × quotes with Present / Partial / Missing chips.
- Rules: a cell with no data renders *"Missing"*. Stored AI output.
- Data: `ai_synthesis.coverage`.
- States: hidden when empty.
- Words: *"Coverage matrix"*; *"Which categories are present in each quote."*; *"Category"*; *"Present"*, *"Partial"*, *"Missing"*.
- Reachable: no (dead in the UI).

### A-69 · Un-merge an AI match
- Where: `SH/VarianceTable.tsx:71-100`; `VIEWS/GapFinderView.tsx:28, 36-44`; `Q:279-297`; `src/app/api/quote-xrays/[id]/route.ts:150-184`.
- Entry: a variance row the AI joined from ≥2 originals (Gap Finder only).
- Does: splits the row back into its originals, saves the matrix, toasts.
- Rules: only the matrix changes — the stored risk, coverage, notes and brief are not recomputed. No re-merge or undo. Not offered on verdicts.
- Data: `quote_xrays.match_result` (`aiMergedFrom`).
- States: disabled while saving.
- Words: *"Un-merge"* (tooltip *"Not the same item? Split this match back apart."*); *"Match split — treated as separate items."*; *"Could not un-merge that match."*
- Reachable: no (dead in the UI).

### A-70 · Sales Justifier: hero and apples-to-apples
- Where: `VIEWS/SalesJustifierView.tsx:27-94, 189-198`.
- Entry: a Sales Justifier row or tab.
- Does: a *"Share with client"* button (A-84); a hero with the AI headline and three figures; an apples-to-apples card with raw and normalised deltas (red when positive, else green) and the AI explanation.
- Rules: stored AI figures.
- Data: `ai_synthesis.hero, applesToApples`.
- States: —
- Words: *"Share with client"*; *"Why this quote is the better choice"* (uppercase styling); *"Your quote"*, *"Cheapest competitor"*, *"Extra scope you include"* (*"+<X>"*); *"Apples-to-apples"*; *"Raw delta"*, *"Normalised delta"*.
- Reachable: no (dead in the UI).

### A-71 · Market positioning (studio wording)
- Where: `SH/MarketPositioningCard.tsx:20-162`; `VIEWS/SalesJustifierView.tsx:96-103`.
- Entry: Sales Justifier, when benchmarks exist.
- Does: how many benchmarked categories sit at or below the market median, then per category a range rail (market band, typical tick, your median dot), a position chip and the numbers.
- Rules: an unfinished comment line at `:18`; `sampleSize` is never shown. Code-computed numbers (hand-off B).
- Data: `ai_synthesis.marketPositioning`.
- States: hidden with no categories.
- Words: *"Market positioning"*; *"How your per-unit pricing compares to real cross-studio market rates."*; *"<a> of <b>"* + *" benchmarked category is / categories are priced at or below the market median."*; *"Below market"*, *"At market"*, *"Above market"*; *"category estimate"*; *"Market <min> – <max>"* + *" (typical <X>)"*; *"This quote <X>"*; tooltips *"Market typical <X>"*, *"This quote <X>"*; *"Based on aggregated cross-studio market rates. Per-unit comparison; like-for-like units only."*
- Reachable: no (dead in the UI).

### A-72 · The value stack
- Where: `SH/ValueStack.tsx:17-53`; `VIEWS/SalesJustifierView.tsx:105-111`.
- Entry: Sales Justifier.
- Does: cards of what only your quote includes: icon, title, optional retail value, description, and the cited line of your quote.
- Rules: the same component, unchanged, renders on the homeowner's page (A-87).
- Data: `ai_synthesis.valueStack`.
- States: empty → a dashed card.
- Words: *"What only your quote includes"*; *"~<X> value"*; *'From your quote: "<line>"'*; empty *"No differentiating value claims could be cited from your quote. Add more detail in Quote Digitizer."*
- Reachable: no (dead in the UI).

### A-73 · Sales Justifier: the full breakdown
- Where: `VIEWS/SalesJustifierView.tsx:116-176`.
- Entry: the disclosure (closed).
- Does: A-74…A-79, in that order.
- Rules: —
- Data: —
- States: —
- Words: *"Full breakdown — head-to-head, price & brand checks, methodology"*.
- Reachable: no (dead in the UI).

### A-74 · Same items, compared side by side
- Where: `SH/MatchedItemDefense.tsx:18-78`.
- Entry: A-73; the public page (client wording).
- Does: an open section of items both quotes include, by category: item, *"You <X> · <competitor> <Y>"*, then either a green *"<X> less"* chip (yours cheaper) or *"+<X>"* with the AI's justification or a fallback line.
- Rules: the studio and client variants differ only in the subtitle and "You" / "Our price".
- Data: `ai_synthesis.matchedItemDefense`.
- States: hidden when empty.
- Words: *"Same items, compared side by side"* *"(<n>)"*; *"Head-to-head on items that appear in both quotes."* / client *"How this quote compares on the items both quotes include."*; *"You"* / *"Our price"*; *"<X> less"*; *"Worth confirming exactly what the other quote includes for this line."*
- Reachable: no (dead in the UI).

### A-75 · Prices worth questioning
- Where: `SH/BelowMarketFlags.tsx:18-72`.
- Entry: A-73; the public page.
- Does: the other quote's lines below the market band, by category: item, their unit price vs typical, a *"<n>% below"* chip with its severity, and a fixed advice line.
- Rules: —
- Data: `ai_synthesis.belowMarketFlags`.
- States: hidden when empty.
- Words: *"Prices worth questioning"*; *"Competitor lines priced below the real market rate — a cheaper spec or cut scope may be hiding here."* / client *"Lines in the other quote priced noticeably below the typical market rate."*; *"<label>: <X>/<unit> · market typical <Y>/<unit>"* + *" · category estimate"*; *"Worth confirming the exact specification and inclusions for this line."*; *"<n>% below"*; *"Well below market"*, *"Below market"*.
- Reachable: no (dead in the UI).

### A-76 · Brand & supplier differences
- Where: `SH/BrandComparison.tsx:17-85`.
- Entry: A-73; the public page.
- Does: your brands on a green strip, the other quote's differing brands by category, then five fixed questions.
- Rules: neutral by design (the code "never assert[s] anything ABOUT a brand").
- Data: `ai_synthesis.brandComparison`.
- States: hidden with no differing brands.
- Words: *"Brand & supplier differences"*; *"Brands the other quote names that yours doesn't — with questions to raise."* / client *"Where the two quotes name different brands, here's what's worth checking."*; *"You specified: "* / *"Our quote specifies: "*; *"<label> specifies <brand> for <item>."*; *"Questions worth asking about a different brand"*; *"Warranty length and who honours it"*, *"Country of origin / manufacturer"*, *"Material grade, thickness or finish"*, *"Certifications or compliance standards"*, *"Who supplies, installs and services it"*.
- Reachable: no (dead in the UI).

### A-77 · Figures worth double-checking
- Where: `SH/ArithmeticFlags.tsx:18-58`.
- Entry: A-73; the public page (the other quote's lines only).
- Does: lines whose stated total ≠ unit price × quantity, by category; the studio view tags each *"your quote"* or with the quote's label.
- Rules: the client variant hides your own slips.
- Data: `ai_synthesis.arithmeticFlags`.
- States: hidden when none visible.
- Words: *"Figures worth double-checking"* / client *"Figures worth confirming"*; *"Lines where the stated total doesn't equal unit price × quantity."* / client *"Lines where the total doesn't match price × quantity."*; *"your quote"*; *"Stated <X> · but <Y> × <qty> = <Z>"*.
- Reachable: no (dead in the UI).

### A-78 · Watch-outs in competitor quotes
- Where: `VIEWS/SalesJustifierView.tsx:145-167`.
- Entry: A-73.
- Does: the AI's risks per competitor, with the affected line quoted.
- Rules: the public page shows the same list without the competitor's name (A-87).
- Data: `ai_synthesis.competitorRisks`.
- States: hidden when empty.
- Words: *"Watch-outs in competitor quotes"*; *"<label>: <risk>"*; *"Re: “<line>”"*.
- Reachable: no (dead in the UI).

### A-79 · How this comparison was prepared
- Where: `SH/MethodologyPanel.tsx:16-78`.
- Entry: A-73; the public page.
- Does: three or four bullets on method and provenance, then a disclaimer.
- Rules: the market name comes from the currency code (`SGD` Singapore, `MYR` Malaysia, `AED` the UAE, `INR` India, else "your region"); the benchmark bullet shows only when the run referenced benchmark items.
- Data: `ai_synthesis` (positioning, flags), quote count.
- States: —
- Words: *"How this comparison was prepared"*; *"Compares the <n> quote(s) provided, line by line."*; *"Line items are matched by unit; items worded differently but covering the same work are treated as the same, and anything without a confident match is labelled as an estimate."*; *"Prices are checked against <n> aggregated market benchmark rate(s) for <market> — indicative ranges, not quotes from any specific company."*; *"Competitor pricing is taken directly from the uploaded quote."* / client *"Pricing shown for the other quote is taken directly from the document you shared with your designer."*; *"This is an indicative comparison to help weigh the quotes — not a formal valuation, appraisal, or guarantee."*
- Reachable: no (dead in the UI).

### A-80 · Market Intel
- Where: `VIEWS/MarketIntelView.tsx:20-145`; `SH/CategoryHeatmap.tsx:12-73`.
- Entry: a Market Intel row or tab.
- Does: an anonymisation notice; a heatmap (categories × *"Quote <n>"*, Low / Mid / High); a disclosure with pricing bands (p25 / p50 / p75 / benchmark), anomalies and scope patterns (% present + class chip).
- Rules: a heatmap cell with no data defaults to *"Mid"*. Quotes are numbered, never named.
- Data: `ai_synthesis.heatmap, percentiles, anomalies, scopePatterns`.
- States: the disclosure hides when all three lists are empty.
- Words: *"Studio and client names are stripped. This view is for market research only."*; *"Where each quote sits per category"*; *"Relative ranking across the uploaded set. Names anonymised."*; *"Category"*, *"Quote <n>"*; *"Low"*, *"Mid"*, *"High"*; *"Detailed data — pricing bands, anomalies & scope patterns"*; *"Pricing bands per category"*; *"p25"*, *"p50"*, *"p75"*, *"Benchmark"*; *"Anomalies"*; *"Quote <n> — “<item>” priced at <X>/unit vs. median <Y> (<m>×)"*; *"What's table stakes vs. differentiator"*; *"Table stakes"*, *"Common"*, *"Differentiator"*.
- Reachable: no (dead in the UI).

### A-81 · Package Ladder
- Where: `VIEWS/PackageLadderView.tsx:19-102`; `SH/TierLadderCard.tsx:15-89`.
- Entry: a Package Ladder row or tab.
- Does: a recommendation banner; a card per tier (total, margin or a cost-price hint, when to sell, talking points; *"Push this"* on the recommended one); a disclosure of the steps between tiers (client, cost, margin, notable changes).
- Rules: margins show only when the AI could derive costs (hand-off B).
- Data: `ai_synthesis.tiers, deltas, recommendation`.
- States: the disclosure hides with no deltas.
- Words: *"Recommendation: push <tier | the middle tier>"*; *"Push this"*; *"Tier"*; *"total to client"*; *"<X> margin"*, *"<n.n>%"*; *"Margin view requires cost prices in Quote Digitizer."*; *"Sell this when"*; *"Talking points"*; *"What changes between tiers"*; *"<from> → <to>"*; *"Client: +<X>"*, *"Cost: +<X>"*, *"Margin: +<X>"*.
- Reachable: no (dead in the UI).

### A-82 · Printing a legacy result
- Where: `PAGE:342, 378`; `src/app/globals.css:2661-2686`; `VIEWS/CombinedResultView.tsx:50`.
- Entry: the browser's print.
- Does: prints only the result area (badge, stats, view), keeping tinted backgrounds and avoiding breaks inside cards; the tab strip is hidden, the *"Share with client"* button is not.
- Rules: collapsed disclosures print collapsed.
- Data: —
- States: —
- Words: —
- Reachable: no (dead in the UI).

### A-83 · "Download PDF" (legacy rows)
- Where: `PAGE:137-153, 163-170`; `src/lib/quote-xray/download-xray-pdf.ts:14-97`; `RPT:29-216`.
- Entry: the header, on a legacy result.
- Does: builds a text-only A4 PDF in the browser (jsPDF, Helvetica) and downloads `quote-xray-<objective>-<YYYY-MM-DD>.pdf`: a title, a subtitle, *"Quotes"*, *"At a glance"*, then the objective's sections; empty sections are skipped; the content does not depend on what is expanded on screen.
- Rules: **a combined row gets only the two generic sections** — the report has no `combined` branch — under a subtitle naming the stored primary objective. No studio branding, no tables, no Market Intel heatmap or bands, no Package Ladder steps; Gap Finder follows the current matrix. Amounts in `S$` for everyone (A-51).
- Data: the row.
- States: *"Preparing…"* while building; failure toast.
- Words: *"Download PDF"* / *"Preparing…"*; *"Couldn't generate the PDF. Please try again."*; in the PDF *"Quote X-Ray"*; *"<objective> · <date> · <currency code>"* (the label map includes an unused *"Verdict"*); *"Quotes"* (*"<label> · Your quote | Competitor"* → *"<total> · <n> item(s)"*); *"At a glance"* (*"Line items compared"*, *"Shared (in ≥2 quotes)"*, *"Unique to one quote"*, *"Total price spread"*); Gap Finder *"Gaps — only in the other quote (<n>)"*, *"Only in your quote (<n>)"*, *"What to do before your next call"*, *"Pricing risk"*; Sales Justifier *"Headline"* (*"Your total"*, *"Cheapest competitor"*, *"Extra scope value"*), *"Market positioning — <a>/<b> at or below typical"* (*"you <X>/<unit> · typical <Y>/<unit>"*), *"Head-to-head (items in both quotes)"*, *"Prices worth questioning"*, *"Brand & supplier differences"*; Market Intel *"Scope patterns"*, *"Price anomalies"*; Package Ladder *"Tiers"* (*"Sell when: …"*), *"Recommendation"* (*"Push: <tier>"* / *"Recommended tier"*).
- Reachable: no (dead in the UI).

---

## Share with the client (legacy only)

### A-84 · "Share with client" — the dialog
- Where: `VIEWS/SalesJustifierView.tsx:36-41, 178-184`; `SLD:19-87`; `Q:319-336`; `src/app/api/quote-xrays/[id]/share/route.ts:19-70`.
- Entry: a Sales Justifier view (a single row, or the Sales Justifier tab of a combined row).
- Does: a dialog explaining the link; *"Generate link"* mints a random token valid 24 hours and sets the row's status to `shared`; the link (`<origin>/sign/quote-xray/<token>`) then shows read-only with an icon-only copy button (a tick for 1.5 s), its expiry and *"Regenerate (invalidates old link)"*.
- Rules: an existing token shows even when it has expired — *"Expires <past date>."* with no "expired" wording, and Copy copies a dead link until regenerated. No WhatsApp or email hand-off; the copy button has no accessible name. The gate's refusal (*"This X-Ray has no client-facing view to share."*) cannot be reached from the UI — the button lives only on shareable views.
- Data: `quote_xrays.share_token, share_expires_at, status`.
- States: *"Generating…"*; failure toast.
- Words: *"Share with client"*; title *"Share with the client"*; *"Generates a public link the client can open without logging in. Expires automatically after 24 hours."*; *"Generate link"* / *"Generating…"*; *"Expires <date time>."*; *"Regenerate (invalidates old link)"*; *"Could not copy to clipboard"*; *"Failed to generate link"*, *"Failed to create share link"*.
- Reachable: no (dead in the UI).

### A-85 · Which rows can be shared
- Where: `src/lib/quote-xray/shareability.ts:1-22`; `src/app/api/quote-xrays/[id]/share/route.ts:1-3`.
- Entry: —
- Does: shareable = `objective = "sales-justifier"`, or a combined run holding a Sales Justifier result; verdicts never. The mint and the public resolve use the same test.
- Rules: the share route's header comment still lists "verdict" as shareable — the code says no.
- Data: —
- States: —
- Words: —
- Reachable: —

### A-86 · The public page — loading and unavailable
- Where: `PUB:23-82`; `src/app/api/quote-xrays/share/[token]/route.ts:11-40`; `src/proxy.ts:316-318, 393-396`.
- Entry: the link, no login.
- Does: fetches the row by token; *"Loading…"*, then the page or a *"Link unavailable"* card with the reason.
- Rules: expired → 410, unknown → 404, not shareable → 400. The browser tab shows the product's default title (*"OpenMaison | AI-Powered Studio Software for Designers"*, `src/app/layout.tsx:51-54`); `/sign/` is disallowed to crawlers (`src/app/robots.ts`).
- Data: `quote_xrays` by `share_token`.
- States: loading; unavailable.
- Words: *"Loading…"*; *"Link unavailable"*; *"Invalid or expired link"*, *"Link has expired"*, *"This X-Ray is not shareable"*, *"Lookup failed"*, *"Could not load this link."*, *"This share link has expired or is invalid."*
- Reachable: no (dead in the UI) — links are minted only from A-84 and live 24 h.

### A-87 · The public page — what the homeowner reads
- Where: `PUB:88-241`.
- Entry: a valid link.
- Does: *"Save as PDF"* (A-88); a header; a hero (headline + *"Our quote"*, *"Other quote"*, *"Extra scope included"*); the market comparison (client wording of A-71); *"On equal scope"* (the explanation only, no deltas); the value stack (A-72); same items (A-74), prices worth questioning (A-75), brand differences (A-76), the other quote's arithmetic slips (A-77), *"Things worth asking the other studio"* (the risks without competitor names), the methodology (A-79); a footer with the expiry.
- Rules: **no studio name, logo or contact anywhere** — the footer says "your interior design team". The value stack is the studio component unchanged, so the homeowner reads *'From your quote: "<line>"'* and, when empty, *"No differentiating value claims could be cited from your quote. Add more detail in Quote Digitizer."* Stored quote labels (the old wizard's editable slot names, default *"Competitor 1"*) appear in same-items, price and brand lines. The market card sits before apples-to-apples here, after it in the studio view.
- Data: the row's Sales Justifier result.
- States: —
- Words: *"Save as PDF"*; *"Your quote comparison"* (uppercase styling); *"Why choose this team"*; *"Our quote"*, *"Other quote"*, *"Extra scope included"*; *"Independent market comparison"*, *"How this quote's per-unit rates compare to typical market rates for the region."*; *"On equal scope"*; *"What's only in our quote"*; *"Things worth asking the other studio"*; *"This is a personalised comparison prepared by your interior design team. It expires <date time | soon>."*
- Reachable: no (dead in the UI).

### A-88 · The public page's "Save as PDF"
- Where: `PUB:91-100`; `src/app/globals.css:2661-2686`.
- Entry: the button.
- Does: `window.print()`; only the print area prints, the button hidden.
- Rules: the label is honest — the browser's print dialog, not a download.
- Data: —
- States: —
- Words: *"Save as PDF"*.
- Reachable: no (dead in the UI).

### A-89 · What the public link returns beyond the page
- Where: `src/app/api/quote-xrays/share/[token]/route.ts:35-39`; `src/lib/transformers.ts:3219-3240`.
- Entry: the page's fetch (or anyone holding the link calling the API).
- Does: returns the whole row except `brandAmmo`: both quotes' full parsed line items, the match matrix, the studio, lead and creator ids, the outcome and its note, the token, and — for a combined run — all four analyses, including the Gap Finder's internal *"What to do before your next call"* brief and any Package Ladder margins.
- Rules: the page renders only the Sales Justifier slice; the rest is readable in the network response (hand-off C).
- Data: —
- States: —
- Words: —
- Reachable: no (dead in the UI).

---

## Outcomes and hooks without a screen

### A-90 · Win / loss outcome — removed
- Where: `Q:299-301`; `src/lib/quote-xray/outcomes.ts:6-25`; `src/app/api/quote-xrays/[id]/route.ts:123-145`; the removed `OutcomeSelector` (commit `d000261fa`).
- Entry: none.
- Does: since 2026-08-14 nothing on screen captures or shows an outcome. Before: a strip under the result — *"Did you win this deal?"* with four buttons and *"Used to track your win rate — and, over time, benchmark against the quotes that actually win."* — and a win-rate card on the entry screen.
- Rules: the server action, labels and columns remain; no client calls them (hand-off C / D).
- Data: `quote_xrays.outcome, outcome_note, outcome_at`.
- States: —
- Words: (dead) *"Not recorded"*, *"Won"*, *"Lost — price"*, *"Lost — no response"*, *"Lost — other"*.
- Reachable: no (dead).

### A-91 · Hooks without a caller
- Where: `Q:112-163` (`useCreateQuoteXray`), `Q:233-251` (`useAttachXrayToLead`), `Q:253-275` (`useUpdateQuoteXrayStatus`).
- Entry: none.
- Does: legacy multi-objective create; attach / detach a run to a lead after the fact; set `draft | ready | shared | archived`.
- Rules: no component imports them (grep). So a row's status only ever reads `ready`, or `shared` after a legacy share; nothing archives; a standalone run can never be linked to a lead.
- Data: —
- States: —
- Words: —
- Reachable: no (dead).

---

## Cross-cutting

### A-92 · Phone and tablet
- Where: `VU:116, 215, 248-249, 323, 333`; `PAGE:158, 193-194`; `VV:55, 67-86, 140, 253-254, 290-293`; `SH/VarianceTable.tsx:49`; `STC:27`; `src/app/(main)/layout.tsx:180`.
- Entry: under 1024 px.
- Does: the lead column sits above the other studio's dropzone below 1024 px, and upload mode is side by side from 640 px; the history goes under the setup; mode segments are ≥36 px; the dropzone says "tap"; the verdict is one ≤672 px column with compact tile amounts sized so six figures fit a 375 px phone (exact values in the one-liner, the tooltip and the breakdown); the send button is full width; source links carry extra tap padding; tables scroll sideways; the send dialog is a centred card with 16 px margins, not a sheet; WhatsApp opens the app's chat picker.
- Rules: no navigation entry below 1024 px (A-04). Tile tooltips rely on `title`.
- Data: —
- States: —
- Words: —
- Reachable: yes.

### A-93 · Telemetry
- Where: `CR:724-736`; `src/lib/usage/funnels.ts:56-63`.
- Entry: —
- Does: a verdict run logs `feature_succeeded` (flow, lead linked, own quote from the lead, point counts, brand counts, unknown materials); nothing logs a page open.
- Rules: the admin funnel *"Quote X-Ray"* (*"Opened"* → *"Parsed successfully"*) always shows 0 opens (hand-off C).
- Data: `usage_events`.
- States: —
- Words: *"Quote X-Ray"*, *"Opened"*, *"Parsed successfully"* (admin).
- Reachable: —

### A-94 · Docs and marketing against the code
- Where: `src/components/landing/v2/changelog-data.ts:396-410`; `docs/prd/12-quote-xray.md:27-28, 44-50, 60-63`; `docs/rules/tools.md:25`; `docs/features/portal-merge-integration/uat-findings.md:93`, `uat-qa-sheet.csv` (T3-TL02, T3-TL07), `uat-plan.md:177-181`.
- Entry: —
- Does: (1) The public changelog (*"X-ray any quote in seconds"*) says *"Drop in a quote — yours or a competitor's — and see straight through it."* and *"Share the analysis with a private link."* — a quote is never X-Rayed on its own (it is always set against your quote, from the lead or a second upload) and verdicts have no link. (2) The PRD (2026-06-12, "Launched") describes a single-quote upload scored per line, a shareable public link, and a mount "into the lead drawer's Quotes section" — the drawer only links out (A-02). (3) The rules doc matches the rebuild ("NO shareable portal, NO outcome capture", legacy read-only) but calls the card the "Ammo" panel. (4) The UAT scripts walk the 4-objective picker (*"Find gaps"*, *"Sell to client"*, *"Learn from competitors"*, *"Compare MY tiers"*, *"Run X-Ray"*, *"Sell MY quote to the client"*).
- Rules: full docs audit hand-off C.
- Data: —
- States: —
- Words: *"X-ray any quote in seconds"*; *"AI reads every line and sorts it by trade."*; *"Prices are checked against local market rates, with under- and over-priced items flagged."*; *"Spot the items a quote quietly leaves out."*
- Reachable: —

### A-95 · In-code comments that contradict the code
- Where: as cited.
- Entry: —
- Does: (1) `VU:5-9` — modes "From a lead" / "Upload both quotes … optional lead link" (A-09, A-17). (2) `src/app/api/quote-xrays/[id]/share/route.ts:2` — verdicts shareable (A-85). (3) `PP:11-14` — the stages are "honest" (A-28). (4) `SH/VarianceTable.tsx:45` — *"Matched scope only"* (A-49). (5) `SH/FixInDigitizerLink.tsx:7-9` — routes "back to Quote Digitizer for the bound lead" (A-50). (6) `src/app/globals.css:2661-2664` — prints "only the X-Ray result area" (the rule is app-wide, A-52). (7) `Q:8-12` — one request per file keeps each call small "regardless of how many quotes" (a single file can still exceed the host's cap, A-25). (8) `HIST:5` — "the environment's purge" (none in the repo, A-60). (9) `CR:2-16` — "the wizard … picks an objective" (the UI has no objectives). (10) `src/lib/quote-xray/brand-dossier-service.ts:122-123` — the kill switch "Fails OPEN on read error only if the row is missing entirely" (garbled: a read error turns the card off, a missing key leaves it on — A-42). (11) The parser's "add items manually" (A-23).
- Rules: —
- Data: —
- States: —
- Words: —
- Reachable: —

### A-96 · The Copilot's competitor-quote analysis (adjacent, not X-Ray)
- Where: `src/components/copilot/competitor-quote-view.tsx`; `src/components/copilot/copilot-session.tsx:941-990`; `src/components/copilot/copilot-desktop.tsx:197`; `src/app/api/copilot/competitor-quote/route.ts`.
- Entry: a live Meeting Copilot session → the *"Upload competitor quote"* icon button.
- Does: a separate, one-shot AI read of one competitor image (summary, line items, missing items, hidden costs, pricing gaps, talking points) shown as a feed card and a modal; nothing saved to `quote_xrays`; no link to the X-Ray tool.
- Rules: a second engine for the same job, with its own words and no shared history.
- Data: none persisted (session state).
- States: toasts *"Analyzing competitor quote..."*, *"Competitor quote analyzed"*, *"Quote analysis failed: <status>"*, *"Failed to analyze quote"*, *"Failed to analyze competitor quote"*.
- Words: *"Upload competitor quote"*; *"Competitor Quote Analysis"*; *"Line Items"*, *"Missing from Their Quote"*, *"Potential Hidden Costs"*, *"Pricing Comparison"*, *"Talking Points for Your Meeting"*.
- Reachable: yes (Meeting Copilot).

### A-97 · The slice's tests
- Where: `src/__tests__/quote-xray*.test.ts`, `src/__tests__/quote-xrays-scoped-api.test.ts`; `e2e/`.
- Entry: —
- Does: engine and route tests only. `quote-xray-methodology.test.ts` is the one test that imports a screen file (`countReferencedBenchmarkItems`). `quote-xray-verdict-route.test.ts` pins the verdict create (anonymous, no competitor file, no own source, `NO_LEAD_QUOTE`, lead-first and standalone happy paths), the lead-quotes list and `attach-lead`.
- Rules: no test renders the setup, the verdict, either dialog, the history, a legacy view or the public page; no `e2e/` spec touches X-Ray.
- Data: —
- States: —
- Words: —
- Reachable: —

---

## Uncertain / not verified

1. **The request-size ceiling** (A-25): the ~4.5 MB host cap is taken from the code's own note on another route (`src/app/api/copilot/competitor-quote/route.ts:13-17`); no 4.5–10 MB file was uploaded, so the exact failure text was not observed and depends on the deployment.
2. **Leaving during a run** (A-07): the mutation is not aborted on in-app navigation; whether the server still saves the row after a tab close (parse requests in flight, `create` not yet sent) was not exercised.
3. **The global print rule** (A-52): `body * { visibility: hidden }` is unscoped in `globals.css`; that it also blanks the PO, invoice and VO previews' `window.print()` (they only hide their bars with `print:hidden`) was read, not printed.
4. **Banner hydration** (A-08): the banner's lazy `useState` reads `localStorage` on the client and returns "dismissed" on the server; whether the page is server-rendered (and so warns about a hydration mismatch) or client-only under its `Suspense` boundary was not checked.
5. **PDF glyphs** (A-83): jsPDF's built-in Helvetica may not draw "≥", "−", "₹" or "E£"; no PDF was generated.
6. **Phone photos** (A-18): whether iOS converts HEIC camera photos to JPEG under this `accept` list was not tried.
7. **Legacy rows in production** (A-60…A-89): the rebuild commit says staging's legacy rows were purged; whether production still holds any — the only thing keeping the legacy views and public page alive — was not checked (hand-off D).
8. **"RM" false positives** (A-29): read from the regex; how often Singapore quotes print "RM" was not measured.
9. **Brand research timing** (A-42): whether `after()` usually finishes inside the 90 s polling window was not observed.
10. **Compact amounts** (A-34): `Intl` compact notation per locale (e.g. "K" vs "k") was not rendered.
11. **A preselected lead missing from the picker** (A-03): read from `SearchableSelect`'s code; not seen in a browser.
12. **WhatsApp from the dialog** (A-40): `window.open` with `noopener` inside a click handler should pass popup blockers; not tried on iOS Safari.
13. **The CLOSED bucket** (A-10): the picker filters the hard-coded bucket id `CLOSED`; whether studios with a custom funnel use another id for closed leads was not traced.
14. **A zero competitor total** (A-24, A-34): read from `three-way-match.ts:181` and `real-gap.ts`; no file without a grand total was run.
