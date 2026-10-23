import { displayDateTime } from '@/lib/format'
import styles from './signing-record.module.css'

/** (REG-633, contracts parity Q-19) What a signing leaves on the record — 1.0's certificate (B-32, quote-editor C-86) in 2.0's words. */
export type SigningRecordData = {
  /** The name the client typed online; null = the studio marked it signed (paper, or signed elsewhere). */
  signedBy: string | null
  signedAt: Date | null
  nric: string | null
  signatureKind: string | null
  phone: string | null
  /** (S42 B-03) how the code was checked — `demo_code`: the prototype's stand-in, no text went (the record says so) */
  method?: string | null
  device: string | null
  timezone: string | null
  viewedAt: Date | null
  acceptedAt: Date | null
  /** (gaps build D, item 6) when the client ticked the CaseTrust deposit-protection disclosure */
  caseTrustAt?: Date | null
  hash: string | null
  /** A bundle: the documents one signature covered. */
  documents?: string[]
}
const when = (d: Date | null) => (d ? displayDateTime(d) : null)   // (sweep S2 #28) the house date and time

/**
 * The signing record (REG-633, parity Q-19): who signed and how, the phone the one-time code went to, the device and time zone, when the
 * link was opened, the words ticked and the signature made, and the fingerprint of the text as signed. On the client's signed page, in
 * Preview, behind the editor's Signing record, and printed with Download a copy. A studio-marked signature says so and little else.
 */
/* (Contracts on the move, C3 — A-26) `bare` — inside the phone's "Signing record" sheet, which carries the title: the rows and the note alone. */
export function SigningRecord({ r, compact, bare = false }: { r: SigningRecordData; compact?: boolean; bare?: boolean }) {
  const rows: [string, string | null][] = r.signedBy
    ? [
        ['Signed by', r.signedBy],
        ['Signature', r.signatureKind === 'draw' ? 'Drawn by hand' : 'Typed name'],
        ['NRIC / FIN', r.nric ?? 'Not given'],
        ['Confirmed by', r.method === 'demo_code' ? 'A one-time code — demo only, no text was sent' : r.phone ? `A one-time code sent to ${r.phone}` : 'A one-time code by phone'],
        ['Device', [r.device, r.timezone].filter(Boolean).join(' · ') || null],
        ['Link opened', when(r.viewedAt)],
        ['Accepted', when(r.acceptedAt)],
        ['CaseTrust disclosure', r.caseTrustAt ? `Read and ticked ${when(r.caseTrustAt)}` : null],   // (gaps build D, item 6)
        ['Signed', when(r.signedAt)],
        ['Documents', r.documents?.length ? r.documents.join(' · ') : null],
        ['Fingerprint', r.hash ? `${r.hash.slice(0, 16)}…` : null],
      ]
    : [
        ['Signed', r.signedAt ? `Marked signed by the studio on ${when(r.signedAt)}` : 'Marked signed by the studio'],
        ['Link opened', when(r.viewedAt)],
        ['Fingerprint', r.hash ? `${r.hash.slice(0, 16)}…` : null],
      ]
  return (
    <section className={styles.record} data-compact={compact || bare || undefined} aria-label="Signing record" data-testid="signing-record">
      {bare ? null : <h2 className={styles.title}>Signing record</h2>}
      <dl className={styles.rows}>
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className={styles.row}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <p className={styles.note}>The fingerprint identifies the text exactly as signed; any later change to it would show.</p>
    </section>
  )
}
