'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Chips, type ChipOption } from '@/components/om/chips'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { Dropzone, FieldError } from '@/components/leads/move-stage/fields'
import { XrayReadingCards } from '@/components/xray/xray-reading'
import { xrayColumnDefs } from '@/components/xray/xray-table'
import { readShown, unreadable, XrayFile, type Side } from '@/components/xray/xray-workspace'
import { DROP_HELP } from '@/components/xray/intro-copy'
import { runTrialXray } from '@/app/site/try/tools-actions'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { draftMessage } from '@/lib/xray/compare'
import { fileKind, XRAY_ACCEPT, XRAY_MAX_BYTES } from '@/lib/xray/reading'
import { site } from '@/lib/site/model'
import { TRIAL_WORDS, XRAY_LIMIT, XRAY_WORDS, leftOf, xrayLeftLine, type TrialToolKey, type TrialWork } from '@/lib/trial/policy'
import { KeepBand, OtherTools, TrialApp, TrialGate, TrialHero } from './trial-frame'
import { landOn, SAMPLE_QUOTE, sampleFile } from './trial-quote'
import xw from '@/components/xray/xray-workspace.module.css'
import xr from '@/components/xray/xray-result.module.css'
import x from './trial-tools.module.css'

/** Two quotes of our own to compare (invented: a rival studio's kitchen quote, and ours) — read here by the same reader as any upload. */
const SAMPLE_THEIRS = { href: '/site/try/samples/urban-nest-quote.xlsx', name: 'Urban Nest quote.xlsx', studio: 'Urban Nest' }
const READ = 'read', FILE = 'file', NONE = 'none'

/**
 * (pending modules S41b-3 — 1.0's anonymous Quote X-Ray, 2026-09-21: "one free analysis, kept and claimed"; both quotes uploaded — "an
 * anonymous visitor has no lead and no digitized quote to load from") Quote X-Ray for a visitor: the studio's Upload two quotes — each file
 * read the moment it is picked by the studio's own reader (a spreadsheet, a PDF's own words) and said under its tile — or the quote they read
 * in the trial as their side; Compare runs the studio's engine on the server and the reading opens in the record page's own cards. One
 * comparison (1.0's), kept until they start their studio, where it waits in Quote X-Ray (on one of their trial leads when they pick one).
 */
