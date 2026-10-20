# What is still pending after S42 — one ledger (2026-10-15)

**Summary:** 23 to fix (3 packages) · 30 rows waiting on his taste (built as recommended or decided) · 6 that only he can do · his 4 holds
parked (19 card lines). A·1 (the per-browser sign-in pin) is left out on purpose — it is being built.

His words (2026-10-15): "can you fix all the pending things apart from — dark mode, languages, themes and guided tours, and countries beyond
Singapore". Read for this ledger: every `steps/outcome-S*.md` (the per-line ledgers, *Found in 1.0*, *For the next steps*, *Flags for Vicky*),
the five audits' findings, *Calls for Vicky* and *Walked* / gaps, `s42/calls-for-vicky.md`, `s42/carried-notes.md`, `s42/uat-changed.md`,
`steps.md`'s notes and flags, and `s41b/ledger.md` + the two sweeps (Platform admin left out, on his word). Each item was then checked in the
current tree (2026-10-15). What a later step already fixed is listed at the end as **Closed**, so nothing is counted twice.

Classes: **FIX** — a defect, a gap, a stand-in that pretends, a check nobody ran, stale data, or a call not built as recommended. **APPROVE** —
built as recommended or decided; it only waits for his eye. **HIS ACTION** — only he can do it. **PARKED** — his four holds.

---

## FIX — 23 items in 3 packages

### Package F1 · Honest reads and true demo data — 10 items
Leads · quotes · the website · the demo's data · the client portal. Visible changes get register rows; data changes are guarded, idempotent
repairs in a free slot (R126…R139, R162…R169 and R172…R179 are unused) followed by `db:baseline`.

