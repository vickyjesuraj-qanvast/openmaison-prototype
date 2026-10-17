'use client'

import { usePlanLock } from '@/components/credits/credits-client'
import { ProLocked, ProTag } from '@/components/credits/pro-tag'
import { useState } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { ListEntryDialog, type EntryEdit } from '@/app/settings/list-entry-dialog'
import { renameExpenseCategory, setExpenseCategories } from '@/app/finance/cost-actions'
import { CATEGORY_NAME_MAX, categoryIn, categoryProblem, cleanCategory } from '@/lib/finance/expense-categories'
import { CATEGORIES_RULE } from '@/lib/finance/rules'
import s from '@/app/settings/settings.module.css'

export type ExpenseCategoriesData = { list: string[]; managed: boolean; counts: Record<string, number> }

const moveTo = <T,>(xs: T[], from: number, to: number): T[] => { const n = [...xs]; const [x] = n.splice(from, 1); n.splice(Math.max(0, Math.min(n.length, to)), 0, x as T); return n }
const expensesWord = (n: number) => `${n} expense${n === 1 ? '' : 's'}`
/** "the expense logged under it" · "the 3 expenses logged under it" — with the verb that agrees (invented copy, pending modules S06) */
const theExpenses = (n: number) => (n === 1 ? 'the expense' : `the ${expensesWord(n)}`)
/** The count of expenses under a name, any case (an expense keeps the spelling it was logged with). */
const countOf = (counts: Record<string, number>, name: string) => Object.entries(counts).reduce((t, [k, n]) => t + (k.toLowerCase() === name.toLowerCase() ? n : 0), 0)

/**
 * (pending modules S06 — card `held:finance`, her "build all of them" 2026-10-11; 1.0's Accounts › Expense Categories) Settings › Finance ›
 * Money out › **Expense categories** — the list an expense is logged under, on the Trades card's grammar (REG-561 · REG-647): a token per
 * category (press it to rename or move it — the expenses logged under it and its Xero account follow), its remove with Undo (the expenses already
 * logged keep it; new ones can't pick it), and *Add a category*. Written at once; a refusal puts the list back and says why. Owners and Admins
 * change it; everyone else reads it.
 */
