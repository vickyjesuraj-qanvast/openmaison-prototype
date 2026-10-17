'use client'

import { useEffect, useRef, useState } from 'react'
import { printPaper } from '@/lib/paper-print'   // (pending modules S34) every paper's Download PDF, one call
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { Crumbs } from '@/components/om/crumbs'
import { PageReveal } from '@/components/shell/page-reveal'
import { displayDate } from '@/lib/format'
import { pieceName } from '@/lib/planner/catalogue'
import { floorLook, wallLook } from '@/lib/planner/look'
import { KIND_LABEL, OUTDOOR, allRooms, areaText, levelsOf, onLevel, roomAt, sizeText, totalArea } from '@/lib/planner/model'
import type { PlannerEditorData } from '@/lib/planner/queries'
import { PlanDrawing } from '../plan-drawing'
import { ThreeView, type ThreeHandle } from '../scene/three-view'
import { LayoutPrintGhost } from '../planner-ghosts'
import frame from '@/components/quotes/preview/quote-preview.module.css'
import paper from '@/components/projects/floor-plan/plan-print.module.css'
import styles from './layout-print.module.css'

/**
 * (gaps build J, J-Q13) A layout as a paper to print — the floor plan's paper (G's, the quote preview's frame; Download PDF = the
 * browser's print of the same pages, 2.0's way). Page one: the top view with its rooms, sizes and overall dimensions, under the project's
 * name and number, the layout's name and the day. Page two: a 3D view (drawn here, in the browser) beside the room schedule (room · kind ·
 * size · area · floor · walls) and the furniture list (piece · size · room, counted).
 * (parity map, TD-075) A layout with more than one level prints a plan page per level, and the lists name each room's level.
 */