| ID | What | Where (file:line) | Smallest fix in 2.0's shape | Source |
| --- | --- | --- | --- | --- |
| F1-01 | **Auto Fill is still a scripted stand-in** (REG-319): whatever file is dropped, the Move stage window fills the mock's values ("WhatsApp · Callback requested") and the Notes tab fills a fixed sentence. The same pretend read S42F removed from Fill from a document. | `components/leads/move-stage/wizard.tsx:295-325` (`handleAutoFillUpload`, "Scripted magic moment" at :314) · `components/leads/notes/lead-notes.tsx:74-75, 346-351` (`AUTO_FILL_BODY`) | Read the file by rule with S42F's reader shape (`lib/leads/document-fill.ts`): a WhatsApp *Export chat* `.txt`, a PDF or a text file gives the last message's day and time, the channel, an outcome by `OUTCOMES`' words and a next step by its words; a picture has no words — keep it attached, fill nothing, and say so in the dialog ("A picture has no words to read here — the screenshot is attached; fill the log"). Only empty fields fill. Register row (invented copy). | calls-for-vicky "Settled while fixing"; S42F *For Vicky*; carried-notes "closing tidy-up" |
| F1-02 | **Recreate from my quote "matches" a photo by its file name and calls it a Strong match.** A photo named `flo.jpg` gets confidence `high` and the curated reasons of the reference quote ("A framed form: client and quotation details in two columns…") — things it never saw. E-05's family. | `lib/templates/read-quote-file.ts:10-11` (`byName` keeps `m.confidence` and `m.reasons`) · `lib/templates/recreate.ts:42-49` (`matchSourceFile`) · `components/company/templates/recreate-dialog.tsx:97` (the label) | For `by: 'name'`: confidence `fair` ("Closest match"), reasons = the honest line only ("A photo has no words to read here — pick the design that looks closest"), never the reference's content lines. PDFs with words are already read by rule (unchanged). | S42B *For other packages* (left as S11's stand-in) |
| F1-03 | **The website's pictures still show 1.0's claims.** E·1 rewrote the words, not the pictures: *Get work done* shows "Chart designed" and "Lead moved to Quote Created" (1.0's stage) all marked Done with no confirm; *One-click project plan* shows "AI generated the full schedule · 6s" and "Week 1–2" (2.0 says days); *Project health alerts* an "AI SUGGESTION"; *Financial modelling* a "Margin forecast". Four co-pilot pictures are no longer referenced. | `public/site/marketing/maison-bot/actions.jpg` (used `lib/site/platform.ts:257`) · `projects/ai-plan.jpg` (:202) · `projects/health-alerts.jpg` (:205) · `finance/modelling.jpg` (:154) · unused `public/site/marketing/co-pilot/{deal-score,estimate,transcript,whispers}.jpg` | Check all 24 pictures in use against 2.0 (the same table E·1 used for words). Replace each untrue one with a capture of 2.0's own screen at the same size, or draw the grid's icons instead (S35's rule 6: pictures only when every card has a true one). Delete the four unused files. Re-read the lines beside them (":202 AI turns your approved quote…", ":205 AI detects delays…") against what 2.0 does by rule. | S42E "Kept, flagged" (the Quote Created picture); E·1 |
| F1-04 | **October's money: the front door opens on a loss.** The fixture's October holds one external invoice (S$648) against credit notes CN-2026-001 · 002 (S$1,635, 2–3 Oct), so *Profit this month* is negative (−S$3,005.50; S42A only changed the words, A·3). | data: `fixtures/baseline.json` (`project_invoices`, `credit_notes`); tile `lib/dashboard/queries.ts:265-275` | A guarded repair that sends one of the demo's ready stage invoices (e.g. Benjamin Han's next stage, a draft today) inside the snapshot's month with its whole trail (sent stamp, Activity, bell row, portal Money, receipt state) — REG-343 — then `db:baseline`. Note for him: "this month" is a calendar month, so a restore on the 1st–2nd of a month will still read thin (A-03 moves days, not months); say so, or ask whether the tile should read the last 30 days. | calls-for-vicky "October's money dates"; S22 flag; A·3 |
| F1-05 | **The Visualizer fronts 1.0's old sample photos, though the owner's new ones exist.** S20 kept "1.0's 900 px sample rooms … new photography is an asset to commission", but 1.0 has had *the owner's new sample rooms and sample sketch* since 2026-10-08 (`4a51f3522` on `deployment/plg`). 2.0's files are byte-identical to the old ones (shasum `e64b4539b22c` = `4a51f3522^`). | `public/visualizer/samples/{living-room,bedroom,kitchen}/original.jpg`, `kitchen/sketch.jpg` · their traced readings `lib/visualizer/samples.ts:87-274` · the welcome's before / after `public/visualizer/welcome/*` (REG-819) · `lib/visualizer/demo.ts:23` (a swatch cut from the bedroom) | Port the four pictures from 1.0, re-trace each room's outlines and planes in `samples.ts`, re-make the sample looks and the welcome's after (`scripts/viz/demo-renders`, `render-test`), re-check the trial's samples. The biggest item here — S20's harnesses do the checking. | S20 ledger (29.6); S41b ledger "his call still open" 29.6 |
| F1-06 | **A Hangout chat's End offers nothing to a lead on hold**, while the same lead's meeting page offers *Resume at Met* (S42G G-03). End asks the stage rule with no members and no resume stage, so the two doors answer one rule two ways. | `lib/hangouts/queries.ts:144-147` (`stepFor`: `resumeStage: null, assignees: []`) | Read each chat lead's `resume_stage` and `lead_assignees` with the rows already fetched at :138-141 and pass them to `heldMeetingStep` / `stageIntent`; End then offers what the meeting page offers ("Resume at Met" through the house confirm). | S42G "The meeting's other doors" (A Hangout chat's End) |
| F1-07 | **The server never checks a stage's fields.** `moveStage` / `updateStageDetails` take the window's payload as sent; `validateStage` (and the studio's two asks) run only in the browser. | `app/leads/actions.ts:136-150` (`moveStage`), `:856` (`updateStageDetails`, returns `void`) · `lib/leads/stage-data.ts:134` (`validateStage`) · `app/leads/actions.ts:208` (`fetchStageAsks`) | Run `validateStage(toStage, payload, await fetchStageAsks())` on the server and answer `{ error: <the first message> }` (house refusal); give `updateStageDetails` the same `{ error }` result. Invisible unless a client is bypassed. | S05 *For the next steps* (developers) |
| F1-08 | **The studio's own addresses ride to a client's browser.** Every portal document and need carries `previewHref` (`/quotes/<id>/preview`, `/contracts/<id>/preview`, `/visualizer/<id>`) on a real client's visit, unused there. | `lib/portal/home.ts:135-160, 198-199` · `lib/portal/needs.ts:88-155` · `lib/portal/notifications.ts:54, 60` · readers `components/portal/portal-home.tsx:31-32`, `bell.tsx:96`, `money/portal-money.tsx:106` | Drop `previewHref` on the server unless `visitor.preview` (the portal's own flag), as `clientSafe` does for quote lines. Invisible. | S13 *For the next steps* (developers) |
| F1-09 | **LEADS checklist D-42 — "Move a lead's quotes to another entity" is still "Later — Quotes module".** 1.0's `migrate-entity` rewrote every quote and signing request of a lead (signed ones too); the S41b data sweep filed it "Decided — quote editor D-101" (each quote's own *Issued by*), but the UAT sweep left the row open as a product call. | `design-source/uat/story/checklist-LEADS.json` (row D-42) · `s41b/sweep-data.md:406` · `quotes.issuing_entity` (`lib/db/schema.ts:411`) | Recommended: settle the row by D-101 — "Not built — by design: each quote is issued from its own entity (Issued by); the port copies the lead's entity onto its quotes" — and rebuild the workbook. If he wants the move: the lead's ⋮ › *Issue its open quotes from…* (Drafts and unsent quotes + Draft contracts; sent / signed ones keep theirs and say why; Undo) on the house menu and `ConfirmDialog`. | uat-changed "Left for him"; his named FIX example |
| F1-10 | **The AI credits balance can be stamped ahead of now after a restore.** R111's move is capped by the ledger's and the paid work's newest stamps, not the balance row's own `updated_at` (S42A's probe found it ~1.5 h ahead; no page reads it). | `scripts/repair-demo-data.ts:5380, 5388` (`latest`) · `lib/credits/demo-month.ts:113` (`snapshotMonth`, the restore's side) | Take `studio_credit_balances.updated_at` into `latest` in both, or clamp it to now when moved. Invisible. | S42A *For other packages* (the AI credits story) |

