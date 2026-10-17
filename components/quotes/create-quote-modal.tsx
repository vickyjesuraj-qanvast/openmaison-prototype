'use client'

import { useSeedFlag } from '@/lib/ghost-shape'   // (pending modules S41b-1) whether this member sees costs — the help says what they can do
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, TextArea } from '@/components/ds'
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
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import { newId } from '@/lib/uid'
import type { QuoteTemplate } from '@/lib/db/schema'
import { TemplateThumb } from '@/components/templates/render/document'
import { TemplatePicker, defaultPick } from '@/components/templates/template-picker'
import { ago } from '@/lib/templates/ago'
import { pickerTemplates, startsLine, type PickerData, type PickerExtras } from '@/lib/templates/picker'
import type { BrandKit } from '@/lib/templates/model'
import type { DocData } from '@/lib/templates/data'
import { UPLOAD_ACCEPT, UPLOAD_KINDS, unreadHelp, type UploadRead } from '@/lib/quotes/upload'
import { readQuoteUpload } from '@/lib/quotes/read-upload'   // (S42 B·4 · E-05) the one reader
import { UploadReadingView } from './upload-reading'
import { chargeAI, openPlanLock, refundAIWork, usePlanLock } from '@/components/credits/credits-client'
import { ProTag } from '@/components/credits/pro-tag'
import { costOf } from '@/lib/credits/schedule'
import { money2 } from '@/lib/quotes/math'
import { draftQuote } from '@/app/quotes/draft-actions'
import { BRIEF_MAX, type DraftPlan } from '@/lib/quotes/draft'
import styles from './create-quote-modal.module.css'

/** "used 2w ago" (the 1.0 card's meta): days under a week, weeks under a month, then the date. */
/** The rail shows the default and the most recently used; the rest sit behind View all (design reference). */
const RAIL_MAX = 3
type Mode = { kind: 'rail' } | { kind: 'all'; selectedId: string | null } | { kind: 'upload'; name: string; read: UploadRead | null; quoteId: string; refunded: number }
  /* (pending modules S04) Draft with Maison AI: the brief as typed, the plan read for it (null while reading), and the brief it was read for */
  | { kind: 'draft' }

/**
 * Create Quote modal (REG-412 — the 1.0 "Start a quote for {lead}" screen on the 2.0 DS, chosen from the design
 * reference of 2026-09-11): xl 1200 · "FROM A TEMPLATE · n SAVED" with View all / New template · a tile rail where Blank
 * Quote leads the studio's templates (the tile is the action, its kebab holds Preview · Set as default) · "MORE WAYS TO
 * START" (Upload a quote · Draft with Maison AI). Every count, name, tag and "used n ago" comes from `quote_templates`.
 * (REG-494) View all and Preview open the template picker INSIDE the modal, with Cancel · Use this template in the footer
 * (REG-518); making a template is Company › Templates' job — no New template here (REG-519).
 * ≤767 it is the canvas' bottom sheet (REG-353). (pending modules S04) Draft with Maison AI is a rule-built first cut from the price book
 * (lib/quotes/draft.ts) — the brief, the lines it drafts as you type, Create the quote; Upload's chip names what it truly reads.
 */
