# S27 · Hangouts (+ designer portfolio profiles) — outcome (2026-10-13, lane B)

Cards: `public:hangouts` — "Hangouts (meet-the-designer events)" (recommendation *needs his mocks / decision*, effort L; its questions "Are
Hangouts still run, and are they an OpenMaison feature or Qanvast's own tool?" and "If kept: build only the studio's part in Qanvast Ops ›
Hangouts …, and leave the homeowner page and staff console to the platform?") and `api:designer-portfolio-profiles` — "Designer portfolio
profiles" (recommendation *skip*: "It belongs with Hangouts if that is ever brought over"). His "build all of them" 2026-10-11 decides both, and
his direction for this step sets the shape: **the studio's side, and the public page as the studio's own** — "the public page carries the
studio's brand, never OpenMaison's, and nothing pretends a homeowner network exists — registrations arrive as leads through the existing capture
path". 1.0 read: `src/app/hangouts/[eventId]/page.tsx` (the homeowner's page, in full), `src/app/admin/hangouts/**` (Configuration ·
Registration · Live Meetings · Matching · Live Matrix · Analytics), `src/app/api/hangouts/**` (login · verify · session · preferences · score ·
meetings · start / end · transcribe · studio/[eventId] · studio/pre-register · admin/{events, homeowners, id-participations, lead, meetings,
portfolios, preferences, studio-participations, studio-view, vouchers}), `src/app/api/invitations/hangout`, `src/lib/queries/hangouts.ts`
(the studio hooks no screen mounts any more), `src/lib/hangouts/match-score.ts`, `src/lib/notifications/templates/base/hangouts.ts`,
`supabase/migrations/20240301000001_hangout_tables.sql`; `src/app/api/id-profile/**` · `src/app/api/id-profiles/records/**` ·
`src/components/id-profile/profile-editor.tsx` (never imported) · `src/lib/queries/id-profiles.ts`.

