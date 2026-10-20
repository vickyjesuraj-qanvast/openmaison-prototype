# S18 · Notifications — outcome (2026-10-12, lane A)

Card: `held:notifications` (recommendation "needs his mocks / decision"; questions "Open the digest and a personal mute now?" · "Rename the
bell's 'Updates' group?"), Leads Q-42 · Q-43 opened as recommended — his old holds lifted for this card. Carried notes taken: **S09** (a
finally-failed invitation doesn't ring the inviter's bell), **S10** (Maison AI could answer "what did I miss today?" from the digest's own
rows), **S02 / S04** (Viewed stamps never come from chat fetchers — the summary's links are studio pages, never a client link; nothing here
stamps Viewed). 1.0 read: `src/app/api/cron/notification-digest/route.ts` (hourly; 8 AM studio time; unread in-app rows of the last 24 h in the
digest categories, one email per member, rows marked sent; the retry sweep), `src/lib/notifications/resolve-recipients.ts` (fixed + role
recipients, junction fan-out, `targetedOnly`), `dispatch.ts` (critical events instant, digest-mode emails held, the pause), `preferences.ts`
(`notification_preferences` per studio × category × channel: enabled · digest_mode · recipient_roles), `events.ts` (`isCritical`),
`channels/email.ts` (the digest hold), `components/settings/notification-settings.tsx` (In app · Email · Digest · Recipients per category),
`components/layout/notification-drawer.tsx`. Register rows: `steps/reg-S18.md` (REG-S18.1…9). Probe:
`design-source/verify/pending-modules/verify-pm2-s18.cjs` (**63 / 63**, twice back to back on one server — a full `.dump` before and after the second run is identical; the server log clean); shots in `design-source/verify/pending-modules/pm2-s18/`.

## Pending lines ledger

| Card line (word for word) | Status | Where |
| --- | --- | --- |
| "Daily digest email — held · Q-42 left blank, so it fell to hold · revisit: per-event email is built; a once-a-day summary is the quiet option owners expect" | **built** — a member's own *A daily summary* on Your profile › Your notifications: one email at 8 AM with the unread notices since the last one and what is due, built from their bell's own rows; urgent emails still at once; Send one now · Read it; Sent messages lists it | `lib/notifications/{personal,summary,summary-server,prefs-server,due-line}.ts`, `lib/notifications/{emit,queries,delivery,outbox,model}.ts`, `app/notifications/{personal-actions,actions,outbox-actions}.ts`, `components/profile/your-notifications.tsx`, `app/settings/sent-messages.tsx` |
| "Choose who hears each notice — held · Q-43 left blank, so it fell to hold · revisit as a personal mute only (today an event can be switched off only for the whole studio)" | **built** — a personal mute: *Choose what reaches you* lists the notices that can reach that member (by area, by the recipients each is raised for), a switch each; a muted notice never reaches them (no bell row, email or WhatsApp), a muted reminder leaves their Due list | `lib/notifications/personal.ts` (`EVENT_PLACE` · `mayReach`), `lib/notifications/emit.ts`, `lib/notifications/queries.ts` (`fetchFeed`), `components/profile/your-notifications.tsx` |
| "Email and WhatsApp really sent; the timed reminders (T−30, the 09:00 hold ping) arrive only when the bell is opened — stand-ins · developers' lane" | **stand-in** (kept the developers') — nothing leaves the machine: the outbox adapter records, a real provider is `setDeliveryAdapter`; the sweep that would run `deliverDerived` / `releaseHeldMessages` for every member is S34's card (`api:message-delivery-providers`, same line). This step adds the daily summary to what that sweep runs (`sendDueSummaries()`), and until it exists the summary goes on the first read from 8 AM (the bell, Sent messages, Your profile) — said in its record's time | `lib/notifications/summary-server.ts` (the PRODUCTION note) |
| "The bell's 'Updates' group shares its name with a project's Updates tab — his open call (N-14)" | **built, as recommended — flagged for Vicky**: the bell's notices are headed **Notices** (Due stays; order and badge unchanged); one constant to change if he picks another word | `components/shell/notifications-panel.tsx`; `ux-build-2026-09-30/P7/verify-p7.cjs` (a deliberate change) |

**Carried notes:** S09's — **built**: an invitation that can't go after its last try tells whoever sent it (else Owners and Admins), opening
the member's row (`lib/notifications/delivery.ts` `sendRow`); S10's — **built**: Maison AI's "What did I miss?" (`lib/maison-ai/answers/notices.ts`,
intent `missed`).

**Found on the way, fixed:** the bell's due line read "Due in 29 min" for a project task due days ahead (REG-S18.7); "A new lead is untouched"
said "the delay below" of a delay that lives under Lead management (REG-S18.8); Accounting's bell foot opened a Settings page that lands them on
Finance (the foot now opens Your profile, REG-S18.1).

