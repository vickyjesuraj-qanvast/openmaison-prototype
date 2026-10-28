# The calm UI audit — noise, inconsistency and words across the app (2026-10-27)

**His ask:** "I noticed a lot of UI issues and inconsistency across the pages and modules. Also, most of the UIs look too overwhelming and too
much noise on the screen … audit all of it and make it absolutely simple and super intuitive UI and UX across. Also the copies across the
modules are confusing for the studios to use — example Money under project could have been Payments and Needs you 51 in dashboard could have
been Needs your attention … check and report to me all of this now." His two examples: Company › Members and the Marketplace.

**The review page:** https://claude.ai/artifact/NEw4ESHdVR2GmCwk2dPTKQ — 18 themes, 289 findings and 650 wording rows, each with
Build · Later · Skip (words: Agree · Keep · Later) and a note. **His marks live in the page's db, collection `picks` (doc id = T-nn,
L-nn or W-nnn; fields `pick`, `note`, `at`) — read them with ArtifactData before building anything.** Nothing has been built.

**How it ran:** six read-only lanes on one production build (each its own `next start` on a scratch copy of the demo base, ports
3301–3306), brief `brief.md`, one shared measure `measure.cjs` (first-screen words, controls, purple text actions, filled buttons, capitals,
font styles, colours, boxes, truncated text) — about 220 screens and 750 shots of pages, dialogs, menus and phone views. Lanes: 1 shell &
your day · 2 Leads · 3 Projects & client portal · 4 Quotes, contracts & templates · 5 Company, Settings, Finance & Reports · 6 Tools.
Each lane's findings `lanes/lane-N.json`, its words `lanes/lane-N-words.json`, its measured screens `lanes/lane-N-pages.md`. `merge.py`
joins them into `data.json` (+ one compressed shot per finding in `shots/`); `themes.json` places every finding in one theme;
`review-page.html` is the page's source.

**Counts:** 289 findings — noise 105 · inconsistency 67 · copy 94 · defect 23; high 49 · med 148 · low 92.

**The 18 themes** (the rule each proposes; ids in `themes.json`):
T-01 one vocabulary (Needs your attention · Approvals · Payments with Client payments / Costs · To collect / To pay · Issues · Members ·
Client · Trade · Stage for stages only) · T-02 one verb on a row, the rest in its ⋮ · T-03 one filled button per screen · T-04 say each
thing once · T-05 explanations off the page · T-06 capitals only for a status · T-07 counts only where they help, one way to write them ·
T-08 empty means quiet · T-09 plain words a studio owner says · T-10 one look for each kind of control · T-11 one format for dates, money
and time · T-12 never cut the fact that matters · T-13 sentence case everywhere · T-14 long pages fold · T-15 phones get designed cards ·
T-16 one home per place, named plainly · T-17 numbers and states that disagree · T-18 defects to fix whatever else is decided.

**Where lanes disagreed, the page's T-01 settles it** (e.g. Finance's Money in / Money out → Client payments / Costs, as the project's
Payments tab). Names that reverse a logged decision are flagged in their finding: Tickets → Issues (REG-2524), Qanvast Ops (REG-77),
the Tasks row's mock-drawn Add Tags / Assign.

**Noted by the lanes, not findings:** two one-press buttons act at once with no review step — the Needs you "Confirm" on a client's
S$13,370 payment and "Sent it another way" on a quote (4-22 is the finding); lanes 3 and 4 put their scratch copies back.

## His go-ahead (2026-10-27) and the build

"There is a lot to go through manually — I want to go ahead with your recommendations … make sure no feature or functionality is lost —
this is just the visual and UX improvements." So every theme, finding and word is built **as recommended** (no marks were made on the
page), as a visual / wording / UX pass. The contract: `build/brief.md` — the nothing-is-lost rules (move never remove; no behaviour,
rule, data or stored-value change; every testid, route, slug and key kept; the guard `design-source/verify/ui-audit-build/guard.mjs`
must show nothing gone; a ledger of every moved action for the developers), the settled vocabulary (§2), what is kept by the contract
(Qanvast Ops, Quotes / Contracts in Tools, the rail and dock order, the tools' 1.0 names, one home per module), and the file ownership
of six lanes B1 shell & house & your day · B2 leads · B3 projects, portal, issues, messages · B4 quotes, contracts, templates, price
book · B5 company, settings, finance, reports · B6 tools & website. Guard before: 173 pages · 1,064 server-action call sites · 3,763
control handles · 120 keys.

**Register (2026-10-28):** the six lanes' 259 staged rows are numbered **REG-3075…3333** — B1 3075–3111 · B2 3112–3152 · B3 3153–3200 · B4 3201–3258 · B5 3259–3302 · B6 3303–3333; `build/reg-map.json` maps each staged id to its number. Each lane's record is kept in `build/outcome-b1…b6.md` and `build/reg-b1…b6.md` (B5's four parts in `build/b5-parts/`); what moved and what was renamed, for the developers: `build/changes-for-developers.md`; the calls for him: `build/calls-for-vicky.md`. Two more staged files, X and Y (`.claude/calm-build/X/reg.md` · `Y/reg.md`), follow: they are numbered after these when they land and added to `reg-map.json`.
 maps each lane-local id. The landing's rows follow: X's 11 (REG-3334…3344) and Y's 7 (REG-3345…3351), the Activity links (REG-3352),
and the closing regression's 20 fixes (REG-3353…3372).

## The landing (2026-10-28)

- **Landed** lane by lane into main with `.claude/calm-build/land.sh` (B3 · B6 · B1 · B4 · B5 · B2), tsc and the guard after each. The
  one conflict was a probe both B2 and B3 had restated (pm2-s05); B2's line, a superset, was kept.
- **The lanes' requests to each other** were applied by two agents split by ownership, X (B1 · B3 · B4 · B6 files and every probe) and
  Y (B2 · B5 files): 75 + 19 applied, the rest already done or skipped for touching a rule or a stored value (`build/outcome-x.md`,
  `outcome-y.md`). The paperwork pass found ten places where lanes disagreed; the five clear ones were fixed (one status map, outlined
  empty states on record pages, "clauses", the brief's "This week" tag, "Collected").
- **The closing regression** (`.claude/calm-build/reg/go.sh`: a fresh scratch base from migrate + restore, never local.db; one build;
  156 probes on four workers). Run 1: 60 red, 141 checks. Six triage agents (`build/regression/brief.md`, `A…F.md`) settled each:
  mostly probes reading old words (restated to the same rule, every line marked); **14 real defects, all fixed** (REG-3353…3372); one
  pre-existing (dane-p5b's chain, repair R179 — restated); **nothing lost**. Run 2: 153 of 156 green, the rest settled by targeted re-runs after the last fixes; **run 3 on the final source (05:48 → 07:08): 156 of 156 green** (`build/regression/run3-summary.txt`).
- **For Vicky:** `build/calls-for-vicky.md` (C-01…C-130; C-01…10 left unbuilt because they would change figures or data). **For the
  developers:** `build/changes-for-developers.md` + `build/guard-before.json`.
