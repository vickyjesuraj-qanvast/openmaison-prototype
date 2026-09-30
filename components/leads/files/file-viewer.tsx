'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { backLabel as backLabelFor, readFrom, withFrom } from '@/lib/nav'
import { openLeadDesign } from '@/app/visualizer/actions'
import { Icon } from '@/components/om/icon'
import { useEscapeLayer } from '@/components/om/surface'
import { useSheetLayout } from '@/components/om/sheet'
import { Tooltip } from '@/components/om/tooltip'
import { useComingSoon, useSnackbar } from '@/components/om/snackbar'
import { useRun } from '@/components/leads/tasks/use-run'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { PortalMenu } from '@/components/om/portal-menu'
import { PageReveal } from '@/components/shell/page-reveal'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { FileCommentsPanel } from './file-comments-panel'
import { useFileShare } from './use-file-share'
import { ViewerSkeleton } from './viewer-skeleton'
import { FileInfoPanel } from './file-info-panel'
import { liveOrigin, renderHref, visualizeLabel } from './render-origin'
import { NameDialog } from './name-dialog'
import { TrashDialog } from './trash-dialog'
import { MoveDialog } from '@/components/om/folders/move-dialog'
import { addFileComment, createFolder, deleteFileComment, duplicateFiles, editFileComment, moveFiles, renameFile, restoreFiles, trashFiles } from '@/app/leads/files-actions'
import { downloadBlob } from '@/lib/leads/export'
import type { FileViewData } from '@/lib/leads/files'
import styles from './file-viewer.module.css'

/**
 * Zoom bar (931:39855): remove / arrows_output / add. Real CSS scale steps 1–3 with fit (1) as the floor, so the rest
 * state reads like the mock — remove #999999 · arrows_output #999999 · add #1a1a1a; arrows_output puts the image back to fit.
 */
const ZOOM_STEPS = [1, 1.5, 2, 3]
const FIT = 0
const LAST = ZOOM_STEPS.length - 1

type Panel = 'comments' | 'info' | null

/**
 * File viewer (931:39831 frame 92 · 93 with Comments · 94 with Information · 95 kebab). The page is the L2 header row
 * (arrow_back · file name 20/Bold · comment · download · info · more_vert) over the "Section container": the image
 * contained and centred inside p100/120 (p24/100 once a panel is open), the zoom bar at the bottom centre, prev / next
 * at the edges, and the 400px right panel the header icons toggle. Spec: design-source/context/lead-files/03-viewer-panels.txt.
 *
 * The header is NOT `PageHeaderL2`: that component always renders "{crumb} / " over the title and the mock has no crumb
 * (arrow + name on one 56px line), so the row is copied from page-header-l2.module.css at 56 with the spec's p16/24.
 */
