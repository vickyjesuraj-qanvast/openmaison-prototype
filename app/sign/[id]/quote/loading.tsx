import { ContractSkeleton } from '@/components/contracts/editor/contract-skeleton'

/** (REG-708) The quote a signing link shows streams its own ghost — the bar and the paper. It borrowed the signing page's (the agreement's
    bar, paper and card) until the signing page moved into its own route group. */
export default function Loading() {
  return <ContractSkeleton kind="quote" />
}
