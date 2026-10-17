'use server'

import { revalidatePath } from 'next/cache'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsMoney } from '@/lib/settings/roles'
import { fetchStudio } from '@/lib/settings/queries'
import { TAX_KEYS, XERO_ACCOUNTS, XERO_RULE, XERO_TAXES, autoMap, type XeroKind, type XeroSettings } from '@/lib/finance/xero'
import { entitiesForXero, fetchAccountKeys, fetchXeroSettings, pushToXero, saveXeroSettings } from '@/lib/finance/xero-server'
import type { Refusal } from '@/lib/finance/server'

/*
 * (gaps build F2 — F2-Q13) Finance › Accounting on the server, simulated the way Integrations' Gmail is: Connect (no OAuth — the organisations
 * proposed per issuing entity), the organisation per entity, the accounts and tax codes (Auto-map, a change per row), Push automatically, Sync
 * now and Retry (lib/finance/xero-server.ts `pushToXero`), Disconnect (the log stays). Owners and Admins only.
 * (one-home N-09) Connect and Disconnect are pressed on Company › Integrations' Xero card now; Accounting runs the rest. `touch` refreshes both.
 */

async function runner(): Promise<{ id: string } | Refusal> {
  const v = await fetchViewer()
  return runsMoney(v.role) ? { id: v.id } : { error: XERO_RULE }   // (parity map, FB-114) Accounting runs Xero — connect, map, push, retry
}
const touch = () => { revalidatePath('/company/finance', 'layout'); revalidatePath('/company/integrations') }
const gstOf = async () => { const s = await fetchStudio(); return s.gstRegistered ? s.gstPct : 0 }

/** Connect (simulated): an organisation proposed per issuing entity, the accounts and taxes auto-mapped. */
export async function connectXero(): Promise<{ settings: XeroSettings } | Refusal> {
  const r = await runner(); if ('error' in r) return r
  const now = await fetchXeroSettings()
  const orgs = (await entitiesForXero()).map((e) => ({ entity: e.entity, name: e.proposed }))
  const mapped = now.accounts && Object.keys(now.accounts).length ? { accounts: now.accounts, taxes: now.taxes } : autoMap(await gstOf(), await fetchAccountKeys())
  const next: XeroSettings = { ...now, ...mapped, connected: true, connectedAt: Date.now(), connectedBy: r.id, organisations: now.organisations.length ? now.organisations : orgs }
  await saveXeroSettings(next)
  touch()
  return { settings: next }
}
/** Disconnect — nothing more is pushed; what was pushed and the sync log stay. */
export async function disconnectXero(): Promise<{ settings: XeroSettings } | Refusal> {
  const r = await runner(); if ('error' in r) return r
  const next: XeroSettings = { ...(await fetchXeroSettings()), connected: false, auto: false }
  await saveXeroSettings(next)
  touch()
  return { settings: next }
}
/** Which Xero organisation an issuing entity's books go to (1.0: one connection per legal entity). */
export async function setXeroOrganisation(o: { entity: string; name: string }): Promise<{ settings: XeroSettings } | Refusal> {
  const r = await runner(); if ('error' in r) return r
  const name = (o?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
  if (!name) return { error: 'Enter the organisation’s name as Xero shows it' }
  const now = await fetchXeroSettings()
  const others = now.organisations.filter((x) => x.entity !== o.entity)
  const next: XeroSettings = { ...now, organisations: [...others, { entity: o.entity, name }] }
  await saveXeroSettings(next)
  touch()
  return { settings: next }
}
/** One row of the mapping — an account or a tax code (null clears it; a push that needs it then fails until it is set). */
export async function setXeroMapping(o: { kind: 'account' | 'tax'; key: string; code: string | null }): Promise<{ settings: XeroSettings } | Refusal> {
  const r = await runner(); if ('error' in r) return r
  const now = await fetchXeroSettings()
  if (o?.kind === 'account') {
    if (!(await fetchAccountKeys()).some((k) => k.key === o.key)) return { error: 'That row is not in the mapping' }
    if (o.code && !XERO_ACCOUNTS.some((a) => a.code === o.code)) return { error: 'Pick an account from the list' }
    const next = { ...now, accounts: { ...now.accounts, [o.key]: o.code } }
    await saveXeroSettings(next); touch(); return { settings: next }
  }
  if (!TAX_KEYS.some((k) => k.key === o?.key)) return { error: 'That row is not in the mapping' }
  const side = TAX_KEYS.find((k) => k.key === o.key)!.side
  const tax = o.code ? XERO_TAXES.find((t) => t.code === o.code) : null
  if (o.code && !tax) return { error: 'Pick a tax code from the list' }
  if (tax && tax.side !== side) return { error: side === 'sales' ? 'Pick a tax code for sales' : 'Pick a tax code for purchases' }
  const next = { ...now, taxes: { ...now.taxes, [o.key]: o.code } }
  await saveXeroSettings(next); touch(); return { settings: next }
}
/** Auto-map (1.0's: by rate, then by side) — every row, again. */
export async function autoMapXero(): Promise<{ settings: XeroSettings; before: Pick<XeroSettings, 'accounts' | 'taxes'> } | Refusal> {
  const r = await runner(); if ('error' in r) return r
  const now = await fetchXeroSettings()
  const next = { ...now, ...autoMap(await gstOf(), await fetchAccountKeys()) }
  await saveXeroSettings(next)
  touch()
  return { settings: next, before: { accounts: now.accounts, taxes: now.taxes } }
}
/** Undo an Auto-map: the rows as they were. */
export async function restoreXeroMapping(before: Pick<XeroSettings, 'accounts' | 'taxes'>): Promise<{ settings: XeroSettings } | Refusal> {
  const r = await runner(); if ('error' in r) return r
  const next = { ...(await fetchXeroSettings()), accounts: before?.accounts ?? {}, taxes: before?.taxes ?? {} }
  await saveXeroSettings(next)
  touch()
  return { settings: next }
}
/** Push automatically — a sync after each money step (in this demo). */
export async function setXeroAuto(on: boolean): Promise<{ settings: XeroSettings } | Refusal> {
  const r = await runner(); if ('error' in r) return r
  const now = await fetchXeroSettings()
  if (!now.connected) return { error: 'Connect Xero first' }
  const next = { ...now, auto: on === true }
  await saveXeroSettings(next)
  touch()
  return { settings: next }
}
/** Sync now: everything new, changed or failed, pushed once. */
export async function syncXero(): Promise<{ created: number; updated: number; failed: number } | Refusal> {
  const r = await runner(); if ('error' in r) return r
  if (!(await fetchXeroSettings()).connected) return { error: 'Connect Xero first' }
  const out = await pushToXero(r.id)
  touch()
  return { created: out.created, updated: out.updated, failed: out.failed }
}
/** Retry one push that failed. */
export async function retryXero(o: { kind: XeroKind; id: string }): Promise<{ created: number; updated: number; failed: number } | Refusal> {
  const r = await runner(); if ('error' in r) return r
  if (!(await fetchXeroSettings()).connected) return { error: 'Connect Xero first' }
  const out = await pushToXero(r.id, { kind: o.kind, id: o.id })
  touch()
  return { created: out.created, updated: out.updated, failed: out.failed }
}
