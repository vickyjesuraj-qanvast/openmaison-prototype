import { InvoiceGhost } from '@/components/projects/money/invoice-ghost'

/** (REG-708, Projects round 5) The invoice page streams its own ghost — the preview's bar and the invoice's paper. */
export default function Loading() {
  return <InvoiceGhost />
}
