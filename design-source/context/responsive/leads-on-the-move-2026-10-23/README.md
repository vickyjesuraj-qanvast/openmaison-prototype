# Leads on the move — the responsive audit and its proposal (2026-10-23)

**His ask:** the Contracts page's Q-08 ("the next module") answered *Leads*, as recommended, on 2026-10-22 23:12 with the rest of his picks;
"commit and continue" on 2026-10-23 after the Contracts build. The module is audited the way Quotes and Contracts were
(`../quotes-on-the-move-2026-10-22/`, `../contracts-on-the-move-2026-10-22/`). Nothing of this is built until he marks the page.

His words set the benchmark: "Honestly the lead listing is too good but anything with the too heavy data is not pure responsive." The weight
of this audit is the lead's page, the moments that move it (the Move stage window), the tabs, the forms and the imports.

## 1. The audit (read-only)
- A production build of main at `a6caecb1` (Quotes and Contracts on the move committed) on a scratch copy of the demo database, captured at
  **390×844**, **768×1024** and **1024×768** with touch emulation: 77 shared shots (`audit/capture-leads.cjs`) and three lanes — **A** the
  listing and the ways a lead arrives · **B** the lead's page and the moments that move it · **C** the lead's tabs. Their brief:
  `audit/audit-brief.md`; their reports: `audit/A-the-listing-and-arrivals.md` (30) · `audit/B-the-lead-page-and-its-moments.md` (26) ·
  `audit/C-the-lead-tabs.md` (27).
- **83 findings** (2 blockers · 41 major · 40 minor) across nine surfaces and **13 proposals** (P-01…P-13) drawn as screens
  (`audit/drawn-screens.html`), with 8 questions, on the review page **https://claude.ai/artifact/Az4YWRVEPWoMe8PwsPn3gh** (its data `review-page-data.json`, his picks in its db
  `picks`). 72 findings are resolved by a proposal; 11 are stand-alone fixes.
- **The answer in one line:** the listing stays (his benchmark) and its card gains the last contact and the next follow-up; a lead on a phone
  opens as a person and a position (stage and days, Call · WhatsApp, one Next line, Due now, a row per tab, a sticky Log ▾ + the next move); a
  call is logged in three taps; the Move stage window is one step per screen; a new lead is a name and a mobile.
- **The two blockers were plain bugs and are fixed tonight** (no pick needed): **REG-2640** — an unowned lead's "Move to Contacted" opened
  the Contacted step and lost the typed log on Save (B-01); every forward move now asks the owner rule first. **REG-2641** — Auto Fill and
  Attach opened under the Notes contact log's phone sheet (C-01). Probe `design-source/verify/responsive-leads/verify-rl-fixes.cjs` 22/0.

## 2. His picks
Not made yet. Read them with `ArtifactData list picks` on the page before building anything.

## 3. The build
Not started.

## 4. Log
- 2026-10-23 03:40 — committed the Quotes + Contracts builds (`a6caecb1`, on main, not pushed); the audit server on :3014; 77 shots.
- 03:50 — lanes A · B · C launched on Opus (the build agents' earlier model is out of usage credits).
- 05:20 — the three lanes back (A 30 · B 26 · C 27); B-01 and C-01 fixed as REG-2640 · REG-2641 with a pure test and a probe (22/0 at 390 and 1440); the review page built from the three tables.
- 05:35 — the review page published, private to him: https://claude.ai/artifact/Az4YWRVEPWoMe8PwsPn3gh (13 proposals · 11 stand-alone fixes · 8 questions).
