# 1.0's newer branches — the sweep nobody ran (S43D · F2-04, 2026-10-15)

Her ask (2026-10-15): "fix all the pending things apart from Still parked". Ledger item **F2-04**: *Six newer 1.0 branches were never swept* —
one read-only sweep, as S41b's: each studio-facing change → its 2.0 home (already built), or a row to build; Platform admin recorded as
excluded. Every call below is **as recommended — her ask 2026-10-15** unless it says it is hers.

**How it was read.** 1.0 is `/Users/vicky/Documents/GitHub/qanvast-id-tool`, read through git only (`git log`, `git show <rev>:<path>`,
`git diff --stat a..b`, `git grep <term> <rev>`) — its working tree was never checked out, stashed or reset, and :3001 was never opened. Three
readers took a branch each (urbanhomedemo · quotes/port · fpto3d + billing-app + crm); every "Built" below was opened in 2.0's lane; every
"Lacks" was checked by reading 2.0's code for the job. **Already read before this sweep, not redone:** S41b's route / table sweep of
`integ/security-non-qanvast` @ `5d177c233`, `deployment/plg` @ `64791f115` and `deployment/qanvast` @ `40f8635e2` (`s41b/sweep-data.md`), and the
UAT triage's quote rows of these very branches (`design-source/context/feedback/05-uat-comments-246-364-triage-2026-10-15.md` §11).

## The branches

