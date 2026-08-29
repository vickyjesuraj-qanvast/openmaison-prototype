import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

const url = process.env.DATABASE_URL ?? 'file:./local.db'
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined

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
