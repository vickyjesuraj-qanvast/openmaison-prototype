'use client'

import { useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { useReadOnly } from '@/components/om/read-only'
import styles from './fields.module.css'

export { PortalMenu } from '@/components/om/portal-menu'
export { TextField } from '@/components/om/text-field'
export { DateField, DateTimeField } from '@/components/om/date-field'

export function ChoiceChips({
  options, value, onChange, label, error,
}: { options: readonly string[]; value: string | null; onChange: (v: string) => void; label: string; error?: string }) {
  const ro = useReadOnly()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }} data-error={error || undefined}>
      <span className={styles.mutedLabel} data-error={error || undefined}>{label}</span>
      <div className={styles.chips} role="radiogroup" aria-label={label} aria-invalid={!!error || undefined} aria-disabled={ro || undefined}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={o === value}
                  className={styles.chip} data-selected={o === value || undefined} disabled={ro}
                  onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
      <FieldError message={error} />
    </div>
  )
}

/** Inline message for controls that are not text fields (chip groups, attach rows, milestone tables). DS error text: 12/16 red. */
export function FieldError({ message }: { message?: string }) {
  return message ? <span className={styles.fieldError} role="alert">{message}</span> : null
}

export function SectionRow({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div className={styles.rowBetween}>
      <span className={styles.sectionLabel}>{label}</span>
      {action}
    </div>
  )
}

export function LinkButton({ icon, children, onClick }: {
  icon?: string; children: ReactNode; onClick?: (e: MouseEvent<HTMLButtonElement>) => void
}) {
  const ro = useReadOnly()
  if (ro) return null   // read-only stage: no Attach / Add / Reset affordances
  return (
    <button type="button" className={styles.link} onClick={onClick}>
      {icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </button>
  )
}

export function Divider() {
  return <div className={styles.divider} />
}

/**
 * Attached-file tile (781:58405): 146w, 4px pad, a 138×105 preview, then picture_as_pdf (filled, red) · name · delete.
 * Every attached file — call screenshots, meeting documents, site photos, renders — uses this one tile; the preview is
 * the mock's own image since the prototype never reads the real file.
 */
export function FileTile({ name, onDelete }: { name: string; onDelete: () => void }) {
  const ro = useReadOnly()
  return (
    <div className={styles.tile}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.tileImg} src="/figma-assets/chat-screenshot-thumb.png" alt="" />
      <div className={styles.tileRow}>
        <span className={styles.tilePdf}><Icon name="picture_as_pdf" size={20} fill /></span>
        <span className={styles.tileName}>{name}</span>
        {ro ? null : (
          <Tooltip label="Remove file">
            <button type="button" className={styles.tileDel} aria-label={`Remove ${name}`} onClick={onDelete}>
              <Icon name="delete" size={24} weight={300} />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

export function NotesArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ro = useReadOnly()
  return (
    <textarea
      className={styles.notes} disabled={ro}
      placeholder="Enter your notes"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Notes"
    />
  )
}

/**
 * Upload target (780:90940 · 780:91263). Any file the user picks or drops is accepted — the prototype then
 * shows the mock's own file (the panels decide which) after the "Uploading..." state.
 * `accept` is unset by default (Auto Fill takes a screenshot from any app); the quote / contract dropzones pass PDF.
 */
export function Dropzone({ title, helper, onPick, uploading, accept }: {
  title: ReactNode; helper: string; onPick: (file?: File) => void; uploading?: boolean; accept?: string
}) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const ro = useReadOnly()
  if (ro) return null
  if (uploading) {
    return (
      <div className={styles.dropzone} data-uploading="true" role="status" aria-live="polite">
        <span className={styles.dropTitle}>Uploading...</span>
        <span className={styles.dropHelper}>Please wait as your file is being uploaded!</span>
      </div>
    )
  }
  return (
    <div
      className={styles.dropzone}
      data-over={over || undefined}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onPick(e.dataTransfer.files[0]) }}
      role="button"
      aria-label="Upload file"
    >
      <span className={styles.dropTitle}>{title}</span>
      <span className={styles.dropHelper}>{helper}</span>
      <input ref={inputRef} type="file" accept={accept} className={styles.fileInput} tabIndex={-1} aria-hidden
             onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onPick(f) }} />
    </div>
  )
}
