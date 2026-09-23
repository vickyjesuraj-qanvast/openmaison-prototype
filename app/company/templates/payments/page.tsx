import type { Metadata } from 'next'
import { fetchPaymentTemplatesData } from '@/lib/company/payment-templates'
import { PaymentTemplatesGallery } from '@/components/company/templates/payment-templates-gallery'
import { readFrom } from '@/lib/nav'

export const metadata: Metadata = { title: 'Payment templates' }
export const dynamic = 'force-dynamic'

/** Company › Templates › Payments (REG-538): the milestone splits the studio offers. */
export default async function PaymentTemplatesPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [data, sp] = await Promise.all([fetchPaymentTemplatesData(), searchParams])
  return <PaymentTemplatesGallery data={data} from={readFrom(sp.from)} />
}
