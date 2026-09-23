'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs } from '@/components/om/crumbs'
import { TextField } from '@/components/om/text-field'
import { useCopy } from '@/components/om/use-copy'
import { useSnackbar } from '@/components/om/snackbar'
import { withFrom } from '@/lib/nav'
import { mm, PAPER_MM, ITEM_COLUMN_LABEL, type ItemsColumnKey } from '@/lib/templates/model'
import { docTotals } from '@/lib/templates/data'
import { money2 } from '@/lib/quotes/math'
import { readiness, type ReadinessSection } from '@/lib/templates/readiness'
import { clientViewDiff, type ClientView } from '@/lib/templates/client-view'
import { fallbackDesignClient } from '@/lib/templates/presets'
import type { QuotePreviewData } from '@/lib/templates/queries'
import { saveQuoteClientView, setQuoteTemplate } from '@/app/company/templates-actions'
import { Dialog } from '@/components/om/dialog'
import { TABLET_DOWN, useMediaQuery } from '@/lib/breakpoint'
import { Drawer } from '@/components/om/drawer'
import { TemplatePicker, defaultPick } from '@/components/templates/template-picker'
import { sendQuote } from '@/app/quotes/actions'
import { setQuoteTextVisible } from '@/app/quotes/text-actions'
import { TemplateDocument, type Paginated } from '@/components/templates/render/document'
import styles from './quote-preview.module.css'

const SECTION_ANCHOR: Record<ReadinessSection, string> = { general: 'general', items: 'items', payments: 'payment', terms: 'terms', notes: 'notes', signature: 'signature' }
const VIEW_ROWS: { key: keyof Omit<ClientView, 'columns' | 'hiddenItems'>; label: string; help: string }[] = [
  { key: 'descriptions', label: 'Item descriptions', help: 'The lines under each item name' },
  { key: 'photos', label: 'Item photos', help: 'Thumbnails beside the items' },
  { key: 'optionalWorks', label: 'Optional works', help: 'Lines marked optional, in their own section' },
  { key: 'subtotalBreakdown', label: 'Subtotal and discounts', help: 'Off shows only the grand total' },
  { key: 'paymentSchedule', label: 'Payment schedule', help: '' },
  { key: 'terms', label: 'Terms and Conditions', help: '' },
  { key: 'notes', label: 'Additional notes', help: '' },
  { key: 'signature', label: 'Signature block', help: '' },
  { key: 'branding', label: '“Powered by OpenMaison”', help: 'The line at the foot of the last page' },
]

/**
 * Preview (REG-490): the quote exactly as its client will see it — through its template at the pinned version, with the
 * quote's own "What your client sees" switches — plus what is still missing before it is sent, an internal copy with the
 * cost and margin the client never sees, Copy link, Download PDF (the same pages, printed) and Send. `?print=1` prints.
 */
