# S08 · Setting up a new studio — outcome (2026-10-11)

Cards: `onboarding:studio-setup-wizard` (First-time studio set-up) and `onboarding:welcome-and-tips` (Welcome and first-visit tips). 1.0 read:
`src/app/studio-setup/page.tsx` (the seven steps, what each writes — `studios.name` / `settings.branding` / `branding.bankDetails` /
`settings.numbering` / the funnel / the workflow toggles — the skip labels, "Skip entire setup", the resume banner, the ready step's next steps),
`src/app/api/studio-setup/route.ts` (`setup_last_step`, `setup_completed_at`), `src/app/(main)/layout.tsx` (the redirect that forced owners
through it), `src/components/ui/welcome-modal.tsx` (owner "Let's get your studio set up" · Start Setup → /accounts; invited member "You've been
invited to {studio}" · See My Leads; "I'll explore on my own"), `src/components/ui/page-coach-marks.tsx` + `src/hooks/use-coach-mark.ts` (twelve
page tips by role, per-browser seen flags, Reset all, the getting-started checklist hook with no screen). Register rows: `steps/reg-S08.md`
(REG-S08.1…8). Probe: `design-source/verify/pending-modules/verify-pm2-s08.cjs` (**70 / 70**, three runs back to back on one server); shots
banked in `design-source/verify/pending-modules/pm2-s08/`.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| set-up · A guided first run for the owner through what documents need: details, logo, bank, numbering | **Built** — Settings › Studio › **Set up your studio**: seven steps in two groups (*What your documents print*: Company details · Logo · Bank details; *How your studio works*: Your team · Quote template · Price book · Leads that come in by themselves), each done by its own page's record, each row opening that page with the way back; numbering is "already set for you" in the foot (its default needs nothing) | `lib/studio-setup/model.ts` · `lib/studio-setup/queries.ts` · `app/settings/studio-setup-card.tsx` (+ `.module.css`) · `app/settings/studio-settings.tsx` · `app/settings/settings-view.tsx` · `app/settings/page.tsx` |
| set-up · Skip a step, with the default it falls back to on the button | **Built in 2.0's shape** — nothing is forced, so nothing is skipped: each open step says what happens until it is done ("Until then an invoice can’t say how to pay you", "Until then they print your studio’s name alone"); the steps 1.0 let you skip to a default (numbering, the funnel, approvals) are named with their defaults in the foot with where to change them; 1.0's "Skip entire setup" is **Hide** (the member's own, with Undo) | the same |
| set-up · Resume where you left off | **Built** — the list is read from the records every time, so it always resumes: the next open step is the current row (LEAD STAGES' current fill and ◉), the count says "3 of 7 done" | the same |
| set-up · "Your studio is live" with next steps, branding only when skipped | **Built** — the visit that finds every step done shows **"Your studio is set up · 7 of 7 done"** once (its one filled button **Add your first lead** while there is none — 1.0's first next step), then never by itself. 1.0's other next steps are steps of the list (Invite your team → Your team; Set up your branding → Logo, shown only while it is open; Upload sample quotes → Quote template's "recreate a quote you send today"; Connect Gmail → Leads that come in by themselves) | the same + `app/settings/setup-actions.ts` |
| set-up · Country chosen on the first step | **Kept** — held by DEF-30, step S33 (regions) | — |
| welcome · A welcome on first sign-in, one for an owner and one for an invited member | **Built** — a member's first visit (the signed-in member is View as's `is_you` until sign-in, S30) gets one welcome on the house Dialog, one filled button + Not now, by role: Owner/Admin while the list is open → **Set up your studio**; Manager/Designer → **See my leads**; Accounting → **Open Finance**; an Owner/Admin joining a set-up studio → **See the leads**. Recorded per member (`members.welcome_due` · `welcomed_at`), however it closes. Company › Members › Add member owes the new member theirs (S09 adds the invitation itself) | `components/shell/first-visit-welcome.tsx` · `app/welcome-actions.ts` · `components/shell/app-shell.tsx` · `app/company/members-actions.ts` |
| welcome · One-time tips on the first visit to a page (12 pages), by role | **Kept** — as the card recommended: 2.0's first-run empty states (REG-735…737), the keyboard's tips and the bell's one-time notes already say what to do on a page; guided tours and page tips are step S32's (`studio:personal-settings`: "A welcome window and page tips, with Restart tours") | — |
| welcome · Reset all tips | **Kept for S32** (Restart tours) — S32 re-owes the welcome by setting `members.welcome_due` | — |

Also: ⌘K's **Set up your studio** (Owners and Admins) shows the list as it stands even when hidden or finished (`Show here again`); the Settings
ghost draws the list for whom it shows; a ⌘K bug fixed on the way (a card not on the page now opens the page instead of only moving the hash).

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **A checklist, not a forced wizard** (set-up Q1) — dismissable, never blocking; a studio that never opens it loses nothing.
- **Its one home is Settings › Studio** (set-up Q2) — not the Company panel (a navigation popover with no page of its own, REG-484), not the
  first-run empty states (one per page — no single home), not a new page: Settings › Studio is where 1.0's "Start Setup" went (Accounts =
  Settings, REG-645) and already names the Company pages that keep the studio's records. Doors: the first-visit welcome and ⌘K. When the
  Dashboard comes (S22), a card there is a door to it, never a copy.
- **Nothing must be done before the first quote or invoice is sent** (set-up Q3) — nothing is blocked; the first group says what the documents
  print (details, logo, bank), the second how the studio works.
- **Every step is done by its own record** — the definitions: details = address + UEN + a phone or email (Company › Profile); logo = the brand
  kit's; bank = the studio's own issuing entity's bank account or PayNow; team = two active members; quote template = a published one; Price
  book = a live item (a proposal waiting for review is not one yet); leads in = Gmail, Meta Lead Ads or an active webhook (the website form's
  address exists from day one, so it can't say whether it is in use).
- **The portal's own "Getting it live" stays on Company › Client portal** — it needs a client to try, so it can't be a studio set-up step; the
  portal wears the logo and the bank the list already asks for.
- **Hide is each member's own**; **finished is the studio's** (`doneAt`) — the list never comes back by itself after the done moment.
- **The welcome: owners too, and invited members** (welcome Q1, as recommended); **page tips: none** — the empty states and keyboard tips cover
  them (welcome Q2, as recommended).

## What to check in the browser (production build; View as switches roles)
The demo studio is set up, so nothing shows on the demo by itself. To see the list and the welcome, make a studio that is not set up in a
scratch DB (the probe's `freshStudio`: no details, logo, bank, published template, Price book item or way leads come in; one active member;
Dane owed a welcome) — never in local.db.
- **Dane (Owner), demo** — Settings opens on Who may do what; ⌘K "set up" → *Set up your studio* → "Your studio is set up · 7 of 7 done", every
  row ticked with what its page has, no Hide.
- **Dane, a new studio** — /leads: "Welcome, Dane" · Not now · **Set up your studio** → Settings › Studio, Back to Leads; the list "0 of 7
  done", Company details current; Open Profile → fill Address, UEN, Phone → Save changes → Back → "1 of 7 done", Logo current; Hide → the list
  goes, Undo brings it back; ⌘K brings a hidden list back with Show here again; when every step is done → "Your studio is set up" once (Add your
  first lead while there is no lead), then gone.
- **Hui Min (Admin)** — sees the list even after Dane hid it (hiding is each member's own).
- **Germaine / Michelle (Designers)** — never the list, never the ⌘K row; owed a welcome (add one on Company › Members, then View as them):
  "You’re on Demo Studio’s team" · See my leads.
- **Priya (Accounting)** — owed a welcome: "You keep Demo Studio’s books" · Open Finance (her home; it only closes there).
- **1440 / 1024 / 768 / 390 / 320** — the list's rows wrap their button under the words at 390; the welcome is a centred card; no sideways
  scroll (probe section 6, and a 1024 · 768 · 768-touch check).

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate 0092 + repair R110) with `next start -p 3160`; :3160 stopped after.
`npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 17 warnings are older files'; this step's files lint clean) ·
`npm run design:lint` nothing new · `npx next build` green.

| Probe | Tally |
| --- | --- |
| **`pending-modules/verify-pm2-s08.cjs`** (this step, 6 sections) | **70 / 70** — three runs back to back on one server, then a banked run on a fresh copy: the page error log empty, the server log clean; a full `.dump` before and after differs only by the AI credits' month roll the app makes on the first page |
| `pending-modules/verify-pm2-s01…s07.cjs` | 79 / 79 · 105 / 105 · 79 / 79 · 82 / 82 · 113 / 113 · 83 / 83 · 89 / 89 |
| `first-run-2026-09-30/verify-first-run.cjs` — empty · noleads · full | 89 / 89 · 5 / 5 · 6 / 6 |
| `ux-build-2026-09-30/ghosts/verify-first-run-ghosts.cjs` | 15 / 15 |
| `view-as/verify-view-as.cjs` · `view-as/verify-panel-order.cjs` | 23 / 23 · measures (exit 0) |
| `ghosts/verify-ghosts-same.cjs` 1440 · 390 touch | 51 / 51 · 51 / 51 |
| `ghosts/verify-ghosts-strips` · `-film` · `-measure` (members) | captures (exit 0) · Δ 0 on every row |
| `consistency/verify-overlays.cjs` | 67 / 67 |
| `global-search/verify-search.cjs` | 27 / 27 |
| `settings-parity/verify-st-r1 · r2 · r3` | 57 / 57 · 30 / 30 · 30 / 30 |
| `parity-map-build/verify-pm-i` (Accounting, Settings) · `verify-pm-h` (Add member) · `simplify-projects-finance/verify-ks` | 54 / 54 · 50 / 50 · 29 / 29 |
| `npm run design:anatomy` (on the scratch `next start`, :3160) | all 1558 measures hold (73 pages, 24 dialogs) |

No existing assertion needed changing. Extra width check: 1024 (mouse) and 768 (mouse and touch) — the welcome and the list, no sideways
scroll, no page errors (shots `10-list-1024.png`, `11-list-768-touch.png`).

## Migration and repair
- **Migration 0092 `setup_s08`** (additive): `members.welcome_due` (boolean, default false) · `members.welcomed_at` (timestamp). No new table —
  the baseline lists are unchanged; the list's record is the settings key `studio_setup`.
- **Repair R110** — every demo member not owed a welcome gets their first visit (8 on the demo, their earliest trace in the studio); the demo
  studio's list is recorded finished (`studio_setup.doneAt`) because every step reads done by its record. Again: "already in step". Two checks
  added (a member neither owed a welcome nor with a first visit; a set-up record that is not JSON or finished before it was first seen). Full
  repair: all checks pass.
- **The orchestrator's `db:baseline` after the step** carries `welcomed_at` and `studio_setup`; until then a restored base still shows nothing
  (a member is owed no welcome by default, and a studio with every step done and no record shows no list).

## For the next steps
- **S09 (Inviting your team):** Add member already owes the new member the welcome (`welcome_due = 1`); `welcomed_at` is their first visit —
  the "Invited — hasn't signed in yet" state can read it (null = never came in). The member's welcome body is `welcomeFor` in
  `lib/studio-setup/model.ts` — S09 can give an invited member's its "You've been invited to {studio}" words there.
- **S10 (Maison AI):** "What's left to set up?" can answer from `fetchStudioSetup()` / `setupRows(fetchSetupFacts())`.
- **S22 (Dashboard):** a set-up card there is a door to Settings › Studio's list (`/settings?section=studio#studio-setup`), never a copy.
- **S30 (Signing in):** the welcome keys on the session member; a real first sign-in sets nothing new — `welcome_due` already says it.
- **S31 (A new studio joins):** a new studio's owner is made with `welcome_due = 1`, and its brand row must start EMPTY (no details, logo null,
  no bank) — `DEFAULT_BRAND_SETTING` falls back to the demo's details and `DEFAULT_BRAND.logo` is the demo's mark, so a studio with no `brand`
  row would read as set up. Write an empty `brand` row at sign-up.
- **S32 (guided tours, Restart tours):** re-owe the welcome with `welcome_due = 1`; page tips belong there.
- **Probes (all steps):** the AI credits' month roll (a transaction, on the first page after the demo's credit period ends — it ended
  2026-10-10 on `pbuild/base.db`) runs on every probe's first page; and a write the app makes from a page's effect (the list's "seen" note, a
  Viewed stamp) can land while a probe's sqlite3 writes. Either collision left :3160's connection holding the file's lock until the server
  restarted (sqlite3 then failed after 30 s with "database is locked"). This probe opens one page and waits before its snapshot, and never
  holds a POST in its ghost check — two habits worth copying.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, every exception written down** — no mock for either card; built on Settings' card, LEAD STAGES' rows and the house Dialog;
   every invented line in REG-S08.1…5.
2. **One system, no one-offs** — the Settings card (`.setting`), the house `Row` (Getting it live's grammar), the overview's group label, the
   house Dialog / Button / Tooltip / snackbar, `HelpLink`, the ghost kit; the only new CSS is the list's inset and the head's end (3 rules);
   `design:lint` holds.
3. **Plain words** — "Set up your studio", "What your documents print", "Until then an invoice can’t say how to pay you", "Already set for you",
   "Welcome, Dane", "See my leads", "Not now".
4. **Nothing is lost** — the list writes nothing of the studio's (each page keeps its own); Hide has Undo and ⌘K brings it back; the welcome's
   visit is recorded however it closes, and a member who has not had it keeps being owed it.
5. **Say why** — each open step says what it is for and what happens meanwhile; Hide's tooltip says it is only for you and how to bring it
   back; the actions refuse with the rule ("Only Owners and Admins set up the studio").
6. **Back returns where you came from** — every row opens its page with `?from=` (Back to Settings, onto the list); the welcome's button opens
   the list with Back to where the member was.
7. **Every screen is whole** — no new page; Settings' ghost draws the list for whom it shows (REG-708); the done state is the list's own end
   state; the actions' refusals reach the snackbar.
8. **Every width is designed** — 1440 · 1024 · 768 (mouse and touch) · 390 · 320 checked: the rows' buttons wrap under the words, the head's
   count and Hide wrap under the help, the welcome stays a centred card; no sideways scroll against `screen.width`.
9. **Tables follow the leads listing** — not applicable (no table added).
10. **Motion with purpose** — none added; the ⌘K arrival keeps its house mark on the list.
11. **Honest data** — every step reads its own record; the demo's finished list and every member's first visit are written by R110 with
    their trail (the day the last record was saved, each member's earliest trace); nothing is a tick set by hand.
12. **Reach for everyone** — every press is a DS button (keyboard and focus); the welcome is the house Dialog (focus held, Esc closes, ⌘↵
    presses its one filled button through `data-dialog-foot`); the steps' state is in words ("3 of 7 done", each done line), not colour alone.

**How to add a missing thing:** one home (Settings › Studio; doors from the welcome and ⌘K) · shown only when it applies (Owners and Admins,
while a step is open; once when done; never on the demo) · one filled button (the welcome's, and the done state's first lead; the rows'
buttons are text) · defaults that need no set-up (the steps with a default are not steps; nothing is forced).
