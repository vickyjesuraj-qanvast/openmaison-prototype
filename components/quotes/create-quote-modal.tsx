'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { TextField } from '@/components/om/text-field'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useOverflow } from '@/components/om/use-overflow'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { useSheetLayout } from '@/components/om/sheet'
import { SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import type { QuoteTemplate } from '@/lib/db/schema'
import { TemplateThumb } from '@/components/templates/render/document'
import { TemplatePicker, defaultPick } from '@/components/templates/template-picker'
import { ago } from '@/lib/templates/ago'
import { pickerTemplates, type PickerData, type PickerExtras } from '@/lib/templates/picker'
import type { BrandKit } from '@/lib/templates/model'
import type { DocData } from '@/lib/templates/data'
import { isSheet, readDocument, readRows, UPLOAD_ACCEPT, type UploadRead } from '@/lib/quotes/upload'
import { chargeAI, refundAIWork } from '@/components/credits/credits-client'
import { costOf } from '@/lib/credits/schedule'
import { parseXlsx } from '@/lib/xlsx'
import { parseCsv } from '@/lib/csv'
import { money2 } from '@/lib/quotes/math'
import styles from './create-quote-modal.module.css'

/** "used 2w ago" (the 1.0 card's meta): days under a week, weeks under a month, then the date. */
/** The rail shows the default and the most recently used; the rest sit behind View all (design reference). */
const RAIL_MAX = 3
type Mode = { kind: 'rail' } | { kind: 'all'; selectedId: string | null } | { kind: 'upload'; name: string; read: UploadRead | null; quoteId: string; refunded: number }

/**
 * Create Quote modal (REG-412 — the 1.0 "Start a quote for {lead}" screen on the 2.0 DS, chosen from the design
 * reference of 2026-09-11): xl 1200 · "FROM A TEMPLATE · n SAVED" with View all / New template · a tile rail where Blank
 * Quote leads the studio's templates (the tile is the action, its kebab holds Preview · Set as default) · "MORE WAYS TO
 * START" (Upload a quote · Draft with Maison AI). Every count, name, tag and "used n ago" comes from `quote_templates`.
 * (REG-494) View all and Preview open the template picker INSIDE the modal, with Cancel · Use this template in the footer
 * (REG-518); making a template is Company › Templates' job — no New template here (REG-519).
 * Upload and Draft answer coming soon until their flows exist. ≤767 it is the canvas' bottom sheet (REG-353).
 */
export function CreateQuoteModal({ open, leadName, templates, now, onClose, onStart, onSetDefault, defaultBlock = null, clients, priceBookCount, render, preselect, onUpload }: {
  open: boolean
  /** The lead the quote is for; '' when the modal opens studio-wide and the Client field decides (REG-422). */
  leadName: string
  templates: QuoteTemplate[]
  now: number
  onClose: () => void
  /** A template's id, or null for Blank Quote; `clientId` = the Client field's lead when the modal carries one. */
  onStart: (templateId: string | null, clientId: string | null) => void
  onSetDefault: (templateId: string) => void
  /** (REG-646 · verify round 3) Why this viewer may not set the studio's default (an Owner or an Admin may), else null — the tile's
      Set as default then waits with the rule in its row, as Company › Templates says it, rather than refusing after the press. */
  defaultBlock?: string | null
  /** Tools › Quotes (REG-422): the studio's leads — the modal opens with a Client field on top and a tile waits for a pick. */
  clients?: { id: string; name: string }[]
  /** The studio's My Items count — the 1.0 row's "your 8-item price book" (REG-412), from the record. */
  priceBookCount?: number
  /** (REG-489) With the brand kit and the sample quote, every tile draws the template's real first page. */
  render?: { brand: BrandKit; sample: DocData; extras?: PickerExtras }
  /** (REG-495) Opened from a template ("Start a quote with this template"): the picker opens on it. */
  preselect?: string | null
  /** (REG-627, parity Q-16) Upload a quote: the lines read from the file, for the page to create the quote with. Absent = coming soon.
   *  (REG-704) `quoteId` — the id the read was charged to (`quote:<id>`); the page creates the quote under it. */
  onUpload?: (read: Extract<UploadRead, { ok: true }>, clientId: string | null, quoteId: string) => void
}) {
  useScrollLock(open)
  const comingSoon = useComingSoon()
  const panel = useRef<HTMLDivElement>(null)
  const sheet = useSheetLayout()
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientError, setClientError] = useState(false)
  const [mode, setMode] = useState<Mode>(() => (preselect ? { kind: 'all', selectedId: preselect } : { kind: 'rail' }))   // (REG-495) opened on a template: the picker first
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setClientId(null); setClientError(false); setMode(preselect ? { kind: 'all', selectedId: preselect } : { kind: 'rail' }) } }   // every opening starts afresh (render-phase adjust)
  const client = clients?.find((c) => c.id === clientId) ?? null
  const start = (templateId: string | null) => {
    if (clients && !clientId) { setClientError(true); return }
    onStart(templateId, clientId)
  }
  /* (REG-627, parity Q-16) Upload a quote: pick a file, read it here, show the lines, then the page creates the quote with them. */
  const fileRef = useRef<HTMLInputElement>(null)
  /* the press again once credits are in (the top-up's `then`) — through a ref, so the read never names itself */
  const again = useRef<(file: File) => void>(() => {})
  const pickFile = async (file: File) => {
    /* (REG-704, AI credits T-26 · Q-29) reading a quote is Digitize quote in 1.0 — 5 AI credits, taken at the read and keyed by the quote
       it becomes; a refusal opens its moment and nothing is read; a file that can't be read gives them back */
    const quoteId = crypto.randomUUID(), ref = `quote:${quoteId}`
    const charged = await chargeAI({ action: 'quote_digitize', ref, what: 'quote', needed: costOf('quote_digitize'), retry: () => again.current(file) })
    if (charged === false) return
    setMode({ kind: 'upload', name: file.name, read: null, quoteId, refunded: 0 })
    const started = Date.now()
    let read: UploadRead
    try {
      read = isSheet(file.name)
        ? readRows(/\.csv$/i.test(file.name) ? parseCsv(await file.text()) : await parseXlsx(await file.arrayBuffer()), file.name)
        : readDocument(file.name)
    } catch { read = { ok: false, reason: 'unreadable' } }
    const refunded = !read.ok && charged > 0 ? await refundAIWork(ref) : 0
    const wait = 700 - (Date.now() - started)   // "Reading…" stays long enough to be read
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    setMode((m) => (m.kind === 'upload' && m.quoteId === quoteId ? { ...m, read, refunded } : m))
  }
  useEffect(() => { again.current = (file) => { void pickFile(file) } })
  const createFromUpload = () => {
    if (mode.kind !== 'upload' || !mode.read?.ok || !onUpload) return
    if (clients && !clientId) { setClientError(true); return }
    onUpload(mode.read, clientId, mode.quoteId)
  }
  /* A template's kebab menu and the chooser dialogs render over this panel, and the surface policy skips descendants (REG-287),
     so the modal would take Esc first and close under them. While one is open it owns Esc; the layer re-arms when it closes. */
  useEscapeLayer(open && menuFor === null, panel, () => { if (mode.kind === 'all') setMode({ kind: 'rail' }); else onClose() })
  useDialogFocus(open, panel)
  const [scrollRef, bodyScrolls] = useOverflow()   // (REG-725) the foot's shadow follows the body's scroll (REG-322)
  /* (REG-489) Only published templates can start a quote; drafts and archived ones stay in Company › Templates. */
  const picker: PickerData | null = useMemo(() => (render ? { ...render.extras, templates: pickerTemplates(templates), brand: render.brand, sample: render.sample } : null), [templates, render])
  const published = picker ? picker.templates : templates.filter((t) => t.status === 'published' && !t.deletedAt)
  const rail = published.slice(0, RAIL_MAX)
  const forName = clients ? client?.name ?? '' : leadName
  const title = forName ? `Start a quote for ${forName}` : 'Start a quote'
  const pickedId = mode.kind === 'all' && picker ? defaultPick(picker, mode.selectedId) : null   /* (REG-518) the picker's selection; the footer acts on it */
  /* (verify round 3 · the sweep's rule, REG-656) Set as default waits with its reason in the row — the viewer's rule first, as Company ›
     Templates' row says it — never a native title, never a refusal after the press. */
  const defaultWhy = (t: { isDefault: boolean }) => defaultBlock ?? (t.isDefault ? 'Already the default' : null)
  const meta = (t: { version: number; lastUsedAt: number | Date | null }) => [`v${t.version}`, t.lastUsedAt ? `used ${ago(t.lastUsedAt instanceof Date ? t.lastUsedAt.getTime() : t.lastUsedAt, now)}` : null].filter(Boolean).join(' · ')
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div ref={panel} className={`${surfaceClasses.panel} ${styles.panel}`} variants={sheet ? bottomSheet : modalPanel}
                      role="dialog" aria-modal aria-label={title} tabIndex={-1} data-testid="create-quote" data-mode={mode.kind}>
            {sheet ? <span className={surfaceClasses.grabber} aria-hidden /> : null}
            {/* (REG-725) the house head and foot (components/om/dialog.tsx), on the house panel: Back leads the head off the rail */}
            <SurfaceHead className={styles.heading} onClose={onClose}
                         leading={mode.kind !== 'rail' ? <Tooltip label="Back"><IconButton icon="arrow_back" label="Back to the start" size={24} variant="bare" iconSize={24} iconWeight={300} onClick={() => setMode({ kind: 'rail' })} /></Tooltip> : undefined}
                         title={mode.kind === 'all' ? `Choose a template${forName ? ` for ${forName}` : ''}` : mode.kind === 'upload' ? `Upload a quote${forName ? ` for ${forName}` : ''}` : title} />
            <div ref={scrollRef} className={styles.body}>
              {clients ? (
                /* (REG-422) Studio-wide: the Client field decides which lead the quote belongs to; a tile pressed before a pick shows the field's error. */
                <section className={styles.block} aria-label="Client">
                  <TextField label="Client" mode="select" required value={client?.name ?? ''} options={clients.map((c) => c.name)}
                             error={clientError ? 'Choose a client first' : undefined}
                             onChange={(name) => { setClientId(clients.find((c) => c.name === name)?.id ?? null); setClientError(false) }} />
                </section>
              ) : null}
              {mode.kind === 'upload' ? (
                <section className={styles.block} aria-label="Upload a quote" data-testid="upload-quote">
                  {mode.read === null ? (
                    <p className={styles.uploadNote} role="status"><Icon name="upload_file" size={20} weight={300} />Reading {mode.name}…</p>
                  ) : mode.read.ok ? (
                    <>
                      <p className={styles.uploadNote} role="status"><Icon name="task_alt" size={20} weight={300} /><span><b>{mode.read.count} {mode.read.count === 1 ? 'line' : 'lines'}</b> read from {mode.read.source} · {money2(mode.read.totalMinor)}</span></p>
                      <div className={styles.uploadTable} role="table" aria-label="The lines read">
                        <div className={styles.uploadRow} role="row" data-head=""><span role="columnheader">Section</span><span role="columnheader">Item</span><span role="columnheader">Qty</span><span role="columnheader">Unit</span><span role="columnheader">Amount</span></div>
                        {mode.read.groups.flatMap((g) => g.lines.map((l, i) => ({ g: g.name, l, i }))).slice(0, 12).map(({ g, l, i }, k) => (
                          <div key={k} className={styles.uploadRow} role="row"><span role="cell">{i === 0 ? g ?? '—' : ''}</span><span role="cell">{l.name}</span><span role="cell">{l.qty ?? 1}</span><span role="cell">{l.unit ?? '—'}</span><span role="cell">{money2(Math.round((l.qty ?? 1) * ((l.costMinor ?? 0) + (l.markupMinor ?? 0))))}</span></div>
                        ))}
                      </div>
                      {mode.read.count > 12 ? <span className={styles.uploadMore}>+ {mode.read.count - 12} more {mode.read.count - 12 === 1 ? 'line' : 'lines'}</span> : null}
                      <p className={styles.uploadHelp}>Each amount comes in as the line’s cost with no markup — set your markup on the quote. The quote starts from the studio’s default template.</p>
                    </>
                  ) : (
                    <>
                      <p className={styles.uploadNote} role="status" data-tone="error"><Icon name="error" size={20} weight={300} /><span>We couldn’t read {mode.name}.{mode.refunded > 0 ? ` Your ${mode.refunded} AI credits are back.` : ''}</span></p>
                      <p className={styles.uploadHelp}>{mode.read.reason === 'empty' ? 'The file has no lines we could use.' : 'Upload a spreadsheet (XLSX · CSV) of the quote’s lines, or start from a blank quote.'}</p>
                      <span><Button variant="secondary" appearance="outlined" iconStart={<Icon name="upload_file" size={20} />} onPress={() => fileRef.current?.click()}>Choose another file</Button></span>
                    </>
                  )}
                </section>
              ) : mode.kind === 'all' && picker ? (
                /* (REG-494) Every published template, searchable, with the one in hand drawn large — inside the modal. */
                <section className={styles.block} data-fill aria-label="All templates">
                  <TemplatePicker data={picker} picked={pickedId} onPick={(id) => setMode({ kind: 'all', selectedId: id })} now={now} onUse={(id) => start(id)}
                                  blank={{ label: 'Blank Quote', onUse: () => start(null) }} />
                </section>
              ) : (
                <>
                  {/* Templates: eyebrow row, then the rail — Blank Quote first (Figma 1209), then the studio's templates. */}
                  <section className={styles.block} aria-label="From a template">
                    <div className={styles.eyebrowRow}>
                      <span className={styles.eyebrow}>From a template · {published.length} saved</span>
                      <div className={styles.eyebrowActions}>
                        <Button appearance="text" iconEnd={<Icon name="chevron_right" size={20} />} onPress={() => (picker ? setMode({ kind: 'all', selectedId: null }) : comingSoon())}>View all</Button>
                      </div>
                    </div>
                    <div className={styles.rail}>
                      <div className={styles.tile}>
                        <button type="button" className={styles.action} onClick={() => start(null)} aria-label="Blank Quote — the default template’s settings, an empty table">
                          <span className={styles.well} data-blank><Icon name="add" size={40} weight={300} /></span>
                          <span className={styles.caption}>
                            <span className={styles.nameRow}><span className={styles.name}>Blank Quote</span></span>
                            <span className={styles.meta}>The default template’s settings, an empty table</span>   {/* (REG-580) */}
                          </span>
                        </button>
                      </div>
                      {rail.map((t) => (
                        <div key={t.id} className={styles.tile} data-kebab>
                          <button type="button" className={styles.action} onClick={() => start(t.id)} aria-label={`Use ${t.name}`}>
                            <span className={styles.well} aria-hidden>
                              {picker && 'design' in t ? (
                                /* (REG-489) the template's real first page, drawn with the studio's kit and the sample quote */
                                <span className={styles.page}><TemplateThumb design={t.design} brand={picker.brand} data={picker.sample} width={132} /></span>
                              ) : (
                                <span className={styles.doc}>
                                  <span className={styles.ln} data-h style={{ width: '42%' }} /><span className={styles.ln} /><span className={styles.ln} style={{ width: '84%' }} /><span className={styles.ln} style={{ width: '92%' }} />
                                  <span className={styles.ln} data-tb /><span className={styles.ln} /><span className={styles.ln} style={{ width: '88%' }} /><span className={styles.ln} style={{ width: '72%' }} />
                                </span>
                              )}
                            </span>
                            <span className={styles.caption}>
                              <span className={styles.nameRow}>
                                <span className={styles.name}>{t.name}</span>
                                {t.isDefault ? <MetaChip>Default</MetaChip> : null}
                              </span>
                              <span className={styles.meta}>{meta(t)}</span>
                            </span>
                          </button>
                          <span className={styles.kebab}>
                            <Tooltip label="More options" disabled={menuFor === t.id}>
                              <IconButton icon="more_vert" label={`More options for ${t.name}`} size={24} variant="bare" iconSize={24} iconWeight={300}
                                          aria-haspopup="menu" aria-expanded={menuFor === t.id}
                                          onClick={() => setMenuFor((m) => (m === t.id ? null : t.id))} />
                            </Tooltip>
                            <Dropdown open={menuFor === t.id} onClose={() => setMenuFor(null)} align="right" sheetTitle={t.name}>
                              <DropdownItem onSelect={() => { setMenuFor(null); if (picker) setMode({ kind: 'all', selectedId: t.id }); else comingSoon() }}>Preview</DropdownItem>
                              <DropdownItem onSelect={() => { setMenuFor(null); onSetDefault(t.id) }} disabled={!!defaultWhy(t)}>
                                {defaultWhy(t) ? <span className={styles.menuRow}>Set as default<span className={styles.menuMeta}>{defaultWhy(t)}</span></span> : 'Set as default'}
                              </DropdownItem>
                            </Dropdown>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                  {/* More ways to start — the 1.0 rows, verbatim; both answer coming soon until their flows exist. */}
                  <section className={styles.block} aria-label="More ways to start">
                    <span className={styles.eyebrow}>More ways to start</span>
                    <div className={styles.list}>
                      <button type="button" className={styles.row} data-testid="upload-quote-row" onClick={onUpload ? () => fileRef.current?.click() : comingSoon}>
                        <span className={styles.glyph}><Icon name="upload_file" size={20} weight={300} /></span>
                        <span className={styles.rowText}>
                          <span className={styles.rowTitle}>Upload a quote <MetaChip>{`PDF · XLS · JPG · ${costOf('quote_digitize')} AI credits`}</MetaChip></span>
                          <span className={styles.rowDesc}>Digitize an existing quote — we scan it into editable line items</span>
                        </span>
                        <span className={styles.trail}><Icon name="chevron_right" size={24} /></span>
                      </button>
                      <button type="button" className={styles.row} onClick={comingSoon}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <span className={styles.glyph}><img src="/figma-assets/maison-ai-mark.svg" alt="" /></span>
                        <span className={styles.rowText}>
                          <span className={styles.rowTitle}>Draft with Maison AI</span>
                          {/* (REG-403) The 1.0 row says "your 8-item price book" — the count is the studio's My Items (price_book_items). */}
                          <span className={styles.rowDesc}>Describe the scope — we draft a categorized quote from your {priceBookCount ? `${priceBookCount}-item ` : ''}price book</span>
                        </span>
                        <span className={styles.trail}><Icon name="chevron_right" size={24} /></span>
                      </button>
                    </div>
                  </section>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept={UPLOAD_ACCEPT} hidden data-testid="upload-quote-file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pickFile(f) }} />
            {mode.kind === 'upload' ? (
              <SurfaceFoot shadow={bodyScrolls} className={styles.foot}>
                <Button variant="secondary" appearance="outlined" onPress={() => setMode({ kind: 'rail' })}>Cancel</Button>
                <Button onPress={createFromUpload} isDisabled={!mode.read?.ok}>Create the quote</Button>
              </SurfaceFoot>
            ) : mode.kind === 'all' ? (
              /* (REG-518) The modal footer every dialog has: Cancel · the picker's action. */
              <SurfaceFoot shadow={bodyScrolls} className={styles.foot}>
                <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                <Button onPress={() => { if (pickedId) start(pickedId) }} isDisabled={!pickedId}>Use this template</Button>
              </SurfaceFoot>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
