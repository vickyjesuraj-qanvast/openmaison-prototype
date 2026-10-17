# S43B · Honest reads and true demo data — outcome (2026-10-15, lane B)

Package S43B: `s42/pending-ledger.md` › FIX package **F1**, every item but F1-05 (the new sample-room photos — its own package). Her words
(2026-10-15): "can you fix all the pending things apart from — dark mode, languages, themes and guided tours, and countries beyond Singapore";
every call taken as recommended. Built in lane B (port 3170), repair number **R147** (R148…R159 unused). No migration. Register rows:
`steps/reg-S43B.md` (REG-S43B.1…8). Probe: `design-source/verify/pending-modules/verify-pm2-s43b.cjs` (**70 / 70**), shots
`design-source/verify/pending-modules/pm2-s43b/`. The site pictures' capture tool: `design-source/verify/pending-modules/capture-site-pictures-s43b.cjs`.

## Ledger — every F1 item

| # | Item | Status | Where · how |
|---|---|---|---|
| F1-01 | Auto Fill is a scripted stand-in (REG-319) | **fixed** | New `lib/leads/contact-fill.ts` — `readContactFile` / `readContactText` (pure), `fillWords`, `CONTACT_ACCEPT`, `FILL_ORDER`: the picked file's own words by rule — a WhatsApp export (Android and iOS formats, day/month told apart), an email (From / Sent / Date headers), typed call notes and labelled logs; channel, the contact's moment, an outcome by `OUTCOMES`' words (client-side "call me back" / "not interested", a meeting agreed with a day and time, else who spoke), the next step only when its day and time are written (tomorrow · a weekday · "18 Oct" · "18/10" · a full date, read against its message, never before it), Met's where and when. Only empty fields fill; entered values are kept and said; a moment-less file takes the upload's (testers' L-6 kept); a picture / scan / unreadable file fills nothing and says so. `components/leads/move-stage/dialogs.tsx` `AutoFillDialog` reads through the host (`onUpload(file)`, busy "Reading {file}…", Upload opens its own picker, `kind` picks the helper); `wizard.tsx` `handleAutoFillUpload` (fill + attach + the line per log, `fillNotes` kept with its log through deletes), `panels.tsx` (`LogShell note`, `fillNote` on both panels), `fields.tsx` `AutoFillNote`; `components/leads/notes/lead-notes.tsx` `autoFill` (read, fill, upload + attach, Add tasks only when something filled, its Auto added row the file's own next step) and `contact-editor.tsx` (`fillNote`). `AUTO_FILL_DAYS` / `AUTO_FILL_HOUR` and `AUTO_FILL_BODY` removed. |
| F1-02 | Recreate from my quote "matches" a photo by its name | **fixed** | `lib/templates/recreate.ts`: `matchSourceFile` removed; `unreadMatch(why)` (`by: 'picture'`, `fair`, one honest reason); `readLayout` no longer takes `fileName` nor a name bonus — a PDF with no style words is "Closest match · Nothing in its words points to one design". `lib/templates/read-quote-file.ts` uses `unreadMatch` for a photo / picture-PDF / unopenable PDF. `components/company/templates/recreate-dialog.tsx`: "Not read" (secondary colour, `data-read="no"` in its module CSS), the designs open to pick from, honest drop-zone help. `components/templates/editor/template-editor.tsx`: "{name} design applied" when nothing was read. **Sibling checked:** Upload a quote / X-Ray / the trial already read by words (S42B `read-upload.ts`) — unchanged. |
| F1-03 | The website's pictures show 1.0's claims; four unused pictures | **fixed** | All 24 pictures checked against 2.0: the 18 capability pictures (Visualizer · Space Planner · Finance · Projects · Maison AI) each had at least one untrue card per grid — every one replaced by a capture of 2.0's own screen (1200 × 750, production build, demo records; the capture script re-takes them). The six module photographs (`modules/*`) carry no claim — kept. 1.0's kitchen before/after (`ai-visualiser-room*.jpg`, a model render 2.0 never made) replaced by 2.0's engine pair (`WELCOME_AFTER` + its `before` and `swatches`, `components/site/visuals.tsx` `BeforeAfter`) and deleted with the four unused `co-pilot/*.jpg`. Lines beside the pictures re-read: Projects' plan and alerts, the Space Planner's views and sharing, the Visualizer's sharing rewritten to what 2.0 does (`lib/site/platform.ts`); the rest hold. |
| F1-04 | October's money: the front door opens on a loss | **fixed** | Repair **R147** (`scripts/repair-demo-data.ts`, before the closing checks): Aisha Rahman's one-off *Upgrade* invoice sent and paid on the demo day with its full trail (see REG-S43B.5); guarded (her project live and in progress; its fixed id unwritten), idempotent ("on record — nothing to do"), its trail held by R72 / R75 / R79's checks. On today's base: *Profit this month* S$1,166.50, margin 35.7% on S$3,266.50 invoiced (was −S$3,005.50). The tile stays a calendar month. **For Vicky:** a restore in the first minutes after midnight on the 1st can put it on the last day of the month before (the restore's last-day squeeze, S42A) — that one day reads thin. |
| F1-05 | The Visualizer's new sample photos | **not in this package** | Its own package (the prompt). The website's before/after now reads `WELCOME_AFTER`, so it follows when F1-05 re-makes the welcome's after. |
| F1-06 | A Hangout chat's End offers nothing to a lead on hold | **fixed** | `lib/hangouts/queries.ts` `stepFor` reads each chat lead's members and its stage logs (the stage it left — `meetingStepFor`'s rule) and returns `resume`; `components/hangouts/meetings-view.tsx` offers "Resume {first}’s lead at Met", landing on the lead's "Resume at Met?" confirm. `HangoutMeetingRow.resume` added. |
| F1-07 | The server never checks a stage's fields | **fixed** | `app/leads/actions.ts`: `stageFieldsRefusal` (window's `validateStage` + `fetchStageAsks`, next step only when entering Contacted) in `moveStage` (before anything is written) and `updateStageDetails` (now `{ ok } | { error }`); `lib/leads/stage-data.ts` `stageRefusal` names the field. Callers `app/leads/workspace.tsx` and `app/leads/[id]/overview.tsx` say the refusal instead of "details updated". On Hold / Lost (no wizard payload) untouched. |
| F1-08 | The studio's own addresses ride to a client's browser | **fixed** | `lib/portal/home.ts` `fetchPortalData` drops `previewHref` (documents, needs, before-work steps) unless `visitor.preview`; `PortalDocument.previewHref` is `string | null`; `lib/portal/notifications.ts` `fetchPortalBell` drops it from the bell's rows. `components/portal/money/portal-money.tsx` reads it only when present. Invisible. |
| F1-09 | LEADS D-42 still "Later" | **fixed** | `design-source/uat/story/checklist-LEADS.json`: D-42 and its siblings DEF-32 · G-15 "Not built — by design" (quote editor D-101); S-10's reason updated for the real Auto Fill; UAT step 5.11 picks the new `public/uat-files/sophia-whatsapp-chat.txt` (+ `gen_files.py`, `ch5-files.json`); `build_uat.py` re-run. |
| F1-10 | The credits balance stamped ahead of now after a restore | **fixed** | `lib/credits/demo-month.ts` `CREDIT_BOOKKEEPING` + `clampCreditBookkeeping` (the balance's, the plan's and the caps' `updated_at` held at now — moving the whole story a day less for a stamp no page reads would part Kevin Ng's renders from his lead); `lib/db/baseline.ts` `restoreBaseline` applies it; R111 holds them at now on every run, with a closing check. On today's base it held one such stamp. |

**Counts:** 9 of 9 items fixed (F1-05 belongs to its own package). Siblings fixed: the Met step's Auto Fill; Notes' Add tasks after a read; the template editor's Match snackbar; DEF-32 · G-15; S-10; UAT 5.11.

## Calls taken as recommended (her "fix all the pending things" 2026-10-15)
- **Auto Fill's picture** — the ledger's "keep it attached, fill nothing, say so" and her "We can't read pictures yet — type what was said".
  The line sits at the top of the log (the dialog closes on pick — the file is already on the log), the lead form's pattern (S42F).
- **Testers' L-6** kept for a file with words but no moment: the log takes the upload's, said so in the line.
- **Recreate's photo** — no claim: "Not read", the designs open to pick from (the ledger said "Closest match"; nothing was matched, so the
  eyebrow says so).
- **The website's pictures** — real 2.0 captures for every grid (one look per grid kept), rather than dropping five grids to icons.
- **October's money** — a new one-off invoice (an Upgrade) on the demo day rather than sending a stage invoice: the demo's only ready stage
  invoice (Aisha's Commencement) is its showcase and several probes walk it; the tile stays a calendar month.
- **F1-10** — clamp the bookkeeping stamps (the ledger's second option), not cap the story's move by them.

## For other packages / the orchestrator
- **After the merge:** run `npm run db:repair` on `pbuild/base.db` and on local.db (R147 writes Aisha's upgrade invoice dated the run's day; R111
  holds the bookkeeping stamps), then `npm run db:baseline`. R147 dates the invoice inside the run's day, never after now (09:30 → 15:12, squeezed
  into the hours since midnight when the run is earlier).
- **Lane A (S43A):** my edits in `app/leads/actions.ts` are confined to `moveStage` (two lines after `teamNeededFor`), `updateStageDetails` (its
  signature and two lines) and the new `stageFieldsRefusal` below it — no `sessionMemberSql` / `members.isYou` use was added anywhere; R147 writes
  plain SQL with `'dane'` as the actor (as R79 does).
- **After S43A (one signed-in member per browser):** this lane was verified before S43A landed; `verify-pm2-s43b.cjs` picks its member the way every pm2 probe does (`update members set is_you …`, the standing session). If S43A changes how a probe signs in as a member, it needs the same change as its siblings.
- **F1-05:** the website's before/after reads `WELCOME_AFTER.before` / `.image` and `.swatches` — re-make the welcome's after and update the
  three swatches if the picks change. The capability pictures do not use the sample photos except the Visualizer's (Kevin Ng's design) — re-take
  them with the capture script if the samples change.
- **UAT:** step 5.11 changed (above); the S42F note on 4.02 (Fill from a document) is still the orchestrator's.

## Shared pieces changed (the other lane must know)
- `components/leads/move-stage/dialogs.tsx` — `AutoFillDialog`'s `onUpload` is now `(file: File) => Promise<void> | void` (it reads first; no
  file-less Upload), plus `kind`. `components/leads/move-stage/fields.tsx` — new `AutoFillNote`. `panels.tsx` — `fillNote` props.
