# S43A · One signed-in member per browser — outcome (2026-10-15, lane A)

The S42 audit's call **A·1** (`s42/audit-A.md` › Calls for Vicky 1, `s42/calls-for-vicky.md` › A·1), which S42A could not build and covered
with a fallback line. Built as recommended on his "fix all the pending things" (2026-10-15). Register rows: `steps/reg-S43A.md`
(REG-S43A.1…6). Probe: `design-source/verify/pending-modules/verify-pm2-s43a.cjs` (**43 / 43**); shots in
`design-source/verify/pending-modules/pm2-s43a/`. **No migration, no repair** (the flag's column keeps its name; nothing in the base changes).

## Pending lines ledger (the call, as the prompt set it out)

| Line | Status | Where |
| --- | --- | --- |
| "A browser that signed in by a code is that member — on every read and every write stamp — and only that browser" | **built** | `lib/db/session.ts` (`browserSession` · `sessionMemberId`), `lib/auth/session.ts` (`readStudioSession` reads the record's own member) |
| "A browser on the demo's standing session (never signed in or out) is the flagged member as today" | **built** | `standingMemberId()`; `readStudioSession`'s standing branch |
| "View as still moves the whole prototype (REG-667: it moves the flag, and the browser that pressed it follows)" | **built** (kept as it was) | `app/view-as-actions.ts` (the flag) + `followViewAs` (a code-signed browser's own record) |
| "Reset returns to Dane" | **built** (kept) — and every code-signed session ends with it (the base holds none live) | `resetPrototype` + `restoreBaseline` (unchanged) |
| 1 · `sessionMemberId()` reads the request's own studio session first, else the flag; cached per request; outside a request the flag / `SESSION_MEMBER_ID` | **built** | `lib/db/session.ts` — cookies read inside `try` with `unstable_rethrow` (a build's prerender still learns the page is dynamic — S30's lesson); outside a request → the standing member |
| 2 · Every write stamp follows the same member, computed before any transaction, at all 107 sites; a guard so a new static use can't compile | **built** | `sessionMemberSql` **removed** (TS-level); every stamp hoisted — see *Every site touched*; transaction-safe helpers take who through a second, required signature; the schema's flag renamed `standingYou`; the probe's source guard (§0) |
| 3 · Code sign-in and Join no longer move the flag; Sign out ends only that browser; remove S42A's fallback line, keep the honest demo line | **built** | `startStudioSession` (the `update members set is_you` is gone); `endStudioSession` unchanged (it always ended only its own record); `SIGN_IN.oneAtATime` and its two renders removed |
| 4 · Everything keyed to "you" follows: the bell, Your profile, the Dashboard's greeting and Needs you, Who sees leads, Who sees costs, the studio block, ⌘K, Maison AI, View as's own list | **built** | `fetchViewer` (→ Who sees leads, `Viewer.costs`, ⌘K, the Dashboard, Maison AI), `fetchSessionTeam` (studio block, View as's tick, ⌘K's member mode, the access gate), `unreadCount` + the bell's `me()`, `withYou` on every member row the app reads "you" from — all proved in two browsers by the probe |

Nothing from 1.0 is in play (2.0's own demo session); **Found in 1.0, not on a card:** nothing.

## What changed

**The one place that says who a request is — `lib/db/session.ts`** (rewritten):
- `standingMemberId()` — the member `members.is_you` flags (View as's pick), else Dane. The only read of the flag for the app.
- `browserSession()` — this browser's own session, as its record says: `none` (no session cookie: the standing session, a signed-out
  browser, or no request), `live` (the record, its member active), `dead` (ended · replaced · signed out · Reset took it · ran out · its
  member deactivated). Reads only — the record's renewal stays the shell's (`readStudioSession`).
- `sessionMemberId()` — `live` → its member; `none` → the standing member; `dead` on a **studio** address → `redirect` to sign-in with the
  shell's own reason (never stamped as anyone else); `dead` on a client link → the standing member, as a signed-out browser.
- `withYou(rows)` / `markYou(rows, me)` — member rows as the app reads them: `isYou` = this request's member, the flag left behind.
- `fetchSessionTeam()` — View as's list; its tick (`isYou`) is this browser's member.
- `sessionMemberSql` is gone.

**The schema** (`lib/db/schema.ts`): the flag's property is `standingYou` (column `is_you`, no migration — `drizzle-kit generate` reports
no change); `MemberRecord` = the row as stored; `Member` = `Omit<MemberRecord, 'standingYou'> & { isYou: boolean }`. TypeScript then
named every reader of "you" (73 errors in 32 files at the first try) — each now goes through `withYou` or `sessionMemberId()`.

**Sign-in** (`lib/auth/session.ts`): `readStudioSession` takes a code-signed browser's member from its own record (S30 read the flag, which
the sign-in had moved); `startStudioSession` no longer moves `is_you`; comments say the new rule. `lib/auth/paths.ts`, `lib/auth/model.ts`
(`SIGN_IN.oneAtATime` removed), `components/auth/studio-sign-in.tsx` and `components/company/join/join-page.tsx` (the fallback line's
render removed).

**The rail's badges** (`lib/leads/tasks.ts` `railBadges`): its catcher passes Next's own signals on (`unstable_rethrow`) — the counts now
read the browser's cookie, and the build logged 80 "a badge count could not be read — Dynamic server usage" lines before this (the routes
were dynamic either way; the second build logs none).

### Every site touched

*Write stamps — `sessionMemberSql` was 107 lines in 30 files (119 mentions: 29 imports, the definition, 7 module-level `const ME` aliases
standing for 43 more stamps, and 82 direct stamps).* Each function now reads the member once, before any transaction, and passes the id:
- `app/projects/schedule-actions.ts` (21 functions, 28 lines: milestones made · moved · renamed · done · asked · resolved, share asks and
  shares, extensions, the schedule template), `app/projects/ending-actions.ts` (complete · request · send back · reopen · delete),
  `app/projects/actions.ts` (New project — its assignees, its first note and the project row inside one transaction; On hold; Duplicate),
  `app/projects/floor-plan-actions.ts` (four `logProjectEvent` calls inside transactions now pass `c.me.id`), `app/planner/actions.ts`
  (the layout's events; two transaction calls pass the viewer).
- `app/leads/actions.ts` (`writeAssignees(tx, …, by)`, moveStage's log and suggested tasks, quickMoveStage, setFollowUp, createLead's files,
  addTask, updateStageDetails), `app/leads/tasks-actions.ts` (createTask, duplicateTasks, addComment, the ask-to-add task, saveTemplate,
  applyTemplate), `app/leads/notes-actions.ts`, `app/leads/return-actions.ts`, `app/leads/quotes-actions.ts` (the due date's task),
  `app/leads/files-actions.ts` (folder, upload, file comment).
- `app/contracts/actions.ts` (create, duplicate, save as template, bundles), `app/company/{templates,contract-templates,schedule-templates,
  payment-templates,task-templates,font}-actions.ts`, `app/quotes/{text,files}-actions.ts`.
- Helpers: `lib/leads/events.ts` `logLeadEvent` and `lib/projects/events.ts` `logProjectEvent` (overloads: through `db` they read the
  member; through any other writer the actor is required), `lib/projects/create.ts` (`writeProjectRow(w, i, number, by)`, `logParityEvent`
  overloads, `fileWonQuote`, `copyScheduleTo`), `lib/leads/starter-folders.ts` (`ownerId` required), `lib/contracts/files.ts`
  (`contractFolderOf` · `keepContractPdf` · `keepPdfIn` · `quoteFolderOf` overloads with `by`), `lib/contracts/won.ts`,
  `lib/compliance/starter.ts` (read before its transaction), `lib/projects/invoices.ts`, `lib/projects/client-asks.ts`, `lib/finance/books.ts`.

*Reads of "you" — 19 `eq(members.isYou, true)` in 7 files and every member row the app marks:*
- `app/quotes/signature-actions.ts` (your signature, its removal, its consent), `app/quotes/actions.ts` (`whoAmI`, revise, undo revise),
  `app/quotes/comment-actions.ts`, `app/leads/quotes-actions.ts` (5), `app/notifications/actions.ts` (the bell), `app/notifications/outbox-actions.ts`
  (Sent messages), `lib/notifications/queries.ts` (`unreadCount` — the rail's bell).
- `lib/leads/visibility.ts` `fetchViewer` (Who sees leads, Who sees costs, and everything that asks the viewer).
- `withYou` on the member lists: `lib/leads/{queries,tasks,notes,files,quotes,returns,activity}.ts`, `lib/contracts/queries.ts` (4),
  `lib/templates/queries.ts` (6), `lib/quotes/{editor,list,prepared-server}.ts`, `lib/projects/queries.ts` (2), `lib/meetings/queries.ts`,
  `lib/company/{members,task-templates}.ts`, `lib/maison-ai/answers/work.ts` (3), `app/settings/page.tsx`.
- Member inserts name the flag by its new property: `app/view-as-actions.ts`, `app/sign-in/actions.ts`, `app/company/members-actions.ts`,
  `lib/studios/create.ts`, `scripts/seed.ts`.
- Comments only: `components/shell/view-as-popover.tsx`, `lib/contracts/automation.ts`.

**Docs:** `README.md` › Sign-in and `CONTRIBUTING.md` (§1 *Who you are*, the prototype ↔ production table) said "no sign-in" since S30 —
now the per-browser rule and "never read `is_you` yourself"; UAT step 1.10 (`design-source/uat/story/ch1.json`) no longer expects the
fallback line — **rebuild the workbook** (`build_uat.py`); the testers' sheet tabs are Vicky's. `s42/calls-for-vicky.md` › A·1 says
"built as recommended (S43A)".

## Decisions taken (as recommended — his "fix all the pending things" 2026-10-15)
1. **The prompt's shape, not the audit's first sketch:** the audit suggested a cookie that pins a standing browser to the member it first
   opened as; the call as set for this step keeps the standing browser on the flag (View as still moves every standing window, REG-667) and
   makes a code-signed browser its own member — no new cookie, and the demo's View as works exactly as before.
2. **A browser whose own session ended is never anyone else** (REG-S43A.4): on a studio address its next action goes to sign-in, as its next
   page always did; on a client link it is a signed-out browser.
3. **Words:** the fallback line goes; nothing new is said — a code-signed browser already shows "Viewing as {name}" on the studio block.

## What to check in the browser
- **Two browsers, 1440:** browser 1 opens the demo (Dane). Company › Members › Add member (a Designer with a mobile) › Copy link; open the
  link in a second browser (or a private window), Join, any six digits — browser 2 is the new member (her welcome); browser 1 stays Dane on
  every page (studio block, Dashboard greeting, Your profile, Members' "you"). Add a task on the same lead in each — Activity says "You" in
  hers and her name in Dane's.
- **Who sees leads / costs:** Settings › Roles & access — Who sees leads: *their own*; Who sees costs: Designers off. Sign in as Sarah
  (`9883 7542`) in a second browser: her Leads list and ⌘K hold only her leads; Company › Price book has no Cost · Markup; Dane's window has
  all.
- **Sign out** in the second browser — Dane's window stays in. **View as** Hui Min from Dane's window — another fresh window opens as Hui Min,
  Sarah's stays Sarah. **Reset prototype to base** — Dane again; Sarah's next page asks her to sign in again ("Your session ended").
- **390 touch / 320:** the sign-in and invitation code steps end with the demo line only.

## Probes run (lane A, :3160, each on a fresh copy of the repaired `pbuild/base.db`, production build)
| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s43a.cjs` (this step: the source guard; two browsers — the Owner's standing window and an invitee who joins — on seven pages; stamps pressed at once, checked in SQL; Who sees leads · costs; ⌘K; Maison AI; a session ended mid-page; Sign out; View as; Reset; 1440 · 390 · 320) | **43 / 43** |
| `pending-modules/verify-pm2-s30.cjs` (four flag checks after a code sign-in now check the browser's own member — deliberate changes, commented) | 108 / 108 |
| `pending-modules/verify-pm2-s09.cjs` (Join: her own session, the flag stays Dane's — a deliberate change, commented) | 79 / 79 |
| `pending-modules/verify-pm2-s42a.cjs` (A·1's line is gone — a deliberate change, commented) | 90 / 90 — run at 05:02; at 01:2x it was 89 / 90 on its demo-day check alone (the time-of-day edge under *For the orchestrator*) |
| `pending-modules/verify-pm2-s31.cjs` · `s01` · `s16` · `s22` · `s41b1` | 104 / 104 · 80 / 80 · 56 / 56 · 116 / 116 · 110 / 110 |
| `projects/verify-pj-r1.cjs` | 98 / 98 |
| `projects/verify-pj-gap-a.cjs` | 72 / 72 on the base with its open tasks rolled to today — 71 / 72 on `pbuild/base.db` as it is: Aisha's "Confirm the carpentry install date" was due 14 Oct (Singapore) and is overdue on the 15th, and an overdue task keeps its line through a hold (`HOLD_KEEPS`) — the base's age, not this step (the count reads every task on the lead, never the viewer) |
| regression runner (`RUN_DIR` + :3160) — `view-as` · `dane-p1` · `st-r1` · `sw-r4` | 23 · 47 · 58 · 35 — all green |
| `tsc --noEmit` · `eslint app components lib proxy.ts` · `design:lint` · `next build` (`DATABASE_URL=file:<scratch>`, under the lock, twice) · `drizzle-kit generate` | clean · 0 errors (16 warnings, none in this step's files) · nothing new (baseline untouched) · exit 0, no "Dynamic server usage" lines on the second · "No schema changes" |

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins; every exception written down** — nothing new is drawn; the one removal (S42A's fallback line, itself invented copy) is
   REG-S43A.5; the behaviour is REG-S43A.1…4, the badge fix REG-S43A.6.
2. **One system, no one-offs** — one place says who a request is (`lib/db/session.ts`); every stamp, every viewer, every "you" reads it;
   the sign-in gate and the stamps share one record (`browserSession`) and one set of reasons (the shell's).
3. **Plain words for studio people** — no new words; a session that ended says what the shell already says ("Your session ended. Sign in
   again to carry on.").
4. **Nothing is lost** — a write from a browser whose session ended is refused before it lands, never misfiled under another member; Sign
   out and Reset keep every record; the demo's View as is untouched.
5. **Say why** — the refused write lands on sign-in with its reason (ended · deactivated), as a page would.
6. **Back returns where you came from** — that sign-in carries the page the action was pressed on (`?next=`).
7. **Every screen is whole** — no screen changes shape; the code steps lose one line below the fold (their ghosts never drew the code step);
   no page errors in the probe's two-browser walk.
8. **Every width is designed** — the sign-in code step at 1440 · 390 · 320, no sideways scroll against `screen.width` (probe §7).
9. **Tables follow the leads listing** — not applicable (no table changes; the price book's columns follow Who sees costs as before).
10. **Motion with purpose** — not applicable (nothing moves).
11. **Honest data** — every "you" and every stamp is the browser's own record; the probe checks the rows' stamps in SQL, both browsers
    pressing at once; the flag is said for what it is (the standing session's).
12. **Reach for everyone** — not affected (no control added or changed); the studio block's accessible name already says "viewing as {name}".
- **How to add a missing thing:** one home (the session record that S30 already kept); shown only when it applies (nothing shown); defaults
  that need no set-up (the demo opens as before — a browser that never signed in is Dane, View as as ever).

## Shared pieces changed
- `lib/db/session.ts` (the identity), `lib/db/schema.ts` (`standingYou`, `MemberRecord`, `Member`), `lib/auth/session.ts`, `lib/leads/visibility.ts`
  `fetchViewer`, `lib/leads/tasks.ts` `railBadges`' catcher, `lib/leads/events.ts` / `lib/projects/events.ts` signatures, the sign-in and
  join pages (a line removed). No stylesheet, token or house component changed.

## For the orchestrator and the next steps
- **CLAUDE.md's Map** names `sessionMemberSql` ("View as + the UAT (REG-667…669) — … `sessionMemberSql` for write stamps (resolved inside
  the statement)") — now: write stamps take `await sessionMemberId()` read before any transaction; a code-signed browser is its own member;
  `members.is_you` is the standing session's (`standingYou`), read for the app in `lib/db/session.ts` alone. The S30 line ("signing in moves
  `members.is_you`") is no longer true. REG-2247 (REG-S42A.18) is superseded by REG-S43A.5.
- **For any new code:** never read `members.standingYou` / `is_you`; ask `sessionMemberId()` (or `fetchViewer()`), before a transaction;
  pass member rows through `withYou` when the app needs `isYou`; a helper that writes inside a transaction takes the actor.
- **Still one studio open per server** (S31's tenancy stand-in, unchanged): a code sign-in into another of this prototype's studios still
  switches every window to that studio — the developers' tenancy replaces it (S31's note).
- **`verify-pm2-s42a.cjs`'s demo-day check** ("restored earlier in the day … keeps its whole 40 days") fails when the probe runs between
  midnight and 05:00 on the machine's clock: it restores 5 hours before the snapshot's own clock time, which then falls on the previous
  calendar day — 39 whole days (`dueShiftDays` counts the process clock's days), so every planned moment rightly moves 39. The probe's own
  assumption, not the restore and not this step (no file it reads changed here); it passes outside those hours — see the probes table.
