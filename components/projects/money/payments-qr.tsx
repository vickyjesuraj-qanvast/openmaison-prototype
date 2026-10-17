import { payNowPayload, qrMatrix, qrPath } from '@/lib/projects/payments-paynow'

/**
 * (Projects round 6, F-15) The PayNow QR a client scans to pay one invoice: generated with the amount and the invoice number as the reference
 * when the issuing entity has a PayNow ID (UEN or mobile, M-254), so the banking app fills both in; the entity's own uploaded QR when it has
 * no PayNow ID (a static one — the client types the amount, as 1.0 warned, M-254); nothing otherwise. Black on white whatever the theme, so a
 * phone's camera reads it. The invoice paper and the portal's pay card draw this one mark.
 */
export function PayNowQr({ payNow, uploaded, amountMinor, reference, merchant, size = 120, className }: {
  payNow: string | null | undefined
  uploaded?: string | null
  amountMinor: number
  reference: string
  merchant: string
  size?: number
  className?: string
}) {
  const payload = payNow ? payNowPayload({ payNow, amountMinor, reference, merchant }) : null
  const m = payload ? qrMatrix(payload) : null
  if (m) {
    const n = m.length + 8
    return (
      <svg className={className} width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" role="img" aria-label={`PayNow QR for ${reference}`} data-testid="paynow-qr" data-payload={payload ?? undefined}>
        <rect width={n} height={n} fill="#ffffff" />
        <path d={qrPath(m)} fill="#000000" />
      </svg>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  if (uploaded) return <img className={className} src={uploaded} width={size} height={size} alt="PayNow QR" data-testid="paynow-qr-uploaded" />
  return null
}
