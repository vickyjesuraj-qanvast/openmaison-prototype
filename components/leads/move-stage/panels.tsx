'use client'

import { useState, type ReactNode } from 'react'
import { Checkbox, Tag } from '@/components/ds'
import { ReadOnlyScope, useReadOnly } from '@/components/om/read-only'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useComingSoon } from '@/components/om/snackbar'
import { Avatar } from '@/components/om/avatar'
import { CONTACT_CHANNELS, CONTACT_MODES, OUTCOMES, SCHEDULE } from '@/lib/leads/enums'
import { displayDate, moneySGD } from '@/lib/format'
import type { StageDocuments } from '@/app/leads/quotes-actions'
import type { Member } from '@/lib/db/schema'
import { ChoiceChips, DateTimeField, Divider, FieldError, FileTile, LinkButton, NotesArea, SectionRow, Dropzone, TextField, useUploadSim } from './fields'
import { amountMinor, defaultMilestones, SYSTEM_CONTRACT, SYSTEM_QUOTE, zeroMilestones } from '@/lib/leads/stage-data'
import type { ContactLog, MeetingLog, StageErrors, WizardData } from './types'
import styles from './wizard.module.css'
import fieldStyles from './fields.module.css'

// OUTCOMES / SCHEDULE / CONTACT_MODES live in lib/leads/enums.ts — shared with the Notes tab (REG-186, REG-319).

/** New = who the lead is assigned to. Read-only inside the stage move (user 2026-08-29): assignment happens from the listing. */
export function NewPanel({
  team, data, update, editable = false, error,
}: { team: Member[]; data: WizardData; update?: (patch: Partial<WizardData>) => void
  /** (REG-334) True while the lead is still in New: the checkboxes assign; otherwise they only show. */
  editable?: boolean
  /** validateStage's `assignees` message after a Save with nobody ticked. */
  error?: string }) {
  return (
    <>
      <p className={styles.panelTitle}>New</p>
      <div className={styles.stack12}>
        <SectionRow label="Members" />
        {team.map((m) => (
          <div key={m.id} className={styles.memberRow}>
            <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
            <span className={styles.memberText}>
              <span className={styles.memberName}>{m.name}</span>
              <span className={styles.memberRole}>{m.isYou ? `${m.role} (you)` : m.role}</span>
            </span>
            <Checkbox isSelected={data.assignees.includes(m.id)} isDisabled={!editable} aria-label={`Assigned: ${m.name}`}
                      onChange={(on) => update?.({ assignees: on ? [...data.assignees, m.id] : data.assignees.filter((id) => id !== m.id) })} />
          </div>
        ))}
        <FieldError message={error} />
      </div>
    </>
  )
}

/** Shared frame for a log card (780:89150 / 780:90234): "Log n" · Auto Fill (editable) or Edit (read-only) · collapse chevron.
 *  The read-only scope is per log (user 2026-08-29: after Add Log only the new log is open; older logs stay read-only until their own Edit).
 *  Header controls sit outside the scope so they stay live while the body is disabled. */
function LogShell({
  index, collapsed, onToggle, readOnly, onAutoFill, onEdit, onDelete, children,
}: {
  index: number; collapsed: boolean; onToggle: () => void; readOnly: boolean
  onAutoFill: () => void; onEdit?: () => void
  /** Extra logs can be removed while open (user 2026-08-29); the last remaining log never offers it. */
  onDelete?: () => void
  children: ReactNode
}) {
  return (
    <div className={styles.logCard} data-collapsed={collapsed || undefined} data-readonly={readOnly || undefined}>
      <div className={styles.logHead}>
        <span className={styles.logTitle}>Log {index + 1}</span>
        {!collapsed && !readOnly ? (
          /* (REG-291) The Maison AI mark — the FAB's own sparkle, as the AI brief / sheet / Notes bar use.
             sparkle.svg, the mock's asset here, is a different four-pointed shape; Auto Fill is a Maison AI
             action, so it now carries the same mark everywhere it appears. */
          // eslint-disable-next-line @next/next/no-img-element
          <LinkButton leading={<img src="/figma-assets/brief-sparkle.svg" alt="" />} onClick={onAutoFill}>Auto Fill</LinkButton>
        ) : null}
        {!collapsed && readOnly && onEdit ? (
          <LinkButton icon="edit" onClick={onEdit}>Edit</LinkButton>
        ) : null}
        {!collapsed && !readOnly && onDelete ? (
          <Tooltip label="Delete log">
            <IconButton icon="delete" label={`Delete log ${index + 1}`} size={24} variant="bare" iconSize={24} iconWeight={300} onClick={onDelete} />
          </Tooltip>
        ) : null}
        <Tooltip label={collapsed ? 'Expand log' : 'Collapse log'}>
          <IconButton icon={collapsed ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} label={collapsed ? 'Expand log' : 'Collapse log'}
                      size={24} variant="bare" iconSize={24} onClick={onToggle} />
        </Tooltip>
      </div>
      {!collapsed ? (
        <ReadOnlyScope readOnly={readOnly}>
          <div className={styles.logBody}>{children}</div>
        </ReadOnlyScope>
      ) : null}
    </div>
  )
}

