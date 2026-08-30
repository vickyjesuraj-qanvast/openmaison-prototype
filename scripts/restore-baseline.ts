import { restoreBaseline } from '../lib/db/baseline'
/** Put local.db back to fixtures/baseline.json (what Maison AI › "Reset prototype to base" does), from the terminal. */
const r = await restoreBaseline()
console.log(`restored ${r.tables} tables, ${r.rows} rows`)