export function FileViewer({ data }: { data: FileViewData }) {
  const { lead, file, folder, siblings, files, comments, me, now, render } = data
  const router = useRouter()
  const snackbar = useSnackbar()
  const comingSoon = useComingSoon()
  const { run, fail, refresh } = useRun()
  const share = useFileShare({ lead, sender: me.name })   // (UX audit 2026-09-30, T9) the client's read-only link

  const [zoomIdx, setZoomIdx] = useState(FIT)
  // `?panel=comments` opens the panel with the page — the listings' comment chips land here (REG-253).
  const landing = useSearchParams().get('panel')
  const [panel, setPanel] = useState<Panel>(landing === 'comments' ? 'comments' : null)
  const [kebabOpen, setKebabOpen] = useState(false)
  /* (wave E, files-5) The kebab's menu opens through the portal (the house rule for every row / toolbar menu): anchored inside the z-20
     header, it opened UNDER an open Information / Comments panel (z 91) — pressed, but invisible and out of reach. */
  const kebabRef = useRef<HTMLSpanElement>(null)
  const closeKebab = useCallback(() => setKebabOpen(false), [])
  const sheet = useSheetLayout()   // ≤767: the kebab is a bottom sheet and the header's Download folds into it
  /* (REG-348) The side panels are full-screen sheets at ≤767 and every other sheet in the app closes on Escape;
     these two closed only from their own X. One ref for whichever is open — they are never open together. */
  const panelRef = useRef<HTMLElement>(null)
  useEscapeLayer(panel !== null, panelRef, () => setPanel(null))
  const [deletingComment, setDeletingComment] = useState<string | null>(null)   // every destructive action confirms (REG-264)
  const [renaming, setRenaming] = useState(false)
  const [trashing, setTrashing] = useState(false)
  const [moving, setMoving] = useState(false)

  const zoom = ZOOM_STEPS[zoomIdx] ?? 1
  /* Back to the Files tab — inside the open folder when the file sits in one (the tab reads `?folder=`). */
  const from = readFrom(useSearchParams().get('from'))   // (REG-465) the tab URL the file was opened from, folder and origin included
  const backHref = from ?? (folder ? `/leads/${lead.id}/files?folder=${folder.id}` : `/leads/${lead.id}/files`)
  /* (F105) Back names where it goes: the lead's Files (any folder of it) reads "Back to Files"; the AI Visualizer, a quote, … their own name */
  const backLabel = from?.startsWith(`/leads/${lead.id}/files`) ? 'Back to Files' : backLabelFor(from, { leadName: lead.name, fallback: 'Back to Files' })
  const idx = siblings.findIndex((s) => s.id === file.id)
  const prev = idx > 0 ? siblings[idx - 1] : undefined
  const next = idx >= 0 ? siblings[idx + 1] : undefined
  /* Images render their thumbnail; a PDF shows the committed PDF glyph (no PDF viewer is mocked — frames 92–95 are all images). */
  const src = file.thumb ?? (file.kind === 'pdf' ? '/figma-assets/file-pdf.svg' : null)
  const togglePanel = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p))

  /* files-actions revalidates the lead, the Files / Tasks tabs and the listing — not this viewer route — so file actions
     refresh the page from here; the comment actions do revalidate `/leads/<id>/files/<fileId>` and need no refresh (PERF-04). */
  const REFRESH = { refresh: true } as const

  /* (REG-675, AI Visualizer Q-31) The photo opens as a room of the lead's design; Back there returns to this file. */
  const params = useSearchParams()
  const here = () => { const q = params.toString(); return `/leads/${lead.id}/files/${file.id}${q ? `?${q}` : ''}` }
  const visualize = visualizeLabel(file, render ? { [file.id]: render } : {})
  const openInVisualizer = async () => {
    /* (F095) a filed render opens its own version — the room, the version selected — never a new room made of the render */
    const o = liveOrigin(render)   // (files-client) a render whose design was deleted forever opens as a plain picture
    if (o) { router.push(withFrom(renderHref(o), here())); return }
    const r = await openLeadDesign(lead.id).catch(() => ({ error: 'Couldn’t open the AI Visualizer — please try again' }))
    if ('error' in r) { snackbar({ message: r.error }); return }
    router.push(withFrom(`/visualizer/${r.id}?file=${file.id}`, here()))
  }

  /* Download: image files download their thumbnail as a real file (the demo has no originals); anything else is coming soon. */
  const download = async () => {
    if (file.kind !== 'image' || !file.thumb) { comingSoon(); return }
    try {
      const blob = await (await fetch(file.thumb)).blob()
      const ext = file.mime === 'image/png' ? 'png' : 'jpg'
      downloadBlob(blob, /\.[a-z0-9]+$/i.test(file.name) ? file.name : `${file.name}.${ext}`)
    } catch { fail('download the file') }
  }

  return (
    <PageReveal skeleton={<ViewerSkeleton />}>
      <div className={styles.body} data-testid="file-viewer">
        {/* Page Header / Leads - L2 (931:39835) 1424×56, p16/24, bottom rule — arrow_back 24/Light · name 20/Bold · actions H g24 */}
        <header className={styles.header}>
          <Tooltip label={backLabel}>
            <Link href={backHref} className={styles.back} aria-label={backLabel}>
              <Icon name="arrow_back" size={24} weight={300} />
            </Link>
          </Tooltip>
          <h1 className={styles.title}>{file.name}</h1>
          <div className={styles.actions}>
            <Tooltip label="Comments">
              <button type="button" className={styles.iconBtn} aria-label="Comments" aria-pressed={panel === 'comments'} onClick={() => togglePanel('comments')}>
                <Icon name="comment" size={24} />
              </button>
            </Tooltip>
            {/* ≤767 (REG-269) this button hides and Download becomes the kebab's first item — the 56px row keeps the name. */}
            <Tooltip label="Download">
              <button type="button" className={`${styles.iconBtn} ${styles.actionDownload}`} aria-label="Download" onClick={() => { void download() }}>
                <Icon name="download" size={24} />
              </button>
            </Tooltip>
            <Tooltip label="Information">
              <button type="button" className={styles.iconBtn} aria-label="Information" aria-pressed={panel === 'info'} onClick={() => togglePanel('info')}>
                <Icon name="info" size={24} />
              </button>
            </Tooltip>
            <span className={styles.anchor} ref={kebabRef}>
              <Tooltip label="More options" disabled={kebabOpen}>
                <button type="button" className={styles.iconBtn} aria-label="More options" aria-haspopup="menu" aria-expanded={kebabOpen} onClick={() => setKebabOpen((o) => !o)}>
                  <Icon name="more_vert" size={24} />
                </button>
              </Tooltip>
              {/* Frame 95 (931:39889): Move · Duplicate · Rename · Delete, 200 wide under the kebab */}
              <PortalMenu open={kebabOpen} anchor={kebabRef} onClose={closeKebab} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={file.name}>
                {/* (REG-269) Mobile only: the header's Download folds in here. (audit 2026-09-26) A row of the sheet itself, not one wrapped
                    in a `display: contents` span — the sheet's 16px row gutter is `.menuBody > button`, and the wrapper left it at 12. */}
                {sheet ? <DropdownItem onSelect={() => { setKebabOpen(false); void download() }}>Download</DropdownItem> : null}
                {/* (UX audit 2026-09-30, T9) a drawing goes back to the client as a link — no Download and a manual message */}
                {file.share ? <DropdownItem onSelect={() => { setKebabOpen(false); share.copyLink(file) }}>Copy link</DropdownItem> : null}
                {file.share ? <DropdownItem onSelect={() => { setKebabOpen(false); share.sendWhatsApp(file) }}>Send on WhatsApp</DropdownItem> : null}
                {visualize ? <DropdownItem onSelect={() => { setKebabOpen(false); void openInVisualizer() }}>{visualize}</DropdownItem> : null}   {/* (REG-675, AI Visualizer Q-31; F095 a render opens its version) */}
                <DropdownItem onSelect={() => { setKebabOpen(false); setMoving(true) }}>Move</DropdownItem>
                <DropdownItem onSelect={() => { setKebabOpen(false); void run('duplicate the file', () => duplicateFiles([file.id]), 'File duplicated', REFRESH) }}>Duplicate</DropdownItem>
                <DropdownItem onSelect={() => { setKebabOpen(false); setRenaming(true) }}>Rename</DropdownItem>
                <DropdownItem tone="danger" onSelect={() => { setKebabOpen(false); setTrashing(true) }}>Delete</DropdownItem>   {/* (REG-728) the row's own tone */}
              </PortalMenu>
            </span>
          </div>
        </header>

        {/* Section container (931:39853): image area + optional 400px panel (931:39912) */}
        <div className={styles.stage}>
          <div className={styles.canvas} data-panel={panel ? '' : undefined}>
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.image} src={src} alt={file.name} style={{ transform: `scale(${zoom})` }} data-testid="viewer-image" />
            ) : null}

            {/* prev / next (931:39859): 48px white buttons at the edges (inset 16), vertically centred; hidden when there is no neighbour */}
            {prev ? (
              <Tooltip label="Previous file" side="right">
                <button type="button" className={styles.nav} data-side="prev" aria-label="Previous file" onClick={() => router.push(withFrom(`/leads/${lead.id}/files/${prev.id}`, from))}>
                  <Icon name="keyboard_arrow_left" size={24} />
                </button>
              </Tooltip>
            ) : null}
            {next ? (
              <Tooltip label="Next file" side="left">
                <button type="button" className={styles.nav} data-side="next" aria-label="Next file" onClick={() => router.push(withFrom(`/leads/${lead.id}/files/${next.id}`, from))}>
                  <Icon name="keyboard_arrow_right" size={24} />
                </button>
              </Tooltip>
            ) : null}

            {/* Zoom bar (931:39855) 130×50, H g16 p12, bottom inset 22 */}
            <div className={styles.zoomBar} role="group" aria-label="Zoom">
              <Tooltip label="Zoom out" side="top">
                <button type="button" className={styles.zoomBtn} aria-label="Zoom out" aria-disabled={zoomIdx === 0} onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}>
                  <Icon name="remove" size={24} />
                </button>
              </Tooltip>
              {/* (REG-273) arrows_output is the one glyph here whose meaning lives only in its tooltip, and a tooltip
                  never fires for a touch pointer — so ≤767 the tooltip's own words become a visible label beside it. */}
              <Tooltip label="Fit to screen" side="top">
                <button type="button" className={`${styles.zoomBtn} ${styles.zoomFit}`} aria-label="Fit to screen" aria-disabled={zoomIdx === FIT} onClick={() => setZoomIdx(FIT)}>
                  <Icon name="arrows_output" size={24} />
                  <span className={styles.zoomLabel}>Fit to screen</span>
                </button>
              </Tooltip>
              <Tooltip label="Zoom in" side="top">
                <button type="button" className={styles.zoomBtn} aria-label="Zoom in" aria-disabled={zoomIdx === LAST} onClick={() => setZoomIdx((i) => Math.min(LAST, i + 1))}>
                  <Icon name="add" size={24} />
                </button>
              </Tooltip>
            </div>
          </div>

          {panel === 'comments' ? (
            <aside ref={panelRef} className={styles.panel} aria-label="Comments" tabIndex={-1}>
              <FileCommentsPanel
                comments={comments}
                me={me}
                now={now}
                onAdd={(body) => { void run('post the comment', () => addFileComment(file.id, body)) }}
                onEdit={(id, body) => { void run('save the comment', () => editFileComment(id, body)) }}
                onDelete={setDeletingComment}
                onClose={() => setPanel(null)}
              />
            </aside>
          ) : panel === 'info' ? (
            <aside ref={panelRef} className={styles.panel} aria-label="Information" tabIndex={-1}>
              <FileInfoPanel file={file} folder={folder} me={me} onClose={() => setPanel(null)}
                             origin={render ? { render, href: liveOrigin(render) ? withFrom(renderHref(render), here()) : null } : null} />
            </aside>
          ) : null}
        </div>
      </div>

      {/* Rename File (931:39434) */}
      <NameDialog
        open={renaming}
        title="Rename File"
        initial={file.name}
        onClose={() => setRenaming(false)}
        onSave={(name) => { setRenaming(false); void run('rename the file', () => renameFile(file.id, name), 'Renamed', REFRESH) }}
      />
      {/* Move to Trash Folder? (931:39204) — the file leaves the viewer, so the page goes back to the tab; Undo restores it. */}
      <TrashDialog
        open={trashing}
        names={[file.name]}
        onNo={() => setTrashing(false)}
        onYes={async () => {
          setTrashing(false)
          try {
            await trashFiles([file.id])
            snackbar({ message: 'Moved to Trash Folder', actionLabel: 'Undo', onAction: () => { void restoreFiles([file.id]).then(() => router.refresh()) } })
            router.push(backHref)
          } catch { fail('delete the file') }
        }}
      />
      {/* Move dialog (931:39216) — browses every folder of the lead; the destination name feeds the "Moved to <folder>" snackbar. */}
      <MoveDialog
        open={moving}
        title={`Move “${file.name}”`} root="All Files" moving={[file.id]} current={folder?.id ?? null}
        folders={files.filter((f) => f.kind === 'folder' && !f.deletedAt).map((f) => ({ id: f.id, name: f.name, parentId: f.parentId ?? null }))}
        entries={files.filter((f) => f.kind !== 'folder' && !f.deletedAt).map((f) => ({ id: f.id, name: f.name, parentId: f.parentId ?? null, thumb: f.thumb }))}
        onClose={() => setMoving(false)}
        onMove={(parentId: string | null) => {
          setMoving(false)
          const dest = parentId ? files.find((f) => f.id === parentId)?.name ?? 'folder' : 'All Files'
          void run('move the file', () => moveFiles([file.id], parentId), `Moved to ${dest}`, REFRESH)
        }}
        onCreateFolder={async (name: string, parentId: string | null) => {
          const id = await createFolder(lead.id, name, parentId)
          snackbar({ message: 'Folder created' }); refresh()
          return id
        }}
      />

      <ConfirmDialog
        open={!!deletingComment} title="Delete Comment" confirmLabel="Yes" cancelLabel="No"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        onCancel={() => setDeletingComment(null)}
        onConfirm={() => { const id = deletingComment; setDeletingComment(null); if (id) void run('delete the comment', () => deleteFileComment(id), 'Comment deleted') }}
      />

      {/* Generic shell: Maison AI FAB + sheet (no lead brief here — the viewer carries no stage, so the sheet offers only its base controls). */}
    </PageReveal>
  )
}
