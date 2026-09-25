import { ContractSkeleton } from '@/components/contracts/editor/contract-skeleton'

/** (sweep S2 #22) Preview streams its own ghost — the bar and the paper, not the editor's. */
export default function Loading() {
  return <ContractSkeleton kind="preview" />
}
