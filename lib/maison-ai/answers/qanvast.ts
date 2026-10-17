import 'server-only'
import type { MaisonAnswer } from '@/lib/maison-ai'
import { fetchLeadCredits, fetchQanvastReviews } from '@/lib/qanvast-account/queries'
import { creditsWords, monthLong } from '@/lib/qanvast-account/model'
import { GATE_WORDS } from '@/lib/qanvast-account/policy'
import { go, type Ctx } from './common'

/*
 * (pending modules S41b-5) Maison AI's Ask box on the studio's Qanvast account — "how many lead credits are left?", "how are our Qanvast reviews?"
 * — answered by rule from the same read as Qanvast Ops › Lead credits and Reviews (the seam, lib/qanvast-account). Lead credits are the Owner's alone (1.0's rule), Reviews an Owner's or an Admin's (S42E, call E·2):
 * anyone else is told whose it is. *(invented copy)*
 */

export async function qanvastCreditsAnswer(c: Ctx): Promise<MaisonAnswer> {
  const d = await fetchLeadCredits('overview')
  if (d.gate) return { title: GATE_WORDS.credits.title, text: GATE_WORDS.credits.help }
  if ('error' in d) return { title: d.error, text: 'Lead credits are read from Qanvast each time — ask again in a moment.' }
  if (d.view !== 'overview') return { title: 'Lead credits', link: { label: 'Open Lead credits', href: go(c, '/qanvast-ops/credits') } }
  const now = d.months.find((m) => m.key === d.thisMonth)
  const used = now ? `${creditsWords(now.credits)} used in ${monthLong(d.thisMonth)} for ${now.leads} ${now.leads === 1 ? 'lead' : 'leads'}.` : ''
  const back = d.onTheWay.credits ? ` ${creditsWords(d.onTheWay.credits)} more are on the way back — Qanvast approved ${d.onTheWay.names.join(' and ')}’s return.` : ''
  return { title: `${creditsWords(d.balance)} left`, text: `${used}${back} To top up, ask your Qanvast account manager.`.trim(), link: { label: 'Open Lead credits', href: go(c, '/qanvast-ops/credits') } }
}

export async function qanvastReviewsAnswer(c: Ctx): Promise<MaisonAnswer> {
  const d = await fetchQanvastReviews('reviews')
  if (d.gate) return { title: GATE_WORDS.reviews.title, text: GATE_WORDS.reviews.help }
  if ('error' in d) return { title: d.error, text: 'Reviews are read from Qanvast each time — ask again in a moment.' }
  if (d.view !== 'reviews') return { title: 'Reviews', link: { label: 'Open Reviews', href: go(c, '/qanvast-ops/reviews') } }
  const waiting = d.list.reviews.filter((r) => !r.response)
  return {
    title: `${d.list.average.toFixed(1)} ★ from ${d.list.total} ${d.list.total === 1 ? 'review' : 'reviews'} on Qanvast`,
    text: waiting.length ? `${waiting.length} ${waiting.length === 1 ? 'waits' : 'wait'} for your reply.` : 'Every review has your reply.',
    rows: waiting.slice(0, 6).map((r) => ({ id: r.id, label: r.reviewer, meta: `${r.rating} ★ · ${r.title}`, href: go(c, '/qanvast-ops/reviews') })),
    link: { label: 'Open Reviews', href: go(c, '/qanvast-ops/reviews') },
  }
}
