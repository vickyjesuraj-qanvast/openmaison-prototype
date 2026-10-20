# S17 · Consistency leftovers — outcome (2026-10-12)

Card: `held:consistency-leftovers` (2.0 only — what the UI sweep, the consistency programme and the one-home audit left as package calls;
`design-source/context/consistency/01-…` names copies that drift as the root cause, `02-…` N-04 the 3D link). No 1.0 code (the card's
`v1_code` is empty; for the spelling, 1.0's own use was counted: "3D" 59 times, "3-D" 9, the sidebar's). Carried note taken: **S15's** — the
ghosts of Settings › Notifications, Company › Members, Company › Profile and Settings › Lead management at 390 touch, and the sweep of the other
Settings / Company pages. Register rows: `steps/reg-S17.md` (REG-S17.1…7). Probe: `design-source/verify/pending-modules/verify-pm2-s17.cjs`
(**130 / 130**); shots banked in `design-source/verify/pending-modules/pm2-s17/`.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| Side-panel widths 360 · 400 · 420 · 440 · 480 · 560 (and 320) — revisit: menus got a scale, panels did not | **Built** — one scale, `PANEL_WIDTH` narrow 360 · standard 400 · wide 480 · widest 560; a Drawer names its step and a number no longer type-checks. Moved: the Outline drawers 320 → 360, the two client-view drawers → 400 (his 2026-09-29 call, never built), Version History 420 → 400, the planner's Versions 440 → 480 (REG-S17.1) | `components/om/drawer.tsx` + its 22 callers (contracts' editors, quote editor · preview · version history, template editor, planner versions · elevation, projects' milestone · tickets, finance's cost panel, portal's client access · bell, the shell's notifications · shortcuts, column settings, tasks' panels) |
| xl dialog heights 928 vs 960 — revisit | **Built** — one tall xl height, `--om-modal-xl-height` 928 (the mock's), capped by the xxl margin; `Dialog height="xl"`. Create Quote, the ready-made designs and the brand kit's sample quote were 960 (REG-S17.2). The editor's pickers keep 680 (REG-662) | `app/globals.css`, `components/om/dialog.tsx` (+ `.module.css`), `components/quotes/create-quote-modal.module.css`, `components/company/templates/{house-style-dialog,brand-kit-view}.tsx`, `components/leads/{import-wizard,tasks/attach-files-modal}.module.css` |
| Custom fields and the question bank are twin components with twin dialogs — revisit | **Built** — one definitions list and one form (`DefinitionTable` · `DefinitionDialog`); the form now closes only once its save lands and keeps what was typed when refused; Custom fields take the bank's 768–1024 tracks (REG-S17.3) | `components/om/definition-list.tsx` (+ `.module.css`, new), `app/settings/custom-fields-card.tsx`, `components/company/questionnaire-view.tsx` (+ `.module.css`), `lib/company/question-bank.ts` (`BANK_HELP`), `app/settings/settings.module.css` (the twin's rules gone) |
| '3D' and '3-D' side by side — package N-04 · revisit | **Built** — "3D" everywhere, the mock's (Create links 732) and 1.0's; N-04's glyph kept (REG-S17.4) | every "3-D" in `app` · `components` · `lib` (titles, the Tools tile, the lead's and the project's Create links and ⋮, crumbs and Back, ⌘K, the access gate, the keys' area, Who may do what, Maison AI); probes pj-r1 · pj-gap-j · pm2-s07 follow |
| Small marks kept from mocks (X-Ray's 'S$ 45.7K', the mini discount controls, Payment Schedule heads that resize but don't drag, Settings' list chips) — keep | **Kept** as the mocks draw them, recorded (REG-S17.5) | — |
| *(S15's note)* the four ghosts that don't follow their phone pages, and the sweep of the other Settings / Company pages | **Built** — every Settings and Company ghost draws its page as it now looks at 390 touch and 1440: one source for the pages' words (`lib/settings/copy.ts`, `lib/company/copy.ts`, `MODULE_LINKS`), the ghost kit's new pieces, Members' / Integrations' / the portal's / the brand kit's pieces as the demo's are, the read-only lines (REG-S17.6); seven root bugs fixed on the way (REG-S17.7) | `components/shell/ghost-kit.tsx` (+ `.module.css`), `app/settings/settings-ghost.tsx`, `components/company/company-ghosts.tsx` (now a client module), `components/company/portal/portal-ghosts.tsx`, `components/finance/{finance-ghost.tsx,finance.module.css,money-in/money-in-ghost.tsx,books/books-ghost.tsx}`, `components/leads/insights/insights-ghost.tsx`, `components/projects/insights/project-insights-ghost.tsx`, `components/company/templates/{library-gallery.skeleton.tsx,library-gallery.module.css,library-ghost-for.tsx}`, `components/company/price-book/price-book-ghost.tsx`, `lib/ghost-shape.tsx` (`useSeedFlag`), `lib/ghost-shapes.server.ts`; the pages that now read the shared words: `app/settings/{settings-view,lead-stages-card,studio-settings,projects-settings,owner-approvals,document-numbers,notifications-settings}.tsx`, `components/projects/{updates/update-review-setting,money/invoice-settings}.tsx`, `components/finance/finance-settings.tsx`, `components/company/{profile-view,members-view}.tsx` |

## Decisions taken (as recommended — his "build all of them" 2026-10-11)
- **Four panel widths, by what a panel holds**, not six: 360 for a tool's pane beside a canvas, the mock's 400 for a record's details, 480 for a
  panel that draws or carries a form, 560 only where a canvas drew it (a milestone, Invite to Portal). The client views take 400 (his own
  2026-09-29 answer); the planner's Versions (thumbnails, a field and a button a row) takes 480 rather than shrinking to 400.
- **One tall xl height, the mock's 928.** On a 1024-tall window nothing moves except the two 960 dialogs the house Dialog drew uncapped
  (Choose a ready-made design, the brand kit's sample quote) — 32px shorter, the same as Create Quote, which opens the first.
- **The definitions list keeps each page's card and words** (Settings' setting card and its outlined *Add field* under the table; Company's
  card with the filled *Add question* in its title row) — only the list and the form were twins. Where the twins disagreed: the form's Options
  label is subheading-m (Settings' read as a card title) and its Required line Settings' switch row; tool names follow each kind (a question is
  quoted).
- **"3D"**, not "3-D": the mock, 1.0 and two thirds of 2.0 wrote it so.
- **Ghosts draw the usual page** (REG-708's rule: "a ghost can't know the studio's"): where a page shows the studio's own records, the ghost
  draws the demo's typical shape — eight members with their lines, one webhook, the five portal steps, two folders where the library has them
  (now from the seed, not a guess). Where a page's next rows are the studio's own records wrapping as they do (a gallery's second row of cards,
  the bank's long questions, To do's groups, a report's tables), the first screen is matched and the crossfade does the rest.

## What to check in the browser (production build, 390 touch and 1440; View as switches roles)
- **Dane (Owner), 390 touch (a phone or the device toolbar):** open each and watch the hand-over — Settings › Notifications (each event's
  *In app · Email · WhatsApp* switches appear after their names, where the ghost's bars stood), Settings › Lead management (the stages' words
  wrap where the bars wrapped; *Kept in Company:* Integrations · Questionnaire on one line, Members under), Company › Members (Dane's row then
  Hui Min's — her *Closed to new leads* tag, Signature, Add PayNow, Preferences · About page, Deactivate under), Company › Profile (Social
  links' help in two lines, the registrations' rows with *Recorded* and *Done* labelled). Then the rest of Settings, Company › Questionnaire,
  Integrations, Plan & AI credits, Client portal (the header: Live · Pause the portal · See it as Ryan on one row), Brand kit, Templates' tabs,
  Price book, Materials, Finance (no second toolbar above the search), Reports (the four range chips on one row).
- **Dane, 1440:** the same pages land without a jump; Settings › Projects' approvals: *Who approves* and *On* stand in their columns in the
  ghost too; Price book › My Items (list view): the ghost's heads under the page's.
- **Germaine (Designer):** Profile, Members, Questionnaire, Integrations and Brand kit's ghosts draw the read-only line and no Add / Save.
- **Side panels:** /leads › Column settings (400); press ? (360); a quote's Version History (400); a contract at 1024 › Outline (360); a
  project's ticket (480); a milestone (560) — and at 390 every one is the bottom sheet, as before.
- **Dialogs on a tall screen (≥ 1100):** /quotes › Create Quote, /leads › Add Lead ▾ › Import from File, Templates › Brand kit › Preview — all
  928; on an 800-tall window, the window less 96.
- **Custom fields / Question bank:** Settings › Lead management › Add field → *Add* with no label says "This field is required" and stays;
  give a label → it closes once saved and the row is there; Delete asks first. Company › Questionnaire the same; drag a question by its handle.
- **3D:** Tools › *3D Space Planner*; a lead's Create links › *3D Space Planner*; the planner's tab title.

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate + repair; no new migration or repair) with `next start -p 3160`;
:3160 stopped after. `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 16 warnings are older files') ·
`npm run design:lint` nothing new (the baseline unchanged by `--update`) · `npx next build` green · `npm run design:anatomy` — see below.

| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s17.cjs` (new) | 130 / 130 (the record put back; no page errors) |
| through `regression/run.cjs` on :3160: `ghosts-same` 1440 · `ghosts-same-390` touch · `ghosts-measure` (Members) | 51 / 51 · 51 / 51 · Δ 0 on every row |
| `overlays` · `st-r1` · `st-r2` · `st-r3` | 67 / 67 · 57 / 57 · 30 / 30 · 30 / 30 |
| `dane-p2b` (the drag order) · `sw-r2` (the Outline drawer) · `sw-r4` (the bank's Delete at 768) · `ct-r4` (the Outline at 1024) · `ghosts-strips` (capture) | 56 / 56 (52 / 53 before its selector followed the list — below) · 27 / 27 · 35 / 35 · 29 / 29 · every route captured |
| `ghosts-same` again after the last ghost edits (Settings, 1440 and 390 touch) · `design:anatomy` | 4 / 4 · 4 / 4 · all 1578 measures hold (73 pages, 245 table heads, 24 dialogs, 40 menus) |
| `pending-modules/verify-pm2-s05` (Lead stages) · `s06` (Settings › Finance) · `s15` (the planner's panels) · `parity-map-build/verify-pm-j` (Versions) · `verify-pm-g` · `simplify-projects-finance/verify-ks` · `verify-r2e` | 113 / 113 · 83 / 83 · 33 / 33 · 53 / 53 · 59 / 59 · 29 / 29 · 25 / 25 |
| `pending-modules/verify-pm2-s01` · `s07` (a lead's 3D layouts) · `s08` · `s09` · `s13` · `s14` · `s16` | 79 / 79 · 89 / 89 · 70 / 70 · 79 / 79 · 65 / 65 · 69 / 69 · 56 / 56 |
| `projects/verify-pj-r1` (the phone sheet's 3D Space Planner) · `verify-pj-gap-j` (Tools › 3D Space Planner) | 98 / 98 · 55 / 55 |
| a 768 touch measure of Settings' six modules (scratch, the probe's own method) | every block within 3px |

Assertions changed, each commented *(pending modules S17, a deliberate change of this rule)*: the 3D spelling in `verify-pj-r1.cjs` (2),
`verify-pj-gap-j.cjs` (2) and `verify-pm2-s07.cjs` (2); `uat-dane-2026-10-01/P2b/verify-p2b.cjs` reads a question by the definitions list's
name cell (it read the bank's own `__question` class, gone with the twin).

## Migration and repair
- **No migration**, **no repair** — nothing new is stored; the seed's `lib.<tableKey>.folders` is read from `library_folders`. **R117 is still free.**

## For the next steps
- **Any step that adds or changes a Settings card or a Company page's words:** put the sentence in `lib/settings/copy.ts` /
  `lib/company/copy.ts` (or the list it comes from) and draw it in the ghost with `Words` — pm2-s17 §5 fails when a ghost's sentence is not on
  its page, and when the first screen's blocks drift more than 4px at 390 touch or 1440. A new Settings module's *Kept in Company:* links go in
  `MODULE_LINKS`.
- **A new side panel** names a step of `PANEL_WIDTH`; **a new tall xl dialog** takes `height="xl"`.
- **A phone's stacked cell** that prints its column's name (`::before { content: attr(data-label) }`) gets `labelled(className, name)` in the
  ghost; a DS text button `GhostTextButton`, a MetaChip `GhostChip`, the house chips `GhostChips` (`rail` inside a ChipRail).
- **Left as data, flagged:** Finance › Commission's *Asks for another rate* section (shown when a member has asked — the demo has one) is not
  in its ghost; Reports' tiles with a *vs prior* chip and their tables' rows; a gallery's second row of cards and the bank's long questions on a
  phone. Each is the studio's own records; the first screen is matched.
- **Left, pre-existing:** a ghost's tab strip starts at the left while a phone's page scrolls its strip to the open tab (Settings ›
  Notifications at 390 shows the strip's last tabs); the bones are where the tabs are, only not scrolled.
- **Open for Vicky:** the four widths and the one height are a scale he hasn't seen as a set; the client-view drawers' 400 was his call.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — the panel scale keeps the mock's 400 and the canvases' 560; the xl height is the mock's 928;
   "3D" is the mock's spelling; the small marks the card says to keep are recorded (REG-S17.5); every change is a register row.
2. **One system, no one-offs** — the twin list and form are one house piece; the panel widths and the xl height are a scale and a token; the
   ghosts read the pages' own words and draw the pages' own pieces through the kit — the copies that drifted are gone. `design:lint` holds.
3. **Plain words** — no new words; the ghosts bar the pages' own sentences.
4. **Nothing is lost** — the definitions form keeps what was typed when its save is refused; removes still ask first.
5. **Say why** — a refused save names what failed ("Couldn’t save the fields — please try again"); a refused form field says what it needs.
6. **Back returns where you came from** — untouched: `MODULE_LINKS` builds the same `?from=` links the heads had.
7. **Every screen is whole** — 34 Settings / Company routes' ghosts measured against their pages at 390 touch and 1440; ghosts-same holds
   loader = reveal on every route at both; the probe's page error log is empty.
8. **Every width is designed** — 390 and 320 have no sideways scroll on the changed pages (against `screen.width`); the panels keep their bottom
   sheet ≤767; the xl dialogs are capped on a short window; Custom fields keep their Delete in view at 768–1024.
9. **Tables follow the leads listing** — the definitions list is the card table (REG-727's second type); My Items' list ghost now has the
   page's Status column.
10. **Motion with purpose** — no new motion; the drawer's slide uses its step's width.
11. **Honest data** — the ghosts draw the demo's usual shapes; the Folders row comes from the server's own count; the probe's field and
    question are removed in its `finally`.
12. **Reach for everyone** — the list keeps every name ("Drag “…” to reorder", "Move … up", "Delete …"), the switches their labels, the
    keyboard's arrows beside the drag; the form's errors are announced (`role="alert"`); a ghost is `aria-hidden`.
- **How to add a missing thing** — one home (one list for both pages, one scale, one token); shown only when it applies (the ghost's Add /
  Save / Deactivate only for whoever sees them); one filled button per row unchanged; no set-up.
