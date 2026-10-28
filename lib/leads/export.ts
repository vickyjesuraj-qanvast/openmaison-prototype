import type { LeadRow } from '@/lib/leads/queries'
import { commercialOf } from '@/lib/leads/enums'   // (S42 B-05)
import { displayDate, displayDateTimeDot, inputDate, money, phoneDisplay } from '@/lib/format'

/**
 * "Export all as…" (784:113420 pattern): the listing's leads as a real file the browser downloads.
 * CSV and XLS (HTML table Excel opens) are plain text; XLSX is a minimal OOXML zip; PDF is a minimal
 * text-only document. All written here without libraries so the demo never dead-ends.
 */
export type ExportFormat = 'CSV' | 'XLS' | 'XLSX' | 'PDF'
export const EXPORT_FORMATS: ExportFormat[] = ['CSV', 'XLS', 'XLSX', 'PDF']

/* (REG-610, parity L-32) The full column set — 1.0's 23 in 2.0's words, on the listing's row. `key` names each column so the export
   dialog can send the listing's visible columns (LISTING_EXPORT) or everything. The mock's ten stay first and in order. */
export type ExportColumn<R = LeadRow> = { key: string; label: string; value: (r: R) => string }
const nextDue = (r: LeadRow) => r.tasks.find((t) => !t.done && t.dueAt) ?? null
export const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'name', label: 'Lead name', value: (r) => r.name },
  { key: 'phone', label: 'Phone', value: (r) => `+65 ${r.phone}` },
  { key: 'email', label: 'Email', value: (r) => r.email ?? '' },
  { key: 'stage', label: 'Stage', value: (r) => r.stage },
  { key: 'source', label: 'Source', value: (r) => r.source },
  { key: 'budget', label: 'Budget (S$)', value: (r) => money(r.budgetMinor) },
  { key: 'propertyType', label: 'Property type', value: (r) => r.propertyType ?? '' },
  { key: 'address', label: 'Property address', value: (r) => r.propertyAddress ?? '' },
  { key: 'members', label: 'Members', value: (r) => r.assignees.map((m) => m.name).join(', ') },   /* REG-290: header follows the column */
  { key: 'created', label: 'Created', value: (r) => inputDate(r.createdAt) },
  { key: 'district', label: 'District', value: (r) => r.area ?? '' },
  { key: 'leadAddress', label: 'Lead address', value: (r) => r.leadAddress ?? '' },
  { key: 'condition', label: 'Condition', value: (r) => r.condition ?? '' },
  { key: 'style', label: 'Style', value: (r) => r.style ?? '' },
  { key: 'areaSqft', label: 'Area size (sq ft)', value: (r) => (r.areaSqft ? String(r.areaSqft) : '') },
  { key: 'keyCollection', label: 'Key collection', value: (r) => r.keyCollection ?? '' },
  { key: 'startDate', label: 'Estimated start date', value: (r) => (r.estimatedStartDate ? inputDate(r.estimatedStartDate) : '') },
  { key: 'openTasks', label: 'Open tasks', value: (r) => String(r.tasks.filter((t) => !t.done).length) },
  { key: 'nextFollowUp', label: 'Next follow-up', value: (r) => { const t = nextDue(r); return t?.dueAt ? `${displayDateTimeDot(t.dueAt)} · ${t.title}` : '' } },
  { key: 'lastContact', label: 'Last contact', value: (r) => (r.lastContact ? [displayDateTimeDot(r.lastContact.at), r.lastContact.channel, r.lastContact.outcome].filter(Boolean).join(' · ') : '') },
  { key: 'onHold', label: 'On hold till', value: (r) => (r.onHoldFollowUp ? displayDate(new Date(r.onHoldFollowUp)) : '') },
  { key: 'leadReturn', label: 'Lead return', value: (r) => (r.returnStatus ? `Return ${r.returnStatus}` : '') },
  { key: 'nric', label: 'NRIC / FIN', value: (r) => r.icNumber ?? '' },
  { key: 'customerId', label: 'Customer ID', value: (r) => r.customerId ?? '' },
  /* (pending modules S05 — testers' L-3 · L-4) a commercial client's company and UEN; the second client (a co-owner) */
  { key: 'company', label: 'Company', value: (r) => commercialOf(r).company },   // (S42 B-05) only while the lead is commercial
  { key: 'uen', label: 'UEN', value: (r) => commercialOf(r).uen },
  { key: 'secondClient', label: 'Second client', value: (r) => (r.client2Name ? [r.client2Name, r.client2Phone ? `+65 ${r.client2Phone}` : null].filter(Boolean).join(' · ') : '') },
  /* (pending modules S05 — the card's "Quote status and Project type columns — dropped · revisit: a Won lead has a project and each quote has a
     status") 1.0's two columns: the latest live quote with its status, and the project's type (the Won step's, before a project carries it) */
  { key: 'quoteStatus', label: 'Quote status', value: (r) => (r.latestQuote ? `${r.latestQuote.number} · ${r.latestQuote.status}` : '') },
  { key: 'projectType', label: 'Project type', value: (r) => r.project?.type ?? (r.stage === 'Won' ? r.stageData.projectType ?? '' : '') },
  { key: 'remarks', label: 'Remarks', value: (r) => r.notes ?? '' },
]
/** The listing's column keys → the export columns that carry them (the Name column carries the phone; Tasks is the open count). */
export const LISTING_EXPORT: Record<string, string[]> = {   // keyed by the listing's own column keys (components/leads/table.tsx DEFAULT_COLUMNS)
  name: ['name', 'phone'], stage: ['stage'], tasks: ['openTasks'], assignees: ['members'], source: ['source'], budget: ['budget'], propertyType: ['propertyType'], created: ['created'], address: ['address'], lastContact: ['lastContact'], district: ['district'], nextFollowUp: ['nextFollowUp'],
}
export const columnsFor = (keys?: string[] | null): ExportColumn[] => statementColumns(LEAD_STATEMENT, keys)

