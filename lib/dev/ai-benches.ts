/*
 * (pending modules S41 — card studio:ai-sandboxes, his "build all of them" 2026-10-11 and "nothing left behind from 1.0 to 2.0" 2026-10-12)
 * 1.0's SEVEN AI SANDBOXES, EACH ACCOUNTED FOR. They were developers' test benches linked from no menu, each calling itself throwaway
 * (src/app/(main)/tools/*-sandbox): what each tried, where 2.0 already does that job (a studio's own page), the harness that checks it in Node,
 * the seam a model would plug into (lib/services/registry.ts), and what was left behind with its reason. The four experiments that only ever
 * lived there (Outpaint · Reangle · Orbit video · Depth) are built by rule on the developers' bench (/dev/ai-bench, `BENCH_VIEWS`). Pure data,
 * client-safe; the bench's map draws it and the probe checks every link and every seam it names. (invented copy — a developers' page, no mock)
 */

export type BenchView = 'map' | 'depth' | 'look' | 'clip' | 'extend' | 'corners' | 'seams'
export const BENCH_VIEWS: { key: BenchView; label: string }[] = [
  { key: 'map', label: '1.0’s seven' },
  { key: 'depth', label: 'Depth' },
  { key: 'look', label: 'Look around' },
  { key: 'clip', label: 'Orbit clip' },
  { key: 'extend', label: 'Extend' },
  { key: 'corners', label: 'Plan corners' },
  { key: 'seams', label: 'Seams' },
]
export const isBenchView = (v: string | null | undefined): v is BenchView => BENCH_VIEWS.some((x) => x.key === v)

export const BENCH_PATH = '/dev/ai-bench'
export const BENCH_WORDS = {
  title: 'AI benches',
  intro: 'For developers. 1.0’s seven AI sandboxes, each mapped to where 2.0 does its job, and the four experiments that only lived there, built by rule — no model is called. No studio menu links this page; a production build shows it only with OPENMAISON_DEV_PREVIEWS=1.',
} as const

/** Each view's title and help — the page and its ghost read the same words (S17's rule). */
export const VIEW_COPY = {
  experiments: { title: 'The four experiments that only lived in the sandboxes', help: '1.0’s Visualizer v2 sandbox tried them with image and video models. Each is built here by rule, with what only a model could do written beside it.' },
  seven: { title: '1.0’s seven sandboxes', help: 'Developers’ test benches, linked from no menu in 1.0, each calling itself throwaway. Where 2.0 already does each one’s job:' },
  depth: { title: 'Depth', help: 'Each pixel’s distance from the camera, read from the room’s own shape — the floor and the ceiling from where the camera stands, a wall where it meets the floor, a piece where its foot does. No model paints it. Near is white, far is black, as 1.0’s map was.' },
  look: { title: 'Look around', help: 'The photo as a room you can step into: its own pixels lifted to their depth and seen from a moved camera (1.0’s Drag mesh). Only the camera moves — what the photo never saw is stretched from its edge, or cut away with Trim edges.' },
  moves: { title: 'Camera moves', help: '1.0’s six moves (its Angles) — orbit 15° each way about the room’s middle, a step in and back of a metre, the camera raised and lowered — drawn from the same room, free, each set against the photo.' },
  clip: { title: 'Orbit clip', help: 'A short video recorded in this browser from 2.0’s own 3D views — the photo’s room swinging gently side to side, or a 3D layout on a turntable. Nothing is invented: only a model draws the far side of a photographed room.' },
  extend: { title: 'Extend', help: 'More room around the photo (1.0’s Extend room), filled by rule. Nothing new is painted — the margin repeats or softens what the photo already shows; painting more of the room is a model’s.' },
  corners: { title: 'Plan corners', help: '1.0’s corner editor from its floor-plan bench. Put the four handles on the sheet’s corners — drag them, or Tab to one and use the arrow keys (Shift for bigger steps) — and Square it takes the slant out exactly. Make a 3D picture takes out a turn only; this is proposed for it.' },
  seams: { title: 'Where a model plugs in', help: 'No model is called on this page. Each seam below answers by rule today; a model takes the same input and answers the same output, through the one call named. The full list is the developers’ map, services.md.' },
} as const

