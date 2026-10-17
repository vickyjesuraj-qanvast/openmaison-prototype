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
import { appliedSignatureOf } from '@/lib/quotes/signature'
import { commercialOf } from '@/lib/leads/enums'   // (S42 B-05)

export type ContractLead = { id: string; name: string; phone: string; email: string | null; propertyType: string; propertyAddress: string | null; leadAddress: string | null; /** (pending modules S05) a commercial client's */ companyName?: string | null; companyUen?: string | null
  /** (S44R — UAT row 359, call C9) the lead's project, for the Handover fields */ project?: { number: string; completedAt: Date | null } | null }
export type ContractQuote = { id: string; number: string; title: string; amountMinor: number; validUntil: Date | null; projectRef: string | null; status: string
  /** (S44R — UAT row 358, call C7) its first payment stage's amount — the Deposit field */ depositMinor?: number | null }
/** (S44R, C9) A day plus whole months, as a defects period ends: 15 Oct + 12 months = 15 Oct next year (a 31st falls back to the month's last day). */
export function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth() + months, 1, d.getHours(), d.getMinutes())
  const last = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate()
  out.setDate(Math.min(d.getDate(), last))
  return out
}
type SignatureOwner = { id: string; name: string; signatureKind: string | null; signatureName: string | null; signatureData: string | null; signatureConsent?: string | null }

/** The chips' values for one contract — the records as Preview, the signing page and the PDF print them. */
export function tokenValuesFor(c: Contract, lead: ContractLead, studio: StudioDetails, quote: ContractQuote | null, now: number): TokenValues {
  const issuer = contractIssuer(studio, c.issuingEntity)   // (REG-632, parity Q-10) the issuer's own name, address and numbers
  return {
    'client.name': c.recipientName?.trim() || lead.name,
    'client.phone': phoneDisplay(c.recipientPhone?.trim() || lead.phone),
    'client.email': lead.email ?? '',
    'client.company': commercialOf(lead).company,   // (pending modules S05 — testers' L-3) · (S42 B-05) only while the lead is commercial
    'client.uen': commercialOf(lead).uen,
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
    'quote.deposit': quote?.depositMinor ? money2(quote.depositMinor) : '',   // (S44R, C7)
    ...handoverValues(c, lead),   // (S44R, C9)
    'date.today': longDate(new Date(now)),
    'date.contract': longDate(c.contractDate ?? c.createdAt),
  }
}
/** (S44R — UAT row 359, call C9) The Handover fields: the project's number; the completion day (a completion letter's own date — it is made on
    the day — else the project's completion); the defects period the letter carries, and the day it ends. Empty prints the field's label in
    brackets, as every field does. */
function handoverValues(c: Pick<Contract, 'purpose' | 'contractDate' | 'defectsMonths'>, lead: ContractLead): Partial<TokenValues> {
  const done = c.purpose === 'handover' && c.contractDate ? c.contractDate : lead.project?.completedAt ?? null
  const months = c.defectsMonths ?? null
  return {
    'project.number': lead.project?.number ?? '',
    'project.completedOn': done ? longDate(done) : '',
    'project.defectsPeriod': months ? `${months} ${months === 1 ? 'month' : 'months'}` : '',
    'project.defectsUntil': done && months ? longDate(addMonths(done, months)) : '',
  }
}

/**
 * (REG-632, contracts parity Q-08) The quote a contract reads is the one it names — never another in its place. `qs` must hold the named
 * quote even when it was archived or deleted (the editor says so). A contract naming none reads none.
 */
export const pickQuote = (c: Contract, qs: ContractQuote[]): ContractQuote | null => (c.fromQuoteId ? qs.find((q) => q.id === c.fromQuoteId) ?? null : null)
/** Which quote a new contract names when nobody picked one: the lead's Signed quote, else (S42 B-16) the newest one the client has —
    Confirmed, then Sent to Client, then Approved — before the newest of all (`qs` oldest first). A fresh Draft never takes the place of the
    quote the client is deciding on. */
const BEFORE_NEWEST = ['Confirmed', 'Sent to Client', 'Approved'] as const
export const defaultQuote = <Q extends { status: string }>(qs: Q[]): Q | null => {
  const signed = qs.find((q) => q.status === 'Signed'); if (signed) return signed
  for (const s of BEFORE_NEWEST) { const hit = qs.filter((q) => q.status === s).at(-1); if (hit) return hit }
  return qs[qs.length - 1] ?? null
}

/** (E-117) The studio signature a contract prints: its creator's, else the signed-in member's — (Dane UAT 6.23) drawn, typed or uploaded,
 *  read the one way every page reads it (lib/quotes/signature.ts), so the copy kept at signing holds the picture too. (pending modules S03)
 *  Only a signature its member allowed on their documents — never stamped without their yes. The copy kept at signing freezes it with
 *  the name it prints (S01's note: a later rename or a removed signature never reaches a signed contract). */
export function studioSignatureFor(createdBy: string | null, team: SignatureOwner[], sessionId: string): SignedStudioSignature {
  const m = team.find((x) => x.id === (createdBy ?? sessionId)) ?? team.find((x) => x.id === sessionId) ?? null
  return appliedSignatureOf(m)
}
/** Whose signature that is, and whether it prints: none saved, saved but not allowed, or on — the editor's send check says which. */
export function studioSignatureState(createdBy: string | null, team: SignatureOwner[], sessionId: string): 'none' | 'off' | 'on' {
  const m = team.find((x) => x.id === (createdBy ?? sessionId)) ?? team.find((x) => x.id === sessionId) ?? null
  if (!m?.signatureKind) return 'none'
  return m.signatureConsent === 'yes' ? 'on' : 'off'
}

/** 1.0's per-document hash (B-26): SHA-256 over "html\n{title}\n{body}", the body resolved; an uploaded file is its name. */
export const documentHashOf = (title: string, resolved: string) => createHash('sha256').update(`html\n${title}\n${resolved}`).digest('hex')
/** 1.0's whole-set hash (B-29): the documents' hashes joined by "|". */
export const setHashOf = (hashes: string[]) => createHash('sha256').update(hashes.join('|')).digest('hex')
/** What the client reads: the document with every chip's value in place (an uploaded contract is its file). */
export const resolvedOf = (c: Contract, values: TokenValues) => (c.source === 'uploaded' ? `file:${c.fileName ?? c.title}${c.fileId ? `#${c.fileId}` : ''}` : resolveTokens(c.body ?? '', values))   // (pending modules S03) a kept PDF: the file itself, so a replaced PDF refuses a signature over the old one
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
