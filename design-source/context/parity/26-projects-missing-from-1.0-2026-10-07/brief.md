# Brief — what OpenMaison 2.0's Projects module is still missing from 1.0 (read-only audit, 2026-10-07)

The owner (Vicky, product designer) says: "I feel there are a lot of missing things from 1.0 to 2.0 project module. Audit in depth and
give me a report on what is missing." You are one of seven reviewers. **Read only: never edit a file in either repo, never run a build,
a server, a browser or a test, never touch local.db.** Write ONE file: your output path (below).

## The two products
- **1.0** = `/Users/vicky/Documents/GitHub/qanvast-id-tool` (branch `integ/security-non-qanvast` @ `620190192`). Read its code.
- **2.0** = `/Users/vicky/Documents/GitHub/openmaison-prototype` (the working tree, uncommitted changes included — that IS current 2.0).
  Projects in 2.0 lives in: `app/projects/**`, `components/projects/**`, `lib/projects/**`, `app/(editor)/projects/**`, the client portal
  `app/my/**`, `components/portal/**`, `lib/portal/**`, `app/portal/**`, `app/company/portal/**` + `components/company/portal/**`,
  `app/settings/projects-settings.tsx`, the schema `lib/db/schema.ts`, notifications `lib/notifications/**`, search `lib/global-search/**`.
  Tasks · Files · Activity on a project reuse the lead's (`components/leads/{tasks,files,activity}`); quotes / contracts / the AI
  Visualizer are their own modules. CLAUDE.md's *Map* (its Projects entry) says where things are.
- **What 2.0 built and why:** `design-source/context/parity/23-projects-build-2026-10-05.md` (§1 = every call Q-01…Q-50 and Finance
  F-01…F-20 AS BUILT; read §1 first), the audit `22-projects-1.0-to-2.0-audit-2026-10-05.md` (findings + the 50 questions), the devs'
  map `24-projects-migration-map-2026-10-05.md`, the fix phase `25-projects-bug-audit-2026-10-06/` (A…G and their `-fixes.md`).
- **The 1.0 inventories** (13 readers, ~4,400 rows, banked 2026-10-05): `design-source/context/parity/projects-1.0-inventory/{A…M}-*.md`,
  each row with an id (A-121, E-243 …) and the 1.0 file it came from. They are your map of 1.0, not the last word: when a row is vague
  or you doubt it, open the 1.0 file it cites.

## What to do
For YOUR inventory files, account for **every row id** — each row lands in exactly one feature line of your table (cite the ids or
ranges it covers). Group rows into features a studio would recognise (e.g. "Bulk edit milestones", "Overdue invoice reminders",
"Clone a project", "Archived projects list"). For each feature, check 2.0's code — grep for it, open the component/action, read enough
to be sure — and give it ONE status:
- **Built** — 2.0 does it (cite the 2.0 file).
- **Partly** — 2.0 does some of it: say exactly what of 1.0's behaviour is absent.
- **Missing** — 2.0 has nothing for it.
- **Left out on purpose** — an accepted call set it aside or replaced it: name the call (Q-nn / F-nn / a REG row) and its words.
  Only when a call really covers it; "later" / "hold" calls count here but say "later" so the report can list them.
- **Not a product feature** — 1.0 internals, its own styling / motion / tokens (2.0 uses its own design system by rule), dead code,
  admin-only plumbing with no studio-facing effect. Keep these to one line per group.

Be concrete and plain: what does a studio (owner, designer, manager, the client) lose in 2.0? Say it in the studio's words, not
code words. Rate each Missing / Partly feature: **Impact** (High = a studio would hit it in normal project work or a client would
notice; Medium = some studios, some weeks; Low = rare or cosmetic) and **Size** (S = a day, M = a few days, L = a week or more).

## Output — `<your output path>` (markdown)
1. `## Bottom line` — 5–8 sentences: how much of your area 2.0 has, the most important gaps.
2. `## Features` — one table: `| Feature (plain words) | 1.0 rows | Status | What 2.0 lacks (or the call) | Impact | Size | 2.0 evidence |`
   — every row id of your files covered once. Order: Missing and Partly first (by impact), then Left out on purpose, then Built,
   then Not a product feature (grouped, one line each).
3. `## Top gaps` — the 10 (or fewer) gaps that matter most, one line each, with why.
4. `## Things the inventory missed` — anything you found in 1.0's code for your area that no row records (with the 1.0 file).
5. `## Uncertain` — what you couldn't settle.
Hand back a 10-line summary (counts by status, the top 5 gaps). Run long steps in the background; never let a tool call sit silent
for minutes (big greps: narrow the path).