- `lib/leads/stage-data.ts` — `stageRefusal` added; `AUTO_FILL_DAYS` / `AUTO_FILL_HOUR` removed.
- `lib/portal/home.ts` — `PortalDocument.previewHref: string | null`.
- `lib/hangouts/queries.ts` — `HangoutMeetingRow.resume`.
- `lib/credits/demo-month.ts` — `CREDIT_BOOKKEEPING`, `clampCreditBookkeeping`; `lib/db/baseline.ts` uses it.
- `lib/visualizer/welcome-after.ts` — `before`, `swatches`.
- `lib/templates/recreate.ts` — `matchSourceFile` removed, `unreadMatch` added, `readLayout` without `fileName`, `Match.by` `'words' | 'picture'`.
- `public/site/marketing/**` — 18 pictures replaced, 6 deleted.

## Probes changed on purpose (each commented "S43B, a deliberate change of this rule")
- `verify-pm2-s05.cjs` — Auto Fill: the screenshot is attached and fills nothing; call notes then fill the log (L-6's day, the next step at
  7:00 PM); the picker is the dialog's own (`auto-fill-input`); the attachment check is exact (the line names the file too); the stage keeps
  both files.
- `verify-pm2-s11.cjs` — a photo is "Not read" with the closest-design reason, never "by its name".

