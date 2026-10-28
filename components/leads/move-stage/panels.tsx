'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Checkbox, Tag } from '@/components/ds'
import { ReadOnlyScope, useReadOnly } from '@/components/om/read-only'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { Avatar } from '@/components/om/avatar'
import { CONTACT_CHANNELS_SHOWN, CONTACT_MODES, OUTCOMES, SCHEDULE, channelLabel } from '@/lib/leads/enums'
import { displayDate, displayDue, moneySGD, parseInputDateTime } from '@/lib/format'
import { clientStageName } from '@/lib/portal/model'
import type { StageDocuments } from '@/app/leads/quotes-actions'
import type { LeadFile, Member } from '@/lib/db/schema'
import { AutoFillNote, ChoiceChips, DateTimeField, Divider, FieldError, FileTile, LinkButton, NotesArea, SectionRow, Dropzone, TextField, useUploadSim } from './fields'
import { amountMinor, attachLabel, defaultMilestones, SYSTEM_CONTRACT } from '@/lib/leads/stage-data'
import { quoteStatusLabel } from '@/lib/quotes/status-words'   // (the calm UI build 2026-10-27) the one status map every quote screen reads
import type { ContactLog, MeetingLog, StageErrors, WizardData } from './types'
import styles from './wizard.module.css'
import fieldStyles from './fields.module.css'
import { pickable } from '@/lib/leads/assign-policy'
import { isPdfRefusal, readPickedPdf } from '@/components/contracts/read-pdf'
import { PhotoOrFile, useTouchPick } from '@/components/contracts/photo-or-file'
import { readPickedContractFile } from '@/components/contracts/read-picture'
import { isPictureData, NOT_A_CONTRACT_FILE } from '@/lib/contracts/picture'
import photoStyles from '@/components/contracts/photo-or-file.module.css'
import { NOT_A_PDF } from '@/lib/contracts/pdf'
import { useMoveScreen } from './screen-context'
import { AddLogLine, contactSummary, LogSummary, meetingSummary, MoveContactLog, MoveMeetingLog } from './move-fields'
import { WonChecklist } from './won-checklist'

/** (pending modules S05) A quote's PDF refusal in a quote's words — the contracts' says a contract is kept as one. (Leads on the move, Q-03) A
    finger's pick may be a photo too: its refusal names both. */
const quotePdfError = (e: string) => (e === NOT_A_PDF ? 'Choose a PDF — the quote is kept as one' : e === NOT_A_CONTRACT_FILE ? 'Choose a PDF or a photo of the quote' : e)

/** (Leads on the move, P-04) What a log step needs when the window is one step per screen. */
export type MoveStep = { openedAt: number; first: string; onPickFile: (i: number, file: File) => void; uploadingAt: (i: number) => boolean; onAddLog?: () => void }

/** (Leads on the move, Q-03 — his pick 2026-10-23) A photo of a quote taken on a phone is kept under the lead's name, as the signed contract's
    photo is ("Contract_OliviaM_signed.jpg"): "Quote_OliviaM.jpg" at Quote Sent, "Quote_OliviaM_signed.jpg" at Won. */
function quotePhotoName(leadName: string, signed: boolean): string {
  const words = leadName.split(/\s+/).map((w) => w.replace(/[^A-Za-z]/g, '')).filter(Boolean)
  const tag = words.length ? `${words[0]}${words.length > 1 ? (words[words.length - 1] ?? '').slice(0, 1) : ''}` : 'Client'
  return `Quote_${tag}${signed ? '_signed' : ''}.jpg`
}

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
/** (the calm UI build 2026-10-27 — T-11 · 2-24) A locked log's moment in the house words, "Fri, 4 Sep ’26 · 1:45 PM" — the field's input form
    ("4/9/2026, 1:45 PM") reads as 9 April to some; an unparsable value is shown as it is. */
