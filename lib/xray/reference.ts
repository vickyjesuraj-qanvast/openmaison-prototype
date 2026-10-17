/**
 * Quote X-Ray (REG-529) — the other studio's quote, read from the file. The prototype reads the three reference quotes the
 * owner shared (design-source/reference/quotes/README.md — Dyel · Flo Design · Cove Interior) as line items, by their names; since
 * pending modules S21 any other PDF is read from its own words (lib/quotes/pdf-quote.ts) and a spreadsheet for real (lib/xray/reading.ts). Amounts are S$ minor units; 0 = the line prints FOC / Inclusive / no price given.
 */
export type RefLine = { trade: string; room: string | null; name: string; qty: number; unit: string | null; amountMinor: number; brand?: string
  /** (pending modules S21) The rate the other quote states beside its quantity, when it states one (a spreadsheet's Rate column, a PDF's
      rate cell) — 1.0's arithmetic check reads it against the stated amount. The reference quotes print amounts only. */
  rateMinor?: number | null }
export type RefQuote = { key: 'dyel' | 'flo' | 'cove' | 'sheet'; studio: string; lines: RefLine[] }

const L = (trade: string, room: string | null, name: string, qty: number, unit: string | null, amount: number, brand?: string): RefLine => ({ trade, room, name, qty, unit, amountMinor: Math.round(amount * 100), brand })

/** Flo Design — "Quotation for the proposed interior design works", A–L lettered trades, a Professional Services band printing Inclusive. */
const FLO: RefQuote = { key: 'flo', studio: 'Flo Design', lines: [
  L('Professional Services', null, 'Space planning and design consultation', 1, 'Lot', 0),
  L('Professional Services', null, '3D perspective drawings for the living room and kitchen', 2, 'Pieces', 0),
  L('Professional Services', null, 'Project management and site coordination', 1, 'Lot', 0),
  L('Hacking', 'Living & Dining', 'Supply labour and tools to dismantle and remove existing laminate flooring and skirting', 1, 'Lot', 0),
  L('Hacking', 'Kitchen', 'Hack and remove existing floor and wall tiles, top and bottom cabinets', 1, 'Lot', 0),
  L('Hacking', 'Common Bathroom', 'Dismantle existing sanitary wares and fittings; hack wall and floor tiles', 1, 'Lot', 0),
  L('Hacking', 'Whole unit', 'Haulage and disposal of debris to an approved dumping site', 1, 'Lot', 3200),
  L('Masonry', 'Kitchen', 'Apply cement plaster and skim coat to hacked kitchen wall', 280, 'sqft', 1680),
  L('Masonry', 'Kitchen', 'Lay R10 slip-resistant homogeneous floor tiles with skirting', 140, 'sqft', 1890, 'Hafary'),
  L('Masonry', 'Common Bathroom', 'Apply 3-coat waterproofing membrane with upturn', 1, 'Lot', 250),
  L('Masonry', 'Common Bathroom', 'Lay full-height homogeneous wall tiles', 240, 'sqft', 2640),
  L('Masonry', 'Common Bathroom', 'Construct bathroom entrance kerb and shower drop', 1, 'Lot', 270),
  L('Carpentry', 'Kitchen', 'Design, fabricate and install kitchen top-hung cabinet with soft-closing doors', 18.5, 'ft run', 2405, 'Blum'),
  L('Carpentry', 'Kitchen', 'Design, fabricate and install kitchen bottom cabinet with drawer units and cutlery tray', 12, 'ft run', 1680, 'Blum Aventos'),
  L('Carpentry', 'Master Bedroom', 'Design, fabricate and install full-height casement wardrobe, handleless, with rounded corners', 12.5, 'ft run', 3875),
  L('Carpentry', 'Living & Dining', 'Design, fabricate and install TV console with concealed LED strip', 1, 'Lot', 1580),
  L('Countertop', 'Kitchen', 'Supply and install quartz countertop with 2 cut-outs', 12, 'ft run', 2160),
  L('Plumbing', 'Kitchen', 'Install concealed copper piping for kitchen sink and washing machine (cold water only)', 1, 'Lot', 850),
  L('Plumbing', 'Common Bathroom', 'Install concealed copper piping for WC, bidet, basin tap and shower mixer', 1, 'Lot', 1600),
  L('Plumbing', 'Common Bathroom', 'Supply labour to install storage water heater, shower mixer, basin and WC', 1, 'Lot', 0),
  L('Ceiling & Partition', 'Living & Dining', 'Construct L-box false ceiling with cove lighting', 32, 'ft run', 1920),
  L('Electrical', 'Whole unit', 'Supply and install lighting points', 18, 'point', 1260),
  L('Electrical', 'Whole unit', 'Supply and install 13A double power sockets', 14, 'point', 1120),
  L('Electrical', 'Living & Dining', 'Supply and install KDK ceiling fan point with wiring', 2, 'point', 260, 'KDK'),
  L('Glasswork', 'Common Bathroom', 'Supply & install tempered glass shower screen', 1, 'set', 780),
  L('Glasswork', 'Common Bathroom', 'Supply & install safety film for tempered glass shower screen', 1, 'Lot', 120),
  L('Painting', 'Whole unit', 'Paint internal walls of the entire unit, two coats emulsion', 1, 'Lot', 1600),
  L('Cleaning', 'Whole unit', 'Chemical wash and general cleaning on handover', 1, 'Lot', 0),
] }

