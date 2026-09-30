/**
 * (UX audit 2026-09-30, L4) How an imported cell becomes a lead's value — ONE reader for the wizard's Review step (which marks what will
 * change) and the server (importLeads stores what it read, leadFromImport turns it into a lead). Pure: no server imports.
 *
 * What an expo sheet did before: "S$80k" landed as S$80 (the digits alone), "4rm HDB", "Condo 3br" and "Landed" all became Others, every
 * source Others — and the end said "6 of 6 records imported successfully". Now amounts read k / m, property types, sources, stages and
 * districts map by sensible synonyms onto the app's own vocabulary (lib/leads/enums.ts, the studio's source list), and every cell that
 * does not land exactly as typed is reported as a change — shown in Review, counted at the end, noted on the import's history.
 */
import { ALL_STAGES, DISTRICTS, PROPERTY_TYPES } from '@/lib/leads/enums'
import type { ImportField } from '@/lib/leads/import-fields'

/** A cell that won't land as typed: what the file said and what the lead gets ('' = left blank). */
export type ImportChange = { field: ImportField; typed: string; landed: string }
/** A change named by its row and lead — what importLeads reports and the wizard's last step lists. */
export type ImportAdjustment = ImportChange & { row: number; name: string }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
/** Words that mean "no value" — a blank, not a change. */
const EMPTY_WORDS = new Set(['', '-', '--', 'na', 'n/a', 'nil', 'none', 'tbc', 'tba', 'unknown', '?', 'nk'])
const isEmptyWord = (s: string) => EMPTY_WORDS.has(s.trim().toLowerCase())

/* ---------- Amounts ---------- */

const SUFFIX: Record<string, number> = { k: 1_000, thousand: 1_000, m: 1_000_000, mil: 1_000_000, million: 1_000_000, mio: 1_000_000 }

/**
 * An amount in whole dollars: "120,000" · "S$120,000" · "$58000" · "SGD 60000" land as typed; "S$80k" → 80,000, "1.2m" → 1,200,000,
 * "80-100k" → 80,000 (the range's first figure), "about 50k" → 50,000. Null when there is no number in it.
 */
export function readAmount(raw: string): { value: number | null; plain: boolean } {
  const s = raw.trim()
  if (isEmptyWord(s)) return { value: null, plain: true }
  /* Plain: a currency mark, digits with thousands commas, an optional .00 — the number the reader typed. */
  if (/^(?:s\$|sgd|\$)?\s*\d{1,3}(?:,\d{3})*(?:\.0{1,2})?$|^(?:s\$|sgd|\$)?\s*\d+(?:\.0{1,2})?$/i.test(s)) {
    return { value: Math.round(Number(s.replace(/[^\d.]/g, ''))), plain: true }
  }
  const low = s.toLowerCase().replace(/,/g, '')
  /* A range: the first figure, taking the suffix the second one carries when the first has none ("80-100k"). */
  const range = /(\d+(?:\.\d+)?)\s*(k|m|mil|million|thousand|mio)?\s*(?:-|–|—|to)\s*(?:s\$|sgd|\$)?\s*(\d+(?:\.\d+)?)\s*(k|m|mil|million|thousand|mio)?\b/.exec(low)
  if (range) {
    const unit = range[2] ?? range[4]
    return { value: Math.round(Number(range[1]) * (unit ? SUFFIX[unit] ?? 1 : 1)), plain: false }
  }
  const one = /(\d+(?:\.\d+)?)\s*(k|m|mil|million|thousand|mio)?\b/.exec(low)
  if (!one) return { value: null, plain: false }
  const unit = one[2]
  return { value: Math.round(Number(one[1]) * (unit ? SUFFIX[unit] ?? 1 : 1)), plain: false }
}

/* ---------- Property types ---------- */

const numberWords: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5' }

/**
 * A property type onto PROPERTY_TYPES: "4rm HDB" · "HDB 4 room" · "Resale HDB 3rm" → HDB n-Room; "BTO 5-room" → BTO 5-Room;
 * "Condo 3br" · "3 bedroom condo" → Condo 3-bedder; "EC" → Executive Condo; "Semi-D" · "Terrace" · "Bungalow" → Landed — …;
 * "Office" · "Shophouse" → Commercial — …. Null when it can't be told ("Landed" alone: which landed?) — the lead gets Others.
 */
