# Contracts on the move — C2's outcome (P-03's content · P-04 · C-13 · C-15 · C-16, 2026-10-22)

His "I have marked everything in the doc please check and built accordingly" on https://claude.ai/artifact/LWsKVuRnUiALheTvetDzUv — Build on
every proposal and fix, the recommended answer on every question. C2 built **the Document screen's content** (the one tool row with + ▾ and
its sheet), **a signature field placed by choosing where**, **the Signature fields and Before-the-client-signs panels**, **the Smart Text
chip's tap sheet**, and C-13 · C-15 · C-16, on the lane (worktree `agent-a756396b8b582aa47`, branch `worktree-agent-a756396b8b582aa47`,
port 3182, `scratchpad/rc-build/C2/lane.db`; WIP base `b9407062`). Nothing committed. The register rows are staged in `reg-c2.md` beside
this file. The desk's bar, paper and drawer at ≥1025 are byte-identical (§ The 1440 comparison).

## Ledger

| id | call | where / why |
| --- | --- | --- |
| **P-03** (content) | built | `components/contracts/document/tool-row.tsx` + `plus-menu.tsx` + `menu-or-sheet.tsx` + `document.module.css` — at ≤1024 `DocToolbar` IS one row: Undo · Text ▾ · B · I · U · List · **+ ▾**, seven 44 boxes at a 44 pitch (the rich editor's tool composed, the box grown, never the mark); nothing scrolls sideways, nothing hidden; at 320 the last wraps. + ▾ = a sheet (a tablet held upright too) / an anchored 320 menu (held sideways): Add a signature field › · Link · Image · Highlight · Numbered list · Align left / centre / right · **Insert a field in one level** (every record under its group's eyebrow with what it prints here at 14, "Empty" in red). The Text style menu the same way. Write with AI: the sheet's pinned row on a phone, the row's end on a tablet held sideways. The Link dialog and the Image picker are one piece for both bars (`insert-helpers.tsx`). A chip's tap sheet (B-19 / C-15, below). The frame (C1) hides the Maison button and carries ≡ and Done — the row has neither (today's page keeps the Outline in Maison AI's sheet rows). |
| **P-04** | built | `lib/contracts/tokens.ts` `topBlocks` · `signPlaces` · `placeWords` · `insertSignFieldAfter(html, afterIndex \| 'end', key)` · `fieldPlaceWords` · `signFieldsSummary` (pure, 34 tests in `design-source/verify/responsive-contracts/rc-c2-pure.mts`); `placement-dialog.tsx` (which: the house Chips with "· placed"; where: the clauses from the Outline as DS radio rows, "Under Signatures" picked for you and marked Suggested, "At the end" picked when there is no Signatures heading; the one filled button named after the pick); `DocEditorHandle.insertSignFieldAt` (the block after the clause, scrolled to mid-screen with the fresh pulse, Undo through the snapshot); the box's own ✕ on touch (`doc-editor.tsx`, the house bare close positioned on the box by a layout read, never inside the contenteditable; removes with Undo and takes the empty paragraph with it); `signature-fields-panel.tsx` + `before-signing-panel.tsx` (the two parts) composed by `esign-panel.tsx` at ≤1024, reading the mounted paper through `live-doc.ts` when the host passes no `html` / `onPlace`. A bottom sheet on a phone, a centred 400 dialog on a tablet held sideways. Desk unchanged (Insert at the caret, Dane UAT 8.03). |
| **C-13** | built | `before-signing-panel.tsx` — each gate row is a `label` (the Import dialog's pattern): the words toggle the switch at every width; at ≤1024 the row stands 56, the label 16 over its help 14. The desk's pixels are unchanged; its words now toggle too (one row, one behaviour — flagged ▲ below). |
| **C-15** | built (the chip's half) | `chip-sheet.tsx` + `tokenSource` in `model.ts` — a tap on a chip says its name, what it prints ("Prints as" + the value at 16; empty → the empty note; a template → "[Client name]"), where it fills in from at 14, and Remove with Undo; the template editor gets it through the same `DocEditor`. "How fields fill in" is the template editor's own button (`contract-template-editor.tsx`, C4's file) — see *For other packages*. |
| **C-16** | built | Insert a field is one level under + ▾ with the sample values (`plus-menu.tsx`); a field inserted on touch lands at the saved caret (Dane 8.03's range, kept across the sheet's blur — verified by the probe: the field is in the paper), the line it landed on is brought into view when off the screen, and the snackbar says "Client phone inserted · Undo". |
| B-03 · C-08 | built (P-03) | the one row; no `.barTools` scroller at ≤1024 (asserted). |
| B-04 · B-05 | built (P-04) | never at a thumb's caret; the box scrolls to mid-screen with the fresh mark and a snackbar; as its own block, never inside a word (asserted on the DOM). |
| B-12 | built (P-04) | the panel is two parts — Signature fields (rows, Add) and Before the client signs (label rows); no 36-tall Insert buttons, no 12px help on touch. |
| B-13 | built in part (P-04) | the placement closes on Add and scrolls the box into view, so nothing covers where a field lands at 768 / 1024; a 1024 pane **beside** the paper with the paper sliding left is the frame's layout (C1's `DocumentFrame` / stage) — see *For other packages* (▲). |
| B-19 | built (P-03) | the chip's tap sheet (above). |
| B-20 · C-10 | the frame's (C1) | the Document screen has no Maison button (REG-2587's rule in `DocumentFrame`); on today's page the FAB still sits over the paper at 390 until C1 lands — nothing in C2's files draws or hides it. |
| C-11 | the frame's (C1) | Done in the pinned bar is `DocumentFrame`'s; the row itself is sticky under the host's chrome (`--doc-tools-top`). |
| C-17 | built (P-04) | the box's own ✕ with Undo; the box's label reads 14 on touch (its uppercase kept). |
| P-13 (the scale, in C2's pieces) | built | 16 / 14 / 44 in every new piece: the row's 44 boxes, the sheet rows 44, the panel rows 56 (16 over 14), the placement rows 48 (16), the chip sheet 16 / 14, the Outline's rows 16 / 14 at ≤1024 (`outline-pane.tsx`). |

## Decisions taken (▲ = for him to see)

- ▲ **C-13 at the desk too.** The gate rows became `label`s at every width — the desk's look is unchanged to the pixel (the byte-identical
  check holds with the drawer open), but a click on the words now toggles the switch there as well. One row, one behaviour, as the Import
  dialog's row has always done; the rc-c2 probe asserts it at 1440 with the comment the brief asks for.
- ▲ **The order inside + ▾.** The brief lists "Insert a field … · Add a signature field › · Link · Image · Highlight · Alignment · Numbered
  list". Built: the six short actions first (Add a signature field · Link · Image · Highlight · Numbered list · the three alignments —
  264px, all on the first screen), then the eyebrow **Insert a field** with its ~24 rows under their group eyebrows. Twenty-four rows before
  "Add a signature field" would have put the one action that matters most 1,000px down a sheet. Either order is one tap; swap is a
  ten-line change in `plus-menu.tsx`.
