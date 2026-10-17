import 'server-only'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { createClient, type Client } from '@libsql/client'
import { demoDatabase } from '@/lib/db'
import { BUSY_WAIT_MS, guardLocalFile } from '@/lib/db/local-file'
import { serviceSlot } from '@/lib/services/slots'
import type { TrialPayload } from './policy'

/*
 * (pending modules S41b-3 — 1.0's scripts/migrations/315_anon_workspaces.sql · 316_anon_token_fns.sql, src/lib/anon/workspace.ts) WHERE A
 * VISITOR'S ANONYMOUS WORKSPACE IS KEPT — 1.0's one table, its columns as they were:
 *
 *   anon_workspaces ( anon_id PRIMARY KEY · payload (JSON, namespaced by surface) · spent_tokens (≥ 0) · created_at · expires_at )  + an index
 *   on expires_at (the sweep's only query).
 *
 * 1.0 kept it beside the tenant graph with no foreign key into it ("disposable by construction" — a visitor is not a studio). 2.0 keeps one
 * studio per database, so the honest place is the same: NOT a studio's database (never the demo's, never a new one's) — on this prototype a
 * database file of its own beside the demo's, `<the demo's file>.trial.db` (git-ignored, like S31's studios), made on first use with this one
 * table. A remote database (Turso) has no folder beside it, and there the store is not ready: the tools say the trial isn't available, as
 * signing up says a studio needs the developers' tenancy. PRODUCTION: the developers' platform database keeps the same table
 * (`setTrialStore`, lib/services/registry.ts `trial-workspaces`) — nothing else reads it.
 *
 * 1.0's rules kept: a row is dead the moment it expires whether or not the sweep has run (every read filters on expires_at); the token spend
 * is ONE conditional update (1.0's anon_spend_tokens — ten at once against a grant of 50 yield exactly five winners); a payload write is a
 * whole-object rewrite (1.0's — a partial path write once wiped a column), made a compare-and-set here, so two writes at once never lose one.
 */

export type WorkspaceRow = { id: string; payload: TrialPayload; raw: string; spentTokens: number; createdAt: number; expiresAt: number }
export type SpendAnswer = { ok: true; spentAfter: number } | { ok: false; reason: 'quota' | 'gone'; spentAfter: number }

export type TrialStore = {
  name: string
  /** whether this server can keep workspaces (the stand-in needs a database file beside the demo's) */
  ready(): boolean
  create(id: string, now: number, expiresAt: number): Promise<boolean>
  /** the live row, or null when it is missing or expired */
  get(id: string, now: number): Promise<WorkspaceRow | null>
  /** the payload replaced whole — only if it is still `was` (a compare-and-set); false when it changed meanwhile or the row is gone */
  write(id: string, was: string, payload: TrialPayload, now: number): Promise<boolean>
  /** 1.0's anon_spend_tokens: one conditional update — never past `grant`, never on an expired row */
  spend(id: string, tokens: number, grant: number, now: number): Promise<SpendAnswer>
  /** 1.0's anon_refund_tokens: the work failed after the spend */
  refund(id: string, tokens: number): Promise<void>
  remove(id: string): Promise<void>
  /** expired workspaces' ids, oldest first, at most `limit` — the sweep deletes each in turn (1.0's per-id shape) */
  expired(now: number, limit: number): Promise<string[]>
  /** the room a deleted workspace leaves, given back (1.0's anon-storage-gc, for the files it kept) — how much was reclaimed */
  reclaim(): Promise<{ reclaimed: number; unit: string }>
  /** every workspace gone (Reset prototype to base: the base keeps no visitor's work) */
  clear(): Promise<number>
  /** how many live workspaces it holds (the ops report and the probe) */
  count(now: number): Promise<number>
}

