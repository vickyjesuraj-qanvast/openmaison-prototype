import { SignQuoteGhost } from '@/components/contracts/sign/sign-ghost'

/** (REG-708) The quote a signing link shows streams its own ghost — the bar and the paper; (Contracts on the move, C3 — A-16) on the phone
    model the total card and the reading cards, as the page draws them. It borrowed the signing page's until the signing page moved into its
    own route group. */
export default function Loading() {
  return <SignQuoteGhost />
}
