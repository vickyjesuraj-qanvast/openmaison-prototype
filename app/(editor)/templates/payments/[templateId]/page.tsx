import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchPaymentTemplateEditor } from '@/lib/company/payment-templates'
import { PaymentTemplateEditor } from '@/components/company/templates/editors/payment-template-editor'
import { readFrom } from '@/lib/nav'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ templateId: string }> }): Promise<Metadata> {
  const { templateId } = await params
  const data = await fetchPaymentTemplateEditor(templateId)
  return { title: data ? `${data.template.name} · Payment template` : 'Payment template' }
}

/** The payment template editor (REG-538): the library editor in the rail-less group; a missing or deleted template is a 404. */
export default async function PaymentTemplatePage({ params, searchParams }: { params: Promise<{ templateId: string }>; searchParams: Promise<{ from?: string }> }) {
  const { templateId } = await params
  const sp = await searchParams
  const data = await fetchPaymentTemplateEditor(templateId)
  if (!data) notFound()
  return <PaymentTemplateEditor data={data} from={readFrom(sp.from)} />
}
