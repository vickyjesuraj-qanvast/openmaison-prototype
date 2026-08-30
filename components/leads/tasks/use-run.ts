'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'

type Snack = Parameters<ReturnType<typeof useSnackbar>>[0]

export type RunOptions = {
  /**
   * Re-render the route from the client once the action settles. Only for actions whose server side does NOT
   * `revalidatePath` the current route (e.g. tasks-actions `createTag` / `saveTemplate` revalidate `/leads` alone, and
   * files-actions never revalidates the viewer route) — an action that revalidates the current route already returns
   * the fresh RSC payload in its own response, so a second `router.refresh()` would render the page twice (PERF-04).
   */
  refresh?: boolean
  /** Re-entrancy guard: while a call with this key is in flight, another call with the same key is dropped (RACE-05). */
  guard?: string
}

/**
 * The Lead Details tabs' action runner (audit 2026-08-30, DUP-03): one `run` / `fail` / `refresh` trio for every
 * orchestrator instead of a copy per tab. `run(what, fn, done?, opts?)` awaits the server action, shows `done` on
 * success (a string, or a full snack so an Undo can ride with it — RACE-03) and the listing's
 * "Couldn’t <what> — please try again" on failure; it resolves `true` on success so callers can chain navigation.
 * Lives beside the tab that the others were copied from; the natural home is components/om next to `useSnackbar`.
 */
export function useRun() {
  const router = useRouter()
  const snackbar = useSnackbar()
  const inflight = useRef<Set<string>>(new Set())
  const fail = (what: string) => snackbar({ message: `Couldn’t ${what} — please try again` })
  const refresh = () => router.refresh()
  const run = async (what: string, fn: () => Promise<unknown>, done?: string | Snack, opts?: RunOptions): Promise<boolean> => {
    const key = opts?.guard
    if (key) {
      if (inflight.current.has(key)) return false
      inflight.current.add(key)
    }
    try {
      await fn()
      if (done) snackbar(typeof done === 'string' ? { message: done } : done)
      if (opts?.refresh) refresh()
      return true
    } catch {
      fail(what)
      return false
    } finally {
      if (key) inflight.current.delete(key)
    }
  }
  return { run, fail, refresh }
}
