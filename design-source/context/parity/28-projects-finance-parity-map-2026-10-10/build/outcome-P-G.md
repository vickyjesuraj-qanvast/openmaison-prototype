# P-G · Conversations, tickets, sending & search — outcome (parity map build, 2026-10-10)

Her ask: "build everything that's in 1.0 to 2.0 without losing anything … best user experience, cognitive load, and intuitiveness." Rows:
UC-047 · UC-058 · UC-064 · UC-066 · UC-067 · UC-068 · UC-069 · UC-070 · UC-082 · UC-083 · FR-084 · FR-115 · TD-122. All built. Checks: `npx tsc
--noEmit -p .` clean (the only errors are `.next/**/validator.ts` on `app/qanvast-ops/page.js`, P-F's in-progress route); `npx eslint` on every
file below clean; `npm run design:lint` clean (no baseline raised). Not run in a browser (the brief's rule) — the probe is written, not run.
Register rows staged: `reg-P-G.md` (REG-P-G.1 … REG-P-G.12). Probe: `design-source/verify/parity-map-build/verify-pm-g.cjs`.

## Per row

### UC-064 — a team chat and a lead's conversation
- **Changed:** `lib/projects/messages.ts` (ChatLine + `files` · `share` · `fromLead`; `chatLines(…, { channel, leadId, fileSrc })` — the client
  conversation by default, so every portal read stays on it, the lead's lines merged first; `leadChatLines`; `ConversationData` +
  `fetchConversation(key)` (a lead key with a live project opens the project's); `ProjectChatData` = the client conversation + `team`;
  `InboxRow` for every kind with `pinned` · `muted`; `countUnreadChats` counts client / team / lead conversations, leaves muted ones out;
  `unreadInTeam`; `isClientMessageFile` = client channel + lead messages, never a team one; `fetchPortalConversations`). `lib/projects/
  messages-model.ts` (`ConversationKind`, `conversationKey` · `parseConversationKey` · `readIdOf` — the client conversation keeps the bare
  project id in `chat_reads`, team / lead use `team:` · `lead:`). NEW `lib/projects/conversations.ts` (prefs, contact cards, ⌘K hits).
  `app/projects/messages-actions.ts` (any conversation by key: `sendInConversation`, `uploadMessageFile`, remove / restore across both tables,
  `markConversationRead`, `readConversation`, `setConversationPrefs`; `sendMessage` · `readChat` · `markChatRead` kept for the old callers;
  `team_message` to the project's members, not the writer, not the muted, once in 15 minutes while unread). `app/portal/messages-actions.ts`
  (a home is a project or — no project yet — a lead: send / upload / remove / read / mark read for both; the team's bell skips who muted it).
  `components/projects/messages/{project-messages,conversation,chat-inbox}.tsx` (Client · Team chips at the conversation's head, `?channel=team`;
  /chat rows with Team / Lead chips, Open lead), `components/portal/threads/portal-messages.tsx` + `app/my/[slug]/messages/page.tsx` (lead homes).
  The door: `components/leads/detail/info-column.tsx` — the Portal row reads "Invited 3 Oct · **Messages**" (`lead-portal-messages`).
- **A call, said here:** the brief put the Client · Team chips "in the title line". The project tab's title line already holds the Client
  group's view chips (Updates · Messages · Tickets · Questionnaire); a second chip group beside it read as one. They sit at the head of the
  conversation card instead, with its search and ⋮ — the conversation's own title line, the same in /chat. Vicky to confirm.
- **No groups beyond the household:** the client's household is the client's group (Company › Client portal invites them); 1.0's New Group /
  New Chat with any contact are not carried — every 2.0 conversation belongs to a home.
- **Check:** `/projects/<Benjamin>/messages` (Dane) → Team → write → Germaine's bell; View as Hui Min → no bell. `/my/demo-studio/messages` as
  Benjamin (97731968) → the team's words never show. As Serena Koh (98230785, a lead) → the conversation exists; write → `/chat` (Dane) lists
  "Serena Koh · Lead" → answer → her page reads it. `/leads/<Serena>` → Portal row → Messages. 1440 · 768 · 390.

### UC-066 · UC-067 — files, voice notes, the site's place, a contact, emoji
- **Changed:** `components/projects/threads/thread.tsx` (ThreadLines draws files — a document as a row that opens, a video and a voice note
  playing in place — and the place / contact card; ThreadComposer's `attach` = the one "+" menu, `emoji`, voice recording with MediaRecorder,
  file chips with "Sending n%"; tickets pass neither and keep their photo button), `thread.module.css`, NEW `components/projects/threads/
  send-file.ts` (a file in pieces of 6 M base64 characters), `lib/projects/thread-photos.ts` (`takeFilePiece` — pieces staged in the server's
  memory ten minutes, the last files it in Files › Messages with its bytes; a recorder's "audio/webm;codecs=…" keeps its type; pages / scripts
  refused). Max 25 MB, three files a message, voice notes five minutes.
- **Stand-in:** the pieces wait in the server's memory — PRODUCTION: object storage's multipart upload behind the same action (map 24 §6).
  A voice note files as a `.webm` (Files shows it with the video glyph — `fileKindOf`'s rule for that extension; it plays).
- **Check:** "+" → each row; File (a PDF) → chip → Send → the line opens it; Files › Messages holds it; the portal composer: Photo · File ·
  Voice note · emoji. A location shares the lead's address (never the device's); a contact = a member or a vendor with Call / WhatsApp.

### UC-068 — suggested replies
- **Changed:** NEW `lib/projects/suggested-replies.ts` (17 rules, the first two that match, else 1.0's acknowledgement), `conversation.tsx`
  (`after` under the client's newest unanswered line, for whoever may write, client and lead conversations; a tap fills the box via
  ThreadComposer `fill`). **A rule-based stand-in** — no model; marked in the file and the register.
- **Check:** Benjamin's open "socket inside the tall cabinet" → "Let me check with our electrician…" · "Noted — I'll price the change…".

### UC-069 — search in a conversation, ⌘K › Messages
- **Changed:** `conversation.tsx` (head search: DS SearchBar, marks, n of m, ↑ ↓, Enter / Shift+Enter; `?at=` lands on a line, reading up to
  five earlier pages), `lib/projects/messages-model.ts` `findInLines`, `lib/global-search/model.ts` (kind `message`, scope **Messages**),
  `lib/global-search/queries.ts` + `lib/projects/conversations.ts` `messageHits` (Who sees leads; a lead message opens in its project's
  conversation once Won).
- **Check:** ⌘K "service lift" → Messages → lands ringed on the line.

### UC-070 — Pin · Mute · Copy link
- **Changed:** `conversation.tsx` ⋮ (Pin to top / Unpin · Mute / Unmute · Copy link), `conversations.ts` `prefsOf` · `setPrefs` · `mutedAmong`,
  the bell paths in both actions files skip muted members, `chat-inbox.tsx` sorts pinned first, marks pinned / Muted; the rail's count leaves
  muted conversations out. 1.0's dead Archive not carried.

### UC-047 — Tickets › Filters
- **Changed:** NEW `components/projects/tickets/tickets-filters-modal.tsx` (the Files filters modal's pattern on the Tasks modal's sheet),
  `lib/projects/tickets-model.ts` (`TicketFilters`, `keepsTicket`, counts), `studio-tickets.tsx` + `project-tickets.tsx` (Filters button with its
  count; a Status pick widens the chips to All, a chip pressed clears the Status), `tickets.module.css`, ghosts (`studio-tickets-ghost.tsx`,
  `thread-ghosts.tsx`) draw the button.

### UC-058 · FR-084 — the ticket number
- **Changed:** `lib/projects/tickets-model.ts` (`TICKET_NUMBERING_KEY`, `DEFAULT_TICKET_NUMBERING` = T · year · 3 digits, `nextTicketNumber` —
  per-year count when the year is in it: today's numbers unchanged), `lib/projects/tickets.ts` (`fetchTicketNumbering` · `ticketNumbers` ·
  `issueTicketNumber`), `app/projects/tickets-actions.ts` (createTicket numbers through it), `lib/settings/document-numbers.ts` (`TICKET_DOC`,
  `DocumentNumbersData.ticket?`, `prefixClash(…, extra)`), `app/settings/document-numbers.tsx` (the Tickets row, one Save; reads its data itself
  when the page didn't bring it), `app/settings/document-numbers-actions.ts` (saves `ticket_numbering`, `readTicketNumbering`).
- **Check:** Settings › Finance › Document numbers → Tickets "Next: T-2026-005" → prefix TK → Save → New ticket → TK-2026-001.

### UC-082 — sending safeguards
- **Changed:** `lib/notifications/delivery.ts` (reads `messagesPaused()` from P-F's `lib/platform.ts`: `deliver` writes `paused` rows while on;
  the release sweep turns due held rows into `paused` while on, and sends every `paused` row once it lifts; `deliverNotice` holds a raise to
  more than 25 people as `held_large` with a batch mark and rings `send_held` for the Owners; `sendHeldBatch` · `dropHeldBatch`), NEW
  `lib/notifications/safeguards.ts` (numbers + the log's words), `lib/notifications/outbox.ts` (statuses `paused` · `held_large` · `dropped`,
  `attempts` · `nextTryAt` · `batch` on `SentMessage`, `statusWords` reads the safeguards first), `app/notifications/outbox-actions.ts` (maps the
  new fields), NEW `app/notifications/outbox-held-actions.ts` (`fetchHeldSends` · `sendLargeSend` · `dropLargeSend` — the Owner's; `tryMessageAgain`
  — Owners and Admins), `app/settings/sent-messages.tsx` + NEW `sent-messages.module.css` (the pause line, the held sends with Drop · Send to n,
  Try again now in a failed message). `lib/notifications/held.ts` gained P-H's two floor-plan events (their Needs, item 6).
- **Said honestly:** the prototype's outbox already sends nothing (demo studios never send — nothing leaves the machine); duplicates were
  already keyed. "A single action" is measured per raise (one `notify` to its recipients) — a server action that raises several events counts
  each on its own; PRODUCTION may want a request-scoped count.

### UC-083 — retry
- **Changed:** `delivery.ts` (`sendRow` — a failure schedules the next try 5 min · 30 min · 2 h, `retryDue` on the release sweep, after the third
  retry `message_failed` to Owners and Admins for a message to a client — the event's own help line; `retryMessageNow`), the Sent messages words
  "Trying again (2 of 3)", "Didn't go — tried 3 more times", Try again now.
- **Check:** only with a real provider does anything fail — the probe writes failed rows to show it.

### FR-115 — a member's name finds their projects
- **Changed:** `lib/global-search/queries.ts` (the project's members' names among what it matches; the line says "· with Germaine" when that
  matched).

### TD-122 — send a render to Messages
- **Changed:** NEW `components/projects/messages/send-render.tsx` (`SendToMessages` — asks `renderMessageTarget(leadId)`, shows only on a
  design whose lead is a live project the viewer may write in; a dialog: Client · Team, the render, a line; then opens the conversation at it),
  `app/projects/messages-actions.ts` (`renderMessageTarget` · `sendRenderToMessages` — files the version once through the Visualizer's
  `saveVersionToFiles` and sends it as the message's photo), `components/visualizer/editor/visualizer-editor.tsx` (the one press on the canvas
  bar, after Download).
- **Check:** the demo's only lead design is Kevin Ng's (a lead, no project) → no press (as the rule says); the probe links it to Benjamin's
  lead for the press.

## Files touched outside the brief's literal list (each the package's own domain, no other package names them)
`lib/projects/messages-model.ts` (messages.ts's client-safe half) · `app/settings/document-numbers-actions.ts` (the Tickets row's save) ·
`lib/notifications/outbox.ts` + `app/notifications/outbox-actions.ts` (Sent messages' model and read) · `lib/notifications/held.ts` (P-H's ask) ·
`components/leads/detail/info-column.tsx` (the lead page's door — the brief's "smallest door"; one link in the Portal row).

## Wired for other packages (their asks, in my files)
- **P-A:** `lib/global-search/model.ts` `PAGES` — *Money in* (`/company/finance/money-in`), before Purchase orders.
- **P-H:** `lib/notifications/held.ts` `HELD_EVENTS` — `client_floor_plan` · `client_floor_plan_ask`, so the add's and the ask's Undo take the email back.
- **P-J:** `lib/global-search/queries.ts` — a 3D layout with `is_template` reads "3D layout · Template".
- **P-F:** the delivery layer reads `messagesPaused()` from `lib/platform.ts` (UC-082 above).

## Probes
- No existing assertion changed: grepped `design-source/verify/**` for the strings, test ids and addresses touched (`chat-row`,
  `project-conversation`, `conversation-composer`, `thread-send`, `thread-add-photo`, `/chat?open=`, `document-numbers*`, the Portal row,
  the scopes). The conversation composer's photo button became the "+" (`thread-add`; its hidden `thread-photo-input` stays) — no probe pressed it.
  `verify-pj-gap-h.cjs`'s "Messages (1 unread)" holds on the demo (no team or lead line unread for Dane) — the repair below keeps it so.
- NEW `design-source/verify/parity-map-build/verify-pm-g.cjs` — 11 sections, shots at 1440 and 390, puts back every table it touches.
- **First runs on the merged build (port 3135, a copy of base.db):** 55 passed · 1 failed. Fixed along the way: two app bugs, *both in
  the next build* — the conversation search's React Aria `onKeyDown` swallowed ⌘K (now `continuePropagation()`), and the Send to Messages
  dialog sat trapped under the Visualizer's photo (now the house Dialog's `portal`). Three were the probe's own: the house MetaChip prints
  capitals ("LEAD"), Benjamin signs in on his own browser context, and a `goto` to the same `…#sent-messages` address is only a scroll, so
  each Sent messages visit now has its own address. The last failure is section 10's Team chip (the trapped dialog); it needs the rebuild.
  Section 11 (390 · 320) was checked by hand on this build: the head, the "+" bottom sheet, no sideways scroll.

## Needs from others (exact)
1. **P-F — MUST (privacy):** `lib/portal/threads.ts` `clientBellFacts` — the unread query reads every studio line of the project, so a TEAM
   message's words would ring the client's bell. Add the channel:
   `.where(and(eq(projectMessages.projectId, p.id), eq(projectMessages.authorKind, 'studio'), eq(projectMessages.channel, 'client'), isNull(projectMessages.deletedAt), gt(projectMessages.createdAt, new Date(read))))`.
   Nice to have there: with no project yet, ring for the lead's conversation — `leadMessages` where `leadId`, `authorKind = 'studio'`, not deleted,
   after `readMark('client', homeownerId, 'lead:' + leadId)`.
2. **P-F:** `app/portal/tickets-actions.ts` line ~60 — number a client's report through the studio's pattern:
   `const number = await issueTicketNumber(now)` (from `@/lib/projects/tickets`; drop the `like` read and `ticketNumber` / `nextTicketSeq`).
   Until then a client's report keeps T-{YYYY}-{nnn} whatever the Tickets row says.
3. **Orchestrator:** `lib/leads/activity.ts` ~line 198 (outside the regions) — the "n messages with {client}" day lines count team messages too:
   add `eq(projectMessages.channel, 'client')` to that `where`; optionally a sibling block for the team ("n messages in the team chat",
   `link: /projects/{id}/messages?channel=team`) and one for `lead_messages` before Won ("n messages with {client} on their page").
4. **Orchestrator (optional):** `app/settings/settings-view.tsx` — `documentNumbers` may carry `ticket: { numbering: await fetchTicketNumbering(),
   numbers: await ticketNumbers() }` (from `@/lib/projects/tickets`, loaded in `app/settings/page.tsx`); without it the card reads it itself a
   moment after the page.
5. **Orchestrator:** the bell's `send_held` / `message_failed` rows open `/settings?section=notifications#sent-messages` — check the anchor
   lands on the card (its id is `sent-messages`).

- **verify-pj-gap-e §5 (the merged run) — a comment's WhatsApp copy went missing.** Cause: libsql fails a write at once ("database is locked")
  when another process is reading the file at the moment it commits — the probe polls with `sqlite3` every 200 ms — and `deliverNotice`'s one
  `try` dropped every message after the one that failed. The safeguards added a sweep and a pause read before *each* message, which pushed the
  WhatsApp write into the probe's polling: a race that was rare became common (2 of 4 runs). Fixed in `lib/notifications/delivery.ts`: one
  sweep and one pause read per notice (the messages are written back to back, as before); each message in its own `try` (a failure is logged
  "[delivery] … wasn’t written", the others still go); an outbox write that meets a lock is tried again up to 8 times (`written`, reading
  drizzle's wrapped cause; autocommit statements only); the derived reminders reuse the bell's sweep. Proved with a reader holding a lock on a
  DB copy: before — both messages lost; after — both written (278 ms). Needs the rebuild. Suggestion for the orchestrator (not done):
  `PRAGMA busy_timeout` on the client in `lib/db/index.ts` would give every write in the app the same patience.

## Repair text (insert into `scripts/repair-demo-data.ts`, then re-take the baseline)
```ts
  /* ── R9x · conversations (parity map 2026-10-10, P-G — UC-064) ──────────────────────────────────────────────────────────────────────
     Benjamin's project has a team conversation (Germaine and Dane on the chipped cabinet carcass — the client never sees it); Serena Koh
     (Quote Sent, invited to the portal, no project) asked on her page before Won and Germaine answered — the Lead row /chat lists. Every
     member has read both (the rail's count stays as it was) and Serena has read the answer. Fixed ids; idempotent. */
  {
    console.log('\nR9x Conversations — a team chat on Benjamin’s project, Serena Koh’s conversation before Won')
    let n = 0
    const ben = (await client.execute(`SELECT id, lead_id FROM projects WHERE number = 'P-2026-002' AND deleted_at IS NULL`)).rows[0]
    const team0 = Date.parse('2026-10-08T01:20:00Z')
    if (ben) {
      for (const [id, who, name, body, at] of [
        ['pg-team-1', 'germaine', 'Germaine', 'Heads up — the tall cabinet carcass came back from the factory with a chipped edge. The replacement is promised for Thursday.', team0],
        ['pg-team-2', 'dane', 'Dane', 'Thanks. Let’s not give Benjamin a new date until the replacement is confirmed — I’ll tell him myself on Friday.', team0 + 40 * 60_000],
      ] as const) {
        n += (await client.execute({ sql: `INSERT OR IGNORE INTO project_messages (id, project_id, lead_id, author_kind, author_id, author_name, body, photos, created_at, deleted_at, task_id, variation_id, channel, attachments, meta)
          VALUES (?, ?, ?, 'studio', ?, ?, ?, NULL, ?, NULL, NULL, NULL, 'team', NULL, NULL)`, args: [id, String(ben.id), String(ben.lead_id), who, name, body, at] })).rowsAffected
      }
      await client.execute({ sql: `INSERT OR IGNORE INTO chat_reads (reader_kind, reader_id, project_id, read_at) SELECT 'member', id, ?, ? FROM members`, args: [`team:${String(ben.id)}`, team0 + 41 * 60_000] })
    }
    const serena = (await client.execute(`SELECT l.id, h.homeowner_id FROM leads l JOIN homeowner_lead_links h ON h.lead_id = l.id WHERE l.name = 'Serena Koh' AND l.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.lead_id = l.id AND p.deleted_at IS NULL) LIMIT 1`)).rows[0]
    const lead0 = Date.parse('2026-10-06T06:15:00Z')
    if (serena) {
      for (const [id, kind, by, name, body, at] of [
        ['pg-lead-1', 'client', String(serena.homeowner_id), 'Serena Koh', 'Hi Germaine — does the carpentry in the quotation include the shoe cabinet at the entrance?', lead0],
        ['pg-lead-2', 'studio', 'germaine', 'Germaine', 'It does — line B4, the full-height shoe cabinet with the bench. I’ll mark it on the drawing for you.', lead0 + 55 * 60_000],
      ] as const) {
        n += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_messages (id, lead_id, author_kind, author_id, author_name, body, attachments, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL)`,
          args: [id, String(serena.id), kind, by, name, body, at] })).rowsAffected
      }
      await client.execute({ sql: `INSERT OR IGNORE INTO chat_reads (reader_kind, reader_id, project_id, read_at) SELECT 'member', id, ?, ? FROM members`, args: [`lead:${String(serena.id)}`, lead0 + 56 * 60_000] })
      await client.execute({ sql: `INSERT OR IGNORE INTO chat_reads (reader_kind, reader_id, project_id, read_at) VALUES ('client', ?, ?, ?)`, args: [String(serena.homeowner_id), `lead:${String(serena.id)}`, lead0 + 3 * 3_600_000] })
    }
    note(`${n} message(s) written`)
  }
```
Verification queries (the script's closing list):
```ts
    ['team message on a lead that is not its project’s (R9x)', `SELECT m.id FROM project_messages m JOIN projects p ON p.id = m.project_id WHERE m.channel = 'team' AND m.lead_id <> p.lead_id`],
    ['client line in a team conversation (R9x)', `SELECT id FROM project_messages WHERE channel = 'team' AND author_kind = 'client'`],
    ['lead message on a deleted lead (R9x)', `SELECT m.id FROM lead_messages m LEFT JOIN leads l ON l.id = m.lead_id WHERE l.id IS NULL OR l.deleted_at IS NOT NULL`],
```
`lead_messages` · `conversation_prefs` are already in `BASELINE_TABLES` (migration 0085).

## Stand-ins (honest)
- Suggested replies are a rule table, not a model (UC-068).
- A 25 MB file travels in pieces kept in the server's memory until the last lands — object storage's multipart upload in production (UC-066).
- The outbox sends nothing; the pause, the large-send hold and the retries are the rules a real provider runs under (UC-082 · UC-083).

## Not finished, and why
- A lead's message before Won offers **Reply** only on its ⋮ — Make a task / Raise a variation order write their link back onto
  `project_messages` (`lib/projects/client-asks.ts`, not this package's); once Won the project's own lines keep all three.
- The ticket number on the client's portal report waits on Needs 2; the client's bell for a lead's conversation waits on Needs 1 (the
  team-message filter there is the must).
- The Activity day lines for team and lead conversations wait on Needs 3.
