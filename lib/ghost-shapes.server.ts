import 'server-only'
import { and, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  contractTemplates, contracts, leadFiles, leadTasks, leads, libraryFolders, paymentTemplates, priceBookItems, priceBookSections, quoteTemplates,
  quoteTextTemplates, quotes, studioMaterials, taskTemplates, visualizerDesigns,
} from '@/lib/db/schema'
import { fetchViewer, visibleLeadIds } from '@/lib/leads/visibility'

/**
 * (UX audit build · REG-817) Which pages open on their FIRST RUN right now — told to the ghosts by the app shell, so even a browser's first
 * visit draws the loader in the shape the page lands in (lib/ghost-shape.tsx). A page this browser has visited still wins (what it saw is
 * fresher). Cheap counts, read the way the pages read them (Who sees leads, nothing deleted, archived lists aside); a near-miss only costs a
 * ghost the page's other shape. Keys: the ones the pages remember under — `lib.<tableKey>`, `leads`, `tools.quotes`, `tools.contracts`, `tasks`,
 * and each lead's list tabs, `lead.<id>.quotes|contracts|tasks|files`.
 */
export async function fetchFirstRunShapes(): Promise<Record<string, boolean>> {
  const viewer = await fetchViewer()
  const seen = await visibleLeadIds(viewer)
  const sees = (leadId: string | null) => !leadId || !seen || seen.has(leadId)
  const count = async (table: typeof quoteTemplates | typeof contractTemplates | typeof taskTemplates | typeof quoteTextTemplates | typeof paymentTemplates | typeof studioMaterials | typeof priceBookItems | typeof priceBookSections) =>
    Number((await db.select({ n: sql<number>`count(*)` }).from(table).where(isNull(table.deletedAt)))[0]?.n ?? 0)
  const [folderRows, leadRows, designRows, quoteRows, contractRows, taskRows, fileRows, qt, ct, tt, xt, pt, mt, bi, bs] = await Promise.all([
    db.select({ library: libraryFolders.library }).from(libraryFolders).where(isNull(libraryFolders.deletedAt)),
    db.select({ id: leads.id }).from(leads).where(isNull(leads.deletedAt)),
    db.select({ leadId: visualizerDesigns.leadId }).from(visualizerDesigns).where(isNull(visualizerDesigns.deletedAt)),
    db.select({ leadId: quotes.leadId }).from(quotes).where(and(isNull(quotes.deletedAt), isNull(quotes.archivedAt))),
    db.select({ leadId: contracts.leadId }).from(contracts).where(and(isNull(contracts.deletedAt), isNull(contracts.archivedAt))),
    db.select({ leadId: leadTasks.leadId }).from(leadTasks),
    db.select({ leadId: leadFiles.leadId }).from(leadFiles).where(isNull(leadFiles.deletedAt)),
    count(quoteTemplates), count(contractTemplates), count(taskTemplates), count(quoteTextTemplates), count(paymentTemplates),
    count(studioMaterials), count(priceBookItems), count(priceBookSections),
  ])
  const folders = new Set(folderRows.map((f) => f.library))
  /* each visible lead's list tabs — the leads that hold something in each */
  const holds = (rows: { leadId: string | null }[]) => new Set(rows.map((r) => r.leadId).filter((x): x is string => !!x))
  const has = { quotes: holds(quoteRows), contracts: holds(contractRows), tasks: holds(taskRows), files: holds(fileRows) }
  const tabs: Record<string, boolean> = {}
  for (const l of leadRows) {
    if (!sees(l.id)) continue
    for (const tab of ['quotes', 'contracts', 'tasks', 'files'] as const) tabs[`lead.${l.id}.${tab}`] = !has[tab].has(l.id)
  }
  const empty = (n: number, library: string) => n === 0 && !folders.has(library)
  return {
    ...tabs,
    leads: !leadRows.some((l) => sees(l.id)),
    'lib.viz-designs': empty(designRows.filter((d) => sees(d.leadId)).length, 'visualizer'),
    'tools.quotes': !quoteRows.some((q) => sees(q.leadId)),
    'tools.contracts': !contractRows.some((c) => sees(c.leadId)),
    tasks: !taskRows.some((t) => sees(t.leadId)),
    'lib.quote-templates': empty(qt, 'quotes'),
    'lib.contract-templates': empty(ct, 'contracts'),
    'lib.task-templates': empty(tt, 'tasks'),
    'lib.text-templates': empty(xt, 'texts'),
    'lib.payment-templates': empty(pt, 'payments'),
    'lib.materials': empty(mt, 'materials'),
    'lib.price-book-items': empty(bi, 'book-items'),
    'lib.price-book-sections': empty(bs, 'book-sections'),
  }
}