export function QuotePreview({ data, from, print }: { data: QuotePreviewData; from?: string; print: boolean }) {
  const { quote, template, brand, baseView } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const design = useMemo(() => template?.design ?? fallbackDesignClient(), [template])
  const [view, setView] = useState<ClientView>(data.view)
  const [internal, setInternal] = useState(false)
  const [panel, setPanel] = useState(false)
  const tabletDown = useMediaQuery(TABLET_DOWN)
  const [pickerOpen, setPickerOpen] = useState(false)   /* (REG-496) the template chip opens the picker; a change re-pins and re-renders */
  const [status, setStatus] = useState(quote.status)
  const [busy, setBusy] = useState(false)
  const ready = useMemo(() => readiness(data.data, design, view), [data.data, design, view])
  const totals = useMemo(() => docTotals(data.data), [data.data])
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}/quotes/${quote.id}/preview`
  const { copied, copy } = useCopy(link, { done: 'Preview link copied' })

  /* The quote's switches autosave 600ms after the last change, as the difference from the template's own view. */
  const saved = useRef(JSON.stringify(data.view))
  useEffect(() => {
    const json = JSON.stringify(view)
    if (json === saved.current) return
    const t = setTimeout(async () => { try { await saveQuoteClientView(quote.id, view, design); saved.current = json } catch { snackbar({ message: 'Couldn’t save the client view — please try again' }) } }, 600)
    return () => clearTimeout(t)
  }, [view, quote.id, design, snackbar])

  /* Fit the page to the column, never above 1:1. */
  const areaRef = useRef<HTMLDivElement>(null)
  const [areaW, setAreaW] = useState(0)
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver((es) => { for (const e of es) setAreaW(e.contentRect.width) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pageW = mm(PAPER_MM[design.page.paper].w)
  const zoom = print ? 1 : areaW ? Math.min(1, Math.max(0.3, (areaW - 48) / pageW)) : 0.9
  const [pages, setPages] = useState(0)
  const onPaginated = useCallback((p: Paginated) => setPages(p.pages), [])
  const printed = useRef(false)
  useEffect(() => { if (print && pages > 0 && !printed.current) { printed.current = true; const t = setTimeout(() => window.print(), 300); return () => clearTimeout(t) } }, [print, pages])

  const canSend = status === 'Draft' || status === 'Approved'
  const send = async () => {
    setBusy(true)
    try { const r = await sendQuote(quote.id); setStatus(r.status); snackbar({ message: `Quote marked ${r.status}` }); router.refresh() }
    catch { snackbar({ message: 'Couldn’t send the quote — please try again' }) }
    finally { setBusy(false) }
  }
  const back = withFrom(`/quotes/${quote.id}`, from)
  const changed = clientViewDiff(view, baseView).length
  const columns = (Object.keys(view.columns) as ItemsColumnKey[]).filter((k) => baseView.columns[k] || view.columns[k])

  /* (REG-518) The picker's selection lives here; the dialog footer acts on it. */
  const [pickedTpl, setPickedTpl] = useState<string | null>(null)
  const pickerSel = defaultPick(data.picker, pickedTpl, template?.id ?? null)
  const applyTemplate = (id: string) => { setPickerOpen(false); setPickedTpl(null); setBusy(true); void setQuoteTemplate(quote.id, id).then(() => { snackbar({ message: 'Template changed' }); router.refresh() }).catch(() => snackbar({ message: 'Couldn’t change the template — please try again' })).finally(() => setBusy(false)) }

  return (
    <div className={styles.page} data-print={print || undefined} data-testid="quote-preview">
      <style>{`@page { size: ${design.page.paper}; margin: 0 }`}</style>
      <header className={styles.bar}>
        <Tooltip label="Back to the editor"><IconButton icon="arrow_back" label="Back to the editor" size={36} variant="bare" iconSize={24} iconWeight={300} onClick={() => router.push(back)} /></Tooltip>
        <div className={styles.titleBlock}>
          <Crumbs className={styles.crumb} items={[{ label: quote.leadName, href: `/leads/${quote.leadId}/quotes` }, { label: quote.number, href: back }]} />   {/* (REG-536) */}
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Preview</h1>
            <span className={styles.chips}>
              <button type="button" className={styles.templateChip} onClick={() => setPickerOpen(true)} aria-haspopup="dialog" aria-label="Change template"><Icon name="style" size={14} weight={300} /> {template ? `${template.name} · v${template.version}` : 'Studio default'} <Icon name="keyboard_arrow_down" size={16} /></button>
              <MetaChip>{status}</MetaChip>
              {pages ? <MetaChip>{pages} page{pages === 1 ? '' : 's'}</MetaChip> : null}
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          <label className={styles.internal}><Switch size="sm" isSelected={internal} onChange={(v: boolean) => setInternal(v)} aria-label="Internal copy" /> Internal copy</label>
          <Button appearance="outlined" variant="secondary" iconStart={<Icon name="visibility" size={20} />} onPress={() => setPanel((o) => !o)} aria-pressed={panel}>What your client sees{changed ? ` · ${changed}` : ''}</Button>
          <Button appearance="outlined" variant="secondary" iconStart={<Icon name={copied ? 'check' : 'link'} size={20} />} onPress={() => { void copy() }}>{copied ? 'Copied' : 'Copy link'}</Button>
          <Button appearance="outlined" variant="secondary" iconStart={<Icon name="download" size={20} />} onPress={() => window.print()}>Download PDF</Button>
          {canSend ? <Button onPress={() => { void send() }} isDisabled={busy || !ready.ready}>Send</Button> : <Tooltip label={`Quote is ${status}`}><span><Button isDisabled>Send</Button></span></Tooltip>}
        </div>
      </header>
      <Dialog open={pickerOpen} onClose={() => { setPickerOpen(false); setPickedTpl(null) }} title="Choose a template" size="modal" width={1200} portal subtitle="The quote keeps its lines; the template decides how they print."
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => { setPickerOpen(false); setPickedTpl(null) }}>Cancel</Button><Button onPress={() => { if (pickerSel) applyTemplate(pickerSel) }} isDisabled={!pickerSel || pickerSel === (template?.id ?? null)}>{pickerSel && pickerSel === template?.id ? 'On this quote' : 'Use this template'}</Button></>}>
        <TemplatePicker data={data.picker} picked={pickerSel} onPick={setPickedTpl} currentId={template?.id ?? null} now={data.now} onUse={applyTemplate} />
      </Dialog>
      <div className={styles.body}>
        <div ref={areaRef} className={styles.column}>
          {ready.issues.length ? (
            <section className={styles.readiness} data-blocking={!ready.ready || undefined} aria-label="Before you send">
              <div className={styles.readyHead}>
                <Icon name={ready.ready ? 'warning' : 'error'} size={20} weight={300} />
                <span className={styles.readyTitle}>{ready.ready ? 'Worth a look before you send' : 'Not ready to send yet'}</span>
              </div>
              <ul className={styles.issues}>
                {ready.issues.map((i) => (
                  <li key={i.key} className={styles.issue} data-blocking={i.blocking || undefined}>
                    <span className={styles.issueText}><b>{i.label}</b> <span className={styles.issueDetail}>{i.detail}</span></span>
                    <Button appearance="text" onPress={() => router.push(`${back}${back.includes('?') ? '&' : '?'}section=${SECTION_ANCHOR[i.section]}`)}>Open</Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {internal ? (
            <section className={styles.internalCard} aria-label="Internal summary">
              <span className={styles.internalEyebrow}>Internal — never printed for the client</span>
              <div className={styles.internalGrid}>
                <span><span className={styles.internalLabel}>Cost</span><span className={styles.internalValue}>{money2(totals.costMinor)}</span></span>
                <span><span className={styles.internalLabel}>Selling</span><span className={styles.internalValue}>{money2(totals.subtotalMinor - totals.additionalMinor)}</span></span>
                <span><span className={styles.internalLabel}>Margin</span><span className={styles.internalValue}>{money2(totals.marginMinor)} · {Math.round(totals.marginPct)}%</span></span>
                <span><span className={styles.internalLabel}>Lines</span><span className={styles.internalValue}>{totals.itemCount}</span></span>
              </div>
            </section>
          ) : null}
          <div className={styles.stage}>
            <TemplateDocument design={design} brand={brand} data={data.data} view={view} zoom={zoom} onPaginated={onPaginated} watermark={internal ? 'Internal copy' : null} print={print} />
          </div>
        </div>
        {panel && !tabletDown ? (
          <aside className={styles.panel} aria-label="What your client sees">
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>What your client sees</span>
              <IconButton icon="close" label="Close" size={24} variant="bare" iconSize={20} onClick={() => setPanel(false)} />
            </div>

            <div className={styles.panelBody}>
              <span className={styles.panelNote}>Applies to this quote only. The template decides the starting point.</span>
              <div className={styles.group}>
                <span className={styles.groupTitle}>Columns</span>
                {columns.map((k) => (
                  <label key={k} className={styles.row}><span>{ITEM_COLUMN_LABEL[k]}</span><Switch size="sm" isSelected={view.columns[k]} onChange={(v: boolean) => setView((x) => ({ ...x, columns: { ...x.columns, [k]: v } }))} aria-label={ITEM_COLUMN_LABEL[k]} /></label>
                ))}
              </div>
              <div className={styles.group}>
                <span className={styles.groupTitle}>Content</span>
                {VIEW_ROWS.map((r) => (
                  <label key={r.key} className={styles.row}><span className={styles.rowText}><span>{r.label}</span>{r.help ? <span className={styles.rowHelp}>{r.help}</span> : null}</span><Switch size="sm" isSelected={view[r.key]} onChange={(v: boolean) => { setView((x) => ({ ...x, [r.key]: v })); if (r.key === 'terms' || r.key === 'notes') void setQuoteTextVisible(quote.id, r.key, v).catch(() => snackbar({ message: 'Couldn’t save the setting — please try again' })) }} aria-label={r.label} /></label>
                ))}
                <div className={styles.hidden}>
                  <TextField label="Hidden items" mode="select" value={view.hiddenItems === 'no-price' ? 'Shown without a price' : 'Left out'} options={['Left out', 'Shown without a price']}
                             helper="Lines the editor hides from the client" onChange={(v) => setView((x) => ({ ...x, hiddenItems: v === 'Shown without a price' ? 'no-price' : 'omit' }))} />
                </div>
              </div>
            </div>
            <div className={styles.panelFoot}><Button appearance="outlined" variant="secondary" isDisabled={!changed} onPress={() => setView(baseView)}>Reset to template</Button></div>
          </aside>
        ) : null}
        {tabletDown ? (
          /* (REG-525) ≤1024 the panel is the house Drawer (scrim, Esc, focus), as the template editor's panes are — not a hand-rolled fixed column. */
          <Drawer open={panel} onClose={() => setPanel(false)} title="What your client sees" label="What your client sees" width={360}>
            <div className={styles.drawerBody}>

            <div className={styles.panelBody}>
              <span className={styles.panelNote}>Applies to this quote only. The template decides the starting point.</span>
              <div className={styles.group}>
                <span className={styles.groupTitle}>Columns</span>
                {columns.map((k) => (
                  <label key={k} className={styles.row}><span>{ITEM_COLUMN_LABEL[k]}</span><Switch size="sm" isSelected={view.columns[k]} onChange={(v: boolean) => setView((x) => ({ ...x, columns: { ...x.columns, [k]: v } }))} aria-label={ITEM_COLUMN_LABEL[k]} /></label>
                ))}
              </div>
              <div className={styles.group}>
                <span className={styles.groupTitle}>Content</span>
                {VIEW_ROWS.map((r) => (
                  <label key={r.key} className={styles.row}><span className={styles.rowText}><span>{r.label}</span>{r.help ? <span className={styles.rowHelp}>{r.help}</span> : null}</span><Switch size="sm" isSelected={view[r.key]} onChange={(v: boolean) => { setView((x) => ({ ...x, [r.key]: v })); if (r.key === 'terms' || r.key === 'notes') void setQuoteTextVisible(quote.id, r.key, v).catch(() => snackbar({ message: 'Couldn’t save the setting — please try again' })) }} aria-label={r.label} /></label>
                ))}
                <div className={styles.hidden}>
                  <TextField label="Hidden items" mode="select" value={view.hiddenItems === 'no-price' ? 'Shown without a price' : 'Left out'} options={['Left out', 'Shown without a price']}
                             helper="Lines the editor hides from the client" onChange={(v) => setView((x) => ({ ...x, hiddenItems: v === 'Shown without a price' ? 'no-price' : 'omit' }))} />
                </div>
              </div>
            </div>
            <div className={styles.panelFoot}><Button appearance="outlined" variant="secondary" isDisabled={!changed} onPress={() => setView(baseView)}>Reset to template</Button></div>
            </div>
          </Drawer>
        ) : null}
      </div>
    </div>
  )
}
