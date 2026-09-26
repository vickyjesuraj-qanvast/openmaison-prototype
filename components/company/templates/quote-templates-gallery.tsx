'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MetaChip } from '@/components/om/meta-chip'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { useRun } from '@/components/leads/tasks/use-run'
import { TemplateThumb } from '@/components/templates/render/document'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { HouseStyleDialog } from './house-style-dialog'
import { RecreateDialog } from './recreate-dialog'
import { createTemplate, deleteTemplate, deleteTemplatesForever, duplicateTemplate, emptyTemplateTrash, renameTemplate, restoreTemplates, setDefaultTemplate } from '@/app/company/templates-actions'
import { LibraryGallery, newIdOf, reasonOf, type LibraryColumn, type LibraryItem } from './library-gallery'
import { templateKind } from '@/lib/company/sections'
import { TEMPLATE_DEFAULT_RULE, TEMPLATE_RUNNER_RULE } from '@/lib/company/template-rules'
import { FOLDER_RULE, type Folder } from '@/lib/company/folder-libraries'
import type { TemplatesData } from '@/lib/templates/queries'
import type { TemplateSummary } from '@/lib/templates/model'
import { ago } from '@/lib/templates/ago'
import { withFrom } from '@/lib/nav'
import styles from './quote-templates-gallery.module.css'
import table from './templates-table.module.css'
import { useHere } from '@/components/om/use-here'

type Row = LibraryItem & { t: TemplateSummary }

/** The one stamp the card's status line and the row's Updated column share: a published template's publish time, a draft's edit time. */
export const updatedStamp = (t: TemplateSummary) => (t.status === 'published' && !t.hasDraft ? t.publishedAt ?? t.updatedAt : t.updatedAt)
const toRow = (t: TemplateSummary): Row => ({
  id: t.id, title: t.name, createdAt: new Date(t.createdAt), updatedAt: new Date(updatedStamp(t) ?? t.createdAt),
  author: t.updatedBy?.name ?? null, authorColor: t.updatedBy?.color ?? null, usedBy: t.usedBy, deletedAt: t.deletedAt ? new Date(t.deletedAt) : null, folderId: t.folderId, t,
})
/** (REG-538) The Deleted sheet names who deleted it — a quote template keeps no author. */
const toDeletedRow = (t: TemplateSummary): Row => ({ ...toRow(t), author: (t.deletedBy ?? t.updatedBy)?.name ?? null, authorColor: (t.deletedBy ?? t.updatedBy)?.color ?? null })

/**
 * Company › Templates › Quotes (REG-485): every quote template as a card — its real first page, the status (Draft · Published vN ·
 * Default), who touched it and when, how many live quotes use it — with New ▾ (Blank · a ready-made design · upload the quote sent
 * today, REG-500) and a kebab per card. A card opens the editor.
 * (REG-664) On the shared gallery now (library-gallery.tsx, REG-538 — it was modelled on this page and the two had drifted apart): the
 * same segments, ribbons, status line and menus, plus what the other libraries already had — sorting, the portal menus, the house
 * search-empty state — and folders, the owner's ask (2026-09-25), with Move to Folder and a selection for many at once.
 */
