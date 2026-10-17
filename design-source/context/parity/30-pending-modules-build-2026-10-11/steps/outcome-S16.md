# S16 · Rail, Tools and the phone bar — outcome (2026-10-12)

Cards: `held:shell` (the report's line: "The phone's avatar should open View as like the rail's studio block; Log out has no place yet (it comes
with sign-in); Marketplace, Market Insights and Meeting Copilot keep their Soon until those cards are decided") and `studio:studio-navigation`
(1.0's frame, folded into the same card by `compile.py`; its question "Hide the Soon items until they are built, or keep them as signposts?").
No picks were stored on the report page (her "build all of them" stands). 1.0 read: `src/components/layout/app-sidebar.tsx` (the rail: its
items, badges capped at "99+", Finance / Tools / Qanvast Ops sections, Qanvast Ops only for a Qanvast-listed studio), `topbar.tsx` (logo →
Dashboard, search, the bell capped at "9+", **Open / Closed to new leads** for designers, the Tools & Apps grid, the profile menu: name ·
studio · plan · Accounts Setup · Settings · Sign out), `bottom-nav.tsx` (Home · Leads · Chats · Projects · More, the More sheet's grids),
`src/app/(main)/layout.tsx` (the shortcuts help, the Quick Action menu nothing opens, the offline banner, the "Coming Soon" page guard — the
platform admin's, out of scope), `src/lib/keyboard-shortcuts.ts` (G then D · L · I · P · T · E · F), `src/lib/access-control.ts`;
`src/app/(main)/qanvast-ops` is not in the 1.0 repo. Carried notes taken: **S01** (the avatar answered — the You sheet), **S04** (the Brand
Catalog tile removed), **S07 / REG-1763** (the phone project header's label — already fixed, untouched), **S15** (S14's
`.consentRow.consentRow` override removed), and the orchestrator's: Soon items built by later steps stay Soon; Log out comes with S30.
Register rows: `steps/reg-S16.md` (REG-S16.1…6). Probe: `design-source/verify/pending-modules/verify-pm2-s16.cjs` (**56 / 56**); shots banked
in `design-source/verify/pending-modules/pm2-s16/`.

## Per pending line

| Card · line | Result | Where |
| --- | --- | --- |
| shell · Rail › Marketplace and More › Marketplace — Coming soon (REG-808) | **Kept as a signpost** — S24 builds the Marketplace and makes both live | — |
| shell · Tools › Market Insights — Coming soon (REG-808) | **Kept as a signpost** — S25 | — |
| shell · Tools › Meeting Copilot — Coming soon · see Meetings | **Kept as a signpost** — S23 (Meetings and the Meeting Co-Pilot) | — |
| shell · The quote editor's Brand Catalog tile — Coming soon | **Done in S04** (REG-1708: the tile dropped, 1.0 had none) — checked here: no Brand Catalog on the editor | — |
| shell · The phone top bar's avatar — Coming soon · revisit | **Done in S01** (the You sheet: Your profile, then View as) — checked here, and the sheet now carries Open to new leads | — |
| shell · The unsaved-edits guard misses the browser's own Back — keep | **Kept** (the card's "keep"): the App Router cannot hold a Back; holding it means pushing a copy of the page into the history, after which every Back from the next page takes two presses; 1.0 held a tab close / reload only, which 2.0 keeps. **Found and fixed on the way** (REG-S16.2): the guard missed every move the shell makes in script — G then … (REG-791 said the keys were caught; they weren't), J / K's next lead, Maison AI's rows and links, its plan's Open, the AI credits card's See usage and the out-of-credits Change my monthly amount — all now ask Save · Discard · Keep editing | `components/shell/shortcuts/shortcuts-layer.tsx`, `components/shell/maison-ai.tsx`, `components/shell/maison-plans.ts`, `components/credits/credits-card.tsx`, `components/credits/credit-dialogs.tsx` |
| navigation · Rail › Dashboard and Marketplace, Tools › Market Insights and Meeting Copilot still answer coming soon | **Kept as signposts** (the card's recommendation and REG-808): Dashboard S22 (the rail and the dock), Meeting Copilot S23, Marketplace S24, Market Insights S25 — each step makes its item live | — |
| navigation · No Log out and no personal Settings in a profile menu | **Personal settings: done in S01** (Your profile behind the studio block and the avatar). **Log out: comes with sign-in (S30).** 1.0's profile menu's Settings / Accounts Setup are the rail's Settings and Company | — |
| navigation · Qanvast Ops' Credits · Raise Complaint · Promote · Portfolio · Reviews & Rankings · Hangouts — 1.0's links go to pages its repo lacks | **Nothing to port** — `src/app/(main)/qanvast-ops` is gone from 1.0 (the "qanvast filter", 2026-06-01). 2.0's mocked tabs stay: *Lead credits*, *Reviews* (and *Request Leads*) as signposts for Qanvast's own product; *Hangouts* comes with S27 (with the designer portfolio profiles, which cover 1.0's Portfolio); Raise Complaint and Promote are not drawn | — |
| navigation · the question: hide the Soon items or keep them as signposts? | **Keep them as signposts** — as recommended (`compile.py`: "keep their Soon until those cards are decided") and as REG-808 set them; each later step removes its own Soon | — |
| 1.0's frame · G then I (Inbox) | **Built** — G then M goes to Messages (2.0's word), the rail's item names its keys, the hint and the ? panel list it (REG-S16.1). G then D waits for S22's Dashboard; G then E (Escalations) has no rail place — tickets are Projects › Tickets | `lib/keys/registry.ts`, `components/shell/app-rail.tsx` |
| 1.0's frame · badges capped at 99+ | **Built** — `badgeCount` on every shell count; names keep the whole number (REG-S16.3) | `lib/format.ts`, `components/shell/{app-rail,mobile-nav,tools-popover}.tsx` |
| 1.0's frame · the top bar's Open / Closed to new leads | **Built** — your own Open to new leads in the studio block's menu and the phone's You sheet, under Your profile (REG-S16.4) | `components/shell/view-as-popover.tsx` (+ `.module.css` `.switchMark`), `app/company/members-actions.ts` (`setMyAccepting`), `lib/db/session.ts` (`SessionMember.acceptingLeads`) |
| 1.0's frame · logo → Dashboard | **Kept** — 2.0's logo tile expands the rail (the mock, 795:22541); S22 decides once the Dashboard exists | — |
| 1.0's frame · Qanvast Ops only for a Qanvast-listed studio | **Kept** — 2.0 has no "listed on Qanvast" record and its Qanvast Ops is OpenMaison's (Leads' returns, Studios' switches); the demo studio is listed. Hiding it for an unlisted studio waits for that record (S31's new studio / the developers' port of `studios.is_qanvast_listed`) | — |
| 1.0's frame · the offline banner; the Quick Action menu | **Not brought** — the Quick Action menu was dead (nothing opened it); the offline write queue was dead and the banner promised "Changes will be saved locally", which never happened. Every save that fails offline already says "Couldn’t …" and puts the value back (the house rule) | — |
| 1.0's frame · a count on Leads (every lead in New) | **Not added — flagged for Vicky** — the bell rings Owners and Admins for a new lead and the assignee for theirs; the listing's *Unseen* scope counts them; a red count for a lead that is not late would break 2.0's red rule | — |
| S15's note · `.consentRow.consentRow` in Your profile's stylesheet is redundant | **Removed** (REG-S16.5) — measured at 390 touch: the row starts at its card's padding, margin 0; pm2-s01's ghost check green | `components/profile/your-profile.module.css` |

## Decisions taken (as recommended — her "build all of them" 2026-10-11)
- **Soon items stay as signposts** until their own steps (the card's recommendation; REG-808). Nothing in the rail, the dock, More or Tools was
  added, removed or reordered — the mock's rail (1082:23305) and More sheet (1082:24995) are as drawn.
- **Messages takes G then M** — 2.0's word (one-home N-08), the house rule of a place's first letter; 1.0's G then I would read as nothing in 2.0.
- **One cap, 99+** for every count (1.0 used 99+ on the rail and 9+ on the bell; one rule is simpler, and the bell's pill has the room).
- **Open to new leads joins the menu, not the rail**: 1.0 put it in the top bar beside the profile; 2.0's profile menu is the studio block's
  (S01). It is the member's own switch (`setMyAccepting` reads the viewer, never an id); Owners and Admins still change anyone's on Members.
  The row is a checkbox item whose mark is the DS switch, so the arrows and the keys reach it — a switch inside a menu would be skipped.
  Opened from the keyboard, the menu starts on its first checked row — this row while you are open (the house hook's rule); while closed,
  View as's current member, as before.
- **The help line's words fit the menu's 304** at every width ("Suggested for new leads" / "Not suggested for leads"; the probe measures the
  words against the line).

## What to check in the browser (production build, 1440 and 390; View as switches roles)
- **Dane (Owner), 1440:** the rail's Demo Studio block → *Dane · Your profile*, then **Open to new leads** (on, "Suggested for new leads") →
  press it → "You’re closed to new leads · Undo", the switch off, "Not suggested for leads"; Company › Members → Dane's row says *Closed to new
  leads*; Undo (or press again) → open. With the keyboard: Tab to the block, ↵ → the menu starts on the row, Space / ↵ flip it.
  Hover the rail's Messages → its tooltip names G M; press G (the hint lists Messages), then M → Messages. Your profile → change the name →
  click the heading → G then L → *Save your changes?* (Keep editing keeps the words; Discard goes to Leads); the same from the rail's AI credits
  card › See usage. The rail's Dashboard / Marketplace and Tools' Market Insights / Meeting Copilot still say *coming soon*.
- **Germaine / Michelle (Designers):** the menu's switch is theirs alone (nobody else's row moves). **Hui Min (Admin):** closed in the demo —
  the row reads off. **Priya (Accounting):** Your profile only, no Open to new leads.
- **390 / 320:** the top bar's avatar → the *You* sheet with Your profile, Open to new leads, then View as; a tap flips it, Undo in the
  snackbar; the dock's Dashboard and More's Marketplace still say *Soon*; no sideways scroll.
- **A busy bell:** with more than 99 unread the rail's and the bar's bell read "99+" (the probe adds 120 rows for a moment and takes them away).

## Probes run
Each on its own fresh copy of the repaired base (`pbuild/base.db` + migrate + repair; no new migration or repair) with `next start -p 3160`;
:3160 stopped after. `npx tsc --noEmit -p .` clean · `npx eslint app components lib` 0 errors (the 16 warnings are older files') ·
`npm run design:lint` nothing new · `npx next build` green · `npm run design:anatomy` (on the scratch `next start`, :3160): all 1578 measures hold.

| Probe | Tally |
| --- | --- |
| `pending-modules/verify-pm2-s16.cjs` (new) | 56 / 56 (the page error log empty; it puts back every member's switch, Dane's name, is_you and the 120 notifications it adds) |
| through `regression/run.cjs` on :3160: `ux-p7` · `kb-r1` · `kb-r2` · `search` · `view-as` · `cr-r1` · `cr-r5` | 89 / 89 · 35 / 35 · 29 / 29 · 27 / 27 · 23 / 23 · 59 / 59 · 16 / 16 |
| `panel-order` (View as · Company · Tools widths in both stylesheet orders) | View as 304 · Company 304 · Tools 318, both orders (no tally lines) |
| `ghosts-same` 1440 · `ghosts-same-390` touch · `ghosts-measure` (Members) · `ghosts-strips` (capture) | 51 / 51 · 51 / 51 · Δ 0 on every row · every route captured |
| `first-run-empty` · `first-run-noleads` · `first-run-full` · `first-run-ghosts` | 89 / 89 · 5 / 5 · 6 / 6 · 15 / 15 |
| `ux-p3` · `ux-p4` · `ux-p6` · `dane-p6` · `st-r1` · `sw-r1` · `sw-r4` · `overlays` | 91 / 91 · 56 / 56 · 57 / 57 · 41 / 41 · 57 / 57 · 34 / 34 · 35 / 35 · 67 / 67 |
| `pending-modules/verify-pm2-s01` (Your profile + its ghost at 390) · `s02` · `s03` (the consent row) · `s08` · `s09` · `s14` | 79 / 79 · 105 / 105 · 79 / 79 · 70 / 70 · 79 / 79 · 69 / 69 |
| `reports-in-company-2026-10-08/verify-reports` · `parity-map-build/verify-pm-i` (View as Priya) · `projects/verify-pj-r3` · `verify-pj-r8` | 41 / 41 · 54 / 54 · 90 / 90 · 67 / 67 |

No existing assertion was changed.

## Migration and repair
- **No migration** — `members.accepting_leads` exists (REG-612); `SessionMember` reads it.
- **No repair** — every state shown is the record (Hui Min's closed row is the demo's own). **R117 is still free.**

## For the next steps
- **S22 (Dashboard):** make the rail's and the dock's Dashboard live (`TOP_ITEMS` / `DOCK`), add `go.dashboard` · `g d` (1.0's) to `GO` and
  `GO_BY_HREF`, and decide the logo tile (1.0's logo opened the Dashboard).
- **S23 / S24 / S25:** give `TOOLS`' `copilot` / `insights` an `href` and the rail's / More's Marketplace an `href` — the Soon tag, the
  "· coming soon" name and the press's snackbar all key off the missing `href`, so nothing else changes; pm2-s16 §1 asserts the Soon ones by
  name and will need its list trimmed (a deliberate change of this rule).
- **S27 (Hangouts):** `components/qanvast/qanvast-tabs.ts` — add the Hangouts href to `LIVE`.
- **S30 (Sign in):** Log out's place is the studio block's menu and the phone's You sheet, under *Open to new leads* (1.0's profile menu ended
  with Sign out under a rule); `setMyAccepting` already reads the signed-in member.
- **S31:** a "listed on Qanvast" record would let the rail hide Qanvast Ops for a studio that isn't (1.0's rule).
- **Any step adding a script navigation in the shell** (a sheet's row, a snackbar's Open): send it through `leaveThen` — a link press is
  caught by the guard on its own, a `router.push` is not.
- **UAT (the orchestrator's):** ch16 (keyboard) could add G then M; a "close yourself to new leads" step fits the Members / profile chapter.

## Principles check (DESIGN-PRINCIPLES.md)
1. **The mock wins, exceptions written down** — the rail, the dock and More are the mocks' (nothing added, removed or reordered); the one new
   row sits in S01's menu (no mock) and is logged with its invented words (REG-S16.4), and flagged for Vicky as a second control for Members'
   record.
2. **One system, no one-offs** — the Company panel's row (`panel.row` · glyph · text · help), the DS sm Switch as the mark, the house snackbar
   with Undo, `couldnt` / `refusalOf` for a refusal, `leaveThen` for every script move, one `badgeCount` for every count; tokens only —
   `npm run design:lint` holds (nothing new).
3. **Plain words** — "Open to new leads", "Suggested for new leads", "You’re closed to new leads", "Go to Messages".
4. **Nothing is lost** — the switch answers with Undo; edited forms now ask before a key, Maison AI or the credits card moves the page.
5. **Say why** — a refused change says "Couldn’t change whether you take new leads — …" and the switch goes back; the server's rule
   ("Accounting takes no leads") travels as `{ error }`.
6. **Back returns where you came from** — untouched: the menu's Your profile and every door keep `?from=`; G then M is a rail move (L1).
7. **Every screen is whole** — no new page; the shell, ghosts (ghosts-same 1440 / 390, ghosts-measure) and the menu at 1440 · 1024 · 768
   touch · 390 · 320 checked; the probe's page error log is empty.
8. **Every width is designed** — the menu keeps inside the window at 1024 and 768 touch; the sheet at 390 and 320 has no sideways scroll
   (against `screen.width`); the 99+ pill keeps to the bar at 390; the switch's touch target follows the S15 house rule.
9. **Tables follow the leads listing** — not applicable (no table).
10. **Motion with purpose** — no new motion; the switch's own and the house snackbar's.
11. **Honest data** — the row reads and writes `members.accepting_leads`, the same record Members and the Assign box's suggestion read; the
    probe's 120 notifications are taken away in its `finally`.
12. **Reach for everyone** — the row is a `menuitemcheckbox` with `aria-checked`, a name and its line as `aria-describedby`; the arrows reach it,
    ↵ and Space press it; the switch is `inert` and hidden so nothing is announced twice; a badge's name keeps the whole number.
- **How to add a missing thing** — one home (the switch joins the menu 1.0 kept it beside; Members stays the place to change anyone's); shown
  only when it applies (not for Accounting); one filled thing per row (the switch); no set-up (everyone starts open, as the record does).
