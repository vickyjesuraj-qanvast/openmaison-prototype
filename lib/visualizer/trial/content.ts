import { DESIGN_STYLES } from '@/lib/visualizer/styles'
import { RELIGHT_PRESETS } from '@/lib/visualizer/lighting'
import { SAMPLE_ROOMS } from '@/lib/visualizer/samples'
import { WELCOME_AFTER } from '@/lib/visualizer/welcome-after'
import { TRIAL_LIMIT, trialHref, type TrialTool } from './policy'

/*
 * (pending modules S36 — 1.0's src/components/trial-visualizer/{trial-types,trial-tool-content,trial-start,trial-results,trial-signup-gate}.tsx,
 * src/app/try-visualizer/**\/page.tsx) The trial's words: each way in's title and line, the six landing pages' search copy and sections (how it
 * works · key features · questions), the tool cards' before / after, the gate. 1.0's words, in 2.0's names; where 1.0 promised what this trial
 * doesn't do (Replace a piece, any sketch, fifteen seconds, "unlimited"), the promise is cut or the fact corrected — each change is listed in
 * steps/outcome-S36.md › Every changed sentence. Pure and client-safe.
 */

/** 1.0's TOOL_INFO: the way in's title and its one line. */
export const TOOL_INFO: Record<TrialTool, { title: string; subtitle: string; icon: string }> = {
  style: { title: 'Style', subtitle: 'Restyle the whole room in one pass — walls, floors, furniture, décor, together.', icon: 'style' },
  materials: { title: 'Materials', subtitle: 'Tap any surface and swap the finish — floors, walls, countertops, one at a time.', icon: 'format_paint' },
  lighting: { title: 'Lighting', subtitle: 'Daylight to cozy evening — shift the mood without moving a thing.', icon: 'lightbulb' },
  furniture: { title: 'Furniture', subtitle: 'Remove or recolour individual pieces — sofa, bed, cabinets, anything.', icon: 'weekend' },
  defurnish: { title: 'Defurnish', subtitle: 'Clear it to a blank canvas — walls, floor, camera angle stay exactly put.', icon: 'handyman' },
  sketch: { title: 'Sketch to Render', subtitle: 'Render a hand sketch into a lifelike photo, styled the way you like.', icon: 'draw' },
}

/** Each page's search title and description (1.0's metadata; the site's "{page} | OpenMaison" template adds the name). */
export const TRIAL_SEO: Record<'home' | TrialTool, { title: string; description: string }> = {
  home: { title: 'Try the AI Visualizer', description: `Upload a room photo and try the full AI Visualizer — materials, furniture, lighting — free for ${TRIAL_LIMIT} renders.` },
  style: { title: 'Style AI — Restyle Any Room', description: 'Upload a room photo and restyle the whole room in one pass — walls, floors, furniture, décor, together. Free to try.' },
  materials: { title: 'Materials AI — Change Room Finishes', description: 'Upload a room photo, tap any surface, and swap the finish — floors, walls, countertops, one at a time. Free to try.' },
  lighting: { title: 'Lighting AI — Relight Any Room', description: 'Upload a room photo and shift the mood — daylight to cozy evening — without moving a thing. Free to try.' },
  furniture: { title: 'Furniture AI — Change Furniture in Any Room', description: 'Remove or recolour individual pieces of furniture — sofa, bed, cabinets, anything. Free to try.' },
  defurnish: { title: 'Defurnish AI — Empty Any Room', description: 'Clear a room to a blank canvas — walls, floor, and camera angle stay exactly put. Free to try.' },
  sketch: { title: 'Sketch to Render', description: 'Render a hand sketch into a lifelike photo, styled the way you like. Free to try.' },
}

/* ── the start ── */
export const START = {
  eyebrow: 'Free · no sign-up',
  title: 'See your room, redesigned, in seconds.',
  lede: 'The same AI Visualizer our design studios use, open to try. Upload a photo, tap what you want changed, generate.',
  upload: 'Upload a room photo',
  uploadSketch: 'Upload a sketch',
  camera: 'Take a photo',
  samples: 'No photo handy? Start with a sample room',
  sketchSample: 'No sketch handy? Try ours',
  fine: 'JPG, PNG, WebP or HEIC · your photo stays in your browser — it is never uploaded or stored.',
  tools: 'Or start with one tool',
  toolsAside: 'Every tool works on the same photo once you’re in',
} as const

