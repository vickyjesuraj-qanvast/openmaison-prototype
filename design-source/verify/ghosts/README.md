# Ghosts — one per page (REG-708)

The owner, 2026-09-28: *"the ghost loading is different from the page content and the loader. Please fix this across the pages."*
Every page's `loading.tsx` and its `PageReveal` now draw the same ghost of the page's own layout, and each loader wraps its own page
only (parent pages live in route groups). The rules are in `design-source/context/page-checklist.md` › Load & refresh.

Run each probe against a production build on :3011 on a scratch database (`DATABASE_URL=file:<scratch>` on the `next start` line).

| Probe | What it proves |
| --- | --- |
| `verify-ghosts-same.cjs [w] [h] [touch] [filter]` | For 50 routes, the loader (streamed HTML, scripts removed) and the held reveal are the same picture, pixel for pixel under reduced motion (the frame's bottom 40px and the floating buttons' corner left out — the shell's, placed by script). **2026-09-28: every route passes at 1440 and at 390 touch.** The quote template editor has no reveal; its loader is its only ghost. |
| `verify-ghosts-strips.cjs [filter] [w] [h] [touch]` | Loader · reveal · page · the ghost over the page, one strip per route, and the overlay alone. |
| `verify-ghosts-film.cjs <keys> [w] [h] [touch]` | A screencast of full loads and in-app hops: one ghost, then the page. |
| `verify-ghosts-measure.cjs <path> <w> <ghostSel> <pageSel>` | The ghost's boxes against the page's — the few-pixel drifts. |

Pictures banked here: `strip-*.png` (loader · reveal · page · overlay), `film-*.png` (full loads and hops), `spark-turn.png` (REG-706) and
`profile-*.png` (REG-707).
