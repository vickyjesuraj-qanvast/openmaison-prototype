'use server'

import { askRender, keepRender } from '@/lib/visualizer/trial/server'
import type { TrialAnswer } from '@/lib/visualizer/trial/policy'

/*
 * (pending modules S36 — 1.0's src/app/api/demo/visualizer/{quota,render,photorealistic,declutter}) The trial's two server steps around every
 * render the visitor's browser draws: ask (is a render left, is the browser checked, is this address going too fast — 1.0 checked all three
 * BEFORE its model call) and keep (the render came back: it counts, and the signed cookie is written again). Anyone may call them (the site is
 * public); each answers `{ error, reason, left }` when it refuses, with 1.0's words. No picture travels: the renders stay in the browser.
 */

export async function askTrialRender(input: { botToken?: string | null } = {}): Promise<TrialAnswer> {
  return askRender(typeof input?.botToken === 'string' ? input.botToken.slice(0, 4096) : null)
}

export async function keepTrialRender(): Promise<TrialAnswer> {
  return keepRender()
}