export function readPropertyType(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const exact = PROPERTY_TYPES.find((t) => norm(t) === norm(s))
  if (exact) return exact
  let low = ` ${s.toLowerCase().replace(/[-_/,.()]/g, ' ').replace(/\s+/g, ' ')} `
  for (const [w, n] of Object.entries(numberWords)) low = low.replace(new RegExp(` ${w} `, 'g'), ` ${n} `)
  const has = (re: RegExp) => re.test(low)
  const n = /(\d)\s*(?:rm|room|rooms|r|br|bed|beds|bedroom|bedrooms|bedder|bdr|bd|bhk)\b/.exec(low)?.[1] ?? null
  const bedrooms = /\d\s*(?:br|bed|beds|bedroom|bedrooms|bedder|bdr|bd|bhk)\b/.test(low)
  if (has(/ (?:ec|exec condo|executive condo|executive condominium) /) || has(/executive\s+condo/)) return 'Executive Condo'
  if (has(/penthouse| ph /)) return 'Penthouse'
  if (has(/terrace|townhouse|town house|cluster/)) return 'Landed — Terrace'
  if (has(/semi ?d\b|semi detached|semidetached|semi-detached/)) return 'Landed — Semi-D'
  if (has(/bungalow|detached|gcb|good class/)) return 'Landed — Bungalow'
  if (has(/office/)) return 'Commercial — Office'
  if (has(/retail|shop|shophouse|f&b|restaurant|cafe/)) return 'Commercial — Retail'
  const condo = has(/condo|condominium|apartment| apt |private|studio/)
  const bto = has(/ bto /)
  const hdb = has(/ hdb | flat |resale|hdb/)
  if (bto && n && Number(n) >= 2 && Number(n) <= 5) return `BTO ${n}-Room`
  if (!condo && has(/exec|executive|maisonette|jumbo| ea | em /)) return 'HDB Executive'
  if (condo) {
    if (has(/studio/) || n === '1') return 'Condo Studio / 1-bedder'
    if (n && Number(n) >= 2 && Number(n) <= 5) return `Condo ${n}-bedder`
    return null
  }
  if (n && Number(n) >= 2 && Number(n) <= 5) return bedrooms && !hdb ? `Condo ${n}-bedder` : `HDB ${n}-Room`
  return null
}

/* ---------- Sources ---------- */

/** Common ways a sheet names a source → the vocabulary's name. Only used when the studio's list carries that name. */
const SOURCE_SYNONYMS: Record<string, string> = {
  ig: 'Instagram', insta: 'Instagram', instagram: 'Instagram', instagramads: 'Instagram',
  fb: 'Facebook', facebook: 'Facebook', facebookpage: 'Facebook',
  meta: 'Meta Ads', metaads: 'Meta Ads', fbads: 'Meta Ads', facebookads: 'Meta Ads', leadads: 'Meta Ads', metaleadads: 'Meta Ads',
  google: 'Google Ads', googleads: 'Google Ads', adwords: 'Google Ads', sem: 'Google Ads', googlesearch: 'Google Ads', ppc: 'Google Ads',
  web: 'Website', site: 'Website', website: 'Website', websiteform: 'Website', webform: 'Website', homepage: 'Website', contactform: 'Website',
  walkin: 'Walk-in', walkins: 'Walk-in', showroom: 'Walk-in', showroomvisit: 'Walk-in',
  referral: 'Referral', referred: 'Referral', referal: 'Referral', friend: 'Referral', friends: 'Referral', wordofmouth: 'Referral', wom: 'Referral', pastclient: 'Referral', repeatclient: 'Referral',
  organic: 'Organic', seo: 'Organic', search: 'Organic',
  email: 'Email', edm: 'Email', newsletter: 'Email', mail: 'Email',
  qanvast: 'Qanvast', qv: 'Qanvast',
  hangout: 'Hangout', hangouts: 'Hangout',
  others: 'Others', other: 'Others',
}

/** A source onto the studio's list (retired names included, so an old export still maps). Null when it names nothing on it. */
export function readSource(raw: string, sources: readonly string[]): string | null {
  const s = raw.trim()
  if (!s) return null
  const exact = sources.find((x) => norm(x) === norm(s))
  if (exact) return exact
  const syn = SOURCE_SYNONYMS[norm(s)]
  return syn ? sources.find((x) => norm(x) === norm(syn)) ?? null : null
}

/* ---------- Stages, districts, dates, areas ---------- */

const STAGE_SYNONYMS: Record<string, (typeof ALL_STAGES)[number]> = {
  new: 'New', newlead: 'New', fresh: 'New', open: 'New',
  contacted: 'Contacted', contact: 'Contacted', called: 'Contacted', reachedout: 'Contacted',
  met: 'Met', meeting: 'Met', meetingdone: 'Met', sitevisit: 'Met', consulted: 'Met',
  quotesent: 'Quote Sent', quoted: 'Quote Sent', quotation: 'Quote Sent', quotationsent: 'Quote Sent', proposal: 'Quote Sent', proposalsent: 'Quote Sent',
  won: 'Won', closedwon: 'Won', signed: 'Won', converted: 'Won', project: 'Won',
  onhold: 'On Hold', hold: 'On Hold', paused: 'On Hold', parked: 'On Hold',
  lost: 'Lost', closedlost: 'Lost', dead: 'Lost', dropped: 'Lost',
}
export function readStage(raw: string): (typeof ALL_STAGES)[number] | null {
  const s = raw.trim()
  if (!s) return null
  return ALL_STAGES.find((x) => norm(x) === norm(s)) ?? STAGE_SYNONYMS[norm(s)] ?? null
}

