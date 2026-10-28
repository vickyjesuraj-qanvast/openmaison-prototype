'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, Checkbox } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { DetailBulkBar } from '@/components/leads/tasks/detail-bulk-bar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { deleteProjectsForever, emptyProjectTrash, listDeletedProjects, restoreProjects, type DeletedProjectRow } from '@/app/projects/ending-actions'
import { DELETE_RULE, RESTORE_RULE } from '@/lib/projects/handover-model'
import { STAGE_LABEL, isProjectStage } from '@/lib/projects/model'
import { displayDate } from '@/lib/format'
import styles from '@/components/contracts/deleted-contracts-sheet.module.css'
import own from './deleted-projects-sheet.module.css'   // (fix-E, E-26) the number under the name; labels on a phone · (parity P-36) the Deleted Leads look

/**
 * (Projects round 7, Q-26) Deleted projects — Deleted Contracts' twin on its stylesheet (the Deleted sheets' shell, REG-511 · REG-727: the
 * 1200 panel, the crumb head with Empty Trash, the table on the table core, selection + bulk bar, a failed load with its retry, no foot):
 * Project · Client · Stage · Deleted · Deleted by · Restore / Delete Forever. Opened from the listing's ⋮. Restore puts a project back (a
 * direct project's client record with it); Delete Forever asks first. Only Owners and Admins restore or delete forever.
 * (parity P-36, D-10 · Q-11) It wears the mocked Deleted Leads sheet's look (779:26316): the retention banner on top — "stay here until they are
 * deleted forever", the project's own rule — Restore and Delete Forever as the row's text links, the note under the table; the dates' head
 * reads "Deleted", as the Deleted Leads sheet's now does.
 */
/** (simplify S-25 (3), the owner's "build everything", 2026-10-09) Delete forever says what it skipped and why — a project with money recorded
    on it is never purged (Q-26), and the sheet used to say "deleted forever" over the ones it kept. (invented copy) */
function foreverWords(r: { removed: number; kept?: number }, o: { empty?: boolean } = {}): string {
  const kept = r.kept ?? 0
  const gone = r.removed === 0 ? '' : r.removed === 1 && !o.empty ? 'Project deleted forever' : `${r.removed} ${r.removed === 1 ? 'project' : 'projects'} deleted forever`
  const stay = kept ? `${kept} ${kept === 1 ? 'project with money recorded stays' : 'projects with money recorded stay'} in Deleted projects` : ''
  return gone && stay ? `${gone} — ${stay.charAt(0).toLowerCase()}${stay.slice(1)}` : gone || (stay ? `Nothing deleted — ${stay.charAt(0).toLowerCase()}${stay.slice(1)}` : 'Nothing deleted')
}

