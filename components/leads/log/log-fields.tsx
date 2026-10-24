'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Chips, type ChipOption } from '@/components/om/chips'
import { DatePicker } from '@/components/om/date-picker'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { useReadOnly } from '@/components/om/read-only'
import { PhotoOrFile } from '@/components/contracts/photo-or-file'
import photoStyles from '@/components/contracts/photo-or-file.module.css'
import { DuePresetChips } from '@/components/leads/tasks/due-presets'
import { OUTCOMES } from '@/lib/leads/enums'
import { calendarDaysBetween, displayDate, displayTime, formatInputDateTime, parseInputDateTime } from '@/lib/format'
import { defaultMode, firstName, MORE_CHANNELS, nextLabel, asksNext, SHEET_CHANNELS, VISIT_PLACES, type SheetChannel } from './log-plan'
import styles from './log.module.css'

/*
 * (Leads on the move, P-03 · P-04 — his marks 2026-10-23, "continue the leads") The pieces a log is made of on a phone and a tablet held upright —
 * the log sheet's body and the Move stage window's Contacted / Met steps on the move: the channel as chips (the pressed one set), When set to
 * now (Change opens the house picker), the outcomes as chips, the call-back with the due presets the Tasks tab uses (one set of words and days,
 * L4's `DuePresetChips`), notes, and Take a photo · Choose a file (optional, Q-02). All on the house pieces — `Chips`, `TextField`, `DatePicker`,
 * `PhotoOrFile` — at 16 / 14 / 44 (P-13). *(invented copy: the group labels, "Now", "Change", "Set a …", "Who owns …?", the photo rows' help.)*
 */

/** A file the log keeps: the lead's own (uploaded through the Files tab's upload as it was picked), with its picture for the row. */
export type LogFile = { id: string; name: string; thumb: string | null; kind: string }

const MORE = '__more'

/** Chips with a "More…" chip that shows the rest in place — a value among the rest opens them at once. */
export function ChipsWithMore({ label, primary, more, value, onChange, testId, render }: {
  label: string
  primary: readonly string[]
  more: readonly string[]
  value: string | null
  onChange: (v: string) => void
  testId?: string
  /** a chip's words, when they differ from its value */
  render?: (v: string) => string
}) {
  const [shown, setShown] = useState(false)
  const open = shown || (!!value && more.includes(value))
  const opt = (v: string): ChipOption => ({ value: v, label: render ? render(v) : v })
  const options: ChipOption[] = [...primary.map(opt), ...(open ? more.map(opt) : [{ value: MORE, label: 'More…' }])]
  return <Chips label={label} options={options} value={value} testId={testId} className={styles.chips} onChange={(v) => { if (v === MORE) setShown(true); else onChange(v) }} />
}

/** The channel row — the sheet's four (Call · WhatsApp · Visit · Note), the window's three without Note, the rest behind More. */
export function ChannelChips({ value, onChange, withNote = true, error }: { value: SheetChannel | null; onChange: (c: SheetChannel) => void; withNote?: boolean; error?: string }) {
  return (
    <div className={styles.group} data-error={error ? '' : undefined}>
      <span className={styles.label}>How</span>
      <ChipsWithMore label="How you were in touch" testId="log-channel" value={value}
                     primary={withNote ? SHEET_CHANNELS : SHEET_CHANNELS.filter((c) => c !== 'Note')} more={MORE_CHANNELS}
                     render={(c) => (c === 'Visit' ? 'Site visit' : c)}
                     onChange={(c) => onChange(c as SheetChannel)} />
      {error ? <span className={styles.error} role="alert">{error}</span> : null}
    </div>
  )
}

