'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { Chips } from '@/components/om/chips'
import { ChipRail } from '@/components/om/chip-rail'
import { Dialog } from '@/components/om/dialog'
import { EmptyState } from '@/components/om/empty-state'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { useMediaQuery } from '@/lib/breakpoint'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { PageReveal } from '@/components/shell/page-reveal'
import { clientDay } from '@/lib/portal/model'
import type { PortalData } from '@/lib/portal/home'
import type { PortalFloorPlanData, PortalFloorPlanHome } from '@/lib/projects/floor-plan'
import { ALL_MARKS, NOTE_MAX, filterMarks, isoDay, markName, numberMarks, type MarkFilter, type MarkShape, type MarkTool, type MarkView, type Pt } from '@/lib/projects/floor-plan-model'
import {
  clientAddFloorPlan, clientAddFloorPlanMark, clientCommentOnFloorPlanMark, clientDeleteFloorPlanMark, clientMoveFloorPlanMark, clientRestoreFloorPlanMark, clientSetFloorPlanMarkStatus, confirmFloorPlanLayout,
} from '@/app/portal/floor-plan-actions'
import { PlanCanvas, type CanvasTool } from '@/components/projects/floor-plan/plan-canvas'
import { PlanToolbar, toolLine } from '@/components/projects/floor-plan/plan-toolbar'
import { MarkCard } from '@/components/projects/floor-plan/mark-card'
import { dataUrlOf, photoOf, planPictureOf, PLAN_ACCEPT, isPlanFile } from '@/components/projects/floor-plan/plan-picture'
import { PortalFrame } from '../portal-frame'
import { PhotoViewer } from '../project/photo-viewer'
import { PortalFloorPlanGhost } from './floor-plan-ghost'
import p from '../portal.module.css'
import styles from '@/components/projects/floor-plan/floor-plan.module.css'

type UndoStep = { kind: 'add'; id: string } | { kind: 'move'; id: string; before: MarkShape } | { kind: 'delete'; id: string }
let tmpN = 0

/**
 * (gaps build G — G-Q1 · G-Q6 · G-Q8 · G-Q11) The portal's Floor plan: the plan the studio shared (the main one first), marked up together. The
 * client's short set of tools (a pin with their question, a pen, a box, an arrow, a label, a photo), always on Client requests and in their
 * colour; the studio's marks beside them — never what the studio keeps on Studio only (stripped on the server). Each mark opens its conversation;
 * either side resolves it. **Happy with this layout?** → *Confirm this layout* (a dated record, not a signature). No plan yet: the client can
 * send theirs. In a studio's preview it reads, never writes.
 */
export function PortalFloorPlanView({ data, plan: fp }: { data: PortalData; plan: PortalFloorPlanData }) {
  const { visitor } = data
  const any = fp.homes.some((h) => h.plans.length)
  return (
    <PageReveal skeleton={<PortalFloorPlanGhost />}>
      <PortalFrame look={data.look} slug={data.slug} tab="floor-plan" visitor={visitor} paused={data.paused} needs={data.needs}>
        <div className={p.hello}>
          <h1 className={p.h1}>Floor plan</h1>
          {any ? <p className={p.lede}>{`Mark up the plan with ${data.look.studio} — drop a pin where you have a question, or draw what you’d like.`}</p> : null}
        </div>
        {fp.homes.length === 0 ? (
          <EmptyState icon="space_dashboard" tone="plain" title="No floor plan yet" help={`Once your project starts, ${data.look.studio} shares the plan of your home here.`} testId="portal-plan-empty" />
        ) : fp.homes.map((h) => <Home key={h.homeId} h={h} data={data} many={fp.homes.length > 1} preview={visitor.preview} />)}
      </PortalFrame>
    </PageReveal>
  )
}

