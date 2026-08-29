# openmaison-prototype

Hi-fi, working prototype of the **OpenMaison 2.0** experience — a multi-tenant SaaS for
interior design studios. Built to be demoed on desktop, tablet and mobile, and wired
directly to the [OpenMaison Design System](https://github.com/vickyjesuraj-livspace/openmaison-design-system).

Not a mockup: real auth, real database, real server actions.

---

## Prerequisites

|               |                                               |
| ------------- | --------------------------------------------- |
| Node          | >= 20.9 (developed on 24)                     |
| pnpm          | via `corepack enable` — pinned to 11.15.1     |
| Design system | cloned as a **sibling directory** (see below) |

The design system is consumed from disk, not from npm (it is private and unpublished).
The two repos must sit side by side:

```
GitHub/
├── openmaison-design-system/   <- private DS repo
└── openmaison-prototype/       <- this repo
```

---

## Setup

```bash
corepack enable

# 1. Build the design system (its dist/ is gitignored, so a fresh clone has none)
pnpm ds:build

# 2. Install, create .env.local, generate AUTH_SECRET, migrate + seed
pnpm install
pnpm setup

# 3. Run
pnpm dev
```

Open http://localhost:3000.

**Demo login:** `aditi@raointeriors.com` / `openmaison2026`
(Seeded studio "Rao Interiors" — 2 members, 5 projects, 12 rooms.)

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

Components come from `@openmaison/react`, tokens from `@openmaison/tokens`, icons from
`@openmaison/icons`, all linked from the sibling checkout via pnpm `link:`.

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

### Things the DS does not provide yet

The prototype fills these gaps locally; replace them when the DS ships the real thing:

| Gap                               | Local stand-in                                |
| --------------------------------- | --------------------------------------------- |
| No Card component (none in Figma) | `components/patterns/surface.tsx`             |
| No Select component               | Native `<select>` styled with `--om-*` tokens |
| No breakpoint tokens              | `--app-*` constants in `app/globals.css`      |

### After changing the design system

`dist/` is gitignored in the DS repo, so rebuild and reinstall:

```bash
pnpm ds:build
```

Turbopack usually picks the change up; restart `pnpm dev` if it does not.

### Known integration gotchas

- **`next.config.ts` widens `turbopack.root` to the parent directory** so Turbopack
  will resolve modules whose real path is outside this repo. Without it every
  `@openmaison/*` import fails to resolve.
- **`react` is aliased to this app's copy.** The linked DS has its own `react` in
  `node_modules`; without the alias React Aria gets a second React instance and every
  hook throws. Do not remove those aliases.
- **TypeScript is pinned to the 6.x line** — `typescript-eslint` does not support
  TS 7 yet. **ESLint is pinned to 9.x** — `eslint-plugin-react` (via
  `eslint-config-next`) is not ESLint 10 compatible yet.

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
| `pnpm dev`                         | Dev server                                               |
| `pnpm build` / `pnpm start`        | Production build / serve                                 |
| `pnpm lint` / `pnpm typecheck`     | ESLint / `tsc --noEmit`                                  |
| `pnpm format`                      | Prettier                                                 |
| `pnpm ds:build`                    | Rebuild the sibling design system (icons, tokens, react) |
| `pnpm db:generate`                 | Generate SQL migrations from the Drizzle schema          |
| `pnpm db:migrate` / `pnpm db:seed` | Apply migrations / load demo data                        |
| `pnpm db:reset`                    | Drop the local DB and rebuild it from scratch            |
| `pnpm setup`                       | `.env.local` + `AUTH_SECRET` + migrate + seed            |

## Database

libSQL — a local `local.db` file by default, zero setup. Point `DATABASE_URL` at a
Turso URL (plus `DATABASE_AUTH_TOKEN`) to use the hosted variant; no code changes.

## Not wired up yet

- **Billing** — plan catalogue is real (`lib/config.ts`), Stripe is not. Keys are
  stubbed in `.env.example`.
- **Invitations** — table and schema exist, no UI.
- **Profile / studio editing** — settings fields are read-only.
- **Room CRUD** — rooms come from the seed only.
