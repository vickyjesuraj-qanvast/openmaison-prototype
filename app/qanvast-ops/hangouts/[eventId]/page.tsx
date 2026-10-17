import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { fetchHangout } from '@/lib/hangouts/queries'
import { HangoutPage } from '@/components/hangouts/hangout-page'
import { defaultView, hangoutHref, isView } from '@/lib/hangouts/model'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ eventId: string }> }): Promise<Metadata> {
  if (await refusesPath(`/qanvast-ops/hangouts/${(await params).eventId}`)) return { title: 'Hangouts' }   // (S44Z) no record's name in a tab that is not theirs
  const data = await fetchHangout((await params).eventId)
  return { title: data ? `${data.event.name} · Hangouts` : 'Hangouts' }
}

/** (pending modules S27 — public:hangouts) A Hangout's page: its plan, its chats on the day, how it went. */
export default async function HangoutRoute({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ from?: string; view?: string }> }) {
  const [{ eventId }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath(`/qanvast-ops/hangouts/${eventId}`)) return <AccessGate section="Qanvast Ops" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const data = await fetchHangout(eventId)
  if (!data) notFound()
  const from = typeof sp.from === 'string' && sp.from.startsWith('/') && !sp.from.startsWith('//') ? sp.from : undefined
  /* (REG-708) the address always names the view a Hangout the studio takes part in opens on — and none for one it doesn't — so the one ghost
     its loader and its reveal draw (from the address alone) is the page's shape */
  const taking = data.participation?.status === 'confirmed'
  if (taking !== isView(sp.view)) {
    const to = taking ? hangoutHref(eventId, defaultView(data.event.phase, true)) : hangoutHref(eventId)
    redirect(from ? `${to}${to.includes('?') ? '&' : '?'}from=${encodeURIComponent(from)}` : to)
  }
  return <HangoutPage data={data} from={from} />
}
