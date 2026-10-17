# S41b-3 · Try the tools without an account, kept at sign-up — outcome (2026-10-14, lane B)

Package: the S41b data sweep's **M-01** (`s41b/sweep-data.md` §3, the `anon/*` route rows, the `anon_workspaces` table, the `anon-sweep` /
`anon-storage-gc` crons), on her "please make sure nothing left behind from 1.0 to 2.0" (2026-10-12). **Leads, Upload a quote (1.0's Quote
Digitizer) and Quote X-Ray open to a website visitor with no account, beside S36's AI Visualizer — one trial home at `/site/try` — on the
studio's own pieces; what the visitor makes is kept in one anonymous workspace per browser (1.0's `anon_workspaces`, never a studio's
database) and moves into the studio they start (or sign in to), each piece with its Activity line; 1.0's two sweeps run on S34's scheduler.**

Resumed after the first builder stopped on a usage limit (2026-10-13). Every change it left was read against this brief and 1.0's plg code and
kept, finished or redone — see *What the resume changed*. 1.0 read on `origin/deployment/plg` (64791f115, 2026-10-09): the specs
`2026-09-17-anonymous-first-access-design.md` · `2026-09-21-gated-platform-acquisition-design.md` · `2026-09-22-signup-gating-model-design.md`,
the plans `2026-09-17-anonymous-first-access-core.md` · `…-visualiser-materialiser.md` · `2026-09-24-om-ui-anon-surfaces.md`,
`scripts/migrations/315_anon_workspaces.sql` · `316_anon_token_fns.sql`, `src/lib/anon/**` (all 16), `src/app/api/anon/**` (all 5),
`src/app/api/cron/{anon-sweep,anon-storage-gc}`, `src/components/anon/signup-required-dialog.tsx`, `src/context/anon-{app,block}-context.tsx`,
`src/hooks/use-anon-{leads,quote-digitizer}.ts`, `src/components/leads/anon-quote-digitizer-panel.tsx`, `src/lib/om/visualizer/anon-sample.ts`,
`src/__tests__/anon-*.test.ts` (names and the trial-removed list), and the branch's anon / plg commits (the cap lowered to one, the X-Ray and
Visualizer trials withdrawn, the Meta Lead pixel, the landing's Try it free pill).

Register rows: `steps/reg-S41b3.md` (REG-S41b3.1…10). Probe: `design-source/verify/pending-modules/verify-pm2-s41b3.cjs` (+ its Node half
`pm2-s41b3-pure.mts`) — **175 / 175** (+ **6 / 6** with the switch off); shots in `design-source/verify/pending-modules/pm2-s41b3/`.

## Ledger — every 1.0 plg trial piece

