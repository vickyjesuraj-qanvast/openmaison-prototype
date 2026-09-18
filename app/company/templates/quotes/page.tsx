import type { Metadata } from 'next'
import { fetchTemplates } from '@/lib/templates/queries'
import { QuoteTemplatesGallery } from '@/components/company/templates/quote-templates-gallery'

export const metadata: Metadata = { title: 'Quote templates' }
export const dynamic = 'force-dynamic'

/** Company › Templates › Quotes (REG-485): the studio's quote templates — drafts, published versions, the default. */
export default async function QuoteTemplatesPage() {
  const data = await fetchTemplates()
  return <QuoteTemplatesGallery data={data} />
}