/* ── the prototype's store: a database file beside the demo's ── */
export function trialStoreFile(): string | null {
  const u = demoDatabase.url
  if (!u.startsWith('file:')) return null
  return `${path.resolve(u.slice('file:'.length).split('?')[0]!)}.trial.db`
}
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS anon_workspaces (
     anon_id      TEXT PRIMARY KEY,
     payload      TEXT NOT NULL DEFAULT '{}',
     spent_tokens INTEGER NOT NULL DEFAULT 0 CHECK (spent_tokens >= 0),
     created_at   INTEGER NOT NULL,
     expires_at   INTEGER NOT NULL
   )`,
  'CREATE INDEX IF NOT EXISTS anon_workspaces_expires_at_idx ON anon_workspaces (expires_at)',
]
const g = globalThis as unknown as { __openmaisonTrialStore?: { file: string; client: Client; made: Promise<void> } | null }
/** The store's database — made only by a workspace's making (`make`): a page view, a sweep or a Reset on a server where no visitor has saved
    anything yet finds no file and answers "nothing", so no empty store file appears beside a database nobody tried the tools on. */
async function open(make = false): Promise<Client | null> {
  const file = trialStoreFile()
  if (!file) return null
  if (!make && g.__openmaisonTrialStore?.file !== file && !existsSync(file)) return null
  let s = g.__openmaisonTrialStore
  if (!s || s.file !== file) {
    const client = guardLocalFile(createClient({ url: `file:${file}`, timeout: BUSY_WAIT_MS }), `file:${file}`)
    s = { file, client, made: (async () => { for (const q of SCHEMA) await client.execute(q) })() }
    g.__openmaisonTrialStore = s
  }
  try { await s.made } catch (e) { g.__openmaisonTrialStore = null; throw e }
  return s.client
}
const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : Number(v ?? 0))
function parsePayload(raw: string): TrialPayload {
  try { const v = JSON.parse(raw) as unknown; return v && typeof v === 'object' && !Array.isArray(v) ? (v as TrialPayload) : {} } catch { return {} }
}

const PROTOTYPE: TrialStore = {
  name: 'prototype',
  ready: () => trialStoreFile() !== null,
  async create(id, now, expiresAt) {
    const c = await open(true); if (!c) return false
    await c.execute({ sql: 'INSERT INTO anon_workspaces (anon_id, payload, spent_tokens, created_at, expires_at) VALUES (?, ?, 0, ?, ?)', args: [id, '{}', now, expiresAt] })
    return true
  },
  async get(id, now) {
    const c = await open(); if (!c) return null
    const r = await c.execute({ sql: 'SELECT anon_id, payload, spent_tokens, created_at, expires_at FROM anon_workspaces WHERE anon_id = ? AND expires_at > ?', args: [id, now] })
    const row = r.rows[0]
    if (!row) return null
    const raw = String(row.payload ?? '{}')
    return { id: String(row.anon_id), payload: parsePayload(raw), raw, spentTokens: num(row.spent_tokens), createdAt: num(row.created_at), expiresAt: num(row.expires_at) }
  },
  async write(id, was, payload, now) {
    const c = await open(); if (!c) return false
    const r = await c.execute({ sql: 'UPDATE anon_workspaces SET payload = ? WHERE anon_id = ? AND payload = ? AND expires_at > ?', args: [JSON.stringify(payload), id, was, now] })
    return r.rowsAffected === 1
  },
  async spend(id, tokens, grant, now) {
    const c = await open(); if (!c) return { ok: false, reason: 'gone', spentAfter: 0 }
    if (!(tokens > 0)) return { ok: true, spentAfter: 0 }
    const r = await c.execute({ sql: 'UPDATE anon_workspaces SET spent_tokens = spent_tokens + ? WHERE anon_id = ? AND expires_at > ? AND spent_tokens + ? <= ? RETURNING spent_tokens', args: [tokens, id, now, tokens, grant] })
    if (r.rows[0]) return { ok: true, spentAfter: num(r.rows[0].spent_tokens) }
    const left = await c.execute({ sql: 'SELECT spent_tokens FROM anon_workspaces WHERE anon_id = ? AND expires_at > ?', args: [id, now] })
    return left.rows[0] ? { ok: false, reason: 'quota', spentAfter: num(left.rows[0].spent_tokens) } : { ok: false, reason: 'gone', spentAfter: 0 }
  },
  async refund(id, tokens) {
    const c = await open(); if (!c || !(tokens > 0)) return
    await c.execute({ sql: 'UPDATE anon_workspaces SET spent_tokens = MAX(0, spent_tokens - ?) WHERE anon_id = ?', args: [tokens, id] })
  },
  async remove(id) {
    const c = await open(); if (!c) return
    await c.execute({ sql: 'DELETE FROM anon_workspaces WHERE anon_id = ?', args: [id] })
  },
  async expired(now, limit) {
    const c = await open(); if (!c) return []
    const r = await c.execute({ sql: 'SELECT anon_id FROM anon_workspaces WHERE expires_at <= ? ORDER BY expires_at ASC LIMIT ?', args: [now, limit] })
    return r.rows.map((x) => String(x.anon_id))
  },
  /* the stand-in keeps no file of a visitor's (the photo and the quotes are read in their browser — only the lines a reading made travel), so
     what a deleted workspace leaves is the room its row took in this file: given back once there is any (SQLite's free pages) */
  async reclaim() {
    const c = await open(); if (!c) return { reclaimed: 0, unit: 'pages' }
    const free = num((await c.execute('PRAGMA freelist_count')).rows[0]?.[0])
    if (free > 0) await c.execute('VACUUM')
    return { reclaimed: free, unit: 'pages' }
  },
  async clear() {
    const c = await open(); if (!c) return 0
    const n = num((await c.execute('SELECT count(*) FROM anon_workspaces')).rows[0]?.[0])
    await c.execute('DELETE FROM anon_workspaces')
    return n
  },
  async count(now) {
    const c = await open(); if (!c) return 0
    return num((await c.execute({ sql: 'SELECT count(*) FROM anon_workspaces WHERE expires_at > ?', args: [now] })).rows[0]?.[0])
  },
}

/* (lib/services/slots.ts) on globalThis, so the store set at start-up is the one every bundle asks */
const slot = serviceSlot<TrialStore>('trial', PROTOTYPE)
/** The store answering now — the developers' once set, else this prototype's own file. */
export const trialStore = (): TrialStore => slot.use()
/** The developers' call at start-up (lib/services/install.ts): their platform database keeps the visitors' workspaces. */
export function setTrialStore(s: TrialStore): void { slot.set(s) }
export const trialStoreIsStandIn = (): boolean => slot.standIn()
