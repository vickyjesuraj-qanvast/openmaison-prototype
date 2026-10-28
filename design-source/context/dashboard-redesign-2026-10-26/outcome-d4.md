# Lane D4 — Maison AI, docked: the outcome (2026-10-26)

His words for this part: *"the card that we have for Maison AI can be more sticky, like how your Claude chat input is"* and *"1.0 had some good
interactive components in chat and under it"*; his marks P-01 · P-10 · P-12 · Q-01 a · Q-02 a · Q-03 a · Q-09 a · Q-12 a, and his note on the
buttons (brief § 2). Staged register rows: `reg-d4.md` (REG-D4.1…22). Probe: `design-source/verify/dashboard-2026-10-26/verify-dash-d4.cjs`
(`dash-d4` in `design-source/verify/regression/probes.cjs`).

## 1 · Each brief item

| Brief item (§ 5 D4) | Built where | Notes |
|---|---|---|
| `MaisonDock` — the field at the content's foot (§ 3) | `components/maison-ai/dock/maison-dock.tsx` (+ `dock-composer.tsx`, `dock-entry.tsx`, `dock-store.ts`, `maison-dock.module.css`) | A sticky band that is the body's last child: it keeps its own height at the page's end (the last card never ends under it), the cards scroll under its 32px fade, 760 wide at a desk centred on the content, 640 on a touch tablet held sideways, 16 gutters upright. Measured: centred within 2px, 16px off the foot, the last card above the band at the end. |
| Three suggestions by rule (Q-03) | `lib/dashboard/dock.ts` `dockChips` · `lib/dashboard/dock-queries.ts` `fetchDock` · `lib/maison-ai/remind.ts` | A meeting later today → "Prepare me for 8:30 PM with Rahul" (the studio's clock) · the quote / VO that waits longest on its client and that this member may remind (sent and unanswered — opened twice or 3+ days —, valid, not reminded in 2 days; `worksOn`; Mine = own leads) → "Remind Ryan about VO-2" · the books → "How is cash this month?" · then the role's reach (Owner/Admin · Manager · Designer · Accounting · Marketing). The design system's action chips. They change as you act (a reminder kept takes its quote out for two days). |
| Every chip answered well by `answer.ts` (extend the intents) | `lib/maison-ai/intents.ts` (new `cash` · `remind_client` · `compare_lead`; `next_meeting` reads "prepare me"), `lib/maison-ai/answer.ts` (routes, `about`, gates), `lib/maison-ai/answers/dock.ts` (new), `answers/meetings.ts`, `answers/work.ts` | The probe asks every suggestion and every card's question for Dane, Hui Min, James, Michelle, Priya and Nurul — none answers "I can’t answer that yet", "Couldn’t look that up" or "Not for …". |
| The context chip from a card's Ask (`askAbout`, `DockContext`) | `askAbout(card, question?)` + the house button **`DockAsk`** in `maison-dock.tsx`; contexts `dockContexts` in `lib/dashboard/dock.ts`; `ABOUT_WORDS` read by `answerQuestion({ about })` | The card joins the field as a removable chip (primary-variant tint), the field takes the caret (desk) or the Sheet opens with it (≤1023), its questions replace the three — and stay while the answers are out; a question that reads as nothing on its own is read in the card's words. Verified with a temporary `DockAsk` in the Needs you placeholder (reverted). |
| Short answers above the field (a thread of the last three, Stop / Retry, Esc folds) | `maison-dock.tsx` thread + `dock-entry.tsx` | Above the field at its width over a wash the column's width (the drawn "Ask, act" frame); head "Maison AI · Answers from your records" · Clear · Hide (Esc). Esc, a press elsewhere or on the wash folds it; a click or focus in the field brings it back; the page never moves (scrollY asserted). Stop = the send's place while reading, the late answer held back; Retry. The reading line only past 0.5 s. |
| Long answers and every proposal in the Drawer (desk) / Sheet (≤1023 upright, phone) | `maison-dock.tsx` (the house `Drawer` 400 · the house `Sheet`), `isShortAnswer` in `lib/dashboard/dock.ts` | Long = a proposal, more than four rows, a timeline, words past ~280 characters. The field re-centres on what the pane leaves (`.dock[data-pane]`); the thread keeps a line "Opened beside the page · Open". The newest long answer takes the pane. |
| ⌘J / Ctrl J (Q-09, the registry + the ? panel; elsewhere the FAB sheet's Ask) | `lib/keys/registry.ts` (`maison`), `components/shell/shortcuts/dom.ts` (listed under Everywhere where Maison AI is on the page), `components/shell/maison-fab.tsx` `useAskKey`, the dock's own listener | Every editor's own button answers it too (one listener per button). The button's tooltip shows ⌘J. |
| `askMaisonAi` on the Dashboard goes to the dock | `components/shell/maison-ai.tsx` (ignores asks while docked) · `maison-dock.tsx` (`useMaisonAsk`) | Verified with a temporary trigger (reverted): at a desk the question lands in the thread, on a phone the Sheet opens with it answered. |
| The FAB steps aside on `/dashboard` at every width (Q-02) | `components/shell/maison-ai.tsx` + `lib/maison-ai.ts` `useDockPresence` / `useMaisonDocked` | From the first paint (the address) and while the dock is mounted. `--fab-clearance` and the snackbar: the snackbar rests above the band (`--bottom-dock`, the band's height; 58 on a phone while the accessory is out). |
| The phone accessory and its ✦ (the Dashboard only) | `maison-dock.tsx` (one control that morphs), `components/shell/mobile-nav.module.css` (the dock's sixth column, `body[data-om-dock-spark]`) | 48 tall, 10 above the dock, 12 from the sides; shrinks into a 44 ✦ at the dock's end on the way down (6px dead zone, the FAB's), back on the way up and at the page's end; 320 checked — the ✦ never sits on More. A phone held sideways ≥768 keeps the ✦ alone in the corner; ≤767 sideways stays shrunk in the dock. |
| The Sheet, the keyboard (`visualViewport`), a phone held sideways | `maison-dock.tsx` (`lift` from `visualViewport`), `components/om/sheet.tsx` (additive `lift`) | The Sheet holds the conversation, the suggestions in one scrolling row and the field at its foot (16px, `enterKeyHint="send"`). Keyboard: simulated in the probe (the visual viewport shrunk by 300 → the field stays above it); a real iOS / Android keyboard is not reachable from Playwright — **check on a device**. |
| P-10 answer cards (`MaisonAnswer` additive; drawn in the dock and the FAB sheet) | `lib/maison-ai.ts` (types), `components/maison-ai/answer-cards.tsx` + `.module.css`, `components/shell/maison-answer.tsx` `AnswerBody` | figures (the house StatTile, each a door) · record · chart (bars, values in words) · timeline (the house Timeline) · compare · doors (quiet, grouped "Remind · n ▾" in a PortalMenu) · `MaisonRow.verb`. An answer without them draws as before in the sheet. Receipts are client-made (`MaisonReceipt`, `usePlanRunner({ onReceipt })`). |
| The chips' answers get their cards | `answers/dock.ts` `cashAnswer` · `meetings.ts` `nextMeetingAnswer` · `work.ts` `overviewAnswer` · `dock.ts` `remindClientAnswer` | cash → four figures + four weeks of bars (asserted to add up to "Coming in · 30 days") + Open Money in / Remind · n / Open Cash flow; prepare me → the client's record card + Call now · Open lead · Open the meeting (+ two next questions); how is the studio doing → figures; remind → a proposal (one filled button) whose run opens WhatsApp with the quote screen's own reminder and keeps it on the client's Activity; the receipt's Undo takes the line back (both asserted on the records). Also: "Tell me about …" carries a timeline; "{lead}’s budget vs similar leads" a comparison (the drawn phone chip). |
| Q-12 no voice | — | No mic anywhere. |

**Merged mid-lane (the orchestrator's hand-off, D3 + D5 applied 3-way into this worktree):** D3's Your day asks "Prepare me for my meeting with
{first} at {time}" through `askMaisonAi` — the dock answers **that** meeting (`meetingNamed` reads the first name and the time); following D5's
P-14 rule, a named meeting is one the member is on or planned, as their next one is (`nextMeetingFor`, D5's). D5's counts kept in the answer cards:
`addedInLast7Days` (New leads), `countQuotesToApprove` (Quotes to approve), `moneyCard` on the record line; conflicts in `answers/meetings.ts` and
`answers/work.ts` resolved by keeping both. D3's card heads call `askAbout('<card>')` from their own `card-frame.tsx` button — the probe presses it.

**Not done / left:** the card heads' Ask buttons are lanes D1–D3's (they place `DockAsk`); the docked field's ghost is D1's to place
(`MaisonDockGhost` exported). The real on-screen keyboard is unverified on a device (above). "Clear" on the thread has no Undo — it removes nothing
recorded (Recent keeps the questions); flagged below.

## 2 · ▲ Decisions for him

1. **Reset prototype to base** lived in the floating button's sheet foot; on the Dashboard that sheet steps aside (Q-02), so the reset moved
   to the field's **+** menu under a rule, with the same confirm (one copy, `components/maison-ai/reset-prototype.tsx`). Every other page keeps it
   in the sheet.
2. **The + itself**: the drawing shows a "+" with no spec — it opens the tools that read a file (Maison AI's own `attach` answer's four doors,
   only for roles that open them) and the reset. Keep, or drop it for the reset alone?
3. **The thread's wash covers the column** (the drawn "Ask, act" frame washes the page): the Needs you card behind fades while an answer is out.
   The alternative is a 760 white column with the cards visible beside it.
4. **"How is the studio doing?" answers as figures on every page** (the sheet too) — the same facts and words as its lines had.
5. **A quote reminder is kept on the client's Activity** as `portal_reminded` (`quote:<id>`), Client access's own record kind, so no Activity
   branch was added; its sentence reads "Dane reminded Ryan D’Souza on WhatsApp: “Variation order VO-2”." Undo is the keeper's, for 15 minutes.
6. **Clear** (the thread's head) has no Undo — it removes only what is on screen.
7. **Three breakpoints the house rule (§ 8: only 767 / 1024) doesn't name**, all from brief § 3: 768–1023 upright (the Sheet), a touch 1024
   (640 wide) and a phone held sideways (the ✦ alone).
8. **Which clock a meeting's time reads**: "Prepare me for 2 PM with Kelvin" and its answer read the clock every other page reads a meeting by
   (the server's, `lib/format` `displayTime` — the meeting page, the agenda), so the chip and Your day's row never disagree; the greeting reads the
   studio's (`STUDIO_TZ`, P-14). On this machine (IST) the two differ by 2½ hours; on a server outside Singapore every page's times would be off
   — an app-wide question for D5's "dates one way", not settled here.

## 3 · Shared pieces changed

- `components/om/sheet.tsx` — additive `lift` (0 = byte-identical for every other sheet).
- `components/leads/ai-sheet.tsx` — its reset moved into `useResetPrototype` (`components/maison-ai/reset-prototype.tsx`), same DOM and words.
- `components/shell/maison-answer.tsx` — `AnswerBody` (one renderer for the sheet and the dock); the panel's DOM is unchanged for an answer with
  no cards.
- `components/shell/maison-plans.ts` — `usePlanRunner(opts?)` with `onReceipt`; the new `remind_quote` kind; the sheet's snackbars unchanged.
- `components/shell/maison-fab.tsx` — `data-maison-fab`, the tooltip's ⌘J, the ⌘J listener. The `quietTop` prop is unused now (S42 A-12's
  Dashboard rule is gone with the button); left for the landing to remove.
- `components/shell/maison-ai.tsx` — the button and its sheet step aside on the Dashboard.
- `components/shell/shortcuts/dom.ts` — "Ask Maison AI ⌘J" under Everywhere where Maison AI is on the page.
- `components/shell/mobile-nav.module.css` — the dock's end room (only under `body[data-om-dock-spark]`, which only the Dashboard writes) and a
  padding transition on the dock (no pixel change elsewhere).
- `lib/maison-ai.ts` — additive types (`MaisonFigure` · `MaisonRecord` · `MaisonChart` · `MaisonTimelineItem` · `MaisonCompare` · `MaisonDoor` ·
  `MaisonReceipt`, `MaisonRow.verb`, `MaisonPlanDo` `remind_quote`), the dock presence store, `isAskKey` · `keyboardHeldElsewhere`.
- 1440 pixel diff of the other pages against the WIP base build: `/leads · /settings · /company/members · /visualizer` identical; `/tasks ·
  /projects · /quotes · /contracts` differ by 7–20 px in the search box's "/" hint — the base build differs from itself there too (7 · 1 px), so
  it is that piece's noise, not this lane. 390 touch: all eight identical.

## 4 · For other lanes

- **D1, D2, D3 — every card head's Ask**: `import { DockAsk } from '@/components/maison-ai/dock/maison-dock'` and put
  `<DockAsk card="pipeline" label="Pipeline" />` at the head's right (keys: `pulse · needs · day · pipeline · projects · team · site`). To ask about a
  card straight away (a Needs you row's ⋮ › Ask about this, Your day's "Prepare me"): `askAbout('day', 'Prepare me for 2 PM with Kelvin')`.
  `askMaisonAi({ text })` from `lib/maison-ai` works too — on the Dashboard it lands in the dock.
- **D1 — the frame**: the dock reserves its own height at the page's end, so `.content`'s `padding-bottom: var(--fab-clearance)` (88) is no longer
  needed at ≥768 on the Dashboard — the house 24 is enough (keep `--fab-clearance` on a phone: it is the accessory's 70 + 10 + 48 + 16). Place
  `MaisonDockGhost` (exported from `maison-dock.tsx`) as the ghost's last child of the body, and keep `MaisonDock` the body's last child (sticky).
  **verify-pm2-s22 §2**: I replaced its Ask-box lines with the dock's; its brief-greeting lines (the `[aria-label="Maison AI brief"]` locator,
  lines ~86–93) are yours — they fail on the WIP base already.
- **D1 — one number**: the dock's cash answer reads Reports › Finance's cash flow (`ahead` › "Next 30 days" in / out, "Overdue now" in) and the
  AR tile "Owed to you". Pulse's "Coming in · 30 days" and "Owed to you" should read the same rows so the two never disagree.
- **D2 — Remind on a quote row**: the dock keeps a quote reminder with `recordQuoteReminder({ quoteId })` / `undoQuoteReminder({ eventId })`
  (`lib/maison-ai/remind-actions.ts`) and judges "waits on its client" with `waitsOnClient` (`lib/maison-ai/remind.ts`, your signal's rule:
  opened ≥ 2 or 3+ days, valid, not reminded in 2 days). Use the same pair so the row and the chip agree and a reminder from either takes the
  other's offer away.
- **D3 — the card heads' Ask** (`card-frame.tsx`) is a DS text button at `size="sm"` (24): the house touch overlay (globals.css, REG-344) covers
  only `md` buttons, so under a finger it is a 24 target. `DockAsk` (md, 36 + the 44 overlay) is the same press and look; either swap to it or
  make the frame's `md`. For the landing.
- **D3 — Your day's meetings**: the dock's "Prepare me for {time} with {first}" reads the member's next planned meeting later today with
  `displayTime`'s clock; Your day's row should print the same time. Its "Prepare me" press: `askAbout('day', 'Prepare me for 2 PM with Kelvin')`
  (the words the dock reads — a time and the client's first name pick the meeting).
- **D5 — dates one way**: the app formats every time on the server's clock while the greeting uses `STUDIO_TZ` (▲ 8).
- **Everyone — the quiet check** in `verify-dash-d4.cjs` measures the whole Dashboard at rest at 1440: no element with a filled primary
  background. A filled verb on a row or a solid day in the week strip will fail it.
- Probes I updated for the button stepping aside (each line commented `(Dashboard redesign 2026-10-26, a deliberate change)`):
  `verify-pm2-s10` (the studio today → figures), `s22` (the Ask box → the dock), `s30`, `s41b1`, `s41b5`, `s42a` (A-12 → the accessory), `s42d`,
  `s43a` (Maison AI asked on /tasks, which keeps the button).

## 5 · Tallies

- `verify-dash-d4.cjs`: **93 / 93** on the final lane build with D3 · D5 merged (fresh copy of the base DB) (1440 · 1280 · 1024 touch · 768 touch · 390 touch · 320 · 844 × 390; Dane, Hui Min, James,
  Michelle, Priya, Nurul); it puts back every reminder, Recent question and the meeting it seeds.
- `npx tsc --noEmit` clean · `npx eslint` on the lane's files clean · `npm run design:lint` ✓ nothing new (no count rose) ·
  `npm run design:anatomy` ✓ all 1971 measures hold (90 pages, 27 dialogs).
- The existing probes my files reach, each on a fresh copy of the clean base DB: see § 6.

## 6 · The probes my files reach

Each on a fresh copy of the clean base DB (`…/dash-build/base.db`) with its own `next start` of the final lane build; logs in
`…/scratchpad/dash-build/D4/reg/`.

| Probe | Result | Reading |
|---|---|---|
| `verify-dash-d4` (this lane) | 89 / 89 before the D3 · D5 merge; after it, with D3's card heads and Your day: see the last line of § 6 | |
| `verify-pm2-s10` (Maison AI's sheet, Ask box, Recent) | 107 / 107 (before and after the merge) | the studio today → figures (updated) |
| `verify-pm2-s23` (Meetings; "prepare me for my next meeting") | 147 / 147 (before and after the merge) | |
| `verify-pm2-s30` · `s41b5` · `s42d` | all ✓ (0 ✗) | Maison AI asked on /tasks (updated) |
| `verify-pm-h` · `verify-pm-e` (the parity map's Ask box) | all ✓ | |
| `verify-kb-r1` · `verify-kb-r2` (the keys, the ? panel) | 35 / 35 · 29 / 29 | |
| `verify-rwd-w1` (the house pieces, the FAB at the safe edges) | 59 / 59 | |
| `verify-pm2-s22` | stops at §2's brief (the `Maison AI brief` card, D1's — gone on the WIP base); with those lines softened in a scratch copy, my Ask-box lines pass (docked field answers · Recent · What did I miss?), and its other ✗ are the Needs you / MY TASKS / Coming up cards (D2 · D3) | for D1 · D2 · D3 |
| `verify-pm2-s41b1` | 2 ✗: the Dashboard ghost's tile count vs the page's Pulse (D1's) | for D1 |
| `verify-pm2-s42a` | 4 ✗: Site updates (D3), the brief's greeting (D1), MY TASKS (D3) — it stops at MY TASKS before A-12 (which this lane rewrote to the accessory; the D4 probe walks the same) | for D1 · D3 |
| `verify-pm2-s43a` | 6 ✗: all through its `greeting()` helper, which reads the S22 brief's sentence "Good evening, Dane." (the period) — D1's greeting has none; the reset through /tasks itself lands | for D1 |
| **`verify-dash-d4` after the D3 · D5 merge** | **93 / 93** | D3's card heads pressed (the Your day context), Your day's own Prepare me answered in the dock with that meeting's record card, the quiet check over D3's cards |

## 7 · Principles check

1. **The mock wins** — no Figma for this page; the review page's drawn frames are the spec, followed; every invented word is a REG-D4 row.
2. **One system** — house pieces only (Drawer · Sheet · StatTile · Timeline · PortalMenu + DropdownItem · DS Button / Chip / IconButton · Tooltip ·
   Keys · ConfirmDialog); `--om-*` tokens; one answer renderer for the sheet and the dock; the reset kept as one copy; no copied stylesheet.
3. **Plain words** — questions in studio words; refusals in the rule's words ("Only the lead’s members, their Manager, Owners and Admins remind the
   client"); "Couldn’t keep the reminder on the Activity — …" through `couldnt`.
4. **Nothing is lost** — every change behind a confirm, its receipt with Undo where the house action has one; nothing written without a press.
5. **Say why** — a quote that can't be reminded says where it stands (signed, a draft, ran out on …); the Stopped / Couldn't lines say what happened.
6. **Back returns** — every door and every row opens with `?from=/dashboard` (asserted on Money in, the X-Ray, a project's Money).
7. **Every screen is whole** — the shell stays; the ghost piece is ready for D1; tooltips on every icon-only control (+, Stop, Hide, ✕).
8. **Every width is designed** — desk, 1024 touch, 768 upright, phone, phone sideways, 320 — no sideways scroll; 44 targets; inputs 16. The three
   extra breakpoints are named in ▲ 7.
9. **Tables** — none here (the comparison is a three-column list, not a table).
10. **Motion with purpose** — the accessory's morph and the dock's room on the motion tokens; reduced motion respected; no fake streaming.
11. **Honest data** — every figure is its report's own (the bars add up to the figure); no seeded state; the probe's meeting is put back.
12. **Reach for everyone** — ⌘J, Enter / Shift+Enter, Esc folds, the thread a live log, every icon button named, focus into the pane / sheet and back.