export type Home = { label: string; href: string; what: string }
export type V1Bench = {
  key: string
  /** 1.0's page title and address */ name: string; path: string
  /** what it said about itself (its own subtitle) */ said: string
  tried: string[]
  homes: Home[]
  /** on this bench — a short label for its door, and what it shows */ here?: { view: BenchView; label: string; line?: string }[]
  harness: string[]
  seams: string[]
  kept: string[]
}

export const V1_BENCHES: V1Bench[] = [
  {
    key: 'auto-furnish', name: 'Auto Furnish Sandbox', path: '/tools/auto-furnish-sandbox',
    said: 'Upload an empty room, say what it is and pick a style — the AI furnishes it. Benchmarks several models on the identical prompt.',
    tried: ['The room type and its furniture program (what it will place, what it never touches)', 'How much furniture', 'The 25 styles', 'The studio’s own products pinned into the render', 'Leave out · Extra direction', 'A scan of the room first (is it empty, what type, its openings)', 'Every render checked for placement and drift, with a repair pass', 'Four image models side by side, with time and cost'],
    homes: [
      { label: 'AI Visualizer › Furniture › Furnish the room', href: '/visualizer', what: 'The same program, density, Leave out and direction, in the room’s style, by rule; the drift guard checks the framing and keeps one corrective pass only if it reads better (S20).' },
      { label: '3D Space Planner › Start with furniture placed · Arrange', href: '/planner', what: 'A layout furnished by the planner’s rule, room by room.' },
    ],
    harness: ['npx tsx scripts/viz/render-test.mts <outDir>', 'npx tsx scripts/viz/drift-test.mts <outDir>'],
    seams: ['image-model'],
    kept: ['The four-model bake-off and its cost table — no model is called, so there is nothing to compare; the seam says what one would answer.', 'Pinning the studio’s own products into the picture — only a model draws a product into a photo (the image-model seam names the picks it would take; Replace already says it can’t draw a new piece in).', 'The “is it empty?” scan — Furnish works on any room, and Empty the room is its own step.'],
  },
  {
    key: 'detect', name: 'Detector Sandbox', path: '/tools/detect-sandbox',
    said: 'Throwaway tool — runs all 5 models on the same room so you can compare. Surfaces = hollow ring dots, furniture = filled dots coloured by type.',
    tried: ['The surface and furniture detector on four models', 'A centre point or a bounding box per item', 'Surfaces as rings, furniture as dots coloured by type, a legend with ×n', 'The raw answer, its time and cost'],
    homes: [{ label: 'AI Visualizer › Surfaces and Furniture', href: '/visualizer', what: 'The three sample rooms’ curated readings (traced outlines, every piece); any other photo read as Walls · Floor · Ceiling by rule; Add a surface or Draw it for the rest.' }],
    here: [{ view: 'depth', label: 'Depth › What it read', line: 'The reading drawn over its photo — every surface and piece, with its distance.' }],
    harness: ['npx tsx scripts/viz/regions.mts <outDir> [room-key]', 'npx tsx scripts/viz/fallback-test.mts <outDir>'],
    seams: ['room-reading'],
    kept: ['The model comparison — the reading is curated or by rule; a model plugs in at the room-reading seam.'],
  },
  {
    key: 'floorplan-3d', name: 'Floor Plan → 3D Sandbox (the calibration bench)', path: '/tools/floorplan-3d-sandbox',
    said: 'Upload a floor plan photo → it’s straightened and cleaned instantly with zero AI (deterministic deskew) → candidate models compete on the 3D render, scored for fidelity against the plan.',
    tried: ['Finding the sheet of paper and taking out its perspective', 'The deskew, quarter turns and Back to auto', 'Dragging the sheet’s four corners by hand', 'A soft scan or line art as the input', 'An AI redraw of the scan', 'The room inventory, editable, added to the prompt', 'Vectorize and extrude the rooms (a 3D scaffold)', 'A style reference', 'Isometric dollhouse or photoreal top-down prompts', 'A fidelity score against the plan, Improve the prompt from its misses, the prompt’s history'],
    homes: [{ label: 'Tools › Floorplan to 3D Isometric', href: '/floorplan-3d', what: '1.0’s tool itself (REG-2800): the photo straightened by 1.0’s own deskew, its rooms, Dollhouse or Top-down drawn by the image model at the floorplan-3d seam — on the prototype, three sample plans whose views were made ahead.' },
      { label: '3D Space Planner › Make a 3D picture', href: '/planner?view=iso&photo=1', what: 'The photo straightened by 1.0’s own deskew (the sheet found by rule), Turn a quarter, the rooms by rule and editable, its size, Place the rooms, then Dollhouse or Top-down drawn from the planner — the scaffold is built natively, so the picture matches the plan by construction (S28).' }],
    here: [{ view: 'corners', label: 'Plan corners', line: '1.0’s corner editor: drag the sheet’s four corners and the slant comes out.' }],
    harness: ['npx tsx scripts/planner/straighten-test.mts <outDir>', 'npx tsx scripts/viz/spatial-test.mts <outDir>'],
    seams: ['floorplan-3d', 'floor-plan-rooms'],
    kept: ['The AI redraw, the style reference and the prompt gym — a model’s (1.0’s two locked prompts are named at the floorplan-3d seam); the fidelity score’s job is Make a 3D picture’s guide (every room placed).', 'The soft scan — there is no model to feed it to.'],
  },
  {
    key: 'quote-template', name: 'Quote Template Sandbox (Owners only)', path: '/tools/quote-template-sandbox',
    said: 'Quote Designer sandbox — validates Playwright, Paged.js, BlockNote in this environment. Not for production use.',
    tried: ['The BlockNote editor under React 19', 'A PDF drawn by Playwright from HTML', 'A three-pane template editor with knobs and what a quote may override', 'Paged.js for page counters (deferred)'],
    homes: [
      { label: 'Company › Templates › Quotes', href: '/company/templates/quotes', what: 'The quote template editor — Page · Brand · New quotes, the inspector, publish and versions (REG-485…).' },
      { label: 'A quote’s Preview and Download PDF', href: '/quotes', what: 'The renderer paginates live (no Paged.js); every Download PDF goes through printPaper() and, with a renderer plugged in, /papers/pdf (S34’s pdf seam).' },
    ],
    harness: ['node design-source/verify/quote-templates-parity/verify-tpl-parity.cjs'],
    seams: ['pdf'],
    kept: ['BlockNote and Paged.js themselves — 2.0 has its own rich editor and paginating renderer.', 'Its Owner-only gate — the editor’s own rules apply (Owners and Admins publish, Designers submit, REG-501).'],
  },
  {
    key: 'relight', name: 'Relighting Sandbox', path: '/tools/relight-sandbox',
    said: 'Sliders update the live preview instantly and use ZERO credits. Only “Relight” generates a real render.',
    tried: ['Ten presets that seed sun angle, colour temperature and intensity', 'Fixtures that cycle unset → on → off', 'An extra instruction', 'A free live preview, a per-result adjust and Save as a PNG'],
    homes: [{ label: 'AI Visualizer › Lighting', href: '/visualizer', what: '1.0’s production presets (Daylight, Golden Hour, Warm Cozy Home, Blue Hour, Overcast, Directional Spotlight), the same knobs and fixtures, a free live preview, the relight by rule.' }],
    harness: ['npx tsx scripts/viz/render-test.mts <outDir>'],
    seams: ['image-model'],
    kept: ['The sandbox’s four older presets (Cool White Office, Sunset, Ambient Evening, Midnight) — 1.0’s own production list replaced them.'],
  },
  {
    key: 'style-transfer', name: 'Style Transfer Sandbox', path: '/tools/style-transfer-sandbox',
    said: 'Upload a room, attach reference images, read the style into an editable brief, then render. Only “Generate” spends credits.',
    tried: ['Up to three references, each tagged with what it is for', 'Read the style into an editable brief (palette with roles, materials, finishes, furniture language, lighting, decor, avoid)', 'Read the room (openings, circulation, what is fixed)', 'What transfers, how far, the room’s shape, keep unchanged', 'A/B the brief, four models, a payload warning'],
    homes: [{ label: 'AI Visualizer › Style › Style transfer', href: '/visualizer', what: 'References with roles, How far, What carries over, The room’s shape, Keep unchanged; each reference’s palette read by role, by rule (VT-04).' }],
    harness: ['npx tsx scripts/viz/render-test.mts <outDir>'],
    seams: ['image-model'],
    kept: ['The editable brief and the room survey — a model’s readings; 2.0 reads each reference’s palette by rule (VT-04).', 'The A/B and the bake-off — no model to compare.'],
  },
  {
    key: 'visualizer-v2', name: 'AI Visualizer — Sandbox (v2)', path: '/tools/visualizer-sandbox',
    said: 'Canvas-first: tap the room, panels open only when you need them. Wired to the real detect + render APIs; isolated from the live visualizer.',
    tried: ['A canvas-first editor: style first, surfaces grouped, materials with Suggested, a custom swatch, lock a surface', 'Lighting presets with fine-tune', 'Furniture grouped ×n — remove, replace, customize, a reference photo', 'Empty the room (keep built-ins or strip to the shell), Render from sketch, Continue on this', 'The Spatial View experiment: Orbit video · Drag mesh · Angles, Extend room, Depth'],
    homes: [{ label: 'AI Visualizer', href: '/visualizer', what: 'The canvas-first editor with every one of these (REG-671…698) — the sandbox was its rehearsal.' }],
    here: [
      { view: 'depth', label: 'Depth' }, { view: 'look', label: 'Look around', line: 'Its Drag mesh, and its six Angles as camera moves.' },
      { view: 'clip', label: 'Orbit clip' }, { view: 'extend', label: 'Extend', line: 'Its Extend room.' },
    ],
    harness: ['npx tsx scripts/viz/spatial-test.mts <outDir>'],
    seams: ['image-model', 'depth', 'reangle', 'outpaint', 'orbit-video'],
    kept: ['Its model picker (Gemini 3 Pro · 3.1 Flash · 2.5 Flash · FLUX.2 Pro) and its cost line — no model is called.'],
  },
]

