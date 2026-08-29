import { config } from 'dotenv'

/** Next loads .env.local automatically; standalone scripts must do it themselves. */
config({ path: ['.env.local', '.env'], quiet: true })

export const DATABASE_URL = process.env.DATABASE_URL ?? 'file:./local.db'
export const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || undefined