function LogCard({
  index, log, onChange, onAutoFill, onEdit, onDelete, readOnly, errors, today,
}: {
  index: number; log: ContactLog
  onChange: (patch: Partial<ContactLog>) => void
  onAutoFill: () => void
  onEdit?: () => void
  onDelete?: () => void
  readOnly: boolean
  errors: StageErrors
  today: Date
}) {
  const err = (f: string) => errors[`logs.${index}.${f}`]
  return (
    <LogShell index={index} collapsed={!!log.collapsed} onToggle={() => onChange({ collapsed: !log.collapsed })}
              readOnly={readOnly} onAutoFill={onAutoFill} onEdit={onEdit} onDelete={onDelete}>
      {/* (REG-320, user 2026-09-02) Where this log lives afterwards — only here, the Notes tab is already that place. */}
      <p className={fieldStyles.callout}>
        <Icon name="info" size={16} weight={300} />
        <span>This log is saved under Lead Details › Notes › Contact Log.</span>
      </p>
      <ChoiceChips label="Contacted via" required options={CONTACT_CHANNELS} value={log.channel}
                   onChange={(v) => onChange({ channel: v })} error={err('channel')} />
      <div className={styles.fieldPair}>
        <DateTimeField label="Date & Time" value={log.when} required today={today}
                       onChange={(v) => onChange({ when: v })} error={err('when')} />
        <TextField label="Outcome" required value={log.outcome} mode="select" options={OUTCOMES}
                   onChange={(v) => onChange({ outcome: v })} error={err('outcome')} />
      </div>
      {/* (REG-319 / REG-324, mock 781:58313) The optional schedule block — heading + helper (V g4), then the pair — appears
          once an outcome is chosen; the empty log (780:89150) offers no schedule yet. */}
      {log.outcome ? (
        <div className={styles.stack24}>
          <div className={fieldStyles.sectionHead}>
            <span className={fieldStyles.sectionLabel}>{SCHEDULE.heading}</span>
            <span className={fieldStyles.sectionHelper}>{SCHEDULE.helper}</span>
          </div>
          <div className={styles.fieldPair}>
            <DateTimeField label="Date & Time" value={log.nextStepWhen} today={today}
                           onChange={(v) => onChange({ nextStepWhen: v })} error={err('nextStepWhen')} />
            <TextField label="Preferred mode" value={log.nextStepMode} mode="select" options={[...CONTACT_MODES]}
                       onChange={(v) => onChange({ nextStepMode: v })} error={err('nextStepMode')} />
          </div>
        </div>
      ) : null}
      {/* (REG-324, 780:89150) Remarks comes before the rule; the Attach row is the log's last section. */}
      <div className={styles.stack12}>
        <span className={fieldStyles.sectionLabel}>Remarks (optional)</span>
        <NotesArea value={log.notes} onChange={(v) => onChange({ notes: v })} />
      </div>
      <Divider />
      <div className={styles.stack12}>
        {/* "Attach", not the mock's "Attach Files" (user 2026-09-04, REG-324). */}
        <SectionRow label="Attach screenshots of your call attempts"
                    action={<LinkButton icon="attach_file" onClick={() => onChange({ files: [...log.files, 'Q-101'] })}>Attach</LinkButton>} />
        {log.files.length ? (
          <div className={styles.tiles}>
            {log.files.map((f, i) => (
              <FileTile key={`${f}-${i}`} name={f}
                        onDelete={() => onChange({ files: log.files.filter((_, j) => j !== i) })} />
            ))}
          </div>
        ) : null}
        <FieldError message={err('files')} />
      </div>
    </LogShell>
  )
}

