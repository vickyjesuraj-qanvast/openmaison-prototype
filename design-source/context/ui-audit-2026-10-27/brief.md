# The UI · UX · copy audit — the lanes' brief (2026-10-27)

**The owner's ask (Vicky, the product designer):** "I noticed a lot of UI issues and inconsistency across the pages and modules. Also, most of
the UIs look too overwhelming and too much noise on the screen … I want you to audit all of it and make it absolutely simple and super
intuitive UI and UX across. Also the copies across the modules are confusing for the studios to use — example *Money* under project could
have been *Payments* and *Needs you 51* in dashboard could have been *Needs your attention* — similarly there are a lot of copies that need
rework. Check and report to me all of this now."

His two examples of noise:
- **Company › Members** ("People and roles"): every member row carries a role select, a reports-to select, an Open to new leads switch, a
  Projects at once select ("Studio default · 4"), a preferences line, "Signature: not set", Add PayNow, an "ON THE ABOUT PAGE" tag,
  Preferences, Public profile and Deactivate — four or five purple text actions on every row, plus a five-line paragraph on top.
- **Marketplace**: two rows of chips with counts (Brands · 14 / Deals · 10, then nine category chips · n), search + sort, and every card's
  photo carries two badges ("Featured" + a truncated deal "12% off every sofa for de…"), a monogram tile, name, category, "128 reviews · 2
  deals", a truncated "In your vendors · 76 reviews · 1…", and a ⋮.

**This is a READ-ONLY audit.** Change no code, no docs, nothing in the repo. Everything you write goes under
`/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/ui-audit/`.

## Where and how

- Repo: `/Users/vicky/Documents/GitHub/openmaison-prototype` (Next 16, React 19, CSS modules on `--om-*` tokens). Read `CLAUDE.md` (its *Map*
  finds every module's files), `DESIGN-PRINCIPLES.md` (§2 one system, §3 plain words for studio people, §5 say why, §7 every screen is whole)
  and `design-source/context/page-checklist.md` before you start.
- **Your server is already running** on your lane's port (below), a production build on its own scratch copy of the demo data, signed in as
  Dane (the Owner). Use ONLY your port. **Never touch ports 3000 or 3001** (the owner's own servers), never start or stop servers, never write
  `local.db`. Your lane's DB is `…/scratchpad/ui-audit/lane<N>.db` — read ids from it with `sqlite3 -readonly` (e.g. `select id, name from
  projects`). Pages may write small things (a "seen" stamp) into that scratch DB; that's fine. Don't submit destructive forms.
- **Measure every main screen** with the shared measure (it prints words, controls, purple text actions, filled buttons, uppercase, font
  styles, text colours, boxes, truncated text, and saves shots):
  `cd /Users/vicky/Documents/GitHub/openmaison-prototype && NODE_PATH=$PWD/node_modules node /private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/ui-audit/measure.cjs http://localhost:<port> <path> <lane>-<name> [width height touch]`
  — at 1440×1024, and for the lane's most-used screens also `390 844 1` (a phone, touch). Shots land in `ui-audit/shots/`. Name them
  `<lane>-<page>[-390]`. For dialogs, menus, sheets and states a URL can't open, write your own small Playwright script (in the
  scratchpad, `NODE_PATH=$PWD/node_modules`) and shoot them too. LOOK at the shots (Read the PNG) — the numbers point, the eye decides.
- Read the components' code for the copy (labels, helper lines, empty states, tooltips, snackbars, errors) — quote it verbatim with
  file:line.

## The lens — what to report

1. **Noise / overwhelm** — anything a studio owner has to read past to do the one thing the screen is for:
   - more than one filled (primary) button on a screen; rows that repeat several purple text actions (the house's way: ONE verb on the row,
     the rest in the row's ⋮ — `PortalMenu` + `DropdownItem`); a toolbar or card head with many controls at rest;
   - explanatory paragraphs longer than a line sitting on the page (move to a help tooltip / "How this works" link, or cut);
   - counts on every chip / tab where they don't help a decision; two badges on one picture; tags in CAPITALS that aren't a status;
   - "not set" / "None" / "--" placeholders repeated down a list; repeated information (the same fact twice on one screen);
   - truncated text ("…") that hides the key fact; long titles; too many font sizes or text colours; boxes inside boxes.
2. **Inconsistency** — the same thing drawn or behaving differently on two pages: tabs vs chips vs segmented control for the same job;
   filter bars; page headers; card heads; empty states; row actions (⋮ vs links vs buttons); button looks (filled · outlined · text) for
   the same kind of action; count formats ("Brands · 14" vs "Tasks 2" badge vs "(3)"); Title Case vs sentence case; date / money / time
   formats; spacing and radii; a list drawn as a table on one page and as cards on another at the same width. Name both places.
3. **Copy** — words a Singapore interior-design studio owner wouldn't use or would misread: module and tab names (e.g. *Money* → *Payments*),
   headings (*Needs you 51* → *Needs your attention*), system / insider words (*Runs the studio*, *Studio default · 4*, *Projects at once*,
   *On the About page*), clever or vague phrasing, two names for one thing across modules (Members / Team / People; Client / Homeowner;
   Vendors / Suppliers / Contractors …), verbs that don't say what happens, jargon in errors and empty states. For each: the exact words
   now, where (route + file:line), and the exact words you propose.
4. **Defects** you trip over (broken layout, overlap, cut-off, wrong state, console errors) — report briefly.

**Proposals must be concrete and on the house pieces** (`components/om/*`, the DS through `@/components/ds`, the listing's table model,
`PortalMenu`, `Chips`, `Tabs`, `EmptyState`, `Tooltip`, `ConfirmDialog`/`Dialog`/`Drawer`): say exactly what to remove, move, merge or
rename, and what the screen looks like after. Prefer removing to adding. Keep the owner's standing rules: a record with tabs (a lead, a
project) keeps one page with its tab strip at every width (REG-2734); no filled buttons on the Dashboard; every refusal says why. Where a
design decision is logged (a `REG-nnn` near the code, `design-source/REGISTER.md`), name it and still say if it reads as noise — he asked
for all of it.

## What to write

1. `ui-audit/lane-<N>.json` — an array of findings:
   `{ "id": "<N>-01", "area": "Company › Members", "route": "/company/members", "kind": "noise" | "inconsistency" | "copy" | "defect",
      "severity": "high" | "med" | "low", "title": "≤ 80 chars, plain", "now": "what is there — concrete, copy quoted verbatim",
      "why": "why it hurts a studio user", "proposal": "exactly what to do (words, pattern, what moves where)", "effort": "S" | "M" | "L",
      "shots": ["<lane>-<page>.png"], "code": ["path:line", …] }`
   Order by severity. Aim for completeness over prose; one finding per distinct problem (group the same problem across many rows of one
   page into one finding; the same problem on several pages = one finding listing every route).
2. `ui-audit/lane-<N>-words.json` — every copy change you propose, one per line, for the cross-app glossary:
   `{ "now": "Money", "proposed": "Payments", "where": ["/projects/[id]/money tab", "file:line"], "why": "…", "kind": "name" | "heading" |
      "label" | "helper" | "empty" | "error" | "status" }` — and note when the same thing is named differently in another module.
3. `ui-audit/lane-<N>-pages.md` — one line per screen measured: route · words · controls · purple actions · filled buttons · uppercase ·
   font styles · colours · truncated · your one-line verdict.

Your final message: the top 10 findings in one line each, the counts by kind and severity, and the three paths.
