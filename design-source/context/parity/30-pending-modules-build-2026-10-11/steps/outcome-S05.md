# S05 · Leads leftovers — outcome (2026-10-11)

Card: `held:leads` (Leads) + the steps' notes after S01…S04. 1.0 read: `src/components/accounts/funnel-editor.tsx` (Accounts › Pipeline
Stages: add · rename · recolour · reorder buckets, the per-status flags *Follow-up required* and *Contract required*),
`src/lib/agents/executors.ts` (`create_lead` · `update_lead` — mAIson wrote the record straight away), the lead drawer's quote / file
openers, 1.0's return form (it only submitted — no appeal, no policy page, the `CONVERSION_TIPS` list), the 1.0 export columns.
Register rows: `steps/reg-S05.md` (REG-S05.1…20). Probe: `design-source/verify/pending-modules/verify-pm2-s05.cjs` (**113 / 113**); shots
banked in `design-source/verify/pending-modules/pm2-s05/`.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| Edit the lead funnel (Manage Stages) — keep the hold; the row still answers Coming soon | **Hold kept; the row defined** — "Manage Stages ›" opens Settings › Lead management › **Lead stages** (`#lead-stages`, `?from=` the listing): the seven stages, what each keeps on the lead, the live count per stage (a press opens the listing there), 1.0's two per-stage flags as switches (Contacted asks for the next call · Won asks for the signed contract), and Linear · Flexible (the old Stage movement card, absorbed). Adding / renaming / reordering stages **not built** (one journey every record, Activity, Reports, the portal and the port map read — see Decisions). The Move stage window obeys the two switches | `app/settings/lead-stages-card.tsx` (+ css, new), `app/settings/{settings-view,page,settings-ghost,actions}.tsx`, `lib/settings/{types,queries}.ts` (`LeadStageRules` · `parseLeadStageRules` · `fetchLeadStageRules`, key `lead_stage_rules`), `app/leads/actions.ts` (`fetchStageAsks`), `lib/leads/stage-data.ts` (`StageAsks`, `validateStage(stage, d, asks)`), `components/leads/move-stage/{wizard,panels}.tsx`, `app/leads/workspace.tsx` (`onManage`) |
| Testers' L-2 (change status after Won) | **Kept** — nothing moves backwards (REG-111…); a Won lead's step is corrected through its Edit, as before | — |
| Testers' L-3 (company + UEN on the lead) | **Built** — Commercial property types ask for Company name · UEN (NRIC hidden unless filled); the info column; template fields `client_company` · `client_uen`; contract chips `client.company` · `client.uen`; the export | `components/leads/lead-form.tsx` (+ css), `components/leads/detail/info-column.tsx`, `app/leads/actions.ts` (`LeadFormInput`), `lib/leads/{enums,events,activity,queries,export}.ts` (`isCommercialType`), `lib/templates/{data,fields,queries}.ts`, `lib/quotes/editor.ts`, `components/quotes/editor/quote-editor.tsx`, `lib/contracts/{tokens,snapshot,queries}.ts` |
| Testers' L-4 (co-owner on the lead) | **Built** — Add a second client (name · NRIC / FIN · mobile, checked); the info column; every new quote starts with them (REG-588's second client); Client access offers them for the household (Co-owner, prefilled); NRIC masked in Activity; R107 | `components/leads/lead-form.tsx`, `components/leads/detail/info-column.tsx`, `app/leads/quotes-actions.ts` (`createQuote`), `lib/portal/access.ts` (`coOwner`), `components/portal/{household-rows,household-dialog}.tsx` (`prefill`), `lib/leads/{events,activity,export}.ts`, `scripts/repair-demo-data.ts` (R107) |
| Testers' L-5 (kanban card density) | **Kept** (her "hold back the other module changes"; the card asked to revisit only L-3 and L-4) | — |
| Maison AI creates or updates a lead and moves its stage | **Built, by rule, through the form or the window** — Ask box intents `add_lead` · `move_lead` · `edit_lead` (Create New Lead filled · the Move stage window at the step · On Hold / Lost's dialog · Edit Lead on the field); a number already on a lead offered first; Accounting refused; the listing's three words-only suggestions act. Never writes on its own; nothing metered | `lib/maison-ai/{intents,answer}.ts`, `app/leads/workspace.tsx` (`?new=1` landing, suggestions), `app/leads/[id]/overview.tsx` (`?edit=<field>`, `?move=on-hold|lost`), `lib/leads/move-link.ts` (`MoveStep` + on-hold · lost) |
| Fill a new lead from a document; Auto Fill from a chat screenshot — stand-in; carry L-6 | **Stand-in kept** (the developers' AI read, Q-28). **L-6 built**: the contact is dated now and its next step 3 days on at 7:00 PM; Auto Fill keeps the picked screenshot as the log's file (uploaded with its bytes) | `components/leads/move-stage/{wizard,dialogs}.tsx`, `lib/leads/stage-data.ts` (`AUTO_FILL_DAYS` · `AUTO_FILL_HOUR`), `components/leads/notes/lead-notes.tsx` |
| Lead-sheet PDF import fitted to a guessed layout | **Kept** — the sample sheet never arrived (developers, with a real sheet) | — |
| Move stage Quote Sent / Won upload keeps only the file's name | **Built** — Quote Sent's PDF kept in Files › Quotes & BOQ with its bytes; Won's signed quote kept with its bytes (also when a Won step is corrected); the rows show the picked name; the logs keep names / ids only. The steps' Attach rows are real (Attach files on the lead's own files; the Q-101 tile retired) | `components/leads/move-stage/{panels,fields,wizard}.tsx` (+ css), `lib/contracts/{files,won}.ts` (`keepPdfIn` · `quoteFolderOf` · `splitStageFiles` · `keepQuoteSentUpload`), `lib/projects/create.ts` (`fileWonQuote`), `app/leads/actions.ts`, `app/leads/files-actions.ts` (`fetchAttachLibrary`), `lib/leads/notes.ts` |
| Export: Quote status and Project type | **Built** — + Company · UEN · Second client | `lib/leads/export.ts`, `lib/leads/queries.ts` (`latestQuote` · `project.type`) |
| Lead capture (webhook, Gmail, website form, Meta) | **Stand-ins kept** — the developers' lane (Q-36) | — |
| Return: Appeal, the policy, Tips › View all, deleting evidence | **Built** — Appeal (card banner · Return details' "here" · ⋮ · the listing's row menu) on the rejected return as sent; Qanvast's return policy dialog; View all / Show fewer; a file off a return still with Qanvast (Undo; refused once answered) | `app/leads/return-actions.ts` (`appealOf`, `fetchAppealDraft`, `removeReturnAttachment` · `restoreReturnAttachment`), `components/leads/return/{return-lead-wizard,return-details-modal,return-policy-dialog}.tsx` (+ css), `components/leads/detail/returned-card.tsx`, `components/leads/table.tsx`, `app/leads/[id]/overview.tsx`, `app/leads/workspace.tsx`, `lib/leads/{events,activity}.ts` |
| Coming soon presses whose target exists: FILES card Create Folder / Upload, From System › View, Imports › Filters | **Built · built · removed** | `app/leads/[id]/overview.tsx`, `components/leads/files/use-file-upload.tsx` (new), `components/leads/move-stage/{panels,fields}.tsx` (`viewHref`), `app/leads/imports/imports-view.tsx`, `components/shell/skeleton.tsx` |
| Sort on the Tasks and Files table heads | **Built** — Tasks: Due date · Status; Files: Title · Last updated · Size; arrow + `aria-sort`; one sort with Filters' (its line names the head) | `lib/leads/{task-filters,file-model}.ts`, `components/leads/tasks/{tasks-table,tasks-filters-modal,lead-tasks}.tsx`, `components/leads/files/{files-table,lead-files}.tsx` |
| Attach files dialog: type chip, Sort, list view, select all, folder ⋮ | **Built** — File Type, Sort, Grid / List, folders open with the crumb, the folder ⋮ (Open · Tick its files); the do-nothing select-all and quote kebab removed | `components/leads/tasks/attach-files-modal.tsx` (+ css) |
| Files › New ▾ › From Company Files · From Google Drive | **Company Files removed; Drive kept** for the developers (OAuth) | `components/leads/files/files-toolbar.tsx`, `lead-files.tsx` |
| Files: Download on a file with no stored copy (invoice / receipt entries) | **Left for S07** (its line: "Files' invoice / receipt Download") | — |
| Notes › Refine | **Built, by rule** — no model, nothing metered; Undo | `lib/leads/note-refine.ts` (new, pure), `components/leads/notes/{lead-notes,pane-toolbar}.tsx` |
| Tasks hub phase 3; the small 1.0 conveniences | **Kept** (her calls) | — |
| On Hold phone line clips at the 240 floor (REG-891) | **Built** — the day on its own line under the phone, "Till Sat, 31 Oct ’26", whole at the floor | `components/leads/table.tsx` (+ css) |
| (found) An in-flight note save put its snapshot back over a newer edit | **Fixed** — the newer edit stays, the autosave writes it after; Refine's Undo lands | `components/leads/notes/lead-notes.tsx` (`save`, `change`) |
| (found) A press in a folder's ⋮ menu also opened the folder | **Fixed** | `components/leads/tasks/attach-files-modal.tsx` |

## Files
New: `app/settings/lead-stages-card.tsx` (+ `.module.css`), `components/leads/return/return-policy-dialog.tsx` (+ `.module.css`),
`components/leads/files/use-file-upload.tsx`, `lib/leads/note-refine.ts`, `drizzle/0089_leads_s05.sql` (+ meta), the probe and `pm2-s05/`.
Changed: see the table's last column; also `lib/db/schema.ts`. For CLAUDE.md's Map (the orchestrator's): Settings › Lead management ›
**Lead stages** = `app/settings/lead-stages-card.tsx` (`lead_stage_rules`: `contactNextStep` · `wonContract`; the Stage movement card is
inside it now) and `validateStage(stage, d, asks)`; a lead's company = `leads.company_name · company_uen` (`isCommercialType`), its second
client = `leads.client2_*`; an appeal = `lead_returns.appeal_of`; the step uploads keep their bytes (`keepQuoteSentUpload` · `fileWonQuote`);
Refine = `lib/leads/note-refine.ts`; the shared upload hook = `use-file-upload.tsx`; Maison AI's lead intents in `lib/maison-ai/intents.ts`.

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **Manage Stages: the hold on editing the funnel stays; the row opens what a studio can set.** The card recommended hiding the row; a hide
  would have left 1.0's two per-stage flags (*Follow-up required*, *Contract required*) and the stage counts with no home, and Settings already
  held the stages' movement rule — so the row opens one card that holds all three. Renaming, adding, recolouring and reordering stages is not
  built: 2.0's stage names are the journey's words in Activity, the bell, Reports, the portal, the port map and ~40 screens, and nothing
  moves back (REG-111…). **For Vicky:** if she prefers the card's hide, drop `onManage` in `app/leads/workspace.tsx` (the card stays in Settings).
- **L-3 and L-4 built; L-2 and L-5 kept** (the card's "revisit L-3 and L-4").
- **Maison AI never writes a lead by itself** — 1.0's `create_lead` / `update_lead` wrote at once; 2.0's answers open the form or the window
  that would do it by hand, so the studio sees and confirms every change (the brief: "a chat home that shows and confirms any change").
- **An appeal is a return again** — a new `lead_returns` row naming the rejected one, counted among the lead's returns (the policy says so);
  Qanvast's days to appeal are shown, never enforced (Q-44's display-only rules).
- **The On Hold day takes its own line** (REG-891's "her pick"): the full words fit to the pixel only, so they would cut on a font change.
- **Contract required stays on by default; Follow-up required stays off** — nothing changes for a studio that never opens the card.

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440:** Leads › the Stage column's menu › **Manage Stages ›** → Settings › Lead management, scrolled to Lead stages; Back
  returns to the listing. Switch on "Ask for the next call or meeting's date" → Olivia Martinez (New) › Move to Contacted: pick an outcome — the
  schedule block loses "(optional)" and Save asks for it (not for *Not interested*); switch off "Ask for the client's signed contract" →
  Ryan D'Souza › Won step › Edit: "Attach client signed contract (optional)". Press Contacted's "n leads" → the listing on Contacted.
- **Hui Min (Admin):** the same card, the switches live. **Germaine / Michelle (Designer):** the card reads, the switches disabled; a press on
  How leads move says only an Owner or an Admin can change it. **Priya (Accounting):** Maison AI "Add a lead for …" answers "Not for Accounting".
- **Edit Lead** on Olivia: Property type › Commercial … → Company name · UEN appear, NRIC goes; Save → Lead info lists Company and UEN. "Add a
  second client" → Second client · NRIC / FIN · Mobile; a mobile without a name is refused under the field. Save → Lead info's Second client
  line; Quotes › Blank Quote → the quote's Second client is them; Invite to Portal › Client access → "Add {first name}" (Co-owner).
- **Maison AI** on the listing: "Add a lead for Mrs Chua, 9123 4567, HDB 4-room, from Instagram" → the row opens Create New Lead filled;
  "Move Jonathan Teo to Met" → his Move stage window at Met; "Put Arjun Mehta on hold" → the On Hold dialog; "Change Olivia Martinez's budget"
  → Edit Lead on Budget. The sheet's three suggestions answer / draft.
- **Gerald Tan › Move to Quote Sent › Upload** a PDF (a PNG is refused) → Save → Files › Quotes & BOQ holds it, Download works; Attach meeting
  documents → Attach files on his files. **Serena Koh › Won › From System › View** → OM-10007's Preview in a new tab.
- **Arjun Mehta** (On Hold, rejected return): the LEAD RETURNED banner → "Appeal the return" with Qanvast's reply, the return's reason and
  files; ⓘ → Qanvast's return policy; View all → ten tips; Send appeal → "Appeal sent to Qanvast" + Undo (Lost; Undo puts him On Hold). Muthu
  (a return with Qanvast) › View Details › a file's ✕ → off the return, Undo.
- **Marcus Chen › Overview › FILES:** Create Folder, Upload Files (the toast, "File uploaded · View"). **Tasks** heads Due date / Status,
  **Files** heads Title / Last updated / Size sort; Filters names the head. **Notes:** type "client wants w/ glass doors , abt S$1,500!!!" →
  Maison AI › Refine → Undo. **Attach files** (a note's paperclip on Benjamin Han's project): File Type, Sort, List, a folder's ⋮.
- **390:** Lead stages stacks one column (the count under the words); the appeal is a bottom sheet; Edit Lead's second-client block stacks.
  (The phone's lead cards never printed the hold day — unchanged.) **Imports** has no Filters button; **Files › New** has no From Company
  Files.
- **Seen, not changed (for Vicky):** on a touch screen every Settings switch row (`<label class=switchRow>` around the DS Switch — Custom
  fields, Notifications, Projects' numbering, now Lead stages) is pulled 10–20 px left of its column by the global 44 px checkbox target rule
  (`app/globals.css`, REG-273: `label:has(input[type=checkbox])` also matches a switch). House-wide and pre-existing — her call.

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate 0089 + repair R107) with `next start -p 3160`; :3160 stopped after.
`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 17 warnings are older files') · `npm run design:lint` nothing new ·
`npx next build` green.

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s05.cjs`** (this step, 12 sections) | **113 / 113** — the page error log empty; the scratch DB left as found (a full `.dump` before and after: no difference) |
| the step's widths (a scratch script: Lead stages, the appeal, Edit Lead's second client, Attach files in a folder, the On Hold listing at 768 touch · 1024 · 390 touch) | 19 / 19, no page errors; 320 is in the probe's section 12 |
| `pending-modules/verify-pm2-s01…s04.cjs` | 79 / 79 · 105 / 105 · 79 / 79 (first 77 / 79 — the deliberate change below) · 82 / 82 |
| `ux-build-2026-09-30/P1 · P2 · P3 · P6 · P7` (the lead journey, listing & import, tasks & files, setup, shell) | 81 / 81 · 73 / 73 · 91 / 91 · 57 / 57 · 94 / 94 |
| `uat-dane-2026-10-01/P1 · P2a · P2b · P3 · P5a · P5b · P6 · INT` | 47 / 47 · 54 / 54 · 56 / 56 · 71 / 71 · 59 / 59 · 56 / 56 · 41 / 41 · 6 / 6 (P5b and INT after the deliberate change below) |
| `settings-parity/verify-st-r1.cjs` · `verify-st-r3.cjs` | 57 / 57 (first 51 + 1 failed — the deliberate change below) · 30 / 30 |
| `ghosts/verify-ghosts-same.cjs` 1440 · 390; `verify-ghosts-strips.cjs` (captures; Settings › Lead management and Imports looked at: the ghost under the page) | 51 / 51 · 51 / 51 · captured |
| `ux-build-2026-09-30/ghosts/verify-first-run-ghosts.cjs` · `first-run-2026-09-30/verify-first-run.cjs` (empty) | 15 / 15 · 89 / 89 |
| `consistency/verify-overlays.cjs` · `keyboard/verify-kb-r1.cjs` · `verify-kb-r2.cjs` · `global-search/verify-search.cjs` | 67 / 67 · 35 / 35 · 29 / 29 · 27 / 27 |
| `folders/verify-folders-files.cjs` · `verify-folders-pickers.cjs` · `ui-sweep/verify-sw-r4.cjs` · `view-as/verify-view-as.cjs` | 16 / 16 · 15 / 15 · 35 / 35 · 23 / 23 |
| `contracts-parity/verify-ct-r1.cjs` (Smart Text's chips) | 36 / 36 |
| `projects/verify-pj-r4a.cjs` · `verify-pj-r9.cjs` · `verify-pj-fix-F.cjs` (the household, Client access) · `verify-pj-gap-a.cjs` (the Projects listing's hold) · `verify-pj-gap-e.cjs` (Files keep their bytes) | 73 / 73 · 66 / 66 · 44 / 44 · 72 / 72 · 55 / 55 (run from the repo — the lane copy can't reach `public/uat-files`) |
| `lead-project-parity/KE/verify-ke.cjs` | **could not run** — its own first `sqlite3` insert breaks on the JSON's double quotes inside the shell's double-quoted command (pre-existing, not this step's; fails before any page opens) |
| `npm run design:anatomy` (on the scratch `next start`) | all 1558 measures hold |

The probes named in the brief that are not on disk: `parity-r1…r7` and `verify-leads-{a,b,c,d}` (the Leads rounds' probes were never banked).

**Assertions changed as deliberate changes of their rule** (each commented `(pending modules, a deliberate change of this rule)`):
`uat-dane-2026-10-01/P5b/verify-p5b.cjs` reads the listing's hold day on its own line ("On hold Till Sat, …"); `INT/verify-int.cjs` finds
the On Hold row by its `hold-line`; `settings-parity/verify-st-r1.cjs` reads the stages from the Lead stages card (the Stage movement card's
sentence is gone); `pending-modules/verify-pm2-s03.cjs` picks the Won step's file input inside the Move stage window (the Overview's FILES card
has its own picker now).

## Migration and repair
- **Migration 0089 `leads_s05`** (additive): `leads.company_name` · `company_uen` · `client2_name` · `client2_nric` · `client2_phone`;
  `lead_returns.appeal_of`. No new table — the baseline lists are unchanged (`fixtures/baseline.json` gains the columns at the next
  `npm run db:baseline`).
- **Repair R107** — Benjamin Han's lead names Mei Ling Han (already on his household, her mobile from her profile) as his second client;
  three checks in the closing list (a second client's NRIC or mobile without a name; a second client's mobile not 8 digits; an appeal that
  names a return of another lead or one that was not rejected). On the demo: "1 second client named"; again: "already in step"; full repair:
  all checks pass.

## For the next steps
- **S07 (Projects leftovers):** Files' Download on a file with no stored copy (invoice / receipt entries) is yours, as its line says. The
  shared upload hook (`components/leads/files/use-file-upload.tsx`) is what an upload from a project page should use.
- **S10 (mAIson):** the lead intents (`add_lead` · `move_lead` · `edit_lead`) answer through rows that open the form / window — the "show
  and confirm" pattern; the lead page's own words-only suggestions (Overview's AI brief) are still words — yours. The landings are
  `/leads?new=1&client=…` (the listing) and `/leads/<id>?edit=<field>` · `?move=<step>` (the lead).
- **S11 (quote templates):** two new fields, `client_company` and `client_uen`; their sample values come from `docDataFromRecords`.
- **Developers:** the server action `moveStage` does not run `validateStage` (it never did — the window validates); a port should enforce
  the step's fields and the studio's two asks on the server. 1.0's per-status flags map to `lead_stage_rules`; 1.0's custom buckets have no
  2.0 home (map them onto the seven stages). The second client's NRIC is stored in full like the first's (masked on screen and in Activity).

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for the new pieces except the appeal banner (858:24095); built on the screens that
   exist (Settings' card and event table, the Return Lead wizard, the house Dialog, the lead form's fields, Attach files, the tables' heads);
   every invented line is in REG-S05.1…18; the Q-101 tile and REG-149's mock name are retired in writing (REG-S05.6–7).
2. **One system, no one-offs** — house pieces only (`ChoiceCard`, the DS `sm` Switch, the event table, `Dialog`, `PortalMenu` + `DropdownItem`,
   `FolderCrumbs`, `AppliedDot`, the house text link, `TextField` / `PhoneField`, the Files upload toast through one hook, the Contracts heads'
   sort model); tokens only — `design:lint` holds.
3. **Plain words** — "Ask for the next call or meeting's date", "Appeal the return", "Till Sat, 31 Oct ’26", "Tick its files", "Note refined".
4. **Nothing is lost** — uploads keep their bytes; an appeal starts from the return as sent; a file taken off a return stays in Files with Undo;
   Refine and the appeal have Undo; Remove the second client clears only their fields; the old Stage movement setting lives on in the card.
5. **Say why** — a refused upload, a mobile without a name, a disabled switch, an empty folder's ⋮ ("No files in it yet"), an empty attach
   result, Maison AI's "Which lead?" / "Which stage?" / "Not for Accounting", the next step's helper, the server's refusals in words.
6. **Back returns where you came from** — Manage Stages and the card's counts carry `?from=`; Maison AI's rows open with the way back; From
   System › View opens a new tab and leaves the step open.
7. **Every screen is whole** — no new page; the Settings ghost draws the Lead stages card; the imports ghost lost the Filters bone; the
   attach dialog's empty states; the policy dialog's own foot.
8. **Every width is designed** — 1440 · 1024 · 768 · 390 · 320 checked (no sideways scroll against `screen.width`); the card stacks on a phone;
   the appeal and the policy are bottom sheets; the attach list toggle steps back on a phone.
9. **Tables follow the leads listing** — the Tasks / Files heads sort as the Contracts / Quotes heads (arrow, `aria-sort`, one sort with
   Filters'); the On Hold line keeps the Lead Name column's floor.
10. **Motion with purpose** — none added; the house dialog, sheet and snackbar timings.
11. **Honest data** — every state from its record (`lead_stage_rules`, the new lead columns, `appeal_of`, the files' bytes, the stage logs'
    ids); R107 backs Benjamin's second client; counts are the listing's own; Auto Fill stays an honest stand-in; nothing metered.
12. **Reach for everyone** — the switches have labels, the heads `aria-sort`, the folder cards are buttons with names, the hold line's
    "On hold" is said to a screen reader, the appeal's reply is text, the form's errors focus the first wrong field.
- **How to add a missing thing** — one home each (the Settings card for stage rules, the lead form for company / second client, the return
  wizard for the appeal); shown only when it applies (Company only for Commercial, the co-owner offer only when they are not on the household,
  Appeal only on a rejected return, the remove only while Qanvast has not answered); one filled button (Send appeal, Save); defaults that
  need no set-up (Contract required on, Follow-up off — as before).