export function ContactedPanel({
  data, update, onAutoFill, onEditLog, onDeleteLog, lockedLog, errors, today,
}: {
  data: WizardData; update: (patch: Partial<WizardData>) => void
  /** Auto Fill fills the log whose button was pressed. */
  onAutoFill: (i: number) => void
  /** Per-log read-only (completed stage): which logs are locked, and how a log unlocks. */
  onEditLog?: (i: number) => void; lockedLog?: (i: number) => boolean
  onDeleteLog?: (i: number) => void
  errors: StageErrors; today: Date
}) {
  const setLog = (i: number, patch: Partial<ContactLog>) =>
    update({ logs: data.logs.map((l, j) => (j === i ? { ...l, ...patch } : l)) })
  return (
    <>
      {data.logs.map((log, i) => (
        <LogCard key={i} index={i} log={log} errors={errors} today={today}
                 readOnly={!!lockedLog?.(i)} onEdit={onEditLog ? () => onEditLog(i) : undefined}
                 onDelete={onDeleteLog && data.logs.length > 1 ? () => onDeleteLog(i) : undefined}
                 onChange={(p) => setLog(i, p)} onAutoFill={() => onAutoFill(i)} />
      ))}
    </>
  )
}

/** Met (780:90234, updated 2026-09-04): the same log list — Where · Date & Time / Remarks / rule / meeting documents (REG-325). */
function MeetingCard({
  index, log, onChange, onAutoFill, onEdit, onDelete, readOnly, errors, today,
}: {
  index: number; log: MeetingLog
  onChange: (patch: Partial<MeetingLog>) => void
  onAutoFill: () => void
  onEdit?: () => void
  onDelete?: () => void
  readOnly: boolean
  errors: StageErrors
  today: Date
}) {
  const err = (f: string) => errors[`meetings.${index}.${f}`]
  return (
    <LogShell index={index} collapsed={!!log.collapsed} onToggle={() => onChange({ collapsed: !log.collapsed })}
              readOnly={readOnly} onAutoFill={onAutoFill} onEdit={onEdit} onDelete={onDelete}>
      <div className={styles.fieldPair}>
        <TextField label="Where" required value={log.where} mode="select" options={['In person', 'Video call', 'Showroom']}
                   onChange={(v) => onChange({ where: v })} error={err('where')} />
        <DateTimeField label="Date & Time" value={log.when} required today={today}
                       onChange={(v) => onChange({ when: v })} error={err('when')} />
      </div>
      {/* (REG-325, 780:90234 updated) Remarks before the rule; the Attach row is the log's last section, its link "Attach". */}
      <div className={styles.stack12}>
        <span className={fieldStyles.sectionLabel}>Remarks (optional)</span>
        <NotesArea value={log.notes} onChange={(v) => onChange({ notes: v })} />
      </div>
      <Divider />
      <div className={styles.stack12}>
        <SectionRow label="Attach meeting documents"
                    action={<LinkButton icon="attach_file" onClick={() => onChange({ files: [...log.files, 'Q-101'] })}>Attach</LinkButton>} />
        {log.files.length ? (
          <div className={styles.tiles}>
            {log.files.map((f, i) => (
              <FileTile key={`${f}-${i}`} name={f} onDelete={() => onChange({ files: log.files.filter((_, j) => j !== i) })} />
            ))}
          </div>
        ) : null}
        <FieldError message={err('files')} />
      </div>
    </LogShell>
  )
}