export function DeletedProjectsSheet({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const snackbar = useSnackbar()
  const [rows, setRows] = useState<DeletedProjectRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [tick, setTick] = useState(0)
  const [confirm, setConfirm] = useState<{ kind: 'forever'; ids: string[] } | { kind: 'empty' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setRows(null); setFailed(false); setConfirm(null); setSelected(new Set()) } }
  useEffect(() => {
    if (!open) return
    let live = true
    void listDeletedProjects().then((r) => { if (live) { setRows(r); setFailed(false) } }, () => { if (live) { setRows([]); setFailed(true) } })
    return () => { live = false }
  }, [open, tick])
  /** Runs one press; a refusal names its rule; the list is read again whatever happened. */
  const run = async (what: string, fn: () => Promise<unknown>, done: (r: unknown) => string | null) => {
    if (busy) return
    setBusy(true)
    try {
      const r = await fn()
      if (r && typeof r === 'object' && 'error' in r) snackbar({ message: couldnt(what, refusalOf((r as { error: string }).error)) })
      else { const m = done(r); if (m) snackbar({ message: m }); onChanged() }
    } catch (e) { snackbar({ message: couldnt(what, refusalOf(e)) }) }
    finally { try { setRows(await listDeletedProjects()) } catch { setFailed(true) } setBusy(false) }
  }
  const restore = (ids: string[]) => run(ids.length > 1 ? 'restore the projects' : 'restore the project', () => restoreProjects(ids), (r) => {
    const x = r as { restored: number; refused: string | null }
    return x.refused ? (x.restored ? `${x.restored} restored — ${x.refused.replace(/^./, (c) => c.toLowerCase())}` : couldnt('restore the project', x.refused)) : x.restored === 1 ? 'Project restored' : `${x.restored} projects restored`
  })
  const emptiable = (rows ?? []).filter((r) => r.mine).length
  const live = (rows ?? []).filter((r) => selected.has(r.id))
  const mine = live.filter((r) => r.mine).map((r) => r.id)
  const pickable = (rows ?? []).filter((r) => r.mine)
  const allOn = pickable.length > 0 && pickable.every((r) => selected.has(r.id))
  const toggle = (id: string) => setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <>
      {/* (the calm UI build 2026-10-27, 3-47 · 3-40 · W-170 · W-511 · T-04 · T-05) one line under the title says what Restore does and who may —
          the banner and the foot note said the same twice; "Delete all forever" names what Empty Trash did; the client rides with the name */}
      <Dialog open={open} onClose={onClose} title="Deleted projects" eyebrow="Projects /" size="modal" width={1200} minHeight={480} phoneFull portal
              subtitle={<span data-testid="deleted-projects-banner">Restore brings back its schedule, updates and money. Only Owners and Admins can restore or delete.</span>}
              actions={<Button variant="secondary" appearance="outlined" onPress={() => setConfirm({ kind: 'empty' })} isDisabled={!emptiable || busy}>Delete all forever</Button>}>
        <div className={styles.table} role="table" aria-label="Deleted projects" data-testid="deleted-projects" data-by="" data-select="">
          <div className={styles.head} role="row">
            <span role="columnheader" className={`${styles.hCell} ${styles.sel}`}><Checkbox isSelected={allOn} isIndeterminate={!allOn && live.length > 0} isDisabled={!pickable.length} onChange={() => setSelected(allOn ? new Set() : new Set(pickable.map((r) => r.id)))} aria-label="Select all deleted projects" /></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Project</span></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Stage</span></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Deleted</span></span>
            <span role="columnheader" className={styles.hCell}><span className={styles.hLabel}>Deleted by</span></span>
            <span role="columnheader" className={`${styles.hCell} ${styles.actions}`}><span className={styles.hLabel}>Actions</span></span>
          </div>
          {rows === null ? <div className={styles.empty}>Loading…</div>
            : failed ? <div className={styles.empty} role="status">Couldn’t load the deleted projects — <button type="button" className={styles.retry} onClick={() => { setRows(null); setTick((t) => t + 1) }}>try again</button></div>
            : rows.length === 0 ? <div className={styles.empty} role="status">No deleted projects.</div> : rows.map((p) => (
            <div key={p.id} className={`${styles.row} ${own.phoneRow}`} role="row" data-testid="deleted-project" data-id={p.id} data-selected={selected.has(p.id) || undefined}>
              <span role="cell" className={`${styles.cell} ${styles.sel}`}><Checkbox isSelected={selected.has(p.id)} isDisabled={!p.mine} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} /></span>
              {/* (fix-E, E-26) the number under the name — Make the project again and Activity name a deleted project by it */}
              <span role="cell" className={`${styles.cell} ${styles.title}`}><Icon name="business_center" size={20} weight={300} /><span className={own.twoLine}><span className={own.name}>{p.name}</span><span className={own.number}><span data-testid="deleted-project-number">{p.number}</span>{p.name.includes(p.client) ? null : ` · ${p.client}`}</span></span></span>
              <span role="cell" className={`${styles.cell} ${own.labelled}`} data-label="Stage">{isProjectStage(p.stage) ? STAGE_LABEL[p.stage] : p.stage}</span>
              <span role="cell" className={`${styles.cell} ${own.labelled}`} data-label="Deleted">{p.deletedAt ? displayDate(new Date(p.deletedAt)) : '--'}</span>
              <span role="cell" className={`${styles.cell} ${own.labelled}`} data-label="Deleted by">{p.deletedByName ?? '--'}</span>
              {/* (parity P-36) the Deleted Leads sheet's row action — (the calm UI build 2026-10-27, 3-47 · T-02) Restore is the row's one verb;
                  Delete forever is its ⋮'s row (red, refused in the row with its rule) */}
              <span role="cell" className={`${styles.cell} ${styles.actions} ${own.actions}`}>
                <Tooltip label={p.mine ? (p.direct ? `Put it back, with ${p.client}’s details` : `Put it back on ${p.client}’s lead`) : RESTORE_RULE}>
                  <span><button type="button" className={own.link} disabled={busy || !p.mine} onClick={() => { void restore([p.id]) }} data-testid="deleted-project-restore">Restore</button></span>
                </Tooltip>
                <RowMenu name={p.name} mine={p.mine} busy={busy} onForever={() => setConfirm({ kind: 'forever', ids: [p.id] })} />
              </span>
            </div>
          ))}
        </div>
        <DetailBulkBar inset count={live.length}
                       actions={[
                         { label: `Restore${mine.length !== live.length ? ` ${mine.length}` : ''}`, onClick: () => { const ids = mine; setSelected(new Set()); if (ids.length) void restore(ids) } },
                         ...(mine.length ? [{ label: `Delete forever${mine.length !== live.length ? ` ${mine.length}` : ''}`, tone: 'danger' as const, onClick: () => setConfirm({ kind: 'forever', ids: mine }) }] : []),
                       ]}
                       onClear={() => setSelected(new Set())} />
      </Dialog>
      <ConfirmDialog nested open={confirm?.kind === 'forever'} title="Delete forever?" confirmLabel="Delete forever"
                     message={confirm?.kind === 'forever' && confirm.ids.length > 1 ? `These ${confirm.ids.length} projects will be deleted permanently, with their schedules, updates, choices and invoices. This action cannot be undone.` : 'This project will be deleted permanently, with its schedule, updates, choices and invoices. This action cannot be undone.'}
                     onCancel={() => setConfirm(null)}
                     onConfirm={() => { const c = confirm; setConfirm(null); if (c?.kind === 'forever') { setSelected(new Set()); void run(c.ids.length > 1 ? 'delete the projects forever' : 'delete the project forever', () => deleteProjectsForever(c.ids), (r) => foreverWords(r as { removed: number; kept?: number })) } }} />
      <ConfirmDialog nested open={confirm?.kind === 'empty'} title="Delete all forever?" confirmLabel="Delete all forever"
                     message={`${emptiable} deleted ${emptiable === 1 ? 'project' : 'projects'} will be deleted permanently. This action cannot be undone.`}
                     onCancel={() => setConfirm(null)}
                     onConfirm={() => { setConfirm(null); setSelected(new Set()); void run('empty the trash', emptyProjectTrash, (r) => foreverWords(r as { removed: number; kept?: number }, { empty: true })) }} />
    </>
  )
}

/** (the calm UI build 2026-10-27, 3-47 · T-02) A deleted project's ⋮ — Delete forever, the row's second action (it kept its test mark). */
function RowMenu({ name, mine, busy, onForever }: { name: string; mine: boolean; busy: boolean; onForever: () => void }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  return (
    <span ref={anchor} className={own.menuWrap}>
      <Tooltip label="More actions" disabled={open}>
        <IconButton icon="more_vert" label={`More actions for ${name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="deleted-project-more" />
      </Tooltip>
      <PortalMenu open={open} anchor={anchor} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={name}>
        <span className={own.menuRow} data-testid="deleted-project-forever">
          <DropdownItem tone="danger" disabled={busy || !mine} title={mine ? undefined : DELETE_RULE} onSelect={() => { setOpen(false); onForever() }}>Delete forever</DropdownItem>
        </span>
      </PortalMenu>
    </span>
  )
}
