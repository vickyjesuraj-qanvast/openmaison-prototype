'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DropdownItem } from '@/components/leads/dropdown'
import { useSnackbar } from '@/components/om/snackbar'
import { LibraryGallery, type LibraryItem } from '@/components/company/templates/library-gallery'
import { ago } from '@/lib/templates/ago'
import { folderBlockFor } from '@/lib/company/folder-libraries'
import { GENERIC_CATEGORIES } from '@/lib/visualizer/catalogue'
import type { MaterialRow, MaterialsData } from '@/lib/visualizer/queries'
import { createStudioMaterial, deleteStudioMaterials, deleteStudioMaterialsForever, duplicateStudioMaterial, emptyMaterialTrash, renameStudioMaterial, restoreStudioMaterials, updateStudioMaterial, type MaterialInput } from '@/app/company/materials-actions'
import { MaterialDialog } from './material-dialog'
import { MaterialsGhost } from './materials-skeleton'
import { bookLabels } from './book-labels'
import styles from './materials.module.css'

type Row = MaterialRow & LibraryItem
const toRow = (m: MaterialRow): Row => ({ ...m, title: m.name, usedBy: m.priceBookItemId ? 1 : 0 })
const KIND = { key: 'materials', icon: 'texture', label: 'Materials', title: 'Materials', help: 'Your own finishes — every member picks them on any surface in the AI Visualizer, beside the catalogue.', href: '/company/materials', live: true }
/** (F122) The server's limit on a material's name. */
const NAME_MAX = 60
const FINISH: Record<string, string> = { matte: 'Matte', satin: 'Satin', gloss: 'Gloss', textured: 'Textured', natural: 'Natural grain' }
const finishWord = (f: string) => FINISH[f] ?? f
const LINKED = 'Linked', NOT_LINKED = 'Not linked'
const designs = (n: number) => `${n} ${n === 1 ? 'design' : 'designs'}`
/** (wave E, files-14) What deleting it does to the designs that carry it, the renders and the waiting picks said apart: a render keeps it;
    a pick not rendered yet is set aside and comes back with a restore (lib/visualizer/queries.ts `renderedIn` · `waitingIn`). */
const deleteLine = (t: MaterialRow): string => {
  const r = t.renderedIn, w = t.waitingIn
  const rendered = r ? `Used in ${designs(r)} — ${r === 1 ? 'its renders keep' : 'their renders keep'} it.` : null
  const waiting = w ? `${r ? `Picked in ${w} more` : `Picked in ${designs(w)}`}, not rendered yet — ${w === 1 ? 'the pick comes' : 'the picks come'} back if you restore it from Deleted Materials.` : 'You can restore it from Deleted Materials.'
  return [rendered, waiting].filter(Boolean).join(' ')
}
/** (verify round 1, F204) The rule the server holds (materials-actions: restore · delete for good), named after the maker — Restore's words
    cover both, since the one rule refuses both (the Deleted sheet says it once per row); Delete Forever's own tooltip says its half. */
const restoreRule = (t: Row) => `Only ${t.author ?? 'whoever added it'}, an Owner or an Admin can restore this material or delete it for good`
const purgeRule = (t: Row) => `Only ${t.author ?? 'whoever added it'}, an Owner or an Admin can delete this material for good`

/**
 * Company › Materials (REG-677, Q-18): the studio's own swatches as the house library — a card per material (its photo or its colour),
 * category and finish, the Price book item it is quoted as; New material, Edit, Duplicate, Rename, Delete with Undo, Deleted Materials,
 * folders. Any member adds (1.0's rule); whoever added one, an Owner or an Admin changes it.
 */
