# Developer guide — bringing 1.0 into OpenMaison 2.0

This repo is the OpenMaison 2.0 prototype: a working Next.js app with a real database, real server actions and real state,
designed screen by screen by Vicky. You are here to connect it to 1.0's services and data. This guide gets you running,
shows you where everything is, and sets out how changes reach `main`.

**Read [`DESIGN-PRINCIPLES.md`](DESIGN-PRINCIPLES.md) first.** Its one rule governs everything below: nothing a user can
see changes without Vicky.

## 1 · Run it

```bash
npm run dev          # http://localhost:3000
```

That is the whole setup. Node **≥ 20.9** (the repo pins **24** in `.nvmrc`). The first run installs dependencies, writes
`.env.local`, creates `local.db`, applies every migration and loads the demo data; later runs apply new migrations and
leave your data alone. A dev server already running when a `git pull` brings a migration needs a restart.

- **Reset the demo data:** Maison AI (the ✦ button) › *Reset prototype to base*, or `npm run db:reset`.
- **Who you are:** the prototype has no sign-in. The signed-in member is the row in `members` marked `is_you` — Dane, the
  studio owner, in the demo. *Demo Studio › View as* (the rail's studio block) switches to another member, and every read,
  rule and write stamp follows.
- **Something odd after a pull?** Restart `npm run dev` first; then Maison AI › *Reset prototype to base*.

## 2 · Find your way

| You want | Look in |
| --- | --- |
| The module-by-module map of the code (where each screen, action, table and rule lives) | [`CLAUDE.md`](CLAUDE.md) › *Map* |
| What a screen must look like and do | `design-source/DESIGN.md`, `design-source/context/<module>/` |
| Why something is the way it is | `design-source/REGISTER.md` — search the `REG-nnn` named in the code comment |
| What 1.0 had, and where it went in 2.0 | the module's audit and migration map (below) |
| How a tester walks the product end to end | `design-source/uat/` (13 chapters, 302 steps) |

**1.0 → 2.0, module by module.** Each audit inventories 1.0 (the sibling `qanvast-id-tool` repo) and records the calls
made; each migration map lists 1.0's tables, JSON shapes and rules and says where each lives in 2.0 — the map is where to
start a port.

| Module | 1.0 audit | Migration map | Register |
| --- | --- | --- | --- |
| Leads | `parity/01-leads-1.0-to-2.0-audit-2026-09-24.md` | `parity/02-leads-migration-map-2026-09-24.md` | REG-599…614 |
| Quote templates | `parity/03-…` | `parity/04-quote-templates-migration-map-2026-09-24.md` | REG-615…620 |
| Quote editor | `parity/05-…` | `parity/06-quote-editor-migration-map-2026-09-24.md` | REG-621…628 |
| Contracts | `parity/07-…` | `parity/08-contracts-migration-map-2026-09-25.md` | REG-629…635 |
| Quote X-Ray | `parity/09-…` | `parity/10-quote-x-ray-migration-map-2026-09-25.md` | REG-636…642 |
| Accounts Setup → Settings | `parity/11-…` | `parity/12-accounts-setup-migration-map-2026-09-25.md` | REG-643…648 |
| Price book | `parity/13-…` | `parity/14-price-book-migration-map-2026-09-25.md` | REG-649…655 |
| AI Visualizer | `parity/16-…` · the audit `parity/18-…` | `parity/17-ai-visualizer-migration-map-2026-09-25.md` | REG-671…698 |

(`parity/` is `design-source/context/parity/`.) The earlier modules — Lead Details' tabs, Tasks, Quotes, Files, Notes,
Questionnaire, Activity, Qanvast lead return — have their specs in `design-source/context/lead-*` and their decisions in
the register.

## 3 · Two lanes

**Your lane** — the data layer, server actions' internals, the port of 1.0's data, integrations with 1.0 services,
authentication, production infrastructure, performance, tests, CI. Vicky still sees every pull request (`CODEOWNERS`),
and a change here that reaches the screen — a new error, a new wait, a changed rule — needs her approval.

**Vicky's lane** — anything a user can see or feel: layout, spacing, colour, type, icons, copy, motion, interactions,
flows, empty / loading / error states, who may do what and how a refusal reads, and any new screen. Propose it; don't
build it first and hope. See *How to propose a change* in `DESIGN-PRINCIPLES.md`.

**Not sure which lane?** Ask Vicky before you start.

## 4 · What production replaces

The prototype stands in for a few things so it can run on a laptop with no services. Replace them behind the same
functions — the screens must not notice.

| The prototype | Production | Where |
| --- | --- | --- |
| No sign-in: the `members` row marked `is_you` is the signed-in member; *View as* moves it | Real authentication; the session resolves the member | `lib/db/session.ts` (`sessionMemberId` — the one place to change) |
| libSQL file `local.db` | The production database (libSQL / Turso works as is: set `DATABASE_URL` and `DATABASE_AUTH_TOKEN`) | `lib/db/index.ts` |
| Pictures stored as data URLs in rows, served at addresses (`/files/img/…`, `/visualizer/img/…`) | Object storage; keep the same addresses | map 17 › *Conventions* |
| The AI Visualizer's curated engine runs in the browser on three traced sample rooms | An image model behind the same `runPass` contract | `lib/visualizer/engine/`, map 17 §3 and §6 |
| Lead capture from Gmail, webhooks and forms is simulated | The real connections, into the same `captureLead` path | `app/leads/capture-actions.ts` |
| WhatsApp is a `wa.me` link the user presses; notifications are in-app only | The WhatsApp / email senders, from the same events | `lib/notifications/` |
| PDFs are the browser's Print or save as PDF | Server-side PDF if needed — the printed layout is the design | the Preview pages |
| "Coming soon in OpenMaison 2.0" answers every affordance not built yet | Build it only when Vicky has designed it | `useComingSoon` |
| Demo data: `fixtures/baseline.json` plus the repair rules | 1.0's data, ported by the migration maps | `scripts/repair-demo-data.ts` |

**The studio's picture routes need a signed-in session in production.** Today any request reads as the signed-in
member, because there is no login (map 17 › *Conventions*).

## 5 · House rules in the code

- **Server actions** live in `app/**/actions.ts` (and `*-actions.ts`), end with `revalidatePath`, and answer a refusal
  as `{ error: <the rule, in words> }` — never a thrown error, because production hides a thrown message and the user
  would see "please try again" instead of the rule.
- **A long string travels inside an object.** React's server-action decoder counts a bare string argument against a
  1,000,000-character limit whenever an action takes more than one argument. So pictures and rich text go in one
  object: `uploadFile(leadId, { parentId, name, image })`, not `uploadFile(leadId, parentId, name, image)`.
- **The database:** schema in `lib/db/schema.ts`. Migrations are **additive only**: `npm run db:generate`, then
  `npm run db:migrate`. A new kind of record also needs a line in the lead's Activity (`lib/leads/activity.ts`) and a
  repair rule, so the demo stays consistent.
- **Never touch someone's `local.db` from a test.** Point tests and probes at a scratch copy by putting `DATABASE_URL`
  on the same command line, for example `DATABASE_URL=file:/tmp/test.db npx next start -p 3011`. An `export` from an
  earlier command doesn't carry over, and the server then writes into `local.db`.
- **The demo baseline** is rebuilt, never hand-edited: a scratch database → `migrate` → `restore` → `repair` (twice)
  → `npm run db:baseline`, each with `DATABASE_URL` on the command.
- **UI code** (with Vicky's go-ahead): house pieces from `components/om/*`; design-system components through
  `@/components/ds` only; `--om-*` tokens only; icons from the self-hosted subset (`public/fonts/ICONS.txt` — a name
  outside it renders as a word; the re-subset steps are in `CLAUDE.md` › *Icons*).
- **TypeScript** is strict with `noUncheckedIndexedAccess`. The React hooks lint rules are strict: no `Date.now()` or
  reading refs in render, and no `setState` in an effect body.

## 6 · Check your work

```bash
npm run typecheck && npm run lint && npm run build
```

CI runs the same three on every pull request. For the screens you touched, run the module's probes: Playwright scripts
in `design-source/verify/**/verify-*.cjs`, each with its usage in its first lines. Run them against `next start` on a
scratch database, never your `local.db`.

## 7 · Pull requests

1. Branch from `main`; `main` takes changes only through pull requests.
2. Fill in the pull-request template, including screenshots for anything visible.
3. `CODEOWNERS` requests Vicky's review. Anything in her lane needs her approval before it merges.
4. Keep `design-source/REGISTER.md` to Vicky — propose an entry in the pull request and she adds it.

## 8 · Working with an AI assistant

`AGENTS.md` and `CLAUDE.md` are read by coding assistants (Claude Code, Cursor, Codex and others). They tell the assistant
the same rule as this guide, so it will stop and ask before changing anything visible — let it. `CLAUDE.md` is Vicky's
working context for her own design sessions: read it, don't edit it. Put developer notes in this guide or in your pull
request.

Next.js 16 appends a short block of agent rules to `AGENTS.md` whenever `npm run dev` starts. The block is already
committed, so your tree stays clean.