### Package F2 · Ghosts, house notes and the 1.0 checks nobody ran — 6 items

| ID | What | Where (file:line) | Smallest fix in 2.0's shape | Source |
| --- | --- | --- | --- | --- |
| F2-01 | **Finance › Commission's ghost has no *Asks for another rate* band**, which the demo's page draws right under its tiles (the demo has one ask) — the first screen jumps on reveal (REG-708). | ghost `components/finance/books/books-ghost.tsx:48-52` · page `components/finance/books/commissions-view.tsx:228-231` | Seed the open asks' count in `lib/ghost-shapes.server.ts` (as C-18 seeds the Money band) and draw the asks table's bones when it is above 0. | S17 "Left as data, flagged" |
| F2-02 | **The house Chips read an empty value as "nothing picked"** — undocumented; the Marketplace's All chip met it (S25 fixed its own use). | `components/om/chips.tsx:14` (`Single.value`), `:56` (`props.value ? … : []`) | One line in the type's comment: "'' is no pick — give an All chip a real value". (Changing the rule would touch every group.) | S25 *Flags for Vicky* |
| F2-03 | **Stale comments call Fill from a document "scripted"** after S42F made it read the file. | `components/leads/lead-form.tsx:202, 394` | Say what it does now ("reads the picked file by rule — `lib/leads/document-fill.ts`"). Comments only. | found while checking S42F |
| F2-04 | **Six newer 1.0 branches were never swept.** S41b read `integ/security-non-qanvast`, `deployment/plg` and `deployment/qanvast` only. Ahead of plg since: `port/spaces-studio-2026-10-12` (its own lineage, 1,277 commits — e.g. section-only numbering, a section's highlight band over its description, a zero Qty printed as a dash, wider boxed-grid cells), `port/urbanhome-ui-2026-10-13` / `urbanhomedemo` (13 — white-label assistant name, a real Quotes tab listing), `quotes/port` (46 — editor v2 wave 9: GST on the quote, template fonts, table knobs), `crm-client-link-sarthak` (45) and `billing-app` (54) (CRM, admin and analytics — Platform admin), `fpto3d` (1). | `/Users/vicky/Documents/GitHub/qanvast-id-tool` — `git branch -a --sort=-committerdate`; memory note *1.0's newer branches* | One read-only sweep, as S41b's: each studio-facing change → its 2.0 home, already built, or a row to build (decide by the brief's rules); Platform admin / CRM / fleet rows recorded as excluded. Build what has no home in the right package. | memory `v1-newer-branches.md`; S41b method |
| F2-05 | **The quote document editor's other parts were never compared with 1.0.** S29 handed "sections as blocks, conditional visibility, bulk delete / duplicate, page breaks" to S11; S41b-2 passed it on; nobody read it. 2.0 has page breaks, hidden blocks and Duplicate one at a time — conditional visibility and bulk delete / duplicate are unconfirmed. | 1.0 `quote-document-editor.tsx` · 2.0 `lib/templates/model.ts:204, 265`, `components/templates/editor/inspector.tsx:88` | Read 1.0's editor; for each part, record its 2.0 home or build it in the **template** editor (never the quote), on its pieces and Undo. | S29 *Found in 1.0*; `s41b/sweep-pages.md` §11; S41b-2 ledger |
| F2-06 | **1.0's quote-canvas overridability was never checked** — which template properties a quote may override (the 🔒 per knob). | 1.0 `src/lib/quote-canva/resolve-props.ts` · 2.0's template ↔ quote rules (REG-485…493 · 578…583, `lib/templates/*`) | Compare; record each knob's 2.0 rule, and build only what 2.0 lacks (e.g. a lock a studio needs). | S41 *Found in 1.0* "For S41b" (no answer in `s41b/*`) |