const look = (key: string, style: string) => SAMPLE_ROOMS.find((s) => s.key === key)?.looks[style] ?? ''
const room = (key: string) => SAMPLE_ROOMS.find((s) => s.key === key)!
/** 1.0's TOOL_CARDS — each a live before → after of what that tool does (never a restyle borrowed for another tool). Materials' and
    Furniture's afters are the living room painted by the engine for them (scripts/viz/trial-cards.mts); the rest are the sample rooms' own. */
export const TRIAL_CARDS: Record<TrialTool, { before: string; after: string; beforeLabel: string; afterLabel: string; sample: string; sketch?: boolean }> = {
  style: { before: room('living-room').original, after: look('living-room', 'Dubai Luxury'), beforeLabel: 'Before', afterLabel: 'After', sample: 'living-room' },
  materials: { before: room('living-room').original, after: '/site/try/materials-after.jpg', beforeLabel: 'Before', afterLabel: 'After', sample: 'living-room' },
  lighting: { before: room('bedroom').original, after: room('bedroom').relit?.['golden-hour'] ?? room('bedroom').original, beforeLabel: 'Before', afterLabel: 'After', sample: 'bedroom' },
  furniture: { before: room('living-room').original, after: '/site/try/furniture-after.jpg', beforeLabel: 'Before', afterLabel: 'After', sample: 'living-room' },
  defurnish: { before: room('living-room').original, after: room('living-room').empty ?? room('living-room').original, beforeLabel: 'Before', afterLabel: 'After', sample: 'living-room' },
  sketch: { before: room('kitchen').sketch ?? room('kitchen').original, after: room('kitchen').original, beforeLabel: 'Sketch', afterLabel: 'Render', sample: 'kitchen', sketch: true },
}
/** The root's live before / after: the living room painted by the engine (the AI Visualizer welcome's own, REG-819). */
export const HERO_COMPARE = { before: room(WELCOME_AFTER.sample).original, after: WELCOME_AFTER.image, caption: `Sample · ${room(WELCOME_AFTER.sample).name}: ${WELCOME_AFTER.label} — drag to compare`, sample: WELCOME_AFTER.sample }

/* ── the editor's own lines ── */
export const TRIAL_WORDS = {
  chip: 'Free trial',
  startOver: 'Start over',
  /* 1.0's exit confirm, word for word */
  leaveTitle: 'Leave this room?',
  leaveText: 'Your renders aren’t saved in the free trial. Download the ones you want to keep first.',
  stay: 'Stay', leave: 'Leave',
  /* 1.0's soft sign-up after the first render; "Sign up free" is S31's door, Start your studio; "render as much as you like" was never true of Free */
  soft: `That’s one of your ${TRIAL_LIMIT} free renders. Start your studio free to keep working on this room, download without the watermark, and keep rendering.`,
  start: 'Start your studio',
  bookDemo: 'Book a demo',
  /* 1.0's gate */
  gateTitle: `You’ve used all ${TRIAL_LIMIT} free renders`,
  gateText: 'Start your studio free to keep rendering, save your designs, and unlock the full editing suite.',
  carried: 'Your room photo comes with you.',
  downloaded: 'Downloaded — free renders carry a small watermark',
  notASketch: 'Render from sketch works on the sample sketch here — your picture opens as a photo: pick finishes, a style or a light.',
  openSketch: 'Open the sample sketch',
  loadFailed: 'Couldn’t load that sample — try uploading a photo instead.',
  stampFailed: 'Couldn’t finish this render — please try again.',
} as const

/* ── the six landing pages (1.0's trial-tool-content.ts) ── */
export const ROOM_TYPES = ['Living Room', 'Bedroom', 'Kitchen', 'Dining Room', 'Home Office', 'Bathroom'] as const
export type ToolContent = { headline: string; accent: string; description: string; steps: { title: string; desc: string }[]; features: { title: string; desc: string }[]; faqs: { q: string; a: string }[] }