/** When it was — "Now · 4:12 PM" as the sheet opens; Change opens the house date-and-time picker (a log is never in the future). */
export function WhenRow({ value, onChange, now, openedAt, error, label = 'When' }: {
  value: string; onChange: (v: string) => void
  /** the host's clock (never Date.now() in render) */
  now: number
  /** the moment the log was opened — that minute reads "Now" */
  openedAt: number
  error?: string
  label?: string
}) {
  const ro = useReadOnly()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLDivElement>(null)
  const d = parseInputDateTime(value)
  const isNow = !!d && Math.abs(d.getTime() - openedAt) < 60_000
  const days = d ? calendarDaysBetween(now, d.getTime()) : 0
  const text = !d ? 'Choose when' : isNow ? `Now · ${displayTime(d)}` : `${days === 0 ? 'Today' : days === -1 ? 'Yesterday' : displayDate(d)} · ${displayTime(d)}`
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  return (
    <div ref={anchor} className={styles.when} data-error={error ? '' : undefined} data-testid="log-when">
      <span className={styles.whenText}>
        <span className={styles.label}>{label}</span>
        <span className={styles.whenValue}>{text}</span>
      </span>
      {ro ? null : <button type="button" className={styles.link} onClick={() => setOpen(true)} aria-label={`Change when — ${text}`} data-testid="log-when-change">Change</button>}
      <DatePicker open={open} anchorRef={anchor} value={d} today={today} max={today} label="When it was" withTime defaultNow
                  onSelect={(x) => onChange(formatInputDateTime(x))} onClose={() => setOpen(false)} />
      {error ? <span className={styles.error} role="alert">{error}</span> : null}
    </div>
  )
}

/** How it went — the five outcomes as chips (lib/leads/enums.ts OUTCOMES, the window's and the Notes tab's own). */
export function OutcomeChips({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className={styles.group} data-error={error ? '' : undefined}>
      <span className={styles.label}>How it went</span>
      <Chips label="How it went" options={OUTCOMES} value={value || null} onChange={onChange} testId="log-outcome" className={styles.chips} />
      {error ? <span className={styles.error} role="alert">{error}</span> : null}
    </div>
  )
}

/** The next call or meeting: the due presets (Tomorrow 10:00 · In 3 days · Next week · Pick a day), then how — once a day is set. Opens with its
    presets when the outcome asks for one (a callback, a meeting) or the studio does; else one line offers it. Keyed on the outcome by the host. */
export function NextStep({ outcome, when, mode, channel, onChange, now, required = false, error }: {
  outcome: string; when: string; mode: string; channel: SheetChannel
  onChange: (patch: { nextStepWhen: string; nextStepMode: string }) => void
  now: number; required?: boolean; error?: string
}) {
  const label = nextLabel(outcome)
  const [open, setOpen] = useState(() => asksNext(outcome) || required || !!when)
  if (!label) return null
  if (!open && !required) {
    return (
      <button type="button" className={styles.addLink} onClick={() => setOpen(true)} data-testid="log-next-open">
        <Icon name="add" size={20} />{`Set a ${label.toLowerCase()}`}
      </button>
    )
  }
  const due = parseInputDateTime(when)
  return (
    <div className={styles.group} data-error={error ? '' : undefined} data-testid="log-next">
      <span className={styles.label}>{required ? label : `${label} (optional)`}</span>
      <DuePresetChips value={due} now={now} label={label}
                      onChange={(d) => onChange({ nextStepWhen: d ? formatInputDateTime(d) : '', nextStepMode: d ? (mode || defaultMode(outcome, channel)) : '' })} />
      {due ? (
        <ChipsWithMore label="How you’ll follow up" testId="log-next-mode" value={mode || defaultMode(outcome, channel)}
                       primary={['Call', 'WhatsApp', 'In person']} more={['Email', 'SMS', 'Others']}
                       onChange={(m) => onChange({ nextStepWhen: when, nextStepMode: m })} />
      ) : null}
      {error ? <span className={styles.error} role="alert">{error}</span> : null}
    </div>
  )
}

/** A site visit's Where — the Met step's three. */
export function WhereChips({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className={styles.group} data-error={error ? '' : undefined}>
      <span className={styles.label}>Where</span>
      <Chips label="Where you met" options={VISIT_PLACES} value={value || null} onChange={onChange} testId="log-where" className={styles.chips} />
      {error ? <span className={styles.error} role="alert">{error}</span> : null}
    </div>
  )
}

