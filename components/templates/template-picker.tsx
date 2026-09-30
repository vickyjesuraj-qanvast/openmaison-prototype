'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { SegmentedIconToggle } from '@/components/om/segmented'
import { useFlagPref } from '@/lib/prefs'
import { withFrom } from '@/lib/nav'
import { MetaChip } from '@/components/om/meta-chip'
import { ToolbarSearch } from '@/components/om/toolbar-search'
import { TemplateDocument, TemplateThumb } from '@/components/templates/render/document'
import { presetLabel } from '@/lib/quotes/payments'
import { startsLine, startsWith, type PickerData, type PickerTemplate } from '@/lib/templates/picker'
import { ago } from '@/lib/templates/ago'
import { FolderCrumbs } from '@/components/om/folders/folder-crumbs'
import { countLine, foldersIn, foldersUnder, placeOf, trailTo, type FolderNode } from '@/lib/folders'
import styles from './template-picker.module.css'

/**
 * The template picker (REG-494): one component behind every "choose a template" — the Create Quote modal's View all, the
 * quote editor's Change, the Preview's template chip and the Create strip. A searchable grid of the published templates
 * drawn with the studio's kit, and beside it the one in hand, large, with what a quote from it starts with. The action
 * (Use this template) is the host modal's footer (REG-518), and New template is not offered here (REG-519).
 * (REG-664) The studio's folders, as the gallery keeps them: the picker opens where the template in hand lives, folders first, the
 * crumb and Back inside one; the studio default stays pinned at the top wherever it is filed; a search looks in every folder and says
 * where each hit lives.
 */
