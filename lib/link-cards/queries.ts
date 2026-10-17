import 'server-only'   // libSQL never reaches the browser
import { and, eq, isNull, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leadFiles, leads } from '@/lib/db/schema'
import { fetchBundleSigning, fetchSigning } from '@/lib/contracts/queries'
import { bundleIdForToken } from '@/lib/contracts/link-server'
import { fetchBrand, fetchQuotePreview } from '@/lib/templates/queries'
import { fetchPublicInvoice, fetchPublicReceipt } from '@/lib/projects/payments-public'
import { fetchPoByToken } from '@/lib/finance/queries'
import { fetchPublicLayout } from '@/lib/planner/queries'
import { fetchPortalLook, resolvePortalSlug } from '@/lib/portal/queries'
import { defaultWelcome } from '@/lib/portal/sections'
import { splitPortalSlug } from '@/lib/portal/model'
import { readShareToken } from '@/lib/leads/file-share'
import { quoteByViewToken } from '@/lib/quotes/view-link-queries'
import { quoteByConfirmKey } from '@/lib/quotes/client-quote'
import { viewShows } from '@/lib/quotes/view-link'
import { fetchQuoteApproval } from '@/lib/settings/queries'
import { isConfirmable } from '@/lib/quotes/confirm-data'
import { titleCaseName } from '@/lib/format'
import { fetchJoin } from '@/lib/company/invitations-server'   // (pending modules S09)
import { asRole } from '@/lib/company/invitations'
import { fetchClientMeeting } from '@/lib/meetings/client'   // (pending modules S23)
import { fetchHangoutOwn, fetchHangoutPublic } from '@/lib/hangouts/queries'   // (pending modules S27)
import type { BrandKit } from '@/lib/templates/model'
import { clip, closedCard, notReadyCard, type CardBrand, type LinkCard, type LinkCardKind } from './model'

/*
 * (pending modules S02) Each client link's card, from the same records its page reads — so the card never says more than the page does,
 * and a link that no longer opens shows the closed card in the studio's name. Every function answers a card (never throws for a bad key).
 */

const brandOf = (kit: BrandKit, studio: string, logo?: string | null): CardBrand => ({ studio, logo: logo ?? kit.logo ?? null, accent: kit.colors.accent, ink: kit.colors.ink, grey: kit.colors.grey })
async function studioBrand(): Promise<CardBrand> {
  const b = await fetchBrand()
  return brandOf(b.kit, b.details.name || 'Your studio')
}
const firstOf = (name: string) => name.trim().split(/\s+/)[0] ?? name

async function signCard(id: string): Promise<LinkCard> {
  const d = await fetchSigning(id)   // (pending modules S03) `id` is the link's token
  if (!d) { const bundle = await bundleIdForToken(id); return bundle ? bundleCard(bundle) : closedCard(await studioBrand()) }   // a set 1.0 sent under one token
  const b = brandOf(d.brand, d.letterhead.name, d.letterhead.logo ?? d.brand.logo)
  const title = clip(d.contract.title || 'Your agreement', 70)
  const pageTitle = `Sign · ${title} · ${b.studio}`
  if (d.state === 'inactive' || d.state === 'expired') return closedCard(b, pageTitle)   // (pending modules S03) an expired link no longer opens
  if (d.state === 'not-sent') return notReadyCard(b, pageTitle, 'agreement')
  if (d.state === 'quote-updating') return notReadyCard(b, pageTitle, 'agreement', 'its-quote')   // (S42 B-01)
  const client = titleCaseName(d.lead.name)
  if (d.state === 'signed') return { ...b, open: true, eyebrow: 'Signed agreement', title, line: `Signed by ${d.contract.signedBy || client}`, pageTitle, headline: `${title} · ${b.studio}`, description: `${title} is signed. Open it to see the signed copy.` }
  return { ...b, open: true, eyebrow: 'Agreement to sign', title, line: `For ${client}`, pageTitle, headline: `${title} · ${b.studio}`, description: `${b.studio} has sent you ${title} — read it and sign online.` }
}

