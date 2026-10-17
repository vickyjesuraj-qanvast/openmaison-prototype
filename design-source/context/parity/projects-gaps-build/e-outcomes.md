# Package E — files and delivery · outcomes (gaps build, 2026-10-07)

Brief: `scratchpad/build2/brief-e.md` · report rows `26-projects-missing-from-1.0-2026-10-07/5-files-data-roles.md` (+ `2-detail-updates.md`).
Port 3125 · repair R82 · probe `design-source/verify/projects/verify-pj-gap-e.cjs` · register rows `reg-e.md` (REG-e.1…).

Running file (protocol §5). Status words: **Built (code)** = written, tsc clean · **Verified** = the probe passed on it at 1440 and 390.

Status: **done** — 5 of 5 items Built · Verified, 0 not built, 0 moved. Probe `verify-pj-gap-e.cjs` 54/54 (1440 + 390 + 320).

| # | Item | Outcome | What / where |
|---|---|---|---|
| 1 | Every file kept | Built · Verified | One storage path `lib/leads/file-store.ts` (`keepBytes` · `keepThumb` · `storedBytes` · `storedThumb` · `copyStored` · `sendStored` with ranges, safe types inline, anything else as a download). New table `lead_file_thumbs` (a PDF's first page, a video's first frame). `uploadFile` keeps any file's bytes up to 8 MB (`FILE_UPLOAD_MAX`, `tooBigLine`) with its real kind / mime (`fileKindOf` · `mimeFor` in `lib/leads/file-model.ts`) and the browser-drawn picture; a name alone is refused. Client: `components/leads/files/file-pictures.ts` (`pdfFirstPage` via pdf.js, `videoFirstFrame`, `readAsDataUrl`), `upload-picture.ts` `uploadPicked` (every kind), `use-pdf-pictures.ts` (a PDF kept before its picture gets it on first listing, `keepFilePicture`). Routes: `app/files/raw/[fileId]` (open / `?download=1`), `app/files/thumb/[fileId]`; `/f/[token]`, the portal's `serveLeadFile` (+ `?thumb=1`) and `/projects/[id]/media` all send through `sendStored`; a shared invoice / receipt entry redirects to its own link. Glyph per kind `fileGlyph` (grid, list, viewer, Deleted Files, Activity); `downloadName`. Download in the tab and the viewer = the real file under its name. Return Lead's attachments now upload their bytes (`return-lead-wizard.tsx`). Duplicate copies bytes + picture. |
| 2 | Who sees leads on every file action | Built · Verified | `app/leads/files-actions.ts`: `mayOpenLead` / `filesOf` on create folder, upload, rename, move (destination too), duplicate, trash, restore, delete forever, empty trash, comments, `keepFilePicture` — "This lead isn’t one you can open"; a file of another lead never rides along; money files (Files › Payments etc.) refused to whoever doesn't see the money. Every refusal is `{ error }` (createFolder / renameFile / moveFiles no longer throw). `fetchFileView` asks `canOpenLead` (the viewer page 404s). Edit a comment = its author only (as the panel offers). Show to client already checked (`setFilesShown`). |
| 3 | The viewer: ← / → and a thumbnail strip | Built · Verified | `file-viewer.tsx`: window keydown ←/→ (not while typing, in a layer, on a video / iframe), `useShortcutsHere(FILE_VIEWER_KEYS)` (registry: area `files`, `file.step`), edge tooltips show the keys, Back marked `data-kb="back"` (Esc). Strip under the canvas: the house square thumbnail at 48, the open one ringed, scrolls sideways, current scrolled into view; hidden with one file. Ghost draws the strip. |
| 4 | Starter folders | Built · Verified | `STARTER_FOLDERS` + `missingStarters` (file-model), `lib/leads/starter-folders.ts` `addStarterFolders`; ONE call in `lib/projects/create.ts` `writeProjectRow` (both the Won path and `createDirectProject`'s transaction go through it). A's Contract step finds "Contract & VOs" (or an older "Contract") — `CONTRACT_FOLDERS` in `app/projects/actions.ts`, `lib/projects/queries.ts`, the snackbar names the folder. Activity names the set once. |
| 5 | A delivery layer + Sent messages | Built · Verified | `lib/notifications/delivery.ts` (`deliver` · `deliverNotice` · `deliverDerived` · `setDeliveryAdapter`; the prototype's adapter records); `emit.ts` `notify` hands every email / WhatsApp channel to it (+ `fields`); the bell's derived reminders go out once when the member opens the bell (`app/notifications/actions.ts`). Table `notification_outbox`. Pure `lib/notifications/outbox.ts` (`compose`, `waNumber`, words). Settings › Notifications › Sent messages (`app/settings/sent-messages.tsx`, card table, channel chips + event scope pill, Show more, message dialog), action `app/notifications/outbox-actions.ts` (Owners / Admins all, others their own). |

Demo data R82: real pages for Site measurements + XR-1042 (+ any PDF with no bytes), true sizes, starter folders on every live project, two spreadsheets (Benjamin's BOQ, Ryan's supplier price list), first pages drawn in Node (pdf.js + @napi-rs/canvas), the outbox from the newest twelve email / WhatsApp bell rows.

## Progress log
- Sync done; base tree `pkg-e/base-tree.txt` = d93e6889f76576a29a594190920bf5f3a92bcacd. node_modules cloned, scratch DB `pkg-e/test.db` from base.db.
- Migration generated locally as 0073_files_kept_delivery (lead_file_thumbs, notification_outbox; a `lead_files.starter` column was tried and dropped — it broke LeadFile literals in C's attach modal).
- All five items written; tsc clean; eslint 0 errors; design:lint holds. R82 passes twice on a fresh copy of the (A + B) base.db (55 → 0).
- `reg-e.md` written (13 rows). Probe `verify-pj-gap-e.cjs` written; builds on :3125 (helpers in `pkg-e/`: tsc.sh · build.sh · repair.sh ·
  serve.sh · probe.sh · cycle.sh).
- 20:02 the orchestrator refreshed base.db with package C merged: C's migration is newer than my 0073, so drizzle skips mine on that base.
  My probes run on `pkg-e/old-repaired.db` (the A + B base with my migration and R82, saved after the clean runs) via repair.sh; the C-merged
  base is checked by `repair-c-base.sh` (0073 applied by hand): R82 53 → 0 and all seven R82 checks pass; only REG-613's unknown-kind check
  fails there, on C's own kinds (`task_outside`, `task_sent_outside`) which my tree does not list — the merge brings both lists together.
- Also built: the two Who may do what rows (files · Sent messages, `lib/settings/permissions.ts`), the Maison AI button steps over the
  strip (`maison-fab.module.css`, REG-358's way), the log's first line drops the link, exact sizes (`dataUrlSize`).
- gap-a's probe changed where my rule changed its assertion: the Contract step's copy is filed in "Contract & VOs" (REG-e.10).
- Probe run 1 (old build): 13/15 then a stop on the list row's kebab (hover first). Run 2: 50/53 — an upload's refusal was not said (the tab's
  `send` lost the reason: now it says "Couldn’t upload … — Huge scan.pdf is over 8 MB — a smaller file fits"), and two probe words (a refusal's
  lowered first letter; the record-not-found notice). The upload toast's row now wears the file's glyph (a .dwg typed image/vnd.dwg showed a
  broken picture). Run 3: **54/54**; the probe leaves the DB as found (`pkg-e/dbdiff.sh`: no table's count moves, is_you back on Dane).

- Regression (each on a fresh copy of the repaired scratch DB, one build, :3125): r1 83/83 · r2 83/83 · r3 86/86 · r4a 73/73 · r4b 75/75 ·
  r5 90/90 · r6 79/79 · r7 62/62 · r8 65/65 · r9 65/65 · fix-B 53/53 · fix-C 49/49 · fix-D 35/35 · fix-E 50/50 · fix-F 44/44 · gap-a 66/66 ·
  gap-b 70/72. Probes changed where my rule changed what they read: r4a · r9 · fix-F look the floor plan up by name with `like 'Floor plan%'`,
  which now also finds the starter folder "Floor plans" — `and kind <> 'folder'` added; fix-C's video plays from `/files/raw/<id>` (it asserted
  the project's media route); gap-a's contract copy is filed in "Contract & VOs".
- **gap-b's two failures are A × B, not E**: check 5 ("a stage ready to bill is the project’s one filled action") reads Aisha Rahman's project,
  which A's R78 puts on hold — her one action is Resume. With her hold lifted on a copy (`pkg-e/gapb-nohold.sh`) gap-b passes **72/72** on my
  build. The orchestrator should hold another project's invoice in gap-b (or run its Aisha section un-held, as A did for fix-B).
- Final gap-e run 54/54, shots banked in `design-source/verify/projects/gap-e/` (10). :3125 stopped.

## Not changed, and why
- The Move stage window's Quote Sent / Won upload (REG-149: "any picked file → the mock's file row", the row is the mock's file whatever was
  picked) and the New lead form's scripted Fill from a document ("Enquiry - Nurul Hassan.pdf") stay as designed: changing them changes a mocked
  flow. Their PDF in Files is a name; R82 gives any such PDF a page that names it. Flagged for the owner in REG-e.6.
- Update media keep their composer's own upload (`uploadUpdateFile`, already kept bytes; its PDFs get their first page through Files'
  backfill); the composer's frame grab is duplicated in `components/leads/files/file-pictures.ts` (`videoFirstFrame`) rather than reached
  into the composer — the composer could import it later.
- Messages to the client (Phase B) and a real provider + a sweep for derived reminders are the developers' (`setDeliveryAdapter`, the
  comment in delivery.ts).

## For the map (CLAUDE.md) and the other packages
- Storage: `lib/leads/file-store.ts` (one path; `sendStored` for every route), tables `lead_file_images` (every file's bytes) + `lead_file_thumbs`
  (a non-picture's picture); routes `/files/raw/[fileId]` (`?download=1`) · `/files/thumb/[fileId]`; model `fileKindOf` · `mimeFor` ·
  `fileGlyph` · `downloadName` · `FILE_UPLOAD_MAX` · `STARTER_FOLDERS` · `missingStarters` · `CONTRACT_FOLDERS` (lib/leads/file-model.ts).
- Package D (portal): `/my/<slug>/file/<id>?thumb=1` answers a PDF's first page / a video's frame for a tile; `serveLeadFile(f, req, { thumb })`.
  A selection receipt filed in Files stays a row with no bytes that opens its own page (B's way) — Files' Download says Coming soon for it.
- Any sender: `notify(kind, ids, { …, fields })` — pass the event's own fields ({task}, {update}, {milestone}, {invoice}, {amount} …) and the
  email / WhatsApp go in the studio's words; without them a message whose words name a missing field goes in the bell's words.
- Starter folders: ONE call in `writeProjectRow` (lib/projects/create.ts) — it covers the Won path and `createDirectProject`'s transaction
  (`app/projects/actions.ts` has no call of its own).
- Lines changed in others' files (minimal): `app/projects/actions.ts` (createFolder's `{ error }` in `contractFolderFor`; `CONTRACT_FOLDERS` in
  `readProjectContracts` / `contractFolderFor`, which return `folderName`), `lib/projects/queries.ts` (`contractFiledOf` reads either name),
  `components/projects/project-frame.tsx` (the snackbar names the folder), `lib/projects/create.ts` (one call), `app/projects/[id]/media/[fileId]/route.ts`
  and `lib/portal/files.ts` (`sendStored`), `app/my/[slug]/file/[fileId]/route.ts` (`?thumb=1`), `components/quotes/editor/files/files-section.tsx`
  (uploads through `uploadPicked`), `components/leads/return/return-lead-wizard.tsx` and `components/leads/lead-form.tsx` + `app/leads/workspace.tsx`
  (the picked files' bytes), `app/notifications/actions.ts` (`deliverDerived`), `app/settings/notifications-settings.tsx` (mounts Sent messages,
  one help line), `components/shell/maison-fab.module.css` (appended step-over), `lib/leads/activity.ts` (the starter line; `fileGlyph` for a
  file's icon), `lib/keys/registry.ts` (area `files`, `file.step`, `FILE_VIEWER_KEYS` — appended), `lib/settings/permissions.ts` (two rows),
  `lib/db/schema.ts` · `lib/db/baseline.ts` · `scripts/snapshot-baseline.ts` (two tables appended), `scripts/repair-demo-data.ts` (R82 + 7 checks,
  imports). Probe changed on purpose: `verify-pj-gap-a.cjs` (the Contract step's folder is "Contract & VOs" — REG-e.10).

