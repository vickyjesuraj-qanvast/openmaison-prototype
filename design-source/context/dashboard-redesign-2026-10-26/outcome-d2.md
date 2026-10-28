# Lane D2 — Needs you, one ranked inbox · outcome (2026-10-26)

**Lane:** D2 of the Dashboard redesign (brief.md § 5 D2) — his marks P-04 · P-05 · Q-05 · Q-11 and his note *"the CTAs are too much to the eyes
because of primary color"*. Worktree `agent-a13d7d6a0a193bf8a` on its WIP base (`a3eaf4b0`), with lanes **D3 and D5 applied** (their handoff patches, conflicts resolved
in `scripts/repair-demo-data.ts` — R178 and R179 side by side — and `verify-pm2-s22.cjs`); nothing committed. Port 3222, lane DB
`…/scratchpad/dash-build/D2/lane.db` (repaired: R178 · R179), shots `…/dash-build/D2/shots/`.

## What was built, item by item (brief § 5 D2)

| Brief item | Built where | Notes |
|---|---|---|
| **One ranked inbox** — every module's waiting work, Your OK first then Q-03's order | `lib/dashboard/inbox.ts` (types, `RANK`, `orderInbox`, `chipsOf`, `inChip`, the ring, `INBOX_KEY`), `lib/dashboard/inbox-queries.ts` `fetchInbox` | Producers: every project's rows (`projectRows`), Finance › To do (`todoInbox`), the approvals as one row per record (`quoteApprovals` · `priceBookProposals` · `creditAsks`; templates stay one door), new leads (`leadRows`), quotes and contracts with the client (`quoteRows` · `contractRows`), AI credits (`creditsRow`), S22's meetings · compliance · set-up · Qanvast. Each producer that can't be read is left out (`soft`), never a failed page. |
| **Every project's rows** (not only its first) | `projectRows` | Each project's rows = its own Overview's Needs you (asserted per project by the probe: 12 = 12 · 10 = 10 · 3 = 3 · 3 = 3). What a hold pauses still rests on the project's card (`holdSplit`). |
| **The new signals** (B §18 ① ②) | `quoteRows` · `contractRows` · `leadRows` · `creditsRow` · `todoInbox` (Xero) | Quote / VO opened ≥ 2 times or with the client 3+ days, price ending within 3 days, price ended (Revise), change asked by the client, sent back to its maker, confirmed with no agreement out; contract out 3+ days not opened / not signed / link closed; a New lead with no contact past the studio's untouched delay; AI credits low or out; Xero failing (once, Retry). Tickets and client messages are the projects' own `ticket` · `message` rows. Scoped by Who sees leads (`ctx.seen`) and by maker / member for a Designer (`followsUp`); `Viewer.costs` read before a Price book cost is said. |
| **The verbs in place**, quiet, with Undo | `components/dashboard/inbox/use-inbox-actions.ts`, `inbox-row.tsx` | Publish / Approve (update · change), Approve (Done ask · expense · bill · quote · Price book), Agree (more time), Confirm (payment), Raise to / Top up (AI credits), Remind on WhatsApp (invoice · contract · quote), Call / WhatsApp a lead + *Log the call*, doors for the rest (Write up · Assign · Open · Pay · Send · Reply · Start · Resume …). Every one through the module's own action with its own sentence and Undo; optimistic (the row leaves at once, comes back on a refusal with "Couldn’t …"). |
| **The Review pane** (P-05) | `components/dashboard/inbox/review-pane.tsx`, `inbox-back.tsx` | House Drawer `wide` (480) ≥768, the house sheet on a phone (its own branch). One filled button (the decision); Send back / Decline through the tab's own dialogs (`NeedAnswerDialogs`; the house `NoteDialog` in the editor's / Price book's / Money's words). ↑ · ↓ in the head + J · K inside it step the rows with a pane; an answer that lands moves it on; the reviewed row is marked. A PO's or a client invoice's approval sends something — its button is Money's own step (a door). |
| **Not today** (Q-05) | `app/dashboard/inbox-actions.ts`, table `dashboard_snoozes` | Until the studio's next day (Singapore); the key carries a word of the row's title and amount, so a row that changes comes back; "n set aside for today · Show" with Bring back; Undo. Late and ours, and an approval past its day (more time on a milestone whose end passed), can't — the ⋮ row says why. |
| **The filter chips** | `needs-inbox.tsx` | House `Chips` in the house `ChipRail`; only chips with rows; Late = every red row; an emptied chip lets go. |
| **The cleared ring** from the records | `clearedToday` · `CLEARING_KINDS` (inbox-queries.ts), drawn with Your day's `DayRing` (one ring on the page) | Approvals given / sent back (each module's events), quotes and Price book items answered, credit asks granted, leads contacted (contact logs), payments confirmed, reminders sent (+ the Dashboard's own quote-reminder notes). **The member's own tasks are left out** — they are Your day's, with its own ring (▲ 9). The probe moves it with a real approval and back with its Undo. |
| **Show n more** (six · four) | `needs-inbox.tsx` | The house fold row. |
| **You're all caught up** (Q-11) | `needs-inbox.tsx` | Ring full, "You’re all caught up", "Next: …" from the `next` prop (D1 passes it); set-aside rows a press away. |
| **Keys** J / K / ↵ / R | `inbox-row.tsx` marks (`data-kb-list="item"`, `data-kb-row`, `data-kb-id`, `data-kb-open`, `data-kb="list.review"`) + `lib/keys/registry.ts` · `components/shell/shortcuts/shortcuts-layer.tsx` · `dom.ts` | R is a new list key (`list.review`) — the ? panel lists it on a page whose list has a Review. |
| **`data-inbox-row` for Since chips** | every row; `revealInboxRow(key)` exported from `needs-inbox.tsx`; keys from `INBOX_KEY` | The reveal opens the list (All, Show all), scrolls and pulses (`data-fresh`). |
| **`countApprovalsWaiting` kept right** | `lib/leads/tasks.ts` → `fetchInbox(ctx, { okOnly: true })` | Counts Needs you's own Your OK rows (set-aside ones out). **It now counts every approval** (S22 counted a project's only when it topped its project — B §2 "undercounts the /tasks line"): the demo's Tasks line reads "8 approvals wait for you on the Dashboard" (was 5). |
| **Repair rule R178** | `scripts/repair-demo-data.ts` | Aisha Rahman's VO-1 opened three times (first 8 PM the day after it went, last 9 PM yesterday) — the strongest follow-up cue had no demo state. Idempotent, with its check (a client's openings in order). Run on the lane DB only. |
| **One after-call piece** (D3's, shared) | `components/dashboard/after-call.tsx` `useAfterCall` — lifted out of `your-day-card.tsx` (D3's words and rule, unchanged), used by Your day and Needs you | A row's Call / WhatsApp is remembered; back on the page (visible or focused again, ≥ 1.5 s later) "Log the call with {first}?" · *Log the call* opens the house log sheet. |
| **One card head** (D3's) | Needs you on `components/dashboard/cards/card-frame.tsx` (its `card` key takes `'needs'`) | The ✦ Ask is the cards' quiet text button (`askAbout('needs')`); the ring and its words are the head's legend. |
| **D5's one rules** | `isUntouchedLead` · `isUnassignedLead` · `isOverdueLead` (lib/leads/filters.ts) in `leadRows` | New leads with no contact, leads with no member yet (not Lost), leads with an overdue follow-up (not those handed to their project) — the bell's and the listing's own rules. |
| **`row.tsx` additive** | `components/projects/overview/row.tsx` | `RowButton.look` (DS secondary outlined · text) · `icon` · `kbOpen`; `Row.glyph` · `after` · `attrs` · `className`. Every existing caller renders the same markup. |

**Not done, and why**
- **A Done ask, a client invoice for approval, an AI credits ask and Xero** have no demo state, so the probe can't press them on the demo;
  their paths reuse the Overview's / Money's / Plan's own actions (the same calls the bell and the Overview make). The quote approval, the
  contract follow-up, the change asked and AI credits low are pressed on scratch states the probe puts back.
- **The Tell-the-client offer after a Done is approved** (the Overview's "Tell {client} on WhatsApp too?") stays on the project's page — the
  bell's approval doesn't make it either; the Undo is the Overview's.
- **"Ask about this" and the card's Ask** call D4's `askAbout('needs')` — a no-op placeholder in this lane's build, live once D4 lands.

## ▲ Decisions for him

1. **"Not called within the hour" is the studio's own untouched delay** (Settings › Lead management › Untouched leads, 30 minutes by default) —
   the bell's rule and `lastContactOf`, one rule (D5's "one not contacted"). A lead that came in weeks ago and was never contacted still waits
   here ("came in 49 days ago"). Rows for the lead desk (Owners, Admins, Marketing, Managers) are every visible New lead; a Designer's their own.
2. **The inbox is long on the demo** (Dane: 49 rows — 8 approvals, 8 money, 8 clients, 6 leads, the projects' work). Every row is a real
   wait; six show with *Show 43 more* and the chips slice it. Kept honest rather than trimmed.
3. **A quote reminder is the Dashboard's own note** — the Quotes module records none (REG-2541), so after Remind the row rests until tomorrow
   (`reminded:` in `dashboard_snoozes`), counts as cleared, and Undo brings it back. An invoice's and a contract's are their modules' records.
4. **Quote and contract follow-ups sit under *Clients waiting*** (the client's thread), though it is the studio that follows up.
5. **"Approvals past their day"** read as: an ask for more time whose milestone's end has already passed; with every red row (late and ours),
   it can't be set aside.
6. **The row draws the review page's tinted glyph square** (a tint per place, red earned) rather than LEAD STAGES' bare 20px icon — the drawn
   inbox; the primary appears only as the Your OK square's tint, the selected chip, the reviewed row's tint, the ring's arc and the pane's
   one filled button.
7. **The Review pane says money with cents** (S$5,529.57, the record's own panel) while the row says the card's S$ 5,530.
8. **On a phone the row's words take the full width and the verb and ⋮ sit under them**, rather than the drawing's button beside two-line text
   (which left the words ~160px at 390).
9. **Two rings, two facts.** Needs you's ring counts what you cleared *from Needs you* today; the member's own tasks (and their ticks) are Your
   day's ring (lane D3, "2 of 5 done") — the brief listed "tasks done" in Needs you's ring too, but then one tick would move both. Both rings
   are drawn by Your day's `DayRing`, so the page has one ring piece. If he prefers one ring only, Needs you's is the one to keep (it is the
   day's whole clearing); say so and Your day's goes.
10. **On a phone the money leads the caption** ("S$ 5,530 · HDB 5-Room — …") instead of standing beside the words.

## Shared pieces changed (named, deliberately)

- `components/projects/overview/row.tsx` — additive props only; the project Overview's markup unchanged (1440 pixel diff below).
- `lib/keys/registry.ts` (`list.review`), `components/shell/shortcuts/shortcuts-layer.tsx` (R → `list.review`), `components/shell/shortcuts/dom.ts`
  (the ? panel's "Review the {noun}" when the list has one) — the ? panel's *All pages* now lists **R · Review the row** under Lists on every
  page (a visible change in the panel, on purpose).
- `lib/leads/tasks.ts` `countApprovalsWaiting` — `okOnly`; the Tasks page's line counts every approval now (see above).
- `scripts/repair-demo-data.ts` — R178 and its check (after D3's R179 was merged in, both kept).
- `components/dashboard/after-call.tsx` (new, shared) and `components/dashboard/cards/your-day-card.tsx` (D3's card now calls it — its after-call
  state, effect and LogSheet moved out, words and rule unchanged); `components/dashboard/cards/card-frame.tsx` (`card` takes `'needs'`).
- `components/dashboard/inbox/cleared-ring.tsx` — removed; `DayRing` draws both rings.
- `lib/dashboard/inbox.ts` `InboxData.set` is optional so D1's fallback in `lib/dashboard/queries.ts` keeps compiling; `EMPTY_INBOX` is the whole
  empty value.

## For other lanes

- **D1 (frame · Since · Pulse · ghost):** the card's head is D3's `CardFrame` now (✦ Ask, the ring as its legend) — when your head wrapper
  lands, it lands there once for every card. Further: pass `next` to `NeedsInbox` (the first coming item of `data.day` — any `{ title, time?, href? }`). For a Since
  chip about something waiting here, set its `rowKey` with `INBOX_KEY.*` (lib/dashboard/inbox.ts — `quoteWait(id)`, `quoteConfirmed(id)`,
  `leadCall(id)`, `project(projectId, 'money:confirm:<paymentId>' | 'message' | 'ticket:<id>' | 'review-update:<id>')` …) and call
  `revealInboxRow(key)` from `components/dashboard/inbox/needs-inbox.tsx`; it answers false when the row isn't listed (then open the chip's
  own door). The greeting can read `needs.rows[0].phrase`. **The ghost** should draw Needs you as it now is: the head (title · count · the ring
  and its words · Ask), the chips row, six rows (four on a phone) of a 32px square + two lines + an outlined button + ⋮, the fold row.
  Use `EMPTY_INBOX` as Needs you's fallback in `fetchDashboard`.
- **D3 (cards, landed):** Needs you now uses your `CardFrame` and `DayRing`, and your after-call code lives in `components/dashboard/after-call.tsx`
  (Your day calls it). The member's own tasks are never Needs you rows, and no longer in its ring.
- **D4 (dock):** the row's ⋮ › *Ask about this* and the card's *Ask* call `askAbout('needs')`; a row-level context (the row's title and its
  questions) would be better — if `askAbout` takes an optional `DockContext`, Needs you will pass the row's. ⌘J is yours in the same registry file
  (`lib/keys/registry.ts`) where D2 added `list.review` — two separate lines.
- **D5 (one fact, landed):** Needs you reads `isUntouchedLead` (with `fetchNotificationRules().untouchedMinutes` and the listing's
  `LeadRow.lastContact`), `isUnassignedLead` and `isOverdueLead`; its quote approvals use `countQuotesToApprove`'s own predicate (rows, not a
  count — the same `where`).
- **The landing:** existing probes updated for this lane's moves, each commented *(Dashboard redesign 2026-10-26, a deliberate change)*:
  `verify-pm2-s22.cjs` (its Needs you section: every project's rows, Your OK first, quiet verbs, To do's own rows, Accounting's rows) and
  `verify-pm2-s46c.cjs` (the Your OK chip). Failures seen in this lane that belong to other lanes' moves (the placeholders here): s22 · s43a
  (the brief / greeting — D1 / D4), s41b1 · s45b (the tiles, Site updates, Contractors — D1 / D3). `verify-pm2-s42c`'s two C-19 meetings-ghost
  checks fail identically on the WIP base (not this lane). Icons used are all in `public/fonts/ICONS.txt`; none to add.

## Tallies

- `verify-dash-d2.cjs` — **111 / 111** on the final build with D3 and D5 merged in (9 sections, real presses, every width, as Dane · Hui Min ·
  James · Germaine · Alex · Priya · Nurul); the probe's DB afterwards identical to the lane DB, table by table. Its line is in
  `design-source/verify/regression/probes.cjs` (`dash-d2`); shots banked in `design-source/verify/dashboard-2026-10-26/d2/`.
- On the merged build, each on a fresh copy of the lane DB through the regression runner: **dash-d3 139/139 · dash-d5 53/53** (the other lanes'
  probes, after the after-call and card-head moves) · **pm2-s46c 96/96** (updated: the Your OK chip) · **kb-r1 35/35 · kb-r2 29/29**.
  Before the merge: pm2-s46b 81/81 · rwd-w6 68/68 · pm2-s37 84/84; `verify-pm2-s22.cjs`'s Needs you section **14/14** (run with its § 2, the
  brief, skipped — the frame's to restate).
- Seen failing, not this lane's: s22 · s43a (the brief / greeting, the frame's), s41b1 · s45b (the tiles — D1 / D3), s42c's two C-19
  meetings-ghost checks (**fail identically on the WIP base**, run there), s42a (its repo path when copied into a runner lane).
- **Other pages, 1440, WIP base vs this lane** (animations off, the same DB): Benjamin's project Overview, its Money, a lead's Overview, `/leads`,
  `/quotes` — **identical**; `/tasks` differs only in its approvals line (5 → 8, on purpose — above). The CSS load-order scan (107 routes at 1440):
  **0 winners moved**; the two new pairs were Needs you's own `.body` gap, now order-proof (`.body.body`).
- `npm run design:lint` — nothing new; `design:anatomy` on this lane's build — **1,971 measures hold** (90 pages, 315 heads, 27 dialogs, 41 menus);
  `tsc` · `eslint` clean on every file touched. The Dashboard's full response ~0.31–0.46 s on the demo (base 0.31–0.43 s) — Needs you's extra
  reads cost about 20 ms; D1 owns the page's speed (P-14).

## Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins** — the review page's drawn inbox and his marks; every departure is a ▲ above and a staged row in `reg-d2.md`.
2. **One system** — house Row, Card, Chips, ChipRail, Drawer / sheet, NoteDialog, NeedAnswerDialogs, PortalMenu + DropdownItem, IconButton,
   snackbar with Undo, LogSheet; tokens only; the doubled-class overrides (`.row.row`).
3. **Plain words** — the modules' own sentences after every action; invented copy listed (REG-D2.19); refusals through `couldnt` / `refusalOf`.
4. **Nothing is lost** — Undo on every approval that has one, on Not today, on a quote reminder; set-aside rows a press away.
5. **Say why** — the ⋮'s disabled Not today carries its reason as its second line; a refused action names what failed.
6. **Back returns** — every door carries `?from=/dashboard` (the probe checks every row's link).
7. **Every screen is whole** — the card inside the page's PageReveal; the ghost is D1's (the shape it should draw is above).
8. **Every width** — 1440 · 1280 · 1024 sideways touch · 768 upright touch · 390 · 320 · 844×390: no sideways scroll, 44 targets under a finger,
   16 / 14 type ≤1024, a phone's row its own verb alone, the pane a sheet on a phone; only the two house media queries.
9. **Tables** — not a table; the row grammar is LEAD STAGES'.
10. **Motion** — rows ease out (opacity, the rest by transform, `lib/motion` tokens); the ring is Your day's; reduced motion as the house.
11. **Honest data** — every row is its module's record read by its own rule; the ring counts records; R178 writes the opening the cue needs.
12. **Reach for everyone** — J / K / ↵ / R, focus into the pane and back, every icon-only control named ("More for …"), nothing on hover alone.
