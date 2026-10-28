'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useRouter } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { PrivateLinkBadge } from '@/components/quotes/confirm/private-link-badge'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { SignaturePad } from '@/components/om/signature-pad'
import { useSnackbar } from '@/components/om/snackbar'
import { useSheetFootLift } from '@/components/om/sheet'
import { useMediaQuery, TABLET_DOWN } from '@/lib/breakpoint'
import { displayDate, displayDateLong, isNric, maskNric, phoneDisplay } from '@/lib/format'
import { acceptLabelOf } from '@/lib/contracts/policy'
import type { SigningData } from '@/lib/contracts/queries'
import { sendSigningCode, signContractOnline } from '@/app/contracts/actions'
import { SIGN_CODE_DEMO, SIGN_CODE_WRONG, firstName } from '@/lib/contracts/model'   // (S42 B-03)
import { ContractPaper, type ClientSignature } from '@/components/contracts/render/contract-paper'
import { LinkNotice } from './link-notice'
import { SigningRecord } from './signing-record'
import { CaseTrustBox } from './casetrust-box'
import { ContractPdf } from '@/components/contracts/render/contract-pdf'
import { CASETRUST_RULE } from '@/lib/contracts/casetrust'
import { DepositPay, depositAhead } from './deposit-pay'   // (S44R, C7)
import { SignHero } from './sign-hero'
import { SignBar } from './sign-bar'
import { SignSheet } from './sign-sheet'
import { SignedCard } from './signed-card'
import { QuoteLayer } from './quote-layer'
import { useReadingProgress } from './use-reading-progress'
import { saveCopy, saveCopyLine } from './save-copy'
import styles from './signing-page.module.css'
import ph from './sign-phone.module.css'

type Step = 'review' | 'code' | 'sign' | 'done'
/** "+65 •••• 4567" — the number the code goes to, as the page shows it. */
export const maskPhone = (phone: string) => phoneDisplay(phone).replace(/^(\+65 )?(\d{4}) (\d{4})$/, (_m, cc: string | undefined, _a: string, b: string) => `${cc ?? ''}•••• ${b}`)
/** (REG-633, parity Q-19) What the page tells the server about the device, for the signing record. */
export const deviceInfo = () => ({ userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent, timezone: typeof Intl === 'undefined' ? '' : Intl.DateTimeFormat().resolvedOptions().timeZone })
/** (C3) "Signed by Vivien · 22 Oct ’26" — the signed bar's line. */
export const signedShort = (name: string, at: Date) => `Signed by ${firstName(name)} · ${displayDate(at)}`
/** (C3) Where the page lands after Sign: the Signed card rests just above the sticky bar (its scroll margin), so the client's signature box in
 *  the paper — a few lines above the card — and the card's rows are both in view, none under the bar; with no card, the box itself. */
export function landOnBox(stage: HTMLElement | null, card: HTMLElement | null) {
  const box = stage?.querySelector<HTMLElement>('[data-sign="client-signature"]') ?? null
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'end' })
  else box?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

