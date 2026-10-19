# openmaison-prototype

Hi-fi, working prototype of the **OpenMaison 2.0** experience — the studio app for interior-design studios in
Singapore: leads, quotes, contracts, Quote X-Ray, the AI Visualizer, the price book and the studio's settings. Designed
by Vicky, built to be demoed on desktop, tablet and phone, on the
[OpenMaison Design System](https://github.com/vickyjesuraj-qanvast/openmaison-design-system).

Not a mockup: real database, real server actions, real state.

## Start here

| Read | For |
| --- | --- |
| **[DESIGN-PRINCIPLES.md](DESIGN-PRINCIPLES.md)** | Vicky's design principles — and the one rule: **nothing a user can see changes without Vicky** |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | The developer guide: running it, finding your way, the 1.0 → 2.0 migration maps, what production replaces, pull requests |
| **[FROM-1.0-TO-2.0.md](FROM-1.0-TO-2.0.md)** | Where every part of 1.0 lives in 2.0: what changed, what was left out, the renamed words, the tables, and the stand-ins to plug in |
| **[CLAUDE.md](CLAUDE.md)** › *Map* | Where every screen, action, table and rule lives, module by module |
| [AGENTS.md](AGENTS.md) | The rules AI coding assistants follow in this repo |


---

## Setup

```bash
npm run dev
```

That is the whole thing. Open http://localhost:3000.

No `npm install` first, no second repo, no build step, no database to create, no `.env` to fill in. `npm run dev`
runs `scripts/preflight.mjs` before Next starts, which does whatever has not been done yet:

| | |
| --- | --- |
| Checks Node | needs >= 20.9; says what to install if yours is older, instead of failing later inside Next |
| Installs dependencies | when `node_modules` is missing, incomplete, or older than `package-lock.json` — so a fresh clone **and** a clone that has just pulled new dependencies both just work |
| Writes `.env.local` | from `.env.example`, with a generated `AUTH_SECRET` |
| Applies migrations | every run, so a `git pull` that adds one needs nothing from you |
| Restores the demo data | from `fixtures/baseline.json` — **only** when there was no database, so it never overwrites the state you are demoing from |

Each step is a no-op once done, so the hundredth `npm run dev` costs nothing.

**Reset the demo data** at any time — Maison AI (the ✦ button, bottom right) › "Reset prototype to base",
or `npm run db:reset` from the terminal.

**If something does go wrong**, `rm -rf node_modules package-lock.json && npm install` and then `npm run dev`
puts everything back; nothing in your working tree is at risk.

---

## Responsive behaviour

Three designed form factors — never a squeezed desktop. The rules live in two media queries only:
`@media (max-width: 767px)` (phone) and `@media (max-width: 1024px)` (tablet and down); touch-growth rules add
`(hover: none) and (max-width: 1024px)` so a touch tablet gets them too.

| Width | Navigation | Surfaces |
| --- | --- | --- |
| `≤ 767px` — phone | `MobileChrome`: a 60px top bar, a 70px bottom dock and a More sheet | menus, pickers, panels and form dialogs are bottom sheets; tables are cards; toolbars are one row |
| `768–1024px` — tablet | the app rail | touch targets grow to 44px under a finger; section toolbars stay one row |
| `≥ 1025px` — desktop | the app rail (two states) | the mocks, pixel-identical at 1440 |

The page never scrolls sideways — wide content scrolls inside its own box. `prefers-reduced-motion` is respected
everywhere. There is **no dark mode**. The full system: `design-source/context/responsive.md`.

---

## Design system integration

Components come from `@openmaison/react`, tokens from `@openmaison/tokens`, and the handful of icons the
DS itself uses from `@openmaison/icons` — all three **vendored into `vendor/`** and wired up as `file:`
dependencies. They are build output, committed on purpose: the design system is private and unpublished,
and linking it from a sibling checkout meant every reviewer needed a second clone, access to that repo,
and a DS build before this app would install.

### Rules

1. **Import DS components from `@/components/ds`, never from `@openmaison/react`.**
   The DS is built for Storybook/Vite and ships no `'use client'` directives, so
   importing it into a Server Component throws as soon as a component touches a hook
   or React Aria context. `components/ds/index.ts` is the `'use client'` barrier that
   puts the whole library into the client graph. An ESLint rule enforces this.

2. **Never introduce a raw colour, radius, spacing or type value.** Every value in
   every `*.module.css` is an `--om-*` token. `app/globals.css` is the only file that
   touches token variables at all, and only to re-point the two font-family tokens at
   the `next/font` self-hosted faces.

3. **Never hand-edit `vendor/`.** It is regenerated wholesale; see below.

4. **Never hand-roll an input, menu, dialog, picker or sheet.** The house pieces in `components/om/*` wrap the DS and
   fill its gaps; reuse them, or ask Vicky for a new one.

### Things the DS does not provide yet

The house pieces in `components/om/*` fill these gaps; replace them only when the DS ships the real thing, and with
Vicky:

| Gap | House piece |
| --- | --- |
| Text / number / date / select fields in the mock's states | `text-field.tsx`, `date-field.tsx` (with the Material picker) |
| Menus, bottom sheets, dialogs, drawers, confirmations | `portal-menu.tsx`, `sheet.tsx`, `dialog.tsx`, `drawer.tsx`, `confirm-dialog.tsx` |
| Chip groups, number tiles, tooltips, snackbars | `chips.tsx`, `stat-tile.tsx`, `tooltip.tsx`, `snackbar.tsx` |
| Breakpoint and chrome sizes | `--app-*` variables in `app/globals.css` |

### After changing the design system

Only maintainers need this, and only they need the DS checked out beside this repo:

```bash
npm run ds:vendor -- --build   # build ../openmaison-design-system, then re-copy into vendor/
npm install                    # re-link the file: deps
git add vendor && git commit -m "vendor: refresh the design system"
```

`npm run ds:vendor` without `--build` re-copies whatever is already built. The icon subset is read out of
the built bundle, so a DS change that reaches for a new icon is picked up automatically.

### Known integration gotchas

- **TypeScript is pinned to the 6.x line** — `typescript-eslint` does not support
  TS 7 yet. **ESLint is pinned to 9.x** — `eslint-plugin-react` (via
  `eslint-config-next`) is not ESLint 10 compatible yet.
- **Install-script approvals live in `package.json`** (`allowScripts`: esbuild, fsevents, unrs-resolver).
  npm 11 asks before running a dependency's install scripts; recording the answer in the repo means a clone
  installs silently instead of printing warnings and asking each person to approve them.
- **`.npmrc` sets `engine-strict=true`** so an old Node stops at install with the version range, rather than
  failing later inside Next with something unreadable. No dependency caps the Node version, so this can only
  fire on a Node older than 20.9.
- **Sharing a dev server through a tunnel** (ngrok and friends): the host has to be in `allowedDevOrigins`
  in `next.config.ts`, or Next rejects the HMR websocket's upgrade and its dev client retries forever —
  which looks exactly like a page that never finishes loading. Free ngrok domains are `*.ngrok-free.dev`
  now, not `*.ngrok-free.app`; both are listed, along with the paid hosts.
- **`npm audit` reports a moderate advisory** for an old `esbuild` nested under `drizzle-kit`. It is the
  migration CLI's dev-server advisory, not shipped or served by this app, and `--force` would downgrade
  drizzle-kit. Nothing to do.

---

## Architecture

```
app/                      routes (App Router) — leads/ (the listing + Lead Details' tabs), tasks/, quotes/ (Tools › Quotes),
                          contracts/, quote-x-ray/, visualizer/, company/, settings/, qanvast-ops/, the client's links
                          (renders/, sign/, confirm/) and (editor)/ — the full-screen editors (quote, contract, template, visualizer)
components/
├── ds/                   'use client' barrier over @openmaison/react
├── om/                   the house pieces (fields, menus, sheets, dialogs, chips, tables' column model …)
├── shell/                the app shell: rail, headers, ghosts, snackbar host, Maison AI, the phone chrome
└── leads/ quotes/ contracts/ visualizer/ company/ …   each module's screens
lib/
├── db/                   Drizzle schema, the libSQL client, the signed-in member (session.ts), the demo baseline
└── leads/ quotes/ contracts/ visualizer/ company/ settings/ …   each module's rules and queries
scripts/                  preflight, migrations, the demo baseline and its repair rules, the visualizer's harnesses
design-source/            the design: DESIGN.md, REGISTER.md, specs, audits, migration maps, UAT, verified screenshots
```

The module-by-module map — every screen, action, table and rule — is in [CLAUDE.md](CLAUDE.md) › *Map*.

### Sign-in

Sign-in is a stand-in (any six digits pass — `/sign-in`, `lib/auth/*`), but its sessions are real: a browser that signed in
by a code is the member its own session names (`studio_sessions`), on every read and every write stamp, and only that browser.
A browser that never signed in or out is the demo's standing session — the `members` row marked `is_you` (Dane, the studio's
owner, in the demo) — and *Demo Studio › View as* moves it. `lib/db/session.ts` (`sessionMemberId`) is the one place that
says who a request is; real authentication plugs in there and in `lib/auth/`. The `users` / `organizations` / `memberships`
tables are the original scaffold's; the app itself runs one studio.

