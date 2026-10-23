# Contracts on the move — the responsive audit and its proposal (2026-10-22, evening)

**His ask:** the Quotes audit's Q-08 ("the next module") answered *Contracts*, as recommended, on 2026-10-22 08:19 with the rest of his picks;
the module is audited the same way Quotes was (`../quotes-on-the-move-2026-10-22/`). Nothing of this is built until he marks the page.

## 1. The audit (read-only)
- A production build of main with the Quotes-on-the-move build landed (REG-2525…2586) on a scratch copy of the morning's demo database,
  captured at **390×844**, **768×1024** and **1024×768** with touch emulation (`isMobile: true, hasTouch: true`): 62 shared shots
  (`audit/capture-contracts.cjs`) and three audit lanes — **A** entry, the lists and the client's signing pages · **B** the contract editor ·
  **C** templates and the contract pieces inside other flows — that measured touch boxes, type sizes, truncation and sideways scroll, read the
  code behind each screen, and sent, signed, bundled and deleted their own test records on the scratch database (Olivia's Draft was sent;
  Vivien Lee's and Serena Koh's leads carried the lanes' records). Their reports: `audit/A-…md`, `audit/B-…md`, `audit/C-…md` (+ the brief
  they followed, `audit/audit-brief.md`). Their shots and measurement files stayed in the session scratchpad (`scratchpad/rwd-contracts/`).
- **75 findings** (3 blockers · 31 major · 41 minor) across eight surfaces and **13 proposals** (P-01…P-13) drawn as screens with OpenMaison's
  tokens (`audit/drawn-screens.html`), on the review page **https://claude.ai/artifact/LWsKVuRnUiALheTvetDzUv** (its data:
  `review-page-data.json`; his picks save in its db collection `picks` → `picks/<id>` = `{pick, answer, note}`). 65 findings are resolved by
  a proposal and say which; 10 are stand-alone fixes.
- **The answer in one line:** the same as Quotes — a contract opens as the thing the client gets and the editor comes on Edit as a short list,
  with the paper as a full-screen Document screen and a signature field placed by choosing *where*, never by a thumb's caret — and one surface
  matters more than all the others: the client's signing page, which today puts the form above the paper, the ticks 3,400px from the end of
  the reading, a code field without autofill, a pad that warps the stroke and a 4px thumbnail of the quote they agree to.
- **The three blockers:** B-01 the contract's title field is 0px wide at 768 (the meta row gives everything to the other fields); A-16 the
  quote the client signs (`/sign/<token>/quote`) is an A4 zoomed to 0.45 — 4px type; C-27 the Won step's "Attach client signed contract"
  accepts PDFs only with no camera, so the paper the client just signed on site cannot be attached from a phone.
- **Fixed the same evening, outside the proposal:** the Quote screen's Next line now reads a live contract (REG-2586 — lane C's C-21: with a
  contract already out for signature it still said "send … for signature" and would have raised a second contract); a tap on any DS search
  bar on a phone now focuses it (REG-2585, found by the Dane P3 probe while the audit ran).
- Lanes' notes for later audits: under Chromium's touch emulation `innerWidth` / `scrollWidth` grow with overflowing content — measure
  against `documentElement.clientWidth`; the DS SearchBar's input is not the hit target (its shell is); a card's checkbox and ⋮ in one corner
  collide at 44.

## 2. His picks (2026-10-22 23:12, `picks-2026-10-22.json`)
**Build on all thirteen proposals; Build on all ten stand-alone fixes; the recommended answer on every question** — Q-01 a tablet in portrait
gets the phone model · Q-02 Type first, Draw one tap away · Q-03 the card's status is read-only · Q-04 the photo is the signed copy · Q-05 paper
first on the client's page · Q-06 "Save a copy" is a keepable signed page until the PDF renderer · Q-07 the primary map Draft → Send · Sent →
Remind · Signed → Move to Won / Download signed copy · Q-08 Leads is the next module. "I have marked everything in the doc please check and
built accordingly."

## 3. The build
`brief.md` is the contract every package follows (the Contract screen, Edit as a short list, the Document frame + content, placing a
signature field, the client's page and sheet, the lists, New contract, templates, the pieces inside the quote and the project, the Won step's
photo, the scale, the fixes) and the ownership table. Four packages in git worktrees, each starting from a "WIP base" commit of main's
uncommitted Quotes-on-the-move state (`rc-build/setup-lane.sh`), no commits; two waves. Register rows are numbered from REG-2588 at landing.

