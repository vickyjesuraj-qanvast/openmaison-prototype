import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { CASETRUST_KEY, parseCaseTrust } from './casetrust'

/** (gaps build D, item 6) Whether the studio is CaseTrust-accredited — the signing pages' disclosure and tick follow it. Off when never set. */
export async function fetchCaseTrust(): Promise<boolean> {
  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, CASETRUST_KEY)).limit(1)
  return row ? parseCaseTrust(row.value) : false
}
