# Leads — 1.0 → 2.0 parity audit (2026-09-24)

**Written for:** the owner, to mark row by row; and the 1.0 developers, as the migration map for the Leads module.

**The brief** (owner, 2026-09-24): audit and benchmark everything the Leads module does in 1.0 against 2.0 — features, functionality, logic and data; no UI reference (2.0 keeps its own design system, layouts, transitions and components); nothing missed; flag every mismatch; **ask before implementing**. Nothing in this document has been built.

## 0.1 Sources

- **1.0** = `qanvast-id-tool` at `67f42e469` on `integ/security-non-qanvast`. Five readers read the code and docs whole; their inventories are banked beside this file under `leads-1.0-inventory/` and are the references cited in the rows: **A** listing · creation · intake · bulk · reports (89 rows), **B** the lead detail drawer (90), **C** the stage engine · settings · roles · notifications · touchpoints (79), **D** the data model (26 lead tables, the 77 columns of `leads`, the column-level diff), **E** what 2.0 has today (96). The live app on :3001 (Staging, demo studio *Design Loft SG*: 165 leads, 12 members, journey mode on) confirmed the vocabulary and the demo-data volumes; nothing was submitted there.
- **2.0** = `openmaison-prototype` at `46d09f4` plus the uncommitted 2026-09-24 round (REG-599…604: lead sources · last contact · members and visibility · lead capture · XLSX / PDF import · notifications).

## 0.2 Scope rules

- **Excluded by the owner:** Journey mode (2.0 = Linear stage movement) and Archive (2.0 = Delete). Their rows say *Excluded*; where Journey's hold / close semantics carry a rule 2.0 lacks, the rule is listed on its own.
- **Later modules:** Quotes, Quote X-Ray, Contracts, Projects, Tools (copilot, visualiser, floor plan), the homeowner portal's own pages. Their lead-side touchpoints are listed; their internals are not.
- **Not for a prototype:** multi-country, tenancy, auth, RLS, OAuth, crons, real AI, real sends. Listed as *Platform* with the stand-in 2.0 keeps, so the devs know what is simulated.
- **Vocabulary:** 2.0's words come from its mocks; where 1.0's words differ the row says so and §1 decides.

## 0.3 Status legend

| Status | Meaning |
|---|---|
| **Built** | 2.0 has it, in its own shape. |
| **Partial** | 2.0 has part of it; the gap is named. |
| **Missing** | 1.0 has it, 2.0 has nothing; a proposal follows. |
| **Mismatch** | both have it and they disagree; the owner decides (all collected in §2). |
| **Excluded** | Journey mode · Archive. |
| **Later** | another module's internals. |
| **Platform** | live infrastructure; 2.0 keeps a stand-in. |
| **Dead** | code no 1.0 user can reach; not ported unless asked. |
| **2.0 only** | no 1.0 counterpart; kept and listed so the devs know it is new. |

## 0.4 How to mark

Write **go** · **hold** · **no** in the *Mark* column of any row, or answer §6 by question number. Rows marked go are built in the rounds of §7, each logged in `REGISTER.md` as `user-directed` with "1.0 · <inventory row>" as the source, verified on :3011 and banked under `design-source/verify/`.

Reading order: **§1 Definitions** first — it is where the two products use different words for the same thing, and every later row leans on it.

## 1. Definitions — the same thing under two names

Each definition names the 1.0 concept, the 2.0 concept, and the call to make. **Q-nn** points at §6.

