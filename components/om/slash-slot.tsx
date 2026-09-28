'use client'

import type { ReactNode } from 'react'
import { Keys } from './keys'
import { useFlagPref } from '@/lib/prefs'
import { SINGLE_KEYS } from '@/lib/keys/store'
import styles from './slash-slot.module.css'

/**
 * (REG-715, Q-07) A page's search box with "/" at its right end while it is empty and unfocused — the one key worth showing at rest, the
 * one that puts the caret in the box (`useSearchTarget`). It steps aside on focus and once something is typed, disappears with the
 * single-key switch off, and (the chip's own rule) on a touch screen with no keyboard.
 */
export function SlashSlot({ empty, children }: { empty: boolean; children: ReactNode }) {
  const [single] = useFlagPref(SINGLE_KEYS, true)
  return <span className={styles.slot}>{children}{empty && single ? <Keys spec="/" className={styles.hint} /> : null}</span>
}
