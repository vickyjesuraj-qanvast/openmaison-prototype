# Responsive audit — the Quotes module on a phone and a tablet (read-only audit, 2026-10-22)

The owner (Vicky, he/him) asked: "the responsive mobile and tablet screens are not correct … anything with too heavy data is not pure
responsive. Do a deep audit module by module, starting with Quotes. Think a different experience for mobile and tablet which doesn't
have to be the same as desktop: on the move, less cognitive load. Relook at layouts, components, font sizes, everything a world-class
responsive design needs." Nothing is built from this audit until he marks it. You AUDIT and RECOMMEND; you change no file in the repo.

## What you have
- A production build of 2.0 running at http://localhost:3011 on a scratch database (`…/scratchpad/rwd-quotes/audit.db`). It is NOT the
  owner's local.db; you may click through menus, open sheets and type into fields. Never run `npm run db:*`, never touch `local.db`, never
  start or stop servers (the owner's own :3000 and :3001 must not be touched; :3011 is ours and stays up).
- Screenshots already taken: `…/scratchpad/rwd-quotes/shots/` — names `<width>-<nn>-<surface>.png` with widths `m390` (390×844, touch),
  `t768` (768×1024, touch), `t1024` (1024×768, touch). `log.json` beside them records each page's scrollWidth and whether it overflowed.
  Read the images with the Read tool. `capture.cjs` beside them is the Playwright script that took them: copy its pattern to take more
  (`NODE_PATH=/Users/vicky/Documents/GitHub/openmaison-prototype/node_modules node yourscript.cjs`), always with `isMobile: true, hasTouch: true`
  at 390 and 768, and write them into YOUR OWN folder `…/scratchpad/rwd-quotes/<lane>/`.
- The rules the design already has: `design-source/context/responsive.md` (breakpoints mobile ≤767 · tablet 768–1024 · desktop ≥1025;
  touch rules: ≥44px targets, nothing hover-only, tables as touch scrollers at ≤1024 "waiting for their mocks", phone cards for the Quotes
  tab REG-377 and the Items table REG-597), `DESIGN-PRINCIPLES.md` (principle: "Phone, tablet and desktop are each designed, not squeezed"),
  `design-source/REGISTER.md` (search a REG-nnn named in a code comment before calling something a defect — if it is a decision, say so and
  still say whether it serves a person on the move).
- The code: `components/quotes/**`, `components/leads/quotes/**`, `components/om/**` (the house pieces: `sheet.tsx`, `dialog.tsx`,
  `drawer.tsx`, `portal-menu.tsx`, `text-field.tsx`), `components/shell/mobile-nav.tsx`, `lib/breakpoint.ts`. CSS modules carry the two
  media queries `(max-width: 767px)` and `(max-width: 1024px)`.

## What to produce — ONE file, `…/scratchpad/rwd-quotes/<lane>/findings.md`
1. **Findings table** (aim for 15–30, every one specific and verifiable; no padding):
   `| id | surface | width | severity | what is wrong (what you saw) | evidence (shot file) | rule it breaks | fix inside today's pattern |`
   - id = `<LANE>-nn` (A-01 …). width = 390 / 768 / 1024 / all. severity = Blocker (can't complete the task on that width) · Major
     (hard, slow or error-prone) · Minor (polish). Say what you measured where it matters: a touch box under 44px (measure with
     getBoundingClientRect), text under 14px, a truncated label, a sideways scroll, a tap that needs hover, a sheet that doesn't fit the
     viewport, something that needs two hands or a zoom.
   - Don't repeat the shell's known rules (the dock, the top bar) unless the Quotes surface breaks them.
2. **"On the move" section** — for each surface in your lane, in a few lines: what a designer or owner on site / in a car / at a client's
   home needs from it (the 3–5 jobs), what today's layout makes them do instead, and what the surface should BE on a phone and on a tablet
   if it did not have to look like desktop. Be concrete (what is on screen, in what order, which is the one primary action, what moves
   behind a tap). Phone and tablet may differ: a tablet in portrait is closer to a phone; landscape at 1024 can hold two panes.
3. **Measurements block** — the numbers you took (font sizes of the key text, touch boxes, column widths, page heights at 390) so the
   owner can check them.
4. Keep it under ~400 lines. Plain words; no praise, no hedging.

## Lanes
- **Lane A — entry and the client's side:** Tools › Quotes `/quotes` (list, its toolbar, filters, column settings drawer, row ⋮, bulk bar,
  the "Waiting on client" chip, Archived/Deleted sheets), a lead's Quotes tab `/leads/2bc08444-0409-47c3-9675-0750977c5838/quotes` and
  `/leads/7a805f6e-e0dd-43be-ace5-36e689d08789/quotes`, the Create Quote modal (press Create Quote / + on those pages: Blank · From a
  template · Upload a quote · Draft with Maison AI), the client's confirmation page `/confirm/f529ab6d-5c59-4cb9-abf3-4e79385d20fb`
  (read-only: do NOT press Confirm), the view-only link notice `/quote/none`. Shots 01, 02, 03, 12, 13.
- **Lane B — the editor's frame and every section but Items:** `/quotes/39e4c832-bf4a-409e-bf41-bfc8d19b4340` (Draft), `/quotes/f529ab6d-…`
  (Sent to Client), `/quotes/1f598389-4008-4079-a956-5dff071fb708` (Signed), `/quotes/a13747cb-e058-46fc-a631-6a22ffa79823` (Approved):
  the header (title · chips · Saved · status · Send ▾ · ⋮ · close), the section tabs row, the section cards (General Info, Payment
  Schedule, Files, Terms and Conditions, Additional Notes, Signature, Activity), the template card and banner, the approval bar and sent
  banner, the Send ▾ sheet and the dialogs behind each row (open them, don't send), the ⋮ menu (Rename, Duplicate, Revise, Version
  history, Delete…), the right-hand strip at tablet (Maison AI, outline, client view). Shots 04, 07, 08, 09, 10, 10b.
- **Lane C — Items and the document:** the Items section at 390 (the cards REG-597: `item-cards.tsx`), the line sheet, the section
  sheet, the row ⋮ sheet, Add item (+), search, the ⋮ of the Items card (paste, price book, columns, export…), the items summary (totals,
  discounts, By category), the Items GRID at 768 and 1024 (`items-table.tsx`: columns, frozen block, sideways bar, drag handles, the
  keyboard grid on touch); and the Preview `/quotes/39e4c832-…/preview` at every width (the paper's size on screen, zoom, the header's
  controls, What your client sees, Copy link, Download PDF, Send), the client view pane on the editor. Shots 05, 06, 11.

Start by reading the shots of your lane at all three widths, then the code behind what you saw, then take any extra captures you need.
