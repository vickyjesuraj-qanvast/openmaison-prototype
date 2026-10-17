'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { ChoiceCard } from '@/components/om/choice-card'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useMediaQuery } from '@/lib/breakpoint'
import { FURNITURE_CATEGORIES } from '@/lib/visualizer/furniture'
import { GENERIC_CATEGORIES } from '@/lib/visualizer/catalogue'
import type { MaterialRef } from '@/lib/visualizer/model'
import { isMeasured, isPriced, type QuoteLine, type Quotable } from '@/lib/visualizer/outputs'
import styles from './dialogs.module.css'

/** Add a surface or a piece the photo missed (1.0's inputs + the phone's AddItemDialog, B-49 · B-50 · B-52): a name — and a category for
    furniture — then tap where it is, or (a surface) trace its outline. (F042 · verify round 1) A surface's two ways are two choice cards
    in the body, and the footer stays Cancel + the one primary that does the picked way; the way the studio came in is picked first — the
    pen (`prefer="draw"`) picks Trace, + picks Tap. Enter does the picked way. A mouse reads Click where a finger reads Tap (F164's rule). */
export function AddItemDialog({ kind, onClose, onDone, prefer = 'place' }: {
  kind: 'surface' | 'furniture' | null; onClose: () => void; onDone: (label: string, category: string, how: 'place' | 'draw') => void
  /** (F042) Which way is the primary for a surface: 'draw' when the pen or *Draw a surface* opened the dialog. */
  prefer?: 'place' | 'draw'
}) {
  const [name, setName] = useState('')
  const [cat, setCat] = useState<string>('Seating')
  /* (verify round 1) a surface's two ways are a choice in the body, not a third footer button — the footer stays Cancel + one primary */
  const [way, setWay] = useState<'place' | 'draw'>(prefer)
  const [was, setWas] = useState(kind)
  if (kind !== was) { setWas(kind); if (kind) { setName(''); setCat('Seating'); setWay(prefer) } }
  const ok = name.trim().length > 0
  const how: 'place' | 'draw' = kind === 'surface' ? way : 'place'
  const done = (h: 'place' | 'draw') => onDone(name.trim(), kind === 'furniture' ? cat : '', h)
  const tap = useMediaQuery('(hover: none)') ? 'Tap' : 'Click'
  return (
    <Dialog open={!!kind} onClose={onClose} title={kind === 'furniture' ? 'Add furniture' : 'Add a surface'} subtitle={kind === 'surface' ? 'Name it, then show it on the photo.' : 'Name it, then show where it is on the photo.'} size="form" width={400}
            footer={<div className={styles.footRow}>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button isDisabled={!ok} onPress={() => done(how)}>{how === 'draw' ? 'Trace its outline' : `${tap} where it is`}</Button>
            </div>}>
      <div className={styles.stack}>
        <TextField label={kind === 'furniture' ? 'Piece' : 'Surface'} required value={name} onChange={setName} autoFocus placeholder={kind === 'furniture' ? 'e.g. Floor lamp' : 'e.g. Skirting'} onKeyDown={(e) => { if (e.key === 'Enter' && ok) { e.preventDefault(); done(how) } }} />
        {kind === 'furniture' ? <Chips label="Kind of piece" options={[...FURNITURE_CATEGORIES]} value={cat} onChange={setCat} /> : null}
        {kind === 'surface' ? (
          <div className={styles.section} role="radiogroup" aria-label="How to show it">
            <ChoiceCard title="Trace its outline" help="Draw round it on the photo — for panels, skirting and odd shapes." selected={way === 'draw'} onSelect={() => setWay('draw')} />
            <ChoiceCard title={`${tap} where it is`} help={`One ${tap.toLowerCase()} — its edges are found for you.`} selected={way === 'place'} onSelect={() => setWay('place')} />
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}

/** Upload a swatch (1.0's CustomMaterialUploadDialog, B-65 · B-66): the photo, its name, its category and finish, the colour it reads as,
    and whether it joins the studio's materials (Company › Materials, Q-18) or stays with this design. (F039) It opens on the category of
    the surface it was uploaded from, and a wood-like book opens on Natural grain. */
/** The finish a category opens on — the wood-like books read as grain, everything else as matte. */
const finishFor = (category: string) => (category === 'Flooring' || category === 'Laminates' ? 'natural' : 'matte')

export function SwatchDialog({ file, suggestedCategory, onClose, onSave, studioChoice = true }: {
  file: { url: string; name: string; hex: string } | null
  suggestedCategory: string | null
  onClose: () => void
  onSave: (m: Omit<MaterialRef, 'id' | 'source'>, toStudio: boolean) => Promise<boolean>
  /** (pending modules S36) false — the website's trial: there is no studio to keep it for, so the swatch is used on this photo alone */
  studioChoice?: boolean
}) {
  const [name, setName] = useState('')
  const [cat, setCat] = useState('Paints')
  const [finish, setFinish] = useState('matte')
  const [studio, setStudio] = useState(studioChoice)
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(file)
  if (file !== was) { setWas(file); if (file) { setName(file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').slice(0, 40)); const c = suggestedCategory && GENERIC_CATEGORIES.includes(suggestedCategory as never) ? suggestedCategory : 'Paints'; setCat(c); setFinish(finishFor(c)); setStudio(studioChoice) } }
  const save = async () => { if (!file || !name.trim()) return; setBusy(true); const ok = await onSave({ name: name.trim(), hex: file.hex, finish: finish as MaterialRef['finish'], imageUrl: file.url, category: cat }, studio); setBusy(false); if (ok) onClose() }
  return (
    <Dialog open={!!file} onClose={onClose} title="Add a material" subtitle={studioChoice ? 'Use it in this design — and keep it for the studio’s next renders.' : 'Use it on this photo.'} size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={!name.trim() || busy} onPress={() => { void save() }}>{busy ? 'Saving…' : studio ? 'Save & use' : studioChoice ? 'Use in this design' : 'Use it'}</Button></>}>
      {file ? (
        <div className={styles.stack}>
          <div className={styles.swatchRow}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.swatchPic} src={file.url} alt="" />
            <span className={styles.swatchColour}><span className={styles.dot} style={{ background: file.hex }} />Renders as {file.hex}</span>
          </div>
          <TextField label="Name" required value={name} onChange={setName} placeholder="e.g. Walnut veneer" />
          <TextField label="Category" mode="select" value={cat} options={GENERIC_CATEGORIES} onChange={setCat} />
          <Chips label="Finish" options={[{ value: 'matte', label: 'Matte' }, { value: 'satin', label: 'Satin' }, { value: 'gloss', label: 'Gloss' }, { value: 'textured', label: 'Textured' }, { value: 'natural', label: 'Natural grain' }]} value={finish} onChange={setFinish} />
          {studioChoice ? (
            <label className={styles.switchRow}>
              <span className={styles.switchText}>Save to the studio’s materials<span>The whole team can use it next time — Company › Materials keeps it.</span></span>
              <Switch size="sm" isSelected={studio} onChange={(v: boolean) => setStudio(v)} aria-label="Save to the studio’s materials" />
            </label>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  )
}

/** Add to quote (Q-17): a version's finishes as a section in one of the lead's draft quotes, or a new one. (F096 · F100) One line per
    finish — the same `quoteLines` the action writes — each saying whether the Price book prices it; a draft that already holds this
    version says so, and adding again is the studio's choice ("Add again"), never a silent second section. */
export function QuoteDialog({ open, onClose, title, lines, quotes, onAdd, quotable, groupName }: {
  open: boolean; onClose: () => void; title: string
  lines: (Pick<QuoteLine, 'what' | 'to'> & Partial<QuoteLine>)[]
  quotes: { id: string; number: string; title: string; status: string; versions?: string[] }[]
  /** `again` is true when the picked draft already holds this version and the studio still adds it. */
  onAdd: (quoteId: string | 'new', again: boolean) => Promise<void>
  /** What the Price book can price (`VisualizerEditorData.quotable`) — each line then says whether it is priced. */
  quotable?: Quotable
  /** The section this version lands in (`quoteGroupName`) — how a draft that already holds it is recognised. */
  groupName?: string
}) {
  const drafts = quotes.filter((q) => q.status === 'Draft')
  const holds = (q: { versions?: string[] } | undefined) => !!groupName && !!q?.versions?.includes(groupName)
  /* (verify round 1) a draft without this version first; when every draft already holds it, that draft (its button then says Add again) —
     never a silent second new quote */
  const firstPick = () => drafts.find((q) => !holds(q))?.id ?? drafts.find((q) => holds(q))?.id ?? 'new'
  const [pick, setPick] = useState<string>(firstPick)
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(open)
  if (open !== was) { setWas(open); if (open) setPick(firstPick()) }
  const options = [...drafts.map((q) => ({ value: q.id, label: `${q.number} · ${q.title}${holds(q) ? ` · has ${title}` : ''}` })), { value: 'new', label: 'A new quote' }]
  const holding = drafts.filter((q) => holds(q))
  const picked = drafts.find((q) => q.id === pick)
  const again = pick !== 'new' && holds(picked)
  const full = (l: (typeof lines)[number]): QuoteLine => ({ what: l.what, to: l.to, materialId: l.materialId ?? null, count: l.count ?? 1 })
  const priced = quotable ? lines.filter((l) => isPriced(full(l), quotable)).length : null
  /* (audit 2026-09-26) a line priced by area or length goes in with no quantity — a photo can't measure a floor */
  const measured = quotable ? lines.filter((l) => isMeasured(full(l), quotable)).length : 0
  return (
    <Dialog open={open} onClose={onClose} title={`Add ${title} to a quote`} subtitle="Its finishes become a section, one line per finish — priced from the Price book where it can be." size="modal" width={600}
            footer={<div className={styles.footRow}><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button isDisabled={busy || !lines.length} onPress={() => { setBusy(true); void onAdd(pick, again).finally(() => setBusy(false)) }}>{busy ? 'Adding…' : again ? 'Add again' : 'Add to quote'}</Button></div>}>
      <div className={styles.stack}>
        <div className={styles.section}><span className={styles.head}><span>The lines</span><span>{priced === null ? lines.length : `${priced} of ${lines.length} priced`}</span></span>
          <div className={styles.lines}>{lines.map((l, i) => {
            const n = l.count ?? 1
            const meta = [n > 1 ? `${n} surfaces` : null, quotable ? (isPriced(full(l), quotable) ? 'Priced from the Price book' : 'In at S$0 — yours to price') : null, quotable && isMeasured(full(l), quotable) ? 'Measure on site — goes in with no quantity' : null].filter(Boolean).join(' · ')
            return <div key={i} className={styles.line}><span className={styles.lineWhat}>{l.what}{meta ? <small>{meta}</small> : null}</span><span>{l.to}</span></div>
          })}</div></div>
        <div className={styles.section}><span className={styles.head}><span>Into</span></span>
          <Chips label="Quote" options={options} value={pick} onChange={setPick} />
          {!drafts.length ? <span className={styles.hint}>No draft quote on this lead — a new one starts for you.</span> : null}
          {again && picked ? <span className={styles.hint} role="status" data-tone="warn"><Icon name="info" size={16} weight={300} /> {title} is already in {picked.number} — adding again makes a second section.</span>
            : pick === 'new' && holding.length ? <span className={styles.hint} role="status" data-tone="warn"><Icon name="info" size={16} weight={300} /> {title} is already in {holding.map((q) => q.number).join(', ')} — a new quote holds it again.</span> : null}
        </div>
        {priced === null || priced < lines.length ? <span className={styles.hint}><Icon name="info" size={16} weight={300} /> Lines the Price book can’t price go in at S$0 for you to price.</span> : null}
        {measured ? <span className={styles.hint}><Icon name="info" size={16} weight={300} /> Lines priced by area or length go in with no quantity — type the measured one.</span> : null}
      </div>
    </Dialog>
  )
}
