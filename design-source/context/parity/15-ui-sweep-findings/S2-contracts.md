# S2 · Contracts — the audit's findings (2026-09-25)

| # | kind | where | what a person sees | fix |
|---|---|---|---|---|
| 1 | bug | doc-toolbar.tsx `.barTools` scroller | Text style ▾ and Alignment ▾ flip their chevron but no menu shows (clipped inside an overflow-x scroller) | PortalMenu |
| 2 | bug | lead-contracts · contracts-workspace Copy Link · editor/preview | copying a Draft with no signature field copies first, then the server refuses ("Couldn’t share the link" forever); editor/preview say "Sent" before the server answers | readiness first; copy after the share resolves; sendError |
| 3 | bug | contracts-table status menu · status.ts | status menu sends an empty Draft to Sent without Send's checks; Signed from a list signs at once, no confirm/Undo | sendBlock in applyContractStatus; MarkSignedDialog |
| 4 | bug | contracts-table row kebab + Status | inline Dropdowns in the scrolling card: one-row table shows only Archive/Delete; Status cut | PortalMenu |
| 5 | bug | signing-page ≤1024 | the card sits above the document; after reading to the end nothing says what's next; "· sign below" | action at the end / sticky bar; reword |
| 6 | bug | contract-paper caption | "CLIENT SIGNATURE · name · NRIC · date" one ellipsized line — date and NRIC lost on preview, signed page, PDF | wrap |
| 7 | bug | send-bundle-dialog | pre-ticks empty/unsignable Drafts; WhatsApp names them; server drops them; count lies; <2 throws after WhatsApp opened | filter by sendBlock; report count |
| 8 | bug | send-bundle-dialog Copy then Send · sendBundle | same bundle id inserted twice → "Couldn’t send" though the link works; orphan row before the phone check | idempotent; validate first |
| 9 | bug | contract-editor Automation ≤1024 | the kebab's Automation does nothing (popover inside hidden actions) | mount outside / sheet |
| 10 | bug | doc-editor.tsx Tab | keyboard trap: Tab and Shift+Tab insert spaces; no focus ring | Tab only for list indent; focus-visible ring |
| 11 | bug | contracts-table touch ≤1024 | a fixed 7-track template ignores --tracks: empty LEAD column, squeezed Status, Updated under the actions | var(--tracks) 150px; drop Lead on touch |
| 12 | bug | contracts-table ≤767 (Tools) | cards show no lead — identical cards | lead on the card |
| 13 | bug | deleted-contracts-sheet 768–1024 | Restore / Delete Forever cut off | listing model or stack |
| 14 | bug | /sign after delete forever · quote link | Next's plain 404; "view the quote" for a deleted quote | LinkNotice inactive; hide the quote link |
| 15 | bug | signing-page accept stamp | a phone clock >1 min fast can never sign | stamp on the server |
| 16 | bug | contract-template-editor Delete / rename | Delete offered to everyone, refused for non-authors; the name field renames freely | gate by templateChangeBlock |
| 17 | bug | uploaded PDF contract | no bar → eSignatures unreachable | a Before the client signs button |
| 18 | bug | deleted sheet · template picker load failure | empty states that lie | error + retry |
| 19 | bug | template editor Outline ≤1024 | toggles but nothing shows | the drawer path |
| 20 | copy | toolbar "From Blank" · empty "From Scratch" · picker | one action, three names, one wrong (makes the full agreement) | "From the studio agreement" |
| 21 | copy | uploaded PDF | "goes out / the client receives this file" but the signing page only names it | Open the PDF (coming soon); reword |
| 22 | drift | contract editor / preview / template editor / sign / Tools loading | the quote editor's ghost, "Loading leads", none for /sign | own ghosts |
| 23 | drift | disabled rows' reasons | native title only; "creator or Owner"; Send together grey without why; disabled kebab press closes | Tooltip / meta; ignore presses |
| 24 | copy | delete-dialog No / Yes vs Cancel / Delete | two confirms | ConfirmDialog |
| 25 | copy | phone messages ×3 · Edit recipient | three wordings; unreachable name message; greyed Save with no message | MSG + errors after press |
| 26 | copy | bundle page · banner | "1 documents"; "since 2d ago" | plural; "sent 2d ago" |
| 27 | copy | import-contract-dialog | "lead's" straight apostrophe | ’ |
| 28 | copy | template picker · signing record | "Edited 17 Sep 26", "3:04 pm" | displayDate / displayDateTime |
| 29 | drift | doc-editor / picker / paper / sign CSS | #EEE5FF, px fonts, 2px radius | tokens |
| 30 | drift | editors' Maison AI | the button can't close its own sheet (no anchorRef) | anchorRef |

Backlog: **U-01 partly**; **U-07 confirmed** (no archived view; an archived contract opens from Activity with no state); **U-08 confirmed**; **U-09 confirmed** (kebab and Status inline in the scrolling card).

## What the round did (REG-660, 2026-09-25)

Fixed: #1–#23, #25–#30 (their parts below excepted), U-07 (Archived Contracts), U-08 (Deleted Contracts' selection), U-09 (both menus through the portal); #13 came with S1's Deleted-sheet stylesheet. Probe `design-source/verify/ui-sweep/verify-sw-r2.cjs` 26/26, shots `s2-*`.

Left, and why:
- **#24** the lists' delete dialog keeps the Tasks mock's *No · Yes* (902:27738), as the quotes list does; the editor's own confirm is the house ConfirmDialog.
- **#29 (part)** the highlight colour stays a literal in the document's HTML — it is saved with the document and printed, where a CSS variable does not travel; the paper's heading and signature sizes are the document's print type, not the app's UI type.
- **#20 (the mock's word)** the empty state's *From Scratch* (931:38651) became *From the studio agreement* — the button makes the full agreement, so the mock's word said the wrong thing; logged as invented copy.
