'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { SignaturePad } from '@/components/om/signature-pad'
import { useSnackbar } from '@/components/om/snackbar'
import { displayDateLong, isNric, maskNric } from '@/lib/format'
import { acceptLabelOf } from '@/lib/contracts/policy'
import type { BundleSigningData } from '@/lib/contracts/queries'
import { signBundleOnline } from '@/app/contracts/actions'
import { ContractPaper, type ClientSignature } from '@/components/contracts/render/contract-paper'
import { LinkNotice } from './link-notice'
import { SigningRecord } from './signing-record'
import { deviceInfo, maskPhone } from './signing-page'
import styles from './signing-page.module.css'

type Step = 'review' | 'code' | 'sign' | 'done'

/**
 * (REG-591) The bundle's signing page — Mavid: "send all documents at once for signature". (REG-633, contracts parity Q-16) 1.0's walk
 * (B-57): one document per screen in the order the studio ticked them, "Document i of n" over a progress bar; each asks for what its own
 * gates ask (read to the end, tick its words) before Continue; the last leads to the code and one signature — typed or drawn — that
 * covers every document the agreement sentence names. A document already signed on its own shows as signed and asks nothing.
 */
export function BundleSigningPage({ data }: { data: BundleSigningData }) {
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
  const gatesMet = readEnd && (!needsAccept || !!accepted[doc!.contract.id])
  const endRef = useRef<HTMLDivElement>(null)
  /* (UX audit C3) On a phone or a tablet the card sits above the paper: the single page's sticky bar (REG-660) says at the paper's foot what is
     next and does it — "Document 1 of 2 read · Next document", then "Continue to sign"; the next document starts at its own top. */
  const cardRef = useRef<HTMLElement>(null)
  const walkRef = useRef<HTMLElement>(null)
  const toCard = () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
  const next = () => {
    if (last) { setStep('code'); snackbar({ message: `Code sent to ${masked}` }); return }
    setAt((i) => i + 1)
    /* at a desk the page's top is the walk's; where the card stacks above the paper (≤1024), the next document's own top */
    if (window.matchMedia('(max-width: 1024px)').matches) requestAnimationFrame(() => walkRef.current?.scrollIntoView({ block: 'start' }))
    else window.scrollTo({ top: 0 })
  }

  const titles = documents.map((d) => d.contract.title)
  const agreement = `I, ${name.trim() || 'your name'}, agree to ${titles.length === 1 ? `the ${titles[0]}` : `these ${titles.length} documents — ${titles.join(', ')} —`} from ${studioName}, as set out above. I understand that this is my digital agreement to proceed.`
  const sign = async () => {
    if (!name.trim() || busy || !nricOk || (how === 'draw' && !drawing)) return
    setBusy(true)
    const nricKept = nric.trim() && isNric(nric) ? maskNric(nric) : null   /* (REG-563, REG-631) only the masked form leaves the page */
    try {
      const r = await signBundleOnline(bundle.id, name.trim(), nricKept, data.fingerprint, { kind: how, drawing: how === 'draw' ? drawing : null, acceptedAt: accepted, ...deviceInfo() })
      if ('changed' in r) {
        snackbar({ message: 'These documents were updated while you were reading — please read them again before signing' })   /* (REG-631, parity Q-06) */
        setRead({}); setAccepted({}); setAt(0); setStep('review'); router.refresh(); return
      }
      if ('refused' in r) {
        if (r.refused === 'accept') { snackbar({ message: 'Tick that you accept each document first' }); setAt(0); setStep('review'); return }
        router.refresh(); return
      }
      setSigned({ name: name.trim(), at: new Date(r.signedAt), nric: nricKept, drawing: how === 'draw' ? drawing : null }); setStep('done')
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t sign — please try again' }) } finally { setBusy(false) }
  }
  if (state === 'not-sent' || state === 'inactive') {
    return (
      <div className={styles.page} data-testid="bundle-signing-page" data-state={state}>
        <header className={styles.top}>
          <span className={styles.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {brand.logo ? <img className={styles.logo} src={brand.logo} alt="" /> : null}
            <span className={styles.studio}>{studioName}</span>
          </span>
        </header>
        <LinkNotice state={state} studio={studioName} />
      </div>
    )
  }
  const paperOf = (d: (typeof documents)[number]) => {
    const kept = d.signed
    if (d.contract.source === 'uploaded') {
      return (
        <div className={styles.uploaded}>
          <span className={styles.uploadedGlyph}><Icon name="description" size={32} /></span>
          <span className={styles.uploadedName}>{d.contract.fileName ?? d.contract.title}</span>
          <span className={styles.uploadedHelp}>{studioName} shared this document for your signature.</span>
        </div>
      )
    }
    const client: ClientSignature = kept ? { name: d.contract.signedBy ?? signed?.name ?? recipient, at: d.contract.signedAt ?? signed?.at ?? new Date(data.now), nric: d.contract.signedNric, drawing: d.contract.signatureKind === 'draw' ? d.contract.signatureData : null } : signed
    return <ContractPaper html={kept?.body ?? d.contract.body ?? ''} values={d.values} brand={brand} studio={studio} studioSignature={kept ? kept.studioSignature : studioSignature} client={client} live={!signed && !kept} letterhead={d.letterhead} />
  }
  const walking = step === 'review' && !!doc
  return (
    <div className={styles.page} data-testid="bundle-signing-page" data-state={state}>
      <header className={styles.top}>
        <span className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {brand.logo ? <img className={styles.logo} src={brand.logo} alt="" /> : null}
          <span className={styles.studio}>{studioName}</span>
        </span>
        <MetaChip color="green" icon="lock">Secure signing</MetaChip>   {/* (REG-729) the house tag (r4) — it was a pill */}
      </header>
      <div className={styles.body}>
        <div className={`${styles.stage} ${styles.bundle}`}>
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
          {bundle.signedAt ? (
            <SigningRecord r={{ signedBy: bundle.signedBy, signedAt: bundle.signedAt, nric: bundle.signedNric, signatureKind: bundle.signatureKind, phone: bundle.signerPhone, device: bundle.signerUserAgent, timezone: bundle.signerTimezone, viewedAt: bundle.viewedAt, acceptedAt: null, hash: bundle.signingHash, documents: titles }} />
          ) : null}
        </div>
        <aside ref={cardRef} className={styles.card} aria-label="Sign these documents" data-step={step}>
          {step === 'done' && (signed || state === 'signed') ? (
            <>
              <span className={styles.done}><Icon name="check_circle" size={40} /></span>
              <h2 className={styles.cardTitle}>Signed</h2>
              <p className={styles.cardText}>{signed ? <>{documents.length === 1 ? 'The document' : `All ${documents.length} documents`} signed by <strong>{signed.name}</strong> on {displayDateLong(signed.at)}.</> : <>Every document here is signed.</>} Both you and {studioName} keep a copy of each.</p>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="download" size={20} />} onPress={() => window.print()}>Download a copy</Button>
            </>
          ) : (
            <>
              <span className={styles.eyebrow}>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>   {/* (sweep S2 #26) */}
              <h2 className={styles.cardTitle}>{step === 'review' ? 'Sign these documents' : step === 'code' ? 'Enter the code' : 'Sign as yourself'}</h2>
              {step === 'review' && doc ? (
                <>
                  <ol className={styles.bundleList}>{documents.map((d, i) => <li key={d.contract.id} data-on={i === at || undefined}>{d.contract.title}</li>)}</ol>
                  <p className={styles.cardText}>Hi {recipient.split(' ')[0]}, please read each document. One signature at the end covers all of them; we’ll send a one-time code to <strong>{masked}</strong> to confirm it’s you.</p>
                  {needsScroll ? (
                    <p className={styles.gate} data-done={readEnd || undefined} data-testid="gate-scroll"><Icon name={readEnd ? 'check_circle' : 'arrow_downward'} size={20} />{readEnd ? 'You’ve read to the end' : 'Read to the end of this document to continue'}</p>
                  ) : null}
                  {needsAccept ? (
                    <label className={styles.accept} data-testid="gate-accept" data-disabled={!readEnd || undefined}>
                      <Checkbox isSelected={!!accepted[doc.contract.id]} isDisabled={!readEnd} onChange={(on: boolean) => setAccepted((a) => { const n = { ...a }; if (on) n[doc.contract.id] = Date.now(); else delete n[doc.contract.id]; return n })} aria-label={acceptLabelOf(doc.contract)} />
                      <span>{acceptLabelOf(doc.contract)}</span>
                    </label>
                  ) : null}
                  <Button isDisabled={!gatesMet} onPress={next}>{last ? 'Continue to sign' : 'Continue'}</Button>
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
      </div>
      {walking && !signed ? (
        <div className={styles.nextBar} data-testid="sign-next">
          {gatesMet
            ? <><span className={styles.nextText}>Document {at + 1} of {documents.length} read</span><Button onPress={() => { next(); if (last) toCard() }}>{last ? 'Continue to sign' : 'Next document'}</Button></>
            : <><span className={styles.nextText}>{!readEnd ? 'Read to the end of this document' : 'Tick that you accept, in the box at the top'}</span>{readEnd ? <Button variant="secondary" appearance="outlined" onPress={toCard}>Go to the box</Button> : null}</>}
        </div>
      ) : null}
    </div>
  )
}
