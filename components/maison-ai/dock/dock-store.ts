'use client'

import { useSyncExternalStore } from 'react'

/*
 * (the Dashboard redesigned 2026-10-26 — his marks P-01 · P-12 · lane D4) The docked field's small shared state, for the pieces that live
 * outside it: a card's Ask (`askAbout`, called from each card's head by lanes D1–D3), the phone's ✦ at the bottom dock's end (whether the field
 * has shrunk into it while the page scrolls down, and its press) — the mobile chrome (components/shell/mobile-nav.tsx) draws the ✦, the dock
 * owns everything else.
 */

type Listener = () => void
function store<T>(initial: T) {
  let value = initial
  const ls = new Set<Listener>()
  return {
    get: () => value,
    set: (v: T) => { if (Object.is(v, value)) return; value = v; ls.forEach((l) => l()) },
    subscribe: (l: Listener) => { ls.add(l); return () => { ls.delete(l) } },
  }
}

/** A card's Ask: which card, and a question to ask about it straight away (a row's "Ask about this"), each `n` once. */
export type AboutRequest = { card: string; question: string | null; n: number }
const about = store<AboutRequest | null>(null)
let aboutSeq = 0
export function requestAbout(card: string, question?: string | null) { about.set({ card, question: question ?? null, n: ++aboutSeq }) }
export const useAboutRequest = () => useSyncExternalStore(about.subscribe, about.get, () => null)

/** The phone's accessory, shrunk into the ✦ at the bottom dock's end (scrolled down, or a phone held sideways). */
const shrunk = store(false)
export const setDockShrunk = (v: boolean) => shrunk.set(v)
export const useDockShrunk = () => useSyncExternalStore(shrunk.subscribe, shrunk.get, () => false)

/** Whether the docked field is on the page at all (the ✦ is drawn only then). */
const present = store(false)
export const setDockPresent = (v: boolean) => present.set(v)
export const useDockPresent = () => useSyncExternalStore(present.subscribe, present.get, () => false)

/** The ✦'s press: the dock opens its sheet. */
const opened = store(0)
export const openDockSheet = () => opened.set(opened.get() + 1)
export const useDockOpenRequests = () => useSyncExternalStore(opened.subscribe, opened.get, () => 0)
