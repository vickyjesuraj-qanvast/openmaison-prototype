import { ContractSkeleton } from '@/components/contracts/editor/contract-skeleton'

/** (REG-708) The quote's confirmation link streams a ghost as every link a client opens does (sweep S2 #22) — it showed a blank page while
    the quote loaded: the studio's bar, the paper and the card at its side, as the page draws them. */
export default function Loading() {
  return <ContractSkeleton kind="sign" />
}
