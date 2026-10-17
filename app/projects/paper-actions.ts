'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { fetchViewer } from '@/lib/leads/visibility'
import { runsStudio } from '@/lib/leads/assign-policy'
import { fetchBrand } from '@/lib/templates/queries'
import { fetchStudio } from '@/lib/settings/queries'
import { PAYMENT_SETTINGS_RULE, isPaymentMethod } from '@/lib/projects/payments-model'
import { liveMethods, withMethod, type CollectionRules } from '@/lib/projects/payment-methods'
import { fetchCollectionRules, saveCollectionRules } from '@/lib/projects/payment-methods-queries'
import type { PaperSampleBrand } from '@/lib/projects/invoices-paper-sample'
import { workspaceRefusal } from '@/lib/settings/desk'   // (S45C) the workspace's role rule

type Refusal = { error: string }

/**
 * (parity map, MI-065 · FB-102) What Settings › Finance › Invoice paper's live preview prints the sample invoice on: the studio's letterhead,
 * its brand logo and accent, the live issuing entities with their bank and PayNow, the GST rate and the ways it takes money. Read only — what
 * Company › Profile already shows every member.
 */
export async function invoicePaperSample(): Promise<PaperSampleBrand | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const [brand, studio, rules] = await Promise.all([fetchBrand(), fetchStudio(), fetchCollectionRules()])
  const d = brand.details
  return {
    studio: { name: d.name, address: d.address, phone: d.phone, email: d.email, website: d.website, tagline: d.tagline, uen: d.uen, gstReg: d.gstReg, gstRegistered: d.gstRegistered !== false },
    brandLogo: brand.kit.logo ?? null, brandAccent: brand.kit.colors.accent ?? null,
    entities: d.entities.filter((e, i) => i === 0 || !e.retired),
    gstRate: d.gstRegistered === false ? 0 : studio.gstPct, methods: liveMethods(rules).map((m) => m.value),
  }
}

/* ── (parity map, FB-112) Settings › Finance › Client payments: the ways clients pay, and the bank-feed ask ────────────────────────── */

export async function readCollectionRules(): Promise<CollectionRules | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  return fetchCollectionRules()
}

/** One way switched on or off — Owners and Admins; the last way on stays on. */
export async function setPaymentMethod(o: { method: string; on: boolean }): Promise<{ rules: CollectionRules } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: PAYMENT_SETTINGS_RULE }
  if (!isPaymentMethod(o?.method)) return { error: 'That isn’t a way to pay' }
  const next = withMethod(await fetchCollectionRules(), o.method, o.on === true)
  if ('error' in next) return next
  await saveCollectionRules(next)
  revalidatePath('/settings'); revalidatePath('/projects', 'layout'); revalidatePath('/my', 'layout')
  return { rules: next }
}

/** (a stand-in) *Match bank transfers automatically*: the studio asks the OpenMaison team to set it up — the ask is recorded, nothing reads a
    bank feed. Asked again, it keeps the first day; *Withdraw the ask* takes it back (1.0's Cancel request). */
export async function askBankFeed(): Promise<{ rules: CollectionRules } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: PAYMENT_SETTINGS_RULE }
  const cur = await fetchCollectionRules()
  if (cur.bankFeed) return { rules: cur }
  const [me] = await db.select({ name: members.name }).from(members).where(eq(members.id, viewer.id)).limit(1)
  const next: CollectionRules = { ...cur, bankFeed: { askedAt: Date.now(), askedBy: viewer.id, askedByName: me?.name ?? null } }
  await saveCollectionRules(next)
  revalidatePath('/settings')
  return { rules: next }
}
export async function withdrawBankFeedAsk(): Promise<{ rules: CollectionRules } | Refusal> {
  { const no = await workspaceRefusal(); if (no) return no }   // (S45C) the workspace's role rule — before anything is read
  const viewer = await fetchViewer()
  if (!runsStudio(viewer.role)) return { error: PAYMENT_SETTINGS_RULE }
  const next: CollectionRules = { ...(await fetchCollectionRules()), bankFeed: null }
  await saveCollectionRules(next)
  revalidatePath('/settings')
  return { rules: next }
}