export function ExpenseCategorySettings({ data, canManage }: { data: ExpenseCategoriesData; canManage: boolean }) {
  const snackbar = useSnackbar()
  const [list, setList] = useState(data.list)
  const [managed, setManaged] = useState(data.managed)
  const [counts, setCounts] = useState(data.counts)
  const [adding, setAdding] = useState('')
  const [editing, setEditing] = useState<(EntryEdit & { was: string }) | null>(null)
  const [taken, setTaken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const LOCKED = CATEGORIES_RULE
  const expLocked = usePlanLock('expense_management').locked   // (pending modules S19) expenses are Pro

  /* the list written whole; the screen shows it at once and puts it back when the server refuses */
  const write = async (next: string[], done: string, undo?: { prev: string[]; back: string }) => {
    const prev = list
    setList(next)
    try {
      const r = await setExpenseCategories(next)
      if ('error' in r) { setList(prev); snackbar({ message: couldnt('save the categories', refusalOf(r.error)) }); return }
      setList(r.list); setManaged(true)
      snackbar({ message: done, ...(undo ? { actionLabel: 'Undo', onAction: () => { void write(undo.prev, undo.back) } } : {}) })
    } catch (e) { setList(prev); snackbar({ message: couldnt('save the categories', refusalOf(e)) }) }
  }
  const remove = (c: string) => {
    if (!canManage) { snackbar({ message: LOCKED }); return }
    if (list.length <= 1) { snackbar({ message: 'Keep at least one category — every expense is logged under one' }); return }
    const n = countOf(counts, c)
    void write(list.filter((x) => x !== c), `${c} removed — ${n ? `${theExpenses(n)} logged under it ${n === 1 ? 'keeps' : 'keep'} it` : 'no expense was logged under it'}`, { prev: list, back: `${c} is back` })   // invented copy (pending modules S06)
  }
  const addProblem = adding.trim() ? categoryProblem(list, adding) : null
  /* (S44Z — S44P's M14, every Settings list alike) the entry a typed name matches lights up as the field names it */
  const lit = adding.trim() ? categoryIn(list, cleanCategory(adding)) : null
  const add = () => {
    if (!canManage) { snackbar({ message: LOCKED }); return }
    const name = cleanCategory(adding)
    if (!name || categoryProblem(list, name)) return
    setAdding('')
    void write([...list, name], `${name} added — new expenses can be logged under it`, { prev: list, back: `${name} removed again` })   // invented copy (pending modules S06)
  }
  const save = async (e: EntryEdit) => {
    if (!editing) return
    if (!canManage) { snackbar({ message: LOCKED }); return }
    const name = cleanCategory(e.name)
    const why = categoryProblem(list, name, editing.was)
    if (why) { setTaken(categoryIn(list, name) ?? name); return }   // (S44Z) the dialog names the entry it matches (S44P's listedAs)
    if (busy) return
    setBusy(true)
    try {
      let cur = list, moved = 0
      if (name !== editing.was) {
        const r = await renameExpenseCategory(editing.was, name)
        if ('error' in r) { snackbar({ message: couldnt(`rename ${editing.was}`, refusalOf(r.error)) }); return }   // the dialog stays open with what was typed
        cur = r.list; moved = r.moved
        setCounts((c) => { const n = { ...c }; const k = Object.keys(n).filter((x) => x.toLowerCase() === editing.was.toLowerCase()); let t = 0; for (const x of k) { t += n[x] ?? 0; delete n[x] } if (t) n[name] = (n[name] ?? 0) + t; return n })
      }
      const idx = cur.indexOf(name)
      if (idx >= 0 && idx !== e.position - 1) {
        const r = await setExpenseCategories(moveTo(cur, idx, e.position - 1))
        if ('error' in r) { snackbar({ message: couldnt('move the category', refusalOf(r.error)) }); setList(cur); return }
        cur = r.list
      }
      setList(cur); setManaged(true); setEditing(null); setTaken(null)
      snackbar({ message: name !== editing.was ? `${editing.was} is now ${name}${moved ? (moved === 1 ? ' — its expense follows' : ` — its ${expensesWord(moved)} follow`) : ''}` : 'Expense categories saved' })   // invented copy (pending modules S06)
    } catch (err) { snackbar({ message: couldnt('save the category', refusalOf(err)) }) } finally { setBusy(false) }
  }

  /* (pending modules S19 — 1.0's plan gating: "Accounts → Expense Categories" locked for Free) the card's title, then the lock */
  if (expLocked) return (
    <div className={s.setting} id="expense-categories" data-testid="expense-categories">
      <div className={s.settingHead}><span className={s.settingTitle}>Expense categories <ProTag /></span></div>
      <ProLocked feature="expense_management" kept={`Your ${list.length} ${list.length === 1 ? 'category is' : 'categories are'} kept`} testId="expense-categories-locked" />
    </div>
  )
  return (
    <div className={s.setting} id="expense-categories" data-testid="expense-categories">
      <div className={s.settingHead}>
        <span className={s.settingTitle}>Expense categories</span>
        {/* (S42 audit C-10) the how-to is for whoever can do it; a reader gets what the list is */}
        <span className={s.settingHelp}>What an expense is logged under — Reports group the expenses by them and Xero gives each its account.{canManage ? ' Press one to rename or move it; a category you remove stays on the expenses already logged under it.' : ''} {managed ? '' : 'Not set yet — these are the ones every studio starts with.'}</span>
      </div>
      <ul className={s.trades} aria-label="Expense categories">
        {list.map((c, i) => (
          <li key={c} className={s.trade} data-match={lit === c || undefined} data-testid="expense-category">
            {canManage ? (
              <Tooltip label={`Rename or move ${c}`}>
                <button type="button" className={s.tradeName} onClick={() => { setTaken(null); setEditing({ was: c, name: c, position: i + 1 }) }}><span>{c}</span></button>
              </Tooltip>
            ) : <span>{c}</span>}   {/* (S42 audit C-10) a reader's token is words, not a press — no pointer, no underline */}
            {canManage ? <Tooltip label={`Remove ${c}`}><IconButton icon="close" label={`Remove ${c}`} size={24} variant="bare" iconSize={16} onClick={() => remove(c)} /></Tooltip> : null}
          </li>
        ))}
      </ul>
      {canManage ? (
        <div className={s.addTrade}>
          <TextField label="Add a category" value={adding} onChange={setAdding} maxLength={CATEGORY_NAME_MAX} error={addProblem ?? undefined}
                     onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={add} isDisabled={!adding.trim() || !!addProblem} data-testid="expense-category-add">Add</Button>
        </div>
      ) : null}
      <ListEntryDialog open={!!editing} title="Expense category" entry={editing} total={list.length} taken={taken}
                       note={editing ? (countOf(counts, editing.was) ? `A new name carries ${theExpenses(countOf(counts, editing.was))} logged under it, and its Xero account.` : 'No expense is logged under it yet — a new name carries its Xero account.') : undefined}   /* (S42 audit C-09) one whole sentence either way */
                       onClose={() => { setEditing(null); setTaken(null) }} onSave={(e) => { void save(e) }} />
    </div>
  )
}