const shownWhen = (v: string): string => { const d = v ? parseInputDateTime(v) : null; return d ? displayDue(d) : v }

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
  const screen = useMoveScreen()
  /* (Leads on the move, P-04 · B-02 — his marks 2026-10-23) one step per screen: a member row IS its label — the whole 64 row ticks, where only
     the 44 checkbox at its right edge did (a tap on "Dane" left him unticked); the box is the row's mark, the row the control */
  if (screen) {
    return (
      <div className={styles.stack12} data-testid="move-new-members">
        <SectionRow label="Members" />
        {pickable(team, data.assignees).map((m) => {
          const on = data.assignees.includes(m.id)
          const off = !editable || (assignable !== null && !assignable.includes(m.id))
          return (
            <button key={m.id} type="button" role="checkbox" aria-checked={on} aria-disabled={off || undefined} className={`${styles.memberRow} ${styles.memberPress}`}
                    onClick={off ? undefined : () => update?.({ assignees: on ? data.assignees.filter((id) => id !== m.id) : [...data.assignees, m.id] })}>
              <Avatar name={m.name} color={m.color} size={40} tooltip={false} />
              <span className={styles.memberText}>
                <span className={styles.memberName}>{m.name}</span>
                <span className={styles.memberRole}>{m.isYou ? `${m.role} (you)` : m.role}</span>
              </span>
              <span className={styles.memberMark} data-on={on || undefined} aria-hidden><Icon name={on ? 'check_box' : 'check_box_outline_blank'} size={24} weight={300} fill={on} /></span>
            </button>
          )
        })}
        <FieldError message={error} />
      </div>
    )
  }
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
  index, count, collapsed, onToggle, readOnly, onAutoFill, onEdit, onDelete, note = null, children,
}: {
  index: number
  /** (the calm UI build 2026-10-27 — 2-30) how many logs the step holds: "Log 1" only names a log among two or more */
  count: number
  collapsed: boolean; onToggle: () => void; readOnly: boolean
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
        <span className={styles.logTitle}>{count > 1 ? `Log ${index + 1}` : ''}</span>
        {!collapsed && !readOnly ? (
          /* (REG-291) The Maison AI mark — the FAB's own sparkle, as the AI brief / sheet / Notes bar use.
             sparkle.svg, the mock's asset here, is a different four-pointed shape; Auto Fill is a Maison AI
             action, so it now carries the same mark everywhere it appears. */
          // eslint-disable-next-line @next/next/no-img-element
          <LinkButton leading={<img src="/figma-assets/brief-sparkle.svg" alt="" />} onClick={onAutoFill}>Auto fill</LinkButton>
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
  index, count, log, onChange, onAutoFill, onEdit, onDelete, readOnly, errors, today, askNextStep = false, onAttach, fileOf, note = null,
}: {
  count: number
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
    <LogShell index={index} count={count} collapsed={!!log.collapsed} onToggle={() => onChange({ collapsed: !log.collapsed })}
              readOnly={readOnly} onAutoFill={onAutoFill} onEdit={onEdit} onDelete={onDelete} note={note}>
      {/* (REG-320, user 2026-09-02) Where this log lives afterwards — only here, the Notes tab is already that place. (the calm UI build
          2026-10-27 — 2-30) in the tab's own name, once: there is no screen called "Lead Details". */}
      <p className={fieldStyles.callout}>
        <Icon name="info" size={16} weight={300} />
        <span>Saved to Notes &amp; logs.</span>
      </p>
      {/* (the calm UI build 2026-10-27 — T-01 · 2-08) the log sheet's words at every width: How · When · How it went (chips, as the phone has
          them); the stored values unchanged (`channelLabel`) */}
      <ChoiceChips label="How" required options={CONTACT_CHANNELS_SHOWN} value={log.channel} render={channelLabel}
                   onChange={(v) => onChange({ channel: v })} error={err('channel')} />
      <div className={styles.fieldPair}>
        {/* (UX audit 2026-09-30, L9) a day picked without a time takes the time it is now, never a silent 10:00 AM. (2-24) A locked log reads
            the house date, not the field's input form "4/9/2026, 1:45 PM" — nothing can be typed while it is read-only. */}
        <DateTimeField label="When" value={readOnly ? shownWhen(log.when) : log.when} required today={today} defaultNow
                       onChange={(v) => onChange({ when: v })} error={err('when')} />
      </div>
      <ChoiceChips label="How it went" required options={OUTCOMES} value={log.outcome || null}
                   onChange={(v) => onChange({ outcome: v })} error={err('outcome')} />
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
            <DateTimeField label="Date and time" value={readOnly ? shownWhen(log.nextStepWhen) : log.nextStepWhen} today={today} required={askNextStep && log.outcome !== 'Not interested'}
                           onChange={(v) => onChange({ nextStepWhen: v })} error={err('nextStepWhen')} />
            {/* (2-08 · 2-30) "Preferred mode" → "Call back by", worded by `channelLabel`, the stored mode kept */}
            <TextField label="Call back by" value={channelLabel(log.nextStepMode)} mode="select" options={CONTACT_MODES.map(channelLabel)}
                       onChange={(v) => onChange({ nextStepMode: CONTACT_MODES.find((m) => channelLabel(m) === v) ?? v })} error={err('nextStepMode')} />
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
        {/* "Attach", not the mock's "Attach Files" (user 2026-09-04, REG-324). (UX audit 2026-09-30, L2 · T3) It names what proves this contact —
            photos from a visit, screenshots of a call or a message. (Leads on the move, Q-02 — his pick 2026-10-23, at every width) optional, as
            the Notes tab's contact log always was: the row loses its required mark and says "(optional)", like the meeting documents' row. */}
        <SectionRow label={`${attachLabel(log.channel)} (optional)`}
                    action={<LinkButton icon="attach_file" onClick={() => onAttach?.()}>Attach</LinkButton>} />
        <AttachedTiles names={log.files} ids={log.fileIds} fileOf={fileOf} onRemove={(j) => onChange({ files: dropAt(log.files, j) ?? [], fileIds: dropAt(log.fileIds, j) })} />
        <FieldError message={err('files')} />
      </div>
    </LogShell>
  )
}

export function ContactedPanel({
  data, update, onAutoFill, onEditLog, onDeleteLog, lockedLog, errors, today, askNextStep = false, onAttach, fileOf, fillNote, move,
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
  /** (Leads on the move, P-04) one step per screen: the log sheet's fields, a picked photo uploaded at once, "Add another log" under the last */
  move?: MoveStep
}) {
  const setLog = (i: number, patch: Partial<ContactLog>) =>
    update({ logs: data.logs.map((l, j) => (j === i ? { ...l, ...patch } : l)) })
  const screen = useMoveScreen()
  if (screen && move) {
    const count = data.logs.length
    return (
      <>
        {data.logs.map((log, i) => lockedLog?.(i)
          ? <LogSummary key={i} index={i} count={count} {...contactSummary(log)} notes={log.notes} onEdit={onEditLog ? () => onEditLog(i) : undefined} />
          : <MoveContactLog key={i} index={i} count={count} log={log} onChange={(p) => setLog(i, p)} errors={errors} note={fillNote?.(i) ?? null}
                            onAutoFill={() => onAutoFill(i)} onDelete={onDeleteLog && count > 1 ? () => onDeleteLog(i) : undefined}
                            openedAt={move.openedAt} fileOf={fileOf} onPickFile={(f) => move.onPickFile(i, f)} uploading={move.uploadingAt(i)}
                            onLibrary={() => onAttach?.(i)} first={move.first} askNextStep={askNextStep && !lockedLog?.(i)} />)}
        {move.onAddLog ? <AddLogLine onAdd={move.onAddLog} /> : null}
      </>
    )
  }
  return (
    <>
      {data.logs.map((log, i) => (
        <LogCard key={i} index={i} count={data.logs.length} log={log} errors={errors} today={today} askNextStep={askNextStep && !lockedLog?.(i)} onAttach={onAttach ? () => onAttach(i) : undefined} fileOf={fileOf} note={fillNote?.(i) ?? null}
                 readOnly={!!lockedLog?.(i)} onEdit={onEditLog ? () => onEditLog(i) : undefined}
                 onDelete={onDeleteLog && data.logs.length > 1 ? () => onDeleteLog(i) : undefined}
                 onChange={(p) => setLog(i, p)} onAutoFill={() => onAutoFill(i)} />
      ))}
    </>
  )
}

/** Met (780:90234, updated 2026-09-04): the same log list — Where · Date & Time / Remarks / rule / meeting documents (REG-325). */
function MeetingCard({
  index, count, log, onChange, onAutoFill, onEdit, onDelete, readOnly, errors, today, onAttach, fileOf, note = null,
}: {
  count: number
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
    <LogShell index={index} count={count} collapsed={!!log.collapsed} onToggle={() => onChange({ collapsed: !log.collapsed })}
              readOnly={readOnly} onAutoFill={onAutoFill} onEdit={onEdit} onDelete={onDelete} note={note}>
      <div className={styles.fieldPair}>
        <TextField label="Where" required value={log.where} mode="select" options={['In person', 'Video call', 'Showroom']}
                   onChange={(v) => onChange({ where: v })} error={err('where')} />
        <DateTimeField label="When" value={readOnly ? shownWhen(log.when) : log.when} required today={today} defaultNow   /* (UX audit 2026-09-30, L9) · (2-24) */
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
  data, update, onAutoFill, onEditLog, onDeleteLog, lockedLog, errors, today, onAttach, fileOf, fillNote, move,
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
  /** (Leads on the move, P-04) one step per screen */
  move?: MoveStep
}) {
  const setLog = (i: number, patch: Partial<MeetingLog>) =>
    update({ meetings: data.meetings.map((m, j) => (j === i ? { ...m, ...patch } : m)) })
  const screen = useMoveScreen()
  if (screen && move) {
    const count = data.meetings.length
    return (
      <>
        {data.meetings.map((m, i) => lockedLog?.(i)
          ? <LogSummary key={i} index={i} count={count} {...meetingSummary(m)} notes={m.notes} onEdit={onEditLog ? () => onEditLog(i) : undefined} />
          : <MoveMeetingLog key={i} index={i} count={count} log={m} onChange={(p) => setLog(i, p)} errors={errors} note={fillNote?.(i) ?? null}
                            onAutoFill={() => onAutoFill(i)} onDelete={onDeleteLog && count > 1 ? () => onDeleteLog(i) : undefined}
                            openedAt={move.openedAt} fileOf={fileOf} onPickFile={(f) => move.onPickFile(i, f)} uploading={move.uploadingAt(i)}
                            onLibrary={() => onAttach?.(i)} first={move.first} />)}
        {move.onAddLog ? <AddLogLine onAdd={move.onAddLog} /> : null}
      </>
    )
  }
  return (
    <>
      {data.meetings.map((m, i) => (
        <MeetingCard key={i} index={i} count={data.meetings.length} log={m} errors={errors} today={today} onAttach={onAttach ? () => onAttach(i) : undefined} fileOf={fileOf} note={fillNote?.(i) ?? null}
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
                   meta: [q.number, moneySGD(q.amountMinor), q.approvedAt ? `Approved on ${displayDate(new Date(q.approvedAt))}` : quoteStatusLabel(q.status)] }))   // (the calm UI build — 4-04) the status in its display words
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
          {noun === 'quotes' ? 'New quote' : 'New contract'}
          <Icon name="chevron_right" size={20} />
        </button>
      ) : null}
    </div>
  )
}

