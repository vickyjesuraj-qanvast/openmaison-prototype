'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from './icon'
import { Tooltip } from './tooltip'
import { snackbarRise } from '@/lib/motion'
import styles from './snackbar.module.css'

type Snack = {
  /** (REG-715) a message may carry key chips — the keyboard tips (`<Keys>`) */
  id: number; message: ReactNode; actionLabel?: string; onAction?: () => void
  /** (wave E, surfaces-10) A snackbar with a key replaces the one on screen with the same key — its words, its action and its four
      seconds — in place, instead of stacking a second one whose action is out of date. Without a key, snackbars stack as before. */
  key?: string
}
const SnackbarContext = createContext<(s: Omit<Snack, 'id'>) => void>(() => {})
const DismissContext = createContext<(key: string) => void>(() => {})
/** (REG-712) ⌘Z presses the newest snackbar's Undo — true when there was one. */
const UndoContext = createContext<() => boolean>(() => false)

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

/** Convenience for decision N2: every inert affordance answers with this. */
export function useComingSoon() {
  const show = useSnackbar()
  return useCallback(() => show({ message: 'Coming soon in OpenMaison 2.0' }), [show])
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snacks, setSnacks] = useState<Snack[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  /** A keyed snackbar's id while it is on screen (surfaces-10). */
  const keyed = useRef(new Map<string, number>())

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
    for (const [k, v] of keyed.current) if (v === id) keyed.current.delete(k)
    setSnacks((s) => s.filter((x) => x.id !== id))
  }, [])

  const show = useCallback((s: Omit<Snack, 'id'>) => {
    const was = s.key !== undefined ? keyed.current.get(s.key) : undefined
    const id = was ?? nextId.current++
    if (s.key !== undefined) keyed.current.set(s.key, id)
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    /* the same id keeps its place (and its motion) — only its words and action change; one dropped off the stack comes back as new */
    setSnacks((prev) => (prev.some((x) => x.id === id) ? prev.map((x) => (x.id === id ? { ...s, id } : x)) : [...prev.slice(-2), { ...s, id }]))
    timers.current.set(id, setTimeout(() => dismiss(id), 4000))
  }, [dismiss])

  /* '*' withdraws every snackbar on screen — a page's snackbars when a dialog or a sheet opens over the page (the editor) */
  const dismissKey = useCallback((k: string) => {
    if (k === '*') { for (const t of timers.current.values()) clearTimeout(t); timers.current.clear(); keyed.current.clear(); setSnacks([]); return }
    const id = keyed.current.get(k); if (id !== undefined) dismiss(id)
  }, [dismiss])

  const pause = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) { clearTimeout(t); timers.current.delete(id) }
  }, [])
  const resume = useCallback((id: number) => {
    if (!timers.current.has(id)) timers.current.set(id, setTimeout(() => dismiss(id), 2000))
  }, [dismiss])

  /* (REG-712) ⌘Z answers the Undo on screen — the newest one — exactly as its button does */
  const onScreen = useRef<Snack[]>([])
  useEffect(() => { onScreen.current = snacks }, [snacks])
  const runUndo = useCallback(() => {
    const s = [...onScreen.current].reverse().find((x) => x.actionLabel === 'Undo' && x.onAction)
    if (!s) return false
    dismiss(s.id); s.onAction?.()
    return true
  }, [dismiss])

  return (
    <SnackbarContext.Provider value={show}>
      <DismissContext.Provider value={dismissKey}><UndoContext.Provider value={runUndo}>{children}</UndoContext.Provider></DismissContext.Provider>
      <div className={styles.host} role="status" aria-live="polite">
        <AnimatePresence>
          {snacks.map((s) => (
            <motion.div
              key={s.id}
              className={styles.bar}
              variants={snackbarRise}
              initial="initial"
              animate="animate"
              exit="exit"
              onMouseEnter={() => pause(s.id)}
              onMouseLeave={() => resume(s.id)}
            >
              <span>{s.message}</span>
              {s.actionLabel ? (
                <button type="button" className={styles.action}
                        onClick={() => { dismiss(s.id); s.onAction?.() }}>
                  {s.actionLabel}
                </button>
              ) : null}
              <Tooltip label="Dismiss" side="top">
                <button type="button" className={styles.close} aria-label="Dismiss" onClick={() => dismiss(s.id)}>
                  <Icon name="close" size={24} weight={300} />
                </button>
              </Tooltip>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </SnackbarContext.Provider>
  )
}
