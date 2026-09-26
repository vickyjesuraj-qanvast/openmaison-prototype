/** A Price book item as Materials names it. */
export type BookItem = { id: string; name: string; category: string | null; vendor?: string | null }

/** (audit 2026-09-26, F120; verify round 1) One label per Price book item, both ways, wherever a material names its item — the dialog's
    picker, the card's "Quoted as …", the list's column and the search: the name alone when it is the only one; a repeated name leads with
    its vendor (else its category) — "Hafary · Homogeneous tiles…", "Soon Bee Huat · Homogeneous tiles…" — so the part that tells them apart
    survives a card's cut line; a label that still repeats is numbered. */
export function bookLabels(items: BookItem[]) {
  const byName = new Map<string, number>()
  for (const b of items) byName.set(b.name, (byName.get(b.name) ?? 0) + 1)
  const toLabel = new Map<string, string>(), toId = new Map<string, string>()
  for (const b of items) {
    const base = (byName.get(b.name) ?? 0) > 1 ? `${b.vendor?.trim() || b.category || 'No vendor'} · ${b.name}` : b.name
    let label = base, k = 2
    while (toId.has(label)) label = `${base} (${k++})`
    toLabel.set(b.id, label); toId.set(label, b.id)
  }
  return { toLabel, toId }
}
