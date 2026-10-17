import { ContractRouteGhost } from '@/components/contracts/editor/contract-route-ghost'

/** Streams instantly while the template loads; PageReveal takes over the same skeleton — the contract editor's own (sweep S2 #22). */
export default function Loading() {
  return <ContractRouteGhost kind="template" />   // (S42 B-17) a PDF one draws its PDF — the shape this browser remembers
}
