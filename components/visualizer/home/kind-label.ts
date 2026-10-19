/**
 * (audit 2026-09-26, F134) What a design is, in one grammar everywhere it is said — the landing card's line, the list's Kind column and the
 * editor's name chip: "Lead · Met" for a lead's design (its stage, as the lead's own pages say it), "Personal" otherwise. Pure, client-safe.
 * (pending modules S46B, M8 — 1.0 grouped designs as Projects · Leads) a lead's design whose lead is won into a live project is the project's:
 * "Project · P-2026-001", its number as the project's own pages say it (the Kind pill's Projects).
 */
export function designKindLabel(kind: 'lead' | 'personal', stage: string | null | undefined, project?: string | null): string {
  if (kind !== 'lead') return 'Personal'
  if (project) return `Project · ${project}`
  return stage ? `Lead · ${stage}` : 'Lead'
}
