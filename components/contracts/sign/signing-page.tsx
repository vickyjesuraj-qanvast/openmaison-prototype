'use client'

import { useEffect, useRef, useState } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useRouter } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { SignaturePad } from '@/components/om/signature-pad'
import { useSnackbar } from '@/components/om/snackbar'
import { displayDateLong, isNric, maskNric, phoneDisplay } from '@/lib/format'
import { acceptLabelOf } from '@/lib/contracts/policy'
import type { SigningData } from '@/lib/contracts/queries'
import { sendSigningCode, signContractOnline } from '@/app/contracts/actions'
import { SIGN_CODE_DEMO, SIGN_CODE_WRONG } from '@/lib/contracts/model'   // (S42 B-03)
import { ContractPaper, type ClientSignature } from '@/components/contracts/render/contract-paper'
import { LinkNotice } from './link-notice'
import { SigningRecord } from './signing-record'
import { CaseTrustBox } from './casetrust-box'
import { ContractPdf } from '@/components/contracts/render/contract-pdf'
import { CASETRUST_RULE } from '@/lib/contracts/casetrust'
import { DepositPay, depositAhead } from './deposit-pay'   // (S44R, C7)
import styles from './signing-page.module.css'

type Step = 'review' | 'code' | 'sign' | 'done'
/** "+65 •••• 4567" — the number the code goes to, as the page shows it. */
export const maskPhone = (phone: string) => phoneDisplay(phone).replace(/^(\+65 )?(\d{4}) (\d{4})$/, (_m, cc: string | undefined, _a: string, b: string) => `${cc ?? ''}•••• ${b}`)
/** (REG-633, parity Q-19) What the page tells the server about the device, for the signing record. */
export const deviceInfo = () => ({ userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent, timezone: typeof Intl === 'undefined' ? '' : Intl.DateTimeFormat().resolvedOptions().timeZone })

/**
 * The signing page (REG-534; 1.0's flow — "Client reviews and signs in their browser. OTP-verified by phone"): the client's side of the
 * link the studio shares on WhatsApp. No rail: the letterhead bar, the document, and a card that walks three steps — read (to the end,
 * ticking the document's words when it asks, REG-633 Q-15) → the one-time code → sign, typed or drawn (Q-18). The code is simulated (any
 * six digits — S42 B-03: through the one provider, and the page says so while the stand-in answers). It names the quote it signs, which opens read-only (Q-20). Signed, the page keeps the copy and its signing record (Q-19).
 */