export function AttachTabs({
  tab, onTab, selected, selectedId = null, onSelect, uploaded, uploading, onUpload, onRemoveUpload, quotes, empty, viewHref, touchPick, uploadedPicture = null, photoHelp,
}: {
  /** (Leads on the move, Q-03) Take a photo's line, where the paper is a quote */
  photoHelp?: string
  /** (Contracts on the move, C4 — P-12 · C-27, Q-04 as picked) On touch the Upload tab is two rows — Take a photo · Choose a file (a PDF or a
      picture) — in the drop box's place; given by the Won step's contract alone (a quote's upload stays a PDF). The desk keeps the box. */
  touchPick?: { ids: { photo: string; file: string }; label: string }
  /** (C4 — P-12) the kept photo's own picture (a small JPEG) for the file row, where the upload is a photo; a PDF keeps the mock's badge */
  uploadedPicture?: string | null
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
  const touch = useTouchPick()
  const rows = !!touchPick && touch   // (C4 — P-12) a finger: the two rows; a mouse: the box
  return (
    <div className={styles.tabCard}>
      <div className={styles.tabBar} role="tablist">
        {(['system', 'upload'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={styles.tab} onClick={() => onTab(t)}>
            {t === 'system' ? 'From system' : 'Upload'}
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
            {/* 780:91468: the drop target stays above the uploaded file, which reads as the selected row. (Contracts on the move, C4 — P-12 ·
                C-27) On touch the box is two rows — Take a photo (the camera at once) · Choose a file (a PDF or a picture) — shown until a file
                is kept; the kept file's row then stands alone, and its Remove brings the two rows back. */}
            {rows && touchPick ? (uploaded ? null : <PhotoOrFile ids={touchPick.ids} label={touchPick.label} uploading={uploading} onPick={onUpload} photoHelp={photoHelp} />)
              : <Dropzone title={<>Drop your file or <b>browse</b></>} helper="Supports: PDF" accept=".pdf,application/pdf" uploading={uploading} onPick={onUpload} />}
            {uploaded ? (
              <div className={styles.quoteRow} data-selected="true" data-file-row="true" data-picture={uploadedPicture ? '' : undefined}>
                <span className={styles.quoteRadio}>
                  <Icon name="radio_button_checked" size={20} weight={300} fill />
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {uploadedPicture ? <img className={photoStyles.thumb} src={uploadedPicture} alt="" width={40} height={40} data-testid="won-photo-thumb" />
                  /* a photo kept before (the step read again — its bytes live in Files, not in the log) wears the picture glyph, never the PDF badge */
                  : /\.(jpe?g|png|webp)$/i.test(uploaded) ? <span className={styles.pdfBadge} aria-label="Photo"><Icon name="image" size={24} weight={300} /></span>
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img className={styles.pdfBadge} src="/figma-assets/file-pdf.svg" alt="PDF" width={24} height={24} />}
                <span className={`${styles.quoteName} ${styles.fileName}${rows ? ` ${photoStyles.fileName}` : ''}`}>{uploaded}</span>
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
  data, update, errors, docs, onCreateQuote, rule = null, onAttach, fileOf, leadName = '',
}: { data: WizardData; update: (patch: Partial<WizardData>) => void; errors: StageErrors
  /** (Leads on the move, Q-03) the lead's name — a photo of the quote is kept under it */
  leadName?: string
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
  /* (Leads on the move, Q-03 — his pick 2026-10-23: "a signed quote may be a photo at Quote Sent and Won … kept as the copy, the amount typed, as
     the signed contract already is") on touch the Upload tab is Take a photo · Choose a file (a PDF or a picture), the Won step's contract's
     own rows (C4); a photo is kept as the quote's copy in Files › Quotes & BOQ. A desk's drop stays a PDF. */
  const touchPick = useTouchPick()
  const pickQuote = (f?: File) => {
    setPickError(null)
    if (!f) return
    const read = touchPick ? readPickedContractFile(f, quotePhotoName(leadName, false)) : readPickedPdf(f)
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
          touchPick={{ ids: { photo: 'quote-take-photo', file: 'quote-choose-file' }, label: 'Attach the quote' }}   /* (Leads on the move, Q-03) */
          photoHelp="The quote, with your camera"
          uploadedPicture={data.quoteFile && isPictureData(data.quoteFile.data) ? data.quoteFile.thumb ?? data.quoteFile.data : null}
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
const PROJECT_TYPES = ['Whole-home renovation', 'Partial renovation', 'Commercial fit-out']

function signedContractName(leadName: string): string {
  const words = leadName.split(/\s+/).map((w) => w.replace(/[^A-Za-z]/g, '')).filter(Boolean)
  const first = words[0] ?? ''
  const lastInitial = words.length > 1 ? (words[words.length - 1] ?? '').slice(0, 1) : ''
  return first ? `Contract_${first}${lastInitial}_signed.pdf` : SYSTEM_CONTRACT
}

export function WonPanel({
  data, update, errors, leadBudgetMinor, leadName, docs, onCreateQuote, onCreateContract, contractOptional = false, memberNames = [], usualSplit = null,
}: { data: WizardData; update: (patch: Partial<WizardData>) => void; errors: StageErrors; leadBudgetMinor: number; leadName: string
  /** (held calls 2026-10-24) the studio's usual split — its default payment schedule, read when the window opened; null until it lands
   *  (the 10 · 30 · 30 · 30 it was seeded with stands in) */
  usualSplit?: WizardData['milestones'] | null
  /** (pending modules S05) the studio wins a lead on its signed quote alone (Settings › Lead management › Lead stages) */
  contractOptional?: boolean
  /** (REG-340) The lead's quotes and contracts, read when the window opened; null until they land. */
  docs: StageDocuments | null
  onCreateQuote: () => void; onCreateContract: () => void
  /** (Leads on the move, P-04) the lead's members — the checklist's closing line names who carries on with the project */
  memberNames?: string[] }) {
  const screen = useMoveScreen()
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
  /* (Contracts on the move, C4 — P-12 · C-27, Q-04 as picked) On touch a PHOTO of the paper the client just signed is taken too — read as a JPEG
     (a HEIC turned first), kept as the signed copy under the same name with its own extension ("Contract_OliviaM_signed.jpg"); the lead moves
     to Won exactly as with a PDF (lib/contracts/won.ts). A desk's drop stays a PDF. */
  const touchPick = useTouchPick()
  /* (C4 — P-12, the right default) on touch, a lead with no contract in the system opens the contract on Upload — From System could only
     offer "Create Contract", which leaves the step; the photo of the paper just signed is the one thing at hand. Once, never on a kept step. */
  const roWon = useReadOnly()
  const noSystemContract = !!contracts && contracts.length === 0
  useEffect(() => {
    if (touchPick && !roWon && noSystemContract && data.wonContractTab === 'system' && !data.wonContractUploaded) update({ wonContractTab: 'upload' })
  }, [touchPick, roWon, noSystemContract])   // eslint-disable-line react-hooks/exhaustive-deps -- once, when the documents land
  const pickContract = (f?: File) => {
    setContractPickError(null)
    if (!f) return   // (S43E, F3-02 W2-01) no file, no contract — the mock's simulated upload of a named file is gone, as the signed quote's
    const photoName = contractName.replace(/\.pdf$/i, '.jpg')
    const read = touchPick ? readPickedContractFile(f, photoName) : readPickedPdf(f)
    contractUpload.start(() => { void read.then((r) => { if (isPdfRefusal(r)) { setContractPickError(r.error); return } const name = isPictureData(r.data) ? r.name : contractName; update({ wonContractUploaded: name, wonContractFile: { ...r, name } }) }) })
  }
  const [justUploaded, setJustUploaded] = useState(false)
  /* (Leads on the move, B-12 — his marks 2026-10-23; reverses REG-149's zeroing for an upload) an uploaded signed quote starts the split at the
     studio's usual — the % boxes typed one by one from 0% and the refused Save were the phone's whole Won step; change it where the signed paper
     says otherwise. (held calls 2026-10-24 — his "fix all of it"; the call as decided: one rule at every width) the desk too, and "the studio's
     usual" is its default payment schedule (what a new quote starts on), the seeded 10 · 30 · 30 · 30 until it has been read. */
  const usualRows = usualSplit?.length ? usualSplit : defaultMilestones()
  const uploadSplit = () => usualRows.map((m) => ({ ...m }))
  /* (pending modules S05) the signed quote's PDF itself — its own name on the row, kept with its bytes in the lead's Files with the project.
     (Leads on the move, Q-03 — his pick 2026-10-23) on touch a photo of the signed paper too, kept as the quote's copy (C4's contract rows). */
  const [quotePickError, setQuotePickError] = useState<string | null>(null)
  const pickSignedQuote = (f?: File) => {
    setQuotePickError(null)
    if (!f) return
    const read = touchPick ? readPickedContractFile(f, quotePhotoName(leadName, true)) : readPickedPdf(f)
    quoteUpload.start(() => { void read.then((r) => { if (isPdfRefusal(r)) { setQuotePickError(quotePdfError(r.error)); return } update({ wonQuoteUploaded: r.name, wonQuoteFile: r, milestones: uploadSplit() }); setJustUploaded(true) }) })
  }
  const uploadedQuote = data.wonQuoteTab === 'upload'
  // The split is computed on the signed quote's amount: the selected system quote's own total, or the amount typed for an
  // upload (780:92744 total). The lead's budget stands in only until the quotes have loaded.
  const basisMinor = uploadedQuote ? amountMinor(data.wonQuoteAmount)
    : quotes?.find((q) => q.name === data.wonQuote)?.amountMinor ?? leadBudgetMinor
  const totalPct = data.milestones.reduce((s, m) => s + (m.pct || 0), 0)
  const setPct = (i: number, pct: number) =>
    update({ milestones: data.milestones.map((m, j) => (j === i ? { ...m, pct } : m)) })
  const quoteTabs = (
    <AttachTabs
      tab={data.wonQuoteTab}
      onTab={(t) => update({ wonQuoteTab: t, milestones: t === 'system' ? defaultMilestones() : data.wonQuoteUploaded ? uploadSplit() : data.milestones })}
      selected={data.wonQuote} onSelect={(n) => update({ wonQuote: n, milestones: defaultMilestones() })}
      uploaded={data.wonQuoteUploaded} uploading={quoteUpload.uploading}
      onUpload={pickSignedQuote}   // (pending modules S05) the picked file itself
      onRemoveUpload={() => { setQuotePickError(null); update({ wonQuoteUploaded: null, wonQuoteFile: null, wonQuoteAmount: '', milestones: defaultMilestones() }) }}
      quotes={quotes} empty={<SystemEmpty noun="quotes" onCreate={onCreateQuote} />}
      viewHref={(q) => `/quotes/${q.id}/preview`}   /* (pending modules S05) */
      touchPick={{ ids: { photo: 'won-quote-photo', file: 'won-quote-file' }, label: 'Attach the client’s signed quote' }}   /* (Leads on the move, Q-03) */
      photoHelp="The signed quote, with your camera"
      uploadedPicture={data.wonQuoteFile && isPictureData(data.wonQuoteFile.data) ? data.wonQuoteFile.thumb ?? data.wonQuoteFile.data : null}
    />
  )
  const quoteError = quotePickError ?? errors.wonQuote ?? pickedQuote?.hold ?? undefined
  const quoteAmount = uploadedQuote && data.wonQuoteUploaded ? (
    <TextField label="Quote amount (S$)" value={data.wonQuoteAmount} placeholder="70,500" numeric="amount" autoFocus={justUploaded}
               onChange={(v) => update({ wonQuoteAmount: v })} error={errors.wonQuoteAmount} />
  ) : null
  const contractTabs = (
    <AttachTabs
      tab={data.wonContractTab} onTab={(t) => update({ wonContractTab: t })}
      selected={data.wonContract} onSelect={(n) => update({ wonContract: n })}
      uploaded={data.wonContractUploaded} uploading={contractUpload.uploading}
      onUpload={pickContract}
      touchPick={{ ids: { photo: 'won-take-photo', file: 'won-choose-file' }, label: 'Attach the client’s signed contract' }}   /* (C4 — P-12) */
      uploadedPicture={data.wonContractFile && isPictureData(data.wonContractFile.data) ? data.wonContractFile.thumb ?? data.wonContractFile.data : null}
      onRemoveUpload={() => { setContractPickError(null); update({ wonContractUploaded: null, wonContractFile: null }) }}
      quotes={contracts} empty={<SystemEmpty noun="contracts" onCreate={onCreateContract} />}
      viewHref={(c) => `/contracts/${c.id}/preview`}   /* (pending modules S05) */
    />
  )
  const contractError = contractPickError ?? errors.wonContract
  const splitLine = pickedQuote?.meta[0] ? `Payments follow ${pickedQuote.meta[0]}’s payment schedule.` : 'Payments follow the signed quote’s payment schedule.'
  const splitEditor = (
    <div className={styles.msCard}>
      {data.milestones.map((m, i) => {
        const amtMinor = Math.round((basisMinor * (m.pct || 0)) / 100)
        return (
          <div key={m.name} className={styles.msRow}>
            <span className={styles.msIndex}>{i + 1}</span>
            <span className={styles.msText}>
              <span className={styles.msName}>{clientStageName(m.name)}</span>   {/* (the calm UI build 2026-10-27 — 3-49) one spelling, "Mid-project"; the stored name kept */}
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
  )

  if (screen) {
    /* (Leads on the move, P-04 · B-11 · B-12) Won as a checklist — each settled row one line, the first still to do open */
    const usual = data.milestones.length === usualRows.length && data.milestones.every((m, i) => m.pct === usualRows[i]!.pct && m.name === usualRows[i]!.name)
    const pcts = data.milestones.map((m) => m.pct || 0).join(' · ')
    const amount = amountMinor(data.wonQuoteAmount)
    const quoteDone = uploadedQuote ? !!data.wonQuoteUploaded && amount > 0 : !!pickedQuote && !pickedQuote.hold
    const contractRow = contracts?.find((c) => c.name === data.wonContract) ?? null
    const contractDone = data.wonContractTab === 'upload' ? !!data.wonContractUploaded : !!contractRow
    const firstOf = (n: string) => n.trim().split(/\s+/)[0] ?? n
    const names = memberNames.map(firstOf)
    const pickLine = 'Take a photo · Choose a file · From the system'
    return (
      <WonChecklist
        rows={[
          { key: 'quote', title: 'Signed quote', done: quoteDone, error: quoteError ?? errors.wonQuoteAmount ?? null,
            summary: uploadedQuote ? (data.wonQuoteUploaded ? `${data.wonQuoteUploaded} · ${amount ? moneySGD(amount) : 'type the amount'}` : pickLine)
              : pickedQuote ? pickedQuote.meta.join(' · ') : quotes === null ? 'Reading the lead’s quotes…' : pickLine,
            body: <>{quoteTabs}{quoteAmount}</> },
          { key: 'contract', title: 'Signed contract', optional: contractOptional, done: contractDone, error: contractError ?? null,
            summary: data.wonContractTab === 'upload' ? (data.wonContractUploaded ?? pickLine)
              : contractRow ? [contractRow.name, ...contractRow.meta].join(' · ') : contracts === null ? 'Reading the lead’s contracts…' : pickLine,
            body: contractTabs },
          { key: 'payments', title: 'Payments', done: !uploadedQuote || totalPct === 100, error: errors.milestones ?? null,
            summary: !uploadedQuote ? splitLine : usual ? `${usualRows.map((m) => m.pct).join(' · ')} — the studio’s usual` : totalPct === 100 ? pcts : `${pcts} · ${totalPct} of 100% assigned`,
            body: uploadedQuote ? (
              <>
                <p className={styles.splitLine}>It starts at the studio’s usual split — change it where the signed quote says otherwise.</p>
                {splitEditor}
                {usual ? null : <LinkButton onClick={() => update({ milestones: uploadSplit() })}>Back to the usual split</LinkButton>}
              </>
            ) : null },
        ]}
        type={{ value: data.projectType, options: PROJECT_TYPES, onChange: (v) => update({ projectType: v }), error: errors.projectType ?? null }}
        closing={names.length ? `Creates ${firstOf(leadName)}’s project — ${names.join(' · ')} ${names.length === 1 ? 'carries' : 'carry'} on with it.` : `Creates ${firstOf(leadName)}’s project.`}
      />
    )
  }
  return (
    <>
      <div className={styles.stack12}>
        <SectionRow label="Attach client signed quote" />
        {/* The split follows the signed quote's source (user 2026-08-29): a system quote carries its own schedule; an uploaded one starts at
            the studio's usual split (held calls 2026-10-24 — REG-149's 0% retired at every width), to be changed where the paper differs. */}
        {quoteTabs}
        <FieldError message={quoteError} />
      </div>
      {quoteAmount}
      <Divider />
      <div className={styles.stack12}>
        <SectionRow label={contractOptional ? 'Attach client signed contract (optional)' : 'Attach client signed contract'} />
        {contractTabs}
        <FieldError message={contractError} />
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
                          <LinkButton onClick={() => update({ milestones: uploadSplit() })}>Reset to default</LinkButton>
                          <Tag color="green" appearance="outlined">{`${totalPct}%`}</Tag>
                        </span>
                      } />
          {splitEditor}
          <FieldError message={errors.milestones} />
        </div>
      ) : (
        <div className={styles.stack12} data-testid="won-split-line">
          <SectionRow label="Payment milestone" />
          <span className={styles.splitLine}>{splitLine}</span>
        </div>
      )}
      <Divider />
      <TextField label="Project type" value={data.projectType} mode="select"
                 options={PROJECT_TYPES}
                 onChange={(v) => update({ projectType: v })} error={errors.projectType} />
    </>
  )
}