async function bundleCard(id: string): Promise<LinkCard> {
  const d = await fetchBundleSigning(id)
  if (!d) return closedCard(await studioBrand())
  const lh = d.documents[0]?.letterhead
  const b = brandOf(d.brand, lh?.name ?? d.studio.name, lh?.logo ?? d.brand.logo)
  const n = d.documents.length
  const docs = `${n} ${n === 1 ? 'document' : 'documents'}`
  const pageTitle = `Sign · ${docs} · ${b.studio}`
  if (d.state === 'inactive' || d.state === 'expired' || !n) return closedCard(b, pageTitle)
  if (d.state === 'not-sent') return notReadyCard(b, pageTitle, 'set of documents')
  if (d.state === 'quote-updating') return notReadyCard(b, pageTitle, 'set of documents', 'its-quote')   // (S42 B-01)
  const client = titleCaseName(d.lead.name)
  if (d.state === 'signed') return { ...b, open: true, eyebrow: 'Signed documents', title: `${docs}, signed`, line: `For ${client}`, pageTitle, headline: `${docs} from ${b.studio}`, description: `Every document on this link is signed. Open it to see the signed copies.` }
  return { ...b, open: true, eyebrow: 'Documents to sign', title: `${docs} to read and sign`, line: `For ${client}`, pageTitle, headline: `${docs} from ${b.studio}`, description: `${b.studio} has sent you ${docs} — read each one, then sign once, online.` }
}

/** The quote's confirmation link (`/confirm/<token>`, S04) and its view-only link (`/quote/<token>`) — the card the quote's own page would draw. */
async function quoteCard(quoteId: string | null, via: 'confirm' | 'view'): Promise<LinkCard> {
  const p = quoteId ? await fetchQuotePreview(quoteId) : null
  if (!p) return closedCard(await studioBrand())
  const b = brandOf(p.brand, p.data.studio.name || (await studioBrand()).studio)
  const vo = p.quote.kind === 'variation'
  const number = p.quote.number
  const title = clip(p.data.quote.title || p.quote.title || (vo ? `Variation order ${number}` : `Quote ${number}`), 70)
  const client = titleCaseName(p.data.client.name || p.quote.leadName)
  const line = `${number} · for ${client}`
  const status = p.quote.status
  if (via === 'view') {
    const pageTitle = `Quote ${number} · ${b.studio}`
    if (!viewShows({ status, approval: await fetchQuoteApproval() })) return notReadyCard(b, pageTitle, 'quote', 'it')   // a revision waiting for approval — (S42 B-24) the card says what the page says: it is being updated
    return { ...b, open: true, eyebrow: status === 'Signed' ? 'Signed quotation · view only' : 'Quotation · view only', title, line, pageTitle, headline: `Quote ${number} from ${b.studio}`,
      description: `Have a look at quote ${number} from ${b.studio} — view only, and it updates as they work on it.` }
  }
  const pageTitle = `${vo ? 'Approve' : 'Confirm'} · ${number} · ${b.studio}`
  if (status === 'Signed') return { ...b, open: true, eyebrow: 'Signed quotation', title, line, pageTitle, headline: `Quote ${number} from ${b.studio}`, description: `Quote ${number} is signed. ${b.studio} keeps a copy with you.` }
  if (status === 'Confirmed') return { ...b, open: true, eyebrow: vo ? 'Approved variation order' : 'Confirmed quotation', title, line, pageTitle, headline: `${vo ? 'Variation order' : 'Quote'} ${number} from ${b.studio}`, description: vo ? `Variation order ${number} is approved.` : `Quote ${number} is confirmed — the agreement and the signature come next.` }
  if (!isConfirmable(status)) return notReadyCard(b, pageTitle, vo ? 'variation order' : 'quote', p.quote.version > 1 ? 'it' : false)   // (S42 B-24) a revision says it is being updated
  return vo
    ? { ...b, open: true, eyebrow: 'Variation order to approve', title, line, pageTitle, headline: `Variation order ${number} from ${b.studio}`, description: `${b.studio} has sent you variation order ${number} — read the changes and approve them online.` }
    : { ...b, open: true, eyebrow: 'Quotation to confirm', title, line, pageTitle, headline: `Quote ${number} from ${b.studio}`, description: `${b.studio} has sent you quote ${number} — read it and confirm online.` }
}

