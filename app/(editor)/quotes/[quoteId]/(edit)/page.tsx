import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { notFound } from 'next/navigation'
import { fetchQuoteEditor } from '@/lib/quotes/editor'
import { QuoteEditor } from '@/components/quotes/editor/quote-editor'
import { readFrom } from '@/lib/nav'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ quoteId: string }> }): Promise<Metadata> {
  const { quoteId } = await params
  if (await refusesPath(`/quotes/${quoteId}`)) return { title: 'Quotes' }   // (S44O — C6) no record's name in a tab that is not theirs
  const data = await fetchQuoteEditor(quoteId)
  return { title: data ? `${data.quote.number} · ${data.lead.name}` : 'Quote' }
}

/**
 * Quote editor (Figma 1271:40301): a full-page surface over the page the user came from — no rail (app/quotes/layout.tsx).
 * A missing or deleted quote is a 404. Spec: design-source/context/quote-editor/00-build-plan.md.
 */
export default async function QuoteEditorPage({ params, searchParams }: { params: Promise<{ quoteId: string }>; searchParams: Promise<{ from?: string; section?: string; apply?: string; restored?: string; drafted?: string; send?: string }> }) {
  const { quoteId } = await params
  if (await refusesPath(`/quotes/${quoteId}`)) return <AccessGate section="Quotes" />   // (S44O — call C6) the role's own list (Marketing never reads a quote's money, a project or Finance) — before a record is read
  const sp = await searchParams
  const data = await fetchQuoteEditor(quoteId)
  if (!data) notFound()
  return <QuoteEditor data={data} from={readFrom(sp.from)} section={typeof sp.section === 'string' ? sp.section.replace(/[^a-z]/g, '') : undefined} apply={typeof sp.apply === 'string' ? sp.apply : undefined} restored={typeof sp.restored === 'string' && /^\d+$/.test(sp.restored) ? Number(sp.restored) : undefined} drafted={sp.drafted === '1'} send={sp.send === 'confirm' ? 'confirm' : undefined} />   /* (fix-C, C-13) a pick's variation order just drafted: said here, where it opens */   /* (REG-579) `apply`: back from "Publish and update" — the quote asks before taking the new defaults */   /* (REG-465) close returns where the editor was opened from */   /* (simplify round 2, R2-A) `send=confirm`: Money's Send VO-n — Send for confirmation opens on arrival */
}
