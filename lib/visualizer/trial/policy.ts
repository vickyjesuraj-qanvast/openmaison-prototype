import type { Mode } from '@/components/visualizer/editor/rail'

/*
 * (pending modules S36 — his "build all of them" 2026-10-11; cards public:try-it-visualizer · onboarding:try-visualizer-public; 1.0's
 * src/lib/render/trial-gate.ts · trial-quota.ts, src/app/api/demo/visualizer/*, src/components/trial-visualizer/trial-types.ts) THE RULES OF
 * TRYING THE AI VISUALIZER WITHOUT AN ACCOUNT. Pure, client-safe: the page, the server's actions and the probe read the same figures.
 *
 * 1.0's numbers, settled from its code (the two cards said 3 and 1): `TRIAL_LIMIT = 3` (trial-quota.ts) — three renders per browser, shared by
 * every kind of render (a finish edit, a whole-room look, Empty the room, Render from sketch), counted only when one is kept (a failed render
 * never takes one), in a signed cookie that lasts a day from the last render (`maxAge: 86_400`); plus ten renders a minute from one address
 * (`checkRateLimit … maxRequests: 10`). The "1" was 1.0's older /try page (`FREE_UPLOADS = 1` — one restyle of your own photo after three
 * pre-rendered samples), linked from nowhere and superseded by /try-visualizer; its address now opens this trial.
 */

/** 1.0's TRIAL_LIMIT — free renders per browser. */
export const TRIAL_LIMIT = 3
/** The signed count's cookie (1.0's `om_trial_v1`; 2.0's cookies are `om_…`). Named in the Cookie Policy. */
export const TRIAL_COOKIE = 'om_trial'
/** 1.0's cookie lived a day from the last render it counted. */
export const TRIAL_COOKIE_SECONDS = 86_400
/** 1.0's per-address figure for its render routes (each try of a render, a minute). */
export const TRIAL_PER_MINUTE = 10

/** Where the trial lives on OpenMaison's website (S35's /site). */
export const TRIAL_PATH = '/site/try'

/**
 * Whether the trial is open (1.0's `trialEnabled`: "Safe-by-default … production requires an explicit flag — flipped on once Turnstile + a
 * durable rate-limit store exist"). `TRIAL_VISUALIZER_ENABLED` is 1.0's own switch: `true` opens it, `false` closes it. With neither, the
 * prototype's demo shows it (`TRIAL_IN_DEMO`, his "so it can be shown"), as a developer's `next dev` always did in 1.0; a real build sets
 * TRIAL_IN_DEMO false and the trial is off until the switch says so. Closed, every trial address is the site's own 404 (1.0's notFound()).
 * The Visualizer's page on the site reads it when the site is built (its Try now) — set it for the build and the server alike.
 */
export const TRIAL_IN_DEMO = true
export function trialEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env.TRIAL_VISUALIZER_ENABLED ?? '').trim().toLowerCase()
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return TRIAL_IN_DEMO || env.NODE_ENV !== 'production'
}

/* ── the six ways in (1.0's /try-visualizer/{style, materials, lighting, furniture, defurnish, sketch}) ── */
export const TRIAL_TOOLS = ['style', 'materials', 'lighting', 'furniture', 'defurnish', 'sketch'] as const
export type TrialTool = (typeof TRIAL_TOOLS)[number]
export const isTrialTool = (v: unknown): v is TrialTool => typeof v === 'string' && (TRIAL_TOOLS as readonly string[]).includes(v)
export const trialHref = (tool?: TrialTool | null) => (tool ? `${TRIAL_PATH}/${tool}` : TRIAL_PATH)
/** The editor's mode each way in opens on (1.0's TOOL_INFO `initialPanel`; Empty the room is a Tool in 2.0, Render from sketch rides Style). */
export const TOOL_MODE: Record<TrialTool, Mode> = { style: 'style', materials: 'surfaces', lighting: 'lighting', furniture: 'furniture', defurnish: 'tools', sketch: 'style' }
/** The ways in that only a sample room can do in this prototype (the engine empties a room from its own empty photo, and renders the sample
    sketch — an image model does any photo; lib/services/registry.ts `image-model`). */
export const SAMPLE_ONLY: Partial<Record<TrialTool, string>> = {
  defurnish: 'Empty the room works on the sample rooms here — your own photo opens for finishes, a style and a light.',
  sketch: 'Render from sketch works on the sample sketch here — your own picture opens as a photo, for finishes, a style and a light.',
}

/* ── the allowance, in 1.0's words ── */
/** 1.0's quota line: "2 of 3 free renders left" · "No free renders left". */
export const allowanceLine = (left: number, limit = TRIAL_LIMIT) => (left <= 0 ? 'No free renders left' : `${left} of ${limit} free renders left`)

/** Why the server refused a render — 1.0's three answers (503 trial_disabled · 429 rate_limited · 402 signup_required), and the bot check's
    (1.0's spec §4 — Turnstile, never wired there; only a real check refuses, lib/visualizer/trial/server.ts `setBotCheck`). */
export type TrialRefusal = 'off' | 'fast' | 'used' | 'check'
export const REFUSAL_WORDS: Record<TrialRefusal, string> = {
  off: 'This trial isn’t available right now — please check back later.',
  fast: 'You’re going a little fast — give it a moment and try again.',
  used: `You’ve used all ${TRIAL_LIMIT} free renders`,
  check: 'We couldn’t check this browser — reload the page and try again.',
}
export type TrialAnswer = { ok: true; left: number } | { error: string; reason: TrialRefusal; left: number }

/** The count kept in the cookie, read back: a whole number from 0 (anything else reads as none used, 1.0's). */
export const usedOf = (raw: unknown): number => (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 ? raw : 0)
export const leftOf = (used: number, limit = TRIAL_LIMIT) => Math.max(0, limit - used)
