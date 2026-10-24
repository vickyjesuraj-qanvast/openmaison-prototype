'use client'

import type { ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ChannelChips, LogNotes, LogPhotos, NextStep, OutcomeChips, WhenRow, WhereChips, type LogFile } from '@/components/leads/log/log-fields'
import { chipOfChannel, contactChannelOf, nextLabel } from '@/components/leads/log/log-plan'
import { displayDue, parseInputDateTime } from '@/lib/format'
import type { LeadFile } from '@/lib/db/schema'
import { AutoFillNote, LinkButton } from './fields'
import type { ContactLog, MeetingLog, StageErrors } from './types'
import styles from './move-fields.module.css'

/*
 * (Leads on the move, P-04 · B-09 · B-10 — his marks 2026-10-23, "continue the leads") The Contacted and Met steps' logs when the Move stage
 * window is one step per screen (a phone, a tablet held upright): an open log is the log sheet's own fields (P-03 — the channel as chips, When
 * set to now, the outcomes as chips, the call-back's presets, notes, Take a photo · Choose a file — optional, Q-02); a completed log reads as a
 * summary card with Edit (B-09: it opened as a greyed form). The desk keeps its log cards. *(invented copy: the summary's words, "Add another log")*
 */

type FileOf = (id: string) => LeadFile | undefined
/** A log's files as the log sheet lists them: the lead's own (by id, with their picture), an older log's bare names as they are. */
export function logFilesOf(names: string[], ids: string[] | undefined, fileOf: FileOf | undefined): LogFile[] {
  return names.map((n, j) => {
    const id = ids?.[j] ?? ''
    const f = id ? fileOf?.(id) : undefined
    return { id: id || `name-${j}`, name: f?.name ?? n, thumb: f?.thumb ?? null, kind: f ? f.kind : /\.pdf$/i.test(n) ? 'pdf' : 'image' }
  })
}
/** Removing one takes its name and its id together. */
export const dropFile = (l: { files: string[]; fileIds?: string[] }, id: string): { files: string[]; fileIds?: string[] } => {
  const j = l.fileIds?.indexOf(id) ?? -1
  const k = j >= 0 ? j : Number(/^name-(\d+)$/.exec(id)?.[1] ?? -1)
  return k < 0 ? l : { files: l.files.filter((_, x) => x !== k), fileIds: l.fileIds?.filter((_, x) => x !== k) }
}

/** The shared frame of one log on the move: "Log n" (the desk's own words) · Auto Fill · delete (when there are several); the fields under it. */
function MoveLogFrame({ index, onAutoFill, onDelete, note, children }: {
  index: number; onAutoFill: () => void; onDelete?: () => void; note: string | null; children: ReactNode
}) {
  return (
    <section className={styles.log} data-testid={`move-log-${index}`}>
      <div className={styles.logHead}>
        <span className={styles.logTitle}>{`Log ${index + 1}`}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <LinkButton leading={<img src="/figma-assets/brief-sparkle.svg" alt="" />} onClick={onAutoFill} ariaLabel="Auto Fill from a chat or an email">Auto Fill</LinkButton>
        {onDelete ? (
          <Tooltip label="Delete log"><IconButton icon="delete" label={`Delete log ${index + 1}`} variant="bare" iconSize={24} iconWeight={300} onClick={onDelete} /></Tooltip>
        ) : null}
      </div>
      {note ? <AutoFillNote text={note} /> : null}
      <div className={styles.logBody}>{children}</div>
    </section>
  )
}

/** A completed log, read: how · when · how it went · what it keeps, the notes under it, Edit at its end (B-09). */
export function LogSummary({ index, count, head, line, notes, onEdit }: { index: number; count: number; head: string; line: string; notes: string; onEdit?: () => void }) {
  return (
    <section className={styles.summary} data-testid={`move-log-summary-${index}`}>
      <div className={styles.summaryText}>
        <span className={styles.summaryEyebrow}>{count > 1 ? `Log ${index + 1}` : 'Logged'}</span>
        <span className={styles.summaryHead}>{head}</span>
        <span className={styles.summaryLine}>{line}</span>
        {notes.trim() ? <span className={styles.summaryNotes}>{notes.trim()}</span> : null}
      </div>
      {onEdit ? <button type="button" className={styles.edit} onClick={onEdit} data-testid={`move-log-edit-${index}`}><Icon name="edit" size={20} />Edit</button> : null}
    </section>
  )
}

const whenWords = (when: string) => { const d = parseInputDateTime(when); return d ? displayDue(d) : when || 'No time recorded' }
const countWords = (n: number, one: string, many: string) => (n === 0 ? null : n === 1 ? `1 ${one}` : `${n} ${many}`)

