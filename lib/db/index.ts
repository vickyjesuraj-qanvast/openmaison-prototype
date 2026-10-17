import { createClient, type Client, type InArgs, type InStatement, type ResultSet, type Transaction, type TransactionMode } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { BUSY_WAIT_MS, guardLocalFile } from './local-file'
import * as schema from './schema'

/*
 * The demo file is the default ONLY outside production (REG-285). It used to be the default everywhere, so a
 * deploy with a missing or misspelled DATABASE_URL did not fail — it booted happily against `file:./local.db`,
 * which in a container is an empty database and on a machine with the repo checked out is the DEMO data. Both
 * look like a working app serving the wrong records, which is the worst way for this to go wrong. In
 * production the variable is required and its absence stops the process with a message that names the fix.
 */
/* `next build` compiles route modules with NODE_ENV=production but no runtime config, so the check must not
   fire during the build — only when the server actually serves. */
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
const mustHaveConfig = process.env.NODE_ENV === 'production' && !isBuild
if (mustHaveConfig && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Point it at your libSQL/Turso database (and set DATABASE_AUTH_TOKEN for a remote one).')
}
const url = process.env.DATABASE_URL ?? 'file:./local.db'
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined
/* A remote libSQL URL without a token authenticates as nobody and fails at the first query with an opaque
   error; say so at boot instead. A local `file:` URL needs no token. */
if (mustHaveConfig && !authToken && /^libsql:|^wss?:|^https?:/.test(url)) {
  throw new Error(`DATABASE_AUTH_TOKEN is not set, but DATABASE_URL (${url.split('?')[0]}) is a remote database.`)
}

/**
 * Next dev reloads modules on every edit; without this the process leaks a new
 * libSQL connection per reload until it runs out of file handles.
 */
/* (pending modules S08b) a new key: a dev server reloading this file keeps no client made before the busy wait and the guard below */
const globalForDb = globalThis as unknown as {
  __openmaisonDbClientGuarded?: Client
  /** (pending modules S31) which studio this server has open, and the clients of the studios started on it */
  __openmaisonOpenStudio?: { open: string | null; clients: Map<string, Client> }
}

/* (pending modules S08b) A local file waits up to BUSY_WAIT_MS for another process's lock and never keeps a lock after a failed statement
   (lib/db/local-file.ts); `timeout` is ignored by a remote client. */
const demoClient = globalForDb.__openmaisonDbClientGuarded ?? guardLocalFile(createClient({ url, authToken, timeout: BUSY_WAIT_MS }), url)

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__openmaisonDbClientGuarded = demoClient
}

/*
 * (pending modules S31 — her "build all of them" 2026-10-11; card onboarding:studio-sign-up) ONE STUDIO OPEN AT A TIME, ON THIS PROTOTYPE.
 * 2.0 keeps one studio per database (no table carries a studio id — REG-667's model: each tester runs their own). A studio that signs up on
 * this prototype is made in a database of its own, beside the demo's (`<DATABASE_URL's file>.studios/<key>.db`, lib/studios/registry.ts),
 * and the server opens it: every read and write below goes to the open studio's database, the demo's file is never touched, and "Back to the
 * demo studio" (the studio block's menu) opens the demo's again. The open studio is the server process's — every tab follows it — and a
 * restart opens the demo (signing in with a studio's number opens that studio again). PRODUCTION: each studio is its own tenant; the
 * developers replace this switch with their tenancy (the session names the studio) — nothing else reads it.
 * Kept on globalThis in every mode, so one process has one answer even if a bundle carries this module twice.
 */
const studios = (globalForDb.__openmaisonOpenStudio ??= { open: null, clients: new Map<string, Client>() })

/** A studio's own database client (a file beside the demo's) — made once per process. */
export function studioClient(studioUrl: string): Client {
  let c = studios.clients.get(studioUrl)
  if (!c) { c = guardLocalFile(createClient({ url: studioUrl, timeout: BUSY_WAIT_MS }), studioUrl); studios.clients.set(studioUrl, c) }
  return c
}
/** A studio's database is gone (Reset prototype to base): its client closes and is forgotten. */
export function forgetStudioClient(studioUrl: string): void {
  const c = studios.clients.get(studioUrl)
  studios.clients.delete(studioUrl)
  try { c?.close() } catch { /* already closed */ }
}
const current = (): Client => (studios.open ? studioClient(studios.open) : demoClient)

/** The client the app's queries run on: whichever studio is open (the demo's unless a studio started on this prototype is). */
class OpenStudioClient implements Client {
  get closed(): boolean { return current().closed }
  get protocol(): string { return current().protocol }
  execute(stmt: InStatement): Promise<ResultSet>
  execute(sql: string, args?: InArgs): Promise<ResultSet>
  execute(stmtOrSql: InStatement | string, args?: InArgs): Promise<ResultSet> {
    return typeof stmtOrSql === 'string' ? current().execute(stmtOrSql, args) : current().execute(stmtOrSql)
  }
  batch(stmts: Array<InStatement | [string, InArgs?]>, mode?: TransactionMode): Promise<ResultSet[]> { return current().batch(stmts, mode) }
  transaction(mode?: TransactionMode): Promise<Transaction> { return current().transaction(mode) }
  migrate(stmts: InStatement[]): Promise<ResultSet[]> { return current().migrate(stmts) }
  executeMultiple(sql: string): Promise<void> { return current().executeMultiple(sql) }
  sync() { return current().sync() }
  close(): void { current().close() }
  reconnect(): void { current().reconnect() }
}

const client: Client = new OpenStudioClient()

export const db = drizzle(client, { schema, logger: process.env.DB_LOGGING === 'true' })

/** (pending modules S31) The demo's own database — DATABASE_URL — whichever studio is open. */
export const demoDatabase = { url, client: demoClient }
/** (pending modules S31) The open studio's database address — null while the demo's is open. */
export const openStudioUrl = (): string | null => studios.open
/** (pending modules S31) Open a studio's database (null = the demo's). lib/studios/registry.ts `openStudio` is the one caller. */
export function setOpenStudioUrl(next: string | null): void { studios.open = next }

export { client, schema }
export type Db = typeof db
