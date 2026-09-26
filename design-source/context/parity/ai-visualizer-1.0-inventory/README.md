# AI Visualizer — the 1.0 inventory (2026-09-25)

Five readers went through 1.0's AI Visualizer (`qanvast-id-tool`, read only) and wrote down every touchpoint with its file and line. The audit that uses them is `../16-ai-visualizer-1.0-to-2.0-audit-2026-09-25.md`; the devs' map is `../17-ai-visualizer-migration-map-2026-09-25.md`.

| File | Covers | Rows |
|---|---|---|
| `A-ways-in-and-around.md` | Tools, the lead drawer, the project, deep links, the landing (designs), the share page, the homeowner portal, the page flag and who may | 129 |
| `B-editor-model-and-modes.md` | The editor's model (rooms, detection, the picks), Surfaces & Materials, Furniture, Style, Lighting, the drawers, the footer and its one button | 131 |
| `C-render-flow-results-tools.md` | Generate end to end, the progress, variants, the gallery strip, compare, the full-screen view, share, pins, the tools | 120 |
| `D-phone-engine-routes.md` | Below lg (the dock, the trays), the render routes and prompts, storage, errors | 131 |
| `E-data-model.md` | Every table, column, JSON shape, status and tenant lock; a first port table (§21) | 223 |

Reading rule: a row names what 1.0 does and where (`file:line`); the audit decides what 2.0 does with it. Nothing here was run — the 1.0 repo is read only.