const SHARED_FEATURES = [
  { title: 'Real AI Rendering', desc: 'Powered by the same AI our design studios use every day — not a stock filter.' },
  { title: 'Free to Start', desc: `${TRIAL_LIMIT} free renders, no sign-up, no credit card. Start your studio free afterward to keep going.` },
  { title: 'A Few Seconds', desc: 'Most renders finish in a few seconds.' },
]
const SHARED_FAQS = [
  { q: 'Is this really free?', a: `Yes — try ${TRIAL_LIMIT} real renders with no sign-up and no credit card. Start your studio free afterward to unlock every tool and keep going.` },
  { q: 'What photos work best?', a: 'A clear, well-lit photo of the room, taken as straight-on as you can. JPG, PNG, WebP or HEIC.' },
  { q: 'Does it work on any room, or just specific types?', a: 'Any room — upload whatever you’ve got. It isn’t limited to a preset list of room types.' },
]
/** "25 Design Styles — Modern, Scandinavian, … and 15 more" — 1.0's ten named, the rest counted (2.0 has every one of 1.0's 25). */
const STYLE_LIST = (() => { const named = DESIGN_STYLES.slice(0, 10).map((s) => s.name); return `${named.join(', ')} and ${DESIGN_STYLES.length - named.length} more.` })()
/** The lighting presets in words, from the presets themselves. */
const PRESET_WORDS = (() => { const n = RELIGHT_PRESETS.map((p, i) => (i === 0 ? p.label : p.label.toLowerCase())); return `${n.slice(0, -1).join(', ')} or ${n[n.length - 1]}` })()