export function LayoutPrint({ data, from, print }: { data: PlannerEditorData; from?: string; print: boolean }) {
  const router = useRouter()
  const { plan, layout, project } = data
  const back = from ?? `/planner/${layout.id}`
  const today = displayDate(new Date(data.now))
  const three = useRef<ThreeHandle>(null)
  const [shot, setShot] = useState<string | null>(null)
  useEffect(() => {
    if (!plan.rooms.length) return
    const t = window.setTimeout(() => { const url = three.current?.capture(); if (url) setShot(url) }, 900)
    return () => window.clearTimeout(t)
  }, [plan.rooms.length])
  useEffect(() => { if (print && (shot || !plan.rooms.length)) { const t = setTimeout(() => printPaper(), 400); return () => clearTimeout(t) } }, [print, shot, plan.rooms.length])
  const levels = levelsOf(plan), many = levels.length > 1
  const pieces = new Map<string, { name: string; size: string; rooms: Set<string>; n: number }>()
  for (const l of levels) for (const p of l.pieces) {
    const k = `${p.key}:${p.w}x${p.d}x${p.h}`
    const e = pieces.get(k) ?? { name: pieceName(p.key), size: `${p.w} × ${p.d} × ${p.h} cm`, rooms: new Set<string>(), n: 0 }
    const where = roomAt(l.rooms, p.x, p.z)?.name ?? 'Outside the rooms'
    e.n += 1; e.rooms.add(many ? `${l.name} · ${where}` : where); pieces.set(k, e)
  }
  const inside = totalArea(plan), roomCount = allRooms(plan).length, pieceCount = levels.reduce((n, l) => n + l.pieces.length, 0)
  const head = (
    <div className={paper.head}>
      <div className={paper.headMain}>
        <span className={paper.project}>{project?.name ?? data.studio}</span>
        <span className={paper.line}>{project ? [project.number, `Client: ${project.leadName}`].join(' · ') : 'A personal layout'}</span>
      </div>
      <div className={paper.headSide}>
        <span className={paper.planName}>{layout.name}</span>
        <span className={paper.line}>{[`Printed ${today}`, `${roomCount} ${roomCount === 1 ? 'room' : 'rooms'}`, many ? `${levels.length} levels` : null, inside ? `${areaText(inside)} inside` : null].filter(Boolean).join(' · ')}</span>
      </div>
    </div>
  )
  const page = (
    <div className={frame.page} data-print={print || undefined} data-testid="layout-print">
      <header className={frame.bar}>
        <div className={frame.titleBlock}>
          <Crumbs className={frame.crumb} items={[{ label: '3D Space Planner', href: '/planner' }, { label: layout.name, href: back }]} />
          <div className={frame.titleRow}>
            <h1 className={frame.title}>{layout.name}</h1>
            <span className={frame.chips}><MetaChip>{project ? project.number : 'Personal'}</MetaChip></span>
          </div>
        </div>
        <div className={frame.actions}>
          <Button variant="secondary" appearance="outlined" onPress={() => router.push(back)}>Back to the layout</Button>
          <Tooltip label="Download PDF"><IconButton icon="download" label="Download PDF" onClick={() => printPaper()} data-testid="layout-print-download" /></Tooltip>
        </div>
      </header>
      <div className={frame.body}>
        <div className={frame.column}>
          <div className={frame.stage}>
            <div className={paper.papers}>
              {levels.map((l) => (
                <section key={l.id} className={paper.paper} aria-label={many ? `The plan — ${l.name}` : 'The plan'}>
                  {head}
                  {many ? <h2 className={paper.h2}>{l.name}</h2> : null}
                  <div className={`${paper.planBox} ${styles.planBox}`}>
                    <PlanDrawing plan={onLevel(plan, l.id)} library={data.library} labels="full" dims unit={1.6} title={`Top view of ${layout.name}${many ? ` — ${l.name}` : ''}`} />
                  </div>
                  <p className={paper.foot}>Sizes are each room’s inside length and width, in metres. Check every length on site before anything is cut.</p>
                </section>
              ))}
              <section className={paper.paper} data-flow="" aria-label="The rooms and the furniture">
                {head}
                <div className={styles.twoUp}>
                  <div className={styles.shot}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- a picture drawn in the browser (a data URL) */}
                    {shot ? <img src={shot} alt={`${layout.name} in 3D`} className={styles.shotImg} /> : plan.rooms.length ? (
                      <div className={styles.shotLive}><ThreeView ref={three} plan={plan} library={data.library} mode="orbit" low={false} label={`${layout.name} in 3D`} /></div>
                    ) : null}
                  </div>
                  <div className={styles.side}>
                    <h2 className={paper.h2}>Rooms</h2>
                    <table className={paper.legend}>
                      <thead><tr><th>Room</th><th>Size</th><th>Area</th><th>Floor · Walls</th></tr></thead>
                      <tbody>{levels.flatMap((l) => l.rooms.map((r) => (
                        <tr key={r.id}><td>{r.name}<span className={paper.layer}>{many ? `${l.name} · ${KIND_LABEL[r.kind]}` : KIND_LABEL[r.kind]}</span></td><td>{sizeText(r.w, r.d)}</td><td>{areaText(r.w * r.d)}{OUTDOOR.includes(r.kind) ? ' (outside)' : ''}</td>
                          <td>{[floorLook(r, data.library).name ?? 'Template colour', wallLook(r, data.library).name ?? 'Template colour'].join(' · ')}</td></tr>
                      )))}</tbody>
                    </table>
                  </div>
                </div>
                <h2 className={paper.h2}>Furniture</h2>
                {pieces.size ? (
                  <table className={paper.legend}>
                    <thead><tr><th>Piece</th><th>Size</th><th>Where</th><th>Count</th></tr></thead>
                    <tbody>{[...pieces.values()].sort((a, b) => a.name.localeCompare(b.name)).map((e) => <tr key={`${e.name}${e.size}`}><td>{e.name}</td><td>{e.size}</td><td>{[...e.rooms].join(', ')}</td><td>{e.n}</td></tr>)}
                      <tr><td colSpan={3}>All pieces</td><td>{pieceCount}</td></tr></tbody>
                  </table>
                ) : <p className={paper.line}>No furniture placed yet.</p>}
                <p className={paper.line}>Each piece is drawn at the size in the list.</p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
  return print ? page : <PageReveal skeleton={<LayoutPrintGhost />}>{page}</PageReveal>
}
