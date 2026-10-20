# S42D · AI and design tools — outcome (2026-10-14, lane B)

The closing audit's package D: `s42/audit-D.md` (19 findings, D-01…D-19 — Blocker 0 · Major 2 · Minor 11 · Polish 6) and audit D's calls
D·1…D·4 (`s42/calls-for-vicky.md`), each call fixed **as recommended — his "build all of them" 2026-10-11; listed in s42/calls-for-vicky.md for
his review** (D·2 is S42B's). Also closed: the older `verify-pm2-s17` failure — "3-D" with a hyphen in S34 / S41 files (REG-1841; A-18 among
them). Register rows: `steps/reg-S42D.md` (REG-S42D.1…20). Probe: `design-source/verify/pending-modules/verify-pm2-s42d.cjs` — see *Probes run*.
Shots: `design-source/verify/pending-modules/pm2-s42d/`. No migration, no repair rule (R147…R159 unused — nothing here needed data).

## Ledger — every finding

| ID | Sev | Result | Where · how |
| --- | --- | --- | --- |
| D-01 | Major | **Fixed** | `lib/maison-ai/answer.ts` — the bare-name branch scores both sides: a member's whole name (3) against the client hit's score (`Named.score`: 3 whole name · 2 every word · 1 first name, `lib/maison-ai/answers/work.ts` `peopleNamed`); the better match answers; both whole → both offered as rows (client → their lead / project, member → their Members row); a first-name tie still goes to the client (Accounting: the team). `fullyNamed` is the one whole-name test (`membersNamed` uses it too). Probed as Germaine and Dane: "Priya Tan" → "What Priya is working on"; "Priya Nair" → Priya Nair |
| D-02 | Major | **Fixed** | `lib/templates/queries.ts` `fetchTemplate` — counts what the gallery counts (REG-538): live, unarchived quotes on a live lead, and for the studio's default the quotes with no template. One number now feeds *Which quotes print with it?*, the Publish dialog and the deleted bar. Sibling fixed: the editor also counted quotes on deleted leads, which the gallery leaves out |
| D-03 | Minor | **Fixed** | `answers/work.ts` `teamAnswer` `line()` — Accounting's line is its tasks (with "· n overdue" as the others); the callers already say the role |
| D-04 | Minor | **Fixed** | `answer.ts` — Accounting's bare name is matched against the clients too (`peopleNamed(…, { anyRole })`, which only says whether the words name one): a client with a project → the client's statement (a books answer); a lead → "Not for Accounting" with the box's own rule (`ON_LEADS`) |
| D-05 | Minor | **Fixed** (call D·3) | `components/planner/editor/planner-editor.tsx` — at ≤1024 (and not presenting) the ⋮'s first row is *Maison AI* (a rule under it), opening the editor's own `MaisonAiSheet` anchored to the ⋮; 1440 keeps the button and has no row |
| D-06 | Minor | **Fixed** | `components/leads/ai-sheet.tsx` (every Maison AI sheet — the shell's and the ten editors') — opened from the keyboard (`:focus-visible` on the opener) the sheet focuses its Ask box, else its first suggestion; closing with focus inside it returns focus to the opener (else the anchor's button); a mouse press or a tap moves nothing (no phone keyboard pops up) |
| D-07 | Minor | **Fixed** | `app/credits/actions.ts` `askToUpgrade(planId, from)` — a second ask while the studio is on the plan it was asked from writes nothing (`upgradeAskOf` in `lib/credits/queries.ts`: the asker's bell row since the subscription began — the ask's record); the row says where it came from (a feature's lock · Plans · Plan & billing). `CreditSummary.upgradeAsk` (`lib/credits/model.ts`) → the lock card (`plan-lock-dialog.tsx`: "You asked Dane on 14 Oct — it’s in their bell", Close only), the feature's own locked panel (`pro-tag.tsx` `ProLocked` + its ghost), Plans' review step and Plan & billing say the earlier ask and offer no second; every ask refreshes the credits store |
| D-08 | Minor | **Not fixed here — S42B's** (the PDF quote reader on every path, B·4 · E-05 · D-08 · D·2 — routing in `s42/carried-notes.md`); untouched in this lane |
| D-09 | Minor | **Fixed** | `lib/credits/pricing-data.ts` — "Quote templates" → "Quotes print with the studio’s default", "Template editor" → "Your own quote templates" (`FEATURE_WORDS.template_editor`). Sibling fixed (the same fault — the table promising what the app doesn't do): Maison AI's row read "AI credits" on every plan; a question costs nothing (1.0 never metered chat; 2.0's price list has no line) → ✓ |
| D-10 | Minor | **Fixed** (call D·4) | `app/credits/actions.ts` `setDemoPlan` — (1) seats = the members who use the AI tools (`opensWorkspace`, the summary's own count — 7, not 8); (2) leaving the base Pro — Studio for Free or the trial keeps it (settings `demo_plan`: seats, billing and credit months, plan credits) and *Pro — Studio* puts it back while its month lasts — same period, no invoice; with no base, a new month **with its invoice**; (3) *Almost out* records what it took from the plan credits **and the top-ups** and every other pick gives it back (`demoMove`, a ledger row each time — the balance stays the ledger's sum); (4) `lib/credits/ledger.ts` `raiseAlerts` counts `used` from the month's spends net of refunds (`usedSince`), never allowance − plan credits |
| D-11 | Minor | **Fixed** | `answers/work.ts` `leadsAttentionAnswer` leaves out a lead with a live project (`LeadRow.project`); `overviewAnswer`'s "with an overdue follow-up" counts the same leads |
| D-12 | Minor | **Fixed** | `planner-editor.tsx` — the suggestion picks the first bare master bedroom / bedroom / living room ("Furnish the …"); with every one furnished it offers "Re-arrange the {first}" (the same Arrange proposal, Undo) |
| D-13 | Minor | **Fixed** | `answers/money.ts` `creditsAnswer` — "AI credits" in every line; siblings: the Usage and Plan & billing pages' suggestions ("How long will our AI credits last?", "When do our AI credits refresh?") |
| D-14 | Polish | **Fixed** | `answers/clients.ts` — portal visits and issues say "in the last 7 days"; siblings with the same rolling window: renders picked, new leads (and the overview's line). The demo's ageing itself is S42A's restore (carried note; C-20) |
| D-15 | Polish | **Fixed** | `lib/projects/floor-plan-model.ts` `planNameOf` reads a slug as words ("Floor plan photo waterway sunrise"); `app/planner/actions.ts` drops a leading "floor plan (photo)" whatever its separator and capitalises the rest → "Traced — Waterway sunrise" (a remainder under 3 letters keeps the whole name). Covers the Download name and *Under it:* (they read the same names) and a plan added on a project's Floor plan tab |
| D-16 | Polish | **Fixed** | `components/visualizer/editor/stage.tsx` — "Stop" (the result already said "Stopped"). The public trial shares the Stage and its result also says "Stopped" — consistent there too |
| D-17 | Polish | **Fixed** | `components/templates/editor/template-locked.tsx` — `MaisonFab` + `MaisonAiSheet`: "What do our own quote templates add?" (the lock's own words; See plans for the Owner) and "Which plan fits us?" (the Ask box's plan answer) |
| D-18 | Polish | **Fixed** | `components/planner/editor/elevation-panel.tsx` — "Facing the open {side} side …" and "An open side — nothing to draw against. Pieces within 45 cm of it show here."; `lib/planner/elevation.ts` `wallName` "Open {side} side" (the download's file, its snackbar and the drawing's label) |
| D-19 | Polish | **Fixed** | `proxy.ts` — `/dev/ai-bench*` while `devPreviewsOpen()` is false is rewritten before routing to an address no route matches; its RSC data and HTML carry the not-found's tree and none of the bench's words (the layout's `notFound()` stays as a second gate). With the flag on, the bench is unchanged |
| s17 (older) | — | **Fixed** | "3-D" → "3D" in `lib/visualizer/spatial/clip.ts` (incl. A-18's "This browser can’t record from a 3D view."), `extend.ts`, `lib/services/registry.ts`, `app/tools/floor-plan/page.tsx`, the bench's css comment and the developers' `services.md` line |

**Counts:** Major 2 of 2 fixed · Minor 10 of 11 fixed (D-08 is S42B's) · Polish 6 of 6 fixed · the older s17 check fixed.

## Calls fixed as recommended (his "build all of them" 2026-10-11 — listed in s42/calls-for-vicky.md for his review)
- **D·1 — S41's two proposals, both built.**
  - *Download a turning clip* — `components/planner/picture/picture-dialog.tsx`: under the Dollhouse (only — Top-down never turns), one press
    turns the planner's own drawing once in 12 s (`ThreeView spin`) and records it in the browser (`recordCanvas`, S41's) → a WebM (MP4 on
    Safari) named "{layout} — Dollhouse turning" (`clipFileName`, `lib/planner/photo.ts`); the press counts down, the look and the other ways
    out wait, the camera goes back to its framing after; closing the picture drops a clip still recording; a browser that can't record says so
    in the row. No charge, nothing invented.
  - *Square it by its corners* — `components/planner/photo/photo-dialog.tsx` + `straighten-photo.ts` (`cornersStart` · `squareByCorners`) +
    the new shared `components/planner/photo/corner-editor.tsx` (the bench's Plan corners now uses it too): the photo as taken, four named 44 px
    handles started on the sheet the paper finder reads, keys and drag, a crossed quad refused with its reason, *Square it* (one homography,
    the sheet's edge inset 1.2 % as the paper cut does) → the straightening's clean / quarter turns on the squared sheet
    (`straightenCanvas paper: false`), Undo; the press then reads *Move the corners*; Next waits while placing.
- **D·2** — S42B's (the PDF reader for the VO and schedule uploads).
- **D·3** — the ⋮ row (D-05).
- **D·4** — Pro — Studio restores the base exactly (D-10).

## For other packages
- **S42B** — D-08 (the VO menu's "a spreadsheet, a PDF or a photo" vs the dialog's XLSX · CSV) and D·2 are yours, untouched here.
- **S42E** — the public trial's running card shares `Stage`: its press now reads **Stop** (its result already said "Stopped — nothing was kept
  or counted"). Nothing else of the trial changed.
- **S42A** — none of yours touched; D-14's ageing of the demo's recent moments is your restore's (C-20). `proxy.ts` gained one early block (the
  bench gate, right after the old-address redirect) — if your sign-in landing edits the proxy, the two are separate lines.
- **S42C (landed)** — `planNameOf` (a project's Floor plan › add a plan's default name) now reads a slug file name as words; a name with spaces
  is unchanged.
- **The orchestrator / CLAUDE.md's Map** — `components/planner/photo/corner-editor.tsx` is the one corner editor (Make a 3D picture and the
  bench); the 3D picture's turning clip; `CreditSummary.upgradeAsk` · `upgradeAskOf` · `UPGRADE_ASK_HREF`; settings key `demo_plan` (the demo
  switch's memory — Reset forgets it with the settings). `next-env.d.ts` was put back after the build rewrote it.

## Shared pieces changed
- `components/leads/ai-sheet.tsx` — the Maison AI sheet everywhere: focus on a keyboard opening, focus back on close (D-06).
- `components/visualizer/editor/stage.tsx` — the running card's "Stop" (the studio editor and the public trial).
- `components/credits/{plan-lock-dialog,pro-tag,pro-locked-ghost,plans-dialog}.tsx`, `components/company/plan/{billing,usage}-view.tsx`;
  `lib/credits/{model,queries,ledger,pricing-data}.ts`; `app/credits/actions.ts`.
- `proxy.ts` — the bench gate (D-19).
- `lib/planner/straighten-run.ts` — `paper?: boolean` (default unchanged; the Node harness is unaffected); `lib/planner/elevation.ts`
  `wallName`; `lib/planner/photo.ts` `clipFileName`; `components/planner/scene/three-view.tsx` (comment only).
- `components/dev/ai-bench/{corners-section.tsx,ai-bench.module.css}` — on the shared corner editor (`.corners` composes its frame).
- `lib/maison-ai/answer.ts` + `answers/{work,money,clients}.ts`; `lib/templates/queries.ts`; `lib/projects/floor-plan-model.ts`.
- No `components/om/*`, shell layout or `app/globals.css` change; `design:lint` holds (no baseline raised).
- Probes changed on purpose (commented "S42 D-…, a deliberate change of this rule"): `verify-pm2-s15.cjs` (Furnish | Re-arrange),
  `verify-pm2-s05.cjs` (new leads "in the last 7 days"), `ai-credits/verify-cr-r3.cjs` (Stop).

## Probes run
Lane B, port 3170, the production build (`next build` under the lanes' lock, exit 0), each probe on its own fresh copy of `pbuild/base.db`
migrated + repaired (`DATABASE_URL` on the same command); the server stopped by its port after each. `npx tsc --noEmit -p .` clean ·
`npx eslint app components lib proxy.ts` 0 errors (16 warnings, the same older ones) · `npm run design:lint` holds (no baseline raised).

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s42d.cjs`** (this package: §1 Maison AI's answers · §2 keyboard · §3 the template count · §4 Plans · §5 the planner — furnish / re-arrange, the open side, the ⋮ row at 390 · 768 · 320 touch, the turning clip (a real WebM downloaded) · §6 Square it by its corners (keys, drag, crossed, Undo) + the slug name, 390 · 320 · §7 Stop · §8 the demo plan switch + the alert after a real spend · §9 the upgrade ask as Hui Min + the locked editor's Maison AI · §10 the shut bench's RSC / HTML + "3D") | **85 / 85**, the banked run (shots `pm2-s42d/`, 18); an earlier full run on the same build without the 320 rows 79 / 79; every table hashed equal after the run; server log clean; no page errors |
| `pending-modules/verify-pm2-s17.cjs` (the older failure: "3-D") | **130 / 130** (was 129 / 130) |
| `verify-pm2-s10` (Maison AI) · `s15` (planner elevations + Maison AI — its Furnish assertion widened on purpose, D-12) · `s19` (credits, locks, demo plan, the upgrade ask) · `s20` (Visualizer) · `s28` (Make a 3D picture) | 107 / 107 · 33 / 33 · 116 / 116 · 58 / 58 · 98 / 98 |
| `verify-pm2-s41` — plain build (`BENCH=off`, the proxy gate) · `OPENMAISON_DEV_PREVIEWS=1` (`BENCH=on`, the bench's Plan corners on the shared editor) | 11 / 11 · 120 / 120 |
| `verify-pm2-s41b4` (upgrade offers, the demo plan) · `s05` (its "new leads" regex widened on purpose, D-14) · `s11` (template editor) · `s22` (Dashboard's Ask box) · `s34` (with `CRON_SECRET` / `WHATSAPP_WEBHOOK_SECRET`; the registry's words) | 82 / 82 · 113 / 113 · 62 / 62 · 114 / 114 · 180 / 180 |
| Regression (`regression/run.cjs`, RUN_DIR on the repaired base): `cr-r1` · `cr-r3` (its Cancel → Stop on purpose, D-16) · `cr-r4` · `cr-r5` · `viz-studio` · `viz-sheets` · `view-as` · `dane-p6` · `ux-p6` · `kb-r2` · `sw-r2` · `tpl-parity` | 59 · 40 · 41 · 16 · 37 · 14 · 23 · 41 · 57 · 29 · 27 · 20 — all green, 0 failed |

## What to check in the browser (1440 and 390)
- **Dane:** Maison AI › "Priya Tan" (the member), "Priya Nair" (the client), "who is on the team" (Priya's line once), "Which leads need
  attention?" (no Benjamin, Aisha, Ryan), Company › Client portal › "Who has opened their portal this week?"; the FAB from the keyboard (Tab to
  it, Enter: the Ask box has focus; Escape: back on the button). Company › Templates › Quotes › Default Quote PDF › Maison AI › *Which quotes
  print with it?* = its card's "Used by n". Plan & billing › Change plan › Compare everything. The 3D Space Planner › Showroom: Maison AI offers
  "Re-arrange the master bedroom"; Living / Dining › Wall elevations › Bottom (open); ⋮ › 3D picture… › Download a turning clip (12 s). At 390 /
  768 touch: ⋮ › Maison AI. Tools › Floorplan to 3D Isometric: drop `public/planner/demo/floor-plan-photo-waterway-sunrise.jpg` → Square it by
  its corners → Square it → Undo → Square it → Next → Place the rooms ("Traced — Waterway sunrise"). Kevin Ng's design › a style › Generate →
  Stop. View as › Studio plan: Free → Pro — Studio (7 seats, the same months, no new invoice) → Almost out → Pro — Studio (top-ups back).
- **Hui Min on Free:** Quote X-Ray › Ask Dane to upgrade, then open it again, the lead's Quote X-Ray quick link (the lock card), Plan & billing —
  "You asked Dane on …" everywhere, one row in Dane's bell. A quote template on Free: the lock with Maison AI.
- **Priya (Accounting):** Maison AI › a lead's name → "Not for Accounting"; a project client's name → their statement.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for any of these; every new word is flagged *(invented copy)* in `reg-S42D.md`,
   and the two built proposals are recorded as calls taken as recommended.
2. **One system, no one-offs** — the house Dialog, DS Buttons, Chips, the snackbar with Undo, `MaisonAiSheet` / `MaisonFab`, `PortalMenu` +
   `DropdownItem`, the empty state's `ProLocked`, S41's `recordCanvas` and corner maths; the bench's corner editor became ONE piece for both
   (no copied stylesheet); tokens only, `design:lint` unchanged.
3. **Plain words for studio people** — "Download a turning clip", "Square it by its corners", "Re-arrange the master bedroom", "in the last 7
   days", "AI credits" every time, "Stop", "Facing the open bottom side", "Quotes print with the studio’s default"; one name per thing.
4. **Nothing is lost** — squaring answers with Undo; a clip still recording is dropped, never half-saved; *Almost out*'s pretend is given back
   (top-ups included); no record is removed anywhere.
5. **Say why** — Accounting is told why ("Not for Accounting"), a crossed quad says why, a browser that can't record says so in the row, an
   earlier upgrade ask says its day instead of a silent missing button.
6. **Back returns where you came from** — unchanged doors; the planner's ⋮ row returns focus to the ⋮; the answers' rows carry `?from=`.
7. **Every screen is whole** — the locked template editor now carries Maison AI; the ProLocked ghost says what its page says (an earlier ask,
   no button); the picture and photo dialogs show their wait ("Recording… n s", "Squaring it by its corners…").
8. **Every width is designed** — Maison AI reachable at ≤1024 in the planner (390 · 768 touch probed); the corner editor fits a phone sheet
   (min(420px, 50dvh) tall, 44 px handles, no sideways scroll at 390); the clip row wraps under the stage.
9. **Tables follow the leads listing** — no table touched (the Plans compare table's words only).
10. **Motion with purpose** — the only motion added is the turntable while a clip records, started by the press, ended by it.
11. **Honest data** — one count for one fact (D-02), the demo switch reads the base's real seats, months and credits back, with no invoice for a
    billed month and one for a new month, the balance always the ledger's sum, alerts from real spends; the Plans table promises only what each
    plan keeps; no clip or square claims a model.
12. **Reach for everyone** — the Maison AI sheet from the keyboard takes and returns focus; the corners are named buttons moved by the arrow keys;
    the clip's count-down is in the button's name.
- **How to add a missing thing** — one home: the clip lives in the 3D picture, the corners in Make a 3D picture's first step, Maison AI in the
  planner's own ⋮; shown only when it applies (the clip on Dollhouse only, the corners on a photo not "as it is on the Floor plan tab", the ⋮
  row ≤1024 only, "Furnish" only for a bare room); one filled button (Square it while placing; Next waits); defaults need no set-up.

## Files (the lane isn't a git tree — every file this package touched, against `lanes/B.base`)
New: `components/planner/photo/corner-editor.tsx` (+ `.module.css`), `design-source/verify/pending-modules/verify-pm2-s42d.cjs` + `pm2-s42d/*.png`,
`steps/reg-S42D.md`, this file.
Changed: `proxy.ts`, `app/credits/actions.ts`, `app/planner/actions.ts`, `app/tools/floor-plan/page.tsx` (comment), `components/company/plan/{billing,usage}-view.tsx`,
`components/credits/{plan-lock-dialog,plans-dialog,pro-locked-ghost,pro-tag}.tsx`, `components/dev/ai-bench/{corners-section.tsx,ai-bench.module.css}`,
`components/leads/ai-sheet.tsx`, `components/planner/editor/{elevation-panel,planner-editor}.tsx`, `components/planner/photo/{photo-dialog.tsx,straighten-photo.ts}`,
`components/planner/picture/picture-dialog.{tsx,module.css}`, `components/planner/scene/three-view.tsx` (comment), `components/templates/editor/template-locked.tsx`,
`components/visualizer/editor/stage.tsx`, `lib/credits/{ledger,model,pricing-data,queries}.ts`, `lib/maison-ai/answer.ts`, `lib/maison-ai/answers/{clients,money,work}.ts`,
`lib/planner/{elevation,photo,straighten-run}.ts`, `lib/projects/floor-plan-model.ts`, `lib/services/registry.ts`, `lib/templates/queries.ts`,
`lib/visualizer/spatial/{clip,extend}.ts`, `design-source/context/parity/30-pending-modules-build-2026-10-11/services.md` (one "3D"),
`design-source/verify/pending-modules/{verify-pm2-s05,verify-pm2-s15}.cjs`, `design-source/verify/ai-credits/verify-cr-r3.cjs`.
No migration, no schema change, no repair; `local.db` never written; :3170 stopped, the build lock released; `next-env.d.ts` put back as the
base had it.
