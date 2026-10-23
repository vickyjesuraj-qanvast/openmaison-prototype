// id → { file (under design-source/verify), env, args, db (a prepared base in R), prep (sql file run on the copy) }
const P = {}
const add = (id, file, o = {}) => { P[id] = { file, ...o } }
add('fixes720', 'ai-credits/owner-fixes-2026-09-28/verify-fixes-720.cjs')
for (const r of [1, 3, 4, 5]) add(`cr-r${r}`, `ai-credits/verify-cr-r${r}.cjs`)
add('rooms-menu', 'ai-visualizer/rooms-menu/verify-rooms-menu.cjs', { env: { DESIGN: 'b46000d1-1638-4c7c-af20-bebbcc3b9744' } })
for (const n of ['client', 'sheets', 'studio']) add(`viz-${n}`, `ai-visualizer/verify-viz-${n}.cjs`)
add('overlays', 'consistency/verify-overlays.cjs')
for (const r of [1, 2, 3, 4]) add(`ct-r${r}`, `contracts-parity/verify-ct-r${r}.cjs`)
for (const n of ['files', 'galleries', 'pickers']) add(`folders-${n}`, `folders/verify-folders-${n}.cjs`)
add('ghosts-same', 'ghosts/verify-ghosts-same.cjs')
add('ghosts-same-390', 'ghosts/verify-ghosts-same.cjs', { args: ['390', '844', 'touch'] })
add('ghosts-strips', 'ghosts/verify-ghosts-strips.cjs')
add('ghosts-film', 'ghosts/verify-ghosts-film.cjs')
add('ghosts-measure', 'ghosts/verify-ghosts-measure.cjs', { args: ['/company/members', '1440', '[aria-label="Loading members"] li', '[data-testid="member-row"]', '7'] })
add('search', 'global-search/verify-search.cjs')
add('insights-head', 'insights-head-2026-09-28/verify-insights-head.cjs')
add('kb-r1', 'keyboard/verify-kb-r1.cjs'); add('kb-r2', 'keyboard/verify-kb-r2.cjs')
add('pb-modal', 'price-book-modal/verify-pb-modal.cjs')
for (const r of [1, 2, 3, 4]) add(`pb-r${r}`, `price-book-parity/verify-pb-r${r}.cjs`)
for (const r of [1, 2, 3, 4, 5]) add(`qe-r${r}`, `quote-editor-parity/verify-qe-r${r}.cjs`)
add('tpl-parity', 'quote-templates-parity/verify-tpl-parity.cjs')
for (const r of [1, 2, 3]) add(`st-r${r}`, `settings-parity/verify-st-r${r}.cjs`)
add('folder-crumbs', 'thumbs-2026-09-30/verify-folder-crumbs.cjs', { args: ['$L/shots'] })
add('thumbs-rest', 'thumbs-2026-09-30/verify-thumbs-rest.cjs', { args: ['$L/shots'] })
add('dane-int', 'uat-dane-2026-10-01/INT/verify-int.cjs')
for (const p of ['P1', 'P2a', 'P2b', 'P3', 'P4', 'P5a', 'P5b', 'P6']) add(`dane-${p.toLowerCase()}`, `uat-dane-2026-10-01/${p}/verify-${p.toLowerCase()}.cjs`)
for (const r of [1, 2, 3, 4, 5]) add(`sw-r${r}`, `ui-sweep/verify-sw-r${r}.cjs`)
add('ux-p1', 'ux-build-2026-09-30/P1/verify-p1.cjs', { args: ['$DB', '$L/shots'], prep: 'seed-ux-p1.sql' })
add('ux-p2', 'ux-build-2026-09-30/P2/verify-p2.cjs', { args: ['$L/shots', '$BASE'] })
add('ux-p3', 'ux-build-2026-09-30/P3/verify-p3.cjs', { args: ['$L/shots'] })
for (const n of [4, 5, 6, 7]) add(`ux-p${n}`, `ux-build-2026-09-30/P${n}/verify-p${n}.cjs`)
add('first-run-ghosts', 'ux-build-2026-09-30/ghosts/verify-first-run-ghosts.cjs', { db: 'empty.db', env: { LEAD: '6418e858-13e3-416f-b7c1-2481d1e0ca6f' } })
add('first-run-empty', 'first-run-2026-09-30/verify-first-run.cjs', { db: 'empty.db', args: ['$L/shots', 'empty', '6418e858-13e3-416f-b7c1-2481d1e0ca6f'] })   // the lead whose files empty.sql clears
add('first-run-noleads', 'first-run-2026-09-30/verify-first-run.cjs', { db: 'noleads.db', args: ['$L/shots', 'noleads'] })
add('first-run-full', 'first-run-2026-09-30/verify-first-run.cjs', { args: ['$L/shots', 'full', 'bb054aa5-7284-492e-b232-607bd4cfb0f6'] })   // full mode wants a lead with quotes (Vivien Lee)
add('panel-order', 'view-as/verify-panel-order.cjs')
add('view-as', 'view-as/verify-view-as.cjs')
for (const r of [1, 2, 3, 4]) add(`xr-r${r}`, `x-ray-parity/verify-xr-r${r}.cjs`)
// Quotes on the move (2026-10-22): the five package probes and the pending-modules / projects probes the build touched — the pm2 shape
// (args <scratch.db> [shotDir] [base], env BASE), run on a copy of base.db like every other.
for (const k of [1, 2, 3, 4, 5]) add(`rq-k${k}`, `responsive-quotes/verify-rq-k${k}.cjs`, { args: ['$DB', '$L/shots', '$BASE'] })
for (const s of ['s02', 's04', 's10', 's43e', 's44f', 's44i', 's44o', 's44q', 's44t', 's46a', 's46b', 's46c']) add(`pm2-${s}`, `pending-modules/verify-pm2-${s}.cjs`, { args: ['$DB', '$L/shots', '$BASE'] })
add('pj-gap-d', 'projects/verify-pj-gap-d.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
// Contracts on the move (2026-10-22, late): the four package probes (the rc-k5 shape) + the probes the build touched.
for (const c of [1, 2, 3, 4]) add(`rc-c${c}`, `responsive-contracts/verify-rc-c${c}.cjs`, { args: ['$DB', '$L/shots', '$BASE'] })
for (const s of ['s03', 's11', 's29', 's42b', 's44g', 's44r', 's46d']) add(`pm2-${s}`, `pending-modules/verify-pm2-${s}.cjs`, { args: ['$DB', '$L/shots', '$BASE'] })
add('pm-f', 'parity-map-build/verify-pm-f.cjs', { args: ['$DB', '$L/shots', '$BASE'] })
add('pm2-s05', 'pending-modules/verify-pm2-s05.cjs', { args: ['$DB', '$L/shots', '$BASE'] })   // Leads (S05) — the stage rule REG-2655 touches
add('rl-fixes', 'responsive-leads/verify-rl-fixes.cjs', { args: ['$DB', '$L/shots', '$BASE'] })   // Leads on the move: the two blockers fixed ahead of the proposal
for (const r of [1, 5, 6]) add(`pj-r${r}`, `projects/verify-pj-r${r}.cjs`, { args: ['$DB', '$L/shots'] })   // the project Overview / Money that C4's Documents card and To collect line touch
add('pj-gap-f2', 'projects/verify-pj-gap-f2.cjs', { args: ['$DB', '$L/shots'] })
module.exports = P
