import type { Metadata } from 'next'
import { fetchTemplates } from '@/lib/templates/queries'
import { QuoteTemplatesGallery } from '@/components/company/templates/quote-templates-gallery'
import { readFrom } from '@/lib/nav'
import { fetchFolders } from '@/lib/company/folders'
import { planAllowsNow } from '@/lib/credits/plan-gate'
import { QuoteTemplatesLocked } from '@/components/company/templates/quote-templates-locked'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Quote templates' }
export const dynamic = 'force-dynamic'

/** Company › Templates › Quotes (REG-485): the studio's quote templates — drafts, published versions, the default. */
export default async function QuoteTemplatesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/templates/quotes')) return <AccessGate section="Templates" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [data, sp, folders, open] = await Promise.all([fetchTemplates(), searchParams, fetchFolders('quotes'), planAllowsNow('template_editor')])
  /* (pending modules S19) on Free the studio's own quote templates are locked — kept, never shown to edit or pick */
  if (!open) return <QuoteTemplatesLocked count={data.templates.length} from={readFrom(sp.from)} />
  return <QuoteTemplatesGallery data={data} from={readFrom(sp.from)} folders={folders} />   /* (REG-538) Back to the editor that sent us */
}