export function MetPanel({
  data, update, onAutoFill, onEditLog, onDeleteLog, lockedLog, errors, today,
}: {
  data: WizardData; update: (patch: Partial<WizardData>) => void
  onAutoFill: (i: number) => void
  onEditLog?: (i: number) => void; lockedLog?: (i: number) => boolean
  onDeleteLog?: (i: number) => void
  errors: StageErrors; today: Date
}) {
  const setLog = (i: number, patch: Partial<MeetingLog>) =>
    update({ meetings: data.meetings.map((m, j) => (j === i ? { ...m, ...patch } : m)) })
  return (
    <>
      {data.meetings.map((m, i) => (
        <MeetingCard key={i} index={i} log={m} errors={errors} today={today}
                     readOnly={!!lockedLog?.(i)} onEdit={onEditLog ? () => onEditLog(i) : undefined}
                     onDelete={onDeleteLog && data.meetings.length > 1 ? () => onDeleteLog(i) : undefined}
                     onChange={(p) => setLog(i, p)} onAutoFill={() => onAutoFill(i)} />
      ))}
    </>
  )
}

/**
 * Simulated upload (780:91263): any picked file shows "Uploading..." for a beat, then the panel shows the
 * mock's file. The timer lives here so the state can't outlive the panel.
 */

/** One From System row (780:91468): the document's name, its meta line, and the amount a signed quote carries for the split. */
export type SystemRow = { id: string; name: string; meta: string[]; amountMinor?: number }

/* (REG-340) The From System lists read the lead's own records instead of the demo's fixed pair. The payload keeps
   storing the row's NAME (a quote's title, a contract's signed copy) — the shape every stage log already holds. */
/** Quote Sent (780:90472): quotes the studio has approved or sent out — "OM-10002 · S$58,000 · Approved on 26 Aug ’26". */
export function approvedQuoteRows(docs: StageDocuments): SystemRow[] {
  return docs.quotes
    .filter((q) => q.status === 'Approved' || q.status === 'Sent to Client')
    .map((q) => ({ id: q.id, name: q.title, amountMinor: q.amountMinor,
                   meta: [q.number, moneySGD(q.amountMinor), q.approvedAt ? `Approved on ${displayDate(new Date(q.approvedAt))}` : q.status] }))
}
/** Won (780:92744): the quotes the client signed. */
export function signedQuoteRows(docs: StageDocuments): SystemRow[] {
  return docs.quotes
    .filter((q) => q.status === 'Signed')
    .map((q) => ({ id: q.id, name: q.title, amountMinor: q.amountMinor,
                   meta: [q.number, moneySGD(q.amountMinor), q.signedAt ? `Signed on ${displayDate(new Date(q.signedAt))}` : q.status] }))
}
/** Won: contracts with a signed stamp, named by their signed copy (setContractStatus names it "<title>.pdf"). */
export function signedContractRows(docs: StageDocuments): SystemRow[] {
  return docs.contracts
    .filter((c) => c.status === 'Signed' && c.signedAt !== null)
    .map((c) => ({ id: c.id, name: c.signedCopy ?? `${c.title}.pdf`, meta: [`Signed on ${displayDate(new Date(c.signedAt!))}`] }))
}

/** (REG-340, 780:90472) From System with nothing to list: the sentence, then "Create Quote ›". Read-only hides the link like every other affordance. */
function SystemEmpty({ noun, onCreate }: { noun: 'quotes' | 'contracts'; onCreate?: () => void }) {
  const ro = useReadOnly()
  return (
    <div className={styles.systemEmpty}>
      <span>No system generated {noun}.</span>
      {onCreate && !ro ? (
        <button type="button" className={fieldStyles.link} onClick={onCreate}>
          {noun === 'quotes' ? 'Create Quote' : 'Create Contract'}
          <Icon name="chevron_right" size={20} />
        </button>
      ) : null}
    </div>
  )
}

