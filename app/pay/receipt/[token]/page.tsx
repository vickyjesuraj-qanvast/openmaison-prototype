import { redirect } from 'next/navigation'
import { oldReceiptTarget } from '@/lib/links/old-links'

export const dynamic = 'force-dynamic'

/** (pending modules S02 — D-11) 1.0's receipt link (`/pay/receipt/<token>`): the receipt's own no-login page when 2.0 holds the token, else the portal's Money. */
export default async function OldReceiptLink({ params }: { params: Promise<{ token: string }> }) {
  redirect(await oldReceiptTarget((await params).token))
}