async function invoiceCard(token: string): Promise<LinkCard> {
  const d = await fetchPublicInvoice(token)
  if (!d) return closedCard(await studioBrand())
  const kit = (await fetchBrand()).kit
  const b = brandOf(kit, d.studio, d.paper.letterhead.logo ?? kit.logo)
  const pageTitle = `Invoice ${d.label} · ${b.studio}`
  const settled = d.state === 'paid' || d.state === 'void' || d.state === 'credited'
  return { ...b, open: true, eyebrow: d.state === 'void' ? 'Void invoice' : d.state === 'paid' ? 'Paid invoice' : 'Invoice', title: `Invoice ${d.label}`, line: `For ${d.paper.client.name}`, pageTitle,
    headline: `Invoice ${d.label} from ${b.studio}`, description: settled ? `Invoice ${d.label} from ${b.studio} for ${d.projectName}.` : `Invoice ${d.label} from ${b.studio} — what it covers and how to pay.` }
}

async function receiptCard(token: string): Promise<LinkCard> {
  const d = await fetchPublicReceipt(token)
  if (!d) return closedCard(await studioBrand())
  const kit = (await fetchBrand()).kit
  const b = brandOf(kit, d.studio, d.paper.letterhead.logo ?? kit.logo)
  const n = d.paper.payment.number
  return { ...b, open: true, eyebrow: d.paper.payment.reversed ? 'Reversed receipt' : 'Receipt', title: `Receipt ${n}`, line: `For ${d.paper.client.name}`, pageTitle: `Receipt ${n} · ${b.studio}`,
    headline: `Receipt ${n} from ${b.studio}`, description: d.paper.payment.reversed ? `Receipt ${n} from ${b.studio} — this payment was reversed.` : `Receipt ${n} from ${b.studio} for your payment.` }
}

async function poCard(token: string): Promise<LinkCard> {
  const r = await fetchPoByToken(token)
  if (!r) return closedCard(await studioBrand())
  const kit = (await fetchBrand()).kit
  const b = brandOf(kit, r.doc.studio.name, r.doc.studio.logo ?? kit.logo)
  const n = r.doc.po.number
  const pageTitle = `Purchase order ${n} · ${b.studio}`
  if (r.state === 'cancelled') return { ...b, open: false, eyebrow: 'Cancelled', title: `Purchase order ${n}`, line: `For ${r.doc.vendor.name}`, pageTitle, headline: `Purchase order ${n} from ${b.studio}`, description: `${b.studio} cancelled purchase order ${n}.` }
  return { ...b, open: true, eyebrow: 'Purchase order', title: `Purchase order ${n}`, line: `For ${r.doc.vendor.name}`, pageTitle, headline: `Purchase order ${n} from ${b.studio}`, description: `Purchase order ${n} from ${b.studio} — what to supply, and where.` }
}

async function spaceCard(token: string): Promise<LinkCard> {
  const d = await fetchPublicLayout(token)
  if (!d) return closedCard(await studioBrand())
  const b: CardBrand = { ...(await studioBrand()), studio: d.studio.name, logo: d.studio.logo, accent: d.studio.accent }
  const name = clip(d.name, 70)
  const pageTitle = `${name} · ${b.studio}`
  if (d.state !== 'open') return closedCard(b, b.studio)
  return { ...b, open: true, eyebrow: '3D layout', title: name, line: d.sender ? `From ${firstOf(d.sender)} at ${b.studio}` : `From ${b.studio}`, pageTitle, headline: pageTitle, description: `A 3D layout from ${b.studio} — walk through it, room by room.` }
}

