'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useRouter } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs } from '@/components/om/crumbs'
import { PageReveal } from '@/components/shell/page-reveal'
import { PaperViewer } from '@/components/quotes/confirm/paper-viewer'   // (W3-15) the house "As printed" viewer, shared
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { displayDate } from '@/lib/format'
import { SIDE_LABEL, isStudioOnly, layerOf, markName, numberMarks, pointSchedule, type MarkView } from '@/lib/projects/floor-plan-model'
import type { FloorPlanData } from '@/lib/projects/floor-plan'
import { HatchDefs, MarkShapeSvg } from './mark-shapes'
import { PlanPrintGhost } from './plan-print-ghost'
import frame from '@/components/quotes/preview/quote-preview.module.css'
import styles from './plan-print.module.css'

/** The plan's box on the first page, in CSS px at 96 dpi: A4 landscape less its margins, its head and its foot. */
const BOX = { w: 1030, h: 600 }
/** (W3-15) A paper's own width — A4 landscape, 297mm at 96 dpi. */
const PAPER_W = (297 * 96) / 25.4

/**
 * (gaps build G, G-Q13 — 1.0 F-220, fixing F-241: the page names the project, not the plan) The marked plan for the contractor, as a paper to
 * print — the quote preview's frame (its bar, its stage, Download PDF = the browser's print of the same pages, 2.0's way). Page one: the plan with
 * every mark, under the project's name and number, the plan's name, the day and its scale. Page two: the legend — pins 1, 2… and callouts C1,
 * C2… with their words and their conversation, then the points counted. *Include Studio only* (on by default: it is the studio's own copy for its
 * contractor) leaves the studio's working notes off when the copy goes to someone else.
 * (held calls 2026-10-24, W3-15 — his "fix all of it") On a phone the papers are fitted to the screen's width — they scrolled sideways at 1:1
 * — and a press on one opens them in the house paper viewer (fit to width, pinch, a swipe to the next page, Download in its bar); ← comes
 * back here, where the switch, Back to the plan and Download stay. Printing draws them at their size, from either.
 */
