'use client'

import { useEffect, useRef, useState } from 'react'
import { Chips } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { LEVEL_ONE, allRooms, areaText, levelsOf, onLevel, totalArea, type PlanDoc } from '@/lib/planner/model'
import { displayDate } from '@/lib/format'
import type { LibraryMaterial } from '@/lib/visualizer/materials'
import { ThreeView, type ThreeHandle } from '../scene/three-view'
import { PlanDrawing } from '../plan-drawing'
import { ViewSwitch, type View } from '../editor/planner-topbar'
import styles from './layout-viewer.module.css'

/**
 * (gaps build J, J-Q15 · J-Q16) The client's read-only walk through a shared layout — on its no-login link and inside the portal: the
 * layout's name, who shared it and when, their note; 3D (orbit), Walk (first person, the pad on a phone) and Top (the drawing with its
 * rooms and sizes); room chips that fly the camera to a room. Laid out for a phone too — 1.0's "Rotate your device" wall (F-262) is not
 * ported. The page stamps the client's first open once, from the browser (`onOpened`), never while it renders.
 * (parity map, TD-075) A layout with more than one level shows them as chips on the stage — each level its own plan.
 */
export function LayoutViewer({ plan, library = [], name, sender, sharedAt, message, onOpened }: {
  plan: PlanDoc; library?: LibraryMaterial[]; name: string; sender: string | null; sharedAt: number; message: string | null
  onOpened?: () => void
}) {
  const [view, setView] = useState<View>('3d')
  const three = useRef<ThreeHandle>(null)
  const stamped = useRef(false)
  useEffect(() => { if (!stamped.current) { stamped.current = true; onOpened?.() } }, [onOpened])
  const levels = levelsOf(plan)
  const [level, setLevel] = useState(LEVEL_ONE)
  const shown = onLevel(plan, levels.some((l) => l.id === level) ? level : LEVEL_ONE)
  const area = totalArea(plan), rooms = allRooms(plan).length
  return (
    <section className={styles.viewer} aria-label={name} data-testid="layout-viewer">
      <div className={styles.head}>
        <div className={styles.titles}>
          <h1 className={styles.title}>{name}</h1>
          <span className={styles.line}>{[`${rooms} ${rooms === 1 ? 'room' : 'rooms'}`, levels.length > 1 ? `${levels.length} levels` : null, area ? areaText(area) : null, `Shared ${displayDate(new Date(sharedAt))}${sender ? ` by ${sender}` : ''}`].filter(Boolean).join(' · ')}</span>
        </div>
        <ViewSwitch view={view} onView={setView} />
      </div>
      {message ? <p className={styles.message}>{`“${message}”${sender ? ` — ${sender}` : ''}`}</p> : null}
      <div className={styles.stage}>
        {view === 'top' ? (
          <div className={styles.top}><PlanDrawing plan={shown} library={library} labels="full" dims unit={3} title={`Top view of ${name}`} testId="layout-viewer-top" /></div>
        ) : (
          <ThreeView ref={three} plan={shown} library={library} mode={view === 'walk' ? 'walk' : 'orbit'} low={plan.wallsLow} label={`${name} in 3D`} />
        )}
        {levels.length > 1 ? (
          <div className={`${styles.float} ${styles.levels}`}>
            <Chips label="Level" options={levels.map((l) => ({ value: l.id, label: l.name }))} value={shown === plan ? LEVEL_ONE : level} onChange={setLevel} testId="layout-viewer-levels" />
          </div>
        ) : null}
        {view !== 'top' && shown.rooms.length ? (
          <div className={`${styles.float} ${styles.rooms}`} data-below={levels.length > 1 || undefined}>
            <Chips label="Go to a room" options={shown.rooms.map((r) => ({ value: r.id, label: r.name }))} value={null} onChange={(id) => three.current?.flyTo(id)} testId="layout-viewer-rooms" />
          </div>
        ) : null}
        {view === '3d' ? <div className={`${styles.float} ${styles.fit}`}><Tooltip label="See the whole layout"><IconButton icon="fit_screen" label="See the whole layout" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => three.current?.fit()} /></Tooltip></div> : null}
        {view === 'walk' ? (
          <div className={`${styles.float} ${styles.pad}`} role="group" aria-label="Walk">
            {([['forward', 'keyboard_arrow_up', 'Walk forward'], ['left', 'keyboard_arrow_left', 'Step left'], ['back', 'keyboard_arrow_down', 'Walk back'], ['right', 'keyboard_arrow_right', 'Step right']] as const).map(([d, icon, label]) => (
              <button key={d} type="button" className={styles.padKey} aria-label={label}
                      onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); three.current?.walkStep(d, true) }}
                      onPointerUp={() => three.current?.walkStep(d, false)} onPointerCancel={() => three.current?.walkStep(d, false)} onPointerLeave={() => three.current?.walkStep(d, false)}>
                <Icon name={icon} size={24} weight={300} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <p className={styles.hint}>{view === 'walk' ? 'Drag to look around — the arrows walk you through the rooms.' : view === '3d' ? 'Drag to turn it, pinch or scroll to come closer, pick a room to fly to it.' : 'Each room with its size — switch to 3D or Walk to look inside.'}</p>
    </section>
  )
}