/** The client portal: the studio's own address (an old one names the same portal). Whatever page of it a link names, the card is the portal's. */
async function portalCard(slug: string): Promise<LinkCard> {
  const [where, look, kit] = await Promise.all([resolvePortalSlug(splitPortalSlug(slug).slug), fetchPortalLook(), fetchBrand().then((x) => x.kit)])
  const b = brandOf(kit, look.studio, look.logo)
  if (!where) return closedCard(b, `Sign in · ${b.studio}`)
  const title = clip(look.welcome ?? defaultWelcome(look.studio), 70)
  return { ...b, accent: look.colour, open: true, eyebrow: 'Your page', title, line: 'Sign in with your phone number', pageTitle: `Sign in · ${b.studio}`, headline: title,
    description: `Your page with ${b.studio} — what needs you, your files and the steps ahead. Sign in with your phone number.` }
}

async function fileCard(token: string): Promise<LinkCard> {
  const fileId = readShareToken(token)
  const [f] = fileId ? await db.select({ name: leadFiles.name }).from(leadFiles).innerJoin(leads, eq(leads.id, leadFiles.leadId))
    .where(and(eq(leadFiles.id, fileId), isNull(leadFiles.deletedAt), isNull(leads.deletedAt), ne(leadFiles.kind, 'folder'))).limit(1) : []
  const b = await studioBrand()
  if (!f) return closedCard(b)
  const name = clip(f.name, 70)
  return { ...b, open: true, eyebrow: 'Shared file', title: name, line: `From ${b.studio}`, pageTitle: `${name} · ${b.studio}`, headline: `${name} · ${b.studio}`, description: `${name} — shared by ${b.studio}.` }
}

/** (pending modules S09) An invitation to join the studio's team — in the studio's name, like every other card; once it no longer brings anyone
    in (expired, cancelled, the member gone), the closed card. */
async function joinCard(token: string): Promise<LinkCard> {
  const v = await fetchJoin(token)
  const b = await studioBrand()
  if (!v) return closedCard(b)
  const pageTitle = `Join ${v.studio}`
  if (v.state === 'inactive' || v.state === 'expired') return closedCard(b, pageTitle)
  const title = clip(`Join ${v.studio}’s team`, 70)
  if (v.state === 'joined') return { ...b, open: true, eyebrow: 'Invitation', title, line: `${v.name} has joined`, pageTitle, headline: title, description: `${v.name} is on ${v.studio}’s team.` }
  return { ...b, open: true, eyebrow: 'Invitation to join', title, line: `${v.by ? `Invited by ${v.by} · ` : ''}${asRole(v.role)}`, pageTitle, headline: title, description: `${v.by ?? v.studio} invited you to join the team ${asRole(v.role)}.` }
}

/** (pending modules S23) A meeting's client link — read through the page's own projection, so the card says no more than the page: before the
    meeting its invitation (the title and the day and time), after it the notes once shared, a thank-you when they aren't, the cancelled notice;
    a link that no longer opens is the closed card. (pending modules S23) (invented copy) */