### Money

Stored in minor units (Singapore cents) as integers — never floats — in `*_minor` columns. Shown as S$ with en-SG
grouping (`lib/format.ts`).

---

## Scripts

| Script                             | What it does                                             |
| ---------------------------------- | -------------------------------------------------------- |
| `npm run dev`                              | Dev server (creates `.env.local` + `local.db` on first run) |
| `npm run build` / `npm start`              | Production build / serve                                 |
| `npm run lint` / `npm run typecheck`       | ESLint / `tsc --noEmit`                                  |
| `npm run format`                           | Prettier                                                 |
| `npm run ds:vendor`                        | Re-copy the built design system into `vendor/` (maintainers) |
| `npm run db:generate`                      | Generate SQL migrations from the Drizzle schema          |
| `npm run db:migrate` / `npm run db:seed`   | Apply migrations / load demo data                        |
| `npm run db:restore`                       | Put `local.db` back to `fixtures/baseline.json`          |
| `npm run db:repair`                        | Make the demo data consistent (run after any seeding)    |
| `npm run db:baseline`                      | Snapshot the curated state to `fixtures/baseline.json`   |
| `npm run db:reset`                         | Drop the local DB and rebuild it from the baseline       |
| `npm run setup`                            | The first-run steps on their own, without starting dev   |

## Database

**A `git pull` that brings a migration needs a restart of `npm run dev`** — it applies migrations every time it starts.
`local.db` is yours and is not in git, so a schema change that arrives with new code has to be applied to your own file;
a dev server that was already running when you pulled shows it as a runtime error naming a column the query wants and
your database does not have. `npm run db:migrate` does the same without restarting — safe any time, a no-op when there
is nothing to apply. Migrations are additive only. To take the freshly curated demo data as well, migrate
first, then use Maison AI › **Reset prototype to base** (or `npm run db:repair` to bring
your own rows in line without discarding them).

libSQL — a local `local.db` file by default, zero setup. Point `DATABASE_URL` at a
Turso URL (plus `DATABASE_AUTH_TOKEN`) to use the hosted variant; no code changes.

## Not built yet

Every affordance that isn't built answers **"Coming soon in OpenMaison 2.0"**. What the prototype stands in for — sign-in,
lead capture from Gmail and webhooks, WhatsApp sending, object storage, the AI Visualizer's image model — and what
production replaces, is listed in [FROM-1.0-TO-2.0.md](FROM-1.0-TO-2.0.md) § 7.