| # | Concept | 1.0 | 2.0 | Verdict · question |
|---|---|---|---|---|
| DEF-01 | **A lead's position** | A triple `bucket / status / sub-status`: NEW (Unassigned · Assigned) · ONGOING (Follow-Up · Contacted · Quote Created · Met, each with 2–3 sub-statuses) · ON HOLD (five duration tiers × Client not ready · Budget review · Scope change) · CLOSED (Signed with 5 sub-statuses · Inactive with 4). Studio-editable in the Lead Funnel editor (C-01, C-41). | Seven fixed stages: New · Contacted · Met · Quote Sent · Won · On Hold · Lost; Linear or Flexible movement; nothing moves backwards (E-32). | **Mismatch.** Map for the port: NEW → New (assigned or not); FOLLOW_UP → New with members, or Contacted once a log exists; CONTACTED → Contacted; MET → Met; QUOTE_CREATED → Quote Sent; ON HOLD tiers → On Hold durations; SIGNED / PROJECT_CREATED → Won; INACTIVE → Lost (D §3.4 D). Sub-statuses have no home in 2.0 — the Contacted outcomes already say "Callback requested / No response", the Won sub-statuses are project stages. **Q-01** keep the seven and drop sub-statuses (recommended). **Q-02** a studio-editable funnel: 2.0 says "Manage Stages — coming soon"; recommended hold, the mocks fix the stages. |
| DEF-02 | **Follow-Up** | A *status* ("Follow-Up") whose sub-statuses are First contact pending · Awaiting reply · Site visit scheduled, and a lead-level `next_follow_up_date/time` required on Follow-Up, Contacted and every On Hold tier (B-38, C-23). | Follow-ups are **tasks**: a Contacted log's schedule raises one, a quote's due date raises one, the bell derives "untouched" and "overdue" (E-36, E-69, E-85). No date on the lead. | **Mismatch** — see DEF-17 and **Q-03**. |
| DEF-03 | **Archive vs Delete** | Soft archive (`archived_at`), Revive from Accounts, no purge, blocked while a signing link is live, cascades: cancel open tasks and reminders (A-72, B-65). No delete. | Soft delete with a reason, Undo, Deleted Leads sheet, Delete Forever (E-5). No archive. | **Excluded** (owner). Two 1.0 rules worth keeping on Delete: **Q-04** warn when a contract's signing link is still live, and cancel the lead's open tasks on delete (they vanish with the lead today anyway; restore brings them back). |
| DEF-04 | **Journey mode** | An 8-step tracker with evidence, outreach attempts, structured close, mini-rail on cards; default on (C-08…C-22). | Linear stage movement through the Move stage window. | **Excluded** (owner). Its hold and close rules are read as ordinary rules under DEF-05 / DEF-06. |
| DEF-05 | **On Hold** | Classic: a bucket with five tiers by duration (< 1 month · 1–3 · 3–6 · 6–9 · > 9 months) and three sub-reasons (Client not ready · Budget review · Scope change), follow-up date required; Journey: a restart date + note, a 09:00 in-app "Hold ended — revisit" ping on that date, the pre-hold position stashed and restored on Resume (C-20, C-21). | Reason (Property delay · Budget on hold · Travelling · Others) · Duration (1 · 3 · 6 months · Custom) · Follow up on; resumes anywhere with a confirm; **no reminder** (E-40, hold L-1). | **Mismatch.** **Q-05** the reason list: recommended union — Client not ready · Budget review (≈ Budget on hold) · Scope change · Property delay · Travelling · Others. **Q-06** raise a notification on the follow-up date ("Hold ended — revisit {name}") — the L-1 hold, re-asked because 1.0 has it. |
| DEF-06 | **Lost / Inactive** | Classic: Inactive with sub-statuses Budget constraints · Went with competitor · Unresponsive · Not a fit. Journey close: Lost to competitor · Budget mismatch · Project postponed · Unresponsive (only after 3 logged attempts) · Not a fit · Cancelled by client · Other, with per-reason detail (competitor name and why; their budget vs our quote; expected restart date with a "consider On Hold" nudge under 6 months; dimension region / scope / style / timing; proof) and a confirm step; closing cancels open tasks (C-22). | Reason: Property too far · Went with another firm · Budget mismatch · Unresponsive · Others (+ Other reason); nothing else changes (E-41). | **Mismatch.** **Q-07** adopt the union of reasons (Went with another firm · Budget mismatch · Project postponed · Unresponsive · Not a fit · Cancelled by client · Property too far · Others), with two optional details only: *Competitor* for "Went with another firm", *Expected restart* for "Project postponed" with the nudge toward On Hold. Recommended. The "3 attempts before Unresponsive" gate needs the contact-log count — see DEF-16. |
| DEF-07 | **Return a lead to Qanvast** | A `refund_requests` row (one per lead, pending → approved / rejected by the Qanvast admin); only for a Qanvast lead that is already CLOSED and not Signed; 7 reasons with their own fields (B-56, C-73). | The Return Lead wizard on any Qanvast lead not already processing / approved: it parks the lead as Lost, raises a "Respond to Qanvast team" task, records the return and Qanvast's reply, credits (E-72, E-73). | **Mismatch on eligibility, Partial on reasons.** **Q-08** keep 2.0's "return from any stage, the wizard parks it Lost" (recommended) or require Lost first. Reasons: adopt 1.0's seven and their fields (D-43). |
| DEF-08 | **Assignment** | Many members per lead with a commission split in basis points; `assigned_to` mirror; removing the last member downgrades the lead to NEW / UNASSIGNED after a confirm; designers cannot pick Unassigned or move backwards (client-side); a manager hierarchy behind a flag (B-32…B-34, C-05, C-55). | Many members per lead, roles Owner · Admin · Manager · Designer with reach, a lead needs a member before it leaves New and past New the last member cannot be removed (E-44…E-47). | **Mismatch on the last member** and on splits. **Q-09** keep 2.0's refusal (recommended — "nothing moves backwards"). Commission split → Finance, later. |
| DEF-09 | **Temperature** | `temp` hot / warm / cold (default warm) + `temp_reason` and AI intent / fit scores; the card badge is switched off pending scoring review, but the header counts "n hot" and the Hot quick filter reads it; the drawer shows the badge (A-89, B-07). | None. | **Missing.** **Q-10** adopt a manual Hot · Warm · Cold on the lead (chip on the Overview, "n hot" in the listing head, a quick filter) — no AI. |
| DEF-10 | **Lead sources** | A per-studio taxonomy (seed: Qanvast · Instagram · Referral · Walk-in · Facebook · Organic · Hangout · Website · Email · Google Ads · Meta Ads); email ingestion also writes Homereno · Houzz · Renopedia (lower-case slugs, unstyled — A-64) (C-45). | Settings › Leads › Lead sources: add · retire · restore · remove; defaults = the enum + TikTok (E-78). | **Built.** Proposal, no question: add Homereno · Houzz · Renopedia to the defaults (I-14). |
| DEF-11 | **Property vocabulary** | SG region config: property types HDB 2–5-Room · HDB Executive · BTO 3/4/5-Room · Executive Condo · Condo · Penthouse · Landed Terrace / Semi-D / Bungalow · Commercial Office / Retail · Others; **property status** New · Resale · Existing; **style** Eclectic · Industrial · Modern · Contemporary · Vintage · Scandinavian · Transitional · Minimalist · Japandi · No preference; **key collection** Collected · in 3 months · in 6 months · in 9 months · Later; **area / district** free text, required (A-83). | Property type = the mock's grouped list (adds BTO 2-Room, Condo Studio … 5-bedder); **condition** New · Resale · Renovated; **style** Contemporary · Modern · Minimalist · Scandinavian · Japandi · Industrial · Mid-century · Classic · Luxury · Eclectic · Peranakan · Others; **key collection** Collected · Not yet collected; no district field (E-23). | **Mismatch** on three lists, **Missing** the district. **Q-11** which words win per field: recommended keep 2.0's mocked words and add 1.0's extra options where the mock is silent — key collection takes 1.0's five, style adds Vintage · Transitional · No preference, condition maps Existing → Renovated on port. **Q-12** an *Area / District* field (SG regions North · North East · East · West · Central as a select) — recommended, it also feeds lead preferences (DEF-28). |
| DEF-12 | **Name** | First name * + Last name (A-35). | One *Lead name* (E-21). | **Mismatch.** **Q-13** keep one field (recommended — the mock); the port joins "First Last". |
| DEF-13 | **Budget** | Optional whole dollars; a value outside 1,000–5,000,000 is held with a message (B-16). | Optional, cents, no bounds (E-21). | **Mismatch.** **Q-14** adopt the bounds as a form message — recommended. |
| DEF-14 | **Required fields** | First name · Phone · Property type · Area / District · Lead source (A-41). | Lead name · Phone (E-21). | **Mismatch.** **Q-15** keep 2.0's two (recommended: captures and imports cannot always supply the rest, and the mock marks two). |
| DEF-15 | **Free text on the lead** | Remarks (`notes`) and a second *Additional Info* textarea (A-38). | Remarks only (E-50). | **Mismatch.** **Q-16** one field (recommended); the port appends Additional info to Remarks. |
| DEF-16 | **Contact log** | An *outreach attempt*: channel WhatsApp · Call · Email · SMS · In person · Other; outcome No answer · Replied · Callback requested · Not interested · Connected; when (backdatable, never future); notes; evidence (C-15). Attempts feed "first outreach" and the "3 attempts" gate. | A contact log: Contacted via WhatsApp · Email · SMS · Call · Others; Outcome Connected · Callback requested · Meeting scheduled · No response; Date & Time; the optional schedule pair; remarks; screenshot required in the stage window (E-36, E-66). | **Mismatch on two words.** **Q-17** add *In person* as a channel and *Not interested* as an outcome (recommended; "Replied" ≈ Connected). |
| DEF-17 | **Follow-up** | Lead-level next follow-up date + time; saving it creates or updates one *Lead Follow-Up* task and schedules a reminder 30 minutes before (in-app · email · WhatsApp); Overdue / Today / in n days badge on cards; an "Overdue follow-ups" quick filter; the dashboard's "Follow-up due" (B-38, C-23, C-24). | Task-based: the schedule in a contact log raises a task, a quote's due date raises one; the bell derives "untouched lead" and "task overdue"; the card's task box shows Overdue (E-36, E-63, E-85). | **Mismatch.** **Q-03** keep tasks as the single source (recommended) and add: a *Next follow-up* line on the Overview and the listing (= the earliest open task with a due date, off by default in Column settings); a "Set follow-up" quick action creating that task; a notification rule "Remind me 30 minutes before a follow-up" (derived, like the overdue rule); an *Overdue follow-ups* quick filter. |
| DEF-18 | **Duplicates** | One detector (exact phone raw or E.164, or exact email, archived rows included, active match wins) with a studio switch; manual create → confirm "Create this lead anyway?" then the lead is created **and held in the review queue**; email → flagged; webhook → active duplicates **dropped**, archived matches noted (A-48…A-52). | Imports and captures: phone else email against live leads, queued rows and the same file → Review imported leads, side-by-side merge; manual create has **no check**; no switch (E-27, E-28). | **Mismatch.** **Q-18** on Create New Lead with a known phone or email: a dialog *A lead with this phone already exists: {name}* — Open existing lead · Create anyway (creates, not held — recommended; the person already decided). No studio switch (recommended). Webhook drops become review rows in 2.0's stand-in. |
| DEF-19 | **Who sees and moves leads** | Tags owner · admin · id · accounting · manager; a role matrix (pages × actions × data scope) that is **not enforced** for leads except archive; every designer sees every lead unless the Dyel manager flag is on; designers may create, edit, assign (flag off), move forward only (C-51…C-57). | Roles Owner · Admin · Manager · Designer; *Who sees leads* everyone / assigned; reach: Owners and Admins assign anyone, a Manager within the team, a Designer nobody; enforced on the server (E-46, E-47, E-82). | **Built, stricter.** One mismatch: 1.0 lets a designer assign (when no hierarchy); 2.0's Designer cannot. That was the owner's L6 call on 2026-09-24 — recorded, not re-asked. |
| DEF-20 | **Activity** | A persisted log of free-text actions incl. member removed, archive, entity migrated, questionnaire invite sent (B-53, B-54, C-30). | Derived from every table; removals, edits, deletions and undone returns leave no row (E-68). | **Mismatch.** **Q-20** add a small lead event log for exactly the events that leave no row (member removed · field edited · task / note / file deleted · return undone · invite sent), unioned into the derived feed — recommended. |
| DEF-21 | **Files** | Flat file rows with real storage, 10 MB cap, delete without confirm, a per-file "visible to homeowner" flag (B-47…B-49). | Folders, trash with Undo, comments, viewer; bytes are simulated (E-64). | **Built** (2.0 richer). The per-file portal flag → Portal, later. |
| DEF-22 | **Questionnaire** | A studio question bank (Text · Yes / No · Number · Single · Multi · Date, required, enabled, order) answered by the homeowner in the portal or by the studio, with provenance and per-question history; "Ask homeowner" throttled 5 minutes (B-51, B-52, C-75). | Per-lead questions answered by the studio, By Studio / By Client tags, the Ask Client dialog; the studio-level bank is not built (E-54, E-67; REG-246). | **Partial.** **Q-21** build the bank under Company (the question types above, required, enabled, order) so "Ask the client" has something to ask — recommended. History: not proposed. |
| DEF-23 | **Invite to Portal** | Creates the homeowner profile and a lead link with a portal token, records the invite, resends when already invited (B-24). | A dialog that opens WhatsApp; nothing stored (E-74). | **Mismatch.** **Q-22** store the invite (a row, an Activity line "Invited to the portal", an "Invited on" chip) — recommended, small. |
| DEF-24 | **Notifications** | Events: lead assigned · lead status changed · lead captured (webhook) · follow-up reminder (T−30) · hold restart ping · questionnaire requested / answered · task assigned · task due reminder; channels in-app · email · WhatsApp · daily digest; recipients per category; editable templates (C-62…C-65). | Events: new lead · assigned · untouched lead · quote approval · quote confirmed · quote signed · task overdue; events × channels; the untouched delay; "no follow-ups once closed"; editable messages (E-85, E-86). | **Mismatch on the event set.** **Q-23** add *Lead stage changed* (Owners, Admins, members), *Follow-up in 30 minutes* (the assignee), *On Hold date reached* (the assignee — closes Q-06), *Client answered the questionnaire* (members). Recommended. |
| DEF-25 | **Reports** | The Performance view (owner / admin): three turnaround medians with deltas vs the prior window, awaiting counts, a by-member table; the per-lead Response time card; dashboard widgets (A-74…A-77, C-66…C-68). | None: Insights answers coming soon, the Dashboard waits for mocks (E-95, E-96). | **Missing.** **Q-24** build *Insights* on the listing now from 2.0's own records (created → assigned from `assigned_at`, assigned → first contact from logs, first contact → Won from the Won log) on the DS, or wait for the Dashboard mocks. Recommended: build now. |
| DEF-26 | **Custom fields · categories · pipeline stages** | Custom lead fields (text · number · date · dropdown · multi-select · file; required; order) rendered on the drawer; Lead Categories (saved, never used); Pipeline Stages (a legacy table the board no longer reads) (B-31, C-42…C-44). | None. | Custom fields **Missing** — **Q-25** adopt (Settings › Leads › Custom fields + a section on the Overview's info column)? The demo studio configures none; recommended hold unless a studio asks. Categories and Pipeline stages: **Dead**, not ported. |
| DEF-27 | **Workflow toggles** | Quote approval required · Contract required for Signed · Project type required · Require assignment for Ongoing · Auto-create follow-up tasks, plus approvers (C-46). | Quote approval is a setting; assignment, the signed quote, the contract and the project type are hard rules of the Won step (E-39, E-45, E-76). | **Partial.** **Q-26** adopt the toggles? Recommended no — the Won step is the mock; the devs keep them as configuration on their side. |
| DEF-28 | **Lead preferences and the recommendation** | Per designer: *Open to new leads* and five preference categories (property type · budget · style · area · scope) weighted Must match / Nice to have; a deterministic *AI Recommendation* card on an unassigned lead scoring preference 40 · performance 35 · specialty 25 (B-35, C-37). | None (Members has role and reports-to only). | **Missing.** **Q-27** adopt *Open to new leads* + preferences on Company › Members and a "Suggested: {member}" line in the Assign popover computed the 1.0 way (no AI) — recommended. |
| DEF-29 | **Fill a lead from a document** | Paste, drop or browse a PDF / image / CSV / XLSX on the New Lead drawer; an AI read fills the empty fields with region-aware matching (A-55…A-57). | The import wizard reads Homematch PDFs / XLSX / CSV into the review sheet; the form has nothing (E-25). | **Platform** (real AI). **Q-28** a scripted stand-in on Create New Lead ("Fill from a document" → fixed values, like Auto Fill) for the demo — recommended. |
| DEF-30 | **Country / region** | Five regions, a country per lead driving phone rules, currency, option lists (A-83, C-59). | Singapore only. | **Platform.** Not ported (one Singapore studio); the map notes every region-scoped field. |
| DEF-31 | **Project conversion** | Signing or choosing Signed opens Create Project; the lead is parked at Signed › Project started, "Go to Project", a Draft project with commission pending (B-71, C-27). | The Won step ends with "Project created · OM-n" and creates nothing (E-39). | **Later** (Projects). |
| DEF-32 | **Issuing entity on the lead** | `company_id` on the lead, validated and migrated with its quotes (B-64, C-50). | Per quote and per contract (REG-595). | **Later** (Quotes). Recommended: no lead-level entity. |
| DEF-33 | **Meetings · copilot · visualiser · hangouts** | Live meeting co-pilot from the drawer, briefs saved to the lead, AI visualiser / 3D planner per journey step, hangout leads (B-14, B-78…B-80). | Tools tiles coming soon; Meetings hidden until mocks (REG-552). | **Later** (Tools). |

## 2. Mismatches — both have it, they disagree

The owner asked for these to be flagged apart. Each names the two behaviours and the decision that settles it. Port notes (where only the storage differs) sit at the end.

| # | Feature | 1.0 does | 2.0 does | Settle by |
|---|---|---|---|---|
| MM-01 | Lead position | bucket / status / sub-status, studio-editable | seven fixed stages | Q-01 · Q-02 |
| MM-02 | On Hold | five duration tiers × three sub-reasons, follow-up date required, 09:00 revisit ping (Journey) | reason (four) · duration · follow-up date · no reminder | Q-05 · Q-06 |
| MM-03 | Lost | Inactive sub-statuses or the close wizard's seven reasons with detail, proof, confirm; open tasks cancelled | five reasons, nothing else changes | Q-07 · Q-29 |
| MM-04 | Return to Qanvast — when | only a CLOSED, not Signed, Qanvast lead | any Qanvast lead; the wizard parks it Lost | Q-08 |
| MM-05 | Return to Qanvast — reasons | seven reasons with their own fields | one reason | proposal D-43 |
| MM-06 | Removing the last member | allowed after a confirm; the lead drops to New / Unassigned | refused past New | Q-09 |
| MM-07 | Designer assigning | may assign when no hierarchy is on | never assigns | owner's L6 call, recorded |
| MM-08 | Duplicate on manual create | confirm, then created **and** held for review | no check | Q-18 |
| MM-09 | Duplicate from a webhook | active match dropped, archived match noted | (stand-in) known phone → review | Q-18, note for the devs |
| MM-10 | Export | the **filtered** set, 23 columns incl. status · sub-status · follow-up · temperature · quote status · project type | **all** leads, 10 columns, four formats | proposal L-32 |
| MM-11 | Default date window | the listing opens on the last 30 days (search suspends it) | every lead | Q-30 |
| MM-12 | Condition / property status | New · Resale · Existing | New · Resale · Renovated | Q-11 |
| MM-13 | Style | ten incl. Vintage · Transitional · No preference | twelve incl. Mid-century · Classic · Luxury · Peranakan | Q-11 |
| MM-14 | Key collection | Collected · in 3 · 6 · 9 months · Later | Collected · Not yet collected | Q-11 |
| MM-15 | Area / District | required free text | none (property address only) | Q-12 |
| MM-16 | Contact channel · outcome | + In person; outcomes No answer · Replied · Callback requested · Not interested · Connected | no In person; Connected · Callback requested · Meeting scheduled · No response | Q-17 |
| MM-17 | Follow-up | a date on the lead → one follow-up task + a T−30 reminder | tasks only; no reminder before | Q-03 · Q-23 |
| MM-18 | Activity | persisted, includes removals and deletions | derived, silent on removals and deletions | Q-20 |
| MM-19 | Bulk assign | filter-driven "Assign n" or list multi-select; **replaces** every member with one (or unassigns); cap 2000; no notifications | none | Q-31 |
| MM-20 | Budget | held outside 1,000–5,000,000 | any number | Q-14 |
| MM-21 | Required fields | five | two | Q-15 |
| MM-22 | Name | first + last | one | Q-13 |
| MM-23 | Free text | Remarks + Additional info | Remarks | Q-16 |
| MM-24 | Invite to Portal | stored (profile, link, token), resend | nothing stored | Q-22 |
| MM-25 | Questionnaire | studio bank + homeowner answers + history | per-lead questions, studio answers | Q-21 |
| MM-26 | Notification events | assigned · status changed · captured · follow-up T−30 · hold restart · questionnaire | new lead · assigned · untouched · quote events · task overdue | Q-23 |
| MM-27 | Won / Signed | creates a Draft project, parks the lead at Project started | "Project created" snackbar, nothing created | Later (Projects) |
| MM-28 | Closing cancels tasks | entering Closed cancels the lead's open tasks and reminders | Lost leaves tasks open | Q-29 |
| MM-29 | Reassignment moves tasks | changing the assignee re-assigns the lead's open tasks | tasks keep their own members | Q-32 |
| MM-30 | Undo after closing | "Lead moved to Closed" toast with Undo | Undo only on Flexible moves | Q-33 |
| MM-31 | Delete / archive blockers | archive is blocked while a signing link is live (or forced) | delete asks a reason only | Q-04 |
| MM-32 | Project type | Renovation-Full Home · New-Full Home · Renovation-Partial · New-Partial · Commercial · Others (taxonomy) | Whole-home renovation · Partial renovation · Commercial fit-out (the Won step's mock) | Q-34 |
| MM-33 | Attachments at creation | multi-file upload on the New Lead form, 10 MB each | none on the form | proposal C-08 |
| MM-34 | Custom fields | per-studio fields on the lead | none | Q-25 |
| MM-35 | Lead-level quote facts | `quote_status` mirror, IC / NRIC, Customer ID, Quote valid until on the lead, printed on the quote | per quote (`nric`, `customer_id`, `valid_until`) | Later (Quotes); Q-35 IC / NRIC + Customer ID on the lead too |
| MM-36 | Search | name · area · phone · email | everything a row shows, phone at any length | none needed (2.0 superset) |
| MM-37 | Kanban | four bucket columns with per-column status filters, collapse per column, orphan bucket | seven stage columns in two bands, band rails | none needed (follows MM-01) |
| MM-38 | Source list | taxonomy + the email platforms Homereno · Houzz · Renopedia | settings list | proposal DEF-10 |

Port notes (storage only, no product decision): phone free text / E.164 → 8 digits; budget dollars → cents; `property_type` region keys → mock labels; `source` slugs → the settings names; uuid → text ids; timestamps → unix seconds (D §0.2, §3.4 D).

## 3. Feature matrix

Columns: the 1.0 feature (inventory row) · what 1.0 does · what 2.0 has (inventory row) · status · proposal or question · your mark.

### 3.1 Listing, views, filters, kanban, mobile

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| L-01 | Listing page + counts (A-01) | Loads every lead (paged 1000) with members and an "any outreach?" probe; head reads "n of m" · "k hot" · "p pending review"; error and loading states. | Table + kanban, scope pill counts, review banner (E-1, E-14, E-29). | Built | "k hot" depends on Q-10. | |
| L-02 | Kanban · List · Performance toggle (A-02) | Three views; Performance for owner / admin only; not persisted. | Table ↔ kanban, remembered per browser (E-11). | Partial | Performance → R-01. | |
| L-03 | Kanban by bucket (A-03) | Four bucket columns, statuses within, an "Uncategorized" column for orphans, virtualised. | Seven stage columns in ACTIVE / INACTIVE bands (E-18). | Built | Follows DEF-01. | |
| L-04 | Collapse a bucket, remembered; Expand all (A-04) | Per-column collapse with a persisted override; empty columns auto-collapse. | Band rails collapse; columns do not. | Partial | Not proposed — the mock's bands stand. | |
| L-05 | Per-column status filter (A-05) | Multi-select of the bucket's statuses inside each column head. | Stage scope pill. | Excluded | Needs sub-statuses (Q-01). | |
| L-06 | Card contents (A-06) | Initial avatar · name · age · status · hold badge · Attention / Duplicate pills · S$k budget · area · source chip · members · sub-status · follow-up badge · commission pending. | Name · age · kebab · phone · budget · source · task box · members · unseen band (E-20). | Partial | Attention / Duplicate: not needed (review happens before a lead exists). Follow-up badge → Q-03. Area → Q-12. Commission pending → Later. | |
| L-07 | List view columns (A-07) | Name · Budget · Type · Area · Source · Assigned · Bucket · Status · Sub-Status · Follow-up; sort on the first eight; no chooser. | Lead Name · Stage · Tasks · Members · Source · Budget · Property Type · Created · Address · Last contact, Column settings, pins, resize, drag (E-1, E-16). | Built | Area → Q-12; Follow-up column → Q-03. | |
| L-08 | Open a lead + deep links (A-08) | A drawer; `?openLead=` `?leadId=` `?quoteId=` `?openQuote=` from every notification link. | A page with a stable URL, `?from=` back-navigation, notification hrefs (E-12, E-49). | Built | | |
| L-09 | Follow-up badge (A-09) | Today · Overdue nd · in nd from the lead's next follow-up. | The task box's Overdue / +n; "On hold till" (E-20). | Partial | Q-03. | |
| L-10 | On Hold badge (A-10) | "On Hold · {restart date}". | "On hold till: {date}" on row and card (E-1). | Built | | |
| L-11 | Attention / Duplicate flags (A-11) | Set by ingestion; pills on cards; a dead `LeadFlags` component. | Duplicates are review rows, never leads (E-27). | Built | Different model, same outcome. | |
| L-12 | Commission Pending badge (A-12) | A Draft project awaiting the owner's commission approval. | — | Later | Projects. | |
| L-13 | Journey intro banner · mini-rail (A-13, A-14) | | | Excluded | | |
| L-14 | Back to top (A-15) | After two viewport heights. | — | Missing | Not proposed (small; the sticky head suffices). | |
| L-15 | Page context for the assistant (A-16) | Counts and the focused lead handed to mAIson. | Maison AI registers per-page suggestions (E-93). | Built | | |
| L-16 | Keyboard: "C" new lead (A-17) | Global shortcut when allowed. | "/" focuses search (E-9). | Missing | Proposal: "C" opens Create New Lead on the listing. | |
| L-17 | Visibility scoping (A-18) | Client-side for designers, server-side only for the manager flag. | Who sees leads + roles, server-enforced (E-46, E-47). | Built | 2.0 stricter. | |
| L-18 | Bucket / status resolution incl. legacy statuses (A-19) | Derives a position from the legacy `status` when the triple is empty. | One `stage` column. | Built | Port map D §3.4 D. | |
| L-19 | What counts as the pipeline (A-20) | Excludes held-for-review, rejected and archived leads. | Excludes deleted; review rows are not leads (E-5, E-28). | Built | | |
| L-20 | Search (A-21) | name · area · phone · email; typing suspends the 30-day window. | Everything shown, phone at any length (E-9). | Built | | |
| L-21 | Filter & Sort popover (A-22) | Quick filters · Sort · Bucket · Member · Source · Date created · Clear. | Filters modal Sort · Property type · Source · Members · Date; stage on the pill (E-14, E-15). | Partial | Quick filters missing → L-22. | |
| L-22 | Quick filters (A-23) | Overdue follow-ups · Unassigned · Needs attention · Hot · On hold (AND). | — | Missing | Proposal: a *Quick filters* pane in the Filters modal — Overdue follow-ups · Unassigned · Unseen · Hot (with Q-10). Needs attention has no 2.0 meaning; On hold is the pill. | |
| L-23 | Sort newest / oldest (A-24) | | Sort pane (E-15). | Built | | |
| L-24 | Bucket filter (A-25) | Single-select bucket. | Stage pill (E-14). | Built | | |
| L-25 | Member filter any-of (A-26) | | Members pane (E-15). | Built | | |
| L-26 | Source filter (A-27) | Single-select over the taxonomy. | Multi-select over the settings list (E-15). | Built | | |
| L-27 | Date created (A-28) | Today · Last 7 · Last 30 · This month · From / To; the **default 30-day window**, suspended while searching. | Today · 7 · 30 · Custom, no default window (E-15). | Mismatch | Q-30 the default window; proposal: add "This month". | |
| L-28 | Filter chip row + Clear all (A-29) | Chips per active filter above the board. | Badge count on the Filters button, applied dot on the pill, Clear All (E-14, E-15, E-17). | Built | The mock has no chip row. | |
| L-29 | Active-filter count badge (A-30) | | Badge "Filters (n active)" (E-15). | Built | | |
| L-30 | Empty states (A-31, A-03, A-07) | Cold start · filtered · none. | No leads yet · No results found (E-8, E-17). | Built | | |
| L-31 | Column settings · saved views (A-32) | None in 1.0. | Column settings per browser (E-16). | 2.0 only | | |
| L-32 | Export as CSV (A-54) | The **filtered** set; 23 columns (see MM-10); UTF-8 BOM. | Export all as… CSV · XLS · XLSX · PDF, **all** leads, 10 columns (E-4). | Mismatch | Proposal: a choice *All leads / What the list shows* and the full column set in 2.0's words (Stage · Members · Next follow-up · Condition · Style · Area size · Key collection · Remarks · Created as a date). | |
| L-33 | Archived Leads view (A-71) | | Deleted Leads sheet (E-5). | Excluded | | |
| L-34 | Header kebab (A-88) | Export · Archived · Lead experience (owner). | Import History · Export · Deleted · Settings (E-3). | Built | | |
| L-35 | Temperature (A-89) | See DEF-09. | — | Missing | Q-10. | |
| L-36 | Mobile card list with bucket tabs and swipe (A-79) | Tabs per bucket, swipe to switch, second search box on phones. | Cards ≤767 with the pill, filter glyph and search (E-89). | Built | Swipe not proposed (the canvas draws tabs as chips). | |
| L-37 | Add Lead · Insights · kebab in the header (E-3) | 1.0: Add Lead + kebab only. | Add Lead ▾ (Create · Import · Link to Email · Zapier · Ads) · Insights (soon) · kebab. | 2.0 only | Insights = R-01. | |
| L-38 | Unseen-lead band (E-6) | 1.0 has no "unseen" state. | `seen_at` band, cleared on first click. | 2.0 only | | |
| L-39 | Lead row / card menu (E-2) | 1.0 rows have no menu (removed). | Delete · Return Lead. | 2.0 only | | |

### 3.2 Lead creation

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| C-01 | Add Lead gated on `leads.create` (A-33) | Hidden for roles without it; tag defaults let designers create. | Add Lead ▾ for everyone (E-3). | Partial | Fold into P-02: every role creates (a Designer's new lead is assigned to them, C-07). | |
| C-02 | New Lead drawer (A-34) | Sections: Fill from a document · Client · Project requirements · Property · Other · Assign · Documents; Full / Compact; "Fix Errors to Save". | One Create / Edit modal, a sheet on the phone (E-21). | Built | | |
| C-03 | Client fields (A-35) | First * · Last · Email · Phone * with a dial code (multi-country) · Lead Source * with "Others…" free text. | Lead name * · phone * (+65) · email in Additional info · source from the settings list (E-21). | Mismatch | Q-13 (name) · Q-15 (required). "Others…" free text → the settings list already covers it. | |
| C-04 | Project requirements (A-36) | Property Type * (region list) · Budget · Area / District *. | Property type · budget (Additional info); no district. | Mismatch | Q-12 (district) · Q-14 (budget bounds) · Q-15. | |
| C-05 | Property info (A-37) | Property Status · Style · Area Size + unit · Key Collection · Property Address (helper "Used in quote PDF + signing page"). | Condition · Style · Area size + unit · Key collection · Property address (E-21). | Mismatch | Q-11 (three lists). | |
| C-06 | Other info (A-38) | Remarks + Additional Info. | Remarks (E-21). | Mismatch | Q-16. | |
| C-07 | Assign at creation (A-39) | Multi-pick with search by name or specialty, an "accepting leads" dot, auto self-assign for a designer who picks nobody, an even commission split, the manager lock. | Assign member field, role reach (E-22, E-46). | Partial | Proposal: a Designer creating a lead is assigned to it (their name pre-ticked, cannot be cleared). Specialty / accepting → Q-27. Split → Later. | |
| C-08 | Documents at creation (A-40) | Multi-file, 10 MB cap, stored, an activity row per file. | None on the form; the Files tab uploads (simulated) (E-64). | Missing | Proposal: an *Attach files* row in Additional info that lands the files in the Files tab (the same simulated upload). | |
| C-09 | Validation (A-41) | Required five; budget positive; region phone rule; errors clear live. | Required two; SG phone rule; email; budget digits; date; live clearing (E-21). | Built | Q-14 · Q-15. | |
| C-10 | Save flow (A-42, A-45) | Duplicate probe → POST → optimistic prepend → upload files → toast. | One transaction, notifications, snackbar (E-21). | Built | Duplicate probe → C-13. | |
| C-11 | `/leads/new` full page (A-43) | A second path from the quick-action menu: same fields + Temperature + a quote upload that auto-parses line items. | One path. | Built | Temperature → Q-10; quote upload at creation → Later (Quotes; the Create Quote modal's "Upload a quote" is coming soon). | |
| C-12 | Server create (A-44) | Intake position (Assigned when a member is set) · dedupe flag · manager stamp · `first_assigned_at` · one assigned notification · "Lead created" activity · usage event. | `createLead`: lead + members in one transaction, new_lead / assigned notifications, derived Activity (E-21, E-85). | Built | `first_assigned_at` → R-03. The `parkedForProject` variant → Later (Projects). | |
| C-13 | Duplicate pre-check (A-46) | Phone (≥ 6 digits, contains) or email → "A lead with this {phone number / email} already exists: {name}. Create this lead anyway?" → created and held for review. | None on the form. | Missing | Q-18. | |
| C-14 | `AssignmentSection` + AI Recommendation (A-47) | See D-29 and Q-27. | | — | | |
| C-15 | Fill from a document (A-55…A-57) | Paste · drop · browse; Gemini reads name · phone · email · budget · property type · address · district · floor area · source · status · style · timeline · project type · remarks; fills only empty fields; synonym tables per field; the file is attached on save. | None on the form; Homematch PDF import exists (E-25). | Platform | Q-28 (scripted stand-in). The synonym tables (source, status, timeline, floor area units) go to §5 for the devs. | |
| C-16 | Other intake surfaces (A-87) | Hangout admin lead, the mAIson agent's `create_lead`, a parked lead for a project. | — | Later | Hangouts · AI · Projects. | |

### 3.3 Intake: duplicates, review, capture, bulk actions

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| I-01 | Duplicate detector + studio switch (A-48, C-33, C-36) | Exact phone (raw or E.164) or exact email, archived rows included, active match wins; the switch "Detect duplicate leads" (default on) gates manual, email, hangout and agent creates; the webhook always checks. | Phone else email against live leads, queued rows and the same file; no switch (E-27). | Partial | Q-18. Recommended: no switch. | |
| I-02 | Leads Pending Review queue (A-49) | Held leads (email / webhook arrivals, manual duplicates) above the board: source tabs · Sync · Approve All · per row Merge into original / Keep both / Approve / Reject / View; confirm dialogs; a mobile overlay. | Review imported leads: source chips, duplicates switch, Approve All Clean, queue cards, side-by-side merge, Reject · Keep Both · Merge into Existing (E-28, E-29). | Built | 2.0 is the superset. | |
| I-03 | Approve · Reject · Keep both semantics (A-50) | Reject keeps a hidden lead row; Keep both clears the flags. | Rows are never leads until approved (E-27). | Built | | |
| I-04 | Merge into original (A-51) | Fills the original's **empty** fields from twelve columns; appends "[Merged from duplicate lead] …" to notes; hides the duplicate; nothing else merges. | Radios on Lead name · Phone · Email · Budget; the other phone kept as "Alt phone" in Remarks (E-28). | Partial | Proposal: fill every mapped field that is empty on the existing lead automatically (property type · address · condition · style · area size · key collection · start date · remarks) and keep the radios where both sides have a value. | |
| I-05 | Bulk approve (A-52) | | Approve All Clean (E-28). | Built | | |
| I-06 | Lead CSV import (A-53) | **None in 1.0** — the CSV dialog imports price-book items. | Import wizard CSV · XLSX · Homematch PDF, mapping, preview, routing, history (E-24…E-31). | 2.0 only | | |
| I-07 | Webhook endpoints (A-58, C-47, C-48) | Generate a URL per source (Generic · Google Ads with a signing key · Meta via Zapier); counters, last received, a request log, regenerate, revoke. | Company › Integrations: Website form by email · Meta Lead Ads stand-in with forms and a field map · Zapier coming; no endpoints or tokens (E-83). | Platform | Proposal: a *Webhook* card in Integrations (a generated URL + key, "n received · n created · n duplicates", a log of simulated arrivals) so Zapier / Google Ads stop being "coming soon". Q-36. | |
| I-08 | Webhook receiver rules (A-59…A-61) | 64 KB cap · 10 / minute · HMAC or Google key · test leads acknowledged, not saved · idempotent on `external_lead_id` · active duplicates dropped · lands in review · `lead.captured` to Owners and Admins · field aliases (`full_name`, `mobile`, `message`, `budget_cents` ÷ 100) · Google Ads column mapping. | `captureLead` records an arrival as a one-row import (E-84). | Platform | For the devs (§5). 2.0's stand-in keeps the review landing and the new-lead notification. | |
| I-09 | Qanvast ingestion (A-62) | **None** — Qanvast is a source value, an email sender domain and an optional webhook label; no API. | Qanvast "Connected", seeded Qanvast leads, Return Lead, Qanvast Ops (E-75, E-83). | 2.0 only | Note for the devs: there is no 1.0 Qanvast integration to port; 2.0's feed is an assumption to confirm with Qanvast. | |
| I-10 | Gmail connection (A-63, C-40) | OAuth connect, sender domains (Homereno · Homerenoguru · Houzz · Renopedia · Qanvast) + custom domains, status, last sync, Sync Now, disconnect, several accounts. | The intake address stand-in; Integrations "Website form by email" (E-79, E-83). | Platform | Proposal: an *Email lead sources* card in Integrations — a Gmail stand-in with the platform list editable and "Simulate an enquiry from {platform}". Q-36. | |
| I-11 | Email poll (A-64…A-66) | Every minute; 20 messages; skips seen ids; AI parse; a parse failure creates "Unknown (parse failed)" with needs-attention; property-type normalisation; duplicates flagged not dropped; sources stored lower-case. | — | Platform | For the devs (§5). Proposal from it: Homereno · Houzz · Renopedia in the default sources (DEF-10). | |
| I-12 | Manual sync (A-65) | Runs the poll for the studio from the review queue. | "Simulate an enquiry arriving" (E-79). | Built | Stand-in. | |
| I-13 | Source chip vocabulary (A-67) | Known chips, "Qanvast Hangout" for Hangout, "Unknown" when empty. | Settings list; Qanvast green (E-78). | Built | | |
| I-14 | Filter-driven bulk assign "Assign n" (A-68) | Assigns **everything the board shows** to one member (or unassigns), cap 2000, chunks of 400, no notifications, "skipped — outside your access". | None (E-1: no multi-select). | Missing | Q-31 — recommended: selection on the table (the Deleted sheet's pattern) + a bulk bar *Assign · Delete*; Assign opens the Assign popover for the selection with role reach, **adding** members (Q-31 decides add vs replace). | |
| I-15 | List multi-select bar (A-69) | Checkbox column, shift-range, survives filter changes ("n hidden by filters"). | — | Missing | With I-14. | |
| I-16 | Bulk assign server rules (A-70) | Replaces all members with one; owning-manager stamping; no TAT stamp, no notification, no activity. | — | Missing | With I-14; 2.0 notifies the added members (E-44). | |
| I-17 | Archive · revive · blockers · cascade (A-71…A-73) | See DEF-03. | Delete (E-5). | Excluded | Q-04. | |
| I-18 | Lead Import History (E-31) | 1.0 has no import record. | Page with per-file counts and skipped-row download. | 2.0 only | | |

### 3.4 Reports and readiness

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| R-01 | Performance view (A-74, A-75, C-25) | Owner / admin; Last 30 · 90 days · All time; three cards *Creation → Assignment* · *Assignment → First outreach* · *First outreach → Signed* (median headline, "avg x · n leads", delta vs the prior window, a decrease reads as improving); "n awaiting assignment" · "n assigned, no outreach"; a *By team member* table (Member · Leads · the two turnarounds · Signed · Awaiting outreach) attributed to whoever logged the first outreach; grades ≤ 8 h good · ≤ 24 h warn. | Insights: coming soon (E-3). | Missing | Q-24. Computed from 2.0's records: created → `min(assigned_at)`, → the first contact log or Contacted move, → the Won log; Won = 1.0's Signed. Built on the DS (tiles + the listing's table model). | |
| R-02 | Turnaround stamps (A-76, C-25) | Write-once `first_assigned_at` · `first_outreach_at/by` (re-stamped earlier for backdated logs) · `signed_at`; never cleared by reassignment or deletion. | Derivable from `lead_assignees.assigned_at`, contact logs, stage logs (E-10, D §3.2). | Built (derived) | For the devs: 2.0 derives, 1.0 stamps; deriving is exact while the source rows exist (deleting a contact log would move the number — the event log of Q-20 keeps it). | |
| R-03 | Response time card (A-77, B-13) | On every lead: the three legs with done · running (live) · pending, "SIGNED / IN PROGRESS", lead age. | — | Missing | Proposal: a *Response time* line in the Overview's Lead stages card ("Assigned in 2h · First contact in 1d · Won in 12d"). With R-01. | |
| R-04 | Conversion readiness (A-78, B-70) | A checklist gated by the workflow toggles: Designer assigned · Quote approved · Contract uploaded · Project type; Convert to Project only when complete. | The Won step enforces the same four (signed quote · contract · 100 % split · project type); Convert to Project opens Won (E-39, E-43). | Built | Toggles → Q-26. | |
| R-05 | Dashboard lead widgets (C-66…C-68) | Active Leads count; Leads widget New / Active / Closed; Studio Pulse (leads per day vs the prior week; All → Contacted → Quoted → Signed); Team Workload (leads per member); Upcoming (follow-ups in 7 days); Priority (follow-ups due, unassigned new leads); chat-first intents "Draft a follow-up" · "What leads need attention?" · "Analyze a lead". | Dashboard held for mocks (L7); Maison AI suggestions on the listing (E-93, E-96). | Missing | Waits for the Dashboard mocks (owner's L7 hold). The numbers are the same ones R-01 computes. | |

### 3.5 Lead detail

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| D-01 | Drawer + deep links (B-01, B-02, B-04) | A right drawer with Status & Activity / Lead Info tabs, compact / full, URL-synced quote id. | A page: L2 header, eight tabs, `?from=` (E-49). | Built | | |
| D-02 | First-time tip (B-03) | "Your lead profile" coach mark once per browser. | The Maison AI brief per stage (E-51). | Built | Not proposed. | |
| D-03 | Tool-page gate (B-05) | Platform admins can switch tools off per studio ("This tool is turned off for your studio"). | Coming-soon affordances. | Platform | | |
| D-04 | Identity zone (B-07) | Avatar · name · temperature · status · country chip · "Refund: {status}". | Name · chips call · budget · type · source · return tags · Stage pill (E-49). | Built | Temperature → Q-10. | |
| D-05 | Header actions (B-08) | WhatsApp (wa.me) · Start Live Meeting · Full / Compact · More. | WhatsApp + copy in the info column; kebab (E-50). | Built | Live Meeting → Later (Tools). | |
| D-06 | Kebab (B-09) | Edit Lead Info · Archive · Request Return & Refund · Activity Log. | Edit · Invite to Portal · Return Lead · Copy Link · Delete (E-49). | Built | | |
| D-07 | Flag callouts (B-10) | Needs Attention · Possibly Duplicate with "View Original →". | Review sheet before the lead exists (E-28). | Built | | |
| D-08 | Commission-pending callout (B-11) | | | Later | Projects. | |
| D-09 | Notes card (B-12) | Remarks read-only on the status tab. | Other info › Remarks (E-50). | Built | | |
| D-10 | Response time card (B-13) | | | Missing | R-03. | |
| D-11 | Meeting Intelligence · Briefs (B-14) | | | Later | Tools. | |
| D-12 | Whole-drawer autosave (B-15) | 700 ms debounce, "All changes saved", save-valid / hold-invalid on status moves, "Not saved — {reason}", guarded close (B-20), Cancel re-seeds (B-21). | Explicit Save in the Edit modal; notes autosave; the Move stage window validates on Save (E-21, E-34, E-66). | Built | Different model by mock; not proposed. | |
| D-13 | Status-move validation gate (B-16, C-03) | See S-03. | | Built | | |
| D-14 | Side effects of a status commit (B-17, C-23) | Unassigned ↔ Assigned auto-shift; **entering Closed cancels open tasks**; **an assignee change re-assigns open tasks**; follow-up task upkeep; reminder scheduling; `signed_at`; notifications. | Stage move = one transaction with the log and suggested tasks; assignment notifications (E-34, E-44). | Mismatch | Q-29 (cancel on Lost) · Q-32 (re-assign tasks) · Q-03. | |
| D-15 | "Lead moved to Closed" Undo (B-18) | A toast with Undo restoring the previous position. | Undo only on Flexible moves (E-42). | Mismatch | Q-33 — proposal: an Undo snackbar after Lost and On Hold in both policies (the delete pattern). | |
| D-16 | Auto-open Create Project on Signed (B-19) | | Won step (E-39). | Later | Projects. | |
| D-17 | Contact view + edit (B-22, B-23) | tel: / mailto: / copy / source chip; the edit fields of C-03. | Info column identity block + Edit form (E-50, E-21). | Built | C-03. | |
| D-18 | Invite to Portal (B-24) | See DEF-23. | E-74. | Mismatch | Q-22. | |
| D-19 | Project details tiles (B-25, B-26) | Budget · Property · Area. | Lead info section (E-50). | Built | Q-12. | |
| D-20 | Property info (B-27, B-28) | | Property info section (E-50). | Built | Q-11. | |
| D-21 | Other info (B-29) | Remarks + Additional info; the outreach log can append a summary block to Remarks. | Remarks (E-50); contact logs live on the Notes tab. | Built | Q-16. | |
| D-22 | Document details (B-30) | IC / NRIC · Customer ID · Quote valid until on the lead, printed by the quote. | Per quote (`nric`, `customer_id`, `valid_until`) (REG-567, 578, 588). | Mismatch | Q-35 — proposal: IC / NRIC and Customer ID as lead fields in Additional info that pre-fill every new quote. | |
| D-23 | Custom fields section (B-31) | Per-studio fields, a separate autosave lane. | — | Missing | Q-25. | |
| D-24 | Assigned Designers (B-32…B-34) | Chips with specialty and split %; add / remove with immediate writes; the last-member confirm and downgrade; member_added / removed activity rows; cascade onto the project team. | Collaborators + Assign popover, owner rule, notifications, "You assigned X" (E-44, E-48, E-50). | Partial | Q-09 · Q-20 (removals in Activity) · split → Later. | |
| D-25 | AI Recommendation (B-35) | Deterministic scoring of accepting members: preference 0–40 · performance 0–35 · specialty 0–25, with the reason sentence. | — | Missing | Q-27. | |
| D-26 | Legacy notify-only assign route (B-36) | | | Dead | | |
| D-27 | Classic Lead Status controls (B-37) | Status + Sub-status selects; designers forward-only, no Unassigned. | Stage dropdown under the policy (E-33). | Built | Q-01. | |
| D-28 | Next Follow-Up + the follow-up task (B-38) | See DEF-17. | | Mismatch | Q-03. | |
| D-29 | Project Type picker (B-39) | Taxonomy `project_type` (six defaults), required for Signed. | The Won step's three (E-39). | Mismatch | Q-34. | |
| D-30 | Contract block (B-40) | Uploaded / sent for signature (viewed) / upload or create, opening the Contract Flow. | Won step's contract tabs; the Contracts tab (E-39, E-70). | Built | Signing internals → Later. | |
| D-31 | Legacy status · follow-up APIs (B-41, B-42) | | | Dead | | |
| D-32 | Journey section · hold · resume · close (B-43…B-46) | | | Excluded | Rules under DEF-05 / DEF-06. | |
| D-33 | Files section (B-47…B-49) | Upload (10 MB, 3D formats exempt) · list · view · remove without confirm; `contract_uploaded:` activity when the name says contract. | Files tab (E-64, E-65). | Built | 2.0 confirms trash; no contract-name magic (Contracts tab owns contracts). | |
| D-34 | Artifacts API (B-50) | | | Excluded | | |
| D-35 | Homeowner questionnaire widget (B-51) | See DEF-22. | Questionnaire tab (E-67). | Partial | Q-21. | |
| D-36 | Ask the homeowner (B-52) | Portal link with `?action=answer-questions`, 5-minute throttle, "Last sent", a notification, an activity row. | Ask Client dialog: link, Copy, Send via WhatsApp → snackbar; nothing recorded (E-54). | Partial | Proposal (with Q-22): record the ask — "Asked on {date}" in the card and an Activity line; throttle not needed. | |
| D-37 | Activity Log (B-53, B-54) | See DEF-20. | Activity tab (E-68). | Mismatch | Q-20. | |
| D-38 | Return & refund eligibility (B-55) | Qanvast · CLOSED · not Signed · no request; a dead 7–30-day helper. | Qanvast · not processing / approved (E-72). | Mismatch | Q-08 · Q-44. | |
| D-39 | Return wizard (B-56) | Seven reasons with fields (sub-reasons for "refused to meet", last attempt date · time, attempts, duplicate search, project reference, "what's incorrect", attachments, comments); the policy PDF; tips; a three-step confirm with the terms checkbox. | One reason "Lead not contactable" (+ first outreach, attempts, attachments, comments), terms, confirm, Undo (E-72). | Partial | Proposal: adopt the seven reasons and their fields verbatim — Lead is junk/spam · Duplicate lead · Lead already a client · Lead refused to meet up (5 sub-reasons) · Lead not contactable · Wrong contact info (4 fields) · Others. Keep 2.0's Undo. | |
| D-40 | Refund request persistence (B-57, C-73) | One per lead; reason · sub-reasons · notes; pending → approved / rejected by the Qanvast admin. | `lead_returns` with the reply side, refund status, credits (E-72, E-73). | Built | 2.0 models both sides; Qanvast's `refund_reasons` catalogue (Unresponsive Lead · Not Qualified · Duplicate Lead · Other, with sub-reasons) noted in §5 for the devs. | |
| D-41 | Quote summary · quotes section · approve / reject · line comments · signature certificate · entity tag (B-58…B-63) | | QUOTES card, Quotes tab (E-53, E-69). | Later | Quotes. Lead-side note: 1.0 mirrors the primary quote's status onto the lead; 2.0 reads the quotes rows. | |
| D-42 | Entity migration (B-64) | | | Later | Quotes; DEF-32. | |
| D-43 | Archive · revive (B-65, B-66) | | | Excluded | Q-04. | |
| D-44 | Engagement state API (B-68) | | | Dead | Only hold / resume survive (DEF-05). | |
| D-45 | Promote lead link to project (B-69) | | | Later | Projects. | |
| D-46 | Conversion readiness · Create Project (B-70…B-72) | | Won step (E-39, E-43). | Built / Later | R-04; the project record → Later. | |
| D-47 | Contract Flow · signing picker (B-73, B-74) | | Contracts editor, send, `/sign` (E-70). | Later | Contracts. | |
| D-48 | QuoteApproval task lifecycle (B-75) | A task per submission, approver routing, rollback on failure. | Quote statuses + approval notifications, no task (E-53, E-85). | Later | Quotes. | |
| D-49 | Cancel tasks by lead (B-76) | | | Mismatch | Q-29. | |
| D-50 | Copilot consent · save brief to lead (B-78, B-79) | The brief writes property type · area · address · budget · style to the lead, raises a follow-up task two days out. | | Later | Tools; the write-back rule noted in §5. | |
| D-51 | Hangout lead (B-80) | | | Later | Hangouts. | |
| D-52 | Roles inside the drawer (B-81, B-82) | | | — | P rows. | |
| D-53 | Flags · workflow toggles · page gates · region · manager hierarchy (B-83…B-87) | | | — | G and P rows. | |
| D-54 | Tabs 2.0 has that 1.0 folds into the drawer (E-60…E-68) | 1.0: Files section, Activity section, a Notes field, questionnaire widget; no Tasks tab, no Notes & Logs tab. | Tasks · Files · Notes & Logs · Questionnaire · Activity tabs, each a full workspace. | 2.0 only | | |

### 3.6 Stage engine and follow-ups

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| S-01 | Default funnel + flags (C-01) | The triple with per-status flags followUpRequired · requiresApprovedQuote · requiresContract · requiresProjectType and per-bucket requiresAssignment. | Seven stages; the Move stage window's mandatory fields per stage (E-32…E-41). | Mismatch | Q-01. | |
| S-02 | Legacy derivation (C-02) | | | Built | Port map only (§4). | |
| S-03 | Validation gate (C-03) | Assignment before Ongoing / Signed; budget bounds; an approved quote for Quote Created / Signed (Signed needs client-signed unless a contract is uploaded); project type and contract for Signed; a follow-up date for Follow-Up · Contacted · On Hold. | Owner before leaving New; Quote Sent = a system quote Approved+ or an upload with amount; Won = signed quote + contract + 100 % split + type; On Hold = reason + duration; Contacted = channel · time · outcome · screenshot (E-36…E-40, E-45). | Built | 2.0 is stricter on Contacted (screenshot) and looser on the follow-up date (optional, REG-319) — Q-03 covers. Budget → Q-14. | |
| S-04 | Designer forward-only, no Unassigned (C-04) | Client-side only. | Nothing moves backwards for anyone; the last member stays (E-32, E-45). | Built | Q-09. | |
| S-05 | Assignment writes + downgrade (C-05) | | | Mismatch | DEF-08 · Q-09. | |
| S-06 | Intake position (C-06) | Assigned when a member is set, else Unassigned. | New, with or without members (E-21). | Built | | |
| S-07 | Server stage write guards (C-07) | A column whitelist; `NO_QUOTE_ROW`; `signed_at` on Signed; notifications; **no ordering guard on the server**. | One dispatch; `moveStage` in a transaction; visibility re-checked (E-32, E-34, E-47). | Built | For the devs: 2.0 enforces order in `stage-policy.ts`; 1.0 never did. | |
| S-08 | Journey spine · derivation · mark done · floor · tracker · step card · mini-rail (C-08…C-14) | | | Excluded | | |
| S-09 | Outreach attempts (C-15, C-17) | Channels · outcomes · when (never future) · notes · evidence; deleting an attempt deletes its evidence; first attempt = "First outreach". | Contact logs in the stage window and the Notes tab (E-36, E-66). | Mismatch | Q-17. | |
| S-10 | Outreach auto tab — AI screenshot parse (C-16) | Detects channel · time · summary · suggested tasks; "AI found something" card with Apply / Dismiss / Add task. | Auto Fill fills fixed values; Suggested tasks after Save (E-36, E-94). | Platform | Built as a stand-in. | |
| S-11 | Evidence artifacts (C-18) | | | Excluded | | |
| S-12 | Engagement state + suggestion engine (C-19) | active · awaiting client · stalled (14 idle days) · on hold; the pill was removed. | | Dead | Only hold survives. | |
| S-13 | Move to Hold · Resume (C-20, C-21) | Restart date + note; tier by months; the pre-hold position stashed; the 09:00 ping; Resume restores. | On Hold dialog; `resumeStage`; "Resume at X?" (E-40, E-42). | Mismatch | Q-05 · Q-06. | |
| S-14 | Close lead (C-22) | See DEF-06. | Lost dialog (E-41). | Mismatch | Q-07 · Q-29. | |
| S-15 | Follow-up automation (C-23) | | | Mismatch | Q-03 · Q-29 · Q-32. | |
| S-16 | Reminder 30 minutes before (C-24) | Scheduled per follow-up, in-app · email · WhatsApp, re-scheduled on change. | Derived "untouched" and "overdue" only (E-85). | Missing | Q-23. | |
| S-17 | TAT stamps + report (C-25) | | | Missing | R-01 · R-02. | |
| S-18 | Client signature advances the lead (C-26) | E-sign completion mirrors client-signed onto the lead and moves it to Signed, stamps `signed_at`, notifies. | A signed contract or a confirmed quote changes nothing on the lead; Won always opens its step (E-32, E-70). | Mismatch | Q-37 — recommended: keep the Won step (it needs the split and creates the project) but light the Convert to Project button and notify "Client signed" (already in Q-23's set). | |
| S-19 | Project created → Signed / Project started (C-27) | | | Later | Projects. | |
| S-20 | mAIson agent stage writes (C-28) | | | Later | AI tools. | |
| S-21 | Dead stage routes (C-29) | | | Dead | | |
| S-22 | Activity strings (C-30) | | | Mismatch | Q-20. | |

### 3.7 Configuration and settings

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| G-01 | Lead Experience: Classic / Journey (C-34) | | Stage movement Linear / Flexible (E-77). | Excluded | 2.0's setting is its own. | |
| G-02 | Journey config editor (C-35) | Steps editor (excluded) and an **inactivation reasons editor**: rename, "Proof" switch, "Gate after n attempts", add, reset. | Lost and On Hold reasons are fixed lists (E-40, E-41). | Partial | Q-38 — proposal: Settings › Leads › *Reasons* (Lost · On Hold) editable like Lead sources; a "needs n logged contacts" gate per Lost reason. | |
| G-03 | Detect duplicate leads switch (C-36) | | | Partial | Q-18 (recommended: no switch). | |
| G-04 | Settings › Lead Preferences (C-37) | Per designer: Open to new leads; five categories with Must match / Nice to have / Don't care. | — | Missing | Q-27. | |
| G-05 | Team Members: per-member lead assignment + visibility copy (C-38) | "Open to new leads" per designer, preference weights, "Sees only assigned leads…" notes, remove warns with the lead count. | Company › Members: role, reports-to, leads held (E-82). | Partial | Q-27. | |
| G-06 | Studio Region (C-39) | | | Platform | SG only. | |
| G-07 | Email Lead Sources (C-40) | | Integrations stand-in (E-83). | Platform | I-10 · Q-36. | |
| G-08 | Lead Funnel editor (C-41) | Buckets and statuses editable with the flags; 409 when leads would strand. | "Manage Stages" coming soon (E-14). | Mismatch | Q-02 (recommended hold). | |
| G-09 | Lead Categories (C-42) | Saved, never used. | | Dead | | |
| G-10 | Pipeline Stages (C-43) | A legacy table the board no longer reads. | | Dead | | |
| G-11 | Custom Lead Fields (C-44) | Text · Number · Date · Dropdown · Multi-select · File Upload; required; order; "won't erase data already captured". | — | Missing | Q-25. | |
| G-12 | Lead Sources taxonomy (C-45) | | Settings › Leads › Lead sources (E-78). | Built | | |
| G-13 | Workflow rules + approvers (C-46) | Five lead toggles; approvers per approval; "AI Assignment Logic" prompt nobody reads. | Quote approval + backup approver (E-76). | Partial | Q-26; the prompt is Dead. | |
| G-14 | Lead Webhooks tab (C-47, C-48) | | | Platform | I-07 · Q-36. | |
| G-15 | Legal entities on leads (C-50) | | | Later | DEF-32. | |
| G-16 | Feature flags tab (C-58) | Journey · duplicate detection · manager hierarchy · quote / signing flags. | Roles built in; the rest belong to Quotes / Contracts. | Platform | Not a page in 2.0. | |
| G-17 | Region config · lead country · CaseTrust (C-59…C-61) | | | Platform / Later | CaseTrust → Contracts. | |
| G-18 | 2.0-only settings (E-77…E-80) | | Stage movement · Lead sources · Lead capture · Who sees leads. | 2.0 only | | |

### 3.8 Roles and permissions

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| P-01 | Tags and route access (C-51) | owner · admin · id · accounting · manager; Accounting never sees /leads. | Owner · Admin · Manager · Designer (E-46). | Partial | Q-39 (Accounting role — recommended with Finance, later). | |
| P-02 | Role permission model + custom roles + member overrides (C-52, C-53, C-56) | Per role: leads create · edit · delete · assign · view all, data scope all / team / assigned; custom roles; per-member overrides (no lead toggles). | Fixed reach per role; no editor (E-46, E-82). | Partial | Q-40 — recommended hold; the four roles were the owner's L6 call. | |
| P-03 | What is enforced (C-54) | Only archive is checked server-side; scope and assign are not. | Assign and visibility enforced on the server (E-46, E-47). | Built | 2.0 stricter. | |
| P-04 | Manager hierarchy (C-55) | `owning_manager_id` on the lead keeps the manager's visibility after a hand-off. | `manager_id` on the member; a Manager sees the team's leads (E-46). | Built | Different key; noted in §4. | |
| P-05 | The matrix (C-57) | See inventory C. | 2.0 matrix (as built + the proposals): **Owner / Admin** everything; **Manager** create · edit · move · assign within the team · sees the team under "assigned"; **Designer** create (assigned to themselves, C-07) · edit · move forward · no assign · sees own under "assigned". Delete, Settings, Insights: not gated today (one signed-in member). | Partial | Q-41 — recommended: Delete, Settings › Leads and Insights for Owners and Admins only (1.0's defaults). | |

### 3.9 Notifications

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| N-01 | Lead assigned (C-62) | New assignees + Owners and Admins; in-app · email · WhatsApp; the card body. | assigned → the added members (E-85). | Built | Owners / Admins as recipients → Q-43. | |
| N-02 | Lead status changed (C-62) | Owners, Admins and the lead's members on every position change. | — | Missing | Q-23. | |
| N-03 | Lead captured (C-62) | Owners and Admins when a webhook lead lands. | new_lead → Owners and Admins from the form, an import, a capture (E-85). | Built | | |
| N-04 | Follow-up reminder T−30 (C-62, C-24) | | — | Missing | Q-23. | |
| N-05 | Hold restart ping (C-62) | In-app at 09:00 on the restart date. | — | Missing | Q-06 · Q-23. | |
| N-06 | Questionnaire requested / answered (C-62) | To the homeowner; members when answered. | Ask Client snackbar, nothing recorded (E-54). | Partial | Q-21 · Q-22. | |
| N-07 | Task assigned · task due reminder (C-62) | Assignees; the reminder 30 minutes before. | task_due (overdue) only (E-85). | Partial | Q-23 — add "A task is assigned to you" and "due in 30 minutes". | |
| N-08 | Untouched lead (E-85) | 1.0 has no such rule. | Derived after the delay; the stop rule. | 2.0 only | | |
| N-09 | Dispatch rules (C-63) | Fire-and-forget; demo studios never send; per-category prefs; paused; digest; dedupe 120 s; the actor **is** notified. | The actor never hears their own act; channels recorded, nothing sent (E-85). | Built | For the devs (§5). | |
| N-10 | Scheduled + digest crons (C-64) | | | Platform | Q-42 (daily digest option — recommended hold). | |
| N-11 | Settings UI (C-65) | Category × channel, recipients per category, digest, templates with variables, customer emails. | Event × channel, delay, stop rule, messages with fields (E-86). | Built | Q-43 (recipients per event). Customer emails → Later. | |

### 3.10 Touchpoints elsewhere

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| T-01 | Dashboard (C-66…C-68) | | | Missing | R-05 — Dashboard mocks (L7). | |
| T-02 | Inbox (C-69) | No lead linkage. | Chat coming soon. | Built | Nothing to port. | |
| T-03 | Tasks (C-70) | Link to Lead picker; the Lead Follow-Up type; a Source column; cancel-by-lead. | Tasks in the rail: Lead column and picker, filters (E-87). | Built | Follow-up kind → Q-03. | |
| T-04 | Projects conversion (C-71) | | | Later | | |
| T-05 | Escalations (C-72) | No lead linkage. | | Built | Nothing to port. | |
| T-06 | Return / refund (C-73) | | | — | D-38…D-40. | |
| T-07 | Homeowner engagement page + auto-bind (C-74) | Every lead with a phone gets a homeowner profile and a link; the page shows shared quotes and signing. | Invite to Portal dialog (E-74). | Later | Portal; the record → Q-22. | |
| T-08 | Scope questionnaire builder (C-75) | | | Partial | Q-21. | |
| T-09 | Admin studio detail (C-76) | Lead counts, refunds, page visibility, country retag (no UI). | | Platform | Not ported. | |
| T-10 | Qanvast Ops › Leads (C-77) | Owner-only; return-status filters; CSV export; lead detail with return eligibility (deadlines, appeal window, a two-return cap computed by Qanvast); return filing. | Qanvast Ops › Leads table with return tags; Request Leads · Filters coming soon; no export (E-75). | Partial | Proposals: Export on Qanvast Ops (the house dialog); Q-44 the return window and cap shown in the wizard and the table. | |
| T-11 | Hangouts · copilot · entity (B-79, B-80, B-64) | | | Later | | |

## 4. Data model — the port plan

Inventory D holds the effective 1.0 schema (the union of `supabase/migrations/` and `scripts/migrations/`, cross-checked against `src/types/database.ts`), 2.0's schema, and the column-level diff. This section is the plan the devs and the 2.0 rounds follow. Rule from the owner: **new tables keep 1.0's names and columns; existing 2.0 tables keep their names and take 1.0's columns under 1.0's names.**

### 4.1 Conventions (D §0.2)

| | 1.0 | 2.0 | Port |
|---|---|---|---|
| Ids | uuid | text (`randomUUID()`; member slugs) | new rows take uuid-format text ids |
| Timestamps | timestamptz | unix seconds | convert; the baseline shifts them to "today" |
| Money | dollars (`leads.budget`), cents on quotes | cents (`*_minor`) | × 100 |
| Phone | free text / E.164 | 8 bare digits, SG | strip `+65`; refuse others |
| Tenant | `studio_id` everywhere | none | dropped |

### 4.2 Table map (D §3.1)

| 1.0 | 2.0 | Verdict |
|---|---|---|
| `leads` | `leads` | present; columns below |
| `lead_assignees` | `lead_assignees` | present (`added_by` missing, split → Finance) |
| `lead_activity_log` | derived feed | **missing** → Q-20 (`lead_events`) |
| `lead_outreach_attempts` | `lead_notes` kind contact + the Contacted log | present, vocabulary differs (Q-17) |
| `lead_artifacts` | attachment link tables | Excluded (journey) |
| `lead_files` | `lead_files` (folders, trash, comments) | present, richer |
| `lead_custom_fields` + values | — | Q-25 |
| `lead_categories`, `pipeline_stages` | — | Dead, not ported |
| `studio_lead_funnel` | fixed stages + `settings.stage_movement` | Q-02 (hold) |
| `studio_taxonomies` lead_source | `settings.lead_sources` | present |
| `studio_taxonomies` project_type | the Won payload | Q-34 |
| `refund_requests` + `refund_reasons` | `lead_returns` + `return_attachments` | present; `sub_reasons` → D-39 |
| `lead_webhook_endpoints` + log | `settings.lead_capture` + one-row imports | Q-36 |
| `email_connections` + sync log | the intake address | Platform |
| `homeowner_profiles` + `homeowner_project_links` | — | Q-22 (`homeowner_profiles` + `homeowner_lead_links`) |
| `studio_scope_questions` + responses + history | `questions` per lead | Q-21 (`studio_scope_questions`; history not proposed) |
| `quote_signature_requests` | `contracts` + `contract_bundles` | Later (Contracts) |
| `notifications` + preferences + templates | `notifications` + `settings.notification_rules` / `message_templates` | present; events → Q-23 |
| `tasks.lead_id` | `lead_tasks.lead_id` | present |
| `projects.lead_id`, chat, renders, hangouts, copilot | — | Later |
| `studio_members.accepting_leads`, `lead_preferences` | — | Q-27 (on `members`) |
| `leads.owning_manager_id` | `members.manager_id` | present, different key |
| `stage_logs`, `imports`, `import_rows`, `lead_notes` notes, `questions`, `notifications.actor_id`, `lead_returns` reply side | — | 2.0 only (D §3.3) |

### 4.3 Columns to add to `leads` (D §3.4 B), by the decision that triggers them

| Add | Type | With |
|---|---|---|
| `temp`, `temp_reason` | text | Q-10 |
| `area` (district) | text | Q-12 |
| `additional_info` | text | Q-16 (if kept) |
| `ic_number`, `customer_id` | text | Q-35 |
| `next_follow_up_at` — **not** added; derived from tasks | — | Q-03 |
| `hold_restart_reminder_sent_at` or nothing (derive from the On Hold log) | — | Q-06 |
| `closed_reason_code` + `closed_reason_detail` — **not** added; the Lost log's payload grows `{ reason, competitor, restartAt }` | — | Q-07 |
| `first_assigned_at`, `first_outreach_at`, `first_outreach_by`, `signed_at` | ts / text | R-01, only if deriving proves slow; otherwise derive |
| `possibly_duplicate`, `duplicate_of_lead_id` | bool / text | only if Q-18 chooses "create and hold"; otherwise not needed |
| `external_lead_id`, `ad_metadata` | text / JSON | Q-36 (webhook stand-in idempotency) |
| `qanvast_lead_id` | integer | with T-10 (shown on Qanvast Ops) |
| `area_unit` | text | already handled: 2.0 converts sq m → sq ft on save |

### 4.4 New tables (D §3.4 A), by decision

| Table | Columns | With |
|---|---|---|
| `lead_events` | `id, lead_id, kind, actor_id, at, detail JSON` — only the events that leave no row (member removed · field edited · deleted task / note / file · return undone · invite sent · questionnaire asked) | Q-20 |
| `homeowner_profiles` + `homeowner_lead_links` | profiles `id, phone, name, email, created_at`; links `id, homeowner_id, lead_id, portal_token, chat_history_visible, invited_at, last_asked_at` | Q-22 |
| `studio_scope_questions` | `id, question, question_type (text · yes_no · number · single_select · multi_select · date), options JSON, is_required, is_enabled, sort_order, created_at` | Q-21 |
| `lead_custom_fields` + `lead_custom_field_values` | as 1.0 (field_type text · number · date · dropdown · multi_select; file dropped) | Q-25 |
| `lead_webhook_endpoints` + `lead_webhook_log` | as 1.0 minus `signing_secret` | Q-36 |
| `members.accepting_leads`, `members.lead_preferences` | bool · JSON `{ property_type · budget · design_style · area · scope: { values[], priority } }` | Q-27 |
| `settings.lead_reasons` | `{ lost: [{ code, label, gateAfterContacts? }], hold: [...] }` | Q-38 |

### 4.5 Not ported (D §3.4 C)

Tenant plumbing (`studio_id`, `studios.*`, `studio_roles`, plans); auth ids (`profiles`, `admin_users`, RLS, grant locks); multi-region (`country_code` + triggers, currencies, `company_id` on the lead); platform plumbing (OAuth tokens, `signing_secret`, `agent_idempotency_key`, delivery columns on `notifications`); 1.0's own legacy (`leads.status` enum, `assigned_to` mirror, `pipeline_stages`, `studios.lead_sources`, the quote mirror columns and triggers, `quotes.is_primary`); out of module (`projects.lead_id`, chat, renders, hangouts, copilot, `commission_split_bps`). Every item is listed in D so nothing is dropped silently.

### 4.6 State mapping for a 1.0 lead (D §3.4 D)

| 1.0 position | 2.0 |
|---|---|
| NEW / UNASSIGNED | New, no members |
| NEW / ASSIGNED · ONGOING / FOLLOW_UP (First contact pending) | New with members (`assigned_at` = `first_assigned_at`) |
| ONGOING / FOLLOW_UP (Awaiting reply · Site visit scheduled) · ONGOING / CONTACTED | Contacted + a New→Contacted log whose `logs[]` come from the outreach attempts (re-worded per Q-17) |
| ONGOING / MET | Met + Contacted and Met logs |
| ONGOING / QUOTE_CREATED | Quote Sent + the quotes as rows (draft → Draft · submitted → Sent for Approval · approved → Approved · sent_for_signature → Sent to Client · client_signed → Signed) |
| ON_HOLD tiers | On Hold `{ duration: 1 · 3 · 6 months or Until {date}, followUpAt, reason: the sub-status }`, `resumeStage` from `hold_prev_state` |
| CLOSED / SIGNED · PROJECT_CREATED | Won + the Won log (signed quote, contract name, project type, milestones from the payment schedule) + a Signed contract row |
| CLOSED / INACTIVE | Lost `{ reason }` from the sub-status or `closed_reason_code` |
| `archived_at` | `deleted_at`, `stage_before_delete`, `delete_reason` |
| `refund_requests` | `lead_returns` (pending → processing) + Lost + the "Respond to Qanvast team" task |
| legacy `status` only | new → New · assigned → New + member · contacted → Contacted · meeting → Met · proposal → Quote Sent · signed → Won · returned → Lost + return · archived → deleted |

Field map: `budget` × 100; phone → 8 digits; `property_type` codes → labels (`hdb_4_room` → HDB 4-Room, `bto_4_room` → BTO 4-Room, `condo` → Condo 3-bedder or Others, `landed*` → Landed — Terrace, `commercial*` → Commercial — Office); `area` + `property_address` → property address (or `area` → district with Q-12); `property_status` → condition (Existing → Renovated); `style_preference` → style; `key_collection_date` → key collection; `source` → the settings list (`walk_in` → Walk-in, unknown → Others).

### 4.7 Demo data (the owner's "same DB from a demo point of view")

1.0's demo studio on Staging (*Design Loft SG*): 165 leads — 145 New · 12 Assigned · 2 Contacted · 2 Meeting · 1 Proposal · 1 Signed · 1 Returned · 1 Archived; sources 108 Qanvast · 16 Organic · 10 Instagram · 9 Facebook · 9 Walk-in · 8 Website · 2 Referral · 2 Hangout; 12 members; journey mode on; no custom fields, categories or funnel changes. The repo's own seeds insert **zero** leads (D §1.5); the states come from `scripts/migrations/023` and hand-made test data.

2.0's baseline: 32 curated leads across every stage with their backing records (REG-343), 6 members, 8 deleted.

**Q-45**: keep 2.0's curated set and add only the states 1.0 shows that 2.0 lacks (an unassigned New lead, a lead returned and rejected, a lead with several members, a Hangout lead, a webhook / email arrival in review, a Lost lead per reason) — recommended; or mirror 1.0's volume (165 leads, 12 members). Either way: seed script + repair rule + `db:baseline`, never by hand.

## 5. Logic to carry over verbatim (for the devs, independent of UI)

The inventories quote each rule in full; this is the index. A rule marked *2.0 has* is already in `lib/` in 2.0's own form.

1. **Duplicate rule** (A-48, C-33): same studio and exact phone (raw or E.164) or case-insensitive exact email; archived rows included, an active match wins. Per surface: manual → confirm then create-and-hold; email → flag; webhook → drop; archived match → append the "[Auto] Matches an archived lead…" note. *2.0 has* the phone-else-email match for imports and captures (`app/leads/actions.ts` `importLeads`).
2. **Intake position** (C-06): first bucket; second status when a member is set. *2.0 has*: New with or without members.
3. **Phone rule, SG** (A-83): +65, 8 digits, first digit 6 · 7 · 8 · 9. *2.0 has* 6 · 8 · 9 (`isSgPhone`, REG-547) — the devs choose whether 7 stays accepted.
4. **Budget bounds** (B-16): 1,000 – 5,000,000, held with the two messages.
5. **Property-type normalisation** (A-64) and **synonym tables** for source, status, timeline and floor-area units (A-57) — the values are quoted in A.
6. **Turnaround (TAT)** (A-75, C-25): the three legs, medians, prior-window deltas, "awaiting" definitions, per-member attribution to whoever logged the first outreach, display `m / h / d`, grades ≤ 8 h · ≤ 24 h. Stamps are write-once and never cleared (A-76).
7. **Follow-up task** (C-23): one open Lead Follow-Up task per lead, title "Follow up with {name} — {status}", 09:00 default time, assignee = the lead's first member else the actor, other members fanned out; updated not duplicated; not created when moving to Closed. **Reminder** 30 minutes before, re-scheduled on change, dropped when the recipient has no phone (C-24).
8. **Hold tiers** (C-20): months to the restart date → < 1 · < 3 · < 6 · < 9 · else; the pre-hold position stashed and restored (C-21).
9. **Close reasons** (C-22): the seven codes, their fields, the "needs n attempts" gate, the restart-date nudge under 182 days, tasks cancelled on close.
10. **Return reasons** (B-56) and Qanvast's own catalogue *Unresponsive Lead · Not Qualified · Duplicate Lead · Other* with sub-reasons (D §1.2); one request per lead.
11. **Notifications** (C-62, C-63): event → recipients → channels → variables → bodies, the dedupe window (120 s), demo studios never send, the actor is not excluded (2.0 excludes the actor), a member denied the Leads page is skipped.
12. **Role defaults by tag** (C-53): leads create · edit = designer or admin; delete · assign · view all = admin; owner = everything.
13. **Assignment writes** (C-05): even split with the remainder on the first member; removing the last member downgrades (1.0) — 2.0 refuses; new members cascade onto the project team.
14. **Webhook receiver** (A-59…A-61): body ≤ 64 KB, 10 requests a minute per token, HMAC or Google key, test payloads acknowledged not saved, idempotent on `external_lead_id`, the field aliases (`full_name · customer_name · mobile · contact_number · message · comments · budget_cents ÷ 100`), the Google Ads column ids.
15. **Email poll** (A-64…A-66): every minute, 20 messages, skip seen ids, parse-failure leads named "Unknown (parse failed)", the sender-domain lists per region, sources stored as slugs.
16. **Merge** (A-51): fill the original's empty `email · phone · area · property_status · style_preference · notes · additional_info · project_type · budget · area_sqft · property_type · key_collection_date`; append "[Merged from duplicate lead] …"; hide the duplicate.
17. **Export columns** (A-54): the 23, in order.
18. **Archive cascade** (A-72): cancel open tasks and their reminders, cancel the lead's scheduled rows, block on a live signing link unless forced — for 2.0's Delete under Q-04.
19. **The pipeline set** (A-20): exclude held-for-review, rejected and archived. Search (A-21) and date predicates (A-28), the default 30-day window suspended while searching.
20. **Recommendation scoring** (B-35): preference 0–40 (must match ×3, nice to have ×1, 20 neutral), performance 0–35, specialty 0–25, the reason sentence; only members accepting leads.
21. **Document parse contract** (A-57): the output fields, "never invent", budget = lower bound, confidence rules, the merge into empty fields only.
22. **Copilot write-back** (B-79): brief → property type · area · address · budget · style; a follow-up task two days out at 10:00.
23. **Activity vocabulary** (B-54, C-30): the action strings the log renders.
24. **Client signature** (C-26): mirrors client-signed, moves the lead to Signed, stamps `signed_at`, notifies with no actor — 2.0 keeps the Won step (Q-37).
25. **Region config, SG** (A-83, C-59): the option lists, budget ranges, regions, email domains.

## 6. Questions before anything is built

Answer by number: **go** takes the recommendation, or write the alternative. Rows in §3 point here.

| # | Question | Recommendation | Rows |
|---|---|---|---|
| Q-01 | Keep 2.0's seven stages and drop 1.0's sub-statuses? | Yes. Outcomes already say "Callback requested / No response"; Won's sub-statuses are project stages. | DEF-01 · S-01 · L-05 · D-27 |
| Q-02 | A studio-editable funnel ("Manage Stages")? | Hold — the mocks fix the stages. | G-08 |
| Q-03 | Follow-ups stay tasks, plus: a *Next follow-up* line on the Overview and a listing column, a *Set follow-up* action, a *Follow-up* task kind, an *Overdue follow-ups* quick filter? | Yes. | DEF-02 · DEF-17 · L-09 · D-28 · S-15 · T-03 |
| Q-04 | Delete warns when a contract's signing link is live, and the lead's open tasks go with it (back on restore)? | Yes to both. | DEF-03 · I-17 |
| Q-05 | On Hold reasons = Client not ready · Budget review · Scope change · Property delay · Travelling · Others? | Yes. | DEF-05 · S-13 |
| Q-06 | The On Hold follow-up date raises a notification ("Hold ended — revisit {name}")? | Yes (part of Q-23). | DEF-05 · N-05 |
| Q-07 | Lost reasons = Went with another firm · Budget mismatch · Project postponed · Unresponsive · Not a fit · Cancelled by client · Property too far · Others, with *Competitor* and *Expected restart* details, and a soft "n contacts logged" hint on Unresponsive? | Yes; the hint, not a block. | DEF-06 · S-14 |
| Q-08 | Return Lead from any stage (2.0) or only after Lost (1.0)? | 2.0. | DEF-07 · D-38 |
| Q-09 | Past New the last member cannot be removed (2.0) rather than the lead dropping to Unassigned (1.0)? | 2.0. | DEF-08 · D-24 |
| Q-10 | A manual Hot · Warm · Cold on the lead, "n hot" in the head, a quick filter? | Yes, manual, no AI. | DEF-09 · L-35 · L-22 |
| Q-11 | Vocabulary: key collection takes 1.0's five; style adds Vintage · Transitional · No preference; condition stays New · Resale · Renovated (Existing maps to Renovated)? | Yes. | DEF-11 · C-05 |
| Q-12 | An *Area / District* select (North · North East · East · West · Central)? | Yes. | DEF-11 · C-04 |
| Q-13 | One *Lead name* field? | Yes. | DEF-12 |
| Q-14 | Budget outside 1,000 – 5,000,000 refused with a message? | Yes. | DEF-13 · C-04 |
| Q-15 | Required fields stay name + phone? | Yes. | DEF-14 |
| Q-16 | One free-text field (Remarks)? | Yes. | DEF-15 |
| Q-17 | Contact log: add *In person* as a channel and *Not interested* as an outcome? | Yes. | DEF-16 · S-09 |
| Q-18 | Create New Lead with a known phone / email → "A lead with this phone already exists: {name}" with Open existing · Create anyway (creates)? No studio switch? | Yes; no switch. | DEF-18 · C-13 · I-01 |
| Q-19 | Confirm: a Designer never assigns (your L6 call), although 1.0 lets designers assign when no hierarchy is set? | Keep L6. | DEF-19 · MM-07 |
| Q-20 | A small lead event log for the events that leave no row (member removed · field edited · deleted task / note / file · return undone · invite sent · questionnaire asked), shown in Activity? | Yes. | DEF-20 · D-37 · R-02 |
| Q-21 | Company › Questionnaire — the studio question bank (Text · Yes / No · Number · Single · Multi · Date; required; enabled; order)? | Yes. | DEF-22 · D-35 · T-08 |
| Q-22 | Store the portal invite and the questionnaire ask (a row, an Activity line, "Invited on" / "Asked on")? | Yes. | DEF-23 · D-18 · D-36 |
| Q-23 | Notification events to add: Lead stage changed · Follow-up in 30 minutes · On Hold date reached · Client answered the questionnaire · A task is assigned to you · Task due in 30 minutes? | Yes. | DEF-24 · N-02 … N-07 |
| Q-24 | Build *Insights* on the listing now (owner / admin; the three turnarounds, awaiting counts, by member) from 2.0's records, or wait for the Dashboard mocks? | Now. | DEF-25 · R-01 · R-03 |
| Q-25 | Custom lead fields (Settings › Leads + an Overview section)? | Hold unless a studio asks — the demo studio has none. | DEF-26 · G-11 · D-23 |
| Q-26 | The workflow toggles (contract / project type / assignment required, auto follow-ups)? | No — the Won step is the mock. | DEF-27 · G-13 |
| Q-27 | *Open to new leads* + five lead preferences per member on Company › Members, and a "Suggested: {member}" line in the Assign popover scored the 1.0 way? | Yes. | DEF-28 · G-04 · G-05 · D-25 |
| Q-28 | A scripted *Fill from a document* on Create New Lead (fixed values, like Auto Fill)? | Yes. | DEF-29 · C-15 |
| Q-29 | Lost cancels the lead's open tasks (1.0)? | No — the notification stop rule already silences them; keep the tasks. | MM-28 · D-14 · D-49 |
| Q-30 | The listing opens on the last 30 days by default (1.0)? | No — every lead, with the unseen band. | L-27 |
| Q-31 | Bulk assign as table selection + a bulk bar (Assign · Delete), Assign **adding** the chosen members to every selected lead? | Yes; add, not replace. | I-14 … I-16 |
| Q-32 | Changing a lead's members re-assigns its open tasks (1.0)? | No — tasks keep their own members. | MM-29 · D-14 |
| Q-33 | An Undo snackbar after Lost and On Hold in both policies? | Yes. | D-15 |
| Q-34 | Project type stays the Won step's three (Whole-home · Partial · Commercial fit-out)? | Yes; the devs map 1.0's six. | MM-32 · D-29 |
| Q-35 | IC / NRIC and Customer ID as lead fields that pre-fill each new quote? | Yes. | D-22 |
| Q-36 | Integrations stand-ins: a *Webhook* card (URL + key, counters, a log of simulated arrivals) and an *Email lead sources* card (a Gmail stand-in with the platform list)? | Yes to both. | I-07 · I-10 · G-07 · G-14 |
| Q-37 | When the client signs, move the lead to Won automatically (1.0)? | No — light Convert to Project and notify; Won keeps its step. | S-18 |
| Q-38 | Lost and On Hold reason lists editable under Settings › Leads (like Lead sources)? | Yes. | G-02 |
| Q-39 | An Accounting role now? | With Finance, later. | P-01 |
| Q-40 | Custom roles / a permissions editor? | Hold. | P-02 |
| Q-41 | Delete, Settings › Leads and Insights for Owners and Admins only? | Yes. | P-05 |
| Q-42 | A daily digest option in Settings › Notifications? | Hold. | N-10 |
| Q-43 | Recipients editable per event (e.g. Owners also hear every assignment)? | Hold. | N-01 · N-11 |
| Q-44 | Show Qanvast's return rules in the wizard and Qanvast Ops (a waiting period, a return window, a two-return cap)? | Yes as display rules; the numbers (7 days · 30 days · 2) come from 1.0's helper and need Qanvast's confirmation. | D-38 · T-10 |
| Q-45 | Demo data: keep 2.0's curated set and add the missing states, or mirror 1.0's demo studio (165 leads, 12 members)? | Curated + missing states. | §4.7 |

## 7. Proposed build rounds (after your answers)

Nothing existing is removed. Each round ends with tsc + eslint, a Playwright probe at 1440 / 768 / 390, banked screenshots, register rows, `db:repair` + `db:baseline` when data changes.

| Round | Builds | Questions it needs | Size |
|---|---|---|---|
| **1 · Words and rules** | The vocabulary lists (Q-11 · Q-12 · Q-17 · Q-34), Lost and On Hold reasons with their details (Q-05 · Q-07), temperature (Q-10), budget bounds (Q-14), IC / Customer ID (Q-35), Undo after Lost / On Hold (Q-33), Delete's warning (Q-04), editable reason lists (Q-38), role gating on Delete · Settings · Insights (Q-41) | Q-01 … Q-17, Q-33 … Q-35, Q-38, Q-41 | M |
| **2 · Follow-ups and notifications** | Next follow-up line + column + Set follow-up + Follow-up kind + Overdue quick filter (Q-03), the six events (Q-23), the hold reminder (Q-06) | Q-03 · Q-06 · Q-23 · Q-29 · Q-32 | M |
| **3 · Creation and intake** | Duplicate dialog (Q-18), Attach files (C-08), Fill from a document (Q-28), Designer self-assign (C-07), merge fills every empty field (I-04), the three email platforms as sources (DEF-10), the invite and the ask stored (Q-22), the seven return reasons (D-39), return rules (Q-44), Export on Qanvast Ops (T-10) | Q-18 · Q-22 · Q-28 · Q-44 | M |
| **4 · Listing power** | Selection + bulk bar Assign · Delete (Q-31), Quick filters (L-22), Export scope + full columns (L-32), "C" shortcut (L-16), "This month" (L-27) | Q-30 · Q-31 | M |
| **5 · Insights** | The Insights page on the listing: the three turnarounds, awaiting counts, by-member table; the Response time line on the Overview | Q-24 | M |
| **6 · Company** | Members: Open to new leads + preferences + the suggested member (Q-27); Company › Questionnaire (Q-21); Integrations: Webhook + Email lead sources cards (Q-36); Custom fields if go (Q-25) | Q-21 · Q-25 · Q-27 · Q-36 | L |
| **7 · Data and demo** | The lead event log (Q-20), the demo states 2.0 lacks (Q-45), the migration map kept current, the devs' hand-off | Q-20 · Q-45 | S–M, runs alongside |

Suggested order: 1 → 2 → 3 → 4 → 5 → 6, with 7 alongside each. After Leads: Quotes, X-Ray, Contracts — the same audit shape.

## 8. Coverage, and what was not verified

**Rows:** 33 definitions · 38 mismatches · 199 matrix rows (L 39 · C 16 · I 18 · R 5 · D 54 · S 22 · G 18 · P 5 · N 11 · T 11) · 45 questions. Every inventory row (A 89 · B 90 · C 79 · E 96, D's tables) is cited by at least one row above, or falls under Excluded / Later / Platform / Dead as stated.

**How the 1.0 side was read:** the code and docs whole, by five readers, each ending with an "uncertain" list (kept in the banked inventories). The live app on :3001 confirmed the listing, the new-lead page, Accounts, Settings, the notification settings, the dashboard, tasks and the API vocabulary (statuses, sources, journey config, roles, workflow, features). A scripted click-walk of the drawer, the filter panel, the Accounts sub-tabs and Qanvast Ops did not succeed (the page's overlays and menus refused automated clicks), so those behaviours rest on the code reading, not on screenshots.

**Open points carried from the readers (the full lists are in the inventories):**
- A: email-ingested sources render as lower-case slugs without a chip (inferred, not seen); `qanvast_lead_id` exists in migrations but no app code reads it; `leadJourneyMode` defaults on although the spec says off.
- B: required marks in the drawer's edit mode are visual only (autosave falls back to the persisted value); the artifact `kind` set is inferred; the return-policy PDF was not checked.
- C: whether the CaseTrust region flag is ever set; the archive blocker wording; the digest cron's historic channel bug reads as fixed.
- D: 1.0 has **two migration sets** (`supabase/migrations/` 102 files and `scripts/migrations/` 381 files) and no manifest of what each environment has applied; the effective schema is their union cross-checked against the TypeScript types; how the old `notifications` table was replaced is not recorded.

**Not covered here:** the Qanvast Ops module's own branch (`integ/security-qanvast` per the requirements CSV); the studio forks (Ace Design, El Arte, Flo Design) that may differ from this branch; 2.0's in-flight probes were not re-run by the readers.

## Appendix — the inventories

`leads-1.0-inventory/A-listing-intake.md` · `B-detail.md` · `C-engine-settings-touchpoints.md` · `D-data-model.md` · `E-2.0-today.md` — the readers' full output, cited by row id throughout.


## 9. The owner's answers (2026-09-24, from the "Leads parity — the 45 decisions" doc)

Every recommendation was taken except where noted. Blank = the recommendation stands (nothing to build).

| Q | Answer | Q | Answer | Q | Answer |
|---|---|---|---|---|---|
| Q-01 | keep 2.0 as is | Q-16 | keep 2.0 (Remarks only) | Q-31 | yes (selection + bulk bar; add, not replace) |
| Q-02 | hold | Q-17 | yes (In person · Not interested) | Q-32 | recommendation (no) |
| Q-03 | yes | Q-18 | yes (dialog; no switch) | Q-33 | yes |
| Q-04 | yes (warn on a live signing link; tasks go with the lead) | Q-19 | yes (Designer never assigns) | Q-34 | recommendation (the Won step's three) |
| Q-05 | yes (the six reasons) | Q-20 | yes | Q-35 | yes |
| Q-06 | yes | Q-21 | yes | Q-36 | yes (both cards) |
| Q-07 | yes | Q-22 | yes | Q-37 | blank → no automatic Won |
| Q-08 | recommendation (any stage) | Q-23 | yes (the six events) | Q-38 | yes |
| Q-09 | yes, as in 2.0 | Q-24 | build now, on 2.0's design principles and DS components | Q-39 | okay — with Finance; **keep a note for the Finance build** |
| Q-10 | **ignore** (no temperature) | Q-25 | **do it — studios have asked for it** (custom fields: go) | Q-40 | recommendation (hold) |
| Q-11 | yes | Q-26 | recommendation (no toggles) | Q-41 | yes |
| Q-12 | yes | Q-27 | yes | Q-42 | blank → hold |
| Q-13 | yes | Q-28 | yes | Q-43 | blank → hold |
| Q-14 | yes | Q-29 | recommendation (no) | Q-44 | yes |
| Q-15 | keep 2.0 (two required) | Q-30 | recommendation (no default window) | Q-45 | yes (curated + the missing states) |

Proposals without a question (§J of the doc): all **yes**, with two notes — **5** Quick filters without *Hot* (follows Q-10: Overdue follow-ups · Unassigned · Unseen); **6** Export "like a bank statement": a dialog with a few fields — all leads or the list shown, and more of what a studio wants when exporting leads (owner's wording; the fields are proposed in round 4).

Build order stays §7; round 1 starts 2026-09-24. Custom fields (Q-25) join round 6.

## 10. Build log

**Round 1 — Words and rules (built 2026-09-24, REG-607, probe `verify-parity-r1.cjs` 40/40).** Q-05 · Q-07 · Q-38 the Reasons setting and the two dialogs (Lost with Competitor · Expected restart · the contacts hint) · Q-11 the three lists · Q-12 District · Q-14 budget bounds · Q-17 In person · Not interested · Q-33 Undo after Lost / On Hold · Q-35 NRIC + Customer ID (copied onto new quotes) · Q-04 the delete warning · Q-41 Owners and Admins only for Delete and Settings › Leads · J-4 the three portal sources. Rows closed: DEF-05, DEF-06, DEF-11 (partly: condition unchanged by design), DEF-13, DEF-16, D-15, D-22, D-29 (kept 2.0's three), C-04, C-05, C-09, L-07 (District column), I-17 (the warning), G-02, P-05. Round 2 followed the same day.

**Round 2 — Follow-ups and notifications (built 2026-09-24, REG-608, probe `verify-parity-r2.cjs` 43/43).** Q-03 the Follow-up task kind (no `next_follow_up_at` — derived from the earliest dated open task), the Overview's Next follow-up line + Set a follow-up, the listing column, the Quick filters pane (Overdue follow-ups · Unassigned · Unseen — L-22 done here rather than in round 4) · Q-06 the hold reminder · Q-23 stage changed (incl. Return Lead; Undo removes the rows) · task assigned · due in 30 minutes · hold reached · questionnaire answered (rules and messages only until the portal's answer exists). Q-29 · Q-32 were "no" — nothing built. Rows closed: DEF-17, DEF-24, MM-02 (the ping), MM-17, MM-26, L-07 (the column), L-09 (the Overview line; the task box's badge stays the listing's), L-21, L-22, D-28, S-15, S-16, N-02, N-04, N-05, N-07, T-03. Open from the set: `question_answered` has no emitter (D-36 records the ask in round 3; the client's answer is a portal feature). Round 3 followed the same day.

**Round 3 — Creation and intake (built 2026-09-24, REG-609, probe `verify-parity-r3.cjs` 50/50).** Q-18 the duplicate dialog (Open existing lead · Create anyway; creates, not held; no switch) · C-08 Attach files at creation · Q-28 Fill from a document (the scripted stand-in) · C-07 the Designer's self-assign · I-04 the merge fills every empty field (radios where both sides have a value) · D-39 the seven return reasons and their fields · Q-44 Qanvast's return rules on the wizard and Qanvast Ops (7 · 30 · 2, display only, pending Qanvast's confirmation) · T-10 Export on Qanvast Ops + the Qanvast ID column · Q-22 the invite and the ask recorded (`homeowner_profiles` + `homeowner_lead_links`; "Invited on" / "Client asked on"; Activity lines). DEF-10's three sources were round 1's. Rows closed: DEF-18, DEF-23, DEF-29 (stand-in), MM-05, MM-08 (creates, not held), MM-09 (unchanged: the stand-in still queues), C-07, C-08, C-13, C-15 (stand-in), I-01 (no switch), I-04, D-18, D-36, D-38 (the rules line; Q-08 keeps 2.0's any-stage return), D-39, T-10. Not built, by design: 1.0's note for an archived match (no archive in 2.0), the return policy PDF and the eight tips (2.0 keeps its mock's four), the two-return cap as a block (display only), the 5-minute ask throttle. Round 4 followed the same day.

**Round 4 — Listing power (built 2026-09-24, REG-610, probe `verify-parity-r4.cjs` 25/25).** Q-31 selection on the table + the bulk bar (Assign adds the ticked members to every selected lead; Delete with Undo) · L-32 / J-6 the export statement (all leads or what the list shows · the created period · everything or the listing's columns · the format; the full 25-column set) · L-16 "C" opens Create New Lead · L-27 "This month" · Q-30 no default window (kept). L-22 was round 2's. Rows closed: L-16, L-27, L-32, MM-10, MM-11 (kept 2.0's), I-14, I-16 (2.0 notifies the added members). Not built, by design: 1.0's "Unassign" in the bulk dialog (a removal past New would strip a lead's last owner — the Assign popover's own rule), the filter-driven "Assign n" (the selection is explicit), Quote status · Temperature · Sub-status · Project type columns (no lead-side value). Round 5 followed the same day.

**Round 5 — Insights (built 2026-09-24, REG-611, probe `verify-parity-r5.cjs` 23/23).** Q-24 Leads › Insights on 2.0's pieces: the range chips, the three turnaround tiles (median · avg · count · change vs the prior window), the awaiting chips, the By team member table; R-02 derived from `assigned_at`, the earliest contact log and the Won log (no stamps); R-03 the Overview's Response time line; Q-41 Owners and Admins only (the gate for the rest). Rows closed: DEF-25 (Insights + the line; the dashboard widgets R-05 still wait for the L7 mocks), R-01, R-02 (derived), R-03. Not built, by design: 1.0's role labels (2.0's roles print), the live 60-second clock on the line (the page's own clock, refreshed on navigation). Round 6 followed the same day.

**Round 6 — Company (built 2026-09-24, REG-612, probe `verify-parity-r6.cjs` 35/35).** Q-27 Open to new leads + four preference dimensions + the suggested member scored 1.0's way (no AI; Scope left out — no lead-side value before Won) · Q-21 Company › Questionnaire, the bank every new lead starts with (older leads add it from their tab) · Q-25 custom lead fields on Settings › Leads, the form and the Overview · Q-36 the Webhooks and Email lead sources cards as stand-ins on the same intake. Rows closed: DEF-22 (history not proposed), DEF-26 (custom fields; categories and pipeline stages stay dead), DEF-28, MM-25, C-07 (the accepting dot → the pool), C-14 / B-35 (the recommendation), D-23, D-35, I-07, I-10, G-04, G-05, G-07, G-14, T-08. Not built, by design: 1.0's per-question answer history, the 5-minute ask throttle, real OAuth / HMAC (the platform's), commission splits. Round 7 followed the same day.

**Round 7 — Data and demo (built 2026-09-24, REG-613, probe `verify-parity-r7.cjs` 12/12).** Q-20 the lead event log for what leaves no row (member removed · field edited · task / note / file deleted · return undone · invite · ask), unioned into Activity · Q-45 the missing demo states (a Hangout lead, Lost for Budget mismatch and Project postponed with their trails, a webhook arrival in Review with its endpoint), repair R45 · the devs' migration map (`02-leads-migration-map-2026-09-24.md`). Rows closed: DEF-20, D-37, R-02 (the note: an event survives a deleted contact log's number), the §4.7 states. **The Leads parity programme is complete**: seven rounds, REG-607…613. Next: the Quotes audit on the same shape, then X-Ray and Contracts.

**Consistency pass (2026-09-24, REG-614).** The owner's review of rounds 1–7 found the rounds' UI drifting from the house — checkboxes revealed on hover, a head-only column drag, grey boxes on the LEAD STAGES card, four chip styles, bordered tiles, ad-hoc switch rows. Fixed on the pieces the mocks already established: the listing's selection column at rest, the whole column travelling on every table (the Items grid's rule), the card's three lines as stage rows under a rule, one `Chips` and one `StatTile` in `components/om`, the question bank and custom fields on the Notifications event table, Members' preferences line as one line, the Return wizard's Rules as the DS Link. All seven probes re-run on fresh test copies; screenshots `design-source/verify/audit-2026-09-24/`.
