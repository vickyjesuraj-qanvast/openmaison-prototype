# Responsive audit — the Contracts module on a phone and a tablet (read-only audit, 2026-10-22, evening)

The owner (Vicky, he/him, the product designer) asked on 2026-10-22: "the responsive mobile and tablet screens are not correct … anything
with too heavy data is not pure responsive. Do a deep audit module by module, one at a time … think a different experience in mobile and
tablet which doesn't have to be the same as desktop: on the move, less cognitive load. Relook at layouts, components, font sizes, everything
a world-class responsive design needs." Quotes was audited and built today (his picks: Build on everything); he answered Q-08 "the next
module: Contracts". Nothing is built from this audit until he marks it. You AUDIT and RECOMMEND; you change no file in the repo.

## What Quotes settled (the rules you audit against — read these first)
- `design-source/context/responsive.md` § *On the move* (the owner's rule after Quotes): ≤1024 is designed, not squeezed; **read first, edit
  second**; one thing at a time; the scale 16 · 14 · 44 (body 16, secondary 14, never under 14 for a value, a name or a sentence; targets 44;
  foot buttons 48; 16 gutters; 12 inside cards; inputs at 16); a table on a touch tablet shows what fits; paper is a viewer; a client's page is
  always a phone page; nothing runs off the screen and nothing covers a foot; measure against the device, not the window.
- The Quotes record: `design-source/context/responsive/quotes-on-the-move-2026-10-22/` — `README.md` (what was built), `brief.md` (the
  design contract: the Quote screen, the section list and screens, the lists' phone card, the paper viewer, the client's page) and the
  outcomes. **Contracts should land on the same pieces** wherever a contract is the same kind of thing as a quote: a record that opens as its
  document with a hero and one primary (`components/quotes/screen/*` is the shape), lists as the phone card, the paper viewer
  (`components/quotes/confirm/paper-viewer.tsx`), the send sheet that fits (`components/contracts/editor/dialogs.tsx`, built today), the
  template picker as a radio list (`components/contracts/contract-template-picker.tsx`, built today). Say where Contracts can reuse and where it
  genuinely differs (a contract is prose with signature boxes, not lines with prices; the client signs on their phone — that page is the one
  that must be perfect).
- `DESIGN-PRINCIPLES.md`, `design-source/REGISTER.md` (search the REG-nnn named in a code comment before calling something a defect — if it
  is a decision, say so and still say whether it serves a person on the move; the Contracts decisions are REG-534, REG-629…635, REG-1691…1700,
  REG-2572…2583 for today's), `design-source/context/lead-contracts/` (the specs), `design-source/context/parity/07-…` and `08-…` (what 1.0
  had and where it went).

## What you have
- A production build of today's main (Quotes on the move landed) at **http://localhost:3014** on a scratch database
  (`/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/5925ce42-6d4b-4f83-b6c8-f3e919c3f6fb/scratchpad/rwd-contracts/audit.db`).
  It is NOT the owner's local.db: you may click through menus, open sheets, type, press Send via WhatsApp (it opens wa.me in a new tab and
  marks the contract Sent — that gives you the live signing page), sign on the signing page as a client. Never run `npm run db:*`, never touch
  `local.db`, never start or stop servers (the owner's :3000 / :3001 and the regression's :3011–3013 are not yours; :3014 is ours and stays up).
- Screenshots already taken: `…/scratchpad/rwd-contracts/shots/` — names `<width>-<nn>-<surface>.png`, widths `m390` (390×844, touch), `t768`
  (768×1024, touch), `t1024` (1024×768, touch); `log.json` beside them records each page's scrollWidth / clientWidth and whether it overflowed.
  Read the images with the Read tool. `capture-contracts.cjs` beside them is the Playwright script that took them: copy its pattern for more
  (`NODE_PATH=/Users/vicky/Documents/GitHub/openmaison-prototype/node_modules node yourscript.cjs`), always `isMobile: true, hasTouch: true` at
  390 and 768, **tablet shots viewport-only** (a full-page capture drops `(hover: none)` mid-shot and parks hover floats at the edge), overflow
  measured against `documentElement.clientWidth` (under touch emulation `innerWidth` grows with overflowing content), into YOUR OWN folder
  `…/scratchpad/rwd-contracts/<lane>/`.