/** The four experiments that only lived in the sandboxes (the card's pending line), each built by rule on this bench. */
export type Experiment = { key: string; name: string; v1: string; built: string; limit: string; view: BenchView; seam: string }
export const EXPERIMENTS: Experiment[] = [
  { key: 'outpaint', name: 'Outpaint', v1: '“Extend room” — the photo padded onto a bigger canvas and an image model asked to paint more of the same room into the margin.', built: 'The margin filled by rule — the photo’s edges mirrored and fading into a soft blur, or 1.0’s padded canvas itself; Look around can stand on it.', limit: 'Nothing new is painted: the margin repeats or softens what the photo shows.', view: 'extend', seam: 'outpaint' },
  { key: 'reangle', name: 'Reangle', v1: '“Angles” — an image model asked to redraw the room from six camera moves (or one 3 × 2 montage), with a slider to judge the drift.', built: 'The six moves drawn from the photo’s own pixels lifted to their depth, each with Compare with the photo.', limit: 'What the photo never saw is stretched from its edge (or cut away with Trim edges).', view: 'look', seam: 'reangle' },
  { key: 'orbit-video', name: 'Orbit video', v1: 'A video model (fal.ai, Kling) asked for a cinematic orbit clip — or six re-angled frames played back and forth.', built: 'A real clip recorded in the browser: the photo’s room turning gently side to side, or a 3D layout on a turntable.', limit: 'The photo’s clip keeps to a small arc; only a model invents the far side of the room.', view: 'clip', seam: 'orbit-video' },
  { key: 'depth', name: 'Depth', v1: 'An image model asked to paint a grey depth map (near white) for the drag-to-look viewer.', built: 'The depth read from the room’s own shape — the floor and ceiling planes, walls where they meet the floor, pieces where their foot does — with the reading behind it.', limit: 'A photo nobody traced takes the default camera, and says so.', view: 'depth', seam: 'depth' },
]

/** The seams this bench names (lib/services/registry.ts) — the Seams view lists them, the probe checks each exists. */
export const BENCH_SEAMS = ['depth', 'reangle', 'outpaint', 'orbit-video', 'room-reading', 'image-model', 'floorplan-3d', 'floor-plan-rooms', 'pdf'] as const
