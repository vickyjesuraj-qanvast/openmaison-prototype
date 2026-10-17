import { ReceiptGhost } from '@/components/projects/money/payments-receipt-ghost'

/** (REG-708, Projects round 6) The receipt page streams its own ghost — the preview's bar and the receipt's paper. */
export default function Loading() {
  return <ReceiptGhost />
}
