'use client'

import { createContext, useContext } from 'react'
import type { DashCardKey } from '@/lib/dashboard/frame'

/**
 * (the Dashboard redesigned, 2026-10-26 — his Q-06 · lane D1) What the page's frame offers the cards inside it: hiding a card for yourself
 * (each card's ⋮ › Hide this card — with Undo, kept on the member's record) and whether a card may be hidden at all (Needs you never is).
 * Outside the Dashboard (a test, another page) there is no frame: a card's ⋮ then has no Hide.
 */
export type DashFrame = { hide: (key: DashCardKey) => void; canHide: (key: string) => boolean }
export const DashFrameContext = createContext<DashFrame | null>(null)
export const useDashFrame = () => useContext(DashFrameContext)
