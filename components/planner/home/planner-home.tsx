'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LibraryGallery, Refused, type LibraryItem } from '@/components/company/templates/library-gallery'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { PickOneDialog, type PickOption } from '@/components/company/templates/pick-one-dialog'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { useRun } from '@/components/leads/tasks/use-run'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { withFrom } from '@/lib/nav'
import { ago } from '@/lib/templates/ago'
import { STUDIO_OWN } from '@/components/visualizer/home/kind-label'   // (the calm UI build, W-027) the one word for no client, the Visualizer's and the planner's
import { areaText } from '@/lib/planner/model'
import { EXAMPLES, examplePlan } from '@/lib/planner/examples'
import { ISO_NOTE, ISO_PHOTO_LINK, ISO_USUAL_LINK } from '@/lib/planner/copy'
import type { LayoutCard, PlannerHome as HomeData } from '@/lib/planner/queries'
import { createLayout, deleteLayouts, deleteLayoutsForever, duplicateLayout, emptyLayoutTrash, renameLayout, restoreLayouts } from '@/app/planner/actions'
import { PlanDrawing } from '../plan-drawing'
import { NewLayoutDialog, type NewLayoutPick } from '../new-layout-dialog'
import { PhotoDialog } from '../photo/photo-dialog'   // (pending modules S28)
import type { PhotoTarget } from '@/app/planner/photo-actions'
import { PlannerHomeGhost } from '../planner-ghosts'
import styles from './planner-home.module.css'

type Item = LibraryItem & { l: LayoutCard }
const KIND = { key: 'planner', icon: 'space_dashboard', label: 'Layouts', title: '3D Space Planner', help: '', href: '/planner', live: true }
const NAME_MAX = 80
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
/** (the calm UI build, 6-21) a card's area without a trailing ".0" — "101 m²", "64.5 m²" */
const cardArea = (sqcm: number) => areaText(sqcm).replace(/\.0 m²$/, ' m²')
/** A project's layout sits with its project: it is never filed or renamed away from it (the AI Visualizer's lead designs' rule). */
const PROJECT_FIXED = 'A project’s layout stays with its project'
/** (pending modules S07) a lead's stays with its lead, and goes to the project once the lead is won. *(invented copy)* */
const LEAD_FIXED = 'A lead’s layout stays with its lead — it goes to the project once the lead is won'

/**
 * (gaps build J, J-Q2) Tools › 3D Space Planner — every layout the member may see (a project's, by Who sees leads; a personal one) on the
 * house library gallery, as the AI Visualizer's landing: covers drawn from each layout's top view, the Kind pill (Projects · Personal),
 * search, the list view, rename · duplicate · delete with Undo and Deleted Layouts. New ▾ From a flat template… · For a project… · Blank.
 * Opened from a project it still shows the studio's every layout (1.0's F-267 hid them).
 * (parity map 2026-10-10) New ▾ › From an example… (TD-073, 1.0's "Made with Space Planner" — the empty first run shows them too); the
 * studio's templates are cards of their own Kind and sit under New layout's My templates (TD-076); `?view=iso` — opens every layout in the isometric
 * view (TD-098; Tools › Floorplan to 3D Isometric landed here until it had its own page again, REG-2800).
 * (the calm UI build 2026-10-27 — 6-30 · 6-21 · 6-32 · 6-06 · W-195 · W-027) New ▾ is three ways in and the photo: From a ready-made flat… (the
 * flats, the furnished examples and My templates — one picker, its tabs), Trace a floor-plan photo… (named apart from Tools › Floorplan to 3D
 * Isometric, which makes a picture; this starts a layout over the photo), For a project…, Blank. A card leads with the client's name
 * ("Benjamin Han · edited 17 Oct"), its line "5 rooms · 101 m²" — the project's number is the list's own column now; "Studio’s own" for
 * Personal (the stored kind and the pill's key stay `personal`).
 */
