'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { Dialog } from '@/components/om/dialog'
import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { useSheetLayout } from '@/components/om/sheet'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { uploadPicked } from '@/components/leads/files/upload-picture'
import { PhotoViewer } from '@/components/portal/project/photo-viewer'
import { ClientAccessPanel } from '@/components/portal/client-access-panel'
import { GHOST_MIN_MS } from '@/components/shell/page-reveal'
import { useRememberShape } from '@/lib/ghost-shape'
import { useMediaQuery } from '@/lib/breakpoint'
import { displayDate } from '@/lib/format'
import { withFrom } from '@/lib/nav'
import {
  addFloorPlan, addFloorPlanMark, commentOnFloorPlanMark, deleteFloorPlanMark, floorPlanFolder, floorPlanMarkToTask, floorPlanMarkToVariation, moveFloorPlanMark, putAwayFloorPlan, renameFloorPlan,
  restoreFloorPlan, restoreFloorPlanMark, setFloorPlanMarkLayer, setFloorPlanMarkStatus, setFloorPlanScale, setMainFloorPlan, undoAddFloorPlan, undoFloorPlanScale,
  askClientForFloorPlan, undoFloorPlanAsk,   // (parity map, TD-049 · UC-094)
} from '@/app/projects/floor-plan-actions'
import {
  ALL_MARKS, CONFIRM_NATURE, LAYERS, NAME_MAX, filterMarks, isoDay, layerCounts, markName, numberMarks, pointSchedule, siteDiary, type HatchKey, type MarkFilter, type MarkShape, type MarkTool, type MarkView, type Pt, type Who,
} from '@/lib/projects/floor-plan-model'
import type { FloorPlanData } from '@/lib/projects/floor-plan'
import { PlanCanvas, type CanvasTool } from './plan-canvas'
import { PlanToolbar, toolLine } from './plan-toolbar'
import { MarkCard } from './mark-card'
import { DiaryCard, PointsCard } from './plan-cards'
import { AddPlanDialog } from './add-plan-dialog'
import { planPictureOf } from './plan-picture'
import { PhotoDialog } from '@/components/planner/photo/photo-dialog'   // (pending modules S28)
import styles from './floor-plan.module.css'

type UndoStep = { kind: 'add'; id: string } | { kind: 'move'; id: string; before: MarkShape } | { kind: 'delete'; id: string }
let tmpN = 0

/**
 * (gaps build G — Q-19's "later", calls G-Q1…G-Q18) A project's Floor plan tab: the studio and the client mark up the same plan and talk about
 * each mark. The tab toolbar (the plan's name · Add a plan · Download PDF · ⋮); the plans as chips when there are several (the main one marked);
 * the client's confirmation as the house banner; then the plan with its tools on the left and the rail on the right — the filter, Points,
 * Site diary and the marks, each one opening its conversation. A first run is the house empty state with its ways in (REG-735). Each mark is
 * kept the moment it is drawn and shown at once; every remove answers with Undo; ⌘Z / Ctrl Z undoes your last mark.
 */
