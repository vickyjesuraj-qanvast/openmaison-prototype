import { PoGhost } from '@/components/finance/po-page'

/** (REG-708, gaps build F1) The PO page streams its own ghost — the preview's bar and the PO's paper. */
export default function Loading() {
  return <PoGhost />
}
