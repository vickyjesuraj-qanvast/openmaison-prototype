/**
 * (REG-711) Keys as the app writes them — pure, client-safe. A spec is what the keyboard does, not how it looks:
 *   'mod+k'  ⌘K on a Mac, Ctrl+K elsewhere     'g l'  G, then L (a sequence)
 *   '?'      a character                          'j|down'  either one (alternatives)
 *   '#1–8'   written as is (a range of keys)
 * One place turns a spec into what a Mac or Windows keyboard shows (`keyText`), into `aria-keyshortcuts`, and into the test a
 * keydown is matched against — so a hint can never name a key the handler does not answer.
 */
export type Platform = 'mac' | 'other'

/** Read once in the browser: a Mac, an iPad or an iPhone shows ⌘ ⌥ ⇧; everything else Ctrl, Alt, Shift. */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'mac'
  const ua = navigator as Navigator & { userAgentData?: { platform?: string } }
  const p = ua.userAgentData?.platform || navigator.platform || navigator.userAgent || ''
  return /mac|iphone|ipad|ipod/i.test(p) ? 'mac' : 'other'
}

const WORDS: Record<string, { mac: string; other: string; aria: string }> = {
  mod: { mac: '⌘', other: 'Ctrl', aria: 'Meta' },
  shift: { mac: '⇧', other: 'Shift', aria: 'Shift' },
  alt: { mac: '⌥', other: 'Alt', aria: 'Alt' },
  enter: { mac: '↵', other: 'Enter', aria: 'Enter' },
  esc: { mac: 'Esc', other: 'Esc', aria: 'Escape' },
  up: { mac: '↑', other: '↑', aria: 'ArrowUp' },
  down: { mac: '↓', other: '↓', aria: 'ArrowDown' },
  left: { mac: '←', other: '←', aria: 'ArrowLeft' },
  right: { mac: '→', other: '→', aria: 'ArrowRight' },
  backspace: { mac: '⌫', other: 'Backspace', aria: 'Backspace' },
  tab: { mac: 'Tab', other: 'Tab', aria: 'Tab' },
  space: { mac: 'Space', other: 'Space', aria: 'Space' },
  f2: { mac: 'F2', other: 'F2', aria: 'F2' },
}

/** One key as the keyboard of `platform` prints it. */
export function keyText(token: string, platform: Platform): string {
  const w = WORDS[token]
  if (w) return w[platform]
  if (token.startsWith('#')) return token.slice(1)
  return token.length === 1 ? token.toUpperCase() : token
}

/** The alternatives of a spec ('j|down' → ['j', 'down']). */
export const alternatives = (spec: string): string[] => spec.split('|').map((s) => s.trim()).filter(Boolean)
/** A spec's steps and each step's keys: 'g l' → [['g'], ['l']]; 'mod+shift+z' → [['mod', 'shift', 'z']]. */
export const stepsOf = (one: string): string[][] => one.split(' ').filter(Boolean).map((s) => s.split('+'))

/** A spec as plain words, for a snackbar or a badge: "⌘K" · "Ctrl+K" · "G L" · "J or ↓". Mac joins modifiers tight, as its menus do. */
export function keysPlain(spec: string, platform: Platform): string {
  return alternatives(spec).map((one) => stepsOf(one).map((step) => step.map((t) => keyText(t, platform)).join(platform === 'mac' ? '' : '+')).join(' ')).join(' or ')
}

/** `aria-keyshortcuts` for a spec: 'mod+k' → "Meta+K Control+K"; sequences are not expressible there, so they are left out. */
export function ariaKeys(spec: string): string | undefined {
  const out: string[] = []
  for (const one of alternatives(spec)) {
    if (one.startsWith('#')) { const d = one.slice(1); if (/^[0-9]$/.test(d)) out.push(d); continue }   // a tab's number
    const steps = stepsOf(one)
    if (steps.length !== 1) continue
    const keys = steps[0]!.map((t) => WORDS[t]?.aria ?? (t.length === 1 ? t.toUpperCase() : t))
    out.push(keys.join('+'))
    if (steps[0]!.includes('mod')) out.push(steps[0]!.map((t) => (t === 'mod' ? 'Control' : WORDS[t]?.aria ?? t.toUpperCase())).join('+'))
  }
  return out.length ? out.join(' ') : undefined
}

/** A single-character key with no ⌘/Ctrl/Alt — the kind WCAG 2.1.4 asks to be able to switch off. Arrows, ↵, Esc, Tab are not. */
export function isCharacterKey(spec: string): boolean {
  return alternatives(spec).every((one) => {
    if (/(^|\+)(mod|alt)(\+|$)/.test(one)) return false
    const last = stepsOf(one).pop()?.pop() ?? ''
    return last.length === 1 || last.startsWith('#')
  })
}
