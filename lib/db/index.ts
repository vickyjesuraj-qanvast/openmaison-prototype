import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
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
const globalForDb = globalThis as unknown as {
  __openmaisonDbClient?: ReturnType<typeof createClient>
}

const client = globalForDb.__openmaisonDbClient ?? createClient({ url, authToken })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__openmaisonDbClient = client
}

export const db = drizzle(client, { schema, logger: process.env.DB_LOGGING === 'true' })

export { client, schema }
export type Db = typeof db
