import type { Metadata } from 'next'
import { fetchPaymentTemplatesData } from '@/lib/company/payment-templates'
import { PaymentTemplatesGallery } from '@/components/company/templates/payment-templates-gallery'
import { readFrom } from '@/lib/nav'
import { fetchFolders } from '@/lib/company/folders'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'

export const metadata: Metadata = { title: 'Payment templates' }
export const dynamic = 'force-dynamic'

/** Company › Templates › Payments (REG-538): the milestone splits the studio offers. */
export default async function PaymentTemplatesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  if (await refusesPath('/company/templates/payments')) return <AccessGate section="Templates" />   // (S44Z — S44O's note) the role's own list, before a record is read: Marketing's leads, Accounting's books
  const [data, sp, folders] = await Promise.all([fetchPaymentTemplatesData(), searchParams, fetchFolders('payments')])
  return <PaymentTemplatesGallery data={data} from={readFrom(sp.from)} folders={folders} />
}