/** Notes, optional — a few lines at 16. */
export function LogNotes({ value, onChange, label = 'Notes (optional)' }: { value: string; onChange: (v: string) => void; label?: string }) {
  return <TextField label={label} value={value} onChange={onChange} multiline={3} maxLength={4000} className={styles.notes} />
}

/** On an unowned New lead: who owns it — the suggested member first, then you. A pick puts them on the lead as the save moves it (REG-130). */
export function OwnerRow({ first, team, assignable, suggestedId, value, onChange }: {
  first: string
  team: { id: string; name: string; isYou: boolean }[]
  assignable: string[]
  suggestedId: string | null
  value: string | null
  onChange: (id: string | null) => void
}) {
  const pool = team.filter((m) => assignable.includes(m.id))
  const rank = (m: { id: string; isYou: boolean }) => (m.id === suggestedId ? 0 : m.isYou ? 1 : 2)
  const sorted = [...pool].sort((a, b) => rank(a) - rank(b))
  const options: ChipOption[] = sorted.map((m) => ({ value: m.id, label: m.id === suggestedId ? `${m.name} · suggested` : m.isYou ? `${m.name} (you)` : m.name }))
  return (
    <div className={styles.group} data-testid="log-owner">
      <span className={styles.label}>{`Who owns ${first}?`}</span>
      <Chips label={`Who owns ${first}`} options={options} value={value} onChange={(v) => onChange(v === value ? null : v)} className={styles.chips} />
    </div>
  )
}

/** Photos and screenshots, optional (Q-02): Take a photo first, then Choose a file, then the lead's own files; what is kept, as rows. */
export function LogPhotos({ files, onPick, uploading, onRemove, onLibrary, first, label = 'Photos and screenshots (optional)' }: {
  files: LogFile[]
  onPick: (file: File) => void
  uploading: boolean
  onRemove: (id: string) => void
  /** the lead's files already in Files (the house Attach files modal) */
  onLibrary?: () => void
  first: string
  label?: string
}) {
  const ro = useReadOnly()
  return (
    <div className={styles.group} data-testid="log-photos">
      <span className={styles.label}>{label}</span>
      {ro ? null : (
        <PhotoOrFile ids={{ photo: 'log-take-photo', file: 'log-choose-file' }} label={label} uploading={uploading} many fileAccept="*/*"
                     photoHelp="The site, the paper, a screenshot" fileHelp="A screenshot, a PDF or a chat export"
                     onPick={(f) => { if (f) onPick(f) }} />
      )}
      {onLibrary && !ro ? (
        <button type="button" className={styles.addLink} onClick={onLibrary} data-testid="log-from-files">
          <Icon name="folder_open" size={20} />{`From ${first}’s files`}
        </button>
      ) : null}
      {files.length ? (
        <ul className={styles.files} aria-label="Kept with this log">
          {files.map((f) => (
            <li key={f.id} className={styles.file}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f.thumb ? <img className={photoStyles.thumb} src={f.thumb} alt="" width={40} height={40} />
                : <span className={styles.fileGlyph} aria-hidden><Icon name={f.kind === 'pdf' ? 'picture_as_pdf' : f.kind === 'image' ? 'image' : 'draft'} size={24} weight={300} /></span>}
              <span className={styles.fileName}>{f.name}</span>
              {ro ? null : <IconButton icon="close" label={`Remove ${f.name}`} variant="bare" iconSize={24} iconWeight={300} onClick={() => onRemove(f.id)} />}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** A short line in the sheet's own voice — what Save does, or why the lead stays. */
export function LogLine({ children, tone = 'info', testId }: { children: ReactNode; tone?: 'info' | 'error'; testId?: string }) {
  return (
    <p className={styles.line} data-tone={tone} role={tone === 'error' ? 'alert' : undefined} data-testid={testId}>
      <Icon name={tone === 'error' ? 'error' : 'info'} size={20} weight={300} />
      <span>{children}</span>
    </p>
  )
}

export { firstName }
