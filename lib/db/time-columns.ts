import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core'
import * as schema from './schema'
import type { TimeColumns } from './demo-day'

/** (S42 audit A-03) Every timestamp column the schema types, table by table, with its unit — what the whole-demo move shifts (restore,
    lib/db/baseline.ts) and what repair R125 moves for the rows it re-anchors. Read off the schema, so a new table rides without a list. */
let cache: TimeColumns | null = null
export function timeColumns(): TimeColumns {
  if (cache) return cache
  const out: TimeColumns = {}
  for (const v of Object.values(schema)) {
    if (!(v instanceof SQLiteTable)) continue
    const c = getTableConfig(v)
    for (const col of c.columns) {
      const meta = col as unknown as { columnType?: string; mode?: string }
      if (meta.columnType === 'SQLiteTimestamp') (out[c.name] ??= []).push({ column: col.name, unit: meta.mode === 'timestamp_ms' ? 'ms' : 's' })
    }
  }
  return (cache = out)
}
