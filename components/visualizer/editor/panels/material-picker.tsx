'use client'

import { useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { SearchBar } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { BRAND_CATEGORIES, CATALOGUE, GENERIC_CATEGORIES, searchCatalogue, suggestMaterials, type CatalogueCategory } from '@/lib/visualizer/catalogue'
import { chipCss, fromCatalogue, resolveMaterial, type LibraryMaterial, type OwnSwatch } from '@/lib/visualizer/materials'
import type { MaterialRef } from '@/lib/visualizer/model'
import type { PatternKind } from '@/lib/visualizer/patterns'
import { finishChip } from '../dialogs/version-facts'
import styles from './panels.module.css'

/* A studio material as the render reads it (critic 13: a laid one — boards, tiles — wears the pattern its words name, F187) */
const libRef = (m: LibraryMaterial, library: LibraryMaterial[]): MaterialRef => resolveMaterial(`lib:${m.id}`, library, []) ?? { id: `lib:${m.id}`, name: m.name, hex: m.hex, finish: 'matte', imageUrl: m.imageUrl, category: m.category, source: 'library' }
const ownRef = (m: OwnSwatch, own: OwnSwatch[]): MaterialRef => resolveMaterial(`own:${m.id}`, [], own) ?? { id: `own:${m.id}`, name: m.name, hex: m.hex, finish: 'matte', imageUrl: m.imageUrl, category: m.category, source: 'design' }
const BRAND_PREVIEW = 12

/* (F087) A printed motif — a wallpaper's leaves, a tile's bond — wears the very tile the engine lays on the wall and the moodboard prints,
   at its real repeat, not the CSS sketch of it; a texture (marble, boards, concrete) keeps its CSS chip, which reads the same and costs
   nothing to draw. The tile is drawn in the browser, so the page's first paint (and the server's) wears the CSS chip. */
const TILED = new Set<PatternKind>(['stripe', 'geometric', 'wave', 'floral', 'botanical', 'deco', 'brick', 'subway', 'grid', 'hex', 'fishscale', 'penny', 'basketweave', 'mosaic', 'zellige', 'herringbone', 'chevron', 'cement'])
const noop = () => () => {}
/** A material's chip as a CSS background — the rail's rows and the picker's swatches read the same one. */
export function useSwatchCss() {
  const drawn = useSyncExternalStore(noop, () => true, () => false)
  /* `maxPx` caps a motif's repeat on a small chip (the Surfaces rows' 20px dot shows two repeats, not one stripe) */
  return (m: Pick<MaterialRef, 'hex' | 'pattern' | 'imageUrl'>, maxPx?: number): string => (drawn && !m.imageUrl && m.pattern && TILED.has(m.pattern.kind) ? finishChip({ hex: m.hex, pattern: m.pattern }, null, maxPx) : chipCss(m))
}

/** One swatch: the colour or the photo, the name, a tick when it is the pick, *Now* when it is what the photo shows, (F027) *Some*
    when it is picked for part of the scope. (gallery-1) `edited` — it is what the photo shows, but renamed or recoloured since in
    Materials: recoloured, it is tagged *Edited*, not *Now* (picking it lays today's colour), and its tooltip says so. */
export function Swatch({ m, on, now, some = false, edited = null, onPick, onRemove, sub }: { m: MaterialRef; on: boolean; now?: boolean; some?: boolean; edited?: string | null; onPick: () => void; onRemove?: () => void; sub?: string }) {
  const css = useSwatchCss()
  const changed = !!now && !!edited && edited.includes('recoloured')
  const tip = [m.name, sub, now && edited ? (changed ? `${edited} since this version — picking it lays the new colour` : `${edited} since this version`) : null].filter(Boolean).join(' · ')
  return (
    <Tooltip label={tip}>
      <span className={styles.swWrap} data-on={on || undefined}>
        <button type="button" className={styles.swatch} onClick={onPick} aria-pressed={on} aria-label={m.name} data-testid="viz-swatch">
          <span className={styles.chip} style={{ ['--sw' as string]: css(m) } as CSSProperties}>
            {on ? <span className={styles.check}><Icon name="done" size={14} /></span> : null}
            {some && !on ? <span className={styles.someTag}>Some</span> : now && !on ? <span className={styles.nowTag}>{changed ? 'Edited' : 'Now'}</span> : null}
          </span>
          <span className={styles.swName}>{m.name}</span>
        </button>
        {onRemove ? <span className={styles.swRemove}><IconButton icon="close" label={`Remove ${m.name}`} size={24} variant="bare" iconSize={16} onClick={onRemove} /></span> : null}
      </span>
    </Tooltip>
  )
}

/**
 * The material picker (REG-674; 1.0's MaterialsPanel + the phone's MaterialBrowser, B-61 · B-73): search; *As in the photo* (1.0's
 * None — the surface is left alone); *Suggested for {surface} · {style}* (1.0's `suggestMaterials`); Recent; the studio's materials
 * and this design's own swatches with Upload; the categories this surface takes first; the Gush brand books folded to twelve.
 */
export function MaterialPicker({ scope, categories, style, pick, mixed = false, partial = [], now, kept = null, nowEdited = null, onPick, library, own, recent, onUpload, onRemoveOwn, keepWords = null, styleHint }: {
  scope: string
  categories: CatalogueCategory[]
  style: string
  pick: string | null
  /** (F027) The scope's surfaces don't share one pick — *As in the photo* isn't ticked (pressing it still clears them all). */
  mixed?: boolean
  /** (F027) The finishes picked for part of the scope — tagged *Some*. */
  partial?: string[]
  now: string | null
  /** (gallery-1) The finish the version laid, as it laid it — *As in the photo* wears its chip and its name. */
  kept?: { name: string; css: string | null } | null
  /** (gallery-1) The kept material changed in Materials since: 'renamed' · 'recoloured' · 'renamed and recoloured'. */
  nowEdited?: string | null
  onPick: (id: string | null) => void
  library: LibraryMaterial[]
  own: OwnSwatch[]
  recent: string[]
  /** (gaps build J) absent — the 3D Space Planner's finishes: no upload line or tile (a studio's own sample goes in through Company › Materials) */
  onUpload?: (category: string | null) => void
  onRemoveOwn: (id: string) => void
  /** (gaps build J) the keep row's words where there is no photo — the planner's "Template colour" */
  keepWords?: { name: string; caption: string } | null
  /** (gaps build J) the line where no style is picked; null says nothing */
  styleHint?: string | null
}) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('All')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const order = useMemo(() => [...categories.filter((c) => GENERIC_CATEGORIES.includes(c)), ...GENERIC_CATEGORIES.filter((c) => !categories.includes(c))], [categories])
  const suggested = useMemo(() => suggestMaterials(scope, style, 6).map(fromCatalogue), [scope, style])
  /* (critic 13) Recent keeps what was picked — the studio's own materials and this design's swatches too, not only the catalogue's */
  const recentRefs = useMemo(() => recent.map((id) => resolveMaterial(id, library, own)).filter((m): m is MaterialRef => !!m).slice(0, 8), [recent, library, own])
  const studio = useMemo(() => [...own.map((m) => ownRef(m, own)), ...library.filter((m) => !categories.length || categories.includes(m.category as CatalogueCategory) || !GENERIC_CATEGORIES.includes(m.category as CatalogueCategory)).map((m) => libRef(m, library))], [own, library, categories])
  const query = q.trim()
  const found = useMemo(() => (query ? searchCatalogue(query).map(fromCatalogue) : []), [query])
  const foundStudio = query ? [...own.map((m) => ownRef(m, own)), ...library.map((m) => libRef(m, library))].filter((m) => `${m.name} ${m.category}`.toLowerCase().includes(query.toLowerCase())) : []
  const tile = (m: MaterialRef, sub?: string, remove?: () => void) => <Swatch key={m.id} m={m} on={pick === m.id} now={now === m.id} edited={now === m.id ? nowEdited : null} some={partial.includes(m.id)} onPick={() => onPick(m.id)} onRemove={remove} sub={sub} />
  const keepOn = pick === null && !mixed
  const section = (title: string, list: MaterialRef[], extra?: React.ReactNode, count?: string) => (list.length || extra ? (
    <div className={styles.section} key={title}>
      <span className={styles.head}><span>{title}</span>{count ? <span className={styles.headCount}>{count}</span> : null}</span>
      <div className={styles.grid}>{list.map((m) => tile(m, CATALOGUE.find((c) => c.id === m.id)?.subcategory))}{extra}</div>
    </div>
  ) : null)
  return (
    <>
      <span className={styles.search}><SearchBar appearance="outlined" size="md" placeholder={`Search ${CATALOGUE.length + library.length} materials`} aria-label="Search materials" value={q} onChange={setQ} /></span>
      {/* (REG-682; the testers' sheet row 200) the studio's own sample, one press away — not only a tile further down */}
      {onUpload ? <button type="button" className={styles.uploadLine} onClick={() => onUpload(categories[0] ?? null)} data-testid="viz-upload-line"><Icon name="add_photo_alternate" size={20} weight={300} /><span><b>Have a sample?</b> Upload a photo of it — it renders in its own colour</span></button> : null}
      <button type="button" className={styles.keep} data-on={keepOn || undefined} aria-pressed={keepOn} onClick={() => onPick(null)} data-testid="viz-keep">
        <span className={styles.dotSwatch} data-none={kept?.css ? undefined : ''} style={kept?.css ? { ['--sw' as string]: kept.css } as CSSProperties : undefined} />
        <span className={styles.texts}><span className={styles.name}>{keepWords?.name ?? 'As in the photo'}</span><span className={styles.caption}>{keepWords ? keepWords.caption : mixed ? 'Leave all of them as they are' : kept?.name ? `${kept.name} — leave this surface as it is` : 'Leave this surface as it is'}</span></span>
        {keepOn ? <Icon name="check_circle" size={20} fill /> : null}
      </button>
      {query ? (
        <>
          {section('Your studio', foundStudio)}
          {found.length ? section('Results', found.slice(0, 80), undefined, `${found.length}`) : !foundStudio.length ? <span className={styles.none}>Nothing matches “{query}”.</span> : null}
        </>
      ) : (
        <>
          {style ? section(`Suggested · ${style}`, suggested) : styleHint === null ? null : <span className={styles.hint}>{styleHint ?? 'Pick a style (the Style tab) and the materials that suit it lead here.'}</span>}
          {section('Recent', recentRefs)}
          <div className={styles.section}>
            <span className={styles.head}><span>Your studio</span></span>
            <div className={styles.grid}>
              {onUpload ? <Tooltip label="Upload a photo of a swatch">
                <button type="button" className={`${styles.swatch} ${styles.upload}`} onClick={() => onUpload(categories[0] ?? null)} data-testid="viz-upload-swatch">
                  <span className={styles.chip}><Icon name="upload" size={22} weight={300} /></span><span className={styles.swName}>Upload a swatch</span>
                </button>
              </Tooltip> : null}
              {studio.map((m) => tile(m, m.source === 'design' ? 'this design' : `${m.category} · studio`, m.source === 'design' ? () => onRemoveOwn(m.id.slice(4)) : undefined))}
            </div>
          </div>
          <Chips label="Categories" options={['All', ...order]} value={cat} onChange={setCat} />
          {(cat === 'All' ? order : [cat as CatalogueCategory]).map((c) => section(c, CATALOGUE.filter((m) => m.category === c).map(fromCatalogue), undefined, `${CATALOGUE.filter((m) => m.category === c).length}`))}
          {cat === 'All' || cat === 'Paints' ? BRAND_CATEGORIES.map((b) => {
            const all = CATALOGUE.filter((m) => m.category === b).map(fromCatalogue)
            const shown = open[b] ? all : all.slice(0, BRAND_PREVIEW)
            return (
              <div className={styles.section} key={b}>
                <span className={styles.head}><span>{b}</span><span className={styles.headCount}>{all.length}</span></span>
                <div className={styles.grid}>{shown.map((m) => tile(m, CATALOGUE.find((c) => c.id === m.id)?.subcategory))}</div>
                <button type="button" className={styles.more} onClick={() => setOpen((o) => ({ ...o, [b]: !o[b] }))}>{open[b] ? 'Show fewer' : `Show all ${all.length}`}</button>
              </div>
            )
          }) : null}
        </>
      )}
    </>
  )
}
