# Lane C1 — the held calls: Leads, the house pieces, the website, Qanvast Ops — the outcome (2026-10-24)

His word: "got it can you please fix all of it and commit and push to all the branches" — the calls that waited on him after Leads on the move and
the whole-app audit, each decided by the orchestrator (`calls-2026-10-24.md` › Lane C1, nine items). The audit's contract holds (`brief.md`): a
record with tabs stays one page with its strip (REG-2734); house pieces; 1440 byte-identical except where a call changes the desk on purpose.
Built in the lane's worktree of `06b9485f` (no WIP base), verified on production builds on :3211 over scratch copies of `rwd-calls/base.db`;
nothing committed by the lane. The staged register rows: `reg-c1.md` (REG-C1.1 … C1.10). The probe:
`design-source/verify/responsive-all/verify-rwd-c1.cjs` (registered as `rwd-c1` in `design-source/verify/regression/probes.cjs`). Banked shots:
`design-source/verify/responsive-all/rwd-c1/` (before | after pairs, and the opened states).

## 1. Ledger — the nine calls (and one bug found beside them)

| call | built where | what a person sees now |
| --- | --- | --- |
| **1 · B-06** the QUOTES card's steps ≤1024 | `components/leads/detail/quote-card.tsx` (the observer that measures the marks also decides `compact`: the six names' one-line widths, read off a hidden twin in the row's own type, against the row; ≤1024 only — the desk's markup never carries it) · `quote-card.module.css` (≤1024: `[data-compact]` draws the current name alone, `nowrap`, stepped left by `--shift` where it would pass the bar's end; the others keep their slots at 0 tall) | 390 · 768 (and 320, a sideways phone): one name — "Sent to Client", "Approved", "Signed" — whole, on one line, from its own mark ("Signed" ends at the bar's end); the marks at exactly the left edges they had (390: 46 · 133 · 183 · 250 · 304, before and after). A 1024 held sideways (528 card) and every desk width draw all six as before. Shots `b06-768-sent-to-client-before-after.png`, `b06-390-signed-before-after.png`. |
| **2 · Won's split** at every width (reverses REG-149's desk 0%) | `components/leads/move-stage/panels.tsx` (`uploadSplit` = the studio's usual at every width; `usual` / the summary words / Back to the usual split / Reset to default all read it) · `wizard.tsx` (reads it with the documents, `usualSplit` to `WonPanel`) · `app/leads/actions.ts` `fetchUsualSplit()` (what a new quote starts on — `fetchNewQuoteDefaults().split`, the "Default" payment template else — with the rows' own lines) · `lib/leads/stage-data.ts` (`zeroMilestones` retired) | **A desk change, on purpose:** at 1440 an uploaded signed quote's Payment milestone opens at 10 · 30 · 30 · 30 (100%, the amounts filled) where it opened at 0 · 0 · 0 · 0 and Save was refused. With the studio's default schedule at 20 · 40 · 40 the upload starts at Deposit 20 · Commencement 40 · Completion 40 (probed, put back). From System keeps the quote's own schedule (the one line). The phone's checklist reads "10 · 30 · 30 · 30 — the studio's usual" from the same rows. Shot `won-1440-upload-split-before-after.png`. |
| **3 · K-9** a phone held sideways is a phone | `components/leads/log/use-move-layout.ts` (`useOnTheMove` takes the sideways phone; new `usePhoneLayout` = ≤767 or `PHONE_SIDEWAYS`) · `move-stage/wizard.module.css` (the step screen out of a notch; the W6 centred-window rule retired) · `lead-form.tsx` + `.module.css` (the sheet, the grabber, the gutters, the short list on both queries; the fields keep the width's own rows) · `return/return-lead-wizard.tsx` + `.module.css` · `review-sheet.module.css` (the full-screen presentation on both; the toolbar wrap and the stacked merge table stay ≤767 — at 844 the table's frozen edges fit) · house: `components/om/sheet.tsx` (`useSheetFootLift`'s default query includes the sideways phone), `components/om/dialog.module.css` (the grabber draws there) | At 844 × 390: the Move stage window is the step screen (844 × 390, Save & move 48 at the foot); On Hold / Lost rise as the sheet; Create New Lead and Edit Lead rise as the bottom sheet (the short new lead with its fill rows; the short list); Return Lead the sheet; Review imported leads the whole screen. A tablet held sideways (1024 × 768) keeps the centred window with its rail. Shots `c1-move-step-sideways.png`, `c2-lead-form-sideways.png`, `c3-return-sideways.png`, `c4-review-sideways.png`, `c-844x390-on-hold.png`, `c-844x390-lead-edit.png`. |
| **4 · K-10** a lead's page sideways | `app/leads/[id]/overview.tsx` (`styles.leadPage` on the lead's own body) · `overview.module.css` (`PHONE_SIDEWAYS`: `.leadPage > header` relative, `.leadPage > .stickyTabs` at 0, `--detail-pinned: 48px`) · `components/leads/detail/quick-links.module.css` · `info-column.module.css` (read `--detail-pinned`, the desk's 8 + 72 + 44 as the fallback — identical where unset) | Scrolled at 844 × 390: the header has left (it sat 8–80), the strip is pinned 0–48 (it sat 80–128), the Create strip docks from 48; a tab in the pinned strip takes the tap. At rest, a tablet, the desk and a project's page (it composes `.body` / `.stickyTabs`, not `.leadPage`) are as they were. Shot `k10-844x390-scrolled-before-after.png`. |
| **5 · W2-06** a task card's lead | `components/leads/tasks/task-card.module.css` (`.forLink` 44 tall, 44 wide at least) · `components/leads/detail/tab-ghosts.tsx` (the ghost's line 44) | The lead's own line is 44 (it was 24); the card is 20 taller on /tasks; a tap 19 above the lead's words still opens the lead; the name and the due line keep their own taps (no box overlaps). Shot `w206-320-task-cards-before-after.png`. |
| **6 · W2-13** the Notes composer at 320 | `components/leads/notes/lead-notes.tsx` (the three tools in one group; a + with the house `PortalMenu` + `DropdownItem` — a sheet on a phone — whose list commands put the caret back where it was before running) · `lead-notes.module.css` (≤359 the + alone; 360–389 the three keep 44 with 4 between; ≥390 the drawn 16) | 320 · 359: one 44 + beside Save; its sheet "Lists and files": Bulleted list puts a list in the note being written, Attach file opens the attach window. 360 · 375: three 44s (they were 37 · 42); 390 unchanged. Shots `w213-320-composer-before-after.png`, `f-320-tools-sheet.png`. |
| **7 · K-11** Qanvast Ops › Reviews at ≤360 | the house header: `components/shell/page-header.module.css` (≤767 the title is `flex: 1 1 auto; nowrap` with an ellipsis — its own width decides whether the actions fit beside it; they take the next line where not, the header's existing rule) | 320: "Qanvast Ops" on one line, Request reviews under it (the header 92); 360 · 390: one row as before. Its ghost already wraps the same (held reveal: 92 · 92). Surveyed 27 L1 pages at 320 · 360 · 390: exactly three change — Reviews (320), Your profile (360: Discard · Save changes under the title, as at 320 already) and Floorplan to 3D Isometric (320: the Beta chip under a one-line title) — every other header is unchanged. Shot `k11-320-360-headers.png`, `g-320-reviews.png`. |
| **8 · K-12** the listing's tablet table at 1024 | `components/leads/table.tsx` (`TABLET_WIDTHS` name 173 · stage 114 · last contact 162 · next follow-up 178 · members 136) · `table.module.css` (the tablet's cells 8 inside, was 12) · the tablet ghost `components/shell/skeleton.tsx` + `.module.css` | At 1024 × 768 touch: Members ends where the frozen band starts (it ran to 913 under a band at 860); the table has nothing to scroll to (56 before). Measured on all 31 rows: the stage pill, the name and its "On hold · Till …" line, the last contact's day and time and every Members cell (two avatars, +n, the Assign glyph — W2-03's 120 inside) read whole, as before; Next follow-up's longest day-and-time still loses its "AM" (the visible words "Sat, 31 Oct ’26 · 10:00 …" are the same as before; 2px less is hidden). 768 upright: Name · Stage · Last contact still on the first screen. Shot `k12-1024-listing-before-after.png`. |
| **9 · W1-20** the website on a phone held sideways | `components/site/site-shell.tsx` (`useHeroPast`: has the first section of `main` scrolled up past the bar's band — the bar and the raised Demo — read on scroll, resize and each page) · `site-shell.module.css` (`PHONE_SIDEWAYS`: the bar tucked while `data-hero-past` is absent — from the server's first paint, so it never shows and slides away; a 667 × 375 phone held sideways too) | /site/try, /site/pricing, /site/platform/leads at rest: the bar waits below the screen (it sat 322–382 on "Take a photo", the pricing switch, "See pricing"); past the hero, once the scroll pauses, it is back; a page whose hero is shorter than the band (Story) shows it at once. An upright phone and the desk unchanged. Shot `w120-844x390-site-try-before-after.png`, `i2-site-try-past-hero.png`. |
| **found beside B-06** — the QUOTES card's tag | `quote-card.module.css` (≤1024: the amount row wraps; the text group never shrinks under its number · visibility unit) | 768 (Serena Koh): "OM-10007 · Shared" ran 2px under SENT TO CLIENT; the tag now takes the next line where the two can't stand side by side (elsewhere one row as before). REG-C1.10, a bug fix. |

