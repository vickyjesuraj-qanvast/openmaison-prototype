'use client'

import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { useSnackbar } from '@/components/om/snackbar'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { placeWords, SIGN_FIELDS, SIGN_LABEL, signField, type SignKey, type SignPlaceRow } from '@/lib/contracts/tokens'
import { BeforeSigningPanel, type SigningGates } from '../document/before-signing-panel'
import { liveDoc, useLiveDocHtml } from '../document/live-doc'
import { SignatureFieldsPanel } from '../document/signature-fields-panel'
import styles from './contract-editor.module.css'

export type { SigningGates } from '../document/before-signing-panel'

/**
 * eSignatures (the reference's right panel, "Fillable Fields"): the four fields with Insert — each drops a signature box
 * into the document at the caret. On the signing page the studio's box prints your saved signature and the client's is
 * where they sign; initials print as small boxes. (REG-633, contracts parity Q-15) Then "Before the client signs": 1.0's per-document
 * gates — read to the end, tick your words (the words editable) — for this contract, or for every contract a template starts.
 * (contracts on the move 2026-10-22, P-04 · B-04 · B-05 · B-12 · C-13) On a phone and a touch tablet the panel is two parts: **Signature
 * fields** — each field placed / not placed, and Add, which asks WHICH then WHERE and lands the field as its own block after that clause
 * (never at a thumb's caret; the panel closes and the box scrolls into view with Undo) — and **Before the client signs**, whose rows are
 * labels the whole row toggles. The desk keeps Insert at the caret (Dane UAT 8.03). A host that holds the paper itself passes `html` and
 * `onPlace`; today's editor passes neither, and the panel reads the mounted paper (live-doc.ts).
 */
export function ESignPanel({ open, onClose, onInsert, hasStudioSignature, gates, onGates, uploaded = false, locked = false, html, onPlace }: {
  open: boolean; onClose: () => void; onInsert: (html: string) => void; hasStudioSignature: boolean
  gates?: SigningGates; onGates?: (patch: Partial<SigningGates>) => void
  /** An uploaded PDF can be accepted, not scrolled. */
  uploaded?: boolean
  /** Signed: the gates stay as they were. */
  locked?: boolean
  /** The paper as the host holds it (a section screen with no editor on the page); absent, the mounted paper is read. */
  html?: string
  /** The host applies a touch placement itself (`insertSignFieldAfter` on its state); absent, the mounted paper takes it. */
  onPlace?: (key: SignKey, place: SignPlaceRow) => void
}) {
  const narrow = useMediaQuery(TABLET_DOWN)
  const snackbar = useSnackbar()
  const liveHtml = useLiveDocHtml()
  const docHtml = html ?? liveHtml ?? ''
  const place = (key: SignKey, row: SignPlaceRow) => {
    onClose()
    if (onPlace) { onPlace(key, row); return }
    const api = liveDoc()
    const r = api?.insertSignFieldAt(row.place, key) ?? null
    if (!api || !r) { onInsert(signField(key)); return }   // no paper on the page to place in: at the caret, as the desk does
    snackbar({ message: `${SIGN_LABEL[key]} added ${placeWords(row)}`, actionLabel: 'Undo', onAction: () => api.replaceAll(r.prev) })
  }
  return (
    <Drawer open={open} onClose={onClose} title="Signatures" label="Signatures">   {/* (the calm UI build 2026-10-27, 4-19 · W-182) the plain word */}
      {/* (pending modules S03) a PDF has no document to place a field in — its Insert pressed nothing; the client signs it on the page */}
      {uploaded ? <p className={styles.signNote}>A PDF is read and signed on the page itself: the client ticks your words, then signs under it.</p> : narrow ? (
        <>
          <div className={styles.signEyebrow}>Signature fields</div>
          <SignatureFieldsPanel html={docHtml} hasStudioSignature={hasStudioSignature} locked={locked} nested onPlace={place} />
        </>
      ) : <>
      {/* (the calm UI build 2026-10-27, 4-19 · W-187 · W-588) "Signature boxes", and what to do with them in one line under it */}
      <div className={styles.signEyebrow}>Signature boxes</div>
      <p className={`${styles.signNote} ${styles.signLead}`}>Put a box where each person signs.</p>
      <div className={styles.signRows}>
        {SIGN_FIELDS.map((f) => (
          <div key={f.key} className={styles.signRow} data-testid="esign-field">
            <span className={styles.signText}>
              <span className={styles.signLabel}>{f.label}</span>
              <span className={styles.signHelp}>{f.key === 'studio-signature' && !hasStudioSignature ? 'Set your signature up on Your profile first' : f.help}</span>
            </span>
            <Button variant="secondary" appearance="outlined" isDisabled={locked} onPress={() => onInsert(signField(f.key as SignKey))}>Insert</Button>
          </div>
        ))}
      </div>
      </>}
      {gates && onGates ? <BeforeSigningPanel gates={gates} onGates={onGates} uploaded={uploaded} locked={locked} /> : null}
    </Drawer>
  )
}
