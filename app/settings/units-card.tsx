'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { MSG } from '@/lib/forms'
import { listedAs, listedMatch } from '@/lib/settings/trades'   // (S44P — M14) one wording for a name already in a list
import { UNITS_FULL, UNITS_MAX } from '@/lib/settings/units'
import { renameUnit, setUnits } from './actions'
import styles from './settings.module.css'

const LOCKED_Q = 'Only Owners and Admins change the quote settings'

/**
 * (S44I — M9, UAT rows 350 · 325; as recommended, her ask 2026-10-15) Settings › Quotes & pricing › Units — the Trades card's twin (REG-561 /
 * REG-647): the units every unit picker offers, as tokens. Press one to rename it (the quote lines and the Price book follow) or move it;
 * ✕ removes it (lines already using it keep it) with Undo; Add puts one at the end. A unit already in the list in any case is named, not added
 * twice (M14's rule, S44P's words — `listedAs`) and its token lights up as it is typed; a full list says so (`UNITS_FULL`), as Trades does. Unset, the seven a quote always offered — said under the title.
 */
export function UnitsCard({ units: initial, managed: initialManaged, canManage }: { units: string[]; managed: boolean; canManage: boolean }) {
  const snackbar = useSnackbar()
  const readOnly = !canManage
  const [list, setList] = useState<string[]>(initial)
  const [managed, setManaged] = useState(initialManaged)
  const [typed, setTyped] = useState('')
  const [edit, setEdit] = useState<{ unit: string; name: string; position: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const taken = listedAs(list, typed)
  const lit = listedMatch(list, typed)   // (S44P's lit entry) the token the typed name matches
  const full = list.length >= UNITS_MAX
  const block = taken ?? (typed.trim() && full ? UNITS_FULL : undefined)
  /* the list written whole; a refused write puts the list back and says so (the house rule) */
  const write = async (next: string[], done: string, undo?: { list: string[]; said: string }) => {
    const prev = list
    setList(next)
    try {
      const clean = await setUnits(next); setList(clean); setManaged(true)
      snackbar({ message: done, ...(undo ? { actionLabel: 'Undo', onAction: () => { void write(undo.list, undo.said) } } : {}) })
    } catch { setList(prev); snackbar({ message: 'Couldn’t save the units — please try again' }) }
  }
  const add = () => {
    const t = typed.trim().replace(/\s+/g, ' ')
    if (!t) return
    if (!canManage) { snackbar({ message: LOCKED_Q }); return }
    const m = listedAs(list, t) ?? (full ? UNITS_FULL : undefined)
    if (m) { snackbar({ message: m }); return }
    setTyped('')
    void write([...list, t], `${t} added to the units`)
  }
  const remove = (u: string) => { if (!canManage) { snackbar({ message: LOCKED_Q }); return } void write(list.filter((x) => x !== u), `${u} removed — lines already using it keep it`, { list, said: `${u} is back` }) }
  const save = async () => {
    if (!edit) return
    if (!canManage) { snackbar({ message: LOCKED_Q }); return }
    const name = edit.name.trim().replace(/\s+/g, ' ')
    if (!name) { setError(MSG.required); return }
    const other = listedAs(list, name, edit.unit)
    if (other) { setError(other); return }
    if (busy) return
    setBusy(true)
    try {
      let cur = list
      if (name !== edit.unit) { const r = await renameUnit(edit.unit, name); if ('error' in r) { setError(r.error); return } cur = r.units }
      const idx = cur.indexOf(name)
      if (idx >= 0 && idx !== edit.position - 1) { const n = [...cur]; const [x] = n.splice(idx, 1); n.splice(Math.max(0, Math.min(n.length, edit.position - 1)), 0, x!); cur = await setUnits(n) }
      setList(cur); setManaged(true); setEdit(null); setError(null)
      snackbar({ message: name !== edit.unit ? `${edit.unit} is now ${name} — its quote lines and price book items follow` : 'Units saved' })
    } catch { snackbar({ message: `Couldn’t save ${edit.unit} — please try again` }) }   // the dialog stays open with what was typed
    finally { setBusy(false) }
  }
  return (
    <div className={styles.setting} id="units" data-testid="units">
      <div className={styles.settingHead}>
        <span className={styles.settingTitle}>Units</span>
        <span className={styles.settingHelp}>The units every quote line and price book item is priced by — the Unit menu offers these and narrows as you type. Press a unit to rename or move it; a line already using one keeps it when it is removed. {managed ? '' : 'Not set yet — these are the units every quote has offered.'}</span>
      </div>
      <ul className={styles.trades} aria-label="Units">
        {list.map((u, i) => (
          <li key={u} className={styles.trade} data-match={lit === u || undefined} data-testid="unit">
            {readOnly ? <span>{u}</span> : (
              <Tooltip label={`Edit ${u} — its name or place`}>
                <button type="button" className={styles.tradeName} onClick={() => { setError(null); setEdit({ unit: u, name: u, position: i + 1 }) }}><span>{u}</span></button>
              </Tooltip>
            )}
            {canManage ? <Tooltip label={`Remove ${u}`}><IconButton icon="close" label={`Remove ${u}`} size={24} variant="bare" iconSize={16} onClick={() => remove(u)} /></Tooltip> : null}
          </li>
        ))}
        {list.length === 0 ? <li className={styles.settingHelp}>No units yet — a line can still take any unit typed in its Unit menu.</li> : null}
      </ul>
      {canManage ? (
        <div className={styles.addTrade}>
          <TextField label="Add a unit" value={typed} onChange={setTyped} maxLength={40} error={block} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={add} isDisabled={!typed.trim() || !!block}>Add</Button>
        </div>
      ) : null}
      <Dialog open={!!edit} onClose={() => { setEdit(null); setError(null) }} title="Unit" subtitle={edit?.unit} size="modal" width={600}
              footer={<><Button variant="secondary" appearance="outlined" onPress={() => setEdit(null)}>Cancel</Button><Button isDisabled={busy} onPress={() => { void save() }}>{busy ? 'Saving…' : 'Save'}</Button></>}>
        <div className={styles.entryForm} data-testid="unit-dialog">
          <TextField label="Name" required value={edit?.name ?? ''} maxLength={40} autoFocus onChange={(v) => { setError(null); setEdit((x) => (x ? { ...x, name: v } : x)) }} error={error ?? undefined} helper="A new name carries the quote lines and the price book items priced by it"
                     onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save() } }} />
          <TextField label="Place in the list" mode="select" options={list.map((_, i) => String(i + 1))} value={String(edit?.position ?? 1)} onChange={(v) => setEdit((x) => (x ? { ...x, position: Number(v) } : x))} />
        </div>
      </Dialog>
    </div>
  )
}
