import { SignGhost } from '@/components/contracts/sign/sign-ghost'

/** (sweep S2 #22) The signing link had no ghost: the client saw a blank page while the agreement loaded. (Contracts on the move, C3 — REG-708)
    The ghost draws the page as it looks at the width it loads at: the desk's paper and card, the phone's hero, paper and sticky bar. */
export default function Loading() {
  return <SignGhost />
}
