'use client'

import { useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { CodeBoxes, emptyCode } from '@/components/om/code-boxes'
import { SignaturePad } from '@/components/om/signature-pad'
import { maskNric } from '@/lib/format'
import { SIGN_CODE_DEMO } from '@/lib/contracts/model'
import { CaseTrustBox } from './casetrust-box'
import shell from './signing-page.module.css'
import ph from './sign-phone.module.css'

export type SheetStep = 'review' | 'code' | 'sign'
/** One document's words to tick (a set names each). */
export type SheetTick = { id: string; title?: string; label: string; at: number | null }

/**
 * (Contracts on the move, C3 — P-06 · A-20 · A-19 · A-23 · A-21; Q-02 "type") The client's signing sheet on a phone and a touch tablet: a
 * bottom sheet (a 400 dialog on a tablet) in three screens, one filled button each — (1) the words to tick and the CaseTrust box, (2) the
 * six code boxes (the house `CodeBoxes`: `autocomplete="one-time-code"`, so the phone offers the SMS; the sixth digit verifies), (3) Type
 * first — the name prefilled, the serif preview — with Draw one tap away: a full-width pad at a fixed 2:1 that stores the stroke in the
 * shape it was drawn, Clear under it, "Add NRIC / FIN" folded; the consent sentence at 16. The gates (read to the end, tick to accept —
 * REG-633) and the record are the rules they were; only where they sit on the screen changes. The desk keeps its card. *(invented copy
 * where the desk had none: the step titles, "Add NRIC / FIN (optional)", "Continue")*
 */
export function SignSheet(p: {
  open: boolean; onClose: () => void; step: SheetStep
  /** what is signed, for the words: "the agreement" · "these documents" */ noun: string
  /* (1) */ ticks: SheetTick[]; onTick: (id: string, at: number | null) => void
  caseTrust: { studio: string; at: number | null; onTick: (at: number | null) => void } | null
  onContinue: () => void; continueBusy: boolean
  /* (2) */ codeDemo: boolean; masked: string; code: string; onCode: (code: string) => void; onVerify: () => void; onSendAgain: () => void; codeBusy: boolean
  /* (3) */ name: string; onName: (v: string) => void; how: 'type' | 'draw'; onHow: (h: 'type' | 'draw') => void
  drawing: string; onDrawing: (d: string) => void; nric: string; onNric: (v: string) => void; nricOk: boolean
  consent: string; signLabel: string; onSign: () => void; busy: boolean; canSign: boolean
}) {
  const { step } = p
  const [nricOpen, setNricOpen] = useState(false)
  const showNric = nricOpen || !!p.nric
  const ticked = p.ticks.every((t) => !!t.at) && (!p.caseTrust || !!p.caseTrust.at)
  const digits = (() => { const a = emptyCode(); for (let i = 0; i < 6; i++) a[i] = p.code[i] ?? ''; return a })()
  const title = step === 'review' ? `Accept ${p.noun}` : step === 'code' ? 'Enter the code' : 'Sign as yourself'
  const footer = step === 'review'
    ? <Button size="lg" isDisabled={!ticked || p.continueBusy} onPress={p.onContinue} data-testid="sign-sheet-continue">{p.continueBusy ? 'One moment…' : 'Continue'}</Button>
    : step === 'code'
      ? <>{p.codeDemo ? null : <Button variant="secondary" appearance="text" isDisabled={p.codeBusy} onPress={p.onSendAgain}>Send again</Button>}<Button size="lg" isDisabled={p.code.length !== 6} onPress={p.onVerify} data-testid="sign-sheet-verify">Verify</Button></>
      : <Button size="lg" isDisabled={!p.canSign || p.busy} onPress={p.onSign} data-testid="sign-sheet-sign">{p.busy ? 'Signing…' : p.signLabel}</Button>
  return (
    <Dialog open={p.open} onClose={() => { if (!p.busy) p.onClose() }} title={title} size="form" width={400} closeOnScrim={false} portal footer={footer}>
      <div className={ph.sheetBody} data-testid="sign-sheet" data-step={step}>
        {step === 'review' ? (
          <>
            {p.ticks.length || p.caseTrust ? <p className={ph.sheetText}>Tick to confirm, then continue — a one-time code confirms it’s you.</p> : <p className={ph.sheetText}>{p.codeDemo ? 'A one-time code confirms it’s you.' : <>We’ll send a one-time code to <strong>{p.masked}</strong> to confirm it’s you.</>}</p>}
            {p.ticks.map((t) => (
              <label key={t.id} className={ph.tick} data-testid="sign-sheet-accept">
                <Checkbox isSelected={!!t.at} onChange={(on: boolean) => p.onTick(t.id, on ? Date.now() : null)} aria-label={t.title ? `${t.title}: ${t.label}` : t.label} />
                <span className={ph.tickWords}>{t.title ? <span className={ph.tickTitle}>{t.title}</span> : null}<span>{t.label}</span></span>
              </label>
            ))}
            {p.caseTrust ? <div className={ph.caseTrust}><CaseTrustBox studio={p.caseTrust.studio} at={p.caseTrust.at} onTick={p.caseTrust.onTick} /></div> : null}
          </>
        ) : null}
        {step === 'code' ? (
          <>
            {p.codeDemo ? <p className={ph.sheetText} data-testid="sign-code-demo">{SIGN_CODE_DEMO}</p> : <p className={ph.sheetText}>We sent a six-digit code to <strong>{p.masked}</strong>.</p>}
            <CodeBoxes value={digits} onChange={(next) => p.onCode(next.join(''))} onEnter={() => { if (p.code.length === 6) p.onVerify() }} label="One-time code" testId="sign-digit" />
          </>
        ) : null}
        {step === 'sign' ? (
          <>
            <div className={ph.how}><Chips label="How you sign" options={[{ value: 'type', label: 'Type' }, { value: 'draw', label: 'Draw' }]} value={p.how} onChange={(v) => p.onHow(v === 'draw' ? 'draw' : 'type')} testId="sign-how" /></div>
            <TextField label="Your full name" required value={p.name} onChange={p.onName} onKeyDown={(e) => { if (e.key === 'Enter' && p.how === 'type' && p.canSign) { e.preventDefault(); p.onSign() } }} />
            {p.how === 'type'
              ? (p.name.trim() ? <span className={shell.preview} data-testid="sign-preview">{p.name.trim()}</span> : null)
              : (
                <div className={ph.pad}>
                  <SignaturePad value={p.drawing} onChange={p.onDrawing} hint="Draw your signature here" ratio={2} hideClear />
                  <div className={ph.padRow}><Button variant="secondary" appearance="text" isDisabled={!p.drawing} onPress={() => p.onDrawing('')} data-testid="sign-clear">Clear</Button></div>
                </div>
              )}
            {/* (REG-563) The NRIC / FIN, optional and folded: the page keeps only its last four characters, masked. */}
            {showNric ? (
              <TextField label="NRIC / FIN (optional)" value={p.nric} onChange={(v) => p.onNric(v.toUpperCase().slice(0, 9))} maxLength={9} autoFocus={nricOpen && !p.nric} error={!p.nricOk ? 'Enter a valid NRIC or FIN, like S1234567A' : undefined}
                         helper={p.nric.trim() && p.nricOk ? `Kept as ${maskNric(p.nric)} — only the last four characters are stored` : 'Only the last four characters are kept, masked: •••••567A'} />
            ) : (
              <div className={ph.fold}><Button variant="secondary" appearance="text" onPress={() => setNricOpen(true)} data-testid="sign-add-nric">Add NRIC / FIN (optional)</Button></div>
            )}
            <p className={ph.consent} data-testid="sign-sheet-consent">{p.consent}</p>
          </>
        ) : null}
      </div>
    </Dialog>
  )
}
