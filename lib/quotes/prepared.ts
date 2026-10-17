import type { Member } from '@/lib/db/schema'
import { appliedSignatureOf, isSignatureImage, isSignatureKind, isSignaturePath, type MemberSignature } from './signature'

/**
 * (pending modules S04 — S01's note: "quotes read the preparer's name, email and signature live, so a rename or a removed signature reaches
 * quotes already sent") What a quote's paper prints of the member who prepared it — `{prepared_by}`, `{prepared_by_email}`, the role line,
 * "every member on the lead" and the studio signature box — is kept when the quote first goes to the client (`quotes.prepared_json`), as a
 * signed contract keeps its signature (REG-630). Before that it is read live; a revision (Revise) starts live again and keeps the new one at
 * its next send; a kept version prints what it kept. Consent applies at the moment it is kept (S03's `appliedSignatureOf`): a signature its
 * member had not allowed is not kept, and a "no" said later never takes one back from a quote already with its client. Pure, client-safe.
 */
export type PreparedSnapshot = {
  /** the member it names — the record, never printed */ memberId: string | null
  name: string; email: string; role: string
  /** every member on the lead, for "Prepared by: every member on the lead" (REG-618) */ team: string[]
  signature: MemberSignature | null
  /** when it was kept */ at: number
}

/** The quote has gone to its client: sent to them (`client_sent_at`), or confirmed or signed without a send on the record. */
export const withClient = (q: { status: string; clientSentAt: Date | number | null }) => !!q.clientSentAt || q.status === 'Confirmed' || q.status === 'Signed'

/** The role line a quote prints for its preparer (REG-560). */
export const preparedRole = (m: Pick<Member, 'role'> | null) => (m?.role === 'Owner' ? 'Principal Designer' : m ? 'Designer' : '')

/** The preparer as the paper prints them today, from the records: the quote's Prepared by — else whoever has the quote open (the old rule). */
export function livePrepared(o: { preparedBy: string | null; members: Member[]; teamIds?: string[] }): Omit<PreparedSnapshot, 'at'> {
  const m = o.members.find((x) => x.id === o.preparedBy) ?? o.members.find((x) => x.isYou) ?? null
  return {
    memberId: m?.id ?? null, name: m?.name ?? '', email: m?.email ?? '', role: preparedRole(m),
    team: (o.teamIds ?? []).map((id) => o.members.find((x) => x.id === id)?.name).filter((n): n is string => !!n),
    signature: appliedSignatureOf(m),
  }
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
/** A stored snapshot, checked as it is read (a stored signature must still be one the pages can draw) — null when there is none. */
export function parsePrepared(json: string | null | undefined): PreparedSnapshot | null {
  if (!json) return null
  let raw: unknown
  try { raw = JSON.parse(json) } catch { return null }
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const sig = r.signature && typeof r.signature === 'object' ? (r.signature as Record<string, unknown>) : null
  const kind = sig?.kind
  const data = sig ? (typeof sig.data === 'string' ? sig.data : null) : null
  const signature: MemberSignature | null = sig && isSignatureKind(kind) && (kind === 'type' || (kind === 'image' ? isSignatureImage(data) : isSignaturePath(data)))
    ? { kind, name: str(sig.name, 120), data: kind === 'type' ? null : data } : null
  return {
    memberId: typeof r.memberId === 'string' ? r.memberId : null,
    name: str(r.name, 120), email: str(r.email, 200), role: str(r.role, 60),
    team: Array.isArray(r.team) ? r.team.filter((t): t is string => typeof t === 'string').map((t) => t.slice(0, 120)).slice(0, 40) : [],
    signature, at: typeof r.at === 'number' ? r.at : 0,
  }
}
