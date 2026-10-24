# Leads on the move — L1's outcome (P-01 · P-02 frame · P-07 · P-13 on its screens · Q-01 · Q-04 · Q-06 · Q-07), 2026-10-23

His marks on https://claude.ai/artifact/Az4YWRVEPWoMe8PwsPn3gh — Build on all thirteen proposals and the eleven fixes, the recommended answer on
every question — then "continue the leads". L1 built the Lead screen, a tab as its own screen, the landscape panes and the prompt after a call,
in its worktree from `f85e0e94`; nothing committed. Staged register rows: `reg-l1.md` (13 rows). Probe: `design-source/verify/responsive-leads/
verify-rl-l1.cjs` (+ the pure `rl-l1-pure.mts`).

## 1 · Ledger

| id | call | where / why |
| --- | --- | --- |
| **P-01** the Lead screen | **built** | `components/leads/screen/lead-screen.tsx` (+ `.module.css`, composing the Quote screen's Next line and avatar — never copied): the 56 bar (← where the lead was opened from · the name once over "Contacted · 4 days" · ⋮), the hero (stage chip in its colour · property · budget · source · the site's address with Directions · the number grouped with **Call** and **WhatsApp** as 44 buttons · the members with Assign when none · **Client details**), one Next line, the Maison AI brief as one line, Due now, a row per tab, the sticky foot. Mounted by `app/leads/[id]/overview.tsx` at ≤1024 upright (`useMediaQuery(TABLET_DOWN)` and not `TABLET_LANDSCAPE`); every press is the page's own handler — the screen only draws. |
| **Next line** (`lib/leads/next-step.ts`) | **built** | pure, client-safe, 44 tests in `rl-l1-pure.mts`: `leadNextStep` (every stage, the brief's words; red when the follow-up / the hold's day has passed; a parked lead's reason one tap further), `leadPrimary` (Q-07 + Assign first), `dueNow` / `dueLine`, the rows' lines (`tasksLine` · `contactLine` · `quoteLine` · `questionsLine` · `stagesLine` · `meetingLine`), `daysAgo` / `dayWhen` ("4 days ago", "Thu · 10:00 AM" — never "4d"). |
| **Due now** | **built** | at most three overdue / due-today tasks, a 44 ring completes with Undo (`setTasksDone` / `undoTasksDone`, the Tasks tab's "Task completed" / "Task reopened"); the row opens the task in the Tasks tab's own panel over the screen (`OverviewTaskPanel`, Dane's UAT 5.05); "n more in Tasks ›"; none on a lead whose tasks are its project's. A refused write puts the ring back. |
| **rows** (P-02, the Lead screen's half) | **built** | Stages (dots · days in pipeline · the first response leg → today's LEAD STAGES card in a sheet) then Tasks · Notes & Logs · Files (**Take a photo** — `capture="environment"`, into the lead's Files through the lead's one upload) · Quotes · Contracts · Meetings · Questionnaire · Activity, the brief's order; an empty one is one line with its one action (B-19); only the rows the member may open (Marketing: no Quotes · Contracts · Meetings); a lead on its project keeps the desk strip's own three. Read from `lib/leads/screen-facts.ts` (new, server-only: quotes count + the latest's stamps, contracts, meetings, notes — after the frame's visibility gate). |
| **P-02** a tab as its own screen (the frame) | **built** | `components/leads/screen/tab-screen.tsx` — the 56 bar (← to the lead, its `?from=` kept · the tab's name over the lead's · a trailing slot `TabScreenActions` for L4) + the tab's body in the desk's own `.centre[data-tab]` box. No strip, no stage row (Q-04). The address stays the tab's. |
| **Q-04** no stage row on a phone's tab screens | **built** | as recommended: dropped on a phone **and a tablet held upright** (Q-01 makes upright the phone); a tablet held sideways carries the move in its bar on every tab; the desk keeps REG-370's pair. |
| **P-07** 1024 landscape | **built** | `components/leads/screen/lead-panes.tsx`: one bar (← · name over stage · Log ▾ · the move · ⋮), the left pane 340 = the Lead screen's `LeadSummary` (sticky, scrolls itself), the right = the open tab, or the Overview's cards when none is open; the open tab's row marked; no Create strip on touch. |
| **Q-01** upright tablet = the phone | **built** | 768–1024 portrait gets the Lead screen and the tab screens (the column caps at 672, centred; the foot's plate runs the width). |
| **Q-06** the prompt after a call | **built** | `components/leads/screen/use-call-memory.ts`: a Call / WhatsApp press is remembered per lead per browser tab (sessionStorage, two hours); once the page has been away (`visibilitychange` hidden → visible, or a reload after a dropped tab) one line sits in the foot above Log ▾ — "Log the call with Farah · Log · ✕" ("Log the WhatsApp chat with …"); ✕ forgets it; Log opens the log through the seam; never a sheet that opens by itself. |
| **Q-07** the filled button is the next move | **built** | Move to {next} · Convert to Project · Resume at {X} · Open project (· Make the project again, locked for a Designer); **Assign** on an active lead nobody owns, Move to Contacted once someone is (REG-2655's prerequisite); Log ▾ beside it (outlined: Call · WhatsApp · Site visit · Note). Stage ▾ is ⋮ › Move to…. |
| **P-13** the scale on L1's screens | **built** | the screens' own stylesheets: 16 read · 14 secondary · 44 targets · 48 foot · 16 gutters · 12 inside cards; the lead cards drawn on these surfaces (the Stages sheet, the brief sheet, Client details, the landscape right pane, the returned card) take 16 / 14 inside `[data-om-move]` only — the desk, the project page and the Dashboard that reuse them are unchanged. |
| B-03 Call / WhatsApp the smallest targets | built (P-01) | 44 outlined buttons in the hero, 12 apart; REG-365's desk rhythm untouched. |
| B-04 the primary scrolls away | built (P-01) | the sticky 48 foot. |
| B-06 QUOTES' step labels broken in words | built (P-01) | the quote is a row with its number · status · amount on the Lead screen; in the landscape right pane the card's labels are 14 and never break inside a word (`word-break: keep-all` inside `data-om-move`). |
| B-07 the tablet desk squeezed | built (P-07 · Q-01) | upright = the screen, sideways = the panes. |
| B-08 the Create strip's glyphs | built (P-07) | no strip at ≤1024 on these screens; Create is ⋮'s first group (the quick links' own rows, labelled). |
| B-16 locked stages say why only after a tap | built | the Next line and the foot offer Assign on an unowned lead; the Stages sheet says the owner rule **once** under the stages with **Assign** beside it (`LeadStagesCard onAssign`, the desk card unchanged) and every other locked row keeps its reason in the row at 14. The stage *menu*'s rows are L3's (A-lane). |
| B-17 the name twice | built (P-01) | the name is the bar's alone; the hero's client row is the avatar and the number. |
| B-18 the brief 43% of the first screen | built (P-01) | one 44 line "✦ Maison AI · {the brief's tag} ›"; its press opens the brief in full in a sheet (its own eyebrow gives way to the sheet's title, the tag at 12, Show more 44); a button that runs closes the sheet first. |
| B-19 empty cards a quarter of the page | built (P-01) | an empty tab is one row with its one action. |
| B-20 nine tabs in a strip | built (P-02) | the rows. |
| B-24 "Resume at Contacted" clipped at 320 | built | the foot: at ≤360 Log ▾ keeps its glyph (its word stays for a screen reader) and the move keeps its whole words — measured whole at 320. |
| B-25 Assign stacked on Client Info | built | Assign from the hero's members row, the foot, the Stages sheet; from Client details it takes the sheet's place. |
| B-26 the FAB on a LEAD STAGES row | built | one rule (REG-L1.11): on a lead's screens on the move the Maison AI button rests out of sight until the page sits at its end (`body[data-om-fab-end]`), then sits above the foot (`raised` + the foot's `--bottom-dock`) — measured on no control at the page's end. |
| C-27 241px of chrome on every tab | built (P-02) | one 56 bar. |
| C-08 (with L4) the FAB on a tab row's control | L1's half built | the same rule on the tab screens and the panes: never back over a card mid-list (the phone's "back on the way up" is off there), only at the page's end — L4's hand-off at landing ("the rest is your frame's rule"). L4 keeps it inside its own quick-add / composer / meeting-foot bars. |
| the landing's FAB item (orchestrator) | built | the same one rule on any touch tablet (768–1024, a finger): the button no longer rests over a table row's frozen ⋮ (Leads · Quotes · Contracts tablet tables) — out of sight until the page's end. Measured at 768 upright and 1024 sideways on `/leads`, `/quotes`, `/contracts`; a mouse keeps the desk's button. |
| the landing's hand-offs from L4 | built | (2) no quick-links strip at 768 upright — the lead's pages there are the Lead screen and its tab screens (Create is ⋮'s first group), asserted on a tab screen; (3) the house card head's link — the meeting brief's "Edit" — reads at 14 on a phone and a touch tablet (REG-L1.14). |

Not done, why: nothing assigned to L1 is left. Two notes — the parity-round probes `parity-r1…r7` named in the brief are not in the repo
(only their shots are banked under `design-source/verify/parity-r*/`), so they could not be run; Client details' Edit, the stage menu's rows and
the Assign sheet are L3's pieces, opened from here as they are.

## 2 · Decisions taken (as recommended; ▲ for him)

1. ▲ **One rule for where the Maison AI button rests: on a touch tablet, and on a lead's screens on the move (≤1024), it shows only when the
   page sits at its end** (or doesn't scroll), where the page's bottom clearance keeps it off the rows; there it sits above the Lead screen's
   foot. It never rests on a row's control (B-26 · C-08 · the tablet tables' frozen ⋮). The cost: Maison AI is a scroll to the end away on those
   screens — on the Lead screen its own line under Next is the first screen's door. The phone elsewhere keeps its tuck; the desk and a mouse at
   768–1024 off a lead's screens keep the mock's button. The orchestrator asked for one rule for both the tablet item and C-08: this is it.
2. ▲ **Client details** — a hero row the brief does not name — keeps every section the desk's info column has (Collaborators · Lead info with
   NRIC's Show, Customer ID and the Portal · Property info · Other info · Custom fields · the Team chat · the number and the email with Copy) and
   **Edit details** at its foot. "Nothing a desktop can do is lost; it is one tap further." The phone's old "View Client Info" sheet showed a
   subset; this is the desk's set.
3. ▲ **The bar's subtitle carries the days in stage; the hero's chip carries the stage alone** (the drawn screen 2) — the brief also says
   "the stage chip with its days"; one place for the days keeps the first screen from saying it twice (B-17's spirit).
4. **The hero's address is the site** (`propertyAddress`, else the client's own): the demo's leads keep the client's address empty and the
   site filled; Directions goes where the designer drives to.
5. **Log ▾'s Visit reads "Site visit"**; wave 1's paths: Note → Notes › New › Note; on a New lead any contact → the Move stage window at
   Contacted (the owner rule first — an unowned lead refuses with Assign, nothing typed and lost); a site visit on a Contacted lead → the Met
   step; else Notes › New › Contact Log. L2 replaces these with its sheet (§5).
6. **Assign is the filled button on any active lead nobody owns** (not only New): past New the move refuses the same way; a parked lead keeps
   Resume (its confirm says the rule).
7. **The rows' order is the brief's** (Tasks · Notes & Logs · Files · Quotes · Contracts · Meetings · Questionnaire · Activity), Stages first —
   REG-377's canvas put LEAD STAGES right under the identity.
8. **A Won lead on its project keeps the desk strip's rows** — Stages · Quotes · Contracts (one-home N-10); its other tabs are the project's,
   and Open project is the filled button. No Due now (the tasks are the project's).
9. **The quote's line is the latest live quote** (number · status · amount); the Next line on Quote Sent reads its client stamps (sent ·
   opened n times).
10. **The Stages row's line takes the response time's first leg** ("Assigned in 30m"); the full line is in the sheet's card.
11. **On a tablet held sideways the left pane keeps Due now** while the right shows MY TASKS — the left pane is the person, constant across
    the tabs; P-07 says the right holds the Overview's cards.
12. **The screen is chosen by the render** (the server answers the desk's): a phone's first paint is the ghost (`PageReveal`), then the screen;
    the ghosts themselves are chosen by the stylesheet (a `loading.tsx` streams before any script).

## 3 · Shared pieces changed

- `components/shell/maison-fab.tsx` + `maison-fab.module.css` — the one rule for where the button rests (REG-L1.11): `useTuckOnScroll` keeps the
  phone's tuck and adds "at the end only" on a touch tablet and while a page sets `body[data-om-fab-end]` (only a lead's screens on the move do,
  `components/leads/screen/use-fab-at-end.ts`); the stylesheet slides the tucked button away on a touch tablet and under the flag. The desk (≥1025)
  is untouched (the hook disables itself there), measured byte-identical.
- `components/leads/detail/card.module.css` — the house card head's link at 14 on a phone and a touch tablet (REG-L1.14; Projects, the
  Dashboard, Hangouts and Company › Client portal use the card too).
- `components/shell/detail-skeleton.tsx` — `OverviewGhost` exported (one word) for the landscape pane's ghost.
- `components/shell/detail-tab-skeleton.tsx` (L1's) — draws `LeadGhost` (desk · screen · panes by the stylesheet).
- `components/leads/detail/info-column.tsx` — the sections are one `sections` value the desk column draws as before (byte-identical at 1440 on
  the lead and the project pages) and `as="details"` draws alone; `stages-card.tsx` — an optional `onAssign` (the desk passes none).
- The lead cards' modules (`card` · `stages-card` · `my-work-card` · `quote-card` · `questionnaire-card` · `files-card` · `activity-card` ·
  `returned-card` · `ai-brief` · `info-column`) — a P-13 block scoped to `:global([data-om-move])`; nothing else matches it.
- `design-source/verify/regression/probes.cjs` — `rl-l1` and `ke` added.
- Probe assertions changed for a deliberate change, each commented "(leads on the move, a deliberate change of this rule)":
  `responsive-leads/verify-rl-fixes.cjs` (390: the unowned lead's filled button is Assign; the refusal through Log ▾ › Call) ·
  `ux-build-2026-09-30/P1/verify-p1.cjs` (the phone's and the upright tablet's "Move to Met" is the Lead screen's foot; the loader's visible ghost
  is the width's) · `uat-dane-2026-10-01/P5a/verify-p5a.cjs` (a phone opens the task from Due now) · `P5b/verify-p5b.cjs` (a phone's LEAD STAGES
  card opens from the Stages row) · `responsive-quotes/verify-rq-k4.cjs` (no strip on a touch tablet's lead pages; sideways the Quotes tab is the
  right pane and its table fills it). `ux-build-2026-09-30/P3/verify-p3.cjs`'s `sqlite3` now waits for the server's lock (`-cmd .timeout 30000`,
  the harness's own rule, which its patch could not reach) — it failed on "database is locked" twice with the lead page's extra reads.

## 4 · For other packages

- **L2 (the log sheet):** the seam is `components/leads/screen/lead-log.tsx`. Set `LOG_SHEET = true` and draw the sheet in `LeadLog({ ask,
  onClose, ctx })`: the page (`overview.tsx`) then hands every Log press to it as `ask = { channel: 'Call' | 'WhatsApp' | 'Visit' | 'Note', via:
  'menu' | 'prompt', n }` (n changes per press) and clears it with `onClose`. `ctx` = `{ lead, team, stageMovement, role, today(channel) — wave
  1's paths, openStep(stage) — the page's Move stage window with its owner rule first, refresh() }`. It is mounted once, on the Lead screen and
  the landscape panes. The foot writes `--bottom-dock`, so a snackbar raised from the sheet rests above the foot; the prompt's Log passes
  `via: 'prompt'` with the channel of the press.
- **L4 (the tabs' bodies):** inside a tab screen (≤1024 upright) the body renders in the desk's `.centre[data-tab]` box under a 56 bar that says
  the tab's name. Wrap the tab's + and ⋮ in `<TabScreenActions>` (`components/leads/screen/tab-screen.tsx`) to draw them in that bar; it renders
  them in place everywhere else. `useTabScreen()` is non-null inside one — the body can drop its own "All Tasks" title there. On a tab screen the
  FAB shows only at the page's end (REG-L1.11 — never over a card mid-list, C-08); keep the bodies' bottom `--fab-clearance` so it lands clear
  there, and L4's own bars keep it inside them as L4 built. `tab-ghosts.tsx` is drawn inside the tab screen's ghost.
- **L3 (the listing, the form, the stage menu):** the Lead screen opens Edit details (`?edit=1` too), the Assign sheet and the stage menu as they
  are — L3's changes to those land here unchanged. A new lead opens on its Lead screen with no extra work.
- **The orchestrator:** CLAUDE.md's Map wants a "Leads on the move" entry (the screen files above, `lib/leads/next-step.ts`,
  `lib/leads/screen-facts.ts`, the seam); `reg-l1.md` numbers from REG-2657.

## 5 · What to check in the browser

(Dane = Owner · Hui Min = Admin · Germaine = Designer; View as in the studio block.)
- **390:** Farah (Contacted, overdue follow-up — the red Next line, Due now, the ring and its Undo, the rows); Olivia (nobody assigned — Assign is
  the button; Log ▾ › Call refuses with Assign; assign Sarah → Move to Contacted); Mei Ling (On Hold — "Follow up on 5 Nov ’26.", Resume at
  Contacted); Muthu (Lost); Benjamin (Won — Open project, three rows); press Call, switch app, come back → the prompt; ⋮ (Create first); the
  brief, Stages and Client details sheets; a row → its tab screen → ←.
- **768 upright:** the same screen centred; a tab screen. **1024 sideways:** the two panes; a row → the tab on the right; Log ▾ / the move in
  the bar. **1440:** the desk as it was. **320:** Mei Ling's "Resume at Contacted" whole.
- Germaine: no Delete in ⋮. Hui Min: as Dane.

## 6 · Probes and tallies

All on the production build (`next build` under the shared lock, `next start -p 3191`), each on a fresh copy of the base demo DB through the
regression harness (`RUN_DIR` with `base.db` from the lane's pristine copy — never `prepare.cjs`, which copies the owner's live `local.db`):

- **`responsive-leads/verify-rl-l1.cjs` — 162 passed, 0 failed** (44 pure in `rl-l1-pure.mts`; real taps at 390 · 768 · 1024 touch, clicks at
  1440; 320; the loader's ghost at 390 and 1024; the FAB at 768 / 1024 on /leads · /quotes · /contracts; everything written put back; no page
  errors). Registered as `rl-l1` in `regression/probes.cjs` (and `ke`, which the brief names).
- The Leads set: `rl-fixes` 22/0 · `pm2-s05` 114/0 · `ux-p1` 81/0 · `ux-p2` 73/0 · `ux-p3` 90/1 · `dane-p1` 47/0 · `dane-p2a` 54/0 · `dane-p2b`
  56/0 · `dane-p3` 70/0 · `dane-p5a` 59/0 · `dane-p5b` 56/0 · `ke` 31/0 · `view-as` 23/0 · `kb-r1` 35/0 · `kb-r2` 29/0 · `search` 27/0 ·
  `overlays` 67/0 · `ghosts-same` 76/0 · `ghosts-same-390` 76/0.
- The on-the-move set: `rq-k1` 116/0 · `rq-k2` 98/0 · `rq-k3` 90/0 · `rq-k4` 143/0 · `rq-k5` 79/0 · `rc-c1` 176/0 · `rc-c2` 90/0 · `rc-c3`
  110/0 · `rc-c4` 144/0.
- **`ux-p3`'s one ✗ is not L1's**: "the /tasks loader draws the three to-do chips … where the page draws them" (ghost widths 137 · 149 · 167 vs
  the page's 144 · 146 · 167) fails identically on the untouched tree (`f85e0e94`, built separately and run the same way) — the rail's Tasks
  ghost, L4's area.
- Not runnable: `parity-r1…r7` (their probe scripts are not banked in the repo, only shots).
- Ghosts: `ghosts-same-390` first found the Notes tab's reveal 4px off its loader (the held ghost's box is the page's height and shrank the
  bar); the screens' bars and foot are `flex-shrink: 0` now — 0.00% on every lead route at 390 and 1440.
- `npx tsc --noEmit -p .` clean · `npx eslint app components lib` = the three pre-existing errors in `components/quotes/editor/quote-editor.tsx`
  only · `npm run design:lint` at its baseline (no rule raised).
- Shots: `…/scratchpad/rl-build/L1/shots/final/` (the probe's, 390 · 768 · 1024 · 320) and `…/L1/shots/fab-tablet/`.

## 7 · The 1440 comparison

A pixel diff (`sharp`, raw RGBA) of full-page shots with a mouse, transitions off, each side on a fresh pristine DB — **every page
byte-identical**:
- 1440 — the lead Overview of Olivia (New) · Farah (Contacted, and from the listing) · Gerald (Met) · Vivien (Quote Sent) · Mei Ling (On Hold) ·
  Muthu (Lost) · Benjamin (Won, on its project) · Kelvin; Farah's eight tabs (Tasks · Quotes · Contracts · Files · Notes & Logs · Meetings ·
  Questionnaire · Activity); Benjamin's Quotes — 18 / 18 (before = `f85e0e94`'s build in this worktree, after = the final build).
- 1440 and 1025 — the project pages P-2026-001 · 002 · 004 · P-2025-001 (the lead's info column and cards are theirs), the Dashboard (the lead's
  cards), Farah's lead — 12 / 12 (before = the untouched tree built separately).

## 8 · Principles check

1. **The mock wins, every exception written down** — the drawn screens 2 and the tablet frame are the shape; every word and piece the mock never
   drew is in `reg-l1.md` with its invented copy named; ▲ decisions above.
2. **One system** — the Quote screen's `ScreenBar`, its Next line and avatar (composed), the house `Dropdown` / `Sheet` / `Dialog`, `IconButton`,
   DS `Button`, the Assign sheet, the stage menu, the task panel, the lead's own cards; tokens only (`npm run design:lint` holds at its baseline).
3. **Plain words** — "Call or WhatsApp Farah — new 2 days ago.", "4 days ago" never "4d", "Log the call with Farah"; refusals keep the stage
   rule's own words ("Assign a member first") with Assign as the way on.
4. **Nothing is lost** — Due now's ring has Undo; a refused completion puts the ring back; Client details keeps every desk section; the first
   contact on an unowned lead refuses before a log can be typed; ✕ on the prompt only forgets a reminder.
5. **Say why** — the locked stage rows keep their reason in the row; the owner rule said once with Assign; a late follow-up reads red with
   "overdue"; a parked lead's reason one tap further.
6. **Back returns where you came from** — the Lead screen's ← is `?from=`'s (REG-465), a tab's ← is the lead (its origin kept), the landscape
   bar's ← likewise; the addresses stay the tabs'.
7. **Every screen is whole** — the shell's FAB, snackbar, ghost (the screen's own, REG-708), tooltips; every page error log empty in the probe.
8. **Every width is designed** — 320 · 390 · 768 upright · 1024 sideways · 1025 · 1440 each checked; the desk byte-identical; no sideways scroll.
9. **Tables follow the leads listing** — no new table; the tabs keep theirs (L4).
10. **Motion with purpose** — the house sheets' and the FAB's own motion; the Stages row's pulse is the house attention pulse.
11. **Honest data** — every line is the lead's records (`fetchLeadDetail` + `lib/leads/screen-facts.ts`, read after the visibility gate);
    Marketing never reads a quote, contract or meeting there; nothing seeded.
12. **Reach for everyone** — 44 targets measured with `elementFromPoint`, 16 / 14 type, `aria-current` on the open row, `aria-label`s on the
    glyph buttons, Log's word kept for a screen reader at 320, `data-kb` on ← and the members row.
