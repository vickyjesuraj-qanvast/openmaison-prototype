# S26 · Team and group chats — outcome (2026-10-13, lane B)

Cards: `studio:team-chats` — "Chats: team and group conversations" (recommendation *needs his mocks / decision*, effort M; its question "Do
studios need team chat inside OpenMaison, or is WhatsApp enough?") and `api:messages-free-chats` — "Messages: free chats and groups"
(recommendation *skip*, held by H-Q11; its question "Do studios need one team chat that is not about a project (a studio-wide 'Team' room)?").
His "build all of them" 2026-10-11 decides both: built, in 2.0's shape — **one list, one composer, never a second chat app**. 1.0 read in full:
`src/app/(main)/inbox/page.tsx`, `src/components/inbox/*` (chat-list · chat-list-item · conversation-header · context-panel · message-thread ·
message-bubble · message-input · new-chat-panel · ai-suggestions · emoji-data), `src/app/api/chats/records/**` (conversations · participants ·
messages · [id] PATCH), `src/app/api/chat/upload/route.ts`, `src/lib/transformers.ts` `transformChat`, `supabase/migrations/…08_messaging.sql`
· `…10_chat_features.sql`, `src/lib/access-control.ts` (inbox: owner · id), and every door into it (`?chat=`, `?newChat=`, `?draft=` from the
meeting brief, the quick action "Draft Message", the bottom nav's Chats, `chat-highlights.tsx`, `home-widgets.tsx`, `keyboard-shortcuts.ts` i).

Carried notes taken: **S23** (a meeting posts its brief to the Team conversation — built, REG-S26.14), **S16** (G then M opens Messages — unchanged;
New message is the page's C), **S18** (the new notice `member_message` has its place in `EVENT_PLACE` — The studio · team; a member's own mute
holds), **S10** (Maison AI here acts — two suggestions), **S09** (an invited member's room unread starts at their invitation), **One home per
thing** (the word is *Messages*, `/chat` its one home; every new door opens it), **the P-G privacy rule** (proved in the probe, §7).

Register rows: `steps/reg-S26.md` (REG-S26.1…16). Probe: `design-source/verify/pending-modules/verify-pm2-s26.cjs` — **107 / 107** (puts back every
table it touches, whole, and checks the leads' stages and stage logs are as found). Shots: `design-source/verify/pending-modules/pm2-s26/` (17).

## Pending lines ledger

| Card line (word for word) | Result | Where |
| --- | --- | --- |
| *team-chats:* "One-to-one chats between members" | **Built.** New message › A member › — one press opens the two of you (one conversation per pair, `pair_key`; the same press again opens the same one); titled by the other; Direct chip; the other hears `member_message`; someone who left the studio keeps the messages, nobody writes into it | `app/chat/actions.ts` `startDirectChat`, `lib/projects/studio-chats.ts`, `components/projects/messages/new-conversation.tsx`, `chat-inbox.tsx` |
| *team-chats:* "Group chats with a name" | **Built.** New message › A new group: a required name (1.0's "Required") and the people on the house member picker; you are in it; its first line says who started it with whom; each person added hears it; Rename with Undo | `createGroupChat` · `renameGroupChat`, `NewGroupDialog`, `conversation-details.tsx` |
| *team-chats:* "A chat about a lead before it has a project, or about nothing in particular" | **Built.** *A lead before a project:* every lead's own **Team conversation** (`conversations` kind `lead`; its door the Collaborators' Team chat row on the lead and the project, the phone's Client Info too; its members hear `team_message`; Activity's day lines; once Won the project's Team conversation reads it first). *Nothing in particular:* the studio's room, two people, groups. (A lead's own client conversation before Won was P-G's, UC-064 — New message › A client now starts it for any lead.) | `lib/projects/studio-chats.ts` `leadTeamLines`, `lib/projects/messages.ts` `chatLines` (the team merge), `components/leads/detail/info-column.tsx`, `app/leads/[id]/overview.tsx`, `components/projects/project-frame.tsx`, `lib/leads/activity.ts`, `lib/leads/purge.ts` |
| *team-chats:* "Pinned chats; attachments other than photos" | **Built for the new kinds** (P-G built them for the client and project-team conversations, UC-066 · UC-070): Pin · Mute · Copy link on every members' and lead-team conversation (`conversation_prefs` by key); Photo · File · Voice note · A contact · emoji in the same composer; a members' file kept with the conversation (`conversation_files`), opened for its people only (`/chat/file/<id>`) | `app/projects/messages-actions.ts` (`sendInConversation` · `uploadMessageFile` branch by kind), `lib/projects/thread-photos.ts` `keepChatPhotos` · `takeChatFilePiece`, `app/chat/file/[fileId]/route.ts` |
| *team-chats:* "Reply suggestions" | **Built for members** (the client side's were P-G's UC-068): a teammate's table by rule, only where a reply is owed — always between two people, in a group, the room or a Team conversation only when the line asks or names you; a tap fills, never sends. **Stand-in:** a rule table — no model reads the message (1.0's was a fixed list too, labelled AI) | `lib/projects/suggested-replies.ts` `suggestTeamReplies` · `unansweredTeamLine`, `conversation.tsx` |
| *free-chats:* "A chat with any phone or contact, or with a lead who was never invited (2.0: every conversation belongs to a home, H-Q11)" | **Built** for a lead never invited: New message › A client opens any lead's or project's conversation the viewer sees; not on their page yet, the composer says so and offers **Invite to Portal** in place (the Client access panel); the messages wait for them. **Kept** for "any phone or contact": 1.0's chat with a typed number reached nobody (no SMS or WhatsApp behind it) — 2.0 never pretends to deliver; a client writes on their page, anyone else is WhatsApp (the composer's A contact card carries Call and WhatsApp; the lead page's WhatsApp opens on the press) | `NewMessageMenu` · `PickLeadDialog` (`label`), `conversation.tsx` (the hint's door), `ClientAccessPanel` |
| *free-chats:* "New Group with hand-picked people; studio-wide team chats not tied to a project" | **Built.** New group (above) with hand-picked members; **the studio's room** "Everyone at {studio}" — every active member who opens Messages, always in the list (made with its first line), its line rings everyone in it but the writer and whoever muted it; Accounting is in none (1.0's inbox was owner · designer) | `chatInbox` · `chatPeople` (`lib/projects/studio-chats.ts`), `rowFor` (`app/projects/messages-actions.ts`) |
| *free-chats:* "Add or remove a conversation's members by hand" | **Built** for groups: Details › Add people · Take out (1.0's rule: a Designer never takes an Owner or an Admin out) · Leave the group — each remove with Undo, each change a line in the group. **Kept** for a lead's or a project's Team conversation: its people are the record's members, changed on the lead or the project (one home — Details links there); two people stay two (Start a group with them); the room is everyone (mute it) | `addToGroupChat` · `removeFromGroupChat` · `leaveGroupChat` + Undos, `conversation-details.tsx` |
| *free-chats:* "All · Unread · Escalations filters (2.0 sorts unread first; tickets have their own place)" | **Built** All · Unread, plus who it is with — Clients · Team (the house chips under the list's search). **Kept** Escalations: 1.0's were conversations labelled "escalation"; 2.0's are tickets, with their own place (Projects › Tickets — one home) | `INBOX_FILTERS` · `keepsRow` (`lib/projects/messages-model.ts`), `chat-inbox.tsx` |
| *free-chats:* "The Docs · Media · Links view of a conversation's shared files (2.0 files them in Files › Messages)" | **Built** for every conversation: Details › Shared in this conversation — Media · Docs · Links read from every line (photos, videos, voice notes · documents · the addresses in the words and a shared place), each opening in a new tab; a lead's or project's ends with **All in Files › Messages**. Links needed links: an address in any line's words now opens | `app/chat/actions.ts` `conversationShared`, `conversation-details.tsx`, `components/projects/threads/thread.tsx` (`Words`) |
| (question) "Do studios need team chat inside OpenMaison, or is WhatsApp enough?" · "…one team chat that is not about a project?" | **As recommended under his "build all of them":** yes — the room, two people, groups, and a lead's Team conversation; WhatsApp stays the way to anyone outside the studio and its clients | REG-S26.1 |

## Found in 1.0, not on a card
- **Read receipts** — 1.0 drew two ticks under every own line whoever had read it (`message-bubble.tsx`). **Built honestly:** "Seen" / "Seen by …"
  under one's own newest line from each reader's read mark (REG-S26.8).
- **"Send via Chat"** on the meeting brief (`/inbox?draft=…`) — a dead door in 1.0 (the inbox never read `draft`). **Built** as Share with the team
  (the brief to the lead's Team conversation, REG-S26.14); the follow-up to the client keeps S23's WhatsApp and Copy.
- **Quick action "Draft Message"** (→ /inbox) — **built** as ⌘K › Create › New message (REG-S26.12).
- **The lead drawer's Chat** (`?newChat=phone&leadId=` — made a conversation with the client's phone that reached nobody) — its 2.0 form is the
  lead's own conversation (P-G) and New message › A client; the lead's Portal row keeps its Messages door.
- **The header's Call and Video call** — Video call was a dead button; Call dialled the conversation's phone (empty for members' chats). **Not
  carried:** a member's phone is on Company › Members and on A contact's card (Call · WhatsApp); a client's on their lead.
- **Online / offline status** (always "Offline" — 1.0 had no presence) — not carried (it would claim something the app doesn't know).
- **Archive** (a dead row in 1.0's panel) — not carried (P-G's call; Mute and Leave do the job).
- **`chat-highlights.tsx`** (the last five messages on 1.0's project page) — 2.0 answers it in the project's Needs you (a client's message
  waiting → Reply) and the Client tab's count; no second card (one home).
- **The home widget "View messages"** (`home-widgets.tsx`) — for **S22** (Dashboard): a door into Messages, never a second list.
- **Coach marks for /inbox** — guided tours are parked by him (S32).
- **`conversation_participants.external_phone` / `is_external`, `conversations.context_label`, `messages.status`** — not carried (outside
  numbers reach nobody; 2.0's chips and read marks do their jobs).
- **Keyboard `i` → /inbox** — S16's G then M.
- For **S41b**: nothing else in 1.0's inbox folders.

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
- **One home:** every conversation lives in Messages (`/chat`); the doors are New message ▾ (C, ⌘K's Create), the Collaborators' Team chat row
  (lead · project · phone sheet), the meeting room's Share with the team, Maison AI, ⌘K's Messages scope. No rail change, no new page.
- **A lead's Team conversation** rather than "groups about a lead": the project's Team conversation already is the team's talk about a project,
  so a lead gets the same piece from its first day and Won carries it on (one record, two chapters); groups and two people are about anything.
- **Members only** in members' conversations (never a client, never a typed number); **Accounting** in none (1.0's access list; they open no
  Messages). An Owner doesn't read two other members' conversation.
- **Privacy by construction:** the studio's own lines live in tables no client page reads (`conversation_messages`, `conversation_files`);
  the portal builds its own keys and never parses one it is sent; the client's bell reads `project_messages` channel client only.
- **A Team conversation's count is its people's** (REG-S26.5) — a deliberate change of P-G's row rule, so a Designer's rail no longer counts
  other teams' talk.
- **Bytes on the row** for a members' file: the lead files' byte store has a foreign key to a lead's file, so it can't hold them (found when
  the demo's picture refused to store — fixed before any run).

## What to check in the browser (production build; View as switches roles; 1440 and 390)
- **Dane (Owner)** — Messages: the list reads HDB 5-Room (unread), Everyone at Demo Studio · STUDIO, Serena Koh · TEAM, Germaine · DIRECT,
  Site team · GROUP, Benjamin's TEAM, Serena Koh · LEAD, Ryan. Chips All · Unread · Clients · Team. **New message ▾** (or C): A member › Hui Min
  → write; again → the same conversation. A new group: Create with nothing → both errors; name + Germaine + Sarah → it opens with its line.
  The **(i)** glyph → Details: Rename (Undo), Add people, Take out (Undo), Media · Docs · Links. Site team's Media holds the mood board; the
  room's Links holds hdb.gov.sg. A client → Cheryl Lim → "Cheryl isn’t on their page yet · Invite to Portal". Mute the room (⋮).
  Serena Koh's lead → Collaborators › Team chat · Messages; her Activity's "messages in the team chat". Benjamin's project → Client › Messages ›
  Team → (i) → "Change who is on the project". Kevin Ng's meeting → ⋮ › Share with the team → Undo. ⌘K "laminate", "Site team", "new message".
- **Hui Min (Admin)** — the two of you with Dane, unread with suggestions; reply → Dane's line reads "Seen" before.
- **Germaine / Michelle (Designers)** — Germaine in Site team: no Take out on Dane; Leave the group → Undo. Michelle can't open a group she's
  not in.
- **Priya (Accounting)** — Messages is the house gate; no member list offers her; no room line reaches her.
- **390 / 320 / 768 touch** — the list, one conversation at a time, New message and Details as bottom sheets, no sideways scroll.

## Probes run (lane B, `next start -p 3170` on fresh repaired copies of base.db)
| Probe | Tally | Note |
| --- | --- | --- |
| `pending-modules/verify-pm2-s26.cjs` (new) | **107 / 107** | twelve sections: one list (chips, the rail's count = unread rows, filters, C, a link in a line, Maison AI acts, ⌘K Create), two members (the pair, the bell and the quiet window, Seen only after opening, replies by rule, her answer's bell), a group (errors, its line, the bells, Details, Rename · Add · Take out · Leave with Undos, 1.0's take-out rule as a Designer, an outsider can't open it), the room (mute, who hears it, Accounting's gate and file 404, its people, Links), Docs · Media (a PDF through the +, the file rule for someone not in it), a lead's Team conversation (the door, its bell to its members only, Activity, Won carries it on with the rule, ⌘K finds it, ⌘K never finds two others' words, a group by name, a leaver's conversation), **privacy** (Serena's and Benjamin's pages, her home, the portal file route, no client message queued), a client never invited (the picker, the hint's Invite to Portal, the panel), the meeting's Share with the team + Undo, 390 · 320 · 768 touch, the doors and the notices' lists (project Collaborators, the Team conversation's Details, Settings › Notifications, Your notifications, the phone's Client Info), the ghost at 1440 and 390, no page errors, the DB as found |
| `projects/verify-pj-gap-h.cjs` | **80 / 80** | was 79 / 80 at the start: "Messages to clients: sixteen events" — **stale since S23** added `client_meeting`; updated to seventeen as S23's deliberate change (commented) |
| `parity-map-build/verify-pm-g.cjs` | **59 / 59** | P-G's conversations, Pin · Mute, the lead's conversation, sending |
| `pending-modules/verify-pm2-s16.cjs` · `s18` · `s23` | **56 / 56 · 63 / 63 · 147 / 147** | G M; Your notifications (the new notice); the meeting room (its ⋮ gained a row) |
| `lead-project-parity/KE/verify-ke.cjs` · `projects/verify-pj-gap-a.cjs` · `projects/verify-pj-r1.cjs` | **31 / 31 · 72 / 72 · 98 / 98** | the Who column's words; the info column's sections |
| regression `search` · `kb-r1` · `kb-r2` | **27 · 35 · 29** | ⌘K (a new Create row, messages of new kinds), the keys (C on Messages) |
| regression `ghosts-same` · `ghosts-same-390` · `ghosts-measure` | **57 / 57 · 57 / 57 · Δ 0** | the Messages ghost and the project tab's thread ghost gained their new controls |
| regression `first-run-ghosts` · `first-run-empty` · `first-run-noleads` · `ux-p7` · `view-as` · `panel-order` | **15 · 89 · 5 · 89 · 23 · widths hold** | |
| `npm run design:anatomy` | **1699 measures hold** | 81 pages (Messages among them), 24 dialogs, 41 page menus |
| `npx tsc --noEmit -p .` · `npx eslint app components lib` · `npm run design:lint` | clean · 0 errors (the 16 old warnings) · nothing new | — |

## Migration and repair
- **Migration 0102 (lane)** `drizzle/0102_team_chats_s26.sql`, additive and schema-only: tables `conversations` (unique `lead_id`, unique
  `pair_key`), `conversation_participants` (unique conversation · member, index by member), `conversation_messages` (index conversation ·
  time), `conversation_files` (the bytes in `data`). In `BASELINE_TABLES` and the snapshot's `TABLES`. **Main already holds a 0102 from lane A
  (`0102_floor_plan_photos_s28`) — the land script regenerates this one.**
- **Repair R143** (the demo's team talk, each as the app writes it: the studio's room — Dane's site walk with HDB's link, Germaine's answer, Hui
  Min's timesheet reminder; Germaine ↔ Dane on Benjamin's carpentry margin; "Site team" (Dane, Germaine, Alex, Michelle) with its first line,
  the tiler, and Michelle's mood board picture (`public/uat-files/kitchen-moodboard.jpg`); Serena Koh's Team conversation (laminate for the
  wardrobes) read by her member and its writers; every conversation read a minute after its newest line, so no rail count changes;
  idempotent, fixed ids; seven closing checks). **R144 is the next free in lane B's range.** The baseline fixture is the orchestrator's
  (`db:baseline`).

## For the next steps
- **S22 (Dashboard):** 1.0's home widget "View messages" → a door into Messages (`fetchChatInbox()` rows: the unread first), never a second list.
- **S27 (Hangouts):** if a hangout chat comes back, it is a members' conversation kind or a door into Messages — never a second chat app.
- **S34 (real services):** members' files' bytes → object storage behind `keepChatPhotos` · `takeChatFilePiece` and `/chat/file`; live
  delivery (the open thread polls every 8 s, as P-G's) → a socket; `/chat/file` and `/files/raw` need a real session.
- **S42:** the Messages ghost's right pane still draws an open conversation while the page shows "Pick a conversation" (P-G's, older).
- **For CLAUDE.md's Map (the orchestrator's):** *Team and group chats (pending modules S26)* — `lib/projects/studio-chats.ts` (reads: the room,
  two people, groups, a lead's Team conversation; `chatInbox` · `leadTeamLines` · `readersOf`), `lib/projects/conversation-access.ts`
  (`forConversation` — moved from messages-actions), `lib/projects/message-lines.ts` (`lineOf` · `attachmentsOf` — moved from messages.ts),
  `app/chat/actions.ts` (start · group people · `conversationShared`), `app/chat/file/[fileId]`, `components/projects/messages/{new-conversation,
  conversation-details}.tsx`; keys `lead-team:<leadId>` · `chat:<id>` (the room `chat:studio`); tables `conversations` ·
  `conversation_participants` · `conversation_messages` · `conversation_files` (0102), repair R143; notice `member_message`.

## Shared pieces changed
- `components/leads/assignee-field.tsx` — generic over the member it lists (`AssigneeOption`); every existing caller unchanged.
- `components/contracts/pick-lead-dialog.tsx` — `label` · `placeholder` props (defaults unchanged).
- `components/projects/threads/thread.tsx` · `thread.module.css` — **a web address in a line's words opens** (every thread: Messages, tickets,
  the client's page); `.inlineLink`.
- `components/leads/detail/info-column.tsx` — the Collaborators' Team chat row (`teamChatHref`), lead and project.
- `components/projects/messages/messages.module.css` — a read row keeps the unread one's height (+4px on read rows).
- `lib/projects/messages.ts` / `messages-actions.ts` — `ConversationData.lead` may be null (a members' conversation); `chat` · `seen` added;
  `InboxRow.leadId` · `last` nullable, `chatType` · `startedAt` added; one's own last line reads "You:" on every row.
- `lib/notifications/model.ts` · `personal.ts` — event `member_message`; `team_message`'s words. `lib/global-search/{model,queries}.ts` — a
  Create row, Go to Messages' words, `messageHits(…, viewerId)`. `lib/leads/{activity,purge}.ts`. `components/meetings/room/meeting-room.tsx`
  (a ⋮ row). `app/chat/page.tsx` (the gate). No shell frame, `components/om/*` or `app/globals.css` change.
- Probe changed as a deliberate change: `projects/verify-pj-gap-h.cjs` (S23's seventeenth client event).

## Flags for Vicky
- **No mock draws any of it** — every screen is on house pieces and logged (REG-S26.1…15); please review `pm2-s26/`.
- **A Team conversation's count is now its people's** (REG-S26.5): someone not on a project no longer gets its team's unread on their rail.
- **Links in messages now open** everywhere a thread draws (Messages, tickets, the client's page) — underlined in the primary colour.
- **Read rows grew 4px** in the Messages list to match unread ones (no jump on read).
- The demo's room carries a real web address (`https://www.hdb.gov.sg`) so Links has one.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock draws team chats; each piece is the smallest thing on the house pieces, every invented
   word in REG-S26.1…15, the calls flagged above.
2. **One system, no one-offs** — Messages' own list, conversation, composer and thread for every kind; the house menu (New message ▾ = New
   Meeting ▾'s shape), Dialog, Drawer, Chips, MetaChip, Avatar, EmptyState, the member picker, the lead picker, the Client access panel, the
   Client access panel's section · box · row stylesheet (composed), the house thumbnail, the text link, the ghost kit; tokens only.
3. **Plain words** — "New message", "A member", "A new group", "A client", "Just the two of you", "Take out", "Leave the group", "Shared in this
   conversation", "Seen by Germaine", "Only the team reads it", "Share with the team".
4. **Nothing is lost** — every remove has its Undo (a person taken out, a group left, a name changed, a message removed, a shared brief); a
   leaver's conversation keeps its messages; a lead's Team conversation carries into the project's at Won.
5. **Say why** — a Designer sees no Take out on an Owner (the server says the rule if asked); a leaver's conversation says they left the studio;
   a client not on their page is said so beside its door; an empty filter says what it would hold.
6. **Back returns where you came from** — the Team chat door carries `?from=`; the open conversation's Open lead / Open project carry `/chat`;
   Details' doors carry where they were opened.
7. **Every screen is whole** — the shell, the same ghost in `loading.tsx` and `PageReveal` (measured at 1440 and 390; the project tab's thread
   ghost updated too), the empty and no-match lines, the gate for Accounting, the error route; the probe's page-error log is empty.
8. **Every width is designed** — 1440, 1024 (one pane at a time), 768 touch, 390 (New message an icon, its menu and Details as bottom sheets, the
   Client Info sheet's door) and 320 — no sideways scroll against `screen.width`.
9. **Tables follow the leads listing** — no data table added (the list is P-G's conversation list; Details' rows are the access panel's).
10. **Motion with purpose** — only the house menus', sheets' and drawer's own motion.
11. **Honest data** — every state is a record (R143's conversations, participants, lines, read marks and file); Seen only from read marks;
   nothing claims a delivery the app can't make (no typed numbers); the suggestions say they are suggestions and never send.
12. **Reach for everyone** — every icon-only control named with its tooltip (People and files, the back arrow); the list a list of buttons; the
   menus keyboard-reachable (the house menu, its in-place level focused); C presses New message; links say they open a new tab via the house
   rel; the room, groups and two people readable by screen readers by their section's label.

**How to add a missing thing:** one home (Messages; doors elsewhere), shown only when it applies (the Team chat row while there are members,
Take out only where allowed, the place share only where there is a site, Invite to Portal only for a client not on their page), one filled
button (New message in the page header; Send in the composer), defaults that need no set-up (the room exists for every studio; nothing to
configure; the new notice in-app only by default).
