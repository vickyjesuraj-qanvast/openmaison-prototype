'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { ListEntryDialog, type EntryEdit } from '@/app/settings/list-entry-dialog'
import { renameTicketCategory, setTicketCategories } from '@/app/projects/tickets-actions'
import { CATEGORY_MAX, type TicketCategory } from '@/lib/projects/tickets-model'
import { listedAs, listedMatch } from '@/lib/settings/trades'   // (S44Z — S44P's M14) one wording for a name already in a list
import styles from '@/app/settings/settings.module.css'

export type TicketCategoriesData = { categories: TicketCategory[]; counts: Record<string, number> }

/**
 * (gaps build H — H-Q8) Settings › Projects › Ticket categories — Lead sources' grammar (REG-647): the chips with how many tickets hold each,
 * a name presses into the house list-entry dialog (rename — the tickets follow — and place), Retire keeps a used one on its tickets, Remove
 * takes an unused one off with Undo, Add at the foot. 1.0's eight words to start (each kept as a word — 1.0 filed four of them as "Other").
 */
export function TicketCategoriesSetting({ data, canManage }: { data: TicketCategoriesData; canManage: boolean }) {
  const snackbar = useSnackbar()
  const [list, setList] = useState(data.categories)
  const [was, setWas] = useState(data.categories)
  if (was !== data.categories) { setWas(data.categories); setList(data.categories) }
  const [adding, setAdding] = useState('')
  const [edit, setEdit] = useState<EntryEdit | null>(null)
  const [takenName, setTakenName] = useState<string | null>(null)
  const counts = data.counts
  /* (S44Z — S44P's M14, every Settings list alike) a name already in the list names the entry it matches — "Already in the list as “Other”" —
     and that entry lights up as it is typed */
  const names = list.map((x) => x.name)
  const taken = (name: string) => listedAs(names, name.replace(/\s+/g, ' '))
  const lit = listedMatch(names, adding.replace(/\s+/g, ' '))
  const write = async (next: TicketCategory[], done: string, undo?: TicketCategory[]) => {
    const prev = list
    setList(next)
    try {
      const r = await setTicketCategories({ list: next })
      if ('error' in r) { setList(prev); snackbar({ message: couldnt('save the categories', refusalOf(r.error)) }); return }
      setList(r.list)
      snackbar(undo ? { message: done, actionLabel: 'Undo', onAction: () => { void write(undo, 'Put back') } } : { message: done })
    } catch { setList(prev); snackbar({ message: 'Couldn’t save the categories — please try again' }) }
  }
  const add = () => { const name = adding.replace(/\s+/g, ' ').trim(); if (!name || taken(name)) return; setAdding(''); void write([...list, { name }], `${name} added`) }
  const save = async (e: EntryEdit) => {
    const from = edit?.name ?? ''
    { const hit = listedMatch(names, e.name, from); if (hit) { setTakenName(hit); return } }   // (S44Z) said on the Name field, naming the entry it matches
    try {
      const r = await renameTicketCategory({ from, to: e.name, position: e.position })
      if ('error' in r) { if (/already in the list/i.test(r.error)) setTakenName(listedMatch(names, e.name, from) ?? e.name); else snackbar({ message: couldnt('rename the category', refusalOf(r.error)) }); return }
      setList(r.list); setEdit(null); setTakenName(null)
      snackbar({ message: from !== e.name ? `${from} is now ${e.name}${counts[from] ? ` — its ${counts[from]} ${counts[from] === 1 ? 'ticket follows' : 'tickets follow'}` : ''}` : 'Saved' })
    } catch { snackbar({ message: 'Couldn’t rename the category — please try again' }) }
  }
  return (
    <div className={styles.setting} data-testid="ticket-categories" id="ticket-categories">
      <div className={styles.settingHead}>
        <span className={styles.settingTitle}>Ticket categories</span>
        <span className={styles.settingHelp}>What a client picks when they report an issue on their page, and what a new ticket offers. Retire a category to keep its tickets and stop offering it; one no ticket holds can be removed.</span>
      </div>
      <ul className={styles.trades} aria-label="Ticket categories">
        {list.map((c, i) => {
          const n = counts[c.name] ?? 0
          return (
            <li key={c.name} className={styles.trade} data-retired={c.retired || undefined} data-match={lit === c.name || undefined} data-testid="ticket-category">
              {canManage ? <button type="button" className={styles.chipName} onClick={() => { setTakenName(null); setEdit({ name: c.name, position: i + 1 }) }}>{c.name}</button> : <span>{c.name}</span>}
              <span className={styles.sourceCount} aria-label={`${n} ${n === 1 ? 'ticket' : 'tickets'}`}>{n}</span>
              {!canManage ? null : c.retired ? (
                <Tooltip label={`Restore ${c.name}`}><IconButton icon="undo" label={`Restore ${c.name}`} size={24} variant="bare" iconSize={16} onClick={() => { void write(list.map((x) => (x.name === c.name ? { name: x.name } : x)), `${c.name} restored`) }} /></Tooltip>
              ) : n > 0 ? (
                <Tooltip label={`Retire ${c.name} — its ${n} ${n === 1 ? 'ticket keeps' : 'tickets keep'} it`}><IconButton icon="visibility_off" label={`Retire ${c.name}`} size={24} variant="bare" iconSize={16} onClick={() => { void write(list.map((x) => (x.name === c.name ? { ...x, retired: true } : x)), `${c.name} retired — its tickets keep it`, list) }} /></Tooltip>
              ) : (
                <Tooltip label={`Remove ${c.name}`}><IconButton icon="close" label={`Remove ${c.name}`} size={24} variant="bare" iconSize={16} onClick={() => { void write(list.filter((x) => x.name !== c.name), `${c.name} removed`, list) }} /></Tooltip>
              )}
            </li>
          )
        })}
      </ul>
      {canManage ? (
        <div className={styles.addTrade}>
          <TextField label="Add a category" value={adding} onChange={setAdding} maxLength={CATEGORY_MAX} error={taken(adding)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={add} isDisabled={!adding.trim() || !!taken(adding)}>Add</Button>
        </div>
      ) : null}
      <ListEntryDialog open={!!edit} title="Ticket category" entry={edit} total={list.length} taken={takenName}
                       note="A rename carries the tickets that hold it." onClose={() => { setEdit(null); setTakenName(null) }} onSave={(e) => { void save(e) }} />
    </div>
  )
}
