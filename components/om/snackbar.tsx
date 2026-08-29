'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from './icon'
import { snackbarRise } from '@/lib/motion'
import styles from './snackbar.module.css'

type Snack = { id: number; message: string; actionLabel?: string; onAction?: () => void }
const SnackbarContext = createContext<(s: Omit<Snack, 'id'>) => void>(() => {})

export function useSnackbar() {
  return useContext(SnackbarContext)
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

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
    setSnacks((s) => s.filter((x) => x.id !== id))
  }, [])

  const show = useCallback((s: Omit<Snack, 'id'>) => {
    const id = nextId.current++
    setSnacks((prev) => [...prev.slice(-2), { ...s, id }])
    timers.current.set(id, setTimeout(() => dismiss(id), 4000))
  }, [dismiss])

  const pause = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) { clearTimeout(t); timers.current.delete(id) }
  }, [])
  const resume = useCallback((id: number) => {
    if (!timers.current.has(id)) timers.current.set(id, setTimeout(() => dismiss(id), 2000))
  }, [dismiss])

  return (
    <SnackbarContext.Provider value={show}>
      {children}
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
                        onClick={() => { s.onAction?.(); dismiss(s.id) }}>
                  {s.actionLabel}
                </button>
              ) : null}
              <button type="button" className={styles.close} aria-label="Dismiss" onClick={() => dismiss(s.id)}>
                <Icon name="close" size={24} weight={300} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </SnackbarContext.Provider>
  )
}