## Checks run
Lane B's production build (`next build` under the lanes' lock, exit 0 — four builds, the last after every change), `next start -p 3170` with
`CRON_SECRET=probe-cron WHATSAPP_WEBHOOK_SECRET=probe-wa`, each probe on a fresh copy of `pbuild/base.db` migrated + repaired in this lane
(`run-env.sh`'s shape, pointed at the lane).

| Check | Result |
|---|---|
| `tsc --noEmit` · `eslint app components lib proxy.ts --quiet` · `npm run design:lint` | clean · 0 errors · "nothing new breaks a house rule" (baseline untouched) |
| `db:migrate` + `db:repair` on the scratch copy | all checks pass, incl. the new "the balance, the plan or a cap last written after now"; R147 writes once, a second run "nothing to do" (the probe runs it) |
| **`pending-modules/verify-pm2-s43b.cjs`** | **70 / 70** — every table put back as it was; no page error |
| Touched probes | see the run table below |

| Probe (lane build, fresh copy of the repaired base each) | Result |
|---|---|
| pending-modules: s05 (after its deliberate change) · s11 (after its deliberate change) · s42e · s27 · s35 · s42g · s13 · s22 · s42a · s08b · s41b1 · s23 | 114/114 · 62/62 · 65/65 · 155/155 · 138/138 · 40/40 · 65/65 · 116/116 · 89/89 · 62/62 · 110/110 · 147/147 |
| projects / parity map: pj-r5 · pj-gap-b · pm-a · pj-fix-D | 91/91 · 72/72 · 47/47 · 35/35 |
| projects: pj-r6 | **80/82 — not this package's**: its two literals "due 2 Oct" read the base as of 14 Oct; `pbuild/base.db` was re-taken at 05:05 on 15 Oct (after S43A landed) and every moment moved a day, so Benjamin's Mid-Project now reads "due 3 Oct" (the shot shows it). R147 touches Aisha only. For the orchestrator: loosen the two date literals (or read the due day from the DB). |
| regression (`regression/run.cjs 3170`): ux-p1 (the lead journey — every stage move goes through the new server check) | 81/81 |
| 390 / 320 | the Auto Fill dialog (sheet) and the Notes log's line at 390; the site's platform pages at 390 and 320 — no sideways scroll against `screen.width` |

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — the Auto Fill dialog and window keep the mock's shape (REG-319's frame, the log card, the Notes
   variant); every new sentence is listed as invented copy in `reg-S43B.md`; the site's pictures are the product's own screens.
