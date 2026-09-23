'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Drawer } from '@/components/om/drawer'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { useFlagPref } from '@/lib/prefs'
import { BLOCK_LABEL, ELEMENT_LABEL, isCanvas, mm, PAPER_MM, type BlockKind, type TemplateDefaults, type TemplateDesign, type TemplateStatus, type TemplateVersion } from '@/lib/templates/model'
import { EMPTY_DATA, type DocData } from '@/lib/templates/data'
import { presetByKey } from '@/lib/templates/presets'
import { parseSourceFile, type SourceFile } from '@/lib/templates/recreate'
import { ago } from '@/lib/templates/ago'
import type { TemplateEditorData } from '@/lib/templates/queries'
import { discardTemplateDraft, duplicateTemplate, loadQuoteDocData, publishTemplate, requestTemplateChanges, restoreTemplate, rollbackTemplate, saveTemplateDraft, setTemplateSource, setQuoteTemplate, updateQuoteTemplateVersion, submitTemplate } from '@/app/company/templates-actions'
import { ReviewBar, NoteDialog } from './review-bar'
import { createQuote } from '@/app/leads/quotes-actions'
import { withFrom } from '@/lib/nav'
import type { EditorOrigin } from '@/lib/templates/origin'
import { TemplateDocument, type Paginated } from '@/components/templates/render/document'
import type { Interactive, Selection } from '@/components/templates/render/canvas'
import { RecreateDialog } from '@/components/company/templates/recreate-dialog'
import { addBlock, patchBlock, patchElement, removeBlock, useHistory, type EditorDoc } from './editor-state'
import { EditorTopbar, type SourceOption, type TopbarMenuAction } from './editor-topbar'
import { StructurePane } from './structure-pane'
import { BrandPane } from './brand-pane'
import { DefaultsPane } from './defaults-pane'
import { Inspector } from './inspector'
import { PublishDialog } from './publish-dialog'
import { HistoryDrawer } from './history-drawer'
import { ReferencePane } from './reference-pane'
import { MaisonFab } from '@/components/shell/maison-fab'
import { AiSheet } from '@/components/leads/ai-sheet'
import styles from './template-editor.module.css'

type LeftTab = 'structure' | 'brand' | 'defaults'
const LEFT_TABS: LeftTab[] = ['structure', 'brand', 'defaults']
/** (REG-542) Below 1200 the two 300 / 320 panes left the page unreadably small (43% at 1025): the panes become drawers and the page takes the width. */
const NARROW = '(max-width: 1199px)'
type Source = { kind: 'sample' } | { kind: 'empty' } | { kind: 'quote'; id: string; data: DocData }
const ZOOMS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5]

/**
 * The quote template editor (REG-486; Claude Design 5a–5d / 6a–6d corrected; specs in design-source/context/quote-templates/):
 * Structure · Brand · Defaults on the left, the paginated document in the middle drawn with a real quote's data, the
 * inspector on the right. Header, footer and cover are canvases (drag, resize, type in place); the body blocks flow and
 * paginate live. Autosaved as a draft; Publish makes a version; Cmd+Z everywhere. Tablets get the panes as drawers, phones
 * read only (REG-493).
 */
