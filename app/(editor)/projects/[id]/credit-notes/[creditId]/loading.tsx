import { ReceiptGhost } from '@/components/projects/money/payments-receipt-ghost'

/** (gaps build F2, REG-708) A credit note's page streams the receipt's ghost — the same bar and the same paper. */
export default function Loading() {
  return <ReceiptGhost />
}
