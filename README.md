# openmaison-prototype

Hi-fi, working prototype of the **OpenMaison 2.0** experience — a multi-tenant SaaS for
interior design studios. Built to be demoed on desktop, tablet and mobile, and wired
directly to the [OpenMaison Design System](https://github.com/vickyjesuraj-qanvast/openmaison-design-system).

Not a mockup: real database, real server actions, real state.

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

The prototype targets three form factors, driven by the design system's own shell
components. Breakpoints live in `components/shell/app-shell.module.css` and are
mirrored in `components/shell/use-media-query.ts`, because `SideNav`'s expanded state
is a React prop rather than a CSS concern — **change both together**.

| Width                 | Navigation                   | Header                               |
| --------------------- | ---------------------------- | ------------------------------------ |
| `< 768px` — phone     | DS `BottomNav`, docked       | Avatar only; email + plan tag hidden |
| `768–1119px` — tablet | DS `SideNav`, 48px icon rail | Plan tag + "Sign out" label appear   |
| `>= 1120px` — desktop | DS `SideNav`, 200px expanded | Full identity block                  |

Other responsive details worth knowing:

- The icon-only sign-out button on mobile keeps its label in the a11y tree
  (visually hidden, not `display: none`).
- Tap targets are held at 44px minimum in list rows.
- `env(safe-area-inset-bottom)` padding on the bottom nav for notched phones.
- `prefers-reduced-motion` is respected globally.
- Dark mode is automatic: the DS flips primitives on `[data-theme="dark"]`.

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

3. **Borders are inset `box-shadow`, not `border`** — Figma strokes are inside, and
   this is the convention the DS itself follows.

4. **Never hand-edit `vendor/`.** It is regenerated wholesale; see below.

### Things the DS does not provide yet

The prototype fills these gaps locally; replace them when the DS ships the real thing:

| Gap                               | Local stand-in                                |
| --------------------------------- | --------------------------------------------- |
| No Card component (none in Figma) | `components/patterns/surface.tsx`             |
| No Select component               | Native `<select>` styled with `--om-*` tokens |
| No breakpoint tokens              | `--app-*` constants in `app/globals.css`      |

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
- **`npm audit` reports a moderate advisory** for an old `esbuild` nested under `drizzle-kit`. It is the
  migration CLI's dev-server advisory, not shipped or served by this app, and `--force` would downgrade
  drizzle-kit. Nothing to do.

---

## Architecture

```
app/
├── (marketing)/          public — landing, pricing
├── (auth)/               login, signup
├── (app)/                authenticated — dashboard, projects, settings, billing
└── api/health/           DB reachability probe
components/
├── ds/                   'use client' barrier over @openmaison/react
├── shell/                app + marketing shells, responsive nav
└── patterns/             Surface, StatTile, PageHeading, status tag
lib/
├── auth/                 password (scrypt), session (HMAC), DAL, server actions
├── db/                   drizzle schema + libSQL client
├── actions/              project mutations
├── config.ts             site config + plan catalogue
└── validation.ts         zod schemas shared by actions and forms
proxy.ts                  redirect-only route protection
```

### Auth

Self-contained so the prototype runs with no external auth service:

- Passwords: `scrypt` (N=2^17, r=8, p=1) via `node:crypto`.
- Sessions: HMAC-SHA256 signed cookie via **Web Crypto**, so the same code runs in
  `proxy.ts` on the Edge runtime.
- `proxy.ts` only checks the signature — it is a redirect optimisation, **not** the
  authorisation boundary. Real authorisation is `lib/auth/dal.ts`, which re-checks the
  membership on every request (so revoking access takes effect immediately).

To swap in Auth.js / Clerk / WorkOS, replace `lib/auth/session.ts` and
`lib/auth/actions.ts`; `getAuthContext()` is the only thing the rest of the app uses.

### Multi-tenancy

`users → memberships → organizations`, with `projects` and `rooms` scoped to an
organisation. Tenant scope is part of every lookup, so a valid id from another studio
404s rather than leaking.

### Money

Stored in minor units (paise) as integers — never floats. Formatted with
`Intl.NumberFormat('en-IN')`.

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

**After every `git pull`, run `npm run db:migrate`.** `local.db` is yours and is not in
git, so a schema change that arrives with new code has to be applied to your own file.
Skipping it shows up as a runtime error naming a column the query wants and your
database does not have. The command is safe to run any time and does nothing when
there is nothing to apply. To take the freshly curated demo data as well, migrate
first, then use Maison AI › **Reset prototype to base** (or `npm run db:repair` to bring
your own rows in line without discarding them).

libSQL — a local `local.db` file by default, zero setup. Point `DATABASE_URL` at a
Turso URL (plus `DATABASE_AUTH_TOKEN`) to use the hosted variant; no code changes.

## Not wired up yet

- **Billing** — plan catalogue is real (`lib/config.ts`), Stripe is not. Keys are
  stubbed in `.env.example`.
- **Invitations** — table and schema exist, no UI.
- **Profile / studio editing** — settings fields are read-only.
- **Room CRUD** — rooms come from the seed only.