## 2. ▲ For him to look at

1. **Won's split on the desk** (call 2) — the one deliberate 1440 change: the upload's split opens at the studio's usual instead of 0%.
2. **"The studio's usual" is read, not assumed** (call 2): it is the default payment schedule a new quote starts on (Settings › Quotes & pricing ›
   New quotes start with, else the "Default" payment template). The demo's is 10 · 30 · 30 · 30, so nothing reads differently today; a studio
   whose default is 30/70 will see its Won upload start at 30 · 70.
3. **The house header's one-line title** (call 7) reaches two pages beyond Reviews: Your profile at 360 (its two buttons go under the title,
   as they already did at 320) and **Floorplan to 3D Isometric at 320** (its Beta chip goes under a one-line title — the Floorplan session's page;
   none of its files were touched, the house rule did it).
4. **The composer's + is named "Lists and files"** (call 6) — invented copy, its tooltip, its label and its sheet's title; the rows reuse the
   three tools' own names.
5. **K-12's Next follow-up**: all five stand beside the frozen pair, but the column's longest day-and-time ("Mon, 19 Oct ’26 · 10:00 AM") was
   already cut before this round (18px) and still is (16px) — whole would need 16 more than a 1024 has beside Edit · ⋮. Showing it whole means
   a shorter date on the tablet (dropping the weekday) or a narrower frozen pair — both his.
