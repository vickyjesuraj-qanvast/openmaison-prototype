# S31 · A new studio joins — outcome (2026-10-13, lane A)

Card: `onboarding:studio-sign-up` (recommendation "needs her mocks / decision"; its two questions taken as recommended — *Decisions*). Built
in full on an **honest stand-in for the developers' tenancy**: a studio signs itself up from sign-in's page and is made — its Owner, its
records, its plan — **in a database of its own beside the demo's**, opened at once by the server; **the demo's database is never written**
(the probe proves it table by table). Carried notes taken: **S08** (an EMPTY brand row, the Owner owed the welcome), **S11** (no fonts),
**S30** (the Sign Up door where `noAccountHelp` sits, `PUBLIC_PATHS`, `startStudioSession`, the Qanvast `provision` case), **S09** (the first
Owner has no invitation), **S19** (Free with 1.0's welcome credits), **S13** (a second studio's portal address), **S16 · S24** (a "listed on
Qanvast" record), the first-run empty states (REG-735…737).

1.0 read: `src/app/onboarding/page.tsx` (+ `components/onboarding/{RoleCard,OTPInput,PhoneInput}.tsx`), `src/app/login/page.tsx` (No account
found → Sign Up / "Contact support for account setup"), `src/app/api/admin/studios/route.ts` (POST — Add Studio), `src/lib/studio-default-
taxonomies.ts`, `src/app/api/auth/signup-status/route.ts` + `admin/settings` (`platform_config.signup_paused`), the Qanvast line's
`api/auth/verify` (`autoProvisionUser`, on `origin/integ/security-qanvast`), `src/context/session-context.tsx` (`isQanvastListed`),
`docs/features/studio-customization/onboarding-questionnaire.md` (the staff interview). Register rows: `steps/reg-S31.md` (REG-S31.1…10).
Probe: `design-source/verify/pending-modules/verify-pm2-s31.cjs` (**103 / 103** on the repaired base, plus **5 / 5** for paused sign-ups on a server started with `OPENMAISON_SIGN_UPS_PAUSED=1`; the scratch DB put back as found and no studio left beside it); shots in `design-source/verify/pending-modules/pm2-s31/`.

## Pending lines ledger

| Card line (word for word) | Status | Where |
| --- | --- | --- |
| "Create a new studio and its owner in one go (staff do it in 1.0; nobody can in 2.0, which is one demo studio)" | **built** — self-serve (the card's question, as recommended): `/sign-up` (how you work → the studio's name, yours, your mobile → the 6-digit code) makes the studio and its Owner in one go through `createStudio` — the Owner (role Owner, owed the welcome), the studio's record, an empty brand kit and details, Free with 1.0's 150 welcome AI credits + 30 a month, 1.0's plan rows, OpenMaison's feeds, the record of its making (`studio_origin`); all or nothing. **Stand-in, said plainly:** on this prototype the studio is a database of its own beside the demo's, one studio open at a time (every tab follows; a restart opens the demo; signing in with a studio's number opens it again); the code is never sent (any six digits, the page says so). **The seam:** `setStudioProvisioner` (the developers' tenancy makes the tenant and the same records) | `app/sign-up/*`, `components/auth/studio-sign-up.tsx`, `lib/studios/{model,create,registry,chrome}.ts`, `lib/db/index.ts` |
| "A new studio starts with starter lists: 11 lead sources, 6 project types, 8 issue categories, the roles and the standard pipeline" | **built** — as 2.0's house defaults, which a studio reads until it changes them (no rows needed — the "defaults need no set-up" rule): lead sources = 1.0's eleven + the five REG-607 added (Settings › Lead management says "Not set yet — these are the defaults."); ticket categories = 1.0's eight escalation categories in 2.0's words; the seven stages and their rules; the four roles. **Project types: kept** — 2.0's three (Whole-home renovation · Partial renovation · Commercial fit-out) are the Projects build's fixed list, each with its schedule rule; 1.0's per-studio Project Types editor is on no card (*Found in 1.0*) | `lib/settings/types.ts` `DEFAULT_LEAD_SOURCES`, `lib/projects/tickets-model.ts` `DEFAULT_CATEGORIES`, `lib/projects/model.ts` `PROJECT_TYPES` |
| "Pause sign-ups for the whole platform ('Contact support for account setup')" | **built (the behaviour) · stand-in (the switch)** — 1.0's switch lives in Platform admin › Settings, excluded by her: here it is an environment setting (`OPENMAISON_SIGN_UPS_PAUSED=1`) until the developers' Platform side keeps it. Paused: sign-in shows no door until a number has no account, then "New to OpenMaison? Contact support for account setup." (1.0's words); sign-up's first step says "Sign-ups are paused. Contact support for account setup." and asks nothing; both actions refuse (probe §12 on a paused server) | `lib/studios/create.ts` `signUpsPaused`, `components/auth/studio-sign-{in,up}.tsx`, `app/sign-up/actions.ts` |
| "The public sign-up tour with a role choice (Owner / in-studio designer / freelancer) — a sandbox in 1.0 that saves nothing" | **built, in 2.0's shape** — the role choice is the first step and now decides: *I run a studio* (picked to begin with) → the studio; *I work in a studio* → nothing made, "Ask your studio to add you" (S09's invitation) + Go to sign in; *I work on my own* → a studio of one (the card's question, as recommended — no kind of its own; no Your team step). 1.0's two feature-pitch screens (Get started · Your unified workspace) are the website's — the marketing site is S35 | `components/auth/studio-sign-up.tsx`, `lib/studios/model.ts` `SIGN_UP_KINDS` |
| *(S08's note)* a new studio starts with an EMPTY `brand` row and its owner with `welcome_due = 1` | **built** — `emptyBrandSetting(name)` (no logo, no details, no bank; the own entity named); Set up your studio opens "0 of 7 done" with every step open; the welcome waits ("Welcome, {name}" · Set up your studio) | `lib/studios/model.ts`, `lib/studios/create.ts` |
| *(S11's note)* a new studio starts with no fonts of its own | **built** — nothing copied; `studio_fonts` empty (probe §4) | — |
| *(S30's note)* the Sign Up door where `noAccountHelp` sits; the Owner signs in through `startStudioSession`; the Qanvast `provision` case making a studio; a new public address in `PUBLIC_PATHS` | **built** — "New to OpenMaison? Start your studio" under the form (and after No account found, with the number handed over); `startStudioSession` after the studio opens; `ProvisionedMember.studio` makes the studio on a first Qanvast sign-in (seam — the stand-in never answers it); `/sign-up` + 1.0's `/onboarding` in `PUBLIC_PATHS`, and someone signed in goes home (proxy.ts) | `app/sign-in/actions.ts`, `lib/auth/{paths,provider}.ts`, `proxy.ts` |
| *(S09's note)* its first owner is not invited — no invitation row | **built** — `studio_invitations` empty in a new studio (probe §4) | — |
| *(S19's note)* a new studio's plan — Free / trial, 1.0's rules | **built** — Free from the sign-up's moment (1.0's new studio; its `signupCreditGrant` 150 with the top-ups, `credit_allowance` 30 a month); the 14-day Pro trial stays where 1.0 offers it (Plans); plan locks apply (S19) | `lib/studios/create.ts` |
| *(S13's note)* a second studio's portal address must resolve in `resolvePortalSlug` per studio | **built by the one-open-studio shape** — the open studio's address is made from its name and resolves; another studio's client links (portal, signing, quote links) open while that studio is open (a prototype limit, said in REG-S31.4) | `lib/portal/queries.ts` (unchanged) |
| *(S16 · S24's notes)* a "listed on Qanvast" record would let the rail hide Qanvast Ops / the Marketplace for a studio that isn't | **kept — nothing to hide**: 1.0 sets `isQanvastListed: true` for every studio (`src/context/session-context.tsx:56`), so every studio sees Qanvast Ops; a new studio sees it with Qanvast's Hangouts feed | — |
| *(first-run empty states, REG-735…737)* | **built** — a new studio opens every page on its first run; a sweep of 49 studio pages finds no error and nothing of the demo studio (probe §5) | — |

## How it lands — the honest shape (the prompt's "decide the honest shape by the card")
- **A studio is made at once**, not "waiting for OpenMaison": the card's own question was self-serve vs staff-made; self-serve is the
  recommended, 2.0-like answer (Plans, the set-up list, invitations and the first-run pages already exist for it), and staff-made is Platform
  admin (excluded by her).
- **Its own database, one studio open at a time** (2.0 is one studio per database, REG-667): `<DATABASE_URL's file>.studios/<key>.db`
  (`local.db.studios/` on her machine — git-ignored), migrated to the build's schema when made or opened. The server process opens one;
  `lib/db/index.ts`'s client sends every query to it. The demo's file is only *read* (the feeds' copies, the sign-in lookup).
- **Getting between them:** the studio block's **Studios · demo only** group (the demo's and each one started here, the open one ticked) —
  or Sign out and sign in with the other studio's number or email. **Reset prototype to base** opens the demo and clears the studios started
  here. A restart opens the demo; a browser signed in to another studio is told its session ended and signs in again.
- **PRODUCTION:** the developers' tenancy replaces the switch (`setStudioProvisioner`; the session names the studio) — nothing else reads it.

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
1. **Self-serve sign-up on Free** (question 1). **A freelancer is a studio of one** (question 2) — no kind of its own; its set-up list drops
   Your team, its welcome speaks of no team; Plans already suggests Pro — Freelance for one person.
2. **"I work in a studio" makes nothing** — the Owner adds them (S09's invitation).
3. **Mobile required, email optional** (1.0's sign-up was mobile + code; a code goes to the mobile).
4. **A number or email that already has an account is refused with the way in** (1.0's admin route: "A user with this phone number already
   exists") — across this prototype's studios.
5. **The starter lists are the house defaults** (no rows written); project types stay fixed (kept).
6. **Pausing sign-ups is an environment switch** until the developers' Platform side (Platform admin excluded).
7. **The studio block names the open studio**; the demo keeps the mock's words ("Demo Studio · Dane Bruce Lee", its avatar).
8. **No revalidation in place on a studio switch** — the next page loads in full (a refresh in place drew the other studio's records under
   the old page and took the sentence meant for the next).

## Found and fixed on the way
- **View as's carried sentence was taken by the page being left** (an action's refresh re-ran the effect) — taken once per shell now
  (`components/shell/view-as-popover.tsx`); a studio switch says "Switched to {studio}" on the new page.
- **The demo's identity leaked into a new studio** in shared samples and ghosts — the quote template's sample (payment sentence, preparer),
  Settings › Notifications / Messages to clients' previews (`{studio}`, `{link}`), Company › Profile's social example, the Settings /
  Client portal / Your profile ghosts' words: each now reads the open studio (the demo's unchanged).

## Found in 1.0, not on a card
- **The admin form's password** (Supabase auth) — 2.0 signs in by a code only (S30); nothing to build.
- **A studio's region** (`country_code`, currency, timezone, locale) — Countries beyond Singapore, **on hold by her** (S33); a new studio is a
  Singapore studio (+65, S$, GST).
- **`verification_status: 'not_submitted'`** on a new studio — the Qanvast listing's verification is its own card (S35…S41).
- **A studio's `status` (active / suspended), Beta sign-ups, the 45–60-minute staff interview** — Platform admin's and staff's, excluded by her;
  the interview's settings all have 2.0 homes (Settings, Set up your studio) except **`settings.workflow.leadAssignment` (auto / round-robin /
  manual)**, which is in the interview doc only, never in 1.0's code — **for S41b**.
- **1.0's per-studio Project Types editor** (Accounts › Project Types, `studio_taxonomies` type `project_type`) — 2.0's types are fixed by the
  Projects build; on no card — **for S41b** (her call whether studios edit them).
- **`chat_identity_name`** (the studio's name in chats) — 2.0's Messages use the studio's name; nothing to build.

## What to check in the browser
- **Signed out (Dane: studio block › Sign out)**, 1440: sign-in's foot "New to OpenMaison? Start your studio" › *I run a studio* › Continue ›
  a studio name, your name, a new mobile (8 or 9 first) › Send me a code › any six digits › **Start my studio** → an empty Leads page with
  "Welcome, {you}" › Set up your studio → "0 of 7 done". The rail's block shows the studio's name and initial; Company › Plan & AI credits
  shows Free, 180 AI credits.
- Try a number of the demo (`9883 7542` — Sarah) or `dane@demostudio.sg`: "already has an account — sign in with it instead".
- *I work on my own* → About your business; its list has six steps, no Your team. *I work in a studio* → Ask your studio to add you.
- **Studio block › Studios · demo only › Demo Studio** → "Switched to Demo Studio", the demo's leads as Dane; back the same way.
- **Sign out in the new studio, sign in as `dane@demostudio.sg`** → the demo; sign out, sign in with the new number → the new studio.
- **390 touch:** every step fits (no sideways scroll at 390 / 320); the top bar's avatar › You sheet ends with the Studios group.
- **Maison AI › Reset prototype to base** → the demo, and the studios started here are gone.
- Roles: a new studio has one member (its Owner); invite a Designer / Accounting from Company › Members as usual (S09).

## Probes run (lane A, :3160, scratch copies of pbuild/base.db migrated + repaired)
| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s31.cjs` (this step) | **103 / 103** · paused run (`PAUSED=1`, a server with `OPENMAISON_SIGN_UPS_PAUSED=1`) **5 / 5** |
| `pending-modules/verify-pm2-s08.cjs` (Set up your studio, the welcome) · `s09` (invitations) · `s30` (signing in) | 70 / 70 · 79 / 79 · 108 / 108 (its quote / signing link checks run only when the base holds such a link) |
| `pending-modules/verify-pm2-s19.cjs` (plans) · `s01` (Your profile) · `s16` (the You group) · `s13` (the portal) · `s14` · `s18` | 116 / 116 · 80 / 80 · 56 / 56 · 65 / 65 · 69 / 69 · 63 / 63 |
| regression runner, :3160 — `view-as` · `panel-order` · `ghosts-same` · `ghosts-same-390` · `first-run-ghosts` · `first-run-empty` · `first-run-noleads` · `first-run-full` | 23 · prints (no failures) · 65 · 65 · 15 · 89 · 5 · 6 — all green |
| regression runner — `st-r1` · `kb-r1` · `kb-r2` · `tpl-parity` (the template sample) · `cr-r1` · `cr-r5` · `sw-r4` · `overlays` · `search` · `dane-p5b` · `dane-p6` · `ct-r2` · `ux-p6` | 57 · 35 · 29 · 20 · 59 · 16 · 35 · 67 · 27 · 56 · 41 · 24 · 57 — all green |
| `parity-map-build/verify-pm-b.cjs` · `verify-pm-d.cjs` · `reports-in-company-2026-10-08/verify-reports.cjs` | 47 / 47 · 33 / 33 · 41 / 41 |
| `tsc --noEmit` · `eslint app components lib proxy.ts` · `design:lint` · `design:anatomy` · `next build` (`DATABASE_URL=file:<scratch>`, under the lock) | clean · 0 errors (16 warnings, none in this step's files) · nothing new · 1717 measures hold · exit 0 |
| By hand: a server restart with a studio open | the demo opens; the studio's browser reads "Your session ended" and signing in with its number opens the studio again |

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins; every exception written down** — no mock for sign-up: composed from sign-in's page (itself the portal's sign-in) and the
   house choice cards; every invented line in REG-S31.1…6; the flags below.
2. **One system, no one-offs** — the portal's sign-in stylesheet and sign-in's, `ChoiceCard`, `TextField` (+65 leading, "(optional)" label),
   `CodeBoxes`, DS `Checkbox`, the read-only note's tint for the paused notice, the ghost kit (`GhostSheet` · `Bone` · `Words` on the choice
   card's own classes), the studio menu's group / row pieces, `couldnt`, `leaveThen`, the snackbar; `design:lint` holds.
3. **Plain words for studio people** — "Start your studio", "How do you work?", "I run a studio · I work in a studio · I work on my own",
   "Ask your studio to add you", "You start on Free: 150 AI credits to try the tools, then 30 a month.", "Start my studio", "Switched to {studio}".
4. **Nothing is lost** — the demo's database is never written by a sign-up or a switch; a studio started here stays (restart, switching)
   until Reset prototype to base; Back keeps every choice and field; the number typed on sign-in rides to sign-up.
5. **Say why** — every refusal says what to do (sign in instead, a mobile not a landline, contact support while paused, reset at 20); the
   prototype line says why the demo stays as it is.
6. **Back returns where you came from** — Back on each step returns to the step before with what was typed; "Use another number" returns
   to the details; the member step and the foot lead to sign-in; the new studio lands on its front door.
7. **Every screen is whole** — sign-up has its layout (snackbar host), loader and reveal drawing one ghost (head, choices, foot within 4–6 px
   at 1440 · 390 · 320; the paused notice in both), inline errors with `role=alert`, the notice `role=status`; a new studio's 49 pages open.
8. **Every width is designed** — 1440 · 390 · 320 checked on every step (no sideways scroll against `screen.width`; code boxes 56 tall);
   the phone's You sheet carries the Studios group.
9. **Tables follow the leads listing** — not applicable (no table).
10. **Motion with purpose** — the house reveal and the menus' own motion only.
11. **Honest data** — every state comes from a record (the new studio's members, settings, subscription, balance and ledger summing to it,
    sessions); the stand-ins are named on the page (no code sent; the studio opens on its own here); R121 keeps the demo free of a sign-up.
12. **Reach for everyone** — a labelled radio group of house radios, labelled fields with their errors described, a fieldset for the code,
    ↵ submits each step, focus moves to the step's first control once the ghost lets go, one-time-code autofill, 56-px boxes.
- **How to add a missing thing:** one home (sign-up is a page in its own right, reached from sign-in's door; switching joins the studio menu
  View as already holds, demo only); shown only when it applies (the Studios group once a studio was started, the paused line after No account
  found, Your team only for a studio with one); **one filled button** per step; defaults that need no set-up (I run a studio picked, Keep me
  signed in ticked, the starter lists, Free).

## Flags for Vicky
- **No mock** for sign-up — sign-in's page composed, three steps.
- **Self-serve on Free** — 1.0's studios were made by OpenMaison staff.
- **A freelancer is a studio of one** — the Team step drops; no kind of its own.
- **One studio open at a time on this prototype** — the whole server (every tab) follows; a studio's client links open while it is open.
- **"Studios · demo only"** in the studio menu, and **Reset prototype to base clears the studios started here**.
- **A new studio is GST-registered by default** (the house default; the switch is on Company › Profile).
- **The template sample in a new studio** is prepared by the member looking at it (the demo's still shows Dane).

## Shared pieces changed
- **`lib/db/index.ts`** — the client every query runs on is now the open studio's (`OpenStudioClient` delegating to the demo's or a
  started studio's guarded client; state on `globalThis`); `demoDatabase`, `studioClient`, `setOpenStudioUrl`, `forgetStudioClient` exported.
  With no studio started it is the demo's client exactly as before.
- **The shell:** `components/shell/app-shell.tsx` (reads `fetchStudioChrome`, seeds the ghosts with the studio's name and `studio.solo`),
  `app-rail.tsx` (+ css: the name / owner / picture from the studio, ellipsis on a long name, `.studioInitial`), `mobile-nav.tsx` (the
  avatar's label, the Studios group), `view-as-popover.tsx` (the Studios group; the carried sentence taken once per shell).
- **`lib/ghost-shape.tsx`** — `GhostSeed studio` + `useSeedStudio()`.
- **Sign-in:** `components/auth/studio-sign-in.tsx` (the door, the handover, paused words, a switched sign-in loads in full; its ghost draws
  the door), `app/sign-in/{page,loading,actions}.tsx` (the lookup across this prototype's studios, the Qanvast studio case),
  `lib/auth/paths.ts` (`SIGN_UP_PATH`, `PUBLIC_PATHS`), `lib/auth/session.ts` (`leaveThisStudio`), `lib/auth/forget.ts` (`forgetStudio`),
  `lib/auth/provider.ts` (`ProvisionedMember.studio`), `proxy.ts` (sign-up skipped when signed in).
- **Set up your studio:** `lib/studio-setup/{model,queries}.ts` (`applies`, `solo`); `app/settings/settings-ghost.tsx` (the studio's name,
  the six steps).
- **Samples:** `lib/templates/data.ts` `sampleFor(studio, preparer?)`, `lib/templates/queries.ts`; `app/settings/{notifications,client-messages}-settings.tsx`
  + `settings-view.tsx` (`studio`); `lib/company/copy.ts` `profileSocialHelp`, `components/company/{profile-view,company-ghosts}.tsx`;
  `components/company/portal/portal-ghosts.tsx`, `components/profile/your-profile-ghost.tsx`.
- `app/leads/actions.ts` `resetPrototype` (opens the demo, clears the studios started here); `.gitignore` (`*.db.studios/`).

## Migration and repair
- **No migration** (a new studio is a database of its own; its record of making is a settings key).
- **Repair R121** — checks only: "a sign-up’s record in the demo’s database" (no `studio_origin` in the demo). Full repair: all checks pass.
  **Next free in lane A: R122.**

## For the next steps
- **S34 (real services):** `setStudioProvisioner` (the tenancy) beside `setSignInProvider`; the paused switch moves to the Platform side.
- **S35 (marketing site / Book a demo):** the site's "Start free" goes to `/sign-up`; 1.0's feature-pitch screens belong there.
- **S41b:** 1.0's per-studio Project Types editor; the interview doc's lead assignment (auto / round-robin), never in 1.0's code.
- **Any new studio-scoped table:** nothing to do — a new studio's database is migrated with the build; **a new OpenMaison feed table** (a copy
  every studio reads) joins `FEED_TABLES` in `lib/studios/create.ts`.
- **Any page that prints the studio's name or a sample:** read the studio's record (or `useSeedStudio()` in a ghost) — never "Demo Studio".
- **UAT:** step 1.11 added to `design-source/uat/story/ch1.json` — rebuild the workbook (`build_uat.py`); the testers' sheet tabs are Vicky's.