function Home({ h, data, many, preview }: { h: PortalFloorPlanHome; data: PortalData; many: boolean; preview: boolean }) {
  const router = useRouter()
  const snack = useSnackbar()
  const touch = useMediaQuery('(hover: none)')
  const slug = data.slug
  const plan = h.plans.find((x) => x.id === h.planId) ?? null
  const [marks, setMarks] = useState<MarkView[]>(h.marks)
  const [seen, setSeen] = useState(h.marks)
  if (seen !== h.marks) { setSeen(h.marks); setMarks(h.marks) }
  const [selected, setSelected] = useState<string | null>(null)
  const [tool, setTool] = useState<CanvasTool>('select')
  const [pen, setPen] = useState<{ color: string | null; weight: 1 | 2 | 3; dashed: boolean }>({ color: null, weight: 2, dashed: false })
  const [filter, setFilter] = useState<MarkFilter>(ALL_MARKS)
  const [undo, setUndo] = useState<UndoStep[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [viewing, setViewing] = useState<{ src: string; name: string } | null>(null)
  const photoPoint = useRef<Pt | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const planInput = useRef<HTMLInputElement>(null)
  const mayAct = !preview
  const nums = useMemo(() => numberMarks(marks), [marks])
  const shown = useMemo(() => filterMarks(marks, filter), [marks, filter])
  const say = (what: string, e: unknown) => snack({ message: couldnt(what, refusalOf(e)) })
  const studio = data.look.studio
  const confirmed = plan ? h.confirmed[plan.id] ?? null : null
  const other = !confirmed ? Object.values(h.confirmed).sort((a, b) => b.at - a.at)[0] ?? null : null

  const openPlan = (id: string) => { setSelected(null); setUndo([]); router.replace(`?plan=${encodeURIComponent(id)}`, { scroll: false }) }
  const draw = async (t: MarkTool, shape: MarkShape, photos?: string[]) => {
    if (!plan) return
    const tmp = `tmp-${++tmpN}`, now = Date.now()
    setMarks((list) => [...list, { id: tmp, tool: t, shape, layer: 'client', side: 'client', author: data.visitor.name, mine: true, status: 'open', resolvedAt: null, resolvedBy: null, photos: [], task: null, variation: null, comments: [], at: now, updatedAt: now }])
    const r = await clientAddFloorPlanMark(slug, plan.id, { tool: t, shape, photos }).catch((e) => ({ error: refusalOf(e) ?? '' }))
    if ('error' in r) { setMarks((list) => list.filter((x) => x.id !== tmp)); say('keep that mark', r.error); return }
    setMarks((list) => list.map((x) => (x.id === tmp ? { ...x, id: r.id } : x)))
    setUndo((u) => [...u, { kind: 'add', id: r.id }])
    if (t === 'pin') setSelected(r.id)
    snack({ message: `${studio} will see it` })
    router.refresh()
  }
  const move = async (id: string, shape: MarkShape) => {
    const before = marks.find((x) => x.id === id)?.shape; if (!before) return
    setMarks((list) => list.map((x) => (x.id === id ? { ...x, shape } : x)))
    const r = await clientMoveFloorPlanMark(slug, id, { shape }).catch((e) => ({ error: refusalOf(e) ?? '' }))
    if ('error' in r) { setMarks((list) => list.map((x) => (x.id === id ? { ...x, shape: before } : x))); say('move that mark', r.error); return }
    setUndo((u) => [...u, { kind: 'move', id, before }])
  }
  const remove = async (m: MarkView) => {
    setMarks((list) => list.filter((x) => x.id !== m.id)); if (selected === m.id) setSelected(null)
    const r = await clientDeleteFloorPlanMark(slug, m.id).catch((e) => ({ error: refusalOf(e) ?? '' }))
    if ('error' in r) { setMarks((list) => [...list, m]); say('delete that mark', r.error); return }
    setUndo((u) => [...u, { kind: 'delete', id: m.id }])
    snack({ message: 'Mark deleted', actionLabel: 'Undo', onAction: () => { void clientRestoreFloorPlanMark(slug, m.id).then((x) => { if ('error' in x) say('put the mark back', x.error); router.refresh() }) } })
    router.refresh()
  }
  const erase = (id: string) => {
    const m = marks.find((x) => x.id === id); if (!m) return
    if (!m.mine) { snack({ message: m.side === 'studio' ? `${studio} drew that one — only they can delete it` : `${m.author} drew that one — only they can delete it` }); return }
    void remove(m)
  }
  const undoLast = async () => {
    const step = undo[undo.length - 1]; if (!step) return
    setUndo((u) => u.slice(0, -1))
    const r = step.kind === 'add' ? await clientDeleteFloorPlanMark(slug, step.id) : step.kind === 'move' ? await clientMoveFloorPlanMark(slug, step.id, { shape: step.before }) : await clientRestoreFloorPlanMark(slug, step.id)
    if ('error' in r) say('undo that', r.error)
    router.refresh()
  }
  const status = (m: MarkView) => {
    setBusy(m.id)
    const next = m.status === 'resolved' ? 'open' : 'resolved'
    void clientSetFloorPlanMarkStatus(slug, m.id, next).then((r) => {
      if ('error' in r) { say(next === 'resolved' ? 'mark it resolved' : 'reopen it', r.error); return }
      snack({ message: next === 'resolved' ? 'Marked resolved' : 'Reopened', actionLabel: 'Undo', onAction: () => { void clientSetFloorPlanMarkStatus(slug, m.id, r.before).then(() => router.refresh()) } })
      router.refresh()
    }).finally(() => setBusy(null))
  }
  const photos = async (files: File[]) => (await Promise.all(files.slice(0, 5).map((f) => photoOf(f)))).filter((x): x is string => !!x)
  const comment = async (m: MarkView, body: string, files: File[]): Promise<boolean> => {
    const pics = files.length ? await photos(files) : []
    if (files.length && pics.length !== Math.min(files.length, 5)) { say('add the photos', 'A photo didn’t read — try another'); return false }
    const r = await clientCommentOnFloorPlanMark(slug, m.id, { body, photos: pics }).catch((e) => ({ error: refusalOf(e) ?? '' }))
    if ('error' in r) { say('send the comment', r.error); return false }
    snack({ message: `Sent — ${studio} will see it` })
    router.refresh()
    return true
  }
  const photoPin = async (files: File[]) => {
    const at = photoPoint.current; photoPoint.current = null
    if (!at || !files.length) return
    const pics = await photos(files)
    if (!pics.length) { say('add the photos', 'A photo didn’t read — try another'); return }
    await draw('photo', { points: [at], takenOn: isoDay(Date.now()), photos: ['pending'] }, pics)
  }
  const confirm = async () => {
    if (!plan || sending) return
    if (note.length > NOTE_MAX) return
    setSending(true)
    const r = await confirmFloorPlanLayout(slug, plan.id, { note }).catch((e) => ({ error: refusalOf(e) ?? '' }))
    setSending(false)
    if ('error' in r) { say('confirm the layout', r.error); return }
    setConfirming(false); setNote('')
    snack({ message: `Layout confirmed — ${studio} can build to it` })
    router.refresh()
  }
  const sendPlan = async (file: File) => {
    if (!isPlanFile(file)) { snack({ message: couldnt('send the plan', 'A plan is a picture or a PDF') }); return }
    if (file.size > 6_000_000) { snack({ message: couldnt('send the plan', 'It’s over 6 MB — a smaller file fits') }); return }
    setSending(true)
    const [pic, raw] = await Promise.all([planPictureOf(file, file.name), dataUrlOf(file)])
    if (!pic || !raw) { setSending(false); say('send the plan', 'The plan didn’t read — try a PNG, a JPG or a PDF'); return }
    const r = await clientAddFloorPlan(slug, { homeId: h.homeId, name: file.name, data: raw, picture: pic.data, width: pic.width, height: pic.height }).catch((e) => ({ error: refusalOf(e) ?? '' }))
    setSending(false)
    if ('error' in r) { say('send the plan', r.error); return }
    snack({ message: `Plan sent — ${studio} will see it` })
    router.replace(`?plan=${encodeURIComponent(r.id)}`, { scroll: false })
    router.refresh()
  }
  const actions = { onOpen: setSelected, onStatus: status, onDelete: (m: MarkView) => { void remove(m) }, onComment: comment, onPhoto: (src: string, name: string) => setViewing({ src, name }) }
  const canvasMarks = shown.map((m) => ({ id: m.id, tool: m.tool, shape: m.shape, side: m.side, status: m.status, mine: m.mine }))

  if (!plan) {
    return (
      <div className={p.section}>
        {many ? <h2 className={p.h2}>{h.title}</h2> : null}
        <EmptyState icon="space_dashboard" tone="plain" title="No floor plan yet" testId="portal-plan-empty"
                    help={`When ${studio} shares the plan of your home, it shows here and you can mark it up together. Have a copy of the plan? Send it.`}
                    primary={mayAct ? { label: sending ? 'Sending…' : 'Send the plan', icon: 'upload_file', onPress: () => planInput.current?.click(), block: sending ? 'Sending' : null, testId: 'portal-plan-send' } : null} />
        <input ref={planInput} type="file" accept={PLAN_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void sendPlan(f) }} />
      </div>
    )
  }
  return (
    <div className={p.section} data-testid="portal-floor-plan">
      {many ? <h2 className={p.h2}>{h.title}</h2> : null}
      {h.plans.length > 1 ? <ChipRail label="Plans"><Chips label="Plans" options={h.plans.map((x) => ({ value: x.id, label: x.isMain ? `${x.name} · Main` : x.name }))} value={plan.id} onChange={openPlan} testId="portal-plan-chips" /></ChipRail> : null}
      <div className={styles.banner} data-tone={confirmed && !confirmed.changedSince ? 'confirmed' : 'changes'} role="status" data-testid="portal-plan-confirm">
        <span className={styles.bannerIcon}><Icon name={confirmed ? 'verified' : 'help'} size={20} /></span>
        <span className={styles.bannerText}>
          <span>{confirmed ? `You confirmed this layout on ${clientDay(confirmed.at, data.now)}` : 'Happy with this layout?'}</span>
          <span className={styles.bannerSub}>{confirmed ? (confirmed.changedSince ? 'It has changed since — look it over and confirm it again.' : `${studio} builds to it. Not happy after all? Drop a pin and say so.`)
            : other ? `You confirmed another plan on ${clientDay(other.at, data.now)}. Confirm this one if this is the layout to build.` : `Once you are, confirm it — ${studio} builds to it.`}</span>
        </span>
        {mayAct && (!confirmed || confirmed.changedSince) ? <span className={styles.bannerActions}><Button variant="primary" size="sm" onPress={() => setConfirming(true)} data-testid="portal-plan-confirm-open">Confirm this layout</Button></span> : null}
      </div>
      <div className={styles.layout}>
        <div className={styles.canvasCol} data-kb-own="">
          {mayAct ? <PlanToolbar side="client" tool={tool} onTool={setTool} symbol={null} onSymbol={() => {}} pattern="diagonal" onPattern={() => {}} style={pen} onStyle={setPen} canUndo={undo.length > 0} onUndo={() => void undoLast()} /> : null}
          <PlanCanvas key={plan.id} plan={plan} marks={canvasMarks} nums={nums} side="client" tool={mayAct ? tool : 'select'} symbol={null} pattern="diagonal" style={pen} selected={selected} readOnly={!mayAct}
                      onSelect={setSelected} onDraw={(t, s) => void draw(t, s)} onMove={(id, s) => void move(id, s)} onErase={erase} onUndo={mayAct ? () => void undoLast() : undefined}
                      onPhoto={(pt) => { photoPoint.current = pt; photoInput.current?.click() }} testId="portal-plan-canvas" />
          <p className={styles.caption}>{mayAct ? toolLine(tool, touch, !!plan.scale) : 'This is a preview — you can look, not draw.'}</p>
          {plan.original ? <a className={p.link} href={plan.original.href} target="_blank" rel="noopener noreferrer">Open the original plan</a> : null}
          <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ''; void photoPin(f) }} />
        </div>
        <aside className={styles.rail} aria-label="Marks">
          <div className={styles.filter}>
            <Chips label="Whose marks" options={[{ value: 'both', label: 'Both' }, { value: 'client', label: 'Mine' }, { value: 'studio', label: studio }]} value={filter.who} onChange={(v) => setFilter({ ...filter, who: v as MarkFilter['who'] })} testId="portal-plan-who" />
            <label className={styles.switchRow}>
              <Switch size="sm" isSelected={filter.resolved} onChange={(v: boolean) => setFilter({ ...filter, resolved: v })} aria-label="Show fixed marks" />
              <span className={styles.switchText}><span>Show fixed marks</span></span>   {/* (the calm UI build 2026-10-27, W-372) the studio's word too */}
            </label>
          </div>
          <div className={styles.list} data-testid="portal-plan-marks">
            {marks.length === 0 ? <p className={styles.listEmpty}>{mayAct ? 'No marks yet. Pick Pin and tap the plan where you have a question.' : 'No marks yet.'}</p>
              : shown.length === 0 ? <div className={styles.listEmpty}><span>Nothing matches the filter.</span><Button variant="secondary" appearance="text" size="sm" onPress={() => setFilter(ALL_MARKS)}>Show all marks</Button></div>
                : [...shown].sort((a, b) => b.at - a.at).map((m) => (
                  <MarkCard key={m.id} m={m} name={markName(m, nums.get(m.id), plan)} open={selected === m.id} studio={false} mayAct={mayAct && !m.id.startsWith('tmp-')} busy={busy === m.id} actions={actions} />
                ))}
          </div>
        </aside>
      </div>
      <Dialog open={confirming} onClose={() => setConfirming(false)} title="Confirm this layout" size="form" width={400}
              subtitle={`${studio} sees that you’re happy to build “${plan.name}”, with your name and the day. It’s a record of your answer, not a signature.`}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setConfirming(false)}>Cancel</Button><Button variant="primary" onPress={() => void confirm()} isDisabled={sending} data-testid="portal-plan-confirm-save">Confirm</Button></>}>
        <TextField label="A note for your designer (optional)" value={note} onChange={setNote} multiline={3} maxLength={NOTE_MAX} />
      </Dialog>
      <PhotoViewer open={!!viewing} title={viewing?.name ?? ''} photos={viewing ? [{ id: viewing.src, src: viewing.src, name: viewing.name }] : []} index={0} onIndex={() => {}} onClose={() => setViewing(null)} />
    </div>
  )
}