6. **K-9's reach**: the lead form on a sideways phone is the phone's sheet wherever it opens — so a project's Edit details (the same form) takes it
   there too; the sheet lift (house) also lifts the snackbar over a menu sheet and the signing pages' sticky bar on a sideways phone (they already
   opened as the phone's there).

## 3. Shared pieces changed

- `components/om/sheet.tsx` — `useSheetFootLift`'s default query is now a phone held either way (`(max-width: 767px), PHONE_SIDEWAYS`). The
  callers that pass no query and can be open on a sideways phone now lift the snackbar there too: the house Sheet (PortalMenu's and the
  Dropdown's menu sheets, the log and On Hold / Lost sheets), the Move stage window's step screen and the signing pages' sticky bar; the Dialog's
  and the Drawer's sheets are ≤767 by their own flag, so nothing changes for them. No prop changed.
- `components/om/dialog.module.css` — the house grabber's rule moved into its own block that also reads `PHONE_SIDEWAYS` (it is drawn only where a
  surface's code renders it — its phone sheet).
- `components/shell/page-header.module.css` — the L1 title's phone rule (call 7).
- `components/shell/skeleton.tsx` + `.module.css` — the tablet listing ghost's columns and cell padding (call 8).
- `components/leads/log/use-move-layout.ts` — `useOnTheMove` + the new `usePhoneLayout` (lead form, Return Lead).
- `app/leads/[id]/overview.module.css` — `.leadPage` (lead-only; the composing pages are untouched) and `--detail-pinned`, read by
  `quick-links.module.css` and `info-column.module.css` with the old value as the fallback.

- Probes: new `design-source/verify/responsive-all/verify-rwd-c1.cjs` and its line in `design-source/verify/regression/probes.cjs`; one
  assertion of `verify-rwd-w6.cjs` brought to K-9 (§7).

## 4. For other lanes

- **C2 (Projects)** — a project's page on a phone held sideways keeps its pinned header (K-10 was the lead's). The same two lines would do it:
  add `${styles.leadPage}`'s twin to the project body, or compose `.leadPage` in `components/projects/project-frame.module.css` (its `.body`
  already composes the lead's), and set `--detail-pinned: 48px` there. Left for the orchestrator's call — REG-2734 names leads and projects alike.