| 1.0 (deployment/plg) | Status | Where in 2.0 |
| --- | --- | --- |
| `315_anon_workspaces.sql` — `anon_id` · `payload` (by surface) · `spent_tokens` (≥ 0) · `created_at` · `expires_at` (+7 days) + the expiry index; outside the tenant graph | **built** — the same table and columns, in a store **beside** the demo's database (`<db>.trial.db`, made only when a visitor first saves), never in a studio's | `lib/trial/store.ts` |
| `316_anon_token_fns.sql` — `anon_spend_tokens` (one conditional update, never past the grant) · `anon_refund_tokens` | **built** — `spend` / `refund`; ten at once against 50 → exactly five land (pure check) | `lib/trial/store.ts` |
| `231` · `232` · `417` revokes (anon DB grants) | **not applicable** — 2.0 has no anonymous database role; the trial's server actions are its only door and read only the visitor's own workspace | — |
| `lib/anon/cookie.ts` — `om_anon_v1`, HMAC-signed id, httpOnly · lax · 7 days, never throws on a bad cookie | **built** — `om_anon`, AUTH_SECRET (S36's key), same shape and rules | `lib/trial/server.ts` |
| `lib/anon/workspace.ts` — get (expired = gone, in SQL) · whole-payload write · delete · the sweep's oldest-first list | **built** — the write made a compare-and-set (two tabs never lose one) | `lib/trial/store.ts`, `server.ts` `changeWork` |
| `lib/anon/quota.ts` — `ANON_GRANT` 50 in AI credits' unit, spend before / refund on failure, fail closed | **built** — 1.0's grant and its price for a read (5), spent by a kept quote and a comparison; the trial's own allowance, never a studio's credits | `app/site/try/tools-actions.ts` |
| `quota.ts` — `ANON_ALLOWED_ACTIONS` (fast tier only) · the 60-call unmetered ceiling | **not applicable** — the three tools call no model and make no unmetered server call (the readers run in the browser) | — |
| `quota.ts` — `signupRequired` reasons `quota` · `none` · `expired` · `tier` · `account_action` | **built** — `quota` → 1.0's gate; `none` / `expired` → a fresh workspace on the next save (nothing was kept to lose); `tier` / `account_action` have no press in the trial | `components/trial/trial-frame.tsx` `TrialGate` |
| `lib/anon/registry.ts` + `materialisers.ts` — one registration point; a surface with no way home can't be stored | **built** — `SURFACES` (`leads` · `quote-digitizer` · `quote-xray`) and one claim that brings each home; the payload type holds no other key | `lib/trial/policy.ts`, `claim.ts` |
| `lib/anon/claim.ts` — per-surface outcomes, the workspace deleted only after a full claim | **built** — plus each piece struck off as it lands (a retry never brings one twice — 1.0 accepted duplicates) | `lib/trial/claim.ts` |
| `lib/anon/claim-on-login.ts` — the claim at login, raced against 15 s | **built** (sign-in claims) · **kept** (the 15 s race): 2.0's claim is the studio's own local writes and never throws; a race would let it run on after the response into whatever studio is open by then — the registry note asks the developers for their timeout with a remote tenancy | `app/sign-in/actions.ts`, `lib/services/registry.ts` |
| `materialisers/leads.ts` — leads inserted additively, `ANON_LEAD_LIMIT` (3 → 1 on 2026-09-30) | **built** — through the studio's `createLead`; **three** (decision 1) | `lib/trial/claim.ts` |
| `materialisers/quote-digitizer.ts` — a lead + its quote + its lines; the three-try brake; integer / cents traps | **built** — the quote through Create Quote's `createQuoteFromUpload` **on its client** (decision 3); the brake kept; the money traps don't apply (the studio's own action writes minor units) | `lib/trial/claim.ts` |
| `materialisers/visualizer.ts` + `api/anon/workspace/visualizer` + `api/anon/storage/upload` + `lib/om/visualizer/anon-sample.ts` | **S36** — the Visualizer's trial is S36's (the photo carries; renders don't — S36's decision 8) | `lib/visualizer/trial/**` |
| the retired `quote-xray` surface (`POST /api/anon/quote-xray`, 2026-09-21; drained 2026-09-22) | **built** — one free comparison, kept and claimed (decision 2) | `tools-actions.ts` `runTrialXray`, `claim.ts` |
| `lib/anon/quote-draft.ts` — the hand-built anonymous draft | **not ported** — 1.0 removed its save path itself (Task 9, "storage that silently discards what it stores is worse than none"); the trial's quote is the read | — |
| `lib/anon/storage.ts` — anonymous uploads, the purge, the copy to the studio, the orphan sweep | **not applicable** — the trial uploads nothing (the files are read in the browser; only their lines travel) | — |
| `lib/anon/surfaces.ts` — open · walled (real screens, demo data, blurred) · private | **built (open)** as the website's trial pages · **kept (walled)**: 2.0 shows no made-up records, and Projects, Tasks, Finance, the planner, the portal and the co-pilot need a studio — their site pages keep Book a demo | `app/site/try/**` |
| `lib/anon/try-now.ts` — `TRY_NOW_DESTINATIONS` | **built** for Leads and the Quote Digitizer (Upload a quote) — Try now, top and close (S36 did the Visualizer's); 1.0's walled ones keep Book a demo (above) | `components/site/platform-pages.tsx`, `lib/trial/policy.ts` `TRY_NOW` |
| `lib/anon/turnstile.ts` · `turnstile-client.ts` — before the first spend | **stand-in** — S36's bot-check seam (`setBotCheck`), asked before a workspace's first save | `lib/trial/server.ts` `workspaceForWrite` |
| `api/anon/session` — the workspace made on POST, 25 a day from one address | **built** — made on a visitor's first save (a page view mints none), 1.0's 25 a day per address on S36's limit store | `lib/trial/server.ts` |
| `api/anon/leads` (GET · POST, the cap on the server) | **built** — `addTrialLead` (+ Remove / Undo, 2.0's), the cap re-read on the server | `tools-actions.ts` |
| `api/anon/quote-digitizer` (one parse, 5 a minute, 4 MB, charge → parse → re-check → write, refund on any failure) | **built** — `keepTrialRead` (one kept quote, five a minute, the allowance spent then refunded on a refusal); 4 MB n/a (the file never leaves the browser; the server caps the lines: 500 · 60 sections) | `tools-actions.ts`, `lib/trial/clean.ts` |
| `api/cron/anon-sweep` (daily 06:00, 300 a run, oldest first) | **built** | `lib/services/sweep.ts` `trial-sweep`, `/api/cron/anon-sweep` |
| `api/cron/anon-storage-gc` (daily 08:00: orphaned anonymous files; the render stash) | **built** — the room deleted workspaces left, given back (the trial keeps no file; the render stash is 1.0's Visualizer's — 2.0 saves renders, keeps no stash) | `trial-files`, `/api/cron/anon-storage-gc` |
| `components/anon/signup-required-dialog.tsx` — the gate over the work ("Create an account to keep going", Create your studio · Not now) | **built** — the house `Dialog`, S31's door words ("Start your studio to keep going", Start your studio · Not now), each tool's own line | `trial-frame.tsx` `TrialGate` |
| the dialog's Meta Lead pixel on Create your studio (f7998d47e) | **not built** — 2.0 has no analytics (S36 noted 1.0's `track()` for the developers) | — |
| `context/anon-app-context.tsx` — the samples mixed into the visitor's board; the empty AppContext for the chrome | **kept** (the samples: no made-up records) · **n/a** (the trial pages don't mount the studio's shell) | — |
| `context/anon-block-context.tsx` — one gate mount | **n/a** — each page owns its gate | — |
| `hooks/use-anon-leads.ts` · `use-anon-quote-digitizer.ts` · `components/leads/anon-quote-digitizer-panel.tsx` | **built** — the three pages' own state on the studio's pieces | `components/trial/trial-{leads,quote,xray}.tsx` |
| `scripts/launch/verify-anon-surface.mjs` · `scripts/credits/verify-anon-workspace.sh` · `src/__tests__/anon-*.test.ts` | **built** as this step's probe and its Node half | `verify-pm2-s41b3.cjs`, `pm2-s41b3-pure.mts` |
| `lib/plan/gated-routes.ts` · `lib/billing/trial*.ts` · `components/billing/trial-banner.tsx` | **another card's** — plan gating and the 14-day Pro trial (S19) | — |

### Pending lines ledger (the sweep's M-01 and the step's own lines, word for word)
| Line | Status | Where |
| --- | --- | --- |
| "every module page's **Try now** opens the real tool with no sign-in" | **built** for the tools a visitor can use without a studio (Leads, Upload a quote; S36 the Visualizer) · **kept** for the rest (decision 4) | `platform-pages.tsx` |
| "Open to a stranger: the Dashboard, **Leads** (up to 3 leads — the 4th opens the account gate), the **AI Visualizer**, **Quote X-Ray** and the **Quote Digitizer** (one free quote read)" | **built** — Leads (3), Quote X-Ray (one), Upload a quote (one), the Visualizer (S36) · **kept** — the Dashboard (a studio's own figures; nothing honest to show a stranger) | `app/site/try/**` |
| "Projects, Tasks, Finance, the 3D planner, the portal set-up and the co-pilot show a wall" | **kept** — no wall of made-up data (decision 4) | — |
| "The visitor's work lives in `anon_workspaces` (a signed `om_anon_v1` cookie, `payload` namespaced per surface, `spent_tokens`, 7 days), bounded by Turnstile and per-workspace ceilings" | **built** · Turnstile **stand-in** (S36's seam) | `lib/trial/**` |
| "on sign-up the workspace is **claimed** into the new studio by one materialiser per surface" | **built** — sign-up and sign-in | `lib/trial/claim.ts` |
| "Two crons purge expired workspaces (`anon-sweep`) and their files (`anon-storage-gc`)" | **built** | `lib/services/sweep.ts` |
| "Routes: `anon/{session,leads,quote-digitizer,storage/upload,workspace/visualizer}`" | **built** as server actions (session · leads · quote-digitizer) · S36 (the Visualizer's two) | `tools-actions.ts` |
| *(step)* "one anonymous workspace per browser (1.0's table and columns)" | **built** | `lib/trial/store.ts` |
| *(step)* "each tool on the studio app's own pieces (the leads form / listing in a small trial frame, the X-Ray on its own engine `lib/xray/compare.ts` + the PDF reader `readQuoteText` (S21), Upload a quote's reader)" | **built** — `LeadFormModal trial`, the listing's table model, `compareQuotes` on the server with X-Ray's readers (`readSide` → `readQuoteText` for a PDF), Create Quote's `readRows` / `UploadReadingView`, `XrayReadingCards` | `components/trial/**` |
| *(step)* "1.0's limits from its code" | **built** — 7 days, 50 tokens at 5 a read, one read, 25 workspaces a day and 5 reads a minute per address; Leads 3 (decision 1) | `lib/trial/policy.ts` |
| *(step)* "nothing a visitor makes ever reaching a studio until they sign up" | **built** — the probe hashes every table of the demo's database across a whole trial and a sign-up | probe §2–§7 |
| *(step)* "at sign-up (S31 `createStudio`) everything they made moves into their new studio (leads with their sources, the reading, the quote) with an Activity line each" | **built** | `app/sign-up/actions.ts`, `lib/trial/claim.ts`, `lib/leads/activity.ts` |
| *(step)* "the sweeps … as `/api/cron/<job>` jobs on S34's scheduler (`CRON_ROUTES`, CRON_SECRET), idempotent" | **built** | `lib/services/sweep.ts` |
| *(step)* "Every trial address goes in `PUBLIC_PATHS`" | **built** — all under `/site` (S35's entry) | `lib/auth/paths.ts` (unchanged) |
| *(step)* "on when `TRIAL_VISUALIZER_ENABLED`'s sibling switch says so (decide one switch or one per tool from 1.0's code; on in this demo, off in a real build, as S36)" | **built** — `TRIAL_TOOLS_ENABLED`, one for the three (decision 5) | `lib/trial/policy.ts`, the pages' layouts |
| *(step)* "credits: a trial spends no studio's credits (1.0's rule — check its code for any anonymous allowance)" | **built** — 1.0's anonymous allowance is the workspace's own 50-token grant; the claim charges nothing (the probe reads the new studio's ledger) | `tools-actions.ts`, probe §7 |
| *(step)* "The website's pages (S35 `/site`) point to the new tools where 1.0's did" | **built** — Try now on Leads and Upload a quote, the trial home's list, the sitemap, the link cards | `platform-pages.tsx`, `lib/site/{seo,card}.ts` |

### Found in 1.0, not on a card
- **The Visualizer landing's floating "Try it free" pill** (3face5604 / 84657961c, 2026-10-08) — S36's page (its Try now sits top and close); for S42 to weigh.
- **1.0 later withdrew every anonymous model call** (2026-09-22 "signup comes before any model call"; the Visualizer to zero renders on 2026-09-30) — for its own spend; 2.0's tools are rules in the browser, so the trial keeps 1.0's earlier, fuller design. Said for Vicky.
- **TURNSTILE_DISABLED** (1.0: run without the bot check on purpose) — 2.0's stand-in bot check passes everyone already and the tools are off in a real build until set; not read, so not listed (the first builder had added it to `.env.example` and the registry — taken out).

## Decisions taken (as recommended — her "build all of them" 2026-10-11, her "nothing left behind" 2026-10-12)
1. **Leads: three, not 1.0's later one.** 1.0 lowered the cap to one on 2026-09-30 only because it then mixed five made-up "(Demo)" leads
   into the visitor's board; 2.0 shows no made-up records, so the reason for one is gone and 1.0's own three (the gated platform as shipped)
   stands — the brief's figure too.
2. **One free Quote X-Ray comparison and one free quote read, kept and claimed** — 1.0's own design of 2026-09-21; 1.0 withdrew both a day
   later only because each called a paid model. 2.0 reads by rule at no cost (S21: X-Ray never charges).
3. **A quote is always a client's.** 1.0's materialiser made a nameless "Digitized quote" lead with no contact; no 2.0 lead lacks its client's
   mobile (the form requires it) and Create Quote always starts on a lead. So the trial reads a file for free and asks *whose quote is it?*
   before keeping it (their lead, or Add the client — kept in the same go). One more press than 1.0 at the trial, none at sign-up, and no
   lead in the studio that the studio can't call. Reading is free and unlimited; keeping is the counted step.
4. **No walls of made-up data; the tools that need a studio keep Book a demo** (Projects, Tasks, Finance, the planner, the portal, the co-pilot;
   the Dashboard) — 2.0's honest-data rule over 1.0's blurred demo screens.
5. **One switch for the three** (`TRIAL_TOOLS_ENABLED`) — 1.0 shipped them on one workspace and one claim; the Visualizer keeps its own.
6. **The workspace store beside the demo's database, not a table in it** — 1.0 kept `anon_workspaces` outside the tenant graph, and the
   demo's database must stay untouched by a visitor; a remote database has no folder beside it, and there the developers plug their store
   (`setTrialStore`).
7. **Sign-in claims too, but never into the demo** (1.0: "logging into an existing account still claims"); in this prototype the demo is
   everyone's — signing in to it leaves the work in the trial for a studio of the visitor's own.
8. **Each claimed piece goes through the studio's own action** (`createLead`, `createQuoteFromUpload`, Quote X-Ray's record) on the studio's
   own database, after the studio is open and its member signed in — so a claimed record is exactly what the member would have made there.

## What the resume changed (the first builder's work, judged)
Kept as built and verified: the store, the cookie, the actions' checks, the pages, the frame, the ghosts, the sweeps, the registry entry, the
shared pieces it moved (`lead-input.ts`, `UploadReadingView`, `XrayReadingCards`), the Activity branch, the sign-up / sign-in wiring, R146.
Changed:
- **The kept quote rides on its client** (decision 3): the first build made a phoneless lead named after the file at sign-up; now the trial
  asks whose quote it is (`keepTrialRead` requires one of the visitor's leads; `setTrialReadLead` never clears it; the claim's fallback lead is
  gone; a lead holding the kept quote or a comparison can't be removed, said why). The page reads first (free), keeps on a press.
- **A comparison that can't run never starts a workspace** — both sides are checked before one is made (the first build made a workspace and
  set the cookie on a refused comparison).
- **Every trial action refuses while the tools are off** (the first build checked the switch only where a workspace was made).
- **The store's file is made only by a workspace's making** — a page view, a sweep or a Reset on a server nobody tried the tools on makes no
  empty file (S34's seam script runs the sweep on a copy).
- **Names kept as the studio writes them** (`titleCaseName`; trimmed before they are cut).
- **Focus and landing**: a read and a reading take the focus and land under the site's sticky bar (the reading opened under it, the focus
  fell to the site's skip link).
- **Phones**: the tool's frame steps back on a phone (no window inside a window), block heads stack, the leads' Create New Lead sits under the
  cards at full width (the head's line was squeezed to four words a line).
- **Words**: the quote's allowance "1 free quote to keep" / "Your free quote is kept"; the gate no longer promises "as many as you like".
- **`TURNSTILE_DISABLED`** taken out of the registry and `.env.example` (nothing reads it).
- `services.md` edited by hand for the registry entry (regenerating it from the registry would have overwritten S41's hand-kept lines).

## Found and fixed on the way
- **Every built page of the website answered 404 after any whole-app revalidation, until the next build** (S35's `/site/platform/<module>`,
  `/site/blog/<slug>`, S36's `/site/try/<tool>`): with `dynamicParams = false`, Next 16 answered NoFallbackError once anything ran
  `revalidatePath('/', 'layout')` — a sign-in, View as, a task, a quote's status… — so in the demo the site broke as soon as anyone used the
  app. Each now 404s an unknown slug from its own layout (S36's pattern, a real 404 above the ghost) and regenerates a known one; the probe
  checks four pages after two sign-ins and a 404 for an unknown module.

## What to check in the browser (signed out — sign out first; the demo's standing session sends /sign-up home)
- **1440** `/site/platform/leads` → **Try now** → `/site/try/leads`: Create New Lead → the studio's form (no Assign member) → a lead; Remove →
  Undo; three, then the gate.
- `/site/try/upload-a-quote` → *Sample kitchen quote* → the read (nothing kept) → pick a lead (or Add the client) → **Keep this quote**;
  *Compare it with another studio's quote* → `/site/try/quote-x-ray`: *Use the quote you read* + Urban Nest's sample → Compare → the reading;
  Copy the message.
- **Start your studio** → sign-up says what comes along → finish → the new studio's Leads with the three leads; Daniel's (or your client's)
  Quotes tab has the quote; Activity says where each came from; Quote X-Ray keeps the comparison (Pro lock on Free).
  (Afterwards: the studio menu › Studios · demo only › Demo Studio, or Reset prototype to base.)
- **390 touch**: the three pages, the form as a sheet, the leads as cards, no sideways scroll at 390 / 320.
- **The switch**: a server started with `TRIAL_TOOLS_ENABLED=false` → the three pages are the site's 404; the Visualizer's trial stays.

## Probes run (lane B, :3170, a scratch copy of `pbuild/base.db` migrated + repaired; `CRON_SECRET` set)
| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s41b3.cjs`** (this step; its Node half `pm2-s41b3-pure.mts` — 33 rules — runs inside it as §0) | **175 / 175** on the last build; **OFF=1** on a server started with `TRIAL_TOOLS_ENABLED=false`: **6 / 6**. The demo's tables as found (§7 hashes every table across the whole trial and a sign-up; `finally` puts back the sign-ins' sessions and bell mail), the studios made beside it removed, the trial store's rows cleared |
| `pending-modules/verify-pm2-s36.cjs` (the Visualizer trial — its 404 moved into its own layouts, the trial home now lists the tools) | **109 / 109**; **OFF=1** (`TRIAL_VISUALIZER_ENABLED=false`): **9 / 9** — and the tools stay open with the Visualizer off |
| `pending-modules/verify-pm2-s31.cjs` · `verify-pm2-s30.cjs` (sign-up · sign-in, now claiming) | **104 / 104** · **108 / 108** |
| `pending-modules/verify-pm2-s35.cjs` (the site: every sitemap page opens, the Cookie Policy names every cookie the code sets — `om_anon` included) | **138 / 138** |
| `pending-modules/verify-pm2-s34.cjs` with `S34_CRON` (the registry, 14 slots, the seam script's sweep running every job) | **170 / 170** (two assertions updated — *a deliberate change of this rule*, commented: 14 slots; every job runs) |
| `pending-modules/verify-pm2-s21.cjs` (X-Ray's PDF reader, shared with the trial) | **40 / 40** |
| regression runner (`design-source/verify/regression/run.cjs`, :3170, `RUN_DIR` with a fresh copy of the repaired scratch DB): `xr-r1` · `xr-r2` · `xr-r3` · `xr-r4` · `ghosts-same` · `ghosts-same-390` · `ghosts-strips` · `ghosts-film` | **27 / 27 · 31 / 31 · 28 / 28 · 16 / 16 · 67 / 67 · 67 / 67** · captures done · done (no keys given — a capture tool) |
| `npm run design:anatomy` (`next start` on a scratch copy) | **88 pages, 278 table heads, 25 dialogs, 41 page menus — all 1,749 measures hold** |
| `tsc --noEmit` · `eslint app components lib proxy.ts` · `design:lint` · `next build` (`DATABASE_URL=file:<scratch>`, under the lock) | clean · 0 errors (16 warnings, all older) · nothing new breaks a house rule · exit 0 |

## Migration and repair
**No migration** — the workspace store is its own database beside the demo's (created on first save, `lib/trial/store.ts` `SCHEMA`; git-ignored
`*.db.trial.db`). **Repair R146** (checks only): the demo's database holds no `trial_claimed` line (a claim never writes into the demo). R147
next in lane B.

## Shared pieces changed
- **Moved, behaviour unchanged**: `lib/leads/lead-input.ts` (the lead form's data type, `validateLeadForm`, `leadColumns` — `lead-form.tsx`
  re-exports both names; `app/leads/actions.ts` imports them); `components/quotes/upload-reading.tsx` (`UploadReadingView` — the Create Quote
  window renders it); `components/xray/xray-reading.tsx` (`XrayReadingCards` — the record page renders it); `xray-workspace.tsx` exports
  `XrayFile` · `readShown` · `unreadable`.
- `components/leads/lead-form.tsx` — `trial` prop (no Assign member, no duplicate check, no document fill, no files).
- `lib/auth/limit.ts` `takeTry(…, windowMs)`; `lib/visualizer/trial/server.ts` — the limit store's `take` honours its window, `takeLimited`.
- `lib/services/{registry,slots,sweep}.ts` — the `trial-workspaces` seam, slot `trial` (14 slots), jobs `trial-sweep` · `trial-files`, routes
  `anon-sweep` · `anon-storage-gc`; S34's probe updated (14 slots; every job runs) — *a deliberate change of this rule*, commented.
- `app/site/try/layout.tsx` → the Visualizer's 404 moved into `(home)/layout.tsx` and `[tool]/layout.tsx`; `app/site/platform/[module]` and
  `app/site/blog/[slug]` gained a layout (the 404 fix above); `components/site/{platform-pages,legal}.tsx`, `lib/site/{seo,card}.ts`.
- `components/auth/studio-sign-{up,in}.tsx`, `app/sign-{up,in}/actions.ts`, `app/sign-up/page.tsx` — the trial line, the claim, the landing.
- `app/leads/actions.ts` `resetPrototype` — clears the visitors' workspaces and this browser's `om_anon`.
- Nothing in `components/om/*`, the shell or `app/globals.css`.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins; every exception written down** — no mock: S36's trial frame and the site's pieces, the studio's own tools inside; every
   invented line is in REG-S41b3.1…6 and `lib/trial/policy.ts`.
2. **One system, no one-offs** — the studio's lead form, the listing's table model, Create Quote's reader and table, X-Ray's readers, engine
   and record cards — moved into shared files, not copied; the house `Dialog`, `Chips`, `EmptyState`, snackbar, `FieldError`, `Dropzone`; the
   ghost kit; tokens only (`design:lint` holds).
3. **Plain words** — "3 of 3 free leads left", "Whose quote is it?", "Keep this quote", "Start your studio to keep going"; no "workspace",
   "token", "quota" or "claim" on screen.
4. **Nothing is lost** — Remove with Undo; a refused keep or add puts the page back; the work is kept 7 days and said so from the first
   visit; a claim that fails keeps the piece for the next sign-in; nothing is claimed twice; a lead holding kept work can't be removed.
5. **Say why** — the gate says the limit and what keeps the work; each refusal its rule ("Pick whose quote it is first", "These are the same
   quote", "You're going a little fast", "Too many free trials from this address today", "{name} stays — your kept quote is theirs").
6. **Back returns where you came from** — each page's crumb to its site page; the gate's Not now leaves the visitor where they were; the
   studio opens on where the work landed.
7. **Every screen is whole** — each page has its server-drawn ghost (title where the page's lands, 1440 and 390 touch), its empty state, its
   refusals; an unknown address is a real 404.
8. **Every width is designed** — 1440 · 768 (mouse and touch) · 390 · 320 without sideways scroll, empty and full; on a phone the frame steps
   back, heads stack, the form is a sheet, the leads are cards.
9. **Tables follow the leads listing** — the visitor's leads on the listing's table model (frozen first column, Column settings, cards on a
   phone); the reading's Item by item is X-Ray's own table.
10. **Motion with purpose** — the house pieces' own; no new motion.
11. **Honest data** — no made-up leads; every figure is the visitor's own or the engine's; the stand-ins said (the store, the bot check); the
    claim's records are made by the studio's own actions and backed by their Activity lines.
12. **Reach for everyone** — labelled presses and regions, the answer (a read, a reading) takes the focus and lands in view under the
    site's bar, chips as a radio group with their arrow keys, the house dialogs' own focus handling and Esc.
- **How to add a missing thing:** one home (the website's `/site/try`, beside S36's); doors (Try now, the trial home's list, the sitemap);
  shown only when it applies (the client field once a read is shown, Add the client while there's room, the Pro line on X-Ray only); one
  filled press per row (Keep / Add the client; Start your studio in its own band); defaults that need no set-up (on in the demo, their only
  lead picked for a quote).

## Flags for Vicky
- **No mock** — S36's frame; the three pages' words are invented (REG rows).
- **More than 1.0's final branch gives**: one free comparison and one kept quote (1.0 withdrew both for model cost), Leads at three (1.0 went
  to one with fake samples) — decisions 1–2.
- **The quote asks whose it is before it's kept** (decision 3) — one press more than 1.0, so no studio ever gets a lead it can't call.
- **The website's built pages were 404ing after any app action** — fixed here (S35 / S36 pages).
- **In the demo, Start your studio lands on the Dashboard** while the browser is the demo's standing session (S31's rule) — sign out first.

## For the next steps
- **S42**: the Visualizer landing's floating Try it free pill (1.0, above); the site's claims check (steps.md) now also covers the three tools.
- **The developers**: plug the platform database's workspace store (`setTrialStore`), Turnstile (`setBotCheck`) and a lasting limit store
  (`setLimitStore`), then set `TRIAL_TOOLS_ENABLED=true`; give the claim a timeout with a remote tenancy.