| Pkg | Builds | Wave | Outcome | Rows |
| --- | --- | --- | --- | --- |
| C1 | P-01 · P-02 · P-13 (its screens) · the Preview · B-17 · B-21 · B-24 (+ B-01 B-02 B-06 B-07 B-08 B-11 B-14 B-15 B-16 B-18 B-22 B-23 C-22) | 1 | `outcome-c1.md` | `reg-c1.md` |
| C2 | P-03 (content) · P-04 · C-13 · C-15 · C-16 (+ B-03 B-04 B-05 B-12 B-13 B-19 B-20 C-08 C-10 C-11 C-17) | 1 | `outcome-c2.md` | `reg-c2.md` |
| C3 | P-05 · P-06 · A-24 · A-25 · C-26 (+ A-16…A-23 A-26) | 1 | `outcome-c3.md` | `reg-c3.md` |
| C4 | P-07 · P-08 · P-09 · P-10 · P-11 · P-12 · A-09 · A-13 · A-15 · C-06 (+ A-01…A-08 A-10 A-12 A-14 C-01…C-05 C-07 C-09 C-12 C-14 C-18 C-20 C-21 C-23 C-24 C-25 C-27) | 2 | `outcome-c4.md` | `reg-c4.md` |

Probes: `design-source/verify/responsive-contracts/verify-rc-c{1…4}.cjs`.

