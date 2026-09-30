'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Button, Tag } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { useOverflow } from '@/components/om/use-overflow'
import { useSnackbar } from '@/components/om/snackbar'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import menuStyles from '@/components/leads/menus.module.css'
import { modalPanel, overlayFade, duration, ease } from '@/lib/motion'
import { parseCsv } from '@/lib/csv'
import { parseXlsx } from '@/lib/xlsx'
import { parseLeadSheet } from '@/lib/leads/homematch'
import { IMPORT_FIELDS, IGNORE, PREVIEW_COLUMNS, autoMap, toRecord, type ImportField, type Mapping } from '@/lib/leads/import-fields'
import { CHANGE_LABEL, adjustedPhrase, readImportRecord, type AdjustedCount, type ImportAdjustment } from '@/lib/leads/import-values'
import { MSG } from '@/lib/forms'
import styles from './import-wizard.module.css'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { ChoiceCard } from '@/components/om/choice-card'
import { Dialog, SurfaceFoot, SurfaceHead, surfaceClasses } from '@/components/om/dialog'
import { Tooltip } from '@/components/om/tooltip'

export const TEMPLATE_HREF = '/templates/leads-import-template.csv'

export type ImportDestination = 'listing' | 'review'
/** `batchSource` (UX audit L4): step 2's one lead source for the whole file, or null for each row's own. */
export type ImportPayload = { fileName: string; headers: string[]; mapping: Mapping; rows: string[][]; destination: ImportDestination; batchSource: string | null }
/** (UX audit L4 · L5) `adjusted` / `changes`: what the reader changed (lib/leads/import-values.ts); `leadIds`: the leads the listing got. */
export type ImportResult = { importId: string; total: number; imported: number; skipped: number; duplicates: number; destination: ImportDestination; approved: number; flagged: number; adjusted: AdjustedCount[]; changes: ImportAdjustment[]; leadIds: string[] }

/** Step 2's source select: the file's own column, when one is mapped. */
const FROM_FILE = 'As in the file'
/** How many of the last step's changes are listed before "and n more". */
const CHANGES_SHOWN = 6
const NO_SOURCES: readonly string[] = []

type Parsed = { name: string; headers: string[]; rows: string[][] }

/** (REG-317) `usedBy`: OpenMaison field → the imported column that already holds it. A taken field is disabled here and
 *  says which column has it; Ignore is never taken, and the row's own current value stays selectable.
 *  (REG-729) The box is the house TextField at its 36px size (it was a hand-rolled 280×36 select with its own error border and message):
 *  "Select Field" is its label, the error its own red line. Its list stays this picker's — TextField's select mode draws plain options,
 *  and REG-317's taken fields read disabled with the column that holds them — so the field opens it as a trigger, and the current field
 *  wears the Selected fill as TextField's options do. The list takes the field's width (the menu scale). */
function FieldSelect({
  value, error, onChange, usedBy,
}: { value: Mapping[number]; error?: string; onChange: (v: Mapping[number]) => void; usedBy: Map<string, string> }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement | null>(null)
  return (
    <>
      <TextField label="Select Field" mode="trigger" size="s" value={value ?? ''} open={open} onOpen={() => setOpen((o) => !o)} boxRef={box}
                 error={error} trailingIcon={null}
                 trailing={<span className={styles.chev} data-open={open || undefined} aria-hidden><Icon name="expand_more" size={16} /></span>} />
      <PortalMenu open={open} anchor={box} onClose={() => setOpen(false)}>
        {[IGNORE, ...IMPORT_FIELDS].map((o) => {
          const taken = o !== IGNORE && o !== value && usedBy.has(o)
          return (
            <button key={o} type="button" role="option" aria-selected={o === value} aria-disabled={taken || undefined}
                    className={menuStyles.item} data-selected={o === value || undefined}
                    onClick={taken ? undefined : () => { onChange(o); setOpen(false) }}>
              <span className={styles.optionLabel}>{o}</span>
              {taken ? <span className={styles.mappedTo}>Mapped to {usedBy.get(o)}</span> : null}
            </button>
          )
        })}
      </PortalMenu>
    </>
  )
}

