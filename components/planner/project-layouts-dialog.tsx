'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { displayDate } from '@/lib/format'
import { withFrom } from '@/lib/nav'
import type { ProjectLayoutRow, TemplatePick } from '@/lib/planner/queries'
import { createLayout, readLeadLayouts, readProjectLayouts } from '@/app/planner/actions'
import { NewLayoutDialog, type NewLayoutPick } from './new-layout-dialog'
import { PhotoDialog } from './photo/photo-dialog'   // (pending modules S28)
import styles from './project-layouts-dialog.module.css'

/**
 * (gaps build J, J-Q3 — 1.0's "Plan the Space (3D)" dialog, F-248…F-250, its list fixed: F-265 never saved a layout with its project, so the
 * list stayed empty) A project's layouts, newest first, and *Start a new layout* — the template picker with the project already chosen
 * (its floor plans offered to trace). A layout opens in the planner and Back returns to the project.
 */
export function ProjectLayoutsDialog({ project, lead = null, onClose }: { project: { id: string; name: string } | null
  /** (pending modules S07) a lead before it is won: its own layouts, which go to its project at Won */ lead?: { id: string; name: string } | null; onClose: () => void }) {
  const router = useRouter()
  const target = project ?? lead
  const [rows, setRows] = useState<{ layouts: ProjectLayoutRow[]; plans: { id: string; name: string; scaled: boolean }[]; templates: TemplatePick[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [photo, setPhoto] = useState(false)   // (pending modules S28) Make a 3D picture, for this project or lead
  const [was, setWas] = useState<string | null>(null)
  if ((target?.id ?? null) !== was) { setWas(target?.id ?? null); setRows(null); setError(null); setStarting(false); setPhoto(false) }
  const pid = project?.id ?? null, lid = project ? null : lead?.id ?? null   // read by id — a parent's new object each render never reads again
  useEffect(() => {
    if (!pid && !lid) return
    let live = true
    void (pid ? readProjectLayouts(pid) : readLeadLayouts(lid!)).then((r) => { if (!live) return; if ('error' in r) setError(r.error); else setRows(r) }, () => { if (live) setError('Couldn’t read the layouts — please try again') })
    return () => { live = false }
  }, [pid, lid])
  const here = () => `${window.location.pathname}${window.location.search}`
  const open = (id: string) => { onClose(); router.push(withFrom(`/planner/${id}`, here())) }
  const start = async (p: NewLayoutPick): Promise<string | null> => {
    if (!target) return null
    const r = await createLayout({ ...p, projectId: project?.id ?? null, leadId: project ? null : lead?.id ?? null })
    if ('error' in r) return r.error
    setStarting(false); onClose()
    router.push(withFrom(`/planner/${r.id}`, here()))
    return null
  }
  return (
    <>
      <Dialog open={!!target && !starting && !photo} onClose={onClose} title="Plan the space in 3D"
              subtitle={lead && !project
                /* (pending modules S07) a lead's — the project takes them once the lead is won *(invented copy)* */
                ? (rows?.layouts.length ? `Pick up where you left off — ${rows.layouts.length} ${rows.layouts.length === 1 ? 'layout' : 'layouts'} for ${lead.name} — or start a new one. They go to the project once the lead is won.` : `Lay out ${lead.name}’s home in 3D — rooms, furniture and finishes — and walk them through it. It goes to the project once the lead is won.`)
                : rows?.layouts.length ? `Pick up where you left off — ${rows.layouts.length} ${rows.layouts.length === 1 ? 'layout' : 'layouts'} on ${project?.name ?? 'this project'} — or start a new one.` : `Lay out ${project?.name ?? 'the project'} in 3D — rooms, furniture and finishes — and walk the client through it.`}
              size="modal" width={600} footer={<Button variant="secondary" appearance="outlined" onPress={onClose}>Close</Button>}>
        <div className={styles.body} data-testid="project-layouts-dialog">
          {error ? <p className={styles.line} role="alert">{error}</p> : !rows ? <p className={styles.line}>{project ? 'Looking for the project’s layouts…' : 'Looking for the lead’s layouts…'}</p> : (
            <ul className={styles.list}>
              {rows.layouts.map((l) => (
                <li key={l.id}>
                  <button type="button" className={styles.row} onClick={() => open(l.id)} data-testid="project-layout">
                    <span className={styles.glyph}><Icon name="space_dashboard" size={20} weight={300} /></span>
                    <span className={styles.text}><span className={styles.name}>{l.name}</span><span className={styles.sub}>{[`${l.rooms} ${l.rooms === 1 ? 'room' : 'rooms'}`, `Edited ${displayDate(new Date(l.updatedAt))}${l.author ? ` by ${l.author}` : ''}`].join(' · ')}</span></span>
                    {l.shared ? <MetaChip color="green">Shared</MetaChip> : null}
                    <Icon name="chevron_right" size={20} weight={300} />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className={`${styles.row} ${styles.new}`} onClick={() => setStarting(true)} data-testid="project-layout-new">
                  <span className={styles.glyph}><Icon name="add" size={20} weight={300} /></span>
                  <span className={styles.text}><span className={styles.name}>Start a new layout</span><span className={styles.sub}>{rows.plans.length ? 'From a Singapore flat, a blank page, a floor-plan photo, or the project’s floor plan' : 'From a Singapore flat, a blank page, or a floor-plan photo'}</span></span>
                </button>
              </li>
            </ul>
          )}
        </div>
      </Dialog>
      {/* (parity map, TD-076) the studio's templates start a project's layout too */}
      <NewLayoutDialog open={!!target && starting} onClose={() => setStarting(false)} projectName={project?.name ?? null} leadName={project ? null : lead?.name ?? null} plans={rows?.plans ?? []} onStart={start} templates={rows?.templates ?? []}
                       onPhoto={() => { setStarting(false); setPhoto(true) }} />
      <PhotoDialog open={!!target && photo} onClose={() => { setPhoto(false); onClose() }} target={project ? { kind: 'project', id: project.id } : lead ? { kind: 'lead', id: lead.id } : null} />
    </>
  )
}