export function ProjectFloorPlan({ data, views }: { data: FloorPlanData; /** (simplify S-03) the Design group's view switch, in the title's place — the
    plan's name then rides in the plans' chips, drawn for one plan too */ views?: ReactNode }) {
  const { project, client, viewer, plans, confirmations } = data
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const snack = useSnackbar()
  const { run } = useRun()
  const phone = useSheetLayout()
  const touch = useMediaQuery('(hover: none)')
  const plan = plans.find((p) => p.id === data.planId) ?? null
  const first = plans.length === 0
  useRememberShape(`lead.${project.id}.floor-plan`, first)
  const mayAct = viewer.mayChange
  const here = () => `${window.location.pathname}${window.location.search}`

  /* the marks on screen — the server's, with what this page drew, moved or deleted laid over them until the server says so */
  const [marks, setMarks] = useState<MarkView[]>(data.marks)
  const [seen, setSeen] = useState(data.marks)
  if (seen !== data.marks) { setSeen(data.marks); setMarks(data.marks) }
  const [selected, setSelected] = useState<string | null>(() => params.get('mark'))
  const [tool, setTool] = useState<CanvasTool>('select')
  const [after, setAfter] = useState<CanvasTool | null>(null)   // the tool to go back to once the scale is set
  const [symbol, setSymbol] = useState<string | null>('socket_13a')
  const [pattern, setPattern] = useState<HatchKey>('diagonal')
  const [pen, setPen] = useState<{ color: string | null; weight: 1 | 2 | 3; dashed: boolean }>({ color: null, weight: 2, dashed: false })
  const [layer, setLayer] = useState('general')
  const [filter, setFilter] = useState<MarkFilter>(ALL_MARKS)
  const [undo, setUndo] = useState<UndoStep[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [adding, setAdding] = useState<false | 'upload' | 'files'>(false)
  const [addBusy, setAddBusy] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [putAwayOpen, setPutAwayOpen] = useState(false)
  const [kebab, setKebab] = useState(false)
  const kebabRef = useRef<HTMLSpanElement>(null)
  const [viewing, setViewing] = useState<{ photos: { id: string; src: string; name: string }[]; i: number } | null>(null)
  const [inviting, setInviting] = useState(false)
  const [picture3d, setPicture3d] = useState(false)   // (pending modules S28) Make a 3D picture from the plan on screen
  const photoPoint = useRef<Pt | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  /* arriving with ?add=1 (Getting started, the Overview) opens Add a plan once the page shows */
  const [landAdd] = useState(() => params.get('add') === '1' && mayAct)
  useEffect(() => { if (!landAdd) return; const t = window.setTimeout(() => setAdding('upload'), GHOST_MIN_MS); return () => window.clearTimeout(t) }, [landAdd])
  /* a mark named in the address (the bell) comes into view in the rail */
  useEffect(() => {
    const id = params.get('mark'); if (!id) return
    const t = window.setTimeout(() => document.querySelector(`[data-mark-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), GHOST_MIN_MS + 50)
    return () => window.clearTimeout(t)
  }, [params])

  const nums = useMemo(() => numberMarks(marks), [marks])
  const shown = useMemo(() => filterMarks(marks, filter), [marks, filter])
  const counts = useMemo(() => layerCounts(marks), [marks])
  const points = useMemo(() => pointSchedule(filterMarks(marks, { ...filter, resolved: true })), [marks, filter])
  const diary = useMemo(() => siteDiary(shown, nums, isoDay), [shown, nums])
  const nameOf = (m: MarkView) => markName(m, nums.get(m.id), plan ?? undefined)
  const narrowed = filter.who !== 'both' ? `Counting ${filter.who === 'studio' ? 'the studio’s' : `${client.first}’s`} marks only — show both for the full count` : null

  /* ── marks ── */
  const say = (what: string, e: unknown) => snack({ message: couldnt(what, refusalOf(e)) })
  const draw = async (t: MarkTool, shape: MarkShape) => {
    if (!plan) return
    const tmp = `tmp-${++tmpN}`
    const now = Date.now()
    const m: MarkView = { id: tmp, tool: t, shape, layer, side: 'studio', author: viewer.name, mine: true, status: 'open', resolvedAt: null, resolvedBy: null, photos: [], task: null, variation: null, comments: [], at: now, updatedAt: now }
    setMarks((list) => [...list, m])
    const r = await addFloorPlanMark(plan.id, { tool: t, shape, layer }).catch((e) => ({ error: refusalOf(e) ?? '' }))
    if ('error' in r) { setMarks((list) => list.filter((x) => x.id !== tmp)); say('keep that mark', r.error); return }
    setMarks((list) => list.map((x) => (x.id === tmp ? { ...x, id: r.id } : x)))
    setUndo((u) => [...u, { kind: 'add', id: r.id }])
    if (t === 'pin' || t === 'callout') setSelected(r.id)
    router.refresh()
  }
  const move = async (id: string, shape: MarkShape) => {
    const before = marks.find((x) => x.id === id)?.shape
    if (!before) return
    setMarks((list) => list.map((x) => (x.id === id ? { ...x, shape } : x)))
    const r = await moveFloorPlanMark(id, { shape }).catch((e) => ({ error: refusalOf(e) ?? '' }))
    if ('error' in r) { setMarks((list) => list.map((x) => (x.id === id ? { ...x, shape: before } : x))); say('move that mark', r.error); return }
    setUndo((u) => [...u, { kind: 'move', id, before }])
  }
  const remove = async (m: MarkView, fromUndo = false) => {
    setMarks((list) => list.filter((x) => x.id !== m.id))
    if (selected === m.id) setSelected(null)
    const r = await deleteFloorPlanMark(m.id).catch((e) => ({ error: refusalOf(e) ?? '' }))
    if ('error' in r) { setMarks((list) => [...list, m]); say('delete that mark', r.error); return }
    if (!fromUndo) setUndo((u) => [...u, { kind: 'delete', id: m.id }])
    snack({ message: `${nameOf(m)} deleted`, actionLabel: 'Undo', onAction: () => { void bringBack(m.id) } })
    router.refresh()
  }
  const bringBack = async (id: string) => { await run('put the mark back', () => restoreFloorPlanMark(id), undefined, { refresh: true }) }
  const erase = (id: string) => {
    const m = marks.find((x) => x.id === id)
    if (!m) return
    if (!m.mine) { snack({ message: m.side === 'client' ? `${m.author} drew that one — only they can delete it` : `${m.author} drew that one — only whoever drew a mark deletes it` }); return }
    void remove(m)
  }
  const undoLast = async () => {
    const step = undo[undo.length - 1]
    if (!step) return
    setUndo((u) => u.slice(0, -1))
    if (step.kind === 'add') {
      const m = marks.find((x) => x.id === step.id)
      setMarks((list) => list.filter((x) => x.id !== step.id))
      const r = await deleteFloorPlanMark(step.id).catch((e) => ({ error: refusalOf(e) ?? '' }))
      if ('error' in r) { if (m) setMarks((list) => [...list, m]); say('undo that mark', r.error); return }
      snack({ message: 'Mark undone' })
    } else if (step.kind === 'move') {
      setMarks((list) => list.map((x) => (x.id === step.id ? { ...x, shape: step.before } : x)))
      const r = await moveFloorPlanMark(step.id, { shape: step.before }).catch((e) => ({ error: refusalOf(e) ?? '' }))
      if ('error' in r) { say('put the mark back', r.error); router.refresh(); return }
    } else {
      const r = await restoreFloorPlanMark(step.id).catch((e) => ({ error: refusalOf(e) ?? '' }))
      if ('error' in r) { say('put the mark back', r.error); return }
    }
    router.refresh()
  }
  const status = (m: MarkView) => {
    const next = m.status === 'resolved' ? 'open' : 'resolved'
    setBusy(m.id)
    void run(next === 'resolved' ? 'mark it resolved' : 'reopen it', async () => {
      const r = await setFloorPlanMarkStatus(m.id, next); if ('error' in r) return r
      snack({ message: next === 'resolved' ? `${nameOf(m)} resolved` : `${nameOf(m)} reopened`, actionLabel: 'Undo', onAction: () => { void run('put it back', () => setFloorPlanMarkStatus(m.id, r.before), undefined, { refresh: true }) } })
    }, undefined, { refresh: true }).finally(() => setBusy(null))
  }
  const toLayer = (m: MarkView, k: string) => {
    void run('move it to that layer', async () => {
      const r = await setFloorPlanMarkLayer(m.id, k); if ('error' in r) return r
      const name = LAYERS.find((l) => l.key === k)?.label ?? k
      snack({ message: k === 'studio_only' ? `${nameOf(m)} is on Studio only — ${client.first} no longer sees it` : `${nameOf(m)} moved to ${name}`, actionLabel: 'Undo', onAction: () => { void run('put it back', () => setFloorPlanMarkLayer(m.id, r.before), undefined, { refresh: true }) } })
    }, undefined, { refresh: true })
  }
  const keepPhotos = async (files: File[]): Promise<string[] | { error: string }> => {
    const f = await floorPlanFolder(project.id)
    if ('error' in f) return f
    const ids: string[] = []
    for (const file of files) {
      const up = await uploadPicked(f.leadId, file, f.folderId)
      if (!up) return { error: 'A photo didn’t land' }
      if ('error' in up) return up
      ids.push(up.id)
    }
    return ids
  }
  const comment = async (m: MarkView, body: string, files: File[]): Promise<boolean> => {
    const ids = files.length ? await keepPhotos(files) : []
    if (!Array.isArray(ids)) { say('add the photos', ids.error); return false }
    return run('send the comment', () => commentOnFloorPlanMark(m.id, { body, photos: ids }), undefined, { refresh: true })
  }
  const photoPin = async (files: File[]) => {
    const p = photoPoint.current
    photoPoint.current = null
    if (!plan || !p || !files.length) return
    const ids = await keepPhotos(files.slice(0, 5))
    if (!Array.isArray(ids)) { say('add the photos', ids.error); return }
    await draw('photo', { points: [p], photos: ids, takenOn: isoDay(Date.now()), ...(pen.color ? { color: pen.color } : {}) })
  }
  const toTask = (m: MarkView) => {
    if (m.task) { router.push(withFrom(`/projects/${project.id}/tasks?open=${encodeURIComponent(m.task.id)}`, here())); return }
    setBusy(m.id)
    void run('make a task', async () => {
      const r = await floorPlanMarkToTask(m.id); if ('error' in r) return r
      snack({ message: `Task added — “${r.title}”`, actionLabel: 'Open', onAction: () => router.push(withFrom(`/projects/${project.id}/tasks?open=${encodeURIComponent(r.taskId)}`, here())) })
    }, undefined, { refresh: true }).finally(() => setBusy(null))
  }
  const toVariation = (m: MarkView) => {
    if (m.variation) { router.push(withFrom(`/quotes/${m.variation.id}`, here())); return }
    setBusy(m.id)
    void run('raise a variation order', async () => {
      const r = await floorPlanMarkToVariation(m.id); if ('error' in r) return r
      router.push(withFrom(`/quotes/${r.id}`, here()))
    }).finally(() => setBusy(null))
  }

  /* ── plans ── */
  /* (simplify S-03) a plan's address keeps where the project was opened from (REG-465), as every view's does */
  const openPlan = (id: string) => { setSelected(null); setUndo([]); const from = params.get('from'); router.replace(`${pathname}?plan=${encodeURIComponent(id)}${from ? `&from=${encodeURIComponent(from)}` : ''}`, { scroll: false }) }
  const add = async (o: { file: File | null; fileId: string | null; name: string; main: boolean }) => {
    if (addBusy) return
    setAddBusy(true)
    try {
      let fileId = o.fileId, picture: { data: string; width: number; height: number } | null = null
      if (o.file) {
        picture = await planPictureOf(o.file, o.file.name)
        if (!picture) { snack({ message: couldnt('add the plan', 'The plan didn’t read — try a PNG, a JPG or a PDF') }); return }
        const f = await floorPlanFolder(project.id); if ('error' in f) { say('add the plan', f.error); return }
        const up = await uploadPicked(f.leadId, o.file, f.folderId)
        if (!up || 'error' in up) { say('add the plan', up && 'error' in up ? up.error : null); return }
        fileId = up.id
      } else if (fileId) {
        const res = await fetch(`/files/raw/${encodeURIComponent(fileId)}`).catch(() => null)
        const blob = res && res.ok ? await res.blob() : null
        const name = data.files.find((x) => x.id === fileId)?.name ?? ''
        picture = blob ? await planPictureOf(blob, name) : null
        if (!picture) { snack({ message: couldnt('add the plan', 'That file didn’t read as a plan — try another') }); return }
      }
      if (!fileId || !picture) return
      const r = await addFloorPlan(project.id, { fileId, picture: picture.data, width: picture.width, height: picture.height, name: o.name, main: o.main }).catch((e) => ({ error: refusalOf(e) ?? '' }))
      if ('error' in r) { say('add the plan', r.error); return }
      setAdding(false)
      snack({ message: r.main ? (plans.length ? `Plan added — it’s the main plan ${client.first} opens on` : 'Plan added') : 'Plan added', actionLabel: 'Undo', onAction: () => { void run('take the plan off', () => undoAddFloorPlan(r.undo), 'Plan taken off', { refresh: true }) } })
      openPlan(r.id)
    } finally { setAddBusy(false) }
  }
  /* (parity map, TD-049 · UC-094 — 1.0's "Don't have it? Ask your homeowner to send it") the first run's ask, for a client on the portal: it
     waits on their page as "Send your floor plan" until a plan arrives, and they are told by email; Undo takes it back (invented copy) */
  const ask = () => {
    void run('ask for the floor plan', async () => {
      const r = await askClientForFloorPlan(project.id); if ('error' in r) return r
      snack({ message: `Asked ${client.first} for their floor plan — it’s on their page`, actionLabel: 'Undo', onAction: () => { void run('take the ask back', () => undoFloorPlanAsk(r.undo), 'Ask taken back', { refresh: true }) } })
    }, undefined, { refresh: true })
  }
  const makeMain = (id: string) => {
    const p = plans.find((x) => x.id === id)
    void run('make it the main plan', async () => {
      const r = await setMainFloorPlan(id); if ('error' in r) return r
      snack({ message: `${p?.name ?? 'The plan'} is the main plan — ${client.first} opens on it`, actionLabel: 'Undo', onAction: () => { if (r.mainWas) void run('put it back', () => setMainFloorPlan(r.mainWas!), undefined, { refresh: true }) } })
    }, undefined, { refresh: true })
  }
  const putAway = (id: string) => {
    const p = plans.find((x) => x.id === id)
    void run('put the plan away', async () => {
      const r = await putAwayFloorPlan(id); if ('error' in r) return r
      snack({ message: `${p?.name ?? 'Plan'} put away — its marks are kept`, actionLabel: 'Undo', onAction: () => { void run('put it back', () => restoreFloorPlan(r.undo), undefined, { refresh: true }).then(() => openPlan(id)) } })
      openPlan(r.newMain ?? plans.find((x) => x.id !== id)?.id ?? '')
    })
  }
  const rename = (id: string, name: string) => {
    void run('rename the plan', async () => {
      const r = await renameFloorPlan(id, name); if ('error' in r) return r
      setRenaming(null)
      snack({ message: 'Plan renamed', actionLabel: 'Undo', onAction: () => { void run('put the name back', () => renameFloorPlan(id, r.before), undefined, { refresh: true }) } })
    }, undefined, { refresh: true })
  }
  const scale = async (a: Pt, b: Pt, mm: number): Promise<boolean> => {
    if (!plan) return false
    return run('set the scale', async () => {
      const r = await setFloorPlanScale(plan.id, { a, b, mm }); if ('error' in r) return r
      setTool(after ?? 'select'); setAfter(null)
      snack({ message: 'Scale set — Measure now reads millimetres', actionLabel: 'Undo', onAction: () => { void run('put the scale back', () => undoFloorPlanScale(plan.id, r.before), undefined, { refresh: true }) } })
    }, undefined, { refresh: true })
  }
  const pickTool = (t: CanvasTool) => {
    if (t === 'dimension' && plan && !plan.scale) { setAfter('dimension'); setTool('scale'); return }
    setAfter(null); setTool(t)
  }

  /* ── the banner: the client's confirmation (G-Q11) ── */
  const latest = confirmations[0] ?? null
  const banner = !plan ? null
    : latest && latest.planId === plan.id ? { tone: 'confirmed' as const, icon: 'verified', text: `Layout confirmed by ${latest.name} · ${displayDate(new Date(latest.at))}`, sub: [latest.note ? `“${latest.note}”` : null, latest.changedSince ? `Changed since ${latest.name.split(' ')[0]} confirmed it` : null, CONFIRM_NATURE].filter(Boolean).join(' · '), action: null }
      : latest ? { tone: 'changes' as const, icon: 'info', text: `${latest.name} confirmed a different layout on ${displayDate(new Date(latest.at))}`, sub: plans.find((p) => p.id === latest.planId)?.name ?? 'A plan put away since', action: plans.some((p) => p.id === latest.planId) ? { label: 'Open it', run: () => openPlan(latest.planId) } : null }
        : !client.portal ? { tone: 'changes' as const, icon: 'info', text: `${client.first} isn’t on the portal yet — invite them to mark up the plan with you and confirm the layout`, sub: null, action: mayAct ? { label: `Invite ${client.first}`, run: () => setInviting(true) } : null }
          : plans.length > 1 ? { tone: 'changes' as const, icon: 'pending', text: `Waiting on ${client.first} to confirm which layout to build`, sub: null, action: null }
            : { tone: 'changes' as const, icon: 'pending', text: `Waiting on ${client.first} to confirm the layout on their portal`, sub: null, action: null }

  const actions = { onOpen: setSelected, onStatus: status, onDelete: (m: MarkView) => { void remove(m) }, onComment: comment, onTask: toTask, onVariation: toVariation, onLayer: toLayer,
    onPhoto: (src: string, name: string) => setViewing({ photos: [{ id: src, src, name }], i: 0 }) }
  const canvasMarks = shown.map((m) => ({ id: m.id, tool: m.tool, shape: m.shape, side: m.side, status: m.status, mine: m.mine }))

  return (
    <div className={styles.tab} data-testid="project-floor-plan">
      <div className={styles.bar} data-views={views ? '' : undefined}>   {/* (W3-13) ≤374 the views take the first line, the tools the second */}
        {views ?? <h2 className={styles.title}>{plan ? plan.name : 'Floor plan'}</h2>}
        {first ? null : (
          <div className={styles.actions}>
            {plan?.isMain ? <MetaChip icon="star">Main plan</MetaChip> : null}
            {mayAct ? (phone
              ? <Tooltip label="Add a plan" shortcut="create"><IconButton icon="add" label="Add a plan" variant="primary" onClick={() => setAdding('upload')} data-kb="create" data-testid="plan-add" /></Tooltip>
              : <Button variant="primary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => setAdding('upload')} data-kb="create" data-testid="plan-add">Add a plan</Button>) : null}
            {plan ? <Tooltip label="Download PDF for the contractor"><IconButton icon="download" label="Download PDF for the contractor" onClick={() => router.push(withFrom(`/projects/${project.id}/floor-plan/${plan.id}`, here()))} data-testid="plan-export" /></Tooltip> : null}
            <span ref={kebabRef} className={styles.anchor}>
              <Tooltip label="More options" disabled={kebab}><IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={kebab} onClick={() => setKebab((o) => !o)} data-testid="plan-kebab" /></Tooltip>
              <PortalMenu open={kebab} anchor={kebabRef} onClose={() => setKebab(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={plan?.name ?? 'Floor plan'}>
                {plan && mayAct ? <DropdownItem onSelect={() => { setKebab(false); setRenaming(plan.id) }}>Rename</DropdownItem> : null}
                {plan && mayAct ? <DropdownItem disabled={plan.isMain} title={plan.isMain ? `It’s the one ${client.first} opens on` : undefined} onSelect={() => { setKebab(false); makeMain(plan.id) }}>Make it the main plan</DropdownItem> : null}
                {plan?.original ? <DropdownItem onSelect={() => { setKebab(false); window.open(plan.original!.href, '_blank', 'noopener') }} help={plan.original.name}>Open the original</DropdownItem> : null}
                {/* (pending modules S28 — card studio:floorplan-isometric-ai) the plan on screen, traced in the 3D Space Planner as it is here */}
                {plan && mayAct ? <DropdownItem onSelect={() => { setKebab(false); setPicture3d(true) }} help="Place its rooms on it, then see it in 3D">Make a 3D picture</DropdownItem> : null}
                {mayAct && data.files.length ? <DropdownItem onSelect={() => { setKebab(false); setAdding('files') }}>Use a file from Files</DropdownItem> : null}
                {plan && mayAct ? <DropdownItem disabled={plans.length <= 1} title={plans.length <= 1 ? 'The only plan can’t be put away — add another first' : undefined} onSelect={() => { setKebab(false); putAway(plan.id) }}>Put away</DropdownItem> : null}
                <DropdownItem disabled={!data.putAway.length} title={!data.putAway.length ? 'None put away' : undefined} meta={data.putAway.length ? String(data.putAway.length) : undefined} onSelect={() => { setKebab(false); setPutAwayOpen(true) }}>Plans put away</DropdownItem>
              </PortalMenu>
            </span>
          </div>
        )}
      </div>

      {first ? (
        <EmptyState icon="space_dashboard" title="No floor plan yet" testId="plan-empty"
                    help={`Add the plan and mark it up with ${client.first} — pins, boxes, sockets and lights, each with its own conversation. A PDF’s first page is what you mark up; the original is kept in Files.${client.portal && client.asked ? ` Asked ${client.first} for theirs on ${displayDate(new Date(client.asked.at))}${client.asked.by ? ` (${client.asked.by})` : ''} — it waits on their page until a plan arrives.` : ''}`}
                    primary={mayAct ? { label: 'Add a plan', icon: 'upload_file', onPress: () => setAdding('upload'), testId: 'plan-empty-add' } : null}
                    secondary={mayAct && data.files.length ? { label: 'Use a file from Files', icon: 'folder_open', onPress: () => setAdding('files'), testId: 'plan-empty-files' } : null}
                    /* (parity map, TD-049) not on the portal → invite them; on it → ask them for their plan (again, once asked) */
                    link={!mayAct ? null : !client.portal ? { label: `Invite ${client.first} to the portal`, onPress: () => setInviting(true) }
                      : { label: client.asked ? 'Ask again' : `Ask ${client.first} for their floor plan`, onPress: ask, testId: 'plan-empty-ask' }} />
      ) : (
        <>
          {plans.length > (views ? 0 : 1) ? (
            <ChipRail label="Plans"><Chips label="Plans" options={plans.map((p) => ({ value: p.id, label: p.isMain ? `${p.name} · Main` : p.name }))} value={plan?.id ?? null} onChange={openPlan} testId="plan-chips" /></ChipRail>
          ) : null}
          {banner ? (
            <div className={styles.banner} data-tone={banner.tone} role="status" data-testid="plan-banner">
              <span className={styles.bannerIcon}><Icon name={banner.icon} size={20} /></span>
              <span className={styles.bannerText}><span>{banner.text}</span>{banner.sub ? <span className={styles.bannerSub}>{banner.sub}</span> : null}</span>
              {banner.action ? <span className={styles.bannerActions}><Button variant="secondary" appearance="text" size="sm" onPress={banner.action.run}>{banner.action.label}</Button></span> : null}
            </div>
          ) : null}
          {plan ? (
            <div className={styles.layout}>
              <div className={styles.canvasCol} data-kb-own="">
                {mayAct ? (
                  <PlanToolbar side="studio" tool={tool} onTool={pickTool} symbol={symbol} onSymbol={setSymbol} pattern={pattern} onPattern={setPattern} style={pen} onStyle={setPen}
                               layer={layer} onLayer={setLayer} counts={counts} canUndo={undo.length > 0} onUndo={() => void undoLast()}
                               onScale={() => { setAfter(null); setTool(tool === 'scale' ? 'select' : 'scale') }} scaled={!!plan.scale} />
                ) : null}
                <PlanCanvas key={plan.id} plan={plan} marks={canvasMarks} nums={nums} side="studio" tool={mayAct ? tool : 'select'} symbol={symbol} pattern={pattern} style={pen} selected={selected} readOnly={!mayAct}
                            onSelect={setSelected} onDraw={(t, s) => void draw(t, s)} onMove={(id, s) => void move(id, s)} onErase={erase} onUndo={mayAct ? () => void undoLast() : undefined}
                            onPhoto={(p) => { photoPoint.current = p; photoInput.current?.click() }} onScale={scale} onScaleCancel={() => { setTool(after === 'dimension' ? 'select' : 'select'); setAfter(null) }} />
                <p className={styles.caption} data-testid="plan-caption">
                  <span className={styles.captionDot} style={{ ['--swatch' as string]: pen.color ?? '#5500FF' }} aria-hidden />
                  {mayAct ? toolLine(tool, touch, !!plan.scale) : project.completed ? 'The project is completed — the floor plan stays as it was.' : 'Only the project’s team, their Managers, Owners and Admins mark up the plan.'}
                  {plan.scale ? null : mayAct && tool !== 'scale' ? ' No scale yet — Measure asks for it.' : null}
                </p>
                <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; void photoPin(f) }} />
              </div>
              <aside className={styles.rail} aria-label="Marks">
                <div className={styles.filter} data-testid="plan-filter">
                  <Chips label="Whose marks" options={[{ value: 'both', label: 'Both' }, { value: 'studio', label: 'Studio' }, { value: 'client', label: client.first }]} value={filter.who} onChange={(v) => setFilter({ ...filter, who: v as Who })} testId="plan-who" />
                  <label className={styles.switchRow}>
                    <Switch size="sm" isSelected={filter.resolved} onChange={(v: boolean) => setFilter({ ...filter, resolved: v })} aria-label="Show resolved marks" />
                    <span className={styles.switchText}><span>Show resolved marks</span></span>
                  </label>
                  {counts.size > 1 ? (
                    <ChipRail label="Layers"><Chips multiple label="Layers shown" options={LAYERS.filter((l) => counts.has(l.key)).map((l) => ({ value: l.key, label: `${l.label} ${counts.get(l.key)}` }))}
                                                     value={LAYERS.filter((l) => counts.has(l.key) && !filter.hidden.includes(l.key)).map((l) => l.key)}
                                                     onChange={(v) => setFilter({ ...filter, hidden: LAYERS.filter((l) => !v.includes(l.key)).map((l) => l.key) })} testId="plan-layers" /></ChipRail>
                  ) : null}
                  <span className={styles.markLine}>{shown.length === marks.length ? `${marks.length} ${marks.length === 1 ? 'mark' : 'marks'}` : `${shown.length} of ${marks.length} marks`}</span>
                </div>
                <PointsCard groups={points.groups} total={points.total} narrowed={narrowed} />
                <DiaryCard days={diary} onOpen={(id) => setSelected(id)} />
                <div className={styles.list} data-kb-list="marks" data-testid="plan-marks">
                  {marks.length === 0 ? (
                    <p className={styles.listEmpty}>{mayAct ? `No marks yet. Pick a tool and draw on the plan, or drop a pin to start a conversation with ${client.first}.` : 'No marks yet.'}</p>
                  ) : shown.length === 0 ? (
                    <div className={styles.listEmpty}><span>Nothing matches the filter.</span><Button variant="secondary" appearance="text" size="sm" onPress={() => setFilter(ALL_MARKS)}>Show all marks</Button></div>
                  ) : [...shown].sort((a, b) => b.at - a.at).map((m) => (
                    <MarkCard key={m.id} m={m} name={nameOf(m)} open={selected === m.id} studio mayAct={mayAct && !m.id.startsWith('tmp-')} money={viewer.money} busy={busy === m.id} actions={actions} />
                  ))}
                </div>
              </aside>
            </div>
          ) : null}
        </>
      )}

      <AddPlanDialog open={!!adding} onClose={() => setAdding(false)} files={data.files} hasPlans={plans.length > 0} client={client.first} busy={addBusy} startFromFiles={adding === 'files'} onAdd={(o) => void add(o)} />
      <RenameDialog open={!!renaming} name={plans.find((p) => p.id === renaming)?.name ?? ''} onClose={() => setRenaming(null)} onSave={(n) => { if (renaming) rename(renaming, n) }} />
      <Dialog open={putAwayOpen} onClose={() => setPutAwayOpen(false)} title="Plans put away" size="form" width={600}
              subtitle={`Put away plans are hidden from you and ${client.first}; their marks and conversations are kept.`}
              footer={<Button variant="secondary" appearance="outlined" onPress={() => setPutAwayOpen(false)}>Close</Button>}>
        <div className={styles.fileList}>
          {data.putAway.length ? data.putAway.map((p) => (
            <div key={p.id} className={styles.fileRow} data-static="">
              <span className={styles.fileName}>{p.name}<span className={styles.markLine}>{` · put away ${displayDate(new Date(p.at))}`}</span></span>
              {mayAct ? <Button variant="secondary" appearance="text" size="sm" onPress={() => { setPutAwayOpen(false); void run('put the plan back', () => restoreFloorPlan({ planId: p.id, mainWas: null }), `${p.name} is back`, { refresh: true }).then((ok) => { if (ok) openPlan(p.id) }) }}>Put back</Button> : null}
            </div>
          )) : <p className={styles.listEmpty}>No plans put away.</p>}
        </div>
      </Dialog>
      <PhotoViewer open={!!viewing} title={viewing?.photos[viewing.i]?.name ?? ''} photos={viewing?.photos ?? []} index={viewing?.i ?? 0} onIndex={(i) => setViewing((v) => (v ? { ...v, i } : v))} onClose={() => setViewing(null)} />
      <ClientAccessPanel open={inviting} leadId={project.leadId} project onClose={() => setInviting(false)} />
      {plan ? <PhotoDialog open={picture3d} onClose={() => setPicture3d(false)} target={{ kind: 'project', id: project.id }} from={{ kind: 'plan', planId: plan.id }} /> : null}
    </div>
  )
}

function RenameDialog({ open, name, onClose, onSave }: { open: boolean; name: string; onClose: () => void; onSave: (name: string) => void }) {
  const [value, setValue] = useState(name)
  const [tried, setTried] = useState(false)
  const [was, setWas] = useState(open)
  if (was !== open) { setWas(open); if (open) { setValue(name); setTried(false) } }
  const save = () => { setTried(true); if (value.trim()) onSave(value.trim()) }
  return (
    <Dialog open={open} onClose={onClose} title="Rename the plan" size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button variant="primary" onPress={save} data-testid="plan-rename-save">Save</Button></>}>
      <TextField label="Plan name" value={value} onChange={setValue} autoFocus required maxLength={NAME_MAX} error={tried && !value.trim() ? 'A name is required' : undefined}
                 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }} />
    </Dialog>
  )
}
