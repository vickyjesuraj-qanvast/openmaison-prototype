import { ContractSkeleton } from '@/components/contracts/editor/contract-skeleton'

/** (sweep S2 #22) The signing link had no ghost: the client saw a blank page while the agreement loaded. */
export default function Loading() {
  return <ContractSkeleton kind="sign" />
}
