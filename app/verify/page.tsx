import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** (pending modules S37 — D-11's rule for 1.0's old links) 1.0's "Verify for Qanvast Listing" address (`/verify`): its one home now, Company ›
    Profile's Listed on Qanvast card. */
export default function OldVerify() {
  redirect('/company/profile#qanvast')
}