async function meetingCard(token: string): Promise<LinkCard> {
  const v = await fetchClientMeeting(token)
  const b = await studioBrand()
  if (v.state === 'closed') return closedCard(b)
  if (v.state === 'cancelled') return { ...b, open: false, eyebrow: 'Cancelled', title: 'This meeting was cancelled', line: `${v.name} will be in touch`, pageTitle: b.studio, headline: b.studio, description: `This meeting was cancelled — ${v.name} will be in touch.` }
  const title = clip(v.title ?? `Meeting with ${v.name}`, 70)
  if (v.state === 'held' && v.notes) return { ...b, open: true, eyebrow: 'Meeting notes', title, line: `Notes from ${v.date ?? 'our meeting'}`, pageTitle: title, headline: title, description: `The notes from your meeting with ${v.name}${v.date ? ` on ${v.date}` : ''} — what was said and what’s next.` }
  if (v.state === 'held') return { ...b, open: true, eyebrow: null, title, line: `Thank you for meeting us${v.date ? ` on ${v.date}` : ''}`, pageTitle: title, headline: title, description: `Thank you for meeting us${v.date ? ` on ${v.date}` : ''}.` }
  return { ...b, open: true, eyebrow: 'Meeting invitation', title, line: v.when, pageTitle: title, headline: title,
    description: `${v.name} has invited you to a ${v.aim ?? 'meeting'} on ${v.when ?? 'the day you agreed'} — add it to your calendar, or tell them if the time doesn’t suit.` }
}

/** (pending modules S27) The studio's page for a Hangout (`<page token>`), or a homeowner's own booking on it (`<page token>.<booking token>`) — the
    event and the studio's name, never the platform's; a page that no longer opens is the closed card. (invented copy) */
async function hangoutCard(key: string): Promise<LinkCard> {
  const [page, reg] = key.split('.')
  const b = await studioBrand()
  if (reg) {
    const v = await fetchHangoutOwn(page ?? '', reg)
    if (v.state === 'gone') return closedCard(b)
    const first = v.meetings[0]
    const title = clip(`Your chat with ${v.studio.name}`, 70)
    const line = first ? [first.shiftLine, first.table ? `Table ${first.table}` : null].filter(Boolean).join(' · ') : `${v.event.daysLine} · ${v.event.venue}`
    return { ...b, open: true, eyebrow: v.event.name, title, line: clip(line, 90), pageTitle: `${title} · ${v.event.name}`, headline: title, description: `Your chat with ${v.studio.name} at ${v.event.name} — ${v.event.daysLine}, ${v.event.venue}.` }
  }
  const v = await fetchHangoutPublic(page ?? '')
  if (v.state === 'gone') return closedCard(b)
  const title = clip(`Meet ${v.studio.name} at ${v.event.name}`, 70)
  if (v.state === 'ended') return { ...b, open: true, eyebrow: null, title, line: 'This Hangout has ended', pageTitle: title, headline: title, description: `${v.event.name} has ended — thank you for coming.` }
  return { ...b, open: true, eyebrow: 'Book a chat', title, line: clip(`${v.event.daysLine} · ${v.event.venue}`, 90), pageTitle: title, headline: title,
    description: `Book a chat with ${v.studio.name}’s designers at ${v.event.name} — ${v.event.daysLine}, ${v.event.venue}.` }
}

/** The card a link of `kind` shows for `key` (its id, token or portal address). */
export async function linkCard(kind: LinkCardKind, key: string): Promise<LinkCard> {
  try {
    switch (kind) {
      case 'sign': return await signCard(key)
      case 'bundle': return await bundleCard(key)
      case 'confirm': return await quoteCard((await quoteByConfirmKey(key))?.id ?? null, 'confirm')   // (pending modules S04) the link's token
      case 'quote': return await quoteCard((await quoteByViewToken(key))?.quoteId ?? null, 'view')
      case 'invoice': return await invoiceCard(key)
      case 'receipt': return await receiptCard(key)
      case 'po': return await poCard(key)
      case 'space': return await spaceCard(key)
      case 'portal': return await portalCard(key)
      case 'file': return await fileCard(key)
      case 'join': return await joinCard(key)
      case 'meeting': return await meetingCard(key)
      case 'hangout': return await hangoutCard(key)
    }
  } catch {
    /* a record that cannot be read answers as a link that does not open — the card never fails the page */
  }
  return closedCard(await studioBrand())
}