/**
 * The signing page (REG-534; 1.0's flow — "Client reviews and signs in their browser. OTP-verified by phone"): the client's side of the
 * link the studio shares on WhatsApp. No rail: the letterhead bar, the document, and a card that walks three steps — read (to the end,
 * ticking the document's words when it asks, REG-633 Q-15) → the one-time code → sign, typed or drawn (Q-18). The code is simulated (any
 * six digits — S42 B-03: through the one provider, and the page says so while the stand-in answers). It names the quote it signs, which opens read-only (Q-20). Signed, the page keeps the copy and its signing record (Q-19).
 *
 * (Contracts on the move, C3 — P-05 · P-06 · A-16…A-26, his "please check and built accordingly" 2026-10-22; Q-05 "paper first") On a phone
 * and a touch tablet (≤1024, a tablet held upright included — Q-01) the page is a PHONE PAGE: the letterhead bar, a three-line hero (the
 * agreement · the quote it signs → As cards, in place · "Hi Vivien, read it, then sign with a one-time code"), the paper first, reflowed
 * at 16, and a sticky bar that says how far they are and then does the next thing — Accept and sign opens the signing sheet (the ticks ·
 * the six code boxes · Type or Draw); Sign lands on the signature box with the Signed card beside it (Save a copy · Pay the deposit ·
 * Signing record). The desk (≥1025) keeps its card beside the paper, untouched. The CSS decides the first paint; `phone` decides only what
 * the render mounts where (the desk's card never mounts on a phone, the phone's sheets never on a desk).
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
  /* (C3) the phone model — a phone, a touch tablet, a tablet held upright; the desk answer until the client has hydrated */
  const onPhone = useMediaQuery(TABLET_DOWN)

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
  /* (C3 — P-05) the phone's pieces: the paper's column (its headings give the progress), the Signed card (where Sign lands), the sheet, the quote layer */
  const stageRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const signedCardRef = useRef<HTMLElement | null>(null)
  const setSignedCard = useCallback((el: HTMLElement | null) => { signedCardRef.current = el }, [])
  const [sheet, setSheet] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const closeQuote = useCallback(() => setQuoteOpen(false), [])
  const progress = useReadingProgress(stageRef, onPhone && step === 'review' && !signed && !letter && needsScroll)
  const shows = state === 'open' || state === 'signed'
  useSheetFootLift(onPhone && shows && !letter, bodyRef)   // (B-21's rule) the house snackbar clears the sticky bar
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
  /* (C3 — P-05) Accept and sign: the sheet at its first screen; with nothing to tick it goes straight for the code */
  const openSheet = () => { setSheet(true); if (!needsAccept && !needsCaseTrust && step === 'review') void sendCode() }
  const save = async () => {
    if (!signed) return
    const r = await saveCopy({ title: contract.title, studio: issuer, signedLine: `signed by ${signed.name} on ${displayDateLong(signed.at)}` })
    if (r === 'copied' || r === 'kept') snackbar({ message: saveCopyLine(r, kept?.hash ?? null) })
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
        snackbar({ message: 'This contract was updated while you were reading — please read it again before signing' })
        setReadEnd(!needsScroll); setAcceptedAt(null); setStep('review'); setSheet(false); router.refresh(); return
      }
      if ('refused' in r) {
        if (r.refused === 'accept') { snackbar({ message: 'Tick that you accept the contract first' }); setStep('review'); return }
        if (r.refused === 'casetrust') { snackbar({ message: CASETRUST_RULE }); setStep('review'); return }   // (gaps build D, item 6)
        if (r.refused === 'code') { snackbar({ message: SIGN_CODE_WRONG }); setCode(''); setStep('code'); return }   // (S42 B-03) the provider's check
        if (r.refused === 'expired') { snackbar({ message: 'This link has expired — please ask for a new one' }) }   // (pending modules S03) it ran out while open
        setSheet(false); router.refresh(); return
      }
      setSigned({ name: name.trim(), at: new Date(r.signedAt), nric: nricKept, drawing: how === 'draw' ? drawing : null }); setStep('done'); setSheet(false)
      router.refresh()
      /* (C3 — P-05) the phone lands on the signature box, the Signed card beside it */
      if (onPhone) window.setTimeout(() => landOnBox(stageRef.current, signedCardRef.current), 350)
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
        <LinkNotice state={state} studio={issuer} contact={studio.phone ? { phone: studio.phone } : null} />   {/* (C3 — A-25) the way to ask */}
      </div>
    )
  }
  /* (REG-633, parity Q-16) The agreement sentence names what is signed — 1.0's (B-63). */
  const agreement = `I, ${name.trim() || 'your name'}, agree to the ${contract.title}${quote ? ` and quotation ${quote.number}` : ''} from ${issuer}, as set out above. I understand that this is my digital agreement to proceed.`
  const first = recipient.split(' ')[0]
  const total = values['quote.total'] || null
  const done = step === 'done' && !!signed
  return (
    <div className={styles.page} data-testid="signing-page" data-state={state} data-phone={onPhone || undefined}>
      <header className={styles.top}>
        <span className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {brand.logo ? <img className={styles.logo} src={brand.logo} alt="" /> : null}
          <span className={styles.studio}>{issuer}</span>
        </span>
        <PrivateLinkBadge />   {/* (the calm UI build 2026-10-27, 4-09 · W-028) one badge on every client page — "Secure signing" was this page's own */}
      </header>
      <div ref={bodyRef} className={`${styles.body} ${ph.body}`}>
        {/* (C3 — P-05) the phone's hero: drawn there only (sign-phone.module.css) */}
        <SignHero title={contract.title} quote={quote ? { number: quote.number, total, open: !quote.gone } : null} onQuote={() => setQuoteOpen(true)}
                  fine={!done && !letter && data.deposit && !data.deposit.paid ? depositAhead(data.deposit) : null}>
          {letter ? <>Hi {first}, {issuer} sent you this letter to keep — there is nothing to sign.</>
            : done ? <>Signed by <strong>{signed!.name}</strong> on {displayDateLong(signed!.at)}. Both you and {issuer} keep a copy.</>
            : <>Hi {first}, read it, then sign with a one-time code.</>}
        </SignHero>
        <div ref={stageRef} className={`${styles.stage} ${styles.column} ${ph.stageCol}`}>
          {uploaded ? (
            /* (pending modules S03) the PDF itself, through this link's own address — the client reads the very file they sign */
            <ContractPdf name={data.pdf?.name || contract.fileName || contract.title} src={data.pdf ? `/sign/${data.token}/file` : null} thumb={data.pdf?.thumb ? `/sign/${data.token}/file?thumb=1` : null}
                         help={`${issuer} shared this document for your signature.`} />
          ) : (
            <ContractPaper html={kept?.body ?? contract.body ?? ''} values={values} brand={brand} studio={studio} studioSignature={studioSignature} client={signed} live={!signed} letterhead={data.letterhead} />
          )}
          <div ref={endRef} className={styles.paperEnd} aria-hidden data-testid="paper-end" />
          {kept && !onPhone ? (
            <SigningRecord r={{ signedBy: contract.signedBy, signedAt: contract.signedAt, nric: contract.signedNric, signatureKind: contract.signatureKind, phone: contract.signerPhone, method: contract.verificationMethod, device: contract.signerUserAgent, timezone: contract.signerTimezone, viewedAt: contract.viewedAt, acceptedAt: contract.acceptedAt, caseTrustAt: contract.caseTrustAt, hash: kept.hash }} />
          ) : null}
          {/* (C3 — P-05 · A-26) the phone's Signed card, under the paper by the signature box */}
          {onPhone && done ? (
            <SignedCard cardRef={setSignedCard} name={signed!.name} at={signed!.at} issuer={issuer} what="a copy" onSave={() => { void save() }} deposit={data.deposit}
                        record={kept ? { signedBy: contract.signedBy, signedAt: contract.signedAt, nric: contract.signedNric, signatureKind: contract.signatureKind, phone: contract.signerPhone, method: contract.verificationMethod, device: contract.signerUserAgent, timezone: contract.signerTimezone, viewedAt: contract.viewedAt, acceptedAt: contract.acceptedAt, caseTrustAt: contract.caseTrustAt, hash: kept.hash } : null} />
          ) : null}
        </div>
        {!onPhone ? (
        <aside className={`${styles.card} ${ph.deskCard}`} aria-label="Sign this contract" data-step={step}>
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
              {quote && !quote.gone ? <a className={styles.quoteLink} href={`/sign/${data.token}/quote`} target="_blank" rel="noopener" data-testid="view-quote"><Icon name="request_quote" size={20} />Quote {quote.number}</a> : null}
              {/* (pending modules S03) a PDF signed online: the very file, kept — the signing record stays on this page */}
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => { if (uploaded && data.pdf) window.location.assign(`/sign/${data.token}/file?download=1`); else printPaper() }}>Download a copy</Button>
              {data.deposit ? <DepositPay d={data.deposit} /> : null}   {/* (S44R — UAT row 358, call C7) the page ends on the deposit */}
            </>
          ) : (
            <>
              <span className={styles.eyebrow}>{contract.title}</span>
              <h2 className={styles.cardTitle}>{step === 'review' ? 'Sign this contract' : step === 'code' ? 'Enter the code' : 'Sign as yourself'}</h2>
              {step === 'review' ? (
                <>
                  <p className={styles.cardText}>Hi {recipient.split(' ')[0]}, please read the contract. {codeDemo ? 'When you’re ready, a one-time code confirms it’s you.' : <>When you’re ready, we’ll send a one-time code to <strong>{masked}</strong> to confirm it’s you.</>}</p>
                  {data.deposit && !data.deposit.paid ? <p className={styles.fine} data-testid="deposit-ahead">{depositAhead(data.deposit)}</p> : null}   {/* (S44R, C7) what follows the signature, said before it */}
                  {/* (REG-633, parity Q-20) the quote it signs, read-only in a new tab */}
                  {quote && !quote.gone ? <a className={styles.quoteLink} href={`/sign/${data.token}/quote`} target="_blank" rel="noopener" data-testid="view-quote"><Icon name="request_quote" size={20} />It signs quote {quote.number} — view the quote</a> : null}
                  {needsScroll ? (
                    <p className={styles.gate} data-done={readEnd || undefined} data-testid="gate-scroll"><Icon name={readEnd ? 'check_circle' : 'arrow_downward'} size={20} />{readEnd ? 'You’ve read to the end' : 'Read to the end of the contract to continue'}</p>
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
                  <p className={styles.cardText}>Type your full name, or draw your signature. It goes on the contract where you sign.</p>
                  <Chips label="How you sign" options={[{ value: 'type', label: 'Type' }, { value: 'draw', label: 'Draw' }]} value={how} onChange={(v) => setHow(v === 'draw' ? 'draw' : 'type')} testId="sign-how" />
                  <TextField label="Your full name" required value={name} onChange={setName} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && how === 'type') { e.preventDefault(); void sign() } }} />
                  {how === 'type' ? (name.trim() ? <span className={styles.preview}>{name.trim()}</span> : null) : <SignaturePad value={drawing} onChange={setDrawing} hint="Draw your signature here" height={120} />}
                  {/* (REG-563) The NRIC / FIN, optional: the page keeps only its last four characters, masked, and prints those under the signature. */}
                  <TextField label="NRIC / FIN (optional)" value={nric} onChange={(v) => setNric(v.toUpperCase().slice(0, 9))} maxLength={9} error={!nricOk ? 'Enter a valid NRIC or FIN, like S1234567A' : undefined}
                             helper={nric.trim() && nricOk ? `Kept as ${maskNric(nric)} — only the last four characters are stored` : 'Only the last four characters are kept, masked: •••••567A'}
                             onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void sign() } }} />
                  <p className={styles.fine} data-testid="agreement-sentence">{agreement} Signed on {displayDateLong(new Date(data.now))}.</p>
                  <Button isDisabled={!name.trim() || busy || !nricOk || (how === 'draw' && !drawing)} onPress={() => { void sign() }}>{busy ? 'Signing…' : 'Sign contract'}</Button>
                </>
              ) : null}
            </>
          )}
        </aside>
        ) : null}
        {/* (C3 — P-05) the phone's sticky bar: how far they are, then the one thing to do; signed — the line and Save a copy */}
        {!letter ? (
          done ? <SignBar state={{ kind: 'signed', line: signedShort(signed!.name, signed!.at), onLine: () => landOnBox(stageRef.current, signedCardRef.current), onSave: () => { void save() } }} />
            : readEnd ? <SignBar state={{ kind: 'ready', label: 'Accept and sign', onPress: openSheet, busy: codeBusy && !sheet }} />
              : <SignBar state={{ kind: 'reading', at: progress.at, total: progress.total }} />
        ) : null}
      </div>
      {/* (C3 — P-06) the signing sheet and (A-16) the quote in place: mounted on the phone model only */}
      {onPhone && !letter ? (
        <SignSheet open={sheet && !done} onClose={() => setSheet(false)} step={step === 'done' ? 'sign' : step} noun="the contract"
                   ticks={needsAccept ? [{ id: contract.id, label: acceptLabel, at: acceptedAt }] : []} onTick={(_id, at) => setAcceptedAt(at)}
                   caseTrust={needsCaseTrust ? { studio: issuer, at: caseTrustAt, onTick: setCaseTrustAt } : null}
                   onContinue={() => { void sendCode() }} continueBusy={codeBusy}
                   codeDemo={codeDemo} masked={masked} code={code} onCode={(c) => { setCode(c); if (c.length === 6) setStep('sign') }} onVerify={() => { if (code.length === 6) setStep('sign') }} onSendAgain={() => { void sendCode(true) }} codeBusy={codeBusy}
                   name={name} onName={setName} how={how} onHow={setHow} drawing={drawing} onDrawing={setDrawing} nric={nric} onNric={setNric} nricOk={nricOk}
                   consent={`${agreement} Signed on ${displayDateLong(new Date(data.now))}.`} signLabel="Sign contract" onSign={() => { void sign() }} busy={busy}
                   canSign={!!name.trim() && nricOk && (how === 'type' || !!drawing)} />
      ) : null}
      {onPhone && quote && !quote.gone ? <QuoteLayer open={quoteOpen} onClose={closeQuote} token={data.token} number={quote.number} issuer={issuer} /> : null}
    </div>
  )
}
