# Quotes on the move — the build (2026-10-22)

The owner (Vicky, he/him, the product designer) audited the Quotes module on a phone and a tablet and marked the review page
https://claude.ai/artifact/PGpvB8iEfQECebAzvVYv2w: **Build on all twelve proposals P-01…P-12, Build on all twenty-one stand-alone fixes, and
the recommended answer on every question Q-01…Q-08.** His words: "the responsive mobile and tablet screens are not correct … anything with
too heavy data is not pure responsive … think a different experience in mobile and tablet screens which don't have to be the same
experience as it is in desktop. This will reduce the cognitive load and improve the usability for the studios on the move … relook at the
layouts, components, font sizes, and what all it requires to make the world-class responsive design." Then: "I have marked it please go ahead."

You build ONE package (your prompt names it). Five packages run in two waves; each owns its files; nobody commits.

## Read first (absolute paths; your worktree does not hold the scratchpad)
1. The review page's data — every proposal, finding and question with its words:
   `/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/30f9243f-b242-4e9f-b5b0-7ad63ff83048/scratchpad/rwd-quotes/content.json`
   (`proposals[]` = P-01…P-12 with today / proposed / why; `surfaces[].findings[]` = A-/B-/C- ids with what · fix · absorbed-by; `questions[]`).
   His picks: every id = build; the answers: Q-01 phone · Q-02 list · Q-03 no · Q-04 quote · Q-05 hide · Q-06 fit · Q-07 map · Q-08 contracts.
