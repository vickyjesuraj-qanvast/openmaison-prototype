import { DIMENSIONS, WEIGHT, bracketOf, parsePreferences, type Dimension } from '@/lib/company/preferences'

/*
 * (REG-612, parity Q-27 · B-35) The suggested member for an unassigned lead — 1.0's deterministic "AI Recommendation", scored the
 * same way and no AI: Preference 0–40 (must match 3 · nice to have 1; 20 when nothing is set), Performance 0–35 (close rate,
 * projects in the last 12 months, capacity) and Specialty 0–25 (keyword matches on the member's specialty). Members closed to
 * new leads are out of the pool. Pure and client-safe: the Assign popover computes it from what it already holds.
 */
export type SuggestLead = { propertyType: string; budgetMinor: number; style: string | null; area: string | null }
export type SuggestMember = { id: string; name: string; role: string; acceptingLeads: boolean; leadPreferences: string | null; specialty: string | null }
export type MemberStat = { closeRate: number; projects12m: number; active: number }
export type MemberStats = Record<string, MemberStat>
export type Suggestion = { id: string; name: string; score: number; reason: string; breakdown: { preference: number; performance: number; specialty: number } }

const valueOf = (lead: SuggestLead, d: Dimension): string | null => d === 'propertyType' ? lead.propertyType : d === 'budget' ? bracketOf(lead.budgetMinor) : d === 'style' ? lead.style : lead.area

export function preferenceScore(lead: SuggestLead, prefsJson: string | null): { score: number; matched: { key: Dimension; value: string; priority: 'must' | 'nice' }[] } {
  const prefs = parsePreferences(prefsJson)
  const set = DIMENSIONS.filter((d) => prefs[d.key]?.values.length)
  if (!set.length) return { score: 20, matched: [] }
  let got = 0, all = 0
  const matched: { key: Dimension; value: string; priority: 'must' | 'nice' }[] = []
  for (const d of set) {
    const p = prefs[d.key]!
    all += WEIGHT[p.priority]
    const v = valueOf(lead, d.key)
    if (v && p.values.includes(v)) { got += WEIGHT[p.priority]; matched.push({ key: d.key, value: d.labelOf(v), priority: p.priority }) }
  }
  return { score: Math.round((got / all) * 40), matched }
}
export const performanceScore = (s: MemberStat | undefined): number => (s ? Math.round((s.closeRate / 100) * 15 + Math.min(s.projects12m / 20, 1) * 10 + Math.max(1 - s.active / 10, 0) * 10) : 0)
export function specialtyScore(lead: SuggestLead, specialty: string | null): number {
  const sp = (specialty ?? '').toLowerCase()
  if (!sp) return 0
  const pt = lead.propertyType.toLowerCase()
  let n = 0
  if (/hdb|bto/.test(pt) && /hdb|bto/.test(sp)) n += 10
  if (/condo|executive/.test(pt) && /condo|villa/.test(sp)) n += 10
  if (/penthouse|landed/.test(pt) && /luxury|high|landed/.test(sp)) n += 10
  const b = lead.budgetMinor / 100
  if (b >= 150_000 && /luxury|premium|high/.test(sp)) n += 8
  else if (b > 0 && b < 60_000 && /hdb|compact|bto/.test(sp)) n += 8
  else if (b >= 60_000 && b < 150_000 && /mid|residential/.test(sp)) n += 8
  if (/residential|interior/.test(sp)) n += 5
  return Math.min(25, n)
}

/** The highest total wins; the pool is every member open to new leads. Null when nobody is open. */
export function suggestMember(lead: SuggestLead, members: SuggestMember[], stats: MemberStats): Suggestion | null {
  const pool = members.filter((m) => m.acceptingLeads)   // 2.0's Owner takes leads too; "Open to new leads" is the one gate
  if (!pool.length) return null
  const scored = pool.map((m) => {
    const pref = preferenceScore(lead, m.leadPreferences)
    const performance = performanceScore(stats[m.id])
    const specialty = specialtyScore(lead, m.specialty)
    const s = stats[m.id]
    const bits: string[] = []
    if (pref.matched.length) {
      const strong = pref.matched.filter((x) => x.priority === 'must'), soft = pref.matched.filter((x) => x.priority === 'nice')
      const words = (xs: typeof pref.matched) => xs.map((x) => (x.key === 'style' ? `${x.value} style` : x.key === 'area' ? `${x.value} area` : x.value)).join(' & ')
      bits.push(`Prefers ${[strong.length ? `${words(strong)} (must match)` : '', soft.length ? `${words(soft)} (preferred)` : ''].filter(Boolean).join(', ')} leads.`)
    } else if (!m.leadPreferences) bits.push('No preferences set — considered on availability.')
    if (s && (s.projects12m > 0 || s.closeRate > 0)) bits.push(`${s.projects12m} project${s.projects12m === 1 ? '' : 's'} in the last 12 months with a ${Math.round(s.closeRate)}% close rate.`)
    if (s && s.active <= 3) bits.push(`Currently has capacity (${s.active} active lead${s.active === 1 ? '' : 's'}).`)
    return { id: m.id, name: m.name, score: pref.score + performance + specialty, reason: bits.join(' '), breakdown: { preference: pref.score, performance, specialty } }
  })
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  return scored[0] ?? null
}
