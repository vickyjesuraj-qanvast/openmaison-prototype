'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { isRefusal, type CreditSummary, type Refusal } from '@/lib/credits/model'
import { readCredits, refundAI, spendAI } from '@/app/credits/actions'

/**
 * (REG-701) The viewer's AI credits on the client — one summary every surface reads (the rail's slot, the editor's balance chip, the
 * card, Plans, the moments), so a spend in one place moves the number everywhere at once. The server's summary seeds it (AppShell and
 * the editors' layout); a spend, a refund or a purchase refreshes it. The openers are the bell's pattern (`openNotifications`): a window
 * event the one host (credits-host.tsx) listens for, so any press anywhere can open Plans, the card or a moment.
 */

let current: CreditSummary | null = null
const listeners = new Set<() => void>()
const emit = () => { for (const l of listeners) l() }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

/** Take a newer summary (a server render, or a read after a spend). An older one never replaces a newer one. */
export function seedCredits(s: CreditSummary | null | undefined) {
  if (!s) return
  if (current && current.now > s.now && current.viewer.id === s.viewer.id) return
  current = s
  emit()
}
/** The live summary — `initial` (the server's) until the client has one. */
export function useCredits(initial: CreditSummary | null): CreditSummary | null {
  return useSyncExternalStore(subscribe, () => current ?? initial, () => initial)
}
/** Seed from the server's summary whenever a render hands a newer one (and the studio's GST line, for a purchase's tax words). */
export function useSeedCredits(s: CreditSummary | null, gst?: string) {
  useEffect(() => { if (gst !== undefined && gst !== gstLine) { gstLine = gst; emit() } seedCredits(s) }, [s, gst])
}
/* the studio's GST line (Q-15) for the surfaces with no server chrome of their own — the editors' balance chip */
let gstLine = ''
export function useCreditsGstLine(): string {
  return useSyncExternalStore(subscribe, () => gstLine, () => '')
}
export async function refreshCredits(): Promise<CreditSummary | null> {
  try { const s = await readCredits(); seedCredits(s); return s } catch { return null }
}

/* ── the upgrade moment waits for Plans (§5.4): while Plans is open, the rail keeps Upgrade; closing it lets the moment play ── */
export const HOLD_EVENT = 'om:credits:released'
let held = false
export const isRailHeld = () => held
export function holdRail(on: boolean) { held = on; if (!on) window.dispatchEvent(new CustomEvent(HOLD_EVENT)) }

/* ── openers ── */
export const CREDITS_EVENT = 'om:credits'
export type CreditsOpen =
  | { kind: 'plans'; step?: 'choose'; focus?: 'plan' | 'topup' }
  | { kind: 'topup' }
  | { kind: 'billing' }
  | { kind: 'block'; refusal: Refusal; what: 'render' | 'quote'; needed: number; retry?: () => void; smaller?: { label: string; run: () => void } | null }
const open = (detail: CreditsOpen) => window.dispatchEvent(new CustomEvent<CreditsOpen>(CREDITS_EVENT, { detail }))
/** Upgrade, Change plan, a moment's "See plans". */
export const openPlans = () => open({ kind: 'plans' })
export const openTopUp = () => open({ kind: 'topup' })
/** Dodo's customer portal stands in here (integration B-20): the plan, the card, cancel. */
export const openManageBilling = () => open({ kind: 'billing' })

/**
 * Company › Plan & AI credits from wherever the press was, carrying the way back (REG-465: the Company pages honour `?from=`). Read at
 * press time, never in render.
 */
export function planHref(query = '', page: '' | '/billing' = ''): string {
  const here = typeof window === 'undefined' ? '' : window.location.pathname + window.location.search
  const base = `/company/plan${page}${query}`
  if (!here || here.startsWith('/company/plan')) return base
  return `${base}${base.includes('?') ? '&' : '?'}from=${encodeURIComponent(here)}`
}

/* ── charging (the tools call these) ── */

/**
 * Take the charge for a piece of AI work before it runs — 1.0's rule (A-05) — keyed by the work's own id so a retry can't charge twice
 * (B-12). It answers what was taken (0 while the studio isn't counted yet, 1.0's shadow path), or false for a refusal: the right moment
 * opens (§5.6) and the work doesn't start. `retry` re-runs the press once credits are in; `smaller` is the cheaper way, when there is one.
 */
export async function chargeAI(o: { action: string; count?: number; ref: string; what: 'render' | 'quote'; needed: number; retry?: () => void; smaller?: { label: string; run: () => void } | null }): Promise<number | false> {
  let out: Awaited<ReturnType<typeof spendAI>>
  try { out = await spendAI({ action: o.action, count: o.count, ref: o.ref }) } catch { return 0 }   // a charge that can't be taken never blocks the work (1.0's shadow path)
  if ('ok' in out) {
    void refreshCredits()
    if (out.charged > 0) firstSpendTip(o.what)
    return out.charged
  }
  if (isRefusal(out) && (out.error === 'insufficient_credits' || out.error === 'member_cap_reached')) {
    open({ kind: 'block', refusal: out, what: o.what, needed: o.needed, retry: o.retry, smaller: o.smaller ?? null })
    void refreshCredits()
    return false
  }
  return 0
}
/** Give the charge back — the work failed, or was stopped before it was kept (Q-31). */
export async function refundAIWork(ref: string): Promise<number> {
  try { const r = await refundAI({ ref }); void refreshCredits(); return 'credits' in r ? r.credits : 0 } catch { return 0 }
}

/* ── the one-time tip after a member's first charge (enhancement E-17) ── */
export const TIP_EVENT = 'om:credits:tip'
function firstSpendTip(what: 'render' | 'quote') {
  const id = current?.viewer.id ?? 'me'
  const key = `om.credits.tip.${id}`
  try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1') } catch { return }
  window.dispatchEvent(new CustomEvent(TIP_EVENT, { detail: { what } }))
}
