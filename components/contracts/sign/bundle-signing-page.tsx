'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useRouter } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { SignaturePad } from '@/components/om/signature-pad'
import { useSnackbar } from '@/components/om/snackbar'
import { useSheetFootLift } from '@/components/om/sheet'
import { useMediaQuery, TABLET_DOWN } from '@/lib/breakpoint'
import { displayDateLong, isNric, maskNric } from '@/lib/format'
import { acceptLabelOf } from '@/lib/contracts/policy'
import type { BundleSigningData } from '@/lib/contracts/queries'
import { sendSigningCode, signBundleOnline } from '@/app/contracts/actions'
import { CaseTrustBox } from './casetrust-box'
import { CASETRUST_RULE } from '@/lib/contracts/casetrust'
import { ContractPaper, type ClientSignature } from '@/components/contracts/render/contract-paper'
import { LinkNotice } from './link-notice'
import { ContractPdf } from '@/components/contracts/render/contract-pdf'
import { SigningRecord } from './signing-record'
import { deviceInfo, landOnBox, maskPhone, signedShort } from './signing-page'
import { SIGN_CODE_DEMO, SIGN_CODE_WRONG } from '@/lib/contracts/model'   // (S42 B-03)
import { SignHero } from './sign-hero'
import { SignBar } from './sign-bar'
import { SignSheet } from './sign-sheet'
import { SignedCard } from './signed-card'
import { useReadingProgress } from './use-reading-progress'
import { saveCopy, saveCopyLine } from './save-copy'
import styles from './signing-page.module.css'
import ph from './sign-phone.module.css'
import { DepositPay, depositAhead } from './deposit-pay'   // (S44R, C7)

type Step = 'review' | 'code' | 'sign' | 'done'

/**
 * (REG-591) The bundle's signing page — Mavid: "send all documents at once for signature". (REG-633, contracts parity Q-16) 1.0's walk
 * (B-57): one document per screen in the order the studio ticked them, "Document i of n" over a progress bar; each asks for what its own
 * gates ask (read to the end, tick its words) before Continue; the last leads to the code and one signature — typed or drawn — that
 * covers every document the agreement sentence names. A document already signed on its own shows as signed and asks nothing.
 *
 * (Contracts on the move, C3 — P-05 · P-06) On a phone and a touch tablet the walk is the signing page's phone model: the hero lists the
 * documents (the open one in bold, a read one ticked), each document is read under the same sticky bar — "Document 1 of 2 · Read to the end"
 * then **Next document**, **Accept and sign** on the last — and the sheet comes once, at the end: every document's tick on its first screen,
 * the code, the one signature. Signed, the Signed card under the papers. The desk keeps its card.
 */
