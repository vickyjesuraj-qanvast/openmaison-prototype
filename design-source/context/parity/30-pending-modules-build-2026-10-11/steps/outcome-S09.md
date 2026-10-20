# S09 · Inviting your team — outcome (2026-10-11)

Card: `onboarding:team-invitations` (Inviting your team). 1.0 read: `src/components/settings/team-settings.tsx` (Invite Member's form, the
member row's *Invited* badge, Pending requests, Pending Invitations with Resend · Cancel · Expired), `src/lib/queries/invitations.ts`,
`src/app/api/invitations/send/route.ts` (the member made with the invitation, a UUID token, the SMS "You've been invited to join {studio} on
OpenMaison", the email `team.member_invited` "always send invite email to the invitee", owner-only Owner tag), `[token]/route.ts` (GET without
the token, 410 on expiry, PATCH resend = +30 days and the same token, "Reminder:", DELETE = cancelled), `accept/route.ts` (phone match, expiry),
`records/route.ts`, `hangout/route.ts`, `src/app/api/auth/verify/route.ts` (the first sign-in with that number accepts every pending
invitation), `src/app/api/auth/login/route.ts` ("You have a pending invitation"), `src/app/api/studio/members/request-add/route.ts` (the live
"request" emailed to four OpenMaison staff), `scripts/migrations/080_studio_invitations.sql` (the table, `expires_at` = now + 30 days),
`src/lib/notifications/{events.ts,templates/whatsapp.ts,templates/base/team.ts}`, `plans.max_members` (displayed, never enforced).
Register rows: `steps/reg-S09.md` (REG-S09.1…10). Probe: `design-source/verify/pending-modules/verify-pm2-s09.cjs` (**79 / 79**, twice back to
back on one server; a full `.dump` before and after the second run is identical); shots banked in `design-source/verify/pending-modules/pm2-s09/`.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| An invitation message to the new member (SMS, WhatsApp or email) with the sign-in link | **Built, on the house outbox (stand-in)** — Add member makes the member at once and sends an invitation: WhatsApp to their mobile, email to their address, each one outbox row (event `member_invite`, key `i:<invitation>:<send>:<channel>`) listed in Settings › Notifications › Sent messages as "To a new member · An invitation to join". The link is the invitation's own page `/join/<token>` (sign-in doesn't exist yet — S30). Nothing is really sent: the prototype's adapter records; a real provider is the developers' `setDeliveryAdapter`. The dialog says what it will send, live from what is typed | `lib/company/invitations.ts` (pure: the words, the states, the line) · `lib/company/invitations-server.ts` (`inviteMember` · `sendInvitation`) · `app/company/members-actions.ts` (`addMember`) · `components/company/members-view.tsx` · `lib/notifications/{outbox,delivery}.ts` · `app/notifications/outbox-actions.ts` · `app/settings/sent-messages.tsx` |
| 'Invited — hasn't signed in yet' on the member until their first sign-in | **Built** — an *Invited* chip (*Invitation expired* past its 30 days) and the row's invitation line: who invited them and when, how it went (read back from the outbox: sent · sent again · waiting to go · didn't go), how long the link stays open; a member never sent one (added before this step) reads "Hasn’t come in yet — no invitation was sent"; one with no mobile or email "not sent — add a mobile number or an email, then send it" | `inviteStateOf` · `inviteLine` · `fetchInvitationViews` · `members-view.tsx` (+ `.inviteRow` in its css) |
| Resend | **Built** — *Send again* (1.0's PATCH): the member's mobile and address as they are now (Edit details corrects a wrong number first), the window re-opened for 30 days, the same link, a "Reminder" message; *Send invitation* when it never went; *Copy link* to share it by hand | `sendMemberInvitation` · `sendInvitation` |
| Cancel | **Built, with Undo** — *Cancel invitation* (1.0's DELETE) takes the member out of the team as Deactivate does (never deleted; their seat free) and the link stops opening; Undo brings back the same invitation (same link, same window). Deactivated shows "invitation cancelled {date}" and *Invite again* (a new link). Deactivating an invited member any other way closes the invitation too, and its Undo opens it again | `cancelMemberInvitation` · `deactivateMember` (`released.invitation`) · `reactivateMember` · `inviteMemberAgain` · `cancelPendingInvitation` · `restoreInvitation` |
| Expires after 30 days | **Built** — `expires_at` (1.0's 30 days), read, never written as a status; the row and the page say so; Send again re-opens it | `inviteEndsAt` · `fetchJoin` |
| First sign-in with that number joins the studio | **Stand-in, honest** — joining is the member's first visit: the invitation page's **Join** (it accepts, then signs them in through View as's `is_you` — the page's caption says exactly that and that sign-in will ask for the mobile number ending ####), or the demo's other way in, View as, when the first-visit welcome closes. Either way the invitation is accepted and whoever invited them hears it (bell `member_joined`, opening Members on their row). S30's sign-in calls the same `acceptInvitationOf` | `app/join/[token]/*` · `app/join/actions.ts` (`joinStudio`) · `components/company/join/join-page.tsx` · `app/welcome-actions.ts` · `lib/notifications/model.ts` |
| 1.0 · roles on the invite, only an Owner invites an Owner | **Built** — the role is Add member's (the invitation carries it; the page says "as a Designer"); an Owner's invitation is only an Owner's to send again or cancel (an Admin reads it) | `inviteBlock` in `members-actions.ts` · `mayInvite` |
| 1.0 · `plans.max_members` (displayed, never checked) | **Said, never refused** (AI credits Q-13 keep 1.0; S19 holds seats against members) — the dialog's seats line when every seat is in use, the card's note while more members use the AI tools than the plan has seats, See plans for the Owner; Accounting takes none (REG-1669) | `members-view.tsx` |
| 1.0 · the live "Request member addition" (email to OpenMaison staff) · Pending requests | **Kept out** — 2.0's studio adds its own members (REG-646); nothing to request | — |
| 1.0 · a hangout's invitation (`hangout_event_id`, pre-registered) | **Kept for S27** (Hangouts) | — |
| 1.0 · the login refusal "You have a pending invitation" | **Kept for S30** (sign-in) | — |

Also: the invitation's page unfurls in a chat as the studio's card (`/card/join/<token>`, the link-card system's one new kind; the closed card
once it no longer brings anyone in); its loader draws its own ghost; the welcome names who invited them (`welcomeFor` `invitedBy`); Who may do
what's members row says invite; the bell's `?open=<id>` lands on the member's row; a bug fixed on the way — adding a member in Accounting said
"added as a Accounting" (now "added in Accounting", REG-S09.10).

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
- **Keep 2.0's direct Add member, and invite** (the card's Q1): the member is in every picker at once (as 1.0's self-serve flow created them
  with the invitation); the invitation is the message and the *Invited* state. Not "an invitation the person accepts before they exist" — a
  lead could not be put on them meanwhile, and 1.0 didn't work that way either.
- **WhatsApp and email** (Q2): 2.0 has no SMS; WhatsApp is the studio's channel and carries the mobile's message; email when there is one
  (1.0 sent both). Always on, like 1.0 ("always send invite email") — no new switch in Settings › Notifications, and the words are fixed
  (1.0's were in code).
- **Joining = the first visit**, by the invitation page's Join or (the demo's View as) the welcome closing — the same moment S08 records as
  the first visit, so *Invited* and the welcome never disagree. View as is the demo's sign-in, so viewing as an invited member is their first
  visit (S08 already treats it so).
- **The invitation's page** is the smallest honest shape: the studio, who, as what, one Join; its caption says Join opens OpenMaison as them
  until sign-in arrives, and that sign-in will confirm their mobile first. No pretend phone-code step (that UI is S30's).
- **Cancel = deactivate** (never delete; the house rule), with Undo; a cancelled invitee who never came in gets *Invite again* (a new link)
  rather than Reactivate.
- **The row's own grammar** — its line's text buttons (as Preferences · About page · Deactivate) — not a ⋮ the Members row doesn't have.
- **Seats**: said, never refused (Q-13 stands; S19's pricing call is untouched).
- **No demo invitation** — every demo member came in before invitations existed (R110); the state appears when the studio adds someone,
  backed by its own records. A member added in the app before this step gets no invitation written after the fact (it would claim a message
  that never went) — their row offers Send invitation.
- **No studio-wide activity log exists** for people (2.0 keeps `lead_events` per lead only): the invitation's own record (status, by whom,
  when) is read on the member's row and Deactivated, every message is in Sent messages, and the bell tells the inviter.

## What to check in the browser (production build; View as switches roles)
- **Dane (Owner), 1440** — Company › Members › Add member: type a name → "Add a mobile number or an email to send … an invitation"; a mobile
  → "by WhatsApp"; an email too → "by WhatsApp and email — … open for 30 days"; the seats line (Pro — Studio, 7 seats, 7 in use) — switch the
  role to Accounting and it goes. Add member → "… added and invited"; the row: *Invited*, "Invited by Dane on {today} · sent by WhatsApp and
  email · the link is open until {+30 days}", Send again · Copy link · Cancel invitation, no Deactivate; the card's "8 members use the AI tools
  and your plan has 7 seats." · See plans → Plans. Send again → "Invitation sent again …"; Copy link → paste it in a new tab: "Join Demo
  Studio" · Join → the leads, "Welcome, {name}" · "Dane invited you to Demo Studio’s team." — View as back to Dane: the bell's "{name} joined
  the studio" opens Members on their row (it pulses); the row is a plain member now. Settings › Notifications › Sent messages: "To a new
  member · An invitation to join". Cancel invitation on another → Undo; again without Undo → Deactivated "invitation cancelled …" · Invite
  again; the old link → "This invitation is no longer active".
- **Hui Min (Admin)** — manages a Designer's invitation, reads an Owner's (no buttons); the seats note names Dane as who changes seats.
- **Germaine / Michelle (Designers)** — read the chip and the line; no buttons, no seats note. An invited Designer's first visit (View as)
  gets the welcome naming who invited them; closing it joins them.
- **Someone added in Accounting** (as Dane; probe section 9) — "… added in Accounting — invitation sent by WhatsApp"; no seats line; the page reads "to keep the books"; Join lands on Finance ("Dane invited
  you to keep Demo Studio’s books").
- **390 / 320** — Members: the invitation line wraps its buttons under the words; Add member is a sheet with both notes; the invitation page
  fits with Join in reach; no sideways scroll (probe section 8).

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate 0093 + repair R112) with `next start -p 3160`; :3160 stopped after.
`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 17 warnings are older files'; this step's files lint clean) ·
`npm run design:lint` nothing new · `npx next build` green (its one warning, "Dynamic filesystem access" on `restoreBaseline`, predates S08b).

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s09.cjs`** (this step, 9 sections) | **79 / 79** — three runs, the last two back to back on one server: the page error log empty, the server log clean (no error, no "database is locked"); a full `.dump` before and after a run is identical |
| `settings-parity/verify-st-r1 · r2 · r3` (Who may do what · Members add / deactivate / reactivate · Settings) | 57 / 57 · 30 / 30 · 30 / 30 |
| `view-as/verify-view-as.cjs` · `view-as/verify-panel-order.cjs` | 23 / 23 · measures (View as 304 · Company 304 · Tools 318, exit 0) |
| `pending-modules/verify-pm2-s01 · s02 · s08 · s08b` (profile + Members pencils · link cards · the welcome · the lock harness) | 79 / 79 · 105 / 105 · 70 / 70 · 62 / 62 |
| `projects/verify-pj-gap-e.cjs` (the delivery layer, Sent messages) · `verify-pj-gap-h.cjs` (Sent messages' client rows) | 55 / 55 · 80 / 80 |
| `parity-map-build/verify-pm-g` (Sent messages paused) · `verify-pm-h` (Add member filled in from an ask) · `verify-pm-i` (Accounting) | 59 / 59 · 50 / 50 · 54 / 54 |
| `ai-credits/verify-cr-r1.cjs` (seats, Plans) | 59 / 59 |
| `ui-sweep/verify-sw-r4.cjs` (Settings › Notifications) · `consistency/verify-overlays.cjs` · `global-search/verify-search.cjs` | 35 / 35 · 67 / 67 · 27 / 27 |
| `uat-dane-2026-10-01/P2b` · `ux-build-2026-09-30/P6` (Add member's snackbars and fields) | 56 / 56 · 57 / 57 |
| `ghosts/verify-ghosts-measure.cjs` on Company › Members | every row Δ 0 |
| `npm run design:anatomy` (on the scratch `next start`, :3160) | all 1572 measures hold (73 pages, 245 table heads, 24 dialogs, 39 page menus) |

No existing assertion needed changing. The regression runner's lanes (`design-source/verify/regression/run.cjs`) ran on `RUN_DIR` with the
repaired `pbuild/base.db` as its base (never `prepare.cjs`, which copies local.db).

## Migration and repair
- **Migration 0093 `invitations_s09`** (additive): table `studio_invitations` (1.0's name and columns, plus the sends: `sent_at` ·
  `send_count` · `channels` · `cancelled_at` · `cancelled_by`), a unique index on `token` and one on `member_id`; added to `BASELINE_TABLES`
  (`lib/db/baseline.ts`) and `TABLES` (`scripts/snapshot-baseline.ts`) after `members`.
- **Repair R112** — writes nothing on the demo ("no invitations yet — the demo’s members all came in before them"); closes a waiting
  invitation on a deactivated member if one ever exists. Four checks (an invitation whose member is gone; two waiting for one member; one
  waiting on a deactivated member; an unknown status, or accepted / cancelled with no time). Full repair: all checks pass. Last R used: R112.
- The orchestrator's `db:baseline` after the step carries an empty `studio_invitations`.

## For the next steps
- **S30 (Signing in):** call `acceptInvitationOf(memberId)` on a member's first sign-in (1.0's verify route did); 1.0's login refusal for a
  number with a pending invitation ("You have a pending invitation…") comes with sign-in; the join page's Join becomes "confirm your mobile
  number" then the same accept — `joinStudio` (`app/join/actions.ts`) moves View as's flag today and is the one place to swap. The token is
  the permission on `/join/<token>`; a joined link signs the member in again in the demo — sign-in must replace that.
- **S27 (Hangouts):** 1.0's `hangout_event_id` on an invitation (pre-registering the designer) — add the column then.
- **S34 (Real services):** a failed invitation message reads "didn’t go — send it again" on the row; `sendRow` only raises `message_failed`
  for client messages — an invitation's final failure should tell its inviter. 1.0 limited sends to 10 a minute per IP.
- **S19 (AI credits):** the seats line and note read `planRow(planId).maxMembers ?? seats` against active members who open the workspace;
  if seats become enforced, Add member is where it would refuse (with the same words' "why" and See plans).
- **S31 (A new studio joins):** its first owner is not invited (they sign up) — no invitation row; invited members afterwards are.
- ⌘K's People results still open `/company/members` without `?open=` — Members now lands on a row with `?open=<id>` if a later step wants it.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock; built on Members' own row grammar, the house Dialog, the client links' bar and
   notice card, the house chip and text buttons; every invented line in REG-S09.1…7.
2. **One system, no one-offs** — the outbox (`deliver`), Sent messages, the link-card system, `MetaChip`, `Button` text buttons, `Icon`,
   `couldnt` / `refusalOf`, the house snackbar with Undo, `copyText`, `openPlans`, the ghost kit (`GhostSheet` · `Bone`), the signing page's
   bar and notice classes (composed, not copied); new CSS is three small rule groups; `design:lint` holds.
3. **Plain words** — "Invited", "Send again", "Copy link", "Cancel invitation", "Invite again", "Join Demo Studio", "This invitation has
   expired", "Dane invited you to Demo Studio’s team as a Designer."
4. **Nothing is lost** — cancel deactivates (never deletes) with Undo that restores the same link; records stay the member's; a member added
   before this step is never given a fake invitation; Sent messages keeps every message.
5. **Say why** — every state says what happened and what to do (expired → send again; not sent → add a mobile or an email); refusals in the
   rule's words ("Only an Owner invites an Owner", "Add a mobile number or an email for Lee Ann first"); the seats line says why without
   refusing; the page's caption says what Join does until sign-in.
6. **Back returns where you came from** — the bell's row lands on the member's row (`?open=`, the address then drops it); Join lands on the
   member's own first page; the welcome's button keeps S08's way back.
7. **Every screen is whole** — the join page has its own layout (snackbar host), loader with a ghost that sits on the page (probe: Δ 0 at 1440
   and 390), a notice for every state (never a 404), metadata and its chat card; Members keeps its ghost (no invited member on the demo).
8. **Every width is designed** — 1440 · 390 · 320 checked (probe section 8); the invitation line wraps its buttons under its words ≤767; Add
   member is a bottom sheet with both notes; the join card holds the 16px gutter.
9. **Tables follow the leads listing** — not applicable (no table added; Members' rows keep their layout).
10. **Motion with purpose** — none added; the row the bell opens pulses once (REG-575's look, already Members').
11. **Honest data** — every state comes from records (the invitation, the outbox's status, `welcomed_at`); no seeded invitations; the
    stand-ins (the outbox, View as) are named on screen where they act (the join page's caption) and in this outcome.
12. **Reach for everyone** — DS buttons (keyboard and focus), the page's notice is `role="status"` when it only informs, the chip and the line
    say the state in words (not colour alone), the Invite again / Send buttons have their names.

**How to add a missing thing:** one home (Company › Members; the invitation's page is the link the person opens, Sent messages its log, the
bell its door) · shown only when it applies (the line only for a member still to come in; the seats line and note only past the plan's seats;
buttons only for who may) · one filled button (the join page's Join; the dialog's Add member) · defaults that need no set-up (always on, no new
setting; the demo is unchanged until someone is added).