| Branch (tip) | Lineage | Commits read | Who it is for | Verdict |
|---|---|---|---|---|
| `port/spaces-studio-2026-10-12` (`52b536355`, 12 Oct) | `deployment/qanvast` @ `40f8635e2` + 9 | the 9 past `deployment/qanvast` (its 1,452 older commits are `deployment/qanvast`'s lineage — S41b + triage §11) | Spaces Studio (a 1.0 studio) | All 9 are UAT rows, mapped in triage §11 and since built by S44T / S44Q (§1). §11's seven "noticed for the next parity pass" features of the same lineage get their homes here (§1.2). |
| `port/urbanhome-ui-2026-10-13` (`cab95dfac`, 13 Oct) · `urbanhomedemo` (`f9571cf60`, 14 Oct) | `559f1dab4` (19 Aug, the plg / non-qanvast line) + 13 · + 17 | all 17 (the second branch contains the first) | Urban Home Design ("UHD", a 1.0 studio with its own deployment) — a sales demo build | 2.0's UI layered on 1.0, white-label mechanics, and UHD's B-requirements: Sales reports, a projects list in their layout, the **Contractor Dashboard**. The last three are **held for her** — UHD asked for them to be exclusive (§2.1). |
| `quotes/port` (`6d74d8aec`, 9 Oct) | `deployment/plg` @ `4a51f3522` + 46 | all 46 + its docs (phase specs, decisions logs, master plan, Phase 9 GST spec) | Every studio — 1.0's port of 2.0's quote editor ("Quote Editor v2") + wave 9 | Mostly 2.0 by construction. Four real gaps found: two fixed here (§3.1), two handed on with rows (§5). |
| `fpto3d` (`04041e6b2`, 12 Oct) | `3ea7e4168` + 1 | the one commit: 8 Markdown specs | Product planning | **Spec only** — nothing built in 1.0 on any branch (§4). |
| `crm-client-link-sarthak` (`1a435a9f9`, 13 Oct) | `3251835a9` + 45 | all 45 | OpenMaison's sales staff (CRM) | **Excluded — Platform admin** (her word). No studio-facing path changes (§4). |
| `billing-app` (`352909d7a`, 13 Oct) | `3251835a9` + 54 | all 54 | OpenMaison's staff (CRM, admin, fork analytics, billing) | **Excluded — Platform admin.** Four commits touch files the studio app shares; none changes what a studio meets (§4). |

Statuses: **Built** — 2.0 does the job (its home named) · **Built in another form** — the job done another way, said in the row · **Decided** —
a recorded call not to (cited) · **Built here** — S43D built it (REG-S43D.n) · **Row** — handed to a named package (§5) · **Held for her** — a
call only she can make · **Excluded** — Platform admin, deployment, infrastructure, tests, or a 1.0-only bug · **Spec only** — never built in 1.0.

---

## 1 · `port/spaces-studio-2026-10-12` — Spaces Studio's nine

### 1.1 The nine commits (all UAT rows — triage §11; where 2.0 stands now)

| 1.0 commit | The job | UAT row | 2.0 |
|---|---|---|---|
| 52b536355 | Section-only numbering — numbered headings, unnumbered items | 330 · 353 | **Built** — "Sections are marked 1 · 2 · 3" + "Item numbers: None" (two settings; triage §9) |
| 84e9f4aa1 · 75c222401 | A section's highlight band extends over its description | 329 | **Built** — S44T: *Section notes sit in the heading's band* (REG-S44T.9) |
| c562f1030 | Payment schedule columns aligned on the signing view | 332 | **Built** — S44T: the Total row has a cell under every column (REG-S44T.6 · .19) |
| 7e92d837b | The email header logo bounded on both axes for Outlook | 314 · 337 | **Row (developers)** — triage M15: the branded email is a first cut (P-06 34.4); the real email template is the developers' |
| 6591a26e1 | The unit dropdown scrolls inside the quote editor | 325 | **Built** (triage: Already) |
| 9fe1393be | Wider boxed-grid value cells; a zero Qty printed as a dash | 321 · 322 · 324 | **Built** — S44T: Details *Lines › Boxed* (REG-S44T.4), *A zero quantity prints: A dash* (REG-S44T.11) |
| 886b491ee | Preview-as-homeowner bounced to the login | 333 | **Built** (triage: Already — "See it as …") |
| 0919c876d | `{signed_date}` so the signature footer fills its own date | 331 | **Built** — S44T: `{signed_date}` (REG-S44T.12) |

### 1.2 The same lineage's features that answered no UAT row (triage §11's "for the next parity pass")

| 1.0 commit (`deployment/qanvast`) | The job | 2.0 |
|---|---|---|
| 340cbc74f | Per-vendor prices on one price-book item (`price_book_vendor_prices`, migration 425): each vendor linked to an item carries its own cost and price; Browse filters by vendor; a line re-prices with its vendor | **Built in another form** — REG-594 / D-158: the same product from two vendors is two Price book entries, each with its own cost and price, found by vendor in Add Item. **Port note for the developers** (map `14-price-book-migration-map`, §2 Items — the table post-dates the map): each `price_book_vendor_prices` row becomes that vendor's entry's cost and price; a blank row keeps the item's base price. |
| ef8a65d8e … 9aef06e96 | Quote revisions with a superseded lock and a colour legend: removed lines stay struck on every later revision, each revision in its own colour | **Built in part** (REG-565 revisions; REG-595 marks the changes since version n−1; kept versions are read-only snapshots — the "superseded lock"). **Lacks:** marks back to version 1, a colour per version, the legend → **row NB-01** (§5). |
| 3da3ddb66 | Signing links for any uploaded lead document | **Built** — Contracts › Import from file (REG-534) + triage C7 |
| d9d700c01 · 25a434746 | Lead-less "Quote Templates" with items | **Built in another form** — My Sections (REG-566) and a template's starter sections (REG-497) |
| 91fbb81e9 | Images with alignment in section / sub-section descriptions | **Row NB-07 → S44I** (the section note's editor is the Items package's) |
| eb1db49b8 | "Repeat on every page" for the Subtitle band | **Built in another form** — a band placed on the header canvas repeats with it (Every page · First page only · Every page after the first — audit 03 MM-12, REG-1800) |
| 4ac53134e | Drag a row onto an item to make it a sub-item | **Decided** — her Q-5 hold on add-on options (sub-items) stands; the Items prototype (`04-sections-prototype-2026-10-15.md`) is S44I's |

---

## 2 · `urbanhomedemo` / `port/urbanhome-ui-2026-10-13` — Urban Home Design's demo build

| 1.0 commit(s) | The job | 2.0 |
|---|---|---|
| aab8a887d · 742f6d125 | PLG's new UI (2.0's own screens) layered on UHD's 1.0; the UI's migrations 400–449 | **Built** — 2.0 is the source. The one difference (the Quotes tab linking to the classic editor) is replaced by c7198c25c |
| c7198c25c | A real Quotes tab listing (New, Clone, Create revision, revisions under one row) | **Built** — REG-174…176, `components/leads/quotes/*` |
| 2acd6db31 · cd2a37dcf | White-label: brand name, logos, mail senders, "Powered by" and the assistant's name from `NEXT_PUBLIC_BRAND_*` + `public/brand/*` — one brand per deployment | **Excluded** — a deployment concern a studio never sets; a studio's own look is its brand kit (REG-487) and the portal's own words |
| 479480a5e (migrations 491–494) | A line's **build-up**: one line the client reads, priced from internal parts (each with cost, price, qty) × the line's qty; survives restore, packages, apply-template | **Built in another form** — REG-585: a section prints as one priced line while the lines inside keep their cost and margin; My Sections keep it. Difference said: a 2.0 section has no quantity of its own — its lines carry the quantities |
| 479480a5e | A version's **redline** (struck omissions, New / Omitted / Revised tags, old → new per cell, a payment-milestones block) | **Built in part** — REG-595 prints the changes since version n−1 (`lib/quotes/diff.ts`) and REG-775 tints changed rows in the editor. **Lacks** the payment schedule's changes → **row NB-02** |
| 479480a5e | A **change summary in words** (qty, rate, rename, section, discount, tax, optional; the milestones; total before → after; "n items untouched"; Copy summary) | **Lacks** — Version History says counts only → **row NB-02** |
| 479480a5e | Compare **any two** versions | **Lacks** — 2.0 compares the current with the last kept → **row NB-02** |
| 479480a5e | Save a version of a Draft at any time, with a note and a delta | **Decided** — REG-565: an unsent Draft is edited, not revised; a version is kept on Revise (with the client's-request note, REG-775) |
| 479480a5e (migration 490) | Restore first keeps the current state as a version (`restored_from_version_id`) | **Decided** — REG-625 *Bring back* says the Draft's own changes go, and asks first |
| 4da810229 (migration 495) | Revisions as separately numbered quotes (`{year}{seq}R{n}`) | **Built in another form** — REG-565 keeps the number with a "Version n" chip and `{version}` on the print |
| 4da810229 | Cumulative struck history since R0, a colour per revision, a legend | **Lacks** → **row NB-01** (the same job as `deployment/qanvast`'s, §1.2) |
| 4da810229 | Quote numbering set-up: start year and number, never below the highest used | **Built** — Settings › Quotes & pricing › Quote numbers (REG-561, REG-645 `nextSequence`) |
| 4da810229 (migration 500) | A free-text "Team" per member, asked at invite | **Built in another form** — `members.manager_id`: a Manager's team (REG-601) |
| 4da810229 (migrations 496, 499) | Hard-delete a vendor (refused while referenced), demo-vendor clean-up (`is_demo`), a wider margin column | **Excluded / decided** — demo scaffolding and a 1.0 column; 2.0 deactivates and merges vendors (`app/finance/vendor-actions.ts`) |
| 0564cdaa5 · 47d4b2c78 · 8925f54eb · 9a3485e5e · 10e3b7663 · e0345cb6f · 41c8068d8 · cab95dfac | Plan gating off, tests, the vendored design system, the icon subset guard, classic-UI routing, row CSS | **Excluded** — infrastructure, tests, 1.0-only fixes (2.0's icon rule is CLAUDE.md › Icons) |

### 2.1 Held for her — UHD's three dashboards (a contract question, not a design one)

1.0's own spec (`docs/features/contractor-dashboard/spec.md` §6, `urbanhomedemo`) records that **UHD's requirements ask for the Sales, Project and
Contractor dashboards to be "exclusive to Urban Home Design and not rolled out to other studios"**, that the signed Annex A reads narrower (their
formats, layouts, sample files and data stay theirs), and that the reading should be aligned with UHD first. Putting these three into 2.0 — the
product every studio gets — is a commercial call only she (with the business) can make. Each is written below as a row **ready to build** in
2.0's shape the day she says so; nothing was built. (UHD's other asks were already built generally — REG-585, REG-595 — they carried no such ask.)

| Held | What 1.0 built for UHD | 2.0's shape, ready to build | Files it would touch |
|---|---|---|---|
| **H-UHD-1 Sales reports** (479480a5e · 4da810229) | Six reports, Owners and Admins, 30 / 90 / all days: per member (leads · quoted · signed · conversion % · revenue — the signed quote's total, the client's budget as an honest fallback · per conversion · median days to sign); the funnel (created → assigned → contacted → quoted → signed, the biggest leak named); by source (normalised); lead flow by week / month; the open pipeline by stage with a weighted forecast; ageing / stalled (days since the last logged touch, in bands per member) | One home: **Company › Reports › Leads** (REG-1361), a second report beside Response time — the report chips Reports › Finance uses; the By team member table gains Quoted · Won · Conversion · Won value; funnel / source / pipeline / going quiet as tables on the listing's model, Export as the page has. Pure `lib/leads/sales.ts` over `LeadFacts` (+ source, first quote sent, the won quote's amount, budget, last contact — `lastContactOf`) | `lib/leads/tat.ts`, `lib/leads/insights.ts`, new `lib/leads/sales.ts`, `components/leads/insights/insights-view.tsx`, `components/company/reports/*` (+ its ghost) |
| **H-UHD-2 Contractors** (4da810229, migrations 497–498; UHD req. B4) | A contractor roster = vendors with several trades, a contractor switch, crew capacity, a code; project × trade × contractor assignments (optionally on a milestone, its window following the schedule; planned · on site · done; "Leader checked"); `/contractors`: idle now, free within 7 days, over capacity, unstaffed work starting within 7 days, By site / By contractor views, assign from there | No new rail item (REG-1360's rule): **Finance › Vendors** marks a vendor a contractor with its trades and how many sites it runs at once; a project's **Schedule** milestone names its crew (the milestone's dates are the window); **Projects › Workload** gains a Members · Contractors switch reading idle / free from / over capacity / unstaffed soon. Migration: `vendors.trades_json · is_contractor · crew_capacity`, table `project_contractors` (project · vendor · trade · milestone · dates · status · checked). Pure `lib/projects/contractors-model.ts` as `workload.ts` | `lib/db/schema.ts`, `app/finance/vendor-actions.ts`, `components/finance/vendors/*`, `components/projects/schedule/*`, `components/projects/workload/*`, `lib/projects/*` |
| **H-UHD-3 Projects list in UHD's layout + the dashboard widgets** (4da810229) | Person-in-charge A / B, Team, Lead type (source), Property type, Address, Total sales before GST, Sign date, Est. start; the Dashboard's Sales · Response time · Contractors widgets | Three optional columns on the Projects listing (Column settings, off by default): **Source**, **Signed on**, **Value before GST** (`components/projects/project-columns.tsx`, `lib/projects/queries.ts` — the data exists). The widgets stay as S22 decided — the Dashboard's tiles are the listings' own figures (REG-2002…2013); numbers live in Reports (REG-1361) | `components/projects/project-columns.tsx`, `lib/projects/queries.ts` |

---

## 3 · `quotes/port` — 1.0's port of 2.0's quote editor (wave 9)

| 1.0 commit / doc | The job | 2.0 |
|---|---|---|
| 588864802 · Phase 9 §B.1 (migration 480) | The quote owns its GST switch and document discount | **Built** — `quotes.gst_enabled`, the quote's discounts (`lib/db/schema.ts`). The lead fallback and its backfill are 1.0's data history — **Excluded** |
| Phase 9 §B.2–B.3 (migration 479) | Per-line GST "follows the quote" unless set; exempt = 0; on-behalf lines 0; a marker on a line at its own rate | **Built in another form** — each line keeps its own `gst_pct` (set from the studio's rate), the quote's switch is master, "On behalf" carries none (`lib/quotes/math.ts`). The marker → **row NB-07 (S44I)**, low |
| Phase 9 §B.5 | A mixed-rate quote's total reads plain "GST"; `{gst_rate}` prints empty | **Built** — the editor's label; `{gst_rate}` is triage row 256 (S44Q) |
| Phase 9 §B.7 + the controller's ruling | A template's GST default can only turn GST off — never on under an unregistered entity | **Built here (REG-S43D.3)** — at creation 2.0 already held it (REG-645); *Apply defaults* did not (`applyTemplateDefaults` wrote the template's switch as is). Now it keeps GST off under an issuing entity that is not GST-registered (REG-593) |
| Phase 9 §B.6 · `docs/rules/finance.md` | Invoices split GST by the contract's own share when lines carry different rates | **Built here (REG-S43D.4)** — 2.0 split every bill at the studio's rate, so a contract with an "On behalf" line (authority fees) put too much GST on each stage invoice, and a variation order with its GST off still had GST split out of its bill |
| 4a805a184 · 588864802 | `/confirm`'s hash covers what the client sees; an evidence row per confirmation; a revised quote's old link answers 410 | **Decided** — the link stays live (REG-624 Q-04); the stored PDF + render hash is the developers' (REG-1712) |
| Phase 6 R6-1 | Sent and Confirmed quotes locked; editing means Revise | **Decided** — REG-624 Q-04, no hard lock |
| 4a805a184 · R6-2 | A plain edit can't set Sent / Confirmed or move a client-held quote backwards; a hand-marked Confirmed records "Marked by" | **Built in another form** — the status menu is the studio's hand record with Undo, and it asks before marking a client status (UX audit Q3). **Lacks** "Marked by" on a hand-confirmed regular quote (variation orders have it) → **row NB-04** |
| R6-3 · 4a805a184 | Send gates: a send permission; readiness on every way out | **Built in another form** — the approval rule on the server (REG-624), readiness in the one Send ▾ (REG-490 · P4) |
| 4a805a184 (client exposure) | What the client view hides never leaves the server | **Built in part** — `clientSafe` (S04) blanks a hidden line's words, folds cost and mark-up, drops rebate / vendor / ids. **Lacks:** the per-line prices still travel when the client view prints *one amount per section* or *the total only*, and on no-price lines → **row NB-03** (privacy; invisible) |
| Phase 5 R5-2 | The client view stores only the switches changed | **Decided** — REG-578: a quote keeps its own settings once set; Reset brings a switch back to the template's |
| 1fb5852ad · af1078cef | An action's Undo reverts only its own step, else "Couldn't undo — the quote changed since" | **Lacks** — an Items snackbar's Undo restores the table as it was, over any edit made since → **row NB-05 (S44I)** |
| 1fb5852ad ("AI money rules") | The model edits prices through the cost / mark-up rules; one Undo per turn | **Built in another form** — Maison AI never edits lines by itself (S04, S12: matches need a tick) |
| Phase 7 D2 | Model-run checks: under-quoted, upsell, missing item, client mismatch | **Built in another form / decided** — rule hints (`lib/quotes/hints.ts`); market checks stay the platform's (REG-1807 Q-16) |
| 588864802 | An amber "Check price" chip on low-confidence read lines | **Excluded** — 2.0 reads uploads by rule (REG-1798); a model reader is the developers' (REG-1712) |
| 588864802 ("table knobs") | Keep groups together, group on a new page, lump sum, column order, qty × unit, discount column, totals layout, payment cards, a fourth signature column, numbered terms, room / roman numbering, page totals, fill the page, movable Terms / Notes | **Built** — `lib/templates/model.ts` Items / Totals / Payments / Signature options (REG-488 · 558 · 617; S44T's spacing and lines) |
| 588864802 (fonts, assets) | Eight OFL fonts embedded; template pictures and reference files | **Built** — `public/fonts/doc/*` + the studio's own uploads (`studio_fonts`, S11); REG-487 · 491 · 1798. The private buckets are **Excluded** |
| 588864802 | New quote from a template; drag-fill with a series (1, 2, 3 continues) | New quote **Built** (the gallery and the editor's top bar). Drag-fill **Built** (REG-477); the series → **row NB-07 (S44I)**, low |
| 6d76b5c07 · R3-3 · R3-7 | "On behalf" a price type (counts, no GST); up to ten named discounts | **Built** — REG-555 · REG-559 |
| Phase 2 INV-051 | The issuing entity can't change once the lead has a project; switching asks whether to move the lead's other quotes | **Lacks** the guard → **row NB-06 (S44I)**. The "move the others" half is **Decided** by the ledger's F1-09 recommendation (each quote is issued from its own entity, D-101) |
| INV-184 | A setting holds Download / Print until the quote is approved | **Built in another form** — only the view link waits for approval (REG-624 Q3) |
| INV-111 · 118 · 209 | Tiered price-book prices, sort by column, generate a quote from rules | **Decided** — REG-1807 Q-06; REG-1712 |
| INV-105 | Cost repair: costs that look like line totals become unit costs | **Decided — not built**: 2.0's import maps each column by name and shows the mapping before it writes (`PasteItemsDialog`), so a total never lands as a unit cost unseen |
| TPL §2.1 · §5 #9 | Templates scoped to one issuing entity, a default per entity | **Decided — not built**: 1.0 itself kept only its old rows (TPL Q9); 2.0 prints each entity's own letterhead on any template (REG-618 Q-26) |
| 99ca80ac1 | An anonymous v2 quote trial, claimed into the editor | **Built in another form** — `/site/try/upload-a-quote` (S41b-3, REG-2125) |
| 99ca80ac1 (Brand kit) | Kit colours / fonts resolved at draw time; a template stores what differs; dark logo; Owner / Admin | **Built** — REG-487 · 844 |
| 05bf01077 · R8-3 | "Write with AI" on T&Cs / Notes | **Built in another form** — writing help by rule (S29) |
| 52eede479 | `quote.confirmed` reaches the assignee and the preparer | **Built in another form** — 2.0 tells the lead's members, Owners / Admins and the quote's creator |
| master plan "template precedence" · R8-1 · Re-sync PDF · migrations 460–480 · the security commits | Old per-lead layouts outrank the template; a frozen canonical PDF; database hardening | **Excluded** — 1.0's own data, infrastructure, security |

### 3.1 Built here
- **REG-S43D.3** — *Apply defaults* keeps GST off under an issuing entity that is not GST-registered (`app/leads/quotes-actions.ts`
  `applyTemplateDefaults`): the picked entity's own registration (Company › Profile), else the studio's — the rule `createQuote` already kept.
- **REG-S43D.4** — every bill splits out the GST its own quote holds (`lib/projects/money.ts` `billGstRate`, `lib/projects/money-queries.ts`
  `ownGstRate`): a stage's Draft, edit, re-size, record and send take the contract's own share; a variation order's bill its order's (none with its
  GST off); a one-off its own lines. The studio's rate stays what the paper prints and what a one-off charges. Payments' and the contract's
  figures before GST (commission, Expected) follow. While every counted line carries the studio's rate and none is "On behalf", every figure is
  exactly as before (the demo's are).

---

## 4 · `fpto3d` · `crm-client-link-sarthak` · `billing-app`

| Item | For whom | Built in 1.0? | 2.0 |
|---|---|---|---|
| fpto3d `phase-2/README.md` | Product: the index of tracker rows 3.0–7.0 | — | Nothing to port |
| fpto3d `chat-cx/*` — Qanvast enquiry threads in Messages, replying gated by plan, three suggested replies on Max, a homeowner's `/r/[token]` and `/my/enquiries` | Studios + homeowners + Qanvast's integration | **No** (no term of it in any branch's `src`) | **Spec only.** 2.0 has Messages (S26), rule-based suggested replies (P-G) and WhatsApp to clients; Qanvast enquiries arrive as leads (Lead capture) |
| fpto3d `refunds-v2/*` — a fast-track return auto-approved on four checks, a refund card, a studio refunds ledger, "request more time"; a staff review page | Studios + Qanvast staff | **No** | **Spec only.** 1.0's v1 return is in 2.0 (`components/leads/return/*`, `lib/leads/return-model.ts`, appeals S05, Qanvast Ops › Lead credits S41b-5); the staff half is **Excluded** |
| fpto3d `cx-profiling/*` — a Qanvast Guide's call notes → a "Qanvast CX context" panel and a Hot / Warm / Cold chip on Qanvast leads | Qanvast staff + studios | **No** | **Spec only**; the Guide's half **Excluded** |
| fpto3d `software-tiers/spec.md` — Free / Pro / Max, an entitlements engine, a ledger, Stripe, a Max enquiry, a Qanvast overlay | Studios + OpenMaison billing | Partly — `deployment/plg`'s seven Pro features and Dodo billing | **Built** — `lib/credits/plans.ts` · `features.ts` · `plan-gate.ts` (S19). The rest **Spec only**; checkout **Excluded** (OpenMaison billing) |
| crm-client-link-sarthak — the CRM (pipeline, verdicts, agreements, analytics, the analyst bot), `/go/[token]` links for a *prospect studio* to fill a survey or e-sign OpenMaison's own service agreement; 1a435a9f9 a CRM default + an agreement clause | OpenMaison's sales staff | Yes | **Excluded — Platform admin.** "Client links" here are OpenMaison's links to studios, unrelated to 2.0's S02 client links |
| billing-app — the same CRM, the admin portal (notification log, Deployments), fork analytics, docs | OpenMaison's staff | Yes | **Excluded — Platform admin.** Shared files checked: 080878965 adds a `mode="platform"` branch to the template editor (the studio path unchanged); 98e2f85c7 widens Studio health's "active member" (2.0's S39 already counts any action); 3df1f7a4d stores message text in the admin log (nothing a studio sees) |

---

## 5 · Rows for other packages (the orchestrator routes them)

S44T and S44Q finished during this sweep; their files land on main after this lane was synced, so rows touching them are written for a follow-up
on top of their work rather than built here against older copies.

| Row | For | What, exactly | Visible | Recommendation |
|---|---|---|---|---|
| **NB-01** | a quote-print follow-up (S44T's files: `lib/templates/queries.ts` · `data.ts`, `components/templates/render/slices.tsx`; `components/quotes/preview/quote-preview.tsx`; `lib/quotes/diff.ts`) | Revision marks back to version 1: a pure `diffChain(snapshots, current)` in `lib/quotes/diff.ts` (per line: the version it came in, was removed in, changed in — lines matched by id across `quote_versions` snapshots); the print keeps every earlier removal struck, each version's marks in its own kit colour with a small key; the client view's *Changes* becomes *Since the last version* (today's default, REG-595) · *Every version*. Sources: `deployment/qanvast` ef8a65d8e…9aef06e96, `urbanhomedemo` 4da810229 | yes | Build (Spaces' and Urban Home's ask; the default unchanged) |
| **NB-02** | the same follow-up + Version History (`components/quotes/editor/version-history.tsx`) | (a) the payment schedule's changes on a revision's print (`diff.ts` compares lines only — diff the snapshot's `payments`); (b) a change summary in plain words under each kept version — what moved on each line, the schedule, the total before → after, "n lines untouched" — with Copy (and in the revised quote's WhatsApp draft, REG-775); (c) *Compare with…* any kept version (`?version=n&against=m`; `fetchQuotePreview` already reads snapshots). Source: `urbanhomedemo` 479480a5e | yes | Build (a) and (b); (c) after (b) |
| **NB-03** | developers / the quote-print follow-up (`lib/quotes/client-quote.ts` `clientSafe`, `lib/templates/data.ts`, `slices.tsx`) | A client's browser receives every line's price even when the client view prints *one amount per section* or *the total only*, and on no-price lines. Carry the server's totals and section sums in `DocData`; zero the per-line prices the view never prints. Source: `quotes/port` 4a805a184 | no | Build (privacy) |
| **NB-04** | the quote follow-up (`app/leads/quotes-actions.ts` `setQuoteStatus`, `app/quotes/actions.ts` `markQuoteStatus` + its Undo) | A regular quote marked Confirmed by hand records `confirmed_via = 'marked'` and `confirmed_marked_by` (a variation order already does), and Undo puts both back. Source: `quotes/port` R6-2 | small (who marked it, where Confirmed is shown) | Build |
| **NB-05** | **S44I** (`components/quotes/editor/items/items-section.tsx`) | An Items action's snackbar Undo restores the whole table as it was; with snackbars that stay (REG-898), an edit made after the action is lost silently. Keep the table as the action left it; when it has changed since, answer "Couldn't undo — the table changed since" and leave it. Source: `quotes/port` 1fb5852ad | yes (a refusal sentence — invented copy) | Build |
| **NB-06** | **S44I** (`app/quotes/items-actions.ts` `updateQuotePricing`, `items-summary.tsx`) | The issuing entity of a quote a project bills from (the project's base quote) can't change — its invoices are issued from it: refuse with "It bills P-…'s invoices — they are issued from X" *(invented copy)* and say it under the select. Source: `quotes/port` INV-051 | yes | Build |
| **NB-07** | **S44I** (low) | (a) images with alignment in section / sub-section notes (`deployment/qanvast` 91fbb81e9); (b) a line at its own GST rate wears a quiet "Own rate" mark *(invented copy)* (`quotes/port` §B.3); (c) drag-fill continues a series (1, 2, 3 …) | yes | (a) build with the notes' editor; (b) build; (c) only if it costs little — Excel's series fill was not in REG-477's list |
| **NB-08** | a template-editor follow-up (S44T's `components/templates/editor/inspector.tsx`; after S44I settles `components/quotes/editor/text/rich-editor.tsx` for C2) | F2-05's one gap: a template's **Text block** is plain paragraphs; 1.0's rich-text sections held bold, italic, underline, lists and links. Write the block with the house rich editor (b · i · u · bullets · numbers · link; kit colours as C2 allows), Insert a field kept, the print already passes it through the allowlist (`parseDesign`, S44T). See `steps/outcome-S43D.md` › F2-05 | yes | Build |
| — | developers (map 14) | `price_book_vendor_prices` → each vendor's own Price book entry (§1.2) | no | Port note |

**Held for her** (§2.1): H-UHD-1 Sales reports · H-UHD-2 Contractors · H-UHD-3 the Projects list in UHD's layout — UHD's exclusivity ask.