/**
 * (parity P-25, B-15) The statement, for any listing (REG-610, the owner's "like a bank statement"): which rows · a period on one of the
 * row's dates · every column or the listing's own · the format · the summary line. A listing hands its rows' columns, how its visible
 * columns map onto them, the date the period reads and its words; the export dialog does the rest. Leads' is `LEAD_STATEMENT`; Projects
 * builds its own from its column registry (components/projects/project-columns.tsx `projectStatement`).
 */
export type StatementSpec<R> = {
  /** The rows' noun, one and many: "lead" · "leads". */
  one: string
  many: string
  /** The period's field — its label in the dialog ("Created" · "Start date") and the row's date (null: in no period but All time). */
  dateLabel: string
  dateOf: (r: R) => Date | null
  /** Every column the file can carry, in order — "Everything". */
  columns: ExportColumn<R>[]
  /** The listing's column keys → the export columns that carry them — "As the list shows", in the listing's order. */
  listing: Record<string, string[]>
  /** The file's title and its name: "OpenMaison — Leads", `openmaison-leads-2026-10-08.csv`. */
  title: string
  file: string
}
export const LEAD_STATEMENT: StatementSpec<LeadRow> = {
  one: 'lead', many: 'leads', dateLabel: 'Created', dateOf: (r) => r.createdAt,
  columns: EXPORT_COLUMNS, listing: LISTING_EXPORT, title: 'OpenMaison — Leads', file: 'openmaison-leads',
}
/** The statement's columns: the keys asked for, in their order — or every column. */
export function statementColumns<R>(spec: StatementSpec<R>, keys?: string[] | null): ExportColumn<R>[] {
  return keys && keys.length ? keys.map((k) => spec.columns.find((c) => c.key === k)).filter((c): c is ExportColumn<R> => !!c) : spec.columns
}
/** The listing's visible column keys, in order → the statement's column keys (a listing column may carry two, the Name its phone). */
export const listingKeys = <R>(spec: StatementSpec<R>, visible: string[]): string[] => visible.flatMap((k) => spec.listing[k] ?? [])
export function downloadStatement<R>(spec: StatementSpec<R>, rows: R[], format: ExportFormat, now: Date, keys?: string[] | null): string {
  const cols = statementColumns(spec, keys)
  return downloadBlob(buildTable(spec.title, cols.map((c) => c.label), rows.map((r) => cols.map((c) => c.value(r))), format), `${spec.file}-${dayStamp(now)}.${format.toLowerCase()}`)
}
const dayStamp = (now: Date) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

