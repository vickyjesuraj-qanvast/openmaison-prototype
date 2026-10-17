import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { imports } from '@/lib/db/schema'
import { fetchSkippedRows } from '@/lib/leads/queries'
import { toCsv } from '@/lib/csv'
import { refusesWorkspace } from '@/lib/leads/visibility'
import { signedOutResponse } from '@/lib/auth/session'   // (pending modules S30) the studio's — behind sign-in

/** "Download Skipped Records" — CSV of the rows an import could not accept. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const out = await signedOutResponse(); if (out) return out
  const { id } = await ctx.params
  if (await refusesWorkspace()) return new Response('Not found', { status: 404 })   // (parity map, PR-022) an import's rows are leads
  const [batch] = await db.select().from(imports).where(eq(imports.id, id)).limit(1)
  if (!batch) return new Response('Not found', { status: 404 })
  const skipped = await fetchSkippedRows(id)
  const records = skipped.map((r) => r.data as Record<string, string>)
  const keys = Array.from(new Set(records.flatMap((r) => Object.keys(r)).filter((k) => k !== '__reason')))
  const header = [...keys, 'Reason']
  const rows = records.map((r) => [...keys.map((k) => r[k] ?? ''), r.__reason ?? 'Missing Lead Name'])
  const csv = '\uFEFF' + toCsv([header, ...rows])   // BOM so Excel reads UTF-8 names correctly
  const base = `${batch.fileName.replace(/\.[^.]+$/, '')}-skipped.csv`
  // Header values must be Latin-1 (ByteString): ASCII fallback + RFC 5987 UTF-8 form.
  const ascii = base.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_') || 'skipped.csv'
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(base)}`,
    },
  })
}