- ▲ **"Text ▾" with words, not the current style's full name.** The trigger reads "Text" for a paragraph and "Heading 1 / 2 / 3" in a
  heading (ellipsised at 320), its aria-label "Text style: Normal text"; the drawn screen's "Text ▾". The row stays one row at 360+ and wraps
  only at 320.
- ▲ **"Add another" on a placed field.** A field already placed keeps an Add (as the desk's Insert always allowed a second box — initials on
  several pages); it reads "Add another" as a text button, "Add" outlined when the field is missing. The chips in the placement say "·
  placed" for the same reason.
- **The placement is a Dialog, not a pane.** On a phone the house `Dialog size="form"` is a bottom sheet; on a tablet held sideways a centred
  400 dialog (REG-2572's pattern for the payment sheet); it closes on Add before the box is shown, so nothing covers the landing place.
- **Studio signature with no saved signature.** The placement still offers it (the readiness check says the box would print blank before Send,
  as it does for the desk's Insert); its help line says so under the chips, and the panel's row says "Not placed · set your signature up…".
  `DocToolbar` passes no `hasStudioSignature`, so the row's dialog assumes one; the panel (which has it) says the truth.
- **A mouse sees none of it.** The ✕, the chip sheet and the row are gated by `TABLET_DOWN` / the touch query; a touch tablet at ≤1024 gets
  the row (as the brief's widths say), a keyboard tablet at 1025+ the desk.
- **The live paper registry** (`live-doc.ts`) exists so today's editor — which opens the eSignatures panel by its own state and hands it only
  `onInsert(html)` — places a field without a prop from the host. A host that holds the paper passes `html` + `onPlace` and the registry is
  never read. One paper per page; the editor registers on mount and clears on unmount.
- **The fresh mark stays on the screen.** `data-fresh` is stripped from everything the paper publishes (`clean`), and the value effect
  compares without it — found at landing by the probe (REG-C2.9).
- **The paper's wrapper is positioned only on touch.** The ✕ needs a positioned ancestor; with `position: relative` on the wrapper at every
  width the desk's paper rasterised one chip corner one unit differently (one pixel of 1,474,560 in six shots, deterministic — after-vs-after
  was identical). The rule now sits under the touch query, and the desk's wrapper is a plain block (§ The 1440 comparison).

## Shared pieces changed

No shared piece. One probe outside C2's folder: `design-source/verify/uat-dane-2026-10-01/P4/verify-p4.cjs` — its "Tick to accept" row
locator takes `.first()` (the whole row is a label now, round the DS switch's own), commented as the brief asks. `components/om/*` untouched; `rich-editor.module.css` is composed (`composes: tool from …`), not changed; `contract-editor.module.css`
(C1's) untouched — the touch rules sit in `components/contracts/document/document.module.css` on their own classes, added beside C1's on the
elements my files render (`outline-pane.tsx`, `before-signing-panel.tsx`). `components/contracts/render/contract-paper.tsx` untouched: the
✕ belongs to the editable paper, not the printed one.

## For other packages

- **C1 (`DocumentFrame`, the Contract screen, the Edit list).**
  - Mount `DocToolbar` + `DocEditor` as today; at ≤1024 the toolbar renders the row by itself. `onOutline` / `onESign` / `eSignOpen` /
    `outlineOpen` are ignored at ≤1024 (the row draws no ≡ and no eSignatures button) — the frame's bar carries ≡ and Done. Name the bar's
    ≡ `aria-label="Outline"` (today's button's name): `ct-r4` ("the Outline is a drawer at 1024") and `sw-r2` ("tablet: … template outline")
    find it by that name and pass again at landing.
  - The row is `position: sticky` under `var(--doc-tools-top, calc(76px + 56px))` at 768–1024 (today's header + meta row) and `0` at ≤767:
    set `--doc-tools-top: 0px` on the frame's scrolling body.
  - The **Signature fields** fold / section screen: `import { SignatureFieldsPanel } from '@/components/contracts/document/signature-fields-panel'`
    — `<SignatureFieldsPanel html={body} hasStudioSignature={!!me?.signatureKind} locked={signedLock} onPlace={(key, row) => { const r = insertSignFieldAfter(body, row.place, key); setBody(r.html); queue({ body: r.html }); snackbar({ message: \`${SIGN_LABEL[key]} added ${placeWords(row)}\`, actionLabel: 'Undo', onAction: () => … }) }} />`
    (when the paper is mounted on the same screen, `editor.current.insertSignFieldAt(row.place, key)` does the insert, the scroll and the pulse
    and returns `{ prev }` for Undo). Its one-line summary for the fold: `signFieldsSummary(body)` → "Studio · Client — placed under Signatures".
  - The **Before the client signs** fold / section screen: `import { BeforeSigningPanel } from '@/components/contracts/document/before-signing-panel'`
    — `<BeforeSigningPanel gates={gates} onGates={…} uploaded={uploaded} locked={signedLock} />` (the eyebrow "Before the client signs" is
    inside it; drop it or keep it as the fold's body).
  - `ESignPanel` takes optional `html` and `onPlace` for a host that holds the paper itself.
  - **B-13 at 1024:** the placement closes on Add and the box scrolls into view, so nothing covers the landing place; if the frame keeps an
    eSignatures pane open beside the paper at 1024, the paper's slide is the stage's (`padding-right` while the pane is open) — C2 has no
    hook on the stage.
  - `PHONE_MODEL` in `components/contracts/document/model.ts` is the words `TABLET_PORTRAIT` should carry in `lib/breakpoint.ts`; once it
    lands, swap the import (one line in `model.ts`).
- **C4 (the template's reading screen, `contract-template-editor.tsx`).** The clause editor mounts `DocToolbar` + `DocEditor` as today and
  gets the row, the + ▾ sheet, the chip sheet and the ✕. For C-15's other half, "How fields fill in" (its 4-second snackbar) can go — a chip
  answers on its own tap now, and Maison AI's sheet already answers "Which fields does it fill in?". The template's "Before the client signs"
  row = `BeforeSigningPanel`; its Signatures row = `SignatureFieldsPanel` with `html={body}` and `onPlace` on the template's state.
- **The ghosts.** No new page; the Document screen's ghost (the row's 44 band under the bar) is C1's `loading.tsx` to draw.

## What to check in the browser

Dane (Owner) · Hui Min (Admin) · Germaine (Designer) — the same on all three (nothing here is role-gated beyond a Signed contract's lock):
- **390 (touch), `/contracts/<a Draft>`:** one row of tools under the meta row; Text ▾ opens a sheet; + ▾ opens the Insert sheet; pick
  "Client phone" → the chip lands where the caret was, "Client phone inserted · Undo". Tap a chip → its sheet; Remove → Undo. Scroll to
  Signatures: each box has a ✕; tap one → "Client signature removed · Undo". Press Send with the client box gone → "Before you send… Show me"
  → the panel: the four rows, Add on Client signature → which / where → "Add under Signatures" → the box lands under Signatures, pulses,
  "Client signature added under Signatures · Undo". + ▾ › Add a signature field does the same.
- **768 upright (touch):** the same; + ▾ and Text ▾ are bottom sheets. **1024 sideways (touch):** anchored menus inside the viewport; Add a
  signature field is a centred 400 dialog; the eSignatures panel is the 360 drawer with the two parts.
- **A Signed contract at 390:** the row's tools rest disabled; no ✕ on the kept copy (it is `ContractPaper`, not the editor).
- **The template editor at 390** (`/templates/contracts/<id>`): the same row; a chip's sheet says "[Client name]" and where it fills in from.
- **1440 (a mouse):** the bar as it was — Undo · Redo | Normal text ▾ | B I U highlight | align ▾ | lists | link · image · Outline · Write with
  AI · Insert a field ▾ · eSignatures; no ✕ on a box; the drawer's Insert rows; a click on "Read to the end"'s words toggles it (C-13).
- The client's page: untouched by C2 (C3's).

## Probes run and their tallies

- **`design-source/verify/responsive-contracts/verify-rc-c2.cjs`** (shape: rq-k5's; args `<scratch.db> [shotDir] [base]`, env `BASE`; sqlite3
  `-cmd ".timeout 30000"`; refuses `local.db`; puts back what it changes; real taps for every new press): **124 passed, 0 failed** (34 pure +
  90 in the browser) — on the production build at 3182, directly on `lane.db` and again through the harness on a fresh copy; page errors:
  none; "put back: contracts" (the autosaves of its own edits). Its first part runs `rc-c2-pure.mts` (34) from the repo.
- The existing probes my change could touch, each on a fresh copy of `lane.db` through the harness's `run.cjs` (patched to this worktree,
  `scratchpad/rc-build/C2/reg/my-run.cjs`; the pm2 probes the harness does not list added with the pm2 shape; `summary.txt` and each
  lane's `probe.log` in `reg/lanes/`):
  ct-r1 **36/0** · ct-r2 **24/0** · ct-r3 **28/0** · ct-r4 **28/1** · pm2-s03 **79/0** · pm2-s29 **73/0** · pm2-s42b **66/0** · pm2-s44g
  **82/0** · pm2-s44t **69/0** · pm2-s44q **52/0** · pm2-s44r **81/0** · pm2-s11 **62/0** (run directly — its font path is one the harness's
  patch cannot reach) · dane-p2b **56/0** · dane-p3 **70/0** · dane-p4 **37/0** (its gate locator takes `.first()`, commented
  `(contracts on the move, a deliberate change of this rule — C-13)`: the whole row is a label now, round the DS switch's own) · dane-p5a
  **59/0** · dane-p5b **54/2** · ux-p5 **58/0** · sw-r2 **26/1** · sw-r4 **35/0** · overlays **67/0**.
  - **ct-r4 (1) · sw-r2 (1):** both wait for `getByRole('button', { name: 'Outline' })` at 1024 — the row draws no ≡ at ≤1024 (the Document
    screen's bar carries it, C1's `DocumentFrame`); on C2's lane alone the Outline at ≤1024 lives in Maison AI's sheet rows. Not weakened: they
    pass once the frame's bar names its control "Outline" (see *For other packages*); the drawer itself keeps `contract-outline`.
  - **dane-p5b (2):** "g-weekday" on the Dashboard's My tasks line and the tasks popover ("Thu, 22 Oct ’26 · 10:00 AM") — the dates people
    plan by, a lead's follow-up: off C2's surface and bound to the day the lane DB was restored (today). Unchanged by C2.
- Shots: `scratchpad/rc-build/C2/shots/` — `01-m390-row` · `02-m390-plus-sheet` · `03-m390-chip-sheet` · `04-m390-box-x` ·
  `05-m390-esign-panel` · `06-m390-placement` · `07-m390-placed` · `08-t768-plus-sheet` · `09-t1024-plus-menu` · `10-t1024-placement` ·
  `11-m390-template-chip` · `12-m320-row`, and `1440-before/` · `1440-after/` (eight pages).

## The 1440 comparison

`shots-1440.cjs` took the same eight pages at 1440×1024 on the WIP base (`b9407062`, built and served on 3182 before C2's build) and on
C2: the Draft editor · the editor with Insert a field ▾ open · with the eSignatures drawer open · with the Text style menu open · a Signed
contract's editor · the Draft's Preview · the template editor · the template editor with its eSignatures drawer open. `compare-1440.cjs`
(sharp, raw RGBA): **all eight byte-identical — 0 of 1,474,560 pixels differ on every page.** (An earlier build, with the paper's wrapper
positioned at every width, differed by one pixel's one channel by one unit on the six editor pages — deterministic, a chip's anti-aliased
corner; the rule is now touch-only and the comparison is clean. The scripts: `scratchpad/rc-build/C2/shots-1440.cjs` · `compare-1440.cjs`;
the sets `shots/1440-before/` · `1440-after/`.)

## Principles check (DESIGN-PRINCIPLES.md)

1. **The mock wins, every exception written down** — no mock for these widths; the drawn screens 3 and 4 and his picks are the source; every
   invented word is in `reg-c2.md`'s rows.
2. **One system, no one-offs** — the house `Sheet` / `PortalMenu` / `DropdownItem` / `DropdownLabel` / `Dialog size="form"` / `Chips` / DS
   `Radio` / the house bare close / the rich editor's tool (composed); no copied stylesheet, no hand-rolled head, foot, row or menu.
3. **Plain words for studio people** — "Insert", "Text", "Add a signature field", "Where should it go?", "Under Signatures", "Add under
   Signatures", "Placed under Signatures", "Not placed", "Prints as", "Fills in from the quote it names".
4. **Nothing is lost** — every desk tool is in the row or one tap under + ▾ (Redo through Undo's own menu? no — Redo rides ⌘Y and the
   browser's own; the row keeps Undo); Insert-at-the-caret stays the desk's; Write with AI rides the sheet's foot.
5. **Say why** — every add and every remove answers with a snackbar and Undo; the placement names where it went; an empty record says
   "Empty"; a missing studio signature says what to set up.
6. **Back returns where you came from** — no address change in C2's pieces; the sheets and dialogs close to the paper they came from.
7. **Every screen is whole** — the row, the sheets and the panel render in today's editor and in the template editor; no new page.
8. **Every width is designed** — 320 (wraps, no sideways scroll) · 390 · 768 upright (sheets) · 1024 sideways (anchored menus, a centred
   dialog) · 1440 byte-identical.
9. **Tables follow the leads listing** — no table in C2.
10. **Motion with purpose** — the fresh pulse (the Items grid's 1.4s) on the placed block; the sheets' house rise; reduced motion honoured.
11. **Honest data** — a field's sample is the record's value or "Empty"; a template's chip says "[Client name]"; the record never carries
    the pulse's mark or a button.
12. **Reach for everyone** — every control is a real button with a name (the ✕ "Remove Client signature", + "Insert", the style trigger's
    "Text style: Normal text"), the menus keep their roles, the radio list is labelled, 44 targets throughout.
