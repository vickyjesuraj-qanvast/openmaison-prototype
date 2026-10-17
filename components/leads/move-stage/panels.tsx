'use client'

import { useState, type ReactNode } from 'react'
import { Checkbox, Tag } from '@/components/ds'
import { ReadOnlyScope, useReadOnly } from '@/components/om/read-only'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Avatar } from '@/components/om/avatar'
import { CONTACT_CHANNELS, CONTACT_MODES, OUTCOMES, SCHEDULE } from '@/lib/leads/enums'
import { displayDate, moneySGD } from '@/lib/format'
import type { StageDocuments } from '@/app/leads/quotes-actions'
import type { LeadFile, Member } from '@/lib/db/schema'
import { AutoFillNote, ChoiceChips, DateTimeField, Divider, FieldError, FileTile, LinkButton, NotesArea, SectionRow, Dropzone, TextField, useUploadSim } from './fields'
import { amountMinor, attachLabel, defaultMilestones, SYSTEM_CONTRACT, zeroMilestones } from '@/lib/leads/stage-data'
import type { ContactLog, MeetingLog, StageErrors, WizardData } from './types'
import styles from './wizard.module.css'
import fieldStyles from './fields.module.css'
import { pickable } from '@/lib/leads/assign-policy'
import { isPdfRefusal, readPickedPdf } from '@/components/contracts/read-pdf'
import { NOT_A_PDF } from '@/lib/contracts/pdf'

/** (pending modules S05) A quote's PDF refusal in a quote's words — the contracts' says a contract is kept as one. */
const quotePdfError = (e: string) => (e === NOT_A_PDF ? 'Choose a PDF — the quote is kept as one' : e)

// OUTCOMES / SCHEDULE / CONTACT_MODES live in lib/leads/enums.ts — shared with the Notes tab (REG-186, REG-319).

/** (pending modules S05 — REG-149's 'Q-101' stand-in retired) The lead's files a step attaches, looked up by id — their picture and kind. */
export type FileOf = (id: string) => LeadFile | undefined
/** A step's attached files as tiles: each name with its own file's picture and kind where the step keeps its id; an older log's bare name
    keeps the mock's picture. Removing one takes its name and its id together. */
function AttachedTiles({ names, ids, fileOf, onRemove }: { names: string[]; ids?: string[]; fileOf?: FileOf; onRemove: (j: number) => void }) {
  if (!names.length) return null
  return (
    <div className={styles.tiles}>
      {names.map((n, j) => {
        const f = ids?.[j] ? fileOf?.(ids[j]!) : undefined
        return <FileTile key={`${ids?.[j] ?? n}-${j}`} name={f?.name ?? n} kind={f ? (f.kind === 'pdf' ? 'pdf' : f.kind === 'image' ? 'image' : 'doc') : undefined} thumb={f ? f.thumb ?? null : undefined} onDelete={() => onRemove(j)} />
      })}
    </div>
  )
}
const dropAt = <T,>(xs: T[] | undefined, j: number): T[] | undefined => (xs ? xs.filter((_, k) => k !== j) : xs)