export function TemplatePicker({ data, picked, onPick, currentId, now, onUse, blank }: {
  data: PickerData
  /** The template shown large — the host owns it (REG-518: the action lives in the host's modal footer). */
  picked: string | null
  onPick: (templateId: string) => void
  /** The template the quote is on now — marked in the grid. */
  currentId?: string | null
  now: number
  /** A tile double-clicked — the footer's action, straight away. */
  onUse: (templateId: string) => void
  /** "Blank quote" first in the grid — only where a quote is being started. */
  blank?: { label: string; onUse: () => void } | null
}) {
  const [query, setQuery] = useState('')
  /* (REG-528) Grid or list, remembered per browser — the list shows every name in full. */
  const [listView, setListView] = useFlagPref('om.picker.list', false)
  const router = useRouter(); const pathname = usePathname(); const search = useSearchParams()
  const manage = () => router.push(withFrom('/company/templates/quotes', `${pathname}${search.size ? `?${search.toString()}` : ''}`))
  const folders = useMemo<FolderNode[]>(() => data.folders ?? [], [data.folders])
  const placeOfT = (t: PickerTemplate) => (t.folderId && folders.some((f) => f.id === t.folderId) ? t.folderId : null)
  const [at, setAt] = useState<string | null>(() => { const t = data.templates.find((x) => x.id === (picked ?? currentId)); return t && !t.isDefault && t.folderId && (data.folders ?? []).some((f) => f.id === t.folderId) ? t.folderId : null })
  const openAt = at && folders.some((f) => f.id === at) ? at : null
  const finding = query.trim() !== ''
  /* Only folders with something to pick in them (at any depth) — a picker lists published templates, so a folder of drafts is noise here. */
  const hasAny = (f: FolderNode) => { const ids = new Set([f.id, ...foldersUnder(folders, f.id)]); return data.templates.some((t) => { const p = placeOfT(t); return !!p && ids.has(p) }) }
  const hereFolders = finding ? [] : foldersIn(folders, openAt).filter(hasAny)
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) return data.templates.filter((t) => t.name.toLowerCase().includes(q))
    const inHere = data.templates.filter((t) => (t.folderId && folders.some((f) => f.id === t.folderId) ? t.folderId : null) === openAt)
    const pinned = openAt === null ? data.templates.filter((t) => t.isDefault && !inHere.includes(t)) : []   // the default, wherever it is filed
    return [...pinned, ...inHere]
  }, [data.templates, query, folders, openAt])
  const where = (t: PickerTemplate) => { const w = placeOf(folders, placeOfT(t)); return w && (finding || placeOfT(t) !== openAt) ? `${w} · ` : '' }
  const holds = (f: FolderNode) => {
    const n = data.templates.filter((t) => placeOfT(t) === f.id).length, subs = foldersIn(folders, f.id).length
    return [n || !subs ? countLine(n, 'template', 'templates') : null, subs ? countLine(subs, 'folder', 'folders') : null].filter(Boolean).join(' · ')
  }
  const go = (id: string | null) => { setAt(id); setQuery('') }
  const sel: PickerTemplate | null = data.templates.find((t) => t.id === picked) ?? null
  /* (REG-538) The payment label reads the library when the data carries it (a custom split has a name there), else the built-in presets. */
  const paymentLabel = (k: string | null) => (data.splits ? data.splits.find((s) => s.id === (k ?? 'default'))?.name ?? presetLabel(k ?? 'default') : presetLabel(k ?? 'default'))
  const words = sel ? startsWith(sel, paymentLabel, data.texts ?? []) : null
  return (
    <div className={styles.picker} data-testid="template-picker">
      <div className={styles.list}>
        <div className={styles.listHead}>
          <span className={styles.count}>{data.templates.length} template{data.templates.length === 1 ? '' : 's'}</span>
          {/* (REG-528) Manage Templates: Company › Templates › Quotes, with this page as the way back (REG-465). */}
          <Button appearance="text" iconStart={<Icon name="style" size={20} weight={300} />} onPress={manage}>Manage Templates</Button>
          <span className={styles.headEnd}>
            <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search templates" label="Search templates" />
            <SegmentedIconToggle label="View" value={listView ? 'list' : 'grid'}
                                 options={[{ value: 'list', icon: 'view_list', label: 'List view' }, { value: 'grid', icon: 'view_kanban', label: 'Grid view' }]}
                                 onChange={(v) => setListView(v === 'list')} />
          </span>
        </div>
        {!finding && openAt ? <div className={styles.crumbs}><FolderCrumbs root="All templates" trail={trailTo(folders, openAt)} onGo={go} /></div> : null}
        {listView ? (
          /* (REG-528) The list: the first page as a 26×36 glyph, the whole name, the Default chip, the version and last use. */
          <div className={styles.rows} role="listbox" aria-label="Templates">
            {hereFolders.map((f) => (
              <button key={f.id} type="button" role="option" aria-selected={false} className={styles.rowTile} data-folder onClick={() => go(f.id)} aria-label={`Open folder ${f.name}`}>
                <span className={styles.rowThumb} data-folder><Icon name="folder" size={20} weight={300} /></span>
                <span className={styles.rowName}>{f.name}</span>
                <span className={styles.rowMeta}>{holds(f)}</span>
              </button>
            ))}
            {blank && !query && !openAt ? (
              <button type="button" role="option" aria-selected={false} className={styles.rowTile} data-blank onClick={blank.onUse} aria-label={blank.label}>
                <span className={styles.rowThumb} data-blank><Icon name="add" size={20} weight={300} /></span>
                <span className={styles.rowName}>{blank.label}</span>
                <span className={styles.rowMeta}>Empty table, the studio default’s look and settings</span>
              </button>
            ) : null}
            {shown.map((t) => (
              <button key={t.id} type="button" role="option" aria-selected={picked === t.id} className={styles.rowTile} data-on={picked === t.id || undefined} onClick={() => onPick(t.id)} onDoubleClick={() => onUse(t.id)}>
                <span className={styles.rowThumb}><TemplateThumb design={t.design} brand={data.brand} data={data.sample} width={26} /></span>
                <span className={styles.rowName}>{t.name}</span>
                {t.isDefault ? <MetaChip>Default</MetaChip> : null}
                <span className={styles.rowMeta}>{where(t)}v{t.version}{currentId === t.id ? ' · on this quote' : t.lastUsedAt ? ` · used ${ago(t.lastUsedAt, now)}` : ''}</span>
              </button>
            ))}
            {shown.length === 0 && query ? <span className={styles.none}>No templates match “{query}”.</span> : null}
          </div>
        ) : (
          <div className={styles.grid} role="listbox" aria-label="Templates">
            {hereFolders.map((f) => (
              <button key={f.id} type="button" role="option" aria-selected={false} className={styles.tile} data-folder onClick={() => go(f.id)} aria-label={`Open folder ${f.name}`}>
                <span className={styles.well} data-folder><Icon name="folder" size={40} weight={300} /></span>
                <span className={styles.name}>{f.name}</span>
                <span className={styles.meta}>{holds(f)}</span>
              </button>
            ))}
            {blank && !query && !openAt ? (
              <button type="button" className={styles.tile} data-blank onClick={blank.onUse} aria-label={blank.label}>
                <span className={styles.well} data-blank><Icon name="add" size={32} weight={300} /></span>
                <span className={styles.name}>{blank.label}</span>
                <span className={styles.meta}>Empty table, the studio default’s look and settings</span>
              </button>
            ) : null}
            {shown.map((t) => (
              <button key={t.id} type="button" role="option" aria-selected={picked === t.id} className={styles.tile} data-on={picked === t.id || undefined} onClick={() => onPick(t.id)} onDoubleClick={() => onUse(t.id)}>
                <span className={styles.well}><span className={styles.page}><TemplateThumb design={t.design} brand={data.brand} data={data.sample} width={116} /></span></span>
                <span className={styles.nameRow}><span className={styles.name}>{t.name}</span>{t.isDefault ? <MetaChip>Default</MetaChip> : null}</span>
                {blank ? <span className={styles.meta} data-testid="template-starts">{startsLine(t)}</span> : null}   {/* (UX audit Q8) where a quote is being started: what it gets */}
                <span className={styles.meta}>{where(t)}v{t.version}{currentId === t.id ? ' · on this quote' : t.lastUsedAt ? ` · used ${ago(t.lastUsedAt, now)}` : ''}</span>
              </button>
            ))}
            {shown.length === 0 && query ? <span className={styles.none}>No templates match “{query}”.</span> : null}
            {shown.length === 0 && !query && openAt && hereFolders.length === 0 ? <span className={styles.none}>Nothing published in this folder yet.</span> : null}
          </div>
        )}
      </div>
      <aside className={styles.detail} aria-label={sel ? `${sel.name} preview` : 'Preview'}>
        {sel && words ? (
          <>
            <div className={styles.detailHead}>
              <span className={styles.detailName}>{sel.name}</span>
              <span className={styles.detailChips}><MetaChip>v{sel.version}</MetaChip><MetaChip>{sel.paper}</MetaChip>{sel.isDefault ? <MetaChip>Default</MetaChip> : null}</span>
            </div>
            <div className={styles.pages}><TemplateDocument design={sel.design} brand={data.brand} data={data.sample} zoom={0.42} /></div>
            <dl className={styles.facts}>
              <div><dt>Starts with</dt><dd>{words.sections}</dd></div>
              <div><dt>Items</dt><dd>{words.grouping}</dd></div>
              <div><dt>Payments</dt><dd>{words.payments}</dd></div>
              <div><dt>Terms</dt><dd>{words.validity}</dd></div>
              <div><dt>Text</dt><dd>{words.text}</dd></div>   {/* (REG-538) */}
            </dl>
          </>
        ) : (
          <div className={styles.empty}><Icon name="style" size={32} weight={300} />Pick a template to see it.</div>
        )}
      </aside>
    </div>
  )
}

/** The picker's first selection: the one asked for, else the quote's own, else the first published. */
export function defaultPick(data: PickerData, selectedId?: string | null, currentId?: string | null): string | null {
  return selectedId ?? currentId ?? data.templates[0]?.id ?? null
}