export function exportFileName(format: ExportFormat, now: Date): string {
  return `openmaison-leads-${dayStamp(now)}.${format.toLowerCase()}`
}

export function buildExport(rows: LeadRow[], format: ExportFormat, keys?: string[] | null): Blob {
  const cols = columnsFor(keys)
  return buildTable('OpenMaison — Leads', cols.map((c) => c.label), rows.map((r) => cols.map((c) => c.value(r))), format)
}

/** Any head + body as CSV / XLS / XLSX / PDF — shared by the leads and tasks exports (Export Tasks 902:29293). */
export function buildTable(title: string, head: string[], body: string[][], format: ExportFormat): Blob {
  switch (format) {
    case 'CSV': return new Blob(['﻿' + [head, ...body].map((row) => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
    case 'XLS': return new Blob([htmlTable(head, body)], { type: 'application/vnd.ms-excel' })
    case 'XLSX': return new Blob([xlsx(title, head, body).buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    case 'PDF': return new Blob([pdf(title, head, body).buffer as ArrayBuffer], { type: 'application/pdf' })
  }
}

export function downloadLeads(rows: LeadRow[], format: ExportFormat, now: Date, keys?: string[] | null): string {
  return downloadBlob(buildExport(rows, format, keys), exportFileName(format, now))
}

/** Export Tasks (902:29293): the lead's tasks as a table. */
export function downloadTasks(tasks: { title: string; assignees: { name: string }[]; dueAt: Date | null; done: boolean; tags: { name: string }[]; createdAt: Date; externalName?: string | null; externalPhone?: string | null; externalKind?: string | null }[], format: ExportFormat, now: Date): string {
  /* (gaps build, package C — M-03) the outside person after the members: "Ah Seng (Subcontractor) +65 9123 4567" */
  const head = ['Title', 'Members', 'Outside person', 'Due date', 'Status', 'Tags', 'Created']   /* REG-290 */
  const outside = (t: (typeof tasks)[number]) => (t.externalName ? `${t.externalName}${t.externalKind ? ` (${t.externalKind === 'supplier' ? 'Vendor' : 'Contractor'})` : ''}${t.externalPhone ? ` ${phoneDisplay(t.externalPhone)}` : ''}` : '')
  const body = tasks.map((t) => [t.title, t.assignees.map((m) => m.name).join(', '), outside(t), t.dueAt ? displayDate(t.dueAt) : '', t.done ? 'Completed' : 'Open', t.tags.map((g) => g.name).join(', '), displayDate(t.createdAt)])
  return downloadBlob(buildTable('OpenMaison — Tasks', head, body, format), `openmaison-tasks-${now.toISOString().slice(0, 10)}.${format.toLowerCase()}`)
}

/** Hands the browser a Blob to save under `name` — shared with the Files tab's Download (931:40131). */
export function downloadBlob(blob: Blob, name: string): string {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return name
}

/* ---------- CSV / XLS ---------- */
const csvCell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const htmlTable = (head: string[], body: string[][]) =>
  `<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`

/* ---------- XLSX: minimal OOXML in a stored (uncompressed) zip ---------- */
function xlsx(title: string, head: string[], body: string[][]): Uint8Array {
  // The worksheet tab is the export's own title without the product prefix ("OpenMaison — Tasks" → "Tasks"); the
  // constant "Leads" headed the tasks workbook too. Excel caps a tab at 31 chars and refuses : \ / ? * [ ].
  const tab = title.replace(/^OpenMaison\s*—\s*/, '').replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Sheet1'
  const colRef = (i: number) => { let s = ''; let n = i; do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0); return s }
  const row = (cells: string[], r: number) => `<row r="${r}">${cells.map((c, i) => `<c r="${colRef(i)}${r}" t="inlineStr"><is><t xml:space="preserve">${esc(c)}</t></is></c>`).join('')}</row>`
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${[head, ...body].map((r, i) => row(r, i + 1)).join('')}</sheetData></worksheet>`
  const files: [string, string][] = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(tab)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
    ['xl/worksheets/sheet1.xml', sheet],
  ]
  return zip(files)
}

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]!) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function zip(files: [string, string][]): Uint8Array {
  const enc = new TextEncoder(); const parts: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0
  const u16 = (n: number) => [n & 0xff, (n >>> 8) & 0xff]; const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]
  for (const [name, text] of files) {
    const nameB = enc.encode(name), data = enc.encode(text), crc = crc32(data)
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameB.length), ...u16(0), ...nameB])
    parts.push(local, data)
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...nameB]))
    offset += local.length + data.length
  }
  const cd = central.reduce((n, c) => n + c.length, 0)
  const eocd = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cd), ...u32(offset), ...u16(0)])
  const all = [...parts, ...central, eocd]; const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0)); let pos = 0
  for (const p of all) { out.set(p, pos); pos += p.length }
  return out
}

/* ---------- PDF: minimal text-only pages (Helvetica), A4 portrait ---------- */
function pdf(title: string, head: string[], body: string[][]): Uint8Array {
  const W = 842, H = 595, M = 40, LH = 14, per = Math.floor((H - M * 2 - 30) / LH)   // landscape A4, fits the ten columns
  const pitch = Math.floor((W - M * 2) / head.length)
  const cols = head.map((_, i) => M + i * pitch)
  // A cell may only use the pitch it is drawn into: 8pt Helvetica averages ~4pt a character, so the ten lead
  // columns (76pt) clip at 17 and the six task columns (127pt) keep 30 — no overprinting, no dead space.
  const maxChars = Math.max(4, Math.floor((pitch - 6) / 4))
  const clip = (c: string) => (c.length > maxChars ? `${c.slice(0, maxChars - 3)}...` : c)
  const pdfText = (s: string) => s.replace(/[^\x20-\x7e]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const pages: string[] = []
  for (let p = 0; p < Math.max(1, Math.ceil(body.length / per)); p++) {
    const lines = [`BT /F2 12 Tf ${M} ${H - M} Td (${pdfText(title)} — page ${p + 1}) Tj ET`]
    const draw = (cells: string[], y: number, bold: boolean) => cells.forEach((c, i) => lines.push(`BT /${bold ? 'F2' : 'F1'} 8 Tf ${cols[i]} ${y} Td (${pdfText(clip(c))}) Tj ET`))
    draw(head, H - M - 22, true)
    body.slice(p * per, (p + 1) * per).forEach((r, i) => draw(r, H - M - 22 - LH * (i + 1), false))
    pages.push(lines.join('\n'))
  }
  const objs: string[] = []
  const add = (s: string) => { objs.push(s); return objs.length }
  const font1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'), font2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')
  const pagesId = objs.length + 1 + pages.length * 2
  const pageIds = pages.map((content) => { const c = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`); return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${c} 0 R /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> >>`) })
  add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`)
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)
  let out = '%PDF-1.4\n'; const offsets: number[] = []
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(out)
}
