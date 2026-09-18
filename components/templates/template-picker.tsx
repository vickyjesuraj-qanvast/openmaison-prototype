'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
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
 * drawn with the studio's kit, and beside it the one in hand, large, with what a quote from it starts with and one button.
 */
export function TemplatePicker({ data, selectedId, currentId, now, useLabel = 'Use this template', onUse, onNew, blank }: {
  data: PickerData
  /** The template shown large at first (a tile's Preview, the quote's own template). */
  selectedId?: string | null
  /** The template the quote is on now — marked, and its button reads differently. */
  currentId?: string | null
  now: number
  useLabel?: string
  onUse: (templateId: string) => void
  /** "New template" at the end of the grid: the house-style chooser (the caller decides where that leads). */
  onNew?: () => void
  /** "Blank quote" first in the grid — only where a quote is being started. */
  blank?: { label: string; onUse: () => void } | null
}) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string | null>(selectedId ?? currentId ?? data.templates[0]?.id ?? null)
  const shown = useMemo(() => { const q = query.trim().toLowerCase(); return q ? data.templates.filter((t) => t.name.toLowerCase().includes(q)) : data.templates }, [data.templates, query])
  const sel: PickerTemplate | null = data.templates.find((t) => t.id === picked) ?? null
  const words = sel ? startsWith(sel, (k) => presetLabel(k ?? 'default')) : null
  return (
    <div className={styles.picker} data-testid="template-picker">
      <div className={styles.list}>
        <div className={styles.listHead}>
          <span className={styles.count}>{data.templates.length} template{data.templates.length === 1 ? '' : 's'}</span>
          <ToolbarSearch query={query} onQuery={setQuery} placeholder="Search templates" label="Search templates" />
        </div>
        <div className={styles.grid} role="listbox" aria-label="Templates">
          {blank && !query ? (
            <button type="button" className={styles.tile} data-blank onClick={blank.onUse} aria-label={blank.label}>
              <span className={styles.well} data-blank><Icon name="add" size={32} weight={300} /></span>
              <span className={styles.name}>{blank.label}</span>
              <span className={styles.meta}>Empty table, the studio default’s look</span>
            </button>
          ) : null}
          {shown.map((t) => (
            <button key={t.id} type="button" role="option" aria-selected={picked === t.id} className={styles.tile} data-on={picked === t.id || undefined} onClick={() => setPicked(t.id)} onDoubleClick={() => onUse(t.id)}>
              <span className={styles.well}><span className={styles.page}><TemplateThumb design={t.design} brand={data.brand} data={data.sample} width={116} /></span></span>
              <span className={styles.nameRow}><span className={styles.name}>{t.name}</span>{t.isDefault ? <MetaChip>Default</MetaChip> : null}</span>
              <span className={styles.meta}>v{t.version}{currentId === t.id ? ' · on this quote' : t.lastUsedAt ? ` · used ${ago(t.lastUsedAt, now)}` : ''}</span>
            </button>
          ))}
          {onNew && !query ? (
            <button type="button" className={styles.tile} data-new onClick={onNew} aria-label="New template">
              <span className={styles.well} data-blank><Icon name="add" size={32} weight={300} /></span>
              <span className={styles.name}>New template</span>
              <span className={styles.meta}>A ready-made design, or your existing quote</span>
            </button>
          ) : null}
          {shown.length === 0 && query ? <span className={styles.none}>No templates match “{query}”.</span> : null}
        </div>
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
            </dl>
            <div className={styles.detailFoot}>
              {currentId === sel.id ? <Button appearance="outlined" variant="secondary" isDisabled>On this quote</Button> : <Button onPress={() => onUse(sel.id)}>{useLabel}</Button>}
            </div>
          </>
        ) : (
          <div className={styles.empty}><Icon name="style" size={32} weight={300} />Pick a template to see it.</div>
        )}
      </aside>
    </div>
  )
}
