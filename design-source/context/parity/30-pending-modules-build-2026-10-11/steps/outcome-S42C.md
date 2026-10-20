# S42C · projects, money and the client — outcome (2026-10-14, lane B)

The closing audit's package C: `s42/audit-C.md` (27 findings, C-01…C-27 — Major 3 · Minor 20 · Polish 4) and audit C's calls C·1…C·5
(`s42/calls-for-vicky.md`), each call fixed **as recommended — his "build all of them" 2026-10-11; listed in s42/calls-for-vicky.md for his
review**. Register rows: `steps/reg-S42C.md` (REG-S42C.1…24). Probe: `design-source/verify/pending-modules/verify-pm2-s42c.cjs` — see *Probes run*.
Shots: `design-source/verify/pending-modules/pm2-s42c/`. No migration, no repair rule (R147…R159 unused — nothing here needed data).

## Ledger — every finding

| ID | Sev | Result | Where · how |
| --- | --- | --- | --- |
| C-01 | Major | **Fixed** (call C·2) | `components/meetings/client/client-notes.ts` — the client's next steps drop the designer's own notes (`^Ask …` — the checklist's misses — and "Send the follow-up message") and are said as what the studio will do ("We’ll prepare the quote …"); a step that is the client's own ("Send us …") stays as typed; `lib/meetings/client.ts` passes the client's name |
| C-02 | Major | **Fixed** (call C·1) | `lib/meetings/reports.ts` — every Met log no meeting holds is a held fact (the lists' rule, `metEntries`; its day = the log's when, else when written; its member = `stage_logs.moved_by`); `lib/meetings/queries.ts` `MetEntry.loggedAt · loggedBy`; `lib/meetings/report-model.ts` tile helps "n of m with the co-pilot on" · "n of m meetings scored", the foot note and the members line |
| C-03 | Major | **Fixed** (call C·4) | `lib/leads/file-model.ts` `paperKindOf` · `paperRule`; `app/leads/files-actions.ts` `refusePapers` in rename · move · duplicate (a folder's contents too) · trash; `lib/leads/files.ts` exports `moneyPapersOf`; `components/leads/files/files-grid.tsx` `FileMenu paper`, `files-table.tsx`, `lead-files.tsx` (Open = the paper's page; the bulk bar says why at the press), `file-viewer.tsx` (the paper's card *Open the invoice*, Download prints the paper, no Move · Duplicate · Rename · Delete). Sibling fixed: the viewer's Download on a paper said Coming soon |
| C-04 | Minor | **Fixed** | `components/meetings/room/meeting-room.tsx` — "Now" from the planned time to its planned end (`dueNow` + the lists' end rule), Send the invitation hidden once its time has come, the Invitation card only if one went; the ghost follows (`meeting-room-ghost.tsx` `due` · `invited` flags). The table's "Its planned time has passed" already had the grace (`standingOf`) — unchanged |
| C-05 | Minor | **Fixed** (call C·2) | `client-notes.ts` `sentenceToClient` — "Met Kevin …" → "We met …", "They talked about" → "We talked about", they / their / them → you / your; the Share dialog's line says the client reads it written to them |
| C-06 | Minor | **Fixed** | `meeting-room.tsx` — the boards tick only with a board kept, the estimate tick only with priced works ("The mood board" for one); `app/meetings/actions.ts` `shareMeeting` keeps only what the meeting has. Sibling fixed: the estimate tick was offered with no estimate too |
| C-07 | Minor | **Fixed** | `components/shell/access-gate.tsx` `SECTIONS.meetings`. Marketplace and Market Insights (the same gap) are S42E's E-09 — not touched here |
| C-08 | Minor | **Fixed** | `app/finance/cost-actions.ts` `saveExpense` refuses a repeat on a completed project (`completedBlock`, `REPEAT_CLOSED_RULE`); `components/finance/expense-dialog.tsx` leaves Repeats out there (kept to stop a series that still runs) and sends none |
| C-09 | Minor | **Fixed** | `components/finance/expense-categories-settings.tsx` — one whole sentence either way |
| C-10 | Minor | **Fixed** | same file — the "Press one to rename or move it …" sentence is the managers'; a reader's token is plain words (no pointer, no underline). Sibling fixed: the Trades card's read-only tokens (`app/settings/settings-view.tsx`) had the same pressable look |
| C-11 | Minor | **Fixed** | `lib/global-search/model.ts` — Expense categories and The purchase order paper, and (siblings) every other Settings › Finance card missing from ⌘K: Invoices · Invoice paper · Client payments · Credit notes · Costs · Commission, each landing on its card |
| C-12 | Minor | **Fixed** | `components/finance/books/commissions-view.tsx` — "recorded by an Owner, an Admin or Accounting" |
| C-13 | Minor | **Fixed** | members as stored in `conversation.tsx` (composer, hint, empty line), `chat-inbox.tsx` (a group's people), `conversation-details.tsx` (Start a group with …, Take out snackbars), `new-conversation.tsx` (the group name's example), `lib/projects/studio-chats.ts` (an unnamed group's title, "Seen by …"), `app/chat/actions.ts` (a group's own lines, Shared's "by" for a member); clients keep their first name |
| C-14 | Minor | **Fixed** | `lib/projects/studio-chats.ts` `chatInbox` — a direct conversation with no line is out of everyone's list (it was hidden only from the other one) |
| C-15 | Minor | **Fixed** | `components/projects/messages/chat-inbox.tsx` — `?c=<key>` kept on open (`keepInAddress`), a door's `?open=` becomes `?c=`, Back to every conversation and leaving a group let it go; Open lead / Open project carry the address as `from`; with `?from=` the house `PageHeaderL2` (Back names the lead: "Back to Serena Koh"); `app/chat/page.tsx` reads the named conversation with the list (no "Pick a conversation" flash) |
| C-16 | Minor | **Fixed** | `components/projects/messages/chat-ghost.tsx` — a client ghost reading the address: the "Pick a conversation" card in the page's words with nothing open, the conversation with one (alone ≤1024), the L2 head with `?from=`, and `l1` (the phone's bar — it was missing) |
| C-17 | Minor | **Fixed** | `conversation-details.tsx` — an Owner's / Admin's row reads "Owner · only an Owner or an Admin takes them out" for whoever may not take them out |
| C-18 | Minor | **Fixed** | `lib/ghost-shapes.server.ts` — the shell seeds `lead.<project>.money` (true unless completed); a browser's own memory still wins |
| C-19 | Minor | **Fixed** | `components/leads/detail/tab-ghosts.tsx` `MeetingsTabGhost` — the row actions' trail (the Meeting column keeps 300), the to-do chips once seen (`lead-meetings.tsx` remembers `<key>.save` · `.write` under the address's key — a project's Client › Meetings now remembers its first run under `lead.<project>` too, which its ghost reads); `meeting-room-ghost.tsx` defaults an unseen meeting to the brief, and `rememberMeetingShape` lets a list row and Start a meeting now tell the page's ghost its moment |
| C-20 | Minor | **Not fixed here — S42A's** (the prompt: "C-20 the demo's ageing moments belongs to S42A"; `restoreBaseline` is lane A's) |
| C-21 | Minor | **Fixed** (call C·3) | `components/company/reports/studio-health-report.tsx` — a tile into another Reports tab carries no `?from=` (the strip, same range); a door out of Reports keeps its way back. S39's twin (Public profile → Members' crumb) is not a strip tab — left as the house L2 crumb ("Back to Public profile"), as S39 said |
| C-22 | Minor | **Fixed** | `lib/projects/payments-portal.ts` `credits[].backMinor` (the studio's own `money-to-refund` figure), `components/portal/money/portal-money.tsx` — "(S$1,090.00 to come back to you)" on the link and "— S$1,090.00 to come back to you" on the due stage's line |
| C-23 | Minor | **Fixed** (call C·5) | `chat-inbox.tsx` the chip "Client" (list and open head; the list's search still finds "lead"), `components/leads/detail/info-column.tsx` the Portal row's "Client messages" |
| C-24 | Polish | **Fixed** | `components/shell/tools-popover.tsx` `recordHome`, read by `app-rail.tsx` and `mobile-nav.tsx` (the dock) |
| C-25 | Polish | **Fixed** | `chat-ghost.tsx` `PICK_TITLE` · `PICK_HELP` (the page and its ghost read the same words) |
| C-26 | Polish | **Fixed** | `conversation-details.tsx` — Add people `variant="primary" appearance="outlined"` (EmptyState's secondary beside a text button) |
| C-27 | Polish | **Fixed** | `components/finance/finance-ghost.tsx` — the *Reports ›* door's bone and the viewer's strip from the seed; `money-in-ghost.tsx` through the same frame; the cause of the blank columns in `components/shell/ghost-kit.module.css` (a lone line takes its cell; a stack's lines take its width) — every ghost table whose bars are a share of their column now draws them (Finance's PO · bills · expenses · payments out · To do · Money in, the books' tables) |

**Counts:** Major 3 of 3 fixed · Minor 19 of 20 fixed (C-20 is S42A's) · Polish 4 of 4 fixed.

## The calls, fixed as recommended
- **C·1** every Met log is a held meeting on Reports › Meetings; the tiles read "n of m with the co-pilot on" (REG-S42C.4).
- **C·2** the client's link carries the summary rewritten to "we / your" and only the steps the studio will do for them (REG-S42C.1).
- **C·3** a Studio health tile opens the other Reports tab on the same range without an L2 header (REG-S42C.21).
- **C·4** a money paper offers Open · Download · Copy link · Send on WhatsApp · Show to client only (REG-S42C.5).
- **C·5** the lead's client conversation is "Client", the Portal row's door "Client messages" (REG-S42C.16).

## For other packages
- **S42A** — C-20 (the demo's ageing moments: `lead_files.shown_to_client_at`, update publish times, Studio health's acts) is yours, as routed.
- **S42E** — E-09: `components/shell/access-gate.tsx` `SECTIONS` still lacks `marketplace` and `market-insights` (I added only `meetings`, one line
  above where yours go); the fallback "This page" mid-sentence is the same fault.
- **S42B** — `components/leads/detail/info-column.tsx`: only the Portal row's link word changed (line ~349); B-07's second-client line is elsewhere
  in the file.
- **Anyone touching ⌘K (`lib/global-search/model.ts`)** — eight Settings › Finance rows were added right after *Document numbers*.
- **S42D / S42E (or the orchestrator)** — `verify-pm2-s17` §4 still finds "3-D" in `app/tools/floor-plan/page.tsx`, `components/dev/ai-bench/
  ai-bench.module.css`, `lib/services/registry.ts`, `lib/visualizer/spatial/{clip,extend}.ts` (S17's "3D everywhere" rule; older, untouched here).
- **The orchestrator** — `next-env.d.ts` was put back as synced (the build rewrites it).

## Shared pieces changed
- `components/shell/ghost-kit.module.css` — two rules: `.tCell > .line:only-child { flex: 1 1 0% }` and `.tStack > .line { align-self: stretch }`.
  A bar in pixels draws exactly as before; a bar given as a share now draws (it drew nothing). Any lane's ghost with percentage cells changes
  (towards its page).
- `components/shell/app-rail.tsx` · `mobile-nav.tsx` · `tools-popover.tsx` — `recordHome` (the rail and the dock read `?from=` on a meeting's page
  only; `useSearchParams` as `GlobalSearch` already does in the shell).
- `components/shell/access-gate.tsx` — `SECTIONS.meetings`.
- `lib/ghost-shapes.server.ts` — the `lead.<project>.money` seed (and `projects.stage` read).
- `components/leads/detail/tab-ghosts.tsx` — `MeetingsTabGhost` (hooks: `usePathname`, `useFirstRunShape`; the trail column).
- `lib/global-search/model.ts` (rows added), `app/settings/settings-view.tsx` (the Trades card's read-only token, one line).
- No `components/om/*` change; no `app/globals.css` change; no migration.

## Probes run (lane B, `next start -p 3170` on a fresh migrated + repaired copy of base.db each)
All on the final production build (15:03, `DATABASE_URL` on the build and every `next start` line; no source changed after it). After the
session cut-off (~16:00) the coordinator asked for a rebuild: none was needed — the build already held every tweak (BUILD_ID 15:03, nothing newer
in the tree); the one probe the cut-off interrupted (ux-p3) was re-run on it.

| Probe | Tally | Note |
| --- | --- | --- |
| `pending-modules/verify-pm2-s42c.cjs` (new) | **79 / 79** | one or more checks per fixed finding, 1440 and 390 / 320 where the finding was about a width; puts every table back, leads' stages and stage logs as found |
| `pending-modules/verify-pm2-s23.cjs` | 147 / 147 | updated as a deliberate change: the client's notes read "We met …", never "Met Kevin" (C-05) — incl. its ghost-vs-page measures of the meetings lists, the brief and the Before view |
| `pending-modules/verify-pm2-s26.cjs` | 107 / 107 | Messages |
| `parity-map-build/verify-pm-g.cjs` | 59 / 59 | updated as a deliberate change: the lead's client conversation wears "Client" (C-23) |
| `projects/verify-pj-gap-h.cjs` | 80 / 80 | Messages, tickets, the portal |
| `pending-modules/verify-pm2-s06.cjs` · `s07` · `s13` | 83 / 83 · 89 / 89 · 65 / 65 | Finance's repeats and categories · money papers in Files, overpayments · the portal |
| `pending-modules/verify-pm2-s39.cjs` | 175 / 175 | updated as a deliberate change: Studio health's tile opens Reports › Leads as a tab (no L2 Back, no `?from=`; the browser's Back) (C-21) |
| `pending-modules/verify-pm2-s22.cjs` · `s16` · `s41b2` · `s41b1` · `s14` | 116 · 56 · 206 · 110 · 69, all pass | the Dashboard's doors into Messages, the shell, the gates, Who sees costs (the Money ghost's tiles), Settings |
| `pending-modules/verify-pm2-s17.cjs` | 129 / 130 | the one ✗ is older and not this package's: "no '3-D' left in the app's source" — `app/tools/floor-plan/page.tsx`, `components/dev/ai-bench/ai-bench.module.css`, `lib/services/registry.ts`, `lib/visualizer/spatial/{clip,extend}.ts` (S34 / S41 files, the same in B.base). Its ghost checks (Settings and Company, Finance included) all pass |
| `projects/verify-pj-gap-f1.cjs` · `pj-gap-f2` | 85 / 85 · 84 / 84 | money out · the books |
| regression `ghosts-same` · `ghosts-same-390` | 73 / 73 · 73 / 73 | REG-708 after the ghost-kit rule |
| regression `search` · `kb-r1` · `kb-r2` · `folders-files` · `ux-p7` · `first-run-ghosts` · `dane-p2b` · `st-r1` | 27 · 35 · 29 · 16 · 89 · 15 · 56 · 57, all pass | ⌘K, keys, Files' folders, the shell (Tools lit), first-run ghosts, the strip, Settings |
| regression `ux-p3` | 91 / 91 | (its first run stopped on a `networkidle` timeout at the cut-off's load, 48 ✓ 0 ✗; re-run clean) |
| regression `ghosts-strips` · `ghosts-film` | capture scripts (no assertions) | ran to the end |
| `npx tsc --noEmit -p .` · `npx eslint app components lib` · `npm run design:lint` | clean · 0 errors (16 older warnings) · nothing new | — |

Not run: `projects/verify-pj-r4a.cjs` and `verify-pj-fix-F.cjs` (their one known ✗ each is C-20's ageing, S42A's).

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — no mock draws these surfaces; every visible change is a register row (REG-S42C.1…24) with its
   invented words flagged and the five calls marked as recommended for his review.
2. **One system, no one-offs** — house pieces only: `PageHeaderL2` for Messages' Back, `EmptyState`'s classes for the ghost's card, the ghost
   kit, `FileMenu` / `PortalMenu`, the house outlined primary for Add people, `couldnt` for the paper rule; the ghost-kit fix is one rule for every
   table ghost, not a patch per ghost. `design:lint` holds.
3. **Plain words for studio people** — "Now", "Client", "Client messages", "Hui Min" as the studio named her, one-sentence notes, "the invoice’s
   own copy — it stays while the invoice does", and the client's link written to the client ("We’ll prepare the quote …").
4. **Nothing is lost** — a money paper can no longer be duplicated into a dead file or trashed away from its record; an empty conversation is
   not a half-made row; the open conversation survives a reload; a repeat that would silently stop is refused up front.
5. **Say why** — the paper rule at the press and from the server; a Designer reads why an Owner has no Take out; a completed project's
   expense says why it can't repeat; the gate names its section.
6. **Back returns where you came from** — Messages keeps `?c=`, honours `?from=` with a named Back ("Back to Serena Koh"), and Open lead /
   Open project return to the conversation; a paper opened from Files says Back to Files; Studio health's tiles open sibling tabs as the strip
   does (no circular crumb), doors out of Reports keep their way back.
7. **Every screen is whole** — the Messages ghost draws the pane the page shows (and the phone's bar); the Money ghost's band, the meetings
   lists' column and chips, the meeting page's moment, Finance's door and percentage bars all now match their pages (measured by the probe).
8. **Every width is designed** — 1440 and 390 / 320 checked (Messages open and opened from a lead at 390, /chat at 320, the client's notes
   and the portal's Money at 390) against `screen.width`; the to-do chip ghost folds to its count ≤1024 as the page does.
9. **Tables follow the leads listing** — no table changed shape; the meetings ghost now carries the listing's parked-actions trail.
10. **Motion with purpose** — no new motion.
11. **Honest data** — Reports' "held" is the same number as the lists (every Met log); the client is promised only what the studio will do;
    the portal says what is still owed back with the studio's own figure; Paid names who really records it; a share keeps only what exists.
12. **Reach for everyone** — Back links carry their names; the paper's menu rows and the viewer's card are real buttons; the rail's
    `aria-current` follows the meeting's home; no hover-only meaning added.
- **How to add a missing thing** — one home each (the paper is its record's page; Messages its one list; Reports' strip), shown only when it
  applies (ticks, Repeats, the Invitation card, Send the invitation), one filled button unchanged, defaults that need no set-up (no new
  setting, no data change).