export function MaterialsView({ data, from }: { data: MaterialsData; from?: string }) {
  const router = useRouter()
  const snack = useSnackbar()
  /* (verify round 1) a new material lands in the folder that was open when New ▾ was pressed (F118's rule, the designs' twin) */
  /* (REG-709) `?open=<id>` — a material the global search found — opens its dialog on arrival */
  const opening = useSearchParams().get('open')
  const [edit, setEdit] = useState<{ open: boolean; m: MaterialRow | null; folderId: string | null }>(() => { const it = opening ? data.items.find((x) => x.id === opening) ?? null : null; return { open: !!it, m: it, folderId: null } })
  /* (verify round 1) one label per Price book item wherever a material names it — the dialog's, so two "Homogeneous tiles…" rows read as two */
  const book = useMemo(() => bookLabels(data.bookItems).toLabel, [data.bookItems])
  const quotedAs = (t: MaterialRow) => (t.priceBookItemId ? book.get(t.priceBookItemId) ?? null : null)
  const save = async (input: MaterialInput): Promise<boolean> => {
    const cur = edit.m
    const r = await (cur ? updateStudioMaterial(cur.id, input) : createStudioMaterial({ ...input, folderId: edit.folderId })).catch(() => ({ error: 'Couldn’t save the material — please try again' }))
    if ('error' in r) { snack({ message: r.error }); return false }
    /* (verify round 1) one line at 344 whatever the name */
    snack({ message: cur ? 'Material saved' : 'Material added' }); router.refresh()
    return true
  }
  const items = data.items.map(toRow)
  /* (verify round 1) the Filters dialog's choices — the values the studio's materials carry, in the picker's category order */
  const catOrder = (c: string) => { const i = (GENERIC_CATEGORIES as readonly string[]).indexOf(c); return i < 0 ? GENERIC_CATEGORIES.length : i }
  const categories = [...new Set(items.map((t) => t.category))].sort((a, b) => catOrder(a) - catOrder(b) || a.localeCompare(b))
  const finishes = Object.keys(FINISH).filter((f) => items.some((t) => t.finish === f)).map(finishWord)
  return (
    <LibraryGallery<Row> kind={KIND} shell={{ title: 'Materials', skeleton: <MaterialsGhost /> }} noun={{ one: 'material', many: 'materials' }} nameLabel="Material" deletedLabel="Deleted Materials"
      /* (F132) the card's words are the menu's: Edit for whoever may change it, Open for everyone else (the dialog then reads) */
      openLabel={(t) => (t.mayChange ? 'Open' : 'Edit')} nameMax={NAME_MAX}
      /* (F123) the Deleted sheet names whoever added it, and the Price book link it had */
      deletedByLabel="Added by" deletedUsageLabel="Price book"
      /* (verify round 1, F204 · critic 15) the Deleted sheet offers only what the server allows — Restore and Delete Forever on a material the
         viewer added (or any, for an Owner or an Admin), the rule said in the row; Empty Trash counts only those */
      mayChange={(t) => t.mayChange} duplicateBlock={() => null} restoreBlock={(t) => (t.mayChange ? restoreRule(t) : null)} purgeRule={(t) => (t.mayChange ? purgeRule(t) : null)}
      from={from} folders={{ library: 'materials', list: data.folders, block: folderBlockFor('materials', data.viewer) }} items={items} deleted={data.deleted.map(toRow)} now={data.now} ariaLabel="Materials" tableKey="materials"
      newMenu={(close, place) => (<DropdownItem onSelect={() => { close(); setEdit({ open: true, m: null, folderId: place.folderId }) }}>New material</DropdownItem>)} newBlock={null}
      /* (UX audit S12) one way in: a plain "New material" button, not a New ▾ of one row */
      newAction={(place) => ({ label: 'New material', onPress: () => setEdit({ open: true, m: null, folderId: place.folderId }) })}
      searchText={(t) => [t.category, finishWord(t.finish), t.hex, t.description ?? '', quotedAs(t) ?? ''].join(' ')}
      facets={[
        { key: 'category', label: 'Category', options: categories, test: (t, v) => t.category === v },
        { key: 'finish', label: 'Finish', options: finishes, test: (t, v) => finishWord(t.finish) === v },
        /* (wave E, E6 — the owner's call: Filters stays, invented UI, logged) "Price book link: Any · Linked · Not linked" */
        { key: 'book', label: 'Price book link', any: 'Any', options: [LINKED, NOT_LINKED], test: (t, v) => (v === LINKED) === !!t.priceBookItemId },
      ]}
      thumb={(t) => <span className={styles.thumb} style={{ background: t.imageUrl ? `center / cover no-repeat url("${t.imageUrl}")` : t.hex }} data-testid="material-thumb"><span className={styles.thumbHex}>{t.hex}</span></span>}
      /* (F133) the list's and the Deleted sheet's glyph is the swatch itself — its photo, or its colour — as the card is */
      glyph={(t) => <span className={styles.glyph} style={{ background: t.imageUrl ? `center / cover no-repeat url("${t.imageUrl}")` : t.hex }} />}
      moveThumb={(t) => ({ src: t.imageUrl || null, swatch: t.hex })}
      meta={(t) => `${t.category} · ${finishWord(t.finish)}`}
      usage={(t) => (t.priceBookItemId ? `Quoted as ${quotedAs(t) ?? 'a Price book item'}` : 'Not in the Price book')}
      usageWord={(t) => (t.priceBookItemId ? LINKED : '--')}
      /* (audit 2026-09-26, round 3) Where it is quoted and who changed it last, one line each — on one line the name was the first thing cut */
      foot={(t) => <><span className={styles.footLine}>{t.priceBookItemId ? `Quoted as ${quotedAs(t) ?? 'a Price book item'}` : 'Not in the Price book'}</span><span className={styles.footLine}>edited {ago(t.updatedAt.getTime(), data.now)}{(t.editedBy ?? t.author) ? ` by ${t.editedBy ?? t.author}` : ''}</span></>}
      columns={[
        { key: 'colour', label: 'Colour', track: '120px', sortable: (t) => t.hex, cell: (t) => <span className={styles.hexCell}>{t.hex}</span> },   /* (F133) the swatch rides the name cell now; the hex stays searchable and sortable */
        { key: 'category', label: 'Category', track: '160px', sortable: (t) => t.category, cell: (t) => <span>{t.category}</span> },
        { key: 'finish', label: 'Finish', track: '130px', sortable: (t) => finishWord(t.finish), cell: (t) => <span>{finishWord(t.finish)}</span> },
        { key: 'book', label: 'Price book item', track: '220px', cell: (t) => (t.priceBookItemId ? <span>{quotedAs(t) ?? '—'}</span> : <span className={styles.muted}>Not linked</span>) },
      ]}
      onOpen={(t) => setEdit({ open: true, m: t, folderId: null })}
      /* (verify round 1, F129 · F204) each action's answer goes back to the gallery as it is: an `{ error }` is the server's refusal, said
         after "Couldn’t …"; a count says what went and what stayed */
      onDuplicate={async (t) => { const r = await duplicateStudioMaterial(t.id); if (!('error' in r)) { snack({ message: 'Material duplicated' }); router.refresh() } return r }}
      onRename={(t, name) => renameStudioMaterial(t.id, name)}
      onDelete={(t) => deleteStudioMaterials([t.id])}
      onDeleteMany={(ts) => deleteStudioMaterials(ts.map((t) => t.id))}
      /* (D6, verify round 1 · critic 13) a material the studio's designs carry says so before it goes */
      deleteMessage={deleteLine}   /* (wave E, files-14) a waiting pick is never "its renders" */
      onRestore={(ids) => restoreStudioMaterials(ids)}
      onDeleteForever={(ids) => deleteStudioMaterialsForever(ids)}
      onEmptyTrash={() => emptyMaterialTrash()}
      foreverNote={(ts) => {
        /* (wave E, files-14) renders keep it; a pick not rendered yet goes for good with it */
        const used = ts.filter((t) => t.usedIn > 0)
        if (!used.length) return null
        if (ts.length === 1) {
          const t = used[0]!
          return [t.renderedIn ? `Used in ${designs(t.renderedIn)} — ${t.renderedIn === 1 ? 'its renders keep' : 'their renders keep'} it, but no one can pick it again.` : null,
            t.waitingIn ? `${t.renderedIn ? `Picked in ${t.waitingIn} more` : `Picked in ${designs(t.waitingIn)}`}, not rendered yet — ${t.waitingIn === 1 ? 'that pick won’t' : 'those picks won’t'} come back.` : null].filter(Boolean).join(' ')
        }
        const rendered = used.filter((t) => t.renderedIn > 0), waiting = used.filter((t) => t.waitingIn > 0)
        return [rendered.length ? (rendered.length === 1 && used.length === 1 ? `${rendered[0]!.name} is used in ${designs(rendered[0]!.renderedIn)} — the renders keep it, but no one can pick it again.` : `${rendered.length === ts.length ? 'All of them are' : `${rendered.length} of them ${rendered.length === 1 ? 'is' : 'are'}`} used in designs — the renders keep them, but no one can pick them again.`) : null,
          waiting.length ? `${waiting.length === 1 ? `${waiting[0]!.name} is` : `${waiting.length} of them are`} picked in a design and not rendered yet — ${waiting.length === 1 ? 'that pick won’t' : 'those picks won’t'} come back.` : null].filter(Boolean).join(' ')
      }}
      deletedMeta={{ label: 'Category', value: (t) => t.category }}
      empty={{ title: 'No materials yet', help: 'Add the finishes your studio uses most — a swatch photo or a colour. In the AI Visualizer, Upload a swatch saves one here too.',
        start: (place) => ({ primary: { label: 'New material', icon: 'add', onPress: () => setEdit({ open: true, m: null, folderId: place.folderId }) } }) }}   /* (REG-735) New ▾'s row, where the eye lands */>
      <MaterialDialog open={edit.open} material={edit.m} onClose={() => setEdit((e) => ({ ...e, open: false, m: null }))} onSave={save} bookItems={data.bookItems} readOnly={edit.m?.mayChange ?? null} />
    </LibraryGallery>
  )
}