2. **One system, no one-offs** — one reader for both Auto Fill doors (`contact-fill.ts`, S42F's shape), the line in the log's own callout look
   (`AutoFillNote`, used by both), the window's own `validateStage` on the server, `heldMeetingStep` asked the same way by the meeting page and the
   Hangout, `clientSafe`'s rule for the portal's addresses, the welcome's pair for every before/after.
3. **Plain words** — "We can’t read pictures yet — type what was said", "Kept what you entered for Outcome", "Not read", "Resume Lim’s lead at Met",
   "The Contacted step isn’t complete — Log 1’s Contacted via: choose an option".
4. **Nothing is lost** — a read never overwrites what was entered (and says it kept it); every picked file is kept on the log and in Files; a
   refused move or correction changes nothing; R147 adds, never edits; the clamp moves only stamps no page reads.
5. **Say why** — every file that fills nothing says why (picture, scan, unreadable, nothing found); a refused move names the field; a photo in
   Recreate says it can't be read.
6. **Back returns where you came from** — no navigation changed; End's resume carries the Hangout as `?from=` as before.
7. **Every screen is whole** — no new page; the dialogs keep the house head and foot; the read's wait is said in the drop zone and the button.
8. **Every width is designed** — 390: the Auto Fill dialog as a sheet and the Notes sheet's line, no sideways scroll; the site pages at 390 / 320
   no sideways scroll (probe).
9. **Tables follow the leads listing** — no table changed (the Margin picture uses the listing's own Column settings).
10. **Motion with purpose** — none added; every press answers at once ("Reading…", the line, the snackbar).
11. **Honest data** — the heart of the package: no scripted fill, no name-match, no 1.0 claim in a picture, a month backed by a real invoice and
    its trail (REG-343), no stamp after now.
12. **Reach for everyone** — the line is `role="status"`; the drop zone is a named button ("Choose the conversation") and Upload opens the same
    picker from the keyboard; the eyebrow's state is words, not colour alone.
