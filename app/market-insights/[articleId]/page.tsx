import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readFrom } from '@/lib/nav'
import { fetchArticle } from '@/lib/market-insights/queries'
import { refusesPath } from '@/lib/leads/visibility'
import { AccessGate } from '@/components/shell/access-gate'
import { ArticlePage } from '@/components/market-insights/article-page'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ articleId: string }> }): Promise<Metadata> {
  const { articleId } = await params
  if (await refusesPath('/market-insights')) return { title: 'Market Insights' }
  const d = await fetchArticle(articleId)
  return { title: d ? `${d.article.title} · Market Insights` : 'Market Insights' }
}

/** (pending modules S25 — 1.0's /tools/market-insights/[id]) An article; one the editors took down (or that never was) answers its own notice. */
export default async function ArticleRoute({ params, searchParams }: { params: Promise<{ articleId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ articleId }, sp] = await Promise.all([params, searchParams])
  if (await refusesPath('/market-insights')) return <AccessGate section="Market Insights" />
  const data = await fetchArticle(articleId)
  if (!data) notFound()
  return <ArticlePage data={data} from={readFrom(sp.from)} />
}