Carried notes taken: **S09** (an invitation carries `hangout_event_id` — built, REG-S27.2), **S16** (the Hangouts href in Qanvast Ops' `LIVE` —
REG-S27.1), **S26** (a hangout chat is never a second chat app — a Hangout "chat" here is a meeting at the studio's table; messaging the homeowner
is WhatsApp or the lead's own conversation in Messages through Open the lead), **S14** (the review link — under Who you'll meet when the studio has
one), **S02** (every public link has its link card — `kind: 'hangout'`), **S13** (the portal's About › Our team carries the card, faces through the
portal's own address), **S23** (a held chat is the lead's meeting; the meeting room's Past projects reads the team's work), **S10** (Maison AI
answers from the records on the list and the results), **S30** (no SMS sign-in — the booking's own link is the key).

Register rows: `steps/reg-S27.md` (REG-S27.1…15). Probe: `design-source/verify/pending-modules/verify-pm2-s27.cjs` — **155 / 155** (puts back every
table it touches, whole, and checks the leads' stages and stage logs are as found). Shots: `design-source/verify/pending-modules/pm2-s27/` (18:
1440 · 390 · 320 for the public pages).

## Pending lines ledger

| Card line (word for word) | Result | Where |
| --- | --- | --- |
| *hangouts:* "The homeowner's event page: SMS sign-in, preferences, 'we're matching' wait, the day's meetings with designer profiles and portfolios, AI insights after each meeting, voucher progress" | **Built as the studio's page** (his direction): `/hangout/[token]` — the studio's letterhead, the event, **Book a chat** with 1.0's preferences (kind of home, new / resale / renovated, budget, keys, area, styles) and consent; a booking is a lead and opens the homeowner's **own page** `/hangout/[token]/[reg]` — their chat with the designer's card and work (1.0's profiles and portfolios), **I'm at the table** (1.0's I'm Ready), after it what comes next by rule and the shared notes. **Stand-in:** *SMS sign-in* — the booking's own private link is the key (sign-in is the developers', S30); *"we're matching" wait* — none needed: the studio's own rule picks the designer at booking (the shift's designer furthest below their share), so the page says who and which table at once; *AI insights* — S23's brief made by rule, shared through S23's client notes link ("Read {first}'s notes"), never a model. **Kept:** *voucher progress* — Qanvast's cross-studio rewards (paused in 1.0), not the studio's to show | `app/hangout/**`, `components/hangouts/public/*`, `app/hangout/actions.ts` (`bookHangoutChat` · `readyAtTable` · `recordHangoutView`), `lib/hangouts/capture.ts`, `lib/hangouts/queries.ts` (`fetchHangoutPublic` · `fetchHangoutOwn`) |
| *hangouts:* "Staff console: events, shifts, studios and designers taking part, homeowner registration, preference matching (0–100 score), the live table board, outcomes, analytics, recordings and transcripts" | **Kept as Qanvast's** (the card's own question, answered as recommended: the staff console is Qanvast's platform admin, excluded from this programme). **What of it the studio needs is built on the studio's side:** the events and shifts arrive through **Qanvast's feed** (`lib/hangouts/feed.ts`, 1.0's shapes, one mapper — a real feed is the developers'); its designers taking part = the Plan; homeowner registration = the booking page and **Add a walk-in** at the table (1.0's desk registration); **the 0–100 score** (`computeMatchScore`, 1.0's weights and dimensions) on every chat; **the live table board** = Chats, refreshing itself on the day; **outcomes** = End / Change the outcome with 1.0's three and their reasons; **analytics** = How it went; **recordings and transcripts** = the chat's lead meeting (S23: Notes and recording, Write it up with a recording) | `app/qanvast-ops/hangouts/**`, `components/hangouts/*` |
| *hangouts:* "The studio's side (apply to an event, plan which designers attend, a designer's own meetings, upload a recording, turn a meeting into a lead): its hooks and routes exist in 1.0, but no screen uses them today" | **Built.** Apply / Take back (Undo) on Qanvast Ops › Hangouts; the **Plan** (who goes per shift, shares, who to meet + weights, Send the plan to Qanvast, Invite someone new); **a designer's own meetings** (Mine, Start, End, Take it, On a break); **upload a recording** — S23's: Notes and recording opens the lead's meeting, whose Write it up takes a recording while it has no brief; **turn a meeting into a lead** — every booking already *is* a lead (the capture path, source Hangout, a lead by that phone reused), and End writes the meeting and the next step onto it | `app/qanvast-ops/hangouts/actions.ts`, `components/hangouts/{hangouts-home,hangout-page,plan-view,meetings-view,results-view}.tsx`, `lib/hangouts/model.ts` |
| *hangouts:* "AI meeting transcripts and the homeowner's insights (Gemini, from audio). Nothing in current 1.0 records the audio." | **Stand-in (S23's):** a chat's notes typed or pasted at End make the lead meeting's brief by rule (`writeUpMeeting`); a recording goes in through S23's write-up and is transcribed there; the homeowner reads the notes only when the studio shares them (S23's client link). No model reads the audio — as in 1.0 today | `endHangoutMeeting` → `afterHeld` in `app/qanvast-ops/hangouts/actions.ts` |
| *hangouts:* "Two bell events: a homeowner registered, a meeting assigned" | **Built.** `hangout_registered` (the designer who meets them, Owners and Admins; in app + email on) and `hangout_meeting_assigned` (in app), rows in Settings › Notifications, their places in a member's own settings; plus the client's message `client_hangout` (their link, Email + WhatsApp) | `lib/notifications/model.ts`, `lib/notifications/personal.ts`, `lib/portal/client-messages.ts`, `lib/hangouts/capture.ts` `sendOwnLink` |
| *portfolio:* "Years of experience and specialisations on a designer's public card" | **Built.** `members.portal_years` ("{n} years in interior design"); specialisations = **Known for**, the member's specialty from Members (one home, up to three MetaChips) | `lib/portfolio/model.ts`, `components/portfolio/designer-card.tsx`, `components/portal/about/portal-about.tsx` |
| *portfolio:* "Portfolio projects with pictures per designer" | **Built.** `member_portfolio_projects` (name · where · kind of home · style · a line · the studio project it shows · order) and `member_portfolio_pictures` (up to eight, a cover, the source file kept when picked from a project) — read on the Hangout page, the homeowner's page, the portal's Our team and the meeting room's Past projects, each through its reader's own picture address | `lib/portfolio/queries.ts`, `app/company/work/[id]`, `app/hangout/[token]/work/[id]`, `app/my/[slug]/about/work/[id]`, `lib/meetings/queries.ts` |
| *portfolio:* "A screen to edit any of it (1.0 has none: its editor is dead code)" | **Built.** The member's **Public profile** page (Their card · Their work · How clients see it), from Members, Your profile and the plan; the About page dialog's fields moved into it | `app/company/members/[memberId]/profile/`, `components/portfolio/{public-profile-view,work-editor}.tsx`, `app/company/portfolio-actions.ts` |

## Found in 1.0, not on a card

| 1.0 | Result |
| --- | --- |
| `hangout_id_participations.capacity_percent` — each designer's share of the meetings (the admin's sliders) | **Built** — Share of the chats; the pick rule reads it |
| The studio's preferred customer profile and its six weights (`match-score.ts`, budget weighted first) | **Built** — Who you'd like to meet · What matters most; 1.0's score on every chat |
| A designer's table per shift (the Live Matrix) | **Built** — `tableFor`: the studio's tables shared out among the shift's designers in a fixed order |
| `studio/pre-register` + `api/invitations/hangout` — an invited designer pre-registered for the event | **Built** — Invite someone new from the Plan (S09's invitation, `hangout_event_id`), on the plan at once |
| `admin/lead` — a lead from a meeting, with duplicate detection | **Built differently** — the booking is the lead (house capture path); the same phone reuses its lead; the same number booking again returns their booking |
| The desk's registration (`admin/homeowners`, OTP given at the desk) | **Built** — Add a walk-in (no OTP: their link goes to them) |
| `promised_meetings`, the studio expectations, the customer profile on an event | **Built** — About this Hangout; Chats held "{n} of {promised}" |
| The homeowner's meeting confirmation (SMS + email) | **Built** — `client_hangout` through the delivery outbox (WhatsApp; email when given) |
| The Live Matrix refreshing every 5 s | **Built** — a 15 s pulse while the page is in view on the day (the house's quiet refresh), immediately on a press |
| `admin/vouchers` (unlock a voucher) | **Kept** — Qanvast's rewards, not the studio's |
| 1.0's homeowner link `/hangouts/<eventId>` | **Built** — redirects to the studio's page for that event (old-links doc row) |
| `admin/portfolios` (staff edit a designer's portfolio) | **Built on the studio's side** — the member's Public profile (Owners and Admins, and the member) |

## Decisions taken (as recommended — his "build all of them" 2026-10-11)

1. **The studio's side only, and the public page is the studio's** (the card's two questions): Qanvast Ops › Hangouts for the studio; the
   homeowner page in the studio's brand; the staff console stays Qanvast's.
2. **Qanvast's events through a feed, said so**: the demo's three are samples ("Sample" on each card, a line under the list). Qanvast confirms
   a place and gives tables through the same feed — the studio never confirms itself.
3. **A booking is a lead at once** (his direction: the existing capture path), held by the designer the rule picks; no matching wait.
4. **A held chat is the lead's meeting** (S23's one home for notes, briefs and recordings) and its next step a Follow-up task — never a
   second notes store. The lead stays at its stage (1.0 created the lead at intake); S23's "held before Met" offer applies on the lead.
5. **The card is one record, one page**: the Public profile replaces the About page dialog (H-Q22) — one home for a member's card and work.
6. **No SMS sign-in, no vouchers, no AI from audio** (stand-ins above).
7. **A held meeting is contact** — one rule (`lastContactOf`) for the listing's Last contact, the Lead stages card and the bell's untouched notice (REG-S27.12 · S27.14): the notice's words ("nothing logged") would otherwise be false.

## What to check in the browser (production build; View as switches roles; 1440 and 390)

- **Dane (Owner):** Qanvast Ops › Hangouts — three samples (today's Marina Bay first); Apply on One-North, Undo; open Marina Bay's **Chats** —
  Start Lim Wei Ling, End with Follow-up · Site visit needed and a few lines of notes → the snackbar's Open the lead shows the meeting (Meetings
  tab), the task "Arrange a site visit with Lim" and Activity's line; ⋮ › Give to Germaine on Rahul's chat; Cancel Chloe's, Undo; **Add a
  walk-in**. **Plan**: try taking Michelle off the morning (refused — her chat waits); **Your booking page ▾ › Open the page** — book as a
  homeowner (a new mobile) → your own page; back on Chats the booking is there (the bell too). **How it went** on Suntec. Company › Members ›
  Germaine's **Public profile** — change the years, Save, Undo; Add work (upload, or pick P-2026-002's pictures), Move earlier, Take it off, Undo.
- **Hui Min (Admin):** the same as Dane; Dane's Public profile — the photo says only an Owner changes it.
- **Germaine / Michelle (Designers):** Hangouts read-only ("An Owner or an Admin applies"); Marina Bay opens on **Mine** for Michelle (on
  the morning shift); On a break; Your profile › Your public profile — edits their own card, reads a teammate's.
- **Priya (Accounting):** Qanvast Ops › Hangouts and any Public profile — the house gate.
- **Public, any width (390 / 320 too):** `/hangout/<Marina's token>` (from Your booking page ▾ › Copy the link); a booking's own page; Stop taking
  bookings → "Bookings have closed"; Suntec's page → "This Hangout has ended"; `/hangouts/qh-2026-marina` → the page; an unknown token → the notice.
- The client portal (Benjamin, 9773 1968) › About › Our team: years, known for, their work.
- A meeting room (plan one on a lead) › Past projects: the team's work beside the studio's projects.

## Probes run (lane B, `next start -p 3170` on fresh repaired copies of base.db)

| Probe | Result |
| --- | --- |
| `pending-modules/verify-pm2-s27.cjs` (new) | **155 / 155** — §1 list · §2 plan · §3 the day · §4 results + the untouched notice + Last contact (one rule) · §5 public page + own page · §6 Public profile + portal · §7 Past projects · Maison AI · ⌘K · §8 390 · 320 · 768 touch, sheets, ghosts on the demo as found (16 measures, ±2 px: the list, Plan, Chats, How it went, a Hangout not taken part in, the public page, the own page, the profile — each at 1440 and 390) |
| `pending-modules/verify-pm2-s01.cjs` | **79 / 79** — updated (deliberate change): Members › Public profile is a page (the About page dialog's place); Our team's portrait picked by its own class (the card carries work pictures now) |
| `projects/verify-pj-gap-h.cjs` | **80 / 80** — updated (deliberate change): §7 through the Public profile page; Messages to clients **eighteen** events (+ `client_hangout`) |
| `pending-modules/verify-pm2-s02 · s09 · s13 · s14 · s16 · s26` | 105 / 105 · 79 / 79 · 65 / 65 · 69 / 69 · 56 / 56 · 107 / 107 |
| after the two fixes, on the final build: `verify-pm2-s05 · s10 · s18 · s23 · s01`, `ux-build-2026-09-30/P2/verify-p2.cjs` (the probe that reads Last contact; its own fresh copy) | 113 / 113 · 107 / 107 · 63 / 63 · 147 / 147 · 79 / 79 · 73 / 73 — unchanged assertions |
| `global-search/verify-search.cjs` | 27 / 27 (its own copy) |
| `ghosts/verify-ghosts-same.cjs` — **the eight S27 routes (added)** + qanvast · qanvast-studios · co-members · co-profile(-from) · leads · lead-overview, 1440 and 390 touch | **every loader its reveal (0.00 %)** |
| `ghosts/verify-ghosts-measure.cjs` — `/company/members` (7 rows); the S27 list's cards, the chats' cards, the plan's 7 people, the public pages' and the profile's cards, 1440 and 390 | Δ 0 on the first screen (≤ 1 px at 390); only a last card below the fold varies with its designers' bios |
| `npm run design:lint` | ✓ nothing new (inline-style back to 42 after the card ghost's face moved to its stylesheet) |
| `npm run design:anatomy` (the S27 routes added) | 86 pages · 270 heads · 26 dialogs (C now opens Add a walk-in and Add work there) · 41 menus — all 1717 measures hold |
| `tsc --noEmit`, `eslint app components lib` | clean (0 errors; `scripts/demo-floor-plans.mjs` has one unused variable already in the main tree — not this step's) |

## Migration and repair

- **Migration 0104** `drizzle/0104_hangouts_s27.sql` (generated, additive): eight tables (`hangout_events` · `hangout_shifts` ·
  `hangout_participations` · `hangout_designers` · `hangout_registrations` · `hangout_meetings` · `member_portfolio_projects` ·
  `member_portfolio_pictures`), `members.portal_years`, `studio_invitations.hangout_event_id`. In `BASELINE_TABLES` and `snapshot-baseline.ts`
  `TABLES`. `restoreBaseline` moves a Hangout still ahead of (or on) the snapshot's day, with its shifts, by the demo-day shift.
- **Repair R144** (lane B's range R144…R159; **R145 is the next free**): the three sample events through the feed's mapper, the plans, pages,
  five bookings (Nur Aisyah — R45's Hangout lead — and Kelvin Goh held at Suntec as their leads' meetings with briefs, objection lines and
  follow-up tasks; Lim Wei Ling, Chloe Tan, Rahul Menon today), the cards and work of Dane, Germaine, Michelle and Sarah. Six closing checks; a
  second run changes nothing. Note: R144 moves Nur Aisyah's `created_at` to her booking time (three days ago).

## For the next steps

- **The developers:** a real Qanvast feed calls `feedStatements(rowsFromFeed(payload), now, newId)` (`lib/hangouts/feed.ts`); sending the plan
  (`sendHangoutPlan`) and applying (`applyToHangout`) are where Qanvast's API goes; the client link goes through `deliver()` (their adapter).
- **S30 (sign-in):** the homeowner's page is a private link; if the portal sign-in ever covers Hangout homeowners, `/hangout/[token]/[reg]`
  is the page it opens.
- **Meetings (held, REG-552):** if Meetings get their mocks, a Hangout chat's held meeting is already one of them.

## Shared pieces changed

- `components/qanvast/qanvast-tabs.ts` — `QANVAST_HANGOUTS_HREF`, Hangouts in `LIVE` (S16's note).
- `lib/notifications/model.ts` (two events, rules, templates), `lib/notifications/personal.ts` (their places), **`lib/notifications/queries.ts`
  — `derivedDue` asks `fetchContactedLeadIds`** (the listing's rule) for the untouched notice (REG-S27.12 · S27.14).
- **`lib/leads/queries.ts` — `lastContactOf` counts a meeting held** (`RowParts.held`, `heldMeetings`, "{where} · Meeting held"), and the new
  `fetchContactedLeadIds` (REG-S27.14).
- `lib/portal/client-messages.ts` — `client_hangout`.
- `lib/link-cards/model.ts` · `queries.ts` (kind `hangout`), `lib/links/old-links.ts` (the doc row), `lib/nav.ts` (`fromLabel`: Hangout ·
  Hangouts · Public profile), `lib/global-search/model.ts` (Go to: Hangouts · Your public profile), `lib/leads/activity.ts` (the hangout branch).
- `lib/meetings/queries.ts` · `portfolio.ts` — Past projects reads the team's work.
- `lib/portal/about-model.ts` · `about.ts` · `components/portal/about/*` — Our team's years, known for and work.
- `components/company/members-view.tsx` — the row's *About page* (dialog) is now **Public profile** (a page): Owners and Admins for anyone, a
  member for themself (Accounting members keep theirs when an Owner or Admin opens it); `components/company/company-ghosts.tsx` follows.
  **Deleted** `components/company/member-portal-dialog.tsx` + `.module.css`; `app/company/about-actions.ts` lost `setMemberPortal` /
  `restoreMemberPortal` (now `savePublicCard` / `restorePublicCard` in `app/company/portfolio-actions.ts`, the same rules + years).
- **Moved** `app/company/members/page.tsx` and `loading.tsx` into the route group `app/company/members/(list)/` (so the profile route streams
  its own ghost, REG-708) — the lane is not a git repo, so it is a plain move: **at merge, `git mv` them**.
- **Moved** `app/hangout/[token]/page.tsx` and `loading.tsx` into `app/hangout/[token]/(page)/` (its loader wraps its page only, REG-708) —
  a plain move too: **`git mv` them at merge**. `app/qanvast-ops/hangouts/[eventId]/page.tsx` redirects so the address names the view.
- `components/hangouts/ghost-lines.tsx` (new, `GhostLines`) and `.ghostLines` in the S27 stylesheets — the ghosts' wrapped paragraphs.
- `components/profile/your-profile-view.tsx` · `your-profile-ghost.tsx` — the *Your public profile* link.
- `lib/db/schema.ts`, `lib/db/baseline.ts`, `scripts/snapshot-baseline.ts`, `scripts/repair-demo-data.ts` (R144), `scripts/design-anatomy.mjs`
  (the S27 routes).
- Probes: `verify-pm2-s01.cjs`, `verify-pj-gap-h.cjs` (each change commented "(pending modules S27, a deliberate change of this rule)");
  `ghosts/verify-ghosts-same.cjs` gains the eight S27 routes.

## Fixed before merge (the coordinator's two, 2026-10-13)

1. **One ghost per page (REG-708, the house rule).** Every S27 page's `loading.tsx` and its `PageReveal` now draw the **same** ghost — no
   ghost sets the record's words any more (`HangoutsGhost`, `HangoutGhost`, `HangoutPublicGhost`, `PublicProfileGhost`, `DesignerCardGhost`
   take no record). Each is drawn from the page's own classes: the labels the page always prints in its own words (`Words`, the chips' fixed
   choices), data as bars — a paragraph that wraps is one element of its page class holding its lines (`components/hangouts/ghost-lines.tsx`
   `GhostLines`, the modules' `.ghostLines`; a line drawn only in a phone's column or only at a desk), tuned to the demo's shapes. A Hangout's
   page draws its shape **from the address alone**: the route now always names the view of a Hangout the studio takes part in (and none for one
   it doesn't — a server redirect keeps `?from=`), so the loader knows the view. The booking page's `page.tsx` + `loading.tsx` moved into the
   route group `app/hangout/[token]/(page)/` so its loader no longer wraps the homeowner's page (REG-708's one-loader-per-page). Added the
   eight S27 routes to `ghosts/verify-ghosts-same.cjs`: **every loader is its reveal, 0.00 %, at 1440 and at 390 touch**; the S27 probe's
   ghost-vs-page measure (16 measures, every element of the page's classes on the first screen, ±2 px) lands on the demo as found; and
   `verify-ghosts-measure.cjs` on the lists' cards, the plan's people, the public pages' cards and the profile's cards gives Δ 0 on the first
   screen (the last card below the fold varies with the designers' bios — ±20–40 px, never in view while it loads).
2. **Last contact agrees with the bell — one rule.** `lastContactOf` (`lib/leads/queries.ts`) now counts a meeting held (a Hangout chat at the
   table, S23's meeting) beside the contact logs and the Contacted entries, as **"{where} · Meeting held"**; the listing's Last contact, the
   Lead stages card's line, the export, Maison AI's untouched lists and the New lead's brief ("No contact yet") all read it; and the bell's
   untouched notice now asks the same function (`fetchContactedLeadIds`) instead of its own query — so the two can never disagree. (The Lost
   dialog's "n of 3 contacts logged" still counts logged contacts — its words are about logs.) Nur Aisyah's Lead stages card now says
   "In person · Meeting held" (probed). The probes that read contact state (P2's columns, S05 · S10 · S18 · S23) stay green unchanged.

## Flags for Vicky

1. **The About page dialog became the member's Public profile page** (H-Q22's dialog → one page with the card and the work). Doors: Members'
   row, Your profile, the plan.
2. **A Hangout lead stays at its stage after a held chat** (1.0 created the lead at intake). End could offer Move to Met (S23's offer) — his call.
3. **R45's Nur Aisyah now has a Hangout story** (booked at Suntec's table by Dane, met, follow-up "Needs second meeting"); her `created_at`
   moved to her booking time. S05 · P1's uses of her still pass.
4. **No SMS sign-in** (the private link), **no vouchers**, **no AI from audio** — the stand-ins above; the staff console is Qanvast's.
5. **Invented copy** throughout (every row's list in `reg-S27.md`) — no mock exists beyond the tab's name.

## Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins, exceptions written down** — only the tab's name is mocked; every screen is the smallest thing on the house pieces, every
   invented word in REG-S27.1…11, the calls flagged above.
2. **One system, no one-offs** — PageHeader / PageHeaderL2, Tabs, the lead Overview's Card, Chips / ChipRail, MetaChip, StatTiles, the card
   table, Dialog, PortalMenu + DropdownItem (sheets on a phone), TextField, the sm Switch, EmptyState, LeaveGuard, MemberPhotoField, the client
   links' letterhead and the meeting link's column (composed), LinkGone, the ghost kit (+ `GhostLines`, one helper for every S27 ghost); a
   card's rules kept beside its words (`*-words.ts`); one contact rule for the listing and the bell; tokens only.
3. **Plain words** — "Book a chat", "I'm at the table", "Who goes", "Share of the chats", "Who you'd like to meet", "What matters most",
   "Send the plan to Qanvast", "On a break", "Add a walk-in", "Public profile", "Their work", "How clients see it".
4. **Nothing is lost** — Undo on Apply, Take back, cancel a chat, stop taking bookings, the card's save, a piece of work and a picture taken off;
   a refused tick goes back; 1.0's old homeowner link lands; a booking again returns the booking.
5. **Say why** — a full shift offers no more; taking off someone with a chat waiting says so; a Designer sees who applies; an Owner's photo says
   only an Owner changes it; Send / Save refusals name the rule; a closed or ended page says so in the studio's name.
6. **Back returns where you came from** — every door carries `?from=` (the Hangout's page, the profile, See them in Leads, Open the lead, Notes
   and recording); `fromLabel` names the place.
7. **Every screen is whole** — the shell, **one ghost per page drawn by its loader and its reveal alike** (ghosts-same 0.00 % at 1440 and 390
   touch; the probe's measure lands on the page), the empty states, the gate for Accounting, the error route on the public page; the probe's
   page-error log is empty.
8. **Every width is designed** — 1440, 768 touch, 390 and 320 (public pages) with no sideways scroll against `screen.width`; chips ride one
   rail on a phone; menus and the work viewer are bottom sheets.
9. **Tables follow the leads listing** — the one table (By designer) is the house card table; everything else is cards and rows.
10. **Motion with purpose** — only the house pieces' own motion.
11. **Honest data** — every state is a record (R144 through the app's own writers and the feed's mapper; samples say so); nothing pretends a
   homeowner network; the fit is 1.0's formula; the next step by rule; "has had contact" is one rule, so Last contact and the bell agree.
12. **Reach for everyone** — every icon-only control named (More actions for {client}'s chat, the work tiles' "{work} — see its pictures", the
   viewer's Previous / Next and ← →); the scopes are radio groups, the shift ticks toggle buttons; C presses Add a walk-in on the chats and Add work on the profile, the list keys walk the chats; links
   that open a new tab say so.

**How to add a missing thing:** one home (Qanvast Ops › Hangouts for the studio, the booking page for homeowners, the Public profile for a
member's card; doors elsewhere), shown only when it applies (Apply while places are left, Start on the day, the break switch for those on today's
shifts, the review link and WhatsApp when the studio has them), one filled button per view (Open today's chats · Send the plan to Qanvast ·
Start / End the chat · Book my chat · Save changes), defaults that need no set-up (an even share, 1.0's weights, the client link on).
