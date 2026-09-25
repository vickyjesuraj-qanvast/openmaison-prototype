/**
 * Quote X-Ray (REG-529) — "Key points you can use": what a brand named in a quote is known for. Curated demo notes in neutral
 * words (1.0 read these off renovation forums; the prototype keeps a small table). A brand only YOUR quote names is your
 * advantage; a brand only THEIRS names raises a question the client can ask them when the note carries an impact, and is
 * "checked, nothing to flag" when it doesn't; a brand both quotes name is left out (1.0's rule, REG-638).
 * `ask` (REG-638, X-Ray parity Q-05) is the client-safe question a brand point says — 1.0's brand facts were question-framed.
 */
export type BrandNote = { brand: string; match: RegExp; trade: string; note: string; impact: 'high' | 'mild' | null; sources: string[]; ask?: string }

export const BRAND_NOTES: BrandNote[] = [
  { brand: 'Nippon Paint', match: /nippon/i, trade: 'Painting', note: 'A named paint system, so the client knows the finish, the sheen and the warranty they are getting.', impact: null, sources: [] },
  { brand: 'Blum', match: /\bblum\b(?!\s*aventos)/i, trade: 'Carpentry', note: 'Blum hardware is well regarded, and it is priced above generic soft-closing hinges — worth confirming which drawers and doors actually get it.', impact: 'mild', sources: ['renotalk.com', 'forums.hardwarezone.com.sg'], ask: 'worth asking which drawers and doors actually get Blum hardware.' },
  { brand: 'Blum Aventos', match: /aventos/i, trade: 'Carpentry', note: 'Lift-up systems need careful fitting; owners recommend asking who installs and how adjustments are handled after handover.', impact: 'high', sources: ['renotalk.com', 'uchify.com'], ask: 'worth asking who installs the lift-up doors and how adjustments are handled after handover.' },
  { brand: 'KDK', match: /\bkdk\b/i, trade: 'Electrical', note: 'Owners report mixed experiences with newer KDK fan models; ask which model is quoted and its warranty.', impact: 'high', sources: ['renotalk.com', 'forums.hardwarezone.com.sg'], ask: 'worth asking which model is quoted and what warranty it carries.' },
  { brand: 'Hafele', match: /hafele|häfele/i, trade: 'Carpentry', note: 'Named hardware, generally well reviewed; confirm the hinge and runner series quoted.', impact: 'mild', sources: ['renotalk.com'], ask: 'worth asking which hinge and runner series is quoted.' },
  { brand: 'Hafary', match: /hafary/i, trade: 'Masonry', note: 'A named tile supplier, so the client can see and pick the actual tile before it is laid.', impact: null, sources: [] },
  { brand: 'Dulux', match: /dulux/i, trade: 'Painting', note: 'A named paint system; confirm the range (wash-and-wear or standard) and the number of coats.', impact: null, sources: [] },
  { brand: 'PE endorsement', match: /\bpe\b.*endors|endorse/i, trade: 'Hacking & Protection', note: 'Structural works signed off by a professional engineer — the client knows the hacking is checked.', impact: null, sources: [] },
  { brand: 'Prepack screed', match: /prepack|pre-pack/i, trade: 'Masonry', note: 'A factory-mixed screed gives a consistent bed under the tiles.', impact: null, sources: [] },
]
