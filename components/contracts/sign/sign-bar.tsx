'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import ph from './sign-phone.module.css'

export type SignBarState =
  | { kind: 'reading'; at: number; total: number; /** a set: "Document 1 of 2" */ doc?: string | null }
  | { kind: 'ready'; label: string; onPress: () => void; busy?: boolean; /** a set's "Document 1 of 2 read" beside the button */ words?: string | null }
  | { kind: 'signed'; line: string; onLine: () => void; onSave: () => void }

/**
 * (Contracts on the move, C3 — P-05 · A-18 · A-22) The sticky bar at the foot of the phone's screen — one thing at a time: while reading,
 * "Read to the end to sign" with how far they are ("3 of 11 sections", from the paper's headings as they scroll past); read to the end,
 * one filled 48 button — **Accept and sign** (a set: **Next document**, then Accept and sign on the last); signed, the line "Signed by …"
 * (a press lands on the Signed card) and **Save a copy**. Marked `data-surface-foot` so the house snackbar clears it (B-21's rule,
 * `useSheetFootLift`). Hidden on the desk. *(invented copy: "Read to the end to sign", "Accept and sign", "Save a copy")*
 */
export function SignBar({ state }: { state: SignBarState }) {
  return (
    <div className={ph.bar} data-surface-foot="" data-testid="sign-next" data-kind={state.kind}>
      {state.kind === 'reading' ? (
        <div className={ph.barRow}>
          <span className={ph.barWords}>
            <span className={ph.barLead}>{state.doc ? `${state.doc} · Read to the end` : 'Read to the end to sign'}</span>
            {state.total ? <span className={ph.barHint} data-testid="sign-progress">{state.at ? `${state.at} of ${state.total} sections` : `${state.total} sections`}</span> : null}
          </span>
          <span className={ph.heroRowIcon} aria-hidden><Icon name="arrow_downward" size={24} /></span>
        </div>
      ) : state.kind === 'ready' ? (
        <div className={ph.barRow}>
          {state.words ? <span className={ph.barWords}><span className={ph.barLead}>{state.words}</span></span> : null}
          <span className={ph.barPrimary}><Button size="lg" isDisabled={!!state.busy} onPress={state.onPress} data-testid="sign-bar-primary">{state.label}</Button></span>
        </div>
      ) : (
        <div className={ph.barRow}>
          <button type="button" className={ph.barState} onClick={state.onLine} data-testid="sign-bar-signed"><Icon name="check_circle" size={24} /><span className={ph.barStateText}>{state.line}</span></button>
          <Button variant="secondary" appearance="outlined" size="lg" iconStart={<Icon name="share" size={20} />} onPress={state.onSave} data-testid="sign-bar-save">Download a copy</Button>   {/* (the calm UI build 2026-10-27, 4-09 · W-351) the desk's verb — on a phone it still opens the share sheet */}
        </div>
      )}
    </div>
  )
}
