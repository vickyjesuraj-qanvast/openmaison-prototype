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
import { startsWith, type PickerData, type PickerTemplate } from '@/lib/templates/picker'
import { ago } from '@/lib/templates/ago'
import styles from './template-picker.module.css'

/**
 * The template picker (REG-494): one component behind every "choose a template" — the Create Quote modal's View all, the
 * quote editor's Change, the Preview's template chip and the Create strip. A searchable grid of the published templates
 * drawn with the studio's kit, and beside it the one in hand, large, with what a quote from it starts with. The action
 * (Use this template) is the host modal's footer (REG-518), and New template is not offered here (REG-519).
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
  const shown = useMemo(() => { const q = query.trim().toLowerCase(); return q ? data.templates.filter((t) => t.name.toLowerCase().includes(q)) : data.templates }, [data.templates, query])
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
        {listView ? (
          /* (REG-528) The list: the first page as a 26×36 glyph, the whole name, the Default chip, the version and last use. */
          <div className={styles.rows} role="listbox" aria-label="Templates">
            {blank && !query ? (
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
                <span className={styles.rowMeta}>v{t.version}{currentId === t.id ? ' · on this quote' : t.lastUsedAt ? ` · used ${ago(t.lastUsedAt, now)}` : ''}</span>
              </button>
            ))}
            {shown.length === 0 && query ? <span className={styles.none}>No templates match “{query}”.</span> : null}
          </div>
        ) : (
          <div className={styles.grid} role="listbox" aria-label="Templates">
            {blank && !query ? (
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
                <span className={styles.meta}>v{t.version}{currentId === t.id ? ' · on this quote' : t.lastUsedAt ? ` · used ${ago(t.lastUsedAt, now)}` : ''}</span>
              </button>
            ))}
            {shown.length === 0 && query ? <span className={styles.none}>No templates match “{query}”.</span> : null}
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
