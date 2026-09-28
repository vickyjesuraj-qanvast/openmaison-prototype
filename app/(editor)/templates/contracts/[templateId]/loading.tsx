import { ContractSkeleton } from '@/components/contracts/editor/contract-skeleton'

/** Streams instantly while the template loads; PageReveal takes over the same skeleton — the contract editor's own (sweep S2 #22). */
export default function Loading() {
  return <ContractSkeleton kind="template" />
}
