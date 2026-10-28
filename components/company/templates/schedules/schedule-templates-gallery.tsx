'use client'

import { SCHEDULE_PRESETS } from '@/lib/projects/schedule-presets'   // (gaps build, package C — 3)
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { templateKind } from '@/lib/company/sections'
import type { ScheduleTemplateRow, ScheduleTemplatesData } from '@/lib/company/schedule-templates'
import { createScheduleTemplate, deleteScheduleTemplate, deleteScheduleTemplatesForever, duplicateScheduleTemplate, emptyScheduleTemplateTrash, renameScheduleTemplate, restoreScheduleTemplates } from '@/app/company/schedule-templates-actions'
import { LibraryGallery, newIdOf, reasonOf, type LibraryItem } from '../library-gallery'
import { templateChangeBlock, templatePurgeBlock, templateRestoreBlock } from '@/lib/company/template-rules'
import { folderBlock, type Folder } from '@/lib/company/folder-libraries'
import { useHere } from '@/components/om/use-here'
import { draftsFromTemplate } from '@/lib/projects/schedule-phases'
import { plural } from '@/lib/projects/schedule-model'
import styles from './schedules.module.css'

type Row = ScheduleTemplateRow & LibraryItem
const toRow = (t: ScheduleTemplateRow): Row => ({ ...t, title: t.name })
const weeks = (days: number) => (days >= 14 ? `${Math.round(days / 7)} weeks` : plural(days, 'day'))

/** The card's picture: the template's milestones laid out to scale from works start (lib/projects/schedule-phases.ts `draftsFromTemplate`). */
export function ScheduleThumb({ items }: { items: ScheduleTemplateRow['items'] }) {
  const d = draftsFromTemplate(items, 0)
  const span = Math.max(1, ...d.map((x) => x.end + 1))
  return (
    <span className={styles.thumb} aria-hidden>
      {d.slice(0, 7).map((x, i) => (
        <span key={i} className={styles.thumbRow}>
          <span className={styles.thumbBar} style={{ left: `${(x.start / span) * 100}%`, width: `${Math.max(2, ((x.end - x.start + 1) / span) * 100)}%` }} />
        </span>
      ))}
      {d.length > 7 ? <span className={styles.thumbMore}>+{d.length - 7} more</span> : null}
    </span>
  )
}

/**
 * (Projects round 2, Q-12) Company › Templates › Schedules: the milestones a project's schedule starts from, as a library on the house gallery
 * (REG-538's shape: New ▾, folders REG-663, the kebab, Deleted Templates). A card draws the milestones to scale; the editor sets each one's
 * name, its length and its gap after the one before. A schedule saved from a project lands here too (the Schedule tab's ⋮ › Save as a template).
 */
