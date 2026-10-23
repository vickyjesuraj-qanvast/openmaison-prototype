# Quotes on the move — the responsive audit and its build (2026-10-22)

**His ask (2026-10-22):** "Now that we have complete all the modules. I noticed that the responsive mobile and tablet screens are not
correct i found a lot of issues across modules. Honestly the lead listing is too good but anything with the too heavy data is not pure
responsive. I want you to do a deep audit module by module and let's start one module at a time … let's pick quotes module and in the mobile
and tablet is it really needed to show the editor as it is or is it better to show the PDF preview and only then they need to edit they
can click the edit and go to the editor. … think a different experience in mobile and tablet screens which don't have to be the same
experience as it is in desktop. This will reduce the cognitive load and improve the usability for the studios on the move … relook at the
layouts, components, font sizes, and what all it requires to make the world-class responsive design."

## 1. The audit (read-only, the same day)
- A production build of main (`2d4ecac` + the pronoun fix) on a scratch copy of the demo database, captured at **390×844**, **768×1024** and
  **1024×768** with touch emulation (`isMobile: true, hasTouch: true`): 52 shared shots (`capture.cjs`) and three audit lanes (A entry and the
  client's pages · B the editor's frame and sections · C Items and the document) that measured touch boxes, type sizes, truncation and
  sideways scroll and read the code behind each screen. Their reports: `audit/A-…md`, `audit/B-…md`, `audit/C-…md` (+ the brief they
  followed, `audit/audit-brief.md`). Their shots and measurement files stayed in the session scratchpad.
- **73 findings** (3 blockers · 36 major · 34 minor) across nine screens, and **12 proposals** (P-01…P-12) for a different experience on a
  phone and a tablet, drawn as screens with OpenMaison's tokens, on the review page https://claude.ai/artifact/PGpvB8iEfQECebAzvVYv2w
  (its data: `review-page-data.json`). Most findings are resolved by a proposal and say which; 21 are stand-alone fixes.
- **The answer in one line:** on a phone a quote should open as its document and the editor should come only on Edit. The pieces exist (the
  confirmation page's reading cards, REG-597's Items cards, the line sheet, the Send sheet); what changes is the order a designer meets them
  in, and the sizes.
- Lane A's note for every later audit: a Playwright full-page capture drops `(hover: none)` mid-shot and parks hover-only floats at the
  visible edge; take tablet shots viewport-only (A-19).

## 2. His picks (2026-10-22 08:19, `picks-2026-10-22.json`)
Build on all twelve proposals; Build on all twenty-one stand-alone fixes; the recommended answer on every question: **Q-01** a tablet in
portrait gets the phone model · **Q-02** Edit lands on the section list · **Q-03** no full desktop grid on a touch tablet · **Q-04** the status
changes only on the quote · **Q-05** the dock hides while editing · **Q-06** the viewer opens fit to width · **Q-07** one primary per state
(Draft → Send ▾ · Sent for Approval → Approve / none · Approved → Send ▾ · Sent to Client → Remind · Confirmed → Send for signature · Signed →
Open contract or Move to Won · Expired → Revise) · **Q-08** Contracts is the next module. "I have marked it please go ahead."

