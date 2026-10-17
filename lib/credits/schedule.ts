/**
 * (REG-699) What each AI action costs, in AI credits — 1.0's price list as it is (`src/lib/credits/schedule.ts`, integration A-02).
 * One table drives every number a studio sees: the chip on a button, the line under Generate, the Usage page's tools (enhancement
 * E-02 — Krea's and Miro's numbers drifted between surfaces). 1.0's measured provider cost stays in 1.0 and is never shown (Q-26).
 * Words are 2.0's (Q-01 "AI credits"); 1.0's label is kept beside each for the developers' map. Client-safe.
 */

export type ActionKey =
  | 'lead_email_parse' | 'lead_screenshot_parse' | 'render_segment' | 'render_detect'
  | 'quote_digitize' | 'render_fast_lite' | 'render_defurnish' | 'render_fast' | 'render_photorealistic' | 'render_pro' | 'render_repair' | 'copilot_block'

export type ScheduleEntry = { credits: number; /** 2.0's word for the Usage page */ label: string; /** 1.0's label, for the map */ label1: string }

export const CREDIT_SCHEDULE: Record<ActionKey, ScheduleEntry> = {
  lead_email_parse: { credits: 0, label: 'Reading an enquiry email', label1: 'Parse enquiry email' },
  lead_screenshot_parse: { credits: 0, label: 'Reading a chat screenshot', label1: 'Parse screenshot' },
  render_segment: { credits: 0, label: 'Marking a room’s surfaces', label1: 'Segment surfaces' },
  render_detect: { credits: 0, label: 'Reading a room photo', label1: 'Detect surfaces' },
  quote_digitize: { credits: 5, label: 'Quote read', label1: 'Digitize quote' },
  render_fast_lite: { credits: 5, label: 'Draft render', label1: 'Draft render' },            // priced in 1.0, not offered (Q-47: hold)
  render_defurnish: { credits: 10, label: 'Empty the room', label1: 'Defurnish room' },
  render_fast: { credits: 10, label: 'Render · Fast', label1: 'Render' },
  render_photorealistic: { credits: 15, label: 'Photorealistic render', label1: 'Photorealistic render' },
  render_pro: { credits: 20, label: 'Pro render · High', label1: 'Pro render' },
  render_repair: { credits: 2, label: 'Render repair', label1: 'Drift repair' },              // (pending modules S20) the drift guard's repair, one per version lined up
  copilot_block: { credits: 25, label: 'Meeting Co-Pilot · 10 min', label1: 'Co-Pilot (10 min)' },   // later (Q-45)
}

export const isActionKey = (k: string): k is ActionKey => k in CREDIT_SCHEDULE
export const actionLabel = (k: string): string => (isActionKey(k) ? CREDIT_SCHEDULE[k].label : k)

/** The AI Visualizer's passes on 1.0's price list (Q-29): Empty the room is Defurnish; every other kind is priced by its quality —
    Fast = Render, High = Pro render — and every version counts (1.0: variants × price, one charge). */
export type RenderQuality = 'fast' | 'high'
export function renderAction(kind: string, quality: RenderQuality): ActionKey {
  if (kind === 'empty') return 'render_defurnish'
  return quality === 'high' ? 'render_pro' : 'render_fast'
}
export const costOf = (action: ActionKey, count = 1): number => CREDIT_SCHEDULE[action].credits * Math.max(1, Math.floor(count))
/** (pending modules S20) A charge that made renders — a repair of one already made never counts as another (1.0: `render_repair` is never a
    new success). */
export const makesRenders = (k: string): boolean => k.startsWith('render_') && k !== 'render_repair'

/** A Fast render, the unit studios think in: "about 680 renders" (Q-03, E-01). */
export const RENDER_CREDITS = CREDIT_SCHEDULE.render_fast.credits
export const aboutRenders = (credits: number): number => Math.max(0, Math.floor(credits / RENDER_CREDITS))
