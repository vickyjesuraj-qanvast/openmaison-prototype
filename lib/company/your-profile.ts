import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { sessionMemberId } from '@/lib/db/session'
import { fetchBrand } from '@/lib/templates/queries'
import { shortStudioName } from '@/lib/settings/types'
import { memberSignatureOf, type MemberSignature } from '@/lib/quotes/signature'
import { onLeads, opensPath } from '@/lib/settings/roles'
import { EVENTS, type EventKey } from '@/lib/notifications/model'
import { isStandInProvider } from '@/lib/auth/provider'   // (pending modules S30)
import { EVENT_PLACE, emailModeOf, mayReach, parseMuted, type EmailMode, type NoticeArea } from '@/lib/notifications/personal'

/** (pending modules S01 — his "build all of them" 2026-10-11; 1.0's Settings › Your Profile + My Signature) What Your profile shows: the
    signed-in member's own row — never anyone else's — and the studio they are in. */
export type YourProfile = {
  me: { id: string; name: string; email: string | null; phone: string | null; color: string; portalPhotoId: string | null; role: string }
  signature: MemberSignature | null
  /** (pending modules S03) whether the member allowed their signature on the documents they prepare — 'yes' · 'no' · null = never answered */
  consent: 'yes' | 'no' | null
  studio: string
  /** a member on leads signs the quotes they prepare (Accounting never prepares one) */
  signs: boolean
  /** Company › Members opens for them — their lead preferences live there */
  opensMembers: boolean
  /** (pending modules S14 — the steps' note after S01) their own PayNow, the record Members writes (`members.paynow`) — every member sets
      their own here, Accounting too (Members is not theirs to open) */
  paynow: string | null
  /** (pending modules S18) Your notifications: how their emails come, what they muted, the notices that can reach them (by area, each with
      whether the studio sends it at all), and their latest daily summary */
  notices: YourNotices
  /** (pending modules S30) the sign-in provider is the prototype's stand-in — Confirm your new number says no message is sent */
  signInStandIn: boolean
}
export type NoticeRow = { key: EventKey; label: string; help: string; icon: string; area: NoticeArea; /** the studio has it off for everyone */ studioOff: boolean }
export type YourNotices = { /** Settings › Notifications opens for them (Accounting's Settings are Finance alone) */ studioRules: boolean; email: EmailMode; /** when they chose the summary (ms) — its first one goes at the next 8 AM */ chosenAt: number | null; muted: EventKey[]; events: NoticeRow[]; lastSummary: import('@/lib/notifications/summary-server').SummaryView | null }

/** (pending modules S18) The notices that can reach this member — by their role, and whether they are the backup approver or name a reviewer
    of project updates — with the studio's own switch for each, their mute and their latest summary. From 8 AM the morning's summaries are
    written first (the stand-in for 1.0's cron), so the card shows today's. */
async function noticesOf(m: typeof members.$inferSelect): Promise<YourNotices> {
  const [{ fetchNotificationRules }, { fetchQuoteRules }, { fetchUpdateReviewers }, summary] = await Promise.all([
    import('@/lib/notifications/queries'), import('@/lib/settings/queries'), import('@/lib/projects/updates'), import('@/lib/notifications/summary-server'),
  ])
  await summary.sendDueSummaries()
  const [rules, quoteRules, reviewers, lastSummary] = await Promise.all([fetchNotificationRules(), fetchQuoteRules(), fetchUpdateReviewers(), summary.lastSummaryOf(m.id)])
  const viewer = { role: m.role, approver: quoteRules.backupApproverId === m.id, reviewer: reviewers.includes(m.id) }
  const events = EVENTS.filter((e) => mayReach(e.key, viewer)).map((e): NoticeRow => ({ key: e.key, label: e.label, help: e.help, icon: e.icon, area: EVENT_PLACE[e.key].area, studioOff: !rules.channels[e.key].in_app }))
  return { studioRules: m.role !== 'Accounting' && m.role !== 'Marketing' /* (S44O — C6) their Settings is Lead management alone */, email: emailModeOf(m.noticeEmail), chosenAt: m.noticeEmailAt?.getTime() ?? null, muted: parseMuted(m.noticeMuted, EVENTS.map((e) => e.key)), events, lastSummary }
}

export async function fetchYourProfile(): Promise<YourProfile | null> {
  const [id, brand] = await Promise.all([sessionMemberId(), fetchBrand()])
  const [m] = await db.select().from(members).where(eq(members.id, id)).limit(1)
  if (!m) return null
  return {
    me: { id: m.id, name: m.name, email: m.email, phone: m.phone, color: m.color, portalPhotoId: m.portalPhotoId, role: m.role },
    signature: memberSignatureOf(m),
    consent: m.signatureConsent === 'yes' || m.signatureConsent === 'no' ? m.signatureConsent : null,
    studio: shortStudioName(brand.details.name || 'Demo Studio'),
    signs: onLeads(m.role),
    opensMembers: opensPath(m.role, '/company/members'),
    paynow: m.paynow ?? null,
    notices: await noticesOf(m),
    signInStandIn: isStandInProvider(),
  }
}
