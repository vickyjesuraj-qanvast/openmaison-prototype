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
 * "Couldn’t <what> — please try again" on failure (or, F129, "Couldn’t <what> — <the rule that refused it>"); it resolves `true` on success so callers can chain navigation.
 * Lives beside the tab that the others were copied from; the natural home is components/om next to `useSnackbar`.
 */
/**
 * (audit 2026-09-26, F129 / F204) Why an action was refused, when it says so in words the viewer can read: an `{ error }` it
 * answered, or an Error a caller threw with a studio rule ("Only whoever made it, an Owner or an Admin can …"). A production
 * server action's own throw arrives redacted ("An error occurred in the Server Components render …") and a code such as
 * 'too-large' is not a sentence — both fall back to "please try again".
 */
export function refusalOf(e: unknown): string | null {
  const m = typeof e === 'string' ? e : e instanceof Error ? e.message : e && typeof e === 'object' && 'error' in e && typeof e.error === 'string' ? e.error : ''
  const t = m.trim()
  if (!t || t.length > 160 || !/\s/.test(t) || !/^[A-Z‘“]/.test(t)) return null
  if (/server components|digest|omitted|fetch|network|failed to|unexpected|undefined|null|\bat \w+ \(/i.test(t)) return null
  return t
}
/** "Couldn’t <what> — <reason>" (the rule's first letter lowered, its full stop dropped), or the house "please try again". A reason that
 *  already says what failed ("Couldn’t …", "Nothing was deleted — …") is the whole line on its own. */
export const couldnt = (what: string, reason?: string | null) => {
  if (!reason) return `Couldn’t ${what} — please try again`
  const line = reason.replace(/\.$/, '')
  if (/^(Couldn’t|Nothing )/.test(line) || line.includes(' — ')) return line
  return `Couldn’t ${what} — ${line.replace(/^./, (c) => c.toLowerCase())}`
}

export function useRun() {
  const router = useRouter()
  const snackbar = useSnackbar()
  const inflight = useRef<Set<string>>(new Set())
  const fail = (what: string, reason?: string | null) => snackbar({ message: couldnt(what, reason) })
  const refresh = () => router.refresh()
  const run = async (what: string, fn: () => Promise<unknown>, done?: string | Snack, opts?: RunOptions): Promise<boolean> => {
    const key = opts?.guard
    if (key) {
      if (inflight.current.has(key)) return false
      inflight.current.add(key)
    }
    try {
      const r: unknown = await fn()
      /* (F129) An action that answers `{ error: '…' }` refused: say so, with its reason, instead of the success line. */
      if (r && typeof r === 'object' && 'error' in r && typeof r.error === 'string' && r.error) {
        fail(what, refusalOf(r.error))
        /* (fix-E, E-31) a page left open while its project was completed elsewhere: the refusal says so, and the page reads itself again —
           into its completed state — instead of keeping its live buttons */
        if (/^(This|The) project is complete/.test(r.error)) refresh()
        return false
      }
      if (done) snackbar(typeof done === 'string' ? { message: done } : done)
      if (opts?.refresh) refresh()
      return true
    } catch (e) {
      fail(what, refusalOf(e))   // (F129 / F204) a thrown studio rule reaches the viewer; anything else stays "please try again"
      return false
    } finally {
      if (key) inflight.current.delete(key)
    }
  }
  return { run, fail, refresh }
}
