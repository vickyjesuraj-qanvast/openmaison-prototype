# S42F · the leftovers found while landing S42 — outcome (2026-10-14, lane C)

Package S42F: the four items in `s42/carried-notes.md` › "Found while landing S42C" and "From S42B's outcome", and `s42/calls-for-vicky.md` ›
"Settled while fixing" — no audit file. Built in lane C (port 3175), repair number **R161** (R162…R169 unused). Register rows:
`steps/reg-S42F.md` (REG-S42F.1…8). Probe: `design-source/verify/pending-modules/verify-pm2-s42f.cjs` (**49 / 49**), shots
`design-source/verify/pending-modules/pm2-s42f/`. No migration.

## Ledger — every item

| # | Item | Sev | Status | Where · how |
|---|---|---|---|---|
| 1 | **New project accepts an empty team** (the owner's "Dane Testing", P-2026-006, fails R68 on local.db) | Major | **fixed** — every door checked | `components/projects/new-project-dialog.tsx`: when the creator isn't a Designer, `validate` asks for a member (`MSG.assignee`, "Assign at least one member", on the Assign member field — the lead form's words) and a failed Create focuses the first field that needs something (on a phone the field sits below the fold). `app/projects/actions.ts` `createDirectProject` refuses an empty team `{ error: TEAM_NEEDED }` ("Assign a member first" — `lib/projects/model.ts`, the stage menu's words); `components/projects/projects-workspace.tsx` hands that refusal back to the dialog, which clears the pick and says it on the same field (e.g. the member picked was deactivated meanwhile). **The other doors:** *Won's step* — `app/leads/actions.ts` `moveStage` / `quickMoveStage` now refuse a move past New for a lead with no member (`teamNeededFor`; the screens already refused via `blockedReason`, the server did not); *Duplicate project* — when nobody on the source's team can come along, the one who duplicates it is on the copy (`duplicateProject`); *Make the project again* (`app/projects/ending-actions.ts` `remakeLeadProject`) and opening a Won lead's missing project (`openLeadProject`) refuse without a member; emptying the members past New (`assignMembers`, `updateLead` — Edit details on a project) is refused on the server as the popover / form already refused it (`keepsAMember`); *Maison AI's Start a project* opens the same New project dialog (covered); *the trial claim* makes leads through `createLead`, always New (a New lead may wait for its member), no project; *a new studio* (`lib/studios/create.ts`) makes no lead and no project. **The owner's record is not edited** — repair **R161** (`scripts/repair-demo-data.ts`) gives a project whose client record has no member its maker (`projects.created_by`, assigned at the project's creation and by them), or the first active Owner when the maker is gone, deactivated or in Accounting; idempotent, with its check "project whose client record has no member". It mends P-2026-006 the next time the orchestrator runs repair on local.db. |
| 2 | **`isStudioVisit()` on the other client links** (S42B B-02's siblings) | Major (B-02's) | **fixed** — every client link that stamps a view swept | `app/po/[token]/page.tsx` (the vendor's PO), `app/meeting/actions.ts` `recordMeetingView`, `app/renders/actions.ts` `stampShareView` (the renders link), `app/planner/actions.ts` `stampLayoutLinkView` (the 3D layout link), `app/hangout/actions.ts` `recordHangoutView` (a homeowner's own Hangout page). The sweep (every `viewed`/`opened`/`view_count` write reached from a public path): the signing links, the confirmation and view-only quote links were S42B's; `/invoice` · `/receipt` · `/f` · `/pay` · `/papers` · `/card` stamp nothing; **the portal is left as is** — it is signed in with the client's own number (the record says who opened it), and the studio's own look at it is already a preview that records nothing (`visitor.preview`); marking it from the studio cookie would stop a client's open being recorded on a shared family computer. |
| 3 | **The portal's "Sign the agreement" row reads `quoteHoldsSigning`** | Minor | **fixed** + sibling | `lib/portal/home.ts` reads the quotes the agreements out for signature name (any status) and marks each `held` by S42B's `quoteHoldsSigning` (the signing link's rule, with Settings' quote approval); `lib/portal/needs.ts`: one predicate `signsNow` (out for signature, not past its window, not held) for What needs you (a set waits while any of its documents does), Before work starts' *Sign the agreement* (held: "Not ready yet — your designer is updating the quote this agreement signs. It’ll be back here once it’s ready.", no button) and the studio's Client access panel "n waiting". **Sibling fixed:** an agreement whose link has expired (S03) was already out of What needs you but its step still offered "Open the agreement" to a dead link — it now says "The signing link has expired. Please ask your designer to send you a new one." (the link's own words), no button. |
| 4 | **Fill from a document fills a fixed sample lead whatever file is picked** (E-05's family) | Major (a pretend read, E-05's) | **fixed** | New `lib/leads/document-fill.ts`: `readLeadDocument(file, ctx)` reads the file in the browser — a PDF's text (`lib/pdf-text.ts`, the import's and Upload a quote's reader), a spreadsheet's cells (`lib/xlsx.ts` · `lib/csv.ts`), a text file — by rule: labelled lines in the import's own words (`leadSheetField`, newly exported from `lib/leads/homematch.ts`, and `autoMap`), a one-row lead sheet (`parseLeadSheet`), a "label \| value" sheet; then, for name · phone · email · property address · property type, what plainly appears ONCE in running text (one Singapore number — the one mobile among landlines, never a member's; one email — never the studio's own address or domain; a name beside its email, after "My name is" or signing the message; a line that is an address, not a sentence; a home named with its size); values through the import's readers (`readPropertyType` · `readDistrict` · `readAmount` · `readSource`), a value they can't place left out; two candidates for one field left out. A photo or a scanned page has no words (said), a sheet of several leads belongs to Import leads (said), nothing found is said. `components/leads/lead-form.tsx`: the sample (`DOCUMENT_FILL` / `DOCUMENT_FILE`) is gone; the drop zone and **Upload** open the picker (`.pdf,.xlsx,.csv,.txt`); while it reads, "Reading {file}…"; a read fills only the empty fields (1.0's rule), keeps what was typed, attaches the file itself (its bytes upload with the lead, as Attach files'), opens Additional info when a filled field lives there, closes the dialog and writes one line under the link — "Filled from {file}: …. Kept what you typed for …. Not found: …."; a read that finds nothing keeps the dialog open with the reason under the drop zone and changes nothing. No credits: 1.0's lead reads cost 0 (`lead_email_parse` · `lead_screenshot_parse` in `lib/credits/schedule.ts`). |

**Counts:** Major 3/3 fixed (items 1, 2, 4) · Minor 1/1 fixed (item 3) · siblings fixed: the server-side member rule on stage moves and member edits, Duplicate's fallback, Make the project again, the expired agreement step and its access-panel count. Nothing left unfixed in this package.

## Calls fixed as recommended (her "build all of them" 2026-10-11; listed in s42/calls-for-vicky.md for her review)
- **Settled while fixing — Fill from a document** (calls-for-vicky.md): "read the picked file's own words by rule … and say plainly when nothing
  reads" — built as recommended. Pictures are not read (no OCR by rule; nothing calls a model) and are said so; the picker no longer offers them.
- **S42B's note on the portal** ("the portal's Sign the agreement row could ask `quoteHoldsSigning`") — built, in the signing link's words (B·1).
- **The member rule for projects** — the carried note's recommendation ("the dialog and the server must ask for one … as the lead form does past
  New"), the house words kept: the field says `MSG.assignee`, the server says the stage menu's "Assign a member first".

## For other packages
- **The orchestrator (UAT)** — `design-source/uat/story/ch4.json` step **4.02** says "Press Upload (no file needed — this is a demo)" and expects
  the sample Nurul Hassan; it is wrong now. Suggested: *how* "1. In the open form, click "Fill from a document" 2. Pick an enquiry PDF (a PDF with
  lines like "Name: …", "Mobile: …", "Email: …") — or try a photo, or the Homematch lead sheet 3. Look at the fields and the line under the link,
  then press "Cancel""; *expect* "The empty fields fill with what the file says, the file is attached, one line says what filled and what wasn't
  found; a photo or a sheet of several leads says why nothing filled"; *in10* "Same job as 1.0's AI read, done by rule: the file's own words, no
  credits". A sample enquiry PDF for testers could join `public/uat-files/` (`gen_files.py`) — the orchestrator's call. And in the Projects
  chapters (ch17–21), a step that makes a New project as Dane must now pick a member before Create.
