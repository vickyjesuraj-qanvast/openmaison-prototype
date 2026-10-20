import type { Metadata } from 'next'
import { AccessGate } from '@/components/shell/access-gate'
import { refusesPath } from '@/lib/leads/visibility'   // (S44O — call C6)
import { notFound, redirect } from 'next/navigation'
import { FINANCE_TABS, financeHome } from '@/lib/finance/sections'
import { fetchCommissions } from '@/lib/finance/books'
import { fetchFinanceTodo, todoCountOf } from '@/lib/finance/todo-server'
import { FinanceWorkspace } from '@/components/finance/finance-workspace'
import { BooksWorkspace } from '@/components/finance/books/books-workspace'
import { TodoPage } from '@/components/finance/todo/todo-page'
import { fetchMoneyIn } from '@/lib/finance/money-in'   // (parity map, FB-013 · FB-016 · FB-012) P-A's branch
import { MoneyInWorkspace } from '@/components/finance/money-in/money-in-workspace'
import { fetchCrewBoard } from '@/lib/projects/contractors'   // (S45B)

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }): Promise<Metadata> {
  const { tab } = await params
  if (await refusesPath(`/company/finance/${tab}`)) return { title: 'Finance' }   // (S44O — C6) no record's name in a tab that is not theirs
  const def = FINANCE_TABS.find((t) => t.key === tab)
  /* (pending modules S41b-2) a tab that isn't one is the app-wide not found (the layout's check) — its title too */
  return def ? { title: `${def.label} · Finance` } : { title: { absolute: 'Page not found' } }
}

/**
 * (gaps build F1 — F-01 · F-19 · F1-Q1; F2 — F2-Q1) One of Finance's tabs, on Company's frame (REG-1360). A tab only Owners and Admins see lands
 * anyone else on the first. The figures are worked out on the server for whoever may see them (Commission: a member reads their own).
 * (simplify S-10 · S-11, his "build everything" 2026-10-09) The tabs are To do · Money out · Vendors · Commission · Xero (`accounting` — the
 * address kept). Every tab reads To do's rows once — the strip's count is what waits on you — and the tab that needs them reuses what that read.
 * The eight old tabs' addresses have their own redirect routes (app/company/finance/<old>/page.tsx — a 307, the query kept).
 */
export default async function FinanceTabPage({ params, searchParams }: { params: Promise<{ tab: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { tab } = await params
  if (await refusesPath(`/company/finance/${tab}`)) return <AccessGate section="Finance" />   // (S44O — call C6) the role's own list (Marketing never reads a quote's money, a project or Finance) — before a record is read
  const def = FINANCE_TABS.find((t) => t.key === tab)
  if (!def) notFound()
  const sp = await searchParams
  const one = (k: string) => { const v = sp[k]; return typeof v === 'string' ? v : null }
  const { todo, books, xero } = await fetchFinanceTodo()
  const runs = todo.finance.viewer.runs
  if (def.runners && !runs) redirect(financeHome(runs))
  const todoCount = todoCountOf(todo)
  if (tab === 'todo') return <TodoPage data={todo} todoCount={todoCount} open={one('open')} />
  /* (parity map, FB-013 · FB-016 · FB-012) Money in — every invoice, client payment, variation order and credit note the viewer's money reaches */
  if (tab === 'money-in') return <MoneyInWorkspace data={await fetchMoneyIn()} todoCount={todoCount} />
  /* (S45B · H-UHD-2) a contractor's panel lists the sites they are on — the contractors' records, read only for Vendors */
  if (tab === 'money-out' || tab === 'vendors') return <FinanceWorkspace tab={tab} data={todo.finance} todoCount={todoCount} crew={tab === 'vendors' ? await fetchCrewBoard() : null} />
  if (tab === 'commissions') return <BooksWorkspace tab="commissions" runs={runs} todoCount={todoCount} commissions={await fetchCommissions()} open={one('open')} />
  if (!books || !xero) redirect(financeHome(false))
  return <BooksWorkspace tab="accounting" runs={runs} todoCount={todoCount} books={books} xero={xero} open={one('open')} />
}
