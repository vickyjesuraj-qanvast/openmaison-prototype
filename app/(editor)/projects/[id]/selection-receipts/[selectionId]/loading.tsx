import { SelectionReceiptPageGhost } from '@/components/projects/choices/selection-receipt-page'

/** (REG-708, gaps build D item 7) The selection receipt streams its own ghost — the receipt frame's bar and the paper. */
export default function Loading() {
  return <SelectionReceiptPageGhost />
}
