'use server'

import { revalidatePath } from 'next/cache'
import { sessionMemberId } from '@/lib/db/session'
import { answerOffer, noteMoment, offerNow, restoreOffer } from '@/lib/credits/nudges'
import { isBlockingMoment, PUT_AWAY, type OfferTrigger } from '@/lib/credits/nudge-model'

/**
 * (pending modules S41b-4 — 1.0's `POST /api/nudges/evaluate` · `/claim`) The Free plan's upgrade offers — the signed-in member's own, always:
 * nothing here takes a member id from the browser. Each answers `{ error }` when refused (the house shape). The browser's safe-moment engine
 * (components/credits/upgrade-offers.tsx) asks for an offer; the bell answers one; 2.0's own blocking moments stamp the gap.
 */

const done = () => revalidatePath('/', 'layout')

/** A quiet moment on a studio page: look for an offer (the Owner on Free only — anyone else gets nothing, and nothing is written for them). */
export async function offerUpgradeNow(): Promise<{ offered: OfferTrigger | null }> {
  const me = await sessionMemberId()
  const r = await offerNow(me).catch((e: unknown) => { console.error('[nudges] the look failed — offering nothing', e); return { offered: null } })
  if (r.offered) done()
  return r
}

/** The bell's offer, answered: See plans, Buy AI credits, or Not now (which says where plans always are, with Undo). */
export async function answerUpgradeOffer(input: { id: string; answer: 'plans' | 'topup' | 'not_now' }): Promise<{ ok: true; sentence: string | null } | { error: string }> {
  const answer = input?.answer === 'topup' || input?.answer === 'not_now' ? input.answer : 'plans'
  const r = await answerOffer(await sessionMemberId(), String(input?.id ?? ''), answer)
  if ('error' in r) return r
  done()
  return { ok: true, sentence: answer === 'not_now' ? PUT_AWAY : null }
}

/** Undo after Not now — the offer back in the bell as it was. */
export async function undoPutAway(input: { id: string; read: boolean }): Promise<{ ok: true } | { error: string }> {
  const r = await restoreOffer(await sessionMemberId(), String(input?.id ?? ''), !!input?.read)
  if ('error' in r) return r
  done()
  return r
}

/** One of 2.0's own blocking moments showed to the Owner on Free (the lock card, the out-of-credits sheet) — no offer follows it for ten minutes. */
export async function noteUpgradeMoment(input: { trigger: string }): Promise<{ ok: true }> {
  if (isBlockingMoment(input?.trigger)) await noteMoment(await sessionMemberId(), input.trigger).catch(() => {})
  return { ok: true }
}