export function TemplateEditor({ data, initialPreview = false, origin = null }: { data: TemplateEditorData; initialPreview?: boolean; /** (REG-495) where the editor was opened from: a quote or a lead's Create Quote */ origin?: EditorOrigin | null }) {
  const { template, brand, studio, sample, quotes, textTemplates, paymentPresets } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const compact = useMediaQuery(NARROW)
  const phone = useMediaQuery(MOBILE)
  const initial = useMemo<EditorDoc>(() => ({ design: template.draft?.design ?? template.design, defaults: template.draft?.defaults ?? template.defaults }), [template])
  const { doc, set, commit, undo, redo, canUndo, canRedo } = useHistory(initial)
  const { design, defaults } = doc
  const docRef = useRef(doc); useEffect(() => { docRef.current = doc })
  const [name, setName] = useState(template.name)
  const [meta, setMeta] = useState<{ status: TemplateStatus; version: number; isDefault: boolean; versions: TemplateVersion[]; usedBy: number; submitted: typeof template.submitted; reviewNote: string | null }>({ status: template.status, version: template.version, isDefault: template.isDefault, versions: template.versions, usedBy: template.usedBy, submitted: template.submitted, reviewNote: template.reviewNote })
  /* (REG-501) Approval: a Designer submits, an Owner / Admin approves (publishes) or requests changes. */
  const gated = data.approval === 'required' && !data.canApprove
  const [deleted, setDeleted] = useState(!!template.deletedAt)   /* (REG-502) a deleted template opens read-only-ish: no publish until Restore */
  const [submitOpen, setSubmitOpen] = useState(false)
  const [changesOpen, setChangesOpen] = useState(false)
  const [publishedJson, setPublishedJson] = useState(() => (template.status === 'draft' ? null : JSON.stringify({ design: template.design, defaults: template.defaults })))
  const [sourceFile, setSourceFile] = useState<SourceFile | null>(() => parseSourceFile(template.sourceFile))
  const [now, setNow] = useState(data.now)
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])
  /* (REG-542) The editor is an app frame pinned to the viewport (template-editor.module.css); the document behind it never scrolls, so no
     overlay, portal or transient layout can push the panes off the top of the window (owner 2026-09-23: the editor "completely broken"
     — the panes' bottoms 150px into the viewport and grey below). */
  useEffect(() => { const h = document.documentElement; const prev = h.style.overflow; h.style.overflow = 'hidden'; return () => { h.style.overflow = prev } }, [])
  const [hintSeen, setHintSeen] = useFlagPref('om.tpl.hint', false)

  /* ── autosave: the draft, 900ms after the last change ── */
  const json = useMemo(() => JSON.stringify({ design, defaults, name }), [design, defaults, name])
  const [savedJson, setSavedJson] = useState(json)
  const [save, setSave] = useState<{ at: number | null; saving: boolean; error: boolean }>({ at: template.draft?.updatedAt ?? template.updatedAt, saving: false, error: false })
  const dirty = json !== savedJson
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(async () => {
      setSave((s) => ({ ...s, saving: true }))
      try { const r = await saveTemplateDraft(template.id, { design, defaults, name, paper: design.page.paper }); setSavedJson(json); setSave({ at: r.savedAt, saving: false, error: false }) }
      catch { setSave((s) => ({ ...s, saving: false, error: true })) }
    }, 900)
    return () => clearTimeout(t)
  }, [dirty, json, design, defaults, name, template.id])
  const flush = async () => { if (json !== savedJson) { const r = await saveTemplateDraft(template.id, { design, defaults, name, paper: design.page.paper }); setSavedJson(json); setSave({ at: r.savedAt, saving: false, error: false }) } }
  const hasChanges = publishedJson === null || JSON.stringify({ design, defaults }) !== publishedJson

  /* ── the canvas ── */
  const [selection, setSelection] = useState<Selection>(null)
  const [aiOpen, setAiOpen] = useState(false)   /* (REG-507) the rail-less editor keeps its own Maison AI pair, like the quote editor */
  const [source, setSource] = useState<Source>(() => (origin?.quote ? { kind: 'quote', id: origin.quote.id, data: origin.quote.data } : { kind: 'sample' }))   // (REG-495) opened from a quote, the canvas shows that quote
  const emptyData = useMemo<DocData>(() => ({ ...EMPTY_DATA, studio }), [studio])
  const docData: DocData = source.kind === 'sample' ? sample : source.kind === 'empty' ? emptyData : source.data
  const [zoomMode, setZoomMode] = useState<'fit' | number>('fit')
  const areaRef = useRef<HTMLDivElement>(null)
  const [areaW, setAreaW] = useState(0)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => { for (const e of entries) setAreaW(e.contentRect.width) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pageW = mm(PAPER_MM[design.page.paper].w)
  const fitZoom = areaW ? Math.min(1, Math.max(0.3, (areaW - 64) / pageW)) : 0.8   // (REG-542) fit never magnifies past actual size: at 1100 the page filled the width at 125% and read as a poster
  const zoom = zoomMode === 'fit' ? fitZoom : zoomMode
  const zoomTo = (d: 'in' | 'out' | 'fit' | '100') => {
    if (d === 'fit') { setZoomMode('fit'); return }
    if (d === '100') { setZoomMode(1); return }
    const i = ZOOMS.findIndex((z) => z >= zoom - 0.001)
    const next = d === 'in' ? ZOOMS[Math.min(ZOOMS.length - 1, (i < 0 ? ZOOMS.length - 1 : i) + 1)] : ZOOMS[Math.max(0, (i < 0 ? 0 : i) - 1)]
    setZoomMode(next ?? 1)
  }
  const [paginated, setPaginated] = useState<Paginated>({ pages: 1, pageOfBlock: {} })
  const onPaginated = useCallback((p: Paginated) => setPaginated((prev) => (prev.pages === p.pages && JSON.stringify(prev.pageOfBlock) === JSON.stringify(p.pageOfBlock) ? prev : p)), [])
  const [preview, setPreview] = useState(initialPreview)
  const [underlay, setUnderlay] = useState(false)
  const [underlayOpacity, setUnderlayOpacity] = useState(0.35)

  const onDesign = useCallback((fn: (d: TemplateDesign) => TemplateDesign, opts?: { coalesce?: string }) => set((d) => { const nd = fn(d.design); return nd === d.design ? d : { ...d, design: nd } }, opts), [set])
  const onDefaults = useCallback((patch: Partial<TemplateDefaults>, coalesce?: string) => set((d) => ({ ...d, defaults: { ...d.defaults, ...patch } }), coalesce ? { coalesce: `defaults:${coalesce}` } : undefined), [set])
  /* (REG-542) Removing a block or an element answers with a snackbar and Undo — a stray Backspace on a selected Items table is one press from gone. */
  const deleteBlock = useCallback((id: string) => {
    const b = docRef.current.design.blocks.find((x) => x.id === id); if (!b) return
    setSelection(null); onDesign((d) => removeBlock(d, id))
    snackbar({ message: `${BLOCK_LABEL[b.kind]} removed`, actionLabel: 'Undo', onAction: () => undo() })
  }, [onDesign, snackbar, undo])
  const deleteElement = useCallback((blockId: string, elId: string) => {
    const b = docRef.current.design.blocks.find((x) => x.id === blockId); const el = b && isCanvas(b) ? b.elements.find((x) => x.id === elId) : null; if (!b || !el) return
    setSelection({ blockId }); onDesign((d) => patchBlock(d, blockId, (x) => (isCanvas(x) ? { ...x, elements: x.elements.filter((y) => y.id !== elId) } : x)))
    snackbar({ message: `${ELEMENT_LABEL[el.kind]} removed`, actionLabel: 'Undo', onAction: () => undo() })
  }, [onDesign, snackbar, undo])
  const dragStart = useRef<EditorDoc | null>(null)
  const interactive = useMemo<Interactive>(() => ({
    selected: selection, zoom,
    onSelect: (s) => setSelection(s),
    onMoveElement: (blockId, elId, patch, done) => {
      if (!done) { if (!dragStart.current) dragStart.current = docRef.current; set((d) => ({ ...d, design: patchElement(d.design, blockId, elId, patch) }), { transient: true }) }
      else { const before = dragStart.current; dragStart.current = null; if (before) commit(before) }
    },
    onEditText: (blockId, elId, field, text) => set((d) => ({ ...d, design: elId ? patchElement(d.design, blockId, elId, { text } as never) : patchBlock(d.design, blockId, { [field]: text } as never) })),
  }), [selection, zoom, set, commit])

  /* ── keyboard: undo / redo / delete / escape ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest?.('[role="dialog"]')) return   // a dialog / drawer owns the keys while it is up
      const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') { if (typing) return; e.preventDefault(); if (e.shiftKey) redo(); else undo(); return }
      if (mod && e.key.toLowerCase() === 'y') { if (typing) return; e.preventDefault(); redo(); return }
      if (typing) return
      if (e.key === 'Escape') { setSelection(null); return }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection) {
        e.preventDefault()
        const s = selection
        if (s.elementId) deleteElement(s.blockId, s.elementId); else deleteBlock(s.blockId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection, undo, redo, deleteBlock, deleteElement])

  /* ── panes ── */
  const [leftTab, setLeftTab] = useState<LeftTab>('structure')
  const [rightTab, setRightTab] = useState<'inspector' | 'reference'>('inspector')
  const [leftOpen, setLeftOpen] = useState(false)     // tablets: the panes as drawers
  const [rightOpen, setRightOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [matchOpen, setMatchOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const selectAndInspect = (s: Selection) => { setSelection(s); if (compact && s) { setRightTab('inspector'); setRightOpen(true) } }

  const sources: SourceOption[] = [{ key: 'sample', label: 'Sample quote', sub: `${sample.items.length} lines` }, { key: 'empty', label: 'Empty quote' }, ...(origin?.quote && !quotes.some((q) => q.id === origin.quote!.id) ? [{ key: origin.quote.id, label: `${origin.quote.number} · ${origin.quote.leadName}`, sub: origin.quote.status }] : []), ...quotes.map((q) => ({ key: q.id, label: `${q.number} · ${q.leadName}`, sub: q.status }))]
  const pickSource = async (key: string) => {
    if (key === 'sample') { setSource({ kind: 'sample' }); return }
    if (key === 'empty') { setSource({ kind: 'empty' }); return }
    try { const d = await loadQuoteDocData(key); if (d) setSource({ kind: 'quote', id: key, data: d }); else snackbar({ message: 'That quote is gone' }) }
    catch { snackbar({ message: 'Couldn’t load the quote — please try again' }) }
  }
  const sourceKey = source.kind === 'quote' ? source.id : source.kind

  const publish = async (opts: { note: string; setDefault: boolean; updateDrafts: boolean; then: 'stay' | 'origin' }) => {
    setBusy(true)
    const wasAwaiting = !!meta.submitted
    try {
      await flush()
      const r = await publishTemplate(template.id, opts)
      setMeta((m) => ({ ...m, status: 'published', version: r.version, isDefault: m.isDefault || opts.setDefault, versions: [{ version: r.version, note: opts.note || (r.version === 1 ? 'First published' : ''), publishedAt: Date.now(), publishedBy: data.me ? { name: data.me.name, color: '' } : null }, ...m.versions] }))
      setPublishedJson(JSON.stringify({ design, defaults }))
      setMeta((m) => ({ ...m, submitted: null, reviewNote: null }))
      setPublishOpen(false)
      /* (REG-495) Opened from a quote: the quote moves to this template at the new version and the editor returns to it.
         Opened from a lead's Create Quote: the quote is started on this template and the quote editor opens. */
      if (opts.then === 'origin' && origin?.quote) {
        /* Already on this template: move its pinned version only (its client switches stay); otherwise pin it here. */
        if (origin.quote.templateId === template.id) await updateQuoteTemplateVersion(origin.quote.id); else await setQuoteTemplate(origin.quote.id, template.id)
        snackbar({ message: `${name} v${r.version} published — ${origin.quote.number} updated` })
        router.push(origin.from ?? `/quotes/${origin.quote.id}`)
        return
      }
      if (opts.then === 'origin' && origin?.lead) {
        const id = await createQuote(origin.lead.id, template.id)
        snackbar({ message: `${name} published — quote started for ${origin.lead.name}` })
        router.push(withFrom(`/quotes/${id}`, origin.from))
        return
      }
      snackbar({ message: wasAwaiting ? `${name} approved and published${r.version > 1 ? ` as v${r.version}` : ''}` : r.version === 1 ? `${name} published` : `${name} v${r.version} published` })
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t publish — please try again' }) }
    finally { setBusy(false) }
  }
  /* (REG-501) The designer's side: Publish becomes Submit for approval; the owner's side: Request changes sends it back with a note. */
  const submit = async (note: string) => {
    setBusy(true)
    try { await flush(); await submitTemplate(template.id, note); setMeta((m) => ({ ...m, submitted: { by: data.me ? { name: data.me.name, color: '' } : null, at: Date.now(), note }, reviewNote: null })); setSubmitOpen(false); snackbar({ message: 'Submitted for approval' }); router.refresh() }
    catch { snackbar({ message: 'Couldn’t submit — please try again' }) }
    finally { setBusy(false) }
  }
  const requestChanges = async (note: string) => {
    setBusy(true)
    try { await requestTemplateChanges(template.id, note); setMeta((m) => ({ ...m, submitted: null, reviewNote: note || 'Changes requested' })); setChangesOpen(false); snackbar({ message: `Changes requested${meta.submitted?.by ? ` from ${meta.submitted.by.name}` : ''}` }); router.refresh() }
    catch { snackbar({ message: 'Couldn’t send the request — please try again' }) }
    finally { setBusy(false) }
  }
  const back = async () => { await flush(); router.push(origin?.from ?? '/company/templates/quotes') }   // the last edit is written before leaving
  const rollback = async (version: number) => {
    setBusy(true)
    try { await rollbackTemplate(template.id, version); snackbar({ message: `Rolled back to v${version}` }); window.location.reload() }
    catch { snackbar({ message: 'Couldn’t roll back — please try again' }); setBusy(false) }
  }
  const onMenu = async (a: TopbarMenuAction) => {
    if (a === 'gallery') { await flush(); router.push('/company/templates/quotes'); return }
    if (a === 'start') { await flush(); router.push(`/quotes?new=${template.id}`); return }   // (REG-495) Tools › Quotes opens Create Quote on this template
    if (a === 'duplicate') { setBusy(true); try { await flush(); const id = await duplicateTemplate(template.id); router.push(`/templates/${id}`) } catch { snackbar({ message: 'Couldn’t duplicate — please try again' }); setBusy(false) } return }
    if (a === 'match') { setMatchOpen(true); return }
    if (a === 'preview') { setPreview(true); return }
    if (a === 'discard') { setDiscardOpen(true) }
  }
  const discard = async () => {
    setDiscardOpen(false); setBusy(true)
    try { const r = await discardTemplateDraft(template.id); if (r.removed) { router.push('/company/templates/quotes'); return } window.location.reload() }
    catch { snackbar({ message: 'Couldn’t discard — please try again' }); setBusy(false) }
  }
  const applyMatch = async (key: 'letter' | 'scope' | 'form' | 'presentation', file: string) => {
    setMatchOpen(false)
    const p = presetByKey(key)
    onDesign(() => p.design())
    setSelection(null)
    const parsed = parseSourceFile(file)
    setSourceFile(parsed); setRightTab('reference'); if (compact) setRightOpen(true)
    try { await setTemplateSource(template.id, file) } catch { snackbar({ message: 'The reference couldn’t be kept — the design still applied' }) }
    snackbar({ message: `Matched to the ${p.name} design` })
  }
  const detachReference = async () => { setSourceFile(null); setUnderlay(false); setRightTab('inspector'); try { await setTemplateSource(template.id, null) } catch { /* the next save carries on */ } }
  const onAddBlock = (kind: BlockKind) => { const r = addBlock(design, kind, selection?.blockId ?? null); onDesign(() => r.design); setSelection({ blockId: r.id }) }   /* built outside the updater: StrictMode runs updaters twice and the ids drifted */

  const savedLabel = save.error ? 'Not saved — retrying' : dirty ? 'Unsaved changes' : `Saved ${ago(save.at, now)}`
  /* (REG-542) With nothing to publish the button says so — "Published" — instead of a greyed "Publish changes" that invites a press. */
  const upToDate = !gated && !meta.submitted && meta.status !== 'draft' && !hasChanges
  const publishLabel = gated ? (meta.submitted ? 'Awaiting approval' : meta.status === 'draft' ? 'Submit for approval' : 'Submit changes') : meta.submitted && data.canApprove ? 'Approve and publish' : meta.status === 'draft' ? 'Publish' : upToDate ? 'Published' : 'Publish changes'
  const canPublish = !busy && !deleted && (gated ? !meta.submitted && (meta.status === 'draft' || hasChanges) : meta.status === 'draft' || hasChanges || !!meta.submitted)
  const onPublishPress = () => { if (gated) setSubmitOpen(true); else setPublishOpen(true) }
  const nextVersion = meta.status === 'draft' ? 1 : meta.version + 1
  /* (REG-523) While a submission waits, the designer's canvas is locked — the owner approves what was submitted, not what changed after. Approvers may still edit. */
  const awaitingLock = !!meta.submitted && !data.canApprove
  const readOnly = phone || awaitingLock

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const onTabKey = (e: React.KeyboardEvent) => {   /* (REG-542) arrow keys walk the tabs, the way a tablist should */
    const i = LEFT_TABS.indexOf(leftTab); const next = e.key === 'ArrowRight' ? LEFT_TABS[(i + 1) % LEFT_TABS.length] : e.key === 'ArrowLeft' ? LEFT_TABS[(i + LEFT_TABS.length - 1) % LEFT_TABS.length] : null
    if (next) { e.preventDefault(); setLeftTab(next); tabRefs.current[next]?.focus() }
  }
  const left = (
    <div className={styles.pane} data-testid="left-pane">
      <div className={styles.tabs} role="tablist" aria-label="Template" onKeyDown={onTabKey}>
        {LEFT_TABS.map((t) => (
          <button key={t} ref={(el) => { tabRefs.current[t] = el }} type="button" role="tab" aria-selected={leftTab === t} tabIndex={leftTab === t ? 0 : -1} className={styles.tab} data-on={leftTab === t || undefined} onClick={() => setLeftTab(t)}>{t === 'structure' ? 'Structure' : t === 'brand' ? 'Brand' : 'Defaults'}</button>
        ))}
      </div>
      <div className={styles.paneBody} role="tabpanel">
        {leftTab === 'structure' ? <StructurePane design={design} selection={selection} pageOfBlock={paginated.pageOfBlock} pages={paginated.pages} onSelect={selectAndInspect} onDesign={onDesign} onAddBlock={onAddBlock} /> : null}
        {leftTab === 'brand' ? <BrandPane design={design} brand={brand} onDesign={onDesign} /> : null}
        {leftTab === 'defaults' ? <DefaultsPane defaults={defaults} textTemplates={textTemplates} paymentPresets={paymentPresets} onChange={onDefaults} /> : null}
      </div>
    </div>
  )
  const right = (
    <div className={styles.pane} data-testid="right-pane">
      {sourceFile ? (
        <div className={styles.tabs} role="tablist" aria-label="Details">
          <button type="button" role="tab" aria-selected={rightTab === 'inspector'} className={styles.tab} data-on={rightTab === 'inspector' || undefined} onClick={() => setRightTab('inspector')}>Edit</button>
          <button type="button" role="tab" aria-selected={rightTab === 'reference'} className={styles.tab} data-on={rightTab === 'reference' || undefined} onClick={() => setRightTab('reference')}>Reference</button>
        </div>
      ) : null}
      <div className={styles.paneBody}>
        {rightTab === 'reference' && sourceFile ? <ReferencePane file={sourceFile} underlay={underlay} onUnderlay={setUnderlay} opacity={underlayOpacity} onOpacity={setUnderlayOpacity} onDetach={() => { void detachReference() }} />
          : <Inspector design={design} brand={brand} selection={selection} onDesign={onDesign} onSelect={setSelection} onDeleteBlock={deleteBlock} onDeleteElement={deleteElement} />}
      </div>
    </div>
  )

  return (
    <div className={styles.editor} data-preview={preview || undefined} data-readonly={readOnly || undefined}>
      <EditorTopbar name={name} onName={setName} status={meta.status} version={meta.version} isDefault={meta.isDefault} hasChanges={meta.status !== 'draft' && hasChanges} savedLabel={savedLabel} saving={save.saving} pages={paginated.pages}
                    source={sourceKey} sources={sources} onSource={(k) => { void pickSource(k) }} zoomLabel={`${Math.round(zoom * 100)}%`} onZoom={zoomTo}
                    canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} onHistory={() => setHistoryOpen(true)} preview={preview || readOnly} readOnly={readOnly} onPreview={setPreview}
                    onMenu={(a) => { void onMenu(a) }} publishLabel={publishLabel} canPublish={canPublish} onPublish={onPublishPress} onBack={() => { void back() }} hasReference={!!sourceFile} compact={compact}
                    originLabel={origin?.quote ? `Editing for ${origin.quote.number} · ${origin.quote.leadName}` : origin?.lead ? `For ${origin.lead.name}` : null} backLabel={origin?.quote ? `Back to ${origin.quote.number}` : origin?.lead ? `Back to ${origin.lead.name}` : 'Back to Quote templates'} canStart={meta.status === 'published'} />
      {/* (REG-542) A one-line orientation for the first visits, dismissed for good with Got it. */}
      {!readOnly && !preview && !deleted && !hintSeen ? (
        <div className={styles.hint} role="note" data-testid="editor-hint">
          <Icon name="info" size={20} weight={300} />
          <span className={styles.hintText}>Click any part of the page to change it on the right. Everything is saved as you go — press <b>Publish</b> when it looks right.</span>
          <Button appearance="text" onPress={() => setHintSeen(true)}>Got it</Button>
        </div>
      ) : null}
      {readOnly ? <div className={styles.readOnlyNote}><Icon name="info" size={16} weight={300} /> {awaitingLock && !phone ? 'Awaiting approval — the design is locked until it is published or changes are requested.' : 'Templates are edited on a tablet or computer. This is a view.'}</div> : null}
      {deleted ? (
        <div className={styles.readOnlyNote} data-testid="deleted-bar"><Icon name="delete" size={16} weight={300} /> This template is deleted — the {meta.usedBy ? `${meta.usedBy} quote${meta.usedBy === 1 ? '' : 's'} on it keep` : 'quotes on it would keep'} printing v{meta.version}. <Button appearance="text" isDisabled={busy} onPress={() => { setBusy(true); void restoreTemplate(template.id).then(() => { setDeleted(false); snackbar({ message: `${name} restored` }); router.refresh() }).catch(() => snackbar({ message: 'Couldn’t restore — please try again' })).finally(() => setBusy(false)) }}>Restore</Button></div>
      ) : null}
      {!readOnly && !deleted && (meta.submitted || meta.reviewNote) ? (
        <ReviewBar submitted={meta.submitted} reviewNote={meta.reviewNote} canApprove={data.canApprove} now={now} busy={busy} onApprove={() => setPublishOpen(true)} onRequestChanges={() => setChangesOpen(true)} onDismissNote={() => setMeta((m) => ({ ...m, reviewNote: null }))} />
      ) : null}
      <div className={styles.body}>
        {!preview && !compact ? <aside className={styles.left}>{left}</aside> : null}
        <div ref={areaRef} className={styles.area} data-testid="canvas-area">
          {compact && !preview && !readOnly ? (
            <div className={styles.paneToggles}>
              <Button appearance="outlined" variant="secondary" iconStart={<Icon name="view_list" size={20} />} onPress={() => setLeftOpen(true)}>Structure</Button>
              <Button appearance="outlined" variant="secondary" iconStart={<Icon name="tune" size={20} />} onPress={() => setRightOpen(true)}>{selection ? 'Edit selection' : 'Edit'}</Button>
            </div>
          ) : null}
          <div className={styles.stage} onPointerDown={(e) => { if (e.target === e.currentTarget) setSelection(null) }}>
            <TemplateDocument design={design} brand={brand} data={docData} zoom={zoom} interactive={preview || readOnly ? undefined : interactive} onPaginated={onPaginated}
                              underlay={underlay && sourceFile?.data ? { src: sourceFile.data, opacity: underlayOpacity } : null} />
          </div>
        </div>
        {!preview && !compact ? <aside className={styles.right}>{right}</aside> : null}
      </div>
      {compact ? <>
        <Drawer open={leftOpen} onClose={() => setLeftOpen(false)} title="Template" label="Template panes" width={360}>{left}</Drawer>
        <Drawer open={rightOpen} onClose={() => setRightOpen(false)} title={rightTab === 'reference' ? 'Reference' : 'Edit'} label="Edit the selection" width={360}>{right}</Drawer>
      </> : null}
      <PublishDialog open={publishOpen} onClose={() => setPublishOpen(false)} name={name} nextVersion={nextVersion} isDefault={meta.isDefault} usedBy={meta.usedBy} busy={busy} onPublish={(o) => { void publish(o) }}
                     origin={origin?.quote && origin.quote.status !== 'Draft' ? null : origin?.quote ? { kind: 'quote', label: `${origin.quote.number} · ${origin.quote.leadName}` } : origin?.lead ? { kind: 'lead', label: origin.lead.name } : null}
                     approve={meta.submitted ? { by: meta.submitted.by?.name ?? 'A designer', note: meta.submitted.note } : null} />
      <NoteDialog open={submitOpen} title="Submit for approval" label="What changed" help="An Owner or Admin sees this with the template, then approves and publishes it or asks for changes." action="Submit" busy={busy} onClose={() => setSubmitOpen(false)} onSubmit={(n) => { void submit(n) }} />
      <NoteDialog open={changesOpen} title="Request changes" label="What to change" help={`Goes back to ${meta.submitted?.by?.name ?? 'the designer'} at the top of their editor. The template stays as it is until they submit again.`} action="Send request" busy={busy} onClose={() => setChangesOpen(false)} onSubmit={(n) => { void requestChanges(n) }} />
      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} versions={meta.versions} current={meta.version} now={now} busy={busy} canRollback={!gated && !deleted} onRollback={(v) => { setHistoryOpen(false); void rollback(v) }} />
      <RecreateDialog open={matchOpen} brand={brand} sample={sample} onClose={() => setMatchOpen(false)} onCreate={(k, _n, f) => { void applyMatch(k, f) }} applyLabel="Apply to this template" title="Upload your existing quote" />
      <ConfirmDialog open={discardOpen} title={meta.status === 'draft' ? 'Delete this draft?' : 'Discard unpublished changes?'} confirmLabel={meta.status === 'draft' ? 'Delete' : 'Discard'}
                     message={meta.status === 'draft' ? 'The template was never published; deleting it can’t be undone.' : `The template goes back to v${meta.version} as published. Your unpublished edits are lost.`}
                     onCancel={() => setDiscardOpen(false)} onConfirm={() => { void discard() }} />
      <AiSheet open={aiOpen} suggestions={[]} onSelect={() => { setAiOpen(false); comingSoon() }} onClose={() => setAiOpen(false)} />
      <MaisonFab onPress={() => setAiOpen((o) => !o)} />
    </div>
  )
}