export function CreateQuoteModal({ open, leadName, leadId = null, templates, now, onClose, onStart, onSetDefault, defaultBlock = null, clients, priceBookCount, render, preselect, onUpload, onDraft }: {
  open: boolean
  /** The lead the quote is for; '' when the modal opens studio-wide and the Client field decides (REG-422). */
  leadName: string
  /** (pending modules S04) its id — Draft with Maison AI reads the lead's price book and property type; studio-wide the Client field's lead */
  leadId?: string | null
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
  /** (pending modules S04) Draft with Maison AI: the brief, for the page to create the quote from (it reads the brief again on the server). */
  onDraft?: (brief: string, leadId: string) => void
}) {
  const costs = useSeedFlag('role.costs', true)   // (pending modules S41b-1)
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
  /* (Dane UAT 6.41) Studio-wide the Client decides everything after it: the field takes the focus as the modal opens (its active stroke
     says "start here", and typing searches it), and a press that needs a client first brings the caret back to it with its error. */
  const clientBox = useRef<HTMLDivElement>(null)
  const focusClient = () => clientBox.current?.querySelector<HTMLElement>('button[role="combobox"]')?.focus({ preventScroll: true })
  const needsClient = () => { if (!clients || clientId) return false; setClientError(true); focusClient(); return true }
  /* (pending modules S19 — 1.0's plan gating: picking one of the studio's own templates is Pro) on Free a template's press opens the lock
     card over the window; Blank Quote is every plan's (the studio's default prints, as it always has) */
  const tplLocked = usePlanLock('template_editor').locked
  const start = (templateId: string | null) => {
    if (templateId && tplLocked) { openPlanLock('template_editor', { nested: true }); return }
    if (needsClient()) return
    onStart(templateId, clientId)
  }
  /* (REG-627, parity Q-16) Upload a quote: pick a file, read it here, show the lines, then the page creates the quote with them. */
  const fileRef = useRef<HTMLInputElement>(null)
  /* the press again once credits are in (the top-up's `then`) — through a ref, so the read never names itself */
  const again = useRef<(file: File) => void>(() => {})
  const pickFile = async (file: File) => {
    if (needsClient()) return   // (Dane UAT 6.41) the client is checked before the file is read and its credits taken
    /* (REG-704, AI credits T-26 · Q-29) reading a quote is Digitize quote in 1.0 — 5 AI credits, taken at the read and keyed by the quote
       it becomes; a refusal opens its moment and nothing is read; a file that can't be read gives them back */
    const quoteId = newId(), ref = `quote:${quoteId}`
    const charged = await chargeAI({ action: 'quote_digitize', ref, what: 'quote', needed: costOf('quote_digitize'), retry: () => again.current(file) })
    if (charged === false) return
    setMode({ kind: 'upload', name: file.name, read: null, quoteId, refunded: 0 })
    const started = Date.now()
    const read: UploadRead = await readQuoteUpload(file)   // (S42 B·4 · E-05) a sheet for real, a PDF from its own words — never its name
    const refunded = !read.ok && charged > 0 ? await refundAIWork(ref) : 0
    const wait = 700 - (Date.now() - started)   // "Reading…" stays long enough to be read
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    setMode((m) => (m.kind === 'upload' && m.quoteId === quoteId ? { ...m, read, refunded } : m))
  }
  useEffect(() => { again.current = (file) => { void pickFile(file) } })
  /* (Dane UAT 6.41) Upload a quote asks for the client BEFORE the file chooser — the read (and its 5 AI credits) never runs for a quote
     that has nowhere to go. */
  const chooseFile = () => { if (needsClient()) return; fileRef.current?.click() }
  const createFromUpload = () => {
    if (mode.kind !== 'upload' || !mode.read?.ok || !onUpload) return
    if (needsClient()) return
    onUpload(mode.read, clientId, mode.quoteId)
  }
  /* (pending modules S04 — 1.0's Draft with AI, by rule) Draft with Maison AI: the brief in the studio's own words; a pause in the typing reads it
     again (the server action, over My Sections and My Items) and the lines show under it — one button, Create the quote. Nothing is metered. */
  const draftLead = clients ? clientId : leadId
  const [brief, setBrief] = useState('')
  const [plan, setPlan] = useState<{ brief: string; plan: DraftPlan | null; error: string | null } | null>(null)
  const openDraft = () => { if (needsClient()) return; setBrief(''); setPlan(null); setMode({ kind: 'draft' }) }
  const asked = brief.replace(/\s+/g, ' ').trim()
  useEffect(() => {
    if (mode.kind !== 'draft' || !draftLead || !asked) return
    let live = true
    const t = window.setTimeout(() => {
      void draftQuote({ leadId: draftLead, brief: asked }).then((r) => { if (live) setPlan('error' in r ? { brief: asked, plan: null, error: r.error } : { brief: asked, plan: r.plan, error: null }) },
        () => { if (live) setPlan({ brief: asked, plan: null, error: 'Couldn’t read the brief — please try again' }) })
    }, 450)
    return () => { live = false; window.clearTimeout(t) }
  }, [mode.kind, draftLead, asked])
  const shown = plan && plan.brief === asked ? plan : null
  const reading = mode.kind === 'draft' && !!asked && !shown
  const createFromDraft = () => {
    if (!onDraft || !draftLead || !shown?.plan?.groups.length) { if (!draftLead) needsClient(); return }
    onDraft(asked, draftLead)
  }
  /* A template's kebab menu and the chooser dialogs render over this panel, and the surface policy skips descendants (REG-287),
     so the modal would take Esc first and close under them. While one is open it owns Esc; the layer re-arms when it closes. */
  useEscapeLayer(open && menuFor === null, panel, () => { if (mode.kind === 'all') setMode({ kind: 'rail' }); else onClose() })
  useDialogFocus(open, panel)
  /* (Dane UAT 6.41) …after the dialog has taken the focus: the Client field, while none is picked (Tools › Quotes) */
  const hasClients = !!clients
  useEffect(() => {
    if (!open || !hasClients) return
    const r = requestAnimationFrame(() => clientBox.current?.querySelector<HTMLElement>('button[role="combobox"]')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(r)
  }, [open, hasClients])
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
                         title={mode.kind === 'all' ? `Choose a template${forName ? ` for ${forName}` : ''}` : mode.kind === 'upload' ? `Upload a quote${forName ? ` for ${forName}` : ''}` : mode.kind === 'draft' ? `Draft with Maison AI${forName ? ` for ${forName}` : ''}` : title} />
            <div ref={scrollRef} className={styles.body}>
              {clients ? (
                /* (REG-422) Studio-wide: the Client field decides which lead the quote belongs to; a tile pressed before a pick shows the field's error. */
                <section className={styles.block} aria-label="Client">
                  <TextField label="Client" mode="select" searchable boxRef={clientBox} required value={client?.name ?? ''} options={clients.map((c) => c.name)}
                             error={clientError ? 'Choose a client first' : undefined}
                             onChange={(name) => { setClientId(clients.find((c) => c.name === name)?.id ?? null); setClientError(false) }} />
                </section>
              ) : null}
              {mode.kind === 'draft' ? (
                <section className={styles.block} aria-label="Draft with Maison AI" data-testid="draft-quote">
                  <p className={styles.uploadHelp}>Describe the works in your own words. Maison AI drafts the quote from your price book — My Sections first, then My Items by trade. Anything it can’t price comes in at S$0 for you to price.</p>
                  <TextArea label="What’s the job?" value={brief} onChange={(v: string) => setBrief(v)} maxLength={BRIEF_MAX} autoFocus data-testid="draft-brief"
                            placeholder="Hack and re-tile both bathrooms, new kitchen cabinets, paint the whole flat" />
                  {!asked ? null : reading ? (
                    <p className={styles.uploadNote} role="status"><Icon name="auto_awesome" size={20} weight={300} />Reading your brief…</p>
                  ) : shown?.error ? (
                    <p className={styles.uploadNote} role="status" data-tone="error"><Icon name="error" size={20} weight={300} /><span>{shown.error}</span></p>
                  ) : shown?.plan && !shown.plan.groups.length ? (
                    <p className={styles.uploadNote} role="status" data-testid="draft-nothing"><Icon name="info" size={20} weight={300} /><span>Maison AI didn’t find any works in that. Name the rooms or the works — like “kitchen cabinets” or “paint the whole flat”.</span></p>
                  ) : shown?.plan ? (
                    <>
                      <p className={styles.uploadNote} role="status" data-testid="draft-summary"><Icon name="task_alt" size={20} weight={300} /><span><b>{shown.plan.lines} {shown.plan.lines === 1 ? 'line' : 'lines'}</b> drafted · {shown.plan.fromBook} from your price book{shown.plan.toPrice ? ` · ${shown.plan.toPrice} to price` : ''}</span></p>
                      <div className={styles.uploadTable} role="table" aria-label="The lines drafted">
                        <div className={styles.uploadRow} role="row" data-head=""><span role="columnheader">Section</span><span role="columnheader">Item</span><span role="columnheader">Qty</span><span role="columnheader">Unit</span><span role="columnheader">Price</span></div>
                        {shown.plan.groups.map((g) => (g.kind === 'section' ? (
                          <div key={`s:${g.sectionId}`} className={styles.uploadRow} role="row" data-testid="draft-row"><span role="cell">{g.name}</span><span role="cell">{`From My Sections · ${g.lineCount} ${g.lineCount === 1 ? 'line' : 'lines'}`}</span><span role="cell" /><span role="cell" /><span role="cell">{money2(g.totalMinor)}</span></div>
                        ) : g.lines.map((l, i) => (
                          <div key={`${g.name}:${i}`} className={styles.uploadRow} role="row" data-testid="draft-row"><span role="cell">{i === 0 ? g.name : ''}</span><span role="cell">{l.name}</span><span role="cell">{l.qty}</span><span role="cell">{l.unit ?? '—'}</span>
                            <span role="cell">{l.needsPrice ? <MetaChip color="yellow">To price</MetaChip> : money2(l.unitPriceMinor)}</span></div>
                        ))))}
                      </div>
                      <p className={styles.uploadHelp}>Prices come from your price book, at a quantity of 1 unless you gave one — check the quantities on the quote. It starts from the studio’s default template.</p>
                    </>
                  ) : null}
                </section>
              ) : mode.kind === 'upload' ? (
                <section className={styles.block} aria-label="Upload a quote" data-testid="upload-quote">
                  {mode.read === null ? (
                    <p className={styles.uploadNote} role="status"><Icon name="upload_file" size={20} weight={300} />Reading {mode.name}…</p>
                  ) : mode.read.ok ? (
                    <>
                      <UploadReadingView read={mode.read} />   {/* (pending modules S41b-3) shared with the website's free trial */}
                      {/* (pending modules S12) a line My Items knows surely takes the item's cost on creation (lib/quotes/book-fill.ts) — said before the press */}
                      <p className={styles.uploadHelp}>{costs ? 'Each amount comes in as the line’s price. A line that is in My Items takes its cost from there; the rest start at cost with no markup — set your markup on the quote.' : 'Each amount comes in as the line’s price.'} The quote starts from the studio’s default template.</p>
                    </>
                  ) : (
                    <>
                      <p className={styles.uploadNote} role="status" data-tone="error"><Icon name="error" size={20} weight={300} /><span>We couldn’t read {mode.name}.{mode.refunded > 0 ? ` Your ${mode.refunded} AI credits are back.` : ''}</span></p>
                      <p className={styles.uploadHelp}>{unreadHelp(mode.read, 'or start from a blank quote')}</p>
                      <span><Button variant="secondary" appearance="outlined" iconStart={<Icon name="upload_file" size={20} />} onPress={chooseFile}>Choose another file</Button></span>
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
                      <span className={styles.eyebrow}>From a template · {published.length} saved{tplLocked ? <> <ProTag /></> : null}</span>
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
                        <div key={t.id} className={styles.tile} data-kebab data-starts={'defaults' in t || undefined}>
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
                              {/* (UX audit Q8) what the new quote gets — its starter sections — not the sample quote's priced lines the page draws */}
                              {'defaults' in t ? <span className={styles.meta} data-testid="template-starts">{startsLine(t)}</span> : null}
                              <span className={styles.meta}>{meta(t)}</span>
                            </span>
                          </button>
                          <TileMenu name={t.name} open={menuFor === t.id} onToggle={() => setMenuFor((m) => (m === t.id ? null : t.id))} onClose={() => setMenuFor(null)}>
                            <DropdownItem onSelect={() => { setMenuFor(null); if (picker) setMode({ kind: 'all', selectedId: t.id }); else comingSoon() }}>Preview</DropdownItem>
                            {/* (REG-728) a waiting row's reason prints under its label — the house row's own second line */}
                            <DropdownItem onSelect={() => { setMenuFor(null); if (tplLocked) { openPlanLock('template_editor', { nested: true }); return } onSetDefault(t.id) }} disabled={!!defaultWhy(t)} title={defaultWhy(t) ?? undefined} meta={tplLocked ? <ProTag /> : undefined}>Set as default</DropdownItem>
                          </TileMenu>
                        </div>
                      ))}
                    </div>
                  </section>
                  {/* More ways to start — the 1.0 rows (REG-412); (pending modules S04) both are live — Upload reads a spreadsheet, Draft drafts by rule. */}
                  <section className={styles.block} aria-label="More ways to start">
                    <span className={styles.eyebrow}>More ways to start</span>
                    <div className={styles.list}>
                      <button type="button" className={styles.row} data-testid="upload-quote-row" onClick={onUpload ? chooseFile : comingSoon}>
                        <span className={styles.glyph}><Icon name="upload_file" size={20} weight={300} /></span>
                        <span className={styles.rowText}>
                          {/* (pending modules S04 — card: "its chip says 'PDF · XLS · JPG' on a 5-credit press, so fix the words") what it truly reads: a spreadsheet
                              of the quote's lines; a PDF or a photo needs the developers' document reader (only the demo's reference quotes read today) */}
                          <span className={styles.rowTitle}>Upload a quote <MetaChip>{`${UPLOAD_KINDS} · ${costOf('quote_digitize')} AI credits`}</MetaChip></span>
                          <span className={styles.rowDesc}>Bring in an existing quote’s lines from a spreadsheet or a PDF — we read them into editable line items</span>
                        </span>
                        <span className={styles.trail}><Icon name="chevron_right" size={24} /></span>
                      </button>
                      {onDraft ? <button type="button" className={styles.row} onClick={openDraft} data-testid="draft-quote-row">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <span className={styles.glyph}><img src="/figma-assets/maison-ai-mark.svg" alt="" /></span>
                        <span className={styles.rowText}>
                          <span className={styles.rowTitle}>Draft with Maison AI</span>
                          {/* (REG-403) The 1.0 row says "your 8-item price book" — the count is the studio's My Items (price_book_items). */}
                          <span className={styles.rowDesc}>Describe the scope — we draft a categorized quote from your {priceBookCount ? `${priceBookCount}-item ` : ''}price book</span>
                        </span>
                        <span className={styles.trail}><Icon name="chevron_right" size={24} /></span>
                      </button> : null}
                    </div>
                  </section>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept={UPLOAD_ACCEPT} hidden data-testid="upload-quote-file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pickFile(f) }} />
            {mode.kind === 'draft' ? (
              <SurfaceFoot shadow={bodyScrolls} className={styles.foot}>
                <Button variant="secondary" appearance="outlined" onPress={() => setMode({ kind: 'rail' })}>Cancel</Button>
                <Button onPress={createFromDraft} isDisabled={!shown?.plan?.groups.length} data-testid="draft-create">Create the quote</Button>
              </SurfaceFoot>
            ) : mode.kind === 'upload' ? (
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

/** (REG-728) A template tile's kebab: its menu opens through the body portal (PortalMenu), as every row menu does, at the scale's 240 —
 *  a waiting Set as default carries its reason on a second line. */
function TileMenu({ name, open, onToggle, onClose, children }: { name: string; open: boolean; onToggle: () => void; onClose: () => void; children: ReactNode }) {
  const anchor = useRef<HTMLSpanElement>(null)
  return (
    <span ref={anchor} className={styles.kebab}>
      <Tooltip label="More options" disabled={open}>
        <IconButton icon="more_vert" label={`More options for ${name}`} size={24} variant="bare" iconSize={24} iconWeight={300}
                    aria-haspopup="menu" aria-expanded={open} onClick={onToggle} />
      </Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={onClose} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={name}>
        {children}
      </PortalMenu>
    </span>
  )
}
