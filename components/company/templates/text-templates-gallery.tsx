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
/** (the calm UI build 2026-10-27, the UI audit's 4-36 · W-484) the card's one fact: its kind in sentence case — it was a capitals tag beside the
    name over the text's raw first words (the thumb above already shows the text) */
const kindLine = (k: string) => (k === 'terms' ? 'Terms and conditions' : 'Additional notes')
const usedLine = (t: TextTemplateRow) => `Default on ${t.usedBy} quote ${t.usedBy === 1 ? 'template' : 'templates'}`

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
  /* (Dane UAT 3.03) a template made inside a folder is filed there */
  const create = async (k: TextKind, folderId: string | null = null) => { try { open(await newIdOf(createTextTemplate(k, { title: 'Untitled template', body: '' }, folderId))) } catch (e) { fail('create the template', reasonOf(e)) } }

  return (
    <LibraryGallery<Row> kind={kind} from={from} folders={{ library: 'texts', list: folders, block: folderBlock(data.viewer) }} items={templates.map(toRow)} deleted={deleted.map(toRow)} now={now} ariaLabel="Terms and Notes templates" mayChange={(t) => templateChangeBlock(data.viewer, t.createdBy)} tableKey="text-templates"
      newMenu={(close, place) => (<>
        <DropdownItem onSelect={() => { close(); void create('terms', place.folderId) }}>Terms and conditions</DropdownItem>
        <DropdownItem onSelect={() => { close(); void create('notes', place.folderId) }}>Additional notes</DropdownItem>
      </>)}
      filters={[{ key: 'terms', label: 'Terms', test: (t) => t.kind === 'terms' }, { key: 'notes', label: 'Notes', test: (t) => t.kind === 'notes' }]} filterLabel="Kind"
      searchText={(t) => textPreview(t.body, 600)}
      thumb={(t) => <span className={styles.sheet}><span className={styles.sheetKind}>{TEXT_LABEL[t.kind as TextKind] ?? t.kind}</span><span className={styles.sheetTitle}>{t.title}</span><span className={styles.sheetText}>{textPreview(t.body, 420)}</span></span>}
      glyph={() => <span className={styles.glyph}><span className={styles.glyphTitle} /><span className={styles.glyphLines} /></span>}
      meta={(t) => `${kindLine(t.kind)}${textPreview(t.body, 1) ? '' : ' · empty'}`}
      usage={(t) => (t.usedBy === 0 ? 'Not a default anywhere' : usedLine(t))}
      foot={(t) => (t.usedBy ? usedLine(t) : '\u00a0')}   /* (4-36 · W-049) nothing until it is used; edited and by whom are the list's Updated · Updated by */
      usageWord={(t) => (t.usedBy === 0 ? '--' : `${t.usedBy} quote template${t.usedBy === 1 ? '' : 's'}`)}
      chips={() => null}   /* (the calm UI build 2026-10-27, the UI audit's 4-36 · T-06) the kind is the card's meta line now, in sentence case — capitals are for a status */
      listChips={() => null}   /* (REG-820) the list's Kind column says it — the tag beside the name said it twice */
      columns={[
        { key: 'kind', label: 'Kind', track: '120px', cell: (t) => <span>{kindWord(t.kind)}</span> },
        { key: 'excerpt', label: 'Starts with', track: '320px', cell: (t) => <span className={`${styles.oneLine} ${styles.muted}`}>{textPreview(t.body, 120) || '—'}</span> },
        { key: 'used', label: 'Default on', track: '160px', sortable: true, cell: (t) => (t.usedBy > 0 ? <span>{t.usedBy} quote template{t.usedBy === 1 ? '' : 's'}</span> : <span className={styles.muted}>—</span>) },
      ]}
      onOpen={(t) => open(t.id)}
      onDuplicate={async (t) => { try { open(await newIdOf(duplicateTextTemplate(t.id))) } catch (e) { fail('duplicate the template', reasonOf(e)) } }}
      onRename={(t, name) => renameTextTemplate(t.id, name)}
      onDelete={(t) => deleteTextTemplate(t.id)}
      deleteMessage={(t) => (t.usedBy ? `${t.usedBy} quote ${t.usedBy === 1 ? 'template names' : 'templates name'} it in their Defaults — new quotes from them start without it until you pick another. Quotes that already carry the text keep it. You can restore it from Deleted templates.` : 'Quotes that already carry the text keep it. You can restore it from Deleted templates.')}
      onRestore={(ids) => restoreTextTemplates(ids)} onDeleteForever={(ids) => deleteTextTemplatesForever(ids)} onEmptyTrash={() => emptyTextTemplateTrash()}
      /* (verify round 3) the Deleted sheet offers only what the server allows — Restore and Delete Forever on a template the viewer wrote (or
         any, for an Owner or an Admin), the rule said in the row with its author's name; Empty Trash counts only those */
      restoreBlock={(t) => templateRestoreBlock(data.viewer, t.createdBy, t.author)} purgeRule={(t) => templatePurgeBlock(data.viewer, t.createdBy, t.author)}
      keepReason={(t) => (t.usedBy > 0 ? `${t.usedBy} quote ${t.usedBy === 1 ? 'template names' : 'templates name'} it in their Defaults — restore it instead` : null)}
      deletedMeta={{ label: 'Kind', value: (t) => kindWord(t.kind) }}
      empty={{ title: 'No text templates yet', help: 'Write terms and conditions or additional notes once, then add them to any quote from its editor’s Templates.',
        /* (REG-735) the first run carries New ▾'s two rows, in the help's verb */
        start: () => ({ primary: { label: 'Write terms and conditions', onPress: () => { void create('terms') } }, secondary: { label: 'Write additional notes', onPress: () => { void create('notes') } } }) }} />
  )
}