export function TrialXray({ initial, open }: { initial: TrialWork; open: Partial<Record<TrialToolKey, boolean>> }) {
  const snack = useSnackbar()
  const [work, setWork] = useState(initial)
  const [other, setOther] = useState<Side | null>(null)
  const [mine, setMine] = useState<Side | null>(null)
  const [useRead, setUseRead] = useState(!!initial.read)
  const [studioName, setStudioName] = useState('')
  const [leadId, setLeadId] = useState<string>(NONE)
  const [errors, setErrors] = useState<{ other?: string; yours?: string; run?: string }>({})
  const [busy, setBusy] = useState(false)
  const [gate, setGate] = useState<string | null>(null)
  const reading = work.reading
  const left = leftOf(reading ? 1 : 0, XRAY_LIMIT)

  const pick = async (side: 'other' | 'yours', f: File | undefined, studio?: string) => {
    if (!f) return
    setErrors((e) => ({ ...e, [side]: undefined, run: undefined }))
    const set = side === 'other' ? setOther : setMine
    const kind = fileKind(f.name)
    if (!kind || f.size > XRAY_MAX_BYTES) { set(null); setErrors((e) => ({ ...e, [side]: unreadable(side, !kind ? 'type' : 'size', f.name) })); return }
    if (side === 'other') setStudioName(studio ?? '')
    set({ file: f, read: null })
    const read = await readShown(f)
    if (read.ok) {
      set((cur) => (cur && cur.file === f ? { file: f, read } : cur))
      if (side === 'other' && read.kind === 'pdf' && read.studio && !studio) setStudioName(read.studio)
    } else { set((cur) => (cur && cur.file === f ? null : cur)); setErrors((e) => ({ ...e, [side]: unreadable(side, read.reason, f.name, read.currency) })) }
  }
  const samples = async () => {
    try {
      const [t, y] = await Promise.all([sampleFile(SAMPLE_THEIRS.href, SAMPLE_THEIRS.name), sampleFile(SAMPLE_QUOTE.href, SAMPLE_QUOTE.name)])
      setUseRead(false)
      await Promise.all([pick('other', t, SAMPLE_THEIRS.studio), pick('yours', y)])
    } catch { snack({ message: TRIAL_WORDS.couldnt('open the samples') }) }
  }

  const yoursReady = (useRead && !!work.read) || !!mine?.read?.ok
  const ready = !!other?.read?.ok && yoursReady
  const compare = async () => {
    if (reading) { setGate(XRAY_WORDS.gate); return }
    if (!ready || busy || !other?.read?.ok) { setErrors((e) => ({ ...e, run: XRAY_WORDS.needBoth })); return }
    setBusy(true)
    try {
      const yours = useRead && work.read ? 'read' as const : mine?.read?.ok ? { lines: mine.read.lines } : null
      if (!yours) return
      const r = await runTrialXray({ otherFile: other.file.name, yourFile: useRead && work.read ? work.read.file : mine?.file.name ?? '', other: { lines: other.read.lines, studio: studioName.trim() || other.read.studio },
        yours, leadId: leadId === NONE ? null : leadId, botToken: null })
      if ('error' in r) { if (r.reason === 'limit') setGate(r.error); else setErrors((e) => ({ ...e, run: r.error })); return }
      setWork((w) => ({ ...w, reading: r.reading }))
      landOn('trial-xray-reading-title')
    } catch { snack({ message: TRIAL_WORDS.couldnt('compare the quotes') }) }
    finally { setBusy(false) }
  }

  const tile = (side: 'other' | 'yours', title: string) => {
    const s = side === 'other' ? other : mine
    return (
      <>
        {s ? <XrayFile side={s} onRemove={() => { (side === 'other' ? setOther : setMine)(null); if (side === 'other') setStudioName('') }} />
          : <Dropzone title={title} label={`Upload ${title.charAt(0).toLowerCase()}${title.slice(1)}`} helper={DROP_HELP} accept={XRAY_ACCEPT} onPick={(f) => { void pick(side, f) }} />}
        {errors[side] ? <FieldError message={errors[side]!} /> : null}
        {side === 'other' && s?.read?.ok && s.read.kind !== 'reference' ? (
          <TextField label="Their studio’s name (optional)" value={studioName} onChange={setStudioName} maxLength={80} trailingIcon={null} />
        ) : null}
      </>
    )
  }
  const leadOptions: ChipOption[] = [{ value: NONE, label: XRAY_WORDS.noLead }, ...work.leads.map((l) => ({ value: l.id, label: l.data.name }))]

  return (
    <>
      <TrialHero back={{ label: XRAY_WORDS.crumbBack, href: site('/platform/upload-a-quote') }} here={XRAY_WORDS.crumbHere} allowance={xrayLeftLine(left)} title={XRAY_WORDS.title} lede={XRAY_WORDS.lede} />
      <TrialApp label="Quote X-Ray" testId="trial-xray-app">
        {reading ? <TrialReading reading={reading} onAnother={() => setGate(XRAY_WORDS.gate)} /> : (
          <section className={x.block} aria-label="Compare two quotes" data-testid="trial-xray-setup">
            <div className={xw.grid}>
              <div className={xw.side}>
                <span className={xw.eyebrow}>{XRAY_WORDS.theirs}</span>
                {tile('other', 'The other studio’s quote')}
              </div>
              <div className={xw.side}>
                <span className={xw.eyebrow}>{XRAY_WORDS.yours}</span>
                {work.read ? <Chips label={XRAY_WORDS.yours} options={[{ value: READ, label: XRAY_WORDS.fromRead(work.read.count) }, { value: FILE, label: 'Upload a file' }]} value={useRead ? READ : FILE} onChange={(v: string) => setUseRead(v === READ)} testId="trial-xray-use-read" /> : null}
                {useRead && work.read ? <p className={x.fine} data-testid="trial-xray-read-note">{work.read.file} · {work.read.count} {work.read.count === 1 ? 'line' : 'lines'}</p> : tile('yours', 'Your quote')}
              </div>
            </div>
            {work.leads.length ? (
              <div className={x.field} data-testid="trial-xray-lead">
                <span className={x.fieldLabel}>{XRAY_WORDS.forLead}</span>
                <Chips label={XRAY_WORDS.forLead} options={leadOptions} value={leadId} onChange={(v: string) => setLeadId(v)} />
              </div>
            ) : null}
            <div className={x.samples}>
              <span className={x.samplesHead}>{XRAY_WORDS.samples}</span>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="table_chart" size={20} />} isDisabled={busy} onPress={() => { void samples() }} data-testid="trial-xray-samples">Urban Nest’s quote and ours</Button>
            </div>
            {errors.run ? <FieldError message={errors.run} /> : null}
            <div className={xw.foot}>
              <span className={xw.hint}>{ready ? 'Both quotes are read — compare them.' : XRAY_WORDS.needBoth}</span>
              <Button onPress={() => { void compare() }} isDisabled={!ready || busy} data-testid="trial-xray-compare">{busy ? 'Comparing…' : XRAY_WORDS.compare}</Button>
            </div>
          </section>
        )}
      </TrialApp>
      <KeepBand work={work} extra={XRAY_WORDS.pro} />
      <OtherTools current="xray" open={open} />
      <TrialGate text={gate} onClose={() => setGate(null)} />
    </>
  )
}