export function contactSummary(l: ContactLog): { head: string; line: string } {
  const chip = chipOfChannel(l.channel)
  const how = chip === 'Visit' ? 'Site visit' : l.channel ?? 'Contact'
  const next = l.nextStepWhen && nextLabel(l.outcome) ? `${nextLabel(l.outcome)} ${whenWords(l.nextStepWhen)}` : null
  return { head: `${how} · ${whenWords(l.when)}`, line: [l.outcome || 'No outcome', next, countWords(l.files.length, l.channel === 'In person' ? 'photo' : 'screenshot', l.channel === 'In person' ? 'photos' : 'screenshots')].filter(Boolean).join(' · ') }
}
export function meetingSummary(m: MeetingLog): { head: string; line: string } {
  return { head: `${m.where || 'Meeting'} · ${whenWords(m.when)}`, line: countWords(m.files.length, 'file', 'files') ?? 'No files' }
}

export type MoveLogProps<L> = {
  index: number; count: number; log: L
  onChange: (patch: Partial<L>) => void
  errors: StageErrors
  onAutoFill: () => void
  onDelete?: () => void
  note: string | null
  openedAt: number
  fileOf?: FileOf
  onPickFile: (file: File) => void
  uploading: boolean
  onLibrary: () => void
  first: string
}

/** An open contact log on the move — the log sheet's fields over the window's ContactLog. */
export function MoveContactLog({ index, log, onChange, errors, onAutoFill, onDelete, note, openedAt, fileOf, onPickFile, uploading, onLibrary, first, askNextStep }: MoveLogProps<ContactLog> & { askNextStep: boolean }) {
  const err = (f: string) => errors[`logs.${index}.${f}`]
  /* the window asks how, as the desk does — nothing is chosen for the reader (the log sheet's channel is the press's own) */
  const chip = chipOfChannel(log.channel)
  return (
    <MoveLogFrame index={index} onAutoFill={onAutoFill} onDelete={onDelete} note={note}>
      <ChannelChips value={chip} withNote={false} onChange={(c) => onChange({ channel: contactChannelOf(c) })} error={err('channel')} />
      <WhenRow value={log.when} onChange={(v) => onChange({ when: v })} now={openedAt} openedAt={openedAt} error={err('when')} />
      <OutcomeChips value={log.outcome} error={err('outcome')}
                    onChange={(o) => onChange(nextLabel(o) ? { outcome: o } : { outcome: o, nextStepWhen: '', nextStepMode: '' })} />
      {log.outcome ? (
        <NextStep key={log.outcome} outcome={log.outcome} when={log.nextStepWhen} mode={log.nextStepMode} channel={chip ?? 'Call'} now={openedAt}
                  required={askNextStep && log.outcome !== 'Not interested'} error={err('nextStepWhen')} onChange={(p) => onChange(p)} />
      ) : null}
      <LogNotes value={log.notes} onChange={(v) => onChange({ notes: v })} />
      <LogPhotos files={logFilesOf(log.files, log.fileIds, fileOf)} uploading={uploading} onPick={onPickFile} onLibrary={onLibrary} first={first}
                 label={log.channel === 'In person' ? 'Photos from the visit (optional)' : 'Photos and screenshots (optional)'}
                 onRemove={(id) => onChange(dropFile(log, id) as Partial<ContactLog>)} />
    </MoveLogFrame>
  )
}

/** An open meeting log on the move — Where as chips, When set to now, notes, photos. */
export function MoveMeetingLog({ index, log, onChange, errors, onAutoFill, onDelete, note, openedAt, fileOf, onPickFile, uploading, onLibrary, first }: MoveLogProps<MeetingLog>) {
  const err = (f: string) => errors[`meetings.${index}.${f}`]
  return (
    <MoveLogFrame index={index} onAutoFill={onAutoFill} onDelete={onDelete} note={note}>
      <WhereChips value={log.where} onChange={(v) => onChange({ where: v })} error={err('where')} />
      <WhenRow value={log.when} onChange={(v) => onChange({ when: v })} now={openedAt} openedAt={openedAt} error={err('when')} />
      <LogNotes value={log.notes} onChange={(v) => onChange({ notes: v })} />
      <LogPhotos files={logFilesOf(log.files, log.fileIds, fileOf)} uploading={uploading} onPick={onPickFile} onLibrary={onLibrary} first={first}
                 label="Photos and documents from the meeting (optional)"
                 onRemove={(id) => onChange(dropFile(log, id) as Partial<MeetingLog>)} />
    </MoveLogFrame>
  )
}

/** The one line that adds another log under the last (the desk's title-row Add Log). */
export function AddLogLine({ onAdd }: { onAdd: () => void }) {
  return <button type="button" className={styles.addLog} onClick={onAdd} data-testid="move-add-log"><Icon name="add" size={20} />Add another log</button>
}
