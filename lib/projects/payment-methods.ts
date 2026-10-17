/**
 * (parity map, FB-112 · CP-089 — 1.0's Accounts Setup › Finance › Payment Methods › Collection Methods) How the studio's clients may pay, pure
 * and client-safe. Settings › Finance › Client payments switches each of the four ways money comes (the record dialog's own four: Bank transfer ·
 * PayNow · Cheque · Cash) on or off — at least one stays on — and asks OpenMaison to match bank transfers automatically (a recorded ask, a
 * stand-in: nothing reads a bank feed). What reads it:
 *   · the studio's Record a payment offers the live ways only (`liveMethods`) and the server refuses one switched off (`methodRefusal`);
 *   · the client's pay box and the invoice's How to pay show the bank only while Bank transfer is on, PayNow (its ID and its QR) only while
 *     PayNow is on (`payShows`);
 *   · the client's *I have paid* offers the live ones of its two (`clientMethods`).
 * Stored under its own settings key (`payment_collection`), so a studio that never opens the card loses nothing: no row = every way on, as before.
 * Stored as the ways switched OFF, so a way added later starts on.
 */
import { CLIENT_METHODS, PAYMENT_METHODS, isPaymentMethod, type PaymentMethod } from './payments-model'

export const PAYMENT_COLLECTION_KEY = 'payment_collection'

/** A way a client pays, as the record dialog and the portal name it. */
export type CollectMethod = PaymentMethod
export type MethodOption = (typeof PAYMENT_METHODS)[number]

/** The studio's ask to have bank transfers matched automatically — recorded, answered by the OpenMaison team (a stand-in). */
export type BankFeedAsk = { askedAt: number; askedBy: string | null; askedByName: string | null }
export type CollectionRules = {
  /** the ways switched off — never all four */ off: CollectMethod[]
  /** the bank-feed ask, while it stands */ bankFeed: BankFeedAsk | null
}
export const DEFAULT_COLLECTION: CollectionRules = { off: [], bankFeed: null }

/** What each way says on the card: where the client meets it. */
export const METHOD_HELP: Record<CollectMethod, string> = {
  bank_transfer: 'The bank and account number print on the invoice and show on the client’s page',
  paynow: 'The PayNow ID and its QR code — with the amount and the invoice number in it',
  cheque: 'The client hands it over; the studio records it when it arrives',
  cash: 'The client pays in person; the studio records it when it is handed over',
}
/** The rule a refusal says when the last way would go off. */
export const LAST_METHOD_RULE = 'Keep at least one way to pay switched on'
export const methodOffRule = (m: string) => `${methodName(m)} is switched off in Settings › Finance › Client payments`
const methodName = (m: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m

export function parseCollection(v: unknown): CollectionRules {
  const r = (v ?? {}) as { off?: unknown; bankFeed?: unknown }
  const off = Array.isArray(r.off) ? [...new Set(r.off.filter(isPaymentMethod))] : []
  const b = (r.bankFeed ?? null) as Partial<Record<keyof BankFeedAsk, unknown>> | null
  const bankFeed = b && typeof b.askedAt === 'number' && Number.isFinite(b.askedAt)
    ? { askedAt: b.askedAt, askedBy: typeof b.askedBy === 'string' ? b.askedBy : null, askedByName: typeof b.askedByName === 'string' ? b.askedByName.slice(0, 80) : null }
    : null
  /* never all four off: a stored list that says so is read as every way on (the rule the card and the server keep) */
  return { off: off.length >= PAYMENT_METHODS.length ? [] : off, bankFeed }
}

/** The ways the studio takes today, in the house order — what Record a payment offers. Null rules = every way (nothing set yet). */
export function liveMethods(rules: CollectionRules | null | undefined): MethodOption[] {
  const off = new Set(rules?.off ?? [])
  const live = PAYMENT_METHODS.filter((m) => !off.has(m.value))
  return live.length ? live : [...PAYMENT_METHODS]
}
export const isLive = (rules: CollectionRules | null | undefined, m: string) => liveMethods(rules).some((x) => x.value === m)
/** The client's *I have paid* choices: the live ones of the two a client sends from home (cheques and cash go by hand). May be empty. */
export const clientMethods = (rules: CollectionRules | null | undefined) => CLIENT_METHODS.filter((m) => isLive(rules, m.value))
/** A payment recorded by a way switched off — the server's refusal (null = fine). */
export const methodRefusal = (rules: CollectionRules | null | undefined, m: string): string | null => (isPaymentMethod(m) && !isLive(rules, m) ? methodOffRule(m) : null)
/** What a pay box and an invoice's How to pay may show: the bank while Bank transfer is on, PayNow (ID + QR) while PayNow is on. */
export const payShows = (rules: CollectionRules | null | undefined): { bank: boolean; payNow: boolean } => ({ bank: isLive(rules, 'bank_transfer'), payNow: isLive(rules, 'paynow') })
/** The same from a list of live method values (what a page hands a client component). */
export const payShowsFrom = (live: readonly string[] | null | undefined): { bank: boolean; payNow: boolean } =>
  (live ? { bank: live.includes('bank_transfer'), payNow: live.includes('paynow') } : { bank: true, payNow: true })

/** One switch pressed: the next rules, or the rule that refuses it. */
export function withMethod(rules: CollectionRules, m: CollectMethod, on: boolean): CollectionRules | { error: string } {
  const off = new Set(rules.off)
  if (on) off.delete(m); else off.add(m)
  if (off.size >= PAYMENT_METHODS.length) return { error: LAST_METHOD_RULE }
  return { ...rules, off: PAYMENT_METHODS.map((x) => x.value).filter((v) => off.has(v)) }
}