/** The reading, in the record page's own cards; Say this copies its message (sending it is the studio's, from the lead). */
function TrialReading({ reading, onAnother }: { reading: NonNullable<TrialWork['reading']>; onAnother: () => void }) {
  const snack = useSnackbar()
  const r = reading.result
  const phone = useMediaQuery(MOBILE)
  const defs = useMemo(() => xrayColumnDefs(r.otherStudio), [r.otherStudio])
  const columns = useTableColumns('xray-items', defs, phone)
  const [asQuestion, setAsQuestion] = useState<Record<number, boolean>>({})
  const [columnsOpen, setColumnsOpen] = useState(false)
  const questions = new Set(Object.entries(asQuestion).filter(([, on]) => on).map(([n]) => Number(n)))
  const copy = async () => {
    try { await navigator.clipboard.writeText(draftMessage(r, questions)); snack({ message: XRAY_WORDS.copied }) }
    catch { snack({ message: TRIAL_WORDS.couldnt('copy the message') }) }
  }
  return (
    <div className={`${x.reading} ${x.landing}`} data-testid="trial-xray-reading">
      <div className={x.blockHead}>
        <div className={x.blockTitles}><h2 className={`${x.blockTitle} ${x.landing}`} tabIndex={-1} data-testid="trial-xray-reading-title">{`${reading.yourFile.replace(/\.[a-z0-9]+$/i, '')} · vs ${reading.otherStudio}`}</h2><span className={x.kept}><Icon name="task_alt" size={18} weight={300} />Kept — it waits in your studio’s Quote X-Ray when you start it</span></div>
        <Button variant="secondary" appearance="outlined" iconStart={<Icon name="scan" size={20} />} onPress={onAnother} data-testid="trial-xray-another">Compare another</Button>
      </div>
      <div className={xr.column}>
        <XrayReadingCards r={r} phone={phone} yourLabel={r.yourLabel}
                          sayAction={<Button variant="secondary" appearance="outlined" iconStart={<Icon name="content_copy" size={20} />} onPress={() => { void copy() }} data-testid="trial-xray-copy">{XRAY_WORDS.copy}</Button>}
                          asQuestion={asQuestion} onToggleQuestion={(n) => setAsQuestion((a) => ({ ...a, [n]: !a[n] }))}
                          columns={columns.columns} onReorder={columns.reorder} onColumns={() => setColumnsOpen(true)} />
      </div>
      <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columns.all} onSave={columns.save} onReset={columns.reset} />
    </div>
  )
}