- **Floorplan session** — its header at 320 changes through the house rule (call 7; §2.3); nothing of theirs was edited.

## 5. The 1440 comparison

The base build (`06b9485f` as committed, built from a clean archive) and the lane's final build, each on its own fresh copy of `rwd-calls/base.db`,
captured in the same order at 1440 × 1024 with a mouse (`scratchpad/rwd-calls/C1/x/cap1440.cjs`, `diff.cjs` — every RGB byte): **41 of 43
identical** — 33 pages full length (the listing, kanban, imports, /tasks; Olivia's, Serena's, Kevin's and Arjun's Overviews; every Kevin tab;
Olivia's Notes; a project's Overview and Tasks; Qanvast Ops · Reviews · Lead credits · Studios; the website's home, Try it, Pricing, a platform
page, Story; the Dashboard, Projects, Your profile, Company › Members, Meetings) and 10 opened states (Won from the system, Won uploaded and its
split, Create New Lead, Edit Lead, Appeal the return, Review imported leads, the Met step, On Hold, the Notes pane). **The two that differ are the
Won upload's split — the deliberate desk change (call 2):** 0 · 0 · 0 · 0 and "0%" before, 10 · 30 · 30 · 30 and "100%" with the amounts after.

## 6. Verification and tallies

- **The probe** `verify-rwd-c1.cjs` (A–J, real taps / clicks, each call's rule; puts back the default template's schedule and any composer draft):
  **148 / 148** on the final build (in the harness); on the base build it fails on every call — 80 / 126 there (B-06's names, Won's 0%, no step
  screen, the pinned header, the 24 link and its missed tap, the composer, the two-line title and its ghost, the 56 under the band, the bar
  over the hero).
- `npx tsc --noEmit -p .` clean · `npx eslint app components lib` = the three known quote-editor errors (0 new) · `npm run design:lint` holds
  (every count at its baseline) · the production build green.
- Widths looked at: 320 · 359 · 360 · 375 · 390 · 768 upright · 1024 sideways (touch) · 844 × 390 · 1280 · 1440; no touched page scrolls
  sideways at 320 or 844 × 390 (probed).

## 7. The regression

The harness (`design-source/verify/regression/run.cjs` on :3211, each probe on its own copy of a `base.db` copied from `rwd-calls/base.db`):