### Package F3 · Walk what nobody walked, and the UAT — 7 items
Each walk follows `s42/audit-brief.md` (own server and DB, each role, 1440 + 390 touch, 768 / 320 spot checks, the whole life of each thing);
every finding is fixed in place or handed to F1 / F2.

| ID | What was never walked | Where it was left | Area |
| --- | --- | --- | --- |
| F3-01 | Deactivating a member who is signed in on another browser (S30: "Deactivate signs a member out everywhere"); Sarah and Alex as Designers through View as; 768 touch beyond spot checks. | `s42/audit-A.md:124-127` | Front door, people, settings |
| F3-02 | Files › Show to client on a render → the portal's Designs; the Quote Sent / Won steps' uploads; Tasks / Files head sort; Attach files; Export columns; Waste % on Order from the quote and a PO; bulk Set vendor and the import's vendor; the cover looks and an entity's footer on a quote; X-Ray's arithmetic point, the RM refusal and the photo refusal; writing help in the Description dialog, contract templates and a template's prose; Michelle and Sarah. (Each had only its own step's probe.) | `s42/audit-B.md:107-111` | Leads and sales documents |
| F3-03 | A lead's new 3D layout in the planner editor and its carry at Won (WebGL was off); Upload a recording / Write up a meeting; a meeting invitation on WhatsApp; the client's "I'll be there" and its bell row; a Designer's repeating expense waiting for approval as time passes; Xero's mapping row for a new expense category; Use on / Record the refund for a new overpayment credit; team faces with a real member photo (the demo has none); the ghost tab strips of area C's loaders at 390. | `s42/audit-C.md:69-70, 118-120` | Projects, money, the client |
| F3-04 | Alex read-only in the planner; paying for a seat; Fewer seats → Undo; a successful VO read (now PDFs too) and the schedule's *Use an uploaded quote*; the bell sheet with a live upgrade offer at 390 / 320; a HEIC swatch, Company › Materials and Files with HEIC; Save to Files on a client's layout; Benjamin's Floor plan ⋮; the 3D picture carried at Won. | `s42/audit-D.md:117-123` | AI and design tools |
| F3-05 | Hui Min through the Marketplace and the Listed on Qanvast plays; the deal and walk-in dialogs at 320; the area's loaders caught live (E checked them by reading code); the trial's three-render gate and X-Ray comparison beyond spot checks; the DS TextArea's label over filled text in End the chat — type, don't `fill` (S42E saw it only in shots). | `s42/audit-E.md:157-160`; `steps/outcome-S42E.md:97-99` | Outside the studio and Qanvast |
| F3-06 | **S42's own new surfaces had no second eye** — only their builders' probes and the regression: the turning clip and *Square it by its corners* (D·1), End the chat's offer (E·3), every meeting door's offer and the Met carry (G-01…G-05), the waiting signing link and the Revise warning (B·1), the money papers' menus (C·4), Fill from a document's read (S42F), a Free studio's set-up list (A-01), Request reviews' reviewed rows (E-06). Walk them as each role at 1440 and 390. | `steps/outcome-S42{A…G}.md` | All |
| F3-07 | **The UAT story has no steps for most pending-modules surfaces**, though each outcome proposed one: the live Meeting Copilot and Kelvin Goh's New → Contacted → Met path (S42G), team and group chats (S26), Market Insights (S25), Make a 3D picture (S28, Farah), Lead credits and Reviews (S41b-5), the view-only quote link (S02), wall elevations (S15), Privacy and terms (S13), writing help's Plain English (S29), the turning clip and Square it (D·1), G then M (S16). | `design-source/uat/story/ch*.json` (none of these words appear); the outcomes' "UAT (the orchestrator's)" lines | Records — then `build_uat.py`, and list the new steps for his sheet (HIS ACTION H-02) |