export function QuoteTemplatesGallery({ data, from, folders = [] }: { data: TemplatesData; from?: string; folders?: Folder[] }) {
  const { templates, deleted, brand, sample, now, approval, canRun } = data
  const router = useRouter()
  const { run, fail } = useRun()
  const phone = useMediaQuery(MOBILE)
  const [houseOpen, setHouseOpen] = useState(false)
  const [recreateOpen, setRecreateOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const kind = templateKind('quotes')!
  const here = useHere('/company/templates/quotes')   // (round 3) the open folder and search ride along

  const open = (id: string) => router.push(withFrom(`/templates/${id}`, here))   /* (REG-465) Back returns here */
  /* (wave E, E7) a refusal answers { error: the rule } — said after "Couldn’t …", never an editor opened on "[object Object]" */
  const create = async (fn: () => Promise<unknown>, what: string) => {
    if (busy) return
    setBusy(true)
    try { const id = await newIdOf(fn()); router.push(`/templates/${id}`) }
    catch (e) { fail(what, reasonOf(e)) }
    finally { setBusy(false) }
  }
  const statusLine = (t: TemplateSummary) => {
    const who = t.updatedBy ? ` by ${t.updatedBy.name}` : ''
    if (t.submitted) return `Awaiting approval · ${t.submitted.by?.name ?? 'a designer'} · ${ago(t.submitted.at, now)}${t.status === 'published' ? ` · v${t.version} still prints` : ''}`   /* REG-501 */
    if (t.status === 'draft') return `Draft · edited ${ago(t.updatedAt, now)}${who}`
    /* (REG-577) With edits after the publish the line tells both in order. */
    if (t.hasDraft) return `Published v${t.version} · ${ago(t.publishedAt ?? t.updatedAt, now)} · edited ${ago(t.updatedAt, now)}${who}`
    return `Published v${t.version} · ${ago(updatedStamp(t), now)}${who}`
  }
  const usage = (t: TemplateSummary) => (t.usedBy === 0 ? 'Not used yet' : `Used by ${t.usedBy} quote${t.usedBy === 1 ? '' : 's'}`)
  const status = (t: TemplateSummary) => {
    if (t.submitted) return { word: 'Awaiting approval', tone: 'await' as const, note: `${t.submitted.by?.name ?? 'a designer'} · ${ago(t.submitted.at, now)}${t.status === 'published' ? ` · v${t.version} still prints` : ''}` }
    if (t.status === 'draft') return { word: 'Draft', tone: 'draft' as const, note: null }
    return { word: `Published v${t.version}`, tone: 'published' as const, note: t.hasDraft ? `edited since v${t.version}` : null }   /* (REG-577) */
  }
  const runner = canRun ? null : TEMPLATE_RUNNER_RULE
  /* (REG-505) The list's columns between Template and Updated: Status · Used by · Paper. */
  const columns: LibraryColumn<Row>[] = [
    { key: 'status', label: 'Status', track: '236px', sortable: (r) => (r.t.submitted ? 0 : r.t.status === 'draft' ? 1 : 2),
      cell: (r) => { const s = status(r.t); return <span className={table.status}><span className={table.statusWord} data-tone={s.tone}>{s.word}</span>{s.note ? <span className={table.statusNote}>{s.note}</span> : null}</span> } },
    { key: 'used', label: 'Used by', track: '140px', sortable: true,
      cell: (r) => (r.t.usedBy > 0 ? <Link href={`/quotes?template=${r.t.id}`} className={table.usedLink} aria-label={`Quotes on ${r.t.name}`}>{r.t.usedBy} quote{r.t.usedBy === 1 ? '' : 's'}</Link> : <span className={table.muted}>Not used yet</span>) },
    { key: 'paper', label: 'Paper', track: '96px', cell: (r) => r.t.paper },
  ]
  /* (REG-666) Each template counts once, under the status its card shows — the ribbon's order: awaiting approval first, then published
     or draft — so the choices add up to All (a submitted draft was counted twice). Awaiting approval is a to-do: its chip shows while
     something here waits. */
  const filters = [
    ...(approval === 'required' || templates.some((t) => !!t.submitted) ? [{ key: 'awaiting', label: 'Awaiting approval', test: (r: Row) => !!r.t.submitted, attention: (n: number) => `${n} awaiting approval` }] : []),
    { key: 'published', label: 'Published', test: (r: Row) => r.t.status === 'published' && !r.t.submitted },
    { key: 'draft', label: 'Drafts', test: (r: Row) => r.t.status === 'draft' && !r.t.submitted },
  ]

  return (
    <LibraryGallery<Row> kind={kind} from={from} items={templates.map(toRow)} deleted={deleted.map(toDeletedRow)} now={now} ariaLabel="Quote templates" tableKey="quote-templates"
      folders={{ library: 'quotes', list: folders, block: canRun ? null : FOLDER_RULE }}   /* canRun = an Owner or an Admin, the folder rule */
      filters={filters} filterLabel="Status"
      newMenu={(close) => (
        <>
          <DropdownItem onSelect={() => { close(); void create(() => createTemplate({ source: { kind: 'blank' } }), 'create the template') }}>Blank template</DropdownItem>
          <DropdownItem onSelect={() => { close(); setHouseOpen(true) }}>Use a ready-made design</DropdownItem>
          <DropdownDivider />
          <DropdownItem onSelect={() => { close(); setRecreateOpen(true) }}>Upload my existing quote</DropdownItem>
        </>
      )}
      thumb={(r) => (
        <>
          <span className={styles.page}><TemplateThumb design={r.t.design} brand={brand} data={sample} width={phone ? 150 : 200} /></span>
          {r.t.submitted ? <span className={styles.ribbon} data-tone="await">Awaiting approval</span> : r.t.status === 'draft' ? <span className={styles.ribbon}>Draft</span> : r.t.hasDraft ? <span className={styles.ribbon} data-tone="edits">Edited since v{r.t.version}</span> : null}
        </>
      )}
      glyph={(r) => <TemplateThumb design={r.t.design} brand={brand} data={sample} width={26} />}
      meta={(r) => statusLine(r.t)}
      usage={(r) => usage(r.t)}
      foot={(r) => <>{r.t.usedBy > 0 ? <Link href={`/quotes?template=${r.t.id}`} className={styles.usedLink} aria-label={`Quotes on ${r.t.name}`}>{usage(r.t)}</Link> : usage(r.t)} · {r.t.paper}{r.t.sourceFile ? ' · rebuilt from your quote' : ''}</>}
      chips={(r) => (r.t.isDefault ? <MetaChip>Default</MetaChip> : null)}
      columns={columns}
      onOpen={(r) => open(r.id)}
      openLabel="Edit"
      kebab={(r) => [
        { label: 'New quote from this template', onSelect: () => router.push(`/quotes?new=${r.id}`), disabled: r.t.status !== 'published', title: r.t.status !== 'published' ? 'Publish it first' : undefined },
        { label: 'Set as default', onSelect: () => { void run('set the default', () => setDefaultTemplate(r.id), `${r.t.name} is the default template`) },
          disabled: !canRun || r.t.isDefault || r.t.status !== 'published', title: !canRun ? TEMPLATE_DEFAULT_RULE : r.t.isDefault ? 'Already the default' : r.t.status !== 'published' ? 'Publish it first' : undefined },
      ]}
      onDuplicate={(r) => create(() => duplicateTemplate(r.id), 'duplicate the template')}
      onRename={(r, name) => renameTemplate(r.id, name)}
      mayChange={() => runner}
      deleteBlock={(r) => (r.t.isDefault ? 'The default can’t be deleted' : r.t.submitted ? 'Awaiting approval — approve or request changes first' : null)}
      onDelete={(r) => deleteTemplate(r.id)}
      deleteMessage={(r) => (r.t.usedBy ? `${r.t.usedBy} quote${r.t.usedBy === 1 ? ' is' : 's are'} on this template. ${r.t.usedBy === 1 ? 'It keeps' : 'They keep'} printing as ${r.t.usedBy === 1 ? 'it is' : 'they are'}; no new quote can start on it. You can restore it from Deleted Templates.` : 'No quote is on it. You can restore it from Deleted Templates.')}
      onRestore={(ids) => restoreTemplates(ids)}
      onDeleteForever={(ids) => deleteTemplatesForever(ids)}
      onEmptyTrash={() => emptyTemplateTrash()}
      keepReason={(r) => (r.t.usedBy > 0 ? `${r.t.usedBy} quote${r.t.usedBy === 1 ? ' prints' : 's print'} through it — restore it instead` : null)}
      restoreBlock={() => runner} purgeBlock={runner}
      deletedMeta={{ label: 'Version', value: (r) => (r.t.version ? `v${r.t.version}` : 'Never published') }}
      usageWord={(r) => (r.t.usedBy === 0 ? '--' : `${r.t.usedBy} quote${r.t.usedBy === 1 ? '' : 's'}`)}
      deletedByLabel="Deleted by" deletedUsageLabel="On quotes"
      empty={{ title: 'No templates yet', help: 'Use a ready-made design, or upload the quote you send today and we’ll rebuild it.' }}>
      <HouseStyleDialog open={houseOpen} brand={brand} sample={sample} onClose={() => setHouseOpen(false)}
                        onCreate={(key, name) => { setHouseOpen(false); void create(() => createTemplate({ name, source: { kind: 'preset', key } }), 'create the template') }} />
      <RecreateDialog open={recreateOpen} brand={brand} sample={sample} onClose={() => setRecreateOpen(false)}
                      onCreate={(key, name, sourceFile) => { setRecreateOpen(false); void create(() => createTemplate({ name, source: { kind: 'preset', key, sourceFile } }), 'create the template') }} />
    </LibraryGallery>
  )
}