- **Run 1** (RUN_DIR `scratchpad/rwd-calls/C1/reg`, 35 probes): **33 clean** — rwd-c1 145 · rl-fixes 22 · rl-l2 84 · rl-l3 102 · rl-l4 97 ·
  rwd-w1 59 · pm2-s05 114 · ke 31 · overlays 67 · ghosts-same 76 · ghosts-same-390 76 · kb-r1 35 · kb-r2 29 · search 27 · pm2-s35 137 ·
  ux-p1 81 · ux-p2 73 · ux-p3 91 · dane-p1 47 · p2a 54 · p2b 56 · p3 70 · p4 37 · p5a 59 · p5b 56 · p6 41 · pj-r1 98 (drives the Won upload) ·
  pm2-s17 130 (the ghosts at 390 / 1440) · pm2-s01 80 (Your profile) · fp3d 91 (the Floorplan page, whose header the house rule reaches) ·
  rwd-w3 57 · rwd-w4 38 · rwd-w5 74 (the signing pages the sheet lift reaches). Two found something:
  - **rwd-w2 77 / 78** — W2-03's rule (every tablet Members cell holds its avatars, +n and Assign) at 768: my first Members width (134) was 2px
    short of the cell's 120 inside. **Fixed:** Members 136, Next follow-up 178 (the sum unchanged); the C1 probe now asserts the same at 768
    and 1024.
  - **rwd-w6 67 / 68** — it asserted W6's sideways Create New Lead (a centred card, 8 above and below), which K-9 deliberately replaces with the
    phone's bottom sheet. **Assertion updated**, commented `(held calls 2026-10-24, a deliberate change of this rule)`: the sheet on the
    screen's foot, its head on screen.
- **Run 2** (the final build, RUN_DIR `reg2`): **rwd-c1 148 / 148 · rwd-w2 78 / 78 · rwd-w6 68 / 68 · rl-l3 102 / 102 · rwd-w1 59 / 59 ·
  pm2-s35 137 / 137.**
- **Not registered in `probes.cjs`, run directly** on the final build (each on a fresh copy, `next start` on :3211): pm2-s07 89 / 89 and
  pm2-s28 97 / 97 — both drive the Won upload and press Reset to default, which now lands on the studio's usual (no probe asserted REG-149's
  0% itself, so no assertion needed the held-calls comment for it).
- 1440, the final build against the base (§5): 41 / 43 identical, the two Won upload states the deliberate change.

## 8. Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins** — no mocked size or word changed at the desk but Won's split, which his call changes and the row says; the one new word is
   flagged (§2.4).
2. **One system** — house pieces only: `PortalMenu` + `DropdownItem` for the +, the house Sheet / Dialog presentations, the house header's own
   wrap rule, the listing's table model and its ghost; no copied stylesheet, no hand-rolled head, foot or menu.
3. **Plain words** — "Lists and files"; the Won checklist's words now read the studio's own split.
4. **Nothing is lost** — every step stays on the bar (only its name folds), every tool stays in the composer (behind one +), every column stays in
   the table.
5. **Say why** — no refusal changed; the upload's Save is no longer refused for a split nobody had typed.
6. **Back returns where you came from** — the task card's lead keeps `?from=/tasks` (probed).
7. **Every screen is whole** — the ghosts follow: the task card's 44 line, the tablet listing's columns, the Reviews header's wrap (probed).
8. **Every width is designed** — a phone held sideways is a phone (K-9, K-10, W1-20); 1440 byte-identical bar the one deliberate change.
9. **Tables follow the leads listing** — the tablet table keeps its frozen pair and selection; its floors are its content's.
10. **Motion with purpose** — the website's bar never shows and slides away at rest; the sheets keep their house motion.
11. **Honest data** — "the studio's usual" is read from the studio's own schedule, not a constant; the probe puts back what it writes.
12. **Reach for everyone** — 44 for the task card's lead and each composer tool; the steps' other names stay readable to a screen reader.
