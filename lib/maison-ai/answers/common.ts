import 'server-only'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadAssignees, leads, projects } from '@/lib/db/schema'
import { visibleLeadIds } from '@/lib/leads/visibility'
import type { Viewer } from '@/lib/leads/assign-policy'
import { titleCaseName } from '@/lib/format'
import { withFrom } from '@/lib/nav'
import type { MaisonAnswer, MaisonRow } from '@/lib/maison-ai'

/*
 * (pending modules S10) What every answer of Maison AI's Ask box shares — moved out of lib/maison-ai/answer.ts when the box learned the rest of
 * 1.0's mAIson questions (./work.ts · ./money.ts): who is asking (`Ctx`), the way back on every row (`go` · `row`), the projects they see, and
 * Company › Reports › Finance's own numbers (`reportAnswer` — an answer and its report never disagree). Server-only; nothing here writes.
 */

export type Ctx = {
  viewer: Viewer
  /** Owners and Admins — approvals, the rules, what was agreed */ runs: boolean
  /** (S10) Owners, Admins and Accounting — the books (lib/settings/roles.ts `seesBooks`) */ books: boolean
  /** (S10) Accounting — on no lead and no project */ acct: boolean
  /** (S44O — call C6) Marketing — the leads only: no quote's money, no project, no books */ desk?: boolean
  /** (pending modules S41b-1) sees a quote line's cost, mark-up and margin · the books' profit and margin (Who sees costs and margins) */
  costs?: boolean; profit?: boolean
  from: string | null; projectId: string | null; milestoneId: string | null; today: number; now: number
}