export function ScheduleTemplatesGallery({ data, from, folders = [] }: { data: ScheduleTemplatesData; from?: string; folders?: Folder[] }) {
  const { templates, deleted, now } = data
  const router = useRouter()
  const { fail } = useRun()
  const kind = templateKind('schedules')!
  const here = useHere('/company/templates/schedules')
  const open = useCallback((id: string) => router.push(`/templates/schedules/${id}?from=${encodeURIComponent(here)}`), [router, here])
  const create = async (fn: () => Promise<unknown>, what: string) => { try { open(await newIdOf(fn())) } catch (e) { fail(what, reasonOf(e)) } }

  return (
    <LibraryGallery<Row> kind={kind} from={from} folders={{ library: 'schedules', list: folders, block: folderBlock(data.viewer) }} items={templates.map(toRow)} deleted={deleted.map(toRow)} now={now} ariaLabel="Schedule templates"
      mayChange={(t) => templateChangeBlock(data.viewer, t.createdBy)} tableKey="schedule-templates"
      newMenu={(close, place) => (<>
        <DropdownItem onSelect={() => { close(); void create(() => createScheduleTemplate({ source: { kind: 'renovation' }, folderId: place.folderId }), 'create the template') }}>Start from a whole-home renovation</DropdownItem>
        {/* (gaps build, package C — 3) a fresh copy of a ready-made schedule, whatever the library holds */}
        {SCHEDULE_PRESETS.map((p) => <DropdownItem key={p.key} onSelect={() => { close(); void create(() => createScheduleTemplate({ source: { kind: 'preset', key: p.key }, folderId: place.folderId }), 'create the template') }}>{`Ready-made: ${p.name}`}</DropdownItem>)}
        <DropdownDivider />
        <DropdownItem onSelect={() => { close(); void create(() => createScheduleTemplate({ source: { kind: 'blank' }, folderId: place.folderId }), 'create the template') }}>Blank schedule</DropdownItem>
      </>)}
      searchText={(t) => t.items.map((i) => i.title).join(' ')}
      thumb={(t) => <ScheduleThumb items={t.items} />}
      glyph={() => <span className={styles.glyph}><span /><span /><span /></span>}
      /* (gaps build, package C — 3) a ready-made one says so — (the calm UI build 2026-10-27, the UI audit's 4-36) after the facts that tell the
         cards apart, so the weeks are never the words cut off */
      meta={(t) => `${plural(t.items.length, 'milestone')} · ${weeks(t.span)}${t.presetKey ? ' · ready-made' : ''}`}
      usage={(t) => (t.usedBy === 0 ? 'No schedule started from it yet' : `${plural(t.usedBy, 'schedule')} started from it`)}
      foot={(t) => (t.usedBy ? `${plural(t.usedBy, 'schedule')} started from it` : ' ')}   /* (4-36 · W-049) nothing until it is used; edited and by whom are the list's Updated · Updated by */
      usageWord={(t) => (t.usedBy === 0 ? '--' : plural(t.usedBy, 'schedule'))}
      columns={[
        { key: 'milestones', label: 'Milestones', track: '160px', sortable: (t) => t.items.length, cell: (t) => <span>{t.items.length}</span> },
        { key: 'span', label: 'Works start to handover', track: '288px', sortable: (t) => t.span, cell: (t) => <span className={styles.oneLine}>{weeks(t.span)}</span> },
        { key: 'used', label: 'Used by', track: '140px', sortable: true, cell: (t) => <span>{t.usedBy ? plural(t.usedBy, 'schedule') : '--'}</span> },
      ]}
      onOpen={(t) => open(t.id)}
      onDuplicate={(t) => create(() => duplicateScheduleTemplate(t.id), 'duplicate the template')}
      onRename={(t, name) => renameScheduleTemplate(t.id, name)}
      onDelete={(t) => deleteScheduleTemplate(t.id)}
      deleteMessage={() => 'Schedules that started from it keep their milestones. You can restore it from Deleted templates.'}
      onRestore={(ids) => restoreScheduleTemplates(ids)} onDeleteForever={(ids) => deleteScheduleTemplatesForever(ids)} onEmptyTrash={() => emptyScheduleTemplateTrash()}
      restoreBlock={(t) => templateRestoreBlock(data.viewer, t.createdBy, t.author)} purgeRule={(t) => templatePurgeBlock(data.viewer, t.createdBy, t.author)}
      deletedMeta={{ label: 'Milestones', value: (t) => plural(t.items.length, 'milestone') }}
      empty={{ title: 'No schedule templates yet', help: 'A project’s schedule can start from one — the milestones, how long each runs and what follows what. Save a project’s schedule as a template from its Schedule tab, or start one here.',
        start: (place) => ({ primary: { label: 'Start from a whole-home renovation', onPress: () => { void create(() => createScheduleTemplate({ source: { kind: 'renovation' }, folderId: place.folderId }), 'create the template') } },
          secondary: { label: 'Blank schedule', onPress: () => { void create(() => createScheduleTemplate({ source: { kind: 'blank' }, folderId: place.folderId }), 'create the template') } } }) }} />
  )
}
