import { ContractsListGhost } from '@/components/shell/list-ghosts'

/** Streams instantly while the contracts load; PageReveal takes over the same ghost — (REG-708) Tools › Contracts' own: All Contracts and its tools, the contracts table with Lead. */
export default function Loading() {
  return <ContractsListGhost />
}
