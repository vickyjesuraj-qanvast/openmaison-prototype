'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { displayDateLong, phoneDisplay } from '@/lib/format'
import type { SigningData } from '@/lib/contracts/queries'
import { signContractOnline } from '@/app/contracts/actions'
import { ContractPaper } from '@/components/contracts/render/contract-paper'
import styles from './signing-page.module.css'

type Step = 'review' | 'code' | 'sign' | 'done'

/**
 * The signing page (REG-534; 1.0's flow — "Client reviews and signs in their browser. OTP-verified by phone"): the client's
 * side of the link the studio shares on WhatsApp. No rail: the studio's letterhead on top, the document, and a card that
 * walks three steps — Send code → the code → type your name to sign. The code is simulated (any six digits); signing
 * stamps the contract Signed with the typed name. Already signed, the card says so and offers a copy.
 */
export function SigningPage({ data }: { data: SigningData }) {
  const { contract, lead, studio, brand, values, studioSignature } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const recipient = contract.recipientName ?? lead.name
  const phone = contract.recipientPhone ?? lead.phone
  const [step, setStep] = useState<Step>(contract.signedAt ? 'done' : 'review')
  const [code, setCode] = useState('')
  const [name, setName] = useState(recipient)
  const [busy, setBusy] = useState(false)
  const [signed, setSigned] = useState<{ name: string; at: Date } | null>(contract.signedAt ? { name: contract.signedBy ?? recipient, at: contract.signedAt } : null)
  const masked = phoneDisplay(phone).replace(/^(\+65 )?(\d{4}) (\d{4})$/, (_m, cc: string | undefined, a: string, b: string) => `${cc ?? ''}•••• ${b}${a ? '' : ''}`)
  const sign = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      const r = await signContractOnline(contract.id, name.trim())
      setSigned({ name: name.trim(), at: new Date(r.signedAt) }); setStep('done')
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t sign — please try again' }) } finally { setBusy(false) }
  }
  const uploaded = contract.source === 'uploaded'
  return (
    <div className={styles.page} data-testid="signing-page">
      <header className={styles.top}>
        <span className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {brand.logo ? <img className={styles.logo} src={brand.logo} alt="" /> : null}
          <span className={styles.studio}>{values['studio.name'] || studio.name}</span>
        </span>
        <span className={styles.secure}><Icon name="lock" size={16} />Secure signing</span>
      </header>
      <div className={styles.body}>
        <div className={styles.stage}>
          {uploaded ? (
            <div className={styles.uploaded}>
              <span className={styles.uploadedGlyph}><Icon name="description" size={32} /></span>
              <span className={styles.uploadedName}>{contract.fileName ?? contract.title}</span>
              <span className={styles.uploadedHelp}>{studio.name} shared this document for your signature.</span>
            </div>
          ) : (
            <ContractPaper html={contract.body ?? ''} values={values} brand={brand} studio={studio} studioSignature={studioSignature} client={signed} live={!signed} />
          )}
        </div>
        <aside className={styles.card} aria-label="Sign this agreement" data-step={step}>
          {step === 'done' && signed ? (
            <>
              <span className={styles.done}><Icon name="check_circle" size={40} /></span>
              <h2 className={styles.cardTitle}>Signed</h2>
              <p className={styles.cardText}>Signed by <strong>{signed.name}</strong> on {displayDateLong(signed.at)}. Both you and {values['studio.name'] || studio.name} keep a copy.</p>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => window.print()}>Download a copy</Button>
            </>
          ) : (
            <>
              <span className={styles.eyebrow}>{contract.title}</span>
              <h2 className={styles.cardTitle}>{step === 'review' ? 'Sign this agreement' : step === 'code' ? 'Enter the code' : 'Sign as yourself'}</h2>
              {step === 'review' ? (
                <>
                  <p className={styles.cardText}>Hi {recipient.split(' ')[0]}, please read the agreement. When you’re ready, we’ll send a one-time code to <strong>{masked}</strong> to confirm it’s you.</p>
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
                  <p className={styles.cardText}>Type your full name. It becomes your signature on the agreement.</p>
                  <TextField label="Your full name" required value={name} onChange={setName} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void sign() } }} />
                  {name.trim() ? <span className={styles.preview}>{name.trim()}</span> : null}
                  <p className={styles.fine}>By signing you agree to the terms above. Signed on {displayDateLong(new Date(data.now))}.</p>
                  <Button isDisabled={!name.trim() || busy} onPress={() => { void sign() }}>{busy ? 'Signing…' : 'Sign agreement'}</Button>
                </>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
