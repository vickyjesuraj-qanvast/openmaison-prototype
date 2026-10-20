# S42 · The read-only audit — the brief every auditor follows (2026-10-14)

His words (2026-10-12): "it will be good to build rest of the things like, bug fixes, intuitiveness, world-class ux" · "i don't want anything
to be missed and absolutely bug free build and remember our core design principles and super good world-class user experience" · (2026-10-11)
"please make sure nothing is left buggy". S42 = a **read-only audit** of everything the pending-modules programme built (S01…S41b-5), then the
fixes, then the full regression (`steps.md` › 42). You are ONE auditor and you audit ONE area (your prompt names it). You change nothing.

## Read first
1. `DESIGN-PRINCIPLES.md` (the twelve principles — cite them by number), `AGENTS.md`'s house-piece rules, `design-source/context/page-checklist.md`.
2. `brief.md` in this folder — "How to add a missing thing" (one home · shown only when it applies · one filled button · red only for late-and-ours ·
   defaults need no set-up · house pieces and house words · Undo on every remove · refusals say why · honest AI and services).
3. Your area's steps: each `steps/outcome-SNN.md` (what was built, its Principles check, its flags for Vicky) and `steps/reg-SNN.md` (the rows,
   now numbered in `design-source/REGISTER.md`), and the step's note in `steps.md`.
4. `s42/carried-notes.md` — what earlier steps handed to S42. Each note in your area is a finding to confirm (and recommend a fix for) or close.
5. CLAUDE.md's Map for the code of what you walk.

## Your server (never anyone else's)
View as moves a studio-wide flag (`members.is_you`), so you get your own database and your own server:
```
L=/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/e5dd05f7-6d12-4054-b5ca-a720d5c0629b/scratchpad/lanes/A   # built from main; never edit it
mkdir -p <your scratch dir>; cp <s42 audit-base.db path from your prompt> <your scratch dir>/audit.db
cd $L && (DATABASE_URL=file:<your scratch dir>/audit.db CRON_SECRET=probe-cron WHATSAPP_WEBHOOK_SECRET=probe-wa npx next start -p <your port> > <your scratch dir>/server.log 2>&1 &)
```
Never build (the tree is built). Stop your server by its port only when you finish: `lsof -ti tcp:<port> -sTCP:LISTEN | xargs kill`. Never
touch `/Users/vicky/Documents/GitHub/openmaison-prototype/local.db`, ports 3000 / 3001 (the owner's), or another auditor's port. Background long
steps; never leave a tool call silent for more than ~8 minutes (the machine is short of memory — one Chromium at a time, close pages you're done with).

## How to walk
Playwright (`NODE_PATH=/Users/vicky/Documents/GitHub/openmaison-prototype/node_modules`), your scripts and shots in your scratch dir.
- **Every surface your area's steps built or changed**, each reached the way a studio person reaches it (the rail, ⌘K, the doors the outcome
  names, a bell row, a link a client gets) — not only by typing the address.
- **As each role** that can reach it — View as (the studio block's menu, or `app/view-as-actions.ts`' `viewAs` through the UI): Dane (Owner),
  Hui Min (Admin), a Manager, a Designer, Priya Tan (Accounting); client pages as the client; public pages signed out. What a role may not do
  must be refused with its reason, in the row, not hidden in a way that leaves a dead end.
- **At 1440 with a mouse and 390 with `isMobile: true, hasTouch: true`** for every surface; 768 touch and the 320 overflow gate for spot checks.
  Keyboard: Tab order, Escape, ⌘↵ in dialogs, the `data-kb` keys the registry lists.
- **The whole life of each thing:** empty (first run) → one → many → refused → undone → deleted / restored; the loader ghost against the page
  it becomes (REG-708); what the bell, Activity, ⌘K, the Dashboard and Reports say about it afterwards; the numbers against the records (sqlite3
  read-only on your audit.db: `sqlite3 -readonly <db> "…"`).
- Watch the console and the network: every page error, every 4xx/5xx, every hydration warning is a finding.

## What counts as a finding
A bug (wrong, broken, crashes, wrong number, wrong person, lost work) · a dead end (no way on, a door that goes nowhere, Back that doesn't
return) · a second home for one thing · words a studio person wouldn't say, two words for one thing, a word against the house vocabulary
(`design-source/DESIGN.md`) · more than one filled button, red that isn't late-and-ours · a remove without Undo, a refusal that doesn't say why,
an optimistic value that stays when refused, a dialog that closes before its save lands · a hand-rolled piece where a house piece exists, drift
from the house anatomy · a ghost that doesn't match its page · a width that breaks (overflow, cut text, a desktop menu on a phone) · keyboard
traps · data that contradicts its own records (REG-343) · a claim the product can't back (AI that "thinks", a service that pretends) · anything
that would make an elderly studio owner hesitate. Don't report a call already logged as a flag for Vicky unless it is also a bug.

## Write `s42/audit-<area>.md` (the only file you write in the repo)
```
# S42 audit · <area> — <steps>
## Summary — n findings (Blocker n · Major n · Minor n · Polish n); what's solid in one paragraph
## Findings
| ID | Sev | Step | Where (address · role · width) | What happens (steps) | Should (principle # / rule / REG) | Fix (smallest, in 2.0's shape; file:line if known) | Visible? |
## Carried notes — each S42 note in your area: confirmed (→ finding ID) or closed (why)
## Calls for Vicky — only what needs his taste or a product decision, each with your recommendation
## Walked — every surface × role × width you covered, so the gaps are visible
```
IDs `<area letter>-01`… Severity: **Blocker** (data lost or wrong, a flow that can't finish, a crash) · **Major** (a dead end, a wrong
person / number, a broken phone layout, a second home) · **Minor** (words, a missing Undo / reason, a ghost off, a keyboard gap) · **Polish**.
"Visible?" = yes when the fix changes what a user sees (it gets a register row for him). Shots go in your scratch dir — name them by ID and
reference the path. Final message: 8 lines — counts by severity, the three worst, and the file path.