/** Dyel — "Sales Contract", lettered trades A…R with area sub-headings, lump sums per trade. */
const DYEL: RefQuote = { key: 'dyel', studio: 'Dyel', lines: [
  L('Hacking & Demolishing Works', 'Kitchen', 'Hack existing kitchen cabinets, floor and wall tiles', 1, 'Lot', 1800),
  L('Hacking & Demolishing Works', 'Common Bathroom', 'Hack existing bathroom tiles and sanitary wares', 1, 'Lot', 1200),
  L('Hacking & Demolishing Works', 'Whole unit', 'Cart away and dispose of all debris', 1, 'Lot', 1500),
  L('Masonry Works', 'Kitchen', 'Cement screed and lay homogeneous floor tiles', 140, 'sqft', 2100),
  L('Masonry Works', 'Kitchen', 'Lay ceramic wall tiles between cabinets', 60, 'sqft', 900),
  L('Masonry Works', 'Common Bathroom', 'Waterproofing to floor and wall', 1, 'Lot', 350),
  L('Masonry Works', 'Common Bathroom', 'Lay homogeneous floor and wall tiles', 300, 'sqft', 3900),
  L('Carpentry Works', 'Kitchen', 'Top and bottom kitchen cabinets with laminate finish and soft-closing hinges', 30, 'ft run', 6300, 'Hafele'),
  L('Carpentry Works', 'Master Bedroom', 'Full-height wardrobe with sliding doors', 10, 'ft run', 3400),
  L('Carpentry Works', 'Living & Dining', 'Feature wall with TV console', 1, 'Lot', 2600),
  L('Carpentry Works', 'Living & Dining', 'Settee with full-height shoe cabinet and hidden door', 1, 'Lot', 3900),
  L('Countertop', 'Kitchen', 'Solid surface countertop', 12, 'ft run', 1560),
  L('Plumbing Works', 'Kitchen', 'Plumbing points for sink and washing machine', 2, 'point', 700),
  L('Plumbing Works', 'Common Bathroom', 'Plumbing points for WC, basin and shower', 3, 'point', 1200),
  L('Electrical Works', 'Whole unit', 'Lighting points', 20, 'point', 1200),
  L('Electrical Works', 'Whole unit', 'Power points', 16, 'point', 1120),
  L('Electrical Works', 'Whole unit', 'Data and TV points', 4, 'point', 320),
  L('False Ceiling / Partition Work', 'Living & Dining', 'Plaster false ceiling with cove light', 1, 'Lot', 2400),
  L('Painting Works', 'Whole unit', 'Painting to the entire unit with Nippon Vinilex 5000', 1, 'Lot', 1700, 'Nippon'),
  L('Glass Works', 'Common Bathroom', 'Tempered glass shower screen', 1, 'set', 650),
  L('Cleaning', 'Whole unit', 'Post-renovation chemical wash', 1, 'Lot', 350),
] }

