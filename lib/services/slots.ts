/*
 * (pending modules S34 — her "build all of them" 2026-10-11; card api:message-delivery-providers, "the adapters' seams and their admin, for the
 * developers") THE SLOT EVERY REAL SERVICE PLUGS INTO. Pure and free of imports — the server, a route, a script and the browser can all read it.
 *
 * Each service the prototype stands in for (message delivery, sign-in codes, a studio's tenancy, payments, PDF files, file storage, calendars,
 * transcription, OpenMaison's feeds, Xero, (pending modules S37) Qanvast's listing API) keeps one slot here: its stand-in answers until the developers put a real adapter in with the
 * seam's own `set…` call (lib/services/registry.ts lists every one, its contract and its call). The slots live on `globalThis` under one
 * symbol, so ONE process has ONE answer even when Next bundles a seam's module twice (a route, an action and `instrumentation.ts` each get
 * their own copy of a module — a plain `let adapter` set in one copy is never seen by the others; lib/db/index.ts keeps its open studio the
 * same way, for the same reason).
 */

/** Every service with a slot. The registry (lib/services/registry.ts) describes each. */
export type ServiceKey = 'delivery' | 'sign-in' | 'studios' | 'payments' | 'pdf' | 'storage' | 'calendar' | 'transcription' | 'feeds' | 'accounting' | 'qanvast'
  /* (pending modules S36) the website's AI Visualizer trial: bot protection (Turnstile) and a lasting store for its per-address limit */
  | 'bot-check' | 'limit-store'
  /* (pending modules S41b-3) the website's no-account tools: where a visitor's anonymous workspace is kept until they sign up (1.0's anon_workspaces) */
  | 'trial'
  /* (pending modules S41b-5) Qanvast's own API for the studio's account: its lead credits, contracts and statement, its reviews (and the replies
     to them), its rank and what homeowners told Qanvast (lib/qanvast-account/service.ts) — 1.0 read them live through its proxy api/qanvast/[...path] */
  | 'qanvast-account'
/* (pending modules S37) `qanvast` — Qanvast's own API for the studio's listing: an application sent for review, withdrawn, and the answer read
   off its webhook (lib/qanvast-listing/service.ts) */
export const SLOT_KEYS: readonly ServiceKey[] = ['delivery', 'sign-in', 'studios', 'payments', 'pdf', 'storage', 'calendar', 'transcription', 'feeds', 'accounting', 'qanvast', 'bot-check', 'limit-store', 'trial', 'qanvast-account']

/** Whatever plugs in names itself — Sent messages, the ops report and the logs say which adapter answered. */
export type Named = { name: string }

const BOX = Symbol.for('openmaison.services.v1')
type Box = Map<ServiceKey, Named>
function box(): Box {
  const g = globalThis as unknown as Record<symbol, Box | undefined>
  return (g[BOX] ??= new Map())
}

export type Slot<T extends Named> = {
  /** The adapter answering now — the developers' once set, else the stand-in. Read it at the moment of use, never keep it. */
  use(): T
  /** PRODUCTION: plug the real adapter in once, at start-up (lib/services/install.ts). */
  set(adapter: T): void
  /** Back to the stand-in (a test that swapped one in puts it back). */
  reset(): void
  /** Whether the stand-in still answers — the screens that say "Simulated on this prototype" ask this. */
  standIn(): boolean
  /** The prototype's own adapter. */
  readonly stand: T
}

export function serviceSlot<T extends Named>(key: ServiceKey, stand: T): Slot<T> {
  return {
    stand,
    use: () => (box().get(key) as T | undefined) ?? stand,
    set: (adapter) => { box().set(key, adapter) },
    reset: () => { box().delete(key) },
    standIn: () => !box().has(key),
  }
}

/** Whether a real adapter is plugged into `key` (no import of the seam's module needed). */
export const isPlugged = (key: ServiceKey): boolean => box().has(key)
/** The plugged adapter's name, or null while the stand-in answers. */
export const pluggedName = (key: ServiceKey): string | null => box().get(key)?.name ?? null
