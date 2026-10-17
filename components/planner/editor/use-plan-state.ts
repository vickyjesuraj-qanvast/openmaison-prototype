'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlanDoc } from '@/lib/planner/model'
import { saveLayout } from '@/app/planner/actions'

/*
 * (gaps build J, J-Q11) The editor's plan with its history: every change is one Undo step — a drag is one, however many frames it took
 * (`live` changes ride on the step the gesture began with, `end` closes it) — 100 steps a visit. The plan saves itself 700 ms after the
 * last change (the Visualizer's "Saving… · Saved"); the save carries the rev it was made from and a newer one on the server is refused, so
 * two tabs never overwrite each other blind. A save that fails keeps the work on screen and says so in the stamp.
 */

const MAX = 100
export type SaveState = { saving: boolean; label: string | null; tone: 'ok' | 'warn' }
/** `quiet` — saved but never an Undo step (the 3D camera, Walls: Full · Low). */
export type Change = (fn: (p: PlanDoc) => PlanDoc, mode?: 'step' | 'live' | 'end' | 'quiet') => void

export function usePlanState(o: { id: string; plan: PlanDoc; rev: number; readOnly: boolean }) {
  const [hist, setHist] = useState<{ past: PlanDoc[]; present: PlanDoc; future: PlanDoc[] }>(() => ({ past: [], present: o.plan, future: [] }))
  /* the plan as a gesture began — its one Undo step */
  const gesture = useRef<PlanDoc | null>(null)
  const change: Change = useCallback((fn, mode = 'step') => {
    if (o.readOnly) return
    setHist((h) => {
      const next = fn(h.present)
      if (next === h.present) { if (mode === 'end') gesture.current = null; return h }
      if (mode === 'quiet') return { ...h, present: next }
      if (mode === 'live') {
        if (!gesture.current) gesture.current = h.present
        return { ...h, present: next }
      }
      const before = mode === 'end' && gesture.current ? gesture.current : h.present
      gesture.current = null
      return { past: [...h.past, before].slice(-MAX), present: next, future: [] }
    })
  }, [o.readOnly])
  /* a gesture that ended with nothing changed since its live frames: close it as one step */
  const endGesture = useCallback(() => {
    setHist((h) => {
      const g = gesture.current
      gesture.current = null
      if (!g || g === h.present) return h
      return { past: [...h.past, g].slice(-MAX), present: h.present, future: [] }
    })
  }, [])
  const undo = useCallback(() => setHist((h) => {
    if (gesture.current) return h
    const prev = h.past[h.past.length - 1]
    return prev ? { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] } : h
  }), [])
  const redo = useCallback(() => setHist((h) => {
    const next = h.future[0]
    return next ? { past: [...h.past, h.present], present: next, future: h.future.slice(1) } : h
  }), [])

  /* the autosave */
  const [save, setSave] = useState<SaveState>({ saving: false, label: null, tone: 'ok' })
  const rev = useRef(o.rev)
  const saved = useRef<PlanDoc>(o.plan)
  const latest = useRef<PlanDoc>(o.plan)
  const busy = useRef(false)
  const timer = useRef(0)
  const again = useRef<() => void>(() => {})
  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    if (busy.current || o.readOnly) return
    const plan = latest.current
    if (plan === saved.current) return
    busy.current = true
    setSave({ saving: true, label: null, tone: 'ok' })
    try {
      const r = await saveLayout(o.id, { rev: rev.current, plan })
      if ('error' in r) { setSave({ saving: false, label: r.stale ? 'Changed elsewhere — reload' : 'Not saved', tone: 'warn' }); return }
      rev.current = r.rev; saved.current = plan
      setSave({ saving: false, label: 'Saved', tone: 'ok' })
    } catch {
      setSave({ saving: false, label: 'Not saved — retrying', tone: 'warn' })
      timer.current = window.setTimeout(() => again.current(), 4000)
    } finally { busy.current = false }
    /* a change made while that save was on its way goes next */
    if (latest.current !== saved.current) timer.current = window.setTimeout(() => again.current(), 700)
  }, [o.id, o.readOnly])
  useEffect(() => { again.current = () => { void flush() } }, [flush])
  useEffect(() => {
    latest.current = hist.present
    if (hist.present === saved.current || gesture.current) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { void flush() }, 700)
  }, [hist, flush])   // the whole history: a drag's end leaves the plan as its last frame left it — only the history changes, and that must save
  useEffect(() => {
    const leave = () => { if (latest.current !== saved.current) void flush() }
    const hide = () => { if (document.visibilityState === 'hidden') leave() }
    window.addEventListener('pagehide', leave); document.addEventListener('visibilitychange', hide)
    return () => { window.removeEventListener('pagehide', leave); document.removeEventListener('visibilitychange', hide); window.clearTimeout(timer.current) }
  }, [flush])

  return { plan: hist.present, change, endGesture, undo, redo, canUndo: hist.past.length > 0, canRedo: hist.future.length > 0, save, flush, rev }
}