/* The regions' short forms, and the towns a sheet names instead (URA's planning regions). */
const TOWNS: Record<(typeof DISTRICTS)[number], string[]> = {
  North: ['n', 'woodlands', 'yishun', 'sembawang', 'admiralty', 'mandai', 'marsiling', 'kranji'],
  'North East': ['ne', 'northeast', 'angmokio', 'amk', 'hougang', 'punggol', 'sengkang', 'serangoon', 'seletar', 'buangkok'],
  East: ['e', 'bedok', 'tampines', 'pasirris', 'changi', 'payalebar', 'simei', 'tanahmerah', 'eastcoast', 'loyang'],
  West: ['w', 'jurong', 'jurongeast', 'jurongwest', 'bukitbatok', 'bukitpanjang', 'choachukang', 'cck', 'clementi', 'tengah', 'boonlay', 'pioneer', 'westcoast', 'dover'],
  Central: ['c', 'cbd', 'town', 'bishan', 'bukitmerah', 'bukittimah', 'queenstown', 'toapayoh', 'kallang', 'geylang', 'marineparade', 'novena', 'orchard', 'tanglin', 'rivervalley', 'newton', 'outram', 'tiongbahru', 'holland', 'thomson', 'macpherson', 'potongpasir'],
}
const DISTRICT_SYNONYMS: Record<string, (typeof DISTRICTS)[number]> = Object.fromEntries(
  (Object.entries(TOWNS) as [(typeof DISTRICTS)[number], string[]][]).flatMap(([region, towns]) => towns.map((t) => [t, region])),
)
export function readDistrict(raw: string): (typeof DISTRICTS)[number] | null {
  const s = raw.trim()
  if (!s) return null
  return DISTRICTS.find((x) => norm(x) === norm(s)) ?? DISTRICT_SYNONYMS[norm(s)] ?? null
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const validDay = (y: number, m: number, d: number) => { const dt = new Date(y, m - 1, d); return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d }
/** A date as the app stores it (d/m/yyyy): d/m/yyyy lands as typed; 2026-12-01 and 1 Dec 2026 are read. Null when unreadable. */
export function readDate(raw: string): { value: string | null; plain: boolean } {
  const s = raw.trim()
  if (isEmptyWord(s)) return { value: null, plain: true }
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (m) return validDay(+m[3]!, +m[2]!, +m[1]!) ? { value: `${+m[1]!}/${+m[2]!}/${m[3]}`, plain: true } : { value: null, plain: false }
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (m && validDay(+m[1]!, +m[2]!, +m[3]!)) return { value: `${+m[3]!}/${+m[2]!}/${m[1]}`, plain: false }
  m = /^(\d{1,2})[\s-]([a-z]{3,9})[\s,-]*(\d{4})$/i.exec(s)
  const mi = m ? MONTHS.indexOf(m[2]!.slice(0, 3).toLowerCase()) : -1
  if (m && mi >= 0 && validDay(+m[3]!, mi + 1, +m[1]!)) return { value: `${+m[1]!}/${mi + 1}/${m[3]}`, plain: false }
  return { value: null, plain: false }
}

/** An area in square feet: "1,200" · "1200 sqft" land as typed; "1.2k" is read; square metres are converted ("100 sqm" → 1,076). */
export function readArea(raw: string): { value: number | null; plain: boolean } {
  const s = raw.trim()
  if (isEmptyWord(s)) return { value: null, plain: true }
  const low = s.toLowerCase().replace(/,/g, '')
  const m = /(\d+(?:\.\d+)?)\s*(k)?/.exec(low)
  if (!m) return { value: null, plain: false }
  let v = Number(m[1]) * (m[2] ? 1000 : 1)
  const metres = /sq\s*m\b|sqm|m2|m²|square met/.test(low)
  if (metres) v *= 10.7639
  const plain = !metres && !m[2] && /^\d+(?:\s*(?:sq\s*ft|sqft|sf|ft2|ft²|square feet))?$/.test(low.trim())
  return { value: Math.round(v), plain }
}

/* ---------- One record ---------- */

const amountText = (n: number) => n.toLocaleString('en-SG')

/**
 * Reads one imported record: the values the lead will get (canonical — the budget as whole-dollar digits, the vocabulary's names, dates as
 * d/m/yyyy), and each cell that won't land as typed. `batchSource` (step 2's "one lead source for the whole file") gives every row that
 * source; it is the reader's own choice, so it is not a change.
 */
export function readImportRecord(rec: Record<string, string>, sources: readonly string[], batchSource?: string | null): { record: Record<string, string>; changes: ImportChange[] } {
  const out: Record<string, string> = { ...rec }
  const changes: ImportChange[] = []
  const note = (field: ImportField, typed: string, landed: string) => changes.push({ field, typed, landed })

  if ('Estimated Budget (S$)' in rec) {
    const typed = rec['Estimated Budget (S$)'] ?? ''
    const { value, plain } = readAmount(typed)
    out['Estimated Budget (S$)'] = value && value > 0 ? String(value) : ''
    if (!plain) note('Estimated Budget (S$)', typed, value && value > 0 ? amountText(value) : '')
  }
  if ('Property Type' in rec) {
    const typed = (rec['Property Type'] ?? '').trim()
    const hit = readPropertyType(typed)
    out['Property Type'] = hit ?? (typed ? 'Others' : '')
    if (typed && norm(hit ?? 'Others') !== norm(typed)) note('Property Type', typed, hit ?? 'Others')
  }
  if (batchSource) out['Lead Source'] = batchSource
  else if ('Lead Source' in rec) {
    const typed = (rec['Lead Source'] ?? '').trim()
    const hit = readSource(typed, sources)
    out['Lead Source'] = hit ?? (typed ? 'Others' : '')
    if (typed && norm(hit ?? 'Others') !== norm(typed)) note('Lead Source', typed, hit ?? 'Others')
  }
  if ('Lead Stage' in rec) {
    const typed = (rec['Lead Stage'] ?? '').trim()
    const hit = readStage(typed)
    out['Lead Stage'] = hit ?? (typed ? 'New' : '')
    if (typed && norm(hit ?? 'New') !== norm(typed)) note('Lead Stage', typed, hit ?? 'New')
  }
  if ('District' in rec) {
    const typed = (rec['District'] ?? '').trim()
    const hit = readDistrict(typed)
    out['District'] = hit ?? ''
    if (typed && norm(hit ?? '') !== norm(typed)) note('District', typed, hit ?? '')
  }
  if ('Estimated Start Date' in rec) {
    const typed = (rec['Estimated Start Date'] ?? '').trim()
    const { value, plain } = readDate(typed)
    out['Estimated Start Date'] = value ?? ''
    if (!plain) note('Estimated Start Date', typed, value ?? '')
  }
  if ('Area Size' in rec) {
    const typed = (rec['Area Size'] ?? '').trim()
    const { value, plain } = readArea(typed)
    out['Area Size'] = value ? String(value) : ''
    if (!plain) note('Area Size', typed, value ? `${amountText(value)} sq ft` : '')
  }
  return { record: out, changes }
}

/** The field's name in a sentence, one and many: "1 budget", "3 property types". */
const NOUN: Partial<Record<ImportField, [string, string]>> = {
  'Estimated Budget (S$)': ['budget', 'budgets'],
  'Property Type': ['property type', 'property types'],
  'Lead Source': ['source', 'sources'],
  'Lead Stage': ['stage', 'stages'],
  District: ['district', 'districts'],
  'Estimated Start Date': ['start date', 'start dates'],
  'Area Size': ['area size', 'area sizes'],
}
/** The field's short label in a list of changes. */
export const CHANGE_LABEL: Partial<Record<ImportField, string>> = {
  'Estimated Budget (S$)': 'Budget', 'Property Type': 'Property type', 'Lead Source': 'Source', 'Lead Stage': 'Stage',
  District: 'District', 'Estimated Start Date': 'Start date', 'Area Size': 'Area size',
}

export type AdjustedCount = { field: ImportField; count: number }
export function countChanges(changes: readonly ImportChange[]): AdjustedCount[] {
  const m = new Map<ImportField, number>()
  for (const c of changes) m.set(c.field, (m.get(c.field) ?? 0) + 1)
  return [...m.entries()].map(([field, count]) => ({ field, count }))
}
/** "2 budgets and 3 property types" — '' when nothing changed. */
export function adjustedPhrase(counts: readonly AdjustedCount[]): string {
  const parts = counts.filter((c) => c.count > 0).map((c) => { const n = NOUN[c.field] ?? [c.field.toLowerCase(), c.field.toLowerCase()]; return `${c.count} ${c.count === 1 ? n[0] : n[1]}` })
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}
