import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchQanvastReviews, type ReviewsView } from '@/lib/qanvast-account/queries'
import { isFeedbackDays, type FeedbackDays } from '@/lib/qanvast-account/model'
import { QanvastReviews } from '@/components/qanvast/account/qanvast-reviews'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

/** (pending modules S41b-5 — 1.0's `deployment/qanvast` qanvast-ops/reviews (Reviews · Rankings) · reviews/feedback) Qanvast Ops › Reviews:
    Reviews (?request=1 opens Request reviews) · Ranking · Feedback (?days=30|60|90). Owners only (1.0's rule) — anyone else meets the tab's
    gate, and nothing is asked of Qanvast for them. */
export const dynamic = 'force-dynamic'

const VIEWS: Record<string, ReviewsView> = { ranking: 'ranking', feedback: 'feedback' }
const TITLES: Record<ReviewsView, string> = { reviews: 'Reviews', ranking: 'Ranking · Reviews', feedback: 'Feedback · Reviews' }
const viewOf = (seg: string[] | undefined): ReviewsView | null => (!seg?.length ? 'reviews' : seg.length === 1 ? VIEWS[seg[0]!] ?? null : null)

export async function generateMetadata({ params }: { params: Promise<{ view?: string[] }> }): Promise<Metadata> {
  const v = viewOf((await params).view)
  return { title: v ? `${TITLES[v]} · Qanvast Ops` : 'Qanvast Ops' }
}

export default async function QanvastReviewsPage({ params, searchParams }: { params: Promise<{ view?: string[] }>; searchParams: Promise<{ days?: string | string[]; request?: string | string[] }> }) {
  if (await refusesPath('/qanvast-ops/reviews')) return <AccessGate section="Qanvast Ops" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [{ view }, sp] = await Promise.all([params, searchParams])
  const v = viewOf(view)
  if (!v) notFound()
  const days: FeedbackDays = isFeedbackDays(sp.days) ? (Number(sp.days) as FeedbackDays) : 30
  const data = await fetchQanvastReviews(v, { days })
  return <QanvastReviews data={data} view={v} request={v === 'reviews' && sp.request === '1'} />
}