export function ImportWizard({
  open, onClose, onImport, onDone, sources = NO_SOURCES, batchSources = NO_SOURCES, onAssign, onReview,
}: {
  open: boolean
  onClose: () => void
  onImport: (payload: ImportPayload) => Promise<ImportResult | null>
  onDone: (result: ImportResult) => void
  /** (UX audit L4) Every source name the studio's list holds (retired ones too) — what Review reads a Lead Source cell against, as the server does. */
  sources?: readonly string[]
  /** (UX audit L4) The live sources step 2 offers as the whole file's one source. */
  batchSources?: readonly string[]
  /** (UX audit L5) The last step's next moves: assign the leads this import added (the listing's bulk Assign), open Review imported leads.
   *  Absent where the host has neither (Lead Import History) — or, for Assign, when this member assigns nobody. */
  onAssign?: (leadIds: string[]) => void
  onReview?: () => void
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const router = useRouter()
  const snackbar = useSnackbar()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [toast, setToast] = useState<{ name: string; state: 'uploading' | 'done' } | null>(null)
  const [toastCollapsed, setToastCollapsed] = useState(false)
  const [over, setOver] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [destOpen, setDestOpen] = useState(false)
  const [destination, setDestination] = useState<ImportDestination | null>(null)   // no default — the user chooses (821:23969)
  const [mapping, setMapping] = useState<Mapping>([])
  /* (REG-317) Next was pressed with unmapped columns: from then on every unmapped row shows its error until it is mapped or ignored. */
  const [mapErrors, setMapErrors] = useState(false)
  const [autoMapped, setAutoMapped] = useState<Mapping>([])   // what auto-match proposed, to label rows
  const [autoCount, setAutoCount] = useState(0)
  const [errorRow, setErrorRow] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  /* (UX audit L4) Step 2's one lead source for the whole file — null = each row's own (or Others without a source column). */
  const [batchSource, setBatchSource] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const busyRef = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setStep(1); setParsed(null); setToast(null); setToastCollapsed(false); setOver(false)
      setConfirmClose(false); setDestOpen(false); setDestination(null); setMapping([]); setAutoMapped([]); setAutoCount(0); setErrorRow(null); setMapErrors(false); setBusy(false); setResult(null); setBatchSource(null)
    }
  }
  // Reset the in-flight guard on open; kill a pending upload timer on close.
  useEffect(() => {
    if (open) { busyRef.current = false; return }
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }, [open])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // A file dropped outside the dashed zone must never navigate the tab to the CSV.
  useEffect(() => {
    if (!open) return
    const swallow = (e: DragEvent) => { e.preventDefault() }
    window.addEventListener('dragover', swallow)
    window.addEventListener('drop', swallow)
    return () => { window.removeEventListener('dragover', swallow); window.removeEventListener('drop', swallow) }
  }, [open])

  // Closing is gated while an import is in flight (Esc, scrim, ×); once the
  // import has happened (step 4) any dismissal behaves like Done.
  const close = () => {
    if (busyRef.current) return
    if (step === 4 && result) onDone(result)
    else if (step === 2 || step === 3) setConfirmClose(true)   // mid-flow: confirm before losing the mapping (user 2026-08-28)
    else onClose()
  }
  const closeRef = useRef(close)
  useEffect(() => { closeRef.current = close })   // keep the Esc handler on the latest closure

  /* (REG-287) aria-modal told assistive tech the page behind was inert while nothing held focus in: Tab walked
     straight out of the panel. Same policy as Dialog / the Move stage window (components/om/surface.ts) — Esc
     closes this surface only while it is the topmost one (the field menu, the Lead routing dialog and the
     confirm-close alert all sit above it and own Esc first, which is what the old `!e.defaultPrevented` guard
     was reaching for), focus moves into the panel on open, Tab cycles inside it, and the opener gets focus back
     on close. The handler stays on the latest `close` through closeRef, so the busy / step-4 gating is unchanged. */
  const escClose = useCallback(() => { closeRef.current() }, [])
  useEscapeLayer(open, panelRef, escClose)
  useDialogFocus(open, panelRef)
  const [scrollRef, bodyScrolls] = useOverflow()   // the footer's shadow follows the body's scroll (REG-322)

  const acceptFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    /* (REG-603) CSV, XLSX and a lead-sheet PDF (Homematch's export): each becomes the same grid the mapping step reads. */
    let grid: string[][] = []
    try {
      if (ext === 'csv') grid = parseCsv(await file.text())
      else if (ext === 'xlsx') grid = await parseXlsx(await file.arrayBuffer())
      else if (ext === 'xls') { snackbar({ message: 'Save the sheet as XLSX or CSV first — the old .xls format is not read' }); return }
      else if (ext === 'pdf') {
        const { pdfLines } = await import('@/lib/pdf-text')
        const sheet = parseLeadSheet(await pdfLines(await file.arrayBuffer()))
        if (!sheet.rows.length) { snackbar({ message: 'Couldn’t find leads in this PDF — a Homematch lead sheet, or export it as CSV or XLSX' }); return }
        grid = [sheet.headers, ...sheet.rows]
      } else { snackbar({ message: 'Upload a CSV, an XLSX or a lead-sheet PDF' }); return }
    } catch { snackbar({ message: 'Couldn’t read that file — please try another export' }); return }
    if (grid.length < 2) {
      snackbar({ message: 'That file has no lead rows to import' })
      return
    }
    const headers = grid[0]!.map((h) => h.trim())
    const rows = grid.slice(1)
    setToast({ name: file.name, state: 'uploading' })
    setToastCollapsed(false)
    setParsed(null)
    setErrorRow(null)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      setToast({ name: file.name, state: 'done' })
      setParsed({ name: file.name, headers, rows })
      const m = autoMap(headers)
      setMapping(m)
      setAutoMapped(m)
      setAutoCount(m.filter(Boolean).length)
    }, 900)
  }

  const goNextFromMap = () => {
    /* (REG-317) Every imported column must be mapped or ignored before the mapping is taken further: the first
       unmapped row is scrolled into view and every unmapped row shows its inline error (clearing live as it is
       resolved). Then the standing rule — one column must be Lead Name. */
    const headers = parsed?.headers ?? []
    const firstMissing = headers.findIndex((_, i) => (mapping[i] ?? null) === null)
    if (firstMissing !== -1) {
      setMapErrors(true); setErrorRow(null)
      requestAnimationFrame(() => document.querySelector(`[data-map-row="${firstMissing}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
      return
    }
    const hasName = mapping.some((f) => f === 'Lead Name')
    if (!hasName) {
      setErrorRow(0)
      return
    }
    setErrorRow(null); setMapErrors(false)
    setStep(3)
  }

  const runImport = async () => {
    if (!parsed || busyRef.current || !destination) return
    busyRef.current = true
    setDestOpen(false)
    setBusy(true)
    const r = await onImport({ fileName: parsed.name, headers: parsed.headers, mapping, rows: parsed.rows, destination, batchSource })
    setBusy(false)
    busyRef.current = false
    if (r) { setResult(r); setStep(4) }
  }

  const setField = (i: number, v: Mapping[number]) => {
    setMapping((m) => m.map((cur, j) => {
      if (j === i) return v
      // a target can be used by one column only — selecting it elsewhere releases it
      if (v && v !== IGNORE && cur === v) return null
      return cur
    }))
  }

  const used = new Set(mapping.filter((f): f is ImportField => !!f && f !== IGNORE))
  /* (REG-317) Which imported column holds each OpenMaison field — the picker disables those and names the column. */
  const usedBy = new Map<string, string>()
  mapping.forEach((f, i) => { if (f && f !== IGNORE) usedBy.set(f, parsed?.headers[i] || `Column ${i + 1}`) })
  // The preview shows the columns the user just mapped, not every OpenMaison field: PREVIEW_COLUMNS is
  // the label/width/order lookup, the mapping decides which of them appear. The shipped template maps
  // all 14, so 779:26144 still draws 120/171/124/…/200; a file that maps 7 no longer scrolls past 7 blanks.
  const sourceMapped = used.has('Lead Source')
  /* (UX audit L4) Step 2's whole-file source shows as the Lead Source column, mapped or not. */
  const previewCols = PREVIEW_COLUMNS.filter((c) => used.has(c.field) || (c.field === 'Lead Source' && !!batchSource))
  const nameMissing = !mapping.some((f) => f === 'Lead Name')
  /* (UX audit L4) Each row read the way the server will read it (lib/leads/import-values.ts, the one reader): its typed cells, and the
     cells that won't land as typed — Review marks those with what they become. Rows with no Lead Name are skipped, so they mark nothing. */
  const readRows = useMemo(() => (step === 3 && parsed
    ? parsed.rows.map((row) => { const typed = toRecord(parsed.headers, mapping, row); return { typed, ...readImportRecord(typed, sources, batchSource) } })
    : []), [step, parsed, mapping, sources, batchSource])
  const changeCount = readRows.reduce((n, r) => n + (r.typed['Lead Name'] ? r.changes.length : 0), 0)
  const previewValue = (i: number, field: ImportField) => {
    const r = readRows[i]
    if (!r) return ''
    if (field === 'Lead Source' && batchSource) return batchSource
    const v = r.typed[field] ?? ''
    if (field === 'Estimated Budget (S$)' && /^\d+$/.test(v)) return Number(v).toLocaleString('en-SG')
    return v
  }
  const changeOf = (i: number, field: ImportField) => { const r = readRows[i]; return r && r.typed['Lead Name'] ? r.changes.find((c) => c.field === field) ?? null : null }
  /* (UX audit L4 · L5) The last step: what changed, and the next move. */
  const adjustedTotal = result ? result.adjusted.reduce((n, a) => n + a.count, 0) : 0
  const reviewCount = result ? (result.destination === 'listing' ? result.duplicates + result.flagged : result.imported) : 0
  const offerAssign = !!onAssign && !!result && result.leadIds.length > 0
  const offerReview = !!onReview && reviewCount > 0

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
          <motion.div ref={panelRef} className={`${surfaceClasses.panel} ${styles.panel}`} variants={modalPanel} role="dialog" aria-modal aria-label="Import Leads"
                      tabIndex={-1}>
            {/* (REG-725) the house head and foot (components/om/dialog.tsx), on the house panel: the step count rides in the head's
                actions, and the close goes through `close`, whose busy gate holds it while an import runs */}
            <SurfaceHead title="Import Leads" actions={<span className={styles.step}>Step {step} of 4</span>} onClose={close} closeDisabled={busy} className={styles.heading} />

            <div className={styles.body}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step} style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
                            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: duration.step, ease: ease.standard }}>
                  {step === 1 ? (
                    <div ref={scrollRef} className={styles.step1}>
                      <div className={styles.tips}>
                        <div className={styles.tipBlock}>
                          <span className={styles.tipTitle}>Tips on Importing</span>
                          <ul className={styles.tipList}>
                            <li>Easily import your leads into OpenMaison using <a className={styles.inlineLink} href={TEMPLATE_HREF} download>this template</a></li>
                          </ul>
                        </div>
                        <div className={styles.tipBlock}>
                          <span className={styles.tipTitle}>Important Reminders</span>
                          <ul className={styles.tipList}>
                            <li>List only one lead per row</li>
                            <li>Every lead must have a lead Name</li>
                            <li>Avoid duplicate entries</li>
                          </ul>
                        </div>
                        <div className={styles.rule} />
                        <div className={styles.linkCol}>
                          <a className={styles.link} href={TEMPLATE_HREF} download>
                            <Icon name="download" size={20} />Download Leads Import Template
                          </a>
                          <button type="button" className={styles.link} onClick={() => { onClose(); router.push('/leads/imports') }}>
                            <Icon name="history" size={20} />Lead Import History
                          </button>
                        </div>
                      </div>
                      <div className={styles.uploadCol}>
                        <span className={styles.uploadTitle}>Upload local file</span>
                        <input ref={fileRef} type="file" accept=".csv,.xlsx,.pdf" className={styles.hiddenInput}
                               onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); e.target.value = '' }} />
                        {parsed ? (
                          <div className={styles.dropSuccess}>
                            <div className={styles.successGroup}>
                              <span className={styles.successCheck}><Icon name="check_circle" size={20} fill weight={300} /></span>
                              <span className={styles.successTitle}>Success!</span>
                              <span className={styles.successSub}>
                                Detected {parsed.rows.length} line(s). Click “Next” to start mapping your files’s column headers to our fields in OpenMaison.
                              </span>
                            </div>
                            <div className={styles.successGroup}>
                              <Icon name="draft" size={20} fill weight={300} />
                              <span className={styles.fileName}>{parsed.name}</span>
                              <button type="button" className={styles.reupload} onClick={() => fileRef.current?.click()}>Re-upload File</button>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.dropzone} data-over={over || undefined} role="button" tabIndex={0}
                               onClick={() => fileRef.current?.click()}
                               onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current?.click() }}
                               onDragOver={(e) => { e.preventDefault(); setOver(true) }}
                               onDragLeave={() => setOver(false)}
                               onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) void acceptFile(f) }}>
                            <span className={styles.dropMain}>Drop your file or <u>browse</u></span>
                            <span className={styles.dropSub}>Supports: CSV, XLSX, PDF (a Homematch lead sheet)</span>   {/* (REG-603) */}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : step === 2 && parsed ? (
                    <div className={styles.stepBody}>
                      <div>
                        <div className={styles.stepTitle}>Map your columns to OpenMaison Fields</div>
                        <div className={styles.stepDesc}>
                          Ensure your columns align with the correct OpenMaison fields, especially assigning one to “Lead Name”. Only columns matched to a OpenMaison field name will be imported.
                        </div>
                        {autoCount > 0 ? (
                          <div className={styles.autoNote}><Icon name="check_circle" size={16} fill />{autoCount} column{autoCount === 1 ? '' : 's'} auto-matched</div>
                        ) : null}
                      </div>
                      {/* (UX audit L4) One lead source for the whole file: an expo sheet or a referral list has no source column, and every row
                          used to land as Others. The house select; "As in the file" keeps each row's own when a column is mapped. */}
                      <div className={styles.batchSource} data-testid="import-batch-source">
                        <TextField label="Lead source for every lead" mode="select" size="s"
                                   options={sourceMapped ? [FROM_FILE, ...batchSources] : batchSources}
                                   value={batchSource ?? (sourceMapped ? FROM_FILE : '')}
                                   onChange={(v) => setBatchSource(v === FROM_FILE ? null : v)}
                                   helper={!sourceMapped && !batchSource ? 'Without one, these leads import as Others' : sourceMapped && batchSource ? 'Replaces the file’s own source for every lead' : undefined} />
                      </div>
                      <div className={styles.mapTable} onScroll={(e) => { e.currentTarget.dataset.scrolled = String(e.currentTarget.scrollTop > 0) }}>
                        <div className={styles.mapHead}>
                          <div className={`${styles.mapCell} ${styles.colName} ${styles.hLabel}`}>Imported Column Name</div>
                          <div className={`${styles.mapCell} ${styles.colReview} ${styles.hLabel}`}>Content Review</div>
                          <div className={`${styles.mapCell} ${styles.colSelect} ${styles.hLabel}`}>Select OpenMaison Field Name</div>
                        </div>
                        {parsed.headers.map((h, i) => {
                          const samples = parsed.rows.map((r) => r[i] ?? '').filter((v) => v.trim()).slice(0, 3)
                          return (
                            <div key={`${h}-${i}`} className={styles.mapRow} data-map-row={i}>
                              <div className={`${styles.mapCell} ${styles.colName}`}>
                                <span className={styles.colNameText}>{h || `Column ${i + 1}`}</span>
                                {/* Row status (user 2026-08-28): auto-matched / mapped / not mapped / ignored */}
                                {(() => {
                                  const v = mapping[i] ?? null
                                  if (v === IGNORE) return <Tag appearance="outlined">Ignored</Tag>
                                  if (!v) return <Tag color="yellow" appearance="outlined">Not mapped</Tag>
                                  return <Tag color="green" appearance="outlined">{autoMapped[i] === v ? 'Auto-matched' : 'Mapped'}</Tag>
                                })()}
                              </div>
                              <div className={`${styles.mapCell} ${styles.colReview}`}>
                                {/* Responsive (REG-269): the head row's labels ride along in each row, for the ≤767 stacked layout. */}
                                <span className={styles.stackLabel}>Content Review</span>
                                <div className={styles.reviewList}>{samples.map((s, k) => <span key={k}>{s}</span>)}</div>
                              </div>
                              <div className={`${styles.mapCell} ${styles.colSelect}`}>
                                <span className={styles.stackLabel}>Select OpenMaison Field Name</span>
                                {(() => {
                                  const missing = mapErrors && (mapping[i] ?? null) === null   // (REG-317) shown after Next, gone once mapped or ignored
                                  const nameErr = errorRow === i && nameMissing
                                  /* (REG-729) the message is the field's own red line (TextField), where the hand-rolled one sat */
                                  return <FieldSelect value={mapping[i] ?? null} usedBy={usedBy} error={missing ? MSG.mapField : nameErr ? 'Required' : undefined} onChange={(v) => setField(i, v)} />
                                })()}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : step === 3 && parsed ? (
                    <div className={styles.stepBody}>
                      <div>
                        <div className={styles.stepTitle}>Review your columns to OpenMaison Fields</div>
                        <div className={styles.stepDesc}>
                          Ensure your columns align with the correct OpenMaison fields, especially assigning one to “Lead Name”. Only columns matched to a OpenMaison field name will be imported.
                        </div>
                        {/* (UX audit L4) Said before the Import press, in the house error ink: the cells below that won't land as typed. */}
                        {changeCount > 0 ? (
                          <div className={styles.adjustNote} role="status" data-testid="import-adjust-note">
                            <Icon name="error" size={16} fill />
                            {changeCount} value{changeCount === 1 ? '' : 's'} won’t import as typed — each is marked with what it becomes.
                          </div>
                        ) : null}
                      </div>
                      {/* data-scrolled = down (sticky head shadow); data-scrolled-x = sideways (the frozen
                          SL No column's shadow below 1025, REG-269/REG-144). */}
                      <div className={styles.previewWrap}
                           onScroll={(e) => {
                             e.currentTarget.dataset.scrolled = String(e.currentTarget.scrollTop > 0)
                             e.currentTarget.dataset.scrolledX = String(e.currentTarget.scrollLeft > 0)
                           }}>
                        {/* A grid, not fixed-width cells: every value shows in full (mock widths are minimums; the
                            column grows to its longest value and the wrap scrolls sideways) — user 2026-08-28. */}
                        <div className={styles.preview} role="table" aria-label="Import preview"
                             style={{ gridTemplateColumns: ['76px', ...previewCols.map((c) => `minmax(${c.width}px, auto)`)].join(' ') }}>
                          <div className={`${styles.pRow} ${styles.pHead}`} role="row">
                            <div className={styles.pCell} role="columnheader"><span>SL No</span></div>
                            {previewCols.map((c) => (
                              <div key={c.field} className={styles.pCell} role="columnheader"><span>{c.label}</span></div>
                            ))}
                          </div>
                          {parsed.rows.map((r, i) => (
                            <div key={i} className={styles.pRow} role="row">
                              <div className={styles.pCell} role="cell"><span>{i + 1}</span></div>
                              {previewCols.map((c) => {
                                const ch = changeOf(i, c.field)
                                return (
                                  <div key={c.field} className={styles.pCell} role="cell" data-adjusted={ch ? '' : undefined}>
                                    <span>{previewValue(i, c.field)}</span>
                                    {ch ? <span className={styles.adjusted}>{ch.landed ? `Imports as ${ch.landed}` : 'Imports blank'}</span> : null}
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : step === 4 && result ? (
                    <div className={styles.done}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/figma-assets/import-done.svg" alt="" className={styles.doneArt} />
                      {/* (UX audit L4) Never "successfully" when the reader changed values: the line says what was adjusted, the list below which. */}
                      <span className={styles.doneTitle} data-testid="import-done-title">
                        {adjustedTotal > 0
                          ? `${result.imported} of ${result.total} records imported — ${adjustedPhrase(result.adjusted)} ${adjustedTotal === 1 ? 'was' : 'were'} adjusted`
                          : `${result.imported} of ${result.total} records imported successfully`}
                      </span>
                      <span className={styles.doneSub}>
                        {result.destination === 'listing'
                          ? (result.approved === 0 && result.duplicates + result.flagged > 0
                              ? `All ${result.duplicates + result.flagged} look like duplicates of existing leads — sent to Review imported leads`
                              : `${result.approved} lead${result.approved === 1 ? '' : 's'} added to your listing${result.duplicates + result.flagged > 0 ? ` · ${result.duplicates + result.flagged} possible duplicate${result.duplicates + result.flagged === 1 ? '' : 's'} sent to review` : ''}`)
                          : `${result.imported} lead${result.imported === 1 ? '' : 's'} waiting in Review imported leads`}
                      </span>
                      {result.changes.length > 0 ? (
                        <ul className={styles.changeList} aria-label="What was adjusted" data-testid="import-changes">
                          {result.changes.slice(0, CHANGES_SHOWN).map((c) => (
                            <li key={`${c.row}-${c.field}`}>
                              <span className={styles.changeName}>{c.name}</span>
                              {` · ${CHANGE_LABEL[c.field] ?? c.field}: “${c.typed}” → ${c.landed || 'blank'}`}
                            </li>
                          ))}
                          {adjustedTotal > CHANGES_SHOWN ? <li className={styles.changeMore}>and {adjustedTotal - CHANGES_SHOWN} more</li> : null}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              <AnimatePresence>
                {toast && step === 1 ? (
                  <motion.div className={styles.toast} data-collapsed={toastCollapsed || undefined} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                              transition={{ duration: duration.snackbar, ease: ease.decelerate }} role="status">
                    <div className={styles.toastHead}>
                      <span className={styles.toastTitle}>Uploading 1 file</span>
                      <Tooltip label={toastCollapsed ? 'Expand' : 'Collapse'} side="top">
                        <button type="button" className={styles.toastBtn} aria-label={toastCollapsed ? 'Expand' : 'Collapse'} aria-expanded={!toastCollapsed}
                                onClick={() => setToastCollapsed((c) => !c)}>
                          <Icon name={toastCollapsed ? 'keyboard_arrow_up' : 'keyboard_arrow_down'} size={24} />
                        </button>
                      </Tooltip>
                      <Tooltip label="Dismiss upload status" side="top">
                        <button type="button" className={styles.toastBtn} aria-label="Dismiss upload status" onClick={() => setToast(null)}><Icon name="close" size={24} /></button>
                      </Tooltip>
                    </div>
                    {toastCollapsed ? null : (
                    <div className={styles.toastRow}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/figma-assets/file-csv.svg" alt="" width={40} height={40} />
                      <span className={styles.toastFile}>{toast.name}</span>
                      {toast.state === 'uploading' ? <span className={styles.toastStatus}>Uploading...</span> : null}
                      <span className={`${styles.toastIcon} ${toast.state === 'uploading' ? styles.spin : ''}`}>
                        <Icon name={toast.state === 'uploading' ? 'progress_activity' : 'check_circle'} size={20} fill={toast.state === 'done'} />
                      </span>
                    </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Lead routing (821:23969 / 821:24010): question + two option cards with the radio on the right; no default.
                (REG-725) Nested over the wizard, through a portal on <body> as the close confirm below, so it sits above the panel and
                owns Esc — rendered inside the panel, the surface policy skipped it as a descendant and the wizard took Esc first. */}
            <Dialog open={destOpen} onClose={() => setDestOpen(false)} title="Lead routing" width={400} size="standard" nested portal
                    footer={<>
                      <Button variant="secondary" appearance="outlined" onPress={() => setDestOpen(false)}>Cancel</Button>
                      <Button onPress={() => { void runImport() }} isDisabled={busy || destination === null}>Import</Button>
                    </>}>
              {/* Count = rows in the file about to be imported (821:23969 shows "these 320 leads"). */}
              <span className={styles.destQuestion}>Where should {parsed ? `${parsed.rows.length === 1 ? 'this' : 'these'} ${parsed.rows.length} lead${parsed.rows.length === 1 ? '' : 's'}` : 'these leads'} go?</span>
              <div className={styles.destList} role="radiogroup" aria-label="Where should these leads go?">
                {([
                  { key: 'listing', title: 'Add to my lead listing', help: 'Leads are added to your listing right away as New. Anything that looks like a duplicate of an existing lead still goes to Review imported leads.' },
                  { key: 'review', title: 'Review and approve manually', help: 'Nothing is added yet. Check each lead in Review imported leads first, then approve, reject or merge it.' },
                ] as const).map((o) => (
                  <ChoiceCard key={o.key} title={o.title} help={o.help} selected={destination === o.key} onSelect={() => setDestination(o.key)} />
                ))}
              </div>
            </Dialog>
            <ConfirmDialog open={confirmClose} title="Are you sure you want to close?" message="Your file and column mapping won't be saved." nested
                           confirmLabel="Close window" onCancel={() => setConfirmClose(false)} onConfirm={() => { setConfirmClose(false); onClose() }} />
            <SurfaceFoot shadow={bodyScrolls} className={styles.footer}>
              {step === 1 ? (
                <>
                  <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
                  <Button onPress={() => setStep(2)} isDisabled={!parsed}>Next</Button>
                </>
              ) : step === 2 ? (
                <>
                  <Button variant="secondary" appearance="outlined" onPress={() => setStep(1)}>Previous</Button>
                  <Button onPress={goNextFromMap}>Next</Button>
                </>
              ) : step === 3 ? (
                <>
                  <Button variant="secondary" appearance="outlined" onPress={() => setStep(2)} isDisabled={busy}>Previous</Button>
                  <Button onPress={() => setDestOpen(true)} isDisabled={busy}>Import</Button>
                </>
              ) : (
                /* (UX audit L5) Not a dead end: the next move beside Done — "Assign these n" (the listing's bulk Assign on the leads this
                   import added) and "Review n duplicates" (or, routed to review, "Review n leads"). One filled button: the furthest step on. */
                <>
                  <Button variant={offerAssign || offerReview ? 'secondary' : 'primary'} appearance={offerAssign || offerReview ? 'outlined' : 'filled'}
                          onPress={() => { if (result) onDone(result) }}>Done</Button>
                  {offerReview && result ? (
                    <Button variant={offerAssign ? 'secondary' : 'primary'} appearance={offerAssign ? 'outlined' : 'filled'} onPress={() => onReview?.()}
                            data-testid="import-review">
                      {result.destination === 'listing' ? `Review ${reviewCount} duplicate${reviewCount === 1 ? '' : 's'}` : `Review ${reviewCount} lead${reviewCount === 1 ? '' : 's'}`}
                    </Button>
                  ) : null}
                  {offerAssign && result ? (
                    <Button onPress={() => onAssign?.(result.leadIds)} data-testid="import-assign">
                      {`Assign ${result.leadIds.length === 1 ? 'this lead' : `these ${result.leadIds.length}`}`}
                    </Button>
                  ) : null}
                </>
              )}
            </SurfaceFoot>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
