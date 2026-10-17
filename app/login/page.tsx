import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** (pending modules S30 — D-11's rule for 1.0's old links) 1.0's sign-in address (`/login`): 2.0's sign-in. */
export default function OldLogin() {
  redirect('/sign-in')
}
