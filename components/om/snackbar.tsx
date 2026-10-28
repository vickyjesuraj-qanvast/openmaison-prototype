'use client'

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { usePathname, useRouter } from 'next/navigation'
import { Icon } from './icon'
import { Tooltip } from './tooltip'
import { snackbarRise } from '@/lib/motion'
import styles from './snackbar.module.css'

type Snack = {
  /** (REG-715) a message may carry key chips — the keyboard tips (`<Keys>`) */
  id: number; message: ReactNode; actionLabel?: string; onAction?: () => void
  /** (wave E, surfaces-10) A snackbar with a key replaces the one on screen with the same key — its words, its action and its clock —
      in place, instead of stacking a second one whose action is out of date. Without a key, snackbars stack as before. */
  key?: string
  /** (REG-898) Which showing this is: a keyed snackbar replaced in place starts its clock again. */
  rev: number
}
type SnackInput = Omit<Snack, 'id' | 'rev'>
const SnackbarContext = createContext<(s: SnackInput) => void>(() => {})
const DismissContext = createContext<(key: string) => void>(() => {})
/** (REG-712) ⌘Z presses the newest snackbar's Undo — true when there was one. */
const UndoContext = createContext<() => boolean>(() => false)
/** (the calm UI build 2026-10-27 — the audit's 2-44) Esc dismisses the newest snackbar first — true when there was one. */
const NewestContext = createContext<() => boolean>(() => false)

export function useSnackbar() {
  return useContext(SnackbarContext)
}
/** (audit 2026-09-26, round 3) Withdraw the keyed snackbar on screen, if any — e.g. "V3 is ready" when Present opens over it; `'*'` withdraws them all. */
export function useSnackbarDismiss() {
  return useContext(DismissContext)
}

/** (REG-712) The key layer's ⌘Z: presses the Undo of the newest snackbar that offers one, and says whether it did. */
export function useRunUndo() {
  return useContext(UndoContext)
}

/** (the calm UI build 2026-10-27 — the audit's 2-44, additive) The key layer's Esc: dismisses the newest snackbar on screen, and says whether
    it did — so the first Esc closes the message and only a second one goes Back. */
export function useDismissNewest() {
  return useContext(NewestContext)
}

/** Convenience for decision N2: every inert affordance answers with this. */
export function useComingSoon() {
  const show = useSnackbar()
  return useCallback(() => show({ message: 'Coming soon in OpenMaison 2.0' }), [show])
}

/* (Dane UAT 3.23) A snackbar for the page a navigation lands on — "Saved as a draft" said on the gallery after the template editor's Back.
   The editors and the shell each mount their own host, so the words ride in sessionStorage with the path they are for; the host shows
   them once when that path is the one it is on, and a stale or unread one is dropped. */
