import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { DEFAULT_PROJECT_START, PROJECT_START_KEY, parseProjectStart, type ProjectStartRule } from './start-rule'

/** (S44R — UAT row 358, call C7) Settings › Projects › When a project starts — unset reads today's rule (the quote is signed). */
export async function fetchProjectStart(): Promise<ProjectStartRule> {
  const [row] = await db.select().from(settings).where(eq(settings.key, PROJECT_START_KEY)).limit(1)
  if (!row) return DEFAULT_PROJECT_START
  try { return parseProjectStart(JSON.parse(row.value)) } catch { return DEFAULT_PROJECT_START }
}
