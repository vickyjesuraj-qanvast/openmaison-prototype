import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { DEFAULT_COLLECTION, PAYMENT_COLLECTION_KEY, liveMethods, parseCollection, type CollectionRules } from './payment-methods'

/*
 * (parity map, FB-112) How clients may pay, on the server — read alone, so the record dialog's data, the client's pay box and the invoice pages
 * read it without importing the money modules. No row = every way on (DEFAULT_COLLECTION).
 */
export async function fetchCollectionRules(): Promise<CollectionRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, PAYMENT_COLLECTION_KEY)).limit(1)
  if (!row) return DEFAULT_COLLECTION
  try { return parseCollection(JSON.parse(row.value)) } catch { return DEFAULT_COLLECTION }
}
/** The live ways as their values — what a page hands a paper or a pay box (`payShowsFrom`). */
export async function fetchLiveMethodValues(): Promise<string[]> {
  return liveMethods(await fetchCollectionRules()).map((m) => m.value)
}
export async function saveCollectionRules(r: CollectionRules): Promise<void> {
  const now = new Date(), value = JSON.stringify(r)
  await db.insert(settings).values({ key: PAYMENT_COLLECTION_KEY, value, updatedAt: now }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } })
}
