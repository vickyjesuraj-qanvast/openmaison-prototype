'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { LibraryGallery, Refused, type LibraryItem, type LibraryPlace } from '@/components/company/templates/library-gallery'
import { DropdownDivider, DropdownItem } from '@/components/leads/dropdown'
import { PickOneDialog } from '@/components/company/templates/pick-one-dialog'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { useRun } from '@/components/leads/tasks/use-run'
import { useFlagPref } from '@/lib/prefs'
import { useMaisonAi } from '@/lib/maison-ai'
import { withFrom } from '@/lib/nav'
import { SAMPLE_ROOMS } from '@/lib/visualizer/samples'
import type { DesignCard, VisualizerHome as HomeData } from '@/lib/visualizer/queries'
import { createDesign, deleteDesigns, deleteDesignsForever, duplicateDesign, emptyDesignTrash, openLeadDesign, renameDesign, restoreDesigns } from '@/app/visualizer/actions'
import { designKindLabel } from './kind-label'
import { VisualizerHomeGhost } from './home-skeleton'
import { INTRO_PREF, VisualizerIntro } from './intro'
import { DesignCover } from './design-cover'
import styles from './visualizer-home.module.css'

type Item = LibraryItem & { d: DesignCard }
const KIND = { key: 'visualizer', icon: 'wand_shine', label: 'Designs', title: 'AI Visualizer', help: '', href: '/visualizer', live: true }
/** (F119 · critic 14) A lead's design is its lead's: named after it and never filed — said wherever a Move would leave it behind. */
const LEAD_FIXED = 'A lead’s design stays with its lead, outside folders'
/** (F122) The server's limit on a design's name (renameDesign refuses past it). */
const NAME_MAX = 80
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Tools › AI Visualizer (REG-673; 1.0's gallery landing, A B-01…B-26, on the house library gallery — REG-614's rule): every design the
 * member may see — a lead's (one each, named after the lead) or a personal one — as covers, with the Kind pill, search, folders for
 * personal designs, the list view, rename · move · duplicate · delete with Undo and the Deleted sheet. New ▾ starts a blank design, a
 * lead's design or one from a sample room; the intro card says what the tool does until it is dismissed.
 */
