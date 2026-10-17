/**
 * (gaps build, package C — 3; the report 26-… `1-listing-start.md` "Ready-made schedule templates, and a default for each kind of job",
 * 1.0's B-251 · B-255 · B-256) The ready-made schedules every studio's library starts with — HDB BTO, HDB resale, Condo, Landed and Commercial
 * fit-out — as Singapore jobs of each kind run, at usual lengths (calendar days, Q-11). They are ordinary rows in Company › Templates ›
 * Schedules (`schedule_templates.preset_key` marks them): a studio renames, changes or deletes them like its own, and a deleted one stays
 * deleted. Set up the schedule picks the one that fits the project's property type (`presetForProperty`). Pure and client-safe.
 *
 * A gap is the days after the one before ends (negative = they overlap: services start while the tiling finishes; carpentry is made off
 * site while the works go on). The stage names are the schedule's own (`PHASES`) wherever they fit, so a move reads "Carpentry moved…".
 */
import type { TemplateItem } from './schedule-phases'

export type SchedulePreset = { key: string; name: string; items: TemplateItem[] }
const it = (title: string, days: number, gap: number, askConfirm = false): TemplateItem => ({ title, days, gap, askConfirm })

export const SCHEDULE_PRESETS: readonly SchedulePreset[] = [
  { key: 'hdb_bto', name: 'HDB BTO', items: [
    it('Site protection', 1, 0), it('Electrical & plumbing', 7, 1), it('Ceiling & partitions', 7, 1), it('Flooring', 5, 1),
    it('Carpentry fabrication', 21, -14), it('Installation', 5, 1), it('Painting', 5, 1), it('Cleaning & touch-up', 3, 1), it('Handover & defect check', 2, 1, true),
  ] },
  { key: 'hdb_resale', name: 'HDB resale', items: [
    it('Hacking & demolition', 7, 0), it('Masonry & tiling', 18, 1), it('Electrical & plumbing', 14, -5), it('Carpentry fabrication', 24, -7),
    it('Installation', 7, 1), it('Painting', 7, 1), it('Cleaning & touch-up', 3, 1), it('Handover & defect check', 3, 1, true),
  ] },
  { key: 'condo', name: 'Condo', items: [
    it('MCST approval & site protection', 5, 0), it('Hacking & demolition', 5, 1), it('Masonry & tiling', 14, 1), it('Electrical & plumbing', 10, -4),
    it('Carpentry fabrication', 21, -4), it('Installation', 7, 1), it('Painting', 5, 1), it('Cleaning & touch-up', 3, 1), it('Handover & defect check', 3, 1, true),
  ] },
  { key: 'landed', name: 'Landed', items: [
    it('Permits & site protection', 10, 0), it('Hacking & demolition', 14, 1), it('Structural works', 21, 1), it('Roofing & waterproofing', 10, -5),
    it('Masonry & tiling', 21, 1), it('Electrical & plumbing', 21, -10), it('Carpentry fabrication', 30, -10), it('Installation', 10, 1),
    it('Painting', 10, 1), it('External works & landscaping', 10, -5), it('Cleaning & touch-up', 4, 1), it('Handover & defect check', 4, 1, true),
  ] },
  { key: 'commercial', name: 'Commercial fit-out', items: [
    it('Approvals & site survey', 7, 0), it('Demolition & site protection', 5, 1), it('Partitions & ceilings', 10, 1), it('Electrical, data & air-con', 10, -3),
    it('Flooring', 5, 1), it('Carpentry & joinery', 14, -5), it('Installation', 5, 1), it('Painting', 4, 1), it('Cleaning & touch-up', 2, 1), it('Handover & defect check', 2, 1, true),
  ] },
]
export const presetByKey = (key: string | null | undefined) => (key ? SCHEDULE_PRESETS.find((p) => p.key === key) ?? null : null)

/** The ready-made schedule a project's kind of job calls for: a commercial fit-out (by its project type or its property), else the property
    type's — a BTO flat, any other HDB flat, a condo (an executive condo and a penthouse too), a landed home. Null when nothing fits ("Others"). */
export function presetForProperty(propertyType: string | null | undefined, projectType?: string | null): string | null {
  const p = (propertyType ?? '').toLowerCase()
  if ((projectType ?? '').toLowerCase().includes('commercial') || p.startsWith('commercial')) return 'commercial'
  if (p.startsWith('bto')) return 'hdb_bto'
  if (p.startsWith('hdb')) return 'hdb_resale'
  if (p.includes('condo') || p.startsWith('penthouse')) return 'condo'
  if (p.startsWith('landed')) return 'landed'
  return null
}

/** The settings key that says the ready-made schedules were given to this studio — once, so one the studio deletes stays deleted. */
export const PRESETS_SEEDED_KEY = 'schedule_presets_seeded'