### Found in 1.0, not on a card
- **The bell's All / Unread pills** (`notification-drawer.tsx`) — already decided: parity map UC-075 "changed" (REG-604 · REG-1549: Notices · Due,
  Mark all as read, approvals in the row). Not built.
- **`/api/notifications/whatsapp-status`** (warns an admin when WhatsApp isn't configured on the platform) and **`recipient-allowlist.ts`** (a
  demo deployment emails only allow-listed addresses) — the real providers' admin and safety: **for S34**.
- **`/api/notifications/schedule` + `cancel-scheduled.ts` + `scheduled-reminder-channels.ts` + cron `notification-scheduled`** (reminders stored
  ahead and cancelled) — 2.0 derives every reminder from its date (`derivedDue`), so nothing is stored to cancel; the sweep is S34's.
- **1.0's studio-wide digest per category and recipient roles per category** — replaced, as the card recommends, by each member's own summary
  and mute (the studio's per-event channels stay in Settings › Notifications). A studio-wide "everyone gets a digest" switch is not built.
- **`dedupe.ts`** (the same notice to the same person within a window dropped) — 2.0 raises a notice once per action and keys every message
  (`n:` · `d:` · `i:` · `s:`); no window needed.
- **`log-hub.ts` · `admin/notifications`** — platform admin (excluded). **`homeowner/notifications`** — the portal's bell (built).
  **`notification-template-editor`** — Message wording (built). **`customer_notification_preferences`** — the client messages' settings (built).

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
- **One home for a member's own choices: Your profile › Your notifications** (S01's page for everything that is the member's); the studio's
  channels stay Settings › Notifications'. The bell's *Notification settings* is the door (it is the member's bell), Settings' Events table
  points there, ⌘K finds it.
- **A personal mute only**, per notice, not per channel (the card: "revisit as a personal mute only"): one switch = it reaches you or not.
  Email noise is the summary's job; WhatsApp follows the studio's switches. Every notice is mutable — approvals still wait in Needs you, the
  Tools badges and To do.
- **The list shows only what can reach you**, read off each notice's recipients (a Designer never sees the Owner's or the runners' notices;
  Accounting never a lead's); a notice the studio has off shows off and says why.
- **The summary is the member's own** (1.0's was per studio category): one email at 8 AM (1.0's hour), unread notices since the last one (the
  first looks back 24 h, 1.0's window) **plus what is due** — the bell's two groups, so it is the bell in one email. Nothing to say, no email
  (1.0's rule). The urgent emails still come at once (1.0's `isCritical` list, mapped, and 2.0's events of the same kind — `URGENT_EVENTS`).
  WhatsApp is not summarised (1.0's digest was email only).
- **When it goes:** the first summary goes at the next 8 AM after choosing it — never on the switch (1.0's cron never sent on a setting
  change); *Send one now* is the demo's way to read one at once and counts as today's.
- **"Notices"** for the bell's group (N-14) — the smallest answer; flagged for Vicky.
- **No demo opt-ins** (R117 writes nothing): every demo member hears exactly what they heard before; the state appears when someone chooses it,
  backed by its own records.

## What to check in the browser (production build; View as switches roles; 1440 and 390 touch)
- **Dane (Owner), 1440** — the bell: *Due* and *Notices* (no "Updates"); a project task due tomorrow reads its day, not "Due in 29 min";
  *Notification settings* → Your profile scrolled to Your notifications, Back says Leads. *Choose what reaches you* → eight areas; switch off
  "A task is overdue" → "Muted for you: A task is overdue"; Done → "1 muted: A task is overdue."; the bell's Due list has no overdue tasks;
  switch it back. Settings › Notifications: the Events table's line ends "… on Your profile." (a link). ⌘K "daily summary" → Your notifications.
  Maison AI › "What did I miss?" → "14 notices, 12 due" with the rows and *Your notifications*.
- **Sarah (Designer)** — her list has no "A new lead arrives", "AI credits are running low" or "A large send waits for your OK"; *A daily
  summary* → "Your first summary goes tomorrow at 8 AM." (after 8); a comment from Dane lands in her bell "· in your daily summary" (with
  Settings' Email on for comments); *Send one now* → "Your summary went to sarah@demostudio.sg — …" · Read it; Settings › Notifications
  (read-only) → "Your profile" still opens her card; Sent messages lists only her own summaries.
- **Hui Min (Admin)** — as Sarah, plus the runners' notices; choose the summary, and the next morning's first read sends it.
- **Priya (Accounting)** — the card reads "— its Owners and Admins set it." (no link to a page she can't open); her list: the money notices
  and her tasks, never a lead's.
- **390 / 320** — Your profile and Settings › Notifications have no sideways scroll; What reaches you is a bottom sheet with Done in reach; the
  bell's sheet has Notification settings.

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate 0097 + repair R117) with `next start -p 3160` (lane A); :3160
stopped after. `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (16 warnings, all in older files) · `npm run design:lint`
nothing new · `npx next build` green under the build lock (its one warning, "Dynamic filesystem access" on `restoreBaseline`, predates S08b) ·
`npm run design:anatomy` on :3160 — all 1578 measures hold (73 pages, 245 table heads, 24 dialogs, 40 page menus).

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s18.cjs`** (this step, 9 sections) | **63 / 63** — three times; the last two back to back on one server, `.dump` identical; page error log empty |
| `projects/verify-pj-gap-e.cjs` (the delivery layer, Sent messages) | 55 / 55 |
| `projects/verify-pj-gap-h.cjs` (Sent messages' client rows, Messages) | 80 / 80 (one run 79 / 80: "Messages ?compose=1: the composer is focused" — a focus-timing check under load, unrelated; green on its rerun) |
| `parity-map-build/verify-pm-g.cjs` (Sent messages paused, held sends) | 59 / 59 |
| `pending-modules/verify-pm2-s01 · s09 · s10 · s14 · s16 · s17` (Your profile · invitations · Maison AI · Settings · the shell · the ghosts) | 79 / 79 · 79 / 79 · 107 / 107 · 69 / 69 · 56 / 56 · 130 / 130 |
| `ux-build-2026-09-30/P3` (task comments are heard) · `P7` (the bell's groups — **updated**: "headed Notices", a deliberate change) | 91 / 91 · 89 / 89 |
| `uat-dane-2026-10-01/P5b` (the bell's group order; its label reworded) | 56 / 56 |
| `ui-sweep/verify-sw-r4` (Settings › Notifications) · `settings-parity/verify-st-r1 · r2 · r3` | 35 / 35 · 57 / 57 · 30 / 30 · 30 / 30 |
| `global-search/verify-search` · `view-as/verify-view-as` · `view-as/verify-panel-order` (measures) | 27 / 27 · 23 / 23 · exit 0 |
| `keyboard/verify-kb-r1 · r2` · `consistency/verify-overlays` | 35 / 35 · 29 / 29 · 67 / 67 |
| `ghosts/verify-ghosts-same` (1440) · `verify-ghosts-same` (390 touch) | 51 / 51 · 51 / 51 |
| An invitation's final failure (a harness on a scratch DB: a failing adapter, `retryMessageNow` on an invitation's last try) | the inviter (Hui Min) told once — "The invitation to Probe Invitee could not be sent · WhatsApp · tried 4 times — send it again or copy the link", opening `/company/members?open=…`; nobody else |

The Leads round's `verify-leads-{a…d}.cjs` and parity round 2's `verify-parity-r2.cjs`, which CLAUDE.md's Map names, are not in the repo
(they were never banked); their bell rules are covered by ux-p3 / ux-p7 / dane-p5b / st-r* above. The regression lanes ran through
`design-source/verify/regression/run.cjs` with `RUN_DIR` holding the repaired base as `base.db` (never `prepare.cjs`, which copies local.db).

## Migration and repair
- **Migration 0097 `notifications_s18`** (additive, schema-only, generated in the lane): `ALTER TABLE members ADD notice_email text`,
  `ADD notice_email_at integer`, `ADD notice_muted text`. No new table (nothing for `BASELINE_TABLES` / `TABLES`).
- **Repair R117** — writes nothing on the demo; tidies unknown choices; three checks (closing list). Full repair on the scratch base: all
  checks pass, twice (idempotent). Last R used: **R117** (lane A's range R117…R139).

## Files (lane A — the lane is not a git checkout, so the list is here for the merge)
- **New:** `lib/notifications/personal.ts` · `summary.ts` · `summary-server.ts` · `prefs-server.ts` · `due-line.ts`;
  `app/notifications/personal-actions.ts`; `components/profile/your-notifications.tsx`; `lib/maison-ai/answers/notices.ts`;
  `drizzle/0097_notifications_s18.sql` + `drizzle/meta/0097_snapshot.json` (+ the journal's entry); `design-source/verify/pending-modules/verify-pm2-s18.cjs`
  + `pm2-s18/*.png`; `steps/reg-S18.md` · `steps/outcome-S18.md`.
- **Changed:** `lib/db/schema.ts` (members' three columns); `lib/notifications/emit.ts` · `queries.ts` · `delivery.ts` · `outbox.ts` · `model.ts`;
  `app/notifications/actions.ts` · `outbox-actions.ts`; `app/settings/sent-messages.tsx` · `notifications-settings.tsx` · `settings-ghost.tsx`;
  `lib/settings/copy.ts`; `components/shell/notifications-panel.tsx`; `components/profile/your-profile-view.tsx` · `your-profile-ghost.tsx` ·
  `your-profile.module.css`; `lib/company/your-profile.ts`; `lib/global-search/model.ts`; `lib/maison-ai/intents.ts` · `answer.ts`;
  `scripts/repair-demo-data.ts` (R117); probes `design-source/verify/ux-build-2026-09-30/P7/verify-p7.cjs` (assertion) ·
  `uat-dane-2026-10-01/P5b/verify-p5b.cjs` (a label only).

## Shared pieces changed
- `components/shell/notifications-panel.tsx` (the shell's bell): the group word, the foot's target, the summary line on a row, `dueLine` moved
  to `lib/notifications/due-line.ts` (re-exported from the panel). No style change.
- `app/settings/sent-messages.tsx`: its message detail is the exported `MessageAsSent` (Your profile reuses it). No visible change.
- `lib/notifications/model.ts`: `FeedRow.due` · `FeedRow.summary`; two event lines (`untouched`, `message_failed`).
- `lib/maison-ai/intents.ts` · `answer.ts`: the `missed` intent (lane B's steps may touch Maison AI — merge by hand if both add intents).
- No `components/om/*`, shell layout or `app/globals.css` change.

## For the next steps
- **S34 (Real services):** the sweep runs `sendDueSummaries()` with `deliverDerived` and `releaseHeldMessages` (1.0 ran its digest hourly and
  sent at 8 AM studio time — the studio's timezone is the server's local time today); 1.0's `whatsapp-status` warning and its recipient
  allow-list for non-production deployments are yours; a failing provider now reaches an invitation's sender (exercised with a failing
  adapter on a scratch DB — the prototype's adapter never fails).
- **S22 (Dashboard):** "What did I miss?" (`missedAnswer`) and the summary's parts (`summaryParts` over `fetchFeed`) are the bell in one list —
  a Dashboard card can read them.
- **S30 (Signing in):** a member's choices are on their row (`members.notice_*`), so they follow the member, not the browser.
- **S31 (A new studio joins):** nothing to seed — a new member hears what the studio sends until they choose otherwise.
- **The UAT** (orchestrator): the bell's group word changed (Updates → Notices) in any step that names it; the bell's *Notification settings*
  now opens Your profile.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock for notifications' personal settings; the card is built from Your profile's own cards,
   the house chips, the Dialog and the contract Automation's switch rows; every word is in a register row marked invented copy; the bell's
   new word is flagged for Vicky.
2. **One system, no one-offs** — house pieces only (Chips, Dialog / bottom sheet, the DS sm Switch, HelpLink, the snackbar with `key`, the
   ghost kit, the menu group label); the message detail is Sent messages' own (`MessageAsSent`); the summary goes through the one delivery
   layer; the due line is one function for the bell and the email; `design:lint` holds (nothing new).
3. **Plain words** — "What reaches you", "As they happen", "A daily summary", "Muted for you: …", "Nothing to sum up — …"; the summary email
   speaks the bell's own lines.
4. **Nothing is lost** — a mute keeps the rows already received; a switch is its own undo and a refused save puts it back; Send one now never
   replaces today's summary; muting never deletes anything.
5. **Say why** — a notice the studio has off says "Off for the whole studio — Settings › Notifications"; the summary chip without an email
   says what it needs (and the server refuses with the same words); a bell row says when its email waits ("in your daily summary").
6. **Back returns where you came from** — the bell's door carries `?from=`; HelpLinks carry it; Your profile's Back names the origin.
7. **Every screen is whole** — the card is in Your profile's loader and its reveal (the reveal draws the member's own state); the probe's
   page error log is empty; the dialogs have the house head and foot.
8. **Every width is designed** — 390 and 320: no sideways scroll on Your profile and Settings › Notifications (against `screen.width`); What
   reaches you rises as a bottom sheet; the summary line's buttons wrap under its words.
9. **Tables follow the leads listing** — no new table (the mute list is a card's switch rows; Sent messages unchanged).
10. **Motion with purpose** — no new motion (the house Dialog / sheet).
11. **Honest data** — no seeded opt-ins; every summary is a real outbox row built from the member's real bell; the bell says which email
    waited; the 8 AM stand-in is said in the outcome and in the record's time.
12. **Reach for everyone** — every switch is labelled ("{notice} — reaches you"); areas are headings; the chips are a radio group with arrow
    keys; the dialog traps and returns focus; links are real links.
- **How to add a missing thing** — one home (Your profile), doors elsewhere (bell foot, Settings pointer, ⌘K, Maison AI); shown only when it
  applies (only notices that can reach you; the summary line only in summary mode; no studio link for Accounting); no filled button added to
  a row; defaults need no set-up (As they happen, nothing muted).
