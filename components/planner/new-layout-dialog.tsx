'use client'

import { useMemo, useState } from 'react'
import { Button, SegmentedButton, SegmentedButtonItem, Switch } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { areaText, planArea } from '@/lib/planner/model'
import { TEMPLATES, TEMPLATE_GROUPS, planFromTemplate, type TemplateGroup } from '@/lib/planner/templates'
import { EXAMPLES, examplePlan } from '@/lib/planner/examples'
import type { TemplatePick } from '@/lib/planner/queries'
import { PlanDrawing } from './plan-drawing'
import styles from './new-layout-dialog.module.css'

export type NewLayoutPick = { templateKey: string | null; furnished: boolean; tracePlanId: string | null
  /** (parity map, TD-076) one of the studio's templates */ fromLayoutId: string | null
  /** (parity map, TD-073) one of the examples */ exampleKey: string | null }

/**
 * (gaps build J, J-Q5 · J-Q18) Start a layout: the Singapore flats as their own drawings (1.0's Quick Start Templates, F-252), filtered
 * All · HDB · Condo · Landed, a Blank page, and — for a project with a floor plan — Trace the floor plan (the plan under the drawing at its
 * true size; a plan with no scale says so). *Start with furniture placed* is 1.0's Pre-Furnished. The dialog closes once the layout is
 * made (the host's `onStart` resolves); a refusal stays in it.
 * (parity map, TD-076) The studio's own templates sit above the flats — My templates; (TD-073) `mode="examples"` offers the examples
 * instead: the six flats furnished and finished in a design style, each opening as the studio's own copy (1.0's "Made with Space Planner").
 * (the calm UI build 2026-10-27, 6-30 — T-14) One picker for every ready-made start, the planner's one New ▾ row "From a ready-made flat…": its
 * tabs are Flats (the project's floor plans to trace, the Singapore flats, Blank, Trace a floor-plan photo) · Furnished examples · My templates
 * (once the studio has one) — the DS segmented control, as the Price book's dialog switches its two lists. `mode` is the tab it opens on; a
 * tab's first entry is picked when the tab changes, so Start never starts something out of view.
 */
