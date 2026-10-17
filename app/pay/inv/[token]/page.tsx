import { redirect } from 'next/navigation'
import { oldInvoiceTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S02 — D-11) 1.0's invoice link (`/pay/inv/<token>`): the invoice's own no-login page when 2.0 holds the token, else the portal's Money. */
export default async function OldInvoiceLink({ params }: { params: Promise<{ token: string }> }) {
  redirect(await oldInvoiceTarget((await params).token))
}
