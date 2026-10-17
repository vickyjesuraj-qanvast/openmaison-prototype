/**
 * (REG-603) A lead sheet as text → the import wizard's grid. Two shapes are read — the ones a Homematch export and most
 * portal lead PDFs take:
 *   · a TABLE: a header line naming a name column and a phone column, then one line per lead with two-space column gaps;
 *   · LABELLED BLOCKS: "Name: …", "Phone: …" lines, one block per lead, blank lines or a new "Name:" starting the next.
 * Nothing is guessed beyond that; a PDF that fits neither returns no rows and the wizard says so. Tune to the real sample.
 */
const HEAD_ALIASES: Record<string, string> = {
  name: 'Lead Name', 'customer name': 'Lead Name', client: 'Lead Name', 'full name': 'Lead Name', homeowner: 'Lead Name', 'contact name': 'Lead Name',
  phone: 'Lead Phone Number', mobile: 'Lead Phone Number', contact: 'Lead Phone Number', 'contact no': 'Lead Phone Number', 'contact number': 'Lead Phone Number', 'phone number': 'Lead Phone Number', hp: 'Lead Phone Number',
  email: 'Lead Email', 'email address': 'Lead Email',
  property: 'Property Type', 'property type': 'Property Type', 'home type': 'Property Type', type: 'Property Type',
  address: 'Property Address', 'property address': 'Property Address', location: 'Property Address',
  budget: 'Estimated Budget (S$)', 'estimated budget': 'Estimated Budget (S$)', 'budget (s$)': 'Estimated Budget (S$)',
  'key collection': 'Key Collection', 'district': 'District', 'area / district': 'District', 'start date': 'Estimated Start Date', 'move in': 'Estimated Start Date',
  remarks: 'Remarks', message: 'Remarks', notes: 'Remarks', requirements: 'Remarks', enquiry: 'Remarks',
  style: 'Style', condition: 'Condition', 'area size': 'Area Size', area: 'Area Size', source: 'Lead Source',
}
const norm = (s: string) => s.trim().toLowerCase().replace(/[:*]+$/, '').replace(/\s+/g, ' ')
const known = (s: string) => HEAD_ALIASES[norm(s)]
/** (S42F) A label as a lead sheet names it ("Contact no", "Mobile", "Remarks") → the import's field — Fill from a document reads a single
    enquiry's labelled lines with the same words. Undefined when it names nothing. */
export const leadSheetField = (label: string): string | undefined => known(label)

export type SheetGrid = { headers: string[]; rows: string[][] }

/** The lines of a lead sheet → headers + rows (empty rows when the sheet's shape is not recognised). */
export function parseLeadSheet(lines: string[]): SheetGrid {
  const table = parseTable(lines)
  if (table.rows.length) return table
  return parseBlocks(lines)
}

function parseTable(lines: string[]): SheetGrid {
  const idx = lines.findIndex((l) => { const cells = l.split(/\s{2,}|\t/).map(norm); return cells.length >= 2 && cells.some((c) => HEAD_ALIASES[c] === 'Lead Name') && cells.some((c) => HEAD_ALIASES[c] === 'Lead Phone Number') })
  if (idx < 0) return { headers: [], rows: [] }
  const headers = lines[idx]!.split(/\s{2,}|\t/).map((h) => h.trim()).filter(Boolean).map((h) => known(h) ?? h)
  const rows: string[][] = []
  for (const l of lines.slice(idx + 1)) {
    if (!l.trim()) { if (rows.length) continue; else continue }
    const cells = l.split(/\s{2,}|\t/).map((c) => c.trim())
    if (cells.length < 2) continue
    if (cells.every((c) => known(c))) break   // a second header (a new page's) ends nothing; a footer of labels does
    rows.push([...cells, ...Array.from({ length: Math.max(0, headers.length - cells.length) }, () => '')].slice(0, headers.length))
  }
  return { headers, rows }
}

function parseBlocks(lines: string[]): SheetGrid {
  const blocks: Record<string, string>[] = []
  let cur: Record<string, string> | null = null
  for (const raw of lines) {
    const l = raw.trim()
    if (!l) continue
    const m = l.match(/^([A-Za-z][A-Za-z .()$/]{1,30}?)\s*[:：]\s*(.+)$/)
    if (!m) { if (cur && cur.Remarks !== undefined) cur.Remarks += ` ${l}`; continue }
    const field = known(m[1]!)
    if (!field) continue
    if (field === 'Lead Name' && cur && cur['Lead Name']) { blocks.push(cur); cur = null }
    cur = cur ?? {}
    cur[field] = (m[2] ?? '').trim()
  }
  if (cur && cur['Lead Name']) blocks.push(cur)
  const headers = [...new Set(blocks.flatMap((b) => Object.keys(b)))]
  return { headers, rows: blocks.map((b) => headers.map((h) => b[h] ?? '')) }
}