2. The lane audits behind the findings, with measurements and the shots they cite:
   `…/scratchpad/rwd-quotes/A/findings.md` (lists, Create, client pages) · `…/B/findings.md` (the editor's frame and sections) ·
   `…/C/findings.md` (Items and the document). The shots: `…/rwd-quotes/shots/`, `…/A/`, `…/B/`, `…/C/`.
   The drawn screens: `…/rwd-quotes/mock.html` (render `…/rwd-quotes/mock-preview.png`) — the shape to build, with OpenMaison's tokens.
3. In the repo: `CLAUDE.md` (How we work · the Map's Quotes entries), `DESIGN-PRINCIPLES.md`, `design-source/context/responsive.md`
   (breakpoints · shell · touch ergonomics — the rules you extend), `design-source/context/page-checklist.md`, the REG rows named in comments
   near what you change (`design-source/REGISTER.md`), and the house pieces you will reuse: `components/om/sheet.tsx` (`Sheet`,
   `useSheetLayout`), `components/om/dialog.tsx`, `components/om/drawer.tsx`, `components/om/portal-menu.tsx`, `components/om/chips.tsx`,
   `components/om/empty-state.tsx`, `components/quotes/confirm/reading-cards.tsx` (`ReadingCards`, built from `readingSections` in
   `components/templates/render/slices`), `components/quotes/editor/items/item-cards.tsx` (REG-597), `components/shell/mobile-nav.tsx`,
   `lib/breakpoint.ts` (`MOBILE`, `TABLET_DOWN`, `useMediaQuery`).

## The design (the contract every package follows)
- **Widths.** Phone = `(max-width: 767px)` in CSS and `useSheetLayout()` in render. Touch tablet = `(max-width: 1024px)` and
  `useMediaQuery(TABLET_DOWN)`. Desktop ≥1025 is the mock and stays **byte-identical** at 1440 (the banked baselines); a keyboard tablet at
  1025+ gets desktop (Q-03). Touch rules carry `@media (max-width: 767px), (hover: none) and (max-width: 1024px)` (REG-307).
- **The scale on ≤1024 (P-08).** Text people read: 16 body, 14 secondary, never under 14 for a value, a name or a sentence (a 12 uppercase
  eyebrow may label a group, nothing else). Amounts 18–26 tabular. Every target 44; the foot's buttons 48; 16 gutters; 12 inside cards.
  Inputs type at 16 so iOS never zooms. Apply it in your own stylesheets under the two media queries; never change a desktop value.
- **Read first, edit second (P-01).** On ≤1024 `/quotes/<id>` opens the **Quote screen**, not the editor: back · the client's name with the
  number and title as the sub-line · ⋮; a hero (status chip · amount · lines · valid until · GST · the client with Call and WhatsApp); one
  **Next** line (what this state needs); the document as `ReadingCards` (sections fold); Payment schedule · Files · Terms · Signature as
  folded rows; a sticky foot with **Edit** and the state's one primary. Q-07's map: Draft → Send ▾ · Sent for Approval → Approve (approvers)
  / no primary · Approved → Send ▾ · Sent to Client → Remind · Confirmed → Send for signature · Signed → Open contract (or Move to Won when
  no contract) · Expired → Revise. Everything else is behind ⋮ (grouped: Look · Change · Share · Export; no key hints on touch).
- **Edit is a list of sections (P-02, Q-02).** Edit opens the **section list** (General info · Items (n) · Payment schedule · Files (n) ·
  Terms and conditions · Additional notes · Signature, each with a one-line summary) with ✕ back to the Quote screen; a row opens that
  section as a **section screen** (a full-height `Sheet`-style surface: bar with ← and the title, the section's actions, a body, its own
  Done). On 768 portrait the same; at 1024 landscape the list is the left pane (360) and the open section the right. The address carries the
  state (`?edit=1`, `?edit=items`) so Back works (REG-465). Activity stays a row on the Quote screen. The dock question (Q-05) is moot inside
  the `(editor)` route group (it has no dock); the Quote screen's foot takes its place.
- **Sections render inside the section screen through `SectionCard`** (`components/quotes/editor/section-card.tsx`, K1's): every section
  already renders through it with `actions`; K1 gives it a screen mode (a context from the section screen) that draws the section's title
  as the screen bar and its `actions` as the bar's trailing controls, no fold, no handle. A section package (K2, K5) needs no prop for that:
  its body renders as it is; anything it wants pinned at the bottom it renders itself as `position: sticky; bottom: 0` inside its body (the
  Items totals strip), which works in the screen and is simply not rendered at desktop widths.
- **The Preview (P-05, Q-06).** `/quotes/<id>/preview` at ≤767 shows the client's reflowed quote (`ReadingCards`) under one 56px bar
  (← · Preview · Send ▾) with **Paper** as a toggle (`?paper=1`) that opens the A4 as a viewer: fit to width, pinch to zoom, swipe between
  pages, page dots, Download in the bar; Copy link ("team only") · Share PDF · Internal copy · What your client sees · Change template under ⋮.
  At 768–1024 the paper renders at its text width (zoom 1, the margins scroll) under the same bar. The Quote screen's "As printed" opens
  `/preview?paper=1`. The editor's Client view button at ≤1024 opens the Preview; the 400 drawer stays desktop-only.
- **Lists (P-06, P-11, Q-04).** The phone card: the client's name leads (16 bold) with the amount right (18 tabular); line 2 number · title; line 3
  a read-only status chip + its "since" (sent · viewed · due · valid until; Expired as a chip); the whole card presses with a chevron; no
  checkbox (long-press selects), no Shared/Private word (a small lock on the chip when private); ⋮ = Open · Copy link · Remind · Preview ·
  Change status › · Archive · Delete. Tablets ≤1024 open the tables with a default column set (Title · Client · Status · Total · Due), Title and
  ⋮ frozen, View dropped (the title opens), the rest in Column settings; the lead's Quotes tab hides the quick-links strip at 768 portrait.
- **Create Quote on a phone (P-10).** Studio-wide: step 1 "Who is this quote for?" (the lead picker, recent first); then four 56px rows:
  Default template (full name, "Starts with …", change) · Blank quote · Upload a quote · Draft with Maison AI; the gallery opens from
  "change"; the picker's list view is fixed (A-12).
- **The client's page (P-12).** A total card (amount · lines · valid until · View as printed) → the reading cards → a sticky bottom bar
  (Confirm quote 48 · Ask); Confirm opens a short sheet (name · the fine print · Confirm). Cards at ≤1024 portrait; the paper beside the card
  only in landscape. "As printed" full-screen with pinch. 48 buttons and 16 inputs on every client page at ≤1024.
- **Items (P-03, P-04, P-07, Q-03).** Phone: the Items screen = "Items · 16 · S$49,838" with Add item (filled) and search; 72px line cards
  (name 16 wrapping, "44 sqft × S$102 · Purchase", the total); a tap on a section card folds it; sections tinted and sticky; depth as a left
  bar; "+ Add to {section}" at each section's end; a pinned Subtotal · GST · Total strip with **Adjust** (entity · discounts · GST · Round
  prices) and **Breakdown** (By category); the line sheet in two layers (Name · Qty × Unit · Unit price · live Total · Description, then
  **More**: cost · markup · discount · GST · kind · room · category · section label · vendor · link · image), Delete and Done pinned, numeric
  keypads; the row ⋮ = Duplicate · Mark as optional · Move to section › · Remove · More…; the bulk bar = count + Clear, then Move · Delete · ⋯.
  No Column settings, Row density or Expand on a phone. 768 portrait: the cards with a 400 line panel beside them (the sheet's fields; Qty
  and Unit price first). 1024 landscape: a working grid Item · Qty · Unit · Unit price · Total (642 in 902, no pan), 44 cells, sections as
  tinted rows with "+ Add to …", the other columns behind Column settings remembered per breakpoint, a tap opens the rest in the pane; a visible
  "internal" caption on touch; Expand goes ≤1024. **Nothing a desktop can do is lost; it is one tap further.**
- **House rules that stand.** Bottom sheets for menus and form modals ≤767 (REG-353); one filled button per screen; every remove answers with
  Undo; a refusal says why; plain words; `data-kb` where a key presses; tokens only (`npm run design:lint` must hold — never raise its
  baseline); the ghost of every page draws the page as it now looks at that width (REG-708: a phone's `loading.tsx` ghost = the Quote screen's
  shape, not the editor's); empty states on the house `EmptyState`.

## Packages and ownership (edit only your files; name any other change under "Shared pieces changed" in your outcome)
| Pkg | Builds | Owns |
| --- | --- | --- |
| **K1** | P-01 · P-02 · P-09 (+ absorbed B-03 B-04 B-05 B-06 B-07 B-09 B-10 B-14 B-20 B-24 B-25 B-26 B-27 C-23; fixes B-21 · B-23) | `app/(editor)/quotes/[quoteId]/(edit)/**` (+ its `loading.tsx` ghost), `components/quotes/editor/quote-editor.tsx`, `editor-header.*`, `editor-tabs.*`, `quote-bars.tsx`, `template-bar.*`, `general-info.*`, `section-card.*`, `create-strip.*`, `editor-skeleton.*`, `use-quote-maison.tsx`, `components/quotes/screen/**` (new: the Quote screen, section list, section screen, hero, next line), `lib/quotes/next-step.ts` (new, pure: the primary per state), `components/shell/editor-head-ghost.tsx` if needed |
| **K2** | P-03 · P-04 · P-07 (+ absorbed C-01 C-02 C-04…C-08 C-10…C-15 C-22 C-24; fixes C-03 · C-09) | `components/quotes/editor/items/**`, `lib/quotes/items-model.ts`, `scripts/design-lint.mjs` (one new rule: no `::after { inset … }` on an icon button) + `design-lint.baseline.json` only to add that rule at 0 |
| **K3** | P-05 (+ absorbed C-16 C-17 C-18 C-20 C-21 B-08; fix C-19) | `app/(editor)/quotes/[quoteId]/preview/**` (+ ghost), `components/quotes/preview/**`, `components/quotes/editor/client-view-pane.*` (desktop-only mounting is K1's call; you make the pane's own ≤1024 answer a link to Preview) |
| **K4** | P-06 · P-10 · P-11 · P-12 (+ absorbed A-01 A-02 A-03 A-05…A-08 A-10 A-11 A-14…A-18 A-20 A-22; fixes A-04 · A-09 · A-12 · A-13 · A-21 · A-23) | `components/leads/quotes/**`, `components/quotes/list/**`, `components/quotes/create-quote-modal.*`, `components/templates/template-picker.tsx` (the list row at ≤767 only), `components/quotes/confirm/**`, `app/confirm/**`, `app/quote/[token]/**` + the view-link notice component, `components/leads/detail/quick-links.*` (the 768-portrait rule only), `components/om/table-columns.ts` + `column-settings.tsx` (a per-table tablet default set — say so under Shared pieces), `app/quotes/**` pages' ghosts |
| **K5** | P-08's application in the sections + fixes B-01 · B-02 · B-11 · B-12 · B-13 · B-15 · B-16 · B-17 · B-18 · B-19 · B-22 | `components/quotes/editor/{payments,files,text,signature,activity}/**`, `components/quotes/send/**`, `components/contracts/contract-template-picker.tsx` (B-18, ≤767 only), `components/om/dialog.module.css` (B-16: one foot rule under the touch query — shared, say so), `components/om/sheet.*` (B-19: a sheet with a foot lifts `--snackbar-bottom` — shared, say so), `components/leads/dropdown.*` (B-02: the ≤1024 clamp — shared, say so) |

Waves: **1** = K1 · K2 · K4 (in parallel) · **2** = K3 · K5. K1 mounts the section components as they are today; K2 and K5 change their
insides; `section-card.tsx` is K1's alone. If you find you must touch another package's file, stop and write what you need in your outcome
under "For other packages" instead.

## Rules for the package
- **Your worktree is your repo.** Work, build and probe ONLY in your working directory (your cwd, a git worktree of main). Never edit
  `/Users/vicky/Documents/GitHub/openmaison-prototype` itself; never touch ports 3000 / 3001; never write any `local.db`.
- **Set-up once:** `bash /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/30f9243f-b242-4e9f-b5b0-7ad63ff83048/scratchpad/rq-build/setup-lane.sh <K>`
  from your worktree: it clones `node_modules` in (APFS clone, seconds), and copies the base demo database to
  `…/scratchpad/rq-build/<K>/lane.db`. Use that database on EVERY command that needs one (`DATABASE_URL=file:<path>` on the same line —
  a shell `export` does not survive to the next tool call).
- **Builds take the lock** (one build at a time on this 18 GB machine):
  `until mkdir /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/30f9243f-b242-4e9f-b5b0-7ad63ff83048/scratchpad/rq-build/build.lock 2>/dev/null; do sleep 15; done; DATABASE_URL=file:<lane.db> npx next build; rmdir …/build.lock`
  — always release it, also when the build fails. Run the build in the background (`run_in_background`) and wait for its notification.
- **Your port:** K1 3171 · K2 3172 · K3 3173 · K4 3174 · K5 3175 (`DATABASE_URL=file:<lane.db> npx next start -p <port>`; kill it by port when
  done: `lsof -ti tcp:<port> -sTCP:LISTEN | xargs kill`).
- **No schema change is expected.** If one is unavoidable, additive only, and say exactly what it does in the outcome.
- **Checks before you finish:** `npx tsc --noEmit -p .`, `npx eslint app components lib`, `npm run design:lint`, the production build, YOUR probe
  green, and every existing probe your change could touch (grep `design-source/verify/**/*.cjs` for the test ids, addresses, words and
  layouts you change; update an assertion only for a deliberate change, commented `(quotes on the move, a deliberate change of this rule)`;
  run the ones you touched against your lane). **1440 must be byte-identical:** take the page at 1440×1024 before and after on your lane and
  compare (a pixel diff or a DOM snapshot); say in the outcome which pages you compared.
- **Shots:** 390×844 and 768×1024 with `isMobile: true, hasTouch: true`, 1024×768 touch where your package changes a tablet layout; **take
  tablet shots viewport-only** (a Playwright full-page capture drops `(hover: none)` mid-shot and parks hover floats at the edge — lane A's
  A-19); measure sideways overflow against `screen.width`; check 320 too. Shots go in `…/scratchpad/rq-build/<K>/shots/`.
- **Probe:** `design-source/verify/responsive-quotes/verify-rq-<k>.cjs` in the shape of `design-source/verify/pending-modules/verify-pm2-s46a.cjs`
  (args `<scratch.db> [shotDir] [base]`, env `BASE`, sqlite3 with `-cmd ".timeout 30000"`, refuses `local.db`, puts back what it changes,
  asserts rules not another round's counts, real taps for every new press, touch boxes measured with getBoundingClientRect and
  `elementFromPoint`). Every new press is exercised on the production build; the page error log stays empty.
- **Register rows:** stage them in `design-source/context/responsive/quotes-on-the-move-2026-10-22/reg-<k>.md` as
  `| REG-<K>.n | Area | **What** — why (his "please go ahead" 2026-10-22 on the Quotes-on-the-move page; P-xx / A-xx …; decisions as recommended) *(invented copy: …)* | user-directed |`
  (a bug fix row ends `| bug fix |`). Don't edit `design-source/REGISTER.md` or `CLAUDE.md` (the orchestrator does).
- **Outcome:** `…/quotes-on-the-move-2026-10-22/outcome-<k>.md`: a **ledger** with every id assigned to you (P-, A-, B-, C-), each built
  (where) · kept (why) · not done (why); decisions taken; **Shared pieces changed**; **For other packages**; what to check in the browser
  (Dane Owner · Hui Min Admin · Germaine Designer; 390 · 768 · 1024 · 1440); the probes run and their tallies; the 1440 comparison; a
  **Principles check** (one line per principle of `DESIGN-PRINCIPLES.md`: met how, or n/a). Final message: 10 lines + the outcome path +
  the list of files you changed or added.
- **His bar (2026-10-12, repeated 2026-10-22):** nothing missed, nothing buggy, every pixel checked, the simplest experience that does the job —
  the fewest steps, plain words, one filled button, Undo, the right default. If something is not world-class yet, fix it rather than note it.