export function NewLayoutDialog({ open, onClose, projectName = null, leadName = null, plans = [], onStart, templates = [], mode = 'flats', onPhoto }: {
  open: boolean; onClose: () => void
  /** the project the layout is for — named in the head (it is saved with it) */ projectName?: string | null
  /** (pending modules S07) the lead it is for, before it is won — it goes to the project then */ leadName?: string | null
  plans?: { id: string; name: string; scaled: boolean }[]
  onStart: (p: NewLayoutPick) => Promise<string | null>
  /** (TD-076) My templates */ templates?: TemplatePick[]
  /** (TD-073) the tab it opens on — the flats, or the examples (the calm UI build: My templates is a tab of its own too) */ mode?: 'flats' | 'examples' | 'templates'
  /** (pending modules S28) Trace a floor-plan photo — the host opens the photo's dialog for the same lead or project; absent, no card */ onPhoto?: () => void
}) {
  const [group, setGroup] = useState<'all' | TemplateGroup>('all')
  const [tab, setTab] = useState<'flats' | 'examples' | 'templates'>(mode)
  const firstOf = (t: 'flats' | 'examples' | 'templates') => (t === 'examples' ? `ex:${EXAMPLES[0]!.key}` : t === 'templates' && templates[0] ? `tpl:${templates[0].id}` : 'hdb-4')
  const [pick, setPick] = useState<string>(firstOf(mode))
  const [furnished, setFurnished] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  const [wasMode, setWasMode] = useState(mode)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setError(null); setBusy(false) } }
  if (mode !== wasMode) { setWasMode(mode); setTab(mode); setPick(firstOf(mode)); setGroup('all') }   // the other door: its own first pick (render-phase adjust)
  const goTab = (t: 'flats' | 'examples' | 'templates') => { if (t === tab) return; setTab(t); setPick(firstOf(t)); setGroup('all') }
  const covers = useMemo(() => new Map(TEMPLATES.map((t) => [t.key, planFromTemplate(t.key, false)])), [])
  const exampleCovers = useMemo(() => (tab === 'examples' ? new Map(EXAMPLES.map((e) => [e.key, examplePlan(e.key)!])) : new Map()), [tab])
  const shown = TEMPLATES.filter((t) => group === 'all' || t.group === group)
  const shownExamples = EXAMPLES.filter((e) => group === 'all' || e.group === group)
  const tracing = pick.startsWith('trace:'), fromTemplate = pick.startsWith('tpl:'), fromExample = pick.startsWith('ex:'), fromPhoto = pick === 'photo'
  /* a template or an example brings its own furniture; Blank and a trace have none to place */
  const ownFurniture = tracing || pick === 'blank' || fromTemplate || fromExample || fromPhoto
  const start = async () => {
    if (busy) return
    if (fromPhoto) { onPhoto?.(); return }   // (pending modules S28) the photo's own dialog takes it from here
    setBusy(true); setError(null)
    const err = await onStart({ templateKey: pick === 'blank' || tracing || fromTemplate || fromExample ? null : pick, furnished: !ownFurniture && furnished, tracePlanId: tracing ? pick.slice(6) : null,
      fromLayoutId: fromTemplate ? pick.slice(4) : null, exampleKey: fromExample ? pick.slice(3) : null }).catch(() => 'Couldn’t start the layout — please try again')
    setBusy(false)
    if (err) setError(err)
  }
  const card = (key: string, title: string, line: string, art: React.ReactNode, disabled?: string) => (
    <button key={key} type="button" role="radio" aria-checked={pick === key} className={styles.card} data-on={pick === key || undefined} disabled={!!disabled} onClick={() => setPick(key)} data-testid="planner-template" data-key={key}>
      <span className={styles.art}>{art}</span>
      <span className={styles.name}>{title}</span>
      <span className={styles.line}>{disabled ?? line}</span>
    </button>
  )
  return (
    <Dialog open={open} onClose={onClose} title={tab === 'examples' ? 'Start from an example' : 'New layout'}
            subtitle={tab === 'examples' ? (projectName ? `For ${projectName} — a furnished flat in a design style, saved with the project as your own copy` : 'A Singapore flat furnished and finished in a design style — it opens as your own copy')
              : projectName ? `For ${projectName} — it is saved with the project` : leadName ? `For ${leadName} — it is saved with the lead and goes to the project once it is won` : templates.length ? 'Start from one of your templates, a Singapore flat, or a blank page' : 'Start from a Singapore flat, or a blank page'} size="modal" width={800} closeOnScrim={false}
            footer={<>
              {tab === 'examples' ? null : <label className={styles.switch} data-off={ownFurniture || undefined}><Switch size="sm" isSelected={furnished && !ownFurniture} isDisabled={ownFurniture} onChange={(v: boolean) => setFurnished(v)} aria-label="Start with furniture placed" /><span>Start with furniture placed</span></label>}
              <span className={styles.grow} />
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button onPress={() => { void start() }} isDisabled={busy} data-testid="planner-start">{busy ? 'Starting…' : fromPhoto ? 'Next' : 'Start'}</Button>
            </>}>
      <div className={styles.body} data-testid="planner-new-dialog">
        {error ? <p className={styles.error} role="alert"><Icon name="error" size={18} weight={300} />{error}</p> : null}
        {/* (the calm UI build, 6-30) one picker, its tabs */}
        <span className={styles.tabs} data-testid="planner-new-tabs">
          <SegmentedButton aria-label="Start from" selectedKeys={[tab]} onSelectionChange={(keys) => { const k = [...keys][0]; if (k === 'flats' || k === 'examples' || k === 'templates') goTab(k) }}>
            <SegmentedButtonItem id="flats">Flats</SegmentedButtonItem>
            <SegmentedButtonItem id="examples">Furnished examples</SegmentedButtonItem>
            {templates.length ? <SegmentedButtonItem id="templates">My templates</SegmentedButtonItem> : null}
          </SegmentedButton>
        </span>
        {tab === 'examples' ? (
          <section className={styles.section} aria-label="Examples">
            <div className={styles.headRow}><h3 className={styles.h}>Furnished examples</h3><Chips label="Kind of flat" options={TEMPLATE_GROUPS.map((g) => ({ value: g.key, label: g.label }))} value={group} onChange={(v) => setGroup(v as 'all' | TemplateGroup)} /></div>
            <div className={styles.grid} role="radiogroup" aria-label="Example">
              {shownExamples.map((e) => card(`ex:${e.key}`, e.name, e.line, <PlanDrawing plan={exampleCovers.get(e.key)!} labels="none" unit={12} decorative />))}
            </div>
          </section>
        ) : null}
        {/* (TD-076) the studio's own starting points, above the flats */}
        {tab === 'templates' && templates.length ? (
          <section className={styles.section} aria-label="My templates" data-testid="planner-my-templates">
            <div className={styles.grid} role="radiogroup" aria-label="My templates">
              {templates.map((t) => card(`tpl:${t.id}`, t.name, [`${t.rooms} ${t.rooms === 1 ? 'room' : 'rooms'}`, t.area ? areaText(t.area) : null, t.levels > 1 ? `${t.levels} levels` : null, t.maker ? `by ${t.maker.split(/\s+/)[0]}` : null].filter(Boolean).join(' · '),
                t.rooms ? <PlanDrawing plan={t.cover} labels="none" unit={12} decorative /> : <span className={styles.glyph}><Icon name="library_add" size={32} weight={300} /></span>))}
            </div>
          </section>
        ) : null}
        {tab === 'flats' && plans.length ? (
          <section className={styles.section} aria-label="From the project">
            <h3 className={styles.h}>From the project</h3>
            <div className={styles.grid} role="radiogroup" aria-label="Trace a floor plan">
              {plans.map((f) => card(`trace:${f.id}`, `Trace ${f.name}`, 'Its floor plan under the drawing, at its true size',
                <span className={styles.glyph}><Icon name="layers" size={32} weight={300} /></span>, f.scaled ? undefined : 'Set its scale on the Floor plan tab first'))}
            </div>
          </section>
        ) : null}
        {tab === 'flats' ? <section className={styles.section} aria-label="Flats">
          <div className={styles.headRow}><h3 className={styles.h}>Singapore flats</h3><Chips label="Kind of flat" options={TEMPLATE_GROUPS.map((g) => ({ value: g.key, label: g.label }))} value={group} onChange={(v) => setGroup(v as 'all' | TemplateGroup)} /></div>
          <div className={styles.grid} role="radiogroup" aria-label="Flat">
            {shown.map((t) => card(t.key, t.name, `${t.line} · ${areaText(planArea(covers.get(t.key)!))}`, <PlanDrawing plan={covers.get(t.key)!} labels="none" unit={12} decorative />))}
            {group === 'all' ? card('blank', 'Blank', 'An empty page — draw your own rooms', <span className={styles.glyph}><Icon name="add_box" size={32} weight={300} /></span>) : null}
            {/* (pending modules S28; the calm UI build, 6-06 · W-020) named apart from Tools › Floorplan to 3D Isometric: this starts a layout over the photo */}
            {group === 'all' && onPhoto ? card('photo', 'Trace a floor-plan photo', 'Straightened, its rooms placed on it — then a 3D floor plan', <span className={styles.glyph}><Icon name="add_photo_alternate" size={32} weight={300} /></span>) : null}
          </div>
        </section> : null}
      </div>
    </Dialog>
  )
}
