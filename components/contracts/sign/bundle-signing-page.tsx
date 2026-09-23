'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { displayDateLong, isNric, maskNric, phoneDisplay } from '@/lib/format'
import type { BundleSigningData } from '@/lib/contracts/queries'
import { signBundleOnline } from '@/app/contracts/actions'
import { ContractPaper } from '@/components/contracts/render/contract-paper'
import styles from './signing-page.module.css'

type Step = 'review' | 'code' | 'sign' | 'done'

/**
 * (REG-591) The bundle's signing page — Mavid: "send all documents at once for signature". One link, the documents in the order
 * they were picked, one card that walks the signing page's three steps (REG-534); the one signature covers every document.
 * An uploaded document shows as its file tile, a composed one as its paper with the chips resolved.
 */
export function BundleSigningPage({ data }: { data: BundleSigningData }) {
  const { bundle, documents, lead, studio, brand, studioSignature } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const recipient = bundle.recipientName ?? lead.name
  const phone = bundle.recipientPhone ?? lead.phone
  const already = bundle.signedAt ? { name: bundle.signedBy ?? recipient, at: bundle.signedAt, nric: bundle.signedNric } : null
  const [step, setStep] = useState<Step>(already ? 'done' : 'review')
  const [code, setCode] = useState('')
  const [name, setName] = useState(recipient)
  const [nric, setNric] = useState('')
  const [busy, setBusy] = useState(false)
  const [signed, setSigned] = useState<{ name: string; at: Date; nric?: string | null } | null>(already)
  const masked = phoneDisplay(phone).replace(/^(\+65 )?(\d{4}) (\d{4})$/, (_m, cc: string | undefined, _a: string, b: string) => `${cc ?? ''}•••• ${b}`)
  const nricOk = !nric.trim() || isNric(nric)
  const studioName = documents[0]?.values['studio.name'] || studio.name
  const sign = async () => {
    if (!name.trim() || busy || !nricOk) return
    setBusy(true)
    try {
      const r = await signBundleOnline(bundle.id, name.trim(), nric.trim() || null)
      setSigned({ name: name.trim(), at: new Date(r.signedAt), nric: nric.trim() && isNric(nric) ? maskNric(nric) : null }); setStep('done')
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t sign — please try again' }) } finally { setBusy(false) }
  }
  return (
    <div className={styles.page} data-testid="bundle-signing-page">
      <header className={styles.top}>
        <span className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {brand.logo ? <img className={styles.logo} src={brand.logo} alt="" /> : null}
          <span className={styles.studio}>{studioName}</span>
        </span>
        <span className={styles.secure}><Icon name="lock" size={16} />Secure signing</span>
      </header>
      <div className={styles.body}>
        <div className={`${styles.stage} ${styles.bundle}`}>
          {documents.map(({ contract, values }, i) => (
            <section key={contract.id} className={styles.bundleDoc} aria-label={`Document ${i + 1} of ${documents.length}: ${contract.title}`}>
              <span className={styles.bundleLabel}>Document {i + 1} of {documents.length} · {contract.title}</span>
              {contract.source === 'uploaded' ? (
                <div className={styles.uploaded}>
                  <span className={styles.uploadedGlyph}><Icon name="description" size={32} /></span>
                  <span className={styles.uploadedName}>{contract.fileName ?? contract.title}</span>
                  <span className={styles.uploadedHelp}>{studio.name} shared this document for your signature.</span>
                </div>
              ) : (
                <ContractPaper html={contract.body ?? ''} values={values} brand={brand} studio={studio} studioSignature={studioSignature} client={signed} live={!signed} />
              )}
            </section>
          ))}
        </div>
        <aside className={styles.card} aria-label="Sign these documents" data-step={step}>
          {step === 'done' && signed ? (
            <>
              <span className={styles.done}><Icon name="check_circle" size={40} /></span>
              <h2 className={styles.cardTitle}>Signed</h2>
              <p className={styles.cardText}>All {documents.length} documents signed by <strong>{signed.name}</strong> on {displayDateLong(signed.at)}. Both you and {studioName} keep a copy of each.</p>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => window.print()}>Download a copy</Button>
            </>
          ) : (
            <>
              <span className={styles.eyebrow}>{documents.length} documents</span>
              <h2 className={styles.cardTitle}>{step === 'review' ? 'Sign these documents' : step === 'code' ? 'Enter the code' : 'Sign as yourself'}</h2>
              {step === 'review' ? (
                <>
                  <ol className={styles.bundleList}>{documents.map(({ contract }) => <li key={contract.id}>{contract.title}</li>)}</ol>
                  <p className={styles.cardText}>Hi {recipient.split(' ')[0]}, please read each document. One signature at the end covers all of them. When you’re ready, we’ll send a one-time code to <strong>{masked}</strong> to confirm it’s you.</p>
                  <Button onPress={() => { setStep('code'); snackbar({ message: `Code sent to ${masked}` }) }}>Send code</Button>
                </>
              ) : null}
              {step === 'code' ? (
                <>
                  <p className={styles.cardText}>We sent a six-digit code to {masked}.</p>
                  <TextField label="One-time code" required value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} autoFocus
                             onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) { e.preventDefault(); setStep('sign') } }} />
                  <div className={styles.row}>
                    <Button variant="secondary" appearance="text" onPress={() => snackbar({ message: `Code sent again to ${masked}` })}>Send again</Button>
                    <Button isDisabled={code.length !== 6} onPress={() => setStep('sign')}>Verify</Button>
                  </div>
                </>
              ) : null}
              {step === 'sign' ? (
                <>
                  <p className={styles.cardText}>Type your full name. It becomes your signature on every document above.</p>
                  <TextField label="Your full name" required value={name} onChange={setName} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void sign() } }} />
                  {name.trim() ? <span className={styles.preview}>{name.trim()}</span> : null}
                  <TextField label="NRIC / FIN (optional)" value={nric} onChange={(v) => setNric(v.toUpperCase().slice(0, 9))} maxLength={9} error={!nricOk ? 'Enter a valid NRIC or FIN, like S1234567A' : undefined}
                             helper={nric.trim() && nricOk ? `Kept as ${maskNric(nric)} — only the last four characters are stored` : 'Only the last four characters are kept, masked: •••••567A'}
                             onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void sign() } }} />
                  <p className={styles.fine}>By signing you agree to the terms of all {documents.length} documents. Signed on {displayDateLong(new Date(data.now))}.</p>
                  <Button isDisabled={!name.trim() || busy || !nricOk} onPress={() => { void sign() }}>{busy ? 'Signing…' : `Sign ${documents.length} documents`}</Button>
                </>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
