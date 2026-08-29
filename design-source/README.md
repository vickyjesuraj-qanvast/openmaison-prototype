# Design source — captured from Figma

> Start with **`DESIGN.md`** — the consolidated design context (mock index, DS specs, interaction rules, copy). This README describes only the raw Figma captures below.

Extracted from Figma file `JCGkMBFLjeOyXYiEkOxFMO`, page **Leads - New** (`513:28349`)
on 2026-08-26. Committed because the Figma MCP quota on the current seat is
**6 tool calls per month**, so this data cannot casually be re-fetched.

| File | What it is |
|---|---|
| `leads-new.metadata.xml` | Full node tree: 14,859 nodes with id, name, type, x, y, width, height |
| `nodes.json` | The same tree parsed, with depth |
| `inventory.json` | Per top-level screen: text content and component instances used |
| `shots/s04.png` | #04 Leads listing, table view |
| `shots/s170.png` | #170 Lead detail, Overview tab |
| `shots/s79.png` | #79 Lead detail, Notes tab |
| `shots/s114.png` | #114 Lead detail, Activity tab |

## What this data does and does not contain

**Contains** — exact geometry (position and size) for every node, layer names,
component instance names, and all text content.

**Does NOT contain** — colours, typography, fills, strokes, corner radii, effects,
auto-layout values, or variable bindings. Those come from `get_design_context`,
which the current seat cannot call.

Do not treat absence of a value here as evidence it isn't in the design.
