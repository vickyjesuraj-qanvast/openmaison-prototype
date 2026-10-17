import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** (pending modules S31 — D-11's rule for 1.0's old links) 1.0's sign-up address (`/onboarding`, its tour): 2.0's sign-up. */
export default function OldOnboarding() {
  redirect('/sign-up')
}