/** New = who the lead is assigned to. Read-only inside the stage move (user 2026-08-29): assignment happens from the listing. */
export function NewPanel({
  team, data, update, editable = false, error, assignable = null,
}: { team: Member[]; data: WizardData; update?: (patch: Partial<WizardData>) => void
  /** (REG-334) True while the lead is still in New: the checkboxes assign; otherwise they only show. */
  editable?: boolean
  /** (REG-601) The members this viewer may assign — null = everyone; a row outside it only shows. */
  assignable?: string[] | null
  /** validateStage's `assignees` message after a Save with nobody ticked. */
  error?: string }) {
  return (
    <>
      <p className={styles.panelTitle}>New</p>
      <div className={styles.stack12}>
        <SectionRow label="Members" />
        {pickable(team, data.assignees).map((m) => (   /* (REG-646) active members, and any already ticked */
          <div key={m.id} className={styles.memberRow}>
            <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
            <span className={styles.memberText}>
              <span className={styles.memberName}>{m.name}</span>
              <span className={styles.memberRole}>{m.isYou ? `${m.role} (you)` : m.role}</span>
            </span>
            <Checkbox isSelected={data.assignees.includes(m.id)} isDisabled={!editable || (assignable !== null && !assignable.includes(m.id))} aria-label={`Assigned: ${m.name}`}
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
  index, collapsed, onToggle, readOnly, onAutoFill, onEdit, onDelete, note = null, children,
}: {
  index: number; collapsed: boolean; onToggle: () => void; readOnly: boolean
  onAutoFill: () => void; onEdit?: () => void
  /** (S43B · F1-01) what Auto Fill read for this log — said at the top of its body */
  note?: string | null
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
          <div className={styles.logBody}>{note && !readOnly ? <AutoFillNote text={note} /> : null}{children}</div>
        </ReadOnlyScope>
      ) : null}
    </div>
  )
}

function LogCard({
  index, log, onChange, onAutoFill, onEdit, onDelete, readOnly, errors, today, askNextStep = false, onAttach, fileOf, note = null,
}: {
  /** (S43B · F1-01) what Auto Fill read for this log */
  note?: string | null
  /** (pending modules S05) Attach opens the lead's files (the house Attach files modal); the tiles are the files themselves */
  onAttach?: () => void
  fileOf?: FileOf
  /** (pending modules S05) the studio asks for the next call or meeting (Settings › Lead management › Lead stages) */
  askNextStep?: boolean
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
              readOnly={readOnly} onAutoFill={onAutoFill} onEdit={onEdit} onDelete={onDelete} note={note}>
      {/* (REG-320, user 2026-09-02) Where this log lives afterwards — only here, the Notes tab is already that place. */}
      <p className={fieldStyles.callout}>
        <Icon name="info" size={16} weight={300} />
        <span>This log is saved under Lead Details › Notes & Logs › Contact Log.</span>
      </p>
      <ChoiceChips label="Contacted via" required options={CONTACT_CHANNELS} value={log.channel}
                   onChange={(v) => onChange({ channel: v })} error={err('channel')} />
      <div className={styles.fieldPair}>
        {/* (UX audit 2026-09-30, L9) a day picked without a time takes the time it is now, never a silent 10:00 AM */}
        <DateTimeField label="Date & Time" value={log.when} required today={today} defaultNow
                       onChange={(v) => onChange({ when: v })} error={err('when')} />
        <TextField label="Outcome" required value={log.outcome} mode="select" options={OUTCOMES}
                   onChange={(v) => onChange({ outcome: v })} error={err('outcome')} />
      </div>
      {/* (REG-319 / REG-324, mock 781:58313) The optional schedule block — heading + helper (V g4), then the pair — appears
          once an outcome is chosen; the empty log (780:89150) offers no schedule yet. */}
      {log.outcome ? (
        <div className={styles.stack24}>
          <div className={fieldStyles.sectionHead}>
            {/* (pending modules S05) asked for by the studio (never once the client said they're not interested): its heading loses "(optional)" */}
            <span className={fieldStyles.sectionLabel}>{askNextStep && log.outcome !== 'Not interested' ? SCHEDULE.heading.replace(/\s*\(optional\)$/, '') : SCHEDULE.heading}</span>
            <span className={fieldStyles.sectionHelper}>{askNextStep && log.outcome !== 'Not interested' ? 'Your studio asks for the next call or meeting — a task will remind you.' : SCHEDULE.helper}</span>
          </div>
          <div className={styles.fieldPair}>
            <DateTimeField label="Date & Time" value={log.nextStepWhen} today={today} required={askNextStep && log.outcome !== 'Not interested'}
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
        {/* "Attach", not the mock's "Attach Files" (user 2026-09-04, REG-324). (UX audit 2026-09-30, L2 · T3) The row is mandatory,
            so it carries the required mark, and it names what proves this contact — photos from a visit, screenshots of a call or a message. */}
        <SectionRow label={attachLabel(log.channel)} required
                    action={<LinkButton icon="attach_file" onClick={() => onAttach?.()}>Attach</LinkButton>} />
        <AttachedTiles names={log.files} ids={log.fileIds} fileOf={fileOf} onRemove={(j) => onChange({ files: dropAt(log.files, j) ?? [], fileIds: dropAt(log.fileIds, j) })} />
        <FieldError message={err('files')} />
      </div>
    </LogShell>
  )
}

export function ContactedPanel({
  data, update, onAutoFill, onEditLog, onDeleteLog, lockedLog, errors, today, askNextStep = false, onAttach, fileOf, fillNote,
}: {
  /** (S43B · F1-01) what Auto Fill read for log `i` */
  fillNote?: (i: number) => string | null
  /** (pending modules S05) a log's Attach — the window opens the lead's files for log `i` */
  onAttach?: (i: number) => void
  fileOf?: FileOf
  /** (pending modules S05) the studio asks for the next call or meeting */
  askNextStep?: boolean
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
        <LogCard key={i} index={i} log={log} errors={errors} today={today} askNextStep={askNextStep && !lockedLog?.(i)} onAttach={onAttach ? () => onAttach(i) : undefined} fileOf={fileOf} note={fillNote?.(i) ?? null}
                 readOnly={!!lockedLog?.(i)} onEdit={onEditLog ? () => onEditLog(i) : undefined}
                 onDelete={onDeleteLog && data.logs.length > 1 ? () => onDeleteLog(i) : undefined}
                 onChange={(p) => setLog(i, p)} onAutoFill={() => onAutoFill(i)} />
      ))}
    </>
  )
}

