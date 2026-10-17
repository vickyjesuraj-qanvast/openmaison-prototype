# Package H — tickets, chat, client messages, About / Team · outcomes (gaps build, Phase B, 2026-10-08)

Brief: `scratchpad/build2/brief-h.md` · the short read `h-read.md` (calls H-Q1…H-Q27) · port 3129 · repair R86 · probe
`design-source/verify/projects/verify-pj-gap-h.cjs` · register rows `reg-h.md` (REG-h.n).

Status words: **Built (code)** = written, tsc clean · **Verified** = the probe passed on it at 1440 and 390.

| # | Item (brief) | Outcome | What / where |
|---|---|---|---|
| 1 | Tickets — the client reports, follows, closes | Verified | Portal **Issues** tab (`issues` section switch; `PORTAL_TABS`), `app/my/[slug]/issues` (+ loading), `components/portal/threads/portal-issues.tsx` (Report an issue: what it is about · a subject · what happened · up to 5 photos; a card per issue with its state and New reply; the issue in the house Dialog with its thread, a reply that reopens a Resolved one, Close for whoever reported it with Undo; `?open=`), `app/portal/tickets-actions.ts` (`reportIssue` · `replyIssue` · `closeIssue` · `reopenIssue` · `openIssue` — `portalActor({ section: 'issues' })`), reads `lib/portal/threads.ts` (no internal note, no studio-only line), photos in Files › Tickets (`lib/projects/thread-photos.ts`, E's storage) opened by the portal's file route (`PORTAL_FILE_RULES` + `isClientTicketFile`), client bell `issue_reply` |
| 2 | Tickets — the studio's list per project and studio-wide; assign, reply, resolve, escalate | Verified | Project **Tickets** tab (`PROJECT_TABS`, `[tab]/page.tsx`, ghost), `components/projects/tickets/*` (cards; Open · Resolved and closed · All; the house Drawer: report, facts, Looked after by (PortalMenu), Mark resolved (closing line) and Escalate (note) dialogs, Reopen, the thread with internal notes and state lines, To the client · Internal note), New ticket (the studio raises one); **Projects › Tickets** `/projects/tickets` (+ loading, ghost; the Projects header's *Tickets (n)* button); actions `app/projects/tickets-actions.ts` (`mayChangeProject`, refusals `{ error }`, Undo on resolve · assign · escalate); reads `lib/projects/tickets.ts`; bell `ticket_raised` · `ticket_client` · `ticket_assigned` · `ticket_escalated`; Needs attention `ticket_escalated` · `ticket_waiting` (kept after handover); the tab's count; ⌘K kind `ticket`; Activity `project_ticket_*` (chip Tickets); Who may do what rows |
| 3 | Ticket categories in Settings | Verified | Settings › Projects › **Ticket categories** (`components/projects/tickets/ticket-categories-setting.tsx`, Lead sources' grammar: counts, a rename that carries the tickets in `ListEntryDialog`, retire / remove with Undo, add); `setTicketCategories` · `renameTicketCategory` · `ticketCategoryCounts`; settings key `ticket_categories` (1.0's eight words, each kept) |
| 4 | Chat — one conversation per project, portal + project (+ the rail's Chat) | Verified | Project **Messages** tab, portal **Messages** tab (`messages` switch), the rail's **Chat** → `/chat` (the list beside the open conversation; one at a time ≤1024) and the phone bar's chat glyph; the house comment thread (`components/projects/threads/thread.tsx`: avatar · name · time · words · photos, the New rule, You, Remove with Undo), the composer (Enter sends, 3 photos), the latest 200 + Show earlier, a check every 8 s while open, read marks `chat_reads`; actions `app/projects/messages-actions.ts` · `app/portal/messages-actions.ts`; bell `chat_message` (15-minute quiet window) · client bell `message`; rail badge `/chat`; tab count; Activity one line a day (chip Messages) |
| 5 | Automatic client messages through E's delivery layer | Verified | `lib/portal/client-messages.ts` (7 events, the words, defaults: Email on for six, WhatsApp off, the team's message off), `client-messages-send.ts` (`tellClient`: everyone the home's portal is open to, the portal live and the section on, through `deliver`, keyed `c:<event>:<ref>:<person>:<channel>`), `client-tells.ts` (one call per sender) hooked into invoice sent · payment recorded / confirmed · contract sent / link shared / bundle · quote or VO sent for the answer · schedule shared · update out (D's `tellTeam`) · ticket reply / resolve · team message (one an hour); Settings › Notifications › **Messages to clients** (`app/settings/client-messages-settings.tsx`: switches, words with Insert a field and a preview), `app/notifications/client-messages-actions.ts`; Sent messages lists them (`SentEvent`) |
| 6 | About and Team on the portal, behind a section switch | Verified | Portal **About** tab (`about` switch; withheld while empty — `fetchPortalLook`), `app/my/[slug]/about` (+ loading, picture route), `components/portal/about/portal-about.tsx` (cover, Est., story, Our work, Our team, awards + the brand kit's badges, Get in touch, Follow us); Company › Profile › **About the studio, for clients** (`components/company/about-card.tsx`: year, the story in the in-house rich editor, awards, up to 6 photos with Make cover / Remove + Undo); Company › Members › **About page** (`member-portal-dialog.tsx`: shown, title, two lines, portrait); `app/company/about-actions.ts`, `lib/portal/about*.ts`, `studio_pictures`, `members.portal_*` |

## Progress log
- Sync done; base tree `pkg-h/base-tree.txt` = 51b7fa470e96015bddc3df15992c294aec0e6daa. node_modules cloned; scratch DB `pkg-h/test.db` from base.db.
- Short read written (`h-read.md`).
- Schema: tables `project_tickets` · `ticket_replies` · `project_messages` · `chat_reads` · `studio_pictures` (both baseline lists), `members.portal_shown ·
  portal_title · portal_bio · portal_photo_id`; migration generated locally as `drizzle/0078_overconfident_madame_masque.sql` (renumber at the merge), applied.
- Server layer: models `lib/projects/tickets-model.ts` · `messages-model.ts` · `lib/portal/client-messages.ts` · `about-model.ts`; reads `lib/projects/tickets.ts` ·
  `messages.ts` · `thread-photos.ts` · `tickets-search.ts` · `lib/portal/threads.ts` · `about.ts` · `client-messages-send.ts` · `client-tells.ts`; actions
  `app/projects/tickets-actions.ts` · `messages-actions.ts` · `app/portal/tickets-actions.ts` · `messages-actions.ts` · `app/company/about-actions.ts` ·
  `app/notifications/client-messages-actions.ts`; routes `app/company/picture/[id]` · `app/my/[slug]/about/picture/[id]`.
- Screens written for all six items; tsc clean; eslint 0 errors on the touched areas.
- R86 written (+7 checks; the event-kind check knows `project_ticket_*`): on a fresh copy of base.db 78 → 0, every check passes.
- Built on :3129; looked at every new surface at 1440 and 390 (`pkg-h/looks/`). Fixed from the looks: the ticket card (a button) drew the UA's
  border — `border: 0`, its studio's-turn edge kept with the card's own inset rule; the thread's avatars took the member's tint (tickets' lines carry
  it now, `tintMap`) and the member's own initial (not "Y" for You); "Germaine gave it to Germaine" → "Germaine took it on"; /chat named the client
  twice (the project's name already holds it) and folds Open project to its glyph on a phone; the portal About's cover took the gallery's 4:3 (its
  own button class now) and the story's bullets were reset; Our team became compact cards (72px portrait beside the words); the email subject
  "your agreement to sign — waiting on you" → "Waiting on you: …"; the New rule no longer vanishes on the refresh that follows a read; the
  household's reads of Germaine's answers are in R86 (Benjamin's bell unchanged by the demo).
- design:lint: four new findings fixed (a raw font-weight, two raw corner radii, an inline background — now a `--tint` custom property); holds.
- eslint (app components lib): 0 errors, the 9 old warnings. tsc clean.
- Probe `verify-pj-gap-h.cjs` run 1: 17/18 (the probe's own locator — the resolve dialog sits inside the drawer's DOM); run 2: **65/65** at 1440, 390
  and 320, the DB left as found. Shots banked in `design-source/verify/projects/gap-h/` (12).
- Regression, each on a fresh copy of the repaired scratch DB, one build, :3129: r1 83/83 · r2 83/83 · r3 86/86 · r4a 73/73 · r5 90/90 · r6 79/79 ·
  r7 62/62 · r8 65/65 · fix-B 53/53 · fix-C 49/49 · fix-D 35/35 · fix-E 50/50 · fix-F 44/44 · gap-a 66/66 · gap-b 72/72 · gap-c 96/96 · gap-d 64/64 ·
  gap-f1 81/81 · gap-g 67/67; three stopped short, none on a rule broken by mistake:
  - **r9** 64/65 — it read "7 of 7 on" on Company › Client portal's What clients can see; H adds three switches on purpose (Messages · Issues ·
    About us). The check now asserts the rule — every section on, `(\d+) of \1 on` — not the count (probe changed, line 118).
  - **r4b** 74/75 — REG-1050: Files ends More on the phone's bar. H's tabs had gone after Files; they now go before it (as G's Floor plan did) —
    the app changed, not the probe.
  - **gap-e** 53/54 — its /f signed link needs `AUTH_SECRET` on the server (E served with one); the run script now sets it.
- Rebuilt with the Files-last order and the Profile ghost's About card; on fresh copies: r9 65/65 · r4b 75/75 · gap-e 54/54 · gap-h 65/65 ·
  gap-d 64/64 · gap-g 67/67 · r4a 73/73. Every Projects probe passes on this tree. Shots re-banked from the last gap-h run.
- design:anatomy (its route list gained the project's Messages and Tickets tabs, Projects › Tickets and /chat): 55 pages, 1,148 measures hold.
- tsc clean; eslint 0 errors (9 old warnings); design:lint holds. :3129 stopped.

Status: **done** — 6 of 6 items Verified, 0 not built, 0 moved.

## Not built, and why
- *Show chat history* (1.0 I-10 · I-38) — H-Q16: the conversation is the home's; someone from the household sees all of it, as they see its
  schedule and files. `homeowner_lead_links.chat_history_visible` stays for the data port.
- 1.0's ticket AI analysis and Proactive Alerts (unbacked / a constant empty list), footer links Privacy · Terms · Contact (a legal set-up 2.0 has
  not got), YouTube embeds on About (M-212), typing signs, searching messages — H-Q27.
- The Client access panel's "What {client} can see" has no Messages / Issues rows yet (its `ACCESS_SECTIONS` registry is D's; the sections show in
  Company › Client portal and the portal itself) — a small follow-up if the owner wants them.
- The phone's portal bar keeps REG-1050's four (Home · Schedule · Updates · Money): Messages, Issues and About sit in More, before Files.

## For the map (CLAUDE.md) and the other packages
- Tables `project_tickets` · `ticket_replies` · `project_messages` · `chat_reads` · `studio_pictures`; `members.portal_shown · portal_title ·
  portal_bio · portal_photo_id`; settings keys `ticket_categories` · `client_messages` · `studio_about`; portal sections `messages` · `issues` ·
  `about` (`about` is also withheld while empty — `fetchPortalLook`); migration generated as `drizzle/0078_overconfident_madame_masque.sql`.
- Any sender that reaches the client: `tellClient` (lib/portal/client-messages-send.ts) or a one-line helper in lib/portal/client-tells.ts —
  keyed `c:<event>:<ref>:<person>:<channel>` in the outbox; `Outbound.event` is `EventKey | ClientEvent` (delivery.ts), the log's `SentEvent`.
- A thread anywhere: `components/projects/threads/thread.tsx` (`ThreadLines` · `ThreadComposer`), photos through `lib/projects/thread-photos.ts`.
- Lines changed in others' files (minimal, appended where the protocol says): `lib/db/schema.ts` (members + five tables), both baseline lists,
  `lib/portal/sections.ts` (three keys), `lib/portal/model.ts` (three tabs before Files), `lib/portal/queries.ts` (`fetchPortalLook` hides an
  empty About), `lib/portal/files.ts` (two file rules), `lib/portal/notifications-model.ts` + `notifications.ts` (two bell kinds),
  `lib/notifications/model.ts` (five events + words + `{ticket}`), `lib/notifications/delivery.ts` · `outbox.ts` · `app/notifications/outbox-actions.ts`
  · `app/settings/sent-messages.tsx` (client events in the log), `lib/leads/events.ts` · `lib/projects/events.ts` (six kinds), `lib/leads/activity.ts`
  (tickets branch, the days of messages), `lib/projects/tabs.ts` (two tabs, two chips), `app/projects/[id]/[tab]/page.tsx` (two branches),
  `components/projects/project-ghost.tsx`, `lib/projects/queries.ts` (tab counts, ticket attention facts and hrefs), `lib/projects/attention.ts`
  (two reasons; a completed project keeps them — `afterHandover`), `lib/leads/tasks.ts` (`railBadges` '/chat'), `components/shell/app-rail.tsx` ·
  `mobile-nav.tsx` (Chat live), `components/projects/projects-workspace.tsx` + `projects-ghost.tsx` + `app/projects/(list)/page.tsx` (the Tickets
  button), `lib/global-search/model.ts` · `queries.ts` (kind `ticket`), `lib/settings/permissions.ts` (four rows), `app/settings/page.tsx` ·
  `settings-view.tsx` · `projects-settings.tsx` · `notifications-settings.tsx` · `settings.module.css` (`.footSpacer`), `components/company/profile-view.tsx`
  · `members-view.tsx` · `company-ghosts.tsx`, `app/company/profile/page.tsx`; senders: `app/projects/money-actions.ts` (invoice sent),
  `payment-actions.ts` (recorded · confirmed), `schedule-actions.ts` (shared), `updates-actions.ts` (`tellTeam`), `app/contracts/actions.ts`
  (send · share link · bundle), `app/quotes/actions.ts` (`sendQuoteForConfirmation`); `scripts/repair-demo-data.ts` (R86 + 7 checks + the event-kind
  check), `scripts/design-anatomy.mjs` (four routes). Probe changed on purpose: `verify-pj-r9.cjs` line 118 (every section on, not seven).
- F2 (the books) runs beside H: H's only lines in money are one `await tellInvoiceSent(invoiceId)` after `project_invoice_sent`'s log in
  money-actions.ts and two `await tellReceipt(…)` after the payment logs in payment-actions.ts (+ their imports).