/** An app address with the way back — a `#part` stays last. */
export const go = (c: Ctx, href: string) => { const [path, hash] = href.split('#'); return `${withFrom(path!, c.from ?? undefined)}${hash ? `#${hash}` : ''}` }
export const row = (c: Ctx, id: string, label: string, meta: string | undefined, href: string | null): MaisonRow => ({ id, label, ...(meta ? { meta } : {}), ...(href ? { href: go(c, href) } : {}) })
/** (S10) A row whose press asks a question — "which lead?" answered by picking one. */
export const askRow = (id: string, label: string, meta: string | undefined, ask: string): MaisonRow => ({ id, label, ...(meta ? { meta } : {}), ask })
export const NOT_YOURS = 'The studio’s books are for Owners, Admins and Accounting — Company › Reports › Finance.'
/** (S10) What an Accounting member is told about the leads and the projects' work. */
export const ON_LEADS = 'Leads and projects are for the studio’s designers, Managers, Owners and Admins — Accounting keeps the books.'
/** (S44O — call C6) What a Marketing member is told about the quotes, the projects and the books — lib/settings/roles.ts keeps the words (a
    client page reads them too). */
export { ON_DESK } from '@/lib/settings/roles'
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
export const phoneWords = (p: string) => { const d = p.replace(/\D/g, '').slice(-8); return d.length === 8 ? `${d.slice(0, 4)} ${d.slice(4)}` : p }

/** The projects this viewer sees (live; `running` leaves the completed out), with their lead's name and type and the team. */
export async function seenProjects(c: Ctx, o: { running?: boolean; only?: string | null } = {}) {
  const rows = await db.select({ p: projects, client: leads.name, propertyType: leads.propertyType, phone: leads.phone, leadDeleted: leads.deletedAt }).from(projects).innerJoin(leads, eq(leads.id, projects.leadId))
    .where(and(isNull(projects.deletedAt), isNull(leads.deletedAt), ...(o.only ? [eq(projects.id, o.only)] : []))).orderBy(asc(projects.number))
  const visible = await visibleLeadIds(c.viewer)
  const list = rows.filter((r) => (!visible || visible.has(r.p.leadId)) && (!o.running || r.p.stage !== 'completed'))
  const team = list.length ? await db.select({ leadId: leadAssignees.leadId, memberId: leadAssignees.memberId }).from(leadAssignees).where(inArray(leadAssignees.leadId, list.map((r) => r.p.leadId))) : []
  return list.map((r) => ({ ...r, client: titleCaseName(r.client), team: team.filter((t) => t.leadId === r.p.leadId).map((t) => t.memberId) }))
}

/* ── the books (FB-118) — Company › Reports › Finance's own numbers ───────────────────────────────────────────────────────────────── */

type Books = NonNullable<Awaited<ReturnType<typeof import('@/lib/finance/books').fetchBooks>>>
async function books(): Promise<Books | null> {
  const { fetchBooks } = await import('@/lib/finance/books')
  return fetchBooks()
}
/** A report's tiles and the rows of one of its tables (`table`, else the first) — `label` / `meta` name the columns each row reads, joined —
    with the button to the report. `thin` sorts the rows by their margin, the thinnest first (a "--" margin last).
    (S10) `projectId` — the Client statement's project; `bars` — each table row carries its share of the largest money figure, drawn as a
    bar under the row (the card's "charts drawn inside the answer"); `noTiles` — the table alone. */
export type ReportPick = { title?: string; table?: string; label?: string[]; meta?: string[]; rows?: number; thin?: boolean; projectId?: string | null; bars?: string; noTiles?: boolean; text?: string
  /** (S10) each meta figure says what it is ("Due in S$648.00 · Due out …") — where a row's figures are columns that look alike */ named?: boolean }
export async function reportAnswer(c: Ctx, key: string, period: string, o: ReportPick = {}): Promise<MaisonAnswer> {
  const b = await books()
  if (!b) return { title: 'Owners, Admins and Accounting only', text: NOT_YOURS }
  const { buildReport, cellText, isReportKey, isPeriod, periodRange } = await import('@/lib/finance/reports')
  if (!isReportKey(key) || !isPeriod(period)) return { title: 'Nothing to show', text: 'That report is not there.' }
  const r = buildReport(key, { projects: b.projects, overhead: b.overhead, vendors: b.vendors, people: b.people, commission: b.commission, now: b.now }, period, { projectId: o.projectId ?? null })
  const t = (o.table ? r.tables.find((x) => x.key === o.table) : null) ?? r.tables[0]
  const cols = t?.columns ?? []
  const kindOf = (k: string) => cols.find((x) => x.key === k)?.kind
  const labelKeys = o.label ?? (cols[0] ? [cols[0].key] : [])
  const metaKeys = o.meta ?? (cols.find((x) => x.kind === 'money') ? [cols.find((x) => x.kind === 'money')!.key] : [])
  const text = (cells: Record<string, string | number | null>, keys: string[], named = false) => keys.map((k) => { const v = cellText(cells[k] ?? null, kindOf(k)); return v && v !== '--' && named ? `${cols.find((x) => x.key === k)?.label ?? k} ${v}` : v }).filter((x) => x && x !== '--').join(' · ')
  const pct = (v: string | number | null | undefined) => { const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : Infinity }
  const list = t ? [...t.rows] : []
  if (o.thin) list.sort((x, y) => pct(x.cells.margin) - pct(y.cells.margin))
  const shown = t && o.rows ? list.slice(0, o.rows) : []
  const num = (v: string | number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? Math.abs(v) : 0)
  const top = o.bars ? Math.max(0, ...shown.map((x) => num(x.cells[o.bars!]))) : 0
  const rows: MaisonRow[] = [
    ...(o.noTiles ? [] : r.tiles.map((x) => row(c, `tile:${x.label}`, `${x.label} · ${x.value}`, x.help, null))),
    ...shown.map((x) => ({ ...row(c, x.id, text(x.cells, labelKeys), text(x.cells, metaKeys, o.named) || undefined, x.href ?? null), ...(o.bars && top > 0 ? { share: num(x.cells[o.bars]) / top } : {}) })),
  ]
  const projectQ = key === 'statement' && o.projectId ? `&project=${encodeURIComponent(o.projectId)}` : ''
  return { title: o.title ?? `${r.title} · ${periodRange(period, b.now).label}`, text: o.text ?? `${r.help}.`, rows,
    link: { label: `Open ${r.title}`, href: go(c, `/company/reports/finance?report=${key}&period=${period}${projectQ}`) } }
}
