'use client'

import { useMediaQuery } from '@/lib/breakpoint'

/*
 * (Quotes on the move, K4 — P-12 · A-15) The client pages' phone model: a phone, and a tablet held upright (768–1024 portrait — a phone held
 * wide). There the quote reads as cards under a total card, with a sticky bar at the bottom; in landscape at 1024 and on a desk the paper
 * stands beside the card, as the signing page's shell draws it. The same query in CSS (confirm-page.module.css) decides the first paint; this
 * decides only what the render puts where.
 */
export const CLIENT_PHONE_MODEL = '(max-width: 767px), (max-width: 1024px) and (orientation: portrait)'

export function useClientPhoneModel(): boolean {
  return useMediaQuery(CLIENT_PHONE_MODEL)
}

/** The WhatsApp number a Singapore phone on record dials — eight digits take the country code; anything else goes as typed; nothing = none. */
export function waNumber(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length === 8 ? `65${digits}` : digits
}
