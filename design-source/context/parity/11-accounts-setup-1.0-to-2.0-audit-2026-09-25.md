# Accounts Setup → Settings — 1.0 → 2.0 parity audit (2026-09-25)

**Written for:** the owner, to mark row by row; and the 1.0 developers, as the migration map for a studio's settings.

**The brief** (owner, 2026-09-24, night — the parity programme's sixth module, after Leads, quote templates, the quote editor, contracts and Quote X-Ray): "after everything is done, i want you to do the same deep audit benchmark for the Accounts Setup in 1.0 and build the respective modules like studio, lead management, and quotes & pricing modules in 2.0 settings page … You take a call and go with your recommendations." Every new call in §6 is therefore set *As recommended* (§9) and built in the rounds of §7. **Calls already made** in the earlier audits stand and are listed in §6.2 — among them the editable funnel (held), custom roles and a permissions editor (held), the workflow toggles (no), approval thresholds (no) and Quote Sharing (nothing to port).

## 0.1 Sources

- **1.0** = `qanvast-id-tool` at `67f42e469`. Five readers read the code, the migrations and the docs whole; their inventories are banked beside this file under `accounts-setup-1.0-inventory/` and are the references cited in the rows: **A** the Studio group — Team Members, Legal Entities, Roles & Permissions, Studio Health, the studio items on Settings (A-01…A-67) · **B** the Lead Management group — Lead Experience, Lead Funnel, Lead Categories, Lead Sources, Custom Fields, Lead Webhooks and the lead settings kept elsewhere (B-01…B-44) · **C** the Quotes & Pricing group — Quote Categories, Document Templates, Signing Documents, Packages, Quote Rules, Price Book, Quote Approval Rules, Quote Sharing and the quote settings kept elsewhere (C-01…C-52) · **D** the data model, the routes' checks and the port plan · **E** what 2.0 has today across Settings and Company (E-1…E-109).
- **2.0** = `openmaison-prototype` on `main` (8733d6d) plus the uncommitted rounds REG-616…642 (quote templates, the quote editor, contracts, Quote X-Ray).

## 0.2 Scope rules

- **In scope:** the three 1.0 groups the owner named — **Studio**, **Lead Management**, **Quotes & Pricing** — and where each item lives in 2.0 (Settings for rules, Company for records), plus who may change a setting and how a setting saves.
- **Done already (cited, not re-audited):** the lead settings the Leads audit answered (G-01…G-18: sources, reasons, custom fields, capture, webhooks, Who sees leads), the template and quote settings the quote templates and quote editor audits answered, the contract templates and signing gates the contracts audit built.
- **Later modules (their own audits):** the price book's own behaviour (next module — its gate, categories, tiers, approval, history), Finance (invoice, PO and VO templates, document numbering, payment methods, an Accounting role), Projects (project types, timelines), the homeowner portal, Branding & Comms beyond the brand kit.
- **Not for a prototype:** sign-in and sessions, product telemetry (Studio Health), email and SMS delivery — listed as *Platform* with the stand-in 2.0 keeps.

## 0.3 Status legend

| Status | Meaning |
|---|---|
| **Built** | 2.0 has it, in its own shape. |
| **Partial** | 2.0 has part of it; the gap is named. |
| **Missing** | 1.0 has it, 2.0 has nothing; a proposal follows. |
| **Mismatch** | both have it and they disagree; a question decides (all collected in §2). |
| **Settled** | an earlier audit's call covers it (§6.2). |
| **Later** | another module's internals. |
| **Platform** | live infrastructure; 2.0 keeps a stand-in or nothing. |
| **Dead** | 1.0 saves or shows it and nothing reads it; not ported. |
| **Excluded** | the owner's standing rule (Journey mode, Archive). |
| **2.0 only** | no 1.0 counterpart; kept and listed so the devs know it is new. |

## 0.4 How to mark

Answer in the decisions doc — a call per question — or write **go** · **hold** · **no** in the *Mark* column here. Rows marked go are built in the rounds of §7, each logged in `REGISTER.md` as `user-directed` with "1.0 · <inventory row>" as the source, verified on :3011 and banked under `design-source/verify/settings-parity/`.

Reading order: **§1 Definitions** first — 1.0 keeps a studio's rules and records on **one Accounts page** (nine groups, ~45 items) where 2.0 splits them into **Settings** (rules) and **Company** (records); and **most of 1.0's settings are write-only** (saved, never read) or **ungated** (any member may change them) — every later row leans on those two facts.

## 1. Definitions — the same thing under two names

| # | Concept | 1.0 | 2.0 | Verdict · question |
|---|---|---|---|---|
| DEF-01 | **Where a studio's settings live** | One Accounts page — nine groups (Studio · Lead Management · Quotes & Pricing · Workflow · Projects · Finance · Branding & Comms · HomeOwner Portal · AI & Copilot), ~45 items, `?tab=` deep links, reached from the owner's profile menu (A-01…A-05); a personal Settings page beside it (A-61…A-66). | **Settings** holds rules — Leads · Quotes · Notifications live, Stages · Projects · Finance coming soon (E-1, E-2); **Company** holds records — Profile · Members · Integrations · Questionnaire · Templates · Price book (E-31…E-54). | **Mismatch.** **Q-01** Settings takes 1.0's three groups as its modules and links to Company for the records · **Q-02** on Company's frame. |
| DEF-02 | **A role** | Tags on the member (owner · admin · id · accounting · manager) and a `studio_roles` row per tag with a page map, a data scope and ~50 action switches — page access unenforced, data scope unread, most switches unread, custom roles unholdable (A-43…A-56). | Four fixed roles — Owner · Admin · Manager · Designer — whose reach is code, with no screen that states it (E-55…E-62). | **Mismatch.** **Q-03** a truthful read-only table; the editor stays held (leads Q-40). |
| DEF-03 | **A member** | `profiles` (name, email, phone — the sign-in) + `studio_members` (tags, title, active, accepting leads, preferences, overrides) (A-09). | `members` (role, manager, accepting leads, preferences, specialty, signature) (E-37, E-38). | **Partial.** **Q-06** add, deactivate, reactivate. |
| DEF-04 | **A legal entity** | `studio_companies` rows — id, default, active, bank, PayNow QR, tax rate, numbering; documents store the entity's **id** (A-34…A-41). | Issuing entities in the brand record — up to six, the first is the studio, bank · PayNow · letterhead; quotes and contracts store the entity's **name** (E-34, E-35, E-89). | **Mismatch.** **Q-10** by id, retire when in use. |
| DEF-05 | **A trade (quote category)** | `studio_quote_categories` rows — order (drives section order), a printed description, sub-categories (never read by a renderer) (C-06…C-09). | `settings.trades` (a list, add / remove) + a note per trade (REG-617) (E-17, E-74). | **Partial.** **Q-09** rename and reorder · **Q-18** no sub-categories. |
| DEF-06 | **Lead stages** | An editable funnel — buckets, statuses, flags — that the app reads by position and by fixed ids (B-12…B-20). | Seven fixed stages (E-27, E-69). | **Settled** (hold, leads Q-02). |
| DEF-07 | **Quote approval** | Two screens: Workflow's toggle + approver list (works) and Quote Approval Rules (thresholds, a role, reasons — read by nothing) (C-35…C-37). | Settings › Quotes › Quote approval + a backup approver (E-14, E-20, E-80). | **Settled** (no thresholds, quote editor Q-24). |
| DEF-08 | **What a new quote starts with** | Spread over the default Quote PDF, the default T&C, payment schedules, branding switches and the lead's country (C-12…C-18, C-44…C-47). | The default quote template's *New quotes* settings (E-30). | **Built** — 2.0 keeps one place. |
| DEF-09 | **How a setting saves** | Four models — instant, draft + Save, whole-list replace (deactivate every row, re-insert one by one, no transaction), dialogs — and no unsaved-changes guard (A-06, B-03, C-03, C-07, B-22). | Three models — write on change, a page draft on Profile and the brand kit, dialogs; removals with no confirm or Undo (E-4, E-99). | **Partial.** **Q-09** Undo on every remove. |
| DEF-10 | **Who may change a setting** | Almost nobody is refused: the routes check only for a session; "owner-only" lives in comments and in the browser (A-33, A-41, A-57, B-02, C-02). | Leads and Quotes are Owners' and Admins' (on the server too); Notifications, Integrations, Profile, the brand kit and a template's default / rename / delete are open to every member (E-3, E-84…E-87). | **Partial.** **Q-07** Owners and Admins change the studio · **Q-08** one read-only look. |

## 2. Mismatches — both have it, they disagree

| # | Topic | 1.0 | 2.0 | Question |
|---|---|---|---|---|
| MM-01 | The shape | one page, nine groups | Settings (three live modules) + Company (six pages) | Q-01 · Q-02 |
| MM-02 | Roles | an editable matrix that mostly does nothing | four fixed roles, no statement of their reach | Q-03 |
| MM-03 | Adding a member | a request to OpenMaison staff (A-12, A-13) | none (E-105) | Q-06 |
| MM-04 | Removing a member | deactivate; records kept; sessions stay open (A-27, A-28) | none (E-105) | Q-06 |
| MM-05 | An entity's identity | by id; editing the default un-defaults it (A-36) | by name; a rename moves every quote to the studio's bank (E-89) | Q-10 |
| MM-06 | Renaming a list item | a new row; records keep the old text (B-23, C-07) | no rename (E-100) | Q-09 |
| MM-07 | Who may change | almost anyone, by API | Owners and Admins on Leads and Quotes only | Q-07 |
| MM-08 | The studio's GST | from the lead's country and the entity (C-44) | the entity switch only; the studio's own has no screen (E-88) | Q-05 |
| MM-09 | Lead capture | four ways in, one list per way (B-28…B-38) | the Settings card knows two of them (E-101) | Q-12 |

## 3. Feature matrix

Columns: the 1.0 feature (inventory row) · what 1.0 does · what 2.0 has (inventory row) · status · proposal or question · mark.

### 3.1 The page and its ways in

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| SP-01 | Reaching the settings (A-01, A-02) | The owner's profile menu; no rail item; the route admits owner · admin · id · accounting. | The rail's Settings item; Company from the rail's panel (E-1, E-31). | Built | | |
| SP-02 | The shell (A-03, A-04) | A left card of nine groups with a search; `?tab=`; an unknown tab renders nothing. | A 240 rail of six modules, three live; `?section=` read once; `from` dropped (E-2, E-95). | Partial | **Q-01** · **Q-02**. | |
| SP-03 | What each visit loads (A-05) | Every lead, on every tab. | Twenty-two reads, once (E-1). | Built | | |
| SP-04 | Saving (A-06, B-03, C-03) | Four models; no unsaved-changes guard. | Three models; an unsaved number pattern is lost silently (E-99). | Partial | **Q-08** · **Q-09**. | |
| SP-05 | On a phone (A-04) | No Accounts item on the phone nav. | Company unreachable (More › Company is "coming soon"); the module row hides Notifications; the switch tables lose their labels (E-96, E-97). | Partial | **Q-02** · **Q-11**. | |

### 3.2 Studio

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| ST-01 | Team Members — the list (A-08…A-11) | Active members with badges, contact, title or role chips. | Company › Members: the six members, role, manager, accepting leads, preferences (E-37, E-38, E-64). | Built | Q-04 (the Studio card). | |
| ST-02 | Invite Member (A-12…A-17) | A **request** emailed to OpenMaison staff; legacy invites to resend or cancel. | None (E-39, E-105). | Missing | **Q-06**. | |
| ST-03 | Title and tags (A-19, A-20) | A free title; several tags per member. | One role per member; the role is the title (E-105). | Built | 2.0's own. | |
| ST-04 | Page access and data visibility notes (A-21, A-22) | Display only — and wrong for accounting and admins. | *Who sees leads* (E-13). | Built | Q-03 states the reach. | |
| ST-05 | Open to new leads · preferences (A-23, A-24) | Five weighted dimensions, a local score. | The same (REG-612) (E-38). | Built | | |
| ST-06 | Member overrides (A-25, A-26) | Eight permission and seven workflow switches; one works, in the browser. | — | Dead | | |
| ST-07 | Remove Member (A-27, A-28) | Deactivates; counts assigned leads and projects (closed ones too); signed-in sessions stay open. | None (E-105). | Missing | **Q-06**. | |
| ST-08 | Signatures (A-29) | Each member's own, self-service. | Signature Settings in the quote editor (E-63). | Built | | |
| ST-09 | Managers (A-30) | A `manager` tag + a Dyel-only hierarchy flag. | `members.manager_id` (REG-601) (E-37). | Built | | |
| ST-10 | Seats (A-31) | Nothing counts them. | Nothing. | Built | | |
| ST-11 | Legal Entities — list and edit (A-34…A-36) | Fields, a tax rate; editing the default un-defaults it. | Company › Profile's issuing entities: bank, SWIFT, PayNow, letterhead, GST switch (E-34, E-35, E-65). | Partial | **Q-10**. | |
| ST-12 | Default and deactivate (A-37, A-38) | One default; deactivate, no reactivate, no delete. | The first entity is the studio; others removed with no guard (E-89). | Partial | **Q-10**. | |
| ST-13 | Where entities are used (A-40) | Create-dialog pickers, a finance filter. | The quote's Issuing Entity, the contract's Issued by (E-65). | Built | | |
| ST-14 | Roles & Permissions (A-42…A-56) | The matrix editor; custom roles; seeds that disagree. | None (E-62, E-66). | Settled | Editor held (leads Q-40); **Q-03** a read-only table. | |
| ST-15 | Studio Health (A-57…A-60) | Owner-only (in the browser) usage tiles from telemetry. | None; Leads › Insights for response times (E-67). | Platform | **Q-16**. | |
| ST-16 | Studio items on the personal Settings page (A-61…A-66) | Profile, region (read-only), studio-wide Ads and ID Buddy switches that do nothing. | Members' own settings (E-63). | Partial | Region is the platform's; the two switches are dead. | |

### 3.3 Lead management

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| LM-01 | Lead Experience (B-04, B-05) | Classic / Journey. | Stage movement Linear / Flexible (E-8, E-68). | Excluded | | |
| LM-02 | Detect duplicate leads (B-06) | A switch, partly obeyed. | Always checked, a dialog (REG-609; leads Q-18). | Settled | | |
| LM-03 | Journey steps (B-07, B-08) | Steps editor. | — | Excluded | | |
| LM-04 | Inactivation reasons (B-09, B-10) | Rename, proof, gate after n attempts; codes collide after a delete. | Settings › Leads › Reasons: add, retire, restore, remove, a Lost gate set only on add (E-11, E-100). | Partial | **Q-09**. | |
| LM-05 | Lead Funnel (B-12…B-20) | Editable buckets and statuses; behaviour by position and fixed ids. | Seven fixed stages (E-27, E-69). | Settled | Hold (leads Q-02); *Stages* folds into Lead management (**Q-01**). | |
| LM-06 | Lead Categories (B-21) | Saved, never read. | — | Dead | **Q-17**. | |
| LM-07 | Lead Sources (B-22…B-24) | Reorder, rename (a new row — leads keep the old text), save = deactivate all + re-insert. | Retire / restore, counts; no rename or reorder (E-9, E-71). | Partial | **Q-09**. | |
| LM-08 | Custom Fields (B-25…B-27) | Every save erases every lead's answers; File Upload has no input. | Settings › Leads › Custom fields (REG-612); editing a lead erases an inactive field's value (E-10, E-91). | Partial | **Q-13**. | |
| LM-09 | Lead Webhooks (B-28…B-32) | URL + key, counters, a log, regenerate, revoke. | Company › Integrations › Webhooks, a stand-in (E-42, E-73). | Built | Receiving is the platform's. | |
| LM-10 | Workflow switches for leads (B-33) | Five gates, Classic only. | — | Settled | No (leads Q-26). | |
| LM-11 | AI Assignment Logic (B-34) | A prompt, never read. | — | Dead | **Q-17**. | |
| LM-12 | Pipeline Stages, legacy (B-35) | Never read. | — | Dead | **Q-17**. | |
| LM-13 | Project Types (B-36) | The lead's project-type picker. | Property types, fixed (E-27). | Later | Projects. | |
| LM-14 | Assignment (B-37) | Suggestion only. | The suggested member (REG-612). | Built | | |
| LM-15 | Email Lead Sources (B-38) | Gmail polling. | Integrations › Email lead sources, a stand-in (E-43). | Built | | |
| LM-16 | Lead notifications (B-39) | Per category, not per event. | Settings › Notifications per event (E-23…E-26). | Built | 2.0 fuller; **Q-14** the channels. | |
| LM-17 | Manager hierarchy flag (B-40) | Dyel-only, API only. | Managers for every studio (REG-601). | Built | | |
| LM-18 | Fixed lead rules (B-41) | Response-time grades, reminder timing. | The same, in code (Insights). | Built | | |
| LM-19 | Lead capture card (—) | — | The intake address, Meta, website arrivals — not webhooks or email; the address moves with the company name (E-12, E-90, E-101). | 2.0 only | **Q-12**. | |
| LM-20 | The question bank (—) | — | Company › Questionnaire (REG-612); *Required* saved, never read (E-46, E-47, E-92). | 2.0 only | **Q-13**. | |

### 3.4 Quotes & pricing

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| QP-01 | Quote Categories (C-06…C-09) | Order (drives sections), description, sub-categories; save deactivates all and re-inserts; a rename strands price-book items. | Trades + a note per trade; no rename or reorder (E-17, E-74). | Partial | **Q-09** · **Q-18**. | |
| QP-02 | Import Price Book from CSV on the tab (C-10) | Prices land 100× too high. | Company › Price book's import (REG-594). | Built | | |
| QP-03 | Document Templates (C-12…C-16) | Six kinds, per-entity copies with side effects. | Company › Templates: Quotes · T&Cs & Notes · Contracts · Tasks · Payments (E-48…E-52, E-75). | Partial | Invoice · PO · VO later (Finance). | |
| QP-04 | Default T&C and contract (C-17, C-18) | Reach a client only on *Regenerate link*; *New template* can't add a second. | The T&Cs library and the default contract template (REG-538, REG-632). | Built | | |
| QP-05 | Signing Documents (C-19…C-22) | A library of PDFs and texts with gates. | Contract templates with the gates (REG-633). | Settled | PDF library held (contracts Q-26). | |
| QP-06 | Packages (C-23…C-25) | Saved bundles; delete with no confirm. | My Sections (REG-594, REG-619) (E-54, E-77). | Built | | |
| QP-07 | Quote Rules (C-26…C-29) | Lines by project type; owner-only Starter Quote. | — | Settled | Hold (templates Q-07). | |
| QP-08 | Price Book tab (C-30…C-34) | Items, pending, drift, imports; a read-only member can re-file items by drag. | Company › Price book (E-53, E-79). | Later | The next module. | |
| QP-09 | Quote Approval Rules (C-35…C-37) | Thresholds, a role, reasons — read by nothing. | Quote approval + a backup approver; the backup's pick isn't checked on the server (E-14, E-20, E-80, E-108). | Settled | No thresholds (quote editor Q-24); the backup's check under **Q-07**. | |
| QP-10 | Quote Sharing (C-38…C-41) | Six settings saved, never shown, never read. | — | Settled | Nothing to port (templates Q-09). | |
| QP-11 | Quote numbering (C-42) | Fixed `QT-###`. | A pattern with a commercial sequence (REG-561, REG-593); the example is wrong (E-16, E-93). | Built | 2.0 fuller; **Q-15** the example. | |
| QP-12 | Validity (C-43) | One date per lead. | A default on the template (E-30). | Built | | |
| QP-13 | GST (C-44) | From the lead's country; the entity's registration; a rate override stored, unused. | The entity's switch; the studio's own registration and rate have no screen (E-88). | Partial | **Q-05**. | |
| QP-14 | Rounding (C-45) | Per quote. | A studio rule (REG-584). | Built | 2.0 fuller. | |
| QP-15 | Payment schedule defaults (C-46) | Several defaults at once; four built-ins. | The Payments library and the template's default (REG-538). | Built | | |
| QP-16 | Terms and notes defaults (C-47) | Five places that don't feed each other. | One: the template's T&Cs & Notes (E-30). | Built | | |
| QP-17 | Markup, discount limits, margin floor (C-48) | Per vendor; no caps. | None. | Settled | No (quote editor Q-24). | |
| QP-18 | Quote switches kept elsewhere (C-49) | Workflow, Feature Flags, Branding. | Settings › Quotes and the template (E-82). | Built | | |

### 3.5 Who may change the studio

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| RW-01 | The routes' checks (A-33, A-41, A-56, A-57, B-02, C-02) | Session only; owner-only roles; comments promise more. | Leads and Quotes: Owners and Admins, page and server (REG-624); Notifications, Integrations, Profile, the brand kit, a template's default / rename / delete open (E-57, E-61, E-84…E-87). | Partial | **Q-07**. | |
| RW-02 | Members' roles (A-32, A-33) | Any member may rewrite anyone's tags by API; only the Maison bot enforces "only an owner makes an owner". | Owners and Admins set any role, Owner included; an Admin can make themself Owner; demoting the only other Owner locks the demo (E-105). | Partial | **Q-06**. | |
| RW-03 | The read-only look (—) | — | Four treatments across the cards (E-98). | Partial | **Q-08**. | |
| RW-04 | The backup approver (—) | — | Any id accepted by the server (E-108). | Partial | **Q-07**. | |

### 3.6 Lists and records

| ID | 1.0 | 1.0 does | 2.0 today | Status | Proposal · question | Mark |
|---|---|---|---|---|---|---|
| RL-01 | Renaming (B-22, B-23, C-07) | A new row; the leads and price-book items keep the old text. | None (E-100). | Mismatch | **Q-09**. | |
| RL-02 | Reordering (B-22, C-06) | Drag; order drives section order. | Kept in the order added (E-100). | Missing | **Q-09**. | |
| RL-03 | Removing (B-22, C-06) | A browser confirm. | One press, no confirm, no Undo; a trade's note goes with it (E-99). | Partial | **Q-09**. | |
| RL-04 | An entity's identity (A-36…A-40) | The id. | The name (E-89). | Mismatch | **Q-10**. | |
| RL-05 | The intake address (—) | — | Recomputed from the company name (E-90). | 2.0 only | **Q-12**. | |

### 3.7 Touchpoints (other audits)

| ID | Touchpoint | Where it goes |
|---|---|---|
| AZ-01 | The price book's gate, its categories against the trades (E-102), tiers, item approval, history (C-30…C-34) | The price book audit (next module) |
| AZ-02 | Invoice, PO and VO templates; document numbering; payment methods; an Accounting role (C-15, C-16, C-42; leads Q-39) | Finance |
| AZ-03 | Project types, timeline templates (B-36) | Projects |
| AZ-04 | Branding & Comms beyond the brand kit, the homeowner portal, AI & Copilot groups | Later modules |
| AZ-05 | The UI sweep's backlog (U-01, U-03…U-09) | The UI consistency sweep (after the price book) |

## 4. Data model — the port plan

The column-level work is inventory **D** (`accounts-setup-1.0-inventory/D-data-model.md`): the stores (D-01…D-19), the JSON shapes (D-20…D-29), every route's check (D-30…D-37), 2.0's stores (D-40…D-47), the diff (D-60…D-162) and the port plan (D-170…D-236). The headline:

- **No new table is needed.** A studio's settings land in 2.0's `settings` keys (one JSON value per key, fifteen keys — D-40), `members` and the lead configuration tables. What 1.0 keeps and 2.0 would need a table for is either held (custom roles, overrides — leads Q-40), dead (lead categories, approval thresholds, Quote Sharing) or the platform's (invitations, member requests, telemetry) (D-170…D-174).
- **Columns the calls add** (§6): `members.active` + `phone` for Q-06 (D-175, D-176); an entity's **`id`** and **`retired`** for Q-10 (D-177, D-180); the studio's GST rate beside its registration for Q-05 (`settings.studio.gstPct`); the intake address's own slug, kept once set, for Q-12. Not added: a member's title (the role is the title), an entity's tax rate, country or currency (Singapore only, D-171, D-178), the webhook log's failures (D-182).
- **The landing order** (D-210…D-217): members first — one row per active `studio_members` row, plus every inactive one a ported record names, landing inactive; tags → role by priority (owner > admin > manager > id; an accounting-only member lands only when named, inactive, D-140); the preferences by D-143 — then the studio and its entities (the default entity first; it becomes the studio), the lead settings, the quote settings, notifications. Every `*_by` column maps `profiles.id → members.id` for the later ports.
- **Map by meaning, never by key** (D-160): 1.0's `settings.quote_approval` is the dead thresholds object; 2.0's is `'required' | 'not-required'`, read from 1.0's `workflow.quoteApprovalRequired`. `studios.lead_sources` is a dead column; 2.0's `lead_sources` is the live list.
- **Never copy a secret into a settings row** (D-183): a Google Ads endpoint lands with `key: null`, flagged "rotate to see a key"; the token is kept so the ad platforms already set up keep answering once a receiver exists.
- **Checks after a port** (D-220…D-227): one signed-in member who is an Owner; every role one of the four; every `manager_id` a Manager; at least one active Owner; ≤ 6 entities with unique names and every quote's entity found; every lead's source listed; every custom value on an existing field; every member with an e-mail.
- **What changes for a studio** (D-228): roles collapse to four and nobody's custom role or override survives; approval becomes Owners, Admins and one backup; Approval Rules and Quote Sharing disappear — they never acted; values lost to 1.0's custom-field save stay lost; the region is Singapore; the configurable funnel gives way to 2.0's stages.
- **Naming choices** D leaves to the owner, answered by this audit's calls: the studio's name comes from its default entity (D-213); `stage_movement` lands `'flexible'` (1.0's Classic moves a lead anywhere) and `lead_visibility` lands `'assigned'` (what a 1.0 designer saw) — both left to the porting studio's owner, the port log saying so (D-214); removed members land inactive (Q-06, D-175).

## 5. Logic to carry over verbatim (for the devs, independent of UI)

1. **A member is deactivated, never deleted** (A-27): their records stay theirs; the leads and quotes still assigned to them are counted and shown; they leave every picker. Reactivating restores them.
2. **The Owner rules the Maison bot enforces** (A-32) — the only correct ones in 1.0: only an Owner makes or unmakes an Owner; nobody raises their own role; the studio keeps at least one active Owner.
3. **One default entity, and it can't be switched off** (A-37, A-38): making another the default moves the flag; the default can't be retired.
4. **A rename carries its records** — the opposite of 1.0 (B-23, C-07): a renamed source, reason or trade renames it on the leads, logs, quote lines, price-book items and notes that carry it.
5. **List names are unique without regard to case** (B-22, C-06).
6. **Nothing that 1.0 saves and never reads is ported** (§3: Dead rows).

## 6. Questions before anything is built

### 6.1 New calls

The owner delegated every call on 2026-09-24 (§9). Each still carries its recommendation, so it can be overridden in the decisions doc.

| # | Question | Recommendation | Rows |
|---|---|---|---|
| Q-01 | Settings takes 1.0's three groups as its modules — **Studio · Lead management · Quotes & pricing** — with Notifications beside them (Projects and Finance stay coming soon; *Stages* folds into Lead management, its editor held). Each module holds the studio's rules and links to the Company page that holds its records (Members, Profile, Integrations, Questionnaire, Templates, Price book) — nothing kept twice. | Yes. | DEF-01 · MM-01 · SP-02 · LM-05 |
| Q-02 | Settings on Company's frame: the L1 header and a tab strip of the modules (the house `Tabs`, as REG-498 planned "when its modules are built"), the open module in the address (`?section=`), `?from=` honoured with Back; on a phone the strip scrolls its open tab into view. | Yes. | SP-02 · SP-05 |
| Q-03 | Studio › *Who may do what*: a read-only table of the four roles against every action 2.0 gates (change settings · delete a lead · delete a quote or a contract · approve quotes · publish templates · move a signed contract back · open Insights · manage members · see every lead), written from the same rules the app enforces, so it can't drift. No custom roles or editor (held, leads Q-40). | Yes. | DEF-02 · MM-02 · ST-14 |
| Q-04 | Studio › the team and the entities as cards: the members by role with *Manage members*, the issuing entities with the default and *Manage entities*. Studio Health stays out (Q-16). | Yes. | ST-01 · ST-11 |
| Q-05 | Quotes & pricing › GST: whether the studio is GST-registered and its GST rate (default 9 %) — read by the quote's Issuing Entity helper and GST switch, a new line's GST % and the contract letterhead. | Yes. | MM-08 · QP-13 |
| Q-06 | Company › Members: *Add member* (name, phone, email, role); *Deactivate* (records kept; open leads and quotes counted and shown; out of every picker) and *Reactivate*; only an Owner makes an Owner; nobody changes their own role; the studio keeps at least one active Owner. | Yes. | DEF-03 · MM-03 · MM-04 · ST-02 · ST-07 · RW-02 |
| Q-07 | Owners and Admins change the studio — Notifications, Integrations, Company › Profile and the brand kit, a template's default / rename / delete, the backup approver (checked to be a member who is neither Owner nor Admin) — on the page and on the server; Designers read. The price book's gate waits for its own audit. | Yes. | DEF-10 · MM-07 · RW-01 · RW-04 · QP-09 |
| Q-08 | One read-only look: a member who may not change a module sees every value with the controls disabled and one line under the module's title saying who may. | Yes. | DEF-10 · RW-03 |
| Q-09 | Lists that rename and reorder, with Undo: lead sources, the Lost and On Hold reasons and the trades rename (what carries the old name follows) and reorder by drag; a Lost reason's contact gate stays editable; every remove answers with Undo. | Yes. | DEF-05 · DEF-09 · MM-06 · LM-04 · LM-07 · QP-01 · RL-01…RL-03 |
| Q-10 | Issuing entities known by id: quotes and contracts store the id; a rename follows; an entity in use can't be removed — its count shows and it is retired instead (it keeps printing what uses it, it isn't offered for new ones). | Yes. | DEF-04 · MM-05 · ST-11 · ST-12 · RL-04 |
| Q-11 | Company on a phone: More › Company opens the Company panel as a bottom sheet, so every Company page is reachable. | Yes. | SP-05 |
| Q-12 | Lead capture reads every way in — webhooks and email lead sources beside the website form and Meta; a webhook's label becomes one of the studio's sources; the intake address keeps its own slug, set once. | Yes. | MM-09 · LM-19 · RL-05 |
| Q-13 | Custom fields and the question bank keep their promises: editing a lead never erases an inactive field's value; *Required* is the lead form's rule (as 1.0) and the card says so; the bank's *Required* marks the lead's copied questions and the Questionnaire tab counts the unanswered ones. | Yes. | LM-08 · LM-20 |
| Q-14 | Notifications: Email and WhatsApp go out with the in-app notice — with In app off they are off too and say why; the untouched and On Hold lines name who is told. | Yes. | LM-16 |
| Q-15 | Small truths: the quote number example shows the real next number; the studio's name comes from its record, not "Demo Studio"; the copy slips are mended; a list saved equal to its defaults says so; the base state's "Test" template moves to Deleted Templates (restorable). | Yes. | QP-11 |
| Q-16 | Studio Health — sessions, page views, feature use, per member? | No — the platform's telemetry; Leads › Insights holds response times; the Dashboard waits for mocks. | ST-15 |
| Q-17 | Lead categories, the AI assignment prompt, the legacy pipeline stages? | No — 1.0 saves them and reads them nowhere. | LM-06 · LM-11 · LM-12 |
| Q-18 | Sub-categories under a trade? | No — sub-sections live on the quote; 1.0's renderer never read the list. | QP-01 |

### 6.2 Settled earlier (stand as answered)

| Topic | Call | Where |
|---|---|---|
| An editable funnel ("Manage Stages") | Hold | leads Q-02 |
| The duplicate-detection switch | A dialog, no switch | leads Q-18 |
| Custom lead fields | Built | leads Q-25 (REG-612) |
| Workflow toggles (contract / project type / assignment required, auto follow-ups) | No | leads Q-26 |
| An Accounting role | With Finance | leads Q-39 |
| Custom roles and a permissions editor | Hold | leads Q-40 |
| Settings for Owners and Admins only | Yes (built) | leads Q-41 |
| Generation rules (Starter Quote) | Hold | templates Q-07 |
| Quote Sharing's settings | Nothing to port | templates Q-09 |
| Approval thresholds, a margin floor | No | quote editor Q-24 |
| Price-book tiers, item approval, price history | Held for the price book audit | quote editor Q-19…Q-21 |
| A library of PDF signing documents | Hold | contracts Q-26 |
| Templates per issuing entity | No | contracts Q-29 |

## 7. Build rounds

Nothing existing is removed. Each round ends with tsc + eslint, a Playwright probe at 1440 (+ 390 / 768 touch where the round touches them, and the 320 overflow gate), banked screenshots, register rows, repair rules and the baseline when data changes.

| Round | Builds | Questions | Size |
|---|---|---|---|
| **1 · Settings in 1.0's shape** | The modules Studio · Lead management · Quotes & pricing · Notifications on Company's frame (tab strip, `?section=`, `?from=`); Studio's *Who may do what*, team and entities cards; Quotes & pricing's GST; one read-only look; the real next number and the studio's name | Q-01…Q-05 · Q-08 · Q-15 (copy) | L |
| **2 · Who may change the studio** | Members: add, deactivate, reactivate, the Owner rules; Owners and Admins on Notifications, Integrations, Profile, the brand kit, template defaults and the backup approver; Company on a phone | Q-06 · Q-07 · Q-11 | M |
| **3 · Lists and records that hold** | Rename and reorder with Undo (sources, reasons, trades) with their records following; entities by id and retire-in-use; lead capture's every way in and the fixed slug; custom fields and the question bank's promises; the notification channels; the demo leftovers | Q-09 · Q-10 · Q-12…Q-15 | L |
| **4 · Data** | The devs' map for a studio's settings | Q-01 | S |

## 8. Coverage, and what was not verified

**Rows:** 10 definitions · 9 mismatches · 70 matrix rows (+ 5 touchpoints) · 18 new questions + 13 settled. Inventories: A 67 rows · B 44 · C 52 · D (the data model and port plan) · E 109. The live app on :3001 was not browsed; every 1.0 row rests on the code, and each reader's *Uncertain* list stands.

### 8.1 Found in 1.0 on the way (for the 1.0 developers)

From the code reading; not reproduced on a running 1.0.

1. **Saving Custom Fields erases every lead's custom-field answers** — the save deletes and re-inserts every field with new ids and the answers cascade; the delete dialog promises the opposite (B-26).
2. **Any member can change anyone's role — themselves to owner included — and remove anyone, the owner too**, through `/api/identity/members`; the owner-only UI is the only gate (A-33).
3. **Creating a custom role named Owner, Admin or Accounting overwrites that system role** with restrictive defaults, and the locked editor can't undo it (A-46).
4. **The Roles & Permissions matrix is mostly for show** — page access unenforced, data scope unread, most action switches unread, custom roles unholdable; the four roles mean different things per studio's seed (A-43…A-53).
5. **Editing the default legal entity silently removes its default flag**, and editing an inactive one reactivates it and wipes its numbering (A-36).
6. **A removed member stays signed in** — the session cookie carries no expiry and `/api/auth/me` ignores the inactive flag while extending remember-me by 30 days (A-28).
7. **"Invite Member" invites nobody** — it saves a request and emails four staff addresses, and prod / demo have no email key (A-12, A-13).
8. **Quote Sharing is write-only** — six settings saved, never shown back, never read; every switch click writes "off" (C-38…C-41).
9. **Quote Approval Rules act on nothing**; the approval that runs is Workflow's toggle (C-35…C-37).
10. **Saving Quote Categories deactivates every row, then re-inserts one by one with no transaction**; a rename strands the price-book items; the server PDF reads inactive rows (C-07, C-09).
11. **The CSV import on Quote Categories stores prices 100× too high** and drops the category (C-10).
12. **A read-only member can re-file price-book items by drag** — the reorder route checks only the session (C-30).
13. **The default T&C and contract reach a client only on *Regenerate link***; *New template* can't add a second while one exists (C-17, C-18).
14. **The funnel works by position and fixed ids**: reordering buckets or swapping statuses silently changes intake, closing and e-sign moves; the Simple template lacks the ids (B-16, B-17, B-20).
15. **Renamed funnel labels never reach the activity log, follow-up titles or notifications** (B-18).
16. **The journey editor can undo its own safeguards** — Signed made optional becomes a one-click board move; reason codes collide after a delete (B-07…B-10).
17. **Lead Categories, AI Assignment Logic, Pipeline Stages, the Ads and ID Buddy switches** are saved and read nowhere (B-21, B-34, B-35, A-65).
18. **Webhooks**: the Google key can never be rotated or shown again; generic endpoints can't get a secret; the rate limit lives in one server's memory (B-29…B-32).
19. **Studio Health is owner-only in the browser alone**; "AI runs" and "Quotes sent" count other things (A-57…A-59).
20. **Finance › Document Numbering can't read back what it saved** and overwrites the prefixes on the next save (C-42).
21. **Docs against code**: Accounts is said to be owner-only and Settings open to accounting — the code does the reverse (A-61); the Archived Leads list lives on the Leads page, not Accounts (B-43).

### 8.2 Found in 2.0 on the way (fixed in the rounds)

1. Settings' rail predates Company's tab strip; `?from=` dropped; the phone's module row hides Notifications (E-2, E-95, E-97, E-104) — round 1.
2. The quote number example isn't the next number; "Demo Studio" written into the copy (E-93, E-94) — round 1.
3. Read-only looks four ways (E-98) — round 1.
4. The studio's own GST registration and rate have no screen (E-88) — round 1.
5. No roles statement (E-62) — round 1 (read-only).
6. Notifications has no role check (E-84) — round 2.
7. Integrations save through an unchecked action (E-85) — round 2.
8. Profile and the brand kit carry no role check; the two halves overwrite each other (E-86) — round 2.
9. A template's default, rename and delete open to anyone (E-87) — round 2.
10. The backup approver's select and server disagree (E-108) — round 2.
11. Members: no add, deactivate or reactivate; Admins mint Owners; demoting yourself locks the demo (E-105) — round 2.
12. Company unreachable on a phone (E-96) — round 2.
13. Lists can't be renamed or reordered; a Lost gate can't change (E-100) — round 3.
14. Removals have no confirm or Undo (E-99) — round 3.
15. Issuing entities are known by their name (E-89) — round 3.
16. The intake address moves with the company name (E-90); lead capture misses webhooks and email (E-101) — round 3.
17. Editing a lead erases an inactive custom field's value; Required only on the form (E-91) — round 3.
18. The question bank's Required is saved and never read (E-92) — round 3.
19. Email and WhatsApp ride on In app (E-103) — round 3.
20. Demo leftovers: the "Test" template in every picker, the default reasons saved as a row (E-107, E-109) — round 3.
21. The Price book's categories drift from the trades (E-102) — the price book audit.
22. House pieces not followed: a page-local rail and phone row (round 1), removable pills two ways and the custom fields table and the question bank as twin tables and twin dialogs (E-104) — moved to the UI sweep (U-10).
23. Copy slips: "Add a on hold reason", "Failed to create webhook", "else Owners" where Owners and Admins are told (E-106) — round 1.

## 9. The owner's answers

**The owner's instruction, 2026-09-24 (night):** "You take a call and go with your recommendations and build everything as i'm going to sleep now." Every one of the 18 new calls is **As recommended**, set on that instruction; the decisions doc shows each with its dropdown so the owner can override any of them. The 13 settled calls stand as answered in their audits.

## 10. Build log

Rounds follow §7. The decisions doc's section G carries each round's status.

- **2026-09-25** — audit written (REG-643); the 18 new calls set *As recommended* on the owner's instruction (REG-644).
- **Round 1 built and verified** (REG-645): Settings on Company's frame with the modules Studio · Lead management · Quotes & pricing · Notifications; Settings › Studio (team, entities, Who may do what from the enforced rules); the studio's GST; one read-only look; the real next number, the studio's name, the copy slips. Probe `verify-st-r1.cjs` 57/57; qe-r2 · qe-r3 · tpl-parity green.
- **Round 2 built and verified** (REG-646): Company › Members adds, deactivates (Undo) and reactivates under the Owner rules; deactivated members leave every picker, suggestion and notice; Owners and Admins alone change Notifications, Integrations, Profile, the brand kit, a template's default / rename / delete, the backup approver; More › Company on a phone. Probe `verify-st-r2.cjs` 29/29; the 16 banked probes green (443 checks).
- **Round 3 built and verified** (REG-647): rename and reorder with Undo for sources, reasons (the gate editable) and trades, their records following; entities with ids — a rename follows, one in use is retired; Lead capture lists every way in, a webhook's label joins the sources, the intake slug is kept; inactive custom values kept; Required reaches a lead's questions; Email and WhatsApp ride on In app; repair R55. Probe `verify-st-r3.cjs` 27/27. The pills and twin tables (E-104) moved to the UI sweep as U-10; the session-id role checks found on the way as U-11.
- **Round 4** (REG-648): the devs' map `12-accounts-setup-migration-map-2026-09-25.md`; the base state rebuilt. **The Accounts Setup parity is complete.**

## Appendix — the inventories

`accounts-setup-1.0-inventory/` — **A** the Studio group (A-01…A-67) · **B** the Lead Management group (B-01…B-44) · **C** the Quotes & Pricing group (C-01…C-52) · **D** the data model and the port plan · **E** 2.0 today (E-1…E-109). The folder's README says who read what.