- The code: `components/contracts/**` (editor: `contract-editor.tsx`, `contract-header.tsx`, `doc-editor.tsx` the contenteditable paper,
  `doc-toolbar.tsx` Smart Text ▾ · eSignatures, `outline-pane.tsx`, `esign-panel.tsx`, `dialogs.tsx`, `contract-banner.tsx`,
  `contract-template-editor.tsx`; `render/contract-paper.tsx`; `preview/`; `sign/` the client's pages; `list/contracts-workspace.tsx`;
  `contract-template-picker.tsx`, `import-contract-dialog.tsx`, `deleted-contracts-sheet.tsx`, `send-bundle-dialog.tsx`, `unsign-dialog.tsx`),
  `components/leads/contracts/**` (the lead's tab), `components/company/templates/contract-templates-gallery.tsx`, `app/(editor)/contracts/**`,
  `app/sign/**`, `app/contracts/`, `lib/contracts/**`, the house pieces `components/om/**` (`sheet.tsx`, `dialog.tsx`, `drawer.tsx`,
  `portal-menu.tsx`, `text-field.tsx`, `signature-pad.tsx`), `components/shell/mobile-nav.tsx`, `lib/breakpoint.ts`. CSS modules carry the
  queries `(max-width: 767px)` and `(max-width: 1024px)`.
- Demo records (ids on the scratch DB): contracts — **Draft** `81463786-769d-42aa-b226-192081cfd6e6` (Olivia Martinez, lead
  `2bc08444-0409-47c3-9675-0750977c5838`, from quote OM-10001), **Signed** `301fe7ef-3cd9-47bb-a159-daacd92d7408` (Ryan D’Souza, lead
  `5e8b9c29-54ef-4b56-96a4-2027804c4cd7`), `32238de7-4a42-4d80-a001-d5a1e171f4fb` (Benjamin Han), `382ddfed-aa4a-4bb5-a745-fe0e035b85cf`
  (Aisha Rahman); templates `/templates/contracts/<id>` — `9d229e29-f161-4066-adae-57c6b90c25f5` Interior Design Service Agreement (default),
  `d618eaaa-6ea1-4bc3-afd0-65988e079ce9` Variation Order, `349af14a-28ea-46f2-aee1-823454b7e4c6` Letter of Appointment,
  `da590928-3f93-4678-af0f-cca1d6244b6f` Completion & Warranty Letter; the Approved quote `a13747cb-e058-46fc-a631-6a22ffa79823` (Harpreet Kaur)
  for Send ▾ › Send for signature; the signing page is `/sign/<contract id>` (the demo's token = the id), `/sign/<id>/quote` the quote read-only,
  `/sign/none` the notice; no bundle or uploaded PDF exists — make one if your lane needs it (Send together from Tools › Contracts; Import from File).

## What to produce — ONE file, `…/scratchpad/rwd-contracts/<lane>/findings.md`
1. **Findings table** (aim for 15–30, each specific and verifiable; no padding):
   `| id | surface | width | severity | what is wrong (what you saw) | evidence (shot file) | rule it breaks | fix inside today's pattern |`
   - id = `<LANE>-nn`. width = 390 / 768 / 1024 / all. severity = Blocker (can't complete the task on that width) · Major (hard, slow or
     error-prone) · Minor (polish). Say what you measured: a touch box under 44 (getBoundingClientRect), text under 14, a truncated label, a
     sideways scroll, a tap that needs hover, a sheet that doesn't fit, something that needs two hands or a zoom.
   - Don't repeat the shell's known rules (the dock, the top bar) unless the Contracts surface breaks them. Where a Quotes piece built today
     already solves it, name the piece.
2. **"On the move" section** — for each surface in your lane: what a designer or owner on site / in a car / at a client's home needs from it
   (the 3–5 jobs), what today's layout makes them do instead, and what the surface should BE on a phone and on a tablet if it did not have to
   look like desktop — concrete: what is on screen, in what order, the one primary action, what moves behind a tap. Phone and tablet may differ.
   For the client's signing page: what the client needs, in their hand, on a bus, to read and sign in under two minutes.
3. **Measurements block** — the numbers (font sizes of the key text, touch boxes, column widths, page heights at 390).
4. Under ~400 lines. Plain words; no praise, no hedging.

## Lanes
- **Lane A — entry, lists and the client's side:** Tools › Contracts `/contracts` (list, toolbar, search, filters, column settings, row ⋮,
  bulk bar, the kebab's Archived / Deleted / Send together, Import from File), the lead's Contracts tab `/leads/<olivia>/contracts` and
  `/leads/<ryan>/contracts`, the picker from a quote (`/quotes/<harpreet>` → Send ▾ › Send for signature), Import a contract; the client's
  pages: the live signing page (send Olivia's Draft first) `/sign/<id>` at every width — reading, the read-and-accept gate, the signature pad
  (draw · type), the NRIC field, the signing record after signing, `/sign/<id>/quote`, the signed state's page, `/sign/none`, the bundle page if
  you make one. Shots 01 02 03 10 11 12 13.
- **Lane B — the contract editor:** `/contracts/<olivia>` (Draft) and `/contracts/<ryan>` (Signed): the header (title · chips · Saved ·
  status · Send · ⋮ · close), the meta row (recipient · date · quote · issued by), the banners, the paper (`doc-editor.tsx`: typing, selection,
  the Formatting toolbar, Smart Text ▾ and its chips, eSignatures and the signature boxes, the placement of a sign field by touch), the Outline
  pane / drawer, the eSign panel, every dialog (Send for digital signature, Send a reminder, Mark as signed, Edit recipient, Save as template,
  Automation, Unsign, Delete), the preview `/contracts/<id>/preview`. Shots 04 05 06 07 08 09.
- **Lane C — templates and the contract pieces inside other flows:** Company › Templates › Contracts `/company/templates/contracts` (gallery
  grid / list, folders, kebab, Deleted), the template editor `/templates/contracts/<id>` (the same paper + toolbar for a template; Before the
  client signs; use at handover; the default), the picker (`contract-template-picker.tsx` — rebuilt today at ≤767 as a radio list: audit it as it
  now is), the quote's *Contract · status* chip and the contract's quote field, the lead Overview's contract rows, the Won step's upload as a
  contract, the project's Money › contract row, the Files tab's *Send for signature* on a PDF (`/sign/document/<token>`), the preview card
  `/card/contract/<id>` if it renders. Shots 03 04 and your own.

Start by reading the shots of your lane at all three widths, then the code behind what you saw, then take any extra captures you need.
