/**
 * (parity map, CP-099 — 1.0's Documents, I-322 · I-325) What a file the studio shared is, for the client's Files: Contracts · Quotes ·
 * Variation orders · Designs · Floor plans · Site photos · Other — pure and client-safe. 2.0 keeps no "kind" on a lead file, so the kind is
 * read by rule, first match wins:
 *   1. a design the Visualizer made (the file is a render's) → Designs;
 *   2. the folders it sits in, nearest first (the studio's starter folders — "Contract & VOs", "Quotes & BOQ", "Renders", "Floor plans",
 *      "Site photos", "Site updates" — and any folder named the same way);
 *   3. its name ("…floor plan…", "VO-3 …", "Agreement …", "Quotation …", "3D render …");
 *   4. Other.
 * A variation order filed under "Contract & VOs" is told from the contract by its name (VO · variation). The client's Files draws a heading
 * only for the kinds it holds, in this order.
 */
export type SharedFileKind = 'contracts' | 'quotes' | 'variations' | 'designs' | 'floor-plans' | 'site-photos' | 'other'
export const SHARED_FILE_KINDS: readonly { key: SharedFileKind; label: string; icon: string }[] = [
  { key: 'contracts', label: 'Contracts', icon: 'contract' },
  { key: 'quotes', label: 'Quotes', icon: 'request_quote' },
  { key: 'variations', label: 'Variation orders', icon: 'request_quote' },
  { key: 'designs', label: 'Designs', icon: 'wand_shine' },
  { key: 'floor-plans', label: 'Floor plans', icon: 'space_dashboard' },
  { key: 'site-photos', label: 'Site photos', icon: 'photo_camera' },
  { key: 'other', label: 'Other', icon: 'description' },
]

const VO = /\b(vo|v\.o\.|variation)s?\b|\bvo[-\s]?\d/i
const RULES: readonly { kind: SharedFileKind; words: RegExp }[] = [
  { kind: 'floor-plans', words: /floor[\s-]?plans?|layout plans?|\bplans?\b.*\b(as[\s-]built|level|unit)\b/i },
  { kind: 'designs', words: /\brenders?\b|\bdesigns?\b|\b3d\b|visuali[sz]|mood\s?board|perspective/i },
  { kind: 'site-photos', words: /\bsite\b|\bprogress\b|\bphotos?\b/i },
  { kind: 'quotes', words: /\bquot(e|es|ation|ations)\b|\bboq\b|\bestimate\b/i },
  { kind: 'contracts', words: /\bcontracts?\b|\bagreements?\b|\bsigned\b/i },
]

/** One name's kind by its words, or null — a VO before a contract (they share a folder), a plan before a design. */
function byWords(name: string): SharedFileKind | null {
  if (VO.test(name)) return 'variations'
  for (const r of RULES) if (r.words.test(name)) return r.kind
  return null
}

/** The kind of a shared file: `render` — the Visualizer made it; `folders` — its folders' names, nearest first. */
export function sharedFileKind(f: { name: string; kind: string; render?: boolean; folders?: readonly string[] }): SharedFileKind {
  if (f.render) return 'designs'
  const own = byWords(f.name)
  for (const folder of f.folders ?? []) {
    const k = byWords(folder)
    if (!k) continue
    /* "Contract & VOs" holds both: the file's own name says which; a picture filed under a contract's folder is still a site photo or a design */
    if (k === 'variations' || k === 'contracts') return own === 'variations' || own === 'contracts' ? own : f.kind === 'image' && own ? own : 'contracts'
    return k
  }
  return own ?? 'other'
}

/** The kinds a list holds, in the house order — the headings the client's Files draws; none at all when everything is Other. */
export function sharedFileGroups<T extends { group?: SharedFileKind }>(files: readonly T[]): { key: SharedFileKind; label: string; files: T[] }[] {
  const groups = SHARED_FILE_KINDS.map((k) => ({ key: k.key, label: k.label, files: files.filter((f) => (f.group ?? 'other') === k.key) })).filter((g) => g.files.length)
  return groups
}
