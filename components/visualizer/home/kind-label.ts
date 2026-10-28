/**
 * (audit 2026-09-26, F134) What a design is, in one grammar everywhere it is said — the list's Kind column and the Kind pill: "Lead · Met"
 * for a lead's design (its stage, as the lead's own pages say it), "Studio’s own" otherwise. Pure, client-safe.
 * (pending modules S46B, M8 — 1.0 grouped designs as Projects · Leads) a lead's design whose lead is won into a live project is the project's:
 * "Project · P-2026-001", its number as the project's own pages say it (the Kind pill's Projects).
 * (the calm UI build 2026-10-27, 6-32 · W-027) a design with no client is "Studio’s own" on screen (was "Personal", which read as one member's
 * own) — the studio tasks' idea of "no client"; the stored kind stays `personal`, and so do the pill's filter key and every address.
 */
export const STUDIO_OWN = 'Studio’s own'
export function designKindLabel(kind: 'lead' | 'personal', stage: string | null | undefined, project?: string | null): string {
  if (kind !== 'lead') return STUDIO_OWN
  if (project) return `Project · ${project}`
  return stage ? `Lead · ${stage}` : 'Lead'
}

/** (the calm UI build 2026-10-27, 6-21 · 6-32) What a design's card says it is, ahead of its counts: the card leads with the client's name
    (a lead's design is named after its lead), so a lead's design needs no word and never its stage (the list's Kind column keeps "Lead · Met");
    a project's says Project (its number stays in the Kind column); one with no client says Studio’s own. */
export function designCardKind(kind: 'lead' | 'personal', project?: string | null): string | null {
  if (kind !== 'lead') return STUDIO_OWN
  return project ? 'Project' : null
}
