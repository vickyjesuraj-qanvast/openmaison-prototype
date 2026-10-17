/*
 * (pending modules S02 — 1.0's `/api/og` card, api:link-previews · public:client-links-no-login) What a client link shows when it is pasted
 * into WhatsApp (or any chat that unfurls links): the studio's own card — its logo, its name, what the link holds — never the platform's.
 * 1.0's card said "OpenMaison", which broke 1.0's own rule that a client never hears the platform's name; here every word is the studio's.
 *
 * Pure: the kinds, the card's words and the closed card. The records behind each kind are read in `queries.ts` (server), the picture is drawn
 * in `card-image.tsx`, the page's tags are written by `meta.ts`. Invented copy, listed in the step's register rows.
 */

/** Every client link that carries the card — the address of each is the page's own (`/sign/<id>`, `/invoice/<token>`, …). */
export const LINK_CARD_KINDS = ['sign', 'bundle', 'confirm', 'quote', 'invoice', 'receipt', 'po', 'space', 'portal', 'file', 'join', 'meeting', 'hangout'] as const   // (pending modules S09) `join` — an invitation to the studio's team · (S23) `meeting` — a meeting's invitation, then its notes · (S27) `hangout` — the studio's page for a Hangout, or a homeowner's booking on it (`<page>.<booking>`)
export type LinkCardKind = (typeof LINK_CARD_KINDS)[number]
export const isLinkCardKind = (k: unknown): k is LinkCardKind => typeof k === 'string' && (LINK_CARD_KINDS as readonly string[]).includes(k)

/** Whose card it is: the name the page's bar prints (an issuing entity's for a contract or an invoice), its logo and the brand kit's colours. */
export type CardBrand = { studio: string; logo: string | null; accent: string; ink: string; grey: string }

export type LinkCard = CardBrand & {
  /** The link still opens what it was sent for — a closed card says only that it no longer does. */
  open: boolean
  /** The card's small line over the title ("Quotation to confirm"); none on a closed card. */
  eyebrow: string | null
  /** The card's big line — what the link holds. */
  title: string
  /** Under it: whose it is, or what to do ("For Sophia Wong"). */
  line: string | null
  /** The browser tab's title — the studio's name always in it, never the platform's. */
  pageTitle: string
  /** What the chat prints in bold beside the picture (og:title). */
  headline: string
  /** The chat's grey line under it (og:description). */
  description: string
}

/** The picture's address: one route draws every kind (app/card/[kind]/[key]/route.tsx). */
export const cardPath = (kind: LinkCardKind, key: string) => `/card/${kind}/${encodeURIComponent(key)}`
export const CARD_SIZE = { width: 1200, height: 630 } as const

/** A line kept to what the card has room for, cut at a word with an ellipsis. */
export function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= n) return t
  const cut = t.slice(0, n - 1)
  const at = cut.lastIndexOf(' ')
  return `${(at > n * 0.6 ? cut.slice(0, at) : cut).trimEnd()}…`
}

/** The link no longer opens what it was sent for (stopped, deleted, never made): the studio's name and the house words of LinkNotice. */
export function closedCard(b: CardBrand, pageTitle?: string): LinkCard {
  return {
    ...b, open: false, eyebrow: null, title: 'This link is no longer active', line: `Ask ${b.studio} for an updated one`,
    pageTitle: pageTitle ?? b.studio, headline: b.studio, description: `This link is no longer active — ask ${b.studio} for an updated one.`,
  }
}

/** Not sent yet (a contract still a Draft, a quote still being prepared): the page's own "Not ready yet". (S42 B-01 · B-24) `updating` — a quote
    the client has had once, or the quote an agreement signs, being revised: it says so, as the page does. */
export function notReadyCard(b: CardBrand, pageTitle: string, what: string, updating: false | 'it' | 'its-quote' = false): LinkCard {
  return {
    ...b, open: false, eyebrow: null, title: 'Not ready yet', line: updating ? `${b.studio} is updating ${updating === 'it' ? 'it' : 'the quote'}` : `${b.studio} will send it when it’s ready`,
    pageTitle, headline: b.studio,
    description: updating === 'it' ? `${b.studio} is updating this ${what}. It’ll be back here once it’s ready.` : updating === 'its-quote' ? `${b.studio} is updating the quote this ${what} signs. It’ll be back here once it’s ready.`
      : `${b.studio} is still preparing this ${what}. You’ll get the link when it’s ready.`,
  }
}

/** Initials for a studio without a logo — the card's round mark in the accent colour. */
export function initialsOf(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean)
  const two = words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? '?').slice(0, 2)
  return two.toUpperCase()
}