const CARRY = 'om.snack.carry'
type Carried = { path: string; message: string; at: number; /** (S42E, E-14) one way on from the page it lands on — "Open Leads" */ action?: { label: string; href: string } }
export function carrySnackbar(to: string, message: string, action?: { label: string; href: string }) {
  try { sessionStorage.setItem(CARRY, JSON.stringify({ path: to.split(/[?#]/)[0] ?? to, message, at: Date.now(), ...(action ? { action } : {}) } satisfies Carried)) } catch { /* a private window: the page opens without it */ }
}
const readCarried = (): Carried | null => { try { const v = JSON.parse(sessionStorage.getItem(CARRY) ?? 'null') as Partial<Carried> | null; return v && typeof v.path === 'string' && typeof v.message === 'string' && typeof v.at === 'number' ? (v as Carried) : null } catch { return null } }

/*
 * (REG-898, Dane UAT 6.26 · 6.28 · 9.08 · 7.13 — "a popup instead of a toast": messages went before he had read them) How long a
 * snackbar stays. The house rule (Vicky 2026-10-01): a snackbar confirms what happened and may carry one next step or Undo; it is never
 * the only place something you must act on is said — a warning that should change a decision lives inline, where the decision is made.
 *   · 4 s for a plain one-line message; 8 s when it carries an action or its words wrap to a second line.
 *   · The clock stops while the pointer rests on it, while a finger or a button is held down on it, and while focus is inside it (a
 *     keyboard user tabbing to its action); it runs on afterwards with what was left, never less than 2 s.
 */
const SHORT_MS = 4000
const LONG_MS = 8000
/** (Leads on the move, B-15) A phone or a tablet — where one snackbar shows at a time (REG-315's tablet end, 1024). Read on the press, never in render. */
const oneAtATime = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches
const AFTER_HOLD_MS = 2000
type Hold = 'hover' | 'press' | 'focus'

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snacks, setSnacks] = useState<Snack[]>([])
  const nextId = useRef(1)
  const nextRev = useRef(1)
  /** A keyed snackbar's id while it is on screen (surfaces-10). */
  const keyed = useRef(new Map<string, number>())

  const dismiss = useCallback((id: number) => {
    for (const [k, v] of keyed.current) if (v === id) keyed.current.delete(k)
    setSnacks((s) => s.filter((x) => x.id !== id))
  }, [])

  const show = useCallback((s: SnackInput) => {
    const was = s.key !== undefined ? keyed.current.get(s.key) : undefined
    const id = was ?? nextId.current++
    const rev = nextRev.current++
    if (s.key !== undefined) keyed.current.set(s.key, id)
    /* (Leads on the move, B-15 — his marks 2026-10-23, a house rule) On a phone and a tablet (≤1024) ONE snackbar shows at a time: a new one
       replaces the one on screen, and its Undo goes with it — two stacked bars were 112px over the page, and the older Undo undid a move that
       was already over. The desk keeps the mock's stack of three. */
    if (oneAtATime()) {
      for (const [k, v] of keyed.current) if (v !== id) keyed.current.delete(k)
      setSnacks([{ ...s, id, rev }])
      return
    }
    /* the same id keeps its place (and its motion) — only its words, its action and its clock change; one dropped off the stack comes back as new */
    setSnacks((prev) => (prev.some((x) => x.id === id) ? prev.map((x) => (x.id === id ? { ...s, id, rev } : x)) : [...prev.slice(-2), { ...s, id, rev }]))
  }, [])

  /* '*' withdraws every snackbar on screen — a page's snackbars when a dialog or a sheet opens over the page (the editor) */
  const dismissKey = useCallback((k: string) => {
    if (k === '*') { keyed.current.clear(); setSnacks([]); return }
    const id = keyed.current.get(k); if (id !== undefined) dismiss(id)
  }, [dismiss])

  /* (Dane UAT 3.23) the carried snackbar, once, on the page it was meant for — after the paint, so the page's own first snackbars are not lost */
  const pathname = usePathname()
  const router = useRouter()
  useEffect(() => {
    const c = readCarried()
    if (!c || c.path !== pathname) return
    const t = setTimeout(() => {
      const now = readCarried()
      if (!now || now.at !== c.at) return
      try { sessionStorage.removeItem(CARRY) } catch { /* private window */ }
      const go = now.action && typeof now.action.label === 'string' && typeof now.action.href === 'string' ? now.action : null
      if (Date.now() - now.at < 15_000) show({ message: now.message, ...(go ? { actionLabel: go.label, onAction: () => router.push(go.href) } : {}) })
    }, 0)
    return () => clearTimeout(t)
  }, [pathname, show, router])

  /* (REG-712) ⌘Z answers the Undo on screen — the newest one — exactly as its button does */
  const onScreen = useRef<Snack[]>([])
  useEffect(() => { onScreen.current = snacks }, [snacks])
  const runUndo = useCallback(() => {
    const s = [...onScreen.current].reverse().find((x) => x.actionLabel === 'Undo' && x.onAction)
    if (!s) return false
    dismiss(s.id); s.onAction?.()
    return true
  }, [dismiss])
  const dismissNewest = useCallback(() => {
    const s = onScreen.current[onScreen.current.length - 1]
    if (!s) return false
    dismiss(s.id)
    return true
  }, [dismiss])

  return (
    <SnackbarContext.Provider value={show}>
      <DismissContext.Provider value={dismissKey}><UndoContext.Provider value={runUndo}><NewestContext.Provider value={dismissNewest}>{children}</NewestContext.Provider></UndoContext.Provider></DismissContext.Provider>
      <div className={styles.host} role="status" aria-live="polite" data-om-snackbar="">{/* (simplify round 2) an open menu or panel (the bell) treats a press here as its own: Undo keeps it open */}
        <AnimatePresence>
          {snacks.map((s) => <SnackBar key={s.id} s={s} onDismiss={dismiss} />)}
        </AnimatePresence>
      </div>
    </SnackbarContext.Provider>
  )
}

/** One snackbar and its own clock (REG-898). */
function SnackBar({ s, onDismiss }: { s: Snack; onDismiss: (id: number) => void }) {
  const { id, rev, actionLabel } = s
  const text = useRef<HTMLSpanElement>(null)
  const clock = useRef<{ timer: ReturnType<typeof setTimeout> | null; left: number; since: number; holds: Set<Hold>; up: (() => void) | null }>(
    { timer: null, left: SHORT_MS, since: 0, holds: new Set(), up: null },
  )

  const start = useCallback(() => {
    const c = clock.current
    if (c.timer || c.holds.size) return
    c.since = performance.now()
    c.timer = setTimeout(() => { c.timer = null; onDismiss(id) }, c.left)
  }, [id, onDismiss])
  const hold = useCallback((h: Hold) => {
    const c = clock.current
    if (c.holds.has(h)) return
    c.holds.add(h)
    if (c.timer) { clearTimeout(c.timer); c.timer = null; c.left = Math.max(0, c.left - (performance.now() - c.since)) }
  }, [])
  const release = useCallback((h: Hold) => {
    const c = clock.current
    if (!c.holds.delete(h) || c.holds.size) return
    c.left = Math.max(c.left, AFTER_HOLD_MS)
    start()
  }, [start])
  /** A finger or a button held down on the bar: the clock waits for its release, wherever it lands. */
  const press = () => {
    const c = clock.current
    if (c.up) return
    hold('press')
    const up = () => {
      window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', up, true)
      c.up = null
      release('press')
    }
    c.up = up
    window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true)
  }

  /* Each showing starts the clock — 8 s with an action or when the words wrap (measured once it is laid out), else 4 s. */
  useLayoutEffect(() => {
    const c = clock.current
    const el = text.current
    const line = el ? Number.parseFloat(getComputedStyle(el).lineHeight) || 20 : 20
    const wraps = !!el && el.offsetHeight > line * 1.5
    if (c.timer) { clearTimeout(c.timer); c.timer = null }
    c.left = actionLabel || wraps ? LONG_MS : SHORT_MS
    start()
    return () => { if (c.timer) { clearTimeout(c.timer); c.timer = null } }
  }, [rev, actionLabel, start])
  /* gone while a finger was still down: its release listener goes with it */
  useEffect(() => {
    const c = clock.current
    return () => { if (c.up) { window.removeEventListener('pointerup', c.up, true); window.removeEventListener('pointercancel', c.up, true); c.up = null } }
  }, [])

  return (
    <motion.div
      className={styles.bar}
      variants={snackbarRise}
      initial="initial"
      animate="animate"
      exit="exit"
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') hold('hover') }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') release('hover') }}
      onPointerDown={press}
      onFocus={() => hold('focus')}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) release('focus') }}
    >
      <span ref={text}>{s.message}</span>
      {actionLabel ? (
        <button type="button" className={styles.action}
                onClick={() => { onDismiss(id); s.onAction?.() }}>
          {actionLabel}
        </button>
      ) : null}
      <Tooltip label="Dismiss" side="top">
        <button type="button" className={styles.close} aria-label="Dismiss" onClick={() => onDismiss(id)}>
          <Icon name="close" size={24} weight={300} />
        </button>
      </Tooltip>
    </motion.div>
  )
}
