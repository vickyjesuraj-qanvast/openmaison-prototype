# P-F · The client's portal & Qanvast Ops — outcome (2026-10-10)

Built every item of P-F's section: CP-062 · SC-087 · CP-064 · CP-072 · CP-099 · CP-110 · CP-118 · FR-095 · CP-127 · CP-148 · CP-149 · UC-082's
operator pause — plus the coordinator's mid-build ask (P-D's Needs from others 6 and the optional 9). Staged register rows: `reg-P-F.md`
(REG-P-F.1…11). Probe (written, not run): `design-source/verify/parity-map-build/verify-pm-f.cjs`. Checks: `tsc` clean on every P-F file,
`eslint` clean on every P-F file; `npm run design:lint` — no P-F file breaks a rule (the four reported files are P-A's, P-B's and P-G's).

`lib/platform.ts` was written first (P-G reads it): `PLATFORM_KEY` (`platform`), `PlatformSettings` { `portalOff` · `portalOffAt` · `portalOffBy` ·
**`messagesPaused`** · `messagesPausedAt` · `messagesPausedBy` }, `parsePlatform`, `fetchPlatform()`, **`messagesPaused()`**, `portalClosedByPlatform()`,
`savePlatform()`. Unset = both off. Server-only, one settings read, no other imports (safe for the delivery layer).

---

## Per map row

### CP-062 · SC-087 — the client's Schedule: chips and the rail's moments
- **What changed.** Past five stages (`FILTER_MIN_STAGES`), house `Chips` on a `ChipRail` over the stages: *All · Payments · Under way · Paused ·
  Coming up* with counts; a chip shows exactly what it counts (`stageMatches`); *Payments* = stages with a payment point + the invoices sent; a
  chip that finds nothing says "Nothing … right now." The rail gains *Project started* (`projects.started_at`) and each *Invoice {n} sent*
  (`PortalPayStage.sentAt`, only while Money is on), placed between the stages by day (`railOf`: the start before a stage starting that day, an
  invoice after the stages already begun). A moment is a quieter row (glyph, title, line; no state).
- **Files.** `lib/portal/schedule-model.ts` (`STAGE_FILTERS` · `showStageFilters` · `stageMatches` · `ScheduleEvent` · `RailItem` · `railOf`),
  `lib/portal/schedule.ts` (`PortalScheduleHome.events`, `eventsOf`), `components/portal/project/portal-schedule.tsx`, `project.module.css`
  (`.moment` · `.momentDot` · `.momentName` · `.stagesNone`, the phone's `[data-slot='filters']` order).
- **Check.** `/my/demo-studio/schedule` signed in as Benjamin (97731968 + any six digits): 7 stages → chips; press each; the rail's three invoices
  and Project started under All; 390 (chips scroll on their rail) and 320.

### CP-064 — a paused stage's restart
- **What changed.** "Paused — {the studio's words} · Resuming around 16 Nov" / "· Resume day passed" (`pausedLine` · `resumeWords`); with no words
  for the client "Paused · Resuming around …"; with neither, as before (the row's Paused). Words alone keep today's exact line.
- **The day is read LIVE** from `project_milestones.resume_on` (`liveStagesOf` → `LiveStage.resumeOn`), as gaps build D reads the pause itself
  live — so P-E needn't carry it in the snapshot for the portal (a snapshot field would be ignored here; harmless).
- **Check.** Ryan's Electrical & plumbing is the demo's Blocked stage — it shows the line once it has a `resume_on` (repair text below, or P-E's
  dialog).

### CP-072 — the client's own pins
- **What changed.** On the renders link (the portal's Designs opens it), a pin the client dropped: *Mark resolved* / *Reopen*, and *Remove your
  pin* with "Pin removed" + Undo (soft: `deleted_at`, Undo restores it with its replies; refused past the pin limit). Optimistic, put back and
  said when refused; the page's marks step aside once the server's payload changes. Only client pins on a live version of an open link
  (`ownPin`); the studio's pins never reach the link. Nobody is told (1.0's rule).
- **Files.** `app/renders/actions.ts` (`clientPinStatus` · `clientRemovePin` · `clientRestorePin`), `components/visualizer/share/render-share-page.tsx`
  (the brief named `components/visualizer/client/**`, which doesn't exist — the link's page is `share/`), and **`components/visualizer/editor/pin-card.tsx`**:
  one optional prop `own` on `PinThread` (the reply box never reads "the client sees it" on the client's own page; tooltips "Mark resolved" ·
  "Remove your pin"; test ids `pin-own-status` · `pin-own-remove`). The studio's editor passes nothing, so it is unchanged.
- **Check.** `/renders/17fe84ab2eca47` → pin 2 (the client's) → resolve, reopen, remove, Undo; 390 (the pin opens as a sheet; the actions sit in
  its head).

### CP-099 — the client's Files by kind
- **What changed.** "From {studio}" groups its tiles under *Contracts · Quotes · Variation orders · Designs · Floor plans · Site photos · Other* —
  a heading only for kinds present, none when all are Other; tiles keep "Shared {day}". The kind is read by rule (2.0 keeps no kind on a file):
  a Visualizer render (`lead_file_renders`) → Designs; then the folders it sits in, nearest first (the starter folders "Contract & VOs" ·
  "Quotes & BOQ" · "Renders" · "Floor plans" · "Site photos" · "Site updates"); then its name; else Other. A VO under "Contract & VOs" is told from
  the contract by its name.
- **Files.** NEW `lib/portal/file-kinds.ts`, `lib/portal/home.ts` (folders + render links read once, `group` on each shown file),
  `lib/portal/needs.ts` (one optional field `HomeFile.group` + its type import — re-read before the edit; P-H's edits there untouched),
  `components/portal/portal-files.tsx`, `portal.module.css` (`.docGroup + .tiles`), `portal-ghosts.tsx` (the kind's heading bone, REG-708).
- **Check.** `/my/demo-studio/files` as Benjamin: the floor plan PDF under FLOOR PLANS.

### CP-110 — Ask the client (the bug)
- **What changed.** The dialog reads its target when it opens (`readAskTarget`): the box shows the studio's **real** address (`currentPortalSlug`
  — the client's questions page `/my/<address>/questions/<home>`, or `/my/<address>` before their first ask); *Send via WhatsApp* opens wa.me
  **on the press** with a drafted line to the client's mobile, then the host records the ask (`onSend`, unchanged contract). Recording now tells
  the client: a portal bell row (`questions_asked`, derived — "{studio} has a few questions about your home · n questions to answer", read once
  all are answered) and `client_questions` through `tellClient` (email by default, once per ask). **A client never invited can't sign in**, so the
  ask invites them (stamps `invited_at` / `invited_by`, an `invite_sent` Activity line) when the number is a mobile and the asker may invite
  (`worksOn`) — said in the dialog first. Withdrawn · not a mobile · may not invite · asked under five minutes ago: the send rests and the dialog
  says the rule (`askBlock`), and the server refuses the same. Paused / closed portal: said; the ask still goes.
- **Files.** NEW `lib/portal/ask.ts` (`askTargetOf` · `askBlock` · `recordAsk`), `app/leads/questions-actions.ts` (`askClientQuestions` through
  `recordAsk`; NEW `readAskTarget`), `app/leads/portal-actions.ts` (`askClient` through `recordAsk`), `components/leads/questionnaire/ask-client-dialog.tsx`
  (+ css `.note`; optional `leadId` prop; NEW export `askedLine`), `lib/portal/notifications-model.ts` (`questions_asked`, `BellQuestions`, an
  appended producer), `lib/portal/notifications.ts` (`questions` on each home).
- **Check.** Olivia Martinez (not invited, 91234567) › Questionnaire › Ask Client: the address, "This also invites Olivia…", Send → WhatsApp tab;
  then Olivia's portal bell. With Who sees leads = everyone, Germaine (a Designer) on a lead she isn't on: the dialog says the access rule. Lead Overview's quick ask and the
  project Overview's ask use the same dialog.

### CP-118 · FR-095 — a signature confirmed
- **What changed.** `client_signed` after `signContractOnline`, after `signBundleOnline` (one message, "{first agreement} (and n more)") and after
  `markContractSigned` (the studio marks it). Link: their Files. The quote signed through its agreement (`signQuoteThrough`) is covered by the
  agreement's message — no second one, so `lib/quotes/sign.ts` is unchanged. Settings › Notifications › Messages to clients already lists
  "A signature is confirmed" (and "Questions to answer") from `CLIENT_EVENTS`.
- **Files.** NEW `lib/portal/signed-tell.ts` (`tellSigned` · `bundleName`), `app/contracts/actions.ts` (three calls + the import).

### CP-127 — the address card
- **What changed.** Getting it live › Address gains *Copy* (the whole https address, "Portal address copied") and *Open* (new tab, the sign-in
  page a client lands on) — bare 36 icon buttons before Change. **"See the live portal" (a test client's view) is the existing "See it as
  {client}"** (the header's button and step 4) — not copied (rule 1: one home, doors not copies).
- **Files.** `components/company/portal/portal-setup-view.tsx`, `portal-setup.module.css` (`.rowTools`), `portal-ghosts.tsx` (the two bones).

### CP-148 · CP-149 · UC-082 (operator pause) — Qanvast Ops › Studios
- **What changed.** Qanvast Ops' strip: Leads · **Studios** · Lead credits · Reviews · Hangouts (one list, `components/qanvast/qanvast-tabs.ts`).
  `/qanvast-ops/studios`: a card per studio (one in the prototype) — the house card table of switches: *Client portal* (on = open; off asks
  "Close Demo Studio's portal?" then closes; Undo) and *Messages* (on = sending; off asks "Pause Demo Studio's messages?"; Undo); each row's line
  says the state, when and by whom ("Closed 10 Oct by Dane — …"); the studio's own Paused is told on the portal row. *On the portal · last 30
  days*: Portal sign-ins (client sessions only) · Issues reported (raised by clients) · Messages (from the client's side, lead conversations too;
  the team's channel never) · Choices made (picked by the client). A standing bank-feed ask (P-D's) shows under the switches.
- **The closure** (`PortalLook.closed`, read in `fetchPortalLook`): `portalGate` treats it as a stop like Paused — every portal page is the notice
  "This page is closed for now" + "Contact {studio} on {phone}…" (`data-kind="closed"`); `portalActor` refuses "This page is closed for now —
  contact {studio}"; the studio's look-as still opens, its strip says so; Company › Client portal: chip *Closed by OpenMaison* + note; the Client
  access panel's note and its ask-first confirm. The four outside links keep working.
- **Files.** `lib/platform.ts` · NEW `lib/platform-studios.ts` (`fetchPlatformStudios`, `USAGE_DAYS`, `THIS_STUDIO`) · NEW `app/qanvast-ops/studios/`
  (`page.tsx` · `loading.tsx` · `actions.ts` — `setStudioPortalOff` · `setStudioMessagesPaused`) · **moved** `app/qanvast-ops/page.tsx` +
  `loading.tsx` into the route group `app/qanvast-ops/(leads)/` (REG-708: each loader wraps its own page; the address is unchanged) · NEW
  `components/qanvast/qanvast-studios.tsx` (+ css) · NEW `qanvast-studios-ghost.tsx` · `qanvast-leads.tsx` (the shared tab list) ·
  `lib/portal/queries.ts` (`PortalLook.closed`, `PortalSetup.closedByPlatform`) · `lib/portal/session.ts` · `lib/portal/access.ts` (`closed`) ·
  `components/portal/portal-notice.tsx` · `portal-frame.tsx` · `client-access-panel.tsx` · `components/company/portal/portal-setup-view.tsx`.
- **Stand-in.** In the prototype whoever opens Qanvast Ops acts as OpenMaison's operator (recorded by name); the real console signs in its own
  people. *Pause the studio's messages* only sets the switch — **holding the messages is P-G's delivery layer** (it reads `messagesPaused()`).

### FB-112 wiring (the coordinator's ask; P-D's Needs from others 6 · 9)
- `app/my/[slug]/money/(tab)/page.tsx` reads `fetchLiveMethodValues()` and hands it to the view and to each home's pay object (`pay.methods` —
  the pay box shows no bank / no PayNow when off; this also covers P-D's item 3's `methods` half for the portal's Money tab without touching
  P-A's `payments-portal.ts`). `components/portal/money/i-have-paid.tsx`: chips = the live ones of Bank transfer · PayNow (`clientMethodsFrom`,
  first live one picked). `portal-money.tsx`: with neither live, *I have paid* steps aside and the stage says "Pay {studio} by cheque or in cash —
  they record it when it arrives, and you get a receipt." (the pay box says its own in-person line when it shows). `app/portal/payment-actions.ts`:
  `methodRefusal(await fetchCollectionRules(), method)` refuses — **in the client's words** ("{way} isn't a way {studio} takes payments now —
  choose another"), since P-D's rule names a Settings page the client never sees. Item 9: the bank-feed ask on the Studios card.

---

## Roles, widths, where to look
- Dane (Owner) for every studio page; Germaine / Michelle (Designers) for Ask the client's refusals and Company › Client portal's read-only view
  (Copy / Open work for everyone; Change stays Owners' / Admins'); Hui Min (Admin) as Dane. View as switches them.
- 1440: `/qanvast-ops/studios`, `/company/portal`, `/my/demo-studio/{schedule,files,money}`, `/renders/17fe84ab2eca47`, a lead's Questionnaire.
  768: the Studios card, the Schedule's chips (rail). 390 touch: the same + the pin sheet; 320: no sideways scroll (Schedule, Studios).

## Probes changed
- `design-source/verify/ghosts/verify-ghosts-strips.cjs` · `verify-ghosts-same.cjs` — the new route `['qanvast-studios', '/qanvast-ops/studios']`.
- Nothing else asserts what changed: `verify-pj-r4a.cjs` reads `portal-file` tiles (unchanged), `portal-state` "Live" / "Paused" (unchanged
  unless closed); `ux-build…/P3/verify-p3.cjs` L310 asserts "{n} questions sent to Olivia Martinez" — still true until the callers adopt
  `askedLine` (Needs 2; then mark it `(parity map, a deliberate change of this rule)` with the new words). Note P3 now meets the ask's invite
  (Olivia isn't invited) and a WhatsApp tab opening on Send — neither breaks its assertions.
- NEW `design-source/verify/parity-map-build/verify-pm-f.cjs`: sections 1–8 as its header says; args `<scratch.db> [shotDir]`, env
  `BASE`; sqlite3 `.timeout 30000`; refuses local.db; puts back every table it touches; shots at 1440 and 390.
  **Run against the merged build (2026-10-10, :3134 on a copy of base.db): 60 passed, 0 failed, no page errors.** The coordinator's first run
  (13 / 3) failed on three probe-side causes, fixed in the probe only: the house `Card` marks itself `data-card`, not `data-testid`; the chip
  sets "Closed by OpenMaison" in capitals (innerText), now matched case-blind; the second close was pressed while the portal was still closed
  (the switch reopened it, no question) — the probe now checks the one-press reopen, then closes again and Undoes. Two more on the rerun: a
  rail row's innerText starts with its icon's ligature word (the titles are read from `momentName`); wa.me redirects the new tab to
  `api.whatsapp.com/send?phone=65…` (both accepted). No app change; nothing waits on a rebuild. Note for every probe on base.db: its AI-credits
  period predates October, so the first page view writes the month's `credits_renewed` bell rows (AI credits' lazy roll) — not a probe leak.
- **Integration round 2 (two existing probes timed out in P-F's area):**
  - `verify-pj-r4b.cjs` — an **app bug, fixed** (needs the rebuild): on a phone `.split` is a *wrapping* flex column, and a wrapping column's
    line is as wide as its widest item, so the chips' rail (514 natural) widened every stage card and the page to 530 at 390 — the "Something
    is not right" press then sat where Playwright couldn't press it. The filters wrapper now takes the column's width (`.filters { width: 100%;
    min-width: 0 }` in `project.module.css`, on the `data-slot="filters"` div in `portal-schedule.tsx`); the rail scrolls inside it. With that
    one rule injected (a scratch copy of the probe standing in for the rebuild): r4b 75/75.
  - `verify-pj-gap-d.cjs` — a **deliberate change** (CP-110): Ask the client reads the five-minute pace when it opens, so Send rests and the
    dialog says "Asked … — ask again after …" (`ask-block`) instead of a refusal snackbar after the press (WhatsApp now opens on the press, so a
    send the server would refuse is never started; the server still refuses). Section 9's step now asserts the dialog's line and the resting
    Send, marked `(parity map, CP-110 — a deliberate change of this rule)`: gap-d 65/65.
  - My own probe's sideways-scroll check missed the 530: with `isMobile` a wider page widens `innerWidth` to fit. `noOverflow` now measures
    against the visual viewport (60/60 with the fix injected). r4b's own "no sideways scroll at 390" has the same blind spot (left as is).

## Needs from others (the orchestrator wires these)
1. **`components/shell/skeleton.tsx` `QanvastSkeleton`** (no package owns it) — the strip has five tabs now: `[41, 82, 54, 65]` → `[41, 56, 82, 54, 65]`
   (Leads · Studios · Lead credits · Reviews · Hangouts) so the Leads page's ghost draws its strip (REG-708).
2. **The three Ask the client hosts** (not P-F's files) — use the new words, and optionally hand the lead over:
   `app/leads/[id]/overview.tsx` ~L921, `components/projects/project-overview.tsx` ~L175, `components/leads/questionnaire/lead-questionnaire.tsx`
   ~L91: `snackbar({ message: askedLine(lead.name, r) })` (`import { askedLine } from '@/components/leads/questionnaire/ask-client-dialog'`) in place
   of "{n} questions sent to {name}"; pass `leadId={lead.id}` to `<AskClientDialog>` (optional — without it the dialog finds the lead from its
   questions). The no-list branch's "Notification sent to {name}" is unreachable today (every host passes the list).
3. **P-G · `lib/notifications/delivery.ts`** — hold every message while `messagesPaused()` (`@/lib/platform`) is true (UC-082); the Studios row
   already says so. Suggestion: while `portalClosedByPlatform()`, `tellClient` (`lib/portal/client-messages-send.ts`, done/frozen) could hold
   client messages too (their links open the closed notice) — or leave them (the notice is calm and says whom to contact); the orchestrator's call.
4. **P-E · the studio's look at the client's Schedule** (the Schedule tab's client pane, `components/projects/schedule/**`) may show
   `pausedLine(stage.paused, now)` from `@/lib/portal/schedule-model` so the studio reads "Resuming around …" as the client does. The portal reads
   `resume_on` live — P-E's snapshot needn't carry it.
5. **Ghost anatomy** — `npm run design:anatomy` should take `/qanvast-ops/studios` once a server runs (no dialogs opened by C / F there).

## Repair text (for `scripts/repair-demo-data.ts`, idempotent)
CP-064 needs a Blocked stage with an expected restart to show "Resuming around …". The demo's one Blocked stage is Ryan's (P-2026-001)
*Electrical & plumbing*, waiting on the supplier's pressure-test sign-off, with no restart day. If P-E's own repair doesn't already set it:
```ts
/* (parity map, CP-064 · P-F) Ryan's Blocked stage says when it should pick up — four days after the repair first runs, local midnight; the
   client reads "Paused · Resuming around …" (no client note is invented: the waiting note stays the team's) */
{
  const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + 4)
  await db.run(sql`UPDATE project_milestones SET resume_on = ${Math.floor(day.getTime() / 1000)}
    WHERE status = 'blocked' AND resume_on IS NULL AND deleted_at IS NULL AND title = 'Electrical & plumbing'
      AND project_id = (SELECT id FROM projects WHERE number = 'P-2026-001')`)
}
// check: ['Ryan’s Blocked stage without an expected restart (parity map, CP-064)', `SELECT m.id FROM project_milestones m JOIN projects p ON p.id = m.project_id WHERE p.number = 'P-2026-001' AND m.status = 'blocked' AND m.resume_on IS NULL AND m.deleted_at IS NULL`]
```
Nothing else needs records: the chips show on Benjamin's seven stages, his three sent invoices fill the rail, the floor plan he was shown sits
under Floor plans, the open renders link holds a client pin, Olivia (not invited) shows the ask's invite, the usage tiles count what exists
(no client session in the baseline → 0 sign-ins, honestly).

## Stand-ins
- Qanvast Ops' operator = whoever opens it in the prototype (recorded by name).
- *Pause the studio's messages* sets `platform.messagesPaused`; the holding itself is P-G's delivery layer, and the prototype's outbox sends
  nothing out anyway.
- The client's emails (`client_questions`, `client_signed`) go through the house delivery layer's outbox — nothing leaves the machine.
- A file's kind on the client's Files is read by rule (folders, name, render link) — 2.0 stores none.

## Not finished, and why
- Needs 1 and 2 are other owners' files: until 1 lands, the Leads page's ghost strip draws four tab bones under five tabs; until 2 lands, the
  hosts' snackbar keeps "n questions sent to {name}" (true now — the client is told).
- `next build` was not run (the coordinator's build is current); the probe ran green on :3134 (above).
