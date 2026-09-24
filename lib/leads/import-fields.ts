/** OpenMaison import targets — the step-3 preview headers (779:26144), in order. */
export const IMPORT_FIELDS = [
  'Lead Name', 'Lead Phone Number', 'Lead Email', 'Lead Source', 'Lead Stage',
  'Property Type', 'Property Address', 'District', 'Lead Address', 'Estimated Budget (S$)',
  'Estimated Start Date', 'Style', 'Key Collection', 'Condition', 'Area Size', 'Remarks',
] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]
export const IGNORE = 'Ignore' as const
export type Mapping = (ImportField | typeof IGNORE | null)[]

/** Step-3 preview columns (widths from 779:26144). The mock's 4th header reads
 *  "LEAD STAGE" over source values — audit item resolved as LEAD SOURCE.
 *  Label/width/order lookup only — step 3 draws the ones the file's mapping used, so the
 *  import template (all 15 headers auto-map) still draws all 14 and a 7-column file draws 7. */
export const PREVIEW_COLUMNS: { field: ImportField; label: string; width: number }[] = [
  { field: 'Lead Name', label: 'Lead Name', width: 120 },
  { field: 'Lead Phone Number', label: 'Lead Phone Number', width: 171 },
  { field: 'Lead Source', label: 'Lead Source', width: 124 },
  { field: 'Property Type', label: 'Property Type', width: 138 },
  { field: 'Property Address', label: 'Property Address', width: 240 },
  { field: 'District', label: 'District', width: 110 },   // (REG-607) 1.0's Area / District
  { field: 'Lead Email', label: 'Lead Email', width: 240 },
  { field: 'Lead Address', label: 'Lead Address', width: 240 },
  { field: 'Estimated Budget (S$)', label: 'Estimated Budget (S$)', width: 189 },
  { field: 'Estimated Start Date', label: 'Estimated Start Date', width: 184 },
  { field: 'Style', label: 'Style', width: 120 },
  { field: 'Key Collection', label: 'Key Collection', width: 144 },
  { field: 'Condition', label: 'Condition', width: 120 },
  { field: 'Area Size', label: 'Area Size', width: 101 },
  { field: 'Remarks', label: 'Remarks', width: 200 },
]

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** B2 auto-map: header aliases → OpenMaison field. */
const ALIASES: Record<string, ImportField> = {
  name: 'Lead Name', leadname: 'Lead Name', fullname: 'Lead Name', clientname: 'Lead Name', customername: 'Lead Name',
  phone: 'Lead Phone Number', mobile: 'Lead Phone Number', phonenumber: 'Lead Phone Number', leadphone: 'Lead Phone Number',
  leadphonenumber: 'Lead Phone Number', clientphone: 'Lead Phone Number', contact: 'Lead Phone Number',
  email: 'Lead Email', leademail: 'Lead Email', clientemail: 'Lead Email', emailaddress: 'Lead Email',
  source: 'Lead Source', leadsource: 'Lead Source', channel: 'Lead Source',
  stage: 'Lead Stage', leadstage: 'Lead Stage', status: 'Lead Stage',
  propertytype: 'Property Type', projecttype: 'Property Type', type: 'Property Type', unittype: 'Property Type',
  propertyaddress: 'Property Address', address: 'Property Address', location: 'Property Address', projectaddress: 'Property Address',
  leadaddress: 'Lead Address', homeaddress: 'Lead Address',
  district: 'District', areadistrict: 'District', region: 'District', estate: 'District',   // (REG-607) 1.0's "Area / District"; a bare "area" still means the size
  budget: 'Estimated Budget (S$)', budgets: 'Estimated Budget (S$)', budgetsgd: 'Estimated Budget (S$)',
  estimatedbudget: 'Estimated Budget (S$)', estimatedbudgets: 'Estimated Budget (S$)',
  startdate: 'Estimated Start Date', estimatedstartdate: 'Estimated Start Date', movein: 'Estimated Start Date',
  style: 'Style', designstyle: 'Style',
  keycollection: 'Key Collection', keys: 'Key Collection',
  condition: 'Condition', propertycondition: 'Condition',
  areasize: 'Area Size', area: 'Area Size', size: 'Area Size', sqft: 'Area Size',
  notes: 'Remarks', remarks: 'Remarks', comments: 'Remarks',   // REG-266: the canonical name is Remarks; a legacy 'Notes' header still maps
}

export function autoMap(headers: string[]): Mapping {
  const used = new Set<ImportField>()
  return headers.map((h) => {
    const k = norm(h)
    const f = Object.hasOwn(ALIASES, k) ? ALIASES[k] : undefined
    if (!f || used.has(f)) return null
    used.add(f)
    return f
  })
}

/** Row → record keyed by OpenMaison field (ignored/unmapped columns dropped). */
export function toRecord(headers: string[], mapping: Mapping, row: string[]): Record<string, string> {
  const rec: Record<string, string> = {}
  mapping.forEach((f, i) => {
    if (f && f !== IGNORE) rec[f] = (row[i] ?? '').trim()
  })
  return rec
}
