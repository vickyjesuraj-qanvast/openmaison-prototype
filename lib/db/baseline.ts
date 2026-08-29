import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { client } from '@/lib/db'

/**
 * Prototype base state (user 2026-08-29): a snapshot of every table, taken with `pnpm db:baseline`
 * into fixtures/baseline.json. `restoreBaseline()` puts the database back to it — the demo's
 * "reset to original" behind the Maison AI FAB. Order matters for foreign keys: parents first.
 */
export const BASELINE_TABLES = ['users', 'organizations', 'memberships', 'members', 'leads', 'lead_assignees', 'lead_tasks', 'stage_logs', 'imports', 'import_rows', 'settings'] as const
export const BASELINE_FILE = path.join(process.cwd(), 'fixtures', 'baseline.json')

export type Baseline = Record<string, Record<string, unknown>[]>

export async function restoreBaseline(): Promise<{ tables: number; rows: number }> {
  const base = JSON.parse(await readFile(BASELINE_FILE, 'utf8')) as Baseline
  const stmts: { sql: string; args: (string | number | null)[] }[] = []
  for (const t of [...BASELINE_TABLES].reverse()) stmts.push({ sql: `DELETE FROM ${t}`, args: [] })
  let rows = 0
  for (const t of BASELINE_TABLES) {
    for (const row of base[t] ?? []) {
      const cols = Object.keys(row)
      stmts.push({ sql: `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, args: cols.map((c) => row[c] as string | number | null) })
      rows++
    }
  }
  await client.batch(stmts, 'write')   // one transaction: all or nothing
  return { tables: BASELINE_TABLES.length, rows }
}