export function AttachTabs({
  tab, onTab, selected, onSelect, uploaded, uploading, onUpload, onRemoveUpload, quotes, empty,
}: {
  tab: 'system' | 'upload'; onTab: (t: 'system' | 'upload') => void
  selected: string | null; onSelect: (name: string) => void
  uploaded: string | null; uploading?: boolean; onUpload: () => void; onRemoveUpload: () => void
  /** The lead's own rows; null while the window is still reading them (nothing is drawn — never a flash of the empty state). */
  quotes: SystemRow[] | null
  /** What From System shows once the rows are known to be none. */
  empty?: ReactNode
}) {
  const ro = useReadOnly()          // read-only stage: the uploaded file keeps its row but loses its delete (REG-126)
  const comingSoon = useComingSoon()
  return (
    <div className={styles.tabCard}>
      <div className={styles.tabBar} role="tablist">
        {(['system', 'upload'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={styles.tab} onClick={() => onTab(t)}>
            {t === 'system' ? 'From System' : 'Upload'}
            {tab === t ? <span className={styles.tabInk} /> : null}
          </button>
        ))}
      </div>
      <div className={styles.tabBody}>
        {tab === 'system' ? (
          quotes === null ? null : quotes.length === 0 ? empty : quotes.map((q) => (
            <button key={q.id} type="button" className={styles.quoteRow}
                    data-selected={selected === q.name || undefined}
                    onClick={() => onSelect(q.name)}>
              <span className={styles.quoteRadio}>
                <Icon name={selected === q.name ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} weight={300} fill />
              </span>
              <span className={styles.quoteText}>
                <span className={styles.quoteName}>{q.name}</span>
                <span className={styles.quoteMeta}>
                  {q.meta.map((m, i) => <span key={i}>{i > 0 ? '· ' : ''}{m}</span>)}
                </span>
              </span>
              {/* Inert in the prototype; stop the click so the row is not re-selected */}
              <LinkButton onClick={(e) => { e.stopPropagation(); comingSoon() }}>View</LinkButton>
            </button>
          ))
        ) : (
          <>
            {/* 780:91468: the drop target stays above the uploaded file, which reads as the selected row */}
            <Dropzone title={<>Drop your file or <b>browse</b></>} helper="Supports: PDF" accept=".pdf,application/pdf" uploading={uploading} onPick={onUpload} />
            {uploaded ? (
              <div className={styles.quoteRow} data-selected="true" data-file-row="true">
                <span className={styles.quoteRadio}>
                  <Icon name="radio_button_checked" size={20} weight={300} fill />
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.pdfBadge} src="/figma-assets/file-pdf.svg" alt="PDF" width={24} height={24} />
                <span className={`${styles.quoteName} ${styles.fileName}`}>{uploaded}</span>
                {ro ? null : (
                  <Tooltip label="Remove file">
                    <IconButton icon="delete" label="Remove file" size={24} variant="bare" iconSize={20} iconWeight={300} onClick={onRemoveUpload} />
                  </Tooltip>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export function QuoteSentPanel({
  data, update, errors, docs, onCreateQuote,
}: { data: WizardData; update: (patch: Partial<WizardData>) => void; errors: StageErrors
  /** (REG-340) The lead's quotes, read when the window opened; null until they land. */
  docs: StageDocuments | null
  /** The empty state's "Create Quote ›" — the lead's Quotes tab with a fresh draft. */
  onCreateQuote: () => void }) {
  // Attach rows (mock: dead buttons) — local tiles like the other stages; not persisted, no validation key.
  const [meetingFiles, setMeetingFiles] = useState<string[]>([])
  const [renderFiles, setRenderFiles] = useState<string[]>([])
  const quotes = docs ? approvedQuoteRows(docs) : null
  const upload = useUploadSim()
  const [justUploaded, setJustUploaded] = useState(false)   // focus Quote amount once the file lands (user 2026-08-29)
  return (
    <>
      <div className={styles.stack12}>
        <SectionRow label="Attach approved quote" />
        <AttachTabs
          tab={data.quoteTab} onTab={(t) => update({ quoteTab: t })}
          selected={data.quoteSelected} onSelect={(n) => update({ quoteSelected: n })}
          uploaded={data.quoteUploaded} uploading={upload.uploading}
          onUpload={() => upload.start(() => { update({ quoteUploaded: SYSTEM_QUOTE }); setJustUploaded(true) })}   // 780:91468: the mock's file, whatever was picked
          onRemoveUpload={() => update({ quoteUploaded: null })}
          quotes={quotes} empty={<SystemEmpty noun="quotes" onCreate={onCreateQuote} />}
        />
        <FieldError message={errors.quote} />
      </div>
      {/* Upload flow only — a system quote already knows its amount */}
      {data.quoteTab === 'upload' && data.quoteUploaded ? (
        <TextField label="Quote amount (S$)" value={data.quoteAmount} placeholder="70,500" numeric="amount" autoFocus={justUploaded}
                   onChange={(v) => update({ quoteAmount: v })} error={errors.quoteAmount} />
      ) : null}
      <Divider />
      <div className={styles.stack12}>
        <SectionRow label="Attach meeting documents"
                    action={<LinkButton icon="attach_file" onClick={() => setMeetingFiles((f) => [...f, 'Q-101'])}>Attach</LinkButton>} />
        {meetingFiles.length ? (
          <div className={styles.tiles}>
            {meetingFiles.map((f, i) => (
              <FileTile key={`${f}-${i}`} name={f} onDelete={() => setMeetingFiles((fs) => fs.filter((_, j) => j !== i))} />
            ))}
          </div>
        ) : null}
      </div>
      <Divider />
      <div className={styles.stack12}>
        <SectionRow label="Attach render (optional)"
                    action={<LinkButton icon="attach_file" onClick={() => setRenderFiles((f) => [...f, 'Q-101'])}>Attach</LinkButton>} />
        {renderFiles.length ? (
          <div className={styles.tiles}>
            {renderFiles.map((f, i) => (
              <FileTile key={`${f}-${i}`} name={f} onDelete={() => setRenderFiles((fs) => fs.filter((_, j) => j !== i))} />
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}

/** The signed contract is named after the client: the mock's "Contract_OliviaM_signed.pdf" (780:92744) is the lead it
 *  was drawn for, Olivia Martinez — so the file name spells out *this* lead instead of hers on all 36. Falls back to
 *  the mock's own name for a lead with no usable name. */
function signedContractName(leadName: string): string {
  const words = leadName.split(/\s+/).map((w) => w.replace(/[^A-Za-z]/g, '')).filter(Boolean)
  const first = words[0] ?? ''
  const lastInitial = words.length > 1 ? (words[words.length - 1] ?? '').slice(0, 1) : ''
  return first ? `Contract_${first}${lastInitial}_signed.pdf` : SYSTEM_CONTRACT
}

export function WonPanel({
  data, update, errors, leadBudgetMinor, leadName, docs, onCreateQuote, onCreateContract,
}: { data: WizardData; update: (patch: Partial<WizardData>) => void; errors: StageErrors; leadBudgetMinor: number; leadName: string
  /** (REG-340) The lead's quotes and contracts, read when the window opened; null until they land. */
  docs: StageDocuments | null
  onCreateQuote: () => void; onCreateContract: () => void }) {
  const quotes = docs ? signedQuoteRows(docs) : null
  const contracts = docs ? signedContractRows(docs) : null
  // The upload flow's file keeps the mock's convention: a signed contract named for this lead (780:92744).
  const contractName = signedContractName(leadName)
  const quoteUpload = useUploadSim()
  const contractUpload = useUploadSim()
  const [justUploaded, setJustUploaded] = useState(false)
  const uploadedQuote = data.wonQuoteTab === 'upload'
  // The split is computed on the signed quote's amount: the selected system quote's own total, or the amount typed for an
  // upload (780:92744 total). The lead's budget stands in only until the quotes have loaded.
  const basisMinor = uploadedQuote ? amountMinor(data.wonQuoteAmount)
    : quotes?.find((q) => q.name === data.wonQuote)?.amountMinor ?? leadBudgetMinor
  const totalPct = data.milestones.reduce((s, m) => s + (m.pct || 0), 0)
  const setPct = (i: number, pct: number) =>
    update({ milestones: data.milestones.map((m, j) => (j === i ? { ...m, pct } : m)) })
  return (
    <>
      <div className={styles.stack12}>
        <SectionRow label="Attach client signed quote" />
        {/* The split follows the signed quote's source (user 2026-08-29): a system quote carries the recorded
            10/30/30/30; an uploaded one carries nothing we can trust, so every milestone drops to 0%. */}
        <AttachTabs
          tab={data.wonQuoteTab}
          onTab={(t) => update({ wonQuoteTab: t, milestones: t === 'system' ? defaultMilestones() : data.wonQuoteUploaded ? zeroMilestones() : data.milestones })}
          selected={data.wonQuote} onSelect={(n) => update({ wonQuote: n, milestones: defaultMilestones() })}
          uploaded={data.wonQuoteUploaded} uploading={quoteUpload.uploading}
          onUpload={() => quoteUpload.start(() => { update({ wonQuoteUploaded: SYSTEM_QUOTE, milestones: zeroMilestones() }); setJustUploaded(true) })}
          onRemoveUpload={() => update({ wonQuoteUploaded: null, wonQuoteAmount: '', milestones: defaultMilestones() })}
          quotes={quotes} empty={<SystemEmpty noun="quotes" onCreate={onCreateQuote} />}
        />
        <FieldError message={errors.wonQuote} />
      </div>
      {uploadedQuote && data.wonQuoteUploaded ? (
        <TextField label="Quote amount (S$)" value={data.wonQuoteAmount} placeholder="70,500" numeric="amount" autoFocus={justUploaded}
                   onChange={(v) => update({ wonQuoteAmount: v })} error={errors.wonQuoteAmount} />
      ) : null}
      <Divider />
      <div className={styles.stack12}>
        <SectionRow label="Attach client signed contract" />
        <AttachTabs
          tab={data.wonContractTab} onTab={(t) => update({ wonContractTab: t })}
          selected={data.wonContract} onSelect={(n) => update({ wonContract: n })}
          uploaded={data.wonContractUploaded} uploading={contractUpload.uploading}
          onUpload={() => contractUpload.start(() => update({ wonContractUploaded: contractName }))}
          onRemoveUpload={() => update({ wonContractUploaded: null })}
          quotes={contracts} empty={<SystemEmpty noun="contracts" onCreate={onCreateContract} />}
        />
        <FieldError message={errors.wonContract} />
      </div>
      <Divider />
      <div className={styles.stack12}>
        {/* 780:92850 / 92852: "Payment milestone" · Reset to default · the DS green outlined Tag with the split's total */}
        <SectionRow label="Payment milestone"
                    action={
                      <span className={fieldStyles.rowActions}>
                        <LinkButton onClick={() => update({ milestones: defaultMilestones() })}>Reset to default</LinkButton>
                        <Tag color="green" appearance="outlined">{`${totalPct}%`}</Tag>
                      </span>
                    } />
        <div className={styles.msCard}>
          {data.milestones.map((m, i) => {
            const amtMinor = Math.round((basisMinor * (m.pct || 0)) / 100)
            return (
              <div key={m.name} className={styles.msRow}>
                <span className={styles.msIndex}>{i + 1}</span>
                <span className={styles.msText}>
                  <span className={styles.msName}>{m.name}</span>
                  <span className={styles.msMeta}>{m.meta}</span>
                </span>
                <span className={styles.msPct} data-error={errors.milestones ? '' : undefined}>
                  <input value={String(m.pct)} inputMode="numeric" aria-label={`${m.name} percentage`} aria-invalid={errors.milestones ? true : undefined}
                         onChange={(e) => setPct(i, Math.max(0, Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0)))} />
                  <span>%</span>
                </span>
                <span className={styles.msAmt}>{moneySGD(amtMinor)}</span>
              </div>
            )
          })}
          <div className={`${styles.msRow} ${styles.msTotal}`}>
            <span className={styles.msIndex} />
            <span className={styles.msTotalLabel}>Total</span>
            <span className={styles.msAmt}>{moneySGD(basisMinor)}</span>
          </div>
        </div>
        <FieldError message={errors.milestones} />
      </div>
      <Divider />
      <TextField label="Project type" value={data.projectType} mode="select"
                 options={['Whole-home renovation', 'Partial renovation', 'Commercial fit-out']}
                 onChange={(v) => update({ projectType: v })} error={errors.projectType} />
    </>
  )
}
