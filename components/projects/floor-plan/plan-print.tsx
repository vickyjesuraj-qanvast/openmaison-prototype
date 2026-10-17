'use client'

import { useEffect, useMemo, useState } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useRouter } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs } from '@/components/om/crumbs'
import { PageReveal } from '@/components/shell/page-reveal'
import { displayDate } from '@/lib/format'
import { SIDE_LABEL, isStudioOnly, layerOf, markName, numberMarks, pointSchedule, type MarkView } from '@/lib/projects/floor-plan-model'
import type { FloorPlanData } from '@/lib/projects/floor-plan'
import { HatchDefs, MarkShapeSvg } from './mark-shapes'
import { PlanPrintGhost } from './plan-print-ghost'
import frame from '@/components/quotes/preview/quote-preview.module.css'
import styles from './plan-print.module.css'

/** The plan's box on the first page, in CSS px at 96 dpi: A4 landscape less its margins, its head and its foot. */
const BOX = { w: 1030, h: 600 }

/**
 * (gaps build G, G-Q13 — 1.0 F-220, fixing F-241: the page names the project, not the plan) The marked plan for the contractor, as a paper to
 * print — the quote preview's frame (its bar, its stage, Download PDF = the browser's print of the same pages, 2.0's way). Page one: the plan with
 * every mark, under the project's name and number, the plan's name, the day and its scale. Page two: the legend — pins 1, 2… and callouts C1,
 * C2… with their words and their conversation, then the points counted. *Include Studio only* (on by default: it is the studio's own copy for its
 * contractor) leaves the studio's working notes off when the copy goes to someone else.
 */
export function PlanPrint({ data, from, print }: { data: FloorPlanData; from?: string; print: boolean }) {
  const router = useRouter()
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
          <div className={frame.stage}>
            <div className={styles.papers}>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  )
  return print ? page : <PageReveal skeleton={<PlanPrintGhost />}>{page}</PageReveal>
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
