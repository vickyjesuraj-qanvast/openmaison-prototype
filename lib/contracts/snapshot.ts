/**
 * (REG-631, contracts parity Q-05 · Q-06) The contract as the client reads it — every chip's value, the letterhead, the studio signature —
 * and its fingerprint. Pure (Node's crypto; no database): the queries read the records and call these, and so does the demo repair
 * (R50), so a copy kept at signing is made one way everywhere. Server and scripts only — the browser never needs a hash.
 */
import { createHash } from 'node:crypto'
import type { Contract } from '@/lib/db/schema'
import type { StudioDetails } from '@/lib/templates/model'
import { phoneDisplay } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { longDate } from './model'
import { resolveTokens, type TokenValues } from './tokens'
import type { SignedLetterhead, SignedStudioSignature } from './policy'
import { contractIssuer } from './issuer'
import { memberSignatureOf } from '@/lib/quotes/signature'

export type ContractLead = { id: string; name: string; phone: string; email: string | null; propertyType: string; propertyAddress: string | null; leadAddress: string | null }
export type ContractQuote = { id: string; number: string; title: string; amountMinor: number; validUntil: Date | null; projectRef: string | null; status: string }
type SignatureOwner = { id: string; name: string; signatureKind: string | null; signatureName: string | null; signatureData: string | null }

/** The chips' values for one contract — the records as Preview, the signing page and the PDF print them. */
export function tokenValuesFor(c: Contract, lead: ContractLead, studio: StudioDetails, quote: ContractQuote | null, now: number): TokenValues {
  const issuer = contractIssuer(studio, c.issuingEntity)   // (REG-632, parity Q-10) the issuer's own name, address and numbers
  return {
    'client.name': c.recipientName?.trim() || lead.name,
    'client.phone': phoneDisplay(c.recipientPhone?.trim() || lead.phone),
    'client.email': lead.email ?? '',
    'lead.address': lead.propertyAddress ?? lead.leadAddress ?? '',
    'lead.propertyType': lead.propertyType,
    'lead.projectRef': quote?.projectRef ?? '',
    'studio.name': issuer.name,
    'studio.address': issuer.address,
    'studio.phone': studio.phone,
    'studio.email': studio.email,
    'studio.uen': issuer.uen,
    'studio.gst': issuer.gstReg,
    'quote.number': quote?.number ?? '',
    'quote.total': quote ? money2(quote.amountMinor) : '',
    'quote.validUntil': quote?.validUntil ? longDate(quote.validUntil) : '',
    'date.today': longDate(new Date(now)),
    'date.contract': longDate(c.contractDate ?? c.createdAt),
  }
}

/**
 * (REG-632, contracts parity Q-08) The quote a contract reads is the one it names — never another in its place. `qs` must hold the named
 * quote even when it was archived or deleted (the editor says so). A contract naming none reads none.
 */
export const pickQuote = (c: Contract, qs: ContractQuote[]): ContractQuote | null => (c.fromQuoteId ? qs.find((q) => q.id === c.fromQuoteId) ?? null : null)
/** Which quote a new contract names when nobody picked one: the lead's Signed quote, else its latest live one (oldest first in `qs`). */
export const defaultQuote = <Q extends { status: string }>(qs: Q[]): Q | null => qs.find((q) => q.status === 'Signed') ?? qs[qs.length - 1] ?? null

/** (E-117) The studio signature a contract prints: its creator's, else the signed-in member's — (Dane UAT 6.23) drawn, typed or uploaded,
 *  read the one way every page reads it (lib/quotes/signature.ts), so the copy kept at signing holds the picture too. */
export function studioSignatureFor(createdBy: string | null, team: SignatureOwner[], sessionId: string): SignedStudioSignature {
  const m = team.find((x) => x.id === (createdBy ?? sessionId)) ?? team.find((x) => x.id === sessionId) ?? null
  return memberSignatureOf(m)
}

/** 1.0's per-document hash (B-26): SHA-256 over "html\n{title}\n{body}", the body resolved; an uploaded file is its name. */
export const documentHashOf = (title: string, resolved: string) => createHash('sha256').update(`html\n${title}\n${resolved}`).digest('hex')
/** 1.0's whole-set hash (B-29): the documents' hashes joined by "|". */
export const setHashOf = (hashes: string[]) => createHash('sha256').update(hashes.join('|')).digest('hex')
/** What the client reads: the document with every chip's value in place (an uploaded contract is its file). */
export const resolvedOf = (c: Contract, values: TokenValues) => (c.source === 'uploaded' ? `file:${c.fileName ?? c.title}` : resolveTokens(c.body ?? '', values))
export const fingerprintOf = (c: Contract, values: TokenValues) => documentHashOf(c.title, resolvedOf(c, values))
/** The letterhead a contract prints: its issuer's name, address and UEN with the studio's phone and e-mail, and the issuer's logo. */
export function letterheadOf(c: Pick<Contract, 'issuingEntity'>, studio: StudioDetails): SignedLetterhead {
  const i = contractIssuer(studio, c.issuingEntity)
  return { name: i.name, line: [i.address, studio.phone, studio.email, i.uen ? `UEN ${i.uen}` : ''].filter(Boolean).join(' · '), logo: i.logo }
}

/** The columns that keep a contract as signed, from its records at `at` (Today's date = the signing day). */
export function snapshotColumns(c: Contract, o: { lead: ContractLead | null; studio: StudioDetails; quotes: ContractQuote[]; team: SignatureOwner[]; sessionId: string; at: Date }) {
  const values = o.lead ? tokenValuesFor(c, o.lead, o.studio, pickQuote(c, o.quotes), o.at.getTime()) : {}
  const resolved = resolvedOf(c, values)
  return {
    signedBody: c.source === 'uploaded' ? null : resolved,
    signedLetterhead: JSON.stringify(letterheadOf(c, o.studio)),
    signedStudioSignature: JSON.stringify(studioSignatureFor(c.createdBy, o.team, o.sessionId)),
    documentHash: documentHashOf(c.title, resolved),
  }
}
