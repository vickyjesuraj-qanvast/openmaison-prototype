'use client'

import { Button } from '@/components/ds'
import { Drawer } from '@/components/om/drawer'
import { SIGN_FIELDS, signField, type SignKey } from '@/lib/contracts/tokens'
import styles from './contract-editor.module.css'

/**
 * eSignatures (the reference's right panel, "Fillable Fields"): the four fields with Insert — each drops a signature box
 * into the document at the caret. On the signing page the studio's box prints your saved signature and the client's is
 * where they sign; initials print as small boxes.
 */
export function ESignPanel({ open, onClose, onInsert, hasStudioSignature }: { open: boolean; onClose: () => void; onInsert: (html: string) => void; hasStudioSignature: boolean }) {
  return (
    <Drawer open={open} onClose={onClose} title="eSignatures" label="eSignatures" width={400}>
      <div className={styles.signEyebrow}>Fillable fields</div>
      <div className={styles.signRows}>
        {SIGN_FIELDS.map((f) => (
          <div key={f.key} className={styles.signRow} data-testid="esign-field">
            <span className={styles.signText}>
              <span className={styles.signLabel}>{f.label}</span>
              <span className={styles.signHelp}>{f.key === 'studio-signature' && !hasStudioSignature ? 'Set your signature up in a quote’s Signature section first' : f.help}</span>
            </span>
            <Button variant="secondary" appearance="outlined" onPress={() => onInsert(signField(f.key as SignKey))}>Insert</Button>
          </div>
        ))}
      </div>
      <p className={styles.signNote}>Place the fields where the parties sign. The client’s field is where they sign online once you send the link.</p>
    </Drawer>
  )
}
