import 'server-only'

/*
 * (pending modules S30 — card onboarding:studio-sign-in, "Repeated attempts slowed down"; 1.0's src/lib/rate-limit.ts) At most five tries a
 * minute — 1.0's figures for asking for a code and for checking one. 1.0 counted per address (IP); every tester of the prototype shares one,
 * so this counts per number or email typed (what a code provider bills, and what spares a person a flood of codes). In memory, like 1.0's:
 * one server's count. PRODUCTION: the developers put a shared limit (and the visitor's real address behind the proxy) in front of the real
 * provider; the client portal's code step keeps S13's call until then (its stand-in sends nothing and checks nothing).
 */

const WINDOW_MS = 60_000
const DAY_MS = 86_400_000   // (pending modules S41b-3) the longest window a caller counts over
const MAX = 5
const hits = new Map<string, number[]>()
let calls = 0

/** Counts one try for `key`; false when it is one too many in the last minute. `max` = the tries a minute allows (five unless a caller
    carries 1.0's own figure — the website's Book a demo allowed ten, pending modules S35). (pending modules S41b-3) `windowMs` — a count over
    another window (the no-account trial's new workspaces: 25 a day from one address, 1.0's IP ceiling); a minute unless given. */
export function takeTry(key: string, now = Date.now(), max = MAX, windowMs = WINDOW_MS): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (++calls >= 200) {   // sweep the stale keys now and then, so the map never grows without end (a minute's keys; a longer window keeps its own)
    calls = 0
    for (const [k, ts] of hits) if (k !== key && !ts.some((t) => now - t < Math.max(WINDOW_MS, DAY_MS))) hits.delete(k)
  }
  if (recent.length >= max) { hits.set(key, recent); return false }
  recent.push(now)
  hits.set(key, recent)
  return true
}
