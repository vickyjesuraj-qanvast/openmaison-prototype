'use client'

import { useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
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
    <div className={styles.chipGroup} data-error={error || undefined}>
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

/** DS Link text (780:92851): 14 Semi Bold primary, optional 20px leading icon (or any `leading` glyph — the 17px sparkle), H g4; hover on-primary-variant. */
export function LinkButton({ icon, leading, children, onClick }: {
  icon?: string; leading?: ReactNode; children: ReactNode; onClick?: (e: MouseEvent<HTMLButtonElement>) => void
}) {
  const ro = useReadOnly()
  if (ro) return null   // read-only stage: no Attach / Add / Reset affordances
  return (
    <button type="button" className={styles.link} onClick={onClick}>
      {leading ?? (icon ? <Icon name={icon} size={20} /> : null)}
      {children}
    </button>
  )
}

export function Divider() {
  return <div className={styles.divider} />
}

/**
 * Attached-file tile (781:58405): 146w, 4px pad, a 138×105 preview, then the kind glyph (filled, red) · name · delete.
 * `thumb` / `kind` come from the caller's real file row where it has one (Tasks › Attachments): the preview is that
 * file's thumbnail and the glyph follows its kind — picture_as_pdf for a PDF, image otherwise, both red, the rule
 * components/leads/files/files-grid.tsx already uses. The Move stage window simulates its uploads and passes neither,
 * so it keeps the mock's own screenshot and picture_as_pdf (REG-151), as does any file with no thumbnail.
 */
export function FileTile({ name, onDelete, thumb, kind = 'pdf' }: { name: string; onDelete: () => void; thumb?: string | null; kind?: string }) {
  const ro = useReadOnly()
  return (
    <div className={styles.tile}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.tileImg} src={thumb ?? '/figma-assets/chat-screenshot-thumb.png'} alt="" />
      <div className={styles.tileRow}>
        <span className={styles.tilePdf}><Icon name={kind === 'pdf' ? 'picture_as_pdf' : 'image'} size={20} fill /></span>
        <span className={styles.tileName}>{name}</span>
        {ro ? null : (
          <Tooltip label="Remove file">
            <IconButton icon="delete" label={`Remove ${name}`} size={24} variant="bare" iconSize={24} iconWeight={300} onClick={onDelete} />
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
      placeholder="Enter your remarks"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Remarks"
    />
  )
}

/**
 * Upload target (780:90940 · 780:91263 · 780:92744 / 780:92808): 2px dashed on-surface/border, p40, 14 Semi Bold title with
 * "browse" underlined in the same ink, 12 helper. Any file the user picks or drops is accepted — the prototype then
 * shows the mock's own file (the panels decide which) after the "Uploading..." state.
 * `accept` is unset by default (Auto Fill takes a screenshot from any app); the quote / contract dropzones pass PDF.
 * `variant="notes"` = Notes › Auto Fill (931:45344, spec 02): 552×168, the helper 237 wide and centred.
 * Keyboard: the box is a real tab stop; Enter / Space open the file picker (audit 2026-08-30).
 */
export function Dropzone({ title, helper, onPick, uploading, accept, variant }: {
  title: ReactNode; helper: string; onPick: (file?: File) => void; uploading?: boolean; accept?: string
  variant?: 'notes'
}) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const ro = useReadOnly()
  if (ro) return null
  if (uploading) {
    return (
      <div className={styles.dropzone} data-uploading="true" data-variant={variant} role="status" aria-live="polite">
        <span className={styles.dropTitle}>Uploading...</span>
        <span className={styles.dropHelper}>Please wait as your file is being uploaded!</span>
      </div>
    )
  }
  return (
    <div
      className={styles.dropzone}
      data-variant={variant}
      data-over={over || undefined}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onPick(e.dataTransfer.files[0]) }}
      role="button"
      tabIndex={0}
      aria-label="Upload file"
    >
      <span className={styles.dropTitle}>{title}</span>
      <span className={styles.dropHelper}>{helper}</span>
      <input ref={inputRef} type="file" accept={accept} className={styles.fileInput} tabIndex={-1} aria-hidden
             onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onPick(f) }} />
    </div>
  )
}
