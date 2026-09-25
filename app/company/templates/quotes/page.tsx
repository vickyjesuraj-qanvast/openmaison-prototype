import type { Metadata } from 'next'
import { fetchTemplates } from '@/lib/templates/queries'
import { QuoteTemplatesGallery } from '@/components/company/templates/quote-templates-gallery'
import { readFrom } from '@/lib/nav'
import { fetchFolders } from '@/lib/company/folders'

export const metadata: Metadata = { title: 'Quote templates' }
export const dynamic = 'force-dynamic'

/** Company › Templates › Quotes (REG-485): the studio's quote templates — drafts, published versions, the default. */
export default async function QuoteTemplatesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [data, sp, folders] = await Promise.all([fetchTemplates(), searchParams, fetchFolders('quotes')])
  return <QuoteTemplatesGallery data={data} from={readFrom(sp.from)} folders={folders} />   /* (REG-538) Back to the editor that sent us */
}