/** Cove Interior — "Quotation", a boxed grid with continuous item numbers and page totals. */
const COVE: RefQuote = { key: 'cove', studio: 'Cove Interior', lines: [
  L('Design Services', null, 'Design consultation, space planning and 3D drawings', 1, 'Lot', 0),
  L('Wet Works', 'Kitchen', 'Hacking of existing kitchen floor and wall tiles', 1, 'Lot', 1500),
  L('Wet Works', 'Kitchen', 'Supply and lay homogeneous floor tiles', 140, 'sqft', 2240),
  L('Wet Works', 'Common Bathroom', 'Hacking of existing bathroom tiles and fittings', 1, 'Lot', 1100),
  L('Wet Works', 'Common Bathroom', 'Waterproofing, screeding and laying of floor and wall tiles', 300, 'sqft', 4200),
  L('Wet Works', 'Whole unit', 'Debris disposal', 1, 'Lot', 1200),
  L('Plumbing Works', 'Kitchen', 'New plumbing points for sink and washer', 2, 'point', 800),
  L('Plumbing Works', 'Common Bathroom', 'New plumbing points for WC, basin, shower and heater', 4, 'point', 1500),
  L('Electrical Works', 'Whole unit', 'Rewiring of the entire unit with new DB box', 1, 'Lot', 3800),
  L('Electrical Works', 'Whole unit', 'Lighting points', 20, 'point', 1300),
  L('Electrical Works', 'Whole unit', 'Power points', 16, 'point', 1200),
  L('Carpentry Works', 'Kitchen', 'Kitchen top and bottom cabinets, Blum soft-closing hinges', 30, 'ft run', 7200, 'Blum'),
  L('Carpentry Works', 'Kitchen', 'Quartz countertop', 12, 'ft run', 2400),
  L('Carpentry Works', 'Master Bedroom', 'Full-height wardrobe with swing doors', 12, 'ft run', 4200),
  L('Carpentry Works', 'Living & Dining', 'TV feature wall with console', 1, 'Lot', 3200),
  L('Carpentry Works', 'Living & Dining', 'Shoe cabinet', 1, 'Lot', 1400),
  L('Ceiling Works', 'Living & Dining', 'L-box false ceiling', 32, 'ft run', 2240),
  L('Painting Works', 'Whole unit', 'Painting to the entire unit, Dulux', 1, 'Lot', 1900, 'Dulux'),
  L('Glass Works', 'Common Bathroom', 'Tempered glass shower screen with door', 1, 'set', 900),
  L('Cleaning', 'Whole unit', 'Chemical wash and handover cleaning', 1, 'Lot', 400),
] }

export const REFERENCE_QUOTES: RefQuote[] = [FLO, DYEL, COVE]

/** (S42 E-05) The reference quotes by their key — what a browser that recognised one by the file's own words sends (never a file name). */
export const referenceQuote = (key: unknown): RefQuote | null => REFERENCE_QUOTES.find((q) => q.key === key) ?? null

/* (S42 E-05 · B·4 — the audit's Blocker: any file NAMED like a reference quote, an empty one too, was shown as the demo's quote and could be
   kept as the visitor's own) A reference quote is recognised by what the file SAYS, never by its name: its own words must name the studio
   and hold most of the reference's lines (each line's first words, in order). The bundled sample (public/uat-files/cove-interior-quotation.pdf)
   and the owner's own copies read as their curated lines; an empty file, a photo, or another quote from the same studio does not. */
const STUDIO_WORDS: Record<'dyel' | 'flo' | 'cove', RegExp> = { dyel: /\bdyel\b/, flo: /\bflo design\b/, cove: /\bcove interior\b/ }
const plainWords = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()
/** A line's first significant words — what a quote printing the line (even cut short with "…") still carries. */
const lineSign = (name: string) => plainWords(name).split(' ').filter((w) => w.length > 1).slice(0, 4).join(' ')
/** The reference quote a PDF's own text is, else null: the studio named, and at least 60 % of the reference's lines (never fewer than 5). */
export function referenceInText(lines: readonly string[]): RefQuote | null {
  const text = ` ${plainWords(lines.join(' '))} `
  for (const q of REFERENCE_QUOTES) {
    if (q.key === 'sheet' || !STUDIO_WORDS[q.key].test(text)) continue
    const signs = q.lines.map((l) => lineSign(l.name)).filter((s) => s.split(' ').length >= 2)
    const hits = signs.filter((s) => text.includes(` ${s} `)).length
    if (hits >= Math.max(5, Math.ceil(signs.length * 0.6))) return q
  }
  return null
}

/**
 * (S42 E-05) STORED READINGS ONLY — a comparison saved before the readings kept their lines names its other file; the demo's repair and Run
 * again read those by the stored name. An upload is never read by its name (`referenceInText`).
 * Which reference the uploaded file is — by name. Null = unreadable. (REG-639, X-Ray parity §8.2) Whole words only: "floor
 * plan.pdf", "workflow.xlsx", "information.pdf" and "scope of works.pdf" are not the reference quotes (they were, by substring —
 * E-95); "Cove floor quote.pdf" is Cove's. An underscore or a dash counts as a break ("flo_design", "cove-interior").
 */
export function readOtherQuote(fileName: string): RefQuote | null {
  const n = fileName.toLowerCase()
  if (/(?<![a-z])flo(?![a-z])/.test(n)) return FLO
  if (/(?<![a-z])(dyel|sharon)(?![a-z])|sales[\s_-]*contract/.test(n)) return DYEL
  if (/(?<![a-z])(cove|stanley)(?![a-z])/.test(n)) return COVE
  return null
}