/** Met (780:90234, updated 2026-09-04): the same log list — Where · Date & Time / Remarks / rule / meeting documents (REG-325). */
function MeetingCard({
  index, log, onChange, onAutoFill, onEdit, onDelete, readOnly, errors, today, onAttach, fileOf, note = null,
}: {
  /** (S43B · F1-01) what Auto Fill read for this log */
  note?: string | null
  onAttach?: () => void
  fileOf?: FileOf
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
              readOnly={readOnly} onAutoFill={onAutoFill} onEdit={onEdit} onDelete={onDelete} note={note}>
      <div className={styles.fieldPair}>
        <TextField label="Where" required value={log.where} mode="select" options={['In person', 'Video call', 'Showroom']}
                   onChange={(v) => onChange({ where: v })} error={err('where')} />
        <DateTimeField label="Date & Time" value={log.when} required today={today} defaultNow   /* (UX audit 2026-09-30, L9) */
                       onChange={(v) => onChange({ when: v })} error={err('when')} />
      </div>
      {/* (REG-325, 780:90234 updated) Remarks before the rule; the Attach row is the log's last section, its link "Attach". */}
      <div className={styles.stack12}>
        <span className={fieldStyles.sectionLabel}>Remarks (optional)</span>
        <NotesArea value={log.notes} onChange={(v) => onChange({ notes: v })} />
      </div>
      <Divider />
      <div className={styles.stack12}>
        <SectionRow label="Attach meeting documents (optional)"   /* (REG-543) no longer required */
                    action={<LinkButton icon="attach_file" onClick={() => onAttach?.()}>Attach</LinkButton>} />
        <AttachedTiles names={log.files} ids={log.fileIds} fileOf={fileOf} onRemove={(j) => onChange({ files: dropAt(log.files, j) ?? [], fileIds: dropAt(log.fileIds, j) })} />
        <FieldError message={err('files')} />
      </div>
    </LogShell>
  )
}

