'use server'

import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { vendors } from '@/lib/db/schema'
import { fetchPoContext, type PoContext } from '@/lib/finance/queries'
import type { VendorName } from '@/lib/finance/model'

/** (gaps build F1) Finance's PO dialog reads the picked project's context — its signed quote's lines, its milestones, its address — only for
    whoever may prepare its POs (null otherwise). Read only. */
export async function poContextAction(projectId: string): Promise<PoContext | null> {
  return fetchPoContext(projectId)
}

/** (one-home N-16) The vendor directory as the Price book's and the quote lines' Vendor read it — Company › Finance › Vendors, active and not
    merged, by name; names and trades only (the directory is everyone's to read and add to, F1-Q4). Read only. */
export async function vendorDirectory(): Promise<VendorName[]> {
  const rows = await db.select({ id: vendors.id, name: vendors.name, trade: vendors.trade }).from(vendors)
    .where(and(eq(vendors.isActive, true), isNull(vendors.mergedInto))).orderBy(asc(vendors.name))
  return rows.map((v) => ({ id: v.id, name: v.name, trade: v.trade ?? null }))
}