---

## APPROVE — 30 rows: built as recommended or decided, waiting only for his eye

| # | What | Record |
| --- | --- | --- |
| P-01 | The S42 calls taken as recommended: A·2 (Free's set-up list done by the default template) · A·3 ("Credit notes S$… more than invoiced") · A·4 (rail badge vs My projects kept) · B·1 (a signing link waits while its quote is revised; Revise says so) · B·2 ("Demo only — no text is sent: any six digits sign it.") · B·3 (the appeal banner's date once past) · B·5 ("6 downlights" = 6) · C·1 (every Met log is a held meeting) · C·2 (client notes in "we / your") · C·3 (Studio health tiles open sibling tabs) · C·4 (money papers: Open · Download · Copy link · WhatsApp · Show to client) · C·5 ("Client" / "Client messages") · D·1 (turning clip; Square it by its corners) · D·3 (planner's Maison AI in ⋮ at ≤1024) · D·4 (Pro — Studio restores the base) · E·1 (the site in today's words) · E·2 (Admins on Reviews — departs from 1.0) · E·4 (no floating Try it free pill) · E·5 (Demo Studio's own logo) | `s42/calls-for-vicky.md` |
| P-02 | B·4 vs D·2 settled as D·2: a PDF quote read costs 5 AI credits, given back when nothing reads (one condition per charge to make rule reads free) | calls-for-vicky "Settled while fixing" |
| P-03 | E·3 as built: End the chat offers **Contacted** under one-stage-at-a-time (Met only under Flexible); Dropped → Lost with its reason | calls-for-vicky; S42E |
| P-04 | S42G's judgement: a held meeting on an On Hold lead offers *Resume at Met* (house confirm); a lost lead is offered nothing | REG-S42G.2 (S42G's rows are REG-2279…2283) |
| P-05 | Fill from a document reads the picked file by rule (as recommended); pictures are said unreadable | S42F item 4 |
| P-06 | S41b's "answered, his call open": 17.1 Manage Stages opens Lead stages (the card said hide) · 18.16 Accounting never approves quotes · 21.2 the margin leaves waste out · 2.21 the lead brief's copy sign-off (REG-169; two words changed) · 23.9 the house chart palette until a DS one · 27.4 "Notices" · 3.15 / 28.10 the co-pilot metered at his Q-45 price though 1.0 never charged · 29.2 Replace → *Recolour it to match* · 1.5 Workload without tasks per member · 3.10 *Last met* row instead of a Meeting Summary card · 4.4 Marketplace banners don't rotate · 8.1 no credits for the 3D picture · 15.6 a second Open-to-new-leads control · 34.4 the branded email's look (a first cut) | `s41b/ledger.md` "Answered, but his call is still open" |
| P-07 | S19 pricing: credits are allowance × seats (1.0's flat issuance not built); seats are said, never refused; auto top-up is 2.0's own | S19 *Found in 1.0* |
| P-08 | S16: no red count on Leads (the red rule); the unsaved-edits guard can't hold the browser's own Back (App Router) | S16 ledger |
| P-09 | S13: the portal's foot (Privacy · Terms · Contact) on the portal only, not on /confirm, /sign, /quote, /invoice | S13 "Open for Vicky" |
| P-10 | S11: Showflat Presentation's headings now print in Fraunces; invoice / PO paper stays in Settings › Finance with a Brand kit door | S11 decisions |
| P-11 | S14: the demo's CaseTrust + HDB listing on record (one switch reverses); Qanvast Ops stays on the rail; the module is "Roles & access" | S14 decisions |
| P-12 | S17: the four panel widths (360 · 400 · 480 · 560) and one tall xl height (928) | S17 "Open for Vicky" |
| P-13 | S22 Dashboard: no mock; the front door moved from Leads; no red tile; no headlines in the demo | S22 *Flags for Vicky* |
| P-14 | S23 Meetings: a first cut on house pieces; a held meeting IS the Met log; outcomes derived; transcription a stand-in said on the page | S23 decisions |
| P-15 | S24–S28 modules with no mock: Marketplace for every studio, invented `.example` brands, products reach Choices through the Price book; six sample articles; a Team conversation's count is its people's, links open in every thread, read rows +4px; the About dialog became the Public profile page; Dollhouse framed from the front, Personal first in *For* | S24…S28 flags |
| P-16 | S29: Write with AI proposes first (REG-420 now one more press); the phone's contract bar on two lines | S29 *For Vicky* |
| P-17 | S30 / S31: "Sign out"; email as a second way in; a code before a new sign-in number; an open invitation joins on sign-in; self-serve sign-up on Free; a freelancer is a studio of one; one studio open at a time; a new studio GST-registered by default | S30 · S31 flags |
| P-18 | S34: "Simulated on this prototype — …" lines show in client demos (Integrations, Sent messages) | S34 / steps.md |
| P-19 | S35 / S36 / S41b-3: the site at `/site`; Home's first-visit intro; Calendly in a house dialog; Privacy and Terms verbatim, Cookies rewritten; Story's "lifetime fixed pricing" kept; the trial on in the demo; tool cards open their pages; the visitor's photo carried; a sample restyle counts; Leads 3 + a free comparison + a kept quote (more than 1.0's last branch); a kept quote asks whose it is | S35 · S36 · S41b-3 flags |
| P-20 | S39: Studio health reads the records only (his Q-16 No); R123's sign-in history; Accounting counts | S39 flags |
| P-21 | S41b-1: four cost switches (Manager its own); Order from the quote hidden for a member who can't see costs; Waste % and Commission stay visible | S41b-1 *For Vicky* |
| P-22 | S41b-2: where each 1.0 address lands; the new not-found page; OpenMaison's mark as the app icon. The studio's other record pages (a lead, a reading, a template, a member's profile, a brand, an article) still answer 200 under their loader with the house not-found — audit B's call (never shared or indexed); one layout each if REG-2119 should hold to the letter | S41b-2 flags; `s42/audit-B.md:55-58`; A-11 fixed quotes · contracts · projects |
| P-23 | S41b-4: whether 2.0 should nudge at all; T1 (five active minutes) not built (Q-16) | S41b-4 flags |
| P-24 | S41b-5: Request reviews opens on finished projects (reviewed clients now unticked); no in-app top-up of Qanvast credits | S41b-5 *For Vicky* |
| P-25 | The sweeps' open picks: 1.0's eight ready-made accreditation badges as picks in the Brand kit (a small add); *Send for signature* on a file's ⋮ and signing pictures (2.0: Contracts › Import a PDF); a "Looking for your profile?" line for old `/settings#…` anchors; drawing the site's module FAQs; a studio-wide "everyone gets a digest" switch; the Project Types editor (Leads Q-34: three fixed types) | `s41b/sweep-data.md` §4 · `sweep-pages.md` §10–11 |
| P-26 | The S41b ledger's 47 **kept** lines (his calls or package calls: Starter Quote, prices incl. GST, Items head sort, round-2 testers' asks, D5 / D7, L-2 / L-5, Tasks hub phase 3, the small 1.0 conveniences, the dropped finance tracks, hide modules, replace a milestone's tasks, Render Tour / HD, storeys stacked, the furniture content port, the roles editor, Journey and Archive, voice input, Home Screen choice …) | `s41b/ledger.md` (status **kept**) |
| P-27 | UAT checklist readings left for him: QED QC-06 Dead → Built · QA-11 / QR-03 → "Not built — by design" · XRAY XZ-03 → Built · VIZ VX-04 → Built | `s42/uat-changed.md` "Left for him" |
| P-28 | Every invented sentence of the programme (REG-1672…2283, S42's REG-2154…2283 included) — no mock draws these screens | `design-source/REGISTER.md` |
| P-29 | The stand-ins kept for the developers (his decisions; each honest on screen): the 43 seams in `services.md` (SMS / email / WhatsApp, payments, Xero, the PDF renderer, object storage, image and document models, transcription, calendar sync, feeds, Turnstile and limit stores, tenancy, Qanvast's APIs) · the production session (`requireStudioMember()` in every Server Function) · 308 redirects once addresses settle · a unique index on members' email / phone · reply-to on the site's emails · Privacy §5's hosting facts · a durable limiter · S08b's rare residual SHARED lock | `30-…/services.md`; S30 · S35 · S01 · S08b notes |
| P-30 | Colleagues' phone numbers reach every member on Members (not secret in 2.0) | S01 *For the next steps* |

---

## HIS ACTION — 6

| # | What | Why only him |
| --- | --- | --- |
| H-01 | **Commit the work** — 1,083 paths are uncommitted since `8df73fd` (2026-10-01): Projects, the gaps build, the parity map, the pending modules and S42. A branch and a pull request (AGENTS.md: commit only when he says so; never push to `main`). | Commits are his to ask for |
| H-02 | **Mirror the UAT into the shared Google Sheet by hand** — 125 steps and 161 checklist rows changed (`s42/uat-changed.md`; testers have typed into the sheet), plus F3-07's new steps once built. | The connector can't write cells; the tabs are his |
| H-03 | **Branch protection on `main`** so the design checks block (REG-726). | A GitHub setting |
| H-04 | **The GST line at checkout** — finance confirms the words before go-live (REG-701 `gstLine`; S41b 28.8). | Finance's sign-off |
| H-05 | **A real Homematch lead sheet** — the lead-sheet PDF import still reads a guessed layout (S41b 17.5; `lib/leads/homematch.ts`). | Only a studio's real file settles it |
| H-06 | **His own `local.db`** — say the word to run `npm run db:repair` there (R125 · R160 · R161 · R170 · R171 land; P-2026-006 "Dane Testing" gets its member and R68's checks pass), and View as › Studio plan · Pro — Studio if his :3000 should drop the Pro locks and the upgrade offers (it has been on Free since 9 Oct). | DB safety: no repair or reset of his data unless he asks |

---

## PARKED — his 4 holds (19 card lines)

| Hold | Card lines | His words |
| --- | --- | --- |
| Dark mode | 15.2 | 2026-10-12, REG-1836 |
| Themes and guided tours | 12.7 · 12.8 · 15.3 · 15.5 (+ Restart tours; personal prefs; the Dashboard's page tip) | 2026-10-12, REG-1837 |
| Languages | 38.1 (+ 1.0's Arabic pages) | 2026-10-12, REG-1836 |
| Countries beyond Singapore | 12.5 · 16.1–16.6 · 22.11 · 23.12 · 26.14 · 30.3 · 35.6 · 35.9 (+ the sign-in country picker, other currencies' FX job, the UAE page's FAQ) | 2026-10-12, S33 on hold, DEF-30 |

Platform admin is not counted here — he excluded it from the start.

---

## Closed — checked in the code, so not counted above

| Item | Closed by |
| --- | --- |
| The demo's recent moments age (S30 · S39 · S41b-5 · C-20 · D-14; pj-r4a, pj-fix-F) | S42A A-03 — `lib/db/demo-day.ts`, `lib/db/time-columns.ts`, R125 |
| "A task is due in 30 minutes" names a "Due tomorrow" row (S34) | S42A A-09 |
| A ghost's tab strip doesn't scroll to the open tab on a phone (S17) | S42A A-10 (`GhostTabs active`) |
| `notFound()` under a loader answers 200 for quotes, contracts, projects (S41b-2) | S42A A-11 (record layouts) — the rest is P-22 |
| The not-found header named by `fromLabel` (S41b-2) | S42A A-14 (`notFoundSection`) |
| The Messages ghost draws an open conversation (S26) | S42C C-16 |
| A fresh browser's Money ghost has no Needs you band (S41b-1) | S42C C-18 |
| The Sketch page's ghost draws three tiles (S36) | S42E E-13 |
| The website's claims (steps.md S35 note; S41b-3) and the changelog's "AI reads the screenshot" | S42E E-01…E-04; REG-2278 (`lib/site/changelog.ts:45`) — the pictures are F1-03 |
| `/qanvast-ops/portfolio` · `/complaints` · `/promote` 404 (S41b-5) | S42E E-15 (`lib/links/old-addresses.ts:135-137`) |
| Lead credits' closures footnote and chart heights (S41b-5) | S42E E-07 · E-08 |
| A Hangout chat's ending moves the lead (S27 flag) | E·3 (S42E E-11) — its on-hold sibling is F1-06 |
| The meeting room offered "Move to Met" under Linear | S42G G-01 (`lib/meetings/next-step.ts`) |
| PDF reads for Create Quote / VO / schedule (S21 decision 2) and the file-name read (E-05) | S42B (`lib/quotes/read-upload.ts`) |
| Fill from a document filled a fixed sample | S42F item 4 (`lib/leads/document-fill.ts`) |
| New project accepted an empty team (P-2026-006) | S42F item 1 (`TEAM_NEEDED`, R161) |
| Viewed stamped by the studio's own visits on the PO, meeting, renders, 3D and Hangout links | S42F item 2 (`isStudioVisit`, e.g. `app/po/[token]/page.tsx:29`) |
| The portal's "Sign the agreement" while its quote is revised | S42F item 3 (`signsNow`) |
| S41's two proposals | S42D D·1 (`components/planner/photo/corner-editor.tsx`) |
| The access gate's "This page" for Meetings, Marketplace, Market Insights | S42C C-07 · S42E E-09 (`components/shell/access-gate.tsx:39`) |
| One mobile number for three people; OpenMaison's logo as the demo's | S42B R160 · S42E R170 |
| "3-D" left in source | S42D (pm2-s17 130 / 130) |
| The project header's long label cut at both ends on a phone (S07) | `components/projects/project-frame.module.css:19-20` (ellipsis) |
| Four Settings / Company ghosts off at 390 (S15) | S17 (all 34 ghosts) |
| The web manifest and favicon; 1.0's `/tools/*` bookmarks (S35 · S25) | S41b-2 (`public/manifest.json`, `public/brand/*`, `lib/links/old-addresses.ts`) |
| The sign-in page's terms line (S30) | S35 (`components/auth/terms-line.tsx`) |
| Accounting's own PayNow (S01); ⌘K People without `?open=` (S09) | S14 · S10 |
| A charge dated after the render it paid for (S08b) | S19 R118, then S42A (every render rides) |
| 1.0's `quote_xray` price (S19) | S21 — X-Ray stays unmetered |
| Qanvast Ops / Marketplace only for listed studios (S16 · S24 · S41b-5) | Decided: every studio (1.0's `isQanvastListed: true`; S31 · S37) |
| Auto / round-robin lead assignment (S31) | Nothing to port — never in 1.0's code (`sweep-pages.md` §11) |
| The accreditation strip vs the Brand kit's badges (S37) | Covered (`sweep-pages.md` §10) — ready-made picks are P-25 |
| CLAUDE.md's Map and the REGISTER for S41b / S42 | Done (`CLAUDE.md:102`; REG-2154…2283 in `REGISTER.md`) |
| UAT steps the S42 fixes changed (4.02, Projects' member pick, sign-in → Dashboard, End → Contacted, signing waits) | Rebuilt workbook (`s42/uat-changed.md`) — the sheet is H-02 |