export function VisualizerHome({ data }: { data: HomeData }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const [introHidden, setIntroHidden] = useFlagPref(INTRO_PREF, false)
  /* (F118 · F214) the pickers keep where New ▾ was pressed — the open folder a new design lands in */
  const [leadPick, setLeadPick] = useState<LibraryPlace | null>(null)
  const [samplePick, setSamplePick] = useState<LibraryPlace | null>(null)
  const [busy, setBusy] = useState(false)
  /* (F118) this page as it stands (its folder, its search) — where the editor's Back returns */
  const params = useSearchParams()
  const hereParams = new URLSearchParams(params.toString()); hereParams.delete('deleted')   // (F084) the folder and search ride along; the one-off mark does not
  const here = hereParams.toString() ? `/visualizer?${hereParams}` : '/visualizer'
  /* (F085) deleted from its editor: said here once, with the gallery's Undo, and the URL loses the mark (contract templates' pattern) */
  const pathname = usePathname()
  const deletedId = params.get('deleted')
  useEffect(() => {
    if (!deletedId) return
    const d = data.deleted.find((x) => x.id === deletedId)
    const rest = new URLSearchParams(params.toString()); rest.delete('deleted')
    router.replace(`${pathname}${rest.toString() ? `?${rest}` : ''}`, { scroll: false })
    /* (verify round 1, F129 · F204) the Undo's refusal says the rule (run reads the `{ error }` answer), never "please try again" */
    if (d) snackbar({ message: `${d.name} deleted`, actionLabel: 'Undo', onAction: () => { void run('restore the design', () => restoreDesigns([d.id])).then((ok) => { if (ok) router.refresh() }) } })
  }, [deletedId])   // eslint-disable-line react-hooks/exhaustive-deps -- once per arrival
  useMaisonAi(['Which renders did clients pick this week?', 'Start a design for my newest lead', 'Show designs waiting on the client'])

  const open = (id: string) => router.push(withFrom(`/visualizer/${id}`, here))
  const toItem = (d: DesignCard): Item => ({ id: d.id, title: d.name, createdAt: d.createdAt, updatedAt: d.updatedAt, author: d.author, authorColor: d.authorColor, usedBy: d.renders, deletedAt: d.deletedAt, folderId: d.folderId, d })
  /* (F131) a live card's "edited … by" is whoever made its newest version; Deleted Designs' *Made by* is the design's maker */
  const items = data.designs.map(toItem), deleted = data.deleted.map((d) => ({ ...toItem(d), author: d.maker, authorColor: d.makerColor }))
  /* (F118 · F214) a new design lands in the folder that was open; the editor's Back returns to it */
  const blank = async (place: LibraryPlace) => {
    if (busy) return
    setBusy(true)
    try { const r = await createDesign({ folderId: place.folderId }); if ('error' in r) { snackbar({ message: r.error }); return } router.push(withFrom(`/visualizer/${r.id}`, place.here)) } catch { snackbar({ message: 'Couldn’t start a design — please try again' }) } finally { setBusy(false) }
  }
  /* (F214) a lead's pick waits like Blank does and says so when it can't open; the lead's design stays unfiled (it may already exist) */
  const forLead = async (leadId: string, place: LibraryPlace) => {
    setLeadPick(null)
    if (busy) return
    setBusy(true)
    try {
      const r = await openLeadDesign(leadId)
      if ('error' in r) { snackbar({ message: r.error }); return }
      router.push(withFrom(`/visualizer/${r.id}`, place.here))
    } catch { snackbar({ message: 'Couldn’t open the lead’s design — please try again' }) } finally { setBusy(false) }
  }
  /* (F214) a sample start is a design and its first room, made in one step on the server — both land or neither does */
  const fromSample = async (key: string, asSketch: boolean, place: LibraryPlace) => {
    setSamplePick(null)
    const s = SAMPLE_ROOMS.find((x) => x.key === key)
    if (!s) return
    const d = await createDesign({ name: `Sample · ${asSketch ? `${s.name} sketch` : s.name}`, folderId: place.folderId, sample: { key, asSketch } })
    if ('error' in d) throw new Error(d.error)
    router.push(withFrom(`/visualizer/${d.id}`, place.here))
  }
  /* (F130) the picker says which leads already have a design — the one the landing shows (a lead's design shows once it has a room) */
  const shownIds = new Set(data.designs.map((d) => d.id))
  const loadLeads = useCallback(async () => data.leads.map((l) => ({ id: l.id, label: l.name, sub: [l.stage, l.propertyType, l.hasDesign && shownIds.has(l.hasDesign) ? 'Has a design' : null].filter(Boolean).join(' · ') })), [data.leads, data.designs])   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <LibraryGallery<Item>
        kind={KIND}
        /* (F166) the ghost the reveal crossfades from is drawn with what the page knows: the intro if it shows, the folders at the level
           the page opens on, as many cards as it has (up to two rows) */
        page={{ title: 'AI Visualizer', skeleton: <VisualizerHomeGhost /> }}   /* (REG-708) the ghost its loading.tsx drew — the usual page, the member's own intro */
        intro={introHidden ? null : (
          <VisualizerIntro hasDesigns={items.length > 0} dismiss={<Tooltip label="Dismiss"><IconButton icon="close" label="Dismiss" size={24} variant="bare" iconSize={20} onClick={() => setIntroHidden(true)} /></Tooltip>} />
        )}
        items={items}
        deleted={deleted}
        now={data.now}
        ariaLabel="Designs"
        noun={{ one: 'design', many: 'designs' }}
        nameLabel="Design"
        deletedLabel="Deleted Designs"
        newMenu={(close, place) => (
          <>
            <DropdownItem onSelect={() => { close(); void blank(place) }}><span className={styles.menuRow}><Icon name="add_photo_alternate" size={20} weight={300} />Blank design</span></DropdownItem>
            <DropdownItem onSelect={() => { close(); setLeadPick(place) }}><span className={styles.menuRow}><Icon name="person" size={20} weight={300} />For a lead…</span></DropdownItem>
            <DropdownDivider />
            <DropdownItem onSelect={() => { close(); setSamplePick(place) }}><span className={styles.menuRow}><Icon name="photo" size={20} weight={300} />From a sample room…</span></DropdownItem>
          </>
        )}
        filters={[{ key: 'lead', label: 'Leads', test: (t) => t.d.kind === 'lead' }, { key: 'personal', label: 'Personal', test: (t) => t.d.kind === 'personal' }]}
        filterLabel="Kind"
        searchText={(t) => `${t.d.leadName ?? ''} ${t.d.roomNames.join(' ')}`}
        thumb={(t) => <DesignCover covers={t.d.covers} name={t.title} />}
        glyph={(t) => (
          /* (F133) the list and the Deleted sheet show the design's own cover, as the card does; the wand only while it has no photo */
          // eslint-disable-next-line @next/next/no-img-element
          <span className={styles.glyph}>{t.d.covers[0] ? <img src={t.d.covers[0]} alt="" loading="lazy" decoding="async" /> : <Icon name="wand_shine" size={18} weight={300} />}</span>
        )}
        /* (F117 · F134) what the design is leads its own line — "Lead · Met" as the editor says it, or "Personal" — so no chip takes the
           name's width, at any card size */
        meta={(t, at) => [
          /* (wave E, phone-5) under Kind: Personal the pill already says it — the line keeps its room for the counts; under Leads the stage stays */
          at.filter === 'all' ? designKindLabel(t.d.kind, t.d.leadStage) : at.filter === 'lead' ? t.d.leadStage : null,
          count(t.d.rooms, 'room', 'rooms'), count(t.d.renders, 'render', 'renders')].filter(Boolean).join(' · ')}
        usage={(t) => (t.d.roomNames.length ? t.d.roomNames.slice(0, 3).join(', ') + (t.d.roomNames.length > 3 ? ` +${t.d.roomNames.length - 3}` : '') : 'No rooms yet')}
        columns={[
          { key: 'kind', label: 'Kind', track: '140px', cell: (t) => designKindLabel(t.d.kind, t.d.leadStage), sortable: (t) => t.d.kind },
          { key: 'rooms', label: 'Rooms', track: '100px', cell: (t) => String(t.d.rooms), sortable: (t) => t.d.rooms },
          { key: 'renders', label: 'Renders', track: '110px', cell: (t) => String(t.d.renders), sortable: (t) => t.d.renders },
        ]}
        tableKey="viz-designs"
        onOpen={(t) => open(t.id)}
        /* (F084) the lead's Back returns here — this folder, this search */
        kebab={(t) => (t.d.leadId ? [{ label: 'Open the lead', onSelect: () => router.push(withFrom(`/leads/${t.d.leadId}`, here)) }] : [])}
        /* (verify round 1, F129) a refusal throws the server's words (Refused), so the snackbar says why rather than "please try again" */
        onDuplicate={async (t) => { const r = await duplicateDesign(t.id); if ('error' in r) throw new Refused(r.error); snackbar({ message: 'Duplicated as a personal copy', actionLabel: 'Open', onAction: () => open(r.id) }) }}   /* one line at 344 whatever the name (the Open action rides it) */
        onRename={(t, name) => renameDesign(t.id, name)}
        nameMax={NAME_MAX}
        newIcons
        /* (F119) a lead's design follows the design rule the editor uses (its maker, an Owner or an Admin deletes it); it is never renamed
           (it carries the lead's name) nor filed, so those rows leave its menu */
        mayChange={(t) => t.d.mayChange}
        fixed={(t) => (t.d.kind === 'lead' ? LEAD_FIXED : null)}
        moveThumb={(t) => ({ src: t.d.covers[0] ?? null })}
        onDelete={(t) => deleteDesigns([t.id])}
        onDeleteMany={(ts) => deleteDesigns(ts.map((t) => t.id))}
        deleteMessage={(t) => (t.d.renders ? `${t.title} and its ${count(t.d.renders, 'render', 'renders')} go to Deleted Designs — you can restore them there.` : `${t.title} goes to Deleted Designs — you can restore it there.`)}   /* (F128) never "its 0 renders" */
        onRestore={(ids) => restoreDesigns(ids)}
        onDeleteForever={(ids) => deleteDesignsForever(ids)}
        onEmptyTrash={() => emptyDesignTrash()}
        /* (verify round 1, F204 · critic 15) the Deleted sheet offers only what the server allows: Restore and Delete Forever on a design the
           viewer made (or any, for an Owner or an Admin), the rule said in the row; Empty Trash counts only those */
        restoreBlock={(t) => (t.d.mayChange ? `Only ${t.d.maker ?? 'whoever made it'}, an Owner or an Admin can restore this design or delete it for good` : null)}
        purgeRule={(t) => (t.d.mayChange ? `Only ${t.d.maker ?? 'whoever made it'}, an Owner or an Admin can delete this design for good` : null)}
        /* (verify round 1, F093) what going for good takes, and what it leaves */
        foreverNote={(ts) => {
          const one = ts.length === 1
          const filed = ts.some((t) => t.d.kind === 'lead' && t.d.renders > 0), rendered = ts.some((t) => t.d.renders > 0)
          return [filed ? `Renders saved to ${one ? 'the lead’s' : 'a lead’s'} Files stay there.` : null,
            rendered ? `${one ? 'Its' : 'Their'} client links, and the client’s notes and replies on them, go ${one ? 'with it' : 'with them'}.` : null].filter(Boolean).join(' ') || null
        }}
        deletedMeta={{ label: 'Rooms', value: (t) => count(t.d.rooms, 'room', 'rooms') }}
        usageWord={(t) => count(t.d.renders, 'render', 'renders')}
        deletedUsageLabel="Renders"
        empty={{ title: 'No designs yet', help: 'Start with a room photo — a blank design, a lead’s site photos or one of the sample rooms. New ▾ has all three.' }}
        folders={{ library: 'visualizer', list: data.folders, block: null }}
      />
      <PickOneDialog open={!!leadPick} onClose={() => setLeadPick(null)} title="Design for a lead" label="Lead" load={loadLeads} confirmLabel="Open design" onPick={(id) => { const at = leadPick ?? { folderId: null, here }; void forLead(id, at) }} empty="No leads to design for yet" />
      <Dialog open={!!samplePick} onClose={() => setSamplePick(null)} title="Start from a sample room" subtitle="A furnished photo to try every tool on — or a sketch to render." size="modal" width={600}
              footer={<Button variant="secondary" appearance="outlined" onPress={() => setSamplePick(null)}>Cancel</Button>}>
        <div className={styles.samples} role="list" data-testid="viz-samples">
          {SAMPLE_ROOMS.flatMap((s) => [{ s, sketch: false }, ...(s.sketch ? [{ s, sketch: true }] : [])]).map(({ s, sketch }) => (
            <button key={`${s.key}-${sketch}`} type="button" role="listitem" className={styles.sample} onClick={() => { const at = samplePick ?? { folderId: null, here }; void run('start the design', () => fromSample(s.key, sketch, at)) }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sketch ? s.sketch! : s.original} alt="" />
              <span className={styles.sampleName}>{sketch ? `${s.name} sketch` : s.name}</span>
              <span className={styles.sampleHelp}>{sketch ? 'A hand-drawn concept to render into a photo' : s.context.charAt(0).toUpperCase() + s.context.slice(1)}</span>
            </button>
          ))}
        </div>
      </Dialog>
    </>
  )
}