export function BundleSigningPage({ data, caseTrust = false, codeDemo = false }: { data: BundleSigningData; /** (gaps build D, item 6) the studio is CaseTrust-accredited */ caseTrust?: boolean
  /** (S42 B-03) the SMS stand-in answers — said, never "we sent a code" */ codeDemo?: boolean }) {
  const { bundle, documents, lead, studio, brand, studioSignature, state } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const recipient = bundle.recipientName ?? lead.name
  const phone = bundle.recipientPhone ?? lead.phone
  const already: ClientSignature = bundle.signedAt ? { name: bundle.signedBy ?? recipient, at: bundle.signedAt, nric: bundle.signedNric, drawing: bundle.signatureKind === 'draw' ? bundle.signatureData : null } : null
  const [step, setStep] = useState<Step>(already || state !== 'open' ? 'done' : 'review')
  const [at, setAt] = useState(0)
  const [code, setCode] = useState('')
  const [name, setName] = useState(recipient)
  const [nric, setNric] = useState('')
  const [how, setHow] = useState<'type' | 'draw'>('type')
  const [drawing, setDrawing] = useState('')
  const [busy, setBusy] = useState(false)
  const [signed, setSigned] = useState<ClientSignature>(already)
  const [read, setRead] = useState<Record<string, boolean>>({})
  const [accepted, setAccepted] = useState<Record<string, number>>({})
  const masked = maskPhone(phone)
  const nricOk = !nric.trim() || isNric(nric)
  const studioName = documents[0]?.letterhead.name || studio.name
  const doc = documents[Math.min(at, documents.length - 1)]
  const docOpen = doc?.contract.status === 'Sent to Client'
  const needsScroll = !!doc && docOpen && doc.contract.requiresScroll && doc.contract.source !== 'uploaded'
  const needsAccept = !!doc && docOpen && doc.contract.requiresAccept
  const readEnd = !needsScroll || !!read[doc!.contract.id]
  /* (gaps build D, item 6) the CaseTrust disclosure rides on the last document, before Continue to sign */
  const [caseTrustAt, setCaseTrustAt] = useState<number | null>(null)
  const needsCaseTrust = caseTrust && state === 'open' && at >= documents.length - 1
  const gatesMet = readEnd && (!needsAccept || !!accepted[doc!.contract.id]) && (!needsCaseTrust || !!caseTrustAt)
  const endRef = useRef<HTMLDivElement>(null)
  /* (C3) the phone model and its pieces */
  const onPhone = useMediaQuery(TABLET_DOWN)
  const walkRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const signedCardRef = useRef<HTMLElement | null>(null)
  const setSignedCard = useCallback((el: HTMLElement | null) => { signedCardRef.current = el }, [])
  const [sheet, setSheet] = useState(false)
  const docId = doc?.contract.id
  useEffect(() => {
    if (step !== 'review' || !docId || !needsScroll) return
    const el = endRef.current
    if (!el) return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setRead((r) => (r[docId] ? r : { ...r, [docId]: true })) }, { rootMargin: '0px 0px 40px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [step, docId, needsScroll])
  const last = at >= documents.length - 1
  const progress = useReadingProgress(stageRef, onPhone && step === 'review' && !signed && needsScroll, docId ?? '')
  const shows = state === 'open' || state === 'signed'
  useSheetFootLift(onPhone && shows, bodyRef)   // (B-21's rule) the house snackbar clears the sticky bar
  /* (S42 B-03) the code goes through the one provider; a real one's "sent" is said, the stand-in's line says no text goes */
  const [codeBusy, setCodeBusy] = useState(false)
  const sendCode = async (again = false) => {
    if (codeBusy) return
    setCodeBusy(true)
    try {
      const r = await sendSigningCode({ bundleId: bundle.id })
      if ('error' in r) { snackbar({ message: r.error }); if (!again) router.refresh(); return }
      setStep('code')
      if (!r.demo) snackbar({ message: `${again ? 'Code sent again' : 'Code sent'} to ${masked}` })
    } catch { snackbar({ message: 'Couldn’t send the code — please try again' }) } finally { setCodeBusy(false) }
  }
  const next = () => {
    if (last) { void sendCode(); return }
    setAt((i) => i + 1)
    /* at a desk the page's top is the walk's; where the card stacks above the paper (≤1024), the next document's own top */
    if (window.matchMedia('(max-width: 1024px)').matches) requestAnimationFrame(() => walkRef.current?.scrollIntoView({ block: 'start' }))
    else window.scrollTo({ top: 0 })
  }
  /* (C3) the phone's ticks come once, at the end: every open document's words */
  const ticks = documents.filter((d) => d.contract.status === 'Sent to Client' && d.contract.requiresAccept).map((d) => ({ id: d.contract.id, title: documents.length > 1 ? d.contract.title : undefined, label: acceptLabelOf(d.contract), at: accepted[d.contract.id] ?? null }))
  const openSheet = () => { setSheet(true); if (!ticks.length && !needsCaseTrust && step === 'review') void sendCode() }
  const save = async () => {
    const who = signed?.name ?? bundle.signedBy ?? recipient, when = signed?.at ?? bundle.signedAt ?? new Date(data.now)
    const r = await saveCopy({ title: documents.length === 1 ? documents[0]!.contract.title : `${documents.length} documents`, studio: studioName, signedLine: `signed by ${who} on ${displayDateLong(when)}` })
    if (r === 'copied' || r === 'kept') snackbar({ message: saveCopyLine(r, bundle.signingHash) })
  }

  const titles = documents.map((d) => d.contract.title)
  const agreement = `I, ${name.trim() || 'your name'}, agree to ${titles.length === 1 ? `the ${titles[0]}` : `these ${titles.length} documents — ${titles.join(', ')} —`} from ${studioName}, as set out above. I understand that this is my digital agreement to proceed.`
  const sign = async () => {
    if (!name.trim() || busy || !nricOk || (how === 'draw' && !drawing)) return
    setBusy(true)
    const nricKept = nric.trim() && isNric(nric) ? maskNric(nric) : null   /* (REG-563, REG-631) only the masked form leaves the page */
    try {
      const r = await signBundleOnline(bundle.id, name.trim(), nricKept, data.fingerprint, { kind: how, drawing: how === 'draw' ? drawing : null, acceptedAt: accepted, caseTrustAt, code, ...deviceInfo() })
      if ('changed' in r) {
        snackbar({ message: 'These documents were updated while you were reading — please read them again before signing' })   /* (REG-631, parity Q-06) */
        setRead({}); setAccepted({}); setAt(0); setStep('review'); setSheet(false); router.refresh(); return
      }
      if ('refused' in r) {
        if (r.refused === 'accept') { snackbar({ message: 'Tick that you accept each document first' }); if (!onPhone) setAt(0); setStep('review'); return }
        if (r.refused === 'casetrust') { snackbar({ message: CASETRUST_RULE }); setStep('review'); return }   // (gaps build D, item 6)
        if (r.refused === 'code') { snackbar({ message: SIGN_CODE_WRONG }); setCode(''); setStep('code'); return }   // (S42 B-03)
        if (r.refused === 'expired') snackbar({ message: 'This link has expired — please ask for a new one' })   // (pending modules S03)
        setSheet(false); router.refresh(); return
      }
      setSigned({ name: name.trim(), at: new Date(r.signedAt), nric: nricKept, drawing: how === 'draw' ? drawing : null }); setStep('done'); setSheet(false)
      router.refresh()
      if (onPhone) window.setTimeout(() => landOnBox(stageRef.current, signedCardRef.current), 350)   // (C3) lands on the signature box
    } catch { snackbar({ message: 'Couldn’t sign — please try again' }) } finally { setBusy(false) }
  }
  if (state === 'not-sent' || state === 'inactive' || state === 'expired' || state === 'quote-updating') {   // (S42 B-01)
    return (
      <div className={styles.page} data-testid="bundle-signing-page" data-state={state}>
        <header className={styles.top}>
          <span className={styles.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {brand.logo ? <img className={styles.logo} src={brand.logo} alt="" /> : null}
            <span className={styles.studio}>{studioName}</span>
          </span>
        </header>
        <LinkNotice state={state} studio={studioName} set contact={studio.phone ? { phone: studio.phone } : null} />   {/* (C3 — A-25) */}
      </div>
    )
  }
  const paperOf = (d: (typeof documents)[number]) => {
    const kept = d.signed
    if (d.contract.source === 'uploaded') {
      /* (pending modules S03) the PDF itself, through the set's own link */
      const src = `/sign/bundle/${bundle.id}/file/${d.contract.id}`
      return <ContractPdf name={d.pdf?.name || d.contract.fileName || d.contract.title} src={d.pdf ? src : null} thumb={d.pdf?.thumb ? `${src}?thumb=1` : null} help={`${studioName} shared this document for your signature.`} />
    }
    const client: ClientSignature = kept ? { name: d.contract.signedBy ?? signed?.name ?? recipient, at: d.contract.signedAt ?? signed?.at ?? new Date(data.now), nric: d.contract.signedNric, drawing: d.contract.signatureKind === 'draw' ? d.contract.signatureData : null } : signed
    return <ContractPaper html={kept?.body ?? d.contract.body ?? ''} values={d.values} brand={brand} studio={studio} studioSignature={kept ? kept.studioSignature : studioSignature} client={client} live={!signed && !kept} letterhead={d.letterhead} />
  }
  const walking = step === 'review' && !!doc
  const done = step === 'done' && (!!signed || state === 'signed')
  const signedName = signed?.name ?? bundle.signedBy ?? recipient, signedAt = signed?.at ?? bundle.signedAt ?? new Date(data.now)
  const record = bundle.signedAt ? { signedBy: bundle.signedBy, signedAt: bundle.signedAt, nric: bundle.signedNric, signatureKind: bundle.signatureKind, phone: bundle.signerPhone, method: documents[0]?.contract.verificationMethod ?? null, device: bundle.signerUserAgent, timezone: bundle.signerTimezone, viewedAt: bundle.viewedAt, acceptedAt: null, hash: bundle.signingHash, documents: titles } : null
  const first = recipient.split(' ')[0]
  return (
    <div className={styles.page} data-testid="bundle-signing-page" data-state={state} data-phone={onPhone || undefined}>
      <header className={styles.top}>
        <span className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {brand.logo ? <img className={styles.logo} src={brand.logo} alt="" /> : null}
          <span className={styles.studio}>{studioName}</span>
        </span>
        <MetaChip color="green" icon="lock">Secure signing</MetaChip>   {/* (REG-729) the house tag (r4) — it was a pill */}
      </header>
      <div ref={bodyRef} className={`${styles.body} ${ph.body}`}>
        {/* (C3 — P-05) the phone's hero: the set's documents as rows */}
        <SignHero title={documents.length === 1 ? documents[0]!.contract.title : `${documents.length} documents to sign`} quote={null} onQuote={() => {}}
                  docs={documents.length > 1 ? documents.map((d, i) => ({ id: d.contract.id, title: d.contract.title, read: d.contract.status === 'Signed' || !!signed || !!read[d.contract.id] || (walking && i < at), on: walking && i === at })) : null}
                  fine={!done && data.deposit && !data.deposit.paid ? depositAhead(data.deposit) : null}>
          {done ? (signed ? <>{documents.length === 1 ? 'The document' : `All ${documents.length} documents`} signed by <strong>{signed.name}</strong> on {displayDateLong(signed.at)}. Both you and {studioName} keep a copy of each.</> : <>Every document here is signed. Both you and {studioName} keep a copy of each.</>)
            : <>Hi {first}, read each one, then sign once with a one-time code.</>}
        </SignHero>
        <div ref={stageRef} className={`${styles.stage} ${styles.bundle} ${ph.stageCol}`}>
          {walking ? (
            <section ref={walkRef} className={styles.bundleDoc} aria-label={`Document ${at + 1} of ${documents.length}: ${doc.contract.title}`} data-testid="bundle-walk">
              <div className={styles.walk}>
                <span className={styles.walkHead}><span>Document {at + 1} of {documents.length} · {doc.contract.title}</span>{doc.contract.status === 'Signed' ? <span>Signed already</span> : null}</span>
                <span className={styles.walkBar} aria-hidden>{documents.map((d, i) => <span key={d.contract.id} className={styles.walkSeg} data-on={i <= at || undefined} />)}</span>
              </div>
              {paperOf(doc)}
              <div ref={endRef} className={styles.paperEnd} aria-hidden data-testid="paper-end" />
            </section>
          ) : documents.map((d, i) => (
            <section key={d.contract.id} className={styles.bundleDoc} aria-label={`Document ${i + 1} of ${documents.length}: ${d.contract.title}`}>
              <span className={styles.bundleLabel}>Document {i + 1} of {documents.length} · {d.contract.title}</span>
              {paperOf(d)}
            </section>
          ))}
          {record && !onPhone ? <SigningRecord r={record} /> : null}
          {onPhone && done ? (
            <SignedCard cardRef={setSignedCard} name={signedName} at={signedAt} issuer={studioName} what="a copy of each" onSave={() => { void save() }} deposit={data.deposit} record={record} />
          ) : null}
        </div>
        {!onPhone ? (
        <aside className={`${styles.card} ${ph.deskCard}`} aria-label="Sign these documents" data-step={step}>
          {step === 'done' && (signed || state === 'signed') ? (
            <>
              <span className={styles.done}><Icon name="check_circle" size={40} /></span>
              <h2 className={styles.cardTitle}>Signed</h2>
              <p className={styles.cardText}>{signed ? <>{documents.length === 1 ? 'The document' : `All ${documents.length} documents`} signed by <strong>{signed.name}</strong> on {displayDateLong(signed.at)}.</> : <>Every document here is signed.</>} Both you and {studioName} keep a copy of each.</p>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => printPaper()}>Download a copy</Button>
              {data.deposit ? <DepositPay d={data.deposit} /> : null}   {/* (S44R — UAT row 358, call C7) the set's agreement asked for the deposit */}
            </>
          ) : (
            <>
              <span className={styles.eyebrow}>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>   {/* (sweep S2 #26) */}
              <h2 className={styles.cardTitle}>{step === 'review' ? 'Sign these documents' : step === 'code' ? 'Enter the code' : 'Sign as yourself'}</h2>
              {step === 'review' && doc ? (
                <>
                  <ol className={styles.bundleList}>{documents.map((d, i) => <li key={d.contract.id} data-on={i === at || undefined}>{d.contract.title}</li>)}</ol>
                  <p className={styles.cardText}>Hi {recipient.split(' ')[0]}, please read each document. One signature at the end covers all of them; {codeDemo ? 'a one-time code confirms it’s you.' : <>we’ll send a one-time code to <strong>{masked}</strong> to confirm it’s you.</>}</p>
                  {data.deposit && !data.deposit.paid ? <p className={styles.fine} data-testid="deposit-ahead">{depositAhead(data.deposit)}</p> : null}   {/* (S44R, C7) */}
                  {needsScroll ? (
                    <p className={styles.gate} data-done={readEnd || undefined} data-testid="gate-scroll"><Icon name={readEnd ? 'check_circle' : 'arrow_downward'} size={20} />{readEnd ? 'You’ve read to the end' : 'Read to the end of this document to continue'}</p>
                  ) : null}
                  {needsAccept ? (
                    <label className={styles.accept} data-testid="gate-accept" data-disabled={!readEnd || undefined}>
                      <Checkbox isSelected={!!accepted[doc.contract.id]} isDisabled={!readEnd} onChange={(on: boolean) => setAccepted((a) => { const n = { ...a }; if (on) n[doc.contract.id] = Date.now(); else delete n[doc.contract.id]; return n })} aria-label={acceptLabelOf(doc.contract)} />
                      <span>{acceptLabelOf(doc.contract)}</span>
                    </label>
                  ) : null}
                  {needsCaseTrust ? <CaseTrustBox studio={studioName} at={caseTrustAt} onTick={setCaseTrustAt} disabled={!readEnd} /> : null}
                  <Button isDisabled={!gatesMet || codeBusy} onPress={next}>{last ? 'Continue to sign' : 'Continue'}</Button>
                </>
              ) : null}
              {step === 'code' ? (
                <>
                  {codeDemo ? <p className={styles.cardText} data-testid="sign-code-demo">{SIGN_CODE_DEMO}</p> : <p className={styles.cardText}>We sent a six-digit code to {masked}.</p>}
                  <TextField label="One-time code" required value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} autoFocus
                             onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) { e.preventDefault(); setStep('sign') } }} />
                  <div className={styles.row}>
                    {codeDemo ? null : <Button variant="secondary" appearance="text" isDisabled={codeBusy} onPress={() => { void sendCode(true) }}>Send again</Button>}   {/* (S42 B-03) */}
                    <Button isDisabled={code.length !== 6} onPress={() => setStep('sign')}>Verify</Button>
                  </div>
                </>
              ) : null}
              {step === 'sign' ? (
                <>
                  <p className={styles.cardText}>Type your full name, or draw your signature. It goes on every document above.</p>
                  <Chips label="How you sign" options={[{ value: 'type', label: 'Type' }, { value: 'draw', label: 'Draw' }]} value={how} onChange={(v) => setHow(v === 'draw' ? 'draw' : 'type')} testId="sign-how" />
                  <TextField label="Your full name" required value={name} onChange={setName} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && how === 'type') { e.preventDefault(); void sign() } }} />
                  {how === 'type' ? (name.trim() ? <span className={styles.preview}>{name.trim()}</span> : null) : <SignaturePad value={drawing} onChange={setDrawing} hint="Draw your signature here" height={120} />}
                  <TextField label="NRIC / FIN (optional)" value={nric} onChange={(v) => setNric(v.toUpperCase().slice(0, 9))} maxLength={9} error={!nricOk ? 'Enter a valid NRIC or FIN, like S1234567A' : undefined}
                             helper={nric.trim() && nricOk ? `Kept as ${maskNric(nric)} — only the last four characters are stored` : 'Only the last four characters are kept, masked: •••••567A'}
                             onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void sign() } }} />
                  <p className={styles.fine} data-testid="agreement-sentence">{agreement} Signed on {displayDateLong(new Date(data.now))}.</p>
                  <Button isDisabled={!name.trim() || busy || !nricOk || (how === 'draw' && !drawing)} onPress={() => { void sign() }}>{busy ? 'Signing…' : documents.length === 1 ? 'Sign the document' : `Sign ${documents.length} documents`}</Button>
                </>
              ) : null}
            </>
          )}
        </aside>
        ) : null}
        {/* (C3 — P-05) the phone's sticky bar: the walk, document by document, then Accept and sign; signed — the line and Save a copy */}
        {done ? <SignBar state={{ kind: 'signed', line: signedShort(signedName, signedAt), onLine: () => landOnBox(stageRef.current, signedCardRef.current), onSave: () => { void save() } }} />
          : walking ? (readEnd
            ? <SignBar state={last ? { kind: 'ready', label: 'Accept and sign', onPress: openSheet, busy: codeBusy && !sheet } : { kind: 'ready', label: 'Next document', onPress: next, words: `Document ${at + 1} of ${documents.length} read` }} />
            : <SignBar state={{ kind: 'reading', at: progress.at, total: progress.total, doc: `Document ${at + 1} of ${documents.length}` }} />)
          : null}
      </div>
      {onPhone ? (
        <SignSheet open={sheet && !done} onClose={() => setSheet(false)} step={step === 'done' ? 'sign' : step} noun={documents.length === 1 ? 'the document' : 'these documents'}
                   ticks={ticks} onTick={(id, at) => setAccepted((a) => { const n = { ...a }; if (at) n[id] = at; else delete n[id]; return n })}
                   caseTrust={needsCaseTrust ? { studio: studioName, at: caseTrustAt, onTick: setCaseTrustAt } : null}
                   onContinue={() => { void sendCode() }} continueBusy={codeBusy}
                   codeDemo={codeDemo} masked={masked} code={code} onCode={(c) => { setCode(c); if (c.length === 6) setStep('sign') }} onVerify={() => { if (code.length === 6) setStep('sign') }} onSendAgain={() => { void sendCode(true) }} codeBusy={codeBusy}
                   name={name} onName={setName} how={how} onHow={setHow} drawing={drawing} onDrawing={setDrawing} nric={nric} onNric={setNric} nricOk={nricOk}
                   consent={`${agreement} Signed on ${displayDateLong(new Date(data.now))}.`} signLabel={documents.length === 1 ? 'Sign the document' : `Sign ${documents.length} documents`} onSign={() => { void sign() }} busy={busy}
                   canSign={!!name.trim() && nricOk && (how === 'type' || !!drawing)} />
      ) : null}
    </div>
  )
}
