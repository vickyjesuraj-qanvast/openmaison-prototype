import 'server-only'
import { randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractBundles, contracts, settings } from '@/lib/db/schema'
import { CONTRACT_RULES_KEY, DEFAULT_CONTRACT_RULES, isSignToken, linkEndsAt, parseContractRules, type ContractRules } from './link'

/* (pending modules S03) The signing link's server half: a new token, the studio's Signing links rule, the window a send opens, and the
   lookups an address resolves through (a contract's token, else a set's — 1.0's request token on a bundle a port brought over). */

/** 16 random bytes in the URL's own alphabet — the address's only key (the invoice and the view-only quote links' shape). */
export const newSignToken = () => randomBytes(16).toString('base64url')

export async function fetchContractRules(): Promise<ContractRules> {
  const [row] = await db.select().from(settings).where(eq(settings.key, CONTRACT_RULES_KEY)).limit(1)
  if (!row) return DEFAULT_CONTRACT_RULES
  try { return parseContractRules(JSON.parse(row.value)) } catch { return DEFAULT_CONTRACT_RULES }
}

/** When a link sent now stops opening, by the studio's rule. */
export async function windowFrom(now: Date): Promise<Date> { return linkEndsAt(now, (await fetchContractRules()).linkDays) }

/** The contract a signing address names, by its token — never by its id (an id is the studio's, not the client's). */
export async function contractIdForToken(token: string): Promise<string | null> {
  if (!isSignToken(token)) return null
  const [c] = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.signToken, token)).limit(1)
  return c?.id ?? null
}
/** (1.0's `/sign/<token>` for a set of documents) The bundle a ported request token names, for the page to send the client on to it. */
export async function bundleIdForToken(token: string): Promise<string | null> {
  if (!isSignToken(token)) return null
  const [b] = await db.select({ id: contractBundles.id }).from(contractBundles).where(eq(contractBundles.signToken, token)).limit(1)
  return b?.id ?? null
}
