# Merging Dane's Tasks and Tickets reviews into main (2026-10-28)

## The situation

- **Main** = `e290c824`, the calm UI build. It is a visual / words / UX pass over the whole app, approved by Vicky (he/him, the
  product designer, the repo's owner). His rule: no feature lost, display words only.
- **Dane** (a team member) pushed `9c81f8ab` to `qanvast/uat-dane-2026-10-01`, one commit on top of the common base `83d7c1f8`.
  It holds his Tasks and Tickets reviews. His intent, change by change: `TASKS-REVIEW-2026-10-27.md` and `TICKETS-REVIEW-2026-10-26.md`
  at the repo root (merged in). Read both fully first.
- Vicky asked to merge Dane's changes, which **approves them**. A merge is in progress in main's working tree
  (`git merge --no-commit`; MERGE_HEAD is set). **Do not commit, abort or reset the merge.** Resolve your files, then `git add` them.
  The orchestrator commits.

## How to resolve: both sides are approved, keep both

1. **Dane's behaviour and layout stand.** For example:
   - the phone's New task sheet;
   - the drawer that slides out;
   - the foot shadow's opt-ins;
   - one New ticket form with Project as its first field;
   - "View all" beside the scope pill;
   - the to-do chips spelled on touch;
   - the server rule `mayTakeTicket` / `assigneeOf`;
   - the search's touch size in the house piece;
   - spacing fixes.
2. **The calm build's words stand everywhere on screen, Dane's new strings included.** See
   `design-source/context/ui-audit-2026-10-27/build/brief.md` §2.
   - Tickets are **Issues** on screen: "New issue", "Which project is this issue for?", the phone sheet "Issue status", and so on. The
     route `/tickets`, slugs, testids and code names stay.
   - Sentence case, "New {thing}", Members, Client.
   - For "Looked after by": take Dane's **"Assigned to" / "Unassigned"** if §2 doesn't name the word (it was his testers' pick of three
     and is clearer). If §2 names another word, use that and note it. Either way record the choice as ▲.
3. **Where the calm build removed or moved something Dane then changed, the calm build's structure stands.** Carry Dane's intent onto
   the new place where it still applies, and record each as a ▲ for Vicky. Known cases:
   - **The Tasks approvals strip** ("n approvals wait for you on the Dashboard"). The calm build removed it (the audit's 1-03, one home
     for approvals). Dane's change 19 redesigned it for phones. It stays removed; keep Dane's component edits only if harmless and
     unused. ▲.
   - **The Tasks All · Leads · Projects switch** now rides in the scope pill's menu (the calm build, same `task-source` handle). Dane's
     change 11 (a divider before it) has nothing to divide; drop it. Changes 10 and 12 ("View all" beside the pill, its fold) still apply.
   - Anything else of this kind you find: the same rule.
4. **Nothing lost, from either side.**
   - Every `data-testid` / `data-kb` from main AND from Dane's commit survives.
   - Every server action call survives.
   - The guard (`design-source/verify/ui-audit-build/guard.mjs`) must say "none gone" against
     `.claude/calm-build/guard-before.json`, and also against a snapshot of Dane's tree:
     `git worktree add /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/dane-tree qanvast/uat-dane-2026-10-01`
     if it doesn't exist yet. The orchestrator makes it; check for it first, and snap it with the guard.
5. **The house pieces Dane touched** (`components/om/dialog.tsx`, `drawer.tsx`, `use-overflow.ts`, `toolbar-search.module.css`) merged
   without conflicts. Check that his opt-ins default off, so every other dialog and drawer is unchanged, and that the calm build's edits
   to them are still there.
6. CSS: where a merged rule now competes with a calm-build rule, make it order-proof with a doubled class `.x.x`, never `!important`
   (CLAUDE.md › the load order).

## Ownership: each agent edits only its own files

- **M1 · Tasks:** `components/leads/tasks/*`, `components/tasks/*`, `components/leads/detail/tab-ghosts.tsx`,
  `components/shell/list-ghosts.tsx`, `components/shell/maison-fab*`, `app/leads/[id]/overview.module.css`, `components/om/toolbar-search*`,
  `components/leads/toolbar.module.css`, and the Tasks probes.
- **M2 · Tickets:** `components/projects/tickets/*`, `app/projects/tickets-actions.ts`, `lib/projects/policy.ts`, `lib/projects/tickets.ts`,
  `components/om/dialog.tsx`, `components/om/drawer.tsx`, `components/om/use-overflow.ts`, and the Tickets probes.
  - That includes the ones Dane names: `verify-pm2-s46b.cjs` M1 (the old two-step picker), `verify-pm-g.cjs` and
    `verify-pm2-s44o.cjs` ("Looked after by").
- A probe both of you need: whoever finds it first writes a note to the other through the orchestrator. Don't both edit it.

## Probes

Update the probes that Dane's changes make stale (his notes name some). Restate each check to the same rule on the new behaviour, and
mark the line `(Dane's Tasks / Tickets review, merged 2026-10-28)`. Never delete or weaken a check. Find the probes that touch your
area with `grep -rl` under `design-source/verify/`; the regression's list is `design-source/verify/regression/probes.cjs`.

**Don't build and don't start servers.** Main's `.next` is shared, and Vicky's `next dev` on :3000 runs from this folder. Never touch
ports 3000 or 3001. The orchestrator builds once both agents are done, runs the full regression, and sends failures back to you.

## Checks before you hand back

- `npx tsc --noEmit -p .`: no errors in your files. The other agent may be mid-edit; re-run once.
- `npx eslint <your files>`: adds nothing.
- `npm run design:lint`: nothing new. Never edit the baseline.
- `node --check` on each edited probe.
- No conflict markers left: `grep -n '^<<<<<<<\|^>>>>>>>' <file>`.
- `git add` each resolved file.
- The guard against both snapshots (§4).

**Never** write `local.db`, commit, or touch `CLAUDE.md`.

## Record

Write `/Users/vicky/Documents/GitHub/openmaison-prototype/.claude/calm-build/merge/M1.md` or `M2.md`:
- each conflict: what each side did, what you kept, and why;
- each of Dane's numbered changes: kept / adapted (how) / superseded by the calm build (why), each with ▲ where it is Vicky's call;
- probes restated;
- the guard's results.

Stage register rows in `M1-reg.md` / `M2-reg.md`, one per Dane change as merged:
`| REG-M1.n | area | **what** — why (Dane's review change n) | user-directed (Dane's review, merged on Vicky's word 2026-10-28) |`.
Use `invented copy` where Dane flagged invented copy, and keep his "For Vicky" notes as ▲.

Final reply, short:
- conflicts resolved;
- Dane's changes kept / adapted / superseded;
- ▲ for Vicky;
- probes touched;
- check results.
