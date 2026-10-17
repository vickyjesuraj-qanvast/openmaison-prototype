/**
 * (pending modules S23 — 1.0's portfolio matcher, src/lib/copilot/portfolio-matcher.ts) The studio's past projects closest to what the client
 * describes: style × 0.5 + the kind of home × 0.3 + budget × 0.2, 0–100, the top five above nothing. 1.0 read a separate "studio portfolio"
 * table; 2.0's portfolio is the studio's own projects (their lead's style, home and budget, their first picture in Files) — designer portfolio
 * profiles joined with Hangouts (pending modules S27 — the team’s own work is a candidate too, lib/meetings/queries.ts). 1.0 never sent a budget, so its budget share was always 0; here it reads the brief's.
 * Pure and client-safe.
 */
import { moneyCard } from '@/lib/format'
import type { Profile } from './model'

export type PortfolioProject = { id: string; number: string; name: string; propertyType: string | null; style: string | null; budgetMinor: number; stage: string; picture: string | null; href: string }
export type PortfolioMatch = PortfolioProject & { score: number; reasons: string[] }

const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3))
const family = (p: string) => (/^(hdb|bto)/i.test(p) ? 'flat' : /^(condo|executive condo|penthouse)/i.test(p) ? 'condo' : /^landed/i.test(p) ? 'landed' : /^commercial/i.test(p) ? 'commercial' : 'other')

export function matchPortfolio(projects: readonly PortfolioProject[], o: { profile: Profile; leadStyle: string | null; leadProperty: string | null; leadBudget: number }, max = 5): PortfolioMatch[] {
  const styles = [...new Set([...o.profile.styles, ...(o.leadStyle ? [o.leadStyle] : [])].map((s) => s.toLowerCase()))]
  const property = o.profile.propertyType ?? o.leadProperty
  const budget = o.profile.budgetMinor ? (o.profile.budgetMinor.min + o.profile.budgetMinor.max) / 2 : o.leadBudget > 0 ? o.leadBudget : null
  return projects.map((p) => {
    const reasons: string[] = []
    const st = p.style ? (styles.some((s) => s === p.style!.toLowerCase()) ? 1 : 0) : 0
    if (st) reasons.push(`Same style: ${p.style}`)
    let pr = 0
    if (property && p.propertyType) {
      if (property.toLowerCase() === p.propertyType.toLowerCase()) pr = 1
      else if (family(property) === family(p.propertyType)) pr = 0.6
      else { const a = words(property), b = words(p.propertyType); pr = [...a].filter((w) => b.has(w)).length / Math.max(1, Math.min(a.size, b.size)) * 0.5 }
    }
    if (pr >= 0.6) reasons.push(pr === 1 ? `Same home: ${p.propertyType}` : `A similar home: ${p.propertyType}`)
    let bu = 0
    if (budget && p.budgetMinor > 0) { const gap = Math.abs(budget - p.budgetMinor) / Math.max(budget, p.budgetMinor); bu = gap <= 0.5 ? 1 - gap / 0.5 : 0 }
    if (bu >= 0.5) reasons.push(`A similar budget: ${moneyCard(p.budgetMinor)}`)
    return { ...p, score: Math.round((st * 0.5 + pr * 0.3 + bu * 0.2) * 100), reasons }
  }).filter((m) => m.score > 0).sort((a, b) => b.score - a.score || a.number.localeCompare(b.number)).slice(0, max)
}
