# Consistency — one head and one foot for every overlay (REG-725) and the design checks (REG-726)

The owner, 2026-09-29: *"there are modals with bottom border and there are without … fix all of this once for all and I don't want
this to happen in the future."* The audit and the rounds: `design-source/context/consistency/01-consistency-audit-2026-09-29.md`.

| Check | What it proves |
| --- | --- |
| `npm run design:lint` (`scripts/design-lint.mjs`) | Nothing new breaks a house rule — the ratchet in `design-lint.baseline.json` only goes down. |
| `npm run design:anatomy` (`scripts/design-anatomy.mjs`) | 36 pages: every table head against the leads listing's, every dialog opened by C / F against the house head and foot (1440 and 390). 404 measures on 2026-09-29. |
| `verify-overlays.cjs` | The overlays C / F can't reach — the Deleted sheets, Import, Move stage, the listing's popovers, Use Template, Move to folder, the task drawer, the file viewer's panels, the confirms, the phone sheets — each head and foot measured and photographed. 67 checks on 2026-09-29. |

Run against a production build on :3011 on a scratch database (`DATABASE_URL=file:<scratch>/test.db` on the `next start` line).
Pictures: `o01…o16` at 1440 (the lead form, Filters, Deleted Leads, Import, Assign, Move stage, Use Template, the task drawer, Delete
Task, Deleted Files, Move to folder, the file viewer's Information and Comments, Create Quote, Deleted templates, Manage billing, the
Cancel confirm) and `p01…p03` at 390 (the Add Task sheet, Manage billing as a sheet, the Cancel confirm as a card).