## 4. Log
- 20:05 — the audit server on :3014 (a scratch copy of the morning's base); 62 shots at 390 · 768 · 1024.
- 20:15 — lanes A · B · C launched (one agent each, read-only, their own records on the scratch DB).
- 20:40 — B back (24: 1 blocker · 9 major · 14 minor). 21:00 — C back (27: 1 · 11 · 15). 21:05 — A back (26 rows, one holds: 1 · 12 · 12).
- 21:10 — REG-2586 (the Quote screen's Next line reads a live contract) from C-21, with pure tests; REG-2585 (search bars take a tap) from
  the Dane P3 probe.
- 21:30 — the review page built from the three tables (`content.py` → `review-page-data.json` → the page) and published, private to him.
- 23:12 — his picks read from the page's db (31 rows, all Build / as recommended); `picks-2026-10-22.json`; the brief written; the lane set-up tested on a throwaway worktree (matches main's working tree).
- 23:20 — wave 1 launched: C1 (port 3181), C2 (3182), C3 (3183) in parallel, each in its own worktree off the WIP base.
- 00:40 — **C3 landed** (12 paths changed + 14 new; the lane's temporary commit undone before landing, the diff = the working tree over the WIP base). Probe rc-c3 110/0; ct-r1…r4 · pm2-s02 · s03 · s04 · s44q · s44r · s42b · s46d · pm-f · pj-gap-d · ux-P5 · Dane P5a · P6 · sw-r2 · rq-k4 · rq-k5 · overlays green on its lane; 1440 byte-identical on nine pages (the three dead-link notices gain Message {studio} — A-25, deliberate; the quote page's underline anti-aliases 3px differently from drawing through one render path — flagged). Decisions flagged ▲: the pad maps uniformly (Signature Settings too), the phone model runs to 1024, Message {studio} on the desk's notices, the one render path for the quote page.
- 01:10 — **C1 landed** (17 paths changed + 14 new; a plain `git apply` — the 3-way refuses files main holds untracked, the Quotes screen pieces). Probe rc-c1 175/0 + pure; ct-r1…r4 · pm2-s03 · s02 · s44q · s44r · Dane P5a · ux-P5 · rq-k1…k5 · overlays · ghosts-same green on its lane; 1440 byte-identical on eight pages. Decisions flagged ▲: the Document screen full width at 1024 landscape; the quote row's sheet leads with Open; the eSign screens' interim Add-at-the-end until C2's placement sheet; the desk Preview now holds its ghost through PageReveal.
- 01:45 — **C2 landed** (6 paths + 15 new, 3-way clean). Probe rc-c2 124/0 + 34 pure; ct-r1…r3 · pm2-s03 · s11 · s29 · s42b · s44g · s44q · s44r · s44t · Dane P2b · P3 · P4 · P5a · ux-P5 · sw-r4 · overlays green on its lane; ct-r4 and sw-r2 each wait for the frame's ≡ to be named "Outline" (C4 wires it); 1440 byte-identical on eight pages. Decisions flagged ▲: the gate rows are labels on the desk too (C-13); the + ▾ order (six actions, then Insert a field); "Text ▾" as words; "Add another" on a placed field. Wave 1 complete — main type-checks and lints with C1 · C2 · C3; the WIP base regenerated for C4.
- 23:35 IST (times above this line were written in SGT by mistake; read them as IST) — wave 1 verified together on one main build: type-check, lint (the three old quote-editor errors only), design lint and build green; the combined probe lane started (rc-c1 · c2 · c3 · ct-r1…r3 · rq-k1 · rq-k5 · pm2-s03 · overlays).
- 23:40 — **C4 stopped by a usage limit** on the build agents' model (Fable) about 30 minutes in, with 23 files changed and 3 new in its worktree (the phone card's words, the lists and toolbar, the picker, the Deleted / Archived sheets, a new-contract sheet, the quote's Contract row, the project Money tile, the touch tooltip). The owner switched the session to Opus; C4 resumed on Opus in the same worktree with a hand-over of what was done and what remains (P-10 templates, P-11 Documents fold, P-12 the Won step's photo, the three integration items, the probe and the outcome).
- 23:55 — the combined wave-1 lane on one main build: ct-r1 36 · ct-r2 24 · ct-r3 28 · rq-k1 116 · rq-k5 79 · pm2-s03 79 · overlays 67 green; the packages' own probes needed probe-side landing fixes (rc-c1 and rc-c3 read repo files relative to their folder, which the harness's lane copy cannot reach — they now resolve the repo from the working directory; rc-c2's touch steps open the Document screen `?edit=document`, where C1 hosts C2's tool row) → **rc-c1 175/0 · rc-c3 110/0** on main; rc-c2 green through the box's ✕ (46) and handed to C4 from its Send step on (on ≤1024 the blocked Send's Show me opens C1's Signature fields screen, which C4 turns into C2's panel). C4 told to take the three probes from main.
- 03:35 — **C4 landed** (61 paths through a plain apply, 18 new files; its three copies of rc-c1 · rc-c2 · rc-c3 taken whole — main's landing fixes + its merged Send → Show me → the Signature fields panel flow; `esign-screens.tsx` deleted, C2's panels in C1's screens; the frame's ≡ named "Outline"). Probe rc-c4 177/0 (33 pure); rc-c1 176 · rc-c2 90 · rc-c3 110 · ct-r1…r4 · sw-r2 · rq-k1 · k4 · k5 · pm2-s02 · s03 · s44r · s46d · Dane P4 · P5a · ux-P5 · overlays · pj-r1 · r5 · r6 · fix-D · gap-f2 · folders-galleries · pickers green on its lane; pj-gap-a and pj-gap-b 71/1 each fail the same way on the WIP base's own build (the Projects listing, untouched). 1440: 35 of 41 identical; the six that differ are a port and a random id inside a signing link (same words), a 1-unit anti-alias at the Won step's Project type field corners, and one deliberate 1025 change (the to-do chip folds to "✎ 1" so the title reads whole). Decisions flagged ▲ in its outcome §2.
- 03:45 — rows numbered **REG-2588…2638** (C1 2588–2598 · C2 2599–2607 · C3 2608–2618 · C4 2619–2638) + **REG-2639** (the Signed line's separator, a landing fix); the lint baseline lowered (icon-button-overlay 10 → 7); CLAUDE.md Map, `responsive.md` § Contracts on the move, UAT chapter 27 (15 steps).
- 03:30 — **the closing regression on the final build is green (32 probes):** rc-c1 176 · rc-c2 90 · rc-c3 110 · rc-c4 177 (33 pure) · ct-r1 36 · r2 24 · r3 28 · r4 29 · sw-r2 27 · overlays 67 · ghosts-same 76 ×2 (1440 and 390) · rq-k1 116 · rq-k4 143 · rq-k5 79 · pm2-s02 107 · s03 79 · s44r 82 · s46d 73 · Dane P4 37 · P5a 59 · P5b 56 · ux-P5 59 · pj-r1 98 · r5 91 · r6 82 · gap-f2 84 · gap-d 65 · folders-galleries 44 · pickers 15 · kb-r1 35 · kb-r2 29. Type-check clean; lint only the three old quote-editor errors; design lint green with the baseline lowered. No test server left; local.db untouched; nothing committed (he commits).