export function PlanPrint({ data, from, print }: { data: FloorPlanData; from?: string; print: boolean }) {
  const router = useRouter()
  const phone = useMediaQuery(MOBILE) && !print
  /* the stage's inner width — the papers' fit on a phone */
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageW, setStageW] = useState(0)
  useEffect(() => {
    const el = stageRef.current
    if (!phone || !el) return
    const ro = new ResizeObserver((es) => { for (const e of es) setStageW(e.contentRect.width) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [phone])
  const [viewing, setViewing] = useState<number | null>(null)   // the paper pressed, or null
  const [fitW, setFitW] = useState(0)
  const onFit = useCallback((w: number) => setFitW(w), [])
  const plan = data.plans.find((p) => p.id === data.planId)!
  const [withStudioOnly, setWithStudioOnly] = useState(true)
  const back = from ?? `/projects/${data.project.id}/floor-plan?plan=${encodeURIComponent(plan.id)}`
  useEffect(() => { if (print) { const t = setTimeout(() => printPaper(), 600); return () => clearTimeout(t) } }, [print])
  const marks = useMemo(() => data.marks.filter((m) => withStudioOnly || !isStudioOnly(m.layer)), [data.marks, withStudioOnly])
  const nums = useMemo(() => numberMarks(marks), [marks])
  /* the legend in the order a reader looks for them: pins 1, 2…, then callouts C1…, then the studio's own S1… */
  const legend = useMemo(() => {
    const rank = (n: string) => (/^\d/.test(n) ? 0 : n.startsWith('C') ? 1 : 2)
    return [...marks].filter((m) => nums.has(m.id)).sort((a, b) => { const x = nums.get(a.id)!, y = nums.get(b.id)!; return rank(x) - rank(y) || parseInt(x.replace(/\D/g, ''), 10) - parseInt(y.replace(/\D/g, ''), 10) })
  }, [marks, nums])
  const points = useMemo(() => pointSchedule(marks), [marks])
  const aspect = plan.width / Math.max(1, plan.height)
  const shownW = Math.min(BOX.w, BOX.h * aspect)
  const u = plan.width / shownW
  const today = displayDate(new Date(data.now))
  const head = (
    <div className={styles.head}>
      <div className={styles.headMain}>
        <span className={styles.project}>{data.project.name}</span>
        <span className={styles.line}>{[data.project.number, `Client: ${data.client.name}`].join(' · ')}</span>
      </div>
      <div className={styles.headSide}>
        <span className={styles.planName}>{plan.name}</span>
        <span className={styles.line}>{[`Printed ${today}`, plan.scale ? 'Lengths to scale' : 'No scale set', `${marks.length} ${marks.length === 1 ? 'mark' : 'marks'}`].join(' · ')}</span>
      </div>
    </div>
  )
  const papers = (fit: number | null, where: 'stage' | 'viewer') => {
    const sheets: { label: string; node: ReactNode }[] = [
      { label: 'The marked plan', node: (
              <section className={styles.paper} aria-label="The marked plan">
                {head}
                <div className={styles.planBox}>
                  <svg className={styles.plan} viewBox={`0 0 ${plan.width} ${plan.height}`} style={{ width: shownW, height: shownW / aspect }} role="img" aria-label={`${plan.name} with ${marks.length} marks`}>
                    <image href={plan.picture} x={0} y={0} width={plan.width} height={plan.height} preserveAspectRatio="none" />
                    <HatchDefs marks={marks} u={u} />
                    {marks.map((m) => <MarkShapeSvg key={m.id} m={m} ctx={{ w: plan.width, h: plan.height, u, num: nums.get(m.id), scale: plan.scale }} />)}
                  </svg>
                </div>
                <p className={styles.foot}>Pins and callouts are numbered — what each one says is on the next page.</p>
              </section>
      ) },
      { label: 'Legend', node: (
              <section className={styles.paper} data-flow="" aria-label="Legend">
                {head}
                <h2 className={styles.h2}>Legend</h2>
                {legend.length ? (
                  <table className={styles.legend}>
                    <thead><tr><th>No.</th><th>Mark</th><th>By</th><th>What it says</th></tr></thead>
                    <tbody>
                      {legend.map((m) => <LegendRow key={m.id} m={m} num={nums.get(m.id)!} name={markName(m, nums.get(m.id), plan)} />)}
                    </tbody>
                  </table>
                ) : <p className={styles.line}>No pins or callouts on this plan.</p>}
                {points.total ? (
                  <>
                    <h2 className={styles.h2}>Points</h2>
                    <table className={styles.legend}>
                      <thead><tr><th>Group</th><th>Point</th><th>Count</th></tr></thead>
                      <tbody>{points.groups.flatMap((g) => g.rows.map((r) => <tr key={r.def.key}><td>{g.label}</td><td>{r.def.label}</td><td>{r.count}</td></tr>))}<tr><td colSpan={2}>All points</td><td>{points.total}</td></tr></tbody>
                    </table>
                  </>
                ) : null}
                {plan.scale ? <p className={styles.line}>Lengths are read from the plan’s scale — check them on site before anything is cut.</p> : null}
              </section>
      ) },
    ]
    /* the desk, a tablet and printing: the papers at their size */
    if (fit === null) return <div className={styles.papers}>{sheets.map((s) => <Fragment key={s.label}>{s.node}</Fragment>)}</div>
    /* a phone (W3-15): each paper scaled whole to the width; on the page a press opens it in the viewer; inside the viewer a page each.
       While the viewer is open its copy is the one that prints. */
    return (
      <div className={styles.papers} data-under={where === 'stage' && viewing !== null ? '' : undefined}>
        {sheets.map((s, i) => (
          <FitPaper key={s.label} fit={fit} page={where === 'viewer'}
                    press={where === 'stage' ? { label: `Open page ${i + 1} of ${sheets.length}`, run: () => setViewing(i) } : undefined}>{s.node}</FitPaper>
        ))}
      </div>
    )
  }
  const page = (
    <div className={frame.page} data-print={print || undefined} data-testid="plan-print">
      <header className={frame.bar}>
        <div className={frame.titleBlock}>
          <Crumbs className={frame.crumb} items={[{ label: 'Projects', href: '/projects' }, { label: data.project.name, href: `/projects/${data.project.id}` }, { label: 'Floor plan', href: back }]} />
          <div className={frame.titleRow}>
            <h1 className={frame.title}>{plan.name}</h1>
            <span className={frame.chips}>{plan.isMain ? <MetaChip icon="star">Main plan</MetaChip> : null}<MetaChip>{`${legend.length} in the legend`}</MetaChip></span>
          </div>
        </div>
        <div className={frame.actions}>
          <label className={styles.switchRow}>
            <Switch size="sm" isSelected={withStudioOnly} onChange={setWithStudioOnly} aria-label="Include Studio only marks" />
            <span>Include Studio only</span>
          </label>
          <Button variant="secondary" appearance="outlined" onPress={() => router.push(back)}>Back to the plan</Button>
          <Tooltip label="Download PDF"><IconButton icon="download" label="Download PDF" onClick={() => printPaper()} data-testid="plan-print-download" /></Tooltip>
        </div>
      </header>
      <div className={frame.body}>
        <div className={frame.column}>
          <div ref={stageRef} className={frame.stage}>
            {papers(phone && stageW ? stageW / PAPER_W : null, 'stage')}
          </div>
        </div>
      </div>
      {phone ? (
        <PaperViewer open={viewing !== null} onClose={() => setViewing(null)} title={plan.name} subtitle={data.project.name} onDownload={() => printPaper()} onFit={onFit}
                     backLabel="Back to the marked plan" startPage={viewing ?? 0}>
          {papers(fitW ? fitW / PAPER_W : 0.3, 'viewer')}
        </PaperViewer>
      ) : null}
    </div>
  )
  return print ? page : <PageReveal skeleton={<PlanPrintGhost />}>{page}</PageReveal>
}

/** (W3-15) A paper drawn at its print size and scaled whole to `fit` — its box takes the scaled size (`--fit-w` · `--fit-h`, measured), so the
    stage and the viewer lay it out as a picture; printing takes the scale off. On the page it is a press that opens the viewer. */
function FitPaper({ fit, page, press, children }: { fit: number; page: boolean; press?: { label: string; run: () => void }; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(PAPER_W * (210 / 297))
  useEffect(() => {
    const el = inner.current
    if (!el) return
    const ro = new ResizeObserver(() => setH(Math.max(1, el.offsetHeight)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const vars = { '--fit': fit, '--fit-w': `${PAPER_W * fit}px`, '--fit-h': `${h * fit}px` } as CSSProperties
  const body = <div ref={inner} className={styles.fitInner}>{children}</div>
  if (!press) return <div className={styles.fit} data-page={page ? '' : undefined} style={vars}>{body}</div>
  return (
    <div className={`${styles.fit} ${styles.fitPress}`} style={vars} role="button" tabIndex={0} aria-label={press.label} data-testid="plan-paper-open"
         onClick={press.run} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press.run() } }}>
      {body}
    </div>
  )
}

function LegendRow({ m, num, name }: { m: MarkView; num: string; name: string }) {
  return (
    <tr>
      <td className={styles.num}>{num}</td>
      <td>{name}{m.status === 'resolved' ? ' (resolved)' : ''}{m.layer !== 'general' ? <span className={styles.layer}>{layerOf(m.layer).label}</span> : null}</td>
      <td>{`${m.author} · ${SIDE_LABEL[m.side]}`}</td>
      <td>
        {m.shape.text ? <span className={styles.words}>{`“${m.shape.text}”`}</span> : null}
        {m.comments.map((c) => <span key={c.id} className={styles.said}>{`${c.author} (${SIDE_LABEL[c.side]}): ${c.body || `${c.photos.length} ${c.photos.length === 1 ? 'photo' : 'photos'}`}`}</span>)}
        {m.photos.length ? <span className={styles.said}>{`${m.photos.length} site ${m.photos.length === 1 ? 'photo' : 'photos'}${m.shape.takenOn ? `, ${displayDate(new Date(`${m.shape.takenOn}T12:00:00`))}` : ''}`}</span> : null}
      </td>
    </tr>
  )
}