export function MetPanel({
  data, update, onAutoFill, onEditLog, onDeleteLog, lockedLog, errors, today, onAttach, fileOf, fillNote,
}: {
  /** (S43B · F1-01) what Auto Fill read for meeting log `i` */
  fillNote?: (i: number) => string | null
  onAttach?: (i: number) => void
  fileOf?: FileOf
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
        <MeetingCard key={i} index={i} log={m} errors={errors} today={today} onAttach={onAttach ? () => onAttach(i) : undefined} fileOf={fileOf} note={fillNote?.(i) ?? null}
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

/** One From System row (780:91468): the document's name, its meta line, and the amount a signed quote carries for the split.
    `hold` (UX audit 2026-09-30, Q1): why this quote can't go to the client with the move yet — the step says so when it is picked. */
export type SystemRow = { id: string; name: string; meta: string[]; amountMinor?: number; hold?: string | null }

/** (UX audit 2026-09-30, Q1) The studio's quote-approval rule as the Quote Sent step reads it (`fetchQuoteSendRule`). */
export type SendRule = { approvalRequired: boolean; approver: boolean }
const OUT = ['Approved', 'Sent to Client', 'Confirmed']
/** Why a quote picked for Quote Sent can't be marked sent to the client — REG-624's approval, respected: a Draft goes where the studio
    needs no approval or the mover's own send approves; one waiting for (or needing) approval goes once it is approved. */
export function quoteHold(q: { status: string; number: string }, rule: SendRule): string | null {
  if (OUT.includes(q.status)) return null
  if (q.status === 'Draft' && (!rule.approvalRequired || rule.approver)) return null
  return `${q.number} isn’t approved yet — a quote goes to the client once it’s approved`
}

/* (REG-340) The From System lists read the lead's own records instead of the demo's fixed pair. The payload keeps
   storing the row's NAME (a quote's title, a contract's signed copy) — the shape every stage log already holds. */
/** Quote Sent (780:90472): quotes the studio has approved or sent out — "OM-10002 · S$58,000 · Approved on 26 Aug ’26". */
/* (UX audit 2026-09-30, Q1) With the studio's rule known, its Drafts and the quotes awaiting approval list too — the move sends a Draft
   that may go (the move is the send) and names the approval one still needs (`hold`), where the step used to say "No system generated
   quotes" beside a quote the lead has. */
export function approvedQuoteRows(docs: StageDocuments, rule: SendRule | null = null): SystemRow[] {
  return docs.quotes
    .filter((q) => OUT.includes(q.status) || (rule !== null && (q.status === 'Draft' || q.status === 'Sent for Approval')))   // (REG-587)
    .map((q) => ({ id: q.id, name: q.title, amountMinor: q.amountMinor, hold: rule ? quoteHold(q, rule) : null,
                   meta: [q.number, moneySGD(q.amountMinor), q.approvedAt ? `Approved on ${displayDate(new Date(q.approvedAt))}` : q.status] }))
}
/** Won (780:92744): the quotes the client signed. */
export function signedQuoteRows(docs: StageDocuments): SystemRow[] {
  return docs.quotes
    .filter((q) => q.status === 'Signed')
    .map((q) => ({ id: q.id, name: q.title, amountMinor: q.amountMinor,
                   meta: [q.number, moneySGD(q.amountMinor), q.signedAt ? `Signed on ${displayDate(new Date(q.signedAt))}` : q.status] }))
}
/** (fix-A, A-15) Won's list: the signed quotes, then the ones out with the client and not signed yet — each saying so when picked (`hold`),
    as Quote Sent names the approval a quote still needs (UX audit Q1), where the step used to say "No system generated quotes". */
export function wonQuoteRows(docs: StageDocuments): SystemRow[] {
  const out = docs.quotes.filter((q) => OUT.includes(q.status))
    .map((q) => ({ id: q.id, name: q.title, amountMinor: q.amountMinor, hold: `${q.number} isn’t signed yet — mark it signed on the quote, or upload the signed copy`,
                   meta: [q.number, moneySGD(q.amountMinor), q.status] }))
  return [...signedQuoteRows(docs), ...out]
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
  tab, onTab, selected, selectedId = null, onSelect, uploaded, uploading, onUpload, onRemoveUpload, quotes, empty, viewHref,
}: {
  /** (pending modules S05 — the card's "Move stage › From System quote 'View' (1.0 opened the quote)") where a row's View opens it: the
      quote's or the contract's Preview, in a new tab, so the step and what was typed in it stay as they are */
  viewHref?: (row: SystemRow) => string
  tab: 'system' | 'upload'; onTab: (t: 'system' | 'upload') => void
  selected: string | null; onSelect: (name: string, id: string) => void
  /** (UX audit 2026-09-30, Q1) The picked row's id, where the step keeps one — two quotes may share a title. */
  selectedId?: string | null
  uploaded: string | null; uploading?: boolean; /** (pending modules S03) the picked file, when the step keeps it */ onUpload: (file?: File) => void; onRemoveUpload: () => void
  /** The lead's own rows; null while the window is still reading them (nothing is drawn — never a flash of the empty state). */
  quotes: SystemRow[] | null
  /** What From System shows once the rows are known to be none. */
  empty?: ReactNode
}) {
  const ro = useReadOnly()          // read-only stage: the uploaded file keeps its row but loses its delete (REG-126)
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
          quotes === null ? null : quotes.length === 0 ? empty : quotes.map((q) => {
            const on = selectedId ? selectedId === q.id : selected === q.name
            return (
            <button key={q.id} type="button" className={styles.quoteRow}
                    data-selected={on || undefined}
                    onClick={() => onSelect(q.name, q.id)}>
              <span className={styles.quoteRadio}>
                <Icon name={on ? 'radio_button_checked' : 'radio_button_unchecked'} size={20} weight={300} fill />
              </span>
              <span className={styles.quoteText}>
                <span className={styles.quoteName}>{q.name}</span>
                <span className={styles.quoteMeta}>
                  {q.meta.map((m, i) => <span key={i}>{i > 0 ? '· ' : ''}{m}</span>)}
                </span>
              </span>
              {/* (pending modules S05) the document itself, in a new tab — stop the click so the row is not re-selected */}
              {viewHref ? <LinkButton ariaLabel={`View ${q.meta[0] ?? q.name} in a new tab`} onClick={(e) => { e.stopPropagation(); window.open(viewHref(q), '_blank', 'noopener') }}>View</LinkButton> : null}
            </button>
            )
          })
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
  data, update, errors, docs, onCreateQuote, rule = null, onAttach, fileOf,
}: { data: WizardData; update: (patch: Partial<WizardData>) => void; errors: StageErrors
  /** (pending modules S05) the step's meeting documents and render: the lead's files, kept with the step */
  onAttach?: (what: 'meeting' | 'render') => void
  fileOf?: FileOf
  /** (REG-340) The lead's quotes, read when the window opened; null until they land. */
  docs: StageDocuments | null
  /** (UX audit 2026-09-30, Q1) The studio's approval rule — lists the quotes the move may send and names the one it can't. */
  rule?: SendRule | null
  /** The empty state's "Create Quote ›" — the lead's Quotes tab with a fresh draft. */
  onCreateQuote: () => void }) {
  /* (pending modules S05) Attach rows: the lead's own files, kept with the step (they were local tiles the step never kept); no validation key */
  const meetingIds = data.quoteMeetingFiles ?? [], renderIds = data.quoteRenderFiles ?? []
  const namesOf = (ids: string[]) => ids.map((id) => fileOf?.(id)?.name ?? 'File')
  const quotes = docs ? approvedQuoteRows(docs, rule) : null
  const upload = useUploadSim()
  const [justUploaded, setJustUploaded] = useState(false)   // focus Quote amount once the file lands (user 2026-08-29)
  /* (pending modules S05 — REG-149's stand-in retired: "every other upload keeps its bytes since gaps build E") the picked PDF itself — its
     own name on the row, its bytes kept in Files › Quotes & BOQ when the step saves; a file that isn't a PDF, or is over 8 MB, is refused
     under the box */
  const [pickError, setPickError] = useState<string | null>(null)
  const pickQuote = (f?: File) => {
    setPickError(null)
    if (!f) return
    const read = readPickedPdf(f)
    upload.start(() => { void read.then((r) => { if (isPdfRefusal(r)) { setPickError(quotePdfError(r.error)); return } update({ quoteUploaded: r.name, quoteFile: r }); setJustUploaded(true) }) })
  }
  /* (UX audit 2026-09-30, Q1) The picked quote's approval, said as soon as it is picked — Save refuses it with the same line. */
  const picked = data.quoteTab === 'system' ? quotes?.find((q) => (data.quoteSelectedId ? q.id === data.quoteSelectedId : q.name === data.quoteSelected)) : undefined
  return (
    <>
      <div className={styles.stack12}>
        <SectionRow label="Attach approved quote" />
        <AttachTabs
          tab={data.quoteTab} onTab={(t) => update({ quoteTab: t })}
          selected={data.quoteSelected} selectedId={data.quoteSelectedId ?? null} onSelect={(n, id) => update({ quoteSelected: n, quoteSelectedId: id })}
          uploaded={data.quoteUploaded} uploading={upload.uploading}
          onUpload={pickQuote}   // (pending modules S05) the picked file itself (780:91468 drew the mock's)
          onRemoveUpload={() => { setPickError(null); update({ quoteUploaded: null, quoteFile: null }) }}
          quotes={quotes} empty={<SystemEmpty noun="quotes" onCreate={onCreateQuote} />}
          viewHref={(q) => `/quotes/${q.id}/preview`}   /* (pending modules S05) */
        />
        <FieldError message={pickError ?? errors.quote ?? picked?.hold ?? undefined} />
      </div>
      {/* Upload flow only — a system quote already knows its amount */}
      {data.quoteTab === 'upload' && data.quoteUploaded ? (
        <TextField label="Quote amount (S$)" value={data.quoteAmount} placeholder="70,500" numeric="amount" autoFocus={justUploaded}
                   onChange={(v) => update({ quoteAmount: v })} error={errors.quoteAmount} />
      ) : null}
      <Divider />
      <div className={styles.stack12}>
        <SectionRow label="Attach meeting documents (optional)"   /* (REG-543) no longer required */
                    action={<LinkButton icon="attach_file" onClick={() => onAttach?.('meeting')}>Attach</LinkButton>} />
        <AttachedTiles names={namesOf(meetingIds)} ids={meetingIds} fileOf={fileOf} onRemove={(j) => update({ quoteMeetingFiles: dropAt(meetingIds, j) })} />
      </div>
      <Divider />
      <div className={styles.stack12}>
        <SectionRow label="Attach render (optional)"
                    action={<LinkButton icon="attach_file" onClick={() => onAttach?.('render')}>Attach</LinkButton>} />
        <AttachedTiles names={namesOf(renderIds)} ids={renderIds} fileOf={fileOf} onRemove={(j) => update({ quoteRenderFiles: dropAt(renderIds, j) })} />
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
  data, update, errors, leadBudgetMinor, leadName, docs, onCreateQuote, onCreateContract, contractOptional = false,
}: { data: WizardData; update: (patch: Partial<WizardData>) => void; errors: StageErrors; leadBudgetMinor: number; leadName: string
  /** (pending modules S05) the studio wins a lead on its signed quote alone (Settings › Lead management › Lead stages) */
  contractOptional?: boolean
  /** (REG-340) The lead's quotes and contracts, read when the window opened; null until they land. */
  docs: StageDocuments | null
  onCreateQuote: () => void; onCreateContract: () => void }) {
  const quotes = docs ? wonQuoteRows(docs) : null   // (fix-A, A-15) the signed ones, then the ones not signed yet — saying so
  const contracts = docs ? signedContractRows(docs) : null
  const pickedQuote = data.wonQuoteTab === 'system' ? quotes?.find((q) => q.name === data.wonQuote) ?? null : null
  // The upload flow's file keeps the mock's convention: a signed contract named for this lead (780:92744).
  const contractName = signedContractName(leadName)
  const quoteUpload = useUploadSim()
  const contractUpload = useUploadSim()
  /* (pending modules S03) the signed contract's PDF itself is kept with the contract the step makes — read while the upload runs; a file that
     isn't a PDF, or is over 8 MB, is refused under the box */
  const [contractPickError, setContractPickError] = useState<string | null>(null)
  const pickContract = (f?: File) => {
    setContractPickError(null)
    if (!f) return   // (S43E, F3-02 W2-01) no file, no contract — the mock's simulated upload of a named file is gone, as the signed quote's
    const read = readPickedPdf(f)
    contractUpload.start(() => { void read.then((r) => { if (isPdfRefusal(r)) { setContractPickError(r.error); return } update({ wonContractUploaded: contractName, wonContractFile: { ...r, name: contractName } }) }) })
  }
  const [justUploaded, setJustUploaded] = useState(false)
  /* (pending modules S05) the signed quote's PDF itself — its own name on the row, kept with its bytes in the lead's Files with the project */
  const [quotePickError, setQuotePickError] = useState<string | null>(null)
  const pickSignedQuote = (f?: File) => {
    setQuotePickError(null)
    if (!f) return
    const read = readPickedPdf(f)
    quoteUpload.start(() => { void read.then((r) => { if (isPdfRefusal(r)) { setQuotePickError(quotePdfError(r.error)); return } update({ wonQuoteUploaded: r.name, wonQuoteFile: r, milestones: zeroMilestones() }); setJustUploaded(true) }) })
  }
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
          onUpload={pickSignedQuote}   // (pending modules S05) the picked file itself
          onRemoveUpload={() => { setQuotePickError(null); update({ wonQuoteUploaded: null, wonQuoteFile: null, wonQuoteAmount: '', milestones: defaultMilestones() }) }}
          quotes={quotes} empty={<SystemEmpty noun="quotes" onCreate={onCreateQuote} />}
          viewHref={(q) => `/quotes/${q.id}/preview`}   /* (pending modules S05) */
        />
        <FieldError message={quotePickError ?? errors.wonQuote ?? pickedQuote?.hold ?? undefined} />
      </div>
      {uploadedQuote && data.wonQuoteUploaded ? (
        <TextField label="Quote amount (S$)" value={data.wonQuoteAmount} placeholder="70,500" numeric="amount" autoFocus={justUploaded}
                   onChange={(v) => update({ wonQuoteAmount: v })} error={errors.wonQuoteAmount} />
      ) : null}
      <Divider />
      <div className={styles.stack12}>
        <SectionRow label={contractOptional ? 'Attach client signed contract (optional)' : 'Attach client signed contract'} />
        <AttachTabs
          tab={data.wonContractTab} onTab={(t) => update({ wonContractTab: t })}
          selected={data.wonContract} onSelect={(n) => update({ wonContract: n })}
          uploaded={data.wonContractUploaded} uploading={contractUpload.uploading}
          onUpload={pickContract}
          onRemoveUpload={() => { setContractPickError(null); update({ wonContractUploaded: null, wonContractFile: null }) }}
          quotes={contracts} empty={<SystemEmpty noun="contracts" onCreate={onCreateContract} />}
          viewHref={(c) => `/contracts/${c.id}/preview`}   /* (pending modules S05) */
        />
        <FieldError message={contractPickError ?? errors.wonContract} />
      </div>
      <Divider />
      {/* (simplify Q-17, the owner's pick 2026-10-09 — revises mock 780:92744 / REG-149 for a system quote) the split is editable only where the
          project reads it: an uploaded quote. A system quote's own Payment Schedule is what the project bills (lib/projects/create.ts uses the
          split for an upload alone), so the step says so in one line instead of an editor whose numbers were ignored. */}
      {uploadedQuote ? (
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
      ) : (
        <div className={styles.stack12} data-testid="won-split-line">
          <SectionRow label="Payment milestone" />
          <span className={styles.splitLine}>{pickedQuote?.meta[0] ? `Payments follow ${pickedQuote.meta[0]}’s payment schedule.` : 'Payments follow the signed quote’s payment schedule.'}</span>
        </div>
      )}
      <Divider />
      <TextField label="Project type" value={data.projectType} mode="select"
                 options={['Whole-home renovation', 'Partial renovation', 'Commercial fit-out']}
                 onChange={(v) => update({ projectType: v })} error={errors.projectType} />
    </>
  )
}
