/**
 * (the close-out round 2026-10-31 — call C-04, the UI audit's 4-05) A signed contract's fingerprint follows its kept copy. The demo moves the
 * days a kept copy prints with the demo day (lib/db/demo-day.ts `shiftDateFields` — on every restore, and once by repair R180 for the copies
 * that had drifted apart); the fingerprint is then made again over the copy it now holds, the one way signing makes it (lib/contracts/snapshot.ts
 * `documentHashOf`), so the signing record names the text it shows — and a signed set's fingerprint follows its documents' (`setHashOf`, in the
 * set's reading order, as app/contracts/actions.ts `signBundleOnline` makes it). Only a fingerprint that was made that way is made again: one
 * that was not (a file's, an older rule's) is left as it is. Pure — rows in, rows out (by id, never by position); server and scripts only.
 */
import { documentHashOf, setHashOf } from '@/lib/contracts/snapshot'

type Row = Record<string, unknown>
type Rows = Partial<Record<string, Row[]>>

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const num = (v: unknown): number => (typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : Number.NEGATIVE_INFINITY)

/** A set's signed documents in its reading order — the documents its fingerprint was taken over (live, Signed, by position then age). */
function members(bundleId: unknown, contracts: Row[]): Row[] {
  return contracts
    .filter((c) => c.bundle_id === bundleId && c.status === 'Signed' && c.deleted_at == null && c.archived_at == null)
    .sort((a, b) => num(a.bundle_position) - num(b.bundle_position) || num(a.created_at) - num(b.created_at))
}

/** `after` with each signed contract's fingerprint made again where its kept copy changed from `before`, and each signed set's with them. */
export function refingerprint<T extends Rows>(before: T, after: T): T {
  const was = new Map((before.contracts ?? []).map((r) => [r.id, r]))
  const moved = new Set<unknown>()
  const contracts = (after.contracts ?? []).map((r) => {
    const o = was.get(r.id)
    const body = str(r.signed_body), oldBody = o ? str(o.signed_body) : null, title = str(r.title), hash = str(r.document_hash)
    if (!o || body === null || oldBody === null || body === oldBody || title === null || hash === null || r.source === 'uploaded') return r
    if (hash !== documentHashOf(title, oldBody)) return r   // not made over its copy: left as it is
    moved.add(r.id)
    return { ...r, document_hash: documentHashOf(title, body) }
  })
  if (!moved.size) return after
  const oldContracts = before.contracts ?? []
  const bundles = (after.contract_bundles ?? []).map((b) => {
    const set = members(b.id, contracts), signing = str(b.signing_hash)
    if (!signing || !set.some((c) => moved.has(c.id))) return b
    const oldSet = members(b.id, oldContracts)
    if (signing !== setHashOf(oldSet.map((c) => String(c.document_hash)))) return b   // not made over these documents: left as it is
    return { ...b, signing_hash: setHashOf(set.map((c) => String(c.document_hash))) }
  })
  return { ...after, contracts, ...(after.contract_bundles ? { contract_bundles: bundles } : {}) }
}
