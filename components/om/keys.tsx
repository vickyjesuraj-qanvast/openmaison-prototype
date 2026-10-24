'use client'

import { useSyncExternalStore } from 'react'
import { alternatives, detectPlatform, keyText, keysPlain, stepsOf, type Platform } from '@/lib/keys/spec'
import { keysOf } from '@/lib/keys/registry'
import styles from './keys.module.css'

/**
 * (REG-711 · REG-717) A shortcut's keys as chips — the search footer's key (REG-709) for every hint in the app: tooltips, menu rows, the
 * ? panel, the tips, the "/" in a search box. It reads the computer once: ⌘ ⌥ ⇧ on a Mac, Ctrl Alt Shift everywhere else (owner, Q-25:
 * "Ctrl on Windows, ⌘ on a Mac" — every hint used to show ⌘). The server has no computer to read, so it draws the Mac's and the browser
 * redraws once, without a hydration mismatch. On a touch screen with no keyboard the chips are not drawn at all; a tablet shows them
 * from its first key pressed on a real keyboard (the key layer marks `html[data-hw-keyboard]`).
 */
const noSubscribe = () => () => {}
let cached: Platform | null = null
const platformNow = (): Platform => (cached ??= detectPlatform())
export const usePlatform = (): Platform => useSyncExternalStore(noSubscribe, platformNow, () => 'mac')
/** A spec in words for the computer in front of you ("⌘Z" · "Ctrl+Z") — for a sentence, e.g. a snackbar. Browser only. */
export const keysText = (spec: string): string => keysPlain(spec, platformNow())

export function Keys({ spec, shortcut, tone = 'default', className, always = false }: {
  /** The keys as a spec ('mod+k', 'g l', 'j|down'). */
  spec?: string
  /** …or a shortcut's id in the one list (`lib/keys/registry.ts`). */
  shortcut?: string
  /** 'inverse' on the dark tooltip, the snackbar and the G hint. */
  tone?: 'default' | 'inverse'
  className?: string
  /** (responsive audit 2026-10-23, W1) Drawn on a touch screen too — where the keys ARE the content (the ? panel's rows), not a hint beside a control. */
  always?: boolean
}) {
  const platform = usePlatform()
  const s = spec ?? (shortcut ? keysOf(shortcut) : undefined)
  if (!s) return null
  return (
    <span className={className ? `${styles.keys} ${className}` : styles.keys} data-tone={tone} data-always={always || undefined} aria-hidden>
      {alternatives(s).map((one, a) => (
        <span key={one} className={styles.group}>
          {a > 0 ? <span className={styles.word}>or</span> : null}
          {stepsOf(one).map((step, i) => (
            <span key={i} className={styles.group}>
              {i > 0 ? <span className={styles.word}>then</span> : null}
              {step.map((t, j) => <kbd key={`${t}${j}`} className={styles.kbd}>{keyText(t, platform)}</kbd>)}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}