- **The orchestrator (local.db)** — run `npm run db:repair` on local.db after the merge: R161 puts Dane (P-2026-006's maker) on "Dane Testing", and
  R68's two checks pass again.
- **S42E (the site's claims)** — `lib/site/changelog.ts` still says "Drop in a WhatsApp screenshot and AI reads it" (the Contacted log's Auto Fill);
  Auto Fill is a declared scripted stand-in (below) — the site should say what it does.
- **Lane A** — none. **Lane B (S42D)** — `app/renders/actions.ts` and `app/planner/actions.ts` each gained one guard line at the top of their
  view stamp (`stampShareView`, `stampLayoutLinkView`) and an import; nothing else in those files.
- **For Vicky (found, not on my list)** — the Move stage window's and Notes' **Auto Fill** (REG-319, the mock's 780:… flow) still fills a contact
  log from a fixed script whatever screenshot is dropped. A chat screenshot has no words to read by rule (no OCR), so unlike Fill from a document it
  can't be made real without a model; it stays a declared stand-in. Her call whether it should say so on the screen.

## Shared pieces changed (the other lanes must know)
- `lib/projects/model.ts` — `TEAM_NEEDED` (one constant). `app/leads/actions.ts` — `teamNeededFor` (moveStage · quickMoveStage) and `keepsAMember`
  (assignMembers · updateLead): a lead past New with nobody is refused on the server. `lib/leads/homematch.ts` — exports `leadSheetField`.
- `lib/portal/needs.ts` — `HomeContract.held`, `signsNow`; `lib/portal/home.ts` — reads the named quotes and Settings' approval.
- `components/leads/lead-form.tsx` + `lead-form.module.css` — `.fillRow` is now a column (the link, then the line under it), `.fillNote`,
  `.fillError`. `components/projects/new-project-dialog.tsx` — focuses the first field with an error after a failed Create (every field, not only the team).
- `scripts/repair-demo-data.ts` — R161 and its check (after R160, before the closing list).
- The view-stamp guards: `app/po/[token]/page.tsx`, `app/meeting/actions.ts`, `app/renders/actions.ts`, `app/planner/actions.ts`, `app/hangout/actions.ts`.

## Probes changed on purpose (each commented "(S42F, a deliberate change of this rule)")
`projects/verify-pj-r1.cjs` (New project as Dane picks Sarah before the first Create — Who sees below counts Germaine's and Alex's),
`projects/verify-pj-gap-e.cjs` and `projects/verify-pj-gap-i.cjs` (New project as Dane picks Germaine). `verify-pj-gap-a.cjs` already picked one.

## Checks run
All on lane C's production build (`DATABASE_URL=file:<scratch> npx next build` under the lanes' lock, exit 0), `next start -p 3175` with
`CRON_SECRET=probe-cron WHATSAPP_WEBHOOK_SECRET=probe-wa`, each probe on a fresh copy of `pbuild/base.db` migrated + repaired.

| Check | Result |
|---|---|
| `tsc --noEmit` · `eslint app components lib proxy.ts --quiet` · `npm run design:lint` | clean · 0 errors · "nothing new breaks a house rule" (baseline untouched) |
| `db:migrate` + `db:repair` on the scratch copy | every check passes, incl. the new "project whose client record has no member"; R161 "nothing to mend" on the demo (every project has a member); on a copy with two projects stripped of their members (one made by Hui Min, one by Priya — Accounting) R161 gives Hui Min hers and the Owner Priya's, a second run has nothing to mend (the probe runs this) |
| **`pending-modules/verify-pm2-s42f.cjs`** (this package) | **49 / 49** — every table put back as it was (a hash of every table before and after); no page error; server log clean |
| Projects probes (each on a fresh copy, `next start -p 3175`) | pj-r1 98/98 (after its deliberate change) · pj-gap-a 72/72 · pj-gap-e 55/55 · pj-gap-i 81/81 · parity-map pm-e 58/58 (Duplicate) · pj-gap-f1 86/86 (the PO link) · pj-gap-j 55/55 (the 3D link) · pj-r4b 75/75 · pj-r7 67/67 · pj-fix-E 50/50 · **pj-r4a 72/73 · pj-fix-F 43/44 — the two known failures of the demo's ageing moments** (Benjamin's floor plan "shown an hour ago" on 5 Oct, `NEW_FILE_DAYS` = 7 — carried note, routed to S42A's day-shift), unchanged by this package |
| Pending-modules probes | s02 106/106 (Viewed on the PO, the link cards) · s05 113/113 (the lead form, Lead stages) · s13 65/65 (the portal) · s23 148/148 (the meeting link) · s27 155/155 (the Hangout pages) · s41b3 176/176 (the trial's lead form — no Fill from a document) |
| Regression (`regression/run.cjs 3175`) | ux-p1 81/81 (the lead journey — stage moves) · ux-p2 73/73 (the listing, "Add lead with …") · viz-client 30/30 (the renders link) |
| 390 / 320 | the New project sheet, the lead form with its fill line and the portal's waiting step: no sideways scroll against `screen.width`; the team error scrolls into view under a finger |

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mocked screen changed shape; every new sentence is listed as invented copy in `reg-S42F.md`
   (the portal's two step lines, Fill from a document's help, its status line and its four reasons).
2. **One system, no one-offs** — one member rule (`TEAM_NEEDED`, `MSG.assignee`) on every door that makes or keeps a project; one studio-visit rule
   for every client link's Viewed; one signing rule (`quoteHoldsSigning`) for the link and the portal; one predicate (`signsNow`) for the portal's
   need, step and access count; the document read reuses the import's label words, readers and the one PDF reader.
3. **Plain words** — "Assign at least one member", "Not ready yet — your designer is updating the quote this agreement signs", "Filled from
   enquiry.pdf: name, phone number and email. Not found: property address.", "Nothing in bill.pdf looks like a client’s details."
4. **Nothing is lost** — a refused Create keeps everything typed; a read never overwrites what was typed (and says it kept it); a failed read changes
   nothing and attaches nothing; the picked file is kept with the lead; R161 adds, never removes.
5. **Say why** — the team field says what's missing and takes the focus; a stale stage move says the rule; a waiting agreement says what it waits
   for; every unread file says why.
6. **Back returns where you came from** — no navigation changed.
7. **Every screen is whole** — no new page; the dialogs keep their house head and foot; the read's busy state is said in the drop zone and the button.
8. **Every width is designed** — 390: the New project sheet scrolls the team error into view; the fill line and the portal's waiting step read
   whole; no sideways scroll at 390 / 320 (probe).
9. **Tables follow the leads listing** — no table changed.
10. **Motion with purpose** — none added; every press answers at once ("Reading…", the field error, the snackbar).
11. **Honest data** — the bug was a record with nobody on it: refused at every door and mended by R161; Viewed is the client's alone; the portal
    never asks a client to sign a link that won't sign; Fill from a document never shows a stranger's details as the file's.
12. **Reach for everyone** — the first field with an error takes the focus; the fill line is `role="status"`, the read's reason `role="alert"`; the
    drop zone is a named button ("Choose the document") and Upload opens the same picker from the keyboard.