export function PlannerHome({ data }: { data: HomeData }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const params = useSearchParams()
  const pathname = usePathname()
  const here = (() => { const p = new URLSearchParams(params.toString()); p.delete('deleted'); p.delete('new'); p.delete('project'); p.delete('photo'); return p.toString() ? `/planner?${p}` : '/planner' })()
  const [newFor, setNewFor] = useState<{ projectId: string | null; mode?: 'flats' | 'examples' } | null>(null)
  /* the dialog keeps the door it was opened by while it closes (render-phase adjust) */
  const [dialogMode, setDialogMode] = useState<'flats' | 'examples'>('flats')
  if (newFor && (newFor.mode ?? 'flats') !== dialogMode) setDialogMode(newFor.mode ?? 'flats')
  /* (parity map, TD-098) ?view=iso (⌘K's Make a 3D picture): every layout it opens, it opens in the isometric view */
  const iso = params.get('view') === 'iso'
  const editorHref = (id: string) => withFrom(`/planner/${id}${iso ? '?view=iso' : ''}`, here)
  const [busy, setBusy] = useState(false)
  const [projectPick, setProjectPick] = useState(false)
  /* (pending modules S28 — card studio:floorplan-isometric-ai) Make a 3D picture: from New ▾, the New layout dialog's photo card, Maison AI,
     and ⌘K's Make a 3D picture (?photo=1 opens it on arrival) */
  const [photo, setPhoto] = useState<{ target: PhotoTarget | null } | null>(null)
  /* (pending modules S10 — card held:maison-ai, "the … Planner homes' words-only suggestions · make each act") The newest project's layout
     opens New layout for it (the house dialog, filled); "Which layouts has the client opened?" is asked and answered from the share links;
     the HDB 4-Room example — three bedrooms furnished by rule — is shown first with one button (New ▾ › From an example's own step). *(invented copy)* */
  const newestProject = [...data.projects].sort((a, b) => b.number.localeCompare(a.number, undefined, { numeric: true }))[0] ?? null
  const maison: MaisonSuggestion[] = [
    newestProject
      ? { label: 'Start a layout for my newest project', run: () => setNewFor({ projectId: newestProject.id }) }
      : { label: 'Start a layout for my newest project', answer: { title: 'No project to plan yet', text: 'A project’s layout starts here once a lead is won — or start one of the studio’s own from New ▾.' } },
    'Which layouts has the client opened?',
    { label: 'Trace a floor-plan photo', run: () => setPhoto({ target: null }) },   /* (pending modules S28; the calm UI build, 6-06 — named apart from Floorplan to 3D Isometric) */
    { label: 'Furnish an HDB 4-room for a family of four', propose: { title: 'Start from the HDB 4-Room example', text: 'Three bedrooms and two bathrooms, furnished by the planner’s rule and finished in Japandi — it opens as your own layout, to change as you like.',
      lines: ['Master bedroom, two bedrooms, living and dining, kitchen', 'Nothing is charged'], confirm: 'Start from it', run: async () => { fromExample('ex-hdb-4-japandi'); return true } } },
  ]
  useMaisonAi(maison)

  /* deleted from its editor: said here once, with the gallery's Undo, and the address loses the mark */
  const deletedId = params.get('deleted')
  useEffect(() => {
    if (!deletedId) return
    const d = data.deleted.find((x) => x.id === deletedId)
    const rest = new URLSearchParams(params.toString()); rest.delete('deleted')
    router.replace(`${pathname}${rest.toString() ? `?${rest}` : ''}`, { scroll: false })
    if (d) snackbar({ message: `${d.name} deleted`, actionLabel: 'Undo', onAction: () => { void run('restore the layout', () => restoreLayouts([d.id])).then((ok) => { if (ok) router.refresh() }) } })
  }, [deletedId])   // eslint-disable-line react-hooks/exhaustive-deps -- once per arrival
  /* (pending modules S28) ⌘K's Make a 3D picture: ?photo=1 opens Make a 3D picture once (the address loses it) */
  const startPhoto = params.get('photo') === '1'
  useEffect(() => {
    if (!startPhoto) return
    router.replace(here, { scroll: false })
    queueMicrotask(() => setPhoto({ target: null }))
  }, [startPhoto])   // eslint-disable-line react-hooks/exhaustive-deps -- once per arrival
  /* (Search › Create, or a project's dialog) ?new=1 opens New layout; &project= names its project */
  const startNew = params.get('new') === '1', projectParam = params.get('project')
  useEffect(() => {
    if (!startNew) return
    router.replace(here, { scroll: false })
    queueMicrotask(() => setNewFor({ projectId: projectParam && data.projects.some((p) => p.id === projectParam) ? projectParam : null }))
  }, [startNew])   // eslint-disable-line react-hooks/exhaustive-deps -- once per arrival

  const open = (id: string) => router.push(editorHref(id))
  const toItem = (l: LayoutCard): Item => ({ id: l.id, title: l.name, createdAt: l.createdAt, updatedAt: l.updatedAt, author: l.author, authorColor: l.authorColor, usedBy: l.pieces, deletedAt: l.deletedAt, folderId: null, l })
  const items = data.layouts.map(toItem), deleted = data.deleted.map((l) => ({ ...toItem(l), author: l.maker, authorColor: l.makerColor }))
  const project = newFor?.projectId ? data.projects.find((p) => p.id === newFor.projectId) ?? null : null
  const start = async (p: NewLayoutPick): Promise<string | null> => {
    const r = await createLayout({ ...p, projectId: newFor?.projectId ?? null })
    if ('error' in r) return r.error
    setNewFor(null)
    router.push(editorHref(r.id))
    return null
  }
  /* (TD-073) an example from the first run's tiles: one press, the studio's own copy */
  const fromExample = (key: string) => {
    if (busy) return
    setBusy(true)
    void run('start from the example', async () => { const r = await createLayout({ exampleKey: key }); if ('error' in r) return r; router.push(editorHref(r.id)) }).finally(() => setBusy(false))
  }
  /* (TD-076) a template's ⋮ › Start a layout from it */
  const fromTemplate = (id: string) => { void run('start a layout from the template', async () => { const r = await createLayout({ fromLayoutId: id }); if ('error' in r) return r; router.push(editorHref(r.id)) }) }
  const loadProjects = useCallback(async (): Promise<PickOption[]> => data.projects.map((p) => ({ id: p.id, label: p.name, sub: [p.number, p.layouts ? count(p.layouts, 'layout', 'layouts') : null].filter(Boolean).join(' · ') })), [data.projects])

  return (
    <>
      <LibraryGallery<Item>
        kind={KIND}
        page={{ title: '3D Space Planner', skeleton: <PlannerHomeGhost iso={iso} /> }}
        items={items}
        deleted={deleted}
        now={data.now}
        ariaLabel="Layouts"
        noun={{ one: 'layout', many: 'layouts' }}
        nameLabel="Layout"
        deletedLabel="Deleted Layouts"
        newMenu={(close) => (
          <>
            {/* (the calm UI build, 6-30 · W-195) one door to every ready-made start — the flats, the furnished examples (was New ▾ › From an
                example…) and My templates are the picker's tabs */}
            <DropdownItem onSelect={() => { close(); setNewFor({ projectId: null }) }}><span className={styles.menuRow}><Icon name="home" size={20} weight={300} />From a ready-made flat…</span></DropdownItem>
            <DropdownItem onSelect={() => { close(); setPhoto({ target: null }) }}><span className={styles.menuRow}><Icon name="add_photo_alternate" size={20} weight={300} />Trace a floor-plan photo…</span></DropdownItem>   {/* (pending modules S28; the calm UI build, 6-06) */}
            <DropdownItem onSelect={() => { close(); setProjectPick(true) }}><span className={styles.menuRow}><Icon name="business_center" size={20} weight={300} />For a project…</span></DropdownItem>
            <DropdownDivider />
            <DropdownItem onSelect={() => { close(); void run('start a layout', async () => { const r = await createLayout({}); if ('error' in r) return r; router.push(editorHref(r.id)) }) }}><span className={styles.menuRow}><Icon name="add_box" size={20} weight={300} />Blank</span></DropdownItem>
          </>
        )}
        filters={[{ key: 'project', label: 'Projects', test: (t) => t.l.kind === 'project' },
          /* (pending modules S07) a lead's, before it is won — only once there is one */
          ...(data.layouts.some((l) => l.kind === 'lead') || data.deleted.some((l) => l.kind === 'lead') ? [{ key: 'lead', label: 'Leads', test: (t: Item) => t.l.kind === 'lead' }] : []),
          { key: 'personal', label: STUDIO_OWN, test: (t) => t.l.kind === 'personal' },
          /* (TD-076) the studio's own starting points — only once there is one */
          ...(data.templates.length || data.deleted.some((d) => d.kind === 'template') ? [{ key: 'template', label: 'Templates', test: (t: Item) => t.l.kind === 'template' }] : [])]}
        filterLabel="Kind"
        searchText={(t) => `${t.l.projectName ?? ''} ${t.l.projectNumber ?? ''} ${t.l.leadName ?? ''}${t.l.kind === 'personal' ? ' personal' : ''}`}
        thumb={(t) => <span className={styles.cover}>{t.l.rooms ? <PlanDrawing plan={t.l.cover} labels="none" unit={14} decorative /> : <span className={styles.coverEmpty}><Icon name="space_dashboard" size={32} weight={300} /><span>No rooms yet</span></span>}</span>}
        glyph={(t) => <span className={styles.glyph}>{t.l.rooms ? <PlanDrawing plan={t.l.cover} labels="none" unit={40} decorative /> : <Icon name="space_dashboard" size={20} weight={300} />}</span>}
        /* (the calm UI build, 6-21 · 6-32) the card's line is the plan — "5 rooms · 101 m²" (never the project's number: the list's Project no. column
           has it); its foot leads with the client (or Studio’s own · Template), "Benjamin Han · edited 17 Oct ’26" — nothing cut */
        meta={(t) => [count(t.l.rooms, 'room', 'rooms'), t.l.levels > 1 ? count(t.l.levels, 'level', 'levels') : null, t.l.area ? cardArea(t.l.area) : null, t.l.shared ? 'Shared' : null].filter(Boolean).join(' · ')}
        /* whose it is and when it was last touched, whole on its own line — who touched it is the list's Updated by, its pieces the list's Furniture */
        foot={(t) => <span className={styles.footWrap}>{`${t.l.kind === 'project' || t.l.kind === 'lead' ? t.l.leadName ?? t.l.projectName ?? (t.l.kind === 'lead' ? 'Lead' : 'Project') : t.l.kind === 'template' ? 'Template' : STUDIO_OWN} · edited ${ago(t.updatedAt.getTime(), data.now)}`}</span>}
        usage={(t) => ((t.l.kind === 'project' || t.l.kind === 'lead' ? t.l.leadName ?? t.l.projectName : null) ?? (t.l.pieces ? count(t.l.pieces, 'piece', 'pieces') : 'No furniture yet'))}
        columns={[
          { key: 'project', label: 'Project', track: '220px', cell: (t) => t.l.projectName ?? (t.l.kind === 'lead' ? `${t.l.leadName ?? 'A lead'} · Lead` : t.l.kind === 'template' ? 'Template' : STUDIO_OWN), sortable: (t) => t.l.projectName ?? t.l.leadName ?? '' },
          /* (the calm UI build, 6-32) the project's number, off the card, in its own column */
          { key: 'number', label: 'Project no.', track: '120px', cell: (t) => t.l.projectNumber ?? '—', sortable: (t) => t.l.projectNumber ?? '' },
          { key: 'rooms', label: 'Rooms', track: '90px', cell: (t) => String(t.l.rooms), sortable: (t) => t.l.rooms },
          { key: 'pieces', label: 'Furniture', track: '100px', cell: (t) => String(t.l.pieces), sortable: (t) => t.l.pieces },
          { key: 'shared', label: 'Client', track: '110px', cell: (t) => (t.l.shared ? 'Shared' : '—'), sortable: (t) => (t.l.shared ? 1 : 0) },
        ]}
        tableKey="planner-layouts"
        onOpen={(t) => open(t.id)}
        kebab={(t) => (t.l.projectId ? [{ label: 'Open the project', onSelect: () => router.push(withFrom(`/projects/${t.l.projectId}`, here)) }]
          : t.l.kind === 'lead' && t.l.leadId ? [{ label: 'Open the lead', onSelect: () => router.push(withFrom(`/leads/${t.l.leadId}`, here)) }]   // (pending modules S07)
          : t.l.kind === 'template' ? [{ label: 'Start a layout from it', onSelect: () => fromTemplate(t.id) }] : [])}
        onDuplicate={async (t) => { const r = await duplicateLayout(t.id); if ('error' in r) throw new Refused(r.error); snackbar({ message: `Duplicated as ${r.name}`, actionLabel: 'Open', onAction: () => open(r.id) }) }}
        onRename={(t, name) => renameLayout(t.id, name)}
        nameMax={NAME_MAX}
        newIcons
        mayChange={(t) => t.l.mayChange}
        fixed={(t) => (t.l.kind === 'project' ? PROJECT_FIXED : t.l.kind === 'lead' ? LEAD_FIXED : null)}
        onDelete={(t) => deleteLayouts([t.id])}
        onDeleteMany={(ts) => deleteLayouts(ts.map((t) => t.id))}
        deleteMessage={(t) => (t.l.shared ? `${t.title} goes to Deleted Layouts and its client link stops — you can restore both there.` : `${t.title} goes to Deleted Layouts — you can restore it there.`)}
        onRestore={(ids) => restoreLayouts(ids)}
        onDeleteForever={(ids) => deleteLayoutsForever(ids)}
        onEmptyTrash={() => emptyLayoutTrash()}
        restoreBlock={(t) => t.l.mayChange}
        purgeRule={(t) => t.l.mayChange}
        foreverNote={(ts) => (ts.some((t) => t.l.shared) ? 'Their client links go with them.' : null)}
        deletedMeta={{ label: 'Rooms', value: (t) => count(t.l.rooms, 'room', 'rooms') }}
        usageWord={(t) => count(t.l.pieces, 'piece', 'pieces')}
        deletedUsageLabel="Furniture"
        empty={{ title: 'No layouts yet', help: 'Start from an HDB, condo or landed flat, or a blank page — place furniture, then walk the client through it in 3D.',
          start: () => ({ primary: { label: 'From a ready-made flat', icon: 'home', onPress: () => setNewFor({ projectId: null }) }, secondary: { label: 'For a project', icon: 'business_center', onPress: () => setProjectPick(true) } }),
          /* (parity map, TD-073) 1.0's "Made with Space Planner": the examples, a press starts the studio's own copy */
          samples: { label: 'Or start from an example', node: (
            <div className={styles.examples} role="list" aria-label="Examples" data-testid="planner-examples">
              {EXAMPLES.slice(0, 4).map((e) => (
                <button key={e.key} type="button" role="listitem" className={styles.example} disabled={busy} onClick={() => fromExample(e.key)} data-testid="planner-example" data-key={e.key}>
                  <span className={styles.exampleArt}><PlanDrawing plan={examplePlan(e.key)!} labels="none" unit={14} decorative /></span>
                  <span className={styles.exampleName}>{e.name}</span>
                </button>
              ))}
            </div>
          ) } }}
        intro={iso ? (
          <section className={styles.isoNote} aria-label="Isometric" data-testid="planner-iso-note">
            <Icon name="view_in_ar" size={20} weight={300} />
            <span className={styles.isoText}>{ISO_NOTE}</span>
            <button type="button" className={styles.isoLink} onClick={() => setPhoto({ target: null })} data-testid="planner-iso-photo">{ISO_PHOTO_LINK}</button>   {/* (pending modules S28) */}
            <button type="button" className={styles.isoLink} onClick={() => router.replace('/planner', { scroll: false })}>{ISO_USUAL_LINK}</button>
          </section>
        ) : undefined}
      />
      <PickOneDialog open={projectPick} onClose={() => setProjectPick(false)} title="Layout for a project" label="Project" load={loadProjects} confirmLabel="Continue" onPick={(id) => { setProjectPick(false); setNewFor({ projectId: id }) }} empty="No running projects to plan yet" />
      <NewLayoutDialog open={!!newFor} onClose={() => setNewFor(null)} projectName={project?.name ?? null} plans={project?.plans ?? []} onStart={start} templates={data.templates} mode={dialogMode}
                       onPhoto={() => { const pid = newFor?.projectId ?? null; setNewFor(null); setPhoto({ target: pid ? { kind: 'project', id: pid } : null }) }} />
      <PhotoDialog open={!!photo} onClose={() => setPhoto(null)} target={photo?.target ?? null} back={here} />
    </>
  )
}
