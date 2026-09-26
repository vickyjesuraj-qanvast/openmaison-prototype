'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { templateKind } from '@/lib/company/sections'
import { TEXT_LABEL, textPreview, type TextKind } from '@/lib/quotes/text'
import type { TextTemplateRow, TextTemplatesData } from '@/lib/company/text-templates'
import { createTextTemplate, deleteTextTemplate, deleteTextTemplatesForever, duplicateTextTemplate, emptyTextTemplateTrash, renameTextTemplate, restoreTextTemplates } from '@/app/quotes/text-actions'
import { LibraryGallery, newIdOf, reasonOf, type LibraryItem } from './library-gallery'
import styles from './library-gallery.module.css'
import { templateChangeBlock, templatePurgeBlock, templateRestoreBlock } from '@/lib/company/template-rules'
import { folderBlock, type Folder } from '@/lib/company/folder-libraries'
import { useHere } from '@/components/om/use-here'

type Row = TextTemplateRow & LibraryItem
const toRow = (t: TextTemplateRow): Row => ({ ...t, updatedAt: t.updatedAt ?? t.createdAt })
const kindWord = (k: string) => (k === 'terms' ? 'Terms' : 'Notes')

/**
 * Company › Templates › T&Cs & Notes (REG-538): the text library the quote editor's My Templates writes to, as a page —
 * one page, a Terms · Notes segment (the owner kept Notes off the tab strip, REG-508, but the quote template editor's
 * Defaults name notes templates, so they need a home). New template ▾ makes one of either kind and opens the editor.
 */
export function TextTemplatesGallery({ data, from, folders = [] }: { data: TextTemplatesData; from?: string; folders?: Folder[] }) {
  const { templates, deleted, now } = data
  const router = useRouter()
  const { fail } = useRun()
  const kind = templateKind('terms')!
  const here = useHere('/company/templates/terms')   // (round 3) the open folder and search ride along
  const open = useCallback((id: string) => router.push(`/templates/terms/${id}?from=${encodeURIComponent(here)}`), [router, here])
  /* (wave E, E7) a refusal answers { error: the rule } — said after "Couldn’t …" */
  const create = async (k: TextKind) => { try { open(await newIdOf(createTextTemplate(k, { title: 'Untitled template', body: '' }))) } catch (e) { fail('create the template', reasonOf(e)) } }

  return (
    <LibraryGallery<Row> kind={kind} from={from} folders={{ library: 'texts', list: folders, block: folderBlock(data.viewer) }} items={templates.map(toRow)} deleted={deleted.map(toRow)} now={now} ariaLabel="Terms and Notes templates" mayChange={(t) => templateChangeBlock(data.viewer, t.createdBy)} tableKey="text-templates"
      newMenu={(close) => (<>
        <DropdownItem onSelect={() => { close(); void create('terms') }}>Terms and Conditions</DropdownItem>
        <DropdownItem onSelect={() => { close(); void create('notes') }}>Additional Notes</DropdownItem>
      </>)}
      filters={[{ key: 'terms', label: 'Terms', test: (t) => t.kind === 'terms' }, { key: 'notes', label: 'Notes', test: (t) => t.kind === 'notes' }]} filterLabel="Kind"
      searchText={(t) => textPreview(t.body, 600)}
      thumb={(t) => <span className={styles.sheet}><span className={styles.sheetKind}>{TEXT_LABEL[t.kind as TextKind] ?? t.kind}</span><span className={styles.sheetTitle}>{t.title}</span><span className={styles.sheetText}>{textPreview(t.body, 420)}</span></span>}
      glyph={() => <span className={styles.glyph}><span className={styles.glyphTitle} /><span className={styles.glyphLines} /></span>}
      meta={(t) => textPreview(t.body, 70) || 'Empty'}
      usage={(t) => (t.usedBy === 0 ? 'Not a default anywhere' : `Default on ${t.usedBy} quote ${t.usedBy === 1 ? 'template' : 'templates'}`)}
      usageWord={(t) => (t.usedBy === 0 ? '--' : `${t.usedBy} quote template${t.usedBy === 1 ? '' : 's'}`)}
      chips={(t) => <span className={styles.kindChip}>{kindWord(t.kind)}</span>}
      columns={[
        { key: 'kind', label: 'Kind', track: '120px', cell: (t) => <span className={styles.kindChip}>{kindWord(t.kind)}</span> },
        { key: 'excerpt', label: 'Starts with', track: '320px', cell: (t) => <span className={`${styles.oneLine} ${styles.muted}`}>{textPreview(t.body, 120) || '—'}</span> },
        { key: 'used', label: 'Default on', track: '160px', sortable: true, cell: (t) => (t.usedBy > 0 ? <span>{t.usedBy} quote template{t.usedBy === 1 ? '' : 's'}</span> : <span className={styles.muted}>—</span>) },
      ]}
      onOpen={(t) => open(t.id)}
      onDuplicate={async (t) => { try { open(await newIdOf(duplicateTextTemplate(t.id))) } catch (e) { fail('duplicate the template', reasonOf(e)) } }}
      onRename={(t, name) => renameTextTemplate(t.id, name)}
      onDelete={(t) => deleteTextTemplate(t.id)}
      deleteMessage={(t) => (t.usedBy ? `${t.usedBy} quote ${t.usedBy === 1 ? 'template names' : 'templates name'} it in their Defaults — new quotes from them start without it until you pick another. Quotes that already carry the text keep it. You can restore it from Deleted Templates.` : 'Quotes that already carry the text keep it. You can restore it from Deleted Templates.')}
      onRestore={(ids) => restoreTextTemplates(ids)} onDeleteForever={(ids) => deleteTextTemplatesForever(ids)} onEmptyTrash={() => emptyTextTemplateTrash()}
      /* (verify round 3) the Deleted sheet offers only what the server allows — Restore and Delete Forever on a template the viewer wrote (or
         any, for an Owner or an Admin), the rule said in the row with its author's name; Empty Trash counts only those */
      restoreBlock={(t) => templateRestoreBlock(data.viewer, t.createdBy, t.author)} purgeRule={(t) => templatePurgeBlock(data.viewer, t.createdBy, t.author)}
      keepReason={(t) => (t.usedBy > 0 ? `${t.usedBy} quote ${t.usedBy === 1 ? 'template names' : 'templates name'} it in their Defaults — restore it instead` : null)}
      deletedMeta={{ label: 'Kind', value: (t) => kindWord(t.kind) }}
      empty={{ title: 'No text templates yet', help: 'Write Terms and Conditions or Additional Notes once, then add them to any quote from its editor’s My Templates.' }} />
  )
}
