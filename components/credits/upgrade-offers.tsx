'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { offerUpgradeNow } from '@/app/credits/nudge-actions'
import { CHECK_EVERY_MS, onPurchasePage, POINTER_HELD_STALE_MS, RESULT_QUIET_MS } from '@/lib/credits/nudge-model'
import { useCredits } from './credits-client'

/**
 * (pending modules S41b-4 — 1.0's `use-nudge-engine.ts` · `safe-moment.ts` · `activity.ts`) WHEN the studio looks for an upgrade offer; never
 * WHAT (the server decides, lib/credits/nudges.ts). Mounted once by the app shell — the studio's own pages, never a client's page, never an
 * editor mid-work — and only while the Owner of a studio on Free is the one signed in. It asks only at a safe moment (1.0's R5), quiet for ten
 * seconds together: the tab in front and focused, no dialog, sheet, drawer, menu or popover open (the bell itself included), focus not in a
 * text box, no press held (a drag), nothing being saved or read (a server action in flight) and no meeting live (`useBusyWhile`), and not
 * on Plan & AI credits (the purchase pages). Then once a minute while the page stays quiet. An offer it earns lands as one row in the bell — the badge says so; nothing opens.
 */

/* ── what the member and the app are doing (1.0's activity.ts, module-level so one picture is shared) ── */
let inFlight = 0
let busyHolds = 0
/** 1.0's `useBusyWhile`: a long piece of work that isn't one request per result — a live meeting with its co-pilot — holds the offers off
    while it runs (the fetch probe alone can't see it). */
export function useBusyWhile(on: boolean) {
  useEffect(() => {
    if (!on) return
    busyHolds += 1
    return () => { busyHolds = Math.max(0, busyHolds - 1) }
  }, [on])
}
let probing = false
const held = new Set<number>()
let lastPointerAt = 0

/** 1.0's fetch probe: a server action is a same-origin POST carrying `Next-Action` — while one is in flight the app is busy. Observes only. */
function installBusyProbe() {
  if (probing || typeof window === 'undefined') return
  probing = true
  const base = window.fetch
  const isAction = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase()
      if (method !== 'POST') return false
      const h = new Headers(init?.headers ?? (typeof input === 'object' && 'headers' in input ? input.headers : undefined))
      return h.has('next-action')
    } catch { return false }
  }
  window.fetch = function probed(input: RequestInfo | URL, init?: RequestInit) {
    if (!isAction(input, init)) return base.call(window, input, init)
    inFlight += 1
    return base.call(window, input, init).finally(() => { inFlight = Math.max(0, inFlight - 1) })
  } as typeof fetch
}

/** A dialog, sheet, drawer, menu, list or popover is open (the house pieces carry role="dialog" / aria-modal / data-om-menu; the design
    system's dropdowns and pickers role="menu" / "listbox" while open). */
const OVERLAYS = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], [role="menu"], [role="listbox"], [data-om-menu], [data-overlay-open]'
function overlayOpen(): boolean {
  for (const el of document.querySelectorAll<HTMLElement>(OVERLAYS)) {
    if (el.hidden || el.getAttribute('aria-hidden') === 'true' || el.getAttribute('data-state') === 'closed' || !el.getClientRects().length) continue
    return true
  }
  return false
}
const TEXT_TYPES = new Set(['text', 'search', 'email', 'tel', 'url', 'number', 'password', 'date', 'datetime-local', 'month', 'time', 'week'])
/** Focus is in something being typed in. */
function typing(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el || el === document.body) return false
  if (el.isContentEditable || el instanceof HTMLTextAreaElement) return true
  if (el instanceof HTMLInputElement) return TEXT_TYPES.has((el.type || 'text').toLowerCase())
  return el.getAttribute('role') === 'combobox' || el.getAttribute('role') === 'textbox'
}
const pointerHeld = (now: number) => held.size > 0 && now - lastPointerAt < POINTER_HELD_STALE_MS

function safeNow(now: number): boolean {
  return document.visibilityState === 'visible' && document.hasFocus() && inFlight === 0 && busyHolds === 0 && !pointerHeld(now) && !overlayOpen() && !typing() && !onPurchasePage(window.location.pathname)
}

export function UpgradeOffers() {
  const s = useCredits(null)
  const on = !!s && s.provisioned && s.planId === 'free' && s.viewer.canChangePlan
  const path = usePathname()

  useEffect(() => {
    if (!on) return
    installBusyProbe()
    const down = (e: PointerEvent) => { const now = Date.now(); if (!pointerHeld(now)) held.clear(); held.add(e.pointerId); lastPointerAt = now }
    const move = (e: PointerEvent) => { if (!held.size) return; if (e.buttons === 0) { held.delete(e.pointerId); return } lastPointerAt = Date.now() }
    const up = (e: PointerEvent) => { held.delete(e.pointerId) }
    const blur = () => held.clear()
    document.addEventListener('pointerdown', down, { capture: true, passive: true })
    document.addEventListener('pointermove', move, { capture: true, passive: true })
    document.addEventListener('pointerup', up, { capture: true, passive: true })
    document.addEventListener('pointercancel', up, { capture: true, passive: true })
    window.addEventListener('blur', blur)
    /* each page starts its own quiet: the first look comes ten quiet seconds after arriving, then once a minute while it stays quiet */
    let quietSince = 0, lastLook = 0, asking = false
    const id = window.setInterval(() => {
      const now = Date.now()
      if (asking || !safeNow(now)) { quietSince = 0; return }
      if (!quietSince) quietSince = now
      if (now - quietSince < RESULT_QUIET_MS || (lastLook && now - lastLook < CHECK_EVERY_MS)) return
      lastLook = now; asking = true
      void offerUpgradeNow().catch(() => null).finally(() => { asking = false; quietSince = 0 })
    }, 1000)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('pointerdown', down, { capture: true })
      document.removeEventListener('pointermove', move, { capture: true })
      document.removeEventListener('pointerup', up, { capture: true })
      document.removeEventListener('pointercancel', up, { capture: true })
      window.removeEventListener('blur', blur)
    }
  }, [on, path])
  return null
}
