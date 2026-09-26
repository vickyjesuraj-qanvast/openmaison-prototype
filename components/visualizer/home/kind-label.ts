/**
 * (audit 2026-09-26, F134) What a design is, in one grammar everywhere it is said — the landing card's line, the list's Kind column and the
 * editor's name chip: "Lead · Met" for a lead's design (its stage, as the lead's own pages say it), "Personal" otherwise. Pure, client-safe.
 */
export function designKindLabel(kind: 'lead' | 'personal', stage: string | null | undefined): string {
  if (kind !== 'lead') return 'Personal'
  return stage ? `Lead · ${stage}` : 'Lead'
}