export const TRIAL_TOOL_CONTENT: Record<TrialTool, ToolContent> = {
  style: {
    headline: 'Restyle any room in seconds', accent: 'Restyle',
    description: 'Upload a photo of your room and see it reimagined in a completely different design style — walls, floors, furniture, and décor, all in one pass.',
    steps: [
      { title: 'Upload a room photo', desc: 'Any room, any angle — JPG, PNG, WebP or HEIC.' },
      { title: 'Pick a design style', desc: 'Modern, Scandinavian, Industrial, Japandi, and more.' },
      { title: 'Generate', desc: 'A full restyle in a few seconds.' },
      { title: 'Download or keep editing', desc: 'Save the result, or move on to Materials, Lighting, or Furniture.' },
    ],
    features: [{ title: `${DESIGN_STYLES.length} Design Styles`, desc: STYLE_LIST }, ...SHARED_FEATURES],
    faqs: [{ q: 'Can I try more than one style on the same photo?', a: 'Yes — generate as many styles as you like within your free renders, or start your studio to keep going.' }, ...SHARED_FAQS],
  },
  materials: {
    headline: 'Change any room’s finishes in seconds', accent: 'Change',
    description: 'Upload a room photo, tap a surface, and swap the finish — floors, walls, countertops, cabinets — one at a time or all at once.',
    steps: [
      { title: 'Upload a room photo', desc: 'Surfaces are detected automatically.' },
      { title: 'Tap a surface', desc: 'Or select a whole group, like every wall.' },
      { title: 'Pick a new finish', desc: 'Search or browse the material catalogue.' },
      { title: 'Generate', desc: 'See the real change in a few seconds.' },
    ],
    features: [
      { title: 'Surface-Level Control', desc: 'Change one countertop, or every wall in the room — your call.' },
      { title: 'Bulk Apply', desc: 'Select a group like “all cabinets” and apply one finish everywhere at once.' },
      ...SHARED_FEATURES,
    ],
    faqs: [{ q: 'Can I change more than one surface at once?', a: 'Yes — select a surface group like all walls and apply one finish everywhere, or go one surface at a time.' }, ...SHARED_FAQS],
  },
  lighting: {
    headline: 'Relight any room in seconds', accent: 'Relight',
    description: 'Upload a room photo and shift the mood — daylight to cozy evening — without moving a single piece of furniture.',
    steps: [
      { title: 'Upload a room photo', desc: 'Any room, any time of day.' },
      { title: 'Pick a lighting preset', desc: `${PRESET_WORDS}.` },
      { title: 'Fine-tune (optional)', desc: 'Warmth, brightness, sun angle, shadows, fixtures.' },
      { title: 'Generate', desc: 'See the new mood in a few seconds.' },
    ],
    features: [
      { title: `${RELIGHT_PRESETS.length} Lighting Presets`, desc: `${RELIGHT_PRESETS.map((p) => p.label).join(', ')}.` },
      { title: 'Fine Control', desc: 'Adjust warmth, brightness, sun angle, shadow depth, and individual fixtures.' },
      ...SHARED_FEATURES,
    ],
    faqs: [{ q: 'Does this change my furniture too?', a: 'No — lighting changes color temperature, brightness, shadows, and fixtures only. Furniture and layout stay exactly as they are.' }, ...SHARED_FAQS],
  },
  furniture: {
    headline: 'Change the furniture in any room in seconds', accent: 'Change',
    description: 'Tap a piece of furniture and remove it or recolour it — sofa, bed, cabinets, anything.',
    steps: [
      { title: 'Start with a room', desc: 'A sample room’s furniture is marked for you; on your own photo, mark a piece with a tap.' },
      { title: 'Tap a piece', desc: 'Or a whole group, like all four dining chairs.' },
      { title: 'Remove or recolour', desc: 'Pick a colour and a finish, or describe the new look.' },
      { title: 'Generate', desc: 'See the change in a few seconds.' },
    ],
    features: [
      { title: 'Per-Item Control', desc: 'Remove or recolour each piece individually — or a whole matching group at once.' },
      ...SHARED_FEATURES,
    ],
    faqs: [{ q: 'What if I have multiple copies of the same item?', a: 'Removing or recolouring a furniture group applies to every matching instance at once — e.g. all four dining chairs together.' }, ...SHARED_FAQS],
  },
  defurnish: {
    headline: 'Empty any room in seconds', accent: 'Empty',
    description: 'Clear a room to a blank canvas — walls, floor, and camera angle stay exactly put, ready to restyle from scratch.',
    steps: [
      { title: 'Open a sample room', desc: 'Each one is a furnished room.' },
      { title: 'Choose what to keep', desc: 'Keep built-ins like cabinets and wardrobes, or strip to a bare shell.' },
      { title: 'Generate', desc: 'See the emptied room in a few seconds.' },
      { title: 'Restyle from scratch', desc: 'Move on to Style or Materials on the cleared photo.' },
    ],
    features: [
      { title: 'Two Clearing Modes', desc: 'Keep built-ins in place, or strip everything back to bare walls, floor, and ceiling.' },
      { title: 'Camera Stays Put', desc: 'Wall color, flooring, and camera angle are preserved exactly — only the clutter goes.' },
      ...SHARED_FEATURES,
    ],
    faqs: [{ q: 'Will it change my walls or floor?', a: 'No — Defurnish only removes furniture and (optionally) built-ins. Wall color, flooring, and camera angle are preserved exactly.' }, ...SHARED_FAQS],
  },
  sketch: {
    headline: 'Turn a sketch into a photo in seconds', accent: 'Turn',
    description: 'Render a hand sketch into a lifelike photo — styled the way you like.',
    steps: [
      { title: 'Open the sample sketch', desc: 'A hand-drawn kitchen, ready to render.' },
      { title: 'Pick a design style', desc: 'The style you’d want the finished room to have.' },
      { title: 'Generate', desc: 'A photorealistic render in a few seconds.' },
      { title: 'Keep editing', desc: 'Move on to Materials, Lighting, or Furniture on the new render.' },
    ],
    features: [...SHARED_FEATURES],
    faqs: [...SHARED_FAQS],
  },
}
export const FAQ_TITLE = 'Frequently asked questions'
export const WORKS_ON = 'Works on any room, including'
export const CLOSING = 'Try it free'

/** Every trial page, for the sitemap and the link-preview cards. */
export const TRIAL_PAGES: { key: 'home' | TrialTool; path: string }[] = [{ key: 'home', path: trialHref() }, ...(['style', 'materials', 'lighting', 'furniture', 'defurnish', 'sketch'] as const).map((t) => ({ key: t, path: trialHref(t) }))]
