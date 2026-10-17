import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'
import { BUSY_WAIT_MS } from '../lib/db/local-file'

const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN, timeout: BUSY_WAIT_MS })   // (pending modules S08b) wait for a running server's lock instead of failing
const db = drizzle(client)

await migrate(db, { migrationsFolder: './drizzle' })
console.log(`migrations applied to ${DATABASE_URL}`)
client.close()