## 3. The build
`brief.md` is the contract every package follows (widths, the scale, the Quote screen, the section list and screens through `SectionCard`'s
screen mode, the Preview, the lists, Create, the client's page, Items, the house rules) and the ownership table. Five packages in git
worktrees off `77d1031`, no commits, each with its own lane database and port; two waves.

| Pkg | Builds | Wave | Outcome | Rows |
| --- | --- | --- | --- | --- |
| K1 | P-01 · P-02 · P-09 (+ B-03 B-04 B-05 B-06 B-07 B-09 B-10 B-14 B-20 B-24 B-25 B-26 B-27 C-23; fixes B-21 · B-23) | 1 | `outcome-K1.md` | `reg-K1.md` |
| K2 | P-03 · P-04 · P-07 (+ C-01 C-02 C-04…C-08 C-10…C-15 C-22 C-24; fixes C-03 · C-09) | 1 | `outcome-K2.md` | `reg-K2.md` |
| K4 | P-06 · P-10 · P-11 · P-12 (+ A-01 A-02 A-03 A-05…A-08 A-10 A-11 A-14…A-18 A-20 A-22; fixes A-04 · A-09 · A-12 · A-13 · A-21 · A-23) | 1 | `outcome-K4.md` | `reg-K4.md` |
| K3 | P-05 (+ C-16 C-17 C-18 C-20 C-21 B-08; fix C-19) | 2 | `outcome-K3.md` | `reg-K3.md` |
| K5 | P-08 in the sections + fixes B-01 · B-02 · B-11 · B-12 · B-13 · B-15 · B-16 · B-17 · B-18 · B-19 · B-22 | 2 | `outcome-K5.md` | `reg-K5.md` |

Probes: `design-source/verify/responsive-quotes/verify-rq-k{1…5}.cjs`. Register rows are numbered from REG-2540 at landing.

## 4. Log
- 08:40 — base database = the morning's copy of local.db (`rq-build/base.db`); the record folder made; the brief written.
- 08:45 — wave 1 launched: K1 (port 3171), K2 (3172), K4 (3174), one after another (parallel worktree creation races).
- 10:05 — **K2 landed** (Items: 21 paths + 23 new files; `land.sh`, patch applied cleanly; probe rq-k2 98/98, touched probes s44i 110 · dane P3 71 · sw-r1 35 · qe-r1 34 green on its lane; 1440 DOM + geometry identical). Its notes to K1 (`--items-head-top`, the bar's sub-line, the Items ghost, the pane's 736) and to K4 / K5 (delete the C-03 `inset` overrides K2's lint rule lists) sent. K3 launched (3173).
- 11:55 — **K1 landed** (20 paths + 14 new; two probe files took both K1's and K2's deliberate changes — merged by hand: qe-r1's 1024 step keeps K2's working-grid checks on K1's `?edit=items` address; sw-r1's 768 step opens `?edit=items` then runs K2's pinned-foot checks). Probe rq-k1 116/0 + 19 pure; 1440 byte-identical on 8 pages; 14 other probes green on its lane. K5 launched (3175). Decisions K1 flagged: the section screen's Done is its ← (one filled button), Remind writes nothing (no reminder record on quotes), the ⋮ keeps all 16 rows grouped, one `!important` until K5's `side` prop.
- 12:40 — **K4 landed** (30 paths + 10 new, no conflicts). Probe rq-k4 143/0 + pure; 1440 byte-identical on 12 pages (the view-only notice gains its Message button at every width — A-23); s02 · P4 · s44q · pj-gap-d green, s46a's two misses are the lane's missing `TRIAL_TOOLS_ENABLED`. Shared pieces: the table core's per-breakpoint tablet default (`tabletHidden`, `om.columns.<table>.tablet`), the sign notice pieces, the tab ghosts' phone card. K3 told to reuse K4's `paper-viewer.tsx`.
- 13:10 — integration fix: K1's `screen-bar.module.css` gave the bar's Done a 44 box with the `button::after { inset }` override K2's new lint rule forbids (the rule was not in K1's worktree); Done now grows by `min-height` (`section-list.module.css` `.done`), the generic rule is gone. tsc · eslint (3 pre-existing errors in quote-editor.tsx, the same on HEAD) · design:lint hold on main with K1 + K2 + K4.
- 14:20 — **K3 landed** (7 paths + 4 new; K3's extended copy of K4's `paper-viewer.*` taken over K4's — side-by-side pages with snap, dots, in-viewer pinch, `subtitle`, `onFit` reporting width × zoom; additive to K4's API). Probe rq-k3 91/0; s44i · s44f · p4 · sw-r1 · ghosts-same green on its lane; 1440 byte-identical on 7 pages. Integration fix: its tablet-bar Send grew its 44 box with an `::after` (the lint rule was not in its worktree) — now `min-height` on touch. Decisions K3 flagged: Send ▾ in the foot on a phone and in the bar on a tablet; closing a viewer you arrived on returns to the quote; Download lives where the paper is; dots up to six pages.
- 16:39 — the session hit its API limit mid-K5 (the probe at 67 · 7, the 1440 crops taken, no outcome); the orchestrator had just registered the five probes with the regression harness and prepared its databases from the morning's base (`rq-build/reg/`).
- 18:05 (a new session, VS Code restarted) — K5 resumed in its worktree by a finisher: four of the seven misses were the probe's (an icon's ligature in a hit test, a radio input measured for its row, a kebab matched in another section, a share read by an id Undo had replaced), three the code's (B-17 the character count's second row, B-02 the clamp measured against `innerWidth` and moved by a transform, the payment card's inset); B-16 needed no rule — the house touch overlay (REG-344) already reaches every foot's DS button, so the first sitting's copies were reverted. `verify-rq-k5.cjs` 79/0; 16 related probes green, Dane P4's 12.10 assertion changed deliberately; 1440: 14 pages, 2 identical, 12 differing only in the header's relative time stamp.
- 19:25 — **K5 landed** (23 paths + 3 new, no conflicts). The register rows numbered: **REG-2540…2598** (K1 2540–2548 · K2 2549–2561 · K4 2562–2578 · K3 2579–2586 · K5 2587–2598; `reg-map.json`). UAT chapter 26 (16 steps) written; `responsive.md` § On the move written at 15:35.
- 20:10 — the closing regression on one main build (43 probes: rq-k1…k5, the pending-modules and projects probes the build touched, qe-r1…r5, sw-r1…r5, ct-r1…r4, overlays, Dane P3 · P4 · P5b, ux-P4 · P5, tpl-parity, xr-r3, folders-pickers, ghosts, search). Four older probes and three of the packages' own still assumed the phone opens the editor (the Items at `/quotes/<id>`, a Create ▾ in the phone's Items bar, a folded section to open, the header's quote switcher, the Client combobox in Create Quote, a section's note from its card) — each pointed at the landed design with the `(quotes on the move, a deliberate change of this rule)` comment. One product fix found by rq-k2: **REG-2599** — Esc inside a grid cell left the Items screen (the house Escape layer runs ahead of the grid's); now it cancels the edit. Dane P5b's two misses are the demo day's (a task due today reads "Today", not its weekday) — pre-existing, not this build's.
- 21:40 — three more landing fixes from the evening's checks, each with a register row: **REG-2600** a tap focuses a DS search bar on a phone (the REG-344 overlay sat above the input — the Dane P3 probe's Create Quote step), **REG-2601** the Quote screen's Next line reads a contract already out for signature (the Contracts audit's C-21), **REG-2602** the Maison AI button steps out of a tablet's section screen (it covered the line pane's Done at 1024 — the rq-k2 probe). The design-lint baseline lowered (icon-button-overlay 19 → 10).
- 22:05 — **the closing regression on the final build is green**: rq-k1 116 · rq-k2 98 · rq-k3 90 · rq-k4 143 · rq-k5 79 · Dane P3 70 · P4 37 · sw-r1…r5 · qe-r1…r5 · ct-r1…r4 · overlays 67 · tpl-parity 20 · ux-P4 56 · P5 58 · xr-r3 · folders-pickers · ghosts ×2 · search · pm2-s02 · s04 · s10 · s43e 45 (run from the repo — the harness's path rewrite misses its `ROOT`) · s44f · s44i 110 · s44o · s44q · s44t · s46a · s46b · pj-gap-d 65. Not green, not this build's: Dane P5b 54/56 (a task due on the demo day reads "Today", not its weekday), pm2-s46c 66/69 (this base copy of local.db has one unseen new lead where the probe wants more — the owner had opened leads on :3000 that morning). No test server left; local.db untouched (checksum as at the start).