export function SigningPage({ data, caseTrust = false, codeDemo = false }: { data: SigningData; /** (gaps build D, item 6) the studio is CaseTrust-accredited */ caseTrust?: boolean
  /** (S42 B-03) the SMS stand-in answers: no text goes, any six digits sign — said, never "we sent a code" */ codeDemo?: boolean }) {
  const { contract, lead, studio, brand, values, state, signed: kept, quote } = data
  /* (REG-631, parity Q-05) A signed contract shows the copy kept at signing: its text, its letterhead, the studio signature it printed. */
  const studioSignature = kept ? kept.studioSignature : data.studioSignature
  const router = useRouter()
  const snackbar = useSnackbar()
  const recipient = contract.recipientName ?? lead.name
  const phone = contract.recipientPhone ?? lead.phone
  const [step, setStep] = useState<Step>(contract.signedAt ? 'done' : 'review')
  const [code, setCode] = useState('')
  const [name, setName] = useState(recipient)
  const [nric, setNric] = useState('')   /* (REG-563) optional; only its masked form ever leaves the page */
  const [how, setHow] = useState<'type' | 'draw'>('type')
  const [drawing, setDrawing] = useState('')
  const [busy, setBusy] = useState(false)
  const [signed, setSigned] = useState<ClientSignature>(contract.signedAt ? { name: contract.signedBy ?? recipient, at: contract.signedAt, nric: contract.signedNric, drawing: contract.signatureKind === 'draw' ? contract.signatureData : null } : null)
  const uploaded = contract.source === 'uploaded'
  const masked = maskPhone(phone)
  const nricOk = !nric.trim() || isNric(nric)
  const issuer = data.letterhead.name || values['studio.name'] || studio.name

  /* (REG-633, parity Q-15) The document's gates: read to the end (the paper's last line on screen, or at once when it fits) and tick its words. */
  /* (S44R — UAT row 359, call C9) a letter sent to read and keep: the page shows it and a copy to download — no gates, no code, no signature */
  const letter = state === 'open' && contract.toRead && !contract.signedAt
  const needsScroll = state === 'open' && contract.requiresScroll && !uploaded && !letter
  const needsAccept = state === 'open' && contract.requiresAccept && !letter
  const [readEnd, setReadEnd] = useState(!needsScroll)
  const [acceptedAt, setAcceptedAt] = useState<number | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (readEnd) return
    const el = endRef.current
    if (!el) return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setReadEnd(true) }, { rootMargin: '0px 0px 40px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [readEnd])
  /* (gaps build D, item 6) a CaseTrust-accredited studio's disclosure — its tick is one more gate */
  const needsCaseTrust = state === 'open' && caseTrust && !letter
  const [caseTrustAt, setCaseTrustAt] = useState<number | null>(null)
  const gatesMet = readEnd && (!needsAccept || !!acceptedAt) && (!needsCaseTrust || !!caseTrustAt)
  const acceptLabel = acceptLabelOf(contract)
  /* (sweep S2 #5) On a phone or a tablet the card sits above the paper: at the paper's foot a bar says what is next and does it. */
  const cardRef = useRef<HTMLElement>(null)
  const toCard = () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  /* (S42 B-03) the code goes through the one provider; a real one's "sent" is said, the stand-in's line says no text goes */
  const [codeBusy, setCodeBusy] = useState(false)
  const sendCode = async (again = false) => {
    if (codeBusy) return
    setCodeBusy(true)
    try {
      const r = await sendSigningCode({ token: data.token })
      if ('error' in r) { snackbar({ message: r.error }); if (!again) router.refresh(); return }
      setStep('code')
      if (!r.demo) snackbar({ message: `${again ? 'Code sent again' : 'Code sent'} to ${masked}` })
    } catch { snackbar({ message: 'Couldn’t send the code — please try again' }) } finally { setCodeBusy(false) }
  }

  const sign = async () => {
    if (!name.trim() || busy || !nricOk || (how === 'draw' && !drawing)) return
    setBusy(true)
    /* (REG-563, REG-631) Only the masked form leaves the page. */
    const nricKept = nric.trim() && isNric(nric) ? maskNric(nric) : null
    try {
      const r = await signContractOnline(data.token, name.trim(), nricKept, data.fingerprint, { kind: how, drawing: how === 'draw' ? drawing : null, acceptedAt: acceptedAt ? { [contract.id]: acceptedAt } : undefined, caseTrustAt, code, ...deviceInfo() })
      if ('changed' in r) {
        /* (REG-631, parity Q-06) The studio changed the document while it was open: read the new text before signing. */
        snackbar({ message: 'This agreement was updated while you were reading — please read it again before signing' })
        setReadEnd(!needsScroll); setAcceptedAt(null); setStep('review'); router.refresh(); return
      }
      if ('refused' in r) {
        if (r.refused === 'accept') { snackbar({ message: 'Tick that you accept the agreement first' }); setStep('review'); return }
        if (r.refused === 'casetrust') { snackbar({ message: CASETRUST_RULE }); setStep('review'); return }   // (gaps build D, item 6)
        if (r.refused === 'code') { snackbar({ message: SIGN_CODE_WRONG }); setCode(''); setStep('code'); return }   // (S42 B-03) the provider's check
        if (r.refused === 'expired') { snackbar({ message: 'This link has expired — please ask for a new one' }) }   // (pending modules S03) it ran out while open
        router.refresh(); return
      }
      setSigned({ name: name.trim(), at: new Date(r.signedAt), nric: nricKept, drawing: how === 'draw' ? drawing : null }); setStep('done')
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t sign — please try again' }) } finally { setBusy(false) }
  }
  if (state === 'not-sent' || state === 'inactive' || state === 'expired' || state === 'quote-updating') {   // (S42 B-01)
    return (
      <div className={styles.page} data-testid="signing-page" data-state={state}>
        <header className={styles.top}>
          <span className={styles.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {brand.logo ? <img className={styles.logo} src={brand.logo} alt="" /> : null}
            <span className={styles.studio}>{issuer}</span>
          </span>
        </header>
        <LinkNotice state={state} studio={issuer} />
      </div>
    )
  }
  /* (REG-633, parity Q-16) The agreement sentence names what is signed — 1.0's (B-63). */
  const agreement = `I, ${name.trim() || 'your name'}, agree to the ${contract.title}${quote ? ` and quotation ${quote.number}` : ''} from ${issuer}, as set out above. I understand that this is my digital agreement to proceed.`
  return (
    <div className={styles.page} data-testid="signing-page" data-state={state}>
      <header className={styles.top}>
        <span className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {brand.logo ? <img className={styles.logo} src={brand.logo} alt="" /> : null}
          <span className={styles.studio}>{issuer}</span>
        </span>
        <MetaChip color="green" icon="lock">Secure signing</MetaChip>   {/* (REG-729) the house tag (r4) — it was a pill */}
      </header>
      <div className={styles.body}>
        <div className={`${styles.stage} ${styles.column}`}>
          {uploaded ? (
            /* (pending modules S03) the PDF itself, through this link's own address — the client reads the very file they sign */
            <ContractPdf name={data.pdf?.name || contract.fileName || contract.title} src={data.pdf ? `/sign/${data.token}/file` : null} thumb={data.pdf?.thumb ? `/sign/${data.token}/file?thumb=1` : null}
                         help={`${issuer} shared this document for your signature.`} />
          ) : (
            <ContractPaper html={kept?.body ?? contract.body ?? ''} values={values} brand={brand} studio={studio} studioSignature={studioSignature} client={signed} live={!signed} letterhead={data.letterhead} />
          )}
          <div ref={endRef} className={styles.paperEnd} aria-hidden data-testid="paper-end" />
          {kept ? (
            <SigningRecord r={{ signedBy: contract.signedBy, signedAt: contract.signedAt, nric: contract.signedNric, signatureKind: contract.signatureKind, phone: contract.signerPhone, method: contract.verificationMethod, device: contract.signerUserAgent, timezone: contract.signerTimezone, viewedAt: contract.viewedAt, acceptedAt: contract.acceptedAt, caseTrustAt: contract.caseTrustAt, hash: kept.hash }} />
          ) : null}
        </div>
        <aside ref={cardRef} className={styles.card} aria-label="Sign this agreement" data-step={step}>
          {letter ? (
            <>
              <span className={styles.eyebrow}>{contract.title}</span>
              <h2 className={styles.cardTitle}>Your letter</h2>
              <p className={styles.cardText} data-testid="letter-to-read">Hi {recipient.split(' ')[0]}, {issuer} sent you this letter to keep — there is nothing to sign.</p>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => { if (uploaded && data.pdf) window.location.assign(`/sign/${data.token}/file?download=1`); else printPaper() }}>Download a copy</Button>
            </>
          ) : step === 'done' && signed ? (
            <>
              <span className={styles.done}><Icon name="check_circle" size={40} /></span>
              <h2 className={styles.cardTitle}>Signed</h2>
              <p className={styles.cardText}>Signed by <strong>{signed.name}</strong> on {displayDateLong(signed.at)}. Both you and {issuer} keep a copy.</p>
              {quote && !quote.gone ? <a className={styles.quoteLink} href={`/sign/${data.token}/quote`} target="_blank" rel="noopener" data-testid="view-quote"><Icon name="request_quote" size={20} />Quotation {quote.number}</a> : null}
              {/* (pending modules S03) a PDF signed online: the very file, kept — the signing record stays on this page */}
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => { if (uploaded && data.pdf) window.location.assign(`/sign/${data.token}/file?download=1`); else printPaper() }}>Download a copy</Button>
              {data.deposit ? <DepositPay d={data.deposit} /> : null}   {/* (S44R — UAT row 358, call C7) the page ends on the deposit */}
            </>
          ) : (
            <>
              <span className={styles.eyebrow}>{contract.title}</span>
              <h2 className={styles.cardTitle}>{step === 'review' ? 'Sign this agreement' : step === 'code' ? 'Enter the code' : 'Sign as yourself'}</h2>
              {step === 'review' ? (
                <>
                  <p className={styles.cardText}>Hi {recipient.split(' ')[0]}, please read the agreement. {codeDemo ? 'When you’re ready, a one-time code confirms it’s you.' : <>When you’re ready, we’ll send a one-time code to <strong>{masked}</strong> to confirm it’s you.</>}</p>
                  {data.deposit && !data.deposit.paid ? <p className={styles.fine} data-testid="deposit-ahead">{depositAhead(data.deposit)}</p> : null}   {/* (S44R, C7) what follows the signature, said before it */}
                  {/* (REG-633, parity Q-20) the quote it signs, read-only in a new tab */}
                  {quote && !quote.gone ? <a className={styles.quoteLink} href={`/sign/${data.token}/quote`} target="_blank" rel="noopener" data-testid="view-quote"><Icon name="request_quote" size={20} />It signs quotation {quote.number} — view the quote</a> : null}
                  {needsScroll ? (
                    <p className={styles.gate} data-done={readEnd || undefined} data-testid="gate-scroll"><Icon name={readEnd ? 'check_circle' : 'arrow_downward'} size={20} />{readEnd ? 'You’ve read to the end' : 'Read to the end of the agreement to continue'}</p>
                  ) : null}
                  {needsAccept ? (
                    <label className={styles.accept} data-testid="gate-accept" data-disabled={!readEnd || undefined}>
                      <Checkbox isSelected={!!acceptedAt} isDisabled={!readEnd} onChange={(on: boolean) => setAcceptedAt(on ? Date.now() : null)} aria-label={acceptLabel} />
                      <span>{acceptLabel}</span>
                    </label>
                  ) : null}
                  {needsCaseTrust ? <CaseTrustBox studio={issuer} at={caseTrustAt} onTick={setCaseTrustAt} disabled={!readEnd} /> : null}
                  <Button isDisabled={!gatesMet || codeBusy} onPress={() => { void sendCode() }}>Send code</Button>
                </>
              ) : null}
              {step === 'code' ? (
                <>
                  {codeDemo ? <p className={styles.cardText} data-testid="sign-code-demo">{SIGN_CODE_DEMO}</p> : <p className={styles.cardText}>We sent a six-digit code to {masked}.</p>}
                  <TextField label="One-time code" required value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} autoFocus
                             onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) { e.preventDefault(); setStep('sign') } }} />
                  <div className={styles.row}>
                    {codeDemo ? null : <Button variant="secondary" appearance="text" isDisabled={codeBusy} onPress={() => { void sendCode(true) }}>Send again</Button>}   {/* (S42 B-03) nothing to send again while no text goes */}
                    <Button isDisabled={code.length !== 6} onPress={() => setStep('sign')}>Verify</Button>
                  </div>
                </>
              ) : null}
              {step === 'sign' ? (
                <>
                  <p className={styles.cardText}>Type your full name, or draw your signature. It goes on the agreement where you sign.</p>
                  <Chips label="How you sign" options={[{ value: 'type', label: 'Type' }, { value: 'draw', label: 'Draw' }]} value={how} onChange={(v) => setHow(v === 'draw' ? 'draw' : 'type')} testId="sign-how" />
                  <TextField label="Your full name" required value={name} onChange={setName} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && how === 'type') { e.preventDefault(); void sign() } }} />
                  {how === 'type' ? (name.trim() ? <span className={styles.preview}>{name.trim()}</span> : null) : <SignaturePad value={drawing} onChange={setDrawing} hint="Draw your signature here" height={120} />}
                  {/* (REG-563) The NRIC / FIN, optional: the page keeps only its last four characters, masked, and prints those under the signature. */}
                  <TextField label="NRIC / FIN (optional)" value={nric} onChange={(v) => setNric(v.toUpperCase().slice(0, 9))} maxLength={9} error={!nricOk ? 'Enter a valid NRIC or FIN, like S1234567A' : undefined}
                             helper={nric.trim() && nricOk ? `Kept as ${maskNric(nric)} — only the last four characters are stored` : 'Only the last four characters are kept, masked: •••••567A'}
                             onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void sign() } }} />
                  <p className={styles.fine} data-testid="agreement-sentence">{agreement} Signed on {displayDateLong(new Date(data.now))}.</p>
                  <Button isDisabled={!name.trim() || busy || !nricOk || (how === 'draw' && !drawing)} onPress={() => { void sign() }}>{busy ? 'Signing…' : 'Sign agreement'}</Button>
                </>
              ) : null}
            </>
          )}
        </aside>
      </div>
      {step === 'review' && !signed && !letter ? (
        <div className={styles.nextBar} data-testid="sign-next">
          {gatesMet ? <><span className={styles.nextText}>Ready when you are</span><Button isDisabled={codeBusy} onPress={() => { void sendCode(); toCard() }}>Send code</Button></>
            : <><span className={styles.nextText}>{!readEnd ? 'Read to the end of the agreement' : needsAccept && !acceptedAt ? 'Tick that you accept, in the box at the top' : 'Tick the CaseTrust disclosure, in the box at the top'}</span>{readEnd ? <Button variant="secondary" appearance="outlined" onPress={toCard}>Go to the box</Button> : null}</>}
        </div>
      ) : null}
    </div>
  )
}
