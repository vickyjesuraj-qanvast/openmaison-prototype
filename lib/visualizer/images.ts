import 'server-only'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { renderImages, renderJobs } from '@/lib/db/schema'
import { isAddress } from './picture-store'

/* AI Visualizer — the pictures' database reads (audit 2026-09-26); the addresses and rules they follow are lib/visualizer/picture-store.ts,
   re-exported here so a server module imports one place. */
export * from './picture-store'

/** A version's picture: its stored data URL, else (a row from before the move) the one inside its job, else a sample's public path. */
export async function renderPicture(jobId: string, variantId: number): Promise<string | null> {
  const [r] = await db.select({ data: renderImages.data }).from(renderImages).where(and(eq(renderImages.jobId, jobId), eq(renderImages.variantId, variantId)))
  if (r) return r.data
  const [j] = await db.select({ variantsJson: renderJobs.variantsJson }).from(renderJobs).where(eq(renderJobs.id, jobId))
  if (!j) return null
  try {
    const v = (JSON.parse(j.variantsJson) as { id?: unknown; imageUrl?: unknown }[]).find((x) => x && x.id === variantId)
    return typeof v?.imageUrl === 'string' && !isAddress(v.imageUrl) ? v.imageUrl : null
  } catch { return null }
}

/** A public file's real size (a sample's pre-made render) — null when there is none to read. */
export async function publicFileSize(url: string): Promise<number | null> {
  if (!/^\/visualizer\/[a-z0-9/_-]+\.(jpg|jpeg|png|webp)$/i.test(url)) return null
  try { return (await stat(path.join(process.cwd(), 'public', url))).size } catch { return null }
}
