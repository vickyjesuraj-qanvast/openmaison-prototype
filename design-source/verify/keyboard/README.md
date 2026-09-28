# Keyboard shortcuts and the credit ring — probes and shots (REG-710 · REG-711…717, 2026-09-28)

Run against a production build on :3011 on a scratch copy of the base state (`fixtures/baseline.json` restored and repaired — R64 writes the
bell's keyboard note):

```bash
npx next build && DATABASE_URL=file:<scratch>/test.db npx next start -p 3011     # in the background
OUT=<scratch>/shots NODE_PATH=$PWD/node_modules node design-source/verify/keyboard/verify-kb-r1.cjs
OUT=<scratch>/shots DB=<scratch>/test.db NODE_PATH=$PWD/node_modules node design-source/verify/keyboard/verify-kb-r2.cjs
```

- **verify-kb-r1** (35): the ring on the rail (the rail icons' 24 box, REG-718), ? opens the panel beside the page and the page makes room, the
  page's controls wear their keys, J · X · ⌫ (asks) · Esc on the Leads listing, ↵ opens a lead, 2 / 1 its tabs, J the next lead of the
  list, E · A · M, Esc back, G then T with the hint, the search's Go to row and footer, C, the Filters tooltip, the "/" chip, the third
  mouse press's tip, ⌘/ and the single-key switch.
- **verify-kb-r2** (29): Files end to end from the keyboard (J · X · ⌫ · ⌘↵ · ⌘Z restores), the Tasks panel on ↵, Add Task on C, a
  quote from its tab, the quote editor (the panel lists the Items table's keys, ⌘S "Saved", ⌘F Find, ⌘K, P Preview, G then L), the
  contract editor's P, a Company gallery (J, ↵, P previews the template), the credit ring's low state, the bell's note and Maison AI's
  door, no keys on a phone, Ctrl on Windows.

Shots: `kb1-01-rail-ring` (the ring, healthy) · `kb1-02-panel-lit` · `kb1-03-cursor-x` · `kb1-04-lead-m` · `kb1-05-g-hint` ·
`kb1-06-tooltip-slash` · `kb1-07-tip` · `kb2-01-editor-panel` · `kb2-02-ring-low` · `kb2-03-bell-note` · `kb2-04-phone`.

The ring at 2× beside the rail's icons (REG-718): `ring-collapsed-2x` · `ring-wide-2x` · `ring-card-2x` (the credits card's 40).
